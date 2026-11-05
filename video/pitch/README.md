# Pitch video

Final file: `Removed_Is_Not_Safe_pitch_v3.mp4` (not in git, because it's large). Rebuild it on this Mac from this folder. You need v2 of the pitch for its clips, and Python with numpy and scipy.

```bash
python3 make_audio.py
```

```bash
afconvert -f m4af -d aac -b 192000 audio.wav audio.m4a
```

```bash
swiftc -O export.swift -o export && swiftc -O mux.swift -o mux
```

```bash
./export ~/Downloads/Removed_Is_Not_Safe_pitch_v2.mp4 video_only.mp4
```

```bash
./mux video_only.mp4 audio.m4a Removed_Is_Not_Safe_pitch_v3.mp4
```

- `timeline.js`: the order and length of every section. Sound effects follow it automatically; re-run everything after changing it.
- `scenes.js`: the drawn scenes. Open `index.html` to preview them.
- `gen_data.py`: regenerates `data.js` from the model. It also needs rdkit. Re-run it if the model changes.
