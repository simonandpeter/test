import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_HERO_RATIO, MIN_HERO_RATIO, heroCrop } from '../src/lib/hero-crop.js';

/**
 * Two shapes and two anchors (author, 2026-09-01: "Tallest aspect ratio allowed
 * for this main saint card would be 1:1.6, and widest would be 2:1. For really
 * tall images, crop them favouring the top edge, and for really wide images
 * crop them favouring the centre").
 *
 * Pinned here rather than in the browser for one reason above the others: **no
 * icon in the corpus is wider than 2:1**, so half of this rule has no reachable
 * trigger on any page today. A browser test could only assert the half that
 * fires. The arithmetic can be asked about both.
 *
 * **What this governs changed on 2026-09-10, and nothing in it changed with
 * it** (docs/daily-desktop-visuals.md §10.23). The rule was written about the
 * Daily page's main saint card, and that card, past 1024 px, is now a fixed
 * 3:2 at `50% 34%` — the reference's crop, by the author's instruction of that
 * day. So the *hero* on a desk no longer consumes either constant or either
 * focus string.
 *
 * They are not spare. Three surfaces still read them, and each is an author
 * instruction of its own:
 *
 * - **`cardCrop`** — the Index's cards, the carousel's columns and the Daily
 *   register's (author, 2026-09-02: "apply the same aspect ratio limitations
 *   to crop any saint card display … in the same way it applies to the main
 *   saint card on Daily page desktop"). This is the larger surface by far:
 *   one card of many, where a derived box is what PLAN §4 asks for.
 * - **The hero between 620 and 1024 px**, where the picture has a column but
 *   the page is not the two-column desk the 2026-09-10 instruction is about.
 * - **The hero on a phone** takes calendar.css's own 3:2 band and never this.
 *
 * The instruction quoted above is therefore still executed in full; what moved
 * is which card is called "the main saint card". Written out because deleting
 * a constant whose one named caller has gone is the obvious mistake here, and
 * it would silently return a 1:3 scan to the Index.
 */

test('an icon inside both limits is drawn at its own shape', () => {
  // 1.29 down, which is the ordinary panel icon and eleven of the corpus's
  // thirteen decimal points of variety.
  assert.equal(heroCrop({ w: 700, h: 903 }).height, 903);
  assert.equal(heroCrop({ w: 900, h: 600 }).height, 600);
});

test('a tall icon is held to 1:1.6 and cropped from the top', () => {
  // Pulcheria: 556x1721, the tallest in the corpus at 3.09 down.
  const tall = heroCrop({ w: 556, h: 1721 });
  assert.equal(tall.height, 556 * MAX_HERO_RATIO);
  assert.equal(tall.focus, '50% 0');
  // What she loses is her feet, which is the whole of why the anchor is the
  // top: the face of a standing figure is in the upper third.
  assert.ok(tall.height < 1721);
});

test('a wide icon is held to 2:1 and cropped from the centre', () => {
  // Unreachable from the corpus today, which is exactly why it is asserted:
  // a panorama arriving in the folder tomorrow must not be a letterbox.
  const wide = heroCrop({ w: 2000, h: 500 });
  assert.equal(wide.height, 2000 * MIN_HERO_RATIO);
  assert.equal(wide.focus, '50% 50%');
  // Taller than it came, because the box is what is being cropped to - the
  // picture is covered into it and loses its ends rather than its middle.
  assert.ok(wide.height > 500);
});

test('exactly on either limit is not a crop', () => {
  assert.equal(heroCrop({ w: 100, h: 160 }).height, 160);
  assert.equal(heroCrop({ w: 100, h: 50 }).height, 50);
  assert.equal(heroCrop({ w: 100, h: 50 }).focus, '50% 0');
});

test('an icon with no dimensions asks for no box', () => {
  // The card carries a saint with no picture at all, and the panel reads this
  // before it knows whether there is one.
  assert.equal(heroCrop(null).height, 0);
  assert.equal(heroCrop({}).height, 0);
});
