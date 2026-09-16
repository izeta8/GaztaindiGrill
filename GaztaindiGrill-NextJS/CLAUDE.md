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
in `next.config.ts` produces under `out/`, and mirrors it onto `\share\htdocs` on the HA host
with robocopy `/MIR` — so whatever was served before is deleted, then checks the site answers.
Share, Samba credentials and the web port are hardcoded at the top of the script.

The **host** is not: `homeassistant.local` is mDNS and only answers on the LAN, so the script tries
it first and falls back to `homeassistant.tailbedb82.ts.net` when it does not resolve. That makes
`npm run deploy` work from off the LAN with no extra flag; `-HaHost <name>` forces either one.
Deploying over Tailscale needs the Samba add-on to allow the tailnet's CGNAT range
(`100.64.0.0/10`) in its `allow_hosts` — without it the port accepts the connection and Samba drops
the session, which surfaces as "the specified network name is no longer available".

`deploy.htaccess` is copied into `out/` as `.htaccess` on every deploy. Apache sends no
`Cache-Control` of its own, so without it browsers guess a freshness lifetime from the file's age
and keep serving a stale `index.html`. It marks HTML `no-cache` (revalidate, cheap 304 via ETag)
and `/_next/static/` `immutable` for a year, which is safe because those names carry a content
hash. Every directive is behind `<IfModule>`, so a missing module leaves the site working instead
of 500-ing. The deploy's last step reports the `Cache-Control` it got back — if it says none came,
the add-on is ignoring `.htaccess` (`AllowOverride None`) and the file is doing nothing.

It also carries a rewrite: the export writes `control.html`, not `control/index.html`, so without
it Apache answers 404 to `/control` and every deep link or in-app reload breaks. The rewrite
resolves an extensionless path to its `.html` file, and the deploy probes `/control` to confirm it.

**Nothing needs restarting after a deploy.** The Apache2 add-on (`605cee21_apache2`) has
`document_root: /share/htdocs` and reads from disk on every request, so replacing the files is
live at once, on port 8081 of whichever name you reached the host by. Only a change to the add-on's own options
needs Settings > Add-ons > Apache2 > Restart. A stale browser cache can still pin the old
`index.html` — the JS and CSS filenames are hashed, so those never go stale.

If only the upload failed, retry it with `npm run deploy -- -SkipBuild`: it reuses the export
already in `out/` instead of running the checks and the build again. The usual cause is Windows
allowing a single credential set per SMB server — an Explorer window sitting on the share keeps
its own connection alive, and the script cannot drop it. Close that window first.

**Do not run `npm run build` while `npm run dev` is up.** `next dev` uses Turbopack and `next build` uses webpack, and both write to the same `.next` directory, so a build wipes the manifests out from under the dev server. It then throws `ENOENT ... build-manifest.json` on every request until you restart it. Use `npm run typecheck` instead: it checks the same types and never touches `.next`.

No automated test suite is configured (no jest/vitest setup) — verification is manual in the browser, against the real grill. To watch or fake MQTT traffic while developing, use `mosquitto_sub -v -t 'grill/#'` and `mosquitto_pub` directly against the broker.

Without the grill, `npm run fake-grill` (`scripts/fake-grill.mjs`) stands in for the ESP32 against a local broker on `mqtt://localhost:1883` (`MQTT_URL` overrides it). It publishes the LWT, mode and reset status, moves position and rotation for real on `set_position`, `set_rotation` and the manual commands, sends a temperature every 5 s, and answers on `status/result`. It does not run programs. The broker needs a WebSocket listener on 1884 and `allow_anonymous true`, and `.env.local` must leave `NEXT_PUBLIC_DEV_HOST` and the MQTT credentials unset so the page talks to localhost. With no API running, the user modal does not open and the control page still works.

## Architecture

- **No host is baked into the build.** The export is one artifact served both by LAN IP and by Tailscale name, so `resolveHost()` and `apiBaseUrl()` (`src/utils/host.ts`) take the host from `window.location.hostname` at runtime; only ports, protocol and credentials still come from `NEXT_PUBLIC_*`. `npm run dev` is the exception — there the page comes from your machine while the API and broker do not, so `NEXT_PUBLIC_DEV_HOST` overrides it, behind a `NODE_ENV === 'development'` check that a production build folds away. Both helpers return `''` when there is no `window`, so callers must resolve inside effects or handlers: reading them in a component body breaks `next build` at prerender.
- **`homeassistant/`** holds the two files that live in Home Assistant but whose source of truth is this repo, neither of them deployed by `deploy.ps1`. `grill.html` goes in `config/www` by hand (**never** with robocopy `/MIR`, which would wipe the rest of that directory) and HA serves it at `/local/grill.html`; it is a six-line redirect to port 8081 carrying `location.hostname` across, which is what lets the dashboard card use a relative URL instead of a hardcoded host. `dashboard-card.yaml` is that card's view, pasted into the dashboard's raw config editor by hand. It has to be an explicit `.html` because HA answers 403 to a directory under `/local/`.
- **Who made a program** is a row in the API's `users` table, not free text. `CurrentUserContext` fetches `GET /users`, keeps the pick in `localStorage` under `gaztaindigrill.user`, and validates the stored id against that list on every load — a user deactivated since is dropped and the modal reopens. `UserSelectionModal` is mounted in `providers.tsx` and cannot be dismissed until a user is picked, since nothing in the app works without one; the FAB's `Cambiar usuario` reopens it later, and that one *is* dismissable. Programs carry `userId` and read the creator's name from the API's joined `userName`. The `creatorName` still in `RunningProgram` and the execute payload is the MQTT side, which was deliberately left alone.
- **HTTP to the API** (`GaztaindiGrill-API`) is used *only* for CRUD on programs, categories and users. See [docs/api.md](docs/api.md) for the request/response shapes — note the API's camelCase-request / snake_case-response asymmetry, which this client's code already expects.
- **MQTT directly to the grill** (not routed through the API) handles everything real-time: manual movement/rotation commands, program execution, sensor telemetry, mode switching, and online/offline connection state. [docs/mqtt.md](docs/mqtt.md) documents the whole contract — topic tables, the `{ value, requestId }` envelope, error codes, flows. The topic strings themselves are owned by the firmware's `GrillConstants.h` and mirrored in `src/constants/mqtt.ts`; on any disagreement the firmware wins.
- **Running-program state** (`src/contexts/RunningProgramsContext.tsx`): there is no cache and no request/response round trip. The ESP32 publishes the *entire* running program (name, steps, `currentStepIndex`, `stepStartUnix` on the current step) **retained** on `grill/{id}/status/program/current`, so the broker hands it to any client the moment it subscribes. The context just stores that payload per grill index and nulls it on `{ isRunning: false }`. See [docs/cache.md](docs/cache.md).
- **`src/hooks/useMqtt.tsx`** — core MQTT client hook (uses the `mqtt` package). Domain-specific hooks (`useGrillState`, `useGrillCommands`, `useSystemActions`) build on top of it for grill state and command dispatch.
- **Contexts** (`src/contexts/`): `GrillStateContext` (live state per grill), `CurrentModeContext` (single vs dual grill mode), `RunningProgramsContext` (the cache above), `CurrentUserContext` (who is using the app).
- **Routes** (`src/app/`): `control/` (manual + program execution control surface, with `ControlPad`, `ProgramExecutionStatus`, execution detail/step views), `programs/` (create/edit/list programs, with category and step modals), `mode/` (single/dual mode switching).
- **3D grill visualization** (`src/components/three/`) uses `@react-three/fiber`/`drei`/`three` to render `GrillModel`/`GrillScene`. `GrillModel` looks grills up by node name (`padre_parrilla_ezkerra`/`eskubi`, and `rotor_cilindro+parrilla` for the tilt), so renaming them in Blender breaks the scene. It is also the only way to set a height on `/control`: tapping a grill opens `GrillPositionModal`, which renders that grill alone (corner camera for the left one, so the tilt shows; front camera for the right one) with a see-through ghost rack that follows the pointer in 5 % steps, and "Mover a X%" sends `set_position`. In dual mode either grill opens grill 0, and the modal does not open while a program runs or the grill is offline.
- Import alias `@/*` → `src/*` (see `tsconfig.json`). The `eslint-plugin-no-relative-import-paths` lint rule is enabled — prefer the `@/` alias over relative imports across directories.

### Known in-progress items (see `TODO.md`)

Global notification system on program execution, last-update display fix for grill control, and blocking rotation-containing programs on the right grill are open items — check `TODO.md` before assuming a related feature is finished.
