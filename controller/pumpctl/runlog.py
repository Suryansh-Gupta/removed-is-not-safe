"""Run records for data/lab/reactor_runs/: <run_id>.csv (events) and <run_id>.json (the note)."""
from __future__ import annotations

import csv
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from .config import REPO_ROOT

EVENT_FIELDS = ["time_utc", "elapsed_s", "event", "pump", "ml_per_min", "step_hz", "note"]
RUN_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def clock_synced() -> str:
    """Whether the clock is network-synced: yes / no / unknown (unknown where timedatectl is missing)."""
    try:
        out = subprocess.run(["timedatectl", "show", "-p", "NTPSynchronized", "--value"],
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip() or "unknown"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


def git_commit() -> str:
    try:
        out = subprocess.run(["git", "-C", str(REPO_ROOT), "describe", "--always", "--dirty"],
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip() or "unknown"
    except (OSError, subprocess.SubprocessError):
        return "unknown"


class RunLog:
    def __init__(self, data_dir: Path, run_id: str, meta: dict):
        if not RUN_ID.match(run_id):
            raise ValueError("Run ID may only use letters, numbers, - and _")
        folder = Path(data_dir) / "reactor_runs"
        folder.mkdir(parents=True, exist_ok=True)
        self.csv_path = folder / f"{run_id}.csv"
        self.json_path = folder / f"{run_id}.json"
        if self.csv_path.exists() or self.json_path.exists():
            raise FileExistsError(f"Run {run_id} already has a log. Use a new run ID.")
        self.meta = dict(meta)
        self._file = self.csv_path.open("x", newline="")
        self._csv = csv.DictWriter(self._file, EVENT_FIELDS)
        self._csv.writeheader()
        self._flush()
        self._write_meta()

    def _flush(self) -> None:
        # Pushed to the card at every event, so a power cut loses nothing already logged.
        self._file.flush()
        os.fsync(self._file.fileno())

    def _write_meta(self) -> None:
        temp = self.json_path.with_suffix(".tmp")
        temp.write_text(json.dumps(self.meta, indent=2) + "\n")
        os.replace(temp, self.json_path)

    def event(self, elapsed_s, event, pump="", ml_per_min="", step_hz="", note="") -> None:
        self._csv.writerow({
            "time_utc": utc_now(),
            "elapsed_s": "" if elapsed_s is None else f"{elapsed_s:.1f}",
            "event": event,
            "pump": pump,
            "ml_per_min": ml_per_min,
            "step_hz": "" if step_hz == "" else f"{step_hz:.3f}",
            "note": note,
        })
        self._flush()

    def finish(self, **fields) -> None:
        self.meta.update(fields)
        self._write_meta()
        self._file.close()
