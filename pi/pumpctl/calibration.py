"""Pump calibration: weigh the water pumped at known step rates (1 g = 1 mL, project-state.md).

Rows are only ever added to data/lab/pump_calibration/calibration.csv. Flow is worked out from
the newest session for each pump, so new tubing means a new session and old rows stay as a record.
"""
from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from .config import EXTRAPOLATE_TOLERANCE

FIELDS = ["time_utc", "session", "who", "pump", "step_hz", "seconds", "mass_start_g",
          "mass_end_g", "mass_net_g", "ml_per_min", "ul_per_step", "note"]
FILENAME = Path("pump_calibration") / "calibration.csv"


class CalibrationError(Exception):
    pass


@dataclass(frozen=True)
class Curve:
    pump: str
    session: str
    points: tuple  # (step_hz, ml_per_min), sorted by step rate

    def hz_for(self, ml_min: float) -> float:
        flows = [f for _, f in self.points]
        low, high = flows[0], flows[-1]
        if not low * (1 - EXTRAPOLATE_TOLERANCE) <= ml_min <= high * (1 + EXTRAPOLATE_TOLERANCE):
            raise CalibrationError(
                f"{self.pump}: {ml_min} mL/min is outside the calibrated range {low:.3f} to "
                f"{high:.3f} mL/min (session {self.session}). Run: python3 -m pumpctl calibrate "
                f"{self.pump} --target {ml_min}"
            )
        if ml_min <= low:
            return self.points[0][0] * ml_min / low
        if ml_min >= high:
            return self.points[-1][0] * ml_min / high
        for (h0, f0), (h1, f1) in zip(self.points, self.points[1:]):
            if f0 <= ml_min <= f1:
                return h0 + (h1 - h0) * (ml_min - f0) / (f1 - f0)
        raise AssertionError("unreachable: flows are sorted")

    def estimate_hz(self, ml_min: float) -> float:
        """Rough speed for choosing the next calibration point, from the nearest point's ratio."""
        hz, flow = min(self.points, key=lambda p: abs(p[1] - ml_min))
        return hz * ml_min / flow

    def gap_to_nearest_point(self, ml_min: float) -> float:
        """How far ml_min is from the closest measured flow, as a fraction of ml_min."""
        return min(abs(f - ml_min) for _, f in self.points) / ml_min

    def session_date(self) -> date | None:
        try:
            return date.fromisoformat(self.session[:10])
        except ValueError:
            return None


def csv_path(data_dir: Path) -> Path:
    return Path(data_dir) / FILENAME


def read_rows(data_dir: Path) -> list:
    path = csv_path(data_dir)
    if not path.exists():
        return []
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def append_row(data_dir: Path, row: dict) -> None:
    path = csv_path(data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.exists()
    with path.open("a", newline="") as f:
        writer = csv.DictWriter(f, FIELDS)
        if new:
            writer.writeheader()
        writer.writerow(row)


def load_curve(data_dir: Path, pump: str) -> Curve:
    rows = [r for r in read_rows(data_dir) if r["pump"] == pump]
    if not rows:
        raise CalibrationError(f"{pump}: no calibration yet. Run: python3 -m pumpctl calibrate {pump}")
    session = rows[-1]["session"]
    by_hz = defaultdict(list)
    for r in rows:
        if r["session"] == session:
            by_hz[float(r["step_hz"])].append(float(r["ml_per_min"]))
    points = tuple(sorted((hz, sum(v) / len(v)) for hz, v in by_hz.items()))
    for (h0, f0), (h1, f1) in zip(points, points[1:]):
        if f1 <= f0:
            raise CalibrationError(
                f"{pump}: flow did not rise with speed in session {session} ({h0:.1f} steps/s = "
                f"{f0:.3f} mL/min, {h1:.1f} steps/s = {f1:.3f} mL/min). Check for leaks or air, "
                "then calibrate again under a new --session."
            )
    return Curve(pump, session, points)
