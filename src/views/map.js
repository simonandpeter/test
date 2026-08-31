import { PERIODS, spanOf } from '../data/periods.js';
import { PLACES } from '../data/places.js';
import { isUndated, overlaps } from '../lib/dates.js';
import { lifeInterval } from '../lib/index-filters.js';
import { layoutLabels } from '../lib/map-labels.js';
import { HOME, MAX_SCALE, MIN_SCALE, clampCentre, coverFractions, declutter, panBy, toScreen, zoomAbout } from '../lib/map-view.js';
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
 * saint's own life span, reusing the Index's own `lifeInterval` and
 * `overlaps` (`lib/index-filters.js`, `lib/dates.js`) rather than inventing a
 * second reading of the same dates. An undated life is never excluded — there
 * is nothing to judge it against, and the map has no tray left to set it
 * aside in (Amendment 77) — so it always shows, indifferent to the slider.
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

/** What the last paint drew, in CSS px - the press's hit-map and the labels'. */
let drawnDots = [];

/** The threshold past which dots get their names (§8.3: "then labels"). */
const LABELS_AT = 2.5;

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

const located = (card) => (card.locations ?? []).length > 0;

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
 * **What is deferred, and why.** The same instruction describes the dot
 * *sliding along a rail* as the handle crosses a life — which needs a saint
 * to carry an ordered sequence of places with dates on them, and the corpus
 * records at most four unordered `locations` with no dates of their own
 * (`see` and `relics` carry none at all). So the rail is not faked here:
 * what this returns is the best-attested single place for the year asked
 * about, and the day the data carries a real itinerary this is the function
 * that grows one.
 *
 * `state` is what the drawing pass dims by:
 *   `live`    the year sits inside the saint's own life — full colour, glow.
 *   `past`    they had already died — greyed, still legible.
 *   `future`  they were not yet born — greyed twice as far, and no glow,
 *             because a halo is a claim about a place someone *was*.
 */
function pointAt(card, from, to) {
  const locations = card.locations ?? [];
  if (!locations.length) return null;
  const byKind = (k) => locations.find((l) => l.kind === k);
  const iv = lifeInterval(card.dates);
  const born = iv.earliest;
  const died = iv.latest;

  // The saint's most representative single place, death first for the reason
  // §8.3 gives — it is the one kind almost every saint has, and where a
  // martyr died is the fact their commemoration is usually built on.
  const settled = byKind('death') ?? byKind('relics') ?? byKind('see') ?? byKind('birth') ?? locations[0];

  /*
   * An undated life is never dimmed and never moved, the same standing it
   * has had since the timeline shipped: there is nothing to judge it
   * against, so it shows its settled place at full strength whatever the
   * handles say.
   */
  if (to === null || born === null || died === null) return { where: settled, state: 'live' };

  /*
   * **Position from the upper handle; dimming from the whole range.** They
   * are different questions and were briefly conflated: where a saint was
   * in a given year is answered by that year alone, but whether the reader's
   * chosen span *contains* that saint's life is a question about both ends.
   * A saint who died in 1750 with the range set to 1700–1777 is squarely
   * inside the reader's window and must not be greyed merely because the
   * upper handle is past their death.
   */
  const state = overlaps(iv, from, to) ? 'live' : to < born ? 'future' : 'past';

  if (to < born) {
    // Not yet born: their birthplace is the only honest dot, and it marks a
    // place they will be rather than one they are.
    return { where: byKind('birth') ?? settled, state };
  }
  if (to >= died) {
    // Dead by this year. `relics` outranks `death` only once the year is
    // past the death itself, which is the one point at which "where they
    // are" and "where they died" can honestly differ.
    return { where: byKind('relics') ?? byKind('death') ?? settled, state };
  }
  // Alive at that year: a bishop's see is where they were, otherwise the
  // place they started from.
  return { where: byKind('see') ?? byKind('birth') ?? settled, state };
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
  }

  /*
   * **The timeline dims rather than removes** (author, 2026-08-31: saints
   * outside the range "are greyed but still visible"). Until then it
   * excluded them outright, and `visible()` returned a narrowed array; now
   * every located saint is drawn on every paint and the range decides only
   * how brightly (`pointAt`'s `state`). So this is the whole located set,
   * always, and the readout below counts how many of them the range
   * actually contains rather than how many are on screen.
   */
  const visible = () => withPlace;
  const inTimeline = (card) =>
    !bounds || isUndated(lifeInterval(card.dates)) || overlaps(lifeInterval(card.dates), dateFrom, dateTo);

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
      </div>

      ${bounds ? timelineMarkup(M, bounds) : ''}
    </div>

    <!--
      The one thing kept below the picture (author, 2026-08-30): the credit
      and the hint. The credit is printed from the first paint - it is a fact
      about the data, not about this visit's network - and only *changes* if
      the coastline fails, at which point the failure note replaces it.
    -->
    <footer class="map-foot">
      <p class="map-caption utility" data-caption>${esc(M.caption)}</p>
    </footer>`;

  const canvas = el.querySelector('[data-map]');
  destroy();
  homeView = defaultView(withPlace, frameOf(canvas));
  view = homeView;

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

  refresh();

  wirePress(canvas, router);

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
  wireSearch(el, canvas, withPlace, setView);

  if (bounds) wireTimeline(el, withPlace, bounds, refresh, inTimeline);

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
   * Each end is a typed year and an era (author, 2026-08-31: "Add the
   * ability to type the years in on the left and right of the timeline,
   * with a selection for BC / AD"), where a printed bound used to stand.
   * The number the reader types is always positive and the era carries the
   * sign, because "431 BC" is a year a reader can read and "-431" is one
   * they have to decode — `yearBox` below is the one place that conversion
   * happens in either direction.
   */
  const yearBox = (side, label, value) => {
    const bc = value < 0;
    return `
      <div class="map-year" data-year-box="${side}">
        <input type="number" class="map-year-num utility" data-year-num="${side}"
          value="${Math.abs(value)}" min="1" step="1" inputmode="numeric"
          aria-label="${esc(label)}" />
        <select class="map-year-era utility" data-year-era="${side}" aria-label="${esc(M.era)}">
          <option value="ad"${bc ? '' : ' selected'}>${esc(M.eraAD)}</option>
          <option value="bc"${bc ? ' selected' : ''}>${esc(M.eraBC)}</option>
        </select>
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
        </div>
        ${yearBox('to', M.yearTo, dateTo)}
      </div>
      <div class="map-timeline-status">
        <p class="map-timeline-readout utility" data-timeline-readout aria-live="polite"></p>
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
 * survives the visit the way `kind` does. `visible` is the same getter
 * `refresh()` uses — one predicate, read twice, rather than a second copy
 * that could drift from it.
 */
function wireTimeline(el, withPlace, bounds, refresh, inTimeline) {
  const fromInput = el.querySelector('[data-timeline-from]');
  const toInput = el.querySelector('[data-timeline-to]');
  const fillEl = el.querySelector('[data-timeline-fill]');
  const readout = el.querySelector('[data-timeline-readout]');
  const presetSel = el.querySelector('[data-timeline-preset]');
  const numOf = (side) => el.querySelector(`[data-year-num="${side}"]`);
  const eraOf = (side) => el.querySelector(`[data-year-era="${side}"]`);

  /** The typed pair, written back from whatever the range handles now say. */
  const paintYearBoxes = () => {
    for (const [side, year] of [['from', dateFrom], ['to', dateTo]]) {
      numOf(side).value = String(Math.abs(year));
      eraOf(side).value = year < 0 ? 'bc' : 'ad';
    }
  };

  const paint = () => {
    const span = bounds.max - bounds.min || 1;
    const lo = ((dateFrom - bounds.min) / span) * 100;
    const hi = ((dateTo - bounds.min) / span) * 100;
    fillEl.style.left = `${lo}%`;
    fillEl.style.right = `${100 - hi}%`;
    /*
     * `shown` counts the saints the range actually contains, not the ones
     * drawn — since 2026-08-31 every located saint is drawn on every paint
     * and the range only dims (`pointAt`). The number a reader wants from
     * this line is still "how many of them am I asking about", which is
     * what it has always meant; it simply no longer coincides with the
     * count of dots on the picture.
     */
    readout.textContent = fill(STRINGS.map.timelineReadout, {
      from: dateFrom,
      to: dateTo,
      shown: withPlace.filter(inTimeline).length,
      total: withPlace.length,
    });
  };

  const commit = () => {
    // Whichever handle moved, the *sorted* pair is the effective range — a
    // thumb dragged past its twin still filters correctly rather than
    // needing to be physically stopped from crossing (see `timelineMarkup`).
    dateFrom = Math.min(Number(fromInput.value), Number(toInput.value));
    dateTo = Math.max(Number(fromInput.value), Number(toInput.value));
    paint();
    paintYearBoxes();
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

  paint();
  paintYearBoxes();
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
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, row.place.zoom));
    } else {
      const at = pointAt(row.card, dateFrom, dateTo);
      if (!at) return;
      ({ lon, lat } = at.where);
      // Close enough to read the name and its neighbours, not so close that
      // the reader has to zoom back out to learn where in the world they are.
      scale = Math.min(MAX_SCALE, 30);
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
 * A dot is a door (2026-08-30). The press is distinguished from a drag the
 * same way loop-scroll's click-swallow does it - by distance, not by time -
 * and the hit radius is a finger's, not the dot's own 2.5 px. The list below
 * remains the keyboard's and the screen reader's way in; this is the
 * pointer's.
 */
function wirePress(canvas, router) {
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = downAt;
    downAt = null;
    if (!was || Math.hypot(e.clientX - was.x, e.clientY - was.y) > 5) return;
    const hit = dotAt(canvas, e);
    if (hit) router.navigate(`/saints/${hit.slug}`);
  });
  // The cursor says a dot is pressable before the press finds out.
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    canvas.style.cursor = dotAt(canvas, e) ? 'pointer' : '';
  });
}

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
  return best;
}

export function destroy() {
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
  if (fadeFrame !== null) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }
  // A fresh visit starts every label unseen rather than resuming an old
  // visit's opacities on saints a new render has not drawn yet.
  labelState.clear();
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
    el.querySelector('[data-zoom="in"]').disabled = view.scale >= MAX_SCALE;
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
      if (how === 'home') set(homeView);
      else set(zoomAbout(view, how === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas)));
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
        setThrottled(zoomAbout(view, now / pinch, (mid.x - box.left) / box.width, (mid.y - box.top) / box.height, coverFractions(box.width, box.height, ASPECT)));
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
      set(panBy(view, -pan[0], -pan[1], frameOf(canvas)));
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      set(zoomAbout(view, ZOOM_STEP, 0.5, 0.5, frameOf(canvas)));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      set(zoomAbout(view, 1 / ZOOM_STEP, 0.5, 0.5, frameOf(canvas)));
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      set(homeView);
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

async function drawWhenReady(el, canvas, cards) {
  // `cards` is a getter: the coastline may land after the reader has already
  // dragged the timeline, and the paint must draw the set they are looking at.
  const caption = el.querySelector('[data-caption]');
  try {
    // Dynamic and in parallel, so the picture's own data is its own chunk
    // (or two — Vite splits each module) that a reader who never opens the
    // map never pays for, and one fetch does not wait on the other.
    const [{ LAND }, { LAKES, RIVERS }] = await Promise.all([import('../data/land.js'), import('../data/water.js')]);
    if (!canvas.isConnected) return;
    canvas.__land = LAND;
    canvas.__water = { LAKES, RIVERS };
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

  const land = canvas.__land;
  if (land) {
    /*
     * Ink at a low alpha rather than `--rule` itself. The rule is 1.39:1 on
     * gesso and 1.31:1 on the field — deliberately, because it divides text and
     * is not meant to be looked at — and a whole continent drawn in it was a
     * map you had to hunt for. This is quiet enough to stay a ground for the
     * dots and dark enough that the coastlines read as land.
     *
     * It takes no AA floor: the land is not text, and nothing on this page is
     * carried by the coastline alone — every point is a row in the list below.
     */
    ctx.fillStyle = hexWithAlpha(inkSoft, 0.3);
    ctx.beginPath();
    tracePath(land, true);
    ctx.fill();
  }

  const water = canvas.__water;
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
      ctx.strokeStyle = hexWithAlpha(inkSoft, 0.5);
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
  for (const card of cards) {
    const at = pointAt(card, dateFrom, dateTo);
    if (!at) continue;
    const p = place(at.where.lon, at.where.lat, frame);
    const x = p.x * w;
    const y = p.y * h;
    // Off the visible box once zoomed, which is ordinary.
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) continue;
    onScreen.push({ card, where: at.where, state: at.state, x, y });
  }

  drawnDots = [];
  /*
   * Spread apart before anything is drawn, not after: the halo, the dot and
   * the label all read from the same adjusted x/y, so two saints who share a
   * spot (`lib/map-view.js`'s `declutter`, 2026-08-31 — John the
   * Long-Suffering and Moses the Hungarian both at the Caves in Kyiv) get a
   * halo and a label at the place each is actually drawn.
   *
   * Grouped by `where.lon`/`where.lat` rather than the default x/y bucket
   * (2026-08-31): two saints sharing a place are the same place at every
   * zoom, and grouping by their *source* coordinate rather than this
   * frame's on-screen proximity keeps that true regardless of how far in
   * the reader goes, rather than the group dissolving the moment zooming
   * spreads them past `radiusPx` apart on screen.
   */
  const fanned = declutter(onScreen, undefined, (p) => `${p.where.lon},${p.where.lat}`);

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
  const haloed = fanned.filter((d) => d.state !== 'future');
  if (haloed.length) {
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const lc = layer.getContext('2d');
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const { where, x, y } of haloed) {
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

  for (const { card, state, x, y } of fanned) {
    /*
     * A saint outside the reader's chosen span is dimmed rather than
     * removed (author, 2026-08-31), and by how much says which side of it
     * they fall on: one who had already died is greyed, one not yet born is
     * "greyed out twice as much" — twice as far toward the ground, so the
     * three states are told apart by depth rather than by hue, and none of
     * them is carried by colour alone.
     */
    const alpha = state === 'live' ? 1 : state === 'past' ? DIM_PAST : DIM_FUTURE;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rubric;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // A hairline in the page's ink so a dot on a dark coastline still reads.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawnDots.push({ x, y, state, slug: card.slug, name: saintName(card) });
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
  const laid = labelsEnabled ? layoutLabels(drawnDots, (name) => ctx.measureText(name).width, w, h) : [];
  const placedFor = new Map(laid.map((l) => [l.dot.slug, l]));

  // One easing step per saint, drawn at whatever opacity it has reached —
  // 0 draws nothing, 1 is the label exactly as it always was, and anything
  // between is the fade actually happening.
  const now = performance.now();
  ctx.textBaseline = 'middle';
  let drawnLabels = 0;
  for (const dot of drawnDots) {
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
    const dim = dot.state === 'live' ? 1 : dot.state === 'past' ? DIM_PAST : DIM_FUTURE;
    ctx.globalAlpha = opacity * dim;
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
    drawnLabels++;
  }
  ctx.globalAlpha = 1;

  /*
   * The count of drawn labels, published for the suite. An instrument, so the
   * standing question applies - what would it look like if it were doing
   * nothing? Zero, always: it is written by the same pass that draws, so a
   * paint that never labels writes '0' and the test's zoomed half goes red
   * rather than green-by-absence.
   */
  canvas.dataset.labels = String(drawnLabels);
  // The hit-map, published for the press test: same pass, same rule - a paint
  // that drew nothing writes '[]' and the pressing half goes red.
  canvas.dataset.dots = JSON.stringify(
    drawnDots.map((d) => ({ x: Math.round(d.x), y: Math.round(d.y), slug: d.slug, state: d.state })),
  );

  /*
   * However this paint was triggered, it is the one place that knows
   * whether any label is still mid-fade — so it is the one place that
   * decides whether another frame is owed. Cancelled at the top of every
   * call rather than left to expire on its own, so a paint that arrives for
   * an unrelated reason mid-fade does not end up with two of these racing.
   */
  const stillFading = [...labelState.values()].some((s) => s.value !== s.target);
  if (stillFading) {
    fadeFrame = requestAnimationFrame(() => {
      fadeFrame = null;
      if (canvas.isConnected) paintCanvas(canvas, cards);
    });
  }
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
