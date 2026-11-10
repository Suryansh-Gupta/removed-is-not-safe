"""Talks to the Arduino over USB.

The Arduino (firmware/pumpfw) makes the step pulses itself, so the pump speed does not wobble when
the laptop is busy. It also has a watchdog: if this program goes quiet for WATCHDOG_S seconds (a
crash, a sleeping laptop, a pulled cable), the board stops both pumps and cuts motor power on its own.
Every command below counts as a sign of life, and the run loop polls twice a second.
"""
from __future__ import annotations

import time

from .config import BAUD, MAX_STEP_HZ, PUMPS, RAMP_S, RAMP_UPDATES, START_HZ, WATCHDOG_S

INTERVAL_UNITS_PER_S = 256e6  # the firmware counts step intervals in 1/256 microsecond


class ArduinoError(RuntimeError):
    pass


class PortBusy(ArduinoError):
    pass


def find_port() -> str:
    """The one Arduino-looking USB serial port, or a clear error."""
    from serial.tools import list_ports

    # 2341 = Arduino, 1A86 = CH340 and 0403 = FTDI chips used on Uno/Nano clones.
    known = {0x2341, 0x1A86, 0x0403, 0x2A03}
    found = [p.device for p in list_ports.comports() if p.vid in known]
    if len(found) == 1:
        return found[0]
    if not found:
        raise ArduinoError("No Arduino found on USB. Plug it in, or name the port with --port "
                           "(list them with: python3 -m serial.tools.list_ports).")
    raise ArduinoError(f"Several Arduinos found ({', '.join(found)}). Pick one with --port.")


class Arduino:
    """Same methods as FakeArduino. Opens the port exclusively, so two programs can't both drive it."""

    def __init__(self, port: str | None = None, open_serial=None, boot_s: float = 4.0):
        import serial

        port = port or find_port()
        opener = open_serial or serial.Serial
        try:
            self.ser = opener(port, BAUD, timeout=1.0, exclusive=True)
        except serial.SerialException as e:
            raise PortBusy(f"Cannot open {port}: another pumpctl command is already driving the "
                           f"pumps, or the Arduino IDE's serial monitor is open. ({e})") from None
        self.port = port
        # An Uno R3 or clone restarts when the port opens; an R4 doesn't. Wait for either to answer.
        deadline = time.monotonic() + boot_s
        while True:
            try:
                self.version = self._ask("PING", timeout=0.5)
                break
            except ArduinoError:
                if time.monotonic() > deadline:
                    self.ser.close()
                    raise ArduinoError(f"No answer from {port}. Is pumpfw uploaded (controller/"
                                       "README.md, Setting up the Arduino)?") from None
        self._ask(f"WD {WATCHDOG_S}")

    def _ask(self, line: str, timeout: float = 2.0) -> str:
        self.ser.write((line + "\n").encode())
        end = time.monotonic() + timeout
        while time.monotonic() < end:
            raw = self.ser.readline().decode(errors="replace").strip()
            if raw.startswith("OK"):
                return raw[2:].strip()
            if raw.startswith("ERR"):
                raise ArduinoError(f"Arduino refused '{line}': {raw[3:].strip()}")
            # "READY ..." after a restart and "! WATCHDOG" arrive unasked; anything else is noise.
        raise ArduinoError(f"No reply from the Arduino to '{line}'. Is its USB cable still in? "
                           "Without USB power the board is off, so the pumps have stopped.")

    def enable_motors(self) -> None:
        self._ask("EN 1")

    def disable_motors(self) -> None:
        self._ask("EN 0")

    def set_hz(self, pump: str, hz: float) -> float:
        interval = int(self._ask(f"HZ {PUMPS[pump].index} {hz:.4f}"))
        return INTERVAL_UNITS_PER_S / interval

    def pulses_on(self, pump: str) -> None:
        self._ask(f"ON {PUMPS[pump].index}")

    def pulses_off(self, pump: str) -> None:
        self._ask(f"OFF {PUMPS[pump].index}")

    def is_running(self, pump: str) -> bool:
        words = self._ask("STAT").split()
        return words[1 + PUMPS[pump].index] == "1"

    def close(self) -> None:
        try:
            self._ask("STOP")  # whatever happened before, leave the pumps off
        except Exception:
            pass
        self.ser.close()


class FakeArduino:
    """Stands in for the Arduino in tests and in --fake practice runs. Moves no motors."""

    def __init__(self):
        self.hz = {name: 0.0 for name in PUMPS}
        self.running = {name: False for name in PUMPS}
        self.motors_enabled = False
        self.closed = False

    def enable_motors(self) -> None:
        self.motors_enabled = True

    def disable_motors(self) -> None:
        self.motors_enabled = False

    def set_hz(self, pump: str, hz: float) -> float:
        self.hz[pump] = hz
        return hz

    def pulses_on(self, pump: str) -> None:
        self.running[pump] = True

    def pulses_off(self, pump: str) -> None:
        self.running[pump] = False

    def is_running(self, pump: str) -> bool:
        return self.running[pump]

    def close(self) -> None:
        self.closed = True


def start_pump(hw, pump: str, hz: float, sleep=time.sleep) -> float:
    """Start one pump, ramping up if it is fast enough to stall from a standing start."""
    if not 0 < hz <= MAX_STEP_HZ:
        raise ValueError(f"{pump}: {hz:.1f} steps/s is outside 0 to {MAX_STEP_HZ:.0f} (config.py)")
    if hz <= START_HZ:
        actual = hw.set_hz(pump, hz)
        hw.pulses_on(pump)
        return actual
    hw.set_hz(pump, START_HZ)
    hw.pulses_on(pump)
    for i in range(1, RAMP_UPDATES + 1):
        sleep(RAMP_S / RAMP_UPDATES)
        actual = hw.set_hz(pump, START_HZ + (hz - START_HZ) * i / RAMP_UPDATES)
    return actual


def ramp_steps(hz: float) -> float:
    """Steps start_pump sends before reaching hz. These move liquid too, so calibration counts them."""
    if hz <= START_HZ:
        return 0.0
    rates = (START_HZ + (hz - START_HZ) * i / RAMP_UPDATES for i in range(RAMP_UPDATES))
    return sum(rates) * RAMP_S / RAMP_UPDATES


def stop_all(hw) -> None:
    """Stop both pumps, whichever step fails, then cut motor power."""
    error = None
    for pump in PUMPS:
        try:
            hw.pulses_off(pump)
        except Exception as e:  # keep going: the other pump must still stop
            error = e
    hw.disable_motors()
    if error:
        raise error
