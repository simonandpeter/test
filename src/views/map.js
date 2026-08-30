import { isUndated, overlaps } from '../lib/dates.js';
import { lifeInterval } from '../lib/index-filters.js';
import { HOME, MAX_SCALE, MIN_SCALE, coverFractions, declutter, panBy, toScreen, zoomAbout } from '../lib/map-view.js';
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

/*
 * Where the map is looking. Reset on every render rather than held across
 * visits: the kind selector holds for the visit because it is a question the
 * reader asked, but arriving at the map zoomed into a corner you left three
 * pages ago is disorienting rather than helpful. `lib/map-view.js` owns the
 * arithmetic and `tests/map-view.test.mjs` pins it.
 */
let view = HOME;

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
   * Undated is never excluded — there is nothing here to judge it against,
   * and unlike the Index's date facet this page has no tray left to set it
   * aside in (Amendment 77), so "always shown" is the honest stand-in.
   */
  const inTimeline = (card) => !bounds || isUndated(lifeInterval(card.dates)) || overlaps(lifeInterval(card.dates), dateFrom, dateTo);
  const visible = () => withPlace.filter(inTimeline);

  /*
   * **The map is the window, not a card in the column** (author, 2026-08-29:
   * "make sure on mobile and desktop the map is the whole window, under the
   * header, not just a predefined window").
   *
   * So the stage is full-bleed and exactly as tall as the space under the
   * sticky bar, and the page's own reading — the lede, the register, the tray —
   * is below it. The two things that had to survive the change:
   *
   * - The **h1 stays first in the document**, where a heading belongs and where
   *   `the heading takes focus on navigation` expects it, and is drawn over the
   *   map's top-left rather than above it. It is the page's name; the map is
   *   the page.
   * - The **kinds stay visible at all times**, which §8.3 asks for by name:
   *   "make the current kind visible in the legend at all times". They are the
   *   legend, so they sit on the map with the heading.
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

        <div class="map-legend">
          <h1 class="map-title">${esc(M.title)}</h1>
          <div class="map-kinds" role="group" aria-label="${esc(M.kindGroup)}">
            ${KINDS.map(
              (k) =>
                `<button type="button" class="map-kind utility" data-kind="${k}"
                   aria-pressed="${String(k === kind)}">${esc(M.kinds[k])}
                   <span class="map-kind-count" data-kind-count="${k}">${pointsOfKind(visible(), k).length}</span></button>`,
            ).join('')}
          </div>
        </div>

        <!--
          The buttons are not a fallback for the gestures, they are the
          primary control: they work by keyboard, by screen reader and by
          touch without anyone having to discover a gesture, and on a phone
          they are the whole of the zoom. aria-live on the level so a press
          says what it did.
        -->
        <div class="map-zoom" role="group" aria-label="${esc(M.zoomGroup)}">
          <button type="button" class="icon-button map-zoom-btn" data-zoom="out" aria-label="${esc(M.zoomOut)}">&minus;</button>
          <span class="map-zoom-level utility" data-zoom-level aria-live="polite"></span>
          <button type="button" class="icon-button map-zoom-btn" data-zoom="in" aria-label="${esc(M.zoomIn)}">+</button>
          <button type="button" class="map-zoom-home utility" data-zoom="home">${esc(M.zoomReset)}</button>
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
  view = HOME;

  /*
   * One pass, so a kind press and a timeline drag move the same three things
   * together: the kind counts in the legend, the picture, and (when the
   * timeline exists) its own readout — never just one of them agreeing with
   * itself while the others lag.
   */
  const refresh = () => {
    const cards = visible();
    for (const k of KINDS) {
      el.querySelector(`[data-kind-count="${k}"]`).textContent = String(pointsOfKind(cards, k).length);
    }
    paintCanvas(canvas, cards);
  };

  refresh();

  for (const button of el.querySelectorAll('[data-kind]')) {
    button.addEventListener('click', () => {
      kind = button.dataset.kind;
      for (const b of el.querySelectorAll('[data-kind]')) b.setAttribute('aria-pressed', String(b === button));
      refresh();
    });
  }

  wirePress(canvas, router);

  /*
   * The coastline is fetched, so the first paint is the empty box and the
   * second has land in it. Nothing moves between them — the box is reserved —
   * and `data-land` says which state the picture is in, because a canvas that
   * drew nothing and one that drew the sea are the same screenshot.
   */
  drawWhenReady(el, canvas, visible);

  wireZoom(el, canvas, visible);

  if (bounds) wireTimeline(el, withPlace, bounds, refresh, visible);

  /*
   * The canvas is sized from its own box, so it has to be repainted when the
   * box changes. Torn down in `destroy` rather than returned: main.js calls
   * `view.destroy?.()` and ignores a return value, so a listener handed back
   * from here would outlive the view and repaint a canvas that had left the
   * document — which is a leak per navigation, not per page.
   */
  onResize = () => paintCanvas(canvas, visible());
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
  return `
    <div class="map-timeline">
      <div class="map-timeline-track">
        <span class="map-timeline-bound utility" aria-hidden="true">${bounds.min}</span>
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
        <span class="map-timeline-bound utility" aria-hidden="true">${bounds.max}</span>
      </div>
      <div class="map-timeline-status">
        <p class="map-timeline-readout utility" data-timeline-readout aria-live="polite"></p>
        <button type="button" class="map-timeline-reset utility" data-timeline-reset>${esc(M.timelineReset)}</button>
      </div>
    </div>`;
}

/**
 * Wires the two range inputs — and the highlighted span between them — to
 * one effective span, held in the module-level `dateFrom`/`dateTo` so it
 * survives the visit the way `kind` does. `visible` is the same getter
 * `refresh()` uses — one predicate, read twice, rather than a second copy
 * that could drift from it.
 */
function wireTimeline(el, withPlace, bounds, refresh, visible) {
  const fromInput = el.querySelector('[data-timeline-from]');
  const toInput = el.querySelector('[data-timeline-to]');
  const fillEl = el.querySelector('[data-timeline-fill]');
  const readout = el.querySelector('[data-timeline-readout]');
  const resetBtn = el.querySelector('[data-timeline-reset]');

  const paint = () => {
    const span = bounds.max - bounds.min || 1;
    const lo = ((dateFrom - bounds.min) / span) * 100;
    const hi = ((dateTo - bounds.min) / span) * 100;
    fillEl.style.left = `${lo}%`;
    fillEl.style.right = `${100 - hi}%`;
    readout.textContent = fill(STRINGS.map.timelineReadout, {
      from: dateFrom,
      to: dateTo,
      shown: visible().length,
      total: withPlace.length,
    });
    resetBtn.disabled = dateFrom === bounds.min && dateTo === bounds.max;
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
  resetBtn.addEventListener('click', () => {
    fromInput.value = String(bounds.min);
    toInput.value = String(bounds.max);
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
    refresh();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag = null;
    fillEl.classList.remove('is-dragging');
  };
  fillEl.addEventListener('pointerup', endDrag);
  fillEl.addEventListener('pointercancel', endDrag);

  paint();
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
 */
function wireZoom(el, canvas, cards) {
  const level = el.querySelector('[data-zoom-level]');
  const apply = () => {
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
    el.querySelector('[data-zoom="home"]').disabled = view.scale <= MIN_SCALE;
    paintCanvas(canvas, cards());
  };

  const set = (next) => {
    view = next;
    apply();
  };

  for (const button of el.querySelectorAll('[data-zoom]')) {
    button.addEventListener('click', () => {
      const how = button.dataset.zoom;
      if (how === 'home') set(HOME);
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
      set(
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
        set(zoomAbout(view, now / pinch, (mid.x - box.left) / box.width, (mid.y - box.top) / box.height, coverFractions(box.width, box.height, ASPECT)));
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
    set(
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
      set(HOME);
    }
  });

  apply();
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
    for (const ring of land) {
      for (let i = 0; i < ring.length; i += 2) {
        const p = place(ring[i], ring[i + 1], frame);
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  const water = canvas.__water;
  if (water) {
    const ringPath = (ring) => {
      ctx.beginPath();
      for (let i = 0; i < ring.length; i += 2) {
        const p = place(ring[i], ring[i + 1], frame);
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };
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
      for (const ring of water.LAKES) ringPath(ring);
      ctx.fill();
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
      for (const line of water.RIVERS) {
        ctx.beginPath();
        for (let i = 0; i < line.length; i += 2) {
          const p = place(line[i], line[i + 1], frame);
          const x = p.x * w;
          const y = p.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  const onScreen = [];
  for (const { card, where } of pointsOfKind(cards, kind)) {
    const p = place(where.lon, where.lat, frame);
    const x = p.x * w;
    const y = p.y * h;
    // Off the visible box once zoomed, which is ordinary. The row for it is
    // still in the list below, so nothing has gone missing from the page.
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) continue;
    onScreen.push({ card, where, x, y });
  }

  drawnDots = [];
  const labels = [];
  /*
   * Spread apart before anything is drawn, not after: the halo, the dot and
   * the label all read from the same adjusted x/y, so two saints who share a
   * spot (`lib/map-view.js`'s `declutter`, 2026-08-31 — John the
   * Long-Suffering and Moses the Hungarian both at the Caves in Kyiv) get a
   * halo and a label at the place each is actually drawn.
   */
  for (const { card, where, x, y } of declutter(onScreen)) {
    /*
     * The uncertainty curve's first shipping consumer (DESIGN.md §6b). The halo
     * is softness in px at base scale, scaled linearly with the picture's width
     * — the curve is never reshaped, only scaled, which is the rule that keeps
     * a date bar, a map halo and a timeline dissolve the same statement about
     * doubt.
     */
    /*
     * Scaled by the zoom as well as by the picture's width. The uncertainty is
     * a distance on the ground, so a halo that stayed the same size in pixels
     * would claim a tighter and tighter place the further in the reader went —
     * precision the data does not have. §6b permits scaling the curve linearly
     * and forbids reshaping it, which is exactly this multiplication.
     *
     * The ceiling is drawing, not doubt: at full zoom an open interval's halo
     * would be a thousand pixels of wash over the whole picture, which tells
     * the reader nothing they cannot already read in the row below.
     */
    const halo = Math.min((softness(where.uncertainty_km) * (w / 360) * view.scale) / frame.fx, w / 2);
    if (halo > 1) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, halo);
      glow.addColorStop(0, hexWithAlpha(rubric, 0.45));
      glow.addColorStop(1, hexWithAlpha(rubric, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, halo, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = rubric;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // A hairline in the page's ink so a dot on a dark coastline still reads.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    drawnDots.push({ x, y, slug: card.slug, name: saintName(card) });
  }

  /*
   * Names arrive with the zoom (§8.3: "Zoom in to reveal more dots, then
   * labels"), and a label that would overlap one already drawn is dropped
   * rather than drawn over it - the brief's own words. Sixteen points make
   * that a straight rectangle test; the collide-and-nudge machinery stays
   * with the density work it belongs to (Amendment 69).
   */
  if (view.scale >= LABELS_AT) {
    ctx.font = `12px ${style.getPropertyValue('--font-utility').trim() || 'sans-serif'}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    for (const dot of drawnDots) {
      const wText = ctx.measureText(dot.name).width;
      const rect = { x: dot.x + 6, y: dot.y - 8, w: wText + 4, h: 16 };
      if (rect.x + rect.w > w || dot.x < 0 || dot.y < 0 || dot.y > h) continue;
      if (labels.some((r) => rect.x < r.x + r.w && r.x < rect.x + rect.w && rect.y < r.y + r.h && r.y < rect.y + rect.h)) {
        continue;
      }
      labels.push(rect);
      ctx.fillText(dot.name, rect.x + 2, dot.y);
    }
  }
  /*
   * The count of drawn labels, published for the suite. An instrument, so the
   * standing question applies - what would it look like if it were doing
   * nothing? Zero, always: it is written by the same pass that draws, so a
   * paint that never labels writes '0' and the test's zoomed half goes red
   * rather than green-by-absence.
   */
  canvas.dataset.labels = String(labels.length);
  // The hit-map, published for the press test: same pass, same rule - a paint
  // that drew nothing writes '[]' and the pressing half goes red.
  canvas.dataset.dots = JSON.stringify(drawnDots.map((d) => ({ x: Math.round(d.x), y: Math.round(d.y), slug: d.slug })));
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
