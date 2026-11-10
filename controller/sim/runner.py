"""Runs the real, unmodified pumpctl command line inside the simulator.

Nothing in pumpctl/ changes. It takes its normal hardware path (the Arduino class over a serial port),
not FakeArduino. Only what surrounds it is swapped, before pumpctl is imported:

  time.monotonic / time.sleep   simulated clock, so a 90 min run can play in seconds
  pyserial                      fake_modules/serial, whose port leads to the simulated Arduino
                                (arduino_twin.py, a copy of the firmware that a test keeps in step)
  data/lab                      the simulator's state directory, so real lab data is never touched

Usage (normally started by serve.py): PUMPCTL_SIM_STATE=<dir> python3 runner.py run --feed 0.9 ...
"""
import queue  # noqa: F401  these capture the real clock before it is swapped
import subprocess  # noqa: F401
import sys
import threading  # noqa: F401
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "fake_modules"))
sys.path.insert(0, str(HERE.parent))

import simhooks  # noqa: E402

state = simhooks.state_dir()
time.monotonic = simhooks.now
time.sleep = simhooks.sleep

from pumpctl import config as cfg  # noqa: E402

cfg.DEFAULT_DATA_DIR = state / "data_lab"

from pumpctl.cli import main  # noqa: E402

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
