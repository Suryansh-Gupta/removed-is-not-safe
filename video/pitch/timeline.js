// The whole pitch, in order. "old" = a clip from Removed_Is_Not_Safe_pitch_v2.mp4 (from, to in seconds).
// "scene" = drawn by scenes.js. fade = crossfade from the previous segment, in seconds.
window.TIMELINE = [
  { id: "hook", type: "old", from: 0, to: 14.9 },
  { id: "pill", type: "old", from: 14.9, to: 26.9, fade: 0.25 },
  { id: "x22", type: "old", from: 26.9, to: 34.1, fade: 0.25 },
  { id: "Molecule", type: "scene", dur: 15.5, fade: 0.4 },
  { id: "Removed vs. Active", type: "scene", dur: 18, fade: 0.4 },
  { id: "Drop to light", type: "scene", dur: 1.8 },
  { id: "Settings act on water", type: "scene", dur: 12 },
  { id: "Title", type: "scene", dur: 5, fade: 0.35 },
  { id: "reactor", type: "old", from: 60.6, to: 77.6, fade: 0.35 },
  { id: "Coil ride", type: "scene", dur: 15.5 },
  { id: "measure", type: "old", from: 77.6, to: 85.5 },
  { id: "loop", type: "old", from: 86.0, to: 92.9, fade: 0.25 },
  { id: "Honest sliders", type: "scene", dur: 16, fade: 0.35 },
  { id: "Impact", type: "scene", dur: 9.5, fade: 0.35 },
  { id: "Drop to dark", type: "scene", dur: 1.8 },
  { id: "Close", type: "scene", dur: 6.5 },
];
