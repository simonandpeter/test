/**
 * The die's roll (author, 2026-08-27: "Add an animation for the dice button,
 * make the page fade out but the dice remains, spin once then fade into the
 * destination page").
 *
 * Three beats, in order: the page under the die fades away, the die alone
 * turns once, and the saint it landed on fades up in its place.
 *
 * The die that spins is a **copy**, fixed over the page at the rect the real
 * one occupied. The real die is inside the view, and the view is the thing
 * fading — so the only way for it to "remain" is for something else to stand
 * where it was. That is the same discipline `ui/swap.js` writes down for the
 * animated swaps: while two copies of a thing exist, exactly one is the live
 * one, and this copy is `aria-hidden` and out of the tab order for the third
 * of a second it is on screen.
 *
 * The navigation is issued while the view is still faded out, which is what
 * makes the last beat a fade *into* the destination rather than a second
 * cross-fade laid over the first: both of the router's own snapshots are of an
 * invisible view, so its transition has nothing to draw, and the reveal is
 * this module's own.
 */

import { reducedMotion } from '../lib/motion.js';

const FADE = 180;
const SPIN = 460;

/**
 * Rolls `die`, then calls `go` to navigate, then reveals what it landed on.
 *
 * Under reduced motion the whole thing is removed rather than shortened
 * (DESIGN.md §6): the navigation happens on the spot, with no fade and no
 * turn, and the reader gets the saint.
 */
export function rollDie(die, go) {
  if (!die || reducedMotion()) {
    go();
    return;
  }

  const root = document.documentElement;
  const box = die.getBoundingClientRect();

  const ghost = die.cloneNode(true);
  ghost.classList.add('die-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.setAttribute('tabindex', '-1');
  ghost.removeAttribute('data-random');
  Object.assign(ghost.style, {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
  });
  document.body.append(ghost);

  // The fade is a class on the root so the rule can name the view without this
  // module knowing where the view element lives.
  root.classList.add('is-rolling');

  const done = () => {
    ghost.remove();
    // The destination has rendered under the fade; releasing the class is what
    // brings it up, through the same transition that took the Index away.
    root.classList.remove('is-rolling');
  };

  const spin = ghost.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    // Starts with the page still going and lands after it: one turn, not a
    // wind-up and a stop, which is why the easing is symmetric.
    { duration: SPIN, delay: FADE / 2, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' },
  );

  spin.finished
    .catch(() => {})
    .then(() => {
      go();
      // One frame for the new view to paint at opacity 0 before it is asked to
      // come up; releasing in the same tick would cross-fade from the Index.
      requestAnimationFrame(() => requestAnimationFrame(done));
    });
}
