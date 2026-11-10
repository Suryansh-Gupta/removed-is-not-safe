"""Stand-in for pyserial, used only by the simulator. The port leads to the simulated Arduino.

Opening is exclusive, as pumpctl asks of the real port: a second program gets SerialException. The
lock vanishes if the program dies, and the board keeps running until its watchdog stops it.
"""
import fcntl
import os
from collections import deque
from pathlib import Path

import simhooks
from arduino_twin import Twin

PORT = "/dev/cu.usbmodemSIM"


class SerialException(OSError):
    pass


class Serial:
    def __init__(self, port, baudrate=9600, timeout=None, exclusive=None):
        state = Path(os.environ["PUMPCTL_SIM_STATE"])
        self.twin = Twin(state)
        if port != PORT or not self.twin.plugged():
            raise SerialException(f"could not open port {port}: no such device")
        self._lock = (state / "port.lock").open("w")
        try:
            fcntl.flock(self._lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            self._lock.close()
            raise SerialException(f"Could not exclusively lock port {port}") from None
        self.timeout = timeout
        self._out = b""
        self._in = deque()

    def write(self, data: bytes) -> int:
        self._out += data
        while b"\n" in self._out:
            line, self._out = self._out.split(b"\n", 1)
            self._in.extend(self.twin.command(line.decode(), simhooks.now()))
        return len(data)

    def readline(self) -> bytes:
        if self._in:
            return (self._in.popleft() + "\r\n").encode()
        # Nothing waiting: a real read waits for the timeout. A pulled cable answers nothing.
        simhooks.sleep(self.timeout or 0)
        return b""

    def close(self) -> None:
        if self._lock is not None:
            self._lock.close()
            self._lock = None
