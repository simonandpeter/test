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
