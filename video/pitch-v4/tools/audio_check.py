# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Checks that the score and effects work together, with measurements. It can't judge taste.
Run from video/: uv run pitch-v4/tools/audio_check.py"""
import json, re, pathlib
import numpy as np, librosa, soundfile as sf
F = pathlib.Path(__file__).resolve().parents[1]; B = .6
HITS = re.findall(r"\[([\d.]+),\s*'([^']+)',\s*'(\w+)'(?:,\s*\{([^}]*)\})?\]", (F / "film.js").read_text().split("];\n\n// Type:")[0])
PC = "C C# D D# E F F# G G# A A# B".split()
MINOR = set("D E F G A A# C C#".split()); MAJOR = set("D E F# G A B C#".split())
music, sr = sf.read(F / "audio/music.wav"); sfx, _ = sf.read(F / "audio/sfx.wav"); mix, _ = sf.read(F / "audio/mix.wav")
mono = lambda x: x.mean(axis=1) if x.ndim > 1 else x
music, sfx, mix = mono(music), mono(sfx), mono(mix); dur = len(mix) / sr
db = lambda x: 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-7)
seg = lambda x, a, b: x[int(a * B * sr):int(b * B * sr)]
print(f"--- effects: {len(HITS)} over {dur:.0f} s = {len(HITS) / dur:.2f} per second")
bad = []
for b, label, kind, opts in HITS:
    for n in re.findall(r"(?:pitch|to): '([A-G]#?)\d'", opts or ""):
        if n not in (MINOR if float(b) < 48 else MAJOR): bad.append((float(b), label, n))
print(f"out-of-key pitched effects: {len(bad)}", bad[:14])
off = [(float(b), l) for b, l, *_ in HITS if abs(float(b) * 4 - round(float(b) * 4)) > .01]
print(f"effects off the 16th-note grid: {len(off)}", off[:10])
counts = np.bincount([int(float(b) // 8) for b, *_ in HITS], minlength=int(dur / B // 8) + 1)
print("effects per 8 beats:", counts.tolist(), "| busiest:", int(counts.max()))
print("--- effect loudness against music (dB; near or above 0 = effects dominate)")
SECT = [("hook", 0, 11), ("pause", 11.5, 15), ("title", 16, 22), ("problem", 22, 44), ("bridge", 44, 52), ("reveal", 52, 60), ("solution", 60, 92), ("method", 92, 112), ("steps", 112, 132), ("close", 132, 144), ("name", 144, 151)]
for n, a, b in SECT: print(f"  {n:9s} mix {db(seg(mix, a, b)):6.1f}  effects-minus-music {db(seg(sfx, a, b)) - db(seg(music, a, b)):6.1f}")
print("--- note clash: share of harmonic energy a semitone from the strongest notes (lower = cleaner)")
for n, a, b in SECT:
    c = librosa.feature.chroma_cqt(y=seg(mix, a, b).astype(float), sr=sr, hop_length=4096).mean(1); t = np.argsort(-c)[:3]
    cl = sum(c[(i + 1) % 12] + c[(i - 1) % 12] for i in t if (i + 1) % 12 not in t and (i - 1) % 12 not in t); print(f"  {n:9s} top {[PC[i] for i in t]}  clash {cl / c.sum():.2f}")
print("--- transitions: jump across each boundary, 2 beats before vs after")
for name, b in [("into title", 16), ("into dials", 38), ("into bridge", 44), ("into reveal", 52), ("into solution", 60), ("into method", 92), ("into steps", 112), ("into close", 132), ("into name", 144)]:
    x, y = seg(mix, b - 2, b), seg(mix, b, b + 2); cen = lambda s: np.median(librosa.feature.spectral_centroid(y=s.astype(float), sr=sr))
    print(f"  {name:14s} loudness {db(y) - db(x):+5.1f} dB   brightness {np.log2(cen(y) / cen(x)):+5.2f} oct")
