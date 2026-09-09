/** Does the whole corpus reach the row, and how long after first paint? */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const rate of [1, 10]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open','lang-open'] })));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const t0 = Date.now();
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
  await page.locator('.cx-card').first().waitFor({ timeout: 60000 });
  const firstPaint = Date.now() - t0;
  const cells = () => page.evaluate(() => document.querySelectorAll('[data-carousel-track] > *').length);
  const atFirst = await cells();
  let last = -1, stable = 0, grown = atFirst;
  while (Date.now() - t0 < 30000) {
    const n = await cells();
    if (n === last) { if (++stable > 6) break; } else { stable = 0; grown = n; }
    last = n;
    await page.waitForTimeout(100);
  }
  const saints = await page.evaluate(() => document.querySelectorAll('[data-carousel-track] a.cx-card').length);
  console.log(`${String(rate).padStart(2)}x  first paint ${firstPaint} ms with ${atFirst} cells → settled at ${grown} cells, ${saints} cards, after ${Date.now() - t0} ms`);
  await ctx.close();
}
await browser.close();
