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
music, drums, tex = Bus(DUR, BPM), Bus(DUR, BPM), Bus(DUR, BPM)
MINOR = [["D3", "A3", "C4", "F4"], ["A#2", "F3", "A#3", "D4"], ["F3", "A3", "C4", "F4"], ["C3", "G3", "A#3", "E4"]]
MAJOR = [["D3", "A3", "D4", "F#4"], ["A2", "E3", "A3", "C#4"], ["B2", "F#3", "B3", "D4"], ["G2", "D3", "G3", "B3"]]
BASS_MIN, BASS_MAJ = ["D2", "A#1", "F2", "C2"], ["D2", "A1", "B1", "G1"]

def drop_(f=880):
    n = int(.22 * SR); t = tvec(n); return np.sin(2 * np.pi * np.cumsum(f * .6 + f * 1.4 * (t / .22) ** 2) / SR) * np.exp(-t / .05)
def bubbles(length, per_s=9):
    out = np.zeros(int(length * SR) + SR)
    for _ in range(int(length * per_s)):
        i = int(rng.uniform(0, length) * SR); n = int(rng.uniform(.03, .09) * SR); t = tvec(n); f = rng.uniform(500, 1700)
        out[i:i + n] += np.sin(2 * np.pi * np.cumsum(f * (1 + 2.2 * t / t[-1])) / SR) * np.exp(-t / .018) * rng.uniform(.2, 1)
    return out
def hum(length, f=98.0, rate=5.0):
    n = int(length * SR); t = tvec(n); x = np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * 2 * f * t) + .15 * rng.standard_normal(n)
    return filt(x, "lowpass", 900) * (.65 + .35 * np.sign(np.sin(2 * np.pi * rate * t))) * adsr(n, .25, .1, 1, .4)
def piano(notes, length=1.6):
    return reverb(keys(notes, length), wet=.25) if False else keys(notes, length)

# Act 1: pulse and tension (b0-16)
for b in range(0, 11, 2):
    drums.add(kick(soft=True), b, .5); drums.add(kick(soft=True), b + .5, .24)
music.add(pad_chord(MINOR[0], 8 * BEAT, (280, 1500), attack=.2), 0, .55)
music.add(pad_chord(MINOR[3], 4 * BEAT, (900, 2200), attack=.1), 8, .5)
tex.add(drop_(980), 1.72, .55, pan=.3); tex.add(riser(2.7 * BEAT), 8.3, .3)
# near silence, b11.5-14; one faint tone before the sentence lands
music.add(pad_chord(["D5"], 3 * BEAT, 900, attack=.5, voices=3), 12, .08)
# Act 2: the problem, a driving minor groove (b16-52)
def groove(b0, b1, chords, bass, plk=.0, hats=True, clap_on=False, kick_g=.72, oct_=5):
    for b in range(b0, b1):
        if b % 4 == 0:
            i = (b // 4) % 4
            music.add(pad_chord(chords[i], 4 * BEAT + .2, 1700, attack=.05, release=.3), b, .4)
        drums.add(kick(), b, kick_g)
        if clap_on and b % 2 == 1: drums.add(clap(), b, .3, pan=.05)
        if hats:
            drums.add(hat(), b + .5, .16, pan=.22)
            drums.add(hat(), b + .75, .06, pan=-.25)
        i = (b // 4) % 4; music.add(bass_note(bass[i], BEAT * .45), b, .34); music.add(bass_note(bass[i], BEAT * .3), b + .5, .22)
        if plk:
            ch = chords[i]; order = [0, 2, 1, 3]
            for s, a in enumerate((0, .5)):
                nt = ch[order[(b * 2 + s) % 4]]; m = midi(nt); music.add(pluck([note_name(m + 12)], .3, 3400), b + a, plk, pan=.3 * ((b + s) % 2 * 2 - 1))
groove(16, 52, MINOR, BASS_MIN, plk=.17, clap_on=True)
# Reveal lift, major from here (b52-112)
music.add(pad_chord(MAJOR[0], 8 * BEAT, (600, 3400), attack=.6, release=.5), 52, .55)
tex.add(hum(0.5), 52, 0)
groove(60, 92, MAJOR, BASS_MAJ, plk=.2, clap_on=True, kick_g=.66)
tex.add(hum(6 * BEAT, 98, 5.0), 70, .16, pan=-.2)
tex.add(bubbles(10 * BEAT), 76, .1, pan=.15)
for b in (86, 87.5, 89): tex.add(drop_(760 + b * 2), b, .32, pan=.2)
# Measurement and model, tighter (b92-112)
groove(92, 112, MAJOR, BASS_MAJ, plk=.22, hats=True, clap_on=False, kick_g=.6)
# Integration: warm and open, the emotional lift (b112-148)
groove(112, 132, [["D3", "A3", "D4", "F#4", "A4"], MAJOR[1], MAJOR[2], MAJOR[3]], BASS_MAJ, plk=.24, clap_on=True, kick_g=.7)
# The close: one silent half-beat, then the biggest groove in the film (b132-144), then resolve on the name
groove(132, 144, [["D3", "A3", "D4", "F#4", "A4"], MAJOR[1], MAJOR[3], MAJOR[0]], BASS_MAJ, plk=.28, clap_on=True, kick_g=.82)
drums.add(crash(2.0), 132, .3); drums.add(crash(2.0), 136, .34)
music.add(pad_chord(["D2", "A2", "D3", "F#3", "A3", "D4"], 8 * BEAT + 1.2, (3000, 800), attack=.02, release=1.0), 144, .7)
drums.add(crash(3.0), 144, .36); music.add(keys(["D4", "F#4", "A4", "D5"], 3.5), 144, .42)

mix_ = music.x * .9 + drums.x * .95 + tex.x
mix_ = np.stack([reverb(mix_[i], wet=.08) if False else mix_[i] for i in (0, 1)])
n = int(BEATS * BEAT * SR); mix_ = mix_[:, :n] / (np.abs(mix_[:, :n]).max() + 1e-9) * .85
sf.write(FILM / "audio" / "music.wav", mix_.T, SR)
beats = [round(i * BEAT, 5) for i in range(BEATS + 1)]
secs = [("hook", 0), ("problem", 16), ("prototype", 52), ("measure", 92), ("integrate", 112), ("end", 132)]
json.dump({"bpm": BPM, "period": BEAT, "offset": 0.0, "beats": beats, "downbeats": beats[::4], "sections": [{"name": a, "beat": b} for a, b in secs],
           "bar_energy": []}, open(FILM / "beats.json", "w"))
print("music.wav", round(n / SR, 1), "s")
