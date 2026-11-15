# Reactor parts: Ritik's half of the order (Nov 10, 2026)

Paste this whole file into your AI and ask it to help you find and check each item before you buy.

> **ON HOLD (Nov 10, 2026): do not order anything on this list yet.** The team decided to collect all core data with a simple stirred batch reactor first. The pump-driven coil reactor below is now an optional validation test for late January. Suryansh and Ritik decide in mid-January whether to build it; if yes, order by early January.

## What this is for

Ritik Shenoy and Suryansh Gupta are building a small lab reactor for a science fair project ("Removed Is Not Safe"). Water with an antibiotic (ciprofloxacin) is mixed with dilute bleach and pumped slowly (about 1 mL per minute) through a coil of PTFE tubing. Two stepper-motor peristaltic pumps move the liquid. An Arduino makes the motor step pulses, and a laptop running the team's Python program (`pumpctl`) tells the Arduino how fast to go over USB.

The shopping list is split in two. **Suryansh buys the tubing, fittings and mounting parts. Ritik buys the pumps and electronics below.** Don't buy anything that isn't on this list, so nothing gets bought twice.

## Ritik's list: pumps and electronics

Prices are estimates unless marked. "Search" is what to type into Amazon.

| # | Item | Qty | Search | Must check before buying |
|---|---|---|---|---|
| 1 | Kamoer KCS PLUS 24 V stepper peristaltic pump, 8 rollers, BPT tube 2 × 4 mm (≈ $70 each) | 2 | `Kamoer KCS PLUS 24V stepper peristaltic pump BPT` | Listing says **24 V stepper** motor (not DC motor, not 12 V) and **BPT** tubing **2 × 4 mm**. The motor should have **4 bare wires** and no control board of its own. |
| 2 | Spare BPT pump tube for that pump, 2 × 4 mm (≈ $15) | 1 set | `Kamoer BPT pump tube 2x4mm` | Same 2 × 4 mm size and fits the KCS PLUS. **BPT (PharMed)**, not silicone: chlorine attacks silicone. |
| 3 | TMC2209 stepper driver module | 1 five-pack | `TMC2209 stepper driver module` | **Pins already soldered** (so it plugs into a breadboard). StepStick-style board. |
| 4 | 24 V power supply, 3 A or more | 1 | `24V 3A power supply 5.5x2.1mm` | **24 V**, **3 A or more**, barrel plug **5.5 × 2.1 mm**, US wall plug. |
| 5 | DC barrel jack to screw terminal adapter | 1 | `DC barrel jack to screw terminal adapter 5.5x2.1` | **5.5 × 2.1 mm**, female (the supply plugs into it). |
| 6 | Inline DC power switch (the emergency stop for the 24 V) | 1 | `inline DC power switch 5.5x2.1` | **5.5 × 2.1 mm**, rated at least **24 V and 3 A**. |
| 7 | Arduino UNO R4 Minima (≈ $20) | 1 | `Arduino UNO R4 Minima` | Genuine R4 Minima preferred. An **Uno R3 or a CH340 clone** also works if the R4 is unavailable, but then the cable in #8 must be **USB-B** instead of USB-C. |
| 8 | USB-C data cable | 1 | `USB C data cable` | Says **data** (charge-only cables won't work). USB-C on the Arduino end; the other end must fit the laptop that will run the reactor. |
| 9 | Breadboard and jumper wire kit | 1 | `breadboard jumper wire kit` | Full-size breadboard, includes male-to-male jumper wires. |
| 10 | 22 AWG solid hookup wire kit | 1 | `22 AWG solid hookup wire kit` | **Solid core** (not stranded), several colors. |
| 11 | 2-pin screw terminal blocks | 1 pack | `screw terminal block 2 pin` | Breadboard-friendly (5.08 mm or 5 mm pitch). |
| 12 | 100 µF electrolytic capacitors (≈ $10) | 1 pack | `100uF 35V electrolytic capacitor` | Rated **35 V or higher** (50 V is fine). Need 2. |
| 13 | Resistor assortment kit (≈ $6) | 1 | `resistor assortment kit` | Includes **10 kΩ**. Need 1. |
| 14 | Digital multimeter (≈ $20) | 1 | `digital multimeter` | Measures DC volts. Used to set each driver's current. |
| 15 | Precision screwdriver set | 1 | `precision screwdriver set` | Includes small flat-head bits (for the driver's tiny adjustment screw and screw terminals). |
| 16 | Wire stripper | 1 | `wire stripper` | Handles **22 AWG**. |

Rough total of the items with prices: about $260. The rest are usually cheap.

## Rules

- **Specs matter more than brands**, except the pump (#1). Any brand of the other items is fine if it meets the "must check" column.
- If an item is out of stock or the listing doesn't match the specs, **ask Suryansh before substituting** anything on the pump, driver, power supply or Arduino lines. These all have to work together.
- **After each order, update the shared Google Sheet "Reactor Parts Order Tracker"** (Suryansh shares the link): set Status to Ordered, and fill in Price paid, Tax + shipping, Store and Ordered on. Set Status to Arrived when it comes. The totals at the top update by themselves.
- Keep receipts. The project may need them for the fair's cost table.

## Not on your list (Suryansh is buying these)

PTFE tubing, push-fit tees, shut-off valves, push-fit to 1/8″ NPT adapters, 1/16″ hose barbs, 4″ PVC pipe, thread tape, zip ties, tubing cutter, tape measure, jugs, step drill bit, plywood board, M3 nylon standoffs, mounting tape.

## Not buying yet

Chemicals, chlorine test kits, lab supplies, the second PTFE roll and the static mixer.

## If your AI wants more detail

The wiring and setup instructions are in the GitHub repo `Suryansh-Gupta/removed-is-not-safe`, file `controller/README.md` (pins: STEP D2/D3, DIR D4/D5, EN D8 with a 10 kΩ pull-up to 5 V; driver MS1, MS2 and VIO to 5 V; 100 µF capacitor across each driver's motor power).
