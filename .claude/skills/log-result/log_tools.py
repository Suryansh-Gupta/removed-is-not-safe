#!/usr/bin/env python3
"""Helpers for /log-result.

  python3 log_tools.py add "<entry text>" [--date YYYY-MM-DD] [--state PATH]
      Insert "- <date> — <entry text>" as the FIRST line under "## Decisions and results ...".

  python3 log_tools.py check "<words from an open item>" [--state PATH]
      Tick the one unchecked "- [ ]" open item that contains those words (case-insensitive).
      Fails if none or more than one match.

  python3 log_tools.py uses "<term>" ["<term>" ...] [--root PATH]
      List every place in the project that mentions the term(s): model code, web explorer,
      scripts, results, data notes, docs, hub docs, artifacts, context, project-state.
"""
import argparse, datetime as dt, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
STATE = ROOT / "project-state.md"
REPO = "code/removed-is-not-safe"
SEARCH = [f"{REPO}/ris", f"{REPO}/web", f"{REPO}/scripts", f"{REPO}/tests", f"{REPO}/pi",
          f"{REPO}/README.md", f"{REPO}/results.json", f"{REPO}/results_baselines.json",
          f"{REPO}/results_kennedyneth.json", f"{REPO}/data", f"{REPO}/predictions",
          "docs", "context", "project-state.md", "CLAUDE.md"]


def add(text, date, state):
    lines = state.read_text(encoding="utf-8").splitlines(keepends=True)
    idx = next((i for i, l in enumerate(lines) if l.startswith("## Decisions and results")), None)
    if idx is None:
        sys.exit("No '## Decisions and results' heading in " + str(state))
    j = idx + 1
    while j < len(lines) and lines[j].strip() == "":
        j += 1
    entry = f"- {date} — {text.strip()}\n"
    lines.insert(j, entry)
    state.write_text("".join(lines), encoding="utf-8")
    print(f"Added at line {j + 1}: {entry.strip()[:200]}")


def check(words, state):
    lines = state.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next((i for i, l in enumerate(lines) if l.startswith("## Open items")), None)
    if start is None:
        sys.exit("No '## Open items' heading")
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    hits = [i for i in range(start, end) if lines[i].lstrip().startswith("- [ ]")
            and words.lower() in lines[i].lower()]
    if len(hits) != 1:
        found = "\n".join(lines[i].strip()[:150] for i in hits)
        sys.exit(f"{len(hits)} unchecked open items match {words!r}; need exactly 1.\n{found}")
    lines[hits[0]] = lines[hits[0]].replace("- [ ]", "- [x]", 1)
    state.write_text("".join(lines), encoding="utf-8")
    print("Checked:", lines[hits[0]].strip()[:200])


def uses(terms, root):
    paths = [p for p in SEARCH if (root / p).exists()]
    for t in terms:
        r = subprocess.run(["grep", "-rIn", "-i", "-F", "--exclude-dir=__pycache__", "--exclude-dir=.venv",
                            "--exclude-dir=.git", "--", t, *paths], cwd=root, capture_output=True, text=True)
        hits = r.stdout.splitlines()
        print(f"\n### '{t}': {len(hits)} line(s) in {len({h.split(':', 1)[0] for h in hits})} file(s)")
        for h in hits[:200]:
            f, n, txt = h.split(":", 2)
            print(f"{f}:{n}: {txt.strip()[:160]}")
        if len(hits) > 200:
            print(f"... {len(hits) - 200} more")


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a1 = sub.add_parser("add"); a1.add_argument("text"); a1.add_argument("--date", default=dt.date.today().isoformat())
    a1.add_argument("--state", default=str(STATE))
    a2 = sub.add_parser("check"); a2.add_argument("words"); a2.add_argument("--state", default=str(STATE))
    a3 = sub.add_parser("uses"); a3.add_argument("terms", nargs="+"); a3.add_argument("--root", default=str(ROOT))
    a = ap.parse_args(argv)
    if a.cmd == "add":
        dt.date.fromisoformat(a.date)
        add(a.text, a.date, pathlib.Path(a.state))
    elif a.cmd == "check":
        check(a.words, pathlib.Path(a.state))
    else:
        uses(a.terms, pathlib.Path(a.root))


if __name__ == "__main__":
    main()
