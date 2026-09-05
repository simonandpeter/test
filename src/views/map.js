import { saintName } from '../lib/honorific.js';
import { lifeInterval } from '../lib/index-filters.js';
import { trackPath } from '../lib/map-track.js';
import { clampCentre, clampView, coverFractions, fitBounds, HOME, MIN_SCALE, toWorld } from '../lib/map-view.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { ASPECT, project } from '../lib/mercator.js';
import { reducedMotion } from '../lib/motion.js';
import { fill, STRINGS } from '../ui/strings.js';
import { wireFilters, wireZoom } from './map/chrome.js';
import { cancelFlight, flyTo, PLAY_GLYPH, railAt, SPEEDS, wireMotion } from './map/motion.js';
import { drawWhenReady, labelState, paintCanvas, selectFade } from './map/paint.js';
import { wirePress, wireProfile } from './map/press.js';
import { wireSearch } from './map/search.js';
import { announce, ceilingOf, map, place } from './map/state.js';
import { timelineMarkup, wireTimeline } from './map/timeline.js';
export { searchMatches } from './map/search.js';

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
 *
 * **One folder since 2026-09-05** (cleanup plan item 5, on the author's
 * word: "Items 5 and 6"). This file was 4,603 lines; what stays here is the
 * markup, the render and its teardown, and the choosing of a saint or a
 * blob. The rest is `map/`: `state.js` (what every module shares, and the
 * rule that none keeps a copy of it), `paint.js` (the draw pass and the
 * terrain it fetches), `motion.js` (flight, glide and playback),
 * `timeline.js`, `chrome.js` (zoom and the filter panel), `search.js` and
 * `press.js`. Every comment travelled with its code; where one says
 * "above" or "below" of something now in another file, the name is still
 * the way to find it. `scripts/extraction-check.mjs` was run over the cut
 * (CLAUDE.md trap 6), and four dead names went with it — `kind`, `KINDS`,
 * `DEFAULT_KIND`, `pointsOfKind`, the kind selector's leftovers, unused
 * since the buttons went on 2026-08-31.
 */

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

const located = (card) => (card.locations ?? []).length > 0 || (card.track ?? []).length > 0;

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
  if (bounds && (map.dateFrom === null || map.dateTo === null || map.dateFrom < bounds.min || map.dateTo > bounds.max)) {
    map.dateFrom = bounds.min;
    map.dateTo = bounds.max;
    map.playhead = null;
  }
  // "otherwise it starts by default on the highest year" (author), which is the
  // top of the *range* rather than of the corpus: it is a mark inside the
  // window, so where it starts is where that window ends.
  if (bounds && map.playhead === null) map.playhead = map.dateTo;

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

          **type="search" (2026-09-04)**, matching the All Saints search
          field (index/controls.js): the native clear "×" it puts at the
          field's own right edge is a platform control offered for free
          rather than one this file would otherwise have to build, wire to
          close(), and keep positioned inside the field on every width.
        -->
        <div class="map-search" data-search>
          <input type="search" class="map-search-input" data-search-input
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
                        `<option value="${n}"${n === map.speed ? ' selected' : ''}>${esc(
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
  map.homeView = HOME;
  map.view = HOME;
  map.selected = null;
  map.railPlay = null;
  map.focus = null;
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
    map.view = next;
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
    map.homeView = defaultView(withPlace, coverFractions(box.width, box.height, ASPECT));
    // Only if the reader has not moved the map themselves in the meantime:
    // settling takes a frame or two at worst, but yanking a view someone had
    // already started working would be worse than the centre it corrects.
    if (map.view === HOME) applyView(map.homeView);
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
    const at = members.findIndex((c) => c.slug === map.selected);
    const card = members[(at + 1) % members.length];
    if (!card || card.slug === map.selected) return;

    // Dropped first, so the outgoing saint's rail and name are not left
    // standing on the picture for the length of the flight — and no walk from
    // a previous choice carries on under the new one.
    map.selected = null;
    map.railPlay = null;
    /*
     * The fall-back starts here rather than when the flight lands, which is
     * what makes it happen "as the screen centres" — the rest of the map
     * eases back over exactly the length of the flight, so the picture
     * arrives already quiet. `selected` still waits for the landing, and the
     * rail and the name with it.
     */
    map.focus = card.slug;
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
      const { px, py } = toWorld(map.view, mark.x / box.width, mark.y / box.height, frame);
      target = { scale: map.view.scale, ...clampCentre(px, py, map.view.scale, frame) };
    }

    flyTo(target, frame, (next) => applyView(next), () => {
      map.selected = card.slug;
      /*
       * **And then the life is walked, once.** The rail is drawn by the paint
       * this schedules — the author's original order, "first centres you
       * smoothly on them and then shows their path" — and the dot sets off
       * along it at the same moment. Under reduced motion it does not: the
       * walk carries no information the still picture withholds (the rail is
       * drawn whole either way), so removing it removes an animation and
       * nothing else.
       */
      map.railPlay = track.length > 1 && !reducedMotion() ? { slug: card.slug, start: performance.now() } : null;
      refresh();
      announce(el, fill(STRINGS.map.selected, { name: saintName(card) }));
    });
  };

  /**
   * A press on a blob — open or closed — frames it, the same door a rail's
   * own dot already opens (author, 2026-09-04: "when you click on a blob it
   * centres you onto it smoothly as it centres you when you click a dot with
   * a life rail and it centres you over the rail"). `fitBounds` over the
   * blob's own members is the same call `choose` makes over a rail's own
   * stays.
   *
   * **Not `RAIL_FIT_MAX`, and not a plain cap at all — a floor.** A rail
   * spans a real distance on the ground, so capping how far *in* framing it
   * is allowed to go is the only bound that ever binds. A blob is the
   * opposite shape of problem: it is only reachable at all once its own
   * members have separated far enough to resolve individually
   * (`readyBlobs`, above), so `fitBounds`'s own honest answer for "fill the
   * frame with just these dots" is routinely a *tighter* zoom than the one
   * the reader is already standing at — and capping it down the way a rail's
   * flight does would zoom back *out* of the resolution that made the blob
   * clickable in the first place, un-blobbing it the instant it is pressed
   * (found live: clicking closed a blob it had just opened, on a phone's own
   * narrower ceiling). `Math.max(fitted.scale, view.scale)` is the fix —
   * never asked to zoom out to fit something already on screen, only ever in.
   *
   * **No saint is selected.** A blob is a grouping of real, separate saints
   * rather than one of them, so nothing here touches `selected`, `focus`, or
   * the fall-back the rest of the map eases into while one is chosen — this
   * only moves the camera and opens the blob it framed, the same thing
   * hovering or centring on it already do.
   */
  const chooseBlob = (blob) => {
    map.activeBlobId = blob.id;
    const box = canvas.getBoundingClientRect();
    const frame = coverFractions(box.width, box.height, ASPECT);
    // `toWorld` hands back `{px, py}` — `fitBounds` reads `.x`/`.y`, the same
    // shape `project` returns for a rail's own points above. Passing the
    // `{px, py}` object straight through left every point NaN and the whole
    // view with it: found live, a click on a blob turned the picture black.
    const worldPts = blob.marks.map((m) => {
      const { px, py } = toWorld(map.view, m.x / box.width, m.y / box.height, frame);
      return { x: px, y: py };
    });
    const fitted = fitBounds(worldPts, frame, undefined, ceilingOf(canvas));
    const target = clampView({ ...fitted, scale: Math.max(fitted.scale, map.view.scale) }, frame, ceilingOf(canvas));
    flyTo(target, frame, (next) => applyView(next), () => {}, ceilingOf(canvas));
  };

  const release = () => {
    cancelFlight();
    map.railPlay = null;
    // `focus` and not `selected` decides whether there is anything to let go
    // of: a press during the flight, before the selection has landed, is
    // still a reader changing their mind and must bring the map back.
    if (map.focus === null && map.selected === null) return;
    map.focus = null;
    map.selected = null;
    refresh();
  };

  wirePress(canvas, choose, chooseBlob, release, refresh);
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
  map.onResize = () => schedulePaint(visible());
  window.addEventListener('resize', map.onResize);
}

export function destroy() {
  if (map.onResize) window.removeEventListener('resize', map.onResize);
  map.onResize = null;
  cancelFlight();
  // A walk belongs to the visit that started it; the paint loop it keeps
  // alive is cancelled with `fadeFrame` below. So does the fall-back, which
  // would otherwise start the next visit mid-dim.
  map.railPlay = null;
  map.focus = null;
  selectFade.value = 0;
  map.activeBlobId = null;
  map.hoveredBlobId = null;
  map.openBlobId = null;
  for (const off of map.cleanups) off();
  map.cleanups = [];
  if (map.fadeFrame !== null) {
    cancelAnimationFrame(map.fadeFrame);
    map.fadeFrame = null;
  }
  // A fresh visit starts every label unseen rather than resuming an old
  // visit's opacities on saints a new render has not drawn yet — and every
  // tracked dot standing where its year says rather than gliding there from
  // wherever the last visit's timeline had left it.
  labelState.clear();
  railAt.clear();
}
