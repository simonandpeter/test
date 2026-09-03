import { PERIODS, spanOf } from '../data/periods.js';
import { PLACES } from '../data/places.js';
import { lifeInterval } from '../lib/index-filters.js';
import { dailyRank, layoutLabels } from '../lib/map-labels.js';
import { lifeBounds, pointOn, progressAt, trackPath } from '../lib/map-track.js';
import { HOME, MAX_SCALE, MIN_SCALE, clampCentre, clampView, coverFractions, fitBounds, maxScaleFor, mergeDots, panBy, spreadShared, toScreen, toWorld, zoomAbout } from '../lib/map-view.js';
import { ASPECT, project } from '../lib/mercator.js';
import { softness } from '../lib/uncertainty.js';
import { saintName } from '../lib/honorific.js';
import { STRINGS, fill } from '../ui/strings.js';
import { escapeHtml as esc } from '../lib/markdown.js';

export const title = () => STRINGS.map.title;

/**
 * Where the saints were, on a flat map.
 *
 * **Not the globe §8.3 describes** (author, 2026-08-29: "just do a simple
 * mercator projection 2d map for now, something very light"). The orthographic
 * `d3-geo` globe with drag-to-rotate is deferred rather than refused, and the
 * brief's reasoning for it still stands; what shipped instead needs no runtime
 * dependency at all, because Mercator is arithmetic (`lib/mercator.js`) and the
 * only weight is the picture's own data — coastline, lakes and rivers,
 * `data/land.js` and `data/water.js` — in the map's own chunk, loaded when
 * this view is opened and never on the boot path. Both moved from Natural
 * Earth's 110m tier to its 50m one (2026-08-31), which is most of that
 * chunk's ~211 kB gzipped: a deliberate trade of "very light" for "can
 * actually zoom in on", made once the corpus's own located count made a
 * closer look worth taking.
 *
 * **The density-paced brush stays deferred, and the reason is the corpus
 * rather than the effort.** §8.3's fuller vision — fading saints in and out
 * by how crowded their years are — would be machinery verified against
 * nothing at 60 of 851 saints located. Collide-detected *labels* shipped
 * anyway (2026-08-30, `paintCanvas`'s overlap-drop): a label overlap is
 * something sixteen points could already demonstrate. And a *dot*-level
 * spread (`lib/map-view.js`'s `declutter`, 2026-08-31) is not the density
 * question either — John the Long-Suffering and Moses the Hungarian die at
 * the same rounded coordinate, and no zoom level would ever separate two
 * identical points, so leaving them stacked was a correctness gap rather
 * than an unexercised threshold.
 *
 * **The timeline is not one of those, by author instruction** (2026-08-30
 * evening: "add a timeline bar at the bottom ... where you can filter saints
 * by date on the map"), which overrides the corpus-blocked deferral above for
 * a plain range filter. What is built: a dual-handle range over each located
 * saint's own life span. The rail's own ends come from the Index's
 * `lifeInterval`; judging one life against the range is `lifeBounds`
 * (`lib/map-track.js`), which differs on exactly one point and it is the
 * point that matters here — an interval open at its start reaches back
 * forever under `overlaps`, and Moses the Hungarian's dot was lit six
 * hundred years before the birth the corpus does bound. An undated life is
 * never excluded — there is nothing to judge it against, and the map has no
 * tray left to set it aside in (Amendment 77) — so it always shows,
 * indifferent to the slider.
 * The two handles drag independently (each is a native `<input
 * type="range">`, keyboard-operable for free); the highlighted span between
 * them is a third grab target (`wireTimeline`'s pointer handlers on
 * `.map-timeline-fill`, 2026-08-31) that moves both handles together and
 * keeps their width fixed, for a reader panning the same-length window
 * across the years rather than resizing it one edge at a time.
 *
 * **The page is the map and a small footer, nothing else** (author,
 * 2026-08-30: "remove everything on the map page outside of the map itself
 * except for leaving a small footer with the coastline map credit and scroll
 * to zoom hint"). That reversed Amendment 76's below-map reading a day after
 * it shipped - the lede, the Index's facets, the Places register and the
 * unlocated tray are gone, and with them the "list is the map" answer to the
 * canvas being one opaque image to a screen reader. What remains for a reader
 * not looking at the picture: the labelled canvas, the kind counts in the
 * legend, and the Index itself, which still names every saint the dots do.
 * That trade is the author's, recorded in Amendment 77 rather than absorbed.
 */

/*
 * The kinds the data actually records. The brief names birth / death / relics /
 * ministry; the corpus records a bishop's `see` where the brief says ministry,
 * so this follows the data — a selector offering a kind no saint carries is a
 * control that does nothing.
 *
 * Death first and default, per §8.3: it is the one kind almost every saint has,
 * and where a martyr died is the fact their commemoration is usually built on.
 */
const KINDS = ['death', 'birth', 'see', 'relics'];
const DEFAULT_KIND = 'death';

/** The reader's chosen kind, held for the visit and not persisted — the same
 *  standing the Index's two faces have. */
let kind = DEFAULT_KIND;

/** The live resize listener, so `destroy` can take it off again. */
let onResize = null;

/**
 * Everything else this view attached outside its own root — anything on
 * `document` or `window` outlives the element the router throws away, so it
 * has to be taken off by hand or it is a leak per navigation rather than
 * per page. `destroy` drains this.
 */
let cleanups = [];

/*
 * The Index's filter set lived here for one day (Amendment 76, 2026-08-30)
 * and went with the reading it stood in when the author asked for the map
 * alone. The timeline is the first of it to return, and it returns exactly
 * as promised — drawn on the stage, because there is nowhere else left.
 */

/*
 * The timeline's own range, held for the visit like `kind`. `null` means "not
 * set for this session yet"; `render()` fills both from the corpus's own span
 * the first time the reader opens the map, and leaves them alone after that,
 * so a reader who narrows the range, leaves for a saint page, and comes back
 * finds the map exactly as they left it.
 */
let dateFrom = null;
let dateTo = null;

/**
 * The year the map is showing people *in*, as against the years it is showing
 * people *from* (author, 2026-09-01: "Add a triangle you can drag over the top
 * of the timeline bar selection ... It appears once Movement is ticked on. It
 * gets pushed around if the high or low dates make contact with it, otherwise
 * it starts by default on the highest year").
 *
 * **This separates two questions the upper handle had been answering at once.**
 * `pointAt` has always taken position from `dateTo` and dimming from the whole
 * range, and said so — but that made "which saints does my window reach" and
 * "what year am I watching" one control, so a reader who wanted to see the
 * eleventh century move had to shrink their window to a single year to do it.
 * The triangle is the second question given its own handle: the range still
 * decides who is lit, and this decides where they stand.
 *
 * It lives inside the range and is pushed by it rather than pushing back, which
 * is the author's own rule and the only one that keeps the control honest — a
 * "now" outside the window you are looking at is a claim about a year the map
 * has greyed out.
 *
 * `null` until the corpus's span is known, then the top of the range.
 */
let playhead = null;

/**
 * The year the movement mechanic reads: the triangle where there is one, the
 * upper handle otherwise.
 *
 * The fallback is not a fallback for long — `playhead` is set the moment bounds
 * exist — but it is what keeps a map with no timeline at all (a corpus with no
 * dated saint in it) drawing dots rather than throwing.
 */
const shownYear = () => (playhead === null ? dateTo : playhead);

/** What the last paint drew, in CSS px - the press's hit-map and the labels'. */
let drawnDots = [];

/**
 * The saint the reader has chosen, by slug, or `null`.
 *
 * **A press on a dot selects rather than navigates** (author, 2026-08-31),
 * which reverses "a dot is a door" (2026-08-30, Amendment 77) — the door is
 * now the `Profile ›` button that selection puts beside the name, and the
 * press itself buys the reader the thing a map is for: the saint centred,
 * named whatever the zoom, and their journey drawn. Reset by `render`, like
 * the view and unlike the timeline's range: arriving at the map with someone
 * still picked out from three pages ago is the same disorientation
 * `defaultView` exists to avoid.
 */
let selected = null;

/**
 * The centring flight, and it deliberately finishes before the selection
 * exists ("it first centres you smoothly on them and then shows their path
 * of travel"). Held so `destroy` and any second press can cancel it — two
 * flights running at once would fight over `view` frame by frame.
 */
let flyFrame = null;
const FLY_MS = 450;

/**
 * How close the flight to a saint's rail may end up, however short the rail.
 *
 * A journey between two stays a few miles apart would otherwise fit the
 * picture at 240×, which is a claim about the ground the coastline cannot
 * back and a view the reader would have to zoom out of before they knew what
 * country they were in. 30 is the search's own landing zoom, chosen there for
 * the same reason: close enough to read the name and its neighbours.
 */
const RAIL_FIT_MAX = 30;

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
 * The rail walk in progress: `{ slug, start }`, or `null`. Module state for
 * the same reason `selected` is — the paint pass is a pure function of it,
 * and `destroy` has to be able to end it.
 */
let railPlay = null;

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

/**
 * The saint the map is *attending to*, which is not the same as `selected`
 * and is why this exists. `selected` deliberately arrives only when the
 * flight lands — the author's own order, "first centres you smoothly on them
 * and then shows their path" — but the dimming has to begin at the press or
 * it is not happening "as the screen centres". So the press sets this, the
 * fade below reads it, and `selected` still waits for the landing.
 */
let focus = null;

/** How far the fall-back has got: 0 is the whole map at full strength, 1 is
 *  everyone but `focus` at `SELECT_DIM`. Eased in `paintCanvas`. */
const selectFade = { value: 0, lastT: 0 };

/**
 * Advances the fade toward wherever `focus` now puts it, and returns the
 * multiplier a saint who is *not* the chosen one is drawn at.
 *
 * Reduced motion arrives rather than travelling, the house rule everywhere
 * else on this page: the dimming carries the information (which saint the
 * map is attending to) and only the travelling is spared.
 */
function stepSelectFade(now) {
  const target = focus ? 1 : 0;
  const dt = Math.min(now - selectFade.lastT, 32);
  selectFade.lastT = now;
  if (reducedMotion()) selectFade.value = target;
  else if (selectFade.value < target) selectFade.value = Math.min(target, selectFade.value + dt / SELECT_FADE_MS);
  else if (selectFade.value > target) selectFade.value = Math.max(target, selectFade.value - dt / SELECT_FADE_MS);
  return 1 - (1 - SELECT_DIM) * selectFade.value;
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function cancelFlight() {
  if (flyFrame === null) return;
  cancelAnimationFrame(flyFrame);
  flyFrame = null;
}

/**
 * Eases the view to `target`, then calls `done`.
 *
 * **Under reduced motion the map arrives rather than travelling**, and `done`
 * still runs — the house rule is that reduced motion removes the animation
 * and never shortens it, and a selection that never completed would be the
 * control failing rather than the motion being spared.
 *
 * **The scale travels too, since 2026-09-01.** It did not until then, and the
 * comment here said why: the scale was the reader's and a saint chosen at 40×
 * stayed at 40×. What changed is what the flight is *for* — "it centres you
 * gently over its whole rail instead of one position" is a question about an
 * extent, and there is no honest way to frame an extent without choosing how
 * far out to stand. Geometrically rather than linearly, because zoom is
 * multiplicative everywhere else on this map (`ZOOM_STEP`, the wheel's own
 * `exp`): interpolating the number itself would rush the near end of a long
 * flight and crawl through the far one.
 *
 * Every frame is clamped, which a constant-scale flight did not need: two
 * valid views have valid views between them only while the scale holds still.
 * Zooming out mid-flight can pull a centre past the edge the world may not
 * leave, and an unclamped frame there is the Atlantic sliding off the side.
 */
function flyTo(target, frame, apply, done, max = MAX_SCALE) {
  cancelFlight();
  if (reducedMotion()) {
    apply(target);
    done();
    return;
  }
  const from = view;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / FLY_MS);
    const eased = 1 - (1 - t) ** 3;
    apply(
      clampView(
        {
          scale: from.scale * (target.scale / from.scale) ** eased,
          cx: from.cx + (target.cx - from.cx) * eased,
          cy: from.cy + (target.cy - from.cy) * eased,
        },
        frame,
        max,
      ),
    );
    if (t < 1) {
      flyFrame = requestAnimationFrame(step);
      return;
    }
    flyFrame = null;
    done();
  };
  flyFrame = requestAnimationFrame(step);
}

/** The threshold past which dots get their names (§8.3: "then labels"). */
const LABELS_AT = 2.5;

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
 * Below 5x the coarse tier is what is drawn even once the fine one has arrived,
 * because zooming back out must get the cheap frame back.
 *
 * Five is the author's number. It is also about where the coarse tier starts to
 * show its own edges — 0.1 degrees is 11 km, which is a pixel or two at 5x and
 * a visible staircase past it.
 */
const DETAIL_AT = 5;

/**
 * How long the coastline, lakes and rivers take to cross-fade between tiers
 * (2026-09-04: "make the appearance of the high quality coastlines and lakes
 * and rivers fade in/out instead of just appearing"). Short, on purpose — a
 * reader crossing `DETAIL_AT` mid-gesture is mid-zoom, not standing still to
 * watch a transition, so this only has to remove the pop, not choreograph one.
 */
const DETAIL_FADE_MS = 280;

/** One saint's mark. A merged mark grows from here — see `paintCanvas`. */
const DOT_R = 2.5;

/*
 * The play button's two faces. Drawn as glyphs rather than as an icon from
 * `ui/icons.js` because they are two triangles and two bars — the one place
 * on this page where the character *is* the picture, the way the zoom's
 * plus and minus already are.
 */
const PLAY_GLYPH = '&#9654;';
const PAUSE_GLYPH = '&#9208;';

/**
 * A year a second (author, 2026-09-01: "plays in the selected timeline span
 * at a rate of 1 year per second"). Read as a rate rather than counted in
 * frames, so a slow machine runs the same years in the same seconds and
 * drops the frames in between instead of the years.
 */
const PLAY_MS_PER_YEAR = 1000;

/**
 * How many years a second of playback covers (author, 2026-09-02: "Add a speed
 * selector (1y,5y,10y,25y per second) when Movement is ticked").
 *
 * The author's four numbers. A year a second is the rate playback shipped
 * with and stays the default; at the other end, 25 crosses the corpus's whole
 * 1,872-year span in about seventy-five seconds, which is the difference
 * between watching a life and watching the centuries.
 */
const SPEEDS = [1, 5, 10, 25];

/**
 * The chosen rate, held for the visit beside `movement` and the range — a
 * speed is a way of watching rather than a fact about a saint, so it survives
 * a trip to a profile and back and is not persisted past a reload.
 */
let speed = SPEEDS[0];

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
const labelState = new Map();
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

/** The self-scheduled frame that keeps fades moving after the gesture or
 *  event that started them has long since finished. `null` whenever every
 *  label has reached its target — nothing runs while the map is at rest. */
let fadeFrame = null;

/**
 * **Whether the dots move with the years at all** (author, 2026-09-01: "Only
 * display death location, unless you tick a box in the bottom left called
 * 'Movement'"). Off is the default and the resting state of the map: the
 * timeline dims, and nothing walks. Held for the visit like the range, and
 * unlike the selection — it is a way of reading the map rather than a thing
 * the reader is looking at.
 *
 * **It is opt-in because it draws more than the corpus states.** Between two
 * places a saint is recorded at, the line the dot takes is nobody's finding;
 * a track's legs say so in each waypoint's own `note`, and for a saint
 * without a track there is no note to say it in. Behind a box the reader
 * ticks, that is a mode with a name on it rather than a claim the map makes
 * on its own.
 */
let movement = false;

/**
 * **Whether a saint the reader's own span has passed, or not yet reached, is
 * shown as well as marked** (author, 2026-09-01: "add a filter button which
 * opens more options, like a tickbox for showing unborn saints and one for
 * showing dead saints. by default they are not shown. however even with these
 * boxes unticked, you still see a dot").
 *
 * That last sentence is the whole design of it, and it is why these are not
 * filters in the ordinary sense: **nothing is ever removed from the picture**.
 * Unticked, a saint outside the range keeps their dot — the timeline has dimmed
 * rather than removed since 2026-08-31 and still does — and loses the two
 * things that are a *claim* about them: their name, and the halo that says how
 * sure the corpus is of the place. Ticked, they get both back and read as any
 * other saint the range does reach.
 *
 * So the reader's default map answers "who belongs to these years", and the
 * boxes turn it into "and who else is on this ground". Both are held for the
 * visit like `movement` and the range, and unlike the selection: they are a
 * way of reading the map rather than a thing the reader is looking at.
 */
let showPast = false;
let showFuture = false;

/** Whether a dot in this state is shown as a saint rather than left as a
 *  bare mark on the ground. */
const shownState = (state) => (state === 'past' ? showPast : state === 'future' ? showFuture : true);

/**
 * Where each moving saint's dot currently *is*, by slug, easing toward where
 * the timeline says they should be.
 *
 * **The rail is far finer than the control that scrubs it.** The corpus spans
 * 1872 years and the rail is a few hundred pixels, so one pixel of drag is
 * six years — more than Moses the Hungarian's whole flight from Poland. Read
 * literally that is a dot that teleports across half of Europe between two
 * adjacent pixels, which is what the author saw ("make sure he goes a bit
 * more smoothly across the trail"). Easing decouples the two: the timeline
 * says where he belongs, and the dot takes a moment to get there, along the
 * path rather than across it.
 *
 * **Two spaces, because a track is a road and a pair of places is not.** A
 * saint with a track eases along their own `progress` — one number, so the
 * dot takes the bends rather than cutting across them. A saint without one
 * eases in plain lon/lat between the places they are recorded at, which is
 * the only thing there is to ease between. Both are drawn rather than
 * sourced, which is why both live behind the `Movement` box.
 */
const railAt = new Map();

/**
 * How fast the dot closes on where the timeline puts it: the fraction of the
 * remaining distance it covers in a millisecond is `1/RAIL_GLIDE_MS`, so it
 * is quick where the gap is large and settles without overshooting.
 *
 * 120 ms, down from 260 (author, 2026-09-01: "Make them move smoothly but
 * quickly if the timeline bar is shifted quick"). Playback is a year a
 * second, so anything slower than about a sixth of that reads as the dots
 * lagging the year rather than keeping up with it.
 */
const RAIL_GLIDE_MS = 120;

/** Close enough to be there. Without it the exponential ease never quite
 *  arrives, and the map would schedule frames forever. */
const RAIL_SETTLED = 0.002;

/**
 * How much of the remaining distance to close this step, or `1` for "be
 * there now" — no easing state yet, reduced motion, or the reader is not
 * watching movement at all.
 *
 * Under reduced motion the dot is simply where the year puts it: the house
 * rule is that reduced motion removes the animation, and a dot that never
 * arrived would be the control failing rather than the motion being spared.
 */
function glideStep(state, now) {
  if (!state || reducedMotion() || !movement) return 1;
  /*
   * **Capped, because the clock between two paints is not the clock between
   * two frames.** The map paints only when something happens, so the gap
   * since this saint was last stepped can be the whole time the reader spent
   * reading — and an uncapped `dt` then closes the entire distance in one
   * step, which is the jump this exists to remove. Two frames' worth is the
   * most any single step may take.
   */
  const dt = Math.min(now - state.lastT, 32);
  state.lastT = now;
  return Math.min(1, dt / RAIL_GLIDE_MS);
}

/** Eases one saint's progress along their own track toward `wanted`. */
function glideTo(slug, wanted, now) {
  const state = railAt.get(slug);
  const step = glideStep(state, now);
  if (step === 1 || typeof state.value !== 'number') {
    // First sight of this saint is not a journey from wherever the last one
    // stood: they start where the timeline already puts them.
    railAt.set(slug, { value: wanted, lastT: now });
    return wanted;
  }
  const gap = wanted - state.value;
  state.value = Math.abs(gap) < RAIL_SETTLED ? wanted : state.value + gap * step;
  return state.value;
}

/**
 * Eases one saint's drawn position toward `wanted`, for the saints who have
 * no track to walk along and only a set of places they are recorded at.
 * `RAIL_SETTLED` is in track-progress units, so the arrival test here is a
 * distance on the ground — a hundredth of a degree, well under a pixel at
 * any zoom this map offers.
 */
function glidePoint(slug, wanted, now) {
  const state = railAt.get(slug);
  const step = glideStep(state, now);
  if (step === 1 || !state.point) {
    railAt.set(slug, { point: wanted, lastT: now });
    return wanted;
  }
  const from = state.point;
  if (Math.hypot(wanted.lon - from.lon, wanted.lat - from.lat) < 0.01) {
    state.point = wanted;
    return wanted;
  }
  state.point = {
    lon: from.lon + (wanted.lon - from.lon) * step,
    lat: from.lat + (wanted.lat - from.lat) * step,
    uncertainty_km: from.uncertainty_km + (wanted.uncertainty_km - from.uncertainty_km) * step,
  };
  return state.point;
}

/*
 * Where the map is looking. Reset on every render rather than held across
 * visits: the kind selector holds for the visit because it is a question the
 * reader asked, but arriving at the map zoomed into a corner you left three
 * pages ago is disorienting rather than helpful. `lib/map-view.js` owns the
 * arithmetic and `tests/map-view.test.mjs` pins it.
 */
let view = HOME;

/**
 * What "Reset" and the first paint return to — `HOME` on an axis the box
 * cannot move on at scale 1, but nudged toward the located corpus's own
 * centre on whichever axis can (2026-08-31, fixing a real disappearing-dot
 * bug: `HOME`'s `cx`/`cy` of 0.5 is the equator and the prime meridian,
 * which is mid-ocean and nowhere near this corpus. Every zoom the + button
 * and the keyboard do is anchored on the screen's own centre, never on a
 * dot — that is what makes the anchor predictable rather than surprising —
 * so a reader who presses + from an equator-centred rest view zooms toward
 * empty sea, and a dot that started near the frame's edge, Martha of
 * Diveyevo among them (55°N, close to the top of a landscape window's
 * cropped vertical band at rest), is off the top of the screen within two
 * or three presses and gone at every scale after. Centring the rest view on
 * the data itself means the screen's centre already has something in it,
 * so the same anchor zooms toward the corpus instead of away from it).
 * Computed once per render from `withPlace`, not `visible()`: the timeline
 * narrows what is drawn, not where the reader was looking, so dragging it
 * must not also swing the frame around.
 */
let homeView = HOME;

/** The mean of a set of `{x, y}` fractions — not the bounding box's own
 *  midpoint, which one outlying saint could drag toward empty ground far
 *  from where most of the corpus actually sits. */
function meanOf(points) {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  return { x: sx / n, y: sy / n };
}

function defaultView(cards, frame) {
  const points = cards.flatMap((card) => (card.locations ?? []).map((l) => project(l.lon, l.lat)));
  if (!points.length) return HOME;
  const { x, y } = meanOf(points);
  return { scale: MIN_SCALE, ...clampCentre(x, y, MIN_SCALE, frame) };
}

/** A press of + or -, and one wheel notch's worth of the same. */
const ZOOM_STEP = 1.6;

/**
 * Longitude and latitude to a fraction of the *box as it is currently framed* —
 * the projection, then the view on top of it. Two pure functions and this one
 * composition, so "where is Athens in the world" and "which part of the world
 * am I looking at" never get tangled together.
 */
const place = (lon, lat, frame) => {
  const p = project(lon, lat);
  return toScreen(view, p.x, p.y, frame);
};

/**
 * The cover frame for the canvas as it currently stands — how much of the world
 * each axis shows at scale 1. The stage is the window, so this changes with the
 * window and cannot be computed once: every gesture and every repaint asks
 * again. Without it the clamps and the zoom anchor would both be doing their
 * arithmetic against a box shape the map does not have.
 */
const frameOf = (canvas) => {
  const box = canvas.getBoundingClientRect();
  return coverFractions(box.width, box.height, ASPECT);
};

/**
 * How far this picture may zoom. Not a constant, because the ceiling is a
 * claim about what the reader can *resolve*: `MAX_SCALE` buys about fourteen
 * pixels between two saints who share a coordinate on a 1280 px desk and four
 * on a 360 px phone, which is why the crowd was still a smudge there (author,
 * 2026-09-01: "match zoom capabilities on mobile to what we now have on
 * desktop, because we cant see the individual dots on mobile"). See
 * `maxScaleFor` for what it does and does not equalise.
 */
const ceilingOf = (canvas) => maxScaleFor(canvas.getBoundingClientRect().width);

const located = (card) => (card.locations ?? []).length > 0 || (card.track ?? []).length > 0;

/** Every point of one kind, with the saint it belongs to. */
const pointsOfKind = (cards, which) =>
  cards.flatMap((card) => (card.locations ?? []).filter((l) => l.kind === which).map((where) => ({ card, where })));

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
function pointAt(card, from, to, at = to) {
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
  if (!movement) return { where: settled, state, track: track.length ? track : undefined };

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

export function render(el, { data, router }) {
  /*
   * The whole corpus, always - the Index's own model since 2026-08-27, which
   * Amendment 46 already said the map counts by («the map still counts as the
   * Index does»). With the facets gone (Amendment 77) there is nothing left
   * that narrows it except the timeline below, so the located set itself is a
   * constant of the render.
   */
  const M = STRINGS.map;
  const withPlace = data.saints.filter(located);

  /*
   * The timeline's span, read off `withPlace` rather than the located kind's
   * own date: `see` and `relics` carry no date of their own (only `birth`,
   * `death` and `floruit` do), so filtering by the point's kind would leave
   * two of the four kinds with nothing to filter by. A life's own span —
   * `lifeInterval`, the Index's own reading — is what the slider asks about,
   * and it is one question regardless of which kind is currently drawn.
   */
  const years = withPlace
    .flatMap((card) => {
      const iv = lifeInterval(card.dates);
      return [iv.earliest, iv.latest];
    })
    .filter((y) => y !== null);
  const bounds = years.length ? { min: Math.min(...years), max: Math.max(...years) } : null;
  if (bounds && (dateFrom === null || dateTo === null || dateFrom < bounds.min || dateTo > bounds.max)) {
    dateFrom = bounds.min;
    dateTo = bounds.max;
    playhead = null;
  }
  // "otherwise it starts by default on the highest year" (author), which is the
  // top of the *range* rather than of the corpus: it is a mark inside the
  // window, so where it starts is where that window ends.
  if (bounds && playhead === null) playhead = dateTo;

  /*
   * **The timeline dims rather than removes** (author, 2026-08-31: saints
   * outside the range "are greyed but still visible"). Until then it
   * excluded them outright, and `visible()` returned a narrowed array; now
   * every located saint is drawn on every paint and the range decides only
   * how brightly (`pointAt`'s `state`). So this is the whole located set,
   * always.
   */
  const visible = () => withPlace;

  /*
   * **The map is the window, not a card in the column** (author, 2026-08-29:
   * "make sure on mobile and desktop the map is the whole window, under the
   * header, not just a predefined window").
   *
   * So the stage is full-bleed and exactly as tall as the space under the
   * sticky bar, and the page's own reading — the lede, the register, the tray —
   * is below it. The two things that had to survive the change:
   *
   * - The **h1 stays first in the document**, where a heading belongs and
   *   where `the heading takes focus on navigation` expects it. It is no
   *   longer *drawn* over the map (author, 2026-08-31: "Remove the 'Map'
   *   title that is over the map so that map takes up more screen space"),
   *   so it is visually hidden rather than deleted — a page with no heading
   *   at all would break both that test and the reader who navigates by
   *   headings, and the instruction was about screen space, not about the
   *   page ceasing to have a name.
   * - The **kind buttons are gone** (same instruction), and with them §8.3's
   *   "make the current kind visible in the legend at all times". What
   *   replaces them is `pointAt`: one dot per saint, the kind chosen by
   *   where they were when the timeline says, rather than four kinds the
   *   reader switches between. The search takes the legend's place.
   */
  el.innerHTML = `
    <div class="map-stage" data-stage>
      <div class="map-picture">
        <!--
          tabindex="0" and arrow keys, because a canvas the pointer can drag
          and the keyboard cannot is half a control. The label says the map is
          movable and how, since a reader who cannot see it has no other way
          to learn that pressing an arrow does anything.
        -->
        <canvas data-map tabindex="0" role="img" aria-label="${esc(M.canvasLabel)}"></canvas>

        <h1 class="map-title sr-only">${esc(M.title)}</h1>

        <!--
          The search takes the legend's corner (author, 2026-08-31). A real
          combobox rather than a styled div: the role, with aria-expanded,
          aria-controls and aria-activedescendant, is what makes
          arrow-keys-and-Enter work for a screen reader, and it is the same
          bargain the timeline's native range inputs took — the accessible
          behaviour of a listbox is not light to rebuild.
        -->
        <div class="map-search" data-search>
          <input type="text" class="map-search-input" data-search-input
            role="combobox" aria-expanded="false" aria-controls="map-search-list"
            aria-autocomplete="list" autocomplete="off" spellcheck="false"
            aria-label="${esc(M.searchLabel)}" placeholder="${esc(M.searchPlaceholder)}" />
          <ul class="map-search-list" id="map-search-list" role="listbox"
            aria-label="${esc(M.searchLabel)}" data-search-list hidden></ul>
        </div>

        <!--
          The scale readout, bottom right (author, 2026-08-31: "Remove the
          zoom + and - and 'Whole world' buttons ... Display instead a small
          scale indicator e.g. '4.9x'").

          **The + and - survive on a pointer device and are hidden on
          touch** (author, same message: "On desktop the zoom buttons remain,
          the whole world does not. On mobile people will know they can use
          their fingers to zoom in"). So the readout is the whole of the
          control on a phone, where pinch is the gesture everyone already
          knows, and the buttons stand beside it on a desktop, where there is
          room and no pinch. Whole world is gone at every width; Home and 0
          still do it from the keyboard.
        -->
        <div class="map-zoom" role="group" aria-label="${esc(M.zoomGroup)}">
          <button type="button" class="icon-button map-zoom-btn" data-zoom="out" aria-label="${esc(M.zoomOut)}">&minus;</button>
          <span class="map-zoom-level utility" data-zoom-level aria-live="polite"></span>
          <button type="button" class="icon-button map-zoom-btn" data-zoom="in" aria-label="${esc(M.zoomIn)}">+</button>
        </div>

        <!--
          Empty on every ordinary visit, and the whole of what the footer
          below the picture used to be (author, 2026-08-31: "Remove the
          'Coastline, rivers and lakes...' , not needed legally? If needed
          place in About page"). Natural Earth asks for no attribution at
          all - "no permission is needed to use Natural Earth; crediting the
          authors is unnecessary" - so nothing here was load-bearing, and
          the About page's sourcing section carries the credit as a courtesy
          instead. What is left is the one thing that has to be said *here*:
          that the coastline did not load, at which point this speaks and
          takes back the strip it costs.
        -->
        <!--
          The bottom-left corner (author, 2026-09-01): the box that lets the
          dots move at all, and the button that walks the years for you. One
          stack rather than two anchored boxes, so the failure note above
          them cannot land on top of either.

          Play is disabled without Movement, because playing the years with
          nothing moving is the timeline dimming on a clock — which the
          reader can already do by dragging, and which is not what a play
          button promises.
        -->
        <div class="map-corner">
          <p class="map-note utility" data-caption hidden></p>
          <!--
            The filter button and the panel it opens (author, 2026-09-01: "add
            a filter button which opens more options"). A panel rather than two
            more boxes in the row below it: Movement is one word and earns its
            place on the picture, and two more standing controls would make
            the corner a form. It opens upward, because it is anchored to the
            bottom of the stage and there is nothing below it to open into.

            The note is not decoration. "Not shown" here means unnamed and
            unhaloed, never removed, and a reader who ticked a box expecting
            dots to *appear* would otherwise have to work that out from an
            unchanged picture.
          -->
          <div class="map-filter" data-filter>
            <button type="button" class="map-filter-btn utility" data-filter-btn
              aria-expanded="false" aria-controls="map-filter-pop">${esc(M.filters)}</button>
            <div class="map-filter-pop" id="map-filter-pop" data-filter-pop hidden
              role="group" aria-label="${esc(M.filters)}">
              <label class="map-filter-row utility">
                <input type="checkbox" data-show="past" />
                ${esc(M.showPast)}
              </label>
              <label class="map-filter-row utility">
                <input type="checkbox" data-show="future" />
                ${esc(M.showFuture)}
              </label>
              <p class="map-filter-note utility">${esc(M.filterNote)}</p>
            </div>
          </div>
          <!--
            **The play button and the speed selector belong to Movement**
            (author, 2026-09-02: "Make this selector AND the play button only
            appear when Movement is ticked on. These buttons fade in / out
            when Movement is selected").

            They were always disabled without it — playing the years with
            nothing moving is the timeline dimming on a clock — and a disabled
            control that can only be enabled by the box beside it is a control
            asking a question the box has already answered. So they are not
            there at all until it is ticked, and they fade rather than
            appearing, which is what says the box is what produced them.

            The data-motion-only box is the pair; wireMotion toggles one class
            on it and map.css does the fade. Kept in the document either way
            rather than removed, so the fade has something to run on and the
            play button's own state survives a tick and an untick.
          -->
          <div class="map-motion">
            <div class="map-motion-run" data-motion-only>
              <div class="map-motion-run-inner">
                <button type="button" class="icon-button map-play" data-play disabled
                  aria-label="${esc(M.play)}">${PLAY_GLYPH}</button>
                <label class="map-speed utility">
                  <span class="sr-only">${esc(M.speedLabel)}</span>
                  <select data-speed>
                    ${SPEEDS.map(
                      (n) =>
                        `<option value="${n}"${n === speed ? ' selected' : ''}>${esc(
                          fill(M.speedOption, { years: n }),
                        )}</option>`,
                    ).join('')}
                  </select>
                </label>
              </div>
            </div>
            <label class="map-movement utility">
              <input type="checkbox" data-movement />
              ${esc(M.movement)}
            </label>
          </div>
        </div>

        <!--
          The door, since a press on a dot stopped being one (author,
          2026-08-31: "Once selected, a 'Profile >' button appears next to
          their name you can click on"). A real button in the document
          rather than something drawn on the canvas: the canvas is one
          opaque image to a screen reader and cannot be tabbed to a word of,
          and this is the only way off the map to a saint now that the press
          selects. The paint pass puts it beside whatever the label pass did
          with the selected saint's name.
        -->
        <button type="button" class="map-profile utility" data-profile hidden>
          <span data-profile-label></span><span class="map-profile-chevron" aria-hidden="true">&rsaquo;</span>
        </button>
      </div>

      ${bounds ? timelineMarkup(M, bounds) : ''}
    </div>`;

  const canvas = el.querySelector('[data-map]');
  destroy();
  homeView = HOME;
  view = HOME;
  selected = null;
  railPlay = null;
  focus = null;
  selectFade.value = 0;

  /*
   * A raw pointer stream — a drag, a wheel spin, a timeline thumb pulled by
   * the pointer — can call this many times inside one animation frame, and
   * painting synchronously on every one of them is strictly more painting
   * than the screen will ever show; the browser presents at most one frame
   * regardless. `view` and every other bit of state still update the
   * instant the event arrives, so nothing reads stale — only the canvas
   * redraw itself is coalesced to once per frame (2026-08-31, once the
   * map's own data tripled in size on the 50m tier and made the difference
   * audible as lag).
   *
   * **Deliberately not used for a discrete action** — a button, a key, a
   * kind press — which call `paintCanvas` straight through `refresh`/`set`
   * instead. Those happen once, coalescing them buys nothing, and a
   * click-then-immediately-read-the-canvas test (`map.spec.js`'s "Reset
   * comes home") is a real caller that cannot afford the extra frame of
   * latency this would add for no benefit.
   */
  let paintScheduled = false;
  let pendingCards = null;
  const schedulePaint = (cardsToDraw) => {
    pendingCards = cardsToDraw;
    if (paintScheduled) return;
    paintScheduled = true;
    requestAnimationFrame(() => {
      paintScheduled = false;
      if (canvas.isConnected) paintCanvas(canvas, pendingCards);
    });
  };

  /*
   * The picture, repainted. The kind counts it used to keep in step went
   * with the kind buttons (2026-08-31); what remains is the canvas itself,
   * and the timeline's own readout, which `wireTimeline` paints.
   *
   * `throttled` is only ever true from the timeline fill's own pointermove
   * (`wireTimeline`) — the one other raw, many-times-a-frame pointer stream
   * this view has, besides the map's own drag and wheel. A typed year, a
   * preset, and a native range input's `input` event stay synchronous: each
   * happens once, so there is nothing to coalesce.
   */
  const refresh = (throttled) => {
    const cards = visible();
    if (throttled) schedulePaint(cards);
    else paintCanvas(canvas, cards);
  };

  /**
   * Moving the view, through whatever knows most about doing it. Until
   * `wireZoom` has run that is the picture alone; afterwards it is
   * `wireZoom`'s own `set`, which updates the scale readout and the disabled
   * buttons as well. `settleHome` below can fire either side of that line,
   * so it goes through this rather than assigning `view` itself.
   */
  let applyView = (next) => {
    view = next;
    refresh();
  };

  /*
   * **The rest view waits until there is a box to compute it from.**
   *
   * `render` can run before this canvas has been laid out — the router calls
   * it inside a view transition's update callback, where the document's own
   * rendering is suppressed and a freshly written element measures 0 by 0 —
   * and `coverFractions(0, 0)` is 0/0 on both axes. A NaN frame makes a NaN
   * centre, `toScreen` then puts *every* dot at NaN for the rest of the
   * visit, and the map draws an empty picture until the reader navigates
   * away (found 2026-08-31 on a desktop window: no land, no dots, and a
   * `createRadialGradient` refusing a non-finite radius sixty-nine times a
   * paint). Deferring is the fix rather than defaulting the frame, because
   * a made-up box would centre the map on ground nobody chose and nothing
   * would ever say so.
   *
   * Until it settles the map looks at `HOME` — the equator and the prime
   * meridian, which is where the rest view sat before `defaultView` — so
   * the worst case is one frame of the old behaviour rather than a blank
   * canvas.
   */
  const settleHome = () => {
    if (!canvas.isConnected) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) {
      requestAnimationFrame(settleHome);
      return;
    }
    homeView = defaultView(withPlace, coverFractions(box.width, box.height, ASPECT));
    // Only if the reader has not moved the map themselves in the meantime:
    // settling takes a frame or two at worst, but yanking a view someone had
    // already started working would be worse than the centre it corrects.
    if (view === HOME) applyView(homeView);
  };

  refresh();
  settleHome();

  /*
   * Choosing a saint, and letting one go. Both go through `refresh` rather
   * than touching the canvas, so the rail, the forced name and the button's
   * own position are all decided in the one place that knows where things
   * were drawn — `paintCanvas`.
   */
  const choose = (mark) => {
    if (!mark) return;
    /*
     * **A second press on the same mark steps to the next saint under it.**
     * A mark can stand for a crowd (`mergeDots`), and saints at one identical
     * coordinate — John the Long-Suffering and Moses the Hungarian at the
     * Caves in Kyiv — cannot be told apart by zooming at any scale there is.
     * Without this the reader could reach the best-ranked of them and nobody
     * else, ever, which would make the merge a way of hiding saints rather
     * than of drawing them honestly. Pressing a lone dot that is already
     * chosen still does nothing: the step wraps to the one saint there is.
     */
    const members = mark.members?.length ? mark.members : [mark.card];
    const at = members.findIndex((c) => c.slug === selected);
    const card = members[(at + 1) % members.length];
    if (!card || card.slug === selected) return;

    // Dropped first, so the outgoing saint's rail and name are not left
    // standing on the picture for the length of the flight — and no walk from
    // a previous choice carries on under the new one.
    selected = null;
    railPlay = null;
    /*
     * The fall-back starts here rather than when the flight lands, which is
     * what makes it happen "as the screen centres" — the rest of the map
     * eases back over exactly the length of the flight, so the picture
     * arrives already quiet. `selected` still waits for the landing, and the
     * rail and the name with it.
     */
    focus = card.slug;
    refresh();

    const box = canvas.getBoundingClientRect();
    const frame = coverFractions(box.width, box.height, ASPECT);
    const track = card.track ?? [];

    /*
     * **The whole rail if there is one, the dot itself if there is not**
     * (author, 2026-09-01: "it centres you gently over its whole rail instead
     * of one position"). A journey framed on the stay the dot happens to be
     * standing on is a journey the reader cannot see the ends of, which is
     * the thing the flight was doing wrong: `fitBounds` takes the extent and
     * hands back the view that holds all of it with room to spare.
     * `RAIL_FIT_MAX` keeps a short rail from slamming the picture to 240×.
     *
     * **Without a rail this is unchanged, and the pressed pixel is still the
     * anchor rather than the saint's own coordinate.** A mark can stand for
     * more saints than one (`mergeDots`), so its position is the
     * representative's; reading the world back out of the pixel the reader
     * actually pressed is right whatever the draw pass did to get it there,
     * and needs to know none of it.
     */
    let target;
    if (track.length > 1) {
      const fitted = fitBounds(trackPath(track).map((p) => project(p.lon, p.lat)), frame, undefined, ceilingOf(canvas));
      target = clampView({ ...fitted, scale: Math.min(fitted.scale, RAIL_FIT_MAX) }, frame, ceilingOf(canvas));
    } else {
      const { px, py } = toWorld(view, mark.x / box.width, mark.y / box.height, frame);
      target = { scale: view.scale, ...clampCentre(px, py, view.scale, frame) };
    }

    flyTo(target, frame, (next) => applyView(next), () => {
      selected = card.slug;
      /*
       * **And then the life is walked, once.** The rail is drawn by the paint
       * this schedules — the author's original order, "first centres you
       * smoothly on them and then shows their path" — and the dot sets off
       * along it at the same moment. Under reduced motion it does not: the
       * walk carries no information the still picture withholds (the rail is
       * drawn whole either way), so removing it removes an animation and
       * nothing else.
       */
      railPlay = track.length > 1 && !reducedMotion() ? { slug: card.slug, start: performance.now() } : null;
      refresh();
      announce(el, fill(STRINGS.map.selected, { name: saintName(card) }));
    });
  };

  const release = () => {
    cancelFlight();
    railPlay = null;
    // `focus` and not `selected` decides whether there is anything to let go
    // of: a press during the flight, before the selection has landed, is
    // still a reader changing their mind and must bring the map back.
    if (focus === null && selected === null) return;
    focus = null;
    selected = null;
    refresh();
  };

  wirePress(canvas, choose, release);
  wireProfile(el, router);

  /*
   * The coastline is fetched, so the first paint is the empty box and the
   * second has land in it. Nothing moves between them — the box is reserved —
   * and `data-land` says which state the picture is in, because a canvas that
   * drew nothing and one that drew the sea are the same screenshot.
   */
  drawWhenReady(el, canvas, visible);

  /*
   * `wireZoom` hands back its own `set` so the search can fly the view
   * through exactly the path a wheel or a button takes — the zoom readout
   * and the disabled states are updated there, and a search that assigned
   * `view` directly moved the picture while leaving the chrome saying 1.0×.
   */
  const setView = wireZoom(el, canvas, visible, schedulePaint);
  applyView = setView;
  wireSearch(el, canvas, withPlace, setView);

  wireFilters(el, refresh);
  wireMotion(el, bounds ? wireTimeline(el, bounds, refresh) : null, refresh);

  /*
   * The canvas is sized from its own box, so it has to be repainted when the
   * box changes. Torn down in `destroy` rather than returned: main.js calls
   * `view.destroy?.()` and ignores a return value, so a listener handed back
   * from here would outlive the view and repaint a canvas that had left the
   * document — which is a leak per navigation, not per page.
   */
  onResize = () => schedulePaint(visible());
  window.addEventListener('resize', onResize);
}

/**
 * The timeline's markup: two overlaid native range inputs over one rail, and
 * a status row underneath. Real `<input type="range">` rather than a
 * hand-built control, because a native one is keyboard-operable and has an
 * accessible name for free — the "very light" instruction the map itself was
 * built under applies to this too, and the accessibility work a custom
 * slider would need is not light.
 *
 * The two inputs overlap the same track; CSS gives the invisible body
 * `pointer-events: none` and restores it on the thumb alone, the standard way
 * to make two overlaid range inputs each grabbable without one's body
 * blocking the other's thumb. Crossing the handles is not prevented — `wireTimeline`
 * always takes the sorted pair as the effective range, so a thumb dragged
 * past its twin still means something rather than needing to be stopped.
 *
 * The fill itself is a third grab target (`wireTimeline`, 2026-08-31): its
 * hit box is the rail-wrap's full height, not the 4 px painted bar, so a
 * pointer sliding the highlighted span does not need to land on a hairline —
 * `.map-timeline-fill-bar` is the visible bar, `.map-timeline-fill` around it
 * is what pointer events actually land on. It sits under both inputs in
 * paint order, so it only ever answers a press that already passed through
 * their `pointer-events: none` bodies.
 */
function timelineMarkup(M, bounds) {
  /*
   * Each end is a **fixed-width button that opens a small panel** (author,
   * 2026-08-31: "make the start and end date a button of fixed width and
   * make the AD BC selector part of the pop up from the button if you want
   * to type it in instead of drag the slider"), where a printed bound used
   * to stand and where a bare number box and select stood for one build.
   *
   * The button is the resting state and shows the year as a reader reads it
   * — "431 BC", "1917 AD". Typing is the *other* way in, behind a press,
   * because the two handles are the primary control and a pair of always-open
   * number boxes gave a control the reader mostly does not want the same
   * weight as the rail they mostly do. Fixed width so the rail between the
   * two ends does not jump every time a year gains or loses a digit — which
   * it did, visibly, while the boxes sized to their own content.
   *
   * The number the reader types is always positive and the era carries the
   * sign, because "431 BC" is a year a reader can read and "-431" is one
   * they have to decode — `yearBox` and `yearLabel` are the one place that
   * conversion happens in either direction.
   */
  const yearBox = (side, label, value) => {
    const bc = value < 0;
    return `
      <div class="map-year" data-year-box="${side}">
        <button type="button" class="map-year-btn utility" data-year-btn="${side}"
          aria-expanded="false" aria-label="${esc(label)}">${esc(yearLabel(value, M))}</button>
        <div class="map-year-pop" data-year-pop="${side}" hidden>
          <input type="number" class="map-year-num utility" data-year-num="${side}"
            value="${Math.abs(value)}" min="1" step="1" inputmode="numeric"
            aria-label="${esc(label)}" />
          <select class="map-year-era utility" data-year-era="${side}" aria-label="${esc(M.era)}">
            <option value="ad"${bc ? '' : ' selected'}>${esc(M.eraAD)}</option>
            <option value="bc"${bc ? ' selected' : ''}>${esc(M.eraBC)}</option>
          </select>
        </div>
      </div>`;
  };

  /*
   * The preset list stands where "Whole span" did, and keeps it as its own
   * first entry (author, 2026-08-31: make that button "a preset filter that
   * shows periods of history ... both periods of time and events +- 50
   * years"). A `<select>` rather than a menu built by hand, for the same
   * reason the handles are native ranges: it is keyboard- and
   * screen-reader-operable for nothing, and it is a list of one-line
   * choices, which is exactly what a select is for.
   */
  const P = STRINGS.map.presets;
  const options = PERIODS.map((p) => {
    const { from, to } = spanOf(p);
    return `<option value="${esc(p.id)}">${esc(P[p.id] ?? p.id)} (${yearLabel(from, M)}–${yearLabel(to, M)})</option>`;
  }).join('');

  return `
    <div class="map-timeline">
      <div class="map-timeline-track">
        ${yearBox('from', M.yearFrom, dateFrom)}
        <div class="map-timeline-rail-wrap">
          <div class="map-timeline-rail"></div>
          <div class="map-timeline-fill" data-timeline-fill><span class="map-timeline-fill-bar"></span></div>
          <input type="range" class="map-timeline-input" data-timeline-from
            min="${bounds.min}" max="${bounds.max}" step="1" value="${dateFrom}"
            aria-label="${esc(STRINGS.saints.filters.from)}" />
          <input type="range" class="map-timeline-input" data-timeline-to
            min="${bounds.min}" max="${bounds.max}" step="1" value="${dateTo}"
            aria-label="${esc(STRINGS.saints.filters.to)}" />
          <!--
            The year being watched (author, 2026-09-01), over the top of the
            selection and sliding only inside it.

            A slider role rather than a third native range input, and the two
            above are the reason: a native range spans the whole rail and its
            track would lie across both of theirs, taking the presses that
            belong to the handles. This one is a button the width of its own
            triangle, so it can be dragged where it is and nowhere else — and it
            carries the range role's four attributes and answers the arrow keys,
            so what the native input was giving for free is given back by hand
            rather than given up.
          -->
          <button type="button" class="map-timeline-head" data-playhead hidden
            role="slider" tabindex="0" aria-orientation="horizontal"
            aria-label="${esc(M.watching)}"
            aria-valuemin="${bounds.min}" aria-valuemax="${bounds.max}"
            aria-valuenow="${playhead ?? bounds.max}"></button>
        </div>
        ${yearBox('to', M.yearTo, dateTo)}
      </div>
      <!--
        The "from-to: shown/total shown" line stood here until 2026-08-31,
        when the author asked for it gone. Its two halves had both been said
        twice over by then: the range is what the two year buttons print,
        and the count stopped meaning "dots on the picture" the day the
        timeline began dimming rather than removing.
      -->
      <div class="map-timeline-status">
        <select class="map-timeline-preset utility" data-timeline-preset aria-label="${esc(M.presetLabel)}">
          <option value="">${esc(M.presetWhole)}</option>
          ${options}
        </select>
      </div>
    </div>`;
}

/** A signed year as a reader reads it: `431 BC`, `1917 AD`. */
const yearLabel = (year, M) => `${Math.abs(year)} ${year < 0 ? M.eraBC : M.eraAD}`;

/**
 * Wires the two range inputs — and the highlighted span between them — to
 * one effective span, held in the module-level `dateFrom`/`dateTo` so it
 * survives the visit the way the view does.
 */
function wireTimeline(el, bounds, refresh) {
  const fromInput = el.querySelector('[data-timeline-from]');
  const toInput = el.querySelector('[data-timeline-to]');
  const fillEl = el.querySelector('[data-timeline-fill]');
  const headEl = el.querySelector('[data-playhead]');
  const presetSel = el.querySelector('[data-timeline-preset]');
  const numOf = (side) => el.querySelector(`[data-year-num="${side}"]`);
  const eraOf = (side) => el.querySelector(`[data-year-era="${side}"]`);

  const btnOf = (side) => el.querySelector(`[data-year-btn="${side}"]`);
  const popOf = (side) => el.querySelector(`[data-year-pop="${side}"]`);

  /*
   * One panel open at a time, and a press anywhere else closes it — the
   * same bargain the Daily page's fast bubble keeps. Closing on `Escape`
   * returns focus to the button that opened it, so the keyboard is not
   * stranded in a panel that has just gone.
   */
  const closePops = (except) => {
    for (const side of ['from', 'to']) {
      if (side === except) continue;
      popOf(side).hidden = true;
      btnOf(side).setAttribute('aria-expanded', 'false');
    }
  };

  for (const side of ['from', 'to']) {
    btnOf(side).addEventListener('click', () => {
      const pop = popOf(side);
      const opening = pop.hidden;
      closePops(opening ? side : null);
      pop.hidden = !opening;
      btnOf(side).setAttribute('aria-expanded', String(opening));
      if (opening) {
        numOf(side).focus();
        numOf(side).select();
      }
    });
    popOf(side).addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        popOf(side).hidden = true;
        btnOf(side).setAttribute('aria-expanded', 'false');
        btnOf(side).focus();
      } else if (e.key === 'Enter') {
        // Enter is "I have finished typing", which `change` alone would not
        // hear until blur — so it commits and puts the panel away.
        e.preventDefault();
        numOf(side).blur();
        popOf(side).hidden = true;
        btnOf(side).setAttribute('aria-expanded', 'false');
        btnOf(side).focus();
      }
    });
  }

  /*
   * A press anywhere but inside a year control closes both panels. On
   * `document` rather than on the view root, because the header above the
   * stage is outside it and a reader who reaches for the language button
   * with a panel open should not have to press twice — and registered for
   * teardown, since a listener on `document` outlives the view that added
   * it and would otherwise be a leak per navigation.
   */
  const onDocDown = (e) => {
    if (!e.target.closest?.('.map-year')) closePops(null);
  };
  document.addEventListener('pointerdown', onDocDown);
  cleanups.push(() => document.removeEventListener('pointerdown', onDocDown));

  /**
   * The whole control drawn from `dateFrom`/`dateTo`: the highlighted span,
   * and both ends — the button's printed year as well as the number and era
   * behind it, so opening a panel after a drag shows the year the rail
   * actually holds.
   *
   * **The two used to be separate, and dragging the span forgot to call the
   * second** (author, 2026-08-31: "the date does not update anymore when
   * sliding the whole bar along"). They are one question — what does the
   * timeline now say — so they are one function; there is no longer a way to
   * move the range and repaint only half of what shows it.
   */
  const paint = () => {
    const span = bounds.max - bounds.min || 1;
    const lo = ((dateFrom - bounds.min) / span) * 100;
    const hi = ((dateTo - bounds.min) / span) * 100;
    fillEl.style.left = `${lo}%`;
    fillEl.style.right = `${100 - hi}%`;
    for (const [side, year] of [['from', dateFrom], ['to', dateTo]]) {
      numOf(side).value = String(Math.abs(year));
      eraOf(side).value = year < 0 ? 'bc' : 'ad';
      btnOf(side).textContent = yearLabel(year, STRINGS.map);
    }
    /*
     * **The triangle is pushed, never pushing** (author: "It gets pushed around
     * if the high or low dates make contact with it"). Clamping it here rather
     * than in the handles' own listeners is what makes that true of every way
     * the range can move — the two handles, the fill drag, a typed year, a
     * preset — because all five end in this function. A rule enforced at the
     * one place the state is drawn from cannot be forgotten by a sixth.
     */
    playhead = Math.min(dateTo, Math.max(dateFrom, playhead ?? dateTo));
    headEl.style.left = `${((playhead - bounds.min) / span) * 100}%`;
    headEl.setAttribute('aria-valuenow', String(playhead));
    headEl.setAttribute('aria-valuetext', yearLabel(playhead, STRINGS.map));
  };

  const commit = () => {
    // Whichever handle moved, the *sorted* pair is the effective range — a
    // thumb dragged past its twin still filters correctly rather than
    // needing to be physically stopped from crossing (see `timelineMarkup`).
    dateFrom = Math.min(Number(fromInput.value), Number(toInput.value));
    dateTo = Math.max(Number(fromInput.value), Number(toInput.value));
    paint();
    refresh();
  };

  fromInput.addEventListener('input', commit);
  toInput.addEventListener('input', commit);

  /*
   * A typed year, with its era. **The two ends swap themselves rather than
   * being refused** (author, 2026-08-31: "If an earlier date is typed in the
   * right side than the left side, the timeline adjusts so that right side
   * entry goes to the left and vice versa"), which is the same rule the
   * handles already followed — `commit` has always taken the sorted pair —
   * so this is that rule reaching the boxes rather than a new one.
   *
   * Clamped to the corpus's own span, because the two range handles cannot
   * represent a year outside it: a reader who types 200 BC into a corpus
   * that starts at AD 66 is asking for something the rail has no room to
   * show, and silently keeping the number while the handle sat at the end
   * would be the control lying about its own state.
   */
  const readTyped = (side) => {
    const magnitude = Math.abs(Math.trunc(Number(numOf(side).value)));
    if (!Number.isFinite(magnitude) || magnitude === 0) return null;
    const signed = eraOf(side).value === 'bc' ? -magnitude : magnitude;
    return Math.min(bounds.max, Math.max(bounds.min, signed));
  };

  const commitTyped = () => {
    const a = readTyped('from');
    const b = readTyped('to');
    // A half-typed box ("1" on the way to "1917") is left alone rather than
    // yanking the whole range to year 1 between keystrokes.
    if (a === null || b === null) return;
    fromInput.value = String(Math.min(a, b));
    toInput.value = String(Math.max(a, b));
    commit();
  };

  for (const side of ['from', 'to']) {
    // `change`, not `input`: a number box fires `input` on every keystroke,
    // and swapping the ends out from under someone mid-type — "19" being
    // read as year 19 and flung to the left — is exactly the jitter the
    // sort rule would otherwise cause. `change` waits for blur or Enter.
    numOf(side).addEventListener('change', commitTyped);
    eraOf(side).addEventListener('change', commitTyped);
  }

  /*
   * A preset span. The empty value is "Whole span", which is where the old
   * reset button's behaviour lives now; every other value is a row of
   * `data/periods.js`, an event already widened to its ±50 window by
   * `spanOf`. Each is clamped to the corpus's own bounds for the same
   * reason a typed year is: the rail cannot show what it has no room for.
   */
  presetSel.addEventListener('change', () => {
    const chosen = PERIODS.find((p) => p.id === presetSel.value);
    const span = chosen ? spanOf(chosen) : { from: bounds.min, to: bounds.max };
    fromInput.value = String(Math.min(bounds.max, Math.max(bounds.min, span.from)));
    toInput.value = String(Math.min(bounds.max, Math.max(bounds.min, span.to)));
    commit();
  });

  /*
   * The fill drag: a pointer down on the highlighted span shifts both
   * handles by the same number of years, holding their width fixed — a pan
   * across the timeline rather than a resize of it. `Math.round` keeps
   * `dateFrom`/`dateTo` the same integer-year values a keyboard press would
   * leave them at, so the readout never shows a fraction.
   */
  let drag = null;
  fillEl.addEventListener('pointerdown', (e) => {
    fillEl.setPointerCapture(e.pointerId);
    drag = { pointerId: e.pointerId, startX: e.clientX, from: dateFrom, to: dateTo };
    fillEl.classList.add('is-dragging');
  });
  fillEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rect = fillEl.parentElement.getBoundingClientRect();
    const span = bounds.max - bounds.min || 1;
    const deltaYears = ((e.clientX - drag.startX) / rect.width) * span;
    const width = drag.to - drag.from;
    let from = drag.from + deltaYears;
    let to = drag.to + deltaYears;
    // Clamped as one unit: the span slides until *either* edge meets the
    // bound, and that edge's clamp carries the other edge with it so the
    // width never changes mid-drag — the difference between panning the
    // window and having it squashed against the wall.
    if (from < bounds.min) {
      from = bounds.min;
      to = from + width;
    } else if (to > bounds.max) {
      to = bounds.max;
      from = to - width;
    }
    dateFrom = Math.round(from);
    dateTo = Math.round(to);
    fromInput.value = String(dateFrom);
    toInput.value = String(dateTo);
    paint();
    refresh(true);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag = null;
    fillEl.classList.remove('is-dragging');
  };
  fillEl.addEventListener('pointerup', endDrag);
  fillEl.addEventListener('pointercancel', endDrag);

  /*
   * The triangle's own drag. Years from pixels against the rail's box, clamped
   * to the selection — which is the whole of "only slides along lowest date to
   * highest date selected".
   *
   * `refresh(true)` rather than `refresh()`: the flag is what tells the paint
   * this is a hand still moving, so the dots take the direct path to where the
   * year now puts them instead of easing toward it from where the last frame
   * left them, half a year behind the reader's thumb.
   */
  let headDrag = null;
  const yearAtX = (clientX) => {
    const rect = fillEl.parentElement.getBoundingClientRect();
    const span = bounds.max - bounds.min || 1;
    const raw = bounds.min + ((clientX - rect.left) / (rect.width || 1)) * span;
    return Math.min(dateTo, Math.max(dateFrom, Math.round(raw)));
  };
  const moveHead = (year, live) => {
    if (year === playhead) return;
    playhead = year;
    paint();
    refresh(live);
  };
  headEl.addEventListener('pointerdown', (e) => {
    headEl.setPointerCapture(e.pointerId);
    headDrag = e.pointerId;
    headEl.classList.add('is-dragging');
  });
  headEl.addEventListener('pointermove', (e) => {
    if (headDrag !== e.pointerId) return;
    moveHead(yearAtX(e.clientX), true);
  });
  const endHead = (e) => {
    if (headDrag !== e.pointerId) return;
    headDrag = null;
    headEl.classList.remove('is-dragging');
    // One last paint that is *not* live, so the dots settle by easing into
    // place rather than stopping dead where the thumb left them.
    refresh();
  };
  headEl.addEventListener('pointerup', endHead);
  headEl.addEventListener('pointercancel', endHead);

  /*
   * And the keys a range input would have answered: a year at a time, ten at a
   * page, and the ends of the *selection* rather than of the corpus — Home and
   * End mean the ends of what this control can reach.
   */
  headEl.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
    let next = null;
    if (step !== undefined) next = playhead + step;
    else if (e.key === 'Home') next = dateFrom;
    else if (e.key === 'End') next = dateTo;
    if (next === null) return;
    e.preventDefault();
    moveHead(Math.min(dateTo, Math.max(dateFrom, next)), false);
  });

  paint();

  /*
   * The upper handle, for the play button — which lives on the picture and
   * not in this strip, but must move the range through the same `commit`
   * every other control does, or the year buttons and the picture would
   * disagree with the rail. `onTouch` is how playback learns to stop when
   * the reader takes the timeline back off it.
   */
  return {
    setUpper(year) {
      toInput.value = String(Math.min(bounds.max, Math.max(bounds.min, Math.round(year))));
      commit();
    },
    /**
     * Where playback puts the year now.
     *
     * **Playback moves the triangle, not the upper handle, since 2026-09-01.**
     * It used to walk `dateTo` from one end of the span to the other, which was
     * the only year-mover there was — and which meant pressing Play *narrowed
     * the reader's window to nothing* and then widened it back out, dimming
     * three quarters of the map on the way. With a mark of its own to move, the
     * selection stays where the reader put it and the year walks across it,
     * which is what watching a span play was always meant to look like.
     */
    setHead(year) {
      moveHead(Math.min(dateTo, Math.max(dateFrom, Math.round(year))), true);
    },
    /** Where playback should start and stop: the reader's own selection. */
    span: () => ({ from: dateFrom, to: dateTo }),
    /** Where the triangle stands now, which is where a press of Play resumes. */
    head: () => playhead,
    /** Shown while Movement is on and hidden with it (`wireMotion`). */
    showHead(on) {
      headEl.hidden = !on;
    },
    onTouch(stop) {
      // The triangle is in this list because dragging it during playback is the
      // reader taking the year back by hand, which is the same interruption as
      // touching the handles.
      for (const control of [fromInput, toInput, fillEl, presetSel, headEl]) {
        control.addEventListener('pointerdown', stop);
        control.addEventListener('keydown', stop);
        control.addEventListener('change', stop);
      }
    },
  };
}

/* ---- the filter panel (2026-09-01) -------------------------------------- */

/**
 * The filter button and the two boxes behind it.
 *
 * Both boxes hold for the visit, so the panel opens showing what the map is
 * actually doing rather than its defaults — the same standing `Movement` and
 * the timeline's range have, and for the same reason: a reader who narrows
 * the map, leaves for a saint page and comes back should find it as they
 * left it.
 *
 * The outside-press close is `pointerdown` on `document`, the same bargain
 * the timeline's year panels keep, and is registered in `cleanups` for the
 * same reason — a listener on `document` outlives the view that added it.
 */
function wireFilters(el, refresh) {
  const button = el.querySelector('[data-filter-btn]');
  const pop = el.querySelector('[data-filter-pop]');

  const shut = () => {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  button.addEventListener('click', () => {
    const opening = pop.hidden;
    pop.hidden = !opening;
    button.setAttribute('aria-expanded', String(opening));
  });

  pop.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Focus goes back to the button that opened it, or the keyboard is
    // stranded inside a panel that has just gone.
    shut();
    button.focus();
  });

  const onDocDown = (e) => {
    if (!e.target.closest?.('.map-filter')) shut();
  };
  document.addEventListener('pointerdown', onDocDown);
  cleanups.push(() => document.removeEventListener('pointerdown', onDocDown));

  for (const box of el.querySelectorAll('[data-show]')) {
    const which = box.dataset.show;
    box.checked = which === 'past' ? showPast : showFuture;
    box.addEventListener('change', () => {
      if (which === 'past') showPast = box.checked;
      else showFuture = box.checked;
      refresh();
      const M = STRINGS.map;
      announce(el, box.checked ? (which === 'past' ? M.showingPast : M.showingFuture) : M.showingLiveOnly);
    });
  }
}

/* ---- movement and playback (2026-09-01) --------------------------------- */

/**
 * The `Movement` box and the play button beside it.
 *
 * `timeline` is `wireTimeline`'s own small API, or `null` where the corpus
 * has nothing dated to build a rail from — in which case there is no span to
 * play and the button stays disabled whatever the box says.
 *
 * **Playback walks the upper handle**, which is the control the reader can
 * already see and work: it starts at the low end of their own span and
 * travels to the high end at a year a second, and pressing pause leaves it
 * wherever it stopped. Nothing about "now" is invented alongside the range —
 * the year buttons, the dimming and the dots all keep reading the one pair
 * of numbers they always have, and the picture lights up through the
 * centuries as it goes.
 */
function wireMotion(el, timeline, refresh) {
  const box = el.querySelector('[data-movement]');
  const play = el.querySelector('[data-play]');
  const speedSel = el.querySelector('[data-speed]');
  const run = el.querySelector('[data-motion-only]');
  let frame = null;
  let end = null;

  const stop = () => {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
    play.innerHTML = PLAY_GLYPH;
    play.setAttribute('aria-label', STRINGS.map.play);
  };

  const chrome = () => {
    // Playing with nothing to move is the timeline dimming on a clock, which
    // a drag already does and a play button does not promise.
    play.disabled = !movement || !timeline;
    if (play.disabled) stop();
    /*
     * **Shown with Movement, faded rather than swapped** (author, 2026-09-02).
     * `inert` as well as the class, because a control faded to nothing is
     * still a control a keyboard can reach: the fade is what a sighted reader
     * sees and this is the same statement made to everyone else.
     */
    run.classList.toggle('is-on', movement);
    run.inert = !movement;
    /*
     * "It appears once Movement is ticked on" (author, 2026-09-01). Off, the
     * map shows every saint at their resting place and there is no year being
     * watched — a mark pointing at one would be a control for a question the
     * page is not asking.
     */
    timeline?.showHead(movement);
  };

  box.addEventListener('change', () => {
    movement = box.checked;
    chrome();
    /*
     * Every dot goes back to standing where the year puts it rather than
     * gliding there from wherever the other mode had left it — the switch
     * is a change of question, not a journey.
     */
    railAt.clear();
    refresh();
    announce(el, movement ? STRINGS.map.movementOn : STRINGS.map.movementOff);
  });

  play.addEventListener('click', () => {
    if (frame !== null) {
      stop();
      return;
    }
    const span = timeline.span();
    if (span.to <= span.from) return;
    end = span.to;
    /*
     * **From where the triangle stands, not from the start of the span**
     * (author, 2026-09-02: "with the triangle button, make sure it doesnt go
     * back to the start of the timeline selection but starts from where it is
     * placed by hand. i.e. if its halfway and you click play, it should go
     * from there not jump back to the earliest selected date").
     *
     * The reader has a control for the year now, and moving it is them saying
     * where they want to be — sending them back to the low end on every press
     * threw that away. A press at the wall still starts the run again from the
     * beginning, because a play button that does nothing is worse than one
     * that rewinds; and a mark left outside the selection (the handles can be
     * dragged past it) is clamped into it rather than played from outside.
     */
    const standing = timeline.head();
    const resume =
      standing === null || standing >= end - 0.5
        ? span.from
        : Math.min(end, Math.max(span.from, standing));
    /*
     * **The triangle walks, and the selection stays where the reader put it**
     * (2026-09-01). This ran the *upper handle* from one end of the span to the
     * other, because until the triangle there was nothing else that could carry
     * a year — which meant pressing Play collapsed the reader's window to a
     * single year and then reopened it, dimming most of the map for the length
     * of the performance. The range is untouched now; what moves is the mark.
     */
    timeline.setHead(resume);
    play.innerHTML = PAUSE_GLYPH;
    play.setAttribute('aria-label', STRINGS.map.pause);

    let last = performance.now();
    let year = resume;
    const step = (now) => {
      /*
       * The reader's own rate, read every frame rather than captured at the
       * press: changing the speed mid-run should change *this* run, which is
       * the only run there is to change.
       */
      year += ((now - last) / PLAY_MS_PER_YEAR) * speed;
      last = now;
      if (year >= end) {
        timeline.setHead(end);
        stop();
        return;
      }
      timeline.setHead(year);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });

  speedSel?.addEventListener('change', () => {
    const chosen = Number(speedSel.value);
    if (SPEEDS.includes(chosen)) speed = chosen;
  });

  // The reader taking the timeline back is the end of the performance, and
  // so is leaving the view: `destroy` drains `cleanups`.
  timeline?.onTouch(stop);
  cleanups.push(stop);
  // Both hold for the visit, so a return to the map finds them as they were.
  box.checked = movement;
  if (speedSel) speedSel.value = String(speed);
  chrome();
}

/* ---- the search --------------------------------------------------------- */

/** How many rows the list ever shows: enough to be worth scanning, few
 *  enough that the panel never becomes the page. */
const SEARCH_LIMIT = 8;

/**
 * Ranked matches over the two things this map can fly to — a located saint,
 * and a place from `data/places.js`.
 *
 * Prefix matches rank above contained ones, and saints above places only
 * within the same tier: a reader typing "ale" almost certainly wants
 * Alexandria before they want Alexander, and one typing "anth" wants
 * Anthony. Both corpora are small enough (69 located saints, ~70 places)
 * that a linear scan per keystroke is far below the cost of the repaint the
 * same keystroke does not even trigger — MiniSearch is on the boot path for
 * the Index and is not worth reaching for here.
 */
export function searchMatches(query, saints, places, limit = SEARCH_LIMIT) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = [];

  const consider = (label, tier, payload) => {
    const at = label.toLowerCase().indexOf(q);
    if (at < 0) return;
    scored.push({ rank: (at === 0 ? 0 : 1) * 2 + tier, at, label, ...payload });
  };

  for (const place of places) {
    // A place is findable by any of the names a reader might type for it,
    // but is always *listed* under its primary one — matching "Byzantium"
    // and then offering a row headed "Byzantium" would suggest the corpus
    // knows a place by that name, which it does not.
    consider(place.name, 0, { kind: 'place', place, label: place.name });
    for (const alias of place.also ?? []) {
      const at = alias.toLowerCase().indexOf(q);
      if (at >= 0) scored.push({ rank: (at === 0 ? 0 : 1) * 2 + 0, at, kind: 'place', place, label: place.name });
    }
  }
  for (const card of saints) consider(saintName(card), 1, { kind: 'saint', card });

  const seen = new Set();
  return scored
    .sort((a, b) => a.rank - b.rank || a.at - b.at || a.label.localeCompare(b.label))
    .filter((row) => {
      const key = `${row.kind}:${row.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * The search box: type, arrow through, Enter to fly there.
 *
 * **It moves the map rather than opening the saint** — a dot is already a
 * door (`wirePress`), and a search that navigated away would make the map
 * the thing you leave rather than the thing you look at. Choosing a saint
 * flies to where their dot currently is; choosing a place flies to the
 * place's own coordinates at the zoom `data/places.js` gives it.
 */
function wireSearch(el, canvas, withPlace, setView) {
  const input = el.querySelector('[data-search-input]');
  const list = el.querySelector('[data-search-list]');
  let rows = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    rows = [];
    active = -1;
  };

  const mark = () => {
    for (const [i, li] of [...list.children].entries()) {
      li.classList.toggle('is-active', i === active);
      li.setAttribute('aria-selected', String(i === active));
    }
    if (active >= 0) input.setAttribute('aria-activedescendant', `map-search-row-${active}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const open = () => {
    rows = searchMatches(input.value, withPlace, PLACES);
    if (!rows.length) {
      close();
      return;
    }
    const M = STRINGS.map;
    list.innerHTML = rows
      .map(
        (row, i) =>
          `<li class="map-search-row" id="map-search-row-${i}" role="option" aria-selected="false" data-row="${i}">
             <span class="map-search-name">${esc(row.kind === 'saint' ? saintName(row.card) : row.label)}</span>
             <span class="map-search-kind utility">${esc(row.kind === 'saint' ? M.searchSaints : M.searchPlaces)}</span>
           </li>`,
      )
      .join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    mark();
  };

  /** Flies the view to a chosen row, and says so — the canvas is one opaque
   *  image to a screen reader, so a view that moved silently would be a
   *  control that appeared to do nothing. */
  const choose = (row) => {
    if (!row) return;
    const frame = frameOf(canvas);
    let lon;
    let lat;
    let scale;
    if (row.kind === 'place') {
      ({ lon, lat } = row.place);
      scale = Math.min(ceilingOf(canvas), Math.max(MIN_SCALE, row.place.zoom));
    } else {
      const at = pointAt(row.card, dateFrom, dateTo, shownYear());
      if (!at) return;
      ({ lon, lat } = at.where);
      // Close enough to read the name and its neighbours, not so close that
      // the reader has to zoom back out to learn where in the world they are.
      scale = Math.min(ceilingOf(canvas), 30);
    }
    const p = project(lon, lat);
    setView({ scale, ...clampCentre(p.x, p.y, scale, frame) });
    input.value = row.kind === 'saint' ? saintName(row.card) : row.label;
    close();
    announce(el, fill(STRINGS.map.searchFlewTo, { name: input.value }));
  };

  input.addEventListener('input', open);
  input.addEventListener('focus', () => {
    if (input.value.trim()) open();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (list.hidden) {
        open();
        return;
      }
      e.preventDefault();
      active += e.key === 'ArrowDown' ? 1 : -1;
      // Wraps both ways, and from the "nothing chosen yet" -1 an ArrowUp
      // lands on the last row rather than on nothing.
      if (active < 0) active = rows.length - 1;
      else if (active >= rows.length) active = 0;
      mark();
    } else if (e.key === 'Enter') {
      if (!list.hidden && rows.length) {
        e.preventDefault();
        choose(rows[active >= 0 ? active : 0]);
      }
    } else if (e.key === 'Escape') {
      close();
    }
  });
  list.addEventListener('mousedown', (e) => {
    // `mousedown`, not `click`: the input's own blur would close the list
    // out from under a click before it landed.
    const li = e.target.closest('[data-row]');
    if (!li) return;
    e.preventDefault();
    choose(rows[Number(li.dataset.row)]);
  });
  input.addEventListener('blur', () => {
    // After the frame, so a mousedown on a row is not raced by the blur.
    setTimeout(close, 0);
  });
}

/** A live-region announcement for something only the picture shows. */
function announce(el, message) {
  let box = el.querySelector('[data-map-say]');
  if (!box) {
    box = document.createElement('p');
    box.className = 'sr-only';
    box.setAttribute('aria-live', 'polite');
    box.dataset.mapSay = '';
    el.appendChild(box);
  }
  box.textContent = message;
}

/**
 * The press, which **chooses a saint rather than opening one** since
 * 2026-08-31. It was a door from 2026-08-30 (Amendment 77) and the reversal
 * is the author's: "if you click on a saint dot (or their name) it first
 * centres you smoothly on them and then shows their path of travel." The
 * door is the `Profile ›` button that choosing puts beside the name, so
 * nothing is unreachable — but a dot is now a thing you can look at as well
 * as leave by, which is what having a rail to show made worth doing.
 *
 * A press is still distinguished from a drag the way loop-scroll's
 * click-swallow does it — by distance, not by time — and the hit radius is
 * still a finger's rather than the dot's own 2.5 px.
 */
function wirePress(canvas, choose, release) {
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = downAt;
    downAt = null;
    if (!was || Math.hypot(e.clientX - was.x, e.clientY - was.y) > 5) return;
    const hit = dotAt(canvas, e);
    // A press that finds nobody is the "click away" that lets go — on the
    // picture only. The timeline is not somewhere to click away *to*:
    // scrubbing the years to watch the chosen saint move is the whole
    // reason for choosing one.
    if (hit) choose(hit);
    else release();
  });
  // The cursor says a dot is pressable before the press finds out.
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    canvas.style.cursor = dotAt(canvas, e) ? 'pointer' : '';
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') release();
  });
}

/**
 * The `Profile ›` button, which is the only way from the map to a saint now
 * that a press on a dot selects instead. Wired once; `paintCanvas` decides
 * where it sits and whether it is shown at all.
 */
function wireProfile(el, router) {
  el.querySelector('[data-profile]').addEventListener('click', () => {
    if (selected) router.navigate(`/saints/${selected}`);
  });
}

/**
 * The saint under a pointer: a dot within a finger's reach, or a name.
 *
 * **The name counts as much as the dot** (author, 2026-08-31: "if you click
 * on a saint dot (or their name)"), and it is the larger target of the two —
 * 2.5 px of dot against a whole word — so where the two disagree the dot
 * still wins, being the thing the reader was aiming at.
 */
function dotAt(canvas, e) {
  const box = canvas.getBoundingClientRect();
  const x = e.clientX - box.left;
  const y = e.clientY - box.top;
  let best = null;
  let bestD = 12;
  for (const dot of drawnDots) {
    const d = Math.hypot(dot.x - x, dot.y - y);
    if (d < bestD) {
      bestD = d;
      best = dot;
    }
  }
  if (best) return best;
  return (
    drawnDots.find(
      (dot) =>
        dot.labelRect &&
        x >= dot.labelRect.x &&
        x <= dot.labelRect.x + dot.labelRect.w &&
        y >= dot.labelRect.y &&
        y <= dot.labelRect.y + dot.labelRect.h,
    ) ?? null
  );
}

export function destroy() {
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  cancelFlight();
  // A walk belongs to the visit that started it; the paint loop it keeps
  // alive is cancelled with `fadeFrame` below. So does the fall-back, which
  // would otherwise start the next visit mid-dim.
  railPlay = null;
  focus = null;
  selectFade.value = 0;
  for (const off of cleanups) off();
  cleanups = [];
  if (fadeFrame !== null) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }
  // A fresh visit starts every label unseen rather than resuming an old
  // visit's opacities on saints a new render has not drawn yet — and every
  // tracked dot standing where its year says rather than gliding there from
  // wherever the last visit's timeline had left it.
  labelState.clear();
  railAt.clear();
}

/**
 * Zoom and pan.
 *
 * Until 2026-08-30 the rule here was that a bare wheel must scroll the page
 * and only Ctrl could zoom, because a map in the middle of a scrolling
 * article that swallows the wheel is a trap. The author reversed it ("have
 * the mouse scroll zoom in or out smoothly without having to hold Ctrl at
 * all") in the same breath as removing everything below the map — and the
 * two instructions only work together: with no page under the stage there is
 * nothing to scroll past, so the wheel has one honest meaning left and the
 * trap the old rule guarded against cannot be built any more. Touch is the
 * map's for the same reason (`touch-action: none` in map.css); the header
 * above the stage remains the way out.
 *
 * `cards` is a getter, not the array — the timeline can narrow it after this
 * wiring runs, and a closure over a stale array would zoom an empty map
 * forever (Amendment 76's own lesson, relearned when the filter came back).
 *
 * `schedulePaint` is `render`'s own rAF-coalescing scheduler: the wheel and
 * the drag/pinch handlers below call `setThrottled` through every raw
 * pointer event, and only the last one inside a frame needs to actually
 * reach the canvas. The buttons and the keyboard call the plain `set`
 * instead — a discrete press paints straight away, both because there is
 * nothing to coalesce (it happens once) and because a test that clicks and
 * immediately reads the canvas is a real caller.
 */
function wireZoom(el, canvas, cards, schedulePaint) {
  const level = el.querySelector('[data-zoom-level]');
  const applyChrome = () => {
    /*
     * There is somewhere to go whenever an axis is cropped, which on a window
     * wider than the projection is true at 1.0x — the poles are off the top and
     * bottom and no amount of zooming *in* would bring them back, so a reader
     * who could not pan at rest could never see them at all.
     */
    canvas.classList.toggle('is-pannable', canPan(canvas));
    // A number, not a bar: "2.8x" is a fact a screen reader can read out, and
    // `aria-live` means a press on + says what it did rather than only looking
    // like it did something.
    level.textContent = `${view.scale.toFixed(1)}×`;
    el.querySelector('[data-zoom="out"]').disabled = view.scale <= MIN_SCALE;
    el.querySelector('[data-zoom="in"]').disabled = view.scale >= ceilingOf(canvas) - 0.01;
  };

  const set = (next) => {
    view = next;
    applyChrome();
    paintCanvas(canvas, cards());
  };

  const setThrottled = (next) => {
    view = next;
    applyChrome();
    schedulePaint(cards());
  };

  for (const button of el.querySelectorAll('[data-zoom]')) {
    button.addEventListener('click', () => {
      const how = button.dataset.zoom;
      const target =
        how === 'home' ? homeView : zoomAbout(view, how === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas));
      /*
       * A discrete step eases rather than jumping (2026-09-04) — the same
       * flight the wheel and a pinch already give for free by being
       * continuous gestures; a button or a key is not, so it borrows `flyTo`.
       * The ceiling is passed explicitly: `flyTo`'s own default is the
       * desktop `MAX_SCALE`, and a narrower window's real ceiling
       * (`maxScaleFor`) is higher — left to the default, every eased zoom
       * step silently capped at 240x on a phone, which is not what
       * `ceilingOf` was for.
       */
      flyTo(target, frameOf(canvas), set, () => {}, ceilingOf(canvas));
      // A disabled button drops focus to the body, which strands the keyboard
      // at the top of the document. Hand it to the map, which is the thing the
      // reader was working.
      if (button.disabled) canvas.focus();
    });
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      /*
       * No modifier gate (author, 2026-08-30) - the wheel *is* the zoom.
       * `exp(-deltaY * 0.002)` makes it smooth by construction: every unit of
       * wheel travel multiplies the scale by the same factor, so a slow roll
       * creeps and a spin sweeps, continuously, with no notch steps - and the
       * anchor stays under the pointer the whole way.
       */
      e.preventDefault();
      const box = canvas.getBoundingClientRect();
      setThrottled(
        zoomAbout(
          view,
          Math.exp(-e.deltaY * 0.002),
          (e.clientX - box.left) / box.width,
          (e.clientY - box.top) / box.height,
          coverFractions(box.width, box.height, ASPECT),
          ceilingOf(canvas),
        ),
      );
    },
    // Not passive: this one calls preventDefault, and Chrome ignores it on a
    // passive listener while warning about it in a console nobody is reading.
    { passive: false },
  );

  /*
   * One pointer drags, two pinch. Held in a Map rather than as two variables
   * because a finger that leaves and returns mid-gesture is ordinary, and
   * `pointerId` is the only thing that tells them apart.
   */
  const active = new Map();
  let pinch = 0;

  canvas.addEventListener('pointerdown', (e) => {
    if (!canPan(canvas)) return;
    canvas.setPointerCapture(e.pointerId);
    active.set(e.pointerId, e);
    if (active.size === 2) pinch = spread(active);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!active.has(e.pointerId)) return;
    const previous = active.get(e.pointerId);
    active.set(e.pointerId, e);
    const box = canvas.getBoundingClientRect();

    if (active.size >= 2) {
      const now = spread(active);
      if (pinch > 0 && now > 0) {
        const mid = midpoint(active);
        setThrottled(zoomAbout(view, now / pinch, (mid.x - box.left) / box.width, (mid.y - box.top) / box.height, coverFractions(box.width, box.height, ASPECT), ceilingOf(canvas)));
      }
      pinch = now;
      return;
    }

    if (!canPan(canvas)) return;
    /*
     * Both axes, at every scale. The old vertical-drop for a thumb at rest
     * existed to honour `touch-action: pan-y` - the browser owned vertical
     * for the page's scroll - and went with the page it protected
     * (2026-08-30): touch is `none` now, every move reaches here, and an axis
     * with nowhere to go is already refused by the clamp arithmetic rather
     * than by this handler guessing.
     */
    setThrottled(
      panBy(
        view,
        (e.clientX - previous.clientX) / box.width,
        (e.clientY - previous.clientY) / box.height,
        coverFractions(box.width, box.height, ASPECT),
        ceilingOf(canvas),
      ),
    );
  });

  const release = (e) => {
    active.delete(e.pointerId);
    if (active.size < 2) pinch = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /*
   * The keyboard, which is not a courtesy either: §13 wants every interactive
   * element reachable, and a map that only answers to a dragged pointer is not.
   * A step is a tenth of the box, so ten presses cross it at any zoom.
   */
  canvas.addEventListener('keydown', (e) => {
    const pan = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
    if (pan) {
      if (!canPan(canvas)) return;
      e.preventDefault();
      set(panBy(view, -pan[0], -pan[1], frameOf(canvas), ceilingOf(canvas)));
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      flyTo(zoomAbout(view, ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas)), frameOf(canvas), set, () => {}, ceilingOf(canvas));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      flyTo(zoomAbout(view, 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas), ceilingOf(canvas)), frameOf(canvas), set, () => {}, ceilingOf(canvas));
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      flyTo(homeView, frameOf(canvas), set, () => {}, ceilingOf(canvas));
    }
  });

  applyChrome();
  paintCanvas(canvas, cards());

  // Handed to the search, so flying to a place moves the chrome as well as
  // the picture — see `render`.
  return set;
}

/** Whether the map has anywhere to move: zoomed in, or cropped by its window. */
function canPan(canvas) {
  if (view.scale > MIN_SCALE) return true;
  const frame = frameOf(canvas);
  return frame.fx < 1 || frame.fy < 1;
}

/** The distance between the first two live pointers, for a pinch. */
function spread(active) {
  const [a, b] = [...active.values()];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** The point a pinch is happening about. */
function midpoint(active) {
  const [a, b] = [...active.values()];
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

/**
 * The fine coastline, fetched the first time the reader zooms in far enough to
 * see the difference, and kept for the rest of the visit.
 *
 * Guarded by a promise on the canvas rather than a boolean: a drag that crosses
 * `DETAIL_AT` paints many frames a second, and a boolean set *after* the await
 * would have started a dozen fetches before the first of them landed.
 */
function ensureFine(canvas, cards) {
  if (canvas.__finePending) return;
  canvas.__finePending = Promise.all([import('../data/land.js'), import('../data/water.js')])
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
 * ships in the app's own entry bundle on *every* route; the terrain wash and
 * its tile grid are real weight (a raster decoder, a per-pixel tint builder,
 * a tile index) that only `/map` has any use for, and them living here once
 * cost every route's first paint about 150ms on a throttled connection —
 * measured on CI, not guessed at. `land.js`/`water.js` avoid this by being
 * pure data; this is the same move for the *code* that reads terrain data.
 */
let terrainLibPromise = null;
let terrainLib = null;
function loadTerrainLib() {
  if (!terrainLibPromise) {
    terrainLibPromise = import('../lib/map-terrain.js').then((lib) => {
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
 * soon"): the honest ceiling reasoning `DETAIL_AT`/`MAX_SCALE` already use
 * elsewhere on this page argues for the later number if 24 ever reads as
 * arriving before the 50m tier has anything left to show past — untested
 * against a real screen at the time of writing, so this is the number to
 * move first if it reads wrong.
 */
const HR_FADE_START = 24;
const HR_FADE_END = 30;

/**
 * The tile grid past `DETAIL_AT`, fetched only for cells the reader's own
 * view actually overlaps — one further step of the same "a reader who never
 * opens the map never pays for it" reasoning `ensureFine` already applies to
 * the fine coastline. `TILES` carries each cell's plain lon/lat bounds
 * (`make-terrain.py`); `visibleTiles` (lib) projects them itself (`project`,
 * the map's one copy of the projection) rather than trusting a second,
 * pre-baked copy.
 */
function ensureTerrainTiles(canvas, cards, frame) {
  if (!canvas.__tileMeta) {
    if (canvas.__tileMetaPending) return;
    canvas.__tileMetaPending = loadTerrainLib()
      .then(() => import('../data/terrain-tiles.js'))
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
  for (const tile of terrainLib.visibleTiles(canvas.__tileMeta, view, frame)) {
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
     * ever be drawn (`HR_FADE_START`) — fetched a beat early, the same
     * reasoning `TILE_FADE_START` gives the 50m grid, so the pair has
     * arrived by the time the crossfade needs it rather than popping in
     * mid-fade.
     */
    if (tile.hr && view.scale >= HR_FADE_START) {
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

async function drawWhenReady(el, canvas, cards) {
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
     * goes past `DETAIL_AT`, which for most visits is never.
     */
    const [{ LAND }, { LAKES, RIVERS }] = await Promise.all([
      import('../data/land-coarse.js'),
      import('../data/water-coarse.js'),
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
  } catch {
    // A map that cannot draw says so; it does not leave an empty rectangle
    // that reads as a bug or, worse, as an empty world.
    caption.textContent = STRINGS.map.landFailed;
    caption.hidden = false;
  }
}

function paintCanvas(canvas, cards) {
  // Whatever brought this paint about, it supersedes any fade-driven frame
  // still pending from a previous one — never two of those racing.
  if (fadeFrame !== null) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
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
   *  the rivers before this. */
  const tracePath = (shapes, closed) => {
    let any = false;
    for (const shape of shapes) {
      if (!boxVisible(bboxOf(shape))) continue;
      any = true;
      for (let i = 0; i < shape.length; i += 2) {
        const p = place(shape[i], shape[i + 1], frame);
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (closed) ctx.closePath();
    }
    return any;
  };

  /*
   * **Which coastline this frame draws** (2026-09-01). Past `DETAIL_AT` the
   * fine tier if it has arrived — and the ask for it if it has not, made from
   * the paint because the paint is the one place that knows the scale — and the
   * coarse one at every zoom below, so going back out gets the cheap frame back
   * rather than carrying the fine tier's point count into a picture of the
   * whole world.
   */
  const wantsFine = view.scale >= DETAIL_AT;
  if (wantsFine && canvas.__land && !canvas.__landFine) ensureFine(canvas, () => cards);
  const fine = wantsFine && canvas.__landFine;
  if (canvas.dataset.detail) canvas.dataset.detail = fine ? 'fine' : 'coarse';

  /*
   * **The coastline crossfades between tiers rather than popping** (2026-09-04:
   * "make the appearance of the high quality coastlines and lakes and rivers
   * fade in/out instead of just appearing"). `fine` above decides the target
   * tier the instant the data is ready or the reader crosses `DETAIL_AT`; this
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
     * **The outgoing tier stays at full strength underneath for the whole
     * transition, rather than fading out in step with the incoming one**
     * (2026-09-04, author: "make sure the low res coastlines remain
     * underneath until the high res are fully loaded otherwise theres a dip
     * in brightness"). It was `1 - detailT`, cross-dissolved against the
     * incoming tier's own `detailT` — and a linear cross-dissolve between two
     * *different* shapes (coarse and fine trace different edges) is not the
     * same as fading one shape's own opacity: a pixel the fine tier covers
     * that the coarse one does not is only ever as dark as whichever tier's
     * own partial alpha reaches it, and for a stretch in the middle neither
     * is near full — a real dip, not a rendering illusion. Holding this
     * layer at its own full opacity for as long as `detailT < 1` means the
     * picture is never thinner than "coarse, fully inked" while the fine
     * tier rises on top of it; only once the fine tier reaches its own full
     * strength does this stop being drawn at all (the `detailT < 1` guard
     * above), which is a single frame's swap rather than a fade the reader
     * can watch for a dip in.
     */
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexWithAlpha(inkSoft, 0.3);
    ctx.beginPath();
    tracePath(canvas.__detailFadeFrom.land, true);
    ctx.fill();
    if (canvas.__detailFadeFrom.water?.LAKES.length) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = '#000';
      ctx.beginPath();
      if (tracePath(canvas.__detailFadeFrom.water.LAKES, true)) ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (canvas.__detailFadeFrom.water?.RIVERS.length) {
      ctx.strokeStyle = hexWithAlpha(inkSoft, 0.5);
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
    const zoomFade = Math.max(0, Math.min(1, (view.scale - TILE_FADE_START) / (TILE_FADE_END - TILE_FADE_START)));

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
    if (zoomFade > 0) ensureTerrainTiles(canvas, () => cards, frame);
    const visible = zoomFade > 0 && terrainLib && canvas.__tileMeta ? terrainLib.visibleTiles(canvas.__tileMeta, view, frame) : [];
    const tilesReady =
      visible.length === 0 ||
      visible.every((t) => {
        const status = canvas.__tileState?.get(`${t.col}-${t.row}`)?.status;
        return status === 'loaded' || status === 'error';
      });
    const tileStrength = tilesReady ? zoomFade : 0;

    if (tileStrength < 1) {
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
       * Also the tile grid's own base and its fallback: drawn whenever the
       * grid is not at full strength — faded, absent, or not yet arrived —
       * so there is never a gap between the two, only a crossfade or a flat
       * map, never an empty one.
       */
      ctx.fillStyle = hexWithAlpha(inkSoft, 0.3 * detailT);
      ctx.beginPath();
      tracePath(land, true);
      ctx.fill();
    }

    if (tileStrength > 0) {
      if (visible.length && canvas.__tileState && detailT > 0) {
        /*
         * **The 10m tier crossfades in over the 50m one, per tile** — only
         * `hr: true` cells (`make-terrain.py`, within 1000 km of a located
         * saint) ever have a pair to draw, so every other cell keeps reading
         * the 50m grid alone at every zoom this map reaches.
         */
        const hrStrength = Math.max(0, Math.min(1, (view.scale - HR_FADE_START) / (HR_FADE_END - HR_FADE_START)));
        ctx.save();
        ctx.beginPath();
        tracePath(land, true);
        ctx.clip();
        const isDark = document.documentElement.classList.contains('dark');
        const base = tileStrength * detailT;
        for (const tile of visible) {
          const entry = canvas.__tileState.get(`${tile.col}-${tile.row}`);
          const hrEntry = tile.hr ? canvas.__tileState.get(`${tile.col}-${tile.row}-hr`) : null;
          const hrReady = hrEntry?.status === 'loaded';
          const topLeft = toScreen(view, project(tile.lon0, tile.lat0).x, project(tile.lon0, tile.lat0).y, frame);
          const bottomRight = toScreen(view, project(tile.lon1, tile.lat1).x, project(tile.lon1, tile.lat1).y, frame);
          const dx = topLeft.x * w;
          const dy = topLeft.y * h;
          const dw = (bottomRight.x - topLeft.x) * w;
          const dh = (bottomRight.y - topLeft.y) * h;

          if (entry?.status === 'loaded' && (!hrReady || hrStrength < 1)) {
            ctx.globalAlpha = base * (hrReady ? 1 - hrStrength : 1);
            ctx.drawImage(terrainLib.tintFor(entry, entry, inkSoft, isDark), dx, dy, dw, dh);
          }
          if (hrReady && hrStrength > 0) {
            ctx.globalAlpha = base * hrStrength;
            ctx.drawImage(terrainLib.tintFor(hrEntry, hrEntry, inkSoft, isDark), dx, dy, dw, dh);
          }
        }
        ctx.restore();
        if (visible.some((t) => canvas.__tileState.get(`${t.col}-${t.row}`)?.status === 'loaded')) {
          canvas.dataset.terrain = 'ok';
        }
      }
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
    const at = pointAt(card, dateFrom, dateTo, shownYear());
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
    if (at.track && card.slug === selected) rails.push({ track: at.track, state: at.state });
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
    const walk = railPlay?.slug === card.slug && at.track?.length > 1 ? (gliding - railPlay.start) / RAIL_PLAY_MS : null;
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
      railPlay = null;
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
   * goes in. `lib/map-view.js` argues the size of it.
   */
  for (const s of spreadShared(standing)) {
    const p = place(s.lon, s.lat, frame);
    const x = p.x * w;
    const y = p.y * h;
    // Off the visible box once zoomed, which is ordinary.
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) continue;
    onScreen.push({ card: s.card, where: s.where, state: s.state, x, y, moving: s.moving });
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

  drawnDots = [];
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
    (d.card.slug === selected ? 0 : d.moving ? 1 : 2 + dailyRank(d.card)) * 2 + (d.card.track?.length ? 0 : 1);

  /*
   * How far back everything that is not the chosen saint currently stands —
   * one eased number for the whole paint, stepped once here so the halo, the
   * dot and the name all fall back together rather than each reading the
   * clock a moment apart.
   */
  const otherDim = stepSelectFade(gliding);
  const dimOf = (slug) => (slug === focus ? 1 : otherDim);

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
        (softness(where.uncertainty_km) * (w / 360) * view.scale) / frame.fx,
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

  for (const { card, state, x, y, n, moving, members } of fanned) {
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
    drawnDots.push({
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
  const labelsEnabled = view.scale >= LABELS_AT;
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
  const nameable = drawnDots.filter((d) => d.slug === selected || shownState(d.state));
  /*
   * **Laid out best-ranked first**, which is what makes `rankOf` a ranking
   * of *names* rather than of dots: `layoutLabels` seats one cluster at a
   * time against what is already placed, so whoever is first is laid out
   * with the whole picture still free and whoever is last takes what is
   * left. The chosen saint is rank 0 and so is named at any zoom — the
   * `Profile ›` button goes "next to their name", and below `LABELS_AT`
   * there would otherwise be no names at all to be next to.
   */
  const chosen = selected ? nameable.find((d) => d.slug === selected) : null;
  const order = [...nameable].sort((a, b) => rankOf(a) - rankOf(b));
  const measure = (name) => ctx.measureText(name).width;
  const laid = labelsEnabled
    ? layoutLabels(order, measure, w, h, view.scale >= LEADERS_AT)
    : chosen
      ? layoutLabels([chosen], measure, w, h, false)
      : [];
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
  for (const dot of [...drawnDots].sort((a, b) => rankOf(b) - rankOf(a))) {
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
  placeProfile(canvas, placedFor.get(selected) ?? null);

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
    drawnDots.map((d) => ({
      x: Math.round(d.x),
      y: Math.round(d.y),
      slug: d.slug,
      state: d.state,
      n: d.n,
      alpha: Math.round(d.alpha * 100) / 100,
      hue: d.hue,
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
  canvas.dataset.walking = railPlay?.slug ?? '';
  /*
   * Who is chosen, and how many journeys were actually stroked for them.
   * Both written by the pass that draws, so doing nothing reads `''` and
   * `0` — a selection that never reached the picture cannot look like one
   * that did.
   */
  canvas.dataset.selected = selected ?? '';
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
   * However this paint was triggered, it is the one place that knows
   * whether any label is still mid-fade — so it is the one place that
   * decides whether another frame is owed. Cancelled at the top of every
   * call rather than left to expire on its own, so a paint that arrives for
   * an unrelated reason mid-fade does not end up with two of these racing.
   */
  const stillFading = [...labelState.values()].some((s) => s.value !== s.target);
  // The fall-back is the same kind of debt as a label mid-fade: it owes a
  // frame until it has arrived, and nothing else on the page will ask for one.
  const stillDimming = selectFade.value !== (focus ? 1 : 0);
  if (stillFading || stillGliding || railPlay || stillDimming) {
    fadeFrame = requestAnimationFrame(() => {
      fadeFrame = null;
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
  const dot = drawnDots.find((d) => d.slug === selected);
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
