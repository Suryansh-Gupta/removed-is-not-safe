"""Full model vs baselines on Dodd 2005 Fig. 5a.  Usage:  python scripts/compare_baselines.py
Fitted curve is fitted on one water and scored on the other (out-of-sample). Full model is never fitted."""
import sys, json, pathlib
import numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import cipro_model as cm, baselines as bl

df = pd.read_csv(ROOT / "data/published/dodd2005_fig5a.csv")
waters = {w: g for w, g in df.groupby("water", sort=False)}


def full(pH, FAC, t_min):
    t = np.asarray(t_min, float) * 60
    s = solve_ivp(cm.rates, [0, t.max()], [FAC, 0, 0, 0, 1.5e-6, 0, 0, 0], args=(pH,), t_eval=t,
                  method="LSODA", rtol=1e-9, atol=1e-18)
    return (s.y[4] + s.y[5]) / 1.5e-6


def score(pred, meas):
    keep = meas > 0.1
    return {"mean_error_pct": round(float(100 * np.mean(np.abs(pred[keep] - meas[keep]) / meas[keep])), 1),
            "rmse": round(float(np.sqrt(np.mean((pred - meas) ** 2))), 3)}


out, fig = {}, plt.figure(figsize=(10, 4))
for i, (w, g) in enumerate(waters.items()):
    other = [o for o in waters if o != w][0]
    k = bl.fit_curve(waters[other].time_min, waters[other].C_over_C0)
    t, m, pH, F = g.time_min.to_numpy(), g.C_over_C0.to_numpy(), g.pH.iloc[0], g.FAC_M.iloc[0]
    out[f"{w} (pH {pH})"] = {
        "full model, nothing fitted": score(full(pH, F, t), m),
        f"fitted curve, fitted on {other}": score(bl.fitted_curve(t, k), m),
        "drug-only": score(bl.drug_only(t), m),
        "fitted_k_per_s": round(k / 60, 7)}
    ax = fig.add_subplot(1, 2, i + 1); tt = np.linspace(0.01, 90, 200)
    ax.plot(t, m, "ko", label="Dodd measured")
    ax.plot(tt, full(pH, F, tt), label="full model")
    ax.plot(tt, bl.fitted_curve(tt, k), "--", label=f"fitted curve (fit on {other})")
    ax.plot(tt, bl.drug_only(tt), ":", label="drug-only")
    ax.set(title=f"{w}, pH {pH}", xlabel="min", ylabel="C/C0 (cipro + N-chloro-cipro)"); ax.grid(alpha=.3); ax.legend(fontsize=7)
plt.tight_layout(); plt.savefig(ROOT / "figures/7_baselines.png", dpi=150)

jasper = 5.6e-4
out["independent: Jasper 2016 breakdown speed, pH 8.7"] = {
    "full model": f"{cm.k_frag(8.7):.2e} s^-1 ({100 * (cm.k_frag(8.7) / jasper - 1):+.0f}%)",
    **{f"fitted curve (fit on {w})": f"{bl.fit_curve(g.time_min, g.C_over_C0) / 60:.2e} s^-1 "
       f"({100 * (bl.fit_curve(g.time_min, g.C_over_C0) / 60 / jasper - 1):+.0f}%)" for w, g in waters.items()},
    "drug-only": "no breakdown step (cannot predict)"}
(ROOT / "results_baselines.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
