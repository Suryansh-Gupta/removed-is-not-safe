"""The simulated Arduino: a Python copy of firmware/pumpfw/pumpfw_core.h.

tests/test_firmware.py feeds the same command scripts to this copy and to the real firmware code
(compiled on the laptop) and checks the replies match, so the simulator can't drift from the board.

The board outlives any one pumpctl program, as the real one does, so its state lives in a file in the
simulator's state folder, guarded by a file lock. What it does to its pins goes to events.jsonl, which
bench.py reads like wires: pin levels, and the step rate on each STEP pin (pulses are not sent one by one).
"""
from __future__ import annotations

import fcntl
import json
import os
import time
from contextlib import contextmanager
from pathlib import Path

import wiring

VERSION = "1"
MAX_STEP_HZ = 10000
MIN_INTERVAL = 256_000_000 // MAX_STEP_HZ
DEFAULT_WD_S = 5
CMD_MAX = 40
# Simulator only, not in the firmware: the watchdog also waits this much real time. At 300x playback a
# 17 ms hiccup on a busy computer is 5 simulated seconds, which would trip it with nothing wrong.
MIN_REAL_SILENCE_S = 0.25


def boot_state(usb: bool = True) -> dict:
    return {"usb": usb, "en": False, "on": [False, False], "interval": [0, 0], "wd_s": DEFAULT_WD_S,
            "last_cmd_t": 0.0, "last_cmd_wall": time.time()}


class Twin:
    def __init__(self, state_dir: Path, min_real_silence_s: float = MIN_REAL_SILENCE_S):
        self.dir = Path(state_dir)
        self.min_real_silence_s = min_real_silence_s
        self.file = self.dir / "arduino.json"

    # ------------------------------------------------------------- storage
    @contextmanager
    def board(self):
        """The board's state, locked for the length of the block and saved afterwards."""
        with (self.dir / "arduino.lock").open("w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            s = json.loads(self.file.read_text())
            yield s
            tmp = self.dir / "arduino.tmp"
            tmp.write_text(json.dumps(s))
            os.replace(tmp, self.file)

    def emit(self, t: float, event: dict) -> None:
        line = json.dumps({"t": round(t, 4), "pid": os.getpid(), **event}) + "\n"
        fd = os.open(self.dir / "events.jsonl", os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
        try:
            os.write(fd, line.encode())
        finally:
            os.close(fd)

    def _pins(self, s: dict, t: float) -> None:
        """Report every output pin as the board now drives it."""
        if not s["usb"]:
            for pin in wiring.ALL_PINS:
                self.emit(t, {"k": "pin", "pin": pin, "level": None})
            for pin in wiring.STEP.values():
                self.emit(t, {"k": "step", "pin": pin, "hz": 0.0})
            return
        self.emit(t, {"k": "pin", "pin": wiring.EN, "level": 0 if s["en"] else 1})
        for i, pump in enumerate(wiring.PUMP_ORDER):
            self.emit(t, {"k": "pin", "pin": wiring.DIR[pump], "level": wiring.FORWARD_LEVEL})
            hz = 256e6 / s["interval"][i] if s["on"][i] else 0.0
            self.emit(t, {"k": "step", "pin": wiring.STEP[pump], "hz": hz})

    # ------------------------------------------------------------- power
    def power_on(self, t: float, usb: bool = True) -> None:
        """Plug in (or unplug) the USB cable, which powers the board. Plugging in boots it."""
        self.dir.mkdir(parents=True, exist_ok=True)
        if not self.file.exists():
            self.file.write_text(json.dumps(boot_state(usb)))
        with self.board() as s:  # locked, so a pumpctl command can't write back the old state
            s.clear()
            s.update(boot_state(usb))
            s["last_cmd_t"] = t
            self._pins(s, t)

    def plugged(self) -> bool:
        with self.board() as s:
            return s["usb"]

    # ------------------------------------------------------------- what pumpfw_core.h does
    def check_watchdog(self, now: float) -> list:
        with self.board() as s:
            return self._watchdog(s, now)

    def _watchdog(self, s: dict, now: float) -> list:
        if not s["usb"]:
            return []
        fire = s["last_cmd_t"] + s["wd_s"]
        quiet_for_real = time.time() - s.get("last_cmd_wall", 0.0) > self.min_real_silence_s
        if (s["en"] or any(s["on"])) and now > fire and quiet_for_real:
            s["en"], s["on"] = False, [False, False]
            self._pins(s, fire)
            self.emit(fire, {"k": "usb", "line": None, "reply": "! WATCHDOG"})
            return ["! WATCHDOG"]
        return []

    def command(self, line: str, now: float) -> list:
        """Lines the board sends back for one received line (an unasked watchdog line can come first)."""
        with self.board() as s:
            out = self._watchdog(s, now)
            if not s["usb"]:
                return out
            reply = self._command(s, line, now)
            if s["last_cmd_t"] == now:
                s["last_cmd_wall"] = time.time()
            self._pins(s, now)
            self.emit(now, {"k": "usb", "line": line, "reply": reply})
            return out + ([reply] if reply is not None else [])

    @staticmethod
    def _command(s: dict, line: str, now: float):
        if len(line) > CMD_MAX - 1:
            return "ERR line too long"
        s["last_cmd_t"] = now
        words = line.replace("\r", "").split(" ")
        words = [w for w in words if w]
        if not words:
            return None
        if len(words) > 3:
            return "ERR too many words"
        word, a, b = (words + [None, None, None])[:3]

        def pump(x):
            return int(x) if x in ("0", "1") else None

        if word == "PING" and a is None:
            return f"OK pumpfw {VERSION}"
        if word == "STOP" and a is None:
            s["en"], s["on"] = False, [False, False]
            return "OK"
        if word == "EN" and a in ("0", "1") and b is None:
            s["en"] = a == "1"
            return "OK"
        if word in ("ON", "OFF") and pump(a) is not None and b is None:
            p = pump(a)
            if word == "ON":
                if s["interval"][p] == 0:
                    return "ERR no rate set"
                s["on"][p] = True
            else:
                s["on"][p] = False
            return "OK"
        if word == "HZ" and pump(a) is not None and b is not None:
            try:
                hz = float(b)
            except ValueError:
                return "ERR rate out of range"
            if not hz > 0 or hz > MAX_STEP_HZ:
                return "ERR rate out of range"
            iv = 256e6 / hz + 0.5
            if iv > 4294967295.0:
                return "ERR rate out of range"
            s["interval"][pump(a)] = max(int(iv), MIN_INTERVAL)
            return f"OK {s['interval'][pump(a)]}"
        if word == "STAT" and a is None:
            on = s["on"]
            return f"OK {int(s['en'])} {int(on[0])} {int(on[1])} {s['interval'][0]} {s['interval'][1]}"
        if word == "WD" and a is not None and b is None:
            try:
                secs = int(a)
            except ValueError:
                return "ERR watchdog must be 1 to 60 s"
            if not 1 <= secs <= 60:
                return "ERR watchdog must be 1 to 60 s"
            s["wd_s"] = secs
            return "OK"
        return "ERR unknown command"
