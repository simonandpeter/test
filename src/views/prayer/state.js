/**
 * The Prayer page's own state, and the one module that writes it.
 *
 * The same arrangement `views/daily/state.js` makes and for the same reason: a
 * singleton, because the router destroys a view before rendering the next, so
 * two Prayer pages never exist at once — and a live binding, because a module
 * cannot write to a binding it imported, which is the language keeping the one
 * writer honest.
 *
 * What is in it:
 *   order      the hymned saints in name order (`lib/prayer-order.js`)
 *   at         which of them is in hand
 *   generation bumped on every step, so an answer that arrives after the
 *              reader has moved on knows it is stale and says nothing
 */

/** The open page, or null between views. */
export let state = null;

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = { order: [], at: 0, generation: 0, ...next };
  return state;
}

/** Ends one, after the caller has run its own teardown. */
export function close() {
  state = null;
}
