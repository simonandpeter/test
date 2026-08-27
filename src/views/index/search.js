import { CHURCHES_BY_ID } from '../../data/churches.js';
import { parseIso } from '../../lib/calendar-page.js';
import { buildFeastIndex } from '../../lib/feasts.js';
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
export async function loadSearch(cards, { onChange: update }) {
  /* Every language's names go into the index, not the chosen one, so a reader
     typing «игумен» finds the abbots whatever the chrome is set to. Since the
     packs are fetched per language (2026-08-27) this is the one caller that
     genuinely needs all four, and it is already async. */
  const [{ default: MiniSearch }] = await Promise.all([import('minisearch'), ensureAllPacks()]);
  const index = new MiniSearch({
    idField: 'slug',
    fields: ['name', 'types', 'churches', 'regions'],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(
    cards.map((card) => ({
      slug: card.slug,
      /*
       * The English name and every recorded form (2026-08-26). A reader is
       * shown «Феврония Муромская» and must be able to type it; a reader who
       * knows the English must keep finding it. Same reasoning as the types
       * below, and the same reason it is every language at once rather than
       * the chosen one: the index is built once and the chrome can change
       * under it.
       */
      name: [card.display_name, ...Object.values(card.names ?? {})].join(' '),
      /*
       * Every language's name for the type, not the chosen one (author,
       * 2026-08-25 evening: "add the other language equivalents of the search
       * terms"). The index is built once and the chrome's language can change
       * under it, so indexing the current language would leave a reader who
       * switched searching a Russian grid with Romanian words. The slug is in
       * there too, so an old bookmarked query still matches.
       */
      types: (card.types ?? []).flatMap(allNames).join(' '),
      churches: card.attestations
        .filter((a) => a.status === 'venerated')
        .map((a) => CHURCHES_BY_ID[a.church]?.display_name ?? '')
        .join(' '),
      regions: (card.locations ?? [])
        .map((l) => REGIONS_BY_ID[l.region]?.display_name ?? '')
        .join(' '),
    })),
  );
  if (!state || state.cards !== cards) return;
  state.search = index;
  if (state.filters.query.trim()) update({ animate: true });
}

/**
 * Which Gregorian months hold each saint's feasts this year. Resolving a
 * Julian or Coptic feast to a Gregorian month is calendar work, and the feast
 * index is the one place in this codebase that does it.
 */
export function monthsBySlugFor(cards) {
  const year = new Date().getFullYear();
  const months = new Map();
  for (const [iso, entries] of buildFeastIndex(cards, year, CHURCHES_BY_ID)) {
    const month = parseIso(iso).month;
    for (const entry of entries) {
      if (!months.has(entry.slug)) months.set(entry.slug, new Set());
      months.get(entry.slug).add(month);
    }
  }
  return months;
}
