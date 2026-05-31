# OpenMaja FolderBot — Specifications (v3)

**OpenMaja FolderBot** is a stateful "chat → workspace → artifacts" system built on **Copilot Studio** as the orchestrator, **OneDrive for Business** as the durable workspace and state store, and **Power Automate** as the file operations layer.

**OpenMaja FolderBot** is fully portable — any organization can deploy it in their own M365 tenant by following the deployment guide. OpenMaja FolderBot is a sub-project of [OpenMaja](https://github.com/openmaja). It does not require OpenMaja itself.

---

## 1. Goals

### 1.1 Core goals
- Provide a **durable, resumable chat workspace** where every session is persisted in OneDrive.
- Allow the agent to **create, read, modify, and delete** text-based files within a session folder using standard PA connectors. Examples include scripts, markdown, `.json`, `.jsonl`, `.csv`, `.log`, `.xml`, and `.drawio`; Core enforces a size cap, not an extension allowlist.
- Enable **session continuity** via an explicit `/resume` command that reconstructs state from OneDrive files.
- Support **file-as-context** workflows: the user drops a text file into the session folder and asks the agent to reason over it.

### 1.2 Non-goals (v1)
- Not a general remote shell / command execution platform.
- Not a real-time IDE; latency due to OneDrive sync + orchestration is expected.

---

## 2. Key design choices

### 2.1 Workspace-state resumption (not transcript replay)
- Session continuity is achieved by persisting **structured state** and **compact working memory**, not full chat transcripts.
- Rationale: Copilot Studio sessions can end due to inactivity (30 min), max duration (60 min), or max turns (100).

### 2.2 Durable filesystem-backed state in OneDrive
- OneDrive for Business is the single durable store for all session data: scripts, docs, state, memory, plan, jobs, artifacts.
- Rationale: OneDrive connector supports file CRUD and is a standard connector in Power Platform.

### 2.3 Multi-agent split for maintainability
- **OpenMaja FolderBot Orchestrator** (parent): session creation/switching, command routing, policy enforcement.
- **OpenMaja FolderBot SessionBot** (child): file operations, job management, logging, result interpretation.
- Rationale: avoids orchestration degradation as tool/topic count grows.

### 2.4 No atomic rename via connector
- The OneDrive for Business PA connector does not expose a native rename/move action.
- Core keeps writes simple and assumes low-concurrency, single-user sessions. Stronger locking is a future enhancement.

### 2.5 Portability first
- No hardcoded tenant IDs, UPNs, site URLs, or paths in flows or agent instructions.
- The OneDrive root folder name (`FolderBot` by default) is a configurable parameter.
- `SOUL.md` is the per-tenant behavior contract — deployers customize it before going live.

### 2.6 Tooling approach
- **Primary**: Power Automate flows using the OneDrive for Business connector.
- **Future**: Agent 365 MCP servers for SharePoint/OneDrive when available.

---

## 3. High-level architecture

### 3.1 Core

```
User (M365 Copilot web/app)
        |
        v
OpenMaja FolderBot Orchestrator (Copilot Studio)
        |
        v
OpenMaja FolderBot SessionBot (Copilot Studio)
        |
        +--> Power Automate (OneDrive CRUD)
        |
        v
OneDrive for Business (durable workspace)
```

---

## 4. OneDrive folder structure

### 4.1 Root
- `<root>/` (default: `FolderBot/`, configurable)
  - `SOUL.md` — global rules/guardrails (customize per tenant)
  - `sessions/` — all session workspaces

### 4.2 Session folder naming
- Format: `YYYYMMDD-ShortTitle`
- Example: `20260520-BuildingAnExcelScript`

### 4.3 Session canonical layout

```
<root>/
  SOUL.md
  sessions/
    <sessionId>/
      history.jsonl
      state.json
      memory.md
      plan.md
      inputs/
      outputs/
      jobs/         ← reserved for the future Local Runner plugin (empty in Core)
```

> The `jobs/` subfolder is created at session creation time so the layout is
> stable across Core and the future Local Runner plugin. In Core it stays empty
> apart from a `.gitkeep` marker.

---

## 5. Command model (chat UX)

### 5.1 Core commands (text-only)
- `/new [title]` — create a new session workspace
- `/resume <sessionFolderName>` (alias: `/session`) — load workspace state and continue
- `/files [subfolder]` — list session files + highlight active files
- `/open <path>` — read/preview file content
- `/write <path>` — create or overwrite a file
- `/delete <path>` — delete a file (the agent must ask for confirmation before calling DeleteFile)
- `/plan` — show/update plan.md
- `/help` — display the full list of commands with a brief description of each

### 5.2 `/resume` behavior (workspace rehydration)
On `/resume`:
1. Load `state.json` (authoritative state)
2. Load `memory.md` (compact working memory)
3. Load `plan.md` (active plan)

`history.jsonl` remains available for audit/debugging through `/open history.jsonl`, but the current `GetSessionSummary` flow does not load recent transcript turns during `/resume`.

---

## 6. Data formats

### 6.1 `history.jsonl` (append-only)
- One JSON object per line.
- Fields: `ts` (ISO8601), `role` (user|assistant|system), `content`, optional: `tool_calls`, `artifacts`

### 6.2 `state.json` (authoritative machine state)
Minimum fields:
- `session_id`, `created_at`, `last_updated`
- `locked` (bool, reserved for future write-safety enhancements; initialized to `false`)
- `active_files`: list of paths

### 6.3 `memory.md` (LLM working memory)
- Always compact (target ≤ 1–2 KB)
- Sections: Context, Current Goal, Decisions, Open Questions

### 6.4 `plan.md` (task plan)
- Ordered checklist + "Next step"

---

## 7. Power Automate / tooling specs

### 7.1 Required file operations (Core, text only)
- Create session folder and initial files
- List session folders / files in a session
- Read file content (text, size-capped)
- Write/overwrite file content (text)
- Delete file
- Append to `history.jsonl`

### 7.2 Future connector extensions
- Richer file operations such as copy, move, sharing links, permissions, and download URLs are outside Core.
- Future versions may add these through native Power Platform connectors, MCP servers, or other tenant-approved integration layers.

### 7.3 Known platform limits
- **Copilot Studio instruction limit**: ~8,000 characters. SOUL.md injected content must fit ≤ 1,500 chars.
- **Copilot Studio session mechanics**: closes after 30 min inactivity, 60 min total, or 100 turns.
- **Connector payload limit**: ~5 MB per connector action payload.
- **ReadTextFile default cap**: 500 KB. This is deliberately below the connector ceiling because file content is passed into the agent's LLM context; larger reads can crowd out instructions, memory, and the user's active request, and also increase OneDrive/flow latency.
- **OneDrive connector**: some triggers skip files >50 MB; large copies may time out.

---

## 8. Security & compliance guardrails

- **No arbitrary command execution** — no shell, no remote exec.
- **Allowlist paths**: only operate within `<root>/sessions/<sessionId>/...`.
- **Single-writer strategy**: agent owns `memory.md`/`plan.md`; flow owns `history.jsonl` append.
- `state.json.locked` is reserved for a future advisory-lock implementation; Core does not currently enforce locks.
- Secrets hygiene: never store credentials in session files.

---

## 9. Limitations (v1)

- Latency: OneDrive sync + flow execution adds seconds of delay.
- Copilot Studio session boundaries still require `/resume`.
- Avoid large file contents in connector payloads. The connector limit is about 5 MB, but the default read cap is 500 KB to prevent LLM context blow-up and slow flow runs.
- Any text-based file format can be read or written if it fits within the configured size cap. Extensions such as `.txt`, `.md`, `.json`, `.jsonl`, `.csv`, `.log`, `.xml`, and `.drawio` are examples, not an allowlist. Rich binary file types (Office docs, PDF, images) are future ideas.

---

## 10. Portability & deployment

FolderBot is designed to deploy in any M365 tenant. All tenant-specific values must be provided at deployment time; none are hardcoded in agent instructions or flows.

### 10.1 Repo layout for public release

```
openmaja-folderbot/
  README.md
  agents/
    SOUL.md                              ← default template; customize per tenant
    orchestrator-instructions.md         ← Copilot Studio Orchestrator instructions
    sessionbot-instructions.md           ← Copilot Studio SessionBot instructions
  setup/
    setup_onedrive.ps1
    prerequisites.md                     ← Step 1: prerequisites and OneDrive workspace setup
    one-shot-import.md                   ← Step 2 (fast path): import the packaged solution
    power-automate-flows.md              ← Step 2 (manual): build flows from scratch
    copilot-studio-agents.md             ← Step 3: Copilot Studio agent setup
  specs/
    specs.md                             ← full technical specification (this file)
    data-model.md                        ← canonical session file schemas + ownership rules
    flow-specs/                          ← YAML specs for each Power Automate flow
    schemas/                             ← JSON Schema definitions
    templates/                           ← initial file templates
  solution/
    [expanded Power Platform solution source — binary release attached to GitHub releases]
  tests/
    agent-tools-flows.md                 ← test playbook: Power Automate flows
    sessionbot.md                        ← test playbook: SessionBot agent behavior
    folderbot-core.md                    ← test playbook: end-to-end Orchestrator + session lifecycle
```


### 10.2 Tenant deployment checklist
- [ ] M365 license with OneDrive for Business
- [ ] Copilot Studio license (per-tenant or per-user)
- [ ] Power Automate (included in most M365 plans)
- [ ] Run `setup_onedrive.ps1` to create folder structure
- [ ] Customize `SOUL.md` for your tenant policies
- [ ] Import PA solution (flows)
- [ ] Create Copilot Studio agents and connect flows

### 10.3 Documentation & packaging strategy

The deployable system ships as two complementary deliverables:

1. **Deployment guide** (`setup/` for infrastructure, `specs/` for tests and feature specs) — a step-by-step guide explaining how to build the component manually. This is the ground truth. If the importable package breaks due to a Power Platform update, the guide keeps users unblocked.

2. **Importable Power Platform solution** (download from [GitHub Releases](https://github.com/openmaja/openmaja-folderbot/releases)) — an official Power Platform solution export containing flow definitions, Copilot Studio agent definitions, connection references, and environment variables. Users import this via the Power Platform admin center or `pac solution import`.

**On import, the user must:**
- Map **connection references** (placeholders) to their own OneDrive for Business connection.
- Set **environment variables** (`omj_folderbot_root`, `omj_folderbot_max_file_size_kb`) — these replace all hardcoded paths and parameters.

---

## 11. Future ideas

Future ideas include workflow/UX commands, observability, MCP integration, enterprise hygiene, multi-user mode, and document-format support.

---
