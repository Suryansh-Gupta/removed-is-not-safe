---
name: ui-review
description: Review a change to the Advisor or Twin pages in web/ by opening the page and checking it against the design, smoothness and honesty rules in web/CLAUDE.md. Use after any edit to web/*.html, web/optimizer/*, web/twin/* or tokens.css, and before saying a UI change is done.
argument-hint: [page, e.g. optimizer.html or twin/twin.html]
---

# Review a UI change

Page to review: `$ARGUMENTS` (default: the page you just changed). Rules being checked: `web/CLAUDE.md`.
Reading the code is not a review. **Open the page and look at it.** If you can't open it, say so and stop; don't report a pass.

## 1. Open it
- Serve the folder for the browser tool: `python3 -m http.server 8770 --directory web`, then open `http://127.0.0.1:8770/<page>`.
- Take screenshots at: 1280×720 light, 1280×720 dark, 375 px wide. Look at each one before going on.

## 2. Machine checks (report the actual result of each)
- Console: zero errors and warnings after load and after changing two inputs.
- Network: every request goes to 127.0.0.1. Any other host is a failure (fonts and three.js must be local).
- `grep -nE '#[0-9a-fA-F]{3,8}\b|border-radius|box-shadow|gradient|backdrop-filter' ` over the changed HTML/CSS/JS, outside `tokens.css`: each hit needs a reason or a fix.
- `grep -niE 'unlock|seamless|powerful|robust|leverage|empower|cutting-edge|revolutionary|insights|journey|effortless|AI-powered|!</'` over visible text: zero hits.
- "Do not claim" phrases: zero hits for "first to", "unsafe", "means safe", "validated for all".

## 3. Look at the screenshots and answer each in one line
**Impact**
- Cover everything but the first screen for five seconds' worth of looking. What is the finding? If the answer isn't "the lowest setting that passes, and the drug-only pick fails", the hierarchy is wrong.
- Is the map (Advisor) or the vial timeline (Twin) the largest thing on the page?

**Instrument, not website**
- Any card, shadow, rounded corner, gradient, pill, decorative icon or KPI tile?
- Does every coloured mark mean pass / over limit / CT short / error? Name any that doesn't.
- Do left edges line up? Is spacing on the 4 px steps? More than four text sizes or two weights?
- Do numbers have units, tabular figures and sensible precision?
- Are chart lines labelled directly, with units on the axes?

**Words**
- Read every sentence. Could it sit unchanged on another product's page? Rewrite it with the number and the unit.
- Is any panel explained by a paragraph? Is anything essential hidden in a tooltip?

**Honesty**
- Does every number come from the model or `sources.js`? Trace three at random.
- If a placeholder changes the answer, is the banner showing and naming it?

**Smooth**
- Change an input: does the page respond within about 150 ms without freezing or jumping?
- Force each state and look at it: nothing passes, invalid input, drug-only pick also passes. Does each say what to change?
- Reload and press back: same view?
- Tab through the page: is focus always visible, and can the map be driven by arrow keys?

## 4. Report
A short table: check, result, evidence (screenshot or command output). Then the fixes, worst first. Fix what the rules
clearly require; anything that's a matter of taste or changes what the page claims goes to Suryansh as a question.
Don't write "looks good" without the table.
