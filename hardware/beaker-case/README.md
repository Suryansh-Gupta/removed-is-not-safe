# Beaker case for the 500 mL batch reactor

A light-blocking case that stands in for the foil wrap. Black PLA shell with a diagrid of crossing helical ribs, TPU
base ring and port plugs, and a matching vial rack. Designed in code (`case.py`, CadQuery), so every size is a number
you can change.

**Status: designed and checked in CAD only. Nothing has been printed or tested.** Whether to use it in place of foil
is Suryansh's call: the research plan says foil, so this is a change to the method.

## Before you print: measure
Every size under `MEASURE` in `case.py` is a catalogue value for a generic 500 mL low-form beaker. Measure with
calipers and edit:

| Number in `case.py` | What to measure | Default |
|---|---|---|
| `beaker_od` | outside diameter of the beaker body | 85 mm |
| `rim_od` | widest point of the flared rim, not at the spout | 90 mm |
| `spout_extra` | how far the spout sticks out past the rim | 6 mm |
| `beaker_h` | bench to rim | 120 mm |
| `water_line` | bench to water surface when filled for a run | 105 mm |
| `sample_tube_od` | tubing on the sampling syringe | 3.2 mm |
| `thermo_od` | thermometer stem | 6.5 mm |
| `vial_od`, `vial_depth` | your sample vials (size not decided yet) | 15 mm, 16 mm |

Then rebuild. The script stops with an error if the new numbers break a fit rule (spout hits the wall, a chimney
reaches the water, and so on).

```bash
cd hardware/beaker-case && ../.venv/bin/python case.py
```

First time only, set up the CAD library:

```bash
cd hardware && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install cadquery
```

## Parts (files in `out/`, as `.stl` for the slicer and `.step` for CAD)
| Part | Material | Size (mm) | How it prints | Supports |
|---|---|---|---|---|
| `sleeve_PLA` | black PLA | 116 × 116 × 127 | standing up, as modelled | none |
| `lid_PLA_print_orientation` | black PLA | 114 × 114 × 17 | flat top face on the bed (already flipped in this file) | none |
| `base_ring_TPU` | TPU | 114 × 114 × 8 | flat side down | none |
| `plug_solid_TPU`, `plug_sample_TPU`, `plug_thermo_TPU` | TPU | 18–24 × 18 × 11 | flange down | none |
| `vial_rack_PLA` | PLA | 128 × 37 × 22 | flat | none |

`assembly.step` shows everything together with a reference beaker. Everything fits a 180 mm bed.

## Bambu Studio settings
**PLA parts (sleeve, lid, rack)**
- 0.4 mm nozzle, 0.20 mm layers.
- **Black PLA.** Other colours let light through.
- Wall loops: 6 on the sleeve and lid, so the 2.4 mm walls are solid plastic. Infill then hardly matters (15%).
- Top and bottom shell layers: 5 on the lid.
- Seam: "Aligned" or "Back", so the seam hides along one rib.
- Sleeve: add a 5 mm brim. It is a tall thin tube.
- No supports. The rib collars have 45° undersides and the ribs lean about 35° from vertical.

**TPU parts (ring, plugs)**
- Feed TPU from the external spool holder unless your filament says it is made for the AMS.
- Dry the TPU first if it has been open; wet TPU strings badly.
- Use the Bambu TPU profile for your filament. Print slowly, 2–3 wall loops, 20–30% infill for the ring so it stays grippy.
- Print the three plugs together; tiny parts alone get too hot.

**Fit check before the long print:** in Bambu Studio, cut the sleeve to its bottom 12 mm and the lid as is, print
those, and try them on the beaker and on each other. About 25 minutes saves a 5-hour reprint.

## How it goes together
1. TPU ring on the stir plate. Beaker stands inside it, **directly on the plate** (the ring has no floor under the beaker, so the stir bar works as usual).
2. Sleeve drops over the beaker into the ring's groove. Line up the notch with the beaker spout.
3. Lid on. Its skirt slides over the sleeve and an inner lip drops inside: two overlaps for light.
4. Ports, marked on the lid: **S** sampling tube, **D** dosing (pull the plug, add chlorine, replace), **T** thermometer.

## What to test before trusting it (not done yet)
- **Light.** In a dark room, put a phone torch inside, close it up, and look for glow at the lid, the ring and the ports. Then hold the sleeve wall against the torch: if you see light through 2.4 mm of your black PLA, add wall thickness or wrap foil inside the sleeve.
- **Chlorine.** Nothing printed should touch the water: the chimneys stop about 13 mm above the default water line. Still, run the blank beaker (chlorine, no cipro) with the case on and compare its DPD readings with a foil-wrapped blank. If chlorine fades faster in the case, the plastic is using it.
- **Heat.** Leave the stir plate's heater off. PLA softens near 55 °C.
- **Stirring.** Confirm the stir bar still spins steadily with the ring in place.

## Looking at it
```bash
cd hardware/beaker-case && python3 -m http.server 8771
```
Then open http://127.0.0.1:8771/preview.html (assembled, exploded and cut-away views; the 3D library loads from the internet).
