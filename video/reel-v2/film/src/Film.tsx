import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame, interpolate, spring, Easing, Audio, getRemotionEnvironment } from "remotion";
import { loadFont as inter } from "@remotion/google-fonts/InterTight";
import { loadFont as mono } from "@remotion/google-fonts/JetBrainsMono";
import edl from "./edl.json";
import { Molecule, Schematic, ModelChart } from "./Plates";

const { fontFamily: F } = inter("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
const { fontFamily: M } = mono("normal", { weights: ["400", "500"], subsets: ["latin"] });
export const FONT = F, MONO = M;
export const fb = (b: number) => Math.round(b * 30);
const SLAB = "#1A1248", ROSE = "#FF8DB8", TINT = "#F8CFE0", INK = "#0B0F19", PINK = "#FF5C9E", LIME = "#CFFF5E";

type Shot = { b: number; n: number; file: string; dim: number; img: boolean; f: number; z: number; iris: number };
const shots = edl.shots as unknown as Shot[];
/** Soft-edged circle that opens from the centre. */
const irisMask = (f: number, dur: number) => {
  const r = interpolate(f, [0, dur], [0, 150], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const m = `radial-gradient(circle at 50% 50%, #000 ${Math.max(0, r - 28)}%, transparent ${r}%)`;
  return { WebkitMaskImage: m, maskImage: m } as React.CSSProperties;
};
const push = (x: number) => 1.02 + .17 * (1 - Math.exp(-x / 420));
const TAIL = 40;
const ShotView: React.FC<{ s: Shot; gap: boolean }> = ({ s, gap }) => {
  const f = useCurrentFrame();
  const len = fb(s.n);
  const inK = s.f > 0 ? interpolate(f, [0, s.f], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 1;
  const outK = gap ? interpolate(f, [len, len + TAIL], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const z = push(s.z + f);
  return (
    <AbsoluteFill style={{ opacity: inK * outK, ...(s.iris ? irisMask(f, s.iris) : {}) }}>
      <AbsoluteFill style={{ transform: `scale(${z})` }}>
        {s.img ? <Img src={staticFile(s.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <OffthreadVideo src={staticFile(s.file)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </AbsoluteFill>
      {s.dim > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${s.dim})` }} />}
    </AbsoluteFill>
  );
};

/** One huge word that sits still while the pictures change under it. */
const Word: React.FC<{ t: string; color?: string; size?: number; n: number }> = ({ t, color = "#fff", size = 250 }) => {
  const f = useCurrentFrame();
  const k = interpolate(f, [0, 7], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: F, fontWeight: 600, fontSize: size, color, letterSpacing: "-0.035em", lineHeight: 1, textShadow: "0 6px 60px rgba(0,0,0,.55)", opacity: k, filter: `blur(${(1 - k) * 16}px)`, transform: `scale(${1.06 - k * .06})` }}>{t}</div>
    </AbsoluteFill>
  );
};

/** Lines that arrive one word at a time, on the music. */
const Say: React.FC<{ t: string; size?: number; color?: string; y?: number; beatsPerWord?: number; shadow?: boolean; weight?: number; maxW?: number }> = ({ t, size = 76, color = "#fff", y = 0, beatsPerWord = .5, shadow = true, weight = 600, maxW = 1560 }) => {
  const f = useCurrentFrame();
  const words = t.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${y}px)` }}>
      <div style={{ fontFamily: F, fontWeight: weight, fontSize: size, color, lineHeight: 1.12, letterSpacing: "-0.02em", textAlign: "center", maxWidth: maxW, textWrap: "balance", textShadow: shadow ? "0 3px 34px rgba(0,0,0,.65)" : undefined }}>
        {words.map((w, i) => {
          const st = i * beatsPerWord * 30; const k = interpolate(f, [st, st + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          return <span key={i} style={{ display: "inline-block", marginRight: "0.26em", opacity: k, transform: `translateY(${(1 - k) * 18}px)` }}>{w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Giant figure with a short line under it. */
const Big: React.FC<{ n: string; sub: string; color?: string; size?: number; subDelay?: number; subColor?: string; shadow?: boolean }> = ({ n, sub, color = "#fff", size = 420, subDelay = 30, subColor = "#fff", shadow = true }) => {
  const f = useCurrentFrame();
  const k = spring({ frame: f, fps: 60, config: { damping: 16, stiffness: 170, mass: .7 } });
  const s = interpolate(f, [subDelay, subDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: F, fontWeight: 700, fontSize: size, color, letterSpacing: "-0.05em", lineHeight: .95, transform: `scale(${.86 + k * .14})`, opacity: Math.min(1, k * 1.4), textShadow: shadow ? "0 8px 70px rgba(0,0,0,.5)" : undefined }}>{n}</div>
      <div style={{ fontFamily: F, fontWeight: 600, fontSize: 68, color: subColor, marginTop: 20, opacity: s, transform: `translateY(${(1 - s) * 14}px)`, textShadow: shadow ? "0 3px 34px rgba(0,0,0,.75)" : undefined, textAlign: "center", maxWidth: 1400, textWrap: "balance", lineHeight: 1.12, letterSpacing: "-0.015em" }}>{sub}</div>
    </AbsoluteFill>
  );
};

const Credit: React.FC<{ t: string; color?: string }> = ({ t, color = "rgba(255,255,255,.82)" }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 44, textAlign: "center", fontFamily: M, fontSize: 25, color, letterSpacing: ".01em" }}>{t}</div>
);
const Tag: React.FC<{ a: string; b: string; color?: string }> = ({ a, b, color = "rgba(255,255,255,.75)" }) => (
  <>
    <div style={{ position: "absolute", left: 56, top: 44, fontFamily: M, fontSize: 21, color, lineHeight: 1.35 }}>{a}</div>
    <div style={{ position: "absolute", right: 56, top: 44, fontFamily: M, fontSize: 21, color, textAlign: "right", lineHeight: 1.35 }}>{b}</div>
  </>
);

const Bars: React.FC = () => {
  const f = useCurrentFrame();
  const w = 1320, k1 = interpolate(f, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }), k2 = interpolate(f, [60, 150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const lab = (t: string, o: number) => <div style={{ fontFamily: F, fontWeight: 600, fontSize: 48, color: "#fff", opacity: o, marginBottom: 12, textShadow: "0 2px 20px rgba(0,0,0,.7)" }}>{t}</div>;
  const op = interpolate(f, [150, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ padding: "230px 300px 0", alignItems: "flex-start" }}>
      {lab("Resistance limit: 0.064 µg/L", k1)}
      <div style={{ height: 40, width: (w * .064 / 1.4) * k1, background: "#fff" }} />
      <div style={{ height: 66 }} />
      {lab("Cipro measured leaving plants: up to 1.4 µg/L", interpolate(f, [55, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}
      <div style={{ height: 76, width: w * k2, background: PINK }} />
      <div style={{ fontFamily: F, fontWeight: 700, fontSize: 200, color: "#fff", opacity: op, marginTop: 34, letterSpacing: "-.04em", transform: `scale(${.92 + op * .08})`, transformOrigin: "left center" }}>22×</div>
    </AbsoluteFill>
  );
};

const Dial: React.FC<{ t: string; note: string }> = ({ t, note }) => (
  <AbsoluteFill><Word t={t} size={170} n={2} /><Sequence from={8} layout="none"><div style={{ position: "absolute", left: 0, right: 0, top: 650, textAlign: "center", fontFamily: M, fontSize: 48, color: "#fff", textShadow: "0 2px 18px rgba(0,0,0,.9)" }}>{note}</div></Sequence></AbsoluteFill>
);

const Step: React.FC<{ n: string; t: string; sub: string }> = ({ n, t, sub }) => {
  const f = useCurrentFrame(); const k = spring({ frame: f, fps: 60, config: { damping: 18, stiffness: 190 } }); const s = interpolate(f, [14, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: M, fontSize: 44, color: LIME, opacity: k, marginBottom: 14 }}>{n} / 4</div>
      <div style={{ fontFamily: F, fontWeight: 600, fontSize: 150, color: "#fff", letterSpacing: "-.03em", lineHeight: 1, transform: `translateY(${(1 - k) * 34}px)`, opacity: k, textShadow: "0 6px 50px rgba(0,0,0,.55)" }}>{t}</div>
      <div style={{ fontFamily: F, fontWeight: 500, fontSize: 60, color: "#fff", marginTop: 24, opacity: s, textShadow: "0 3px 30px rgba(0,0,0,.8)" }}>{sub}</div>
    </AbsoluteFill>
  );
};

/** The ending: the slab falls from the top and drives the line down. */
const End: React.FC = () => {
  const f = useCurrentFrame();
  const SLAM = fb(4), SLAB_H = 500, fall = interpolate(f, [SLAM - 26, SLAM], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), dt = (f - SLAM) / 60, landed = f >= SLAM;
  const slabY = landed ? -Math.abs(Math.exp(-5.6 * dt) * Math.sin(10 * dt)) * 40 : -SLAB_H - 80 + (SLAB_H + 80) * fall ** 3;
  const edge = slabY + SLAB_H, CENTRE = 540, PUSHED = 790, GAP = PUSHED - 130 - SLAB_H, push = Math.max(0, Math.min(400, edge + GAP + 130 - CENTRE));
  const hit = landed ? Math.exp(-5.2 * dt) * Math.cos(16 * dt) : 0;
  const shake = landed && dt < .34 ? (1 - dt / .34) * 16 : 0, sx = Math.sin(f * 2.3) * shake, sy = Math.cos(f * 3.1) * shake;
  const inK = spring({ frame: f, fps: 60, config: { damping: 14, stiffness: 170 } });
  const nm = interpolate(f, [fb(5.6), fb(5.6) + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const stretch = !landed ? 1 + .3 * fall * fall : 1 - .18 * Math.exp(-5 * dt) * Math.cos(9 * dt);
  const fade = interpolate(f, [fb(14), fb(15)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: ROSE, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px)` }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: CENTRE + push - 160 + (1 - inK) * 50 + 26 * hit, textAlign: "center", fontFamily: F, fontWeight: 700, fontSize: 142, lineHeight: 1.08, color: SLAB, letterSpacing: "-.03em", opacity: Math.min(1, inK * 1.4), transform: `scale(${1 + .1 * hit},${1 - .22 * hit})` }}>Be the first plant<br />to know.</div>
        <div style={{ position: "absolute", left: -40, right: -40, top: slabY - 700, height: 700 + SLAB_H, background: SLAB }}>
          <div style={{ position: "absolute", left: 40, right: 40, bottom: 118, textAlign: "center", transform: `scale(${2 - stretch},${stretch})`, transformOrigin: "center bottom" }}>
            <div style={{ fontFamily: F, fontWeight: 700, fontSize: 172, color: "#fff", letterSpacing: "-.035em", lineHeight: 1 }}>Removed Is Not Safe</div>
            <div style={{ fontFamily: F, fontWeight: 500, fontSize: 50, color: TINT, marginTop: 30, opacity: nm }}>Suryansh Gupta + Ritik Shenoy</div>
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: fade }} />
    </AbsoluteFill>
  );
};

/** Everything on screen fades in and out; `tail` lets it dissolve over what comes next. */
const Env: React.FC<{ len: number; i: number; o: number; iris?: number; children: React.ReactNode }> = ({ len, i, o, iris, children }) => {
  const f = useCurrentFrame();
  const a = i > 0 ? interpolate(f, [0, i], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 1;
  const b = o > 0 ? interpolate(f, [len - o, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) }) : 1;
  return <AbsoluteFill style={{ opacity: iris ? b : a * b, ...(iris ? irisMask(f, iris) : {}) }}>{children}</AbsoluteFill>;
};
const O: React.FC<{ b: number; n: number; i?: number; o?: number; tail?: number; iris?: number; children: React.ReactNode }> = ({ b, n, i, o, tail = 0, iris, children }) => {
  const len = fb(n); const dflt = Math.min(12, Math.floor(len / 3));
  return <Sequence from={fb(b)} durationInFrames={len + tail}><Env len={len + tail} i={i ?? dflt} o={tail || (o ?? dflt)} iris={iris}>{children}</Env></Sequence>;
};
const K2019 = "Kennedy Neth et al. 2019. Lab water, 120 min after chlorine.";

/** The voice of the film: a small line that rides over the pictures and across cuts. */
const Line: React.FC<{ t: string; color?: string; size?: number; per?: number; shadow?: boolean }> = ({ t, color = "#fff", size = 74, per = .28, shadow = true }) => {
  const f = useCurrentFrame(); const words = t.split(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontFamily: F, fontWeight: 500, fontSize: size, color, letterSpacing: "-.015em", textAlign: "center", maxWidth: 1300, lineHeight: 1.18, textWrap: "balance", textShadow: shadow ? "0 2px 30px rgba(0,0,0,.75), 0 0 80px rgba(0,0,0,.45)" : undefined }}>
        {words.map((w, i) => <span key={i} style={{ opacity: interpolate(f, [i * per * 30, i * per * 30 + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), marginRight: ".26em", display: "inline-block" }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
};
/** Hard-cut word for the flash climax: no fade, it is simply there. */
const Hit: React.FC<{ t: string; color?: string; size?: number }> = ({ t, color = "#fff", size = 300 }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: F, fontWeight: 700, fontSize: size, color, letterSpacing: "-.04em", lineHeight: 1, textShadow: "0 0 70px rgba(0,0,0,.8), 0 4px 16px rgba(0,0,0,.6)" }}>{t}</div>
  </AbsoluteFill>
);
/** The last flashes dissolve into the rose of the ending. */
const Bloom: React.FC = () => { const f = useCurrentFrame(); return <AbsoluteFill style={{ background: ROSE, opacity: interpolate(f, [0, fb(2.5)], [0, 1], { extrapolateRight: "clamp", easing: Easing.in(Easing.quad) }) }} />; };
/** A finished plate held for a beat inside a burst. */
const Done: React.FC<{ children: React.ReactNode }> = ({ children }) => <Sequence from={-400} layout="none">{children}</Sequence>;

export const Film: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {shots.map((s, i) => {
      const next = shots.slice(i + 1).find(x => !x.iris);
      const gap = !next || next.b > s.b + s.n + .01;
      const over = gap ? TAIL : Math.max(next!.f, 1) + 2;
      return <Sequence key={i} from={fb(s.b)} durationInFrames={Math.max(1, fb(s.n)) + over}><ShotView s={s} gap={gap} /></Sequence>;
    })}

    {/* ACT 1: THE PROMISE */}
    <O b={4.5} n={6} o={16}><Line t="Every morning, billions of people turn on a tap." /></O>
    <O b={11} n={5} o={16}><Line t="And never think twice." per={.4} /></O>
    <O b={16} n={4}><Hit t="Water" size={280} /></O>
    <O b={20} n={3} o={14}><Line t="It wasn't always this way." /></O>
    <O b={23} n={4}><Say t="A century ago, a glass of water could kill you." size={84} beatsPerWord={.3} maxW={1300} /></O>
    <O b={27} n={4}><Hit t="Typhoid" size={280} /></O>
    <O b={31} n={2} o={10}><Line t="Then we learned to clean it." per={.2} /></O>
    <O b={33} n={2}><Hit t="Chlorine" size={280} /></O>
    <O b={35} n={2}><Credit t="City Water Supply, 1941. Public domain." /></O>
    <O b={37} n={2} o={10}><Line t="It worked." size={110} /></O>
    <O b={39.3} n={1.7} o={8}><Line t="Then we learned to heal." per={.2} /></O>
    <O b={41} n={4}><Hit t="Antibiotics" size={250} /></O>
    <O b={45} n={2} o={12}><Line t="They worked too." size={110} /></O>
    <O b={47.4} n={3.5} o={14}><Line t="Two of the greatest things we ever did." /></O>
    <O b={51.3} n={2.7} o={16}><Line t="Then they met." size={110} per={.5} /></O>

    {/* ACT 2: THE TURN */}
    <O b={54} n={2}><Say t="Antibiotics leave our bodies." size={96} beatsPerWord={.2} /></O>
    <O b={56} n={2}><Say t="Go down the drain." size={96} beatsPerWord={.2} /></O>
    <O b={58} n={2}><Say t="Reach the plant." size={96} beatsPerWord={.2} /></O>
    <O b={60} n={2}><Say t="Chlorine hits them too." size={96} beatsPerWord={.2} /></O>
    <O b={62} n={10} tail={26} iris={50}><Molecule speed={1.45} /></O>
    <O b={72} n={4}><AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.42)" }}><Big n="72%" sub="of this antibiotic, destroyed." color={INK} subColor={INK} subDelay={24} shadow={false} /></AbsoluteFill></O>
    <O b={72} n={4}><Credit t={K2019} color="rgba(11,15,25,.8)" /></O>
    <O b={76} n={2} o={12}><Line t="By the numbers, gone." per={.25} color={INK} shadow={false} /></O>
    <O b={78} n={3} o={20}><Line t="Then they tested the water on bacteria." per={.25} color={INK} shadow={false} /></O>
    <O b={82} n={8} o={18}><Big n="70%" sub="of the antibiotic's power to stop bacteria was still there." subDelay={40} /></O>
    <O b={82} n={8}><Credit t={K2019} /></O>
    <O b={89.5} n={4.5} i={30} tail={14}><AbsoluteFill style={{ background: "#fff" }}><Say t="Removed isn't the same as safe." size={132} color={INK} shadow={false} beatsPerWord={.3} /></AbsoluteFill></O>
    <O b={94.4} n={1.6} o={8}><Line t="And bacteria learn." size={100} per={.3} /></O>
    <O b={96} n={4}><Say t="Even a trace of antibiotic can train them." size={96} beatsPerWord={.32} maxW={1300} /></O>
    <O b={100} n={2}><Hit t="The weak slow down." size={130} /></O>
    <O b={102} n={2}><Hit t="The resistant take over." size={130} /></O>
    <O b={96} n={8}><Credit t="Lab study including cipro: Gullberg et al. 2011, PLoS Pathogens. Footage illustrative." /></O>
    <O b={104} n={8}><Big n="1,270,000" size={250} sub="deaths in 2019 from drug-resistant bacteria." subDelay={45} /></O>
    <O b={104} n={8}><Credit t="Murray et al. 2022, The Lancet." /></O>
    <O b={112} n={8}><Bars /></O>
    <O b={112} n={8}><Credit t="Batt et al. 2007; Bengtsson-Palme & Larsson 2016." /></O>
    <O b={120} n={2}><Dial t="Residual chlorine" note="measured" /></O>
    <O b={122} n={2}><Dial t="Ammonia" note="measured" /></O>
    <O b={124} n={2}><Dial t="Contact time" note="set by design" /></O>
    <O b={126} n={4}><Word t="Activity?" size={230} color={LIME} n={4} /><Sequence from={fb(1.2)}><Say t="One dial is missing." size={64} y={210} beatsPerWord={.3} /></Sequence></O>
    <O b={130.4} n={3.6} o={16}><Line t="So two students designed a way to read it." per={.3} /></O>

    {/* ACT 3: THE RISE */}
    <O b={134} n={8} tail={24} iris={50}><Schematic speed={1.6} /></O>
    <O b={142} n={3}><div style={{ position: "absolute", left: 96, top: 110, fontFamily: F, fontWeight: 600, fontSize: 92, color: INK, letterSpacing: "-.025em" }}>The whole chlorine step, on one bench.</div></O>
    <O b={152} n={2.5}><div style={{ position: "absolute", left: 96, top: 110, fontFamily: F, fontWeight: 600, fontSize: 84, color: INK, letterSpacing: "-.025em" }}>Thirty minutes of contact.</div></O>
    <O b={154.5} n={1.5}><div style={{ position: "absolute", left: 96, top: 780, fontFamily: F, fontWeight: 600, fontSize: 84, color: INK, letterSpacing: "-.025em" }}>Dechlorinated, like the plant.</div></O>
    <O b={142} n={14}><Credit t="3D design of our bench reactor." color="rgba(11,15,25,.72)" /></O>
    <O b={156} n={2}><Hit t="Dose" /></O>
    <O b={158} n={2}><Hit t="Time" /></O>
    <O b={160} n={2}><Hit t="Chlorine form" size={190} /></O>
    <O b={162} n={2}><Hit t="Dechlorinator" size={190} /></O>
    <O b={164} n={3}><Hit t="How much drug?" size={170} /><Sequence from={14}><Say t="HPLC" size={62} y={150} beatsPerWord={0} /></Sequence></O>
    <O b={167} n={3}><Hit t="How much power?" size={170} /><Sequence from={14}><Say t="Live bacteria" size={62} y={150} beatsPerWord={0} /></Sequence></O>
    <O b={170} n={8} i={22} tail={24}><ModelChart speed={1.6} /></O>
    <O b={178} n={3}><Hit t="Now we need one plant." size={130} /></O>
    <O b={181} n={2.5}><Step n="1" t="Share your numbers" sub="Dose, contact time, ammonia, pH." /></O>
    <O b={183.5} n={2.5}><Step n="2" t="Send one sample" sub="A small volume of effluent." /></O>
    <O b={186} n={2.5}><Step n="3" t="We test the settings" sub="At our bench. Drug and activity." /></O>
    <O b={188.5} n={2.5}><Step n="4" t="Get a settings report" sub="Your data, for your team." /></O>
    <O b={191} n={4}><Say t="Chlorine saved cities." size={140} beatsPerWord={.4} /></O>
    <O b={195} n={3}><Say t="It still does." size={140} beatsPerWord={.4} /></O>
    <O b={198} n={4}><Say t="Let's measure what it leaves behind." size={130} beatsPerWord={.45} maxW={1400} /></O>

    {/* climax: finished plates and hard words inside the flashes */}
    <O b={206} n={1} i={4} o={4}><Hit t="Water" size={320} /></O>
    <O b={207} n={1} i={4} o={4}><Hit t="Chlorine" size={320} /></O>
    <O b={208} n={1} i={4} o={4}><Hit t="Antibiotics" size={280} /></O>
    <O b={209.5} n={.5} i={6} o={6}><Done><Molecule /></Done></O>
    <O b={210} n={.5} i={6} o={6}><Done><Schematic /></Done></O>
    <O b={211} n={1} i={4} o={4}><Hit t="Measure" size={320} /></O>
    <O b={212} n={1} i={4} o={4}><Hit t="what's" size={320} /></O>
    <O b={213} n={1} i={4} o={10}><Hit t="left." size={320} /></O>

    <Sequence from={fb(212.5)} durationInFrames={fb(3)}><Bloom /></Sequence>
    <Sequence from={fb(215)} durationInFrames={fb(15)}><End /></Sequence>

    {([[16, 21, "01 THE PROMISE"], [41, 6, "02 THE CURE"], [54, 8, "03 THE DRAIN"], [96, 24, "04 WHY IT MATTERS"], [156, 14, "05 THE TEST"], [181, 10, "06 YOUR PLANT"]] as [number, number, string][]).map(([b, n, t]) => (
      <O key={t} b={b} n={n}><Tag a="REMOVED IS NOT SAFE" b={t} /></O>
    ))}
    {!getRemotionEnvironment().isRendering && <Audio src={staticFile("music.wav")} />}
  </AbsoluteFill>
);
