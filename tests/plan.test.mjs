import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DUR, EASE } from '../src/lib/motion.js';

/**
 * **`PLAN.md` says it is binding. This is what makes that a fact.**
 *
 * There used to be exactly one test that read a document: it held the printed
 * paragraph of contrast figures in `DESIGN.md` to the ratios the tokens
 * actually produced. It was deleted along with that file on 2026-09-08 —
 * `git log --grep "quotes the ratios"` finds it — and within a day the
 * surviving prose had drifted in eleven separate places: 68% that was 9%, 412
 * raw px that were four, three raw colours that were none, "nothing touches
 * behaviour" while eight durations moved, "the one shadow on the site" which
 * is five and named one that has never existed.
 *
 * None of that was carelessness that more care would have caught — two of the
 * eleven were written by the session that then found them. The difference
 * between a document that stays true and one that rots is whether anything
 * executes it.
 *
 * So: every table in `PLAN.md` that names a value is read here and checked
 * against the code. Change either and this fails, which is the point — the
 * table and the token are one decision recorded twice.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = readFileSync(path.join(ROOT, 'PLAN.md'), 'utf8');
const TOKENS = readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');

const STYLES = path.join(ROOT, 'src/styles');
const SHEETS = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((f) => [f, readFileSync(path.join(STYLES, f), 'utf8')]);

/**
 * The rows of the first table whose header row contains `heading`, as arrays
 * of cells with the backticks and emphasis stripped. Markdown tables are the
 * one part of a document that parses honestly.
 */
const table = (heading) => {
  const lines = PLAN.split('\n');
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes(heading));
  assert.notEqual(start, -1, `PLAN.md has no table with a "${heading}" column`);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i += 1) {
    rows.push(
      lines[i]
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim().replace(/^\*\*|\*\*$/g, '').replace(/`/g, '').trim()),
    );
  }
  assert.ok(rows.length, `the "${heading}" table has no rows`);
  return rows;
};

/** What `tokens.css` declares for a custom property, in its `day` block. */
const declared = (name) => {
  const m = new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm').exec(TOKENS);
  return m ? m[1].trim() : null;
};

test('the colour table is the colours tokens.css declares', () => {
  for (const [token, value] of table('| day |').map((r) => [r[0], r[1]])) {
    const got = declared(token);
    assert.ok(got, `PLAN.md's colour table names ${token}, which tokens.css does not declare`);
    // `--veil` is described rather than given — "gesso at 0.8" is a rule, not
    // a value, and the row says so instead of printing an rgba nobody reads.
    if (!/^#[0-9a-f]{3,8}$/i.test(value)) continue;
    assert.equal(
      got.toLowerCase(),
      value.toLowerCase(),
      `${token} is ${got} in tokens.css and ${value} in PLAN.md`,
    );
  }
});

test('the type table is the scale tokens.css declares, and nothing else is', () => {
  const rows = table('| px | for |').filter((r) => r[0].startsWith('--text-'));
  for (const [token, px] of rows) {
    const got = declared(token);
    assert.ok(got, `PLAN.md's type table names ${token}, which tokens.css does not declare`);
    const want = /^\d+$/.test(px) ? `${px}px` : px;
    assert.equal(got, want, `${token} is ${got} in tokens.css and ${want} in PLAN.md`);
  }

  /*
   * The other direction, which is the half a table cannot enforce on its own:
   * a step added to `tokens.css` and not written down here is exactly how
   * fourteen of them accumulated.
   */
  const inCss = [...TOKENS.matchAll(/^\s*(--text-[\w-]+):/gm)].map((m) => m[1]);
  const named = new Set([...rows.map((r) => r[0]), '--text-mast', '--text-mast-wide']);
  const unlisted = inCss.filter((t) => !named.has(t));
  assert.deepEqual(unlisted, [], `tokens.css has type steps PLAN.md does not list: ${unlisted}`);
});

test('the duration table is DUR and tokens.css together', () => {
  const rows = table('| ms | for |');
  for (const [token, ms] of rows) {
    assert.equal(declared(token), `${ms}ms`, `${token} disagrees with PLAN.md's ${ms}ms`);
    const key = token.replace('--dur-', '');
    assert.equal(DUR[key], Number(ms), `DUR.${key} disagrees with PLAN.md's ${ms}`);
  }
  const inCss = [...TOKENS.matchAll(/^\s*(--dur-[\w-]+):/gm)].map((m) => m[1]);
  const unlisted = inCss.filter((t) => !rows.some((r) => r[0] === t) && t !== '--dur-shimmer');
  assert.deepEqual(unlisted, [], `tokens.css has durations PLAN.md does not list: ${unlisted}`);
});

test('the easing table is EASE and tokens.css together', () => {
  const rows = table('| curve | for |');
  for (const [token, curve] of rows) {
    assert.equal(declared(token), curve, `${token} disagrees with PLAN.md`);
    const key = token === '--ease' ? 'base' : token.replace('--ease-', '');
    assert.equal(EASE[key], curve, `EASE.${key} disagrees with PLAN.md`);
  }
  const inCss = [...TOKENS.matchAll(/^\s*(--ease[\w-]*):/gm)].map((m) => m[1]);
  const unlisted = inCss.filter((t) => !rows.some((r) => r[0] === t));
  assert.deepEqual(unlisted, [], `tokens.css has easings PLAN.md does not list: ${unlisted}`);
});

test('the shadow inventory is every cast shadow there is', () => {
  /*
   * The claim this replaces was "that is the one shadow on the site", written
   * without counting; there are five, and the one it named — the bookmark's —
   * has never existed. An inventory nobody executes is a sentence, so the
   * table is read and the sheets are counted.
   *
   * A `box-shadow` drawing rings in a token colour is a focus ring, and the
   * coachmark's is a `color-mix` glow on a keyframe; neither is a cast shadow
   * and the section says so in prose beneath the table.
   */
  const listed = new Set(table('| where | what |').map((r) => r[0]));

  const found = new Set();
  for (const [name, css] of SHEETS) {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    const lines = stripped.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (!/box-shadow\s*:/.test(lines[i])) continue;
      // A shadow in a token colour is a ring or a glow, not a cast shadow.
      if (!/rgb\(\s*0\s+0\s+0\s*\//.test(lines[i])) continue;
      /*
       * A rule written on one line carries its own selector, and requiring
       * `box-shadow:` to start a line let a planted sixth shadow straight
       * through when this check was first backed out (2026-09-09) — the same
       * escape `design-tokens.test.mjs`'s declaration reader had.
       */
      const inline = /^\s*([^{}]+?)\s*\{[^{}]*box-shadow/.exec(lines[i]);
      if (inline) {
        found.add(inline[1].trim().split(',')[0].trim());
        continue;
      }
      for (let back = i; back >= 0; back -= 1) {
        const sel = /^\s*([.#:[][^{]*|[a-z][\w-]*(?:[^{]*)?)\{\s*$/.exec(lines[back]);
        if (sel) {
          found.add(sel[1].trim().split(',')[0].trim());
          break;
        }
      }
    }
  }

  assert.deepEqual(
    [...found].sort(),
    [...listed].sort(),
    `PLAN.md's shadow inventory and the stylesheets disagree.\n` +
      `  in the sheets: ${[...found].sort().join(', ')}\n` +
      `  in PLAN.md:    ${[...listed].sort().join(', ')}`,
  );
});

test('the space scale PLAN.md describes is the one tokens.css declares', () => {
  // Prose rather than a table: "`--space-1` 4px through `--space-16` 64px,
  // doubling", plus the two radii.
  const steps = [
    ['--space-1', '4px'],
    ['--space-2', '8px'],
    ['--space-3', '12px'],
    ['--space-4', '16px'],
    ['--space-6', '24px'],
    ['--space-8', '32px'],
    ['--space-12', '48px'],
    ['--space-16', '64px'],
  ];
  for (const [token, px] of steps) {
    assert.equal(declared(token), px, `${token} is not ${px}`);
  }
  assert.match(PLAN, /`--space-1` 4px through `--space-16` 64px/);
  assert.equal(declared('--radius-panel'), '4px');
  assert.equal(declared('--radius-cell'), '1px');
  assert.match(PLAN, /`--radius-panel` 4px,\s*\n?`--radius-cell` 1px/);
});
