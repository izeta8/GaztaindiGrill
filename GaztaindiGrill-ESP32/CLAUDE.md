# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ESP32 firmware (PlatformIO + Arduino framework) that physically drives the grill: vertical position (linear actuator), tilt/rotation (rotor motor), temperature sensing, manual control, and execution of multi-step cooking programs received over MQTT. Part of the larger GaztaindiGrill ecosystem — see `../CLAUDE.md` for how this fits with the API and web client, and for the MQTT topic source of truth.

## Commands

```bash
# Build (default env = esp32doit-devkit-v1, OTA over Ethernet)
pio run

# First-ever flash of a board (OTA endpoint doesn't exist yet): flash over USB
pio run -e usb -t upload

# Subsequent flashes: OTA over Ethernet (W5500), POSTs firmware.bin to the device's /update endpoint
pio run -e esp32doit-devkit-v1 -t upload
# equivalent to: pio run -t upload (default_envs)

# Serial monitor (115200 baud)
pio device monitor
```

There is no automated test suite (`test/` only contains the PlatformIO Unity placeholder `README`). Verification is manual: flash, then watch serial output and MQTT traffic — `mosquitto_sub -v -t 'grill/#'` against the broker is the fastest way to see the protocol as the grill speaks it.

The OTA upload target posts to a hardcoded device IP in `platformio.ini` (`http://192.168.1.100:3232/update`) — update that if the device's static IP changes (see `lib/Grill/GrillConfig.h`).

## Architecture

Full design write-up lives in [ARCHITECTURE.md](ARCHITECTURE.md) — read it before modifying control flow, MQTT handling, or program execution. Summary of the class responsibilities (all in `lib/Grill/`):

- **`GaztaindiGrill.cpp`** (`src/`) — entry point (`setup()`/`loop()`), owns the Ethernet/MQTT connections, dispatches incoming MQTT messages to the right `Grill` instance.
- **`GrillSystem`** — owns the 2 `Grill` instances (`GrillConstants::NUM_GRILLS`).
- **`Grill`** — facade for a single grill; routes MQTT commands to the right manager.
- **`ProgramManager`** — state machine (`ProgramState`/`StepState`) that drives step-by-step program execution; program state lives in RAM only and does **not** survive a reboot (deliberate tradeoff to avoid flash wear — see ARCHITECTURE.md §5 for the FRAM-based plan if this ever needs to change).
- **`MovementManager`** — vertical actuator + rotation motor control, plus the rotation headroom guard: a turn *with a destination* asked for too low raises the grill first, turns, and comes back. Manual rotation is deliberately left out. See ARCHITECTURE.md §6.
- **`GrillMQTT`** — wrapper centralizing publish/subscribe/topic-parsing logic.
- **`HardwareManager`, `GrillSensor`, `StatusLed`** — low-level hardware abstraction.
- **`DualModeCoordinator`** — coordinates the two grills when running in "dual" mode (vs "single").

Key cross-cutting flows (detailed in ARCHITECTURE.md):

- **Command protocol**: every command arrives wrapped as `{ value, requestId }` and is answered on `grill/{id}/status/result`. Handlers only spell out their failures — the dispatcher calls `reply_ok_if_unanswered()` for anything that came back without an answer. See ARCHITECTURE.md §2.
- **Multi-user sync**: `ProgramManager::publish_program_status()` publishes the **whole** running program (name, steps, `currentStepIndex`, and `stepStartUnix` on the current step) **retained** on `grill/{id}/status/program/current`. The broker replays it to any client that subscribes, so a newly-connected client needs no request/response round trip and never asks the API — the ESP32's RAM holds the version actually cooking. See ARCHITECTURE.md §3.
- **Disconnection handling**: uses MQTT Last Will and Testament (`grill/connection` → `offline`) so clients can detect a dead grill instead of showing stale "running" state.

`GrillConstants.h` is the single source of truth for every MQTT topic, payload string, and tunable constant (timeouts, margins, `NUM_GRILLS`, `MAX_PROGRAM_STEPS`, etc.) — check it before touching anything protocol-related, and keep `GaztaindiGrill-NextJS/src/constants/mqtt.ts` in sync if you add or rename a topic. `GrillConfig.h` holds the other kind of constant instead: board wiring (GPIO pins) and deployment config (static IP, MQTT broker credentials, OTA port) — changes per board/deployment rather than per feature.

`lib/` also vendors third-party libraries (Adafruit MAX31855/MAX31865, ArduinoJson, PubSubClient, CytronMotorDriver, etc.) alongside the project's own code — only `Grill/`, `DeviceEncoder/`, `DeviceRotorDrive/`, `EthernetNTP/`, `EthernetOTA/`, and `SerialTelnet/` are project-owned.
