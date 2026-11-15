"""Audit the molecule kit: check the printed geometry against its sources.

This script does not import molecule.py. It re-reads the PubChem file with its own parser, re-reads the exported STL
files with its own reader, and compares the two. A FAIL means a print file does not match the data it claims to show.

Run after molecule.py:   ../.venv/bin/python audit.py
"""
import itertools
import json
import pathlib
import struct
import sys

import numpy as np

HERE = pathlib.Path(__file__).parent
OUT = HERE / "out"
SDF = HERE / "data" / "ciprofloxacin_pubchem_cid2764_3d.sdf"

# Reference values, typed here separately from molecule.py on purpose.
BONDI = {"H": 1.20, "C": 1.70, "N": 1.55, "O": 1.52, "F": 1.47, "Cl": 1.75}     # angstrom, Bondi 1964
FORMULA = {"C": 17, "H": 18, "F": 1, "N": 3, "O": 3}                            # PubChem CID 2764: C17H18FN3O3
N_CL = 1.748                                                                    # angstrom, NH2Cl microwave structure
SCALE = 10.0                                                                    # mm per angstrom, as the plaque says
# Usual ranges for bond lengths in organic molecules (angstrom). A value outside means "look at this bond".
TYPICAL = {("C", "C"): (1.30, 1.56), ("C", "H"): (1.05, 1.12), ("C", "N"): (1.30, 1.50), ("C", "O"): (1.19, 1.38),
           ("C", "F"): (1.30, 1.40), ("H", "N"): (0.98, 1.05), ("H", "O"): (0.94, 1.00)}
BED = 180.0                                                                     # smallest Bambu bed (A1 mini), mm
TOL = 0.05                                                                      # mm. Spheres are exported as flat facets; the largest
                                                                                # facet error measured is 0.03 mm, a seventh of one 0.2 mm print layer

results = []


def check(name, ok, detail):
    results.append((name, bool(ok), detail))


def read_sdf():
    lines = SDF.read_text().splitlines()
    na, nb = int(lines[3][0:3]), int(lines[3][3:6])
    syms = [l[31:34].strip() for l in lines[4:4 + na]]
    xyz = np.array([[float(l[0:10]), float(l[10:20]), float(l[20:30])] for l in lines[4:4 + na]])
    bonds = [(int(l[0:3]) - 1, int(l[3:6]) - 1) for l in lines[4 + na:4 + na + nb]]
    return syms, xyz, bonds


def read_stl(name):
    raw = (OUT / f"{name}.stl").read_bytes()
    n = struct.unpack("<I", raw[80:84])[0]
    if len(raw) == 84 + 50 * n:                                    # binary
        rec = np.frombuffer(raw, dtype=[("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")], count=n, offset=84)
        return rec["v"].reshape(-1, 3).astype(float)
    pts = [l.split()[1:4] for l in raw.decode("ascii", "ignore").splitlines() if l.strip().startswith("vertex")]
    return np.array(pts, dtype=float)


def main():
    syms, xyz, bonds = read_sdf()
    M = json.loads((OUT / "model.json").read_text())
    pos = np.array([a["mm"] for a in M["atoms"]]); rad = np.array([a["r_mm"] for a in M["atoms"]])
    n_idx, h_idx = M["n_idx"], M["h_idx"]

    # ---- 1. the source data is ciprofloxacin
    counts = {e: syms.count(e) for e in set(syms)}
    check("Formula of the source file is C17H18FN3O3", counts == FORMULA, f"{counts}")
    check("Atom count", len(syms) == 42 and len(M["atoms"]) == 42, f"{len(syms)} in file, {len(M['atoms'])} in model")
    nh = [(a, b) for a, b in bonds for a, b in ((a, b), (b, a)) if syms[a] == "N" and syms[b] == "H"]
    check("Exactly one N-H, and the model swaps that hydrogen", len(nh) == 1 and nh[0] == (n_idx, h_idx), f"N atom {nh[0][0] + 1}, H atom {nh[0][1] + 1} (numbering as in the file)")

    # ---- 2. source bond lengths look like a real molecule
    worst = []
    for a, b in bonds:
        key = tuple(sorted((syms[a], syms[b]))); d = float(np.linalg.norm(xyz[a] - xyz[b]))
        lo, hi = TYPICAL[key]
        if not lo <= d <= hi:
            worst.append(f"{key[0]}-{key[1]} {d:.3f}")
    check("All 45 bond lengths in the source are in the usual range", not worst, "none outside" if not worst else ", ".join(worst))

    # ---- 3. the model keeps every distance, at 10 mm per angstrom
    iu = np.triu_indices(len(syms), 1)
    d_src = np.linalg.norm(xyz[iu[0]] - xyz[iu[1]], axis=1) * SCALE
    d_mod = np.linalg.norm(pos[iu[0]] - pos[iu[1]], axis=1)
    err = float(np.abs(d_src - d_mod).max())
    check("All 861 atom-to-atom distances match the source at 10 mm per angstrom", err < 0.001, f"largest difference {err:.5f} mm")
    ratio = np.array([rad[i] / (BONDI[s] * SCALE) for i, s in enumerate(syms)])
    check("Every atom's radius is the same fraction of its van der Waals radius", np.ptp(ratio) < 1e-6 and abs(M["cl_r_mm"] / (BONDI["Cl"] * SCALE) - ratio[0]) < 1e-6,
          f"{ratio[0]:.2f} x Bondi for all six elements")

    # ---- 4. the STL itself: every surface point sits on the sphere of some atom, none inside another
    V = np.unique(read_stl("cipro_body_whole").round(4), axis=0)
    keep = [i for i in range(len(syms)) if i != h_idx]
    D = np.linalg.norm(V[:, None, :] - pos[keep][None, :, :], axis=2) - rad[keep][None, :]      # signed distance to each sphere
    S = M["stud"]
    u = np.array(S["u"]); rel = V - pos[n_idx]; along = (rel * u).sum(axis=1)
    radial = np.linalg.norm(rel - np.outer(along, u), axis=1)
    stud_tip = S["bulge_at"] + S["bulge_r"]                       # the bulge reaches past the pin's end
    on_stud = (along > 0) & (along < stud_tip + 0.01) & (radial < S["bulge_r"] + 0.01)
    nearest = D.min(axis=1)
    check("Body print file: every surface point lies on an atom's sphere", float(np.abs(nearest[~on_stud]).max()) < TOL,
          f"{(~on_stud).sum()} points, largest gap {np.abs(nearest[~on_stud]).max():.4f} mm")
    check("Body print file: no surface point sits inside another atom", float(D[~on_stud].min()) > -TOL, f"deepest {D[~on_stud].min():.4f} mm")
    owner = D.argmin(axis=1)
    seen = {keep[k] for k in np.unique(owner[~on_stud & (np.abs(nearest) < TOL)])}
    check("Body print file: all 41 fixed atoms are present", seen == set(keep), f"{len(seen)} of 41 found on the surface")
    # each atom sits where the source says: fit a sphere centre to the points it owns
    off = []
    for k, i in enumerate(keep):
        P = V[(owner == k) & ~on_stud & (np.abs(nearest) < TOL)]
        A = np.hstack([2 * P, np.ones((len(P), 1))]); sol = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)[0]
        c = sol[:3]; r = float(np.sqrt(sol[3] + c @ c))
        off.append((float(np.linalg.norm(c - pos[i])), abs(r - rad[i])))
    off = np.array(off)
    check("Body print file: each atom's fitted centre and radius match the source", off[:, 0].max() < 0.05 and off[:, 1].max() < 0.05,
          f"centre off by at most {off[:, 0].max():.3f} mm, radius by at most {off[:, 1].max():.3f} mm")

    # ---- 5. it holds together, and only where there is a bond
    necks = []
    for a, b in bonds:
        if h_idx in (a, b):
            continue
        d = np.linalg.norm(pos[a] - pos[b]); x = (d * d + rad[a] ** 2 - rad[b] ** 2) / (2 * d)
        necks.append((float(np.sqrt(max(rad[a] ** 2 - x * x, 0))), syms[a], syms[b]))
    necks.sort()
    check("Every bond is a solid neck at least 3 mm in radius", necks[0][0] >= 3.0, f"thinnest {necks[0][0]:.1f} mm ({necks[0][1]}-{necks[0][2]}), thickest {necks[-1][0]:.1f} mm")
    bonded = {frozenset(b) for b in bonds}
    touching = [(i, j) for i, j in itertools.combinations(keep, 2) if frozenset((i, j)) not in bonded and np.linalg.norm(pos[i] - pos[j]) < rad[i] + rad[j]]
    check("No two atoms touch unless they are bonded", not touching, "none" if not touching else ", ".join(f"{syms[i]}{i + 1}-{syms[j]}{j + 1}" for i, j in touching))

    # ---- 6. the chlorine
    cl = np.array(M["cl_mm"]); d_ncl = float(np.linalg.norm(cl - pos[n_idx]))
    check("N-Cl distance is 1.748 angstrom at scale", abs(d_ncl - N_CL * SCALE) < 0.001, f"{d_ncl:.3f} mm")
    cosang = float((cl - pos[n_idx]) @ (pos[h_idx] - pos[n_idx]) / (d_ncl * np.linalg.norm(pos[h_idx] - pos[n_idx])))
    check("Chlorine sits along the old N-H direction", cosang > 0.999999, f"angle between them {np.degrees(np.arccos(min(cosang, 1))):.3f} degrees")
    for kind, centre, r in (("Cl", cl, M["cl_r_mm"]), ("H", pos[h_idx], rad[h_idx])):
        C = np.unique(read_stl(f"cap_{kind}_in_place").round(4), axis=0)
        dist = np.linalg.norm(C - centre, axis=1)
        check(f"{kind} cap: outer surface is the {kind} atom's sphere", abs(float(dist.max()) - r) < TOL, f"outermost point {dist.max():.3f} mm from centre, radius {r:.3f} mm")
        others = [i for i in keep if i != n_idx]
        gap = min(float(np.linalg.norm(centre - pos[i]) - r - rad[i]) for i in others)
        check(f"{kind} cap clears every other atom by at least 0.5 mm", gap >= 0.5, f"closest {gap:.1f} mm")
        base = float(((C - pos[n_idx]) * u).sum(axis=1).min())      # the cap's flat rim, measured from the nitrogen's centre
        check(f"{kind} cap: flat rim is where the design says and clears the nitrogen", abs(base - M["cap_base"][kind]) < 0.01 and base - rad[n_idx] >= 0.3,
              f"rim {base:.2f} mm from the N centre, {base - rad[n_idx]:.2f} mm above its surface")

    # ---- 7. snap fit numbers
    for kind in ("Cl", "H"):
        Cp = np.unique(read_stl(f"cap_{kind}_TPU").round(4), axis=0)
        check(f"{kind} cap print file sits flat on the bed", abs(Cp[:, 2].min()) < 1e-3, f"lowest point {Cp[:, 2].min():.3f} mm")
        rim = Cp[np.abs(Cp[:, 2] - Cp[:, 2].min()) < 0.02]
        rr = np.linalg.norm(rim[:, :2], axis=1)                    # the cap is centred on its socket axis
        mouth, outer = float(rr.min()), float(rr.max())
        check(f"{kind} cap: socket is 0.15 mm larger in radius than the stud", abs(mouth - (S["r"] + 0.15)) < 0.03, f"socket {mouth:.2f} mm, stud {S['r']:.2f} mm")
        check(f"{kind} cap: rim is at least 1.6 mm wide (4 lines of a 0.4 mm nozzle)", outer - mouth >= 1.6, f"{outer - mouth:.2f} mm")
        check(f"{kind} cap: bulge is 0.3 to 0.6 mm proud per side (TPU stretches over it)", 0.3 <= S["bulge_r"] - mouth <= 0.6, f"{S['bulge_r'] - mouth:.2f} mm")
        # the lip: how far the narrow socket runs from the rim before it opens into the bulge cavity
        cav = S["bulge_r"] + M["socket_gap"]
        lip = (S["bulge_at"] - np.sqrt(cav ** 2 - mouth ** 2)) - M["cap_base"][kind]
        check(f"{kind} cap: lip under the bulge is at least 0.7 mm tall (this is what holds it on)", lip >= 0.7, f"{lip:.2f} mm")
        outer_tip = (d_ncl + M["cl_r_mm"]) if kind == "Cl" else float(np.linalg.norm(pos[h_idx] - pos[n_idx]) + rad[h_idx])
        roof = outer_tip - (S["bulge_at"] + cav)
        check(f"{kind} cap: at least 1.0 mm of material over the top of the socket", roof >= 1.0, f"{roof:.2f} mm")
    check("Stud ends inside both caps", S["length"] + 0.15 < d_ncl + M["cl_r_mm"] - 2.0 and S["length"] + 0.15 < np.linalg.norm(pos[h_idx] - pos[n_idx]) + rad[h_idx] - 2.0,
          f"stud {S['length']:.1f} mm; H cap outer at {np.linalg.norm(pos[h_idx] - pos[n_idx]) + rad[h_idx]:.1f} mm, Cl cap at {d_ncl + M['cl_r_mm']:.1f} mm")

    # ---- 8. the plaque's scale bar
    Pq = read_stl("plaque")
    top = Pq[np.abs(Pq[:, 2] - Pq[:, 2][Pq[:, 2] < 6.5].max()) < 0.02]
    bar = top[(np.abs(top[:, 1] + 10.0) <= 0.61)]
    length = float(bar[:, 0].max() - bar[:, 0].min())
    check("Scale bar on the plaque is 50.00 mm (5 angstrom)", abs(length - 5 * SCALE) < 0.05, f"{length:.2f} mm")

    # ---- 9. halves and the bed
    T = read_stl("cipro_body_half_top"); B = read_stl("cipro_body_half_bottom_print_orientation")
    check("Both halves have a flat face on the bed", abs(T[:, 2].min()) < 1e-3 and abs(B[:, 2].min()) < 1e-3, f"lowest points {T[:, 2].min():.3f} and {B[:, 2].min():.3f} mm")
    sizes = {n: np.ptp(read_stl(n), axis=0) for n in ("cipro_body_whole", "cipro_body_half_top", "cipro_body_half_bottom_print_orientation", "plaque", "cap_Cl_TPU", "cap_H_TPU")}
    big = max(float(s[:2].max()) for s in sizes.values())
    check("Every part fits a 180 mm bed", big <= BED - 4, f"largest footprint {big:.1f} mm")
    w = sizes["cipro_body_whole"]
    tip = pos[n_idx] + u * S["bulge_at"]
    hi = np.maximum((pos[keep] + rad[keep, None]).max(axis=0), tip + S["bulge_r"])
    lo = np.minimum((pos[keep] - rad[keep, None]).min(axis=0), tip - S["bulge_r"])
    check("Body print file: overall size is what the atom positions and radii predict", float(np.abs(w - (hi - lo)).max()) < 0.05,
          f"{w[0]:.1f} x {w[1]:.1f} x {w[2]:.1f} mm, predicted {hi[0] - lo[0]:.1f} x {hi[1] - lo[1]:.1f} x {hi[2] - lo[2]:.1f} mm")

    width = max(len(n) for n, _, _ in results)
    for n, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {n.ljust(width)}  {detail}")
    bad = [n for n, ok, _ in results if not ok]
    print(f"\n{len(results) - len(bad)} of {len(results)} checks passed")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
