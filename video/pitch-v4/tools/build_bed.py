"""Builds the music bed from two real, licensed tracks, cut on their own bars. Both run at 120 BPM, and the
tense track's low note and the hopeful track's key are both D. Run from pitch-v4/: python tools/build_bed.py"""
import numpy as np, librosa, soundfile as sf
SR, B = 48000, .5
T, _ = librosa.load("assets/sound/music/tension_120.wav", sr=SR, mono=False); H, _ = librosa.load("assets/sound/music/hope_01.mp32", sr=SR, mono=False)
stereo = lambda x: np.stack([x, x]) if x.ndim == 1 else x
T, H = stereo(T), stereo(H); N = int(76 * SR); out = np.zeros((2, N + SR))
def put(src, t_src, b0, b1, gain=1.0, fade=.03):
    i, n = int(b0 * B * SR), int((b1 - b0) * B * SR); s = int(t_src * SR); x = src[:, s:s + n].copy(); n = x.shape[1]
    f = int(fade * SR); e = np.ones(n); e[:f] = np.linspace(0, 1, f); e[-f:] = np.linspace(1, 0, f); out[:, i:i + n] += x * e * gain
T_BARS, H_BARS = 2.032, .037
# hook: the track's own opening build, then a stop-down before the title
put(T, T_BARS, 0, 11.5, 1.0, fade=.12)
put(T, T_BARS + 11.5 * B, 11.5, 16, .04, fade=.1)
# problem: the track's brightest, most driving passage, entering on a bar with the title
put(T, T_BARS + 14, 16, 44, 1.0, fade=.02)
# bridge: equal-power crossfade over 8 beats, bars aligned, into the opening of the hopeful track
n = int(4 * SR); i = int(22 * SR); k = np.linspace(0, 1, n)
out[:, i:i + n] += T[:, int((T_BARS + 28) * SR):int((T_BARS + 28) * SR) + n] * np.cos(k * np.pi / 2)
out[:, i:i + n] += H[:, int(H_BARS * SR):int(H_BARS * SR) + n] * np.sin(k * np.pi / 2)
# solution through close, then the track's real ending for the end card
put(H, H_BARS + 4, 52, 132, 1.0, fade=.02)
put(H, H_BARS + 44, 132, 144, 1.18, fade=.02)
put(H, 144.037, 144, 152, 1.1, fade=.03)
peak = float(np.abs(out).max()); out *= .9 / peak
sf.write("audio/music_bed.wav", out[:, :N].T, SR, subtype="PCM_24"); print("bed written", N / SR, "peak before scaling", round(peak, 3))
