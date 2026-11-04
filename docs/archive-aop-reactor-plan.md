# Activity-Aware Oxidation Reactor: Plan & Literature Review

Sep 26, 2026 · @anonymous

## The project in one page

We build a computer model that designs a water-cleaning reactor to remove the *harm* antibiotics do to bacteria, not just the antibiotic molecule, then prove it with a small device and about 12 experiments.

**The problem in plain words.** Some water treatment uses "oxidation": chemicals that make short-lived, highly reactive molecules called radicals, which tear antibiotics apart. Plants check success by measuring whether the original antibiotic is gone. But the broken pieces (called transformation products) can still kill or slow bacteria. One 2023 study removed over 90% of the antibiotic sulfapyridine but only 40–60% of its antibacterial activity. Leftover activity is what pushes bacteria to become resistant.

**What we build.**

1. **Chemistry model:** a list of 30–60 reactions (how radicals form, what they attack, what wastes them), solved on a computer.
2. **Flow model:** how water moves through the reactor and how long it stays.
3. **Activity model:** predicts which pieces form and whether each still harms bacteria, then adds it all up into one score: *remaining antibacterial activity*.
4. **Optimizer:** searches thousands of designs for the lowest remaining activity at the lowest cost, while being safe against uncertainty in the model.
5. **Device + experiments:** the model picks the \~12 most useful experiments; we run them on our device and check whether the model predicted correctly.

**Where it applies.** The model works for any oxidation method: iron + persulfate (our original reactor), UV light + peroxide or persulfate, chlorine, and ozone (using published data). Ozone and UV methods are used at large drinking-water reuse plants, where California already requires removing 90% of the antibiotic sulfamethoxazole.

**The honest pitch:** a general, tested way to predict and minimize leftover antibacterial activity in oxidation treatment, shown on a low-cost device.

## The oxidation device

Yes, we can build one: a small bench "test rig" where the part that makes radicals is a swappable cartridge, so one device tests both iron + persulfate and UV light + oxidant.

&#91;embedded content: test rig · water path plus one control loop\]

Water flows left to right along the top row. The controller sets the pump, the dose and the light, and reads the detector, so the optimizer can run the rig itself.

**Why this device matters for the project**

- **Swappable activation.** Cartridge A is our original iron lattice (iron + persulfate). Cartridge B is a quartz tube wrapped in UV-C LEDs (about 265–280 nm) for UV + hydrogen peroxide or UV + persulfate. Same pump, dosing and detector for both, so results are directly comparable.
- **Staged dosing ports.** The oxidant can be added at 1, 2 or 3 points along the tube. The model predicts that splitting the dose beats adding it all at once; this is how we test that claim.
- **Closed loop.** The controller can run the model's chosen experiments automatically and log everything.
- **Real precedent.** A 2023 study used submersible UV-C LEDs with persulfate to destroy the antibiotic ampicillin, fully removed its antibacterial activity, and estimated about $0.095 per 1,000 liters treated. So the UV-C LED approach is realistic, not a guess.

**What we leave out, and why.** Ozone is used at big plants but is a toxic gas that needs a generator and off-gas destruction. It is not safe for a student lab. We model ozone using published data instead (Dodd et al. measured it for 13 antibiotics).

**Parts (rough estimate, to be priced with real quotes)**

| Part | What it does | Rough cost |
| --- | --- | --- |
| Peristaltic pump | Moves water at a set speed | reuse from original reactor |
| 2–3 small dosing pumps | Add oxidant at set points | $20–40 each |
| Iron lattice cartridge | Iron-activated persulfate | reuse from original reactor |
| Quartz tube + UV-C LEDs + heat sink | UV-activated oxidant | $60–150 |
| Flow-through photometer | Reads antibiotic level | reuse our DIY photometer |
| Raspberry Pi + relay/driver boards | Runs the model, controls the rig | $60–100 |
| Light-proof enclosure + lid switch | UV-C safety | $20–40 |

**Safety rules.** UV-C burns eyes and skin: the LEDs sit in a closed box and a lid switch cuts power when it opens. Persulfate and peroxide are oxidizers: gloves and goggles, and waste is neutralized before disposal. The *E. coli* test needs approval from our science fair's safety committee before we start.

## Is it novel?

**Verdict: moderately novel.** Every single piece has been done before. What we did not find anywhere is the combination: using *predicted leftover antibacterial activity* as the goal that designs a flow reactor, with uncertainty built in and experiments chosen by the model. We must pitch it as an integration, not a brand-new idea.

**What already exists (so we must not claim it)**

| Idea | Already done? | Key evidence |
| --- | --- | --- |
| Measuring leftover antibacterial activity after oxidation | Yes, often | [Dodd et al. 2009](https://pubs.acs.org/doi/abs/10.1021/es8025424) tested 13 antibiotics under ozone; [UV-C LED + persulfate, 2023](https://pubmed.ncbi.nlm.nih.gov/38040251/) removed ampicillin's activity |
| Predicting combined activity of an antibiotic and its pieces | Yes, once for a similar drug | [Yao & You 2023](https://pubmed.ncbi.nlm.nih.gov/36796210/): sulfapyridine, with persulfate; used a structure-based prediction (QSAR) |
| Kinetic models of persulfate or UV oxidation | Yes, many | [Electro-activated persulfate + SMX modeling, 2018](https://www.sciencedirect.com/science/article/abs/pii/S0959652618316202); [WaterTAP UV-AOP model](https://watertap.readthedocs.io/en/0.9.0/technical_reference/unit_models/uv_aop.html) |
| Machine learning or Bayesian optimization of oxidation | Yes, crowded field | [2026 review](https://doi.org/10.3390/catal16070596) warns lab accuracy is often mistaken for real-world usefulness |
| Quantum chemistry to predict where radicals attack | Yes, routine | Used in most recent transformation-product papers |
| UV-C LED + persulfate device | Yes, at bench scale | [UV-C LED + persulfate, 2023](https://pubmed.ncbi.nlm.nih.gov/38040251/) |

**What appears new (we found no study doing this)**

1. **Activity as the design target.** Existing studies optimize for "percent of antibiotic removed" and then check activity afterward. We would optimize *for* leftover activity from the start.
2. **Staged dosing designed against activity.** Adding oxidant at several points, with the split chosen to minimize activity, not just removal.
3. **Robust design + model-chosen experiments + a blind prediction test.** Most oxidation machine-learning papers fit lots of data; we would run few experiments and test the model on one it never saw.
4. **One framework across oxidants on one device.** Same model and same rig for iron + persulfate and UV + oxidant.

**Why the gap is real.** A 2025 review notes that pieces formed during treatment like ozonation are poorly covered by current prediction tools ([ES&T 2025](https://pubs.acs.org/esthag/article/59/36/19095/3668198/In-Silico-Frontiers-Shaping-the-Next-Generation-of)). A 2023 review lists better prediction of oxidation pathways as an open need ([ES&T 2023](https://pubs.acs.org/esthag/article/57/47/18410/315654/Predicting-Transformation-Products-during-Aqueous)).

**Before we commit:** search Google Scholar for "antibacterial activity" + "optimization" + "persulfate" (and + "reactor design"). One paper doing exactly our point 1 would change the pitch.

## Impact and money

**Verdict: the problem is big and real; our project's direct impact is a tool that helps treatment get cheaper and safer, not a cure for resistance.** The money case is strongest at large oxidation plants that are already spending, or about to spend, heavily.

**1. The health problem is large.**

- In the US, drug-resistant germs cause over 2.8 million infections and over 35,000 deaths a year ([CDC](https://www.cdc.gov/antimicrobial-resistance/about/index.html)).
- Treating just six of these germs costs US health care more than $4.6 billion a year ([CDC](https://cdc.gov/antimicrobial-resistance/stories/partner-estimates.html)).
- The World Bank estimates unchecked resistance could cost $1–3.4 trillion of world economic output per year by 2030 ([WHO report](https://apps.who.int/gb/ebwha/pdf_files/WHA77/A77_5-en.pdf)).
- The UN Environment Programme names hospital and city wastewater and drug-factory wastewater as ways the environment feeds resistance ([UNEP 2023](https://www.unep.org/resources/superbugs/environmental-action)).

**2. "Removed" really is not "safe" — this is the core evidence.**

- Sulfapyridine: over 90% of the drug removed, but only 40–60% of its antibacterial activity removed ([Yao & You 2023](https://pubmed.ncbi.nlm.nih.gov/36796210/)).
- Another sulfapyridine study found some pieces were *more* antibacterial than the original drug ([2021 study](https://www.sciencedirect.com/science/article/abs/pii/S0959652621038750)).
- Ozonating penicillin G forms a piece that still kills bacteria until a second type of radical destroys it ([Dodd 2010](https://pubs.acs.org/esthag/article-abstract/44/15/5940/197127/Transformation-of-Lactam-Antibacterial-Agents)).
- Counterpoint: for many antibiotics under ozone, activity drops about as fast as the drug ([Dodd 2009](https://pubs.acs.org/doi/abs/10.1021/es8025424)). So the risk depends on the drug and the oxidant — exactly what a model should sort out.

**3. Where the money is.**

| Where | Money at stake | How our model could save it |
| --- | --- | --- |
| EU plants adding micropollutant treatment by 2045 | About €1.2 billion a year by 2040 (€1.56 billion in 2025 prices), 80% paid by drug and cosmetics makers ([EU JRC](https://publications.jrc.ec.europa.eu/repository/handle/JRC144745), [EU Council](https://www.consilium.europa.eu/en/press/press-releases/2024/11/05/urban-wastewater-council-adopts-new-rules-for-more-efficient-treatment/)) | Right-size ozone or UV doses; drug makers paying the bill have a direct reason to care |
| US drinking-water reuse plants (El Paso, Phoenix, Tucson, California) | Advanced treatment uses about 0.23–2.5 kWh of electricity per 1,000 liters ([Sim & Mauter 2021](https://pubs.rsc.org/en/content/articlelanding/2021/ew/d1ew00017a)) | Plants run fixed, cautious doses and overdose by design ([2023 review](https://www.sciencedirect.com/science/article/pii/S2589914723000191)); UV + peroxide uses only about 10% of the peroxide added ([2020 study](https://pubmed.ncbi.nlm.nih.gov/32822532/)) |
| Drug-factory wastewater | WHO's first limits for antibiotic factory wastewater (2024) ([WHO](https://www.who.int/news/item/03-09-2024-new-global-guidance-aims-to-curb-antibiotic-pollution-from-manufacturing)) | Cheapest way to hit a resistance-based limit |

**4. How cheap the treatment itself can be.** Published bench costs for UV + persulfate are about $0.10–$0.33 per 1,000 liters ([ampicillin study](https://pubmed.ncbi.nlm.nih.gov/38040251/), [aquaculture study](https://www.sciencedirect.com/science/article/abs/pii/S138589472408625X)). Our own cost per 1,000 liters goes next to these.

**What we can honestly claim about money:** we cannot yet say "saves X dollars." The project's job is to calculate how much oxidant and energy can be cut while keeping leftover activity at zero. If that number is even a small percent, it matters at the scale above. We report it as a result, not a promise.
