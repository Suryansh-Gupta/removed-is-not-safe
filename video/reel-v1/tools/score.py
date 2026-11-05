# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Original score for the reel cut. 120 bpm, one pulse and one motif, F to F# at the reveal (beat 112).
Light opening, no heartbeat or drones. Hard moves happen only where the picture has a hard move.
Run from reel-v1: MOTION_REEL_SKILL=<skill> uv run tools/score.py"""
import os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import *  # noqa
BPM, BEAT, BEATS = 120, .5, 219
DUR = BEATS * BEAT + 2
seed(2028)
music, drums, fx = Bus(DUR, BPM), Bus(DUR, BPM), Bus(DUR, BPM)
MINOR = [("D", ["D3", "A3", "D4", "F4"]), ("A#", ["A#2", "F3", "A#3", "D4"]), ("G", ["G2", "D3", "G3", "A#3"]), ("A", ["A2", "E3", "A3", "C#4"])]
MAJOR = [("D", ["D3", "A3", "D4", "F#4"]), ("G", ["G2", "D3", "G3", "B3"]), ("B", ["B2", "F#3", "B3", "D4"]), ("A", ["A2", "E3", "A3", "C#4"])]
M_MIN, M_MAJ = ["D5", "A4", "F4", "A4"], ["D5", "A4", "F#4", "A4"]
OCT = {"D": "D2", "A#": "A#1", "G": "G1", "A": "A1", "B": "B1"}
def sec(b0, b1, tab, mot, pad=0., pulse=0., pc=800, m=0., mc=2000, k=0., h=0., c=0., oct_=False, every4=False):
    for b in range(b0, b1):
        root, ch = tab[(b // 4) % 4]
        if b % 4 == 0 and pad > 0: music.add(pad_chord(ch, 4 * BEAT + .9, 1600, attack=.2, release=.8), b, pad)
        if pulse > 0:
            for a in (0, .5): music.add(bass_note(OCT[root], BEAT * .36, pc), b + a, pulse * (1 if a == 0 else .72))
        if m > 0:
            for s_, a in enumerate((0, .5)):
                nt = mot[(b * 2 + s_) % 4]; side = 1 if (b * 2 + s_) % 2 else -1
                music.add(pluck([nt], .34, mc), b + a, m, pan=.3 * side)
                if oct_: music.add(pluck([note_name(midi(nt) + 12)], .28, mc), b + a, m * .42, pan=-.3 * side)
        if k > 0 and (b % 2 == 0 if not every4 else b % 4 == 0): drums.add(kick(), b, k)
        if h > 0: drums.add(hat(), b + .5, h, pan=.2)
        if c > 0 and b % 4 == 2: drums.add(clap(), b, c, pan=.05)
# HOOK: curious, light
sec(0, 12, MINOR[:1] * 4, M_MIN, pad=.32, pulse=.14, pc=650, m=.13, mc=2400)
# 70%: pad opens, pulse holds, no drums
sec(12, 20, [MINOR[2], MINOR[3]] * 2, M_MIN, pad=.42, pulse=.22, pc=800, m=.15, mc=2400)
# "Removed isn't the same as safe": a stop, one held chord
music.add(pad_chord(["D3", "A3", "D4", "F4", "A4"], 4 * BEAT + .9, 2000, attack=.04, release=.9), 20, .5)
# MONTAGE: the groove arrives with the first word
sec(24, 44, MINOR, M_MIN, pad=.34, pulse=.36, pc=1100, m=.17, mc=2400, k=.5, h=.1)
# "Then they met." two beats of air
music.add(pad_chord(["A2", "E3", "A3", "C#4"], 2 * BEAT + .3, 1200, attack=.05, release=.3), 44, .16)
sec(46, 56, MINOR, M_MIN, pad=.32, pulse=.36, pc=1000, m=.16, mc=2000, k=.48, h=.08)
# MOLECULE: thin, plucks up top
sec(56, 68, MINOR[:2] * 2, M_MIN, pad=.3, pulse=.24, pc=800, m=.15, mc=2600)
# TRAINING: builds
sec(68, 82, MINOR, M_MIN, pad=.34, pulse=.36, pc=1100, m=.17, mc=2200, k=.5, h=.12, c=.14)
# COST: the beat steps back for the number
sec(82, 90, [MINOR[1], MINOR[2]] * 2, M_MIN, pad=.42, pulse=.2, pc=700, m=.08, mc=1500)
sec(90, 98, MINOR, M_MIN, pad=.34, pulse=.32, pc=1000, m=.15, mc=2000, k=.42, h=.08)
# DIALS: walks home, F leaves
for b in range(98, 112):
    root, ch, nts = ("A#", ["A#2", "F3", "A#3", "D4"], ["D5", "A#4", "F4", "A#4"]) if b < 104 else ("A", ["A2", "E3", "A3", "D4"], ["D5", "A4", "E4", "A4"]) if b < 108 else ("A", ["A2", "E3", "A3", "C#4"], ["C#5", "A4", "E4", "A4"])
    if b % 4 == 2 or b == 98: music.add(pad_chord(ch, 4 * BEAT + .9, 1800, attack=.25, release=.8), b, .4)
    for a in (0, .5): music.add(bass_note(OCT[root], BEAT * .36, 1100), b + a, .3 * (1 if a == 0 else .72))
    for s_, a in enumerate((0, .5)): music.add(pluck([nts[(b * 2 + s_) % 4]], .34, 2300), b + a, .16, pan=.28 * (1 if (b * 2 + s_) % 2 else -1))
fx.add(riser(4 * BEAT), 108, .13)
# REVEAL at 112: every bright layer enters together
sec(112, 124, [MAJOR[0]] * 4, M_MAJ, pad=.6, pulse=.48, pc=1500, m=.24, mc=3800, k=.58, h=.14, c=.2, oct_=True)
music.add(keys(["D4", "F#4", "A4", "D5", "F#5"], 3.0), 112, .46)
sec(124, 160, MAJOR, M_MAJ, pad=.5, pulse=.5, pc=1500, m=.23, mc=3700, k=.64, h=.16, c=.24, oct_=True)
sec(160, 172, MAJOR, M_MAJ, pad=.44, pulse=.42, pc=1300, m=.2, mc=3200, k=.5, h=.12, oct_=True)
sec(172, 190, MAJOR, M_MAJ, pad=.48, pulse=.5, pc=1500, m=.22, mc=3300, k=.66, h=.15, c=.26, oct_=True)
sec(190, 204, MAJOR, M_MAJ, pad=.54, pulse=.54, pc=1700, m=.25, mc=3500, k=.72, h=.17, c=.3, oct_=True)
# ENDING: the line lands soft; the slab is the one big hit in the film (beat 208)
music.add(pad_chord(["D3", "A3", "D4", "F#4"], 4 * BEAT + .4, 1800, attack=.05, release=.4), 204, .3)
fx.add(riser(1.0), 206, .1)
music.add(pad_chord(["D2", "A2", "D3", "F#3", "A3", "D4"], 9 * BEAT + 1, (2600, 900), attack=.02, release=1), 208, .68)
for k_, nt in enumerate(["D5", "A4", "F#4", "A4", "D5"]): music.add(pluck([nt], .9, 2400), 210 + k_ * 1.5, .17 - k_ * .018)
# Effects: each used once, none repeated
def tone_drop(f0=1400, f1=520, d=.28):
    n = int(d * SR); t = tvec(n); fr = f1 + (f0 - f1) * np.exp(-t / .05); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .07)
def sweep(d=1.2):
    n = int(d * SR); t = tvec(n); x = filt(rng.standard_normal(n), "bandpass", (500, 5000)); return x * np.sin(np.pi * t / d) ** 2
def thud():
    n = int(.9 * SR); t = tvec(n); f = 44 + 90 * np.exp(-t / .04); return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .3))
def slam():
    n = int(1.4 * SR); t = tvec(n); f = 40 + 150 * np.exp(-t / .03)
    return np.tanh(2.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .38) + .7 * filt(rng.standard_normal(n), "lowpass", 3200) * np.exp(-t / .07))
def tick():
    n = int(.04 * SR); t = tvec(n); return filt(rng.standard_normal(n), "highpass", 3000) * np.exp(-t / .006)
fx.add(tone_drop(), 2, .3, pan=.15)           # the drop in the glass
fx.add(sweep(), 12.4, .14)                     # the look changes to heat
fx.add(thud(), 82, .5)                         # the number
fx.add(tick(), 104, .35)                       # the empty dial
fx.add(slam(), 208, 1.0)                       # the slab
mix_ = music.x * .9 + drums.x * .95 + fx.x
mix_ = np.stack([peq(ch, 6000, 3.5, .7) for ch in mix_]); mix_ = np.tanh(mix_ * 1.1) / 1.1
n = int(BEATS * BEAT * SR); mix_ = mix_[:, :n] / (np.abs(mix_[:, :n]).max() + 1e-9) * .85
fade = np.ones(n); m_ = int(1.0 * SR); fade[-m_:] = np.linspace(1, 0, m_); mix_ = mix_ * fade
sf.write("film/public/music.wav", mix_.T, SR)
print("music.wav", round(n / SR, 1), "s", SR)
