"""Working tabletop model of a chlorine contact basin. Fully 3D printed. Parametric CAD (CadQuery).

What it shows, with real water: why a plant's contact basin has baffles. Water runs from a head tank through a
serpentine basin, over a weir into a dechlorination cell, and out a spout into a receiving tray. A drop of food dye at
the "NaOCl" port is the tracer. With the baffle insert in, the dye takes the long way round and arrives late and
together (close to plug flow). Lift the insert out and the same tank short-circuits: dye reaches the weir in seconds.
The time water really spends in the basin is the T in CT, the number disinfection rules are written in.

Parts
  tank          PLA  the basin: contact zone, fixed weir, dechlorination cell, outfall spout
  insert        PLA  7 baffles on a frame; drops in, lifts out
  head_tank     PLA  sits over the inlet; a 2 mm orifice meters the flow; a separate tube is the dye port
  tray          PLA  receiving water. The tank stands inside it on four posts; it catches everything
  post_cap      TPU  x4, non-slip caps on the posts

All numbers are in mm unless they say otherwise. Run:  ../.venv/bin/python reactor.py   then   audit.py
"""
from dataclasses import dataclass
import json
import math
import pathlib

import cadquery as cq

OUT = pathlib.Path(__file__).parent / "out"


@dataclass
class P:
    t: float = 2.4               # wall and floor thickness (6 lines of a 0.4 mm nozzle: holds water)
    # ---- tank (its own coordinates: x along the flow train, y across, z up from the tank's underside)
    tank_l: float = 150.0
    tank_w: float = 110.0
    wall_h: float = 26.0         # wall height above the tank floor
    n_pass: int = 8              # passes in the contact zone (so n_pass - 1 baffles)
    baffle_t: float = 2.0
    weir_h: float = 12.0         # weir crest above the tank floor: sets the water depth in the contact zone
    dechlor_l: float = 16.0      # length of the dechlorination cell
    notch_w: float = 12.0        # outfall notch width
    notch_h: float = 8.0         # outfall notch sill above the tank floor
    spout: float = 8.0           # how far the spout sticks out
    # ---- insert
    fit: float = 0.3             # gap between a baffle and the floor / the wall it reaches
    rail_w: float = 6.0
    rail_t: float = 2.0
    # ---- tray
    tray_l: float = 176.0
    side_gap: float = 0.6        # tank to tray wall, each side
    end_gap: float = 0.4         # tank to the tray's inlet-end wall
    post_h: float = 20.0
    post_d: float = 10.0
    cap_top: float = 2.0         # TPU thickness between post and tank
    # ---- head tank
    head_l: float = 26.0         # along x
    head_depth: float = 80.0     # inside depth
    fill: float = 60.0           # fill line above the head tank floor = the head on the orifice
    orifice_d: float = 2.0
    dose_id: float = 6.0         # dye port tube, inside diameter
    lip: float = 8.0             # locating lips that straddle the tray
    lip_gap: float = 0.5
    lip_x0: float = 6.0          # the lips run from here ...
    lip_x1: float = 20.0         # ... to here; ribs on the tray's outside walls trap them so the head tank cannot slide

    # ---- derived: tank
    @property
    def in_x0(self): return self.t
    @property
    def in_x1(self): return self.tank_l - self.t
    @property
    def in_y0(self): return self.t
    @property
    def in_y1(self): return self.tank_w - self.t
    @property
    def contact_l(self): return (self.in_x1 - self.in_x0) - self.t - self.dechlor_l          # inlet wall to weir
    @property
    def pass_w(self): return (self.contact_l - (self.n_pass - 1) * self.baffle_t) / self.n_pass
    @property
    def weir_x0(self): return self.in_x0 + self.contact_l
    @property
    def tank_h(self): return self.t + self.wall_h

    def baffle_x0(self, k):      # k = 1 .. n_pass - 1
        return self.in_x0 + k * self.pass_w + (k - 1) * self.baffle_t

    # ---- derived: tray (tray coordinates: the tank sits at (tank_x, tank_y, tank_z))
    @property
    def tray_w(self): return self.tank_w + 2 * self.side_gap + 2 * self.t
    @property
    def tank_x(self): return self.t + self.end_gap
    @property
    def tank_y(self): return self.t + self.side_gap
    @property
    def tank_z(self): return self.t + self.post_h + self.cap_top
    @property
    def tray_h(self): return self.tank_z + self.tank_h              # tray rim level with the tank rim
    # ---- derived: head tank
    @property
    def head_w(self): return self.tray_w + 2 * (self.lip_gap + self.t)
    @property
    def orifice_xy(self):        # in tank coordinates: middle of pass 1, near the y-min wall where pass 1 starts
        return (self.in_x0 + self.pass_w / 2, self.in_y0 + 12.0)
    @property
    def dose_xy(self): return (self.in_x0 + self.pass_w / 2, self.in_y0 + 30.0)


def box(x0, x1, y0, y1, z0, z1):
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0, centered=False).translate((x0, y0, z0))


def tank(p: P):
    body = box(0, p.tank_l, 0, p.tank_w, 0, p.tank_h)
    body = body.cut(box(p.in_x0, p.in_x1, p.in_y0, p.in_y1, p.t, p.tank_h + 1))
    body = body.union(box(p.weir_x0, p.weir_x0 + p.t, p.in_y0, p.in_y1, p.t, p.t + p.weir_h))          # weir
    # outfall spout: a chute outside the end wall with a 45 degree underside, so it prints without support
    yc, sill = p.tank_w / 2, p.t + p.notch_h
    w_out = p.notch_w + 2 * 1.6
    prof = [(p.tank_l - 0.01, sill), (p.tank_l + p.spout, sill), (p.tank_l + p.spout, sill - 1.6), (p.tank_l - 0.01, sill - 1.6 - p.spout)]
    chute = cq.Workplane("XZ").polyline(prof).close().extrude(w_out).translate((0, yc + w_out / 2, 0))
    cheek_prof = [(p.tank_l - 0.01, sill + 6.0), (p.tank_l + p.spout, sill + 2.0), (p.tank_l + p.spout, sill - 1.6), (p.tank_l - 0.01, sill - 1.6 - p.spout)]
    for y in (yc - w_out / 2, yc + p.notch_w / 2):
        body = body.union(cq.Workplane("XZ").polyline(cheek_prof).close().extrude(1.6).translate((0, y + 1.6, 0)))
    body = body.union(chute)
    body = body.cut(box(p.in_x1 - 0.5, p.tank_l + 0.5, yc - p.notch_w / 2, yc + p.notch_w / 2, sill, p.tank_h + 1))  # the notch
    # flow arrows engraved in the floor of each pass (0.5 mm deep), alternating direction
    for k in range(p.n_pass):
        xc = p.in_x0 + k * (p.pass_w + p.baffle_t) + p.pass_w / 2
        d = 1 if k % 2 == 0 else -1
        ym = p.tank_w / 2
        shaft = box(xc - 0.6, xc + 0.6, ym - 14, ym + 14, p.t - 0.5, p.t + 0.1)
        head = (cq.Workplane("XY").polyline([(xc - 3.0, ym + d * 9), (xc + 3.0, ym + d * 9), (xc, ym + d * 15)]).close()
                .extrude(0.6).translate((0, 0, p.t - 0.5)))
        body = body.cut(shaft).cut(head)
    return body


def insert(p: P):
    """Baffle insert in tank coordinates (frame on the tank rim, baffles hanging down). Print it upside down."""
    z_top = p.tank_h
    x_end = p.weir_x0 + p.t
    body = box(0, x_end, 0, p.rail_w, z_top, z_top + p.rail_t)                                   # rail, y-min side
    body = body.union(box(0, x_end, p.tank_w - p.rail_w, p.tank_w, z_top, z_top + p.rail_t))     # rail, y-max side
    body = body.union(box(x_end - p.rail_w, x_end, 0, p.tank_w, z_top, z_top + p.rail_t))        # cross bar over the weir
    spine_y = p.tank_w / 2
    body = body.union(box(p.baffle_x0(1), x_end, spine_y - 3, spine_y + 3, z_top, z_top + p.rail_t))   # spine ties the baffles
    for k in range(1, p.n_pass):
        x0 = p.baffle_x0(k)
        if k % 2 == 1:          # reaches the y-min wall, leaves the turn open at y-max
            y0, y1 = p.in_y0 + p.fit, p.in_y1 - p.pass_w
            tab = box(x0, x0 + p.baffle_t, 0, p.in_y0 + p.fit + 0.01, z_top, z_top + p.rail_t)
        else:                   # reaches the y-max wall, leaves the turn open at y-min
            y0, y1 = p.in_y0 + p.pass_w, p.in_y1 - p.fit
            tab = box(x0, x0 + p.baffle_t, p.in_y1 - p.fit - 0.01, p.tank_w, z_top, z_top + p.rail_t)
        body = body.union(box(x0, x0 + p.baffle_t, y0, y1, p.t + p.fit, z_top + p.rail_t)).union(tab)
    # engraved on the top face of the y-min rail (this face is on the bed when printed)
    txt = (cq.Workplane("XY").workplane(offset=z_top + p.rail_t - 0.5).center(34, p.rail_w / 2)
           .text("CHLORINE CONTACT BASIN", 3.6, 0.6, kind="bold", halign="left"))
    return body.cut(txt)


def head_tank(p: P):
    """Head tank in TRAY coordinates, standing on the tray rim. Print it upside down (open top on the bed)."""
    z0 = p.tray_h                                         # its underside rests on the tray and tank rims
    x0, x1 = 0.0, p.head_l
    y0, y1 = -(p.lip_gap + p.t), p.tray_w + p.lip_gap + p.t
    zt = z0 + p.t + p.head_depth
    body = box(x0, x1, y0, y1, z0, zt).cut(box(x0 + p.t, x1 - p.t, y0 + p.t, y1 - p.t, z0 + p.t, zt + 1))
    for ya, yb in ((y0, y0 + p.t), (y1 - p.t, y1)):       # lips outside the tray walls
        body = body.union(box(p.lip_x0, p.lip_x1, ya, yb, z0 - p.lip, z0))
    ox, oy = p.tank_x + p.orifice_xy[0], p.tank_y + p.orifice_xy[1]
    dx, dy = p.tank_x + p.dose_xy[0], p.tank_y + p.dose_xy[1]
    # dye port: a tube right through the head tank, walled off from its water
    body = body.union(cq.Workplane("XY").workplane(offset=z0).center(dx, dy).circle(p.dose_id / 2 + 2.0).extrude(p.t + p.head_depth))
    body = body.cut(cq.Workplane("XY").workplane(offset=z0 - 1).center(dx, dy).circle(p.dose_id / 2).extrude(p.t + p.head_depth + 2))
    body = body.cut(cq.Workplane("XY").workplane(offset=z0 - 1).center(ox, oy).circle(p.orifice_d / 2).extrude(p.t + 2))
    # fill line: a raised bead on the outside of the front wall, with its label
    zf = z0 + p.t + p.fill
    body = body.union(box(x0 - 0.6, x0, y0 + 10, y1 - 10, zf - 0.4, zf + 0.4))
    label = (cq.Workplane("YZ").workplane(offset=x0).center((y0 + y1) / 2, zf + 6.5)
             .transformed(rotate=(0, 180, 0)).text("FILL", 6.0, 0.6, kind="bold"))
    return body.union(label)


def tray(p: P):
    body = box(0, p.tray_l, 0, p.tray_w, 0, p.tray_h).cut(box(p.t, p.tray_l - p.t, p.t, p.tray_w - p.t, p.t, p.tray_h + 1))
    inset = 12.0
    for x in (p.tank_x + inset, p.tank_x + p.tank_l - inset):
        for y in (p.tank_y + inset, p.tank_y + p.tank_w - inset):
            body = body.union(cq.Workplane("XY").workplane(offset=p.t - 0.01).center(x, y).circle(p.post_d / 2).extrude(p.post_h + 0.01))
    xs = p.tank_x + p.tank_l + 0.4                        # stop ribs: the tank cannot slide toward the outfall end
    for ya, yb in ((p.t - 0.01, p.t + 4.0), (p.tray_w - p.t - 4.0, p.tray_w - p.t + 0.01)):
        body = body.union(box(xs, xs + 2.0, ya, yb, p.t - 0.01, p.tank_z + 12.0))
    # ribs on the outside of both long walls: the head tank's lips drop between them (45 degree undersides)
    reach = p.lip_gap + p.t
    for xa in (p.lip_x0 - 0.4 - 2.0, p.lip_x1 + 0.4):
        prof = [(0.01, p.tray_h - p.lip - 1.0 - reach), (0.01, p.tray_h), (-reach, p.tray_h), (-reach, p.tray_h - p.lip - 1.0)]
        rib = cq.Workplane("YZ").polyline(prof).close().extrude(2.0).translate((xa, 0, 0))
        body = body.union(rib).union(rib.mirror("XZ", (0, p.tray_w / 2, 0)))
    # station labels raised on the front wall, lined up with what is above them
    def front_text(s, x, z, size=5.2):
        return cq.Workplane("XZ").workplane(offset=0).center(x, z).text(s, size, 0.6, kind="bold", halign="left")
    for s, x, z in (("INFLUENT", 4.0, 30.0), ("CONTACT BASIN", 46.0, 30.0), ("NaHSO3", 131.0, 30.0),
                    ("NaOCl", 4.0, 21.0), ("C x T", 46.0, 21.0), ("OUTFALL", 131.0, 21.0)):
        body = body.union(front_text(s, x, z))
    body = body.union(box(4.0, p.tray_l - 4.0, -0.6, 0.0, 14.6, 15.4))                    # rule under the labels
    body = body.union(front_text("REMOVED IS NOT SAFE   contact basin model", 4.0, 5.0, 4.4))
    return body


def post_cap(p: P):
    r_in, r_out = p.post_d / 2 + 0.15, p.post_d / 2 + 2.0
    return cq.Workplane("XY").circle(r_out).extrude(p.cap_top + 6.0).cut(
        cq.Workplane("XY").workplane(offset=p.cap_top).circle(r_in).extrude(7.0))


def build(p: P = P()):
    return {"tank": tank(p), "insert": insert(p), "head_tank": head_tank(p), "tray": tray(p), "post_cap_TPU": post_cap(p)}


def print_orientation(name, wp, p: P):
    """Each part the way it goes on the bed, lowest point at z = 0."""
    if name in ("insert", "head_tank"):
        wp = wp.rotate((0, 0, 0), (1, 0, 0), 180)
    bb = wp.val().BoundingBox()
    return wp.translate((-bb.xmin, -bb.ymin, -bb.zmin))


if __name__ == "__main__":
    p = P()
    parts = build(p)
    OUT.mkdir(exist_ok=True)
    print(f"{'part':14} {'x':>7} {'y':>7} {'z':>7}  {'cm3':>6}  solids valid")
    for name, wp in parts.items():
        sh = wp.val(); bb = sh.BoundingBox()
        print(f"{name:14} {bb.xlen:7.1f} {bb.ylen:7.1f} {bb.zlen:7.1f}  {sh.Volume() / 1000:6.1f}  {len(wp.solids().vals()):6d} {sh.isValid()}")
        cq.exporters.export(print_orientation(name, wp, p), str(OUT / f"{name}.stl"), tolerance=0.03, angularTolerance=0.2)
        cq.exporters.export(wp, str(OUT / f"{name}_in_place.stl"), tolerance=0.05, angularTolerance=0.3)
        cq.exporters.export(print_orientation(name, wp, p), str(OUT / f"{name}.step"))
    d = {k: getattr(p, k) for k in p.__dataclass_fields__}
    for k in ("in_x0", "in_x1", "in_y0", "in_y1", "contact_l", "pass_w", "weir_x0", "tank_h", "tray_w", "tank_x", "tank_y", "tank_z", "tray_h", "head_w"):
        d[k] = getattr(p, k)
    d["orifice_xy"], d["dose_xy"] = list(p.orifice_xy), list(p.dose_xy)
    (OUT / "params.json").write_text(json.dumps(d, indent=1))
    print("wrote", OUT)
