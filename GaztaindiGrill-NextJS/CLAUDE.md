# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Next.js 15 (App Router) + React 19 web client used to control the grill in real time and manage cooking programs. Part of the larger GaztaindiGrill ecosystem — see `../CLAUDE.md` for how this fits with the firmware and API, and for the MQTT topic source of truth.

## Commands

```bash
npm run dev      # next dev --turbopack
npm run build
npm run start
npm run lint      # next lint
```

No automated test suite is configured (no jest/vitest setup) — verification is manual in the browser, against the real grill. To watch or fake MQTT traffic while developing, use `mosquitto_sub -v -t 'grill/#'` and `mosquitto_pub` directly against the broker.

## Architecture

- **HTTP to the API** (`GaztaindiGrill-API`, base URL from `NEXT_PUBLIC_API_URL`) is used *only* for CRUD on programs/categories. See [docs/api.md](docs/api.md) for the request/response shapes — note the API's camelCase-request / snake_case-response asymmetry, which this client's code already expects.
- **MQTT directly to the grill** (not routed through the API) handles everything real-time: manual movement/rotation commands, program execution, sensor telemetry, mode switching, and online/offline connection state. [docs/mqtt.md](docs/mqtt.md) documents the whole contract — topic tables, the `{ value, requestId }` envelope, error codes, flows. The topic strings themselves are owned by the firmware's `GrillConstants.h` and mirrored in `src/constants/mqtt.ts`; on any disagreement the firmware wins.
- **Running-program state** (`src/contexts/RunningProgramsContext.tsx`): there is no cache and no request/response round trip. The ESP32 publishes the *entire* running program (name, steps, `currentStepIndex`, `stepStartUnix` on the current step) **retained** on `grill/{id}/status/program/current`, so the broker hands it to any client the moment it subscribes. The context just stores that payload per grill index and nulls it on `{ isRunning: false }`. See [docs/cache.md](docs/cache.md).
- **`src/hooks/useMqtt.tsx`** — core MQTT client hook (uses the `mqtt` package). Domain-specific hooks (`useGrillState`, `useGrillCommands`, `useSystemActions`) build on top of it for grill state and command dispatch.
- **Contexts** (`src/contexts/`): `GrillStateContext` (live state per grill), `CurrentModeContext` (single vs dual grill mode), `RunningProgramsContext` (the cache above).
- **Routes** (`src/app/`): `control/` (manual + program execution control surface, with `ControlPad`, `ProgramExecutionStatus`, execution detail/step views), `programs/` (create/edit/list programs, with category and step modals), `mode/` (single/dual mode switching).
- **3D grill visualization** (`src/components/three/`) uses `@react-three/fiber`/`drei`/`three` to render `GrillModel`/`GrillScene`.
- Import alias `@/*` → `src/*` (see `tsconfig.json`). The `eslint-plugin-no-relative-import-paths` lint rule is enabled — prefer the `@/` alias over relative imports across directories.

### Known in-progress items (see `TODO.md`)

Global notification system on program execution, last-update display fix for grill control, and blocking rotation-containing programs on the right grill are open items — check `TODO.md` before assuming a related feature is finished.
