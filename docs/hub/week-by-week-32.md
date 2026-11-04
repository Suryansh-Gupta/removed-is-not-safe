# Week-by-Week Schedule — Who Does What, Every Week

**32 weeks. About 240 hours each, averaging 7.5 h per week.** Peak week is 12.6 h; three weeks run slightly over 12 and are flagged. Weeks 9, 13 and 32 are deliberately light — they are catch-up buffer, not free time.

Hours shown include each partner's share of the weekly 45-minute sync and notebook upkeep.

**Roles:** **A** = reactor, chemistry & baseline modelling. **B** = instrument, bioassay & optimization. **Both** = side by side, because a judge could ask either of you.

---

## PHASE 1 — BUILD (Weeks 1–4)

### Week 1 — Read and order · A 10.6 h · B 5.5 h
- **Both:** read the five core papers together (Yan, Meng, Hu, Wilkinson, Lancet). Write the one-paragraph novelty statement and have a teacher attack it. Set the ground rules — notebook, spreadsheet, sync day.
- **A:** order everything. Chemicals go through a school purchase order and take weeks — this is why it's week 1, not week 3.
- **B:** start the GitHub repo.

### Week 2 — Decide and design · A 8.1 h · B 8.1 h
- **Both:** **choose the antibiotic** (ciprofloxacin preferred, tetracycline fallback) and how you'll measure it. Lock the four settings and their ranges. Email two university labs about instrument access.
- **A:** design the lattice in CAD; print four in PETG.
- **B:** build the master spreadsheet schema; order light-reader parts to match the antibiotic choice.

### Week 3 — Catalyst and reader, part 1 · A 11.1 h · B 8.1 h
- **A:** make both catalysts — steel-wool route and rust-to-oxide route. Weigh everything, photograph, magnet-test.
- **B:** build the light reader (optics, wiring, Arduino code, printed holder).

### Week 4 — Reactor and reader, part 2 · A 11.1 h · B 10.1 h
- **A:** assemble the flow loop. Leak-test two hours. Measure real flow rate at three pump settings and write the table.
- **B:** finish and validate the reader — 30-minute drift under 1 %, linearity, dark current.
- **Both:** sync — declare reactor and reader "ready to calibrate."

---

## PHASE 2 — LEARN TO MEASURE (Weeks 5–8)

*This phase decides whether the whole project is trustworthy. Do not rush it.*

### Week 5 — Calibration · A 8.1 h · B 5.0 h
- **Both:** build the antibiotic calibration curve together so you both understand it. Write and tape up the sampling-and-quench card.
- **A:** interference check — persulfate, iron water, and quench solution read on their own.

### Week 6 — Baseline runs with the practice dye · A 11.2 h · B 5.2 h · 4 runs
- **Both:** four baseline runs with methylene blue — persulfate only, iron only, both, both + UV LED.
- **A:** write the kinetics fitting code.
- **Both:** decide whether the UV LED stays or gets dropped, and which catalyst route to use.

### Week 7 — Baselines with the antibiotic · A 10.2 h · B 11.2 h · 4 runs
- **Both:** repeat the four baselines with the real antibiotic. This becomes the "synergy" figure.
- **A:** set up and calibrate the iron-leaching assay.
- **B:** radish bioassay pilot — clean water, untreated antibiotic, quench-only water.

### Week 8 — Decision week · A 3.0 h · B 9.1 h
- **B:** *E. coli* pilot with the biology teacher.
- **Both:** check three things — does untreated antibiotic clearly hurt radish roots? Does quench-only water grow normally? Does a spiked sample read back at 85–115 %? Then do one full dress-rehearsal run together and sign the procedure card.

---

## PHASE 3 — MAP AND UNDERSTAND (Weeks 9–16)

### Week 9 — Buffer and design · A 3.0 h · B 3.0 h
- **B:** generate the 12-point Latin hypercube design; commit it before anything runs.
- **A:** prepare lattices, weigh each.
- *Light week on purpose — use it to catch up if Phase 2 slipped.*

### Weeks 10, 11, 12 — The map · A 5.2 h · B 5.2 h each week · 4 runs/week
- **Both:** two runs each per week. Whoever ran it, measures it and sets up its radish dishes. Score radish on day 5.
- Twelve runs total (R-001 to R-012).

### Week 13 — First look · A 2.0 h · B 3.0 h
- **B:** plot toxicity index against removal % for the 12 runs, coloured by pH. **This is the first draft of the headline figure.**
- **Both:** look at it together. Do the dots line up or scatter? Write down what you see. Don't change the plan.

### Week 14 — Which radical does the work · A 5.2 h · B 5.2 h · 4 runs
- **Both:** four runs at the best settings — normal, + tert-butanol, + methanol, + nitrogen purge.
- **Both:** work out which radical dominates and write one paragraph. Both of you practise saying it out loud.

### Week 15 — Does the catalyst last · A 11.6 h · B 11.6 h · 10 runs
- **Both:** ten runs in a row on one lattice. Measure rate and iron leaching every run. Photograph before and after.
- Heavy week, but the runs are quick repeats of the same conditions.

### Week 16 — Build the models ⚠️ · A 12.1 h · B 11.1 h
- **A:** Search A optimizer (removal only) + random forest and SHAP.
- **B:** Search B optimizer (multi-objective, Pareto front).
- **Both:** review the model landscapes; agree the safety limits on what the optimizers may propose.
- ⚠️ *Heaviest computational week. If Search B isn't running by the end of this week, demote the soft sensor (Week 26) to a stretch goal and both work on the optimizer.*

---

## PHASE 4 — THE MAIN EXPERIMENT (Weeks 17–23)

### Weeks 17, 18, 19, 20 — Two searches · A 5.2 h · B 5.2 h each week · 4 runs/week
Every week, the same rhythm:
1. **B** runs both optimizers on all data so far; each proposes two settings.
2. **Both** commit the four proposals with a timestamp **before running them** — this proves the computer chose, not you.
3. **Both** sanity-check the proposals for safety, then run two each.
4. Measure same day; radish dishes; score on day 5; feed results back.

### Week 21 — Grid comparison · A 9.8 h · B 9.8 h · 5 runs
- **Both:** first five runs of the hand-built 9-point grid (the "no computer" comparison).
- **Both:** build the three key figures — the full toxicity-vs-removal map, the "best result vs. number of runs" curves, and Search B's trade-off curve with Search A's best marked on it.

### Week 22 — Confirmation and the decision · A 8.4 h · B 11.4 h · 6 runs
- **Both:** three runs at Search A's best setting, three at Search B's chosen setting.
- **B:** radish on all six, plus statistics — t-test on root lengths, effect size, p-value.
- **Both:** **the decision.** Did the searches land in different places? Is B's water safer? Write the headline sentence together, whichever way it went. Don't spin a null result — you pre-registered it.

### Week 23 — Bacteria sweep · A 8.6 h · B 8.6 h
- **Both:** *E. coli* test on eight archived frozen samples spanning the removal range, plus the two confirmation settings. Five each, so you both know the technique.
- Plot growth % against removal and against radish index — do the two organisms agree?

---

## PHASE 5 — REAL WATER AND EXTRAS (Weeks 24–27)

### Week 24 — Grid finish + collect real water · A 8.2 h · B 7.2 h · 4 runs
- **Both:** last four grid runs.
- **A:** collect tap water, creek water, and make the fake hospital wastewater. Measure pH and conductivity.
- **B:** set up untreated controls for each matrix — creek water alone can affect seeds.

### Week 25 — Real-water runs · A 7.4 h · B 7.4 h · 6 runs
- **Both:** the chosen setting in each of the three matrices, twice each. Radish on all.

### Week 26 — Second ML result · A 7.0 h · B 9.1 h
- **B:** spectral soft sensor — train a model to predict the radish result from the light curve alone, tested only on runs it never saw. If it works, you have a 30-second stand-in for a 5-day test. If it doesn't, report that honestly.
- **A:** cost inputs (pump watts, persulfate per litre, catalyst lifetime) and start the methods section.

### Week 27 — Cost and freeze · A 8.1 h · B 6.0 h
- **A:** finish the cost model — dollars and kWh per 1,000 L vs. ozone and UV. Email a clinic, hatchery, or wastewater plant for a letter of interest (replies take weeks, so send now).
- **B:** repo README and reproducibility pass.
- **Both:** **freeze the dataset.** Tag it. No more changes.

---

## PHASE 6 — WRITE AND PRESENT (Weeks 28–32)

### Week 28 — Figures ⚠️ · A 12.6 h · B 8.6 h
- **Both:** all 13 final figures with error bars and n stated. A takes the chemistry figures, B takes the ML figures.
- **A:** finish the methods section and CAD appendix.

### Week 29 — Draft ⚠️ · A 12.1 h · B 11.1 h
- **A:** introduction.
- **B:** results.
- **Both:** discussion and limitations, written side by side. Be explicit: no mass spectrometer, so you measured what the water *does*, not what's *in* it.

### Week 30 — Abstract and review · A 6.5 h · B 9.6 h
- **Both:** abstract, 250 words, every sentence agreed.
- **Both:** send the full paper to your supervisor and one outside reader with the instruction "find what's wrong." Revise.

### Week 31 — Poster and talk · A 9.1 h · B 9.1 h
- **Both:** build the poster in story order — problem → reactor → does it work → which radical → the map → two searches → real water → cost → next.
- **Both:** write the 5-minute talk. Each of you must be able to give the whole thing alone.

### Week 32 — Mock judging · A 4.0 h · B 4.0 h
- **Both:** three practice sessions with teachers. Rehearse the answers to: *"Isn't toxicity testing after treatment already common?"* (yes — after optimization, never inside it). *"How do you know the iron isn't just dissolving?"* (leaching data). *"What are the fragments?"* (we measured their effect, not their identity). *"What if both searches had agreed?"* (pre-registered; the map answers it either way).

---

## Quick reference

| Weeks | Phase | Runs | Load |
|---|---|---|---|
| 1–4 | Build | 0 | Heavy (8–11 h) |
| 5–8 | Learn to measure | 8 | Moderate (3–11 h) |
| 9–16 | Map and understand | 22 | Light, then two heavy weeks (15, 16) |
| 17–23 | Main experiment | 21 | Steady 5 h, spiking at 21–23 |
| 24–27 | Real water and extras | 10 | Moderate (6–9 h) |
| 28–32 | Write and present | 0 | Heavy (4–13 h) |

**Buffer weeks:** 9, 13, 32. If something slips, this is where it absorbs.

**Three checkpoints that change the plan:**
- **Week 8** — if the radish assay can't tell treated from untreated water, raise the starting concentration or switch the in-loop test to bacteria. Everything downstream depends on this.
- **Week 16** — if Search B isn't running, drop the soft sensor and both work the optimizer.
- **Week 22** — if the two searches agree, switch to the pre-registered null framing. The map carries the poster.

**Track your real hours for the first four weeks.** These are estimates from a task list, not stopwatch data. Re-check the balance at the Week 4 sync — if the reactor build takes twenty hours instead of ten, you want to know in September, not February.
