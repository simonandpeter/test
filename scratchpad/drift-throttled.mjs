/**
 * The drift test's hover step, at a CPU rate that mimics the two-core runner.
 * Takes `hover` or `move` so the fix can be backed out and the difference seen
 * rather than argued.
 */
import { chromium } from '@playwright/test';

const [, , base = 'http://localhost:4173', how = 'move', rate = '20'] = process.argv;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open', 'lang-open'] })));
await page.goto(`${base}/saints`, { waitUntil: 'networkidle' });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await page.locator('.cx-card').first().waitFor();

const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
try {
  if (how === 'hover') {
    await page.locator('.cx-card').first().hover({ timeout: 8000 });
  } else {
    const row = await page.locator('[data-carousel-track]').boundingBox();
    await page.mouse.move(row.x + row.width / 2, row.y + row.height / 2);
  }
  const held = await at();
  await page.waitForTimeout(1500);
  const now = await at();
  console.log(`${how} @ ${rate}x: OK, and it kept drifting ${held} -> ${now}`);
} catch (e) {
  console.log(`${how} @ ${rate}x: FAILED - ${String(e).split('\n')[0]}`);
}
await browser.close();
