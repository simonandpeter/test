/* The exact poll the carousel test now runs, at CPU rates this desk can be
   made to hit: does "two consecutive equal readings" settle on the 60-cell
   prefix, or on the whole run? Needs a running `npm run preview`.
   `node scratchpad/settle-probe.mjs [rates]` */
import { chromium } from '@playwright/test';

const rates = (process.argv[2] ?? '1,6,10,20').split(',').map(Number);
const BASE = 'http://localhost:4173';
const cells = (page) =>
  page.evaluate(() => document.querySelectorAll('[data-carousel-track] > .cx-cell').length);

const browser = await chromium.launch();
for (const rate of rates) {
  for (const pass of [1, 2, 3]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript(() => {
      const key = 'gos-settings';
      const now = JSON.parse(localStorage.getItem(key) ?? '{}');
      localStorage.setItem(
        key,
        JSON.stringify({ ...now, indexMode: 'carousel', church: 'russian', language: 'en', reckoning: 'gregorian' }),
      );
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${BASE}/saints`, { waitUntil: 'networkidle' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.reload({ waitUntil: 'commit' });
    await page.locator('.cx-card').first().waitFor({ state: 'visible', timeout: 60000 });
    const bare = await cells(page);

    let settledAt = 0;
    const started = Date.now();
    while (Date.now() - started < 20000) {
      const now = await cells(page);
      if (now > 100) {
        settledAt = now;
        break;
      }
      await page.waitForTimeout(100);
    }
    console.log(
      `${String(rate).padStart(3)}x pass ${pass}  bare read ${String(bare).padStart(4)}  settles on ${String(settledAt).padStart(4)}  after ${String(Date.now() - started).padStart(5)} ms   floor 100`,
    );
    await ctx.close();
  }
}
await browser.close();
