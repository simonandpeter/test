/**
 * How long the carousel cell takes to report its new width after the window
 * shortens, at a CPU rate that mimics the two-core runner.
 *
 * The sizing test polls for 10 s. If the repack can exceed that when frames
 * are long, the flake is a budget; if it lands in milliseconds at every rate,
 * it is something else and the poll is not the answer.
 */
import { chromium } from '@playwright/test';

const [, , base = 'http://localhost:4173'] = process.argv;
const browser = await chromium.launch();
for (const rate of [1, 6, 20, 50]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open', 'lang-open'] })));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/saints`, { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const cell = page.locator('.cx-cell:not(.is-names)').first();
  await cell.waitFor();
  const width = () => cell.evaluate((el) => Math.round(el.getBoundingClientRect().width));
  const tall = await width();

  await page.setViewportSize({ width: 1280, height: 560 });
  const t0 = Date.now();
  let short = tall, last = null;
  while (Date.now() - t0 < 20000) {
    const now = await width();
    if (now > 0 && now === last) { short = now; break; }
    last = now;
    await page.waitForTimeout(50);
  }
  console.log(`${String(rate).padStart(2)}x  ${tall} -> ${short} after ${Date.now() - t0} ms (non-zero)${short < tall ? '' : '   NEVER NARROWED'}`);
  await ctx.close();
}
await browser.close();
