"""Local web page for the pump simulator. Standard library only.

    cd pi && python3 sim/serve.py        then open http://127.0.0.1:8765

Only pumpctl commands can be run, each as a list of arguments with no shell, and only this
computer can connect. Simulated logs go to a temporary folder, never to data/lab.
"""
from __future__ import annotations

import argparse
import json
import os
import shlex
import signal
import subprocess
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from bench import Bench  # noqa: E402

BLOCKED = {"--data-dir", "--fake"}  # the page always uses the simulated bench and its own folder


class Session:
    def __init__(self, state: Path):
        self.lock = threading.RLock()
        self.bench = Bench(state)
        self.term = []
        self.procs = []
        self.main = None

    def output(self, text: str) -> None:
        with self.lock:
            self.term.append(text)

    def _pump_output(self, proc) -> None:
        while True:
            chunk = os.read(proc.stdout.fileno(), 4096)
            if not chunk:
                break
            self.output(chunk.decode(errors="replace"))
        code = proc.wait()
        self.output(f"[exit {code}]\n" if code >= 0 else f"[killed by signal {-code}]\n")

    def run(self, line: str) -> None:
        """Start one command from the page's terminal, or pass text to the one that is asking."""
        with self.lock:
            if self.main and self.main.poll() is None:
                self.output(line + "\n")
                self.main.stdin.write(line.encode() + b"\n")
                self.main.stdin.flush()
                return
            if not line.strip():
                return
            self.output(f"$ {line}\n")
            try:
                words = shlex.split(line)
            except ValueError as e:
                self.output(f"{e}\n")
                return
            if words[:3] != ["python3", "-m", "pumpctl"]:
                self.output("Only `python3 -m pumpctl ...` commands run here.\n")
                return
            args = words[3:]
            if BLOCKED & {a.split("=")[0] for a in args}:
                self.output("The simulator sets --fake and --data-dir itself.\n")
                return
            self.main = self.spawn(args)

    def spawn(self, args):
        env = {**os.environ, "PUMPCTL_SIM_STATE": str(self.bench.state), "PYTHONUNBUFFERED": "1"}
        proc = subprocess.Popen([sys.executable, str(HERE / "runner.py"), *args], env=env,
                                stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, start_new_session=True)
        self.procs.append(proc)
        threading.Thread(target=self._pump_output, args=(proc,), daemon=True).start()
        return proc

    def action(self, name: str, value=None) -> None:
        with self.lock:
            b = self.bench
            if name == "speed":
                b.set_speed(max(0.0, min(float(value), 1200.0)))
            elif name == "stop_command":  # what a second terminal would do
                self.output("$ python3 -m pumpctl stop     (second terminal)\n")
                self.spawn(["stop"])
            elif name == "ctrl_c" and self.main and self.main.poll() is None:
                self.output("^C\n")
                self.main.send_signal(signal.SIGINT)
            elif name == "kill" and self.main and self.main.poll() is None:
                self.output("$ kill -9     (the program crashes hard)\n")
                self.main.kill()
            elif name == "v24":
                b.tick()
                b.v24 = bool(value)
                self.output(f"[bench] 24 V supply switched {'on' if value else 'off'}\n")
            elif name == "stall":
                b.tick()
                b.stalled[value] = not b.stalled[value]
                self.output(f"[bench] {value} pump {'jammed' if b.stalled[value] else 'freed'}\n")
            elif name == "coil":
                b.tick()
                b.coil_m = float(value)
                b.segments.clear()
                self.output(f"[bench] {b.coil_m:g} m coil fitted, full of clean water\n")
            elif name == "reset":
                self.stop_all_procs()
                b.reset()
                self.term.clear()
                self.main = None

    def stop_all_procs(self) -> None:
        for p in self.procs:
            if p.poll() is None:
                p.kill()
                p.wait()
        self.procs.clear()

    def run_log(self) -> list:
        folder = self.bench.state / "data_lab" / "reactor_runs"
        if not folder.exists():
            return []
        files = sorted(folder.glob("*.csv"), key=lambda f: f.stat().st_mtime)
        if not files:
            return []
        return [files[-1].name, *files[-1].read_text().splitlines()[-14:]]


SESSION = None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _allowed(self) -> bool:
        host = self.headers.get("Host", "").split(":")[0]
        return host in ("127.0.0.1", "localhost")

    def _send(self, code, body, kind="application/json"):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", kind)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self._allowed():
            return self._send(403, {"error": "local only"})
        path, _, query = self.path.partition("?")
        if path == "/":
            return self._send(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
        if path == "/state":
            params = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
            with SESSION.lock:
                snap = SESSION.bench.snapshot(int(params.get("calls", 0)))
                start = int(params.get("term", 0))
                if start > len(SESSION.term):
                    start = 0
                snap["term"] = SESSION.term[start:]
                snap["term_next"] = len(SESSION.term)
                snap["reset_term"] = start == 0
                snap["busy"] = bool(SESSION.main and SESSION.main.poll() is None)
                snap["log"] = SESSION.run_log()
            return self._send(200, snap)
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if not self._allowed() or self.headers.get("Content-Type") != "application/json":
            return self._send(403, {"error": "local JSON only"})
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        if self.path == "/command":
            SESSION.run(str(body.get("line", "")))
        elif self.path == "/action":
            SESSION.action(str(body.get("name", "")), body.get("value"))
        else:
            return self._send(404, {"error": "not found"})
        self._send(200, {"ok": True})


def main():
    global SESSION
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    folder = Path(tempfile.mkdtemp(prefix="pumpctl-sim-")) / "state"
    SESSION = Session(folder)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Pump simulator: http://127.0.0.1:{args.port}   (simulated logs: {folder})", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        SESSION.stop_all_procs()
    return 0


if __name__ == "__main__":
    sys.exit(main())
