import test from 'node:test';
import assert from 'node:assert/strict';

import { columnsFor, layout, windowOf } from '../src/lib/virtual-grid.js';

/**
 * The virtualiser's whole claim is that it knows every card's height before
 * any card exists. These tests are that claim: heights come from the aspect
 * ratios in the manifest, and nothing here consults a rendered element.
 */

const items = [
  { slug: 'a', aspect: 0.5 }, // tall
  { slug: 'b', aspect: 2 }, // wide
  { slug: 'c', aspect: 1 },
  { slug: 'd', aspect: null }, // no image: the text block and nothing else
];

test('columns follow the width, down to one and up to a cap', () => {
  assert.equal(columnsFor(360, { min: 190, gap: 16 }), 1);
  assert.equal(columnsFor(600, { min: 190, gap: 16 }), 2);
  assert.equal(columnsFor(1400, { min: 190, gap: 16 }), 4);
  // A width of zero happens before first layout; one column, never a crash.
  assert.equal(columnsFor(0), 1);
});

test('height comes from the aspect ratio, not from measurement', () => {
  const { positions, columnWidth } = layout(items, { width: 400, gap: 16, columns: 1, textHeight: 100 });
  assert.equal(columnWidth, 400);
  assert.equal(positions[0].h, 400 / 0.5 + 100);
  assert.equal(positions[1].h, 400 / 2 + 100);
  // A card with no image is the text block alone.
  assert.equal(positions[3].h, 100);
});

test('cards pack into the shortest column, and the container is as tall as the tallest', () => {
  const { positions, height } = layout(items, { width: 416, gap: 16, columns: 2, textHeight: 100 });
  const width = (416 - 16) / 2;

  // a is tall (400) and goes to column 0; b is short (200) and goes to column
  // 1; c then goes to column 1 because it is still the shorter of the two.
  assert.equal(positions[0].x, 0);
  assert.equal(positions[1].x, width + 16);
  assert.equal(positions[2].x, width + 16);
  assert.equal(positions[2].y, positions[1].h + 16);

  const bottoms = positions.map((p) => p.y + p.h);
  assert.equal(height, Math.max(...bottoms));
});

test('an empty grid has no height and no positions', () => {
  const empty = layout([], { width: 800 });
  assert.deepEqual(empty.positions, []);
  assert.equal(empty.height, 0);
});

test('only cards near the viewport are worth having in the DOM', () => {
  const positions = Array.from({ length: 100 }, (_, i) => ({ slug: `s${i}`, y: i * 100, h: 90 }));

  // [1000, 1800): s18 begins exactly at the bottom edge and so is not on screen.
  const visible = windowOf(positions, 1000, 800, 0);
  assert.deepEqual(visible.map((p) => p.slug), Array.from({ length: 8 }, (_, i) => `s${10 + i}`));

  // The overscan band is what stops a fast scroll from meeting blank space.
  assert.ok(windowOf(positions, 1000, 800, 400).length > visible.length);
  // A card straddling the top edge stays: it is still partly on screen.
  assert.equal(windowOf(positions, 1050, 100, 0)[0].slug, 's10');
});

test('a layout resumed in chunks is the layout done in one pass', () => {
  /*
   * The Index lays out a prefix and extends it as the reader scrolls, so this
   * is the property that makes that safe: cards must not move when the run
   * that placed them was broken in two. Enough items that the packing has to
   * choose a column several times over.
   */
  const many = Array.from({ length: 37 }, (_, i) => ({ slug: `s${i}`, aspect: [0.5, 2, 1, null][i % 4] }));
  const options = { width: 416, gap: 16, columns: 2, textHeight: 100 };
  const once = layout(many, options);

  let piece = layout(many, { ...options, take: 0 });
  assert.deepEqual(piece.positions, []);
  assert.equal(piece.complete, false);
  while (!piece.complete) {
    const before = piece.laid;
    piece = layout(many, { ...options, take: 5, resume: piece });
    assert.equal(piece.laid, Math.min(many.length, before + 5));
    // The height of a prefix is the height of that prefix, which is what the
    // page's own height is set to while the rest is still unplaced.
    assert.ok(piece.height <= once.height);
  }

  assert.deepEqual(piece.positions, once.positions);
  assert.equal(piece.height, once.height);
  assert.equal(piece.laid, many.length);
});

test('a resumed layout leaves the result it resumed from alone', () => {
  const items2 = [...items, ...items];
  const options = { width: 400, gap: 16, columns: 1, textHeight: 100 };
  const first = layout(items2, { ...options, take: 3 });
  const snapshot = first.positions.slice();
  const second = layout(items2, { ...options, take: 3, resume: first });
  assert.deepEqual(first.positions, snapshot);
  assert.equal(second.positions.length, 6);
});

test('taking more than there is completes rather than overruns', () => {
  const all = layout(items, { width: 400, columns: 1, textHeight: 100, take: 999 });
  assert.equal(all.laid, items.length);
  assert.ok(all.complete);
  // And a resume past the end is a no-op, not a crash: the scroll handler may
  // ask for more after the last card is placed.
  const again = layout(items, { width: 400, columns: 1, textHeight: 100, take: 10, resume: all });
  assert.equal(again.positions.length, items.length);
  assert.ok(again.complete);
});
