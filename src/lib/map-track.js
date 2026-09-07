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
 * How far a leg wanders off the straight line between its two stays, as a
 * fraction of its own length (author, 2026-08-31: "make the rail a bit more
 * twisty imitating a more messy realistic path between places").
 *
 * **It is decoration and has to look like it.** Nobody recorded the road
 * Moses took from Poland back to Kyiv, and a straight line says that as
 * plainly as a wandering one does — but a straight line also reads as a
 * *claim* to have flown, which is the one thing certainly false. A sixteenth
 * of the distance is enough for the eye to read travel rather than teleport
 * and small enough that the line never suggests a detour anyone would take.
 */
const WANDER = 0.06;

/**
 * How many points a leg is drawn and measured with.
 *
 * **64, from 24** (author, 2026-09-07: the rails "are jagged lines, make them
 * filleted or NURBS, with hard corners only at destinations"). The curve
 * itself was always smooth — a sine under a sine envelope — and what read as
 * jagged was two things layered: five bends in a leg sampled at fewer than
 * five points per bend, and every sample joined to the next with a straight
 * `lineTo`, which at 240× is a fifty-pixel facet. The harmonics came down
 * (`wobbleOf`), the sampling went up, and `views/map/paint.js` now strokes
 * each leg as a spline through these points rather than a polyline between
 * them — within a leg only, so a stay is still the corner the reader asked to
 * keep. `pointOn`, which the dot rides, is the same analytic curve at any
 * `t`, so denser sampling changes what is drawn and nothing about where the
 * dot is.
 */
const LEG_STEPS = 64;

/**
 * A leg's own bend, derived from its two endpoints and nothing else.
 *
 * Deterministic on purpose: a random one would redraw a different road on
 * every frame, and the dot — which rides the same curve — would jitter.
 *
 * **One bend and a half, not five** (2026-09-07). Until today `k1` was 2–3
 * and `k2` 4–5, which under the envelope made a leg wriggle four or five
 * times between its stays — a squiggle rather than a road, and the author's
 * "jagged". A first harmonic is one bow to one side or an S, depending on
 * its phase; the second, at half weight, is the one extra inflection that
 * keeps a long leg from reading as a compass arc. Both are still integer
 * harmonics, so the curve still meets both stays exactly.
 */
function wobbleOf(a, b) {
  // A cheap hash of the four coordinates, spread into two phases. The numbers
  // are arbitrary; being *stable* is the whole point.
  const seed = Math.abs(Math.sin(a.lon * 12.9898 + a.lat * 78.233 + b.lon * 37.719 + b.lat * 4.1414) * 43758.5453);
  const frac = (n) => n - Math.floor(n);
  return {
    phase1: frac(seed) * Math.PI * 2,
    phase2: frac(seed * 7.13) * Math.PI * 2,
    k1: 1,
    k2: 2,
  };
}

/**
 * A point `t` of the way along one leg, on the wandering curve rather than
 * the straight line between the two stays.
 *
 * The `sin(pi t)` envelope is what makes the curve leave and rejoin its stays
 * exactly: it is 0 at both ends however the harmonics fall, so a stay's own
 * coordinates are never nudged by the decoration around them. `t` of exactly
 * 0 or 1 short-circuits anyway, because `sin(pi)` is 1.2e-16 rather than 0 in
 * floating point and the map groups saints who share a place by comparing
 * their coordinates for equality (`declutter`).
 */
export function pointOnLeg(a, b, t) {
  const at = (w) => ({ lon: w.lon, lat: w.lat, uncertainty_km: w.uncertainty_km });
  if (t <= 0) return at(a);
  if (t >= 1) return at(b);
  const dx = b.lon - a.lon;
  const dy = b.lat - a.lat;
  const length = Math.hypot(dx, dy) || 1;
  // The perpendicular to the leg, which is the direction a detour takes.
  const nx = -dy / length;
  const ny = dx / length;
  const { phase1, phase2, k1, k2 } = wobbleOf(a, b);
  const swing =
    Math.sin(Math.PI * t) *
    (0.6 * Math.sin(2 * Math.PI * k1 * t + phase1) + 0.4 * Math.sin(2 * Math.PI * k2 * t + phase2));
  const off = swing * WANDER * length;
  return {
    lon: lerp(a.lon, b.lon, t) + nx * off,
    lat: lerp(a.lat, b.lat, t) + ny * off,
    uncertainty_km: lerp(a.uncertainty_km, b.uncertainty_km, t),
  };
}

/**
 * The whole track as one run of points, for stroking. Stays are single
 * points; legs are `LEG_STEPS` samples of `pointOnLeg`, so the line the
 * reader sees and the line the dot rides are the same curve rather than two
 * that happen to agree at the ends.
 */
export function trackPath(track) {
  const legs = trackLegs(track);
  // Each leg opens on the stay the previous one closed on; the flat path
  // holds every stay once.
  return legs.flatMap((leg, i) => (i ? leg.slice(1) : leg));
}

/**
 * The same run, kept as one array of points per leg — each from its own
 * first stay to its own last, so consecutive legs share the stay between
 * them. The painter smooths *within* a leg and breaks *between* them: a stay
 * is a place someone arrived at and left from, and the road turning a hard
 * corner there is the truth of that, where a curve rounded through it would
 * draw them sailing past the town.
 */
export function trackLegs(track) {
  if (!track?.length) return [];
  const legs = [];
  for (let i = 1; i < track.length; i++) {
    const leg = [{ lon: track[i - 1].lon, lat: track[i - 1].lat }];
    for (let step = 1; step <= LEG_STEPS; step++) {
      const { lon, lat } = pointOnLeg(track[i - 1], track[i], step / LEG_STEPS);
      leg.push({ lon, lat });
    }
    legs.push(leg);
  }
  if (!legs.length) legs.push([{ lon: track[0].lon, lat: track[0].lat }]);
  return legs;
}

/**
 * Where a year falls along a track, as a single number: `i` exactly means
 * "at stay `i`", and `i + f` means "`f` of the way along the leg out of it".
 *
 * One number rather than a position, because the map eases the dot *along
 * the path* when the reader moves the timeline (`views/map.js`), and easing
 * a position would cut the corner instead — sliding across the ground
 * between two bends rather than following the road between them.
 */
export function progressAt(track, year) {
  if (!track?.length) return 0;
  const last = track.length - 1;
  // Before the first stay ends they are at it, however long ago it began: a
  // null `from` on the opening waypoint is "from birth, the year unrecorded".
  if (year <= (track[0].to ?? Infinity)) return 0;
  for (let i = 1; i <= last; i++) {
    const left = track[i - 1];
    const here = track[i];
    if (left.to !== null && here.from !== null && year < here.from) {
      const span = here.from - left.to;
      return i - 1 + (span > 0 ? (year - left.to) / span : 1);
    }
    if (year <= (here.to ?? Infinity)) return i;
  }
  return last;
}

/** The position at a progress value, on the same curve `trackPath` draws. */
export function pointOn(track, progress) {
  if (!track?.length) return null;
  const last = track.length - 1;
  const p = Math.min(last, Math.max(0, progress));
  const i = Math.min(last - 1, Math.floor(p));
  if (last === 0) return pointOnLeg(track[0], track[0], 0);
  return pointOnLeg(track[i], track[i + 1], p - i);
}

/**
 * Where a `track` puts someone in `year`: a stay's own coordinates while they
 * are at it, and a point along the leg between two stays while they are
 * travelling.
 *
 * **The legs are drawn, not sourced, and that is the whole of what this adds
 * to the data.** A waypoint's `from` and `to` are years a source states; the
 * gap between one stay's `to` and the next's `from` is time nothing accounts
 * for, and rather than snapping the dot across it on one frame this walks it
 * over those years. Moses the Hungarian's return from Poland is the case it
 * was built for: freed in 1025, at the Caves for the ten years before a death
 * in about 1043, and eight years in between that no source read here fills.
 * Each waypoint's own `note` says so in words on the saint's page; this only
 * has to not pretend the journey was instant.
 *
 * `uncertainty_km` travels with the position, so a dot between a region and a
 * city carries a halo between their two doubts rather than either one's.
 *
 * Returns `{ lon, lat, uncertainty_km }` — the same shape a `location` has,
 * so the drawing pass cannot tell the two apart and does not need to.
 */
export function trackAt(track, year) {
  if (!track?.length) return null;
  return pointOn(track, progressAt(track, year));
}
