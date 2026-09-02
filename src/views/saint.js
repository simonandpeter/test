/**
 * The saint's own page (brief §7, §8.1). Two loading layers meet here: the
 * manifest already holds the name, the image box, the dates and the badge, so
 * the page paints complete-looking from data the reader has had since load,
 * and the fetch fills in only what is genuinely per-saint — the name forms in
 * their own scripts, the life, the citations, the image credit.
 *
 * That is also why nothing here is a spinner. The skeleton is the real layout
 * at the real dimensions, and the parts that arrive later arrive into boxes
 * already the right size.
 *
 * Veneration is shown church by church, with each church's own titles, its
 * feast in its own reckoning, and the source it rests on — including the
 * churches we have not sourced, which say so. The rite × communion matrix
 * (§9.2) is a Phase 3 view and is deliberately not this: this page lists
 * churches, that one crosses them with rites.
 */

import { CHURCHES } from '../data/churches.js';
import { typeNames } from '../lib/saint-types.js';
import { chooseChurch, chosenChurch, churchName, currentChurch, subscribeChurch } from '../lib/church.js';
import { formatFeast } from '../data/calendars.js';
import { feastOccurrences } from '../lib/feasts.js';
import { formatLifespan } from '../lib/calendar-page.js';
import { saintName, typesBeside } from '../lib/honorific.js';
import { escapeHtml as esc, renderMarkdown, stripLeadingHeading } from '../lib/markdown.js';
import { loadDetail, loadSource, observePrefetch } from '../lib/detail.js';
import { linkSaintNames } from '../lib/cross-link.js';
import { SETTLE, onGrainDrag } from '../ui/grain-drag.js';
import { reducedMotion } from './daily/motion.js';
import { isPlaceholderSource, licenceIsSettled, requiresAttribution } from '../lib/licence.js';
import * as store from '../lib/store.js';
import { renderBookmark, wireSaveButtons } from '../ui/save.js';
import { saintHymnsSection } from '../ui/hymns.js';
import { renderDateFacts, fillPlaces } from '../ui/datefacts.js';
import { STRINGS, fill } from '../ui/strings.js';
import { currentLanguage, formatDate } from '../lib/i18n.js';
/* The Index's own row, and the Index's own memory of what it had matched —
   both borrowed rather than copied, because the column beside the life is
   meant to be that list rather than to resemble it (see `sideColumn`). */
import { card as indexCard } from './index/grid.js';
import { lastSearch } from './index/place.js';
import { facetGroups } from './index/controls.js';
import { monthsBySlugFor } from './index/search.js';
import { EMPTY_FILTERS, applyFilters, facetsOf } from '../lib/index-filters.js';

const BASE = import.meta.env.BASE_URL;

export const title = () => STRINGS.saints.title;

/** The manifest already knows the name, so the tab title never waits. */
export const titleFor = (params, data) => {
  const card = data.bySlug.get(params.slug);
  return card ? saintName(card) : STRINGS.saint.notFoundTitle;
};

const gregorianFmt = (d) => formatDate({ day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }, d);

/** How often a scroll position is written while reading. */
const READING_INTERVAL = 1500;

/**
 * One render at a time. A payload that arrives after the reader has moved on
 * must not paint into the page they moved to, and comparing element identity
 * would not catch it: every view renders into the same #view element.
 */
let live = null;
let generation = 0;

export function destroy() {
  live?.teardown();
  live = null;
}

/* The × that closes the page. Ink on nothing, like the bookmark beside it. */
const CLOSE =
  '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">' +
  '<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" fill="none"/></svg>';

export function render(el, { data, params, router, cameFrom }) {
  destroy();
  const mine = ++generation;

  const slug = params.slug;
  const card = data.bySlug.get(slug);

  if (!card) {
    el.innerHTML = `<h1>${STRINGS.saint.notFoundTitle}</h1>
      <div class="error-note"><p>${STRINGS.saint.notFound}</p>
      <p><a href="${router.href('/saints')}">${STRINGS.saints.title}</a></p></div>`;
    return;
  }

  // Opened from the calendar or the map: the × goes back there rather than to
  // All Saints (author, 2026-08-23 for the calendar, 2026-08-30 for the map).
  const backTo = cameFrom?.nav === 'calendar' || cameFrom?.nav === 'map' ? cameFrom.path : null;
  const backLabel =
    cameFrom?.nav === 'calendar' ? STRINGS.saint.backDaily : cameFrom?.nav === 'map' ? STRINGS.saint.backMap : STRINGS.saint.back;

  el.innerHTML = `<div class="saint-cols">
      <div class="saint-col-main">${shell(card, backLabel)}</div>
      ${sideColumn(data, router, slug)}
    </div>`;
  const cleanups = [
    wireSaveButtons(el),
    // Before `wireReading`, which asks which element ends up scrolling.
    wireColumns(el),
    wireReading(el, slug),
    observePrefetch(el),
    wireBack(el, router, backTo),
    wireSide(el, { data, router, current: slug }),
    wireSaintSwipe(el, { data, router, current: slug }),
  ];
  // Whether the churches the reader is not reading are shown on this page.
  // Per render, so it resets on the next saint opened (author, 2026-08-22).
  live = { cleanups, revealed: false, payload: null, teardown: () => cleanups.forEach((fn) => fn?.()) };
  cleanups.push(
    subscribeChurch(() => {
      if (mine === generation && live?.payload) paintVeneration(el, live.payload.saint, router);
    }),
  );

  store.visit(slug);

  loadDetail(slug).then(
    (payload) => {
      if (mine === generation) fillIn(el, payload, { data, router });
    },
    (error) => {
      if (mine !== generation) return;
      const body = el.querySelector('[data-detail]');
      /*
       * Offline is not a hiccup (brief §12): an uncached saint gets the plain
       * truth - the network is away and this one was never stored - rather
       * than a retry button pointed at no network.
       *
       * Read off the failure, not only off `navigator.onLine`: the flag stays
       * true under DevTools' and Playwright's request-level offline (found
       * writing the test), and a reader on broken wifi is offline in every way
       * that matters with the flag still up. A fetch that died without a
       * status - `TypeError: Failed to fetch`, or the worker's `HTTP 0` for a
       * total cache miss - is the network being away; a real 404 or 500 keeps
       * the hiccup wording, because there the network answered.
       */
      const away =
        navigator.onLine === false || error?.name === 'TypeError' || /HTTP 0/.test(String(error ?? ''));
      const note = away ? STRINGS.saint.offline : STRINGS.saint.failed;
      body.innerHTML = `<div class="error-note"><p>${note}</p>
        <button type="button" data-retry>${STRINGS.saint.retry}</button></div>`;
      body.querySelector('[data-retry]').addEventListener('click', () => render(el, { data, params, router, cameFrom }));
    },
  );
}

/* ---- the manifest-only shell ------------------------------------------- */

function shell(card, backLabel) {
  /*
   * The picture, and *not* its licence (author, 2026-08-26: "'Public domain' as
   * the image caption is metadata that belongs at the bottom"). A caption under
   * an icon is a place a reader expects to be told what they are looking at,
   * and "Public Domain Mark 1.0" answers a question nobody standing in front of
   * an icon is asking. The line itself is unchanged and still says everything
   * lib/licence.js requires — including, where a licence is unsettled, the
   * whole paragraph saying so — it now stands at the foot of the page with the
   * sources, which is where the rest of the page's apparatus lives.
   */
  const media = card.image
    ? `<figure class="saint-media" style="aspect-ratio:${card.image.aspect};background-image:url('${BASE + card.image.lqip}')">
        <img src="${BASE + card.image.src}" alt="" width="${card.image.w}" height="${card.image.h}"
          style="view-transition-name:s-${esc(card.slug)}-image" decoding="async" />
      </figure>`
    : '';

  /*
   * The info line: what a saint *was*. Rank from `types`, then the offices
   * and epithets the calendars themselves give — "Hierarch, Archbishop of
   * Constantinople", "Venerable, the Great" — which until 2026-08-25 were
   * printed only inside the veneration register, one church at a time, so a
   * reader glancing at the head of the page never met them (author: "this
   * sort of stuff should be listed in the small info session for each
   * saint").
   *
   * Deduplicated across the churches, against `types`, and against `office`
   * where one is recorded — a title that only repeats the office in different
   * words ("Archbishop of Constantinople" from a church's own titles, beside
   * an `office` field reading the same) would otherwise print twice on the
   * same line. Only 20 attestations in the corpus carry titles at all, so for
   * most saints this line is exactly what it was.
   */
  const seen = new Set((card.types ?? []).map((t) => t.toLowerCase()));
  if (card.office) seen.add(String(card.office).toLowerCase());
  const titles = [];
  for (const att of card.attestations ?? []) {
    for (const title of att.titles ?? []) {
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
    }
  }
  /*
   * Rank, then offices, and *not* the sex (author, 2026-08-26: "'Male' in the
   * subtitle reads oddly for a devotional page (keep it as a filter, drop it
   * from the heading line)"). It is still in the data, still a facet on the
   * Index, and still what `saints.sexLabel` names there — it is only no longer
   * announced under a saint's name, where it read as a database field that had
   * wandered onto a page about a person.
   */
  const beside = typesBeside(card);
  const facts = [
    // The office first, where one is recorded: it is the most particular
    // thing this line knows, and since 2026-08-27 it is no longer in the
    // name. The types follow with the rank taken out of them, the rank being
    // the first word of the heading above.
    card.office ?? null,
    beside.length ? typeNames(beside) : null,
    titles.length ? titles.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // The name and its two controls (DESIGN.md §5c). The mark that stood at the
  // line's margin went with the glyph (2026-08-22, §2).
  return `<article class="saint">
    <header class="saint-head">
      <div class="name-line">
        <h1 class="saint-name" style="view-transition-name:s-${esc(card.slug)}-name">${esc(saintName(card))}</h1>
        <span class="saint-tools">
          ${renderBookmark(card.slug, card.display_name)}
          <button type="button" class="close-button icon-button" data-back aria-label="${esc(backLabel)}">${CLOSE}</button>
        </span>
      </div>
      <p class="saint-facts utility">${esc(formatLifespan(card.dates))}${facts ? ` · ${esc(facts)}` : ''}</p>
      <p class="resume-note utility" data-resume hidden></p>
    </header>

    <!--
      **Two columns on a desktop since 2026-09-02** (author: "split the left
      column into 2x columns, left column for the image and
      birth/death/office/veneration information, and new centre column for the
      main body text").

      The apparatus goes left with the picture — the dates and places register,
      the historicity line, and the veneration table, which was under the life
      from 2026-08-27 and is beside it now. The life keeps the centre to
      itself. Below the breakpoint both boxes are display:contents and the page
      is the single column it has always been, in the same reading order:
      picture, register, life, then the rest.

      The aside is a box rather than a class on each part, because the
      veneration table arrives with the payload long after the register does,
      and a box that exists from the first paint is what stops it landing in
      the other column when it comes.
    -->
    <div class="saint-body">
    <div class="saint-aside" data-aside>
      <div class="saint-intro${media ? ' has-media' : ''}">
        ${media ? `<div class="saint-media-col">${media}</div>` : ''}
        <div class="saint-intro-facts">
          ${renderDateFacts(card.dates, card.locations)}
          ${card.historicity ? `<p class="historicity utility">${esc(STRINGS.saint.historicity[card.historicity] ?? card.historicity)}</p>` : ''}
        </div>
      </div>
    </div>

    <!-- The life first, the apparatus beside or under it (author, 2026-08-27
         for the order, 2026-09-02 for the column). The page is about a person:
         the prose that says who they were is what a reader came for, and the
         church-by-church register is the apparatus behind it. -->
    <div class="saint-main" data-detail>
      <h2 class="register-heading">${STRINGS.saint.life}</h2>
      <div class="life" data-life>${skeletonLines(6)}</div>
      <!--
        Everything below the life waits for the payload rather than standing
        in the flow while it is fetched, and this is the shape of brief §13's
        "no layout shift when data arrives" on this page.

        A skeleton can only hold a box open honestly when its final size is
        knowable, and the life's is not: six skeleton lines stood in for a life
        that runs anywhere from two lines to sixty. On Christopher it measured
        six and arrived at sixty-one, so the Veneration heading was painted at
        y=528 — a third of the way down a 780 px phone — and landed at y=1307.
        779 px, on the one criterion the brief spells out, and nothing measured
        it until e2e/quality-floor.spec.js grew a CLS assertion on 2026-08-28.

        Nothing here can be sized ahead of the fetch either: the sources are a
        list of the documents the life was written from, and the veneration
        register is four rows or one depending on the churches that attest.
        Their skeletons were furniture in the §5b sense — they held a shape
        that was not the shape that arrived.

        So the rule is *append below*, not *reserve above*: the life grows or
        shrinks into a box with nothing under it, and this block arrives
        underneath whatever height it settled at. An insertion below the last
        laid-out element moves nothing, whichever way the life went.

        Sources stay under the life — they are text.sources, and they followed
        it before this too. The error path replaces [data-detail] wholesale,
        so a payload that never comes discards this rather than stranding it.
      -->
      <div data-late hidden>
        <div data-sources></div>
        <div data-hymns-box></div>
        <div data-related></div>
        <p class="image-credit utility" data-credit></p>
      </div>
    </div>
    <!--
      Veneration, rendered here — after the life, where it has been since
      2026-08-27 and where a phone reads it — and **moved into the aside above
      by wireColumns when the window is wide**.

      It is moved rather than placed by CSS, and that is the second attempt.
      The first put it in the grid's own second row and let the life span
      both, which reads correctly and lays out badly: a spanning item hands
      its height to the rows it crosses, so a long life pushed veneration
      hundreds of pixels down its own column to line up with nothing (author,
      2026-09-02: "the left column Veneration on Righteous Elizabeth ... is
      very far down, looks like it might be because its trying to line up with
      the hymns in the right column"). Independently scrolling columns need it
      inside the box that scrolls in any case, and a box is a box in the DOM.

      Which leaves one node in two possible parents, so the document order is
      the reading order at both widths and nothing is ordered around by CSS —
      a screen reader hears the life before the veneration on a phone, and the
      apparatus as one column beside it on a desktop.
    -->
    <div class="saint-veneration" data-veneration-box hidden>
      <h2 class="register-heading">${STRINGS.saint.veneration}</h2>
      <div data-veneration></div>
    </div>
    </div>
  </article>`;
}

/* ---- the column beside the life (2026-09-01) ---------------------------- */

/**
 * Whether the column is folded away, for the rest of this visit.
 *
 * Module scope rather than the settings store, and the line is where the
 * author drew it: the register's Cards/List choice was asked to be remembered
 * ("site remembers what you left it as") and this one was not — it is a
 * minimise, which is a thing you do to the page in front of you. So it holds
 * across the saints opened in one visit, which is the span over which folding
 * it once and having it come back on the next name would be the annoyance, and
 * a reload opens it again.
 */
let sideFolded = false;

/**
 * How far down the search column the reader had scrolled, kept across the
 * saints opened in one visit (author, 2026-09-02).
 *
 * Module scope for the same reason `sideFolded` is: the page is rebuilt per
 * saint, so anything the reader did *to the column* rather than to a saint has
 * to live outside the render. A reload starts at the top again, which is where
 * a fresh visit's list starts anyway.
 *
 * Reset when the set itself changes — a position measured against 862 rows
 * means nothing against the eleven a filter left.
 */
let sideAt = 0;

/**
 * The saints the reader had in front of them when they opened this one.
 *
 * `lastSearch()` is the Index's own snapshot (views/index/place.js) and holds
 * the slugs it had matched, in the order it had them — so this column is not a
 * second search that happens to agree with the first, it is the first one's
 * result. A reader who arrived by another road — a deep link, the map, the
 * Daily page — has no snapshot, and gets the corpus in its own order rather
 * than an empty column claiming they searched for nothing.
 */
function searchResults(data) {
  const snap = lastSearch();
  const slugs = snap?.shown;
  if (!slugs?.length) return data.saints;
  const cards = slugs.map((slug) => data.bySlug.get(slug)).filter(Boolean);
  return cards.length ? cards : data.saints;
}

/**
 * The right column: what the reader searched, as rows, with the saint they are
 * reading marked in it.
 *
 * Author, 2026-09-01: "for where the right column would be on Daily Page,
 * provide a row view scroll of the advanced search results in All Saints where
 * you just came from ... Add an option to minimise the search at the very top
 * of this right column."
 *
 * **The rows are the Index's own**, from `card(item, router, { rows: true })`,
 * rather than a shape that resembles them: the instruction says "the row view",
 * and a copy would drift from it the first time either changed. The wrapper is
 * a list item here instead of the virtualiser's absolutely positioned div, and
 * saint.css puts it back into flow — that is the whole of the difference.
 *
 * Not virtualised, and that is a decision rather than an omission. The Index's
 * grid is virtualised because it lays 862 cards against a scroll position that
 * moves; this list is built once when the page opens and scrolls inside its own
 * box. 862 list items is a few hundred kilobytes of DOM built once, against the
 * complexity of a second virtualiser wired to a different scroll container.
 */
function sideColumn(data, router, current) {
  const results = searchResults(data);
  return `<aside class="saint-side${sideFolded ? ' is-folded' : ''}" data-saint-side
      aria-label="${esc(STRINGS.saint.fromSearch)}">
    <div class="side-head">
      <h2 class="register-heading">${esc(STRINGS.saint.fromSearch)}</h2>
      <button type="button" class="side-fold" data-side-fold aria-expanded="${!sideFolded}">${
        esc(sideFolded ? STRINGS.saint.expand : STRINGS.saint.minimise)
      }</button>
    </div>
    <div class="side-body" data-side-body${sideFolded ? ' hidden' : ''}>
      <input class="search-field" type="search" data-side-query
        aria-label="${esc(STRINGS.saint.sideSearch)}"
        placeholder="${esc(STRINGS.saint.sideSearch)}" />
      <!--
        The Index's own facet chips (author, 2026-09-02: "make sure the filters
        are visible in the search column on the right"). They arrive ticked as
        the reader left them on All Saints, so the column shows the search
        rather than merely its result — and they narrow the list here, over the
        whole corpus, through the same applyFilters the Index runs.
      -->
      <div class="facets side-facets" data-side-facets>${facetGroups(
        facetsOf(data.saints),
        { ...EMPTY_FILTERS, ...(lastSearch()?.filters ?? {}) },
      )}</div>
      <p class="side-count utility" data-side-count>${esc(countLine(results.length))}</p>
      <!-- Filled by wireSide, a chunk at a time: the count above is the whole
           set, the list below is as much of it as has been scrolled to. -->
      <ul class="side-results" data-side-results></ul>
    </div>
  </aside>`;
}

const countLine = (n) =>
  n === 1 ? STRINGS.saint.sideCountOne : fill(STRINGS.saint.sideCount, { n: String(n) });

/**
 * Whether a saint answers to what was typed.
 *
 * The name as the row prints it, and every form the manifest records — so a
 * reader shown "Venerable Moses the Hungarian" can type either that or
 * «Моисей», exactly as the Index's own field allows. The office and the types
 * are deliberately not searched here: this is a sieve over a list the reader
 * can see, and matching on a word that is not on the row would look like a bug.
 */
function matches(item, needle) {
  if (saintName(item).toLowerCase().includes(needle)) return true;
  return Object.values(item.names ?? {}).some((n) => String(n).toLowerCase().includes(needle));
}

function sideRow(item, router, current) {
  return `<li class="index-card panel is-row${item.slug === current ? ' is-here' : ''}"
      data-slug="${esc(item.slug)}"${item.slug === current ? ' aria-current="page"' : ''}
      >${indexCard(item, router, { rows: true })}</li>`;
}

/**
 * How many rows are put in the document at a time.
 *
 * **The list is paged rather than rendered whole** (2026-09-01). It was all 862
 * at once, which the page itself carried without complaint — `content-visibility`
 * keeps the ones outside the scroller from being laid out — but the DOM is still
 * 862 subtrees, and everything that *walks* the document pays for them: the
 * accessibility audit on this page went from three seconds to twenty-three, near
 * enough its own timeout to start failing under a loaded machine.
 *
 * Sixty is about three screens of rows, so the next chunk is fetched long before
 * the reader can reach the end of the one they are in, and the count above the
 * list is the whole set either way — nothing here is hidden from the reader, it
 * is only late.
 */
const SIDE_CHUNK = 60;

/**
 * The column's two controls: the fold, and the field that narrows the list.
 *
 * **The field narrows what is already there; it does not search the corpus
 * again.** The heading says "Your search", and a field that could add saints
 * the reader had filtered out would make that heading false. It is a plain
 * substring match over the names the row prints and the forms the manifest
 * records, which is the honest description of a filter over a list — and
 * deliberately not the Index's own MiniSearch, whose prefix and fuzzy matching
 * belong to a search over the corpus rather than to a sieve over a dozen rows.
 *
 * **It filters the set, not the rendered rows**, which is what the paging above
 * makes necessary: hiding list items would have searched only as far as the
 * reader had scrolled, and a search that answers differently depending on where
 * you were is worse than no search.
 */
function wireSide(el, { data, router, current }) {
  const side = el.querySelector('[data-saint-side]');
  if (!side) return null;
  const body = side.querySelector('[data-side-body]');
  const fold = side.querySelector('[data-side-fold]');
  const query = side.querySelector('[data-side-query]');
  const list = side.querySelector('[data-side-results]');
  const count = side.querySelector('[data-side-count]');

  const facetBox = side.querySelector('[data-side-facets]');

  /*
   * **The facets filter the corpus; the field sieves what they leave.**
   *
   * The heading says "Your search", and until the reader touches a chip the
   * list is exactly the set they arrived with — `searchResults` above, the
   * Index's own snapshot in the Index's own order. The moment a chip changes,
   * the honest answer is no longer "what you searched" but "what these filters
   * hold", so the set is recomputed over the whole corpus with `applyFilters`,
   * the same function the Index runs, rather than being narrowed down from a
   * snapshot the reader can no longer widen.
   */
  const monthsBySlug = monthsBySlugFor(data.saints);
  const readFacets = () => {
    const values = (name) =>
      [...side.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);
    /*
     * The snapshot's own filters underneath, so the sort and its seed come
     * across with the chips: `EMPTY_FILTERS` alone would sort at random from
     * an empty seed, and the column would deal a fresh hand every time a box
     * was ticked — the list jumping about under a reader who was narrowing it.
     */
    return {
      ...EMPTY_FILTERS,
      ...(lastSearch()?.filters ?? {}),
      churches: values('churches'),
      months: values('months'),
      types: values('types'),
      sexes: values('sexes'),
      regions: values('regions'),
      historicities: values('historicities'),
    };
  };

  const all = searchResults(data);
  let shown = all;
  let drawn = 0;
  let filtered = null;

  const draw = (upTo) => {
    if (drawn >= shown.length) return;
    const next = Math.min(shown.length, upTo);
    const html = shown.slice(drawn, next).map((item) => sideRow(item, router, current)).join('');
    list.insertAdjacentHTML('beforeend', html);
    drawn = next;
  };

  const restart = () => {
    list.innerHTML = '';
    drawn = 0;
    draw(SIDE_CHUNK);
    count.textContent = shown.length ? countLine(shown.length) : STRINGS.saint.sideNone;
  };
  restart();

  /*
   * **And it opens where the reader left it** (author, 2026-09-02: "when
   * changing saint profile the location of how far your scrolled down the
   * right side search column doesn't go back to the top but stays exactly as
   * it was").
   *
   * The whole page is re-rendered per saint, so the list is a new element
   * with a new scrollTop of 0 — the position has to be carried in module
   * scope, beside `sideFolded`, and for the same reason: it is a fact about
   * the reading, not about the saint.
   *
   * The list is paged, so restoring is two steps: draw until there is
   * something to scroll *to*, then scroll. Without the first, `scrollTop` is
   * clamped to a box holding sixty rows and the reader lands wherever that
   * happens to end. Bounded by the set's own length, so a remembered position
   * from a wider search cannot spin here.
   */
  /*
   * **After a frame, because a box that has not been laid out reports 0 and
   * ignores writes** (CLAUDE.md trap 7). `wireSide` runs inside `render`,
   * straight after the innerHTML that made this element — `clientHeight` is 0
   * there, every `scrollTop` written is clamped to 0, and the first version of
   * this restored nothing at all while looking exactly like a restore.
   */
  let restoring = null;
  const restoreScroll = (tries = 0) => {
    restoring = requestAnimationFrame(() => {
      restoring = null;
      if (sideAt <= 0 || !list.isConnected) return;
      /*
       * **And it waits for a box.** One frame is not enough: the router paints
       * a view inside a view transition's update callback, where the
       * document's rendering is suppressed and a freshly written element
       * measures 0 by 0 — the same trap `settleHome` documents in the map.
       * A `scrollTop` written there is clamped to 0 against a zero-height box,
       * which is a restore that runs, reports nothing and does nothing.
       */
      if (list.clientHeight === 0) {
        if (tries < 30) restoreScroll(tries + 1);
        return;
      }
      for (let guard = 0; guard < 40 && drawn < shown.length && list.scrollHeight < sideAt + list.clientHeight; guard++) {
        draw(drawn + SIDE_CHUNK);
      }
      list.scrollTop = sideAt;
    });
  };
  restoreScroll();

  // Two chunks ahead of the foot, so the next arrives before it is reached.
  const onScroll = () => {
    sideAt = list.scrollTop;
    if (list.scrollTop + list.clientHeight > list.scrollHeight - 600) draw(drawn + SIDE_CHUNK);
  };
  list.addEventListener('scroll', onScroll, { passive: true });

  const onFold = () => {
    sideFolded = !sideFolded;
    side.classList.toggle('is-folded', sideFolded);
    body.hidden = sideFolded;
    fold.setAttribute('aria-expanded', String(!sideFolded));
    fold.textContent = sideFolded ? STRINGS.saint.expand : STRINGS.saint.minimise;
  };
  fold.addEventListener('click', onFold);

  const repaint = () => {
    const pool = filtered ?? all;
    const needle = query.value.trim().toLowerCase();
    shown = needle ? pool.filter((item) => matches(item, needle)) : pool;
    // A new set is a new list, and a position measured against the old one
    // would land the reader somewhere they never were.
    sideAt = 0;
    restart();
  };

  const onQuery = () => repaint();
  query.addEventListener('input', onQuery);

  const onFacet = () => {
    // `applyFilters` hands back the matched set and, when a date range is in
    // play, the undated it sets aside from it. The Index has a tray to put
    // those in and this column does not, so they follow the matched rather
    // than vanishing from a list that never said it had dropped them.
    const { matched, undated } = applyFilters(data.saints, readFacets(), { monthsBySlug });
    filtered = undated.length ? [...matched, ...undated] : matched;
    repaint();
  };
  facetBox?.addEventListener('change', onFacet);

  return () => {
    if (restoring !== null) cancelAnimationFrame(restoring);
    fold.removeEventListener('click', onFold);
    query.removeEventListener('input', onQuery);
    facetBox?.removeEventListener('change', onFacet);
    list.removeEventListener('scroll', onScroll);
  };
}

/**
 * The width at which the page becomes three columns. One place, because the
 * stylesheet and `wireColumns` have to agree about it exactly: a veneration
 * table moved into a column the CSS has not made yet would be a box inside a
 * box that is not laid out.
 */
const WIDE = '(min-width: 1024px)';

/**
 * Which parent the veneration table hangs from (author, 2026-09-02).
 *
 * Wide, it belongs to the apparatus column — that is the instruction of the
 * round before this one, and it is also what lets that column scroll as one
 * thing rather than as two boxes that happen to be stacked. Narrow, it belongs
 * after the life, which is where the 2026-08-27 instruction put it.
 *
 * A node with two possible parents rather than an `order` that disagrees with
 * the document: `order` would have been fewer lines and would have left a
 * screen reader hearing the register before the life on a phone, which is the
 * thing the 2026-08-27 instruction was about.
 *
 * The listener is on the media query rather than on `resize`, so it fires
 * twice a session at most — and the placement is idempotent, so the render's
 * own first call costs nothing when it is already right.
 */
function wireColumns(el) {
  const aside = el.querySelector('[data-aside]');
  const body = el.querySelector('.saint-body');
  const main = el.querySelector('.saint-main');
  const veneration = el.querySelector('[data-veneration-box]');
  if (!aside || !body || !veneration) return null;
  const mq = window.matchMedia(WIDE);

  /*
   * **A column that scrolls has to be reachable by keyboard** (axe's
   * `scrollable-region-focusable`, serious, caught by the §13 gate the same
   * afternoon these columns were built).
   *
   * A scroller whose content holds no focusable element cannot be scrolled by
   * anyone not using a pointer — and the sparse saints are exactly that case:
   * Christopher has no life to link out of and no picture, so his apparatus
   * column is a register and nothing to tab to. The remedy is the one the
   * carousel track and the week rail already use here: the box itself takes
   * focus and says what it is.
   *
   * Applied with the placement rather than in the markup, because it is only
   * true at this width — below it these boxes are `display: contents` and
   * scroll nothing, and two tab stops on a phone would be two stops at
   * nothing.
   */
  const label = (box, text) => {
    if (mq.matches) {
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', text);
    } else {
      box.removeAttribute('tabindex');
      box.removeAttribute('role');
      box.removeAttribute('aria-label');
    }
  };

  const place = () => {
    (mq.matches ? aside : body).append(veneration);
    label(aside, STRINGS.saint.asideLabel);
    if (main) label(main, STRINGS.saint.life);
  };
  place();
  mq.addEventListener('change', place);
  return () => mq.removeEventListener('change', place);
}

/**
 * A swipe on a phone steps to the next saint in the list the reader came from
 * (author, 2026-09-02: "on each saint profile, on mobile only, add a swipe
 * function like daily page to swipe between saints on the current search list
 * order from Advanced search").
 *
 * **The order is the Index's own snapshot**, `lastSearch().shown` — the same
 * slugs, in the same order, that the column beside the life is built from
 * (`searchResults`). So the gesture walks the list the reader can see rather
 * than a second ordering that happens to agree with it, and a reader who
 * arrived by another road walks the corpus in its own order, which is what
 * that column shows them too.
 *
 * `onGrainDrag` is the same primitive the Daily page's own day swipe uses, and
 * it is deliberately the same one: it already refuses a mouse, already gates
 * on a threshold, and already tells a horizontal intent from a vertical scroll
 * — three decisions that should not be made twice on one site. The card
 * follows the finger and springs back under `SETTLE`, which is the Daily
 * page's own bargain.
 *
 * Phone only, and by the same `WIDE` query the columns use: on a desktop the
 * list is *beside* the life as a column of real targets, so a gesture would be
 * a second way to do a thing the reader can already see how to do.
 */
function wireSaintSwipe(el, { data, router, current }) {
  const card = el.querySelector('article.saint');
  if (!card) return null;
  const mq = window.matchMedia(WIDE);

  const order = searchResults(data).map((item) => item.slug);
  const at = order.indexOf(current);

  const springBack = () => {
    if (reducedMotion()) {
      card.style.transition = '';
      card.style.transform = '';
      return;
    }
    card.style.transition = 'transform var(--dur-slot) var(--ease)';
    requestAnimationFrame(() => {
      card.style.transform = 'translateX(0)';
    });
    card.addEventListener(
      'transitionend',
      () => {
        card.style.transition = '';
        card.style.transform = '';
      },
      { once: true },
    );
  };

  /** The neighbour in that direction, or null at either end of the list. */
  const neighbour = (step) => {
    if (at < 0) return null;
    const next = order[at + step];
    return next && next !== current ? next : null;
  };

  /*
   * **Bound to the view, not to the card** (2026-09-02). On the card it missed
   * the very saints most likely to be swiped past: Roman (Marchenko) has a
   * short life and no icon, so the article is a few hundred pixels and the
   * rest of the phone's screen is ground below it, where a swipe found
   * nothing. The reader is turning a page, and the page is the whole of it.
   *
   * The card is still what *moves* — it is the thing that reads as the page —
   * and the search column beside it keeps its own gestures, though on a phone
   * it is not laid out at all.
   */
  return onGrainDrag(el, {
    ignore: (target) => !!target.closest?.('.saint-side'),
    begin() {
      if (mq.matches) return;
      card.style.transition = 'none';
    },
    move(dx) {
      if (mq.matches) return;
      card.style.transform = `translateX(${dx}px)`;
    },
    end(dx) {
      if (mq.matches) return;
      // A drag left is forward, which is the direction the Daily page's own
      // swipe reads and the direction a page of text is turned.
      const slug = Math.abs(dx) < SETTLE ? null : neighbour(dx < 0 ? 1 : -1);
      if (!slug) {
        springBack();
        return;
      }
      card.style.transition = '';
      card.style.transform = '';
      router.navigate(`/saints/${slug}`);
    },
  });
}

/**
 * The × closes the page back to wherever the reader opened it from. Opened
 * from the calendar or the map, it returns there — the Index keeps its own
 * record of where it was and restores itself when asked to (views/saints.js),
 * but neither of those two has analogous state to restore, so their own path
 * is enough. Anywhere else, including a deep link with nothing to go back to,
 * falls back to All Saints.
 */
function wireBack(el, router, backTo) {
  const button = el.querySelector('[data-back]');
  const onClick = () =>
    backTo ? router.navigate(backTo) : router.navigate('/saints', { state: { restore: true } });
  button.addEventListener('click', onClick);
  return () => button.removeEventListener('click', onClick);
}

/**
 * Skeleton text at the line height the real text will use, so the arriving
 * paragraph occupies the box the skeleton held rather than pushing the page.
 */
const skeletonLines = (n) =>
  `<div class="skeleton-text" aria-hidden="true">${Array.from({ length: n }, (_, i) =>
    `<span class="skeleton" style="width:${i === n - 1 ? 62 : 96 - (i % 3) * 4}%"></span>`,
  ).join('')}</div>`;

/* ---- filling in the fetched payload ------------------------------------ */

function fillIn(el, payload, { data, router }) {
  const { saint, life, images } = payload;

  // The "Also called" line — the multi-script name forms (Ἀντώνιος,
  // Ⲁⲛⲧⲱⲛⲓⲟⲥ) — stood here until 2026-08-24 (author: remove it). This
  // reverses DESIGN.md's "script coverage is a hard requirement, not a
  // nicety" passage, which named this exact block as how "attest, never
  // adjudicate" appears on screen; flagged to the author the same sitting,
  // reversal recorded in place in DESIGN.md. The forms still live in each
  // saint's own data file — payload.saint.names, unread here now — but were
  // never in the search index (loadSearch's own comment says why: a
  // manifest-size decision, not a code one), so nothing on the site surfaces
  // them any longer. If that turns out to matter, the corpus itself is
  // untouched and the line can return.

  /*
   * The licence line belongs to an image, and 614 of the 742 saints have none
   * (found in review, 2026-08-27). `creditLine(undefined)` returns the "not
   * yet recorded" sentence, which is the right answer for a picture whose
   * provenance is a gap and the wrong one for a page with no picture at all —
   * so every imageless page ended in a disclaimer about something that was
   * never there. Hidden rather than emptied, so the paragraph's own space goes
   * with it.
   */
  const credit = el.querySelector('[data-credit]');
  if (credit) {
    const image = images?.[0];
    credit.innerHTML = image ? creditLine(image.credit) : '';
    credit.hidden = !image;
  }

  // The manifest carries each location's kind and coordinates but not its
  // name, so the rows were drawn at their final size from the card and the
  // names arrive here. Nothing moves; the skeletons are simply replaced.
  fillPlaces(el, saint.dates, saint.locations);

  if (live) live.payload = payload;
  paintVeneration(el, saint, router);

  const lifeEl = el.querySelector('[data-life]');
  /*
   * The life is English, and a reader in one of the other four is told so
   * (author, 2026-08-26: "The saint profile pages do not have russian, greek,
   * serbian or romanian translations. We need to add them").
   *
   * Everything on this page that *is* the site's own words now translates —
   * the headings, the status of each attestation, the feast in its own
   * reckoning, the types, the historicity, and the saint's own name where a
   * calendar in that language recorded one. What does not is the corpus: 742
   * lives, each the author's paraphrase of a named source, and there is no way
   * to render them into four languages that does not mean machine translation.
   * Amendment 2 forbids exactly that, and hagiography is the worst possible
   * place to start: a mistranslated clause is a false claim about a person and
   * about a source we cited by name.
   *
   * So the honest thing, which is also the smallest: say it once, in the
   * reader's language, above the English. `lang="en"` on the prose so a screen
   * reader switches voice rather than reading English in a Greek one — which
   * is the same rule the hymns follow in the other direction.
   */
  const untranslated = life && currentLanguage() !== 'en'
    ? `<p class="life-language utility">${STRINGS.saint.lifeInEnglish}</p>`
    : '';
  lifeEl.innerHTML = life
    ? untranslated +
      `<div lang="en">${renderMarkdown(stripLeadingHeading(life), { link: (href) => (href.startsWith('/') ? router.href(href) : href) })}</div>`
    : `<p class="utility">${STRINGS.saint.noLife}</p>`;
  // Links inside a life point at other saints; they get the same prefetch
  // budget as any other route into a detail page.
  for (const a of lifeEl.querySelectorAll('a[href]')) {
    const match = /\/saints\/([^/?#]+)$/.exec(a.getAttribute('href') ?? '');
    if (match) a.dataset.prefetch = match[1];
  }
  /*
   * And the ones nobody wrote a link for (author, 2026-08-26). After the loop
   * above, not before: the hand-written links are already <a> elements by
   * then, and the walker refuses to enter one — so a life that names Athanasius
   * twice, once linked, keeps its own link and gains nothing.
   * lib/cross-link.js argues the four rules that decide what is safe to link.
   */
  linkSaintNames(lifeEl, {
    saints: data.saints,
    skipSlug: saint.slug,
    href: (slug) => router.href(`/saints/${slug}`),
  });

  el.querySelector('[data-sources]').innerHTML = sources(saint);
  // The saint's own hymns, at the foot of the page (author, 2026-08-25).
  // They arrive with the rest of the fetched payload rather than in the
  // manifest, which is why they are filled here and not in the shell.
  el.querySelector('[data-hymns-box]').innerHTML = saintHymnsSection(saint.hymns, currentChurch());
  wireSources(el, saint.slug);

  el.querySelector('[data-related]').innerHTML = related(saint, data, router);

  /*
   * Last, once every box inside it holds what it is going to hold. A hidden
   * element reports 0 and ignores writes (CLAUDE.md trap 7), so this has to
   * come after the writes and not before — and it is one reveal rather than
   * six, because unhiding as each section filled would put back the shift this
   * block exists to remove.
   */
  el.querySelector('[data-late]').hidden = false;

  // The links that just arrived were not in the DOM when the shell was wired.
  live?.cleanups.push(observePrefetch(el));
}

/**
 * What we can say about this image, and no more. A licence that obliges
 * attribution and has none is an unresolved question and says so; a
 * public-domain work owes nobody a credit and simply names its licence.
 *
 * The source link is printed only when it is a real one. A placeholder is in
 * these files on purpose (lib/licence.js) and must not be handed to a reader
 * as though it led somewhere.
 */
function creditLine(meta) {
  if (!meta || !licenceIsSettled(meta.licence)) {
    return `<span class="unrecorded">${STRINGS.saint.creditUnrecorded}</span>`;
  }
  if (requiresAttribution(meta.licence) && !meta.credit) {
    return `<span class="unrecorded">${STRINGS.saint.creditUnrecorded}</span>`;
  }

  const text = meta.credit
    ? fill(STRINGS.saint.credit, { credit: esc(meta.credit), licence: esc(meta.licence) })
    : esc(meta.licence);
  const linkable = meta.source_url && !isPlaceholderSource(meta.source_url);
  return linkable ? `<a href="${esc(meta.source_url)}" rel="noopener noreferrer">${text}</a>` : text;
}

/* ---- veneration, church by church -------------------------------------- */

/**
 * The three words a row can carry, **read at paint time and never captured**
 * (author, 2026-08-26: "The saint profile pages do not have russian, greek,
 * serbian or romanian translations").
 *
 * This was a module constant holding the three *strings*, evaluated the moment
 * the module was imported — which is before `currentLanguage()` has merged any
 * pack over STRINGS, and in any case once for the life of the page. So every
 * veneration row on every saint's page read "Venerated" in English in all five
 * languages, in a file whose neighbours all translate correctly.
 *
 * lib/i18n.js's contract is that a pack mutates STRINGS' *branches* in place,
 * so `const C = STRINGS.church` keeps working. A leaf is the one thing that
 * cannot be captured, because a leaf is a string and strings do not mutate.
 * This is the only place in the app that captured one; `scripts/locale-coverage.mjs`
 * found the pack coverage was already complete, which is what narrowed the
 * search from "the packs are missing keys" to "one file is not reading them".
 */
const statusText = (status) =>
  ({
    venerated: STRINGS.saint.statusVenerated,
    'not-venerated': STRINGS.saint.statusRefused,
    undocumented: STRINGS.saint.statusUndocumented,
  })[status] ?? status;

/**
 * The reader's church first, the other two behind a button, for this page only
 * (author, 2026-08-22, Addendum H9 redrawn for one church). Nothing is
 * asserted by it — the reader is choosing what to read, which is the opposite
 * of adjudicating. No church chosen yet shows all three.
 */
function paintVeneration(el, saint, router) {
  const box = el.querySelector('[data-veneration]');
  if (!box) return;
  /*
   * The register and its heading appear together, when there is something to
   * put in them. It sat inside `[data-late]` until 2026-09-02 and was revealed
   * with everything else there; now that it stands in the other column it
   * needs its own reveal, and it is the same bargain — the box appends rather
   * than reserving, because how many churches attest is not knowable before
   * the payload says.
   */
  el.querySelector('[data-veneration-box]')?.removeAttribute('hidden');
  // A guess does not hide three churches: this page showed all four before
  // there was a default and shows all four still, until the reader chooses
  // (lib/church.js, `chosenChurch`).
  const church = chosenChurch();
  const churches = CHURCHES.filter((c) => c.enabled !== false);
  const mine = church ? churches.filter((c) => c.id === church) : churches;
  const others = churches.filter((c) => !mine.includes(c));
  const revealed = live?.revealed ?? false;

  const reveal = others.length
    ? `<button type="button" class="reveal-traditions" data-reveal aria-expanded="${String(revealed)}">` +
      `${revealed ? STRINGS.saint.hideOtherChurches : fill(STRINGS.saint.otherChurches, { count: others.length })}</button>`
    : '';
  box.innerHTML =
    veneration(saint, mine, router) +
    reveal +
    (others.length && revealed ? `<div class="attestations-other">${veneration(saint, others, router)}</div>` : '');
  box.querySelector('[data-reveal]')?.addEventListener('click', () => {
    if (live) live.revealed = !live.revealed;
    paintVeneration(el, saint, router);
    box.querySelector('[data-reveal]')?.focus();
  });
  wireFeastLinks(box, router);
}

/**
 * A feast date opens that day, in the calendar of the church whose row it was
 * read from (author, 2026-09-02).
 *
 * The href alone would do the navigation, and the whole reason this listener
 * exists is the *other* half of the instruction: "depending on which church
 * veneration was clicked, the calendar type also changes". So the press sets
 * the church first and then lets the router take it — `chooseChurch` notifies
 * every subscribed view, and the Daily page reads the setting when it renders,
 * so the order matters and this way round is the one that lands.
 *
 * Only a plain left click is taken. A middle click, or a reader holding a
 * modifier to open the day in a new tab, keeps the browser's own behaviour —
 * and would be a strange press to change the whole site's calendar on, since
 * the tab they are looking at is not the one that moved.
 *
 * Bound on the box rather than per link, because `paintVeneration` rewrites
 * its own innerHTML whenever the reveal is toggled or the church changes.
 */
function wireFeastLinks(box, router) {
  box.addEventListener('click', (e) => {
    const link = e.target.closest('[data-feast-day]');
    if (!link || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const church = link.dataset.church;
    // Already reading that church: nothing to change, and `chooseChurch`
    // would repaint every subscriber for no reason.
    if (church && church !== chosenChurch()) chooseChurch(church);
    // The router's own path, not the href: `href()` has the base path on it
    // and `navigate` adds it again.
    router.navigate(`/calendar/${link.dataset.feastDay}`);
  });
}

function veneration(saint, churches, router) {
  const year = new Date().getFullYear();
  const byChurch = new Map((saint.attestations ?? []).map((a) => [a.church, a]));

  const rows = churches.map((church) => {
    const att = byChurch.get(church.id);
    const status = att?.status ?? 'undocumented';
    const lines = [];

    if (att?.titles?.length) lines.push(`<span class="att-titles">${esc(att.titles.join(', '))}</span>`);

    if (status === 'venerated') {
      // Not escaped: `feastLine` returns markup and escapes its own parts.
      lines.push(`<span class="att-feast utility">${feastLine(att.feast, church, year, router)}</span>`);
    } else if (status === 'not-venerated') {
      // A refusal is a finding about that church and is stated on its row.
      // Undocumented is a fact about our sourcing and is the same fact every
      // time, so it is said once below the list rather than seven times down it.
      lines.push(`<span class="att-note utility">${STRINGS.saint.refusedNote}</span>`);
    }

    if (att?.note) lines.push(`<span class="att-note utility">${esc(att.note)}</span>`);
    if (att?.source) lines.push(`<span class="att-source utility">${citation(att.source)}</span>`);

    return `<li class="att att-${status}">
      <span class="att-church utility">${esc(churchName(church.id))}</span>
      <span class="att-status utility">${esc(statusText(status))}</span>
      <span class="att-body">${lines.join('')}</span>
    </li>`;
  });

  const anyUndocumented = churches.some(
    (c) => (byChurch.get(c.id)?.status ?? 'undocumented') === 'undocumented',
  );
  const note = anyUndocumented
    ? `<p class="att-legend utility">${STRINGS.saint.undocumentedNote}</p>`
    : '';
  return `<ul class="attestations">${rows.join('')}</ul>${note}`;
}

/**
 * The feast a church keeps, and the day it falls on this year.
 *
 * **Returns markup rather than text since 2026-09-02**, because the Gregorian
 * date is a link now — so every branch escapes what it interpolates, and the
 * caller inserts it without escaping.
 */
function feastLine(feast, church, year, router) {
  if (!feast) return esc(STRINGS.saint.noFeast);
  const own = formatFeast(feast);
  let occurrences = [];
  try {
    occurrences = feastOccurrences(feast, year, church);
  } catch {
    // A paschal feast with no computus anywhere is a data error the build
    // catches; here it simply means we cannot name a Gregorian day for it.
    return esc(own);
  }
  if (!occurrences.length) return esc(fill(STRINGS.saint.feastNoOccurrence, { feast: own, year }));
  const d = occurrences[0];
  /*
   * **The date is the way to that day** (author, 2026-09-02: "Create a
   * hyperlink on the Saint's profile where it states the date of veneration,
   * that takes you to the Daily page of that date. Depending on which church
   * veneration was clicked, the calendar type also changes").
   *
   * The row is a church's own reading of this saint, so the link carries that
   * church with it: the Daily page prints one calendar at a time, and sending
   * a reader to 15 January while leaving them in the Russian calendar would
   * open a day that does not keep this feast at all — which reads as the link
   * being broken rather than as the two calendars disagreeing, which is the
   * whole finding the row exists to state.
   *
   * `data-church` rather than a query parameter: the church is a setting the
   * whole site reads (lib/church.js), not a property of the address, and
   * `wireFeastLinks` is what turns the press into `chooseChurch` plus a
   * navigation. Clicking the row for the church you are already reading
   * changes nothing, which is the author's own second case.
   */
  const iso = `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
  /*
   * **The civil date says which reckoning it is** (author, 2026-09-02: "just
   * state which falls on '28 January 2026 (Gregorian)' and that always stays
   * the same").
   *
   * The line carries two dates in two calendars and named only one of them,
   * which is the ambiguity: "15 January (Julian), which falls on 28 January
   * 2026" leaves the second date's reckoning to be inferred. It is the civil
   * one, always — the conversion is arithmetic from what the source states and
   * does not move with anything the reader chooses, which is exactly why it is
   * worth naming.
   *
   * Where the two agree the line repeats itself — "15 January (Revised
   * Julian), which falls on 15 January 2026 (Gregorian)" — and that is not a
   * fault to design around (author, same message: "repetition is not a
   * problem"). Those two dates being the same *is* the finding for a New
   * Calendar church, and a line that hid it would be hiding the thing the
   * register exists to show.
   */
  const civil = STRINGS.saint.civilCalendar;
  const shown = gregorianFmt(new Date(Date.UTC(d.year, d.month - 1, d.day)));
  const gregorian =
    `<a class="feast-day" href="${router.href(`/calendar/${iso}`)}" data-feast-day="${iso}"` +
    ` data-church="${esc(church.id)}">${esc(shown)}</a>${civil ? ` (${esc(civil)})` : ''}`;
  return fill(STRINGS.saint.feastThisYear, { feast: esc(own), gregorian, year });
}

function citation(source) {
  const text = esc([source.text, source.year].filter(Boolean).join(', '));
  const body = source.url ? `<a href="${esc(source.url)}" rel="noopener noreferrer">${text}</a>` : text;
  const note = source.note ? ` ${esc(source.note)}` : '';
  return fill(STRINGS.saint.citation, { text: body }) + note;
}

/* ---- source texts ------------------------------------------------------- */

/**
 * Source texts are long — Jerome's Life of Paul is most of the bytes in
 * `saints/` — so each is a closed disclosure that fetches only when the reader
 * opens it, and the file's own heading replaces the filename once it has.
 */
function sources(saint) {
  const files = saint.text?.sources ?? [];
  if (!files.length) return '';
  const items = files
    .map(
      (path) => `<details class="source" data-source="${esc(path)}">
        <summary>${esc(humanise(path))}</summary>
        <div class="source-body"></div>
      </details>`,
    )
    .join('');
  return `<h2 class="register-heading">${STRINGS.saint.sources}</h2>${items}`;
}

const humanise = (path) => {
  const base = path.replace(/^.*\//, '').replace(/\.md$/i, '').replace(/-/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
};

function wireSources(el, slug) {
  for (const details of el.querySelectorAll('.source')) {
    details.addEventListener('toggle', async () => {
      const body = details.querySelector('.source-body');
      if (!details.open || body.dataset.loaded) return;
      body.dataset.loaded = 'pending';
      try {
        const text = await loadSource(slug, details.dataset.source);
        const heading = /^\s*#\s+(.+)$/m.exec(text);
        if (heading) details.querySelector('summary').textContent = heading[1];
        body.innerHTML = renderMarkdown(stripLeadingHeading(text), { headingOffset: 2 });
        body.dataset.loaded = 'done';
      } catch {
        body.innerHTML = `<p class="error-note">${STRINGS.saint.sourceFailed}</p>`;
        delete body.dataset.loaded;
      }
    });
  }
}

/* ---- related ------------------------------------------------------------ */

function related(saint, data, router) {
  const rows = (saint.related ?? [])
    .map((slug) => data.bySlug.get(slug))
    .filter(Boolean)
    .map(
      (card) => `<li>
        <a class="reg-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(saintName(card))}</a>
        <span class="reg-feast utility">${esc(formatLifespan(card.dates))}</span>
      </li>`,
    );
  if (!rows.length) return '';
  return `<h2 class="register-heading">${STRINGS.saint.related}</h2><ul class="register">${rows.join('')}</ul>`;
}

/* ---- reading position ---------------------------------------------------- */

/**
 * Reading is recorded on arrival — opening a saint is starting to read one —
 * and the position is written at most every 1.5 s while scrolling, plus once
 * on the way out. Restoring is never automatic: a reader following a link
 * from another life expects the top of the page, so the stored position is
 * offered as a control and taken only if they ask.
 */
function wireReading(el, slug) {
  /*
   * **Whichever box actually scrolls** (2026-09-02). The life was the page's
   * own scroll until the columns began carrying their own past 1024 px, and a
   * reading position recorded off `window.scrollY` on a page that cannot
   * scroll is always 0 — so Continue reading would offer every desktop reader
   * the top of a life they had read half of. This is the shape of bug the
   * Daily page's own two columns produced (CLAUDE.md, "anything that watched
   * `window` scroll had to learn to watch whatever scrolled instead"); asked
   * of the element rather than of the width, so it is right whichever way the
   * stylesheet answers.
   */
  const main = el.querySelector('.saint-main');
  const scroller = () => (main && main.scrollHeight > main.clientHeight + 1 ? main : window);
  const positionOf = (target) => (target === window ? window.scrollY : target.scrollTop);
  const scrollTo = (target, top) =>
    target === window ? window.scrollTo({ top, behavior: 'auto' }) : (target.scrollTop = top);

  const note = el.querySelector('[data-resume]');
  // Read before touching: marking the visit must not be what erases the
  // position the visit exists to offer.
  store.getReading(slug).then((row) => {
    store.touchReading(slug);
    if (!row || row.scrollPos < 200 || !note.isConnected) return;
    note.hidden = false;
    note.innerHTML = `<button type="button" data-resume-go>${STRINGS.shelf.resume}</button>`;
    note.querySelector('[data-resume-go]').addEventListener('click', () => {
      scrollTo(scroller(), row.scrollPos);
      note.hidden = true;
    });
  });

  let last = 0;
  let timer = null;
  // Teardown runs before the next view paints, by which time the scroller may
  // already have been reset; the last value seen while this page was on
  // screen is the one worth keeping.
  let lastY = 0;
  const record = () => {
    last = Date.now();
    store.markReading(slug, lastY);
  };
  const onScroll = (e) => {
    lastY = positionOf(e.target === document || e.target === window ? window : e.target);
    if (timer) return;
    const wait = Math.max(0, READING_INTERVAL - (Date.now() - last));
    timer = setTimeout(() => {
      timer = null;
      record();
    }, wait);
  };
  const onLeave = () => {
    if (document.visibilityState === 'hidden') record();
  };

  // Both, because which one moves is a fact about the window's width and can
  // change under the reader; neither fires unless it is the one scrolling.
  window.addEventListener('scroll', onScroll, { passive: true });
  main?.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onLeave);
  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    main?.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onLeave);
    record();
  };
}
