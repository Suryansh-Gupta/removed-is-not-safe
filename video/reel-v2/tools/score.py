# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Reel v2 score, original. 120 bpm. Warm D major piano (the promise), D minor pulse (the turn), a held silence, then a full D major rise.
Flash bursts are carried by the music itself (fast arpeggios and drum rolls), not by repeated effects. One-off effects: five.
Run from reel-v2: MOTION_REEL_SKILL=<skill> uv run tools/score.py"""
import os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import *  # noqa
BPM, BEAT, BEATS = 120, .5, 230
DUR = BEATS * BEAT + 3
seed(2029)
piano_b, strings, low, drums, lead, fx = [Bus(DUR, BPM) for _ in range(6)]
def piano(note, length=2.2, vel=1.0):
    n = int(length * SR); t = tvec(n); f = hz(note)
    x = sum(a * np.sin(2 * np.pi * f * h * t) * np.exp(-t * (1.1 + h * .9)) for h, a in ((1, 1), (2, .42), (3, .2), (4, .1), (5, .05)))
    return x * (1 - np.exp(-t / .002)) * vel
def bowed(notes, beats, cut=(900, 2600), a=.6): return pad_chord(notes, beats * BEAT + .6, cut, attack=a, release=.6, voices=5, detune=.09)
def tom(f0=110, d=.5, nz=.25):
    n = int(d * SR); t = tvec(n); f = f0 * (1 + .55 * np.exp(-t / .03))
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .35)) + nz * filt(rng.standard_normal(n), "lowpass", 2400) * np.exp(-t / .03))
def snare():
    n = int(.14 * SR); t = tvec(n); return .55 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / .03) + filt(rng.standard_normal(n), "highpass", 1800) * np.exp(-t / .05)
def boom(d=2.6):
    n = int(d * SR); t = tvec(n); f = 34 + 70 * np.exp(-t / .05)
    return np.tanh(2.0 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d * .32)) + .3 * filt(rng.standard_normal(n), "lowpass", 1400) * np.exp(-t / .06))
def horn(notes, beats, cut=(600, 3200)): return pad_chord(notes, beats * BEAT + .15, cut, attack=.05, release=.18, voices=3, detune=.05)
I, V, vi, IV = ["D3", "A3", "D4", "F#4"], ["A2", "E3", "A3", "C#4"], ["B2", "F#3", "B3", "D4"], ["G2", "D3", "G3", "B3"]
i_, VI, iv, V7 = ["D3", "A3", "D4", "F4"], ["A#2", "F3", "A#3", "D4"], ["G2", "D3", "G3", "A#3"], ["A2", "E3", "A3", "C#4"]
BASS = {"D3": "D2", "A2": "A1", "B2": "B1", "G2": "G1", "A#2": "A#1"}
def up(ch, oct_=1): return [note_name(midi(x) + 12 * oct_) for x in ch]
def arp(b0, b1, prog, step=.5, vel=.5, oct_=1, per=4):
    """Piano arpeggio that rises through the chord."""
    b = b0; k = 0
    while b < b1 - 1e-6:
        ch = up(prog[int((b - b0) // per) % len(prog)], oct_); pat = ch + [ch[2], ch[1]] if step >= .5 else ch + up(ch[:2], 1) + [ch[3], ch[2]]
        piano_b.add(piano(pat[k % len(pat)], 1.8, vel), b, 1, pan=.25 * np.sin(k)); b += step; k += 1
def pad(b0, b1, prog, g=.3, per=4, cut=(900, 2600)):
    for j, b in enumerate(np.arange(b0, b1, per)):
        strings.add(bowed(prog[j % len(prog)], min(per, b1 - b), cut), b, g)
def pulse(b0, b1, prog, g=.34, step=.5, per=4, c=900):
    for b in np.arange(b0, b1, step):
        ch = prog[int((b - b0) // per) % len(prog)]; low.add(bass_note(BASS[ch[0]], step * BEAT * .8, c), b, g * (1 if (b - b0) % 1 == 0 else .72))
def toms(b0, b1, step, g0, g1, f0=95):
    bs = np.arange(b0, b1, step)
    for j, b in enumerate(bs): drums.add(tom(f0 * (1 + .25 * (j % 3 == 2)), .4, .2), b, g0 + (g1 - g0) * j / max(1, len(bs) - 1), pan=.2 * (-1) ** j)
PROM = [I, V, vi, IV]; TURN = [i_, VI, iv, V7]
# ---- cold open: a rising piano figure, light and clear (0-4), accelerating with the flashes
arp(0, 2, [I], .25, .42, 1); arp(2, 4, [I], .125, .36, 2)
strings.add(bowed(I, 4, (700, 2400), 1.0), 0, .22)
piano_b.add(piano("D4", 3), 4, .55); piano_b.add(piano("A4", 3), 4, .4); piano_b.add(piano("D5", 3), 4, .4)
# ---- the promise: warm, unhurried
arp(4, 16, PROM, .5, .4, 1); pad(4, 16, PROM, .2)
arp(16, 20, [I, V], .25, .46, 1); pad(16, 20, [I, V], .34, 2, (1200, 3200)); pulse(16, 20, [I, V], .3, 1, 2); toms(16, 20, 2, .42, .42)
arp(20, 31, [vi, IV, I, V], .5, .36, 1); pad(20, 31, [vi, IV, I], .24)
toms(27, 31, 1, .34, .5, 80); pulse(27, 31, [vi], .28, 1)
arp(31, 33, [IV], .5, .4); arp(33, 37, [I, V], .25, .46, 1); pad(33, 37, [I, V], .4, 2, (1400, 3600)); pulse(33, 37, [I, V], .34, .5, 2, 1200); toms(33, 37, 1, .5, .55)
piano_b.add(piano("D5", 3), 37, .6); piano_b.add(piano("F#5", 3), 37, .45); strings.add(bowed(I, 2, (1800, 3000), .1), 37, .36)
arp(39, 41, [IV], .5, .42); arp(41, 47, [IV, I, V], .25, .46, 1, 2); pad(41, 47, [IV, I, V], .42, 2, (1500, 3800)); pulse(41, 47, [IV, I, V], .36, .5, 2, 1200); toms(41, 47, 1, .5, .62)
strings.add(bowed(["G2", "D3", "G3", "B3", "D4"], 4, (2200, 1200), .15), 47, .4)
for j, nt in enumerate(["B5", "A5", "G5", "D5"]): piano_b.add(piano(nt, 2.2), 47 + j, .42)
# "Then they met": the harmony sours and thins out to one note
strings.add(bowed(["A#2", "F3", "A#3", "D4"], 3, (1400, 500), .1), 51, .3); piano_b.add(piano("F4", 3), 51, .4)
# ---- the turn: minor, a bass pulse that tightens
drums.add(boom(1.8), 54, .55); pulse(54, 62, TURN, .36, .5, 2, 1000); pad(54, 62, TURN, .26, 2, (700, 1500)); toms(54, 62, 2, .4, .5, 75)
pulse(62, 72, TURN[:2], .24, .5, 4, 700); pad(62, 72, TURN[:2], .22, 4, (600, 1100))
for j, b in enumerate(np.arange(62, 72, 2)): piano_b.add(piano(["A5", "F5", "D5", "A#4", "A4"][j], 2.4), b, .34)
piano_b.add(piano("D5", 2.4), 72, .34); piano_b.add(piano("F5", 2.4), 74, .3); strings.add(bowed(i_, 4, (900, 1400)), 72, .26)
strings.add(bowed(iv, 2, (700, 900), .2), 76, .22); pulse(78, 81, [V7], .22, 1, 4, 600); strings.add(bowed(V7, 3, (600, 1500), .3), 78, .3); fx.add(riser(1.3), 78.6, .08)
# 81-82: nothing. 82: the reveal
drums.add(boom(3.2), 82, .95); strings.add(bowed(["D2", "A2", "D3", "F3", "A3", "D4", "A4"], 8, (500, 2600), .3), 82, .56)
for j, nt in enumerate(["D6", "C#6", "A#5", "A5"]): piano_b.add(piano(nt, 2.6), 84 + j * 1.5, .22)
strings.add(bowed(["A#2", "F3", "D4", "F4", "A#4"], 4, (2400, 1800), .05), 90, .46); drums.add(tom(58, .9, .3), 90, .7)
strings.add(bowed(i_, 2, (900, 1400), .1), 94, .24)
# bacteria learn: flashes carried by low strings in 16ths and rolling drums
pulse(96, 100, TURN, .42, .25, 2, 1400); toms(96, 100, .5, .46, .6, 82); pad(96, 100, TURN, .3, 2, (900, 2000))
pulse(100, 104, TURN[2:], .5, .25, 2, 1800); toms(100, 104, .25, .36, .86, 88); pad(100, 104, TURN[2:], .4, 2, (1400, 3600))
for b in np.arange(102, 104, .125): drums.add(snare(), b, .08 + .22 * (b - 102) / 2, pan=.1)
# the number: everything falls away
drums.add(boom(3.4), 104, 1.0); strings.add(bowed(["D3", "A3", "F4", "A4"], 8, (600, 1300), .6), 104, .34)
for j, nt in enumerate(["A4", "F4", "D4"]): piano_b.add(piano(nt, 3), 106 + j * 2, .34)
pulse(112, 120, TURN, .32, .5, 2, 1000); pad(112, 120, TURN, .28, 2, (800, 1800)); toms(112, 120, 2, .42, .5, 75)
# the dials walk up, then the missing one: silence with a single note
pulse(120, 126, [VI, iv, V7], .36, .5, 2, 1200); pad(120, 126, [VI, iv, V7], .34, 2, (1000, 2200)); toms(120, 126, 1, .4, .6, 85)
piano_b.add(piano("A5", 3.4), 126, .4); strings.add(bowed(["A3", "E4", "A4"], 4, (1500, 800), .1), 126, .12)
# "two students": the light comes back, on the piano alone
for j, (nt, b) in enumerate([("A4", 130), ("D5", 130.5), ("E5", 131), ("F#5", 131.5), ("A5", 132), ("D6", 133)]): piano_b.add(piano(nt, 2.4), b, .5)
strings.add(bowed(V, 4, (500, 3500), .9), 130, .28); fx.add(riser(1.9), 130.1, .16)
# ---- the rise. Every layer enters on 134
drums.add(crash(2.4), 134, .55); drums.add(boom(2.6), 134, .8)
def anthem(b0, b1, prog, g=1.0, per=4, step=.25, lead_on=True):
    arp(b0, b1, prog, step, .4 * g, 1, per); pad(b0, b1, prog, .5 * g, per, (1800, 4200)); pulse(b0, b1, prog, .46 * g, .5, per, 1500)
    for b in np.arange(b0, b1, 1):
        k_ = (b - b0) % 4
        if k_ in (0, 2.5, 1.5): drums.add(kick(), b if k_ != 2.5 else b, .6 * g)
        if k_ == 2: drums.add(snare(), b, .34 * g); drums.add(clap(), b, .22 * g)
    for b in np.arange(b0, b1, .5): drums.add(hat(), b, .1 * g, pan=.2)
MEL = [("F#5", 3), ("A5", 1), ("B5", 2), ("A5", 2), ("F#5", 3), ("E5", 1), ("D5", 4), ("E5", 3), ("F#5", 1), ("A5", 2), ("D6", 2), ("C#6", 3), ("A5", 1), ("A5", 4)]
def melody(b0, b1, g=.3):
    b = b0; j = 0
    while b < b1:
        nt, n_ = MEL[j % len(MEL)]; n_ = min(n_, b1 - b); lead.add(horn([nt, note_name(midi(nt) - 12)], n_), b, g); b += n_; j += 1
anthem(134, 156, PROM); melody(142, 156, .26)
anthem(156, 164, [I, V], 1.05, 2); toms(156, 164, 1, .4, .58)
anthem(164, 170, [vi, IV], .92, 3); 
anthem(170, 178, PROM, .7, 2, .5)
anthem(178, 191, PROM, 1.1); melody(178, 191, .3)
# breakdown: "Chlorine saved cities." Piano and strings, the most human moment
for j, b in enumerate(np.arange(191, 198, 2)): strings.add(bowed([IV, I, V, vi][j], 2, (1800, 2800), .25), b, .4)
arp(191, 198, [IV, I, V, vi], .5, .46, 1, 2)
piano_b.add(piano("D6", 3), 191, .34); piano_b.add(piano("B5", 3), 193, .3); piano_b.add(piano("A5", 3), 195, .32)
# climb, then the flash climax: half, quarter, eighth beats, cut dead on 214
pulse(198, 202, [IV, V], .36, .5, 2, 1200); pad(198, 202, [IV, V], .46, 2, (1200, 4200)); arp(198, 202, [IV, V], .25, .36, 1, 2); toms(198, 202, 1, .3, .6); fx.add(riser(1.9), 200.05, .2)
drums.add(crash(1.8), 202, .4); pad(202, 214, [I, V, vi, IV], .62, 3, (2600, 5500)); pulse(202, 206, PROM, .5, .5, 1, 1800); pulse(206, 210, PROM, .54, .25, 1, 2000); pulse(210, 214, PROM, .58, .125, 1, 2200)
arp(202, 206, [I, V, vi, IV], .5, .5, 1, 1); arp(206, 210, [I, V, vi, IV], .25, .5, 1, 1); arp(210, 214, [I, V, vi, IV], .125, .46, 1, 1)
toms(202, 206, .5, .5, .66); toms(206, 210, .25, .46, .72); toms(210, 214, .125, .34, .9, 100)
melody(202, 214, .34)
# 214-215 dead air. Line lands soft; the slab is the one hit (219)
piano_b.add(piano("D5", 3), 215, .5); piano_b.add(piano("A5", 3), 215, .36); strings.add(bowed(I, 4, (1200, 2000), .3), 215, .24)
fx.add(riser(1.0), 217, .12)
drums.add(boom(4.0), 219, 1.0); strings.add(bowed(["D2", "A2", "D3", "F#3", "A3", "D4", "F#4", "A4"], 10, (3400, 1000), .02), 219, .72)
for j, nt in enumerate(["D6", "A5", "F#5", "A5", "D6"]): piano_b.add(piano(nt, 3), 221 + j * 1.5, .4 - j * .04)
# ---- one-off effects
def sweep_(d=1.0):
    n = int(d * SR); t = tvec(n); return filt(rng.standard_normal(n), "bandpass", (600, 5000)) * np.sin(np.pi * t / d) ** 2
def tone_drop(f0=1500, f1=520, d=.3):
    n = int(d * SR); t = tvec(n); fr = f1 + (f0 - f1) * np.exp(-t / .05); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .07)
def tick():
    n = int(.04 * SR); t = tvec(n); return filt(rng.standard_normal(n), "highpass", 3000) * np.exp(-t / .006)
def slam():
    n = int(1.4 * SR); t = tvec(n); f = 40 + 150 * np.exp(-t / .03)
    return np.tanh(2.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .38) + .7 * filt(rng.standard_normal(n), "lowpass", 3200) * np.exp(-t / .07))
fx.add(tone_drop(), 8, .22, pan=.15)   # the drop at the tap
fx.add(sweep_(), 81.6, .14)            # into the false-colour glass
fx.add(tick(), 126, .3)                # the empty dial
fx.add(slam(), 219, .9)                # the slab
# ---- mix
wet = piano_b.x * .9 + strings.x * .8 + lead.x * .75
wet = reverb(wet, wet=.4, length=2.6, decay=.8)
mix_ = wet + low.x * .85 + reverb(drums.x, wet=.14, length=1.2, decay=.3) * .95 + reverb(fx.x, wet=.25)
n = int(BEATS * BEAT * SR)
# hard stops: the silences have to be real
def duck(b0, b1, keep=.0):
    a, c = int(b0 * BEAT * SR), int(b1 * BEAT * SR); r = int(.03 * SR); g = np.ones(mix_.shape[1]); g[a:c] = keep; g[a:a + r] = np.linspace(1, keep, r); g[c - r:c] = np.linspace(keep, 1, r); return g
mix_ = mix_ * duck(81, 81.55, .02) * duck(214, 215, .0)
# the arc: quiet promise, tense turn, biggest at the climax
ARC = [(0, -9), (16, -7), (33, -5), (47, -8), (54, 1), (82, 2), (96, 2), (104, 2), (120, 3), (126, 1), (134, 0), (170, -3), (178, 0), (191, -3), (202, 2), (214, 2), (215, -2), (219, 2), (231, 2)]
bs_ = np.arange(mix_.shape[1]) / SR / BEAT
env = 10 ** (np.interp(bs_, [a for a, _ in ARC], [d for _, d in ARC]) / 20)
env_ = np.zeros_like(env); ARCb = [a for a, _ in ARC]
for (a, d), (c, _) in zip(ARC, ARC[1:]): env_[(bs_ >= a) & (bs_ < c)] = d
env_[bs_ >= ARCb[-1]] = ARC[-1][1]
from scipy.ndimage import uniform_filter1d as _u
mix_ = mix_ * 10 ** (_u(env_, int(.08 * SR)) / 20)
mix_ = np.stack([peq(ch, 5500, 2.5, .7) for ch in mix_]); mix_ = np.tanh(mix_ * 1.15) / 1.15
mix_ = mix_[:, :n] / (np.abs(mix_[:, :n]).max() + 1e-9) * .9
fade = np.ones(n); m_ = int(1.2 * SR); fade[-m_:] = np.linspace(1, 0, m_); mix_ = limit(mix_ * fade)
sf.write("film/public/music.wav", mix_.T, SR)
print("music.wav", round(n / SR, 1), "s", SR, "peak", round(float(np.abs(mix_).max()), 3))
