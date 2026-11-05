// Removed Is Not Safe: facility pitch. A pure function of time; docs/shotlist.md is the plan.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { reactorSet } from './sets/reactor.js';
const { W, H, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, font, layout, glyph, text, fill, rrect, kf, mix, hash01, shake } = M;

const C = { navy: '#0A1033', navy2: '#151D52', ink: '#10163A', paper: '#EEF1F7', card: '#FFFFFF', blue: '#3B4FE0', sky: '#7F93FF', pink: '#FF5F9E', lime: '#D9F24F', amber: '#FFB340', grey: '#5C6588', dim: '#AAB3D6', white: '#F6F8FF', line: '#D6DBEA' };
const D = 'Display', UI = 'UI';
const S = {};

const HITS = [
  // Only moments that matter, and no sound used twice in a row. The music carries the rest.
  [2, 'chlorine drop', 'pop', { pitch: 'A5', to: 'D5', gain: .16 }],
  [11, '70 lands', 'tok', { pitch: 'D4', gain: .2 }],
  [16, 'title', 'thud', { pitch: 'D3', to: 'A2', gain: .28 }],
  [34.5, '22x', 'tok', { pitch: 'A3', gain: .2 }],
  [38, 'to light', 'whoosh', { len: .7, from: 2200, to: 800, gain: .1 }],
  [46, 'fourth dial', 'blip', { pitch: 'A5', gain: .1 }],
  [52, 'reactor', 'bell', { pitch: 'A5', gain: .13 }],
  [60, 'explode', 'whoosh', { len: .6, from: 500, to: 1500, gain: .09 }],
  [76, 'coil', 'whoosh', { len: .6, from: 900, to: 1900, gain: .08 }],
  [85, 'outlet', 'bell', { pitch: 'D6', gain: .09 }],
  [92, 'test twice', 'tok', { pitch: 'F#4', gain: .14 }],
  [108, 'predictions', 'blip', { pitch: 'D6', gain: .08 }],
  [112, 'steps', 'whoosh', { len: .6, from: 1900, to: 700, gain: .09 }],
  [126, 'report', 'bell', { pitch: 'A6', gain: .09 }],
  [132, 'removed gets measured', 'thud', { pitch: 'D3', to: 'A2', gain: .3 }],
  [140, 'be the first', 'tok', { pitch: 'A4', gain: .22 }],
  [143, 'slab falls', 'whoosh', { len: 1.1, from: 300, to: 2600, gain: .3 }], [144, 'slam', 'impact', { gain: .9 }], [144.5, 'settle', 'tok', { pitch: 'D4', gain: .18 }],
];

// Type: glyphs rise on springs, one after another, so nothing just fades in.
function say(ctx, str, x, y, size, color, u, u0, { w = 700, fam = D, align = 'left', cps = .018, cfg = SPRING.snappy, track } = {}) {
  const f = font(size, w, fam), L = layout(ctx, str, f, track ?? -.022 * size);
  const ox = align === 'center' ? -L.width / 2 : align === 'right' ? -L.width : 0;
  L.glyphs.forEach((g, j) => { const k = springU(u, u0 + j * cps, cfg); if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.4); glyph(ctx, g.ch, x + ox + g.cx, y + (1 - k) * size * .55, f, color); ctx.restore(); });
}
const body = (ctx, s, x, y, size, col, a = 1, align = 'left') => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = clamp(a); text(ctx, s, x, y, font(size, 500, UI), col, align); ctx.restore(); };
const credit = (ctx, s, col, a = 1, x = 96) => body(ctx, s, x, 1030, 24, col, a * .85);
function dropShape(ctx, x, y, r, col) { ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.bezierCurveTo(x + r * .35, y - r * .8, x + r, y - r * .3, x + r, y + r * .15); ctx.arc(x, y + r * .15, r, 0, Math.PI); ctx.bezierCurveTo(x - r, y - r * .3, x - r * .35, y - r * .8, x, y - r * 1.5); ctx.fillStyle = col; ctx.fill(); }
function logo(ctx, a = 1) { ctx.save(); ctx.globalAlpha = a; dropShape(ctx, 74, 64, 13, C.blue); text(ctx, 'Removed Is Not Safe', 98, 74, font(26, 700, D), C.ink); ctx.restore(); }
function card(ctx, x, y, w, h, col, r = 26) { ctx.save(); ctx.shadowColor = 'rgba(16,22,58,.14)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; rrect(ctx, x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); ctx.restore(); }

// ---- S1 hook: 100 dots = the drug. Exact counts from Kennedy Neth 2019 Fig. 2 (120 min): 28 left, 70 active.
const HOOK = (() => { const order = [...Array(100).keys()].sort((a, b) => hash01(a, 5) - hash01(b, 5)); const killed = new Set(order.slice(0, 72)); const active = new Set(order.slice(72)); order.slice(0, 42).forEach((i) => active.add(i)); return { killed, active }; })();
function hook(ctx, u) {
  fill(ctx, C.navy);
  const gx = 1040, gy = 170, gw = 700, gh = 790, wy = gy + 110, ix = gx + gw / 2;
  // the glass: one clean shape, no effects
  rrect(ctx, gx, wy, gw, gh - 110, 44); ctx.fillStyle = '#17307F'; ctx.fill();
  body(ctx, 'Water', ix, gy + 72, 40, '#9FB4F2', 1, 'center');
  const lift = E.outCubic(prog(u, 2, 2.5)) * (1 - prog(u, 2.5, 4)) * 12;
  ctx.fillStyle = '#2A3790'; rrect(ctx, gx, wy - lift * Math.sin(u * 30) * .3, gw, 5, 3); ctx.fill();
  ctx.strokeStyle = '#4A57A8'; ctx.lineWidth = 5; rrect(ctx, gx, gy, gw, gh, 48); ctx.stroke();
  // the chlorine drop, then one ripple
  const fall = E.inCubic(prog(u, 1, 2)); if (u > .6 && u < 2.02) dropShape(ctx, ix, lerp(-60, wy, fall), 24, C.lime);
  const rp = prog(u, 2, 4.2); if (rp > 0 && rp < 1) { ctx.save(); rrect(ctx, gx, wy, gw, gh - 110, 44); ctx.clip(); ctx.globalAlpha = (1 - rp) * .8; ctx.strokeStyle = C.lime; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(ix, wy + 340 * 0, 60 + rp * 900, (60 + rp * 900) * .9, 0, 0, Math.PI); ctx.stroke(); ctx.restore(); }
  const scan = gx - 30 + (gw + 60) * E.inOutSine(prog(u, 8.5, 11));
  let dead = 0, lit = 0;
  for (let r = 0; r < 10; r++) for (let q = 0; q < 10; q++) {
    const i = r * 10 + q, x0 = gx + 80 + q * 60, y0 = wy + 60 + r * 62, x = x0 + Math.sin(u * .9 + i) * 4, y = y0 + Math.cos(u * .7 + i * 1.7) * 4;
    const d = Math.hypot(x0 - ix, y0 - wy), tk = 2.05 + d / 640 * 2.5; const isKilled = HOOK.killed.has(i);
    const k = isKilled ? E.outCubic(prog(u, tk, tk + .35)) : 0; if (isKilled && u >= tk) dead++;
    let col = mix(C.amber, '#2B3672', k), rad = lerp(21, 13, k);
    if (HOOK.active.has(i) && x0 < scan) { const f = E.outBack(prog(u, 8.5 + (x0 - gx) / gw * 2.5, 8.8 + (x0 - gx) / gw * 2.5), 2.2); col = mix(col, C.pink, clamp(f)); rad = lerp(rad, 22, f); lit++; }
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, rad), 0, 7); ctx.fillStyle = col; ctx.fill();
  }
  if (scan > gx - 20 && scan < gx + gw + 20) { ctx.fillStyle = C.pink; ctx.fillRect(scan - 2.5, gy - 16, 5, gh + 32); }
  // words: one thought at a time, on the left
  const A = u < 7.9, out = E.inCubic(prog(u, 7.5, 7.9));
  ctx.save(); if (A) { ctx.translate(0, -out * 60); ctx.globalAlpha = 1 - out;
    say(ctx, 'Water plants use chlorine.', 96, 230, 72, C.white, u, -1.5); say(ctx, 'It hits antibiotics too.', 96, 322, 72, C.lime, u, -.6);
    if (u >= 2) { text(ctx, `${dead}%`, 96, 660, font(290, 700, D), C.amber, 'left', -7); say(ctx, 'of the antibiotic destroyed.', 96, 750, 56, C.white, u, 4.6, { cps: .012 }); }
  } ctx.restore();
  if (!A) {
    say(ctx, 'Now test it', 96, 240, 88, C.white, u, 7.8); say(ctx, 'on bacteria.', 96, 340, 88, C.pink, u, 8.1);
    if (u >= 8.5) { text(ctx, `${lit}%`, 96, 660, font(290, 700, D), C.pink, 'left', -7); say(ctx, "of the antibiotic's power", 96, 750, 56, C.white, u, 11, { cps: .012 }); say(ctx, 'to stop bacteria', 96, 820, 56, C.white, u, 11.4, { cps: .012 }); say(ctx, 'was still there.', 96, 890, 56, C.white, u, 11.8, { cps: .012 }); }
  }
  credit(ctx, 'Lab test: Kennedy Neth et al. 2019, lab water, 120 min after chlorine. Each dot is 1%.', C.dim, prog(u, 2, 3));
}
// ---- S2 the sentence
function title(ctx, u) {
  fill(ctx, C.navy);
  ctx.save(); shake(ctx, u, 16, 10);
  say(ctx, 'Removed', W / 2, 400, 190, C.white, u, 15.6, { align: 'center', cfg: SPRING.bouncy });
  say(ctx, "isn't the same as", W / 2, 550, 92, C.dim, u, 17.2, { align: 'center' });
  say(ctx, 'safe.', W / 2, 760, 190, C.pink, u, 18.2, { align: 'center', cfg: SPRING.bouncy });
  ctx.restore();
}
// ---- S2b why the leftover power matters. A trace can favour resistant bacteria: Gullberg et al. 2011 (cipro included).
function training(ctx, u) {
  fill(ctx, C.navy);
  say(ctx, 'Why that power matters:', 96, 200, 62, C.dim, u, 21.6, { w: 500, fam: UI });
  say(ctx, 'even a trace of antibiotic', 96, 300, 66, C.white, u, 22.2);
  say(ctx, 'can train bacteria.', 96, 385, 66, C.pink, u, 23);
  [['Normal bacteria slow down.', 26, C.sky], ['Resistant ones pull ahead.', 29, C.pink], ['Then they take over.', 32, C.white]].forEach(([t, at, col], i) => say(ctx, t, 96, 560 + i * 78, 50, col, u, at, { w: 500, fam: UI, cps: .012 }));
  credit(ctx, 'Lab study of antibiotics including cipro: Gullberg et al. 2011, PLoS Pathogens.', C.dim, prog(u, 24, 25));
  const cols = 11, rows = 12, gx = 1000, gy = 96, dx = 76, dy = 76, seeds = [[2, 2], [8, 3], [4, 8], [9, 9]];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const i = r * cols + q, seed = seeds.some(([a, b]) => a === q && b === r), near = Math.min(...seeds.map(([a, b]) => Math.hypot(a - q, b - r)));
    const x = gx + q * dx + Math.sin(u * .7 + i) * 4, y = gy + r * dy + Math.cos(u * .6 + i * 1.4) * 4, ang = hash01(i, 12) * 3.14 + Math.sin(u * .35 + i) * .12;
    const slow = E.inOutCubic(prog(u, 26 + hash01(i, 13), 27.4 + hash01(i, 13))), lit = seed ? E.outBack(prog(u, 29, 29.7), 2.4) : 0, takeover = E.outBack(prog(u, 32 + near * .32, 32.6 + near * .32), 2);
    const isPink = Math.max(lit, seed ? 0 : takeover), L = lerp(lerp(26, 18, slow), 28, clamp(isPink)), rad = lerp(lerp(12, 9, slow), 13, clamp(isPink));
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); rrect(ctx, -L, -rad, L * 2, rad * 2, rad); ctx.fillStyle = mix(mix(C.sky, '#2B3672', slow), C.pink, clamp(isPink)); ctx.fill(); ctx.restore();
  }
}
// ---- S3 the cost
function deaths(ctx, u) {
  fill(ctx, C.navy); const k = E.outExpo(prog(u, 22, 27)), n = Math.round(k * 1270000);
  for (let i = 0; i < 1400; i++) { const on = hash01(i, 4) < k; const x = (i % 70) * 28 - 14, y = Math.floor(i / 70) * 56; if (!on) continue; ctx.fillStyle = 'rgba(255,95,158,.22)'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
  text(ctx, n.toLocaleString('en-US'), W / 2, 590, font(230, 700, D), C.white, 'center', -6);
  say(ctx, 'deaths caused directly by drug-resistant bacteria, in one year.', W / 2, 690, 46, C.pink, u, 23.5, { align: 'center', w: 500, fam: UI, cps: .012 });
  credit(ctx, 'Murray et al. 2022, The Lancet (2019 data).', C.dim, prog(u, 24, 25));
}
// ---- S4 the path, then 22x
function path(ctx, u) {
  fill(ctx, C.navy); const nodes = ['Pill', 'Body', 'Drain', 'Plant', 'Bay'], y = 370, x0 = 200, dx = 380;
  say(ctx, 'After treatment, it can still reach the water.', 96, 170, 66, C.white, u, 30);
  const head = clamp((u - 30) / 3.1);
  ctx.strokeStyle = C.amber; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + head * dx * 4, y); ctx.stroke();
  nodes.forEach((n, i) => { const k = springU(u, 30 + i * .75, SPRING.bouncy), x = x0 + i * dx; if (k <= 0) return; ctx.fillStyle = i === 3 ? C.lime : C.amber; ctx.beginPath(); ctx.arc(x, y, 26 * k, 0, 7); ctx.fill(); body(ctx, n, x, y + 80, 40, C.white, k, 'center'); });
  const b = E.outExpo(prog(u, 33.8, 35)); const bx = 200, by = 640, maxW = 1200;
  body(ctx, 'Resistance limit: 0.064 µg/L', bx, by - 16, 34, C.dim, prog(u, 33, 33.5)); rrect(ctx, bx, by, maxW * (.064 / 1.4), 42, 8); ctx.fillStyle = C.sky; ctx.fill();
  body(ctx, 'Cipro measured leaving plants: up to 1.4 µg/L', bx, by + 100, 34, C.dim, prog(u, 33.4, 33.9)); if (b > 0) { rrect(ctx, bx, by + 116, maxW * b, 62, 8); ctx.fillStyle = C.amber; ctx.fill(); }
  const k22 = springU(u, 34.5, SPRING.bouncy); if (k22 > 0) text(ctx, '22×', 1450, by + 180, font(Math.max(10, 200 * k22), 700, D), C.white);
  credit(ctx, 'Batt et al. 2007; Bengtsson-Palme & Larsson 2016.', C.dim, prog(u, 34.5, 35.5));
}
// ---- S5 four dials
function dials(ctx, u) {
  fill(ctx, C.paper); logo(ctx);
  say(ctx, "A plant's dials show what it's asked to track.", 96, 200, 68, C.ink, u, 37.8);
  const items = [['Residual chlorine', 'measured'], ['Ammonia', 'measured'], ['Contact time', 'set by design'], ['Antibacterial activity', '?']];
  items.forEach(([a, b], i) => { const at = 40 + i * 2, k = springU(u, at, SPRING.bouncy); if (k <= 0) return; const w = 410, x = 96 + i * 434, y = 320 + (1 - k) * 60, isQ = i === 3;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.3); card(ctx, x, y, w, 340, isQ ? C.navy : C.card);
    const cx = x + w / 2, cy = y + 150, r = 84; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.strokeStyle = isQ ? '#2B356F' : C.line; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * .8, Math.PI * 2.2); ctx.stroke();
    if (!isQ) { const sw = E.outCubic(prog(u, at + .2, at + 1.3)) * [.68, .34, .55][i]; ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * .8, Math.PI * (.8 + 1.4 * sw)); ctx.stroke(); }
    else { const p = .7 + .3 * Math.sin((u - 46) * 3); text(ctx, '?', cx, cy + 46, font(130, 700, D), C.pink, 'center'); ctx.globalAlpha *= p; }
    ctx.globalAlpha = clamp(k * 1.3); text(ctx, a, cx, y + 290, font(i === 3 ? 37 : 40, 700, D), isQ ? C.white : C.ink, 'center'); ctx.restore(); });
  say(ctx, 'We want to add the fourth.', 96, 800, 76, C.blue, u, 48.5);
  credit(ctx, 'Example: San José–Santa Clara permit R2-2025-0027 limits residual chlorine and ammonia.', C.grey, prog(u, 41, 42));
}
// ---- S6 the prototype, the centrepiece
const LABELS = [['01', 'Feed + chlorine jugs', 'cipro water, 10× chlorine stock', 'jugs', [-7.6, 3.6, 0]], ['02', 'Two peristaltic pumps', '0.90 + 0.10 mL/min', 'pumps', [-4.8, 1.5, 0]], ['03', 'Raspberry Pi', 'sets flow, logs every run', 'pi', [-5.6, .3, 3.6]], ['04', 'Static mixer', 'blends chlorine evenly', 'mixer', [-1.7, .6, .1]], ['05', '3.8 m PTFE coil', '30 minutes of contact', 'coil', [2.3, 3.4, 0]], ['06', 'Sample vials', 'bisulfite in every vial', 'vials', [5.9, 1.3, 2.2]]];
function fracAt(min) { const R = window.RIDE; for (let i = 1; i < R.length; i++) if (min <= R[i][0]) { const a = R[i - 1], b = R[i], k = (min - a[0]) / (b[0] - a[0]); return { ncl: lerp(a[1], b[1], k), prod: lerp(a[2], b[2], k) }; } return { ncl: R[R.length - 1][1], prod: R[R.length - 1][2] }; }
function proto(ctx, u, t) {
  fill(ctx, C.paper);
  const keys = [[52, [-9, 11, 26, -0.5, 1, 0]], [55, [0, 7.4, 24.5, 0, 1.6, 0]], [60, [0, 10, 34, 0, 1.2, 0]], [69.4, [0, 7, 26, 0, 1.5, 0]], [70, [-8.2, 3, 9, -7.7, .9, .4]], [75.7, [-7, 3.2, 9.5, -7.5, .9, .4]], [76.3, [4.3, 5.2, 10.4, -.3, 1.8, 0]], [80, [6.2, 5, 9, -.2, 1.8, 0]], [85.7, [.8, 6, 11, -.2, 1.9, 0]], [86.4, [8.7, 2.5, 7.4, 3.7, 1.05, 1.8]], [92, [8, 2.3, 7.2, 3.7, 1.05, 1.8]]];
  const [cx, cy, cz, tx, ty, tz] = springKeys(u, keys, SPRING.gentle);
  const explode = E.inOutCubic(prog(u, 60, 61.6)) * (1 - E.inOutCubic(prog(u, 68.6, 70)));
  const flow = E.inOutCubic(prog(u, 76.5, 85));
  G.renderSet(ctx, S.reactor, t, u, { cam: [cx, cy, cz], target: [tx, ty, tz], explode, flow: u > 76 ? flow : 0, frac: fracAt, spin: u >= 70 && u < 76 ? 3 : 1.5 });
  if (u >= 70) { ctx.save(); ctx.globalAlpha = prog(u, 70, 70.8); const g = ctx.createLinearGradient(0, 0, 1000, 0); g.addColorStop(0, C.paper); g.addColorStop(.68, C.paper); g.addColorStop(1, 'rgba(238,241,247,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, H); ctx.restore(); }
  logo(ctx);
  if (u < 60) { say(ctx, 'So we designed a bench copy', 96, 190, 78, C.ink, u, 55); say(ctx, 'of your chlorine step.', 96, 280, 78, C.blue, u, 56); }
  if (u >= 60 && u < 69.6) { const a = 1 - prog(u, 68.8, 69.4);
    ctx.save(); ctx.globalAlpha = a; LABELS.forEach(([n, name, note, part, p], i) => { const at = 60.5 + i, q = prog(u, at, at + .45); if (q <= 0) return; const [ax, ay] = S.reactor.project(p, part, explode, W, H); const tw = 290, tx0 = 80 + i * 300, ly = 880;
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx0 + 16, ly - 40); ctx.lineTo(lerp(tx0 + 16, ax, q), lerp(ly - 40, ay, q)); ctx.stroke(); ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(lerp(tx0 + 16, ax, q), lerp(ly - 40, ay, q), 8, 0, 7); ctx.fill();
      ctx.save(); ctx.globalAlpha = q; text(ctx, n, tx0, ly, font(26, 700, D), C.blue); const nm = name.split(' + ').join(' + '); const ws = nm.split(' '); let l1 = '', l2 = ''; ws.forEach((w) => { if (!l2 && (l1 + ' ' + w).length <= 15) l1 = (l1 ? l1 + ' ' : '') + w; else l2 = (l2 ? l2 + ' ' : '') + w; }); text(ctx, l1, tx0, ly + 38, font(30, 700, D), C.ink); if (l2) text(ctx, l2, tx0, ly + 74, font(30, 700, D), C.ink); ctx.restore(); });
    ctx.restore(); say(ctx, 'Every part of the chlorine step, on one bench.', 96, 190, 66, C.ink, u, 60.2); }
  if (u >= 70 && u < 76) { say(ctx, 'Two pumps.', 96, 200, 76, C.ink, u, 70.3); say(ctx, 'Same chemistry.', 96, 290, 76, C.ink, u, 70.9); say(ctx, 'Hypochlorite, then bisulfite.', 96, 370, 46, C.blue, u, 71.6, { w: 500, fam: UI }); }
  if (u >= 76 && u < 86) { say(ctx, 'Thirty minutes of contact.', 96, 200, 76, C.ink, u, 76.6); const f = fracAt((u - 76.5) / 8.5 * 30);
    [['A', 7.5, 79], ['B', 15, 81], ['C', 22.5, 83]].forEach(([l, m, at], i) => { const k = springU(u, at, SPRING.bouncy); if (k <= 0) return; const [px, py] = S.reactor.project(S.reactor.coilPort(i), null, 0, W, H); const lx = px + 290 > W - 40 ? px - 260 : px + 30; card(ctx, lx, py - 40, 230, 70, C.navy, 35); ctx.save(); ctx.globalAlpha = clamp(k); text(ctx, `${l}  ${m} min`, lx + 115, py + 8, font(32, 700, D), C.lime, 'center'); ctx.restore(); });
    body(ctx, `Cipro + N-chloro-cipro: ${Math.round(f.ncl * 100)}%`, 96, 300, 36, C.pink, prog(u, 77, 78)); body(ctx, `Breakdown products: ${Math.round(f.prod * 100)}%`, 96, 350, 36, '#C77A00', prog(u, 77, 78)); }
  if (u >= 86) { say(ctx, 'Every sample', 96, 200, 76, C.ink, u, 86.6); say(ctx, 'dechlorinated,', 96, 290, 76, C.ink, u, 87); say(ctx, 'just like the plant.', 96, 380, 76, C.blue, u, 87.6); }
  const note = u < 76 || u >= 86 ? '3D design of our bench reactor.' : 'Our chemistry model at 5 mg/L chlorine, pH 7.5. Flow speed illustrative.';
  credit(ctx, note, C.grey, prog(u, 53, 54));
}
// ---- S7 two tests, on one clean moving plate
function measure(ctx, u) {
  fill(ctx, C.paper); logo(ctx); say(ctx, 'Then test every sample twice.', 96, 190, 78, C.ink, u, 91.6);
  const k1 = springU(u, 92, SPRING.gentle), k2 = springU(u, 97, SPRING.gentle), y = 280, h = 650, w = 830;
  const x1 = 96 + (1 - k1) * -W; card(ctx, x1, y, w, h, C.card); text(ctx, 'How much drug? (HPLC)', x1 + 44, y + 76, font(44, 700, D), C.ink);
  const fall = lerp(1, .28, E.inOutCubic(prog(u, 94.5, 96.5))); const bl = y + h - 70, base = x1 + 44, pw = w - 88;
  [[1, '#C8CDDD', 3], [fall, C.amber, 7]].forEach(([a, col, lw], idx) => { if (idx === 0 && u < 94.5) return; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(idx === 0 ? [10, 10] : []); ctx.beginPath(); for (let i = 0; i <= 160; i++) { const s = i / 160, v = a * Math.exp(-(((s - .55) / .05) ** 2)) * 400; const yy = bl - v; i ? ctx.lineTo(base + s * pw, yy) : ctx.moveTo(base + s * pw, yy); } ctx.stroke(); ctx.setLineDash([]); });
  const x2 = 994 + (1 - k2) * W; card(ctx, x2, y, w, h, C.card); text(ctx, 'How much activity? (bacteria)', x2 + 44, y + 76, font(44, 700, D), C.ink);
  for (let r = 0; r < 8; r++) for (let q = 0; q < 12; q++) { const i = r * 12 + q, on = springU(u, 99 + hash01(i, 9) * 2.4, SPRING.snappy); const cx = x2 + 96 + q * 58, cy = y + 150 + r * 54; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fillStyle = '#E7EAF3'; ctx.fill(); if (on > 0) { ctx.beginPath(); ctx.arc(cx, cy, 22 * Math.min(on, 1.1), 0, 7); ctx.fillStyle = hash01(i, 21) < .7 ? C.blue : C.pink; ctx.fill(); } }
  credit(ctx, 'Illustrations: trace and plate show what each test reads, not our results.', C.grey, prog(u, 93, 94));
}
// ---- S8 the model loop
function model(ctx, u) {
  fill(ctx, C.navy); say(ctx, 'A chemistry model picks', 96, 210, 78, C.white, u, 103.5); say(ctx, 'the next settings to try.', 96, 300, 78, C.lime, u, 104.8);
  const nodes = ['Run', 'Measure', 'Fit', 'Choose'], cx = 1400, cy = 500, R = 270;
  ctx.strokeStyle = C.sky; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + clamp((u - 104) / 4) * Math.PI * 2); ctx.stroke();
  nodes.forEach((n, i) => { const k = springU(u, 104 + i, SPRING.bouncy); if (k <= 0) return; const a = -Math.PI / 2 + i / 4 * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x, y, 92 * k, 0, 7); ctx.fill(); ctx.save(); ctx.globalAlpha = clamp(k); text(ctx, n, x, y + 13, font(38, 700, D), C.white, 'center'); ctx.restore(); });
  say(ctx, 'Then the real test:', 96, 590, 56, C.white, u, 108.2); say(ctx, 'predictions go public', 96, 670, 56, C.white, u, 108.6); say(ctx, 'before the lab runs.', 96, 750, 56, C.amber, u, 109.2);
}
// ---- S9 how it reaches a plant
function steps(ctx, u) {
  fill(ctx, C.paper); logo(ctx); say(ctx, 'How it reaches your plant.', 96, 200, 92, C.ink, u, 111.5);
  const items = [['1', 'Share your numbers', 'Dose, contact time, ammonia, pH.'], ['2', 'Send one sample', 'A small volume of effluent.'], ['3', 'We test the settings', 'At our bench. Drug and activity.'], ['4', 'Get a settings report', 'Your data, for your team.']];
  const lineK = clamp((u - 114) / 12); ctx.strokeStyle = C.blue; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(190, 370); ctx.lineTo(190 + lineK * 1420, 370); ctx.stroke();
  say(ctx, 'All four steps happen without touching your process.', 96, 890, 56, C.blue, u, 128.5);
  items.forEach(([n, a, b], i) => { const at = 114 + i * 4, k = springU(u, at, SPRING.bouncy); if (k <= 0) return; const x = 96 + i * 440, y = 400 + (1 - k) * 50, w = 410; ctx.save(); ctx.globalAlpha = clamp(k * 1.3);
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(x + 94, 370, 38, 0, 7); ctx.fill(); text(ctx, n, x + 94, 385, font(42, 700, D), C.white, 'center'); card(ctx, x, y + 34, w, 360, C.card); text(ctx, a.split(' ').slice(0, 2).join(' '), x + 34, y + 120, font(42, 700, D), C.ink); text(ctx, a.split(' ').slice(2).join(' '), x + 34, y + 172, font(42, 700, D), C.ink);
    const words = b.split(' '); let line = '', ly = y + 250; ctx.font = font(32, 500, UI); words.forEach((wd) => { const tr = line ? `${line} ${wd}` : wd; if (ctx.measureText(tr).width > w - 68) { text(ctx, line, x + 34, ly, font(32, 500, UI), C.grey); line = wd; ly += 44; } else line = tr; }); text(ctx, line, x + 34, ly, font(32, 500, UI), C.grey); ctx.restore(); });
}
// ---- close: a callback to the hook's dots, then the ask, then the name
function closing(ctx, u) {
  if (u < 140) {
    fill(ctx, C.navy);
    for (let r = 0; r < 12; r++) for (let q = 0; q < 21; q++) { const i = r * 21 + q, x = 60 + q * 90, y = 45 + r * 90, d = Math.hypot(x - W / 2, y - H / 2), tk = 136 + d / 1100 * 2.4, on = hash01(i, 7) < .7 ? E.outBack(prog(u, tk, tk + .5), 2) : 0;
      if (y > 310 && y < 720) continue; // keep the words on clean ground
      ctx.beginPath(); ctx.arc(x + Math.sin(u * .8 + i) * 3, y + Math.cos(u * .7 + i) * 3, lerp(8, 20, clamp(on)), 0, 7); ctx.fillStyle = mix('#1E2860', '#8C2F68', clamp(on)); ctx.fill(); }
    ctx.save(); shake(ctx, u, 136, 12);
    say(ctx, 'Removed gets measured.', W / 2, 455, 132, C.white, u, 131.6, { align: 'center', cfg: SPRING.bouncy, cps: .012 });
    say(ctx, "Let's measure what's left.", W / 2, 655, 132, C.lime, u, 135.6, { align: 'center', cfg: SPRING.bouncy, cps: .012 });
    ctx.restore();
  } else {
    slamEnding(ctx, u);
  }
}
// ---- the ending: one slide. A heavy navy slab carrying the name falls and lands on the sentence.
// Principles used: anticipation, gravity-style ease, stretch while falling, squash on contact, a shock that
// travels outward through the letters, debris, then a settle. All of it is worked out from u.
const SLAM = 144, SLAB_H = 505;
// A two-colour ending: deep indigo and a softer rose from the same family, with the same indigo for the words on rose.
const SLAB = '#1A1248', ROSE = '#FF8DB8', TINT = '#F8CFE0';
function slamEnding(ctx, u) {
  fill(ctx, ROSE);
  const fall = prog(u, SLAM - 1.1, SLAM), landed = u >= SLAM, dt = u - SLAM;
  const slabY = landed ? -Math.abs(Math.exp(-3.6 * dt) * Math.sin(3.24 * dt)) * 46 : -SLAB_H - 80 + (SLAB_H + 80) * fall * fall * fall;
  const edge = slabY + SLAB_H;
  // The line starts in the true centre of the frame. The slab drives it down into the centre of the rose area.
  const CENTRE = 508, PUSHED = 760, GAP = PUSHED - 100 - SLAB_H, push = clamp(edge + GAP + 100 - CENTRE, 0, 400);
  ctx.save(); if (landed) M.shake(ctx, u, SLAM, 20, 3, .28);
  const lines = [['Be the first plant', 0, 136], ['to know.', 165, 136]];
  lines.forEach(([str, dyLine, size], li) => {
    const f = font(size, 700, D), L = layout(ctx, str, f, -.022 * size), x0 = W / 2 - L.width / 2;
    L.glyphs.forEach((g, j) => {
      const inK = springU(u, 139.5 + li * 1.1 + j * .012, SPRING.bouncy); if (inK <= 0) return;
      const gx = x0 + g.cx, d = Math.abs(gx - W / 2) / (W / 2), t = (u - SLAM - d * .34 - li * .1) * M.GRID_PERIOD();
      const hit = t > 0 ? Math.exp(-5.2 * t) * Math.cos(16 * t) : 0;   // the shock reaches the outer letters last
      const sy = 1 - .3 * hit, sx = 1 + .16 * hit, dy = 30 * hit * (li === 0 ? 1 : .55);
      ctx.save(); ctx.globalAlpha = clamp(inK * 1.4); glyph(ctx, g.ch, gx, CENTRE + push + dyLine + dy + (1 - inK) * size * .5, f, SLAB, sx, sy * Math.min(inK, 1.15)); ctx.restore();
    });
  });
  if (landed && dt < 5) for (let i = 0; i < 40; i++) { const side = hash01(i, 31) < .5 ? -1 : 1, x0 = W / 2 + side * (hash01(i, 32) * W * .5), v = 300 + hash01(i, 33) * 900, sec = dt * M.GRID_PERIOD(), x = x0 + side * v * .55 * sec, y = SLAB_H + 4 - (v * .9 * sec - 900 * sec * sec), a = 1 - prog(dt, 1 + hash01(i, 35), 3); if (y > H + 20 || a <= 0) continue; const r = 3 + hash01(i, 34) * 8; ctx.fillStyle = i % 3 ? SLAB : '#FFF'; ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(0, slabY);
  ctx.fillStyle = SLAB; ctx.fillRect(-40, -700, W + 80, 700 + SLAB_H);
  const stretch = !landed ? 1 + .34 * fall * fall : 1 - .2 * Math.exp(-5 * dt) * Math.cos(9 * dt), squash = 2 - stretch;
  ctx.save(); ctx.translate(W / 2, 330); ctx.scale(squash, stretch); ctx.translate(-W / 2, -330);
  dropShape(ctx, W / 2, 118, 38, ROSE);
  text(ctx, 'Removed Is Not Safe', W / 2, 332, font(156, 700, D), C.white, 'center', -3.4);
  ctx.restore();
  ctx.restore();
  ctx.restore();
  if (landed && dt < 1.6) { const k = dt / 1.6, a = (1 - k) ** 2; ctx.fillStyle = `rgba(255,255,255,${a * .8})`; ctx.fillRect(0, SLAB_H - 4, W, 4 + 38 * (1 - k)); ctx.strokeStyle = `rgba(26,18,72,${a * .5})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(W / 2, SLAB_H, 80 + k * 1300, 20 + k * 420, 0, 0, Math.PI); ctx.stroke(); }
  say(ctx, 'Suryansh Gupta + Ritik Shenoy', W / 2, 432, 44, TINT, u, 146.2, { align: 'center', w: 500, fam: UI, cps: .01 });
  const fade = prog(u, 151, 152); if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}
// transitions: one shape carries the eye; a push, not a fade.
function grow(ctx, u, a, b, x, y, col) { const k = prog(u, a, b); if (k <= 0 || k >= 1) return; const r = 20 * (1400 / 20) ** E.inCubic(k) * 1.5; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

M.film({
  fonts: [font(100, 700, D), font(40, 500, UI)],
  hits: [...HITS.map((h) => (h[0] >= 22 ? [h[0] + 16, ...h.slice(1)] : h)), [24, 'trains', 'tok', { pitch: 'F4', gain: .16 }], [29, 'resistant', 'blip', { pitch: 'A5', gain: .09 }], [32, 'take over', 'whoosh', { len: 1.2, from: 400, to: 1500, gain: .08 }]].sort((a, b) => a[0] - b[0]),
  samples: (t) => { const u = M.U(t) - 16; return u >= 52 && u < 92 ? 6 : 12; },
  async init() { await G.initGL({}); S.reactor = reactorSet(); const r = await fetch('assets/ride.json').then((x) => x.json()); window.RIDE = r; },
  draw(ctx, uReal, t) {
    if (uReal >= 22 && uReal < 38) { training(ctx, uReal); return; }
    const u = uReal >= 38 ? uReal - 16 : uReal;
    if (u < 16) hook(ctx, u);
    else if (u < 22) title(ctx, u);
    else if (u < 30) deaths(ctx, u);
    else if (u < 38) { path(ctx, u); grow(ctx, u, 37.2, 38, 1720, 370, C.paper); }
    else if (u < 52) { dials(ctx, u); }
    else if (u < 92) proto(ctx, u, t);
    else if (u < 104) { measure(ctx, u); grow(ctx, u, 103.2, 104, W / 2, H / 2, C.navy); }
    else if (u < 112) { model(ctx, u); grow(ctx, u, 111.2, 112, 1400, 500, C.paper); }
    else if (u < 132) { steps(ctx, u); grow(ctx, u, 131.2, 132, 1520, 370, C.navy); }
    else closing(ctx, u);
  },
});
