/**
 * How long `zoomedToCeiling`'s climb takes at a CPU rate that mimics the
 * two-core runner, and whether it arrives at all.
 *
 * The two zoom-ceiling tests are the last flake family after the carousel's
 * two were solved. The file already gets 60 s a test and the climb bursts
 * rather than settling twenty-five separate flights, so the question is
 * whether that is still not enough or whether it never lands.
 */
import { chromium } from '@playwright/test';

const [, , base = 'http://localhost:4173'] = process.argv;
const browser = await chromium.launch();
for (const rate of [1, 6, 20]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', coachSeen: ['church-open', 'lang-open'] }));
    Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) });
  });
  await page.goto(`${base}/map`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-map][data-land="ok"]').waitFor();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });

  const canvas = page.locator('[data-map]');
  const zoomIn = page.locator('[data-zoom="in"]');
  const level = page.locator('[data-zoom-level]');
  await canvas.focus();
  const t0 = Date.now();
  let bursts = 0;
  for (; bursts < 25 && !(await zoomIn.isDisabled()); bursts += 1) {
    await canvas.press('+');
    let last = null;
    for (let i = 0; i < 40; i += 1) {
      const now = await level.textContent();
      if (now === last) break;
      last = now;
      await page.waitForTimeout(50);
    }
    if (Date.now() - t0 > 55000) break;
  }
  const done = await zoomIn.isDisabled();
  console.log(`${String(rate).padStart(2)}x  ${bursts} presses, ${Date.now() - t0} ms, ceiling ${done ? 'reached' : 'NOT REACHED'} (${await level.textContent()})`);
  await ctx.close();
}
await browser.close();
