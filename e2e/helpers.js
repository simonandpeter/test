import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { applyFilters } from '../src/lib/index-filters.js';
import { monthsBySlugFor, SEARCH_FIELDS, SEARCH_OPTIONS, searchDoc } from '../src/views/index/search.js';
import { saintName } from '../src/lib/honorific.js';
import { readCorpus, feastIndex, onCivilDay, CHURCH_IDS } from '../scripts/corpus-index.mjs';
import { greatFeast } from '../src/lib/liturgy.js';
import { fixedFeastOn } from '../src/lib/fixed-feasts.js';
import { RECORDS_REACH, recordedDay } from '../src/data/liturgical-days.js';
import { chooseLanguage, ensureAllPacks } from '../src/lib/i18n.js';
import { nameDays } from '../src/lib/name-days.js';
import { pickHero } from '../src/lib/calendar-page.js';

/**
 * The fixtures every browser spec shares: the routes the suite keeps returning
 * to, and the small helpers that press the site's own controls.
 *
 * History and the decisions behind these:
 */

/**
 * **The corpus's own size, read from the build rather than typed** — never a
 * literal, which a new saint turns red without having found a defect.
 * The build's own meta file, so it is the number the page renders from.
 *
 */
const META = JSON.parse(readFileSync(new URL('../data/manifest.meta.json', import.meta.url), 'utf8'));

/** How many saints the corpus holds, as the page prints it. */
export const CORPUS = String(META.total);

/**
 * How many lives the All Saints date range matches, and how many it sets aside
 * as undated, counted by the page's own `applyFilters` over the manifest the
 * page is served. A literal here went red with every dated or undated saint a
 * batch added, without having found anything.
 */
export const countInRange = (from, to, rangeMode) =>
  String(applyFilters(CARDS, { from, to, rangeMode, sort: 'name' }).matched.length);
/**
 * How many lives the month facet matches, counted the way the page counts:
 * `monthsBySlugFor` resolves every feast to its **civil** month, Julian ones
 * included, and `applyFilters` reads that map. A literal here said 412 and the
 * corpus said 413 on the first CI run of the Greek wave, and the gate's own
 * arithmetic — any venerated feast whose recorded month is 1 — agreed with
 * neither, because it is a different question from the one the page asks.
 */
/**
 * Whom an order opens on, named as the index names them: the page's own
 * `applyFilters` over the same manifest, and `saintName` for the rank in front.
 * A typed name here was Sofian of Antim until the Romanian year reached
 * Elizabeth of Pasărea, whose repose is later; the claim the test carries is
 * that the two date orders are different questions, not who is at the end of
 * the corpus this week.
 */
export const leaderBySort = (sort) => saintName(applyFilters(CARDS, { sort }).matched[0]);

/**
 * The same, as a reader of `language` is shown it: `saintName` chooses among the
 * forms the folder records and falls back to the English where that language
 * has none, which is the corpus's own rule and not a defect. A typed Serbian
 * name here went red when Job the Long-Suffering took the head of the earliest
 * order — he has no Serbian form, so the page rightly prints his English.
 */
await ensureAllPacks();
/**
 * The name the **last** card in a sort carries, as the grid prints it — the
 * other end of `leaderBySort`. Who is last alphabetically is whoever the newest
 * batch left there: "Zoticus of Tomis" was last when that test was written and
 * four saints now sort after him, so the test passed on the ~20-card window
 * rather than on its premise. Throws rather than return nothing.
 */
export const lastBySort = (sort) => {
  const { matched } = applyFilters(CARDS, { sort });
  if (!matched.length) throw new Error(`no saint matches the ${sort} order`);
  return saintName(matched.at(-1));
};

export const leaderBySortIn = (sort, language) => {
  chooseLanguage(language);
  const said = saintName(applyFilters(CARDS, { sort }).matched[0]);
  chooseLanguage('en');
  return said;
};

/** The first `n` of an order, as a set: which cards belong at the top of the grid. */
export const leadersBySort = (sort, n) =>
  new Set(applyFilters(CARDS, { sort }).matched.slice(0, n).map((card) => saintName(card)));

let monthsBySlug = null;
export const countInMonth = (month) => {
  monthsBySlug ??= monthsBySlugFor(CARDS);
  return String(applyFilters(CARDS, { months: [month], sort: 'name' }, { monthsBySlug }).matched.length);
};

export const undatedCount = () => String(applyFilters(CARDS, { from: 1396, to: 1400, sort: 'name' }).undated.length);

/**
 * The widest run of years no dated life touches that has dated lives on both
 * sides of it, as `[from, to]` — a gap inside the corpus, not the empty years
 * past either end of it. Found through the page's own `applyFilters`, so it is
 * the page's idea of "touches". A typed window went red five times as dated
 * lives closed it, and on 2026-10-01 no year between 1 and 2002 was left.
 * Throws when no gap is left, because then the test has lost its premise.
 */
export const emptyRange = () => {
  const touched = (y) => applyFilters(CARDS, { from: y, to: y, sort: 'name' }).matched.length > 0;
  const last = new Date().getFullYear();
  let best = null;
  let start = null;
  let seenDated = false;
  for (let y = -3000; y <= last; y++) {
    if (!touched(y)) {
      if (seenDated && start === null) start = y;
      continue;
    }
    if (start !== null && (!best || y - 1 - start > best[1] - best[0])) best = [start, y - 1];
    start = null;
    seenDated = true;
  }
  /*
   * **No gap is left, and one past the corpus will not do either.** By
   * 2026-09-30 every year from the first dated life to this one is touched, and
   * eight lives are recorded as dying *after* a year — `death.latest` null — so
   * in the default overlapping mode they meet every window there is, however
   * far out. A window that matches nobody is therefore only reachable inside
   * the stricter mode, and the caller is told which it got.
   */
  if (best) return best;
  const past = last + 10;
  return Object.assign([past, past + 10], { needsWithin: true });
};

/**
 * How many saints carry `word` in their display name, a recorded name form or
 * a type slug — the three places the search box reaches that a batch fills.
 * Read, not re-implemented: the page's MiniSearch is prefix and fuzzy, so if it
 * ever finds a saint this does not, the count assertion fails and names the
 * two numbers, which is a finding about the search rather than the corpus.
 */
export const carryingWord = (word) => {
  const re = new RegExp(word, 'i');
  return String(
    CARDS.filter((s) => [s.display_name, ...Object.values(s.names ?? {}), ...(s.types ?? [])].some((t) => re.test(String(t)))).length,
  );
};

/**
 * A query that reaches **exactly one** saint, and the slug it reaches.
 *
 * Built over the same MiniSearch index `views/index/search.js` builds — its own
 * `SEARCH_FIELDS`, `SEARCH_OPTIONS` and `searchDoc`, imported rather than
 * restated — so what this promises is what the page does. A hand-rolled matcher
 * could not: the index is prefix and fuzzy over four fields, combined with AND.
 *
 * `fill('Anthony the Great')` was typed in `index-controls.spec.js` for exactly
 * this premise, and the Greek wave had already broken the same assumption in
 * the sibling file when Anthousa gained a folder. A saint's own printed name is
 * tried first, in slug order so the answer is stable between sittings.
 *
 * Throws rather than hand back a query two saints answer: a die with two places
 * to land is not a deterministic test.
 *
 * @returns `{ query, slug }`
 */
export const soleMatch = async () => {
  const { default: MiniSearch } = await import('minisearch');
  await ensureAllPacks();
  const index = new MiniSearch({ idField: 'slug', fields: SEARCH_FIELDS, searchOptions: SEARCH_OPTIONS });
  index.addAll(CARDS.map(searchDoc));
  for (const card of [...CARDS].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const query = String(card.display_name ?? '');
    if (!query) continue;
    const hits = index.search(query);
    if (hits.length === 1 && hits[0].id === card.slug) return { query, slug: card.slug };
  }
  throw new Error('no saint in the corpus has a printed name that reaches only itself');
};

/** How many each church venerates, as the Calendar facet narrows to. */
export const VENERATED = Object.fromEntries(
  Object.entries(META.by_church).map(([church, counts]) => [church, String(counts.venerated)]),
);

const MANIFEST = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const CARDS = Array.isArray(MANIFEST.saints) ? MANIFEST.saints : Object.values(MANIFEST.saints ?? MANIFEST);

/**
 * How many saints at least one of `churches` venerates — the *union*. Russian
 * ∪ Romanian is not Russian + Romanian, so this cannot be added up from
 * `VENERATED` and has to be counted.
 */
export const venerateUnion = (...churches) =>
  String(CARDS.filter((s) => (s.attestations ?? []).some((a) => a.status === 'venerated' && churches.includes(a.church))).length);

/**
 * The slugs whose card carries a `track`. A press on one of these flies the map
 * out to frame the whole rail, so a test that needs a press to *keep* the
 * reader's zoom has to pick a saint who is not here.
 */
export const TRACKED = new Set(CARDS.filter((s) => (s.track ?? []).length > 1).map((s) => s.slug));

/**
 * A saint the corpus has no Russian name for — the case where the English one
 * has to stand under a Russian honorific rather than a blank or an invention.
 * Read from the manifest rather than named, so filling a name in does not turn
 * a test red. A company is skipped because its heading is a list, not a name.
 */
export const NO_RU_NAME = CARDS.find(
  (s) => !(s.names ?? {}).ru && !/\band\b|,|&|\d/.test(s.display_name ?? ''),
);

/**
 * **The saints `church` keeps on the civil day `iso`**, as slugs, read from the
 * manifest so a batch added to that day moves the expectation with it.
 * Deliberately not `lib/feasts.js`: a test that asked the page's own
 * arithmetic who belongs on a day could not see that arithmetic go wrong.
 * Julian runs thirteen days behind the civil date from March 1900 to February
 * 2100, and outside that span this throws rather than answer wrongly; an
 * unknown reckoning throws for the same reason.
 */
export const keptOn = (church, iso) => {
  const civil = new Date(`${iso}T00:00:00Z`);
  if (!(iso >= '1900-03-01' && iso <= '2100-02-28')) throw new Error(`keptOn: ${iso} is outside 1900–2100`);
  const julian = new Date(civil.getTime() - 13 * 86_400_000);
  const on = { julian, 'revised-julian': civil, gregorian: civil };
  return CARDS.filter((s) =>
    (s.attestations ?? []).some(({ church: c, status, feast }) => {
      if (c !== church || status !== 'venerated' || !feast) return false;
      const day = on[feast.calendar];
      if (!day) throw new Error(`keptOn: ${s.slug} is kept by the unknown reckoning ${feast.calendar}`);
      return feast.month === day.getUTCMonth() + 1 && feast.day === day.getUTCDate();
    }),
  ).map((s) => s.slug);
};

/** The slugs whose card carries an icon. */
export const ICONED = new Set(CARDS.filter((s) => s.image).map((s) => s.slug));

/** The slugs whose card carries `historicity`, as the All Saints facet narrows to. */
export const withHistoricity = (historicity) => CARDS.filter((s) => s.historicity === historicity).map((s) => s.slug);

/**
 * **The saints whose map mark rests on exactly the coordinate `slug`'s does**,
 * `slug` included, read from the manifest (2026-09-16). A crowd at one spot is
 * where the next batch lands a martyr, so a map test that typed its members
 * or their number went red for a saint added rather than a defect found.
 * The resting place is death, then relics, then see, then birth, then the
 * first location, then the track's last stay — the order `views/map/paint.js`
 * gives, restated here rather than imported so the draw pass is not asked to
 * check itself. Throws for a saint with no place, whose crowd is no premise.
 */
export const sharingPlace = (slug) => {
  const rest = (s) => {
    const at = s.locations ?? [];
    const of = (kind) => at.find((l) => l.kind === kind);
    return of('death') ?? of('relics') ?? of('see') ?? of('birth') ?? at[0] ?? (s.track ?? []).at(-1);
  };
  const home = rest(CARDS.find((s) => s.slug === slug) ?? {});
  if (!home) throw new Error(`sharingPlace: ${slug} has no place on the map`);
  return CARDS.filter((s) => {
    const p = rest(s);
    return p && p.lat === home.lat && p.lon === home.lon;
  }).map((s) => s.slug);
};

/** How many lives carry an icon: the carousel's picture columns, before cloning. */
export const ICONS = CARDS.filter((s) => s.image).length;

/** The slugs recorded with a hymn in any church — who can lead a day. */
export const HYMNED = new Set(CARDS.filter((s) => (s.hymned ?? []).length > 0).map((s) => s.slug));

export // 30 January 2026: Anthony the Great in the Russian calendar — 17 January by
// the Julian reckoning, which the New Calendar churches keep on the civil 17th:
// one menologion date, two civil days, the most load-bearing date in the corpus.
const POPULATED = '/calendar/2026-01-30';

export /**
 * The suite's standing seed: All Saints in its search face, which is what most
 * specs were written about. Written **only when the test has not set one
 * itself**, so `carouselMode()` and any test that stamps `indexMode` directly
 * still gets the mode it asked for. The page's own default is a separate claim
 * with its own test, "All Saints opens on the carousel".
 *
 */
const searchMode = (page) =>
  page.addInitScript(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (typeof now.indexMode !== 'string') {
      localStorage.setItem(key, JSON.stringify({ ...now, indexMode: 'search' }));
    }
  });

export /** The opposite: a reader who is on the carousel, whatever they chose before. */
const carouselMode = (page) =>
  page.addInitScript(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, indexMode: 'carousel' }));
  });

export /**
 * A Daily page the machine is certainly not having today, read off its own
 * clock — trap 4. Any test that asserts the *Today* word navigates through this
 * rather than through a literal, which fails on exactly one day of the year.
 * Three days back is outside a timezone's worth of slop, and the calendar
 * renders any date.
 */
const aDayThatIsNotToday = (page) =>
  page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `/calendar/${iso}`;
  });

/**
 * **The days a Daily test needs, read off the corpus rather than typed.** The
 * same reason `CORPUS` is read from the build: a typed date goes red when a
 * batch fills it, without having found a defect. `2026-08-20` was empty in all
 * four calendars until the Greek wave gave it four commemorations, and every
 * day of the year is on its way to being filled, so the shapes below have to be
 * found and not remembered.
 *
 * The index is the site's own: `feastIndex` over the same folders the build
 * reads, so a day is counted here exactly as the page counts it.
 */
/**
 * The folders themselves, which carry what the manifest drops: an
 * `undocumented` attestation and its note. `data/manifest.json` keeps only the
 * venerated rows, so a test about a row that says "not kept here" cannot be
 * asked of it.
 */
const FOLDERS = readCorpus().map((entry) => ({ slug: entry.slug, ...entry.saint }));

/**
 * A saint `church` does not keep, whose row says so with the check that was
 * made, and whom exactly one other church does keep — so the page's reveal
 * reads "See the other churches (3)". Typed as `moses-the-hungarian` until the
 * Romanian year reached 26 July and gave him a Romanian feast.
 */
export const notKeptBy = (church) => {
  const found = FOLDERS.find((card) => {
    const row = (card.attestations ?? []).find((a) => a.church === church);
    return (
      row
      && row.status === 'undocumented'
      && /checked/i.test(row.note ?? '')
      && (card.attestations ?? []).filter((a) => a.status === 'venerated').length === 1
    );
  });
  if (!found) throw new Error(`every saint ${church} does not keep is kept by two churches or has no check note`);
  return found.slug;
};

/** A saint the corpus records no hymn for: no heading over nothing. */
export const WITHOUT_HYMNS = (() => {
  const found = FOLDERS.find((card) => !(card.hymns ?? []).length && (card.attestations ?? []).some((a) => a.status === 'venerated'));
  if (!found) throw new Error('every saint in the corpus has a hymn');
  return found.slug;
})();

const FEASTS = feastIndex(readCorpus());
const CIVIL_2026 = (() => {
  const out = [];
  for (const d = new Date('2026-01-01'); d.getFullYear() === 2026; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
})();
const kept = (church, iso) => onCivilDay(FEASTS, church, iso).map((s) => s.slug ?? s);
const HYMNED_ON = (church, iso) => kept(church, iso).filter((s) => HYMNED.has(s));

/**
 * A day of total silence — as against the silence of one calendar while another
 * speaks. `panel.js`'s `emptyDayNote` writes that sentence only when three
 * things are true at once: no church keeps a saint whose folder exists, the day
 * is no great feast in the chosen calendar, and no day record carries its
 * readings.
 *
 * **Only two of the three can be found any more.** This fixture used to search
 * for a day the corpus kept nobody on; the Greek wave took the last of them, so
 * every day of the year now has a folder in some calendar and the search threw.
 * The saints are therefore withheld by the test (`withoutSaintsOn`), exactly as
 * three other tests in `daily-panel.spec.js` already withhold them, and what is
 * chosen here is the pair the corpus cannot hand back: no great feast in any of
 * the four calendars, and a 2027 date, which is past the horizon the readings
 * are recorded to — past `RECORDS_REACH` itself, since the records now run a
 * fortnight into 2027.
 *
 * `EMPTY_ISO` is the day to withhold on; `EMPTY` is its route. Throws rather
 * than returning a date of the wrong shape: a test that has lost its premise
 * must not pass.
 */
export const EMPTY_ISO = (() => {
  const iso = CIVIL_2026.map((d) => `2027${d.slice(4)}`).find(
    (d) => d > RECORDS_REACH && CHURCH_IDS.every((c) => !greatFeast(d, c)),
  );
  if (!iso) throw new Error('no day past the records is free of a great feast in every calendar');
  return iso;
})();
export const EMPTY = `/calendar/${EMPTY_ISO}`;

/**
 * A civil day one church answers for alone, **made rather than found**:
 * `keeper` keeps a saint there whom no other calendar keeps that day, and the
 * caller withholds everything else the day holds — `withoutSaintsOn(page,
 * iso, { keep: slug })`. Every church but `keeper` is then silent on that day,
 * so changing the calendar in the header empties it rather than moving it, and
 * the one saint's name is the thing to look for before and after.
 *
 * **The search it replaces wanted a second church that kept nobody there, and
 * that is the half the reading waves delete.** It was typed as 28 June 2026
 * until 2026-10-01 and computed until 2026-10-03, by which time
 * `('russian', 'greek')` and `('russian', 'romanian')` already threw and only
 * `('romanian', 'russian')` still answered — a premise one Russian batch
 * would have taken. A withheld silence is a state no wave can reach.
 *
 * @param keeper the church whose single saint the day shows
 * @returns `{ route, iso, name, slug }` — `slug` the one saint the caller
 *   keeps, `name` as the hero prints it, through `saintName`, so a rank in
 *   front of it is the page's own
 */
export const dayOneChurchKeepsMade = (keeper) => {
  for (const iso of CIVIL_2026) {
    // A great feast in any calendar is not this silence: `emptyDayNote` writes
    // the feast's sentence instead, or the panel paints a feast hero. Every
    // church is checked rather than two, because the feast the panel prints is
    // read through the reader's own calendar setting and 6 August is the
    // Transfiguration on one reckoning and 19 August on the other.
    if (CHURCH_IDS.some((c) => greatFeast(iso, c))) continue;
    // Kept by `keeper` and by nobody else that day, so withholding the rest
    // leaves the other three calendars empty rather than showing him again.
    const slug = kept(keeper, iso).find(
      (s) => CHURCH_IDS.every((c) => c === keeper || !kept(c, iso).includes(s)),
    );
    if (!slug) continue;
    const card = FOLDERS.find((f) => f.slug === slug);
    return { route: `/calendar/${iso}`, iso, name: saintName(card), slug };
  }
  throw new Error(`no civil day of 2026 has a ${keeper} saint no other calendar keeps, free of a great feast everywhere`);
};

/**
 * A fixed great feast in `church`'s own calendar whose day the corpus has no
 * folder for.
 *
 * **Written as 15 August 2026 until 2026-10-01**, when `el-08-15` gave the
 * Greek Dormition its first folder and the note went away. The feast key comes
 * back with the route so the test can name the feast from `STRINGS` rather
 * than spell it twice.
 *
 * **`record` splits the two days this shape now makes** (2026-10-03). Eight of
 * the Great Feasts have a record of their own in `src/data/feasts-fixed.js`,
 * and on those days the feast *is* the day's subject: the panel paints a feast
 * hero and writes no note at all. The rest — the Meeting and the Exaltation
 * are the two of 2026 with no folders — still fall to `emptyDayNote`, whose
 * feast sentence is a note about the folders and not about the day. A caller
 * that does not say which it wants gets either, which is what every caller
 * before that commit meant.
 *
 * **`recorded` is the second split** (2026-10-03). The day records do not cover
 * the whole of 2026 — they begin partway through it — so the first great feast
 * without folders is months before the first recorded day, and a test that also
 * asserts the feast's own readings and hymns gets a day that has none. A caller
 * that needs those asks for `recorded: true`; one that does not says nothing
 * and gets either, which is what every caller before this meant.
 *
 * @param church the church whose calendar is read
 * @param record `true` for a day one of the eight covers, `false` for one it
 *   does not, omitted for either
 * @param recorded `true` to restrict to a day the records reach, omitted for any
 * @returns `{ route, iso, key, feast }`, `key` being `greatFeast`'s own and
 *   `feast` the fixed record where there is one
 */
export const feastWithoutFolders = (church, { record, recorded } = {}) => {
  const iso = CIVIL_2026.find(
    (d) => greatFeast(d, church)
      && kept(church, d).length === 0
      && (record === undefined || !!fixedFeastOn(d, church) === record)
      && (recorded === undefined || !!recordedDay(d, church) === recorded),
  );
  if (!iso) {
    throw new Error(
      `no great feast of 2026 in the ${church} calendar is without folders`
        + (record === undefined ? '' : ` and ${record ? 'with' : 'without'} a record of its own`)
        + (recorded === undefined ? '' : ` and ${recorded ? 'inside' : 'outside'} the day records`),
    );
  }
  return {
    route: `/calendar/${iso}`,
    iso,
    key: greatFeast(iso, church),
    feast: fixedFeastOn(iso, church),
  };
};

/**
 * The same silence, for a corpus too full to have one lying about: a day, and
 * **one** saint on it that `church` does not keep. Everything else kept that
 * day is the caller's to withhold (`withoutSaintsOn`'s `keep`), and then the
 * page counts one commemoration elsewhere and writes the singular sentence.
 *
 * A sibling fixture found such a day whole until the Greek year was finished;
 * the Greek keeps several saints on all 366 days now, so the count can only be
 * made, not found. **`church`'s own silence is made too** (2026-10-03): the
 * search used to want a day `church` kept nobody on, which the Russian and
 * Serbian waves take away as they fill all 366 days, so what is asked of the
 * day now is only that the one kept saint is not `church`'s — everything
 * else on it, `church`'s own included, is withheld. No great feast in any
 * calendar, for the same reason `EMPTY` excludes them: a feast writes its own
 * sentence instead.
 *
 * @param church the reader's church, which keeps nobody once the rest is withheld
 * @param spare a second day the caller withholds on, whose saints may not be
 *   the one kept here
 * @returns `{ route, iso, slug }` — `slug` the one commemoration to keep
 */
export const dayOneElsewhereMade = (church, spare) => {
  // A saint kept on `spare` too would survive the same withholding and leave
  // that day un-bare: Basil the Great is 1 January in three calendars and 14
  // January in the Russian, which is exactly how this was found.
  const alsoOn = new Set(spare ? CHURCH_IDS.flatMap((c) => kept(c, spare)) : []);
  for (const iso of CIVIL_2026) {
    if (CHURCH_IDS.some((c) => greatFeast(iso, c))) continue;
    const mine = new Set(kept(church, iso));
    const slug = CHURCH_IDS.flatMap((c) => kept(c, iso)).find((s) => !alsoOn.has(s) && !mine.has(s));
    if (slug) return { route: `/calendar/${iso}`, iso, slug };
  }
  throw new Error(`no civil day of 2026 has a saint ${church} does not keep and no great feast`);
};

/**
 * **Serves the page a manifest with every saint any church keeps on `iso`
 * withheld** (or on each of several — one route, since a second on the same
 * URL would shadow the first), and returns what it withheld and how often it
 * served. A silence is a state the corpus grows out of, one day per batch, so a
 * test of what a bare day says cannot wait for the corpus to leave one bare; it
 * makes the day bare instead, the same way whichever batches have landed on it
 * (2026-09-16). The day is read by `keptOn`, not by the page's feast index, and
 * in all four churches, because a folder the reader's church does not keep
 * still changes the note to "Nothing in the Russian calendar today".
 *
 * **It lives here rather than in `daily-panel.spec.js`** since 2026-10-03,
 * because `chrome.spec.js` needs it too: the fixtures that wanted a church to
 * keep nobody on a civil day are made with this now rather than found
 * (`dayOneChurchKeepsMade`, `dayOneElsewhereMade`).
 *
 * The service worker precaches the manifest and serves it on the next visit,
 * which `page.route` never sees (trap 13), so a test using this declares
 * `serviceWorkers: 'block'`, and `served()` is asserted so a route that
 * matched nothing fails shut.
 *
 * @param page the page to route
 * @param isos the civil days to empty, with an optional trailing `{ keep }`
 * @returns `{ withheld, served }` — the slugs withheld and a count reader
 */
export async function withoutSaintsOn(page, ...isos) {
  // A trailing `{ keep }` spares one slug, which is how a day is given exactly
  // one commemoration: see `dayOneElsewhereMade`.
  const keep = typeof isos.at(-1) === 'object' ? isos.pop().keep : null;
  const withheld = new Set(isos.flatMap((iso) => CHURCH_IDS.flatMap((c) => keptOn(c, iso))));
  if (keep) withheld.delete(keep);
  let served = 0;
  await page.route('**/data/manifest.json', async (route) => {
    const response = await route.fetch();
    const cards = await response.json();
    served += 1;
    await route.fulfill({ response, json: cards.filter((s) => !withheld.has(s.slug)) });
  });
  return { withheld, served: () => served };
}

/**
 * A day of a year past the readings' horizon where `church` keeps saints and
 * none of them carries a hymn: what the corpus not reaching a day looks like
 * now that the Romanian year is complete and the Greek wave is filling the
 * rest. The date is 2027 so the day's own readings are still past every
 * source's end.
 */
export const dayWithoutHymns = (church) => {
  const iso = CIVIL_2026.find((d) => kept(church, d).length > 0 && HYMNED_ON(church, d).length === 0);
  if (!iso) throw new Error(`every day ${church} keeps has a hymn on it`);
  return `/calendar/2027${iso.slice(4)}`;
};

/** The manifest card for a slug, which the fixtures below read the day off. */
const cardOf = (slug) => CARDS.find((s) => s.slug === slug);
const BY_SLUG = new Map(CARDS.map((s) => [s.slug, s]));

/**
 * A civil day of 2026 where `church` keeps **exactly one** saint and no
 * calendar has a great feast — the premise behind every "a first visit lands on
 * one name" test.
 *
 * Narrower than `dayOneChurchKeeps`, deliberately: that fixture also demands a
 * *second* church that keeps nobody, which is a constraint these tests do not
 * need and which the Russian and Serbian reading waves delete outright. A day
 * one church answers for alone survives those waves; a day another church is
 * silent on does not.
 *
 * @returns `{ route, iso, name }` — the name through `saintName`, so a rank in
 *   front of it is the page's own
 */
export const dayOneSaint = (church) => {
  const iso = CIVIL_2026.find(
    (d) => kept(church, d).length === 1 && CHURCH_IDS.every((c) => !greatFeast(d, c)),
  );
  if (!iso) throw new Error(`no civil day of 2026 has exactly one ${church} saint and no great feast in any calendar`);
  return { route: `/calendar/${iso}`, iso, name: saintName(cardOf(kept(church, iso)[0])) };
};

/**
 * The slugs resting on one coordinate that between `min` and `max` saints
 * share — `sharingPlace`'s search with nothing anchoring it.
 *
 * A map test that typed a crowd's anchor typed a corpus property twice over:
 * the saint, and how many stand with them. A batch of new martyrs lands on an
 * existing city, and the blob the test chose crosses `BLOB_MAX` for a saint
 * added rather than a defect found. Throws rather than return a crowd of the
 * wrong size.
 */
export const aCrowd = ({ min, max }) => {
  const seen = new Set();
  for (const card of CARDS) {
    if (seen.has(card.slug)) continue;
    let crowd;
    try {
      crowd = sharingPlace(card.slug);
    } catch {
      continue; // no place on the map, so no crowd
    }
    for (const s of crowd) seen.add(s);
    if (crowd.length >= min && crowd.length <= max) return crowd;
  }
  throw new Error(`no coordinate in the corpus is shared by between ${min} and ${max} saints`);
};

/**
 * A civil day of 2026 whose `church` register draws at least `pictured` cards
 * with an icon and at least `blank` without — **and whose hero carries one**,
 * so the hero's own row is a pictured one and every blank card is drawn in the
 * register rather than standing in the hero's place.
 *
 * `pickHero` is read rather than restated: the hero rule has a tie-break on the
 * icon, and a fixture that guessed it would choose a day whose blank cards are
 * one fewer than it counted.
 *
 * @returns the day's route
 */
export const dayOfMixedCards = (church, { pictured, blank }) => {
  const iso = CIVIL_2026.find((d) => {
    const slugs = kept(church, d);
    if (slugs.filter((s) => ICONED.has(s)).length < pictured) return false;
    if (slugs.filter((s) => !ICONED.has(s)).length < blank) return false;
    const hero = pickHero(d, slugs.map((slug) => ({ slug })), BY_SLUG, church);
    return hero && ICONED.has(hero);
  });
  if (!iso) {
    throw new Error(`no civil day of 2026 gives ${church} ${pictured} pictured and ${blank} blank cards under a pictured hero`);
  }
  return `/calendar/${iso}`;
};

/**
 * A civil day of 2026 whose `church` commemorations yield **exactly one** name
 * day, through `lib/name-days.js` — the page's own arithmetic, so a name form
 * added to a folder moves the fixture with it rather than against it.
 *
 * @returns `{ route, name }`
 */
export const dayOneNameDay = (church) => {
  for (const iso of CIVIL_2026) {
    const days = nameDays(kept(church, iso).map(cardOf).filter(Boolean));
    if (days.length === 1) return { route: `/calendar/${iso}`, name: days[0].name };
  }
  throw new Error(`no civil day of 2026 gives ${church} exactly one name day`);
};

/**
 * A civil day whose name days hold both shapes the register draws: a name two
 * or more of that day's saints carry, which the page spans, and a name exactly
 * one carries, which it anchors. Typed slugs could not hold this premise — one
 * more saint of the same name on the day turns the anchor into a span.
 *
 * @returns `{ route, shared, unique }`, `unique` being `{ name, slug }`
 */
export const dayWithSharedNameDay = (church) => {
  for (const iso of CIVIL_2026) {
    const cards = kept(church, iso).map(cardOf).filter(Boolean);
    const days = nameDays(cards);
    // `nameDays` says it in the slug: null where more than one of the day's
    // commemorations bears the name, which is exactly the span the page draws.
    const shared = days.find((d) => d.slug === null);
    const one = days.find((d) => d.slug !== null);
    if (shared && one) {
      return {
        route: `/calendar/${iso}`,
        shared: shared.name,
        unique: { name: one.name, slug: one.slug },
      };
    }
  }
  throw new Error(`no civil day of 2026 gives ${church} both a shared and a unique name day`);
};

/**
 * A civil day of 2026 whose `church` hero carries **no icon** — the page's
 * "a hero with no picture" state, which the ~300 queued icons can take away
 * from any named saint. `pickHero` is imported rather than restated: the hero
 * rule prefers the sung, then the imaged, and breaks the tie on an icon, so a
 * fixture that guessed it would hand back a day whose hero does have one.
 *
 * No fixed feast on the day, because a feast paints its own hero instead.
 *
 * @returns `{ route, iso, slug }`
 */
export const dayHeroWithoutIcon = (church) => {
  for (const iso of CIVIL_2026) {
    const slugs = kept(church, iso);
    if (!slugs.length || fixedFeastOn(iso, church)) continue;
    const hero = pickHero(iso, slugs.map((slug) => ({ slug })), BY_SLUG, church);
    if (hero && !ICONED.has(hero)) return { route: `/calendar/${iso}`, iso, slug: hero };
  }
  throw new Error(`every day ${church} keeps leads with a hero carrying an icon`);
};

/**
 * A name token fewer than `max` saints carry — the short search row, without
 * typing a name the corpus is free to give to somebody else. `carryingWord` is
 * the counter, so this and the assertion read the same number.
 */
export const narrowQuery = (max) => {
  const words = new Set();
  for (const card of CARDS) {
    for (const part of String(card.display_name ?? '').split(/[^A-Za-z]+/)) {
      if (part.length >= 5) words.add(part);
    }
  }
  for (const word of [...words].sort()) {
    const n = Number(carryingWord(word));
    if (n > 0 && n < max) return word;
  }
  throw new Error(`no name token in the corpus is carried by fewer than ${max} saints`);
};

export // Anthony carries an image, all three churches' attestations, Greek and Coptic
// name forms, related saints and a life; the sparse one below is the awkward
// end. Between them the detail page's states are covered rather than sampled.
const DETAIL = '/saints/anthony-the-great';

/**
 * **The sparse saint is found, not named.** This was `/saints/christopher`
 * until the image programme gave Christopher an icon, and then the test that
 * asks what a page with no picture looks like was asking it of a page with
 * one — two red projects on `e223292e`, and no defect behind them. The same
 * failure as every other typed fixture here: a literal states a fact about the
 * corpus that the corpus is free to change.
 *
 * So the premises are read off the manifest the page is served, and the first
 * card by slug that holds them is the fixture: no image, no coordinates, no
 * birth date, a dated death, and venerated somewhere. **"No life" is not among
 * them**: every one of the 5,231 folders carries one now, Christopher included,
 * so a fixture asking for a lifeless page would find nothing at all.
 *
 * The veneration premise is the **Russian** row rather than any row, because
 * the page draws one row per church in `CHURCH_IDS` order whether that church
 * records anything or not, so `.att` first is Russian's. A saint venerated only
 * in Romania opens its table with "Undocumented", which is a true row and the
 * wrong one to ask this question of.
 */
const sparse = CARDS.filter(
  (c) =>
    !c.image &&
    !c.primary_location &&
    !c.dates?.birth?.display &&
    c.dates?.death?.display &&
    (c.attestations ?? []).some((a) => a.church === 'russian' && a.status === 'venerated'),
).sort((a, b) => a.slug.localeCompare(b.slug))[0];
if (!sparse) throw new Error('no saint in the corpus is sparse enough to stand for one');

export const SPARSE_DETAIL = `/saints/${sparse.slug}`;

/** That saint's name as the page prints it, rank in front. */
export const SPARSE_NAME = saintName(sparse);

export /*
 * The third entry of each row is anything the route needs before the floor can
 * see it. All Saints is listed twice on purpose: the suite's default puts it in
 * search mode, so without the second row the carousel — a full-bleed row of
 * pictures, exactly the shape that overflows — is never measured by the floor.
 */
const ROUTES = [
  ['calendar, populated', POPULATED],
  ['calendar, empty day', EMPTY],
  ['saint detail', DETAIL],
  ['saint detail, sparse', SPARSE_DETAIL],
  ['all saints', '/saints'],
  ['all saints, carousel', '/saints', carouselMode],
  ['prayer', '/prayer'],
  ['map', '/map'],
  ['about', '/about'],
];

export const INDEX = '/saints';

/**
 * The width the day picker exists at. The rail, its drag and coast, the month
 * toggle and the grain fade are phone controls; a desktop has a static month
 * grid and no toggle, so a test *about the picker* has to say which width it
 * means. Not a workaround for a hidden element.
 *
 */
export const phone = (page) => page.setViewportSize({ width: 360, height: 780 });

/**
 * The complement. Below 1024 px `lib/church.js` reckons every day Gregorian
 * whatever church is chosen (author, 2026-09-12), so a test asserting what a
 * church's *own* calendar prints for a date must stand above that line — at
 * 360 px it is asserting the other calendar's answer and will read a fast,
 * a feast or a tone that belongs to a different day.
 */
export const desk = (page) => page.setViewportSize({ width: 1280, height: 900 });

export /** Facet groups are disclosures; a reader opens one before using it. */
const facet = async (page, name) => {
  const group = page.locator(`[data-facet="${name}"]`);
  if (await group.evaluate((el) => el.open)) return group;
  /*
   * **Dismiss whatever is open first** (2026-10-02). A facet's panel is a popup
   * over the page since the chips stopped pushing the register down, so an open
   * one covers the chips and the sort row beneath it and Playwright refuses the
   * click: "`<label class="facet-option">` intercepts pointer events". A reader
   * dismisses it by looking away, which is a click outside the block, and that
   * is what this does — the product path, not a flag set on the element.
   */
  await page.locator('.index-head h1, h1').first().click({ position: { x: 1, y: 1 } });
  await group.locator('summary').click();
  return group;
};

export /**
 * A touch swipe, as the listener sees it. Synthetic pointer events: what is
 * under test is the threshold and the direction, not the browser's promise to
 * deliver pointerdown before pointerup.
 */
const swipe = (page, selector, dx, dy = 0) =>
  page.evaluate(
    ([selector, dx, dy]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const at = (px, py, pointerType) => ({
        pointerId: 1, pointerType, clientX: px, clientY: py, bubbles: true, cancelable: true,
      });
      const kind = dx === 0 ? 'mouse' : 'touch';
      el.dispatchEvent(new PointerEvent('pointerdown', at(x, y, kind)));
      el.dispatchEvent(new PointerEvent('pointerup', at(x + dx, y + dy, kind)));
    },
    [selector, dx, dy],
  );

export /**
 * A hold-and-slide, as the listener sees it: pointerdown, a handful of moves,
 * and a release. Synthetic, for the same reason as `swipe`. The settle
 * threshold is a third of a grain, not a pixel count.
 */
const dragGrain = (page, selector, dx, { release = true } = {}) =>
  page.evaluate(
    ([selector, dx, release]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      const at = (px) => ({
        pointerId: 7, pointerType: 'touch', clientX: px, clientY: y, bubbles: true, cancelable: true,
      });
      el.dispatchEvent(new PointerEvent('pointerdown', at(x)));
      for (const step of [dx / 4, dx / 2, (dx * 3) / 4, dx]) {
        el.dispatchEvent(new PointerEvent('pointermove', at(x + step)));
      }
      if (release) el.dispatchEvent(new PointerEvent('pointerup', at(x + dx)));
    },
    [selector, dx, release],
  );

export const releaseGrain = (page, selector, dx) =>
  page.evaluate(
    ([selector, dx]) => {
      const el = document.querySelector(selector);
      const box = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 7,
          pointerType: 'touch',
          clientX: box.x + box.width / 2 + dx,
          clientY: box.y + box.height / 2,
          bubbles: true,
        }),
      );
    },
    [selector, dx],
  );

export /** The header's control, open. */
const openChooser = async (page) => {
  await page.locator('#church-open').click();
  await expect(page.locator('#church-panel')).toBeVisible();
};

export /**
 * A reader who has answered the first-visit question — church *and* language,
 * both, or the page still meets a gate. Written before load, because the
 * calendar decides whether to ask while it renders; seeded only where nothing
 * is stored, so a test that reloads to check something was remembered is not
 * overwritten on the way back in.
 *
 * **`reckoning` defaults to `'gregorian'` explicitly, not left unset**: the
 * suite's default church is Russian, whose own reckoning is Julian, and every
 * test written against the civil date would shift thirteen days. A test that
 * wants the true "nothing chosen" state asks for it: `{ reckoning: null }`.
 *
 */
const ready = (page, { church = 'russian', language = 'en', reckoning = 'gregorian' } = {}) =>
  page.addInitScript(
    ({ church, language, reckoning }) => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      const next = { ...now };
      if (typeof next.church !== 'string') next.church = church;
      if (typeof next.language !== 'string') next.language = language;
      if (next.reckoning === undefined) next.reckoning = reckoning;
      localStorage.setItem(key, JSON.stringify(next));
    },
    { church, language, reckoning },
  );

export /**
 * Sort, through the `.facet` chip that replaced the old `<select>`. One place,
 * so the next change to that control is one edit and not thirty.
 *
 */
const chooseSort = async (page, value) => {
  await facet(page, 'sort');
  await page.locator(`input[name="sort"][value="${value}"]`).check();
};

/**
 * A flick of the week rail, dispatched **inside the page** with its own timing.
 * The rail reads its release velocity from the samples of the last 120 ms and
 * coasts only past `MIN_FLICK`; driven through the harness's mouse each move is
 * a round trip, and under load the gesture stretches past that window and stops
 * being a flick at all. The moves are therefore spaced by a *spin* on
 * `performance.now()`, which blocks, rather than by `setTimeout`.
 *
 * The product path is untouched: pointerdown, four pointermoves, pointerup, and
 * the rail's own sampling decides. Returns the rail's position at release, plus
 * `delivered` — the caller asserts its own premise rather than inferring it.
 *
 */
export const throwRail = (
  strip,
  { moves = 4, step = 25, gap = 8, within = 60, tries = 8 } = {},
) =>
  strip.evaluate(
    (el, { moves: n, step: dx, gap: ms, within: limit, tries: attempts }) => {
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const from = rect.left + rect.width / 2;
      const fire = (type, x) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: type === 'pointerdown' ? 0 : -1,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: midY,
            bubbles: true,
            cancelable: true,
          }),
        );
      const spin = (wait) => {
        const until = performance.now() + wait;
        while (performance.now() < until);
      };
      /*
       * **A spin bounds the gap from below, not from above**, so on a preempted
       * machine the gesture can still stretch past the rail's sample window and
       * stop being a flick. It is therefore *measured and re-thrown* until it
       * is one; a fresh `pointerdown` cancels any coast a slow attempt started.
       * Re-derive the throttled numbers: scripts/throttle-probe.mjs
       */
      let span = Infinity;
      let used = 0;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const ts = [];
        fire('pointerdown', from);
        for (let i = 1; i <= n; i += 1) {
          spin(ms);
          ts.push(performance.now());
          fire('pointermove', from - i * dx);
        }
        fire('pointerup', from - n * dx);
        span = ts.at(-1) - ts[0];
        used = attempt;
        if (span <= limit) break;
      }
      return { released: el.scrollLeft, span, attempts: used, delivered: span <= limit };
    },
    { moves, step, gap, within, tries },
  );

/**
 * The Index narrowed to one calendar. **Narrowing is unticking**: every
 * calendar starts ticked, so ticking one is a no-op that hands back the whole
 * corpus.
 */
export const onlyCalendar = async (page, name) => {
  const group = await facet(page, 'churches');
  // Attached, not visible: at 360 the filter panel can be folded away, and the
  // state below is set on the elements rather than through the pointer.
  await group.locator('input[name="churches"]').first().waitFor({ state: 'attached' });
  /*
   * Dispatched rather than clicked: the facet drops open on a transition, and a
   * click on a checkbox that is still moving is refused as "not stable". The
   * click path is asserted by the tests that are *about* these controls; here
   * the state is a fixture, and a fixture should not be a timing question.
   */
  await group.evaluate((root, wanted) => {
    for (const box of root.querySelectorAll('input[name="churches"]')) {
      const label = box.closest('label')?.textContent?.trim();
      const on = label === wanted;
      if (box.checked !== on) {
        box.checked = on;
        box.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, name);
};

export const chooseView = async (page, value) => {
  const chip = page.locator('details[data-facet="layout"] > summary');
  if (!(await page.locator('details[data-facet="layout"]').evaluate((d) => d.open))) await chip.click();
  await page.locator(`input[name="layout"][value="${value}"]`).check();
};

export /** What the Sort chip is advertising, which is the grid's own order. */
const sortChip = (page) => page.locator('details[data-facet="sort"] > summary');

export const viewChip = (page) => page.locator('details[data-facet="layout"] > summary');

/**
 * Waits for a chooser panel to finish flying out of its control — until then
 * "where it is" and "what colour its text is" are not meaningful questions.
 * The flight leaves inline `opacity` and `transform` on the inner box and
 * clears them at the end, so the *absence* of an inline transform is the signal.
 */
export const panelSettled = (page, sel = '#church-panel') =>
  page.waitForFunction(
    (s) => {
      const inner = document.querySelector(`${s} .church-panel-inner`);
      return Boolean(inner) && !inner.style.transform && getComputedStyle(inner).opacity === '1';
    },
    sel,
    { timeout: 2000 },
  );

export const answered = (page) => ready(page);

export /** Every mounted card, in whichever layout, fits the box the grid gave it. */
const nothingCropped = async (page) =>
  page.locator('.index-card').evaluateAll((cards) =>
    cards
      .filter((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1)
      .map((c) => c.querySelector('.index-name')?.textContent),
  );

export /**
 * The leading names *as the reader sees them* — trap 1. The grid is virtualised
 * and absolutely positioned, so after a re-sort DOM order is not screen order
 * and `.first()` is the first card *mounted*. Order is read as geometry.
 */
const leaders = (page, n = 1) =>
  page.locator('.index-card').evaluateAll(
    (cards, count) =>
      cards
        .map((c) => ({ box: c.getBoundingClientRect(), name: c.querySelector('.index-name')?.textContent ?? '' }))
        .sort((a, b) => a.box.top - b.box.top || a.box.left - b.box.left)
        .slice(0, count)
        .map((x) => x.name)
        .join('|'),
    n,
  );

export /**
 * A colour token as the browser paints it, `rgb(r, g, b)`.
 *
 * **Not `getPropertyValue`** — trap 9, in both directions: an ordinary custom
 * property hands back the literal it was typed as, while a registered
 * `<color>` hands back the computed one, and a parser written for either is
 * silently wrong about the other. Painting it asks the question the reader's
 * eye asks and survives the next registration.
 *
 */
const tokenColours = (page, ...names) =>
  page.evaluate((tokens) => {
    const probe = document.createElement('span');
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    document.body.append(probe);
    const out = tokens.map((t) => {
      probe.style.color = `var(${t})`;
      return getComputedStyle(probe).color;
    });
    probe.remove();
    return out;
  }, names);

export /**
 * The state of a grain the moment its neighbour appears beside it. Sampled from
 * a MutationObserver rather than polled afterwards: a move is 260 ms and a poll
 * racing it would be a flake waiting to be blamed on the machine.
 */
const duringMove = (page, viewport, rowClass, act) =>
  page.evaluate(
    ([viewport, rowClass, act]) =>
      new Promise((resolve) => {
        const vp = document.querySelector(viewport);
        const observer = new MutationObserver(() => {
          const side = vp.querySelector(`.${rowClass}.grain-side`);
          if (!side) return;
          observer.disconnect();
          const live = vp.querySelector(`.${rowClass}:not(.grain-side)`);
          const peeks = (row) =>
            [...row.querySelectorAll('.peek .day-num, .peek-cell')].map((e) =>
              e.firstChild.textContent.trim(),
            );
          resolve({
            rows: vp.querySelectorAll(`.${rowClass}`).length,
            sides: [...vp.querySelectorAll('.grain-side')].map((s) => s.style.left),
            hidden: side.getAttribute('aria-hidden'),
            reachable: [...side.querySelectorAll('button')].filter((b) => b.tabIndex !== -1).length,
            reach: getComputedStyle(side).pointerEvents,
            clipped: vp.classList.contains('is-moving'),
            sidePeeks: peeks(side),
            livePeeks: peeks(live),
          });
        });
        observer.observe(vp, { childList: true, subtree: true, attributes: true });
        document.querySelector(act).click();
      }),
    [viewport, rowClass, act],
  );
