"""Lists the simulated Arduino while its USB cable is plugged in."""
import os
from pathlib import Path
from types import SimpleNamespace

from arduino_twin import Twin
from serial import PORT


def comports():
    if not Twin(Path(os.environ["PUMPCTL_SIM_STATE"])).plugged():
        return []
    return [SimpleNamespace(device=PORT, vid=0x2341, pid=0x0069,
                            description="Arduino UNO R4 Minima (simulated)")]
