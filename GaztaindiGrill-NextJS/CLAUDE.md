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
npm run typecheck # tsc --noEmit, does not touch .next
npm run deploy    # lint + typecheck + static export, mirrored onto the HA share
```

`deploy.ps1` is the whole deploy: it refuses to run while `npm run dev` is up, runs lint and
typecheck (there is no test suite to run yet), builds the static export that `output: 'export'`
in `next.config.ts` produces under `out/`, and mirrors it onto `\\homeassistant.local\share\htdocs`
with robocopy `/MIR` — so whatever was served before is deleted, then checks the site answers.
Host, share, Samba credentials and the web port are hardcoded at the top of the script.

**Nothing needs restarting after a deploy.** The Apache2 add-on (`605cee21_apache2`) has
`document_root: /share/htdocs` and reads from disk on every request, so replacing the files is
live at once, on `http://homeassistant.local:8081/`. Only a change to the add-on's own options
needs Settings > Add-ons > Apache2 > Restart. A stale browser cache can still pin the old
`index.html` — the JS and CSS filenames are hashed, so those never go stale.

If only the upload failed, retry it with `npm run deploy -- -SkipBuild`: it reuses the export
already in `out/` instead of running the checks and the build again. The usual cause is Windows
allowing a single credential set per SMB server — an Explorer window sitting on the share keeps
its own connection alive, and the script cannot drop it. Close that window first.

**Do not run `npm run build` while `npm run dev` is up.** `next dev` uses Turbopack and `next build` uses webpack, and both write to the same `.next` directory, so a build wipes the manifests out from under the dev server. It then throws `ENOENT ... build-manifest.json` on every request until you restart it. Use `npm run typecheck` instead: it checks the same types and never touches `.next`.

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
