# The Bench Bible — Every Procedure, Step by Step

**Rewritten 2026-09-13 against schedule v3.** This doc replaces the old 32-week roadmap *and* the separate `experimental-procedure.md`, which has been deleted. It is now the only place bench protocols live.

**What this doc is:** how to actually do each step, at the bench, in order, with numbers.
**What this doc is not:** a schedule. There are deliberately **no week numbers** here — that is `claude/schedule-v3-feasible.md`'s job, and keeping them in two places is exactly how the old 1 M quench survived in three documents at once.

| You want | Read |
|---|---|
| Explain the project to a person | `claude/phase-roadmap.md` |
| What to do which week, hours, trip-wires, cut ladder | `claude/schedule-v3-feasible.md` |
| Day-to-day checklist, synced between partners | Artifact "23 Weeks to Synopsys" |
| **How to perform a step** | **this doc** |
| Why the plan looks like this | `claude/feasibility-and-competitiveness-audit.md` |
| Reactor physics | `claude/reactor-findings-and-open-decisions.md` |
| Decisions, sources, corrections | `claude/CLAUDE.md` |

**Roles:** **[A]** reactor, chemistry, modelling · **[B]** instrument, bioassays, Search B · **[BOTH]** together. Both partners must be able to explain every step.

---

## 0. What changed from the old roadmap

If you have read the previous version, these are the things that are now different. Everything else carried over.

| Was | Now | Why |
|---|---|---|
| 4 factors incl. iron 0.1–2 g | **3 factors**; iron fixed after the baselines | 16 points in 4-D is ~2 per dimension, too sparse for the optimizer to beat guessing |
| Lattice 20 mm in a 25 mm bore | **23 mm core + 2 mm collar rings** (24.6 mm OD) | A 20 mm core leaves a smooth gap that ~48 % of the water would take instead of going through the iron |
| Residence from "reactor volume (~50 mL)" | From **measured void volume** (~35 mL with the lattice in) | 50 mL is the empty tube. Using it makes every residence time ~41 % too high |
| Sampling port **before** the reactor | **Reactor outlet** | Recirculating a batch moves the measurable ceiling 6.5-fold across the residence axis for plumbing reasons alone |
| Removal measured as batch decay over 30 min | **Conversion per pass**, from paired inlet/outlet samples | Follows from outlet sampling. See §4 — this is the biggest practical change |
| Quench 0.3 mL of **1 M** thiosulfate | 0.3 mL of **0.4 M** | 1 M adds ~270 mOsm of salt to every sample, stunting roots in every dish including the controls |
| Baseline 4 = iron + persulfate + **UV LED** | UV arm **deleted** | A UV lamp on a light-sensitive drug read by fluorescence is a direct photolysis confound |
| Make **both** catalyst routes | **Steel wool only** | The diffusion analysis mechanistically favours wool; making both was hedging |
| 9-point physical grid | **In-silico grid** on the surrogate | 9 hand-run points prove nothing about grid-vs-optimizer in a 3-D space |
| 10 durability runs, 3 real-water matrices | **4 durability, 1 matrix ×2** | Scope cut to fit the hour ceiling; the trend is visible in 4 |
| ≈71 runs | **47 runs** | See §11 |
| Spectra saved "if you can" | **Required every sample** | Spectral shape change is the defence of the removal measurement |
| No simulation | **Surrogate + 500-seed in-silico study** | Carries the learning-curve claim, which 12 physical runs cannot |

---

## 1. Words used in this doc

- **The antibiotic.** **Ciprofloxacin** is the target; **tetracycline** is the pre-committed fallback if the instrument gate fails. Wherever this doc says "the antibiotic," it means whichever you ended up with.
- **Flow reactor — not a filter.** Nothing is trapped. The channels are 3.4 mm; the drug molecule is about a nanometre. Every molecule that enters leaves. It leaves *broken*. Never write "filter" anywhere.
- **Advanced oxidation.** Making radicals on purpose to tear a molecule apart.
- **Persulfate** (sodium persulfate). White powder oxidiser. Does almost nothing alone; on contact with iron it turns into radicals.
- **Radicals.** Very reactive, very short-lived. Two matter here: the **sulfate radical** and the **hydroxyl radical**.
- **Activation.** What iron does to persulfate to make radicals.
- **Transformation products.** The pieces left after the drug breaks up. Harmless or harmful — unknown without testing. This is the whole point of the project.
- **Quenching.** Killing leftover persulfate in a sample with sodium thiosulfate, so the reaction stops at the moment you sampled. Skip it and every number is wrong.
- **Fluorescence.** Some molecules glow when hit with the right light. Ciprofloxacin lit at ~280 nm glows blue at ~450 nm, and the brightness tracks concentration. Tetracycline is read by **absorbance** at ~365 nm instead.
- **Core integrity.** What a single-wavelength reading actually measures: how much of the light-active part of the molecule survives. Not the same as how much intact parent drug survives. Read §12.
- **Residence time (τ).** How long water spends inside the reactor in one pass. Measured void volume ÷ flow rate.
- **Conversion per pass (X).** The fraction of drug destroyed in one trip through the reactor. `(C_in − C_out) ÷ C_in`. This is the project's headline measurement.
- **Rate constant (k).** One number for how fast the reaction goes. From conversion and residence time: `k = −ln(1 − X) ÷ τ`.
- **Bioassay.** A test on something alive. Radish root length, and *E. coli* growth.
- **Toxicity index.** Average root length in treated water ÷ average root length in clean water. 1.0 = harmless. 0.5 = roots half as long.
- **Iron leaching.** Iron dissolving off the lattice into the water. Measured to prove the catalyst stays put.
- **Optimizer.** A program that looks at every run so far and proposes the next one.
- **Surrogate.** A model fitted to your real runs that predicts what an unrun setting would give. Lets you rehearse thousands of searches for free.
- **Pareto front.** The set of settings where you cannot improve removal without making toxicity worse. Reporting the front means never having to defend a weighting between the two.
- **Run.** One reactor experiment at one setting. Numbered R-001, R-002, …

---

## 2. Ground rules [BOTH]

1. One shared bound notebook lives in the lab; each partner also keeps their own. Every run gets a number used in the notebook, the spreadsheet, and on every tube.
2. One master spreadsheet is the single source of truth. **[A]** enters settings and raw readings; **[B]** enters calculated values, bioassay scores and model output. Never two copies.
3. A GitHub repo owned by **[B]**: `data/`, `notebooks/`, `hardware/`, `figures/`, `paper/`. **[A]** commits lattice files and photos.
4. A 45-minute sync the same day every week.
5. Runs happen Monday–Wednesday in batches of three or four. Bioassay dishes go in Wednesday, roots are scored the following Monday. **Hard ceiling of 5 reactor runs a week** — that is what 3 lab days allows.
6. The hypothesis and *both* possible conclusions go in writing before the first run. "If the two searches differ, removal is a misleading number for this chemistry. If they agree, removal is a valid safety proxy here." This is what makes a null result respectable instead of a disappointment.
7. Failed runs stay in the spreadsheet marked `failed` with the reason, and get redone under a new number. **Never delete data.**
8. Every optimizer proposal is committed to the repo with a timestamp **before** it is run.

---

## 3. Budget and safety

**≈ $480 without a borrowed instrument.**

| Item | Cost | Owner |
|---|---|---|
| Sodium persulfate, 500 g | $30 | [A] |
| Ciprofloxacin standard 5 g (or tetracycline HCl 5 g); methylene blue 10 g for practice | $70 | [A] |
| tert-Butanol 500 mL, methanol 500 mL (scavenger tests); sodium thiosulfate 500 g (quench) | $60 | [A] |
| 1,10-phenanthroline 5 g, hydroxylamine hydrochloride, sodium acetate (iron test) | $40 | [A] |
| Steel wool (grade 0000); HCl and NaOH from school stock | $10 | [A] |
| PETG filament | $40 | [A] |
| Clear tube 25 mm bore, end caps, hose barbs, silicone tubing, 12 V peristaltic pump, T-fittings and taps ×2 | $75 | [A] |
| Detector: TSL2591 sensor, Arduino Nano, printed holder, **~280 nm UV-C LED + ~450 nm filter + quartz cuvettes** for cipro fluorescence — **or** a 365 nm LED + plastic cuvettes for tetracycline absorbance | $55–95 | [B] |
| Radish seeds (2,000+), Petri dishes (100), filter paper, ruler, conductivity meter | $55 | [B] |
| *E. coli* K-12, nutrient broth, sterile tubes, incubator, bleach | $50 | [B] |
| Gloves, goggles, waste carboy, labels | $30 | [BOTH] |

Quartz cuvettes are the line item people forget. Plastic is opaque below about 300 nm, so the cipro build needs quartz and the tetracycline build does not.

**Safety, in one paragraph.** Persulfate is an oxidiser: store it away from alcohols and organics and never heat it in a sealed container. Handle persulfate and the antibiotic in the fume hood with gloves and goggles. If you build the fluorescence reader, its ~280 nm UV-C LED harms eyes and skin — enclose it so it only ever shines inside the closed holder, and never look at it directly. Every sample and all reactor waste is quenched with thiosulfate before it goes in the carboy. Never run the reactor unattended; a supervisor is present for every run. Bleach every bacteria tube (10 % bleach, 30 minutes) before disposal.

---

## 4. The standard run — read this before any other protocol

Every experiment follows this unless a protocol says otherwise. **This is the step that changed most**, because samples now come from the reactor outlet rather than the reservoir.

### Why it changed

The old recipe recirculated 500 mL and watched the concentration fall over 30 minutes. The problem: at a 20-minute residence time the pump only moves ~53 mL in half an hour, so **90 % of the batch never enters the reactor at all**. Measured "removal" would then be capped at about 10 % for plumbing reasons, and 65 % at the fastest setting — a 6.5-fold swing across the residence axis that has nothing to do with chemistry. The optimizer would have learned that short residence times work well, which would have looked like a result and been an artifact.

Sampling the outlet measures **how much is destroyed in one pass through the reactor**, which is a real property of the reactor and does not depend on batch size or how long you let it run.

### The recipe

1. **Prepare the feed.** 500 mL distilled water in the reservoir. Add the antibiotic to 20 mg/L. Adjust pH with drops of dilute HCl or NaOH to this run's value. Record the **measured** pH, not the intended one.
2. **Install the lattice** with the standard iron loading. Record `lattice_id` and its mass.
3. **Set the pump** to the speed giving this run's residence time, from your flow table. `residence_min = void_volume_mL_measured ÷ flow_mL_min`.
4. **Take the inlet zero sample** — 3 mL from the reservoir tap, before any persulfate. Quench, filter, read. This is C₀.
5. **Start.** Add the persulfate (10 mM = 1.19 g per 500 mL; 0.5 mM = 0.06 g). Swirl until dissolved. Start the pump and the timer.
6. **Let it reach steady state.** Wait **three residence times** before the first real sample. At τ = 2 min that's 6 minutes; at τ = 20 min it's an hour. Plan the day around the slow settings.
7. **Take paired samples** at three time points after steady state, roughly 5 minutes apart: one from the **reservoir tap (inlet)** and one from the **reactor outlet tap**, as close to simultaneous as you can manage. Quench and filter both. Six tubes per run.
8. **Conversion per pass** `X = (C_in − C_out) ÷ C_in` for each pair. The three values should agree within a few percent. If they drift downward, the catalyst is deactivating during the run — write that down, it's a real observation.
9. **Iron sample.** At the end, 5 mL from the outlet for the leaching test (every third run, and every durability run).
10. **Bioassay sample.** The **outlet** sample is the treated water. That is what goes on the radish dishes and into the bacteria tubes. Never the reservoir — at low flow the reservoir is mostly untreated water, and testing it would report dilution as safety.
11. **Shut down.** Pump the reservoir into the already-quenched waste carboy. Rinse the loop twice with tap water. Remove, rinse, dry and label the lattice.
12. **Record everything**, including anything odd — leak, colour change, bubbles, pump noise.

**Calculations [B]:** convert every reading to concentration from the calibration line; `X` per pair, then the run's mean X; `k = −ln(1 − X) ÷ τ`; toxicity index after five days.

---

## 5. Build protocols

### 5.1 Steel-wool catalyst [A]

1. Cut grade-0000 steel wool into 1 g pieces. Weigh each on the balance and write the mass on a labelled bag.
2. Soak in ethanol 5 minutes to remove the factory oil. Dip in 0.5 M HCl for 30 seconds to strip the surface. Rinse three times in distilled water. Pat dry.
3. Use within an hour or it rusts unevenly.
4. Thread through the lattice channels and reweigh the lattice. The difference is your iron loading.

Iron mass is **fixed** for the whole project at the value chosen after the baselines. Load every lattice to the same mass, within ±5 %.

*Why wool and not a dip-coated channel:* in this reactor the water creeps rather than mixes (Reynolds number 0.3 to 7), so molecules only reach the iron by drifting. Across an open 3.4 mm channel they mostly don't. The wool fibres shrink that distance into a range that works. This is a testable prediction — wool should beat a bare coated channel at equal iron mass.

### 5.2 Lattice [A]

1. In Fusion 360 or Tinkercad: a **23 mm** diameter × 80 mm cylinder with a gyroid or cross-hatch pattern, about 60 % open.
2. Add **integral collar rings, 2 mm thick, at 24.6 mm outside diameter** — a few along the length. These block the gap between the lattice and the 25 mm tube wall. Without them almost half the water slides past the iron down the smooth outer gap.
3. Print in PETG. It resists acid better than PLA. Print four.
4. Check it slides into the tube with the collars just touching.

Gyroid is preferred over cross-hatch: more surface area, and shorter distances for molecules to drift to the iron.

*Worth revisiting:* pressure drop across the lattice is about 0.04–0.43 Pa — roughly the weight of a hair. The pump will not notice it. The 60 % porosity was inherited, not calculated, and there is four orders of magnitude of headroom, so a denser lattice with finer features would cost nothing hydraulically and would give more iron and shorter drift distances. Decide before printing the final set.

### 5.3 Reactor loop [A]

1. Reservoir: 1 L glass bottle, lid drilled for two tubing lines.
2. Reservoir → 12 V peristaltic pump → **bottom** of the reactor tube → out the **top** → back to the reservoir. Feeding from the bottom keeps air from pocketing in the lattice.
3. Reactor body: clear PVC or acrylic, **25 mm inside diameter**, 100 mm long, threaded or push-fit cap each end with a hose barb.
4. **Two sampling taps, not one.** A T-fitting with a tap on the reservoir line (inlet), and a second on the outlet line as close to the reactor as possible.
5. Fill with tap water and run two hours. Fix every leak before going further.
6. **Flow table:** run the outlet into a measuring cylinder for exactly 60 seconds at each of three pump settings. Repeat each three times. Record mL/min.

### 5.4 Void volume [A]

Do this once per lattice geometry, with the lattice fitted.

1. Assemble the reactor dry with the lattice inside, caps on.
2. Fill it completely from a graduated syringe, counting the millilitres that go in.
3. Repeat three times and average. Expect roughly **35 mL**, not the 49 mL of the empty tube.
4. Record as `void_volume_mL_measured`. Every residence time in the project comes from this number.

### 5.5 Detector [B]

**First: try to avoid building one.** A borrowed spectrofluorometer or scanning UV-Vis is worth about 30 hours. Ask universities, community colleges, and water-district labs.

**Second: try the easy build.** Before committing to deep UV, test whether a **365 nm LED** excites enough fluorescence from ciprofloxacin at 20 mg/L to read at 450 nm. Cipro's strongest excitation is around 275–280 nm, but if a longer-wavelength shoulder gives usable signal, you can use plastic cuvettes and an ordinary LED, and the build collapses to roughly the tetracycline instrument plus a filter. **This is untested — it is a hypothesis to check in an hour, not a fact.** If it works it saves about 16 hours.

**Ciprofloxacin, fluorescence (the full build):**
1. The ~280 nm UV-C LED shines into the cuvette from the side. The TSL2591 sits at **90°** behind a ~450 nm filter, so it sees the glow and not the lamp.
2. **Quartz cuvettes.** Plastic is opaque below ~300 nm.
3. Fully enclose the LED. It is an eye and skin hazard.
4. Baffle everything. Stray light is the main failure mode of a 90° instrument — matt black inside, and a light trap opposite the LED.
5. Fixed-current resistor on the LED so brightness never drifts with battery state.
6. Arduino: LED on, wait 1 s, read the sensor 10 times, print the average. Python on the laptop logs it.
7. Fluorescence *rises* with concentration, unlike absorbance.

**Tetracycline, absorbance:** 365 nm LED and TSL2591 in a straight line through a plastic cuvette. `Absorbance = log₁₀(blank reading ÷ sample reading)`.

**Validation, either build:**
- Blank cuvette, one reading a minute for 30 minutes. Drift must be under 1 %. If not, warm the LED 5 minutes before every use.
- Linearity across a dilution series. For fluorescence, find where the line stops being straight and stay below it.
- Dark current with the LED off.
- Detection limit = 3 × (standard deviation of blank readings) ÷ slope. Target under 1 mg/L.

**Record the full spectrum for every sample** if the instrument can scan. Not just one number. See §12.

---

## 6. Measurement protocols

### 6.1 Calibration curve [B]

1. Stock: 0.010 g antibiotic in 100 mL distilled water = 100 mg/L. Keep it dark — these drugs break down in light. Make fresh weekly.
2. Dilute to 0, 2, 5, 10, 20, 40 mg/L in pH 7 phosphate buffer.
3. Read each three times. Plot signal against concentration and fit a line, staying inside the straight region.
4. Compute the detection limit.
5. Re-run a mid-range standard at the start of every lab day as a drift check.

### 6.2 Interference check [A]

Read, the same way you read samples: (a) 10 mM persulfate in water; (b) water pumped through an iron-loaded lattice with no persulfate, then filtered; (c) quench solution diluted as it will be in a sample.

Anything giving more than ~2 % of your lowest standard means every sample needs a matched blank. For cipro also check whether dissolved iron *quenches* the fluorescence — if it does, the 0.45 µm filter plus the leaching data cover you, but you need to know.

**Spike recovery:** add a known amount of antibiotic to reactor effluent and read it back. You want 85–115 %. If not, the blanks are wrong.

### 6.3 Sampling and quench card [BOTH]

Write this on a card and tape it above the bench.

1. Open the tap; collect **3 mL** in a labelled tube. Inlet and outlet are separate tubes, labelled.
2. Immediately add **0.3 mL of 0.4 M sodium thiosulfate**. Cap, invert twice.
3. Push through a 0.45 µm syringe filter into a clean tube.
4. Read within 10 minutes.
5. **Measure conductivity** and record it.
6. Freeze the remainder, labelled with run number, tap, and time.

**Why 0.4 M and not 1 M.** At the highest persulfate setting a 3 mL sample holds 30 µmol of persulfate, and the reaction needs 2 thiosulfate per persulfate, so 60 µmol does the job. The old recipe added 300 µmol — five times more than needed — which loaded every sample with about 270 mOsm of salt. Salt stunts radish roots on its own, in every dish including the controls, which flattens the whole assay. And because the leftover varies with the persulfate setting, Search B would have learned "less persulfate is safer" when it was really reading salt. 0.4 M gives a 2× safety margin at the worst case and 2.5× less salt. Conductivity on every sample is how you prove the remaining effect isn't ionic.

### 6.4 Iron leaching [A]

1. Reagents: 0.1 g 1,10-phenanthroline in 100 mL water with a few drops of HCl; hydroxylamine solution (10 g in 100 mL); acetate buffer pH 4.5.
2. Calibration: iron(II) sulfate at 0, 0.5, 1, 2, 5 mg/L. To 5 mL of each add 0.5 mL hydroxylamine, 1 mL buffer, 1 mL phenanthroline. Wait 10 minutes. Read at 510 nm — it goes orange-red. Plot the line.
3. Treat the end-of-run outlet sample identically.
4. Run this on **every third run and every durability run** — you need the trend, not 47 points.
5. If cumulative leached iron exceeds 10 % of what you loaded, the iron is dissolving rather than working as a fixed catalyst. Say so; it is an honest and interesting result.

### 6.5 Radish bioassay [B]

1. Filter-paper circle in a Petri dish. **20 radish seeds** spread evenly.
2. Add exactly **5 mL** of test water — the thawed, quenched **outlet** sample.
3. Cover and label. Three days in a dark drawer, then two days under a lamp or window, at room temperature.
4. Day 5: count how many sprouted, and measure every root with a ruler, or photograph beside a ruler and measure on screen.
5. **Three dishes per sample**, so you get a spread and not just a number.
6. **Controls in every batch, three dishes each:** distilled water · untreated 20 mg/L antibiotic · quench-only water (distilled water through the full quench step).
7. `Toxicity index = mean root length in test water ÷ mean root length in distilled water`. Also report it against the quench-only control.

**The salt calibration series — do this once, early.** Set up dishes across a range of Na₂SO₄ concentrations spanning the ionic strengths your samples will actually have, measured as conductivity. This gives you a root-length-versus-salt curve, so any toxicity you report can be shown to be *chemical* and not osmotic. It costs one afternoon of Petri dishes and it converts a reviewer's strongest objection into a covariate you have already handled.

### 6.6 *E. coli* bioassay [B] — with the biology teacher

Needs Form 6A, BSL-1 conditions and a Designated Supervisor. Start the paperwork early; it cannot be compressed later.

1. Grow *E. coli* K-12 overnight in nutrient broth at 37 °C.
2. Dilute with fresh broth until faintly cloudy.
3. In sterile tubes, mix 1 mL of that with 1 mL of test water. Three tubes per sample.
4. Controls: distilled water · untreated antibiotic · quench-only water.
5. Incubate 6–8 hours at 37 °C.
6. Read cloudiness at 600 nm. `Growth % = reading ÷ distilled-water reading × 100`.
7. Low growth means the water still behaves like an antibiotic — still applying the pressure that breeds resistance.
8. Bleach every tube (10 %, 30 minutes) before disposal.

This is the endpoint the project's motivation is actually about, and it is also your insurance: if radish turns out not to respond, this becomes the in-loop test instead.

### 6.7 Radical scavenger tests [A] run, [BOTH] interpret

Four runs at the best settings found in the mapping block.

1. **Normal** — the control.
2. **tert-Butanol**, 100 mM (≈ 4.7 mL in 500 mL), added before the persulfate. Soaks up hydroxyl radicals only.
3. **Methanol**, 100 mM (≈ 2.0 mL), instead. Soaks up both hydroxyl and sulfate radicals.
4. **Nitrogen purge** — bubble nitrogen through the reservoir 15 minutes before and during the run. Removes dissolved oxygen.

Compare k. If methanol slows things much more than tert-butanol, the **sulfate radical** is doing most of the work. If nitrogen barely matters, oxygen isn't involved. Write one paragraph on what you found and why it might affect which fragments form. Both partners rehearse saying it out loud — this is a favourite judging question.

### 6.8 Dye-pulse residence time test [A]

One afternoon, and it checks whether water really flows the way the model assumes.

1. With the reactor running on clean water at a known pump setting, inject a small slug of food colouring at the inlet.
2. Film the outlet with a phone.
3. Time when colour first appears, when it peaks, and when it clears.

First appearance much earlier than the calculated residence time means some water is short-circuiting. A long tail means dead zones. This is real measured evidence about the reactor, and at a fair, measured beats simulated. It is also why the project is not doing CFD: the arithmetic already found the problems worth finding, and unvalidated simulation is a liability the first time a judge asks about mesh independence.

---

## 7. Controls, every batch

- Distilled water — roots should grow normally.
- Untreated 20 mg/L antibiotic — roots should grow poorly, proving the assay can detect the drug at all.
- Quench-only water — proves the thiosulfate itself is harmless at 0.4 M.
- Persulfate-only and iron-only baselines — prove both are needed.
- Matrix-only water, untreated, for the real-water runs.
- A mid-range calibration standard at the start of each lab day.

---

## 8. What to record, every run

`run_id` · `date` · `operator` · `antibiotic` · `lattice_id` · `lattice_geometry` · `lattice_bare_mass_g` · `iron_g` · `void_volume_mL_measured` · `pH_measured` · `persulfate_g` · `pump_setting` · `flow_mL_min` · `residence_min` · `sample_point` · `signal_in_1..3` · `signal_out_1..3` · `spectrum_file` · `C_in`, `C_out` · `conversion_X` · `k` · `conductivity_uS` · `iron_leach_mgL` · `radish_germ` · `radish_root_mm_avg` · `toxicity_index` · `ecoli_growth_pct` · `notes`

`residence_min` is computed from `void_volume_mL_measured ÷ flow_mL_min`. Never from 50 mL.

---

## 9. Division of labour

| Area | [A] | [B] | [BOTH] |
|---|---|---|---|
| Catalyst, lattice, reactor build, flow and void calibration | ● | | |
| Running reactor experiments, quench, iron test | ● | ● | ● (quench card sign-off) |
| Detector build, calibration, saving spectra | | ● | |
| Kinetics and conversion code | ● | | |
| Surrogate model, SHAP, **in-silico study** | ● | | |
| Search A (removal only) | ● | | |
| Search B (multi-objective, Pareto) | | ● | |
| Radish assay, salt series | | ● | |
| *E. coli* assay | | ● | |
| Scavenger tests | ● | | ● (interpretation) |
| Statistics, figures | ● (chemistry) | ● (ML) | |
| Cost model | ● | | |
| Methods, introduction | ● | | |
| Results | | ● | |
| Discussion, limitations, abstract, talk, safety | | | ● |

Both partners run the reactor and each owns one optimizer, deliberately — so neither of you ever has to tell a judge "that was my partner's half."

---

## 10. Run count

| Block | Runs | Protected? |
|---|---|---|
| Dye practice | 3 | no |
| Antibiotic baselines (synergy figure) | 4 | no |
| **Round-one map** | **12** | **yes** |
| **Radical scavengers** | **4** | **yes** |
| **Physical searches** (3 rounds × 2 proposals × 2 optimizers) | **12** | **yes** |
| **Confirmation** | **6** | **yes** |
| Durability | 4 | no |
| Real water (1 matrix, duplicate) | 2 | no |
| **Total** | **47** | **34 protected** |

If you fall behind, cut in this order: real water → durability 4→2 → *E. coli* 6→3 → the PLS soft sensor → baselines 4→3. **Never cut** the 34 protected runs or the in-silico study.

---

## 11. Risks and fallbacks

| Risk | Early sign | Fallback | Owner |
|---|---|---|---|
| Radish can't tell treated from untreated | Week-1 pilot: index 0.95 ± 0.08 on untreated drug | Raise starting concentration; extend to 7 days; if still flat, *E. coli* becomes the in-loop test | [B] |
| Can't measure ciprofloxacin cheaply | No borrowed instrument, 365 nm excitation fails | **Pre-committed:** switch to tetracycline. Decided by Friday of the gate week, not later | [BOTH] |
| Detector can't reach low concentrations | Detection limit > 2 mg/L | Borrow an instrument weekly; start runs at 40 mg/L | [B] |
| Persulfate or iron interferes with the signal | Interference check | Matched blanks; spike recovery; filter before reading | [A]+[B] |
| Toxicity signal is really just salt | Conductivity correlates with toxicity index | The Na₂SO₄ curve lets you regress it out; report both | [B] |
| Iron dissolves rather than catalysing | > 10 % leached | Report dissolved vs. attached share honestly; it is a real finding, not a failure | [A] |
| Water short-circuits past the lattice | Dye appears at the outlet far too early | Check collar fit; reprint with more collars | [A] |
| Optimizer proposes something unsafe | Any proposal week | Tighter limits, supervisor sign-off before running | [BOTH] |
| Both searches agree | Confirmation week | Pre-written null framing; the map carries the poster. Do not spin it | [BOTH] |
| Surrogate doesn't predict held-out runs | In-silico week | Report the model's limits; the physical searches still stand on their own | [A] |
| A partner falls behind | A missed sync | Rebalance at the sync, out loud, never silently | [BOTH] |

---

## 12. The honest weakness, and what to do about it

A single-wavelength reading measures **how much of the light-active part of the molecule survives** — not how much intact drug survives. Ciprofloxacin's first and most common fragments keep the quinolone core, which is exactly why it was chosen (those fragments stay antibacterial, so the two searches have the best chance of diverging). But that same core is what glows. So a fragment can read as parent drug.

Worse, the confound points the same way as the other axis: core intact means **still fluorescent** *and* **still antibacterial**. Your removal number and your *E. coli* number are partly measuring the same thing, which could manufacture or mask the headline correlation.

Three defences, all in the plan:

1. **Save the whole spectrum, every sample.** A change in its *shape* — a shifted peak, a changed ratio between two wavelengths — is evidence that transformation happened, without identifying anything. This is why spectra moved from optional to required.
2. **Borrow HPLC or LC-MS for 10–15 samples** spanning the design space, and plot them against your own instrument. This is the real answer, and the ask has to go out in the first week because lead times are long.
3. **Lean on the biology.** What a radish root or a bacterium does in the water is a direct measurement of effect, not a proxy for composition.

The sharpened way to state the hypothesis, which turns the weakness into a prediction: core integrity *should* predict residual antibacterial activity — so expect the *E. coli* endpoint to agree with removal and give you a null — and *should not* predict ecotoxicity, so the radish endpoint is where any divergence will live. Writing that down in advance is what separates a pre-registered prediction from a post-hoc explanation.

**Say this out loud at judging before you're asked.** "We measured what the water does, not what's in it" is a strong sentence when you volunteer it and a weak one when it's dragged out of you.
