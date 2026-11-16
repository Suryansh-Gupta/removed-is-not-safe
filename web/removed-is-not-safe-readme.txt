REMOVED IS NOT SAFE  -  release 1.0  (15 November 2026)
by Ritik Shenoy and Suryansh Gupta
=====================================================================

OPEN THE APP
  Online (any phone or computer, nothing to install):
    https://claude.ai/artifact/RVUgX4mjirhzu9cMeU1K67

  Offline:
    Open removed-is-not-safe.html (in this folder) in any web browser.
    It is one self-contained file. Fonts load from the internet; without
    a connection the app still works with system fonts.

WHAT IT DOES
  Wastewater plants add chlorine to kill germs. Chlorine also breaks
  down antibiotics in the water, but "removed" (the parent drug gone)
  is not the same as "safe": breakdown products can still carry
  antibiotic activity. The app finds the lowest chlorine dose that
  meets BOTH the disinfection target AND a limit on leftover
  antibiotic activity, then tells you how much bisulfite you need to
  remove the chlorine before discharge.

---------------------------------------------------------------------
1. FIND MY DOSE  (bottom tab: "Find dose")
---------------------------------------------------------------------
  Step 1  Tap "Find my dose" on the start screen.
  Step 2  Enter your plant readings. Use the sliders or type a value.
          Tap the small "i" next to any item for what it is and how to
          measure it.
            - pH                      (pH meter or probe on the contact basin)
            - Ammonia, mg/L as N      (lab test or online analyser)
            - Water temperature, C
            - Contact time, minutes   (basin volume / flow)
            - Antibiotic in, ug/L     (lab result; use a typical value if unknown)
          Tap Next.
  Step 3  Pick the rule you follow. One tap takes you to the result.
            - Discharge to a river or bay  (example target 300 mg.min/L)
            - Recycled water (California Title 22): 450 mg.min/L and 90 min
            - My own target: type the number from your permit
          The rule you used last time is marked "Last used".

  READING THE RESULT
    Big number   = chlorine dose to add, in mg/L, and how long to hold it.
    Green tag    "Meets both limits" = safe to use.
    Amber tag    = no dose meets both limits at these conditions; the
                   screen says which limit fails and what to change.
    Four steps   Dose -> Contact -> Dechlorinate (bisulfite, mg/L) -> Outfall.
    Two bars     Disinfection (must reach the target line) and
                 Antibiotic activity left (must stay under the limit line).
    pH chips     Tap a different pH to see how the dose would change.
    "How sure is this?"   Shows which model checks pass.
    "See every dose and time"   Full map of every dose/time combination.

  Save keeps the result in the "Saved" tab. Copy puts a text summary
  on your clipboard to paste into a log or email.

---------------------------------------------------------------------
2. AUTOPILOT  (bottom tab: "Autopilot")
---------------------------------------------------------------------
  Watches the plant and keeps the dose at the lowest safe level as
  flow, pH and ammonia change through the day.

  Modes
    Auto     sets the dose on its own.
    Suggest  shows a suggested dose; you accept it.
    Hold     freezes the dose where it is.

  The chart shows the dose over recent hours. Fill in basin volume and
  flow so contact time is worked out correctly.

  Dosing pump
    Tap Connect to look for a pump controller over USB or the plant
    network. THIS RELEASE HAS NO PUMP LINK, so the scan always ends in
    "No pump found". Set the pump by hand to the dose on screen.

  IMPORTANT: Autopilot in this release runs on a SIMULATED plant.
  A full day of flow, pH and ammonia replays every 24 minutes. It is a
  demonstration of the control logic, not live plant data.

---------------------------------------------------------------------
3. SAVED  (bottom tab: "Saved")
---------------------------------------------------------------------
  Every saved result with its date and inputs. Tap one to reopen it.
  Saves are stored in this browser on this device only.

---------------------------------------------------------------------
HANDOFF NOTES (for whoever works on this next)
---------------------------------------------------------------------
  Files
    removed-is-not-safe.html   the whole app, one file
    readme.txt                 this file
  Source repo
    https://github.com/Suryansh-Gupta/removed-is-not-safe
    Branch: release/v1.0  ->  web/removed-is-not-safe.html
  Inside the HTML
    model.js, optimizer/engine.js and optimizer/charts.js from web/
    are inlined unchanged. To rebuild after editing those, paste them
    back over the matching blocks.
  Storage
    Browser localStorage key "chlorine-studio-v1".
  Known limits
    - No real pump connection (scan is honest: it never connects).
    - Autopilot plant is simulated.
    - Model numbers are predictions, not compliance decisions. Always
      confirm against your permit and lab results.
  Accessibility
    Respects the phone's "reduce motion" setting.
