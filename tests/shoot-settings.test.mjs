/**
 * The settings a screenshot tool seeds before the site boots, checked against
 * the only reader of them that matters: index.html's first-paint script.
 *
 * **This exists because of a bug that was invisible for as long as the tool
 * was.** `scripts/contact-sheet.mjs` seeded `theme: 'vigil'` — the design's
 * name for the dark theme, and not a value storage may hold — so the
 * first-paint script fell through to the machine's own `prefers-color-scheme`
 * and every "vigil" tile of every contact sheet was the day theme with a dark
 * label under it. Nothing failed; the tool reported success; half of the
 * desktop rebuild's design could not be reviewed through the instrument built
 * to review it.
 *
 * So the assertion is deliberately made against **index.html's script text**
 * rather than against `lib/theme.js` or a list retyped here. That script is
 * what decides the class on `<html>` before a line of the app runs — which is
 * what a screenshot catches — and it is the one reader a unit test can reach
 * without a browser. Asserting against another copy of the same list would be
 * the instrument reading what the code publishes about itself (CLAUDE.md,
 * trap 14): two files agreeing about a value neither of them applies.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/lib/settings.js';
import { seed, colorScheme, THEME_NAMES } from '../scripts/shoot-settings.mjs';

const INDEX = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/**
 * The first-paint script, executed on a storage value.
 *
 * Lifted out of the served HTML and run as written, not paraphrased: the
 * paraphrase is exactly what would have passed while the tool was broken. It
 * is three lines of `var`, a `JSON.parse` and a `matchMedia`, and the two
 * things it needs are stubbed so the answer is a function of the stored value
 * alone.
 */
const firstPaintSaysDark = (stored, systemPrefersDark) => {
  const body = /var theme = JSON\.parse\([\s\S]*?if \(dark\)/.exec(INDEX);
  assert.ok(body, 'index.html no longer carries the first-paint theme script this test reads');
  const source = body[0]
    .replace(/if \(dark\)$/, 'return dark;')
    .replace(/localStorage\.getItem\('gos-settings'\)/, 'STORED');
  // eslint-disable-next-line no-new-func
  return new Function('STORED', 'matchMedia', source)(
    JSON.stringify(stored),
    () => ({ matches: systemPrefersDark }),
  );
};

test('the first-paint script this test reads is the one index.html ships', () => {
  // The premise of every case below. If the script is rewritten, the regex
  // above stops matching and this says so in one line rather than four
  // assertions passing vacuously.
  assert.equal(firstPaintSaysDark({ theme: 'dark' }, false), true);
  assert.equal(firstPaintSaysDark({ theme: 'light' }, true), false);
});

test('a seeded theme reaches the first paint, in both themes', () => {
  for (const name of THEME_NAMES) {
    const stored = seed(name, 'en');
    const wanted = colorScheme(name) === 'dark';
    /*
     * **And against the *opposite* system preference**, which is the whole of
     * what the old value failed. `theme: 'vigil'` and `theme: null` both draw
     * correctly on a machine whose preference happens to agree; the bug only
     * shows when the seed has to overrule the desk it is running on.
     */
    assert.equal(
      firstPaintSaysDark(stored, !wanted),
      wanted,
      `seeding ${name} stores ${JSON.stringify(stored.theme)}, which the first paint reads as ${
        firstPaintSaysDark(stored, !wanted) ? 'vigil' : 'day'
      } on a machine set to the other one`,
    );
  }
});

test('the design’s two names and storage’s two values stay paired', () => {
  assert.deepEqual(THEME_NAMES, ['day', 'vigil']);
  assert.deepEqual(Object.values(THEMES), ['light', 'dark']);
  assert.equal(colorScheme('day'), 'light');
  assert.equal(colorScheme('vigil'), 'dark');
});

test('a name the site does not have is refused rather than drawn as the other theme', () => {
  // The failure mode this whole file is about: `--themes=vigl` used to shoot a
  // full row of the day theme under a label nobody would read twice.
  assert.throws(() => seed('vigl'), /unknown theme/);
  assert.throws(() => seed('dark'), /unknown theme/);
});
