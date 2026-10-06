"""Regenerate every figure and the results summary.  Usage:  python scripts/run_all.py"""
import sys, json, pathlib
import numpy as np, pandas as pd, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.integrate import solve_ivp

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import chlorine_backbone as cb, cipro_model as cm, flow_reactor as fr

FIG, OUT = ROOT / "figures", {}
FIG.mkdir(exist_ok=True)
plt.rcParams.update({"figure.dpi": 150, "axes.grid": True, "grid.alpha": 0.3})


def save(name):
    plt.tight_layout(); plt.savefig(FIG / name); plt.close()


# 1. Chlorine backbone: ammonia and pH
fig, ax = plt.subplots(1, 2, figsize=(10, 3.8))
for nh3 in [0, 0.5, 2]:
    y0 = [cb.mgL_Cl2_to_M(5), cb.mgN_L_to_M(nh3), 0, 0]
    s = solve_ivp(lambda t, y: cb.backbone_rates(*y[:3], 7.5)[0], [0, 1800], y0, method="LSODA",
                  t_eval=np.linspace(0, 1800, 300), rtol=1e-8, atol=1e-14)
    ax[0].plot(s.t / 60, cb.M_to_mgL_Cl2(s.y[0]), label=f"free Cl, NH3 {nh3}")
    ax[0].plot(s.t / 60, cb.M_to_mgL_Cl2(s.y[2]), "--", label=f"chloramine, NH3 {nh3}")
ax[0].set(xlabel="min", ylabel="mg/L as Cl2", title="Chlorine, pH 7.5 (NH3 in mg N/L)"); ax[0].legend(fontsize=7)
pH = np.linspace(5, 10, 200)
ax[1].plot(pH, cb.speciation(pH)[0], label="HOCl fraction")
for name, frac in zip(["cipro cation", "cipro neutral", "cipro anion"], cm.cipro_fractions(pH)):
    ax[1].plot(pH, frac, "--", label=name)
ax[1].set(xlabel="pH", ylabel="fraction", title="Speciation"); ax[1].legend(fontsize=7)
save("1_chlorine_and_speciation.png")

# 2. Cipro time course (beaker, 30 min, then bisulfite)
res, sol = cm.run_batch()
OUT["base_case"] = {"conditions": "pH 7.5, 5 mg/L Cl2, no NH3, 1 mg/L cipro, 30 min, 5 min after bisulfite",
                    **{k: round(v, 2) for k, v in res.items()}}
tm = sol.t / 60
plt.figure(figsize=(7, 4))
for i, lab in [(4, "cipro"), (5, "N-chloro-cipro"), (6, "P1 (CF-Pa1)"), (7, "P2 (later products)")]:
    plt.plot(tm, cm.M_to_ugL(sol.y[i]), label=lab)
plt.plot(tm, cm.M_to_ugL(sol.y[4] + sol.y[5]), "k--", lw=1, label="'cipro' read after thiosulfate")
plt.xscale("symlog", linthresh=1); plt.xlabel("min"); plt.ylabel("µg/L cipro-equivalent")
plt.title("Cipro + 5 mg/L chlorine, pH 7.5 (all products keep the quinolone core)"); plt.legend(fontsize=7)
save("2_cipro_time_course.png")

# 3. Sensitivity
outs = ["cipro_out_ugL", "NCL_out_ugL", "P1_out_ugL"]
rows = []
for k, (lo, hi) in cm.RANGES.items():
    for v in (lo, hi):
        r, _ = cm.run_batch(p=dict(cm.CIPRO, **{k: v}))
        rows.append([k, v] + [r[o] - res[o] for o in outs])
sens = pd.DataFrame(rows, columns=["constant", "value"] + outs)
swing = sens.groupby("constant", sort=False)[outs].agg(lambda x: x.abs().max())
OUT["sensitivity_max_change_ugL"] = swing.round(1).to_dict(orient="index")
swing.plot.barh(figsize=(7, 4)); plt.xlabel("largest change in output (µg/L)")
plt.title("Which constants matter (low ↔ high value)"); save("3_sensitivity.png")

# 4. Validation vs Dodd 2005 Fig. 5a
df = pd.read_csv(ROOT / "data/published/dodd2005_fig5a.csv")
plt.figure(figsize=(7, 4)); OUT["validation_dodd_fig5a"] = {}
tt = np.linspace(0, 5400, 200)
for (w, p, F), g in df.groupby(["water", "pH", "FAC_M"], sort=False):
    pred = lambda t: (lambda s: (s.y[4] + s.y[5]) / 1.5e-6)(
        solve_ivp(cm.rates, [0, max(t)], [F, 0, 0, 0, 1.5e-6, 0, 0, 0], args=(p,), t_eval=t,
                  method="LSODA", rtol=1e-9, atol=1e-18))
    m, pr = g.C_over_C0.to_numpy(), pred(g.time_min.to_numpy() * 60)
    keep = m > 0.1
    OUT["validation_dodd_fig5a"][f"{w} pH {p}"] = {
        "mean_error_pct": round(100 * np.mean(np.abs(pr[keep] - m[keep]) / m[keep]), 1),
        "rmse": round(float(np.sqrt(np.mean((pr - m) ** 2))), 3)}
    line, = plt.plot(tt / 60, pred(tt), label=f"model, {w} pH {p}")
    plt.plot(g.time_min, m, "o", color=line.get_color(), label=f"Dodd measured, {w}")
OUT["independent_check_jasper_pH8.7"] = {"model": cm.k_frag(8.7), "jasper": 5.6e-4,
                                         "diff_pct": round(100 * (cm.k_frag(8.7) / 5.6e-4 - 1))}
plt.xlabel("min"); plt.ylabel("C/C0 (cipro + N-chloro-cipro)")
plt.title("Validation: Dodd 2005 Fig. 5a, real waters, nothing fitted\n(data pixel-estimated)")
plt.legend(fontsize=7); save("4_validation_dodd.png")

# 5. Flow: mixing and contact time
rows = []
for N in [1, 2, 5, 20, 100]:
    for ct in [10, 30, 60]:
        r, _ = fr.run_flow(N=N, contact_min=ct)
        rows.append([N, ct, r["NCL_out_ugL"], r["CT"]])
flow = pd.DataFrame(rows, columns=["N", "contact_min", "NCL_out_ugL", "CT"])
OUT["flow_NCL_leaving_ugL"] = flow.pivot(index="N", columns="contact_min", values="NCL_out_ugL").round(0).to_dict()
plt.figure(figsize=(7, 4))
for ct, g in flow.groupby("contact_min"):
    plt.plot(g.N, g.NCL_out_ugL, "o-", label=f"{ct} min contact")
plt.xscale("log"); plt.xlabel("tanks in series (1 = fully mixed, 100 ≈ ideal pipe)")
plt.ylabel("N-chloro-cipro leaving (µg/L)"); plt.title("Cipro that could return at the bisulfite step")
plt.legend(); save("5_flow_mixing.png")

# 6. Gap 2 scenarios
plt.figure(figsize=(7, 4))
krev = [0, 1e-3, 3e-3, 1e-2, 1e-1]
for ct in [10, 30, 60]:
    back = [cm.run_batch(contact_min=ct, p=dict(cm.CIPRO, k_rev_bisulfite=k))[0]["cipro_out_ugL"] for k in krev]
    plt.plot([max(k, 1e-4) for k in krev], np.array(back) / 10, "o-", label=f"{ct} min contact")
plt.xscale("log"); plt.xlabel("bisulfite reversal speed k_rev (s⁻¹; leftmost point = 0)")
plt.ylabel("% of starting cipro back after bisulfite"); plt.title("Gap 2: how much cipro could return")
plt.legend(); save("6_gap2_reversal.png")

(ROOT / "results.json").write_text(json.dumps(OUT, indent=2, default=float))
print(json.dumps(OUT, indent=2, default=float))
