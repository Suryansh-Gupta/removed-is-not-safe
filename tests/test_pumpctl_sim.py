"""The pump simulator runs the real pumpctl, through the simulated Arduino, on a virtual bench."""
import csv
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import sys
import time

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "controller"))
sys.path.insert(0, str(ROOT / "controller" / "sim"))
from bench import ML_PER_REV, Bench  # noqa: E402
import arduino_twin  # noqa: E402
from pumpctl import config as cfg  # noqa: E402
from ris import cipro_model as cm  # noqa: E402
import wiring  # noqa: E402

RUNNER = ROOT / "controller" / "sim" / "runner.py"


def pumpctl(bench, *args, stdin=subprocess.DEVNULL):
    env = {**os.environ, "PUMPCTL_SIM_STATE": str(bench.state), "PYTHONUNBUFFERED": "1"}
    return subprocess.Popen([sys.executable, str(RUNNER), *args], env=env, stdin=stdin,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)


def run_args(run_id, minutes):
    return ["run", "--run-id", run_id, "--feed", "0.9", "--chlorine", "0.1", "--minutes",
            str(minutes), "--who", "test", "--yes"]


def wait_until(bench, test, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        bench.tick()
        if test():
            return
        time.sleep(0.02)
    raise AssertionError("condition not met in time")


@pytest.fixture
def bench(tmp_path):
    return Bench(tmp_path / "state", speed=300)


def test_timed_run_delivers_what_the_code_commanded(bench):
    out, _ = pumpctl(bench, *run_args("t1", 5)).communicate(timeout=30)
    assert "Pumps stopped (time_up)" in out
    bench.tick()
    assert bench.pumps["feed"]["pumped"] == pytest.approx(0.9 * 5, rel=0.01)
    assert bench.pumps["chlorine"]["pumped"] == pytest.approx(0.1 * 5, rel=0.01)
    assert not bench.motor_turning("feed")
    assert bench.pins[cfg.ENABLE_PIN] == 1  # motor power off on the way out (active low)
    note = json.loads((bench.state / "data_lab" / "reactor_runs" / "t1.json").read_text())
    assert note["end_reason"] == "time_up"
    assert "simulated" not in note["instrument"]  # pumpctl's own note, unchanged


def test_real_hardware_path_sets_real_step_rate(bench):
    proc = pumpctl(bench, *run_args("t2", 5))
    wait_until(bench, lambda: bench.motor_turning("feed") and bench.motor_turning("chlorine"))
    rpm = cfg.rpm(bench.step_hz("feed"))
    assert rpm * ML_PER_REV["feed"] == pytest.approx(0.9, rel=0.01)
    assert bench.pins[cfg.ENABLE_PIN] == 0  # enable is active low
    assert bench.direction("feed") == 1
    proc.communicate(timeout=30)


def test_stop_command_points_to_q_or_the_cable_while_a_run_holds_the_port(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t3", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    out, _ = pumpctl(bench, "stop").communicate(timeout=30)
    assert "Type q" in out and "USB cable" in out
    bench.tick()
    assert bench.motor_turning("feed")  # the run is untouched
    proc.kill()
    proc.communicate()


def test_pulling_the_usb_cable_stops_the_pumps_at_once(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t3b", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    bench.set_usb(False)
    for _ in range(50):  # and they stay stopped while the code keeps polling (a race the page once had)
        bench.tick()
        assert not bench.motor_turning("feed") and not bench.motor_turning("chlorine")
        time.sleep(0.01)
    out, _ = proc.communicate(timeout=60)
    assert "No reply from the Arduino" in out and "Traceback" not in out
    note = json.loads((bench.state / "data_lab" / "reactor_runs" / "t3b.json").read_text())
    assert note["end_reason"] == "error"  # the log still closes


def test_killed_program_is_caught_by_the_arduino_watchdog(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t4", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    proc.send_signal(signal.SIGKILL)
    proc.communicate(timeout=10)
    bench.tick()
    killed_at, before = bench.vnow, bench.pumps["feed"]["pumped"]
    wait_until(bench, lambda: not bench.motor_turning("feed"))
    assert not bench.motor_turning("chlorine") and not bench.enabled()
    # Stopped within the watchdog time: 5 s more pumping, plus the last 0.5 s poll gap, plus the
    # simulator-only real-time floor (0.25 s real = 7.5 s simulated at this 30x playback).
    floor_s = arduino_twin.MIN_REAL_SILENCE_S * bench.speed
    assert bench.pumps["feed"]["pumped"] - before <= 0.9 * (cfg.WATCHDOG_S + 0.6 + floor_s) / 60
    assert bench.vnow - killed_at < 30
    out, _ = pumpctl(bench, "stop").communicate(timeout=30)  # the port is free again
    assert "Both pumps stopped" in out


def test_jammed_pump_is_invisible_to_the_code(bench):
    bench.stalled["chlorine"] = True
    out, _ = pumpctl(bench, *run_args("t5", 5)).communicate(timeout=30)
    assert "Pumps stopped (time_up)" in out  # the code reports nothing wrong
    bench.tick()
    assert bench.pumps["chlorine"]["pumped"] == 0
    with (bench.state / "data_lab" / "reactor_runs" / "t5.csv").open() as f:
        rows = list(csv.DictReader(f))
    assert not [r for r in rows if r["event"] == "pump_found_stopped"]


def test_primed_lines_mix_at_the_set_ratio(bench):
    for pump in ("feed", "chlorine"):
        bench.pumps[pump]["pumped"] = bench.line_ml(pump)  # as if primed right up to the tee
    pumpctl(bench, *run_args("t6", 15)).communicate(timeout=30)
    bench.tick()
    profile = bench.coil_profile()
    assert profile[0] == pytest.approx(0.1, rel=0.02)
    assert profile[-1] is None  # plug flow: 15 mL in has not reached the end of a 30 mL coil


def test_unprimed_chlorine_line_arrives_late_at_low_flow(bench):
    # 1 m of 1/8 in tube holds 7.9 mL, which takes 79 min at 0.10 mL/min.
    pumpctl(bench, *run_args("t8", 60)).communicate(timeout=30)
    bench.tick()
    assert bench.pumps["chlorine"]["pumped"] < bench.line_ml("chlorine")
    assert all(b in (None, 0) for b in bench.coil_profile())  # 60 min: only feed has entered


def test_second_driver_is_refused_while_a_run_holds_the_lock(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t7", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    out, _ = pumpctl(bench, "prime", "feed", "--step-hz", "800", "--seconds", "1").communicate(timeout=20)
    assert "already driving" in out
    proc.kill()
    proc.communicate()


def test_calibrate_through_the_simulated_scale(bench):
    bench.set_speed(20)
    proc = pumpctl(bench, "calibrate", "feed", "--step-hz", "3200", "--minutes", "1", "--who", "t",
                   "--session", "fresh", stdin=subprocess.PIPE)
    proc.stdin.write(f"{48.00}\n\n")
    proc.stdin.flush()
    wait_until(bench, lambda: bench.motor_turning("feed"))
    wait_until(bench, lambda: not bench.enabled())
    net = bench.scale_ml
    # 1 rev/s for the 60 s the code times, plus about 1.2 rev during the 2 s ramp before its timer.
    assert net == pytest.approx(ML_PER_REV["feed"] * 61.2, rel=0.01)
    out, _ = proc.communicate(f"{48.00 + net:.2f}\n", timeout=20)
    assert "Saved to" in out
    with (bench.state / "data_lab" / "pump_calibration" / "calibration.csv").open() as f:
        saved = [r for r in csv.DictReader(f) if r["session"] == "fresh"][-1]
    # Steady flow at 1 rev/s, ramp accounted for. Without the fix this reads about 2.5% high. The
    # 1% allowance is simulator lag, which grows with playback speed (0.5% at 5x, 1.1% at 60x).
    assert float(saved["ml_per_min"]) == pytest.approx(ML_PER_REV["feed"] * 60, rel=0.01)


@pytest.mark.parametrize("args, prompt", [
    (run_args("t9", 5)[:-1], "Ctrl-C to cancel. "),
    (["calibrate", "feed", "--step-hz", "800", "--minutes", "1", "--who", "t"], "(g): "),
])
def test_ctrl_c_at_a_prompt_cancels_without_a_traceback(bench, args, prompt):
    proc = pumpctl(bench, *args, stdin=subprocess.PIPE)
    seen = ""
    while not seen.endswith(prompt):
        char = proc.stdout.read(1)
        assert char, seen
        seen += char
    proc.send_signal(signal.SIGINT)
    out, _ = proc.communicate(timeout=20)
    assert "Traceback" not in out and "Cancelled." in out
    assert proc.returncode == 130
    bench.tick()
    assert not bench.motor_turning("feed")


# ---------------------------------------------------------------- wiring
def test_wiring_table_matches_config_and_readme():
    """Separate records of the same wires: controller/README.md, sim/wiring.py and pumpctl/config.py.
    test_firmware.py checks config.py against the firmware's own pin numbers."""
    readme = (ROOT / "controller" / "README.md").read_text()
    rows = re.findall(r"^\| (STEP|DIR|EN) \| (yes)? ?\| (yes)? ?\| D(\d+)", readme, re.M)
    table = {}
    for signal, feed, chlorine, pin in rows:
        if signal == "EN":
            table["EN"] = int(pin)
        else:
            table[(signal, "feed" if feed else "chlorine")] = int(pin)
    assert table == {("STEP", "feed"): 2, ("STEP", "chlorine"): 3, ("DIR", "feed"): 4, ("DIR", "chlorine"): 5, "EN": 8}
    for pump, p in cfg.PUMPS.items():
        assert wiring.STEP[pump] == table[("STEP", pump)] == p.step_pin
        assert wiring.DIR[pump] == table[("DIR", pump)] == p.dir_pin
    assert wiring.EN == table["EN"] == cfg.ENABLE_PIN
    assert wiring.microsteps("feed", set()) == cfg.MICROSTEPS


def fast_bench(bench, feed_hz=240.0, chlorine_hz=26.667):
    """Set the pins by hand, so long stretches can be worked out with no real waiting."""
    bench.pins.update({wiring.EN: 0, wiring.DIR["feed"]: 1, wiring.DIR["chlorine"]: 1})
    bench.step_rate.update({wiring.STEP["feed"]: feed_hz, wiring.STEP["chlorine"]: chlorine_hz})
    return bench


def advance_min(bench, minutes):
    bench._advance(minutes * 60)
    bench.vnow += minutes * 60


def test_swapped_step_wires_swap_the_speeds_and_the_code_cannot_tell(bench):
    bench.faults.add("swap_step")
    out, _ = pumpctl(bench, *run_args("w1", 5)).communicate(timeout=30)
    assert "Pumps stopped (time_up)" in out
    bench.tick()
    assert bench.pumps["chlorine"]["pumped"] == pytest.approx(0.9 * 5, rel=0.01)
    assert bench.pumps["feed"]["pumped"] == pytest.approx(0.1 * 5, rel=0.01)


def test_wrong_pin_leaves_feed_without_pulses(bench):
    bench.faults.add("wrong_pin")
    fast_bench(bench)
    advance_min(bench, 5)
    assert bench.pumps["feed"]["pumped"] == 0
    assert bench.pumps["chlorine"]["pumped"] == pytest.approx(0.5, rel=0.01)


def test_ms2_on_ground_halves_the_chlorine_flow(bench):
    bench.faults.add("ms2_gnd")
    fast_bench(bench)
    advance_min(bench, 10)
    assert bench.pumps["chlorine"]["pumped"] == pytest.approx(0.5, rel=0.01)


def test_reversed_chlorine_motor_takes_from_the_tee(bench):
    bench.faults.add("reverse_chlorine")
    fast_bench(bench)
    for p in bench.pumps.values():
        p["pumped"] = 8.0
    advance_min(bench, 10)
    assert bench.out_ml == pytest.approx((0.9 - 0.1) * 10, rel=0.01)
    assert all(b in (None, 0) for b in bench.coil_profile())


def test_swapped_dir_wires_stay_hidden_while_both_run_forward(bench):
    bench.faults.add("swap_dir")
    fast_bench(bench)
    advance_min(bench, 5)
    assert bench.pumps["feed"]["pumped"] == pytest.approx(4.5, rel=0.01)


# ---------------------------------------------------------------- skipped steps
def test_full_current_skips_nothing_across_the_speed_range(bench):
    bench.pins.update({wiring.EN: 0, wiring.DIR["feed"]: 1})
    for hz in (800, 2000, 4000, 8000):  # 8000 is MAX_STEP_HZ; these are start_pump-sized changes
        bench.step_rate[wiring.STEP["feed"]] = hz
        bench.sync["feed"] = True
        bench.last_rpm["feed"] = hz * 60 / 3200
        advance_min(bench, 0.1)
    assert bench.moved["feed"] == pytest.approx(bench.sent["feed"])


def test_low_current_skips_steps_the_code_does_not_notice(bench):
    bench.current = 0.25
    out, _ = pumpctl(bench, *run_args("s1", 5)).communicate(timeout=30)
    assert "Pumps stopped (time_up)" in out
    bench.tick()
    assert bench.pumps["feed"]["pumped"] < 0.9 * 5 * 0.9  # more than 10% short
    assert bench.moved["feed"] < bench.sent["feed"]


def test_a_sudden_start_at_low_current_loses_sync_until_the_rate_drops(bench):
    bench.current = 0.5
    fast_bench(bench, feed_hz=2000)  # 37.5 rpm from a standstill, limit 15 rpm at half current
    advance_min(bench, 1)
    assert not bench.sync["feed"] and bench.pumps["feed"]["pumped"] == 0
    fast_bench(bench, feed_hz=240)
    advance_min(bench, 1)
    assert bench.sync["feed"] and bench.pumps["feed"]["pumped"] > 0


def test_the_real_ramp_keeps_sync_where_a_jump_would_lose_it(bench):
    out, _ = pumpctl(bench, "prime", "feed", "--step-hz", "8000", "--seconds", "5").communicate(timeout=30)
    bench.tick()
    assert bench.sync["feed"] and bench.pumps["feed"]["pumped"] > 0, out


# ---------------------------------------------------------------- lines and chemistry
def test_unprimed_chlorine_reaches_the_outlet_after_line_plus_coil_time(bench):
    fast_bench(bench)
    arrived = None
    for minute in range(1, 130):
        advance_min(bench, 1)
        if arrived is None and (bench.coil_profile()[-1] or 0) > 0:
            arrived = minute
    assert arrived == pytest.approx(79.2 + 30.1, abs=2)  # 1 m line ESTIMATE, 3.8 m coil, 1 mL/min


def chem_at_outlet(mix):
    script = """
    const RIS = require(process.argv[1]), C = require(process.argv[2]);
    const c = C.make(RIS, { feed_mgL: 1.11, stock_mgL: 50, pH: 7.5, nh3_mgN_L: 0, hold_min: 5, k_rev: 0 });
    console.log(JSON.stringify(c.slice(...JSON.parse(process.argv[3]))));
    """
    out = subprocess.run(["node", "-e", script, str(ROOT / "web/model.js"), str(ROOT / "controller/sim/chem.js"),
                          json.dumps(mix)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_bench_chemistry_matches_the_python_model(bench):
    fast_bench(bench)
    for p in bench.pumps.values():
        p["pumped"] = 8.0  # primed
    advance_min(bench, 35)
    feed, chlorine, age = bench.coil_mix()[-1]
    assert (feed, chlorine) == (pytest.approx(0.9, abs=0.005), pytest.approx(0.1, abs=0.005))
    assert age == pytest.approx(30.1 * 60, rel=0.01)
    result = chem_at_outlet([0.9, 0.1, 30 * 60])
    summary = cm.run_batch(pH=7.5, Cl_dose_mgL=5.0, cipro_mgL=1.0, contact_min=30, after_bisulfite_min=5)[0]
    assert result["cipro_ugL"] + result["ncl_ugL"] == pytest.approx(summary["cipro_thiosulfate_ugL"], rel=0.02)
    assert result["quenched_cipro_ugL"] == pytest.approx(summary["cipro_out_ugL"], abs=2)
    assert result["core_pct"] == pytest.approx(summary["core_remaining_pct"], rel=0.02)
