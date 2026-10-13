import { CHURCHES_BY_ID } from '../../data/churches.js';
import { parseIso } from '../../lib/calendar-page.js';
import { feastIndexFor } from '../../lib/feasts.js';
import { ensureAllPacks } from '../../lib/i18n.js';
import { REGIONS_BY_ID } from '../../lib/regions.js';
import { allNames } from '../../lib/saint-types.js';
import { state } from './state.js';

/**
 * The search index, built after the page is up.
 *
 * MiniSearch and all four locale packs arrive together and after the first
 * paint, because neither is needed to show the grid and both are large. Until
 * they land `state.search` is null and the filters work without a query, which
 * is the honest degradation: fewer ways to narrow, nothing broken.
 */

/**
 * The index is built at runtime from the manifest (brief §3), so it costs no
 * bytes on the wire beyond MiniSearch itself — and that is loaded on demand,
 * because it is a third of the bundle and the calendar, which is the page that
 * matters, never searches. A query typed before it arrives simply applies a
 * moment later.
 *
 * It reaches the display name, what a saint was, where they were, and who
 * venerates them — which is as far as the manifest goes. The other name forms
 * (Ἀντώνιος, Ⲁⲛⲧⲱⲛⲓⲟⲥ) live in each saint's own file and are therefore not
 * searchable; putting them in the manifest is a size decision, not a code one.
 *
 * `onChange` is the page's update pass, arriving at the one call site as it
 * does for `wireControls`. A query typed while the index was still loading has
 * to be answered the moment it lands, and that is the only reason this needs
 * it at all.
 */
/**
 * The index's shape, exported so a test can build the *same* index rather than
 * a second one that agrees with it by coincidence. `e2e/helpers.js` needs a
 * query that reaches exactly one saint, and a hand-rolled matcher would promise
 * something the page does not do.
 */
export const SEARCH_FIELDS = ['name', 'types', 'churches', 'regions'];
export const SEARCH_OPTIONS = { prefix: true, fuzzy: 0.2, combineWith: 'AND' };

/**
 * One card as the index holds it. The comments on each field are below, in the
 * call that was its only caller until this was lifted out.
 */
export const searchDoc = (card) => ({
  slug: card.slug,
  name: [card.display_name, ...Object.values(card.names ?? {})].join(' '),
  types: (card.types ?? []).flatMap(allNames).join(' '),
  churches: [
    ...new Set(
      (card.attestations ?? [])
        .filter((a) => a.status === 'venerated')
        .map((a) => CHURCHES_BY_ID[a.church]?.display_name ?? ''),
    ),
  ].join(' '),
  regions: (card.locations ?? []).map((l) => REGIONS_BY_ID[l.region]?.display_name ?? '').join(' '),
});

export async function loadSearch(cards, { onChange: update }) {
  /* Every language's names go into the index, not the chosen one, so a reader
     typing «игумен» finds the abbots whatever the chrome is set to. Since the
     packs are fetched per language (2026-08-27) this is the one caller that
     genuinely needs all four, and it is already async. */
  const [{ default: MiniSearch }] = await Promise.all([import('minisearch'), ensureAllPacks()]);
  const index = new MiniSearch({ idField: 'slug', fields: SEARCH_FIELDS, searchOptions: SEARCH_OPTIONS });
  /*
   * `searchDoc`'s four fields, and why each is every language at once rather
   * than the chosen one: the index is built once and the chrome's language can
   * change under it.
   *
   * `name` — the English name and every recorded form (2026-08-26). A reader is
   * shown «Феврония Муромская» and must be able to type it; a reader who knows
   * the English must keep finding it.
   *
   * `types` — every language's name for the type (author, 2026-08-25 evening:
   * "add the other language equivalents of the search terms"). Indexing the
   * current language would leave a reader who switched searching a Russian grid
   * with Romanian words. The slug is in there too, so an old bookmarked query
   * still matches.
   *
   * `churches` — each church's name once: a church that keeps the saint on two
   * days (2026-10-03, TODO item 1) would otherwise weight this field twice
   * against every other, and the index is scored on what it holds.
   */
  await addInSlices(index, cards);
  if (!state || state.cards !== cards) return;
  state.search = index;
  if (state.filters.query.trim()) update({ animate: true });
}

/**
 * How many saints one idle slice indexes.
 *
 * **Measured, not chosen by analogy with `IDLE_CHUNK` in
 * `views/index/grid.js`.** The wall clock below cannot interrupt a chunk, only
 * decline to start another, so the chunk *is* the floor on how long one slice
 * blocks: at 250 the slices came back as 50-86 ms tasks at 4x CPU, which is
 * five frames each and still visible in a scroll. 80 puts a slice inside a
 * frame's worth of work on that machine while leaving the clock something to
 * aggregate where the machine is quicker than that.
 */
const INDEX_CHUNK = 80;

/**
 * The index, built in idle slices — the grid's `packGrid` and the carousel's
 * `packRest`, applied to the one piece of the boot that was still done in a
 * single pass.
 *
 * **It was one `addAll` of the whole corpus, and it landed on the frame after
 * the first card** — so the advanced search page appeared and then ignored the
 * reader, which is the half of "it takes a while to load" that was not the
 * download. The size of that task is in `e2e/index-grid.spec.js`'s *the search
 * index arrives in slices*, which is what holds it down;
 * `scratchpad/adv-mobile.mjs` is the instrument that found it. The corpus is
 * twice what this was written for and the task grows with it.
 *
 * The slice is held to **8 ms of wall clock**, not to the deadline's own
 * `timeRemaining` — `packGrid`'s comment has the reason, and it is the same
 * one: a slice that spends a 50 ms grant is a 50 ms task, and what is being
 * protected here is the scroll of the grid the reader is now looking at.
 *
 * `timeout` on the idle request is the other half. A boot that never goes
 * idle would otherwise never index, and a reader who types is owed an answer
 * eventually rather than only on a quiet main thread.
 *
 * **Nothing is searchable until all of it is.** `state.search` is assigned by
 * the caller, after this resolves, so a query can never meet a half-built
 * index and answer with the prefix of the corpus that happened to have
 * landed — the honest degradation while it builds is the one the page already
 * had: the filters work, the query does not, and it applies the moment the
 * index is whole.
 *
 * Resolves early and leaves the index unfinished if the page has gone or its
 * corpus changed under us; the caller's own guard then drops it on the floor.
 */
function addInSlices(index, cards) {
  const idle =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback
      : /*
         * **A frame, where `packGrid` waits 200 ms.** Safari has never shipped
         * `requestIdleCallback` and the stand-in is what decides how long the
         * whole build takes there: the grid can afford 200 ms a slice because
         * it is placing cards nobody has scrolled to yet, and this cannot,
         * because until the last slice is in there is no search at all.
         */
        (fn) => setTimeout(fn, 16);
  return new Promise((resolve) => {
    let from = 0;
    const step = () => {
      if (!state || state.cards !== cards) return resolve();
      /*
       * **A reader who has typed is not background work, and is not owed a
       * frozen page either.** The slices exist to keep the scroll of a grid
       * somebody is reading; a pending query says nobody is reading it, they
       * are waiting on an answer that cannot come until the last document is
       * in. So the budget opens up and the next slice is taken at the first
       * opportunity rather than the first idle one — but it is still a budget,
       * and the work still yields between slices.
       *
       * Both halves are a test. Draining in one pass instead fails
       * `e2e/index-grid.spec.js`'s *the search index arrives in slices* at
       * about 1,000 ms against its 500 ms cliff; not draining at all leaves the
       * carousel drifting on a query narrow enough to stop it
       * (`e2e/index-carousel.spec.js`, *a search too short to fill the row*),
       * because on a loaded runner the slices take longer than the five seconds
       * that test waits.
       */
      const waiting = Boolean(state.filters.query.trim());
      const budget = waiting ? 40 : 8;
      const spent = performance.now();
      do {
        index.addAll(cards.slice(from, from + INDEX_CHUNK).map(searchDoc));
        from += INDEX_CHUNK;
      } while (from < cards.length && performance.now() - spent < budget);
      if (from >= cards.length) return resolve();
      if (waiting) setTimeout(step, 0);
      else idle(step, { timeout: 500 });
    };
    idle(step, { timeout: 500 });
  });
}

/**
 * Which Gregorian months hold each saint's feasts this year. Resolving a
 * Julian or Coptic feast to a Gregorian month is calendar work, and the feast
 * index is the one place in this codebase that does it.
 */
export function monthsBySlugFor(cards) {
  const year = new Date().getFullYear();
  const months = new Map();
  for (const [iso, entries] of feastIndexFor(cards, year, CHURCHES_BY_ID)) {
    const month = parseIso(iso).month;
    for (const entry of entries) {
      if (!months.has(entry.slug)) months.set(entry.slug, new Set());
      months.get(entry.slug).add(month);
    }
  }
  return months;
}
