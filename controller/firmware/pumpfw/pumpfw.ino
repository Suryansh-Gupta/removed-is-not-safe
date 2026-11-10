// Reactor pump firmware for an Arduino Uno (R4 Minima or R3). Upload with the Arduino IDE.
// The laptop runs controller/pumpctl and sends the commands listed in pumpfw_core.h.
// Pins must match the wiring table in controller/README.md and PUMPS in pumpctl/config.py.
#include "pumpfw_core.h"

const uint8_t STEP_PIN[2] = {2, 3};  // feed, chlorine
const uint8_t DIR_PIN[2] = {4, 5};
const uint8_t DIR_FORWARD[2] = {HIGH, HIGH};  // flip one to LOW if that pump runs backwards
const uint8_t EN_PIN = 8;  // shared by both drivers; LOW = motors powered. 10 kOhm pull-up to 5 V.

struct ArduinoHal {
  void stepPulse(uint8_t p) {
    digitalWrite(STEP_PIN[p], HIGH);
    delayMicroseconds(2);  // TMC2209 needs at least 100 ns
    digitalWrite(STEP_PIN[p], LOW);
  }
  void setEnable(bool on) { digitalWrite(EN_PIN, on ? LOW : HIGH); }
  void setDir(uint8_t p) { digitalWrite(DIR_PIN[p], DIR_FORWARD[p]); }
  uint32_t micros() { return ::micros(); }
  uint32_t millis() { return ::millis(); }
  void reply(const char *line) { Serial.println(line); }
};

ArduinoHal hal;
pumpfw::Core<ArduinoHal> core(hal);

void setup() {
  digitalWrite(EN_PIN, HIGH);  // motors off before the pin becomes an output
  pinMode(EN_PIN, OUTPUT);
  for (uint8_t i = 0; i < 2; i++) {
    digitalWrite(STEP_PIN[i], LOW);
    pinMode(STEP_PIN[i], OUTPUT);
    pinMode(DIR_PIN[i], OUTPUT);
  }
  Serial.begin(115200);
  core.begin();
}

void loop() {
  core.poll();
  while (Serial.available() > 0) {
    core.receive((char)Serial.read());
    core.poll();
  }
}
