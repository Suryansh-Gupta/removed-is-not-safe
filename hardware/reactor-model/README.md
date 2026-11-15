# Working model of a chlorine contact basin

A tabletop treatment train, fully 3D printed, that runs real water: head tank → serpentine contact basin → weir →
dechlorination cell → outfall → receiving tray. It is 176 × 122 × 143 mm assembled.

**What it demonstrates.** A drop of food dye at the "NaOCl" port is a tracer. With the baffle insert in, the dye has
to travel all eight passes and reaches the weir late and together. Lift the insert out, run it again, and the dye cuts
straight across in a fraction of the time. Same tank, same flow, very different contact time. Contact time is the T in
CT, and CT is what your Settings Advisor's map is drawn in. This is the physical thing that map describes.

**Status: designed and audited in CAD. Not printed, not run with water.** The flow rate and timings below are
estimates until you measure them with a stopwatch. It is a teaching model, not a scale model of any real plant.

## Parts (in `out/`, each `.stl` already turned the way it prints)
| File | Material | Size on the bed (mm) | What it is | Supports |
|---|---|---|---|---|
| `tray.stl` | PLA, dark | 176 × 122 × 53 | receiving water; the tank stands inside it on four posts; station labels on the front | none |
| `tank.stl` | PLA, **white or light** so dye shows | 158 × 110 × 28 | the basin: contact zone, weir, dechlorination cell, spout; flow arrows engraved in the floor | none |
| `insert.stl` | PLA, a contrast colour | 132 × 110 × 28 | seven baffles on a frame; drops in, lifts out | none (prints frame-down) |
| `head_tank.stl` | PLA | 27 × 122 × 90 | feeds the basin through a 2 mm orifice; a separate tube through it is the dye port | none (prints open-top-down; the floor is a 21 mm bridge) |
| `post_cap_TPU.stl` × 4 | TPU | 14 × 14 × 8 | non-slip caps on the tray posts | none |

Everything fits a 180 mm bed. `*_in_place.stl` files are only for the 3D preview.

## Bambu Studio settings
- 0.4 mm nozzle, 0.20 mm layers.
- **Tank, tray and head tank must hold water: 6 wall loops, 5 top and 5 bottom layers, 25% infill.** If a part still
  seeps, raise the flow ratio a few percent or brush the inside with clear nail varnish or epoxy.
- Seam: "Back" or "Aligned", so it is not a line of pinholes across a wall.
- Insert: 3 wall loops is enough.
- Change the filament colour at the layer where the tray's front labels start if you want them to stand out
  (they are 0.6 mm proud), or rub paint over them.
- TPU caps: flat end down, 3 walls. Feed TPU from the external spool unless it is an AMS-rated TPU.
- After printing, clear the head tank's orifice with a 2 mm drill bit turned by hand. Printed holes come out small.

## Assembly
1. Press the four TPU caps onto the posts in the tray.
2. Stand the tank on the caps, spout toward the labelled OUTFALL end. Stop ribs keep it from sliding.
3. Drop the insert in. Its frame rests on the tank rim.
4. Set the head tank across the inlet end. Its two lips drop between the ribs on the outside of the tray.

## Running the demonstration
You need water, food dye, a dropper or pipette, a jug, and a phone stopwatch. Do it over a towel the first time.

1. Baffles in. Pour water into the head tank and keep it near the FILL line until the basin is full and water runs
   over the weir and out the spout.
2. Put two drops of dye down the dye port (the tube through the head tank). Start the stopwatch.
3. Note when dye **first** reaches the weir, and when most of it has passed.
4. Empty the tray back into the jug. Lift the insert out.
5. Repeat steps 1 to 3 with the baffles out.
6. To get the real flow: catch the spout's water in a measuring cup for 30 seconds.

What to expect, and how sure: the basin holds 145 mL with baffles in (measured from the CAD). With an estimated flow
of 123–164 mL/min from a full head tank, the average time in the basin is about 53–71 s, and the flow path is 842 mm
with baffles against 127 mm without. The dye front arriving much sooner with the baffles out is what the physics
predicts; it has not been filmed or timed yet.

A full head tank is 144 mL, so one run needs about three top-ups. The tray takes 405 mL before water reaches the
underside of the tank: empty it between runs.

## The audit (`audit.py`, report in `out/audit_report.txt`)
39 checks, all passing. Geometry is measured from the CAD solids; hand formulas are written out separately and
compared. The main ones:
- No two parts overlap, in either configuration (baffles in, baffles out).
- Tank in tray: 0.6 mm each side, rims level, held end to end.
- Baffles stop 0.3 mm above the floor; the leak under one is estimated at 0.9% of the flow going round it.
- All eight passes are 14.10 mm wide and every turn is as wide as a pass.
- The orifice and dye port sit over pass 1 and clear the insert's frame.
- Water levels fall at every step: fill line 115.2, orifice 52.8, weir crest 38.8, outfall sill 34.8, tank underside
  24.4, tray floor 2.4 mm above the bench.
- Contact zone volume: 160.1 mL open, 145.2 mL with baffles (CAD and hand formula agree).
- Flow in the passes is laminar at the estimated flow (Reynolds number about 215), so dye moves as a visible front.
- Every part fits a 180 mm bed in its print orientation.

It also caught one real fault, now fixed: nothing stopped the head tank sliding off the end.

What the audit cannot tell you: whether your prints hold water, how much the jet from the orifice splashes, and the
real flow rate. Those need a print and a stopwatch.

## Changing it
Every size is a number at the top of `reactor.py` (`n_pass`, `weir_h`, `orifice_d`, `fill`, ...). Rebuild and re-audit:
```bash
cd hardware/reactor-model && ../.venv/bin/python reactor.py && ../.venv/bin/python audit.py
```
First time only: `cd hardware && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install cadquery`

## Looking at it
```bash
cd hardware/reactor-model && python3 -m http.server 8773
```
Then open http://127.0.0.1:8773/preview.html (baffles in/out, exploded view; the 3D library loads from the internet).

## At the showcase (check wording against the "Do not claim" list)
"This is the kind of basin where a plant's chlorine does its work. Watch the dye: with baffles, every drop of water
gets about the same time with the chlorine. Take them out and some water rushes through. Our model asks what happens
to ciprofloxacin during that time, and the app next to it picks the dose and time."
