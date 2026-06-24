# Step 4 (Optional) — FolderBot Runner

> **⚠️ Disclaimer:** This is a hobby project developed as a proof of concept. It is **not intended for production use**. Use it at your own risk.

**Goal:** set up the browser-based local runner so FolderBot agents can execute JavaScript tools
on session files without Power Automate limitations.  
**Deliverables:** runner page connected to your FolderBot folder, tool library in place, RunJS
flag enabled in SOUL.md.

This step is entirely optional. All core FolderBot operations (read, write, replace, session
management) continue to work via the standard PA flows whether or not the runner is set up.
The runner unlocks additional capabilities: complex file transformations, third-party API calls,
and custom user-defined tools.

---

## Prerequisites

- Steps 1–3 complete: FolderBot folder exists in OneDrive, flows are active, agents are working.
- Chrome or Edge browser (Chromium-based — the File System Access API is not available in Firefox or Safari).
- OneDrive sync client running, with the FolderBot folder synced locally (visible in Windows Explorer).

### Pre-flight browser checks

Run these in the browser console (`F12 → Console`) on `about:blank`:

**1. File System Access API**
```js
window.showDirectoryPicker()
  .then(h => console.log('OK:', h.name))
  .catch(e => console.log('BLOCKED:', e.name, e.message))
```
A folder picker dialog must open. If you get `SecurityError` without a dialog, the API is
policy-blocked and the runner is not viable in your environment.

**2. Web Worker**
```js
const b = new Blob(['self.postMessage(1)'], { type: 'application/javascript' });
const w = new Worker(URL.createObjectURL(b));
w.onmessage = () => { console.log('Worker OK'); w.terminate(); };
```
You should see `Worker OK` immediately.

If both checks pass, proceed.

---

## Step 1 — Copy runner files into FolderBot

From the repository, copy the following into your local OneDrive `FolderBot/` folder:

```
FolderBot/
  tools/               ← built-in tool library + runner page (copy the full folder)
    runner.html        ← the runner page lives inside tools/
  user_tools/          ← your custom tools (copy the full folder — contains user_tools.md)
```

Let OneDrive sync complete before continuing.

> **Tools in `tools/`** are managed by the FolderBot repository — update them by copying new versions from the repo.  
> **Tools in `user_tools/`** are yours to create and modify. Keep `user_tools/user_tools.md` updated with the list of tools you add.

---

## Step 2 — (Optional) Create a secrets folder

If any of your tools need secrets (API keys, tokens, passwords), create a **local folder outside OneDrive** to store them. Secrets must never be synced to the cloud.

Suggested location: `C:\Users\<you>\FolderBotSecrets\` (or anywhere outside your OneDrive folder).

Each secret is a plain text file named by its key, e.g.:
```
FolderBotSecrets/
  openai-api-key.txt
  my-service-token.txt
```

Tools access secrets via `fs.readSecret('openai-api-key.txt')`.

> The runner will prompt you to pick this folder each time you open it. The browser does not
> persist folder handles across sessions for security reasons.

---

## Step 3 — Open the runner

1. In Windows Explorer, navigate to your local `FolderBot/tools/` folder.
2. Open `tools/runner.html` in Edge or Chrome (double-click, or right-click → Open with).
3. The runner shows a pre-flight checklist. All three indicators should be green.
4. Click **Pick FolderBot folder** → select your local `FolderBot/` folder.
   The runner validates that a `sessions/` subfolder exists.
5. *(Optional)* Click **Pick secrets folder** → select your local secrets folder.
6. The runner is now connected and polling for jobs.

> Keep this browser tab open while you are working with FolderBot. The runner only processes
> jobs while it is open. If you close the tab, pending jobs will time out (the agent will
> receive `status: timeout` and fall back to PA flows).

---

## Step 4 — Enable RunJS in SOUL.md

Add the following line to your `FolderBot/SOUL.md` under a `## Deployment config` section:

```markdown
## Deployment config
- RunJS: enabled
```

SessionBot reads this flag via GetSOUL at the start of every session. When `RunJS: enabled`
is present, the agent may use the RunJS action for supported operations. Without this flag,
the agent never calls RunJS regardless of whether the runner is open.

---

## Step 5 — Add the RunJS flow

Build Flow 12 (RunJS) following the spec in `specs/flow-specs/run_js.yaml` and the step-by-step
instructions in `setup/power-automate-flows.md` (Flow 12 section).

Add the **RunJS** action to **OpenMaja FolderBot SessionBot** in Copilot Studio (Actions tab),
then publish the agent.

---

## Step 6 — Test end-to-end

1. Open the runner and connect it to your FolderBot folder.
2. Start a new FolderBot session via Copilot Studio or Teams.
3. Ask the agent to patch a file or run a regex replace — it should call RunJS.
4. Watch the runner's job history panel — the job should appear, run, and complete within ~30 s.
5. Ask the agent to confirm the result — it reads the output from `<jobId>_out.json`.

**Manual test (no agent required):**
Create the following file in your OneDrive session folder and let it sync:
```
sessions/<your-session-id>/jobs/20260101000000-test0001_job.json
```
```json
{
  "id": "20260101000000-test0001",
  "session_id": "<your-session-id>",
  "tool": "regex-replace",
  "params": {
    "file": "memory.md",
    "pattern": "FolderBot",
    "replacement": "FolderBot ✓",
    "flags": "g"
  },
  "created_at": "2026-01-01T00:00:00Z"
}
```
The runner should pick it up within 5 s and write `20260101000000-test0001_out.json` next to it.

---

## Troubleshooting

**Runner shows pre-flight red dot for File System Access API**  
The API is policy-blocked in your managed browser. The runner is not viable — use PA flows only.

**Jobs appear in the table as `pending` but never run**  
Check that the tool name in `job.json` matches a `.js` file in `tools/` or `user_tools/`.
Check the runner log panel for error messages.

**Agent receives `status: timeout`**  
The runner tab was closed, or OneDrive sync is slow. Re-open the runner and retry.
Increase `timeout_seconds` in the RunJS PA flow if sync latency is consistently high.

**`readSecret` throws "no secrets folder connected"**  
Pick the secrets folder in the runner setup panel before running jobs that need secrets.

---

## Custom tools — `user_tools/`

To create a custom tool:

1. Create a `.js` file in `FolderBot/user_tools/` following the tool interface in `user_tools/user_tools.md`.
2. Add a row to the table in `user_tools/user_tools.md` so the agent knows the tool exists.
3. The runner picks it up automatically — no restart needed.

FolderBot agents can also create tools in `user_tools/` on your behalf. Always review
agent-generated tool code before trusting it with sensitive files or secret values.
