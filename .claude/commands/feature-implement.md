---
description: Implement one task at a time from an approved feature-plan, verifying and staging each atomic step and proposing its commit message. Stages; never commits.
argument-hint: "[task number, or a single well-scoped task description]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, Agent
---

Implement one task from the approved plan.

Task to implement (may be empty — then take the next unfinished one): $ARGUMENTS

## Purpose

Execute a plan from `/feature-plan` one atomic step at a time, staging each step's files as soon as it lands and proposing a commit message for it. Never accumulate uncommitted, unstaged work across several tasks — that is the exact habit this command exists to prevent.

**This command never runs `git commit`.** Staging and proposing the message is as far as it goes; reviewing the staged diff and committing stays the developer's call. That is also the repo's own working agreement: never commit without being asked.

## Instructions

1. **Find the plan.** Use the one in this conversation if present; otherwise read the most recent file in `.claude/plans/`. If neither exists and `$ARGUMENTS` doesn't describe a single well-scoped task, stop and ask the user to run `/feature-plan` first.

2. **Take the specified task** (or the next unfinished one). State in one line which task you're on, so a mistyped number is visible immediately.

3. **Before writing code, read the docs for that task's domain** if they aren't already loaded — the context-routing table in `/feature-plan` step 2. For anything MQTT, `GrillConstants.h` wins over every doc.

4. **Implement only that task's scope.** No refactoring unrelated files, no pulling work forward from a later task, no drive-by cleanups. If you spot something worth fixing outside the scope, note it in the report rather than doing it.

5. **Follow house style**, which means matching the surrounding code rather than importing conventions from elsewhere: the `{ time?, temperature?, position?, rotation? }` step schema is shared across all three projects; API request bodies are camelCase while responses and the DB are snake_case (intentional — don't "fix" one side alone); firmware error codes are machine codes, with the display wording owned by the client.

6. **Verify before staging. Never stage red.**

   | Project touched | Run |
   |---|---|
   | `GaztaindiGrill-ESP32/` | `pio run` from `GaztaindiGrill-ESP32/` |
   | `GaztaindiGrill-NextJS/` | `npm run lint` from `GaztaindiGrill-NextJS/`; add `npm run build` if the change could break the build |
   | `GaztaindiGrill-API/` | `python -m compileall app` from `GaztaindiGrill-API/`; import `app.main` too if a venv with the deps exists |

   If the task changed any MQTT topic, payload string, error code or JSON field name, run the `mqtt-contract-auditor` agent and report what it found before staging.

   These are compile/lint gates, not tests — there are no test suites in any of these projects. **Never claim a change is "tested."** Say what you actually ran, and name the manual verification the user still needs to do (flash and watch `mosquitto_sub -v -t 'grill/#'`, exercise the page in a browser, hit the endpoint directly).

7. **Stage only the files this task touched.** `git add -- <exact paths>`. Never `git add -A`, `git add .`, or `-a` on commit — these projects are full of build and venv noise. Verify with `git status --porcelain` when the task spans several paths.

8. **Print the exact command pair**, so the user can review the staged diff and then commit in one click. **The user is on Windows PowerShell 5.1, where `&&` is a parser error** — chain with `; if ($?) { ... }` and tag the fence `powershell`:

   ```powershell
   git add -- GaztaindiGrill-ESP32/lib/Grill/ProgramManager.cpp; if ($?) { git commit -m "feat: let programs run positions relative to the starting point" }
   ```

   If the task turned out to need more than one commit, split it: stage and report each part separately, in order, each with its own `git add` + `git commit` pair — the user runs them in sequence. Never lump two concerns into one staging step because it's faster.

9. **Update the plan file** — mark the task done — then report in one or two sentences and **stop**. Do not chain into the next task unreviewed.

10. **End every report with a Next step line:**
    - Tasks remain: `**Next step:** run `/feature-implement <next number>`.`
    - That was the last task: `**Next step:** the feature is implemented — run `/docs-sync`.`

## Output (per task)

- What was implemented, in one or two sentences.
- What was verified and with which command — and what still needs checking by hand.
- The staged files.
- The suggested commit message, as a runnable command.
- The Next step line, then stop.

## Guardrails

- Never run `git commit`, `git push`, `git checkout` or `git stash`. Staging is the full extent of this command's git mutation.
- Never switch branches — that's the user's call.
- One task → one staged batch → one proposed message.
- If a requirement turns out ambiguous mid-task, stop and ask. Don't guess and keep going.
- If the working tree already had unrelated changes when you started, leave them alone and say they're there — don't sweep them into the staging.
