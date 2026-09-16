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
 *   data       the manifest, as `lib/manifest.js` hands it over
 *   all        every hymned saint in name order (`lib/prayer-order.js`)
 *   order      the ones the search field has left showing — `all` until the
 *              reader types. The arrows step through this and the count line
 *              counts it, so a narrowed hymnal is a shorter book rather than a
 *              book with holes in it.
 *   reach      the slugs `all` holds, so an aside can tell in one lookup
 *              whether a saint it is naming is one this page can go to. It is
 *              `all` and not `order`, because a query is the reader's way of
 *              finding a saint and not a fence around the ones they may read.
 *   at         which of `order` is in hand
 *   detail     the payload of the saint in hand, once it has landed, so a
 *              redraw that is not a step does not have to wait for it twice
 *   query      what is in the field, so a redraw can put it back
 *   view       `plate` or `rows` — how the two asides list a saint. **`rows`,
 *              and that is a reading of the corpus rather than a preference**:
 *              only about a seventh of the corpus carries an icon, and the
 *              saints these two columns name are drawn from the whole of it, so
 *              a Pictures face opens on far more empty mats than filled ones
 *              and reads as a page that failed to load. `scripts/build-manifest.mjs`
 *              prints what the corpus holds; re-measure and reverse this the
 *              day the icons catch up.
 *   search     the MiniSearch index, or null until it has been built
 *   generation bumped on every step, so an answer that arrives after the
 *              reader has moved on knows it is stale and says nothing
 */

/** The open page, or null between views. */
export let state = null;

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = {
    data: null,
    all: [],
    at: 0,
    detail: null,
    query: '',
    view: 'rows',
    search: null,
    generation: 0,
    ...next,
  };
  state.order = state.all;
  state.reach = new Set(state.all.map((card) => card.slug));
  return state;
}

/** Ends one, after the caller has run its own teardown. */
export function close() {
  state = null;
}
