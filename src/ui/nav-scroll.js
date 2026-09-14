/**
 * The mobile nav row as an endless, centred strip.
 *
 * **Exactly five `<a>`, one per page, never cloned and never reordered in the
 * DOM** (PLAN.md §6) — the loop is a flex `order` rotation. A dozen places in
 * the suite hold `.site-nav a[href$="/saints"]` to be one element;
 * `tests/nav-strip.test.mjs` fails if this file learns to clone or to move a
 * node. The other two invariants — the ring turns **at most once per gesture**
 * and the settle is **rest, not `scrollend`** — are held by `an aggressive
 * swipe carries the nav strip` in `e2e/chrome.spec.js`.
 *
 * The three cuts that got here, the alternatives refused, and the fling
 * measurements behind the once-a-gesture rule:
 * `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js`. Re-derive the numbers with
 * `node scripts/fling-write.mjs` (a bare scroller) and
 * `node scripts/nav-swipe.mjs` (the real strip).
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

  /*
   * **Whether a reader has actually touched this row.** An input event is the
   * only signal that can only come from a reader; a `scrollLeft` diff cannot
   * tell a swipe from the browser correcting a position by itself, and reading
   * intent out of the number rotated the row on a fresh load before anyone had
   * touched it. `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` has the whole of it.
   */
  let touched = false;
  /**
   * Whether the ring has already turned inside the gesture now under way.
   * Cleared by a finger going down and by the settle, and by nothing else.
   */
  let turnedInGesture = false;
  /**
   * Whether a finger is on the glass right now. A scroller can go quiet with a
   * finger still on it — a reader holding the row still, or pausing mid-drag —
   * and rebalancing there moves the row under the hand that is holding it.
   */
  let fingerDown = false;
  const onTouch = () => {
    touched = true;
    fingerDown = true;
    // A finger going down ends whatever momentum was running, so the gesture
    // that starts here gets its own turn. See `turnedInGesture` above.
    turnedInGesture = false;
  };
  const onLift = () => {
    fingerDown = false;
    // The momentum starts here, so the settle is armed from here too: a fling
    // that never fires another scroll event still has to be squared up.
    armSettle();
  };
  track.addEventListener('pointerdown', onTouch, { passive: true });
  track.addEventListener('touchstart', onTouch, { passive: true });
  track.addEventListener('pointerup', onLift, { passive: true });
  track.addEventListener('pointercancel', onLift, { passive: true });
  track.addEventListener('touchend', onLift, { passive: true });
  track.addEventListener('touchcancel', onLift, { passive: true });
  // A wheel does not clear the flag: momentum wheel events arrive in a stream,
  // and treating each as a fresh gesture is exactly the per-event write this
  // guard exists to stop. The settle clears it.
  const onWheel = () => {
    touched = true;
  };
  track.addEventListener('wheel', onWheel, { passive: true });

  const currentEl = () => track.querySelector(':scope > a[aria-current="page"]');

  /** Where `scrollLeft` has to stand for `el` to sit on the track's midline. */
  const centreOf = (el) => el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;

  /**
   * Whichever link's own centre is nearest the track's, which is what a
   * `scroll-snap-align: center` gesture actually settles on — not
   * necessarily the *current* page, since a reader is free to swipe to any
   * of the other four without pressing one.
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

  /** Whether this file's own tween is running, and its frame handle. */
  let gliding = false;
  let raf = 0;
  let settleTimer = null;

  /**
   * The settle, which is **rest and not `scrollend`**: 150 ms with no scroll
   * event at all and a finger off the glass. A mandatory-snap scroller fires
   * `scrollend` on every snap, including the one this file's own turn provokes,
   * so the platform's event lands mid-fling. Every scroll — the reader's, the
   * momentum's, the snap's, and this file's own — re-arms this, so it can only
   * fire when nothing is moving.
   * `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` has what it cost;
   * `node scripts/nav-swipe.mjs` re-derives it.
   */
  function settled() {
    clearTimeout(settleTimer);
    settleTimer = null;
    // The tween ends itself, and it is the only thing that moves this row
    // besides a reader.
    if (dead || gliding || !touched) return;
    // A finger still on the glass is a gesture still happening, whatever the
    // scroller has stopped doing.
    if (fingerDown) return;
    // The gesture is over, so the next one gets a turn of its own.
    turnedInGesture = false;
    balance();
  }

  /** Re-arms the settle. Every scroll goes through here, and so does `scrollend`. */
  const armSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settled, SETTLE_MS);
  };

  /** How long the row must be still before a rebalance counts as a settle. */
  const SETTLE_MS = 150;

  /**
   * The same turn, run *during* a reader's own swipe rather than after it, so
   * a finger meets a new page instead of the end of the row. It is only ever a
   * turn: the scroll position the reader put there is preserved, because
   * `turnKeepingStill` pins whatever they are looking at.
   *
   * **At most once per gesture.** Any `scrollLeft` write inside a live fling
   * kills the fling — the value written need not even differ — so a turn per
   * scroll event costs almost the whole gesture. `force` is for this file's own
   * tween, which writes every frame regardless and has no native momentum to
   * protect.
   *
   * `node scripts/fling-write.mjs` is the mechanism on a bare scroller and
   * `node scripts/nav-swipe.mjs` is it on the real strip;
   * `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js` records what they read.
   */
  function keepEndless(force = false) {
    if (dead) return;
    if (!force && turnedInGesture) return;
    const near = nearestEl();
    if (!near) return;
    const seen = [...links].sort((a, b) => a.offsetLeft - b.offsetLeft);
    if (seen.indexOf(near) === middle) return;
    if (!force) turnedInGesture = true;
    turnKeepingStill(near);
  }

  const useScrollEnd = 'onscrollend' in track;
  const onScroll = () => {
    // The tween below drives its own turns and its own ending; the events it
    // makes on the way are not news.
    if (gliding || !touched) return;
    keepEndless();
    armSettle();
  };
  // `scrollend` arms the settle rather than being it — see `settled` above for
  // the fling a snap's own `scrollend` used to cut in half.
  track.addEventListener('scroll', onScroll, { passive: true });
  if (useScrollEnd) track.addEventListener('scrollend', armSettle, { passive: true });

  /**
   * **The gentle press**: a hand-rolled tween rather than
   * `scrollTo({ behavior: 'smooth' })`, because the row has to be turned *while*
   * it travels and any `scrollLeft` write aborts a native smooth scroll. Snap
   * comes off for the length of the tween for the same reason — a
   * mandatory-snap scroller re-snaps every programmatic write — and `balance`
   * puts it back at the end.
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
      balance(target);
      return;
    }
    const remaining = centreOf(target) - track.scrollLeft;
    if (Math.abs(remaining) < 1) {
      balance(target);
      return;
    }
    gliding = true;
    const snap = track.style.scrollSnapType;
    track.style.scrollSnapType = 'none';
    const began = performance.now();
    const step = (now) => {
      if (dead) return;
      const t = Math.min(1, (now - began) / GLIDE_MS);
      // Cubic ease-out: quick to leave, slow to arrive, which is what reads as
      // gentle at this distance.
      const eased = 1 - (1 - t) ** 3;
      write(centreOf(target) - remaining * (1 - eased));
      // Forced: the tween owns every write in this frame, so the once-a-gesture
      // guard is not about it.
      keepEndless(true);
      if (t < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      raf = 0;
      track.style.scrollSnapType = snap;
      balance(target);
      gliding = false;
      bound = null;
    };
    raf = requestAnimationFrame(step);
  }

  /**
   * Re-centres whatever is centred *now*, without turning the ring and without
   * motion. **Call it after any label's text changes width** — the Daily
   * button says Daily or Today — or the row sits a few pixels off its midline.
   * It never fights a reader who has swiped elsewhere: the page it re-centres
   * is whichever one they left in the middle.
   */
  function recentre() {
    if (dead || gliding) return;
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
      clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      track.removeEventListener('pointerdown', onTouch);
      track.removeEventListener('touchstart', onTouch);
      track.removeEventListener('pointerup', onLift);
      track.removeEventListener('pointercancel', onLift);
      track.removeEventListener('touchend', onLift);
      track.removeEventListener('touchcancel', onLift);
      track.removeEventListener('wheel', onWheel);
      track.removeEventListener('scroll', onScroll);
      if (useScrollEnd) track.removeEventListener('scrollend', armSettle);
      for (const el of links) el.style.removeProperty('order');
    },
  };
}
