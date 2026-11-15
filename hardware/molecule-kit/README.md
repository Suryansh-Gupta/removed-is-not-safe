# Ciprofloxacin, to scale, with a swappable chlorine

A hand-size model of ciprofloxacin, 141 mm long, where 10 mm is 1 ångström (100,000,000 : 1). The hydrogen that free
chlorine replaces is a snap-on cap. Pull it off, snap on the chlorine, and you are holding N-chloro-ciprofloxacin.
The other 41 atoms, including the whole quinolone core, are the same piece of plastic.

That is the project in one object: **a test that looks for ciprofloxacin no longer finds it, but almost all of it is
still there.** Pulling the chlorine back off is the reversal that Gap 2 asks about for bisulfite.

**Status: designed and audited in CAD. Not printed yet. The snap fit is untested.**

## Why this, and not the beaker case
The beaker case replaced foil that already works and added risk to the experiment. This model never touches the
experiment. It is for explaining the work: a judge can do the reaction with their hands in two seconds.

## What is in `out/`
| File | Material | Size (mm) | What it is |
|---|---|---|---|
| `cipro_body_whole.stl` | PLA | 142 × 92 × 50 | the molecule in one piece (needs supports) |
| `cipro_body_half_top.stl`, `cipro_body_half_bottom_print_orientation.stl` | PLA | 142 × 92 × 24 / 26 | the same body cut along its flat plane; each half prints flat side down |
| `cap_H_TPU.stl` | TPU | 13 × 13 × 8 | the hydrogen cap |
| `cap_Cl_TPU.stl` | TPU | 19 × 19 × 18 | the chlorine cap |
| `plaque.stl` | PLA | 170 × 62 × 20 | stand with the name, formula, a 50.00 mm scale bar (5 Å) and two studs to park the spare cap |
| `colour_C/H/N/O/F.stl` | PLA | | the body split by element, in the same position, for multi-colour printing |
| `audit_report.txt` | | | the 37 checks below, with their measured values |

## Where the numbers come from
| What | Value | Source | How sure |
|---|---|---|---|
| Atom positions | 42 atoms, C17H18FN3O3 | PubChem CID 2764, 3D conformer `00000ACC00000001` (file in `data/`) | It is a **computed** shape (MMFF94 force field), not a crystal structure. It shows the neutral form (COOH and N–H). In water near pH 7.5 cipro is mostly a zwitterion: same atoms, same connections, one H at the other end. |
| Atom sizes | H 1.20, C 1.70, N 1.55, O 1.52, F 1.47, Cl 1.75 Å, all × 0.55 | Bondi 1964 van der Waals radii | The commonly tabulated values; not re-read from Bondi's paper. Relative sizes are true. All are shrunk by the same factor so that only bonded atoms fuse. |
| N–Cl distance | 1.748 Å | Microwave structure of monochloramine, NH₂Cl (tabulated from Cazzoli et al.; the original paper was not opened) | This is the closest measured N–Cl bond. N-chloro-cipro's own bond length was not found. |
| Which nitrogen | the piperazine N that has a hydrogen | Project notes, from Dodd et al. 2005 | It is the only N–H in the molecule. **Confirm against Dodd's Scheme 1.** |
| Scale | 10 mm per Å | chosen | exact |

## The audit (`audit.py`)
It does not trust the build script. It re-reads the PubChem file and the exported STL files with its own code and
compares them. All 37 checks pass. The main ones:

- The source file's formula is C17H18FN3O3, with exactly one N–H.
- All 45 bond lengths in the source are in the normal range for their bond type.
- All 861 atom-to-atom distances in the model match the source to 0.0001 mm.
- In the print file itself, every one of 36,541 surface points lies on some atom's sphere (largest gap 0.03 mm, from
  flat facets), and each of the 41 atoms' fitted centre and radius match the source to 0.004 mm.
- Every bond is a solid neck 5.0 to 6.5 mm in radius, and no two atoms touch unless they are bonded.
- The chlorine sits 17.480 mm from the nitrogen, along the old N–H direction, and clears every other atom by 7.3 mm.
- Snap fit: socket 0.15 mm larger than the stud, bulge 0.35 mm proud per side, lip 0.76 mm (Cl) and 1.26 mm (H).
- The plaque's scale bar measures 50.00 mm end to end.
- Every part fits a 180 mm bed.

The audit caught and fixed three real design faults on the way: caps with knife-edge rims, a scale bar that measured
51 mm with its end ticks, and a chlorine cap whose opening sat inside the snap cavity so it would not have gripped.

What the audit cannot tell you: whether the snap fit feels right in your TPU, and whether the computed shape is the
shape cipro takes in water.

## Printing (Bambu Studio)
**Print the caps and the plaque first** (about an hour, not sliced yet). The plaque's two studs are identical to the
one on the molecule, so you can test the snap fit before the long print. If the caps are too tight or loose, change
`SOCKET_GAP` in `molecule.py` (bigger = looser), rebuild, and re-run the audit.

**Body, one colour:** either
- `cipro_body_whole.stl` with tree supports, or
- the two halves, flat faces down, supports "auto" (a few atoms still overhang). Glue the halves; three 2 mm holes take
  short offcuts of 1.75 mm filament as alignment pins.

**Body, element colours (needs an AMS):** import all five `colour_*.stl` files at once and answer "yes" when Bambu
Studio asks to load them as one object with multiple parts. Give each part its filament: carbon dark grey or black,
hydrogen white, nitrogen blue, oxygen red, fluorine light green. Tree supports on.

**Caps:** TPU, flat rim down, no supports, 3 wall loops, 100% infill for the H cap (it is tiny). Feed TPU from the
external spool unless your filament is made for the AMS. Any two colours you can tell apart work; the chlorine cap is
visibly larger.

**Plaque:** flat, no supports. Change filament colour at the height where the letters start (5 mm) if you want them
to stand out.

Settings for PLA parts: 0.4 mm nozzle, 0.20 mm layers (0.12 mm looks better on the spheres), 3 wall loops, 15% infill.

## Rebuilding
```bash
cd hardware && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install cadquery manifold3d
```
```bash
cd hardware/molecule-kit && ../.venv/bin/python molecule.py && ../.venv/bin/python audit.py
```

## Looking at it
```bash
cd hardware/molecule-kit && python3 -m http.server 8772
```
Then open http://127.0.0.1:8772/preview.html and switch between "Cipro" and "After chlorine". The 3D library loads
from the internet.

## What to say with it in your hand (check the wording against the "Do not claim" list)
"This is ciprofloxacin, one hundred million times life size. Chlorine swaps this one hydrogen for a chlorine in under
a second. A test for ciprofloxacin now reads zero. Everything else is still here."
