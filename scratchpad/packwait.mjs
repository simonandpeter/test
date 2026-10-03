/** How long after the first card the whole run is in the track, at 1x and 6x. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const rate of [1, 6]) {
  const times = [];
  for (let i = 0; i < 3; i += 1) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-carousel-track] .cx-card').first().waitFor({ timeout: 60000 });
    const t0 = await page.evaluate(() => performance.now());
    await page.waitForFunction(
      () => document.querySelectorAll('[data-carousel-track] > .cx-cell').length > 100,
      null, { timeout: 60000 },
    );
    times.push(await page.evaluate((s) => performance.now() - s, t0));
    await page.close();
  }
  console.log(`${rate}x  first card → whole run: ${times.map((t) => t.toFixed(0)).join(', ')} ms`);
}
await browser.close();
