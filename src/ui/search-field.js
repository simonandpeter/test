/**
 * The search field — one control, three mounts.
 *
 * All Saints, the saint page's side column and Prayer draw the same box now
 * (author, 2026-09-17: "the search bar should be the exact same as the All
 * Saints page, not any different. SSOT, repeating designed elements"). Prayer's
 * was its own `input.hy-q` with its own height, padding and ground; this module
 * and `styles/search-field.css` are the whole of the field, and the sheet's own
 * comment carries why the drawing is order-independent between the two per-route
 * stylesheets.
 *
 * **What is shared is the control, not the index.** The three search three
 * different things: All Saints runs the whole corpus through
 * `views/index/search.js`, the saint page narrows the list beside it, and
 * Prayer has its own MiniSearch over the hymnal's saints (`views/prayer/find.js`
 * — a third of the bundle, loaded on demand, and neither index is reusable
 * from the other page). So each caller keeps its own querying and hands this
 * module only what to do with what was typed.
 *
 * **The accessible name is always on `aria-label`, never only in the
 * placeholder**, because a placeholder disappears at the first keystroke,
 * which is exactly when a name is still needed. The placeholder itself is the
 * caller's words: All Saints spends its width on the fields a reader may type
 * ("Search: name, type, church, region") where Prayer's has to be read whole
 * inside a 360 px field, and `ui/strings.js` carries that reasoning beside the
 * string. Same behaviour, each page's own prompt.
 */

import { escapeHtml as esc } from '../lib/markdown.js';

/**
 * The field's markup.
 *
 * `autocomplete="off"` on all three: every one of them narrows a list that is
 * already on the screen, and the UA's own dropdown of past entries covers the
 * answer the reader is typing towards. Prayer asked for this from the start and
 * the other two now agree with it.
 *
 * @param {object} o
 * @param {string} o.label      the accessible name
 * @param {string} [o.placeholder]  the drawn prompt; the label when absent
 * @param {string} [o.attrs]    the caller's own hooks, e.g. `data-query`
 */
export const searchField = ({ label, placeholder = label, attrs = '' }) =>
  `<input class="search-field" type="search" autocomplete="off" ${attrs}
      aria-label="${esc(label)}"
      placeholder="${esc(placeholder)}" />`;

/**
 * One listener on the field, handing the caller what was typed.
 *
 * All Saints does not use this: its whole filter block is read by a single
 * delegated `input` listener on the block (`views/index/controls.js`), so the
 * field is read there with the facets rather than separately, and a second
 * listener on the same element would read the same state twice.
 *
 * @param {HTMLInputElement|null} field
 * @param {(query: string) => void} onQuery
 */
export function wireSearchField(field, onQuery) {
  field?.addEventListener('input', (e) => onQuery(e.target.value));
}
