#!/usr/bin/env python3
"""PreToolUse hook: committed blind-test predictions can't be changed.

A file in predictions/ that git already tracks is locked: Edit/Write on it is denied, and so is a
Bash command that names predictions/ and would change or remove files (rm, mv, sed -i, >, tee,
git rm/mv/checkout/restore, truncate, cp onto it).  New, not-yet-committed prediction files can
still be written (that's how /lock-prediction makes them).  .gitkeep is ignored.

To change a locked prediction, a person must do it by hand and say why in the commit message;
the better path is a NEW prediction file that supersedes the old one.
"""
import json, pathlib, re, subprocess, sys

DENY_MSG = ("Blocked: {what} is a committed blind-test prediction and is locked. "
            "Make a new prediction file that supersedes it (use /lock-prediction) instead of changing it. "
            "Only a person can unlock it, by hand.")


def deny(reason):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                             "permissionDecision": "deny",
                                             "permissionDecisionReason": reason}}))
    return 0


def find_repo(start):
    for d in [start, *start.parents]:
        if (d / "predictions").is_dir() and (d / "ris").is_dir():
            return d
    return None


def tracked(repo, rel):
    return subprocess.run(["git", "ls-files", "--error-unmatch", rel], cwd=repo,
                          capture_output=True).returncode == 0


def tracked_predictions(repo):
    r = subprocess.run(["git", "ls-files", "predictions"], cwd=repo, capture_output=True, text=True)
    return [f for f in r.stdout.split() if not f.endswith(".gitkeep")]


WRITE_OPS = re.compile(r"(^|[\s;&|(])(rm|mv|cp|tee|truncate|shred|unlink|dd)\s|sed\s+(-[a-zA-Z]*i|--in-place)|"
                       r"perl\s+-[a-zA-Z]*i|>|git\s+(rm|mv|checkout|restore|reset|stash|clean)")


def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    tool, ti = data.get("tool_name", ""), data.get("tool_input") or {}
    cwd = pathlib.Path(data.get("cwd") or ".").resolve()

    if tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
        fp = ti.get("file_path") or ti.get("notebook_path")
        if not fp:
            return 0
        path = pathlib.Path(fp).resolve()
        repo = find_repo(path.parent)
        if repo is None:
            return 0
        rel = path.relative_to(repo).as_posix()
        if rel.startswith("predictions/") and not rel.endswith(".gitkeep") and tracked(repo, rel):
            return deny(DENY_MSG.format(what=rel))
        return 0

    if tool == "Bash":
        cmd = ti.get("command", "")
        if "predictions" not in cmd or not WRITE_OPS.search(cmd):
            return 0
        # Find the repo: from cwd, or the repo under cwd (when Claude runs from the parent folder).
        repo = find_repo(cwd)
        if repo is None:
            for cand in cwd.glob("*/*/predictions"):
                if (cand.parent / "ris").is_dir():
                    repo = cand.parent
        if repo is None:
            return 0
        locked = tracked_predictions(repo)
        hits = [f for f in locked if pathlib.Path(f).name in cmd]
        # "predictions/" with a glob or the bare folder also touches every locked file.
        if not hits and re.search(r"predictions/?(\*|\s|$|['\"])", cmd) and locked:
            hits = locked
        if hits:
            return deny(DENY_MSG.format(what=", ".join(hits)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
