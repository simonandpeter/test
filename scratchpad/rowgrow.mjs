/** What the narrowed row's cell count does over time, at 1x and 6x. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const rate of [1, 6]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-carousel-track] .cx-card').first().waitFor({ timeout: 60000 });
  await page.locator('[data-query]').fill('martyr');
  const reads = [];
  for (let i = 0; i < 16; i += 1) {
    reads.push(await page.evaluate(() => ({
      cells: document.querySelectorAll('[data-carousel-track] > .cx-cell').length,
      cards: document.querySelectorAll('.cx-card').length,
    })));
    await page.waitForTimeout(400);
  }
  console.log(`${rate}x cells: ${reads.map((r) => r.cells).join(' ')}`);
  console.log(`${rate}x cards: ${reads.map((r) => r.cards).join(' ')}`);
  await page.close();
}
await browser.close();
