import { EMPTY_FILTERS } from '../../lib/index-filters.js';
import { LAYOUTS } from '../index/controls.js';

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
 *   order      the ones the search field and the facets have left showing —
 *              `all` until the reader narrows. The arrows step through this and
 *              the count line counts it, so a narrowed hymnal is a shorter book
 *              rather than a book with holes in it.
 *   el         the page's own box, which `views/index/controls.js` reads: the
 *              advanced-search shell is mounted over this state since
 *              2026-10-02 and that module takes its host as an argument
 *   filters    the shell's filter set, in `lib/index-filters.js`'s own shape.
 *              Its `sort` is never read — `find.js`'s `narrowed` uses the
 *              matched set as a membership test over `all`, because the book's
 *              order is the book
 *   facets     the facet values this corpus actually holds, so no chip offers
 *              a dead end
 *   monthsBySlug  which Gregorian months hold each saint's feasts this year,
 *              for the Feast month chip
 *   cleanups   the shell's own teardown, run by `views/prayer.js`
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
 *   layout     `cards` or `rows` — how the two asides list a saint, and since
 *              2026-10-02 these are **All Saints' own two words for All Saints'
 *              own two shapes**: the asides draw `views/index/grid.js`'s
 *              `card()`, so the face chip is that page's View chip over
 *              `LAYOUTS` and the vocabulary is shared rather than translated.
 *              **`cards` past 1024 px and `rows` below it**, which is the mockup's own
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
 *   advanced   whether the facet panel is showing. **False on arrival**
 *              (author, 2026-10-03: "the carousel mode is just normal mode
 *              i.e. Advanced search OFF") — the field alone is what a reader
 *              meets, exactly as on All Saints, where the same boolean is that
 *              page's `mode` and its off state is the carousel
 */

/** The open page, or null between views. */
export let state = null;

/**
 * The face the page opens on, which is a width and not a preference — see
 * `layout` above. Guarded on `window` because `lib/` and `views/` are both read
 * by the unit tests under node, and a default is not worth an import that only
 * resolves in a browser.
 */
const openingLayout = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches
    ? LAYOUTS[0]
    : LAYOUTS[1];

/** Starts a render. Returns the object so the caller can keep a local handle. */
export function open(next) {
  state = {
    data: null,
    all: [],
    at: 0,
    detail: null,
    filters: { ...EMPTY_FILTERS },
    layout: openingLayout(),
    advanced: false,
    search: null,
    generation: 0,
    cleanups: [],
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
