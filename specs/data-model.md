# OneDrive Data Model

**Goal:** define the canonical file schemas and ownership conventions for all session data.  
**Deliverables:** schema files in `specs/schemas/`, initial templates in `specs/templates/`.  
These are reference artifacts; no M365 configuration is required to read them.

---

## Session folder layout

Every session lives at `<root>/sessions/<sessionId>/` where `<root>` defaults to `FolderBot`.

```
FolderBot/
  SOUL.md                        ← global rules (see setup/prerequisites.md)
  sessions/
    20260520-MyProject/
      history.jsonl              ← append-only conversation log
      state.json                 ← authoritative machine state
      memory.md                  ← LLM working memory (compact)
      plan.md                    ← task checklist
      inputs/                    ← user-supplied input files
      outputs/                   ← agent-produced output files
      jobs/                      ← Plugin only: one sub-folder per job
        job-001/
          job.json               ← execution contract (written by agent)
          entrypoint.py          ← script to run (.py or .ps1)
          stdout.txt             ← bounded stdout (written by runner)
          stderr.txt             ← bounded stderr (written by runner)
          results.json           ← execution outcome (written by runner)
```

Session ID format: `YYYYMMDD-ShortTitle` (e.g. `20260520-BuildingAnExcelScript`).

---

## File schemas

Formal JSON Schema definitions live in `specs/schemas/`. Summary:

### `state.json`
Authoritative machine state. Initialized by the **CreateSession** flow; updated by the agent after every meaningful action.

| Field | Type | Description |
|---|---|---|
| `session_id` | string | Session folder name |
| `created_at` | datetime | ISO 8601 |
| `last_updated` | datetime | ISO 8601, updated on every write |
| `locked` | bool | Reserved for future write-safety enhancements; initialized to `false` |
| `active_files` | string[] | Session-relative paths being worked on |
| `last_job_id` | string\|null | Most recent job ID (Plugin only) |
| `last_run` | object\|null | Last job outcome summary (Plugin only) |

Schema: [`specs/schemas/state.schema.json`](./schemas/state.schema.json)  
Initial value: [`specs/templates/state.json`](./templates/state.json)

---

### `history.jsonl`
Append-only conversation log. One JSON object per line. Never rewritten; only appended.

| Field | Type | Description |
|---|---|---|
| `ts` | datetime | ISO 8601 timestamp of this turn |
| `role` | string | `user`, `assistant`, or `system` |
| `content` | string | Message text |
| `tool_calls` | array? | Optional tool call metadata |
| `artifacts` | string[]? | Optional paths of files created/modified |

Schema: [`specs/schemas/history-entry.schema.json`](./schemas/history-entry.schema.json)  
Initial value: empty file (created by **CreateSession**, first line written by **AppendHistory**).

---

### `memory.md`
Compact LLM working memory. Always ≤ 1–2 KB. Overwritten (not appended) by the agent.

Sections: **Context** · **Current Goal** · **Decisions** · **Open Questions**

Initial value: [`specs/templates/memory.md`](./templates/memory.md)

---

### `plan.md`
Active task checklist. Overwritten by the agent as steps are completed.

Sections: **Steps** (ordered checklist) · **Next Step**

Initial value: [`specs/templates/plan.md`](./templates/plan.md)

---

## Write ownership conventions

### The `locked` flag
The OneDrive for Business PA connector has no atomic rename or compare-and-swap.
The `locked` field in `state.json` is reserved for a future advisory-lock implementation.
Core initializes it to `false` and preserves it, but does not currently enforce lock acquisition
or retry behavior.

### Single-writer ownership

| File | Owner | Write operation |
|---|---|---|
| `state.json` | Agent | Full overwrite |
| `memory.md` | Agent | Full overwrite |
| `plan.md` | Agent | Full overwrite |
| `history.jsonl` | **AppendHistory** flow | Append only (read → concat → overwrite) |

**Rule:** only one component writes each file. Mixing writers causes data loss or corruption.

### `history.jsonl` append strategy
The OneDrive connector has no native append action. The **AppendHistory** flow implements append as:
1. Read current file content (or empty string if new).
2. Concatenate the new JSON line + `\n`.
3. Overwrite the file with the combined content.

This is acceptable for single-user sessions (no concurrent appends expected).
For multi-user sessions (future), a SharePoint list or Azure Table Storage is recommended.

### `job.json` status progression
```
[agent writes]    pending
                     │
[runner claims]   running
                     │
              ┌──────┴──────┐
        [runner]           [runner]
          success           failed
```
The runner must write `results.json` before updating `status` to `success`/`failed`,
so the agent never sees a terminal status without results available.

---

## Related

These schemas are consumed by the Power Automate flows that implement
**CreateSession**, **ListSessions**, **ReadTextFile**, **WriteTextFile**, **DeleteFile**,
and **AppendHistory**.

- See [`setup/power-automate-flows.md`](../setup/power-automate-flows.md) for the flow definitions.
