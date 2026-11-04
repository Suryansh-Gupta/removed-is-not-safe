# Velocity sweep: cipro removal in the contact-chamber tube (5 Oct 2026)

Interactive model: https://claude.ai/artifact/2sWHY9oaTPDk2KJU1dsVDW (code is self-contained in the page; also kept as `model.js`).

## Model
- Species: free Cl (HOCl/OCl⁻), free NH₃, NH₂Cl, NHCl₂, cipro. pH speciation: HOCl 7.54, NH₄⁺ 9.25, cipro N4 8.7.
- HOCl + NH₃ 3.07e6 (Qiang & Adams 2004); HOCl + NH₂Cl 150; NH₂Cl hydrolysis 2.1e-5 s⁻¹; disproportionation per Jafvert & Valentine 1992 (C_T 2 mM).
- HOCl + cipro 7.6e5 M⁻¹s⁻¹ apparent at pH 7 (Dodd 2005, **from memory — verify against the paper**). NH₂Cl + cipro: **placeholder 1 M⁻¹s⁻¹**, get Dodd's combined-chlorine value.
- Hydraulics: laminar convective RTD, Taylor dispersion, or Levenspiel turbulent dispersion → segregated-flow average. Dosing points mix instantly (not true in laminar flow without a static mixer).
- Defaults: 10 m × 6.35 mm tube, 3 mg/L Cl₂, Cl₂:N 4:1, 100 µg/L cipro, pH 7.

## Findings
1. **Free chlorine present → removal ~100% and independent of velocity.** HOCl–cipro half-life ≈ 0.02 s at 3 mg/L; chloramine formation takes ~1 s, so cipro is gone first. Holds for simultaneous dosing and for staged dosing with > ~0.1 s free-chlorine contact.
2. **Pre-formed NH₂Cl → velocity is the lever.** Removal ≈ 86% at 0.003 m/s, 34% at 0.03, 5% at 0.3 (10 m tube). Most of it comes from HOCl released by NH₂Cl hydrolysis, not direct NH₂Cl attack (kCC 0→10 changes 33.0→39.6% at 0.03 m/s). More excess ammonia → less removal (Cl₂:N 4→2: 34%→14%).
3. Laminar RTD costs ~1–4 points vs plug flow. Lab coils at mL/min are always laminar.
4. High chlorine demand lowers free-chlorine removal but it stays flat with velocity (competition is over in the first second).

## Implications for experiments
- To see a velocity/contact-time effect, the chloramine arm should use **pre-formed** monochloramine.
- Injection mixing in laminar flow is an unmodelled risk: add a static mixer after each dosing point, or the tracer test will show it.
- The hydrolysis pathway depends on k_hydrolysis and excess NH₃ — measure free NH₃ in the chloramine stock.
