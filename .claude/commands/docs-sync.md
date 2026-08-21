---
description: After a feature is implemented, diff the branch's changes and update the affected docs so documentation never silently drifts from the code. Stages the doc changes; never commits.
argument-hint: "[optional base ref, defaults to origin/main]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent
---

Sync the documentation with what the code now actually does.

Optional base ref (defaults to `origin/main`, falling back to `main`): $ARGUMENTS

## Purpose

Close the loop before committing: diff this branch against its base, work out which documented systems changed, and update the docs to match reality. This is what stops the docs from quietly going stale feature after feature — which is exactly what happened to `docs/mqtt.md` and `docs/cache.md` before they were rewritten.

## Instructions

1. **Gather the change surface.** Include work that isn't committed yet — this command runs *before* `/commit`, so uncommitted changes are the normal case:

   ```bash
   git branch --show-current
   git status --porcelain
   git log <base>..HEAD --oneline
   git diff <base>...HEAD --stat
   git diff HEAD --stat
   ```

   If `<base>` doesn't resolve (no remote, or the branch is `main` itself), fall back to reviewing the working tree plus the last few commits, and say which surface you actually used.

2. **Map changed paths to docs.** The root `CLAUDE.md` is the top-level overview; every project has its own `CLAUDE.md` plus prose docs.

   | Changed path | Doc(s) to check |
   |---|---|
   | `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h` | root `CLAUDE.md` (contract section), `GaztaindiGrill-NextJS/docs/mqtt.md` — **and** verify the `constants/mqtt.ts` + `commandErrors.ts` mirrors actually match |
   | `GaztaindiGrill-ESP32/lib/Grill/*` (classes, dispatch, MQTT wrapper) | `GaztaindiGrill-ESP32/ARCHITECTURE.md`, `GaztaindiGrill-ESP32/CLAUDE.md` |
   | `GaztaindiGrill-ESP32/lib/Grill/ProgramManager.*` | `ARCHITECTURE.md` §3 **and** `GaztaindiGrill-NextJS/docs/cache.md` (they document the same `status/program/current` payload from two sides) |
   | `GaztaindiGrill-ESP32/platformio.ini`, build/OTA setup | `GaztaindiGrill-ESP32/CLAUDE.md` (commands section) |
   | `GaztaindiGrill-NextJS/src/constants/mqtt.ts`, `commandErrors.ts`, `src/hooks/useMqtt.tsx` | `GaztaindiGrill-NextJS/docs/mqtt.md` |
   | `GaztaindiGrill-NextJS/src/contexts/RunningProgramsContext.tsx` | `GaztaindiGrill-NextJS/docs/cache.md` |
   | `GaztaindiGrill-NextJS/src/app/**` (fetch calls to the API) | `GaztaindiGrill-NextJS/docs/api.md` |
   | `GaztaindiGrill-API/app/api/routes/**` | `GaztaindiGrill-API/docs/api-reference.md` |
   | `GaztaindiGrill-API/app/core/**`, `app/main.py` | `GaztaindiGrill-API/docs/architecture.md`, `GaztaindiGrill-API/CLAUDE.md` |
   | MySQL schema, `app/schemas/**` | `GaztaindiGrill-API/docs/database.md`, `docs/api-reference.md` |
   | `GaztaindiGrill-API/addons/**`, `deploy-addon.ps1` | root `CLAUDE.md` ("Deploying the API to Home Assistant"), `GaztaindiGrill-API/CLAUDE.md` |
   | New project, new cross-project convention, new tooling in `.claude/` | root `CLAUDE.md` |

   If a changed path matches no row and isn't trivially internal, that's a **new system**: it needs its own section or doc, plus a pointer from the relevant `CLAUDE.md` — not silence.

3. **Verify against the real diff, never against commit messages.** For each affected doc, read the doc, then read `git diff <base>...HEAD -- <path>` (and `git diff HEAD -- <path>` for uncommitted work) for the files it documents. A commit subject is a claim; the diff is the evidence.

4. **Update each doc to match reality** — new flows, changed payloads, renamed constants, removed modules. Preserve the doc's existing structure, tone, language (the NextJS and API docs are in Spanish, the `CLAUDE.md` files in English) and section numbering. This is a sync, not a rewrite. If you renumber sections, grep for cross-references to the old numbers and fix them.

5. **Mind the diagrams.** Several docs carry mermaid blocks. If the shape of the system changed, the diagram changed too — update it rather than leaving a correct paragraph next to a wrong picture. Keep the syntax conservative (quoted edge labels, no exotic arrow forms) so it renders on GitHub.

6. **A pure internal refactor with no observable behaviour change needs no doc edit.** Say so explicitly and skip it rather than inventing filler.

7. **Stage each doc and propose its commit message.** Docs are independently committable, so one `docs:` commit per coherent doc change. **The user is on Windows PowerShell 5.1, where `&&` is a parser error** — chain with `; if ($?) { ... }` and tag the fence `powershell`:

   ```powershell
   git add -- GaztaindiGrill-NextJS/docs/mqtt.md; if ($?) { git commit -m "docs: describe the retained program-status topic" }
   ```

   Stage with `git add -- <exact paths>`. Never `git add -A`. Do not commit.

8. **Report:** which docs were updated and why, which were checked and were already accurate, which new doc (if any) was created, and anything you found that the docs claim but the code doesn't do — that last one is the whole point of this command, so don't bury it.

9. End the reply with this exact line: `**Next step:** review the staged doc changes, then run `/commit` to land everything.`

## Guardrails

- Never invent behaviour that isn't in the diff. If unsure whether something changed, read the code.
- `GrillConstants.h` wins over every doc, always. If a doc disagrees with it, the doc is wrong.
- The `CLAUDE.md` files are documentation too — they go stale the same way, and they're what future sessions read first.
- This repo has no `CHANGELOG.md`. Don't create one unless the user asks.
- Never run `git commit` or `git push`. Staging is the full extent of this command's git mutation.
