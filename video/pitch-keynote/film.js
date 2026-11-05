// Removed Is Not Safe: keynote-style pitch. A pure function of time; docs/shotlist.md is the plan.
// The picture is drawn on a 1920x1080 screen canvas. 16x9 shows it directly; 9x16 puts it on a monitor on a desk.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { deskSet } from './sets/desk.js';
const { W, H, E, prog, lerp, clamp, springU, SPRING, rrect, hash01, mulberry32, FORMAT } = M;

const SW = 1920, SH = 1080, CX = SW / 2, CY = SH / 2;
const D = 'Display', UI = 'UI';
const WHITE = '#F7F9FC', PALE = '#D8EDF4', INK = '#081018', ICE = '#6EE6F5', ROSE = '#FF8A5C', GOLD = '#FFD36E';
const SC = document.createElement('canvas'); SC.width = SW; SC.height = SH; const sc = SC.getContext('2d', { alpha: false, willReadFrequently: true });
const S = {};

// Six sounds, each used once. The music carries the rest (the user dislikes repeated effects).
const HITS = [
  [3, 'tile', 'pop', { pitch: 'A5', to: 'D6', gain: .12 }],
  [6, 'click', 'tick', { gain: .3 }],
  [29, 'heat', 'swell', { len: 1.2, gain: .16 }],
  [42, 'safe', 'thud', { pitch: 'D3', to: 'A2', gain: .34 }],
  [50, 'tunnel', 'whoosh', { len: .8, from: 500, to: 2800, gain: .2 }],
  [71, 'pale', 'bell', { pitch: 'D6', gain: .16 }],
];

// ------------------------------------------------------------- the glowing field
const FW = 384, FH = 216;
const FC = document.createElement('canvas'); FC.width = FW; FC.height = FH; const fc = FC.getContext('2d', { willReadFrequently: true });
const IM = fc.createImageData(FW, FH), PX = new Uint32Array(IM.data.buffer);
const stops = (arr) => { const lut = []; for (let i = 0; i < 512; i++) { const v = i / 511; let k = 0; while (k < arr.length - 2 && v > arr[k + 1][0]) k++; const [a, ca] = arr[k], [b, cb] = arr[k + 1], p = clamp((v - a) / (b - a)), q = p * p * (3 - 2 * p); lut.push(M.hexRgb(ca).map((c, j) => lerp(c, M.hexRgb(cb)[j], q))); } return lut; };
const COOL = stops([[0, '#05070B'], [.2, '#051430'], [.42, '#0638B8'], [.62, '#0A8CF0'], [.82, '#7DE8F2'], [1, '#F6FFF9']]);
const HOT = stops([[0, '#080605'], [.2, '#380804'], [.42, '#D8200A'], [.62, '#FF6A10'], [.82, '#FFB04A'], [1, '#FFF3D6']]);
const b = (a, x, y, sx, sy) => ({ a, x, y, sx, sy });
const NONE = b(0, .5, .5, .3, .3);
const F = {
  open: [b(1.08, .5, .5, .36, 1.1), b(.72, .05, .95, .24, .6), b(.72, .95, .95, .24, .6), b(.5, .5, 1.1, .7, .4)],
  x: [b(.95, .08, .02, .2, .46), b(.95, .92, .02, .2, .46), b(1.0, .15, 1.0, .3, .4), b(1.0, .85, 1.0, .3, .4)],
  band: [b(1.02, .5, 1.0, .85, .3), NONE, NONE, NONE],
  bandThin: [b(.84, .5, .78, .9, .15), NONE, NONE, NONE],
  bandDeep: [b(.76, .5, .86, .62, .13), NONE, NONE, NONE],
  orb: [b(.98, .5, .98, .22, .34), NONE, NONE, NONE],
  orbLow: [b(.66, .5, .93, .15, .19), NONE, NONE, NONE],
  hour: [b(.82, .5, -.04, .12, .34), b(.82, .5, 1.04, .14, .34), NONE, NONE],
  hourHi: [b(.98, .5, -.02, .25, .45), b(.98, .5, 1.02, .25, .45), NONE, NONE],
  flow: [b(.78, .5, .96, .9, .15), b(.7, .85, 1.02, .22, .28), NONE, NONE],
  flowTop: [b(.84, .5, 1.05, .9, .11), b(.86, .86, 1.06, .24, .24), b(.62, .86, -.06, .26, .22), NONE],
  flowHi: [b(.74, .5, .1, .3, .26), b(.92, .2, 1.0, .5, .32), b(.92, .85, 1.0, .35, .38), NONE],
  flowLow: [b(.8, .5, 1.05, .9, .1), b(.82, .86, 1.06, .24, .22), NONE, NONE],
  low: [b(.42, .5, 1.02, .55, .14), NONE, NONE, NONE],
  void: [b(.3, .5, 1.05, .35, .1), NONE, NONE, NONE],
};
// [beat the state is reached, state, beats the move takes]. Fast shifts, long holds, like breathing.
const FK = [[0, 'open', 1], [1.2, 'x', 1], [2.2, 'band', 1], [3.4, 'bandThin', 1], [5.2, 'bandDeep', 1.4], [6.1, 'orbLow', .7], [6.7, 'hourHi', .6], [7.6, 'x', .8], [8.8, 'band', 1.1],
  [13.3, 'bandThin', .8], [14.4, 'orbLow', 1], [17.3, 'orb', 2.5], [18.4, 'bandThin', .9], [22, 'flow', 3.5], [24.8, 'flowHi', 2.8], [25.8, 'orbLow', 1], [28.3, 'orb', 2.5], [29, 'open', .7], [29.8, 'x', .8], [30.8, 'flowLow', 1], [33.5, 'flowLow', 1], [35.6, 'flowTop', 2], [38.2, 'flowLow', 2.4],
  [39.2, 'low', 1], [41.8, 'bandDeep', 2.6], [44.8, 'orbLow', 2.8], [45.6, 'low', .8], [49.4, 'orb', 3.8], [50, 'open', .6], [50.9, 'x', .9], [51.8, 'bandThin', .9], [53.6, 'bandDeep', 1.8], [54.2, 'hourHi', .6], [55.2, 'bandThin', 1],
  [57.6, 'bandDeep', 2], [58.2, 'x', .6], [59.2, 'hour', 1], [61.8, 'band', 2.6], [62.6, 'hourHi', .8], [64.2, 'band', 1.1], [65.6, 'bandThin', 1.2], [68, 'bandDeep', 2.4], [69.4, 'orbLow', 1.2], [70.2, 'hour', .8], [70.9, 'hourHi', .7], [999, 'hourHi', 1]];
const heatAt = (u) => (u < 50 ? E.inOutCubic(prog(u, 28.5, 29.2)) : 1 - E.inOutCubic(prog(u, 49.6, 50.3)));
const blobsAt = (u) => {
  let i = 0; while (i < FK.length - 2 && u >= FK[i + 1][0]) i++;
  const [, sa] = FK[i], [ub, sb, dur] = FK[i + 1], p = E.inOutSine(prog(u, ub - dur, ub)), A = F[sa], B = F[sb];
  return A.map((a, j) => { const c = B[j], w = 1 + .05 * Math.sin(u * .9 + j * 2); return b(lerp(a.a, c.a, p) * w, lerp(a.x, c.x, p) + Math.sin(u * .5 + j * 1.7) * .012, lerp(a.y, c.y, p) + Math.cos(u * .41 + j) * .01, lerp(a.sx, c.sx, p), lerp(a.sy, c.sy, p)); });
};
const GX = [0, 1, 2, 3].map(() => new Float32Array(FW + 64)), GY = [0, 1, 2, 3].map(() => new Float32Array(FH));
const LUT = new Uint32Array(512);
S.glow = [0, 0, 0];
function field(ctx, u) {
  const heat = heatAt(u), bl = blobsAt(u), lift = Math.max(0, 1 - Math.abs(u - 29) * 2.2) * .18;
  for (let i = 0; i < 512; i++) { const c = COOL[i], h = HOT[i]; LUT[i] = (255 << 24) | (lerp(c[2], h[2], heat) << 16) | (lerp(c[1], h[1], heat) << 8) | lerp(c[0], h[0], heat); }
  bl.forEach((o, j) => { const gx = GX[j], gy = GY[j]; for (let x = 0; x < FW + 64; x++) { const d = ((x - 32) / FW - o.x) / o.sx; gx[x] = o.a * Math.exp(-d * d); } for (let y = 0; y < FH; y++) { const d = (y / FH - o.y) / o.sy; gy[y] = Math.exp(-d * d); } });
  let sum = 0, cnt = 0;
  for (let y = 0; y < FH; y++) {
    const off = 32 + Math.round(14 * Math.sin(y / FH * 5.2 + u * .45)), g0 = GY[0][y], g1 = GY[1][y], g2 = GY[2][y], g3 = GY[3][y], X0 = GX[0], X1 = GX[1], X2 = GX[2], X3 = GX[3], row = y * FW;
    for (let x = 0; x < FW; x++) {
      const k = x + off >= FW + 64 ? FW + 63 : x + off, v = X0[k] * g0 + X1[k] * g1 + X2[k] * g2 + X3[k] * g3 + lift;
      const idx = v >= 1 ? 511 : (v * 511) | 0; PX[row + x] = LUT[idx];
      if (!(x & 15) && !(y & 15)) { sum += idx; cnt++; }
    }
  }
  fc.putImageData(IM, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(FC, 0, 0, SW, SH);
  const v = sum / cnt / 511, g = u < 50 && heat > .5 ? [1, .34, .1] : [.25, .55, 1]; S.glow = g.map((c) => c * clamp(v * 3.2));
}

// ------------------------------------------------------------- type
const ff = (size, w = 500, fam = D) => `${w} ${size}px ${fam}`;
// One line of words: each comes in soft and settles sharp, as in a keynote. [word, beat, colour?]
function words(ctx, list, y, size, u, { w = 550, x = CX, align = 'center', out = 1e9, outDur = .9, col = WHITE, fam = D, gap = .27, alpha = 1 } = {}) {
  if (u >= out + outDur) return;
  ctx.font = ff(size, w, fam); ctx.letterSpacing = `${-size * .018}px`; ctx.textBaseline = 'alphabetic';
  const ws = list.map(([s]) => ctx.measureText(s).width), sp = size * gap, tot = ws.reduce((a, c) => a + c, 0) + sp * (list.length - 1);
  let px = align === 'center' ? x - tot / 2 : x;
  const q = E.inCubic(prog(u, out, out + outDur));
  list.forEach(([s, u0, c], i) => {
    const k = E.outCubic(prog(u, u0, u0 + .85));
    if (k > 0) { const blur = (1 - k) * size * .18 + q * size * .2, a = clamp(k * 1.25) * (1 - q) * alpha;
      ctx.save(); ctx.globalAlpha = a; if (blur > .3) ctx.filter = `blur(${blur.toFixed(1)}px)`; if (col !== INK && col !== '#34465A') { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = size * .4; } ctx.fillStyle = c || col; ctx.fillText(s, px + (1 - k) * size * .22, y); ctx.restore(); }
    px += ws[i] + sp;
  });
  ctx.letterSpacing = '0px';
}
const line = (ctx, s, u0, y, size, u, o = {}) => words(ctx, [[s, u0, o.c]], y, size, u, o);
function credit(ctx, s, a, y = 1032, col = 'rgba(247,249,252,.72)') { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = ff(26, 500, UI); const tw = ctx.measureText(s).width; rrect(ctx, CX - tw / 2 - 22, y - 31, tw + 44, 44, 22); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fill(); ctx.fillStyle = 'rgba(247,249,252,.92)'; ctx.textAlign = 'center'; ctx.fillText(s, CX, y); ctx.restore(); }

// ------------------------------------------------------------- pieces
function dropPath(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.bezierCurveTo(x + r * .35, y - r * .85, x + r, y - r * .3, x + r, y + r * .18); ctx.arc(x, y + r * .18, r, 0, Math.PI); ctx.bezierCurveTo(x - r, y - r * .3, x - r * .35, y - r * .85, x, y - r * 1.5); ctx.closePath(); }
function glass(ctx, x, y, w, h, r, { top = .17, bot = .03, rim = .85 } = {}) {
  rrect(ctx, x, y, w, h, r); const f = ctx.createLinearGradient(0, y, 0, y + h); f.addColorStop(0, `rgba(255,255,255,${top})`); f.addColorStop(1, `rgba(255,255,255,${bot})`); ctx.fillStyle = f; ctx.fill();
  const s = ctx.createLinearGradient(x, y, x + w * .3, y + h); s.addColorStop(0, `rgba(255,255,255,${rim})`); s.addColorStop(.5, `rgba(255,255,255,${rim * .22})`); s.addColorStop(1, `rgba(255,255,255,${rim * .6})`); ctx.strokeStyle = s; ctx.lineWidth = 2.5; ctx.stroke();
}
function tile(ctx, x, y, size, a = 1, s = 1) {
  if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  glass(ctx, -size / 2, -size / 2, size, size, size * .27, { top: .28, bot: .08, rim: 1 });
  rrect(ctx, -size / 2 + 8, -size / 2 + 8, size - 16, size - 16, size * .21); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  dropPath(ctx, 0, size * .05, size * .2); const g = ctx.createLinearGradient(0, -size * .3, 0, size * .3); g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, ICE); ctx.fillStyle = g; ctx.fill(); ctx.restore();
}
function cursor(ctx, x, y, s = 1) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(11, 35); ctx.lineTo(20, 55); ctx.lineTo(29, 51); ctx.lineTo(20, 32); ctx.lineTo(35, 32); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }

// ---- the glass panel: what a plant's dials track, tipped back in perspective
const PW = 1500, PH = 700, PC = document.createElement('canvas'); PC.width = PW; PC.height = PH; const pc = PC.getContext('2d', { willReadFrequently: true });
const DIALS = [['Residual chlorine', .68], ['Ammonia', .34], ['Contact time', .55], ['Antibacterial activity', -1]];
function panelArt(u) {
  pc.clearRect(0, 0, PW, PH); glass(pc, 5, 5, PW - 10, PH - 10, 58, { top: .22, bot: .05, rim: 1 });
  pc.font = ff(54, 600); pc.fillStyle = WHITE; pc.textAlign = 'left'; pc.fillText('What a plant tracks', 66, 100);
  DIALS.forEach(([s, v], i) => {
    const at = 8.4 + i * .85, k = springU(u, at, SPRING.gentle); if (k <= 0) return;
    const cx = 234 + i * 344, cy = 300, q = v < 0; pc.save(); pc.globalAlpha = clamp(k * 1.4); pc.translate(cx, cy + (1 - k) * 30);
    rrect(pc, -158, -140, 316, 410, 40); pc.fillStyle = q ? 'rgba(10,20,50,.5)' : 'rgba(255,255,255,.14)'; pc.fill(); pc.strokeStyle = q ? ICE : 'rgba(255,255,255,.35)'; pc.lineWidth = q ? 3 : 2; pc.stroke();
    pc.lineCap = 'round'; pc.lineWidth = 15; pc.strokeStyle = 'rgba(255,255,255,.2)'; pc.beginPath(); pc.arc(0, -20, 76, Math.PI * .8, Math.PI * 2.2); pc.stroke();
    if (!q) { pc.strokeStyle = WHITE; pc.beginPath(); pc.arc(0, -20, 76, Math.PI * .8, Math.PI * (.8 + 1.4 * v * E.outCubic(prog(u, at + .2, at + 1.6)))); pc.stroke(); }
    else { pc.fillStyle = ICE; pc.font = ff(104, 600); pc.textAlign = 'center'; pc.fillText('?', 0, 16); }
    pc.fillStyle = WHITE; pc.textAlign = 'center'; pc.font = ff(39, 600);
    const parts = s === 'Antibacterial activity' ? ['Antibacterial', 'activity'] : s === 'Residual chlorine' ? ['Residual', 'chlorine'] : s === 'Contact time' ? ['Contact', 'time'] : [s, ''];
    pc.fillText(parts[0], 0, 136); if (parts[1]) pc.fillText(parts[1], 0, 180);
    pc.fillStyle = q ? ICE : 'rgba(247,249,252,.72)'; pc.font = ff(30, 500, UI); pc.fillText(q ? 'not tracked' : i === 2 ? 'set by design' : 'measured', 0, 233);
    pc.restore();
  });
}
// draw an image as a trapezoid (top edge narrower), one row at a time
function tipped(ctx, src, cx, topY, h, topW, botW, a) { ctx.save(); ctx.globalAlpha = a; const n = 170; for (let i = 0; i < n; i++) { const p = i / n, z = 1 / lerp(1 / .62, 1, p), q = (z - .62) / .38, w = lerp(topW, botW, p), y = topY + p * h; ctx.drawImage(src, 0, q * src.height, src.width, src.height / n * 1.6, cx - w / 2, y, w, h / n + 1); } ctx.restore(); }

// ---- percentage pill entering from the left edge
function pill(ctx, y, h, pct, numSize, a = 1) { if (a <= 0) return; const x1 = pct / 100 * SW; ctx.save(); ctx.globalAlpha = a; glass(ctx, -80, y, x1 + 80, h, h / 2); ctx.font = ff(numSize, 600); ctx.fillStyle = WHITE; ctx.textAlign = 'right'; ctx.fillText(`${Math.round(pct)}%`, x1 - h * .34, y + h / 2 + numSize * .36); ctx.restore(); }
// bright strands sweeping in from the lower right behind the pill
function strands(ctx, k, heat, a) {
  if (k <= 0 || a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const g = ctx.createLinearGradient(760, 1080, 1920, 700); const h0 = heat > .5; g.addColorStop(0, h0 ? 'rgba(255,60,10,0)' : 'rgba(10,80,255,0)'); g.addColorStop(.45, h0 ? '#FF8A18' : '#28A8FF'); g.addColorStop(1, h0 ? '#FFF27A' : '#D6FFF6');
    ctx.strokeStyle = g; ctx.lineWidth = 15 - i; const off = i * 44, L = 1800;
    ctx.setLineDash([L * k, L]); ctx.beginPath(); ctx.moveTo(700 + off * 1.3, 1100); ctx.bezierCurveTo(1120 + off, 880 + off * .55, 1460, 770 + off * .75, 1960, 670 + off * .9); ctx.stroke();
  }
  ctx.restore();
}

// ---- tunnel of real project cards, projected by hand
const CARD = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d', { willReadFrequently: true }); x.beginPath(); x.roundRect(0, 0, w, h, 54); x.fillStyle = '#FBFCFE'; x.fill(); x.globalCompositeOperation = 'source-atop'; draw(x, w, h); return c; };
const head = (x, s, sub) => { x.fillStyle = '#0B1220'; x.font = ff(46, 600); x.fillText(s, 44, 74); x.fillStyle = '#566078'; x.font = ff(27, 500, UI); x.fillText(sub, 44, 114); };
function buildCards(IMG) {
  const fit = (x, im, w, y0, h) => { const s = Math.min(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s; x.drawImage(im, (w - iw) / 2, y0 + (h - ih) / 2, iw, ih); };
  S.cards = {
    reactor: CARD(1200, 620, (x, w, h) => { x.fillStyle = '#EEF1F7'; x.fillRect(0, 0, w, h); head(x, 'Bench reactor', '3D design: chlorine meets cipro in a coiled tube'); fit(x, IMG.reactor, w, 130, 480); }),
    time: CARD(1200, 760, (x, w) => { head(x, 'Chemistry model', 'From published rate constants (Dodd et al. 2005)'); fit(x, IMG.time, w, 130, 620); }),
    plate: CARD(1200, 760, (x, w) => { head(x, 'Bacteria test', 'E. coli K-12 + resazurin. Illustration, not data');
      for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) { const on = hash01(r * 12 + c, 8) > (c / 12) * .9 + .05; x.beginPath(); x.arc(150 + c * 82, 190 + r * 76, 31, 0, 7); x.fillStyle = on ? '#2F5FD0' : '#FF7FB0'; x.fill(); } }),
    flow: CARD(1200, 760, (x, w) => { head(x, 'Reactor model', 'How pump flow changes what leaves the tube'); fit(x, IMG.flow, w, 130, 620); }),
  };
}
const F0 = 900;
function tunnelWalls(ctx, cam) {
  const { x: cx, y: cy, z: cz } = cam, Z0 = 1.2, Z1 = 2.3, n = 64, A = .62, Bw = .62, Sd = .37;
  const P = (x, y, z) => { const d = Math.max(.04, z - cz); return [CX + F0 * (x - cx) / d, CY + F0 * (y - cy) / d]; };
  const steps = []; for (let i = 0; i < n; i++) { const w0 = 1 / Math.max(.04, Z1 - cz), w1 = 1 / Math.max(.04, Z0 - cz), a = lerp(w0, w1, i / n), bb = lerp(w0, w1, (i + 1) / n); steps.push([1 / a + cz, 1 / bb + cz]); }
  const flat = (tex, y, flip) => steps.forEach(([za, zb]) => { const [xa, ya] = P(-A, y, za), [xb] = P(A, y, za), [, yb] = P(-A, y, zb), v0 = (za - Z0) / (Z1 - Z0), v1 = (zb - Z0) / (Z1 - Z0), T = tex.height;
    const sy = flip ? (1 - v0) * T : v0 * T, sh = Math.abs(v1 - v0) * T + 1; const y0 = Math.min(ya, yb), h = Math.abs(yb - ya) + 1; if (y0 > SH || y0 + h < 0) return; ctx.drawImage(tex, 0, Math.min(sy, flip ? (1 - v0) * T : v1 * T), tex.width, sh, xa, y0, xb - xa, h); });
  const side = (tex, x, fl) => steps.forEach(([za, zb]) => { const [xa, ya] = P(x, -Sd, za), [, yb] = P(x, Sd, za), [xc] = P(x, -Sd, zb), u0 = fl ? 1 - (za - Z0) / (Z1 - Z0) : (za - Z0) / (Z1 - Z0), u1 = fl ? 1 - (zb - Z0) / (Z1 - Z0) : (zb - Z0) / (Z1 - Z0), T = tex.width; const x0 = Math.min(xa, xc), w = Math.abs(xc - xa) + 1; if (x0 > SW || x0 + w < 0) return; ctx.drawImage(tex, Math.min(u0, u1) * T, 0, Math.abs(u1 - u0) * T + 1, tex.height, x0, ya, w, yb - ya); });
  const K = S.cards, by = .62, sx = 1.02;
  flat(K[cam.set[0]], -by, false); flat(K[cam.set[1]], by, true); side(K[cam.set[2]], -sx, false); side(K[cam.set[3]], sx, true);
}

// ------------------------------------------------------------- the screen
function screen(ctx, u) {
  ctx.textAlign = 'left';
  if (u >= 71) return endCard(ctx, u);
  field(ctx, u);

  // ---- b0-14 Water plants use [drop] chlorine. A cursor presses the tile and the dials rise.
  if (u < 14.6) {
    const tk = springU(u, 3, SPRING.bouncy), gapW = 160 * Math.max(0, tk), down = E.inOutCubic(prog(u, 6.2, 8)), y0 = 548;
    const size = 74; ctx.font = ff(size, 550); ctx.letterSpacing = `${-size * .018}px`;
    const wa = ctx.measureText('Water plants use').width, wb = ctx.measureText('chlorine.').width; ctx.letterSpacing = '0px';
    const tot = wa + wb + 22 + gapW, xa = CX - tot / 2, xb = xa + wa + 22 + gapW, tx = xa + wa + 11 + gapW / 2;
    words(ctx, [['Water plants use', -.2]], y0, size, u, { x: xa, align: 'left', out: 6.4, outDur: 1.2 });
    words(ctx, [['chlorine.', .9, ICE]], y0, size, u, { x: xb, align: 'left', out: 6.4, outDur: 1.2 });
    // panel behind everything else after the press
    const pk = E.outExpo(prog(u, 6.5, 8.6)), pout = E.inCubic(prog(u, 13.2, 14.4));
    if (pk > 0 && pout < 1) { panelArt(u); const s = lerp(.32, 1, pk) * lerp(1, .78, pout); tipped(ctx, PC, CX, lerp(620, 190, pk), 690 * s, 1180 * s, 1560 * s, clamp(pk * 1.5) * (1 - pout)); }
    const press = 1 - .1 * Math.sin(Math.PI * prog(u, 5.9, 6.5));
    const tileY = lerp(y0 - 26, 950, down), tileX = lerp(tx, CX, down);
    tile(ctx, tileX, tileY, 140, clamp(tk * 1.4) * (1 - pout), Math.max(.01, tk) * press);
    const c = E.inOutCubic(prog(u, 3.9, 5.9)), cA = clamp(prog(u, 3.9, 4.4)) * (1 - pout);
    if (cA > 0) { ctx.save(); ctx.globalAlpha = cA; cursor(ctx, lerp(SW * .78, tileX + 16, c), lerp(SH * .86, tileY + 22, c), 1.2 * press); ctx.restore(); }
    credit(ctx, 'Example: San José–Santa Clara permit R2-2025-0027 limits residual chlorine and ammonia.', prog(u, 9, 10) * (1 - pout), 1058);
  }
  // ---- b14-18
  line(ctx, 'It hits antibiotics too.', 14.3, 556, 82, u, { out: 17.4, outDur: .8 });

  // ---- b18-25 the first count. b29-39 the second, beneath it
  const first = 100 * 0 + 72 * E.inOutCubic(prog(u, 18.4, 21.8)), up = E.inOutCubic(prog(u, 29, 30.4));
  const out2 = E.inCubic(prog(u, 38.2, 39.1));
  strands(ctx, E.outCubic(prog(u, 19.6, 23)), 0, (1 - prog(u, 24.6, 25.4)));
  strands(ctx, E.outCubic(prog(u, 30.2, 34.4)), 1, 1 - out2);
  if (u >= 18.2 && u < 25.8 || u >= 29 && u < 39.2) {
    const inK = E.outExpo(prog(u, 18.2, 19.4)), lvl = u < 26 ? 1 - E.inCubic(prog(u, 24.6, 25.5)) : prog(u, 29, 29.8) * (1 - out2);
    const y = lerp(350, 170, up), h = lerp(180, 138, up);
    pill(ctx, y, h, first * inK, lerp(92, 72, up), lvl);
    words(ctx, [['of the antibiotic destroyed.', u < 26 ? 20.2 : 0]], y + h + lerp(82, 66, up), lerp(58, 46, up), u, { x: 110, align: 'left', alpha: lvl });
  }
  line(ctx, 'Now test it on bacteria.', 25.6, 556, 82, u, { out: 28.3, outDur: .55 });
  if (u >= 29 && u < 39.2) {
    const p2 = 70 * E.inOutCubic(prog(u, 30.2, 33.6));
    pill(ctx, 520, 200, p2, 104, prog(u, 30, 30.6) * (1 - out2));
    words(ctx, [["of the antibiotic's power to stop bacteria", 33]], 806, 56, u, { x: 110, align: 'left', w: 600, alpha: 1 - out2 });
    words(ctx, [['was still there.', 33.8, GOLD]], 878, 56, u, { x: 110, align: 'left', w: 600, alpha: 1 - out2 });
    credit(ctx, 'Lab test: Kennedy Neth et al. 2019, lab water, 120 min after chlorine.', prog(u, 31, 32) * (1 - out2));
  }

  // ---- b39-45 the name, word by word
  words(ctx, [['Removed', 39.2], ['Is Not', 40.6], ['Safe.', 42, GOLD]], 590, 134, u, { w: 600, out: 44.7, outDur: .8 });
  // ---- b45-50 why it matters
  line(ctx, 'Even a trace of antibiotic', 45.4, 515, 76, u, { out: 49.2, outDur: .7 });
  line(ctx, 'can train bacteria.', 46.2, 610, 76, u, { out: 49.2, outDur: .7, c: GOLD });
  credit(ctx, 'Lab study of antibiotics including cipro: Gullberg et al. 2011, PLoS Pathogens.', prog(u, 46.5, 47.2) * (1 - prog(u, 49, 49.6)));

  // ---- b50-64 the tunnel: the bench, the two tests, the model
  if (u >= 50 && u < 64.6) {
    const enter = E.outExpo(prog(u, 50, 51.8)), whip1 = E.inOutCubic(prog(u, 53.5, 54.6)), whip2 = E.inOutCubic(prog(u, 57.5, 58.6)), exit = E.inCubic(prog(u, 62.2, 64.2));
    const roll = (1 - enter) * -1.15 + (whip1 + whip2) * Math.PI * 2, cz = lerp(-5.5, 0, enter) + exit * 1.05 + Math.sin((u - 50) * .35) * .03 + Math.sin(Math.PI * whip1) * .25 + Math.sin(Math.PI * whip2) * .25;
    ctx.save(); ctx.translate(CX, CY); ctx.rotate(roll); ctx.translate(-CX, -CY); ctx.globalAlpha = clamp(prog(u, 50, 50.4)) * (1 - prog(u, 64, 64.6));
    tunnelWalls(ctx, { x: exit * .1, y: exit * .46, z: cz, set: whip2 > .5 ? ['flow', 'time', 'reactor', 'plate'] : whip1 > .5 ? ['plate', 'reactor', 'time', 'flow'] : ['reactor', 'time', 'plate', 'flow'] }); ctx.restore();
    const big = 72, y = 556;
    line(ctx, 'A plant on a bench.', 51.3, y, big, u, { out: 53.3, outDur: .6 });
    line(ctx, "Measure what's left.", 54.5, y - 18, big, u, { out: 57.3, outDur: .6 });
    line(ctx, 'HPLC for the drug. Bacteria for the power.', 55.3, y + 44, 30, u, { out: 57.3, outDur: .6, fam: UI, w: 500 });
    line(ctx, 'Model safer settings.', 58.5, y, big, u, { out: 61.8, outDur: .6 });
  }
  // ---- b64-71 the ask, then the mark
  words(ctx, [['Be the', 64.5], ['first plant', 65.3], ['to know.', 66.3, ICE]], 556, 92, u, { w: 600, out: 68.9, outDur: .9 });
  const mk = E.outBack(prog(u, 69.4, 70.2), 1.5); if (mk > 0) { ctx.save(); dropPath(ctx, CX, 545, 52 * mk); ctx.fillStyle = WHITE; ctx.fill(); ctx.restore(); }
}
function endCard(ctx, u) {
  ctx.fillStyle = PALE; ctx.fillRect(0, 0, SW, SH);
  dropPath(ctx, CX, 420, 52); ctx.fillStyle = INK; ctx.fill();
  words(ctx, [['Removed Is Not Safe', 71.5]], 610, 76, u, { col: INK, w: 600 });
  words(ctx, [['Suryansh Gupta + Ritik Shenoy', 72.6]], 680, 36, u, { col: '#34465A', fam: UI, w: 500 });
}

// ------------------------------------------------------------- film grain, so the gradients never band
let GRAIN = null;
function post(ctx, u, t) {
  if (!GRAIN) { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d', { willReadFrequently: true }), im = x.createImageData(512, 512), r = mulberry32(7); for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); GRAIN = c; }
  ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .1; const f = Math.floor(t * 24), ox = -Math.floor(hash01(f, 3) * 512), oy = -Math.floor(hash01(f, 4) * 512);
  for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(GRAIN, x, y); ctx.restore();
}

function caption(ctx) {
  ctx.save(); ctx.textAlign = 'center';
  const L = ['72% OF THE ANTIBIOTIC GONE.', '70% OF ITS POWER STILL THERE.'], x = W / 2, y = 1090, fs = 42;
  rrect(ctx, x - 390, y - 58, 780, 158, 22); ctx.fillStyle = 'rgba(0,0,0,.86)'; ctx.fill();
  ctx.font = ff(fs, 700); ctx.fillStyle = '#FFF'; L.forEach((s, i) => ctx.fillText(s, x, y + i * 54));
  ctx.font = ff(21, 500, UI); ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.fillText('Lab test: Kennedy Neth et al. 2019, lab water, 120 min', x, y + 86);
  ctx.restore();
}

M.film({
  fonts: [`700 80px ${D}`, `500 40px ${UI}`],
  images: { reactor: 'assets/reactor.png', time: 'assets/fig_time.png', flow: 'assets/fig_flow.png' },
  samples: FORMAT.portrait ? 4 : 8,
  async init(_, IMG) { buildCards(IMG); if (FORMAT.portrait) { await G.initGL({ exposure: 1.0 }); G.R.domElement.addEventListener('webglcontextlost', () => console.error('WEBGL CONTEXT LOST')); S.desk = deskSet(SC); } },
  draw(ctx, u, t) {
    screen(sc, u);
    if (!FORMAT.portrait) { ctx.drawImage(SC, 0, 0); return; }
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const pale = u >= 71; G.renderSet(ctx, S.desk, t, u, { glow: pale ? [.85, .95, 1] : S.glow });
    caption(ctx);
  },
  post,
  hits: HITS,
});
