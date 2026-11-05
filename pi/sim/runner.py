"""Runs the real, unmodified pumpctl command line inside the simulator.

Nothing in pumpctl/ changes. It takes its normal hardware path (RaspberryPi, SysfsPwm), not FakePi.
Only what surrounds it is swapped, before pumpctl is imported:

  time.monotonic / time.sleep   simulated clock, so a 90 min run can play in seconds
  gpiozero                      fake_modules/gpiozero.py
  /sys/class/pwm/pwmchip0       a folder in the simulator's state directory
  data/lab, /tmp/pumpctl.lock   the same state directory, so real lab data is never touched

Usage (normally started by serve.py): PUMPCTL_SIM_STATE=<dir> python3 runner.py run --feed 0.9 ...
"""
import errno
import os
import queue  # noqa: F401  these capture the real clock before it is swapped
import subprocess  # noqa: F401
import sys
import threading  # noqa: F401
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "fake_modules"))
sys.path.insert(0, str(HERE.parent))

import simhooks  # noqa: E402

state = simhooks.state_dir()
time.monotonic = simhooks.now
time.sleep = simhooks.sleep

from pumpctl import config as cfg  # noqa: E402

cfg.PWM_CHIP = state / "sys_class_pwm" / "pwmchip0"
cfg.LOCK_FILE = state / "pumpctl.lock"
cfg.DEFAULT_DATA_DIR = state / "data_lab"

from pumpctl import hardware  # noqa: E402

real_write = hardware.SysfsPwm._write


def kernel_write(self, name, value):
    """Apply the kernel's PWM rules, then write and report it. Real pulses need a valid period."""
    period = int(value) if name == "period" else self._read("period")
    duty = int(value) if name == "duty_cycle" else self._read("duty_cycle")
    if name in ("period", "duty_cycle") and duty > period:
        raise OSError(errno.EINVAL, f"kernel rejected {name}={value}: duty {duty} > period {period}")
    if name == "enable" and int(value) == 1 and period <= 0:
        raise OSError(errno.EINVAL, "kernel rejected enable=1: no period set")
    real_write(self, name, value)
    simhooks.emit({"k": "pwm", "ch": self.channel, "file": name, "value": int(value)})


hardware.SysfsPwm._write = kernel_write

from pumpctl.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
