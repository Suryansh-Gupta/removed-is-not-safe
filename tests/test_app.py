"""Static checks on the phone app (web/removed-is-not-safe.html): the Autopilot demo (beta) and its simulated pump."""
import pathlib, re, shutil, subprocess

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = (ROOT / "web/removed-is-not-safe.html").read_text()


def test_scripts_parse(tmp_path):
    if shutil.which("node") is None:
        pytest.skip("node not installed")
    js = tmp_path / "app.js"
    js.write_text("\n;\n".join(re.findall(r"<script>([\s\S]*?)</script>", APP)))
    out = subprocess.run(["node", "--check", str(js)], capture_output=True, text=True)
    assert out.returncode == 0, out.stderr


def test_autopilot_demo_opens_from_home_and_is_labelled_beta():
    assert 'data-tab="auto"' not in APP                                    # no bottom-bar tab
    assert """data-href="#auto">' + icoGauge() + 'Autopilot demo (beta)""" in APP
    assert 'Autopilot demo</h1><span class="tag demo">Beta</span>' in APP


def test_no_walkthrough_cards():
    assert "const TOUR" not in APP and "tourShow" not in APP


def test_connect_links_a_simulated_pump():
    assert "function pumpScan" in APP and "A.pump = true" in APP and "function pumpOff" in APP
    assert "No pump found" not in APP
    assert "Demo pump (simulated)" in APP and "No real equipment is contacted" in APP
