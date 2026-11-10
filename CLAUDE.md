# Research-Synopsys — "Removed Is Not Safe"

Science fair research project with partner **Ritik Shenoy**: when a wastewater plant chlorinates water containing ciprofloxacin (cipro) and then dechlorinates with sodium bisulfite, does antibacterial activity survive, and can a chemistry model find plant settings that keep it low? Path: **Synopsys Santa Clara (Mar 2027) → CSEF → ISEF 2027**; also considering Genius Olympiad. Earlier this project was about advanced oxidation (persulfate/iron reactor, sulfamethoxazole); it switched to chlorination in Oct 2026. Old AOP docs are kept in `docs/` as `archive-*`.

## How to work with me (Suryansh)

- **I direct every research decision. You handle the code and implementation**, run analyses, and draft text. When something is a scientific judgment call, lay out the options and let me choose.
- **Before answering anything about this project, read `project-state.md`.** Treat it as newer than every other doc.
- Before ending a session where something was decided, built, measured or found, add a dated line under "Decisions and results since the last sync" in `project-state.md`, and update "Open items" if one was done.
- If something you learn contradicts a project doc, list it under "Conflicts to resolve" in `project-state.md` instead of guessing.
- **Whenever new information comes in or old information is revised, update everything that uses it automatically, without being asked:** model code, data, figures, results, the web explorer, docs.
- Never fabricate citations or numbers. Check every citation against the primary source (a fabricated-citation problem was caught in the Bay Area pharma project; don't repeat it). Placeholders in code are labelled `PLACEHOLDER`, `ESTIMATE` or `UNKNOWN`.
- Keep explanations in plain language.

## The code: `code/removed-is-not-safe/` (GitHub: Suryansh-Gupta/removed-is-not-safe)

```bash
cd code/removed-is-not-safe
git pull                       # always pull first
pip install -r requirements.txt
python -m pytest -q            # all checks should pass
python scripts/run_all.py      # rebuilds figures/ and results.json
```

- `ris/chlorine_backbone.py` chlorine chemistry (HOCl/OCl⁻, chloramines incl. dichloramine, demand, CT) · `ris/cipro_model.py` cipro reactions with Dodd 2005 constants, `run_batch()` · `ris/flow_reactor.py` tanks-in-series and coil particle models of the contact chamber, tube hydraulics, `run_flow()`, `run_tube()` · `ris/baselines.py` drug-only and fitted-curve baselines.
- **Constants live only in `ris/*.py`**, each with its source in a comment. Change them there, then re-run `scripts/run_all.py`.
- `web/` interactive explorer with a JS port of the model; `tests/test_js_matches_python.py` keeps them in sync — update both when the model changes.
- `pi/` Raspberry Pi 4 pump controller (`pumpctl`); wiring, setup and commands in `pi/README.md`.
- `data/published/` digitized Dodd 2005 Fig 5a and Kennedy Neth 2019 data · `data/lab/` our measurements (CSV + note: date, who, instrument, units).
- **Blind-test predictions go in `predictions/` with a timestamped commit BEFORE the experiment runs.**
- Commit and push after changes so Ritik can pull.
- On this Mac, `python` doesn't exist and system `python3` has no numpy. Use the repo's `.venv` (`.venv/bin/python -m pytest -q`). To rebuild it: `uv venv .venv && uv pip install -p .venv/bin/python -r requirements.txt`.

## Claude Code setup (added 2026-11-09)

- **Hooks** (`.claude/settings.json` here and in the code repo; scripts in `code/removed-is-not-safe/.claude/hooks/` and `.claude/hooks/`):
  - After an edit to `ris/*.py` or `web/model.js`, the model tests and the JS/Python match test run (~11 s). After an edit under `pi/`, the pump tests run (~40 s). A failure is sent back to Claude to fix.
  - Committed files in `predictions/` are locked: Edit/Write and Bash commands that would change or delete them are blocked. New files are allowed.
  - At session start, a short summary of `project-state.md` is loaded (status, latest decisions, unchecked open items, conflicts). Read the full section when a question needs detail.
- **Skills:** `/lock-prediction` and `/add-lab-data` (in the code repo, so Ritik has them too), and `/log-result` (here).
- **Subagent:** `citation-checker` checks citations and sourced numbers against primary sources and flags "Do not claim" wording. Run it before anything goes to judges, mentors or the fair.

## The science in brief

- Free chlorine turns cipro into N-chloro-cipro in under a second; it breaks down over ~15–20 min into products that keep the quinolone core (Dodd et al. 2005).
- **Gap 1:** activity left after **chloramine** treats cipro (not found in literature).
- **Gap 2:** whether **bisulfite dechlorination** turns N-chloro-cipro back into cipro (suggested by Dodd 2005, never measured with bisulfite).
- Hypothesis: at normal doses cipro disappears but chlorinated products keep measurable activity; ammonia and dechlorination change that in ways a drug-only model can't predict.
- Safety threshold: cipro PNEC for resistance 0.064 µg/L (Bengtsson-Palme & Larsson 2016).
- Local plant: San José–Santa Clara Regional Wastewater Facility (sodium hypochlorite + sodium bisulfite since 2011; TRC ≤ 0.013 mg/L; ammonia ≤ 3.0 mg/L; Bay contact time unpublished, working estimate 30–60 min).
- Lab: HPLC-UV at BioCurious; *E. coli* K-12 + resazurin bioassay; Raspberry Pi–controlled coiled-tube reactor; DPD chlorine kit.
- **Do not claim:** "first to consider activity", "treated water is unsafe", "zero activity means safe", "validated for all treatments".

## Where things are

| Path | What |
|---|---|
| `project-state.md` | **Status, decisions, open items, conflicts. Read first.** |
| `context/people.md` | Partner, mentors, contacts |
| `context/judge-feedback.md` | Honest competitiveness review and the fixes it calls for |
| `context/second-project-bay-area-pharma.md` | The other project (pharma persistence ML) |
| `docs/removed-is-not-safe-step-by-step.md` | Full plan: question, chemistry, model layers, lab work, variables, phases 0–7 with checkpoints A–D |
| `docs/rwf-interview-prep-chlorination.md` | Prep for the Oct 29 interview with the San José plant |
| `docs/archive-*.md` | Earlier AOP/persulfate version of the project |
| `docs/artifacts/` | Saved claude.ai pages (project hub, models, simulator, parts list, 23-week plan); `.txt` copies for searching |
| `docs/hub/` | The ~20 working docs from the claude.ai project hub: project-memory, phase-roadmap, schedule-v3, bench-bible, partner-handoff, chlorine-pivot, final-scope, literature-review, review-conclusions, grant-budget, reactor-findings, etc. |
| `code/` | Git repos (not tracked by this folder's git) |

## Not carried over from claude.ai (add when you can)

- Project knowledge files uploaded to the claude.ai project, e.g. `Ritik_Suryansh_Synopsys_Research_Plan_v2.pdf`. Download them into `docs/`.
- The claude.ai scheduled task "Sync Research-Synopsys chats" still rebuilds the claude.ai copy of project-state; it can't see this folder. Turn it off once you've switched.
