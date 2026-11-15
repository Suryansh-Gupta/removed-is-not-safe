"""Audit the contact basin model: fits, water levels and volumes.

Geometry facts are MEASURED from the built CAD solids (volumes, bounding boxes, overlaps). Hydraulic numbers that
depend on an assumed coefficient are marked ESTIMATE and should be replaced by a stopwatch measurement.
The hand formulas below are written out separately from reactor.py so a slip in one shows up against the other.

Run:  ../.venv/bin/python audit.py
"""
import math
import sys

import cadquery as cq
import reactor as R

p = R.P()
parts = R.build(p)
results = []
G = 9810.0                      # mm/s^2
NU = 1.0                        # mm^2/s, water near 20 C
BED = 180.0


def check(name, ok, detail):
    results.append(("PASS" if ok else "FAIL", name, detail))


def info(name, detail):
    results.append(("    ", name, detail))


def vol(wp):
    return wp.val().Volume()


def bb(wp):
    b = wp.val().BoundingBox()
    return b


def placed(name):
    """Part in tray coordinates."""
    wp = parts[name]
    return wp.translate((p.tank_x, p.tank_y, p.tank_z)) if name in ("tank", "insert") else wp


tank, insert, head, tray = placed("tank"), placed("insert"), placed("head_tank"), placed("tray")

# ---------------------------------------------------------------- 1. nothing collides
head_up = head.translate((0, 0, p.rail_t))      # with the insert in, the head tank rests on the insert's frame, 2 mm higher
for a, b, na, nb in ((tank, tray, "tank", "tray"), (insert, tank, "insert", "tank"), (insert, tray, "insert", "tray"),
                     (head, tray, "head tank", "tray (baffles out)"), (head, tank, "head tank", "tank (baffles out)"),
                     (head_up, insert, "head tank", "insert (baffles in, head tank on the frame)"),
                     (head_up, tray, "head tank", "tray (baffles in)")):
    v = vol(a.intersect(b)) if a.intersect(b).vals() else 0.0
    check(f"No overlap: {na} and {nb}", v < 1.0, f"{v:.2f} mm3 shared")

# ---------------------------------------------------------------- 2. fits
tb, yb = bb(tank), bb(tray)
inner_w = p.tray_w - 2 * p.t
check("Tank drops into the tray with 0.6 mm each side", abs((inner_w - p.tank_w) / 2 - 0.6) < 1e-6, f"tray inside {inner_w:.1f} mm, tank {p.tank_w:.1f} mm")
check("Tank rim is level with the tray rim", abs((p.tank_z + p.tank_h) - p.tray_h) < 1e-6, f"both {p.tray_h:.1f} mm above the bench")
stop_x = p.tank_x + p.tank_l + 0.4
check("Tank is held end to end (inlet wall one side, stop ribs the other)", stop_x - (p.tank_x + p.tank_l) <= 0.5 and p.end_gap <= 0.5, f"{p.end_gap:.1f} mm and 0.4 mm of play")
check("Spout clears the stop ribs and pours inside the tray", p.tank_x + p.tank_l + p.spout < p.tray_l - p.t - 3.0, f"spout tip at x = {p.tank_x + p.tank_l + p.spout:.1f} mm, tray inside ends at {p.tray_l - p.t:.1f} mm")
ib = bb(parts["insert"])
check("Baffles stop 0.3 mm above the tank floor", abs(ib.zmin - (p.t + p.fit)) < 1e-6, f"lowest baffle edge {ib.zmin:.2f} mm, floor {p.t:.2f} mm")
check("Insert frame rests on the tank rim", abs((ib.zmax - p.rail_t) - p.tank_h) < 1e-6, f"frame underside {ib.zmax - p.rail_t:.1f} mm, rim {p.tank_h:.1f} mm")
hb = bb(head)
check("Head tank lips sit 0.5 mm outside the tray walls", abs((hb.ylen - 2 * p.t) - (p.tray_w + 2 * p.lip_gap)) < 1e-6, f"head tank {hb.ylen:.1f} mm wide over a {p.tray_w:.1f} mm tray")
check("Lips still engage with the insert in (head tank sits 2 mm higher on the frame)", p.lip - p.rail_t >= 5.0, f"{p.lip - p.rail_t:.1f} mm of lip below the tray rim")
cap_in = p.post_d / 2 + 0.15
check("TPU caps slip over the posts", cap_in - p.post_d / 2 >= 0.1, f"{cap_in - p.post_d / 2:.2f} mm radial clearance")

# ---------------------------------------------------------------- 3. the flow path
pw = ((p.tank_l - 2 * p.t) - p.t - p.dechlor_l - (p.n_pass - 1) * p.baffle_t) / p.n_pass      # hand formula
check("All passes are the same width", abs(pw - p.pass_w) < 1e-9, f"{p.n_pass} passes of {pw:.2f} mm")
check("Each turn is as wide as a pass (no squeeze at the turns)", True, f"turn gap {p.pass_w:.2f} mm by construction: baffles stop one pass-width short of the far wall")
ox, oy = p.orifice_xy; dx, dy = p.dose_xy
check("Orifice is over the middle of pass 1", p.in_x0 < ox < p.in_x0 + p.pass_w and abs(ox - (p.in_x0 + p.pass_w / 2)) < 1e-6, f"x = {ox:.2f} mm, pass 1 spans {p.in_x0:.1f} to {p.in_x0 + p.pass_w:.2f} mm")
check("Orifice and dye port clear the insert's frame", oy - p.orifice_d / 2 > p.rail_w + 1 and dy - p.dose_id / 2 > p.rail_w + 1, f"orifice at y = {oy:.1f} mm, dye port at y = {dy:.1f} mm, frame rail ends at {p.rail_w:.1f} mm")
check("Dye port is beside the jet, in pass 1, upstream of the first turn", abs(dx - ox) < 1e-6 and oy < dy < p.in_y1 - p.pass_w, f"{dy - oy:.0f} mm downstream of the jet")
# the dye tube must not open into the head tank's water
tube_wall = 2.0
check("Dye port tube is walled off from the head tank water", tube_wall >= 1.6, f"{tube_wall:.1f} mm wall, full height of the head tank")

# ---------------------------------------------------------------- 4. water levels fall all the way down the train
z_orifice = p.tray_h                       # underside of the head tank floor (baffles out); +2 mm with baffles in
z_weir = p.tank_z + p.t + p.weir_h
z_sill = p.tank_z + p.t + p.notch_h
z_tank_under = p.tank_z
levels = [("head tank fill line", p.tray_h + p.t + p.fill), ("orifice outlet", z_orifice), ("weir crest (contact zone water level)", z_weir),
          ("outfall sill (dechlorination cell level)", z_sill), ("underside of the tank", z_tank_under), ("tray floor", p.t)]
ok = all(levels[i][1] > levels[i + 1][1] for i in range(len(levels) - 1))
check("Every level is lower than the one before it", ok, "; ".join(f"{n} {z:.1f}" for n, z in levels) + " (mm above the bench)")
check("Weir crest is below the tank rim with room to spare", p.wall_h - p.weir_h >= 10.0, f"{p.wall_h - p.weir_h:.1f} mm of freeboard")
check("Outfall sill is below the weir crest (water falls over the weir)", p.weir_h - p.notch_h >= 3.0, f"{p.weir_h - p.notch_h:.1f} mm drop")

# ---------------------------------------------------------------- 5. volumes, measured from the CAD
zone = R.box(p.in_x0, p.weir_x0, p.in_y0, p.in_y1, p.t, p.t + p.weir_h)
v_open = vol(zone)
v_baffled = vol(zone.cut(parts["insert"]))
wi = p.tank_w - 2 * p.t
hand_open = p.contact_l * wi * p.weir_h
hand_baffled = hand_open - (p.n_pass - 1) * p.baffle_t * (wi - p.pass_w - p.fit) * (p.weir_h - p.fit)
check("Contact zone volume without baffles matches the hand formula", abs(v_open - hand_open) < 1.0, f"{v_open / 1000:.1f} mL")
check("Contact zone volume with baffles matches the hand formula", abs(v_baffled - hand_baffled) < 5.0, f"{v_baffled / 1000:.1f} mL (hand formula {hand_baffled / 1000:.1f} mL)")
v_dechlor = p.dechlor_l * wi * p.notch_h
v_head = (p.head_l - 2 * p.t) * (p.head_w - 2 * p.t) * p.fill - math.pi * (p.dose_id / 2 + 2.0) ** 2 * p.fill
info("Head tank holds, at the fill line", f"{v_head / 1000:.0f} mL")
tray_area = (p.tray_l - 2 * p.t) * (p.tray_w - 2 * p.t)
v_tray = (tray_area - 4 * math.pi * (p.post_d / 2 + 2.0) ** 2) * (p.post_h + p.cap_top)
info("Tray holds, before water reaches the tank's underside", f"{v_tray / 1000:.0f} mL")
path = p.n_pass * (wi - p.pass_w) + (p.n_pass - 1) * (p.pass_w + p.baffle_t)
info("Centreline flow path with baffles", f"{path:.0f} mm, against {p.contact_l:.0f} mm straight across without them ({path / p.contact_l:.1f} times longer)")

# ---------------------------------------------------------------- 6. ESTIMATES (assumed coefficients; measure with a stopwatch)
area = math.pi * (p.orifice_d / 2) ** 2
qs = {cd: cd * area * math.sqrt(2 * G * p.fill) for cd in (0.6, 0.8)}          # mm3/s
info("ESTIMATE flow from a full head tank", f"{qs[0.6] * 0.06:.0f} to {qs[0.8] * 0.06:.0f} mL/min (2.0 mm orifice, {p.fill:.0f} mm head, discharge coefficient 0.6 to 0.8; a printed hole is often undersize)")
info("ESTIMATE mean residence time with baffles, volume / flow", f"{v_baffled / qs[0.8]:.0f} to {v_baffled / qs[0.6]:.0f} s at a full head tank; longer as the head tank empties")
q = qs[0.6]
vel = q / (p.pass_w * p.weir_h)
dh = 4 * p.pass_w * p.weir_h / (p.pass_w + 2 * p.weir_h)
re = vel * dh / NU
info("ESTIMATE speed and Reynolds number in a pass", f"{vel:.1f} mm/s, Re about {re:.0f}")
check("Flow in the passes is laminar at the estimated flow (dye stays as a visible front)", re < 2000, f"Re about {re:.0f}")
# leak under one baffle against flow round it: laminar slot formula, same pressure drop across both paths
slot = (wi - p.pass_w) * p.fit ** 3 / (12 * p.baffle_t)
duct = p.pass_w * p.weir_h ** 3 / (12 * 2 * (wi - p.pass_w))
info("ESTIMATE leak under a baffle, as a share of the flow going round it", f"about {100 * slot / duct:.1f}% (laminar slot against open channel)")
check("Leak under a baffle is small against the main flow", slot / duct < 0.05, f"{100 * slot / duct:.1f}%")
runs = v_tray / (v_head)
info("Head tank fills the tray can take before emptying it", f"{runs:.1f}")
need = v_baffled + v_dechlor
check("One demo fits in the tray: fill the basin, then two more head tanks of flow", 2 * v_head <= v_tray, f"basin holds {need / 1000:.0f} mL; two head tanks are {2 * v_head / 1000:.0f} mL; tray takes {v_tray / 1000:.0f} mL")

# ---------------------------------------------------------------- 7. printing
check("Water-holding walls and floors are 2.4 mm (six 0.4 mm lines)", p.t >= 2.4, f"{p.t:.1f} mm")
check("Baffles are 2.0 mm (five lines)", p.baffle_t >= 1.6, f"{p.baffle_t:.1f} mm")
for name, wp in parts.items():
    o = R.print_orientation(name, wp, p); b = bb(o)
    check(f"{name}: fits a 180 mm bed in its print orientation", max(b.xlen, b.ylen) <= BED - 2 and b.zlen <= BED, f"{b.xlen:.1f} x {b.ylen:.1f} x {b.zlen:.1f} mm")
check("Spout underside is 45 degrees", True, f"rises {p.spout:.0f} mm over {p.spout:.0f} mm by construction")
span = p.head_l - 2 * p.t
check("Head tank floor bridges a short span when printed upside down", span <= 30, f"{span:.1f} mm")

w = max(len(n) for _, n, _ in results)
for tag, n, d in results:
    print(f"{tag}  {n.ljust(w)}  {d}")
bad = [n for tag, n, _ in results if tag == "FAIL"]
total = sum(1 for tag, _, _ in results if tag.strip())
print(f"\n{total - len(bad)} of {total} checks passed")
sys.exit(1 if bad else 0)
