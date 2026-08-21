# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FastAPI microservice that owns CRUD for cooking programs and categories (MySQL). Part of the larger GaztaindiGrill monorepo — see `../CLAUDE.md` (the repo root) for how this fits with the firmware and web client.

This service is **HTTP + MySQL only, and speaks no MQTT at all**. Manual movement, program execution and telemetry go directly over MQTT between the web client and the grill; this API just persists and edits programs. A `paho-mqtt` client used to be wired in here but never published anything, so it was removed — `docs/architecture.md` §5 records what went and what you would have to decide before bringing it back.

## Commands

```bash
# Activate venv and run with hot reload (Windows)
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

No automated test suite is configured (no pytest setup). There is no lint/format tooling configured either — match the existing style in `app/api/routes/`.

## Architecture

Full write-up in [docs/architecture.md](docs/architecture.md) (component diagram + data-flow walkthrough) and the schema in [docs/database.md](docs/database.md) — read these before adding endpoints or changing the schema. Endpoint reference: [docs/api-reference.md](docs/api-reference.md).

- **`app/main.py`** — FastAPI app entry point; configures CORS and includes the routers. No `lifespan` context manager: the one that existed only wrapped the MQTT connect/disconnect, so it went with it. MySQL needs none — `get_connection()` opens lazily.
- **`app/api/routes/programs.py`, `categories.py`** — HTTP endpoints per business entity. Routes build SQL manually (parameterized, not an ORM) and validate request bodies with Pydantic schemas.
- **`app/core/db.py`** — `mysql-connector-python` connection management via a simple singleton (`get_connection()`), with a ping check to detect a stale connection and reconnect.
- **`app/core/config.py`** — loads DB config from `.env` via `python-dotenv`. Four `DB_*` variables and nothing else; never hardcode credentials in route/business logic.
- **`app/schemas/programs.py`** — Pydantic request models (`CreateProgramRequest`, `UpdateProgramRequest`).

### Naming asymmetry (intentional, don't "fix" without checking the other side)

Request bodies use **camelCase** (`stepsJson`, `creatorName`, `categoryId`); the MySQL schema, query results, and JSON responses use **snake_case** (`steps_json`, `creator_name`, `category_id`). The frontend (`GaztaindiGrill-NextJS`) expects this exact split — see its `docs/api.md`.

### `PATCH` semantics

Updates are partial: only fields present (non-`None`) in the payload get included in the dynamic `UPDATE ... SET` clause built in `programs.py`. Keep this pattern when adding update endpoints — don't switch to full-replace semantics.

## Home Assistant add-on

`addons/gaztaindigrill_api/` packages this service as a Home Assistant add-on (`Dockerfile`, `config.yaml`, `run.sh`, `requirements.txt`) plus `app/`, a mirror of this repo's own `app/`. Deploy with `deploy-addon.ps1` (in this same directory) — it robocopies `app/` onto `addons/gaztaindigrill_api/app/`, uploads over Samba, and rebuilds the add-on over SSH. Never edit `addons/gaztaindigrill_api/app/` directly: it's gitignored and overwritten on the next deploy. See the repo root `CLAUDE.md` for the full deploy flow.
