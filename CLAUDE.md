# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

**GaztaindiGrill** is a monorepo: a remotely-controlled grill (ESP32) driven over MQTT from a web app, with a FastAPI backend for persisting cooking programs. It holds every part of the ecosystem in one git history — firmware, web client, API, and the Home Assistant add-on that packages the API. Each project below has its own CLAUDE.md with project-specific commands.

This used to be three separate git repositories glued together by a non-repo parent folder. They were merged into this single repo (via `git subtree`, full history preserved — `git log firmware/` or `git log GaztaindiGrill-NextJS/` still walks each project's original commits) because a feature always touched all three at once anyway: the same branch name had to be created and merged by hand in three places, and the MQTT contract could drift between firmware and frontend with nothing to catch it. One repo means one branch per feature and one commit that can span both sides of the contract when that's the honest shape of the change.

## Layout

| Path | Role | Stack |
|---|---|---|
| `firmware/` | Firmware running on the ESP32 that physically drives the grill (vertical position, rotation/tilt, temperature, cooking programs). | C++ / Arduino framework / PlatformIO |
| `GaztaindiGrill-NextJS/` | Web client used to control the grill in real time and manage programs. | Next.js 15 / React 19 / TypeScript |
| `DatabaseAPI/GaztaindiGrill-API/` | Backend microservice: CRUD for cooking programs/categories (MySQL) + publishes MQTT invalidation events. | Python / FastAPI |
| `DatabaseAPI/addons/gaztaindigrill_api/` | Home Assistant add-on packaging of the API: `Dockerfile`, `config.yaml`, `run.sh`, `requirements.txt` are hand-authored and tracked; `app/` is a generated mirror of `GaztaindiGrill-API/app` and is **gitignored** — see below. | Python / Docker / Home Assistant Supervisor |

The `DatabaseAPI/` nesting (API and its add-on both live there, not at the repo root) is inherited from the pre-monorepo disk layout and was kept as-is to avoid touching `deploy-addon.ps1`'s relative paths during the migration.

The firmware is the only implementation of the MQTT contract. Protocol-level verification means real hardware, or a throwaway `mosquitto_pub`/`mosquitto_sub` session against the broker.

### Deploying the API to Home Assistant

`DatabaseAPI/deploy-addon.ps1` automates the whole path — **do not copy files by hand**:

1. Mirrors `GaztaindiGrill-API/app` onto `addons/gaztaindigrill_api/app` (robocopy `/MIR`, excluding `__pycache__`).
2. Uploads the add-on to the HA host over Samba.
3. Rebuilds and restarts the add-on over SSH (`ha addons rebuild` + `restart`).

Because step 1 mirrors with `/MIR`, **any edit made directly inside `addons/gaztaindigrill_api/app` is destroyed on the next deploy** — it's also gitignored, so such an edit would never even become committable. Change `GaztaindiGrill-API/app` and run the script. The HA host, credentials and add-on slug are hardcoded at the top of the script. `addons/gaztaindigrill_api/requirements.txt` is a separate, hand-maintained copy of the API's `requirements.txt` (the deploy script does not sync it) — update both if a dependency changes.

## System architecture (cross-project)

```
Web Client (NextJS)  <--HTTP CRUD-->  GaztaindiGrill-API  <--MySQL-->  Database
       |                                      |
       |  MQTT (real-time control/status)     | MQTT (cache-invalidation only)
       v                                      v
                    MQTT Broker (Mosquitto)
                              |
                              v
                  GaztaindiGrill firmware (ESP32)
```

- **HTTP** is used *only* for CRUD on programs/categories (NextJS <-> API <-> MySQL). The API is not in the real-time control loop.
- **MQTT** is used for *everything else*: manual movement/rotation commands, program execution, sensor telemetry, and connection status (LWT). This happens directly between the web client and the ESP32 — the API does not relay these messages, it only publishes a `programs/updated/{id}` cache-invalidation event when a program is edited.

## Source of truth for the MQTT contract

**`firmware/lib/Grill/GrillConstants.h`** is the authoritative definition of every MQTT topic, payload string, error code and protocol constant. When implementing or debugging anything MQTT-related:

1. Check `GrillConstants.h` first.
2. Cross-check against `GaztaindiGrill-NextJS/src/constants/mqtt.ts` (the frontend's mirror of the topics and payloads) and `GaztaindiGrill-NextJS/src/constants/commandErrors.ts` (the frontend's mapping of the firmware's `ERROR_*` codes to Spanish display text).
3. **Do not trust `GaztaindiGrill-NextJS/docs/mqtt.md` blindly** — it still documents the pre-`action/`/`status/` scheme (`grill/{id}/execute_program`, `grill/{id}/move`, `grill/{id}/program_status_response`...) which no longer exists in either the firmware or `constants/mqtt.ts`. The flow descriptions are still useful; the topic names are not. `GrillConstants.h` wins.

The contract is duplicated between C++ and TypeScript with nothing enforcing agreement — use the `mqtt-contract-auditor` agent (see below) rather than eyeballing it.

### Topic prefix convention (differs per side — easy to get wrong)

- **Firmware** stores global topics *with* the `grill/` prefix baked in (`TOPIC_LWT = "grill/connection"`) but per-grill topics *without* any prefix (`TOPIC_CMD_PROG_EXECUTE = "action/program/execute"`), prepending `grill/{id}/` at publish time.
- **Frontend** stores *every* topic bare (`LWT: 'connection'`, `EXECUTE: 'action/program/execute'`) and interpolates the prefix at each call site, as a template literal. There is **no central topic-building helper**; the prefix is retyped at ~15 call sites, so a wrong prefix is a per-call-site bug, not a constants bug.

So identical-looking constants in the two files are not directly comparable — compare the *resulting full topic*.

Structure: global topics are flat (`grill/connection`, `grill/restart`, `grill/time`, ...); per-grill topics are namespaced `grill/{id}/...` where `{id}` is `0` or `1` (`NUM_GRILLS = 2`), split into `action/...` (client → ESP32 commands) and `status/...` (ESP32 → client telemetry).

### Request/response envelope

Commands are no longer fire-and-forget. Every command the client sends is wrapped as `{ "value": <payload>, "requestId": "<uuid>" }`, and the ESP32 answers on `grill/{id}/status/result` (QoS 1, **not retained** — it is a reply, not state) with `{ requestId, command, ok, error? }`. Errors are machine codes owned by the firmware (`invalid_json`, `no_steps`, `no_rotor`, `rotation_out_of_range`, `mode_change_denied`, `no_program_running`, `encoder_not_answering`); the display wording lives in the client so rewording never requires reflashing. The sentinel `requestId` `"EVERYONE"` means the answer is broadcast to every connected client rather than correlated to one request.

## Per-project documentation

Each project's own docs are more detailed than this overview — read them before making changes in that project:

- `firmware/ARCHITECTURE.md` — class structure (Grill, ProgramManager, MovementManager, GrillMQTT, HardwareManager...), the multi-user state-sync flow, and LWT-based disconnect handling. `firmware/TODO.md` carries known bugs with detailed reasoning — read it before touching encoder or program-execution code.
- `DatabaseAPI/GaztaindiGrill-API/docs/architecture.md`, `docs/database.md`, `docs/api-reference.md` — service architecture, MySQL schema (`programs`, `categories`), and endpoint reference.
- `GaztaindiGrill-NextJS/docs/api.md`, `docs/cache.md` — REST contract with the API and the in-memory `RunningProgramsContext` cache strategy for synchronizing new clients with an already-running program. `docs/mqtt.md` has outdated topic names (see above). `TODO.md` is a mix of Spanish and Basque.

## Conventions worth knowing

- **One branch covers a whole feature.** Before the monorepo this meant creating and remembering to merge the same branch name in three separate repos by hand; now it's just a branch, same as any other project.
- **Commits follow Conventional Commits** in English, lowercase after the prefix, describing the behaviour change rather than the file touched: `feat: let programs run their positions relative to the starting point`, `fix: replace curl with a Python OTA uploader in platformio.ini`, `docs: update TODO.md`. Prefixes in use: `feat`, `fix`, `docs`, `refactor`, `chore`.
- **A commit can span projects when the change genuinely does** — e.g. a new MQTT error code touching both `firmware/lib/Grill/GrillConstants.h` and `GaztaindiGrill-NextJS/src/constants/commandErrors.ts` is one behaviour change and reads better as one commit now that it's possible. Still prefer one concern per commit; don't bundle unrelated work across projects just because the repo allows it.
- **Program steps schema** is shared across firmware, API, and frontend: a step is `{ time?, temperature?, position?, rotation? }` (time in seconds, temperature in °C, position 0-100, rotation 0-360), plus `action` and `referenceType` (`absolute` | `relative`). The API stores the step array as `steps_json` (a JSON string column in MySQL); the frontend treats it as serialized JSON too — don't assume it's structured/typed at the DB level.
- **API request bodies use camelCase** (`stepsJson`, `creatorName`, `categoryId`) while **API responses and the DB schema use snake_case** (`steps_json`, `creator_name`, `category_id`). This asymmetry is intentional per `docs/api-reference.md` — don't "fix" it in one layer without checking the other.
- **No automated test suites exist in any of these projects.** NextJS `package.json` has only `dev`/`build`/`start`/`lint`; `firmware/test/` holds nothing but the PlatformIO placeholder README; the API has no pytest. Verification is manual: flash to hardware and watch serial/MQTT traffic, exercise the UI in a browser, hit the API directly. Do not claim a change is "tested" — say how it was verified.
- None of these projects use Cursor or Copilot rule files (`.cursorrules`, `.github/copilot-instructions.md`) — this CLAUDE.md set is the AI-assistance documentation layer for the ecosystem.

## Tooling (`.claude/`)

| What | Use it for |
|---|---|
| `/commit [firmware\|next\|api\|all]` | Groups the diff into atomic commits, proposes Conventional Commit messages, commits what you approve. The scope filters by path prefix within this one repo; defaults to everything. |
| `mqtt-contract-auditor` agent | Read-only diff of the MQTT contract between `GrillConstants.h` and the frontend's `constants/mqtt.ts` + `commandErrors.ts` + call sites. Run it after touching any topic, payload or error code. |
| `commit-splitter` agent | Reads a diff and returns a commit plan. Invoked by `/commit`; rarely useful standalone. |

## Working agreements

- **Never commit without being asked.** Staging and committing happen when the user runs `/commit` or says so explicitly — not as the tail end of a task.
- **Uncommitted work never blocks new work.** If the user changes direction with a dirty tree, follow them. Don't insist on committing, stashing, or "cleaning up" first, and don't refuse to start something new. Just keep track of what's pending.
- **Don't switch branches on your own.** Branch changes are the user's call.
