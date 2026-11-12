"""The settings optimizer (web/optimizer/engine.js) must agree with the model it is built on.  Needs node."""
import json, pathlib, shlex, shutil, subprocess, sys
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

JS = r"""
const O = require(process.argv[1]), R = require(process.argv[2]);
const NUM = ['dose', 't', 'ct', 'residual', 'freeResidual', 'cipro_ugL', 'ncl_ugL', 'p1_ugL', 'p2_ugL', 'activity_ugL', 'bisulfite_mgL'];
const allFinite = g => g.cells.every(row => row.every(c => NUM.every(k => Number.isFinite(c[k]))));
const slim = c => c && { dose: c.dose, t: c.t, activity_ugL: c.activity_ugL, cipro_ugL: c.cipro_ugL, ct: c.ct, pass: c.pass,
  passCT: c.passCT, passActivity: c.passActivity, passDrugOnly: c.passDrugOnly, iDose: c.iDose, iTime: c.iTime };
const strip = g => JSON.stringify(Object.assign({}, g, { ms: 0 }));
(async () => {
  const out = {};
  const defaultsBefore = JSON.stringify(R.DEFAULTS);

  // 1. cold default grid: timing, regions, picks, CSV
  const g = O.runGridSync(O.DEFAULT_INPUTS);
  out.ms = g.ms; out.counts = g.counts; out.nDose = g.doses.length; out.nTime = g.times.length;
  out.doses = g.doses; out.times = g.times;
  out.finite = allFinite(g);
  out.rec = slim(g.recommended); out.drug = slim(g.drugOnly);
  out.passList = [].concat(...g.cells).filter(c => c.pass).map(c => [c.dose, c.t]);
  out.csvLines = O.toCSV(g).trim().split('\n').length;
  out.csvCols = O.toCSV(g).trim().split('\n').map(l => l.split(',').length);
  out.csvHasNaN = /NaN|undefined|Infinity/.test(O.toCSV(g));

  // 2. async == sync (both from a cold cache)
  O.clearCache();
  const fr = []; let ticks = 0; const timer = setInterval(() => ticks++, 1);
  const ga = await O.runGrid(O.DEFAULT_INPUTS, { onProgress: f => fr.push(f) });
  clearInterval(timer);
  out.asyncSame = strip(ga) === strip(g);
  out.progress = fr; out.ticks = ticks;

  // 3. evaluate() vs RIS.runBatch at three settings (free chlorine and with ammonia)
  const settings = [
    { pH: 7.5, NH3_mgN_L: 0, cipro_ugL: 1, dose: 5, t: 30 },
    { pH: 7.0, NH3_mgN_L: 0.5, cipro_ugL: 1, dose: 2, t: 60 },
    { pH: 8.0, NH3_mgN_L: 0, cipro_ugL: 1000, dose: 12, t: 90 },
    { pH: 6.5, NH3_mgN_L: 2, cipro_ugL: 50, dose: 4, t: 20 },
  ];
  out.vsBatch = settings.map(s => {
    O.clearCache();
    const c = O.evaluate({ pH: s.pH, NH3_mgN_L: s.NH3_mgN_L, cipro_ugL: s.cipro_ugL }, s.dose, s.t);
    const r = R.runBatch({ pH: s.pH, Cl_mgL: s.dose, NH3_mgN_L: s.NH3_mgN_L, cipro_mgL: s.cipro_ugL / 1000, contact_min: s.t,
      after_min: 5, mode: s.NH3_mgN_L > 0 ? 'together' : 'free' }, R.DEFAULTS).res;
    return { s, got: [c.cipro_ugL, c.ncl_ugL, c.p1_ugL, c.p2_ugL, c.freeResidual, c.residual],
             want: [r.cipro_out, r.NCL_out, r.P1_out, r.P2_out, r.FC_end, r.FC_end + r.CC_end],
             act: c.activity_ugL, actWant: r.cipro_out + 1.0 * r.NCL_out + O.DEFAULT_INPUTS.potency.P1 * r.P1_out + O.DEFAULT_INPUTS.potency.P2 * r.P2_out,
             ctInt: O.evaluate({ pH: s.pH, NH3_mgN_L: s.NH3_mgN_L, cipro_ugL: s.cipro_ugL, ctBasis: 'integral' }, s.dose, s.t).ct, ctWant: r.CT };
  });

  // 4. grid cell vs evaluate() at the same point (evaluate integrates on its own: cache cleared first)
  out.vsCell = [[3, 2], [19, 13], [39, 23], [20, 20]].map(([i, j]) => {
    const c = g.cells[i][j]; O.clearCache();
    const e = O.evaluate(O.DEFAULT_INPUTS, c.dose, c.t);
    return { iOK: c.iDose === i && c.iTime === j, got: NUM.map(k => c[k]), want: NUM.map(k => e[k]), flags: c.pass === e.pass && c.passCT === e.passCT };
  });

  // 5. a more permissive limit never raises the recommended dose
  out.byLimit = [0.064, 0.08, 0.12, 0.3, 1].map(L => slim(O.runGridSync({ activityLimit_ugL: L }).recommended));

  // 6. nothing passes -> null
  const none = O.runGridSync({ ctTarget: 1e5 });
  out.none = { rec: none.recommended, drug: none.drugOnly, pass: none.counts.pass };
  out.noneAct = O.runGridSync({ activityLimit_ugL: 0 }).recommended;

  // 7. presets, bad inputs, helpers
  out.presets = O.PRESETS.map(p => { const pg = O.runGridSync(Object.assign({}, O.DEFAULT_INPUTS, p.inputs));
    return { id: p.id, label: p.label, note: p.note, inputs: pg.inputs, rec: slim(pg.recommended), drug: slim(pg.drugOnly), counts: pg.counts, finite: allFinite(pg) }; });
  const bad = O.runGridSync({ pH: NaN, cipro_ugL: -3, NH3_mgN_L: 'x', doseRange: [0, 0], timeRange: [500, 2], nDose: 1, nTime: 1e9,
    potency: { NCL: -1, P1: Infinity }, k_rev: -5, ctBasis: 'nonsense', activityLimit_ugL: null });
  out.bad = { finite: allFinite(bad), nDose: bad.doses.length, nTime: bad.times.length, pH: bad.inputs.pH, minDose: bad.doses[0], minTime: bad.times[0] };
  out.pHclamp = [O.runGridSync({ pH: 2, nDose: 3, nTime: 3 }).inputs.pH, O.runGridSync({ pH: 12, nDose: 3, nTime: 3 }).inputs.pH];
  const amm = O.runGridSync({ NH3_mgN_L: 1.5, nDose: 6, nTime: 6 });
  out.ammFinite = allFinite(amm);
  out.sens = O.sensitivity(O.DEFAULT_INPUTS, g.recommended);
  out.base = slim(O.evaluate(O.DEFAULT_INPUTS, g.recommended.dose, g.recommended.t));
  const tc = O.timecourse(O.DEFAULT_INPUTS, g.recommended.dose, g.recommended.t);
  out.tc = { n: tc.t_min.length, same: ['residual', 'cipro', 'ncl', 'p1', 'p2', 'activity'].every(k => tc[k].length === tc.t_min.length),
    finite: ['t_min', 'residual', 'cipro', 'ncl', 'p1', 'p2', 'activity'].every(k => tc[k].every(Number.isFinite)),
    sorted: tc.t_min.every((t, i) => i === 0 || t >= tc.t_min[i - 1]), quench: tc.quenchAt_min, tEnd: tc.t_min[tc.t_min.length - 1],
    actEnd: tc.activity[tc.activity.length - 1], resEnd: tc.residual[tc.residual.length - 1], act0: tc.activity[0], res0: tc.residual[0] };
  out.lock = O.lockCommand(O.DEFAULT_INPUTS, g.recommended);
  out.lockAmm = O.lockCommand({ NH3_mgN_L: 1.5, k_rev: 1e-3 }, { dose: 3.25, t: 42.5 });
  out.fmt = [O.fmt(10.5, 'dose'), O.fmt(105, 'time'), O.fmt(312.9, 'ct'), O.fmt(0.06371, 'ugL'), O.fmt(2.98, 'mgL'), O.fmt(NaN, 'ugL')];
  out.defaultsUntouched = JSON.stringify(R.DEFAULTS) === defaultsBefore;
  console.log(JSON.stringify(out));
})();
"""


@pytest.fixture(scope="module")
def js():
    out = subprocess.run(["node", "-e", JS, str(ROOT / "web/optimizer/engine.js"), str(ROOT / "web/model.js")],
                         capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def close(got, want, rel=0.01, floor=1e-9):
    """Within 1 %, with a small floor so two values that are both ~0 count as equal."""
    return abs(got - want) <= rel * abs(want) + floor


def test_evaluate_matches_run_batch(js):
    for case in js["vsBatch"]:
        scale = max(case["want"][:4])                       # cipro core in ug/L: floor for the ~0 entries
        for got, want in zip(case["got"], case["want"]):
            assert close(got, want, floor=1e-6 * scale), (case["s"], case["got"], case["want"])
        assert close(case["act"], case["actWant"]), case
        assert close(case["ctInt"], case["ctWant"]), case


def test_grid_cell_equals_evaluate(js):
    for c in js["vsCell"]:
        assert c["iOK"] and c["flags"]
        for got, want in zip(c["got"], c["want"]):
            assert close(got, want), c


def test_async_equals_sync_and_reports_progress(js):
    assert js["asyncSame"]
    assert len(js["progress"]) == js["nDose"] and js["progress"][-1] == 1
    assert js["progress"] == sorted(js["progress"])
    assert js["ticks"] >= 2, "runGrid never gave the event loop a turn"


def test_recommended_is_lowest_passing_dose(js):
    rec, passing = js["rec"], js["passList"]
    assert rec and rec["pass"]
    low = min(d for d, _ in passing)
    assert rec["dose"] == low
    assert rec["t"] == min(t for d, t in passing if d == low)        # ties -> shortest contact time


def test_default_map_tells_the_story(js):
    c, rec, drug = js["counts"], js["rec"], js["drug"]
    assert c["pass"] > 20 and c["failActivity"] > 20 and c["failCT"] + c["failBoth"] > 20     # all three regions
    assert sum(c.values()) == js["nDose"] * js["nTime"] == 40 * 24
    assert 0 < rec["iDose"] < js["nDose"] - 1 and 0 < rec["iTime"] < js["nTime"] - 1          # not on the edge
    # The parent-drug-only plan picks a different setting, and that setting is over the activity limit.
    assert drug and (drug["dose"], drug["t"]) != (rec["dose"], rec["t"])
    assert drug["passCT"] and drug["cipro_ugL"] <= 0.064 and not drug["passActivity"] and not drug["pass"]
    assert drug["dose"] <= rec["dose"]


def test_axes_are_tidy_and_linear(js):
    assert js["doses"] == [0.5 * i for i in range(1, 41)]
    assert js["times"] == [5 * i for i in range(1, 25)]


def test_looser_limit_never_raises_the_dose(js):
    doses = [r["dose"] for r in js["byLimit"]]
    assert all(r is not None for r in js["byLimit"])
    assert all(b <= a for a, b in zip(doses, doses[1:])), doses
    assert doses[-1] < doses[0]


def test_nothing_passes_gives_null(js):
    assert js["none"] == {"rec": None, "drug": None, "pass": 0}
    assert js["noneAct"] is None


def test_csv(js):
    assert js["csvLines"] == 1 + js["nDose"] * js["nTime"]
    assert len(set(js["csvCols"])) == 1 and not js["csvHasNaN"]


def test_no_nan_and_bad_inputs_are_clamped(js):
    assert js["finite"] and js["ammFinite"] and js["bad"]["finite"]
    assert 6 <= js["bad"]["pH"] <= 9 and js["pHclamp"] == [6, 9]
    assert 2 <= js["bad"]["nDose"] <= 80 and 2 <= js["bad"]["nTime"] <= 60
    assert js["bad"]["minDose"] > 0 and js["bad"]["minTime"] > 0
    assert js["defaultsUntouched"], "RIS.DEFAULTS was changed"


def test_presets(js):
    p = {x["id"]: x for x in js["presets"]}
    assert {"title22", "secondary", "bench"} <= set(p)
    assert all(x["finite"] and x["label"] and x["note"] for x in p.values())
    t = p["title22"]
    assert t["inputs"]["ctTarget"] == 450 and t["inputs"]["minContact_min"] == 90
    assert t["rec"] and t["rec"]["t"] >= 90 and t["rec"]["ct"] >= 450
    assert p["secondary"]["inputs"]["ctTarget"] < 450 and p["secondary"]["rec"]
    b = p["bench"]["inputs"]
    assert b["cipro_ugL"] == 1000 and b["pH"] == 7.5
    assert abs(b["activityLimit_ugL"] / b["cipro_ugL"] - 0.064 / 1.0) < 1e-12        # same fraction of influent
    assert p["bench"]["rec"] and not p["bench"]["drug"]["passActivity"]


def test_sensitivity_same_setpoint_other_assumptions(js):
    s = {x["id"]: x for x in js["sens"]}
    assert list(s) == ["rev_slow", "rev_fast", "potency_x2", "potency_half", "demand_x2"]
    base = js["base"]
    assert close(s["potency_x2"]["activity_ugL"], 2 * base["activity_ugL"])          # no parent drug left at this point
    assert close(s["potency_half"]["activity_ugL"], base["activity_ugL"] / 2)
    assert close(s["rev_slow"]["ct"], base["ct"]) and close(s["potency_x2"]["ct"], base["ct"])
    assert s["demand_x2"]["ct"] < base["ct"] and s["demand_x2"]["activity_ugL"] > base["activity_ugL"]
    assert s["rev_fast"]["activity_ugL"] >= s["rev_slow"]["activity_ugL"] >= base["activity_ugL"] - 1e-12
    assert not s["potency_x2"]["pass"] and s["potency_half"]["pass"]


def test_timecourse(js):
    tc, rec = js["tc"], js["rec"]
    assert tc["same"] and tc["finite"] and tc["sorted"] and tc["n"] > 50
    assert tc["quench"] == rec["t"] and close(tc["tEnd"], rec["t"] + 5)
    assert close(tc["actEnd"], rec["activity_ugL"]) and tc["resEnd"] == 0
    assert close(tc["act0"], 1.0) and close(tc["res0"], rec["dose"])


def test_fmt(js):
    assert js["fmt"][:5] == ["10.5", "105", "313", "0.0637", "2.98"]
    assert "NaN" not in js["fmt"][5]


def test_lock_command_runs_and_python_model_agrees(js, tmp_path):
    """The printed command must work as-is, and the Python model must predict what the claim says."""
    for cmd in (js["lock"], js["lockAmm"]):
        assert "\n" not in cmd and cmd.startswith("python scripts/lock_prediction.py ")
        argv = shlex.split(cmd)
        assert argv[3:5] == ["--kind", "batch"] and "--claim" in argv
    argv = shlex.split(js["lock"])
    out = subprocess.run([sys.executable, *argv[1:], "--out-dir", str(tmp_path), "--allow-dirty"],
                         cwd=ROOT, capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    doc = json.loads(next(tmp_path.glob("*.json")).read_text())
    assert doc["inputs"] == {"pH": 7.5, "Cl_dose_mgL": js["rec"]["dose"], "NH3_mgN_L": 0, "cipro_mgL": 0.001,
                             "contact_min": js["rec"]["t"], "after_bisulfite_min": 5}
    pr = doc["predicted"]
    activity = pr["cipro_out_ugL"] + 1.0 * pr["NCL_out_ugL"] + 0.4 * pr["P1_out_ugL"] + 0.01 * pr["P2_out_ugL"]
    assert abs(activity - js["rec"]["activity_ugL"]) / js["rec"]["activity_ugL"] < 0.02
    assert "0.0637" in doc["claim"] and "ciprofloxacin" in doc["claim"]


def test_default_grid_is_fast(js):
    assert js["ms"] < 4000, js["ms"]
