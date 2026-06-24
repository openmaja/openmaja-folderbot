# User Tools

This folder contains custom JavaScript tools created by you or by FolderBot agents.
Tools placed here extend the built-in tool library and are available to the runner
under the same interface.

## How it works

- Built-in tools live in `FolderBot/tools/` (managed by the FolderBot repository)
- Custom tools live here in `FolderBot/user_tools/` (managed by you)
- When the runner looks up a tool by name, it checks `user_tools/` first, then `tools/`
- This means you can override a built-in tool by placing a file with the same name here

## Tool interface

Each file must export a `run` function:

```js
async function run(params, fs) {
  // params: object with tool-specific inputs (from job.json)
  // fs.read(path)          read a session-relative file
  // fs.write(path, text)   write a session-relative file
  // fs.readRoot(path)      read a FolderBot-root-relative file
  // fs.readSecret(name)    read a secret from the local secrets folder
  // return an object — written to result.json output field
}
```

## Registered custom tools

<!-- Keep this list up to date. The agent reads this file to discover available tools. -->

| Tool name | File | Description |
|---|---|---|
| *(none yet)* | | |

## Notes

- Tool files are plain `.js` — no build step required
- Tool names are the filename without the `.js` extension
- Secrets (API keys, tokens) must NOT be stored in this folder — use the local secrets folder instead (see runner setup docs)
- FolderBot agents may create tools here on your behalf; always review generated tool code before use
