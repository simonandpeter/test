import test from 'node:test';
import assert from 'node:assert/strict';

import {
  allChurchIds,
  filterEntries,
  isAll,
  selectAll,
  selectCommunion,
  selectionLabel,
  toggleChurch,
  toggleCommunion,
  toggleRite,
} from '../src/lib/tradition.js';
import { CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';

/**
 * The tradition filter's rules (author, 2026-08-21). Pure set arithmetic over
 * the registry, so it belongs here rather than in a browser test: what the
 * browser has to prove is that the plate is wired to these, not that a union
 * is a union.
 */

test('a communion toggle is all of it, in whichever direction has something to do', () => {
  const all = selectAll();
  const catholic = enabledChurches().filter((c) => c.communion === 'catholic').map((c) => c.id);
  assert.ok(catholic.length > 1, 'this test is worthless if Catholic holds one church');

  // All on, so the press means off.
  const off = toggleCommunion(all, 'catholic');
  for (const id of catholic) assert.ok(!off.has(id));
  // Nothing outside the row moved.
  assert.ok(off.has('eastern-orthodox'));

  // All off, so the press means on.
  const back = toggleCommunion(off, 'catholic');
  assert.deepEqual([...back].sort(), [...all].sort());

  // Half on is not all on, so the press means on — the row completes rather
  // than emptying, which is what a reader who has just turned one cell off and
  // changed their mind expects.
  const half = toggleChurch(all, catholic[0]);
  const completed = toggleCommunion(half, 'catholic');
  for (const id of catholic) assert.ok(completed.has(id));
});

test('a rite toggle crosses communions, which is the point of the column', () => {
  const all = selectAll();
  // Byzantine is Eastern Catholic and Eastern Orthodox: one rite either side of
  // a communion boundary.
  const byzantine = enabledChurches()
    .filter((c) => c.rites.includes('byzantine'))
    .map((c) => c.id);
  assert.ok(byzantine.length > 1);

  const off = toggleRite(all, 'byzantine');
  for (const id of byzantine) assert.ok(!off.has(id));
  // Roman Catholic is Latin, so the Catholic communion is only half off.
  assert.ok(off.has('roman-catholic'));
});

test('a church that holds six cells is still one switch', () => {
  // Eastern Catholic spans six rites from one registry entry (DESIGN.md §7b).
  // The set holds churches, not cells, so this is true by construction — which
  // is the reason the set holds churches.
  const eastern = CHURCHES_BY_ID['eastern-catholic'];
  assert.ok(eastern.rites.length === 6);
  const off = toggleChurch(selectAll(), 'eastern-catholic');
  assert.equal(off.has('eastern-catholic'), false);
  assert.equal(off.size, allChurchIds().length - 1);
});

test('filtering keeps only what the reader is reading in', () => {
  const entries = [
    { slug: 'a', church: 'roman-catholic' },
    { slug: 'b', church: 'coptic' },
    { slug: 'c', church: 'eastern-orthodox' },
  ];
  const only = selectCommunion('oriental-orthodox');
  assert.deepEqual(filterEntries(entries, only).map((e) => e.slug), ['b']);
  assert.deepEqual(filterEntries(entries, selectAll()).length, 3);
  assert.deepEqual(filterEntries(entries, new Set()), []);
});

test('the label names a communion when the whole of it is on, and churches otherwise', () => {
  assert.equal(selectionLabel(selectCommunion('eastern-orthodox')), 'Showing: Eastern Orthodox');

  // A single church out of a communion is named as itself: saying "Oriental
  // Orthodox" for one of its four would be a claim about the other three.
  const one = new Set(['coptic']);
  assert.equal(selectionLabel(one), 'Showing: Coptic Orthodox');

  // Everything is the invitation, not a report — there is nothing to report.
  assert.equal(isAll(selectAll()), true);
  // Everything selected is a status now, not the calendar button's invitation
  // (author, 2026-08-22): the control lives in the header and names itself.
  assert.equal(selectionLabel(selectAll()), 'Every tradition');
  assert.equal(selectionLabel(new Set()), 'No tradition selected');
});
