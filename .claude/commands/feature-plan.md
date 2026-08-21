---
description: Turn a feature request into an ordered, atomic, commit-sized implementation plan for the GaztaindiGrill monorepo. Run this before any code is written.
argument-hint: "<what you want built, in a sentence or two>"
allowed-tools: Read, Glob, Grep, Write, Bash, Agent
---

Plan a feature for the GaztaindiGrill monorepo.

What the user wants (may be empty): $ARGUMENTS

## Purpose

Turn a request into a numbered list of atomic, independently-committable tasks — so implementation never turns into "write everything, then figure out how to commit it."

This command only plans. It hands off to `/feature-implement` once the plan is approved.

**Do not use Plan Mode (`EnterPlanMode`/`ExitPlanMode`).** Those present the plan through an Accept/Keep-planning widget the user can't edit inline. Output the plan as normal chat markdown instead, so the user can reply with edits in plain conversation.

## Instructions

1. If `$ARGUMENTS` is empty or too vague to scope, ask for the specifics before planning — do not guess scope.

2. **Read what the request actually touches, don't assume.** Always read the root `CLAUDE.md` (conventions, layout, MQTT contract rules). Then, by domain:

   | The request touches | Read |
   |---|---|
   | MQTT topics, payloads, error codes | `GaztaindiGrill-ESP32/lib/Grill/GrillConstants.h` **first** (source of truth), then `GaztaindiGrill-NextJS/docs/mqtt.md`, `src/constants/mqtt.ts`, `src/constants/commandErrors.ts` |
   | Firmware behaviour, program execution, movement | `GaztaindiGrill-ESP32/CLAUDE.md`, `ARCHITECTURE.md`, `TODO.md` (known bugs — read before touching encoder or program-execution code) |
   | Web UI, hooks, contexts | `GaztaindiGrill-NextJS/CLAUDE.md`, `docs/mqtt.md`, `docs/cache.md` |
   | REST endpoints, MySQL schema | `GaztaindiGrill-API/CLAUDE.md`, `docs/api-reference.md`, `docs/architecture.md`, `docs/database.md` |
   | Home Assistant add-on packaging | root `CLAUDE.md` "Deploying the API to Home Assistant", `GaztaindiGrill-API/addons/gaztaindigrill_api/` |

   Also run `git log --oneline -15` and `git status --porcelain` — if there's already work in flight, the plan continues it rather than duplicating or colliding with it. Say so explicitly if the tree is dirty.

3. **Break the work into tasks that are each:**
   - **One concern** — a task doesn't mix a protocol change with a UI redesign.
   - **Independently committable** — once done it builds, and stands as a coherent commit on its own. Never "half a feature."
   - **Ordered by dependency**, not by file or convenience.

   A task **may span projects** when the change genuinely is one behaviour change — a new MQTT error code touching both `GrillConstants.h` and `commandErrors.ts` is one commit, not two. That is house style (root `CLAUDE.md`). Don't split a contract change across two commits that each leave the two sides disagreeing.

4. **For every task write:** a one-line description, the files it's expected to touch, the Conventional Commit type it will land as (`feat`, `fix`, `docs`, `refactor`, `chore`), and **how it will be verified** — there are no automated test suites in any of these projects, so name the real command:

   | Project | Verification |
   |---|---|
   | `GaztaindiGrill-ESP32/` | `pio run` (compiles; flashing and watching serial/MQTT is manual) |
   | `GaztaindiGrill-NextJS/` | `npm run lint`, and `npm run build` when the change could break the build |
   | `GaztaindiGrill-API/` | `python -m compileall app`, plus importing `app.main` if a venv with the deps is available |
   | Any MQTT contract change | the `mqtt-contract-auditor` agent, as the final task |

5. **Flag ambiguity instead of silently deciding.** If two readings of the request lead to materially different work, say so and ask — that is cheaper here than after implementation.

6. **Suggest a branch name** in `<type>/<kebab-slug>` form (e.g. `feat/skip-program-step`). **Never switch branches yourself** — branch changes are the user's call (root `CLAUDE.md`). If the current branch already looks dedicated to this work, say so and skip the suggestion.

7. **Write the plan to `.claude/plans/<slug>.md`** (create the directory if needed, slug from the branch name), then print it in the reply. The file is what `/feature-implement` reads, and the user can edit it directly to correct the plan.

8. **Do not start implementing.** Not even "the trivial first task."

## Output

- A numbered task list: description, files, commit type, verification.
- The suggested branch name, if any.
- Open questions called out explicitly, not buried.
- The path of the written plan file.
- End the reply with this exact line: `**Next step:** once you approve this plan, run `/feature-implement 1`.`
