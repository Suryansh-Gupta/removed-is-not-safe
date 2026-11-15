# Prototype plan: Settings Advisor app (Option 1) + Batch Reactor Digital Twin (Option 3)

**Written:** 2026-11-15 · **Status:** DRAFT for Suryansh to decide. Nothing is built yet beyond what already exists on GitHub.
**Superseded where they differ by `docs/prd-prototypes.md` v2 (same day).** The PRD review changed these points: Node 22 must be installed first (JS tests skip without it); fonts and three.js are saved in the repo so nothing loads from the internet; statuses gain REGULATION and EXAMPLE, and tags go on constants, not on every number; the 3D Twin view is P2 behind the flat view; model agreement is 1%, not 3%; the file is `sources.js`, not `provenance.js`; batch vial size and quench amounts are undecided (PRD D-3). This file stays as the architecture background.
**Out of scope for now:** the beaker test (Option 2). Held until Suryansh has talked to the teacher.

---

## 1. The idea in one picture

```
                 ┌──────────────────────────────────────────┐
                 │  ONE MODEL (already built and tested)    │
                 │  ris/*.py  ──(test keeps them equal)──  web/model.js
                 │  chlorine + chloramine + cipro + bisulfite│
                 └───────────────┬──────────────┬───────────┘
                                 │              │
            ┌────────────────────▼───┐    ┌─────▼──────────────────────┐
            │ OPTION 3: DIGITAL TWIN │    │ OPTION 1: SETTINGS ADVISOR │
            │ "What will my beaker   │    │ "What chlorine dose and    │
            │  experiment show?"     │    │  contact time should a     │
            │ Audience: us, teacher, │    │  plant use?"               │
            │ judges at the booth    │    │ Audience: plant engineer,  │
            │                        │    │ judges                     │
            └──────────┬─────────────┘    └─────────────▲──────────────┘
                       │  real lab readings go in here   │
                       └──── fitted constants flow ──────┘
                             (Dec–Feb, after lab data)
```

The two prototypes are not separate projects. They are two screens on top of the same model:
- **The twin** is the *science* side. It shows the experiment before you run it, then lets you put real readings next to the prediction.
- **The advisor** is the *engineering* side, the answer to the second half of your research question ("can a calibrated model choose safer settings?").
- Fair story: **model → twin (predict the experiment) → lab data → advisor (choose plant settings)**. Each later step makes the earlier one more trustworthy.

---

## 2. What already exists (don't rebuild it)

| Piece | Where | State |
|---|---|---|
| Chemistry model (Python) | `code/removed-is-not-safe/ris/` | Tested; Checkpoint A passed on Dodd 2005 data |
| Same model in the browser | `web/model.js` (`RIS.runBatch`, `runFlow`, `tube`, `runLaminar`) | Test holds it equal to Python |
| Model explorer page | `web/cipro_model_explorer.html` | Works, opens from a file |
| **Optimizer engine + charts + workbench** | branch `claude/gallant-johnson-3d7mdo`: `web/optimizer/engine.js`, `charts.js`, `app.js`, `optimizer.html` | Built Nov 13, **not merged**, has `tests/test_optimizer.py` |
| One-question-per-screen app version | same branch, `web/optimizer_app.html` + `flow.js` | Built, not merged |
| Operator "autopilot" | same branch, `web/autopilot.html` | Built, not merged |
| Batch reactor 3D page | `docs/artifacts/batch-reactor-3d.html` (three.js) | Parts list + 3D beaker; no chemistry yet |
| Coil simulator (3D, particles) | `docs/artifacts/reactor-prototype-simulator.html` | Coil-era; reusable rendering code |

So Option 1 is roughly 70% done, and Option 3 has its 3D shell and model already.

---

## 3. Option 1: Settings Advisor app

### 3.1 Who it's for and the one question
A process engineer who sets chlorine dose and contact time. The question: **"What's the lowest chlorine dose that still disinfects AND leaves antibacterial activity under the limit?"** Second question, which is what makes your project different: **"How does that compare with a plan that only checks the parent drug?"** The gap between those two answers is your finding, shown as a product.

### 3.2 Decision: one front-end, not three
The branch has three front-ends (workbench, one-question app, autopilot). Three half-finished UIs look worse than one finished one. Proposal:
- **Keep `optimizer.html` (the workbench) as the prototype.** It has the operating map, which is the best single image of your result.
- **Fold the best of `optimizer_app.html` into it** as a guided first run (water → limits → answer), not as a separate app.
- **Park `autopilot.html`.** A live control loop claims more than the data supports right now ("Do not claim: validated for all treatments"). It could come back as a Stage 2 idea.

*Your call:* if you'd rather it feel like a phone app, the one-question version becomes the main one instead. The architecture below works either way.

### 3.3 Screens
1. **Water and limits** (left rail). pH, ammonia, influent cipro, chlorine demand, CT target and basis, activity limit. Presets: *Title 22 recycled water*, *Secondary effluent discharge*, *Bench batch reactor (school-lab concentrations)*.
2. **Operating map** (main area). Dose on y, contact time on x. Each cell is blue (meets CT and activity), amber (CT met, activity over the limit) or hatched (CT short). Two markers: **● recommended** and **○ what a drug-only plan would pick**. If ○ sits in amber, that's your blind spot, made visible.
3. **Selected point** (right rail or under the map). Time-course of residual chlorine, cipro, N-chloro-cipro and products through contact → bisulfite → discharge. Numbers: CT, residual, activity in µg/L cipro-equivalent, bisulfite needed.
4. **"How sure is this?"** The sensitivity strip already in the engine: same setpoint under slow/fast bisulfite reversal, products ×2 and ÷2 as potent, demand ×2. Shown as a row of pass/fail ticks, not a paragraph.
5. **Lock as a prediction.** Uses `RISOPT.lockCommand` to generate the `predictions/` command, which connects the app to your blind-test method.
6. **Sources drawer.** Every constant with its source and status (see 3.5).

### 3.4 Architecture
```
web/
  model.js                  shared chemistry (read-only for both apps)
  optimizer/
    tokens.css              design tokens (exists)
    engine.js   RISOPT      grid search, evaluate, timecourse, sensitivity, CSV, lock command (exists)
    charts.js   RISCHART    operating map + time-course, canvas, reads colours from tokens (exists)
    app.js                  wiring, state, URL hash = shareable setpoint (exists; extend)
    provenance.js  NEW      table: every input → {value, unit, status, source}
  optimizer.html            the page
tests/
  test_optimizer.py         exists: engine vs Python model
  test_provenance.py  NEW   every PLACEHOLDER in engine.js appears in provenance.js and vice versa
```
- No build step, no framework, no CDN. It opens by double-click (`file://`), which is how you'll demo it at the booth with no wifi.
- State lives in the URL hash, so a setpoint can be shared with Ritik or a teacher as a link or bookmark.
- Engine work stays in a worker-free async loop (already yields to the page). The grid is small enough.

### 3.5 Honesty layer (this is what judges will poke at)
Every number shown carries one of three statuses, shown as a small text tag (not a coloured pill):
- `MEASURED`: from your lab (none yet)
- `LITERATURE`: e.g. Dodd 2005 rate constants, with the citation
- `PLACEHOLDER`: e.g. product potencies NCL 1.0 / P1 0.4 / P2 0.01 and chlorine demand 0.72 /h

A banner sits at the top while any PLACEHOLDER drives the answer: *"Activity values use placeholder potencies until the bioassay is run (Dec)."* The banner disappears automatically when they're replaced with measured values. Run the `citation-checker` agent on the Sources drawer before the fair.

### 3.6 Not-AI-slop design rules
The branch already chose a strong direction: **a plant process drawing.** Keep it and enforce it.

**Do**
- One flat sheet, ink lines, squared corners. It should look like a P&ID or an engineering drawing, not a website.
- **The map is the hero.** No hero banner, no tagline, no stat tiles above it.
- Colour means status only: blue = passes, amber = activity over limit, hatch = CT short, red = errors. Nothing decorative is coloured.
- Archivo / Archivo Narrow, with tabular figures for numbers. Labels look like equipment tags (`CT TARGET`, `Cl₂ DOSE`).
- Real units on every number, with sensible significant figures (`RISOPT.fmt` already does this).
- Write copy the way an engineer writes a note: "Lowest passing dose: 3.2 mg/L at 42 min." Not "Unlock safer water ✨".
- Empty and error states written for this app ("No dose under 20 mg/L meets CT at 15 min. Lengthen contact or raise the range.").
- Keyboard: arrow keys move across the map, Enter locks. Works in dark mode and for colour-blind viewers (already validated).

**Don't** (the usual "made by AI" tells)
- Purple/blue gradients, glassmorphism, glows, drop shadows on cards
- A grid of rounded cards with an icon + heading + two lines each
- Emoji in UI text, sparkle icons, "AI-powered"
- Big made-up KPI numbers ("97% safer!") or anything not computed by the model
- Centered marketing layout, testimonial-style quotes, a "Get started" button that leads nowhere
- Generic stock icons for chlorine, water drops or test tubes
- Lorem-ipsum-level hedging text; every sentence should say something specific

**Check before calling it done**
1. Screenshot test: put it next to a real SCADA/HMI screen and a ChatGPT-made dashboard. It should look like the first.
2. Five-second test with your teacher or Ritik: "What does this page tell you?" If they don't say "the lowest safe dose" within 5 s, the map isn't the hero yet.
3. Every pixel of colour can be explained by a status.
4. Every number can be traced to the Sources drawer.

### 3.7 Steps
| # | Step | Size |
|---|---|---|
| A1 | Merge branch `claude/gallant-johnson-3d7mdo` into `main`; run tests; check the engine still matches the Nov model | small |
| A2 | Choose workbench vs one-question form (you decide); remove the other two pages or move them to `web/archive/` | small |
| A3 | Add `provenance.js`, Sources drawer, placeholder banner, test | medium |
| A4 | Drug-only marker (○) and the "gap" readout on the map | small (engine already returns `drugOnly`) |
| A5 | Design pass against the 3.6 checklist; five-second test | medium |
| A6 | Later (Dec–Feb): swap placeholders for fitted values from the twin's data import | depends on lab |

---

## 4. Option 3: Batch Reactor Digital Twin

### 4.1 What it is
A to-scale 3D model of your actual Stage 1 setup: a foil-wrapped 500 mL beaker on a stir plate, with vials pre-loaded with quench, sampled at **0, 7.5, 15, 22.5 and 30 min**. The model runs underneath. You press Run and watch the experiment happen faster than real time: chlorine residual falls, cipro disappears, N-chloro-cipro rises and decays, and each vial fills and is "quenched" at its time.

It has three modes:
1. **Predict.** Set the run (dose, pH, ammonia, cipro, quench agent) and watch the predicted run. Vials show predicted values.
2. **Rehearse.** A protocol checklist steps through the bench procedure with a timer (which vial when, how much quench). It's practice for the real day and doubles as a demo for your teacher about safety and method.
3. **Compare** (once data exists). Type or paste DPD and HPLC readings per vial. Measured points appear on the predicted curves, with error per point and a single "model off by X%" figure. Later, one button fits `k_demand` from your DPD data and sends it to the advisor.

### 4.2 What each "virtual instrument" shows (honest version)
| Instrument | What the twin shows | Status |
|---|---|---|
| DPD kit | Free and total chlorine per vial, **rounded to the kit's real resolution** | model → reading is honest |
| HPLC-UV | Cipro and N-chloro-cipro as **relative peak areas**, not mg/L (judge feedback #2) | LITERATURE constants |
| *E. coli* resazurin plate | Predicted activity in cipro-equivalents, drawn as a 96-well colour map | **PLACEHOLDER** until Dec; labelled |

### 4.3 Architecture
```
web/
  model.js                  shared (same file the advisor uses)
  twin/
    twin.html               page; opens from file://
    protocol.js  TWIN.protocol   sample times, vial volumes, quench recipe (from bench bible / project-state)
    sim.js       TWIN.sim        calls RIS.runBatch over a time grid; returns per-vial snapshots
    instruments.js               DPD rounding, HPLC relative areas, plate map
    scene.js                     three.js beaker, stir bar, vials, foil; adapted from batch-reactor-3d.html
    compare.js                   measured-data entry, overlay, error, k_demand fit
    ui.js                        timeline scrubber, controls, mode switch
  optimizer/tokens.css      the same design tokens, so both prototypes look like one product
tests/
  test_twin_matches_model.py  NEW   vial values from sim.js == ris.cipro_model.run_batch at the same times
  test_protocol.py            NEW   sample times / volumes match project-state.md
```
- **The 3D library is the one external dependency** (three.js, same as the existing pages). If it fails to load (booth with no wifi), the page falls back to a flat 2D cross-section drawing, so everything still works. Option: save three.js into the repo for fully offline use.
- Timeline: one scrubber, 0 → 30 min + quench + hold. Everything (3D colour of the water, vial fill, charts) reads from the same time value, so they can't disagree.
- Water colour is **not** chemistry (chlorinated water at mg/L is clear). The 3D scene stays realistic, and the chemistry appears in the side charts and vial labels, so nothing on screen looks made up.

### 4.4 Design
Same rules as 3.6. Specifically for 3D:
- Neutral studio lighting, real proportions (500 mL beaker ≈ 8.5 cm × 12 cm), no glowing liquids, no particle sparkles
- A camera that stops at three useful views (bench, beaker close-up, vial rack), not free-spin by default
- Labels as leader lines with equipment tags, like a lab drawing

### 4.5 Steps
| # | Step | Size |
|---|---|---|
| T1 | `protocol.js` from the bench bible and project-state (times, volumes, quench), with test | small |
| T2 | `sim.js` on `RIS.runBatch` + Python match test | small |
| T3 | Flat 2D version first: timeline + charts + vial table (fully useful without 3D) | medium |
| T4 | 3D scene from `batch-reactor-3d.html`, driven by the timeline | medium |
| T5 | Instruments: DPD rounding, HPLC relative areas, placeholder plate | small |
| T6 | Rehearse mode (protocol checklist + timer) | small |
| T7 | Compare mode + `k_demand` fit → send to advisor | medium, once data exists |

---

## 5. Order and timing
Fair: Synopsys, March 2027. ML/optimizer phase was planned for Jan 10 – Feb 5, so the advisor should be solid **before** then.

| When | What |
|---|---|
| Week of Nov 16 | A1, A2 (merge, pick one front-end), T1, T2 |
| Nov 23 – Dec 6 | A3, A4, T3 (flat twin works end to end) |
| Dec 7 – Dec 20 | A5 design pass + five-second test; T4–T6 |
| After first lab data | T7 → A6 (placeholders replaced, banner goes away) |

---

## 6. Decisions for you
1. **Advisor form:** workbench (one dense screen with the map) or one-question-per-screen app?
2. **Autopilot:** park it (recommended) or keep it as a Stage 2 idea in the poster?
3. **Twin bioassay view:** show the placeholder plate now (labelled), or hide it until December?
4. **Offline at the booth:** bundle three.js into the repo so the twin needs no internet?
5. **Who builds what with Ritik:** e.g. Ritik owns `protocol.js` + Rehearse mode, since it's the lab procedure.

## 7. Risks
- **Placeholders look like results.** Mitigated by the provenance tags, banner and sensitivity strip.
- **Scope creep in 3D.** Mitigated by building the flat 2D twin first (T3); 3D is a layer on top.
- **Model and apps drift apart.** Mitigated by every app number being tested against the Python model.
- **Optimizer as buzzword** (judge feedback #5). The advisor is a grid search over a cheap model, and it should say so plainly, with the drug-only comparison as the point, not the algorithm.
