# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Original code-made score for the keynote-style pitch. 120 bpm. Bright from the first frame (the user
dislikes dark openings), one motif throughout, D major -> D minor at "Now test it on bacteria" -> D major
at the answer. Run: MOTION_REEL_SKILL=<skill> uv run pitch-keynote/audio/score.py"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import *  # noqa

FILM = Path(__file__).resolve().parents[1]
BPM, BEAT, BEATS = 120, 0.5, 77
DUR = BEATS * BEAT + 2.5
seed(2027)
music, drums = Bus(DUR, BPM), Bus(DUR, BPM)

MAJOR = [("D", ["D3", "A3", "D4", "E4", "F#4"]), ("B", ["B2", "F#3", "B3", "D4", "F#4"]), ("G", ["G2", "D3", "G3", "B3", "E4"]), ("A", ["A2", "E3", "A3", "C#4", "E4"])]
MINOR = [("D", ["D3", "A3", "D4", "E4", "F4"]), ("A#", ["A#2", "F3", "A#3", "D4", "F4"]), ("F", ["F2", "C3", "F3", "A3", "C4"]), ("C", ["C3", "G3", "C4", "E4", "G4"])]
MOT_MAJOR, MOT_MINOR = ["D5", "A4", "F#4", "A4", "E5", "A4", "F#4", "A4"], ["D5", "A4", "F4", "A4", "E5", "A4", "F4", "A4"]
OCT = {"D": "D2", "B": "B1", "G": "G1", "A": "A1", "A#": "A#1", "F": "F2", "C": "C2"}


def section(b0, b1, table, motif, pad=0., pulse=0., pulse_c=700, mot=0., mot_c=2600, kick_g=0., hats=0., claps=0., octave=False, bars=4):
    g = lambda v, b: (v[0] + (v[1] - v[0]) * (b - b0) / max(1, b1 - b0 - 1)) if isinstance(v, tuple) else v
    for b in range(b0, b1):
        root, chord = table[((b - b0) // bars) % len(table)]
        if (b - b0) % bars == 0 and g(pad, b) > 0:
            music.add(pad_chord(chord, bars * BEAT + .8, 1800 + 1400 * (g(mot, b) > .12), attack=.1, release=.8), b, g(pad, b))
        if g(pulse, b) > 0:
            for a in (0, .5):
                music.add(bass_note(OCT[root], BEAT * .36, g(pulse_c, b)), b + a, g(pulse, b) * (1 if a == 0 else .7))
        if g(mot, b) > 0:
            for s, a in enumerate((0, .5)):
                i = (b * 2 + s) % 8
                nt = motif[i]
                music.add(pluck([nt], .34, g(mot_c, b)), b + a, g(mot, b), pan=.3 * (1 if i % 2 else -1))
                if octave:
                    music.add(pluck([note_name(midi(nt) + 12)], .28, g(mot_c, b)), b + a, g(mot, b) * .42, pan=-.3 * (1 if i % 2 else -1))
        if g(kick_g, b) > 0:
            drums.add(kick(), b, g(kick_g, b))
        if g(hats, b) > 0:
            drums.add(hat(), b + .5, g(hats, b), pan=.18)
        if g(claps, b) > 0 and b % 2 == 1:
            drums.add(clap(), b, g(claps, b), pan=.04)


# Opening b0-14: chlorine and the dials. Bright and curious, the motif from the first note.
section(0, 14, MAJOR, MOT_MAJOR, pad=.46, pulse=(.0, .22), pulse_c=(500, 900), mot=(.2, .24), mot_c=(3000, 4000), hats=(.0, .08), octave=True)
# b14-25: the 72% counts up. The beat arrives and the top opens as the pill climbs.
section(14, 25, MAJOR, MOT_MAJOR, pad=.46, pulse=.34, pulse_c=(900, 1500), mot=.24, mot_c=(3400, 5200), kick_g=(.36, .5), hats=.11, octave=True)
# b25-29: "Now test it on bacteria." Same motif, one note turns minor, and the drums stop. A short held breath.
section(25, 29, MINOR[:1], MOT_MINOR, pad=.4, pulse=.12, pulse_c=500, mot=.17, mot_c=1800, bars=4)
# b29-45: the 70% and the title. Same pulse, minor chords, full beat.
section(29, 45, MINOR, MOT_MINOR, pad=.46, pulse=.42, pulse_c=1300, mot=.22, mot_c=3200, kick_g=.6, hats=.12, claps=.22)
# b45-50: the trace line, thinner so it can be read.
section(45, 50, MINOR[:1], MOT_MINOR, pad=.36, pulse=.22, pulse_c=800, mot=.15, mot_c=2200, hats=.05, bars=5)
# b50-64: the answer. Back to major, everything on.
section(50, 64, MAJOR, MOT_MAJOR, pad=.5, pulse=.46, pulse_c=1600, mot=.25, mot_c=5000, kick_g=.66, hats=.15, claps=.25, octave=True)
# b64-71: the ask. The filter closes and the beat steps back.
section(64, 71, MAJOR[:1] + MAJOR[3:], MOT_MAJOR, pad=.42, pulse=(.3, .14), pulse_c=(1200, 500), mot=(.2, .1), mot_c=(4000, 1500), hats=(.08, .0), bars=4)
# b71: the pale card. A wide open chord, the motif once, then nothing.
music.add(pad_chord(["D2", "A2", "D3", "F#3", "A3", "E4", "F#4"], 6 * BEAT + 1.6, (3200, 1100), attack=.02, release=1.4), 71, .62)
music.add(keys(["D4", "F#4", "A4", "D5", "F#5"], 3.0), 71, .4)
for k, nt in enumerate(["D5", "A4", "F#4", "A4", "D6"]):
    music.add(pluck([nt], .9, 3000), 71 + k * .5, .17 - k * .015)

mix_ = music.x * .9 + drums.x * .95
mix_ = np.tanh(mix_ * 1.05) / 1.05
n = int((BEATS * BEAT + 1.5) * SR)
mix_ = mix_[:, :n] / (np.abs(mix_[:, :n]).max() + 1e-9) * .85
sf.write(FILM / "audio" / "music.wav", mix_.T, SR)
beats = [round(i * BEAT, 5) for i in range(BEATS + 4)]
secs = [("open", 0), ("count", 14), ("turn", 25), ("left", 29), ("answer", 50), ("ask", 64), ("end", 71)]
json.dump({"bpm": BPM, "period": BEAT, "offset": 0.0, "beats": beats, "downbeats": beats[::4],
           "sections": [{"name": a, "beat": b} for a, b in secs], "bar_energy": []}, open(FILM / "beats.json", "w"))
print("music.wav", round(n / SR, 1), "s")
