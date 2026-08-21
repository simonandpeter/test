import test from 'node:test';
import assert from 'node:assert/strict';

import { softness } from '../src/lib/uncertainty.js';

/**
 * The curve had no test file of its own until 2026-08-21: it was pinned
 * through the date bars, which were the only thing drawing it. The bars were
 * withdrawn that day and the curve was not — the map halo and the timeline
 * dissolve are still to come, and DESIGN.md §6b pins its three constants as
 * art direction. So the constants get their own file rather than leaving with
 * the component that happened to be first to use them.
 */

test('softness rises with the parameter and clamps at both ends', () => {
  // A precise date is sharp; two centuries of doubt is a visible dissolve.
  assert.ok(softness(1) < softness(30));
  assert.ok(softness(30) < softness(100));
  assert.ok(softness(100) < softness(200));
  // Below the floor and above the clamp, the curve stops rather than running on.
  assert.equal(softness(0), softness(1));
  assert.equal(softness(1000), softness(5000));
});

test('the worked values in DESIGN.md §6b are the values the curve gives', () => {
  const at = (p) => Math.round(softness(p) * 100) / 100;
  assert.equal(at(1), 0.75);
  assert.equal(at(30), 4.87);
  assert.equal(at(100), 9.44);
  assert.equal(at(200), 13.82);
  // §6b read "500 years and above → 24 px" until 2026-08-21. It does not: the
  // clamp is 24 and 0.75 · 500^0.55 is 22.88, so the clamp does not bind until
  // about 757 years. Corrected there; pinned here, because a worked value
  // nobody executes is a comment.
  assert.equal(at(500), 22.88);
  assert.equal(at(1000), 24);
});

test('an unknown parameter is maximally unsure, never sharp by accident', () => {
  // The clamp itself, not merely the softest value some real interval reaches.
  assert.equal(softness(null), 24);
  assert.equal(softness(undefined), 24);
  assert.equal(softness(NaN), 24);
  assert.ok(softness(null) > softness(500));
});
