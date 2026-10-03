import { formatSubtext } from '../../lib/calendar-page.js';
import { applyFilters } from '../../lib/index-filters.js';
import { readerHasFiltered } from '../index/filter.js';
import { controls, LAYOUTS, syncCalendarFacet, wireControls } from '../index/controls.js';
import { loadMentions } from '../../lib/manifest.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { goToSlug, refreshEnds, showCard } from './card.js';
import { state } from './state.js';

/**
 * The row above the hymnal: **All Saints' own advanced search**, the line that
 * says how much of the book is left, and the switch between the two faces of
 * the columns beside.
 *
 * **The field narrows the book rather than filtering a list beside it.** The
 * arrows step through what the field has left, so a reader who has typed three
 * letters is reading a shorter hymnal and not walking past the saints the
 * query excluded — which is the only reading of a search field on a page that
 * shows one saint at a time. The facets narrow it the same way, which is the
 * whole of why they could be lifted here rather than written again: the
 * semantics were never "hide rows in a grid", they were "this is the pool".
 *
 * **It is the same shell and not a copy of it** (author, 2026-10-02: "display
 * the same as All Saints page… SSOT"). `views/index/controls.js` draws the
 * sticky block and wires it over whatever state it is handed; there is no
 * second sheet and no second set of chips.
 *
 * **No Sort chip and no Detailed box.** All Saints sorts a grid; this page's
 * order *is* the book, so a sort control here would mean reordering the
 * hymnal, and there is no grid to detail. The one control that means something
 * in that row is the face the two asides are listed in, and it takes the slot
 * All Saints gives View.
 *
 * **And not even that one below 1024 px** (TODO item 7): the asides draw the
 * row card at that width whatever the chip says, so the chip switched between
 * one shape and itself. `syncFace` is what holds it.
 */

/* ---- the index ----------------------------------------------------------- */

/**
 * What is searched, and it is only what the card already carries.
 *
 * **Never the hymn text** — that lives in each saint's own folder, and 142
 * folders is a corpus download to answer one keystroke. What the manifest has
 * is the name in every form recorded, the line of office and dates printed
 * under it, and the names of whoever the corpus records this saint with; which
 * is also what the reader can see, so a query that matches is a query whose
 * match is on the screen.
 *
 * **`sub` is in the reader's own language and that is safe here**, where it
 * would not be on All Saints: a language change re-renders the open view
 * (`main.js`), which destroys this page's state and builds the index again. So
 * this index never outlives the language it was written in, and needs neither
 * `ensureAllPacks` nor the four packs' worth of bytes that costs.
 */
function documents(cards, bySlug) {
  return cards.map((card) => ({
    slug: card.slug,
    name: [card.display_name, ...Object.values(card.names ?? {})].join(' '),
    sub: formatSubtext(card),
    companions: (card.mentionedIn ?? [])
      .map((slug) => bySlug?.get(slug))
      .filter(Boolean)
      .map((other) => other.display_name)
      .join(' '),
  }));
}

/**
 * MiniSearch, on demand and after the paint.
 *
 * It is a third of the bundle and the four routes that never search must not
 * pay for it, which is why All Saints imports it this way too. Until it lands
 * `state.search` is null and a query narrows nothing — the honest degradation,
 * and the same one the Index makes: a query typed while this was in the air is
 * applied the moment it arrives, which is what the last two lines are for.
 */
async function loadSearch(el) {
  /* The list this index is about, held across the await: a language change
     destroys this page and builds another, and an index handed to the second
     page would be the first page's words. Comparing the array identity is how
     `views/index/search.js` asks the same question. */
  const all = state?.all;
  /* The `companions` field is built from `mentionedIn`, which is fetched on
     demand (lib/manifest.js), so it is awaited here — before the documents are
     written rather than after, or a query for a companion's name would miss
     until the next render. This path is already off the first paint. */
  const [{ default: MiniSearch }] = await Promise.all([import('minisearch'), loadMentions()]);
  if (!state || state.all !== all) return;
  const index = new MiniSearch({
    idField: 'slug',
    fields: ['name', 'sub', 'companions'],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(documents(all, state.data?.bySlug));
  if (!state || state.all !== all) return;
  state.search = index;
  if (state.filters.query.trim()) apply(el);
}

/* ---- narrowing ----------------------------------------------------------- */

/**
 * The hymnal the filters leave, in the book's own order.
 *
 * **`applyFilters` decides membership and never the order.** It sorts what it
 * matches, because All Saints hands the answer straight to a grid; here the
 * answer is used as a set over `all`, so a reader stepping through a narrowed
 * hymnal is still stepping alphabetically. That is also why this page has no
 * Sort chip to feed it: whatever `filters.sort` happens to say is discarded
 * one line later.
 *
 * MiniSearch is the query half, handed in as `matchesQuery` exactly as
 * `views/index/filter.js` hands in its own.
 */
export function narrowed() {
  const q = state.filters.query.trim();
  const hits = q && state.search ? new Set(state.search.search(q).map((r) => r.id)) : null;
  const { matched } = applyFilters(state.all, state.filters, {
    monthsBySlug: state.monthsBySlug,
    matchesQuery: hits ? (slug) => hits.has(slug) : null,
  });
  const keep = new Set(matched.map((card) => card.slug));
  return state.all.filter((card) => keep.has(card.slug));
}

/**
 * The count line. Three strings and no `{n}` in two of them: four of the five
 * languages do not pluralise the way English does, so "1 saint" is its own
 * sentence rather than a template that happened to be handed a 1.
 *
 * **Visible, where All Saints' tweened line is `sr-only`.** There it sits over
 * a grid the reader can count for themselves; here it is the only thing on the
 * page that says how long the book now is.
 *
 * `aria-live` is on the element in the markup, not set here: the line is
 * rewritten on every keystroke and a region announced into existence mid-typing
 * is a region some readers never hear.
 */
function paintCount(el) {
  const line = el.querySelector('#hy-count');
  if (!line) return;
  const P = STRINGS.prayer;
  const n = state.order.length;
  line.textContent = n === 0 ? P.countNone : n === 1 ? P.countOne : fill(P.count, { n });
  const clear = el.querySelector('[data-clear]');
  if (clear) clear.hidden = !readerHasFiltered(state.filters, state.facets?.churches);
}

/**
 * Puts a new shown list in place and keeps the reader where they were.
 *
 * **The saint in hand is held across the change where the filters still hold
 * them.** Typing narrows the book under the reader's hands, and a page that
 * jumped back to the first saint on every keystroke would be unusable; a page
 * that redrew the same saint on every keystroke would throw away the hymn's
 * own scroll position instead. So the card is redrawn only when the saint
 * actually changes, and the arrows — whose ends moved either way — are told
 * separately.
 */
function setOrder(el, order) {
  const held = state.order[state.at]?.slug;
  state.order = order;
  const at = order.findIndex((card) => card.slug === held);
  if (at >= 0) {
    state.at = at;
    refreshEnds(el);
  } else {
    state.at = 0;
    state.detail = null;
    state.generation += 1;
    showCard(el);
  }
  paintCount(el);
}

/** Reads the controls and narrows to them. */
function apply(el) {
  if (!state) return;
  setOrder(el, narrowed());
}

/**
 * A saint named in an aside, reached whether or not the filters are showing
 * them.
 *
 * A relation is a fact about the saint and not about the search, so pressing a
 * name that the current narrowing excludes takes the reader there and widens
 * the page back to the whole hymnal rather than refusing. **Through the shell's
 * own Clear**, because the DOM is the source of truth for the filter state
 * (`views/index/controls.js`) and a reset written here would have to tick every
 * box the panel holds and then re-read them — which is that button.
 */
export function revealSlug(el, slug) {
  if (!state) return;
  if (!state.order.some((card) => card.slug === slug)) {
    el.querySelector('[data-clear]')?.click();
  }
  goToSlug(el, slug);
}

/* ---- the shell ----------------------------------------------------------- */

/**
 * The shell's markup. `views/prayer.js` writes it into the page so the whole of
 * the page's shape is readable in one file; everything that happens to it
 * afterwards is here.
 */
export function findMarkup() {
  return `${controls(state, { sort: false, detailed: false })}
    <p class="hy-count utility" id="hy-count" aria-live="polite"></p>`;
}

/**
 * The face below 1024 px is `rows` and there is no control over it.
 *
 * `asides.js` draws the row card at that width regardless — stage G's mat is
 * still there on a phone, so a Pictures face would be a column of empty mats —
 * which left the chip offering a choice it could not keep. The chip is removed
 * rather than hidden, so it is gone from the reading order too, and it comes
 * back with the reader's own value when the window is wide again.
 *
 * Called on every crossing of the breakpoint, not only at the first paint: a
 * reader who chose Pictures at a desk and narrowed the window kept a face the
 * page would no longer draw and had nothing left to change it with.
 */
function syncFace(el) {
  const desk = window.matchMedia?.(DESK).matches ?? true;
  const chip = el.querySelector('.index-foot [data-facet="layout"]');
  if (chip) chip.hidden = !desk;
  if (!desk && state.layout !== LAYOUTS[1]) {
    state.layout = LAYOUTS[1];
    return true;
  }
  return false;
}

const DESK = '(min-width: 1024px)';

/**
 * Wires the shell and paints the count for the first time.
 *
 * The face chip is All Saints' View chip, over the same two values, so nothing
 * here listens for it: `wireControls` writes `state.layout` and calls back,
 * and the callback is the aside redraw. **`layoutKey` is deliberately not
 * passed**, so the face is not stored: `lib/settings.js` keeps the Daily
 * register's face across visits and that setting's two values are that
 * register's; one setting answering to two vocabularies is how a stored
 * preference comes to mean neither.
 */
export function wireFind(el, { redrawAsides }) {
  /* Every calendar ticked, as the Index opens — the one place allowed to tick
     a box and re-read the DOM together, and it has to run before the first
     narrowing pass reads `state.filters`. */
  syncCalendarFacet(state);
  wireControls(state, {
    onChange: () => apply(el),
    // Random from what the filters have left, and it opens the saint in this
    // page's own way: the hymnal turns to them rather than navigating away.
    pool: () => (state.order.length ? state.order : state.all),
    open: (slug) => revealSlug(el, slug),
    rerender: redrawAsides,
    sort: false,
    detailed: false,
    modeToggle: false,
  });
  syncFace(el);
  const mq = window.matchMedia?.(DESK);
  if (mq) {
    const onWidth = () => {
      if (syncFace(el)) redrawAsides();
    };
    mq.addEventListener('change', onWidth);
    state.cleanups.push(() => mq.removeEventListener('change', onWidth));
  }
  apply(el);
  loadSearch(el).catch(() => {
    /* MiniSearch did not arrive. The field then narrows nothing and the page is
       whatever the facets left, which is what it is before the index lands
       anyway. */
  });
}
