"""Add one lab measurement file to data/lab/ with its required note.

Usage:
  python scripts/add_lab_data.py SOURCE.csv NAME --date YYYY-MM-DD --who "Ritik, Suryansh"
         --instrument "Waters 2695 HPLC-UV, C18" --units "time_min=min,cipro=ug/L"
         [--method "..."] [--notes "..."] [--data-dir data/lab] [--force]

Copies the CSV to data/lab/<date>_<NAME>.csv and writes data/lab/<date>_<NAME>.md, the note the
project requires (date, who, instrument, units).  Checks first:
  - the CSV parses and has a header row
  - every column has a unit (use "-" for unitless columns like sample IDs)
  - no unit is given for a column that isn't in the file
  - it reports empty cells and non-numeric values in unit-bearing columns as warnings
Does not change the measured values.  Does not commit.
"""
import argparse, csv, datetime as dt, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def show(p):
    """Path relative to the repo when inside it, else absolute."""
    try:
        return p.relative_to(ROOT).as_posix()
    except ValueError:
        return str(p)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("name")
    ap.add_argument("--date", required=True)
    ap.add_argument("--who", required=True)
    ap.add_argument("--instrument", required=True)
    ap.add_argument("--units", required=True, help='"column=unit,column=unit"; "-" for unitless')
    ap.add_argument("--method", default="")
    ap.add_argument("--notes", default="")
    ap.add_argument("--data-dir", default="data/lab")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)

    errors, warnings = [], []
    try:
        dt.date.fromisoformat(a.date)
    except ValueError:
        errors.append(f"--date must be YYYY-MM-DD, got {a.date!r}")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,60}", a.name):
        errors.append("NAME must be lowercase letters, digits, - or _")
    src = pathlib.Path(a.source).expanduser()
    if not src.is_file():
        errors.append(f"{src} not found")
    if errors:
        sys.exit("\n".join(errors))

    with src.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if len(rows) < 2:
        sys.exit("CSV needs a header row and at least one data row")
    header = [h.strip() for h in rows[0]]
    data = rows[1:]

    units = {}
    for pair in [p for p in a.units.split(",") if p.strip()]:
        if "=" not in pair:
            sys.exit(f"--units entry needs column=unit, got {pair!r}")
        k, v = pair.split("=", 1)
        units[k.strip()] = v.strip()
    missing = [h for h in header if h not in units]
    extra = [k for k in units if k not in header]
    if missing:
        errors.append(f"No unit given for column(s): {', '.join(missing)} (use '-' if unitless)")
    if extra:
        errors.append(f"Unit given for column(s) not in the file: {', '.join(extra)}")
    if errors:
        sys.exit("\n".join(errors))

    for i, r in enumerate(data, start=2):
        if len(r) != len(header):
            warnings.append(f"row {i}: {len(r)} cells, header has {len(header)}")
        for h, cell in zip(header, r):
            if cell.strip() == "":
                warnings.append(f"row {i}, {h}: empty")
            elif units[h] != "-":
                try:
                    float(cell)
                except ValueError:
                    warnings.append(f"row {i}, {h}: not a number ({cell!r})")

    out_dir = ROOT / a.data_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{a.date}_{a.name}"
    csv_out, md_out = out_dir / f"{stem}.csv", out_dir / f"{stem}.md"
    if (csv_out.exists() or md_out.exists()) and not a.force:
        sys.exit(f"{stem} already exists in {a.data_dir}; pick another name or pass --force")
    shutil.copyfile(src, csv_out)

    lines = [f"# {stem}", "",
             f"- **Date measured:** {a.date}",
             f"- **Who:** {a.who}",
             f"- **Instrument:** {a.instrument}",
             f"- **Data file:** `{csv_out.name}` ({len(data)} rows, copied unchanged from `{src.name}`)",
             f"- **Added:** {dt.date.today().isoformat()}", "",
             "## Columns and units", "", "| Column | Unit |", "|---|---|"]
    lines += [f"| {h} | {units[h]} |" for h in header]
    if a.method:
        lines += ["", "## Method", "", a.method]
    if a.notes:
        lines += ["", "## Notes", "", a.notes]
    if warnings:
        lines += ["", "## Checks when added", ""] + [f"- {w}" for w in warnings]
    md_out.write_text("\n".join(lines) + "\n")

    print(show(csv_out))
    print(show(md_out))
    for w in warnings:
        print("WARNING:", w, file=sys.stderr)


if __name__ == "__main__":
    main()
