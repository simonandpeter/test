/**
 * What a reader actually sees when a city's crowd blobs.
 *
 * Five coordinates crossed `BLOB_MAX` on 17 October where one had; the
 * machinery was built for Nicomedia alone. The tests say the rules hold —
 * this is the look at the picture that no assertion substitutes for, at both
 * widths, over each of the five.
 *
 *   node scratchpad/blob-look.mjs <base> [city…]
 */
import { chromium } from '@playwright/test';

const [base, ...wanted] = process.argv.slice(2);
const CITIES = wanted.length ? wanted : ['constantinople', 'nicomedia', 'alexandria', 'moscow', 'rome'];
const browser = await chromium.launch();

for (const width of [1280, 360]) {
  for (const city of CITIES) {
    const page = await browser.newPage({ viewport: { width, height: 760 } });
    await page.goto(`${base}/map`, { waitUntil: 'domcontentloaded' });
    const canvas = page.locator('[data-map]');
    await canvas.waitFor({ timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.locator('[data-search-input]').fill(city);
    await page.waitForTimeout(900);
    await page.locator('[data-search-input]').press('Enter');
    await page.waitForTimeout(4500);
    for (let i = 0; i < 10; i += 1) {
      await page.locator('[data-zoom="in"]').click({ force: true }).catch(() => {});
      await page.waitForTimeout(260);
    }
    await page.waitForTimeout(1800);
    const named = JSON.parse((await canvas.getAttribute('data-named')) ?? '[]');
    const dots = JSON.parse((await canvas.getAttribute('data-dots')) ?? '[]');
    const blobbed = dots.filter((d) => d.blobId).length;
    console.log(`${String(width).padEnd(5)} ${city.padEnd(16)} dots ${String(dots.length).padStart(3)}  blobbed ${String(blobbed).padStart(3)}  named ${named.length}`);
    await page.screenshot({ path: `shots/blob-${city}-${width}.png` });
    await page.close();
  }
}
await browser.close();
