"""Static checks on the phone app (web/removed-is-not-safe.html): the showcase tour and the Autopilot demo label."""
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


def test_tour_steps_point_at_real_screens():
    screens = set(re.findall(r"^    (\w+): \{\n      tab:", APP, re.M))
    steps = re.findall(r"\{ screen: '(\w+)'", APP)
    assert len(steps) >= 8 and set(steps) <= screens, (steps, screens)
    assert 'id="tourbtn"' in APP and "tourStart" in APP


def test_autopilot_is_labelled_demo():
    assert '<span class="tag demo">Demo</span>' in APP


def test_tour_avoids_do_not_claim_wording():
    tour = APP[APP.index("const TOUR = ["):APP.index("function tourStart")].lower()
    for bad in ("first to consider activity", "treated water is unsafe", "zero activity means safe", "validated for all"):
        assert bad not in tour


def test_tour_plant_setting_mirrors_python():
    from ris import plant
    m = re.search(r"const PLANT_NOW = \{ dose: ([\d.]+), t: ([\d.]+) \}", APP)
    assert float(m.group(1)) == plant.SAN_JOSE["Cl_dose_mgL"] and float(m.group(2)) == plant.SAN_JOSE["contact_min"]


def test_autopilot_is_only_reached_through_the_tour():
    assert 'data-tab="auto"' not in APP and 'data-href="#auto"' not in APP        # no tab, no home button
    assert APP.count("screen: 'auto'") >= 3                                       # the tour still visits it
