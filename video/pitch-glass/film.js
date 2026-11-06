// Removed Is Not Safe: liquid glass pitch. One piece of glass carries the whole story: it falls as a drop, splits
// into a plant's dials, stretches into the two results, becomes a lens, a bead, the reactor, the tests, the settings,
// and goes back to a drop. Native in both shapes, no monitor. A pure function of time; docs/shotlist.md is the plan.
import * as M from './lib/motion.js';
import { makeGlass } from './lib/glass.js';
const { W, H, E, prog, lerp, clamp, kf, springKeys, wobble, rrect, hash01, mulberry32, FORMAT } = M;

const PT = FORMAT.portrait, CX = W / 2, MY = PT ? 900 : 540;
const D = 'Display', UI = 'UI';
const WHITE = '#F7FBFF', INK = '#07162E', SLATE = '#2B4058', ICE = '#A8F2FA', GOLD = '#FFD978';
const SIZE = { h1: PT ? 108 : 104, h2: PT ? 58 : 54, label: PT ? 46 : 42, note: PT ? 32 : 30 };

// Same six one-off sounds and the same score timing as the keynote cut.
const HITS = [
  [3, 'drop lands', 'pop', { pitch: 'A5', to: 'D6', gain: .12 }],
  [6, 'splits', 'tick', { gain: .3 }],
  [29, 'heat', 'swell', { len: 1.2, gain: .16 }],
  [42, 'safe', 'thud', { pitch: 'D3', to: 'A2', gain: .34 }],
  [50, 'reactor', 'whoosh', { len: .8, from: 500, to: 2800, gain: .2 }],
  [71, 'pale', 'bell', { pitch: 'D6', gain: .16 }],
];

// ------------------------------------------------------------- the glowing field: never black, always something to bend
const b = (a, x, y, sx, sy) => ({ a, x, y, sx, sy });
const ST = {
  a: [b(.72, .86, .1, .42, .26), b(.82, .08, .92, .5, .3), b(.3, .5, .55, .6, .34), b(.3, .95, .75, .25, .2)],
  b: [b(.8, .1, .12, .44, .26), b(.72, .92, .86, .5, .3), b(.34, .5, .5, .7, .36), b(.26, .1, .7, .25, .2)],
  mid: [b(.46, .5, .52, .9, .4), b(.8, .92, .08, .36, .2), b(.8, .06, .96, .4, .22), b(.2, .1, .3, .2, .2)],
  low: [b(.86, .5, 1.02, .85, .24), b(.34, .5, .06, .8, .16), b(.2, .1, .5, .3, .3), b(.2, .9, .5, .3, .3)],
  high: [b(.86, .5, -.02, .85, .24), b(.3, .5, .96, .8, .16), b(.2, .9, .5, .3, .3), b(.2, .1, .5, .3, .3)],
  sides: [b(.74, -.02, .5, .3, .55), b(.74, 1.02, .5, .3, .55), b(.14, .5, .5, .4, .4), b(.14, .5, .5, .4, .4)],
  pale: [b(.9, .15, .1, .55, .3), b(.8, .9, .9, .55, .3), b(.2, .5, .5, .5, .3), b(.2, .5, .5, .5, .3)],
};
// [beat the state is reached, state]
const FK = [[-1, 'a'], [3.4, 'b'], [8, 'mid'], [14.6, 'low'], [19.5, 'mid'], [26, 'high'], [31, 'mid'], [39.6, 'sides'], [45.5, 'low'], [51, 'a'], [55, 'b'], [59, 'mid'], [64.8, 'low'], [69.5, 'a'], [71, 'pale'], [99, 'pale']];
const blobsAt = (u) => { let i = 0; while (i < FK.length - 2 && u >= FK[i + 1][0]) i++; const [ua, sa] = FK[i], [ub, sb] = FK[i + 1], p = E.inOutSine(prog(u, Math.max(ua, ub - 2.4), ub)); return ST[sa].map((o, j) => { const c = ST[sb][j], w = 1 + .05 * Math.sin(u * .45 + j * 2); return b(lerp(o.a, c.a, p) * w, lerp(o.x, c.x, p) + .012 * Math.sin(u * .25 + j * 1.7), lerp(o.y, c.y, p) + .01 * Math.cos(u * .2 + j), lerp(o.sx, c.sx, p), lerp(o.sy, c.sy, p)); }); };
const heatAt = (u) => (u < 49.7 ? E.inOutCubic(prog(u, 28.4, 29.3)) : 1 - E.inOutCubic(prog(u, 49.7, 50.8)));

// ------------------------------------------------------------- type
const ff = (size, w = 550, fam = D) => `${w} ${size}px ${fam}`;
// One line of words, each comes in soft and settles sharp. [word, beat, colour?]
function words(ctx, list, y, size, u, { w = 580, x = CX, align = 'center', out = 1e9, outDur = .8, col = WHITE, fam = D, gap = .27, track = -.018, shadow = true } = {}) {
  if (u >= out + outDur) return;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = ff(size, w, fam); ctx.letterSpacing = `${size * track}px`;
  const ws = list.map(([s]) => ctx.measureText(s).width), sp = size * gap, tot = ws.reduce((a, c) => a + c, 0) + sp * (list.length - 1);
  let px = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
  const q = E.inCubic(prog(u, out, out + outDur));
  list.forEach(([s, u0, c], i) => {
    const k = E.outCubic(prog(u, u0, u0 + .8));
    if (k > 0) { const blur = (1 - k) * size * .16 + q * size * .18; ctx.save(); ctx.globalAlpha = clamp(k * 1.3) * (1 - q); if (blur > .3) ctx.filter = `blur(${blur.toFixed(1)}px)`; if (shadow) { ctx.shadowColor = 'rgba(2,8,34,.42)'; ctx.shadowBlur = size * .3; } ctx.fillStyle = c || col; ctx.fillText(s, px + (1 - k) * size * .16, y); ctx.restore(); }
    px += ws[i] + sp;
  });
  ctx.letterSpacing = '0px';
}
const LH = (s) => s * 1.14;
// Several centred lines, one block, centred on y. Lines = arrays of [word, beat, colour?]
function block(ctx, lines, y, size, u, o = {}) { const y0 = y - (lines.length - 1) * LH(size) / 2 + size * .35; lines.forEach((l, i) => words(ctx, l, y0 + i * LH(size), size, u, o)); }
const note = (ctx, lines, y, u0, u, out) => lines.forEach((s, i) => words(ctx, [[s, u0]], y + i * SIZE.note * 1.3, SIZE.note, u, { fam: UI, w: 500, track: 0, out, col: 'rgba(247,251,255,.84)' }));

// ------------------------------------------------------------- the one piece of glass: four slots that split and merge
const CW = PT ? 900 : 1320;                        // content width
const PILL = { w: PT ? 880 : 960, h: PT ? 58 : 48 }, GAP = PT ? 156 : 126, STACK = (i) => MY + 40 + (i - 1.5) * GAP;
const GA = PT ? 500 : 250, GB = PT ? 1120 : 700, GH = PT ? 42 : 34, GL = CX - CW / 2, GW = CW;   // gauges
const R = (x, y, hw, hh, r = 1e4, drop = 0, m = 1) => [x, y, hw, hh, Math.min(r, hw, hh), drop, m];
const pillAt = (i) => R(CX, STACK(i), PILL.w / 2, PILL.h);
const DROPY = MY + (PT ? 260 : 190);
const gaugeHome = (y) => R(GL + GH, y, GH, GH);
const IMW = PT ? 960 : 1240, IMH = IMW * 470 / 1280;
const card = R(CX, MY - 20, IMW / 2 + 22, IMH / 2 + 22, 52);
const TESTS = [R(CX, MY + 20, PILL.w / 2, PILL.h), R(CX, MY + 20 + GAP, PILL.w / 2, PILL.h)];
const TRACK = (i) => MY - 40 + i * (PT ? 210 : 165), TL = CX - PILL.w / 2 + 50, TW = PILL.w - 100;
const knob = (i, f) => R(TL + TW * f, TRACK(i), 54, 40);
const TITLE = PT
  ? [[CX - 300, MY - 220], [CX + 300, MY - 220], [CX, MY], [CX, MY + 225]]
  : [[CX - 620, MY], [CX - 230, MY], [CX + 110, MY], [CX + 420, MY]];
const LENS = PT ? 150 : 130;
const lens = (p) => R(p[0], p[1], LENS, LENS);
const BEADY = MY - (PT ? 350 : 220), bead = R(CX, BEADY, 34, 34), ANT = R(CX, MY + (PT ? 130 : 110), PILL.w / 2, PILL.h);
const off = (r) => { const c = r.slice(); c[2] = c[3] = c[4] = c[5] = c[6] = 0; return c; };
const D0 = R(CX, DROPY, 74, 74, 74, 1);
const END_DROP = R(CX, PT ? 700 : 340, 92, 92, 92, 1);
// Keys chase with a critically damped spring: nothing was thrown, so nothing bounces (Apple's rule, via apple-motion-feel).
const CFG = { stiffness: 190, damping: 27 };
const KEYS = [
  [[-9, D0], [6.1, pillAt(0)], [14.2, D0], [18.2, gaugeHome(GA)], [39.0, lens(TITLE[0])], [40.2, lens(TITLE[1])], [40.7, lens(TITLE[2])], [41.6, lens(TITLE[3])], [42.7, bead], [50, card], [54.1, TESTS[0]], [58.1, knob(0, .25)], [59.6, knob(0, .62)], [64.1, ANT], [69.5, R(CX, MY - 20, 86, 86, 86, 1)]],
  [[-9, off(pillAt(0))], [7, pillAt(1)], [14.2, off(D0)], [28.7, off(gaugeHome(GB))], [29, gaugeHome(GB)], [38.9, off(lens(TITLE[0]))], [54.1, off(TESTS[0])], [54.4, TESTS[1]], [58.1, knob(1, .7)], [60.4, knob(1, .36)], [64.1, off(ANT)]],
  [[-9, off(pillAt(1))], [8, pillAt(2)], [14.2, off(D0)], [57.9, off(TESTS[1])], [58.3, knob(2, .35)], [61.2, knob(2, .74)], [64.1, off(ANT)]],
  [[-9, off(pillAt(2))], [9.4, pillAt(3)], [14.2, off(D0)]],
];
function shapes(u) {
  const out = KEYS.map((k) => { const v = springKeys(u, k, CFG); return { x: v[0], y: v[1], hw: v[2], hh: v[3], r: v[4], drop: clamp(v[5]) ** 6, m: v[6] }; });
  const s = out[0];
  // the drop has momentum, so it is the one thing allowed to bounce
  if (u < 3) { const p = prog(u, .15, 3); s.y = lerp(-180, DROPY, E.inQuad(p)); s.hh = s.hw; }
  const sq = u >= 3 && u < 6 ? wobble((u - 3) * .5, 2.2, 3.4) * .16 : 0; s.hw *= 1 + sq; s.r *= 1 + sq * .5;
  // gauges: width is the measured count, nothing else
  const g1 = u >= 18.2 && u < 39 ? 72 * E.inOutCubic(prog(u, 18.4, 21.8)) : 0, g2 = u >= 29 && u < 38.9 ? 70 * E.inOutCubic(prog(u, 30.2, 33.6)) : 0;
  const widen = (o, pct, base) => { const w = Math.max(GH * 2, GW * pct / 100); const k = base; o.x = lerp(o.x, GL + w / 2, k); o.hw = lerp(o.hw, w / 2, k); };
  if (u >= 18.2 && u < 39.2) widen(s, g1, 1 - E.inOutCubic(prog(u, 38.6, 39.3)));
  if (u >= 28.8 && u < 39.2) widen(out[1], g2, 1 - E.inOutCubic(prog(u, 38.5, 39.1)));
  if (u >= 71) { Object.assign(s, { x: END_DROP[0], y: END_DROP[1], hw: END_DROP[2], hh: END_DROP[3], r: END_DROP[4], drop: 1, m: 1 }); out[1].m = out[2].m = out[3].m = 0; }
  return out;
}
const gy = (s) => s.y;

// ------------------------------------------------------------- what sits behind the glass, what floats on it
let BG, bg, GLASS;
function behind(ctx, u, sh, IMG) {
  ctx.clearRect(0, 0, W, H);
  // ---- b0-6 the sentence; the drop falls through it
  block(ctx, PT ? [[['Water plants', -.4]], [['use', -.4], ['chlorine.', .9, ICE]]] : [[['Water plants use', -.4], ['chlorine.', .9, ICE]]], MY - (PT ? 120 : 70), SIZE.h1, u, { out: 5.4, outDur: .8 });
  // ---- b14-18
  block(ctx, PT ? [[['Chlorine hits', 14.5]], [['antibiotics too.', 15.1]]] : [[['Chlorine hits antibiotics too.', 14.5]]], MY - (PT ? 120 : 80), SIZE.h1, u, { out: 17.6, outDur: .7 });
  // ---- gauge tracks. Both go the full width, so the bar's length reads as a share of 100.
  const tr = (y, a) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; rrect(ctx, GL, y - GH, GW, GH * 2, GH); ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = 'rgba(4,14,50,.22)'; ctx.fill(); ctx.restore(); };
  tr(gy(sh[0]), prog(u, 18.2, 19) * (1 - prog(u, 38.2, 38.9)) * (u < 39 ? 1 : 0));
  tr(GB, prog(u, 29, 29.8) * (1 - prog(u, 38.2, 38.9)) * (u < 39 ? 1 : 0));
  block(ctx, PT ? [[['Now test it', 25.8]], [['on bacteria.', 26.4, ICE]]] : [[['Now test it on bacteria.', 25.8]]], GB - (PT ? 0 : 10), SIZE.h1, u, { out: 28.4, outDur: .5 });
  // ---- b39-45 the name; the lens rides over it
  const TS_ = PT ? 214 : 170;
  if (u >= 38 && u < 46) {
    if (PT) { words(ctx, [['Removed', 39.2]], MY - 145, TS_, u, { w: 620, out: 44.6 }); words(ctx, [['Is Not', 40.6]], MY + 75, TS_, u, { w: 620, out: 44.6 }); words(ctx, [['Safe.', 42, GOLD]], MY + 300, TS_, u, { w: 620, out: 44.6 }); }
    else words(ctx, [['Removed', 39.2], ['Is Not', 40.6], ['Safe.', 42, GOLD]], MY + 55, TS_ * .9, u, { w: 620, out: 44.6 });
  }
  // ---- b45-50 a trace
  block(ctx, PT ? [[['Even a', 45.3], ['trace', 45.7, GOLD]], [['of antibiotic', 46.1]], [['can train bacteria.', 46.7]]] : [[['Even a', 45.3], ['trace', 45.7, GOLD], ['of antibiotic', 46.1]], [['can train bacteria.', 46.7]]], MY + (PT ? 40 : 40), SIZE.h1 * (PT ? .92 : 1), u, { out: 49.2, outDur: .7 });
  // ---- b50-54 the reactor is behind the glass, so the rim bends its edge
  if (u >= 50 && u < 55) { const k = clamp(E.inOutCubic(prog(u, 50.6, 51.4))) * (1 - E.inOutCubic(prog(u, 53.6, 54.2))); if (k > 0) { ctx.save(); ctx.globalAlpha = k; const s = sh[0], w = s.hw * 2, h = w * 470 / 1280; rrect(ctx, s.x - s.hw, s.y - s.hh, s.hw * 2, s.hh * 2, 52); ctx.clip(); ctx.fillStyle = '#EDF2F7'; ctx.fillRect(0, 0, W, H); ctx.drawImage(IMG.reactor, s.x - w / 2, s.y - h / 2, w, h); ctx.restore(); } }
  // ---- b58-64 slider tracks
  if (u >= 57.6 && u < 64.4) ['Chlorine dose', 'Ammonia', 'Contact time'].forEach((s, i) => { const at = 58.2 + i * .25, a = prog(u, at, at + .6) * (1 - prog(u, 63.2, 63.9)); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; rrect(ctx, TL, TRACK(i) - 4, TW, 8, 4); ctx.fillStyle = 'rgba(255,255,255,.62)'; ctx.fill(); ctx.font = ff(SIZE.label, 560); ctx.letterSpacing = `${-SIZE.label * .012}px`; ctx.fillStyle = WHITE; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(2,8,34,.4)'; ctx.shadowBlur = 12; ctx.fillText(s, TL, TRACK(i) - 62); ctx.letterSpacing = '0px'; ctx.restore(); });
}
function over(ctx, u, sh) {
  const pillText = (y, l, r, a, rc, xr = CX + PILL.w / 2 - 54) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.textBaseline = 'alphabetic'; ctx.shadowColor = 'rgba(2,8,34,.5)'; ctx.shadowBlur = 10; ctx.textAlign = 'left'; ctx.font = ff(SIZE.label, 580); ctx.letterSpacing = `${-SIZE.label * .012}px`; ctx.fillStyle = WHITE; ctx.fillText(l, CX - PILL.w / 2 + 54, y + SIZE.label * .35); ctx.letterSpacing = '0px'; ctx.textAlign = 'right'; ctx.font = r === '?' ? ff(78, 620) : ff(PT ? 34 : 30, 500, UI); ctx.fillStyle = rc || 'rgba(247,251,255,.9)'; ctx.fillText(r, xr, y + (r === '?' ? 27 : SIZE.label * .3)); ctx.restore(); };
  // ---- b6-14 what a plant tracks
  if (u >= 6 && u < 14.5) {
    words(ctx, [['What a plant tracks', 6.4]], STACK(0) - (PT ? 120 : 92), SIZE.h2 * 1.15, u, { out: 13.6, outDur: .5, w: 600 });
    [['Residual chlorine', 'measured', 6.5], ['Ammonia', 'measured', 7.4], ['Contact time', 'set by design', 8.4], ['Antibacterial activity', 'not tracked', 9.8, ICE]].forEach(([l, r, at, c], i) => pillText(sh[i].y, l, r, prog(u, at, at + .5) * (1 - prog(u, 13.6, 14.1)), c));
    note(ctx, PT ? ['Example: San José–Santa Clara permit R2-2025-0027', 'limits residual chlorine and ammonia.'] : ['Example: San José–Santa Clara permit R2-2025-0027 limits residual chlorine and ammonia.'], STACK(3) + PILL.h + 62, 10.4, u, 13.6);
  }
  // ---- b18-39 the two results
  const big = PT ? 168 : 128, sub = PT ? SIZE.h2 : 50;
  const pct = (y, v, a) => { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = ff(big, 620); ctx.letterSpacing = `${-big * .025}px`; ctx.fillStyle = WHITE; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(2,8,34,.4)'; ctx.shadowBlur = 26; ctx.fillText(`${Math.round(v)}%`, GL, y - GH - (PT ? 30 : 22)); ctx.letterSpacing = '0px'; ctx.restore(); };
  if (u >= 18 && u < 39.2) {
    const a = prog(u, 18.3, 19) * (1 - prog(u, 38.2, 38.9)), y = gy(sh[0]);
    pct(y, 72 * E.inOutCubic(prog(u, 18.4, 21.8)), a);
    words(ctx, [['of the antibiotic destroyed.', 20.4]], y + GH + (PT ? 72 : 60), sub, u, { x: GL, align: 'left', out: 38.2, outDur: .7 });
  }
  if (u >= 29 && u < 39.2) {
    pct(GB, 70 * E.inOutCubic(prog(u, 30.2, 33.6)), prog(u, 29.4, 30.2) * (1 - prog(u, 38.2, 38.9)));
    const y1 = GB + GH + (PT ? 72 : 60), o = { x: GL, align: 'left', out: 38.2, outDur: .7 };
    if (PT) { words(ctx, [['of its power to stop bacteria', 33.2]], y1, sub, u, o); words(ctx, [['still there.', 34.2, GOLD]], y1 + sub * 1.2, sub, u, { ...o, w: 620 }); }
    else words(ctx, [['of its power to stop bacteria', 33.2], ['still there.', 34.2, GOLD]], y1, sub, u, o);
    note(ctx, PT ? ['Lab test: Kennedy Neth et al. 2019, lab water,', '120 min after chlorine.'] : ['Lab test: Kennedy Neth et al. 2019, lab water, 120 min after chlorine.'], y1 + (PT ? sub * 1.2 + 62 : 56), 31, u, 38.2);
  }
  // ---- b45-50 credit
  note(ctx, PT ? ['Lab study of antibiotics including cipro:', 'Gullberg et al. 2011, PLoS Pathogens.'] : ['Lab study of antibiotics including cipro: Gullberg et al. 2011, PLoS Pathogens.'], MY + (PT ? 280 : 205), 46.8, u, 49.2);
  // ---- b50-54
  words(ctx, [['A plant on a bench.', 51.1]], card[1] - card[3] - (PT ? 56 : 44), SIZE.h1 * (PT ? .86 : .8), u, { out: 53.5, outDur: .6 });
  note(ctx, ['3D design of our bench reactor.'], card[1] + card[3] + 62, 51.8, u, 53.5);
  // ---- b54-58
  words(ctx, [["Measure what's left.", 54.4]], TESTS[0][1] - PILL.h - (PT ? 66 : 50), SIZE.h1 * (PT ? .86 : .8), u, { out: 57.5, outDur: .5 });
  if (u >= 54 && u < 58.4) { const a = prog(u, 54.7, 55.2) * (1 - prog(u, 57.5, 57.9)); pillText(sh[0].y, 'The drug', 'HPLC', a); pillText(sh[1].y, 'Its power', 'Bacteria test', a * prog(u, 55, 55.5)); }
  // ---- b58-64
  words(ctx, [['Model safer settings.', 58.6]], TRACK(0) - (PT ? 170 : 150), SIZE.h1 * (PT ? .86 : .8), u, { out: 63.1, outDur: .6 });
  // ---- b64-71 the pill nobody tracked comes back
  block(ctx, PT ? [[['Be the', 64.5], ['first plant', 65.2]], [['to know.', 66.1, ICE]]] : [[['Be the', 64.5], ['first plant', 65.2], ['to know.', 66.1, ICE]]], MY - (PT ? 130 : 80), SIZE.h1, u, { out: 68.8, outDur: .8, w: 600 });
  if (u >= 64 && u < 69.4) pillText(sh[0].y, 'Antibacterial activity', '?', prog(u, 64.8, 65.4) * (1 - prog(u, 68.8, 69.3)), ICE);
  // ---- b71 the end card
  if (u >= 71) {
    const y = END_DROP[1];
    if (PT) { words(ctx, [['Removed', 71.5]], y + 280, 128, u, { col: INK, w: 620, shadow: false }); words(ctx, [['Is Not Safe', 71.8]], y + 420, 128, u, { col: INK, w: 620, shadow: false }); words(ctx, [['Suryansh Gupta + Ritik Shenoy', 72.7]], y + 530, 46, u, { col: SLATE, fam: UI, w: 500, track: 0, shadow: false }); }
    else { words(ctx, [['Removed Is Not Safe', 71.5]], y + 270, 112, u, { col: INK, w: 620, shadow: false }); words(ctx, [['Suryansh Gupta + Ritik Shenoy', 72.7]], y + 360, 42, u, { col: SLATE, fam: UI, w: 500, track: 0, shadow: false }); }
  }
}

// ------------------------------------------------------------- grain, so the gradients never band
let GRAIN = null;
function post(ctx, u, t) {
  if (!GRAIN) { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d', { willReadFrequently: true }), im = x.createImageData(512, 512), r = mulberry32(7); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); GRAIN = c; }
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .05; const f = Math.floor(t * 24), ox = -Math.floor(hash01(f, 3) * 512), oy = -Math.floor(hash01(f, 4) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(GRAIN, x, y); ctx.restore();
}

M.film({
  fonts: [`700 80px ${D}`, `500 40px ${UI}`],
  images: { reactor: 'assets/reactor.png' },
  samples: 6,
  async init() { BG = document.createElement('canvas'); BG.width = W; BG.height = H; bg = BG.getContext('2d', { willReadFrequently: true }); GLASS = makeGlass(W, H); },
  draw(ctx, u, t, IMG) {
    const sh = shapes(u);
    behind(bg, u, sh, IMG);
    const pale = u >= 71 ? 1 : 0, ripAge = (u - 3) * .5;
    GLASS.render({
      text: BG, beat: u, heat: heatAt(u), pale, blobs: blobsAt(u),
      rib: pale ? 0 : .8, ribY: kf(u, [[0, PT ? .565 : .64], [5.2, PT ? .565 : .64], [6.4, PT ? .8 : .87]]),
      ribK: 1,
      wipe: u >= 28.5 && u < 30.6 ? [GL + GH, GB, (u - 28.5) * 1300, 1] : u >= 49.7 && u < 51.8 ? [CX, BEADY, (u - 49.7) * 1300, 2] : [0, 0, 0, 0],
      rip: u >= 3 && u < 8 ? [CX, DROPY, ripAge * 1500, 26 * Math.exp(-ripAge * 2)] : [0, 0, 0, 0],
      shapes: sh, k: kf(u, [[0, 60], [10.6, 60], [11.4, 12], [13.6, 12], [14.2, 70], [54, 70], [55.6, 12], [57.6, 12], [58.2, 60]]),
      frost: kf(u, [[0, 0], [6, .42], [14, .42], [18, .2], [38.6, .2], [39.2, 0], [53.9, 0], [54.4, .42], [57.8, .42], [58.4, 0], [64, 0], [64.4, .42], [68.8, .42], [69.2, 0]]),
      dim: kf(u, [[0, 1], [6, .8], [14, .8], [14.8, 1], [53.9, 1], [54.4, .8], [57.8, .8], [58.4, 1], [64, 1], [64.4, .8], [68.8, .8], [69.2, 1]]),
      seed: t % 7, lens: kf(u, [[0, 1], [38.8, 1], [39.2, .42], [42.6, .42], [43.4, 1]]), body: kf(u, [[0, .07], [17.8, .07], [18.6, .12], [38.4, .12], [39, .05], [50, .05], [51, .07]]),
    });
    ctx.drawImage(GLASS.canvas, 0, 0);
    over(ctx, u, sh);
  },
  post,
  hits: HITS,
});
