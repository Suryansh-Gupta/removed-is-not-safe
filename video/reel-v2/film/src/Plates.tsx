import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import cipro from "./cipro.json";
import ride from "./ride.json";
import { FONT as F, MONO as M } from "./Film";

const INK = "#0B0F19", BLUE = "#1F5CFF", PINK = "#E91E73", PAPER = "#F7F8FA";
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...cl, easing: Easing.inOut(Easing.cubic) });
const Grid: React.FC<{ a: string; b: string; foot: string }> = ({ a, b, foot }) => (
  <>
    <AbsoluteFill style={{ background: PAPER, backgroundImage: "linear-gradient(rgba(11,15,25,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(11,15,25,.055) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
    <div style={{ position: "absolute", left: 56, top: 44, fontFamily: M, fontSize: 22, color: INK, lineHeight: 1.35, whiteSpace: "pre" }}>{a}</div>
    <div style={{ position: "absolute", right: 56, top: 44, fontFamily: M, fontSize: 22, color: INK, textAlign: "right", lineHeight: 1.35, whiteSpace: "pre" }}>{b}</div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: M, fontSize: 25, color: "rgba(11,15,25,.72)" }}>{foot}</div>
  </>
);
const Callout: React.FC<{ x: number; y: number; x2: number; y2: number; t: string; sub?: string; p: number; color?: string; anchor?: "start" | "end" }> = ({ x, y, x2, y2, t, sub, p, color = INK, anchor = "start" }) => (
  <g opacity={p > 0 ? 1 : 0}>
    <line x1={x} y1={y} x2={x + (x2 - x) * p} y2={y + (y2 - y) * p} stroke={color} strokeWidth={2} />
    <circle cx={x} cy={y} r={5} fill={color} />
    <g opacity={p}>
      <text x={x2 + (anchor === "start" ? 12 : -12)} y={y2 + 8} fontFamily={M} fontSize={28} fontWeight={500} fill={color} textAnchor={anchor}>{t}</text>
      {sub && <text x={x2 + (anchor === "start" ? 12 : -12)} y={y2 + 42} fontFamily={M} fontSize={23} fill={INK} opacity={.75} textAnchor={anchor}>{sub}</text>}
    </g>
  </g>
);

/* ---- ciprofloxacin, real 2D layout from its SMILES (PubChem CID 2764) ---- */
export const Molecule: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const f = useCurrentFrame() * speed;
  const A = cipro.atoms, xs = A.map(a => a.x), ys = A.map(a => a.y);
  const scale = 74, mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
  const X = (a: { x: number }) => 900 + (a.x - mx) * scale, Y = (a: { y: number }) => 560 - (a.y - my) * scale;
  const hitAt = 170, pipK = prog(f, hitAt, hitAt + 40), coreK = prog(f, hitAt + 90, hitAt + 130);
  const pipOf = (i: number) => A[i].pip;
  const CP = new Set([0, 1, 2]);
  const px = A.filter(a => a.pip), cx = px.reduce((s, a) => s + X(a), 0) / px.length, cy = px.reduce((s, a) => s + Y(a), 0) / px.length;
  const coreA = A.filter(a => !a.pip && !CP.has(a.i)), ccx = coreA.reduce((s, a) => s + X(a), 0) / coreA.length, ccy = coreA.reduce((s, a) => s + Y(a), 0) / coreA.length;
  const len = (a: any, b: any) => Math.hypot(X(a) - X(b), Y(a) - Y(b));
  return (
    <AbsoluteFill>
      <Grid a={"REMOVED IS NOT SAFE\nFIG. 1  CIPROFLOXACIN"} b={"C17H18FN3O3\nPUBCHEM CID 2764"} foot="Dodd et al. 2005." />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {cipro.bonds.map((b, i) => {
          const a1 = A[b.a], a2 = A[b.b]; const L = len(a1, a2); const st = 6 + i * 3, p = prog(f, st, st + 16);
          const onPip = pipOf(b.a) && pipOf(b.b); const col = onPip ? `rgb(${11 + (233 - 11) * pipK},${15 + 15 * pipK},${25 + 90 * pipK})` : (coreK > 0 && !CP.has(b.a) && !CP.has(b.b) && !pipOf(b.a) && !pipOf(b.b)) ? `rgb(${11 + 20 * coreK},${15 + 77 * coreK},${25 + 230 * coreK})` : INK;
          const nx = -(Y(a2) - Y(a1)) / L * 7, ny = (X(a2) - X(a1)) / L * 7;
          const gap = onPip ? pipK * 10 : 0;
          return (
            <g key={i} opacity={p}>
              <line x1={X(a1)} y1={Y(a1) + gap} x2={X(a1) + (X(a2) - X(a1)) * p} y2={Y(a1) + (Y(a2) - Y(a1)) * p + gap} stroke={col} strokeWidth={5} strokeLinecap="round" />
              {b.o >= 2 && <line x1={X(a1) + nx} y1={Y(a1) + ny} x2={X(a2) + nx} y2={Y(a2) + ny} stroke={col} strokeWidth={4} strokeLinecap="round" />}
            </g>
          );
        })}
        {A.filter(a => a.el !== "C").map(a => {
          const label = a.el === "N" && a.pip ? "N" : a.el; const p = prog(f, 40, 60);
          return <g key={a.i} opacity={p}><circle cx={X(a)} cy={Y(a)} r={21} fill={PAPER} /><text x={X(a)} y={Y(a) + 12} textAnchor="middle" fontFamily={F} fontWeight={700} fontSize={34} fill={INK}>{label}</text></g>;
        })}
        <Callout x={cx} y={cy} x2={cx > 900 ? cx + 90 : cx - 90} y2={cy - 230} t="CHLORINE HITS THIS RING" sub="piperazine" p={prog(f, hitAt, hitAt + 26)} color={PINK} anchor={cx > 900 ? "start" : "end"} />
        <Callout x={ccx} y={ccy} x2={cx > 900 ? ccx - 260 : ccx + 260} y2={ccy + 300} t="THIS CORE STAYS" sub="quinolone" p={prog(f, hitAt + 90, hitAt + 116)} color={BLUE} anchor={cx > 900 ? "end" : "start"} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 124, textAlign: "center", fontFamily: F, fontWeight: 600, fontSize: 70, letterSpacing: "-.02em", color: INK, opacity: prog(f, hitAt + 120, hitAt + 140) }}>The part that stops bacteria can survive.</div>
    </AbsoluteFill>
  );
};

/* ---- bench reactor: real numbers from the build ---- */
const Draw: React.FC<{ d: string; f: number; a: number; b: number; w?: number; color?: string; dash?: string }> = ({ d, f, a, b, w = 3, color = INK, dash }) => {
  const p = prog(f, a, b);
  if (dash) return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={dash} opacity={p} />;
  return <path d={d} fill="none" stroke={color} strokeWidth={w} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} strokeLinecap="round" strokeLinejoin="round" />;
};
const L: React.FC<{ x: number; y: number; t: string; s?: string; f: number; at: number; color?: string; anchor?: "start" | "middle" | "end" }> = ({ x, y, t, s, f, at, color = INK, anchor = "middle" }) => (
  <g opacity={prog(f, at, at + 14)} fontFamily={M} textAnchor={anchor}>
    <text x={x} y={y} fontSize={27} fontWeight={500} fill={color}>{t}</text>
    {s && <text x={x} y={y + 32} fontSize={23} fill={INK} opacity={.72}>{s}</text>}
  </g>
);
export const Schematic: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const f = useCurrentFrame() * speed;
  const cx = 1290, top = 300, turns = 10, h = 420, w = 300;
  const coil = Array.from({ length: turns }, (_, i) => { const y0 = top + (i / turns) * h, y1 = top + ((i + .5) / turns) * h, y2 = top + ((i + 1) / turns) * h; return `M${cx - w / 2},${y0} Q${cx},${y0 + 34} ${cx + w / 2},${y1}`; }).join(" ");
  const back = Array.from({ length: turns }, (_, i) => { const y1 = top + ((i + .5) / turns) * h, y2 = top + ((i + 1) / turns) * h; return `M${cx + w / 2},${y1} Q${cx},${y1 - 20} ${cx - w / 2},${y2}`; }).join(" ");
  const port = (k: number) => top + k * h;
  const tt = (x: number, y: number, t: string) => <text x={x} y={y} fontFamily={F} fontWeight={700} fontSize={26} fill={BLUE} textAnchor="middle">{t}</text>;
  return (
    <AbsoluteFill>
      <Grid a={"REMOVED IS NOT SAFE\nFIG. 2  BENCH REACTOR"} b={"DESIGN\nNOT TO SCALE"} foot="Design values from our build plan. Contact time at 1 mL/min, ideal flow." />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {/* jugs */}
        <Draw d="M130,210 h170 v190 h-170 z M180,210 v-30 h70 v30" f={f} a={0} b={18} />
        <Draw d="M130,640 h170 v190 h-170 z M180,640 v-30 h70 v30" f={f} a={6} b={24} />
        <L x={215} y={445} t="FEED" s="cipro in water" f={f} at={16} />
        <L x={215} y={875} t="CHLORINE" s="10× stock" f={f} at={22} />
        {/* lines to pumps */}
        <Draw d="M300,305 H470" f={f} a={18} b={30} color={BLUE} w={4} />
        <Draw d="M300,735 H470" f={f} a={24} b={36} color={PINK} w={4} />
        {/* pumps */}
        {[305, 735].map((y, i) => <g key={y}><Draw d={`M470,${y} a70,70 0 1,0 140,0 a70,70 0 1,0 -140,0`} f={f} a={28 + i * 6} b={46 + i * 6} />
          <g opacity={prog(f, 40, 50)} transform={`rotate(${f * 3} 540 ${y})`}>{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <circle key={a} cx={540 + 42 * Math.cos(a * Math.PI / 180)} cy={y + 42 * Math.sin(a * Math.PI / 180)} r={8} fill="none" stroke={INK} strokeWidth={2.5} />)}</g></g>)}
        <L x={540} y={176} t="PUMP 1" s="0.90 mL/min" f={f} at={44} />
        <L x={540} y={848} t="PUMP 2" s="0.10 mL/min" f={f} at={50} />
        {/* pi */}
        <Draw d="M465,470 h150 v100 h-150 z" f={f} a={50} b={64} />
        <g opacity={prog(f, 58, 70)}><text x={540} y={515} textAnchor="middle" fontFamily={M} fontSize={23} fill={INK}>RASPBERRY</text><text x={540} y={546} textAnchor="middle" fontFamily={M} fontSize={23} fill={INK}>PI 4</text></g>
        <Draw d="M540,470 V375 M540,570 V665" f={f} a={60} b={72} dash="7 7" />
        {/* merge, mixer */}
        <Draw d="M610,305 H720 V520 H800" f={f} a={62} b={82} color={BLUE} w={4} />
        <Draw d="M610,735 H720 V520" f={f} a={68} b={84} color={PINK} w={4} />
        <Draw d="M800,490 h120 v60 h-120 z" f={f} a={82} b={94} />
        <Draw d="M815,520 l15,-20 l15,40 l15,-40 l15,40 l15,-40 l15,20" f={f} a={88} b={100} w={2} />
        <L x={860} y={460} t="STATIC MIXER" f={f} at={92} />
        <Draw d={`M920,520 H1040 V${top} H${cx - w / 2}`} f={f} a={94} b={112} color={BLUE} w={4} />
        {/* coil */}
        <Draw d={`M${cx - w / 2 + 16},${top - 18} H${cx + w / 2 - 16} V${top + h + 20} H${cx - w / 2 + 16} Z`} f={f} a={100} b={116} w={2} color="rgba(11,15,25,.45)" />
        <path d={back} fill="none" stroke="rgba(31,92,255,.28)" strokeWidth={5} opacity={prog(f, 112, 150)} />
        <path d={coil} fill="none" stroke={BLUE} strokeWidth={7} pathLength={turns} strokeDasharray={turns} strokeDashoffset={turns * (1 - prog(f, 110, 190))} strokeLinecap="round" />
        <L x={cx} y={205} t="3.8 m PTFE COIL" s="1/8 in inside diameter, about 10 turns" f={f} at={150} color={BLUE} />
        <L x={cx} y={top + h + 66} t="ON 114 mm PVC" f={f} at={170} />
        {/* ports */}
        {[[.25, "A", "7.5 min"], [.5, "B", "15 min"], [.75, "C", "22.5 min"]].map(([k, n, m], i) => {
          const y = port(k as number), at = 186 + i * 16, p = prog(f, at, at + 14);
          return <g key={n as string} opacity={p}><line x1={cx + w / 2} y1={y} x2={cx + w / 2 + 130 * p} y2={y} stroke={INK} strokeWidth={3} /><circle cx={cx + w / 2} cy={y} r={7} fill={BLUE} /><text x={cx + w / 2 + 145} y={y + 9} fontFamily={M} fontWeight={500} fontSize={28} fill={INK}>PORT {n as string}  {m as string}</text></g>;
        })}
        {/* outlet */}
        <Draw d={`M${cx + w / 2},${top + h} H${cx + w / 2 + 130}`} f={f} a={234} b={248} w={3} />
        <g opacity={prog(f, 240, 254)}><text x={cx + w / 2 + 145} y={top + h + 9} fontFamily={M} fontWeight={500} fontSize={28} fill={INK}>OUTLET  30 min</text></g>
        <L x={1640} y={top + h + 66} t="EVERY VIAL: BISULFITE" s="quenched by hand" f={f} at={270} color={PINK} />
      </svg>
    </AbsoluteFill>
  );
};

/* ---- our chemistry model, from assets/ride.json ---- */
export const ModelChart: React.FC<{ speed?: number }> = ({ speed = 1 }) => {
  const f = useCurrentFrame() * speed;
  const R = ride as number[][], x0 = 200, x1 = 1140, y0 = 860, y1 = 300, tMax = R[R.length - 1][0];
  const X = (t: number) => x0 + (t / tMax) * (x1 - x0), Y = (v: number) => y0 - v * (y0 - y1);
  const p = prog(f, 12, 320);
  const path = (k: number) => R.map((r, i) => `${i ? "L" : "M"}${X(r[0]).toFixed(1)},${Y(r[k]).toFixed(1)}`).join(" ");
  const txt = (at: number, o = 16) => prog(f, at, at + o);
  return (
    <AbsoluteFill style={{ background: "#07090F" }}>
      <div style={{ position: "absolute", left: 56, top: 44, fontFamily: M, fontSize: 22, color: "rgba(255,255,255,.75)", whiteSpace: "pre", lineHeight: 1.35 }}>{"REMOVED IS NOT SAFE\nFIG. 3  OUR CHEMISTRY MODEL"}</div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, .25, .5, .75, 1].map(v => <g key={v} opacity={txt(0)}><line x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.14)" /><text x={x0 - 18} y={Y(v) + 8} textAnchor="end" fontFamily={M} fontSize={23} fill="rgba(255,255,255,.65)">{v * 100}%</text></g>)}
        {[0, 10, 20, 30].filter(t => t <= tMax).map(t => <text key={t} x={X(t)} y={y0 + 42} textAnchor="middle" fontFamily={M} fontSize={23} fill="rgba(255,255,255,.65)" opacity={txt(0)}>{t} min</text>)}
        <path d={path(1)} fill="none" stroke="#FF5C9E" strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} strokeLinejoin="round" />
        <path d={path(2)} fill="none" stroke="#CFFF5E" strokeWidth={6} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} strokeLinejoin="round" />
        <text x={x0 + 18} y={y1 - 20} fontFamily={M} fontWeight={500} fontSize={26} fill="#FF5C9E" opacity={txt(30)}>CIPRO + N-CHLORO-CIPRO</text>
        <text x={x1} y={y1 - 20} textAnchor="end" fontFamily={M} fontWeight={500} fontSize={26} fill="#CFFF5E" opacity={txt(60)}>BREAKDOWN PRODUCTS</text>
      </svg>
      <div style={{ position: "absolute", left: 1210, top: 300, width: 640, fontFamily: F, fontWeight: 600, color: "#fff", fontSize: 72, lineHeight: 1.08, letterSpacing: "-.02em" }}>
        <div style={{ opacity: txt(30), transform: `translateY(${(1 - txt(30)) * 16}px)` }}>A chemistry model picks the next settings to try.</div>
        <div style={{ opacity: txt(210), transform: `translateY(${(1 - txt(210)) * 16}px)`, marginTop: 56, color: "#CFFF5E", fontSize: 58 }}>Predictions go public before the lab runs.</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: M, fontSize: 25, color: "rgba(255,255,255,.75)" }}>Our chemistry model at 5 mg/L chlorine, pH 7.5.</div>
    </AbsoluteFill>
  );
};
