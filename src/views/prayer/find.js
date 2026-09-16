import { formatSubtext } from '../../lib/calendar-page.js';
import { fill, STRINGS } from '../../ui/strings.js';
import { goToSlug, refreshEnds, showCard } from './card.js';
import { state } from './state.js';

/**
 * The row above the hymnal: the field that narrows it, the line that says how
 * much is left, and the switch between the two faces of the columns beside.
 *
 * **The field narrows the book rather than filtering a list beside it.** The
 * arrows step through what the field has left, so a reader who has typed three
 * letters is reading a shorter hymnal and not walking past the saints the
 * query excluded — which is the only reading of a search field on a page that
 * shows one saint at a time.
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
  const { default: MiniSearch } = await import('minisearch');
  if (!state || state.all !== all) return;
  const index = new MiniSearch({
    idField: 'slug',
    fields: ['name', 'sub', 'companions'],
    searchOptions: { prefix: true, fuzzy: 0.2, combineWith: 'AND' },
  });
  index.addAll(documents(all, state.data?.bySlug));
  if (!state || state.all !== all) return;
  state.search = index;
  if (state.query.trim()) apply(el);
}

/* ---- narrowing ----------------------------------------------------------- */

/**
 * The hymnal the query leaves, in the book's own order.
 *
 * MiniSearch answers by score and this page is a book, so the hits are used as
 * a membership test over `all` rather than as an ordering: a reader stepping
 * through a narrowed hymnal is still stepping alphabetically.
 */
function narrowed() {
  const q = state.query.trim();
  if (!q || !state.search) return state.all;
  const hits = new Set(state.search.search(q).map((r) => r.id));
  return state.all.filter((card) => hits.has(card.slug));
}

/**
 * The count line. Three strings and no `{n}` in two of them: four of the five
 * languages do not pluralise the way English does, so "1 saint" is its own
 * sentence rather than a template that happened to be handed a 1.
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
}

/**
 * Puts a new shown list in place and keeps the reader where they were.
 *
 * **The saint in hand is held across the change where the query still holds
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

/** Reads the field and narrows to it. */
function apply(el) {
  if (!state) return;
  setOrder(el, narrowed());
}

/**
 * A saint named in an aside, reached whether or not the query is showing them.
 *
 * A relation is a fact about the saint and not about the search, so pressing a
 * name that the current query excludes takes the reader there and puts the
 * field back to the whole hymnal rather than refusing. The field is cleared as
 * well as the state, because a query left in a box that is no longer narrowing
 * anything is the control lying about itself.
 */
export function revealSlug(el, slug) {
  if (!state) return;
  if (!state.order.some((card) => card.slug === slug)) {
    state.query = '';
    const field = el.querySelector('#hy-q');
    if (field) field.value = '';
    setOrder(el, state.all);
  }
  goToSlug(el, slug);
}

/* ---- the two faces ------------------------------------------------------- */

/**
 * The two faces, in the order the pair is drawn — the square then the four
 * lines, which is the order the Daily register draws the same pair in, so the
 * control reads the same wherever a reader meets it. Which of them a page opens
 * in is `views/prayer/state.js`'s, not this list's.
 *
 * **Not stored.** `lib/settings.js` keeps the Daily register's face across
 * visits, and that setting's two values are that register's two faces; this
 * control's are this page's, and one setting answering to two vocabularies is
 * how a stored preference comes to mean neither. Said plainly rather than left
 * looking like an oversight.
 */
export const VIEWS = ['plate', 'rows'];

const VIEW_MARKS = {
  plate: '<svg class="hy-vt" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="1" /></svg>',
  rows: '<svg class="hy-vt" viewBox="0 0 14 14" aria-hidden="true"><path d="M1 2h12M1 5.7h12M1 9.3h12M1 13h12" /></svg>',
};

/* Read at call time, never captured: the packs merge over the base in place
   (ui/strings.js), so a branch held at module scope would be whichever language
   was current when this file was first imported. */
const VIEW_WORDS = {
  plate: () => STRINGS.prayer.viewPlate,
  rows: () => STRINGS.prayer.viewRows,
};

/**
 * The row's markup. `views/prayer.js` writes it into the page so the whole of
 * the page's shape is readable in one file; everything that happens to it
 * afterwards is here — which is why that view opens the state before it writes
 * the markup: the live face is read from one place and not spelled in two.
 */
export function findMarkup() {
  const P = STRINGS.prayer;
  const buttons = VIEWS.map(
    (mode) =>
      `<button class="hy-vt-button" type="button" data-hy-view="${mode}" aria-pressed="${mode === state?.view}">
        <span class="sr-only">${VIEW_WORDS[mode]()}</span>${VIEW_MARKS[mode]}
      </button>`,
  ).join('');
  return `<div class="hy-find">
    <input class="hy-q" type="search" id="hy-q" autocomplete="off"
      placeholder="${P.searchPlaceholder}" aria-label="${P.searchLabel}" />
    <p class="hy-count utility" id="hy-count" aria-live="polite"></p>
    <div class="hy-views" id="hy-views" role="group" aria-label="${P.views}">${buttons}</div>
  </div>`;
}

/**
 * Wires the row and paints the count for the first time.
 *
 * One listener for the field and one for the group, both on boxes this view
 * owns for its whole life, so nothing here is rebound when the card or an aside
 * is redrawn.
 */
export function wireFind(el, { redrawAsides }) {
  paintCount(el);
  loadSearch(el).catch(() => {
    /* MiniSearch did not arrive. The field then narrows nothing and the page is
       the whole hymnal, which is what it is before the index lands anyway. */
  });

  el.querySelector('#hy-q')?.addEventListener('input', (e) => {
    if (!state) return;
    state.query = e.target.value;
    apply(el);
  });

  el.querySelector('#hy-views')?.addEventListener('click', (e) => {
    const button = e.target.closest?.('[data-hy-view]');
    if (!button || !state) return;
    const mode = button.dataset.hyView;
    if (!VIEWS.includes(mode) || mode === state.view) return;
    state.view = mode;
    for (const other of el.querySelectorAll('[data-hy-view]')) {
      other.setAttribute('aria-pressed', String(other.dataset.hyView === mode));
    }
    redrawAsides();
  });
}
