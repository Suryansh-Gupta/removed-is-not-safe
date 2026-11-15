"""The Twin's protocol file (web/twin/protocol.js): sample times, undecided facts stay empty, every fact has a source.  Needs node."""
import json, pathlib, shutil, subprocess
import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

STATUSES = {"DECIDED", "PLANNED", "CONFLICT", "UNDECIDED", "NOMINAL", "UNCHECKED"}
UNDECIDED = {"vial_size_mL", "sample_volume_mL", "quench_amount"}       # PRD decision D-3


@pytest.fixture(scope="module")
def protocol():
    js = ("const P = require(process.argv[1]);"
          "console.log(JSON.stringify({ facts: P.FACTS, times: P.sampleTimes(), end: P.runLength_min(),"
          " decided: P.FACTS.filter(P.decided).map(f => f.id) }));")
    out = subprocess.run(["node", "-e", js, str(ROOT / "web/twin/protocol.js")], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def by_id(protocol):
    return {f["id"]: f for f in protocol["facts"]}


def test_sample_times(protocol):
    assert protocol["times"] == [0, 7.5, 15, 22.5, 30]
    assert protocol["end"] == 30
    assert by_id(protocol)["sample_times_min"]["value"] == [0, 7.5, 15, 22.5, 30]
    assert by_id(protocol)["n_vials"]["value"] == len(protocol["times"])


def test_undecided_facts_are_null(protocol):
    facts = by_id(protocol)
    for key in UNDECIDED:
        assert facts[key]["value"] is None, key
        assert facts[key]["status"] == "UNDECIDED", key
        assert "D-3" in facts[key]["source"], key
        assert key not in protocol["decided"]
    # and the other way round: an empty value is never passed off as decided, a filled one never as undecided
    for f in protocol["facts"]:
        assert (f["value"] is None) == (f["status"] in {"UNDECIDED", "UNCHECKED"}), f["id"]


def test_every_fact_has_a_source_and_a_status(protocol):
    ids = [f["id"] for f in protocol["facts"]]
    assert len(ids) == len(set(ids))
    for f in protocol["facts"]:
        assert isinstance(f["source"], str) and len(f["source"].strip()) >= 10, f["id"]
        assert f["status"] in STATUSES, f["id"]
        assert f["label"] and f["group"], f["id"]
        if f["status"] == "CONFLICT":
            assert f.get("note"), f["id"]


def test_reactor_and_quench_facts(protocol):
    facts = by_id(protocol)
    assert facts["beaker_volume_mL"]["value"] == 500
    assert "bisulfite" in facts["quench_agent"]["value"]
    assert facts["dpd_range_resolution"]["value"] is None and facts["dpd_range_resolution"]["status"] == "UNCHECKED"


def test_no_other_twin_file_retypes_the_sample_times():
    for name in ("sim.js", "instruments.js", "ui.js", "twin.html"):
        path = ROOT / "web/twin" / name
        if path.exists():
            assert "22.5" not in path.read_text(), f"{name} retypes a sample time; read it from TWIN_PROTOCOL"
