# Reactor findings and open decisions

Captured 2026-09-12, from the lattice design session. Companion to `claude/lattice-build-guide.md`.

**Read this before Week 4.** Three of the five findings below change how runs are set up or measured, and all three are cheap to act on now and expensive after Week 10.

---

## 1. Terminology — it is not a filter

The device does not separate or trap anything. Channels are 3.4 mm; the antibiotic molecule is roughly a nanometre. Every molecule that enters leaves. The antibiotic is **destroyed** into fragments that flow out with the water.

Correct terms: *advanced oxidation*, *flow reactor*, *catalyst support* (the lattice). Avoid "filter" and "filtration" everywhere — poster, abstract, talk, spreadsheet headers.

This matters beyond vocabulary. A filter has no toxicity question, because the drug leaves intact and captured. Destruction produces fragments nobody has characterised, and whether those fragments are safe is the project's entire hypothesis. Describing it as filtration describes a project without a hypothesis.

---

## 2. Findings

### 2.1 Bypass around the lattice — FIXED

A 20 mm lattice in a 25 mm bore leaves an annulus of 176.7 mm², against 188.5 mm² of open lattice face. The annulus is smooth-walled and lower-resistance, so ≥48 % of flow would bypass the iron. Consequences would have been an inflated apparent residence time, a compressed iron-loading effect in the Week 16 SHAP analysis, and a bypass fraction that rises with flow — aliasing into the residence-time axis.

**Resolution:** 23 mm core with integral 2 mm collar rings at 24.6 mm OD. Annular leak path drops from 176.7 mm² to about 1.5 mm².

### 2.2 Reactor void volume — FIXED

`team-roadmap-v2.md` Week 4 uses "reactor volume (~50 mL)". That is the empty tube (49.1 mL). With the lattice fitted the void is **35.4 mL** (gyroid) or **36.2 mL** (cross-hatch). Residence times computed from 50 mL are ~41 % too high.

**Action:** measure it directly with the lattice fitted, record as `void_volume_mL_measured`, and compute `residence_min` from that.

### 2.3 Recirculation starves the batch at low flow — OPEN

The loop recirculates a 500 mL batch (inferred from persulfate dosing: 1.19 g Na₂S₂O₈ per 500 mL = 10 mM) for 30 minutes.

| Residence | Flow | Pumped in 30 min | Batch turnovers | Max removal if reactor is perfect |
|---|---|---|---|---|
| 2 min | 17.7 mL/min | 531 mL | 1.06 | 65 % |
| 5 min | 7.1 mL/min | 212 mL | 0.42 | 35 % |
| 10 min | 3.5 mL/min | 106 mL | 0.21 | 19 % |
| 20 min | 1.8 mL/min | 53 mL | 0.11 | 10 % |

At 20 min residence, 90 % of the batch never enters the reactor during the run.

**Why this is dangerous:** the ceiling on measured removal moves 6.5-fold across the residence axis for purely hydraulic reasons. The optimizer would discover that short residence times give high removal, which looks like a chemistry result and is not. It also contaminates the toxicity axis, since radish dishes are set up from the same reservoir samples — low-flow runs would read as both less effective and less toxic through dilution alone.

**Options:** (a) move the sampling tap to the reactor outlet and measure single-pass conversion — cleanest, independent of batch size and run length, but redefines "removal %"; (b) shrink the batch to ~150 mL; (c) run to fixed throughput rather than fixed time — cleanest comparison, but low-flow runs take hours.

### 2.4 Mass-transfer limitation — OPEN

Reynolds number in the lattice is **0.3 to 7** across the whole operating range. Creeping, laminar flow with no turbulent mixing, so molecules reach the iron only by molecular diffusion.

Diffusive penetration in one pass versus the distance that must be crossed (D assumed 5×10⁻¹⁰ m²/s for a ~450 Da molecule):

| | penetration/pass | half-gap | stream reaching iron |
|---|---|---|---|
| Cross-hatch, 2 min | 0.19 mm | 1.70 mm | ≤ 11 % |
| Gyroid, 2 min | 0.26 mm | 1.25 mm | ≤ 21 % |
| Gyroid, 20 min | 0.82 mm | 1.25 mm | ≤ 66 % |
| Channel packed with steel wool | 0.19 mm | ~0.15 mm | fully contacted |

**Consequences.** Steel wool is mechanistically favoured over a bare dip-coated channel, because the fibres shrink the diffusion distance into the range that works. This is a falsifiable prediction testable in Week 6 at equal iron mass. The gyroid also beats the cross-hatch here, independently of its surface-area advantage.

**Caveats:** D is estimated from molecular weight, not looked up for the specific antibiotic; the penetration argument is order-of-magnitude; transverse struts induce some cross-flow; even flow distribution across the face is assumed and unverified.

### 2.5 Pressure drop is negligible — OPPORTUNITY

0.04–0.43 Pa across the lattice (about 0.04 mm of water), by both square-duct and Kozeny–Carman estimates. The pump will not notice the lattice.

The 60 % porosity was inherited from the roadmap, not derived. With four orders of magnitude of pumping headroom, a denser lattice — finer features, more surface area, more iron, shorter diffusion distances — costs nothing hydraulically. Worth revisiting.

---

## 3. Decision on simulation

**Do the cheap physics; skip CFD.** Order-of-magnitude and dimensionless analysis found §2.1, §2.3, §2.4 and §2.5 in about an hour of arithmetic. 3D CFD would take 30–40 hours to reproduce §2.4 and nothing else — creeping flow through a periodic structure is the most predictable regime in fluid mechanics, and meshing a gyroid is unpleasant.

Unvalidated CFD is also a liability at judging: the first judge who has run it asks about mesh independence and boundary conditions.

**Do instead:** a dye-pulse residence time distribution test. Inject food colouring, film on a phone, time the washout. One afternoon, real hardware, and it validates or kills the model above. Measured beats simulated at a fair.

Revisit CFD only in Phase 5, only if there is spare time, and only with dye data to validate against.

---

## 4. Open decisions

| Decision | Deadline | Notes |
|---|---|---|
| Sampling point: reservoir or reactor outlet | Week 4 | Determines what "removal %" means; §2.3 |
| Batch volume: 500 mL or ~150 mL | Week 4 | §2.3 |
| Porosity: keep 60 % or go denser | Before printing the final set | §2.5 |
| Update `team-roadmap-v2.md` and `experimental-procedure.md` | Before Partner B starts Week 4 | Both still carry the 20 mm lattice and the 50 mL formula |

---

## 5. Spreadsheet additions

`lattice_id` · `lattice_geometry` · `lattice_bare_mass_g` · `void_volume_mL_measured` · `channels_loaded`

`residence_min` must be computed from `void_volume_mL_measured ÷ flow_mL_min`, not from the 50 mL figure in the Week 4 notes.
