import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CARD_MAX_PX,
  CARD_SM_MAX_PX,
  DEFAULT_FILE,
  HERO_W_PX,
  cardFor,
  cardSmFor,
  derivedWidth,
  heroFor,
  hydrateImage,
  thumbFor,
} from '../src/lib/image-shape.js';

/**
 * **The manifest stores two numbers and this is what puts the other nine
 * back** (2026-10-03). Eleven fields per icon measured 65 bytes gzipped each
 * against a hard 400 KB budget with 10.6 KB left in it; `{ w, h }` measures
 * 13, which is 15.6 KB back on 320 declarations and the only reason the image
 * programme's next 300 icons fit at all.
 *
 * The risk that buys is a derived path that is not the file on disk, so what
 * is pinned here is the shape — every field, in the order the manifest used to
 * carry it, because `tests/build.test.mjs` compares the two objects field for
 * field and ~30 call sites in `src/` read them by name.
 *
 * The *widths* are pinned against the real pixels of the real derivatives in
 * `tests/build.test.mjs` ("the srcset widths the manifest declares..."), which
 * is the test that catches `CARD_MAX_PX` moving in make_thumbs.py and not
 * here. This file is the arithmetic; that one is the ground truth.
 */

test('the conventional icon hydrates to the eleven fields the manifest used to carry', () => {
  assert.deepEqual(hydrateImage('anthony-the-great', { w: 939, h: 625 }), {
    src: 'saints/anthony-the-great/images/icon.jpg',
    lqip: 'saints/anthony-the-great/images/icon-thumb.jpg',
    card: 'saints/anthony-the-great/images/icon-card.jpg',
    cardSm: 'saints/anthony-the-great/images/icon-card-sm.jpg',
    cardW: 560,
    cardSmW: 280,
    hero: 'saints/anthony-the-great/images/icon-hero.jpg',
    heroW: 939,
    w: 939,
    h: 625,
    aspect: 1.5024,
  });
});

test('the field order is the manifest’s own, so a deepEqual against the old shape holds', () => {
  assert.deepEqual(Object.keys(hydrateImage('x', { w: 4, h: 3 })), [
    'src',
    'lqip',
    'card',
    'cardSm',
    'cardW',
    'cardSmW',
    'hero',
    'heroW',
    'w',
    'h',
    'aspect',
  ]);
});

/*
 * `f` is the escape hatch for a folder that is not the other 320: a `.png`, a
 * second stem, or a picture somewhere other than `images/`. It holds the whole
 * relative path rather than a stem, so one field covers all three.
 */
test('a folder whose icon is not the conventional one names it, and the stems follow it', () => {
  const image = hydrateImage('odd-one', { w: 100, h: 200, f: 'images/portrait.png' });
  assert.equal(image.src, 'saints/odd-one/images/portrait.png');
  assert.equal(image.lqip, 'saints/odd-one/images/portrait-thumb.jpg');
  assert.equal(image.card, 'saints/odd-one/images/portrait-card.jpg');
  assert.equal(image.cardSm, 'saints/odd-one/images/portrait-card-sm.jpg');
  assert.equal(image.hero, 'saints/odd-one/images/portrait-hero.jpg');
});

test('the conventional path is the one every derivative helper is fed', () => {
  assert.equal(DEFAULT_FILE, 'images/icon.jpg');
  assert.equal(thumbFor(DEFAULT_FILE), 'images/icon-thumb.jpg');
  assert.equal(cardFor(DEFAULT_FILE), 'images/icon-card.jpg');
  assert.equal(cardSmFor(DEFAULT_FILE), 'images/icon-card-sm.jpg');
  assert.equal(heroFor(DEFAULT_FILE), 'images/icon-hero.jpg');
});

/*
 * **A portrait icon is the case worth stating.** The card caps are on the long
 * edge and a `srcset` descriptor is a width, so for anything taller than it is
 * wide the two are different numbers; the hero's cap is on the width, which is
 * the opposite mistake. Getting either backwards makes the browser fetch a
 * file that cannot fill the box it picked it for.
 */
test('the card widths are widths and the hero cap is on the width', () => {
  const tall = hydrateImage('tall', { w: 556, h: 1721 });
  assert.equal(tall.cardW, derivedWidth(556, 1721, CARD_MAX_PX));
  assert.equal(tall.cardW, 181);
  assert.equal(tall.cardSmW, 90);
  // 556 and not the cap: a 1721 px tall icon is well past `HERO_W_PX` on its
  // long edge and nowhere near it on the one the hero is capped on.
  assert.equal(tall.heroW, 556);

  const wide = hydrateImage('wide', { w: 2000, h: 500 });
  assert.equal(wide.cardW, CARD_MAX_PX);
  assert.equal(wide.cardSmW, CARD_SM_MAX_PX);
  assert.equal(wide.heroW, HERO_W_PX);
});

// Nothing is ever upscaled, so a picture smaller than every cap is its own
// derivative and all three descriptors are the original's width.
test('an icon smaller than the caps declares its own width three times', () => {
  const small = hydrateImage('small', { w: 8, h: 10 });
  assert.equal(small.cardW, 8);
  assert.equal(small.cardSmW, 8);
  assert.equal(small.heroW, 8);
});

test('aspect is the rounded ratio the grid reserves its boxes from', () => {
  assert.equal(hydrateImage('x', { w: 1094, h: 1738 }).aspect, 0.6295);
  assert.equal(hydrateImage('x', { w: 444, h: 560 }).aspect, 0.7929);
  assert.equal(hydrateImage('x', { w: 100, h: 100 }).aspect, 1);
});
