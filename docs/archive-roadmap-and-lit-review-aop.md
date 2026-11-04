# Removed Is Not Safe: Project Roadmap & Literature Review

Sep 26, 2026 · @anonymous

## The project in one page

We build a computer model that predicts how much a water treatment step lowers the water's power to harm bacteria, not just how much antibiotic it removes. Then we use the model to design and run a small smart reactor, and check its predictions with a few real tests.

**Why this matters:** when chemicals break an antibiotic apart, the leftover pieces can still act like the drug. A test that says "99% of the drug is gone" can miss pieces that still help bacteria become resistant. Our slogan: **removed is not safe**.

**Words we use, defined once:**

- **Antibiotic resistance (AMR, short for antimicrobial resistance):** bacteria evolving so antibiotics no longer kill them. Low levels of antibiotics in water can speed this up.
- **Oxidation:** breaking molecules apart with very reactive chemicals. Ozone, UV light plus hydrogen peroxide, chlorine and persulfate all work this way.
- **Advanced oxidation process (AOP):** any treatment that makes **radicals**, short-lived and extremely reactive molecules that attack almost anything.
- **Persulfate:** a cheap salt. When it touches iron it releases **sulfate radicals**, the radicals our reactor uses.
- **Flow reactor:** water moves continuously through a chamber instead of sitting in a tank.
- **Transformation products:** the pieces an antibiotic breaks into.
- **Residual antibacterial activity:** how strongly the treated water still slows or kills bacteria. This is the number we care about most.
- **First-principles model:** a model built from the actual chemical reactions and physics, so it can predict conditions nobody has tested.
- **Bioassay:** a test that uses living things (here, *E. coli* bacteria) to measure an effect.

**What we make:**

1. A free, open-source computer model that works for any oxidation treatment, not only ours.
2. A low-cost smart reactor that uses the model to decide how much chemical to add.
3. A cheap bacteria test that checks whether treated water is actually safe.
4. Proof that the model works: it predicts published results from other labs, and it predicts our own tests before we run them.

**Where it gets used:** the model's real-world target is large plants that already use oxidation, like the ozone and UV stages of US plants that turn wastewater into drinking water. Our small reactor is the cheap testbed where we prove the model is right.

## The device

Yes, we can build a device, and it has two parts: a **smart reactor** that doses chemicals using the model, and a **cheap activity test** that checks the result with bacteria. Estimated parts cost is about $300 to $400, based on typical hobby-electronics prices (not yet quoted).

**Part 1: the smart reactor.** Water flows through it once, and a small computer decides how much persulfate to add at each stage.

1. **Inlet sensors read the incoming water:** a UV light sensor (our DIY photometer, which estimates antibiotic and organic matter), a pH probe, and a conductivity probe (which tells us how salty the water is; salt wastes radicals).
2. **The computer predicts:** a Raspberry Pi (a $60 credit-card-sized computer) runs a fast, simplified version of our model. It calculates the smallest chemical dose that reaches the target.
3. **Pumps add persulfate in stages:** instead of one big dose at the start, small pumps add persulfate at two or three points along the reactor. Adding it all at once wastes it, because extra iron destroys the radicals it makes.
4. **The water passes over iron:** a tube packed with scrap iron (steel mesh) activates the persulfate. Each stage is a separate section, so we can swap parts.
5. **Outlet sensors check the result:** a second UV sensor and an ORP probe (which measures leftover oxidizing chemical) confirm the prediction. If they disagree, the computer adjusts the dose. This loop is called **feedback control**.

**Part 2: the activity test kit.** A small plastic plate with rows of wells. Each well gets treated water, harmless lab *E. coli* (a non-disease strain), and **resazurin**, a blue dye that turns pink when bacteria are alive and growing. Blue wells mean the water still stops bacteria; pink means it is safe for them. A phone camera reads the colors in about 4 to 6 hours. This checks the whole mixture of drug pieces at once, for cents per test.

| Part | What it does | Rough cost |
| --- | --- | --- |
| Reactor tubes, fittings, steel mesh | Holds the iron and water in 2–3 stages | $40–60 |
| 3 small peristaltic pumps | Add persulfate at each stage | $45–60 |
| UV LED and light-sensor pairs (inlet and outlet) | Estimate antibiotic level | $30–50 |
| pH, conductivity and ORP probes | Read water chemistry and leftover oxidant | $100–150 |
| Raspberry Pi and wiring | Runs the model and controls the pumps | $70–90 |
| Test plates, dye, *E. coli* culture | Activity test kit | $20–40 |

**How it connects to big plants:** the same "brain" works for any oxidation process. At a large ozone or UV plant, operators already adjust doses using UV light readings (see the literature review). Our contribution is a brain that aims at *remaining antibacterial activity* instead of only the parent drug, and a cheap test that checks it. The small reactor is where we prove this works before anyone would try it at scale.

## Literature review: is it novel?

**Verdict (full PubMed review, 28 Sep 2026): still novel, but only as a combination, and the evidence points to a sharper topic.** No study found predicts remaining antibacterial activity with a chemistry model, uses it to choose the cheapest settings, and tests it blind. Full report with \~35 sources: *Antibacterial activity prediction review* (sent in chat).

**The key finding:** it depends on the oxidant.

- **Ozone and hydroxyl radicals:** activity usually disappears one-for-one with the drug. For sulfamethoxazole, ozone removes activity as fast as it removes the drug ([Dodd et al. 2009](https://doi.org/10.1021/es8025424)). The exceptions are penicillin-type drugs, whose ozone products stay active ([Dodd et al. 2010](https://doi.org/10.1021/es101061w)).
- **Sulfate radicals (persulfate):** these attack sulfamethoxazole's amino group and form a **nitro product** ([Yang et al. 2017](https://doi.org/10.1016/j.watres.2017.03.054)). Separately, the nitro product was found to inhibit bacteria **more** than the drug itself ([Majewsky et al. 2014](https://doi.org/10.1021/tx500267x)). No study found connects the two.
- **Persulfate on a related sulfonamide:** over 90% of the drug was removed, but only 38–57% of its activity ([Yao and You 2023](https://doi.org/10.1016/j.ecoenv.2023.114656), full text read).

**So persulfate treatment of sulfamethoxazole is exactly where "removed" may not mean "safe."**

| Piece of our project | Closest prior work | What's still missing |
| --- | --- | --- |
| Measuring activity after oxidation | Dodd 2009 and 2010, [Keen and Linden 2013](https://doi.org/10.1021/es402472x), Yao and You 2023, [Fenton 2023](https://doi.org/10.1016/j.chemosphere.2023.139854) (underdosing left active pieces, overdosing left toxic peroxide) | Persulfate + sulfamethoxazole activity in a flow reactor |
| Kinetic model + toxicity of pieces | [Zhang et al. 2025](https://doi.org/10.1016/j.watres.2025.123982): sulfamethazine model + predicted algae toxicity (closest match) | Antibacterial activity, cost optimization, blind test |
| Kinetics predicting a biological effect | [Lee et al. 2008](https://doi.org/10.1021/es7023302) (estrogen activity), [He et al. 2022](https://doi.org/10.1021/acs.est.2c00567) (resistance genes, confirmed at full scale) | Antibiotic activity of pieces |
| Optimization or dose control | Many ML/Bayesian studies (removal or energy only); [closed-loop ozone control](https://doi.org/10.1016/j.watres.2016.08.010) on UV readings | Activity as the target or limit |
| Cheap activity tests | [Growth-curve "drug equivalents" method](https://doi.org/10.1039/c5em00228a) (0.2–24 µg/L limits); [2026 bioassay panels](https://doi.org/10.1093/etojnl/vgag207) found activity chemistry missed | Not used for dose decisions |

**Two honest problems found:**

1. **Sulfamethoxazole's resistance threshold is high.** It is 16 µg/L, versus 0.06 µg/L for ciprofloxacin and 0.5 µg/L for trimethoprim ([AMR Industry Alliance table, 2026](https://www.amrindustryalliance.org/wp-content/uploads/PNEC-Table-1-AMRIA-Feb-2026.pdf)). It's a good *regulatory* example but a weak *resistance* one. Consider adding trimethoprim, its usual partner drug.
2. **Our test works at lab concentrations**, not real-world ng/L levels, without concentrating the sample first.

**Suggested revised research question (no "and"):** *Can a chemistry-based computer model find the lowest-cost persulfate reactor settings that remove sulfamethoxazole without leaving antibacterial byproducts behind?*

**Before locking the topic:** do a 30-minute Google Scholar search for "sulfamethoxazole persulfate antibacterial activity nitro," since some engineering journals aren't in PubMed.

## Impact, including money

**The impact is real, but it comes from where the model is used, not from our small reactor.** The health problem is huge, and governments are now paying billions for oxidation treatment. A tool that makes that treatment cheaper, or proves it is actually safe, has a clear market.

**Health stakes:**

- Worldwide, resistant infections directly caused 1.14 million deaths in 2021. The [Lancet GRAM study](https://www.healthdata.org/news-events/newsroom/news-releases/lancet-more-39-million-deaths-antibiotic-resistant-infections) forecasts over 39 million deaths from 2025 to 2050, rising to 1.91 million a year by 2050.
- In the US, [CDC](https://www.cdc.gov/antimicrobial-resistance/data-research/facts-stats/index.html) counts over 2.8 million resistant infections and over 35,000 deaths a year. Treating just six resistant germs costs over $4.6 billion a year ([CDC study](https://cdc.gov/antimicrobial-resistance/stories/partner-estimates.html)).

**Where the money is:**

| Program | Money involved | Why our model matters there |
| --- | --- | --- |
| EU wastewater law (quaternary treatment, an extra cleaning step for medicines) | About €1.2 billion a year by 2040, or €1.56 billion in 2025 prices ([EU JRC](https://publications.jrc.ec.europa.eu/repository/handle/JRC144745)) | Drug companies must pay at least 80%, and each company's share depends on how much it sells and how **hazardous** its residues are ([summary](https://www.cehtra.com/post/urban-wastewater-treatment-directive-uwwtd)). Measuring real leftover activity could change who pays what. |
| Switzerland's upgrade of about 100 plants | CHF 1.2 billion, funded by a tax of up to CHF 9 per person a year ([Swissinfo](https://www.swissinfo.ch/eng/pollution---_stepping-up-wastewater-treatment/42465310)) | Running costs are 0.02 to 0.09 CHF per cubic meter of water ([VSA Micropoll](https://micropoll.ch/en/mediathek/evaluation-of-the-energy-and-cost-figures-of-processes-for-the-elimination-of-micropollutants-in-wastewater-treatment-plants/)). Smarter dosing lowers this. |
| US plants turning wastewater into drinking water | Phoenix plans 60 million gallons a day by 2030; El Paso 10 million ([Inside Climate News](https://insideclimatenews.org/news/03032025/el-paso-wastewater-drinking-water/)) | California requires the ozone step to remove 90% of sulfamethoxazole ([EPA summary](https://www.epa.gov/waterreuse/summary-californias-water-reuse-guideline-or-regulation-direct-potable-water-reuse)), but only checks the drug, not its activity. |

**Waste we could cut:** UV oxidation systems commonly run a fixed, cautious dose, so they are almost always overdosing ([review](https://www.sciencedirect.com/science/article/pii/S2589914723000191)). The standard UV plus peroxide step uses only about 10% of the peroxide added ([study](https://pubmed.ncbi.nlm.nih.gov/32822532/)).

**A rough savings estimate (our assumption, not measured):** a 60-million-gallon-a-day plant treats about 83 million cubic meters a year. If its oxidation step costs about the same as Swiss plants ($0.02 to $0.10 per cubic meter), that step costs roughly $1.7 to $8 million a year. Cutting dose by 10 to 20% would save roughly **$0.2 to $1.6 million a year at one plant**, before counting the cost of proving safety.

**Who benefits, in plain terms:**

- **People who drink recycled water:** proof it is safe in the way that matters, which answers the "toilet to tap" fear.
- **Ratepayers:** less chemical and electricity means lower water bills.
- **Everyone:** less antibiotic activity reaching rivers means less pressure for bacteria to become resistant.

## Roadmap

The project runs about 23 weeks in seven phases, and four checkpoints decide whether we keep going or change course.

&#91;embedded content: project roadmap · 7 phases, 4 checkpoints\]

Some phases overlap: we build the device (weeks 10 to 15) while the model is still being finished. A **checkpoint (gate)** is a yes-or-no test; if it fails, we fix the problem before moving on (see Risks).

## Detailed roadmap

**Research question:** Can a chemistry-based computer model find the lowest-cost reactor settings that leave treated water with no remaining antibacterial activity?

Each phase lists the jobs to do, what we'll have at the end, and what we need. Materials are listed by short name; prices are in the next section.

### Phase 1 · Weeks 1–3 · Check and plan

- [ ] Search Google Scholar and Web of Science for anyone who already modeled antibacterial activity in a reactor design
- [ ] Email one expert (for example Michael Dodd's lab, University of Washington) and Valley Water's purification center
- [ ] Collect published data to test the model against: Dodd 2009, Keen and Linden 2013, Yao and You 2023, Majewsky 2014 (copy their tables into a spreadsheet)
- [ ] Submit safety paperwork for growing bacteria (see Materials) and ask a teacher or mentor to supervise
- [ ] Order long-lead items: *E. coli* culture, sulfamethoxazole, electronics

**At the end:** a short novelty note, a dataset of published results, safety approval started. **Needs:** laptop, library access, spreadsheet. **Checkpoint A:** we still can't find anyone who did this. If we can, narrow to what's left (salty water or drug mixtures).

### Phase 2 · Weeks 3–8 · Build the chemistry model

- [ ] Write the list of reactions (iron + persulfate, radicals + antibiotic, radicals wasted by salt, bicarbonate and organic matter) with published reaction speeds
- [ ] Code it in Python and solve it (SciPy)
- [ ] Add the flow part: how long water spends in the reactor (start simple; add the OpenFOAM flow simulation only if time allows)
- [ ] Compare predictions with published drug-removal data for iron + persulfate

**At the end:** a working simulator that predicts how fast the antibiotic disappears. **Needs:** laptop, Python, free software list. **Checkpoint B:** predictions land within about 20% of published drug-removal data (our chosen target).

### Phase 3 · Weeks 7–12 · Add the activity part

- [ ] List the known breakdown pieces of sulfamethoxazole from published studies
- [ ] Run quick chemistry calculations (xTB) to check which parts of the molecule radicals attack first
- [ ] Train a small model on published data that scores how active each piece is (tag whether a piece keeps the drug's active part)
- [ ] Add pieces together into one number: remaining antibacterial activity
- [ ] Test against published activity results (for example Yao and You's 40–60% activity left)

**At the end:** the model predicts both drug removal and remaining activity. **Needs:** laptop, RDKit, xTB, EPA TEST. **Checkpoint C:** the model reproduces the direction and rough size of published activity results.

### Phase 4 · Weeks 10–15 · Build the device (runs alongside Phases 3 and 5)

- [ ] Build the 3-stage reactor: tubes packed with steel mesh, with a dosing port between stages
- [ ] Wire the pumps, UV light sensors, pH, conductivity and ORP probes to the Raspberry Pi
- [ ] Calibrate the photometer with known sulfamethoxazole concentrations
- [ ] Set up the bacteria test: grow *E. coli*, run it with plain antibiotic at several strengths to get a dose-response curve
- [ ] Run all control groups once: clean water, untreated drug, persulfate only, iron only, quenched oxidant check

**At the end:** a working reactor and a calibrated bacteria test. **Needs:** everything under Reactor, Sensors and Bacteria test in Materials.

### Phase 5 · Weeks 13–17 · Optimize and choose tests

- [ ] Run the full model thousands of times; train the fast copy (Gaussian process)
- [ ] Use Bayesian optimization (BoTorch) to find the lowest-cost settings that leave no remaining activity
- [ ] Let the model pick the 8–12 experiments that would teach it the most

**At the end:** a predicted best design plus a short, ordered list of experiments. **Needs:** laptop (Google Colab if more computing power is needed).

### Phase 6 · Weeks 16–20 · Run the tests

- [ ] Run the 8–12 chosen experiments, 3 repeats each
- [ ] For each: measure drug left (photometer), activity left (bacteria test), leftover persulfate and dissolved iron (test kits)
- [ ] Send about 10 samples to an outside lab for LC-MS to confirm the photometer
- [ ] Feed results back in; update the uncertain numbers (Bayesian inference)
- [ ] Blind test: the model predicts one new condition, then we run it

**At the end:** a fine-tuned model with confidence ranges and a blind-test result. **Needs:** all chemicals, test kits, outside lab testing. **Checkpoint D:** the blind prediction comes true within the model's own confidence range.

### Phase 7 · Weeks 20–23 · Real water and share

- [ ] Test the best design on one real water sample (treated wastewater or a Valley Water sample, if available)
- [ ] Work out cost per 1,000 liters (chemicals, iron, electricity)
- [ ] Publish code, data and the bacteria test instructions on GitHub
- [ ] Make the poster, write the report, prepare for judges

**At the end:** final results, cost number, open-source release, poster.

## Who does what

**The work splits into two halves, and each partner gets half the computer work and half the lab work.** Partner A owns the chemistry side (how fast the drug breaks down, the reactor itself). Partner B owns the activity side (whether the water still harms bacteria, and the optimizer). Names can be filled in later.

&#91;embedded content: partner timeline · 2 lanes, 4 checkpoints\]

Splitting by side, not by skill, means each partner builds a model *and* tests it in the lab, so both of you can explain the whole project to judges.

|  | Computer work | Lab work |
| --- | --- | --- |
| **Partner A: chemistry and reactor** | Chemistry model; Raspberry Pi control code; fitting the chemistry numbers; cost per 1,000 liters | Photometer calibration; building the reactor and sensors; running reactor experiments; arranging LC-MS samples |
| **Partner B: activity and optimizer** | Activity model; fast copy and Bayesian optimizer; picking experiments; fitting the activity numbers | Safety approval; bacteria test setup; running the bacteria test on every sample; real water sample |

### Partner A: chemistry and reactor

- [ ] **Weeks 1–3:** search for prior chemistry models; collect published drug-removal data; order reactor parts and electronics
- [ ] **Weeks 3–8:** code the chemistry model in Python; compare with published drug-removal data (Checkpoint B)
- [ ] **Weeks 4–9:** calibrate the photometer with known sulfamethoxazole amounts
- [ ] **Weeks 10–15:** build the 3-stage reactor; wire pumps and probes; write the Raspberry Pi control code
- [ ] **Weeks 16–20:** run the chosen reactor experiments (3 repeats each); measure drug left, leftover persulfate and iron; send about 10 samples for LC-MS
- [ ] **Weeks 17–23:** fit the chemistry numbers to results; calculate cost per 1,000 liters

### Partner B: activity and optimizer

- [ ] **Weeks 1–3:** search for prior activity studies; collect published activity data (Dodd, Keen and Linden, Yao and You, Majewsky); submit safety paperwork; order bacteria supplies
- [ ] **Weeks 4–9:** grow *E. coli*; build the color-test dose-response curve
- [ ] **Weeks 7–12:** code the activity model: breakdown pieces, xTB calculations, activity scoring (Checkpoint C)
- [ ] **Weeks 13–17:** train the fast copy (Gaussian process); run Bayesian optimization; pick the 8–12 experiments
- [ ] **Weeks 16–20:** run the bacteria test on every experiment sample; test one real water sample
- [ ] **Weeks 17–23:** fit the activity numbers to results; publish code on GitHub

### Both

- [ ] **Every week:** a 30-minute call to check progress and swap files
- [ ] **Weeks 1–3:** Checkpoint A, the novelty check; email one expert, Valley Water and Santa Clara University together
- [ ] **Weeks 10–15:** run all control groups together (clean water, untreated drug, persulfate only, iron only, quenched oxidant check)
- [ ] **Week 20:** Checkpoint D, the blind test; write the sealed prediction together, then run it together
- [ ] **Weeks 21–23:** poster, report, practice judges' questions

### Handoffs

These are the points where one partner's work waits on the other's; missing one delays the project.

| Week | From | To | What gets handed over |
| --- | --- | --- | --- |
| 3 | A | B | Reactor size, steel mesh amount, planned flow rates, so both models match the real device |
| 8 | A | B | Working chemistry model: predicted amounts of each breakdown piece over time, which the activity model scores |
| 9 | B | A | Bacteria test dose-response curve, so test colors can be compared with predictions |
| 12 | B | A | Combined model (chemistry + activity) ready for the optimizer |
| 17 | B | A | The ordered list of 8–12 experiments with exact settings |
| 17–20 | A | B | Treated samples from each run, stopped with thiosulfate, the same day |
| 17–20 | Both | Both | Results shared within 2 days so the model can update and reorder the next tests |

## Materials and budget

**Estimated total: about $1,200 to $2,100.** The biggest single cost is outside lab testing (LC-MS). Prices are rough estimates from typical science-supply and hobby-electronics prices, not quotes; check with your school first, since it may already have pipettes, an incubator or pH meters.

### Chemicals

| Item | What it's for | Rough cost |
| --- | --- | --- |
| Sulfamethoxazole, 5–10 g (lab grade) | The test antibiotic | $40–80 |
| Sodium persulfate, 500 g | Makes the radicals | $25–40 |
| Sodium thiosulfate, 500 g | Stops the reaction before the bacteria test | $15–25 |
| Sodium chloride and sodium bicarbonate | Recreate salty and alkaline water | $10–20 |
| Humic acid, 25–50 g | Stands in for natural organic matter | $30–60 |
| pH buffers (4, 7, 10) and dilute acid/base | Calibrate probes, adjust pH | $20–40 |
| Distilled or deionized water, 20–40 L | Base water for every run | $20–40 |
| Steel mesh or steel wool (no soap coating) | The iron in the reactor | $10–20 |

### Bacteria test

| Item | What it's for | Rough cost |
| --- | --- | --- |
| *E. coli* K-12 culture (harmless lab strain) | The detector bacteria | $15–30 |
| LB broth powder | Food for the bacteria | $20–30 |
| Resazurin dye | Turns blue to pink when bacteria grow | $30–60 |
| 96-well plates, sterile, pack of 10–20 | Holds many tests at once | $25–50 |
| Micropipette set and tips | Measure tiny volumes | $60–120 |
| Incubator (school's, or a small DIY egg incubator at 37 °C) | Keeps bacteria warm | $0–60 |
| Bleach, gloves, goggles, lab coat | Safety and cleanup | $30–50 |

### Reactor and sensors

| Item | What it's for | Rough cost |
| --- | --- | --- |
| Clear tubes, fittings, valves | Reactor body, 3 stages | $40–60 |
| 3 small peristaltic pumps | Add persulfate at each stage | $45–60 |
| UV LEDs and light sensors (2 pairs) | DIY photometer at inlet and outlet | $30–50 |
| pH, conductivity and ORP probe boards | Read water chemistry | $100–150 |
| Raspberry Pi, power supply, wiring | Runs the model, controls pumps | $70–90 |
| Iron and persulfate test kits or strips | Check leftover iron and oxidant | $30–60 |

### Outside testing

| Item | What it's for | Rough cost |
| --- | --- | --- |
| About 10 LC-MS samples at a university or commercial lab | Confirm the photometer's readings | $500–900 |

Ask Santa Clara University or a local university lab early; student rates or donated runs can cut this a lot.

### Free software

- **Python** with **SciPy** (solving the reactions) and **BoTorch** (Bayesian optimization)
- **RDKit** (describing molecules) and **xTB** (quick chemistry calculations)
- **EPA TEST** (toxicity estimates)
- **OpenFOAM** (flow simulation, optional)
- **Google Colab** (free extra computing power) and **GitHub** (sharing the code)

### Approvals to get before week 10

- **Bacteria work:** science fair rules usually require pre-approval from the fair's review committee for any work with microorganisms, even harmless ones, plus a qualified supervisor and a proper lab space. Confirm the exact rules for your fair.
- **Chemical safety:** persulfate is a strong oxidizer. Keep it away from organics and metal powders, wear goggles and gloves, and follow its safety data sheet.
- **Waste disposal:** neutralize leftover persulfate with thiosulfate, and bleach all bacteria cultures before disposal.

## Risks and honest limits

**The biggest risk is that the activity prediction is too rough to trust.** Everything else has a fallback.

| Risk | Why it could happen | What we do instead |
| --- | --- | --- |
| Gate A fails: someone already did it | Our search found no match, but it wasn't a full database search | Narrow to what is still new, such as salty water or drug mixtures |
| Activity predictions are off | Data on how active each drug piece is is scarce, and mixtures don't simply add up (Yao and You saw pieces boost or weaken each other) | Report predictions with error ranges; let the bacteria test correct the model |
| Scrap-iron chemistry is unknown | No published rates for iron dissolving from our mesh | Measure it in our first experiments; that's what Gate D is for |
| Salty water makes chlorine byproducts | Sulfate radicals react with salt | Model it, test it, and report where the reactor should not be used |
| The small reactor itself isn't widely used | Iron-persulfate reactors are rare at full scale | Pitch the model and test kit, which apply to ozone and UV plants; the reactor is the testbed |
| Low real-world concentrations | Treated water has tiny antibiotic levels, below what our photometer sees | Test at higher spiked levels, use the model to scale down, and confirm a few samples with a lab test (LC-MS, a precise chemical analysis) |
| Lab safety approval | We grow bacteria | Use a harmless lab strain of *E. coli* and get approval before week 10 |

**What we should not claim:** that our reactor will be installed at water plants, or that treated drinking water is currently dangerous. We can claim a tested method and tool that makes oxidation cheaper and checks whether it is actually safe.

## Sources

**Novelty and science**

- [Yao and You (2023), combined antibacterial activity of sulfapyridine and its pieces](https://www.sciencedirect.com/science/article/pii/S0147651323001604)
- [Majewsky et al. (2014), antibacterial activity of sulfamethoxazole pieces](https://pubs.acs.org/doi/abs/10.1021/tx500267x)
- [Dodd et al. (2009), activity loss during ozone treatment of 13 antibiotics](https://pubs.acs.org/doi/abs/10.1021/es8025424)
- [Dodd et al. (2010), active penicillin pieces after ozone](https://pubs.acs.org/esthag/article-abstract/44/15/5940/197127/Transformation-of-Lactam-Antibacterial-Agents?redirectedFrom=fulltext)
- [Dodd, Buffle and von Gunten (2006), ozone rate constants for antibiotics](https://pubmed.ncbi.nlm.nih.gov/16570623/)
- [Keen and Linden (2013), activity after UV plus peroxide](https://pubs.acs.org/doi/10.1021/es402472x)
- [Iron + persulfate model for atrazine (2016)](https://www.sciencedirect.com/science/article/abs/pii/S1383586616305329)
- [Sulfamethoxazole in iron + persulfate, reactive sites (2019)](https://pubs.rsc.org/en/content/articlelanding/2019/em/c9em00254e)
- [Machine learning + Bayesian optimization of catalytic ozone (2025)](https://www.sciencedirect.com/science/article/abs/pii/S2214714425005537)
- [Machine learning optimization of peroxymonosulfate treatment (2026)](https://doi.org/10.3390/w18080945)
- [Full-scale ozone control with UV and electron-donating capacity, Zurich](https://pubmed.ncbi.nlm.nih.gov/34864343/)
- [UV-chlorine oxidation for potable reuse, review](https://www.sciencedirect.com/science/article/pii/S2589914723000191)
- [Electrochemical peroxide activation; UV/peroxide uses about 10% of peroxide](https://pubmed.ncbi.nlm.nih.gov/32822532/)

**Impact and money**

- [Lancet GRAM forecast via IHME](https://www.healthdata.org/news-events/newsroom/news-releases/lancet-more-39-million-deaths-antibiotic-resistant-infections)
- [CDC antimicrobial resistance facts](https://www.cdc.gov/antimicrobial-resistance/data-research/facts-stats/index.html)
- [CDC $4.6 billion cost study](https://cdc.gov/antimicrobial-resistance/stories/partner-estimates.html)
- [EU JRC cost estimate for quaternary treatment](https://publications.jrc.ec.europa.eu/repository/handle/JRC144745)
- [EU wastewater directive, producer payments by hazard](https://www.cehtra.com/post/urban-wastewater-treatment-directive-uwwtd)
- [Swiss micropollutant program cost](https://www.swissinfo.ch/eng/pollution---_stepping-up-wastewater-treatment/42465310)
- [Swiss VSA energy and cost figures](https://micropoll.ch/en/mediathek/evaluation-of-the-energy-and-cost-figures-of-processes-for-the-elimination-of-micropollutants-in-wastewater-treatment-plants/)
- [US EPA summary of California direct potable reuse rules](https://www.epa.gov/waterreuse/summary-californias-water-reuse-guideline-or-regulation-direct-potable-water-reuse)
- [El Paso, Phoenix and Tucson reuse plans](https://insideclimatenews.org/news/03032025/el-paso-wastewater-drinking-water/)

**Added from the 28 Sep literature review** (via PubMed; abstracts unless noted)

- [Yang et al. 2017, sulfate radicals form nitro-SMX](https://doi.org/10.1016/j.watres.2017.03.054)
- [Zhang et al. 2025, kinetic model + toxicity for sulfamethazine](https://doi.org/10.1016/j.watres.2025.123982)
- [Lee, Escher and von Gunten 2008, estrogenic activity during oxidation](https://doi.org/10.1021/es7023302)
- [He et al. 2022, kinetic prediction of resistance-gene destruction, bench to full scale](https://doi.org/10.1021/acs.est.2c00567)
- [Fenton on veterinary antibiotics, 2023](https://doi.org/10.1016/j.chemosphere.2023.139854)
- [De Witte et al. 2010, ciprofloxacin ozonation, strain-dependent activity](https://doi.org/10.1016/j.chemosphere.2009.12.026)
- [Karlesa et al. 2014, ferrate and beta-lactams](https://doi.org/10.1021/es5028426)
- [Zhang et al. 2015, real-time residual potency method](https://doi.org/10.1039/c5em00228a)
- [de Schepper et al. 2026, antibiotic bioassays in the water cycle](https://doi.org/10.1093/etojnl/vgag207)
- [Minakata and von Gunten 2023, predicting oxidation products](https://doi.org/10.1021/acs.est.3c04086)
- [Stapf et al. 2016, closed-loop ozone control](https://doi.org/10.1016/j.watres.2016.08.010)
- [Gullberg et al. 2011, selection far below MIC](https://doi.org/10.1371/journal.ppat.1002158)
- [Bengtsson-Palme and Larsson 2016, resistance PNECs](https://doi.org/10.1016/j.envint.2015.10.015)
- [AMR Industry Alliance PNEC table, Feb 2026](https://www.amrindustryalliance.org/wp-content/uploads/PNEC-Table-1-AMRIA-Feb-2026.pdf) (table rows read)
- [Leonard et al. 2018, surfers and resistant E. coli](https://doi.org/10.1016/j.envint.2017.11.003)
- [Trejos-Delgado et al. 2026, ozone dose and residual toxicity](https://doi.org/10.1080/10934529.2026.2711513)
