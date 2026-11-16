// Batch Reactor Twin: page wiring. One time value (state.t) drives the drawing, the chart, the table and the sentence.
// Numbers come from TWIN_SIM (the model) and TWIN_PROTOCOL (the bench facts); nothing is typed here.
(function () {
  'use strict';
  const P = TWIN_PROTOCOL, S = TWIN_SIM, I = TWIN_INSTRUMENTS, F = I.fmt;
  const SRC = typeof RISSOURCES !== 'undefined' ? RISSOURCES : null;      // statuses of the model constants (read-only)
  const $ = id => document.getElementById(id);
  const SVG = 'http://www.w3.org/2000/svg';
  const svg = (name, attrs, text) => {
    const e = document.createElementNS(SVG, name);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const html = (name, props, kids) => {
    const e = document.createElement(name);
    Object.assign(e, props || {});
    for (const k of kids || []) e.append(k);
    return e;
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  const TIMES = P.sampleTimes(), T_END = P.runLength_min();
  const STEP_MIN = 0.5, PLAY_SECONDS = 15;                                // arrow-key step; real seconds for a full play
  const HASH = { dose: 'dose_mgL', pH: 'pH', nh3: 'NH3_mgN_L', cipro: 'cipro_ugL', hold: 'hold_min' };
  const inputs = Array.from(document.querySelectorAll('#inputs input'));

  const state = { raw: {}, run: null, ok: true, t: 0, playing: false };
  const defaultsRaw = () => { const r = {}; for (const k in S.DEFAULT_SETTINGS) r[k] = String(S.DEFAULT_SETTINGS[k]); return r; };

  // ------------------------------------------------------------------ URL hash: #dose=5&pH=7.5&nh3=0&cipro=1000&hold=5&t=15
  function readHash() {
    const q = new URLSearchParams(location.hash.replace(/^#/, ''));
    const raw = defaultsRaw();
    for (const k in HASH) if (q.has(k)) raw[HASH[k]] = q.get(k);
    const t = Number(q.get('t'));
    return { raw, t: q.has('t') && isFinite(t) ? clamp(t, 0, T_END) : 0 };
  }
  let hashTimer = 0;
  function writeHash() {
    if (!state.ok || !state.run) return;
    const s = state.run.settings, parts = [];
    for (const k in HASH) parts.push(k + '=' + s[HASH[k]]);
    parts.push('t=' + Math.round(state.t * 100) / 100);
    const h = '#' + parts.join('&');
    if (h !== location.hash) { try { history.replaceState(null, '', h); } catch (e) { /* file:// in some browsers: the view still works */ } }
  }
  const writeHashSoon = () => { clearTimeout(hashTimer); hashTimer = setTimeout(writeHash, 250); };

  // ------------------------------------------------------------------ banner: constants that are not measured
  function renderBanner() {
    const keys = S.placeholderKeys(state.run.settings), ph = $('ph');
    const rows = SRC && SRC.MODEL ? keys.map(k => SRC.MODEL.find(r => r.key === k)).filter(Boolean) : [];
    const names = rows.length === keys.length
      ? rows.map(r => r.label.charAt(0).toLowerCase() + r.label.slice(1) + ' (' + r.status + ')')
      : keys.map(k => k + ' (status table not loaded)');
    ph.replaceChildren(html('b', { textContent: 'Placeholders *' }),
      'Not measured yet: ' + names.join('; ') + '.');
  }

  // ------------------------------------------------------------------ the cross-section drawing (millimetres)
  const vialEls = [];
  function buildDrawing() {
    const v = P.value, od = v('draw_beaker_od_mm'), bh = v('draw_beaker_height_mm'), wall = v('draw_beaker_wall_mm');
    const pw = v('draw_plate_w_mm'), plateH = v('draw_plate_h_mm'), bar = v('stir_bar_mm'), barD = v('draw_stir_bar_dia_mm');
    const syD = v('draw_syringe_barrel_mm')[0], syL = v('draw_syringe_barrel_mm')[1];
    const W = 372, bench = 336, H = bench + 26, px = 8, cx = px + pw / 2;
    const plateTop = bench - plateH, bx0 = cx - od / 2, bx1 = cx + od / 2, bTop = plateTop - bh;
    const rIn = od / 2 - wall, level = v('fill_volume_mL') * 1000 / (Math.PI * rIn * rIn), yLevel = plateTop - wall - level;
    const tubeX = cx + 16, syBottom = bTop - 18, syTop = syBottom - syL, tx = bx1 + 44;

    const root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Cross-section: a foil-wrapped ' + v('beaker_volume_mL') + ' mL beaker with a stir bar on a stir plate, a ' +
        v('syringe_mL') + ' mL sampling syringe through the lid, and a rack of ' + TIMES.length + ' quench vials labelled ' + TIMES.join(', ') + ' min.' });
    const add = (name, attrs, text) => root.appendChild(svg(name, attrs, text));
    const tag = (x, y, text, fromX, fromY, cls) => {
      if (fromX !== undefined) add('path', { class: 'ln lead', d: 'M' + fromX + ' ' + fromY + 'L' + (x - 4) + ' ' + (y - 4) });
      add('text', { class: 'tg' + (cls ? ' ' + cls : ''), x, y }, text);
    };

    // stir plate and bench
    add('rect', { class: 'body', x: px, y: plateTop, width: pw, height: plateH });
    add('text', { class: 'tg', x: cx, y: plateTop + plateH / 2 + 4, 'text-anchor': 'middle' }, 'STIR PLATE');
    // beaker: glass (outer and inner face), water level, stir bar
    add('path', { class: 'ln', d: 'M' + bx0 + ' ' + bTop + 'V' + plateTop + 'H' + bx1 + 'V' + bTop });
    add('path', { class: 'ln thin', d: 'M' + (bx0 + wall) + ' ' + bTop + 'V' + (plateTop - wall) + 'H' + (bx1 - wall) + 'V' + bTop });
    add('path', { class: 'ln thin', d: 'M' + (bx0 + wall) + ' ' + yLevel + 'H' + (bx1 - wall) });
    add('path', { class: 'ln thin', d: 'M' + (bx0 + 10) + ' ' + (yLevel - 7) + 'h8l-4 7z' });                 // level mark
    add('rect', { class: 'solid', x: cx - bar / 2, y: plateTop - wall - barD, width: bar, height: barD, rx: barD / 2 });
    // foil wrap and lid, with the sampling port
    add('path', { class: 'ln foil', d: 'M' + (bx0 - 3) + ' ' + plateTop + 'V' + (bTop - 3) + 'H' + (tubeX - 3) + 'M' + (tubeX + 3) + ' ' + (bTop - 3) + 'H' + (bx1 + 3) + 'V' + plateTop });
    // sampling tube and syringe
    add('path', { class: 'ln thin', d: 'M' + tubeX + ' ' + (yLevel + 34) + 'V' + syBottom });
    add('rect', { class: 'body', x: tubeX - syD / 2, y: syTop, width: syD, height: syL });
    add('path', { class: 'ln', d: 'M' + (tubeX - 13) + ' ' + syTop + 'h26M' + tubeX + ' ' + syTop + 'v-26M' + (tubeX - 10) + ' ' + (syTop - 26) + 'h20' });
    add('rect', { class: 'solid', x: tubeX - syD / 2 + 1.5, y: syBottom - 8, width: syD - 3, height: 4 });
    add('path', { class: 'ln thin', d: 'M' + tubeX + ' ' + syTop + 'V' + (syBottom - 8) });

    // tags with leader lines
    tag(tx, syTop + syL / 2 + 4, 'SYRINGE ' + v('syringe_mL') + ' mL', tubeX + syD / 2, syTop + syL / 2);
    tag(tx, bTop + 1, 'FOIL WRAP AND LID', bx1 + 3, bTop - 3);
    tag(tx, yLevel + 4, 'WATER ' + v('fill_volume_mL') + ' mL', bx1 - wall, yLevel);
    tag(tx, yLevel + 36, 'BEAKER ' + v('beaker_volume_mL') + ' mL', bx1, yLevel + 32);
    tag(tx, yLevel + 66, 'STIR BAR ' + bar + ' mm', cx + bar / 2, plateTop - wall - barD / 2);

    // vial rack. Not to scale: the vial size is not decided.
    const pitch = 32, vw = 14, vh = 40, x0 = W - 8 - TIMES.length * pitch, vBottom = bench - 4, vTop = vBottom - vh;
    tag(x0, vTop - 26, 'QUENCH VIALS');
    tag(x0, vTop - 12, 'sample time, min · not to scale', undefined, undefined, 'q');
    TIMES.forEach((t, i) => {
      const x = x0 + i * pitch + (pitch - vw) / 2, g = add('g', { class: 'vial' });
      const liq = g.appendChild(svg('rect', { class: 'liq', x: x, width: vw }));
      g.appendChild(svg('rect', { class: 'glass', x: x, y: vTop, width: vw, height: vh }));
      g.appendChild(svg('rect', { class: 'glass', x: x - 1.5, y: vTop - 4, width: vw + 3, height: 4 }));
      g.appendChild(svg('text', { class: 'tg', x: x + vw / 2, y: bench + 17 }, String(t)));
      vialEls.push({ g, liq, vBottom, set(done) { const h = done ? 28 : 16; liq.setAttribute('y', vBottom - h); liq.setAttribute('height', h); g.classList.toggle('done', done); } });
    });
    add('rect', { class: 'body', x: x0, y: bench - 14, width: TIMES.length * pitch, height: 14 });
    add('path', { class: 'ln heavy', d: 'M0 ' + bench + 'H' + W });
    // scale bar
    add('path', { class: 'ln thin', d: 'M' + px + ' ' + (bench + 13) + 'h50M' + px + ' ' + (bench + 9) + 'v8M' + (px + 50) + ' ' + (bench + 9) + 'v8' });
    add('text', { class: 'tg', x: px + 56, y: bench + 17 }, '50 mm');
    add('text', { class: 'tg q', x: px + 96, y: bench + 17 }, 'nominal sizes');
    $('drawing').replaceChildren(root);

    const open = ['vial_size_mL', 'sample_volume_mL', 'quench_amount'].map(P.get).filter(f => !P.decided(f)).map(f => f.label.toLowerCase());
    $('vial-cap').textContent = open.length ? 'Not decided: ' + open.join(', ') + '. The values below leave out dilution by the quench.' : '';
  }

  // ------------------------------------------------------------------ time-course chart (SVG, pixels; rebuilt on resize)
  let chart = null;
  const niceMax = max => {
    for (const step of [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50]) if (max / step <= 5) return { step, top: Math.max(step, Math.ceil(max / step - 1e-9) * step) };
    return { step: 50, top: Math.ceil(max / 50) * 50 };
  };
  function buildChart() {
    const box = $('chart'), W = Math.max(280, Math.floor(box.clientWidth)), c = state.run.course, s = state.run.settings;
    const mL = 40, mR = W < 480 ? 104 : 124, ph = 132, top = 24, gap = 44, x0 = mL, x1 = W - mR;
    const H = top + ph + gap + ph + 44, X = t => x0 + (x1 - x0) * t / T_END;
    const root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img',
      'aria-label': 'Model time course over ' + T_END + ' min: total chlorine in the blank and reactor beakers, and the share of the starting ciprofloxacin present as cipro, N-chloro-cipro and later products.' });
    const add = (name, attrs, text) => root.appendChild(svg(name, attrs, text));
    const amm = s.NH3_mgN_L > 0;
    const panels = [
      { y0: top, title: 'TOTAL CHLORINE, mg/L as Cl₂', max: Math.max.apply(null, c.blank_total_mgL.concat(c.total_mgL)), dp: null,
        lines: [{ key: 'blank_total_mgL', label: 'Blank beaker', cls: '' }, { key: 'total_mgL', label: 'Reactor beaker', cls: 'b' }]
          .concat(amm ? [{ key: 'blank_free_mgL', label: 'Blank, free Cl₂', cls: 'c lite' }] : []) },
      { y0: top + ph + gap, title: 'SHARE OF STARTING CIPRO, %', max: 100, dp: 0,
        lines: [{ key: 'cipro_pct', label: 'Cipro', cls: '' }, { key: 'ncl_pct', label: 'N-chloro-cipro', cls: 'b' }, { key: 'products_pct', label: 'Later products', cls: 'c' }] },
    ];
    const dots = [];
    for (const p of panels) {
      const ax = niceMax(p.max), Y = v => p.y0 + ph - ph * clamp(v, 0, ax.top) / ax.top;
      p.Y = Y;
      add('text', { class: 'ch-t ttl', x: x0, y: p.y0 - 9 }, p.title);
      for (let k = 0; k * ax.step <= ax.top + 1e-9; k++) {
        const val = k * ax.step, y = Y(val);
        if (k) add('path', { class: 'ch-grid', d: 'M' + x0 + ' ' + y + 'H' + x1 });
        add('text', { class: 'ch-t', x: x0 - 6, y: y + 4, 'text-anchor': 'end' }, String(Math.round(val * 100) / 100));
      }
      for (const t of TIMES) add('path', { class: 'ch-samp', d: 'M' + X(t) + ' ' + p.y0 + 'V' + (p.y0 + ph) });
      add('path', { class: 'ch-axis', d: 'M' + x0 + ' ' + p.y0 + 'V' + (p.y0 + ph) + 'H' + x1 });
      const labels = [];
      for (const ln of p.lines) {
        const col = c[ln.key];
        add('path', { class: 'ch-line ' + ln.cls, d: col.map((v, i) => (i ? 'L' : 'M') + X(c.t_min[i]).toFixed(1) + ' ' + Y(v).toFixed(1)).join('') });
        labels.push({ y: Y(col[col.length - 1]), text: ln.label });
        dots.push({ key: ln.key, Y, el: null });
      }
      // direct labels at the line ends, pushed apart so they never overlap
      labels.sort((a, b) => a.y - b.y);
      const minGap = 15, lo = p.y0 + 4, hi = p.y0 + ph + 4;
      for (let i = 0; i < labels.length; i++) labels[i].ly = Math.max(i ? labels[i - 1].ly + minGap : lo, labels[i].y + 4);
      for (let i = labels.length - 1; i >= 0; i--) labels[i].ly = Math.min(labels[i].ly, i === labels.length - 1 ? hi : labels[i + 1].ly - minGap);
      for (const l of labels) add('text', { class: 'ch-t lab', x: x1 + 8, y: l.ly }, l.text);
    }
    const yBase = panels[1].y0 + ph;
    for (const t of TIMES) add('text', { class: 'ch-t', x: X(t), y: yBase + 17, 'text-anchor': 'middle' }, String(t));
    add('text', { class: 'ch-t', x: (x0 + x1) / 2, y: yBase + 36, 'text-anchor': 'middle' }, 'Time since chlorine went in, min');
    const cur = add('path', { class: 'ch-cur' });
    for (const d of dots) d.el = add('rect', { class: 'ch-dot', width: 7, height: 7 });
    box.replaceChildren(root);
    chart = { X, cur, dots, spans: panels.map(p => [p.y0, p.y0 + ph]) };
  }
  function renderCursor() {
    if (!chart) return;
    const x = chart.X(state.t), a = state.run.at(state.t);
    chart.cur.setAttribute('d', chart.spans.map(sp => 'M' + x.toFixed(1) + ' ' + sp[0] + 'V' + sp[1]).join(''));   // one segment per panel
    for (const d of chart.dots) { d.el.setAttribute('x', (x - 3.5).toFixed(1)); d.el.setAttribute('y', (d.Y(a[d.key]) - 3.5).toFixed(1)); }
  }

  // ------------------------------------------------------------------ vial table
  let rowEls = [];
  function buildTable() {
    const body = document.querySelector('#vials tbody');
    rowEls = state.run.vials.map(vial => {
      const dpd = I.dpd(vial), h = I.hplc(vial), status = html('td');
      const cell = text => html('td', { className: 'n', textContent: text });
      const tr = html('tr', {}, [html('td', { textContent: String(vial.index + 1) }), cell(F.min(vial.t_min)), cell(dpd.free.text), cell(dpd.total.text),
        cell(F.pct(h.cipro_pct)), cell(F.pct(h.ncl_pct)), status]);
      return { tr, status, t: vial.t_min };
    });
    body.replaceChildren(...rowEls.map(r => r.tr));

    const notes = ['* Moves with the placeholders named at the top of the page.'];
    if (!I.dpdEntered()) notes.push('DPD: kit range and resolution not yet entered (' + I.DPD.status + '). Model values are shown to 2 decimals.');
    notes.push('HPLC: areas in each vial after quench and a ' + F.min(state.run.settings.hold_min) + ' min hold. N-chloro-cipro is given the same peak area per mole as cipro; no standard exists yet.');
    if (state.run.vials[0].beforeChlorine) notes.push('Vial 1 is pulled before chlorine goes in. Its DPD value is the blank beaker at the moment of dosing.');
    $('vial-notes').replaceChildren(...notes.map(n => html('p', { textContent: n })));
  }

  // ------------------------------------------------------------------ protocol table
  function buildFacts() {
    const body = document.querySelector('#facts tbody'), rows = [];
    let group = '';
    for (const f of P.FACTS) {
      if (f.group !== group) { group = f.group; rows.push(html('tr', {}, [html('th', { className: 'grp', colSpan: 4, scope: 'colgroup', textContent: group })])); }
      const has = P.decided(f);
      const val = !has ? (f.status === 'UNCHECKED' ? 'not yet entered' : 'not decided')
        : (Array.isArray(f.value) ? f.value.join(f.id.indexOf('draw_') === 0 ? ' × ' : ', ') : String(f.value)) + (f.unit ? ' ' + f.unit : '');
      rows.push(html('tr', {}, [html('td', { textContent: f.label }), html('td', { textContent: val, className: has ? '' : 'none' }),
        html('td', { textContent: f.status }), html('td', { textContent: f.source + (f.note ? '. Note: ' + f.note : '') })]));
    }
    body.replaceChildren(...rows);
  }

  // ------------------------------------------------------------------ everything that follows the run clock
  const isDone = t => state.t >= t - 1e-9;
  function sentence() {
    const a = state.run.at(state.t), n = TIMES.filter(isDone).length, t = F.min(state.t);
    const vials = n + ' of ' + TIMES.length + ' vials filled.';
    if (state.t <= 0) return 'At 0 min, before chlorine goes in: ' + F.pct(a.cipro_pct) + ' % of the starting cipro is cipro. ' + vials;
    return 'At ' + t + ' min: ' + F.pct(a.cipro_pct) + ' % of the starting cipro is still cipro, ' + F.pct(a.ncl_pct) +
      ' % is N-chloro-cipro. Blank beaker: ' + I.dpdReading(a.blank_free_mgL).text + ' mg/L free chlorine. ' + vials;
  }
  function renderTime(fromRange) {
    $('clock').textContent = state.t.toFixed(1);
    if (!fromRange) $('t').value = String(state.t);
    $('t').setAttribute('aria-valuetext', F.min(state.t) + ' minutes');
    TIMES.forEach((t, i) => {
      const done = isDone(t);
      tickEls[i].classList.toggle('done', done);
      vialEls[i].set(done);
      if (rowEls[i]) { rowEls[i].tr.classList.toggle('done', done); rowEls[i].status.textContent = done ? 'Sampled' : 'Waiting'; }
    });
    renderCursor();
    const say = $('say');
    say.classList.toggle('err', !state.ok);
    say.textContent = state.ok ? sentence() : 'Change the marked setting. The drawing, chart and table still show the last valid run.';
  }
  function setT(t, fromRange) {
    state.t = clamp(isFinite(t) ? t : 0, 0, T_END);
    renderTime(fromRange);
    if (!state.playing) writeHashSoon();
  }

  // ------------------------------------------------------------------ settings -> model -> page
  function recompute() {
    const v = S.validate(state.raw);
    state.ok = v.ok;
    for (const inp of inputs) {
      const err = v.errors[inp.dataset.key] || '';
      inp.closest('.f').classList.toggle('bad', !!err);
      inp.setAttribute('aria-invalid', err ? 'true' : 'false');
      $(inp.id + '-msg').textContent = err;
    }
    $('work').classList.toggle('stale', !v.ok);
    $('vial-sec').classList.toggle('stale', !v.ok);
    if (v.ok || !state.run) {
      state.run = S.run(v.settings);
      renderBanner(); buildChart(); buildTable();
    }
    renderTime();
    writeHashSoon();
  }
  function showRaw() { for (const inp of inputs) inp.value = state.raw[inp.dataset.key]; }

  // ------------------------------------------------------------------ play
  let lastFrame = 0, stepTimer = 0;
  function stop() {
    state.playing = false; clearInterval(stepTimer);
    $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false'); $('say').setAttribute('aria-live', 'polite');
    writeHashSoon();
  }
  function frame(now) {
    if (!state.playing) return;
    const t = state.t + (now - lastFrame) / 1000 * T_END / PLAY_SECONDS;
    lastFrame = now;
    setT(t);
    if (state.t >= T_END) stop(); else requestAnimationFrame(frame);
  }
  function play() {
    if (state.t >= T_END) setT(0);
    state.playing = true;
    $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true'); $('say').setAttribute('aria-live', 'off');
    if (reduce.matches) {                      // no continuous motion: jump from one sample time to the next
      stepTimer = setInterval(() => { const next = TIMES.find(t => t > state.t + 1e-9); setT(next === undefined ? T_END : next); if (state.t >= T_END) stop(); }, 1000);
    } else { lastFrame = performance.now(); requestAnimationFrame(frame); }
  }
  function stepKey(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return false;
    const fwd = e.key === 'ArrowRight' || e.key === 'ArrowUp';
    let t;
    if (e.shiftKey) {                          // shift: to the neighbouring sample time
      const next = fwd ? TIMES.find(x => x > state.t + 1e-9) : TIMES.slice().reverse().find(x => x < state.t - 1e-9);
      t = next === undefined ? (fwd ? T_END : 0) : next;
    } else t = Math.round((state.t + (fwd ? STEP_MIN : -STEP_MIN)) / STEP_MIN) * STEP_MIN;
    e.preventDefault();
    if (state.playing) stop();
    setT(t);
    return true;
  }

  // ------------------------------------------------------------------ start
  const tickEls = TIMES.map((t, i) => {
    const b = html('button', { type: 'button', className: 'tick', textContent: i === TIMES.length - 1 ? t + ' min' : String(t) });
    b.setAttribute('aria-label', 'Go to the ' + t + ' min sample');
    b.style.left = (100 * t / T_END) + '%';
    b.addEventListener('click', () => { if (state.playing) stop(); setT(t); });
    return b;
  });
  $('ticks').replaceChildren(...tickEls);
  $('t').max = String(T_END);

  for (const inp of inputs) {
    inp.addEventListener('input', () => { state.raw[inp.dataset.key] = inp.value; recompute(); });
    inp.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const cur = Number(inp.value), step = Number(inp.dataset.step), f = S.FIELDS[inp.dataset.key];
      if (inp.value.trim() === '' || !isFinite(cur)) return;
      e.preventDefault();
      const next = clamp(cur + (e.key === 'ArrowUp' ? step : -step), f.min, f.max);
      inp.value = String(Math.round(next * 1000) / 1000);
      state.raw[inp.dataset.key] = inp.value; recompute();
    });
  }
  $('inputs').addEventListener('submit', e => e.preventDefault());
  $('t').addEventListener('input', () => { if (state.playing) stop(); setT(Number($('t').value), true); });
  $('t').addEventListener('keydown', stepKey);
  document.addEventListener('keydown', e => {
    const tgt = e.target, name = tgt && tgt.tagName;
    if (name === 'INPUT' || name === 'TEXTAREA' || name === 'SELECT' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stepKey(e);
  });
  $('play').addEventListener('click', () => (state.playing ? stop() : play()));
  $('reset').addEventListener('click', () => { if (state.playing) stop(); state.raw = defaultsRaw(); showRaw(); state.t = 0; recompute(); });
  window.addEventListener('hashchange', () => { const h = readHash(); if (state.playing) stop(); state.raw = h.raw; state.t = h.t; showRaw(); recompute(); });

  let lastW = 0;
  if (window.ResizeObserver) new ResizeObserver(() => {
    const w = Math.floor($('chart').clientWidth);
    if (w && w !== lastW && state.run) { lastW = w; buildChart(); renderCursor(); }
  }).observe($('chart'));

  const first = readHash();
  state.raw = first.raw; state.t = first.t;
  showRaw(); buildDrawing(); buildFacts(); recompute();
  lastW = Math.floor($('chart').clientWidth);
})();
