import test from 'node:test';
import assert from 'node:assert/strict';

import { coastDelta } from '../src/views/daily/picker.js';

/*
 * The suite's oldest flake, reduced to arithmetic.
 *
 * `a thrown rail coasts` was red on CI about one run in three for a fortnight.
 * Five diagnoses died before a probe on a branch printed what the rail actually
 * computed on the runner: the first coast frame's `dt` was **negative**, so
 * `scrollLeft = before + v * dt` wrote the rail backwards, the next frame asked
 * for a fraction of a pixel, and the wall check ended the coast against a wall
 * that was not there.
 *
 * The cause is that a `requestAnimationFrame` callback is handed *the frame's
 * start time*, which can predate the pointerup that scheduled it. The rule is
 * pure, so it is pinned here rather than through the browser — a browser test
 * was written first and could not be made to fail, because the coast recovers
 * on the following frame unless the machine is slow enough for the wall check
 * to fire as well, which is a second-order effect.
 */

test('a frame that starts before the release spends no time', () => {
  // The measured case: CI and a 120x CPU throttle both produced first frames
  // between -28.7 and -47.6 ms.
  assert.equal(coastDelta(1000, 955.6), null);
  assert.equal(coastDelta(1000, 999.9), null);
});

test('the first frame seeds the clock rather than spending against it', () => {
  assert.equal(coastDelta(null, 1000), null);
});

test('a frame that does not advance spends nothing', () => {
  // Two callbacks inside one frame share a timestamp.
  assert.equal(coastDelta(1000, 1000), null);
});

test('an ordinary frame spends the time between two frame timestamps', () => {
  assert.ok(Math.abs(coastDelta(1000, 1016.6) - 16.6) < 1e-9);
});

test('a long gap is capped, so a backgrounded tab does not spend it all at once', () => {
  assert.equal(coastDelta(1000, 5000), 64);
  assert.equal(coastDelta(1000, 1064), 64);
});
