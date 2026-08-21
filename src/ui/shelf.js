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
import { renderBadge } from './badge.js';
import { STRINGS } from './strings.js';

const SHELF_LIMIT = 5;

function row(card, router, { removable = false } = {}) {
  const remove = removable
    ? `<button type="button" class="shelf-remove" data-forget="${esc(card.slug)}"
        aria-label="${STRINGS.shelf.remove}: ${esc(card.display_name)}">×</button>`
    : '';
  return `<li>
    <a class="reg-name" href="${router.href(`/saints/${card.slug}`)}" data-prefetch="${esc(card.slug)}">${esc(card.display_name)}</a>
    ${renderBadge(card.attestations, { pitch: 10.2 })}
    <span class="reg-feast utility">${esc(formatLifespan(card.dates))}</span>
    ${remove}
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
         <ul class="register shelf">${readingCards.map((c) => row(c, router, { removable: true })).join('')}</ul>`,
      );
    }
    if (savedCards.length) {
      sections.push(
        `<h2 class="register-heading">${STRINGS.shelf.saved}</h2>
         <ul class="register shelf">${savedCards.map((c) => row(c, router)).join('')}</ul>`,
      );
    }
    el.innerHTML = sections.join('');
  };

  const onClick = (e) => {
    const button = e.target.closest('[data-forget]');
    if (!button) return;
    store.clearReading(button.dataset.forget);
  };

  el.addEventListener('click', onClick);
  const unsubscribe = store.subscribe((what) => {
    if (what === 'saved' || what === 'reading') paint();
  });
  paint();

  return () => {
    alive = false;
    el.removeEventListener('click', onClick);
    unsubscribe();
  };
}
