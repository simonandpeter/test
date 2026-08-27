/**
 * All Saints' own state, in a module of its own.
 *
 * The same move the Daily page made on 2026-08-27, for the same reason and to
 * the same shape: every section of views/saints.js reads a module-scoped
 * `state`, so nothing could be lifted out while the object lived in that file.
 * `views/daily/state.js` argues the choice at length — one instance at a time
 * is a property of the router, and what was wrong was never that the state was
 * shared but that sharing it meant sharing a file.
 *
 * Exported as a live binding; assignment stays here, so the language keeps the
 * single writer honest rather than a comment asking for it.
 */

/** The open page, or null between views. */
export let state = null;

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = next;
  return state;
}

/** Ends one, after the caller has taken its snapshot and run its teardown. */
export function close() {
  state = null;
}
