"""Independent check 2: Kennedy Neth et al. 2019 supplement (ultrapure water, no fitting).
Tests chlorine used up by cipro and its products. pH not stated, so pH 6.5-8 is shown.
Usage:  python scripts/check_kennedyneth.py"""
import sys, json, pathlib
import numpy as np, pandas as pd
from scipy.integrate import solve_ivp
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import cipro_model as cm, chlorine_backbone as cb

d = pd.read_csv(ROOT / "data/published/kennedyneth2019_supp.csv").query("water == 'ultrapure'")
meas = {"CT10": d.CT_mg_min_L.iloc[0], "CT120": d.CT_mg_min_L.iloc[1], "residual120": d.residual_Cl_mgL.iloc[1]}
c = dict(cb.CHLORINE, k_demand=0.0)                     # ultrapure: no background demand
out = {"measured": meas, "model": {}}
for pH in (6.5, 7.0, 7.5, 8.0):
    y0 = [cb.mgL_Cl2_to_M(2.0), 0, 0, 0, cm.mgL_to_M(2.33), 0, 0, 0]
    s = solve_ivp(cm.rates, [0, 7200], y0, args=(pH, cm.CIPRO, c), t_eval=[600, 7200],
                  method="LSODA", rtol=1e-9, atol=1e-16)
    pred = {"CT10": s.y[3][0], "CT120": s.y[3][1], "residual120": float(cb.M_to_mgL_Cl2(s.y[0][-1]))}
    out["model"][f"pH {pH}"] = {k: {"pred": round(v, 2), "error_pct": round(100 * (v / meas[k] - 1), 1)} for k, v in pred.items()}
(ROOT / "results_kennedyneth.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))

# Fig. 2A (ultrapure): measured cipro and antibacterial potency (PEQ) vs model. Known disagreement.
f2 = pd.read_csv(ROOT / "data/published/kennedyneth2019_fig2.csv").query("water == 'ultrapure'")
t = f2.time_min.to_numpy() * 60
y0 = [cb.mgL_Cl2_to_M(2.0), 0, 0, 0, cm.mgL_to_M(2.33), 0, 0, 0]
s = solve_ivp(cm.rates, [0, t.max()], y0, args=(7.0, cm.CIPRO, c), t_eval=t, method="LSODA", rtol=1e-9, atol=1e-16)
fig2 = {"time_min": f2.time_min.tolist(), "measured_cipro": f2.cipro_C_over_C0.tolist(), "measured_PEQ": f2.PEQ.tolist(),
        "model_true_cipro": [round(max(v, 0) / y0[4], 4) for v in s.y[4]],
        "model_cipro_plus_NCL": [round((a + b) / y0[4], 3) for a, b in zip(s.y[4], s.y[5])],
        "activity_not_explained_by_cipro": [round(p - q, 2) for p, q in zip(f2.PEQ, f2.cipro_C_over_C0)],
        "verdict": "FAIL: ~30% cipro persists for 2 h in Kennedy Neth (H2O2 quench, LC-MS); Dodd-based model predicts none. Labs disagree; resolve with own HPLC + quench comparison."}
out["fig2_ultrapure"] = fig2
(ROOT / "results_kennedyneth.json").write_text(json.dumps(out, indent=2))
print(json.dumps(fig2, indent=2))
