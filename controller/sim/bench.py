"""The virtual bench: everything on the table except the code.

It reads only what the simulated Arduino did to its pins (events.jsonl), the way a motor driver only
sees its wires, and works out what the hardware would do. It never reads pumpctl's commanded flows.

What is modelled: the wires (wiring.py, with faults), pulses -> motor -> rollers -> volume moved,
skipped steps from a simple torque model, jug levels, plug flow through the lines and coil, the scale.
Each coil slice keeps its shares and age, and the page works out its chemistry from them (chem.js).
What is not: single step pulses (the rate is integrated), spread along the tube, pulsing.
"""
from __future__ import annotations

import json
import math
import os
import shutil
import sys
import time
from collections import deque
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from pumpctl import calibration as cal  # noqa: E402
from pumpctl import config as cfg  # noqa: E402
from arduino_twin import Twin  # noqa: E402
import wiring  # noqa: E402

# PLACEHOLDER until the real pumps are weighed: the seller lists no mL per revolution for this tube.
ML_PER_REV = {"feed": 0.20, "chlorine": 0.20}
# ESTIMATE: tube from jug through pump to the tee (m), 1/8 in ID. Measure on the built reactor.
LINE_LENGTH_M = {"feed": 1.0, "chlorine": 1.0}
# ESTIMATE: simulated fill levels. Reused 1 gal jugs, project-state.md Oct 27.
JUG_START_ML = {"feed": 3000.0, "chlorine": 500.0}
SCALE_TARE_G = 48.00  # ESTIMATE: empty beaker
COIL_BINS = 160
MAX_STEP_S = 5.0  # longest time step when working out the hardware (simulated seconds)
ROLLERS = 8  # Kamoer KCS PLUS listing, parts list v3
MOTOR_FULL_STEPS = 200  # ESTIMATE: usual 1.8 degree stepper. Check the motor label.

# Skipped steps. The seller gives no torque curve, so these are all PLACEHOLDERS that show the behaviour,
# not this motor's limits. Torque is a fraction of full-current holding torque, falling straight to zero
# at NO_LOAD_RPM. Back-pressure is left out: laminar flow through the 3.8 m coil at 1 mL/min needs only
# about 24 Pa (Hagen-Poiseuille), which is tiny next to squeezing the tube.
LOAD_TORQUE = 0.30    # PLACEHOLDER: what squeezing the tube takes
NO_LOAD_RPM = 400.0   # PLACEHOLDER
MAX_JUMP_RPM = 30.0   # PLACEHOLDER: largest instant speed change at full current, or the motor loses sync
EVENT_LOG_MAX = 200


def seed_calibration(data_dir: Path, session: str | None = None) -> None:
    """Pretend the weighing is done, through pumpctl's own file format, with PLACEHOLDER values."""
    session = session or f"{date.today().isoformat()}-sim"
    for pump, flows in {"feed": (0.75, 0.9, 1.1), "chlorine": (0.08, 0.1, 0.15)}.items():
        for flow in flows:
            rev_per_min = flow / ML_PER_REV[pump]
            hz = rev_per_min * cfg.STEPS_PER_REV / 60
            net = flow * 10
            cal.append_row(data_dir, {
                "time_utc": "simulated", "session": session, "who": "simulator", "pump": pump,
                "step_hz": f"{hz:.3f}", "seconds": "600.0", "mass_start_g": SCALE_TARE_G,
                "mass_end_g": SCALE_TARE_G + net, "mass_net_g": f"{net:.3f}",
                "ml_per_min": f"{flow:.4f}", "ul_per_step": f"{net * 1000 / (hz * 600):.5f}",
                "note": "PLACEHOLDER simulated point, not a measurement",
            })


class Bench:
    def __init__(self, state: Path, speed: float = 30.0, coil_m: float = cfg.DEFAULT_COIL_M):
        self.state = Path(state)
        self.speed = speed
        self.coil_m = coil_m
        self.reset()

    # ---------------------------------------------------------------- set-up
    def reset(self) -> None:
        if self.state.exists():
            shutil.rmtree(self.state)
        (self.state / "data_lab").mkdir(parents=True)
        (self.state / "events.jsonl").touch()
        seed_calibration(self.state / "data_lab")
        self._offset = 0
        self._partial = b""
        self.vnow = 0.0
        self._write_clock(self.speed)
        self.twin = Twin(self.state)
        self.pins = {}       # Arduino pin -> 0, 1, or None when the board is unpowered
        self.step_rate = {}  # Arduino STEP pin -> steps/s it is sending
        self.usb = True
        self.twin.power_on(0.0)
        self.v24 = True
        self.stalled = {p: False for p in cfg.PUMPS}
        self.pumps = {p: {"rev": 0.0, "pumped": 0.0, "jug": JUG_START_ML[p]} for p in cfg.PUMPS}
        self.faults = set()
        self.current = 1.0  # driver current as a fraction of the motor's rating
        self.sync = {p: True for p in cfg.PUMPS}
        self.last_rpm = {p: 0.0 for p in cfg.PUMPS}
        self.sent = {p: 0.0 for p in cfg.PUMPS}   # steps reaching the driver
        self.moved = {p: 0.0 for p in cfg.PUMPS}  # steps the motor really made
        self.segments = deque()  # coil, inlet first: [mL, mL of feed, mL of chlorine, simulated time in]
        self.out_ml = 0.0
        self.scale_ml = 0.0
        self.calls = deque(maxlen=EVENT_LOG_MAX)
        self.seq = 0

    def _write_clock(self, speed: float) -> None:
        temp = self.state / "clock.tmp"
        temp.write_text(json.dumps({"v0": self.vnow, "r0": time.time(), "speed": speed}))
        os.replace(temp, self.state / "clock.json")
        self._r0, self._v0, self._speed = time.time(), self.vnow, speed

    def set_speed(self, speed: float) -> None:
        self.tick()
        self.speed = speed
        self._write_clock(speed)

    def clock(self) -> float:
        return self._v0 + (time.time() - self._r0) * self._speed

    # ---------------------------------------------------------------- reading the wires
    def _read_events(self) -> list:
        with (self.state / "events.jsonl").open("rb") as f:
            f.seek(self._offset)
            data = f.read()
        self._offset += len(data)
        data = self._partial + data
        lines = data.split(b"\n")
        self._partial = lines.pop()
        return [json.loads(line) for line in lines if line]

    def set_usb(self, plugged: bool) -> None:
        """Plug or unplug the Arduino's USB cable, which is also its power."""
        self.usb = plugged
        # Stamped with the clock now, so it lands after any command the code has already sent.
        self.twin.power_on(self.clock(), usb=plugged)
        self.tick()

    def tick(self, until: float | None = None) -> None:
        """Advance the hardware to now, applying each pin change at the moment it happened."""
        target = self.clock() if until is None else until
        self.twin.check_watchdog(target)  # the board's own timer, which runs with nobody talking to it
        for e in sorted(self._read_events(), key=lambda e: e["t"]):
            if e["t"] > self.vnow:
                self._advance(e["t"] - self.vnow)
                self.vnow = e["t"]
            self._apply(e)
        if target > self.vnow:
            self._advance(target - self.vnow)
            self.vnow = target

    def _apply(self, e: dict) -> None:
        self.seq += 1
        if e["k"] == "pin":
            self.pins[e["pin"]] = e["level"]
        elif e["k"] == "step":
            self.step_rate[e["pin"]] = e["hz"]
        elif e["k"] == "usb":
            text = e["reply"] if e["line"] is None else f"> {e['line']}   < {e['reply']}"
            pump = ""
            words = (e["line"] or "").split()
            if len(words) > 1 and words[0] in ("HZ", "ON", "OFF") and words[1] in ("0", "1"):
                pump = wiring.PUMP_ORDER[int(words[1])]
            self.calls.append({"seq": self.seq, "t": e["t"], "pump": pump, "text": text})

    # ---------------------------------------------------------------- hardware behaviour
    def enabled(self) -> bool:
        return self.pins.get(wiring.EN) == 0  # active low. Unpowered board: the pull-up keeps it off.

    def pin_hz(self, pin) -> float:
        """Pulse rate on an Arduino pin. Only the pins the firmware drives as STEP carry pulses."""
        return self.step_rate.get(pin, 0.0)

    def step_hz(self, pump: str) -> float:
        """Pulses reaching this driver's STEP input."""
        if "no_ground" in self.faults:
            return 0.0
        return self.pin_hz(wiring.step_pin(pump, self.faults))

    def direction(self, pump: str) -> int:
        level = self.pins.get(wiring.dir_pin(pump, self.faults))
        level = wiring.FORWARD_LEVEL if level is None else level
        return 1 if level == wiring.forward_level(pump, self.faults) else -1

    def steps_per_rev(self, pump: str) -> int:
        return MOTOR_FULL_STEPS * wiring.microsteps(pump, self.faults)

    def asked_rpm(self, pump: str) -> float:
        return self.step_hz(pump) * 60 / self.steps_per_rev(pump)

    def powered(self, pump: str) -> bool:
        return self.v24 and self.enabled() and not (pump == "chlorine" and "coil_loose" in self.faults)

    def slip(self, pump: str) -> float:
        """Share of steps lost because the motor is too weak at this speed. Averaged, not step by step."""
        available = self.current * max(0.0, 1 - self.asked_rpm(pump) / NO_LOAD_RPM)
        return 1 - min(1.0, available / LOAD_TORQUE)

    def _update_sync(self) -> None:
        """A sudden speed rise loses sync. The motor then buzzes until the rate drops to a startable one."""
        limit = MAX_JUMP_RPM * self.current
        for name in self.pumps:
            target = self.asked_rpm(name) if self.powered(name) and not self.stalled[name] else 0.0
            if self.sync[name] and target - self.last_rpm[name] > limit:
                self.sync[name] = False
            elif not self.sync[name] and target <= limit:
                self.sync[name] = True
            self.last_rpm[name] = target if self.sync[name] else 0.0

    def motor_turning(self, pump: str) -> bool:
        return (self.powered(pump) and not self.stalled[pump] and self.sync[pump]
                and self.step_hz(pump) > 0 and self.slip(pump) < 1)

    def _advance(self, dt: float) -> None:
        self._update_sync()
        t = self.vnow
        while dt > 1e-12:
            step = min(dt, MAX_STEP_S)
            self._advance_step(step, t + step / 2)
            t += step
            dt -= step

    def _advance_step(self, dt: float, t_mid: float) -> None:
        forward, reverse = {}, 0.0
        for name, p in self.pumps.items():
            if self.powered(name):
                self.sent[name] += self.step_hz(name) * dt
            if not self.motor_turning(name):
                continue
            steps = self.step_hz(name) * dt * (1 - self.slip(name))
            self.moved[name] += steps
            revs = steps / self.steps_per_rev(name) * self.direction(name)
            p["rev"] += revs
            ml = revs * ML_PER_REV[name]
            ml = min(ml, p["jug"])  # an empty jug pumps air, which the Arduino cannot detect
            p["jug"] -= ml
            before = p["pumped"]
            p["pumped"] += ml
            if ml > 0:
                # Only liquid past the end of this line reaches the tee. Ahead of it is the line's water.
                line = self.line_ml(name)
                liquid = max(0.0, max(p["pumped"], line) - max(before, line))
                forward[name] = (liquid, ml - liquid)
            else:
                reverse -= ml  # a pump running backwards pulls this much out of the tee
        total = sum(a + b for a, b in forward.values())
        if total <= 0:
            return
        keep = max(0.0, total - reverse) / total
        feed, feed_water = forward.get("feed", (0.0, 0.0))
        chlorine, cl_water = forward.get("chlorine", (0.0, 0.0))
        self.scale_ml += total * keep  # lines start full of water and nothing compresses: what enters, leaves
        self.out_ml += total * keep
        self._push_coil(feed * keep, chlorine * keep, (feed_water + cl_water) * keep, t_mid)

    def line_ml(self, pump: str) -> float:
        return cfg.TUBE_AREA_MM2 * LINE_LENGTH_M[pump]

    def coil_ml(self) -> float:
        return cfg.TUBE_AREA_MM2 * self.coil_m

    def _push_coil(self, feed: float, chlorine: float, water: float = 0.0, t: float | None = None) -> None:
        total = feed + chlorine + water
        if total <= 0:
            return
        t = self.vnow if t is None else t
        last = self.segments[0] if self.segments else None
        if (last and last[0] < self.coil_ml() / COIL_BINS
                and abs(last[1] / last[0] - feed / total) < 1e-3
                and abs(last[2] / last[0] - chlorine / total) < 1e-3):
            last[3] = (last[3] * last[0] + t * total) / (last[0] + total)
            last[0] += total
            last[1] += feed
            last[2] += chlorine
        else:
            self.segments.appendleft([total, feed, chlorine, t])
        extra = sum(s[0] for s in self.segments) - self.coil_ml()
        while extra > 1e-12 and self.segments:
            tail = self.segments[-1]
            if tail[0] <= extra:
                extra -= tail[0]
                self.segments.pop()
            else:
                keep = (tail[0] - extra) / tail[0]
                tail[0] *= keep
                tail[1] *= keep
                tail[2] *= keep
                extra = 0

    def _bins(self) -> list:
        """The slice filling each section along the coil, inlet first. None = water from before the start."""
        bins = [None] * COIL_BINS
        size = self.coil_ml() / COIL_BINS
        position = 0.0
        for seg in self.segments:
            start, position = position, position + seg[0]
            for i in range(int(start / size), min(COIL_BINS, math.ceil(position / size))):
                bins[i] = seg
        return bins

    def coil_profile(self) -> list:
        """Chlorine share of the pumped liquid in each section. None = still only clean water."""
        def share(seg):
            if seg is None or seg[1] + seg[2] <= 1e-9:
                return None
            return round(seg[2] / (seg[1] + seg[2]), 4)
        return [share(seg) for seg in self._bins()]

    def coil_mix(self) -> list:
        """[feed share, chlorine share, age in s] per section, for the page's chemistry."""
        return [None if s is None else [round(s[1] / s[0], 4), round(s[2] / s[0], 4), round(max(0.0, self.vnow - s[3]), 1)]
                for s in self._bins()]

    def wire_table(self) -> list:
        """Each signal wire as it is now: which Arduino pin it comes from and what the driver receives."""
        rows = []
        for pump in self.pumps:
            pin = wiring.step_pin(pump, self.faults)
            rows.append({"name": f"STEP {pump}", "pin": f"D{pin}",
                         "ok": pin == wiring.STEP[pump], "live": f"{self.step_hz(pump):.1f} steps/s"})
        for pump in self.pumps:
            pin = wiring.dir_pin(pump, self.faults)
            level = self.pins.get(pin)
            rows.append({"name": f"DIR {pump}", "pin": f"D{pin}",
                         "ok": pin == wiring.DIR[pump], "live": "–" if level is None else ("HIGH" if level else "LOW")})
        level = self.pins.get(wiring.EN)
        rows.append({"name": "EN both", "pin": f"D{wiring.EN}", "ok": True,
                     "live": "off (pull-up)" if level is None else ("off (HIGH)" if level else "on (LOW)")})
        return rows

    # ---------------------------------------------------------------- what the page draws
    def snapshot(self, calls_after: int = 0) -> dict:
        self.tick()
        pumps = {}
        for name, p in self.pumps.items():
            hz = self.step_hz(name)
            turning = self.motor_turning(name)
            rpm = self.asked_rpm(name) * (1 - self.slip(name)) if turning else 0.0
            pumps[name] = {
                "hz": hz, "turning": turning, "rpm": rpm,
                "angle": (p["rev"] % 1) * 360, "dir": self.direction(name),
                "ml_min": rpm * ML_PER_REV[name] * self.direction(name),
                "pumped": p["pumped"], "jug": p["jug"], "jug_start": JUG_START_ML[name],
                "line_fill": min(1.0, max(0.0, p["pumped"] / self.line_ml(name))),
                "dir_level": self.pins.get(wiring.DIR[name]), "stalled": self.stalled[name],
                "pulse_s": 60 / (ROLLERS * rpm) if rpm > 0 else None,
                "sync": self.sync[name], "slip": self.slip(name) if hz > 0 and self.powered(name) else 0.0,
                "skipped_pct": 100 * (1 - self.moved[name] / self.sent[name]) if self.sent[name] > 0 else 0.0,
                "commanded_ml": self.sent[name] / self.steps_per_rev(name) * ML_PER_REV[name],
            }
        return {
            "t": self.vnow, "speed": self.speed, "v24": self.v24,
            "en_pin": wiring.EN, "en_level": self.pins.get(wiring.EN), "usb": self.usb,
            "enabled": self.enabled(), "pumps": pumps, "coil": self.coil_profile(), "coil_mix": self.coil_mix(),
            "coil_m": self.coil_m, "coil_ml": self.coil_ml(),
            "ports": cfg.PORT_LENGTHS_M, "out_ml": self.out_ml,
            "scale_g": round(SCALE_TARE_G + self.scale_ml, 2),
            "calls": [c for c in self.calls if c["seq"] > calls_after],
            "ml_per_rev": ML_PER_REV, "pin_hz": {pin: self.pin_hz(pin) for pin in wiring.STEP.values()},
            "faults": sorted(self.faults), "wires": self.wire_table(), "current": self.current,
        }
