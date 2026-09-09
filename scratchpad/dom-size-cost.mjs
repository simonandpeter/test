/**
 * What does the row's *size* cost, with everything else held still?
 *
 * `content-visibility: auto` is already on `.cx-cell`, so off-screen cells are
 * not being laid out. If the remaining cost is node creation and style, a row
 * held at the 180-saint prefix should be measurably cheaper than the full one;
 * if it is not, virtualising the row buys nothing and the 2,293 ms of native
 * work is somewhere else entirely.
 */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const full of [true, false]) {
  const times = [];
  let cells = 0;
  for (let run = 0; run < 3; run += 1) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript((noRest) => {
      localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open','lang-open'] }));
      if (noRest) window.__noPackRest = true;
      window.__tasks = [];
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__tasks.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
    }, !full);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 10 });
    const t0 = Date.now();
    await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
    await page.locator('.cx-card').first().waitFor({ timeout: 60000 });
    const ready = Date.now() - t0;
    await page.waitForTimeout(3500);
    const tasks = await page.evaluate(() => window.__tasks.sort((a,b)=>b-a));
    cells = await page.evaluate(() => document.querySelectorAll('[data-carousel-track] > *').length);
    times.push({ ready, longest: tasks[0] ?? 0, over50: tasks.length });
    await ctx.close();
  }
  const med = (k) => times.map((t) => t[k]).sort((a,b)=>a-b)[1];
  console.log(`${full ? 'full row ' : 'prefix   '} ${cells} cells — ready ${med('ready')} ms, longest ${med('longest')} ms, ${med('over50')} tasks over 50 ms`);
}
await browser.close();
