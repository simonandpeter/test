import { test as base } from '@playwright/test';

/**
 * The suite's `test`, and the one thing it adds: a rehearsal of the runner's
 * text.
 *
 * Three tests went green here and red on CI on 2026-08-27 for one reason, and
 * it was not the code — the runner draws different text. Two things differ from
 * a Windows desk, and both make text wider or narrower rather than wrong:
 *
 * 1. **The webfont never applies.** `font-display: optional` gives Literata a
 *    few frames and then keeps the fallback *for the life of the page*. A cold
 *    runner misses that window almost every time, so the serif is whatever
 *    fontconfig picked, and the 72ch column is 580 px rather than 678.
 * 2. **`system-ui` is DejaVu Sans**, not Segoe UI, and DejaVu is wider — wide
 *    enough to take the ~9.5 px of slack the facet row has and wrap it.
 *
 * `COLD_FACE=1` reproduces both, and harder than the runner does: the webfont
 * is refused, and `--font-utility` is forced to Verdana, which is wider than
 * DejaVu and on every Windows and macOS machine. A layout that holds under
 * this holds on the runner. It is a rehearsal, not a gate — 60 seconds against
 * one spec before pushing beats finding it in a six-minute CI run:
 *
 *     COLD_FACE=1 npm run test:e2e:desktop -- e2e/index.spec.js
 *
 * A test that pins its own face (`the index foot holds one line in a wide
 * utility face`, `a facet chip prints its own word`) overrides this afterwards
 * and still asserts its own budget, which is the point of pinning it.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.COLD_FACE) {
      await page.route('**/*.woff2', (route) => route.abort());
      await page.addInitScript(() => {
        const wide = () => {
          const style = document.createElement('style');
          style.textContent = ':root { --font-utility: Verdana, Geneva, sans-serif !important; }';
          document.head.append(style);
        };
        if (document.head) wide();
        else document.addEventListener('DOMContentLoaded', wide, { once: true });
      });
    }
    await use(page);
  },
});

export { expect } from '@playwright/test';
