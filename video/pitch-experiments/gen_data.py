"""Writes data.js for the pitch scenes: real model runs, published data and cipro's 2D structure.
Run from anywhere with the repo's requirements plus rdkit installed."""
import csv, json, pathlib, sys
import numpy as np
from scipy.integrate import solve_ivp
from rdkit import Chem
from rdkit.Chem import AllChem

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[1] / "code" / "removed-is-not-safe"
sys.path.insert(0, str(REPO))
from ris import chlorine_backbone as cb, cipro_model as cm

PH, CIPRO = 7.5, 1.0  # model base case, same as results.json
DOSES = [0.5, 1, 2, 5]
TIMES = [7.5, 15, 22.5, 30, 60]


def run(y0, t_min):
    s = solve_ivp(cm.rates, [0, t_min * 60], y0, args=(PH, cm.CIPRO, cb.CHLORINE), method="LSODA",
                  t_eval=[t_min * 60], rtol=1e-8, atol=1e-16)
    return s.y[:, -1]


def row(y, c0):
    cip, ncl = [max(float(v), 0) / c0 for v in y[4:6]]
    prod = max(float(y[6]) + float(y[7]), 0) / c0
    return {"cipro": cip, "ncl": ncl, "prod": prod,
            "free": float(cb.M_to_mgL_Cl2(y[0])),
            "combined": float(cb.M_to_mgL_Cl2(y[2] + 2 * y[8])), "ct": float(y[3])}


grid = {"free": {}, "chloramine": {}}
for d in DOSES:
    for t in TIMES:
        free = cm.initial_state(d, 0.0, CIPRO)
        pre = cm.initial_state_preformed(d, 4.0, CIPRO)  # 4:1 Cl2:N, research plan's middle ratio
        grid["free"][f"{d}|{t}"] = row(run(free, t), free[4])
        grid["chloramine"][f"{d}|{t}"] = row(run(pre, t), pre[4])

base = cm.initial_state(5.0, 0.0, CIPRO)
ride = []
for t in np.concatenate([[1e-3, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.25, 0.5], np.arange(1, 30.5, 1.0)]):
    r = row(run(base, float(t)), base[4])
    r["t"] = float(t)
    ride.append(r)

with (REPO / "data" / "published" / "kennedyneth2019_fig2.csv").open() as f:
    kn = [{"t": float(r["time_min"]), "drug": float(r["cipro_C_over_C0"]), "activity": float(r["PEQ"])}
          for r in csv.DictReader(f) if r["water"] == "ultrapure"]

m = Chem.MolFromSmiles("O=C(O)c1cn(C2CC2)c2cc(N3CCNCC3)c(F)cc2c1=O")  # ciprofloxacin
assert Chem.MolToInchiKey(m) == "MYSWGUAQZAJSOK-UHFFFAOYSA-N"
AllChem.Compute2DCoords(m)
Chem.Kekulize(m, clearAromaticFlags=True)
conf = m.GetConformer()
mol = {"atoms": [{"s": a.GetSymbol(), "x": conf.GetAtomPosition(a.GetIdx()).x,
                  "y": conf.GetAtomPosition(a.GetIdx()).y} for a in m.GetAtoms()],
       "bonds": [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), int(b.GetBondTypeAsDouble())] for b in m.GetBonds()]}

out = {"doses": DOSES, "times": TIMES, "grid": grid, "ride": ride, "kn": kn, "mol": mol}
(HERE / "data.js").write_text("window.DATA = " + json.dumps(out, separators=(",", ":")) + ";\n")
for k in ("5|30", "1|30", "1|7.5"):
    print(k, {a: round(b, 3) for a, b in grid["free"][k].items()})
print("chloramine 5|30", {a: round(b, 3) for a, b in grid["chloramine"]["5|30"].items()})
print("ride", [(round(r["t"], 3), round(r["cipro"], 3), round(r["ncl"], 3)) for r in ride[:12:3]])
