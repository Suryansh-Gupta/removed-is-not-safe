# Schedule v3 — The Feasible Plan

**Supersedes `claude/schedule-v2-23-weeks.md` and `claude/week-by-week-schedule.md`.**
Written 2026-09-12, after the feasibility audit (`claude/feasibility-and-competitiveness-audit.md`).

Same deadline as v2: start Mon 21 Sep 2026, abstract due ~29 Mar 2027, 23 working weeks.
What changed is the *shape* of the work, not the calendar.

| | v2 | v3 |
|---|---|---|
| Total person-hours | 434 | **363** |
| Average per partner | 9.4 h/wk | **7.9 h/wk** |
| Peak week | 12.2 h | **8.5 h** |
| Utilisation of a 9 h/wk ceiling | 105 % | **88 %** |
| Slack | none | **51 person-h (1.1 h/wk each)** |
| Reactor runs | 56 | **47** |
| Design factors | 4 | **3** |
| Physical search runs | 12 (3 rounds) | **12 (3 rounds)** — protected |
| Optimizer comparison | 12 physical runs | 12 physical runs **+ 500 in-silico seeds** |
| Absorb weeks | 0 | **4 (W12, W13, W20, W21)** |

**The one-line summary of why v2 wasn't feasible:** it planned 105 % of your stated capacity with the project's central claim sitting at the far end of the critical path. Any build slip landed directly on the search runs, which are the one thing the plan said never to cut. v3 fixes that by moving the machine-learning claim off the critical path entirely and cutting work that wasn't buying evidence.

---

## 1. Decisions made this session

| Decision | Answer | Consequence |
|---|---|---|
| Timeline | **One year, reduced scope** — March 2027 | 23 working weeks, no extension |
| Sustainable load | **~9 h/wk each ceiling** | Plan built to 7.9 h/wk average, 8.5 h peak |
| Target drug | **Ciprofloxacin**, with a hard Week-2 gate | Fluorimeter repriced from 12 h to 30 h |
| Instrument gate fallback | **Pre-committed switch to tetracycline** if neither off-ramp lands by Fri of Week 2 | Removes the largest overrun risk from the plan |
| *E. coli* | **Insurance** — Form 6A + teacher ask in Week 1, radish stays in-loop | ~15 h retained; fallback exists if radish shows no dynamic range |
| Written output | **Research plan + abstract + poster only** | ~14 h saved; manuscript deferred to summer 2027 from a frozen dataset |

---

## 2. What was cut, and why those things

| Block | v2 | v3 | Reasoning |
|---|---|---|---|
| Design factors | 4 (pH, persulfate, iron, residence) | **3** — iron mass fixed after baselines | 16 points in 4-D is ~2 per dimension; below the density where Bayesian optimisation measurably beats random search. Fixing iron mass is defensible on mechanism, not convenience: §2.4 of the reactor findings already predicts steel wool at a given mass |
| Physical grid comparison | 6 runs | **0** | Six points in a multi-factor space is not a grid and proves nothing about grid-vs-BO. Done in silico instead, where a real grid is affordable |
| Round-1 map | 10 runs | **12** — *increased* | The map **is** the primary outcome, and it's the training set for the surrogate that carries the ML claim. This is the one block that got bigger |
| UV LED activation arm | optional 4th baseline | **deleted** | With a fluorescence readout on a photolabile drug, a UV lamp is a direct photolysis confound. Removes a variable and a baseline run |
| Catalyst routes | steel wool **and** rust-derived oxide | **steel wool only** | The mass-transfer finding (reactor findings §2.4) mechanistically favours wool; making both was hedging |
| Iron-leaching measurement | every run (12 h) | **durability block + every 3rd run** (5 h) | Leaching supports a catalyst-retention claim. You need the trend, not 47 points |
| Durability | 6 runs | **4** | A trend is visible in 4 |
| Real water | 4 runs, 2 matrices | **2 runs, 1 matrix** (simulated hospital wastewater) | The deployment story needs one convincing matrix; creek water adds a matrix-only control burden for little payoff |
| Spectral soft sensor | 8 h PLS model | **3 h core + 5 h stretch** | Reframed: the core job is *spectral evidence that transformation occurred*, which defends the headline measurement. The PLS predictor is the bonus |
| Literature reading | 10 h | **3 h** | Already done — CLAUDE.md §5 has all five papers verified line by line |
| Manuscript | 37 h | **~23 h** | Research plan, abstract, poster. Manuscript deferred |

**Added, not cut:**

| Addition | Cost | What it buys |
|---|---|---|
| **In-silico optimizer study** — both searches, 500 seeds, on a surrogate fit to the physical runs | 8 h | The learning-curve claim *with error bars*, an affordable grid baseline, and the Pareto front. This is the change that makes the plan feasible: the ML thesis no longer depends on lab throughput |
| Dye-pulse residence-time-distribution test | 3 h | Validates or kills the mass-transfer model on real hardware. Replaces CFD (reactor findings §3) |
| Radish Na₂SO₄ salt dose-response series | +1 h | Lets the osmotic contribution be regressed out instead of hoped away (audit §2.3) |
| Quench redesign to 0.4 M + conductivity on every bioassay sample | +1 h | Removes the osmotic confound and its false trend along the persulfate axis |

---

## 3. The Week-2 instrument gate

This is the most important structural feature of v3. The ciprofloxacin fluorimeter (~280 nm excitation, ~450 nm emission) is the single largest line item at 30 h, it is the thing neither partner has built before, and it sits in Weeks 3–6 where a slip propagates through everything.

So it gets a gate with three off-ramps, checked in order, **decided by Friday of Week 2**:

| Off-ramp | Test | Fluorimeter cost | Plan total | Utilisation |
|---|---|---|---|---|
| **1. Borrowed instrument** | Any confirmed access to a spectrofluorometer or scanning UV-Vis | 0 h | 333 h | 80 % |
| **2. 365 nm excitation works** | Can a 365 nm LED + plastic cuvettes + 450 nm emission filter detect cipro at 20 mg/L? Cipro's main excitation is ~275–280 nm, but if a longer-wavelength shoulder gives usable signal, plastic cuvettes are fine above 300 nm and the build collapses to roughly the tetracycline photometer plus 90° geometry | ~14 h | 347 h | 84 % |
| **3. Full deep-UV build** | Deep-UV LED, quartz cuvettes, 90° geometry, emission filter, stray-light baffling | 30 h | 363 h | 88 % |
| **Fallback: tetracycline** | Triggered if 1 and 2 both fail and you judge 3 too expensive | ~14 h | 347 h | 84 % |

**Pre-committed rule:** if off-ramps 1 and 2 have both failed by Friday of Week 2, switch the target to tetracycline. Deciding this now is the entire point — by Week 5 you will have 20 h sunk in the build and will not want to walk away. The gate is worthless if it's evaluated after the money is spent.

Off-ramp 2 is worth an hour of Week 1: it is cheap to test and it would save 16 h. I'm reasoning from ciprofloxacin's absorbance structure rather than a measured excitation spectrum, so treat it as a hypothesis to test, not a fact.

---

## 4. Week by week

Load is person-hours ÷ 2. No week exceeds 8.5 h each. No week exceeds 5 reactor runs (your 3-lab-day access limit).

| Wk | Starts | Phase | h each | Runs | Work |
|---|---|---|---|---|---|
| 1 | Sep 21 | **GATE** | 8.0 | — | **Radish dose-response pilot + Na₂SO₄ salt series.** Cipro readout feasibility test (incl. 365 nm off-ramp). Order everything. Form 6A + Designated Supervisor ask. Instrument-access emails to 5+ labs. **HPLC validation ask to 5+ labs.** Pre-registration draft. |
| 2 | Sep 28 | **GATE** | 8.0 | — | ⚠️ **INSTRUMENT GATE — decide by Friday.** Lock 3 factors and ranges. Lattice CAD (23 mm core + 2 mm collar rings). Spreadsheet schema + repo. Novelty statement attacked by a teacher. |
| 3 | Oct 5 | BUILD | 8.0 | — | Reactor tube + loop assembly. Print 4 lattices. Fluorimeter optics + wiring. |
| 4 | Oct 12 | BUILD | 8.5 | — | Leak-test 2 h. Flow-rate table. Steel-wool catalyst prep. Fluorimeter enclosure + stray-light baffling. ⚠️ **Week-4 checkpoint: compare tracked hours to estimates and re-plan.** |
| 5 | Oct 19 | BUILD | 8.5 | — | Fluorimeter firmware + first light. Iron-leaching assay setup. ⚠️ **Sampling-point decision committed** (reactor outlet recommended — resolves reactor findings §2.3). |
| 6 | Oct 26 | BUILD | 8.0 | — | Fluorimeter validation: drift, linearity, dark current, LOD. Measure void volume with lattice fitted (`void_volume_mL_measured`). |
| 7 | Nov 2 | CALIB | 7.5 | — | Cipro calibration curve + LOD. Interference check (persulfate / iron / quench blanks). Quench redesign to 0.4 M + conductivity protocol. Introduction writing starts. |
| 8 | Nov 9 | CALIB | 7.5 | 3 | 3 dye practice runs. Dress rehearsal + signed procedure card. Radish and *E. coli* pilots read out. ⚠️ **Bioassay checkpoint: does radish distinguish treated from untreated?** |
| — | Nov 23 | *Thanksgiving* | — | — | |
| 9 | Nov 30 | BASE | 7.5 | 4 | 4 cipro baseline runs — the synergy figure. Dye-pulse RTD test. Latin hypercube committed to the repo before running anything. |
| 10 | Dec 7 | MAP | 7.5 | 3 | Map runs 1–3. Methods writing starts. |
| — | Dec 14–28 | *Finals + winter break* | — | — | |
| 11 | Jan 4 | MAP | 7.5 | 3 | Map runs 4–6. Methods. Ease back in. |
| 12 | Jan 11 | MAP | 7.0 | 3 | Map runs 7–9. Methods. **ABSORB** |
| 13 | Jan 18 | MAP | 7.0 | 3 | Map runs 10–12. **First removal-vs-toxicity map drawn.** Look at it, write down what you see, don't change the plan. **ABSORB** |
| 14 | Jan 25 | **COMPUTE** | 8.5 | 2 | Fit surrogate + held-out validation. **In-silico study: 500 seeds per search — learning curves, Pareto front, in-silico grid baseline.** Both optimizers live. SHAP. 2 scavenger runs. |
| 15 | Feb 1 | SEARCH | 8.5 | 4 | Search round 1. Monday: both optimizers propose 2 settings each, **committed with a timestamp before running.** |
| 16 | Feb 8 | SEARCH | 8.0 | 4 | Search round 2. Spectral transformation evidence (absorbance ratios, emission peak shift). |
| 17 | Feb 15 | SEARCH | 8.0 | 4 | Search round 3. *E. coli* spot checks on archived samples (plate work — doesn't consume reactor days). |
| 18 | Feb 22 | CONFIRM | 8.5 | 5 | Confirmation runs 1–3 at Search A's best + 2 scavenger runs. Three key figures built. |
| 19 | Mar 1 | CONFIRM | 8.5 | 3 | Confirmation runs 4–6 at Search B's chosen. Radish + *E. coli* on all six. Statistics. ⚠️ **Decision week: did the searches diverge? Write the headline sentence either way.** |
| 20 | Mar 8 | ROBUST | 7.5 | 4 | 4 durability runs on one lattice. Cost and energy model. **ABSORB** |
| 21 | Mar 15 | ROBUST | 7.5 | 2 | 2 real-water runs (simulated hospital wastewater, duplicate). ⚠️ **Freeze the dataset.** Results section. **ABSORB** |
| 22 | Mar 22 | WRITE | 8.0 | — | Discussion + limitations. Abstract (250 w) to supervisor and one outside reader with "find what's wrong." Talk script. Remaining figures. Repo README. |
| 23 | Mar 29 | PRESENT | 8.0 | — | Poster in story order. 3 mock judging sessions. Revise abstract. Both partners able to give the talk alone. |

**Note on dates:** v2's calendar put the abstract at Mar 29 with Week 23 ending Mar 27. v3 shifts one week later because the Thanksgiving and winter breaks are placed explicitly. **Confirm the real Synopsys 2027 abstract deadline before Week 1 ends** — if it's mid-March, drop the real-water block (Week 21) and compress Weeks 22–23 into one. The whole calendar keys off a date nobody has verified yet.

---

## 5. Run budget

| Block | Runs | Purpose | Protected? |
|---|---|---|---|
| Dye practice | 3 | Learn the workflow on something cheap | no |
| Cipro baselines | 4 | The synergy figure — proves iron activates persulfate | no |
| **Round-1 map** | **12** | **Primary outcome + surrogate training set** | **yes** |
| **Radical scavengers** | **4** | **Mechanism evidence** | **yes** |
| **Physical searches** | **12** | **3 rounds × 2 proposals × 2 optimizers** | **yes** |
| **Confirmation** | **6** | **The headline result** | **yes** |
| Durability | 4 | Catalyst retention claim | no |
| Real water | 2 | Deployment validity | no |
| Physical grid | 0 | *deleted — done in silico* | — |
| **Total** | **47** | | **34 protected** |

---

## 6. Cut ladder — pre-committed, in this order

Triggered by the Week-4 hours checkpoint or any two-week slip. Decide the order now, so a February panic doesn't cut the wrong thing.

1. Real water: 2 runs → 0 *(frees ~4 person-h)*
2. Durability: 4 runs → 2 *(frees ~4 h)*
3. *E. coli* spot checks: 6 → 3 *(frees ~5 h)*
4. PLS soft sensor — already a stretch goal, formally dropped *(frees ~5 h)*
5. Cipro baselines: 4 → 3 *(frees ~2 h)*

**Never cut:** the 12 map runs, the 12 search runs, the 6 confirmation runs, the 4 scavenger runs, or the in-silico study. Together these are the entire evidentiary base; everything else is supporting material.

---

## 7. Trip-wires

Each of these has a date, a test, and a pre-decided response. A checkpoint without a pre-decided response is just a worry.

| Week | Test | If it fails |
|---|---|---|
| **1** | Does radish root elongation respond to untreated 20 mg/L drug, above the noise, at ionic strengths you'll actually be dosing? | Raise starting concentration; if still flat, *E. coli* becomes the in-loop objective (the Week-1 Form 6A is what makes this possible) |
| **2** | Instrument off-ramp 1 or 2 secured? | **Switch target to tetracycline.** Pre-committed |
| **4** | Do tracked hours match estimates? | Re-run the balance; start the cut ladder at item 1 if over by >20 % |
| **6** | Fluorimeter drift under 1 % over 30 min, LOD under 1 mg/L? | Extend into the W12–13 absorb weeks; if still failing at W8, tetracycline + simple photometer |
| **8** | Does the full dress-rehearsal run complete in the estimated time? | Recompute the run-hours rate and re-plan Weeks 9–21 against the measured figure |
| **13** | Does the map show *any* structure in toxicity vs. removal? | A flat toxicity axis is itself the answer to the primary question — say so plainly and shift weight to the mechanism and cost story |
| **19** | Did the searches diverge? | Either answer is the result. The pre-registration protects you; write the headline sentence both ways in advance |

---

## 8. What v3 does not fix

**The measurement confound is contained, not solved.** Off-ramp 3 or the tetracycline fallback both leave you with a single-wavelength readout that cannot distinguish parent drug from core-retaining fragments (audit §2.1). The spectral transformation evidence (Week 16) is a partial defence; borrowed HPLC on 10–15 samples is the real one. That ask goes out in Week 1 because it expires on lead time, and it is the difference between a fourth award and a second.

**Utilisation is 88 %, not 75 %.** With the deep-UV build this plan uses 363 of your 414 available person-hours. That is workable but it is not comfortable, and the comfort comes entirely from the off-ramps: any of them lands you at 80–84 %. If you want genuine slack, the honest lever is still the one CLAUDE.md already names — two years, with March 2027 as a partial-data entry.

**The hour estimates are still estimates.** They come from the v2 task list, which was never validated against a stopwatch. The Week-4 checkpoint is the only thing standing between these numbers and a February surprise. Track actual hours from day one.

**No mentor is confirmed.** Nothing in this plan works without a Designated Supervisor in writing, and *E. coli* additionally needs the SRC's position on Form 6A. Both are Week-1 items and neither is under your control, which is exactly why they're in Week 1.
