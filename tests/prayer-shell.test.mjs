import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * **Prayer wears All Saints' advanced search, and these are the seams that
 * stop it becoming a second copy of it** (author, 2026-10-02: "explain to me
 * again why dont we have advanced search in the Prayer view… And display the
 * same as All Saints page. The 'Recorded with' and 'Kept the same day' rows
 * should have the same design as the all saints entries advanced search mode
 * row cards. Dont know why they are so different. SSOT").
 *
 * There was never a decision behind the difference. All Saints' shell could not
 * be mounted anywhere else because `views/index/controls.js` imported the All
 * Saints `state` singleton, and the two aside columns drew their own row rather
 * than that page's because nobody had asked them to share one.
 *
 * Five claims, each of which fails if its half is backed out. They are made
 * against the source text because none of this is reachable without a browser:
 * the DOM-level behaviour is `e2e/prayer.spec.js` and `e2e/index-grid.spec.js`,
 * and what those cannot see is a module quietly reaching for a singleton again.
 */

const src = (file) => readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
const nocomments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the shell reaches for no page of its own', () => {
  const code = nocomments(src('views/index/controls.js'));
  assert.ok(
    !/from\s+'\.\/state\.js'/.test(code),
    'controls.js imports a page state again, which is the whole of what made the shell unmountable',
  );
  // The import check alone would pass on a file that had kept the singleton
  // under another name, so the wiring half is asked directly: everything it
  // reads is read off the argument.
  const body = code.slice(code.indexOf('export function wireControls'));
  assert.ok(!/(^|[^.\w])state\s*\./.test(body), 'wireControls still reads a `state` it did not receive');
  assert.match(body, /host\.filters/);
});

test('the host and the flags arrive together, so a page cannot wire a chip it did not draw', () => {
  const code = src('views/index/controls.js');
  assert.match(code, /export function controls\(state, \{[^)]*sort[^)]*detailed/s);
  assert.match(code, /export function wireControls\(\s*host,/);
  for (const flag of ['sort', 'detailed', 'layout']) {
    assert.ok(
      new RegExp(`${flag} = true`).test(code),
      `wireControls does not default \`${flag}\`, so the two halves can disagree`,
    );
  }
});

test('Prayer mounts the shell rather than drawing one', () => {
  const code = src('views/prayer/find.js');
  /* `LAYOUTS` joined the three on 2026-10-03 (TODO item 7): the page forces
     the rows face below 1024 px and takes the word for it from the shell
     rather than writing 'rows' out again. */
  assert.match(
    code,
    /import \{ controls, LAYOUTS, syncCalendarFacet, wireControls \} from '\.\.\/index\/controls\.js'/,
  );
  // No Sort chip and no Detailed box, said twice because `controls` and
  // `wireControls` are told separately.
  assert.equal((code.match(/sort: false/g) ?? []).length, 2);
  assert.equal((code.match(/detailed: false/g) ?? []).length, 2);
  assert.ok(
    !/searchField|wireSearchField/.test(code),
    'Prayer draws its own field again, where the shell already carries one',
  );
});

test('the asides draw the All Saints row card and nothing of their own', () => {
  const code = src('views/prayer/asides.js');
  /* Comments off for the dead-name sweep: the module's own doc names the row
     it used to draw, which is the kind of comment that stays. */
  const drawn = nocomments(code);
  assert.match(code, /import \{ card \} from '\.\.\/index\/grid\.js'/);
  assert.match(code, /card\(saint, state\.router, \{/);
  // `hy-links` stays — it is the list and not the row — so the dead names are
  // matched to a word boundary rather than as substrings.
  for (const dead of ['hy-link', 'hy-plate', 'hy-who', 'hy-when', 'day-tile', 'day-grid', 'reg-thumb']) {
    assert.ok(
      !new RegExp(`${dead}(?![\\w-])`).test(drawn),
      `asides.js still emits \`${dead}\`, so there is a second drawing`,
    );
  }
  // The three doors and the dim are the 2026-09-17 ruling and are not a
  // casualty of sharing the row.
  assert.match(code, /data-go=/);
  assert.match(code, /disabled/);
  assert.match(code, /is-dim/);
});

test("card()'s default door is the link All Saints has always drawn", () => {
  const code = src('views/index/grid.js');
  assert.match(code, /door = null/);
  // The default branch, not the caller's: a card asked for with no door gets
  // the anchor and the prefetch hint, which is what keeps the Index unchanged.
  assert.match(code, /door\?\.\(item\) \?\? \{\s*tag: 'a',\s*attrs: ` href="\$\{router\.href/);
  assert.match(code, /data-prefetch="\$\{esc\(item\.slug\)\}"/);
});

/**
 * Prayer now loads `index.css` *and* `prayer.css`, so the two are in one
 * document and the order their links arrive in is the reader's route history —
 * the same trap `tests/sheet-order.test.mjs` exists for. It cannot bite here
 * only because every rule in this sheet is route-scoped and therefore more
 * specific than anything `index.css` says. Asserted rather than trusted,
 * because an unscoped rule is one keystroke away and would draw All Saints two
 * different ways for two readers.
 */
test('every Prayer rule touching a shared class is route-scoped', () => {
  const sheet = nocomments(readFileSync(new URL('../src/styles/prayer.css', import.meta.url), 'utf8'));
  const selectors = [...sheet.matchAll(/([^{}]*)\{[^{}]*\}/g)]
    .flatMap(([, prelude]) => prelude.split(','))
    .map((one) => one.replace(/\s+/g, ' ').trim())
    .filter((one) => one && !one.startsWith('@') && !/^(from|to|\d+%)$/.test(one));
  const shared = selectors.filter((one) => /\.(index|facet|filter-drop|search-field|sticky-sentinel|panel)/.test(one));
  assert.ok(shared.length > 0, 'prayer.css says nothing about the shell, so this test is asleep');
  for (const one of shared) {
    assert.ok(
      one.startsWith("html[data-route~='prayer']"),
      `an unscoped rule for a shared class would reach All Saints: ${one}`,
    );
  }
});
