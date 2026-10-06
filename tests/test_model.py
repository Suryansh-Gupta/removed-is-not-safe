"""Automatic checks for the model. Run from the repo root:  python -m pytest -q"""
import sys, pathlib
import numpy as np
import pandas as pd
from scipy.integrate import solve_ivp

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import chlorine_backbone as cb, cipro_model as cm, flow_reactor as fr


def test_backbone_no_negatives_and_chlorine_conserved_without_demand():
    c = dict(cb.CHLORINE, k_demand=0.0)
    y0 = [cb.mgL_Cl2_to_M(5), cb.mgN_L_to_M(0.5), 0, 0]
    s = solve_ivp(lambda t, y: cb.backbone_rates(*y[:3], 7.5, c)[0], [0, 1800], y0,
                  method="LSODA", rtol=1e-9, atol=1e-14)
    assert np.all(s.y[:3] >= -1e-12)
    total_cl = s.y[0] + s.y[2]                       # free + combined chlorine
    assert np.allclose(total_cl, total_cl[0], rtol=1e-6)


def test_cipro_mass_conserved_and_no_negatives():
    res, sol = cm.run_batch()
    assert np.all(sol.y >= -1e-14)
    assert np.allclose(sol.y[4:8].sum(axis=0), sol.y[4, 0], rtol=1e-6)
    assert res["core_remaining_pct"] > 99.9          # all products keep the quinolone core


def test_cipro_reacts_in_under_a_second_with_free_chlorine():
    res, sol = cm.run_batch(contact_min=1, n_points=601)   # 0.1 s steps
    assert sol.y[4, 10] < 1e-3 * sol.y[4, 0]          # >99.9% gone after 1 s


def test_reversion_returns_cipro():
    p = dict(cm.CIPRO, k_rev_bisulfite=1e-1)
    res, _ = cm.run_batch(p=p)
    assert res["cipro_out_ugL"] > 0.9 * res["NCL_end_ugL"]


def test_dodd_fig5a_within_20_percent():
    df = pd.read_csv(ROOT / "data/published/dodd2005_fig5a.csv")
    for (_, pH, FAC), g in df.groupby(["water", "pH", "FAC_M"]):
        t = g.time_min.to_numpy() * 60
        s = solve_ivp(cm.rates, [0, t.max()], [FAC, 0, 0, 0, 1.5e-6, 0, 0, 0], args=(pH,),
                      t_eval=t, method="LSODA", rtol=1e-9, atol=1e-18)
        pred = (s.y[4] + s.y[5]) / 1.5e-6
        meas = g.C_over_C0.to_numpy()
        keep = meas > 0.1
        assert np.mean(np.abs(pred[keep] - meas[keep]) / meas[keep]) < 0.20


def test_flow_pulse_matches_formula():
    t = np.linspace(0, 3000, 601)
    E_sim, E_exact = fr.simulate_pulse(600, 4, t), fr.rtd_tanks(t, 600, 4)
    assert np.abs(E_sim - E_exact).max() / E_exact.max() < 1e-4


def test_flow_first_order_limits():
    k, tau = 1 / 600, 600
    out1 = fr.steady_tanks(lambda y: [-k * y[0]], [1.0], tau, 1)[-1][0]
    out50 = fr.steady_tanks(lambda y: [-k * y[0]], [1.0], tau, 50)[-1][0]
    assert abs(out1 - 0.5) < 1e-6
    assert abs(out50 - (1 + 1 / 50) ** -50) < 1e-4


def test_many_tanks_equals_beaker():
    b, _ = cm.run_batch()
    f, _ = fr.run_flow(N=100)
    key = "cipro_thiosulfate_ugL"
    assert abs(f[key] - b[key]) / b[key] < 0.02


def test_tracer_fit_recovers_N():
    t = np.linspace(0, 3000, 601)
    rng = np.random.default_rng(0)
    fake = fr.rtd_tanks(t, 600, 4) * (1 + 0.03 * rng.standard_normal(t.size))
    N, tau, _ = fr.fit_tanks(t, fake)
    assert abs(N - 4) < 0.3 and abs(tau - 600) < 20


def test_full_model_beats_baselines_out_of_sample():
    import json, subprocess
    subprocess.run([sys.executable, str(ROOT / "scripts/compare_baselines.py")], check=True, capture_output=True)
    r = json.loads((ROOT / "results_baselines.json").read_text())
    for water, v in r.items():
        if water.startswith("independent"):
            continue
        errs = {k: s["mean_error_pct"] for k, s in v.items() if isinstance(s, dict)}
        full = errs.pop("full model, nothing fitted")
        assert all(full < e for e in errs.values()), (water, full, errs)


def test_kennedyneth_chlorine_use():
    import json, subprocess
    subprocess.run([sys.executable, str(ROOT / "scripts/check_kennedyneth.py")], check=True, capture_output=True)
    r = json.loads((ROOT / "results_kennedyneth.json").read_text())["model"]["pH 7.0"]
    assert abs(r["CT10"]["error_pct"]) < 5          # cipro uses 1 chlorine per molecule, instantly
    assert abs(r["CT120"]["error_pct"]) < 10        # later products take 2 Cl each (Dodd Scheme 1)
