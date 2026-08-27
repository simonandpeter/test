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
import { chosenChurch, churchName, currentChurch, subscribeChurch } from '../lib/church.js';
import { formatFeast } from '../data/calendars.js';
import { feastOccurrences } from '../lib/feasts.js';
import { formatLifespan } from '../lib/calendar-page.js';
import { saintName, typesBeside } from '../lib/honorific.js';
import { escapeHtml as esc, renderMarkdown, stripLeadingHeading } from '../lib/markdown.js';
import { loadDetail, loadSource, observePrefetch } from '../lib/detail.js';
import { linkSaintNames } from '../lib/cross-link.js';
import { isPlaceholderSource, licenceIsSettled, requiresAttribution } from '../lib/licence.js';
import * as store from '../lib/store.js';
import { renderBookmark, wireSaveButtons } from '../ui/save.js';
import { saintHymnsSection } from '../ui/hymns.js';
import { renderDateFacts, fillPlaces } from '../ui/datefacts.js';
import { STRINGS, fill } from '../ui/strings.js';
import { currentLanguage, formatDate } from '../lib/i18n.js';

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

  // Opened from the calendar: the × goes back to that same day rather than
  // to All Saints (author, 2026-08-23).
  const fromCalendar = cameFrom?.nav === 'calendar' ? cameFrom.path : null;
  const backLabel = fromCalendar ? STRINGS.saint.backDaily : STRINGS.saint.back;

  el.innerHTML = shell(card, backLabel);
  const cleanups = [wireSaveButtons(el), wireReading(el, slug), observePrefetch(el), wireBack(el, router, fromCalendar)];
  // Whether the churches the reader is not reading are shown on this page.
  // Per render, so it resets on the next saint opened (author, 2026-08-22).
  live = { cleanups, revealed: false, payload: null, teardown: () => cleanups.forEach((fn) => fn?.()) };
  cleanups.push(
    subscribeChurch(() => {
      if (mine === generation && live?.payload) paintVeneration(el, live.payload.saint);
    }),
  );

  store.visit(slug);

  loadDetail(slug).then(
    (payload) => {
      if (mine === generation) fillIn(el, payload, { data, router });
    },
    () => {
      if (mine !== generation) return;
      const body = el.querySelector('[data-detail]');
      body.innerHTML = `<div class="error-note"><p>${STRINGS.saint.failed}</p>
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

    <div class="saint-intro${media ? ' has-media' : ''}">
      ${media ? `<div class="saint-media-col">${media}</div>` : ''}
      <div class="saint-intro-facts">
        ${renderDateFacts(card.dates, card.locations)}
        ${card.historicity ? `<p class="historicity utility">${esc(STRINGS.saint.historicity[card.historicity] ?? card.historicity)}</p>` : ''}
      </div>
    </div>

    <!-- The life first, veneration under it (author, 2026-08-27). The page is
         about a person: the prose that says who they were is what a reader
         came for, and the church-by-church register is the apparatus behind
         it. Veneration led from the first build to this one, which put four
         skeleton rows and a table of feast dates between the name and the
         first sentence of the life. -->
    <div class="saint-main" data-detail>
      <h2 class="register-heading">${STRINGS.saint.life}</h2>
      <div class="life" data-life>${skeletonLines(6)}</div>
      <!-- Sources stay under the life: they are text.sources, the documents
           the prose above was written from, and they followed it before this
           reorder too. -->
      <div data-sources></div>
      <h2 class="register-heading">${STRINGS.saint.veneration}</h2>
      <div data-veneration>${skeletonLines(4)}</div>
      <div data-hymns-box></div>
      <div data-related></div>
      <p class="image-credit utility" data-credit></p>
    </div>
  </article>`;
}

/**
 * The × closes the page back to wherever the reader opened it from. Opened
 * from the calendar, it returns to that same day — the Index keeps its own
 * record of where it was and restores itself when asked to (views/saints.js),
 * but the calendar has no analogous state to restore, so its own path is
 * enough. Anywhere else, including a deep link with nothing to go back to,
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
  paintVeneration(el, saint);

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
function paintVeneration(el, saint) {
  const box = el.querySelector('[data-veneration]');
  if (!box) return;
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
    veneration(saint, mine) +
    reveal +
    (others.length && revealed ? `<div class="attestations-other">${veneration(saint, others)}</div>` : '');
  box.querySelector('[data-reveal]')?.addEventListener('click', () => {
    if (live) live.revealed = !live.revealed;
    paintVeneration(el, saint);
    box.querySelector('[data-reveal]')?.focus();
  });
}

function veneration(saint, churches) {
  const year = new Date().getFullYear();
  const byChurch = new Map((saint.attestations ?? []).map((a) => [a.church, a]));

  const rows = churches.map((church) => {
    const att = byChurch.get(church.id);
    const status = att?.status ?? 'undocumented';
    const lines = [];

    if (att?.titles?.length) lines.push(`<span class="att-titles">${esc(att.titles.join(', '))}</span>`);

    if (status === 'venerated') {
      lines.push(`<span class="att-feast utility">${esc(feastLine(att.feast, church, year))}</span>`);
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

function feastLine(feast, church, year) {
  if (!feast) return STRINGS.saint.noFeast;
  const own = formatFeast(feast);
  let occurrences = [];
  try {
    occurrences = feastOccurrences(feast, year, church);
  } catch {
    // A paschal feast with no computus anywhere is a data error the build
    // catches; here it simply means we cannot name a Gregorian day for it.
    return own;
  }
  if (!occurrences.length) return fill(STRINGS.saint.feastNoOccurrence, { feast: own, year });
  const d = occurrences[0];
  return fill(STRINGS.saint.feastThisYear, {
    feast: own,
    gregorian: gregorianFmt(new Date(Date.UTC(d.year, d.month - 1, d.day))),
    year,
  });
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
  const note = el.querySelector('[data-resume]');
  // Read before touching: marking the visit must not be what erases the
  // position the visit exists to offer.
  store.getReading(slug).then((row) => {
    store.touchReading(slug);
    if (!row || row.scrollPos < 200 || !note.isConnected) return;
    note.hidden = false;
    note.innerHTML = `<button type="button" data-resume-go>${STRINGS.shelf.resume}</button>`;
    note.querySelector('[data-resume-go]').addEventListener('click', () => {
      window.scrollTo({ top: row.scrollPos, behavior: 'auto' });
      note.hidden = true;
    });
  });

  let last = 0;
  let timer = null;
  // Teardown runs before the next view paints, by which time window.scrollY
  // may already have been reset; the last value seen while this page was on
  // screen is the one worth keeping.
  let lastY = 0;
  const record = () => {
    last = Date.now();
    store.markReading(slug, lastY);
  };
  const onScroll = () => {
    lastY = window.scrollY;
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

  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onLeave);
  return () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', onLeave);
    record();
  };
}
