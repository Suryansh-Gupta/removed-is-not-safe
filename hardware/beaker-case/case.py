"""Light-tight case for the 500 mL batch reactor beaker. Parametric CAD (CadQuery).

Replaces the foil wrap. Five printed parts:

  sleeve      PLA (black)  bottomless tube with a diagrid of helical ribs. Lifts off over the beaker.
  lid         PLA (black)  cap with a skirt that overlaps the sleeve, three ports with light-baffle chimneys.
  base_ring   TPU          sits on the stir plate, centres the beaker and the sleeve, seals light at the bottom.
  plug_*      TPU          port plugs: solid (dosing), small bore (sampling tube), large bore (thermometer).
  vial_rack   PLA          five vials in sampling order, times embossed.

Design rules that come from the experiment, not from looks:
  * Nothing printed touches the water. Glass barely uses chlorine; plastics may. Chimneys stop above the water line.
  * The beaker stands directly on the stir plate (no printed floor), so the stir bar couples as usual.
  * Light path is blocked by overlaps, not by a tight fit: lid skirt over sleeve, sleeve in the ring's groove,
    plugs in chimneys. Whether it is dark enough for cipro is something to TEST (see README).
  * Stir plate heat stays off: PLA softens near 55 C.

EVERY DIMENSION UNDER "MEASURE" IS A NOMINAL CATALOGUE VALUE. Measure your own beaker, tubing, thermometer and
vials with calipers, edit the numbers, and re-run:   ../.venv/bin/python case.py
"""
from dataclasses import dataclass
import math
import pathlib

import cadquery as cq

OUT = pathlib.Path(__file__).parent / "out"


@dataclass
class P:
    # ---- MEASURE (nominal 500 mL low-form Griffin beaker; brands differ by a few mm)
    beaker_od: float = 85.0        # body outside diameter
    rim_od: float = 90.0           # widest point of the flared rim, not counting the spout
    spout_extra: float = 6.0       # how far the spout sticks out past the rim
    beaker_h: float = 120.0        # plate to rim
    water_line: float = 105.0      # plate to water surface when filled (500 mL sits roughly here; check)
    sample_tube_od: float = 3.2    # tubing on the sampling syringe
    thermo_od: float = 6.5         # thermometer stem
    vial_od: float = 15.0          # UNDECIDED in the protocol (2 mL vials are ~12 mm, 4 mL ~15 mm)
    vial_depth: float = 16.0

    # ---- design
    wall: float = 2.4              # 6 perimeters at 0.4 mm: opaque in black PLA
    gap: float = 0.4               # sliding fit between printed parts
    headroom: float = 8.0          # rim to underside of lid
    rib_n: int = 14                # ribs per direction
    rib_depth: float = 3.4
    rib_width: float = 3.2
    rib_twist: float = 80.0        # degrees over the ribbed height
    skirt_h: float = 14.0          # lid overlap on the sleeve
    lid_t: float = 3.0
    port_bore: float = 12.0
    port_r: float = 25.0           # port centres from the axis
    chimney_h: float = 10.0        # light baffle below the lid
    ring_floor: float = 1.2
    ring_wall_h: float = 7.0

    # ---- derived
    @property
    def sleeve_ir(self): return self.rim_od / 2 + self.spout_extra + 1.0
    @property
    def sleeve_or(self): return self.sleeve_ir + self.wall
    @property
    def sleeve_z0(self): return self.ring_floor
    @property
    def sleeve_h(self): return self.beaker_h + self.headroom - self.sleeve_z0
    @property
    def lid_z(self): return self.beaker_h + self.headroom            # underside of the lid plate


def _ring(r_in, r_out, z0, z1):
    return cq.Workplane("XY").workplane(offset=z0).circle(r_out).circle(r_in).extrude(z1 - z0)


def sleeve(p: P):
    h = p.sleeve_h
    body = _ring(p.sleeve_ir, p.sleeve_or, 0, h)

    # Ribbed band: plain collar below (goes into the base ring) and above (the lid skirt slides over it).
    z_lo, z_hi = p.ring_wall_h + 5.0, h - p.skirt_h - 4.0
    d, r0 = p.rib_depth, p.sleeve_or

    def collar(z):   # 45 degree underside so it prints without support
        prof = cq.Workplane("XZ").polyline([(r0 - 0.2, z), (r0 + d, z + d), (r0 + d, z + d + 2.0), (r0 - 0.2, z + d + 2.0)]).close()
        return prof.revolve(360, (0, 0, 0), (0, 1, 0))

    body = body.union(collar(z_lo)).union(collar(z_hi - d - 2.0))

    rz0, rz1 = z_lo + d, z_hi - 2.0
    # Two sets of helical ribs, one left-handed and one right-handed, cross to make the diagrid.
    rr, hh = r0 + d / 2 - 0.3, rz1 - rz0
    for left in (False, True):
        path = cq.Wire.makeHelix(hh * 360.0 / p.rib_twist, hh, rr, lefthand=left)
        rib = cq.Workplane("XZ").center(rr, 0).rect(d + 0.6, p.rib_width).sweep(cq.Workplane(obj=path), isFrenet=True)
        rib = rib.translate((0, 0, rz0))
        for i in range(p.rib_n):
            body = body.union(rib.rotate((0, 0, 0), (0, 0, 1), i * 360.0 / p.rib_n))

    # Engraved index mark: lines up with the lid's mark so the spout side is always known.
    mark = cq.Workplane("XY").workplane(offset=h - 9).center(r0, 0).rect(1.2, 3.0).extrude(9)
    return body.cut(mark)


def lid(p: P):
    """Modelled as it sits on the case (plate on top). Print it flipped: flat top on the bed, no supports."""
    r_skirt_in = p.sleeve_or + p.gap
    r_out = r_skirt_in + p.wall
    plate = cq.Workplane("XY").circle(r_out).extrude(p.lid_t)                       # z 0..lid_t
    skirt = _ring(r_skirt_in, r_out, -p.skirt_h, 0)
    # inner locating lip: drops inside the sleeve, second turn of the light labyrinth
    lip = _ring(p.sleeve_ir - p.gap - 1.6, p.sleeve_ir - p.gap, -6.0, 0)
    body = plate.union(skirt).union(lip)

    # grip scallops around the skirt
    n = 24
    cutters = (cq.Workplane("XY").workplane(offset=-p.skirt_h - 1)
               .polarArray(r_out + 2.6, 0, 360, n).circle(4.0).extrude(p.skirt_h + p.lid_t + 2))
    body = body.cut(cutters)

    angles = {"S": 90, "D": 210, "T": 330}
    for label, a in angles.items():
        x, y = p.port_r * math.cos(math.radians(a)), p.port_r * math.sin(math.radians(a))
        chim = (cq.Workplane("XY").workplane(offset=-p.chimney_h).center(x, y)
                .circle(p.port_bore / 2 + 2.0).extrude(p.chimney_h))
        body = body.union(chim)
    for label, a in angles.items():
        x, y = p.port_r * math.cos(math.radians(a)), p.port_r * math.sin(math.radians(a))
        bore = (cq.Workplane("XY").workplane(offset=-p.chimney_h - 1).center(x, y)
                .circle(p.port_bore / 2).extrude(p.chimney_h + p.lid_t + 2))
        seat = (cq.Workplane("XY").workplane(offset=p.lid_t - 1.0).center(x, y)
                .circle(p.port_bore / 2 + 3.4).extrude(1.2))                         # recess for the plug flange
        body = body.cut(bore).cut(seat)
        lx, ly = (p.port_r + 15.5) * math.cos(math.radians(a)), (p.port_r + 15.5) * math.sin(math.radians(a))
        txt = (cq.Workplane("XY").workplane(offset=p.lid_t - 0.6).center(lx, ly)
               .transformed(rotate=(0, 0, a - 90)).text(label, 7.5, 0.8, kind="bold"))
        body = body.cut(txt)

    # two shallow rings and a spout-side index mark, engraved
    for r in (p.port_r - 12.5, r_out - 6.0):
        body = body.cut(_ring(r, r + 0.8, p.lid_t - 0.5, p.lid_t + 0.1))
    mark = cq.Workplane("XY").workplane(offset=p.lid_t - 0.6).center(r_out - 3.2, 0).rect(4.0, 1.2).extrude(0.8)
    title = (cq.Workplane("XY").workplane(offset=p.lid_t - 0.6).text("CMBR 500", 6.0, 0.8, kind="bold"))
    return body.cut(mark).cut(title)


def base_ring(p: P):
    rb = p.beaker_od / 2 + 0.2
    ro = p.sleeve_or + p.gap + p.wall
    f, hw = p.ring_floor, p.ring_wall_h
    pts_sets = [
        [(rb, 0), (ro, 0), (ro, f), (rb, f)],                                           # floor
        [(rb, 0), (rb + 2.4, 0), (rb + 2.4, hw + 1.0), (rb + 0.8, hw + 1.0), (rb, hw)],  # bumper around the beaker foot
        [(p.sleeve_ir - p.gap - 2.0, 0), (p.sleeve_ir - p.gap, 0), (p.sleeve_ir - p.gap, hw), (p.sleeve_ir - p.gap - 2.0, hw)],
        [(p.sleeve_or + p.gap, 0), (ro, 0), (ro, hw), (p.sleeve_or + p.gap, hw)],        # outer wall
    ]
    body = None
    for pts in pts_sets:
        part = cq.Workplane("XZ").polyline(pts).close().revolve(360, (0, 0, 0), (0, 1, 0))
        body = part if body is None else body.union(part)
    return body


def plug(p: P, bore: float = 0.0):
    """TPU port plug. Print flange-down."""
    stem_r = p.port_bore / 2 + 0.15                     # light squeeze; TPU gives
    body = cq.Workplane("XY").circle(p.port_bore / 2 + 3.0).extrude(2.0)                  # flange
    body = body.union(cq.Workplane("XY").workplane(offset=2.0).circle(stem_r).extrude(p.chimney_h - 1.0))
    for z in (5.0, 8.0):                                # two sealing ridges
        ridge = cq.Workplane("XZ").polyline([(stem_r - 0.1, z), (stem_r + 0.45, z + 0.6), (stem_r - 0.1, z + 1.6)]).close()
        body = body.union(ridge.revolve(360, (0, 0, 0), (0, 1, 0)))
    if bore > 0:
        body = body.cut(cq.Workplane("XY").workplane(offset=-1).circle(bore / 2 - 0.2).extrude(p.chimney_h + 4))
    else:                                               # pull tab on the solid plug
        tab = cq.Workplane("XY").workplane(offset=0).center(p.port_bore / 2 + 5.0, 0).rect(8.0, 7.0).extrude(2.0)
        body = body.union(tab)
    return body


def vial_rack(p: P):
    times = ["0", "7.5", "15", "22.5", "30"]
    pitch, depth, height = p.vial_od + 9.0, p.vial_od + 22.0, p.vial_depth + 5.0
    length = pitch * len(times) + 8.0
    body = cq.Workplane("XY").box(length, depth, height, centered=(True, True, False)).edges("|Z").chamfer(3.0)
    body = body.faces(">Z").edges().chamfer(1.0)
    for i, t in enumerate(times):
        x = (i - 2) * pitch
        hole = cq.Workplane("XY").workplane(offset=height - p.vial_depth).center(x, 5.0).circle(p.vial_od / 2 + 0.35).extrude(p.vial_depth + 1)
        body = body.cut(hole)
        txt = cq.Workplane("XY").workplane(offset=height - 0.01).center(x, -depth / 2 + 6.5).text(t, 6.5, 0.8, kind="bold")
        body = body.union(txt)
    # the diagrid motif from the sleeve, engraved along the front face
    for i in range(-9, 10):
        for s in (+1, -1):
            cut = (cq.Workplane("XZ").workplane(offset=depth / 2 - 0.6).center(i * 8.0, height / 2 - 1.5)
                   .transformed(rotate=(0, 0, s * 35)).rect(1.2, height * 1.6).extrude(1.2))
            body = body.cut(cut)
    floor = cq.Workplane("XY").box(length, depth, 2.4, centered=(True, True, False)).edges("|Z").chamfer(3.0)
    return body.union(floor)


def check(p: P):
    """Fit rules. A failed rule means the numbers above describe a case that will not work."""
    rules = {
        "spout clears the sleeve": p.sleeve_ir >= p.rim_od / 2 + p.spout_extra + 0.5,
        "chimneys stay above the water": p.lid_z - p.chimney_h >= p.water_line + 8.0,
        "ports open inside the beaker mouth": p.port_r + p.port_bore / 2 + 2.0 <= p.beaker_od / 2 - 6.0,
        "locating lip clears the spout": p.sleeve_ir - p.gap - 1.6 >= p.rim_od / 2 + p.spout_extra - 0.5 or p.lid_z - 6.0 >= p.beaker_h + 1.0,
        "ring bumper clears the sleeve groove": p.beaker_od / 2 + 0.2 + 2.4 <= p.sleeve_ir - p.gap - 2.0 - 0.5,
        "fits a 180 mm bed (A1 mini)": 2 * (p.sleeve_or + p.gap + p.wall + 0.5) <= 180 and p.sleeve_h <= 180,
        "sample tube fits its plug": p.sample_tube_od < p.port_bore - 3.0,
        "thermometer fits its plug": p.thermo_od < p.port_bore - 3.0,
    }
    return rules


def build(p: P = P()):
    return {
        "sleeve_PLA": sleeve(p),
        "lid_PLA": lid(p),
        "base_ring_TPU": base_ring(p),
        "plug_solid_TPU": plug(p, 0.0),
        "plug_sample_TPU": plug(p, p.sample_tube_od),
        "plug_thermo_TPU": plug(p, p.thermo_od),
        "vial_rack_PLA": vial_rack(p),
    }


def assembly(p: P, parts):
    a = cq.Assembly(name="beaker_case")
    black, grey, glass = cq.Color(0.08, 0.09, 0.10), cq.Color(0.55, 0.58, 0.60), cq.Color(0.7, 0.85, 0.95, 0.35)
    beaker = _ring(p.beaker_od / 2 - 2.0, p.beaker_od / 2, 0, p.beaker_h).union(cq.Workplane("XY").circle(p.beaker_od / 2).extrude(2.5))
    a.add(beaker, name="beaker_reference", color=glass)
    a.add(parts["base_ring_TPU"], name="base_ring", color=grey)
    a.add(parts["sleeve_PLA"], name="sleeve", loc=cq.Location((0, 0, p.sleeve_z0)), color=black)
    a.add(parts["lid_PLA"], name="lid", loc=cq.Location((0, 0, p.lid_z)), color=black)
    for name, ang in (("plug_sample_TPU", 90), ("plug_solid_TPU", 210), ("plug_thermo_TPU", 330)):
        x, y = p.port_r * math.cos(math.radians(ang)), p.port_r * math.sin(math.radians(ang))
        # plugs are modelled flange-down for printing; flip them into the ports
        a.add(parts[name], name=name, loc=cq.Location((x, y, p.lid_z + p.lid_t + 1.0), (1, 0, 0), 180), color=grey)
    return a


if __name__ == "__main__":
    p = P()
    rules = check(p)
    for k, ok in rules.items():
        print(("ok   " if ok else "FAIL ") + k)
    parts = build(p)
    OUT.mkdir(exist_ok=True)
    print(f"\n{'part':18} {'x':>7} {'y':>7} {'z':>7}  {'cm3':>6}  solids valid")
    for name, wp in parts.items():
        shape = wp.val()
        bb = shape.BoundingBox()
        print(f"{name:18} {bb.xlen:7.1f} {bb.ylen:7.1f} {bb.zlen:7.1f}  {shape.Volume() / 1000:6.1f}  {len(wp.solids().vals()):6d} {shape.isValid()}")
        cq.exporters.export(wp, str(OUT / f"{name}.step"))
        cq.exporters.export(wp, str(OUT / f"{name}.stl"), tolerance=0.02, angularTolerance=0.15)
    # the lid, flipped the way it prints
    flipped = parts["lid_PLA"].rotate((0, 0, 0), (1, 0, 0), 180)
    cq.exporters.export(flipped, str(OUT / "lid_PLA_print_orientation.stl"), tolerance=0.02, angularTolerance=0.15)
    asm = assembly(p, parts)
    asm.save(str(OUT / "assembly.step"))
    cq.exporters.export(asm.toCompound(), str(OUT / "assembly.stl"), tolerance=0.05, angularTolerance=0.2)
    import json
    (OUT / "params.json").write_text(json.dumps({k: getattr(p, k) for k in
        ("beaker_od", "beaker_h", "sleeve_z0", "lid_z", "lid_t", "port_r")}, indent=1))
    if not all(rules.values()):
        raise SystemExit("A fit rule failed. Fix the dimensions before printing.")
    print(f"\nWrote STEP + STL to {OUT}")
