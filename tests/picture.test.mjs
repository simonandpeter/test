import test from 'node:test';
import assert from 'node:assert/strict';

import { srcsetFor } from '../src/lib/picture.js';

const full = { cardSm: 'a-card-sm.jpg', cardSmW: 280, card: 'a-card.jpg', cardW: 560, hero: 'a-hero.jpg', heroW: 939 };

test('the three derivatives are named ascending, each with its own width', () => {
  assert.equal(srcsetFor(full, '/'), '/a-card-sm.jpg 280w, /a-card.jpg 560w, /a-hero.jpg 939w');
});

test('a width that appears twice is named once', () => {
  /*
   * make_thumbs.py never upscales, so a picture smaller than every cap is its
   * own derivative three times over and the `srcset` would offer one width
   * three times — which is not an error the browser reports, only bytes it
   * may pick at random.
   */
  const small = { cardSm: 'a-card-sm.jpg', cardSmW: 400, card: 'a-card.jpg', cardW: 400, hero: 'a-hero.jpg', heroW: 400 };
  assert.equal(srcsetFor(small, '/'), '');
});

test('a partial image names what it has, and nothing when that is one file', () => {
  assert.equal(srcsetFor({ card: 'a-card.jpg', cardW: 560, hero: 'a-hero.jpg', heroW: 939 }, '/'),
    '/a-card.jpg 560w, /a-hero.jpg 939w');
  assert.equal(srcsetFor({ hero: 'a-hero.jpg', heroW: 939 }, '/'), '');
});

test('no image is no attribute', () => {
  assert.equal(srcsetFor(null), '');
  assert.equal(srcsetFor(undefined), '');
});
