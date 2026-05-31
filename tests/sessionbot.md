# Test Playbook — SessionBot

Tests active-session SessionBot behavior: file command routing, workspace upkeep, and error handling.
Session creation/resume/listing is covered in `folderbot-core.md`; raw flow behavior is covered in `agent-tools-flows.md`.
All tests require an active session (the Orchestrator has already handed off to SessionBot).

---

## Pre-test setup

1. Confirm all eight Power Automate flows are turned on.
2. Open the Orchestrator in the Copilot Studio test panel.
3. Create a clean test session: `/new SessionBotTest`
   - Record the generated session ID: `___________________________`
4. Confirm the Orchestrator hands off to SessionBot after session creation.
5. Open OneDrive and Power Automate run history in separate browser tabs.

---

## Suite 1 — Active-session file commands

These are smoke tests for SessionBot command interpretation. The exhaustive flow-level read/write/list/delete checks stay in `agent-tools-flows.md`.

### TC-SB-1.1 — Write, read, and list a session file

**Prerequisites:** A SessionBot session is active. `outputs/sessionbot-smoke.txt` does not exist.

**Actions:**
1. Type `/write outputs/sessionbot-smoke.txt` and provide content `SessionBot smoke test.`
2. Type `/open outputs/sessionbot-smoke.txt`.
3. Type `/files outputs`.

**Expected results:**
- SessionBot confirms the write in one sentence.
- `/open` returns exactly `SessionBot smoke test.`
- `/files outputs` includes `sessionbot-smoke.txt`.
- All commands stay inside the active SessionBot conversation.

### TC-SB-1.2 — Natural language file operation is routed correctly

**Prerequisites:** A SessionBot session is active.

**Actions:**
1. Type a natural language request, e.g. "Can you save a note to outputs/notes.txt saying: Meeting at 10am."

**Expected results:**
- SessionBot interprets the request as a file write and calls WriteTextFile.
- `outputs/notes.txt` exists in OneDrive with content matching the request.
- SessionBot confirms success without requiring an explicit `/write` command.

---

## Suite 2 — Workspace upkeep

After every action, SessionBot should keep the session files current.

### TC-SB-2.1 — memory.md reflects recent activity

**Prerequisites:** TC-SB-1.1 completed.

**Actions:**
1. Type `/open memory.md`.

**Expected results:**
- `memory.md` mentions at least one recent file operation and the current session goal.
- Content is compact (under ~2 KB).

### TC-SB-2.2 — plan.md is accessible and editable

**Prerequisites:** A SessionBot session is active.

**Actions:**
1. Type `/plan` to view the current plan.
2. Ask SessionBot to add a step: "Verify file write round-trip."
3. Type `/plan` again.

**Expected results:**
- First `/plan` returns the current plan content.
- After the update, the new step appears in `plan.md`.
- `plan.md` in OneDrive reflects the change.

### TC-SB-2.3 — state.json.last_updated advances after actions

**Prerequisites:** A SessionBot session is active.

**Actions:**
1. Type `/open state.json` and record the `last_updated` value.
2. Type `/write outputs/upkeep-test.txt` with any content.
3. Type `/open state.json` again.

**Expected results:**
- The new `last_updated` value is later than the recorded value.
- `active_files` reflects the newly written file (or at minimum the list is non-empty).

---

## Suite 3 — Error handling

### TC-SB-3.1 — Reading a non-existent file gives a clean error and session stays alive

**Prerequisites:** A SessionBot session is active. `outputs/ghost.txt` does not exist.

**Actions:**
1. Type `/open outputs/ghost.txt`.
2. Type `/files` to verify the session is still usable.

**Expected results:**
- SessionBot reports the file was not found.
- No crash or unhandled flow error in Power Automate run history.
- Session remains active: `/files` returns the file listing normally.
