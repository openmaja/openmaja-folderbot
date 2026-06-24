/**
 * patch.js — apply a unified diff to a session file
 *
 * params:
 *   file  {string}  session-relative path to patch
 *   diff  {string}  unified diff string (--- / +++ / @@ hunks)
 *
 * returns:
 *   { hunks_applied: number, hunks_failed: number }
 */
async function run(params, fs) {
  const { file, diff } = params;
  if (!file || !diff) throw new Error('patch: missing required params: file, diff');

  const original = await fs.read(file);
  const lines = original.replace(/\r\n/g, '\n').split('\n');
  const result = applyPatch(lines, diff);

  await fs.write(file, result.lines.join('\n'));
  return { hunks_applied: result.hunksApplied, hunks_failed: result.hunksFailed };
}

function applyPatch(lines, diff) {
  const hunks = parseDiff(diff);
  let hunksApplied = 0;
  let hunksFailed = 0;
  // Apply hunks in reverse order so line offsets stay valid
  for (const hunk of [...hunks].reverse()) {
    const applied = applyHunk(lines, hunk);
    if (applied) hunksApplied++; else hunksFailed++;
  }
  return { lines, hunksApplied, hunksFailed };
}

function parseDiff(diff) {
  const hunks = [];
  let current = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('@@ ')) {
      const m = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (!m) continue;
      current = {
        oldStart: parseInt(m[1], 10),
        oldCount: parseInt(m[2] ?? '1', 10),
        newStart: parseInt(m[3], 10),
        newCount: parseInt(m[4] ?? '1', 10),
        lines: [],
      };
      hunks.push(current);
    } else if (current && (line.startsWith('+') || line.startsWith('-') || line.startsWith(' '))) {
      current.lines.push(line);
    }
  }
  return hunks;
}

function applyHunk(fileLines, hunk) {
  // oldStart is 1-indexed; convert to 0-indexed
  const start = hunk.oldStart - 1;
  const contextAndRemoves = hunk.lines.filter(l => l[0] === ' ' || l[0] === '-');

  // Verify the hunk matches the file at the expected position
  let pos = start;
  for (const l of contextAndRemoves) {
    if (pos >= fileLines.length) return false;
    const expected = l.slice(1);
    if (fileLines[pos] !== expected) return false;
    pos++;
  }

  // Build the replacement lines (context + additions)
  const replacement = hunk.lines
    .filter(l => l[0] === ' ' || l[0] === '+')
    .map(l => l.slice(1));

  const removeCount = contextAndRemoves.length;
  fileLines.splice(start, removeCount, ...replacement);
  return true;
}
