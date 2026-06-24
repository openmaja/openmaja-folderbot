/**
 * regex-replace.js — regex find/replace across a session file
 *
 * params:
 *   file        {string}   session-relative path
 *   pattern     {string}   regex pattern string (no surrounding slashes)
 *   replacement {string}   replacement string (supports $1, $2 capture groups)
 *   flags       {string}   regex flags, default "g" (global); add "i" for case-insensitive
 *
 * returns:
 *   { matches: number }    number of replacements made (0 = pattern not found)
 */
async function run(params, fs) {
  const { file, pattern, replacement, flags = 'g' } = params;
  if (!file || !pattern || replacement === undefined) {
    throw new Error('regex-replace: missing required params: file, pattern, replacement');
  }

  // Ensure global flag is always set so match count is accurate
  const safeFlags = flags.includes('g') ? flags : flags + 'g';
  const re = new RegExp(pattern, safeFlags);

  const content = (await fs.read(file)).replace(/\r\n/g, '\n');
  let count = 0;
  const updated = content.replace(re, (...args) => {
    count++;
    // Reconstruct replacement with capture groups
    return replacement.replace(/\$(\d+)/g, (_, n) => args[parseInt(n)] ?? '');
  });

  if (count > 0) await fs.write(file, updated);
  return { matches: count };
}
