/**
 * The Daily page's own state, in a module of its own (2026-08-28).
 *
 * This is the first move of the view split, and it is deliberately the *only*
 * thing this commit does, because it is what every later move depends on.
 * `views/calendar.js` is 1,863 lines and every one of its five sections reads
 * a module-scoped `state` — 87 references — so nothing could be lifted out of
 * that file while the object lived inside it. A module that anything can
 * import is what makes the rest of the split mechanical instead of clever.
 *
 * **It stays a singleton, and that is the choice rather than an omission.**
 * The alternative was threading it through every function as an argument,
 * which is 87 call sites of churn for a page that has exactly one instance at
 * a time — the router destroys a view before rendering the next, so two Daily
 * pages never exist together. What was wrong was never that the state was
 * shared; it was that sharing it meant sharing a file.
 *
 * `state` is exported as a live binding, so an importer sees `open()` and
 * `close()` take effect. Assignment stays here: a module cannot write to a
 * binding it imported, which is the language keeping the one writer honest.
 */

/** The open page, or null between views. */
export let state = null;

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = next;
  return state;
}

/** Ends one, after the caller has run its own teardown. */
export function close() {
  state = null;
}
