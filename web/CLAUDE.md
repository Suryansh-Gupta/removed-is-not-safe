# web/: build rules for the Advisor and the Twin

Two browser prototypes on one model: the **Settings Advisor** and the **Batch Reactor Digital Twin**.
What to build and in what order: `docs/prd-prototypes.md` in the research folder (the folder that contains `code/`).
Status and decisions: `project-state.md` there. Read it first; it wins over every other doc.
Suryansh makes every research decision. A scientific judgment call gets options and a question, never a quiet default.

## Before any work here
1. `node -v` must print v22 or later. **If Node is missing, stop and say so.** The JS tests skip without it, and a
   skipped test is not a pass. Never report "tests pass" while any are skipped; report the skip count.
2. `git pull`, then `.venv/bin/python -m pytest -q`.
3. Both prototypes were merged into `main` on 2026-11-16 (built on branch `prototype/advisor-and-twin`).

## The demo path is the product
The PRD's section 3 lists four steps a judge sees in 60 seconds. Work on that path beats work off it. Before adding
anything, ask whether it makes one of those four steps clearer. If it doesn't, it's P2.
The Advisor's default state must show the finding with no clicks (`test_default_map_tells_the_story`). Never weaken
that test to make a change pass. If a model change breaks it, that's a research finding: stop and tell Suryansh.

## Layout
```
web/
  model.js            RIS. The only place chemistry lives.
  optimizer/          tokens.css, engine.js (RISOPT), charts.js (RISCHART), app.js,
                      CONTRACT.md (the interface; update it when a signature changes)
  optimizer/sources.js   RISSOURCES: status and source for every constant and preset value.
                         Values are read from RIS / RISOPT, never typed there.
  optimizer.html      the one Advisor page
  twin/               twin.html, protocol.js, sim.js, instruments.js, ui.js   (compare.js: when lab data exists)
  fonts/              Archivo + Archivo Narrow woff2, fonts.css, OFL licence files
  vendor/             three.min.js r128 + OrbitControls (MIT), only when the 3D view is built
  archive/            old explorer (cipro_model_explorer.html), optimizer_app.html, autopilot.html and their scripts. Not maintained
```

## Hard rules
1. **Chemistry only through `RIS`.** Never retype a rate, pKa or potency in another file. A model change goes into
   `ris/*.py` and `model.js` together.
2. **Zero network requests.** No CDN, no Google Fonts, no analytics. Fonts load from `web/fonts/` with `@font-face`;
   three.js loads from `web/vendor/`. Everything opens by double-click from `file://`.
3. **No build step, no framework, no npm packages.** Plain ES2020 that also runs in Node 22 for the tests.
4. **Statuses.** Every constant and preset value has one status in `sources.js`:
   `MEASURED` (our lab) · `LITERATURE` (with citation) · `REGULATION` (with the rule) · `CALCULATED` · `ESTIMATE` (our
   reading of a paper that doesn't give the number directly) · `EXAMPLE` (illustrative, such as the 300 mg·min/L CT) ·
   `PLACEHOLDER` (a guess waiting for data) · `UNKNOWN` (nobody has measured it). What the user types is a setting and
   needs no tag. `tests/test_sources.py` keeps the table complete and in step with the comments in `ris/*.py`.
   **When a value is measured, change its status in `sources.js` and the banner shrinks by itself.**
5. **Show the status where it matters, once.** One banner line names the placeholders that change the current answer.
   Results that depend on one get a small mark. Don't put a tag on every number; that buries the warning.
6. **No number on screen that the model or `sources.js` didn't produce.** No sample data, no rounded-for-effect figures.
7. **Twin protocol facts live only in `twin/protocol.js`,** each with its source. Vial size and quench amounts for the
   batch run are undecided (PRD D-3): don't fill them in. A disagreement with `project-state.md` goes under its
   "Conflicts to resolve".
8. **Instruments read like the real ones.** DPD values use the kit's range and resolution from its manual. HPLC shows
   relative peak areas, never product concentrations. Bioassay output is hidden or marked PLACEHOLDER (PRD D-4).
9. **Wording.** Never: "first to consider activity", "treated water is unsafe", "zero activity means safe", "validated
   for all treatments". Activity near 0.064 µg/L is "model-predicted". The search is "a grid search", not "AI".
10. **No equipment control.** The autopilot is archived.
11. **Tests:** engine and Twin values within 1% of the Python model. New feature, new test.

## Smooth
- The default map is on screen in under a second with no spinner. Input changes show within 150 ms: draw a coarse grid
  at once and sharpen it, or keep the old map dimmed while the new one computes. Never freeze the page.
- Reserve space for anything that arrives late (results, banner, fonts with `font-display: swap` and matched fallback
  metrics) so nothing jumps.
- Every state is designed: first load, computing, nothing passes, drug-only pick also passes, invalid input, 3D missing.
  Each says what to change. No blank panels, no "Something went wrong".
- View state lives in the URL hash. Reload, back and a pasted link give the same view.
- Motion only shows a change of state, lasts 150 ms or less, and stops under `prefers-reduced-motion`.
- Zero console errors or warnings on the demo path.

## Design: a plant process drawing
The page should look like it was drawn by the people who run the process. `tokens.css` is the only source of colour,
type and spacing; never write a hex value, font name or pixel radius anywhere else.

**Structure**
- The map is the largest thing on the Advisor and starts above the fold at 1280×720. Above it: a one-line title and the
  banner. Nothing else.
- Regions are separated by a 1 px `--rule` line and by alignment. No cards, no boxes inside boxes, no shadows.
- Corners are square. One primary action per view; everything else is a plain text button.
- Spacing comes in steps of 4 px (4, 8, 16, 24, 32). Left edges line up down the whole page.

**Type**
- Archivo for sentences, Archivo Narrow in uppercase for equipment-tag labels (`CT TARGET`, `Cl₂ DOSE`).
- Two weights (400, 600) and at most four sizes per page. Sentence case everywhere else.
- Numbers use tabular figures, align on the decimal point in tables, and always carry a unit. Format with `RISOPT.fmt`.
- Real symbols: Cl₂, µg/L, mg·min/L, ≤, ×, −.

**Colour**
- Status only: `--pass` blue, `--warn` amber, `--void` hatch, `--crit` red for errors. Text, lines and controls are ink.
- Status is never colour alone: amber cells also differ by pattern or label, so it survives a black-and-white printout.

**Charts**
- Label lines and markers directly on the chart. No legend boxes.
- Axis titles carry units. Tick values are round. The activity limit is a labelled line.
- No gridline heavier than `--grid`, no gradients, no area fills that aren't a status, no 3D effects, no animation loops.

**Words**
- Write like an engineer's log: the finding, the number, the unit. "Lowest passing dose: [dose] mg/L at [time] min."
- One line of help at most beside a control. If a panel needs a paragraph to explain it, redesign the panel.
- No exclamation marks, emoji, or these words: unlock, seamless, powerful, robust, leverage, empower, cutting-edge,
  revolutionary, smart, insights, journey, effortless, AI-powered.
- Each sentence should be impossible to reuse on another product's page.

**3D (Twin, P2)**
- Neutral light, true proportions, three fixed camera positions, leader-line labels. Chlorinated water is clear, so the
  water isn't tinted to show chemistry; the charts and vial labels do that.

**Never**
- Gradients, glass blur, glow, drop shadows, rounded cards, pill badges
- Grids of icon + heading + blurb; hero banners; taglines; centered marketing layouts
- KPI tiles with big numbers; progress rings; fake loading sequences
- Decorative icons (water drops, flasks, sparkles); stock illustrations
- Purple, teal-to-blue fades, or any colour without a status
- Tooltips that hold information needed to understand the page

## Finishing a change
1. Tests pass with **zero skipped**.
2. UI change: run `/ui-review` (`.claude/skills/ui-review/SKILL.md`). It opens the page and checks it against the rules
   above in light, dark, narrow and offline.
3. Before anyone outside the team sees it: run `/demo-check` (`.claude/skills/demo-check/SKILL.md`).
4. Text with citations or sourced numbers: run the `citation-checker` agent.
5. Log a dated line in `project-state.md`, then commit and push as the research folder's `CLAUDE.md` says.

## Commands
```bash
.venv/bin/python -m pytest -q                      # everything; must show 0 skipped
.venv/bin/python -m pytest -q tests/test_optimizer.py tests/test_sources.py tests/test_twin.py tests/test_protocol.py
open web/optimizer.html                            # double-click test
python3 -m http.server 8770 --directory web        # only for checking in a browser tool that can't open file://
```
