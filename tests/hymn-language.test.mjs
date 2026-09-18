import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { hymnMarkup } from '../src/ui/hymns.js';
import { chooseLanguage, currentLanguage } from '../src/lib/i18n.js';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';

/*
 * **An English reader is given English, wherever the hymn came from** (author,
 * 2026-08-26: "when you select English as the language, on any calendar, it
 * should be in English"; and again on 2026-09-17, having met Church Slavonic
 * and Greek on Saturday 13 September with English chosen).
 *
 * `ui/hymns.js` had always chosen correctly. What it had to choose from was the
 * gap: the corpus's 661 saint hymns all carried an `english`, because
 * `scripts/hymn-english.mjs` walks `saints/`, and the day records' feast hymns
 * — `data/liturgical-days.js`, the other half of what the Daily page prints —
 * had never been through that tool and carried one on 10 of 211.
 *
 * So the two halves are asserted together, which is the only shape of this test
 * that would have caught it: each on its own was true of one table and blind to
 * the other. `scripts/hymn-language-sweep.mjs` is the same question asked per
 * date, per calendar and per language.
 */

const dayHymns = [];
for (const [iso, day] of Object.entries(LITURGICAL_DAYS)) {
  for (const [church, record] of Object.entries(day)) {
    for (const hymn of record.hymns ?? []) dayHymns.push({ iso, church, hymn });
  }
}

const saintHymns = [];
for (const dir of fs.readdirSync('saints')) {
  const path = `saints/${dir}/saint.json`;
  if (!fs.existsSync(path)) continue;
  for (const hymn of JSON.parse(fs.readFileSync(path, 'utf8')).hymns ?? []) {
    saintHymns.push({ iso: dir, church: hymn.church, hymn });
  }
}

/*
 * What is under a hymn is either a source or an admission, never both and never
 * neither: `hymnMarkup` prints "Rendered for this site" for the first and
 * "Text from …" for the second, so an `english` carrying both would claim a
 * book it did not use, and one carrying neither would print an empty citation
 * — a gap where the reader should see which kind of claim this is.
 */
const wellFormed = (english, where) => {
  assert.ok(english?.text?.trim(), `${where}: an English rendering has text`);
  const own = english.rendered === 'site';
  assert.ok(own !== !!english.source, `${where}: an English is either this site's rendering or a book, not both and not neither`);
  if (!own) assert.ok(english.source.text?.trim(), `${where}: a cited English names its book`);
};

test("every hymn a day's record prints carries an English", () => {
  assert.ok(dayHymns.length > 200, 'the records still hold their hymns');
  for (const { iso, church, hymn } of dayHymns) {
    assert.ok(hymn.english, `${iso} ${church} (${hymn.kind}): an English reader meets ${hymn.lang}, not English`);
    wellFormed(hymn.english, `${iso} ${church}`);
    assert.notEqual(hymn.lang, 'en', `${iso} ${church}: the original's own tongue is recorded`);
  }
});

test("every hymn a saint's folder holds carries an English", () => {
  assert.ok(saintHymns.length > 600, 'the corpus still holds its hymns');
  for (const { iso, church, hymn } of saintHymns) {
    assert.ok(hymn.english, `${iso} (${church} ${hymn.kind}): an English reader meets ${hymn.lang}, not English`);
    wellFormed(hymn.english, iso);
  }
});

/*
 * And the reading, both ways round: the branch at `ui/hymns.js`'s head is what
 * turns the data above into what the page prints, and a test of the data alone
 * would pass with that branch deleted.
 */
const sample = {
  church: 'greek',
  kind: 'troparion',
  lang: 'el',
  tone: 'Ἦχος δ´',
  text: '[the Greek]',
  source: { text: 'saint.gr', url: 'https://example.invalid/el' },
  english: { text: 'The English rendering.', rendered: 'site' },
};
const cited = { ...sample, english: { text: 'A published rendering.', source: { text: 'Hapgood (1906)', url: 'https://example.invalid/h' } } };

test('an English reader is shown the English, and told which kind of claim it is', () => {
  chooseLanguage('en');
  assert.equal(currentLanguage(), 'en');

  const own = hymnMarkup(sample);
  assert.match(own, /lang="en"/);
  assert.match(own, /The English rendering\./);
  assert.doesNotMatch(own, /\[the Greek\]/, 'the original is not printed to a reader who chose English');
  assert.match(own, /Rendered for this site/, 'a site rendering says so under every one of them');
  assert.match(own, /data-rendered="site"/);

  const book = hymnMarkup(cited);
  assert.match(book, /A published rendering\./);
  assert.match(book, /Hapgood \(1906\)/, 'a rendering out of a book names the book instead');
  assert.doesNotMatch(book, /Rendered for this site/);
  assert.doesNotMatch(book, /data-rendered/);
});

test("a reader who chose another language is shown the source's own tongue, untouched", () => {
  chooseLanguage('el');
  try {
    const out = hymnMarkup(sample);
    assert.match(out, /lang="el"/, 'the tongue follows the text, so a screen reader is never handed English in a Greek voice');
    assert.match(out, /\[the Greek\]/);
    assert.doesNotMatch(out, /The English rendering\./);
    assert.match(out, /saint\.gr/, "and the source's own book is the citation");
  } finally {
    chooseLanguage('en');
  }
});
