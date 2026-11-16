// Batch Reactor Twin: the planned Stage 1 bench run, as facts (global TWIN_PROTOCOL).
//
// The ONLY place Twin protocol facts live (web/CLAUDE.md rule 7). Each fact: value, unit, status, source.
// Status:
//   DECIDED    logged as a decision in project-state.md
//   PLANNED    written on the batch reactor page (docs/artifacts/batch-reactor-3d.html), not logged as a decision
//   CONFLICT   two project documents give different values; the value here is one of them, the note names the other
//   UNDECIDED  not settled. value is null. The page shows "not decided". Do not fill these in (PRD decision D-3)
//   NOMINAL    a typical catalogue dimension used only to draw the cross-section; measure the real item
//   UNCHECKED  exists in a manual that has not been read yet. value is null
// Paths are relative to the research folder (the one that contains code/).
const TWIN_PROTOCOL = (function () {
  const STATE = 'project-state.md, decision of 2026-11-10 (batch reactor first)';
  const PAGE = 'docs/artifacts/batch-reactor-3d.html';
  const D3 = 'docs/prd-prototypes.md decision D-3; project-state.md, Conflicts to resolve, "Batch-run vial size and quench amounts" (2026-11-15)';
  const DRAW = 'Typical catalogue size, not a project document. Used for the drawing only.';

  const FACTS = [
    // ---- the run
    { id: 'sample_times_min', group: 'Run', label: 'Sample times', value: [0, 7.5, 15, 22.5, 30], unit: 'min', status: 'DECIDED', source: STATE },
    { id: 'beaker_volume_mL', group: 'Run', label: 'Reactor', value: 500, unit: 'mL glass beaker, foil-wrapped, stirred', status: 'DECIDED', source: STATE },
    { id: 'fill_volume_mL', group: 'Run', label: 'Water in the beaker', value: 500, unit: 'mL', status: 'CONFLICT',
      source: PAGE + ', "One run, start to finish", step 1',
      note: 'Label 1 on the same page says "about 450 mL".' },
    { id: 'chlorine_at_min', group: 'Run', label: 'Chlorine added', value: 0, unit: 'min (timer starts that second)', status: 'DECIDED',
      source: STATE + '; ' + PAGE + ', step 4' },
    { id: 'zero_sample', group: 'Run', label: '0 min sample', value: 'pulled before chlorine goes in', unit: '', status: 'PLANNED',
      source: PAGE + ', "One run, start to finish", step 3' },
    { id: 'blank', group: 'Run', label: 'Blank beaker', value: 'chlorine, no cipro; DPD at the same times', unit: '', status: 'PLANNED',
      source: PAGE + ', "One run, start to finish", step 6' },

    // ---- bench concentrations (the page opens on these)
    { id: 'cipro_ugL', group: 'Bench concentrations', label: 'Ciprofloxacin', value: 1000, unit: 'µg/L', status: 'PLANNED',
      source: PAGE + ', chemicals table (1 mg/L); same as the Advisor "Bench batch reactor" preset and ris.cipro_model.run_batch' },
    { id: 'pH', group: 'Bench concentrations', label: 'pH (buffered)', value: 7.5, unit: '', status: 'PLANNED',
      source: PAGE + ', step 1; same as run_batch' },
    { id: 'dose_mgL', group: 'Bench concentrations', label: 'Chlorine dose', value: 5, unit: 'mg/L as Cl₂', status: 'PLANNED',
      source: PAGE + ', chemicals table; same as run_batch' },
    { id: 'NH3_mgN_L', group: 'Bench concentrations', label: 'Ammonia', value: 0, unit: 'mg N/L', status: 'PLANNED',
      source: 'Advisor "Bench batch reactor" preset (web/optimizer/engine.js); same as run_batch' },

    // ---- sampling and quench
    { id: 'quench_agent', group: 'Sampling and quench', label: 'Quench agent', value: 'sodium bisulfite', unit: '', status: 'PLANNED',
      source: PAGE + ', chemicals table ("the main quench")',
      note: 'Whether a second, non-reversing quench is also used is an open item in project-state.md.' },
    { id: 'quench_amount', group: 'Sampling and quench', label: 'Quench amount per vial', value: null, unit: '', status: 'UNDECIDED', source: D3 },
    { id: 'vial_size_mL', group: 'Sampling and quench', label: 'Vial size', value: null, unit: 'mL', status: 'UNDECIDED', source: D3 },
    { id: 'sample_volume_mL', group: 'Sampling and quench', label: 'Volume collected per vial', value: null, unit: 'mL', status: 'UNDECIDED', source: D3 },
    { id: 'hold_min', group: 'Sampling and quench', label: 'Hold time after quench', value: null, unit: 'min', status: 'UNDECIDED',
      source: 'project-state.md, Conflicts to resolve, "Hand-quench recipe (Nov 1)": hold time to be set by Experiment 4B',
      note: 'The page takes it as a setting.' },

    // ---- equipment
    { id: 'stir_bar_mm', group: 'Equipment', label: 'Stir bar', value: 40, unit: 'mm, PTFE (about)', status: 'PLANNED', source: PAGE + ', equipment table ("about 4 cm")' },
    { id: 'syringe_mL', group: 'Equipment', label: 'Sampling syringe', value: 10, unit: 'mL', status: 'PLANNED', source: PAGE + ', equipment table' },
    { id: 'n_vials', group: 'Equipment', label: 'Quench vials', value: 5, unit: 'one per sample time, quench loaded before the run', status: 'DECIDED', source: STATE },
    { id: 'dpd_free', group: 'Equipment', label: 'DPD free chlorine', value: 'Hanna HI701 Checker', unit: '', status: 'PLANNED', source: PAGE + ', equipment table' },
    { id: 'dpd_total', group: 'Equipment', label: 'DPD total chlorine', value: 'Hanna HI711 Checker', unit: '', status: 'PLANNED', source: PAGE + ', equipment table' },
    { id: 'dpd_range_resolution', group: 'Equipment', label: 'DPD range and resolution', value: null, unit: 'mg/L', status: 'UNCHECKED', source: 'Kit manuals (HI701, HI711): not yet read' },

    // ---- drawing only
    { id: 'draw_beaker_od_mm', group: 'Drawing', label: 'Beaker outer diameter', value: 85, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_beaker_height_mm', group: 'Drawing', label: 'Beaker height', value: 120, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_beaker_wall_mm', group: 'Drawing', label: 'Beaker wall', value: 2, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_stir_bar_dia_mm', group: 'Drawing', label: 'Stir bar diameter', value: 8, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_plate_w_mm', group: 'Drawing', label: 'Stir plate width', value: 180, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_plate_h_mm', group: 'Drawing', label: 'Stir plate height', value: 60, unit: 'mm', status: 'NOMINAL', source: DRAW },
    { id: 'draw_syringe_barrel_mm', group: 'Drawing', label: 'Syringe barrel, diameter × length', value: [16, 85], unit: 'mm', status: 'NOMINAL', source: DRAW },
  ];

  const byId = {};
  for (const f of FACTS) byId[f.id] = f;
  const get = id => { if (!byId[id]) throw new Error('TWIN_PROTOCOL: no fact "' + id + '"'); return byId[id]; };
  const value = id => get(id).value;
  const decided = f => f.value !== null && f.status !== 'UNDECIDED' && f.status !== 'UNCHECKED';

  return { FACTS, get, value, decided, sampleTimes: () => value('sample_times_min').slice(), runLength_min: () => Math.max.apply(null, value('sample_times_min')) };
})();
if (typeof module !== 'undefined') module.exports = TWIN_PROTOCOL;
