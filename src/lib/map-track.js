/**
 * A life read as two questions of time: which years the corpus can place a
 * person in at all, and — for the handful who carry a dated journey — where
 * along it they were in a given year.
 *
 * Pure arithmetic and no DOM, like `map-view.js` and `map-labels.js` beside
 * it, and pinned in `tests/map-track.test.mjs`. Both answers are drawn as a
 * dot's position and its dimming, which is exactly the kind of thing that
 * looks right in one screenshot and is wrong in the next.
 */

import { isUndated, makeInterval } from './dates.js';

/**
 * The first and last years the corpus can put a saint anywhere, as two plain
 * numbers or nulls.
 *
 * **Not `lifeInterval`, and the difference is the point.** That reading keeps
 * an open bound open — Moses the Hungarian's birth is recorded only as
 * "before 1000", so his interval starts at `null` — and `overlaps` reads an
 * open start as reaching back forever, which lit his dot at full strength six
 * hundred years before he was born (author, 2026-08-31). The other bound of
 * that same interval is a real finding, so it is what this falls back to.
 *
 * Where a saint has no birth at all this ends up reading their death as the
 * first year they can be placed, which is stricter than the truth: someone
 * who died in 305 was certainly alive in 300. It is still the honest bound
 * *this corpus* holds, and the alternative — reaching back forever — is the
 * thing being fixed. A dot before `born` is drawn as "not there yet", which
 * for such a saint means "before the first year anything here can place them"
 * rather than literally before a birth.
 */
export function lifeBounds(dates) {
  const pick = (order, side) => {
    for (const key of order) {
      const iv = makeInterval(dates?.[key]);
      if (isUndated(iv)) continue;
      return side === 'early' ? iv.earliest ?? iv.latest : iv.latest ?? iv.earliest;
    }
    return null;
  };
  return {
    born: pick(['birth', 'floruit', 'death'], 'early'),
    died: pick(['death', 'floruit', 'birth'], 'late'),
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Where a `track` puts someone in `year`: a stay's own coordinates while they
 * are at it, and a point along the leg between two stays while they are
 * travelling.
 *
 * **The legs are drawn, not sourced, and that is the whole of what this adds
 * to the data.** A waypoint's `from` and `to` are years a source states; the
 * gap between one stay's `to` and the next's `from` is time nothing accounts
 * for, and rather than snapping the dot across it on one frame this walks the
 * straight line between the two places over those years. Moses the
 * Hungarian's return from Poland is the case it was built for: freed in 1025,
 * at the Caves for the ten years before a death in about 1043, and eight
 * years in between that no source read here fills. Each waypoint's own `note`
 * says so in words on the saint's page; this only has to not pretend the
 * journey was instant.
 *
 * `uncertainty_km` travels with the position, so a dot between a region and a
 * city carries a halo between their two doubts rather than either one's.
 *
 * Returns `{ lon, lat, uncertainty_km }` — the same shape a `location` has,
 * so the drawing pass cannot tell the two apart and does not need to.
 */
export function trackAt(track, year) {
  if (!track?.length) return null;
  const point = (w) => ({ lon: w.lon, lat: w.lat, uncertainty_km: w.uncertainty_km });

  const first = track[0];
  // Before the first stay ends they are at it, however long ago it began: a
  // null `from` on the opening waypoint is "from birth, the year unrecorded".
  if (year <= (first.to ?? Infinity)) return point(first);

  for (let i = 1; i < track.length; i++) {
    const left = track[i - 1];
    const here = track[i];
    if (left.to !== null && here.from !== null && year < here.from) {
      const span = here.from - left.to;
      const t = span > 0 ? (year - left.to) / span : 1;
      return {
        lon: lerp(left.lon, here.lon, t),
        lat: lerp(left.lat, here.lat, t),
        uncertainty_km: lerp(left.uncertainty_km, here.uncertainty_km, t),
      };
    }
    if (year <= (here.to ?? Infinity)) return point(here);
  }
  return point(track[track.length - 1]);
}
