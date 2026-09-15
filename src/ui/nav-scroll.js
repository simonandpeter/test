/**
 * The mobile nav row as an endless, centred strip — **one gesture, one page**.
 *
 * Author, 2026-09-15: "Either you swipe left or right and it takes you one spot
 * left or right, to the next one, or you click and it takes you there.
 * Currently you can swipe multiple and this isn't working."
 *
 * So the platform's scroller is not the instrument here any more. `overflow-x`
 * is `hidden` (base.css) and every position this row is drawn at is written by
 * this file: a drag follows the finger for **at most one page**, and the lift
 * glides to the page it was heading for — or back to the one it started on,
 * when the finger never travelled far enough to have meant it. A fling has no
 * momentum to spend because there is no native scroll to fling.
 *
 * That is also what deleted the three mechanisms the third cut needed — the
 * once-a-gesture guard, the 150 ms settle, and the flag answering "whose scroll
 * was that" — every one of which existed to share one scroller with the
 * compositor. `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` keeps them, and
 * they are worth keeping: they are the measurements that say why a native
 * scroller is the wrong instrument for a five-page ring, not a design to be put
 * back a piece at a time. `node scripts/nav-swipe.mjs` still films the strip.
 *
 * **Exactly five `<a>`, one per page, never cloned and never reordered in the
 * DOM** (PLAN.md §6) — the loop is a flex `order` rotation. A dozen places in
 * the suite hold `.site-nav a[href$="/saints"]` to be one element;
 * `tests/nav-strip.test.mjs` fails if this file learns to clone or to move a
 * node. The one-page rule is held by `a swipe carries the nav strip one page,
 * however hard it is thrown` in `e2e/chrome.spec.js`.
 */

import { reducedMotion, DUR } from '../lib/motion.js';

/**
 * `track` already holds the nav's five real `<a>`, one of them wearing
 * `aria-current="page"` — `renderNav` in `main.js` builds it, nothing buffered.
 *
 * **Caller obligation: the track needs `padding-inline: 50vw`** (base.css).
 * Anything less and a page standing nearer an edge than about half a label can
 * only be centred by asking for a negative `scrollLeft`, which a scroller
 * refuses — so every centring below lands short and shows as a jump.
 */
export function wireNavScroll(track) {
  let dead = false;
  /*
   * The five links in the site's own order, read once — safe because
   * `renderNav` calls `destroy()` before any rebuild that is not simply moving
   * `aria-current`.
   */
  const links = [...track.children];
  const n = links.length;
  const middle = Math.floor(n / 2);

  const write = (left) => {
    track.scrollLeft = left;
  };

  const currentEl = () => track.querySelector(':scope > a[aria-current="page"]');

  /** Where `scrollLeft` has to stand for `el` to sit on the track's midline. */
  const centreOf = (el) => el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;

  /** The five as they read left to right on the screen, which the DOM does not
   *  say: the ring turns by `order`, and `offsetLeft` is what answers. */
  const seenOrder = () => [...links].sort((a, b) => a.offsetLeft - b.offsetLeft);

  /**
   * Whichever link's own centre is nearest the track's — not necessarily the
   * *current* page, since a reader is free to swipe to any of the other four
   * without pressing one.
   */
  function nearestEl() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = null;
    let bestDist = Infinity;
    for (const el of links) {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < bestDist) {
        best = el;
        bestDist = d;
      }
    }
    return best;
  }

  /** The page one step from `el` in the direction the finger is going, and how
   *  far away it is. `el` is at the middle of five whenever a gesture starts,
   *  so there is always a neighbour; the fallback is for the frame after a
   *  language change, where a label's width has moved everything. */
  const neighbourOf = (el, dir) => {
    const seen = seenOrder();
    return seen[seen.indexOf(el) + dir] ?? el;
  };
  const stepSpan = (el, dir) => Math.abs(centreOf(neighbourOf(el, dir)) - centreOf(el));

  /**
   * Turns the ring until `el` stands in the middle of the five. Every link
   * keeps its place in the DOM; only the `order` each one carries changes, so
   * `links` stays the site's own order and the visual row becomes the ring
   * read from two pages before `el`.
   */
  function turn(el) {
    const i = links.indexOf(el);
    if (i < 0) return;
    for (let k = 0; k < n; k += 1) links[k].style.order = String((((k - i + middle) % n) + n) % n);
  }

  /**
   * Turns the ring to put `el` in the middle **while the picture holds still**:
   * whatever the reader is looking at stays on the pixel it was on, and only
   * the two pages off either end change which end they are at.
   *
   * The anchor is pinned by its own screen position rather than by a recomputed
   * centre, so this is exact at any point in a gesture and not only at rest.
   * Why the turn runs before the movement rather than after it:
   * `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js`.
   */
  function turnKeepingStill(el) {
    const anchor = nearestEl();
    if (!anchor) {
      turn(el);
      return;
    }
    const held = anchor.offsetLeft + anchor.offsetWidth / 2 - track.scrollLeft;
    turn(el);
    write(anchor.offsetLeft + anchor.offsetWidth / 2 - held);
  }

  /**
   * The rebalance: whichever page is centred now is put in the middle of the
   * five and re-centred. Silent, per the header — a ring rotation moves
   * nobody relative to anybody, and the re-centre lands on the pixel the page
   * was already on.
   */
  function balance(el) {
    if (dead) return;
    const target = el ?? nearestEl();
    if (!target) return;
    turn(target);
    write(centreOf(target));
  }

  /**
   * Keeps two pages of runway either side of the midline, run on every frame
   * this file moves the row — a reader's drag and its own tween both. Turning
   * only at the end of a journey is what left 85 px of blank strip on the
   * leading edge while it travelled (author, 2026-09-08: "they should be
   * visible as the animation is happening").
   *
   * There is no once-a-gesture guard any more and there must not be one again:
   * the guard protected a native fling from `scrollLeft` writes, and this row
   * no longer has one to protect.
   */
  function keepEndless() {
    if (dead) return;
    const near = nearestEl();
    if (!near) return;
    if (seenOrder().indexOf(near) === middle) return;
    turnKeepingStill(near);
  }

  /** Whether this file's own tween is running, and its frame handle. */
  let gliding = false;
  let raf = 0;
  /** Whether a reader has touched the row, so the late font settle below does
   *  not yank it back from wherever they have since swiped it. */
  let touched = false;

  /**
   * **The gentle press**: a hand-rolled tween rather than
   * `scrollTo({ behavior: 'smooth' })`, because the row has to be turned *while*
   * it travels and any `scrollLeft` write aborts a native smooth scroll.
   *
   * **The distance is a remainder, not two endpoints**, which is what makes a
   * destination that moves under the tween safe: a turn changes
   * `centreOf(target)` by a whole period and moves the picture not at all, so
   * `centreOf(target) - scrollLeft` is invariant across one.
   *
   * Reduced motion gets the centre and not a quicker journey to it (PLAN.md
   * §6): the page is simply put where it belongs.
   *
   * `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` has the author's asks and
   * why the ring is not turned up front.
   */
  const GLIDE_MS = DUR.travel;

  /** Which page the running tween is travelling to, so a second ask can tell. */
  let bound = null;

  function glide(el) {
    if (dead) return;
    const target = el ?? currentEl() ?? nearestEl();
    if (!target) return;
    // A second ask for a journey already under way is not news: the press arms
    // one glide and the navigation behind it arms another, and restarting the
    // tween on a fresh clock is a visible stutter.
    if (gliding && target === bound) return;
    bound = target;
    cancelAnimationFrame(raf);
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') {
      gliding = false;
      balance(target);
      return;
    }
    const remaining = centreOf(target) - track.scrollLeft;
    if (Math.abs(remaining) < 1) {
      gliding = false;
      balance(target);
      return;
    }
    gliding = true;
    const began = performance.now();
    const step = (now) => {
      if (dead) return;
      const t = Math.min(1, (now - began) / GLIDE_MS);
      // Cubic ease-out: quick to leave, slow to arrive, which is what reads as
      // gentle at this distance.
      const eased = 1 - (1 - t) ** 3;
      write(centreOf(target) - remaining * (1 - eased));
      keepEndless();
      if (t < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      raf = 0;
      balance(target);
      gliding = false;
      bound = null;
    };
    raf = requestAnimationFrame(step);
  }

  /**
   * The gesture. Live while a finger is down: `anchor` is the page the gesture
   * started on and `hold` is where that page stood relative to the midline, so
   * every position below is computed from the anchor's *current* geometry
   * rather than from a remembered `scrollLeft` — which a turn mid-drag would
   * have made stale.
   */
  let drag = null;
  /** How far a finger has to travel before it means a page rather than a press. */
  const STEP_MIN = 24;
  /** Whether the click that follows this gesture is the tail of a swipe. */
  let swiped = false;

  const place = (dx) => {
    const { anchor, hold } = drag;
    // **One page is the most a gesture can ask for**, whatever the finger does
    // — the whole of the author's complaint was a row that took several.
    const span = stepSpan(anchor, dx < 0 ? 1 : -1);
    const travelled = Math.max(-span, Math.min(span, dx));
    write(centreOf(anchor) + hold - travelled);
    keepEndless();
  };

  const onMove = (e) => {
    if (!drag || dead) return;
    drag.dx = e.clientX - drag.x;
    place(drag.dx);
  };

  const onUp = () => {
    if (!drag) return;
    const { anchor, dx } = drag;
    endDrag();
    const dir = dx <= -STEP_MIN ? 1 : dx >= STEP_MIN ? -1 : 0;
    swiped = dir !== 0;
    glide(dir === 0 ? anchor : neighbourOf(anchor, dir));
  };

  function endDrag() {
    drag = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }

  /*
   * On the window rather than on the track, and no `setPointerCapture`: a
   * dispatched `PointerEvent` is not an active pointer and capture throws on
   * one (trap 11), so a gesture synthesised by a test would take a different
   * path through this file than a finger does.
   */
  const onDown = (e) => {
    if (dead || (e.pointerType === 'mouse' && e.button !== 0)) return;
    touched = true;
    swiped = false;
    cancelAnimationFrame(raf);
    gliding = false;
    bound = null;
    const anchor = nearestEl();
    if (!anchor) return;
    drag = { x: e.clientX, dx: 0, anchor, hold: track.scrollLeft - centreOf(anchor) };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onUp, { passive: true });
  };

  /*
   * A swipe that ends over a link would otherwise open it: the browser
   * suppresses the click after a scroll it ran itself, and this row's scroll is
   * not one of those. Capture on the track, so the press never reaches the
   * anchor, `main.js`'s own nav listener, or the router's.
   */
  const onClick = (e) => {
    if (!swiped) return;
    swiped = false;
    e.preventDefault();
    e.stopPropagation();
  };

  /** A tab into a page half off the edge brings it to the middle, rather than
   *  leaving the focus ring somewhere the reader cannot read. */
  const onFocus = (e) => {
    const link = e.target.closest?.('a');
    if (link && links.includes(link)) glide(link);
  };

  track.addEventListener('pointerdown', onDown, { passive: true });
  track.addEventListener('click', onClick, true);
  track.addEventListener('focusin', onFocus);

  /**
   * Re-centres whatever is centred *now*, without turning the ring and without
   * motion. **Call it after any label's text changes width** — the Daily
   * button says Daily or Today — or the row sits a few pixels off its midline.
   * It never fights a reader who has swiped elsewhere: the page it re-centres
   * is whichever one they left in the middle.
   */
  function recentre() {
    if (dead || gliding || drag) return;
    const near = nearestEl();
    if (near) write(centreOf(near));
  }

  balance(currentEl());
  /*
   * The row opens in a fallback face and settles into the real one; every label
   * changes width when it does, which is enough to drag the centred page off
   * the midline. A reader who has already swiped by then is left alone.
   */
  document.fonts?.ready.then(() => {
    if (!dead && !touched) balance(currentEl());
  });

  return {
    glide,
    recentre,
    destroy() {
      dead = true;
      endDrag();
      cancelAnimationFrame(raf);
      track.removeEventListener('pointerdown', onDown);
      track.removeEventListener('click', onClick, true);
      track.removeEventListener('focusin', onFocus);
      for (const el of links) el.style.removeProperty('order');
    },
  };
}
