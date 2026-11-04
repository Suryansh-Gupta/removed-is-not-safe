# Pump controller (Raspberry Pi 4)

Sets each reactor pump to a flow in mL/min from its calibration, stops on a timer, and logs every run to `data/lab/`.

The hardware path has **not been run on a real Pi yet**. It was tested with fake pins and a fake PWM folder (`tests/test_pumpctl.py`). Follow the first-power-on steps below in order, with water only.

## Parts

Raspberry Pi 4, two TMC2209 drivers, two Kamoer KCS PLUS 24 V stepper pumps, a 24 V supply of 3 A or more, and a breadboard, all from parts list v3.

Also get two **100 µF electrolytic capacitors rated 35 V or more** (not on the parts list), and a **multimeter** to set the driver current.

**Check when the pumps arrive:** each motor should have 4 bare wires. If a pump has its own control board, this wiring does not apply. Read the motor label for its rated current and step angle. The code assumes 1.8° (`FULL_STEPS_PER_REV` in `pumpctl/config.py`).

## Wiring

Make every connection with the power off. **Never plug or unplug a motor while 24 V is on, because it can destroy the driver.**

| Driver pin | Feed driver | Chlorine driver | Raspberry Pi 4 |
|---|---|---|---|
| STEP | yes | | GPIO12 (physical pin 32) |
| STEP | | yes | GPIO13 (pin 33) |
| DIR | yes | | GPIO23 (pin 16) |
| DIR | | yes | GPIO24 (pin 18) |
| EN | yes | yes | GPIO5 (pin 29), shared |
| VIO, MS1, MS2 | yes | yes | 3.3 V (pin 1) |
| logic GND | yes | yes | GND (pin 6) |
| PDN / UART | leave empty | leave empty | |

| Power | Connect to |
|---|---|
| VM on each driver | 24 V + |
| Power GND on each driver | 24 V −, **and also to the Pi's GND** so they share a ground |
| 100 µF capacitor | across VM and GND beside each driver; the stripe goes to GND |
| A1, A2, B1, B2 | the motor's two coils, using the motor's wiring chart |

- **Never connect 24 V to any Pi pin.** It will destroy the Pi.
- Pin labels and order differ between driver brands, so go by the labels printed on your board.
- Tying MS1 and MS2 to 3.3 V selects 16 microsteps. If you change this, also change `MICROSTEPS` in `pumpctl/config.py`.
- Keep motor and 24 V wires short and firmly seated. A wire that works loose on a breadboard is what kills drivers, so use screw terminals for these if you can.

**Set the current before connecting a motor.** With 24 V and 3.3 V on and no motor attached, measure the voltage between the driver's Vref point and GND, and turn its small screw. The formula depends on the board, so use the seller's. Many boards use Vref ≈ 1.41 × motor current in amps. Start at about half the motor's rated current and raise it only if the pump skips.

## Setting up the Pi

Use Raspberry Pi OS. All of this runs on the Pi.

1. Open the config file:

```bash
sudo nano /boot/firmware/config.txt
```

Add these lines at the end. The first gives GPIO12 and GPIO13 their hardware pulse generators. The second turns off analog audio, which uses the same hardware.

```
dtoverlay=pwm-2chan,pin=12,func=4,pin2=13,func2=4
dtparam=audio=off
```

2. Install what's needed and get the code:

```bash
sudo apt update && sudo apt install -y git tmux python3-gpiozero python3-lgpio
```

```bash
sudo adduser $USER gpio
```

```bash
git clone https://github.com/Suryansh-Gupta/removed-is-not-safe.git
```

```bash
sudo reboot
```

3. After rebooting, check that the PWM is there. You should see `pwmchip0`:

```bash
ls /sys/class/pwm
```

Run every command below from `removed-is-not-safe/pi`, and add `--who` with your name where shown. To practice on any computer without hardware, put `--fake` straight after `pumpctl`.

## First power-on

Water only, and no coil yet.

1. Pi on first, then 24 V. For shutting down, 24 V off first, then the Pi.
2. Spin the feed pump slowly for 20 seconds:

```bash
python3 -m pumpctl prime feed --step-hz 800 --seconds 20
```

3. Check which way water moves. If it's backwards, flip `forward_level` for that pump in `pumpctl/config.py`.
4. Repeat for the chlorine pump, then try the emergency stop from a second terminal during a longer prime:

```bash
python3 -m pumpctl stop
```

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

Results go to `data/lab/pump_calibration/calibration.csv`. Columns are in the file's header; masses are in g, flows in mL/min, and `step_hz` in microsteps per second.

## Running the reactor

Use `tmux`, so a Wi-Fi drop can't interrupt your view of the run. The pumps keep going even if SSH drops, and reattaching with `tmux attach` brings the run back.

```bash
tmux
```

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

## Things this can't do

- **It doesn't measure flow.** The logged flows are what was commanded, based on the calibration. The Pi can't tell if a pump stalled or a line leaked, so compare the jugs with the commanded volumes shown at the end of each run.
- **If the program is killed by force or the Pi's software freezes, pulses can keep going.** Run `python3 -m pumpctl stop` or switch off the 24 V supply. The 24 V switch is the emergency stop, so keep it within reach. A normal Ctrl-C, an error or a `q` all stop the pumps.
- **The Pi has no battery clock.** Without a network its time can be wrong. Each run records whether the clock was synced, and elapsed times are always right.
