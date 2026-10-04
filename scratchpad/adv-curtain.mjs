/**
 * How much of the Advanced-search press is the cross-fade.
 *
 * A against B, interleaved, the fade's own length rewritten to 0 on the way to
 * the browser. Nothing else differs, so the gap between the arms is the
 * curtain and the rest is the work.
 *
 *   npm run dev
 *   node scratchpad/adv-curtain.mjs [cpuRate] [base] [pairs]
 */
import { chromium } from '@playwright/test';

const [, , rate = '1', base = 'http://localhost:5173', pairs = '3'] = process.argv;
const FADE = 'const CX_MODE_FADE = DUR.settle;';

async function press(browser, arm) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await page.route('**/views/index/modes.js*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes(FADE)) throw new Error('the fade was not found');
    await route.fulfill({
      response: res,
      body: arm === 'nofade' ? body.replace(FADE, 'const CX_MODE_FADE = 0;') : body,
    });
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-carousel-track] .cx-card').first().waitFor({ timeout: 120000 });
  const t0 = await page.evaluate(() => performance.now());
  await page.locator('[data-mode-toggle]').click();
  await page.locator('.grid .index-card').first().waitFor();
  const toCard = await page.evaluate((s) => performance.now() - s, t0);
  await page.close();
  return toCard;
}

const browser = await chromium.launch();
const runs = { fade: [], nofade: [] };
for (let i = 0; i < Number(pairs); i += 1) {
  for (const arm of ['fade', 'nofade']) runs[arm].push(await press(browser, arm));
}
await browser.close();
for (const arm of ['fade', 'nofade']) {
  console.log(`${arm.padEnd(7)} press → first card: ${runs[arm].map((t) => t.toFixed(0)).join(', ')} ms`);
}
