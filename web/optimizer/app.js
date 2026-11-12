// Chlorination Settings Optimizer: page wiring (owner: UI).
// Reads the inputs, runs RISOPT.runGrid after a short debounce, and renders the answer column,
// the two charts (RISCHART) and the two collapsed sections. No colour is set here; see tokens.css.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const HAVE_ENGINE = typeof RISOPT !== 'undefined' && RISOPT && typeof RISOPT.runGrid === 'function';
  const HAVE_CHARTS = typeof RISCHART !== 'undefined' && RISCHART && typeof RISCHART.operatingMap === 'function';
  const STORE_KEY = 'ris-optimizer-v1';
  const DEBOUNCE_MS = 250;

  // ---------- small helpers ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const ICON = {
    ok: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6L15 14H1z" fill="currentColor"/><path d="M8 6v4.2M8 11.6v1.2" stroke="var(--panel)" stroke-width="1.6"/></svg>',
    off: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>',
  };
  function fmt(v, kind) {
    if (v == null || !isFinite(v)) return '–';
    try { const s = RISOPT.fmt(v, kind); if (typeof s === 'string' && s) return s; } catch (e) { /* fall through */ }
    if (kind === 'time' || kind === 'ct') return String(Math.round(v));
    if (kind === 'dose') return v.toFixed(1);
    return String(Number(v.toPrecision(3)));
  }
  const plain = (v) => String(Number(Number(v).toPrecision(6)));
  function ratioText(r) {
    if (!isFinite(r)) return 'far';
    if (r < 1.095) return Math.max(1, Math.round((r - 1) * 100)) + '%';
    return (r >= 10 ? Math.round(r) : r.toFixed(1)) + '×';
  }
  const sameCell = (a, b) => !!a && !!b && a.iDose === b.iDose && a.iTime === b.iTime;

  // ---------- inputs ----------
  // Ranges are what the page accepts; a value outside them shows a message and is not sent to the model.
  const FIELDS = [
    { id: 'in-ph', path: ['pH'], min: 6, max: 9, range: 'in-ph-range' },
    { id: 'in-nh3', path: ['NH3_mgN_L'], min: 0, max: 10, range: 'in-nh3-range' },
    { id: 'in-cipro', path: ['cipro_ugL'], min: 0.001, max: 100000 },
    { id: 'in-ct', path: ['ctTarget'], min: 1, max: 5000 },
    { id: 'in-limit', path: ['activityLimit_ugL'], min: 0.0001, max: 100000 },
    { id: 'in-maxt', path: ['maxContact_min'], min: 10, max: 480 },
    { id: 'in-pot-ncl', path: ['potency', 'NCL'], min: 0, max: 10 },
    { id: 'in-pot-p1', path: ['potency', 'P1'], min: 0, max: 10 },
    { id: 'in-pot-p2', path: ['potency', 'P2'], min: 0, max: 10 },
    { id: 'in-demand', path: ['k_demand_per_h'], min: 0, max: 10 },
    { id: 'in-after', path: ['after_min'], min: 0, max: 120 },
    { id: 'in-krev', path: ['k_rev'], min: 0, max: 1 },
    { id: 'in-dosemax', path: ['doseRange', 1], min: 2, max: 100 },
  ];
  const getPath = (o, p) => p.reduce((a, k) => (a == null ? a : a[k]), o);
  function setPath(o, p, v) { let a = o; for (let i = 0; i < p.length - 1; i++) a = a[p[i]]; a[p[p.length - 1]] = v; }

  const fieldById = (id) => FIELDS.find((f) => f.id === id);
  const state = { preset: '', inputs: null, sel: null };
  let grid = null, mapChart = null, tcChart = null, timer = 0, runSeq = 0;

  // Engine text uses ASCII units; show the real symbols.
  const pretty = (s) => String(s || '').replace(/mg\*min\/L/g, 'mg·min/L').replace(/\bug\/L/g, 'µg/L').replace(/\bCl2\b/g, 'Cl₂').replace(/ %/g, '%');
  let DEFAULT_PRESET = '';   // id of the preset that equals DEFAULT_INPUTS, if there is one
  function presetById(id) { return (RISOPT.PRESETS || []).find((p) => p.id === id) || null; }
  function inputsFor(presetId) {
    const out = clone(RISOPT.DEFAULT_INPUTS), p = presetById(presetId);
    if (p && p.inputs) merge(out, p.inputs);
    return out;
  }
  function merge(dst, src) {
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && dst[k] && typeof dst[k] === 'object') merge(dst[k], v);
      else dst[k] = Array.isArray(v) ? v.slice() : v;
    }
  }
  // What goes to the engine: the map's time axis ends at the basin limit, so the limit is visible on the map.
  function engineInputs() {
    const inp = clone(state.inputs);
    const t0 = Array.isArray(inp.timeRange) ? inp.timeRange[0] : 5;
    inp.timeRange = [Math.min(t0, inp.maxContact_min / 2), inp.maxContact_min];
    return inp;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ preset: state.preset, inputs: state.inputs })); } catch (e) { /* storage blocked */ }
  }
  function restore() {
    const base = JSON.stringify(inputsFor(''));
    const match = (RISOPT.PRESETS || []).find((p) => JSON.stringify(inputsFor(p.id)) === base);
    DEFAULT_PRESET = match ? match.id : '';
    state.preset = DEFAULT_PRESET; state.inputs = inputsFor(DEFAULT_PRESET);
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!raw || typeof raw !== 'object') return;
      if (typeof raw.preset === 'string' && presetById(raw.preset)) { state.preset = raw.preset; state.inputs = inputsFor(raw.preset); }
      const saved = raw.inputs || {};
      for (const f of FIELDS) {
        const v = getPath(saved, f.path);
        if (typeof v === 'number' && isFinite(v) && v >= f.min && v <= f.max) setPath(state.inputs, f.path, v);
      }
      if (saved.ctBasis === 'residual' || saved.ctBasis === 'integral') state.inputs.ctBasis = saved.ctBasis;
    } catch (e) { /* storage blocked or bad JSON: keep defaults */ }
  }

  function setMsg(f, text) {
    const el = $(f.id), msg = $(f.id + '-msg'), row = el.closest('.f');
    msg.textContent = text || ''; msg.hidden = !text;
    row.classList.toggle('bad', !!text);
    if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    const stale = !!document.querySelector('#inputs .f.bad');     // results on screen are for the last valid inputs
    $('stale-note').hidden = !stale;
    document.querySelector('.answer').classList.toggle('stale', stale);
  }
  // What differs from the chosen scenario: marks the scenario as edited, flags Assumptions, enables Reset.
  function markEdits() {
    const base = inputsFor(state.preset), p = presetById(state.preset);
    const diff = FIELDS.filter((f) => getPath(state.inputs, f.path) !== getPath(base, f.path)).map((f) => f.id);
    const basisDiff = state.inputs.ctBasis !== base.ctBasis;
    const edited = diff.length > 0 || basisDiff;
    for (const o of $('preset').options) {
      const q = presetById(o.value);
      o.textContent = (q ? pretty(q.label) : 'Default') + (edited && o.value === state.preset ? ' (edited)' : '');
    }
    const note = $('preset-note');
    note.textContent = p && p.note && !edited ? pretty(p.note) : '';
    note.hidden = !note.textContent;
    $('assume-chg').hidden = !(basisDiff || diff.some((id) => $('assumptions').contains($(id))));
    $('reset').disabled = !edited && state.preset === DEFAULT_PRESET;
  }
  function fillForm() {
    for (const f of FIELDS) {
      const v = getPath(state.inputs, f.path);
      $(f.id).value = plain(v);
      if (f.range) $(f.range).value = v;
      setMsg(f, '');
    }
    const basis = state.inputs.ctBasis === 'integral' ? 'ctb-integral' : 'ctb-residual';
    $(basis).checked = true;
    $('preset').value = state.preset;
    const minT = state.inputs.minContact_min;
    $('minct-row').hidden = !(minT > 0);
    $('minct').textContent = fmt(minT, 'time');
    markEdits();
  }
  function readField(f) {
    const raw = $(f.id).value.trim().replace(',', '.'), v = Number(raw);   // a decimal comma is fine
    if (raw === '' || !isFinite(v)) { setMsg(f, 'Enter a number.'); return; }
    if (v < f.min || v > f.max) { setMsg(f, 'Enter a value from ' + plain(f.min) + ' to ' + plain(f.max) + '.'); return; }
    setMsg(f, '');
    setPath(state.inputs, f.path, v);
    if (f.range) $(f.range).value = v;
    changed();
  }
  function changed() { markEdits(); save(); schedule(); }

  function bindForm() {
    const sel = $('preset');
    if (DEFAULT_PRESET) sel.textContent = '';   // a preset already is the default, so no separate "Default" entry
    for (const p of RISOPT.PRESETS || []) {
      const o = document.createElement('option'); o.value = p.id; o.textContent = pretty(p.label); sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      state.preset = sel.value; state.inputs = inputsFor(state.preset); state.sel = null;
      fillForm(); save(); schedule(0);
    });
    $('reset').addEventListener('click', () => {
      state.preset = DEFAULT_PRESET; state.inputs = inputsFor(DEFAULT_PRESET); state.sel = null;
      fillForm(); save(); schedule(0);
    });
    for (const f of FIELDS) {
      $(f.id).addEventListener('input', () => readField(f));
      $(f.id).addEventListener('blur', () => { if (!$(f.id + '-msg').hidden) return; $(f.id).value = plain(getPath(state.inputs, f.path)); });
      $(f.id).addEventListener('keydown', (e) => {          // arrow keys step the value, as a number field would
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        const step = Number($(f.id).dataset.step) || 1, cur = Number($(f.id).value.trim().replace(',', '.'));
        if (!isFinite(cur)) return;
        e.preventDefault();
        const next = Math.min(f.max, Math.max(f.min, cur + (e.key === 'ArrowUp' ? step : -step)));
        $(f.id).value = plain(next); readField(f);
      });
      if (f.range) $(f.range).addEventListener('input', () => {
        const v = Number($(f.range).value);
        $(f.id).value = plain(v); setMsg(f, ''); setPath(state.inputs, f.path, v); changed();
      });
    }
    for (const id of ['ctb-residual', 'ctb-integral']) {
      $(id).addEventListener('change', () => { if ($(id).checked) { state.inputs.ctBasis = $(id).value; changed(); } });
    }
    $('inputs').addEventListener('submit', (e) => e.preventDefault());
    $('back').addEventListener('click', (e) => {
      state.sel = null; renderSelection();
      const svg = $('map').querySelector('svg');
      if (e.detail === 0 && svg) svg.focus({ preventScroll: true });   // keyboard: the button is gone, so hand focus to the map
    });
    $('rec').addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href="#sens"]');
      if (!a) return;
      e.preventDefault();
      const sec = $('sens'), calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sec.open = true;
      sec.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      sec.querySelector('summary').focus({ preventScroll: true });
    });
    $('lock-copy').addEventListener('click', () => copyFrom('lock-text', 'lock-st'));
    $('csv-copy').addEventListener('click', () => copyFrom('csv-text', 'csv-st'));
  }

  // ---------- running the grid ----------
  function setProgress(frac) {
    const bar = $('progress');
    bar.classList.add('on');
    bar.firstElementChild.style.transform = 'scaleX(' + Math.max(0.03, Math.min(1, frac || 0)).toFixed(3) + ')';
  }
  function endProgress() { $('progress').classList.remove('on'); }
  function showError(text) {
    const el = $('map-error');
    el.innerHTML = text ? ICON.off + '<span>' + esc(text) + '</span>' : '';
    el.hidden = !text;
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(run, ms == null ? DEBOUNCE_MS : ms); }

  async function run() {
    const seq = ++runSeq;                       // a newer run makes every older one stale
    const inp = engineInputs();
    setProgress(0);
    try {
      const g = await RISOPT.runGrid(inp, { onProgress: (f) => { if (seq === runSeq) setProgress(f); } });
      if (seq !== runSeq) return;
      if (!g || !Array.isArray(g.cells)) throw new Error('empty grid');
      grid = g;
      showError('');
      render();
    } catch (e) {
      if (seq !== runSeq) return;
      showError('The model could not run with these inputs. The last result is still shown.');
      if (window.console) console.warn('optimizer: grid run failed', e);
    } finally {
      if (seq === runSeq) endProgress();
    }
  }

  // ---------- rendering ----------
  function selectedCell() {
    if (!grid || !state.sel) return null;
    const row = grid.cells[state.sel.iDose], c = row && row[state.sel.iTime];
    if (!c || Math.abs(c.dose - state.sel.dose) > 1e-6 || Math.abs(c.t - state.sel.t) > 1e-6) return null;
    return sameCell(c, grid.recommended) ? null : c;
  }
  function onSelect(cell) {
    if (!cell || !grid) return;
    state.sel = sameCell(cell, grid.recommended) ? null : { iDose: cell.iDose, iTime: cell.iTime, dose: cell.dose, t: cell.t };
    renderSelection();
  }

  function row(label, value, unit, sub, over) {
    return '<div><dt>' + label + '</dt><dd><span class="v">' + esc(value) + '</span><span class="u">' + unit + '</span>' +
      (sub ? '<span class="sub' + (over ? ' over' : '') + '">' + esc(sub) + '</span>' : '') + '</dd></div>';
  }
  function readout(c) {
    const inp = grid.inputs;
    return '<dl class="ro">' +
      row('CT', fmt(c.ct, 'ct'), 'mg·min/L', (c.ct >= inp.ctTarget ? 'target ' : 'short of target ') + plain(inp.ctTarget), c.ct < inp.ctTarget) +
      row('Total residual', fmt(c.residual, 'mgL'), 'mg/L') +
      row('Activity', fmt(c.activity_ugL, 'ugL'), 'µg/L CIP-eq', (c.passActivity ? 'limit ' : 'over limit ') + plain(inp.activityLimit_ugL), !c.passActivity) +
      row('Bisulfite to dechlorinate', fmt(c.bisulfite_mgL, 'mgL'), 'mg/L NaHSO₃') +
      '</dl>';
  }
  function statusTag(c) {
    const inp = grid.inputs;
    if (c.pass) return '<p class="tag ok">' + ICON.ok + 'Meets both limits</p>';
    if (c.passCT) return '<p class="tag warn">' + ICON.warn + 'Activity ' + ratioText(c.activity_ugL / inp.activityLimit_ugL) + ' over limit</p>';
    if (c.ct >= inp.ctTarget) return '<p class="tag off">' + ICON.off + 'Contact time outside the allowed range</p>';
    return '<p class="tag off">' + ICON.off + 'CT short' + (c.passActivity ? '' : ', activity over limit') + '</p>';
  }
  function pair(c) {
    return '<p class="pair">' + fmt(c.dose, 'dose') + '<small>mg/L</small><i>·</i>' + fmt(c.t, 'time') + '<small>min</small></p>';
  }

  // When no cell passes: the cell that comes closest. Lowest activity where CT is met; if CT is never met, highest CT.
  function closestCell() {
    const cells = [].concat.apply([], grid.cells), ctOk = cells.filter((c) => c.passCT);
    if (ctOk.length) return ctOk.reduce((a, c) => (c.activity_ugL < a.activity_ugL ? c : a), ctOk[0]);
    return cells.reduce((a, c) => (c.ct > a.ct ? c : a), cells[0]);
  }
  // Says so plainly, names the closest setting, and suggests a change only when the trend along the edge of the
  // map shows it would get there and the input field can take a higher value.
  function advice() {
    const inp = grid.inputs, nT = grid.times.length, nD = grid.doses.length;
    const maxT = grid.times[nT - 1], maxD = grid.doses[nD - 1], best = closestCell();
    const at = fmt(best.dose, 'dose') + ' mg/L · ' + fmt(best.t, 'time') + ' min';
    let out = 'No dose up to ' + fmt(maxD, 'dose') + ' mg/L or contact time up to ' + fmt(maxT, 'time') + ' min meets both limits. ';
    if (inp.minContact_min > maxT) {
      return out + 'This scenario needs at least ' + fmt(inp.minContact_min, 'time') + ' min of contact. Raise the basin contact time to ' + fmt(inp.minContact_min, 'time') + ' min or more.';
    }
    let gapOf;       // distance to the limit that is missed, positive while short of it
    if (best.passCT) {
      const r = best.activity_ugL / inp.activityLimit_ugL;
      out += 'Closest: ' + at + ', activity ' + (r < 1.095 ? ratioText(r) + ' over the limit.' : ratioText(r) + ' the limit.');
      gapOf = (c) => c.activity_ugL - inp.activityLimit_ugL;
    } else {
      out += 'Closest: ' + at + ', CT ' + fmt(best.ct, 'ct') + ' of ' + plain(inp.ctTarget) + ' mg·min/L.';
      gapOf = (c) => inp.ctTarget - c.ct;
    }
    const reach = (prev) => { const step = prev ? gapOf(prev) - gapOf(best) : 0;
      return step > 0 && gapOf(best) / step <= 2 * Math.max(nT, nD); };
    const viaTime = best.iTime === nT - 1 && nT > 1 && maxT < fieldById('in-maxt').max && reach(grid.cells[best.iDose][nT - 2]);
    const viaDose = best.iDose === nD - 1 && nD > 1 && maxD < fieldById('in-dosemax').max && reach(grid.cells[nD - 2][best.iTime]);
    if (viaTime) out += ' A basin contact time above ' + fmt(maxT, 'time') + ' min may get there.';
    else if (viaDose) out += ' A highest dose searched above ' + fmt(maxD, 'dose') + ' mg/L (under Assumptions) may get there.';
    return out;
  }

  // One quiet line under the verdict: how much room there is, and how well the setpoint survives other assumptions.
  function margin(r) {
    const inp = grid.inputs, pct = (1 - r.activity_ugL / inp.activityLimit_ugL) * 100;
    const parts = [(pct < 0.1 ? 'under 0.1' : pct < 10 ? pct.toFixed(1) : String(Math.round(pct))) + '% under the activity limit'];
    try {
      const checks = RISOPT.sensitivity(inp, r) || [];
      if (checks.length) parts.push('<a href="#sens">holds in ' + checks.filter((c) => c.pass).length + ' of ' + checks.length + ' checks</a>');
    } catch (e) { /* the line works without the count */ }
    if (r.iTime === grid.times.length - 1) parts.push('at the basin limit');
    if (r.iDose === grid.doses.length - 1) parts.push('at the top of the dose range');
    return '<p class="quiet">' + parts.join(' · ') + '</p>';
  }

  function renderRecommended() {
    const r = grid.recommended, el = $('rec');
    if (r) {
      el.innerHTML =
        '<div class="setpoint">' +
        '<div><span class="k">Chlorine dose</span><span class="big">' + fmt(r.dose, 'dose') + '<small>mg/L</small></span></div>' +
        '<div><span class="k">Contact time</span><span class="big">' + fmt(r.t, 'time') + '<small>min</small></span></div>' +
        '</div>' +
        '<p class="verdict ok">' + ICON.ok + '<span>Lowest dose that meets the CT target and the activity limit.</span></p>' +
        margin(r) + readout(r);
      $('live').textContent = 'Recommended setpoint: ' + fmt(r.dose, 'dose') + ' mg/L for ' + fmt(r.t, 'time') + ' min.';
    } else {
      el.innerHTML = '<p class="nopass">No setting in range meets both limits</p><p class="advice">' + esc(advice()) + '</p>';
      $('live').textContent = 'No setting in range meets both limits.';
    }
  }

  function renderDrugOnly() {
    const d = grid.drugOnly, r = grid.recommended, inp = grid.inputs, el = $('drug');
    $('drug-sec').hidden = false;
    if (!d) {
      el.innerHTML = '<p class="say">A plan that checks only the parent drug finds no setting in range either.</p>';
      return;
    }
    let h = pair(d);
    if (d.passActivity) {
      h += '<p class="tag ok">' + ICON.ok + 'Activity within limit</p>';
      h += '<p class="say">' + (r && sameCell(d, r)
        ? 'Checking only the parent drug gives the same setpoint here. The products add too little activity to change it.'
        : 'This setting also meets the activity limit. Checking only the parent drug is enough in this case.') + '</p>';
    } else {
      h += '<p class="tag warn">' + ICON.warn + 'Activity ' + ratioText(d.activity_ugL / inp.activityLimit_ugL) + ' over limit</p>';
      h += '<dl class="ro">' +
        row('Parent drug left', fmt(d.cipro_ugL, 'ugL'), 'µg/L', 'limit ' + plain(inp.activityLimit_ugL)) +
        row('Activity', fmt(d.activity_ugL, 'ugL'), 'µg/L CIP-eq', 'over limit ' + plain(inp.activityLimit_ugL), true);
      if (r) {
        const dd = r.dose - d.dose, dt = r.t - d.t, parts = [];
        if (Math.abs(dd) >= 0.05) parts.push((dd > 0 ? '+' : '−') + fmt(Math.abs(dd), 'dose') + '</span><span class="u">mg/L</span><span class="v">');
        if (Math.abs(dt) >= 0.5) parts.push((dt > 0 ? '+' : '−') + fmt(Math.abs(dt), 'time') + '</span><span class="u">min</span><span class="v">');
        if (parts.length) h += '<div><dt>Gap to recommended</dt><dd><span class="v">' + parts.join('&ensp;') + '</span></dd></div>';
      }
      h += '</dl><p class="say">The parent drug reads as removed, but its chlorination products still inhibit bacteria.</p>';
    }
    el.innerHTML = h;
  }

  // Everything that depends on which cell is in focus: map marker, inspect row, timecourse, tables, export.
  function renderSelection() {
    if (!grid) return;
    const sel = selectedCell(), focus = sel || grid.recommended;
    if (!sel) state.sel = null;

    if (HAVE_CHARTS) {
      const opts = { selected: sel, onSelect: onSelect };
      try {
        if (mapChart) mapChart.update(grid, opts); else mapChart = RISCHART.operatingMap($('map'), grid, opts);
      } catch (e) { showError('Could not draw the operating map.'); if (window.console) console.warn(e); }
    }

    $('insp').hidden = !sel; $('back').hidden = !sel; $('insp-hint').hidden = !!sel;
    if (sel) {
      $('insp').innerHTML =
        '<span class="at">' + fmt(sel.dose, 'dose') + '<small>mg/L</small><i>·</i>' + fmt(sel.t, 'time') + '<small>min</small></span>' +
        '<span class="nums"><span>CT<b>' + fmt(sel.ct, 'ct') + '</b><small>mg·min/L</small></span>' +
        '<span>Activity<b>' + fmt(sel.activity_ugL, 'ugL') + '</b><small>µg/L CIP-eq</small></span></span>' + statusTag(sel).replace(/^<p /, '<span ').replace(/<\/p>$/, '</span>');
    }

    // With no passing cell the lower chart shows the closest one, so the page keeps its height.
    renderTimecourse(focus || closestCell(), !focus);
    renderSensitivity(focus);
    renderExport(focus);
  }

  function renderTimecourse(c, isClosest) {
    const box = $('timecourse'), empty = $('tc-empty');
    box.hidden = !c; empty.hidden = !!c;
    $('tc-at').innerHTML = c ? (isClosest ? '<span class="lbl">Closest setting</span>' : '') + fmt(c.dose, 'dose') + ' mg/L · ' + fmt(c.t, 'time') + ' min' : '';
    if (!c) { empty.textContent = 'No setpoint to show.'; return; }
    if (!HAVE_CHARTS) return;
    try {
      // Each species is plotted as its contribution to activity (concentration × potency), so the Activity line is their sum.
      const raw = RISOPT.timecourse(grid.inputs, c.dose, c.t), pot = grid.inputs.potency || {}, opts = { limit_ugL: grid.inputs.activityLimit_ugL };
      const times = (arr, k) => (Array.isArray(arr) ? arr.map((v) => v * (isFinite(k) ? k : 0)) : arr);
      const tc = Object.assign({}, raw, { ncl: times(raw.ncl, pot.NCL), p1: times(raw.p1, pot.P1), p2: times(raw.p2, pot.P2) });
      if (tcChart) tcChart.update(tc, opts); else tcChart = RISCHART.timecourse(box, tc, opts);
    } catch (e) {
      box.hidden = true; empty.hidden = false; empty.textContent = 'Could not draw the time course for this setpoint.';
      if (window.console) console.warn(e);
    }
  }

  function resultWord(pass) {
    return pass ? '<span class="res ok">' + ICON.ok + 'Pass</span>' : '<span class="res no">' + ICON.warn + 'Fail</span>';
  }
  function renderSensitivity(c) {
    const body = $('sens-body'), cap = $('sens-cap');
    if (!c) { cap.textContent = 'No setpoint to test yet.'; body.innerHTML = ''; return; }
    cap.innerHTML = 'The same setpoint, <span class="mono">' + fmt(c.dose, 'dose') + ' mg/L</span> for <span class="mono">' + fmt(c.t, 'time') +
      ' min</span>, under other assumptions. Limits: CT <span class="mono">' + plain(grid.inputs.ctTarget) + ' mg·min/L</span>, activity <span class="mono">' +
      plain(grid.inputs.activityLimit_ugL) + ' µg/L CIP-eq</span>.';
    let rows;
    try { rows = RISOPT.sensitivity(grid.inputs, c) || []; } catch (e) { body.innerHTML = '<p class="empty">Could not run the checks for this setpoint.</p>'; return; }
    const tr = (s) => '<tr><td class="s">' + esc(pretty(s.label)) + '</td><td>' + resultWord(s.pass) + '</td><td class="n">' + fmt(s.activity_ugL, 'ugL') + '</td><td class="n">' + fmt(s.ct, 'ct') + '</td></tr>';
    body.innerHTML = '<table><thead><tr><th scope="col">Scenario</th><th scope="col">Result</th><th scope="col" class="n">Activity <span class="u">µg/L CIP-eq</span></th>' +
      '<th scope="col" class="n">CT <span class="u">mg·min/L</span></th></tr></thead><tbody>' +
      tr({ label: 'As set', activity_ugL: c.activity_ugL, ct: c.ct, pass: c.pass }) + rows.map(tr).join('') + '</tbody></table>';
  }

  function renderExport(c) {
    let cmd = '';
    if (c) { try { cmd = RISOPT.lockCommand(grid.inputs, c) || ''; } catch (e) { cmd = ''; } }
    $('lock-text').textContent = cmd || 'No setpoint yet.';
    $('lock-copy').disabled = !cmd;
    $('lock-st').textContent = ''; $('csv-st').textContent = '';
  }
  function renderCSV() {
    let csv = '';
    try { csv = RISOPT.toCSV(grid) || ''; } catch (e) { csv = ''; }
    $('csv-text').textContent = csv || 'No grid yet.';
    $('csv-copy').disabled = !csv;
  }

  function selectText(pre) {
    const range = document.createRange(); range.selectNodeContents(pre);
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(range);
    pre.focus();
  }
  function copyFrom(preId, statusId) {
    const pre = $(preId), st = $(statusId), text = pre.textContent;
    const fallback = () => { selectText(pre); st.textContent = 'Text selected. Press Ctrl+C to copy.'; };
    if (!navigator.clipboard || !navigator.clipboard.writeText) { fallback(); return; }
    navigator.clipboard.writeText(text).then(() => {
      st.textContent = 'Copied';
      clearTimeout(st._t); st._t = setTimeout(() => { if (st.textContent === 'Copied') st.textContent = ''; }, 2000);
    }, fallback);
  }

  function render() {
    renderRecommended();
    renderDrugOnly();
    renderCSV();
    renderSelection();
  }

  // ---------- start ----------
  function init() {
    if (!HAVE_ENGINE || !HAVE_CHARTS) {
      showError('Could not load the model files. Check that model.js, optimizer/engine.js and optimizer/charts.js sit next to this page.');
      $('map').hidden = true;
      $('rec').innerHTML = '<p class="empty">No result.</p>';
      $('timecourse').hidden = true; $('tc-empty').hidden = false;
      for (const fs of document.querySelectorAll('#inputs fieldset')) fs.disabled = true;
      $('preset').disabled = true; $('reset').disabled = true;
      $('lock-copy').disabled = true; $('csv-copy').disabled = true;
      return;
    }
    restore();
    bindForm();
    fillForm();
    schedule(0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
