import { entriesInChurch } from './church.js';
import { feastIndexFor } from './feasts.js';
import { sortCards } from './index-filters.js';

/**
 * The three orderings the Prayer page reads, and nothing else.
 *
 * Pure over manifest cards and one saint's detail payload: no DOM, no state,
 * no fetch, and no `data/days.js` — which pulls `liturgical-days.js` onto the
 * chunk this module's caller is imported into. Everything here is arithmetic
 * over what the manifest already carries.
 */

/**
 * The page's corpus: the saints the manifest says have a hymn.
 *
 * `build-manifest.mjs` puts `hymned: [...churches]` on a card and leaves the
 * text in the saint's own folder, so this is the one question answerable
 * without fetching anything. An empty array is the same answer as no array —
 * both mean no church of the four has a hymn recorded for this saint.
 */
export const hymnedSaints = (cards) => cards.filter((card) => card.hymned?.length);

/**
 * The order the `‹ ›` arrows step through, which is All Saints' own name order
 * (`lib/index-filters.js`) rather than a second opinion about alphabetising.
 * Reading through the hymnal is reading through a list the reader has already
 * met once.
 */
export const stepOrder = (cards) => sortCards(hymnedSaints(cards), 'name');

/**
 * The saint before and the saint after, as cards, or `null` at either end.
 *
 * The ends do not wrap. A hymnal is a book and a reader who has reached Zosimas
 * has reached the end of it; a wrap would make "the saint after" a claim the
 * page cannot keep. The two are what the view prefetches — a step is then a
 * cache hit, and a step in either direction costs the same.
 */
export function neighboursAt(order, index) {
  return {
    prev: index > 0 ? (order[index - 1] ?? null) : null,
    next: index < order.length - 1 ? (order[index + 1] ?? null) : null,
  };
}

/**
 * Who the corpus records this saint with — `mentionedIn` first, then `related`.
 *
 * The two are one relation read from either end: `related` is who a saint's own
 * life speaks of, and `mentionedIn` is whose life speaks of them
 * (`build-manifest.mjs` computes the second from the first). The page wants
 * both under one heading, because a reader looking for who someone is kept
 * company by does not care which direction the corpus happened to record it in.
 *
 * **`mentionedIn` comes first because it arrives first.** It is on the card and
 * is immediate; `related` lives in the saint's own payload and is a fetch away.
 * Ordering the immediate half first means the aside is drawn once and grows,
 * rather than being drawn and then reordered under the reader.
 *
 * `detail` is whatever `loadDetail` has answered with, and `null` before it
 * has — which is a state this page is in on every step, not an error.
 */
export function relatedFor(card, detail = null) {
  const out = [];
  const seen = new Set([card?.slug]);
  for (const slug of [...(card?.mentionedIn ?? []), ...(detail?.related ?? [])]) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

/**
 * How many of the same day's saints the aside names before it says "and N
 * more". A cap rather than a scroll: a busy day's column stops being a way out
 * of the page and becomes a second page. **The number is a judgement and is not
 * measured against the corpus's own worst day** — `scripts/day-coverage.mjs`
 * would say what that is.
 */
export const SAME_DAY_MAX = 12;

/**
 * Who is kept the same day as this saint, in the reader's own church.
 *
 * **The day is resolved, not read.** A feast is recorded as a menologion
 * position and each church keeps it by its own calendar, so "the same day" is a
 * civil date that depends on both the church and the year — `lib/feasts.js`
 * does that arithmetic once per year and caches it against the manifest array
 * itself, which is why the whole index is cheaper to ask for than to avoid.
 *
 * The year is the caller's, never `new Date()`: a module that reads the clock
 * cannot be tested on any day but one.
 *
 * Returns the resolved day as well as the saints on it, because the aside's
 * heading wants to name the day and the caller should not resolve it twice.
 * `total` is the count before the cap, so the caller can say how many it left
 * out without counting a list it does not have.
 */
export function sameDayFor(card, { saints, churchId, churchesById, year, limit = SAME_DAY_MAX } = {}) {
  const none = { iso: null, slugs: [], total: 0 };
  if (!card || !churchId || !saints) return none;

  const index = feastIndexFor(saints, year, churchesById);
  /*
   * The saint's own day is found by looking for them in the index rather than
   * by re-resolving their attestation: the index has already done exactly that
   * resolution, for this church and this year, and two paths to one date is how
   * the two come to disagree.
   */
  let iso = null;
  for (const [key, entries] of index) {
    if (entries.some((e) => e.slug === card.slug && e.church === churchId)) {
      if (!iso || key < iso) iso = key;
    }
  }
  if (!iso) return none;

  const all = entriesInChurch(index.get(iso) ?? [], churchId)
    .map((e) => e.slug)
    .filter((slug) => slug !== card.slug);
  const slugs = [...new Set(all)];
  return { iso, slugs: slugs.slice(0, limit), total: slugs.length };
}
