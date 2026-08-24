/**
 * The two shelves that turn a thirty-second visit into a habit (brief §8.1):
 * what the reader was in the middle of, and what they kept. They live on the
 * calendar because that is the page a returning reader lands on, and they are
 * rendered in the register voice — a shelf is a list of days' worth of
 * reading, not a widget.
 *
 * Both are hidden when empty. An empty shelf is not a designed state in the
 * sense DESIGN.md §5b means: a day with no commemorations is a fact about the
 * calendar and says so, whereas a reader who has saved nothing has simply not
 * used a feature yet, and inviting them to look at their own empty shelf would
 * be furniture.
 */

import * as store from '../lib/store.js';
import { formatLifespan } from '../lib/calendar-page.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { withHonorific } from '../lib/honorific.js';
import { paintSaved, renderBookmark, wireSaveButtons } from './save.js';
import { STRINGS } from './strings.js';

const BASE = import.meta.env.BASE_URL;
const SHELF_LIMIT = 5;

function row(card, router, { removable = false } = {}) {
  const remove = removable
    ? `<button type="button" class="shelf-remove" data-forget="${esc(card.slug)}"
        aria-label="${STRINGS.shelf.remove}: ${esc(card.display_name)}">×</button>`
    : '';
  return `<li>
    <a class="reg-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(withHonorific(card.display_name))}</a>
    <span class="reg-feast utility">${esc(formatLifespan(card.dates))}</span>
    ${remove}
  </li>`;
}

/**
 * Continue reading wears the Index's own row dress (author, 2026-08-24): the
 * same card, the same classes, so the two read as one register — with the ×
 * stacked over the bookmark at the trailing edge, because a shelf the reader
 * cannot clear is a nag and a row without Save would disagree with the card
 * it copies. The markup mirrors views/saints.js's row branch; index.css
 * styles it, saint.css only places it.
 */
function readingRow(card, router) {
  const image = card.image
    ? `<span class="index-media" style="background-image:url('${BASE + card.image.lqip}')">
        <img src="${BASE + card.image.src}" alt="" width="${card.image.w}" height="${card.image.h}"
          loading="lazy" decoding="async" />
      </span>`
    : '<span class="index-media is-empty" aria-hidden="true"></span>';
  return `<li class="index-card panel is-row shelf-row">
    ${image}
    <span class="row-body">
      <span class="name-line">
        <a class="index-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(withHonorific(card.display_name))}</a>
      </span>
      <span class="index-dates utility">${esc(formatLifespan(card.dates))}</span>
    </span>
    <span class="shelf-tools">
      <button type="button" class="shelf-remove" data-forget="${esc(card.slug)}"
        aria-label="${STRINGS.shelf.remove}: ${esc(card.display_name)}">×</button>
      ${renderBookmark(card.slug, card.display_name)}
    </span>
  </li>`;
}

/**
 * Renders both shelves into `el` and keeps them in step with the store.
 * Returns a teardown the view calls when it re-renders.
 */
export function mountShelves(el, { data, router }) {
  let alive = true;

  const paint = async () => {
    const [reading, saved] = await Promise.all([
      store.listReading(SHELF_LIMIT),
      store.listSaved(SHELF_LIMIT),
    ]);
    if (!alive) return;

    // A slug whose folder has since gone is dropped rather than named: the
    // shelf can only show what the manifest can still describe.
    const readingCards = reading.map((r) => data.bySlug.get(r.slug)).filter(Boolean);
    const savedCards = saved.map((slug) => data.bySlug.get(slug)).filter(Boolean);

    const sections = [];
    if (readingCards.length) {
      sections.push(
        `<h2 class="register-heading">${STRINGS.shelf.continueReading}</h2>
         <ul class="shelf shelf-cards">${readingCards.map((c) => readingRow(c, router)).join('')}</ul>`,
      );
    }
    if (savedCards.length) {
      sections.push(
        `<h2 class="register-heading">${STRINGS.shelf.saved}</h2>
         <ul class="register shelf">${savedCards.map((c) => row(c, router)).join('')}</ul>`,
      );
    }
    el.innerHTML = sections.join('');
    paintSaved(el);
  };

  const onClick = (e) => {
    const button = e.target.closest('[data-forget]');
    if (!button) return;
    store.clearReading(button.dataset.forget);
  };

  el.addEventListener('click', onClick);
  // The reading rows carry the Save bookmark now, and nothing else wires this
  // container — the day panel's wiring stops at the panel.
  const unwireSave = wireSaveButtons(el);
  const unsubscribe = store.subscribe((what) => {
    if (what === 'saved' || what === 'reading') paint();
  });
  paint();

  return () => {
    alive = false;
    el.removeEventListener('click', onClick);
    unwireSave();
    unsubscribe();
  };
}
