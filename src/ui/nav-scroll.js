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
 * That rebalance is **visually silent by construction**, which is why it can
 * run on every settle rather than only at an edge: rotating a ring does not
 * change anybody's neighbours, so re-centring the same page after the
 * rotation puts every one of the five back on the pixel it was already on.
 * No compensation arithmetic, and nothing to get wrong in a frame.
 *
 * It runs at rest and not during momentum, and that is deliberate: writing
 * `scrollLeft` into a live fling is what kills momentum on iOS. A hard fling
 * can still reach the rendered end and see it for as long as the fling lasts;
 * the strip is balanced again the moment it stops.
 */

import { reducedMotion } from '../lib/motion.js';

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
  let gliding = false;
  const onTouch = () => {
    touched = true;
  };
  track.addEventListener('pointerdown', onTouch, { passive: true });
  track.addEventListener('touchstart', onTouch, { passive: true });
  track.addEventListener('wheel', onTouch, { passive: true });

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
   * The rebalance: whichever page is centred now is put in the middle of the
   * five and re-centred. Silent, per the header — a ring rotation moves
   * nobody relative to anybody, and the re-centre lands on the pixel the page
   * was already on — so this is safe to run on every settle rather than only
   * when an edge has been reached.
   */
  function balance(el) {
    if (dead) return;
    const target = el ?? nearestEl();
    if (!target) return;
    turn(target);
    write(centreOf(target));
  }

  let settleTimer = null;
  let glideTimer = null;

  function settled() {
    clearTimeout(settleTimer);
    clearTimeout(glideTimer);
    settleTimer = null;
    glideTimer = null;
    if (!touched && !gliding) return;
    gliding = false;
    balance();
  }

  const useScrollEnd = 'onscrollend' in track;
  const onScroll = () => {
    if (!touched && !gliding) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settled, 150);
  };
  if (useScrollEnd) track.addEventListener('scrollend', settled, { passive: true });
  else track.addEventListener('scroll', onScroll, { passive: true });

  /**
   * **The gentle press** (author, 2026-09-08: "when you select one it should
   * be animated to click into the centre gently instead of just jumping with
   * no smoothness"). The row is not rebuilt on a navigation any more —
   * `renderNav` moves `aria-current` in place and calls this — so the strip is
   * still standing where the reader's own swipe left it, and the page they
   * pressed has somewhere to travel *from*.
   *
   * Native smooth scrolling rather than a hand-rolled tween, and the reason is
   * the snap: this container is `scroll-snap-type: x mandatory`, and a
   * per-frame `scrollLeft` write into a mandatory-snap scroller is re-snapped
   * under the animation. `scrollTo({ behavior: 'smooth' })` is the one motion
   * the snapping cooperates with.
   *
   * Reduced motion gets the centre and not a quicker journey to it (DESIGN.md
   * §6): the page is simply put where it belongs.
   */
  function glide(el) {
    if (dead) return;
    const target = el ?? currentEl() ?? nearestEl();
    if (!target) return;
    if (reducedMotion() || typeof track.scrollTo !== 'function') {
      balance(target);
      return;
    }
    gliding = true;
    track.scrollTo({ left: centreOf(target), behavior: 'smooth' });
    /*
     * A press on the page that is already centred moves nothing, so no scroll
     * event ever arrives to end the glide. This fallback is what clears
     * `gliding` and rebalances in that case; a real glide reaches `settled`
     * long before it.
     */
    clearTimeout(glideTimer);
    glideTimer = setTimeout(settled, 600);
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
      clearTimeout(glideTimer);
      track.removeEventListener('pointerdown', onTouch);
      track.removeEventListener('touchstart', onTouch);
      track.removeEventListener('wheel', onTouch);
      if (useScrollEnd) track.removeEventListener('scrollend', settled);
      else track.removeEventListener('scroll', onScroll);
      for (const el of links) el.style.removeProperty('order');
    },
  };
}
