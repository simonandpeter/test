import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DUR, EASE } from '../src/lib/motion.js';

/**
 * The design system is `src/styles/tokens.css`, and this is what makes that
 * true rather than aspirational.
 *
 * PLAN.md said "200 ms standard, one easing" for three weeks — in DESIGN.md's
 * words, before it was distilled — while the code grew to **17 durations and 7
 * easings**, because a document cannot stop a value being typed and nothing
 * else was looking. Type went the same way: 62 `font-size` declarations over 14
 * raw px values.
 *
 * So the rule is executable. A raw easing or a sub-second duration in a
 * component stylesheet fails here, at 1.4 seconds, rather than being noticed
 * by a reader six weeks later.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = path.join(ROOT, 'src/styles');
const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css') && f !== 'tokens.css')
  .map((f) => [f, readFileSync(path.join(STYLES, f), 'utf8')]);

/**
 * Declarations only. A comment in this repo routinely quotes the value it is
 * explaining — "it was 480 ms on `--ease`" — and a checker that read prose
 * would report the history as a defect.
 */
const declarations = (css) =>
  css
    // Blanked, not removed: a comment spans lines, and dropping them outright
    // shifted every line number after the first one in the reported failure.
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => /^\s*[-a-z]+\s*:/.test(l));

test('no raw easing in a component stylesheet', () => {
  const found = [];
  for (const [name, css] of sheets) {
    for (const [line, text] of declarations(css)) {
      if (!/\b(transition|animation)\b/.test(text)) continue;
      // `var(--ease-…)` is the point; a bare keyword or curve is not.
      const bare = text.replace(/var\(--[\w-]+\)/g, '');
      if (/cubic-bezier|(?<![-\w])ease(-in|-out|-in-out)?(?![-\w])|steps\(/.test(bare)) {
        found.push(`${name}:${line} ${text.trim()}`);
      }
    }
  }
  assert.deepEqual(found, [], `use an --ease token:\n  ${found.join('\n  ')}`);
});

test('no raw transition duration in a component stylesheet', () => {
  /*
   * **Under a second**, which is the honest line between the two kinds of
   * motion here. Every transition on the site is 450 ms or less; the three
   * things that are not — the veil's sweep, the skeleton's breath, the
   * coachmark's glow — are *loops*, which are a different decision from a
   * scale of response times and are left to state their own period.
   */
  const found = [];
  for (const [name, css] of sheets) {
    for (const [line, text] of declarations(css)) {
      if (!/\b(transition|animation)\b/.test(text)) continue;
      const bare = text.replace(/var\(--[\w-]+\)/g, '');
      for (const m of bare.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)) {
        const ms = Number(m[1]) * (m[2] === 's' ? 1000 : 1);
        if (ms > 0 && ms < 1000) found.push(`${name}:${line} ${m[0]} — ${text.trim()}`);
      }
    }
  }
  assert.deepEqual(found, [], `use a --dur token:\n  ${found.join('\n  ')}`);
});

test('no raw font-size in a component stylesheet', () => {
  const found = [];
  for (const [name, css] of sheets) {
    for (const [line, text] of declarations(css)) {
      const m = /^\s*font-size:\s*([^;]+);/.exec(text);
      if (!m) continue;
      const value = m[1].trim();
      /*
       * `0` and relative units are not sizes the scale governs. Nor is a bare
       * custom property of a component's own: the facet chip is drawn by two
       * views and carries its four metrics on `:root` so both can reach them,
       * which is a token — just not one of these.
       */
      if (value === '0' || value === 'inherit' || /(?:em|rem|ch|ex|%)$/.test(value)) continue;
      if (/^var\(--[\w-]+\)$/.test(value) && !/^var\(--text-/.test(value)) continue;
      if (!/var\(--text-/.test(value)) found.push(`${name}:${line} ${value}`);
    }
  }
  assert.deepEqual(found, [], `use a --text token:\n  ${found.join('\n  ')}`);
});

test('every custom property a sheet reads is one tokens.css defines', () => {
  /*
   * The gap this closes, found on 2026-09-08 with the suite green: the
   * consolidation deleted `--dur-slot` and `--dur-theme` from `tokens.css` and
   * left **thirteen** call sites reading them — the theme cross-fade, the
   * carousel's slots, two JS transition strings. An undefined custom property
   * inside a `transition` shorthand invalidates the whole declaration at
   * computed-value time, so those movements simply stopped happening, and both
   * the raw-value tests above and 902 browser tests passed over it.
   *
   * A checker that only looks for values it dislikes cannot see a value that
   * is missing. This one asks the other question.
   */
  const tokens = readFileSync(path.join(STYLES, 'tokens.css'), 'utf8');
  const defined = new Set();
  for (const m of tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)) defined.add(m[1]);
  for (const [, css] of sheets) {
    // A sheet may define its own; the point is that nothing reads a ghost.
    for (const m of css.matchAll(/^\s*(--[\w-]+)\s*:/gm)) defined.add(m[1]);
  }

  const js = readdirSync(path.join(ROOT, 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.js'))
    .map((f) => readFileSync(path.join(ROOT, 'src', f), 'utf8'));
  // A JS file may set one before reading it back.
  for (const src of js) {
    for (const m of src.matchAll(/setProperty\(\s*['"`](--[\w-]+)/g)) defined.add(m[1]);
  }

  const found = [];
  for (const [name, css] of sheets) {
    for (const [line, text] of declarations(css)) {
      for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
        // `var(--x, fallback)` carries its own answer and is not a ghost.
        if (m[2] === ',') continue;
        if (!defined.has(m[1])) found.push(`${name}:${line} ${m[1]}`);
      }
    }
  }
  for (const src of js) {
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
      if (!defined.has(m[1])) found.push(`(js) ${m[1]}`);
    }
  }
  assert.deepEqual(found, [], `undefined custom property:\n  ${[...new Set(found)].join('\n  ')}`);
});

test('the JS motion scale and the CSS one are the same numbers', () => {
  /*
   * Two copies of a duration is how twelve of them happened. The mode fade's
   * length is declared in `index.css` and read by `views/index/modes.js`; the
   * chooser's flight is a JS tween beside a CSS transition. They agree because
   * this fails when they do not.
   */
  const css = readFileSync(path.join(STYLES, 'tokens.css'), 'utf8');
  for (const [name, ms] of Object.entries(DUR)) {
    const m = new RegExp(`--dur-${name}:\\s*(\\d+)ms`).exec(css);
    assert.ok(m, `tokens.css has no --dur-${name}, which lib/motion.js exports`);
    assert.equal(Number(m[1]), ms, `--dur-${name} is ${m[1]}ms in CSS and ${ms} in JS`);
  }
});

test('the JS easings and the CSS ones are the same curves', () => {
  /*
   * The same rule for the other half of the scale, added the day two raw
   * curves were found living in JS where the checks above cannot reach:
   * `fly.js` held `--ease-soft`'s exact bezier as a string, and `roll.js` had
   * a fifth curve that appeared in no table anywhere.
   */
  const css = readFileSync(path.join(STYLES, 'tokens.css'), 'utf8');
  for (const [name, curve] of Object.entries(EASE)) {
    const token = name === 'base' ? '--ease' : `--ease-${name}`;
    const m = new RegExp(`${token}:\\s*([^;]+);`).exec(css);
    assert.ok(m, `tokens.css has no ${token}, which lib/motion.js exports`);
    assert.equal(m[1].trim(), curve, `${token} disagrees between CSS and JS`);
  }
});

test('no raw easing or duration in the JavaScript either', () => {
  /*
   * The fence the CSS tests build, on the side the site actually animates
   * from. A hand-rolled tween and a CSS transition are routinely the same
   * movement; the scale is worth nothing if one of the two can opt out.
   */
  const dir = path.join(ROOT, 'src');
  const files = readdirSync(dir, { recursive: true }).filter(
    (f) => typeof f === 'string' && f.endsWith('.js') && !f.includes('locales'),
  );
  const found = [];
  for (const f of files) {
    if (f.endsWith(path.join('lib', 'motion.js')) || f === 'lib/motion.js') continue;
    const src = readFileSync(path.join(dir, f), 'utf8');
    for (const [i, line] of src.split('\n').entries()) {
      const code = line.replace(/\/\/.*$/, '');
      if (/^\s*\*/.test(line)) continue;
      if (/cubic-bezier\(/.test(code)) found.push(`${f}:${i + 1} ${code.trim()}`);
      if (/\b(duration|delay)\s*:\s*\d+\b/.test(code)) found.push(`${f}:${i + 1} ${code.trim()}`);
    }
  }
  assert.deepEqual(found, [], `use DUR / EASE from lib/motion.js:\n  ${found.join('\n  ')}`);
});

/*
 * ---- the theme cross-fade ------------------------------------------------
 *
 * The page crosses between day and vigil by animating the *tokens*, which
 * `tokens.css`'s `@property` block argues at length. Three things have to
 * agree for that to work and none of them fails loudly on its own: a token can
 * be registered and left out of the transition, listed in the transition and
 * never registered (registration is what makes it interpolable, so it would
 * simply snap), or registered with an `initial-value` that has drifted from
 * the value `:root` actually declares.
 *
 * `e2e/chrome.spec.js` asserts the result in a browser, which is the test that
 * would have caught the defect these replaced. These three are the cheap
 * guards on the way there, and the third of them is the one that catches a
 * *new* colour token added to `tokens.css` and forgotten.
 */

const TOKENS = readFileSync(path.join(STYLES, 'tokens.css'), 'utf8');
const registered = () => [...TOKENS.matchAll(/@property\s+(--[\w-]+)/g)].map((m) => m[1]);
/** The day block's value for a token: the first declaration in file order. */
const declaredIn = (css, name) => {
  const m = new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'm').exec(css);
  return m ? m[1].trim() : null;
};
const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, '');

/** The names in `html.theme-anim`'s `transition-property`, in base.css. */
const crossFaded = () => {
  const base = readFileSync(path.join(STYLES, 'base.css'), 'utf8');
  const m = /html\.theme-anim\s*\{[^}]*?transition-property:\s*([^;]+);/s.exec(base);
  assert.ok(m, 'base.css has no transition-property on html.theme-anim');
  return m[1].split(',').map((s) => s.trim());
};

test('every registered colour token is one the theme cross-fade moves', () => {
  assert.deepEqual(
    registered().slice().sort(),
    crossFaded().slice().sort(),
    'tokens.css registers a different set of colours than base.css cross-fades',
  );
});

test('a registered token’s initial-value is the value :root declares', () => {
  /*
   * `initial-value` never applies — `:root` declares all fifteen — but a wrong
   * one is invisible until the day somebody stops declaring one, so the two
   * copies are held to each other rather than left to drift. `--bub` is
   * `var(--field)` in the day block, so one level of substitution is resolved
   * before comparing; that is the whole of the indirection in this file.
   */
  const found = [];
  for (const m of TOKENS.matchAll(/@property\s+(--[\w-]+)\s*\{[^}]*initial-value:\s*([^;}]+)/g)) {
    const [, token, initial] = m;
    let root = declaredIn(TOKENS, token);
    assert.ok(root, `${token} is registered and :root does not declare it`);
    const via = /^var\(\s*(--[\w-]+)\s*\)$/.exec(root);
    if (via) root = declaredIn(TOKENS, via[1]);
    if (norm(root) !== norm(initial)) found.push(`${token}: :root ${root}, initial-value ${initial}`);
  }
  assert.deepEqual(found, [], `initial-value has drifted:\n  ${found.join('\n  ')}`);
});

test('every colour the vigil theme redeclares crosses rather than snapping', () => {
  /*
   * The direction that catches a colour token *added* later: anything
   * `html.dark` gives its own value is a colour the reader watches change, so
   * it is either registered here or derived with `var()` from one that is —
   * `--fast-strict` is `var(--rubric)` in both themes and follows the animated
   * value without being registered itself.
   *
   * `--veil` and the two `--button-face*` are the sanctioned exceptions and
   * they are named rather than pattern-matched: the veil is read by no sheet
   * and no module, and the button face is deliberately outside the theme.
   */
  const exempt = new Set(['--veil', '--button-face', '--button-face-ink']);
  const dark = /html\.dark\s*\{([\s\S]*)$/.exec(TOKENS)[1];
  const moved = registered();
  const found = [];
  for (const m of dark.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    const [, token, value] = m;
    if (exempt.has(token) || moved.includes(token)) continue;
    const via = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
    if (via && moved.includes(via[1])) continue;
    if (!/^(#|rgb|hsl|oklch|oklab|color)/.test(value.trim())) continue;
    found.push(`${token}: ${value.trim()}`);
  }
  assert.deepEqual(found, [], `vigil redeclares a colour the cross-fade never moves:\n  ${found.join('\n  ')}`);
});
