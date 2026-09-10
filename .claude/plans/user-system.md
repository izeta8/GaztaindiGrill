# Feature plan: user system

Branch: `feat/user-system` (current branch is `develop`, tree clean apart from this plan file).

## What this is

Today "who made this program" is a free-text `creator_name` typed into the program form every time.
This turns it into a real entity: a `users` table, `programs.user_id` pointing at it, the free-text
column gone, and a user picked once and remembered in the browser.

## Decisions taken (change them by editing this file before implementing)

### Storage: `localStorage`, key `gaztaindigrill.user`, value `{ "id": 3, "name": "Jon" }`

`sessionStorage` would re-prompt on every new tab and every browser restart — the app is served off
Home Assistant on a tablet that gets reopened constantly, so that is the wrong trade. `localStorage`
persists until cleared.

Two constraints this creates:
- The export is static (`output: 'export'`), so the read must happen in an effect, never during
  render, or hydration mismatches.
- The stored id can point at a user that no longer exists. On load the stored user is validated
  against `GET /users`; if it is gone, the entry is dropped and the modal opens.

### Schema: `users` table, `programs.user_id`, `creator_name` dropped

The database holds test data only, so there is nothing to migrate — the column goes in the same
pass that adds the relation.

```sql
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active     TINYINT(1) DEFAULT 1
);

-- At least one user has to exist before programs can be made NOT NULL against it
INSERT INTO users (name) VALUES ('Gaztaindi');

ALTER TABLE programs ADD COLUMN user_id INT NULL;

-- Test rows only: point every existing program at that first user
UPDATE programs SET user_id = (SELECT id FROM users LIMIT 1);

ALTER TABLE programs
  MODIFY COLUMN user_id INT NOT NULL,
  ADD CONSTRAINT fk_programs_user FOREIGN KEY (user_id) REFERENCES users(id),
  DROP COLUMN creator_name;
```

`user_id` is `NOT NULL`, keeping the invariant `creator_name NOT NULL` already had: a program always
has a creator. Adding it nullable first and tightening after the `UPDATE` is just so MySQL accepts
the column on a table that already has rows.

Consequence of the foreign key: a user with programs cannot be deleted outright. That is why `users`
carries `is_active` — deactivation, same as `programs` does it. No delete endpoint either way.

**This SQL is run by hand.** There are no migration files in this repo; the schema is only described
in `GaztaindiGrill-API/docs/database.md`, and that doc is the record. Run it when landing task 1.

### `creatorName` stays in the MQTT payload — the firmware is untouched

The web client sends `creatorName` in the `action/program/execute` payload and the firmware stores it
as a plain `String` it never interprets (`ProgramManager.cpp:38`, `ProgramManager.h:23`), republishing
it retained on `grill/{id}/status/program/current` for `ExecutionDetails.tsx` to render. It is a
display label in transit, not a database field.

So the API resolves the name — `GET /programs` returns `user_name` from a `JOIN users` next to
`user_id` — and the client puts that string into the execute payload exactly where `creatorName` went
before. **No MQTT contract change, no reflash, no `mqtt-contract-auditor` task.**

Doing it in the API rather than the client also means the programs list keeps rendering from one
fetch, instead of needing the users list joined in the browser.

## Tasks

### 1. Document the `users` table and the `programs.user_id` relation — DONE (schema SQL still to run by hand)

Rewrites the schema doc: new `users` table in the ERD and the table descriptions, `user_id` added to
`programs`, `creator_name` removed. Run the schema SQL above by hand when landing this.

- Files: `GaztaindiGrill-API/docs/database.md`
- Commit: `docs`
- Verify: `DESCRIBE users;` and `DESCRIBE programs;` match the doc — `user_id` present and `NOT NULL`,
  no `creator_name`

### 2. Add the users endpoints to the API — DONE

`GET /users` (active only) and `POST /users/create`. New router file mirroring `categories.py` line
for line — same manual parameterized SQL, same `JSONResponse` shapes, same Spanish error messages.
`POST` returns 400 on an empty name and surfaces the MySQL duplicate-key error as a 409 with a
readable message, since `name` is `UNIQUE`.

- Files: `GaztaindiGrill-API/app/api/routes/users.py` (new),
  `GaztaindiGrill-API/app/schemas/programs.py` (add `CreateUserRequest`),
  `GaztaindiGrill-API/app/main.py` (include the router)
- Commit: `feat`
- Verify: `python -m compileall app`, then with the venv up `python -m uvicorn app.main:app --reload`
  and hit `GET /users` + `POST /users/create` from `/docs`

### 3. Move the API from `creator_name` to `user_id` — DONE (blocked on making `creator_name` nullable)

- `CreateProgramRequest` / `UpdateProgramRequest`: `creator_name` out, `user_id` (alias `userId`) in.
  The create endpoint's required-field check swaps `creator_name` for `user_id`.
- `INSERT` and the dynamic PATCH `SET` map use `user_id`.
- `GET /programs` and `GET /programs/{id}` stop being `SELECT *` and become
  `SELECT p.*, u.name AS user_name FROM programs p JOIN users u ON p.user_id = u.id`, so responses
  carry `user_id` and `user_name` (snake_case, as the rest of the response already is).
- `GET /programs` also gains `WHERE p.is_active = 1`, so soft-deleted programs stop leaving the API
  at all. `GET /programs/{id}` stays unfiltered — it is fetched by explicit id, never browsed.

- Files: `GaztaindiGrill-API/app/schemas/programs.py`, `GaztaindiGrill-API/app/api/routes/programs.py`
- Commit: `refactor`
- Verify: `python -m compileall app`; create a program with a `userId` and confirm the row got it;
  `GET /programs` shows `user_name` on every row; soft-delete one with `DELETE /programs/{id}` and
  confirm it drops out of `GET /programs` but still answers on `GET /programs/{id}`

### 4. Ask for the user on first entry, and let it be changed from the FAB — DONE

- `src/types/user.ts` — `User { id, name }`, exported from `src/types/index.ts`.
- `src/contexts/CurrentUserContext.tsx` — holds the current user, reads and writes `localStorage`,
  exposes `currentUser`, `setCurrentUser`, `users` (the fetched list), `createUser`, and an
  `openUserModal` the FAB calls. Reads storage in an effect, validates the stored id against
  `GET /users`, clears it if the user is gone. Follows the shape of `CurrentModeContext.tsx`.
- `src/components/shared/UserSelectionModal.tsx` — a `Select` of users plus a `+` button that swaps
  in a name field to create one, matching how `ProgramForm` pairs its category `Select` with
  `CategoryModal`. Dismissible when reopened from the FAB (there is already a user); **not**
  dismissible on first entry, since there is nothing useful to do without one. `Modal` closes on ESC
  unconditionally today, so this needs a `dismissible` prop on `Modal` rather than a second component.
- `GlobalActionFab.tsx` — a third entry in the `actions` array, `Cambiar usuario` with the `lucide`
  `UserRound` icon, `danger: false`, calling `openUserModal()`. It is not MQTT-backed, so unlike the
  other two it is never `disabled` by `isConnected` and needs no `window.confirm`.
- Mounted in `src/app/providers.tsx` inside the new provider.

- Files: `src/types/user.ts` (new), `src/types/index.ts`,
  `src/contexts/CurrentUserContext.tsx` (new),
  `src/components/shared/UserSelectionModal.tsx` (new),
  `src/components/ui/Modal.tsx`, `src/components/shared/GlobalActionFab.tsx`,
  `src/app/providers.tsx`
- Commit: `feat`
- Verify: `npm run lint` + `npm run typecheck`; in the browser with `localStorage.clear()` the modal
  appears and will not close until a user is picked; reload shows no modal; the FAB reopens it and
  cancels cleanly; deactivate that user in MySQL, reload, modal appears again

### 5. Replace the creator text input with a user combobox, and read the joined name everywhere — DONE

- `ProgramForm.tsx` — the `Creador` `Input` becomes a `Select` over `users` with a `+` button beside
  it, laid out exactly like the existing `Categoría` row, defaulting to `currentUser`. The submit
  payload carries `userId` instead of `creatorName`. Edit mode preselects the program's `user_id`.
- `types/program.ts` — `creatorName` out, `userId: number` and `userName: string` in, on `Program`,
  `CreateProgramRequest` and `UpdateProgramRequest`. `RunningProgram` keeps its `creatorName`: that
  one comes off MQTT, not the API.
- `list/page.tsx` — map `user_id`/`user_name` through, drop `creator_name` from the `ApiProgram`
  shape and from the runtime `.filter()` guard, point the creator filter at `userName`, and send
  `creatorName: programToExecute.userName` in the execute payload. The `.filter((p) => p.isActive)`
  goes too: task 3 made the API stop sending inactive programs, so it now filters nothing.
- `ProgramCard.tsx` — `{p.userName}`.
- `create/page.tsx` / `edit/page.tsx` — send `userId`, read `user_id` back.

- Files: `src/app/programs/components/ProgramForm.tsx`,
  `src/app/programs/components/UserModal.tsx` (new, mirroring `CategoryModal.tsx`),
  `src/app/programs/create/page.tsx`, `src/app/programs/edit/page.tsx`,
  `src/app/programs/list/page.tsx`, `src/app/programs/list/components/ProgramCard.tsx`,
  `src/types/program.ts`
- Commit: `feat`
- Verify: `npm run lint` + `npm run typecheck` + `npm run build`; create a program and confirm the
  creator came preselected and the row got a `user_id`; edit an existing program and confirm it shows
  its user; run a program and confirm the creator still shows in `ExecutionDetails`
- After this, `grep -rn "creator_name\|creatorName" GaztaindiGrill-NextJS/src GaztaindiGrill-API/app`
  should return only `ExecutionDetails.tsx`, `types/program.ts`'s `RunningProgram`, and the execute
  payload in `list/page.tsx` — the three MQTT-side uses

## Not in scope

No firmware change and no MQTT contract change — see the decision above.

No user delete or rename endpoint, no per-user filtering preset on the list page.

## Questions already settled

- **Renaming a user rewrites history, and that is wanted.** With `creator_name` gone the name is
  read through the join, so a rename changes the creator shown on every program that user ever made.
  Confirmed as the intended behaviour, not a side effect to design around.
- **The users table stores a name and nothing else.** No PIN, no colour, no role. Identity here is
  self-declared — the user picks a name from a combobox and it lands in `localStorage` — so there is
  no authentication for a role to hang off: anyone could pick the admin. A role only means something
  once a PIN sits behind it, and a PIN is friction on a shared kitchen tablet. Revisit together or
  not at all.
- **Inactive programs are filtered in the API**, not the client. Covered by tasks 3 and 5.
