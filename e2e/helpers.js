import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { applyFilters } from '../src/lib/index-filters.js';
import { monthsBySlugFor } from '../src/views/index/search.js';
import { saintName } from '../src/lib/honorific.js';
import { readCorpus, feastIndex, onCivilDay, CHURCH_IDS } from '../scripts/corpus-index.mjs';
import { greatFeast } from '../src/lib/liturgy.js';
import { RECORDS_REACH } from '../src/data/liturgical-days.js';
import { chooseLanguage, ensureAllPacks } from '../src/lib/i18n.js';

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
 * A civil day one church answers for alone: `keeper` keeps exactly one saint
 * there, `empty` keeps none, and no third calendar keeps that same saint — so
 * changing the calendar in the header empties the day rather than moving it,
 * and the one saint's name is the thing to look for before and after.
 *
 * **Typed as 28 June 2026 until 2026-10-01**, where the Russian calendar kept
 * Augustine and the Greek nobody; the Greek wave reached that day and put
 * twelve folders on it, and three tests failed on a premise rather than on a
 * fault. Computed now, and it throws rather than returning a day of the wrong
 * shape, because a test that has lost its premise must not pass.
 *
 * @param keeper the church whose single saint the day shows
 * @param empty the church that keeps nobody there
 * @returns `{ route, iso, name }` — the name as the hero prints it, through
 *   `saintName`, so a rank in front of it is the page's own
 */
export const dayOneChurchKeeps = (keeper, empty) => {
  const iso = CIVIL_2026.find((d) => {
    const one = kept(keeper, d);
    if (one.length !== 1 || kept(empty, d).length !== 0) return false;
    // A great feast in `empty`'s own calendar is not the silence this finds:
    // `emptyDayNote` writes the feast's sentence instead, and the Greek 25
    // December began doing exactly that when the corpus reached it.
    if (greatFeast(d, keeper) || greatFeast(d, empty)) return false;
    return CHURCH_IDS.every((c) => c === keeper || !kept(c, d).includes(one[0]));
  });
  if (!iso) throw new Error(`no civil day of 2026 has one ${keeper} saint, none for ${empty}, no third keeper and no great feast in either`);
  const slug = kept(keeper, iso)[0];
  const card = FOLDERS.find((f) => f.slug === slug);
  return { route: `/calendar/${iso}`, iso, name: saintName(card) };
};

/**
 * A fixed great feast in `church`'s own calendar whose day the corpus has no
 * folder for — the shape `emptyDayNote` writes its feast sentence on, which is
 * a note about the folders and not about the day.
 *
 * **Written as 15 August 2026 until 2026-10-01**, when `el-08-15` gave the
 * Greek Dormition its first folder and the note went away. The feast key comes
 * back with the route so the test can name the feast from `STRINGS` rather
 * than spell it twice.
 *
 * @param church the church whose calendar is read
 * @returns `{ route, iso, key }`, `key` being `greatFeast`'s own
 */
export const feastWithoutFolders = (church) => {
  const iso = CIVIL_2026.find((d) => greatFeast(d, church) && kept(church, d).length === 0);
  if (!iso) throw new Error(`every great feast of 2026 in the ${church} calendar now has a folder`);
  return { route: `/calendar/${iso}`, iso, key: greatFeast(iso, church) };
};

/**
 * A civil day `church` keeps nobody on while **exactly one** commemoration
 * falls in another calendar — the singular of the empty-day prose, "One
 * commemoration falls today in another church's calendar". The count decides
 * which sentence the page writes, so the day has to hold one and not two.
 *
 * **And the day may not be a great feast in any calendar**, which the first
 * matching day became on 2026-10-01 as the Greek wave filled August: the panel
 * then opens "Today is The Transfiguration in the Russian calendar" and the
 * sentence under test is never written at all. Every church is checked rather
 * than the one named, because the feast the panel prints is read through the
 * reader's own calendar setting, which this cannot see: 6 August is the
 * Transfiguration on the new calendar and 19 August on the old, and a day that
 * is either is no use here.
 */
export const dayKeptOnlyElsewhere = (church) => {
  const iso = CIVIL_2026.find(
    (d) => kept(church, d).length === 0
      && CHURCH_IDS.every((c) => !greatFeast(d, c))
      && CHURCH_IDS.reduce((n, c) => n + kept(c, d).length, 0) === 1,
  );
  if (!iso) throw new Error(`no civil day of 2026 is empty for ${church} with exactly one elsewhere`);
  return `/calendar/${iso}`;
};

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

export // Anthony carries an image, all three churches' attestations, Greek and Coptic
// name forms, related saints and a life; Christopher is the awkward one —
// legendary, undated, no image, no coordinates. Between them the detail page's
// states are covered rather than sampled.
const DETAIL = '/saints/anthony-the-great';

export const SPARSE_DETAIL = '/saints/christopher';

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
  if (!(await group.evaluate((el) => el.open))) await group.locator('summary').click();
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
  const chip = page.locator('details[data-facet="sort"] > summary');
  if (!(await page.locator('details[data-facet="sort"]').evaluate((d) => d.open))) await chip.click();
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
