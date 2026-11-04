# Oct 15 sprint: chemistry model v1 (chlorine + ciprofloxacin) — status and handoff

**Last updated:** 2026-10-16 (published figures re-digitized from the PDFs, commit 7e4eb4a; before that dichloramine + tube flow prediction, commit bd28779). **Status: CURRENT.** Read `project-state.md` first (newer than this doc), then this, then `CLAUDE.md`. Full plan: `phase-roadmap.md` (rev. 3, 10-05).

## WORKFLOW (changed 10-06): no more Colab
- **Claude writes and runs all code in its own workspace**, shows results in the Claude app (interactive artifact preferred; user wants knobs), and pushes code to GitHub as proof. Code lightly commented (keep source citations).
- **Standing rule (user, 10-16):** whenever new information comes in or old information is revised, Claude updates everything that uses it (model code, data files, results, figures, web explorer + its artifact, simulator, project docs) automatically, without being asked.
- **GitHub repo: https://github.com/Suryansh-Gupta/removed-is-not-safe** (PUBLIC — Claude suggested private; user's call). Claude GitHub App installed 10-06; push works. New session: add_repo (access "push"), clone to /home/claude/removed-is-not-safe, work, push to main.
- Repo layout: `ris/` (chlorine_backbone, cipro_model, flow_reactor, baselines), `scripts/run_all.py`, `scripts/compare_baselines.py`, `scripts/check_kennedyneth.py`, `scripts/digitize/` (figure digitizing, 10-16), `tests/test_model.py` (15 checks) + `tests/test_js_matches_python.py` (1), `web/model.js` + `web/cipro_model_explorer.html` (artifact source), `data/published/` (dodd2005_fig5a.csv and kennedyneth2019_fig2.csv digitized from the PDF figures 10-16, with sd columns; kennedyneth2019_supp.csv from the supplement), `data/lab/`, `predictions/`, README.
- **Interactive artifact "Cipro Chlorination Model": https://claude.ai/artifact/TnkaY1dQwrZqoZ5oT55ApY** (v7, 10-16: digitized Dodd + Kennedy Neth data; v6 10-15: dichloramine, tube diameter/length knobs, pump-flow sweep; republish via url from web/cipro_model_explorer.html). tests/test_js_matches_python.py keeps web/model.js within 2% of Python.
- Earlier velocity-sweep artifact (other session): https://claude.ai/artifact/2sWHY9oaTPDk2KJU1dsVDW; not in repo. SUPERSEDED: it used a placeholder chloramine + cipro constant (1 vs 29), skipped N-chloro-cipro, and its disproportionation constants were per-hour values used as per-second (3600x too fast).
- PDFs in hand: Dodd 2005, Kennedy Neth 2019 (doi 10.1039/C9EW00182D) — on the user's Mac at Downloads/dodd2005.pdf and Downloads/kennedyneth2019.pdf.

## Project in one paragraph
San José–Santa Clara RWF chlorinates (sodium hypochlorite), nitrifies, dechlorinates with **sodium bisulfite**, discharges → Coyote Creek → Bay. Per Dodd 2005: cipro + HOCl → N-chloro-cipro in < 1 s; → CF-Pa1 over ~15–20 min; → later products with more chlorine. Products keep the quinolone ring; **Kennedy Neth 2019 found some later products lose the carboxyl (halodecarboxylation, m/z 324, 253) or fluorine (m/z 288) → likely inactive**, so "keeps ring" = upper bound on activity. Dodd p. 7073 proposed plant dechlorination could regenerate cipro, no rate → Gap 2. Gap 1 = free chlorine vs pre-formed chloramine.

## Cipro measurement (decided 10-05)
- HPLC-UV at BioCurious (main); Gap 2 split-sample test. **Add quench comparison (H2O2 vs thiosulfate vs bisulfite vs immediate)** because published cipro data depend on quench (see below).
- ORP not a cipro measurement. DPD for chlorine.
- Chemistry at BioCurious: allowed with supervisor + SRC approval; check cipro SDS for reproductive-toxicity hazard (2026–27 rule → RRI or restricted fume hood); BioCurious likely not an RRI, SRC decides.

## Constants (ris/cipro_model.py)
pKa 6.2 / 8.8; k_HOCl 4.3e3 / 3.8e5 / 4.9e7; k_frag 2.4e-4 / 7.6e-4, pKa_int 6.2 (assumed); k_CC 29; k_P1_HOCl 13 (rough; Kennedy chlorine data suggest ~50); k_rev_bisulfite unknown. n_Cl_P1 = 2 (fixed 10-06). Dichloramine (10-15, ris/chlorine_backbone.py): k_HOCl_NH2Cl 278 M⁻¹s⁻¹, k_hyd_NHCl2 6.4e-7 s⁻¹, k_NHCl2_NH3 6.1e4 M⁻¹s⁻¹, kd_H 6.9e3 / kd_H2CO3 11 / kd_HCO3 0.22 M⁻²s⁻¹ (unified model per-hour table in UC thesis escholarship qt7br7t6dn Table 4.1, converted). Effect only above ~5:1 Cl₂:N. Remaining limitations: no chloramine reaction with organic matter, no NHCl2 self-decomposition, no phosphate catalysis, cipro + NHCl2 assumed = k_CC.

## Results / checks
- Base case (pH 7.5, 5 mg/L Cl, 1 mg/L cipro, 30 min): cipro gone < 1 s; 214 µg/L N-chloro-cipro at discharge; Gap 2 up to ~26% (30 min), ~64% (10 min).
- Dodd Fig 5a (digitized 10-16): **14.5% / 8.6% error, nothing fitted — PASS** (was 13.7% / 8.1% on the earlier pixel estimates). Model predicts slightly more remaining than measured in wastewater at every point. Wastewater 60-min point hidden under another marker, omitted. Jasper +35%.
- Baselines (10-16): full 14.5/8.6% vs fitted curve 18.1/15.2% vs drug-only 100%.
- **Kennedy Neth supplement (ultrapure, 2.33 mg/L cipro, 2.0 mg/L Cl):** CT10 +1.4% (pass: 1 Cl per cipro instantly); after the 10-06 fix (2 Cl per later product): CT120 +2%, residual120 −8% at pH 7 (pass).
- **Kennedy Neth Fig 2A (FAIL), digitized 10-16:** cipro 0.38 → 0.28 from 0.5 to 120 min (sd 0.05–0.13; H2O2 quench, LC-MS); wastewater (Fig 2B) 0.15 → 0.11 (sd ~0.02); model (Dodd kinetics) predicts 0 true cipro. Authors say observed rate ~100× slower than literature. Labs disagree → must resolve with own HPLC + quench comparison. Their activity (PEQ 0.65–0.77 UP, sd 0.09–0.18; 0.35–0.43 WW) stays ~0.4 (UP) / ~0.25 (WW) above leftover cipro → strong support for active products; usable for activity-model calibration.

- **Tube flow prediction (10-15, ris/flow_reactor.py):** `tube_hydraulics` (Re, theta = Dm·tau/R², Taylor vs laminar convection, Dean number, N_equiv), `run_laminar` (exact laminar exit-age curve, segregated flow), `run_tube`. Figure 8: example 20 m × 3.175 mm coil, 1–50 mL/min. Lab flows are laminar (Re 7–350). Below ~2.6 mL/min (tau > 60 min) Taylor dispersion → near plug flow (N ≈ 25–64); above ~4 mL/min laminar convection → up to ~50% more cipro + N-chloro-cipro than an ideal pipe (e.g. 261 vs 177 µg/L at 4 mL/min). Straight-tube = worst case; coil (Dean 6–60) narrows it. D_cipro 7e-10 m²/s is an estimate. Dye test decides. (Superseded for the chosen 1/8" coil by the 3D simulator, see project-state.md.)

## Next steps
1. ~~Re-digitize Dodd Fig 5a and Kennedy Fig 2A~~ (done 10-16 by Claude, commit 7e4eb4a).
2. BioCurious HPLC details; SRC; bacteria lab; cipro SDS check.
3. Model to-dos: ~~extra chlorine-consuming product steps~~ (done 10-06); ~~chloramine decay / dichloramine~~ (done 10-15); ~~tube flow prediction~~ (done 10-15); ~~port into web/model.js + republish explorer~~ (done 10-15); activity layer (use Kennedy PEQ as first calibration); possibly explain Kennedy plateau.
4. Partner: GitHub collaborator; SRC; supervisor; cipro source; RWF email.
5. Nov lab: k_frag on HPLC; quench comparison; then k_rev_bisulfite.

## Decisions 10-04/06
- Bisulfite only for plant simulation; thiosulfate only to match published data.
- HPLC-UV at BioCurious = main measurement.
- "Better" setting = cheapest that meets CT target AND activity limit (both fixed in advance).
- Colab retired 10-06; GitHub repo + interactive artifact.
- Mentor contact: Dr. Achint Kumar (Socratic Academy; Duke Physics PhD) — modeling questions prepared 10-05.

## User preferences
Blunt, plain language, define terms; checks claims. Token-efficient. Results as interactive artifacts with knobs; code lightly commented. Propagate every new or revised fact to everything that uses it, automatically (10-16).
