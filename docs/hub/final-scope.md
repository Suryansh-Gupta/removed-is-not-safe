> **STATUS (added 2026-09-28): SUPERSEDED as the project plan, kept as background.** On 2026-09-26 the project moved to a computation-heavy direction: a chemistry-based model that predicts *remaining antibacterial activity* after any oxidation treatment, optimized and validated on a small staged iron-persulfate reactor, with US potable reuse plants (ozone and UV stages) as the main application. See `project-overview.md` and `CLAUDE.md` §4. What still carries over from this doc: the "removed ≠ safe" framing, the residual-activity test idea, Valley Water as the local contact, RO concentrate and discharges as the setting where activity matters most environmentally, and the warning that persulfate in salty water can form chlorinated byproducts.

# Final scope decision: antibiotic removal project

*Decided 2026-09-25 after deep research (4 research streams) and an advisor panel (utility engineer, AMR microbiologist, science-fair judge, devil's advocate). Full research: "Most impactful antibiotic removal setting.md".*

## Decision

**Setting: Valley Water's purified-water program. Specifically, the reverse-osmosis (RO) concentrate from the Silicon Valley Advanced Water Purification Center (SVAWPC) and the future Pure Water Silicon Valley and Palo Alto RO plants.**

**Product: a low-cost test for *residual antibacterial activity*, meaning whether treated water still kills or slows bacteria, not just whether the drug molecule is gone. The existing persulfate reactor and Bayesian optimizer become the case study the test is proven on.**

## Why this setting

- **It exists, and it's local.** SVAWPC produces up to 8 MGD. RO at about 85% recovery leaves roughly 1.4 MGD of concentrate (our estimate), and more is coming with the potable-reuse expansion (about 24,000 AFY by around 2035) and Palo Alto's $66.8M RO plant (2027).
- **The utility has named the problem itself.** Valley Water says the concentrate carries "the same contaminants as typical treated wastewater but at … approximately six times greater" concentration. It also says discharging it without further treatment "poses regulatory and environmental challenges, particularly in the Lower South Bay, where mixing and dilution are limited." Its nature-based pilots, such as wetland cells and horizontal levees, only "reduced some pharmaceuticals."
- **Antibiotic levels exceed resistance thresholds.** Bay Area effluent median ciprofloxacin is about 119 ng/L. Multiplied by 6, that is about 0.7 µg/L in the concentrate, against a resistance-selection threshold (PNEC) of 64 ng/L.
- **Nobody measures residual antibacterial activity.** Standard monitoring uses LC-MS, at $47–88 or more per sample, and only sees the parent drug. Effect-based bioassay panels have no antibacterial endpoint. California's direct potable reuse rules require a 1-log (90%) reduction of sulfamethoxazole and monthly pharmaceutical monitoring, so there is a regulatory hook.

## What the council changed (important)

1. **Valley Water's concentrate problem is mainly nutrients, metals and toxicity, not antibiotics** (utility engineer, from BACWA 2025). So the project should present antibiotics as a tracer inside a toxicity question, not claim the utility is spending money on antibiotics.
2. **Persulfate in salty concentrate can make things worse.** At high chloride, sulfate radicals form chlorinated byproducts, and toxicity rose in a 2020 study (Chem. Eng. J.) even while organic carbon fell (devil's advocate). Selling the reactor as the fix would be weak. Measuring whether this happens is exactly what the activity test is for, and it proves the "removed ≠ safe" thesis with real stakes.
3. **Concentrate is an efficient place to act, not a new source.** RO moves antibiotic into a smaller stream; it doesn't add any (microbiologist). Present it as "most grams removed per m³," not as a hotspot.
4. **At full scale, persulfate dosing looks like about $1M/yr** (engineer's rough estimate). The team should not claim the reactor should be deployed. The claim is: here is a cheap way to know whether any concentrate treatment actually removed antibacterial activity.

Split: 3 of 4 advisors picked RO concentrate with the reactor as the core. The devil's advocate picked a measurement tool instead. The final decision combines them: the tool is the product, and concentrate is the setting. The combination survives every advisor's main objection.

## Scoped project statement

> Silicon Valley's purified-water program sends RO concentrate, about six times as concentrated as wastewater, into the poorly flushed Lower South Bay, and current pilots remove pharmaceuticals only partially. Utilities track antibiotics with $50–100+ LC-MS tests that see only the parent drug, not whether the water is still antibacterial. We develop a low-cost residual-antibacterial-activity test (solid-phase extraction concentration, then an E. coli MG1655 broth-dilution assay read on our DIY photometer and calibrated in ciprofloxacin-equivalents), validate it against LC-MS through SCU, and use it to evaluate a Bayesian-optimized iron-persulfate treatment of synthetic concentrate matched to Valley Water's reported composition. Headline results: (1) the gap between chemical removal and loss of activity; (2) whether chloride-driven byproducts make treated concentrate more toxic; (3) cost per sample compared with LC-MS, and cost per m³ for treatment.

## What changes versus the current plan

| Keep | Change | Cut |
|---|---|---|
| Iron-persulfate reactor, Bayesian optimizer | Matrix: distilled water → synthetic RO concentrate (6x salts, chloride, organic carbon); plus 1 real sample if Valley Water provides one | Hospital, aquaculture and runoff framings |
| Ciprofloxacin (the photometer can read it) | Add sulfamethoxazole (named in California's DPR rules); needs a thymidine-free medium | Manufacturing effluent as its own arm (one context slide only) |
| E. coli bioassay | Upgrade to 96-well broth dilution, MG1655, cipro standard curve on every plate, quench and matrix controls | Biochar and extra compounds, unless ahead of schedule by week 14 |
| Radish assay | Becomes a secondary endpoint (non-target toxicity) | Culturing any real wastewater microbes (BSL-2) |
| Open-source toolkit | Toolkit now leads with the activity-test protocol | |

## Week-1 actions

1. **Email Valley Water's purified-water / concentrate team** (use the mini-grant contact). Ask for a concentrate composition sheet (TDS, chloride, DOC, ammonia and nitrate, Cu, Ni, any pharmaceutical data) and, if possible, a 1-L sample. Without the sheet, the synthetic recipe is a guess.
2. **Ask SCU about 5–12 LC-MS runs** for validation, and price SPE cartridges to set a realistic cost-per-sample target.
3. **Check with your SRC** that a filter-sterilized utility sample used only as a chemical matrix, plus the MG1655 assay, fits the no-preapproval tier.
4. **Reframe the mini-grant** under "prevent pollution in waterways."

## Honest limits

- The claim to make is "reviewed by a Valley Water engineer," not "adopted." Adoption within 23 weeks is unrealistic.
- The assay works at µg/L. Reaching the 64 ng/L threshold depends on SPE concentration working, which is the main technical risk. It is easier in concentrate, which is already about 6x.
- No source put a dollar figure on over-dosing waste. The money argument rests on monitoring cost (LC-MS) and on avoiding a treatment that makes the water more toxic.
