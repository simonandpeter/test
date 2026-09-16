import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * **`index.css` and `saint.css` may not share a selector.**
 *
 * They left the render-blocking bundle on 2026-09-16 (`src/ui/sheets.js`), and
 * with it they lost the one thing that fixed their order: in the bundle
 * `saint.css` was always first because `main.js` imported it first. Loaded per
 * route, the order their `<link>`s reach the document is the reader's own
 * history — All Saints and then a saint puts `index.css` first, a cold saint
 * page puts `saint.css` first — so any pair of rules with the same selector
 * and the same specificity would draw that page two different ways for two
 * readers, and neither would be reproducible.
 *
 * Specificity is not consulted and does not need to be: this asks for the
 * stronger property, that no selector text appears in both sheets at all. One
 * did when this was written — a bare `.search-field` in each — and the
 * `saint.css` one had never applied for exactly the ordering reason above.
 *
 * Selectors are compared as written, after comments go, whitespace collapses
 * and comma lists split. That reads `.a .b` and `.a  .b` as one selector and
 * `.a.b` and `.b.a` as two, which is the conservative direction: a false pass
 * needs two authors to write the same rule two different ways, where a false
 * failure would only ever be a selector that genuinely is in both files.
 */

const selectors = (file) => {
  const css = readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = new Set();
  for (const [, head] of css.matchAll(/([^{}@;]+)\{/g)) {
    const s = head.trim().replace(/\s+/g, ' ');
    // At-rule preludes never reach here (the pattern excludes `@`), but a
    // keyframe step — `from`, `to`, `40%` — is a selector shape that means
    // nothing outside its own block.
    if (!s || /^(from|to|[\d.]+%)$/.test(s)) continue;
    for (const one of s.split(',')) if (one.trim()) out.add(one.trim());
  }
  return out;
};

test('index.css and saint.css share no selector, so their load order cannot matter', () => {
  const index = selectors('index.css');
  const saint = selectors('saint.css');
  // Both sheets held rather more than this when the test was written (124 and
  // 92); the floor is here so that a parser that suddenly reads nothing fails
  // loudly instead of passing on an empty intersection.
  assert.ok(index.size > 50, `index.css parsed: ${index.size} selectors`);
  assert.ok(saint.size > 50, `saint.css parsed: ${saint.size} selectors`);
  const shared = [...index].filter((s) => saint.has(s));
  assert.deepEqual(
    shared,
    [],
    `these selectors are in both sheets, and which one wins is now the reader's route history: ${shared.join(', ')}`,
  );
});
