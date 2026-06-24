# FolderBot Tool Library

Each file in this directory is a pre-built tool available to the RunJS browser runner.

## Tool interface

Every tool must export a single `run` function:

```js
/**
 * @param {object} params      - Parameters from job.json (tool-specific)
 * @param {object} fs          - File system helper (see tools/runner.html)
 *   fs.read(path)             - Read session-relative file, returns string
 *   fs.write(path, text)      - Write session-relative file
 *   fs.readRoot(path)         - Read FolderBot-root-relative file (e.g. tools/, user_tools/)
 *   fs.writeRoot(path, text)  - Write FolderBot-root-relative file (e.g. user_tools/<name>.js)
 *   fs.readSecret(name)       - Read a file from the local secrets folder (never synced)
 * @returns {object}           - Result object written to result.json output field
 */
async function run(params, fs) { ... }
```

## Available tools

| File | Purpose |
|---|---|
| `patch.js` | Apply a unified diff to a session file |
| `regex-replace.js` | Regex find/replace across a session file |
| `fetch-api.js` | HTTP fetch to an allowlisted external URL |
| `write-root.js` | Write a file to the FolderBot root (e.g. install a new tool into `user_tools/`) |

## Adding a tool

1. Create `tools/<name>.js` following the interface above
2. Drop it in the `FolderBot/tools/` folder in OneDrive
3. The runner picks it up automatically — no runner page changes needed
