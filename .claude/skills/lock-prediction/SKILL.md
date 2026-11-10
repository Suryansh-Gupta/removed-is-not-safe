---
name: lock-prediction
description: Lock a blind-test prediction before an experiment runs. Runs the current committed model with the experiment's settings, writes a timestamped file in predictions/, then commits and pushes it so the git timestamp proves it came first.
disable-model-invocation: true
argument-hint: <short-name> <experiment settings in plain words>
---

# Lock a blind-test prediction

Project rule: **predictions go in `predictions/` with a timestamped commit BEFORE the experiment runs.** Committed prediction files are locked by a hook; never edit one. To revise, lock a new one that names the old file in its claim.

Arguments: `$ARGUMENTS`

All commands run in the code repo (`code/removed-is-not-safe/` from the research folder). Use `.venv/bin/python` if it exists, otherwise `python3`.

## Steps

1. `git pull` first.
2. **Pin down the settings with the user.** Turn their words into model inputs and show them as a table before running anything:
   - Beaker run → `--kind batch`: `pH`, `Cl_dose_mgL`, `NH3_mgN_L`, `cipro_mgL`, `contact_min`, `after_bisulfite_min` (`ris/cipro_model.py: run_batch`).
   - Contact chamber (tanks) → `--kind flow`: same plus `N` (`ris/flow_reactor.py: run_flow`).
   - Coiled tube → `--kind tube`: `tube_id_mm`, `tube_length_m`, `flow_mL_min`, optional `coil_diameter_mm`, plus chemistry inputs (`run_tube`).
   - Not a model output (e.g. "activity limit is X% inhibition") → `--kind none --claim "..."`.
   Don't guess a setting the user didn't give. Ask for it, or use the function's default and say so.
3. Make sure the model is committed (the script refuses otherwise). If `ris/` or `web/model.js` has changes, stop and ask whether to commit them first. Don't use `--allow-dirty` unless the user says so.
4. Run:
   ```bash
   .venv/bin/python scripts/lock_prediction.py <name> --kind <kind> --param key=value ... \
     --experiment "<what will be run, by whom, planned date>" --claim "<the prediction in one plain sentence>"
   ```
   The `--claim` must say what result would count as the model being right or wrong (e.g. "cipro left after bisulfite will be 40–70 µg/L; outside that range the model fails this test").
5. Show the user the file's `predicted` numbers and the claim, then commit and push only that file:
   ```bash
   git add predictions/<file>.json
   git commit -m "Lock prediction: <name> (before experiment)"
   git push
   ```
6. Report the file path, the commit hash and its timestamp (`git log -1 --format='%h %cI'`).
7. Add a dated line to "Decisions and results" in `project-state.md` (or use `/log-result`).
