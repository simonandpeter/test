/* The three quantities the carousel tests read off the row, taken at the
   instant `.cx-card` is visible and again after `packedRow`'s poll, at CPU
   rates that stand in for parallel load. Needs a running `npm run preview`.
   `node scratchpad/row-reads-probe.mjs [rates]` */
import { chromium } from '@playwright/test';

const rates = (process.argv[2] ?? '1,6,10,20').split(',').map(Number);
const BASE = 'http://localhost:4173';

const read = (page) =>
  page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    return {
      cells: track ? track.querySelectorAll(':scope > .cx-cell').length : 0,
      imgs: track ? track.querySelectorAll('img').length : 0,
      hand: [...document.querySelectorAll('[data-carousel-track] .cx-card')]
        .slice(0, 10)
        .map((el) => el.dataset.prefetch)
        .join(','),
    };
  });

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
    await page.goto(`${BASE}/saints?seed=e2e-shared-hand`, { waitUntil: 'networkidle' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.reload({ waitUntil: 'commit' });
    await page.locator('.cx-card').first().waitFor({ state: 'visible', timeout: 60000 });
    const bare = await read(page);

    const started = Date.now();
    while (Date.now() - started < 20000) {
      if ((await read(page)).cells > 100) break;
      await page.waitForTimeout(100);
    }
    const polled = await read(page);
    console.log(
      `${String(rate).padStart(3)}x pass ${pass}` +
        `  cells ${String(bare.cells).padStart(3)} → ${String(polled.cells).padStart(3)} (floor 100)` +
        `  imgs ${String(bare.imgs).padStart(3)} → ${String(polled.imgs).padStart(3)} (floor 40)` +
        `  hand ${bare.hand === polled.hand ? 'same ' : 'MOVED'}`,
    );
    await ctx.close();
  }
}
await browser.close();
