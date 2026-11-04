# Second project: Bay Area pharmaceutical persistence (ML)

Computational screen predicting which FDA-approved drugs accumulate in Bay Area wastewater effluent.

- Data: 72-compound effluent dataset (2016–17 Bay Area / BACWA–SFEI study), PubChem SMILES, RDKit descriptors, Medicare Part D California prescription volume.
- Best model: Ridge on logP + ca_rx_volume, LOO R² = 0.233, RMSE 0.718 (n≈50). Spearman logP r = −0.534.
- Finding: logP negatively predicts effluent concentration via biosolid sorption.
- Screened 1,717 FDA small molecules; top 25 (Pravastatin #1); bootstrap: 19/25 stable.
- Local files on the Mac: `~/Documents/bay_area_pharma/` (conda env `chem_research`).
- GitHub: Suryansh-Gupta/bay-area-pharma-research (private), Suryansh-Gupta/Bay-Area-Pharmaceutical-Pollution (public). The setup script clones the private one into `code/` if your GitHub login allows.
- Workflow: runs as the multi-agent "chemflow" workflow; a slimmed "chemflow-slim" trial on Claude was chosen, with a private repo for its state (GitHub has Suryansh-Gupta/Chem-Flow).
- Competition plan: possibly Genius Olympiad; see `judge-feedback.md` for required fixes.
