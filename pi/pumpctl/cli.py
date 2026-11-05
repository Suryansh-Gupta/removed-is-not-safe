"""Command line. Run `python3 -m pumpctl --help` from the pi/ folder."""
from __future__ import annotations

import argparse
import fcntl
import queue
import signal
import sys
import tempfile
import threading
import time
from datetime import date
from pathlib import Path

from . import calibration as cal
from . import config as cfg
from .control import PumpSetting, execute_run
from .hardware import FakePi, emergency_stop, ramp_steps, start_pump, stop_all
from .runlog import RunLog, clock_synced, git_commit, utc_now


def say(text=""):
    """Print, but never let a dropped SSH session take a run down with it."""
    try:
        print(text, flush=True)
    except OSError:
        pass


def lock_or_exit():
    handle = cfg.LOCK_FILE.open("w")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        sys.exit("Another pumpctl command is already driving the pumps.")
    return handle  # the lock lasts as long as this stays open, and dies with the process


def open_hardware(args):
    if args.fake:
        return FakePi(), None
    lock = lock_or_exit()
    from .hardware import RaspberryPi
    return RaspberryPi(), lock


def data_dir(args) -> Path:
    if args.data_dir:
        return Path(args.data_dir)
    if args.fake:  # practice runs must never land in the real lab data
        folder = Path(tempfile.mkdtemp(prefix="pumpctl-fake-"))
        say(f"--fake: writing to {folder}, and no motors will move.")
        return folder
    return cfg.DEFAULT_DATA_DIR


def warn_if_clock_unsynced() -> str:
    synced = clock_synced()
    if synced == "no":
        say("WARNING: the Pi's clock is not synced and may be wrong (it has no battery clock). "
            "Elapsed times stay correct. Connect to a network or set it with `sudo date`.")
    return synced


def warn_if_old(curve) -> None:
    made = curve.session_date()
    if made and (date.today() - made).days > cfg.CAL_WARN_DAYS:
        say(f"WARNING: {curve.pump} calibration session {curve.session} is over "
            f"{cfg.CAL_WARN_DAYS} days old. Tubing wears, so consider recalibrating.")


def ask_number(prompt: str) -> float:
    while True:
        try:
            return float(input(prompt))
        except ValueError:
            print("Please type a number.")


# ------------------------------------------------------------------ calibrate
def cmd_calibrate(args) -> int:
    folder = data_dir(args)
    session = args.session or date.today().isoformat()
    hz = args.step_hz
    if hz is None:
        hz = cal.load_curve(folder, args.pump).estimate_hz(args.target)
    if not 0 < hz <= cfg.MAX_STEP_HZ:
        sys.exit(f"{hz:.1f} steps/s is outside 0 to {cfg.MAX_STEP_HZ:.0f} (config.py).")
    warn_if_clock_unsynced()
    say(f"Calibrating {args.pump} at {hz:.2f} steps/s ({cfg.rpm(hz):.2f} rpm) for {args.minutes:g} min.")
    say("Line primed with water, no bubbles, outlet in a covered beaker on the scale.")
    start_mass = ask_number("Scale reading now (g): ")
    input("Press Enter to start pumping. ")
    hw, lock = open_hardware(args)
    try:
        hw.enable_motors()
        actual = start_pump(hw, args.pump, hz)
        t0 = time.monotonic()
        end = t0 + args.minutes * 60
        while time.monotonic() < end:
            left = end - time.monotonic()
            say(f"  {left / 60:.1f} min left")
            time.sleep(min(60.0, max(left, 0.0)))
        # The scale also caught the water moved during the ramp, before t0. Count it as the time
        # those steps would take at full speed, so flow and uL per step are not overstated.
        seconds = time.monotonic() - t0 + ramp_steps(hz) / actual
    except KeyboardInterrupt:
        say("Stopped early. Nothing saved.")
        return 1
    finally:
        stop_all(hw)
        hw.close()
    end_mass = ask_number("Scale reading after dripping stops (g): ")
    net = end_mass - start_mass
    if net <= 0:
        sys.exit(f"Net mass is {net:.2f} g, so nothing was saved. Check the line.")
    ml_min = net / (seconds / 60)  # 1 g = 1 mL
    ul_per_step = net * 1000 / (actual * seconds)
    cal.append_row(folder, {
        "time_utc": utc_now(), "session": session, "who": args.who, "pump": args.pump,
        "step_hz": f"{actual:.3f}", "seconds": f"{seconds:.1f}", "mass_start_g": start_mass,
        "mass_end_g": end_mass, "mass_net_g": f"{net:.3f}", "ml_per_min": f"{ml_min:.4f}",
        "ul_per_step": f"{ul_per_step:.5f}", "note": args.note,
    })
    say(f"{args.pump}: {ml_min:.4f} mL/min at {actual:.2f} steps/s")
    say(f"  {ml_min / cfg.rpm(actual):.4f} mL per revolution; flow pulses every "
        f"{cfg.roller_pulse_s(actual):.1f} s at this speed")
    say(f"  scale error on this reading: about {100 * 1.41 * cfg.SCALE_RESOLUTION_G / net:.1f}%")
    if net < cfg.MIN_CAL_MASS_G:
        say(f"WARNING: only {net:.2f} g collected. Repeat with a longer --minutes.")
    say(f"Saved to {cal.csv_path(folder)} (session {session}).")
    return 0


# ------------------------------------------------------------------ prime
def cmd_prime(args) -> int:
    folder = data_dir(args)
    hz = args.step_hz or cal.load_curve(folder, args.pump).hz_for(args.ml_min)
    hw, lock = open_hardware(args)
    say(f"Priming {args.pump} at {hz:.1f} steps/s for {args.seconds:g} s. Ctrl-C stops it.")
    try:
        hw.enable_motors()
        start_pump(hw, args.pump, hz)
        time.sleep(args.seconds)
    except KeyboardInterrupt:
        pass
    finally:
        stop_all(hw)
        hw.close()
    say("Stopped.")
    return 0


# ------------------------------------------------------------------ run
def stdin_lines():
    """Read typed lines on a side thread so the run loop never waits on the keyboard."""
    lines = queue.Queue()

    def reader():
        try:
            for line in sys.stdin:
                lines.put(line)
        except (OSError, ValueError):
            pass  # the terminal went away; the run carries on and ends on its timer

    threading.Thread(target=reader, daemon=True).start()

    def drain():
        out = []
        while not lines.empty():
            out.append(lines.get())
        return out

    return drain


def cmd_run(args) -> int:
    folder = data_dir(args)
    flows = {"feed": args.feed, "chlorine": args.chlorine}
    if min(flows.values()) < 0 or sum(flows.values()) <= 0:
        sys.exit("Flows cannot be negative, and at least one must be above 0.")
    if args.minutes <= 0:
        sys.exit("--minutes must be above 0.")
    try:
        curves = {p: cal.load_curve(folder, p) for p, f in flows.items() if f > 0}
        settings = [PumpSetting(p, flows[p], curves[p].hz_for(flows[p])) for p in curves]
    except cal.CalibrationError as e:
        sys.exit(str(e))
    for s in settings:
        if s.step_hz > cfg.MAX_STEP_HZ:
            sys.exit(f"{s.pump}: {s.step_hz:.1f} steps/s is above the {cfg.MAX_STEP_HZ:.0f} limit.")
        warn_if_old(curves[s.pump])
        if curves[s.pump].gap_to_nearest_point(s.ml_min) > cfg.NEAR_POINT_TOLERANCE:
            say(f"WARNING: {s.pump} has no measured point within "
                f"{cfg.NEAR_POINT_TOLERANCE:.0%} of {s.ml_min} mL/min, so this speed is "
                f"interpolated. Run: python3 -m pumpctl calibrate {s.pump} --target {s.ml_min}")

    total = sum(flows.values())
    wait = cfg.startup_wait_min(args.coil_m, total)
    times = cfg.sampling_times(args.coil_m, total)
    synced = warn_if_clock_unsynced()
    say(f"Run {args.run_id}: total {total:g} mL/min through a {args.coil_m:g} m coil")
    for s in settings:
        say(f"  {s.pump:9s}{s.ml_min:g} mL/min = {s.step_hz:.2f} steps/s, "
            f"flow pulses every {cfg.roller_pulse_s(s.step_hz):.1f} s, "
            f"{s.ml_min * args.minutes:.0f} mL needed in the jug "
            f"(calibration {curves[s.pump].session})")
    if flows["chlorine"] > 0 and flows["feed"] > 0:
        say(f"  chlorine stock is diluted {total / flows['chlorine']:.1f} times at the tee")
    say("  contact time: " + ", ".join(f"{k} {v:.1f} min" for k, v in times.items()))
    say(f"  sample after {wait:.0f} min. Auto-stop at {args.minutes:g} min.")
    if args.minutes < wait:
        say(f"WARNING: the run ends before the {wait:.0f} min start-up wait is over.")
    if not args.yes:
        input("Press Enter to start, or Ctrl-C to cancel. ")

    hw, lock = open_hardware(args)
    log = RunLog(folder, args.run_id, {
        "run_id": args.run_id, "who": args.who, "note": args.note, "date_utc": utc_now(),
        "instrument": "Raspberry Pi 4, TMC2209 drivers, Kamoer KCS PLUS pumps (pumpctl)",
        "units": "ml_per_min = mL/min from the calibration (commanded, not measured); "
                 "step_hz = microsteps/s; elapsed_s = seconds since the pumps started",
        "software_commit": git_commit(), "clock_synced": synced,
        "microsteps": cfg.MICROSTEPS, "coil_m": args.coil_m, "tube_id_mm": cfg.TUBE_ID_MM,
        "total_ml_per_min": total, "contact_min": {k: round(v, 2) for k, v in times.items()},
        "startup_wait_min": round(wait, 1), "planned_minutes": args.minutes,
        "pumps": {s.pump: {"ml_per_min": s.ml_min, "step_hz": round(s.step_hz, 3),
                           "calibration_session": curves[s.pump].session,
                           "calibration_points": curves[s.pump].points} for s in settings},
    })
    say(f"Logging to {log.csv_path}")
    say("Type a note and press Enter to log it with the time (e.g. sampled port C). Type q to stop.")

    # A dropped SSH session must not stop a run. A polite kill stops it like Ctrl-C.
    signal.signal(signal.SIGHUP, signal.SIG_IGN)

    def on_term(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, on_term)

    reason = "error"
    elapsed = 0.0
    volumes = {}
    try:
        reason, elapsed, volumes = execute_run(hw, settings, args.minutes, args.coil_m, log,
                                               commands=stdin_lines(), say=say)
    finally:
        log.finish(end_reason=reason, end_utc=utc_now(), seconds_run=round(elapsed, 1),
                   commanded_ml=volumes)
        hw.close()
    say(f"Pumps stopped ({reason}) after {elapsed / 60:.1f} min. Commanded: {volumes}")
    say("Weigh or check the jugs against the commanded volumes. The Pi cannot sense a stalled pump.")
    say("Commit the log: git add ../data/lab && git commit -m \"Run logs\" && git push")
    return 0


# ------------------------------------------------------------------ stop / status
def cmd_stop(args) -> int:
    if args.fake:
        say("--fake: nothing to stop.")
        return 0
    emergency_stop()
    say("Step pulses off, so both pumps have stopped.")
    time.sleep(1.5)  # a live run notices within 0.5 s, logs it and frees the pins
    try:
        from .hardware import RaspberryPi
        hw = RaspberryPi()
        stop_all(hw)
        hw.close()
        say("Motor power off.")
    except Exception as e:  # the pumps are already stopped, so this is only a report
        say(f"Could not switch motor power off ({e}). The pumps are stopped; a run may hold the pins.")
    return 0


def cmd_status(args) -> int:
    folder = args.data_dir or cfg.DEFAULT_DATA_DIR
    say(f"Clock synced: {clock_synced()}")
    for name in cfg.PUMPS:
        try:
            curve = cal.load_curve(folder, name)
        except cal.CalibrationError as e:
            say(str(e))
            continue
        say(f"{name}: session {curve.session}")
        for hz, flow in curve.points:
            say(f"  {flow:.4f} mL/min at {hz:.2f} steps/s")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="pumpctl", description="Reactor pump control.")
    parser.add_argument("--fake", action="store_true", help="practice with no hardware")
    parser.add_argument("--data-dir", help="where logs go (default: data/lab in the repo)")
    sub = parser.add_subparsers(dest="command", required=True)
    pumps = sorted(cfg.PUMPS)

    p = sub.add_parser("calibrate", help="pump for a set time, then enter the weighed mass")
    p.add_argument("pump", choices=pumps)
    speed = p.add_mutually_exclusive_group(required=True)
    speed.add_argument("--step-hz", type=float, help="exact speed; use this for the first point")
    speed.add_argument("--target", type=float, help="mL/min, estimated from earlier points")
    p.add_argument("--minutes", type=float, default=10.0)
    p.add_argument("--session", help="group of points (default: today). New tubing = new session.")
    p.add_argument("--who", required=True)
    p.add_argument("--note", default="")
    p.set_defaults(func=cmd_calibrate)

    p = sub.add_parser("prime", help="fill a line with liquid")
    p.add_argument("pump", choices=pumps)
    speed = p.add_mutually_exclusive_group(required=True)
    speed.add_argument("--step-hz", type=float)
    speed.add_argument("--ml-min", type=float)
    p.add_argument("--seconds", type=float, default=30.0)
    p.set_defaults(func=cmd_prime)

    p = sub.add_parser("run", help="run both pumps at set flows and log it")
    p.add_argument("--run-id", required=True)
    p.add_argument("--feed", type=float, required=True, help="mL/min")
    p.add_argument("--chlorine", type=float, required=True, help="mL/min")
    p.add_argument("--minutes", type=float, required=True, help="auto-stop time")
    p.add_argument("--coil-m", type=float, default=cfg.DEFAULT_COIL_M)
    p.add_argument("--who", required=True)
    p.add_argument("--note", default="", help="dose, stock batch, anything worth keeping")
    p.add_argument("--yes", action="store_true", help="skip the Enter prompt")
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("stop", help="stop both pumps, from any terminal")
    p.set_defaults(func=cmd_stop)

    p = sub.add_parser("status", help="show the clock and calibration")
    p.set_defaults(func=cmd_status)
    return parser


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return args.func(args)
    except cal.CalibrationError as e:
        sys.exit(str(e))
    except (FileExistsError, ValueError) as e:
        sys.exit(str(e))
    except KeyboardInterrupt:  # Ctrl-C at a prompt. Once pumps are on, each command stops them itself.
        say("\nCancelled.")
        return 130
