# One-Shot Import — Power Automate Solution + Agents

> **⚠️ Disclaimer:** This is a hobby project developed as a proof of concept. It is **not intended for production use**. Use it at your own risk. If you plan to deploy it in a corporate environment, always check with your IT department first to ensure it does not violate any company policy.


**Goal:** install the prebuilt FolderBot Power Platform solution from the exported package, including all eight Power Automate flows and the two Copilot Studio agents.
**Deliverables:** imported `FolderBotCore` solution version `0.1.0.0` with all eight flows and both agents configured for your tenant.

Use this path if you want the fastest setup. If you prefer to build every flow manually, follow [`power-automate-flows.md`](power-automate-flows.md) instead.

---

## Prerequisites

- Step 1 complete: `FolderBot/` folder structure exists in your OneDrive (see [`prerequisites.md`](prerequisites.md)).
- Power Platform environment selected.
- OneDrive for Business connection available in that environment.
- Solution package downloaded from [GitHub Releases](https://github.com/openmaja/openmaja-folderbot/releases).

The exported package uses publisher prefix `omj`, contains the two environment variable definitions
`omj_folderbot_root` and `omj_folderbot_max_file_size_kb`, and imports as the unmanaged
Power Platform solution `FolderBotCore`.

---

## Step 1 — Import the solution

1. Go to [make.powerautomate.com](https://make.powerautomate.com).
2. Select the environment that will host FolderBot.
3. Go to **Solutions**.
4. Click **Import solution**.
5. Upload the `.zip` downloaded from [GitHub Releases](https://github.com/openmaja/openmaja-folderbot/releases).
6. Continue through the import wizard.

---

## Step 2 — Configure connections

When prompted for connection references:

1. Map the OneDrive for Business connection reference to your OneDrive for Business connection.
2. Create a new OneDrive for Business connection if none exists.
3. Confirm that the connection belongs to the account whose OneDrive contains the `FolderBot/` root folder.

---

## Step 3 — Configure environment variables

Set these values during import if prompted, or after import from the solution's environment variable entries.

| Display name | Schema name | Value |
|---|---|---|
| FolderBot Root Folder | `omj_folderbot_root` | `FolderBot` unless you chose a different root folder in Step 1 |
| FolderBot Max File Size KB | `omj_folderbot_max_file_size_kb` | `500` unless you need a different text-file read limit |

The root folder value must match the folder name created in Step 1 exactly.
The `500` KB file-size default is conservative by design: it keeps ReadTextFile outputs
small enough for the agent's LLM context and avoids slow large-file reads, even though
the connector payload ceiling is higher.

In the exported flow definitions, Power Automate references these variables by their
display-name parameter keys, for example:

- `parameters('FolderBot Root Folder (omj_folderbot_root)')`
- `parameters('FolderBot Max File Size KB (omj_folderbot_max_file_size_kb)')`

---

## Step 4 — Verify the imported solution

Open the imported `FolderBot` solution and confirm these cloud flows exist:

- CreateSession
- ListSessions
- GetSessionSummary
- ListSessionFiles
- ReadTextFile
- WriteTextFile
- DeleteFile
- AppendHistory

Turn on any flows that imported disabled.

Then confirm these Copilot agents exist in the same solution (older tenants may
still label this area "Chatbots"):

- OpenMaja FolderBot
- OpenMaja FolderBot SessionBot

Also verify the OneDrive for Business connection reference is mapped and that the
flows/agents run without unexpected user authorization prompts in your tenant. The
current package uses imported OneDrive connection references with invoker/runtime
binding, so connection prompts can vary by environment policy.

### Heads-up on embedded SOUL.md

The v0.1.0.0 package ships with the default `agents/SOUL.md` content already
concatenated into both agents' instructions. The agents do **not** read
`FolderBot/SOUL.md` from OneDrive at runtime — editing that OneDrive file alone
will have no effect on agent behaviour until [`copilot-studio-agents.md`](copilot-studio-agents.md)
Step 1 / Step 2 is also followed to inject your customised SOUL into each agent's
instructions inside Copilot Studio.

Loading SOUL.md from OneDrive at runtime is a planned future enhancement.

### Heads-up on the embedded model selection

The exported agents pin specific Copilot Studio model hints (`Sonnet46` for the
Orchestrator and `opus4-1` for the SessionBot). After import, open each agent in
Copilot Studio under **Settings → Generative AI** and confirm the selected model
is one your tenant is licensed for. If not, switch each agent to a model your
tenant supports before running the smoke test below — otherwise the agent may
fall back silently or fail at conversation start.

---

## Step 5 — Smoke test

Run a minimal test before wiring the flows to Copilot Studio:

1. Run `CreateSession` with `session_id = 20260101-Test`.
2. Confirm `FolderBot/sessions/20260101-Test/` appears in OneDrive.
3. Run `WriteTextFile` for `outputs/hello.txt` with content `Hello, FolderBot!`.
4. Run `ReadTextFile` for `outputs/hello.txt` and confirm the content is returned.
5. Run `AppendHistory` with one user message.
6. Read `history.jsonl` and confirm the JSONL entry was appended.

---

## What's next

With the flows and agents imported and the flows tested, proceed to the Copilot Studio agent setup.

Follow [`setup/copilot-studio-agents.md`](copilot-studio-agents.md).
