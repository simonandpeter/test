/*
 * What the All Saints row actually costs on a phone: long tasks, dropped
 * frames, how many pictures are handed out and how big they are. CPU throttled
 * (trap 10) because a desk without it measures the desk.
 */
import { chromium } from '@playwright/test';

const RATE = Number(process.env.RATE ?? 4);
const SECONDS = Number(process.env.SECONDS ?? 8);

const browser = await chromium.launch();
// `serviceWorkers: 'block'` or `page.route` sees none of these (trap 13): the
// worker answers the image requests and the pattern matches nothing, failing
// open. The request count below is what says whether the block bit.
const ctx = await browser.newContext({
  viewport: { width: 360, height: 780 },
  serviceWorkers: 'block',
  // STILL=1 turns the drift off through the one switch that already does it,
  // to ask what the row costs when it is not moving.
  ...(process.env.STILL ? { reducedMotion: 'reduce' } : {}),
});
const page = await ctx.newPage();

await page.addInitScript(() => {
  window.__long = [];
  window.__frames = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]);
  }).observe({ entryTypes: ['longtask'] });
  let last = performance.now();
  const tick = (t) => {
    window.__frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// NOIMG=1 stubs every card fetch away: what is left is the layout and the
// packing, which is the half a picture cannot be blamed for.
if (process.env.NOIMG) {
  await page.route('**/*-card.jpg', (r) => r.abort());
  await page.route('**/*icon.jpg', (r) => r.abort());
}
await page.goto('http://localhost:4173/saints', { waitUntil: 'commit' });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
// Prove the throttle bit (trap 10): a timed loop, in the page.
const spin = await page.evaluate(() => {
  const t0 = performance.now();
  let n = 0;
  while (performance.now() - t0 < 60) n += 1;
  return n;
});
await page.waitForTimeout(SECONDS * 1000);

const out = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('[data-carousel] img')];
  const started = imgs.filter((i) => i.hasAttribute('src'));
  const res = performance.getEntriesByType('resource').filter((r) => /-card\.jpg|icon\.jpg|-thumb\.jpg/.test(r.name));
  const bytes = res.reduce((s, r) => s + (r.encodedBodySize || 0), 0);
  const frames = window.__frames.slice(10);
  const slow = frames.filter((f) => f > 32).length;
  return {
    cards: document.querySelectorAll('[data-carousel] .cx-cell').length,
    imgs: imgs.length,
    handedOut: started.length,
    loaded: imgs.filter((i) => i.classList.contains('is-loaded')).length,
    requests: res.length,
    kB: Math.round(bytes / 1024),
    longTasks: window.__long.length,
    blockingMs: window.__long.reduce((s, [, d]) => s + Math.max(0, d - 50), 0),
    worstTask: Math.max(0, ...window.__long.map(([, d]) => d)),
    tasks: window.__long.map(([t, d]) => `${t}+${d}`).join(' '),
    frames: frames.length,
    slowFrames: slow,
    worstFrame: Math.round(Math.max(...frames)),
  };
});
console.log(`throttle x${RATE} (spin ${spin})`, JSON.stringify(out, null, 1));
await browser.close();
