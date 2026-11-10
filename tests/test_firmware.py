"""The Arduino firmware, compiled and run on this computer (no board needed).

Checks: exact step counts, the watchdog, the 71.6 min micros() wrap, the laptop's Arduino class talking
to the real firmware logic, the simulator's copy of the firmware giving the same replies, and the pins
agreeing between the firmware, config.py and the simulator's wiring record.
Not checked: the real board, its USB link and timing, or the Arduino build itself.
"""
import os
import pathlib
import queue
import re
import shutil
import subprocess
import sys
import threading

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
FW = ROOT / "controller" / "firmware"
sys.path.insert(0, str(ROOT / "controller"))
sys.path.insert(0, str(ROOT / "controller" / "sim"))
from pumpctl import config as cfg  # noqa: E402
from pumpctl import hardware  # noqa: E402
from pumpctl.hardware import Arduino, ArduinoError, PortBusy, start_pump, stop_all  # noqa: E402
from arduino_twin import Twin  # noqa: E402
import wiring  # noqa: E402

CXX = shutil.which("c++") or shutil.which("g++") or shutil.which("clang++")
needs_cxx = pytest.mark.skipif(CXX is None, reason="no C++ compiler")


@pytest.fixture(scope="module")
def harness(tmp_path_factory):
    if CXX is None:
        pytest.skip("no C++ compiler")
    exe = tmp_path_factory.mktemp("fw") / "pumpfw_host"
    subprocess.run([CXX, "-std=c++11", "-Wall", "-Wextra", "-Werror", "-O2", "-o", str(exe),
                    str(FW / "host_harness.cpp")], check=True, capture_output=True, text=True)
    return exe


class Board:
    """The firmware running on this computer, with a serial-port-like face for pumpctl's Arduino class."""

    def __init__(self, exe, start_us=0, us_per_command=200):
        self.p = subprocess.Popen([str(exe), str(start_us)], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, text=True, bufsize=1)
        self.lines = queue.Queue()
        self.us_per_command = us_per_command
        threading.Thread(target=self._read, daemon=True).start()
        self._out = b""

    def _read(self):
        for line in self.p.stdout:
            self.lines.put(line.rstrip("\n"))

    def send(self, text):
        self.p.stdin.write(text + "\n")
        self.p.stdin.flush()

    def wait(self, seconds):
        self.send(f"T {int(round(seconds * 1e6))}")

    def get(self, timeout=5.0):
        return self.lines.get(timeout=timeout)

    def drain(self):
        """Every line printed so far."""
        self.send("S")
        out = []
        while True:
            line = self.get()
            if line.startswith("STEPS"):
                return out, line
            out.append(line)

    def steps(self):
        _, line = self.drain()
        f, c, _, en = line.split()[1:]
        return int(f), int(c), en == "1"

    # serial.Serial look-alike
    def write(self, data):
        self._out += data
        while b"\n" in self._out:
            line, self._out = self._out.split(b"\n", 1)
            self.send("> " + line.decode())
            self.send(f"T {self.us_per_command}")
        return len(data)

    def readline(self):
        try:
            return (self.get(timeout=1.0) + "\r\n").encode()
        except queue.Empty:
            return b""

    def close(self):
        if self.p.poll() is None:
            self.p.stdin.close()
            self.p.wait(timeout=5)


@pytest.fixture
def board(harness):
    b = Board(harness)
    assert b.get() == "READY pumpfw 1"
    yield b
    b.close()


def connect(board):
    return Arduino("/dev/test", open_serial=lambda *a, **k: board)


# ------------------------------------------------------------------ step timing
@needs_cxx
@pytest.mark.parametrize("hz", [33.3333, 800, 3219.7, 8000])
def test_step_count_matches_the_rate_it_reports(board, hz):
    board.send("> EN 1")
    board.send(f"> HZ 0 {hz}")
    board.send("> ON 0")
    board.send("> WD 60")
    board.wait(4.0)
    replies, _ = board.drain()
    interval = int(replies[1].split()[1])
    actual = 256e6 / interval
    # Intervals are whole 1/256 us, so the rate is off by at most half of one: 6 ppm at 8000/s.
    # pumpctl uses the rate the board reports, so even that never reaches the logs.
    assert actual == pytest.approx(hz, rel=0.5 / interval)
    feed, chlorine, _ = board.steps()
    assert feed == pytest.approx(actual * 4.0, abs=1.01)  # one step is sent at the start
    assert chlorine == 0


@needs_cxx
def test_both_pumps_at_once_keep_their_own_rates(board):
    for line in ("EN 1", "HZ 0 3200", "HZ 1 355.55", "ON 0", "ON 1", "WD 60"):
        board.send("> " + line)
    board.wait(10.0)
    feed, chlorine, en = board.steps()
    assert en
    assert feed == pytest.approx(32000, abs=2)
    assert chlorine == pytest.approx(3555.5, abs=2)


@needs_cxx
def test_speed_change_while_running_does_not_lose_or_add_steps(board):
    for line in ("EN 1", "HZ 0 800", "ON 0", "WD 60"):
        board.send("> " + line)
    board.wait(1.0)
    board.send("> HZ 0 1600")
    board.wait(1.0)
    feed, _, _ = board.steps()
    assert feed == pytest.approx(800 + 1600, abs=2)


@needs_cxx
def test_micros_wrap_after_71_minutes_keeps_stepping(harness):
    b = Board(harness, start_us=2**32 - 500_000)  # micros() wraps half a second in
    b.get()
    for line in ("EN 1", "HZ 0 1000", "ON 0"):
        b.send("> " + line)
    for _ in range(4):  # keep talking so the watchdog stays quiet
        b.wait(0.5)
        b.send("> STAT")
    feed, _, en = b.steps()
    b.close()
    assert en and feed == pytest.approx(2000, abs=2)


# ------------------------------------------------------------------ watchdog
@needs_cxx
def test_watchdog_stops_both_pumps_when_the_laptop_goes_quiet(board):
    for line in ("EN 1", "HZ 0 800", "HZ 1 80", "ON 0", "ON 1"):
        board.send("> " + line)
    board.wait(4.9)
    _, _, en = board.steps()
    assert en  # 4.9 s of silence is allowed
    board.wait(1.0)
    replies, _ = board.drain()
    assert "! WATCHDOG" in replies
    before = board.steps()
    board.wait(2.0)
    after = board.steps()
    assert after == before and not after[2]  # no steps and motor power off


@needs_cxx
def test_watchdog_is_quiet_while_nothing_is_on(board):
    board.wait(30)
    replies, _ = board.drain()
    assert "! WATCHDOG" not in replies


# ------------------------------------------------------------------ pumpctl's Arduino class, end to end
@needs_cxx
def test_arduino_class_drives_the_real_firmware(board):
    hw = connect(board)
    assert hw.version == "pumpfw 1"
    hw.enable_motors()
    actual = start_pump(hw, "feed", 3200, sleep=lambda s: board.wait(s))
    assert actual == pytest.approx(3200, rel=1e-6)
    start_pump(hw, "chlorine", 355.5, sleep=lambda s: board.wait(s))
    assert hw.is_running("feed") and hw.is_running("chlorine")
    stop_all(hw)
    assert not hw.is_running("feed") and not hw.is_running("chlorine")
    _, _, en = board.steps()
    assert not en
    hw.close()


@needs_cxx
def test_arduino_class_reports_refusals(board):
    hw = connect(board)
    with pytest.raises(ArduinoError, match="no rate set"):
        hw.pulses_on("feed")
    with pytest.raises(ArduinoError, match="out of range"):
        hw.set_hz("feed", 20000)


@needs_cxx
def test_watchdog_stop_shows_up_as_a_stopped_pump(board):
    hw = connect(board)
    hw.enable_motors()
    start_pump(hw, "feed", 400)
    board.wait(cfg.WATCHDOG_S + 1)  # the laptop froze
    assert not hw.is_running("feed")


def test_busy_port_gives_a_clear_message():
    import serial

    def busy(*args, **kwargs):
        raise serial.SerialException("Could not exclusively lock port")

    with pytest.raises(PortBusy, match="already driving"):
        Arduino("/dev/test", open_serial=busy)


def test_no_answer_gives_a_clear_message():
    class Silent:
        def write(self, data):
            return len(data)

        def readline(self):
            return b""

        def close(self):
            pass

    with pytest.raises(ArduinoError, match="pumpfw uploaded"):
        Arduino("/dev/test", open_serial=lambda *a, **k: Silent(), boot_s=0.2)


# ------------------------------------------------------------------ the simulator's copy
SCRIPTS = [
    ["PING", "STAT", "HZ 0 800", "HZ 1 33.3333", "ON 0", "EN 1", "ON 1", "STAT", "OFF 0", "STAT",
     "STOP", "STAT"],
    ["ON 0", "HZ 2 5", "HZ 0 0", "HZ 0 -3", "HZ 0 10001", "HZ 0 abc", "HZ 0 10000", "HZ 1 0.06",
     "HZ 1 0.0595", "EN 2", "EN", "WD 0", "WD 61", "WD 7", "FOO", "PING 1", "A B C D",
     "X" * 45, "STAT"],
    ["EN 1", "HZ 0 100", "ON 0", ("wait", 3.0), "STAT", ("wait", 5.5), "STAT", "WD 2",
     "ON 0", "STAT"],
    ["WD 2", "EN 1", ("wait", 1.5), "STAT", ("wait", 2.5), "PING", "STAT"],
]


@needs_cxx
@pytest.mark.parametrize("script", SCRIPTS)
def test_simulator_copy_replies_like_the_firmware(harness, tmp_path, script):
    b = Board(harness)
    twin = Twin(tmp_path, min_real_silence_s=0)  # the simulator-only real-time floor off
    twin.power_on(0.0)
    want, now = [b.get()], 0.0
    got = ["READY pumpfw 1"]
    for item in script:
        if isinstance(item, tuple):
            b.wait(item[1])
            now += item[1]
        else:
            b.send("> " + item)
            got += twin.command(item, now)
        b.wait(0.001)
        now += 0.001
    lines, _ = b.drain()
    got += twin.check_watchdog(now)
    b.close()
    want += lines
    assert got == want


# ------------------------------------------------------------------ pins
def test_pins_agree_between_firmware_config_and_simulator():
    ino = (FW / "pumpfw" / "pumpfw.ino").read_text()
    step = [int(x) for x in re.search(r"STEP_PIN\[2\] = \{(\d+), (\d+)\}", ino).groups()]
    dirs = [int(x) for x in re.search(r"DIR_PIN\[2\] = \{(\d+), (\d+)\}", ino).groups()]
    en = int(re.search(r"EN_PIN = (\d+);", ino).group(1))
    for i, name in enumerate(wiring.PUMP_ORDER):
        p = cfg.PUMPS[name]
        assert p.index == i
        assert step[i] == p.step_pin == wiring.STEP[name]
        assert dirs[i] == p.dir_pin == wiring.DIR[name]
    assert en == cfg.ENABLE_PIN == wiring.EN
    core = (FW / "pumpfw" / "pumpfw_core.h").read_text()
    assert f"DEFAULT_WD_MS = {cfg.WATCHDOG_S * 1000};" in core
    assert int(re.search(r"MAX_STEP_HZ = (\d+);", core).group(1)) >= cfg.MAX_STEP_HZ
    assert hardware.INTERVAL_UNITS_PER_S == 256e6
