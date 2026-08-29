import { chosenChurch, churchName, keptBy } from '../lib/church.js';
import { HOME, MAX_SCALE, MIN_SCALE, panBy, toScreen, zoomAbout } from '../lib/map-view.js';
import { ASPECT, project } from '../lib/mercator.js';
import { REGIONS_BY_ID } from '../lib/regions.js';
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
 * only weight is the coastline itself — 19 kB gzipped, in its own chunk, loaded
 * when this view is opened and never on the boot path.
 *
 * **Clustering, collide-detected labels and the timeline brush are deferred
 * too, and the reason is the corpus rather than the effort.** Seven of 742
 * saints carry a location, sixteen points between them. A density threshold
 * that never fires, labels that never collide and a timeline paced by event
 * density over seven lives would all be machinery verified against nothing —
 * and a count in the DOM is not a count in the corpus. They come back when the
 * data does.
 *
 * The picture is a canvas and the reader is not asked to see it: every point is
 * also a row in the list below, which is what carries the keyboard, the screen
 * reader, and the names. The canvas is the illustration; the list is the map.
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
const place = (lon, lat) => {
  const p = project(lon, lat);
  return toScreen(view, p.x, p.y);
};

const located = (card) => (card.locations ?? []).length > 0;

/** Every point of one kind, with the saint it belongs to. */
const pointsOfKind = (cards, which) =>
  cards.flatMap((card) => (card.locations ?? []).filter((l) => l.kind === which).map((where) => ({ card, where })));

export function render(el, { data, router }) {
  // `chosenChurch`, not `currentChurch` (2026-08-26): a *guess* from the
  // browser's language must not set part of the corpus aside here. lib/church.js
  // argues the split; the Daily page is the one page that cannot open without a
  // calendar, and it is the one page that reads the guess.
  const church = chosenChurch();
  const mine = data.saints.filter((s) => keptBy(s, church));
  const setAside = data.saints.length - mine.length;
  const withPlace = mine.filter(located);
  const without = mine.filter((s) => !located(s));

  const M = STRINGS.map;

  el.innerHTML = `
    <h1>${esc(M.title)}</h1>
    <p class="map-lede">${esc(
      fill(M.lede, { located: withPlace.length, count: mine.length }),
    )}${setAside ? ` ${esc(fill(M.setAside, { count: setAside, church: churchName(church) }))}` : ''}</p>

    <div class="map-kinds" role="group" aria-label="${esc(M.kindGroup)}">
      ${KINDS.map(
        (k) =>
          `<button type="button" class="map-kind utility" data-kind="${k}"
             aria-pressed="${String(k === kind)}">${esc(M.kinds[k])}
             <span class="map-kind-count">${pointsOfKind(withPlace, k).length}</span></button>`,
      ).join('')}
    </div>

    <figure class="map-figure">
      <!-- The box is reserved by aspect-ratio in CSS from the projection's own
           number, so it is the same height before the coastline arrives as
           after: brief §13's no-layout-shift, on a view whose data is fetched. -->
      <div class="map-frame">
        <!--
          tabindex="0" and arrow keys, because a canvas the pointer can drag
          and the keyboard cannot is half a control. The label says the map is
          movable and how, since a reader who cannot see it has no other way to
          learn that pressing an arrow does anything.
        -->
        <canvas data-map tabindex="0" role="img" aria-label="${esc(M.canvasLabel)}"></canvas>
        <!--
          The buttons are not a fallback for the gestures, they are the primary
          control: they work by keyboard, by screen reader and by touch without
          anyone having to discover a gesture, and on a phone they are the whole
          of the zoom. aria-live on the level so a press says what it did.
        -->
        <div class="map-zoom" role="group" aria-label="${esc(M.zoomGroup)}">
          <button type="button" class="icon-button map-zoom-btn" data-zoom="out" aria-label="${esc(M.zoomOut)}">&minus;</button>
          <span class="map-zoom-level utility" data-zoom-level aria-live="polite"></span>
          <button type="button" class="icon-button map-zoom-btn" data-zoom="in" aria-label="${esc(M.zoomIn)}">+</button>
          <button type="button" class="map-zoom-home utility" data-zoom="home">${esc(M.zoomReset)}</button>
        </div>
      </div>
      <figcaption class="map-caption utility" data-caption></figcaption>
    </figure>

    <h2 class="register-heading">${esc(M.placesHeading)}</h2>
    <ul class="register map-places" data-places></ul>

    <!-- "They are never silently dropped" (§8.3). The tray is a disclosure and
         not a footnote: at present it holds all but seven of the corpus, which
         is the honest shape of this page today and should be impossible to
         miss. -->
    <details class="map-unlocated">
      <summary>${esc(fill(M.unlocated, { count: without.length }))}</summary>
      <p class="utility">${esc(M.unlocatedNote)}</p>
      <ul class="register map-unlocated-list">
        ${without
          .map(
            (s) =>
              `<li class="reg-row"><a class="reg-name" href="${esc(router.href(`/saints/${s.slug}`))}">${esc(saintName(s))}</a></li>`,
          )
          .join('')}
      </ul>
    </details>`;

  paintPlaces(el, withPlace, router);

  const canvas = el.querySelector('[data-map]');
  const draw = () => paintCanvas(canvas, withPlace);
  destroy();
  view = HOME;

  for (const button of el.querySelectorAll('[data-kind]')) {
    button.addEventListener('click', () => {
      kind = button.dataset.kind;
      for (const b of el.querySelectorAll('[data-kind]')) b.setAttribute('aria-pressed', String(b === button));
      paintPlaces(el, withPlace, router);
      draw();
    });
  }

  /*
   * The coastline is fetched, so the first paint is the empty box and the
   * second has land in it. Nothing moves between them — the box is reserved —
   * and the caption says which state the reader is looking at rather than a
   * blank picture standing there meaning nothing.
   */
  drawWhenReady(el, canvas, withPlace);

  wireZoom(el, canvas, withPlace);

  /*
   * The canvas is sized from its own box, so it has to be repainted when the
   * box changes. Torn down in `destroy` rather than returned: main.js calls
   * `view.destroy?.()` and ignores a return value, so a listener handed back
   * from here would outlive the view and repaint a canvas that had left the
   * document — which is a leak per navigation, not per page.
   */
  onResize = () => paintCanvas(canvas, withPlace);
  window.addEventListener('resize', onResize);
}

export function destroy() {
  if (onResize) window.removeEventListener('resize', onResize);
  onResize = null;
}

/**
 * Zoom and pan.
 *
 * The rule the whole arrangement is built around: **a reader must never be able
 * to get stuck on this page.** A map in the middle of a scrolling article that
 * swallows the wheel, or that eats a thumb-swipe on a phone, is a trap — and it
 * is the reader who wanted to scroll past who pays for it, not the one who
 * wanted to zoom.
 *
 * So: the wheel scrolls the page as it always did unless Ctrl (or Command) is
 * held, which is the convention browsers themselves use for zoom. Touch keeps
 * `pan-y` until the reader has *deliberately* zoomed in, and only then does the
 * map take the gestures — a state they entered on purpose and can leave with
 * one press of Reset. At scale 1 there is nowhere to pan to anyway
 * (`lib/map-view.js` collapses the range), so nothing is lost by it.
 */
function wireZoom(el, canvas, cards) {
  const level = el.querySelector('[data-zoom-level]');
  const apply = () => {
    /*
     * Touch gestures are taken only once the reader has zoomed in. `pan-y`
     * leaves the page's own vertical scroll to the browser, which is the thing
     * a thumb on a phone is almost always trying to do.
     */
    canvas.style.touchAction = view.scale > MIN_SCALE ? 'none' : 'pan-y';
    canvas.classList.toggle('is-zoomed', view.scale > MIN_SCALE);
    // A number, not a bar: "2.8x" is a fact a screen reader can read out, and
    // `aria-live` means a press on + says what it did rather than only looking
    // like it did something.
    level.textContent = `${view.scale.toFixed(1)}×`;
    el.querySelector('[data-zoom="out"]').disabled = view.scale <= MIN_SCALE;
    el.querySelector('[data-zoom="in"]').disabled = view.scale >= MAX_SCALE;
    el.querySelector('[data-zoom="home"]').disabled = view.scale <= MIN_SCALE;
    paintCanvas(canvas, cards);
  };

  const set = (next) => {
    view = next;
    apply();
  };

  for (const button of el.querySelectorAll('[data-zoom]')) {
    button.addEventListener('click', () => {
      const how = button.dataset.zoom;
      if (how === 'home') set(HOME);
      else set(zoomAbout(view, how === 'in' ? ZOOM_STEP : 1 / ZOOM_STEP));
      // A disabled button drops focus to the body, which strands the keyboard
      // at the top of the document. Hand it to the map, which is the thing the
      // reader was working.
      if (button.disabled) canvas.focus();
    });
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      // Without the modifier this listener does nothing at all and the page
      // scrolls — no preventDefault, no interception.
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const box = canvas.getBoundingClientRect();
      set(
        zoomAbout(
          view,
          Math.exp(-e.deltaY * 0.002),
          (e.clientX - box.left) / box.width,
          (e.clientY - box.top) / box.height,
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
    if (view.scale <= MIN_SCALE && e.pointerType === 'touch') return;
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
        set(zoomAbout(view, now / pinch, (mid.x - box.left) / box.width, (mid.y - box.top) / box.height));
      }
      pinch = now;
      return;
    }

    if (view.scale <= MIN_SCALE) return;
    set(panBy(view, (e.clientX - previous.clientX) / box.width, (e.clientY - previous.clientY) / box.height));
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
      if (view.scale <= MIN_SCALE) return;
      e.preventDefault();
      set(panBy(view, -pan[0], -pan[1]));
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      set(zoomAbout(view, ZOOM_STEP));
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      set(zoomAbout(view, 1 / ZOOM_STEP));
    } else if (e.key === 'Home' || e.key === '0') {
      e.preventDefault();
      set(HOME);
    }
  });

  apply();
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
  const caption = el.querySelector('[data-caption]');
  try {
    // Dynamic, so the coastline is its own chunk: 19 kB gzipped that a reader
    // who never opens the map never pays for.
    const { LAND } = await import('../data/land.js');
    if (!canvas.isConnected) return;
    canvas.__land = LAND;
    paintCanvas(canvas, cards);
    caption.textContent = STRINGS.map.caption;
  } catch {
    // A map that cannot draw says so; it does not leave an empty rectangle
    // that reads as a bug or, worse, as an empty world.
    caption.textContent = STRINGS.map.landFailed;
  }
}

/** The rows, which are the map for anyone not looking at the picture. */
function paintPlaces(el, cards, router) {
  const M = STRINGS.map;
  const points = pointsOfKind(cards, kind);
  const list = el.querySelector('[data-places]');
  if (!points.length) {
    list.innerHTML = `<li class="reg-row utility">${esc(fill(M.noneOfKind, { kind: M.kinds[kind] }))}</li>`;
    return;
  }
  list.innerHTML = points
    .map(({ card, where }) => {
      /*
       * The region's display name, which is the only place-name the manifest
       * carries. `modern_name` and `historical_name` are in each saint's own
       * file but are dropped from the manifest on purpose — two strings per
       * location across 5,000 saints is real weight on the one request the
       * whole site boots from (§4). So the map names the region and the saint's
       * own page names the village, which is where a reader who wants that has
       * already gone.
       *
       * The raw id is never printed: `slavic-east` is a key, not a place.
       */
      const place = REGIONS_BY_ID[where.region]?.display_name ?? '';
      /*
       * The uncertainty is printed, not only drawn. The halo says "about here"
       * to a reader looking at the picture; this says it in kilometres to
       * everyone else, and DESIGN.md §6b's rule is that uncertainty is never
       * allowed to read as precision.
       */
      const km = Number.isFinite(where.uncertainty_km)
        ? ` <span class="map-uncertainty utility">${esc(fill(M.uncertainty, { km: where.uncertainty_km }))}</span>`
        : '';
      return `<li class="reg-row">
        <a class="reg-name" href="${esc(router.href(`/saints/${card.slug}`))}">${esc(saintName(card))}</a>
        <span class="map-place utility">${esc(place)}${km}</span>
      </li>`;
    })
    .join('');
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
  const w = Math.round(box.width);
  const h = Math.round(box.width / ASPECT);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);

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
        const p = place(ring[i], ring[i + 1]);
        const x = p.x * w;
        const y = p.y * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  for (const { where } of pointsOfKind(cards, kind)) {
    const p = place(where.lon, where.lat);
    const x = p.x * w;
    const y = p.y * h;
    // Off the visible box once zoomed, which is ordinary. The row for it is
    // still in the list below, so nothing has gone missing from the page.
    if (p.x < -0.1 || p.x > 1.1 || p.y < -0.1 || p.y > 1.1) continue;

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
    const halo = Math.min(softness(where.uncertainty_km) * (w / 360) * view.scale, w / 2);
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
