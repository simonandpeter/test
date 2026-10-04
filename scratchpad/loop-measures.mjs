/**
 * How many times the carousel re-measures itself while the search face shows.
 *
 * A count, not a clock: `measure()` writes nothing and reads `offsetLeft`, so
 * each call is one forced layout of the whole row. The arms are the guard on
 * the repair, rewritten on the way to the browser.
 *
 *   npm run dev
 *   node scratchpad/loop-measures.mjs [cpuRate] [base]
 */
import { chromium } from '@playwright/test';

const [, , rate = '1', base = 'http://localhost:5173'] = process.argv;
const GUARD = 'if (boxWidth && (!started || !bodySpan)) measure();';
const PROBE = 'function measure() {';

const browser = await chromium.launch();
for (const arm of ['guarded', 'unguarded']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await page.route('**/ui/loop-scroll.js*', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    if (!body.includes(GUARD)) throw new Error('the guard was not found');
    if (!body.includes(PROBE)) throw new Error('measure() was not found');
    body = body.replace(PROBE, `${PROBE} window.__m = (window.__m || 0) + 1;`);
    if (arm === 'unguarded') body = body.replace(GUARD, 'if (!started || !bodySpan) measure();');
    await route.fulfill({ response: res, body });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-carousel-track] .cx-card').first().waitFor({ timeout: 120000 });
  await page.locator('[data-mode-toggle]').click();
  await page.locator('.grid .index-card').first().waitFor();
  const before = await page.evaluate(() => window.__m ?? 0);
  await page.waitForTimeout(2000);
  const after = await page.evaluate(() => window.__m ?? 0);
  console.log(`${arm.padEnd(10)} ${before} measures to the first card, ${after - before} more over the next 2 s`);
  await page.close();
}
await browser.close();
