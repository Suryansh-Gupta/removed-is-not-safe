"""Write a blind-test prediction file from the current, committed model.

Usage:
  python scripts/lock_prediction.py NAME --kind batch|flow|tube|none [--param key=value ...]
                                    [--claim "text"] [--experiment "what will be run, when"]
                                    [--out-dir predictions] [--allow-dirty]

  --kind batch  -> ris.cipro_model.run_batch(**params)
  --kind flow   -> ris.flow_reactor.run_flow(**params)
  --kind tube   -> ris.flow_reactor.run_tube(**params)   (needs tube_id_mm, tube_length_m, flow_mL_min)
  --kind none   -> no model run; the prediction is the --claim text (e.g. an activity threshold)

Writes predictions/<UTC timestamp>_<NAME>.json and prints its path.  It does NOT commit;
/lock-prediction commits and pushes it right after, so the git timestamp proves it came first.

Refuses to run if ris/ or web/model.js has uncommitted changes (the prediction must come from a
model version anyone can check out), unless --allow-dirty (then the file says so).
"""
import argparse, datetime as dt, hashlib, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


def parse_value(v):
    for f in (int, float):
        try:
            return f(v)
        except ValueError:
            pass
    return {"true": True, "false": False, "none": None}.get(v.lower(), v)


def jsonable(x):
    try:
        import numpy as np
        if isinstance(x, np.generic):
            return x.item()
        if isinstance(x, np.ndarray):
            return x.tolist()
    except ImportError:
        pass
    if isinstance(x, dict):
        return {str(k): jsonable(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [jsonable(v) for v in x]
    if isinstance(x, float):
        return round(x, 6) + 0.0  # +0.0 turns -0.0 into 0.0
    return x if isinstance(x, (int, str, bool, type(None))) else repr(x)


def model_fingerprint():
    h = hashlib.sha256()
    files = sorted((ROOT / "ris").glob("*.py")) + [ROOT / "web" / "model.js"]
    for f in files:
        if f.exists():
            h.update(f.relative_to(ROOT).as_posix().encode())
            h.update(f.read_bytes())
    return h.hexdigest()


def show(p):
    """Path relative to the repo when inside it, else absolute."""
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--kind", required=True, choices=["batch", "flow", "tube", "none"])
    ap.add_argument("--param", action="append", default=[], metavar="key=value")
    ap.add_argument("--claim", default="")
    ap.add_argument("--experiment", default="")
    ap.add_argument("--out-dir", default="predictions")
    ap.add_argument("--allow-dirty", action="store_true")
    a = ap.parse_args(argv)

    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,60}", a.name):
        sys.exit("NAME must be lowercase letters, digits, - or _ (e.g. chloramine-30min-ph75)")
    if a.kind == "none" and not a.claim:
        sys.exit("--kind none needs --claim")

    dirty = git("status", "--porcelain", "--", "ris", "web/model.js")
    if dirty and not a.allow_dirty:
        sys.exit("Model files have uncommitted changes; commit them first so the prediction "
                 "points at a real model version:\n" + dirty)

    params = {}
    for p in a.param:
        if "=" not in p:
            sys.exit(f"--param needs key=value, got {p!r}")
        k, v = p.split("=", 1)
        params[k.strip()] = parse_value(v.strip())

    result, extra = None, None
    if a.kind == "batch":
        from ris import cipro_model as cm
        result, _ = cm.run_batch(**params)
    elif a.kind == "flow":
        from ris import flow_reactor as fr
        result, _ = fr.run_flow(**params)
    elif a.kind == "tube":
        from ris import flow_reactor as fr
        result, extra = fr.run_tube(**params)

    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    doc = {
        "name": a.name,
        "written_utc": now.isoformat(),
        "kind": a.kind,
        "experiment": a.experiment,
        "claim": a.claim,
        "inputs": params,
        "predicted": jsonable(result),
        "flow_details": jsonable(extra) if extra is not None else None,
        "model": {
            "git_commit": git("rev-parse", "HEAD"),
            "uncommitted_model_changes": bool(dirty),
            "sha256_of_ris_and_model_js": model_fingerprint(),
        },
        "note": "Blind-test prediction. Locked once committed: do not edit. To revise, write a new "
                "prediction that names this one in its claim.",
    }
    out_dir = ROOT / a.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"{now.strftime('%Y-%m-%dT%H%MZ')}_{a.name}.json"
    if out.exists():
        sys.exit(f"{out} already exists")
    out.write_text(json.dumps(doc, indent=2) + "\n")
    print(show(out))


if __name__ == "__main__":
    main()
