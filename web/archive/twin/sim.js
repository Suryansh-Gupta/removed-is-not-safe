// Batch Reactor Twin: what the model predicts for the planned bench run (global TWIN_SIM).
//
// All chemistry comes from web/model.js (RIS). No rate, pKa or molar mass is typed here.
// The run: RIS.integrate once over the whole run for the reactor beaker and once for the blank beaker (same water,
// no cipro); every time on the page is read off those two trajectories (straight line between solver steps, which
// are at most 5 s apart). What a vial holds after quench + hold is RIS.bisulfite applied to the beaker state at the
// sample time, the same call the Advisor engine and RIS.runBatch use.
//
// Model constants are RIS.DEFAULTS, unchanged. The ones that are not measured and move what this page shows are
// listed by placeholderKeys(); their status text lives in web/optimizer/sources.js.
const TWIN_SIM = (function () {
  const inNode = typeof module !== 'undefined' && module.exports && typeof require === 'function';
  const M = inNode ? require('../../model.js') : RIS;                    // top-level const in the page
  const P = inNode ? require('./protocol.js') : TWIN_PROTOCOL;
  const NS = 9;                                                       // state length in model.js

  // The page opens on the planned bench run. hold_min has no protocol value yet (UNDECIDED), so it starts at the
  // model's own default wait after bisulfite (after_bisulfite_min = 5 in ris.cipro_model.run_batch).
  const DEFAULT_SETTINGS = {
    dose_mgL: P.value('dose_mgL'), pH: P.value('pH'), NH3_mgN_L: P.value('NH3_mgN_L'), cipro_ugL: P.value('cipro_ugL'), hold_min: 5,
  };
  // Workable input ranges (the same spans web/optimizer/engine.js accepts). Not chemistry.
  const FIELDS = {
    dose_mgL: { min: 0.01, max: 100, name: 'chlorine dose', unit: 'mg/L' },
    pH: { min: 6, max: 9, name: 'pH', unit: '' },
    NH3_mgN_L: { min: 0, max: 50, name: 'ammonia', unit: 'mg N/L' },
    cipro_ugL: { min: 1, max: 100000, name: 'ciprofloxacin', unit: 'µg/L' },
    hold_min: { min: 0, max: 1440, name: 'hold time', unit: 'min' },
  };

  // -> { ok, settings (numbers; bad fields fall back to the default), errors: { key: 'what to change' } }
  function validate(raw) {
    const src = raw && typeof raw === 'object' ? raw : {}, settings = {}, errors = {};
    for (const k of Object.keys(FIELDS)) {
      const f = FIELDS[k], given = src[k];
      const v = typeof given === 'string' ? (given.trim() === '' ? NaN : Number(given)) : (given === undefined ? DEFAULT_SETTINGS[k] : given);
      if (typeof v !== 'number' || !isFinite(v) || v < f.min || v > f.max) {
        errors[k] = 'Enter ' + f.min + ' to ' + f.max + (f.unit ? ' ' + f.unit : '') + '.';      // one line under the field
        settings[k] = DEFAULT_SETTINGS[k];
      } else settings[k] = v;
    }
    return { ok: Object.keys(errors).length === 0, settings, errors };
  }

  const fin = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  const mgCl2 = v => Math.max(fin(v), 0) * M.MW_CL2 * 1000;           // mol/L -> mg/L as Cl2
  const ugCip = v => Math.max(fin(v), 0) * M.MW_CIP * 1e6;            // mol/L -> ug/L as ciprofloxacin

  function trajectory(s, cipro_ugL, tEnd_min) {
    const y0 = M.initial({ Cl_mgL: s.dose_mgL, NH3_mgN_L: s.NH3_mgN_L, cipro_mgL: cipro_ugL / 1000, mode: s.NH3_mgN_L > 0 ? 'together' : 'free' });
    return M.integrate(y0, Object.assign({}, M.DEFAULTS), s.pH, tEnd_min * 60);
  }

  function stateAt(tr, tSec) {
    const T = tr.T, Y = tr.Y, n = T.length;
    if (tSec <= 0) return Y[0].slice();
    if (tSec >= T[n - 1]) return Y[n - 1].slice();
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= tSec) lo = mid; else hi = mid; }
    const f = (tSec - T[lo]) / (T[hi] - T[lo]), y = new Array(NS);
    for (let k = 0; k < NS; k++) y[k] = Y[lo][k] + f * (Y[hi][k] - Y[lo][k]);
    return y;
  }

  // One model state -> the numbers the page uses. pct = percent of the cipro that went in (by moles).
  function readState(y, C0) {
    const pct = v => { const x = C0 > 0 ? 100 * Math.max(fin(v), 0) / C0 : 0; return x < 1e-9 ? 0 : x; };   // solver dust -> 0
    return {
      free_mgL: mgCl2(y[0]), total_mgL: mgCl2(y[0]) + mgCl2(y[2]) + 2 * mgCl2(y[8]),     // free + NH2Cl + NHCl2 (2 Cl)
      cipro_ugL: ugCip(y[4]), ncl_ugL: ugCip(y[5]), p1_ugL: ugCip(y[6]), p2_ugL: ugCip(y[7]),
      cipro_pct: pct(y[4]), ncl_pct: pct(y[5]), products_pct: pct(y[6]) + pct(y[7]),
    };
  }

  // Times for the drawn curves: cipro goes in the first seconds, so the first minute gets extra points.
  function courseTimes(tEnd) {
    const ts = [0];
    for (const sec of [0.25, 0.5, 1, 2, 4, 8, 15, 30, 45]) if (sec / 60 < tEnd) ts.push(sec / 60);
    for (let t = 1; t < tEnd - 1e-9; t += 0.25) ts.push(t);
    ts.push(tEnd);
    return ts;
  }

  // settings -> the whole predicted run. Throws nothing: bad fields fall back to defaults (see validate()).
  function run(raw) {
    const s = validate(raw).settings, p = Object.assign({}, M.DEFAULTS);
    const times = P.sampleTimes(), tEnd = P.runLength_min();
    const tr = trajectory(s, s.cipro_ugL, tEnd), trBlank = trajectory(s, 0, tEnd);
    const C0 = tr.Y[0][4];

    const course = { t_min: [], free_mgL: [], total_mgL: [], blank_free_mgL: [], blank_total_mgL: [], cipro_pct: [], ncl_pct: [], products_pct: [] };
    for (const t of courseTimes(tEnd)) {
      const a = readState(stateAt(tr, t * 60), C0), b = readState(stateAt(trBlank, t * 60), 0);
      course.t_min.push(t); course.free_mgL.push(a.free_mgL); course.total_mgL.push(a.total_mgL);
      course.blank_free_mgL.push(b.free_mgL); course.blank_total_mgL.push(b.total_mgL);
      course.cipro_pct.push(a.cipro_pct); course.ncl_pct.push(a.ncl_pct); course.products_pct.push(a.products_pct);
    }

    const zeroBeforeChlorine = /before chlorine/.test(String(P.value('zero_sample')));
    const vials = times.map((t, i) => {
      const y = stateAt(tr, t * 60);
      return {
        index: i, t_min: t,
        beforeChlorine: t === 0 && zeroBeforeChlorine,                 // the 0 min vial holds water that never met chlorine
        atSampling: readState(y, C0),                                  // in the reactor beaker at that moment
        afterHold: readState(M.bisulfite(y, p, s.pH, s.hold_min), C0), // in the vial after quench + hold
        blank: readState(stateAt(trBlank, t * 60), 0),                 // the blank beaker at the same moment
      };
    });

    const at = t_min => {
      const t = Math.min(Math.max(fin(t_min), 0), tEnd);
      const a = readState(stateAt(tr, t * 60), C0), b = readState(stateAt(trBlank, t * 60), 0);
      return Object.assign({ t_min: t, blank_free_mgL: b.free_mgL, blank_total_mgL: b.total_mgL }, a);
    };
    return { settings: s, tEnd_min: tEnd, sampleTimes_min: times, course, vials, at };
  }

  // Model constants that are not measured and change what the Twin shows for these settings (keys of RIS.DEFAULTS).
  function placeholderKeys(settings) {
    const keys = ['k_demand', 'k_rev_bisulfite'];        // chlorine decay in every chlorine value; reversal in every vial
    if (settings && settings.NH3_mgN_L > 0) keys.push('C_T_carbonate');   // only acts on chloramine loss
    return keys;
  }

  return { DEFAULT_SETTINGS, FIELDS, validate, run, placeholderKeys };
})();
if (typeof module !== 'undefined') module.exports = TWIN_SIM;
