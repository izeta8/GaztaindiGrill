# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FastAPI microservice that owns CRUD for cooking programs and categories (MySQL) and publishes MQTT cache-invalidation events when a program changes. Part of the larger GaztaindiGrill monorepo — see `../CLAUDE.md` (the repo root) for how this fits with the firmware and web client.

This service is **not** in the real-time control loop: manual movement and program execution go directly over MQTT between the web client and the grill. This API is only for persisting/editing programs and notifying that a stored program changed.

## Commands

```bash
# Activate venv and run with hot reload (Windows)
.\venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

No automated test suite is configured (no pytest setup). There is no lint/format tooling configured either — match the existing style in `app/api/routes/`.

## Architecture

Full write-up in [docs/architecture.md](docs/architecture.md) (component diagram + data-flow walkthrough) and the schema in [docs/database.md](docs/database.md) — read these before adding endpoints or changing the schema. Endpoint reference: [docs/api-reference.md](docs/api-reference.md).

- **`app/main.py`** — FastAPI app entry point; uses a `lifespan` context manager to connect/disconnect the MQTT client around the app's lifecycle, configures CORS, includes the routers.
- **`app/api/routes/programs.py`, `categories.py`** — HTTP endpoints per business entity. Routes build SQL manually (parameterized, not an ORM) and validate request bodies with Pydantic schemas.
- **`app/core/db.py`** — `mysql-connector-python` connection management via a simple singleton (`get_connection()`), with a ping check to detect a stale connection and reconnect.
- **`app/core/mqtt_client.py`** — `paho-mqtt` client singleton, connected at startup. `PATCH /programs/{id}` publishes to `programs/updated/{program_id}` after a successful update — this is the cache-invalidation signal other services/the firmware can act on.
- **`app/core/config.py`** — loads all config (DB + MQTT credentials) from `.env` via `python-dotenv`; never hardcode credentials in route/business logic.
- **`app/schemas/programs.py`** — Pydantic request models (`CreateProgramRequest`, `UpdateProgramRequest`).

### Naming asymmetry (intentional, don't "fix" without checking the other side)

Request bodies use **camelCase** (`stepsJson`, `creatorName`, `categoryId`); the MySQL schema, query results, and JSON responses use **snake_case** (`steps_json`, `creator_name`, `category_id`). The frontend (`GaztaindiGrill-NextJS`) expects this exact split — see its `docs/api.md`.

### `PATCH` semantics

Updates are partial: only fields present (non-`None`) in the payload get included in the dynamic `UPDATE ... SET` clause built in `programs.py`. Keep this pattern when adding update endpoints — don't switch to full-replace semantics.

## Home Assistant add-on

`addons/gaztaindigrill_api/` packages this service as a Home Assistant add-on (`Dockerfile`, `config.yaml`, `run.sh`, `requirements.txt`) plus `app/`, a mirror of this repo's own `app/`. Deploy with `deploy-addon.ps1` (in this same directory) — it robocopies `app/` onto `addons/gaztaindigrill_api/app/`, uploads over Samba, and rebuilds the add-on over SSH. Never edit `addons/gaztaindigrill_api/app/` directly: it's gitignored and overwritten on the next deploy. See the repo root `CLAUDE.md` for the full deploy flow.
