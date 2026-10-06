# Removed Is Not Safe

Science fair research project (Synopsys → CSEF → ISEF, 2027). **Question:** when a wastewater plant chlorinates water containing the antibiotic ciprofloxacin (cipro) and then removes the chlorine with sodium bisulfite, does antibacterial activity survive, and can a chemistry model find plant settings that keep it low?

Plain-language background: chlorine turns cipro into "N-chloro-cipro" in under a second. That breaks apart over about 15–20 minutes into products that all keep the quinolone core, the part of cipro that attacks bacteria (Dodd et al. 2005). Removing chlorine with sulfite or thiosulfate may turn leftover N-chloro-cipro back into cipro. Dodd suggested this in 2005, but nobody has measured how fast it happens with bisulfite, the chemical San José's plant uses.

## What's here

| Path | What it is |
|---|---|
| `ris/chlorine_backbone.py` | Chlorine chemistry: HOCl/OCl⁻ split by pH, chloramine formation, chlorine demand, CT |
| `ris/cipro_model.py` | Cipro reactions with Dodd 2005 constants (page numbers in comments); `run_batch()` runs one beaker experiment |
| `ris/flow_reactor.py` | Contact chamber as N mixed tanks in series; tracer-test fitting; `run_flow()` |
| `notebooks/01_chlorine_backbone.ipynb` | D1: chlorine only |
| `notebooks/02_cipro_reactions.ipynb` | D2: cipro chemistry, graphs, sensitivity test |
| `notebooks/03_flow_reactor_validation.ipynb` | D3: validation against Dodd Fig. 5a, flow checks, tracer fit, mixing comparison |
| `tests/test_model.py` | Automatic checks (mass balance, textbook flow answers, published-data match) |
| `data/published/` | Data taken from papers (`dodd2005_fig5a.csv` is pixel-estimated, to be re-digitized) |
| `data/lab/` | Our own measurements (tracer test, HPLC, DPD, plates) |
| `figures/` | Saved graphs |

**Constants live only in the `ris/*.py` files.** Notebooks import them, so a change in one place updates everything. Every constant is listed with its source in the comments and in the project's rate-constant sheet.

## Run it

```bash
pip install -r requirements.txt
python -m pytest -q                 # all checks should pass
jupyter notebook notebooks/         # or open the .ipynb files in VS Code
```

## Status (Oct 2026)

- D1–D3 built. Checkpoint A provisionally passes: the model matches Dodd's real-water data within about 8–14% with nothing fitted. An independent lab (Jasper 2016) differs by 35% on the key breakdown speed.
- Unknowns that matter most (from the sensitivity test): the bisulfite reversal speed (Gap 2) and the breakdown speed near pH 7–8. Both will be measured by HPLC-UV.
- Placeholders are labelled `PLACEHOLDER`, `ESTIMATE` or `UNKNOWN` in the code.

## Key sources

- Dodd, Shah, von Gunten & Huang 2005, *Environ. Sci. Technol.* 39:7065–7076, doi 10.1021/es050054e
- Jasper, Shafaat & Hoffmann 2016, *Environ. Sci. Technol.*, doi 10.1021/acs.est.6b02912 (Supporting Information)
- Qiang & Adams 2004, *Environ. Sci. Technol.* 38:1435, doi 10.1021/es0347484

## Working together

- Claude writes and runs the code, then pushes here. Pull before you start: `git pull`.
- Put new lab data in `data/lab/` as CSV with a short note on how it was collected (date, who, instrument, units).
- Don't edit numbers inside notebooks; change constants in `ris/*.py` and re-run.
- Predictions for blind tests go in `predictions/` with a timestamped commit **before** the experiment runs.
