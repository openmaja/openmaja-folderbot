/**
 * write-root.js — write a file to the FolderBot root (outside the session folder)
 *
 * Intended for bootstrapping: installing new tools into user_tools/ or updating
 * root-level config files. Use only with explicit user confirmation.
 *
 * params:
 *   path     {string}  Root-relative path to write (e.g. "user_tools/my-tool.js")
 *   content  {string}  File content to write
 *
 * returns:
 *   { ok: true, path: string, bytes: number }
 */

async function run(params, fs) {
  const { path, content } = params || {};
  if (!path || typeof path !== 'string') {
    throw new Error('path is required (string)');
  }
  if (typeof content !== 'string') {
    throw new Error('content is required (string)');
  }
  await fs.writeRoot(path, content);
  return { ok: true, path, bytes: content.length };
}
