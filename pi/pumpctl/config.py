"""Hardware and reactor settings for the pump controller. Change them here only."""
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Pump:
    name: str
    step_gpio: int    # BCM number; must be a hardware-PWM pin
    pwm_channel: int  # GPIO12 = channel 0, GPIO13 = channel 1 (pwm-2chan overlay)
    dir_gpio: int
    forward_level: bool = True  # flip this if a pump runs backwards


PUMPS = {
    "feed": Pump("feed", step_gpio=12, pwm_channel=0, dir_gpio=23),
    "chlorine": Pump("chlorine", step_gpio=13, pwm_channel=1, dir_gpio=24),
}
ENABLE_GPIO = 5  # shared by both drivers; low = motors powered
PWM_CHIP = Path("/sys/class/pwm/pwmchip0")

# Motor and driver
FULL_STEPS_PER_REV = 200  # ESTIMATE: usual 1.8 degree stepper. Check the motor label.
MICROSTEPS = 16           # set by wiring: MS1 and MS2 both tied to 3.3 V (TMC2209 datasheet table)
ROLLERS = 8               # Kamoer KCS PLUS listing, parts list v3
STEPS_PER_REV = FULL_STEPS_PER_REV * MICROSTEPS

# Speed limits
MAX_STEP_HZ = 8000.0  # PLACEHOLDER: 150 rpm. Raise only after checking the pump's rated speed.
START_HZ = 800.0      # ESTIMATE: above this the motor is ramped up instead of started at speed
RAMP_S = 2.0
RAMP_UPDATES = 20    # speed changes during the ramp

# Coil. Tube decided Oct 16 (1/8" ID); ports and start-up rule from project-state.md / v2 plan.
TUBE_ID_MM = 3.175
TUBE_AREA_MM2 = math.pi * TUBE_ID_MM ** 2 / 4
PORT_LENGTHS_M = {"A": 0.95, "B": 1.9, "C": 2.85}
DEFAULT_COIL_M = 3.8
STARTUP_WAIT_FACTOR = 2.0  # v2 plan: wait at least 2 x contact time before sampling

# Calibration
EXTRAPOLATE_TOLERANCE = 0.05  # refuse flows more than 5% outside the calibrated range
NEAR_POINT_TOLERANCE = 0.10   # warn if a run's flow has no measured point within 10%
CAL_WARN_DAYS = 14            # ESTIMATE: tubing wears, so warn on older calibrations
SCALE_RESOLUTION_G = 0.01     # lab scale on the parts list (500 g x 0.01 g)
MIN_CAL_MASS_G = 1.0          # below this, two scale readings give more than ~1.4% error

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_DIR = REPO_ROOT / "data" / "lab"
LOCK_FILE = Path("/tmp/pumpctl.lock")


def contact_min(length_m: float, total_ml_min: float) -> float:
    """Ideal time to travel length_m of coil. 1 mm2 x 1 m = 1 mL."""
    return TUBE_AREA_MM2 * length_m / total_ml_min


def sampling_times(coil_m: float, total_ml_min: float) -> dict:
    """Contact time (min) at each port that exists on this coil, plus the outlet."""
    times = {p: contact_min(m, total_ml_min) for p, m in PORT_LENGTHS_M.items() if m < coil_m}
    times["outlet"] = contact_min(coil_m, total_ml_min)
    return times


def startup_wait_min(coil_m: float, total_ml_min: float) -> float:
    return STARTUP_WAIT_FACTOR * contact_min(coil_m, total_ml_min)


def rpm(step_hz: float) -> float:
    return step_hz * 60 / STEPS_PER_REV


def roller_pulse_s(step_hz: float) -> float:
    """Seconds between roller passes: the period of the pump's flow pulsing."""
    return 60 / (ROLLERS * rpm(step_hz))
