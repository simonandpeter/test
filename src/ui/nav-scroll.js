/**
 * The mobile nav row as an endless, centred strip (author, 2026-09-07: on a
 * phone, make the header "a horizontal scroll header where the selected one
 * is in the centre, and you can swipe across to the next or click on it.
 * Infinite scroll header" — five pages no longer fit as equal fixed columns
 * once Texts joined Daily, All Saints, Map and About).
 *
 * **Second cut, 2026-09-08**, on three findings from the author: the row was
 * not endless, About was not to the left of Daily, and pressing a page threw
 * it into the centre rather than gliding it there. The first two are the same
 * answer.
 *
 * **Not `ui/loop-scroll.js`**, on purpose, though the idea of a whole-period
 * correction is kept in spirit. That file's whole shape is a row that moves
 * *by itself* — continuous drift, a wheel, hand-rolled drag with pointer
 * capture — earned keeping sixty-plus saints scrolling forever. A nav row of
 * five destinations never moves except under a reader's own finger: native
 * `overflow-x: auto` with `scroll-snap-type` already gives a phone its own
 * swipe, momentum and snap for free.
 *
 * **Not buffered clones either**, which was the first version and was wrong.
 * `ui/loop-scroll.js`'s own trick — render extra copies either side, wrap the
 * scroll position by a whole period onto identical content — works for a
 * carousel of *cards*, where nothing else on the page ever queries "the
 * card". It does not work for a *nav*: the rest of the suite (chrome.spec.js
 * alone, before this) holds `.site-nav a[href$="/saints"]` to be exactly one
 * element in a dozen places, a genuine and load-bearing invariant — a click
 * handler, an assertion on the current page's own weight, a keyboard test —
 * and cloning the links to fake a loop breaks every one of them the moment a
 * phone-width test runs, which is exactly how this was caught.
 *
 * So there are always exactly five `<a>`, one per page, and the loop is real
 * rotation instead.
 *
 * **The rotation is `order`, not `insertBefore`** (2026-09-08, the second
 * cut). The first cut moved the nodes themselves and compensated `scrollLeft`
 * by the moved node's own width in the same breath. It worked, and it cost
 * two things worth more than it: `document.querySelectorAll('.site-nav a')`
 * came back in an order that depended on where the reader had last swiped,
 * which makes every positional selector in the suite — and every keyboard
 * user's tab order — a function of a gesture; and a compensating write is
 * arithmetic that has to be right in a frame where two layouts are in play.
 * A flex `order` per link says the same thing with neither: the DOM stays in
 * the site's own order (Daily, All Saints, Texts, Map, About) for the tab
 * ring and for `nth()`, and `offsetLeft` — which is all this file reads —
 * already answers in the *visual* order. The trade is that focus order is the
 * canonical order rather than the rotated one; for a ring of five equals with
 * no meaningful sequence between them that is the better of the two, and it
 * is the desktop row's order besides.
 *
 * **Balanced at rest, which is what "endless" actually asks for.** The first
 * cut only rotated once a swipe had *already* settled with an edge page
 * centred, so on every load the current page stood at one end of the five
 * with blank strip beside it — on the Daily page, nothing at all to its left
 * (author, 2026-09-08: "next to Daily page on the left needs to be the About
 * section"). Now every settle puts whichever page is centred at the *middle*
 * of the five, so there are always two pages either side of it and the ring's
 * own neighbours are the ones a reader meets: About is left of Daily because
 * the ring says so, not because a rotation happened to land there.
 *
 * That rebalance is **visually silent by construction**: rotating a ring does
 * not change anybody's neighbours, so re-centring the same page after the
 * rotation puts every one of the five back on the pixel it was already on.
 *
 * **And it turns before the movement, not after it** (2026-09-08, the author's
 * second report on this row: "dont make the header text load after its settled
 * and centred after selection. they should be visible as the animation is
 * happening, true infinite scroll"). Balancing on the *settle* alone is right
 * about where the row ends up and wrong about every frame in between —
 * measured, frame by frame: a press on About from the Daily page opened **85 px
 * of blank strip** on the leading edge and Texts appeared there only once the
 * glide had landed. The row visibly ran out and refilled.
 *
 * So `turnKeepingStill` does the rotation with the picture pinned — the page
 * under the midline stays on its pixel, and only the two pages off either end
 * change which end they are at — and it runs *before* a glide and *during* a
 * swipe (`keepEndless`), not after either. The settle-time `balance` remains as
 * the thing that squares the position exactly once everything has stopped.
 *
 * **Third cut, 2026-09-12: once a gesture, and rest is not `scrollend`.** The
 * paragraph that stood here said the one cost was iOS momentum, that a snap
 * damps a fling anyway so the window was short, and that this was written down
 * rather than measured. Measured, all three were wrong. A `scrollLeft` write
 * ends a Chromium fling too, a snap does not save it, and the window was every
 * scroll event: a 320 px swipe travelled 45 px of a 450 px range and came back
 * to the page it left, three times in three (`scratchpad/nav-swipe.mjs`).
 * `scratchpad/fling-write.mjs` has the mechanism on a bare scroller — no
 * write, 350 px; one write of the value already there, 350 dragged back to
 * 315; a write per scroll event, 45 — so it is the write and not the
 * arithmetic.
 *
 * Two changes, and `keepEndless` and `settled` each carry their half:
 * the ring turns **at most once per gesture**, and the settle is **150 ms of
 * stillness with the finger off**, because a mandatory-snap scroller fires
 * `scrollend` every time it snaps — including the snap this file's own turn
 * provokes, which is how `balance` came to be re-centring in the middle of a
 * fling. Same fling afterwards: the full 450 px, 225 px of coast after the
 * lift, no backward step, and the ring turned so the page it lands on stands
 * in the middle of five. `an aggressive swipe carries the nav strip` in
 * `e2e/chrome.spec.js` fails if either half goes back.
 */

import { reducedMotion, DUR } from '../lib/motion.js';

/**
 * `track` already holds the nav's five real `<a>`, one of them wearing
 * `aria-current="page"` — `renderNav` in `main.js` builds it, the same as the
 * wide row, with nothing buffered about it. `padding-inline: 50vw` (base.css)
 * is what lets *any* of the five reach the track's centre exactly, which the
 * glide below depends on: at `calc(50vw - 3rem)` a page standing nearer an
 * edge than about half a label could only be centred by asking for a negative
 * `scrollLeft`, which a scroller refuses — so a gentle glide would have landed
 * short and the rebalance behind it would have shown as the jump this cut is
 * removing.
 */
export function wireNavScroll(track) {
  let dead = false;
  /*
   * The five links in the site's own order, read once. `renderNav` rebuilds
   * the row from scratch on any change that is not simply which page is
   * current, and calls `destroy()` first, so this list cannot go stale under
   * us.
   */
  const links = [...track.children];
  const n = links.length;
  const middle = Math.floor(n / 2);

  const write = (left) => {
    track.scrollLeft = left;
  };

  /*
   * **Whether a reader has actually touched this row**, which turned out to
   * be the only reliable answer to "whose scroll was that?" A `scrollLeft`
   * diff against what this file last wrote (`ui/loop-scroll.js`'s own
   * approach, tried first here) is not enough: a browser correcting a
   * position itself can take more than one settled step to get there, each
   * one indistinguishable from a swipe by its `scrollLeft` alone. Found live:
   * a fresh load routinely rotated the row once or twice before any reader
   * had touched it, on both a first load and a reload. A pointer, touch or
   * wheel event on the track is the one signal that can only come from a
   * reader, so a rebalance is gated on having seen one — or on this file
   * having started a glide itself — rather than on reading intent into a
   * number.
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
   * This is the whole of "true infinite scroll" (author, 2026-09-08, second
   * report). Turning the ring *after* a movement — which is what the first cut
   * did, on every settle — is right about the arrangement and wrong about every
   * frame before it: gliding from Daily to About opened **85 px of blank strip**
   * on the leading edge, measured frame by frame, and Texts appeared there only
   * once the glide had landed. The reader watches the row run out and then
   * refill. Turning *first* means the page being travelled toward already has
   * its own neighbour beyond it before the first frame is drawn.
   *
   * The anchor is whatever is nearest the midline, pinned by its own screen
   * position rather than by a recomputed centre, so this is exact at any point
   * in a gesture and not only at rest. `padding-inline: 50vw` (base.css) is
   * what makes it always reachable: every one of the five can be centred
   * exactly, so no pinning this asks for is ever clamped away.
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
   * The settle, which is **rest and not `scrollend`** (2026-09-12).
   *
   * `scrollend` fires whenever a scroll sequence finishes, and a mandatory-snap
   * scroller finishes one every time it snaps — including the snap provoked by
   * this file's own `keepEndless` write. So the platform's own event was
   * arriving in the *middle* of a fling and `balance` was re-centring on it,
   * which moves the picture and pulls the row back to where the gesture began.
   * Traced write by write (`scratchpad/nav-swipe.mjs`): five turn-and-rebalance
   * pairs inside one 320 px swipe, at 145, 243, 346, 443 and 595 ms.
   *
   * Rest is 150 ms with no scroll event at all, and a finger off the glass.
   * Every scroll — the reader's, the momentum's, the snap's, and this file's
   * own — re-arms it, so it can only fire when nothing is moving.
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
   * **Once per gesture, and that is the whole of the 2026-09-12 fix.**
   *
   * This file used to say the cost was iOS momentum, short, and written down
   * rather than measured. Measured, it was neither iOS-only nor short. On a
   * bare scroller with none of this file's code in it
   * (`scratchpad/fling-write.mjs`, Chromium, mobile-360, a 320 px fling):
   *
   * | writes of `scrollLeft` during the fling | how far it travelled |
   * | --- | --- |
   * | none | 350 px |
   * | one, 100 ms after the lift | 350 px, dragged back to 315 |
   * | one per scroll event | **45 px** |
   *
   * The value written was the value already there, so it is the write itself
   * and not the arithmetic. `keepEndless` ran on every scroll event, which is
   * the third row: on the real strip a hard swipe moved 45 px of a 450 px
   * range, jumped backwards nine times, and settled on the page it started on
   * (`scratchpad/nav-swipe.mjs`, 3 of 3). The oscillation feeds itself — a
   * write computed from a `scrollLeft` the compositor has already moved past
   * lands behind the fling, which puts a different link nearest the midline,
   * which asks for another turn.
   *
   * One turn per gesture costs a frame of travel and buys two pages of runway
   * either side, which is as far as a fling can reach in a range this size.
   * `force` is for this file's own tween, which writes every frame regardless
   * and has no native momentum to protect.
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
   * **The gentle press** (author, 2026-09-08: "when you select one it should
   * be animated to click into the centre gently instead of just jumping with
   * no smoothness"). The row is not rebuilt on a navigation any more —
   * `renderNav` moves `aria-current` in place and calls this — so the strip is
   * still standing where the reader's own swipe left it, and the page they
   * pressed has somewhere to travel *from*.
   *
   * **Hand-rolled, where the first cut used `scrollTo({ behavior: 'smooth' })`,
   * and the reason is the turning** (author, same day: "they should be visible
   * as the animation is happening, true infinite scroll"). The row has to be
   * turned *while* it travels, or the far end runs out mid-journey — and any
   * `scrollLeft` write aborts a native smooth scroll, so the two cannot be had
   * together. Snap comes off for the length of the tween for the same reason: a
   * mandatory-snap scroller re-snaps every programmatic write, which is a
   * stutter a frame. `balance` puts it back and squares the position when the
   * tween lands.
   *
   * **The ring is not turned up front**, and that was a wrong first answer worth
   * recording: turning to put the *destination* in the middle before the tween
   * starts fights `keepEndless` on the very next frame, which finds the page
   * still under the midline and turns it straight back. What keeps the row full
   * is the same rule during the journey as at rest — whatever is nearest the
   * midline sits in the middle of the five — applied every frame.
   *
   * **The distance is read as a remainder, not as two endpoints**, which is
   * what makes a moving destination safe: turning the ring changes
   * `centreOf(target)` by a whole period, but it moves the picture not at all,
   * so `centreOf(target) - scrollLeft` — how far the target still is from the
   * midline, on screen — is invariant across a turn. Easing that to zero is
   * the same journey whichever way the ring has been turned underneath it.
   *
   * The target itself never wraps. A press is at most two steps away in a ring
   * of five, and a one-step turn wraps the page at the far end — which is the
   * one the reader is travelling *away* from — so the page being travelled to
   * keeps a continuous screen position the whole way.
   *
   * Reduced motion gets the centre and not a quicker journey to it (PLAN.md
   * §6): the page is simply put where it belongs.
   */
  const GLIDE_MS = DUR.travel;

  /** Which page the running tween is travelling to, so a second ask can tell. */
  let bound = null;

  function glide(el) {
    if (dead) return;
    const target = el ?? currentEl() ?? nearestEl();
    if (!target) return;
    /*
     * **A second ask for a journey already under way is not news** (2026-09-08).
     * The press starts the glide and the navigation behind it arms one too;
     * restarting the tween from wherever it had reached, on a fresh clock,
     * is the stutter that would put back exactly the unevenness starting it on
     * the press was meant to remove.
     */
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
   * Re-centres whatever is centred *now*, without turning the ring and
   * without motion. The Daily button's word changes under the reader — Daily
   * for Today, and back — and a label that changes width drags the row a few
   * pixels off its midline; `main.js` calls this once the new word has landed.
   * Silent for the same reason `balance` is, and it never fights a reader who
   * has swiped elsewhere, because the page it re-centres is whichever one they
   * left in the middle.
   */
  function recentre() {
    if (dead || gliding) return;
    const near = nearestEl();
    if (near) write(centreOf(near));
  }

  balance(currentEl());
  /*
   * The row opens in a fallback face and settles into the real one, and every
   * label changes width when it does — enough to drag the centred page off the
   * midline on a first load. `document.fonts.ready` is the moment the widths
   * are final; a reader who has already swiped by then is left alone.
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
