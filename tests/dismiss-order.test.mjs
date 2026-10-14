import assert from 'node:assert/strict';
import test from 'node:test';

import { dismissTarget } from '../src/lib/dismiss-order.js';

/** A document that holds only the selectors named, each answering with itself. */
const docOf = (...open) => ({
  querySelector: (sel) => (open.includes(sel) ? { sel } : null),
});

test('the chooser outranks everything the map can have open', () => {
  const doc = docOf(
    '.church-panel:not([hidden])',
    '[data-filter-pop]:not([hidden])',
    '[data-profile]:not([hidden])',
    '[data-map]',
  );
  assert.equal(dismissTarget(doc).sel, '.church-panel:not([hidden])');
});

test("the press goes to the element whose own Escape handler is bound", () => {
  // Shown: the search list. Listening: the input (views/map/search.js). Sending
  // the press to the list would dismiss nothing, which is the whole bug.
  const search = docOf('[data-search-list]:not([hidden])', '[data-search-input]');
  assert.equal(dismissTarget(search).sel, '[data-search-input]');

  // Shown: the Profile button. Listening: the canvas (views/map/press.js).
  const selected = docOf('[data-profile]:not([hidden])', '[data-map]');
  assert.equal(dismissTarget(selected).sel, '[data-map]');
});

test('the year popovers and the filter popover are reachable', () => {
  assert.equal(
    dismissTarget(docOf('[data-year-pop]:not([hidden])')).sel,
    '[data-year-pop]:not([hidden])',
  );
  assert.equal(
    dismissTarget(docOf('[data-filter-pop]:not([hidden])')).sel,
    '[data-filter-pop]:not([hidden])',
  );
});

test('nothing open means back leaves the page', () => {
  assert.equal(dismissTarget(docOf()), null);
  // A hidden thing's `press` element still exists in the DOM; on its own it
  // must not look like something to dismiss.
  assert.equal(dismissTarget(docOf('[data-map]', '[data-search-input]')), null);
});
