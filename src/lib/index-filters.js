/**
 * The Index mode's filter set (brief §8.2), as pure functions over manifest
 * cards. No DOM, no search index, no rendering — the view owns those, and this
 * owns the semantics, which are the part that can be quietly wrong.
 *
 * Two of those semantics are load-bearing:
 *
 * **The range toggle is not a convenience.** *Overlaps* asks whether a life
 * touched a period; *Entirely within* asks whether it was contained by one.
 * They are genuinely different questions, both are wanted, and neither is a
 * default that can stand for the other — so the toggle is visible and defaults
 * to Overlaps. `dates.js` already implements and tests both; this only chooses.
 *
 * **Undated is not filtered out, it is set aside.** A saint with no bound at
 * either end fails every date range, so a range filter would silently delete
 * them from the corpus. They go to a tray instead, counted, exactly as the
 * unlocated tray works on the map (Addendum F).
 */

import { isUndated, makeInterval, overlaps, within } from './dates.js';

export const RANGE_MODES = ['overlaps', 'within'];

export const EMPTY_FILTERS = {
  query: '',
  churches: [],
  months: [],
  types: [],
  sexes: [],
  regions: [],
  historicities: [],
  from: null,
  to: null,
  rangeMode: 'overlaps',
  // Earliest is the default (author, 2026-08-24). Alphabetical order was the
  // default from Session 5; it files the corpus by the accident of a name's
  // first letter, where the earliest-first order opens on Moses and Joshua and
  // reads down through the centuries, which is the shape the corpus has.
  sort: 'earliest',
  // Set when `sort` is 'random', null otherwise: the order has to survive a
  // re-render, and the Index is virtualised, so it cannot be a shuffled array.
  shuffleSeed: null,
};

export const hasActiveFilters = (f) =>
  f.query.trim() !== '' ||
  f.churches.length > 0 ||
  f.months.length > 0 ||
  f.types.length > 0 ||
  f.sexes.length > 0 ||
  f.regions.length > 0 ||
  f.historicities.length > 0 ||
  f.from !== null ||
  f.to !== null;

/**
 * The span of a life, for range filtering: from the earliest bound of the
 * first interval we have anything for, to the latest bound of the last.
 *
 * The fallback walks whole intervals rather than individual bounds, because a
 * bound that is null inside a dated interval is an *open* bound and must stay
 * open. "Born before 1000, died 1043" spans an unknown start to 1043; taking
 * the first non-null number instead would read it as "lived 1043 to 1043",
 * turning an honest gap into a false precision.
 */
export function lifeInterval(dates) {
  const dated = (order) => {
    for (const key of order) {
      const iv = makeInterval(dates?.[key]);
      if (!isUndated(iv)) return iv;
    }
    return null;
  };
  const start = dated(['birth', 'floruit', 'death']);
  const end = dated(['death', 'floruit', 'birth']);
  return { earliest: start?.earliest ?? null, latest: end?.latest ?? null };
}

const veneratedChurches = (card) =>
  card.attestations.filter((a) => a.status === 'venerated').map((a) => a.church);

/**
 * Everything except the date range and the text query, which the caller layers
 * on: the range because the undated tray needs to know who *would* have
 * matched without it, and the query because it comes from a search index the
 * view builds once rather than from the card.
 */
function matchesFacets(card, f) {
  if (f.churches.length && !veneratedChurches(card).some((id) => f.churches.includes(id))) return false;
  if (f.types.length && !(card.types ?? []).some((t) => f.types.includes(t))) return false;
  if (f.sexes.length && !f.sexes.includes(card.sex)) return false;
  if (f.historicities.length && !f.historicities.includes(card.historicity)) return false;
  if (f.regions.length) {
    const regions = (card.locations ?? []).map((l) => l.region).filter(Boolean);
    if (!regions.some((r) => f.regions.includes(r))) return false;
  }
  return true;
}

const inRange = (card, f) => {
  if (f.from === null && f.to === null) return true;
  const iv = lifeInterval(card.dates);
  const from = f.from ?? -Infinity;
  const to = f.to ?? Infinity;
  return f.rangeMode === 'within' ? within(iv, from, to) : overlaps(iv, from, to);
};

/**
 * `months` are Gregorian months in which the saint has a feast this year,
 * supplied by the caller from the feast index the calendar already builds —
 * resolving a Julian or Coptic feast to a Gregorian month is calendar work,
 * not filter work, and there is exactly one place in this codebase that does
 * it.
 */
export function applyFilters(cards, filters, { monthsBySlug, matchesQuery } = {}) {
  const f = { ...EMPTY_FILTERS, ...filters };
  const query = f.query.trim();

  const facetMatched = cards.filter((card) => {
    if (!matchesFacets(card, f)) return false;
    if (f.months.length) {
      const months = monthsBySlug?.get(card.slug) ?? new Set();
      if (!f.months.some((m) => months.has(m))) return false;
    }
    if (query && matchesQuery && !matchesQuery(card.slug)) return false;
    return true;
  });

  const dateFiltered = f.from === null && f.to === null;
  const matched = dateFiltered ? facetMatched : facetMatched.filter((card) => inRange(card, f));

  // Only saints excluded *by the range alone* belong in the tray: someone
  // filtered out by church or by type is not undated, they simply do not match.
  const undated = dateFiltered
    ? []
    : facetMatched.filter((card) => isUndated(lifeInterval(card.dates)));

  return {
    matched: sortCards(matched, f.sort, { seed: f.shuffleSeed ?? '' }),
    undated: sortCards(undated, 'name'),
  };
}

/**
 * Four orders. Name was the default until 2026-08-24, when Earliest took it
 * (see EMPTY_FILTERS). Breadth of veneration was an order until 2026-08-22 —
 * offered, never defaulted to, because a corpus ranked by how many communions
 * venerate someone reads as a ranking of importance (brief §8.2) — and went
 * with the glyph: in a one-communion corpus it counts nothing.
 */
export const SORTS = ['name', 'earliest', 'latest', 'random'];

/**
 * A stable pseudo-random position for one slug under one seed — FNV-1a, which
 * is four lines and spreads well enough for a shuffle nobody is betting on.
 *
 * The Index is virtualised: a card is mounted and unmounted on every scroll
 * frame, and `applyFilters` runs again on every keystroke in the search box.
 * A shuffled *array* would therefore be reshuffled under the reader mid-scroll.
 * Deriving each card's position from the seed instead means the order is a
 * pure function of (seed, slug) and holds still until the seed changes.
 */
export function shuffleKey(slug, seed = '') {
  let h = 0x811c9dc5;
  const text = `${seed}:${slug}`;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * `latest` runs descending (author, 2026-08-24). Both date orders were
 * ascending until then, differing only in which bound of the life they keyed
 * on, so the two produced nearly the same list — Moses, Joshua, Samuel at the
 * head of both — and *Latest date* read as a control that did nothing. Latest
 * now means what it says: the most recently reposed first, which in this
 * corpus is the new-martyrs of 1937 and 1938.
 */
export function sortCards(cards, sort = EMPTY_FILTERS.sort, { seed = '' } = {}) {
  const byName = (a, b) => a.display_name.localeCompare(b.display_name);
  const copy = cards.slice();
  if (sort === 'name') return copy.sort(byName);
  if (sort === 'random') {
    return copy.sort((a, b) => shuffleKey(a.slug, seed) - shuffleKey(b.slug, seed) || byName(a, b));
  }
  const key = (card) => {
    const iv = lifeInterval(card.dates);
    return sort === 'latest' ? (iv.latest ?? iv.earliest) : (iv.earliest ?? iv.latest);
  };
  const direction = sort === 'latest' ? -1 : 1;
  return copy.sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    // Undated saints have no position on a timeline, so they sort last at
    // either direction — not to year zero, and not to the far end of a
    // descending list, which is where negating the comparator would put them.
    if (ka === null || kb === null) {
      if (ka === kb) return byName(a, b);
      return ka === null ? 1 : -1;
    }
    return direction * (ka - kb) || byName(a, b);
  });
}

/** The facet values the corpus actually contains, so no filter offers a dead end. */
export function facetsOf(cards) {
  const collect = (fn) => {
    const seen = new Set();
    for (const card of cards) for (const value of fn(card)) if (value) seen.add(value);
    return [...seen].sort();
  };
  return {
    types: collect((c) => c.types ?? []),
    regions: collect((c) => (c.locations ?? []).map((l) => l.region)),
    churches: collect(veneratedChurches),
    historicities: collect((c) => [c.historicity]),
    sexes: collect((c) => [c.sex]),
  };
}
