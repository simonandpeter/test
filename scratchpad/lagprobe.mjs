import { chromium } from 'playwright';

const URL = process.env.BASE ?? 'http://localhost:4173';
const RATE = Number(process.env.RATE ?? 1);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })));

const cdp = await ctx.newCDPSession(page);

const t0 = Date.now();
await page.goto(`${URL}/saints`, { waitUntil: 'commit' });
if (RATE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

// First row: when the carousel track first has cells laid out.
const firstRow = await page.evaluate(() => new Promise((done) => {
  const start = performance.now();
  const tick = () => {
    const t = document.querySelector('.carousel-track');
    if (t && t.children.length > 0) return done(Math.round(performance.now() - start));
    requestAnimationFrame(tick);
  };
  tick();
}));

// Longest blocking task during the load.
const long = await page.evaluate(() => new Promise((done) => {
  const seen = [];
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) seen.push(Math.round(e.duration)); })
      .observe({ entryTypes: ['longtask'] });
  } catch { /* longtask unsupported */ }
  setTimeout(() => done(seen.sort((a, c) => c - a).slice(0, 6)), 2500);
}));

const cells = await page.evaluate(() => document.querySelectorAll('.carousel-track > *').length);

// Advanced search: press the toggle, time to the facets being laid out.
const toggle = page.locator('button[data-mode-toggle]');
await toggle.waitFor();
const press = await page.evaluate(() => new Promise((done) => {
  const btn = document.querySelector('button[data-mode-toggle]');
  const start = performance.now();
  btn.click();
  const tick = () => {
    const f = document.querySelector('.facets');
    if (f && f.getBoundingClientRect().height > 0) return done(Math.round(performance.now() - start));
    requestAnimationFrame(tick);
  };
  tick();
}));

const after = await page.evaluate(() => ({
  grid: document.querySelectorAll('.index-grid > *').length,
  track: document.querySelectorAll('.carousel-track > *').length,
}));

console.log(JSON.stringify({ rate: RATE, firstRowMs: firstRow, cellsAtFirstRow: cells, longTasksMs: long, advancedPressMs: press, after }));
await b.close();
