/* How many cells are in the carousel track at the moment `.cx-card` first
   becomes visible, against how many there are once the idle repack has
   finished — at a CPU rate this desk can be made to hit. Needs a running
   `npm run preview`. `node scratchpad/cells-probe.mjs [rates]` */
import { chromium } from '@playwright/test';

const rates = (process.argv[2] ?? '1,10,20').split(',').map(Number);
const BASE = 'http://localhost:4173';

const count = (page) =>
  page.evaluate(() => document.querySelectorAll('[data-carousel-track] > .cx-cell').length);

const browser = await chromium.launch();
for (const rate of rates) {
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
  const atFirstCard = await count(page);
  // The sibling test's wait: the row wider than its own viewport.
  await page
    .waitForFunction(
      () => {
        const t = document.querySelector('[data-carousel-track]');
        return t && t.scrollWidth - t.clientWidth > 0;
      },
      { timeout: 60000 },
    )
    .catch(() => {});
  const afterWait = await count(page);
  await page.waitForTimeout(3000);
  const settled = await count(page);
  console.log(
    `${String(rate).padStart(3)}x  at first card ${String(atFirstCard).padStart(4)}   after the row-width wait ${String(afterWait).padStart(4)}   settled ${String(settled).padStart(4)}   floor is 100`,
  );
  await ctx.close();
}
await browser.close();
