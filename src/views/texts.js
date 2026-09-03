import { loadTexts } from '../lib/texts.js';
import { saintName } from '../lib/honorific.js';
import { escapeHtml as esc } from '../lib/markdown.js';
import { STRINGS, fill } from '../ui/strings.js';

export const title = () => STRINGS.texts.title;

/**
 * The Texts page (2026-09-04, author: "Add the text page ... hyperlinking the
 * saint profile on that page"). A saint's own primary source already reads in
 * full on their own page — `views/saint.js`'s `sources()`/`wireSources()`, a
 * closed `<details>` that fetches only when opened — so this page does not
 * duplicate that fetch-and-render; it is the index across every saint who has
 * one, each row a door to the page that already carries the text.
 *
 * `data/texts.json` (`scripts/build-texts.mjs`) is the one further fact the
 * manifest deliberately does not carry — see that script's own header for why
 * it is a separate file rather than a field on every card.
 */
export async function render(el, { data, router }) {
  el.innerHTML = `
    <div class="about">
      <h1>${esc(STRINGS.texts.title)}</h1>
      <p class="about-lede">${esc(STRINGS.texts.lede)}</p>
      <div data-texts-list></div>
    </div>
  `;

  const list = el.querySelector('[data-texts-list]');
  let texts;
  try {
    texts = await loadTexts();
  } catch {
    list.innerHTML = `<p class="utility">${esc(STRINGS.texts.empty)}</p>`;
    return;
  }
  if (!list.isConnected) return;

  if (!texts.length) {
    list.innerHTML = `<p class="utility">${esc(STRINGS.texts.empty)}</p>`;
    return;
  }

  list.innerHTML = `<ul class="register">${texts
    .map((t) => {
      const card = data.bySlug.get(t.slug);
      const name = card ? esc(saintName(card)) : esc(t.display_name);
      return `<li>
        <a class="reg-name" href="${router.href(`/saints/${t.slug}`)}" data-prefetch="${esc(t.slug)}">${esc(t.title)}</a>
        <span class="reg-feast utility">${esc(fill(STRINGS.texts.on, { name }))}</span>
      </li>`;
    })
    .join('')}</ul>`;
}
