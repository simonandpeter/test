/**
 * Does the carousel come back where it was left, on a machine slow enough that
 * the second pack has not finished when the row is restored?
 *
 * The desk cannot answer by itself: `e2e/index-carousel.spec.js` at *the row
 * comes back where it was* passes 8 of 8 here with the defect in, because
 * packing finishes before the restore is attempted. CI's two cores at six
 * workers do not, and the gap is what `Emulation.setCPUThrottlingRate` is for
 * (CLAUDE.md: throttle rather than theorise).
 *
 * **It does not reproduce the CI failure, and that is the finding.** 1x, 6x and
 * 20x all restore to within 13 px, with the defect in and with it out. So CPU
 * is not the variable: the row on CI came back at ~89 px of a 2,600 px offset,
 * which is the HEAD rather than a clamped position, so the offset was lost or
 * never applied rather than truncated by a track that had not finished packing.
 *
 * The two candidates, both from the code's own comments, neither demonstrated:
 * `views/index/modes.js:975` discards the remembered offset whenever
 * `carouselKey` is already set, and `views/index/place.js`'s straight write is
 * guarded on `track.clientWidth > 0` — trap 7, a hidden element reports 0 and
 * ignores writes — with nothing retrying it when the guard declines. The same
 * file records a prior incident of this exact shape, 3,760 px lost under
 * reduced motion.
 *
 * What this probe would need to be the right instrument is the manifest
 * arriving late, not the CPU being slow: on CI it is 3.5 s of the boot.
 *
 * Needs `npm run preview` on :4173. `node scratchpad/restore-probe.mjs [rate…]`
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173';
const rates = process.argv.slice(2).map(Number).filter(Boolean);
const RATES = rates.length ? rates : [1, 6, 20];
const SCROLL = 2600;
const TOLERANCE = 140;

const browser = await chromium.launch();

for (const rate of RATES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const cdp = await page.context().newCDPSession(page);

  await page.addInitScript(() => {
    try {
      localStorage.setItem('gos-settings', JSON.stringify({ indexMode: 'carousel' }));
    } catch {
      /* a private window has no storage; the mode toggle below covers it */
    }
  });
  await page.goto(`${BASE}/saints`, { waitUntil: 'networkidle' });
  const toggle = page.locator('[data-mode-toggle]');
  if (await page.locator('[data-carousel-track]').count() === 0) await toggle.click();
  await page.locator('.cx-card').first().waitFor();

  const track = page.locator('[data-carousel-track]');
  await track.evaluate((el, by) => {
    el.scrollLeft += by;
  }, SCROLL);
  const before = await track.evaluate((el) => el.scrollLeft);

  // Throttling only from here, so the row is reached in a known state and the
  // slowness lands where the restore happens.
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  await page.locator('nav.site-nav a[href$="/about"]').click();
  await page.waitForURL(/\/about$/);
  await page.locator('nav.site-nav a[href$="/saints"]').click();
  await page.waitForURL(/\/saints$/);
  await page.locator('.cx-card').first().waitFor();

  let best = Infinity;
  const until = Date.now() + 6000;
  while (Date.now() < until) {
    const at = await page.locator('[data-carousel-track]').evaluate((el) => el.scrollLeft);
    best = Math.min(best, Math.abs(at - before));
    if (best < TOLERANCE) break;
    await page.waitForTimeout(100);
  }
  console.log(
    `${String(rate).padStart(3)}x  left at ${Math.round(before)}  closest ${Math.round(best)} px  ` +
      `${best < TOLERANCE ? 'RESTORED' : 'LOST'}`,
  );
  await page.close();
}

await browser.close();
