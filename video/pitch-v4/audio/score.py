# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Original score for the pitch: 100 bpm in D, tense minor for the problem, open major for the answer.
Run: MOTION_REEL_SKILL=<skill> uv run pitch-v4/audio/score.py"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import *  # noqa

FILM = Path(__file__).resolve().parents[1]
BPM, BEAT, BEATS = 100, 0.6, 152
DUR = BEATS * BEAT + 2.0
seed(2027)
# ONE piece. A single 8th-note bass pulse on D runs from the first frame to the end, and a single four-note
# motif (D A F A) sits on top. The move from problem to solution changes one note, F to F#, so the same
# music turns from dark to bright. Everything else is layers being added or taken away at bar lines.
music, drums, tex = Bus(DUR, BPM), Bus(DUR, BPM), Bus(DUR, BPM)
DARK = [("D", ["D3", "A3", "D4", "F4"]), ("A#", ["A#2", "F3", "A#3", "D4"]), ("G", ["G2", "D3", "G3", "A#3"]), ("A", ["A2", "E3", "A3", "C#4"])]
BRIGHT = [("D", ["D3", "A3", "D4", "F#4"]), ("G", ["G2", "D3", "G3", "B3"]), ("B", ["B2", "F#3", "B3", "D4"]), ("A", ["A2", "E3", "A3", "C#4"])]
MOTIF_DARK, MOTIF_BRIGHT = ["D5", "A4", "F4", "A4"], ["D5", "A4", "F#4", "A4"]
OCT = {"D": "D2", "A#": "A#1", "G": "G1", "A": "A1", "B": "B1"}

def heart():
    n = int(.34 * SR); t = tvec(n); f = 46 + 60 * np.exp(-t / .03); return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .11))
def drum_low():
    n = int(.7 * SR); t = tvec(n); f = 52 + 110 * np.exp(-t / .03); return np.tanh(1.9 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .2) + .35 * filt(rng.standard_normal(n), "lowpass", 800) * np.exp(-t / .025))
def plink(f=880.0):
    n = int(.2 * SR); t = tvec(n); return np.sin(2 * np.pi * np.cumsum(f * (.7 + .5 * (t / .2))) / SR) * np.exp(-t / .05)

def section(b0, b1, table, motif, pad=0., pulse=0., pulse_c=500, mot=0., mot_c=1600, kick_g=0., low=0., hats=0., claps=0., octave=False):
    """One call per section; gains may be (start, end) and glide across the section."""
    g = lambda v, b: (v[0] + (v[1] - v[0]) * (b - b0) / max(1, b1 - b0 - 1)) if isinstance(v, tuple) else v
    for b in range(b0, b1):
        root, chord = table[(b // 4) % 4]; p = (b - b0) / max(1, b1 - b0 - 1)
        if b % 4 == 0 and g(pad, b) > 0:
            music.add(pad_chord(chord, 4 * BEAT + .9, 1500 + 700 * (g(mot, b) > .1), attack=.22, release=.8), b, g(pad, b))
        if g(pulse, b) > 0:
            for a in (0, .5): music.add(bass_note(OCT[root], BEAT * .36, g(pulse_c, b)), b + a, g(pulse, b) * (1 if a == 0 else .72))
        if g(mot, b) > 0:
            for s, a in enumerate((0, .5)):
                nt = motif[(b * 2 + s) % 4]; music.add(pluck([nt], .36, g(mot_c, b)), b + a, g(mot, b), pan=.28 * (1 if (b * 2 + s) % 2 else -1))
                if octave: music.add(pluck([note_name(midi(nt) + 12)], .3, g(mot_c, b)), b + a, g(mot, b) * .42, pan=-.28 * (1 if (b * 2 + s) % 2 else -1))
        if g(kick_g, b) > 0 and b % 2 == 0: drums.add(kick(), b, g(kick_g, b))
        if g(low, b) > 0 and b % 4 == 0: drums.add(drum_low(), b, g(low, b))
        if g(low, b) > 0 and b % 8 == 7: drums.add(drum_low(), b + .5, g(low, b) * .8)
        if g(hats, b) > 0: drums.add(hat(), b + .5, g(hats, b), pan=.2)
        if g(claps, b) > 0 and b % 4 == 2: drums.add(clap(), b, g(claps, b), pan=.05)


# HOOK b0-16: curious, not ominous. Soft pad and the motif alone over a light pulse. No heartbeat, riser or silence.
section(0, 16, DARK[:1] * 4, MOTIF_DARK, pad=.34, pulse=(.1, .26), pulse_c=(500, 800), mot=(.1, .15), mot_c=2100)
tex.add(plink(980), 1.72, .16, pan=.3)
# PROBLEM b16-44: more movement and a clear beat, without low drums or a big hit. It adds gently.
section(16, 30, DARK, MOTIF_DARK, pad=.36, pulse=.34, pulse_c=1000, mot=.15, mot_c=1800, kick_g=.32, hats=.05)
section(30, 44, DARK, MOTIF_DARK, pad=.38, pulse=.36, pulse_c=1100, mot=.16, mot_c=1900, kick_g=.36, hats=.07)
# BRIDGE b44-60: F becomes F#. Drums leave first, the motif and pulse stay, the same chords walk home to D.
music.add(pad_chord(["A#2", "F3", "A#3", "D4"], 4 * BEAT + .9, 1500, attack=.25, release=.8), 44, .44)
music.add(pad_chord(["A2", "E3", "A3", "D4"], 2 * BEAT + .9, 1600, attack=.3, release=.8), 48, .46); music.add(pad_chord(["A2", "E3", "A3", "C#4"], 2 * BEAT + .9, 2000, attack=.3, release=.8), 50, .48)
for b in range(44, 52):
    root = "A#" if b < 48 else "A"
    for a in (0, .5): music.add(bass_note(OCT[root], BEAT * .36, 1000), b + a, (.34 - (b - 44) * .015) * (1 if a == 0 else .72))
    nts = (["D5", "A#4", "F4", "A#4"] if b < 48 else ["D5", "A4", "E4", "A4"] if b < 50 else ["C#5", "A4", "E4", "A4"])
    for s, a in enumerate((0, .5)): music.add(pluck([nts[(b * 2 + s) % 4]], .36, 2000), b + a, .17, pan=.28 * (1 if (b * 2 + s) % 2 else -1))
    if b < 47: drums.add(kick(), b, .34 - (b - 44) * .09) if b % 2 == 0 else None
tex.add(riser(3.6 * BEAT), 48.4, .1)
# The reveal: the bright layers arrive together on the downbeat, so the shift is clear. A wide open chord,
# the motif an octave higher, and a steady beat straight away.
section(52, 60, [BRIGHT[0]] * 4, MOTIF_BRIGHT, pad=.62, pulse=.48, pulse_c=1500, mot=.24, mot_c=3800, kick_g=.58, hats=.14, claps=.2, octave=True)
music.add(keys(["D4", "F#4", "A4", "D5", "F#5"], 3.2), 52, .46)
# SOLUTION b60-112: same layers, brighter and steadier
section(60, 92, BRIGHT, MOTIF_BRIGHT, pad=.52, pulse=.5, pulse_c=1500, mot=.23, mot_c=3700, kick_g=.66, hats=.16, claps=.24, octave=True)
section(92, 112, BRIGHT, MOTIF_BRIGHT, pad=.46, pulse=.46, pulse_c=1400, mot=.21, mot_c=3400, kick_g=.58, hats=.14, octave=True)
# STEPS b112-132: a lift by adding the octave
section(112, 132, BRIGHT, MOTIF_BRIGHT, pad=.48, pulse=.5, pulse_c=1500, mot=.22, mot_c=3100, kick_g=.68, hats=.15, claps=.26, octave=True)
# CLOSE b132-144: everything, all at once. b144: the first chord again, in major, and the pulse stops.
section(132, 144, BRIGHT, MOTIF_BRIGHT, pad=.54, pulse=.54, pulse_c=1700, mot=.25, mot_c=3400, kick_g=.72, hats=.17, claps=.3, octave=True)
music.add(pad_chord(["D2", "A2", "D3", "F#3", "A3", "D4"], 8 * BEAT + 1.0, (2600, 900), attack=.04, release=1.0), 144, .66)

for k, nt in enumerate(["D5", "A4", "F#4", "A4", "D5"]): music.add(pluck([nt], .9, 2400), 144 + k, .18 - k * .018)

mix_ = music.x * .9 + drums.x * .95 + tex.x
mix_ = mix_ * np.interp(np.arange(mix_.shape[1]) / SR, [0, 42 * BEAT, 50 * BEAT, 500], [1.0, 1.0, 1.0, 1.0])
mix_ = np.tanh(mix_ * 1.1) / 1.1
n = int(BEATS * BEAT * SR); mix_ = mix_[:, :n] / (np.abs(mix_[:, :n]).max() + 1e-9) * .85
sf.write(FILM / "audio" / "music.wav", mix_.T, SR)
beats = [round(i * BEAT, 5) for i in range(BEATS + 1)]
secs = [("hook", 0), ("problem", 16), ("prototype", 52), ("measure", 92), ("integrate", 112), ("end", 132)]
json.dump({"bpm": BPM, "period": BEAT, "offset": 0.0, "beats": beats, "downbeats": beats[::4], "sections": [{"name": a, "beat": b} for a, b in secs],
           "bar_energy": []}, open(FILM / "beats.json", "w"))
print("music.wav", round(n / SR, 1), "s")
