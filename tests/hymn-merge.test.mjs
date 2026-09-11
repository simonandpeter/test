import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeForReading } from '../src/ui/hymns.js';

/*
 * **One hymn sung in two calendars is one hymn** (author, 2026-09-12: "If
 * there is a troparion in Russian and Greek, they should be the same when
 * translated to English … No double ups. If they are completely different,
 * just cite this as a Greek source, and this as a Russian source").
 *
 * The collapse is a reading of the data and never a change to it, which is why
 * it is tested here on plain objects: the folder keeps every tradition's own
 * hymn with its own citation, because that is what a Greek or a Russian reader
 * is shown. `language` is a parameter rather than read from settings so this
 * can ask both questions in one process.
 */

const greek = {
  church: 'greek',
  kind: 'troparion',
  lang: 'el',
  tone: 'Ἦχος δ´',
  text: '[the Greek]',
  source: { text: 'saint.gr', url: 'https://example.invalid/el' },
  english: { text: 'O holy one, intercede for us.', source: { text: 'Orloff', url: 'https://example.invalid/orloff' } },
};
const russian = {
  church: 'russian',
  kind: 'troparion',
  lang: 'cu',
  tone: 'глас 4',
  text: '[the Slavonic]',
  source: { text: 'days.pravoslavie.ru', url: 'https://example.invalid/ru' },
  // The same hymn, so the same English — punctuated and spaced differently,
  // which is how the sources really differ from one another.
  english: { text: '  O holy  one,\nintercede for us. ', source: { text: 'Hapgood', url: 'https://example.invalid/hap' } },
};
const other = {
  church: 'romanian',
  kind: 'kontakion',
  lang: 'ro',
  tone: 'Glasul 8',
  text: '[the Romanian]',
  source: { text: 'doxologia.ro' },
  english: { text: 'A different hymn altogether.', rendered: 'site' },
};

test('the same hymn in two calendars is one reading, carrying both books', () => {
  const merged = mergeForReading([greek, russian], 'en');
  assert.equal(merged.length, 1, 'the English reading still prints it twice');
  assert.equal(merged[0].church, 'greek', 'the first tradition on the page leads');
  assert.deepEqual(
    merged[0].alsoIn.map((a) => a.church),
    ['russian'],
    'the second calendar is not recorded against the text it also sings',
  );
  // Its own book, not the Greek's: "cite this as a Greek source, and this as a
  // Russian source" is about the rendering each tradition published.
  assert.equal(merged[0].alsoIn[0].source.text, 'Hapgood');
});

test('two hymns that are not the same hymn stay two', () => {
  const merged = mergeForReading([greek, other], 'en');
  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((h) => h.church), ['greek', 'romanian']);
  assert.equal(merged[0].alsoIn.length, 0);
});

test('a reader who is not reading English is shown every tradition, untouched', () => {
  /*
   * The whole point of the data keeping them apart: in Greek and Slavonic
   * these are two different things to read, and both belong on the page. The
   * objects come back as they went in — not copies with an empty `alsoIn`,
   * which would be a quiet change to what the other four packs render.
   */
  const all = [greek, russian, other];
  for (const lang of ['ru', 'el', 'ro', 'sr']) {
    const read = mergeForReading(all, lang);
    assert.equal(read.length, 3, `${lang} lost a tradition's own hymn`);
    assert.equal(read[0], greek, `${lang} was handed a copy rather than the hymn`);
  }
});

test('a hymn with no English yet cannot collide with anything', () => {
  /*
   * 296 of the corpus's 344 hymns are in this state as this is written, so it
   * is the common case and not an edge: an empty key would make every one of
   * them the same hymn as every other.
   */
  const bare = (church) => ({ church, kind: 'troparion', lang: 'el', text: `[${church}]`, source: { text: 'x' } });
  const merged = mergeForReading([bare('greek'), bare('russian'), bare('serbian')], 'en');
  assert.equal(merged.length, 3);
  assert.deepEqual(merged.map((h) => h.church), ['greek', 'russian', 'serbian']);
});

test('an English hymn and an untranslated one are never folded together', () => {
  const bare = { church: 'serbian', kind: 'troparion', lang: 'sr', text: '[the Serbian]', source: { text: 'y' } };
  const merged = mergeForReading([greek, bare], 'en');
  assert.equal(merged.length, 2);
  assert.equal(merged[1].church, 'serbian');
});
