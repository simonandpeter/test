/**
 * Does the carousel cell's width actually move after first paint?
 *
 * If it never does, the "baseline read mid-pack" story behind the settled
 * measurement in `index-carousel.spec.js` is wrong and the flake is something
 * else. Asks the question the fix assumes the answer to.
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const vp of [{ width: 360, height: 780 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open', 'lang-open'] })));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/saints`, { waitUntil: 'networkidle' });
  const cell = page.locator('.cx-cell:not(.is-names)').first();
  await cell.waitFor();
  const series = [];
  for (let i = 0; i < 12; i += 1) {
    series.push(await cell.evaluate((el) => Math.round(el.getBoundingClientRect().width)));
    await page.waitForTimeout(50);
  }
  console.log(`project ${vp.width}x${vp.height} → widths after first paint: ${series.join(' ')}`);
  await ctx.close();
}
await browser.close();
