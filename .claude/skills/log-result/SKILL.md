---
name: log-result
description: Record something decided, built, measured or found in project-state.md (dated entry, open items, conflicts) and update everything else that uses the changed fact. Use at the end of any session where something was decided, built, measured or found, or when new information revises an old number.
argument-hint: <what was decided / built / measured / found>
---

# Log a result and update everything that uses it

Project rules (CLAUDE.md): add a dated line under "Decisions and results since the last sync"; update "Open items"; list contradictions under "Conflicts to resolve" instead of guessing; when information is new or revised, **update everything that uses it without being asked**.

What to log: `$ARGUMENTS` (if empty, sum up what this session decided, built, measured or found).

Helper: `python3 .claude/skills/log-result/log_tools.py` (run from the research folder).

## Steps

1. **Write the entry** in the same style as the existing ones: a **bold headline**, then plain-language detail with the numbers, units, sources, commit hashes and file paths. Say what is not done or not verified. Never make up a number or citation. Mark anything unchecked as such.
   ```bash
   python3 .claude/skills/log-result/log_tools.py add "**Headline.** Details …"
   ```
2. **Open items:** if this finishes one, tick it (`log_tools.py check "<words unique to that item>"`). If it creates new work, add a `- [ ]` item with owner and date by editing the file.
3. **Conflicts:** if the new fact disagrees with any project doc, add a bullet under "## Conflicts to resolve" naming both sources and stop there. Don't pick a winner; that's Suryansh's call.
4. **Propagate (only when a fact, number, constant or decision changed):**
   ```bash
   python3 .claude/skills/log-result/log_tools.py uses "<old value>" "<term>" ...
   ```
   Search for the old value and the name of the thing (e.g. `0.064`, `PNEC`, `contact time`). For each place it shows up:
   - `ris/*.py` constants (with the source in a comment) → change, and mirror in `web/model.js`; the test hook checks they still match. Then re-run `scripts/run_all.py` and commit `figures/` + `results*.json`.
   - docs, hub docs, the parts list, artifacts → update the text (published claude.ai artifacts need republishing; say so if you can't).
   - Leave `archive-*` docs and old dated log entries as they are; they're history.
   Show the user a list of each place and whether it was changed.
5. Commit and push the code repo if it changed (so Ritik can pull). The research folder's git is local; commit `project-state.md` there too.
