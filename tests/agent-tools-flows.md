# Test Playbook — Agent Tools / Power Automate Flows

Tests the eight Power Automate flows in isolation, verifying inputs, outputs, and error paths.
Run these tests from the Copilot Studio test panel with a session already active, or by triggering flows directly in Power Automate.

When inspecting raw Power Automate responses, note that the current exported package is not
fully consistent about the `success` type: ListSessions, ListSessionFiles, and ReadTextFile
return booleans, while CreateSession, GetSessionSummary, WriteTextFile, DeleteFile, and
AppendHistory return text values such as `"true"` or `"false"`.

---

## Pre-test setup

1. Confirm the eight flows are turned on in Power Automate.
2. Confirm `FolderBot/` and `FolderBot/sessions/` exist in OneDrive.
3. Open OneDrive in a browser tab to verify file contents directly.
4. Open Power Automate run history in another tab to inspect failed flow runs.
5. Create a clean test session via the Orchestrator: `/new FlowsTest`
   - Record the generated session ID: `___________________________`

---

## Suite 1 — CreateSession

### TC-AF-1.1 — Full session folder structure is created

**Prerequisites:** No session with the test name exists. The `FolderBot/sessions/` folder is accessible.

**Actions:**
1. Type `/new FlowsTest` in the Copilot Studio test panel.
2. Record the generated session ID from the agent response.
3. Open OneDrive and navigate to `FolderBot/sessions/<sessionId>/`.

**Expected results:**
- Flow returns `success: "true"`, `session_id` matching the generated ID, a valid `created_at` timestamp, and a `folder_path`.
- `FolderBot/sessions/<sessionId>/` folder exists.
- The following files exist inside the session folder: `state.json`, `memory.md`, `plan.md`, `history.jsonl`.
- Subfolders `inputs/`, `outputs/`, `jobs/` exist (each containing a `.gitkeep` marker).
- `state.json` is valid JSON with `session_id` matching the folder name, a valid ISO 8601 `created_at`, `locked: false`, and `active_files: []`.

### TC-AF-1.2 — CreateSession response fields are complete

**Prerequisites:** TC-AF-1.1 completed successfully.

**Actions:**
1. Inspect the raw CreateSession flow output in Power Automate run history.

**Expected results:**
- Response body contains `success`, `session_id`, `created_at`, and `folder_path` fields.
- No extra or missing fields compared to the schema in `specs/schemas/state.schema.json`.

---

## Suite 2 — WriteTextFile

### TC-AF-2.1 — Write a new text file

**Prerequisites:** A test session is active (TC-AF-1.1). The file `outputs/hello.txt` does not exist in the session folder.

**Actions:**
1. Type `/write outputs/hello.txt` and provide content `Hello, FolderBot!` when prompted.

**Expected results:**
- Agent confirms success in one sentence.
- Raw flow output returns `success: "true"` and `file_path: "outputs/hello.txt"`.
- `FolderBot/sessions/<sessionId>/outputs/hello.txt` exists in OneDrive.
- File content is exactly `Hello, FolderBot!`.

### TC-AF-2.2 — Overwrite an existing file

**Prerequisites:** TC-AF-2.1 completed. `outputs/hello.txt` exists with content `Hello, FolderBot!`.

**Actions:**
1. Type `/write outputs/hello.txt` and provide content `Updated content.`.

**Expected results:**
- Agent confirms success.
- `outputs/hello.txt` content is now `Updated content.`.
- No duplicate file was created in the session folder.

### TC-AF-2.3 — Write a file in a nested path

**Prerequisites:** A test session is active.

**Actions:**
1. Type `/write outputs/reports/summary.txt` and provide content `Report summary.`.

**Expected results:**
- Agent confirms success.
- `outputs/reports/summary.txt` exists in OneDrive (OneDrive auto-creates intermediate folders).
- File content is `Report summary.`.

### TC-AF-2.4 — Write a JSON file

**Prerequisites:** A test session is active.

**Actions:**
1. Type `/write state-snapshot.json` and provide content `{"key": "value", "number": 42}`.
2. Type `/open state-snapshot.json` to read it back.

**Expected results:**
- Write succeeds with no error.
- Read returns the exact JSON content.
- No content corruption or extra whitespace introduced.

---

## Suite 3 — ReadTextFile

### TC-AF-3.1 — Read an existing file

**Prerequisites:** TC-AF-2.1 completed. `outputs/hello.txt` contains `Hello, FolderBot!` (or `Updated content.` from TC-AF-2.2).

**Actions:**
1. Type `/open outputs/hello.txt`.

**Expected results:**
- Agent displays the exact file content.
- No formatting artifacts or truncation.

### TC-AF-3.2 — Read a non-existent file returns a clean error

**Prerequisites:** A test session is active. `outputs/doesnotexist.txt` does not exist.

**Actions:**
1. Type `/open outputs/doesnotexist.txt`.

**Expected results:**
- Agent reports the file was not found.
- No crash or unhandled flow error in Power Automate run history.
- Flow returns `success: false`, error text `Error accessing the file - it is probably non-existing or non-visible.`, and empty content as `""`.

### TC-AF-3.3 — Read a file that exceeds the size cap

**Prerequisites:** A test session is active. A file larger than `omj_folderbot_max_file_size_kb` KB has been manually uploaded to the session folder via OneDrive.

**Actions:**
1. Type `/open <large-file-name>`.

**Expected results:**
- Agent reports the file exceeds the size limit.
- Raw flow output returns `success: false` and an error shaped like `File size <bytes> bytes exceeds limit <bytes>`.
- No partial content is returned.
- No crash or connector-level error.

---

## Suite 4 — DeleteFile

### TC-AF-4.1 — Delete requires agent confirmation

**Prerequisites:** TC-AF-2.1 completed. `outputs/hello.txt` exists.

**Actions:**
1. Ask the agent to delete `outputs/hello.txt` (e.g. `/delete outputs/hello.txt`).

**Expected results:**
- Agent asks for confirmation before calling the DeleteFile flow.
- The DeleteFile flow is not called until confirmation is given.

### TC-AF-4.2 — Delete confirmed removes the file

**Prerequisites:** TC-AF-4.1: agent has asked for confirmation.

**Actions:**
1. Confirm the deletion.
2. Check OneDrive.

**Expected results:**
- Agent confirms deletion.
- Raw flow output returns `success: "true"`.
- `outputs/hello.txt` no longer exists in OneDrive.
- No error in Power Automate run history.

---

## Suite 5 — ListSessionFiles

### TC-AF-5.1 — List session root

**Prerequisites:** A test session is active with at least the initial files in place (from TC-AF-1.1).

**Actions:**
1. Type `/files .` or `/files`.

**Expected results:**
- Agent lists at least `state.json`, `memory.md`, `plan.md`, `history.jsonl`.
- Any files written during Suite 2 also appear.
- No crash or empty response.
Note: the exported ListSessionFiles action describes `.` as the explicit root-folder argument.

### TC-AF-5.2 — List a subfolder

**Prerequisites:** TC-AF-2.1 completed. `outputs/hello.txt` exists.

**Actions:**
1. Type `/files outputs`.

**Expected results:**
- Agent lists only files inside `outputs/`.
- `state.json`, `memory.md`, and other root files are not included.

### TC-AF-5.3 — List an empty subfolder

**Prerequisites:** A test session is active. `inputs/` subfolder has no user-created files.

**Actions:**
1. Type `/files inputs`.

**Expected results:**
- Agent reports the folder is empty or lists only the `.gitkeep` marker created by CreateSession.
- No crash or flow error.

---

## Suite 6 — ListSessions

### TC-AF-6.1 — List all sessions

**Prerequisites:** At least one session (the FlowsTest session from TC-AF-1.1) exists in `FolderBot/sessions/`.

**Actions:**
1. From a fresh Orchestrator conversation (no active session), type `/resume` with no argument.

**Expected results:**
- Agent calls ListSessions and presents a list of available sessions.
- The FlowsTest session appears in the list with its name and last-modified date.

### TC-AF-6.2 — Partial name match resolves the session

**Prerequisites:** TC-AF-6.1 completed. The FlowsTest session exists.

**Actions:**
1. Type `/resume Flows` (partial name).

**Expected results:**
- Agent calls ListSessions, matches the FlowsTest session, and offers to resume it (or resumes directly if it is the only match).

---

## Suite 7 — GetSessionSummary

### TC-AF-7.1 — Get summary for an existing session

**Prerequisites:** TC-AF-1.1 completed. The FlowsTest session has at least `state.json`, `memory.md`, and `plan.md` populated.

**Actions:**
1. From a fresh Orchestrator conversation, type `/resume <sessionId>`.

**Expected results:**
- Agent calls GetSessionSummary.
- Agent presents a summary including the session state and plan.
- Agent hands off to SessionBot without requiring further user input.

### TC-AF-7.2 — Get summary for a non-existent session

**Prerequisites:** None.

**Actions:**
1. Type `/resume 99999999-DoesNotExist`.

**Expected results:**
- Agent reports the session was not found.
- No crash or unhandled flow error.
- Flow returns `success: "false"` with `state`, `memory`, and `plan` set to `not found.`.

---

## Suite 8 — AppendHistory

### TC-AF-8.1 — History grows after each turn

**Prerequisites:** A test session is active. `history.jsonl` was created by CreateSession.

**Actions:**
1. Perform at least two complete user/assistant exchanges in the session (e.g., write a file, then list files).
2. Type `/open history.jsonl`.

**Expected results:**
- `history.jsonl` contains at least two entries.
- Each line is valid JSON.
- Each entry has `ts`, `role`, and `content` fields.
- Entries are in chronological order.
- Raw AppendHistory output returns `success: "true"`.

### TC-AF-8.2 — History entries from multiple sessions accumulate

**Prerequisites:** TC-AF-8.1 completed. Resume the session in a fresh Copilot Studio conversation and perform one more action.

**Actions:**
1. From a new conversation, type `/resume <sessionId>`.
2. Perform one action (e.g., `/open memory.md`).
3. Type `/open history.jsonl`.

**Expected results:**
- Entries from the previous session are still present.
- New entries from the resumed session are appended after the old ones.
- No entries were overwritten or lost.
