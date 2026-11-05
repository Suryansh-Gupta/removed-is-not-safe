"""The virtual bench: everything on the table except the code.

It reads only what the code did to its pins (events.jsonl), the way a motor driver only sees its
wires, and works out what the hardware would do. It never reads pumpctl's commanded flows.

What is modelled: pulses -> motor -> rollers -> volume moved, jug levels, plug flow through the
lines and coil, the scale. What is not: single step pulses (the rate is integrated), skipped steps
at high speed, pressure, chemistry. Chemistry is in ris/ and the 3D simulator artifact.
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

# PLACEHOLDER until the real pumps are weighed: the seller lists no mL per revolution for this tube.
ML_PER_REV = {"feed": 0.20, "chlorine": 0.20}
# ESTIMATE: tube from jug through pump to the tee (m), 1/8 in ID. Measure on the built reactor.
LINE_LENGTH_M = {"feed": 1.0, "chlorine": 1.0}
# ESTIMATE: simulated fill levels. Reused 1 gal jugs, project-state.md Oct 27.
JUG_START_ML = {"feed": 3000.0, "chlorine": 500.0}
SCALE_TARE_G = 48.00  # ESTIMATE: empty beaker
COIL_BINS = 160
EVENT_LOG_MAX = 200


def seed_calibration(data_dir: Path, session: str | None = None) -> None:
    """Pretend the weighing is done, through pumpctl's own file format, with PLACEHOLDER values."""
    session = session or f"{date.today().isoformat()}-sim"
    for pump, flows in {"feed": (0.75, 1.1), "chlorine": (0.08, 0.15)}.items():
        for flow in flows:
            rpm = flow / ML_PER_REV[pump]
            hz = rpm * cfg.STEPS_PER_REV / 60
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
        chip = self.state / "sys_class_pwm" / "pwmchip0"
        for channel in (0, 1):
            folder = chip / f"pwm{channel}"
            folder.mkdir(parents=True)
            for name in ("enable", "period", "duty_cycle"):
                (folder / name).write_text("0\n")
        (self.state / "events.jsonl").touch()
        seed_calibration(self.state / "data_lab")
        self._offset = 0
        self._partial = b""
        self.vnow = 0.0
        self._write_clock(self.speed)
        self.pwm = {c: {"enable": 0, "period": 0, "duty_cycle": 0} for c in (0, 1)}
        self.gpio = {}  # BCM pin -> 0, 1, or None when released
        self.v24 = True
        self.stalled = {p: False for p in cfg.PUMPS}
        self.pumps = {p: {"rev": 0.0, "pumped": 0.0, "jug": JUG_START_ML[p]} for p in cfg.PUMPS}
        self.segments = deque()  # coil contents, inlet first: [mL, mL of cipro feed, mL of chlorine]
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

    def tick(self, until: float | None = None) -> None:
        """Advance the hardware to now, applying each pin change at the moment it happened."""
        target = self.clock() if until is None else until
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
        if e["k"] == "pwm":
            self.pwm[e["ch"]][e["file"]] = e["value"]
            pump = next(p.name for p in cfg.PUMPS.values() if p.pwm_channel == e["ch"])
            text = f"pwm{e['ch']}/{e['file']} = {e['value']}"
            self.calls.append({"seq": self.seq, "t": e["t"], "pump": pump, "text": text})
        elif e["k"] == "gpio":
            self.gpio[e["pin"]] = e["level"]
            state = {0: "LOW", 1: "HIGH", None: "released"}[e["level"]]
            self.calls.append({"seq": self.seq, "t": e["t"], "pump": "", "text": f"GPIO{e['pin']} = {state}"})

    # ---------------------------------------------------------------- hardware behaviour
    def enabled(self) -> bool:
        return self.gpio.get(cfg.ENABLE_GPIO) == 0  # active low

    def step_hz(self, pump: str) -> float:
        channel = self.pwm[cfg.PUMPS[pump].pwm_channel]
        if not channel["enable"] or channel["period"] <= 0:
            return 0.0
        return 1e9 / channel["period"]

    def direction(self, pump: str) -> int:
        return 1 if bool(self.gpio.get(cfg.PUMPS[pump].dir_gpio, 1)) == cfg.PUMPS[pump].forward_level else -1

    def motor_turning(self, pump: str) -> bool:
        return self.v24 and self.enabled() and not self.stalled[pump] and self.step_hz(pump) > 0

    def _advance(self, dt: float) -> None:
        moved = {}
        for name, p in self.pumps.items():
            if not self.motor_turning(name):
                moved[name] = 0.0
                continue
            revs = self.step_hz(name) * dt / cfg.STEPS_PER_REV * self.direction(name)
            p["rev"] += revs
            ml = revs * ML_PER_REV[name]
            ml = min(ml, p["jug"])  # an empty jug pumps air, which the Pi cannot detect
            p["jug"] -= ml
            before = p["pumped"]
            p["pumped"] += ml
            # Only liquid past the end of this line reaches the tee. Backwards running adds nothing.
            line = self.line_ml(name)
            moved[name] = max(0.0, max(p["pumped"], line) - max(before, line))
            if ml > 0:  # lines start full of water and nothing compresses: what enters, leaves
                self.scale_ml += ml
                self.out_ml += ml
        self._push_coil(moved["feed"], moved["chlorine"])

    def line_ml(self, pump: str) -> float:
        return cfg.TUBE_AREA_MM2 * LINE_LENGTH_M[pump]

    def coil_ml(self) -> float:
        return cfg.TUBE_AREA_MM2 * self.coil_m

    def _push_coil(self, feed: float, chlorine: float) -> None:
        total = feed + chlorine
        if total <= 0:
            return
        last = self.segments[0] if self.segments else None
        ratio = chlorine / total
        if last and abs(last[2] / last[0] - ratio) < 1e-3:
            last[0] += total
            last[1] += feed
            last[2] += chlorine
        else:
            self.segments.appendleft([total, feed, chlorine])
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

    def coil_profile(self) -> list:
        """Chlorine share in each bin along the coil, inlet first. None = still clean water."""
        bins = [None] * COIL_BINS
        size = self.coil_ml() / COIL_BINS
        position = 0.0
        for vol, _, chlorine in self.segments:
            ratio = chlorine / vol
            start, position = position, position + vol
            for i in range(int(start / size), min(COIL_BINS, math.ceil(position / size))):
                bins[i] = round(ratio, 4)
        return bins

    # ---------------------------------------------------------------- what the page draws
    def snapshot(self, calls_after: int = 0) -> dict:
        self.tick()
        pumps = {}
        for name, p in self.pumps.items():
            cfg_p = cfg.PUMPS[name]
            hz = self.step_hz(name)
            turning = self.motor_turning(name)
            pumps[name] = {
                "hz": hz, "turning": turning, "rpm": cfg.rpm(hz) if turning else 0.0,
                "angle": (p["rev"] % 1) * 360, "dir": self.direction(name),
                "ml_min": cfg.rpm(hz) * ML_PER_REV[name] if turning else 0.0,
                "pumped": p["pumped"], "jug": p["jug"], "jug_start": JUG_START_ML[name],
                "line_fill": min(1.0, max(0.0, p["pumped"] / self.line_ml(name))),
                "step_gpio": cfg_p.step_gpio, "dir_gpio": cfg_p.dir_gpio,
                "dir_level": self.gpio.get(cfg_p.dir_gpio), "stalled": self.stalled[name],
                "pulse_s": cfg.roller_pulse_s(hz) if hz > 0 else None,
            }
        return {
            "t": self.vnow, "speed": self.speed, "v24": self.v24,
            "en_gpio": cfg.ENABLE_GPIO, "en_level": self.gpio.get(cfg.ENABLE_GPIO),
            "enabled": self.enabled(), "pumps": pumps, "coil": self.coil_profile(),
            "coil_m": self.coil_m, "coil_ml": self.coil_ml(),
            "ports": cfg.PORT_LENGTHS_M, "out_ml": self.out_ml,
            "scale_g": round(SCALE_TARE_G + self.scale_ml, 2),
            "calls": [c for c in self.calls if c["seq"] > calls_after],
            "ml_per_rev": ML_PER_REV,
        }
