# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["kokoro>=0.9", "soundfile", "numpy", "misaki[en]", "pip"]
# ///
"""Voice test takes with the local Kokoro model (no account). Run: uv run pitch-v4/tools/voice_takes.py
In docs/voice-test-lines.txt, "..." is a pause and a blank line is a longer one."""
import pathlib, re
import numpy as np, soundfile as sf
from kokoro import KPipeline

ROOT = pathlib.Path(__file__).resolve().parents[1]
LINES = (ROOT / "docs" / "voice-test-lines.txt").read_text().strip().split("\n\n")
OUT = ROOT / "audio" / "vo"; OUT.mkdir(parents=True, exist_ok=True)
SR, PAUSE, GAP = 24000, 0.55, 1.0
VOICES = [("a", "am_michael"), ("a", "am_fenrir"), ("a", "af_heart"), ("b", "bm_george")]
for lang, voice in VOICES:
    pipe = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M"); parts = []
    for line in LINES:
        for bit in [b.strip() for b in re.split(r"\.\.\.", line) if b.strip()]:
            for _, _, audio in pipe(bit, voice=voice, speed=0.88):
                parts.append(np.asarray(audio)); parts.append(np.zeros(int(SR * PAUSE)))
        parts.append(np.zeros(int(SR * GAP)))
    x = np.concatenate(parts); sf.write(OUT / f"test_{voice}.wav", x / np.abs(x).max() * .9, SR); print(voice, round(len(x) / SR, 1), "s")
