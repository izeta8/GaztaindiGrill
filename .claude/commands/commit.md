---
description: Group uncommitted changes into atomic commits with house-style messages, then commit what you approve. Takes an optional path scope.
argument-hint: "[firmware|next|api|all] [extra instructions]"
allowed-tools: Bash, Read, Grep, Glob, Agent
---

Commit the pending work in the GaztaindiGrill repo.

User arguments (may be empty): $ARGUMENTS

## 0. Resolve the scope

GaztaindiGrill is one repo. The first token of the arguments selects a path prefix to scope the run to. Everything after it is a free-form instruction to pass along (e.g. `/commit api sin tocar los docs`).

| Token | Path prefix |
|---|---|
| `firmware`, `grill`, `esp32`, `fw` | `firmware/` |
| `next`, `nextjs`, `web`, `front`, `frontend` | `GaztaindiGrill-NextJS/` |
| `api`, `db`, `backend` | `DatabaseAPI/GaztaindiGrill-API/` |
| `addon`, `ha` | `DatabaseAPI/addons/` |
| `all`, or no token at all | no filter — the whole repo |

Match case-insensitively. A bare path that matches an existing directory also works. If the first token is not a recognised alias, treat the whole argument string as a free-form instruction and default the scope to the whole repo — do not error out over it.

State the resolved scope in one line before doing anything, so a mistyped alias is visible immediately rather than after a plan has been built.

## 1. Survey

From the repo root:

```
git status --porcelain -- <scope-or-nothing>
git branch --show-current
```

If the scoped tree is clean, say so in one line and stop.

## 2. Plan

Hand the diff to the `commit-splitter` agent and let it read it. Run it in the foreground — the plan is the next thing needed and nothing else can proceed without it.

Pass it: the resolved scope (path prefix or none), the current branch, and any free-form instruction the user gave.

## 3. Present

Show the returned plan verbatim enough that the user can judge it — branch, numbered commits, files, and the reasoning line. Surface any `⚠ Flags` prominently; a mirrored-directory edit or a secret in the diff matters more than the commit wording.

Then **stop and wait**. Do not stage or commit anything yet. The user may approve everything, approve some commits, reword messages, or ask for different grouping. Re-plan as needed.

If the plan splits one file across multiple commits, say so explicitly: interactive staging (`git add -p`) is not available in this environment, so those hunks need either a reworked plan that keeps the file whole or manual staging by the user. Offer the reworked plan.

## 4. Execute

Only after explicit approval, and only the approved parts. Per commit, in the plan's order, from the repo root:

```
git add -- <exact paths>
git commit -m "<message>"
```

- Stage **named paths only**. Never `git add -A`, `git add .`, or `-a` on commit — they sweep up the build and venv noise these projects are full of.
- One `git add` + `git commit` pair per planned commit. Verify staging with `git status --porcelain` if a commit spans several paths.
- **Never push.** Pushing is a separate, explicit request.
- Never amend an existing commit unless asked.
- No `Co-Authored-By` or generated-with trailer.
- Do not skip hooks. If a hook rejects a commit, stop, show the output, and fix the cause — do not reach for `--no-verify`.

If a commit fails, stop there. Report what landed and what did not; do not continue down the plan on a broken tree.

## 5. Report

One compact summary: branch, the commits that landed (short hash + subject), then anything left uncommitted and why. If a `⚠ Flag` was raised and not resolved, repeat it — it is easy to lose in the noise of a successful run.
