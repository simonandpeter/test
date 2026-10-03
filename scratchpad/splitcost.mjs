import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' }));
  const proto = CanvasRenderingContext2D.prototype;
  const real = proto.measureText;
  window.__t = { measure: 0, calls: 0 };
  proto.measureText = function (t) {
    const s = performance.now();
    const r = real.call(this, t);
    window.__t.measure += performance.now() - s;
    window.__t.calls += 1;
    return r;
  };
  const ce = Document.prototype.createElement;
  window.__t.created = 0;
  Document.prototype.createElement = function (...a) { window.__t.created += 1; return ce.apply(this, a); };
});
const cdp = await ctx.newCDPSession(page);
await page.goto('http://localhost:4173/saints', { waitUntil: 'commit' });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
const long = await page.evaluate(() => new Promise((done) => {
  const seen = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) seen.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] });
  setTimeout(() => done(seen.sort((a, c) => c - a)), 6000);
}));
console.log(JSON.stringify({ longTasks: long.slice(0, 5), ...await page.evaluate(() => ({
  measureMs: Math.round(window.__t.measure), calls: window.__t.calls, elementsCreated: window.__t.created,
})) }));
await b.close();
