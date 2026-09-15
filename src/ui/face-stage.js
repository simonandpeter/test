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
 *   1. read where the outgoing layer sits on the glass, and where All Saints'
 *      own page would put the stage
 *   2. `data-swapping` — both layers go absolute
 *   3. dress the root for *both* faces at once (`data-route="calendar saints"`)
 *      and pin the All Saints layer to its own page's box, so neither face is
 *      re-laid-out by the other's stylesheet
 *   4. toward Daily: the window goes to 0 and the root takes `data-fills-window`
 *   5. render the incoming face (Daily always; All Saints only if it has never
 *      been painted — plan §11.7 b, entering the pair from a third route)
 *   6. *next frame* flip `data-face` — both transforms animate
 *   7. on `transitionend`, unpin, hand `data-route` to the face that landed,
 *      drop `data-swapping`, and — landing on All Saints — hand the page's
 *      scroll back and tell the virtualised grid.
 *
 * Steps 1–5 are one synchronous block on purpose: the browser paints between
 * tasks, not between statements, so the reader never sees the intermediate
 * state where a layer has gone absolute but not yet been pinned.
 *
 * **Both faces are dressed for the whole of the slide, and that is step 3's
 * whole point** (author, 2026-09-15: "the page layout changes ... when I click
 * on the All Saints page and the swipe transition happens with that newly
 * appeared layout"). Eighty-odd rules in `calendar.css` hang off the root's
 * `data-route`, `--side-w` among them — so a navigation that flipped the
 * attribute to `saints` before the slide took the day's two-column grid away
 * from the page that was still on screen and slid the wreckage out. The
 * attribute is a *set* now, matched with `[data-route~='calendar']`, and
 * `main.js` leaves it to this file for the length of a swap exactly as it
 * already leaves `data-fills-window`.
 */

import { reducedMotion } from '../lib/motion.js';

/**
 * The gap between the two faces in flight, so they never touch mid-slide.
 * `base.css`'s resting transforms carry it as a literal 32px; the travel this
 * file publishes for the flight has to agree with them.
 */
const FACE_GAP = 32;

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
 * Where the stage — and so the layer inside it — stands when the page is
 * dressed for `face` and the window is at the top.
 *
 * The two faces do not share a box. The day's `main` is pulled up under the bar
 * and gives up the page's scroll (`calendar.css`, and `base.css`'s "a route
 * that fills the window"); All Saints' begins below the bar and scrolls the
 * window. Sliding All Saints inside the day's box is what cropped it to the
 * day's own margins before it moved (author, 2026-09-15: "the All Saints page
 * crops to just the margins of the Daily page before it swipes up. They should
 * be independent"), so the incoming layer is pinned to the box its own page
 * would have given it.
 *
 * Measured by dressing the root and asking, for the reason `wasAt` is measured
 * rather than computed: whatever the bar's height is doing, this follows it.
 * Two forced layouts in a frame that is already reflowing, and no paint can
 * fall between them — the browser paints between tasks, not between statements.
 *
 * **Caller obligation: the window must be at the top**, or the answer carries
 * the scroll. Only the swap toward All Saints asks, and it asks from the day,
 * which has no page scroll to be at.
 */
function stageTopFor(face) {
  const root = document.documentElement;
  const route = root.dataset.route ?? '';
  const filled = root.dataset.fillsWindow !== undefined;
  root.dataset.route = face;
  if (face === 'calendar') root.dataset.fillsWindow = '';
  else delete root.dataset.fillsWindow;
  const top = stage.getBoundingClientRect().top;
  root.dataset.route = route;
  if (filled) root.dataset.fillsWindow = '';
  else delete root.dataset.fillsWindow;
  return top;
}

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
  const index = layers.saints;

  /*
   * Where the outgoing layer is on the glass *now*, measured rather than
   * computed from `offsetTop`. The plan's arithmetic assumes the stage starts
   * at the document's origin; measuring the same two boxes before and after
   * the box model changes under them is right whatever the chrome's height is
   * doing, and costs one forced layout in a frame that is already reflowing.
   */
  const wasAt = outgoing.getBoundingClientRect().top;
  /*
   * Where the All Saints layer's own page puts its first pixel. Arriving, that
   * is its resting top less the scroll it is coming back to, so the slide lands
   * showing what the reader left and the restore changes nothing they can see;
   * leaving, it is simply where it already stands.
   */
  const indexAt = to === 'saints' ? stageTopFor('saints') - returning : wasAt;

  stage.dataset.swapping = '';
  // Both faces, for the length of the slide. See the header: the day's
  // stylesheet has to survive a navigation that has already answered `saints`.
  root.dataset.route = 'calendar saints';
  if (to === 'calendar') {
    // The day owns the window past 1024 px; All Saints is the only one of the
    // two that scrolls the page, and it has just been recorded.
    window.scrollTo(0, 0);
    root.dataset.fillsWindow = '';
  }
  const stageBox = stage.getBoundingClientRect();
  /*
   * The day's layer needs no pin: the stage *is* its box, in both directions,
   * because the root is dressed for the day for the whole flight. Only All
   * Saints is somewhere else, and `height` carries it to the foot of the glass
   * rather than to the foot of the day's page.
   */
  const top = Math.round(indexAt - stageBox.top);
  index.style.top = `${top}px`;
  index.style.height = `${Math.round(window.innerHeight - stageBox.top - top)}px`;
  /*
   * One travel for both layers, since they no longer share a height.
   *
   * **Unrounded, because this value has to be *exactly* what `calc(100% + 32px)`
   * was.** It replaces that fallback for the length of the flight, on a layer
   * whose `transform` is transitioned — so half a pixel of difference is a
   * transition of its own, fired on the setup that should not move anything and
   * ended 620 ms later, over whatever is happening by then.
   */
  stage.style.setProperty('--swap-travel', `${stageBox.height + FACE_GAP}px`);

  render(incoming);

  const land = () => {
    // In this order and in one block, landing on All Saints: the root gives the
    // scroll back, the layer returns to flow so the document is tall enough to
    // take it, and only then is the position written. Any other order clamps
    // the restore to zero.
    if (to === 'saints') delete root.dataset.fillsWindow;
    // The face that landed is the route again, and the face that left gives its
    // stylesheet up — which is the moment it has nothing on screen to lose.
    root.dataset.route = to;
    delete stage.dataset.swapping;
    stage.style.removeProperty('--swap-travel');
    index.style.top = '';
    index.style.height = '';
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
  /*
   * **A `transitionend` before the face has flipped belongs to the last slide,
   * not to this one**, and taking it would land this one before it had moved:
   * `done` goes true, the flip below is skipped, and the stage sits on the face
   * the reader was leaving with the route already saying the other. Both slides
   * animate the *same* two layers, and the previous one's end can arrive after
   * this one's listener is attached — a reader who steps across and straight
   * back inside `--dur-swap` is the ordinary way to produce it.
   */
  const onEnd = (e) => {
    if (!stageUp() || stage.dataset.face !== to) return;
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
