import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { hymnMarkup, mergeForReading } from '../src/ui/hymns.js';
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
 * neither: `hymnMarkup` prints "Translated for this site" for the first and
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
  assert.match(own, /Translated for this site/, 'a site rendering says so under every one of them');
  assert.match(own, /data-rendered="site"/);
  /*
   * **And it names the text it was made from** (author, 2026-09-24: the
   * rendering "doesnt list the original thing it was translated from"). The
   * footer used to print four words and no citation at all, on the argument
   * that the original was one press of the language control away — a reason a
   * reader can act on, not a claim they can check.
   */
  assert.match(own, /saint\.gr/, 'a rendering made here cites the original it was made from');
  assert.match(own, /https:\/\/example\.invalid\/el/, 'and links it, so the reading can be checked against it');

  const book = hymnMarkup(cited);
  assert.match(book, /A published rendering\./);
  assert.match(book, /Hapgood \(1906\)/, 'a rendering out of a book names the book instead');
  assert.doesNotMatch(book, /Translated for this site/);
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

/*
 * **And the heading is a place a hymn can show in another tongue too** (author,
 * 2026-09-24: "there are still errors where some hymns show in other languages
 * when English is chosen"). Every test above this one asked whether the hymn's
 * *text* had an English and whether `hymnMarkup` chose it, and all of them
 * passed while a third of the corpus printed `Troparion · Tone 4 · Ταχὺ
 * προκατάλαβε. · Greek` over an English troparion: the `model` — the automelon,
 * named by quoting its opening words — is the source's own string and went into
 * the heading untouched. 263 of 872 hymns carry one, and three more carry a
 * `tone` the eight-tone reader cannot resolve and fell back to the Greek.
 *
 * So this asserts what a reader sees rather than what the data holds, over the
 * whole corpus: with English chosen, nothing `hymnMarkup` prints in the heading
 * or the body is written in a script English does not use. It is the same
 * question the sweep asks per date, asked of the rendered markup instead.
 */
const OTHER_SCRIPT = /[Ѐ-ԯͰ-Ͽἀ-῿]/;
/*
 * **The heading is held to the stricter rule, and the body cannot be.** A
 * Romanian incipit — `Pe cea întru rugăciuni...` — is Latin script, so a test
 * that only refused Greek and Cyrillic would pass over 53 of the 263 models.
 * An English *rendering* legitimately carries the same diacritics in a proper
 * name, though: Neamţ, Măgura. The heading holds only the kind, the tone, the
 * melody and the church names and can never need one, so the two lines are
 * read against two rules rather than one loose one.
 */
const DIACRITIC = /[ăâîșşțţĂÂÎȘŞȚŢčćđžšČĆĐŽŠ]/;

const lines = (markup, re) => [...markup.matchAll(re)].map((m) => m[1]);
const heading = (markup) => lines(markup, /<h3 class="hymn-kind[^"]*">([^<]*)<\/h3>/g);
const body = (markup) => lines(markup, /<p class="hymn-text[^"]*"[^>]*>([^<]*)<\/p>/g);

test('with English chosen, no part of a hymn a reader reads is in another tongue', () => {
  chooseLanguage('en');
  const offenders = [];
  for (const { iso, church, hymn } of [...dayHymns, ...saintHymns]) {
    const markup = hymnMarkup(hymn, { withChurch: true });
    const where = `${iso} ${church} ${hymn.kind}`;
    for (const line of heading(markup)) {
      if (OTHER_SCRIPT.test(line) || DIACRITIC.test(line)) offenders.push(`head ${where}: ${line}`);
    }
    for (const line of body(markup)) {
      if (OTHER_SCRIPT.test(line)) offenders.push(`text ${where}: ${line.slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders.slice(0, 12), [], `${offenders.length} hymns print another tongue to a reader who chose English`);
});

/*
 * The other half, and the one that says the removal is a rule and not a blanket
 * strip: a reader in the hymn's own tongue is shown the melody, because there
 * the incipit is a line of the very text beside it.
 */
/*
 * **Every hymn on the page names a text, and no hymn names none.** The footer
 * is the one line that says what kind of claim the text above it is, so a site
 * rendering with nothing under "Translated for this site from" would be worse
 * than the four bare words it replaced. Asserted over the whole corpus rather
 * than a sample, because the citation it prints for a rendering comes from the
 * *original* and the one for a published English from the book, and only one
 * of those two branches is exercised by any single hymn.
 */
test('every hymn an English reader reads names the text it came from', () => {
  chooseLanguage('en');
  const bare = [];
  for (const { iso, church, hymn } of [...dayHymns, ...saintHymns]) {
    const foot = /<p class="hymn-source[^"]*">([\s\S]*?)<\/p>/.exec(hymnMarkup(hymn))?.[1] ?? '';
    const named = foot.replace(/<[^>]*>/g, '').replace(/Translated for this site from|Text from/, '').trim();
    if (!named) bare.push(`${iso} ${church} ${hymn.kind}: ${foot}`);
  }
  assert.deepEqual(bare.slice(0, 12), [], `${bare.length} hymns print a footer naming no text at all`);
});

/*
 * And the merge's half of it: a rendering made here out of two traditions'
 * texts cites both originals, not the books that published an English neither
 * of them has. `mergeForReading` keeps `original` beside `source` for exactly
 * this, so the footer can ask for whichever its own branch needs.
 */
test('a merged site rendering cites every original it was made from', () => {
  chooseLanguage('en');
  const one = { ...sample, church: 'greek', source: { text: 'saint.gr', url: 'https://example.invalid/el' } };
  const two = { ...sample, church: 'russian', lang: 'cu', source: { text: 'pravoslavie.ru', url: 'https://example.invalid/cu' } };
  const [merged] = mergeForReading([one, two], 'en');
  const out = hymnMarkup(merged, { withChurch: true });
  assert.match(out, /Translated for this site from/);
  assert.match(out, /saint\.gr/, "the Greek original it was made from");
  assert.match(out, /pravoslavie\.ru/, 'and the Slavonic one beside it');
  assert.match(out, /Greek · Russian/, 'over one text, named for both calendars');
});

const withModel = { ...sample, tone: 'Ἦχος πλ.', model: 'Ταχὺ προκατάλαβε.' };

test('the melody is named beside the original and absent beside a rendering', () => {
  chooseLanguage('el');
  try {
    const out = hymnMarkup(withModel);
    assert.match(out, /Ταχὺ προκατάλαβε\./, 'the original carries its own melody');
    assert.match(out, /Ἦχος πλ\./, "and a tone the eight-tone reader cannot resolve keeps the source's own words");
  } finally {
    chooseLanguage('en');
  }

  const en = hymnMarkup(withModel);
  assert.doesNotMatch(en, /Ταχὺ προκατάλαβε\./, 'an English reader is not given the incipit in Greek');
  assert.doesNotMatch(en, /[Mm]elody/, 'and the slot is empty rather than carrying a notice');
  assert.doesNotMatch(en, /Ἦχος πλ\./, 'nor the unresolvable tone in Greek');
  assert.doesNotMatch(en, /Tone \d/, 'and no tone is invented in its place');
});
