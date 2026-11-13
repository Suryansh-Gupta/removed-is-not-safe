// Chlorine dose autopilot for a wastewater plant.
// Reads flow, pH and ammonia from the plant feed, works out contact time from the basin, and holds the lowest
// hypochlorite dose that meets the CT target and the activity limit. The operator picks a mode; nothing else.
// This build has no control-system link: the feed is simulated and the setpoint is not written to a pump.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id), app = $('app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const KEY = 'chlorine-autopilot-v1';
  const f1 = (v) => (isFinite(v) ? v.toFixed(1) : '–'), f2 = (v) => (isFinite(v) ? v.toFixed(2) : '–');
  const int = (v) => (isFinite(v) ? Math.round(v).toLocaleString('en-US') : '–');
  const sig = (v) => RISOPT.fmt(v, 'ugL');
  const clock = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ------------------------------------------------------------------ plant settings (set once on the Plant tab)
  const DEFAULTS = {
    name: 'Demo plant', basinMG: 1.3, baffle: 0.7,                 // contact time = volume / flow x baffling factor (t10/T)
    ctTarget: 300, activityLimit: 0.064, ciproIn: 1.0,              // mg·min/L; µg/L as ciprofloxacin; µg/L
    doseMin: 2, doseMax: 25, deadband: 0.3, margin: 3,              // mg/L; mg/L; % kept in hand on both limits
    hypoPct: 12.5,
  };
  const FIELDS = [
    ['Basin', [['basinMG', 'Contact basin volume', 'MG', 0.05, 50], ['baffle', 'Baffling factor (t10/T)', '', 0.1, 1]]],
    ['Permit', [['ctTarget', 'CT target', 'mg·min/L', 1, 5000], ['activityLimit', 'Antibacterial activity limit at outfall', 'µg/L', 0.0001, 1000]]],
    ['Influent', [['ciproIn', 'Ciprofloxacin entering the basin', 'µg/L', 0.001, 1000]]],
    ['Hypochlorite feed', [['hypoPct', 'Solution strength', '% NaOCl', 5, 15], ['doseMin', 'Lowest dose the pumps deliver', 'mg/L', 0.1, 50], ['doseMax', 'Highest dose the pumps deliver', 'mg/L', 1, 100]]],
    ['Autopilot', [['deadband', 'Smallest change it will make', 'mg/L', 0.1, 5], ['margin', 'Margin kept inside both limits', '%', 0, 30]]],
  ];
  const state = { cfg: Object.assign({}, DEFAULTS), mode: 'auto', applied: null, log: [], read: null, rec: null, cell: null, at: 0, basis: null, busy: false };

  function save() { try { localStorage.setItem(KEY, JSON.stringify({ cfg: state.cfg, mode: state.mode, applied: state.applied, log: state.log.slice(0, 40), basis: state.basis })); } catch (e) { /* private window */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) return;
      for (const k in DEFAULTS) if (s.cfg && typeof s.cfg[k] === typeof DEFAULTS[k] && (typeof s.cfg[k] === 'string' || isFinite(s.cfg[k]))) state.cfg[k] = s.cfg[k];
      if (['auto', 'advise', 'hold'].includes(s.mode)) state.mode = s.mode;
      if (isFinite(s.applied) && s.applied > 0) state.applied = +s.applied;
      if (Array.isArray(s.log)) state.log = s.log.filter((e) => e && isFinite(e.t) && isFinite(e.to)).slice(0, 40);
      if (s.basis && isFinite(s.basis.flow)) state.basis = s.basis;
    } catch (e) { /* ignore bad saved state */ }
  }

  // ------------------------------------------------------------------ plant feed (simulated: one diurnal cycle every 6 minutes)
  function feed(now) {
    const d = now / 360000 * 2 * Math.PI, n = (k) => Math.sin(now / 9000 * k) * 0.5 + Math.sin(now / 4100 * k + 1) * 0.5;
    return {
      flow: 11.0 + 1.9 * Math.sin(d - 1.2) + 0.12 * n(1),                    // MGD
      pH: 7.44 + 0.11 * Math.sin(d * 0.5 + 0.6) + 0.012 * n(1.3),
      nh3: Math.max(0, 0.05 + 0.07 * Math.sin(d * 0.7 + 2) + 0.008 * n(0.7)),  // mg N/L
    };
  }
  const contactMin = (flow) => state.cfg.basinMG / flow * 1440 * state.cfg.baffle;
  const inputsFor = (r) => RISOPT.normalize(Object.assign({}, RISOPT.DEFAULT_INPUTS, {
    pH: Math.round(r.pH * 100) / 100, NH3_mgN_L: Math.round(r.nh3 * 100) / 100, cipro_ugL: state.cfg.ciproIn,
    ctTarget: state.cfg.ctTarget, activityLimit_ugL: state.cfg.activityLimit, minContact_min: 0, maxContact_min: 480 }));

  // ------------------------------------------------------------------ controller
  const within = (c, inp) => { const m = state.cfg.margin / 100; return c.ct >= inp.ctTarget * (1 + m) && c.activity_ugL <= inp.activityLimit_ugL * (1 - m); };
  const pause = () => new Promise((r) => setTimeout(r, 0));
  // Lowest dose inside both limits at this contact time. CT rises and activity falls with dose, so bisection is enough.
  async function lowestDose(inp, t) {
    const lo0 = state.cfg.doseMin, hi0 = Math.max(state.cfg.doseMax, lo0 + 0.1), ok = (d) => within(RISOPT.evaluate(inp, d, t), inp);
    if (!ok(hi0)) return null;
    if (ok(lo0)) return lo0;
    let lo = lo0, hi = hi0;
    for (let i = 0; i < 9; i++) { await pause(); const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
    return Math.min(hi0, Math.ceil(hi * 10) / 10);
  }
  function reason(r) {
    const b = state.basis; if (!b) return 'Start-up';
    const ch = [['flow', (r.flow - b.flow) / 0.6, 'flow ' + (r.flow > b.flow ? 'rose' : 'fell') + ' to ' + f1(r.flow) + ' MGD'],
      ['pH', (r.pH - b.pH) / 0.05, 'pH ' + (r.pH > b.pH ? 'rose' : 'fell') + ' to ' + f2(r.pH)],
      ['nh3', (r.nh3 - b.nh3) / 0.03, 'ammonia ' + (r.nh3 > b.nh3 ? 'rose' : 'fell') + ' to ' + f2(r.nh3) + ' mg N/L']];
    ch.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
    return ch[0][2].charAt(0).toUpperCase() + ch[0][2].slice(1);
  }
  function setDose(to, why, r) {
    const from = state.applied; state.applied = to; state.basis = { flow: r.flow, pH: r.pH, nh3: r.nh3 };
    state.log.unshift({ t: Date.now(), from: from, to: to, why: why, mode: state.mode }); state.log = state.log.slice(0, 40); save();
  }
  async function tick() {
    if (state.busy) return; state.busy = true;
    try {
      const now = Date.now(), r = feed(now), t = contactMin(r.flow), inp = inputsFor(r);
      const rec = await lowestDose(inp, t);
      if (state.applied == null) setDose(rec == null ? state.cfg.doseMax : rec, 'Start-up', r);
      else if (state.mode === 'auto' && rec != null) {
        const cur = RISOPT.evaluate(inp, state.applied, t);
        if (Math.abs(rec - state.applied) >= state.cfg.deadband || !within(cur, inp)) setDose(rec, reason(r), r);
      }
      state.read = r; state.rec = rec; state.inp = inp; state.t = t; state.at = now;
      state.cell = RISOPT.evaluate(inp, state.applied, t);
      if (['now', 'log'].includes(route())) draw();
    } catch (e) { if (window.console) console.warn(e); state.fault = true; if (route() === 'now') draw(); }
    state.busy = false;
  }

  // ------------------------------------------------------------------ pieces
  const lbDay = (dose, flow) => dose * flow * 8.34;                         // lb/day as Cl2
  const galDay = (dose, flow) => lbDay(dose, flow) / (state.cfg.hypoPct * 0.0834);   // trade % NaOCl: about 0.0834 lb Cl2 per gal per %
  function status() {
    const c = state.cell, inp = state.inp;
    if (state.fault) return { cls: 'alarm', h: 'Calculation fault', p: 'The model could not run on the last reading. Holding ' + f1(state.applied) + ' mg/L.' };
    if (!c) return { cls: 'idle', h: 'Starting', p: 'Reading the plant feed.' };
    const okNow = c.ct >= inp.ctTarget && c.activity_ugL <= inp.activityLimit_ugL;
    if (state.rec == null) return { cls: 'alarm', h: 'Limits cannot be met', p: 'No dose up to ' + f1(state.cfg.doseMax) + ' mg/L meets both limits at ' + int(state.t) + ' min of contact. ' + (c.ct < inp.ctTarget ? 'CT is short.' : 'Activity is over the limit.') };
    if (!okNow) return { cls: 'alarm', h: c.ct < inp.ctTarget ? 'CT below target' : 'Activity over limit', p: state.mode === 'auto' ? 'Correcting on the next reading.' : 'The held dose no longer meets the limits. ' + f1(state.rec) + ' mg/L would.' };
    if (state.mode === 'advise' && Math.abs(state.rec - state.applied) >= state.cfg.deadband) return { cls: 'note', h: 'Change suggested', p: 'Limits are met. ' + f1(state.rec) + ' mg/L is the lowest dose that keeps them.' };
    return { cls: 'ok', h: 'Within both limits', p: state.mode === 'auto' ? 'Autopilot is holding the lowest dose that meets them.' : state.mode === 'hold' ? 'Dose is held. Autopilot is not adjusting.' : 'No change needed.' };
  }
  function bar(label, val, lim, text, unit, higher) {
    const ok = higher ? val >= lim : val <= lim, w = Math.max(2, Math.min(100, lim > 0 ? val / lim * 66.7 : 0));
    return '<div class="lim ' + (ok ? 'ok' : 'bad') + '"><div class="lim-h"><span>' + label + '</span><span><b>' + text + '</b> ' + unit + '</span></div>' +
      '<div class="track"><i style="width:' + w.toFixed(1) + '%"></i><em></em></div><div class="lim-f"><span>' + (higher ? 'Target ' : 'Limit ') + RISOPT.fmt(lim, higher ? 'ct' : 'ugL') + '</span>' +
      '<span>' + (ok ? (higher ? '+' : '') + int(Math.abs(val - lim) / lim * 100) + '% ' + (higher ? 'over target' : 'under limit') : higher ? 'short' : 'exceeded') + '</span></div></div>';
  }
  const cellBox = (tag, label, val, unit) => '<div class="cellb"><span class="tagn">' + tag + '</span><span class="cl">' + label + '</span><span class="cv">' + val + (unit ? ' <small>' + unit + '</small>' : '') + '</span></div>';
  const row = (k, v) => '<div class="kv"><span>' + k + '</span><span>' + v + '</span></div>';

  // ------------------------------------------------------------------ screens
  const SCREENS = {
    now() {
      const c = state.cell, r = state.read, st = status(), last = state.log[0];
      if (!c) return '<section class="hero"><p class="lab">Hypochlorite dose setpoint</p><p class="dose">–<small>mg/L as Cl₂</small></p><p class="sub">Reading the plant feed.</p></section>';
      const diff = state.rec != null ? state.rec - state.applied : 0, showRec = state.mode !== 'auto' && state.rec != null && Math.abs(diff) >= 0.05;
      return '<div class="modes" role="radiogroup" aria-label="Control mode">' +
        [['auto', 'Autopilot'], ['advise', 'Advisory'], ['hold', 'Hold']].map((m) => '<button role="radio" aria-checked="' + (state.mode === m[0]) + '" data-mode="' + m[0] + '">' + m[1] + '</button>').join('') + '</div>' +
        '<section class="hero"><p class="lab">Hypochlorite dose setpoint</p>' +
        '<p class="dose">' + f1(state.applied) + '<small>mg/L as Cl₂</small></p>' +
        '<p class="sub">' + int(galDay(state.applied, r.flow)) + ' gal/day of ' + f1(state.cfg.hypoPct) + '% NaOCl · ' + int(lbDay(state.applied, r.flow)) + ' lb/day Cl₂</p>' +
        (showRec ? '<div class="rec"><span>Lowest dose that meets both limits: <b>' + f1(state.rec) + ' mg/L</b> (' + (diff > 0 ? '+' : '−') + f1(Math.abs(diff)) + ')</span><button id="apply">Apply</button></div>' : '') +
        (last ? '<p class="chg">' + (last.from == null ? 'Set to ' + f1(last.to) + ' mg/L' : (last.to > last.from ? 'Raised ' : 'Lowered ') + f1(Math.abs(last.to - last.from)) + ' mg/L') + ' at ' + clock(last.t) + '. ' + esc(last.why) + '.</p>' : '') + '</section>' +
        '<section class="stat ' + st.cls + '"><b>' + st.h + '</b><span>' + st.p + '</span></section>' +
        '<section class="blk"><h2>Limits</h2>' + bar('Disinfection, CT', c.ct, state.inp.ctTarget, int(c.ct), 'mg·min/L', true) +
        bar('Antibacterial activity at outfall', c.activity_ugL, state.inp.activityLimit_ugL, sig(c.activity_ugL), 'µg/L', false) + '</section>' +
        '<section class="blk"><h2>Plant now</h2><div class="cells">' + cellBox('FIT-101', 'Effluent flow', f1(r.flow), 'MGD') + cellBox('Calc', 'Contact time (t10)', int(state.t), 'min') +
        cellBox('AIT-110', 'pH', f2(r.pH), '') + cellBox('AIT-112', 'Ammonia', f2(r.nh3), 'mg N/L') + '</div></section>' +
        '<section class="blk"><h2>Dechlorination</h2>' + row('Chlorine residual leaving the basin', '<b>' + f2(c.residual) + '</b> mg/L') +
        row('Sodium bisulfite to remove it', '<b>' + int(c.bisulfite_mgL * r.flow * 8.34) + '</b> lb/day') + '</section>' +
        '<a class="more" href="#why"><span><b>Why ' + f1(state.applied) + ' mg/L</b><span>Every dose and contact time, and what would change this one.</span></span><i></i></a>' +
        '<p class="foot">Updated ' + clock(state.at) + '. Demo feed: readings are simulated and the setpoint is not sent to a pump.</p>';
    },
    log() {
      if (!state.log.length) return '<section class="blk"><h2>Setpoint changes</h2><p class="empty">No changes yet. The first entry appears when the autopilot sets its starting dose.</p></section>';
      const m = { auto: 'Autopilot', advise: 'Operator', hold: 'Operator' };
      return '<section class="blk"><h2>Setpoint changes</h2><ol class="log">' + state.log.map((e) => '<li><span class="lt">' + clock(e.t) + '</span><span class="lv">' +
        (e.from == null ? '<b>' + f1(e.to) + '</b>' : f1(e.from) + ' → <b>' + f1(e.to) + '</b>') + ' <small>mg/L</small></span><span class="lw">' + esc(e.why) + '</span><span class="lm">' + (m[e.mode] || '') + '</span></li>').join('') + '</ol>' +
        '<p class="foot">Kept on this device. The 40 most recent changes are shown.</p></section>';
    },
    plant() {
      return '<form id="cfg" novalidate><section class="blk"><h2>Plant</h2><label class="frow"><span>Name shown in the header</span><input id="c-name" type="text" maxlength="40" value="' + esc(state.cfg.name) + '"></label></section>' +
        FIELDS.map((g) => '<section class="blk"><h2>' + g[0] + '</h2>' + g[1].map((f) => '<label class="frow" data-k="' + f[0] + '"><span>' + f[1] + '</span><span class="fin"><input id="c-' + f[0] + '" type="text" inputmode="decimal" value="' + state.cfg[f[0]] + '">' + (f[2] ? '<small>' + f[2] + '</small>' : '') + '</span><em class="msg" hidden></em></label>').join('') + '</section>').join('') +
        '<section class="blk"><h2>Data source</h2>' + row('Plant feed', '<b>Demo feed</b>') + row('Control-system link (OPC UA, Modbus)', 'Not in this build') +
        '<p class="foot">Readings are simulated: one day of flow, pH and ammonia plays every 6 minutes. The setpoint is shown here only. Nothing is sent to a pump.</p></section>' +
        '<section class="blk"><h2>Model</h2><p class="foot">Chlorination kinetics from Dodd et al. 2005. The strength of each chlorination product against bacteria is a placeholder until it is measured, so treat the activity figure as provisional. Research tool. Not for compliance decisions.</p></section>' +
        '<div class="actions"><button type="submit" class="primary">Save</button><button type="button" id="defaults">Restore defaults</button><span id="saved" role="status"></span></div></form>';
    },
    why() {
      return '<a class="backl" href="#now">Back</a><section class="blk"><h2>Operating map</h2><p class="foot">Blue settings meet both limits. The marker is the dose and contact time running now. Tap any cell to read it.</p><div id="map" class="chart"></div><p class="mapread" id="mapread" aria-live="polite"></p></section>' +
        '<section class="blk"><h2>If an assumption is wrong</h2><div id="checks"><p class="empty">Working.</p></div></section>' +
        '<section class="blk"><h2>Through the basin</h2><div id="tc" class="chart"></div></section>';
    },
  };
  const AFTER = {
    now() {
      app.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { state.mode = b.dataset.mode; save(); draw(); if (state.mode === 'auto') tick(); }));
      if ($('apply')) $('apply').addEventListener('click', () => { if (state.rec == null) return; setDose(state.rec, 'Applied by operator', state.read); state.cell = RISOPT.evaluate(state.inp, state.applied, state.t); draw(); });
    },
    plant() {
      const form = $('cfg');
      form.addEventListener('submit', (e) => {
        e.preventDefault(); let ok = true; const next = Object.assign({}, state.cfg);
        FIELDS.forEach((g) => g[1].forEach((f) => {
          const el = $('c-' + f[0]), rowEl = el.closest('.frow'), msg = rowEl.querySelector('.msg'), m = el.value.replace(',', '.').match(/-?(?:\d+\.?\d*|\.\d+)/), v = m ? Number(m[0]) : NaN;
          const bad = !m ? 'Enter a number.' : v < f[3] || v > f[4] ? 'Enter ' + f[3] + ' to ' + f[4] + '.' : '';
          msg.textContent = bad; msg.hidden = !bad; rowEl.classList.toggle('bad', !!bad); if (bad) { if (ok) el.focus(); ok = false; } else next[f[0]] = v;
        }));
        if (ok && next.doseMax <= next.doseMin) { ok = false; const r = $('c-doseMax').closest('.frow'), ms = r.querySelector('.msg'); ms.textContent = 'Must be above the lowest dose.'; ms.hidden = false; r.classList.add('bad'); $('c-doseMax').focus(); }
        if (!ok) { $('saved').textContent = ''; return; }
        next.name = $('c-name').value.trim().slice(0, 40) || DEFAULTS.name; state.cfg = next; save(); head(); $('saved').textContent = 'Saved'; setTimeout(() => { if ($('saved')) $('saved').textContent = ''; }, 2000); tick();
      });
      $('defaults').addEventListener('click', () => { state.cfg = Object.assign({}, DEFAULTS); save(); head(); draw(); tick(); });
    },
    why() {
      if (!state.cell) { location.hash = 'now'; return; }
      const inp = Object.assign({}, state.inp, { doseRange: [state.cfg.doseMin, state.cfg.doseMax], nDose: 36, timeRange: [60, 180], nTime: 25, maxContact_min: 180 });
      const say = (c) => { $('mapread').innerHTML = '<b>' + f1(c.dose) + ' mg/L · ' + int(c.t) + ' min.</b> ' + (c.pass ? 'Meets both limits.' : c.passCT ? 'Activity over the limit.' : 'CT short.') + ' CT ' + int(c.ct) + ' mg·min/L, activity ' + sig(c.activity_ugL) + ' µg/L.'; };
      RISOPT.runGrid(inp).then((g) => { if (route() !== 'why') return; RISCHART.operatingMap($('map'), g, { selected: state.cell, onSelect: say }); say(state.cell); }).catch(() => { $('map').innerHTML = '<p class="empty">Could not draw the map.</p>'; });
      try {
        const list = RISOPT.sensitivity(state.inp, state.cell);
        $('checks').innerHTML = list.map((s) => row(esc(s.label.replace('Products', 'Products are')), '<b class="' + (s.pass ? 'okt' : 'badt') + '">' + (s.pass ? 'Still meets limits' : 'Fails') + '</b>')).join('');
        const raw = RISOPT.timecourse(state.inp, state.applied, state.t), pot = state.inp.potency, x = (a, k) => a.map((v) => v * k);
        RISCHART.timecourse($('tc'), Object.assign({}, raw, { ncl: x(raw.ncl, pot.NCL), p1: x(raw.p1, pot.P1), p2: x(raw.p2, pot.P2) }), { limit_ugL: state.inp.activityLimit_ugL });
      } catch (e) { $('checks').innerHTML = '<p class="empty">Could not run the checks.</p>'; }
    },
  };

  // ------------------------------------------------------------------ shell
  const route = () => { const r = (location.hash || '').replace('#', ''); return SCREENS[r] ? r : 'now'; };
  function head() { $('pname').textContent = state.cfg.name; }
  function draw() {
    const r = route(), y = window.scrollY, same = app.dataset.r === r;
    try { app.innerHTML = SCREENS[r](); app.dataset.r = r; if (AFTER[r]) AFTER[r](); }
    catch (e) { if (window.console) console.warn(e); app.innerHTML = '<section class="stat alarm"><b>This screen could not be shown</b><span>Your plant settings are saved. Open another tab and come back.</span></section>'; }
    document.querySelectorAll('.tabs a').forEach((a) => { const on = a.getAttribute('href') === '#' + (r === 'why' ? 'now' : r); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    window.scrollTo(0, same ? y : 0);
  }
  window.addEventListener('hashchange', draw);
  load(); head(); draw(); tick(); setInterval(tick, 6000);
})();
