import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * DESIGN.md quotes a contrast ratio for every text token in both themes, and
 * has been wrong about them twice — once claiming ink-soft cleared 5.4:1 both
 * modes when the light field was 5.29:1, and once calling the dark rubric
 * 5.1:1 and "safe for text at any size" when it was 4.20:1 and failing AA.
 * Both were caught by somebody recomputing by hand, years of reading apart.
 *
 * A worked value nobody executes is a comment (HANDOFF.md). These are the
 * ratios, computed from `tokens.css` as it actually ships. The browser suite
 * cannot stand in for this: axe sees only the compositions a test happens to
 * visit, and until 2026-08-28 it never visited dark mode at all.
 */

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** The value of `--name` inside a block, taking the last declaration to win as the cascade does. */
function token(block, name) {
  const hits = [...block.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, 'g'))];
  assert.ok(hits.length, `--${name} is not declared in that block`);
  return hits.at(-1)[1].trim();
}

function block(selector) {
  const at = css.indexOf(selector + ' {');
  assert.ok(at >= 0, `no ${selector} block in tokens.css`);
  return css.slice(at, css.indexOf('\n}', at));
}

const LIGHT = block(':root');
const DARK = block('html.dark');
// The dark block overrides only what changes, so anything it omits falls through.
const dark = (name) => (DARK.includes(`--${name}:`) ? token(DARK, name) : token(LIGHT, name));

const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const round = (n) => Math.round(n * 100) / 100;

/*
 * Two grounds per theme, and the *field* is the binding one: it is the recessed
 * card interior, always slightly nearer the ink than the page, and secondary
 * text sits inside cards. A token that clears AA on gesso and fails on the
 * field fails where it is actually read.
 */
for (const [theme, get] of [
  ['light', (n) => token(LIGHT, n)],
  ['dark', dark],
]) {
  const grounds = { gesso: get('gesso'), field: get('field') };

  for (const name of ['ink', 'ink-soft', 'rubric']) {
    for (const [where, ground] of Object.entries(grounds)) {
      test(`${theme}: --${name} clears AA on --${where}`, () => {
        const r = ratio(get(name), ground);
        assert.ok(
          r >= 4.5,
          `--${name} (${get(name)}) is ${round(r)}:1 on --${where} (${ground}), under the 4.5:1 AA floor for normal text`,
        );
      });
    }
  }

  /*
   * `--gold` itself takes no floor: it is never text and never carries
   * information alone (DESIGN.md §7), and it is spent on a favicon, a hairline
   * and the coachmarks' border — decoration, not a graphical object a reader
   * has to resolve to understand anything. It measures 2.78:1 on light gesso,
   * which would fail a non-text floor if one applied, and none does.
   *
   * `--gold-ink` is the token that exists *because* of that: "the same gold at
   * a value words can be read at" (tokens.css, 2026-08-27). Wherever gold has
   * to be legible it is this one, so this one takes the AA floor.
   */
  test(`${theme}: --gold-ink clears AA, since it is the gold that carries words`, () => {
    for (const [where, ground] of Object.entries(grounds)) {
      const r = ratio(get('gold-ink'), ground);
      assert.ok(r >= 4.5, `--gold-ink (${get('gold-ink')}) is ${round(r)}:1 on --${where}, under 4.5:1`);
    }
  });

  // The fast colours are set as text on the liturgy line and in the register.
  for (const name of ['fast-strict', 'fast-fish', 'fast-free']) {
    test(`${theme}: --${name} clears AA as text`, () => {
      const raw = get(name);
      // `--fast-strict` is `var(--rubric)` in both themes; resolve the one indirection.
      const value = raw.startsWith('var(') ? get(raw.slice(6, -1)) : raw;
      for (const [where, ground] of Object.entries(grounds)) {
        const r = ratio(value, ground);
        assert.ok(r >= 4.5, `--${name} (${value}) is ${round(r)}:1 on --${where}, under 4.5:1`);
      }
    });
  }
}

/*
 * And the figures DESIGN.md prints, so the document cannot drift from the
 * palette again without a red test naming the paragraph. Recomputed 2026-08-28;
 * the dark rubric row is the one this session moved.
 */
test('DESIGN.md quotes the ratios the tokens actually produce', () => {
  const design = readFileSync(new URL('../DESIGN.md', import.meta.url), 'utf8');
  const quoted = [
    ['ink/gesso light', ratio(token(LIGHT, 'ink'), token(LIGHT, 'gesso'))],
    ['ink/field light', ratio(token(LIGHT, 'ink'), token(LIGHT, 'field'))],
    ['ink-soft/gesso light', ratio(token(LIGHT, 'ink-soft'), token(LIGHT, 'gesso'))],
    ['ink-soft/field light', ratio(token(LIGHT, 'ink-soft'), token(LIGHT, 'field'))],
    ['rubric/gesso light', ratio(token(LIGHT, 'rubric'), token(LIGHT, 'gesso'))],
    ['rubric/field light', ratio(token(LIGHT, 'rubric'), token(LIGHT, 'field'))],
    ['ink/gesso dark', ratio(dark('ink'), dark('gesso'))],
    ['ink-soft/gesso dark', ratio(dark('ink-soft'), dark('gesso'))],
    ['rubric/field dark', ratio(dark('rubric'), dark('field'))],
  ];
  for (const [what, r] of quoted) {
    const printed = round(r).toFixed(2);
    assert.ok(
      design.includes(printed),
      `DESIGN.md does not print ${printed}:1 for ${what} — recompute the contrast paragraph`,
    );
  }
});
