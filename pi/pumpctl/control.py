"""What a timed reactor run does, with the clock and hardware passed in so tests can run it fast."""
from __future__ import annotations

import time
from dataclasses import dataclass

from .config import startup_wait_min
from .hardware import start_pump, stop_all

STOP_WORDS = {"q", "quit", "stop"}


@dataclass(frozen=True)
class PumpSetting:
    pump: str
    ml_min: float
    step_hz: float


def execute_run(hw, settings, minutes, coil_m, log, commands=lambda: [], say=print,
                clock=time.monotonic, sleep=time.sleep, poll_s=0.5, status_s=60.0):
    """Run the pumps for `minutes`. Returns (why it stopped, seconds run, mL commanded per pump).

    Typed lines arrive through `commands`: q/quit/stop ends the run, anything else is logged with
    its time, such as "sampled port C". The pumps always stop on the way out, including on errors.
    """
    total = sum(s.ml_min for s in settings)
    ready_s = startup_wait_min(coil_m, total) * 60
    end_s = minutes * 60
    t0 = None
    running = []
    reason = "error"
    try:
        hw.enable_motors()
        started = []
        for s in settings:
            actual = start_pump(hw, s.pump, s.step_hz, sleep=sleep)
            running.append(s.pump)
            started.append((s, actual))
        t0 = clock()
        for s, actual in started:
            log.event(0.0, "pump_start", s.pump, s.ml_min, actual)
        ready_announced = False
        next_status = status_s
        while True:
            elapsed = clock() - t0
            if elapsed >= end_s:
                reason = "time_up"
                break
            stopped = [p for p in running if not hw.is_running(p)]
            if stopped:
                reason = "stopped_externally"
                log.event(elapsed, "pump_found_stopped", ",".join(stopped))
                break
            if not ready_announced and elapsed >= ready_s:
                ready_announced = True
                log.event(elapsed, "startup_wait_over")
                say(f"[{elapsed / 60:.1f} min] Start-up wait is over. OK to sample.")
            for line in commands():
                line = line.strip()
                if line.lower() in STOP_WORDS:
                    reason = "user_stop"
                    break
                if line:
                    log.event(elapsed, "note", note=line)
                    say(f"[{elapsed / 60:.1f} min] logged: {line}")
            if reason == "user_stop":
                break
            if elapsed >= next_status:
                next_status += status_s
                say(f"[{elapsed / 60:.1f} of {minutes:g} min] running")
            sleep(poll_s)
    except KeyboardInterrupt:
        reason = "user_interrupt"
    finally:
        elapsed = clock() - t0 if t0 is not None else 0.0
        stop_all(hw)
        if t0 is not None or running:
            log.event(elapsed, "pumps_stopped", note=reason)
    volumes = {s.pump: round(s.ml_min * elapsed / 60, 3) for s in settings}
    return reason, elapsed, volumes
