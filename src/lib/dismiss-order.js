/**
 * What Android's back button should dismiss before it leaves the page.
 *
 * Pure so it can be tested without a Capacitor bridge: `lib/native.js` is the
 * only caller and it never runs in a browser, so the order below is otherwise
 * unreachable from any test this repo can run.
 */

/**
 * Outermost first. `open` is what being open looks like in the DOM; `press` is
 * **the element whose own `Escape` handler is bound**, which is not always the
 * one that is visible — the map's search list is shown while the handler sits
 * on the input (`views/map/search.js`), and a selected saint shows the Profile
 * button while the handler sits on the canvas (`views/map/press.js`). A press
 * aimed at the visible element would do nothing at all.
 */
const DISMISS_ORDER = [
  { open: '.church-panel:not([hidden])' },
  { open: '[data-filter-pop]:not([hidden])' },
  { open: '[data-year-pop]:not([hidden])' },
  { open: '[data-search-list]:not([hidden])', press: '[data-search-input]' },
  { open: '[data-profile]:not([hidden])', press: '[data-map]' },
];

/**
 * The element to send `Escape` to, or `null` when nothing is in front of the
 * reader and back means leave.
 *
 * @param {{ querySelector: (sel: string) => unknown }} doc a document, or
 *   anything that answers `querySelector` — which is what makes this testable.
 */
export function dismissTarget(doc) {
  for (const { open, press } of DISMISS_ORDER) {
    const found = doc.querySelector(open);
    if (!found) continue;
    return (press && doc.querySelector(press)) || found;
  }
  return null;
}
