import test from 'node:test';
import assert from 'node:assert/strict';

import { MAX_NAME_RUN, carouselCells, isNameCell } from '../src/lib/carousel-cells.js';

/**
 * The carousel's arrangement, dealt from synthetic corpora rather than the
 * manifest: the rule has to hold for the corpus after the next batch, not only
 * this one, so the share of saints without an icon is swept well past today's.
 *
 * Heights are made up but shaped like the page's: a caption of two to four
 * lines, an icon as tall as its aspect makes it at the column's width, and
 * three windows — a desk's wide picture column beside a narrower name column,
 * a phone's single width, and a short window where a picture column holds its
 * icon and nothing else.
 */

const lcg = (seed) => {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
};

const corpus = (icons, namesPerIcon, seed) => {
  const r = lcg(seed);
  const n = Math.round(icons * (1 + namesPerIcon));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const lines = r() < 0.5 ? 2 : r() < 0.7 ? 3 : 4;
    out.push({ slug: `s${i}`, caption: lines * 20 + 4, image: i < icons ? { aspect: 0.6 + r() * 0.5 } : null });
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const WINDOWS = [
  { name: 'desk', space: 520, cardWidth: 257, textWidth: 159 },
  { name: 'phone', space: 560, cardWidth: 150, textWidth: 150 },
  { name: 'short', space: 320, cardWidth: 257, textWidth: 159 },
];

const deal = (pool, w) =>
  carouselCells(pool, {
    ...w,
    heightOf: (item, width) =>
      item.image ? Math.min(width / item.image.aspect, w.space - item.caption) + 8 + item.caption : item.caption,
  });

/** The longest stretch of name columns, read round the loop as the row is. */
const ringRun = (cells) => {
  const names = cells.map(isNameCell);
  const start = names.indexOf(false);
  if (start < 0) return Infinity;
  let run = 0;
  let longest = 0;
  for (let k = 1; k <= names.length; k += 1) {
    run = names[(start + k) % names.length] ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
};

/** What this window's columns hold: names beside an icon, names in a name column. */
const depths = (cells) => {
  const pics = cells.filter((c) => !isNameCell(c));
  const names = cells.filter(isNameCell);
  return {
    p: pics.reduce((n, c) => n + c.filter((i) => !i.image).length, 0) / pics.length,
    q: names.reduce((n, c) => n + c.length, 0) / Math.max(1, names.length),
  };
};

const SWEEP = [2, 4, 6.3, 8, 10, 12, 14, 16, 18, 20, 25];
const SHUFFLES = 30;

test('every saint is dealt exactly once, and the run opens on a picture', () => {
  for (const w of WINDOWS) {
    for (const k of [2, 8, 25]) {
      const pool = corpus(130, k, 11);
      const cells = deal(pool, w);
      const slugs = cells.flat().map((i) => i.slug);
      assert.equal(slugs.length, pool.length, `${w.name} at ${k}: a saint dealt twice or dropped`);
      assert.equal(new Set(slugs).size, pool.length, `${w.name} at ${k}: a saint dealt twice`);
      assert.equal(isNameCell(cells[0]), false, `${w.name} at ${k}: the run opens on names`);
      assert.ok(
        cells.every((c) => isNameCell(c) || c[0].image),
        `${w.name} at ${k}: a picture column not seeded on its picture`,
      );
    }
  }
});

test('below the ceiling, no more than two columns of names stand together, seam included', () => {
  let held = 0;
  for (const w of WINDOWS) {
    for (const k of SWEEP) {
      for (let t = 0; t < SHUFFLES; t += 1) {
        const cells = deal(corpus(130, k, 7 + t * 31), w);
        const { p, q } = depths(cells);
        // Half a column inside the ceiling: at the ceiling itself one short
        // column anywhere in the run is the difference, and that is rounding.
        if (k > p + MAX_NAME_RUN * q - q / 2) continue;
        held += 1;
        assert.ok(
          ringRun(cells) <= MAX_NAME_RUN,
          `${w.name}, ${k} names an icon (ceiling ${(p + 2 * q).toFixed(1)}), shuffle ${t}: ${ringRun(cells)} columns of names in a row`,
        );
      }
    }
  }
  // An instrument that skipped every case would pass; this is most of the sweep.
  assert.ok(held >= 400, `only ${held} deals were inside the ceiling`);
});

test('past the ceiling, the stretches of names grow evenly rather than piling at the end', () => {
  let past = 0;
  for (const w of WINDOWS) {
    for (const k of SWEEP) {
      for (let t = 0; t < 10; t += 1) {
        const cells = deal(corpus(130, k, 7 + t * 31), w);
        const { p, q } = depths(cells);
        if (k <= p + MAX_NAME_RUN * q) continue;
        past += 1;
        // The groups this many names need, and one column of rounding.
        const need = Math.ceil((k - p) / q) + 1;
        assert.ok(
          ringRun(cells) <= need,
          `${w.name}, ${k} names an icon, shuffle ${t}: ${ringRun(cells)} columns of names in a row against ${need}`,
        );
      }
    }
  }
  assert.ok(past >= 100, `only ${past} deals were past the ceiling`);
});

test('where the icons can afford it, every second column still carries one', () => {
  for (const w of WINDOWS) {
    const cells = deal(corpus(130, 2, 5), w);
    const { p, q } = depths(cells);
    assert.ok(2 <= p + q, `${w.name}: the premise, that two names an icon fits one column of names`);
    const pictures = cells.filter((c) => !isNameCell(c)).length;
    assert.ok(pictures / cells.length >= 0.5, `${w.name}: ${pictures} of ${cells.length} columns carry a picture`);
    assert.ok(ringRun(cells) <= 1, `${w.name}: two name columns together where one would have done`);
  }
});

test('a pool with no room to pack into is one saint a column', () => {
  const pool = corpus(3, 2, 1);
  assert.deepEqual(
    carouselCells(pool, { space: 0, heightOf: () => 1 }),
    pool.map((i) => [i]),
  );
});
