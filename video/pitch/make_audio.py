"""Original music and sound effects for the pitch, all synthesized here. Writes audio.wav.
Every effect is placed from timeline.js and the scene timings, so sound and picture stay locked."""
import json, re, pathlib
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
rng = np.random.default_rng(2027)
tl = json.loads(re.sub(r"(\w+):", r'"\1":', re.search(r"\[.*\]", re.sub(r"//.*", "", pathlib.Path("timeline.js").read_text()), re.S).group(0)).replace(",\n]", "\n]"))
t = 0.0; S = {}
for s in tl:
    s["dur"] = s["to"] - s["from"] if s["type"] == "old" else s["dur"]
    S[s["id"]] = t; s["start"] = t; t += s["dur"]
TOTAL = t; N = int(TOTAL * SR) + SR
music, sfx, verb_send = [np.zeros((N, 2)) for _ in range(3)]
print("total", TOTAL, {k: round(v, 1) for k, v in S.items()})

def env(n, a=.005, r=.1):
    x = np.ones(n); na, nr = int(a * SR), min(int(r * SR), n)
    x[:na] = np.linspace(0, 1, na) if na else 1; x[n - nr:] *= np.linspace(1, 0, nr); return x
def put(buf, at, sig, gain=1.0, pan=0.0):
    i = int(at * SR); sig = sig[:max(0, N - i)]
    if i < 0 or len(sig) == 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * gain * l; buf[i:i + len(sig), 1] += sig * gain * r
def fx(at, sig, gain=1.0, pan=0.0, wet=.25):
    put(sfx, at, sig, gain, pan); put(verb_send, at, sig, gain * wet, pan)
def sweep_noise(dur, f0, f1, q=1.5):
    """Noise through a band filter that moves from f0 to f1: the core of every whoosh."""
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); block = 256; zi = None
    for i in range(0, n, block):
        k = i / n; f = np.clip(f0 * (f1 / f0) ** k, 40, SR / 2.2)
        sos = butter(2, [f / (1 + .5 / q), min(f * (1 + .5 / q), SR / 2.1)], "band", fs=SR, output="sos")
        if zi is None: zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = sosfilt(sos, x[i:i + block], zi=zi)
    return out / (np.abs(out).max() + 1e-9)
def whoosh(dur=.7, up=True):
    n = int(dur * SR); e = np.sin(np.pi * np.linspace(0, 1, n) ** (1.6 if up else .6)) ** 2
    return sweep_noise(dur, 300 if up else 4500, 4500 if up else 300) * e
def tone(dur, f0, f1=None, kind="sine"):
    n = int(dur * SR); f = np.geomspace(f0, f1 or f0, n); ph = 2 * np.pi * np.cumsum(f) / SR; return np.sin(ph)
def pop(f=600, dur=.09): return tone(dur, f * 1.9, f) * np.exp(-np.linspace(0, 7, int(dur * SR)))
def tick(f=2600, dur=.018): return (tone(dur, f) + .4 * rng.standard_normal(int(dur * SR))) * np.exp(-np.linspace(0, 6, int(dur * SR)))
def click():
    x = tick(1500, .03); y = tick(3200, .012); x[:len(y)] += .6 * y; return x
def pluck(f, dur=.9):
    n = int(dur * SR); d = np.exp(-np.linspace(0, 6, n)); return sum(a * tone(dur, f * h) for h, a in [(1, 1), (2, .45), (3, .18), (4, .08)]) * d * env(n, .002, .02)
def bell(f, dur=2.4):
    n = int(dur * SR); return sum(a * tone(dur, f * h) * np.exp(-np.linspace(0, d, n)) for h, a, d in [(1, 1, 4), (2.01, .5, 6), (3.01, .3, 9), (4.2, .18, 12)]) * env(n, .002, .05)
def impact(dur=2.2, f=46):
    n = int(dur * SR); sub = tone(dur, 150, f) * np.exp(-np.linspace(0, 4.5, n)); nb = sosfilt(butter(2, 900, "low", fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-np.linspace(0, 16, n)); return sub + .9 * nb / (np.abs(nb).max() + 1e-9)
def riser(dur, f0=180, f1=3200):
    n = int(dur * SR); e = np.linspace(0, 1, n) ** 2.2; return (sweep_noise(dur, f0, f1, 3) * .8 + .25 * tone(dur, f0 / 2, f1 / 5)) * e * env(n, .01, .03)
def sizzle(dur=1.1):
    n = int(dur * SR); return sosfilt(butter(2, 3500, "high", fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-np.linspace(0, 5, n)) * (1 + .5 * np.sin(2 * np.pi * 34 * np.arange(n) / SR)) * .5
def plink(f=900): return tone(.16, f * .7, f * 1.9) * np.exp(-np.linspace(0, 6, int(.16 * SR)))
def smooth(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)

# ------------------------------------------------------------------ music
BPM = 84; beat = 60 / BPM; bar = beat * 4
note = lambda m: 440 * 2 ** ((m - 69) / 12)
DARK = [[38, 50, 57, 65, 69], [34, 46, 53, 62, 65], [41, 48, 57, 60, 65], [36, 48, 55, 64, 67]]   # Dm Bb F C
LIGHT = [[38, 50, 57, 66, 69], [33, 45, 57, 64, 69], [35, 47, 54, 62, 66], [31, 43, 55, 62, 67]]  # D A Bm G
def pad(notes, dur):
    n = int(dur * SR); tt = np.arange(n) / SR; sig = np.zeros((n, 2))
    for j, m in enumerate(notes):
        f = note(m)
        for det, side in ((.997, 0), (1.003, 1)):
            w = sum(a * np.sin(2 * np.pi * f * h * det * tt + j) for h, a in [(1, 1), (2, .35), (3, .12)])
            sig[:, side] += w * (.32 if m < 44 else .2)
    return sig * env(n, 1.1, 1.3)[:, None]
def bed(chords, start, end, buf):
    t0 = start; i = 0; hold = bar * 2
    while t0 < end:
        p = pad(chords[i % 4], hold + 1.3); j = int(t0 * SR); p = p[:max(0, len(buf) - j)]; buf[j:j + len(p)] += p; t0 += hold; i += 1
act2 = S["Drop to light"]; ride0, ride1 = S["Coil ride"], S["Coil ride"] + 15.5; close0 = S["Close"]
darkbed, lightbed = np.zeros((N, 2)), np.zeros((N, 2)); bed(DARK, 0, act2 + 2, darkbed); bed(LIGHT, act2 - .5, TOTAL + 1, lightbed)
pulse = np.zeros((N, 2)); arp = np.zeros((N, 2))
for k in range(int(act2 / beat) + 1):
    if k % 4 in (0, 3): put(pulse, k * beat, tone(.5, 72, 42) * np.exp(-np.linspace(0, 5, int(.5 * SR))), .9)
pat = [0, 3, 2, 4, 1, 3, 2, 4]
k = 0; t0 = act2 + 1.8
while t0 < TOTAL:
    bar_i = int((t0 - (act2 - .5)) / (bar * 2)) % 4; ch = LIGHT[bar_i]; m = ch[pat[k % 8]] + 12
    put(arp, t0, pluck(note(m), .8), .26 + .06 * (k % 4 == 0), .35 * np.sin(k * .9)); k += 1; t0 += beat / 2
def gain_curve(points):
    xs, ys = zip(*points); return np.interp(np.arange(N) / SR, xs, ys)
split = S["Removed vs. Active"]; hit = split + 14.0
gd = gain_curve([(0, 0), (2, .75), (S["Molecule"] - 1, .85), (split, 1), (split + 10, 1.1), (split + 11.4, .05), (hit, .03), (hit + .3, .9), (act2, .8), (act2 + 1.2, 0), (TOTAL, 0)])
gl = gain_curve([(0, 0), (act2, 0), (act2 + 1.5, .8), (ride0, .85), (ride0 + 1, .3), (ride1 - 1, .3), (ride1, .95), (close0 - 1, .95), (close0 + 4, 1.1), (TOTAL - 1.4, .9), (TOTAL, 0)])
ga = gain_curve([(0, 0), (act2 + 1.7, 0), (act2 + 2.5, .75), (ride0, .8), (ride0 + 1, 0), (ride1 - .4, 0), (ride1 + .5, .85), (close0, .85), (close0 + 1, .35), (TOTAL - 2, .25), (TOTAL - .6, 0), (TOTAL, 0)])
gp = gain_curve([(0, 0), (1, .6), (split, .85), (split + 10.8, 1), (split + 11.4, 0), (hit + .4, 0), (hit + .9, .7), (act2, .5), (act2 + .6, 0), (TOTAL, 0)])
music += darkbed * gd[:, None] + lightbed * gl[:, None] + arp * ga[:, None] + pulse * gp[:, None]
music = sosfilt(butter(2, 3400, "low", fs=SR, output="sos"), music, axis=0)
music /= np.abs(music).max()

# ------------------------------------------------------------------ effects: old clips
o = S["hook"]
fx(o, riser(1.4, 100, 900), .25); fx(o + 6.4, impact(1.8, 60), .55); fx(o + 6.4, sizzle(.9), .22)
fx(o + 8.15, whoosh(.5, False), .3); fx(o + 8.2, impact(2.4), .85)
for k, tk in enumerate(np.arange(8.3, 10.7, .09)): fx(o + tk, tick(1500 + k * 45), .1, wet=.05)
fx(o + 10.7, pop(320, .2), .4)
o = S["pill"]; fx(o - .25, whoosh(.55), .42)
for k, at in enumerate([15.8, 17.4, 19.0, 20.6, 22.2, 23.8]): fx(o + at - 14.9, pluck(note(62 + [0, 3, 7, 10, 12, 15][k]), 1.1), .4, -.6 + k * .24, .4)
o = S["x22"]; fx(o - .25, whoosh(.5), .42); fx(o + .8, impact(1.8, 58), .7); fx(o + 1.4, riser(1.6, 200, 1800), .22); fx(o + 3.0, pop(260, .22), .45)
# molecule
o = S["Molecule"]; fx(o - .3, whoosh(.7), .4); fx(o + .4, riser(1.1, 300, 2000), .13)
fx(o + 3.3, sweep_noise(1.8, 2500, 500, 3) * env(int(1.8 * SR), .3, .2), .3, .6)
fx(o + 5, impact(1.5, 70), .6); fx(o + 5, sizzle(1.3), .5); fx(o + 5, bell(note(81), 1.5), .12)
for k in range(5): fx(o + 8.3 + k * .52 + rng.random() * .1, pop(180 + 90 * k, .16), .5, .55)
fx(o + 8.2, sweep_noise(3.2, 900, 170, 2) * env(int(3.2 * SR), .3, .6), .22, .4)
fx(o + 11.6, bell(note(74), 3.2), .3, wet=.7); fx(o + 11.8, bell(note(81), 3), .2, wet=.7); fx(o + 12.2, impact(1.8, 42), .5)
# removed vs active: every flipped well and every counter step gets a sound, computed the same way as the picture
o = split; fx(o - .3, whoosh(.6), .35); fx(o + 3.0, plink(1100), .5, wet=.6); fx(o + 3.2, sizzle(.8), .28)
kn = [(0, 1, 1), (.5, .38, .763), (1, .369, .767), (5, .317, .709), (10, .297, .665), (30, .289, .682), (60, .286, .651), (120, .276, .704)]
prev = (100, 0)
for f in range(int(3.2 * 60), int(10.5 * 60)):
    tt = f / 60; p = smooth((tt - 3.2) / 7.3); m = .5 * (241 ** p - 1)
    d = np.interp(m, [a[0] for a in kn], [a[1] for a in kn]); a = np.interp(m, [a[0] for a in kn], [a[2] for a in kn])
    now = (round(d * 100), round((1 - a) * 72))
    if now[0] != prev[0]: fx(o + tt, tick(900 + now[0] * 14), .13, -.45, .05)
    if now[1] != prev[1]: fx(o + tt, pop(430 + now[1] * 12, .05), .22, .45, .15)
    prev = now
fx(o + 7.5, riser(3.8, 150, 2600), .22); fx(o + 12.6, click(), .35)
fx(hit, impact(3.2, 36), 1.0); fx(hit, bell(note(62), 3), .22, wet=.8); fx(hit, sweep_noise(.4, 5000, 400) * env(int(.4 * SR)), .3)
# transitions and question
o = S["Drop to light"]; fx(o + .7, plink(760), .7, wet=.9); fx(o + .8, whoosh(1.0), .36)
o = S["Settings act on water"]; fx(o + .2, pop(520), .22, wet=.5)
for span, pan in (((1.5, 3.5), -.3), ((3.7, 5.7), -.3)):
    for tk in np.arange(span[0], span[1], .11): fx(o + tk, tick(1800, .012), .1 + .12 * np.sin((tk - span[0]) / (span[1] - span[0]) * np.pi), pan, .04)
    fx(o + span[1], pop(720, .1), .3, pan)
for k in range(18): fx(o + 1.9 + rng.random() * 1.5, pop(800 + rng.random() * 800, .05), .1, .4 * rng.random() + .25, .4)
fx(o + 5.9, click(), .6, -.3); fx(o + 6.1, pop(640, .12), .25, .4); fx(o + 7.7, click(), .6, -.3); fx(o + 7.8, sizzle(.9), .26, .4); fx(o + 8.8, pop(600), .2); fx(o + 9.0, pop(780), .15)
o = S["Title"]; fx(o + .1, plink(980), .55, wet=.9); fx(o + .5, bell(note(69), 2.6), .24, wet=.8); fx(o + .5, bell(note(74), 2.6), .16, wet=.8)
# reactor
o = S["reactor"]; fx(o - .3, whoosh(.6), .28)
for at in (0.7, 3.7, 7.2, 10.8, 14.4): fx(o + at, whoosh(.45), .18); fx(o + at + .3, pop(520, .1), .22, wet=.4)
n = int(17 * SR); tt = np.arange(n) / SR; hum = (np.sin(2 * np.pi * 96 * tt) * .5 + np.sin(2 * np.pi * 192 * tt) * .25) * (.55 + .45 * (np.sin(2 * np.pi * 3.3 * tt) > .6)) * env(n, 1.2, 1.2)
fx(o, hum, .055, wet=.03)
# coil ride
o = ride0; fx(o, riser(1.2, 200, 2800), .4); fx(o + 1.2, impact(1.5, 55), .6); fx(o + 1.2, sizzle(1.0), .5)
n = int(13.2 * SR); rum = sweep_noise(13.2, 180, 340, 1.1) * env(n, .5, 1.0) * (.75 + .25 * np.sin(np.arange(n) / SR * 2 * np.pi * .32)); fx(o + 1.0, rum, .22, wet=.08)
for k in range(95): fx(o + 1.5 + rng.random() * 12.3, pop(300 + rng.random() * 1100, .05 + rng.random() * .05), .07 + rng.random() * .08, rng.uniform(-.8, .8), .35)
for k, at in enumerate((4.4, 7.6, 10.8, 14.0)): fx(o + at, bell(note([76, 79, 81, 86][k]), 1.7), .3, wet=.6)
fx(o + 14.2, whoosh(1.2), .5)
# measure and model loop
o = S["measure"]; fx(o + .1, pop(540), .3); fx(o + 1.2, pop(640), .22); fx(o + 3.2, pop(740), .28, .3); [fx(o + 3.6 + k * .045, pop(1000 + (k % 8) * 90, .04), .07, .35) for k in range(32)]
o = S["loop"]; fx(o - .2, whoosh(.5), .24); fx(o + 1.1, pop(560), .22); fx(o + 2.2, pop(660), .2); [fx(o + 3 + k * .75, pluck(note(66 + [0, 5, 9, 12][k]), .9), .24, -.4 + k * .28, .5) for k in range(4)]
# sliders: one sweep of ticks per scripted move
o = S["Honest sliders"]
for a, b in ((2, 3.6), (3.6, 5.6), (5.6, 7.2), (7.2, 8.8), (9.4, 11.4)):
    for tk in np.arange(a, b, .12): fx(o + tk, tick(1700, .012), .08 + .14 * np.sin((tk - a) / (b - a) * np.pi), -.35, .04)
    fx(o + b, pop(700, .09), .24, .3)
fx(o + 8.8, click(), .6, -.3); fx(o + 11.6, bell(note(74), 2.4), .28, wet=.7); fx(o + 11.6, whoosh(.4), .12)
# impact
o = S["Impact"]; fx(o + .1, whoosh(.5), .2)
for i in range(3): fx(o + 1.4 + i * .7, pop(460 + i * 130, .13), .4, -.5 + i * .5, .35)
fx(o + 3.8, bell(note(78), 2.4), .14, wet=.8)
o = S["Drop to dark"]; fx(o + .7, plink(700), .6, wet=.9); fx(o + .8, whoosh(1.0), .36)
o = close0; fx(o + .1, impact(2.6, 42), .7); fx(o + .7, bell(note(74), 3.5), .3, wet=.8); fx(o + 1.5, bell(note(78), 3.4), .22, wet=.8); fx(o + 2.1, bell(note(81), 3.2), .22, wet=.8)

# ------------------------------------------------------------------ mix
ir_n = int(2.2 * SR); ir = rng.standard_normal((ir_n, 2)) * np.exp(-np.linspace(0, 7, ir_n))[:, None]; ir[:int(.012 * SR)] = 0
verb = np.stack([fftconvolve(verb_send[:, i], ir[:, i])[:N] for i in range(2)], axis=1); verb /= max(np.abs(verb).max(), 1e-9) / .4
mix_sfx = sfx + verb
# music ducks under the big hits
level = np.abs(mix_sfx).max(axis=1); fast = np.convolve(level, np.ones(2400) / 2400, "same")
duck = 1 - .6 * np.clip(fast / .25, 0, 1); duck = np.convolve(duck, np.ones(9600) / 9600, "same")
mix = music * .36 * duck[:, None] + mix_sfx * .9
mix = sosfilt(butter(2, 28, "high", fs=SR, output="sos"), mix, axis=0)
mix = np.tanh(mix * 1.15)  # soft limiter
mix = mix[:int(TOTAL * SR)] * (.97 / np.abs(mix).max())
wavfile.write("audio.wav", SR, (mix * 32767).astype(np.int16))
secs = [np.sqrt((mix[int(i * SR):int((i + 1) * SR)] ** 2).mean()) for i in range(int(TOTAL))]
print("peak", round(float(np.abs(mix).max()), 3), "rms", round(float(np.sqrt((mix ** 2).mean())), 3), "clip %", round(float((np.abs(mix) > .99).mean() * 100), 3))
print("around the silent beat:", {round(split + k, 0): round(float(secs[int(split + k)]), 3) for k in (9, 10, 11, 12, 13, 14, 15, 16)})
json.dump({"S": S, "total": TOTAL, "rms_per_second": [round(float(x), 4) for x in secs]}, open("audio_report.json", "w"))
