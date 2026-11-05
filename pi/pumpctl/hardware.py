"""Talks to the pins.

Step pulses come from the Pi's hardware PWM through the Linux kernel, not from Python, so the
pump speed does not wobble when the Pi is busy. PWM keeps running if Python dies, so a crashed
run leaves the pumps on until `python3 -m pumpctl stop` or the 24 V supply is switched off.
"""
from __future__ import annotations

import os
import time
from pathlib import Path

from .config import ENABLE_GPIO, MAX_STEP_HZ, PUMPS, PWM_CHIP, RAMP_S, RAMP_UPDATES, START_HZ


class SysfsPwm:
    """One PWM channel under /sys/class/pwm. All times in that interface are nanoseconds."""

    def __init__(self, chip: Path, channel: int, timeout_s: float = 3.0):
        self.dir = Path(chip) / f"pwm{channel}"
        self.chip = Path(chip)
        self.channel = channel
        self.timeout_s = timeout_s

    def _write(self, name: str, value: int) -> None:
        (self.dir / name).write_text(str(value))

    def _read(self, name: str) -> int:
        return int((self.dir / name).read_text().strip())

    def export(self) -> None:
        if not self.chip.exists():
            raise RuntimeError(
                f"{self.chip} not found. Add the PWM overlay to /boot/firmware/config.txt and "
                "reboot (pi/README.md, step 1)."
            )
        if not self.dir.exists():
            (self.chip / "export").write_text(str(self.channel))
        # The folder appears a moment after export, and udev then hands it to the gpio group.
        deadline = time.monotonic() + self.timeout_s
        while not os.access(self.dir / "enable", os.R_OK | os.W_OK):
            if time.monotonic() > deadline:
                raise PermissionError(
                    f"Cannot write to {self.dir}. Is this user in the gpio group? Try: sudo adduser "
                    "$USER gpio, then log out and back in."
                )
            time.sleep(0.05)

    def set_hz(self, hz: float) -> float:
        """Set the pulse rate and return the rate the kernel actually applied."""
        period = int(round(1e9 / hz))
        duty = period // 2
        # The kernel rejects duty > period at every write, so the order depends on the direction.
        if period >= self._read("duty_cycle"):
            self._write("period", period)
            self._write("duty_cycle", duty)
        else:
            self._write("duty_cycle", duty)
            self._write("period", period)
        return 1e9 / self._read("period")

    def on(self) -> None:
        self._write("enable", 1)

    def off(self) -> None:
        if self.dir.exists():
            self._write("enable", 0)

    def is_on(self) -> bool:
        return self.dir.exists() and self._read("enable") == 1


class RaspberryPi:
    def __init__(self, chip: Path = PWM_CHIP):
        from gpiozero import DigitalOutputDevice  # only exists on the Pi

        self.pwm = {name: SysfsPwm(chip, p.pwm_channel) for name, p in PUMPS.items()}
        for pwm in self.pwm.values():
            pwm.export()
            pwm.off()
        # Enable is active low: value True drives the pin low, which powers the motors.
        self.enable_pin = DigitalOutputDevice(ENABLE_GPIO, active_high=False, initial_value=False)
        self.dir_pins = {
            name: DigitalOutputDevice(p.dir_gpio, initial_value=p.forward_level)
            for name, p in PUMPS.items()
        }

    def enable_motors(self) -> None:
        self.enable_pin.on()

    def disable_motors(self) -> None:
        self.enable_pin.off()

    def set_hz(self, pump: str, hz: float) -> float:
        return self.pwm[pump].set_hz(hz)

    def pulses_on(self, pump: str) -> None:
        self.pwm[pump].on()

    def pulses_off(self, pump: str) -> None:
        self.pwm[pump].off()

    def is_running(self, pump: str) -> bool:
        return self.pwm[pump].is_on()

    def close(self) -> None:
        for pin in [self.enable_pin, *self.dir_pins.values()]:
            pin.close()


class FakePi:
    """Stands in for the Pi in tests and in --fake practice runs. Moves no motors."""

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


def emergency_stop(chip: Path = PWM_CHIP) -> None:
    """Used by the `stop` command. Needs no GPIO claim, so it works while a run holds the pins."""
    for p in PUMPS.values():
        SysfsPwm(chip, p.pwm_channel).off()
