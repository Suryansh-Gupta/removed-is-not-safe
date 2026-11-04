# Feasibility and Competitiveness Audit

Captured 2026-09-12. Companion to `claude/reactor-findings-and-open-decisions.md` and `claude/schedule-v2-23-weeks.md`.

**Read before Week 1 ends.** Four of the seven recommended changes are free, and three of them expire (they are week-1 or week-2 actions whose value collapses by Week 6).

---

## 1. Verdict

**Competitive:** Yes as an idea, conditionally as an execution. The framing (bioassay inside the loop, pre-registered map, Pareto front instead of a defended λ, timestamped proposals, honest novelty statement) is above the level of most high-school work, and `reactor-findings-and-open-decisions.md` — finding the bypass annulus and the recirculation ceiling by arithmetic before building — is itself a judging asset. At Synopsys this should place and advance. At ISEF the ceiling is set by one thing only: whether "percent removed" survives the first analytical question. Right now it does not.

**Feasible:** Not as written. The science is feasible at roughly 65 % of the planned scope. The plan is ~30–40 % over capacity with zero buffer, and the two highest-risk assumptions are tested at Weeks 7–8, by which point five months of build work is already sunk in them.

---

## 2. The headline figure has three confounds

The whole project reduces to one graph: toxicity index (y) against % removal (x), ~40 points. Three separate mechanisms can put structure in that graph with no chemistry involved.

### 2.1 The removal axis does not measure the drug (most serious)

A single-wavelength fluorescence readout (~280 ex / ~450 em) measures *quinolone-core-containing species weighted by quantum yield*, not ciprofloxacin. The first and most abundant AOP transformation products of ciprofloxacin come from piperazine-ring modification and retain the core — which is exactly why cipro was chosen on 09-10 (TPs stay antibacterial, so the searches can diverge). The same retention means those TPs keep fluorescing. So the instrument reports the drug as still present when it has in fact been transformed.

This is worse than ordinary measurement error, because it is **correlated with the other axis**. Core intact → still fluorescent *and* still antibacterial. Fluorescence-removal and *E. coli* inhibition are therefore not two independent measurements; they are two proxies for the same latent variable. That can manufacture the headline correlation or mask it, and there is no way to tell which from the data as planned.

A judge with any analytical chemistry background asks "how do you know that's the parent and not a fragment absorbing at the same wavelength?" in the first two minutes. "No LC-MS required" is recorded in the decision log as a feature; at CSEF/ISEF it is the single biggest liability.

*Note:* the same logic applies to tetracycline at 365 nm (naphthacene core), so switching the target does not escape it.

**Fixes, cheapest first.**
- **Record the full spectrum on every sample, not one number.** A shift in the absorbance ratio (e.g. 275/320) or in the emission peak position is evidence that what remains is not parent, without identifying anything. This costs nothing if the instrument can scan, and it turns the weakness into a figure.
- **Promote the spectral soft sensor from bonus to core.** Its real job is not "predict radish from spectrum" — it is "prove spectrally that transformation occurred." Reframed that way it defends the headline instead of decorating it.
- **Beg 10–15 samples of HPLC time.** A community college, a university outreach lab, or a water-district analytical lab (Valley Water, SFPUC) — 15 samples spanning the design space, run against the photometer, produces a validation figure that answers the killer question outright. Week 1 already has "email two university labs"; upgrade that from optional to gating and widen the list. Lead times are long; this ask expires.

### 2.2 The removal axis is hydraulically confounded

Already documented as §2.3 of the reactor findings and still open. The measurable ceiling moves 6.5-fold across the residence-time axis for purely hydraulic reasons. Unresolved, this alone puts a strong false trend in the x-axis. **Decide it in Week 4 as scheduled** — outlet sampling (option a) is the cleanest and also makes "removal %" mean something independent of batch size.

### 2.3 The toxicity axis is osmotically confounded

Arithmetic on the current quench card: 3 mL sample + 0.3 mL of 1 M sodium thiosulfate = ~90 mM thiosulfate in the sample, roughly **270 mOsm** of added salt before the sample's own sulfate is counted. The persulfate stoichiometry needs 2 mol thiosulfate per mol persulfate, so at the highest dose (10 mM in 3 mL = 30 µmol) only 60 µmol is required; 300 µmol is being added — five times the stoichiometric need.

Two consequences:

- **Dynamic range collapse.** Radish root elongation is salt-sensitive (I believe noticeable inhibition begins around 50–100 mM NaCl, i.e. 100–200 mOsm — *not verified, confirm in your own pilot*). At ~270 mOsm every dish is suppressed, including controls, so a toxicity index defined against distilled water sits near the bottom of its range for all runs and the TP signal has to be read out of the noise on a crushed baseline.
- **A false trend.** The variable part (persulfate-derived sulfate, ~1.5 to 30 mOsm across the dose axis) modulates the ionic load by ~10 %, tracking one of the optimizer's four axes. Search B would then "learn" that less persulfate is safer — an osmotic artifact reported as the project's headline finding.

**Fixes.** Drop the quench to 0.3 mL of **0.4 M** thiosulfate (same volume, 2× stoichiometric at the highest dose, 2.5× less salt). Run a one-off **Na₂SO₄ dose-response on the radish assay** so the ionic contribution can be regressed out rather than hoped away — one afternoon of Petri dishes, and it converts a reviewer's objection into a covariate. Measure conductivity on every bioassay sample. Keep the quench-only control, but report the toxicity index against *both* distilled water and the quench-matched blank.

### 2.4 Why this matters together

Three independent mechanisms, each capable of producing "high removal coincides with high toxicity" with no transformation-product chemistry involved. All three are cheap to fix now and expensive to fix after Week 10. This is the honest answer to "is it feasible": the experiment is feasible, the *inference* currently is not.

---

## 3. The ML claim is underpowered as scheduled — and the fix is free

Schedule v2 gives each search 3 rounds × 2 proposals = 6 physical points, plus the shared 10-run map. That is ~16 observations in a **4-dimensional** space — roughly two points per dimension. Below that density Bayesian optimization does not measurably beat random search, and a judge who has run BO will say so. Claim 3 in the overview ("~25 experiments vs. far more for grid search") cannot be demonstrated from 12 search runs at all.

Three changes, in order of leverage:

1. **Run the optimizer comparison in silico.** Fit a surrogate to the physical map + search runs, then run Search A and Search B 500 times each on it with different seeds. That produces the learning-curve claim *with error bars*, which 12 physical runs never will, and the physical runs become validation of the surrogate's predictions. This is standard practice, costs compute rather than lab time, and — critically — **decouples the ML thesis from lab throughput**, so a delayed build costs resolution instead of the whole claim. Highest-value single addition to the project.
2. **Cut to three factors.** Fix iron mass at one value validated in the baselines (the mass-transfer finding in §2.4 of the reactor doc already predicts steel wool at a given mass, so this is defensible on mechanism, not convenience). 16 points in 3D is arguable; in 4D it is not.
3. **Delete the 6 physical grid runs and reinvest them.** Six points in a 4-factor space is not a grid and proves nothing about grid-vs-BO; do that comparison in silico on the validated surrogate. With durability trimmed 6→4, that frees 8 runs → searches go from 12 to 20, i.e. **5 rounds each**. Five rounds is enough to show learning. This trade is strictly better than the current allocation.

---

## 4. What the A-vs-B comparison actually proves

Search B optimizes removal *and* toxicity; of course its chosen point is less toxic. A sharp judge will call the secondary outcome definitionally true. The real question is the **magnitude of the trade-off**, which is the shape of the Pareto front.

The decision log already has this right (primary outcome = the map), but the poster sentence and the "headline" in `project-overview.md` both lead with the duel, which is the weaker claim. Lead with the map instead, and quantify it: Spearman ρ between removal and toxicity across the design space, plus the fraction of the space where high removal coincides with high toxicity. The A/B duel is the *demonstration*; the correlation is the *finding*.

**Sharper pre-registered hypothesis**, given §2.1: fluorescence-removal is a proxy for core integrity, so predict that core integrity (a) *does* predict residual antibacterial activity and (b) *does not* predict ecotoxicity. That is a hypothesis that forecasts its own results, which is what pre-registration is supposed to look like, and it assigns the two endpoints distinct jobs rather than treating them as interchangeable. It also implies the AMR endpoint will likely produce a **null** and the ecotox endpoint is where divergence lives — which is an argument for keeping radish in the loop, provided it responds at all (see §5).

---

## 5. Where the schedule actually breaks

Run execution is estimated honestly: ~2 person-hours per run × 56 runs is consistent with the procedure as written. The overrun is not there. It is in Weeks 1–8.

- The **fluorescence reader is a much harder build than the absorbance one**: ~280 nm excitation means a deep-UV LED, **quartz cuvettes** (plastic is opaque below ~300 nm), 90° geometry, an emission filter, stray-light control, and a detector with real sensitivity at 450 nm. 12 h is not a realistic estimate for a first build; 25–40 h is. Tetracycline at 357–365 nm needs a cheap LED and plastic cuvettes. **The 09-10 ciprofloxacin decision was made on good chemistry and may not have been priced for instrumentation.** Revisit it in Week 2 with an explicit decision rule, not by drift.
- First-time hardware generally runs 1.5–2× estimate. Applied to Phases 1–2 (~99 h combined) that is +50–100 h, or 5–10 of your 23 weeks, against **zero buffer**. The failure propagates to the search rounds, which are the one thing the schedule says never to cut.
- **Procurement risk:** ciprofloxacin is a prescription drug. An analytical standard needs a school or institutional account; tetracycline HCl is trivially available as an aquaculture product. This gates Week 2 and should be checked in Week 1.
- **Paperwork:** no Designated Supervisor or Qualified Scientist in writing, and *E. coli* K-12 needs Form 6A plus BSL-1. If the AMR endpoint becomes primary, this is gating and the clock starts now.

---

## 6. The two pilots that should move to this week

Both currently sit at Weeks 5–8. Both need no reactor, no lattice, and no optimizer, and both can invalidate the architecture.

1. **Radish dose-response to the chosen antibiotic.** Petri dishes, seeds, a dilution series of the parent drug, plus the Na₂SO₄ salt series from §2.3. If untreated 20 mg/L drug gives a toxicity index of 0.95 ± 0.08, the in-loop objective is noise and the whole design changes. The Week-8 checkpoint in CLAUDE.md already names this as the thing everything downstream depends on — which is precisely the argument for testing it in Week 1 instead of Week 8. Cost: a few dollars and five days of waiting.
2. **Readout feasibility on the chosen antibiotic.** Can the available instrument see it at all, at the concentration and in the matrix planned? This decides ciprofloxacin vs. tetracycline, and it decides whether the reader needs building at all.

---

## 7. Seven changes, ranked, with deadlines

| # | Change | Deadline | Cost | What it buys |
|---|---|---|---|---|
| 1 | Radish dose-response + salt series pilot | Week 1 | ~$10, 5 days | Kills or confirms the in-loop objective before five months are sunk in it |
| 2 | HPLC/LC-MS validation ask out to 5+ labs | Week 1 | 3 h of email | The difference between 4th and 2nd award; expires on lead time |
| 3 | Record full spectra, not single wavelengths; soft sensor → core | Week 2 | ~0 | Spectral evidence of transformation; defends the headline |
| 4 | In-silico BO study (500 seeds on a validated surrogate) | Week 13 | compute only | Learning-curve claim with error bars; decouples ML thesis from lab delays |
| 5 | Quench to 0.4 M; conductivity on every bioassay sample | Week 2 | ~0 | Removes the osmotic confound and its false trend |
| 6 | Cut grid runs (−6), durability 6→4 (−2); searches 12→20 | Week 13 | ~0 net | 5 BO rounds instead of 3 |
| 7 | Four factors → three (fix iron mass) | Week 8 | ~0 | Point density that makes BO defensible |

Changes 3, 5, 6 and 7 are free. Changes 1 and 2 expire. Change 4 is the one that protects the thesis when the schedule slips, which it will.

---

## 8. Minimum viable project

If the build overruns as expected, the version that still wins at Synopsys is: working reactor, ~25–30 runs, three factors, one in-loop bioassay with demonstrated dynamic range, the removal-vs-toxicity map with a real correlation coefficient and its confounds addressed, the in-silico optimizer study, scavenger mechanism evidence, and the cost model. That is ~60–65 % of the planned lab hours and loses nothing essential. Durability, real water, and the physical grid are all nice-to-have.

---

## 9. What is asserted here vs. verified

**Arithmetic, reliable:** thiosulfate molarity and osmotic load; persulfate stoichiometry; point-density-per-dimension counts.

**Chemical reasoning, confident but not checked against a specific paper:** that piperazine-modified ciprofloxacin TPs retain fluorescence; relative quantum yields are unknown to me. Worth 20 minutes with the Paul et al. *Water Research* paper already in the source list.

**From memory, verify with your own pilot:** radish salt-inhibition thresholds (~50–100 mM NaCl), and fluoroquinolone phytotoxicity ranges. Pilot 1 measures both directly, which is the point of running it first.

**Judgement, not fact:** the award-tier estimates, and the 1.5–2× overrun multiplier on first-time hardware.
