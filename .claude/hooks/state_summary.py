#!/usr/bin/env python3
"""SessionStart hook: load a short summary of project-state.md into each new session.

project-state.md is ~100 KB, so instead of the whole file this prints:
  - the "Where things stand" section, each bullet cut to its first ~300 characters
  - the last 6 entries of "Decisions and results" (headline only)
  - every UNCHECKED item in "Open items and deadlines"
  - every entry in "Conflicts to resolve" (first ~250 characters)
The full file is still the source of truth; read the relevant section when a question needs detail.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
STATE = ROOT / "project-state.md"


def sections(text):
    out, name, buf = {}, None, []
    for line in text.splitlines():
        if line.startswith("## "):
            if name:
                out[name] = buf
            name, buf = line[3:].strip(), []
        elif name:
            buf.append(line)
    if name:
        out[name] = buf
    return out


def find(secs, prefix):
    for k, v in secs.items():
        if k.lower().startswith(prefix.lower()):
            return k, v
    return None, []


def cut(s, n):
    s = re.sub(r"\(?\[?https?://\S+\]?\)?", "", s).strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + " …"


def bullets(lines):
    """Join continuation lines onto their bullet."""
    items = []
    for ln in lines:
        if re.match(r"\s*([-*]|\d+\.)\s", ln):
            items.append(ln.strip())
        elif ln.strip() and items and ln.startswith("  "):
            items[-1] += " " + ln.strip()
        elif ln.strip():
            items.append(ln.strip())
    return items


def headline(item):
    m = re.match(r"-\s*(\d{4}-\d{2}-\d{2})\s*[—-]+\s*\*\*(.+?)\*\*", item)
    return f"- {m.group(1)} — {m.group(2)}" if m else cut(item, 160)


def main():
    if not STATE.exists():
        return 0
    secs = sections(STATE.read_text(encoding="utf-8"))
    parts = ["[project-state.md summary, auto-loaded at session start. Full file: project-state.md; "
             "read the relevant section before answering detailed questions.]"]

    k, v = find(secs, "Where things stand")
    if k:
        parts.append(f"\n## {k}")
        parts += [cut(b, 300) for b in bullets(v)]

    k, v = find(secs, "Decisions and results")
    if k:
        parts.append(f"\n## {k} (latest 6, headlines)")
        parts += [headline(b) for b in bullets(v) if b.startswith("-")][:6]

    k, v = find(secs, "Open items")
    if k:
        open_items = [cut(b, 260) for b in bullets(v) if b.startswith("- [ ]")]
        parts.append(f"\n## {k} (unchecked: {len(open_items)})")
        parts += open_items

    k, v = find(secs, "Conflicts to resolve")
    if k:
        parts.append(f"\n## {k}")
        parts += [cut(b, 250) for b in bullets(v) if b.startswith("-")]

    print("\n".join(parts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
