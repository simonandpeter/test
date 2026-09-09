import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writtenLinks, setAside, KEPT, REFUSED } from '../scripts/life-links.mjs';

/**
 * **A saint named in a life gets a hyperlink and a `related` row** — `PLAN.md`
 * section 5, and the corpus's oldest cross-reference rule.
 *
 * It went unenforced for as long as it existed. On 2026-09-09 the corpus held
 * 532 hand-written `/saints/<slug>` links and nine of them were `related`
 * rows, because the tool that was supposed to find them stripped every
 * markdown link on its first line and looked at the bare prose underneath. A
 * rule with no test is a rule that is true until somebody writes a life.
 *
 * This is the half of the rule a machine can settle. The other half — whether
 * a life meant a person or a building named for one — is a reading, and lives
 * in `related-from-links.mjs`'s two tables.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS = path.join(ROOT, 'saints');

/** The folders, not the manifest: `/data/` is gitignored and CI runs this first. */
const related = new Map(
  readdirSync(SAINTS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => [e.name, path.join(SAINTS, e.name, 'saint.json')])
    .filter(([, f]) => existsSync(f))
    .map(([slug, f]) => [slug, new Set(JSON.parse(readFileSync(f, 'utf8')).related ?? [])]),
);

const rows = writtenLinks(SAINTS);

test('a life that links a saint names them in related', () => {
  const missing = rows
    .filter((r) => !setAside(r) && !related.get(r.dir)?.has(r.slug))
    .map((r) => `${r.dir} -> ${r.slug}   ${r.quote}`);
  assert.deepEqual(
    missing,
    [],
    `${missing.length} written link(s) with no related row — ` +
      'read them, then `node scripts/related-from-links.mjs --write`:\n  ' +
      missing.join('\n  '),
  );
});

test('every link points at a folder that exists', () => {
  // `writtenLinks` drops a link to a slug it cannot find, so a typo would
  // vanish silently rather than fail. Count the raw links and compare.
  const dirs = new Set(related.keys());
  const broken = [];
  for (const dir of dirs) {
    const life = path.join(SAINTS, dir, 'life.md');
    if (!existsSync(life)) continue;
    for (const m of readFileSync(life, 'utf8').matchAll(/\]\((\/saints\/([^)#?\s]+))\)/g)) {
      if (!dirs.has(m[2])) broken.push(`${dir} -> ${m[2]}`);
    }
  }
  assert.deepEqual(broken, [], `dead saint link(s): ${broken.join(', ')}`);
});

test('a table entry names a row that is really there', () => {
  /*
   * `REFUSED` and `KEPT` are readings, and a reading that no longer matches
   * anything is a claim nobody can check. Both are load-bearing in opposite
   * directions — a stale `REFUSED` line silently stops proposing a row it no
   * longer describes, and a stale `KEPT` line is a dedication guard someone
   * disabled for a link that has since been rewritten.
   */
  const written = new Set(rows.map((r) => `${r.dir} -> ${r.slug}`));
  const stale = [...KEPT].filter((k) => !written.has(k));
  assert.deepEqual(stale, [], `KEPT names a link no life writes: ${stale.join(', ')}`);
  assert.ok(REFUSED.size > 0, 'REFUSED emptied — the readings behind it were lost');
});

test('a KEPT row is one the dedication rule would otherwise hold', () => {
  // Without this the table grows entries that do nothing, and the next person
  // to read it cannot tell which lines are still carrying weight.
  for (const key of KEPT) {
    const row = rows.find((r) => `${r.dir} -> ${r.slug}` === key);
    assert.ok(row?.dedication, `${key} is in KEPT but the rule does not hold it`);
  }
});
