/**
 * Date intervals. Every date in this project is an interval; a date known
 * precisely is an interval whose bounds are equal. There is deliberately no
 * separate representation for a precise date and no null-date special case,
 * because the moment those exist every consumer has to branch on them and one
 * of them eventually forgets.
 *
 * A null bound is an open bound, not a missing one: { earliest: null,
 * latest: 550 } means "no later than 550", which is a real and citable finding.
 * Only an interval open at *both* ends is undated, and those go to the tray
 * rather than being filtered as if they were everywhere.
 */

export const BASES = ['attested', 'traditional', 'inferred', 'unknown'];

export function makeInterval(raw) {
  if (raw == null) return { earliest: null, latest: null, display: null, basis: 'unknown' };
  return {
    earliest: raw.earliest ?? null,
    latest: raw.latest ?? null,
    display: raw.display ?? null,
    basis: raw.basis ?? 'unknown',
  };
}

export const isUndated = (iv) => {
  const i = makeInterval(iv);
  return i.earliest === null && i.latest === null;
};

/** Open at either end. Renders maximally soft; cannot be "entirely within". */
export const isUnbounded = (iv) => {
  const i = makeInterval(iv);
  return i.earliest === null || i.latest === null;
};

/** Years spanned, or null when open — never substitute a number for "unknown". */
export function width(iv) {
  const i = makeInterval(iv);
  if (isUnbounded(i)) return null;
  return i.latest - i.earliest;
}

/**
 * Layout position only. Never label this to the reader as a date: the whole
 * point of carrying intervals is that the midpoint of a 200-year span is not a
 * fact about anyone.
 */
export function midpoint(iv) {
  const i = makeInterval(iv);
  if (i.earliest !== null && i.latest !== null) return (i.earliest + i.latest) / 2;
  return i.earliest ?? i.latest;
}

/** Any part of the interval touches [from, to]. Undated matches nothing. */
export function overlaps(iv, from, to) {
  const i = makeInterval(iv);
  if (isUndated(i)) return false;
  const lo = i.earliest ?? -Infinity;
  const hi = i.latest ?? Infinity;
  return lo <= to && hi >= from;
}

/** The whole interval sits inside [from, to]. An open bound never qualifies. */
export function within(iv, from, to) {
  const i = makeInterval(iv);
  if (isUndated(i) || isUnbounded(i)) return false;
  return i.earliest >= from && i.latest <= to;
}

/**
 * Century as a signed ordinal: 5 is the 5th century AD, -1 the 1st century BC.
 *
 * Astronomical numbering puts 1 BC at year 0, so the BC branch converts back to
 * a BC year before dividing. Doing it by flooring the astronomical year instead
 * is off by one for every year ending in 00 — 100 BC lands in the 2nd century
 * BC rather than the 1st.
 */
export function centuryOf(year) {
  if (year === null || year === undefined) return null;
  if (year > 0) return Math.floor((year - 1) / 100) + 1;
  return -Math.ceil((1 - year) / 100);
}

/**
 * The century a saint is filed under for coverage statistics: death if we have
 * any bound on it, else floruit, else birth. Returns null rather than guessing.
 */
export function primaryCentury(dates = {}) {
  for (const key of ['death', 'floruit', 'birth']) {
    const iv = makeInterval(dates[key]);
    if (!isUndated(iv)) return centuryOf(midpoint(iv));
  }
  return null;
}
