# PRD: Settings Advisor + Batch Reactor Digital Twin

**Owner:** Suryansh Gupta (every research decision) · **Partner:** Ritik Shenoy · **Builder:** Claude Code
**Version:** 2 (2026-11-15, rewritten after a review against the real code) · **Status:** DRAFT. Section 10 decisions are open.
**Related:** build rules in `code/removed-is-not-safe/web/CLAUDE.md` · architecture in `docs/prototype-plan-app-and-twin.md` · status in `project-state.md` (it wins if anything here disagrees).

---

## 1. Problem
Plants judge chlorination by whether the **parent drug** (ciprofloxacin) disappears. Cipro reacts with free chlorine in under a second, but the products keep the quinolone core (Dodd et al. 2005) and may keep antibacterial activity, and bisulfite dechlorination may turn N-chloro-cipro back into cipro. A plan that checks only the parent drug can pick settings that look fine and aren't.

The model that predicts this exists and is tested. The lab reactor doesn't exist yet. We need something a judge, teacher or partner can **see and use now**, which gets more trustworthy as lab data arrives instead of being rebuilt.

## 2. The two prototypes
| | **Advisor** | **Twin** |
|---|---|---|
| One question | "What is the lowest chlorine dose and contact time that disinfects **and** keeps activity under the limit, and what would a drug-only check have picked?" | "What will my 500 mL batch run show at each sample time, and how do my real readings compare?" |
| Role in the project | The engineering result | The scientific method |
| Starts from | Branch `claude/gallant-johnson-3d7mdo` (engine, charts, three pages, 16 tests) | `docs/artifacts/batch-reactor-3d.html` + `web/model.js` |

Both sit on one model: `web/model.js`, held equal to `ris/*.py` by tests. They share one look and link to each other (the Advisor's "Bench batch reactor" preset opens the same run in the Twin).

## 3. The demo comes first
The prototype is judged in a booth conversation, so **the demo path is the product.** Anything on the path must be flawless; anything off it is lower priority.

**The 60-second path (laptop, no internet, no typing):**
1. **Open the Advisor.** Without touching anything, the map shows three regions and two markers: ● recommended and ○ the drug-only pick, sitting in amber. One sentence under the map says it in plain words, built from the model's numbers, in this shape: *"A check on the drug alone would accept [dose] mg/L for [time] min. The model predicts activity above the limit there."* (10 s)
2. **Click ○.** The time course shows cipro falling to near zero while predicted activity stays above the limit line. That picture is the project. (15 s)
3. **Open "How sure is this?"** The same setting under other assumptions, as pass/fail ticks. The banner says which numbers are placeholders until the bioassay. This is where a judge's hardest question gets answered before it's asked. (15 s)
4. **Switch to the Twin.** The same chemistry as the bench run we'll do: beaker, five vials, predicted readings per vial. "We lock this prediction before we run it." (20 s)

After lab data exists, step 4 gains the real points next to the predicted curve, and the step 3 banner shrinks.

## 4. Users
| User | What they need | Where |
|---|---|---|
| **Fair judge** (primary) | Get the blind spot in under a minute; see that nothing is made up; find the limits of the work stated honestly | Demo path |
| **Teacher / mentor** (next few weeks) | See the method and safety steps before approving lab work | Twin, Rehearse mode |
| **Suryansh and Ritik** | Plan runs, rehearse the bench routine, lock predictions, compare data | Twin; Advisor for the bench preset |
| **Plant process engineer** | A setpoint with its assumptions visible. This is the persona the Advisor's layout is designed for; nobody at a plant is using it | Advisor |

## 5. Goals and non-goals
**Goals**
- **G1 Impact.** A first-time viewer can state the finding within five seconds of the Advisor opening, with no clicks.
- **G2 Honesty.** Every model constant has a source and a status. Any result that depends on a placeholder says so where the result is shown.
- **G3 Smooth.** The demo path has no waits, jumps, dead ends or console errors, on wifi or off (section 7).
- **G4 Grows with the data.** Lab readings enter through the Twin and replace placeholders in the Advisor without UI changes.
- **G5 Looks like an instrument.** It reads as an engineering tool made by people who know the subject (section 8).

**Non-goals**
- Live plant control. The autopilot page is archived; it claims more than the data supports.
- Claims on the "Do not claim" list: "first to consider activity", "treated water is unsafe", "zero activity means safe", "validated for all treatments".
- Machine learning. The GP / Bayesian-optimization work keeps its own Jan 10 – Feb 5 slot. The Advisor is a grid search over a small model and says so.
- Phone-first layout. Target is a laptop at 1280×720 and up. It must not break on a phone.
- The chlorine-only beaker test. Held until Suryansh has talked to the teacher.

## 6. Requirements
**P0** = on the demo path, or the demo is dishonest without it · **P1** = before the fair · **P2** = only if time allows.

### 6.1 Advisor
| ID | Requirement | Pri | State today |
|---|---|---|---|
| A-1 | One page only (`optimizer.html`). `optimizer_app.html` and `autopilot.html` move to `web/archive/` | P0 | three pages on the branch |
| A-2 | **The default state tells the story:** three regions visible, ● not on an edge, ○ different from ● and over the activity limit | P0 | built; `test_default_map_tells_the_story` enforces it |
| A-3 | **Verdict sentence** under the map, generated from the two markers, updated on every change. Covers the other cases too (drug-only pick also passes; nothing passes) | P0 | new |
| A-4 | Operating map: dose × contact time; blue = meets CT and activity, amber = CT met and activity over limit, hatch = CT short; ● and ○ markers labelled on the map, no separate legend | P0 | built; ○ label to check |
| A-5 | Selected-point time course through contact → bisulfite → discharge, with the activity limit drawn as a line; CT, residual and bisulfite needed as numbers | P0 | built |
| A-6 | Inputs: pH, ammonia, influent cipro, chlorine demand, CT target and basis, min/max contact time, activity limit, time from bisulfite to discharge | P0 | built |
| A-7 | **Sources panel:** every model constant and preset value with value, unit, status and citation | P0 | new |
| A-8 | **Placeholder banner:** one line naming the placeholders that change the current answer; gone when none do. Results that depend on a placeholder carry a small mark | P0 | new |
| A-9 | "How sure is this?" strip: same setpoint with bisulfite reversal slow / fast, products ×2 / ÷2 as potent, demand ×2; pass/fail each | P0 | engine built (`RISOPT.sensitivity`) |
| A-10 | Presets: Secondary effluent discharge, Title 22 recycled water, Bench batch reactor. Each shows where its CT number comes from. The secondary preset's 300 mg·min/L is an **example**, and is labelled as one | P0 | built; labels to add |
| A-11 | "Open this run in the Twin" on the bench preset | P1 | new |
| A-12 | "Lock as prediction" (bench preset only, since that's the only one we can test): gives the `scripts/lock_prediction.py` command | P1 | engine built |
| A-13 | Setpoint in the URL hash; reload and back button restore it | P1 | to check |
| A-14 | Export the map as an image for the poster and slides, with the verdict sentence and date | P1 | new |
| A-15 | Keyboard: arrows move over the map, Enter selects, visible focus; cells have text labels for screen readers | P1 | to check |
| A-16 | CSV export of the grid | P2 | engine built |

### 6.2 Twin
| ID | Requirement | Pri |
|---|---|---|
| T-1 | Protocol facts (sample times 0 / 7.5 / 15 / 22.5 / 30 min, vial size, volume collected, quench agent and amount) in **one** file, each with its source. **Blocked on decision D-3** (vial size and quench amounts aren't settled for the batch run) | P0 |
| T-2 | Predict: choose dose, pH, ammonia, cipro and quench; get predicted values per vial. No Run button needed; it updates as inputs change | P0 |
| T-3 | One timeline scrubber drives everything on screen (charts, vial table, drawing) | P0 |
| T-4 | Flat view: a to-scale cross-section drawing, charts and a vial table. Complete without any 3D | P0 |
| T-5 | Instruments shown the way the real ones read: DPD chlorine at the kit's range and resolution (taken from the kit manuals, including when a sample must be diluted first); HPLC as **relative peak areas**, never mg/L of products; plate activity only as a labelled placeholder (see D-4) | P1 |
| T-6 | Lock the Twin's prediction for a planned run into `predictions/` before the run | P1 |
| T-7 | Rehearse: the bench routine as a timed checklist (what to do at each minute, which vial, how much). For the teacher conversation and practice | P1 |
| T-8 | 3D view from the existing batch-reactor page, driven by the same timeline, three fixed camera positions | P2 |
| T-9 | Compare: enter DPD / HPLC readings per vial; points appear on the predicted curves with error per point and overall | P1, when data exists |
| T-10 | Fit chlorine demand from blank-beaker DPD readings and hand it to the Advisor as MEASURED | P2, when data exists |

The 3D view dropped to P2 on purpose: the existing 3D page can be shown as it is, and the flat Twin carries the science.

### 6.3 Shared
| ID | Requirement | Pri |
|---|---|---|
| N-1 | All chemistry comes from `web/model.js`. No rate or constant is retyped anywhere | P0 |
| N-2 | **Fully offline.** No network requests at all: fonts (Archivo, OFL) and three.js (MIT) are saved in the repo. Today the Advisor pages load fonts from Google, so offline they'd fall back to Arial | P0 |
| N-3 | No build step, no framework, opens by double-click (`file://`) | P0 |
| N-4 | **Node 22 installed on every machine that builds this.** Without it the JS tests are skipped, and a skipped test is not a pass. On this Mac today: Node missing, 2 tests skipped, and none of the Advisor's 16 tests can run | P0 |
| N-5 | Tests: Advisor engine vs Python within 1% (existing); Twin vial values vs `run_batch` within 1%; Sources table vs the constants in code; protocol file vs `project-state.md` | P0 |
| N-6 | One set of design tokens for both (`web/optimizer/tokens.css`); light and dark | P0 |

## 7. "Smooth", defined
| Check | Target |
|---|---|
| First paint to finished default map | under 1 s on the demo laptop, no spinner |
| Changing an input | map and verdict update within 150 ms, or a coarse map appears at once and sharpens; the page never freezes |
| Layout | nothing shifts when results arrive, the banner appears or fonts load |
| Dead ends | none: every empty or error state says what to change, and "nothing passes" is a designed state |
| Recovery | reload, back button and a shared link all restore the same view |
| Console | zero errors and zero network requests on the demo path |
| Motion | only to show a change of state, 150 ms or less, off when the system asks for reduced motion |
| Screen sizes | 1280×720 projector, 13-inch laptop, and a 375 px phone without breaking |

## 8. Design requirements
Direction, already set in `tokens.css`: **a plant process drawing.** Flat sheet, ink lines, square corners, colour for status only. The detailed do/don't list and the review routine live in `web/CLAUDE.md` and the `/ui-review` skill, so there's one copy of the rules. The acceptance checks are:
1. **Five-second test:** three people who haven't seen it each state the finding after five seconds.
2. **Side-by-side:** next to a real plant HMI screen and a generic AI-made dashboard, it resembles the first.
3. **Colour audit:** every coloured mark maps to pass / over limit / CT short / error.
4. **Number audit:** every number on screen came from the model or the Sources panel.
5. **Words audit:** no sentence could appear unchanged on a different product's page.

## 9. Milestones (something showable at each one)
| When | Showable result | Work |
|---|---|---|
| **Step 0, now** | Tests really run | Install Node 22; merge the branch; all tests pass with none skipped (N-4, A-1) |
| Week of Nov 16 | Advisor opens offline in its final look | Fonts saved locally (N-2); archive the two extra pages; verdict sentence (A-3) |
| Nov 23 – Dec 6 | **Demo steps 1–3 work.** Show the teacher | Sources panel, banner, "How sure" strip, preset labels (A-7 to A-10); `/ui-review` pass |
| Dec 7 – Dec 20 | **Full 60-second path works** | Flat Twin (T-1 to T-4), instruments (T-5), link from the Advisor (A-11); `/demo-check` passes |
| Jan | Rehearsal tool for lab days | Rehearse and lock (T-6, T-7), poster export (A-14) |
| After first lab data | Real points on the curves | Compare and fit (T-9, T-10) |
| Before the fair | Booth-ready | `citation-checker` on the Sources panel; five-second test; full offline run-through |

## 10. Decisions for Suryansh
| # | Decision | If undecided, work proceeds with |
|---|---|---|
| D-1 | Advisor form: one workbench screen with the map, or one question per screen? | Workbench. It's the only form where the demo's step 1 needs no clicks |
| D-2 | Autopilot: archive it, or keep it as a "future work" picture on the poster? | Archive |
| D-3 | **Batch-run vial facts.** The batch reactor page and the open-items list say 2 mL amber vials. The Nov 1 v2 plan moved the coil to 4 mL vials with 3.0 mL collected and 150 µL of bisulfite stock, because 2 mL collected doesn't fit a capped 2 mL vial. Which applies to the batch run, and what are the quench amounts (the batch page still says "to set")? | **Nothing.** T-1 waits; logged under Conflicts in `project-state.md` |
| D-4 | Twin plate view: show predicted activity as a labelled placeholder now, or hide it until the bioassay exists? | Hide |
| D-5 | **Bench preset's activity limit.** The branch scales the 0.064 µg/L limit by the same fraction to 64 µg/L for a 1000 µg/L run. That scaling is a judgment call, not a published number. Keep it, change it, or show the bench preset without a limit? | Keep, labelled PLACEHOLDER |
| D-6 | Split with Ritik (suggestion: Ritik owns the protocol file and Rehearse mode, since they're the lab routine) | Not assigned |

## 11. Risks
| Risk | What we do about it |
|---|---|
| Placeholders read as results | Banner, marks on dependent results, "How sure" strip on the demo path (A-8, A-9) |
| "Optimizer" sounds like a buzzword (judge feedback #5) | Call it a grid search; the drug-only comparison is the point |
| The bioassay can't see 0.064 µg/L (judge feedback #1) | Activity near the limit is always written as "model-predicted" |
| The story disappears when real potencies arrive | It might. If the measured products are weak, ○ may pass. The verdict sentence handles that case and we report it; A-2 then changes with Suryansh's say-so, not silently |
| The example CT (300) is mistaken for the plant's | Labelled as an example in the preset and the Sources panel; the plant gave no numbers (Nov 9) |
| The Twin's schedule slips | The flat Twin is the P0; 3D is P2; the existing 3D page is the fallback for the demo |
| Tests silently skipped | N-4, and the build rules treat a skip as a failure |
