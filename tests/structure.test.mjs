import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DUR, EASE } from '../src/lib/motion.js';

/**
 * **`STRUCTURE.md` says it is binding. This is what makes that a fact.**
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
 * So: every table in `STRUCTURE.md` that names a value is read here and checked
 * against the code. Change either and this fails, which is the point — the
 * table and the token are one decision recorded twice.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = readFileSync(path.join(ROOT, 'STRUCTURE.md'), 'utf8');
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
  const lines = DOC.split('\n');
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes(heading));
  assert.notEqual(start, -1, `STRUCTURE.md has no table with a "${heading}" column`);
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
    assert.ok(got, `STRUCTURE.md's colour table names ${token}, which tokens.css does not declare`);
    // `--veil` is described rather than given — "gesso at 0.8" is a rule, not
    // a value, and the row says so instead of printing an rgba nobody reads.
    if (!/^#[0-9a-f]{3,8}$/i.test(value)) continue;
    assert.equal(
      got.toLowerCase(),
      value.toLowerCase(),
      `${token} is ${got} in tokens.css and ${value} in STRUCTURE.md`,
    );
  }
});

test('the type table is the scale tokens.css declares, and nothing else is', () => {
  const rows = table('| px | for |').filter((r) => r[0].startsWith('--text-'));
  for (const [token, px] of rows) {
    const got = declared(token);
    assert.ok(got, `STRUCTURE.md's type table names ${token}, which tokens.css does not declare`);
    const want = /^\d+$/.test(px) ? `${px}px` : px;
    assert.equal(got, want, `${token} is ${got} in tokens.css and ${want} in STRUCTURE.md`);
  }

  /*
   * The other direction, which is the half a table cannot enforce on its own:
   * a step added to `tokens.css` and not written down here is exactly how
   * fourteen of them accumulated.
   */
  const inCss = [...TOKENS.matchAll(/^\s*(--text-[\w-]+):/gm)].map((m) => m[1]);
  const named = new Set([...rows.map((r) => r[0]), '--text-mast', '--text-mast-wide']);
  const unlisted = inCss.filter((t) => !named.has(t));
  assert.deepEqual(unlisted, [], `tokens.css has type steps STRUCTURE.md does not list: ${unlisted}`);
});

test('the duration table is DUR and tokens.css together', () => {
  const rows = table('| ms | for |');
  for (const [token, ms] of rows) {
    assert.equal(declared(token), `${ms}ms`, `${token} disagrees with STRUCTURE.md's ${ms}ms`);
    const key = token.replace('--dur-', '');
    assert.equal(DUR[key], Number(ms), `DUR.${key} disagrees with STRUCTURE.md's ${ms}`);
  }
  const inCss = [...TOKENS.matchAll(/^\s*(--dur-[\w-]+):/gm)].map((m) => m[1]);
  const unlisted = inCss.filter((t) => !rows.some((r) => r[0] === t));
  assert.deepEqual(unlisted, [], `tokens.css has durations STRUCTURE.md does not list: ${unlisted}`);
});

test('the easing table is EASE and tokens.css together', () => {
  const rows = table('| curve | for |');
  for (const [token, curve] of rows) {
    assert.equal(declared(token), curve, `${token} disagrees with STRUCTURE.md`);
    const key = token === '--ease' ? 'base' : token.replace('--ease-', '');
    assert.equal(EASE[key], curve, `EASE.${key} disagrees with STRUCTURE.md`);
  }
  const inCss = [...TOKENS.matchAll(/^\s*(--ease[\w-]*):/gm)].map((m) => m[1]);
  const unlisted = inCss.filter((t) => !rows.some((r) => r[0] === t));
  assert.deepEqual(unlisted, [], `tokens.css has easings STRUCTURE.md does not list: ${unlisted}`);
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
    `STRUCTURE.md's shadow inventory and the stylesheets disagree.\n` +
      `  in the sheets: ${[...found].sort().join(', ')}\n` +
      `  in STRUCTURE.md:    ${[...listed].sort().join(', ')}`,
  );
});

test('the space scale STRUCTURE.md describes is the one tokens.css declares', () => {
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
  assert.match(DOC, /`--space-1` 4px through `--space-16` 64px/);
  assert.equal(declared('--radius-panel'), '4px');
  assert.equal(declared('--radius-cell'), '1px');
  assert.match(DOC, /`--radius-panel` 4px,\s*\n?`--radius-cell` 1px/);
});

/**
 * **The measures table is every named measure there is, and nothing else**
 * (author, 2026-09-12: one-off layout widths move into STRUCTURE.md).
 *
 * The rule this enforces is not "a width wants a token" — it is that a width
 * nobody can find is a width nobody can question. So the check is an
 * inventory rather than a scale: the set of `(property, value, sheet)` triples
 * declared outside `tokens.css` is compared with the set the table lists, and
 * either direction failing is the point. A measure typed into a sheet and left
 * out of the document fails; a row left behind by a deleted rule fails too.
 *
 * Comments are stripped before the sheets are read, because this file's own
 * prose quotes the values it is talking about — and a number inside a comment
 * is exactly the invisible kind this table exists to replace.
 */
const measuresIn = (css) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)]
    .filter(([, , value]) => /(?<![\w.])\d+(?:\.\d+)?px/.test(value))
    .map(([, name, value]) => [name, value.trim().replace(/\s+/g, ' ')]);

test('the measures table is every named measure outside tokens.css', () => {
  const declared = SHEETS.filter(([file]) => file !== 'tokens.css').flatMap(([file, css]) =>
    measuresIn(css).map(([name, value]) => `${name} = ${value} (${file})`),
  );
  const listed = table('| measure | value |').map(([name, value, sheet]) => `${name} = ${value} (${sheet})`);
  assert.deepEqual([...declared].sort(), [...listed].sort());
});

/**
 * **The four token tables have one writer, and it is not a person.**
 *
 * The tests above check that a table and a token agree; this one removes the
 * way they can disagree. `tokens.css` carries each token's meaning on its own
 * line and `scripts/tokens-table.mjs` prints the tables from it, so a colour
 * declared and never written down now appears in the table by itself — which
 * is the direction the colour check above could never cover.
 */
test('the generated token tables are what tokens.css says', () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/tokens-table.mjs'), '--check'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
});

/**
 * **And the breakpoints table is every breakpoint there is.**
 *
 * Eleven values for about four boundaries, which is the finding the table was
 * written to make visible — `daily-sidebar.css`'s bare `1023px` against
 * `daily.css`'s `1023.98px` is two spellings of one line, and neither sheet
 * can see the other. Sheets are compared as well as values, so moving a
 * breakpoint from one sheet to another has to be written down.
 */
test('the breakpoints table is every media query width there is', () => {
  const found = new Map();
  for (const [file, css] of SHEETS) {
    for (const [, kind, px] of css.matchAll(/\((min|max)-width:\s*([0-9.]+)px\)/g)) {
      const key = `${kind}-width: ${px}px`;
      found.set(key, new Set([...(found.get(key) ?? []), file]));
    }
  }
  const declared = [...found].map(([q, files]) => `${q} — ${[...files].sort().join(', ')}`);
  const listed = table('| breakpoint | sheets |').map(([q, sheets]) => `${q} — ${sheets.split(',').map((s) => s.trim()).sort().join(', ')}`);
  assert.deepEqual([...declared].sort(), [...listed].sort());
});
