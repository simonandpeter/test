/**
 * A grain — the week, or the month, or anything else that lives on a
 * horizontal track and follows a finger — sits inside a viewport, and the
 * track is what moves. It moves two ways, and they are deliberately the same
 * movement:
 *
 * **Travel**, from a peeked edge, an arrow key off the end of the strip, or
 * the jump to today. The state changes first and the live row is repainted to
 * where it has arrived, so the heading and the day panel never lag the chrome;
 * then the track is thrown back to where the reader last saw it and glides
 * home, with the grain being left standing beside it for the length of the
 * trip.
 *
 * **A drag** (author, 2026-08-21): the reader holds the grain and slides it.
 * Both neighbours are painted and parked a viewport width either side, the
 * track follows the finger, and on release it settles into whichever grain it
 * is nearest — over `--dur-slot`, so letting go reads as the movement a peek
 * makes rather than as a snap.
 *
 * Either way the document holds two or three of every date for a moment, so
 * the copies are marked aside and the whole trip is one flight in swap.js's
 * registry: landed before another starts, landed by destroy(), and never two
 * at once in one viewport.
 *
 * Reduced motion removes the animation and never shortens it: a travel is a
 * repaint, and a drag still follows the finger — direct manipulation is not an
 * animation — but lets go into place with nothing to sit through.
 *
 * Free-standing on purpose: everything arrives through the parameter object,
 * so River mode and the timeline can put their own tracks on the same rails.
 */

import { SETTLE } from './grain-drag.js';
import { beginSwap, landSwap, setAside } from './swap.js';

/** Matches --dur-slot in tokens.css: the sideways step of a grain. */
export const STRIP_SLIDE = 260;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function makeGrain({ viewport, row, paint, settle, flick, onSides }) {
  const track = viewport.querySelector('.grain-track');
  let sides = [];
  let timer = null;
  let holding = false;

  const width = () => viewport.getBoundingClientRect().width;
  const shift = (dx) => {
    track.style.transform = dx ? `translateX(${dx}px)` : '';
  };

  /** A neighbouring grain, parked one viewport width away on its own side. */
  function addSide(offset) {
    const side = document.createElement(row.tagName);
    side.className = `${row.className} grain-side`;
    side.style.left = `${offset * 100}%`;
    // The live row's own skeleton, then repainted for the grain beside it —
    // so a change to what a row is made of cannot reach the copies and miss.
    side.innerHTML = row.innerHTML;
    paint(side, offset, { live: false });
    setAside(side);
    track.appendChild(side);
    sides.push(side);
    return side;
  }

  /** Everything back where it belongs, with nothing animating the return. */
  function finish() {
    clearTimeout(timer);
    timer = null;
    holding = false;
    track.classList.remove('is-settling');
    track.style.transition = 'none';
    shift(0);
    // Flushed deliberately, so the copies leave and the transform lifts in the
    // same frame the repainted row appears in.
    void track.offsetHeight;
    track.style.transition = '';
    for (const side of sides) side.remove();
    sides = [];
    viewport.classList.remove('is-moving');
  }

  const land = () => landSwap(viewport);

  /** Animates the track to `dx`, then does `done` and lands. */
  function glide(dx, done) {
    track.style.transition = '';
    track.classList.add('is-settling');
    void track.offsetHeight;
    shift(dx);
    timer = setTimeout(() => {
      done();
      land();
    }, STRIP_SLIDE);
  }

  return {
    land,

    /** The state has already arrived; this shows the trip it made. */
    travel(dir) {
      land();
      if (reducedMotion()) return;
      beginSwap(viewport, finish);
      addSide(-dir);
      viewport.classList.add('is-moving');
      track.style.transition = 'none';
      shift(dir * width());
      void track.offsetHeight;
      glide(0, () => {});
    },

    handlers: {
      begin() {
        beginSwap(viewport, finish);
        holding = true;
        viewport.classList.add('is-moving');
        track.style.transition = 'none';
        addSide(-1);
        addSide(1);
        onSides?.([row, ...sides]);
      },

      move(dx) {
        if (holding) shift(dx);
      },

      end(dx, dragged) {
        if (!dragged) {
          // A flick the browser never reported a move for. Nothing is parked
          // beside the row, so it goes the ordinary way and travels.
          flick(dx < 0 ? 1 : -1);
          return;
        }
        holding = false;
        const w = width();
        // Far enough to have meant it is a finger's worth of travel, not a
        // fraction of the grain (author, 2026-08-21): a third of the width read
        // as a haul on a wide screen and snapped back from any real swipe.
        // Short of it, the grain the reader started in is still the nearest.
        const offset = Math.abs(dx) < SETTLE ? 0 : dx < 0 ? 1 : -1;
        if (reducedMotion()) {
          if (offset) settle(offset);
          land();
          return;
        }
        glide(-offset * w, () => {
          if (offset) settle(offset);
        });
      },
    },
  };
}
