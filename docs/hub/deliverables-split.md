# Deliverables and the two-partner split

**Last updated:** 2026-09-29. **Status: CURRENT, assuming the team adopts the chlorine + ciprofloxacin switch on Wed 30 Sep** (see `chlorine-cipro-pivot-assessment.md`). If the team stays with persulfate + SMX, the 09-28 version of this split applies with SMX in place of cipro. **No names are assigned yet, by the owner's request.**

**Research question (draft):** *Can a chemistry-based model find chlorination settings that meet disinfection targets while keeping ciprofloxacin-derived antibacterial activity below a predefined limit in blind tests?*

## The rule: each partner does half of every kind of work

Split by side of the science, not by skill. Each partner builds a model **and** tests it in the lab, so both can explain the whole project to judges.

- **Partner A: chemistry and reactor.** What chlorine does to cipro, and the contact-chamber reactor.
- **Partner B: activity and optimizer.** Whether the water still stops bacteria, and the search for the best settings.

| | Computer work | Lab work |
|---|---|---|
| **A** | Chemistry model (3 subtasks below); Raspberry Pi control code; fitting chemistry numbers; chlorine use per 1,000 L | Chlorine (DPD) and cipro measurement calibration; building the contact chamber; tracer test; reactor runs; arranging LC-MS |
| **B** | Activity model; drug-only and simple baselines; Gaussian process + Bayesian optimizer; picking experiments; fitting activity numbers | Safety (SRC) approval; *E. coli* + resazurin test; quench/dechlorination validation; bacteria test on every sample; real effluent sample |

Track actual hours for 4 weeks; rebalance if one side runs heavy.

---

## Deliverables

| # | Deliverable | Owner | Due | Why it matters |
|---|---|---|---|---|
| 1 | **Chlorine backbone model**: free/combined chlorine, chloramine formation, chlorine demand, CT output | A | **Oct 2** | Every cipro reaction depends on how much HOCl is present; CT is the disinfection requirement |
| 2 | **Ciprofloxacin reaction model**: cipro + HOCl/chloramine → N-chloro intermediate → product groups; dechlorination step | A (B checks product groups) | **Oct 7** | Produces the molecules the activity model scores; includes the dechlorination-reversal test |
| 3 | **Flow-chamber model + validation**: tanks-in-series chamber, dosing points, fit to published data, mini blind test | A (B runs blind test) | **Oct 15** | Turns chemistry into outlet predictions for real settings; Checkpoint A |
| 4 | **Drug-only baseline model** | B | Oct 15 | The model you must beat. Built early so the comparison is fair |
| 5 | **Contact-chamber reactor v1**: 1 coiled tube, bleach pump, DPD + ORP + pH readings | A | Nov 15 | First contact with real chemistry; tracer test gives the flow behavior |
| 6 | **Activity test protocol**: *E. coli* K-12 + resazurin cipro dose–response, with quench/dechlorination controls | B | Dec 15 | Go/no-go gate; without a working test there's no activity result |
| 7 | **Activity model**: cipro + products × potency → predicted % inhibition | B | Dec 15 | Turns chemistry into the number the plate measures |
| 8 | **Full reactor**: bleach → ammonia → dechlorination dosing, Pi logging | A | Jan 15 | Lets you test free chlorine vs chloramine and dechlorination, the three real plant settings |
| 9 | **Window scan dataset**: activity vs contact time, free vs combined chlorine, before/after dechlorination | Both | Jan 15 | Answers whether activity survives removal, and whether dechlorination brings it back |
| 10 | **Optimizer + chosen experiments**: settings meeting disinfection CT + activity limit; 8–12 runs picked | B | Feb 5 | The decision the project is about |
| 11 | **Experiment + blind-test dataset**: 8–12 conditions × 3 independent runs + timestamped blind prediction | Both | Feb 28 | Strongest evidence; four-way comparison vs baselines |
| 12 | **Chlorine use / cost per 1,000 L** and real-effluent check | A (cost), B (effluent) | Mar | Plant-relevant numbers; real matrix test |
| 13 | **GitHub release**: code, data, test protocol | B leads, A adds device files | Mar | Reproducibility is part of the contribution |
| 14 | **Poster, report, 5-min talk each** | Both | Fair (~Mar 2027) | Both can explain everything |

---

## Deliverables 1–3 in detail: the chemistry model

Together they answer: *given a chlorine dose, contact time and ammonia level, how much cipro, chlorinated intermediate and product is in the water at the outlet?* Each is a working piece of code with its own check, so a late one doesn't hide inside a single big "model" deliverable.

### Deliverable 1 · Chlorine backbone model (what the chlorine itself does)
**Dates:** Wed Sep 30 – Fri Oct 2 · **Lead:** A

| Part | What to build | Why |
|---|---|---|
| Speciation | Split free chlorine into HOCl and OCl⁻ by pH (HOCl pKa ≈ 7.5) | HOCl is the form that attacks cipro; pH 7 vs 8 changes the speed several-fold |
| Chlorine demand/decay | A simple first-order loss of free chlorine to background organics (one fitted rate) | Real effluent eats chlorine; without this the model overestimates exposure |
| Chloramine formation | NH₃ + HOCl → NH₂Cl (rate constant ≈ 4×10⁶ M⁻¹s⁻¹, I believe; verify) | Ammonia in effluent converts free chlorine to chloramine, which reacts much more slowly with cipro. This is one of the knobs |
| CT output | Running integral of chlorine concentration × time | CT is how regulators judge disinfection; it becomes the optimizer's minimum requirement |

**Output:** free and combined chlorine vs time, plus CT. **Done when:** it runs, concentrations never go negative, and chlorine falls faster with more ammonia or organics.

### Deliverable 2 · Ciprofloxacin reaction model (what happens to the drug)
**Dates:** Fri Oct 2 – Wed Oct 7 · **Lead:** A, with B checking which products the activity model needs

| Part | What to build | Why |
|---|---|---|
| Cipro speciation | Split cipro into its charge forms by pH (check pKa values; commonly quoted ≈ 6.1 and 8.7) | Reaction speed depends on which form is present |
| Cipro + HOCl | Fast reaction at the piperazine nitrogen, forming an **N-chloro-cipro intermediate** (rate constants from Dodd 2005) | The main way cipro disappears |
| Cipro + chloramine | Slower reaction (Dodd 2005 combined-chlorine data) | Needed to compare free chlorine vs chloramine |
| Intermediate → products | N-chloro-cipro breaks down (piperazine fragmentation) into **2–3 lumped product groups**, e.g. "chlorinated products that keep the quinolone core" vs "further-degraded products" | The activity model scores these groups. The quinolone core is the part that kills bacteria, so keeping it separate matters (Jaén-Gil's chlorinated TP296 kept 30–44% activity) |
| Dechlorination step | Thiosulfate/bisulfite removes chlorine; **optional reaction: intermediate → back to cipro** | Tests the "does dechlorination bring the drug back?" question (El Najjar 2012 saw this for levofloxacin). Leave the rate as an unknown to measure |

**Output:** cipro, intermediate and product-group concentrations vs time. **Done when:** cipro disappears within seconds to minutes at mg/L chlorine (matching Dodd's fast kinetics), and more slowly with chloramine.

### Deliverable 3 · Flow-chamber model + validation (does it match reality?)
**Dates:** Wed Oct 7 – Wed Oct 14 · **Lead:** A; **B** runs the mini blind test and builds the drug-only baseline (Deliverable 4)

| Part | What to build | Why |
|---|---|---|
| Flow model | Contact chamber as a series of small mixed tanks (tanks-in-series); number of tanks set later from the Nov tracer test | Plant contact basins and a coiled tube behave like plug flow; this approximates it simply |
| Dosing points | Bleach at the inlet, optional ammonia, dechlorinating agent at the outlet | Matches the real reactor and plant layout |
| Published-data comparison | Digitize one dataset (candidates: Dodd 2005 real-water decay curves, Kennedy Neth 2019 author PDF, Jaén-Gil 2020); fit **only 1–2 numbers** (e.g. chlorine demand rate) | First honest test; fitting everything would hide errors |
| Mini blind test | Predict a second published condition without re-tuning; report % error | Practice for the real blind test |
| Drug-only baseline (Deliverable 4) | Assumes activity falls exactly as cipro falls | The comparison model; nearly free once Deliverable 2 exists |

**Output:** comparison plot with % error, blind-test error, 1-page summary. **Checkpoint A (Oct 15):** within ~20% of the published cipro decay curve. *If not:* check units, pH and speciation first; they cause most errors.

**Validation data blocker:** Pu 2020 no longer applies. Finding a usable published dataset is a **this-week task** (library request for Dodd 2005; try the Kennedy Neth author PDF).

---

## Partner timelines

### Partner A: chemistry and reactor
- **Sep 30 – Oct 15:** chemistry Deliverables 1–3; order parts (bleach, DPD kit, sodium bisulfite, ammonium chloride, tubing, pumps).
- **Oct 16 – Nov 15:** build a 1-tube contact chamber; calibrate DPD chlorine + ORP; calibrate cipro measurement (UV absorbance or fluorescence); tracer test; first cipro decay runs vs model.
- **Nov 16 – Dec 15:** model v2 (fit flow + demand to own data); prep ammonia and dechlorination dosing.
- **Dec 16 – Jan 15:** full reactor with 3 dosing points + Pi logging; window-scan runs (with B); ~3 LC-MS samples.
- **Jan – Feb:** run chosen experiments (3 independent runs each); ~6 LC-MS samples; refit chemistry numbers.
- **Mar:** chlorine use / cost per 1,000 L; device files for GitHub.

### Partner B: activity and optimizer
- **Sep 30 – Oct 15:** submit SRC paperwork; build the drug-only baseline; help validate Deliverable 3; collect published cipro activity data (Jaén-Gil 2020, Kennedy Neth 2019).
- **Oct 16 – Nov 15:** plan the bacteria protocol with the supervisor; draft the activity-model code using literature potencies.
- **Nov 16 – Dec 15:** cipro dose–response in *E. coli*; controls (bleach alone, bleach + quencher, quencher alone, ammonia alone, cell-free dye); compare thiosulfate vs bisulfite vs ascorbate quench; write down the activity limit. **Checkpoint B.**
- **Dec 16 – Jan 15:** bacteria test on window-scan samples; fit potency weights.
- **Jan – Feb:** Gaussian process + Bayesian optimization; pick 8–12 runs; bacteria test on every sample; four-way comparison.
- **Mar:** real effluent test; GitHub release lead.

### Both
- **Wed + Fri sessions (1.5 h):** joint work; results shared within 2 days.
- **Wed Sep 30:** lock the treatment choice and question.
- **Mid-Jan:** Checkpoint C, whether activity survives removal or returns after dechlorination.
- **Feb:** Checkpoint D, the blind test. Write the timestamped prediction together, then run it together.
- **Mar:** poster, report, practice judges' questions.

---

## Handoffs

| When | From → To | What |
|---|---|---|
| Oct 7 | A → B | List of product groups the model tracks, so B's activity model scores the same things |
| Oct 15 | A → B | Chemistry model v1 outputs over time |
| Nov 15 | A → B | Chamber flow rate, contact times, chlorine ranges achievable, so the bacteria tests cover real conditions |
| Dec 15 | B → A | Cipro dose–response curve + validated quench recipe; A uses the same quench on every reactor sample |
| Jan 15 | B → A | Combined chemistry + activity model ready for the optimizer |
| Feb 5 | B → A | Ordered list of 8–12 experiments with exact settings |
| Feb (each run) | A → B | Treated samples, quenched with the validated recipe, the same day |
