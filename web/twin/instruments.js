// Batch Reactor Twin: model values shown the way the bench instruments report them (global TWIN_INSTRUMENTS).
//
// (a) DPD chlorine (Hanna HI701 free, HI711 total), read on the BLANK beaker at each sample time.
// (b) HPLC: cipro and N-chloro-cipro as relative peak area, percent of the 0 min cipro peak. Never a product
//     concentration. ASSUMPTION: N-chloro-cipro gives the same peak area per mole as cipro (no standard exists yet),
//     so its relative area equals its mole fraction of the cipro that went in.
// (c) No plate / bioassay view (PRD decision D-4: hidden until the bioassay exists).
const TWIN_INSTRUMENTS = (function () {
  // The kit's range and resolution have NOT been read from the manuals. Fill these two numbers in from the manuals;
  // until then readings show the model value to 2 decimals and the page says so.
  const DPD = { range_mgL: null, resolution_mgL: null, status: 'UNCHECKED: take from the kit manual' };
  const dpdEntered = () => typeof DPD.range_mgL === 'number' && typeof DPD.resolution_mgL === 'number' && DPD.resolution_mgL > 0;

  // One DPD reading. -> { value (number or null), text, overRange }
  function dpdReading(mgL) {
    if (typeof mgL !== 'number' || !isFinite(mgL)) return { value: null, text: '–', overRange: false };
    if (!dpdEntered()) return { value: mgL, text: mgL.toFixed(2), overRange: false };
    if (mgL > DPD.range_mgL) return { value: null, text: 'over ' + DPD.range_mgL + ': dilute', overRange: true };
    const r = DPD.resolution_mgL, v = Math.round(mgL / r) * r, dp = Math.max(0, Math.ceil(-Math.log10(r) - 1e-9));
    return { value: v, text: v.toFixed(dp), overRange: false };
  }
  // vial: one entry of TWIN_SIM.run(...).vials
  const dpd = vial => ({ free: dpdReading(vial.blank.free_mgL), total: dpdReading(vial.blank.total_mgL) });

  // Relative peak areas in the quenched vial after the hold, percent of the 0 min cipro peak.
  const hplc = vial => ({ cipro_pct: vial.afterHold.cipro_pct, ncl_pct: vial.afterHold.ncl_pct });

  // Number text. Real minus sign, no trailing noise.
  function pct(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    if (v > 0 && v < 0.05) return '<0.1';
    return v.toFixed(1);
  }
  const mgL = v => (typeof v === 'number' && isFinite(v) ? v.toFixed(2) : '–');
  const min = v => (typeof v === 'number' && isFinite(v) ? String(Math.round(v * 10) / 10) : '–');

  return { DPD, dpdEntered, dpdReading, dpd, hplc, fmt: { pct, mgL, min } };
})();
if (typeof module !== 'undefined') module.exports = TWIN_INSTRUMENTS;
