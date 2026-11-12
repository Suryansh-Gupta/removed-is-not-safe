# Chlorination Settings Optimizer: build contract

Three files are built in parallel by different people. This file is the interface between them. Do not change
a signature here; if something is impossible, build the closest thing and say so in your report.

Files and owners (touch only your own):
- `web/optimizer/tokens.css`  design tokens (done, read-only)
- `web/optimizer/engine.js`   search engine, global `RISOPT` (also `module.exports`)    owner: ENGINE
- `web/optimizer/charts.js`   charts, global `RISCHART`                                 owner: CHARTS
- `web/optimizer.html` + `web/optimizer/app.js`  page, styles, wiring                   owner: UI
- `web/model.js`              existing chemistry model, global `RIS` (read-only, never edit)

Script order in the page: `model.js`, `optimizer/engine.js`, `optimizer/charts.js`, `optimizer/app.js`. No bundler, no
framework, no CDN libraries. Plain ES2020 that runs from `file://` and in Node 22.

## Who uses it
A process engineer at a wastewater plant who sets chlorine dose and contact time. Question they ask: "What is the
lowest chlorine dose that still disinfects AND leaves antibacterial activity under the limit?"
The user asked for: simple, uncluttered, a joy to use, not a hassle. Few controls, one map, one clear answer.

## Inputs (plain object)
```js
RISOPT.DEFAULT_INPUTS = {
  pH: 7.5,
  NH3_mgN_L: 0,            // ammonia in the water; > 0 switches the model to mode 'together'
  cipro_ugL: 1.0,          // influent ciprofloxacin, ug/L
  k_demand_per_h: 0.72,    // chlorine demand decay (model k_demand 2e-4 1/s)
  after_min: 5,            // time between bisulfite and discharge
  ctTarget: <number>,      // mg*min/L
  ctBasis: 'residual',     // 'residual' = total chlorine residual at end x contact time (plant convention)
                           // 'integral' = model's integral of free chlorine
  minContact_min: 0,       // regulatory minimum contact time (Title 22 preset uses 90)
  maxContact_min: 120,     // basin limit
  activityLimit_ugL: 0.064,// ug/L ciprofloxacin-equivalents (Bengtsson-Palme & Larsson 2016 PNEC)
  potency: { NCL: 1.0, P1: 0.4, P2: 0.05 },  // relative to cipro = 1. PLACEHOLDERS until the bioassay
  k_rev: 0,                // bisulfite reversal speed, 1/s. Unknown (Gap 2)
  doseRange: [0.5, 20], nDose: 40,           // mg/L as Cl2
  timeRange: [5, 120],  nTime: 24,           // minutes
};
RISOPT.PRESETS = [{ id, label, note, inputs /* partial, merged over defaults */ }, ...];
```
Presets (at least): Title 22 recycled water (CT 450 mg*min/L, >= 90 min modal contact), Secondary effluent discharge
(a lower site-specific CT), Bench batch reactor (cipro 1000 ug/L, limit scaled, the school lab run).
Defaults must give a map with all three regions visible and a feasible recommendation.

## Cell (one dose x contact-time point)
```js
{ dose, t,                       // mg/L, min
  ct, residual, freeResidual,    // mg*min/L (per ctBasis), total mg/L, free mg/L at end of contact
  cipro_ugL, ncl_ugL, p1_ugL, p2_ugL,   // after bisulfite + after_min (what leaves the plant)
  activity_ugL,                  // cipro + sum(potency_i x product_i), ug/L cipro-equivalents
  passCT, passActivity, pass,    // booleans (passCT includes minContact_min)
  passDrugOnly,                  // passCT && cipro_ugL <= activityLimit_ugL (what a parent-drug-only plan checks)
  bisulfite_mgL,                 // NaHSO3 needed to remove the residual (1.47 mg per mg Cl2)
  iDose, iTime }
```

## Engine API
```js
RISOPT.runGrid(inputs, { onProgress(frac) }) -> Promise<Grid>   // yields to the event loop so the page stays live
RISOPT.runGridSync(inputs) -> Grid
Grid = { inputs, doses: number[], times: number[], cells: Cell[][] /* [iDose][iTime] */,
         recommended: Cell|null,   // lowest dose with pass; ties -> shortest contact time
         drugOnly: Cell|null,      // lowest dose with passDrugOnly; ties -> shortest contact time
         counts: { pass, failCT, failActivity, failBoth }, ms }
RISOPT.evaluate(inputs, dose, contact_min) -> Cell (no iDose/iTime)
RISOPT.timecourse(inputs, dose, contact_min) -> { t_min: number[], residual: number[], cipro: number[], ncl: number[],
         p1: number[], p2: number[], activity: number[], quenchAt_min }   // runs through contact, then after_min past bisulfite
RISOPT.sensitivity(inputs, cell) -> [{ id, label, activity_ugL, ct, pass }]  // same setpoint under other assumptions:
         // bisulfite reversal slow / fast, product potencies x2 and /2, chlorine demand x2
RISOPT.toCSV(grid) -> string
RISOPT.lockCommand(inputs, cell) -> string   // a `python scripts/lock_prediction.py ...` line for this repo
RISOPT.fmt(value, kind) -> string            // kind: 'dose' | 'time' | 'ct' | 'ugL' | 'mgL'; sensible sig figs, no units
```

## Charts API
```js
RISCHART.operatingMap(container, grid, { selected: Cell|null, onSelect(cell) }) -> { update(grid, opts), destroy() }
RISCHART.timecourse(container, tc, { limit_ugL }) -> { update(tc, opts), destroy() }
```
Charts read colours from the CSS custom properties in tokens.css via getComputedStyle(container) at draw time, and
redraw on resize and on theme change (prefers-color-scheme change, and data-theme attribute change on <html>).

## Colour meaning (fixed)
- `--pass` blue: meets CT and activity limit
- `--warn` amber: CT met, activity over limit
- `--void` + `--void-hatch` (unfilled, diagonal hatch): CT short (with or without activity over limit)
- `--crit` red: errors only, never data
