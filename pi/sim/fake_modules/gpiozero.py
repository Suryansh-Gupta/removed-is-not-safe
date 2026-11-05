"""Stand-in for the gpiozero library, used only by the simulator.

Each pin is claimed with a file lock, so a second program asking for a pin that is in use gets an
error, as on the Pi. The lock vanishes if the program dies. A killed program's pins keep their last
level, which is what pi/README.md warns about. Levels go to the event file that bench.py reads.
"""
import fcntl
import os
from pathlib import Path

import simhooks


class GPIOPinInUse(Exception):
    pass


class DigitalOutputDevice:
    def __init__(self, pin, active_high=True, initial_value=False):
        self.pin = pin
        self.active_high = active_high
        folder = Path(os.environ["PUMPCTL_SIM_STATE"]) / "gpio"
        folder.mkdir(parents=True, exist_ok=True)
        self._lock = (folder / f"{pin}.lock").open("w")
        try:
            fcntl.flock(self._lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self._lock.close()
            raise GPIOPinInUse(f"pin GPIO{pin} is already in use") from None
        self._set(bool(initial_value))

    def _set(self, value):
        self.value = value
        level = 1 if value == self.active_high else 0
        simhooks.emit({"k": "gpio", "pin": self.pin, "level": level})

    def on(self):
        self._set(True)

    def off(self):
        self._set(False)

    def close(self):
        if self._lock is not None:
            simhooks.emit({"k": "gpio", "pin": self.pin, "level": None})
            self._lock.close()
            self._lock = None
