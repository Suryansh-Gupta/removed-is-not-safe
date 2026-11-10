# Pump controller (Arduino + laptop)

Sets each reactor pump to a flow in mL/min from its calibration, stops on a timer, and logs every run to `data/lab/`.

How it splits up: an **Arduino** makes the step pulses for both pumps (`firmware/pumpfw/`). A **laptop**, connected by USB, runs `pumpctl` (Python): calibration, flows, the run timer and the logs. The laptop tells the Arduino a step rate for each pump, and the Arduino keeps the pulses steady even when the laptop is busy.

**Safety net:** the Arduino has a watchdog. If the laptop goes quiet for 5 s (the program crashes, the laptop sleeps, the cable comes out), the Arduino stops both pumps and cuts motor power by itself. `pumpctl` checks in twice a second during runs.

This has **not been run on a real Arduino yet** (decided Nov 9, 2026, replacing the Raspberry Pi 4). The firmware's logic is compiled and run on the laptop in `tests/test_firmware.py`, including `pumpctl` talking to it, but not on the board, its USB link or real motors. Follow the first-power-on steps below in order, with water only.

## Parts

An Arduino Uno (R4 Minima recommended; an Uno R3 or a clone with a CH340 chip also works) and its USB cable, two TMC2209 drivers, two Kamoer KCS PLUS 24 V stepper pumps, a 24 V supply of 3 A or more, and a breadboard, all from the parts list. Plus a laptop (Mac, Windows or Linux) with Python 3 and the Arduino IDE.

Also get two **100 µF electrolytic capacitors rated 35 V or more**, one **10 kΩ resistor**, and a **multimeter** to set the driver current.

**Check when the pumps arrive:** each motor should have 4 bare wires. If a pump has its own control board, this wiring does not apply. Read the motor label for its rated current and step angle. The code assumes 1.8° (`FULL_STEPS_PER_REV` in `pumpctl/config.py`).

## Wiring

Make every connection with the power off. **Never plug or unplug a motor while 24 V is on, because it can destroy the driver.**

| Driver pin | Feed driver | Chlorine driver | Arduino Uno |
|---|---|---|---|
| STEP | yes | | D2 |
| STEP | | yes | D3 |
| DIR | yes | | D4 |
| DIR | | yes | D5 |
| EN | yes | yes | D8, shared, with the 10 kΩ resistor from D8 to 5V |
| VIO, MS1, MS2 | yes | yes | 5V |
| logic GND | yes | yes | GND |
| PDN / UART | leave empty | leave empty | |

| Power | Connect to |
|---|---|
| VM on each driver | 24 V + |
| Power GND on each driver | 24 V −, **and also to the Arduino's GND** so they share a ground |
| 100 µF capacitor | across VM and GND beside each driver; the stripe goes to GND |
| A1, A2, B1, B2 | the motor's two coils, using the motor's wiring chart |

- **Never connect 24 V to any Arduino pin, including VIN.** The Arduino runs from the laptop's USB.
- The 10 kΩ resistor holds EN high, so the motors stay off while the Arduino starts up or is unplugged.
- Pin labels and order differ between driver brands, so go by the labels printed on your board.
- Tying MS1 and MS2 to 5V (VIO) selects 16 microsteps. If you change this, also change `MICROSTEPS` in `pumpctl/config.py`.
- The pin numbers are set in `firmware/pumpfw/pumpfw.ino` and listed in `pumpctl/config.py`. A test checks they agree with this table.
- Keep motor and 24 V wires short and firmly seated. A wire that works loose on a breadboard is what kills drivers, so use screw terminals for these if you can.

**Set the current before connecting a motor.** With 24 V and the Arduino's USB on and no motor attached, measure the voltage between the driver's Vref point and GND, and turn its small screw. The formula depends on the board, so use the seller's. Many boards use Vref ≈ 1.41 × motor current in amps. Start at about half the motor's rated current and raise it only if the pump skips.

## Setting up the Arduino and the laptop

1. Install the [Arduino IDE](https://www.arduino.cc/en/software). For an Uno R4 Minima, add "Arduino UNO R4 Boards" in its Boards Manager.
2. Open `firmware/pumpfw/pumpfw.ino`, pick your board and port, and click Upload. Do this with the 24 V supply off.
3. In the IDE's Serial Monitor (115200 baud, "Newline"), type `PING`. It should answer `OK pumpfw 1`. **Close the Serial Monitor afterwards**, or `pumpctl` can't open the port.
4. On the laptop, get the code and the Python packages:

```bash
git clone https://github.com/Suryansh-Gupta/removed-is-not-safe.git
```

```bash
cd removed-is-not-safe && python3 -m pip install -r requirements.txt
```

`pumpctl` finds the Arduino by itself. If several are plugged in, or it can't find one, add `--port` with the port's name straight after `pumpctl` (list them with `python3 -m serial.tools.list_ports`).

Run every command below from `removed-is-not-safe/controller`, and add `--who` with your name where shown. To practice on any computer without hardware, put `--fake` straight after `pumpctl`.

## First power-on

Water only, and no coil yet.

1. Arduino's USB in first, then 24 V. For shutting down, 24 V off first, then the USB.
2. Spin the feed pump slowly for 20 seconds:

```bash
python3 -m pumpctl prime feed --step-hz 800 --seconds 20
```

3. Check which way water moves.
4. Repeat for the chlorine pump. If a pump runs backwards, flip its `DIR_FORWARD` value in `firmware/pumpfw/pumpfw.ino` and upload again.
5. Try both ways of stopping during a longer prime: press Ctrl-C, then on a second prime pull the Arduino's USB cable. Both should stop the pump at once.

## Calibrating

Calibrate with **water, with the pump's real tubing and the coil connected**, so the back-pressure matches a run. Prime first and clear the bubbles. Collect into a covered beaker on the 0.01 g scale. 1 g counts as 1 mL.

First find the rough speed range. 3200 steps/s is one revolution per second:

```bash
python3 -m pumpctl calibrate feed --step-hz 3200 --minutes 2 --who Suryansh --note "rough first point"
```

Then measure the flows you will really use:

```bash
python3 -m pumpctl calibrate feed --target 0.90 --minutes 10 --who Suryansh
```

```bash
python3 -m pumpctl calibrate chlorine --step-hz 3200 --minutes 2 --who Suryansh --note "rough first point"
```

```bash
python3 -m pumpctl calibrate chlorine --target 0.10 --minutes 30 --who Suryansh
```

- The chlorine pump gets 30 minutes because 10 minutes at 0.10 mL/min collects only 1 g, which leaves about 1.4% error from the scale alone. 30 minutes gets that near 0.5%.
- Points are grouped by date. To add to an earlier session or start a labelled one, use `--session`. **After changing tubing, use a new session.** Runs use only each pump's newest session, and older rows stay in the file.
- A run refuses any flow more than 5% outside the calibrated range and warns if no measured point is within 10%.
- Check the results with `python3 -m pumpctl status`.

Results go to `data/lab/pump_calibration/calibration.csv`. Columns are in the file's header; masses are in g, flows in mL/min, and `step_hz` in microsteps per second. Above 800 steps/s the pump ramps up for 2 s first, and that water lands on the scale too, so `seconds` is the time at full speed with the ramp's steps counted in.

## Measuring the chlorine line

Do this once after building, and again after changing tubing. Chlorine runs slowly, so an unprimed line can delay it by a long time.

1. Start with an empty, dry chlorine line, from the jug end to the tee, including the pump's tube. Unplug the line at the tee.
2. Put the inlet in a beaker of water on the 0.01 g scale, and zero the scale.
3. Run short primes until water first reaches the open end, then stop:

```bash
python3 -m pumpctl prime chlorine --step-hz 800 --seconds 20
```

4. The scale's drop in grams is the line volume in mL (1 g counts as 1 mL). Repeat 3 times, drying the line in between, and save the numbers in `data/lab/` with a note (date, who, scale, tubing).
5. Work out the timing for your run:

- Chlorine reaches the tee: line volume ÷ chlorine flow.
- Chlorine reaches a port or the outlet: that time + the port's contact time, which `pumpctl run` prints.

## Running the reactor

**Keep the laptop plugged in, with the lid open, for the whole run.** If it sleeps, the Arduino's watchdog stops the pumps after 5 s and the run ends. On a Mac and on Windows, `pumpctl` stops the laptop from going to sleep on its own during calibrations and runs, but closing the lid can still put it to sleep. On Linux, turn off automatic sleep yourself.

Example: 5 mg/L chlorine dose on the 3.8 m coil, running long enough to sample after the start-up wait.

```bash
python3 -m pumpctl run --run-id 2027-01-05-exp1-5mgL-r1 --feed 0.90 --chlorine 0.10 --minutes 90 --who Suryansh --note "5 mg/L, stock batch 3"
```

It shows the planned settings and waits for Enter. It then prints the contact time at each port and tells you when the start-up wait (2 × contact time) is over. For the 60-minute coil, add `--coil-m 7.6`.

During a run, type a note and press Enter to log it with the time, such as `sampled port C`. Type `q` to stop. It also stops itself at `--minutes`, so a forgotten run can't empty the jugs.

## What gets saved

Each run makes two files in `data/lab/reactor_runs/`:

- `<run-id>.csv`: every event with UTC time and seconds since the pumps started
- `<run-id>.json`: who, instrument, units, software version, flows, calibration used, contact times and why the run ended

A run ID can't be reused, so logs are never overwritten. Commit the logs after each run day so Ritik can pull them:

```bash
git add ../data/lab && git commit -m "Run logs" && git push
```

## Simulator (no hardware needed)

See the code run on a 3D, to-scale model of the two-pump reactor. From `removed-is-not-safe/controller`:

```bash
python3 sim/serve.py
```

Then open http://127.0.0.1:8765 in a browser (Python's standard library is all it needs; the 3D library loads from the internet).

Type the same commands as above, or use the buttons. Nothing in `pumpctl/` changes and it takes its real hardware path, not `--fake`. The simulator replaces only what is around the code: the clock (so 90 minutes can play in seconds), the serial port and the data folder. Behind the simulated port is `sim/arduino_twin.py`, a Python copy of the firmware; `tests/test_firmware.py` feeds the same commands to it and to the real firmware code and checks the replies match. **Simulated logs go to a temporary folder, never to `data/lab`.** A separate program, `sim/bench.py`, reads only the Arduino's pin changes and works out what the motors, jugs and lines would do.

You can also jam a pump, cut the 24 V supply, pull the Arduino's USB cable, or crash the program with `kill -9` (the watchdog then stops the pumps), and try these:

- **Wiring:** `sim/wiring.py` is a separate record of the wires, copied from the table above, and a test checks it against this README, `config.py` and the firmware. So a wrong pin in the code shows up as a pump that doesn't move. The page offers seven wiring mistakes, such as swapped STEP wires or the feed STEP wire on D6 instead of D2.
- **Skipped steps:** set the driver current to see steps skipped, or the motor lose sync on a sudden start. `pumpctl` can't see either, so compare the Skipped column with the terminal.
- **Chemistry:** each slice of water in the coil is treated as its own beaker, with its dose from what the pumps really delivered, using `web/model.js`, which a test keeps in step with `ris/`. A wiring fault or jam therefore changes the predicted result at each port.

**What it can't tell you:**

- It doesn't test your real wiring, power wiring, the driver's current setting, the real board's pulse timing or its USB link. The real first-power-on steps above still have to be done.
- **The torque numbers in `sim/bench.py` are PLACEHOLDERS,** so skipped steps show the behaviour, not where this motor's real limit is. Skipping is averaged over time, not worked out step by step.
- **The chemistry is a model prediction, not a measurement.** It uses plug flow with no spread along the tube, assumes instant mixing at the tee, and uses clean water apart from the model's chlorine demand. "Core" means molecules that keep the quinolone core, not antibacterial activity. The bisulfite return rate is unknown (Gap 2), so the page only shows a range. Feed and stock strengths on the page are example settings.
- `ML_PER_REV` (0.20) is a PLACEHOLDER, and the starting calibration is simulated. Line lengths and jug fills in `sim/bench.py` are ESTIMATES. Replace them once the pumps and lines are measured. Steps/s and roller-pulse times shown are only examples until then.

## Things this can't do

- **It doesn't measure flow.** The logged flows are what was commanded, based on the calibration. The Arduino can't tell if a pump stalled or a line leaked, so compare the jugs with the commanded volumes shown at the end of each run.
- **Stopping:** Ctrl-C, an error or a `q` all stop the pumps. If the program crashes or the laptop freezes, the watchdog stops them within 5 s. **Pulling the Arduino's USB cable stops them at once**, and the 24 V switch is the last resort, so keep both within reach. `python3 -m pumpctl stop` only works when no other `pumpctl` command has the Arduino open. While a run has it open, type `q` in that window instead.
- **If the Arduino's own code freezes, its watchdog freezes with it.** It's a short, simple program, so this is unlikely, but the USB cable and the 24 V switch still work.
- **Logged times come from the laptop's clock.** Each run records whether the clock was synced (this reads "unknown" on a Mac or Windows, where that can't be checked), and elapsed times are always right.
