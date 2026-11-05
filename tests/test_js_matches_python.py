"""The web explorer (web/model.js) must give the same answers as the Python model.  Needs node."""
import json, shutil, subprocess, sys, pathlib
import pytest
from scipy.integrate import solve_ivp
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ris import cipro_model as cm, flow_reactor as fr

JS = """
const R = require(process.argv[1]), p = R.DEFAULTS;
const b = { pH: 7.5, Cl_mgL: 5, NH3_mgN_L: 0, cipro_mgL: 1, contact_min: 30, after_min: 5, mode: 'free' };
console.log(JSON.stringify({
  free: R.runBatch(b, p).res.thio,
  pre: R.runBatch({ ...b, pH: 6.5, Cl_mgL: 3, NH3_mgN_L: 0.75, contact_min: 120, mode: 'preformed' }, p).res.thio,
  tog6_dca: R.runBatch({ ...b, pH: 7.0, Cl_mgL: 3, NH3_mgN_L: 0.5, mode: 'together' }, p).res.DCA_end,
  laminar: R.runLaminar(b, p).thio, tanks5: R.runFlow(b, p, 5).thio, Re: R.tube(3.175, 20, 5.3).Re,
  coil30: R.runTube({ ...b, contact_min: R.tube(3.175, 3.8, 1).tau_min }, p, 3.175, 3.8).res.thio,
  coil60: R.runTube({ ...b, contact_min: R.tube(3.175, 7.6, 1).tau_min }, p, 3.175, 7.6).res.thio,
  ex5: R.runTube({ ...b, contact_min: R.tube(3.175, 20, 5.3).tau_min }, p, 3.175, 20, 100).res.thio,
  ex50: R.runTube({ ...b, contact_min: R.tube(3.175, 20, 50).tau_min }, p, 3.175, 20, 100).res.thio }));
"""


def _batch(y0, pH, tmin):
    s = solve_ivp(cm.rates, [0, tmin * 60], y0, args=(pH,), method="LSODA", rtol=1e-9, atol=1e-18)
    ye = s.y[:, -1]
    return cm.summarize(ye, cm.apply_bisulfite(ye, pH, 5), y0[4])


@pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")
def test_js_port_matches_python_within_2_percent():
    out = subprocess.run(["node", "-e", JS, str(ROOT / "web/model.js")], capture_output=True, text=True, check=True)
    js = json.loads(out.stdout)
    py = {"free": cm.run_batch()[0]["cipro_thiosulfate_ugL"],
          "pre": _batch(cm.initial_state_preformed(3, 4, 1.0), 6.5, 120)["cipro_thiosulfate_ugL"],
          "tog6_dca": _batch(cm.initial_state(3, 0.5, 1.0), 7.0, 30)["NHCl2_end_mgL"],
          "laminar": fr.run_laminar(contact_min=30)[0]["cipro_thiosulfate_ugL"],
          "tanks5": fr.run_flow(N=5)[0]["cipro_thiosulfate_ugL"],
          "Re": fr.tube_hydraulics(3.175, 20, 5.3)["Re"]}
    for k in py:
        assert abs(js[k] - py[k]) / py[k] < 0.02, (k, js[k], py[k])
    # The page reads the coil spread from a table and uses tanks, so it gets a wider allowance than the rest.
    coil = {"coil30": (3.8, 1, 114), "coil60": (7.6, 1, 114), "ex5": (20, 5.3, 100), "ex50": (20, 50, 100)}
    for k, (length, flow, former) in coil.items():
        want = fr.run_tube(3.175, length, flow, former, n=8000)[0]["cipro_thiosulfate_ugL"]
        assert abs(js[k] - want) / want < 0.03, (k, js[k], want)
