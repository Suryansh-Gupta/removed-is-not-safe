// Chlorination Settings Optimizer: search engine (global RISOPT). Interface: web/optimizer/CONTRACT.md
//
// Question answered: "What is the lowest chlorine dose that still disinfects (CT target) AND leaves the
// antibacterial activity of the water under the limit?"  Chemistry comes from web/model.js (global RIS), unchanged.
//
// How the grid is made fast: for each dose the model is integrated ONCE to the longest contact time, and every
// contact time is read off that one trajectory (straight line between solver steps, which are <= 5 s apart).
// Bisulfite + the wait before discharge is a closed formula (RIS.bisulfite), applied per cell.
// Trajectories are cached, so changing the CT target, the limit, potencies, k_rev or after_min costs nothing.
//
// PLACEHOLDERS, not measurements (the map moves when these change; see RISOPT.sensitivity):
//   - potency.NCL / P1 / P2: antibacterial strength of each product relative to ciprofloxacin = 1.
//     P1 = 0.4 is loosely based on Jaen-Gil et al. 2020 (TP296 keeps about 40 % of the activity);
//     NCL = 1.0 (worst case: as strong as the parent) and P2 = 0.01 (taken as nearly inactive) are guesses until
//     the bioassay is run. CONTRACT.md first listed P2 = 0.05; with that value and P1 = 0.4 no setting on the
//     default map gets under the limit, so P2 (the pure guess) was lowered and the literature-based P1 kept.
//   - k_demand (chlorine demand of the water) and k_rev (bisulfite turning N-chloro-cipro back into cipro, Gap 2).
//   - ctTarget default (300 mg*min/L) is an illustrative site-specific value, not a regulation.
const RISOPT = (function () {
  const RIS = (typeof module !== 'undefined' && module.exports && typeof require === 'function')
    ? require('../model.js')
    : (typeof globalThis !== 'undefined' ? globalThis.RIS : undefined) || (typeof window !== 'undefined' ? window.RIS : undefined);
  // In the page model.js declares `const RIS` at top level (a global binding, but not a window property).
  const M = RIS || (function () { try { return (0, eval)('RIS'); } catch (e) { return undefined; } })();
  if (!M) throw new Error('RISOPT: load model.js before optimizer/engine.js');

  const MW_CL2 = M.MW_CL2, MW_CIP = M.MW_CIP, NS = 9;
  const BISULFITE_PER_CL2 = 1.47;          // mg NaHSO3 per mg Cl2 (104.06 / 70.9)
  const K_REV_SLOW = 1e-4, K_REV_FAST = 1e-2;   // 1/s, for sensitivity(); model fragmentation is about 7e-4 1/s

  const DEFAULT_INPUTS = {
    pH: 7.5,
    NH3_mgN_L: 0,             // ammonia in the water; > 0 switches the model to mode 'together'
    cipro_ugL: 1.0,           // influent ciprofloxacin, ug/L
    k_demand_per_h: 0.72,     // chlorine demand decay (model k_demand 2e-4 1/s). PLACEHOLDER until fitted to DPD data
    after_min: 5,             // time between bisulfite and discharge
    ctTarget: 300,            // mg*min/L. Illustrative site-specific target (see header)
    ctBasis: 'residual',      // 'residual' = total chlorine residual at end x contact time (plant convention)
                              // 'integral' = model's integral of free chlorine
    minContact_min: 0,        // regulatory minimum contact time (Title 22 preset uses 90)
    maxContact_min: 120,      // basin limit
    activityLimit_ugL: 0.064, // ug/L ciprofloxacin-equivalents (Bengtsson-Palme & Larsson 2016 PNEC)
    potency: { NCL: 1.0, P1: 0.4, P2: 0.01 },   // relative to cipro = 1. PLACEHOLDERS until the bioassay
    k_rev: 0,                 // bisulfite reversal speed, 1/s. Unknown (Gap 2)
    doseRange: [0.5, 20], nDose: 40,            // mg/L as Cl2
    timeRange: [5, 120], nTime: 24,             // minutes
  };

  const PRESETS = [
    { id: 'secondary', label: 'Secondary effluent discharge',
      note: 'Site-specific CT of 300 mg*min/L, no minimum contact time, 1 ug/L ciprofloxacin coming in. ' +
            'The CT value is an example: use the one in your permit.',
      inputs: { ctTarget: 300, minContact_min: 0, maxContact_min: 120, cipro_ugL: 1.0, activityLimit_ugL: 0.064,
                doseRange: [0.5, 20], nDose: 40, timeRange: [5, 120], nTime: 24 } },
    { id: 'title22', label: 'Title 22 recycled water',
      note: 'California Title 22 disinfected tertiary: CT of at least 450 mg*min/L with at least 90 min modal ' +
            'contact time. Dose range widened to 30 mg/L because this CT needs a lot of chlorine.',
      inputs: { ctTarget: 450, minContact_min: 90, maxContact_min: 120, cipro_ugL: 1.0, activityLimit_ugL: 0.064,
                doseRange: [1, 30], nDose: 30, timeRange: [60, 120], nTime: 13 } },
    { id: 'bench', label: 'Bench batch reactor',
      note: 'The school lab run: 1000 ug/L ciprofloxacin in a beaker at pH 7.5, so HPLC can see it. The limit is ' +
            'scaled to the same fraction of the starting amount (6.4 % = 64 ug/L).',
      inputs: { pH: 7.5, NH3_mgN_L: 0, cipro_ugL: 1000, activityLimit_ugL: 64, ctTarget: 300, minContact_min: 0,
                maxContact_min: 120, doseRange: [0.5, 20], nDose: 40, timeRange: [5, 120], nTime: 24 } },
  ];

  // ---------------------------------------------------------------- input checking
  const LIMITS = {
    pH: [6, 9], NH3_mgN_L: [0, 50], cipro_ugL: [1e-4, 1e5], k_demand_per_h: [0, 20], after_min: [0, 1440],
    ctTarget: [0, 1e5], minContact_min: [0, 480], maxContact_min: [1, 480], activityLimit_ugL: [0, 1e6],
    potency: [0, 100], k_rev: [0, 1], dose: [0.01, 100], time: [0.5, 480], nDose: [2, 80], nTime: [2, 60],
  };
  const num = (v, dflt) => { const x = typeof v === 'string' && v.trim() !== '' ? Number(v) : v; return typeof x === 'number' && isFinite(x) ? x : dflt; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const field = (src, key, limKey) => clamp(num(src[key], DEFAULT_INPUTS[key]), LIMITS[limKey || key][0], LIMITS[limKey || key][1]);
  const fin = v => (typeof v === 'number' && isFinite(v) ? v : 0);
  const round = (v, dp) => { const f = Math.pow(10, dp); return Math.round(v * f) / f; };

  function range(src, key, lim) {
    const d = DEFAULT_INPUTS[key], r = Array.isArray(src[key]) ? src[key] : d;
    let lo = clamp(num(r[0], d[0]), lim[0], lim[1]), hi = clamp(num(r[1], d[1]), lim[0], lim[1]);
    if (lo > hi) { const t = lo; lo = hi; hi = t; }
    if (!(hi > lo)) { lo = d[0]; hi = d[1]; }           // an empty range is not a range: fall back to the default
    return [lo, hi];
  }

  // Returns a complete, safe copy of the inputs: defaults filled in, everything clamped to a workable range.
  function normalize(inputs) {
    const s = inputs && typeof inputs === 'object' ? inputs : {};
    const pot = s.potency && typeof s.potency === 'object' ? s.potency : {};
    const P = k => clamp(num(pot[k], DEFAULT_INPUTS.potency[k]), LIMITS.potency[0], LIMITS.potency[1]);
    const out = {
      pH: field(s, 'pH'), NH3_mgN_L: field(s, 'NH3_mgN_L'), cipro_ugL: field(s, 'cipro_ugL'),
      k_demand_per_h: field(s, 'k_demand_per_h'), after_min: field(s, 'after_min'),
      ctTarget: field(s, 'ctTarget'), ctBasis: s.ctBasis === 'integral' ? 'integral' : 'residual',
      minContact_min: field(s, 'minContact_min'), maxContact_min: field(s, 'maxContact_min'),
      activityLimit_ugL: field(s, 'activityLimit_ugL'),
      potency: { NCL: P('NCL'), P1: P('P1'), P2: P('P2') },
      k_rev: field(s, 'k_rev'),
      doseRange: range(s, 'doseRange', LIMITS.dose), nDose: Math.round(field(s, 'nDose')),
      timeRange: range(s, 'timeRange', LIMITS.time), nTime: Math.round(field(s, 'nTime')),
    };
    // The basin limit caps the time axis: a contact time the basin cannot give is not an option.
    out.timeRange[1] = Math.min(out.timeRange[1], out.maxContact_min);
    if (out.timeRange[0] >= out.timeRange[1]) out.timeRange[0] = Math.max(round(out.timeRange[1] / out.nTime, 1), 0.1);
    return out;
  }

  // Evenly spaced, rounded to tidy values (dp decimals), duplicates removed.
  function axis(lo, hi, n, dp) {
    if (!(hi > lo)) return [round(lo, dp)];
    const out = [];
    for (let i = 0; i < n; i++) {
      const v = round(lo + (hi - lo) * i / (n - 1), dp);
      if (!out.length || v > out[out.length - 1]) out.push(v);
    }
    return out;
  }
  const doseAxis = s => axis(s.doseRange[0], s.doseRange[1], s.nDose, 2);
  const timeAxis = s => axis(s.timeRange[0], s.timeRange[1], s.nTime, 1);

  // ---------------------------------------------------------------- model runs (cached)
  // Model parameters for these inputs. A copy: RIS.DEFAULTS is never changed.
  function params(s) {
    return Object.assign({}, M.DEFAULTS, { k_demand: s.k_demand_per_h / 3600, k_rev_bisulfite: s.k_rev });
  }

  const cache = new Map(), CACHE_MAX = 160;      // key -> { tEnd (s), T: Float64Array, Y: Float64Array (NS per step) }
  const chemKey = (s, dose) => [s.pH, s.NH3_mgN_L, s.cipro_ugL, s.k_demand_per_h, dose].join('|');

  // Whole contact-period trajectory for one dose, at least tEndMin minutes long.
  function trajectory(s, dose, tEndMin) {
    const key = chemKey(s, dose), tEnd = Math.max(tEndMin, 1e-3) * 60;
    const hit = cache.get(key);
    if (hit && hit.tEnd >= tEnd - 1e-9) { cache.delete(key); cache.set(key, hit); return hit; }
    const y0 = M.initial({ Cl_mgL: dose, NH3_mgN_L: s.NH3_mgN_L, cipro_mgL: s.cipro_ugL / 1000,
                           mode: s.NH3_mgN_L > 0 ? 'together' : 'free' });
    const tr = M.integrate(y0, params(s), s.pH, tEnd);
    const n = tr.T.length, T = Float64Array.from(tr.T), Y = new Float64Array(n * NS);
    for (let i = 0; i < n; i++) for (let k = 0; k < NS; k++) Y[i * NS + k] = fin(tr.Y[i][k]);
    const entry = { tEnd, T, Y };
    cache.delete(key); cache.set(key, entry);
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    return entry;
  }

  // State at time tSec, straight line between solver steps.
  function stateAt(tr, tSec) {
    const T = tr.T, Y = tr.Y, n = T.length, y = new Array(NS);
    if (tSec >= T[n - 1]) { for (let k = 0; k < NS; k++) y[k] = Y[(n - 1) * NS + k]; return y; }
    if (tSec <= 0) { for (let k = 0; k < NS; k++) y[k] = Y[k]; return y; }
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= tSec) lo = mid; else hi = mid; }
    const f = (tSec - T[lo]) / (T[hi] - T[lo]);
    for (let k = 0; k < NS; k++) y[k] = Y[lo * NS + k] + f * (Y[hi * NS + k] - Y[lo * NS + k]);
    return y;
  }

  const mgCl2 = v => Math.max(fin(v), 0) * MW_CL2 * 1000;     // mol/L -> mg/L as Cl2
  const ugCip = v => { const u = Math.max(fin(v), 0) * MW_CIP * 1e6; return u < 1e-12 ? 0 : u; };   // mol/L -> ug/L as ciprofloxacin; solver dust -> 0
  const totalResidual = y => mgCl2(y[0]) + mgCl2(y[2]) + 2 * mgCl2(y[8]);   // free + monochloramine + dichloramine
  const activityOf = (s, c, n, p1, p2) => c + s.potency.NCL * n + s.potency.P1 * p1 + s.potency.P2 * p2;

  // One cell from the state at the end of contact. s must already be normalized; p = params(s).
  function cellFrom(s, p, dose, t, y) {
    const residual = totalResidual(y), freeResidual = mgCl2(y[0]);
    const ct = fin(s.ctBasis === 'integral' ? Math.max(y[3], 0) : residual * t);
    const out = M.bisulfite(y, p, s.pH, s.after_min);
    const cipro = ugCip(out[4]), ncl = ugCip(out[5]), p1 = ugCip(out[6]), p2 = ugCip(out[7]);
    const activity = fin(activityOf(s, cipro, ncl, p1, p2));
    const passCT = ct >= s.ctTarget && t >= s.minContact_min - 1e-9 && t <= s.maxContact_min + 1e-9;
    const passActivity = activity <= s.activityLimit_ugL;
    return {
      dose, t, ct, residual, freeResidual,
      cipro_ugL: cipro, ncl_ugL: ncl, p1_ugL: p1, p2_ugL: p2, activity_ugL: activity,
      passCT, passActivity, pass: passCT && passActivity,
      ctMet: ct >= s.ctTarget,          // CT alone; passCT also needs the contact time inside the allowed range
      passDrugOnly: passCT && cipro <= s.activityLimit_ugL,
      bisulfite_mgL: BISULFITE_PER_CL2 * residual,
    };
  }

  function evaluate(inputs, dose, contact_min) {
    const s = normalize(inputs);
    const d = clamp(num(dose, s.doseRange[0]), LIMITS.dose[0], LIMITS.dose[1]);
    const t = clamp(num(contact_min, s.timeRange[0]), 1e-3, LIMITS.time[1]);
    return cellFrom(s, params(s), d, t, stateAt(trajectory(s, d, t), t * 60));
  }

  // ---------------------------------------------------------------- grid
  function plan(inputs) {
    const s = normalize(inputs), doses = doseAxis(s), times = timeAxis(s);
    return { s, p: params(s), doses, times, tMax: times[times.length - 1], cells: [] };
  }
  function doseRow(g, i) {
    const tr = trajectory(g.s, g.doses[i], g.tMax), row = [];
    for (let j = 0; j < g.times.length; j++) {
      const c = cellFrom(g.s, g.p, g.doses[i], g.times[j], stateAt(tr, g.times[j] * 60));
      c.iDose = i; c.iTime = j; row.push(c);
    }
    g.cells.push(row);
  }
  function finish(g, t0) {
    const counts = { pass: 0, failCT: 0, failActivity: 0, failBoth: 0 };
    let recommended = null, drugOnly = null;
    for (const row of g.cells) for (const c of row) {      // doses ascending, then times ascending
      if (c.pass) counts.pass++;
      else if (c.passCT) counts.failActivity++;
      else if (c.passActivity) counts.failCT++;
      else counts.failBoth++;
      if (c.pass && !recommended) recommended = c;
      if (c.passDrugOnly && !drugOnly) drugOnly = c;
    }
    return { inputs: g.s, doses: g.doses, times: g.times, cells: g.cells, recommended, drugOnly, counts, ms: now() - t0 };
  }
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  function runGridSync(inputs) {
    const t0 = now(), g = plan(inputs);
    for (let i = 0; i < g.doses.length; i++) doseRow(g, i);
    return finish(g, t0);
  }

  // Same work as runGridSync, but gives the page a turn between doses whenever ~12 ms have gone by.
  // opts.onProgress(frac) is called after every dose (frac 0..1). opts.signal (AbortSignal) is optional:
  // if it aborts, the promise rejects with an Error named 'AbortError'.
  const pause = () => new Promise(res => setTimeout(res, 0));
  async function runGrid(inputs, opts) {
    const o = opts || {}, t0 = now(), g = plan(inputs);
    const aborted = () => { if (o.signal && o.signal.aborted) { const e = new Error('grid run cancelled'); e.name = 'AbortError'; throw e; } };
    let last = now();
    await pause(); aborted();
    for (let i = 0; i < g.doses.length; i++) {
      doseRow(g, i);
      if (typeof o.onProgress === 'function') { try { o.onProgress((i + 1) / g.doses.length); } catch (e) { /* a broken progress bar must not stop the search */ } }
      if (now() - last > 12 && i < g.doses.length - 1) { await pause(); aborted(); last = now(); }
    }
    return finish(g, t0);
  }

  // ---------------------------------------------------------------- time course for one setpoint
  // Contact period, then after_min past the bisulfite. The quench time appears twice in t_min: once with the
  // residual still there, once with it removed (so a line chart draws the drop as a vertical step).
  function timecourse(inputs, dose, contact_min) {
    const s = normalize(inputs), p = params(s);
    const d = clamp(num(dose, s.doseRange[0]), LIMITS.dose[0], LIMITS.dose[1]);
    const tc = clamp(num(contact_min, s.timeRange[0]), 1e-3, LIMITS.time[1]);
    const tr = trajectory(s, d, tc);
    const out = { t_min: [], residual: [], cipro: [], ncl: [], p1: [], p2: [], activity: [], quenchAt_min: tc };
    const push = (t, y, res) => {
      const c = ugCip(y[4]), n = ugCip(y[5]), a = ugCip(y[6]), b = ugCip(y[7]);
      out.t_min.push(t); out.residual.push(res); out.cipro.push(c); out.ncl.push(n); out.p1.push(a); out.p2.push(b);
      out.activity.push(fin(activityOf(s, c, n, a, b)));
    };
    // The parent drug goes in the first seconds, so the first minute gets extra points.
    const ts = [0], early = Math.min(1, tc / 4);
    for (let i = 1; i <= 12; i++) ts.push(early * i / 12);
    const nMain = 96;
    for (let i = 1; i <= nMain; i++) ts.push(early + (tc - early) * i / nMain);
    for (const t of ts) { const y = stateAt(tr, t * 60); push(t, y, totalResidual(y)); }
    const yEnd = stateAt(tr, tc * 60);
    const nAfter = s.after_min > 0 ? 20 : 0;
    for (let i = 0; i <= nAfter; i++) {
      const dt = nAfter ? s.after_min * i / nAfter : 0;
      push(tc + dt, M.bisulfite(yEnd, p, s.pH, dt), 0);
    }
    return out;
  }

  // ---------------------------------------------------------------- what if the assumptions are wrong
  // The SAME dose and contact time, re-evaluated under other assumptions. Nothing is re-optimized.
  function sensitivity(inputs, cell) {
    const s = normalize(inputs);
    if (!cell || !isFinite(cell.dose) || !isFinite(cell.t)) return [];
    const pot = f => ({ NCL: clamp(s.potency.NCL * f, 0, 100), P1: clamp(s.potency.P1 * f, 0, 100), P2: clamp(s.potency.P2 * f, 0, 100) });
    const cases = [
      { id: 'rev_slow', label: 'Bisulfite reversal, slow', change: { k_rev: K_REV_SLOW } },
      { id: 'rev_fast', label: 'Bisulfite reversal, fast', change: { k_rev: K_REV_FAST } },
      { id: 'potency_x2', label: 'Products twice as potent', change: { potency: pot(2) } },
      { id: 'potency_half', label: 'Products half as potent', change: { potency: pot(0.5) } },
      // doubling zero tests nothing, so with (near) zero demand compare against the model's default instead
      s.k_demand_per_h < 0.05
        ? { id: 'demand_x2', label: 'Chlorine demand 0.72 per h', change: { k_demand_per_h: 0.72 } }
        : { id: 'demand_x2', label: 'Chlorine demand doubled', change: { k_demand_per_h: Math.min(s.k_demand_per_h * 2, LIMITS.k_demand_per_h[1]) } },
    ];
    return cases.map(k => {
      const c = evaluate(Object.assign({}, s, k.change), cell.dose, cell.t);
      return { id: k.id, label: k.label, activity_ugL: c.activity_ugL, ct: c.ct, pass: c.pass,
               passCT: c.passCT, passActivity: c.passActivity, cipro_ugL: c.cipro_ugL };
    });
  }

  // ---------------------------------------------------------------- export
  const CSV_HEADER = ['dose_mgL_Cl2', 'contact_min', 'ct_mg_min_per_L', 'total_residual_mgL_Cl2', 'free_residual_mgL_Cl2',
    'cipro_ugL', 'n_chloro_cipro_ugL_as_cipro', 'p1_ugL_as_cipro', 'p2_ugL_as_cipro', 'activity_ugL_cipro_eq',
    'pass_ct', 'pass_activity', 'pass', 'pass_drug_only', 'bisulfite_mgL_NaHSO3'];
  const sig = (v, n) => (isFinite(v) ? String(Number(Number(v).toPrecision(n))) : '');
  function toCSV(grid) {
    const lines = [CSV_HEADER.join(',')];
    if (grid && Array.isArray(grid.cells)) for (const row of grid.cells) for (const c of row) {
      lines.push([sig(c.dose, 6), sig(c.t, 6), sig(c.ct, 6), sig(c.residual, 6), sig(c.freeResidual, 6),
        sig(c.cipro_ugL, 6), sig(c.ncl_ugL, 6), sig(c.p1_ugL, 6), sig(c.p2_ugL, 6), sig(c.activity_ugL, 6),
        c.passCT ? 1 : 0, c.passActivity ? 1 : 0, c.pass ? 1 : 0, c.passDrugOnly ? 1 : 0, sig(c.bisulfite_mgL, 6)].join(','));
    }
    return lines.join('\n') + '\n';
  }

  // One line for this repo's blind-test script. --kind batch runs ris.cipro_model.run_batch(**params), which
  // always uses the committed model's own chlorine demand and k_rev, so the claim says when the page used others.
  function lockCommand(inputs, cell) {
    const s = normalize(inputs);
    if (!cell || !isFinite(cell.dose) || !isFinite(cell.t)) return '';
    const c = evaluate(s, cell.dose, cell.t);
    const tag = v => sig(v, 4).replace('.', 'p').replace(/[^0-9a-z]/g, '');
    const name = ['opt', 'cl' + tag(c.dose), 't' + tag(c.t), 'ph' + tag(s.pH)]
      .concat(s.NH3_mgN_L > 0 ? ['nh' + tag(s.NH3_mgN_L)] : []).join('-').slice(0, 60);
    const prm = [['pH', s.pH], ['Cl_dose_mgL', c.dose], ['NH3_mgN_L', s.NH3_mgN_L], ['cipro_mgL', s.cipro_ugL / 1000],
      ['contact_min', c.t], ['after_bisulfite_min', s.after_min]].map(kv => '--param ' + kv[0] + '=' + sig(kv[1], 8)).join(' ');
    let claim = 'Optimizer setpoint ' + fmt(c.dose, 'dose') + ' mg/L Cl2 for ' + fmt(c.t, 'time') + ' min at pH ' + sig(s.pH, 3) +
      ': predicted ciprofloxacin ' + fmt(c.cipro_ugL, 'ugL') + ' ug/L and antibacterial activity ' + fmt(c.activity_ugL, 'ugL') +
      ' ug/L cipro-equivalents after bisulfite plus ' + fmt(s.after_min, 'time') + ' min (limit ' + fmt(s.activityLimit_ugL, 'ugL') +
      ' ug/L; placeholder potencies NCL ' + sig(s.potency.NCL, 3) + ', P1 ' + sig(s.potency.P1, 3) + ', P2 ' + sig(s.potency.P2, 3) +
      '); CT ' + fmt(c.ct, 'ct') + ' mg*min/L' + (s.ctBasis === 'residual'
        ? ' as total residual x contact time (the file records CT as the integral of free chlorine, a different and larger number).'
        : ' as the integral of free chlorine.');
    const off = [];
    if (Math.abs(s.k_demand_per_h / 3600 - M.DEFAULTS.k_demand) > 1e-9) off.push('chlorine demand ' + sig(s.k_demand_per_h, 3) + ' per h');
    if (s.k_rev !== M.DEFAULTS.k_rev_bisulfite) off.push('k_rev ' + sig(s.k_rev, 3) + ' per s');
    if (off.length) claim += ' Page used ' + off.join(' and ') + ', not the committed model values, so the predicted block of this file differs from the claim.';
    claim = claim.replace(/["'`$\\!\n\r]/g, '');       // nothing a shell could trip over inside double quotes
    return 'python scripts/lock_prediction.py ' + name + ' --kind batch ' + prm + ' --claim "' + claim + '"';
  }

  // ---------------------------------------------------------------- number formatting (no units)
  const trim = str => (str.indexOf('.') >= 0 ? str.replace(/0+$/, '').replace(/\.$/, '') : str);
  function fmt(value, kind) {
    const v = typeof value === 'string' ? Number(value) : value;
    if (typeof v !== 'number' || !isFinite(v)) return '–';
    const a = Math.abs(v);
    if (a === 0) return '0';
    switch (kind) {
      case 'dose': return trim(v.toFixed(a < 10 ? 2 : 1));
      case 'time': return trim(v.toFixed(a < 10 ? 1 : (Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1)));
      case 'ct': return a >= 100 ? v.toFixed(0) : trim(v.toFixed(a >= 10 ? 1 : 2));
      case 'mgL': return a < 0.005 ? '<0.01' : trim(v.toFixed(a < 10 ? 2 : 1));
      case 'ugL':
      default:
        if (a < 0.0005) return '<0.001';
        if (a >= 1000) return v.toFixed(0);
        return String(Number(v.toPrecision(3)));
    }
  }

  return {
    DEFAULT_INPUTS, PRESETS, runGrid, runGridSync, evaluate, timecourse, sensitivity, toCSV, lockCommand, fmt,
    // extras (not in the contract, safe to ignore): cleaned-up inputs, preset merge, cache control
    normalize, withPreset: id => { const p = PRESETS.find(x => x.id === id); return normalize(Object.assign({}, DEFAULT_INPUTS, p ? p.inputs : {})); },
    clearCache: () => cache.clear(),
  };
})();
if (typeof globalThis !== 'undefined') globalThis.RISOPT = RISOPT;   // a top-level const is not a window property; the charts look it up there
if (typeof module !== 'undefined') module.exports = RISOPT;
