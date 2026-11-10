// Pump firmware logic, kept free of Arduino calls so the same code also compiles on a laptop for the
// tests (tests/test_firmware.py). pumpfw.ino supplies the real pins, clock and serial port.
//
// The laptop (controller/pumpctl) sends one command per line at 115200 baud and gets one reply line:
//
//   PING           -> OK pumpfw <version>
//   EN 1 | EN 0    -> OK              motors powered / unpowered (EN pin is active low)
//   HZ <p> <hz>    -> OK <interval>   step rate for pump p (0 = feed, 1 = chlorine). The reply is the
//                                     step interval in 1/256 us, so the laptop can work out the exact
//                                     rate the board will make: 256e6 / interval steps per second.
//   ON <p> | OFF <p> -> OK            start / stop step pulses on pump p
//   STAT           -> OK <en> <on0> <on1> <interval0> <interval1>
//   STOP           -> OK              both pumps off and motor power off
//   WD <s>         -> OK              watchdog time in seconds (1 to 60)
//
// Bad input gets "ERR <reason>". Lines starting with "!" or "READY" come unasked (watchdog, boot).
//
// Watchdog: if the laptop sends nothing for WD seconds (default 5) while anything is on, the board
// stops both pumps and cuts motor power by itself. So a crashed program, a sleeping laptop or a
// pulled USB cable stops the pumps instead of leaving them running.
#pragma once
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define PUMPFW_VERSION "1"

namespace pumpfw {

const uint8_t NPUMPS = 2;
const uint32_t MAX_STEP_HZ = 10000;          // hard ceiling; pumpctl/config.py sets the working limit
const uint32_t MIN_INTERVAL = 256000000UL / MAX_STEP_HZ;  // 1/256 us
const uint32_t DEFAULT_WD_MS = 5000;
const uint8_t CMD_MAX = 40;

// Hal must provide: void stepPulse(uint8_t pump); void setEnable(bool on); void setDir(uint8_t pump);
// uint32_t micros(); uint32_t millis(); void reply(const char *line);
template <class Hal>
class Core {
 public:
  explicit Core(Hal &hal) : hal_(hal) {}

  void begin() {
    for (uint8_t i = 0; i < NPUMPS; i++) {
      on_[i] = false;
      interval_[i] = 0;
      hal_.setDir(i);
    }
    enabled_ = false;
    hal_.setEnable(false);
    wd_ms_ = DEFAULT_WD_MS;
    last_cmd_ms_ = hal_.millis();
    len_ = 0;
    overflow_ = false;
    hal_.reply("READY pumpfw " PUMPFW_VERSION);
  }

  // Call as often as possible. Sends any step that is due and runs the watchdog.
  void poll() {
    uint32_t now = hal_.micros();
    for (uint8_t i = 0; i < NPUMPS; i++) {
      if (!on_[i]) continue;
      if ((int32_t)(now - due_us_[i]) >= 0) {
        hal_.stepPulse(i);
        // Add the interval in 1/256 us so the average rate is exact over a long run.
        uint32_t total = (uint32_t)frac_[i] + (interval_[i] & 0xFF);
        due_us_[i] += (interval_[i] >> 8) + (total >> 8);
        frac_[i] = (uint8_t)(total & 0xFF);
      }
    }
    if (anything_on() && (uint32_t)(hal_.millis() - last_cmd_ms_) > wd_ms_) {
      stop_all();
      hal_.reply("! WATCHDOG");
    }
  }

  // Feed each received character.
  void receive(char c) {
    if (c == '\r') return;
    if (c == '\n') {
      line_[len_] = 0;
      if (overflow_) {
        hal_.reply("ERR line too long");
      } else if (len_ > 0) {
        command(line_);
      }
      len_ = 0;
      overflow_ = false;
      return;
    }
    if (len_ < CMD_MAX - 1) {
      line_[len_++] = c;
    } else {
      overflow_ = true;
    }
  }

  bool is_on(uint8_t p) const { return on_[p]; }
  bool enabled() const { return enabled_; }
  uint32_t interval(uint8_t p) const { return interval_[p]; }

 private:
  Hal &hal_;
  bool on_[NPUMPS];
  bool enabled_;
  uint32_t interval_[NPUMPS];
  uint32_t due_us_[NPUMPS];
  uint8_t frac_[NPUMPS];
  uint32_t wd_ms_;
  uint32_t last_cmd_ms_;
  char line_[CMD_MAX];
  uint8_t len_;
  bool overflow_;

  bool anything_on() const { return enabled_ || on_[0] || on_[1]; }

  void stop_all() {
    for (uint8_t i = 0; i < NPUMPS; i++) on_[i] = false;
    enabled_ = false;
    hal_.setEnable(false);
  }

  static bool parse_pump(const char *s, uint8_t *p) {
    if (s == 0 || (s[0] != '0' && s[0] != '1') || s[1] != 0) return false;
    *p = (uint8_t)(s[0] - '0');
    return true;
  }

  static void put_u32(char *out, uint32_t v) {
    char tmp[11];
    uint8_t n = 0;
    do {
      tmp[n++] = (char)('0' + v % 10);
      v /= 10;
    } while (v);
    while (n) *out++ = tmp[--n];
    *out = 0;
  }

  void command(char *line) {
    last_cmd_ms_ = hal_.millis();  // any line counts as the laptop still being there
    char *word = strtok(line, " ");
    char *a = strtok(0, " ");
    char *b = strtok(0, " ");
    char *extra = strtok(0, " ");
    if (!word) return;  // only spaces: counts as a sign of life, needs no reply
    if (extra) return hal_.reply("ERR too many words");
    uint8_t p;
    if (!strcmp(word, "PING") && !a) return hal_.reply("OK pumpfw " PUMPFW_VERSION);
    if (!strcmp(word, "STOP") && !a) {
      stop_all();
      return hal_.reply("OK");
    }
    if (!strcmp(word, "EN") && a && !b && (!strcmp(a, "0") || !strcmp(a, "1"))) {
      enabled_ = a[0] == '1';
      hal_.setEnable(enabled_);
      return hal_.reply("OK");
    }
    if ((!strcmp(word, "ON") || !strcmp(word, "OFF")) && parse_pump(a, &p) && !b) {
      if (word[1] == 'N') {
        if (interval_[p] == 0) return hal_.reply("ERR no rate set");
        if (!on_[p]) {
          on_[p] = true;
          due_us_[p] = hal_.micros();
          frac_[p] = 0;
        }
      } else {
        on_[p] = false;
      }
      return hal_.reply("OK");
    }
    if (!strcmp(word, "HZ") && parse_pump(a, &p) && b) {
      char *end;
      double hz = strtod(b, &end);
      if (*end != 0 || !(hz > 0) || hz > MAX_STEP_HZ) return hal_.reply("ERR rate out of range");
      double iv = 256e6 / hz + 0.5;
      if (iv > 4294967295.0) return hal_.reply("ERR rate out of range");
      uint32_t interval = (uint32_t)iv;
      if (interval < MIN_INTERVAL) interval = MIN_INTERVAL;
      // A running pump keeps its next step time, so changing speed during a ramp is smooth.
      interval_[p] = interval;
      char out[16] = "OK ";
      put_u32(out + 3, interval);
      return hal_.reply(out);
    }
    if (!strcmp(word, "STAT") && !a) {
      char out[48] = "OK ";
      char *o = out + 3;
      *o++ = enabled_ ? '1' : '0';
      *o++ = ' ';
      *o++ = on_[0] ? '1' : '0';
      *o++ = ' ';
      *o++ = on_[1] ? '1' : '0';
      *o++ = ' ';
      put_u32(o, interval_[0]);
      o += strlen(o);
      *o++ = ' ';
      put_u32(o, interval_[1]);
      return hal_.reply(out);
    }
    if (!strcmp(word, "WD") && a && !b) {
      char *end;
      long s = strtol(a, &end, 10);
      if (*end != 0 || s < 1 || s > 60) return hal_.reply("ERR watchdog must be 1 to 60 s");
      wd_ms_ = (uint32_t)s * 1000;
      return hal_.reply("OK");
    }
    hal_.reply("ERR unknown command");
  }
};

}  // namespace pumpfw
