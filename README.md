# OpenMaja FolderBot

> A sub-project of [OpenMaja](https://github.com/openmaja)

> **⚠️ Disclaimer:** This is a hobby project developed as a proof of concept. It is **not intended for production use**. Use it at your own risk. If you plan to deploy it in a corporate environment, always check with your IT department first to ensure it does not violate any company policy.

**OpenMaja FolderBot** is a portable, durable chat-to-workspace system built on the Microsoft 365 platform. It gives you a persistent, resumable AI workspace backed by OneDrive for Business — without any custom infrastructure.

Drop files into a session folder, ask the agent to reason over them, or write and read back files — and every session can be resumed exactly where you left off, even after Copilot Studio closes the conversation.

---

## Components

| Component | Requirements |
|---|---|
| **OpenMaja FolderBot** | M365 tenant · Copilot Studio · Power Automate |

Works entirely with standard M365 connectors — no custom infrastructure, no local processes.

---

## Key features

- **Durable sessions** — every session is backed by OneDrive files (`state.json`, `memory.md`, `plan.md`, `history.jsonl`). Close the browser, come back the next day, type `/resume` and continue exactly where you left off.
- **File operations** — create, read, update, delete text-based files in your session folder. Common examples include `.txt`, `.md`, `.json`, `.jsonl`, `.csv`, `.log`, `.xml`, and `.drawio`; the current flows enforce a size cap, not an extension allowlist.
- **File as context** — drop a text file into your session folder and ask the agent to reason over it.
- **Connector-native** — built on standard Power Automate connectors (OneDrive for Business). No proprietary APIs.
- **Portable** — deploy in any M365 tenant. All tenant-specific values are configuration; nothing is hardcoded.
- **Multi-agent architecture** — Orchestrator + SessionBot split keeps agent instructions lean and routing clean.

---

## How it works

```
User (M365 Copilot / Teams / web)
        │
        ▼
OpenMaja FolderBot Orchestrator   ← routes sessions, enforces policy (SOUL.md)
        │
        ▼
OpenMaja FolderBot SessionBot     ← file ops, memory, plan, results
        │
        ▼
Power Automate flows              ← OneDrive CRUD
        │
        ▼
OneDrive for Business             ← durable workspace (all session state lives here)
```

---

## Session workspace layout

Each session is a folder in your OneDrive:

```
FolderBot/
  SOUL.md                    ← global behavior rules (customize per tenant)
  sessions/
    20260520-MyProject/
      state.json             ← authoritative session state
      memory.md              ← compact LLM working memory
      plan.md                ← active task plan
      history.jsonl          ← full conversation log
      inputs/                ← user-supplied input files
      outputs/               ← agent-produced output files
      jobs/                  ← reserved for the future Local Runner plugin (empty in Core)
```

---

## Getting started

Start by checking the [prerequisites](setup/prerequisites.md), then choose your setup path:

- **Import** (fastest): [one-shot import](setup/one-shot-import.md) — import the packaged solution containing all eight flows plus the two Copilot Studio agents, then map connections and set environment variables.
- **Do it yourself**: [Power Automate flows](setup/power-automate-flows.md) — build all eight flows by hand, then create and wire the two agents in [Copilot Studio agents](setup/copilot-studio-agents.md).

> **Heads-up on SOUL.md:** the v0.1.0.0 package embeds the default SOUL.md into both agents' instructions at import time. Editing `FolderBot/SOUL.md` in OneDrive alone will not change agent behaviour — Step 3 in [`copilot-studio-agents.md`](setup/copilot-studio-agents.md) walks through injecting your customised SOUL into each agent inside Copilot Studio. Loading SOUL.md from OneDrive at runtime is a planned future enhancement.

---

## Repository structure

```
openmaja-folderbot/
  README.md
  agents/
    SOUL.md                              ← default template; customize per tenant
    orchestrator-instructions.md         ← paste into Copilot Studio Orchestrator agent
    sessionbot-instructions.md           ← paste into Copilot Studio SessionBot agent
  setup/
    setup_onedrive.ps1                   ← create OneDrive folder structure
    prerequisites.md                     ← Step 1: prerequisites and OneDrive workspace setup
    one-shot-import.md                   ← Step 2 (fast path): import packaged flows + agents
    power-automate-flows.md              ← Step 2 (manual): build flows from scratch
    copilot-studio-agents.md             ← Step 3: create/configure Copilot Studio agents
  specs/
    data-model.md                        ← canonical session file schemas + ownership rules
    specs.md                             ← full technical specification
    flow-specs/                          ← YAML specs for each Power Automate flow
    schemas/                             ← JSON Schema definitions for all session files
    templates/                           ← initial file templates (state.json, memory.md, plan.md)
  solution/
    [expanded Power Platform solution source — binary release attached to GitHub releases]
  tests/
    agent-tools-flows.md                 ← Power Automate flow test playbook
    sessionbot.md                        ← SessionBot behavior test playbook
    folderbot-core.md                    ← end-to-end Orchestrator + session lifecycle test playbook
```

---

## Documentation

| Document | Purpose |
|---|---|
| [`setup/prerequisites.md`](setup/prerequisites.md) | Step 1: prerequisites and OneDrive workspace setup |
| [`setup/one-shot-import.md`](setup/one-shot-import.md) | Step 2 (fast path): import the packaged flows and agents |
| [`setup/power-automate-flows.md`](setup/power-automate-flows.md) | Step 2 (manual): build the Power Automate flows from scratch |
| [`setup/copilot-studio-agents.md`](setup/copilot-studio-agents.md) | Step 3: create or configure Copilot Studio agents and wire flows |
| [`specs/data-model.md`](specs/data-model.md) | Canonical session file schemas and ownership conventions |
| [`specs/specs.md`](specs/specs.md) | Full technical spec: architecture, data formats, design choices, portability |
| [`tests/agent-tools-flows.md`](tests/agent-tools-flows.md) | Power Automate flow test playbook |
| [`tests/sessionbot.md`](tests/sessionbot.md) | SessionBot behavior test playbook |
| [`tests/folderbot-core.md`](tests/folderbot-core.md) | End-to-end Orchestrator + session lifecycle test playbook |
| [`agents/orchestrator-instructions.md`](agents/orchestrator-instructions.md) | Copilot Studio instructions for the Orchestrator agent |
| [`agents/sessionbot-instructions.md`](agents/sessionbot-instructions.md) | Copilot Studio instructions for the SessionBot agent |

---

## Status

> **Initial release** — the Core (text-only) system is feature-complete and tested end-to-end. Further enhancements are planned for future releases.

---

## Part of OpenMaja

OpenMaja FolderBot is a sub-project of [OpenMaja](https://github.com/openmaja), a corporate-friendly AI assistant framework for the Microsoft ecosystem (Copilot Studio · Azure OpenAI · Teams). FolderBot does not require OpenMaja itself and can be deployed independently in any M365 tenant.
