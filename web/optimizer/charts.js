/* Chlorination Settings Optimizer: charts. Global RISCHART. No dependencies, plain ES2020, runs from file://.
 *
 *   RISCHART.operatingMap(container, grid, { selected, onSelect }) -> { update(grid, opts), destroy() }
 *   RISCHART.timecourse(container, tc, { limit_ugL })              -> { update(tc, opts), destroy() }
 *
 * Colours come from the CSS custom properties in tokens.css, read with getComputedStyle(container) at draw time.
 * Both charts redraw on container resize and on theme change (prefers-color-scheme, data-theme on <html>).
 * Nothing here animates, so prefers-reduced-motion is respected by construction.
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------------------------------------------
  // Species colours for the timecourse (the only colours not taken from tokens.css). Chosen away from the status
  // blue / amber / red, and checked with dataviz validate_palette.js --pairs all (lines cross, so every pair counts):
  //   light, surface #fbfcfc: lightness, chroma, contrast PASS; worst CVD dE 9.7; worst normal-vision dE 21.6
  //   dark,  surface #172028: lightness, chroma, contrast PASS; worst CVD dE 11.0; worst normal-vision dE 20.1
  // ---------------------------------------------------------------------------------------------------------------
  const SPECIES = {
    light: { cipro: '#5046c8', ncl: '#c264d6', p1: '#9a4a22', p2: '#2c9a4b' },
    dark:  { cipro: '#7b74f2', ncl: '#e052ad', p1: '#a85428', p2: '#6fa832' },
  };
  const SERIES = [
    { key: 'cipro', label: 'Cipro' },
    { key: 'ncl', label: 'N-chloro-cipro' },
    { key: 'p1', label: 'Product 1' },
    { key: 'p2', label: 'Product 2' },
  ];

  const FALLBACK = {
    '--panel': '#fbfcfc', '--ink': '#13212b', '--ink-2': '#44545f', '--muted': '#6b7a84', '--rule': '#d5dde1',
    '--grid': '#e3e9ec', '--pass': '#1d74b8', '--warn': '#d9860a', '--void': '#e6ebee', '--void-hatch': '#c2ccd2',
    '--focus': '#1d74b8',
    '--f-label': '"Barlow Semi Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif',
    '--f-body': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
    '--f-data': '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace',
  };

  const SVGNS = 'http://www.w3.org/2000/svg';
  const MICRO = 'µ';
  let uid = 0;

  // ---------------------------------------------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------------------------------------------
  function s(tag, attrs, parent, text) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, cls, parent, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const r1 = (v) => Math.round(v * 10) / 10;

  function readTokens(container) {
    const cs = getComputedStyle(container);
    const t = {};
    for (const k in FALLBACK) {
      const v = cs.getPropertyValue(k).trim();
      t[k.slice(2)] = v || FALLBACK[k];
    }
    t.dark = luminance(t.panel) < 0.2;
    return t;
  }
  function parseColour(c) {
    c = String(c).trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) return m[1].split('').map((x) => parseInt(x + x, 16));
    m = /^#([0-9a-f]{6})/i.exec(c);
    if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
    m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(c);
    if (m) return [+m[1], +m[2], +m[3]];
    return [128, 128, 128];
  }
  function luminance(c) {
    const [r, g, b] = parseColour(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  // Text set inside a coloured fill: white or near-black, whichever reads better (the one exception to
  // "text never wears a data colour"; it still is not the data colour).
  function inkOn(fill) { return contrast(fill, '#ffffff') >= contrast(fill, '#0b1620') ? '#ffffff' : '#0b1620'; }

  let measureCtx = null;
  function textWidth(text, font) {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    if (!measureCtx) return String(text).length * 7;
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = (n) => String(n).split('').map((ch) => SUP[ch] || ch).join('');
  function sig(v, n) {
    if (v == null || !isFinite(v)) return '–';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a < 1e-4) {
      const e = Math.floor(Math.log10(a));
      return (v / Math.pow(10, e)).toFixed(1) + '×10' + sup(e);
    }
    if (a >= 1000) return String(Math.round(v));
    return String(Number(v.toPrecision(n || 3)));
  }
  // Use the engine's formatter when it is on the page, so the map and the page agree to the digit.
  function fmt(v, kind) {
    if (v == null || !isFinite(v)) return '–';
    try {
      const f = global.RISOPT && global.RISOPT.fmt;
      if (typeof f === 'function') { const out = f(v, kind); if (out != null && out !== '') return String(out); }
    } catch (e) { /* fall through */ }
    if (kind === 'time') return String(Number(v.toFixed(1)));
    if (kind === 'dose') return String(Number(v.toFixed(2)));
    return sig(v, 3);
  }
  const tickText = (v) => String(Number(v.toPrecision(6)));

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    let best = p, d = Infinity;
    for (const m of [1, 2, 5, 10]) {
      const dd = Math.abs(Math.log(m * p / raw));
      if (dd < d) { d = dd; best = m * p; }
    }
    return best;
  }
  function niceTicks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    const step = niceStep((hi - lo) / Math.max(1, count));
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(10)));
    return out;
  }
  // Position of a value on a banded axis, as a fractional index into the (monotonic) array of band centres.
  function fracIndex(arr, v) {
    const n = arr.length;
    if (n < 2) return 0;
    let k = 0;
    while (k < n - 2 && v > arr[k + 1]) k++;
    return clamp(k + (v - arr[k]) / (arr[k + 1] - arr[k]), -0.5, n - 0.5);
  }
  function nearestIndex(arr, v) {
    let best = 0, d = Infinity;
    for (let i = 0; i < arr.length; i++) { const dd = Math.abs(arr[i] - v); if (dd < d) { d = dd; best = i; } }
    return best;
  }
  const hit = (a, b, pad) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

  // One stylesheet for the HTML chrome (tooltip, legend, focus ring). These follow the tokens through var().
  function injectStyle() {
    if (document.getElementById('risc-style')) return;
    const st = document.createElement('style');
    st.id = 'risc-style';
    st.textContent = [
      '.risc{position:relative;width:100%;min-width:0;font-family:var(--f-label,Arial,sans-serif);color:var(--ink-2,#44545f);-webkit-tap-highlight-color:transparent}',
      '.risc svg{display:block;overflow:visible;outline:none;border-radius:4px;-webkit-user-select:none;user-select:none}',
      '.risc svg:focus-visible{outline:2px solid var(--focus,#1d74b8);outline-offset:3px}',
      '.risc-map svg{cursor:crosshair}',
      '.risc-tc svg{touch-action:pan-y}',
      '.risc-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}',
      '.risc-tip{position:absolute;left:0;top:0;z-index:5;pointer-events:none;visibility:hidden;box-sizing:border-box;min-width:176px;max-width:260px;padding:9px 11px 10px;',
      'background:var(--panel,#fbfcfc);border:1px solid var(--rule,#d5dde1);border-radius:var(--r,6px);box-shadow:0 6px 18px rgba(9,20,28,.14),0 1px 2px rgba(9,20,28,.10);',
      'font-size:12px;line-height:1.35;color:var(--ink-2,#44545f)}',
      '.risc-tip[data-on="1"]{visibility:visible}',
      '.risc-tip-h{font-family:var(--f-data,monospace);font-size:12.5px;font-weight:600;color:var(--ink,#13212b);white-space:nowrap;padding-bottom:6px;margin-bottom:6px;border-bottom:1px solid var(--rule,#d5dde1)}',
      '.risc-tip-h span{font-weight:400;color:var(--muted,#6b7a84)}',
      '.risc-tip-r{display:flex;align-items:baseline;justify-content:space-between;gap:14px;white-space:nowrap;padding:1px 0}',
      '.risc-tip-k{display:inline-flex;align-items:center;gap:6px;color:var(--ink-2,#44545f)}',
      '.risc-tip-k i{display:inline-block;width:12px;height:0;border-top:2px solid currentColor;border-radius:1px;flex:none}',
      '.risc-tip-v{font-family:var(--f-data,monospace);font-weight:600;color:var(--ink,#13212b)}',
      '.risc-tip-v span{font-weight:400;color:var(--muted,#6b7a84)}',
      '.risc-tip-s{display:flex;align-items:center;gap:7px;margin-top:7px;padding-top:7px;border-top:1px solid var(--rule,#d5dde1);font-weight:600;color:var(--ink,#13212b);white-space:nowrap}',
      '.risc-tip-s svg{flex:none;border-radius:2px}',
      '.risc-legend{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px;margin:10px 0 0;padding:0;list-style:none;font-size:12px;line-height:1.2;color:var(--ink-2,#44545f)}',
      '.risc-legend li{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
      '.risc-legend svg{flex:none;overflow:visible}',
      '.risc-legend .risc-sep{width:1px;height:12px;background:var(--rule,#d5dde1)}',
    ].join('');
    document.head.appendChild(st);
  }

  // Redraw on container resize, theme change and late font loads. Returns a disposer.
  function watch(container, redraw) {
    let raf = 0, lastW = -1, dead = false;
    const schedule = () => {
      if (dead || raf) return;
      raf = requestAnimationFrame(() => { raf = 0; if (!dead) redraw(); });
    };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        const w = Math.round(entries[entries.length - 1].contentRect.width);
        if (w !== lastW) { lastW = w; schedule(); }
      });
      ro.observe(container);
    }
    const onWin = () => schedule();
    if (!ro) global.addEventListener('resize', onWin);
    const mq = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onWin); else if (mq.addListener) mq.addListener(onWin); }
    let mo = null;
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(onWin);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    }
    const fonts = document.fonts;
    if (fonts && fonts.addEventListener) fonts.addEventListener('loadingdone', onWin);
    return {
      schedule,
      dispose() {
        dead = true;
        if (raf) cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else global.removeEventListener('resize', onWin);
        if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onWin); else if (mq.removeListener) mq.removeListener(onWin); }
        if (mo) mo.disconnect();
        if (fonts && fonts.removeEventListener) fonts.removeEventListener('loadingdone', onWin);
      },
    };
  }

  function placeTip(tip, root, ax, ay, aw, ah, boundW, boundH, dropBelow) {
    // Anchor box (ax, ay, aw, ah) in root coordinates. Prefer right of the anchor, flip left, clamp inside the chart.
    const tw = tip.offsetWidth, th = tip.offsetHeight, gap = 12;
    let x = ax + aw + gap;
    if (x + tw > boundW) x = ax - gap - tw;
    if (x < 0) {
      x = clamp(ax + aw / 2 - tw / 2, 0, Math.max(0, boundW - tw));
      if (dropBelow != null) { tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(dropBelow) + 'px)'; return; }
    }
    let y = clamp(ay + ah / 2 - th / 2, 0, Math.max(0, boundH - th));
    if (x < ax + aw && x + tw > ax) {           // had to sit over the anchor column: go above or below it instead
      y = ay - gap - th;
      if (y < 0) y = Math.min(ay + ah + gap, Math.max(0, boundH - th));
    }
    tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  function tipRow(parent, label, value, unit, keyColour) {
    const row = h('div', 'risc-tip-r', parent);
    const k = h('span', 'risc-tip-k', row);
    if (keyColour) { const i = h('i', null, k); i.style.color = keyColour; }
    k.appendChild(document.createTextNode(label));
    const v = h('span', 'risc-tip-v', row, value);
    if (unit) h('span', null, v, ' ' + unit);
    return row;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Chart 1: operating map
  // ---------------------------------------------------------------------------------------------------------------
  const cellClass = (c) => (!c.passCT ? 'void' : c.pass ? 'pass' : 'warn');
  function statusWords(c) {
    if (c.pass) return 'Meets both limits';
    if (c.passCT) return 'CT met, activity over limit';
    const why = c.ctMet ? 'Contact time outside the allowed range' : 'CT short';   // CT can be met while the contact time is under the minimum
    return c.passActivity ? why : why + ', activity over limit';
  }

  function operatingMap(container, grid, opts) {
    injectStyle();
    const id = ++uid;
    const st = { grid: grid || null, selected: null, onSelect: null, hover: null, kb: null, kbActive: false, focused: false, geo: null, tok: null };
    function setOpts(o) {
      if (!o) return;
      if ('selected' in o) st.selected = o.selected || null;
      if ('onSelect' in o) st.onSelect = typeof o.onSelect === 'function' ? o.onSelect : null;
    }
    setOpts(opts);

    const root = h('div', 'risc risc-map', container);
    const summary = h('p', 'risc-vh', root);
    summary.id = 'risc-sum-' + id;
    const svg = s('svg', { tabindex: 0, role: 'application', 'aria-roledescription': 'operating map', 'aria-describedby': summary.id,
      'aria-label': 'Operating map: chlorine dose against contact time. Arrow keys move between settings, Enter selects one.' }, root);
    const gStatic = s('g', null, svg);
    const gHover = s('g', { 'pointer-events': 'none' }, svg);
    const tip = h('div', 'risc-tip', root);
    tip.setAttribute('aria-hidden', 'true');
    const live = h('div', 'risc-vh', root);
    live.setAttribute('aria-live', 'polite');
    const legend = h('ul', 'risc-legend', root);
    legend.setAttribute('aria-label', 'Legend');

    const ok = () => st.grid && st.grid.cells && st.grid.cells.length && st.grid.cells[0] && st.grid.cells[0].length;
    function cellAt(iD, iT) { const row = st.grid.cells[iD]; return row ? row[iT] || null : null; }
    function locate(c) {            // a cell from anywhere (grid, evaluate(), an older grid) -> indices in this grid
      if (!c || !ok()) return null;
      const g = st.grid;
      let iD = c.iDose, iT = c.iTime;
      const hasIdx = Number.isInteger(iD) && Number.isInteger(iT) && cellAt(iD, iT);
      if (!hasIdx || Math.abs(g.doses[iD] - c.dose) > 1e-9 || Math.abs(g.times[iT] - c.t) > 1e-9) {
        if (!isFinite(c.dose) || !isFinite(c.t)) return hasIdx ? { iD, iT } : null;
        iD = nearestIndex(g.doses, c.dose); iT = nearestIndex(g.times, c.t);
      }
      return { iD, iT };
    }

    // ---- drawing -------------------------------------------------------------------------------------------------
    function draw() {
      const W = Math.floor(root.getBoundingClientRect().width);
      if (!W) return;
      const tok = st.tok = readTokens(container);
      clear(gStatic); clear(gHover); clear(legend);
      if (!ok()) { svg.setAttribute('width', W); svg.setAttribute('height', 0); st.geo = null; summary.textContent = 'No data.'; hideTip(); return; }
      const g = st.grid, nD = g.doses.length, nT = g.times.length;
      const narrow = W < 560;
      const fLabel = tok['f-label'], fData = tok['f-data'];
      const H = Math.round(narrow ? clamp(W * 1.18, 360, 560) : clamp(W * 0.625, 360, 760));
      const mL = 40, mR = narrow ? 10 : 14, mT = 30, mB = 50;
      const cw = Math.max(2, Math.floor((W - mL - mR) / nT)), ch = Math.max(2, Math.floor((H - mT - mB) / nD));
      const pw = cw * nT, ph = ch * nD, x0 = mL, y0 = mT;
      const Hs = y0 + ph + mB;
      svg.setAttribute('width', W); svg.setAttribute('height', Hs); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hs);
      const cx = (j) => x0 + j * cw + cw / 2, cy = (i) => y0 + ph - i * ch - ch / 2;
      const geo = st.geo = { W, H: Hs, x0, y0, pw, ph, cw, ch, nD, nT };

      // -- fills: one path per region, cells separated by a hairline of surface so the grid resolution shows
      const gap = (cw >= 6 && ch >= 6) ? 1 : 0;
      const d = { pass: '', warn: '', void: '' };
      for (let i = 0; i < nD; i++) for (let j = 0; j < nT; j++) {
        const c = g.cells[i][j];
        if (!c) continue;
        d[cellClass(c)] += 'M' + (x0 + j * cw) + ' ' + (y0 + ph - (i + 1) * ch + gap) + 'h' + (cw - gap) + 'v' + (ch - gap) + 'h' + (-(cw - gap)) + 'z';
      }
      const defs = s('defs', null, gStatic);
      const pid = 'risc-hatch-' + id;
      const pat = s('pattern', { id: pid, width: 6, height: 6, patternUnits: 'userSpaceOnUse' }, defs);
      s('path', { d: 'M-1 1l2-2M0 6l6-6M5 7l2-2', stroke: tok['void-hatch'], 'stroke-width': 1, fill: 'none' }, pat);
      const gFill = s('g', { 'shape-rendering': 'crispEdges' }, gStatic);
      if (d.void) { s('path', { d: d.void, fill: tok.void }, gFill); s('path', { d: d.void, fill: 'url(#' + pid + ')' }, gFill); }
      if (d.warn) s('path', { d: d.warn, fill: tok.warn }, gFill);
      if (d.pass) s('path', { d: d.pass, fill: tok.pass }, gFill);

      // -- boundaries along cell edges, chained into polylines
      const px = (j) => x0 + j * cw, py = (i) => y0 + ph - i * ch + (gap ? 0.5 : 0);
      const ctB = boundary(g, nD, nT, (c) => !!c.passCT), acB = boundary(g, nD, nT, (c) => !!c.passActivity);
      const gLines = s('g', { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gStatic);
      const toPath = (chains) => chains.map((ch_) => ch_.map((p, k) => (k ? 'L' : 'M') + (px(p[0]) - (gap ? 0.5 : 0)) + ' ' + py(p[1])).join('')).join('');
      const ctD = toPath(ctB), acD = toPath(acB);
      if (acD) { s('path', { d: acD, stroke: tok.panel, 'stroke-width': 4.5 }, gLines); }
      if (ctD) { s('path', { d: ctD, stroke: tok.panel, 'stroke-width': 4.5 }, gLines); }
      if (acD) { s('path', { d: acD, stroke: tok.ink, 'stroke-width': 1.75, 'stroke-dasharray': '3 4.5' }, gLines); }
      if (ctD) { s('path', { d: ctD, stroke: tok.ink, 'stroke-width': 1.75 }, gLines); }

      // -- markers (positions first, so labels can keep clear of them)
      const rec = locate(g.recommended), drug0 = locate(g.drugOnly), sel = locate(st.selected);
      const drug = drug0 && rec && drug0.iD === rec.iD && drug0.iT === rec.iT ? null : drug0;
      const placed = [];
      const reserve = (p, r) => { if (p) placed.push({ x: cx(p.iT) - r, y: cy(p.iD) - r, w: 2 * r, h: 2 * r }); };
      reserve(rec, 9); reserve(drug, 10); reserve(sel, 12);
      if (sel) {                         // labels keep off the crosshair too
        placed.push({ x: x0, y: cy(sel.iD) - 1, w: cx(sel.iT) - x0, h: 2 });
        placed.push({ x: cx(sel.iT) - 1, y: cy(sel.iD), w: 2, h: y0 + ph - cy(sel.iD) });
      }
      const inPlot = (r) => r.x >= x0 + 2 && r.y >= y0 + 2 && r.x + r.w <= x0 + pw - 2 && r.y + r.h <= y0 + ph - 2;
      const free = (r, pad) => inPlot(r) && !placed.some((p) => hit(r, p, pad == null ? 4 : pad));

      const gCross = s('g', null, gStatic), gRegion = s('g', null, gStatic), gMark = s('g', null, gStatic), gChip = s('g', null, gStatic);
      const chipFont = '500 12px ' + fLabel;
      function chip(text, x, y, w) {     // x, y = top-left of an 18px-high chip
        s('rect', { x: r1(x), y: r1(y), width: r1(w), height: 18, rx: 3, fill: tok.panel, 'fill-opacity': 0.94 }, gChip);
        s('text', { x: r1(x + w / 2), y: r1(y + 13), 'text-anchor': 'middle', fill: tok.ink, 'font-family': fLabel, 'font-size': 12, 'font-weight': 500 }, gChip, text);
      }
      function markerLabel(p, text, r) {
        if (!p) return;
        const w = Math.ceil(textWidth(text, chipFont)) + 12, X = cx(p.iT), Y = cy(p.iD), o = r + 6;
        const cands = [[X + o, Y - 9], [X - o - w, Y - 9], [X + o - 4, Y - o - 14], [X + o - 4, Y + o - 4], [X - w / 2, Y - o - 16], [X - w / 2, Y + o - 2],
          [X - o - w + 4, Y - o - 14], [X - o - w + 4, Y + o - 4], [X + o + 6, Y - o - 20], [X + o + 6, Y + o + 2], [X - o - w - 6, Y - o - 20], [X - o - w - 6, Y + o + 2],
          [X - w / 2, Y - o - 24], [X - w / 2, Y + o + 6]];
        for (const [x, y] of cands) {
          const rc = { x, y, w, h: 18 };
          if (free(rc, 3)) { placed.push(rc); chip(text, x, y, w); return; }
        }
      }
      markerLabel(rec, 'Recommended', 8);
      markerLabel(drug, 'Drug-only plan', 9);

      // -- boundary labels: one short chip sitting on each line
      function lineLabel(chains, text) {
        if (!chains.length) return;
        const w = Math.ceil(textWidth(text, chipFont)) + 12;
        const pts = chains.map((c) => c.map((p) => [px(p[0]), py(p[1])]));
        const len = (c) => { let L = 0; for (let k = 1; k < c.length; k++) L += Math.abs(c[k][0] - c[k - 1][0]) + Math.abs(c[k][1] - c[k - 1][1]); return L; };
        pts.sort((a, b) => len(b) - len(a));
        for (const c of pts.slice(0, 2)) {
          const L = len(c);
          if (L < w) continue;
          for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78, 0.14, 0.86]) {
            let rem = L * f, P = c[0];
            for (let k = 1; k < c.length; k++) {
              const seg = Math.abs(c[k][0] - c[k - 1][0]) + Math.abs(c[k][1] - c[k - 1][1]);
              if (rem <= seg) { const u = seg ? rem / seg : 0; P = [c[k - 1][0] + (c[k][0] - c[k - 1][0]) * u, c[k - 1][1] + (c[k][1] - c[k - 1][1]) * u]; break; }
              rem -= seg;
            }
            const rc = { x: clamp(P[0] - w / 2, x0 + 4, x0 + pw - w - 4), y: clamp(P[1] - 9, y0 + 4, y0 + ph - 22), w, h: 18 };
            if (Math.abs(rc.x + w / 2 - P[0]) > w / 2 || Math.abs(rc.y + 9 - P[1]) > 9) continue;   // clamped off the line
            if (free(rc, 6)) { placed.push(rc); chip(text, rc.x, rc.y, w); return; }
          }
        }
      }
      lineLabel(ctB, 'CT target');
      lineLabel(acB, 'Activity limit');

      // -- region labels, each in the roomiest rectangle of its region; skipped when the region is too small
      const regFont = '600 13px ' + fLabel;
      function regionLabel(cls, text, fill) {
        const w = Math.ceil(textWidth(text, regFont)), needW = w + 22, needH = 24;
        let best = null;
        const keys = cls === 'void' ? ['void1', 'void0'] : [cls];
        const key = (c) => (!c ? '' : cellClass(c) === 'void' ? 'void' + (c.passActivity ? 1 : 0) : cellClass(c));
        for (const kk of keys) {
          const up = new Array(nT).fill(0);
          for (let i = 0; i < nD; i++) {
            for (let j = 0; j < nT; j++) up[j] = key(g.cells[i][j]) === kk ? up[j] + 1 : 0;
            for (let a = 0; a < nT; a++) {
              let m = Infinity;
              for (let b = a; b < nT && up[b] > 0; b++) {
                m = Math.min(m, up[b]);
                const rw = (b - a + 1) * cw, rh = m * ch;
                if (rw < needW || rh < needH) continue;
                const score = Math.min(rw / needW, 3) * Math.min(rh / needH, 3) * 1e6 + rw * rh;
                if (!best || score > best.score) best = { score, x: px(a), y: y0 + ph - (i + 1) * ch, w: rw, h: rh };
              }
            }
          }
        }
        if (!best) return;
        const bw = w + 12, bh = 20;
        for (const fy of [0.5, 0.3, 0.7, 0.15, 0.85]) for (const fx of [0.5, 0.25, 0.75, 0.1, 0.9]) {
          const rc = { x: best.x + 5 + (best.w - 10 - bw) * fx, y: best.y + 2 + (best.h - 4 - bh) * fy, w: bw, h: bh };
          if (!free(rc, 6)) continue;
          placed.push(rc);
          // a patch of the region's own fill clears the cell hairlines (and hatch) behind the words
          s('rect', { x: r1(rc.x), y: r1(rc.y), width: bw, height: bh, rx: 2, fill }, gRegion);
          s('text', { x: r1(rc.x + bw / 2), y: r1(rc.y + 14.5), 'text-anchor': 'middle', fill: cls === 'void' ? tok['ink-2'] : inkOn(fill),
            'font-family': fLabel, 'font-size': 13, 'font-weight': 600, 'letter-spacing': '0.01em' }, gRegion, text);
          return;
        }
      }
      regionLabel('pass', 'Meets both', tok.pass);
      regionLabel('warn', 'Activity over limit', tok.warn);
      const voidWord = st.grid.inputs && st.grid.inputs.minContact_min > 0 ? 'CT or contact time short' : 'CT short';
      regionLabel('void', voidWord, tok.void);

      // -- axes
      const gAxis = s('g', null, gStatic);
      const tickFont = '400 11px ' + fData;
      const axisChips = [];
      if (sel) {
        const c = cellAt(sel.iD, sel.iT);
        const tx = fmt(c.t, 'time'), ty = fmt(c.dose, 'dose');
        const wx = Math.ceil(textWidth(tx, '600 11px ' + fData)) + 10, wy = Math.ceil(textWidth(ty, '600 11px ' + fData)) + 10;
        axisChips.push({ x: clamp(cx(sel.iT) - wx / 2, 0, W - wx), y: y0 + ph + 6, w: wx, h: 17, text: tx });
        axisChips.push({ x: Math.max(0, x0 - 5 - wy), y: clamp(cy(sel.iD) - 8.5, 0, Hs - 17), w: wy, h: 17, text: ty });
      }
      const xt = niceTicks(g.times[0], g.times[nT - 1], clamp(pw / 58, 3, 8));
      for (const v of xt) {
        const X = Math.round(x0 + (fracIndex(g.times, v) + 0.5) * cw) + 0.5, label = tickText(v), tw = textWidth(label, tickFont);
        s('line', { x1: X, x2: X, y1: y0 + ph + 1, y2: y0 + ph + 5, stroke: tok.rule }, gAxis);
        if (axisChips.some((a) => hit(a, { x: X - tw / 2, y: y0 + ph + 8, w: tw, h: 12 }, 3))) continue;
        s('text', { x: X, y: y0 + ph + 18, 'text-anchor': 'middle', fill: tok.muted, 'font-family': fData, 'font-size': 11 }, gAxis, label);
      }
      const yt = niceTicks(g.doses[0], g.doses[nD - 1], clamp(ph / 48, 3, 8));
      for (const v of yt) {
        const Y = Math.round(y0 + ph - (fracIndex(g.doses, v) + 0.5) * ch) + 0.5, label = tickText(v), tw = textWidth(label, tickFont);
        s('line', { x1: x0 - 5, x2: x0 - 1, y1: Y, y2: Y, stroke: tok.rule }, gAxis);
        if (axisChips.some((a) => hit(a, { x: x0 - 8 - tw, y: Y - 6, w: tw, h: 12 }, 3))) continue;
        s('text', { x: x0 - 8, y: Y + 4, 'text-anchor': 'end', fill: tok.muted, 'font-family': fData, 'font-size': 11 }, gAxis, label);
      }
      const yTitle = s('text', { x: 0, y: 15, fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12.5, 'font-weight': 500 }, gAxis, 'Chlorine dose, mg/L as Cl');
      s('tspan', { 'font-size': 9, dy: 3 }, yTitle, '2');
      s('text', { x: x0 + pw / 2, y: y0 + ph + 40, 'text-anchor': 'middle', fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12.5, 'font-weight': 500 }, gAxis, 'Contact time, min');

      // -- selected: crosshair to both axes, ring, and its values on the axes
      if (sel) {
        const X = Math.round(cx(sel.iT)) + 0.5, Y = Math.round(cy(sel.iD)) + 0.5;
        const dd = 'M' + x0 + ' ' + Y + 'H' + (X - 11) + 'M' + X + ' ' + (Y + 11) + 'V' + (y0 + ph);
        s('path', { d: dd, stroke: tok.panel, 'stroke-width': 3, 'stroke-opacity': 0.75, fill: 'none' }, gCross);
        s('path', { d: dd, stroke: tok.ink, 'stroke-width': 1, fill: 'none' }, gCross);
        s('circle', { cx: X, cy: Y, r: 10, fill: 'none', stroke: tok.panel, 'stroke-width': 5.5 }, gMark);
        s('circle', { cx: X, cy: Y, r: 10, fill: 'none', stroke: tok.ink, 'stroke-width': 1.5 }, gMark);
        for (const a of axisChips) {
          s('rect', { x: r1(a.x), y: r1(a.y), width: a.w, height: a.h, rx: 3, fill: tok.ink }, gAxis);
          s('text', { x: r1(a.x + a.w / 2), y: r1(a.y + 12.5), 'text-anchor': 'middle', fill: tok.panel, 'font-family': fData, 'font-size': 11, 'font-weight': 600 }, gAxis, a.text);
        }
      }
      if (drug) drawDiamond(gMark, cx(drug.iT), cy(drug.iD), 7, tok);
      if (rec) drawDisc(gMark, cx(rec.iT), cy(rec.iD), 6, tok);

      buildLegend(tok, pid, !!ctD, !!acD, !!rec, !!drug, d, !narrow);
      buildSummary(rec, drug0, sel);
      renderHover();
    }

    function drawDisc(parent, X, Y, r, tok) { s('circle', { cx: r1(X), cy: r1(Y), r, fill: tok.ink, stroke: tok.panel, 'stroke-width': 2 }, parent); }
    function drawDiamond(parent, X, Y, r, tok) {
      const dd = 'M' + r1(X) + ' ' + r1(Y - r) + 'L' + r1(X + r) + ' ' + r1(Y) + 'L' + r1(X) + ' ' + r1(Y + r) + 'L' + r1(X - r) + ' ' + r1(Y) + 'Z';
      s('path', { d: dd, fill: tok.panel, stroke: tok.panel, 'stroke-width': 6, 'stroke-linejoin': 'round' }, parent);
      s('path', { d: dd, fill: tok.panel, stroke: tok.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' }, parent);
    }

    // Edges between cells where test() flips, chained into polylines of grid corners [j, i].
    function boundary(g, nD, nT, test) {
      const segs = [], key = (j, i) => i * (nT + 1) + j;
      const v = (i, j) => { const c = g.cells[i][j]; return c ? test(c) : false; };
      for (let i = 0; i < nD; i++) for (let j = 0; j < nT; j++) {
        if (j + 1 < nT && v(i, j) !== v(i, j + 1)) segs.push([key(j + 1, i), key(j + 1, i + 1)]);
        if (i + 1 < nD && v(i, j) !== v(i + 1, j)) segs.push([key(j, i + 1), key(j + 1, i + 1)]);
      }
      const adj = new Map();
      segs.forEach((sg, k) => { for (const n of sg) { if (!adj.has(n)) adj.set(n, []); adj.get(n).push(k); } });
      const used = new Array(segs.length).fill(false), chains = [];
      const walk = (start) => {
        const path = [start];
        let cur = start;
        for (;;) {
          const k = (adj.get(cur) || []).find((e) => !used[e]);
          if (k == null) break;
          used[k] = true;
          cur = segs[k][0] === cur ? segs[k][1] : segs[k][0];
          path.push(cur);
        }
        if (path.length > 1) {
          const pts = path.map((n) => [n % (nT + 1), Math.floor(n / (nT + 1))]);
          const out = [pts[0]];
          for (let k = 1; k < pts.length; k++) {     // drop collinear corners
            const a = out[out.length - 1], b = pts[k], c = pts[k + 1];
            if (c && ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1]))) continue;
            out.push(b);
          }
          chains.push(out);
        }
      };
      for (const [n, es] of adj) if (es.length % 2 === 1) walk(n);
      for (const [n, es] of adj) if (es.some((e) => !used[e])) walk(n);
      return chains;
    }

    function buildLegend(tok, pid, hasCT, hasAc, hasRec, hasDrug, d, seps) {
      const item = (draw_, text) => {
        const li = h('li', null, legend);
        const sv = s('svg', { width: 16, height: 12, viewBox: '0 0 16 12', 'aria-hidden': 'true' }, li);
        draw_(sv);
        li.appendChild(document.createTextNode(text));
      };
      const sw = (fill) => (sv) => s('rect', { x: 1, y: 0, width: 14, height: 12, rx: 2, fill }, sv);
      if (d.pass) item(sw(tok.pass), 'Meets both');
      if (d.warn) item(sw(tok.warn), 'Activity over limit');
      if (d.void) item((sv) => { sw(tok.void)(sv); s('rect', { x: 1, y: 0, width: 14, height: 12, rx: 2, fill: 'url(#' + pid + ')' }, sv); }, st.grid.inputs && st.grid.inputs.minContact_min > 0 ? 'CT or contact time short' : 'CT short');
      if (seps && (hasCT || hasAc)) h('li', 'risc-sep', legend).setAttribute('aria-hidden', 'true');
      if (hasCT) item((sv) => s('path', { d: 'M0 6H16', stroke: tok.ink, 'stroke-width': 1.75, 'stroke-linecap': 'round' }, sv), 'CT target');
      if (hasAc) item((sv) => s('path', { d: 'M1 6H16', stroke: tok.ink, 'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-dasharray': '3 4.5' }, sv), 'Activity limit');
      if (seps && (hasRec || hasDrug)) h('li', 'risc-sep', legend).setAttribute('aria-hidden', 'true');
      if (hasRec) item((sv) => s('circle', { cx: 8, cy: 6, r: 5, fill: tok.ink }, sv), 'Recommended');
      if (hasDrug) item((sv) => s('path', { d: 'M8 1L13 6L8 11L3 6Z', fill: 'none', stroke: tok.ink, 'stroke-width': 1.75, 'stroke-linejoin': 'round' }, sv), 'Drug-only plan');
    }

    function describe(c) {
      return 'Dose ' + fmt(c.dose, 'dose') + ' mg/L, contact time ' + fmt(c.t, 'time') + ' min. CT ' + fmt(c.ct, 'ct') + ' mg·min/L, residual ' +
        fmt(c.residual, 'mgL') + ' mg/L, cipro ' + fmt(c.cipro_ugL, 'ugL') + ' ' + MICRO + 'g/L, activity ' + fmt(c.activity_ugL, 'ugL') + ' ' + MICRO + 'g/L. ' + statusWords(c) + '.';
    }
    function buildSummary(rec, drug, sel) {
      const g = st.grid, nD = g.doses.length, nT = g.times.length;
      let nPass = 0, nWarn = 0, nVoid = 0;
      for (const row of g.cells) for (const c of row) { if (!c) continue; const k = cellClass(c); if (k === 'pass') nPass++; else if (k === 'warn') nWarn++; else nVoid++; }
      let t = 'Operating map of ' + (nD * nT) + ' settings: chlorine dose ' + fmt(g.doses[0], 'dose') + ' to ' + fmt(g.doses[nD - 1], 'dose') + ' mg/L as Cl2 against contact time ' +
        fmt(g.times[0], 'time') + ' to ' + fmt(g.times[nT - 1], 'time') + ' min. ' + nPass + ' meet both the CT target and the activity limit, ' + nWarn +
        ' meet CT but leave activity over the limit, ' + nVoid + ' are short on CT or contact time. ';
      t += rec ? 'Recommended setting: ' + describe(cellAt(rec.iD, rec.iT)) + ' ' : 'No setting in this range meets both limits. ';
      if (drug) t += 'Drug-only plan: ' + describe(cellAt(drug.iD, drug.iT)) + ' ';
      if (sel) t += 'Selected: ' + describe(cellAt(sel.iD, sel.iT));
      summary.textContent = t;
    }

    // ---- hover / focus layer ---------------------------------------------------------------------------------------
    function shown() { return st.hover || (st.focused && st.kbActive ? st.kb : null); }
    function hideTip() { tip.removeAttribute('data-on'); }
    function renderHover() {
      clear(gHover);
      const p = shown(), geo = st.geo, tok = st.tok;
      if (!p || !geo || !ok() || !cellAt(p.iD, p.iT)) { hideTip(); return; }
      const c = cellAt(p.iD, p.iT);
      const x = geo.x0 + p.iT * geo.cw, y = geo.y0 + geo.ph - (p.iD + 1) * geo.ch;
      s('rect', { x: x - 1.5, y: y - 0.5, width: geo.cw + 2, height: geo.ch + 2, fill: 'none', stroke: tok.panel, 'stroke-width': 4, rx: 1.5 }, gHover);
      s('rect', { x: x - 1.5, y: y - 0.5, width: geo.cw + 2, height: geo.ch + 2, fill: 'none', stroke: tok.ink, 'stroke-width': 1.5, rx: 1.5 }, gHover);

      clear(tip);
      const head = h('div', 'risc-tip-h', tip);
      head.appendChild(document.createTextNode(fmt(c.dose, 'dose')));
      h('span', null, head, ' mg/L');
      head.appendChild(document.createTextNode('  ·  ' + fmt(c.t, 'time')));
      h('span', null, head, ' min');
      tipRow(tip, 'CT', fmt(c.ct, 'ct'), 'mg·min/L');
      tipRow(tip, 'Residual', fmt(c.residual, 'mgL'), 'mg/L');
      tipRow(tip, 'Cipro', fmt(c.cipro_ugL, 'ugL'), MICRO + 'g/L');
      tipRow(tip, 'Activity', fmt(c.activity_ugL, 'ugL'), MICRO + 'g/L');
      const foot = h('div', 'risc-tip-s', tip);
      const k = cellClass(c);
      const sv = s('svg', { width: 12, height: 12, viewBox: '0 0 12 12' }, foot);
      s('rect', { width: 12, height: 12, fill: tok[k] }, sv);
      if (k === 'void') s('path', { d: 'M-1 5L5 -1M-1 11L11 -1M5 13L13 5', stroke: tok.muted, 'stroke-width': 1 }, sv);
      foot.appendChild(document.createTextNode(statusWords(c)));
      tip.setAttribute('data-on', '1');
      placeTip(tip, root, x, y, geo.cw, geo.ch, geo.W, geo.H);
    }
    function pointCell(ev) {
      const geo = st.geo;
      if (!geo) return null;
      const r = svg.getBoundingClientRect();
      const x = ev.clientX - r.left - geo.x0, y = ev.clientY - r.top - geo.y0;
      if (x < 0 || y < 0 || x >= geo.pw || y >= geo.ph) return null;
      return { iD: geo.nD - 1 - Math.floor(y / geo.ch), iT: Math.floor(x / geo.cw) };
    }
    function select(p) {
      const c = p && ok() && cellAt(p.iD, p.iT);
      if (!c) return;
      st.selected = c;
      draw();
      if (st.onSelect) st.onSelect(c);
    }
    const on = {
      pointermove(ev) {
        if (ev.pointerType === 'touch') return;
        const p = pointCell(ev);
        st.kbActive = false;
        if ((p && st.hover && p.iD === st.hover.iD && p.iT === st.hover.iT) || (!p && !st.hover)) return;
        st.hover = p; renderHover();
      },
      pointerleave(ev) { if (ev.pointerType === 'touch') return; if (st.hover) { st.hover = null; renderHover(); } },
      click(ev) {
        const p = pointCell(ev);
        if (!p) { st.kbActive = false; st.hover = null; renderHover(); return; }
        st.kb = p; st.kbActive = true;     // keeps the readout up after a tap, where there is no hover
        select(p);
      },
      keydown(ev) {
        if (!ok()) return;
        const g = st.grid, nD = g.doses.length, nT = g.times.length;
        let p = st.kb || locate(st.selected) || locate(g.recommended) || { iD: Math.floor(nD / 2), iT: Math.floor(nT / 2) };
        p = { iD: clamp(p.iD, 0, nD - 1), iT: clamp(p.iT, 0, nT - 1) };
        const moved = st.kb && st.kbActive;      // first key press just reveals the starting cell
        switch (ev.key) {
          case 'ArrowRight': if (moved) p.iT = Math.min(nT - 1, p.iT + 1); break;
          case 'ArrowLeft': if (moved) p.iT = Math.max(0, p.iT - 1); break;
          case 'ArrowUp': if (moved) p.iD = Math.min(nD - 1, p.iD + 1); break;
          case 'ArrowDown': if (moved) p.iD = Math.max(0, p.iD - 1); break;
          case 'PageUp': p.iD = Math.min(nD - 1, p.iD + 5); break;
          case 'PageDown': p.iD = Math.max(0, p.iD - 5); break;
          case 'Home': p.iT = 0; break;
          case 'End': p.iT = nT - 1; break;
          case 'Enter': case ' ': ev.preventDefault(); st.kb = p; st.kbActive = true; st.hover = null; select(p); live.textContent = 'Selected. ' + describe(cellAt(p.iD, p.iT)); return;
          case 'Escape': st.kbActive = false; st.hover = null; renderHover(); return;
          default: return;
        }
        ev.preventDefault();
        st.kb = p; st.kbActive = true; st.hover = null;
        renderHover();
        live.textContent = describe(cellAt(p.iD, p.iT));
      },
      focus() {
        st.focused = true;
        let viaKeyboard = false;
        try { viaKeyboard = svg.matches(':focus-visible'); } catch (e) { /* older engines */ }
        if (viaKeyboard && ok()) {
          const g = st.grid;
          st.kb = st.kb || locate(st.selected) || locate(g.recommended) || { iD: Math.floor(g.doses.length / 2), iT: Math.floor(g.times.length / 2) };
          st.kbActive = true;
        }
        renderHover();
      },
      blur() { st.focused = false; st.kbActive = false; renderHover(); },
    };
    for (const k in on) svg.addEventListener(k, on[k]);

    const w = watch(root, draw);
    draw();

    return {
      update(newGrid, o) {
        if (newGrid !== undefined) st.grid = newGrid || null;
        setOpts(o);
        st.hover = null;
        if (st.kb && ok()) st.kb = { iD: clamp(st.kb.iD, 0, st.grid.doses.length - 1), iT: clamp(st.kb.iT, 0, st.grid.times.length - 1) };
        draw();
      },
      destroy() {
        w.dispose();
        for (const k in on) svg.removeEventListener(k, on[k]);
        if (root.parentNode) root.parentNode.removeChild(root);
      },
    };
  }

  // ---------------------------------------------------------------------------------------------------------------
  // Chart 2: timecourse at one setpoint. One y-axis (ug/L); chlorine residual is a different unit and stays off.
  // ---------------------------------------------------------------------------------------------------------------
  function timecourse(container, tc, opts) {
    injectStyle();
    const id = ++uid;
    const st = { tc: tc || null, limit: null, idx: null, kbActive: false, focused: false, hover: false, geo: null, tok: null };
    function setOpts(o) { if (o && 'limit_ugL' in o) st.limit = isFinite(o.limit_ugL) && o.limit_ugL > 0 ? +o.limit_ugL : null; }
    setOpts(opts);

    const root = h('div', 'risc risc-tc', container);
    const summary = h('p', 'risc-vh', root);
    summary.id = 'risc-sum-' + id;
    const svg = s('svg', { tabindex: 0, role: 'application', 'aria-roledescription': 'chart', 'aria-describedby': summary.id,
      'aria-label': 'Antibacterial activity and its contributors over time at the selected setting. Left and right arrow keys step through time.' }, root);
    const gStatic = s('g', null, svg);
    const gHover = s('g', { 'pointer-events': 'none' }, svg);
    const tip = h('div', 'risc-tip', root);
    tip.setAttribute('aria-hidden', 'true');
    const live = h('div', 'risc-vh', root);
    live.setAttribute('aria-live', 'polite');
    const legend = h('ul', 'risc-legend', root);
    legend.setAttribute('aria-label', 'Legend');

    const ok = () => st.tc && st.tc.t_min && st.tc.t_min.length > 1 && st.tc.activity;
    const seriesList = (tok) => {
      const pal = SPECIES[tok.dark ? 'dark' : 'light'];
      const list = SERIES.filter((d) => Array.isArray(st.tc[d.key])).map((d) => ({ key: d.key, label: d.label, colour: pal[d.key], width: 1.5, data: st.tc[d.key] }));
      list.push({ key: 'activity', label: 'Activity', colour: tok.ink, width: 2, data: st.tc.activity, main: true });
      return list;
    };

    function draw() {
      const W = Math.floor(root.getBoundingClientRect().width);
      if (!W) return;
      const tok = st.tok = readTokens(container);
      clear(gStatic); clear(gHover); clear(legend);
      if (!ok()) { svg.setAttribute('width', W); svg.setAttribute('height', 0); st.geo = null; summary.textContent = 'No data.'; tip.removeAttribute('data-on'); return; }
      const T = st.tc.t_min, n = T.length, fLabel = tok['f-label'], fData = tok['f-data'];
      const series = seriesList(tok);
      const labFont = '500 12px ' + fLabel;
      const labelW = Math.ceil(Math.max(...series.map((d) => textWidth(d.label, d.main ? '600 12px ' + fLabel : labFont))));

      // -- y scale: log when the values span more than two decades
      let vmax = 0, vminPos = Infinity;
      for (const d of series) for (const v of d.data) { if (v > vmax) vmax = v; if (v > 0 && v < vminPos) vminPos = v; }
      if (st.limit) { vmax = Math.max(vmax, st.limit); vminPos = Math.min(vminPos, st.limit); }
      if (!(vmax > 0)) { vmax = 1; vminPos = 0.1; }
      const isLog = vmax / vminPos > 100;
      let yLo, yHi, yTicks;
      if (isLog) {
        const top = Math.ceil(Math.log10(vmax) - 1e-9);
        let lo = Math.max(vminPos, Math.pow(10, top - 3));       // three decades: anything smaller is far below the limit and only wastes space
        if (st.limit) lo = Math.min(lo, st.limit / 5);           // keep the limit line clear of the floor
        const bot = Math.min(Math.floor(Math.log10(lo) + 1e-9), top - 2);
        yLo = bot; yHi = top; yTicks = [];
        for (let k = bot; k <= top; k++) yTicks.push(k);
      } else {
        yTicks = niceTicks(0, vmax * 1.05, 4);
        const step = yTicks.length > 1 ? yTicks[1] - yTicks[0] : vmax;
        if (yTicks[yTicks.length - 1] < vmax) yTicks.push(Number((yTicks[yTicks.length - 1] + step).toPrecision(10)));
        yLo = 0; yHi = yTicks[yTicks.length - 1];
      }
      const decadeText = (k) => (k >= 0 && k <= 4 ? String(Math.pow(10, k)) : k < 0 && k >= -4 ? (1 / Math.pow(10, -k)).toFixed(-k) : '10' + sup(k));
      const yText = (v) => (isLog ? decadeText(v) : tickText(v));
      const tickFont = '400 11px ' + fData;
      const yLabW = Math.ceil(Math.max(...yTicks.map((v) => textWidth(yText(v), tickFont))));

      const H = Math.round(clamp(W * 0.52, 230, 300));
      const mL = yLabW + 12, mR = labelW + 22, mT = 44, mB = 44;
      const x0 = mL, y0 = mT, pw = Math.max(40, W - mL - mR), ph = H - mT - mB;
      svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      const t0 = T[0], t1 = T[n - 1];
      const X = (t) => x0 + (t - t0) / (t1 - t0) * pw;
      const Y = (v) => {
        if (isLog) { const lv = v > 0 ? Math.log10(v) : -Infinity; return y0 + ph - (Math.max(lv, yLo - 0.5) - yLo) / (yHi - yLo) * ph; }
        return y0 + ph - (v - yLo) / (yHi - yLo) * ph;
      };
      st.geo = { W, H, x0, y0, pw, ph, X, Y, series };

      // -- grid and axes
      const gAxis = s('g', null, gStatic);
      const everyOther = isLog && yTicks.length > 7;
      yTicks.forEach((v, k) => {
        const yy = Math.round(isLog ? y0 + ph - (v - yLo) / (yHi - yLo) * ph : Y(v)) + 0.5;
        s('line', { x1: x0, x2: x0 + pw, y1: yy, y2: yy, stroke: k === 0 ? tok.rule : tok.grid }, gAxis);
        if (everyOther && (yTicks.length - 1 - k) % 2) return;
        s('text', { x: x0 - 8, y: yy + 4, 'text-anchor': 'end', fill: tok.muted, 'font-family': fData, 'font-size': 11 }, gAxis, yText(v));
      });
      const xt = niceTicks(t0, t1, clamp(pw / 64, 3, 8));
      for (const v of xt) {
        const xx = Math.round(X(v)) + 0.5;
        s('line', { x1: xx, x2: xx, y1: y0 + ph + 1, y2: y0 + ph + 5, stroke: tok.rule }, gAxis);
        s('text', { x: xx, y: y0 + ph + 18, 'text-anchor': 'middle', fill: tok.muted, 'font-family': fData, 'font-size': 11 }, gAxis, tickText(v));
      }
      s('text', { x: 0, y: 13, fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12.5, 'font-weight': 500 }, gAxis,
        MICRO + 'g/L' + (isLog ? ', log scale' : '') + ' (activity as cipro-equivalents)');
      s('text', { x: x0 + pw / 2, y: y0 + ph + 37, 'text-anchor': 'middle', fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12.5, 'font-weight': 500 }, gAxis, 'Time, min');

      // -- bisulfite marker
      const q = st.tc.quenchAt_min;
      if (isFinite(q) && q >= t0 && q <= t1) {
        const xq = Math.round(X(q)) + 0.5;
        s('line', { x1: xq, x2: xq, y1: y0 - 8, y2: y0 + ph, stroke: tok.muted }, gAxis);
        const lw = textWidth('Bisulfite added', labFont);
        const tx = clamp(xq, lw / 2, W - lw / 2);
        s('text', { x: r1(tx), y: y0 - 13, 'text-anchor': 'middle', fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12, 'font-weight': 500 }, gAxis, 'Bisulfite added');
      }

      // -- series
      const clipId = 'risc-clip-' + id;
      const cp = s('clipPath', { id: clipId }, s('defs', null, gStatic));
      s('rect', { x: x0 - 1, y: y0 - 2, width: pw + 2, height: ph + 3 }, cp);
      const gSeries = s('g', { 'clip-path': 'url(#' + clipId + ')', fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, gStatic);
      for (const d of series) {
        let path = '', pen = false;
        for (let k = 0; k < n; k++) {
          const v = d.data[k];
          if (v == null || !isFinite(v) || (isLog && !(v > 0))) { pen = false; continue; }
          path += (pen ? 'L' : 'M') + r1(X(T[k])) + ' ' + r1(Y(v));
          pen = true;
        }
        if (d.main) s('path', { d: path, stroke: tok.panel, 'stroke-width': 5 }, gSeries);
        s('path', { d: path, stroke: d.colour, 'stroke-width': d.width }, gSeries);
      }

      // -- limit
      if (st.limit) {
        const yl = Math.round(Y(st.limit)) + 0.5;
        s('line', { x1: x0, x2: x0 + pw, y1: yl, y2: yl, stroke: tok['ink-2'], 'stroke-dasharray': '5 4' }, gStatic);
        // put the label where the lines leave it the most room, above or below the rule
        const valText = sig(st.limit, 3) + ' ' + MICRO + 'g/L';
        const search = (limW) => {
          let best = { x: x0 + 6, base: yl - 6, score: -1 };
          for (let f = 0; f <= 10; f++) for (const side of [-1, 1]) {
            const lx = x0 + 6 + Math.max(0, pw - limW - 12) * f / 10, base = side < 0 ? yl - 6 : yl + 15, mid = base - 4;
            if (mid < y0 + 8 || mid > y0 + ph - 8) continue;
            let room = 40;
            for (const d of series) for (let k = 0; k < n; k++) {
              const xx = X(T[k]);
              if (xx < lx - 5 || xx > lx + limW + 5) continue;
              room = Math.min(room, Math.abs(Y(d.data[k]) - mid));
            }
            if (isFinite(q) && X(q) > lx - 6 && X(q) < lx + limW + 6) room = Math.min(room, 4);
            room -= f * 0.3 + (side > 0 ? 1 : 0);
            if (room > best.score) best = { x: lx, base, score: room };
          }
          return best;
        };
        let withVal = true;
        let bestPos = search(textWidth('Limit ', labFont) + textWidth(valText, '400 11px ' + fData));
        if (bestPos.score < 9) { withVal = false; bestPos = search(textWidth('Limit', labFont)); }   // tight: the name alone
        const lt = s('text', { x: r1(bestPos.x), y: bestPos.base, fill: tok['ink-2'], 'font-family': fLabel, 'font-size': 12, 'font-weight': 500,
          stroke: tok.panel, 'stroke-width': 3.5, 'stroke-linejoin': 'round', 'paint-order': 'stroke' }, gStatic, 'Limit ');
        if (withVal) s('tspan', { 'font-family': fData, 'font-size': 11, fill: tok.muted }, lt, valText);
      }

      // -- end labels, dodged with leaders so converging lines stay attached to their names
      const ends = [];
      for (const d of series) {
        const v = d.data[n - 1];
        if (v == null || !isFinite(v)) continue;
        const yy = Y(v);
        if (yy > y0 + ph + 0.5 || yy < y0 - 0.5) continue;       // ended off the plot: legend and tooltip carry it
        ends.push({ d, y: yy, ly: yy });
      }
      ends.sort((a, b) => a.y - b.y);
      const GAPY = 14;
      for (let k = 1; k < ends.length; k++) ends[k].ly = Math.max(ends[k].ly, ends[k - 1].ly + GAPY);
      if (ends.length) ends[ends.length - 1].ly = Math.min(ends[ends.length - 1].ly, y0 + ph);
      for (let k = ends.length - 2; k >= 0; k--) ends[k].ly = Math.min(ends[k].ly, ends[k + 1].ly - GAPY);
      const gEnd = s('g', null, gStatic), xe = x0 + pw;
      for (const e of ends) {
        s('path', { d: 'M' + (xe + 5) + ' ' + r1(e.y) + 'L' + (xe + 12) + ' ' + r1(e.ly) + 'H' + (xe + 16), fill: 'none', stroke: e.d.colour, 'stroke-width': 1, 'stroke-opacity': 0.75 }, gEnd);
        s('circle', { cx: xe, cy: r1(e.y), r: 3.5, fill: e.d.colour, stroke: tok.panel, 'stroke-width': 2 }, gEnd);
        s('text', { x: xe + 19, y: r1(e.ly + 4), fill: e.d.main ? tok.ink : tok['ink-2'], 'font-family': fLabel, 'font-size': 12, 'font-weight': e.d.main ? 600 : 500 }, gEnd, e.d.label);
      }

      // -- legend (line keys: the marks are lines)
      const item = (draw_, text) => {
        const li = h('li', null, legend);
        const sv = s('svg', { width: 16, height: 12, viewBox: '0 0 16 12', 'aria-hidden': 'true' }, li);
        draw_(sv);
        li.appendChild(document.createTextNode(text));
      };
      for (const d of series.slice().reverse()) item((sv) => s('path', { d: 'M0 6H16', stroke: d.colour, 'stroke-width': d.main ? 2.5 : 2, 'stroke-linecap': 'round' }, sv), d.label);
      if (st.limit) item((sv) => s('path', { d: 'M0 6H16', stroke: tok['ink-2'], 'stroke-width': 1, 'stroke-dasharray': '5 4' }, sv), 'Limit');

      // -- text summary
      const a = st.tc.activity, last = a[n - 1];
      let txt = 'Timecourse over ' + sig(t1 - t0, 3) + ' minutes. Antibacterial activity goes from ' + sig(a[0], 3) + ' to ' + sig(last, 3) + ' ' + MICRO + 'g/L cipro-equivalents';
      if (st.limit) txt += ', ' + (last <= st.limit ? 'under' : 'over') + ' the limit of ' + sig(st.limit, 3) + ' ' + MICRO + 'g/L';
      txt += '. ';
      if (isFinite(q)) txt += 'Bisulfite is added at ' + sig(q, 3) + ' minutes. ';
      txt += 'At the end: ' + series.filter((d) => !d.main).map((d) => d.label + ' ' + sig(d.data[n - 1], 3)).join(', ') + ' ' + MICRO + 'g/L.';
      summary.textContent = txt;
      renderHover();
    }

    function shownIdx() { return st.idx != null && (st.hover || (st.focused && st.kbActive)) ? st.idx : null; }
    function renderHover() {
      clear(gHover);
      const k = shownIdx(), geo = st.geo, tok = st.tok;
      if (k == null || !geo || !ok() || k >= st.tc.t_min.length) { tip.removeAttribute('data-on'); return; }
      const t = st.tc.t_min[k], xx = Math.round(geo.X(t)) + 0.5;
      s('line', { x1: xx, x2: xx, y1: geo.y0, y2: geo.y0 + geo.ph, stroke: tok['ink-2'], 'stroke-width': 1 }, gHover);
      for (const d of geo.series) {
        const v = d.data[k];
        if (v == null || !isFinite(v)) continue;
        const yy = geo.Y(v);
        if (yy > geo.y0 + geo.ph + 0.5 || yy < geo.y0 - 0.5) continue;
        s('circle', { cx: xx, cy: r1(yy), r: d.main ? 4.5 : 4, fill: d.colour, stroke: tok.panel, 'stroke-width': 2 }, gHover);
      }
      clear(tip);
      const head = h('div', 'risc-tip-h', tip);
      head.appendChild(document.createTextNode(sig(t, 3)));
      const q = st.tc.quenchAt_min;
      h('span', null, head, ' min' + (isFinite(q) ? (t < q ? '  ·  chlorine contact' : '  ·  after bisulfite') : ''));
      for (const d of geo.series.slice().reverse()) tipRow(tip, d.label, sig(d.data[k], 3), MICRO + 'g/L', d.colour);
      if (st.limit) {
        const a = st.tc.activity[k];
        h('div', 'risc-tip-s', tip, a <= st.limit ? 'Activity under limit' : 'Activity over limit');
      }
      tip.setAttribute('data-on', '1');
      placeTip(tip, root, xx, geo.y0 + geo.ph * 0.25, 0, geo.ph * 0.5, geo.W, geo.H, geo.y0 + geo.ph + 26);
    }
    function describe(k) {
      const geo = st.geo;
      if (!geo) return '';
      return 'At ' + sig(st.tc.t_min[k], 3) + ' minutes: ' + geo.series.slice().reverse().map((d) => d.label + ' ' + sig(d.data[k], 3)).join(', ') + ' ' + MICRO + 'g/L.';
    }
    function pointIdx(ev) {
      const geo = st.geo;
      if (!geo || !ok()) return null;
      const r = svg.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (x < geo.x0 - 12 || x > geo.x0 + geo.pw + 12 || y < geo.y0 - 12 || y > geo.y0 + geo.ph + 24) return null;
      const T = st.tc.t_min, t = T[0] + (x - geo.x0) / geo.pw * (T[T.length - 1] - T[0]);
      return nearestIndex(T, t);
    }
    const on = {
      pointermove(ev) {
        const k = pointIdx(ev);
        st.kbActive = false;
        if (k == null) { if (st.hover) { st.hover = false; renderHover(); } return; }
        if (st.hover && k === st.idx) return;
        st.hover = true; st.idx = k; renderHover();
      },
      pointerdown(ev) { if (ev.pointerType === 'touch') on.pointermove(ev); },
      pointerleave(ev) { if (ev.pointerType === 'touch') return; if (st.hover) { st.hover = false; renderHover(); } },
      keydown(ev) {
        if (!ok()) return;
        const n = st.tc.t_min.length, big = Math.max(1, Math.round(n / 10));
        let k = st.idx == null ? n - 1 : st.idx;
        const moved = st.kbActive || st.hover;
        switch (ev.key) {
          case 'ArrowRight': if (moved) k = Math.min(n - 1, k + 1); break;
          case 'ArrowLeft': if (moved) k = Math.max(0, k - 1); break;
          case 'PageUp': k = Math.min(n - 1, k + big); break;
          case 'PageDown': k = Math.max(0, k - big); break;
          case 'Home': k = 0; break;
          case 'End': k = n - 1; break;
          case 'Escape': st.kbActive = false; st.hover = false; renderHover(); return;
          default: return;
        }
        ev.preventDefault();
        st.idx = k; st.kbActive = true; st.hover = false;
        renderHover();
        live.textContent = describe(k);
      },
      focus() {
        st.focused = true;
        let viaKeyboard = false;
        try { viaKeyboard = svg.matches(':focus-visible'); } catch (e) { /* older engines */ }
        if (viaKeyboard && ok()) { if (st.idx == null) st.idx = st.tc.t_min.length - 1; st.kbActive = true; }
        renderHover();
      },
      blur() { st.focused = false; st.kbActive = false; st.hover = false; renderHover(); },
    };
    for (const k in on) svg.addEventListener(k, on[k]);

    const w = watch(root, draw);
    draw();

    return {
      update(newTc, o) {
        if (newTc !== undefined) st.tc = newTc || null;
        setOpts(o);
        st.hover = false;
        if (ok() && st.idx != null) st.idx = Math.min(st.idx, st.tc.t_min.length - 1);
        draw();
      },
      destroy() {
        w.dispose();
        for (const k in on) svg.removeEventListener(k, on[k]);
        if (root.parentNode) root.parentNode.removeChild(root);
      },
    };
  }

  const RISCHART = { operatingMap, timecourse, SPECIES_COLOURS: SPECIES };
  global.RISCHART = RISCHART;
  if (typeof module !== 'undefined' && module.exports) module.exports = RISCHART;
})(typeof window !== 'undefined' ? window : globalThis);
