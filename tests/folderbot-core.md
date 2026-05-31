# Test Playbook — FolderBot Core

Tests FolderBot session management from the Orchestrator: creating, resuming, selecting, and guarding session state.
Active-session SessionBot behavior is covered in `sessionbot.md`; raw flow behavior is covered in `agent-tools-flows.md`.

---

## Pre-test setup

1. Confirm all eight Power Automate flows are turned on.
2. Confirm `FolderBot/` and `FolderBot/sessions/` exist in OneDrive.
3. Open the Orchestrator in the Copilot Studio test panel.
4. Have OneDrive and Power Automate run history open in separate browser tabs.
5. Note any pre-existing sessions so they can be distinguished from test sessions.

---

## Suite 1 — Session creation

### TC-FB-1.1 — /new creates a session and hands off to SessionBot

**Prerequisites:** The Orchestrator is open in the Copilot Studio test panel. No session is currently active.

**Actions:**
1. Type `/new CoreTest`.
2. Note the generated session ID returned by the Orchestrator.
3. Verify in OneDrive.

**Expected results:**
- Orchestrator generates a session ID in `YYYYMMDD-CoreTest` format.
- Orchestrator calls CreateSession and confirms success in one sentence.
- Orchestrator hands off to SessionBot without requiring further user input.
- `FolderBot/sessions/<sessionId>/` folder and all initial files exist in OneDrive (see TC-AF-1.1 for full structure check).
- A simple follow-up command (e.g., `/files`) is accepted by the active session.

### TC-FB-1.2 — /new without a title prompts for one

**Prerequisites:** The Orchestrator is open. No session is active.

**Actions:**
1. Type `/new` with no title.

**Expected results:**
- Orchestrator asks "What should we call this session?" (or equivalent) before creating it.
- After the user provides a title, session creation proceeds normally as in TC-FB-1.1.

### TC-FB-1.3 — /new with a duplicate title handles gracefully

**Prerequisites:** TC-FB-1.1 completed. A session named `CoreTest` already exists for today's date.

**Actions:**
1. Type `/new CoreTest` again.

**Expected results:**
- Orchestrator either generates a variant session ID (e.g., a suffix) or informs the user that a session with that name already exists.
- No crash or unhandled error.
- If a new session is created, it does not overwrite the existing one.

---

## Suite 2 — Session resumption

### TC-FB-2.1 — /resume from a fresh conversation restores the session

**Prerequisites:** TC-FB-1.1 completed. In the CoreTest session, create one marker file such as `/write outputs/resume-marker.txt` with content `Resume marker.` The session ID is recorded.

**Actions:**
1. Close and reopen the Copilot Studio test panel to start a new conversation (no active session).
2. Type `/resume <sessionId>`.
3. Type `/open outputs/resume-marker.txt`.

**Expected results:**
- Orchestrator calls GetSessionSummary.
- Orchestrator presents a summary of the session (state, goal, and plan).
- Orchestrator hands off to SessionBot.
- The marker file written before closing is still present and readable.

### TC-FB-2.2 — /resume with partial name match

**Prerequisites:** TC-FB-1.1 completed. The CoreTest session exists.

**Actions:**
1. From a fresh conversation (no active session), type `/resume Core`.

**Expected results:**
- Orchestrator calls ListSessions and matches the CoreTest session.
- If only one session matches, Orchestrator resumes it directly or confirms before resuming.
- If multiple sessions match the partial name, Orchestrator lists the matches and asks the user to pick one.

### TC-FB-2.3 — /resume non-existent session

**Prerequisites:** None.

**Actions:**
1. Type `/resume 99999999-DoesNotExist`.

**Expected results:**
- Orchestrator reports the session was not found.
- No crash or unhandled flow error.
- The Orchestrator remains usable for other commands after the error.

---

## Suite 3 — Session guardrails

### TC-FB-3.1 — Session commands before a session is created are handled gracefully

**Prerequisites:** The Orchestrator is open. No session is active.

**Actions:**
1. Type `/files` without an active session.
2. Type `/open memory.md` without an active session.

**Expected results:**
- Orchestrator (or SessionBot) informs the user that no session is active.
- Orchestrator suggests using `/new` or `/resume` to start or resume a session.
- No crash or unhandled flow error.

### TC-FB-3.2 — Unrecognized command is handled gracefully

**Prerequisites:** A session is active.

**Actions:**
1. Type `/unknowncommand`.

**Expected results:**
- The agent responds helpfully (e.g., "I don't recognize that command — type `/help` for a list of available commands.").
- No crash or error.

---

## Suite 4 — Help

### TC-FB-4.1 — /help lists all commands with descriptions

**Prerequisites:** The Orchestrator is open (session active or not).

**Actions:**
1. Type `/help`.

**Expected results:**
- Orchestrator lists all core commands: `/new`, `/resume`, `/session`, `/files`, `/open`, `/write`, `/plan`, `/help`.
- Each command has a brief description of what it does.
- Response is formatted clearly and fits in a single message.
