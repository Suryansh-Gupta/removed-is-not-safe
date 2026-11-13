// Chlorination Optimizer, app form: one question per screen.
// Home (sign in) -> choose a task -> water -> limits -> result -> optional detail screens.
// Uses the same engine (RISOPT) and charts (RISCHART) as the full workbench page.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id), app = $('app');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, k) => RISOPT.fmt(v, k);
  const plain = (v) => String(Number(Number(v).toPrecision(6)));
  const KEY = 'ris-optimizer-app-v1';

  const ICON = {
    ok: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4L16 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5L18.5 17h-17z" fill="currentColor"/><path d="M10 8v4.5M10 14.4v.6" stroke="var(--bg)" stroke-width="1.8" stroke-linecap="round"/></svg>',
    off: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    go: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 3.5L12 9l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    find: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="14" cy="14" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 1.5v5M14 21.5v5M1.5 14h5M21.5 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    check: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="4.5" y="3.5" width="19" height="21" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 14.5l3.4 3.4L19 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bench: '<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M11 3.5h6M12 3.5v8L5.5 22a1.8 1.8 0 001.6 2.7h13.8A1.8 1.8 0 0022.5 22L16 11.500v-8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 18.500h11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4L6.5 10l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  // The disinfection train as one line drawing: effluent, dose point, baffled contact basin, dechlorination, outfall.
  const TRAIN = '<svg class="trainline" viewBox="0 0 320 64" role="img" aria-label="Disinfection train: chlorine dose, contact basin, dechlorination, outfall">' +
    '<path class="pipe" d="M10 32H96M224 32H296"/><path class="ln" d="M10 20c-6 4 6 8 0 12s6 8 0 12"/>' +
    '<circle class="bub" cx="58" cy="32" r="13"/><path class="ln" d="M58 19V8"/>' +
    '<rect class="tank" x="96" y="12" width="128" height="40"/><path class="flowp" d="M96 32H108V20H128V44H148V20H168V44H188V20H208V32H224"/>' +
    '<path class="ln" d="M118 12V38M138 52V26M158 12V38M178 52V26M198 12V38"/>' +
    '<circle class="bub" cx="258" cy="32" r="13"/><path class="ln" d="M258 19V8"/><path class="arr" d="M296 25l12 7-12 7z"/></svg>';

  // ------------------------------------------------------------------ state
  const state = { last: null, user: null, task: 'find', inputs: RISOPT.withPreset('secondary'), permit: 'secondary', check: { dose: 8, t: 60 }, grid: null, sel: null };
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ last: state.last, user: state.user, task: state.task, inputs: state.inputs, permit: state.permit, check: state.check })); } catch (e) { /* private window */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!s) return;
      if (s.user && typeof s.user.name === 'string') state.user = { name: s.user.name.slice(0, 60), site: String(s.user.site || '').slice(0, 80) };
      if (s.inputs) state.inputs = RISOPT.normalize(s.inputs);
      if (['find', 'check', 'bench'].includes(s.task)) state.task = s.task;
      if (typeof s.permit === 'string') state.permit = s.permit;
      if (s.last && typeof s.last.h === 'string' && typeof s.last.p === 'string') state.last = { h: s.last.h.slice(0, 80), p: s.last.p.slice(0, 120) };
      if (s.check && isFinite(s.check.dose) && isFinite(s.check.t)) state.check = { dose: +s.check.dose, t: +s.check.t };
    } catch (e) { /* ignore bad saved state */ }
  }

  // ------------------------------------------------------------------ small builders
  const FIELDS = {
    pH: { label: 'pH', unit: '', min: 6, max: 9, step: 0.1, get: () => state.inputs.pH, set: (v) => { state.inputs.pH = v; } },
    nh3: { label: 'Ammonia', unit: 'mg N/L', min: 0, max: 10, step: 0.1, get: () => state.inputs.NH3_mgN_L, set: (v) => { state.inputs.NH3_mgN_L = v; } },
    cipro: { label: 'Ciprofloxacin coming in', unit: 'µg/L', min: 0.001, max: 100000, step: 0.1, get: () => state.inputs.cipro_ugL, set: (v) => { state.inputs.cipro_ugL = v; } },
    ct: { label: 'CT target', unit: 'mg·min/L', min: 0, max: 5000, step: 10, get: () => state.inputs.ctTarget, set: (v) => { state.inputs.ctTarget = v; } },
    limit: { label: 'Activity limit', unit: 'µg/L', min: 0.0001, max: 100000, step: 0.01, hint: 'Antibacterial strength allowed at the outfall, as µg/L of ciprofloxacin.', get: () => state.inputs.activityLimit_ugL, set: (v) => { state.inputs.activityLimit_ugL = v; } },
    maxt: { label: 'Longest contact time your basin gives', unit: 'min', min: 5, max: 480, step: 5, get: () => state.inputs.maxContact_min, set: (v) => { state.inputs.maxContact_min = v; state.inputs.timeRange = [Math.min(state.inputs.timeRange[0], v), v]; } },
    dose: { label: 'Chlorine dose', unit: 'mg/L as Cl₂', min: 0.1, max: 100, step: 0.5, get: () => state.check.dose, set: (v) => { state.check.dose = v; } },
    time: { label: 'Contact time', unit: 'min', min: 1, max: 480, step: 5, get: () => state.check.t, set: (v) => { state.check.t = v; } },
    pNcl: { label: 'N-chloro-cipro', unit: '× cipro', min: 0, max: 100, step: 0.05, get: () => state.inputs.potency.NCL, set: (v) => { state.inputs.potency.NCL = v; } },
    pA: { label: 'Product A', unit: '× cipro', min: 0, max: 100, step: 0.05, get: () => state.inputs.potency.P1, set: (v) => { state.inputs.potency.P1 = v; } },
    pB: { label: 'Product B', unit: '× cipro', min: 0, max: 100, step: 0.01, get: () => state.inputs.potency.P2, set: (v) => { state.inputs.potency.P2 = v; } },
    decay: { label: 'Chlorine decay rate', unit: '1/h', min: 0, max: 20, step: 0.1, get: () => state.inputs.k_demand_per_h, set: (v) => { state.inputs.k_demand_per_h = v; } },
    krev: { label: 'Bisulfite reversal speed', unit: '1/s', min: 0, max: 1, step: 0.001, hint: 'Unknown until measured. 0 means bisulfite does not turn products back into ciprofloxacin.', get: () => state.inputs.k_rev, set: (v) => { state.inputs.k_rev = v; } },
  };
  function field(key) {
    const f = FIELDS[key];
    return '<div class="fld" data-f="' + key + '"><label for="f-' + key + '">' + f.label + '</label>' +
      '<div class="ctl"><button type="button" class="stp" data-d="-1" aria-label="Lower ' + esc(f.label) + '">−</button>' +
      '<input id="f-' + key + '" type="text" inputmode="decimal" autocomplete="off" value="' + plain(f.get()) + '">' +
      (f.unit ? '<span class="un">' + f.unit + '</span>' : '') +
      '<button type="button" class="stp" data-d="1" aria-label="Raise ' + esc(f.label) + '">+</button></div>' +
      (f.hint ? '<p class="hint">' + f.hint + '</p>' : '') + '<p class="msg" hidden></p></div>';
  }
  function readFields(root) {          // returns true when every field on the screen is valid; writes values into state
    let ok = true;
    root.querySelectorAll('.fld').forEach((el) => {
      const f = FIELDS[el.dataset.f], inp = el.querySelector('input'), msg = el.querySelector('.msg');
      const m = inp.value.replace(',', '.').match(/-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/i), v = m ? Number(m[0]) : NaN;
      const bad = !m || !isFinite(v) ? 'Enter a number.' : v < f.min || v > f.max ? 'Enter a value from ' + plain(f.min) + ' to ' + plain(f.max) + '.' : '';
      msg.textContent = bad; msg.hidden = !bad; el.classList.toggle('bad', !!bad);
      if (bad) { if (ok) inp.focus(); ok = false; } else { f.set(v); inp.value = plain(v); }
    });
    return ok;
  }
  function bindFields(root) {
    root.querySelectorAll('.fld').forEach((el) => {
      const f = FIELDS[el.dataset.f], inp = el.querySelector('input');
      el.querySelectorAll('.stp').forEach((b) => b.addEventListener('click', () => {
        const cur = Number(inp.value.replace(',', '.')), base = isFinite(cur) ? cur : f.get();
        const next = Math.min(f.max, Math.max(f.min, base + Number(b.dataset.d) * f.step));
        inp.value = plain(Number(next.toFixed(6))); el.classList.remove('bad'); el.querySelector('.msg').hidden = true;
      }));
    });
  }
  const statusOf = (c) => {
    const inp = state.grid ? state.grid.inputs : RISOPT.normalize(state.inputs);
    if (c.pass) return { cls: 'ok', icon: ICON.ok, text: 'Meets both limits' };
    if (c.passCT) return { cls: 'warn', icon: ICON.warn, text: 'Activity ' + ratio(c.activity_ugL / inp.activityLimit_ugL) + ' over the limit' };
    if (c.ctMet) return { cls: 'off', icon: ICON.off, text: 'Contact time outside the allowed range' };
    return { cls: 'off', icon: ICON.off, text: 'Not enough disinfection (CT short)' };
  };
  const ratio = (r) => (r >= 10 ? Math.round(r) : r.toFixed(1)) + '×';
  const rows = (list) => '<dl class="rows">' + list.map((r) => '<div><dt>' + r[0] + '</dt><dd><b' + (r[3] ? ' class="over"' : '') + '>' + r[1] + '</b> <span class="un">' + r[2] + '</span></dd></div>').join('') + '</dl>';
  const cellRows = (c) => {
    const inp = state.grid.inputs;
    return rows([['CT', fmt(c.ct, 'ct'), 'mg·min/L · target ' + plain(inp.ctTarget), c.ct < inp.ctTarget],
      ['Chlorine residual', fmt(c.residual, 'mgL'), 'mg/L'],
      ['Activity at outfall', fmt(c.activity_ugL, 'ugL'), 'µg/L · limit ' + plain(inp.activityLimit_ugL), !c.passActivity],
      ['Bisulfite to dechlorinate', fmt(c.bisulfite_mgL, 'mgL'), 'mg/L NaHSO₃']]);
  };
  function gauges(c) {
    const inp = state.grid.inputs;
    const g = (label, val, lim, unit, higherIsBetter, text) => {
      const r = lim > 0 ? val / lim : 0, w = Math.max(3, Math.min(100, r * 66.7)), ok = higherIsBetter ? val >= lim : val <= lim;
      return '<div class="gauge ' + (ok ? 'ok' : 'warn') + '"><div class="gh"><span>' + label + '</span><b>' + text + ' <span class="un">' + unit + '</span></b></div>' +
        '<div class="track"><i style="width:' + w.toFixed(1) + '%"></i><em></em></div><p class="gl">' + (higherIsBetter ? 'Target ' : 'Limit ') + plain(lim) + (ok ? '' : higherIsBetter ? ' not reached' : ' exceeded') + '</p></div>';
    };
    return '<div class="gauges">' + g('Disinfection (CT)', c.ct, inp.ctTarget, 'mg·min/L', true, fmt(c.ct, 'ct')) +
      g('Activity at outfall', c.activity_ugL, inp.activityLimit_ugL, 'µg/L', false, fmt(c.activity_ugL, 'ugL')) + '</div>';
  }
  const focusCell = () => (state.task === 'check' ? RISOPT.evaluate(state.grid.inputs, state.check.dose, state.check.t) : state.grid.recommended || closest());
  function closest() {
    const cells = [].concat.apply([], state.grid.cells), ok = cells.filter((c) => c.passCT);
    return ok.length ? ok.reduce((a, c) => (c.activity_ugL < a.activity_ugL ? c : a)) : cells.reduce((a, c) => (c.ct > a.ct ? c : a));
  }

  // ------------------------------------------------------------------ screens
  // Each screen returns { title, back, body, foot, after(root) }. One question or one answer per screen.
  const steps = () => (state.task === 'check' ? ['water', 'limits', 'setting'] : ['water', 'limits']);
  const stepBar = (name) => { const s = steps(), i = s.indexOf(name); return '<div class="stepbar" role="img" aria-label="Step ' + (i + 1) + ' of ' + s.length + '">' + s.map((x, k) => '<i class="' + (k <= i ? 'on' : '') + '"></i>').join('') + '</div>'; };

  const SCREENS = {
    home() {
      const u = state.user;
      return {
        bare: true,
        body: '<div class="hero">' + TRAIN + '<h1>Chlorination Optimizer</h1>' +
          '<p class="lede">Find the lowest chlorine dose that disinfects your effluent and leaves no antibacterial activity behind.</p></div>' +
          (u ? '<p class="hello">Signed in as <b>' + esc(u.name) + '</b>' + (u.site ? ', ' + esc(u.site) : '') + '</p>'
             : '<form id="signin" novalidate><div class="txtf"><label for="u-name">Your name</label><input id="u-name" type="text" autocomplete="name" maxlength="60"></div>' +
               '<div class="txtf"><label for="u-site">Facility or lab <span class="opt">optional</span></label><input id="u-site" type="text" autocomplete="organization" maxlength="80"></div>' +
               '<p class="msg" id="u-msg" hidden>Enter your name to continue.</p></form>'),
        foot: (u ? '<button class="primary" data-go="menu">Continue</button><button class="link" id="signout">Sign out</button>'
                 : '<button class="primary" id="signin-go">Sign in</button><p class="fine">Saved on this device only. No password, no account.</p>'),
        after(root) {
          const go = () => { const n = $('u-name').value.trim(); if (!n) { $('u-msg').hidden = false; $('u-name').focus(); return; } state.user = { name: n, site: $('u-site').value.trim() }; save(); nav('menu'); };
          if ($('signin-go')) { $('signin-go').addEventListener('click', go); $('signin').addEventListener('submit', (e) => { e.preventDefault(); go(); }); }
          if ($('signout')) $('signout').addEventListener('click', () => { state.user = null; save(); render(); });
        },
      };
    },
    menu() {
      const opt = (task, h, p) => '<button class="opt-row lead" data-task="' + task + '"><span class="ic">' + ICON[task] + '</span><span><b>' + h + '</b><span>' + p + '</span></span>' + ICON.go + '</button>';
      return {
        title: 'What do you want to do?', back: 'home',
        body: (state.last ? '<button class="resume" data-go="result"><span><span class="kicker">Your last result</span><b>' + esc(state.last.h) + '</b><span>' + esc(state.last.p) + '</span></span>' + ICON.go + '</button>' : '') +
          '<div class="opts">' +
          opt('find', 'Find a setpoint', 'Get the lowest dose and contact time that meet your limits.') +
          opt('check', 'Check a setting I already run', 'Enter your dose and contact time and see if it passes.') +
          opt('bench', 'Plan a bench test', 'Set up a lab-scale run and record the prediction first.') + '</div>',
        after(root) {
          root.querySelectorAll('.opt-row').forEach((b) => b.addEventListener('click', () => {
            const t = b.dataset.task, wasBench = state.permit === 'bench';
            state.task = t;
            if (t === 'bench') { state.inputs = RISOPT.withPreset('bench'); state.permit = 'bench'; } else if (wasBench) { state.inputs = RISOPT.withPreset('secondary'); state.permit = 'secondary'; }
            state.grid = null; state.sel = null; state.last = null; save(); nav('water');
          }));
        },
      };
    },
    water() {
      return { title: 'Your water', back: 'menu', body: stepBar('water') + field('pH') + field('nh3') + field('cipro'), foot: '<button class="primary" id="next">Next</button>',
        after(root) { bindFields(root); $('next').addEventListener('click', () => { if (readFields(root)) { save(); nav('limits'); } }); } };
    },
    limits() {
      const bench = state.task === 'bench', p = state.permit;
      const seg = bench ? '' : '<div class="seg" role="radiogroup" aria-label="Permit type">' +
        [['secondary', 'Discharge'], ['title22', 'Title 22 reuse'], ['custom', 'Custom']].map((o) => '<button type="button" role="radio" aria-checked="' + (p === o[0]) + '" data-p="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>' +
        '<p class="hint" id="permit-note">' + permitNote(p) + '</p>';
      return { title: 'Your limits', back: 'water', body: stepBar('limits') + seg + field('ct') + field('limit') + field('maxt') + '<button class="link" data-go="assume">Model assumptions</button>',
        foot: '<button class="primary" id="next">' + (state.task === 'check' ? 'Next' : 'Find setpoint') + '</button>',
        after(root) {
          bindFields(root); prewarm();
          root.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
            readFields(root); state.permit = b.dataset.p;
            if (state.permit !== 'custom') { const pr = RISOPT.withPreset(state.permit), keep = state.inputs; state.inputs = Object.assign(pr, { pH: keep.pH, NH3_mgN_L: keep.NH3_mgN_L, cipro_ugL: keep.cipro_ugL, potency: keep.potency, k_demand_per_h: keep.k_demand_per_h, k_rev: keep.k_rev }); }
            else state.inputs.minContact_min = 0;
            save(); render();
          }));
          $('next').addEventListener('click', () => { if (readFields(root)) { state.grid = null; save(); nav(state.task === 'check' ? 'setting' : 'result'); } });
        } };
    },
    setting() {
      return { title: 'The setting you run', back: 'limits', body: stepBar('setting') + field('dose') + field('time'), foot: '<button class="primary" id="next">Check it</button>',
        after(root) { bindFields(root); prewarm(); $('next').addEventListener('click', () => { if (readFields(root)) { state.grid = null; save(); nav('result'); } }); } };
    },
    assume() {
      return { title: 'Model assumptions', back: 'limits',
        body: '<p class="note warnnote">Product strengths are placeholders until the bioassay measures them.</p><h2>How strongly each product inhibits bacteria</h2>' + field('pNcl') + field('pA') + field('pB') +
          '<h2>Plant</h2>' + field('decay') + field('krev'),
        foot: '<button class="primary" id="next">Done</button>',
        after(root) { bindFields(root); $('next').addEventListener('click', () => { if (readFields(root)) { state.grid = null; save(); nav('limits'); } }); } };
    },
    result() {
      const backTo = state.task === 'check' ? 'setting' : 'limits';
      if (!state.grid) state.grid = cachedGrid(RISOPT.normalize(state.inputs));
      const g = state.grid;
      if (!g) return { title: 'Working it out', back: backTo, body: '<div class="busy"><div class="bar"><i id="bar"></i></div><p>Running the chemistry model over every dose and contact time.</p></div>', after() { compute(); } };
      const more = (to, h, p) => '<button class="opt-row slim" data-go="' + to + '"><span><b>' + h + '</b><span>' + p + '</span></span>' + ICON.go + '</button>';
      const inp = g.inputs, r = g.recommended, d = g.drugOnly;
      let top, links = '';
      if (state.task === 'check') {
        const c = focusCell(), s = statusOf(c);
        top = '<p class="kicker">Your setting</p><p class="set"><span>' + fmt(c.dose, 'dose') + '<small>mg/L</small></span><span>' + fmt(c.t, 'time') + '<small>min</small></span></p>' +
          '<p class="verdict ' + s.cls + '">' + s.icon + '<span>' + s.text + '</span></p>' + gauges(c) +
          (r && (r.dose < c.dose - 1e-9 || !c.pass) ? '<p class="note">' + (c.pass ? 'A lower dose also passes: ' : 'A setting that passes: ') + '<b>' + fmt(r.dose, 'dose') + ' mg/L for ' + fmt(r.t, 'time') + ' min</b>.</p>' : '') +
          (!r ? '<p class="note">No setting in the searched range meets both limits.</p>' : '');
      } else if (r) {
        const m = (inp.activityLimit_ugL - r.activity_ugL) / inp.activityLimit_ugL * 100, sens = RISOPT.sensitivity(inp, r), held = sens.filter((x) => x.pass).length;
        top = '<p class="kicker">Recommended setpoint</p><p class="set"><span>' + fmt(r.dose, 'dose') + '<small>mg/L chlorine</small></span><span>' + fmt(r.t, 'time') + '<small>min contact</small></span></p>' +
          '<p class="verdict ok">' + ICON.ok + '<span>Lowest dose that meets both limits</span></p>' +
          gauges(r) + '<p class="note">Holds in ' + held + ' of ' + sens.length + ' what-if checks.</p>';
      } else {
        const c = closest();
        top = '<p class="kicker">No setpoint found</p><p class="verdict warn">' + ICON.warn + '<span>No setting in range meets both limits</span></p>' +
          '<p class="note">Closest: <b>' + fmt(c.dose, 'dose') + ' mg/L for ' + fmt(c.t, 'time') + ' min</b>, with activity ' + ratio(c.activity_ugL / inp.activityLimit_ugL) + ' the limit. Searched up to ' + plain(g.doses[g.doses.length - 1]) + ' mg/L and ' + plain(g.times[g.times.length - 1]) + ' min.</p>' + gauges(c);
      }
      { const c = focusCell(), st = statusOf(c);
        state.last = { h: fmt(c.dose, 'dose') + ' mg/L for ' + fmt(c.t, 'time') + ' min', p: (state.task === 'check' ? 'Your setting. ' : state.task === 'bench' ? 'Bench test. ' : '') + st.text }; save(); }
      links += more('plant', 'Through the plant', 'Values at each stage, and how activity falls.');
      links += more('map', 'Operating map', 'Every dose and contact time, pass or fail.');
      if (state.task !== 'check' && d) links += more('compare', 'If you only checked the drug', 'What a parent-drug-only plan would pick.');
      if (r || state.task === 'check') links += more('sure', 'How sure is this?', 'The same setting under other assumptions.');
      if (state.task === 'bench' && r) links += more('command', 'Record the prediction', 'Blind-test command for the lab notebook.');
      return { title: 'Result', back: backTo, body: '<div class="answer">' + top + '</div><div class="opts">' + links + '</div>', foot: '<button class="secondary" data-go="menu">Done</button>' };
    },
    plant() {
      const c = focusCell(), inp = state.grid.inputs, s = statusOf(c);
      const stn = (name, val, unit, sub) => '<li><span class="dot"></span><div><p class="eq">' + name + '</p><p class="v">' + val + ' <span class="un">' + unit + '</span></p>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div></li>';
      return { title: 'Through the plant', back: 'result',
        body: '<ol class="stations">' +
          stn('Secondary effluent', 'pH ' + plain(inp.pH), '', plain(inp.cipro_ugL) + ' µg/L ciprofloxacin, ' + plain(inp.NH3_mgN_L) + ' mg N/L ammonia') +
          stn('Hypochlorite dose', fmt(c.dose, 'dose'), 'mg/L as Cl₂') +
          stn('Chlorine contact basin', fmt(c.t, 'time'), 'min', 'CT ' + fmt(c.ct, 'ct') + ' mg·min/L, target ' + plain(inp.ctTarget)) +
          stn('Dechlorination', fmt(c.bisulfite_mgL, 'mgL'), 'mg/L NaHSO₃', 'Removes ' + fmt(c.residual, 'mgL') + ' mg/L chlorine residual') +
          stn('Outfall', fmt(c.activity_ugL, 'ugL'), 'µg/L activity', '<span class="st ' + s.cls + '">' + s.text + '</span>') + '</ol>' +
          '<h2>Activity through the basin</h2><div id="tc" class="chart"></div>',
        after() {
          const raw = RISOPT.timecourse(inp, c.dose, c.t), pot = inp.potency, x = (a, k) => a.map((v) => v * k);
          RISCHART.timecourse($('tc'), Object.assign({}, raw, { ncl: x(raw.ncl, pot.NCL), p1: x(raw.p1, pot.P1), p2: x(raw.p2, pot.P2) }), { limit_ugL: inp.activityLimit_ugL });
        } };
    },
    map() {
      return { title: 'Operating map', back: 'result', body: '<p class="note">Blue settings meet both limits. Tap any cell to read it.</p><div id="mapc" class="chart"></div><div id="mapread" class="mapread" aria-live="polite"></div>',
        after() {
          const show = (c) => { const s = statusOf(c); $('mapread').innerHTML = '<p class="set small"><span>' + fmt(c.dose, 'dose') + '<small>mg/L</small></span><span>' + fmt(c.t, 'time') + '<small>min</small></span></p><p class="verdict ' + s.cls + '">' + s.icon + '<span>' + s.text + '</span></p>'; };
          const c0 = focusCell();
          RISCHART.operatingMap($('mapc'), state.grid, { selected: state.task === 'check' ? c0 : null, onSelect: show });
          show(c0);
        } };
    },
    compare() {
      const g = state.grid, r = g.recommended, d = g.drugOnly, inp = g.inputs;
      const col = (h, c) => '<div><p class="eq">' + h + '</p>' + (c ? '<p class="set small"><span>' + fmt(c.dose, 'dose') + '<small>mg/L</small></span><span>' + fmt(c.t, 'time') + '<small>min</small></span></p><p class="st ' + statusOf(c).cls + '">' + statusOf(c).text + '</p>' +
        rows([['Parent drug left', fmt(c.cipro_ugL, 'ugL'), 'µg/L'], ['Activity', fmt(c.activity_ugL, 'ugL'), 'µg/L', !c.passActivity]]) : '<p class="note">No setting passes.</p>') + '</div>';
      const same = r && d && r.dose === d.dose && r.t === d.t;
      return { title: 'If you only checked the drug', back: 'result',
        body: '<div class="two">' + col('Checks the parent drug only', d) + col('Checks activity too', r) + '</div>' +
          '<p class="note">' + (same ? 'Both plans pick the same setting here.' : d && !d.passActivity ? 'The parent drug reads as removed, but its chlorination products still inhibit bacteria. Limit: ' + plain(inp.activityLimit_ugL) + ' µg/L.' : 'Both settings stay within the activity limit.') + '</p>' };
    },
    sure() {
      const c = focusCell(), inp = state.grid.inputs, list = [{ label: 'As set', pass: c.pass, activity_ugL: c.activity_ugL }].concat(RISOPT.sensitivity(inp, c));
      return { title: 'How sure is this?', back: 'result',
        body: '<p class="note">The same setting, ' + fmt(c.dose, 'dose') + ' mg/L for ' + fmt(c.t, 'time') + ' min, if an assumption is wrong.</p><ul class="checks">' +
          list.map((s) => '<li class="' + (s.pass ? 'ok' : 'warn') + '">' + (s.pass ? ICON.ok : ICON.warn) + '<span>' + esc(s.label.replace('Products', 'Products are')) + '</span><b>' + (s.pass ? 'Pass' : 'Fail') + '</b></li>').join('') + '</ul>' };
    },
    command() {
      const c = focusCell(), cmd = RISOPT.lockCommand(state.grid.inputs, c);
      return { title: 'Record the prediction', back: 'result', body: '<p class="note">Run this in the project folder before the lab run. It saves the prediction with a timestamp, so the test is blind.</p><pre id="cmd" tabindex="0">' + esc(cmd) + '</pre>',
        foot: '<button class="primary" id="copy">Copy command</button>',
        after() { $('copy').addEventListener('click', () => { const done = (t) => { $('copy').textContent = t; setTimeout(() => { if ($('copy')) $('copy').textContent = 'Copy command'; }, 2000); };
          const sel = () => { const r = document.createRange(); r.selectNodeContents($('cmd')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected. Press Ctrl+C'); };
          try { navigator.clipboard.writeText(cmd).then(() => done('Copied'), sel); } catch (e) { sel(); } }); } };
    },
  };
  function permitNote(p) {
    return p === 'title22' ? 'California Title 22 recycled water: CT of at least 450 mg·min/L with at least 90 min of contact.'
      : p === 'secondary' ? 'An example site-specific CT for discharge. Use the value in your permit.' : 'Enter your own limits below.';
  }

  // ------------------------------------------------------------------ run + routing
  let runId = 0, warmT = 0;
  function prewarm() { clearTimeout(warmT); warmT = setTimeout(() => { try { RISOPT.runGrid(RISOPT.normalize(state.inputs)).catch(() => {}); } catch (e) { /* ignore */ } }, 60); }
  const GKEY = KEY + '-grid';
  function cachedGrid(inp) {
    try { const c = JSON.parse(sessionStorage.getItem(GKEY) || 'null'); if (c && c.k === JSON.stringify(inp) && c.g && c.g.cells) return c.g; } catch (e) { /* no cache */ }
    return null;
  }
  function compute() {
    const id = ++runId, inp = RISOPT.normalize(state.inputs);
    RISOPT.runGrid(inp, { onProgress: (f) => { const b = $('bar'); if (b && id === runId) b.style.transform = 'scaleX(' + f + ')'; } })
      .then((g) => { if (id !== runId) return; state.grid = g; try { sessionStorage.setItem(GKEY, JSON.stringify({ k: JSON.stringify(inp), g: g })); } catch (e) { /* too big or blocked */ } if (current() === 'result') render(); })
      .catch(() => { if (id !== runId) return; app.querySelector('.busy p').textContent = 'Could not run the model. Go back and check the inputs.'; });
  }
  const NEEDS_GRID = ['plant', 'map', 'compare', 'sure', 'command'];
  function current() {
    let s = (location.hash || '').replace('#', '') || 'home';
    if (!SCREENS[s]) s = 'home';
    if (!state.user && s !== 'home') s = 'home';
    if (NEEDS_GRID.includes(s) && !state.grid) state.grid = cachedGrid(RISOPT.normalize(state.inputs));
    if (NEEDS_GRID.includes(s) && !state.grid) s = 'result';
    return s;
  }
  let navAt = 0, dir = 'fwd';
  function nav(to) {                       // ignores a second tap that lands within 350 ms of the first
    const now = Date.now(); if (now - navAt < 350) return; navAt = now;
    const sc = SCREENS[current()] ? SCREENS[current()]() : null; dir = sc && sc.back === to ? 'back' : 'fwd';
    if (location.hash === '#' + to) render(); else location.hash = to;
  }
  function oops() {
    app.className = 'screen s-error';
    app.innerHTML = '<main class="body"><div class="hero"><h1>Something went wrong</h1><p class="lede">The app could not show this screen. Your inputs are saved.</p></div></main>' +
      '<footer class="foot"><button class="primary" id="again">Go to the start</button></footer>';
    $('again').addEventListener('click', () => { state.grid = null; location.hash = 'menu'; render(); });
  }
  function render() { try { draw(); } catch (e) { if (window.console) console.warn(e); oops(); } }
  function draw() {
    const name = current(), sc = SCREENS[name]();
    app.className = 'screen s-' + name + ' ' + dir; dir = 'fwd';
    app.innerHTML = (sc.bare ? '' : '<header class="bar-top">' + (sc.back ? '<button class="backb" data-go="' + sc.back + '" aria-label="Back">' + ICON.back + '</button>' : '<span></span>') + '<h1 tabindex="-1">' + sc.title + '</h1></header>') +
      '<main class="body">' + sc.body + '</main>' + (sc.foot ? '<footer class="foot">' + sc.foot + '</footer>' : '');
    app.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => nav(b.dataset.go)));
    if (sc.after) sc.after(app);
    // Keyboard: Enter moves on, and a focused field scrolls clear of the keyboard and the bottom button.
    app.querySelectorAll('input[type="text"]').forEach((inp) => {
      inp.setAttribute('enterkeyhint', 'next');
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = app.querySelector('.foot .primary'); if (b) b.click(); } });
      inp.addEventListener('focus', () => setTimeout(() => { try { inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* older engines */ } }, 250));
    });
    window.scrollTo(0, 0);
    const h = app.querySelector('.bar-top h1'); if (h) h.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', render);
  window.addEventListener('error', () => { if (!app.querySelector('.body')) oops(); });
  load(); render();
})();
