# Antibacterial activity prediction review

**Project:** *Removed Is Not Safe* · **Date:** 28 September 2026 · **Sources:** PubMed (via the PubMed connector) and web search.

**How to read the source notes:** after each source, **[full text]** means the whole paper or page was read; **[abstract]** means only the PubMed abstract was read; **[snippet]** means only a search-result snippet or summary page was seen. Nothing is quoted that wasn't read.

---

## 1. Bottom line

1. **The core idea is still novel, but only as a combination.** No study was found that (a) uses a chemistry model to predict *remaining antibacterial activity* over time, (b) uses that prediction to pick the cheapest reactor settings, and (c) tests the prediction blind. Every *piece* exists separately.
2. **The literature points to a sharper, stronger version of the project.** For ozone and hydroxyl radicals, antibacterial activity usually disappears along with the drug (the "removed = safe" case). For sulfamethoxazole in particular, ozone removes activity one-for-one. The open gap is **sulfate-radical treatment (persulfate)**. Sulfate radicals preferentially turn sulfamethoxazole into a **nitro product**, and a separate study found that nitro product inhibits bacteria **more** than the original drug. Nobody appears to have connected those two findings, measured the result in a reactor, or modeled it.
3. **One honest problem with the target drug.** Sulfamethoxazole's estimated resistance-selection threshold is **16 µg/L**, about 250 times higher than ciprofloxacin's (**0.06 µg/L**). At the tiny levels found in recycled water, sulfamethoxazole is far below the resistance threshold. It is a good *regulatory* example (California names it), but a weak *resistance* example.
4. **Recommended revised research question:**
   > **Can a chemistry-based computer model find the lowest-cost persulfate reactor settings that remove sulfamethoxazole without leaving antibacterial byproducts behind?**

---

## 2. Terms used

- **Oxidation / advanced oxidation process (AOP):** treatment that breaks molecules apart with very reactive chemicals. Ozone, UV light plus hydrogen peroxide (UV/H₂O₂), UV plus chlorine, chlorine, Fenton (iron plus peroxide) and persulfate are all examples.
- **Radical:** a short-lived, extremely reactive molecule. The **hydroxyl radical (•OH)** comes from ozone and UV/H₂O₂. The **sulfate radical (SO₄•⁻)** comes from persulfate activated by iron, heat or UV.
- **Transformation product (TP):** a piece the drug breaks into.
- **Residual antibacterial activity:** how strongly the treated water still slows or kills bacteria.
- **Potency / equivalents:** activity expressed as "this much of the original drug would have the same effect."
- **QSAR (quantitative structure–activity relationship):** a formula that predicts a molecule's effect from its structure.
- **MIC (minimum inhibitory concentration):** the lowest drug concentration that stops bacteria growing.
- **PNEC (predicted no-effect concentration):** the level below which no effect is expected. **PNEC-resistance** is the level below which the drug shouldn't push bacteria toward resistance.
- **Bioassay:** a test that uses living organisms, here bacteria, to measure an effect.

---

## 3. What is already known: activity after oxidation

**Pattern:** it depends on the oxidant and the drug. The table is sorted by oxidant.

| Oxidant | Drug(s) | Finding | Source |
|---|---|---|---|
| Ozone and •OH | 13 antibiotics incl. sulfamethoxazole, trimethoprim, ciprofloxacin, tetracycline | Nearly all cases: activity lost one-for-one with the drug. Exceptions: penicillin G and cephalexin | Dodd et al. 2009, *ES&T* [abstract] [doi](https://doi.org/10.1021/es8025424) |
| Ozone and •OH | Penicillin G, cephalexin | Ozone forms still-active sulfoxides (penicillin version ~15% as potent, ~55% yield; cephalexin version 83% as active). Hydroxyl radicals destroy them; ozone alone doesn't | Dodd et al. 2010, *ES&T* [abstract] [doi](https://doi.org/10.1021/es101061w) |
| Ozone kinetics | 14 antibacterials | Reaction speeds show whether ozone hits the part of each molecule that makes it work. For sulfamethoxazole and trimethoprim, it does | Dodd, Buffle & von Gunten 2006, *ES&T* [abstract] [doi](https://doi.org/10.1021/es051369x) |
| Ozone | Ciprofloxacin in hospital effluent | Activity loss tracked drug loss for *E. coli* and *P. fluorescens*, but breakdown products drove activity against *Bacillus coagulans*. **The test strain matters** | De Witte et al. 2010, *Chemosphere* [abstract] [doi](https://doi.org/10.1016/j.chemosphere.2009.12.026) |
| Ozone | Oxytetracycline factory effluent | Activity vanished when the drug was fully removed; 657 mg/L ozone for 96% removal | Zheng et al. 2010, *Chemosphere* [abstract] [doi](https://doi.org/10.1016/j.chemosphere.2010.08.058) |
| UV and UV/H₂O₂ | 6 antibiotics, pure water and 2 effluents | No active products for 4 of 6 | Keen & Linden 2013, *ES&T* [abstract] [doi](https://doi.org/10.1021/es402472x) |
| UV/H₂O₂ | Amoxicillin | Activity **rose** early in treatment, then disappeared after 20 min at 10 mM H₂O₂ | *Sci. Total Environ.* 2012 [abstract] [doi](https://doi.org/10.1016/j.scitotenv.2011.12.011) |
| Fenton | Ampicillin, doxycycline, tylosin | Too little reagent left active derivatives; too much left toxic peroxides. **A precise dose was needed** | *Chemosphere* 2023 [abstract] [doi](https://doi.org/10.1016/j.chemosphere.2023.139854) |
| Permanganate | Ciprofloxacin, lincomycin, trimethoprim | Products kept negligible activity | *ES&T* 2011 [abstract] [doi](https://doi.org/10.1021/es104234m) |
| Ferrate | Penicillins, cephalexin | Cephalexin products ~24% as potent; others <5% | Karlesa et al. 2014, *ES&T* [abstract] [doi](https://doi.org/10.1021/es5028426) |
| Cold plasma (•OH + ozone) | Ciprofloxacin, ofloxacin | In one test, ciprofloxacin showed **higher** activity after treatment | Sarangapani et al. 2019, *Sci Rep* [abstract] [doi](https://doi.org/10.1038/s41598-019-40352-9) |
| H₂O₂, persulfate, percarbonate | Sulfapyridine (a sulfonamide) | >90% drug removed but only 38–57% of activity; several pieces **more** active than the drug; QSAR predicted piece activity; mixtures showed synergy and antagonism | Yao & You 2023, *Ecotoxicol. Environ. Saf.* [full text] [doi](https://doi.org/10.1016/j.ecoenv.2023.114656) |
| (Pieces tested directly) | Sulfamethoxazole, 11 pieces | Pieces changed at the amino end still work against bacteria; **4-nitro-SMX and 4-OH-SMX inhibit growth more than SMX** (*Vibrio fischeri*) | Majewsky et al. 2014, *Chem. Res. Toxicol.* [abstract] [doi](https://doi.org/10.1021/tx500267x) |
| Antiviral comparison | Oseltamivir (Tamiflu) | Activity temporarily **doubled** up to 50% drug removal | Mestankova et al. 2011, *Environ. Pollut.* [abstract] [doi](https://doi.org/10.1016/j.envpol.2011.09.018) |

**Key link nobody seems to have made:**

- With persulfate, sulfate radicals preferentially attack sulfamethoxazole's amino group, producing a **nitro derivative** and dimers.
- Bicarbonate (common in real water) increases this. Predicted and measured toxicity was higher for sulfate- and carbonate-radical products than for hydroxyl-radical products (Yang et al. 2017, *Water Research*, [abstract], [doi](https://doi.org/10.1016/j.watres.2017.03.054)).
- Majewsky (2014) found 4-nitro-SMX inhibits bacteria more than SMX itself.

Put together, **persulfate treatment of sulfamethoxazole is exactly where "removed" may not mean "safe."** Related chemistry: Ji et al. 2014 ([doi](https://doi.org/10.1016/j.scitotenv.2013.11.008)) and Ji et al. 2015 ([doi](https://doi.org/10.1016/j.watres.2015.09.005)) found the aniline (amino) group is the main sulfate-radical target, including in iron-activated persulfate [abstracts].

**Salty water:** in chloride-rich water, persulfate-type systems form reactive chlorine species and chlorinated sulfamethoxazole products. One 2026 study rated these less toxic by computer prediction and a wheat test, but ran no antibacterial test (*J. Hazard. Mater.* [abstract] [doi](https://doi.org/10.1016/j.jhazmat.2026.142702)).

---

## 4. What exists on modeling, optimization and control

| Piece | Closest prior work | What's missing for our idea |
|---|---|---|
| Using kinetics to reason about activity | Dodd 2006: ozone reaction speeds at the essential part of the molecule [abstract] | Ozone only; no model of the pieces' activity over time; no optimization |
| Kinetics + structure–activity for another endpoint | Lee, Escher & von Gunten 2008: estrogen activity of EE2 pieces from 6 oxidants, with a QSAR [abstract] [doi](https://doi.org/10.1021/es7023302) | Estrogenic, not antibacterial; no design optimization |
| Kinetic model + toxicity of pieces, for a sulfonamide | Zhang et al. 2025, *Water Research*: kinetic model of sulfamethazine and lumped intermediates, combined with computer-predicted algae toxicity [abstract] [doi](https://doi.org/10.1016/j.watres.2025.123982) | **Closest match.** But: photocatalysis, grouped pieces, algae toxicity (not antibacterial), no cost optimization, no blind test |
| Kinetic prediction of a resistance endpoint, bench to full scale | He, Dodd et al. 2022, *ES&T*: predicted resistance-gene destruction by UV and chlorine, confirmed at two full-scale plants [abstract] [doi](https://doi.org/10.1021/acs.est.2c00567) | Genes, not antibiotic activity; no optimization |
| Uncertainty in removal models | Neumann et al. 2008: Monte Carlo and sensitivity analysis of an ozone pilot model [abstract] [doi](https://doi.org/10.1016/j.watres.2008.11.049) | Removal only |
| Predicting breakdown products | Minakata & von Gunten 2023 perspective: no theoretical tool alone can yet predict oxidation products [abstract] [doi](https://doi.org/10.1021/acs.est.3c04086) | Confirms our activity prediction must lean on measured product lists and experiments |
| Machine learning / Bayesian optimization of oxidation | Many papers (e.g. catalytic ozone with Bayesian optimization, 2025; peroxymonosulfate ML, 2026) [snippets] | Objectives are % removed or energy; none used antibacterial activity |
| Toxicity as an optimization objective | Hu et al. 2024, *npj Clean Water*: multi-objective optimization for effluent toxicity [snippet] [link](https://www.nature.com/articles/s41545-024-00361-2) | Biological plant, historical data, not oxidation, not antibacterial |
| Real-time dose control | Closed-loop ozone control with online UV readings (Stapf et al. 2016 [abstract] [doi](https://doi.org/10.1016/j.watres.2016.08.010)); Zurich full scale with UV and electron-donating capacity (2022) [snippet] | Aims at parent drugs; no activity check |
| Decision tools with bioassays | Schindler Wildhaber et al. 2015: tiered lab test for whether ozone suits a plant, incl. bioassays; ozone sometimes increased toxicity [abstract] [doi](https://doi.org/10.1016/j.watres.2015.02.030) | A screening procedure, not a predictive model or optimizer |
| Patents | Found dosing-by-residual-agent control (CN101568822B) and ARB detection (US20240271178A1) [titles only] | None found for dosing based on residual antibacterial activity. Search not exhaustive |

---

## 5. Novelty verdict

**Not new:** measuring activity after oxidation; QSAR for pieces; kinetic models of iron-persulfate; ML/Bayesian optimization of oxidation; real-time ozone control; kinetic prediction of a biological endpoint (estrogenicity, resistance genes).

**New, if done:**
1. A kinetic model that tracks sulfamethoxazole *and its active pieces* (especially the nitro product) under **sulfate-radical** treatment and converts that into one number, remaining antibacterial activity.
2. Using that number as a **constraint in a cost optimization**, including staged dosing and iron amount.
3. A **blind prediction test** of the activity number in a flow reactor.

**Strongest short claim:** *For ozone, removing sulfamethoxazole removes its antibacterial activity. For persulfate, the chemistry predicts it may not. We built a model that predicts when, and uses that to pick the cheapest safe settings.*

**Main risk to novelty:** a 2025–2026 paper outside PubMed (for example in *Chem. Eng. J.* or *ACS ES&T Engineering*) could have done part of this. Google Scholar and Web of Science weren't available here. Do one 30-minute Google Scholar search on "sulfamethoxazole persulfate antibacterial activity nitro" before the project is locked.

---

## 6. Recommended topic revisions

1. **Sharpen the hypothesis to the sulfate-radical gap.** Compare persulfate (sulfate radicals) against a hydroxyl-radical control. UV/H₂O₂, or persulfate with the sulfate radicals blocked by a scavenger chemical, would both work. The prediction is that activity can stay behind with persulfate but not with •OH.
2. **Model the nitro product explicitly.** Include 4-nitro-SMX and hydroxylated SMX as tracked species with published or measured potencies. Include bicarbonate, which boosts nitro formation.
3. **Deal with the resistance-threshold problem honestly.** Either:
   - keep sulfamethoxazole as the *regulatory* example and add **trimethoprim**, which is usually paired with it in medicine and has a resistance threshold of 0.5 µg/L; or
   - state plainly that the resistance argument is strongest for drugs like ciprofloxacin and trimethoprim, and that sulfamethoxazole is the test case for the *method*.
4. **Test design matters:**
   - Sulfonamides need a medium low in thymidine, or they look inactive.
   - Results depend on the test strain (De Witte 2010), so pick *E. coli* and state it.
   - Quench leftover oxidant with thiosulfate before every test, because Fenton overdosing produced toxicity from leftover peroxide.
5. **Revised research question (no "and"):**
   > Can a chemistry-based computer model find the lowest-cost persulfate reactor settings that remove sulfamethoxazole without leaving antibacterial byproducts behind?

---

## 7. Measuring residual activity cheaply

- **Real-time growth-curve method:** *S. aureus* with results as "drug equivalents." It gave better repeatability than fixed-time reading (1.08% vs 5.62–11.29% variation). Quantification limits were **0.20–24 µg/L** depending on the antibiotic. Breakdown products contributed 13–23% of remaining potency in factory wastewater (Zhang et al. 2015 [abstract] [doi](https://doi.org/10.1039/c5em00228a)).
- **Effect-based panels (2026):** three antibacterial bioassays on water extracts. They detected activity in every wastewater effluent tested, and they often found activity when chemical tests found no antibiotics (and the reverse). A simple *E. coli* test was recommended for screening (de Schepper et al. 2026, *Environ. Toxicol. Chem.* [abstract] [doi](https://doi.org/10.1093/etojnl/vgag207)).
  - **This strongly supports the project's "measure activity, not just the drug" argument.** It also shows that concentrating samples is usually needed at real-world levels.
- **Regulatory status:** California's recycled-water policy panel recommended two screening bioassays, estrogen receptor and aryl hydrocarbon receptor. **No antibacterial endpoint** (SCCWRP, 2018 [full text of news page] [link](https://www.sccwrp.org/news/cec-panel-informs-proposed-update-recycled-water-policy/)).
- **Implication:** our resazurin test will work at lab (µg/L to mg/L) concentrations, not at real-world ng/L without concentrating the sample. Say this plainly.

---

## 8. How water residues connect to resistance (verified numbers)

- **Very low levels can select resistance.** For three clinically important antibiotics, concentrations up to several hundred times below the MIC enriched resistant bacteria (Gullberg et al. 2011, *PLoS Pathogens* [abstract] [doi](https://doi.org/10.1371/journal.ppat.1002158)).
- **Resistance thresholds span a wide range.** Estimated resistance-selection PNECs for 111 antibiotics range from 8 ng/L to 64 µg/L (Bengtsson-Palme & Larsson 2016 [abstract] [doi](https://doi.org/10.1016/j.envint.2015.10.015)).
- **Industry table** (AMR Industry Alliance, rev. Feb 2026 [table rows read] [link](https://www.amrindustryalliance.org/wp-content/uploads/PNEC-Table-1-AMRIA-Feb-2026.pdf)):

  | Antibiotic | Resistance PNEC | Ecotoxicity PNEC | Target |
  |---|---|---|---|
  | Sulfamethoxazole | 16 µg/L | 6.6 µg/L | 6.6 µg/L |
  | Ciprofloxacin | 0.06 µg/L | 0.45 µg/L | 0.06 µg/L |
  | Trimethoprim | 0.5 µg/L | 928 µg/L | 0.5 µg/L |

- **People do pick up resistant bacteria from water.** 6.3% of surfers vs 1.5% of non-surfers carried a resistant *E. coli* type, risk ratio 4.09 (95% CI 1.02–16.4) (Leonard et al. 2018 [abstract] [doi](https://doi.org/10.1016/j.envint.2017.11.003)). **Correction:** this is about four times, not three as stated earlier, and the confidence range is wide.
- **Still unmeasured:** how much water residues contribute to resistant infections in people overall.

---

## 9. Impact and money (carried from earlier research, sources in the project doc)

- **Global AMR burden:** Lancet GRAM 2024 forecasts 39 million deaths from 2025 to 2050, rising to 1.91 million a year by 2050.
- **US AMR burden (CDC):** 2.8 million resistant infections and 35,000 deaths a year; $4.6 billion a year for six pathogens.
- **California DPR rules:** adopted by the State Water Board on 19 Dec 2023, approved by the Office of Administrative Law in August 2024 (ACWA [full text] [link](https://www.acwa.com/news/office-of-administrative-law-approves-direct-potable-reuse-regulations/)). The ozone/BAC stage must achieve a 1-log reduction of indicators including sulfamethoxazole.
- **EU wastewater law:** producers pay ≥80% of the cost of extra treatment, split partly by hazard; about €1.2 billion a year by 2040 (JRC).
- **Swiss program:** CHF 1.2 billion; operating costs of 0.02–0.09 CHF per m³.
- **US plants:** Phoenix plans 60 MGD by 2030; El Paso's plant is 10 MGD.
- **Overdosing:**
  - A UV-chlorine review says fixed-dose control is almost always overdosing to some extent [snippet].
  - UV/H₂O₂ uses only about 10% of the peroxide added [abstract].
  - A 2026 full-scale vs lab comparison found ozone dose was the main driver of remaining toxicity. Estrogenic activity removal was 100% at 0.7 vs 62% at 0.1 mg O₃/mg DOC. The authors call for optimized ozone dosing (Trejos-Delgado et al. 2026 [abstract] [doi](https://doi.org/10.1080/10934529.2026.2711513)).
- **The $0.2–1.6 million/year per-plant savings figure remains our own rough estimate, not a published number.**

---

## 10. Limits of this review

- Mostly abstracts. Only Yao & You 2023 and a few web pages were read in full. Numbers from abstracts are as stated there.
- PubMed covers environmental science well, but not every engineering journal. Google Scholar, Web of Science and patent databases weren't searched directly.
- Majewsky's "more active" finding used *Vibrio fischeri*, not *E. coli*. Activity against *E. coli* in a thymidine-low medium should be checked in the lab.
