/**
 * All Saints — Index mode (brief §8.2). The conventional view: a vertical
 * virtualised grid where all the sorting and filtering live. River mode is
 * Session 6 and is deliberately absent rather than stubbed; when it lands, the
 * mode toggle goes above these controls and nothing here changes.
 *
 * Three things here are not incidental:
 *
 * - **Every card's height is known before it is rendered**, from the aspect
 *   ratio in the manifest, so the virtualiser never measures (Addendum C2).
 * - **Filtered-out saints fade rather than vanish**, over the standard 200 ms,
 *   because a corpus that flickers reads as a search engine and this is a
 *   register. Under reduced motion they are simply gone — removed, not faster.
 *
 * And one thing added on 2026-08-22 (Addendum H1–H3): the grid remembers where
 * the reader left it, shows more of each saint when asked (*Detailed*), and
 * carries the Save bookmark on every card.
 */

import { CHURCHES_BY_ID, enabledChurches } from '../data/churches.js';
import { saintName } from '../lib/honorific.js';
import { REGIONS_BY_ID } from '../lib/regions.js';
import { allNames, historicityName, typeName, typeNames } from '../lib/saint-types.js';
import { buildFeastIndex } from '../lib/feasts.js';
import { formatLifespan, parseIso } from '../lib/calendar-page.js';
import { escapeHtml as esc, firstParagraphText } from '../lib/markdown.js';
import { loadDetail, prefetch } from '../lib/detail.js';
import * as store from '../lib/store.js';
import {
  EMPTY_FILTERS,
  SORTS,
  applyFilters,
  facetsOf,
  hasActiveFilters,
} from '../lib/index-filters.js';
import { layout, windowOf } from '../lib/virtual-grid.js';
import { beginSwap, restore, setAside } from '../ui/swap.js';
import { paintSaved, renderBookmark, wireSaveButtons } from '../ui/save.js';
import { chosenChurch, churchName, keptBy, subscribeChurch } from '../lib/church.js';
import { STRINGS, fill } from '../ui/strings.js';
import { dateFormatter, formatDate, languageTag } from '../lib/i18n.js';

const BASE = import.meta.env.BASE_URL;

export const title = () => STRINGS.saints.title;

const GAP = 16;
/**
 * The two numbers the grid's geometry rests on, and the stylesheet's side of
 * the bargain: index.css fixes the card's padding, border, gaps and the name's
 * two-line box so that these stay true. Changing either without the other
 * crops cards.
 */
const CARD_TEXT_HEIGHT = 92;
const CARD_INSET = 18;
/**
 * Rows are a fixed box: a 48 px thumbnail, the name and its glyph beside it,
 * the dates beneath. Nothing in a row varies with the image, so its height is
 * a constant rather than a calculation — index.css holds the other half of it.
 */
const ROW_HEIGHT = 66;
const ROW_GAP = 8;
/**
 * Detailed (author, 2026-08-22) adds the rite × communion matrix in place of
 * the badge and a short description under the dates, and both are sized so
 * the box is still known before render: the matrix fits the 42 px name line a
 * card already reserves, and the description is a fixed count of utility lines
 * (13.5 px at 1.45 = 19.575 each), clamped — three on a card, two on a row.
 * Card: 92 + 6 gap + 58.725 = 156.7. Row: 18 inset + 31 name line + 2 + 19.575
 * dates + 2 + 39.15 = 111.7. index.css fixes the other half of each number.
 */
const DETAILED_CARD_TEXT_HEIGHT = 157;
const DETAILED_ROW_HEIGHT = 112;
const LAYOUTS = ['cards', 'rows'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthLabel = (m) =>
  formatDate({ month: 'long', timeZone: 'UTC' }, new Date(Date.UTC(2001, m - 1, 1)));

let state = null;

/**
 * Where the reader was, kept across a trip into a saint's page (author,
 * 2026-08-22): the × on that page and the browser's own back both return here
 * and find the grid as it was left — filters, search, sort, which facets were
 * open, and the scroll position. Layout and Detailed are settings and come
 * back by themselves. Module-level, so it lives as long as the page does; the
 * nav link still opens the Index fresh, because it does not ask.
 */
let remembered = null;

/**
 * The opening of each life, derived once from the fetched text and kept across
 * re-renders — the same card is mounted and unmounted on every scroll frame
 * and must not refetch to say the same sentence again.
 */
const ledes = new Map();

export function destroy() {
  if (state) remembered = snapshot(state);
  state?.cleanups.forEach((fn) => fn?.());
  state = null;
}

export function render(el, { data, router, nav }) {
  destroy();

  const cards = data.saints;
  const settings = store.getSettings();
  state = {
    el,
    data,
    router,
    cards,
    filters: seeded({ ...EMPTY_FILTERS }),
    facets: facetsOf(cards),
    monthsBySlug: monthsBySlugFor(cards),
    search: null,
    rendered: new Map(),
    positions: [],
    shownCards: [],
    shown: 0,
    // Which layout the reader last chose, remembered across visits: a view
    // control that forgets is one the reader has to set every time. Detailed
    // is remembered the same way.
    layout: LAYOUTS.includes(settings.indexLayout) ? settings.indexLayout : 'cards',
    detailed: settings.indexDetailed === true,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    named: null,
    cleanups: [],
  };

  el.innerHTML = `
    <h1>${STRINGS.saints.title}</h1>
    ${controls(state)}
    <p class="result-count utility" data-count-row></p>
    <p class="set-aside utility" data-set-aside hidden></p>
    <div class="grid" data-grid><div class="grid-inner" data-grid-inner></div></div>
    <div data-tray></div>
    <p class="index-empty" data-empty hidden>${STRINGS.saints.noneMatch}</p>`;

  wireControls();
  wireGrid();
  // The header's control can change the church while the grid is open.
  state.cleanups.push(subscribeChurch(() => state && update({ animate: true })));

  // Back where the reader was, if that is what this navigation is — the saint
  // page's × says so, and so does a history traversal. The grid's height has
  // to exist before the scroll can, which is why the restore straddles update.
  const restoring = (nav?.restore || nav?.pop) && remembered ? remembered : null;
  if (restoring) applySnapshot(restoring);
  update({ animate: false });
  if (restoring) {
    window.scrollTo(0, restoring.scrollY);
    paintWindow();
  }
  loadSearch(cards);
}

/* ---- remembering the place --------------------------------------------- */

function snapshot(state) {
  return {
    filters: { ...state.filters },
    openFacets: [...state.el.querySelectorAll('details.facet[open]')].map((d) => d.dataset.facet),
    scrollY: window.scrollY,
  };
}

/**
 * Puts a snapshot back into both the state and the controls, because
 * readFilters reads the controls: the next keystroke must start from what the
 * reader sees, not from an empty form.
 */
function applySnapshot(snap) {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');
  const f = seeded({ ...EMPTY_FILTERS, ...snap.filters });
  state.filters = f;

  controlsEl.querySelector('[data-query]').value = f.query ?? '';
  const check = (name, values) => {
    const wanted = new Set((values ?? []).map(String));
    for (const input of controlsEl.querySelectorAll(`input[name="${name}"]`)) {
      input.checked = wanted.has(input.value);
    }
  };
  check('churches', f.churches);
  check('months', f.months);
  check('types', f.types);
  check('sexes', f.sexes);
  check('regions', f.regions);
  check('historicities', f.historicities);
  controlsEl.querySelector('[data-from]').value = f.from ?? '';
  controlsEl.querySelector('[data-to]').value = f.to ?? '';
  const mode = controlsEl.querySelector(`input[name="rangeMode"][value="${f.rangeMode}"]`);
  if (mode) mode.checked = true;
  setChoice(controlsEl, 'sort', f.sort ?? EMPTY_FILTERS.sort);
  for (const name of snap.openFacets ?? []) {
    const group = controlsEl.querySelector(`details.facet[data-facet="${name}"]`);
    if (group) group.open = true;
  }
  el.querySelector('[data-clear]').hidden = !hasActiveFilters(f);
}

/* ---- search -------------------------------------------------------------- */

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
 */
async function loadSearch(cards) {
  const { default: MiniSearch } = await import('minisearch');
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
function monthsBySlugFor(cards) {
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

/* ---- controls ------------------------------------------------------------ */

const checkboxes = (name, options) =>
  options
    .map(
      ({ value, label }) => `<label class="facet-option">
        <input type="checkbox" name="${name}" value="${esc(value)}" /> ${esc(label)}
      </label>`,
    )
    .join('');

/**
 * A die, for the Random saint control (author, 2026-08-26 evening: "move the
 * 'Random saint' button next to 'Dates' filter and make it a dice icon,
 * remove the text"). Five pips on a face, which is the reading that is
 * unmistakable at 15 px; the word it replaces is still the button's
 * accessible name, so nothing is lost to a reader who cannot see it.
 */
const ICON_DIE = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
  stroke-width="1.7" aria-hidden="true" focusable="false">
  <rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/>
  <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none"/>
  <circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none"/>
  <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/>
  <circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none"/>
  <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none"/>
</svg>`;

/**
 * A one-of-many chip, wearing the same `.facet` disclosure the filters wear
 * (author, 2026-08-26 evening, of Sort: "have it like the other drop down
 * filters but it displays the selected setting, e.g. 'Random order >'" — and
 * of View, "do a similar button"). Both were wider controls on the row below:
 * a native `<select>` with a visible *Sort* label, and a three-part segmented
 * toggle with a visible *View* label. Compacting them is what freed the row
 * for the Detailed box.
 *
 * **The summary prints the value and the name is carried out of sight.** A
 * chip reading "Random order" says what it is to a reader looking at it, and
 * says nothing at all to a reader who is not — so the control's own word
 * ("Sort", "View") is the first thing inside the summary, `sr-only`. That is
 * the same division the facet chips make, where the visible word *is* the
 * name; here the visible word is the answer, and the name goes in beside it
 * rather than being dropped.
 *
 * Radios rather than the checkboxes `facetGroup` uses, because these are one
 * of many and not any of many — the same reason the date range's own mode is
 * a radio group.
 */
const choiceGroup = (legend, name, options, current) => {
  const chosen = options.find((o) => o.value === current) ?? options[0];
  return `<details class="facet facet-choice" data-facet="${esc(name)}">
    <summary><span class="sr-only">${esc(legend)}: </span>${esc(chosen?.label ?? '')}</summary>
    <fieldset><legend class="sr-only">${esc(legend)}</legend>
      ${options
        .map(
          ({ value, label }) => `<label class="facet-option">
            <input type="radio" name="${esc(name)}" value="${esc(value)}"${
              value === chosen?.value ? ' checked' : ''
            } /> ${esc(label)}
          </label>`,
        )
        .join('')}
    </fieldset></details>`;
};

const facetGroup = (legend, name, options) =>
  options.length
    ? `<details class="facet" data-facet="${name}"><summary>${esc(legend)}</summary>
        <fieldset><legend class="sr-only">${esc(legend)}</legend>
          ${checkboxes(name, options)}
        </fieldset></details>`
    : '';

/**
 * Facet options in the order the reader reads them. `facetsOf` sorts by the
 * *slug*, which was the label until 2026-08-25 evening; now that the label is
 * a word in the reader's language, sorting by the slug leaves a Russian list
 * running Игумения, Игумен, Апологет, Апостол — alphabetical in a language
 * nobody is reading. Collated in the chosen language, so the ordering is the
 * one that language actually uses.
 */
const byLabel = (options) =>
  [...options].sort((a, b) => a.label.localeCompare(b.label, languageTag()));

/**
 * The chosen value of a `choiceGroup`, and the setting of one. Since
 * 2026-08-26 evening Sort and View are radio groups inside a `.facet`
 * disclosure rather than a `<select>` and a segmented toggle, and the chip's
 * own summary prints the answer — so setting one is two things, the radio and
 * the word, and neither may be done without the other or the control lies
 * about the grid. That is the failure Amendment 24's own comment records for
 * the `<select>` this replaces: the list was right and the label was lying.
 */
const currentChoice = (root, name, fallback) =>
  root.querySelector(`input[name="${name}"]:checked`)?.value ?? fallback;

const setChoice = (root, name, value) => {
  const input = root.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!input) return;
  input.checked = true;
  const summary = root.querySelector(`details[data-facet="${name}"] > summary`);
  const label = input.closest('label');
  if (summary && label) {
    // The `sr-only` span is the control's own name and stays; only the value
    // after it is rewritten.
    const name_ = summary.querySelector('.sr-only');
    summary.textContent = label.textContent.trim();
    if (name_) summary.prepend(name_);
  }
};

function controls(state) {
  const { facets } = state;
  const churchOptions = enabledChurches()
    .filter((c) => facets.churches.includes(c.id))
    .map((c) => ({ value: c.id, label: c.display_name }));

  return `<div class="index-controls">
    <div class="index-row">
      <input class="search-field" type="search" data-query
        aria-label="${STRINGS.saints.search}"
        placeholder="${STRINGS.saints.search}: ${STRINGS.saints.searchHint}" />
      <button type="button" data-clear hidden>${STRINGS.saints.clear}</button>
    </div>

    <div class="facets">
      ${facetGroup(STRINGS.saints.filters.church, 'churches', churchOptions)}
      ${facetGroup(STRINGS.saints.filters.month, 'months', MONTHS.map((m) => ({ value: String(m), label: monthLabel(m) })))}
      ${facetGroup(STRINGS.saints.filters.type, 'types', byLabel(facets.types.map((t) => ({ value: t, label: typeName(t) }))))}
      ${facetGroup(STRINGS.saints.filters.sex, 'sexes', facets.sexes.map((s) => ({ value: s, label: STRINGS.saint.sexLabel[s] ?? s })))}
      ${facetGroup(STRINGS.saints.filters.region, 'regions', byLabel(facets.regions.map((r) => ({ value: r, label: REGIONS_BY_ID[r]?.display_name ?? r }))))}
      ${facetGroup(STRINGS.saints.filters.historicity, 'historicities', facets.historicities.map((h) => ({ value: h, label: historicityName(h) })))}

      <details class="facet" data-facet="dates"><summary>${STRINGS.saints.filters.dates}</summary>
        <div class="range">
          <label class="utility">${STRINGS.saints.filters.from}
            <input type="number" data-from inputmode="numeric" step="1" />
          </label>
          <label class="utility">${STRINGS.saints.filters.to}
            <input type="number" data-to inputmode="numeric" step="1" />
          </label>
          <fieldset class="range-mode">
            <legend class="utility">${STRINGS.saints.filters.rangeMode}</legend>
            <label><input type="radio" name="rangeMode" value="overlaps" checked /> ${STRINGS.saints.filters.overlaps}</label>
            <label><input type="radio" name="rangeMode" value="within" /> ${STRINGS.saints.filters.within}</label>
          </fieldset>
          <p class="range-note utility">${STRINGS.saints.filters.rangeNote}</p>
        </div>
      </details>

      <!-- Random travels with the filters now (author, 2026-08-26 evening:
           "move the 'Random saint' button next to 'Dates' filter and make it
           a dice icon, remove the text"). It belongs there by argument as
           well as by instruction: it opens a saint *from what the filters
           have left*, so it is the last thing in the row that decides the
           pool rather than the first thing in the row that arranges it. The
           word it dropped is its accessible name and its tooltip. -->
      <button type="button" class="random-die" data-random
        aria-label="${esc(STRINGS.saints.random)}"
        title="${esc(STRINGS.saints.random)}">${ICON_DIE}</button>
    </div>

    <!-- Three chips where there were a select, a segmented toggle and a tick
         box on two rows (author, 2026-08-26 evening). The Detailed box came up
         to join them once the other two had been compacted; it is still a
         different axis from View, which is why it is still a box of its own
         and not a third option inside that chip. -->
    <div class="index-foot">
      ${choiceGroup(
        STRINGS.saints.sort.label,
        'sort',
        SORTS.map((id) => ({ value: id, label: STRINGS.saints.sort[id] })),
        state.filters.sort,
      )}
      ${choiceGroup(
        STRINGS.saints.layout.label,
        'layout',
        LAYOUTS.map((id) => ({ value: id, label: STRINGS.saints.layout[id] })),
        state.layout,
      )}

      <label class="detail-toggle utility">
        <input type="checkbox" data-detailed${state.detailed ? ' checked' : ''}
          aria-describedby="detailed-description" />
        ${STRINGS.saints.layout.detailed}
      </label>
      <span id="detailed-description" class="sr-only">${STRINGS.saints.layout.detailedDescription}</span>
    </div>
  </div>`;
}

/**
 * A filter set holding Random with no seed gets one minted (author,
 * 2026-08-24: Random is the default "so each time you open the site you get
 * exposed to more saints" — the fresh seed per visit is that exposure). A
 * snapshot that carries its seed keeps it: returning from a saint must find
 * the grid as it was left, not re-dealt.
 */
/*
 * One hand per page load, not per arrival (author, 2026-08-26: "unless the
 * site is refreshed, retain the first random sorting order the site loads
 * with, so if you see a saint and want to switch back you can still find
 * them"). It was `Date.now()` at each call, so every fresh mount of the Index
 * — every trip through Daily or Map and back — dealt again and lost the card
 * the reader had gone to find. The seed is minted once, when the module is
 * first asked for one, and a reload is the only thing that changes it.
 *
 * Choosing Random *again* from the sort control still deals a new hand; that
 * is `nextSort` below, which mints its own and is the one place a reshuffle
 * is something the reader asked for.
 */
let visitSeed = null;

function seeded(f) {
  if (f.sort === 'random' && !f.shuffleSeed) {
    visitSeed = visitSeed ?? String(Date.now());
    f.shuffleSeed = visitSeed;
  }
  return f;
}

/**
 * The sort, and the seed the Random order needs (author, 2026-08-24).
 *
 * A fresh seed each time Random is *arrived at*, so choosing it again after
 * leaving it deals a new hand; the same seed for as long as it stays chosen,
 * so typing in the search box or opening a facet does not reshuffle the grid
 * under the reader — this function runs on every `input` event in the panel,
 * which is most of them.
 */
function readSort(sort) {
  if (sort !== 'random') return { sort, shuffleSeed: null };
  const kept = state.filters.sort === 'random' ? state.filters.shuffleSeed : null;
  return { sort, shuffleSeed: kept ?? String(Date.now()) };
}

function wireControls() {
  const { el } = state;
  const controlsEl = el.querySelector('.index-controls');

  const checked = (name) =>
    [...controlsEl.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

  const readFilters = (e) => {
    // Detailed and View are view controls, not filters; each has its own
    // listener below and neither may run a filter pass. View joined this
    // guard on 2026-08-26 evening, when it became a radio inside a chip and
    // started firing the same `input` this listener is bound to — without it
    // a change of view laid every card out in the old one first and then
    // re-rendered them all in the new, which is two passes and a flash.
    if (e?.target?.matches?.('[data-detailed], input[name="layout"]')) return;
    const from = controlsEl.querySelector('[data-from]').value;
    const to = controlsEl.querySelector('[data-to]').value;
    state.filters = {
      ...state.filters,
      query: controlsEl.querySelector('[data-query]').value,
      churches: checked('churches'),
      months: checked('months').map(Number),
      types: checked('types'),
      sexes: checked('sexes'),
      regions: checked('regions'),
      historicities: checked('historicities'),
      from: from === '' ? null : Number(from),
      to: to === '' ? null : Number(to),
      rangeMode: controlsEl.querySelector('input[name="rangeMode"]:checked').value,
      ...readSort(currentChoice(controlsEl, 'sort', EMPTY_FILTERS.sort)),
    };
    update({ animate: true });
  };

  // One listener for the whole panel: every control here is a plain form
  // element, and `input` fires for all of them — typing, checking, selecting —
  // so listening for `change` as well would only run every filter pass twice.
  controlsEl.addEventListener('input', readFilters);

  /*
   * A chip that prints its own answer has to be told when the answer changes,
   * or it goes on advertising the order the grid is no longer in. Closing it
   * is the other half: unlike a facet, which is any-of-many and stays open
   * while the reader ticks a second box, this is one-of-many and the question
   * is over the moment it is answered.
   */
  const onChoice = (e) => {
    const input = e.target;
    if (!input?.matches?.('input[name="sort"]')) return;
    setChoice(controlsEl, 'sort', input.value);
    input.closest('details')?.removeAttribute('open');
  };
  controlsEl.addEventListener('input', onChoice);

  const random = controlsEl.querySelector('[data-random]');
  const onRandom = () => {
    // Random within what is on screen: a random saint that the reader's own
    // filters exclude would look like the filters had failed.
    const pool = state.shownCards.length ? state.shownCards : state.cards;
    if (!pool.length) return;
    const card = pool[Math.floor(Math.random() * pool.length)];
    state.router.navigate(`/saints/${card.slug}`);
  };
  random.addEventListener('click', onRandom);

  // Every card's markup and box change, so none of the rendered ones can be
  // kept: this is a re-render, not a reflow. Shared by the layout buttons and
  // the Detailed box, which change the same things.
  const rerenderAll = () => {
    for (const [slug, node] of state.rendered) {
      node.remove();
      state.rendered.delete(slug);
    }
    update({ animate: false });
  };

  /*
   * View is a chip of its own since 2026-08-26 evening, so the change arrives
   * as an `input` on a radio rather than a click on one of two buttons. It
   * has to run *before* `readFilters` would: both listen on the same element
   * for the same event, and a re-render that has not yet been told the layout
   * changed lays every card out in the old one.
   */
  const onLayout = (e) => {
    if (!e.target?.matches?.('input[name="layout"]')) return;
    const next = currentChoice(controlsEl, 'layout', state.layout);
    if (next === state.layout) return;
    state.layout = next;
    setChoice(controlsEl, 'layout', next);
    e.target.closest('details')?.removeAttribute('open');
    store.setSetting('indexLayout', state.layout);
    rerenderAll();
  };
  controlsEl.addEventListener('input', onLayout);

  const detailedBox = controlsEl.querySelector('[data-detailed]');
  const onDetailed = () => {
    state.detailed = detailedBox.checked;
    store.setSetting('indexDetailed', state.detailed);
    rerenderAll();
  };
  detailedBox.addEventListener('change', onDetailed);

  const clear = controlsEl.querySelector('[data-clear]');
  const onClear = () => {
    for (const input of controlsEl.querySelectorAll('input[type="checkbox"]:not([data-detailed])')) {
      input.checked = false;
    }
    controlsEl.querySelector('[data-query]').value = '';
    controlsEl.querySelector('[data-from]').value = '';
    controlsEl.querySelector('[data-to]').value = '';
    controlsEl.querySelector('input[name="rangeMode"][value="overlaps"]').checked = true;
    readFilters();
  };
  clear.addEventListener('click', onClear);

  state.cleanups.push(() => {
    controlsEl.removeEventListener('input', readFilters);
    controlsEl.removeEventListener('input', onChoice);
    controlsEl.removeEventListener('input', onLayout);
    detailedBox.removeEventListener('change', onDetailed);
    random.removeEventListener('click', onRandom);
    clear.removeEventListener('click', onClear);
  });
}

/* ---- the grid ------------------------------------------------------------ */

function wireGrid() {
  const { el } = state;
  const grid = el.querySelector('[data-grid]');
  let frame = null;

  const onScroll = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      paintWindow();
    });
  };
  // Column width changes with the window even when the column *count* does
  // not, and every card's box is computed from that width — so a resize is a
  // relayout, not a repaint. Coalesced to one per frame.
  let resizeFrame = null;
  const onResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = null;
      update({ animate: false });
    });
  };

  // The page scrolls, not a box inside it: an inner scroller would trap the
  // wheel and give the reader two scrollbars to think about.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  // The column can move without the window moving: Literata arriving inside
  // font-display: optional's window widens the 72ch column from 580 to 678 px
  // after the grid has counted its columns, and a cold load at 1280 was laying
  // two columns into a three-column width (Amendment 26). An observer on the
  // grid's own box catches that; its first callback reports the size already
  // laid out and is ignored by the comparison. The relayout runs *inside* the
  // callback, not behind a frame like the window path: resize observers are
  // delivered at the rendering update the change itself caused, which is the
  // moment meant for layout work — and a headless browser produces no further
  // frame on an idle page, so a relayout queued behind requestAnimationFrame
  // there waits for damage that may never come (the suite saw it six runs in
  // eight). Synchronous is deterministic in both.
  const observer =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
          if (state && grid.clientWidth !== state.laidOutWidth) update({ animate: false });
        })
      : null;
  observer?.observe(grid);

  // A card's shared-element name is set at the moment of the click and not
  // before: naming sixty visible cards would make the browser capture sixty
  // pairs to animate two of them.
  const onClick = (e) => {
    const link = e.target.closest('[data-prefetch]');
    if (!link) return;
    const card = link.closest('.index-card');
    if (state.named) for (const node of state.named) node.style.viewTransitionName = '';
    const image = card.querySelector('.index-media img');
    const name = card.querySelector('.index-name');
    const slug = link.dataset.prefetch;
    if (image) image.style.viewTransitionName = `s-${slug}-image`;
    if (name) name.style.viewTransitionName = `s-${slug}-name`;
    state.named = [image, name].filter(Boolean);
  };
  grid.addEventListener('click', onClick);

  // Cards enter and leave the DOM on every scroll frame, so hover prefetching
  // is delegated to the container rather than bound per card. The coarse
  // pointer case has no hover at all and is handled where cards are created:
  // entering the window *is* the signal there.
  const onHover = (e) => {
    const link = e.target.closest('[data-prefetch]');
    if (link) prefetch(link.dataset.prefetch);
  };
  if (state.finePointer) el.addEventListener('pointerover', onHover);

  // The bookmarks: one delegated listener for every card that will ever mount
  // here, and one subscription that repaints them all when the store changes.
  const unwireSave = wireSaveButtons(grid);

  state.cleanups.push(() => {
    if (frame) cancelAnimationFrame(frame);
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    observer?.disconnect();
    grid.removeEventListener('click', onClick);
    el.removeEventListener('pointerover', onHover);
    unwireSave();
  });
}

function update({ animate }) {
  const { el, cards, filters, search } = state;
  // The index holds the bare name and every name is drawn with "St" before it
  // (lib/honorific.js), so a reader who types back what the screen shows —
  // "St John" — must not be told there is no such saint. The honorific is
  // dropped from the query, not added to the index: terms combine with AND,
  // and a term no document carries would zero every search it appears in.
  const query = filters.query.trim().replace(/^(St\.?|Saint)\s+/i, '');
  const hits = query && search ? new Set(search.search(query).map((r) => r.id)) : null;

  // The reader's church comes first (author, 2026-08-22): a saint not in that
  // church's calendar is not on the grid, and what that sets aside is counted
  // and named under the count rather than silently dropped. The search and
  // the facets apply within what remains. No church chosen yet keeps all.
  // `chosenChurch`, not `currentChurch` (2026-08-26): a *guess* from the
  // browser's language must not set part of the corpus aside here. lib/church.js
  // argues the split; the Daily page is the one page that cannot open without a
  // calendar, and it is the one page that reads the guess.
  const church = chosenChurch();
  const mine = cards.filter((card) => keptBy(card, church));
  const asideNote = el.querySelector('[data-set-aside]');
  // "122/708 saints venerated in the Romanian calendar" (author, 2026-08-25).
  // It said how many were *not* kept, which left the reader subtracting to
  // learn the number they wanted; the ratio says both at once, and the
  // header's part is a title rather than a sentence repeated on every filter.
  asideNote.hidden = mine.length === cards.length;
  asideNote.textContent = fill(STRINGS.saints.kept, {
    shown: mine.length,
    total: cards.length,
    church: churchName(church),
  });
  asideNote.title = STRINGS.saints.keptTitle;

  const { matched, undated } = applyFilters(mine, filters, {
    monthsBySlug: state.monthsBySlug,
    matchesQuery: hits ? (slug) => hits.has(slug) : null,
  });

  state.shownCards = matched;
  el.querySelector('[data-clear]').hidden = !hasActiveFilters(filters);
  el.querySelector('[data-empty]').hidden = matched.length > 0;
  paintCount(matched.length, animate);
  paintTray(undated);

  const grid = el.querySelector('[data-grid]');
  const inner = el.querySelector('[data-grid-inner]');
  const rows = state.layout === 'rows';
  // What this layout was computed from, so the container observer below can
  // tell a real move from its own first, informational, callback.
  state.laidOutWidth = grid.clientWidth;
  const result = rows
    ? layout(matched, {
        width: grid.clientWidth,
        gap: ROW_GAP,
        columns: 1,
        textHeight: state.detailed ? DETAILED_ROW_HEIGHT : ROW_HEIGHT,
        // A row's thumbnail is a fixed box, so no row's height depends on its
        // image and every row is the same height. Still exact, still no
        // measurement — the constant is simply the whole answer here.
        aspectOf: () => null,
      })
    : layout(matched, {
        width: grid.clientWidth,
        gap: GAP,
        textHeight: state.detailed ? DETAILED_CARD_TEXT_HEIGHT : CARD_TEXT_HEIGHT,
        mediaInset: CARD_INSET,
        // The manifest keeps a card's pixel dimensions on its image, and a
        // saint may have no image at all.
        aspectOf: (card) => card.image?.aspect ?? null,
      });
  state.positions = result.positions;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keep = new Set(result.positions.map((p) => p.slug));
  const leaving = [...state.rendered.keys()].filter((slug) => !keep.has(slug));

  // Fading is the reason the removal is deferred: a filtered-out saint should
  // leave visibly. Reduced motion removes them now — disabled means removed,
  // never shortened. The fade is one flight in swap.js's registry, so a second
  // filter change lands the first batch rather than leaving two removals
  // racing, and each fading card is marked aside — a card on its way out must
  // not hold the tab order or a click (Amendment 17's corollary).
  if (animate && !reduced && leaving.length) {
    for (const slug of leaving) {
      const node = state.rendered.get(slug);
      node.classList.add('leaving');
      setAside(node);
    }
    beginSwap(inner, () => {
      for (const slug of leaving) {
        // Still fading, and not a card that a second filter change brought
        // back in the meantime — paintWindow restores those when it does.
        const node = state?.rendered.get(slug);
        if (!node?.classList.contains('leaving')) continue;
        node.remove();
        state.rendered.delete(slug);
      }
      if (state) paintWindow();
    }).settle(200);
  } else {
    for (const slug of leaving) {
      state.rendered.get(slug).remove();
      state.rendered.delete(slug);
    }
  }

  inner.style.height = `${result.height}px`;
  paintWindow();
}

function paintWindow() {
  if (!state) return;
  const inner = state.el.querySelector('[data-grid-inner]');
  const top = -inner.getBoundingClientRect().top;
  const visible = windowOf(state.positions, top, window.innerHeight);
  const wanted = new Set(visible.map((p) => p.slug));

  for (const [slug, node] of state.rendered) {
    if (!wanted.has(slug) && !node.classList.contains('leaving')) {
      node.remove();
      state.rendered.delete(slug);
    }
  }

  let mounted = false;
  for (const position of visible) {
    let node = state.rendered.get(position.slug);
    if (!node) {
      const rows = state.layout === 'rows';
      node = document.createElement('div');
      node.className = `index-card panel${rows ? ' is-row' : ''}${state.detailed ? ' is-detailed' : ''}`;
      node.innerHTML = card(position, state.router, { rows, detailed: state.detailed });
      inner.appendChild(node);
      state.rendered.set(position.slug, node);
      mounted = true;
      if (!state.finePointer) prefetch(position.slug);
      if (state.detailed) fillDescription(node, position);
    }
    if (node.classList.contains('leaving')) {
      // Brought back mid-fade by a second filter change: current again, so the
      // aside marks come off with the class.
      node.classList.remove('leaving');
      restore(node);
    }
    node.style.width = `${position.w}px`;
    node.style.height = `${position.h}px`;
    node.style.transform = `translate(${position.x}px, ${position.y}px)`;
  }
  // New cards arrive with their bookmark unpainted; one read of the store
  // paints every card in the window, not one per card.
  if (mounted) paintSaved(inner);
}

/**
 * A card and a row are the same three things — image, name with its glyph,
 * dates — in two arrangements, plus the bookmark. In cards the box comes from
 * the image's aspect ratio; in rows the thumbnail is square and the box is a
 * constant, so an imageless saint still gets an empty one and the column of
 * names stays a column. Detailed swaps the badge for the matrix and adds the
 * description box, held by skeleton bars until the life arrives.
 */
function card(item, router, { rows = false, detailed = false } = {}) {
  const image = item.image
    ? `<span class="index-media" style="background-image:url('${BASE + item.image.lqip}')${
        rows ? '' : `;aspect-ratio:${item.image.aspect}`
      }">
        <img src="${BASE + item.image.src}" alt="" width="${item.image.w}" height="${item.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '';

  const description = detailed
    ? `<span class="index-desc utility" data-desc>
        <span class="desc-skel" aria-hidden="true"><span class="skeleton"></span><span class="skeleton"></span></span>
      </span>`
    : '';

  // The link wraps the name only, and its ::after covers the whole card, so
  // the image is clickable without a second link that has no accessible name
  // of its own. The bookmark sits above that ::after, so pressing it saves
  // rather than opens. (The veneration glyph stood beside the name in this
  // line until 2026-08-22 — DESIGN.md §2.)
  const body = `<span class="name-line">
      <a class="index-name" href="${router.href(`/saints/${item.slug}`)}" data-prefetch="${esc(item.slug)}">${esc(saintName(item))}</a>
    </span>
    <span class="index-dates utility">${esc(formatLifespan(item.dates))}</span>
    ${description}`;
  const bookmark = renderBookmark(item.slug, item.display_name);

  return rows ? `${image}<span class="row-body">${body}</span>${bookmark}` : `${image}${body}${bookmark}`;
}

/**
 * The description is the opening paragraph of the saint's own life, fetched
 * through the same second layer the detail page uses (brief §7) and derived
 * once per saint. It is not in the manifest on purpose — Addendum H1 has the
 * budget arithmetic. A saint with no life, or a fetch that fails, shows what
 * the manifest does say: the types.
 */
async function fillDescription(node, item) {
  const box = node.querySelector('[data-desc]');
  if (!box) return;
  // The types, named rather than slugged (2026-08-25 evening). It used to
  // capitalise the joined run's first letter only, which made "Martyr,
  // hieromartyr" out of two words that are equally names.
  const fallback = () => typeNames(item.types);
  let text = ledes.get(item.slug);
  if (text === undefined) {
    try {
      const payload = await loadDetail(item.slug);
      text = firstParagraphText(payload.life) || fallback();
      ledes.set(item.slug, text);
    } catch {
      text = fallback();
    }
  }
  if (!box.isConnected) return;
  box.textContent = text;
}

/* ---- count and tray ------------------------------------------------------ */

/**
 * The count animates (brief §8.2) but is announced once: a live region ticking
 * through every intermediate number would be unusable, so the tween is
 * aria-hidden and the final figure is what a screen reader is told.
 */
function paintCount(next, animate) {
  const row = state.el.querySelector('[data-count-row]');
  if (!row.firstChild) {
    row.innerHTML = `<span data-count aria-hidden="true">0</span>
      <span aria-hidden="true">${STRINGS.saints.countLabel}</span>
      <span class="sr-only" aria-live="polite" data-count-live></span>`;
  }
  const value = row.querySelector('[data-count]');
  const liveRegion = row.querySelector('[data-count-live]');
  liveRegion.textContent = fill(STRINGS.saints.countAnnounce, { count: next });

  const from = state.shown ?? 0;
  state.shown = next;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!animate || reduced || from === next) {
    value.textContent = String(next);
    return;
  }

  const started = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - started) / 200);
    value.textContent = String(Math.round(from + (next - from) * t));
    if (t < 1 && state) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * The undated tray (Addendum F). A date range cannot include or exclude a
 * saint with no bound at either end, so they are set aside and counted rather
 * than silently dropped — an honest gap, styled as one.
 */
function paintTray(undated) {
  const tray = state.el.querySelector('[data-tray]');
  if (!undated.length) {
    tray.innerHTML = '';
    return;
  }
  tray.innerHTML = `<details class="tray">
    <summary>${fill(STRINGS.saints.undatedTray, { count: undated.length })}</summary>
    <p class="utility">${STRINGS.saints.undatedNote}</p>
    <ul class="register">
      ${undated
        .map(
          (c) => `<li><a class="reg-name" href="${state.router.href(`/saints/${c.slug}`)}"
            data-prefetch="${esc(c.slug)}">${esc(saintName(c))}</a></li>`,
        )
        .join('')}
    </ul>
  </details>`;
}
