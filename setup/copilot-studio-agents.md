# Step 3 — Copilot Studio Agents

> **⚠️ Disclaimer:** This is a hobby project developed as a proof of concept. It is **not intended for production use**. Use it at your own risk. If you plan to deploy it in a corporate environment, always check with your IT department first to ensure it does not violate any company policy.


**Goal:** configure the two Copilot Studio agents, inject your tenant-specific instructions, connect them to the Step 2 Power Automate flows, and verify the end-to-end flow.  
**Deliverables:** two working Copilot Studio agents connected to the Step 2 Power Automate flows.

---

## Architecture recap

```
User
  │
  ▼
Orchestrator          ← /new, /resume, /help + routing
  │
  ├── Tools: CreateSession, ListSessions, GetSessionSummary
  │
  └── Connected agent: SessionBot
        │
        └── Tools: GetSOUL, ListSessionFiles, ReadTextFile, WriteTextFile,
                   DeleteFile, AppendHistory, GetSessionSummary,
                   ReadFileLines, ReplaceInFile
```

Both agents run in **Generative AI (GPT) mode** — no manual topic authoring required.
The LLM reads the instructions and decides which tools to call.

> **Model selection — verify after import.** The v0.1.0.0 exported package pins specific
> Copilot Studio model hints (`Sonnet46` for the Orchestrator and `opus4-1` for the
> SessionBot). These hints survive the import and the agents will try to use those models
> if they are available in your tenant. After import, open each agent in Copilot Studio
> under **Settings → Generative AI** and confirm the selected model is one your tenant is
> licensed for. If not, switch each agent to a supported model before running the end-to-end
> test — otherwise the agent may fall back silently or fail at conversation start. If you
> are following the manual path you choose the model yourself per agent in Step 0.

---

## Prerequisites

- Step 1 complete: `FolderBot/` exists in OneDrive and `FolderBot/SOUL.md` has been customized.
- Step 2 complete via one of the supported paths:
  - **Import path:** `FolderBotCore_0_1_0_0.zip` imported via [`setup/one-shot-import.md`](one-shot-import.md), all 11 flows active, and both agents (`OpenMaja FolderBot` and `OpenMaja FolderBot SessionBot`) appear under **Solutions → FolderBotCore → Chatbots**. The package is version `0.1.0.0` and uses publisher prefix `omj`.
  - **Manual path:** all 11 flows built and tested via [`setup/power-automate-flows.md`](power-automate-flows.md). The flows exist, but the agents do not exist yet; create them in [Step 0](#step-0--ensure-the-agents-exist).
- Access to Copilot Studio at [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com).
- The Power Platform environment selected in Copilot Studio matches the one where the solution or manual flows live.

---

## Step 0 — Ensure the agents exist

If you used the one-shot import, skip this step. The solution package already includes both agents with working instructions and imported action bindings.

If you built the flows manually, create the agents before continuing:

1. Open [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com) → select the same Power Platform environment that contains your flows.
2. Create an agent named **OpenMaja FolderBot SessionBot**.
3. Enable **Generative AI**, **Generative (preview)**, or **GPT** mode, depending on the label in your tenant.
4. Add these flow actions to SessionBot:
   - **GetSOUL** ← add this first; it is called at the start of every session
   - ListSessionFiles
   - ReadTextFile
   - WriteTextFile
   - DeleteFile
   - AppendHistory
   - GetSessionSummary
   - ReadFileLines
   - ReplaceInFile
5. Create an agent named **OpenMaja FolderBot**.
6. Enable GPT/generative mode.
7. Add these flow actions to OpenMaja FolderBot:
   - CreateSession
   - ListSessions
   - GetSessionSummary
8. Add **OpenMaja FolderBot SessionBot** as a connected agent/action for OpenMaja FolderBot.
9. Save both agents.

After this step, the manual path converges with the import path: both paths have two agents and the same nine flow actions available.

---

## Step 1 — Configure SessionBot instructions

If you used one-shot import, SessionBot comes pre-imported with working instructions. Review or customize them only if you want tenant-specific behavior changes. If you used the manual path, use these instructions as the first content for the SessionBot agent you created in Step 0.

1. Open [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com) → select your environment.
2. Open **OpenMaja FolderBot SessionBot**.
3. Go to **Settings** → **Generative AI** → confirm **Generative (preview)** or **GPT** mode is enabled.
4. In **Instructions**, replace the existing content with the content of `agents/sessionbot-instructions.md`.
5. Verify total character count is under **8,000**.
6. Click **Save**.

> **Note — no `[SOUL.MD]` placeholder to replace.** SessionBot now loads `SOUL.md` at runtime
> via the **GetSOUL** flow action (called automatically at the start of every `/new` and `/resume`
> session). The instructions already contain the GetSOUL call directive — do not add static SOUL
> content here. If `FolderBot/SOUL.md` does not exist in OneDrive, GetSOUL will create it
> automatically with the default content from `agents/SOUL.md`.

---

## Step 2 — Configure Orchestrator instructions

1. Open **OpenMaja FolderBot**.
2. Go to **Settings** → **Generative AI** → confirm GPT mode is enabled.
3. In **Instructions**, replace the existing content with the content of `agents/orchestrator-instructions.md`.
4. Replace the `[SOUL.MD]` placeholder with your customized `FolderBot/SOUL.md` content from OneDrive. If you customized the local template instead, use `agents/SOUL.md`.
5. Verify total length is under **8,000** characters.
6. Click **Save**.

---

## Step 3 — Verify action connections

Verify that the agents reference the Power Automate flows via actions, and that the connections are active in your tenant.

1. Open **OpenMaja FolderBot SessionBot** → **Actions** tab.
2. For each action, confirm the linked flow is present. If you used the manual path, add any missing action now.
3. Confirm the OneDrive for Business connection resolves to the account whose OneDrive contains the `FolderBot/` workspace.
4. Repeat for **OpenMaja FolderBot**.

If any action shows a broken or missing connection, fix it following the [connection troubleshooting steps](#fix-connection-ownership-for-the-service-account) below, then **Publish** both agents.

The current exported package uses OneDrive connection references with invoker/runtime binding.
Depending on tenant policy, users may still see a connection authorization prompt. Treat the
connection prompt behavior as something to verify during setup, not as guaranteed embedded
service-account behavior.

---

## Step 4 — Test SessionBot standalone

Before running end-to-end tests, verify SessionBot works in isolation:

1. **Test** panel → set `session_id` context manually (paste a real session ID from your OneDrive).
2. Start the conversation — SessionBot should immediately call **GetSOUL** and load the behavioral rules. Confirm no error is returned and the agent responds normally.
3. Type `/files` → verify it calls ListSessionFiles and formats the result.
4. Type `/open memory.md` → verify it reads the file and displays it.
5. Type `/write outputs/hello.txt` → when asked for content, type `Hello world` → verify the file appears in OneDrive.
6. Type `/plan` → verify it reads and displays plan.md.
7. Ask the agent to read lines 1–5 of `memory.md` → verify it calls **ReadFileLines** and returns only those lines plus the total line count.
8. Ask the agent to replace a known phrase in `outputs/hello.txt` with something else → verify it calls **ReplaceInFile**, the file is updated in OneDrive, and the response reports `any_matched: true`.

To test the GetSOUL self-heal: temporarily rename `FolderBot/SOUL.md` in OneDrive, start a new test conversation, confirm GetSOUL recreates the file and the agent initialises normally.

---

## Step 5 — End-to-end test

### Scenario A — New session
1. Open the Orchestrator test panel.
2. Type: `/new Building a sales report`
3. Expected: Orchestrator calls CreateSession with a generated ID, confirms creation, hands off to SessionBot.
4. Type: `/write inputs/data.csv` → provide some CSV content.
5. Type: `/files` → verify the file appears in the list.
6. Type: `/open inputs/data.csv` → verify content is displayed.

### Scenario B — Resume session
1. Start a new test conversation (simulates Copilot session expiry).
2. Type: `/resume` (or `/resume <sessionId>`).
3. Expected: Orchestrator calls GetSessionSummary, summarizes the session state, hands off to SessionBot.
4. Type: `/plan` → verify the plan reflects what was done in Scenario A.

### Scenario C — Memory upkeep
After writing a file in Scenario A, check OneDrive:
- `memory.md` should mention the file that was written.
- `history.jsonl` should contain entries for each turn.
- `state.json.last_updated` should reflect the latest action.

---

## Optional — Export an agent backup

If you have customized the agents and want to back up the full solution including your changes:

1. Power Platform → **Solutions** → open `FolderBotCore`.
2. Select **Export**.
3. Choose **Unmanaged** to preserve editability.
4. Save the ZIP somewhere durable.

---

## Troubleshooting

### Teams / M365 asks users to allow OneDrive for Business

#### Understanding the storage model and its security trade-offs

FolderBot stores all sessions below one configured OneDrive root folder. The exported package
imports OneDrive connection references with invoker/runtime binding, so authorization prompts can
appear depending on tenant policy and how the imported actions resolve their connections.

If your tenant accepts the imported binding and all actions use the same OneDrive account, the
workspace remains centralized under `FolderBot/sessions/<sessionId>/`.

If each user is prompted to authorize their own OneDrive connection, sessions may be created in
different users' OneDrives. For personal or team pilots where one shared workspace is desired,
you can optionally change the actions/flows to use a fixed maker/service-account connection.

> **Security caveat — know the trade-offs before using in production:**
>
> - If you force all flows through one fixed account, all user session data is co-located
>   under that account. A compromised account exposes every user's data.
> - Depending on the Power Platform connection mode, credentials or connection references
>   can become part of the exported solution/runtime configuration.
>
> For a personal deployment or internal team pilot this is acceptable.
> For a production cross-company deployment, the recommended upgrade path is:
>
> 1. **SharePoint document library** as the backend instead of OneDrive — supports proper
>    app-level permissions, DLP policies, and audit logs without per-user auth prompts.
> 2. **Azure Key Vault** to store the connection credential instead of embedding it in the flow.
>
> The current architecture is an intentional simplicity trade-off for Step 2 (Power Automate
> + OneDrive). A SharePoint backend is a planned future upgrade.

---

#### Optional: force a fixed OneDrive connection

**Option A: in Copilot Studio** (works with all Power Automate designer versions)

Do this for each flow action on **both** agents:

1. Open the agent → **Actions** tab → click a flow action.
2. In the action panel, find the **Connections** or **Authentication** section.
3. Change from **End user's connection** to **Agent author's connection**
   (also labelled "Maker's connection" in some versions).
4. **Save**. Repeat for every action on both agents.

**Option B: in Power Automate (classic designer)**

Do this for each of the 8 flows:

1. Flow detail page (not the editor) → **Run only users** section → **Edit**.
2. Find the **OneDrive for Business** row → change from `Provided by run-only user`
   to the fixed workspace account's named connection.
3. **Save**.

**Option C: in Power Automate (new designer)**

The new designer removed the trigger shortcut. Access the same setting from outside the editor:

1. **My flows** → click the flow name to open the detail page.
2. Look for **Run only users** or **Manage run-only permissions** (may be under **⋯**).
3. Change the OneDrive connection to the fixed workspace account's named connection.
4. **Save**.

If the option is not visible, use Option A instead.

---

After applying the fix, **Publish** the agent. Re-test in Teams/M365 and confirm whether the
authorization prompt disappears in your tenant and whether files are still written under the
intended `FolderBot/` workspace.

---

## Instruction budget reference

Measured against the v0.1.1.0 exported package (`agents/orchestrator-instructions.md`,
`agents/sessionbot-instructions.md`, and `agents/SOUL.md` as shipped):

| Agent | Instructions | SOUL.md injected | Total | Budget |
|---|---|---|---|---|
| Orchestrator | ~1,580 chars | ~880 chars (static, at deploy time) | ~2,460 | 8,000 ✅ |
| SessionBot | ~2,400 chars | none (loaded at runtime via GetSOUL) | ~2,400 | 8,000 ✅ |

SessionBot no longer embeds SOUL.md in its static instructions — it is loaded at runtime via GetSOUL. The Orchestrator still uses the static `[SOUL.MD]` inject pattern at deploy time.

If you customize the Orchestrator's SOUL.md content significantly, re-check total length before saving.

> **Note — ReadFileLines and ReplaceInFile:** these flows add no text to agent instructions.
> They are exposed as actions and the agent discovers their inputs/outputs from the action schema
> at runtime. No instruction budget impact.

---

## What's next

With the agents built and passing the end-to-end tests, the setup is complete.

To validate the full system end-to-end, run the Core test playbooks.

Follow the test playbooks in [`tests/`](../tests/).
