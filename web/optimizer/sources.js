// Chlorination Settings Optimizer: where every number comes from (global RISSOURCES).
//
// One row per model constant, default and preset value. VALUES ARE NOT TYPED HERE: each row reads its value from
// web/model.js (RIS.DEFAULTS) or optimizer/engine.js (RISOPT.DEFAULT_INPUTS / PRESETS), so this table cannot drift
// from the model. Only the status and the source text live here. The source text repeats the comment beside the
// constant in ris/chlorine_backbone.py, ris/cipro_model.py and optimizer/engine.js; change them together.
//
// Status:
//   MEASURED     from our own lab data (none yet)
//   LITERATURE   a published value, with the citation
//   REGULATION   a value set by a rule or permit, with the rule
//   CALCULATED   follows from other values (stoichiometry, unit conversion)
//   ESTIMATE     our own reading of a published figure or text; the paper does not give the number directly
//   EXAMPLE      an illustrative setting, not a real plant's
//   PLACEHOLDER  a guess that waits for lab data
//   UNKNOWN      nobody has measured it; measuring it is part of this project
//
// `drives` names the group shown in the page banner when a PLACEHOLDER or UNKNOWN value feeds the activity result.
// tests/test_sources.py checks that every constant in RIS.DEFAULTS and every default in RISOPT has a row here.
const RISSOURCES = (function () {
  const NOT_MEASURED = ['PLACEHOLDER', 'UNKNOWN'];

  const MODEL = [
    // --- chlorine and chloramines (ris/chlorine_backbone.py)
    { key: 'pKa_HOCl', group: 'Chlorine', label: 'HOCl acid constant, pKa', unit: '', status: 'LITERATURE',
      source: 'Morris 1966, J. Phys. Chem. Value not yet checked in the paper itself.' },
    { key: 'pKa_NH4', group: 'Chlorine', label: 'Ammonium acid constant, pKa', unit: '', status: 'LITERATURE',
      source: 'Bates & Pinching 1949.' },
    { key: 'k_NH3_HOCl', group: 'Chlorine', label: 'HOCl + NH₃ → monochloramine', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Qiang & Adams 2004 (checked from the abstract).' },
    { key: 'k_hyd_NH2Cl', group: 'Chlorine', label: 'Monochloramine hydrolysis', unit: 's⁻¹', status: 'LITERATURE',
      source: 'Jafvert & Valentine 1992.' },
    { key: 'k_demand', group: 'Chlorine', label: 'Chlorine demand of the water', unit: 's⁻¹', status: 'PLACEHOLDER',
      drives: 'chlorine decay rate',
      source: 'Guess. To be fitted to published residual-chlorine data, then to our own DPD readings.' },
    { key: 'k_HOCl_NH2Cl', group: 'Chlorine', label: 'HOCl + monochloramine → dichloramine', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Unified chloramine model (Jafvert & Valentine 1992; Vikesland 2001), per-hour values as tabulated in a UC thesis (eScholarship qt7br7t6dn, Table 4.1), divided by 3600.' },
    { key: 'k_hyd_NHCl2', group: 'Chlorine', label: 'Dichloramine hydrolysis', unit: 's⁻¹', status: 'LITERATURE',
      source: 'Same table as above.' },
    { key: 'k_NHCl2_NH3', group: 'Chlorine', label: 'Dichloramine + NH₃ → 2 monochloramine', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Same table as above.' },
    { key: 'kd_H', group: 'Chlorine', label: 'Monochloramine disproportionation, H⁺ term', unit: 'M⁻² s⁻¹', status: 'LITERATURE',
      source: 'Same table as above.' },
    { key: 'kd_H2CO3', group: 'Chlorine', label: 'Monochloramine disproportionation, H₂CO₃ term', unit: 'M⁻² s⁻¹', status: 'LITERATURE',
      source: 'Same table as above.' },
    { key: 'kd_HCO3', group: 'Chlorine', label: 'Monochloramine disproportionation, HCO₃⁻ term', unit: 'M⁻² s⁻¹', status: 'LITERATURE',
      source: 'Same table as above.' },
    { key: 'C_T_carbonate', group: 'Chlorine', label: 'Total carbonate in the water', unit: 'M', status: 'PLACEHOLDER',
      source: 'Set to 0 for lab water. Real effluent is roughly 2–4 mM; measure the alkalinity.' },

    // --- ciprofloxacin (ris/cipro_model.py)
    { key: 'pKa1', group: 'Ciprofloxacin', label: 'Cipro acid constant 1, pKa', unit: '', status: 'LITERATURE',
      source: 'Dodd et al. 2005, Table 1 (citing Vazquez 2001).' },
    { key: 'pKa2', group: 'Ciprofloxacin', label: 'Cipro acid constant 2, pKa', unit: '', status: 'LITERATURE',
      source: 'Dodd et al. 2005, Table 1 (citing Vazquez 2001).' },
    { key: 'k_HOCl_cation', group: 'Ciprofloxacin', label: 'HOCl + cipro, cation form', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Dodd et al. 2005, Table 3, 22 °C. Standard error ± 6.6e3: very uncertain, matters little near neutral pH.' },
    { key: 'k_HOCl_neutral', group: 'Ciprofloxacin', label: 'HOCl + cipro, neutral form', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Dodd et al. 2005, Table 3, 22 °C. Standard error ± 2.4e5.' },
    { key: 'k_HOCl_anion', group: 'Ciprofloxacin', label: 'HOCl + cipro, anion form', unit: 'M⁻¹ s⁻¹', status: 'LITERATURE',
      source: 'Dodd et al. 2005, Table 3, 22 °C. Standard error ± 1.9e7.' },
    { key: 'k_frag_neutral', group: 'Ciprofloxacin', label: 'N-chloro-cipro breakdown, neutral form', unit: 's⁻¹', status: 'ESTIMATE',
      source: 'Dodd et al. 2005, p. 7071 gives 2.4e-4 at pH 4.6 and 7.6e-4 at pH 8.6. Treating these as the neutral- and anion-form rates is our estimate.' },
    { key: 'k_frag_anion', group: 'Ciprofloxacin', label: 'N-chloro-cipro breakdown, anion form', unit: 's⁻¹', status: 'ESTIMATE',
      source: 'See the row above.' },
    { key: 'pKa_int', group: 'Ciprofloxacin', label: 'N-chloro-cipro carboxyl pKa', unit: '', status: 'ESTIMATE',
      source: 'Assumed equal to cipro’s pKa 1.' },
    { key: 'k_CC_cipro', group: 'Ciprofloxacin', label: 'Chloramine + cipro', unit: 'M⁻¹ s⁻¹', status: 'ESTIMATE',
      source: 'From Dodd et al. 2005, p. 7074: initial rate 4.4e-4 s⁻¹ at 15 µM combined chlorine, pH 7. Assumes the rate is proportional to combined chlorine.' },
    { key: 'k_P1_HOCl', group: 'Ciprofloxacin', label: 'Product A + HOCl → product B', unit: 'M⁻¹ s⁻¹', status: 'ESTIMATE',
      source: 'Rough estimate read from Dodd et al. 2005, Fig. 3.' },
    { key: 'n_Cl_P1', group: 'Ciprofloxacin', label: 'Chlorine used per product A → B step', unit: 'Cl', status: 'ESTIMATE',
      source: 'From Dodd et al. 2005, Scheme 1.' },
    { key: 'k_rev_bisulfite', group: 'Ciprofloxacin', label: 'Bisulfite turning N-chloro-cipro back into cipro', unit: 's⁻¹', status: 'UNKNOWN',
      drives: 'bisulfite reversal speed',
      source: 'Not measured by anyone (Gap 2 of this project). Dodd et al. 2005, p. 7073 show thiosulfate does it and say sulfite should, with no rate.' },
  ];

  const INPUTS = [
    { path: ['potency', 'NCL'], group: 'Activity', label: 'Potency of N-chloro-cipro, cipro = 1', unit: '×', status: 'PLACEHOLDER',
      drives: 'product potencies', source: 'Guess: worst case, as strong as the parent drug. Waits for the bioassay.' },
    { path: ['potency', 'P1'], group: 'Activity', label: 'Potency of product A, cipro = 1', unit: '×', status: 'PLACEHOLDER',
      drives: 'product potencies', source: 'Loosely based on Jaén-Gil et al. 2020 (one product keeps about 40% of the activity). Not checked against the paper. Waits for the bioassay.' },
    { path: ['potency', 'P2'], group: 'Activity', label: 'Potency of product B, cipro = 1', unit: '×', status: 'PLACEHOLDER',
      drives: 'product potencies', source: 'Pure guess. It was lowered from 0.05 to its present value because at 0.05 no setting on the default map met the limit. Waits for the bioassay.' },
    { path: ['activityLimit_ugL'], group: 'Activity', label: 'Activity limit', unit: 'µg/L', status: 'LITERATURE',
      source: 'Bengtsson-Palme & Larsson 2016, predicted no-effect concentration for resistance selection, ciprofloxacin.' },
    { path: ['ctTarget'], group: 'Plant', label: 'CT target, default', unit: 'mg·min/L', status: 'EXAMPLE',
      source: 'Illustrative site-specific value. Not a regulation and not the San José plant’s number, which was not provided.' },
    { path: ['after_min'], group: 'Plant', label: 'Bisulfite to discharge, default', unit: 'min', status: 'EXAMPLE',
      source: 'Illustrative.' },
    { path: ['maxContact_min'], group: 'Plant', label: 'Basin limit, default', unit: 'min', status: 'EXAMPLE',
      source: 'Illustrative.' },
    { path: ['cipro_ugL'], group: 'Plant', label: 'Ciprofloxacin coming in, default', unit: 'µg/L', status: 'EXAMPLE',
      source: 'Illustrative.' },
  ];

  const PRESET_ROWS = [
    { preset: 'title22', path: ['ctTarget'], group: 'Plant', label: 'CT target, Title 22 preset', unit: 'mg·min/L', status: 'REGULATION',
      source: 'California Title 22, section 60301.230 (disinfected tertiary recycled water).' },
    { preset: 'title22', path: ['minContact_min'], group: 'Plant', label: 'Minimum modal contact time, Title 22 preset', unit: 'min', status: 'REGULATION',
      source: 'California Title 22, section 60301.230.' },
    { preset: 'bench', path: ['cipro_ugL'], group: 'Bench run', label: 'Ciprofloxacin in the beaker', unit: 'µg/L', status: 'EXAMPLE',
      source: 'Planned school-lab concentration, high enough for HPLC-UV to see.' },
    { preset: 'bench', path: ['activityLimit_ugL'], group: 'Bench run', label: 'Activity limit, bench preset', unit: 'µg/L', status: 'PLACEHOLDER',
      source: 'The 0.064 µg/L limit scaled to the same fraction of the starting amount. This scaling is our own choice, not a published value.' },
  ];

  const get = (o, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), o);

  // rows(RIS, RISOPT) -> [{ group, label, value, unit, status, source, drives? }]
  function rows(RIS, RISOPT) {
    const out = [];
    for (const m of MODEL) out.push(Object.assign({}, m, { value: RIS.DEFAULTS[m.key] }));
    for (const i of INPUTS) out.push(Object.assign({}, i, { value: get(RISOPT.DEFAULT_INPUTS, i.path) }));
    for (const p of PRESET_ROWS) {
      const preset = (RISOPT.PRESETS || []).find((x) => x.id === p.preset);
      out.push(Object.assign({}, p, { value: preset ? get(preset.inputs, p.path) : undefined }));
    }
    return out;
  }

  // Names of the not-yet-measured groups that feed the activity result, in table order, no repeats.
  function notMeasured(RIS, RISOPT) {
    const seen = [];
    for (const r of rows(RIS, RISOPT)) if (r.drives && NOT_MEASURED.includes(r.status) && !seen.includes(r.drives)) seen.push(r.drives);
    return seen;
  }

  return { MODEL, INPUTS, PRESET_ROWS, NOT_MEASURED, rows, notMeasured };
})();
if (typeof module !== 'undefined') module.exports = RISSOURCES;
