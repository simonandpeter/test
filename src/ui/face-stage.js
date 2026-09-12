/**
 * The two faces of one page: Daily and All Saints, stacked in one clipped box
 * and slid past each other in `--dur-swap` (plan §5, 2026-09-12).
 *
 * **The point of the whole arrangement is what it does *not* do.** All Saints
 * is not re-rendered, not destroyed, not hidden and not removed when the
 * reader steps across to the day. Its layer stays in the document with a
 * non-zero box, so `ui/loop-scroll.js`'s ResizeObserver keeps reporting a
 * width, its rAF loop keeps turning, `track.scrollLeft` is never reset, and
 * the carousel is still drifting when it comes back up from below. Nothing in
 * `views/saints.js` or `views/index/*` is told anything happened — this module
 * imports neither and neither imports it. `main.js` simply passes a layer
 * where it used to pass `#view`, and skips the second `render()`.
 *
 * Layout lives in `base.css` under "the two faces of one page"; this file owns
 * only the order of operations, which is the part that has to be right to the
 * frame:
 *
 *   1. read where the outgoing layer sits on the glass
 *   2. `data-swapping` — both layers go absolute
 *   3. pin the outgoing layer back to the pixel it was on, so nothing jumps
 *   4. toward Daily: the window goes to 0 and the root takes `data-fills-window`
 *   5. render the incoming face (Daily always; All Saints only if it has never
 *      been painted — plan §11.7 b, entering the pair from a third route)
 *   6. *next frame* flip `data-face` — both transforms animate
 *   7. on `transitionend`, unpin, drop `data-swapping`, and — landing on All
 *      Saints — hand the page's scroll back and tell the virtualised grid.
 *
 * Steps 1–5 are one synchronous block on purpose: the browser paints between
 * tasks, not between statements, so the reader never sees the intermediate
 * state where a layer has gone absolute but not yet been pinned.
 */

import { reducedMotion } from '../lib/motion.js';

/**
 * The gap between the two faces in flight, so they never touch mid-slide.
 * Written into `base.css`'s two transforms as a literal 32px; this copy exists
 * only for the comment. Nothing here computes with it.
 */

/** Past 1024 px only (plan §7): below it the pair navigates by the shell's own
 *  cross-fade and there is no stage at all. */
export const stageWidth = () => window.innerWidth >= 1024;

let stage = null;
const layers = { saints: null, calendar: null };
/**
 * Which faces have actually been rendered into. A deep link to
 * `/calendar/2026-09-12` mounts both layers and paints one of them; the other
 * is empty until the first swap towards it, which is why that first swap
 * renders and *then* slides (§11.7 b). There is no retained state to lose.
 */
const painted = new Set();
/** The landing of a slide still in flight, so a second navigation can land it
 *  early rather than leave a layer pinned and absolute for ever. */
let settle = null;

export const stageUp = () => !!stage?.isConnected;
export const stageFace = () => (stageUp() ? (stage.dataset.face ?? null) : null);
export const facePainted = (face) => stageUp() && painted.has(face);
export const layerFor = (face) => (stageUp() ? layers[face] : null);

/**
 * `--dur-swap` read off the root rather than restated here, so the fallback
 * timer below cannot drift away from the transition it is insuring. It is a
 * plain literal token, not a registered property, so it hands back `620ms`
 * (trap 9 applies to the colours, not to this).
 */
function swapMs() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-swap').trim();
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 620;
  return raw.endsWith('ms') ? n : n * 1000;
}

const reachableTop = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

/**
 * Mount the stage into `#view` if it is not already there, and hand back the
 * layer for `face`. Both layers are created together and neither is ever
 * removed while the pair is on; the stage as a whole goes when the reader
 * leaves for a third route.
 */
export function mountStage(viewEl, face) {
  settle?.();
  if (!stageUp() || !viewEl.contains(stage)) {
    viewEl.innerHTML = '';
    painted.clear();
    stage = document.createElement('div');
    stage.className = 'face-stage';
    stage.dataset.face = face;
    // All Saints first in source order, so that when both layers are absolute
    // the incoming day paints over the page it is replacing.
    for (const name of ['saints', 'calendar']) {
      const layer = document.createElement('div');
      layer.className = 'face-layer';
      layer.dataset.layer = name;
      layers[name] = layer;
      stage.append(layer);
    }
    viewEl.append(stage);
  } else if (stage.dataset.face !== face) {
    // A face change that is not a swap — a width that has just crossed 1024 px,
    // or a route that arrived without a previous face to slide from.
    stage.dataset.face = face;
  }
  return layers[face];
}

export function markPainted(face) {
  painted.add(face);
}

/** Give `#view` back to the ordinary one-view arrangement. The caller destroys
 *  whichever views were painted first — this only takes the box away. */
export function teardownStage() {
  settle?.();
  stage?.remove();
  stage = null;
  layers.saints = null;
  layers.calendar = null;
  painted.clear();
}

/**
 * The swap itself. `render(layer)` is the caller's — it renders the incoming
 * view, or does nothing at all when the incoming face is All Saints and its
 * layer is already painted, which is the whole reason this exists.
 *
 * `returning` is `main.js`'s `sectionScroll` answer for the face being entered.
 * Landing on All Saints it is used twice: once to offset the incoming layer so
 * the slide arrives showing the pixels the reader left, and once as the real
 * `window.scrollTo` the moment the layer is back in flow. Doing only the second
 * is a slide into the top of the page followed by a jump.
 */
export function swapFace({ to, returning = 0, render }) {
  if (!stageUp()) return false;
  settle?.();
  const from = to === 'calendar' ? 'saints' : 'calendar';
  if (stage.dataset.face !== from) return false;

  const root = document.documentElement;
  const outgoing = layers[from];
  const incoming = layers[to];

  /*
   * Where the outgoing layer is on the glass *now*, measured rather than
   * computed from `offsetTop`. The plan's arithmetic assumes the stage starts
   * at the document's origin; measuring the same two boxes before and after
   * the box model changes under them is right whatever the chrome's height is
   * doing, and costs one forced layout in a frame that is already reflowing.
   */
  const wasAt = outgoing.getBoundingClientRect().top;
  stage.dataset.swapping = '';
  if (to === 'calendar') {
    // The day owns the window past 1024 px; All Saints is the only one of the
    // two that scrolls the page, and it has just been recorded.
    window.scrollTo(0, 0);
    root.dataset.fillsWindow = '';
  }
  const stageAt = stage.getBoundingClientRect().top;
  outgoing.style.top = `${Math.round(wasAt - stageAt)}px`;
  // The incoming All Saints arrives already scrolled to where it was left, so
  // that the restore on landing changes nothing the reader can see.
  incoming.style.top = to === 'saints' && returning ? `${-Math.round(returning)}px` : '';

  render(incoming);

  const land = () => {
    // In this order and in one block, landing on All Saints: the root gives the
    // scroll back, the layer returns to flow so the document is tall enough to
    // take it, and only then is the position written. Any other order clamps
    // the restore to zero.
    if (to === 'saints') delete root.dataset.fillsWindow;
    delete stage.dataset.swapping;
    outgoing.style.top = '';
    incoming.style.top = '';
    if (to !== 'saints') return;
    /*
     * **Re-measure before the position is written.** All Saints renders into
     * its layer while that layer is still absolute inside the clipped stage, so
     * what it measured was a box that stops existing when the slide lands: it
     * came back **330 px tall against the 730 px a cold load gives it**, the
     * document never grew past one screen, and the carousel mounted the first
     * screenful and stopped. It reads as the saints only appearing in the top
     * half of the page, and it is what the author saw.
     *
     * `views/index/modes.js` packs on `resize`, and nothing fires one when a
     * layer merely returns to flow — no viewport changed, only the box under it.
     * So it is sent by hand, and *before* the restore, because `reachableTop()`
     * is a question about the document's height and a short document clamps the
     * answer to it.
     *
     * This is the second seam of its kind: the scroll event below exists for the
     * same reason, that a view which listens to the window cannot hear a layout
     * it was never told about.
     */
    window.dispatchEvent(new Event('resize'));
    window.scrollTo(0, Math.min(returning, reachableTop()));
    // `views/index/grid.js` repaints its virtualised window from `window`'s own
    // scroll event, and a programmatic scroll onto a layout that has just been
    // rebuilt under it is not one it can rely on hearing.
    window.dispatchEvent(new Event('scroll'));
  };

  if (reducedMotion()) {
    // Removed, not shortened (PLAN). The pair still keeps its state — that is
    // not motion, it is memory — but there is no slide to wait for.
    stage.dataset.face = to;
    land();
    return true;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    incoming.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
    if (settle === finish) settle = null;
    land();
  };
  const onEnd = (e) => {
    if (e.target === incoming && e.propertyName === 'transform') finish();
  };
  incoming.addEventListener('transitionend', onEnd);
  /*
   * The insurance, not the mechanism: a transition that never starts — a token
   * that failed to resolve, a tab backgrounded mid-slide — would otherwise
   * leave both layers absolute and the page unscrollable. 120 ms of slack over
   * the transition's own length so it never fires first.
   */
  const timer = setTimeout(finish, swapMs() + 120);
  settle = finish;

  // A frame, so the browser has a start value to interpolate from: the styles
  // written above have not been through a style recalc yet, and a face flipped
  // in the same block is a jump.
  requestAnimationFrame(() => {
    if (done || !stageUp()) return;
    stage.dataset.face = to;
  });
  return true;
}
