"""Pump controller logic, checked without hardware (FakeArduino). The USB link: test_firmware.py."""
import csv
import json
import pathlib
import subprocess
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "controller"))
from pumpctl import calibration as cal, config as cfg
from pumpctl.control import PumpSetting, execute_run
from pumpctl.hardware import FakeArduino, ramp_steps, start_pump, stop_all
from pumpctl.runlog import RunLog


class Clock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.t += s


def add_point(folder, pump, hz, flow, session="2026-12-01"):
    cal.append_row(folder, {"time_utc": "x", "session": session, "who": "t", "pump": pump,
                            "step_hz": hz, "seconds": 600, "mass_start_g": 0,
                            "mass_end_g": flow * 10, "mass_net_g": flow * 10, "ml_per_min": flow,
                            "ul_per_step": 0, "note": ""})


def new_log(tmp_path, run_id="r1"):
    return RunLog(tmp_path, run_id, {"run_id": run_id})


def events(log):
    with log.csv_path.open() as f:
        return list(csv.DictReader(f))


SETTINGS = [PumpSetting("feed", 0.9, 100.0), PumpSetting("chlorine", 0.1, 10.0)]


# ------------------------------------------------------------------ reactor numbers
def test_coil_numbers_match_project_state():
    # 3.8 m = 30 min and ports 7.5/15/22.5 min at 1 mL/min; 7.6 m = 60 min (project-state.md)
    t = cfg.sampling_times(3.8, 1.0)
    assert t["outlet"] == pytest.approx(30, abs=0.2)
    assert [t[p] for p in "ABC"] == pytest.approx([7.5, 15, 22.5], abs=0.1)
    assert cfg.sampling_times(7.6, 1.0)["outlet"] == pytest.approx(60, abs=0.4)


def test_startup_wait_matches_v2_rule():
    # v2 plan: 120 min for the 7.6 m coil, 80 min at 0.75 mL/min on 3.8 m
    assert cfg.startup_wait_min(7.6, 1.0) == pytest.approx(120, abs=1)
    assert cfg.startup_wait_min(3.8, 0.75) == pytest.approx(80, abs=1)


# ------------------------------------------------------------------ calibration
def test_flow_interpolates_between_points(tmp_path):
    add_point(tmp_path, "feed", 100, 1.0)
    add_point(tmp_path, "feed", 200, 2.2)
    assert cal.load_curve(tmp_path, "feed").hz_for(1.6) == pytest.approx(150)


def test_single_point_only_works_near_that_point(tmp_path):
    add_point(tmp_path, "chlorine", 100, 0.10)
    curve = cal.load_curve(tmp_path, "chlorine")
    assert curve.hz_for(0.10) == pytest.approx(100)
    assert curve.hz_for(0.104) == pytest.approx(104)
    with pytest.raises(cal.CalibrationError):
        curve.hz_for(0.075)


def test_first_point_can_guide_the_next_but_cannot_drive_a_run(tmp_path):
    add_point(tmp_path, "chlorine", 3200, 30.0)
    curve = cal.load_curve(tmp_path, "chlorine")
    assert curve.estimate_hz(0.1) == pytest.approx(3200 * 0.1 / 30)
    with pytest.raises(cal.CalibrationError):
        curve.hz_for(0.1)


def test_gap_to_nearest_point(tmp_path):
    add_point(tmp_path, "feed", 100, 1.0)
    add_point(tmp_path, "feed", 3000, 30.0)
    curve = cal.load_curve(tmp_path, "feed")
    assert curve.gap_to_nearest_point(1.0) == 0
    assert curve.gap_to_nearest_point(10.0) == pytest.approx(0.9)


def test_newest_session_replaces_older_tubing(tmp_path):
    add_point(tmp_path, "feed", 100, 1.0, session="old")
    add_point(tmp_path, "feed", 100, 0.8, session="new")
    assert cal.load_curve(tmp_path, "feed").points == ((100.0, 0.8),)


def test_repeat_points_are_averaged(tmp_path):
    add_point(tmp_path, "feed", 100, 1.0)
    add_point(tmp_path, "feed", 100, 1.2)
    assert cal.load_curve(tmp_path, "feed").points == ((100.0, pytest.approx(1.1)),)


def test_flow_falling_with_speed_is_refused(tmp_path):
    add_point(tmp_path, "feed", 100, 1.0)
    add_point(tmp_path, "feed", 200, 0.9)
    with pytest.raises(cal.CalibrationError):
        cal.load_curve(tmp_path, "feed")


def test_missing_calibration_is_refused(tmp_path):
    with pytest.raises(cal.CalibrationError):
        cal.load_curve(tmp_path, "feed")


# ------------------------------------------------------------------ starting and stopping
def test_slow_start_needs_no_ramp():
    hw, slept = FakeArduino(), []
    start_pump(hw, "feed", 100, sleep=slept.append)
    assert hw.hz["feed"] == 100 and hw.running["feed"] and not slept


def test_fast_start_ramps_up():
    hw, seen = FakeArduino(), []
    start_pump(hw, "feed", 4000, sleep=lambda s: seen.append(hw.hz["feed"]))
    assert seen[0] == cfg.START_HZ and seen == sorted(seen) and hw.hz["feed"] == 4000


def test_ramp_steps_match_what_start_pump_actually_sends():
    hw, sent, rate = FakeArduino(), [], [0.0]
    set_hz = hw.set_hz

    def recording_set_hz(pump, hz):
        rate[0] = hz
        return set_hz(pump, hz)

    hw.set_hz = recording_set_hz
    start_pump(hw, "feed", 3200, sleep=lambda s: sent.append(rate[0] * s))
    assert sum(sent) == pytest.approx(ramp_steps(3200))
    assert ramp_steps(3200) == pytest.approx(3880)
    assert ramp_steps(cfg.START_HZ) == 0


@pytest.mark.parametrize("hz", [0, -5, cfg.MAX_STEP_HZ + 1])
def test_unsafe_speed_is_refused(hz):
    hw = FakeArduino()
    with pytest.raises(ValueError):
        start_pump(hw, "feed", hz)
    assert not hw.running["feed"]


def test_one_failed_stop_still_stops_the_other_pump():
    class Broken(FakeArduino):
        def pulses_off(self, pump):
            if pump == "feed":
                raise OSError("feed write failed")
            super().pulses_off(pump)

    hw = Broken()
    hw.running = {"feed": True, "chlorine": True}
    hw.motors_enabled = True
    with pytest.raises(OSError):
        stop_all(hw)
    assert not hw.running["chlorine"] and not hw.motors_enabled


# ------------------------------------------------------------------ a whole run
def test_run_stops_on_time_and_logs(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)
    reason, elapsed, volumes = execute_run(hw, SETTINGS, 90, 3.8, log, say=lambda s: None,
                                           clock=clock, sleep=clock.sleep)
    assert reason == "time_up"
    assert elapsed == pytest.approx(5400, abs=1)
    assert volumes["feed"] == pytest.approx(81, abs=0.1)
    assert volumes["chlorine"] == pytest.approx(9, abs=0.1)
    assert not any(hw.running.values()) and not hw.motors_enabled
    log.finish()
    rows = events(log)
    assert [r["event"] for r in rows] == ["pump_start", "pump_start", "startup_wait_over",
                                          "pumps_stopped"]
    assert float(rows[2]["elapsed_s"]) == pytest.approx(3610, abs=5)  # 2 x 30.08 min


def test_notes_and_typed_stop(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)
    typed = [["sampled port C"], [], ["q"]]
    reason, elapsed, _ = execute_run(hw, SETTINGS, 90, 3.8, log, say=lambda s: None, clock=clock,
                                     sleep=clock.sleep, commands=lambda: typed.pop(0) if typed else [])
    assert reason == "user_stop" and elapsed < 5
    assert not any(hw.running.values())
    log.finish()
    assert any(r["event"] == "note" and r["note"] == "sampled port C" for r in events(log))


def test_ctrl_c_stops_pumps(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)

    def interrupt():
        raise KeyboardInterrupt

    reason, _, _ = execute_run(hw, SETTINGS, 90, 3.8, log, say=lambda s: None, clock=clock,
                               sleep=clock.sleep, commands=interrupt)
    assert reason == "user_interrupt"
    assert not any(hw.running.values()) and not hw.motors_enabled


def test_crash_mid_run_stops_pumps(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)

    def crash():
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError):
        execute_run(hw, SETTINGS, 90, 3.8, log, say=lambda s: None, clock=clock,
                    sleep=clock.sleep, commands=crash)
    assert not any(hw.running.values()) and not hw.motors_enabled


def test_failed_pump_start_stops_the_pump_already_running(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)
    bad = [SETTINGS[0], PumpSetting("chlorine", 0.1, cfg.MAX_STEP_HZ + 1)]
    with pytest.raises(ValueError):
        execute_run(hw, bad, 90, 3.8, log, say=lambda s: None, clock=clock, sleep=clock.sleep)
    assert not any(hw.running.values()) and not hw.motors_enabled


def test_pumps_stopped_by_the_board_are_noticed(tmp_path):
    hw, clock, log = FakeArduino(), Clock(), new_log(tmp_path)
    calls = []

    def other_terminal():  # e.g. the Arduino restarted or its watchdog fired
        calls.append(1)
        if len(calls) == 3:
            hw.pulses_off("feed")
            hw.pulses_off("chlorine")
        return []

    reason, _, _ = execute_run(hw, SETTINGS, 90, 3.8, log, say=lambda s: None, clock=clock,
                               sleep=clock.sleep, commands=other_terminal)
    assert reason == "stopped_externally"
    assert not hw.motors_enabled


def test_logs_never_overwrite_an_earlier_run(tmp_path):
    new_log(tmp_path).finish()
    with pytest.raises(FileExistsError):
        new_log(tmp_path)


@pytest.mark.parametrize("bad", ["../../oops", "a b", "", "a/b"])
def test_unsafe_run_ids_are_refused(tmp_path, bad):
    with pytest.raises(ValueError):
        new_log(tmp_path, bad)


# ------------------------------------------------------------------ the command line, end to end
def pumpctl(*args, stdin=""):
    return subprocess.run([sys.executable, "-m", "pumpctl", "--fake", *args], cwd=ROOT / "controller",
                          input=stdin, capture_output=True, text=True, timeout=60)


def test_cli_calibrate_then_run(tmp_path):
    for pump, hz, end in (("feed", 90, "0.09"), ("chlorine", 10, "0.01")):
        out = pumpctl("--data-dir", str(tmp_path), "calibrate", pump, "--step-hz", str(hz),
                      "--minutes", "0.1", "--who", "t", stdin=f"0\n\n{end}\n")
        assert out.returncode == 0, out.stderr + out.stdout
    assert cal.load_curve(tmp_path, "feed").points[0][1] == pytest.approx(0.9, rel=0.05)

    out = pumpctl("--data-dir", str(tmp_path), "run", "--run-id", "demo", "--who", "t",
                  "--feed", "0.9", "--chlorine", "0.1", "--minutes", "0.02", "--yes",
                  "--note", "5 mg/L")
    assert out.returncode == 0, out.stderr + out.stdout
    meta = json.loads((tmp_path / "reactor_runs" / "demo.json").read_text())
    assert meta["end_reason"] == "time_up" and meta["who"] == "t" and meta["note"] == "5 mg/L"
    assert meta["contact_min"]["outlet"] == pytest.approx(30, abs=0.2)
    assert meta["pumps"]["chlorine"]["calibration_session"]
    assert "units" in meta and "instrument" in meta


def test_cli_refuses_run_without_calibration(tmp_path):
    out = pumpctl("--data-dir", str(tmp_path), "run", "--run-id", "x", "--who", "t", "--feed", "0.9",
                  "--chlorine", "0.1", "--minutes", "1", "--yes")
    assert out.returncode != 0 and "no calibration" in out.stderr
    assert not (tmp_path / "reactor_runs").exists()
