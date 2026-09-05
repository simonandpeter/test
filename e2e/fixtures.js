import { test as base } from '@playwright/test';

/**
 * The suite's `test`, and the one thing it adds: a rehearsal of the runner's
 * text. `coldFace` below is that rehearsal on its own, for a page the fixture
 * cannot reach.
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
 * is refused, `--font-utility` is forced to Verdana — wider than DejaVu — and
 * `--font-serif` to Times New Roman, which is *narrower* than Literata, as the
 * runner's fallback serif turned out to be. Both directions are needed and the
 * first version had only one: forcing the utility face alone reproduced the
 * facet row's red and neither of the other two, because a name wrapping and a
 * page's height are the serif's business. With both forced, all three CI
 * failures come back on this desk with the runner's own numbers — a scroll
 * clamped at 1399 rather than 1500, chips on two lines rather than one, and
 * Macarius the New in two lines rather than three.
 *
 * A layout that holds under this holds on the runner. It is a rehearsal, not a
 * gate — 60 seconds against one spec before pushing beats finding it in a
 * six-minute CI run:
 *
 *     COLD_FACE=1 npm run test:e2e:desktop -- e2e/index-grid.spec.js
 *
 * A test that pins its own face (`the index foot holds one line in a wide
 * utility face`, `a facet chip prints its own word`) overrides this afterwards
 * and still asserts its own budget, which is the point of pinning it.
 */

/**
 * Whether this run is the rehearsal. A test may only assert about the forced
 * face when it is actually being forced.
 */
export const COLD = !!process.env.COLD_FACE;

/**
 * The rehearsal itself, applied to one page.
 *
 * **Exported because the fixture below cannot reach every page in the suite.**
 * A test that opens its own `browser.newContext()` — **42 of them do**, for a
 * second viewport or for `reducedMotion` — gets a page the fixture never saw,
 * so under `COLD_FACE=1` half of such a test runs forced and half runs in
 * whatever face this desk resolved. That is worse than not rehearsing at all:
 * the run reports itself as a rehearsal and the block that most needs one is
 * exempt, silently, which is the failure mode the header above warns about. A
 * page opened by hand that measures text calls this, and then asserts it took
 * (`COLD` is what makes that assertion sayable).
 *
 * One implementation, not two: a copy of these three declarations inside a spec
 * would drift from the fixture the first time either changed.
 *
 * **Only the one context that needed it is routed through here so far, and the
 * obvious way to close the other 41 does not work.** Wrapping
 * `browser.newContext` from inside this `page` fixture was tried and measured:
 * it reaches nothing, because **36 of the suite's tests take `{ browser }` and
 * never ask for `page` at all**, so the patch never runs for exactly the tests
 * that open the most contexts. It came back green over both projects and had
 * closed almost none of them — the same shape of silent exemption, one level
 * up. Closing it properly wants a worker-scoped `browser` override and a pin
 * inside a `{ browser }` test to prove it bit.
 */
export async function coldFace(page) {
  if (!COLD) return;
  await page.route('**/*.woff2', (route) => route.abort());
  await page.addInitScript(() => {
    const wide = () => {
      const style = document.createElement('style');
      style.textContent = `:root {
        --font-utility: Verdana, Geneva, sans-serif !important;
        --font-serif: 'Times New Roman', Times, serif !important;
      }`;
      document.head.append(style);
    };
    if (document.head) wide();
    else document.addEventListener('DOMContentLoaded', wide, { once: true });
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await coldFace(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
