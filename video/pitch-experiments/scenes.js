// Every frame is drawn from the time alone, so the preview and the MP4 export match exactly.
const W = 1920, H = 1080, D = window.DATA;
const C = { navy: "#0a1033", navy2: "#141c4d", ink: "#10163a", light: "#eef1f7", card: "#ffffff", grey: "#6a7394",
  dim: "#9aa4c8", blue: "#3b4fe0", sky: "#7f93ff", pink: "#ff5f9e", lime: "#d9f24f", amber: "#ffb340", white: "#f6f8ff", line: "#d6dbea" };
const SANS = '-apple-system, "Helvetica Neue", Arial, sans-serif', MONO = 'Menlo, monospace';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = x => x * x * (3 - 2 * x);
const out = x => 1 - Math.pow(1 - x, 3);
const mix = (a, b, k) => a + (b - a) * k;
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function lerpTable(table, key, x, fields) {
  if (x <= table[0][key]) return table[0];
  for (let i = 1; i < table.length; i++) if (x <= table[i][key]) {
    const a = table[i - 1], b = table[i], k = (x - a[key]) / (b[key] - a[key]), r = {};
    fields.forEach(f => r[f] = mix(a[f], b[f], k)); return r;
  }
  return table[table.length - 1];
}
function text(c, s, x, y, o = {}) {
  c.save(); c.globalAlpha *= o.a ?? 1; c.font = `${o.w || 500} ${o.size || 32}px ${o.mono ? MONO : SANS}`;
  c.fillStyle = o.color || C.white; c.textAlign = o.align || "left"; c.textBaseline = "alphabetic";
  if (o.mono) c.letterSpacing = "2px"; else if ((o.size || 32) > 44) c.letterSpacing = "-1px";
  c.fillText(s, x, y + (o.rise || 0)); c.restore();
}
function reveal(c, s, x, y, t, o = {}) { const k = out(prog(t, o.at || 0, (o.at || 0) + (o.dur || .6))); if (k > 0) text(c, s, x, y, { ...o, a: (o.a ?? 1) * k, rise: (1 - k) * 22 }); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function card(c, x, y, w, h, fill, r = 22, stroke) { rrect(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } }
function bg(c, col) { c.fillStyle = col; c.fillRect(0, 0, W, H); }
function darkBg(c, t) {
  bg(c, C.navy); const g = c.createRadialGradient(1300, 480, 50, 1300, 480, 1100);
  g.addColorStop(0, "rgba(59,79,224,0.16)"); g.addColorStop(1, "rgba(10,16,51,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function foot(c, s, color, a = 1) { text(c, s, 96, 1030, { size: 20, mono: true, w: 400, color: color || C.dim, a }); }

// ------------------------------------------------------------------ 1. the molecule
const CORE = new Set([1, 3, 4, 5, 9, 10, 11, 18, 20, 21, 22, 23, 0, 2]), RING = [13, 14, 15, 16, 17];
function sceneMolecule(c, t) {
  darkBg(c);
  const cx = 1240, cy = 545, sc = 64, N = 15, A = D.mol.atoms, rand = rng(7), drift = {};
  RING.forEach(i => { const a = rand() * 6.28 - 0.3; drift[i] = [Math.cos(a) * .9 + 2.3, Math.sin(a) * 2.6]; });
  const fall = smooth(prog(t, 8.2, 11.5)), glow = smooth(prog(t, 11.6, 13)), appear = out(prog(t, .3, 1.5));
  const P = i => { const d = drift[i] || [0, 0]; return [cx + (A[i].x + d[0] * fall) * sc, cy - (A[i].y + d[1] * fall) * sc]; };
  if (glow > 0) { const pulse = .75 + .25 * Math.sin(t * 3.2);
    const g = c.createRadialGradient(cx - 90, cy, 40, cx - 90, cy, 390); g.addColorStop(0, `rgba(217,242,79,${.34 * glow * pulse})`); g.addColorStop(1, "rgba(217,242,79,0)");
    c.fillStyle = g; c.fillRect(cx - 520, cy - 420, 900, 840); }
  c.lineCap = "round";
  D.mol.bonds.forEach(([a, b, o]) => {
    const inRing = RING.includes(a) || RING.includes(b);
    let al = appear; if (inRing) al *= 1 - fall * .92;
    const [x1, y1] = P(a), [x2, y2] = P(b), core = CORE.has(a) && CORE.has(b);
    c.strokeStyle = core && glow > 0 ? mixHex(C.white, C.lime, glow) : C.white; c.globalAlpha = al; c.lineWidth = 6;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    if (o === 2) { const dx = y2 - y1, dy = x1 - x2, l = Math.hypot(dx, dy), ox = dx / l * 13, oy = dy / l * 13;
      c.lineWidth = 4; c.beginPath(); c.moveTo(mix(x1, x2, .15) + ox, mix(y1, y2, .15) + oy); c.lineTo(mix(x1, x2, .85) + ox, mix(y1, y2, .85) + oy); c.stroke(); }
  });
  c.globalAlpha = 1;
  const col = { O: "#ff6b6b", N: C.sky, F: "#7ee8c7" };
  A.forEach((a, i) => { const [x, y] = P(i); if (a.s === "C") return;
    c.globalAlpha = appear * (RING.includes(i) ? 1 - fall * .6 : 1); c.beginPath(); c.arc(x, y, 21, 0, 7); c.fillStyle = col[a.s]; c.fill();
    text(c, a.s, x, y + 9, { size: 25, w: 700, align: "center", color: C.navy }); c.globalAlpha = 1; });
  // chlorine arrives
  const [nx, ny] = P(N), go = smooth(prog(t, 3.4, 5)), bound = t > 5;
  if (t > 3 && !bound) { const hx = mix(1810, nx + 54, go), hy = mix(120, ny - 44, go); c.beginPath(); c.arc(hx, hy, 24, 0, 7); c.fillStyle = C.lime; c.fill(); text(c, "Cl", hx, hy + 10, { size: 25, w: 700, align: "center", color: C.navy }); text(c, "HOCl", hx + 36, hy + 10, { size: 25, mono: true, color: C.lime }); }
  if (bound) { const f = prog(t, 5, 5.6); if (f < 1) { c.beginPath(); c.arc(nx + 30, ny - 24, 30 + f * 300, 0, 7); c.fillStyle = `rgba(217,242,79,${.5 * (1 - f)})`; c.fill(); }
    const lx = nx + 54 + fall * 60, ly = ny - 44 - fall * 40; c.globalAlpha = 1 - fall * .75; c.strokeStyle = C.lime; c.lineWidth = 6; c.beginPath(); c.moveTo(nx, ny); c.lineTo(lx, ly); c.stroke();
    c.beginPath(); c.arc(lx, ly, 24, 0, 7); c.fillStyle = C.lime; c.fill(); text(c, "Cl", lx, ly + 10, { size: 25, w: 700, align: "center", color: C.navy }); c.globalAlpha = 1; }
  // words
  reveal(c, "WHAT CHLORINE DOES", 96, 300, t, { at: .2, size: 24, mono: true, color: C.amber });
  reveal(c, "Chlorine changes", 96, 382, t, { at: .4, size: 66, w: 700 }); reveal(c, "the drug.", 96, 458, t, { at: .55, size: 66, w: 700 });
  reveal(c, "Not always its power.", 96, 534, t, { at: 12.2, size: 66, w: 700, color: C.pink });
  const stage = t < 5 ? ["Ciprofloxacin", "Common antibiotic. Chlorine goes for this nitrogen."] : t < 8.2 ? ["N-chloro-cipro", "Formed in under a second."] : t < 11.6 ? ["Breaks apart", "Over about 15–20 minutes, the outer ring falls apart."] : ["The core stays", "The quinolone core, the part that attacks bacteria."];
  if (t > 1.2) { const at = t < 5 ? 1.2 : t < 8.2 ? 5 : t < 11.6 ? 8.2 : 11.6; reveal(c, stage[0], 96, 640, t, { at, size: 38, w: 700, color: C.lime }); reveal(c, stage[1], 96, 690, t, { at: at + .1, size: 28, color: C.dim }); }
  foot(c, "Dodd et al. 2005, Environ. Sci. Technol. 39:7065. Structure drawn from cipro's real geometry.", C.dim, prog(t, 1, 2));
}
function mixHex(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return `rgb(${A.map((v, i) => Math.round(mix(v, B[i], k))).join(",")})`; }

// ------------------------------------------------------------------ 2. removed vs active
function sceneSplit(c, t) {
  darkBg(c);
  const kn = [{ t: 0, drug: 1, activity: 1 }, ...D.kn], clockP = smooth(prog(t, 3.2, 10.5));
  // the clock runs on a log-like path: most of the change happens in the first half minute
  const mins = clockP <= 0 ? 0 : .5 * (Math.pow(241, clockP) - 1); const v = lerpTable(kn, "t", mins, ["drug", "activity"]);
  const fade = 1 - smooth(prog(t, 12.2, 13)) * .35;
  reveal(c, "SAME WATER. TWO TESTS.", 96, 104, t, { at: .1, size: 24, mono: true, color: C.amber });
  reveal(c, t < 12.6 ? "Add chlorine, then watch both." : "", 96, 174, t, { at: .25, size: 56, w: 700 });
  const m = mins < 1 ? mins.toFixed(1) : Math.round(mins).toString();
  text(c, `${m} min`, 1824, 168, { size: 56, w: 700, align: "right", color: mins > 0 ? C.lime : C.dim, a: prog(t, 2, 3) });
  // left: chemical test
  const yy = 228, ph = 590, slide = out(prog(t, .6, 1.4)); c.save(); c.globalAlpha = slide * fade;
  card(c, 96, yy, 840, ph, C.navy2, 26); text(c, "Chemical test: how much drug?", 136, yy + 62, { size: 34, w: 700 });
  const bx = 136, bw = 760, base = yy + 470, top = yy + 110, H0 = base - top;
  c.strokeStyle = "#3a4478"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, base); c.lineTo(bx + bw, base); c.stroke();
  const curve = (h, color, dash) => { c.beginPath(); for (let i = 0; i <= 200; i++) { const x = bx + bw * i / 200, u = (i / 200 - .52) / .055, n = .018 * Math.sin(i * .9) * (h < 1 ? 1 : 0); const y = base - H0 * (h * Math.exp(-u * u) + Math.abs(n) * .5); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.strokeStyle = color; c.lineWidth = dash ? 3 : 6; c.setLineDash(dash ? [10, 10] : []); c.stroke(); c.setLineDash([]); };
  if (mins > 0) curve(1, "#5b6596", true); curve(v.drug, C.amber);
  text(c, "illustrative peak, height from data", bx, base + 40, { size: 21, mono: true, color: C.dim, w: 400 });
  text(c, `${Math.round(v.drug * 100)}%`, 896, yy + 150, { size: 104, w: 800, align: "right", color: C.amber }); text(c, "of the drug left", 896, yy + 192, { size: 28, align: "right", color: C.dim });
  c.restore();
  // right: bacteria test
  const sl2 = out(prog(t, .8, 1.6)); c.save(); c.globalAlpha = sl2 * fade;
  card(c, 984, yy, 840, ph, C.navy2, 26); text(c, "Bacteria test: how much activity?", 1024, yy + 62, { size: 34, w: 700 });
  const rand = rng(11); const cols = 12, rows = 6, gap = 44, ox = 1034, oy = yy + 208; const n = cols * rows, order = [...Array(n).keys()].map(i => [rand(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]), lost = Math.round((1 - v.activity) * n);
  const off = new Set(order.slice(0, lost));
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const i = r * cols + q; c.beginPath(); c.arc(ox + q * gap, oy + r * gap, 17, 0, 7); c.fillStyle = off.has(i) ? C.pink : C.blue; c.fill(); }
  text(c, `${Math.round(v.activity * 100)}%`, 1784, yy + 150, { size: 104, w: 800, align: "right", color: C.sky }); text(c, "of the activity left", 1784, yy + 192, { size: 28, align: "right", color: C.dim });
  text(c, "illustrative plate. Blue: bacteria stopped", 1024, base + 40, { size: 21, mono: true, color: C.dim, w: 400 });
  c.restore();
  // the point
  if (t > 12.6) { const k = out(prog(t, 12.6, 13.4)); c.fillStyle = `rgba(10,16,51,${.0})`; text(c, "The chemical test says “mostly gone.”", 96, 174, { size: 56, w: 700, a: k }); text(c, "Bacteria say otherwise.", 96, 930, { size: 74, w: 800, color: C.pink, a: out(prog(t, 14, 14.7)) }); }
  foot(c, "Kennedy Neth et al. 2019, Fig. 2: ultrapure water, pH 7, 2 mg/L chlorine, 2.33 mg/L cipro, LC-MS and PEQ.", C.dim, prog(t, 1, 2));
}

// ------------------------------------------------------------------ transitions: one object carries across
function drop(c, x, y, r, col) { c.beginPath(); c.moveTo(x, y - r * 1.5); c.bezierCurveTo(x + r * .35, y - r * .8, x + r, y - r * .3, x + r, y + r * .15); c.arc(x, y + r * .15, r, 0, Math.PI); c.bezierCurveTo(x - r, y - r * .3, x - r * .35, y - r * .8, x, y - r * 1.5); c.fillStyle = col; c.fill(); }
function sceneDrop(c, t, from, to, draw) {
  bg(c, from); const fall = smooth(prog(t, 0, .8)), grow = Math.pow(prog(t, .75, 1.7), 2.2);
  if (t < .75) drop(c, W / 2, mix(-80, H / 2, fall), 34 + fall * 16, to);
  else { const r = 50 + grow * 1250; c.beginPath(); c.arc(W / 2, H / 2, r, 0, 7); c.fillStyle = to; c.fill(); }
  if (draw) draw(c, t);
}

// ------------------------------------------------------------------ 3. the question, with controls that act on the water
function sliderRow(c, x, y, w, label, val, k, note, on = true) {
  text(c, label, x, y, { size: 32, w: 700, color: C.ink, a: on ? 1 : .45 }); text(c, val, x + w, y, { size: 32, w: 700, align: "right", color: C.blue, a: on ? 1 : .45 });
  const ty = y + 34; rrect(c, x, ty - 4, w, 8, 4); c.fillStyle = C.line; c.fill(); rrect(c, x, ty - 4, Math.max(8, w * k), 8, 4); c.fillStyle = on ? C.blue : "#b8bfd6"; c.fill();
  c.beginPath(); c.arc(x + w * k, ty, 16, 0, 7); c.fillStyle = "#fff"; c.fill(); c.strokeStyle = on ? C.blue : "#b8bfd6"; c.lineWidth = 6; c.stroke();
  if (note) text(c, note, x, ty + 42, { size: 22, mono: true, w: 400, color: C.grey });
}
function toggleRow(c, x, y, w, label, k, a, b) {
  text(c, label, x, y, { size: 32, w: 700, color: C.ink }); const ty = y + 16, tw = 300, tx = x + w - tw; rrect(c, tx, ty - 34, tw, 52, 26); c.fillStyle = C.line; c.fill(); rrect(c, tx + (tw / 2) * k, ty - 34, tw / 2, 52, 26); c.fillStyle = C.blue; c.fill();
  text(c, a, tx + tw / 4, ty, { size: 24, w: 700, align: "center", color: k < .5 ? "#fff" : C.grey }); text(c, b, tx + 3 * tw / 4, ty, { size: 24, w: 700, align: "center", color: k > .5 ? "#fff" : C.grey });
}
function sceneQuestion(c, t) {
  bg(c, C.light);
  reveal(c, "OUR QUESTION", 96, 104, t, { size: 24, mono: true, color: C.blue });
  reveal(c, "Which settings leave the least", 96, 176, t, { at: .1, size: 60, w: 700, color: C.ink }); reveal(c, "antibacterial activity, and still disinfect?", 96, 246, t, { at: .2, size: 60, w: 700, color: C.blue });
  const dose = mix(.5, 5, smooth(prog(t, 1.5, 3.5))), time = mix(7.5, 60, smooth(prog(t, 3.7, 5.7))), form = smooth(prog(t, 5.9, 6.5)), dech = smooth(prog(t, 7.7, 8.4));
  const x = 96, w = 760; sliderRow(c, x, 352, w, "Chlorine dose", `${dose.toFixed(1)} mg/L`, (dose - .5) / 4.5); sliderRow(c, x, 482, w, "Contact time", `${Math.round(time)} min`, (time - 7.5) / 52.5);
  toggleRow(c, x, 612, w, "Chlorine form", form, "free", "chloramine"); toggleRow(c, x, 712, w, "Dechlorination", dech, "off", "bisulfite");
  reveal(c, "We could not find two of these answers measured:", x, 842, t, { at: 8.8, size: 30, w: 700, color: C.ink });
  reveal(c, "activity left after chloramine, and how much cipro bisulfite brings back.", x, 886, t, { at: 9, size: 28, color: C.grey });
  // the water
  const gx = 1100, gy = 340, gw = 640, gh = 620; card(c, gx - 30, gy - 30, gw + 60, gh + 60, C.card, 28);
  const wy = gy + 90; c.save(); rrect(c, gx, wy, gw, gh - 90, 26); c.clip(); c.fillStyle = "#cfe0ff"; c.fillRect(gx, wy, gw, gh);
  const rand = rng(5), nCl = Math.round(mix(14, 150, (dose - .5) / 4.5)), age = (time - 7.5) / 52.5;
  for (let i = 0; i < 150; i++) { const r0 = rand(), r1 = rand(), r2 = rand(), r3 = rand(); if (i >= nCl) continue; const x0 = gx + 20 + ((r0 * gw + Math.sin(t * .8 + r2 * 9) * 26) % (gw - 40)), y0 = wy + 20 + ((r1 * (gh - 130) + Math.cos(t * .7 + r3 * 9) * 24 + (gh - 130)) % (gh - 130));
    const scale = 1 - dech * clamp(prog(t, 7.7 + r2 * .7, 8.4 + r2 * .7)), rad = 11 * scale; if (rad <= .5) continue; c.beginPath(); c.arc(x0, y0, rad, 0, 7); c.fillStyle = form > .5 && r3 > 0 ? "#7ee8c7" : C.lime; c.fill(); c.strokeStyle = "#6c7f18"; c.lineWidth = 1.5; c.stroke();
    if (form > .5) { c.beginPath(); c.arc(x0 + 13 * scale, y0, 7 * scale * form, 0, 7); c.fillStyle = C.sky; c.fill(); } }
  const r2 = rng(19); for (let i = 0; i < 26; i++) { const px = gx + 40 + r2() * (gw - 80), py = wy + 30 + r2() * (gh - 170), wob = Math.sin(t + i) * 10, k = clamp(age * 1.4 - r2() * .3); rrect(c, px + wob - 24, py - 9, 48, 18, 9); c.fillStyle = mixHex(C.pink, C.amber, k); c.fill(); }
  c.restore(); text(c, "cipro, then products as time goes on", gx, gy + 18, { size: 24, w: 700, color: C.pink }); text(c, form > .5 ? "chloramine" : "chlorine", gx, gy + 56, { size: 24, w: 700, color: "#6c7f18", a: dech > .5 ? .35 : 1 });
  text(c, dech > .5 ? "chlorine removed" : "", gx + gw, gy + 56, { size: 24, w: 700, align: "right", color: C.blue });
  foot(c, "Illustration: dots are not to scale.", C.grey, prog(t, 1, 2));
}

// ------------------------------------------------------------------ 4. ride through the coil, driven by the real model
function coilMap(c, x, y, tau) {
  const turns = 10, h = 240, rx = 88, ry = 22, n = 400; const pt = i => { const a = i / n * turns * 6.283, py = y + h * i / n; return [x + Math.cos(a) * rx, py + Math.sin(a) * ry]; };
  c.lineWidth = 7; c.lineCap = "round"; c.strokeStyle = "rgba(255,255,255,.14)"; c.beginPath(); for (let i = 0; i <= n; i++) { const [a, b] = pt(i); i ? c.lineTo(a, b) : c.moveTo(a, b); } c.stroke();
  const e = Math.round(n * tau / 30); c.strokeStyle = C.lime; c.beginPath(); for (let i = 0; i <= e; i++) { const [a, b] = pt(i); i ? c.lineTo(a, b) : c.moveTo(a, b); } c.stroke();
  [["A", 7.5], ["B", 15], ["C", 22.5]].forEach(([l, m]) => { const [a, b] = pt(Math.round(n * m / 30)); c.beginPath(); c.arc(a, b, 11, 0, 7); c.fillStyle = tau >= m ? C.lime : "#39417a"; c.fill(); text(c, l, a, b + 7, { size: 18, w: 800, align: "center", color: tau >= m ? C.navy : C.white }); });
  const [a, b] = pt(e); c.beginPath(); c.arc(a, b, 9, 0, 7); c.fillStyle = "#fff"; c.fill();
}
function sceneRide(c, t) {
  bg(c, C.navy);
  const T0 = 1.2, Tend = 16.5, tau = mix(0, 30, prog(t, T0, Tend)), cx = W / 2 + 230, cy = H / 2 - 20, f = 620, Rt = 1;
  const z0 = t * 2.6, ringN = 26;
  const pct = lerpTable(D.ride, "t", Math.max(tau, .001), ["cipro", "ncl", "prod", "free"]);
  for (let i = ringN; i >= 0; i--) { const z = i * .55 + (.55 - (z0 % .55)) + .3; const r = f * Rt / z, tw = Math.sin((i + Math.floor(z0 / .55)) * .55) * .5 + .5; c.beginPath(); c.ellipse(cx, cy, r, r, 0, 0, 7); c.strokeStyle = `rgba(127,147,255,${clamp(.5 / z + .03) * (.5 + tw * .5)})`; c.lineWidth = clamp(10 / z, 1, 6); c.stroke(); }
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, 170); g.addColorStop(0, "rgba(120,190,255,.32)"); g.addColorStop(1, "rgba(120,190,255,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const rand = rng(23), parts = []; for (let i = 0; i < 300; i++) parts.push([rand(), rand(), rand(), rand(), rand()]);
  const rows = parts.map(([u, ang, rad, ph, kind]) => { const z = ((ph * 14 - z0 * (.75 + kind * .2)) % 14 + 14) % 14 + .25; return { u, ang, rad, z, kind }; }).sort((a, b) => b.z - a.z);
  rows.forEach(p => { const r = f * Math.sqrt(p.rad) * .86 / p.z, a = p.ang * 6.283 + p.z * .04; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, s = clamp(36 / p.z, 2, 34); if (x < -60 || x > W + 60 || y < -60 || y > H + 60) return;
    let col = C.sky; if (p.u < pct.prod) col = C.amber; else if (p.u < pct.prod + pct.ncl) col = C.pink; c.globalAlpha = clamp(1.5 - p.z / 12) * .95; c.beginPath(); c.arc(x, y, s, 0, 7); c.fillStyle = col; c.fill(); c.globalAlpha = 1; });
  // chlorine flash where the streams meet
  const fl = prog(t, T0, T0 + .8); if (fl > 0 && fl < 1) { c.fillStyle = `rgba(217,242,79,${.55 * (1 - fl)})`; c.fillRect(0, 0, W, H); }
  // readout
  const k = prog(t, T0, T0 + .5); c.save(); c.globalAlpha = k; const cg = c.createLinearGradient(0, 0, 780, 0); cg.addColorStop(0, "rgba(10,16,51,1)"); cg.addColorStop(.8, "rgba(10,16,51,1)"); cg.addColorStop(1, "rgba(10,16,51,0)"); c.fillStyle = cg; c.fillRect(0, 0, 780, H); const fg = c.createLinearGradient(0, 960, 0, 1040); fg.addColorStop(0, "rgba(10,16,51,0)"); fg.addColorStop(.5, "rgba(10,16,51,1)"); c.fillStyle = fg; c.fillRect(0, 960, W, 120);
  text(c, "INSIDE THE COIL", 96, 118, { size: 24, mono: true, color: C.amber }); text(c, `${tau.toFixed(1)} min`, 96, 216, { size: 96, w: 800 }); text(c, "of contact time", 96, 262, { size: 30, color: C.dim });
  [["Cipro", pct.cipro, C.sky], ["N-chloro-cipro", pct.ncl, C.pink], ["Breakdown products", pct.prod, C.amber]].forEach(([l, v, col], i) => { const y = 358 + i * 96; text(c, l, 96, y, { size: 30, w: 700 }); text(c, `${Math.round(v * 100)}%`, 556, y, { size: 34, w: 800, align: "right", color: col }); rrect(c, 96, y + 16, 460, 14, 7); c.fillStyle = "rgba(255,255,255,.12)"; c.fill(); if (v > .004) { rrect(c, 96, y + 16, Math.max(14, 460 * v), 14, 7); c.fillStyle = col; c.fill(); } });
  text(c, `Chlorine left: ${pct.free.toFixed(1)} mg/L`, 96, 668, { size: 28, color: C.lime }); c.restore();
  card(c, 1600, 56, 240, 300, "rgba(10,16,51,.82)", 22); coilMap(c, 1720, 90, tau);
  [["PORT A", 7.5], ["PORT B", 15], ["PORT C", 22.5], ["OUTLET", 30]].forEach(([l, m]) => { const a = clamp(1 - Math.abs(tau - m) / 1.6) * 1.4; if (a > 0) { const lab = `${l}: ${m} min`; c.globalAlpha = clamp(a); card(c, cx - 190, 870, 380, 74, "rgba(217,242,79,.95)", 37); text(c, lab, cx, 919, { size: 34, w: 800, align: "center", color: C.navy }); c.globalAlpha = 1; } });
  foot(c, "Our model: 5 mg/L free chlorine, pH 7.5, 1 mg/L cipro. 30 min shown in 15 s. Motion is illustrative.", "#c9d0ee", k);
  // light to dark entrance and exit through the tube mouth
  const open = Math.pow(prog(t, 0, T0), 2) * 1300; if (t < T0) { c.save(); c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2, open + 1, 0, 7, true); c.fillStyle = C.light; c.fill("evenodd"); c.restore(); }
  const ex = Math.pow(prog(t, 16.7, 18), 2.2) * 1300; if (t > 16.7) { c.beginPath(); c.arc(cx, cy, ex, 0, 7); c.fillStyle = C.light; c.fill(); }
}

// ------------------------------------------------------------------ 5. honest live sliders, from the real model
const PATH = [[0, 5, 30, 0], [2.4, 5, 30, 0], [4.2, 1, 30, 0], [6.4, 1, 7.5, 0], [8.4, 5, 7.5, 0], [10.4, 5, 30, 0], [11.2, 5, 30, 1], [13.6, 2, 60, 1], [19, 2, 60, 1]];
function modelAt(dose, time, form) {
  const brack = (arr, v) => { let i = 0; while (i < arr.length - 2 && v > arr[i + 1]) i++; return [arr[i], arr[i + 1], clamp((v - arr[i]) / (arr[i + 1] - arr[i]))]; };
  const [d0, d1, kd] = brack(D.doses, dose), [t0, t1, kt] = brack(D.times, time), val = (f, k) => { const g = D.grid[f], a = g[`${d0}|${t0}`][k], b = g[`${d1}|${t0}`][k], p = g[`${d0}|${t1}`][k], q = g[`${d1}|${t1}`][k]; return mix(mix(a, b, kd), mix(p, q, kd), kt); };
  const o = {}; ["cipro", "ncl", "prod", "free", "combined"].forEach(k => o[k] = mix(val("free", k), val("chloramine", k), form)); return o;
}
function sceneSliders(c, t) {
  bg(c, C.light);
  let dose = 5, time = 30, form = 0; for (let i = 1; i < PATH.length; i++) if (t <= PATH[i][0]) { const a = PATH[i - 1], b = PATH[i], k = smooth(prog(t, a[0], b[0])); dose = mix(a[1], b[1], k); time = mix(a[2], b[2], k); form = mix(a[3], b[3], k); break; }
  const m = modelAt(dose, time, form);
  reveal(c, "WHAT WE CAN PREDICT TODAY", 96, 104, t, { size: 24, mono: true, color: C.blue }); reveal(c, "The model tracks the chemistry.", 96, 176, t, { at: .1, size: 60, w: 700, color: C.ink }); reveal(c, "Only the lab can measure the activity.", 96, 246, t, { at: 13.8, size: 60, w: 700, color: C.blue });
  const x = 96, w = 700; sliderRow(c, x, 372, w, "Chlorine dose", `${dose.toFixed(1)} mg/L`, (dose - .5) / 4.5); sliderRow(c, x, 502, w, "Contact time", `${Math.round(time)} min`, (time - 7.5) / 52.5); toggleRow(c, x, 632, w, "Chlorine form", form, "free", "chloramine");
  text(c, "Dechlorination", x, 742, { size: 32, w: 700, color: C.ink }); rrect(c, x + w - 300, 712, 300, 52, 26); c.strokeStyle = "#b8bfd6"; c.setLineDash([8, 8]); c.lineWidth = 2; c.stroke(); c.setLineDash([]); text(c, "rate not known yet", x + w - 150, 746, { size: 23, w: 700, align: "center", color: C.grey });
  text(c, "Bisulfite rate is set to 0 until we measure it.", x, 804, { size: 22, mono: true, w: 400, color: C.grey });
  const px = 880, py = 330, pw = 944, ph = 660; card(c, px, py, pw, ph, C.card, 28); const ix = px + 48, iw = pw - 96;
  text(c, "MODEL PREDICTION", ix, py + 58, { size: 22, mono: true, color: C.blue }); text(c, "Where the cipro went", ix, py + 110, { size: 36, w: 700, color: C.ink });
  const total = m.cipro + m.ncl + m.prod || 1, seg = [[m.cipro, C.sky, "Cipro"], [m.ncl, C.pink, "N-chloro-cipro"], [m.prod, C.amber, "Products"]]; let bx = ix; c.save(); rrect(c, ix, py + 136, iw, 64, 16); c.clip(); seg.forEach(([v, col]) => { const bw = iw * v / total; c.fillStyle = col; c.fillRect(bx, py + 136, bw, 64); bx += bw; }); c.restore();
  seg.forEach(([v, col, l], i) => { const lx = ix + i * iw / 3; c.beginPath(); c.arc(lx + 10, py + 240, 10, 0, 7); c.fillStyle = col; c.fill(); text(c, `${l} ${Math.round(v / total * 100)}%`, lx + 30, py + 250, { size: 26, w: 700, color: C.ink }); });
  const cl = m.free + m.combined; text(c, "Chlorine left", ix, py + 334, { size: 30, color: C.grey }); text(c, `${cl.toFixed(2)} mg/L`, ix + iw, py + 334, { size: 36, w: 800, align: "right", color: C.ink });
  c.strokeStyle = C.line; c.lineWidth = 2; c.beginPath(); c.moveTo(ix, py + 370); c.lineTo(ix + iw, py + 370); c.stroke();
  text(c, "Antibacterial activity left", ix, py + 430, { size: 36, w: 700, color: C.ink });
  const pulse = .55 + .45 * Math.sin(t * 3); rrect(c, ix, py + 456, iw, 74, 18); c.fillStyle = `rgba(255,95,158,${.07 + pulse * .07})`; c.fill(); c.strokeStyle = C.pink; c.setLineDash([10, 8]); c.lineWidth = 3; c.stroke(); c.setLineDash([]);
  text(c, "?  to be measured in the lab", ix + iw / 2, py + 506, { size: 34, w: 800, align: "center", color: "#d43b7c" });
  text(c, "Planned target: under 4.6% of starting activity", ix, py + 590, { size: 27, color: C.grey });
  foot(c, "Model output at pH 7.5, 1 mg/L cipro, no activity data. Chloramine: pre-formed, 4:1 Cl2:N.", C.grey, prog(t, 1, 2));
}

// ------------------------------------------------------------------ close
function sceneClose(c, t) {
  darkBg(c); reveal(c, "Measure the activity.", 96, 480, t, { at: .1, size: 96, w: 800 }); reveal(c, "Then tune the chlorine.", 96, 594, t, { at: .7, size: 96, w: 800, color: C.lime });
  reveal(c, "Removed isn't the same as safe.", 96, 690, t, { at: 1.5, size: 42, color: C.pink, w: 700 }); reveal(c, "SURYANSH GUPTA · RITIK SHENOY", 96, 770, t, { at: 2.1, size: 26, mono: true, color: C.dim });
}

window.SCENES = [
  { name: "Molecule", dur: 16, draw: sceneMolecule },
  { name: "Removed vs. Active", dur: 18, draw: sceneSplit },
  { name: "Drop to light", dur: 1.8, draw: (c, t) => sceneDrop(c, t, C.navy, C.light) },
  { name: "Settings act on water", dur: 13, draw: sceneQuestion },
  { name: "Coil ride", dur: 18, draw: sceneRide },
  { name: "Honest sliders", dur: 19, draw: sceneSliders },
  { name: "Drop to dark", dur: 1.8, draw: (c, t) => sceneDrop(c, t, C.light, C.navy) },
  { name: "Close", dur: 6, draw: sceneClose },
];
let acc = 0; SCENES.forEach(s => { s.start = acc; acc += s.dur; });
window.TOTAL = acc;
window.drawAt = function (c, time) {
  const s = SCENES.find(x => time < x.start + x.dur) || SCENES[SCENES.length - 1];
  c.save(); c.globalAlpha = 1; s.draw(c, Math.min(time - s.start, s.dur)); c.restore();
};
