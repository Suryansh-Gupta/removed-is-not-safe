"""How the bench is wired, written down separately from the firmware and pumpctl/config.py.

The pins the code drives live in firmware/pumpfw/pumpfw.ino (and are listed in config.py). The wires on
the table are a separate fact, copied here from the wiring table in controller/README.md, so a wrong pin
in the code shows up as a pump that doesn't move. tests/test_pumpctl_sim.py checks this table, the
firmware, config.py and the README against each other.
"""
from __future__ import annotations

PUMP_ORDER = ("feed", "chlorine")  # firmware pump 0, pump 1
STEP = {"feed": 2, "chlorine": 3}  # Arduino digital pins
DIR = {"feed": 4, "chlorine": 5}
EN = 8
ALL_PINS = (2, 3, 4, 5, 8)
FORWARD_LEVEL = 1  # both motors as first wired. A reversed coil pair is a fault below.

# TMC2209 datasheet table: microsteps from (MS1, MS2), 1 = tied to VIO (5 V).
MICROSTEP_TABLE = {(0, 0): 8, (1, 0): 32, (0, 1): 64, (1, 1): 16}

# What the page offers. Each is one mistake that can really be made with these parts.
FAULTS = {
    "swap_step": {"label": "STEP wires swapped between the drivers",
                  "effect": "Each pump runs at the other's speed."},
    "wrong_pin": {"label": "Feed STEP wire on D6, not D2",
                  "effect": "Feed gets no pulses. The code can't tell."},
    "swap_dir": {"label": "DIR wires swapped between the drivers",
                 "effect": "No effect while both pumps run forward, so it stays hidden."},
    "reverse_chlorine": {"label": "Chlorine motor coil pair reversed",
                         "effect": "Chlorine pump runs backwards and pulls liquid out of the tee."},
    "ms2_gnd": {"label": "Chlorine driver MS2 on GND, not 5 V",
                "effect": "32 microsteps, so that pump runs at half speed."},
    "no_ground": {"label": "Arduino and driver grounds not joined",
                  "effect": "Modelled as no steps. Real behaviour is erratic and can differ."},
    "coil_loose": {"label": "Chlorine motor wire loose",
                   "effect": "Motor stops. On real hardware this can destroy the driver."},
}


def step_pin(pump: str, faults) -> int:
    """The Arduino pin feeding this driver's STEP input."""
    if "swap_step" in faults:
        pump = "chlorine" if pump == "feed" else "feed"
    pin = STEP[pump]
    if "wrong_pin" in faults and pin == STEP["feed"]:
        return 6  # a pin the firmware never drives, so nothing arrives
    return pin


def dir_pin(pump: str, faults) -> int:
    if "swap_dir" in faults:
        pump = "chlorine" if pump == "feed" else "feed"
    return DIR[pump]


def forward_level(pump: str, faults) -> int:
    return 1 - FORWARD_LEVEL if pump == "chlorine" and "reverse_chlorine" in faults else FORWARD_LEVEL


def microsteps(pump: str, faults) -> int:
    ms2 = 0 if pump == "chlorine" and "ms2_gnd" in faults else 1
    return MICROSTEP_TABLE[(1, ms2)]
