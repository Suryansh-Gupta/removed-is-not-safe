"""
Builds the coil spread table the web explorer uses, then writes it into web/model.js and
web/cipro_model_explorer.html between the COIL_TABLE markers.

Live particle runs are too slow for the page, which runs a 13-point flow sweep on every slider move. So this
runs the particle model (ris/flow_reactor.simulate_coil) once on a grid and stores the spread N. The page reads
N from the table and runs tanks-in-series, which gives the particle model's answer to within about 0.5% on the
tubes tested (tests/test_js_matches_python.py). Re-run this if the particle model changes.
"""
import json, pathlib, re, sys
import numpy as np
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import flow_reactor as fr

THETA = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 30]
S = [0, 1, 3, 10, 30, 100, 300, 1000]
N = [[round(fr.spread_stats(fr.simulate_coil(th, s, n=4000, seed=1)[:, -1])["N"], 2) for s in S] for th in THETA]
line = "const COIL_TABLE = " + json.dumps({"theta": THETA, "S": S, "N": N}, separators=(",", ":")) + ";"
for name in ("web/model.js", "web/cipro_model_explorer.html"):
    path = ROOT / name
    text = path.read_text()
    new, count = re.subn(r"(// COIL_TABLE start[^\n]*\n).*?(\s*// COIL_TABLE end)", lambda m: m.group(1) + "  " + line + m.group(2), text, flags=re.S)
    if count != 1:
        raise SystemExit(f"COIL_TABLE markers not found in {name}")
    path.write_text(new)
print(json.dumps(np.round(N, 1).tolist()))
