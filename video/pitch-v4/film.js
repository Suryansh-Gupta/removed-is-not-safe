// Removed Is Not Safe: facility pitch. A pure function of time; docs/shotlist.md is the plan.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { reactorSet } from './sets/reactor.js';
const { W, H, E, prog, lerp, clamp, springU, springKeys, SPRING, wobble, font, layout, glyph, text, fill, rrect, kf, mix, hash01, shake } = M;

const C = { navy: '#0A1033', navy2: '#151D52', ink: '#10163A', paper: '#EEF1F7', card: '#FFFFFF', blue: '#3B4FE0', sky: '#7F93FF', pink: '#FF5F9E', lime: '#D9F24F', amber: '#FFB340', grey: '#5C6588', dim: '#AAB3D6', white: '#F6F8FF', line: '#D6DBEA' };
const D = 'Display', UI = 'UI';
const S = {};

const HITS = [
  [0, 'amber screen', 'sub', { len: 1.2 }], [1, 'level starts falling', 'whoosh', { len: .9, from: 2400, to: 300 }],
  [4.5, 'lands at 28', 'thud', { pitch: 'E2', to: 'A1' }], [5, 'word destroyed', 'tok', { pitch: 'A3' }],
  [7.8, 'whip to pink', 'whoosh', { len: .45, from: 500, to: 3800 }], [8, 'pink screen', 'click'],
  [10.8, 'level stops at 70', 'tok', { pitch: 'D3' }], [11.2, 'sentence', 'sub', { len: 1.8 }],
  [14, 'split', 'blip', { pitch: 'D5' }],
  [16, 'title slam', 'impact'], [17.5, 'isnt', 'tok', { pitch: 'D4' }], [18.2, 'safe', 'bell', { pitch: 'A5' }],
  [21.7, 'to deaths', 'whoosh', { len: .4, from: 3000, to: 500 }], [22, 'deaths counter', 'thud'], [27, 'counter lands', 'sub', { len: .9 }],
  [29.7, 'to path', 'whoosh', { len: .35, from: 500, to: 2600, pan: .4 }],
  [30, 'node 1', 'blip', { pitch: 'D5' }], [30.75, 'node 2', 'blip', { pitch: 'F5' }], [31.5, 'node 3', 'blip', { pitch: 'A5' }], [32.25, 'node 4', 'blip', { pitch: 'C6' }], [33, 'node 5', 'blip', { pitch: 'D6' }],
  [34.5, '22x bar', 'riser', { len: .6 }], [34.5, '22x', 'thud', { pitch: 'F2', to: 'D1' }],
  [37.6, 'dot grows', 'swell', { len: .9 }], [38, 'light world', 'crash', { len: 1.2 }],
  [40, 'dial 1', 'bell', { pitch: 'D5' }], [42, 'dial 2', 'bell', { pitch: 'F#5' }], [44, 'dial 3', 'bell', { pitch: 'A5' }], [46, 'dial 4', 'thud', { pitch: 'C3', to: 'A1' }], [48.5, 'fourth dial line', 'tok', { pitch: 'E4' }],
  [51, 'into 3D', 'riser', { len: 1.2 }], [52, 'reactor', 'impact'], [55, 'headline', 'pop', { pitch: 'A5' }],
  [60, 'explode', 'whoosh', { len: .6, from: 300, to: 2000 }], [60.5, 'label 1', 'click', { pan: -.5 }], [61.5, 'label 2', 'click', { pan: -.3 }], [62.5, 'label 3', 'click', { pan: -.1 }], [63.5, 'label 4', 'click', { pan: .1 }], [64.5, 'label 5', 'click', { pan: .3 }], [65.5, 'label 6', 'click', { pan: .5 }],
  [69.2, 'reassemble', 'boing', { pitch: 'D4', to: 'D3' }], [70, 'pump close-up', 'thud'],
  [75.6, 'to coil', 'whoosh', { len: .5, from: 900, to: 3200, pan: .3 }], [79, 'port A', 'bell', { pitch: 'D6' }], [81, 'port B', 'bell', { pitch: 'F#6' }], [83, 'port C', 'bell', { pitch: 'A6' }], [85, 'outlet', 'bell', { pitch: 'D7' }],
  [86, 'to vials', 'whoosh', { len: .4, from: 2000, to: 800 }], [87, 'vial', 'tok', { pitch: 'E5' }], [87.5, 'vial', 'tok', { pitch: 'G5' }], [88, 'vial', 'tok', { pitch: 'B5' }],
  [91.6, 'to measure', 'whoosh', { len: .45, from: 700, to: 3000 }], [92, 'card 1', 'thud', { pitch: 'A2', to: 'E2' }], [94.5, 'peak falls', 'pop', { pitch: 'A4', to: 'E4' }], [97, 'card 2', 'thud', { pitch: 'D3', to: 'A2' }], [99, 'plate', 'coins'],
  [103.6, 'to model', 'whoosh', { len: .4, from: 3000, to: 700 }], [104, 'loop 1', 'tok', { pitch: 'D4' }], [105, 'loop 2', 'tok', { pitch: 'F#4' }], [106, 'loop 3', 'tok', { pitch: 'A4' }], [107, 'loop 4', 'tok', { pitch: 'D5' }], [108.5, 'posted', 'type', { n: 8, len: 1.1 }],
  [111.6, 'to steps', 'swell', { len: .6 }], [112, 'steps headline', 'impact', { gain: .45 }],
  [114, 'step 1', 'pop', { pitch: 'D5' }], [118, 'step 2', 'pop', { pitch: 'F#5' }], [122, 'step 3', 'pop', { pitch: 'A5' }], [126, 'step 4', 'bell', { pitch: 'D6' }], [128.5, 'line', 'tok', { pitch: 'A5' }],
  [132, 'nothing changes', 'sub', { len: 1.6 }], [136, 'your team', 'bell', { pitch: 'A5' }],
  [140, 'priorities', 'click'], [144, 'winter', 'blip', { pitch: 'E6' }],
  [147.4, 'drop', 'whoosh', { len: .55, from: 3000, to: 500 }], [148, 'end card', 'impact'], [152, 'one conversation', 'tok', { pitch: 'D5' }], [153, 'one sample', 'tok', { pitch: 'F#5' }], [154, 'numbers', 'tok', { pitch: 'A5' }], [156, 'names', 'bell', { pitch: 'D6' }],
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

// ---- S1 hook: the screen IS the meter. Real numbers: Kennedy Neth 2019 Fig. 2, 120 min.
function level(ctx, x, w, frac, col) { const y = H * (1 - frac), wave = 10 * Math.sin(frac * 30); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x, y + wave); for (let i = 0; i <= 12; i++) ctx.lineTo(x + w * i / 12, y + Math.sin(i * .8 + frac * 40) * 7); ctx.lineTo(x + w, H); ctx.closePath(); ctx.fill(); }
function hook(ctx, u) {
  fill(ctx, C.navy);
  const whip = E.inOutCubic(prog(u, 7.75, 8.25)), split = E.inOutCubic(prog(u, 14, 15));
  const drugLeft = lerp(1, .28, E.inOutCubic(prog(u, 1, 4.6))), powerLeft = lerp(1, .7, E.outCubic(prog(u, 8.4, 10.8)));
  const aW = lerp(W, W / 2, split);
  const ax = lerp(-whip * W, 0, split), bx = lerp(W - whip * W, W / 2, split);
  ctx.save(); ctx.beginPath(); ctx.rect(ax, 0, aW, H); ctx.clip(); fill(ctx, '#2A1C14'); level(ctx, ax, aW, drugLeft, C.amber);
  const pct = Math.round((1 - drugLeft) * 100);
  if (split <= .02) { text(ctx, `${pct}%`, ax + W / 2, 600, font(330, 700, D), drugLeft > .55 ? C.navy : C.white, 'center', -8); say(ctx, 'Chlorine destroyed', ax + 96, 170, 74, drugLeft > .84 ? C.navy : C.white, u, -1.2); say(ctx, 'of this antibiotic.', ax + W / 2, 730, 62, drugLeft > .4 ? C.navy : C.white, u, 4.8, { align: 'center' }); }
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(bx, 0, aW, H); ctx.clip(); fill(ctx, '#2C1224'); level(ctx, bx, aW, powerLeft, C.pink);
  if (split <= .02) { text(ctx, `${Math.round(powerLeft * 100)}%`, bx + W / 2, 600, font(330, 700, D), C.navy, 'center', -8); say(ctx, 'of its power was still there.', bx + W / 2, 730, 66, C.navy, u, 11.2, { align: 'center', cps: .03 }); }
  ctx.restore();
  if (split > .02) { const a = prog(u, 14.6, 15.2);
    ctx.save(); ctx.globalAlpha = a; text(ctx, '28%', W / 4, 580, font(190, 700, D), C.white, 'center', -5); text(ctx, 'of the drug left', W / 4, 640, font(40, 500, UI), C.white, 'center');
    text(ctx, '70%', W * 3 / 4, 500, font(190, 700, D), C.navy, 'center', -5); text(ctx, 'of its activity left', W * 3 / 4, 560, font(40, 500, UI), C.navy, 'center'); ctx.restore();
    credit(ctx, 'Kennedy Neth et al. 2019: lab water, 120 min after chlorine.', C.navy, a, W / 2 + 40); }
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
  if (u >= 70) { ctx.save(); ctx.globalAlpha = prog(u, 70, 70.8); const g = ctx.createLinearGradient(0, 0, 1000, 0); g.addColorStop(0, C.paper); g.addColorStop(.72, 'rgba(238,241,247,.86)'); g.addColorStop(1, 'rgba(238,241,247,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, H); ctx.restore(); }
  logo(ctx);
  if (u < 60) { say(ctx, 'So we designed a bench copy', 96, 190, 78, C.ink, u, 55); say(ctx, 'of your chlorine step.', 96, 280, 78, C.blue, u, 56); }
  if (u >= 60 && u < 69.6) { const a = 1 - prog(u, 68.8, 69.4);
    ctx.save(); ctx.globalAlpha = a; LABELS.forEach(([n, name, note, part, p], i) => { const at = 60.5 + i, q = prog(u, at, at + .45); if (q <= 0) return; const [ax, ay] = S.reactor.project(p, part, explode, W, H); const tw = 290, tx0 = 80 + i * 300, ly = 880;
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx0 + 16, ly - 40); ctx.lineTo(lerp(tx0 + 16, ax, q), lerp(ly - 40, ay, q)); ctx.stroke(); ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(lerp(tx0 + 16, ax, q), lerp(ly - 40, ay, q), 8, 0, 7); ctx.fill();
      ctx.save(); ctx.globalAlpha = q; text(ctx, n, tx0, ly, font(26, 700, D), C.blue); const nm = name.split(' + ').join(' + '); const ws = nm.split(' '); let l1 = '', l2 = ''; ws.forEach((w) => { if (!l2 && (l1 + ' ' + w).length <= 15) l1 = (l1 ? l1 + ' ' : '') + w; else l2 = (l2 ? l2 + ' ' : '') + w; }); text(ctx, l1, tx0, ly + 38, font(30, 700, D), C.ink); if (l2) text(ctx, l2, tx0, ly + 74, font(30, 700, D), C.ink); ctx.restore(); });
    ctx.restore(); say(ctx, 'Every part of the chlorine step, on one bench.', 96, 190, 66, C.ink, u, 60.2); }
  if (u >= 70 && u < 76) { say(ctx, 'Two pumps. Same chemistry.', 96, 200, 70, C.ink, u, 70.3); say(ctx, 'Hypochlorite in. Bisulfite out.', 96, 280, 54, C.blue, u, 71.5, { w: 500, fam: UI }); }
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
function promise(ctx, u) {
  fill(ctx, C.navy); say(ctx, 'Nothing changes at your plant', W / 2, 460, 92, C.white, u, 131.6, { align: 'center' }); say(ctx, 'until your team decides.', W / 2, 590, 92, C.lime, u, 136, { align: 'center' });
}
function priorities(ctx, u) {
  fill(ctx, C.paper); logo(ctx); say(ctx, 'Disinfection and permits come first.', 96, 440, 88, C.ink, u, 139.5); say(ctx, 'Bench runs begin this winter.', 96, 570, 88, C.blue, u, 144.2);
}
function ending(ctx, u) {
  fill(ctx, C.navy); const k = springU(u, 148, SPRING.bouncy);
  say(ctx, "We're looking for our", 96, 300, 116, C.white, u, 147.5); say(ctx, 'first plant partner.', 96, 430, 116, C.lime, u, 149.2, { cfg: SPRING.bouncy });
  say(ctx, 'One conversation.', 96, 570, 52, C.white, u, 152, { w: 500, fam: UI }); say(ctx, 'One sample.', 560, 570, 52, C.white, u, 153, { w: 500, fam: UI }); say(ctx, 'Your operating numbers.', 880, 570, 52, C.white, u, 154, { w: 500, fam: UI });
  say(ctx, 'Suryansh Gupta + Ritik Shenoy', 96, 760, 52, C.white, u, 156); say(ctx, 'github.com/Suryansh-Gupta/removed-is-not-safe', 96, 830, 44, C.sky, u, 156.8, { w: 500, fam: UI, cps: .008 });
  const fade = prog(u, 162.6, 164); if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade})`; ctx.fillRect(0, 0, W, H); }
}
// transitions: one shape carries the eye; a push, not a fade.
function grow(ctx, u, a, b, x, y, col) { const k = prog(u, a, b); if (k <= 0 || k >= 1) return; const r = 20 * (1400 / 20) ** E.inCubic(k) * 1.5; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

M.film({
  fonts: [font(100, 700, D), font(40, 500, UI)],
  hits: HITS,
  samples: (t) => { const u = t / .6; return u >= 52 && u < 92 ? 6 : 12; },
  async init() { await G.initGL({}); S.reactor = reactorSet(); const r = await fetch('assets/ride.json').then((x) => x.json()); window.RIDE = r; },
  draw(ctx, u, t) {
    if (u < 16) hook(ctx, u);
    else if (u < 22) title(ctx, u);
    else if (u < 30) deaths(ctx, u);
    else if (u < 38) { path(ctx, u); grow(ctx, u, 37.2, 38, 1720, 370, C.paper); }
    else if (u < 52) { dials(ctx, u); }
    else if (u < 92) proto(ctx, u, t);
    else if (u < 104) { measure(ctx, u); grow(ctx, u, 103.2, 104, W / 2, H / 2, C.navy); }
    else if (u < 112) { model(ctx, u); grow(ctx, u, 111.2, 112, 1400, 500, C.paper); }
    else if (u < 132) { steps(ctx, u); grow(ctx, u, 131.2, 132, 1520, 370, C.navy); }
    else if (u < 140) { promise(ctx, u); grow(ctx, u, 139.2, 140, W / 2, 560, C.paper); }
    else if (u < 148) { priorities(ctx, u); grow(ctx, u, 147.1, 148, 74, 64, C.navy); }
    else ending(ctx, u);
  },
});
