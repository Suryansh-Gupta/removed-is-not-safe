// Runs pumpfw_core.h on a laptop for tests/test_firmware.py. Reads a script from stdin:
//   > <command>      send one line to the firmware, as the USB port would
//   T <us>           run the firmware's loop for <us> more microseconds, 1 us at a time
//   S                print "STEPS <feed> <chlorine> EN <0|1>"
// Every reply line is printed and flushed at once, so a test can talk to it like a serial port.
// An optional argument sets the board's clock at power-on in us, to test the 71.6 min micros() wrap.
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <string>

#include "pumpfw/pumpfw_core.h"

struct HostHal {
  uint64_t now_us = 0;  // micros() and millis() wrap independently, as on the board
  unsigned long steps[2] = {0, 0};
  bool en = false;
  void stepPulse(uint8_t p) { steps[p]++; }
  void setEnable(bool on) { en = on; }
  void setDir(uint8_t) {}
  uint32_t micros() { return (uint32_t)now_us; }
  uint32_t millis() { return (uint32_t)(now_us / 1000); }
  void reply(const char *line) {
    std::printf("%s\n", line);
    std::fflush(stdout);
  }
};

int main(int argc, char **argv) {
  HostHal hal;
  if (argc > 1) hal.now_us = std::strtoull(argv[1], 0, 10);
  pumpfw::Core<HostHal> core(hal);
  core.begin();
  std::string line;
  while (std::getline(std::cin, line)) {
    if (line.rfind("> ", 0) == 0) {
      for (char c : line.substr(2)) core.receive(c);
      core.receive('\n');
    } else if (line.rfind("T ", 0) == 0) {
      uint64_t until = hal.now_us + std::stoull(line.substr(2));
      while (hal.now_us < until) {
        hal.now_us++;
        core.poll();
      }
    } else if (line == "S") {
      std::printf("STEPS %lu %lu EN %d\n", hal.steps[0], hal.steps[1], hal.en ? 1 : 0);
      std::fflush(stdout);
    }
  }
  return 0;
}
