"""Ciprofloxacin, to scale, with the one atom chlorine changes made swappable. Parametric CAD.

Geometry: manifold3d for the molecule (it merges dozens of overlapping spheres reliably), CadQuery for the
plaque (it has text).

The project in one object: the hydrogen on the piperazine nitrogen is a snap-on cap. Swap it for the chlorine cap
and the model is N-chloro-ciprofloxacin, the intermediate free chlorine makes in under a second. Every other atom,
including the whole quinolone core, is the same piece of plastic. Pull the chlorine off again and it is cipro
(the reversal the project's Gap 2 asks about for bisulfite).

WHERE EVERY NUMBER COMES FROM
  atom positions   data/ciprofloxacin_pubchem_cid2764_3d.sdf, PubChem CID 2764, 3D conformer 00000ACC00000001.
                   This is a COMPUTED conformer (MMFF94 force field), not a crystal structure, and it is the neutral
                   form (COOH, N-H). Near pH 7.5 cipro in water is mostly a zwitterion; the atoms and their
                   connections are the same, one H sits on the other end.
  atom sizes       Bondi 1964 van der Waals radii (H 1.20, C 1.70, N 1.55, O 1.52, F 1.47, Cl 1.75 angstrom),
                   all multiplied by the same factor RADIUS_FACTOR so bonded atoms fuse into one printable solid.
                   Relative sizes are true; absolute sizes are RADIUS_FACTOR of van der Waals. Values are the
                   commonly tabulated ones; not re-read from Bondi's paper.
  N-Cl distance    1.748 angstrom, the microwave (rs) structure of monochloramine NH2Cl. N-chloro-cipro's own
                   N-Cl length was not found; this is the closest measured N-Cl bond.
  which nitrogen   the piperazine N that carries a hydrogen (the only N-H in the molecule). The project notes say
                   chlorine attaches to a piperazine nitrogen (Dodd et al. 2005); confirm the position against
                   Dodd's Scheme 1.
  scale            SCALE mm per angstrom. 10 mm = 1 angstrom, so the model is 100,000,000 : 1.

Run:  ../.venv/bin/python molecule.py      (writes out/, then run audit.py)
"""
import json
import math
import pathlib

import struct

import numpy as np
import cadquery as cq
from manifold3d import Manifold, OpType

HERE = pathlib.Path(__file__).parent
SDF = HERE / "data" / "ciprofloxacin_pubchem_cid2764_3d.sdf"
OUT = HERE / "out"

SEG = 64                         # facets around each sphere (surface error about 0.01 mm)
SCALE = 10.0                     # mm per angstrom
RADIUS_FACTOR = 0.55             # printed radius = RADIUS_FACTOR x van der Waals radius
BONDI = {"H": 1.20, "C": 1.70, "N": 1.55, "O": 1.52, "F": 1.47, "Cl": 1.75}      # angstrom
N_CL = 1.748                     # angstrom, NH2Cl microwave structure
EXPECTED_FORMULA = {"C": 17, "H": 18, "F": 1, "N": 3, "O": 3}

# snap stud on the nitrogen (mm). The caps are TPU and stretch over the bulge.
STUD_R, STUD_LEN, BULGE_R, BULGE_AT = 3.0, 13.0, 3.5, 12.0
SOCKET_GAP = 0.15                # added to the stud radius inside a cap
CAP_BASE = {"H": 8.9, "Cl": 9.4}  # mm from the nitrogen's centre: each cap is cut flat here so it has a real rim
                                 # to print on (the nitrogen's own radius is 8.525 mm, so both clear it)
PIN_D, PIN_DEPTH = 2.0, 6.0      # alignment holes for 1.75 mm filament offcuts


def read_sdf(path=SDF):
    lines = path.read_text().splitlines()
    na, nb = int(lines[3][0:3]), int(lines[3][3:6])
    atoms = [(l[31:34].strip(), np.array([float(l[0:10]), float(l[10:20]), float(l[20:30])])) for l in lines[4:4 + na]]
    bonds = [(int(l[0:3]) - 1, int(l[3:6]) - 1, int(l[6:9])) for l in lines[4 + na:4 + na + nb]]
    return atoms, bonds


def radius_mm(sym):
    return BONDI[sym] * RADIUS_FACTOR * SCALE


def layout():
    """Atoms in millimetres, turned so the flattest direction of the molecule is Z and its middle is the origin."""
    atoms, bonds = read_sdf()
    syms = [s for s, _ in atoms]
    X = np.array([c for _, c in atoms])
    heavy = np.array([s != "H" for s in syms])
    centre = X[heavy].mean(axis=0)
    _, _, vt = np.linalg.svd(X[heavy] - centre)          # rows: longest, middle, flattest direction
    R = vt if np.linalg.det(vt) > 0 else vt * np.array([[1], [1], [-1]])
    mm = (X - centre) @ R.T * SCALE
    nbrs = {i: [] for i in range(len(atoms))}
    for a, b, _ in bonds:
        nbrs[a].append(b); nbrs[b].append(a)
    nh = [(i, j) for i in range(len(atoms)) if syms[i] == "N" for j in nbrs[i] if syms[j] == "H"]
    assert len(nh) == 1, f"expected exactly one N-H, found {len(nh)}"
    n_idx, h_idx = nh[0]
    u = mm[h_idx] - mm[n_idx]
    nh_len = float(np.linalg.norm(u)); u = u / nh_len
    cl_pos = mm[n_idx] + u * N_CL * SCALE
    return dict(syms=syms, mm=mm, bonds=bonds, nbrs=nbrs, n_idx=n_idx, h_idx=h_idx, u=u, nh_len=nh_len, cl_pos=cl_pos)


def _sphere(c, r):
    return Manifold.sphere(float(r), SEG).translate([float(v) for v in c])


def _rot_z_to(u):
    """3x3 rotation matrix that takes +Z to the unit vector u (Rodrigues)."""
    z = np.array([0.0, 0.0, 1.0]); v = np.cross(z, u); c = float(z @ u); s = np.linalg.norm(v)
    if s < 1e-12:
        return np.eye(3) if c > 0 else np.diag([1.0, -1.0, -1.0])
    k = v / s
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + s * K + (1 - c) * (K @ K)


def _moved(body, R, t):
    return body.transform(np.hstack([R, np.reshape(np.asarray(t, float), (3, 1))]))


def _stud(base, u, extra=0.0):
    """A pin with a round bulge near its tip, from `base` along `u`. `extra` grows it (used to cut sockets)."""
    pin = Manifold.cylinder(STUD_LEN + extra, STUD_R + extra, STUD_R + extra, 64)
    pin = pin + Manifold.sphere(BULGE_R + extra, 64).translate([0, 0, BULGE_AT])
    return _moved(pin, _rot_z_to(np.asarray(u, float)), base)


def element_bodies(L):
    """One solid per element, cut so they do not overlap (for multi-colour printing). The swappable H is left out."""
    order = ["C", "N", "O", "F", "H"]
    raw = {}
    for e in order:
        spheres = [_sphere(L["mm"][i], radius_mm(s)) for i, s in enumerate(L["syms"]) if s == e and i != L["h_idx"]]
        raw[e] = Manifold.batch_boolean(spheres, OpType.Add)
    raw["N"] = raw["N"] + _stud(L["mm"][L["n_idx"]], L["u"])
    out, used = {}, None
    for e in order:
        out[e] = raw[e] if used is None else raw[e] - used
        used = raw[e] if used is None else used + raw[e]
    return out, used            # `used` is the whole molecule as one solid


def cap(L, kind):
    """Snap-on atom: 'H' (cipro) or 'Cl' (N-chloro-cipro). Modelled in place on the molecule."""
    n = L["mm"][L["n_idx"]]
    centre = L["mm"][L["h_idx"]] if kind == "H" else L["cl_pos"]
    body = _sphere(centre, radius_mm(kind))
    # keep only the part beyond the flat base plane, then cut the socket
    u = np.asarray(L["u"], float)
    body = body.trim_by_plane([float(v) for v in u], float(n @ u) + CAP_BASE[kind])
    return body - _stud(n, L["u"], extra=SOCKET_GAP)


def cap_for_printing(L, kind):
    """The same cap turned so its opening faces down on the bed."""
    R = _rot_z_to(L["u"])
    body = _moved(cap(L, kind).translate([float(-v) for v in L["mm"][L["n_idx"]]]), R.T, [0, 0, 0])
    lo = body.bounding_box()[2]
    return body.translate([0, 0, -lo])


def halves(L, whole):
    """Cut the molecule along its flat plane so each half prints flat side down. Pins line the halves up."""
    z0 = 0.0
    top, bot = whole.split_by_plane([0.0, 0.0, 1.0], z0)
    cand = [i for i, s in enumerate(L["syms"]) if s == "C" and abs(L["mm"][i][2] - z0) < 2.5]
    cand.sort(key=lambda i: L["mm"][i][0])
    pins = [cand[0], cand[len(cand) // 2], cand[-1]]
    for i in pins:
        hole = Manifold.cylinder(2 * PIN_DEPTH, PIN_D / 2, PIN_D / 2, 32).translate([float(L["mm"][i][0]), float(L["mm"][i][1]), z0 - PIN_DEPTH])
        top, bot = top - hole, bot - hole
    return top, bot, pins


def plaque(L):
    """Stand: name, formula, a scale bar that is exactly 5 angstrom long, and two studs to park the spare cap."""
    w, d, t = 170.0, 62.0, 5.0
    body = cq.Workplane("XY").box(w, d, t, centered=(True, True, False)).edges("|Z").chamfer(4.0)
    body = body.faces(">Z").edges().chamfer(0.8)

    def top():
        return cq.Workplane("XY").workplane(offset=t - 0.01)

    def text(s, size, x, y, bold=True, halign="left"):
        return top().center(x, y).text(s, size, 0.8, kind="bold" if bold else "regular", halign=halign)

    body = body.union(text("CIPROFLOXACIN", 9.0, -78, 17))
    body = body.union(text("C17 H18 F N3 O3", 5.5, -78, 5.5, bold=False))
    # Scale bar: exactly 50.00 mm end to end = 5 angstrom. The end ticks are flush with the ends, so a caliper
    # across the whole bar reads 50.00. The four inner ticks are centred on 1, 2, 3 and 4 angstrom.
    bar_x0, bar_y, tick = -78.0, -10.0, 0.8
    body = body.union(top().center(bar_x0 + 2.5 * SCALE, bar_y).rect(5 * SCALE, 1.2).extrude(0.8))
    for xc in [tick / 2, 5 * SCALE - tick / 2] + [k * SCALE for k in range(1, 5)]:
        body = body.union(top().center(bar_x0 + xc, bar_y + 1.6).rect(tick, 4.4).extrude(0.8))
    body = body.union(text("5 angstrom = 50 mm     scale 100 000 000 : 1", 4.2, -78, -20, bold=False))
    for label, x in (("H", 38.0), ("Cl", 64.0)):       # parking studs, same shape as the one on the molecule
        pin = cq.Workplane("XY").workplane(offset=t - 0.5).center(x, 6.0).circle(STUD_R).extrude(STUD_LEN + 0.5)
        pin = pin.union(cq.Workplane("XY").sphere(BULGE_R).translate((x, 6.0, t + BULGE_AT)))
        body = body.union(pin).union(text(label, 7.0, x, -17, halign="center"))
    return body.union(text("SWAP", 4.2, 51, -6.5, bold=False, halign="center"))


def write_stl(body, path):
    """Binary STL from a manifold body."""
    me = body.to_mesh()
    V = np.asarray(me.vert_properties, dtype=np.float64)[:, :3]; T = np.asarray(me.tri_verts)
    tri = V[T]
    n = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0]); n /= (np.linalg.norm(n, axis=1, keepdims=True) + 1e-30)
    rec = np.zeros(len(tri), dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")])
    rec["n"], rec["v"] = n, tri
    with open(path, "wb") as f:
        f.write(b"removed-is-not-safe molecule kit".ljust(80, b" ")); f.write(struct.pack("<I", len(tri))); f.write(rec.tobytes())


def build():
    L = layout()
    elems, whole = element_bodies(L)
    top, bot, pins = halves(L, whole)
    flip = np.diag([1.0, -1.0, -1.0])                   # half a turn about X: the bottom half's flat face goes down
    parts = {
        "cipro_body_whole": whole,
        "cipro_body_half_top": top,
        "cipro_body_half_bottom_print_orientation": _moved(bot, flip, [0, 0, 0]),
        "cap_H_TPU": cap_for_printing(L, "H"),
        "cap_Cl_TPU": cap_for_printing(L, "Cl"),
    }
    for e, b in elems.items():
        parts[f"colour_{e}"] = b
    parts["cap_H_in_place"], parts["cap_Cl_in_place"] = cap(L, "H"), cap(L, "Cl")
    return L, parts, pins


if __name__ == "__main__":
    L, parts, pins = build()
    OUT.mkdir(exist_ok=True)
    print(f"{'part':42} {'x':>7} {'y':>7} {'z':>7}  {'cm3':>6}  pieces status")
    for name, body in parts.items():
        bb = body.bounding_box()
        print(f"{name:42} {bb[3] - bb[0]:7.1f} {bb[4] - bb[1]:7.1f} {bb[5] - bb[2]:7.1f}  {body.volume() / 1000:6.1f}  {len(body.decompose()):6d} {body.status().name}")
        write_stl(body, OUT / f"{name}.stl")
    pl = plaque(L)
    bb = pl.val().BoundingBox()
    print(f"{'plaque':42} {bb.xlen:7.1f} {bb.ylen:7.1f} {bb.zlen:7.1f}  {pl.val().Volume() / 1000:6.1f}  {len(pl.solids().vals()):6d} {'valid' if pl.val().isValid() else 'INVALID'}")
    cq.exporters.export(pl, str(OUT / "plaque.stl"), tolerance=0.02, angularTolerance=0.2)
    meta = dict(scale_mm_per_angstrom=SCALE, radius_factor=RADIUS_FACTOR, bondi_angstrom=BONDI, n_cl_angstrom=N_CL,
                atoms=[dict(i=i, el=s, mm=[round(float(v), 4) for v in L["mm"][i]], r_mm=round(radius_mm(s), 4))
                       for i, s in enumerate(L["syms"])],
                bonds=[[a, b, o] for a, b, o in L["bonds"]], n_idx=L["n_idx"], h_idx=L["h_idx"],
                cl_mm=[round(float(v), 4) for v in L["cl_pos"]], cl_r_mm=round(radius_mm("Cl"), 4),
                cap_base=CAP_BASE, socket_gap=SOCKET_GAP,
                stud=dict(r=STUD_R, length=STUD_LEN, bulge_r=BULGE_R, bulge_at=BULGE_AT, u=[round(float(v), 6) for v in L["u"]]),
                pin_atoms=pins)
    (OUT / "model.json").write_text(json.dumps(meta, indent=1))
    print("wrote", OUT)
