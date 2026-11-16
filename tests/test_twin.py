"""The Twin's vial values (web/archive/twin/sim.js) must agree with the Python model at every sample time.  Needs node."""
import json, pathlib, shutil, subprocess
import numpy as np
import pytest

from ris import cipro_model as cm

ROOT = pathlib.Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

SETTINGS = [
    {"dose_mgL": 5, "pH": 7.5, "NH3_mgN_L": 0, "cipro_ugL": 1000, "hold_min": 5},      # the planned bench run
    {"dose_mgL": 2, "pH": 7.0, "NH3_mgN_L": 0.5, "cipro_ugL": 1000, "hold_min": 0},    # with ammonia, no hold
    {"dose_mgL": 12, "pH": 8.0, "NH3_mgN_L": 0, "cipro_ugL": 500, "hold_min": 20},     # high dose, long hold
]

JS = r"""
const S = require(process.argv[1]), I = require(process.argv[2]), R = require(process.argv[3]);
const before = JSON.stringify(R.DEFAULTS);
const out = { runs: JSON.parse(process.argv[4]).map(s => {
  const r = S.run(s);
  return { s, settings: r.settings, times: r.sampleTimes_min, tEnd: r.tEnd_min,
    vials: r.vials.map(v => ({ t: v.t_min, beforeChlorine: v.beforeChlorine, at: v.atSampling, after: v.afterHold, blank: v.blank,
      dpd: I.dpd(v), hplc: I.hplc(v) })),
    at: r.sampleTimes_min.map(t => r.at(t)),
    course: r.course, mid: r.at(11.3) };
}) };
out.defaults = S.DEFAULT_SETTINGS;
out.defaultsUntouched = JSON.stringify(R.DEFAULTS) === before;
out.bad = S.validate({ dose_mgL: 'x', pH: 12, NH3_mgN_L: -1, cipro_ugL: '', hold_min: 5 });
out.badRun = S.run({ dose_mgL: NaN }).vials.every(v => Object.values(v.afterHold).every(Number.isFinite));
out.keys = [S.placeholderKeys({ NH3_mgN_L: 0 }), S.placeholderKeys({ NH3_mgN_L: 1 })];
out.keysInModel = S.placeholderKeys({ NH3_mgN_L: 1 }).every(k => k in R.DEFAULTS);
out.dpdConst = I.DPD;
out.dpdText = I.dpdReading(3.14159).text;
out.instrumentKeys = Object.keys(I);
console.log(JSON.stringify(out));
"""


@pytest.fixture(scope="module")
def js():
    out = subprocess.run(["node", "-e", JS, str(ROOT / "web/archive/twin/sim.js"), str(ROOT / "web/archive/twin/instruments.js"),
                          str(ROOT / "web/model.js"), json.dumps(SETTINGS)], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def python_vial(s, t):
    """The Python model's numbers for one vial: beaker at t, then bisulfite + hold."""
    kw = dict(pH=s["pH"], Cl_dose_mgL=s["dose_mgL"], NH3_mgN_L=s["NH3_mgN_L"], cipro_mgL=s["cipro_ugL"] / 1000)
    if t == 0:      # run_batch cannot integrate over zero time: the vial is the starting state, quenched
        y0 = np.array(cm.initial_state(kw["Cl_dose_mgL"], kw["NH3_mgN_L"], kw["cipro_mgL"]))
        return cm.summarize(y0, cm.apply_bisulfite(y0, s["pH"], s["hold_min"]), y0[4])
    return cm.run_batch(contact_min=t, after_bisulfite_min=s["hold_min"], **kw)[0]


def close(got, want, rel=0.01, floor=1e-9):
    """Within 1 %, with a small floor so two values that are both ~0 count as equal."""
    return abs(got - want) <= rel * abs(want) + floor


def test_default_settings_are_the_bench_run(js):
    assert js["defaults"] == {"dose_mgL": 5, "pH": 7.5, "NH3_mgN_L": 0, "cipro_ugL": 1000, "hold_min": 5}
    assert js["defaultsUntouched"], "TWIN_SIM changed RIS.DEFAULTS"


def test_vials_match_run_batch_within_1_percent(js):
    checked = 0
    for run in js["runs"]:
        s = run["s"]
        assert run["times"] == [0, 7.5, 15, 22.5, 30] and run["tEnd"] == 30
        C0 = s["cipro_ugL"]
        for v in run["vials"]:
            want = python_vial(s, v["t"])
            pairs = [
                (v["at"]["free_mgL"], want["FC_end_mgL"], 1e-4),
                (v["at"]["total_mgL"], want["FC_end_mgL"] + want["CC_end_mgL"], 1e-4),
                (v["at"]["cipro_ugL"], want["cipro_end_ugL"], 1e-6 * C0),
                (v["at"]["ncl_ugL"], want["NCL_end_ugL"], 1e-6 * C0),
                (v["after"]["cipro_ugL"], want["cipro_out_ugL"], 1e-6 * C0),
                (v["after"]["ncl_ugL"], want["NCL_out_ugL"], 1e-6 * C0),
                (v["after"]["p1_ugL"], want["P1_out_ugL"], 1e-6 * C0),
                (v["after"]["p2_ugL"], want["P2_out_ugL"], 1e-6 * C0),
            ]
            for got, exp, floor in pairs:
                assert close(got, exp, floor=floor), (s, v["t"], got, exp)
                checked += 1
    assert checked == len(SETTINGS) * 5 * 8


def test_blank_beaker_is_the_same_run_without_cipro(js):
    for run in js["runs"]:
        s = dict(run["s"], cipro_ugL=1e-6)          # Python needs a non-zero amount to divide by
        for v in run["vials"]:
            want = python_vial(s, v["t"])
            assert close(v["blank"]["free_mgL"], want["FC_end_mgL"], floor=1e-4), (s, v["t"])
            assert close(v["blank"]["total_mgL"], want["FC_end_mgL"] + want["CC_end_mgL"], floor=1e-4), (s, v["t"])
            assert v["blank"]["cipro_ugL"] == 0


def test_zero_minute_vial_never_met_chlorine(js):
    for run in js["runs"]:
        v0 = run["vials"][0]
        assert v0["beforeChlorine"] and not any(v["beforeChlorine"] for v in run["vials"][1:])
        assert v0["after"]["cipro_pct"] == pytest.approx(100) and v0["after"]["ncl_pct"] == 0


def test_instruments_read_from_the_vials(js):
    for run in js["runs"]:
        for v in run["vials"]:
            # HPLC: relative peak area = share of the 0 min cipro peak, after quench + hold
            assert v["hplc"]["cipro_pct"] == pytest.approx(100 * v["after"]["cipro_ugL"] / run["s"]["cipro_ugL"], rel=1e-9, abs=1e-9)
            assert v["hplc"]["ncl_pct"] == pytest.approx(100 * v["after"]["ncl_ugL"] / run["s"]["cipro_ugL"], rel=1e-9, abs=1e-9)
            assert set(v["hplc"]) == {"cipro_pct", "ncl_pct"}, "HPLC view must not carry product concentrations"
            # DPD: the blank beaker, to 2 decimals while the kit numbers are not entered
            assert v["dpd"]["free"]["text"] == f'{v["blank"]["free_mgL"]:.2f}'
            assert v["dpd"]["total"]["text"] == f'{v["blank"]["total_mgL"]:.2f}'
    assert js["dpdConst"]["range_mgL"] is None and js["dpdConst"]["resolution_mgL"] is None
    assert js["dpdConst"]["status"].startswith("UNCHECKED")
    assert js["dpdText"] == "3.14"
    assert not any("plate" in k.lower() or "bioassay" in k.lower() or "activity" in k.lower() for k in js["instrumentKeys"])


def test_scrubber_values_equal_vial_values_at_sample_times(js):
    for run in js["runs"]:
        for v, a in zip(run["vials"], run["at"]):
            for k in ("free_mgL", "total_mgL", "cipro_pct", "ncl_pct", "products_pct"):
                assert a[k] == pytest.approx(v["at"][k], rel=1e-12, abs=1e-12)
            assert a["blank_free_mgL"] == pytest.approx(v["blank"]["free_mgL"], rel=1e-12, abs=1e-12)


def test_time_course_is_complete_and_conserves_the_cipro_core(js):
    for run in js["runs"]:
        c = run["course"]
        n = len(c["t_min"])
        assert c["t_min"][0] == 0 and c["t_min"][-1] == 30 and c["t_min"] == sorted(c["t_min"])
        for k, col in c.items():
            assert len(col) == n and all(np.isfinite(col)), k
        for a, b, p in zip(c["cipro_pct"], c["ncl_pct"], c["products_pct"]):
            assert a + b + p == pytest.approx(100, abs=0.5)
        m = run["mid"]
        assert m["cipro_pct"] + m["ncl_pct"] + m["products_pct"] == pytest.approx(100, abs=0.5)


def test_invalid_input_says_what_to_change(js):
    bad = js["bad"]
    assert not bad["ok"] and set(bad["errors"]) == {"dose_mgL", "pH", "NH3_mgN_L", "cipro_ugL"}
    assert "0.01 to 100 mg/L" in bad["errors"]["dose_mgL"] and "6 to 9" in bad["errors"]["pH"]
    assert bad["settings"]["hold_min"] == 5 and bad["settings"]["pH"] == 7.5
    assert js["badRun"]


def test_placeholder_keys_are_model_constants(js):
    assert js["keys"][0] == ["k_demand", "k_rev_bisulfite"]
    assert "C_T_carbonate" in js["keys"][1]
    assert js["keysInModel"]
