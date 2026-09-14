import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * **The phone's nav strip is five real links, and the loop is a rotation.**
 *
 * `ui/nav-scroll.js` used to be written with buffered clones, the way
 * `ui/loop-scroll.js` still is, and it was wrong for a *nav*: a dozen places in
 * the suite hold `.site-nav a[href$="/saints"]` to be exactly one element — a
 * click handler, an assertion on the current page's own weight, a keyboard
 * test — and a clone breaks every one of them the moment a phone-width test
 * runs. `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` is the record.
 *
 * The invariant was prose in that file's header until 2026-09-12 and nothing
 * executed it. The browser suite catches a clone only by the collateral damage,
 * at phone width, on whichever spec happens to run; this says what is actually
 * wrong, in two seconds, at the source.
 *
 * Source text rather than behaviour because there is no DOM here: these tests
 * are `node --test` over the files themselves, which is the same instrument
 * `plan.test.mjs` and `design-tokens.test.mjs` use.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAV = readFileSync(path.join(ROOT, 'src/ui/nav-scroll.js'), 'utf8');
const MAIN = readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');

/** The file with every comment blanked, so prose quoting a call is not a call. */
const code = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

test('the row is five links, one per page, built once from one list', () => {
  const m = /const NAV_KEYS = \[([^\]]*)\]/.exec(code(MAIN));
  assert.ok(m, 'main.js has no NAV_KEYS list');
  const keys = m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
  assert.equal(keys.length, 5, `the strip is five destinations, not ${keys.length}`);
  assert.equal(new Set(keys).size, 5, 'a page is listed twice');

  // One `<a>` per key and nothing else: `navLinkHTML` is the only thing that
  // writes a nav link, and `renderNav` maps it over `NAV_KEYS` exactly once.
  const link = /function navLinkHTML\(([\s\S]*?)\n}/.exec(code(MAIN));
  assert.ok(link, 'main.js has no navLinkHTML');
  assert.equal((link[0].match(/<a\s/g) ?? []).length, 1, 'navLinkHTML emits more than one <a>');
  assert.match(code(MAIN), /navEl\.innerHTML = NAV_KEYS\.map\(\(key\) => navLinkHTML\(key, current\)\)\.join\(''\)/);
});

/**
 * The denylist is "anything that changes which nodes are in the track, or what
 * order they are in". `style.order` is the sanctioned mechanism and the
 * assertion below requires it, so a rotation cannot be removed either.
 */
const FORBIDDEN = [
  /\.cloneNode\b/,
  /\.insertBefore\b/,
  /\.appendChild\b/,
  /\.append\(/,
  /\.prepend\(/,
  /\.insertAdjacentHTML\b/,
  /\.innerHTML\s*=/,
  /\.replaceChildren\b/,
  /\.before\(/,
  /\.after\(/,
];

test('nav-scroll.js never clones a link and never moves one in the DOM', () => {
  const src = code(NAV);
  const found = [];
  for (const pattern of FORBIDDEN) {
    for (const m of src.matchAll(new RegExp(pattern.source, 'g'))) {
      found.push(`src/ui/nav-scroll.js:${lineOf(src, m.index)} ${m[0]}`);
    }
  }
  assert.deepEqual(
    found,
    [],
    'the strip must stay five real links in the site\'s own DOM order — ' +
      `a dozen selectors in the suite depend on it:\n  ${found.join('\n  ')}`,
  );
});

test('the loop is a flex order rotation', () => {
  assert.match(
    code(NAV),
    /\.style\.order\s*=/,
    'nothing writes `style.order`, so the ring no longer turns by rotation',
  );
});
