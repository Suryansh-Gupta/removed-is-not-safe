# Pivot assessment: chlorine + ciprofloxacin vs persulfate + SMX (29 Sep 2026)

**Status: CURRENT. Recommendation for the Wed 30 Sep decision, not yet adopted by the team.**
**Verdict: switch to chlorine (free chlorine vs chloramine) + ciprofloxacin in wastewater effluent.** It's better on real-world relevance, measurement feasibility, and evidence that the "removed but still active" effect exists. Its novelty is about the same, with a clearer gap.

---

## 1. Side by side

| | Persulfate + SMX (current) | Chlorine + ciprofloxacin (proposed) |
|---|---|---|
| Used in real plants? | No. Niche; groundwater cleanup mainly (Lee, von Gunten & Kim 2020) | **Yes, nearly everywhere.** San José–Santa Clara plant chlorinates, dechlorinates, sends ~80% via Artesian Slough → **Coyote Creek** → Bay, ~20% to recycled water |
| Evidence of activity surviving drug removal | Mixed: Ao 2018 (UV/PMS, early active TPs) vs Zhang 2016 (UV/PDS, no active TPs) and Yu 2022 (Fe/PDS, detoxified) | **Direct:** Jaén-Gil 2020, cipro activity **rose after complete removal** at >0.5 mg Cl₂/L; chlorinated TP296 kept 30–44% of cipro's activity at 2–4 mg Cl₂/L. Kennedy Neth 2019: active products for all 3 fluoroquinolones tested (none for SMX/TMP) |
| Resistance relevance | Weak: SMX resistance PNEC 16 µg/L | **Strong:** cipro PNEC 0.064 µg/L; real effluents 0.20–1.4 µg/L (Batt 2007); 1 µg/L enriched resistance genes in biofilms (Kraupner 2018) |
| Kinetic data for the model | Scattered; mesh iron release unknown | **Dodd et al. 2005:** cipro + HOCl and + combined chlorine rate constants, checked in real waters |
| Bacteria-test feasibility | Hard: *E. coli* weakly sensitive to SMX (mg/L); thymidine masks it | **Easier:** *E. coli* highly sensitive to cipro (MIC ~0.01 mg/L, I believe; check); no thymidine problem |
| Safety / cost | Persulfate is a strong oxidizer; LC-MS-heavy | Dilute bleach, thiosulfate/bisulfite, DPD kits; cheaper. **Never mix concentrated bleach and ammonia.** |
| Drinking-water link | Indirect | Direct (chlorine used in drinking water; effluent feeds recycled water) |

## 2. Novelty: what exists and what doesn't

**Exists (don't claim):**
- Activity measured after chlorinating cipro: Kennedy Neth 2019 (2–10 mg/L Cl₂; ultrapure water and wastewater; CT 15–140 mg·min/L); Jaén-Gil 2020.
- Kinetics and transformation pathways for cipro + chlorine: Dodd 2005.
- Cipro chlorination products detected in real reclaimed water from 4 Spanish plants, without activity testing: París-Reche 2026 (CIP 263 among the most frequent).
- Chlorination before activated carbon changing bacterial toxicity of hospital effluent: Sompornpailin 2024.

**Not found in PubMed + web searches (possible contribution):**
1. **Chloramine** (combined chlorine, common in ammonia-containing effluent) + cipro + **measured antibacterial activity**. Chloramine studies of fluoroquinolones exist only as byproduct chemistry (e.g. levofloxacin, Sun 2024).
2. A model that **predicts activity** from chlorine dose, contact time and ammonia by linking Dodd-type kinetics to product potencies.
3. Using that prediction to **choose chlorination settings** (meeting a disinfection CT target while keeping activity below a limit), tested blind.
4. **Does dechlorination bring activity back?** El Najjar 2012 showed thiosulfate converts a chlorinated levofloxacin intermediate back to the parent drug. Stanbro & Lenkevich 1982 showed some organic chloramines dechlorinate slowly with sulfite. Whether plant dechlorination regenerates active cipro from its N-chloro intermediate is untested as far as found. This is both a **measurement trap** (the quench could change the answer) and a **possible headline finding**.

**Limits:** PubMed + web only. Kennedy Neth 2019 full text was blocked; only its supplement was seen. Dodd 2005 is abstract-only. Check both before claiming a gap.

## 3. Does the research question change? Structure no, details yes

It's still a flow reactor, still a chemistry → activity → optimizer → blind test chain.

**Draft question (no "and"):**
> *Can a chemistry-based model find chlorination settings that meet disinfection targets while keeping ciprofloxacin-derived antibacterial activity below a predefined limit in blind tests?*

What changes:
- **Drug:** SMX → ciprofloxacin.
- **Oxidant:** persulfate + iron mesh → bleach (free chlorine), with or without ammonia (chloramine), then dechlorination.
- **Optimizer knobs:** chlorine dose, contact time, ammonia (free vs combined chlorine), dechlorination agent and timing. These are real plant settings.
- **Constraint:** the lower bound is a real one. Plants *must* disinfect, measured as CT (concentration × time), so chlorine can't just be cut. The model finds settings that meet CT **and** keep activity below the limit. Chlorine is cheap, so frame the objective as "least chlorine / lowest residual risk" rather than big dollar savings.
- **Hypothesis:** at typical disinfection doses, cipro disappears but chlorinated products keep measurable activity. Chloramine and dechlorination choices shift that activity in ways a drug-only model can't predict.

## 4. Reactor after the pivot

- Coiled tube = **chlorine contact chamber** (plug flow, like a plant's serpentine basin); length sets contact time.
- Pumps: bleach dose → optional ammonia dose (makes chloramine) → dechlorination injection at the outlet. Staged dosing is reused.
- Sensors: **ORP** (plants use it to control chlorination and dechlorination), pH, DPD free/total chlorine kit, photometer/fluorescence for cipro (fluoroquinolones are fluorescent, I believe; check).
- Raspberry Pi control is reused. The steel mesh is dropped.

## 5. What changes in the plan

| Milestone | Change |
|---|---|
| Oct 15 model v1 | Chemistry: HOCl/OCl⁻ speciation, cipro speciation, cipro + HOCl (Dodd 2005), chlorine demand/decay, NH₃ + HOCl → chloramine. **Needs a new validation dataset:** Pu 2020 no longer applies. Candidates: Dodd 2005 real-water decay curves (paywalled; request), Kennedy Neth 2019 author PDF, Jaén-Gil 2020. **Find this week.** |
| Nov 15 prototype | Contact-chamber tube + tracer test; DPD + ORP calibration; cipro photometer/fluorescence calibration |
| Dec 15 assay | Cipro dose–response in *E. coli* (should be far more sensitive). Quench validation is critical: compare thiosulfate, bisulfite, ascorbate, since reversion is possible |
| Jan–Feb | Window scan across CT with free chlorine vs chloramine; dechlorination test; optimizer; blind test |
| Mar | Real effluent sample (e.g., ask San José–Santa Clara or a local plant for pre-disinfection effluent) |

Parts order: cheaper (no persulfate, no mesh; add DPD kit, bleach, ammonium chloride, sodium bisulfite, cipro powder).

## 6. What would change the verdict
- Kennedy Neth 2019 or another paper already models activity across CT or tests chloramine → narrow the claim to the dechlorination question or the blind decision test.
- *E. coli* K-12 cipro sensitivity turns out poor in resazurin (unlikely) → switch detector.
- School or SRC won't allow cipro handling → stay with persulfate + SMX.

## Sources (PubMed unless noted)
Jaén-Gil 2020 [DOI](https://doi.org/10.1021/acs.est.0c00944) · Dodd 2005 [DOI](https://doi.org/10.1021/es050054e) · El Najjar 2012 [DOI](https://doi.org/10.1016/j.watres.2012.09.035) · Stanbro & Lenkevich 1982 [DOI](https://doi.org/10.1126/science.215.4535.967) · Batt 2007 [DOI](https://doi.org/10.1016/j.chemosphere.2007.01.008) · Sun 2024 [DOI](https://doi.org/10.3390/molecules29020396) · Lee, von Gunten & Kim 2020 [DOI](https://doi.org/10.1021/acs.est.9b07082) · Kennedy Neth 2019 (web: [RSC](https://pubs.rsc.org/en/content/articlelanding/2019/ew/c9ew00182d), [supplement](https://www.rsc.org/suppdata/c9/ew/c9ew00182d/c9ew00182d1.pdf)) · París-Reche 2026 (web: [J Hazard Mater Adv](https://www.sciencedirect.com/science/article/pii/S2772416626004602)) · Sompornpailin 2024 (web: [STOTEN](https://www.sciencedirect.com/science/article/abs/pii/S0048969724022381)) · San José RWF (web: [city page](https://www.sanjoseca.gov/your-government/departments-offices/environmental-services/water-utilities/regional-wastewater-facility/treatment-process)) · Kraupner 2018, Keen & Linden 2013 via ChatGPT review register.
