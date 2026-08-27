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
import { saintName, withoutRank } from '../lib/honorific.js';
import { REGIONS_BY_ID } from '../lib/regions.js';
import { allNames, historicityName, typeName, typeNames } from '../lib/saint-types.js';
import { ensureAllPacks } from '../lib/i18n.js';
import { buildFeastIndex } from '../lib/feasts.js';
import { formatSubtext, parseIso } from '../lib/calendar-page.js';
import { escapeHtml as esc, firstParagraphText } from '../lib/markdown.js';
import { loadDetail, observePrefetch, prefetch } from '../lib/detail.js';
import { loopSafe, loopScroll, loopSlice, windowImages } from '../ui/loop-scroll.js';
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
import { rollDie } from '../ui/roll.js';
import { paintSaved, renderBookmark, wireSaveButtons } from '../ui/save.js';
import { chosenChurch, subscribeChurch } from '../lib/church.js';
import { STRINGS, fill } from '../ui/strings.js';
import { dateFormatter, formatDate, languageTag } from '../lib/i18n.js';
import { state, open as openState, close as closeState } from './index/state.js';
import { defaultChurches, matching, readerHasFiltered } from './index/filter.js';
import { paintGrid, paintWindow, wireGrid } from './index/grid.js';
import { wireSticky } from './index/sticky.js';
import { applyMode, paintCarousel, switchMode } from './index/modes.js';
import { paintCount, paintSummary, paintTray } from './index/count.js';

const BASE = import.meta.env.BASE_URL;

export const title = () => STRINGS.saints.title;

const LAYOUTS = ['cards', 'rows'];
const MODES = ['carousel', 'search'];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const monthLabel = (m) =>
  formatDate({ month: 'long', timeZone: 'UTC' }, new Date(Date.UTC(2001, m - 1, 1)));


/**
 * Where the reader was, kept across a trip into a saint's page (author,
 * 2026-08-22): the × on that page and the browser's own back both return here
 * and find the grid as it was left — filters, search, sort, which facets were
 * open, and the scroll position. Layout and Detailed are settings and come
 * back by themselves. Module-level, so it lives as long as the page does; the
 * nav link still opens the Index fresh, because it does not ask.
 */
let remembered = null;


export function destroy() {
  if (state) remembered = snapshot(state);
  state?.cleanups.forEach((fn) => fn?.());
  closeState();
}

export function render(el, { data, router, nav }) {
  destroy();

  const cards = data.saints;
  const settings = store.getSettings();
  openState({
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
    // The page opens on the carousel (author, 2026-08-27), and remembers a
    // reader who has moved off it — the same bargain Layout and Detailed make.
    mode: MODES.includes(settings.indexMode) ? settings.indexMode : 'carousel',
    detailed: settings.indexDetailed === true,
    loop: null,
    finePointer: window.matchMedia('(pointer: fine)').matches,
    named: null,
    cleanups: [],
  });

  /*
   * The heading carries the mode toggle beside it (author, 2026-08-27: "a
   * button toggle to the right of 'All Saints'"). The button names where it
   * goes, not where it is, so its own label is the answer to "what happens if
   * I press this".
   */
  el.innerHTML = `
    <div class="index-head">
      <h1>${STRINGS.saints.title}</h1>
      <button type="button" class="mode-toggle utility" data-mode-toggle
        ><span class="mode-label" data-mode-label></span></button>
    </div>
    ${controls(state)}
    <p class="result-count sr-only" data-count-row></p>
    <p class="set-aside utility" data-set-aside></p>
    <div class="carousel" data-carousel hidden>
      <div class="carousel-track" data-carousel-track
        tabindex="0" role="region" aria-label="${esc(STRINGS.saints.carouselLabel)}"></div>
    </div>
    <div class="grid" data-grid><div class="grid-inner" data-grid-inner></div></div>
    <div data-tray></div>
    <p class="index-empty" data-empty hidden>${STRINGS.saints.noneMatch}</p>`;

  /*
   * **The Calendar facet opens on the calendar the header keeps** (author,
   * 2026-08-27: "have it default to whatever the site calendar settings are,
   * ticking that box. If you tick others, but then you change the calendar
   * again, the filters reset to just the site calendar").
   *
   * This makes the facet the Index's *only* church narrowing, where the page
   * used to narrow to the reader's church before the filters ran and then
   * offer the facet on top of what was left. That arrangement could not do
   * what the author asks: ticking a second calendar inside a set already cut
   * to the first gives the *intersection*, so "tick others" would have shown
   * fewer saints rather than more. The predicate is unchanged — `keptBy` and
   * the facet's own test are the same line of code — so the opening set is
   * exactly what it was.
   */
  // The label starts filled rather than faded in: there is no previous word to
  // cross over from on the page's first paint.
  el.querySelector('[data-mode-label]').textContent =
    state.mode === 'carousel' ? STRINGS.saints.modeToSearch : STRINGS.saints.modeToCarousel;
  syncCalendarFacet();
  wireControls();
  wireSticky();
  wireGrid({ onChange: update });
  // The header's control can change the church while the grid is open, and
  // when it does the facet goes back to just the new one.
  state.cleanups.push(
    subscribeChurch(() => {
      if (!state) return;
      syncCalendarFacet();
      update({ animate: true });
    }),
  );

  // Back where the reader was, if that is what this navigation is — the saint
  // page's × says so, and so does a history traversal. The grid's height has
  // to exist before the scroll can, which is why the restore straddles update.
  const restoring = (nav?.restore || nav?.pop) && remembered ? remembered : null;
  if (restoring) applySnapshot(restoring);
  update({ animate: false });
  applyMode();
  if (restoring) {
    window.scrollTo(0, restoring.scrollY);
    paintWindow();
  }
  loadSearch(cards);
}


/** Ticks the header's calendar in the facet and unticks every other. */
function syncCalendarFacet() {
  const want = new Set(defaultChurches());
  for (const input of state.el.querySelectorAll('input[name="churches"]')) {
    input.checked = want.has(input.value);
  }
  state.filters = { ...state.filters, churches: [...want] };
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
  el.querySelector('[data-clear]').hidden = !readerHasFiltered(f);
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

  /*
   * The search field and the filters under it are one sticky block (author,
   * 2026-08-27: "Have the search bar become a sticky header when you scroll
   * down... When you click on that search bar, make the filters drop down from
   * that sticky header"). The sentinel above it is how the page knows the
   * block has *become* stuck — an IntersectionObserver on a zero-height marker,
   * which costs nothing and is honest at every width, where a scroll threshold
   * would be a number that goes stale.
   */
  return `<div class="sticky-sentinel" data-sticky-sentinel aria-hidden="true"></div>
    <div class="index-controls" data-index-sticky>
    <div class="index-row">
      <input class="search-field" type="search" data-query
        aria-label="${STRINGS.saints.search}"
        placeholder="${STRINGS.saints.search}: ${STRINGS.saints.searchHint}" />
      <button type="button" data-clear hidden>${STRINGS.saints.clear}</button>
    </div>

    <div class="filter-drop" data-filter-drop><div class="filter-drop-inner">

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

    </div></div>
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
    // The saint is drawn before the die turns, not after: the roll is how the
    // answer is shown, not how it is decided.
    rollDie(random, () => state.router.navigate(`/saints/${card.slug}`));
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
    // Clear returns the page to where it opens, which since 2026-08-27
    // includes the header's calendar ticked in the Calendar facet.
    syncCalendarFacet();
    readFilters();
  };
  clear.addEventListener('click', onClear);

  const toggle = state.el.querySelector('[data-mode-toggle]');
  const onToggle = () => switchMode(state.mode === 'carousel' ? 'search' : 'carousel');
  toggle.addEventListener('click', onToggle);

  state.cleanups.push(() => {
    controlsEl.removeEventListener('input', readFilters);
    controlsEl.removeEventListener('input', onChoice);
    controlsEl.removeEventListener('input', onLayout);
    detailedBox.removeEventListener('change', onDetailed);
    random.removeEventListener('click', onRandom);
    clear.removeEventListener('click', onClear);
    toggle.removeEventListener('click', onToggle);
    state.loop?.destroy();
    state.carouselPrefetch?.();
    state.carouselWindow?.();
  });
}

/* ---- the grid ------------------------------------------------------------ */

/**
 * One pass over the page: what matches, what that says, and where it goes.
 *
 * This was 121 lines and two responsibilities joined by a single value. The
 * data crosses one way — `matching()` works out `matched`, and everything
 * after reports or places it. `animate` is an input to *both* halves rather
 * than a product of the first, which is worth saying so nobody re-derives it
 * and thinks they have found a second thread between them.
 *
 * `matching()` is pure and returns its answer; the assignment to
 * `state.shownCards` is here, in the composition, because a function that both
 * returns a value and writes it to shared state is testable in name only.
 */
function update({ animate }) {
  const found = matching(state);
  state.shownCards = found.matched;
  paintSummary(found, { animate });
  paintGrid(found.matched, { animate });
  // The carousel draws from the same filtered set, so it follows a search or a
  // filter change like the grid does. It is a no-op when the pool has not moved.
  if (state.mode === 'carousel') paintCarousel();
}
