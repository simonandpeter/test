import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXED_FEASTS, FIXED_FEASTS_BY_ID } from '../src/data/feasts-fixed.js';
import { CHURCHES, CHURCHES_BY_ID } from '../src/data/churches.js';
import { dayHero, fixedFeastOn } from '../src/lib/fixed-feasts.js';
import { buildFeastIndex } from '../src/lib/feasts.js';
import { licenceIsSettled, requiresAttribution } from '../src/lib/licence.js';
import { LANGUAGES } from '../src/lib/i18n.js';
import { readCorpus } from '../scripts/corpus-index.mjs';

/**
 * The eight feasts the corpus cannot hold.
 *
 * `src/data/feasts-fixed.js` argues why they exist outside `saints/`. What is
 * pinned here is the part a reading cannot check: that each record's
 * `observance` lands on the civil day the church actually keeps the feast on,
 * that a feast outranks the day's saints, that nothing here is counted as a
 * saint, and that no icon ships whose licence is not settled.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* **The folders, never `data/manifest.json`** — `/data/` is gitignored, so on
   CI the manifest does not exist when `npm test` runs and reading it is an
   ENOENT at import time rather than a failed assertion (CLAUDE.md, the corpus
   section). `readCorpus` is the same source `e2e/helpers.js` reads. */
const saints = readCorpus().map((record) => ({ slug: record.slug, ...record.saint }));
const bySlug = new Map(saints.map((s) => [s.slug, s]));
const enabled = CHURCHES.filter((c) => c.enabled !== false).map((c) => c.id);

test('every record has the shape the Daily hero reads', () => {
  assert.equal(FIXED_FEASTS.length, 8);
  const langs = LANGUAGES.map((l) => l.id);
  for (const feast of FIXED_FEASTS) {
    assert.match(feast.id, /^[a-z0-9-]+$/, `${feast.id}: id is a slug-shaped string`);
    assert.deepEqual(Object.keys(feast.title).sort(), [...langs].sort(), `${feast.id}: five titles`);
    for (const [lang, title] of Object.entries(feast.title)) {
      assert.ok(title.trim().length > 2, `${feast.id}: ${lang} title is words`);
    }
    // Prose, not a label: the hero prints this instead of a life.
    assert.ok(feast.lede.length > 120, `${feast.id}: the lede is sentences`);
    // The closing quote is part of the stop: one lede ends a sentence on a
    // quotation of the Gospel.
    assert.ok(/[.!?]["”]?\s+\S/.test(feast.lede), `${feast.id}: the lede is more than one sentence`);
    assert.equal(FIXED_FEASTS_BY_ID.get(feast.id), feast);
  }
});

test('observance is recorded per church in that church’s own calendar', () => {
  for (const feast of FIXED_FEASTS) {
    assert.deepEqual(
      feast.observance.map((o) => o.church).sort(),
      [...enabled].sort(),
      `${feast.id}: one observance per enabled church`,
    );
    for (const { church, feast: when } of feast.observance) {
      // The corpus's own convention, and the whole reason nothing is
      // pre-converted: the record states the menologion date, and the
      // reckoning is the church's.
      assert.equal(
        when.calendar,
        CHURCHES_BY_ID[church].default_calendar,
        `${feast.id}/${church}: the church's own reckoning`,
      );
      assert.ok(when.day >= 1 && when.day <= 31, `${feast.id}/${church}: a real day`);
      assert.ok(when.month >= 1 && when.month <= 12, `${feast.id}/${church}: a real month`);
    }
    // All four keep the same menologion date; only the reckoning differs.
    assert.equal(new Set(feast.observance.map((o) => `${o.feast.day}/${o.feast.month}`)).size, 1);
  }
});

/**
 * The eight civil days, church by church, for 2026.
 *
 * Written out rather than derived, because a table that computes the answer
 * the same way the code does cannot catch the code being wrong. The New
 * Calendar churches keep the menologion date as the civil date; the Old
 * Calendar ones are thirteen days behind it until 2100.
 */
const DAYS_2026 = {
  theophany: { greek: '2026-01-06', romanian: '2026-01-06', russian: '2026-01-19', serbian: '2026-01-19' },
  annunciation: { greek: '2026-03-25', romanian: '2026-03-25', russian: '2026-04-07', serbian: '2026-04-07' },
  transfiguration: { greek: '2026-08-06', romanian: '2026-08-06', russian: '2026-08-19', serbian: '2026-08-19' },
  'dormition-of-the-theotokos': {
    greek: '2026-08-15',
    romanian: '2026-08-15',
    russian: '2026-08-28',
    serbian: '2026-08-28',
  },
  'nativity-of-the-theotokos': {
    greek: '2026-09-08',
    romanian: '2026-09-08',
    russian: '2026-09-21',
    serbian: '2026-09-21',
  },
  'synaxis-of-the-archangels': {
    greek: '2026-11-08',
    romanian: '2026-11-08',
    russian: '2026-11-21',
    serbian: '2026-11-21',
  },
  'entry-of-the-theotokos': {
    greek: '2026-11-21',
    romanian: '2026-11-21',
    russian: '2026-12-04',
    serbian: '2026-12-04',
  },
  'nativity-of-christ': {
    greek: '2026-12-25',
    romanian: '2026-12-25',
    russian: '2026-01-07',
    serbian: '2026-01-07',
  },
};

test('each feast resolves onto the civil day its church keeps it', () => {
  for (const [id, byChurch] of Object.entries(DAYS_2026)) {
    for (const [church, iso] of Object.entries(byChurch)) {
      assert.equal(fixedFeastOn(iso, church)?.id, id, `${id} in the ${church} calendar`);
    }
  }
  // Every id in the table is a record and every record is in the table.
  assert.deepEqual(Object.keys(DAYS_2026).sort(), FIXED_FEASTS.map((f) => f.id).sort());
});

test('a day with no fixed feast has none, and the two excluded days are untouched', () => {
  for (const church of enabled) {
    assert.equal(fixedFeastOn('2026-08-20', church), null, `${church}: an ordinary day`);
    /*
     * 16 November is Matthew the Apostle, whose folder records a deliberate
     * "one feast to a church" decision; 29 February is a day neither calendar
     * prints. Both were named as out of scope, and a feast quietly landing on
     * either is the way that would be undone.
     */
    assert.equal(fixedFeastOn('2026-11-16', church), null, `${church}: 16 November`);
    assert.equal(fixedFeastOn('2028-02-29', church), null, `${church}: the leap day`);
  }
});

test('a feast leads the day over any saint of it, and leaves other days to pickHero', () => {
  const entries = [{ slug: 'with-image', church: 'greek' }, { slug: 'no-image', church: 'greek' }];
  const cards = new Map([
    ['with-image', { image: { src: 'x' } }],
    ['no-image', { image: null }],
  ]);

  // 6 January in the Greek calendar is Theophany *and* has saints of its own.
  const feastDay = dayHero('2026-01-06', entries, cards, 'greek');
  assert.equal(feastDay.kind, 'feast');
  assert.equal(feastDay.feast.id, 'theophany');
  assert.equal(feastDay.slug, null, 'a feast has no slug, because it has no page');

  const plainDay = dayHero('2026-08-20', entries, cards, 'greek');
  assert.equal(plainDay.kind, 'saint');
  assert.ok(cards.has(plainDay.slug));

  assert.equal(dayHero('2026-08-20', [], cards, 'greek'), null, 'no saints and no feast is no hero');
});

test('no fixed-feast day is left without a hero in any church', () => {
  /*
   * The failure this closes: eight civil days were blank in one or more
   * churches because the day's subject was not a person. 2026 is the year the
   * rest of the suite reckons in.
   */
  const index = buildFeastIndex(saints, 2026, CHURCHES_BY_ID);
  const blank = [];
  for (const [id, byChurch] of Object.entries(DAYS_2026)) {
    for (const [church, iso] of Object.entries(byChurch)) {
      const entries = (index.get(iso) ?? []).filter((e) => e.church === church);
      if (!dayHero(iso, entries, bySlug, church)) blank.push(`${iso} ${church} ${id}`);
    }
  }
  assert.deepEqual(blank, []);
});

test('nothing here is a saint, is counted as one, or can be linked like one', () => {
  for (const feast of FIXED_FEASTS) {
    assert.equal(bySlug.has(feast.id), false, `${feast.id}: not a corpus slug`);
    // The register and every count on the site read the manifest, which is
    // built from these folders; a record that reached one of them would be
    // counted as a saint by all of them.
    assert.equal(
      saints.some((s) => s.slug === feast.id || s.display_name === feast.title.en),
      false,
      `${feast.id}: absent from the corpus`,
    );
    assert.equal('slug' in feast, false, `${feast.id}: carries no slug to route on`);
  }
});

test('an icon ships only with a licence Commons stated and we can repeat', () => {
  for (const feast of FIXED_FEASTS) {
    // A feast with no licence-clean icon ships with the title and the lede,
    // which is an acceptable outcome; an unchecked licence is not.
    if (!feast.image) continue;
    const file = path.join(ROOT, 'public', feast.image.file);
    const metaPath = path.join(ROOT, 'public', feast.image.meta);
    assert.ok(existsSync(file), `${feast.id}: ${feast.image.file} is on disk`);
    assert.ok(existsSync(metaPath), `${feast.id}: ${feast.image.meta} is beside it`);
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    assert.ok(licenceIsSettled(meta.licence), `${feast.id}: licence ${meta.licence}`);
    if (requiresAttribution(meta.licence)) {
      assert.ok(meta.credit, `${feast.id}: ${meta.licence} obliges a credit and none is recorded`);
    }
    assert.match(meta.source_url, /^https:\/\/commons\.wikimedia\.org\//, `${feast.id}: source`);
    // The note carries the evidence that the picture is this feast, which is
    // the one thing a later reader cannot reconstruct.
    assert.ok(meta.note.includes('Identified as this feast because:'), `${feast.id}: evidence`);
    assert.ok(feast.image.file.startsWith(`feasts/${feast.id}/`), `${feast.id}: own folder`);
  }
});
