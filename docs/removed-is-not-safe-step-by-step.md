# Removed Is Not Safe: The Whole Project, Step by Step

Oct 12, 2026 · @anonymous

## 1. The problem

Treated wastewater still carries the antibiotic ciprofloxacin at levels that can breed drug-resistant bacteria. Chlorine, the chemical most plants use to disinfect, destroys ciprofloxacin, but the pieces it leaves may still attack bacteria. A test that says "the drug is gone" can miss that leftover activity.

**Ciprofloxacin ("cipro")** is a common antibiotic in the fluoroquinolone family. It kills bacteria by jamming the enzymes they use to untangle their DNA when they copy it. The part of the molecule that does this is a two-ring structure called the **quinolone core**. Anything that keeps the core intact may still be antibacterial.

**How cipro reaches the water.** People and animals excrete part of each dose unchanged. It goes down the drain to a **wastewater treatment plant**, which removes solids, lets bacteria eat most of the dissolved waste, then **disinfects** the water (kills germs) before releasing it.

**The local plant.** The San José–Santa Clara Regional Wastewater Facility disinfects with **sodium hypochlorite** (the chemical in bleach). It then removes the leftover chlorine with **sodium bisulfite**, a step called **dechlorination**, because chlorine harms fish. About 80% of the water flows through Artesian Slough into Coyote Creek and the South Bay. About 20% becomes recycled water.

**Why low levels matter.** Bacteria evolve resistance when an antibiotic is present at a level too low to kill them all but high enough to favour the tough ones. For cipro, that level is estimated at 0.064 micrograms per litre (µg/L). This estimate is called a **PNEC for resistance** (predicted no-effect concentration). A study of four New York plants found cipro at 0.20 to 1.4 µg/L, which is 3 to 22 times higher.

**Why "removed" is not "safe".** Two studies already point this way:

- Jaén-Gil et al. 2020: after chlorine removed all measurable cipro, the water's antibacterial activity went *up* at chlorine doses above 0.5 mg/L. One chlorinated product kept 30–44% of cipro's activity.
- Kennedy Neth et al. 2019: chlorinating fluoroquinolones left products that were still antibacterial.

Plants normally check only for the original drug, or nothing at all. California's bioassay screening of recycled water (lab tests that measure biological effects) has no antibacterial test. So no one routinely checks whether chlorinated water is still antibacterial.

## 2. The question and the hypothesis

**Research question (draft):** *Can a chemistry-based model find chlorination settings that meet disinfection targets while keeping ciprofloxacin-derived antibacterial activity below a predefined limit in blind tests?*

What each part means:

- **Chemistry-based model:** a computer program built from real chemical reactions and their measured speeds, not a curve fitted to data alone.
- **Chlorination settings:** the choices a plant operator makes: chlorine dose, contact time, whether ammonia is added, and how and when bisulfite is added.
- **Disinfection target:** plants must kill enough germs. Regulators judge this by **CT**, the chlorine concentration multiplied by the contact time (mg·min/L). Cutting chlorine to protect against cipro products is not allowed if CT falls short.
- **Antibacterial activity:** how strongly the treated water stops bacteria from growing in our test, from cipro and its products together.
- **Predefined limit:** the maximum activity we will accept, written down before any results, so we cannot move the goalposts.
- **Blind test:** the model predicts an experiment's result, the prediction is saved with a timestamp, and only then is the experiment run.

**Hypothesis:** at normal disinfection doses, cipro disappears, but chlorinated products keep measurable antibacterial activity. Whether ammonia is added, and how the water is dechlorinated, changes that activity in ways a model that tracks only the drug cannot predict.

**The two open questions ("gaps") the project targets:**

1. **Gap 1, chloramine.** When ammonia is in the water, chlorine turns into **chloramine**, a weaker and slower disinfectant. No study found so far measures the antibacterial activity left after chloramine treats cipro.
2. **Gap 2, dechlorination.** Chlorine first turns cipro into an intermediate, N-chloro-cipro (section 3). Dodd et al. 2005 suggested that a plant's dechlorination chemical could turn this back into cipro, but no one has measured whether it does. If it does, a plant could "remove" cipro and then partly bring it back.

## 3. The chemistry

Chlorine attacks cipro in under a second, but it does not destroy the part that kills bacteria. It makes an intermediate that falls apart over about 15–50 minutes into products that all keep the quinolone core. The constants below are from Dodd et al. 2005 unless marked.

### How fast reactions are measured

- **Concentration in M (molar):** moles of a substance per litre. 1 mg/L of cipro is about 3 × 10⁻⁶ M.
- **Rate constant (k):** a number that sets how fast a reaction runs. For two molecules reacting, rate = k × \[A\] × \[B\], and k has units of M⁻¹s⁻¹ (a **second-order** reaction). For one molecule breaking apart by itself, rate = k × \[A\], with units of s⁻¹ (a **first-order** reaction).
- **Half-life:** the time for half of a substance to be used up. For a first-order reaction it is 0.693 ÷ k.
- **pH and pKa:** pH measures how acidic water is (7 is neutral). A molecule's **pKa** is the pH at which half of it carries an extra hydrogen and half does not. Each form can react at a very different speed.

### Step by step

1. **Bleach becomes free chlorine.** In water, sodium hypochlorite forms **hypochlorous acid (HOCl)** and **hypochlorite ion (OCl⁻)**. Together these are **free chlorine**. HOCl is the strong attacker. Its pKa is 7.54, so at pH 7 about 78% is HOCl, and at pH 8 only about 26%.
2. **Cipro exists in three forms.** Its pKa values are 6.2 and 8.8. Below pH 6.2 it is mostly positively charged (**cation**), between 6.2 and 8.8 mostly **neutral**, and above 8.8 mostly negatively charged (**anion**). HOCl reacts with them at 4.3 × 10³, 3.8 × 10⁵ and 4.9 × 10⁷ M⁻¹s⁻¹. At pH 7 and 3 mg/L chlorine, half the cipro is gone in about 0.02 s.
3. **Cipro becomes N-chloro-cipro.** HOCl attaches a chlorine to a nitrogen atom on cipro's **piperazine ring** (a six-membered ring with two nitrogens, hanging off the core). The result, **N-chloro-cipro**, still has the whole quinolone core.
4. **N-chloro-cipro falls apart.** It breaks down by itself (**piperazine fragmentation**) at 2.4–7.6 × 10⁻⁴ s⁻¹ depending on pH, a half-life of about 15–48 minutes. Jasper et al. 2016 measured 5.6 × 10⁻⁴ s⁻¹ at pH 8.7, about 35% slower than Dodd's value. The first product is called **P1** in our model.
5. **P1 reacts further.** With more chlorine, P1 forms later products (**P2**), using about two chlorines each. Dodd reports that all these products keep the quinolone core. Kennedy Neth et al. 2019 found some later products lose the carboxyl group or the fluorine atom, which should switch off activity. So "keeps the core" is an upper limit on how much activity is left.

### Chloramine (Gap 1)

- **Formation:** HOCl + ammonia (NH₃) → **monochloramine (NH₂Cl)**, at 3.07 × 10⁶ M⁻¹s⁻¹ (Qiang and Adams 2004). Below a chlorine-to-ammonia-nitrogen mass ratio of about 5:1, monochloramine is the main product. Chloramine plus free chlorine together is called **total chlorine**; the chloramine part is **combined chlorine**.
- **Chloramine + cipro:** much slower, about 29 M⁻¹s⁻¹ (worked out from Dodd's data), so cipro lasts minutes to hours instead of milliseconds.
- **Monochloramine slowly breaks down** (**hydrolysis**, reaction with water) back into HOCl and ammonia, at about 2.1 × 10⁻⁵ s⁻¹ (Jafvert and Valentine 1992).
- **Key model result:** if ammonia and bleach are added together, cipro grabs the free chlorine before ammonia does. Testing chloramine fairly means adding chloramine that has already formed (**pre-formed chloramine**).
- **Safety:** never mix concentrated bleach and ammonia; it releases toxic chloramine gas.

### Chlorine demand

Real water contains other substances (organic matter, ammonia, metals) that use up chlorine. This loss is called **chlorine demand**. The model treats it as a first-order loss with one number fitted to each water.

### Dechlorination and quenching (Gap 2)

- **Bisulfite** removes free chlorine almost instantly. The open question is whether it also turns leftover N-chloro-cipro back into cipro. Dodd and Jasper both found that **thiosulfate**, a similar chemical, does.
- **Quenching** means adding a chemical to a sample to stop the reaction at a chosen moment. The choice of quench changes what you measure. Thiosulfate turns N-chloro-cipro back into cipro, so the cipro you then read is "cipro plus N-chloro-cipro". Kennedy Neth used hydrogen peroxide as the quench and found 28–38% of the cipro still there after 2 hours, while Dodd's kinetics predict none. The project will compare quenches on the same sample to settle this.

## 4. The computer model

The model is a chain of layers, each feeding the next: chemistry → flow → antibacterial activity → cost → optimizer. The chemistry and flow layers are built and partly validated. The activity, cost and optimizer layers come later, once lab data exist. The code is in the GitHub repo `removed-is-not-safe`.

| Layer | What it answers | Status (Oct 12) |
| --- | --- | --- |
| 1. Chlorine backbone | How much free chlorine and chloramine is there over time? | Built |
| 2. Cipro reactions | How much cipro, N-chloro-cipro, P1 and P2 is there over time? | Built |
| 3. Flow chamber | What leaves a real tube, given how water moves through it? | Built; needs the tracer test |
| 4. Validation and baselines | Does it match published data, and beat simpler models? | Provisional pass |
| 5. Activity | How much will the water stop bacteria? | Phase 3 |
| 6. Cost | What does a setting cost per 1,000 L? | Phase 5 |
| 7. Optimizer | What is the cheapest setting that meets both limits? | Phase 5 |

### Layers 1–2: chemistry as equations

Each reaction in section 3 becomes a rate equation. Together they form a set of **ordinary differential equations (ODEs)**: equations that say how fast each concentration changes, given all the others. A **numerical solver** steps forward in tiny time steps and adds up the changes. Our reactions run at wildly different speeds (milliseconds for cipro + HOCl, hours for chloramine breakdown). Equations like this are called **stiff**, so the code uses an **implicit (backward Euler) solver**, which stays stable with large steps.

**Sensitivity analysis** means nudging each constant and seeing how much the answer moves. Ours found the HOCl and chloramine constants barely matter. The N-chloro-cipro breakdown speed and the bisulfite reversal speed matter a lot, so those are the ones to measure.

### Layer 3: how water moves through the tube

- **Contact time / residence time:** how long water spends in the chamber. Mean residence time = volume ÷ flow rate.
- **Plug flow:** every bit of water spends exactly the same time inside, like a line of people walking at one speed. **Fully mixed:** water is stirred, so some leaves almost at once and some stays long.
- **Tanks in series:** the model treats the tube as N small stirred tanks one after another. N = 1 is fully mixed; large N approaches plug flow. Real chambers are in between.
- **Residence time distribution:** the spread of times different water spends inside. It is measured with a **tracer test**: inject a pulse of dye or salt and record how it comes out. That curve sets N.
- In a narrow lab tube at a few mL/min the flow is **laminar** (smooth layers; water at the centre moves about twice the average speed). Measured by the **Reynolds number**, which is below about 2,300 for laminar flow.

**Added Oct 15:**

- **Predicting the flow pattern:** from the tube's diameter and length and the pump flow, the model now works out whether diffusion across the tube evens out the speed differences (**Taylor dispersion**, a narrow spread, at slow flow) or not (**laminar convection**, a wide spread). For coiled tubes it also reports the **Dean number**, which measures how much the coil stirs the water sideways. The straight-tube prediction is the worst case; the tracer test gives the real answer.
- **Dichloramine:** monochloramine can pick up a second chlorine to become **dichloramine (NHCl₂)**. This matters only above a chlorine-to-ammonia ratio of about 5:1.

### Layer 4: checking the model

- **Validation** means comparing predictions with data the model was not built from. **Digitizing** means reading numbers off a published graph, with a tool such as WebPlotDigitizer.
- **Dodd 2005, Figure 5a** (cipro in real wastewater and drinking water): 14.5% (wastewater) and 8.6% (drinking water) average error with nothing fitted, on data digitized from the paper's figure on Oct 16. Checkpoint A passes (limit 20%). The earlier by-eye readings gave 13.7% and 8.1%.
- **Kennedy Neth 2019, chlorine use:** chlorine used in the first 10 minutes matched within 1.4%. By 2 hours, total CT is within 1–2% and leftover chlorine within 8–11%, now that later products use 2 chlorines each (Oct 6 fix).
- **Kennedy Neth 2019, Figure 2A:** fails. They saw about 30% of the cipro persist for 2 hours, while the model predicts none. The quench comparison in the lab should explain the difference.
- **Baselines** are simpler models the full model must beat. The **drug-only model** says cipro is gone instantly, so nothing is left to worry about. The **fitted curve** is one exponential decay fitted to the other water's data. Error on Dodd's data: full model 14.5% / 8.6%, fitted curve 18.1% / 15.2%, drug-only 100% (digitized data, Oct 16).
- **Out-of-sample** means scored on data the model never saw. The fitted curve is scored this way so the comparison is fair.

### Layer 5: from chemicals to bacteria (Phase 3)

- **Potency:** how strongly a molecule stops bacteria, compared with cipro (cipro = 1).
- **Cipro-equivalents:** each molecule's concentration × its potency, summed. The total says the water acts like this much pure cipro. Adding them up assumes effects are **additive**, which the project will test.
- **Dose–response curve:** the measured relationship between cipro concentration and % growth inhibition in our test. It converts cipro-equivalents into the % inhibition the plate should show. **IC50** is the concentration that stops 50% of growth; **MIC** (minimum inhibitory concentration) is the lowest that stops visible growth.
- First calibration data: Kennedy Neth's activity measurements, which stayed above what the leftover cipro explains.

### Layers 6–7: cost and the optimizer (Phase 5)

- **Cost layer:** chemical dose × price for bleach, ammonia and bisulfite → dollars per 1,000 L. Chemicals only.
- **Optimization:** find the setting with the lowest cost that still has CT ≥ the target (the **disinfection constraint**) and activity ≤ the limit (the **activity constraint**). A **constraint** is a rule the answer must obey.
- **The machine learning part.** If the full model is too slow to search directly, a **Gaussian process** is trained on many model runs. It is a fast stand-in (**surrogate**) that also says how unsure it is. **Bayesian optimization** uses that uncertainty to choose where to look next, balancing "try the best guess" against "check where we know least". Planned tool: BoTorch.
- **Comparison run:** optimize again with only the CT rule (what a drug-only plant does). If the two plans pick different settings, the activity limit changes the decision. That is the project's main result.
- **Active learning:** the model picks the 8–12 experiments that would teach it the most.
- **Bayesian inference:** a statistical method that fits the uncertain constants (breakdown speed, reversal speed, potencies, chlorine demand, number of tanks) to lab data and reports a range for each, not a single number.

## 5. The lab work

The lab has three jobs: run chlorine on cipro in a small flow chamber like the plant's, measure what is left chemically, and measure what is left biologically.

### The reactor: batch first, coil later (decided Nov 10)

- **Stage 1, the main instrument: a stirred batch reactor** (a completely mixed batch reactor, CMBR). A foil-wrapped 500 mL glass beaker on a magnetic stir plate holds buffered cipro water. Chlorine goes in at minute 0, and samples are pulled at 0, 7.5, 15, 22.5 and 30 minutes into vials that already hold quench. Because the beaker is fully mixed, a sample at minute 15 matches plant water after 15 minutes of contact. All core data comes from this.
- **Stage 2, optional, late January: the coiled-tube contact chamber below** becomes a blind validation test. The model, calibrated on batch data, predicts the coil's outlet before the run. The model puts the coil only about 3% from an ideal batch.
- Wherever later sections say pumps, ports S1–S3 or flow, read them as Stage 2. In Stage 1 the dose is set by pipette and the contact time by the timer.

### The contact-chamber reactor (Stage 2)

- A **contact chamber** is where a plant holds chlorinated water long enough to disinfect it. Ours is a **coiled tube**: its length and the flow rate set the contact time.
- **Peristaltic pumps** (pumps that squeeze a flexible tube, so the liquid never touches the pump) push the water and add each chemical: bleach at the inlet, optional ammonia (or pre-formed chloramine), and bisulfite at the outlet. Adding chemicals at several points is **staged dosing**.
- An **Arduino** (a small controller board) runs the two pumps, and a **laptop** connected by USB sets their flows, times each run and logs it. pH and ORP are checked by hand with pens (barebones build, Oct 27).
- **Tracer test:** inject dye or salt and time how it comes out. This gives the number of tanks for the flow model, and it cannot be guessed.
- It is a **flow reactor**, not a filter: nothing is trapped. Cipro is chemically changed and flows out with the water.

### Measuring the chemicals

| What | Tool | How it works |
| --- | --- | --- |
| Cipro, N-chloro-cipro, products | HPLC-UV at BioCurious | Separates molecules, then measures each with UV light |
| Free and total chlorine | DPD test kit | A dye turns pink in proportion to chlorine; what plants use |
| Chlorine trend; is chlorine gone after bisulfite? | ORP probe | Reads overall oxidizing strength; cannot measure cipro |
| Quick check between HPLC sessions | TLC under UV, or fluorescence | Shows cipro plus products together |
| Product identities (optional) | LC-MS via a mentor | Weighs each molecule to identify it |

- **HPLC (high-performance liquid chromatography):** the sample is pushed under pressure through a packed column. Different molecules come out at different times (their **retention time**), and a **UV detector** measures each as a separate **peak**. The **peak area** is proportional to the amount. This matters because cipro and all its products absorb UV the same way (they share the core), so only separation tells them apart.
- **Calibration:** run cipro **standards** (known concentrations, 0.05–2 mg/L) each session and draw a **calibration line** of peak area against concentration.
- **Detection limit:** the smallest amount the method can see. Dodd reports about 33 µg/L for UV, fine for our 1 mg/L lab level.
- Products have no pure standards, so they are reported as "cipro-equivalent peak area", assuming the same UV response. This assumption is stated in the results.
- **ORP (oxidation-reduction potential):** a voltage that rises with oxidizing chemicals like chlorine. Plants use it to control dosing.
- **TLC (thin-layer chromatography):** a cheap plate version of separation, read under a UV lamp.
- **LC-MS (liquid chromatography–mass spectrometry):** separation plus a detector that weighs molecules. Expensive; optional here.

### The Gap 2 test

Split one chlorinated sample three ways and inject (a) right away, (b) after bisulfite, (c) after thiosulfate. If the N-chloro-cipro peak shrinks and the cipro peak grows after bisulfite, that is reversal, measured directly.

### Measuring antibacterial activity

- **The test:** *E. coli* K-12 (a harmless lab strain) is grown in **Mueller-Hinton broth** (a standard nutrient liquid for antibiotic tests) in a **96-well plate** (a tray of 96 tiny wells). Each well gets a treated water sample or a known cipro dilution.
- **Resazurin** is a blue dye that living, growing bacteria turn pink. Blue means the water stopped growth (still antibacterial); pink means the bacteria grew. Colour is read with a plate reader, or a phone or scanner plus image analysis.
- **Biosafety level (BSL):** BSL-1 is the lowest level, for microbes that do not cause disease in healthy people. Fair rules require BSL-1 work in a proper lab, never at home.
- **First experiment: a cipro dose–response curve** (Checkpoint B). Cipro is very potent against *E. coli*, so dilutions must reach a few µg/L.
- **Every sample is quenched with bisulfite,** the plant's chemical, so the bacteria see what the creek sees.

### Controls (every batch)

A **control** is a sample that tests one possible false cause. If a control fails, the batch's results cannot be trusted.

- Bleach alone and bleach + bisulfite: does leftover chlorine kill bacteria by itself?
- Bisulfite alone and ammonium chloride alone: do the other chemicals affect growth?
- Cell-free dye: does anything change the dye's colour without bacteria?
- Plain water and untreated cipro: the test's "no effect" and "full effect" ends.

### Safety and approvals

- An **SRC (Scientific Review Committee)** must approve the plan, with a **Qualified Scientist** or supervisor named in writing.
- Read the **SDS (safety data sheet)** for every chemical. Under 2026–27 fair rules, chemicals listed as reproductive toxins need a research institution or restricted fume hood. Check cipro's.
- Chemistry runs in the school lab (fume hood, eyewash, waste handling). Collect cipro waste.

## 6. Variables, and how each is monitored

The five plant settings are the independent variables. The model predicts the dependent variables, and the reactor measures them. Every dependent variable is measured at fixed sample ports, so each model prediction has a matching measurement.

- **Independent variable:** something you set on purpose, to see its effect. Here, these are the knobs the optimizer turns.
- **Dependent variable:** something you measure, which responds to the settings.
- **Controlled variable:** something kept the same in every run, so it cannot explain a difference.
- **Condition tested:** set on purpose and varied, but not optimized, because a plant cannot choose it.

&#91;embedded content: bench contact-chamber reactor · 3 pumps, 2 probe cells, 3 sample ports\]

Water flows left to right. A mixer after each dosing point is recommended, because the slow, smooth (laminar) flow in a narrow tube barely mixes an injected chemical. The probe and port positions are a proposed layout, to be fixed when you build it.

### Independent variables (the knobs)

| Variable | Units | How it is set | How it is checked |
| --- | --- | --- | --- |
| Chlorine dose | mg/L as Cl₂ | Pump 2 rate × bleach stock strength ÷ water flow | DPD free chlorine at S1, every run; bleach stock strength checked by DPD each lab day, because bleach weakens over time |
| Contact time | min | Tube volume ÷ water flow (Pump 1) | Flow by timed collection into a measuring cylinder; tube volume by filling it; real spread of times by the tracer test |
| Ammonia: none vs pre-formed chloramine | Cl₂ : NH₃-N mass ratio | Chloramine made in a separate bottle at a set ratio (below 5:1), fed through Pump 2 instead of bleach | DPD free and total chlorine on the stock: free near zero and total at the target means it is all chloramine |
| Bisulfite dose | mg/L | Pump 3 rate × stock strength ÷ water flow | DPD total chlorine near zero at S3, and an ORP drop between ORP 1 and ORP 2 |
| Time from chlorination to bisulfite | min | Where along the tube Pump 3 injects, and the flow | Same flow and volume checks as contact time |

### Conditions tested, not optimized

| Condition | How it is set | How it is checked |
| --- | --- | --- |
| pH (6.5–8.5) | Phosphate buffer in the feed tank | pH pen checks of the feed jug and Port A samples; pen calibrated with pH 4, 7 and 10 buffers each lab day |
| Water recipe (lab water vs real effluent) | Chosen per run | Chlorine demand measured by DPD for each water |

### Dependent variables (what is measured)

| Variable | Where | How it is measured | Model output it checks |
| --- | --- | --- | --- |
| Cipro | S1, S2, S3 | HPLC-UV, against that day's calibration line | Cipro over time and at discharge |
| N-chloro-cipro, P1, P2 | S2, S3 | HPLC-UV peaks, as cipro-equivalent peak area | Products at discharge; Gap 2 reversal |
| Free and total chlorine | S1, S2, S3 | DPD kit | Chlorine backbone layer |
| Chlorine trend | ORP 1 (before bisulfite), ORP 2 (after) | ORP probes, logged continuously | Early warning if dosing drifts mid-run |
| CT | Computed | Average DPD chlorine between S1 and S2 × contact time | The disinfection constraint |
| Antibacterial activity | S3, quenched with bisulfite | *E. coli* + resazurin plate → % inhibition → cipro-equivalents | Activity layer; the activity constraint |
| Cost | Computed | Measured doses × chemical prices | Cost layer |
| Prediction error | Computed | Measured vs predicted, as % difference | Checkpoints A and D |

### Controlled variables (kept the same)

| Variable | How it is kept the same | How it is checked |
| --- | --- | --- |
| Temperature (about 22 °C) | Run at room temperature | Thermometer reading logged each run |
| Starting cipro (1 mg/L in the lab) | Same stock, same dilution | HPLC at S1 or the feed tank |
| Strain, broth, incubation time and temperature | Same protocol for every plate | Untreated-cipro and plain-water controls on every plate |
| Quench recipe | Same bisulfite dose and timing | Quench-only control on every plate |
| Sampling-to-injection time | Fixed delay before HPLC | Time written down for every sample, since N-chloro-cipro keeps breaking down in the vial |

## 7. The steps, phase by phase

Eight phases run from October to the fair in March 2027, with four yes/no **checkpoints** (A–D). If a checkpoint fails, its fallback says what to do instead of carrying on.

### Phase 0 · Oct 4–16 · Lock and launch

1. Submit SRC paperwork and get a Qualified Scientist or supervisor in writing. Approval takes weeks.
2. Confirm HPLC access at BioCurious: fees, training, column, solvents, booking times, supervision. Tell the SRC about BioCurious.
3. Ask whether the bacteria test could also run at BioCurious, and confirm a school lab for chemistry.
4. Source cipro powder (it is usually sold to institutions). It doubles as the HPLC standard.
5. Check every chemical's SDS.
6. Email the San José–Santa Clara plant for its chlorine dose, contact time, residual, effluent ammonia, time to bisulfite, and a sample before chlorination.
7. Order parts. The reactor is needed by Nov 15.

### Phase 1 · to Oct 15 · Chemistry model v1 (computer only)

1. Build the chlorine backbone (done).
2. Build the cipro reactions with Dodd's constants (done).
3. Build the flow model and validate against Dodd Fig. 5a and Kennedy Neth (done; Checkpoint A passes on digitized data, Oct 16).
4. Build the drug-only baseline (done).
5. Re-digitize Dodd Fig. 5a and Kennedy Neth Fig. 2A (done Oct 16, from the PDF figure images; method in the repo's scripts/digitize/).

**Checkpoint A (Oct 15):** within about 20% of the published decay curve. *Fallback:* check units, pH handling and how "measured cipro" is defined.

### Phase 2 · Oct 16 – Nov 15 · Reactor v1 and HPLC method

1. Build one coiled-tube chamber with pumps for water and dilute bleach.
2. Calibrate the DPD chlorine kit against known standards.
3. Set up the HPLC method: standards, calibration line, repeat injections, then one chlorinated sample to see the product peaks.
4. Run the tracer test to get the number of tanks.
5. Measure the chlorine demand of the lab water recipe.
6. Measure the N-chloro-cipro breakdown speed yourself (the constant that matters most, and the one two labs disagree on).
7. Compare quenches (immediate, hydrogen peroxide, thiosulfate, bisulfite) on the same sample.
8. First cipro runs at 3–4 chlorine doses, quenched with bisulfite at the plant's dose and timing.
9. Model v2: fit flow, demand and breakdown speed to your own data.

### Phase 3 · Nov 16 – Dec 15 · Bacteria test and activity model

1. Run the cipro dose–response in *E. coli* K-12 + resazurin, with all controls.
2. Validate the bisulfite quench: it must not affect bacteria by itself.
3. Build the activity layer (cipro-equivalents → predicted % inhibition).
4. Write down the activity limit now, before any treated-water results.

**Checkpoint B (Dec 15), go/no-go:** a clear, repeatable dose–response with clean controls. *Fallback:* fix the test before any reactor activity runs.

### Phase 4 · Dec 16 – Jan 15 · Full reactor and the window scan

1. Add pre-formed chloramine dosing and bisulfite dosing at the outlet; log pump flows and run times on the laptop (pH and ORP by pen).
2. **Window scan:** light to heavy chlorine, free chlorine vs pre-formed chloramine, samples before and after bisulfite. HPLC and activity on every sample.
3. Fit the product potencies and the bisulfite reversal speed.

**Checkpoint C (mid-Jan):** is there activity beyond what leftover cipro explains, or does cipro come back after bisulfite? *Fallback:* a "no" is a real result; report it and test whether the simple model is enough.

### Phase 5 · Jan 10 – Feb 5 · Optimize and pick experiments

1. Build the cost layer.
2. Optimize: lowest cost with CT ≥ target and activity ≤ limit.
3. Optimize again with the CT rule only (the drug-only plan) and compare.
4. Pick 8–12 runs where the model is least certain, and reserve the blind-test conditions now so they never touch the fit.

### Phase 6 · Feb 1–28 · Experiments and the blind test

1. Run 8–12 conditions × 3 independent reactor runs. **Independent runs** are separate full runs from scratch, which show real repeatability (not three readings of one sample).
2. Measure cipro and products (HPLC), activity, free and total chlorine and pH on each.
3. **Blind test:** save a timestamped prediction, then run it.
4. **Four-way comparison:** drug-only vs fitted curve vs full model, and the cost-optimal setting with vs without the activity limit.
5. Keep failed runs in the data, with reasons.

**Checkpoint D:** the blind result falls inside the model's predicted range, and the full model beats the simpler ones. *Fallback:* report honestly; label any refit as made after validation.

### Phase 7 · Mar 1 to the fair · Real water, cost, sharing

1. Cost per 1,000 L and per million gallons, with and without the activity limit.
2. Real effluent: filtered, not-yet-chlorinated water from the plant via an adult contact. Measure its chlorine demand, spike in cipro, run the best and the drug-only settings. Ask the SRC first.
3. Publish code, data and protocols on GitHub.
4. Poster, report and a 5-minute talk each. Practise "What's new?" and "How do you know the bacteria test works?"

## 8. What is new, and what is not

The broad idea, that oxidized antibiotics can stay active, is already published. The project's possible contribution is narrower: chloramine, dechlorination, and a model that predicts activity and picks plant settings, tested blind. These gaps come from PubMed and web searches, which is not proof that no one has done them.

**Already done (do not claim):**

- Measuring antibacterial activity after chlorinating cipro (Kennedy Neth 2019; Jaén-Gil 2020).
- Kinetics and breakdown pathways of cipro with chlorine (Dodd 2005).
- Detecting cipro chlorination products in real reclaimed water, without activity tests (París-Reche 2026).
- Activity-aware or toxicity-aware optimization of water treatment in general.

**Not found in searches (possible contributions):**

1. Antibacterial activity left after **chloramine** treats cipro.
2. Whether **plant dechlorination** (bisulfite) turns N-chloro-cipro back into active cipro.
3. A model that **predicts activity** from chlorine dose, contact time and ammonia, by linking Dodd-type kinetics to product potencies.
4. Using that model to **choose settings** that meet a disinfection CT target and an activity limit, checked in a **blind test** against simpler models.

**Do not claim:** "first to consider activity", "novel as a combination", "zero activity means safe", "treated water is unsafe", "validated for all treatments", or "no one regulates antibacterial activity anywhere". The defensible title meaning is that removing the drug alone does not prove the water is safe.

**Still to check before claiming any gap:** a Google Scholar search, since some engineering journals are not in PubMed. The full texts of Dodd 2005 and Kennedy Neth 2019 are now in hand.

## 9. Glossary

| Term | Meaning |
| --- | --- |
| Active learning | Letting the model choose the experiments that would teach it the most |
| Additive | Assuming the effects of several molecules simply add up |
| Antibacterial activity | How strongly water stops bacteria from growing |
| Antibiotic resistance | Bacteria evolving so an antibiotic no longer kills them |
| Baseline model | A simpler model the full model must beat to be worth it |
| Bayesian inference | Fitting uncertain numbers to data and reporting a range for each |
| Bayesian optimization | A search that uses its own uncertainty to choose where to test next |
| Biosafety level (BSL) | Lab safety tier for microbes; BSL-1 is for harmless strains |
| Bisulfite (sodium bisulfite) | The plant's dechlorination chemical |
| Blind test | Prediction saved with a timestamp before the experiment is run |
| Calibration line | Peak area vs known concentration, used to turn a reading into a number |
| Checkpoint | A planned yes/no test with a fallback if it fails |
| Chloramine (monochloramine, NH₂Cl) | Chlorine joined to ammonia; a slower, weaker disinfectant |
| Chlorine demand | Chlorine used up by other substances in the water |
| Ciprofloxacin (cipro) | A fluoroquinolone antibiotic; the drug studied |
| Cipro-equivalent | A mix's total activity, expressed as the amount of pure cipro that would act the same |
| Combined chlorine | The chloramine part of total chlorine |
| Constraint | A rule an optimized answer must obey |
| Contact chamber | Where water is held with chlorine long enough to disinfect |
| Contact time / residence time | How long water spends in the chamber; volume ÷ flow rate |
| Control | A sample that tests one possible false cause of a result |
| CT | Chlorine concentration × contact time (mg·min/L); how disinfection is judged |
| Dechlorination | Removing leftover chlorine before discharge |
| Detection limit | The smallest amount a method can measure |
| Digitizing | Reading numbers off a published graph |
| Disinfection | Killing germs in water |
| Dose–response curve | Measured link between drug concentration and growth inhibition |
| DPD kit | Colour test for free and total chlorine |
| *E. coli* K-12 | A harmless lab strain of the bacterium *E. coli* |
| First-order reaction | One molecule changing by itself; rate = k × \[A\] |
| Flow reactor | A tube that water flows through while it reacts; not a filter |
| Fluoroquinolone | Antibiotic family with a quinolone core and a fluorine atom |
| Free chlorine | HOCl plus OCl⁻ |
| Gaussian process | A machine learning model that predicts and says how unsure it is |
| Half-life | Time for half of a substance to be used up |
| HOCl / OCl⁻ | Hypochlorous acid / hypochlorite ion; the two forms of free chlorine |
| HPLC-UV | Separates molecules in a column, then measures each with UV light |
| Hydrolysis | Breakdown by reaction with water |
| Hypothesis | The testable prediction the project sets out to check |
| IC50 | Concentration that stops 50% of bacterial growth |
| Implicit (backward Euler) solver | A stable way to step stiff equations forward in time |
| Independent runs | Separate full repeats from scratch |
| Laminar flow | Smooth flow in layers, with no turbulent mixing |
| LC-MS | Separation plus a detector that weighs molecules to identify them |
| M (molar) | Moles per litre |
| MIC | Lowest concentration that stops visible growth |
| Mueller-Hinton broth | Standard nutrient liquid for antibiotic tests |
| N-chloro-cipro | Cipro with a chlorine on its piperazine nitrogen; the first product |
| ODE (ordinary differential equation) | An equation for how fast a quantity changes |
| ORP | Voltage reading of overall oxidizing strength |
| Out-of-sample | Scored on data the model never saw |
| P1, P2 | Lumped product groups after N-chloro-cipro breaks down |
| Peristaltic pump | A pump that squeezes a tube, so liquid never touches the pump |
| pH / pKa | Acidity / the pH at which a molecule is half in each form |
| Piperazine ring | Six-membered ring with two nitrogens on cipro; where chlorine attacks |
| Plug flow / fully mixed | All water stays the same time / water is stirred so times vary widely |
| PNEC for resistance | Estimated level below which an antibiotic should not select for resistance |
| Potency | How strongly a molecule stops bacteria, relative to cipro |
| Pre-formed chloramine | Chloramine made before it meets cipro |
| Quench | A chemical added to stop a reaction at a chosen moment |
| Quinolone core | The two-ring part of cipro that attacks bacteria |
| Rate constant (k) | Number that sets a reaction's speed |
| Resazurin | Blue dye that growing bacteria turn pink |
| Residence time distribution | The spread of times water spends in the chamber |
| Retention time / peak | When a molecule leaves the HPLC column / its signal on the detector |
| Reynolds number | A number that says whether flow is laminar or turbulent |
| SDS | Safety data sheet for a chemical |
| Second-order reaction | Two molecules reacting; rate = k × \[A\] × \[B\] |
| Sensitivity analysis | Nudging each input to see which ones change the answer |
| Sodium hypochlorite | The chemical in bleach |
| SRC | Scientific Review Committee that approves fair projects |
| Staged dosing | Adding chemicals at several points along the reactor |
| Standard | A sample of known concentration |
| Stiff equations | Equations mixing very fast and very slow processes |
| Surrogate | A fast stand-in trained to copy a slow model |
| Tanks in series | Modelling a tube as N stirred tanks in a row |
| Thiosulfate | Dechlorinating chemical used in published lab studies |
| TLC | Cheap plate-based separation, read under UV light |
| Total chlorine | Free chlorine plus chloramine |
| Tracer test | Dye or salt pulse used to measure how water moves through the chamber |
| Validation | Checking predictions against data the model was not built from |
| Wastewater treatment plant | Facility that cleans sewage before release |

## Sources

- Dodd et al. 2005, *Environ. Sci. Technol.* 39:7065 ([DOI](https://doi.org/10.1021/es050054e))
- Kennedy Neth et al. 2019, *Environ. Sci.: Water Res. Technol.* ([RSC](https://pubs.rsc.org/en/content/articlelanding/2019/ew/c9ew00182d))
- Jaén-Gil et al. 2020, *Environ. Sci. Technol.* ([DOI](https://doi.org/10.1021/acs.est.0c00944))
- Jasper, Shafaat and Hoffmann 2016, *Environ. Sci. Technol.* ([DOI](https://doi.org/10.1021/acs.est.6b02912))
- Qiang and Adams 2004, monochloramine formation ([record](https://scholarsmine.mst.edu/civarc_enveng_facwork/58))
- Batt, Kim and Aga 2007, *Chemosphere* 68:428 ([DOI](https://doi.org/10.1016/j.chemosphere.2007.01.008))
- Bengtsson-Palme and Larsson 2016, resistance PNECs ([record](https://publications-affiliated.scilifelab.se/publication/5f4a143bd1da49deac86ee498f6e24de))
- El Najjar et al. 2012, thiosulfate reverting a levofloxacin intermediate ([DOI](https://doi.org/10.1016/j.watres.2012.09.035))
- San José–Santa Clara Regional Wastewater Facility, treatment process ([city page](https://www.sanjoseca.gov/your-government/departments-offices/environmental-services/water-utilities/regional-wastewater-facility/treatment-process))
