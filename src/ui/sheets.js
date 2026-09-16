/**
 * The two stylesheets that are not on the entry, and the one place that loads
 * them.
 *
 * `src/main.js` concatenates every sheet it imports into one render-blocking
 * bundle that every route waits for, and first contentful paint steps by a
 * whole round trip when that bundle crosses a congestion boundary
 * (`scripts/lighthouse-floor.mjs` carries the measurement). `map.css`,
 * `prayer.css` and `theme-fade.css` left that bundle for their own routes;
 * `index.css` and `saint.css` follow them here, and together they are 21 kB of
 * it.
 *
 * **Unlike those three, these are awaited.** The map cannot draw before the
 * manifest answers and the theme fade is a decoration, so a sheet arriving
 * late costs them nothing. All Saints and a saint's page paint text on their
 * first frame: markup that lands before its sheet is unstyled text that then
 * reflows, which is worse than the round trip the move removes. So
 * `main.js` awaits a view's `styles()` before it renders into the document,
 * and `e2e/route-styles.spec.js` is what holds that await in place.
 *
 * **Lazily, and once.** A bare `import()` at module scope — the shape
 * `views/map.js` and `views/prayer.js` use — would start both fetches on every
 * boot, and a `<link rel="stylesheet">` inserted before the first paint is
 * render-blocking exactly like the entry sheet: measured at +223 ms of FCP on
 * a saint's page, which is the round trip this whole move exists to remove.
 * So each is started by the first thing that actually needs it — the render
 * that awaits it, or the shelf — and memoised in a module variable, and the
 * Daily page, which reads neither until a shelf has something on it, fetches
 * nothing.
 *
 * **The two are order-independent and must stay that way**, because the order
 * their `<link>`s reach the document is the reader's route history: All Saints
 * then a saint puts `index.css` first, a cold saint page puts `saint.css`
 * first. `tests/sheet-order.test.mjs` fails if they ever share a selector
 * again — one did, `.search-field`, and it was dead either way.
 */

/**
 * Empty catches, both of them, and the reason is the same: a sheet that never
 * arrives must leave the page undressed rather than unrendered. The rejection
 * is swallowed here so that the await in `main.js` is always a resolution —
 * degrade the page, never withhold it.
 *
 * **The service worker needed nothing for this** and neither did the Capacitor
 * shell. `public/sw.js` precaches what `dist/index.html` names under `assets/`,
 * which is the entry script and the entry sheet and never was these — a
 * dynamic import gets no `modulepreload` tag — so both sheets are picked up by
 * the same read-through `assets` cache that has always caught `map.css` and
 * `prayer.css`, on the first visit to a route that reads them. The catch above
 * is what an offline visit to a route nobody has opened before now falls back
 * to, and `e2e/pwa.spec.js` still holds the three offline promises.
 */
let indexCss = null;
let both = null;

/** All Saints' own sheet — also the dress every `.index-card` wears. */
export const indexSheet = () => (indexCss ??= import('../styles/index.css').catch(() => {}));

/**
 * Both, for the two surfaces that wear both: a saint's page (its side column
 * is the Index's own list) and the shelf, whose rows are index cards that
 * `saint.css` then re-dresses — including on the Daily page, which is why this
 * is not simply the saint view's own import.
 */
export const cardSheets = () => (both ??= Promise.all([import('../styles/saint.css'), indexSheet()]).catch(() => {}));
