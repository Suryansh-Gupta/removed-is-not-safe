#!/usr/bin/env python3
"""PostToolUse hook: after Claude edits model or pump code, run the tests that cover it.

ris/*.py or web/model.js  -> tests/test_model.py + tests/test_js_matches_python.py (~11 s)
controller/**             -> tests/test_pumpctl.py + test_pumpctl_sim.py + test_firmware.py
web/optimizer/**, web/archive/advisor.html -> tests/test_optimizer.py (the Settings Advisor)
web/archive/twin/**             -> tests/test_twin*.py + tests/test_protocol.py (the Digital Twin)
tests/test_*.py           -> that test file

On failure it exits 2 so the failure output goes back to Claude to fix.
Uses the repo's .venv if there is one, otherwise python3 on PATH.
"""
import json, pathlib, subprocess, sys

MODEL_TESTS = ["tests/test_model.py", "tests/test_js_matches_python.py"]
PI_TESTS = ["tests/test_pumpctl.py", "tests/test_pumpctl_sim.py", "tests/test_firmware.py"]


def find_repo(path):
    for d in [path, *path.parents]:
        if (d / "ris").is_dir() and (d / "tests").is_dir():
            return d
    return None


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    fp = (data.get("tool_input") or {}).get("file_path") or (data.get("tool_input") or {}).get("notebook_path")
    if not fp:
        return 0
    path = pathlib.Path(fp).resolve()
    repo = find_repo(path.parent)
    if repo is None:
        return 0
    rel = path.relative_to(repo).as_posix()

    if (rel.startswith("ris/") and rel.endswith(".py")) or rel == "web/model.js":
        tests, model_changed = MODEL_TESTS, True
    elif rel.startswith("controller/") and rel.endswith((".py", ".js", ".h", ".ino", ".cpp")):
        tests, model_changed = PI_TESTS, False
    elif rel.startswith("web/optimizer/") or rel == "web/archive/advisor.html":
        tests, model_changed = ["tests/test_optimizer.py"], False
    elif rel.startswith("web/archive/twin/"):
        tests = sorted(t.relative_to(repo).as_posix() for t in (repo / "tests").glob("test_twin*.py"))
        tests, model_changed = tests + ["tests/test_protocol.py"], False
    elif rel.startswith("tests/test_") and rel.endswith(".py"):
        tests, model_changed = [rel], False
    else:
        return 0

    tests = [t for t in tests if (repo / t).exists()]      # app tests may not be merged or written yet
    if not tests:
        return 0

    venv = repo / ".venv" / "bin" / "python"
    py = str(venv) if venv.exists() else "python3"
    try:
        r = subprocess.run([py, "-m", "pytest", "-q", "-x", *tests], cwd=repo,
                           capture_output=True, text=True, timeout=170)
    except subprocess.TimeoutExpired:
        print(f"Tests timed out after 170 s: {' '.join(tests)}", file=sys.stderr)
        return 2
    out = (r.stdout + r.stderr).strip().splitlines()
    if r.returncode != 0:
        print(f"Tests FAILED after editing {rel} ({' '.join(tests)}):", file=sys.stderr)
        print("\n".join(out[-40:]), file=sys.stderr)
        if "No module named pytest" in r.stderr or "No module named" in r.stderr:
            print("Set up the environment: uv venv .venv && uv pip install -p .venv/bin/python -r requirements.txt",
                  file=sys.stderr)
        return 2
    msg = f"Tests passed after editing {rel}: {out[-1] if out else ''}"
    if "skipped" in (out[-1] if out else ""):
        msg += "  WARNING: some tests were SKIPPED (usually Node is not installed). A skipped test is not a pass."
    if model_changed:
        msg += ("  Reminder: the model changed. Keep ris/ and web/model.js in step, then re-run "
                "scripts/run_all.py to rebuild figures/ and results.json.")
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": msg}}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
