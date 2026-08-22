/**
 * Two copies of a thing in the DOM for the length of an animation — one place
 * that knows the two rules, instead of four that each learned them separately.
 *
 * Amendment 9: anything still in flight must land before the next swap starts,
 * because a bare querySelector cannot tell the leaving copy from the current
 * one, and the failure is invisible until someone clicks faster than the
 * designer did. Amendment 17's corollary: the copy that is not the reader's
 * must say so completely — `aria-hidden`, out of the tab order, *and* out of
 * reach of the pointer, because a copy laid over the live one swallows the
 * click that would move it again.
 *
 * The flight registry is keyed by container, so a view holds one swap per
 * viewport and landing is idempotent: landing an empty container is a no-op,
 * which is what lets destroy() land everything without asking what was moving.
 */

/**
 * Marks a node as the non-current copy. The inline pointer-events is the
 * primitive's own guarantee rather than a stylesheet's promise.
 */
export function setAside(node) {
  node.setAttribute('aria-hidden', 'true');
  node.style.pointerEvents = 'none';
  for (const f of node.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
    f.tabIndex = -1;
  }
}

/**
 * The node is current again — for copies that persist and swap roles (the
 * week under the month, a card a second filter change brought back) rather
 * than being removed. Focusables return to the natural tab order, so a node
 * holding a *designed* tabindex="-1" must not pass through here.
 */
export function restore(node) {
  node.removeAttribute('aria-hidden');
  node.style.pointerEvents = '';
  for (const f of node.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')) {
    f.removeAttribute('tabindex');
  }
}

const flights = new Map();

/** Force-completes whatever swap is in flight in this container, if any. */
export function landSwap(container) {
  flights.get(container)?.land();
}

/**
 * Starts a swap: lands anything still in flight in the container, then
 * registers `finish` as what landing means now. The caller does its own
 * marking and animating; `settle(ms)` schedules the landing, or the caller
 * lands by hand (`land()`, or `landSwap(container)` from anywhere).
 */
export function beginSwap(container, finish) {
  landSwap(container);
  let timer = null;
  let landed = false;
  const flight = {
    settle(ms) {
      clearTimeout(timer);
      timer = setTimeout(() => flight.land(), ms);
    },
    land() {
      if (landed) return;
      landed = true;
      clearTimeout(timer);
      flights.delete(container);
      finish();
    },
  };
  flights.set(container, flight);
  return flight;
}
