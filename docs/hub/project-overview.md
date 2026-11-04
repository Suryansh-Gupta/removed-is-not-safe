# Removed Is Not Safe — the project in plain words

**Last updated:** 2026-10-17 (rewritten for the chlorine + ciprofloxacin project; the previous version described the persulfate + sulfamethoxazole plan, dropped on 2026-09-29). **Status: CURRENT.** For live status always read `project-state.md`, which is newer than this doc by design.

**Who this is for:** anyone joining the project, or anyone who needs the whole idea in one read without chemistry background. Every term is defined the first time it appears.

---

## The one-sentence version

Water treatment plants add chlorine to kill germs. Chlorine also attacks antibiotics that are in the water, and the broken pieces can still stop bacteria from growing. Plants only measure whether the antibiotic molecule is gone. We are building a model that predicts whether the water is still antibacterial, and using it to pick chlorine settings that disinfect properly while leaving as little of that antibacterial strength behind as possible.

**Research question (draft):** Can a chemistry-based model find chlorination settings that meet disinfection targets while keeping ciprofloxacin-derived antibacterial activity below a predefined limit in blind tests?

**The title means:** "removing the drug does not prove the water is safe." It does **not** mean "treated water is dangerous." That distinction matters when talking to judges.

---

## Terms you need

- **Chlorination** — adding chlorine (here, bleach: sodium hypochlorite) to water to kill germs. Every US wastewater plant and most drinking-water plants do this.
- **Free chlorine** — chlorine on its own. Very reactive.
- **Chloramine** — what chlorine becomes when it meets ammonia, which is present in treated wastewater. It is a much gentler oxidiser, so it reacts with the antibiotic far more slowly. Free chlorine versus chloramine is one of the two big unknowns in this project.
- **CT** — concentration of chlorine multiplied by contact time. It is how regulators judge whether water was disinfected properly. It is a floor the project cannot go below: plants *must* disinfect.
- **Dechlorination** — removing leftover chlorine before the water is discharged, so it doesn't kill fish. Our local plant uses sodium bisulfite.
- **Transformation product** — a piece the antibiotic breaks into. Not necessarily harmless.
- **Antibacterial activity** — how strongly the water still slows or kills bacteria, whatever molecules are doing it. This is the thing nobody measures and the thing this project predicts.
- **Resistance threshold** — the concentration below which an antibiotic shouldn't push bacteria toward resistance. Usually written as PNEC (predicted no-effect concentration).
- **HPLC** — high-performance liquid chromatography, an instrument that separates a mixture into its individual molecules before measuring each one. We need it because the antibiotic and all its pieces absorb light the same way, so only separation tells them apart.
- **Blind test** — writing down a prediction with a timestamp, then running the experiment. It is the strongest evidence a project like this can produce.

---

## The problem

The antibiotic we study is **ciprofloxacin** (shortened to "cipro"), a common and very potent antibiotic.

When chlorine meets cipro, three things happen in sequence (Dodd et al. 2005, the paper this project's chemistry rests on):

1. In **under one second**, chlorine attacks cipro and turns it into something called N-chloro-cipro.
2. Over roughly **15 to 20 minutes**, that falls apart into further products.
3. With more chlorine, those products break down further.

The catch: **every one of those products keeps the quinolone core** — the part of the cipro molecule that actually attacks bacteria. So a plant measuring "has the ciprofloxacin gone?" gets a reassuring yes, while the water may still be doing what ciprofloxacin does.

**This is not hypothetical.** Two published studies found it directly:

- Jaén-Gil et al. 2020: antibacterial activity **rose** after cipro was completely removed, at chlorine doses above 0.5 mg/L. One chlorinated product kept 30–44% of cipro's own potency.
- Kennedy Neth et al. 2019: chlorination produced active products from all three fluoroquinolone antibiotics tested. (Notably, not for sulfamethoxazole or trimethoprim — which is part of why the project switched to cipro.)

**Why leftover antibacterial strength matters.** Low-level antibiotic exposure kills the weak bacteria and leaves the resistant ones, which then multiply. Ciprofloxacin's resistance threshold is **0.064 micrograms per litre** — extremely low. Measured ciprofloxacin in four New York wastewater plants ran 0.20 to 1.4 micrograms per litre, which is up to 22 times over that threshold (Batt 2007; Bengtsson-Palme & Larsson 2016).

**An important distinction, because it gets confused constantly.** Killing germs in water is the whole point of chlorination and it is good. We are measuring the opposite thing: whether the water retains *leftover antibiotic strength* after treatment. In our test, bacteria are the **detector**, not the target. If they grow normally, the water is fine.

---

## The local setting

The San José–Santa Clara Regional Wastewater Facility disinfects with bleach, removes nitrogen, then dechlorinates with sodium bisulfite. About 80% of the water goes out via Artesian Slough into Coyote Creek and the South San Francisco Bay; about 20% becomes recycled water. Our reactor is built to imitate that sequence at bench scale.

---

## The two open questions the project is built around

**Gap 1 — chloramine.** Treated wastewater contains ammonia, so chlorine often exists as chloramine rather than free chlorine. No study was found that chlorinates cipro with chloramine *and* measures the leftover antibacterial strength. The two forms should behave very differently, and the model predicts they do.

**Gap 2 — does dechlorination undo the reaction?** Dodd 2005 suggested that the dechlorination step at a plant might turn N-chloro-cipro back into ciprofloxacin, but never measured it. A related study saw exactly that happen with a different fluoroquinolone (El Najjar 2012). If true, a plant could be regenerating active antibiotic at the very last step before discharge. This is both a possible headline finding and a measurement trap — the chemical used to stop the reaction in a sample could create the effect being measured, which is why the project compares several.

---

## What gets built

1. **A chemistry model** — predicts, from the actual reactions, how much cipro, N-chloro-cipro and downstream product sits in the water at any dose, contact time and ammonia level. **Built and validated.**
2. **An activity model** — converts those molecule concentrations into one number: predicted antibacterial strength, expressed as "the equivalent amount of ciprofloxacin." **Not built yet.**
3. **A cost optimiser** — searches for the cheapest settings that still meet the disinfection requirement *and* stay under a pre-declared activity limit, then compares that against the settings a drug-removal-only plan would pick. **Scheduled January–February.**
4. **A bench reactor** — roughly $2,000 in parts: a coiled PTFE tube as the chlorine contact chamber, three pumps (water, bleach, bisulfite), pH and ORP probes, and a Raspberry Pi logging it. Being built now, due mid-November.
5. **A cheap bacteria test** — harmless lab *E. coli* plus resazurin dye in a 96-well plate. Pink means the bacteria grew; blue means something stopped them. It works at lab concentrations, not at real-world trace levels, which would need the sample concentrated first. Say that plainly.
6. **Proof** — the model reproduces other labs' published results, then predicts one of our own experiments *before* it is run.

---

## Where it stands (October 2026)

The chemistry model is built, on GitHub, and passes 16 automatic tests. Its first real test — reproducing Dodd 2005's published decay curves with nothing fitted — **passed on 16 October**: 14.5% average error in wastewater, 8.6% in drinking water, against a 20% pass limit.

One genuine disagreement remains unresolved. Kennedy Neth's 2019 data show roughly a third of the ciprofloxacin still present after two hours of chlorination; our model, following Dodd's reaction rates, predicts none at all. The two labs disagree with each other, not just with us, and the likely culprit is the chemical each used to stop the reaction before measuring. Settling it with our own measurements is a Phase 2 experiment.

The machine-learning layer does not exist yet. On a poster, the honest phrase is "mechanistic kinetic model plus Bayesian optimisation," and "machine learning" should only describe parts that have been built.

---

## Honest framing

- **Nobody regulates antibacterial activity in water anywhere.** California's recycled-water screening tests cover hormone-like and dioxin-like effects, with no antibacterial endpoint. That is an opportunity, not a scandal, and part of the reason is that there has been no cheap way to predict or measure it.
- California's potable reuse rules do require 90% removal of a different antibiotic across the ozone stage, measured by the drug alone — a good example of exactly the blind spot this project is about.
- **We do not claim** the project will reduce resistant infections, that zero measured activity means safe, that the model is validated for treatments other than chlorine, or that our reactor should be installed anywhere.
- **We do not claim novelty** for measuring activity after treatment, for kinetic modelling, or for optimising treatment — all of those exist. The parts not found in the literature are listed under Gap 1 and Gap 2 above, plus using an activity prediction to *choose* settings and testing that choice blind.

---

## Where to find everything else

| You want | Read |
|---|---|
| Where things stand right now | `project-state.md` — newer than every other doc |
| Where everything lives, and how to brief an AI assistant on it | `README-for-external-tools.md` |
| Your tasks, if you are the partner joining | `partner-handoff.md` |
| Why the project is chlorine and cipro | `chlorine-cipro-pivot-assessment.md` |
| Phases, dates, checkpoints, materials | `phase-roadmap.md` |
| Who owns which deliverable | `deliverables-and-split.md` |
| The chemistry model's current numbers | `oct15-prototype-sprint.md` |
