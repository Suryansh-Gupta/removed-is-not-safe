"""The pump simulator runs the real pumpctl on a virtual bench. Checks the bench reads the pins right."""
import csv
import json
import os
import pathlib
import signal
import subprocess
import sys
import time

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pi"))
sys.path.insert(0, str(ROOT / "pi" / "sim"))
from bench import ML_PER_REV, Bench  # noqa: E402
from pumpctl import config as cfg  # noqa: E402

RUNNER = ROOT / "pi" / "sim" / "runner.py"


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
    assert bench.gpio[cfg.ENABLE_GPIO] is None  # pins released on the way out
    note = json.loads((bench.state / "data_lab" / "reactor_runs" / "t1.json").read_text())
    assert note["end_reason"] == "time_up"
    assert "simulated" not in note["instrument"]  # pumpctl's own note, unchanged


def test_real_hardware_path_sets_real_step_rate(bench):
    proc = pumpctl(bench, *run_args("t2", 5))
    wait_until(bench, lambda: bench.motor_turning("feed") and bench.motor_turning("chlorine"))
    rpm = cfg.rpm(bench.step_hz("feed"))
    assert rpm * ML_PER_REV["feed"] == pytest.approx(0.9, rel=0.01)
    assert bench.gpio[cfg.ENABLE_GPIO] == 0  # enable is active low
    assert bench.direction("feed") == 1
    proc.communicate(timeout=30)


def test_stop_command_from_second_terminal_ends_the_run(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t3", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    pumpctl(bench, "stop").communicate(timeout=30)
    out, _ = proc.communicate(timeout=30)
    assert "stopped_externally" in out
    bench.tick()
    assert not bench.motor_turning("feed")


def test_killed_program_leaves_pumps_running_as_the_readme_warns(bench):
    bench.set_speed(30)
    proc = pumpctl(bench, *run_args("t4", 60))
    wait_until(bench, lambda: bench.motor_turning("feed"))
    proc.send_signal(signal.SIGKILL)
    proc.communicate(timeout=10)
    bench.tick()
    assert bench.motor_turning("feed")
    before = bench.pumps["feed"]["pumped"]
    wait_until(bench, lambda: bench.pumps["feed"]["pumped"] > before)
    pumpctl(bench, "stop").communicate(timeout=30)
    bench.tick()
    assert not bench.motor_turning("feed")
    assert bench.gpio[cfg.ENABLE_GPIO] is None


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
    wait_until(bench, lambda: bench.gpio.get(cfg.ENABLE_GPIO) is None)
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
