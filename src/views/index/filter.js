import { enabledChurches } from '../../data/churches.js';
import { withoutRank } from '../../lib/honorific.js';
import { applyFilters, hasActiveFilters } from '../../lib/index-filters.js';

/**
 * Which saints the page is showing, and what counts as the reader having asked
 * for fewer.
 *
 * The first third of what `update()` used to be, and **the only part of this
 * view with no DOM in it** — which is the reason it is worth having alone. The
 * question "given these filters, which saints match" is answerable without a
 * browser now, so it can finally take a unit test; everything else on this
 * page needs one.
 *
 * The libraries it leans on are already modules with their own tests:
 * `lib/index-filters.js` owns the semantics of the facets and the date range,
 * `lib/honorific.js` owns why a leading rank comes off the query. This only
 * puts the reader's state to them.
 */

/**
 * **Every calendar, ticked** (author, 2026-08-28: "In the Carousel mode, and
 * advanced search, display all saints by default, i.e. have all the calendars
 * … ticked by default, so that people get exposed to the full range and not
 * have hidden saints without their realising. Orthodoxy allows for personal
 * freedom in private prayer life").
 *
 * It was the header's own calendar and nothing else, which meant a reader who
 * had chosen Russian met 426 of the 742 and was never told the other 316 were
 * there. The header still decides what the *Daily* page reckons by; it no
 * longer decides what All Saints will show you.
 *
 * Read from the facet's own options rather than written down, so a calendar
 * added to data/churches.js is ticked by the same act that adds it — and so
 * the empty-calendar value only appears in the default when the corpus has
 * someone to put in it.
 */
export const defaultChurches = (available) =>
  available ? [...available] : enabledChurches().map((c) => c.id);

/**
 * Whether anything the reader did is narrowing the page. The facet's default
 * selection is not: it is where the page opens, so counting it would leave
 * Clear filters showing on a page nobody has filtered.
 */
export const readerHasFiltered = (f, available) => {
  const def = defaultChurches(available);
  const same = f.churches.length === def.length && f.churches.every((id) => def.includes(id));
  return hasActiveFilters(same ? { ...f, churches: [] } : f);
};

/**
 * The matched set and the undated set aside from it.
 *
 * **Pure, and returns its answer rather than writing it.** `state.shownCards`
 * is assigned by the composition in views/saints.js, because a function that
 * both returns a value and writes it to shared state is testable in name only
 * (agios-website-03, reviewing the seam before this cut).
 */
export function matching(state) {
  const { cards, filters, search } = state;
  /*
   * The index holds the bare name and every name is drawn with a rank before
   * it, so a reader who types back what the screen shows must not be told
   * there is no such saint. `withoutRank` argues it; it is built from the
   * reader's own pack, because since 2026-08-27 the word in front is one of
   * sixteen in five languages rather than one abbreviation.
   */
  const query = withoutRank(filters.query);
  const hits = query && search ? new Set(search.search(query).map((r) => r.id)) : null;

  /*
   * The whole corpus goes in. The reader's church used to narrow it here,
   * before the filters ran; since 2026-08-27 the Calendar facet does that
   * instead, with the same predicate, so ticking a second calendar adds saints
   * rather than intersecting away the ones already shown.
   */
  return applyFilters(cards, filters, {
    monthsBySlug: state.monthsBySlug,
    matchesQuery: hits ? (slug) => hits.has(slug) : null,
  });
}
