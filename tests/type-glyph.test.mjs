import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { typeGlyph } from '../src/lib/saint-types.js';

/**
 * The register's type glyph (docs/daily-desktop-visuals.md §5.1, §10.10): the
 * mark a row shows where the saint has no icon, so the reader is told what kind
 * of saint this is rather than shown a hole.
 *
 * Here rather than in the browser because it is a table lookup over the
 * corpus's own vocabulary, and because the interesting cases — the priority
 * between types a saint holds at once, and the ids that fall through — are
 * mostly reachable only by asking the arithmetic directly. The last test asks
 * the *corpus*, which is what stops the table going stale as types are added.
 */

test('each of the six marks answers to its own name', () => {
  for (const id of ['martyr', 'hieromartyr', 'venerable', 'hierarch', 'presbyter', 'prince']) {
    assert.equal(typeGlyph([id]), id, `${id} does not answer to itself`);
  }
});

test('the vocabulary is wider than the marks are', () => {
  // A martyr by any of the corpus's names for one.
  assert.equal(typeGlyph(['new-martyr']), 'martyr');
  assert.equal(typeGlyph(['great-martyr']), 'martyr');
  // A hierarch by rank.
  assert.equal(typeGlyph(['bishop']), 'hierarch');
  assert.equal(typeGlyph(['metropolitan']), 'hierarch');
  // A monastic is venerable whatever the corpus called the office.
  assert.equal(typeGlyph(['abbess']), 'venerable');
  assert.equal(typeGlyph(['hermit']), 'venerable');
  // And a ruler is a prince.
  assert.equal(typeGlyph(['king']), 'prince');
});

test('the most specific mark wins where a saint holds several', () => {
  /*
   * Every hieromartyr in the corpus is also a martyr and most are presbyters,
   * so a first-match-wins over the saint's own list would hand out whichever
   * the recorder happened to type first. The order is the table's, not the
   * data's.
   */
  assert.equal(typeGlyph(['martyr', 'hieromartyr', 'presbyter']), 'hieromartyr');
  assert.equal(typeGlyph(['presbyter', 'martyr']), 'presbyter');
  // The monastic reading is the narrower of the two, so it takes it.
  assert.equal(typeGlyph(['venerable-martyr']), 'venerable');
  assert.equal(typeGlyph(['martyr', 'venerable']), 'venerable');
});

test('a type outside the six shows no mark at all, and neither does no type', () => {
  /*
   * A mark invented for a category of one says less than the space it takes,
   * so `righteous`, `confessor` and `prophet` fall through on purpose — the
   * row keeps the shape it has today.
   */
  for (const ids of [['righteous'], ['confessor'], ['prophet'], [], undefined, null]) {
    assert.equal(typeGlyph(ids), null, `${JSON.stringify(ids)} was given a mark`);
  }
});

test('an id is matched whole, never by its opening', () => {
  // `patriarch-of-israel` is not a patriarch of the church, and a prefix match
  // would have made him a hierarch.
  assert.equal(typeGlyph(['patriarch-of-israel']), null);
  assert.equal(typeGlyph(['patriarch']), 'hierarch');
});

test('the marks still cover the corpus they were measured against', () => {
  /*
   * The claim in `saint-types.js` is a number — 702 of 732 imageless saints —
   * and a number in a comment goes stale silently. This is the number, read
   * off `saints/` rather than off the manifest, which `npm test` cannot see
   * (CLAUDE.md: `/data/` is gitignored and the unit run happens before the
   * build).
   *
   * A floor rather than an equality: adding saints must not be able to fail
   * this, and the share going *down* is the thing worth catching.
   */
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'saints');
  let imageless = 0;
  let covered = 0;
  for (const slug of readdirSync(root)) {
    const file = path.join(root, slug, 'saint.json');
    if (!existsSync(file)) continue;
    const saint = JSON.parse(readFileSync(file, 'utf8'));
    const images = path.join(root, slug, 'images');
    const hasIcon =
      existsSync(images) && readdirSync(images).some((name) => name.startsWith('icon'));
    if (hasIcon) continue;
    imageless += 1;
    if (typeGlyph(saint.types)) covered += 1;
  }
  assert.ok(imageless > 700, `premise: only ${imageless} imageless saints, so this measures nothing`);
  assert.ok(
    covered / imageless > 0.94,
    `the marks cover ${covered} of ${imageless} imageless saints, down from 702 of 732`,
  );
});
