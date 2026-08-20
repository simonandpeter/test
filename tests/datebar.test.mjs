import test from 'node:test';
import assert from 'node:assert/strict';

import { barGeometry, domainOf, formatYear, renderDateBars } from '../src/ui/datebar.js';
import { softness } from '../src/lib/uncertainty.js';

/**
 * The bar is the interval. What these tests defend is that the geometry comes
 * from the numbers and from nothing else — the moment an editorial enum can
 * move an edge, a soft edge stops meaning "we are unsure of the number".
 */

const anthony = {
  birth: { earliest: 250, latest: 252, display: 'c. 251', basis: 'traditional' },
  death: { earliest: 356, latest: 356, display: '356', basis: 'traditional' },
};

test('the window is the saint own span, padded at both ends', () => {
  const domain = domainOf(anthony);
  assert.ok(domain.from < 250 && domain.to > 356);
  // Padding is proportional, so a long life and a short one both breathe.
  assert.equal(Math.round(domain.to - domain.from), Math.round((356 - 250) * 1.24));
});

test('a saint with no bound at all has no window to draw in', () => {
  assert.equal(domainOf({ birth: null, death: null }), null);
  assert.match(renderDateBars({ birth: null, death: null }), /date-bars-undated/);
});

test('softness follows interval width, and nothing else', () => {
  const domain = domainOf(anthony);
  const precise = barGeometry({ earliest: 356, latest: 356 }, domain);
  const vague = barGeometry({ earliest: 250, latest: 252 }, domain);
  const vaguer = barGeometry({ earliest: 200, latest: 400 }, domain);

  assert.equal(precise.blur, softness(0));
  assert.ok(vague.blur > precise.blur);
  assert.ok(vaguer.blur > vague.blur);

  // The same interval with a different editorial basis draws identically:
  // basis modulates treatment, never geometry (Addendum B2).
  const legendary = barGeometry({ earliest: 250, latest: 252, basis: 'legendary' }, domain);
  assert.deepEqual(legendary, vague);
});

test('a precise date is an interval of zero width, not a special case', () => {
  const domain = domainOf(anthony);
  const g = barGeometry({ earliest: 356, latest: 356 }, domain);
  assert.equal(g.width, 0);
  assert.ok(g.left > 0 && g.left < 100);
});

test('an open bound runs off its end of the window instead of taking a number', () => {
  const dates = {
    birth: { earliest: null, latest: 1000, display: 'before 1000' },
    death: { earliest: 1043, latest: 1043 },
  };
  const domain = domainOf(dates);
  const birth = barGeometry(dates.birth, domain);

  assert.equal(birth.openStart, true);
  assert.ok(birth.left < 0);
  // The bound we do have stays where it belongs; only the unknown end runs off.
  assert.ok(Math.abs(birth.left + birth.width - 100 * ((1000 - domain.from) / (domain.to - domain.from))) < 0.001);
  // And it stays legible: the curve clamp would blur an 8 px bar out of
  // existence, so the open end dissolves over extent rather than radius.
  assert.equal(birth.blur, softness(1));
});

test('the bars carry their own text equivalent', () => {
  const html = renderDateBars(anthony);
  assert.match(html, /aria-label="Born c\. 251 — an interval of 2 years\. Died 356 — a single year\."/);
  // The softness is on the element, in px, where a stylesheet cannot flatten it.
  assert.match(html, /filter:blur\(\d+\.\d+px\)/);
});

test('years read as a reader would say them', () => {
  assert.equal(formatYear(356), '356');
  assert.equal(formatYear(0), '1 BC');
  assert.equal(formatYear(-99), '100 BC');
});
