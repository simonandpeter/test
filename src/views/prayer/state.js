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
 *   router     the app's router, for the one href this page writes: a name the
 *              hymnal does not hold opens the saint's own page (stage I)
 *   view       `plate` or `rows` — how the two asides list a saint. **`plate`
 *              past 1024 px and `rows` below it**, which is the mockup's own
 *              default at the width the mockup was drawn at
 *              (`../mockup-review/REVIEW.md` finding 9, stage I).
 *              It was `rows` at both widths, on the reading that only about a
 *              seventh of the corpus carries an icon and these columns name
 *              saints from the whole of it, so a Pictures face opened on far
 *              more empty mats than filled ones and read as a page that failed
 *              to load. **Stage G took the mat away**: a tile whose saint has
 *              no icon has no box at all past 1024 px, so what that reading was
 *              answering no longer exists there. Below 1024 px the mat is still
 *              drawn and the reading still holds, so the phone still opens on
 *              the names.
 *   search     the MiniSearch index, or null until it has been built
 *   generation bumped on every step, so an answer that arrives after the
 *              reader has moved on knows it is stale and says nothing
 */

/** The open page, or null between views. */
export let state = null;

/**
 * The face the page opens on, which is a width and not a preference — see
 * `view` above. Guarded on `window` because `lib/` and `views/` are both read
 * by the unit tests under node, and a default is not worth an import that only
 * resolves in a browser.
 */
const openingView = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches ? 'plate' : 'rows';

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = {
    data: null,
    all: [],
    at: 0,
    detail: null,
    query: '',
    view: openingView(),
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
