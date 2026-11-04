# Building the 3D lattice — reactor catalyst support

Covers the "design the lattice" and "print the lattice" steps. The bench procedure for
loading catalyst onto a printed part lives in `team-roadmap-v2.md` (The Bench Bible); the
week it happens in is in `schedule-v3-feasible.md`. **This doc holds geometry and printing
only.**

Last updated: 2026-09-13 — geometry regenerated and every number in it re-measured from the
mesh. Four figures in the 09-11 version were wrong; they are corrected below and flagged in
§8.

---

## 0. What you're getting and why there are two

Two lattices, both 23 mm ⌀ × 80 mm, both **measured** at 60.0 % open, both print-ready:

| | **Gyroid** | **Cross-hatch** |
|---|---|---|
| Geometry | sheet TPMS, 8 mm cell | cubic strut grid, 6 mm cell |
| Wall / strut | 1.04 mm wall | 2.71 mm strut, 3.29 mm channel |
| Measured open fraction | 0.600 | 0.601 |
| Wetted area, whole part | 265 cm² | 180 cm² |
| Wetted area, lattice region only | 224 cm² | 141 cm² |
| Specific area per mL of void | 635 mm²/mL | 399 mm²/mL |
| Straight axial channels | **none** — 10.7 mm² of line-of-sight out of 415 mm² | **12 channels**, 3.29 mm square, 107.5 mm² measured clear |
| PETG per part | 17.5 g | 17.4 g |
| Best suited to | catalyst **option 2** (alginate + iron-oxide dip coat) | catalyst **option 1** (threaded steel wool) |

The split matters because the two catalyst options have opposite requirements. Option 1 says
"thread the wool through the channels of the printed lattice" — a gyroid has no channels to
thread; it is a continuous curved wall with essentially no straight-line path through it.
Option 2 dip-coats a surface, and there the gyroid's 47 % extra wetted area is the whole
point.

Print both and settle it in the baseline runs rather than by argument. That also gives you a
legitimate methods sentence — *"support geometry was selected by comparing conversion per
pass at fixed iron mass across two printed geometries"* — instead of "we picked a lattice."

---

## 1. Two corrections to the original spec — read this before printing

### 1.1 A 20 mm lattice would have leaked about half your flow around the outside

A 20 mm lattice in a 25 mm ID tube, sliding in "with a little gap," leaves an annulus of
**176.7 mm²**. The open frontal area of a 60 %-porous 20 mm lattice is **188.5 mm²**. The
annulus is smooth-walled and offers far less resistance than the tortuous lattice, so the
honest reading is that **at least 48 % of your water — probably more — would bypass the iron
entirely.**

That isn't a small efficiency loss. It would:

- inflate your apparent residence time, because water in the annulus is in the tube but not
  in the reactor;
- **compress the iron-loading variable**, since doubling iron on a lattice that only sees
  half the flow barely moves conversion — which would show up in the SHAP analysis as "iron
  mass doesn't matter much," a wrong conclusion you would then have to defend at judging;
- and get worse at high flow, because bypass fraction rises with flow rate, which would alias
  into your residence-time axis.

**The fix, built into these files:** the lattice core is 23 mm, and each end carries an
integral 2 mm collar ring of 24.6 mm OD that seals the annulus against the tube wall.

**Corrected number:** the remaining annular area at the collar is **15.6 mm²**, not the
1.5 mm² the 09-11 version of this doc claimed — that figure was off by a factor of ten.
π/4 × (25² − 24.6²) = 15.6 mm². The argument survives the correction, because what stops
bypass is resistance, not area, and a thin slit's resistance goes as the **cube** of the gap.
Treating the lattice as a Kozeny–Carman porous medium (ε = 0.6, ~3 mm pore scale) and the
collar gap as a 0.2 mm annular slit in series with the 1 mm annulus between the collars:

| | bypass fraction, estimated |
|---|---|
| the original 20 mm lattice, 2.5 mm gap, no collars | **~80 %** — worse than the ≥48 % the area argument suggested |
| 23 mm lattice, 1 mm gap, no collars | ~18 % |
| 23 mm with collars, part centred | **~3 %** |
| 23 mm with collars, part pushed fully to one side | ~8 % |

Those are laminar order-of-magnitude estimates from a permeability correlation, not
measurements — which is exactly why the dye-pulse check in §6 is worth the ten minutes. The
eccentric case is the one to care about: it is the difference between a part that is
centred by its own collars and one that sags. If your printed collars end up loose in the
tube, that is not cosmetic.

### 1.2 Your reactor void volume is ~35 mL, not 50 mL

50 mL is the volume of the *empty* 25 × 100 mm tube (49.1 mL). Once a lattice is in it:

| | measured solid | void volume | flow for τ = 2 min | flow for τ = 20 min |
|---|---|---|---|---|
| Gyroid fitted | 13.79 cm³ | **35.3 mL** | 17.7 mL/min | 1.77 mL/min |
| Cross-hatch fitted | 13.72 cm³ | **35.4 mL** | 17.7 mL/min | 1.77 mL/min |
| (the old 50 mL figure) | — | 49.1 mL | 25.0 mL/min | 2.50 mL/min |

Using 50 mL would overstate every residence time by about 39 %. Residence time is one of the
**three** optimizer axes (pH, persulfate dose, residence time — iron mass was fixed after the
baselines), and it gets reported in the paper, so fix it in the spreadsheet before any
optimizer run, not after.

**Corrected number:** the two geometries differ by 0.07 cm³ of solid, not by the ~1 mL the
09-11 version implied. That is arithmetic, not opinion — two parts at the same porosity in
the same envelope must displace nearly the same volume, and the old figures (17.3 g vs 16.4 g
at 0.600 vs 0.597 open) could not both be right. Switching geometry mid-project therefore
does **not** meaningfully change your void volume. It changes wetted area by 47 %, which is
the thing worth caring about.

Best practice is unchanged, and it overrides every number above: **measure it.** Fill the
assembled reactor, lattice in place, from a measuring cylinder and record what it takes. Put
that measured value in `void_volume_mL_measured` and photograph the measurement for the
logbook. `residence_min = void_volume_mL_measured ÷ flow_mL_min`.

---

## 2. Route A — print the supplied STLs (fastest)

### 2.1 Files

Regenerated 2026-09-13 by `lattice_gen.py` (stored alongside this doc) and verified:

- `lattice_gyroid_23x80.stl` — 506,508 triangles
- `lattice_crosshatch_23x80.stl` — 253,496 triangles
- `fit_test_coupon_23x12.stl` — a 12 mm slice of the cross-hatch with both collars
- `lattice_report.json` — every measured number, including the checks below

All three are watertight (zero boundary edges, zero non-manifold edges, zero degenerate
triangles, confirmed by reading the written files back off disk), one connected piece, and
percolating inlet-face to outlet-face. If you regenerate, the script re-runs all of that and
tells you if a part fails.

### 2.2 Print the fit coupon first

The coupon takes a few minutes and 3.0 g. Printing four 80 mm lattices before checking the
fit is how you lose an evening.

1. Print the coupon in the same PETG, on the same printer, at the settings below.
2. Try it in your reactor tube. It should slide with light finger pressure and no
   side-to-side rattle.
3. If it won't go: most FDM printers print outside dimensions 0.1–0.2 mm oversize. Sand the
   collar edges lightly, or set horizontal expansion / XY size compensation to −0.15 mm and
   reprint.
4. If it rattles: your tube's ID is over 25 mm. Regenerate at a larger collar (§4) rather
   than shimming — a rattling part is an eccentric part, and §1.1 is why that matters.
5. Write the measured tube ID and the coupon result in the logbook. It's a real dimension in
   your methods section.

### 2.3 Slicer settings (PETG)

| Setting | Value | Why |
|---|---|---|
| Nozzle / layer | 0.4 mm / 0.20 mm | 0.15 mm for the gyroid if the curves look coarse |
| Nozzle temp | 235–245 °C | your filament's sheet wins over this |
| Bed | 80 °C | |
| Perimeters | 3, with "detect thin walls" on | 1.04 mm wall ≈ 2.6 extrusion widths; you want it solid, not hollow |
| Infill | 100 % | features are thinner than any infill pattern |
| Supports | **none** | both geometries are self-supporting |
| Orientation | cylinder axis vertical | collars give a 24.6 mm disc of bed contact |
| Brim | 5 mm | tall and narrow; it will get knocked otherwise |
| Cooling | 40–60 % | higher than usual PETG — there is bridging in both lattices |
| Print one at a time | yes | PETG strings badly between multiple small parts |

Slice it for a real time estimate; it will be a few hours per lattice, and you need four of
each geometry plus spares, so start them early and let them run in the background while you
do the catalyst work.

### 2.4 Check before you use them

1. Hold each lattice up to a light. The gyroid should glow evenly with no solid blobs; the
   cross-hatch should show 12 clean square channels straight through.
2. Push water through with a syringe. It should pass with light pressure. If a channel is
   blocked by a print blob, clear it with a paperclip or bin the part.
3. Weigh each lattice, bare, on the balance and write the mass on it in permanent marker with
   an ID (`L-01`, `L-02`, …). **This is the tare for your iron loading** — "reweigh the
   lattice; the difference is the iron loading" only works if you have the bare mass per
   individual part, and printed parts vary by a few tenths of a gram.
4. Keep `lattice_id` in the master spreadsheet next to `iron_g`. You will want it when you
   ask whether the catalyst is wearing out, because "is it the iron or is it that particular
   lattice" is a question a judge will ask.

### 2.5 A note on PETG and your chemistry

PETG is the right call over PLA — PLA hydrolyses steadily in warm water and would degrade
over a 23-week project. PETG handles pH 3–9 and persulfate well at room temperature, and
nothing in your protocol goes near its ~70 °C softening point.

It is still worth proving rather than assuming, and it's nearly free: put one spare lattice
in 10 mM persulfate at pH 3 for a week, weigh it before and after, and photograph it. If it's
unchanged, that's a line in your methods that closes off an obvious "how do you know the
reactor isn't contributing?" question. It also guards against a real failure mode — if the
support shed organics it would scavenge radicals and show up as unexplained variance in your
conversion data.

---

## 3. Route B — build it yourself in CAD

Worth doing at least once. If a judge asks how the lattice was designed, "I ran a script" is
a weaker answer than "here's the geometry and here's why."

### 3.1 Cross-hatch in Tinkercad (free, ~20 minutes)

Build it **subtractively** — cutting channels out of a cylinder is far easier than arraying
struts.

1. Drop a **Cylinder**, radius 11.5 mm (diameter 23), height 80 mm, centred at the origin.
2. Drop a **Box**, 3.3 × 3.3 × 100 mm, and switch it to **Hole**. This is one axial channel.
3. Position its centre at x = 3, y = 3 (so the grid straddles the axis), running the full
   height.
4. Select the hole, Ctrl+D to duplicate, move it +6 mm in x. Ctrl+D again — Tinkercad repeats
   the last transform. Repeat until you cross the cylinder. Then select that whole row,
   Ctrl+D, move +6 mm in y, and repeat to fill the circle. Holes that end up entirely outside
   the cylinder do nothing; leave them.
5. Transverse channels: a Box 3.3 × 100 × 3.3 mm as a Hole, centred at z = 3, running through
   in y. Duplicate up the z axis at 6 mm intervals to the top.
6. Repeat step 5 rotated 90° so the channels also run through in x.
7. Select everything and **Group**.
8. Collars: two **Tube** shapes (or a cylinder-minus-cylinder), OD 24.6, ID 21.0, height
   2 mm, one at each end. Group them in as solid.

The channel size and the 6 mm pitch together set the porosity. For an infinite lattice the
open fraction is `3a² − 2a³` where `a` = channel ÷ pitch, which gives 0.599 at a 3.4 mm
channel. **On a finite 23 mm cylinder it does not:** clipping the outer cells at the wall
removes proportionally more strut than channel, so a 3.4 mm channel measures **0.63** open on
the real part, and 3.29 mm is what actually gives 0.600. That gap between the textbook
formula and the part in your hand is a good half-sentence for the poster, and §4 solves it
numerically so you never have to trust the formula.

### 3.2 Cross-hatch in Fusion 360

Same logic, much faster: sketch one 3.3 mm square on the XY plane, **Rectangular Pattern** it
at 6 mm spacing in both directions, **Extrude–Cut** through the cylinder; repeat on the XZ
and YZ planes. Keep the pitch and square size as **user parameters** (`pitch = 6mm`,
`gap = 3.3mm`) so you can re-drive the whole model from two numbers.

### 3.3 Gyroid — the honest situation

A true gyroid is a level set of `sin x·cos y + sin y·cos z + sin z·cos x`, and it isn't
practically drawable in Tinkercad or in Fusion 360's free Personal licence (volumetric
lattice sits behind a paid extension). Realistic options:

- **Use the supplied STL** and the generator in §4. This is the normal way gyroids get made;
  nobody draws them by hand.
- **nTop Education** or **MSLattice** — both free for students, both do TPMS properly.
- **Blender**, free, using a maths-driven surface. Works, but it's a weekend.

### 3.4 Route C — no CAD and no script

Every slicer already contains a gyroid generator: model a plain solid cylinder 23 × 80 mm,
then slice it with **0 perimeters, 0 top and bottom solid layers, and gyroid infill at 40 %**.
What prints is a gyroid lattice cylinder.

Be honest about what you get. The walls are a single extrusion (~0.45 mm, versus 1.04 mm
here), it has no collars, and slicer "40 % infill" is not exactly 40 % solid by volume, so
your porosity is approximate rather than measured. Fine as an emergency spare or a poster
demo piece; not what I'd put run data on.

---

## 4. Route D — regenerate with the script

`lattice_gen.py` builds both geometries as implicit fields, meshes them with marching cubes,
and — the part that matters — **bisects the wall or channel size until the measured open
fraction hits your target**, rather than trusting a nominal number. It then verifies the
result and refuses to hide a bad one.

```bash
python3 lattice_gen.py                                 # 23 mm ⌀, 80 mm, 60 % open
python3 lattice_gen.py --porosity 0.50                 # denser: more iron, more Δp
python3 lattice_gen.py --tube-id 26 --collar-od 25.6   # if your tube isn't 25 mm
python3 lattice_gen.py --hatch-cell 8                  # bigger channels, easier threading
python3 lattice_gen.py --voxel 0.25 --max-triangles 0  # finer, slower, much bigger files
```

Needs `numpy`, `scipy`, `scikit-image`. It writes the STLs plus `lattice_report.json`.

For each part it checks that the mesh is **watertight** (every edge shared by exactly two
triangles, zero boundary edges); that the solid is **one connected piece** (no floating
islands that fail mid-print); and that the pore space **runs clear from inlet face to outlet
face**, with the dead-end fraction reported. Both lattices pass all three with dead-end pore
volume under 0.02 %.

Keep that last check if you modify anything. A lattice with isolated pores traps air on first
fill, and trapped air is a slowly changing void volume — your residence time would drift
during a run in a way nothing in the spreadsheet records.

Two things the script does that are worth knowing about:

- **Porosity is measured sub-voxel**, from the field rather than from a voxel count. A hard
  voxel threshold quantises porosity in steps of several percent at any practical resolution,
  which stalls the bisection well short of the target and then reports a number the printed
  part does not have. This is how the 09-11 figures drifted.
- **The default 0.4 mm voxel is not a coarse approximation.** The fields are analytic, so
  marching cubes interpolates the true surface; every measured quantity agrees to under 1 %
  with a 0.18 mm run, at a sixth of the file size.

If you regenerate, **re-measure the void volume and re-weigh the parts.** Don't carry old
numbers over.

---

## 5. Loading the catalyst onto these specific lattices

### 5.1 Option 1, steel wool → use the cross-hatch

The straight channels give **107.5 mm² of measured clear cross-section** and about 8.0 cm³ of
channel volume over the 76 mm working length. (The nominal 12 × 3.29 mm squares would be
130 mm²; the difference is the channels the cylinder wall clips.)

At the 2 g upper bound, 2 g of steel wool is 255 mm³ of actual steel. Loose wool packs at
roughly 10 % of solid density, so 2 g realistically occupies around 2.5 cm³ — roughly
**a third of the channel volume**. That works, but it is the practical ceiling: much more and
you are forcing it, packing unevenly, and adding pressure drop your pump may not deliver
against. At the 0.1 g lower bound you are at about 1.5 %, a very thin thread per channel —
expect that end of the range to be hard to load reproducibly.

Practical method: cut 12 equal lengths, weigh the bundle, thread one per channel with tweezers
or a bent paperclip, and reweigh the lattice. If the mass lands outside ±5 % of target, redo
it — don't just record the actual and move on, because that value was chosen deliberately.

**Write down which channels you filled.** At 0.1 g you will be tempted to fill only some.
That changes the flow distribution, not just the iron mass, and it is exactly the kind of
uncontrolled variable that produces an unreproducible outlier at run 30.

### 5.2 Option 2, alginate + iron oxide → use the gyroid

Loading per unit area, over the 0.1–2.0 g range:

| | 0.1 g | 2.0 g |
|---|---|---|
| Gyroid (265 cm²) | 0.38 mg/cm² | 7.5 mg/cm² |
| Cross-hatch (180 cm²) | 0.55 mg/cm² | 11.1 mg/cm² |

7.5 mg/cm² is already a thick alginate-bound coat. **11.1 mg/cm² on the cross-hatch is likely
past what a single dip will hold** — expect flaking, and flaked oxide travelling downstream is
both lost catalyst and a contaminated sample. So if you go with option 2, the gyroid isn't
just better, it's close to necessary at the top of the iron range.

Either way, run the leaching test before committing. If you can't hold 2 g without shedding,
the honest move is to narrow the iron range and say why in the methods — a stated, justified
bound is a strength; an unstated one that quietly breaks is a finding you'll have to explain.

---

## 6. What this doesn't tell you

Stated plainly so none of it surprises you at judging:

- **Porosity is geometric, measured on the model — not hydraulic.** It says nothing about
  pressure drop or flow uniformity. Your 12 V pump may or may not push your target flow
  through the gyroid; find that out before you design runs around it.
- **The bypass fractions in §1.1 are estimates, not measurements.** They come from a
  permeability correlation and a slit-flow model, both laminar, both assuming a clean
  concentric fit.
- **Flow distribution across the face is unverified.** The collars stop bypass around the
  outside; they do not guarantee even flow through all 12 channels or through every region of
  the gyroid. A dye pulse (food colouring, phone video) is a cheap and convincing check, and
  it is the one that would catch an eccentric part.
- **The gyroid's pore space is two separate interpenetrating networks.** This is a real
  property of the geometry, not a defect — the measured mesh confirms both percolate end to
  end and together leave under 0.02 % dead volume. But water in one network never mixes with
  water in the other along the length of the reactor. If you use the gyroid, don't claim
  lateral mixing you don't have.
- **The wetted-area figures are the geometric area of the printed surface.** Actual catalytic
  surface area after coating is a different and much larger number, and only BET would give
  it to you. Don't let 265 cm² drift into the writeup as "catalyst surface area."
- **60 % open was inherited, not derived.** It is a reasonable starting point. If pressure
  drop turns out fine, denser (50 %) gives more iron and more contact area for free — and
  with four orders of magnitude of pumping headroom, that is still an open decision.
- **Both geometries were chosen by argument, not experiment** — that's what the baseline
  comparison is for.

---

## 7. Ready-to-paste spreadsheet additions

`lattice_id` · `lattice_geometry` (gyroid / crosshatch) · `lattice_bare_mass_g` ·
`void_volume_mL_measured` · `channels_loaded` (cross-hatch only)

`residence_min` is computed from `void_volume_mL_measured ÷ flow_mL_min` — **never** from a
nominal figure.

---

## 8. What changed on 2026-09-13

The geometry was regenerated from scratch and every number re-measured from the mesh. Four
figures in the 09-11 version were wrong:

| Was | Is | Why it was wrong |
|---|---|---|
| Annulus at the collar 1.5 mm² | **15.6 mm²** | arithmetic slip of 10×; π/4 × (25² − 24.6²) = 15.6 |
| Cross-hatch 16.4 g, 36.2 mL void, 0.597 open | **17.4 g, 35.4 mL, 0.601** | the old set was internally impossible — equal porosity in an equal envelope must give equal volume |
| Cross-hatch channel 3.4 mm at 60 % open | **3.29 mm** | 3.4 mm is the infinite-lattice answer; on a clipped 23 mm cylinder it measures 0.63 open |
| Gyroid line-of-sight 16 mm² | **10.7 mm²** | re-measured, column by column, through the finished part |

Unchanged and re-confirmed: gyroid wall 1.04 mm, gyroid 265 cm² wetted, 17.5 g, void volume
~35 mL for both, and the whole of §1.1's bypass argument. Cross-references were also fixed —
this doc previously pointed at `experimental-procedure.md`, which was deleted on 09-13, and
quoted a four-axis optimizer and a 27-week project, both superseded on 09-12.
