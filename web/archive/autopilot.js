// Chlorine dose autopilot for a wastewater plant.
// Reads flow, pH and ammonia from the plant feed, works out contact time (T10) from the basin, and holds the lowest
// hypochlorite dose that meets the CT target and the activity target. The operator picks a mode; nothing else.
// This build has no control-system link: the feed is simulated and the setpoint is not written to a pump.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id), app = $('app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'chlorine-autopilot-v1', NB = ' ';
  const num = (v) => typeof v === 'number' && isFinite(v);
  const f1 = (v) => (num(v) ? v.toFixed(1) : '--'), f2 = (v) => (num(v) ? v.toFixed(2) : '--');
  const int = (v) => (num(v) ? Math.round(v).toLocaleString('en-US') : '--');
  const hms = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const hm = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const MODE = { auto: 'Autopilot', advise: 'Advisory', hold: 'Hold' };
  const MODE_SAYS = { auto: 'Sets the dose itself.', advise: 'Suggests a dose. You apply it.', hold: 'Keeps this dose until you change mode.' };

  // ------------------------------------------------------------------ plant settings (set once on the Plant tab)
  const DEFAULTS = {
    name: 'Demo plant', basinMG: 1.3, baffle: 0.7,            // T10 = volume / flow x baffling factor
    ctTarget: 300, activityNg: 64, ciproIn: 1.0,              // mg·min/L; ng/L as ciprofloxacin; µg/L
    hypoPct: 12.5, doseMin: 2, doseMax: 25, sbsPct: 38,
    deadband: 0.3, margin: 3, gapMin: 1,                      // mg/L; %; minutes between changes
  };
  const FIELDS = [
    ['Contact basin', [['basinMG', 'Volume', 'MG', 0.05, 50], ['baffle', 'Baffling factor, T10/T', '', 0.1, 1]]],
    ['Targets', [['ctTarget', 'CT target (permit)', 'mg·min/L', 1, 5000], ['activityNg', 'Activity target (research, not a permit limit)', 'ng/L', 0.1, 100000]]],
    ['Secondary effluent', [['ciproIn', 'Assumed ciprofloxacin (no online measurement)', 'µg/L', 0.001, 1000]]],
    ['Chemical feed', [['hypoPct', 'Hypochlorite strength', '%', 5, 15], ['doseMin', 'Minimum dose', 'mg/L', 0.1, 50], ['doseMax', 'Maximum dose', 'mg/L', 1, 100], ['sbsPct', 'Bisulfite strength', '%', 10, 45]]],
    ['Autopilot', [['deadband', 'Deadband', 'mg/L', 0.1, 5], ['margin', 'Safety margin on targets', '%', 0, 30], ['gapMin', 'Shortest time between changes', 'min', 0, 120]]],
  ];
  const state = { cfg: Object.assign({}, DEFAULTS), mode: 'auto', applied: null, since: 0, log: [], read: null, rec: null, cell: null, at: 0, busy: false, fault: false, need: null };

  function save() { try { localStorage.setItem(KEY, JSON.stringify({ cfg: state.cfg, mode: state.mode, applied: state.applied, since: state.since, log: state.log.slice(0, 60) })); } catch (e) { /* private window */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) return;
      for (const k in DEFAULTS) if (s.cfg && typeof s.cfg[k] === typeof DEFAULTS[k] && (typeof s.cfg[k] === 'string' || isFinite(s.cfg[k]))) state.cfg[k] = s.cfg[k];
      if (MODE[s.mode]) state.mode = s.mode;
      if (isFinite(s.applied) && s.applied > 0) state.applied = +s.applied;
      if (isFinite(s.since)) state.since = +s.since;
      if (Array.isArray(s.log)) state.log = s.log.filter((e) => e && isFinite(e.t) && typeof e.why === 'string').slice(0, 60);
    } catch (e) { /* ignore bad saved state */ }
  }

  // ------------------------------------------------------------------ plant feed (simulated: one day of flow, pH and ammonia every 24 minutes)
  function feed(now) {
    const d = now / 1440000 * 2 * Math.PI, n = (k) => Math.sin(now / 23000 * k) * 0.5 + Math.sin(now / 9100 * k + 1) * 0.5;
    return {
      flow: 11.0 + 1.9 * Math.sin(d - 1.2) + 0.06 * n(1),
      pH: 7.44 + 0.11 * Math.sin(d * 0.5 + 0.6) + 0.006 * n(1.3),
      nh3: Math.max(0, 0.05 + 0.07 * Math.sin(d * 0.7 + 2) + 0.004 * n(0.7)),
    };
  }
  const t10 = (flow) => state.cfg.basinMG / flow * 1440 * state.cfg.baffle;
  const inputsFor = (r) => RISOPT.normalize(Object.assign({}, RISOPT.DEFAULT_INPUTS, {
    pH: Math.round(r.pH * 100) / 100, NH3_mgN_L: Math.round(r.nh3 * 100) / 100, cipro_ugL: state.cfg.ciproIn,
    ctTarget: state.cfg.ctTarget, activityLimit_ugL: state.cfg.activityNg / 1000, minContact_min: 0, maxContact_min: 480 }));

  // ------------------------------------------------------------------ controller
  const mg = () => state.cfg.margin / 100;
  const ctOK = (c, inp, m) => c.ct >= inp.ctTarget * (1 + m), acOK = (c, inp, m) => c.activity_ugL <= inp.activityLimit_ugL * (1 - m);
  const pause = () => new Promise((r) => setTimeout(r, 0));
  // Lowest dose that satisfies `test` at this contact time. CT rises and activity falls with dose, so bisection is enough.
  async function lowest(inp, t, test) {
    const lo0 = state.cfg.doseMin, hi0 = Math.max(state.cfg.doseMax, lo0 + 0.1), ok = (d) => test(RISOPT.evaluate(inp, d, t));
    if (!ok(hi0)) return null;
    if (ok(lo0)) return lo0;
    let lo = lo0, hi = hi0;
    for (let i = 0; i < 9; i++) { await pause(); const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    return Math.min(hi0, Math.ceil(hi * 10) / 10);
  }
  const both = (inp) => (c) => ctOK(c, inp, mg()) && acOK(c, inp, mg());
  function reason(cur, inp, r, to) {            // names the target that forced the change, then the readings
    const ctx = ' (flow ' + f1(r.flow) + NB + 'MGD, pH' + NB + f2(r.pH) + ')';
    if (!ctOK(cur, inp, mg())) return 'CT margin under ' + state.cfg.margin + '%' + ctx;
    if (!acOK(cur, inp, mg())) return 'Activity margin under ' + state.cfg.margin + '%' + ctx;
    return to < state.applied ? 'Both targets still met at the lower dose' + ctx : 'Restoring margin' + ctx;
  }
  function logDose(to, why, who) {
    state.log.unshift({ t: Date.now(), kind: 'dose', from: state.applied, to: to, why: why, who: who }); state.log = state.log.slice(0, 60);
    state.applied = to; state.since = Date.now(); save();
  }
  function setMode(m) {
    if (m === state.mode) return;
    state.log.unshift({ t: Date.now(), kind: 'mode', why: 'Mode: ' + MODE[state.mode] + ' → ' + MODE[m], who: 'Operator' }); state.log = state.log.slice(0, 60);
    state.mode = m; save(); draw(); head(); if (m === 'auto') tick();
  }
  async function tick() {
    if (state.busy) return; state.busy = true;
    try {
      const now = Date.now(), r = feed(now), t = t10(r.flow), inp = inputsFor(r);
      const rec = await lowest(inp, t, both(inp));
      if (state.applied == null) logDose(rec == null ? state.cfg.doseMax : rec, 'Initial setpoint', 'Autopilot');
      else if (state.mode === 'auto' && rec != null) {
        const cur = RISOPT.evaluate(inp, state.applied, t), failing = !both(inp)(cur);
        const waited = now - state.since >= state.cfg.gapMin * 60000;
        if (failing || (waited && Math.abs(rec - state.applied) >= state.cfg.deadband)) logDose(rec, reason(cur, inp, r, rec), 'Autopilot');
      }
      state.read = r; state.rec = rec; state.inp = inp; state.t = t; state.at = now; state.fault = false;
      state.cell = RISOPT.evaluate(inp, state.applied, t);
    } catch (e) { if (window.console) console.warn(e); state.fault = true; }
    state.busy = false; head();
    if (['now', 'log'].includes(route()) && !$('sheet')) draw();
  }

  // ------------------------------------------------------------------ derived figures
  const lbDay = (dose, flow) => dose * flow * 8.34;                                           // lb/day as Cl2
  const hypoGpd = (dose, flow) => lbDay(dose, flow) / (state.cfg.hypoPct * 0.0834);           // trade %: about 0.0834 lb Cl2 per gal per %
  const sbsLb = (c, flow) => c.bisulfite_mgL * flow * 8.34;                                   // lb/day as NaHSO3
  const sbsGpd = (c, flow) => sbsLb(c, flow) / ((1 + 0.0087 * state.cfg.sbsPct) * 8.34 * state.cfg.sbsPct / 100);
  const ng = (ug) => (ug * 1000 >= 100 ? int(ug * 1000) : (ug * 1000).toFixed(ug * 1000 >= 10 ? 0 : 1));
  const stale = () => state.at > 0 && Date.now() - state.at > 18000;

  function status() {
    const c = state.cell, inp = state.inp, dose = f1(state.applied) + NB + 'mg/L';
    if (!c) return { cls: 'idle', h: 'Waiting for first reading', p: 'Connecting to the plant feed.' };
    if (stale()) return { cls: 'warn', h: 'No signal since ' + hms(state.at), p: 'Holding ' + dose + '. The last setpoint is kept until readings return.' };
    if (state.fault) return { cls: 'alarm', h: 'Calculation fault', p: 'The model could not run on the last reading. Holding ' + dose + '.' };
    const ctBad = c.ct < inp.ctTarget, acBad = c.activity_ugL > inp.activityLimit_ugL;
    if (state.rec == null) return { cls: 'alarm', h: 'Targets cannot be met', p: 'No dose up to ' + f1(state.cfg.doseMax) + NB + 'mg/L meets both at ' + int(state.t) + NB + 'min T10. ' + (ctBad ? 'CT is ' + int(inp.ctTarget - c.ct) + ' below target.' : 'Activity is over target.') };
    if (ctBad || acBad) return { cls: 'alarm', h: ctBad ? 'CT below target' : 'Activity over target', p: (ctBad ? int(c.ct) + ' of ' + int(inp.ctTarget) + NB + 'mg·min/L. ' : ng(c.activity_ugL) + ' of ' + ng(inp.activityLimit_ugL) + NB + 'ng/L. ') + (state.mode === 'auto' ? 'Correcting on the next reading.' : f1(state.rec) + NB + 'mg/L would meet both.'), apply: state.mode === 'advise' };
    const diff = state.rec - state.applied;
    if (state.mode === 'hold') return { cls: 'ok', h: 'Held at ' + dose, p: 'Since ' + hm(state.since) + '. Not adjusting. Both targets are met.' };
    if (state.mode === 'advise' && Math.abs(diff) >= state.cfg.deadband) {
      return diff < 0 ? { cls: 'note', h: 'Lower to ' + f1(state.rec) + NB + 'mg/L', p: 'Both targets are still met. Saves ' + int(lbDay(-diff, state.read.flow)) + NB + 'lb/day of chlorine.', apply: true }
        : { cls: 'note', h: 'Raise to ' + f1(state.rec) + NB + 'mg/L', p: 'Targets are met, but with less than the ' + state.cfg.margin + '% margin.', apply: true };
    }
    return { cls: 'ok', h: 'Within both targets', p: state.mode === 'auto' ? 'Holding the lowest dose that meets CT and activity.' : 'No change needed.' };
  }
  // One bar per target. The hatched side of the track is the side that is not allowed.
  function bar(label, val, lim, text, unit, isMin, has) {
    const m = mg(), bad = has && (isMin ? val < lim : val > lim), tight = has && !bad && (isMin ? val < lim * (1 + m) : val > lim * (1 - m));
    const w = has ? Math.max(2, Math.min(100, lim > 0 ? val / lim * 66.7 : 0)) : 0, pct = has ? Math.abs(val - lim) / lim * 100 : 0;
    const side = !has ? '' : bad ? (isMin ? int(lim - val) + ' below minimum' : 'over maximum') : (pct < 10 ? pct.toFixed(1) : int(pct)) + '% ' + (isMin ? 'above minimum' : 'below maximum');
    return '<div class="lim ' + (bad ? 'bad' : tight ? 'tight' : 'ok') + (isMin ? ' min' : ' max') + '"><div class="lim-h"><span>' + label + '</span><span><b>' + text + '</b>' + NB + unit + '</span></div>' +
      '<div class="track"><u></u><i style="width:' + w.toFixed(1) + '%"></i><em></em></div><div class="lim-f"><span class="at">' + (isMin ? 'min ' : 'max ') + (isMin ? int(lim) : ng(lim)) + '</span><span class="side">' + side + '</span></div></div>';
  }
  const tile = (tag, label, val, unit) => '<div class="tile"><span class="tl">' + label + '</span><span class="tg">' + tag + '</span><span class="tv">' + val + (unit ? NB + '<small>' + unit + '</small>' : '') + '</span></div>';
  const kv = (k, v, cls) => '<div class="kv' + (cls ? ' ' + cls : '') + '"><span>' + k + '</span><span>' + v + '</span></div>';

  // ------------------------------------------------------------------ screens
  const SCREENS = {
    now() {
      const has = !!state.cell, c = state.cell || {}, r = state.read || {}, inp = state.inp || { ctTarget: state.cfg.ctTarget, activityLimit_ugL: state.cfg.activityNg / 1000 };
      const st = status(), last = state.log.find((e) => e.kind === 'dose');
      return '<section class="modebox"><span class="lbl">Mode</span><div class="seg" role="radiogroup" aria-label="Control mode">' +
        Object.keys(MODE).map((m) => '<button role="radio" aria-checked="' + (state.mode === m) + '" data-mode="' + m + '"' + (has ? '' : ' disabled') + '>' + MODE[m] + '</button>').join('') + '</div><p class="says">' + MODE_SAYS[state.mode] + '</p></section>' +
        '<section class="hero' + (has && stale() ? ' dim' : '') + '"><p class="lbl">Hypochlorite dose setpoint</p>' +
        '<p class="dose' + (has ? '' : ' wait') + '">' + (has ? f1(state.applied) : '--.-') + '<small>mg/L as Cl₂</small></p>' +
        kv('Hypochlorite feed, ' + f1(state.cfg.hypoPct) + '%', has ? '<b>' + int(hypoGpd(state.applied, r.flow)) + '</b>' + NB + 'gpd (' + int(hypoGpd(state.applied, r.flow) / 24) + NB + 'gph)' : '--') +
        kv('Chlorine', has ? '<b>' + int(lbDay(state.applied, r.flow)) + '</b>' + NB + 'lb/day' : '--') +
        '<p class="chg">' + (last ? (last.from == null ? 'Set to ' + f1(last.to) : (last.to > last.from ? 'Raised ' : 'Lowered ') + f1(Math.abs(last.to - last.from))) + NB + 'mg/L at ' + hm(last.t) + '. ' + esc(last.why) + '.' : NB) + '</p></section>' +
        '<section class="stat ' + st.cls + '"><i class="glyph"></i><div><b>' + st.h + '</b><span>' + st.p + '</span></div>' + (st.apply && state.rec != null ? '<button id="apply">Apply ' + f1(state.rec) + '</button>' : '') + '</section>' +
        '<section class="blk"><h2>Targets</h2>' + bar('CT (residual × T10)', c.ct, inp.ctTarget, has ? int(c.ct) : '--', 'mg·min/L', true, has) +
        bar('Activity at outfall, as ciprofloxacin', c.activity_ugL, inp.activityLimit_ugL, has ? ng(c.activity_ugL) : '--', 'ng/L', false, has) +
        '<p class="fine">Activity is a model estimate. Not for compliance.</p></section>' +
        '<section class="blk' + (has && stale() ? ' dim' : '') + '"><h2>Readings</h2><div class="tiles">' + tile('FIT-101', 'Flow to basin', has ? f1(r.flow) : '--', 'MGD') + tile('calc.', 'Contact time T10', has ? int(state.t) : '--', 'min') +
        tile('AIT-110', 'pH', has ? f2(r.pH) : '--', '') + tile('AIT-112', 'Ammonia-N', has ? f2(r.nh3) : '--', 'mg/L') + '</div>' +
        kv('Chlorine residual, AIT-120', 'Not' + NB + 'connected', 'off') + '</section>' +
        '<section class="blk"><h2>Dechlorination</h2>' + kv('Predicted residual at basin outlet', has ? '<b>' + f2(c.residual) + '</b>' + NB + 'mg/L' : '--') +
        kv('Sodium bisulfite, ' + int(state.cfg.sbsPct) + '%', has ? 'about <b>' + int(sbsGpd(c, r.flow)) + '</b>' + NB + 'gpd (' + int(sbsLb(c, r.flow)) + NB + 'lb/day NaHSO₃)' : '--') + '</section>' +
        (has ? '<a class="more" href="#why"><span><b>Why ' + f1(state.applied) + NB + 'mg/L</b><span>Which target sets the dose, and what would move it.</span></span><i></i></a>' : '') +
        '<p class="fine pad">Demo feed. Readings are simulated and the setpoint is not sent to a pump.</p>';
    },
    log() {
      const body = state.log.length ? '<ol class="log">' + state.log.map((e) => '<li class="e-' + e.kind + '"><span class="lt">' + hms(e.t) + '</span><span class="lv">' +
        (e.kind === 'mode' ? esc(e.why) : (e.from == null ? '<b>' + f1(e.to) + '</b>' : f1(e.from) + ' → <b>' + f1(e.to) + '</b>') + NB + '<small>mg/L</small>') + '</span><span class="lm">' + esc(e.who || '') + '</span>' +
        (e.kind === 'dose' ? '<span class="lw">' + esc(e.why) + '</span>' : '') + '</li>').join('') + '</ol>' : '<p class="empty">No entries yet. The first appears when the autopilot sets its initial dose.</p>';
      return '<section class="blk"><h2>Setpoint and mode changes</h2><p class="fine lead">The demo feed plays one day in 24 minutes, so changes come faster than on a real plant.</p>' + body +
        '<p class="fine">Kept on this device. The 60 most recent entries are shown.</p></section>';
    },
    plant() {
      return '<form id="cfg" novalidate><section class="blk"><h2>Plant</h2><label class="frow"><span class="fl">Plant name</span><span class="fin"><input id="c-name" type="text" maxlength="40" value="' + esc(state.cfg.name) + '"></span></label></section>' +
        FIELDS.map((g) => '<section class="blk"><h2>' + g[0] + '</h2>' + g[1].map((f) => '<label class="frow" data-k="' + f[0] + '"><span class="fl">' + f[1] + '<small>' + f[3] + ' to ' + f[4] + '</small></span><span class="fin"><input id="c-' + f[0] + '" type="text" inputmode="decimal" value="' + state.cfg[f[0]] + '"><span class="fu">' + f[2] + '</span></span><em class="msg" hidden></em></label>').join('') + '</section>').join('') +
        '<section class="blk"><h2>Data source</h2>' + kv('Plant feed', '<b>Demo feed</b>') + kv('Control-system link (OPC UA, Modbus)', 'Not in this build') + kv('On loss of signal', 'Last setpoint is held') +
        '<p class="fine">Readings are simulated: one day of flow, pH and ammonia plays every 24 minutes. The setpoint is shown here only. Nothing is sent to a pump.</p></section>' +
        '<section class="blk"><h2>Model</h2><p class="fine">Chlorination kinetics from Dodd et al. 2005. How strongly each chlorination product inhibits bacteria is a placeholder until it is measured, so the activity figure is provisional. Research tool. Not for compliance decisions.</p>' +
        '<button type="button" class="textb" id="defaults">Restore default settings</button></section>' +
        '<div class="savebar" id="savebar" hidden><span id="nchg"></span><button type="button" id="discard">Discard</button><button type="submit" class="primary">Save</button></div></form>';
    },
    why() {
      return '<header class="sub"><a href="#now" aria-label="Back to Now">‹</a><div><h2 class="big">Why ' + f1(state.applied) + NB + 'mg/L</h2><p class="fine" id="asof"></p></div></header>' +
        '<section class="blk"><h2>What sets the dose</h2><div id="needs"><p class="empty">Working it out.</p></div></section>' +
        '<section class="blk"><h2>What would move it</h2><div id="moves"><p class="empty">Working it out.</p></div></section>' +
        '<section class="blk"><h2>Operating map</h2><p class="fine lead" id="mapcap"></p><div id="map" class="chart"></div><p class="mapread" id="mapread" aria-live="polite"></p></section>' +
        '<section class="blk"><h2>Through the basin</h2><div id="tc" class="chart"></div></section>' +
        '<details class="blk"><summary>Model checks (research)</summary><p class="fine lead">The same setpoint if a model assumption is off.</p><div id="checks"></div></details>';
    },
  };

  // ------------------------------------------------------------------ confirm sheet
  function sheet(title, text, yes, onYes) {
    closeSheet();
    const el = document.createElement('div'); el.id = 'sheet'; el.className = 'sheet';
    el.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true" aria-labelledby="sh-t"><h2 class="big" id="sh-t">' + title + '</h2><p>' + text + '</p><div class="sheet-b"><button id="sh-no">Cancel</button><button id="sh-yes" class="primary">' + yes + '</button></div></div>';
    document.body.appendChild(el);
    $('sh-no').addEventListener('click', closeSheet); el.addEventListener('click', (e) => { if (e.target === el) closeSheet(); });
    $('sh-yes').addEventListener('click', () => { closeSheet(); onYes(); }); $('sh-yes').focus();
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }
  function closeSheet() { const s = $('sheet'); if (s) s.remove(); }

  const AFTER = {
    now() {
      app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
        const m = b.dataset.mode; if (m === state.mode) return;
        const d = state.rec != null ? state.rec - state.applied : 0, dose = f1(state.applied) + NB + 'mg/L';
        const text = m === 'auto' ? 'The app will change the setpoint itself. ' + (state.rec != null && Math.abs(d) >= state.cfg.deadband ? 'First change: ' + f1(state.applied) + ' → ' + f1(state.rec) + NB + 'mg/L.' : 'No change is due now.')
          : m === 'advise' ? 'The dose stays at ' + dose + ' until you apply a suggestion.' : 'The dose stays at ' + dose + '. The app will not adjust or suggest.';
        sheet('Switch to ' + MODE[m] + '?', text, 'Switch to ' + MODE[m], () => setMode(m));
      }));
      if ($('apply')) $('apply').addEventListener('click', () => { if (state.rec == null) return; logDose(state.rec, 'Applied suggestion', 'Operator'); state.cell = RISOPT.evaluate(state.inp, state.applied, state.t); draw(); head(); });
    },
    plant() {
      const form = $('cfg'), barEl = $('savebar');
      const dirty = () => { let n = $('c-name').value.trim() !== state.cfg.name ? 1 : 0; FIELDS.forEach((g) => g[1].forEach((f) => { if ($('c-' + f[0]).value.trim() !== String(state.cfg[f[0]])) n++; })); barEl.hidden = !n; $('nchg').textContent = n + (n === 1 ? ' change' : ' changes'); };
      form.addEventListener('input', dirty);
      $('discard').addEventListener('click', () => draw());
      form.addEventListener('submit', (e) => {
        e.preventDefault(); let first = null; const next = Object.assign({}, state.cfg);
        const flag = (id, text) => { const el = $('c-' + id), rowEl = el.closest('.frow'), msg = rowEl.querySelector('.msg'); msg.textContent = text; msg.hidden = !text; rowEl.classList.toggle('bad', !!text); if (text && !first) first = el; };
        FIELDS.forEach((g) => g[1].forEach((f) => {
          const m = $('c-' + f[0]).value.replace(',', '.').match(/-?(?:\d+\.?\d*|\.\d+)/), v = m ? Number(m[0]) : NaN;
          const bad = !m ? 'Enter a number.' : v < f[3] || v > f[4] ? 'Enter ' + f[3] + ' to ' + f[4] + '.' : ''; flag(f[0], bad); if (!bad) next[f[0]] = v;
        }));
        if (isFinite(next.doseMax) && isFinite(next.doseMin) && next.doseMax <= next.doseMin) flag('doseMax', 'Must be above the minimum dose.');
        if (first) { first.focus(); return; }
        next.name = $('c-name').value.trim().slice(0, 40) || DEFAULTS.name; state.cfg = next; save(); head(); draw(); tick();
      });
      $('defaults').addEventListener('click', () => sheet('Restore default settings?', 'Basin, targets, feed and autopilot settings go back to the demo plant values.', 'Restore', () => { state.cfg = Object.assign({}, DEFAULTS); save(); head(); draw(); tick(); }));
    },
    why() {
      if (!state.cell) { location.hash = 'now'; return; }
      const inp = state.inp, t = state.t, r = state.read, cur = state.applied, lim = ng(inp.activityLimit_ugL);
      $('asof').textContent = 'As of ' + hms(state.at) + '. Flow ' + f1(r.flow) + ' MGD, pH ' + f2(r.pH) + ', T10 ' + int(t) + ' min.';
      const dz = (v) => (v == null ? 'more than ' + f1(state.cfg.doseMax) : f1(v)) + NB + 'mg/L';
      (async () => {
        const dCT = await lowest(inp, t, (c) => ctOK(c, inp, mg())), dAC = await lowest(inp, t, (c) => acOK(c, inp, mg()));
        if (route() !== 'why') return;
        const gov = dCT == null || dAC == null ? null : dAC >= dCT ? 'activity' : 'CT';
        $('needs').innerHTML = kv('CT of ' + int(inp.ctTarget) + NB + 'mg·min/L at ' + int(t) + NB + 'min T10 needs', '<b>' + dz(dCT) + '</b>') + kv('Activity under ' + lim + NB + 'ng/L needs', '<b>' + dz(dAC) + '</b>') +
          '<p class="sum">' + (gov ? 'The setpoint is the higher of the two, with the ' + state.cfg.margin + '% margin already in each. Today <b>' + gov + '</b> sets the dose.' : 'No dose in the pump range meets both targets at this contact time.') + '</p>';
        const base = await lowest(inp, t, both(inp)), mv = [];
        const what = async (label, rr) => { const ii = inputsFor(rr), d = await lowest(ii, t10(rr.flow), both(ii)); mv.push(kv(label, d == null || base == null ? 'out of range' : '<b>' + (d - base >= 0 ? '+' : '−') + f1(Math.abs(d - base)) + '</b>' + NB + 'mg/L')); };
        await what('Flow 1 MGD higher (T10 ' + int(t10(r.flow + 1)) + NB + 'min)', { flow: r.flow + 1, pH: r.pH, nh3: r.nh3 });
        await what('Flow 1 MGD lower (T10 ' + int(t10(r.flow - 1)) + NB + 'min)', { flow: r.flow - 1, pH: r.pH, nh3: r.nh3 });
        await what('pH 0.1 higher', { flow: r.flow, pH: r.pH + 0.1, nh3: r.nh3 });
        await what('Ammonia-N 0.1 mg/L higher', { flow: r.flow, pH: r.pH, nh3: r.nh3 + 0.1 });
        if (route() === 'why') $('moves').innerHTML = mv.join('');
      })().catch(() => { if ($('needs')) $('needs').innerHTML = '<p class="empty">Could not work this out.</p>'; });
      // Grid chosen so the running dose and contact time are exact grid points; the marker then matches the setpoint.
      const T = Math.round(t), sd = 0.5, nLo = Math.min(20, Math.floor((cur - 0.5) / sd)), st = 5, kLo = Math.min(9, Math.max(0, Math.floor((T - 30) / st)));
      const gi = Object.assign({}, inp, { doseRange: [cur - nLo * sd, cur + (35 - nLo) * sd], nDose: 36, timeRange: [T - kLo * st, T + (24 - kLo) * st], nTime: 25, maxContact_min: T + (24 - kLo) * st });
      $('mapcap').textContent = 'Blue: the dose meets both targets at that contact time. Contact time now is ' + T + ' min; the operator sets dose, flow sets contact time.';
      const say = (c) => { $('mapread').innerHTML = '<b>' + f1(c.dose) + NB + 'mg/L at ' + int(c.t) + NB + 'min.</b> ' + (c.pass ? 'Meets both targets.' : c.passCT ? 'Activity over target.' : 'CT short.') + ' CT ' + int(c.ct) + ', activity ' + ng(c.activity_ugL) + NB + 'ng/L.'; };
      RISOPT.runGrid(gi).then((g) => { if (route() !== 'why') return; const here = RISOPT.evaluate(gi, cur, T); g.recommended = null; g.drugOnly = null; RISCHART.operatingMap($('map'), g, { selected: here, onSelect: say }); say(here); })
        .catch(() => { $('map').innerHTML = '<p class="empty">Could not draw the map.</p>'; });
      try {
        $('checks').innerHTML = RISOPT.sensitivity(inp, state.cell).map((s) => kv(esc(s.label.replace('Products', 'Chlorination products are')), '<b class="' + (s.pass ? 'okt' : 'badt') + '">' + (s.pass ? 'Still meets targets' : 'Misses a target') + '</b>')).join('');
        const raw = RISOPT.timecourse(inp, cur, t), pot = inp.potency, x = (a, k) => a.map((v) => v * k);
        RISCHART.timecourse($('tc'), Object.assign({}, raw, { ncl: x(raw.ncl, pot.NCL), p1: x(raw.p1, pot.P1), p2: x(raw.p2, pot.P2) }), { limit_ugL: inp.activityLimit_ugL });
      } catch (e) { $('checks').innerHTML = '<p class="empty">Could not run the checks.</p>'; }
    },
  };

  // ------------------------------------------------------------------ shell
  const route = () => { const r = (location.hash || '').replace('#', ''); return SCREENS[r] ? r : 'now'; };
  // Header state line, on every tab: mode, target state, age of the last reading. Alarm and no-signal recolour the bar.
  function head() {
    $('pname').textContent = state.cfg.name;
    const st = status(), age = state.at ? Math.max(0, Math.round((Date.now() - state.at) / 1000)) : null, top = $('top');
    top.className = 'top ' + (st.cls === 'alarm' ? 'alarm' : st.cls === 'warn' ? 'warn' : '');
    $('pstate').textContent = !state.cell ? 'Waiting for first reading' : st.cls === 'alarm' || st.cls === 'warn' ? st.h.toUpperCase() : MODE[state.mode].toUpperCase() + ' · ' + (st.cls === 'note' ? 'change suggested' : 'within targets') + ' · reading ' + age + ' s ago';
  }
  function draw() {
    const r = route(), y = window.scrollY, same = app.dataset.r === r;
    try { app.innerHTML = SCREENS[r](); app.dataset.r = r; if (AFTER[r]) AFTER[r](); }
    catch (e) { if (window.console) console.warn(e); app.innerHTML = '<section class="stat alarm"><i class="glyph"></i><div><b>This screen could not be shown</b><span>Your plant settings are saved. Open another tab and come back.</span></div></section>'; }
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.getAttribute('href') === '#' + (r === 'why' ? 'now' : r); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0, same ? y : 0);
  }
  window.addEventListener('hashchange', () => { closeSheet(); draw(); });
  load(); head(); draw(); tick(); setInterval(tick, 6000); setInterval(head, 1000);
})();
