---
name: add-lab-data
description: Add a lab measurement CSV to data/lab/ with its required note (date, who, instrument, units), check it, commit and push it, and flag what in the model or docs should use it.
disable-model-invocation: true
argument-hint: <path to CSV> [what was measured]
---

# Add lab data

Project rule: lab measurements go in `data/lab/` as a CSV plus a note giving **date, who, instrument, units**.

Arguments: `$ARGUMENTS`

Work in the code repo (`code/removed-is-not-safe/`). Use `.venv/bin/python` if it exists, otherwise `python3`.

## Steps

1. `git pull`.
2. Open the CSV and show the user its header and first rows. **Never change measured values.** If the file needs cleaning (merged cells, notes in the data rows), make the cleaned copy a separate file, tell the user exactly what you changed, and get a yes first.
3. Get from the user, without guessing: the date measured, who measured it, the instrument (with column/detector for HPLC, kit name for DPD, plate reader for the bioassay), and the unit of every column. A short name like `hplc-cipro-free-chlorine-run1`.
4. Run:
   ```bash
   .venv/bin/python scripts/add_lab_data.py <csv> <name> --date YYYY-MM-DD --who "..." \
     --instrument "..." --units "col=unit,col=unit" --method "..." --notes "..."
   ```
   Fix any error it reports. Show the user each WARNING; don't edit the data to make them go away.
5. Check `predictions/` for a locked prediction this experiment tests. If there is one, compare the measurement to it and report the result plainly, including a miss.
6. Commit and push the two new files: `git add data/lab/<stem>.csv data/lab/<stem>.md && git commit -m "Add lab data: <stem>" && git push`.
7. Follow the "propagate automatically" rule: list what should use this data (fits/constants in `ris/`, `scripts/run_all.py` figures, the web explorer, docs) and offer to update it. Log the result in `project-state.md` (`/log-result`).
