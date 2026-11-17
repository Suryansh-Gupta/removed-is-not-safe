"""The Sources table (web/optimizer/sources.js) must cover the model and agree with the code beside it.

- every constant in RIS.DEFAULTS has a row, and no row names a constant that does not exist
- every row has a value read from the model, a status and a source
- values equal the Python model's constants (so the page shows what the model uses)
- every constant marked PLACEHOLDER / UNKNOWN in the Python source is not shown as LITERATURE
- the banner names the not-yet-measured groups while they exist
"""
import json, pathlib, shutil, subprocess

import pytest

from ris import chlorine_backbone as cb, cipro_model as cm

ROOT = pathlib.Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

JS = r"""
const RIS = require(process.argv[1]), RISOPT = require(process.argv[2]), S = require(process.argv[3]);
console.log(JSON.stringify({
  rows: S.rows(RIS, RISOPT), modelKeys: Object.keys(RIS.DEFAULTS), tableKeys: S.MODEL.map(m => m.key),
  banner: S.notMeasured(RIS, RISOPT), defaults: RISOPT.DEFAULT_INPUTS }));
"""
STATUSES = {"MEASURED", "LITERATURE", "REGULATION", "PLANT", "CALCULATED", "ESTIMATE", "EXAMPLE", "PLACEHOLDER", "UNKNOWN"}


@pytest.fixture(scope="module")
def js():
    out = subprocess.run(["node", "-e", JS, str(ROOT / "web/model.js"), str(ROOT / "web/optimizer/engine.js"),
                          str(ROOT / "web/optimizer/sources.js")], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def test_every_model_constant_has_exactly_one_row(js):
    assert sorted(js["tableKeys"]) == sorted(js["modelKeys"])


def test_rows_are_complete(js):
    for r in js["rows"]:
        assert isinstance(r.get("value"), (int, float)), r["label"]
        assert r["status"] in STATUSES, r
        assert len(r["source"]) > 8 and r["label"] and r["group"], r


def test_values_equal_the_python_model(js):
    py = {**cb.CHLORINE, **cm.CIPRO}
    by_key = {r["key"]: r["value"] for r in js["rows"] if "key" in r}
    for k, v in py.items():
        assert by_key[k] == pytest.approx(v, rel=1e-9), k


def test_unmeasured_constants_are_not_shown_as_literature(js):
    """A constant whose Python comment says PLACEHOLDER, UNKNOWN, ESTIMATE or ASSUMPTION must not read LITERATURE."""
    text = (ROOT / "ris/chlorine_backbone.py").read_text() + (ROOT / "ris/cipro_model.py").read_text()
    lines = text.splitlines()
    status = {r["key"]: r["status"] for r in js["rows"] if "key" in r}
    for k in status:
        idx = next(i for i, ln in enumerate(lines) if ln.strip().startswith(f'"{k}":'))
        # the comment on the line itself, plus the comment block directly above it
        block, j = [lines[idx]], idx - 1
        while j >= 0 and lines[j].strip().startswith("#"):
            block.append(lines[j]); j -= 1
        flagged = any(w in " ".join(block) for w in ("PLACEHOLDER", "UNKNOWN", "ESTIMATE", "ASSUMPTION", "ASSUMES"))
        if flagged:
            assert status[k] in {"PLACEHOLDER", "UNKNOWN", "ESTIMATE"}, (k, status[k])


def test_engine_placeholders_are_flagged(js):
    status = {tuple(r["path"]): r["status"] for r in js["rows"] if "path" in r and "preset" not in r}
    for p in (("potency", "NCL"), ("potency", "P1"), ("potency", "P2")):
        assert status[p] == "PLACEHOLDER"
    assert status[("ctTarget",)] == "EXAMPLE"


def test_banner_names_what_is_not_measured(js):
    assert js["banner"] == ["chlorine decay rate", "bisulfite reversal speed", "product potencies"]
