import test from 'node:test';
import assert from 'node:assert/strict';

import { toneNumber } from '../src/lib/tone.js';

/*
 * Author, 2026-09-07: the hymns "say Glasul 3 (Romanian) instead of ἦχος or
 * whatever it's supposed to be." A hymn quotes its tone from the calendar it
 * was read out of, so the string arrives in that calendar's notation; the page
 * prints it in the reader's. Every case below is a spelling the corpus
 * actually holds — 419 tones, of which this reads 416.
 */

test('the three calendars write one number three ways', () => {
  assert.equal(toneNumber('глас 4'), 4, 'the Slavonic');
  assert.equal(toneNumber('Glasul 3'), 3, 'doxologia.ro');
  assert.equal(toneNumber('Glas 8'), 8, 'and its shorter form');
  assert.equal(toneNumber('Ἦχος γ´'), 3, 'saint.gr');
});

test('a plagal tone is numbered where the Slavonic numbers it', () => {
  /*
   * The Octoechos runs four authentic modes and their four plagals, and the
   * plagals are 5–8 in the reckoning the site counts in. `βαρύς` — the grave
   * tone — is named rather than numbered and is the seventh.
   */
  assert.equal(toneNumber('Ἦχος πλ. α´'), 5);
  assert.equal(toneNumber('Ἦχος πλ. β´'), 6);
  assert.equal(toneNumber('Ἦχος βαρύς'), 7);
  assert.equal(toneNumber('Ἦχος πλ. δ´'), 8);
});

test('the accents the sources actually use are all read', () => {
  // Monotonic and polytonic, the two apostrophes saint.gr mixes, and the one
  // page that leaves a space before its numeral sign.
  assert.equal(toneNumber('Ήχος β΄'), 2);
  assert.equal(toneNumber('Ἦχος δ ́'), 4);
  assert.equal(toneNumber('Ἦχος γ ́'), 3);
});

test('what cannot be read keeps its source’s own words', () => {
  /*
   * Three hymns in the corpus carry `Ἦχος πλ.` — a plagal whose numeral the
   * source itself does not print. Guessing which plagal would be inventing a
   * fact about a hymn; `ui/hymns.js` prints the original string instead.
   */
  assert.equal(toneNumber('Ἦχος πλ.'), null);
  assert.equal(toneNumber('глас 9'), null, 'there is no ninth tone');
  assert.equal(toneNumber(''), null);
  assert.equal(toneNumber(null), null);
  assert.equal(toneNumber(undefined), null);
});

test('the tone word is not mistaken for its own numeral', () => {
  /*
   * `ἦχος` is four Greek letters and three of them are numerals — η is 8, χ
   * is not a numeral but ο and ς sit beside ones that are. Cutting the word
   * out before looking is what keeps `Ἦχος α´` from reading as 8.
   */
  assert.equal(toneNumber('Ἦχος α´'), 1);
  assert.equal(toneNumber('Ήχος α'), 1);
});
