# Roadmap: every phase, step and reason (chlorine + ciprofloxacin version)

**Last updated:** 2026-10-16 (Checkpoint A confirmed on digitized Dodd data); rev. 3 2026-10-05 (HPLC-UV at BioCurious is the main cipro measurement; Dodd 2005 constants in the model). **Status: CURRENT, but `project-state.md` is newer for status.** Deliverable owners and handoffs: `deliverables-and-split.md` (proposed Oct 16 split in `project-state.md`). Day-by-day for Phase 1: `oct15-prototype-sprint.md`. Partner A = chemistry + reactor, Partner B = activity + optimizer.

**Research question (draft):** Can a chemistry-based model find chlorination settings that meet disinfection targets while keeping ciprofloxacin-derived antibacterial activity below a predefined limit in blind tests?

**The idea in plain words:** San José's wastewater plant disinfects its cleaned water with bleach (sodium hypochlorite), then removes the leftover bleach with sodium bisulfite before the water flows to Coyote Creek and the Bay (switched from chlorine gas / sulfur dioxide in 2011). Chlorine turns ciprofloxacin (cipro) into "N-chloro-cipro" in under a second; that falls apart over roughly 15–20 minutes, and **every product keeps the quinolone core** (the part of cipro that attacks bacteria) (Dodd 2005). Two open questions: (1) do those products still stop bacteria, and (2) does the bisulfite step turn leftover N-chloro-cipro back into cipro? (Dodd 2005 suggested this could happen at plants but never measured it.) The model predicts both and picks settings that disinfect while leaving the least activity.

**Key published facts this plan rests on**
- Dodd et al. 2005 (Environ. Sci. Technol. 39:7065, doi 10.1021/es050054e; PDF in hand): species-specific cipro + HOCl constants (Table 3); N-chloro-cipro breakdown 2.4 × 10⁻⁴ (pH 4.6) to 7.6 × 10⁻⁴ s⁻¹ (pH 8.6); cipro + combined chlorine k′ = 4.4 × 10⁻⁴ s⁻¹ at 15 µM (pH 7); all products keep the core; thiosulfate/sulfite reverse N-chloro-cipro; real-water validation (Fig. 5a). Measured cipro by HPLC with UV and fluorescence detectors.
- Jasper, Shafaat & Hoffmann 2016 (doi 10.1021/acs.est.6b02912; SI free): independent breakdown rate 5.6 × 10⁻⁴ s⁻¹ at pH 8.7 (35% below Dodd's model value); thiosulfate quench reverts the intermediate.
- Jaén-Gil 2020 (doi 10.1021/acs.est.0c00944): antibacterial activity rose after complete cipro removal at > 0.5 mg Cl₂/L. Kennedy Neth 2019: active products from fluoroquinolones.

**Checkpoints** are yes/no tests. If one fails, follow its "if it fails" line.

| Phase | Dates | Main output | Checkpoint |
|---|---|---|---|
| 0 Lock and launch | Oct 4 – Oct 16 | Paperwork in, lab access (school + BioCurious), cipro sourced, plant contacted | — |
| 1 Chemistry model v1 | now – Oct 15 | Model matches published cipro data | **A** (PASS 10-16 on digitized data: 14.5% / 8.6%) |
| 2 Contact-chamber reactor v1 | Oct 16 – Nov 15 | One real chamber; flow measured; HPLC method working; first cipro runs | — |
| 3 Bacteria test + activity model | Nov 16 – Dec 15 | Test calibrated on cipro; activity layer built | **B** (go/no-go) |
| 4 Full reactor + window/dechlorination scan | Dec 16 – Jan 15 | 3 dosing points; activity vs dose, before/after bisulfite | **C** |
| 5 Optimize and pick experiments | Jan 10 – Feb 5 | Cheapest acceptable setting; 8–12 chosen runs | — |
| 6 Experiments + blind test | Feb 1 – Feb 28 | Fitted model, blind result, four-way comparison | **D** |
| 7 Real water, cost, share | Mar 1 – fair | Real effluent check, $/1,000 L, GitHub, poster | — |

---

## Phase 0 · Oct 4 – Oct 16 · Lock and launch

| Step | Why |
|---|---|
| SRC (Scientific Review Committee) paperwork + a Qualified Scientist/teacher in writing | Fair rules: no culturing bacteria at home; *E. coli* K-12 is BSL-1 and must be grown in a BSL-1 (or higher) lab. Approval takes weeks. |
| **BioCurious HPLC-UV access:** confirm membership/fees, training or sign-off on the HPLC, which column is installed, available solvents (acetonitrile, phosphate buffer), booking times, and whether a staff member can supervise | HPLC separates cipro from its products before measuring them, which fluorescence or UV alone can't do (all products keep the same light-absorbing core). |
| **Tell the SRC about BioCurious** (work done outside home/school may need extra forms, e.g. a regulated research/industrial setting form, and a supervisor there) | Avoids a compliance problem at check-in. |
| Ask BioCurious whether the bacteria test (BSL-1 *E. coli* K-12) could also run there | Could solve the lab-space question for Phase 3 if the school lab isn't available. |
| Confirm a school lab for chemistry runs | Chemistry is safer in a lab (fume hood, eyewash, waste handling). |
| Source cipro powder (school supplier account, or via BioCurious) | Pure ciprofloxacin is usually sold to institutions, not individuals. Also needed as the HPLC calibration standard. |
| Check every chemical's SDS (safety data sheet), including acetonitrile | Fair rule (2026–27): chemicals listed as carcinogenic, teratogenic or reproductive-toxic need a research institution or restricted fume hood with a trained supervisor. |
| Email the San José–Santa Clara RWF lab: chlorine dose, contact time, residual, effluent ammonia, time from chlorination to bisulfite, pre-chlorination sample | Makes the model's settings match the real plant. |
| Order parts (list below) | Shipping takes 1–2 weeks; the reactor is needed by Nov 15. |

## Phase 1 · now – Oct 15 · Chemistry model v1 (computer only)

| Step | Status |
|---|---|
| **D1 Chlorine backbone** (`chlorine_backbone.py` + notebook) | Built. User checklist remaining (ammonia/pH runs, graphs, explanation). |
| **D2 Cipro reactions** (`cipro_model.py` + notebook): Dodd constants; products tracked as P1 (CF-Pa1) and P2 (later), both keep the core; bisulfite reversal `k_rev_bisulfite` unknown | Built 10-05. Sensitivity: the HOCl and chloramine constants don't matter; breakdown speed and bisulfite reversal do. |
| **D3 Validation + flow** (`flow_reactor.py` + notebook): Dodd Fig. 5a with no fitting; Jasper as independent check; tanks-in-series with four textbook checks; tracer-fit code | Built 10-05. Checkpoint A PASS: 14.5% (wastewater) / 8.6% (drinking) error on Fig. 5a digitized from the PDF 10-16 (commit 7e4eb4a; earlier pixel estimates gave 13.7% / 8.1%). |
| **D4 Drug-only baseline** (B) | To do, from `run_batch()` outputs. |

**Checkpoint A (Oct 15):** within ~20% of the published decay curve. *If it fails:* check units, pH handling and the "measured cipro" definition first.

## Phase 2 · Oct 16 – Nov 15 · Contact-chamber reactor v1 + HPLC method

| Step | Why |
|---|---|
| Build one coiled-tube chamber, peristaltic pumps for water and dilute bleach | Plant contact basins are long channels; a coiled tube behaves similarly at bench scale. |
| Calibrate DPD chlorine readings (free and total) against known standards | Chlorine is the main input; DPD is cheap and is what plants use. |
| **Set up the HPLC-UV method at BioCurious** (see "How cipro is measured" below): cipro standards 0.05–2 mg/L, calibration line, repeat injections, then one chlorinated sample to see the product peaks | Turns peak area into concentration, and shows cipro, N-chloro-cipro and products as separate peaks. |
| **Tracer test:** inject food dye or salt, record how it exits | Gives the number of tanks for the flow model. Can't be guessed. |
| Measure chlorine demand of your lab water recipe | The model's only fitted chlorine number for your water. |
| **Measure the breakdown speed yourself:** chlorinate cipro, take samples over 0–60 min, quench with thiosulfate, run HPLC (Dodd's method) | The sensitivity test says this is the constant that matters most, and two labs disagree by 35%. |
| First cipro runs at 3–4 chlorine doses, quenched with **bisulfite at the plant's dose and timing**; a few samples also with thiosulfate | Bisulfite = what leaves the plant. Comparing the two shows whether bisulfite reverses N-chloro-cipro (Gap 2). |
| Model v2: fit flow + demand + breakdown speed to your data | First time the model meets your reactor. |

## Phase 3 · Nov 16 – Dec 15 · Bacteria test + activity model

| Step | Why |
|---|---|
| **First bacteria experiment: cipro dose–response** (*E. coli* K-12 + resazurin, 96-well plates, Mueller-Hinton broth) | Biggest risk. Cipro is very potent against *E. coli* (Dodd cites MICs of roughly 2–5 µg/L for some species), so dilutions must reach that low. |
| Controls: bleach alone, bleach + bisulfite, bisulfite alone, ammonium chloride alone, cell-free dye | Leftover chlorine or the quencher can kill bacteria or change the dye on their own. |
| Quench every sample with bisulfite, the plant's chemical | The bacteria then see what the creek sees. |
| Read color with a phone/scanner + image analysis if no plate reader | Cheap substitute; validate against a plate reader once. |
| Activity layer: each molecule (cipro, N-chloro-cipro, P1, P2) × its potency relative to cipro, summed → cipro-equivalent → predicted % inhibition | Converts chemistry into the number the plate measures. |
| Write the **activity limit** down now | Setting it after seeing results moves the goalposts. |

**Checkpoint B (Dec 15), go/no-go:** clear, repeatable dose–response with clean controls? *If not:* fix the test before any reactor activity runs.

## Phase 4 · Dec 16 – Jan 15 · Full reactor + window/dechlorination scan

| Step | Why |
|---|---|
| Add ammonia dosing (pre-formed chloramine) and bisulfite dosing at the outlet; Raspberry Pi logs pH, ORP, flow | The real plant choices: free chlorine vs chloramine, contact time, dechlorination. Model shows chloramine must be pre-formed or cipro just reacts with the free chlorine first. |
| **Window scan:** light → heavy chlorine; free vs pre-formed chloramine; samples before and after bisulfite; HPLC + activity on each | Tests both gaps. |
| Fit potency weights and the bisulfite reversal rate | Tunes the model to your data before optimizing. |

**Checkpoint C (mid-Jan):** extra activity beyond leftover cipro, or cipro returning after bisulfite? *If no:* a real result. Report it and test whether the simple model is enough.

## Phase 5 · Jan 10 – Feb 5 · Optimize and pick experiments

| Step | Why |
|---|---|
| Cost layer: $ per 1,000 L from bleach, ammonia, bisulfite (dose × price) | The question is about cost; assumptions listed. |
| Optimize: minimize cost subject to CT ≥ target and activity ≤ limit (directly on the model, or a Gaussian-process stand-in if needed) | The decision the project is about. |
| Also optimize with the CT rule only (drug-only plan) | Do the two plans pick different settings? |
| Pick 8–12 runs where the model is most uncertain; reserve blind-test conditions now | Blind data must never touch the fit. |

## Phase 6 · Feb 1 – Feb 28 · Experiments + blind test

| Step | Why |
|---|---|
| 8–12 conditions × 3 independent reactor runs | Measures real repeatability. |
| Each run: cipro + products (HPLC), activity (plate), free/total chlorine, pH | Every one is a model prediction to check. |
| **Blind test:** timestamped prediction saved, then run | Strongest evidence. |
| **Four-way comparison:** drug-only vs simple fitted curve vs full model; cost-optimal with vs without the activity limit | Answers whether the chemistry model is worth it. |
| Keep failed runs, with reasons | Judges trust it. |

**Checkpoint D:** blind result inside the model's range, and the full model beats simpler ones? *If not:* report honestly; label any refit as post-validation.

## Phase 7 · Mar 1 – fair · Real water, cost, share

| Step | How |
|---|---|
| **D12a cost** | Chemical dose (mg/L) × price per kg (bulk 12.5% sodium hypochlorite, sodium bisulfite, ammonia; cited utility bids or quotes) → $ per 1,000 L and per million gallons. Chemicals only. Compare with and without the activity limit. |
| **D12b real effluent** | Filtered, not-yet-chlorinated effluent via an adult contact. Measure chlorine demand (DPD), spike cipro, run best and drug-only settings, measure cipro (HPLC) and activity. Fit only demand. **Ask the SRC first** (2026–27 rule text: water testing in BSL-2). |
| D13 GitHub | Code, data, protocol, device files. |
| D14 poster, report, talks | Practice "what's new?" and "how do you know the bacteria test works?" |

---

## How cipro and its products are measured

**Main method: HPLC with a UV detector at BioCurious** (community biology lab). HPLC (high-performance liquid chromatography) pushes the sample through a packed column. Different molecules come out at different times ("retention times"), and the UV detector measures each as a separate peak. This solves the core problem: cipro and all its products absorb UV the same way because they share the quinolone core, so only separation tells them apart.

| Item | Plan (start from Dodd 2005's conditions, adjust to the column BioCurious has) |
|---|---|
| Column | Reversed-phase C18 or similar (Dodd used a Supelco Discovery RP-Amide C16) |
| Mobile phase | Acidic phosphate buffer (pH ~2–3) mixed with acetonitrile, gradient or fixed ratio |
| Detection | UV ~278 nm (cipro's absorption peak; Dodd's fluorescence excitation wavelength). Dodd reports UV detection limits around 100 nM (~33 µg/L), fine for lab-level 1 mg/L starting cipro |
| Calibration | Cipro standards 0.05–2 mg/L each session; repeat injections for precision |
| Products | No pure product standards → report as "cipro-equivalent peak area," assuming similar UV response (the core is the same). State this assumption. |
| Gap 2 test | Inject the same chlorinated sample (a) right away, (b) after bisulfite, (c) after thiosulfate. If the N-chloro-cipro peak shrinks and the cipro peak grows, that's reversal, measured directly. (Dodd isolated N-chloro-cipro by HPLC, so it can show up as its own peak.) |
| Samples per session | Keep a log of time from sampling to injection; N-chloro-cipro keeps breaking down in the vial |

**What each tool is for**

| What | How |
|---|---|
| Cipro, N-chloro-cipro, products | HPLC-UV (BioCurious) |
| Quick check between HPLC sessions | TLC under a UV lamp, or a fluorescence reading (measures cipro + products together) |
| Chlorine | DPD test kit |
| Chlorine trend; confirming bisulfite removed chlorine | ORP probe (cannot measure cipro: it reads overall oxidizing strength, dominated by chlorine) |
| Antibacterial activity | *E. coli* + resazurin test |
| Molecule identities (optional) | LC-MS via a mentor; otherwise cite Dodd's and Jasper's identified products and claim "consistent with" |

## Variables

- **Knobs the optimizer controls (independent):** chlorine dose; contact time (flow rate); ammonia added (free chlorine vs pre-formed chloramine; Cl₂ : N ratio); bisulfite dose; time between chlorination and bisulfite.
- **Conditions tested, not optimized:** pH (6.5–8.5); water recipe (lab water vs real effluent).
- **Measured / predicted (dependent):** cipro and products (HPLC), activity (% inhibition → cipro-equivalent), free and total chlorine, CT, cost per 1,000 L, prediction error.
- **Kept the same (controlled):** temperature (~22 °C); starting cipro; strain, broth, incubation; quench recipe; sampling-to-injection time.

## Where each kind of work happens

| Work | Where |
|---|---|
| Models, optimizer, data analysis | Anywhere (Claude workspace + GitHub; Colab retired 10-06) |
| Reactor runs with dilute bleach, cipro, bisulfite, thiosulfate, ammonium chloride | School lab (preferred). Never mix concentrated bleach and ammonia (toxic gas); collect cipro waste |
| HPLC-UV | BioCurious (SRC informed; supervisor there) |
| Bacteria tests | School BSL-1 lab, or BioCurious if they allow it (no home culturing) |
| Real effluent tests | Lab level set by SRC (possibly BSL-2) |
| TLC (backup) | School lab |
| LC-MS (optional) | University lab via a mentor |

## Materials (rough prices, not quotes; budget ~$700–1,400 plus BioCurious fees — superseded by the Oct 16 parts list, ≈ $2,000 with spares, see project-state.md)

| Group | Items |
|---|---|
| Chemicals | Ciprofloxacin (HCl) 1–5 g (also the HPLC standard); bleach or reagent sodium hypochlorite; sodium bisulfite; sodium thiosulfate (small); ammonium chloride; pH buffers; DI water; DPD free + total chlorine kit |
| HPLC consumables | HPLC-grade acetonitrile and water, phosphate buffer salts, phosphoric acid, 0.22 µm syringe filters, autosampler vials (check what BioCurious supplies) |
| Reactor | Tubing, fittings, 3 peristaltic pumps, pH + ORP boards, Raspberry Pi, food dye/salt for tracer |
| Bacteria test | *E. coli* K-12, Mueller-Hinton broth, resazurin, sterile 96-well plates, micropipettes + tips, incubator, bleach for disposal, gloves, goggles |
| Backup product check | TLC plates with fluorescent indicator, handheld UV lamp, spotters, developing jar (~$60–150) |

**Free software:** Python, SciPy, BoTorch, GitHub, WebPlotDigitizer.

## Model files
- GitHub `Suryansh-Gupta/removed-is-not-safe`: `ris/chlorine_backbone.py`, `ris/cipro_model.py`, `ris/flow_reactor.py` (constants live only here), tests, scripts, web explorer. (Older Drive notebooks in RemovedIsNotSafe/notebooks are retired.)
