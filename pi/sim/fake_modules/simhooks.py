"""The simulator's shared clock and event file. Used by runner.py and the fake gpiozero."""
import json
import os
import time as _time
from pathlib import Path

_real_time = _time.time
_real_sleep = _time.sleep


def state_dir() -> Path:
    return Path(os.environ["PUMPCTL_SIM_STATE"])


def now() -> float:
    """Simulated seconds. bench.py owns the clock and can change its speed at any moment."""
    for _ in range(50):
        try:
            c = json.loads((state_dir() / "clock.json").read_text())
            return c["v0"] + (_real_time() - c["r0"]) * c["speed"]
        except (OSError, ValueError):  # the file is replaced atomically, so this is very rare
            _real_sleep(0.001)
    raise RuntimeError("simulator clock is missing")


def speed() -> float:
    try:
        return json.loads((state_dir() / "clock.json").read_text())["speed"]
    except (OSError, ValueError):
        return 1.0


def sleep(seconds: float) -> None:
    """Wait for simulated seconds. Follows speed changes and pause while waiting."""
    end = now() + seconds
    while True:
        left = end - now()
        if left <= 0:
            return
        s = speed()
        _real_sleep(0.02 if s <= 0 else min(0.02, left / s))


def emit(event: dict) -> None:
    event = {"t": round(now(), 4), "pid": os.getpid(), **event}
    fd = os.open(state_dir() / "events.jsonl", os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, (json.dumps(event) + "\n").encode())
    finally:
        os.close(fd)
