/*
 * The one long task the All Saints row costs at startup, measured tightly:
 * `RUNS` fresh loads, the longest task of each, reported as a median.
 *
 * The eight-second blocked-thread total is too noisy at heavy throttle to see
 * a hundred milliseconds — it read 1,709 to 2,114 on the *same* build — so a
 * change worth keeping has to be visible in this instead.
 */
import { chromium } from '@playwright/test';

const RATE = Number(process.env.RATE ?? 10);
const RUNS = Number(process.env.RUNS ?? 5);
const browser = await chromium.launch();
const worst = [];
const paints = [];

for (let i = 0; i < RUNS; i += 1) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__long.push(Math.round(e.duration));
    }).observe({ entryTypes: ['longtask'] });
  });
  await page.goto('http://localhost:4173/saints', { waitUntil: 'commit' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await page.waitForTimeout(6000);
  const got = await page.evaluate(() => ({
    worst: Math.max(0, ...window.__long),
    cells: document.querySelectorAll('[data-carousel] .cx-cell').length,
    painted: Math.round(performance.getEntriesByType('paint').at(-1)?.startTime ?? 0),
  }));
  worst.push(got.worst);
  paints.push(got.painted);
  if (i === 0) console.log(`  (${got.cells} cells)`);
  await ctx.close();
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`x${RATE}  longest task: median ${med(worst)} ms   ${worst.join(' ')}`);
console.log(`      last paint:   median ${med(paints)} ms   ${paints.join(' ')}`);
await browser.close();
