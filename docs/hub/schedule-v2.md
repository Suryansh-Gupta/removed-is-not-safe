# Schedule v2 — 23 Working Weeks to a Late-March Deadline

**Built for your real constraints:** 3 lab days per week, abstract due late March 2027.

| | v1 (wrong) | v2 (this one) |
|---|---|---|
| Working weeks | 32 | **23** |
| Runs | 71 | **56** |
| Hours each | ~240 | ~215 |
| Average per week | 7.5 h | **9.4 h** |
| Peak week | 12.6 h | 12.2 h |

The work got 20 % shorter but the weeks got 25 % denser. That is the real cost of the calendar, and it's better to know now.

---

## The calendar this assumes

Start **Monday 21 September 2026**, abstract due **~29 March 2027**. That's 27 calendar weeks minus four you won't get: Thanksgiving week, the December finals week, and two weeks of winter break.

| Week | Starts | Week | Starts |
|---|---|---|---|
| 1 | Sep 21 | 13 | Jan 11 |
| 2 | Sep 28 | 14 | Jan 18 |
| 3 | Oct 5 | 15 | Jan 25 |
| 4 | Oct 12 | 16 | Feb 1 |
| 5 | Oct 19 | 17 | Feb 8 |
| 6 | Oct 26 | 18 | Feb 15 |
| 7 | Nov 2 | 19 | Feb 22 |
| 8 | Nov 9 | 20 | Mar 1 |
| 9 | Nov 16 | 21 | Mar 8 |
| — | *Nov 23 — Thanksgiving* | 22 | Mar 15 |
| 10 | Nov 30 | 23 | Mar 22 |
| 11 | Dec 7 | — | *Mar 29 — abstract due* |
| — | *Dec 14 — finals* | | |
| — | *Dec 21, Dec 28 — winter break* | | |
| 12 | Jan 4 | | |

**Check these dates against your school calendar and the actual fair deadline before committing.** If your winter break is three weeks, or the deadline is February, this needs redoing again.

---

## What got cut, and why those things

| Block | Was | Now | Reasoning |
|---|---|---|---|
| Catalyst durability | 10 runs | 6 | A trend is visible in 6; runs 7–10 were confirmation |
| Grid comparison | 9 | 6 | Enough for a fair "no-computer" baseline |
| Two searches | 16 | 12 | 3 rounds each instead of 4 — the thinnest cut, see warning below |
| Round-1 map | 12 | 10 | Still covers the design space |
| Real water | 6 | 4 | Two matrices in duplicate instead of three |
| Baselines | 8 | 8 | **Not cut** — this is how you learn the method |
| Radical tests | 4 | 4 | **Not cut** — this is your mechanism evidence |
| Confirmation | 6 | 6 | **Not cut** — this is the headline result |

**The warning:** cutting the searches from 16 runs to 12 means three proposal rounds each. That is the minimum for a Bayesian optimizer to show it's learning rather than guessing. If anything slips, protect these twelve runs — take the time out of durability or the grid instead.

---

## Week by week

### BUILD — Weeks 1–4 (Sep 21 – Nov 6)

**W1 · Sep 21 · A 10.4 h · B 5.5 h**
Both: read the five core papers; write the novelty statement and have a teacher attack it; set ground rules. A: **order everything today** — school POs take weeks and Week 6 depends on them. B: start the repo.

**W2 · Sep 28 · A 8.0 · B 8.0**
Both: choose the antibiotic and the measurement route; lock the four settings and ranges; email two university labs. A: lattice CAD, print four. B: spreadsheet schema, order reader parts.

**W3 · Oct 5 · A 10.9 · B 8.0**
A: make both catalysts, weigh and photograph everything. B: build the light reader.

**W4 · Oct 12 · A 10.9 · B 9.9**
A: assemble flow loop, leak-test 2 h, measure real flow at three pump settings. B: validate the reader — drift, linearity, dark current. Both: declare "ready to calibrate."

### LEARN TO MEASURE — Weeks 5–7 (Oct 19 – Nov 6)

*Compressed from four weeks to three. This is the riskiest compression in the plan — if the calibration isn't trustworthy, nothing downstream is.*

**W5 · Oct 19 · A 8.0 · B 5.0**
Both: calibration curve together; write and post the sampling-and-quench card. A: interference check.

**W6 · Oct 26 · A 11.1 · B 5.2 · 4 runs**
Both: four dye baseline runs. A: kinetics fitting code. Both: decide on the UV LED and which catalyst route.

**W7 · Nov 2 · A 10.1 · B 11.1 · 4 runs**
Both: four antibiotic baselines — the synergy figure. A: iron-leaching assay setup. B: radish pilot.

### MAP AND UNDERSTAND — Weeks 8–13 (Nov 9 – Jan 17)

**W8 · Nov 9 · A 5.0 · B 8.9**
B: *E. coli* pilot with the biology teacher; Latin hypercube design committed. A: prepare and weigh lattices. Both: full dress rehearsal, sign the procedure card.
*→ Thanksgiving week off*

**W9 · Nov 16 · 5 runs · A 6.2 · B 6.2**
**W10 · Nov 30 · 5 runs · A 6.2 · B 6.2**
Map runs R-001 to R-010, five per week — roughly two per lab day.

**W11 · Dec 7 · 4 runs · A 6.2 · B 7.2**
Both: the four radical tests. B: first draft of the toxicity-vs-removal map. Both: look at it, write down what you see, don't change the plan.
*→ Finals week and winter break off*

**W12 · Jan 4 · 6 runs · A 9.2 · B 9.2**
Durability — six runs on one lattice, tracking rate and iron leaching. Ease back in after the break.

**W13 · Jan 11 · A 11.9 · B 10.9**
A: Search A optimizer + random forest and SHAP. B: Search B optimizer with the Pareto front. Both: agree the safety limits on proposals.
⚠️ **Checkpoint:** if Search B isn't running by Friday, drop the soft sensor and both work the optimizer.

### THE MAIN EXPERIMENT — Weeks 14–19 (Jan 18 – Feb 27)

**W14 · Jan 18 · 4 runs · A 10.3 · B 10.1**
**W15 · Jan 25 · 4 runs · A 10.3 · B 10.1**
**W16 · Feb 1 · 4 runs · A 11.3 · B 11.1**
Three rounds of the two searches. Same rhythm each week: Monday both optimizers propose two settings each, commit the proposals with a timestamp *before* running, two runs each, measure same day, score radish Friday.
Also in these weeks: A writes the methods section in thirds; both run the *E. coli* sweep on archived samples; chemistry figures begin.

**W17 · Feb 8 · 4 runs · A 8.6 · B 8.6**
Grid comparison, first four. Both: build the three key figures — the map, the "best result vs. runs" curves, the trade-off curve.

**W18 · Feb 15 · 6 runs · A 12.2 · B 11.2**
Confirmation: three runs at Search A's best, three at Search B's chosen. Radish on all six. B: statistics. A: cost model.
⚠️ **The decision week.** Did the searches diverge? Write the headline sentence together, whichever way it went.

**W19 · Feb 22 · 4 runs · A 10.6 · B 9.6**
Real water — two matrices in duplicate. Finish the *E. coli* sweep.

### WRITE AND PRESENT — Weeks 20–23 (Mar 1 – Mar 27)

**W20 · Mar 1 · 2 runs · A 12.0 · B 11.5**
Last two grid runs. B: soft sensor, repo README. Both: remaining figures. Freeze the dataset this week.

**W21 · Mar 8 · A 11.9 · B 10.9**
A: introduction. B: results. Both: discussion and limitations, side by side.

**W22 · Mar 15 · A 10.4 · B 9.4**
Both: abstract, 250 words, every sentence agreed. Send to your supervisor and one outside reader with "find what's wrong." Revise.

**W23 · Mar 22 · A 11.9 · B 11.9**
Both: poster in story order; 5-minute talk each of you can give alone; three mock judging sessions.

**Mar 29 — abstract due.**

---

## Honest assessment of this version

**Better than v1:** it fits a real calendar with real breaks, real dates, and a run count your lab access can actually deliver.

**Still uncertain:** the hour estimates are unvalidated. If they're 50 % optimistic — which is normal — you're looking at 14 h/week, which is not sustainable alongside classes and the solo MIP project. The first four weeks will tell you.

**There is almost no slack.** v1 had three buffer weeks. This has none. Weeks 9 through 12 are the lightest at 6–9 h, so that's where slippage has to absorb.

**Cut in this order if you fall behind:**
1. The spectral soft sensor (Week 20) — a bonus result, not the thesis.
2. The *E. coli* sweep (Weeks 14–19) — costs you the resistance endpoint, keeps the core.
3. Real water down to a single matrix (Week 19).
4. Durability down to four runs.
**Never cut:** the 12 search runs, the 6 confirmation runs, the 4 radical tests.

**The two decisions that would buy real room:** starting in summer instead of September, or targeting CSEF and next year's Synopsys and using this March as a partial-data checkpoint. Either turns a tight plan into a comfortable one.
