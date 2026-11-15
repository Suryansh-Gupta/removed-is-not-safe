---
name: demo-check
description: Rehearse the 60-second booth demo of the Advisor and Twin end to end, offline, and report what a judge would see. Use before the prototype is shown to a teacher, mentor, judge or anyone outside the team, and before a milestone is called done.
disable-model-invocation: true
---

# Demo check

The demo path is in `docs/prd-prototypes.md`, section 3 (research folder). This skill walks it the way a judge would
see it and reports honestly. A step that can't be run is reported as "not checked", never as a pass.

## 1. Ground truth first
1. `git status`: say which branch and whether there are uncommitted changes.
2. `node -v` (need v22+), then `.venv/bin/python -m pytest -q`. Report passed / failed / **skipped**. Any skip or failure: stop here and report it.

## 2. Walk the path
Serve `web/` locally and open the Advisor in the browser tool at 1280×720. For each step, take a screenshot and write what is on screen.

1. **Open, touch nothing.** Three regions? ● and ○ both visible and labelled? Read the verdict sentence out exactly. Time from load to finished map.
2. **Select ○.** Does the time course show cipro near zero with predicted activity above the limit line? Is the limit line labelled?
3. **Open "How sure is this?"** Are the pass/fail results there? Does the banner name the placeholders in play?
4. **Go to the Twin from the bench preset.** Same settings carried over? Five vials at 0 / 7.5 / 15 / 22.5 / 30 min with predicted readings? Scrub the timeline end to end.

## 3. Things that sink a demo
- **Offline:** list every network request during the walk. Any host other than 127.0.0.1 fails. Then open the page by `file://` path as well (`open web/optimizer.html`) and confirm it renders with the right fonts.
- **Console:** zero errors or warnings during the whole walk.
- **Projector:** repeat step 1 in dark mode and at 375 px wide.
- **Hard questions:** for each, point to where the page answers it, or say it doesn't:
  - "Where does this number come from?" (Sources panel)
  - "Did you measure the activity?" (banner, "model-predicted")
  - "Is 300 the plant's real CT?" (labelled as an example)
  - "What if the products are weaker than you assumed?" ("How sure" strip)
- **Claims:** search the visible text for the "Do not claim" phrases.

## 4. Report to Suryansh
- One line: ready to show, or not.
- The four steps with a screenshot each and the time taken.
- Every failure and "not checked" item, worst first.
- Don't fix anything in this skill. List the fixes and ask which to do.
