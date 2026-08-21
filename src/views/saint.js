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
 * Veneration is shown church by church, with each tradition's own titles, its
 * feast in its own reckoning, and the source it rests on — including the
 * churches we have not sourced, which say so. The rite × communion matrix
 * (§9.2) is a Phase 3 view and is deliberately not this: this page lists
 * churches, that one crosses them with rites.
 */

import { CHURCHES } from '../data/churches.js';
import { formatFeast } from '../data/calendars.js';
import { feastOccurrences } from '../lib/feasts.js';
import { formatLifespan } from '../lib/calendar-page.js';
import { escapeHtml as esc, renderMarkdown, stripLeadingHeading } from '../lib/markdown.js';
import { loadDetail, loadSource, observePrefetch } from '../lib/detail.js';
import { isPlaceholderSource, licenceIsSettled, requiresAttribution } from '../lib/licence.js';
import * as store from '../lib/store.js';
import { renderBadge } from '../ui/badge.js';
import { renderMatrix } from '../ui/matrix.js';
import { renderSaveButton, wireSaveButtons } from '../ui/save.js';
import { renderDateBars } from '../ui/datebar.js';
import { STRINGS, fill } from '../ui/strings.js';

const BASE = import.meta.env.BASE_URL;

export const title = STRINGS.saints.title;

/** The manifest already knows the name, so the tab title never waits. */
export const titleFor = (params, data) =>
  data.bySlug.get(params.slug)?.display_name ?? STRINGS.saint.notFoundTitle;

const gregorianFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});

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

export function render(el, { data, params, router }) {
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

  el.innerHTML = shell(card);
  const cleanups = [wireSaveButtons(el), wireReading(el, slug), observePrefetch(el)];
  live = { cleanups, teardown: () => cleanups.forEach((fn) => fn?.()) };

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
      body.querySelector('[data-retry]').addEventListener('click', () => render(el, { data, params, router }));
    },
  );
}

/* ---- the manifest-only shell ------------------------------------------- */

function shell(card) {
  const media = card.image
    ? `<figure class="saint-media" style="aspect-ratio:${card.image.aspect};background-image:url('${BASE + card.image.lqip}')">
        <img src="${BASE + card.image.src}" alt="" width="${card.image.w}" height="${card.image.h}"
          style="view-transition-name:s-${esc(card.slug)}-image" decoding="async" />
      </figure>
      <p class="image-credit utility" data-credit></p>`
    : '';

  const facts = [
    card.types?.length ? card.types.join(', ') : null,
    STRINGS.saint.sexLabel[card.sex] ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return `<article class="saint">
    <header class="saint-head">
      <div class="name-line">
        <h1 class="saint-name" style="view-transition-name:s-${esc(card.slug)}-name">${esc(card.display_name)}</h1>
        ${renderMatrix(card.attestations, { pitch: 9 })}
      </div>
      <p class="names" data-names hidden></p>
      <p class="saint-facts utility">${esc(formatLifespan(card.dates))}${facts ? ` · ${esc(facts)}` : ''}</p>
      <div class="saint-actions">${renderSaveButton(card.slug)}</div>
      <p class="resume-note utility" data-resume hidden></p>
    </header>

    <div class="saint-columns">
      <div class="saint-aside">
        ${media}
        ${renderDateBars(card.dates)}
        ${card.historicity ? `<p class="historicity utility">${esc(STRINGS.saint.historicity[card.historicity] ?? card.historicity)}</p>` : ''}
      </div>

      <div class="saint-main" data-detail>
        <h2 class="register-heading">${STRINGS.saint.veneration}</h2>
        <div data-veneration>${skeletonLines(4)}</div>
        <h2 class="register-heading">${STRINGS.saint.life}</h2>
        <div class="life" data-life>${skeletonLines(6)}</div>
        <div data-sources></div>
        <div data-related></div>
      </div>
    </div>
  </article>`;
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

  const names = el.querySelector('[data-names]');
  if (saint.names?.length) {
    names.hidden = false;
    names.innerHTML =
      `<span class="names-label utility">${STRINGS.saint.nameForms}</span> ` +
      saint.names
        // An empty lang is worse than none: it tells a screen reader the
        // language is unspecified rather than letting it keep the page's.
        .map((n) => `<span${n.lang ? ` lang="${esc(n.lang)}"` : ''}>${esc(n.form)}</span>`)
        .join('<span class="names-sep" aria-hidden="true"> · </span>');
  }

  const credit = el.querySelector('[data-credit]');
  if (credit) credit.innerHTML = creditLine(images?.[0]?.credit);

  el.querySelector('[data-veneration]').innerHTML = veneration(saint);

  const lifeEl = el.querySelector('[data-life]');
  lifeEl.innerHTML = life
    ? renderMarkdown(stripLeadingHeading(life), { link: (href) => (href.startsWith('/') ? router.href(href) : href) })
    : `<p class="utility">${STRINGS.saint.noLife}</p>`;
  // Links inside a life point at other saints; they get the same prefetch
  // budget as any other route into a detail page.
  for (const a of lifeEl.querySelectorAll('a[href]')) {
    const match = /\/saints\/([^/?#]+)$/.exec(a.getAttribute('href') ?? '');
    if (match) a.dataset.prefetch = match[1];
  }

  el.querySelector('[data-sources]').innerHTML = sources(saint);
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

const STATUS_TEXT = {
  venerated: STRINGS.saint.statusVenerated,
  'not-venerated': STRINGS.saint.statusRefused,
  undocumented: STRINGS.saint.statusUndocumented,
};

function veneration(saint) {
  const year = new Date().getFullYear();
  const byChurch = new Map((saint.attestations ?? []).map((a) => [a.church, a]));

  const rows = CHURCHES.filter((c) => c.enabled !== false).map((church) => {
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
      <span class="att-church utility">${esc(church.display_name)}</span>
      <span class="att-status utility">${STATUS_TEXT[status]}</span>
      <span class="att-body">${lines.join('')}</span>
    </li>`;
  });

  const anyUndocumented = CHURCHES.filter((c) => c.enabled !== false).some(
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
    gregorian: gregorianFmt.format(new Date(Date.UTC(d.year, d.month - 1, d.day))),
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
        <a class="reg-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(card.display_name)}</a>
        ${renderBadge(card.attestations, { pitch: 12 })}
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
