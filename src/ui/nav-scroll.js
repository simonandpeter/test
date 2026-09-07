/**
 * The mobile nav row as an endless, centred strip (author, 2026-09-07: on a
 * phone, make the header "a horizontal scroll header where the selected one
 * is in the centre, and you can swipe across to the next or click on it.
 * Infinite scroll header" — five pages no longer fit as equal fixed columns
 * once Texts joined Daily, All Saints, Map and About).
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
 * rotation instead: once a swipe has settled with the strip's leading or
 * trailing page now centred, that page's neighbour on the far side is moved
 * across the DOM to sit next to it — `insertBefore`/`append` — and
 * `scrollLeft` is nudged by the moved page's own width in the same breath, so
 * the move is never seen. A reader who keeps swiping one way keeps meeting a
 * new "next" page for exactly as long as they keep swiping, which is what
 * "infinite" asks for, and `document.querySelectorAll('.site-nav a')` is
 * five long at every instant in between.
 */

/**
 * `track` already holds the nav's five real `<a>`, one of them wearing
 * `aria-current="page"` — `renderNav` in `main.js` builds it, the same as the
 * wide row, with nothing buffered about it. Generous `padding-inline`
 * (base.css) is what lets the strip's own first or last page still reach the
 * track's centre; this file only ever moves `scrollLeft` in answer to where
 * the reader's own gesture already put it.
 */
export function wireNavScroll(track) {
  let dead = false;
  const write = (left) => {
    track.scrollLeft = left;
  };
  /*
   * **Whether a reader has actually touched this row**, which turned out to
   * be the only reliable answer to "whose scroll was that?" A `scrollLeft`
   * diff against what this file last wrote (`ui/loop-scroll.js`'s own
   * approach, tried first here) is not enough: `centre()`'s own target is
   * not always a true snap point — `padding-inline` centres an edge page as
   * closely as a non-negative `scrollLeft` allows, short of where
   * `scroll-snap-align: center` actually holds it — and a browser correcting
   * the difference itself can take more than one settled step to get there,
   * each one indistinguishable from a swipe by its `scrollLeft` alone. Found
   * live: a fresh load routinely rotated the row once or twice before any
   * reader had touched it, on both a first load and a reload. A pointer,
   * touch or wheel event on the track is the one signal that can only come
   * from a reader, so `rotate` is gated on having seen one rather than on
   * reading intent into a number.
   */
  let touched = false;
  const onTouch = () => {
    touched = true;
  };
  track.addEventListener('pointerdown', onTouch, { passive: true });
  track.addEventListener('wheel', onTouch, { passive: true });

  function currentEl() {
    return track.querySelector(':scope > a[aria-current="page"]');
  }

  function centre(el) {
    if (!el) return;
    write(el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2);
  }

  /**
   * Whichever child's own centre is nearest the track's, which is what a
   * `scroll-snap-align: center` gesture actually settles on — not
   * necessarily the *current* page, since a reader is free to swipe to any
   * of the other four without pressing one.
   */
  function nearestChild() {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = null;
    let bestDist = Infinity;
    for (const el of track.children) {
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < bestDist) {
        best = el;
        bestDist = d;
      }
    }
    return best;
  }

  /**
   * Brings a fifth page across the DOM to whichever side just ran out of
   * runway, so the reader can never actually reach a true edge — only ever
   * the illusion of approaching one. `scrollLeft` is corrected in the same
   * frame `insertBefore`/`append` runs, which is what keeps the move silent:
   * both change layout, but a reflow between them would let the strip visibly
   * jump before the compensating read below could measure the right amount.
   */
  function rotate() {
    if (dead || track.children.length < 2) return;
    const near = nearestChild();
    if (!near) return;
    if (near === track.firstElementChild) {
      const moved = track.lastElementChild;
      const width = moved.getBoundingClientRect().width;
      track.insertBefore(moved, track.firstElementChild);
      write(track.scrollLeft + width);
    } else if (near === track.lastElementChild) {
      const moved = track.firstElementChild;
      const width = moved.getBoundingClientRect().width;
      track.appendChild(moved);
      write(track.scrollLeft - width);
    }
  }

  centre(currentEl());

  const useScrollEnd = 'onscrollend' in track;
  let settleTimer = null;
  const settled = () => {
    settleTimer = null;
    if (touched) rotate();
  };
  const onScroll = () => {
    if (!touched) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settled, 150);
  };
  if (useScrollEnd) track.addEventListener('scrollend', settled, { passive: true });
  else track.addEventListener('scroll', onScroll, { passive: true });

  return {
    destroy() {
      dead = true;
      clearTimeout(settleTimer);
      track.removeEventListener('pointerdown', onTouch);
      track.removeEventListener('wheel', onTouch);
      if (useScrollEnd) track.removeEventListener('scrollend', settled);
      else track.removeEventListener('scroll', onScroll);
    },
  };
}
