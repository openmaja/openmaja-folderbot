# Step 2 — Power Automate Flows (Text-Only CRUD)

> **⚠️ Disclaimer:** This is a hobby project developed as a proof of concept. It is **not intended for production use**. Use it at your own risk. If you plan to deploy it in a corporate environment, always check with your IT department first to ensure it does not violate any company policy.


**Goal:** build the nine Power Automate flows that give the Copilot Studio agent its file operations.  
**Deliverables:** the nine working flows in your Power Platform environment · optional backup export of the `FolderBot` solution.

At the end of this step the flow layer can create and resume sessions, read and write text files,
list folder contents, and maintain `history.jsonl`. If you are following the manual path, the
Copilot Studio agents are created and wired in [`copilot-studio-agents.md`](copilot-studio-agents.md).

---

## Prerequisites

- Power Platform environment (the same one that will host the Copilot Studio agent).
- **OneDrive for Business** connection already created in that environment (Power Automate → Connections).
- Step 1 complete: `FolderBot/` folder structure exists in your OneDrive (see [`prerequisites.md`](prerequisites.md)).

---

## Step 1 — Create a Power Platform solution

All flows must live inside a solution so they can be exported as a package.

1. Go to [make.powerautomate.com](https://make.powerautomate.com) → **Solutions** → **New solution**.
2. Fill in:
   - **Display name:** `FolderBot`
   - **Name:** `FolderBotCore` (no spaces)
   - **Publisher:** your org publisher (or create one)
   - **Version:** `0.1.0.0`
3. Click **Create**.

Open the `FolderBot` solution — all flows and connection references will be created inside it.

---

## Step 2 — Add environment variables

Environment variables make the solution portable — no hardcoded paths in any flow.

Inside the solution: **New → Environment variable** for each:

| Display name | Name | Type | Default value |
|---|---|---|---|
| FolderBot Root Folder | `folderbot_root` | Text | `FolderBot` |
| FolderBot Max File Size KB | `folderbot_max_file_size_kb` | Number | `500` |

The `500` KB default is intentionally below the connector payload ceiling. A file that
is technically readable by Power Automate can still overwhelm the agent once its full
content is injected into the LLM context, and large reads also add OneDrive/flow latency.
Raise this value only if your agent instructions and target model context window can
comfortably absorb larger files.

> **Important — solution prefix:** Power Platform usually prepends the
> solution publisher prefix to the environment variable name. For example, if
> you enter `folderbot_root`, the actual parameter may become
> `xyz_folderbot_root`, where `xyz` is your environment/solution prefix.
>
> Use the final environment variable **Name** exactly in expressions, not the
> display name. If Power Platform shows the final name as `xyz_folderbot_root`,
> expressions must use `parameters('xyz_folderbot_root')`.
>
> The examples below use `xyz_folderbot_root` as a placeholder. Replace `xyz`
> with your actual three-letter prefix everywhere.
>
> **If you imported the provided solution package**, the publisher prefix is `omj`,
> so the actual parameter names are `omj_folderbot_root` and `omj_folderbot_max_file_size_kb`.
> In the exported package's flow expressions, Power Automate stores the display-name
> parameter keys:
> `parameters('FolderBot Root Folder (omj_folderbot_root)')` and
> `parameters('FolderBot Max File Size KB (omj_folderbot_max_file_size_kb)')`.
> If you are editing the imported package directly, keep that exact expression form.
>
> When another tenant imports this solution, they set these values at import time
> without touching any flow internals.

---

## Step 3 — Add the OneDrive for Business connection reference

Inside the solution: **New → Connection reference**.
- **Display name:** `OneDrive for Business FolderBotCore`
- **Connector:** OneDrive for Business
- **Connection:** select your existing OneDrive for Business connection.

Every flow will reference this connection reference instead of a personal connection,
which is what makes the solution importable by others.

---

## Step 4 — Build the flows

> **Designer version warning:** creating an Instant cloud flow directly inside the solution
> (via **New → Automation → Cloud flow → Instant**) may open the **old designer** in some
> Power Automate versions, which does not support environment variables from the solution.
>
> **Recommended approach:**
> 1. Create the flow from **My flows** (outside the solution) using **New → Cloud flow → Instant**.
>    This reliably opens the new designer.
> 2. Build and **save** the flow completely.
> 3. Go back to your solution → **Add existing → Automation → Cloud flow** → select the saved flow.
>
> Adding a fully saved flow to the solution is what wires up the environment variables — if you
> add an unsaved flow, the variable bindings may not resolve and you will get
> `"The workflow parameter ... is not found"` errors at runtime.

> **Trigger for all flows:** search for "When an agent calls a flow" (Microsoft Copilot Studio trigger).  
> This is the modern trigger that makes the flow directly callable as an action from a Copilot Studio agent.
> All inputs and outputs are defined on this trigger step.
> Create trigger inputs with the exact friendly names shown in each flow's input table
> (`session_id`, `file_path`, `content`, and so on). The expressions below intentionally
> use `triggerBody()?['friendly_name']`; do not rely on the designer's generic `text`,
> `text_1`, `text_2` auto-names.

### Common pattern for all flows

Every flow follows this structure:
```
Trigger: When an agent calls a flow
  ↓
[flow-specific actions]
  ↓
Respond to the agent
  → success: true or "true" depending on the flow contract
  → flow-specific outputs
```

The final response is reached only if the required previous actions completed. For flows that need
fallback behavior, use **Scope** actions with **Run after** conditions.

---

### Flow 1 — CreateSession

**Purpose:** create a new session workspace with all initial files.

**Inputs** (defined on the trigger):
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | Text | Yes | Session folder name — format `YYYYMMDD-ShortTitle` |

**Steps:**

> **Note:** the OneDrive for Business connector has no "Create folder" action.
> Folders are created implicitly when a file is written to a path that doesn't
> exist yet. Steps 7–9 write an empty `.gitkeep` file into each subfolder
> (`inputs/`, `outputs/`, `jobs/`) to force OneDrive to materialise them at
> session creation time. Without this, those folders are missing until the first
> real file is written there.

1. **Initialize variable** `rootPath`

   Add a **Variable → Initialize variable** action:

   | Field | Value |
   |---|---|
   | Name | `rootPath` |
   | Type | `String` |
   | Value | `@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}` |

   Important details:
   - `xyz_folderbot_root` is a placeholder for the final environment variable
     **Name** after Power Platform adds your three-letter publisher prefix.
   - Do not use the display name `FolderBot Root Folder` in expressions.
   - Check the actual name shown in your solution, then replace
     `xyz_folderbot_root` everywhere with that exact name.
   - If this step fails with `The workflow parameter ... is not found`, the
     parameter name in the expression does not match the environment variable
     name in the solution.

   In Power Automate expression form, the value is:

   ```text
   @{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}
   ```

2. **Compose** `stateJson`:
   ```
   {
     "session_id": "@{triggerBody()['session_id']}",
     "created_at": "@{utcNow()}",
     "last_updated": "@{utcNow()}",
     "locked": false,
     "active_files": [],
     "last_job_id": null,
     "last_run": null
   }
   ```

3. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}`  
   File name: `state.json`  
   File content: output of the Compose above  
   *(This write also creates the session folder and its parents.)*

4. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}`  
   File name: `memory.md`  
   Content: (paste the content of `specs/templates/memory.md`)

5. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}`  
   File name: `plan.md`  
   Content: (paste the content of `specs/templates/plan.md`)

6. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}`  
   File name: `history.jsonl`  
   Content: *(empty string)*

7. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}/inputs`  
   File name: `.gitkeep`  
   Content: *(empty string)*

8. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}/outputs`  
   File name: `.gitkeep`  
   Content: *(empty string)*

9. **OneDrive for Business — Create file**  
   Folder path: `/@{variables('rootPath')}/jobs`  
   File name: `.gitkeep`  
   Content: *(empty string)*

10. **OneDrive for Business — Get file metadata using path**

   Add this after the file creation steps, using one of the files just created.
   The provided solution package points it at `history.jsonl` (the last file
   created in step 6), so use the same target if you want your manual build to
   match the export exactly.

   | Field | Value |
   |---|---|
   | File path | `/@{variables('rootPath')}/history.jsonl` |

   Rename the action to `Get_file_metadata` so the expression below matches.

   *Note:* any of the files created in steps 3–9 works here, because this step
   is only used to derive the parent folder path via `lastIndexOf('/')`. The
   exported flow happens to use `history.jsonl`; pick whichever target keeps
   your flow consistent with the package you intend to compare against.

11. **Respond to the agent**

   Add these outputs in the **Respond to the agent** action, matching the current
   Power Automate UI where each output is a separate parameter:

   | Output | Value | Description |
   |---|---|---|
   | `success` | `true` | `whether the session was created successfully` |
   | `session_id` | dynamic value `session_id` | `the session id` |
   | `created_at` | expression `utcNow()` | `creation time` |
   | `folder_path` | expression below | `the created folder path` |

   `folder_path` expression:

   ```text
   substring(outputs('Get_file_metadata')?['body/Path'], 0, lastIndexOf(outputs('Get_file_metadata')?['body/Path'], '/'))
   ```

   Equivalent JSON shape returned to the agent:

   ```json
   { "success": "true", "session_id": "<session_id>", "created_at": "<utcNow>", "folder_path": "<created folder path>" }
   ```

**Output fields to define on trigger:** `success` (Text), `session_id` (Text), `created_at` (Text), `folder_path` (Text), `error` (Text).

---

### Flow 2 — ListSessions

**Purpose:** return session folder names with their last-modified timestamps. Files placed directly under `FolderBot/sessions/` are ignored.

**Inputs:** *(none)*

**Steps:**

> **Important:** "List files in folder" expects a **folder ID**, not a path string.
> Passing a path directly (e.g. `FolderBot/sessions`) results in a 404 "Item not found" error.
> Use "Get file metadata using path" first to resolve the path to an ID, then pass that ID
> to "List files in folder".

1. **OneDrive for Business — Get file metadata using path**  
   File path: `/@{parameters('xyz_folderbot_root')}/sessions`  
   *(rename the action to `Get_sessions_folder` for clarity)*

2. **OneDrive for Business — List files in folder**  
   Folder: dynamic value `Id` from the `Get_sessions_folder` step above  
   *(this is the internal OneDrive item ID, not the path)*

3. **Filter array** (data operation):  
   From: output of the List step  
   Condition:
   ```
   @equals(item()?['IsFolder'], true)
   ```

4. **Select** (data operation):  
   From: output of the Filter array step  
   Map:
   ```json
   {
     "name": "@{item()?['Name']}",
     "last_modified": "@{item()?['LastModifiedDateTime']}",
     "is_folder": "@{item()?['IsFolder']}"
   }
   ```

5. **Respond to the agent**:
   ```json
   { "success": true, "sessions": "<output of Select as JSON string>" }
   ```

**Output fields:** `success` (Boolean), `sessions` (Text — JSON array string of `{name,last_modified,is_folder}` objects).

---

### Flow 3 — GetSessionSummary

**Purpose:** read `state.json`, `memory.md`, and `plan.md` in one call for `/resume` rehydration.

**Inputs:**
| Name | Type | Required |
|---|---|---|
| `session_id` | Text | Yes |

**Steps:**

1. **OneDrive for Business — Get file content using path**  
   File path: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}/state.json`  
   → store result as `stateContent`

2. **OneDrive for Business — Get file content using path**  
   File path: `.../memory.md` → `memoryContent`

3. **OneDrive for Business — Get file content using path**  
   File path: `.../plan.md` → `planContent`

4. **Respond to the agent**:

   | Output | Value | Description |
   |---|---|---|
   | `success` | `true` | whether the summary was retrieved successfully |
   | `session_id` | dynamic value `session_id` | the session id (echoed back for consistency) |
   | `state` | body of `stateContent` | raw content of state.json |
   | `memory` | body of `memoryContent` | raw content of memory.md |
   | `plan` | body of `planContent` | raw content of plan.md |

**Output fields:** `success` (Text), `session_id` (Text), `state` (Text), `memory` (Text), `plan` (Text), `error` (Text).

> **Recommended enhancement:** add a second **Respond to the agent** action configured to run
> **if any of the three Get file content steps have failed**. Return `{ "success": "false", "error": "Session not found or files missing" }`.
> This prevents the agent from receiving an empty response when a session folder is incomplete.

---

### Flow 4 — ListSessionFiles

**Purpose:** list files in a session folder (or a subfolder within it).

**Inputs:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | Text | Yes | |
| `subfolder` | Text | No | Relative subfolder path within the session, e.g. `outputs`. The exported package also documents `.` as an explicit root-folder argument. |

**Steps:**

> **Same pattern as ListSessions:** "List files in folder" requires a folder **ID**, not a path.
> Use "Get file metadata using path" first to resolve the path to an ID.

1. **Compose** `folderPath`:
   - If `subfolder` is empty: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}`
   - If `subfolder` is provided: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}/@{triggerBody()['subfolder']}`

   In practice, use a **Condition** action to set this value, or build it with an expression:
   ```text
   @{if(empty(triggerBody()?['subfolder']),
     concat('/', parameters('xyz_folderbot_root'), '/sessions/', triggerBody()['session_id']),
     concat('/', parameters('xyz_folderbot_root'), '/sessions/', triggerBody()['session_id'], '/', triggerBody()['subfolder'])
   )}
   ```

2. **OneDrive for Business — Get file metadata using path**  
   File path: output of the Compose above  
   *(rename the action to `Get_folder_metadata`)*

3. **OneDrive for Business — List files in folder**  
   Folder: dynamic value `Id` from the `Get_folder_metadata` step

4. **Select** (data operation):  
   From: output of the List step  
   Map:
   ```json
   {
     "name":          "@{item()?['Name']}",
     "path":          "@{item()?['Path']}",
     "size":          "@{item()?['Size']}",
     "last_modified": "@{item()?['LastModifiedDateTime']}",
     "is_folder":     "@{item()?['IsFolder']}"
   }
   ```

5. **Respond to the agent** with `{ "success": true, "files": "<output of Select as JSON string>" }`.

**Output fields to define on trigger:** `success` (Boolean), `files` (Text).

---

### Flow 5 — ReadTextFile

**Purpose:** read a text-based file from the session folder. Enforces a size cap, not an extension allowlist.

The size cap protects the downstream LLM context, not just the OneDrive connector. The
connector payload limit is higher than the default, but passing very large file contents
to the agent can crowd out instructions, memory, and the current user request.

**Inputs:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | Text | Yes | |
| `file_path` | Text | Yes | Session-relative path, e.g. `memory.md` or `outputs/report.txt` |

**Steps:**

1. **OneDrive for Business — Get file metadata using path**  
   File path: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}/@{triggerBody()['file_path']}`  
   *(rename the action to `Get_file_metadata`)*

2. **Condition** — size check:

   > **Power Automate does not support `*` for multiplication.** Use `mul()` instead.
   > Also, the `Size` field and the environment variable are typed differently (integer vs string),
   > so both must be wrapped in `int()` — otherwise the comparison produces `null` and the condition
   > is silently skipped without going to Yes or No.

   Use this expression in the **Advanced** / formula field of the Condition:

   ```text
   @greater(
     int(outputs('Get_file_metadata')?['body/Size']),
     mul(int(parameters('xyz_folderbot_max_file_size_kb')), 1024)
   )
   ```

   - **Yes** → **Respond to the agent**: `{ "success": false, "error": "File exceeds size limit" }` → terminate
   - **No** → continue to step 3

3. **OneDrive for Business — Get file content using path**  
   File path: same as step 1

4. **Respond to the agent**: `{ "success": true, "content": "<body of file content>" }`

**Output fields:** `success` (Boolean), `content` (Text), `error` (Text).

> **Recommended enhancement:** add a third **Respond to the agent** action configured to run
> **if the Get file metadata step (step 1) has failed**. Return `{ "success": false, "error": "File not found" }`.
> Without this, a missing file causes the flow to return an empty response rather than a clean error.

---

### Flow 6 — WriteTextFile

**Purpose:** create or overwrite a text file in the session folder.

**Inputs:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | Text | Yes | |
| `file_path` | Text | Yes | Session-relative path |
| `content` | Text | Yes | File content to write |

**Steps:**

1. **Compose** `fullPath`:
   ```text
   /@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()['session_id']}/@{triggerBody()['file_path']}
   ```

2. **Compose** `filename`:
   ```text
   @{last(split(triggerBody()['file_path'], '/'))}
   ```

3. **Compose** `folderPath`:
   ```text
   @{if(
     contains(triggerBody()['file_path'], '/'),
     concat(
       '/',
       parameters('xyz_folderbot_root'),
       '/sessions/',
       triggerBody()['session_id'],
       '/',
       replace(triggerBody()['file_path'], concat('/', outputs('filename')), '')
     ),
     concat('/', parameters('xyz_folderbot_root'), '/sessions/', triggerBody()['session_id'])
   )}
   ```

   > **Alternative (cleaner):** instead of the inline `if()` expression above, use an
   > **Initialize variable** action for `folderPath`, then a **Condition** action:
   > - If `file_path` contains `/` → **Set variable** `folderPath` to
   >   `@{replace(triggerBody()['file_path'], concat('/', outputs('filename')), '')}` (prepend root prefix as above)
   > - Else → **Set variable** `folderPath` to root sessions path.
   >
   > This is how the provided solution package implements it and is easier to read and debug in the designer.

4. **Scope** `file exists`

   This is the normal overwrite path.

   Inside the scope:
   - **OneDrive for Business — Get file metadata using path**  
     File path: output of `fullPath`
   - **OneDrive for Business — Update file**  
     File: dynamic value `Id` from metadata  
     File content: `content`

5. **Scope** `file does not exist`

   Configure **Run after** so this scope runs only if `file exists` has **failed**.

   Inside the scope:
   - **OneDrive for Business — Create file**  
     Folder path: output of `folderPath`  
     File name: output of `filename`  
     File content: `content`

6. **Respond to the agent** `{ "success": "true", "file_path": "<file_path>" }`.

   Place this after `file does not exist` and configure **Run after** so it runs when
   `file does not exist` is either **successful** or **skipped**.

   This covers both valid paths:
   - existing file: `file exists` succeeds → `file does not exist` is skipped → respond runs
   - missing file: `file exists` fails → `file does not exist` succeeds → respond runs

   > **Critical:** the response body must be set **explicitly in this step**, using the
   > original input values (`file_path` input for the path). Do **not** try to reference
   > outputs from either scope — one of the two scopes will always be skipped, and Power
   > Automate will return an empty or missing response if the body is pulled from a
   > skipped branch. Both paths must converge here with the same hardcoded-structure body.

**Output fields to define on trigger:** `success` (Text), `file_path` (Text), `error` (Text).

---

### Flow 7 — DeleteFile

**Purpose:** delete a file from the session folder.

**Inputs:**
| Name | Type | Required |
|---|---|---|
| `session_id` | Text | Yes |
| `file_path` | Text | Yes |

**Steps:**

1. **OneDrive for Business — Get file metadata using path** → get file ID.

2. **OneDrive for Business — Delete file** using the file ID.

3. **Respond to the agent** `{ "success": "true" }`.

**Output fields to define on trigger:** `success` (Text), `error` (Text).

---

### Flow 8 — AppendHistory

**Purpose:** append one or two entries (user + assistant) to `history.jsonl`.

**Inputs:**
| Name | Type | Required | Description |
|---|---|---|---|
| `session_id` | Text | Yes | |
| `user_content` | Text | Yes | User message text |
| `assistant_content` | Text | No | Assistant response text |

**Steps:**

1. **OneDrive for Business — Get file content using path**  
   Path: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()?['session_id']}/history.jsonl`  
   → `existingContent`

2. **Compose** `userLine`:
   ```
   @{concat('{"ts":"', utcNow(), '","role":"user","content":', json(triggerBody()?['user_content']), '}')}
   ```

   > **Why `json(...)` and not just `"@{user_content}"`?** The OneDrive connector
   > writes raw text. If the user message contains a `"`, `\`, or a newline, naive
   > string interpolation produces malformed JSON and the resulting `history.jsonl`
   > line can no longer be parsed. The `json()` workflow function serialises the
   > string with the correct JSON escaping (quotes, backslashes, control characters),
   > and `concat()` keeps it out of an outer template literal so nothing re-escapes.
   > The trigger input must be named `user_content` so this expression stays aligned
   > with the flow contract.

3. **Condition:** `assistant_content` is not empty?  
   - Yes → **Compose** `assistantLine` using the same escaped pattern:
     ```
     @{concat('{"ts":"', utcNow(), '","role":"assistant","content":', json(triggerBody()?['assistant_content']), '}')}
     ```
   - No  → `assistantLine` = empty string

4. **Compose** `newContent`:
   ```
   @{concat(
     existingContent,
     if(empty(existingContent), '', decodeUriComponent('%0A')),
     userLine,
     if(empty(assistantLine), '', decodeUriComponent('%0A')),
     assistantLine
   )}
   ```

5. **OneDrive for Business — Get file metadata using path**  
   Path: `/@{parameters('xyz_folderbot_root')}/sessions/@{triggerBody()?['session_id']}/history.jsonl`

6. **OneDrive for Business — Update file** with `newContent`.

   `history.jsonl` is created by `CreateSession`, so this flow should fail if it is missing.

7. **Respond to the agent** `{ "success": "true" }`.

**Output fields to define on trigger:** `success` (Text), `error` (Text).

---

### Flow 9 — GetSOUL

**Purpose:** read `SOUL.md` from the FolderBot root folder and return its content as the active
behavioral contract for SessionBot. If `SOUL.md` does not exist, create it with the default
content and return that. This makes the system self-healing on first deploy — no manual setup
step is required for `SOUL.md`.

**Inputs:** *(none)*

**Steps:**

1. **Initialize variable** `soulContent`

   | Field | Value |
   |---|---|
   | Name | `soulContent` |
   | Type | `String` |
   | Value | *(empty)* |

2. **Compose** `soulPath`:
   ```text
   /@{parameters('xyz_folderbot_root')}/SOUL.md
   ```

3. **Compose** `defaultSoul` — paste the content of `agents/SOUL.md` verbatim as the value.
   This is the fallback written to OneDrive if `SOUL.md` is missing:
   ```text
   # OpenMaja FolderBot — Global Rules
   ...
   ```
   *(copy the full text from `agents/SOUL.md` in the repo)*

4. **Scope** `try_read`

   Inside the scope:
   - **OneDrive for Business — Get file metadata using path**  
     File path: output of `soulPath`  
     *(rename the action to `Get_soul_metadata`)*
   - **OneDrive for Business — Get file content using path**  
     File path: output of `soulPath`  
     *(rename the action to `Get_soul_content`)*
   - **Set variable** `soulContent`  
     Value: body of `Get_soul_content`

5. **Scope** `create_default`

   Configure **Run after** so this scope runs only if `try_read` has **failed**.

   Inside the scope:
   - **OneDrive for Business — Create file**  
     Folder path: `/@{parameters('xyz_folderbot_root')}`  
     File name: `SOUL.md`  
     File content: output of `defaultSoul`
   - **Set variable** `soulContent`  
     Value: output of `defaultSoul`

6. **Respond to the agent**

   Place this after `create_default` and configure **Run after** so it runs when
   `create_default` is either **successful** or **skipped**.

   This covers both valid paths:
   - `SOUL.md` found: `try_read` succeeds → `create_default` is skipped → respond runs
   - `SOUL.md` missing: `try_read` fails → `create_default` succeeds → respond runs

   Response body:

   | Output | Value |
   |---|---|
   | `soul_content` | variable `soulContent` |

   > **Why a shared variable instead of two Respond steps?** Both scopes write to `soulContent`
   > before this step, so the single Respond action can safely reference the variable regardless
   > of which path ran. This avoids duplicating the Respond action and keeps the flow's response
   > contract in one place.

**Output fields to define on trigger:** `soul_content` (Text).

---

## Step 5 — Test each flow standalone

Before connecting to Copilot Studio, test each flow using the **Test** button in Power Automate:
1. Open the flow → **Test** → Manually → **Run flow**.
2. Enter test inputs.
3. Verify the flow succeeded and the expected files/folders appeared in your OneDrive.

Minimum test matrix:
- CreateSession with `session_id = "20260101-Test"`
- ReadTextFile → `memory.md`
- WriteTextFile → write `outputs/hello.txt`
- AppendHistory → one user message
- ReadTextFile → `history.jsonl` (verify the line was appended)
- ListSessions → confirm the test session appears
- DeleteFile → `outputs/hello.txt`
- GetSOUL → run with `SOUL.md` present; verify `soul_content` is returned
- GetSOUL → rename/delete `SOUL.md` in OneDrive, run again; verify the file is recreated with default content and returned

---

## Step 6 — Export the solution as a backup

Once all flows pass testing:

1. Solutions → `FolderBot` → **Export**.
2. Select **Unmanaged** if you want an editable backup, or **Managed** if you are preparing a tenant-to-tenant distribution package.
3. Save the ZIP somewhere durable as a backup of the working solution.

> Treat the exported ZIP as a recovery/import backup. When another tenant imports it, they will
> be prompted to map connection references and set environment variables.

---

## What's next

With the flows built and tested, proceed to **Step 3 — Copilot Studio agents**: create the agents and wire up these flows as actions.

Follow [`setup/copilot-studio-agents.md`](copilot-studio-agents.md).
