import { HISTORICAL_LABELS } from '../../data/historical-labels.js';
import { saintName } from '../../lib/honorific.js';
import { dailyRank, layoutBlobLabels, layoutLabels } from '../../lib/map-labels.js';
import { lifeBounds, pointOn, progressAt, trackPath } from '../../lib/map-track.js';
import { convexHull, coverFractions, distToHull, inflateHull, MERGE_PX, mergeDots, pointInHull, spreadShared, toScreen } from '../../lib/map-view.js';
import { ASPECT, project } from '../../lib/mercator.js';
import { reducedMotion } from '../../lib/motion.js';
import { softness } from '../../lib/uncertainty.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { FLY_MS, glidePoint, glideTo, railAt } from './motion.js';
import { map, place, shownYear } from './state.js';

/**
 * The draw pass: `paintCanvas` and everything it calls — the two coastline
 * tiers and their crossfade, the terrain tile grid and the loaders that
 * fetch it, the historical atlas layer, the halo layer, the dot pass, the
 * label pass and the blobs — with `pointAt`, which is where a saint stands
 * in a given year and is read by the search as well as by the paint.
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5). **The
 * terrain loaders are here rather than in a module of their own on
 * purpose**: they call `paintCanvas` when a tile lands and it calls them
 * when a frame needs one, so two files would import each other, and one
 * file that says so is the honest shape until something changes that.
 * `MERGE_PX` is imported here for the first time — the one- or two-member
 * blob branch of the centre test had used it without any import since
 * 2026-09-04, a `ReferenceError` waiting for a blob too small to have a
 * hull to be the open one.
 */

/**
 * How long the dot takes to walk the whole of a chosen saint's rail (author,
 * 2026-09-01: "plays through the saint's life rail differently than through
 * the movement mechanic: the dot goes over the rail smoothly over 5s", and
 * later the same day "make it from 5s to 3s").
 *
 * **It is deliberately not the `Movement` mechanic**, and the difference is
 * the point of having both. Movement answers "where was everyone in the year
 * the timeline says", so it moves every dot, is driven by the reader's own
 * handle, and is opt-in because the line between two recorded places is drawn
 * rather than sourced. This answers "show me this one life", once, on the
 * press that chose it: one saint, their whole track end to end, at a pace
 * nothing else on the page is keeping. The timeline does not move under it
 * and no other dot stirs.
 */
const RAIL_PLAY_MS = 3000;

/**
 * Eased at both ends rather than run at a constant rate. The dot starts from
 * a standstill and ends at one, and a walk that begins and finishes abruptly
 * reads as a jump-cut to the position rather than as a journey being shown.
 */
const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * How far everything the reader did *not* choose falls back while one saint
 * is chosen (author, 2026-09-01: "when selected, the other saints become
 * less prominent"). A multiplier on the dimming a dot already carries, so
 * the timeline's own three states still read against each other underneath
 * — this makes the rest of the map a ground for one saint rather than
 * flattening it into one.
 */
const SELECT_DIM = 0.35;

/**
 * How long the rest of the map takes to fall back, and to come again
 * (author, 2026-09-01: "ensure there is a fade in fade out as the other
 * saints go half opacity and the screen centres. same with deselection").
 *
 * `FLY_MS` exactly, because the two are one gesture: the flight and the fade
 * begin on the same press and land together, so the map arrives already
 * quiet rather than arriving and then dimming a beat later. Deselection runs
 * the same length back the other way, where it used to be a hard cut.
 */
const SELECT_FADE_MS = FLY_MS;

/** How far the fall-back has got: 0 is the whole map at full strength, 1 is
 *  everyone but `focus` at `SELECT_DIM`. Eased in `paintCanvas`. */
export const selectFade = { value: 0, lastT: 0 };

/**
 * Advances the fade toward wherever `focus` now puts it, and returns the
 * multiplier a saint who is *not* the chosen one is drawn at.
 *
 * Reduced motion arrives rather than travelling, the house rule everywhere
 * else on this page: the dimming carries the information (which saint the
 * map is attending to) and only the travelling is spared.
 */
function stepSelectFade(now) {
  const target = map.focus ? 1 : 0;
  const dt = Math.min(now - selectFade.lastT, 32);
  selectFade.lastT = now;
  if (reducedMotion()) selectFade.value = target;
  else if (selectFade.value < target) selectFade.value = Math.min(target, selectFade.value + dt / SELECT_FADE_MS);
  else if (selectFade.value > target) selectFade.value = Math.max(target, selectFade.value - dt / SELECT_FADE_MS);
  return 1 - (1 - SELECT_DIM) * selectFade.value;
}

/** The threshold past which dots get their names (§8.3: "then labels"). */
const LABELS_AT = 2.5;

/*
 * The historical atlas layer's own two fade bands (`HISTORICAL_LABELS`,
 * 2026-09-05). A region is a broad area with no one point that is "it", so
 * it fades out well before the reader is zoomed in enough that its own
 * label would be sitting inside a single saint's cluster; a city is a real
 * place and stays legible across the same range a saint's own name arrives
 * in, rather than only briefly at the overview.
 */
const HIST_REGION_FADE_START = 5;

const HIST_REGION_FADE_END = 14;

const HIST_CITY_FADE_START = 0.5;

const HIST_CITY_FADE_END = 2;

/**
 * The zoom at which the fine coastline replaces the coarse one (author,
 * 2026-09-01: "until you reach at least 5x zoom, only the low definition
 * coastlines are shown so when zoomed out the map isnt laggy as it currently
 * is. Ideally the high definition loads in tiles as you scroll over the map to
 * be efficient").
 *
 * **The lag was never the fetch, it was the frame.** The draw pass already
 * skips any shape whose box is off screen, which is what tiling would buy —
 * but at 1x the whole world is on screen, so nothing is skipped and every one
 * of the 50m tier's points is projected on every frame of every drag. A coarser
 * tier is the only thing that helps there, because the problem is the number of
 * points *inside* the picture.
 *
 * So there are two files now: Natural Earth 110m at one decimal place (5,118
 * points, 19 kB gzipped) for the map as it opens, and the 50m at two (255 kB)
 * fetched the first time the reader passes this line and kept for the visit.
 * Below this the coarse tier is what is drawn even once the fine one has
 * arrived, because zooming back out must get the cheap frame back.
 *
 * Five was the author's own first number, and briefly shared `LABELS_AT`
 * instead (2026-09-04: "change load in for detailed coastlines to 2.7x, or
 * whatever it is for loading the names of the saints" read as "the two
 * should be the same number", 2.5x). **Split back apart on 2026-09-05**
 * (author, after living with the shared number: "make it 2.7x on desktop
 * and whatever it used to be on mobile") — a phone's own frame cost for the
 * 50m tier's point count is the reason this threshold exists at all, and
 * that cost has nothing to do with a desktop window's own reach for 2.7,
 * which was never about the frame — it was the author's own first guess at
 * where the *names* should arrive, kept here now that the two are no longer
 * tied to one shared constant. `isDesktop` is the same 760px boundary
 * `calendar.css`/`saint.css` already switch their own two-column layouts
 * on, checked live rather than latched at open — the same "ask again every
 * frame" reasoning `ceilingOf` already uses for the same kind of question.
 */
const isDesktop = () => typeof matchMedia === 'function' && matchMedia('(min-width: 760px)').matches;

const DETAIL_AT_DESKTOP = 2.7;

const DETAIL_AT_MOBILE = 5;

const detailAt = () => (isDesktop() ? DETAIL_AT_DESKTOP : DETAIL_AT_MOBILE);

/**
 * How long the coastline, lakes and rivers take to cross-fade between tiers
 * (2026-09-04: "make the appearance of the high quality coastlines and lakes
 * and rivers fade in/out instead of just appearing"). Short, on purpose — a
 * reader crossing `detailAt()` mid-gesture is mid-zoom, not standing still to
 * watch a transition, so this only has to remove the pop, not choreograph one.
 */
const DETAIL_FADE_MS = 280;

/** One saint's mark. A merged mark grows from here — see `paintCanvas`. */
const DOT_R = 2.5;

/**
 * The threshold past which a crowded cluster's names are stacked into a
 * column with leader lines rather than simply placed beside their dots or
 * dropped (author, 2026-08-31: "implement the leader line system only after
 * 29x zoom" — the columns had shipped at every zoom the labels themselves
 * appear at, and read worse than what they replaced).
 *
 * Density is why: at 3× nearly every located dot is within `CLUSTER_PX` of
 * another, so the whole corpus collapses into one or two clusters and the
 * column becomes thirty names with thirty lines fanning back across the
 * Mediterranean. Past 29× a cluster is what the column was built for — a
 * few saints who share one town, Nicomedia's martyrs or the Kyiv Caves
 * pair — and there dropping their names is the worse answer.
 */
const LEADERS_AT = 29;

/**
 * Each land/lake/river shape's own lon/lat box, cached against the shape
 * (its array identity) rather than recomputed: `LAND`, `LAKES` and `RIVERS`
 * are the same arrays for the whole session, loaded once, so a shape's box
 * is worth computing exactly once no matter how many frames a drag paints.
 */
const shapeBBoxes = new WeakMap();

/**
 * A label's opacity, easing toward 1 while its saint holds the collision
 * battle and 0 the moment it loses it — 2026-08-31, replacing an outright
 * pop in either direction. Keyed by slug rather than held on `drawnDots`
 * itself, which is rebuilt from nothing every paint: the fade is a property
 * of the *saint*, remembered across paints, not of one frame's array.
 *
 * Which label wins the overlap test can flip from one frame to the next
 * during a pan — the geometry moved a few pixels and a different name is
 * now the one nearer another's box — and popping a name in and out on every
 * such flip read as a flicker rather than as the map settling. Easing means
 * a rapid win/lose/win never reaches full opacity in either direction, so
 * the worst case is a shimmer rather than a flash.
 */
export const labelState = new Map();

const LABEL_FADE_MS = 300;

/**
 * Where each label was last actually placed, by slug. A label fading *out*
 * has lost its placement — `layoutLabels` only returns the ones it kept —
 * and without somewhere to fade from it would jump back to its dot for the
 * length of the fade, which is a flicker of exactly the kind the fade was
 * added to remove.
 */
const labelLastAt = new Map();

/**
 * The most alpha the halos may ever put over the map, however many overlap
 * (author, 2026-08-31: "Make sure the glow never exceeds 50% opacity").
 * Applied once, to a layer every halo has already been composited onto —
 * see `paintCanvas`, which argues why capping each halo separately cannot
 * hold this line.
 */
const GLOW_MAX = 0.5;

/**
 * How far a blob's own outline stands off the dots it holds, in px — the
 * same "room around each dot rather than a line through their centres"
 * `scatter-mockup/blobs.html` settled on.
 */
const BLOB_HULL_PAD = 16;

/**
 * How far past a blob's own edge the screen's centre has to travel before a
 * *different* blob opens (author, 2026-09-04: "add a little hysteresis").
 * Without it a reader whose drag happens to stop near two blobs' shared
 * boundary would watch the names swap on every further pixel — the same
 * flicker `stepLabelOpacity`'s own fade exists to smooth over for one label,
 * here for which blob is open at all. Wider than `MERGE_PX`: this is a
 * deliberate pause, not the "can the reader still tell two dots apart"
 * question `MERGE_PX` answers.
 */
const BLOB_HYSTERESIS_PX = 20;

/**
 * How far a dot outside the reader's chosen span fades toward the ground:
 * `past` is greyed, `future` "greyed out twice as much" (author,
 * 2026-08-31), which is that instruction read as *half the remaining
 * opacity* rather than half the number — 0.45 is a dot you can still find,
 * 0.225 is one that is plainly not there yet.
 */
const DIM_PAST = 0.45;

const DIM_FUTURE = 0.225;

/** How strongly anything belonging to a saint is drawn — dot, rail, name. */
const dimFor = (state) => (state === 'live' ? 1 : state === 'past' ? DIM_PAST : DIM_FUTURE);

/** Advances one label's opacity toward `wanted` by however long it has been
 *  since this slug was last stepped, and returns the new value. */
function stepLabelOpacity(slug, wanted, now) {
  const target = wanted ? 1 : 0;
  let s = labelState.get(slug);
  if (!s) {
    // Starts at 0 regardless of `wanted`: a label seen for the first time
    // fades in like every other appearance rather than popping straight to
    // full opacity on the frame it is first eligible.
    s = { value: 0, target, lastT: now };
    labelState.set(slug, s);
    return s.value;
  }
  const dt = now - s.lastT;
  s.lastT = now;
  s.target = target;
  const step = dt / LABEL_FADE_MS;
  if (s.value < s.target) s.value = Math.min(s.target, s.value + step);
  else if (s.value > s.target) s.value = Math.max(s.target, s.value - step);
  return s.value;
}

/** Whether a dot in this state is shown as a saint rather than left as a
 *  bare mark on the ground. */
const shownState = (state) => (state === 'past' ? map.showPast : state === 'future' ? map.showFuture : true);

/**
 * **One dot per saint, chosen by where they were when the timeline's upper
 * handle says** (author, 2026-08-31) — the first, data-backed half of the
 * "tracker" the author described, and the reason the four kind buttons are
 * gone from the legend.
 *
 * The instruction in full: "if the saint died in 1750 and the highest year
 * on the filter is 1777, the death location will be displayed, but if the
 * high filter is 1732, the dot will be where the saint was at that time, and
 * if the high filter is before their birth it will show their birth dot but
 * greyed out and not glowing … if the timeline bar filter does not include
 * the saint's life, if it is after, they are greyed but still visible, and
 * if their life hasn't happened yet, they are also greyed out but greyed out
 * twice as much."
 *
 * **The rail is real now, for whoever carries one** (author, 2026-08-31:
 * "create a test track for St Moses the Hungarian ... show him moving on
 * that rail as the timeline bar scrolls over his lifespan"). A `track` is an
 * ordered list of dated stays in the saint's own file, and `trackAt`
 * (`lib/map-track.js`) reads a position off it — a stay's own coordinates
 * while the year is inside it, a point along the line between two stays
 * while it is in the gap between them. One saint has one today. Everyone
 * else still gets what this returned before: the best-attested single place
 * for the year asked about, out of `locations`, which carry no dates of
 * their own at all.
 *
 * **All of that is behind the `Movement` box now** (author, 2026-09-01:
 * "Only display death location, unless you tick a box in the bottom left
 * called 'Movement', which then shows current location"). Unticked — the
 * default, and how the map opens — every saint sits at the one place their
 * commemoration is usually built on and the timeline only *dims*. That is
 * the simplification: a reader dragging the years is asking which saints
 * belong to a period, and answering that by walking sixty-nine dots around
 * the picture was answering a question they had not asked.
 *
 * `state` is what the drawing pass dims by, and it is read from the range
 * whether or not the dots are moving:
 *   `live`    the year sits inside the saint's own life — full colour, glow.
 *   `past`    they had already died — greyed, still legible.
 *   `future`  they were not yet born — greyed twice as far, and no glow,
 *             because a halo is a claim about a place someone *was*.
 */
export function pointAt(card, from, to, at = to) {
  const locations = card.locations ?? [];
  const track = card.track ?? [];
  if (!locations.length && !track.length) return null;
  const byKind = (k) => locations.find((l) => l.kind === k);
  const { born, died } = lifeBounds(card.dates);

  // The saint's most representative single place, death first for the reason
  // §8.3 gives — it is the one kind almost every saint has, and where a
  // martyr died is the fact their commemoration is usually built on.
  const settled = byKind('death') ?? byKind('relics') ?? byKind('see') ?? byKind('birth') ?? locations[0] ?? track[0];

  /*
   * An undated life is never dimmed and never moved, the same standing it
   * has had since the timeline shipped: there is nothing to judge it
   * against, so it shows its settled place at full strength whatever the
   * handles say.
   */
  if (to === null || born === null || died === null) return { where: settled, state: 'live' };
  /*
   * **`at` is where, `from`/`to` is who** (2026-09-01). The paragraph below
   * already drew this distinction and answered both halves of it with `to`,
   * which was right while the upper handle was the only thing that could say
   * what year the reader was watching. The triangle says that now, so the two
   * questions take two arguments — and where there is no triangle, `at`
   * defaults to `to` and nothing about the old behaviour changes.
   */

  /*
   * **Position from the upper handle; dimming from the whole range.** They
   * are different questions and were briefly conflated: where a saint was
   * in a given year is answered by that year alone, but whether the reader's
   * chosen span *contains* that saint's life is a question about both ends.
   * A saint who died in 1750 with the range set to 1700–1777 is squarely
   * inside the reader's window and must not be greyed merely because the
   * upper handle is past their death.
   */
  const state = born <= to && died >= from ? 'live' : to < born ? 'future' : 'past';

  /*
   * **The resting place, unless the reader asked to watch them move.** Death
   * outranks relics here for the reason §8.3 gave the old default: it is the
   * fact a commemoration is usually built on, and the two are the same place
   * for almost everyone who has both.
   */
  if (!map.movement) return { where: settled, state, track: track.length ? track : undefined };

  if (track.length) {
    // The year's own place on the track, as a number rather than a position:
    // the drawing pass eases *along* the path toward it (`glideTo`), and a
    // position eased directly would cut across the bends instead of taking
    // them.
    const progress = progressAt(track, at);
    return { where: pointOn(track, progress), state, track, progress };
  }

  if (at < born) {
    // Not yet born: their birthplace is the only honest dot, and it marks a
    // place they will be rather than one they are.
    return { where: byKind('birth') ?? settled, state };
  }
  if (at >= died) {
    // Dead by this year. `relics` outranks `death` only once the year is
    // past the death itself, which is the one point at which "where they
    // are" and "where they died" can honestly differ.
    return { where: byKind('relics') ?? byKind('death') ?? settled, state };
  }
  /*
   * **Alive, and moving across the life rather than between two stations**
   * (author, 2026-09-02: "can you make the movements interpolated, i.e. for
   * the 1y/s speed they dont start and stop, but is animated moving pretty
   * much the same speed between the points").
   *
   * What it replaces returned one of two fixed places and let the draw pass
   * ease between them, so a dot crossed Anatolia in a tenth of a second when
   * the year passed a birth or a death and then stood perfectly still for the
   * sixty years in between. Read off the year instead, the same way a saint
   * with a real `track` already is: `from` at their birth, `to` at their
   * death, and the fraction of the life between them. At a year a second a
   * sixty-year life is a sixty-second walk, which is the constant speed the
   * instruction asks for.
   *
   * **It is still not a claim, and the returned value still carries no
   * `track`.** Nothing is stroked for these saints — a drawn line is a
   * journey the corpus recorded, and this is a mode the reader turned on,
   * which is the bargain `Movement` has made since it shipped. A saint with
   * one place, or with no dated ends to hang the fraction on, does not move
   * at all.
   */
  // `from`/`to` are this function's own parameters — the reader's range — so
  // the two ends of the life take names of their own.
  const startsAt = byKind('birth') ?? byKind('see') ?? settled;
  const endsAt = byKind('see') ?? byKind('death') ?? byKind('relics') ?? settled;
  if (!startsAt || !endsAt || startsAt === endsAt || died <= born) {
    return { where: byKind('see') ?? byKind('birth') ?? settled, state };
  }
  const t = Math.min(1, Math.max(0, (at - born) / (died - born)));
  return {
    where: {
      lon: startsAt.lon + (endsAt.lon - startsAt.lon) * t,
      lat: startsAt.lat + (endsAt.lat - startsAt.lat) * t,
      // The halo is a statement about a recorded place, so it belongs to
      // whichever end the dot is nearer rather than to a blend of the two.
      uncertainty_km: (t < 0.5 ? startsAt : endsAt).uncertainty_km,
    },
    state,
  };
}

/**
 * The fine coastline, fetched the first time the reader zooms in far enough to
 * see the difference, and kept for the rest of the visit.
 *
 * Guarded by a promise on the canvas rather than a boolean: a drag that crosses
 * `detailAt()` paints many frames a second, and a boolean set *after* the await
 * would have started a dozen fetches before the first of them landed.
 */
function ensureFine(canvas, cards) {
  if (canvas.__finePending) return;
  canvas.__finePending = Promise.all([import('../../data/land.js'), import('../../data/water.js')])
    .then(([{ LAND }, { LAKES, RIVERS }]) => {
      if (!canvas.isConnected) return;
      canvas.__landFine = LAND;
      canvas.__waterFine = { LAKES, RIVERS };
      paintCanvas(canvas, cards());
    })
    .catch(() => {
      /*
       * The coarse tier is already on the screen and is a whole map, so a fine
       * tier that never arrives is a map slightly less detailed than it might
       * have been — not an error a reader needs telling about. Cleared rather
       * than left set, so a later zoom tries again on a network that has come
       * back.
       */
      canvas.__finePending = null;
    });
}

/**
 * `lib/map-terrain.js`, loaded once and kept — dynamically, and deliberately
 * apart from the static imports at the top of this file. `views/map.js` is
 * itself statically imported by `main.js`, so anything living directly in it
 * ships in the app's own entry bundle on *every* route; the terrain tile grid
 * is real weight (a raster decoder, a per-pixel tint builder, a tile index)
 * that only `/map` has any use for, and it living here once
 * cost every route's first paint about 150ms on a throttled connection —
 * measured on CI, not guessed at. `land.js`/`water.js` avoid this by being
 * pure data; this is the same move for the *code* that reads terrain data.
 */
let terrainLibPromise = null;

let terrainLib = null;

function loadTerrainLib() {
  if (!terrainLibPromise) {
    terrainLibPromise = import('../../lib/map-terrain.js').then((lib) => {
      terrainLib = lib;
      return lib;
    });
  }
  return terrainLibPromise;
}

/**
 * Where the flat ink fill starts giving way to the 50m tile grid, and where
 * it has fully given way — see the fade's own comment in `paintCanvas`.
 * There was a third, whole-world raster tier here once (`terrain-green.webp`/
 * `terrain-relief.webp`, a single ~2000px-wide image covering the whole map),
 * fading in below this range and out across it into the tile grid. Removed
 * entire — asset, loader and draw call — on 2026-09-04 (author: "remove the
 * fully zoomed out raster completely and only keep the medium and high res
 * ones"): a raster that thin over the whole world was never enough to hold
 * a coastline, a mountain edge or a grass/sand boundary at the same density
 * as the tiles it faded into, so every such transition read as a real,
 * systematic lightening rather than sampling noise — the kind the honest
 * area-average fix earlier the same day could not reach, because the wash's
 * own resolution was the mismatch, not its resampling. Below this range the
 * map now shows the same flat ink fill it always had underneath the wash;
 * past it, the tile grid takes over. `_START` stays where the wash's own
 * fetch-and-decode delay was tuned (8x, "a bit laggy" on mobile at 2x); the
 * range is widened well past the old `_END` of 12 so the tile grid eases in
 * over many more zoom levels instead of the four the wash's own crossfade
 * used — there is no second raster underneath any more to hide a slower rise
 * behind, so the fade doing more of the work on its own is what keeps the
 * transition from reading abrupt.
 */
const TILE_FADE_START = 8;

const TILE_FADE_END = 20;

/**
 * Where the 10m tier starts giving way to — and where it has fully replaced —
 * the 50m tile grid, for the `hr: true` cells `make-terrain.py` generated one
 * (within 1000 km of a located saint). 24, the author's own first number
 * ("make the 10m resolution tiles come in around 24x or 30x if 24x is too
 * soon"): the honest ceiling reasoning `detailAt()`/`MAX_SCALE` already use
 * elsewhere on this page argues for the later number if 24 ever reads as
 * arriving before the 50m tier has anything left to show past — untested
 * against a real screen at the time of writing, so this is the number to
 * move first if it reads wrong.
 */
const HR_FADE_START = 24;

const HR_FADE_END = 30;

/**
 * How far a tier that fades in between two zoom levels has got, 0 to 1. Both
 * terrain handovers are this same ramp and were written out longhand twice
 * before they shared it, which is one line each of arithmetic and two places
 * to edit the day either becomes eased rather than linear — the map has
 * already made that move twice elsewhere, for the labels and for a zoom press.
 *
 * **The two ranges must not overlap, and nothing but this note enforces it.**
 * `TILE_FADE_END` (20) sits below `HR_FADE_START` (24) so that at most one
 * handover is ever running: cross-dissolving three layers at once is the dip
 * this map has already paid for twice — once on the coastline tiers, once on
 * the wash the 50m grid replaced — because a pixel only one layer covers is
 * only ever as dark as that layer's own partial alpha. Widening
 * `TILE_FADE_END` past 24 reopens it, and would want `HR_FADE_START` moved
 * out with it rather than a fourth fade laid over the other two.
 */
function fadeBetween(scale, start, end) {
  return Math.max(0, Math.min(1, (scale - start) / (end - start)));
}

/**
 * The tile grid past `TILE_FADE_START`, fetched only for cells the reader's
 * own view actually overlaps — one further step of the same "a reader who never
 * opens the map never pays for it" reasoning `ensureFine` already applies to
 * the fine coastline. `TILES` carries each cell's plain lon/lat bounds
 * (`make-terrain.py`); `visibleTiles` (lib) projects them itself (`project`,
 * the map's one copy of the projection) rather than trusting a second,
 * pre-baked copy.
 *
 * `visible` is passed in rather than asked for again: the paint that calls
 * this has already worked out which cells the view overlaps, and that answer
 * costs a filter over the whole manifest. On the first frame — before the
 * index has loaded — there is nothing to have computed yet, and this returns
 * having only started that load.
 */
function ensureTerrainTiles(canvas, cards, visible) {
  if (!canvas.__tileMeta) {
    if (canvas.__tileMetaPending) return;
    canvas.__tileMetaPending = loadTerrainLib()
      .then(() => import('../../data/terrain-tiles.js'))
      .then(({ TILES }) => {
        if (!canvas.isConnected) return;
        canvas.__tileMeta = TILES;
        canvas.__tileState = new Map();
        paintCanvas(canvas, cards());
      })
      .catch(() => {
        canvas.__tileMetaPending = null;
      });
    return;
  }

  const state = canvas.__tileState;
  for (const tile of visible) {
    const key = `${tile.col}-${tile.row}`;
    if (!state.has(key)) {
      state.set(key, { status: 'pending' });
      const greenUrl = terrainLib.tileUrl(tile.col, tile.row, 'green');
      const reliefUrl = terrainLib.tileUrl(tile.col, tile.row, 'relief');
      Promise.all([terrainLib.loadTerrainChannel(greenUrl), terrainLib.loadTerrainChannel(reliefUrl)])
        .then(([green, relief]) => {
          if (!canvas.isConnected) return;
          state.set(key, { status: 'loaded', green: green.data, relief: relief.data, w: green.w, h: green.h });
          paintCanvas(canvas, cards());
        })
        .catch(() => {
          // One missing tile is a gap in the wash, not a broken map — the flat
          // fill and, past its own zoom, the coastline alone still carry it.
          state.set(key, { status: 'error' });
        });
    }

    /*
     * The 10m pair, only for a cell `make-terrain.py` actually generated one
     * for (`tile.hr`) and only once the reader is far enough in that it would
     * ever be drawn (`HR_FADE_START`).
     *
     * **This tier has no readiness gate, unlike the 50m grid below it.** The
     * fetch starts at the same scale the crossfade starts, so an HR pair that
     * arrives mid-fade is drawn from whatever `hrStrength` has reached by then
     * rather than from 0 — where `tilesReady` holds the 50m grid's own fade at
     * 0 until every visible cell has settled. It reads as a tile sharpening
     * rather than as a dip, because both tiers are the same ground at two
     * densities and the outgoing one keeps `1 - hrStrength` of the alpha the
     * incoming one takes; that is why this has been left alone rather than
     * given a second gate. Worth knowing before the two are ever described as
     * following the same rule — they do not.
     */
    if (tile.hr && map.view.scale >= HR_FADE_START) {
      const hrKey = `${key}-hr`;
      if (state.has(hrKey)) continue;
      state.set(hrKey, { status: 'pending' });
      const greenUrl = terrainLib.tileUrl(tile.col, tile.row, 'green-hr');
      const reliefUrl = terrainLib.tileUrl(tile.col, tile.row, 'relief-hr');
      Promise.all([terrainLib.loadTerrainChannel(greenUrl), terrainLib.loadTerrainChannel(reliefUrl)])
        .then(([green, relief]) => {
          if (!canvas.isConnected) return;
          state.set(hrKey, { status: 'loaded', green: green.data, relief: relief.data, w: green.w, h: green.h });
          paintCanvas(canvas, cards());
        })
        .catch(() => {
          state.set(hrKey, { status: 'error' });
        });
    }
  }
}

/**
 * Warms the standard (50m) tile grid from the moment the map opens, rather
 * than leaving every cell to be fetched and decoded for the first time
 * together at whatever instant the reader first crosses `TILE_FADE_START`
 * (2026-09-04, author: "very heavy load at start of map page with raster
 * images, make them load silently in the background... when you first open
 * the page but dont show still at full zoom"). Filling `canvas.__tileState`
 * early costs nothing a reader can see on its own — `paintCanvas`'s own
 * `tileStrength` gate, unchanged, is the only thing that decides whether a
 * tile is ever drawn, and at 1x it is always 0 regardless of what has been
 * decoded — so a visit that never zooms in pays for nothing it would have
 * noticed either way, and a visit whose first real move is a search flight
 * straight past the fade threshold finds most of the grid already decoded
 * instead of fetching and decoding several dozen tiles at the one instant
 * the flight lands.
 *
 * **A tile at a time, through `requestIdleCallback`, not the whole grid at
 * once.** "Silently" is the ask, not merely "eventually" — this must never
 * compete with whatever the reader is actually doing, so each tile's own
 * fetch-and-decode is scheduled only once the browser reports it has spare
 * time, and the next is not scheduled until that one has actually settled.
 * Safari has never shipped `requestIdleCallback`, so a bare `setTimeout`
 * stands in where it is missing — later and less considerate about *when*,
 * but still off the critical path.
 *
 * **`ensureTerrainTiles(canvas, cards, [])` is how the manifest itself
 * loads**, an empty `visible` deliberately reusing the one place that
 * already guards against loading it twice (`__tileMetaPending`) rather than
 * this function racing it with a second copy of the same load — two
 * independent loaders could each decide `__tileMeta` was still empty and
 * both start fetching, and whichever finished last would hand the canvas a
 * *second*, empty `__tileState`, silently orphaning every tile the other
 * had already warmed into the first one.
 *
 * Skipped outright under `navigator.connection.saveData`: this is work a
 * reader may never need, and spending it on a connection they have
 * explicitly asked the browser to go easy on is the one case prefetching is
 * worse than simply waiting for the reader to ask.  The 10m tier is left
 * alone — `ensureTerrainTiles`'s own on-demand fetch still supplies it,
 * since it exists for a small, deliberately narrow set of cells near a
 * located saint and only past a much deeper zoom (`HR_FADE_START`), not the
 * first heavy moment this is answering.
 */
function warmTerrainTiles(canvas, cards) {
  if (navigator.connection?.saveData) return;
  const idle =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : (fn) => setTimeout(() => fn({ timeRemaining: () => 0, didTimeout: true }), 200);

  const warmNext = (tiles, i) => {
    if (!canvas.isConnected || i >= tiles.length) return;
    const state = canvas.__tileState;
    const tile = tiles[i];
    const key = `${tile.col}-${tile.row}`;
    if (state.has(key)) {
      idle(() => warmNext(tiles, i + 1));
      return;
    }
    state.set(key, { status: 'pending' });
    const greenUrl = terrainLib.tileUrl(tile.col, tile.row, 'green');
    const reliefUrl = terrainLib.tileUrl(tile.col, tile.row, 'relief');
    Promise.all([terrainLib.loadTerrainChannel(greenUrl), terrainLib.loadTerrainChannel(reliefUrl)])
      .then(([green, relief]) => {
        if (!canvas.isConnected) return;
        state.set(key, { status: 'loaded', green: green.data, relief: relief.data, w: green.w, h: green.h });
        paintCanvas(canvas, cards());
      })
      .catch(() => state.set(key, { status: 'error' }))
      .finally(() => idle(() => warmNext(tiles, i + 1)));
  };

  const waitForMeta = () => {
    if (!canvas.isConnected) return;
    if (canvas.__tileMeta) {
      warmNext(canvas.__tileMeta, 0);
      return;
    }
    idle(waitForMeta);
  };
  idle(() => {
    ensureTerrainTiles(canvas, cards, []);
    waitForMeta();
  });
}

export async function drawWhenReady(el, canvas, cards) {
  // `cards` is a getter: the coastline may land after the reader has already
  // dragged the timeline, and the paint must draw the set they are looking at.
  const caption = el.querySelector('[data-caption]');
  try {
    /*
     * **The coarse tier, and only the coarse tier, on the way in** (2026-09-01).
     * Dynamic and in parallel, so the picture's own data is its own chunk (or
     * two — Vite splits each module) that a reader who never opens the map never
     * pays for, and one fetch does not wait on the other.
     *
     * 19 kB against 255: the map that opens is the one nearly every visit ever
     * sees, and it opens at 1x where the finer file's extra points are smaller
     * than a pixel. `ensureFine` fetches the other one the first time the reader
     * goes past `detailAt()`, which for most visits is never.
     */
    const [{ LAND }, { LAKES, RIVERS }] = await Promise.all([
      import('../../data/land-coarse.js'),
      import('../../data/water-coarse.js'),
    ]);
    if (!canvas.isConnected) return;
    canvas.__land = LAND;
    canvas.__water = { LAKES, RIVERS };
    canvas.dataset.detail = 'coarse';
    paintCanvas(canvas, cards());
    /*
     * The page's own report that the fetch landed *and* the paint used it -
     * written after the draw, so a chunk that resolved into a canvas that
     * never repainted would still read as not-ready. The suite waits on
     * these; the credit in the footer is static and says nothing about this
     * visit's network.
     */
    canvas.dataset.land = 'ok';
    canvas.dataset.water = 'ok';
    // Only once the picture the reader actually opened the map for has
    // landed — see `warmTerrainTiles`'s own comment for why this is safe at
    // rest and why it waits this long to start.
    warmTerrainTiles(canvas, cards);
  } catch {
    // A map that cannot draw says so; it does not leave an empty rectangle
    // that reads as a bug or, worse, as an empty world.
    caption.textContent = STRINGS.map.landFailed;
    caption.hidden = false;
  }
}

export function paintCanvas(canvas, cards) {
  // Whatever brought this paint about, it supersedes any fade-driven frame
  // still pending from a previous one — never two of those racing.
  if (map.fadeFrame !== null) {
    cancelAnimationFrame(map.fadeFrame);
    map.fadeFrame = null;
  }

  /*
   * A hidden element reports 0 and ignores writes (CLAUDE.md trap 7). The map
   * is inside a `<details>` on no path today, but a canvas sized 0 x 0 and then
   * drawn into is a blank picture with no error, which is the failure this
   * guard exists to make impossible.
   */
  const box = canvas.getBoundingClientRect();
  if (!box.width) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  /*
   * The box's own height, not one derived from the projection.
   *
   * It used to be `box.width / ASPECT`, which was right while the map was a
   * card with `aspect-ratio` on it and wrong the moment the stage became the
   * window (2026-08-29): the backing store stayed 1.12:1 while the CSS box
   * became whatever shape the window was, and the browser stretched one into
   * the other. Egypt was noticeably taller than Egypt. The frame below is what
   * replaces it — the world covers a box of any shape, and the surplus axis is
   * cropped rather than squashed.
   */
  const w = Math.round(box.width);
  const h = Math.round(box.height);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const frame = coverFractions(w, h, ASPECT);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // The palette comes from the stylesheet rather than from constants here, so
  // the map follows the theme — including vigil mode, which nothing checked
  // until 2026-08-28 (Amendment 68).
  const style = getComputedStyle(canvas);
  const ink = style.getPropertyValue('--ink').trim() || '#1c1917';
  const inkSoft = style.getPropertyValue('--ink-soft').trim() || '#6b6259';
  const rubric = style.getPropertyValue('--rubric').trim() || '#8a2e26';

  /*
   * A shape entirely outside the box is skipped before a single one of its
   * points is projected (2026-08-31). At rest this culls nothing — the whole
   * world is on screen — but zoomed in on the corpus's own corner of it,
   * where every reader actually spends their time, most of `land.js` and
   * `water.js`'s 1365 land rings and ~1300 lake/river shapes are geography
   * the box cannot see, and walking their points to draw them anyway was
   * most of the map's per-frame cost once both moved to the 50m tier. The box
   * is corners, not the ring's own points — cheap, and only wrong in the
   * conservative direction (a shape that merely *might* be visible is kept).
   */
  const bboxOf = (shape) => {
    let box = shapeBBoxes.get(shape);
    if (box) return box;
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (let i = 0; i < shape.length; i += 2) {
      const lon = shape[i], lat = shape[i + 1];
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    box = [minLon, minLat, maxLon, maxLat];
    shapeBBoxes.set(shape, box);
    return box;
  };
  const boxVisible = ([minLon, minLat, maxLon, maxLat]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [lon, lat] of [[minLon, minLat], [minLon, maxLat], [maxLon, minLat], [maxLon, maxLat]]) {
      const p = place(lon, lat, frame);
      const x = p.x * w, y = p.y * h;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return maxX >= 0 && minX <= w && maxY >= 0 && minY <= h;
  };

  /** One path, every kept ring or line as its own subpath — one `fill`/
   *  `stroke` call for a whole dataset rather than one per shape, which is
   *  its own cost `ctx.stroke()` alone used to pay 878 times a paint for
   *  the rivers before this.
   *
   *  `sink` is the context's own current path by default and a `Path2D` when
   *  a caller needs the same outline more than once in a frame — the two take
   *  the identical `moveTo`/`lineTo`/`closePath` calls, so this needs no
   *  branch to serve both. The land is that caller: it is filled and then
   *  clipped to, and tracing it twice means walking every one of the fine
   *  tier's ~1,400 rings twice to test visibility before drawing any of
   *  them. */
  const tracePath = (shapes, closed, sink = ctx) => {
    let any = false;
    for (const shape of shapes) {
      if (!boxVisible(bboxOf(shape))) continue;
      any = true;
      for (let i = 0; i < shape.length; i += 2) {
        const p = place(shape[i], shape[i + 1], frame);
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) sink.moveTo(x, y);
        else sink.lineTo(x, y);
      }
      if (closed) sink.closePath();
    }
    return any;
  };

  /*
   * **Which coastline this frame draws** (2026-09-01). Past `detailAt()` the
   * fine tier if it has arrived — and the ask for it if it has not, made from
   * the paint because the paint is the one place that knows the scale — and the
   * coarse one at every zoom below, so going back out gets the cheap frame back
   * rather than carrying the fine tier's point count into a picture of the
   * whole world.
   */
  const wantsFine = map.view.scale >= detailAt();
  if (wantsFine && canvas.__land && !canvas.__landFine) ensureFine(canvas, () => cards);
  const fine = wantsFine && canvas.__landFine;
  if (canvas.dataset.detail) canvas.dataset.detail = fine ? 'fine' : 'coarse';

  /*
   * **The coastline crossfades between tiers rather than popping** (2026-09-04:
   * "make the appearance of the high quality coastlines and lakes and rivers
   * fade in/out instead of just appearing"). `fine` above decides the target
   * tier the instant the data is ready or the reader crosses `detailAt()`; this
   * decides how much of the *previous* tier still shows while the new one
   * ramps in. The previous tier's own fine/coarse geometry is kept — not
   * re-derived — because the whole point is drawing the shape the reader was
   * just looking at, fading under the one that replaces it.
   */
  if (canvas.__detailShown !== undefined && canvas.__detailShown !== fine) {
    canvas.__detailFadeFrom = canvas.__detailShown ? { land: canvas.__landFine, water: canvas.__waterFine } : { land: canvas.__land, water: canvas.__water };
    canvas.__detailFadeStart = performance.now();
  }
  canvas.__detailShown = fine;
  const detailT =
    canvas.__detailFadeStart == null ? 1 : Math.min(1, (performance.now() - canvas.__detailFadeStart) / DETAIL_FADE_MS);
  if (detailT < 1 && canvas.__detailFadeFrame == null) {
    // Keeps repainting through the fade even if the reader's hands are still —
    // nothing else asks for a frame on a clock, only on input or arriving data.
    const tick = () => {
      canvas.__detailFadeFrame = null;
      if (canvas.isConnected) paintCanvas(canvas, cards);
    };
    canvas.__detailFadeFrame = requestAnimationFrame(tick);
  }
  if (detailT >= 1) canvas.__detailFadeStart = null;

  if (detailT < 1 && canvas.__detailFadeFrom?.land) {
    /*
     * **The outgoing tier fades out in step with the incoming one rising —
     * reversed back to a true cross-dissolve** (2026-09-04, a same-day
     * reversal of the paragraph this replaces). Holding this layer at *full*
     * strength for the whole transition, on the reasoning that a proper
     * cross-dissolve dips, was measured rather than watched: with the
     * incoming tier drawn separately on top at its own `0.3 * detailT`, the
     * two source-over composite, not add, and the picture does not merely
     * avoid a dip — it overshoots to `1 - (1-0.3)(1-0.3·detailT)`, `0.51` at
     * `detailT → 1` against a resting `0.3`, then *snaps back down* to `0.3`
     * the instant the guard above stops drawing this layer. That rise and
     * snap, at every `DETAIL_AT` (5×) crossing, is "the colour of the
     * terrain increases and decreases" reported against this very paragraph.
     * A true cross-dissolve — this layer at `0.3 * (1 - detailT)`, the
     * incoming one unchanged at `0.3 * detailT` — troughs at worst to
     * `0.2775` at `detailT = 0.5` (two edges that mostly agree, composited,
     * lose a few percent of ink at the sliver where they do not) and is
     * exact at both ends. A few percent for one frame reads as nothing; a 70%
     * rise reversed in one frame reads as a flash, which is what shipped.
     */
    ctx.save();
    ctx.fillStyle = hexWithAlpha(inkSoft, 0.3 * (1 - detailT));
    ctx.beginPath();
    tracePath(canvas.__detailFadeFrom.land, true);
    ctx.fill();
    if (canvas.__detailFadeFrom.water?.LAKES.length) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1 - detailT;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      if (tracePath(canvas.__detailFadeFrom.water.LAKES, true)) ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    if (canvas.__detailFadeFrom.water?.RIVERS.length) {
      ctx.strokeStyle = hexWithAlpha(inkSoft, 0.5 * (1 - detailT));
      ctx.lineWidth = 0.75;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (tracePath(canvas.__detailFadeFrom.water.RIVERS, false)) ctx.stroke();
    }
    ctx.restore();
  }

  const land = fine ? canvas.__landFine : canvas.__land;
  if (land) {
    /*
     * **The flat ink fill gives way to the 50m tile grid as the reader zooms
     * in** (2026-09-03, narrowed to tiles-only 2026-09-04). There used to be
     * a whole-world raster wash between the two — one image light enough to
     * ship is only a few pixels per degree, so it read as soft mush rather
     * than ground the moment it was asked to cover one saint's own town, and
     * removing it (see `TILE_FADE_START`'s own comment) leaves this as a
     * plain two-tier fade: flat ink below `TILE_FADE_START`, the tile grid
     * above `TILE_FADE_END`, a crossfade of the two between them.
     */
    const zoomFade = fadeBetween(map.view.scale, TILE_FADE_START, TILE_FADE_END);

    /*
     * **The flat fill does not fade out from under ground the tile has not
     * arrived to replace** (2026-09-04, author: "the switch to a lighter
     * colour terrain actually happens across all terrain, and the switch
     * happens at 8x zoom"). `zoomFade` above is pure arithmetic on the
     * current scale; a tile is a network request plus a decode, not free,
     * and the fetch for a cell a reader has never zoomed into before does
     * not even *start* until this same frame — so every first crossing into
     * a fresh area past `TILE_FADE_START` would otherwise draw a flat fill
     * already reduced by `zoomFade` next to a tile layer that had nothing
     * loaded to draw at all, a real, reproducible lightening right at the
     * threshold, not a trick of the eye. `visible` is computed here (once,
     * reused by the draw loop below) so `tilesReady` can hold `zoomFade`'s
     * effect at 0 — flat fill at full, tile not yet drawn — until every tile
     * the current view actually needs has *settled*, loaded or failed either
     * one (an errored tile is still a resolved question, the existing "gap
     * in the grid" this map already tolerates — waiting on it forever would
     * trade a flash for a stuck one). The same "hold the outgoing layer at
     * full until the incoming one is ready" rule as the coastline crossfade
     * a few dozen lines above, one layer down.
     */
    /*
     * `visibleTiles` filters the whole 72-cell manifest and projects two
     * corners of each, so it is computed *once* a frame and handed to
     * `ensureTerrainTiles` rather than recomputed inside it — the two used to
     * ask the same question of the same `view` and `frame` a few lines apart
     * and throw one answer away, which is 72 filter steps and a few hundred
     * short-lived objects per frame of every drag past `TILE_FADE_START`, on
     * the phones that constant exists to protect.
     */
    const visible = zoomFade > 0 && terrainLib && canvas.__tileMeta ? terrainLib.visibleTiles(canvas.__tileMeta, map.view, frame) : [];
    if (zoomFade > 0) ensureTerrainTiles(canvas, () => cards, visible);
    // `[].every()` is already true, so an empty `visible` needs no case of its own.
    const tilesReady = visible.every((t) => {
      const status = canvas.__tileState?.get(`${t.col}-${t.row}`)?.status;
      return status === 'loaded' || status === 'error';
    });
    const tileStrength = tilesReady ? zoomFade : 0;

    /*
     * Ink at a low alpha rather than `--rule` itself. The rule is 1.41:1 on
     * gesso and 1.31:1 on the field — deliberately, because it divides text and
     * is not meant to be looked at — and a whole continent drawn in it was a
     * map you had to hunt for. This is quiet enough to stay a ground for the
     * dots and dark enough that the coastlines read as land.
     *
     * It takes no AA floor: the land is not text, and nothing on this page is
     * carried by the coastline alone — every point is a row in the list below.
     *
     * **Unconditional: this is the land, and the tile grid is a wash over it**
     * — not a layer that replaces it. It was guarded on the terrain layer not
     * being at full strength back when the wash was the thing on top, where
     * that guard was harmless because the old expression (`1 - tileFade`, with
     * the wash loaded) still fell below 1 at full tile strength and so still
     * drew this. Carrying the guard over to `tileStrength` on 2026-09-04
     * inverted exactly that case: past `TILE_FADE_END` the base vanished, every
     * landmass stepped about a quarter lighter in one frame at 20x — the very
     * "all the terrain goes lighter" symptom removing the wash was meant to end
     * — and a cell whose tile 404s had nothing left to draw at all, so the
     * continent read as open sea there. A tile is ink *added* to this fill, at
     * whatever alpha the fade and the tile's own data give it; the fill itself
     * is never a function of the fade.
     */
    /*
     * Traced once and kept: the fill below and the tile layer's own clip are
     * the same outline, and walking the fine tier's rings twice a frame to
     * build it twice is real work at exactly the zoom the tiles live at.
     */
    const landPath = new Path2D();
    tracePath(land, true, landPath);

    ctx.fillStyle = hexWithAlpha(inkSoft, 0.3 * detailT);
    ctx.fill(landPath);

    if (tileStrength > 0 && visible.length && detailT > 0) {
      /*
       * **The 10m tier crossfades in over the 50m one, per tile** — only
       * `hr: true` cells (`make-terrain.py`, within 1000 km of a located
       * saint) ever have a pair to draw, so every other cell keeps reading
       * the 50m grid alone at every zoom this map reaches.
       */
      const hrStrength = fadeBetween(map.view.scale, HR_FADE_START, HR_FADE_END);
      // The same outline the fill used, passed explicitly rather than left in
      // the context's current path for this to inherit.
      ctx.save();
      ctx.clip(landPath);
      const isDark = document.documentElement.classList.contains('dark');
      const base = tileStrength * detailT;
      for (const tile of visible) {
        const entry = canvas.__tileState.get(`${tile.col}-${tile.row}`);
        const hrEntry = tile.hr ? canvas.__tileState.get(`${tile.col}-${tile.row}-hr`) : null;
        const hrReady = hrEntry?.status === 'loaded';
        const a = project(tile.lon0, tile.lat0);
        const b = project(tile.lon1, tile.lat1);
        const topLeft = toScreen(map.view, a.x, a.y, frame);
        const bottomRight = toScreen(map.view, b.x, b.y, frame);
        const dx = topLeft.x * w;
        const dy = topLeft.y * h;
        const dw = (bottomRight.x - topLeft.x) * w;
        const dh = (bottomRight.y - topLeft.y) * h;

        if (entry?.status === 'loaded' && (!hrReady || hrStrength < 1)) {
          ctx.globalAlpha = base * (hrReady ? 1 - hrStrength : 1);
          ctx.drawImage(terrainLib.tintFor(entry, inkSoft, isDark), dx, dy, dw, dh);
        }
        if (hrReady && hrStrength > 0) {
          ctx.globalAlpha = base * hrStrength;
          ctx.drawImage(terrainLib.tintFor(hrEntry, inkSoft, isDark), dx, dy, dw, dh);
        }
      }
      ctx.restore();
    }
  }

  const water = fine ? canvas.__waterFine : canvas.__water;
  if (water) {
    /*
     * Lakes are cut out of the land fill rather than painted a colour of
     * their own. `destination-out` erases exactly the lake's shape back to
     * fully transparent, which is already what the sea is — nothing painted,
     * the CSS `--field` showing through — so a lake reads as "the same water
     * the coastline already implies" instead of introducing a second blue
     * the palette does not have.
     */
    if (land && water.LAKES.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      // A fractional alpha here is a *partial* erase — some land still shows
      // through — which is exactly the fade this block is for: the lake
      // reads in gradually with the rest of the tier rather than snapping cut.
      ctx.globalAlpha = detailT;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      if (tracePath(water.LAKES, true)) ctx.fill();
      ctx.restore();
    }

    /*
     * Rivers are strokes, not fills: `RIVERS` is `LineString` data, open
     * paths rather than closed rings. Ink at a slightly higher alpha than
     * the land fill so a river still reads as a line rather than vanishing
     * into it, but in the same tone rather than a colour the coastline
     * itself does not use.
     */
    if (water.RIVERS.length) {
      ctx.strokeStyle = hexWithAlpha(inkSoft, 0.5 * detailT);
      ctx.lineWidth = 0.75;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (tracePath(water.RIVERS, false)) ctx.stroke();
    }
  }

  /*
   * **A faint historical atlas layer, under every dot and every saint's own
   * name** (`HISTORICAL_LABELS`, 2026-09-05). Drawn here, before the saints
   * loop below computes or paints a single dot, so nothing here can ever
   * win a collision against a saint's own name — this is ground the picture
   * stands on, not a claim competing with the corpus for space, and
   * `layoutLabels`/`obstacles` never hear about it. A city keeps a small
   * marker of its own so its faint name has something to sit beside once a
   * saint's own dot draws over the same coordinate; a region has no such
   * point and is centred type alone, in capitals the way a printed atlas
   * sets a region apart from a city on the same page.
   */
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = inkSoft;
  /*
   * **Positioned once, drawn in two batches by kind rather than one pass
   * alternating between them** — `ctx.font` is not a cheap assignment (the
   * canvas re-parses and re-resolves the string every time it is set), and
   * seventeen of those every frame, on top of everything else this pass
   * already paints, was worth avoiding on the same "ask what an instrument
   * would cost if it ran every frame" grounds the terrain tile work above
   * was. Positions and alphas are cheap and are computed inline; only the
   * font-parsing cost is batched, to two sets a frame rather than up to
   * seventeen.
   */
  const positioned = HISTORICAL_LABELS.map((loc) => {
    const p = place(loc.lon, loc.lat, frame);
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) return null;
    const alpha =
      loc.kind === 'region'
        ? 1 - fadeBetween(map.view.scale, HIST_REGION_FADE_START, HIST_REGION_FADE_END)
        : fadeBetween(map.view.scale, HIST_CITY_FADE_START, HIST_CITY_FADE_END);
    if (alpha <= 0) return null;
    return { loc, x: p.x * w, y: p.y * h, alpha };
  });
  const utilityFont = style.getPropertyValue('--font-utility').trim() || 'sans-serif';
  const historicalDrawn = [];
  ctx.font = `italic 11px ${utilityFont}`;
  ctx.textAlign = 'left';
  for (const at of positioned) {
    if (!at || at.loc.kind !== 'city') continue;
    ctx.globalAlpha = at.alpha * 0.38;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(at.loc.name, at.x + 5, at.y - 4);
    historicalDrawn.push(at.loc.name);
  }
  ctx.font = `italic 13px ${utilityFont}`;
  ctx.textAlign = 'center';
  for (const at of positioned) {
    if (!at || at.loc.kind !== 'region') continue;
    ctx.globalAlpha = at.alpha * 0.22;
    ctx.fillText(at.loc.name.toUpperCase(), at.x, at.y);
    historicalDrawn.push(at.loc.name);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  // Same rule as `data-dots`/`data-labels`: the pass that draws is the pass
  // that knows, so the suite reads what actually landed rather than
  // recomputing the fade bands itself.
  canvas.dataset.historical = JSON.stringify(historicalDrawn);

  /*
   * **One dot per saint, not one per location of the current kind**
   * (2026-08-31). `pointAt` picks which of a saint's places to show from
   * where the timeline's upper handle stands, and hands back the `state`
   * this pass dims by; the four kind buttons that used to choose for
   * everyone at once are gone.
   */
  const onScreen = [];
  // Where each saint stands before the ring below moves the stacked ones.
  const standing = [];
  const rails = [];
  const gliding = performance.now();
  let stillGliding = false;
  for (const card of cards) {
    const at = pointAt(card, map.dateFrom, map.dateTo, shownYear());
    if (!at) continue;
    /*
     * **Is this saint's dot travelling right now?** Two ways it can be — the
     * chosen saint walking their whole rail on the press that chose them, and
     * any tracked saint still easing toward where a moved timeline puts them
     * — and the answer matters beyond the position: a moving name is printed
     * over the others (author, 2026-09-01: "if a saint moves along its rail,
     * make their name print over others while its moving"), which is what
     * `moving` carries out of this loop for `rankOf` to sort by.
     */
    let moving = false;
    // Only the chosen saint's, since 2026-08-31: a journey is an answer to
    // "where did *this* one go", and every track on the picture at once
    // would be a second, competing kind of mark nobody asked a question to
    // get. `release` hides it again by clearing `selected`.
    if (at.track && card.slug === map.selected) rails.push({ track: at.track, state: at.state });
    /*
     * A tracked saint is drawn where they have *glided* to, not where the
     * year says outright — see `railAt`. Everyone else is drawn where
     * `pointAt` put them, because a saint with no track does not travel
     * between their own places, they are simply recorded at each of them.
     */
    /*
     * Where they have *glided* to, not where the year says outright — see
     * `railAt`. A saint with a track eases along it so the dot takes the
     * road's own bends; everyone else eases straight between the places
     * they are recorded at, which is all there is between them. With
     * `Movement` unticked `glideStep` returns 1 and both are simply where
     * `pointAt` put them, which is the resting place and never moves.
     */
    let where = at.where;
    const walk = map.railPlay?.slug === card.slug && at.track?.length > 1 ? (gliding - map.railPlay.start) / RAIL_PLAY_MS : null;
    if (walk !== null && walk < 1) {
      /*
       * **The chosen saint's own walk, which outranks both of the above.**
       * It reads neither the timeline nor `Movement`: the whole rail, end to
       * end, in `RAIL_PLAY_MS`, because the question it answers is "show me
       * this life" and not "where was everyone in 1025".
       */
      where = pointOn(at.track, smoothstep(walk) * (at.track.length - 1));
      moving = true;
    } else if (at.track && at.progress !== undefined) {
      const eased = glideTo(card.slug, at.progress, gliding);
      if (eased !== at.progress) {
        stillGliding = true;
        moving = true;
      }
      where = pointOn(at.track, eased);
    } else {
      where = glidePoint(card.slug, at.where, gliding);
      if (where !== at.where) {
        stillGliding = true;
        moving = true;
      }
    }
    /*
     * A walk that has run its course ends here rather than on a timer, so
     * the frame that stops it is the same frame that last drew it. The glide
     * is left holding the rail's far end, so a reader who ticks `Movement`
     * afterwards eases from where the walk finished rather than snapping
     * back from a value the last paint never used.
     */
    if (walk !== null && walk >= 1) {
      railAt.set(card.slug, { value: at.track.length - 1, lastT: gliding });
      map.railPlay = null;
    }
    standing.push({ card, where, state: at.state, moving, lon: where.lon, lat: where.lat });
  }

  /*
   * **Saints at one identical coordinate are spread into a tight ring around
   * it, on the ground rather than on the screen** (author, 2026-09-01: "spread
   * the dots around as coordinates on the map if they're stacked ... still
   * pretty tightly spaced when zoomed in fully to communicate proximity").
   *
   * In degrees, which is what keeps this from being the fan that was thrown
   * out a few hours earlier: the offset is sub-pixel with the whole world on
   * screen, so `mergeDots` still collapses the group into one honest mark
   * saying how many, and it opens into a constellation only as the reader
   * goes in. `lib/map-view.js` argues the size of it — including, since
   * 2026-09-04, a coordinate over `BLOB_MAX` (8) into blobs of at most that
   * many, partitioned and separated on the scatter itself
   * (`capacitatedGroups`/`separateGroups`) rather than on the shared
   * coordinate every member starts at, which had no geometry in it for a
   * partition to read and produced blobs that covered nearly the same
   * ground. `blobId`/`blobSize` ride on the spread point for exactly the
   * coordinates this touches; everywhere else they are `undefined`.
   */
  for (const s of spreadShared(standing)) {
    const p = place(s.lon, s.lat, frame);
    const x = p.x * w;
    const y = p.y * h;
    // Off the visible box once zoomed, which is ordinary.
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) continue;
    onScreen.push({ card: s.card, where: s.where, state: s.state, x, y, moving: s.moving, blobId: s.blobId, blobSize: s.blobSize });
  }

  /*
   * **The rail the chosen saint travels along** (author, 2026-08-31), drawn
   * under everything else so the dot rides on top of it. It is the whole of
   * that saint's own `track` and not the part they have reached: the reader
   * is being shown a journey, and a line that grew behind the dot would say
   * the rest of it had not been decided yet. Dimmed with its own dot, so a
   * life the range does not reach is a faint thread rather than a claim
   * competing with the lit ones.
   */
  /*
   * The stroked rail's own extent in CSS px, published below as `data-rail`.
   * The suite cannot ask this of the picture: the rail is rubric and so is
   * every dot, so reading it off the ink measures the dots as well — which is
   * exactly how the first version of the flight test passed with the framing
   * backed out. The draw pass knows, so the draw pass says.
   */
  let railBox = null;
  const spanRail = (x, y) => {
    railBox = railBox
      ? { minX: Math.min(railBox.minX, x), minY: Math.min(railBox.minY, y), maxX: Math.max(railBox.maxX, x), maxY: Math.max(railBox.maxY, y) }
      : { minX: x, minY: y, maxX: x, maxY: y };
  };
  for (const rail of rails) {
    /*
     * **One continuous light line** (author, 2026-09-01: "show the trail as a
     * continuous light coloured line"), where it was a dashed rubric hairline
     * from 2026-08-31. The dashes were reading as a border rather than as a
     * road, and a broken line down the middle of the picture competes with
     * the dots for the eye it is supposed to lead. Light rather than pale:
     * the rubric at a third is still plainly the same red the dots are, which
     * is what says the road and the saint on it are one thing, and a hair
     * wider so that being fainter does not also make it thinner.
     *
     * Not gold, which would read as the obvious "light" answer here: §7 gives
     * gold to the veneration finding and to nothing else, and a second
     * category taking it would be the exception swallowing the rule.
     */
    ctx.globalAlpha = dimFor(rail.state);
    ctx.strokeStyle = hexWithAlpha(rubric, 0.33);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    // The wandering curve, not the straight line between the stays
    // (`lib/map-track.js`, author 2026-08-31: "make the rail a bit more
    // twisty imitating a more messy realistic path between places"). It is
    // sampled in lon/lat rather than in pixels, so the same road bends the
    // same way at every zoom — and it is the same curve the dot rides.
    trackPath(rail.track).forEach((stop, i) => {
      const p = place(stop.lon, stop.lat, frame);
      spanRail(p.x * w, p.y * h);
      if (i === 0) ctx.moveTo(p.x * w, p.y * h);
      else ctx.lineTo(p.x * w, p.y * h);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  map.drawnDots = [];
  /*
   * **Which name wins when two cannot both have one**, and which saint a
   * collapsed crowd is drawn as. Lower is better, and the order is the
   * reader's own attention rather than the corpus's:
   *
   *   0  the saint they chose — never buried inside a mark, never unnamed;
   *   1  a saint whose dot is moving (author, 2026-09-01: a name prints over
   *      the others while its dot is travelling), because a mark in motion
   *      that the reader cannot name is the one thing on the picture actively
   *      asking a question;
   *   2+ everyone else, by `dailyRank` — the Daily page's own precedence,
   *      a saint some church sings for above a saint with an icon above the
   *      rest, so the name a crowd prints is the name that page would lead
   *      with (author, same message).
   *
   * Every tier is a property of the saint or of this frame, so it is stable
   * from paint to paint: a name does not swap for its neighbour's because the
   * reader nudged the map a pixel.
   *
   * **Inside a tier, a saint with a rail comes first**, which is a tie-break
   * and not a fifth tier — it never lifts anyone above the order above. It
   * earns its place at the Caves in Kyiv, where John the Long-Suffering and
   * Moses the Hungarian share one coordinate and one `dailyRank`: the mark
   * has to be one of them, no zoom can ever separate two identical points,
   * and Moses is the one with a journey to show. Ties past that fall to the
   * corpus's own order, which is the manifest's and is stable for a build.
   */
  const rankOf = (d) =>
    (d.card.slug === map.selected ? 0 : d.moving ? 1 : 2 + dailyRank(d.card)) * 2 + (d.card.track?.length ? 0 : 1);

  /*
   * How far back everything that is not the chosen saint currently stands —
   * one eased number for the whole paint, stepped once here so the halo, the
   * dot and the name all fall back together rather than each reading the
   * clock a moment apart.
   */
  const otherDim = stepSelectFade(gliding);
  const dimOf = (slug) => (slug === map.focus ? 1 : otherDim);

  /*
   * **Dots the reader cannot tell apart become one mark, at a real
   * coordinate** (`lib/map-view.js`'s `mergeDots`, 2026-09-01). What stood
   * here until then spread them into rings a fixed number of screen pixels
   * wide, which put the crowd at Constantinople on ground none of them stood
   * on — out across the Bosphorus and into the Black Sea at low zoom — and
   * never resolved, because a ring drawn in pixels is the same ring at 240×
   * as at 1×.
   *
   * Merging is the opposite trade: fewer marks, every one of them true. The
   * members separate as the reader zooms and their pixel distance grows past
   * `MERGE_PX`, so the map reveals its own crowds instead of pretending to
   * have drawn them already, and saints at one identical coordinate stay one
   * mark carrying `n` — which no zoom could ever honestly split.
   */
  const fanned = mergeDots(onScreen, undefined, rankOf);

  /*
   * **Which blob is open, if any** — the one the screen's own centre sits
   * nearest, across every coordinate this frame drew with more than
   * `BLOB_MAX` members, once every one of that coordinate's own dots has
   * separated far enough to be its own mark. Before that a still-partly-merged
   * blob is left exactly as `fanned` already drew it — a plain crowd mark
   * saying "+N more" — since there is no clean outline to draw around dots
   * that have not yet resolved into real, individual positions.
   */
  const blobMarks = new Map();
  for (const mark of fanned) {
    if (!mark.blobId) continue;
    if (!blobMarks.has(mark.blobId)) blobMarks.set(mark.blobId, []);
    blobMarks.get(mark.blobId).push(mark);
  }
  const readyBlobs = [...blobMarks.entries()]
    .filter(([, marks]) => marks.length === marks[0].blobSize && marks.every((m) => m.n === 1))
    .map(([id, marks]) => {
      const cx = marks.reduce((s, m) => s + m.x, 0) / marks.length;
      const cy = marks.reduce((s, m) => s + m.y, 0) / marks.length;
      const hull = marks.length >= 3 ? inflateHull(convexHull(marks.map((m) => ({ x: m.x, y: m.y }))), BLOB_HULL_PAD) : null;
      return { id, marks, cx, cy, hull };
    });
  map.drawnBlobs = readyBlobs;
  /*
   * **`activeBlobId` answers only to the screen's own centre, never to a
   * hover** — sticky, the same shape `scatter-mockup/blobs.html` worked out:
   * the blob that was open stays open until the centre is a real margin past
   * its own edge, not merely across the line, or a reader whose drag stops
   * near two blobs' shared boundary would watch the names swap on every
   * pixel.
   */
  const screenCentre = { x: w / 2, y: h / 2 };
  let centredBlob = null;
  if (readyBlobs.length) {
    const current = readyBlobs.find((b) => b.id === map.activeBlobId);
    if (current) {
      const inside = current.hull
        ? pointInHull(screenCentre, current.hull)
        : Math.hypot(screenCentre.x - current.cx, screenCentre.y - current.cy) < MERGE_PX;
      const away = current.hull
        ? distToHull(screenCentre, current.hull)
        : Math.hypot(screenCentre.x - current.cx, screenCentre.y - current.cy);
      if (inside || away <= BLOB_HYSTERESIS_PX) centredBlob = current;
    }
    if (!centredBlob) centredBlob = readyBlobs.find((b) => b.hull && pointInHull(screenCentre, b.hull)) ?? null;
    if (!centredBlob) {
      let bestD = Infinity;
      for (const b of readyBlobs) {
        const d = Math.hypot(b.cx - screenCentre.x, b.cy - screenCentre.y);
        if (d < bestD) {
          bestD = d;
          centredBlob = b;
        }
      }
    }
  }
  map.activeBlobId = centredBlob ? centredBlob.id : null;
  /*
   * **A hovering mouse previews a blob without leaving a mark** (author,
   * 2026-09-04: "on desktop only, when you hover your mouse over a blob,
   * its the same function as moving the centre of the screen over the
   * blob"). `openBlob` — what this paint actually draws open — takes the
   * hovered blob first, but `activeBlobId` above never learns about it: the
   * moment the pointer leaves, the picture returns to exactly the blob the
   * centre rule already had, rather than the hover having quietly become
   * the new sticky choice. `hoveredBlobId` is only ever set from a
   * `pointerType: 'mouse'` event (`wirePress`), so a touch reader never
   * takes this branch and the centre rule is the whole of their answer.
   */
  const openBlob = (map.hoveredBlobId && readyBlobs.find((b) => b.id === map.hoveredBlobId)) || centredBlob;
  map.openBlobId = openBlob?.id ?? null;
  // Every dot in a *ready* blob that is not the open one — excluded from
  // naming below, whatever `layoutLabels` would otherwise have room for.
  const blobSilenced = new Set();
  for (const b of readyBlobs) {
    if (b === openBlob) continue;
    for (const m of b.marks) blobSilenced.add(m.card.slug);
  }

  /*
   * **A blob's own outline, under everything it holds** (2026-09-04). Only a
   * ready blob of three or more has a hull to draw; the rare one- or
   * two-member remainder of an uneven split is left as the plain dots
   * `fanned` already drew, which is honest about there being no shape to a
   * pair.
   */
  for (const b of readyBlobs) {
    if (!b.hull) continue;
    // Ink, not gold: §7 gives gold to the veneration finding alone (see the
    // rail's own comment a few hundred lines up), and which blob is open is
    // a fact about where the reader is looking, not a claim about a saint.
    const isOpen = b === openBlob;
    ctx.beginPath();
    blobHullPath(ctx, b.hull);
    ctx.closePath();
    ctx.fillStyle = hexWithAlpha(ink, isOpen ? 0.1 : 0.05);
    ctx.fill();
    ctx.strokeStyle = hexWithAlpha(ink, isOpen ? 0.4 : 0.2);
    ctx.lineWidth = isOpen ? 1.4 : 1;
    ctx.stroke();
  }

  /*
   * **Every glow is composited on its own layer and laid down once, at
   * `GLOW_MAX`** (author, 2026-08-31: "overlaps create opaque glow that
   * completely hides the map underneath. Make sure the glow never exceeds
   * 50% opacity").
   *
   * Drawing each halo straight onto the picture could not honour that:
   * alpha compositing is `1-(1-a)^n` over n overlapping halos, so three at
   * 0.45 already reach 0.83 and a cluster of eight is effectively opaque —
   * capping the *per-halo* alpha only moves which n hides the coastline.
   * Painting them all onto a transparent layer first means they merge
   * amongst themselves however they like, and the single `drawImage` that
   * puts that layer onto the picture is the only place alpha reaches the
   * map — so the darkest pixel the coastline can ever see is exactly
   * `GLOW_MAX`, whether one saint is under the pointer or forty.
   *
   * The layer is per-paint rather than cached: it is the size of the
   * picture, and every pan and zoom moves every halo on it anyway.
   */
  /*
   * **A halo is one of the two things the filter boxes take away**, the name
   * being the other (2026-09-01). It is a claim about how sure the corpus is
   * of a place, so it belongs to a saint the reader is being shown rather
   * than to every mark on the ground; unticked, a saint outside the range
   * keeps their dot and loses the claim. `future` was already treated this
   * way — a halo is a claim about a place someone *was* — and this is that
   * same rule reaching `past` through a control instead of being hard-coded
   * for one of the two states.
   */
  /*
   * **A halo is for a saint the range actually reaches, and for nobody else**
   * (author, 2026-09-02: "For saints outside of the timeline selection, even
   * when they are ticked to be shown in the filters as unborn or dead, make
   * sure they dont have a glow to them. Only saints in the timeline selection
   * have a glow. So ticking to show outside of the timeline selection only
   * displays their names").
   *
   * This narrows what the filter boxes buy. They used to hand back the name
   * *and* the halo together; the halo is the uncertainty curve's own statement
   * about how firmly a place is fixed, and making it about saints the reader's
   * years do not reach was spending the picture's one graded mark on people
   * the picture is not currently about. So the boxes buy the name alone now,
   * which is also the simpler promise to state.
   *
   * `live` and nothing else — not even the chosen saint, who is dimmed rather
   * than exempted everywhere else on this pass.
   */
  const haloed = fanned.filter((d) => d.state === 'live');
  /*
   * How many halos this frame laid down. Published because the halo is drawn
   * on its own layer and composited once — there is no element to ask, and
   * reading the pixel under a dot measures the coastline, the layer and the
   * dot together. Written by the pass that draws, so doing nothing reads 0.
   */
  canvas.dataset.halos = String(haloed.length);
  if (haloed.length) {
    /*
     * **One offscreen canvas, kept and reused, not one made per frame**
     * (2026-09-02). At rest almost every located saint's halo shows, so
     * `haloed.length` is rarely zero — which meant a fresh full-resolution
     * canvas (over a million pixels at 2x DPR on a phone) was allocated and
     * thrown away on every single drag and zoom frame, the exact frame this
     * layer exists to keep cheap. Kept on the visible canvas itself so a
     * second map on the page, if there ever is one, does not share it;
     * resized only when the picture's own backing store changes size, and
     * cleared every frame it is drawn into rather than replaced.
     */
    let layer = canvas.__haloLayer;
    if (!layer) {
      layer = document.createElement('canvas');
      canvas.__haloLayer = layer;
    }
    if (layer.width !== canvas.width || layer.height !== canvas.height) {
      layer.width = canvas.width;
      layer.height = canvas.height;
    }
    const lc = layer.getContext('2d');
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.clearRect(0, 0, w, h);
    for (const { where, x, y, card } of haloed) {
      // Everything but the chosen saint falls back while one is chosen — on
      // the layer, so the single `GLOW_MAX` composite below still bounds the
      // whole of it however many halos overlap.
      lc.globalAlpha = dimOf(card.slug);
      /*
       * The uncertainty curve's first shipping consumer (DESIGN.md §6b),
       * scaled by the zoom as well as by the picture's width: the doubt is a
       * distance on the ground, so a halo that stayed the same size in
       * pixels would claim a tighter place the further in the reader went.
       * §6b permits scaling the curve linearly and forbids reshaping it,
       * which is exactly this multiplication.
       *
       * **The ceiling is drawing rather than doubt, and it had to come
       * down** (2026-08-31). It was `w / 2` — chosen when `MAX_SCALE` was
       * 12, where it never bound. At 120 it binds constantly: every halo
       * became a 640 px disc, a dozen of them covered the picture, and
       * capping the *alpha* at 50% (below) could not help, because 50% of a
       * fully saturated wash is still a fully saturated wash. An eighth of
       * the smaller side is large enough to still read as doubt about a
       * place and small enough that the ground stays visible under a
       * cluster, which is the whole point of the halo being translucent.
       */
      const halo = Math.min(
        (softness(where.uncertainty_km) * (w / 360) * map.view.scale) / frame.fx,
        Math.min(w, h) / 8,
      );
      if (halo <= 1) continue;
      const glow = lc.createRadialGradient(x, y, 0, x, y, halo);
      // Full strength on the layer; `GLOW_MAX` is applied once, below.
      glow.addColorStop(0, hexWithAlpha(rubric, 1));
      glow.addColorStop(1, hexWithAlpha(rubric, 0));
      lc.fillStyle = glow;
      lc.beginPath();
      lc.arc(x, y, halo, 0, Math.PI * 2);
      lc.fill();
    }
    ctx.save();
    ctx.globalAlpha = GLOW_MAX;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  for (const { card, state, x, y, n, moving, members, blobId } of fanned) {
    /*
     * A saint outside the reader's chosen span is dimmed rather than
     * removed (author, 2026-08-31), and by how much says which side of it
     * they fall on: one who had already died is greyed, one not yet born is
     * "greyed out twice as much" — twice as far toward the ground, so the
     * three states are told apart by depth rather than by hue, and none of
     * them is carried by colour alone. Times `SELECT_DIM` for everyone the
     * reader did not choose, once one is chosen (2026-09-01).
     */
    const alpha = dimFor(state) * dimOf(card.slug);
    ctx.globalAlpha = alpha;
    /*
     * **A saint not yet born is drawn in ink, not in rubric** (author,
     * 2026-09-02: "make any saints not yet born appear as a grey/black (fit
     * into colour scheme) dot instead of a coloured red dot").
     *
     * Rubric is the site's mark for a finding about a saint, and a dot for
     * someone the reader's range has not reached yet is the one dot on the
     * picture making no claim about them — it is there so the map does not
     * appear to lose people as the years are dragged. `--ink-soft` is the
     * quiet grey the coastline itself is drawn in, so the unborn fall back
     * into the ground rather than reading as a second kind of finding. The
     * depth-dimming below is unchanged, so the three states are still told
     * apart without colour having to carry any of it alone.
     */
    ctx.fillStyle = state === 'future' ? inkSoft : rubric;
    ctx.beginPath();
    /*
     * **A mark standing for a crowd is drawn bigger, and says how many in
     * its name.** It grows as the log of the count, not with it: twenty-four
     * martyrs at one coordinate are a 7 px mark rather than a 60 px one, and
     * the difference between one saint and two is still plain. This is the
     * whole of what a merged mark does differently — it is not a cluster
     * bubble with its own visual language, it is the same dot saying that
     * more of the same are underneath it.
     */
    ctx.arc(x, y, n > 1 ? Math.min(6.5, DOT_R + Math.log2(n)) : DOT_R, 0, Math.PI * 2);
    ctx.fill();
    // A hairline in the page's ink so a dot on a dark coastline still reads.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const plain = saintName(card);
    map.drawnDots.push({
      x,
      y,
      state,
      n,
      moving,
      alpha,
      // Which of the two inks this mark was actually filled with. Published
      // because the picture is one opaque image to the suite: reading the
      // colour off the canvas would measure whatever else has been drawn at
      // that pixel, and the draw pass is the one thing that knows.
      hue: state === 'future' ? 'ink' : 'rubric',
      card,
      slug: card.slug,
      plain,
      // Everyone this mark stands for, best-ranked first — what a second
      // press on it steps through, so a saint merged into somebody else's
      // mark is still reachable at a zoom that can never separate them.
      members: members.map((m) => m.card),
      // What the label pass measures and the paint prints. A merged mark
      // carries its own count, so the reader is told there is more here
      // rather than being left to discover it by zooming.
      name: n > 1 ? fill(STRINGS.map.andMore, { name: plain, count: n - 1 }) : plain,
      // Which blob this dot belongs to, once its coordinate has more than
      // `BLOB_MAX` members — undefined for everyone else, same as `card`'s
      // own `blobId` was, so a dot from an ordinary coordinate carries none
      // of this new machinery at all.
      blobId,
    });
  }

  /*
   * Names arrive with the zoom (§8.3: "Zoom in to reveal more dots, then
   * labels"), laid out by `lib/map-labels.js` — which clusters the dots and
   * stacks a crowded cluster's names in a column with a leader line each,
   * rather than the old pass's "place it to the right or drop it" (author,
   * 2026-08-31: "Identify clusters of saints and then stack them with
   * leader lines showing which dot is which text").
   */
  const labelsEnabled = map.view.scale >= LABELS_AT;
  ctx.font = `12px ${style.getPropertyValue('--font-utility').trim() || 'sans-serif'}`;
  /*
   * **A saint the reader's range does not reach is a dot and no name** —
   * for the unborn since 2026-08-31 (author: "before a saint is born, dont
   * display their names anymore, just the dot"), and for the dead as well
   * since the filter boxes arrived on 2026-09-01. The reasoning is the one
   * the first instruction gave and the boxes generalised: a name is legible
   * enough to read as a claim about someone the range has not reached, and
   * it costs the saints who *are* in range the room it takes, the layout
   * being a fight over one picture's worth of space. `layoutLabels` never
   * sees them, so the room goes to the saints the reader asked about.
   */
  const nameable = map.drawnDots.filter(
    (d) => d.slug === map.selected || (shownState(d.state) && !blobSilenced.has(d.slug)),
  );
  /*
   * **Laid out best-ranked first**, which is what makes `rankOf` a ranking
   * of *names* rather than of dots: `layoutLabels` seats one cluster at a
   * time against what is already placed, so whoever is first is laid out
   * with the whole picture still free and whoever is last takes what is
   * left. The chosen saint is rank 0 and so is named at any zoom — the
   * `Profile ›` button goes "next to their name", and below `LABELS_AT`
   * there would otherwise be no names at all to be next to.
   */
  const chosen = map.selected ? nameable.find((d) => d.slug === map.selected) : null;
  const order = [...nameable].sort((a, b) => rankOf(a) - rankOf(b));
  const measure = (name) => ctx.measureText(name).width;
  /*
   * **Every dot on the picture is an obstacle a label must clear, named or
   * not** (2026-09-04, author: "never overlaps another dot") — the same
   * radius the draw pass below gives each mark, so a name avoids a crowd
   * mark's own bigger circle rather than the plain dot's.
   */
  const obstacles = map.drawnDots.map((d) => ({ x: d.x, y: d.y, r: d.n > 1 ? Math.min(6.5, DOT_R + Math.log2(d.n)) : DOT_R }));
  const laid = labelsEnabled
    ? layoutLabels(order, measure, w, h, map.view.scale >= LEADERS_AT, obstacles)
    : chosen
      ? /*
         * **`leaders: true`, not `false`, here** — a single item makes the
         * two mean the same grouping either way (`clusterDots` of one dot is
         * one group, same as skipping it), so this is not the "thirty lines
         * fanning across the Mediterranean" case `leaders: false` exists to
         * avoid — it only decides whether the one name on the whole picture
         * gets a leader line rather than going unnamed when its own right
         * side has nowhere to go (a crowded neighbour, or a dot the newer
         * obstacle-avoidance is now keeping it off). "The chosen saint is
         * named whatever the zoom" is the harder rule; the button beside
         * their name needs a name to sit beside.
         */
        layoutLabels([chosen], measure, w, h, true, obstacles)
      : [];
  /*
   * **A guarantee, not a hope, for the chosen saint above `LABELS_AT` too.**
   * Being sorted first only gives them the emptiest picture to be laid out
   * against — it was never a promise, and the newer obstacle-avoidance can
   * now fail a rank-0 dot outright where an ordinary neighbour would simply
   * have taken the other side (author, 2026-08-31: the button "next to their
   * name" needs a name there to be next to). A second, permissive pass for
   * just this one dot only runs on that rare miss, and only adds to `laid`
   * rather than replacing it, so every other name keeps exactly the seat the
   * first pass gave it.
   */
  if (labelsEnabled && chosen && !laid.some((l) => l.dot.slug === chosen.slug)) {
    const rescue = layoutLabels([chosen], measure, w, h, true, obstacles);
    if (rescue.length) laid.push(...rescue);
  }
  const placedFor = new Map(laid.map((l) => [l.dot.slug, l]));

  // One easing step per saint, drawn at whatever opacity it has reached —
  // 0 draws nothing, 1 is the label exactly as it always was, and anything
  // between is the fade actually happening.
  const now = performance.now();
  ctx.textBaseline = 'middle';
  let drawnLabels = 0;
  const named = [];
  /*
   * **Worst-ranked first, so the best-ranked name is painted last and lands
   * on top of anything it meets** (author, 2026-09-01: the chosen saint's
   * name "over all others at all zooms", and a moving saint's "over others
   * while its moving"). The layout already keeps two placed names from
   * overlapping, so this decides only the cases it cannot — a leader line
   * crossing a name, a label mid-fade-out still holding its old box — and in
   * those the name the reader is following is the one that wins.
   */
  for (const dot of [...map.drawnDots].sort((a, b) => rankOf(b) - rankOf(a))) {
    const label = placedFor.get(dot.slug);
    const opacity = stepLabelOpacity(dot.slug, Boolean(label), now);
    if (opacity <= 0) continue;
    // A label mid-fade-*out* has no placement of its own any more, so it
    // fades from the last one it held rather than jumping to the dot.
    const at = label ?? labelLastAt.get(dot.slug);
    if (!at) continue;
    if (label) labelLastAt.set(dot.slug, label);
    // The dot's own dimming carries to its name: a greyed saint with a
    // full-strength label would read as two different claims about one dot.
    // `dot.alpha` is that dimming and the chosen-saint fade together, so a
    // name never argues with the mark it belongs to about either.
    ctx.globalAlpha = opacity * dot.alpha;
    if (at.leader) {
      // The line first, so the text sits over it rather than under.
      ctx.strokeStyle = hexWithAlpha(inkSoft, 0.55);
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(at.leader.x1, at.leader.y1);
      ctx.lineTo(at.leader.x2, at.leader.y2);
      ctx.stroke();
    }
    ctx.fillStyle = ink;
    ctx.fillText(dot.name, at.x, at.y);
    // The name is a press target too (author, 2026-08-31), so where it
    // landed goes back on the dot for `dotAt` to hit-test — the same
    // draw-pass-writes-the-hit-map rule `data-dots` keeps.
    if (label) dot.labelRect = label.rect;
    drawnLabels++;
    // Only a name that currently holds a placement, so a label on its way out
    // does not read as one the layout chose this frame.
    if (label) named.push(dot.slug);
  }
  ctx.globalAlpha = 1;

  /*
   * **A silenced blob prints its own count instead of its members' names**
   * (2026-09-04) — bare (`STRINGS.map.blobCount`, "+{count}"), not routed
   * through the same `layoutLabels` call as a name: a blob's count belongs to
   * the whole group, at its own outline, not to any one dot inside it, so it
   * runs through `layoutBlobLabels` instead — clearing every name already
   * seated and every dot on the picture the same way, and always on a leader
   * line back to the blob's own centre, never bare against the picture
   * (author, 2026-09-04: "for the blobs you will always need leader lines no
   * matter how far you zoom in"). The open blob prints nothing here — its
   * members are named individually, above, like any other dot.
   */
  const blobLabelsIn = readyBlobs
    .filter((b) => b !== openBlob)
    .map((b) => ({
      id: b.id,
      cx: b.cx,
      cy: b.cy,
      maxX: Math.max(...b.marks.map((m) => m.x)),
      name: fill(STRINGS.map.blobCount, { count: b.marks.length }),
    }));
  const blobLaid = layoutBlobLabels(
    blobLabelsIn,
    measure,
    w,
    h,
    laid.map((l) => l.rect),
    obstacles,
  );
  const blobById = new Map(readyBlobs.map((b) => [b.id, b]));
  const blobNameById = new Map(blobLabelsIn.map((b) => [b.id, b.name]));
  for (const bl of blobLaid) {
    const rep = blobById.get(bl.id).marks[0];
    ctx.globalAlpha = dimFor(rep.state) * dimOf(rep.card.slug);
    ctx.strokeStyle = hexWithAlpha(inkSoft, 0.55);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(bl.leader.x1, bl.leader.y1);
    ctx.lineTo(bl.leader.x2, bl.leader.y2);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.fillText(blobNameById.get(bl.id), bl.x, bl.y);
  }
  ctx.globalAlpha = 1;

  placeProfile(canvas, placedFor.get(map.selected) ?? null);

  /*
   * The count of drawn labels, published for the suite. An instrument, so the
   * standing question applies - what would it look like if it were doing
   * nothing? Zero, always: it is written by the same pass that draws, so a
   * paint that never labels writes '0' and the test's zoomed half goes red
   * rather than green-by-absence.
   */
  canvas.dataset.labels = String(drawnLabels);
  /*
   * *Which* names, not only how many (2026-09-01). The count cannot answer
   * the question the ranking raises — whether the name a crowded picture
   * gave the room to is the one the Daily page would have led with — and a
   * test that reads it off the ink instead would be measuring the font. Same
   * pass, same rule: a paint that named nobody writes '[]'.
   */
  canvas.dataset.named = JSON.stringify(named);
  /*
   * The hit-map, published for the press test: same pass, same rule - a paint
   * that drew nothing writes '[]' and the pressing half goes red.
   *
   * `n` and `alpha` joined it on 2026-09-01 and are instruments for the two
   * things that paint added — how many saints a mark stands for, and how far
   * back everything falls while one is chosen. Both have the doing-nothing
   * answer the standing question asks for: with nothing merged every `n` is
   * 1, and with nobody chosen every `alpha` is the dimming the timeline
   * alone would give, so neither can read as working by being absent.
   *
   * `label` joined 2026-09-04, the "honest repair" the flaky press test was
   * left waiting for (comment above `'a name is a press target'` in
   * `e2e/map.spec.js`): the box a name was actually drawn in this frame, the
   * same one `dotAt` above already hit-tests against, so a test can press a
   * name by reading where it landed rather than guessing 80 px and racing
   * the flight that moves it. `drawnDots` is rebuilt from empty every paint
   * (line ~3286), so a dot with no label drawn this frame has no stale
   * `labelRect` left over from the last one — doing nothing still writes
   * `null`, never a leftover box.
   */
  canvas.dataset.dots = JSON.stringify(
    map.drawnDots.map((d) => ({
      x: Math.round(d.x),
      y: Math.round(d.y),
      slug: d.slug,
      state: d.state,
      n: d.n,
      alpha: Math.round(d.alpha * 100) / 100,
      hue: d.hue,
      blobId: d.blobId ?? null,
      label: d.labelRect
        ? {
            x: Math.round(d.labelRect.x),
            y: Math.round(d.labelRect.y),
            w: Math.round(d.labelRect.w),
            h: Math.round(d.labelRect.h),
          }
        : null,
    })),
  );
  // Which saint is mid-walk along their own rail, or '' — the walk is 5 s
  // long and a test that measured a dot inside it would be reading a
  // position that is still moving.
  canvas.dataset.walking = map.railPlay?.slug ?? '';
  /*
   * Who is chosen, and how many journeys were actually stroked for them.
   * Both written by the pass that draws, so doing nothing reads `''` and
   * `0` — a selection that never reached the picture cannot look like one
   * that did.
   */
  canvas.dataset.selected = map.selected ?? '';
  canvas.dataset.rails = String(rails.length);
  // Where the rail was actually stroked, rounded to whole px — '' when none
  // was, so a paint that drew no journey cannot read as one that framed one.
  canvas.dataset.rail = railBox
    ? JSON.stringify({
        x: Math.round(railBox.minX),
        y: Math.round(railBox.minY),
        w: Math.round(railBox.maxX - railBox.minX),
        h: Math.round(railBox.maxY - railBox.minY),
      })
    : '';
  /*
   * How many blobs are drawn this frame, and which one is open — written by
   * the pass that draws, so a paint with no crowd over `BLOB_MAX` reads `0`
   * and `''` rather than looking like a feature that never ran.
   * `blobCounts` is each blob's own size in the same order `data-blobs`
   * counts, since a test asking "did the 27 split 8/6/7/6" cannot get that
   * from a total alone.
   */
  canvas.dataset.blobs = String(readyBlobs.length);
  canvas.dataset.blobOpen = openBlob?.id ?? '';
  canvas.dataset.blobCounts = JSON.stringify(readyBlobs.map((b) => b.marks.length));

  /*
   * However this paint was triggered, it is the one place that knows
   * whether any label is still mid-fade — so it is the one place that
   * decides whether another frame is owed. Cancelled at the top of every
   * call rather than left to expire on its own, so a paint that arrives for
   * an unrelated reason mid-fade does not end up with two of these racing.
   */
  const stillFading = [...labelState.values()].some((s) => s.value !== s.target);
  // The fall-back is the same kind of debt as a label mid-fade: it owes a
  // frame until it has arrived, and nothing else on the page will ask for one.
  const stillDimming = selectFade.value !== (map.focus ? 1 : 0);
  if (stillFading || stillGliding || map.railPlay || stillDimming) {
    map.fadeFrame = requestAnimationFrame(() => {
      map.fadeFrame = null;
      if (canvas.isConnected) paintCanvas(canvas, cards);
    });
  }
}

/**
 * Puts the `Profile ›` button beside the chosen saint's name, or takes it
 * away. `label` is that saint's own entry from the label pass, or `null` —
 * which covers all three ways there is nothing to sit beside: nobody
 * chosen, their dot panned off the picture, or their name still fading in.
 *
 * The button is in the document rather than on the canvas, so it is placed
 * in the canvas's own CSS pixels — `.map-picture` is the canvas's box
 * exactly, which is what makes the two coordinate systems the same one.
 * It flips to the left of the name when the right would take it off the
 * edge, the same choice `layoutLabels` makes for the name itself.
 */
function placeProfile(canvas, label) {
  const button = canvas.parentElement.querySelector('[data-profile]');
  if (!button) return;
  if (!label) {
    button.hidden = true;
    return;
  }
  const dot = map.drawnDots.find((d) => d.slug === map.selected);
  button.querySelector('[data-profile-label]').textContent = STRINGS.map.profile;
  // The saint's own name, never the merged mark's "and 23 more" label: the
  // button opens one profile and says whose.
  button.setAttribute('aria-label', fill(STRINGS.map.profileOf, { name: dot?.plain ?? '' }));
  button.hidden = false;
  const width = button.offsetWidth;
  const box = canvas.getBoundingClientRect();

  /*
   * **Beside the name if it fits, and under it when it does not.**
   *
   * Beside means the far side of the name from the dot, so the three read
   * along one line — dot, name, button, or the mirror of that. Sitting it
   * always after the name's right edge put it *between* a left-hand name and
   * the dot it belongs to, which reads as a label for the wrong thing.
   *
   * The second rule is not an edge case on a phone, it is the common one: a
   * saint the map has just centred has their dot in the middle of a 390 px
   * picture, and a long name plus this button is wider than either half. The
   * old answer was to clamp the button back onto the picture, which slid it
   * over the last third of the name. Under the name, aligned to its start,
   * always fits — the button is narrower than any name that needed it.
   */
  const gap = 6;
  const nameIsLeft = dot ? label.rect.x + label.rect.w <= dot.x : false;
  const near = nameIsLeft ? label.rect.x - width - gap : label.rect.x + label.rect.w + gap;
  /*
   * The far side runs back past the dot, so it is held clear of it: the
   * button's own border landing on the 2.5 px mark it belongs to hid the
   * one thing on the picture that says where the saint actually is.
   */
  const behind = label.rect.x - width - gap;
  const far = nameIsLeft ? label.rect.x + label.rect.w + gap : Math.min(behind, (dot?.x ?? Infinity) - gap - width);
  const fits = (x) => x >= 0 && x + width <= box.width;
  const beside = fits(near) ? near : fits(far) ? far : null;

  button.style.left = `${beside ?? Math.max(0, Math.min(label.rect.x, box.width - width))}px`;
  button.style.top = `${beside === null ? label.y + label.rect.h : label.y}px`;
}

/**
 * A colour from the stylesheet at a given alpha. The tokens are hex, but a
 * theme is free to make one an `rgb()`, so this handles both rather than
 * assuming the palette's current spelling.
 */
function hexWithAlpha(colour, alpha) {
  const hex = /^#([0-9a-f]{6})$/i.exec(colour.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(colour.trim());
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((v) => parseFloat(v));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return colour;
}

/**
 * Traces a blob's own inflated hull as a rounded shape rather than a
 * polygon with corners — the cheap "blobify a hull" trick `scatter-mockup
 * /blobs.html` worked out: each edge's own midpoint is a curve anchor, so a
 * hull vertex rounds off instead of staying a point. Appends to whatever
 * path is already open on `ctx`, the same contract `tracePath` (above)
 * keeps for the coastline.
 */
function blobHullPath(ctx, hull) {
  if (hull.length < 2) return;
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const n = hull.length;
  const m0 = mid(hull[n - 1], hull[0]);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i += 1) {
    const next = hull[(i + 1) % n];
    const m = mid(hull[i], next);
    ctx.quadraticCurveTo(hull[i].x, hull[i].y, m.x, m.y);
  }
}
