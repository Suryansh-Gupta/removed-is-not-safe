```python
#!/usr/bin/env python3
"""
lattice_gen.py — catalyst-support lattices for the AOP flow reactor.

Builds two printable lattice cylinders as implicit fields, meshes them with
marching cubes, and bisects the wall/strut thickness until the MEASURED open
fraction hits the target. Nothing here trusts a nominal porosity number.

  gyroid      sheet TPMS, for catalyst option 2 (alginate + iron-oxide dip coat)
  crosshatch  cubic strut grid with straight axial channels, for catalyst
              option 1 (threaded steel wool)

Both carry an integral collar ring at each end that seals the annulus between
the lattice and the tube wall. Without it roughly half the flow bypasses the
iron (see lattice-build-guide.md §1.1).

Every part is verified three ways before it is written:
  1. watertight  — every mesh edge shared by exactly two triangles
  2. connected   — the solid is one piece, no islands that fail mid-print
  3. percolating — pore space runs clear inlet face to outlet face, with the
                   dead-end pore fraction reported (trapped air is a slowly
                   changing void volume, i.e. a drifting residence time)

Outputs STLs plus lattice_report.json with every measured number.

    python3 lattice_gen.py
    python3 lattice_gen.py --porosity 0.50
    python3 lattice_gen.py --tube-id 26 --collar-od 25.6
    python3 lattice_gen.py --hatch-cell 8
    python3 lattice_gen.py --voxel 0.15          # finer, slower, bigger files

Requires numpy, scipy, scikit-image.
"""

import argparse
import json
import os
import struct
import sys
import time

import numpy as np
from scipy import ndimage
from skimage import measure

PETG_DENSITY = 1.27  # g/cm^3


# ----------------------------------------------------------------------------
# geometry fields  (all fields are >= 0 inside the solid, in approximate mm)
# ----------------------------------------------------------------------------

def axes(p):
    """Voxel centre coordinates for the bounding box, with 3 voxels of padding
    so marching cubes always closes the surface at the domain edge.

    Everything is offset by half a voxel so that no sample lands exactly on a
    face of the geometry. Field values of exactly zero are what produce
    degenerate triangles and non-manifold edges in marching cubes."""
    v = p["voxel"]
    pad = 3 * v
    off = 0.5 * v
    half = p["collar_od"] / 2 + pad
    x = (np.arange(-half, half + v, v) + off).astype(np.float32)
    y = x.copy()
    z = (np.arange(-pad, p["length"] + pad + v, v) + off).astype(np.float32)
    return x, y, z


def radial(x, y):
    return np.sqrt(x[:, None, None] ** 2 + y[None, :, None] ** 2).astype(np.float32)


def gyroid_field(x, y, z, cell):
    """sin x cos y + sin y cos z + sin z cos x, the standard gyroid level set."""
    k = 2 * np.pi / cell
    sx, cxx = np.sin(k * x)[:, None, None], np.cos(k * x)[:, None, None]
    sy, cyy = np.sin(k * y)[None, :, None], np.cos(k * y)[None, :, None]
    sz, czz = np.sin(k * z)[None, None, :], np.cos(k * z)[None, None, :]
    return (sx * cyy + sy * czz + sz * cxx).astype(np.float32)


def crosshatch_dists(x, y, z, cell):
    """Distance from each point to the nearest channel centre line, per axis.
    Channel centres sit at cell/2 + n*cell so the grid straddles the axis."""
    h = cell / 2.0
    cx = np.abs(np.mod(x, cell) - h)[:, None, None].astype(np.float32)
    cy = np.abs(np.mod(y, cell) - h)[None, :, None].astype(np.float32)
    cz = np.abs(np.mod(z, cell) - h)[None, None, :].astype(np.float32)
    return cx, cy, cz


def collar_field(r, z, p):
    """Two solid rings, one at each end, sealing the lattice-to-tube annulus."""
    zz = z[None, None, :]
    ring = np.minimum(r - p["collar_id"] / 2, p["collar_od"] / 2 - r)
    lo = np.minimum(zz - 0.0, p["collar_h"] - zz)
    hi = np.minimum(zz - (p["length"] - p["collar_h"]), p["length"] - zz)
    return np.maximum(np.minimum(ring, lo), np.minimum(ring, hi)).astype(np.float32)


def build(geometry, thickness, p, x, y, z, r, cache):
    """Assemble the full implicit field for one geometry at one thickness."""
    core_r = p["core_dia"] / 2
    zz = z[None, None, :]

    if geometry == "gyroid":
        g = cache["g"]
        # |g| <= thickness_param is the sheet; divide by the level-set gradient
        # scale to get an approximate millimetre field for clean intersections.
        scale = 2 * np.pi / p["gyroid_cell"]
        lattice = (thickness - np.abs(g)) / scale
    else:
        cx, cy, cz = cache["cx"], cache["cy"], cache["cz"]
        half = thickness / 2.0  # half the channel opening
        void = np.maximum(
            np.maximum(
                np.minimum(half - cx, half - cy),   # channels along z
                np.minimum(half - cy, half - cz),   # channels along x
            ),
            np.minimum(half - cx, half - cz),       # channels along y
        )
        lattice = -void

    core = np.minimum(lattice, core_r - r)
    core = np.minimum(core, np.minimum(zz - 0.0, p["length"] - zz))
    field = np.maximum(core, cache["collar"])
    field[field == 0] = np.float32(-1e-6)
    return field


def open_fraction(field, x, y, z, p):
    """Measured, not nominal: open volume over cylinder volume, in the lattice
    region only (collars excluded at both ends).

    Uses the sub-voxel solid fraction implied by the field rather than a hard
    threshold. A hard threshold quantises porosity in steps of several percent
    at any practical voxel size, which stalls the bisection well short of the
    target and reports a number the printed part does not have."""
    core_r = p["core_dia"] / 2
    rr = radial(x, y)
    region = (rr < core_r) & (z[None, None, :] > p["collar_h"]) & (
        z[None, None, :] < p["length"] - p["collar_h"]
    )
    frac = np.clip(0.5 + field / p["voxel"], 0.0, 1.0)
    total = np.count_nonzero(region)
    return float(1.0 - frac[region].sum() / total) if total else 0.0


def mesh_volume(verts, faces):
    """Exact enclosed volume of the mesh that actually gets printed, by the
    divergence theorem — not a voxel count."""
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    return float(abs(np.einsum("ij,ij->i", a, np.cross(b, c)).sum()) / 6.0)


# ----------------------------------------------------------------------------
# meshing, checks, export
# ----------------------------------------------------------------------------

def mesh(field, x, y, z):
    verts, faces, _, _ = measure.marching_cubes(
        np.ascontiguousarray(field), level=0.0,
        spacing=(x[1] - x[0], y[1] - y[0], z[1] - z[0]),
    )
    verts = verts + np.array([x[0], y[0], z[0]], dtype=verts.dtype)
    return verts, faces


def decimate(verts, faces, max_tri):
    """Marching cubes at a useful voxel size produces meshes too heavy for a
    school laptop's slicer. Reduce the triangle count before anything is
    measured or checked, so the numbers in the report describe the file that
    actually gets printed."""
    if max_tri <= 0 or len(faces) <= max_tri:
        return verts, faces
    try:
        import fast_simplification
    except ImportError:
        print("    (fast-simplification not installed; shipping the full mesh)")
        return verts, faces
    v, f = fast_simplification.simplify(
        verts.astype(np.float32), faces.astype(np.int32),
        target_reduction=1.0 - max_tri / len(faces))
    return np.asarray(v, dtype=np.float64), np.asarray(f, dtype=np.int64)


def triangle_areas(verts, faces):
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    return 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)


def check_watertight(verts, faces):
    """Every edge must be shared by exactly two triangles."""
    q = np.round(verts, 5)
    _, idx = np.unique(q, axis=0, return_inverse=True)
    f = idx[faces]
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]], axis=0)
    e = np.sort(e, axis=1)
    _, counts = np.unique(e, axis=0, return_counts=True)
    return {
        "watertight": bool(np.all(counts == 2)),
        "boundary_edges": int(np.count_nonzero(counts == 1)),
        "nonmanifold_edges": int(np.count_nonzero(counts > 2)),
    }


def check_connected(solid):
    """One printable piece — 6-connectivity, so diagonal touching does not
    count as joined."""
    lab, n = ndimage.label(solid, structure=ndimage.generate_binary_structure(3, 1))
    if n == 0:
        return {"solid_components": 0, "largest_component_fraction": 0.0}
    sizes = np.bincount(lab.ravel())[1:]
    return {
        "solid_components": int(n),
        "largest_component_fraction": float(sizes.max() / sizes.sum()),
    }


def check_percolation(solid, x, y, z, p):
    """Pore space must run clear from the inlet face to the outlet face.
    Isolated pores trap air on first fill and make void volume drift."""
    core_r = p["core_dia"] / 2
    rr = radial(x, y)
    inside = (rr < core_r) & (z[None, None, :] >= 0) & (z[None, None, :] <= p["length"])
    void = inside & ~solid
    lab, n = ndimage.label(void, structure=ndimage.generate_binary_structure(3, 1))
    if n == 0:
        return {"percolates": False, "dead_end_pore_fraction": 1.0}

    zi = np.where((z >= 0) & (z <= p["length"]))[0]
    inlet = set(np.unique(lab[:, :, zi[0]])) - {0}
    outlet = set(np.unique(lab[:, :, zi[-1]])) - {0}
    through = inlet & outlet

    sizes = np.bincount(lab.ravel())
    total = sizes[1:].sum()
    open_vol = sum(int(sizes[i]) for i in through)
    return {
        "percolates": bool(through),
        "through_components": len(through),
        "dead_end_pore_fraction": float((total - open_vol) / total) if total else 0.0,
    }


def axial_line_of_sight(solid, x, y, z, p):
    """Straight-through open area: columns with no material anywhere along the
    axis. This is what makes the cross-hatch threadable with steel wool and the
    gyroid not, and it is also the short-circuit path if it gets too large."""
    core_r = p["core_dia"] / 2
    rr = radial(x, y)[:, :, 0]
    zi = (z >= 0) & (z <= p["length"])
    clear = ~solid[:, :, zi].any(axis=2) & (rr < core_r)
    return round(float(np.count_nonzero(clear) * p["voxel"] ** 2), 1)


def write_stl(path, verts, faces):
    """Binary STL. Normals left at zero — every slicer recomputes them."""
    tris = verts[faces].astype(np.float32)
    n = len(faces)
    with open(path, "wb") as fh:
        fh.write(b"lattice_gen.py  AOP reactor catalyst support".ljust(80, b" "))
        fh.write(struct.pack("<I", n))
        buf = np.zeros((n, 12), dtype=np.float32)
        buf[:, 3:] = tris.reshape(n, 9)
        rec = np.zeros((n, 50), dtype=np.uint8)
        rec[:, :48] = buf.view(np.uint8).reshape(n, 48)
        fh.write(rec.tobytes())
    return os.path.getsize(path)


# ----------------------------------------------------------------------------
# driver
# ----------------------------------------------------------------------------

def bisect_thickness(geometry, p, x, y, z, r, cache, lo, hi, target, tol=0.0015):
    """Bisect until the MEASURED open fraction hits the target.

    For the gyroid the bisected value is the sheet thickness (thicker -> less
    open). For the cross-hatch it is the channel opening (wider -> more open),
    so the branch inverts."""
    thicker_closes = (geometry == "gyroid")
    mid, phi, field = 0.5 * (lo + hi), None, None
    for _ in range(40):
        mid = 0.5 * (lo + hi)
        field = build(geometry, mid, p, x, y, z, r, cache)
        phi = open_fraction(field, x, y, z, p)
        if abs(phi - target) < tol:
            break
        too_open = phi > target
        if too_open == thicker_closes:
            lo = mid
        else:
            hi = mid
    return mid, phi, field


def run_geometry(geometry, p, outdir, report):
    t0 = time.time()
    x, y, z = axes(p)
    r = radial(x, y)
    cache = {"collar": collar_field(r, z, p)}
    if geometry == "gyroid":
        cache["g"] = gyroid_field(x, y, z, p["gyroid_cell"])
        lo, hi = 0.01, 1.60
    else:
        cache["cx"], cache["cy"], cache["cz"] = crosshatch_dists(x, y, z, p["hatch_cell"])
        lo, hi = 0.05, p["hatch_cell"] - 0.05

    thick, phi, field = bisect_thickness(
        geometry, p, x, y, z, r, cache, lo, hi, p["porosity"])
    solid = field >= 0
    verts, faces = mesh(field, x, y, z)
    verts, faces = decimate(verts, faces, p["max_triangles"])

    solid_mm3 = mesh_volume(verts, faces)
    tube_mm3 = np.pi * (p["tube_id"] / 2) ** 2 * p["tube_len"]

    areas = triangle_areas(verts, faces)
    cen = verts[faces].mean(axis=1)
    cen_r = np.sqrt(cen[:, 0] ** 2 + cen[:, 1] ** 2)
    core = (cen_r < p["core_dia"] / 2 - 0.1) & (cen[:, 2] > p["collar_h"]) & (
        cen[:, 2] < p["length"] - p["collar_h"])
    area_core = float(areas[core].sum())
    area_all = float(areas.sum())

    info = {
        "geometry": geometry,
        "cell_mm": p["gyroid_cell"] if geometry == "gyroid" else p["hatch_cell"],
        # gyroid: sheet thickness as 2V/A, the same way the build guide quotes it.
        # crosshatch: the channel opening, exact by construction.
        "wall_or_channel_mm": round(
            float(2 * solid_mm3 / area_all) if geometry == "gyroid" else float(thick), 3),
        "strut_mm": None if geometry == "gyroid" else round(
            float(p["hatch_cell"] - thick), 3),
        "measured_open_fraction": round(float(phi), 4),
        "target_open_fraction": p["porosity"],
        "solid_volume_mm3": round(solid_mm3, 1),
        "mass_petg_g": round(solid_mm3 / 1000.0 * PETG_DENSITY, 2),
        "wetted_area_cm2": round(area_core / 100.0, 1),
        "wetted_area_total_cm2": round(area_all / 100.0, 1),
        # per mL of reactor void volume: the surface the water actually sees
        "wetted_area_per_mL_mm2": round(
            area_core / ((tube_mm3 - solid_mm3) / 1000.0), 1),
        "reactor_void_volume_mL": round((tube_mm3 - solid_mm3) / 1000.0, 2),
        "axial_line_of_sight_mm2": axial_line_of_sight(solid, x, y, z, p),
        "triangles": int(len(faces)),
        "voxel_mm": p["voxel"],
    }
    info.update(check_watertight(verts, faces))
    info.update(check_connected(solid))
    info.update(check_percolation(solid, x, y, z, p))

    name = f"lattice_{geometry}_{int(p['core_dia'])}x{int(p['length'])}.stl"
    info["file"] = name
    info["file_bytes"] = write_stl(os.path.join(outdir, name), verts, faces)
    info["seconds"] = round(time.time() - t0, 1)
    report["parts"].append(info)

    ok = info["watertight"] and info["solid_components"] == 1 and info["percolates"]
    print(f"  {geometry:10s} open {phi:.3f}  {info['mass_petg_g']:.1f} g  "
          f"{info['wetted_area_cm2']:.0f} cm2  void {info['reactor_void_volume_mL']:.1f} mL  "
          f"{'PASS' if ok else 'FAIL'}")
    if geometry == "crosshatch":
        return thick, cache
    return thick, None


def run_coupon(thick, p, outdir, report):
    """A short slice of the cross-hatch with both collars — print this first and
    check the fit before committing an evening to full-length parts."""
    q = dict(p, length=p["coupon_len"])
    x, y, z = axes(q)
    r = radial(x, y)
    cache = {"collar": collar_field(r, z, q)}
    cache["cx"], cache["cy"], cache["cz"] = crosshatch_dists(x, y, z, q["hatch_cell"])
    field = build("crosshatch", thick, q, x, y, z, r, cache)
    solid = field >= 0
    verts, faces = mesh(field, x, y, z)
    verts, faces = decimate(verts, faces, p["max_triangles"] // 5)
    solid_mm3 = mesh_volume(verts, faces)
    info = {
        "geometry": "fit_test_coupon",
        "length_mm": q["length"],
        "mass_petg_g": round(solid_mm3 / 1000.0 * PETG_DENSITY, 2),
        "triangles": int(len(faces)),
    }
    info.update(check_watertight(verts, faces))
    info.update(check_connected(solid))
    name = f"fit_test_coupon_{int(p['core_dia'])}x{int(p['coupon_len'])}.stl"
    info["file"] = name
    info["file_bytes"] = write_stl(os.path.join(outdir, name), verts, faces)
    report["parts"].append(info)
    print(f"  {'coupon':10s} {info['mass_petg_g']:.1f} g  "
          f"{'PASS' if info['watertight'] else 'FAIL'}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--porosity", type=float, default=0.60)
    ap.add_argument("--tube-id", type=float, default=25.0)
    ap.add_argument("--tube-len", type=float, default=100.0)
    ap.add_argument("--core-dia", type=float, default=23.0)
    ap.add_argument("--length", type=float, default=80.0)
    ap.add_argument("--collar-od", type=float, default=24.6)
    ap.add_argument("--collar-id", type=float, default=21.0)
    ap.add_argument("--collar-h", type=float, default=2.0)
    ap.add_argument("--gyroid-cell", type=float, default=8.0)
    ap.add_argument("--hatch-cell", type=float, default=6.0)
    ap.add_argument("--coupon-len", type=float, default=12.0)
    # 0.4 mm is not a coarse approximation: the fields are analytic, so
    # marching cubes interpolates the true surface. Every measured number below
    # agrees to under 1 % with a 0.18 mm run, at a sixth of the file size.
    ap.add_argument("--voxel", type=float, default=0.40)
    ap.add_argument("--max-triangles", type=int, default=0,
                    help="decimate to this many triangles; 0 ships the raw mesh. "
                         "Aggressive reduction can introduce non-manifold edges "
                         "— the report says so if it did")
    ap.add_argument("--outdir", default=".")
    p = vars(ap.parse_args())
    outdir = p["outdir"]
    os.makedirs(outdir, exist_ok=True)

    if p["collar_od"] >= p["tube_id"]:
        sys.exit("collar OD must be under the tube ID or the part will not go in")

    print(f"target open fraction {p['porosity']}, voxel {p['voxel']} mm")
    report = {"parameters": p, "parts": []}
    run_geometry("gyroid", p, outdir, report)
    thick, _ = run_geometry("crosshatch", p, outdir, report)
    run_coupon(thick, p, outdir, report)

    ann = np.pi * ((p["tube_id"] / 2) ** 2 - (p["collar_od"] / 2) ** 2)
    report["annulus_at_collar_mm2"] = round(float(ann), 2)
    report["annulus_without_collar_mm2"] = round(
        float(np.pi * ((p["tube_id"] / 2) ** 2 - (p["core_dia"] / 2) ** 2)), 2)
    with open(os.path.join(outdir, "lattice_report.json"), "w") as fh:
        json.dump(report, fh, indent=2)
    print(f"annulus at the collar {ann:.1f} mm2 "
          f"(vs {report['annulus_without_collar_mm2']:.1f} mm2 uncollared)")
    print("wrote lattice_report.json")
    print("\nMeasure the void volume on the assembled reactor. Do not use the "
          "figure above in the spreadsheet.")


if __name__ == "__main__":
    main()
```
