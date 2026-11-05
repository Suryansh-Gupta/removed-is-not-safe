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
# Act 1 and 2: thriller writing. A low drone with a clashing semitone, a heartbeat, a clock that speeds up,
# strings trembling higher and higher, a low ostinato that never rests. No warm chords until the bridge.
def drone(notes, length, c0=180, c1=500):
    n = int(length * SR); x = sum(saw(hz(nt), n) + saw(hz(nt) * 1.004, n) for nt in notes) / len(notes)
    x = sweep_filter(x, np.geomspace(c0, c1, n), "lowpass", 1.1); return np.tanh(1.5 * x) * adsr(n, .4, .1, 1, .5)
def tremolo(notes, length, rate0=7.0, rate1=13.0, c0=700, c1=3200):
    n = int(length * SR); t = tvec(n); x = sum(saw(hz(nt), n) + saw(hz(nt) * 1.006, n) for nt in notes) / len(notes)
    x = sweep_filter(x, np.geomspace(c0, c1, n), "lowpass", 1.2); ph = 2 * np.pi * np.cumsum(np.linspace(rate0, rate1, n)) / SR
    return x * (.55 + .45 * np.sin(ph)) * np.linspace(.15, 1, n) ** 1.6 * adsr(n, .05, .1, 1, .08)
def clock(g=1.0):
    n = int(.03 * SR); return filt(rng.standard_normal(n), "bandpass", [2600, 7000]) * np.exp(-tvec(n) / .005) * g
def beat_heart():
    n = int(.34 * SR); t = tvec(n); f = 44 + 66 * np.exp(-t / .03); return np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .1))
def taiko():
    n = int(.8 * SR); t = tvec(n); f = 50 + 120 * np.exp(-t / .03); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .24)
    return np.tanh(2 * x + .5 * filt(rng.standard_normal(n), "lowpass", 900) * np.exp(-t / .03))
def braam(notes, length=2.2):
    n = int(length * SR); x = sum(saw(hz(nt), n) + saw(hz(nt) * 1.008, n) for nt in notes) / len(notes)
    x = sweep_filter(x, np.geomspace(1900, 170, n), "lowpass", 1.3); return np.tanh(2.4 * x) * adsr(n, .012, .3, .7, .5)
# hook (b0-11): heartbeat speeds up, clock ticks tighten, strings climb. Then everything stops.
tex.add(drone(["D1", "D2", "D#3"], 11.5 * BEAT, 120, 620), 0, .36)
for b in (0, 3, 5.5, 7.5, 9, 10, 10.75): drums.add(beat_heart(), b, .85); drums.add(beat_heart(), b + .28, .5)
ticks = list(np.arange(0, 8, 1.0)) + list(np.arange(8, 9.5, .5)) + list(np.arange(9.5, 10.5, .25)) + list(np.arange(10.5, 11.05, .125))
for b in ticks: tex.add(clock(.25 + b * .03), b, .55, pan=.25)
tex.add(drop_(980), 1.72, .55, pan=.3)
music.add(tremolo(["D4", "D#4"], 7.5 * BEAT, 6, 8, 500, 1500), 1, .13)
music.add(tremolo(["A4", "A#4", "D5"], 2.9 * BEAT, 9, 16, 1300, 5200), 8.1, .34)
tex.add(riser(2.8 * BEAT), 8.2, .34)
# b11-14: near silence, only a held high note that won't resolve. b14-16: heartbeat alone.
music.add(tremolo(["D#6"], 3 * BEAT, 4, 4, 2400, 2400), 11, .025)
drums.add(beat_heart(), 14, .6); drums.add(beat_heart(), 14.28, .34); drums.add(beat_heart(), 15, .75); drums.add(beat_heart(), 15.28, .42)
tex.add(riser(.9 * BEAT), 15.1, .34)
# problem (b16-44): braam on the title, then a relentless low 16th ostinato with taiko
music.add(braam(["D1", "A1", "D2", "F2", "D#3"], 3.0), 16, .95)
TENSE = [("D", "D#"), ("A#", "A"), ("G", "G#"), ("A", "A#")]
for b in range(16, 44):
    i = (b // 4) % 4; root, cl = TENSE[i]; low = f"{root}{1 if root in ('D',) else 1}"
    if b >= 18:
        for s, a in enumerate((0, .25, .5, .75)):
            nt = f"{cl}1" if s == 3 and b % 2 == 1 else low
            music.add(bass_note(nt, BEAT * .17, 1300 + (b - 16) * 22), b + a, .3 + (.12 if s == 0 else 0))
    if b % 4 == 0 and b >= 20:
        music.add(tremolo([f"{root}4", f"{cl}4", f"{root}5"], 4 * BEAT, 8, 12, 800, 2600), b, .12 + (b - 20) * .004)
        tex.add(drone([f"{root}1", f"{cl}2"], 4 * BEAT + .3, 200, 420), b, .22)
    if b >= 22 and b % 4 in (0, 3): drums.add(taiko(), b + (0 if b % 4 == 0 else .5), .55)
    if b >= 30 and b % 8 == 6: drums.add(taiko(), b + .5, .45); drums.add(taiko(), b + .75, .55)
    if b >= 18: tex.add(clock(.45), b + .5, .5, pan=.25)
    if b >= 30: tex.add(clock(.3), b + .25, .4, pan=-.25); tex.add(clock(.3), b + .75, .4, pan=-.25)
for b0 in (28, 36): tex.add(riser(4 * BEAT), b0, .16)
# The bridge from problem to solution (b44-60). No hard change: the drums thin out, the harmony walks
# Bb -> Asus -> A -> D, sharing notes at every step (D and A carry through), then the groove rebuilds in major.
music.add(pad_chord(["A#2", "F3", "A#3", "D4"], 4 * BEAT + 1.0, (1700, 1200), attack=.1, release=.7), 44, .4)
music.add(pad_chord(["A2", "E3", "A3", "D4"], 2 * BEAT + 1.0, (1200, 1800), attack=.5, release=.8), 48, .42)
music.add(pad_chord(["A2", "E3", "A3", "C#4"], 2 * BEAT + 1.0, (1800, 2600), attack=.5, release=.9), 50, .46)
music.add(pad_chord(MAJOR[0], 8 * BEAT + 1.0, (2000, 3400), attack=.7, release=.8), 52, .52)
music.add(bass_note("A1", BEAT * 3.6), 48, .22); music.add(bass_note("D2", BEAT * 3.6), 52, .2); music.add(bass_note("D2", BEAT * 3.6), 56, .28)
for k, b in enumerate(np.arange(44, 48, 1)):
    drums.add(taiko(), b, .42 - k * .1); tex.add(clock(.3 - k * .06), b + .5, .4, pan=.25)
    for a_ in (0, .25, .5, .75): music.add(bass_note("A#1", BEAT * .17, 1000 - k * 180), b + a_, .26 - k * .06)
bridge = ["D5", "F5", "A#5", "F5", "D5", "F5", "A#4", "D5", "A4", "D5", "E5", "D5", "A4", "C#5", "E5", "C#5"]
for k, nt in enumerate(bridge):
    music.add(pluck([nt], .34, 3000 - k * 90), 44 + k * .5, .15 - k * .003, pan=.3 * (1 if k % 2 else -1))
for k, b in enumerate(np.arange(52, 60, .5)):
    ch = MAJOR[0] if b < 56 else MAJOR[3]; m = midi(ch[[0, 2, 1, 3][k % 4]]) + 12
    music.add(pluck([note_name(m)], .32, 2400 + k * 70), b, .05 + k * .009, pan=.3 * (1 if k % 2 else -1))
for k, b in enumerate(np.arange(54, 60, 1)):
    drums.add(kick(soft=True) if b < 58 else kick(), b, .18 + k * .085)
    if b >= 57: drums.add(hat(), b + .5, .06 + (b - 57) * .035, pan=.22)
    if b >= 58: drums.add(clap(), b + 1 if b % 2 == 0 else b, .1 + (b - 58) * .08, pan=.05)
music.add(pad_chord(MAJOR[3], 4 * BEAT + .6, 2600, attack=.5, release=.5), 56, .3)
tex.add(riser(2.8 * BEAT), 57.2, .1)
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
