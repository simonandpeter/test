import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * A backtick inside an HTML comment inside a template literal ends the
 * literal, and the parse error it causes points at the *next* stray token
 * rather than at the comment — "Unexpected identifier 'tabindex'" for a
 * backtick eleven lines earlier.
 *
 * This has now cost three separate debugging detours in two days:
 * `views/saint.js` (2026-08-28), `views/map.js` and `views/about.js`
 * (2026-08-29). The habit that causes it is a good one — this codebase quotes
 * identifiers in prose everywhere — and it is only inside a template literal
 * that it bites, which is exactly the place the habit does not notice it is in.
 *
 * So: a unit test rather than a rule nobody remembers. The build already
 * catches it, but the build says where the parser gave up and this says what
 * is actually wrong.
 */

// `fileURLToPath`, not `url.pathname`: this project lives under a directory
// with a space in it, and a pathname is percent-encoded.
const root = fileURLToPath(new URL('../src/', import.meta.url));

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...jsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

test('no backtick inside an HTML comment in a template literal', () => {
  const offenders = [];
  for (const file of jsFiles(root)) {
    const source = readFileSync(file, 'utf8');
    /*
     * Every `<!-- ... -->` in the file, and whether it contains a backtick.
     * Comments outside a template literal are harmless, but there is no such
     * thing in this codebase — an HTML comment only appears in markup, and all
     * of this project's markup is built from template literals. Matching the
     * comment rather than parsing the file keeps this a check anyone can read.
     */
    for (const [comment] of source.matchAll(/<!--[\s\S]*?-->/g)) {
      if (comment.includes('`')) {
        const line = source.slice(0, source.indexOf(comment)).split('\n').length;
        offenders.push(`${path.basename(file)}:${line}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `a backtick in an HTML comment ends the template literal around it — ${offenders.join(', ')}`,
  );
});
