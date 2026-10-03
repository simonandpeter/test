/**
 * Long tasks, paint milestones and layout shifts on a route.
 *   node scratchpad/tasks-probe.mjs [route] [rate] [width]
 */
import { chromium } from '@playwright/test';

const route = process.argv[2] ?? '/saints';
const rate = Number(process.argv[3] ?? 6);
const width = Number(process.argv[4] ?? 360);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 780 } });
const cdp = await page.context().newCDPSession(page);

await page.addInitScript(() => {
  window.__long = [];
  window.__paint = [];
  window.__shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__long.push({ t: Math.round(e.startTime), d: Math.round(e.duration), name: e.name, attr: (e.attribution || []).map((a) => a.name).join(',') });
  }).observe({ type: 'longtask', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__paint.push({ t: Math.round(e.startTime), name: e.name });
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        t: Math.round(e.startTime),
        value: Number(e.value.toFixed(5)),
        sources: (e.sources || []).map((s) => ({
          sel: s.node ? s.node.nodeName.toLowerCase() + (typeof s.node.className === 'string' && s.node.className ? '.' + s.node.className.trim().split(/\s+/).join('.') : '') : '?',
          from: s.previousRect && [Math.round(s.previousRect.x), Math.round(s.previousRect.y), Math.round(s.previousRect.width), Math.round(s.previousRect.height)],
          to: s.currentRect && [Math.round(s.currentRect.x), Math.round(s.currentRect.y), Math.round(s.currentRect.width), Math.round(s.currentRect.height)],
        })),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
});

await page.goto('http://localhost:4173' + route, { waitUntil: 'commit' });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(9000);

const [long, paint, shifts] = await Promise.all([
  page.evaluate(() => window.__long),
  page.evaluate(() => window.__paint),
  page.evaluate(() => window.__shifts),
]);
console.log(`route=${route} rate=${rate}x width=${width}`);
console.log('paint:', paint.map((p) => `${p.name}@${p.t}`).join('  '));
console.log(`long tasks (${long.length}), total ${long.reduce((a, t) => a + t.d, 0)} ms:`);
for (const t of long) console.log(`  ${String(t.t).padStart(5)}ms  ${String(t.d).padStart(5)} ms  ${t.attr}`);
console.log(`CLS ${shifts.reduce((a, s) => a + s.value, 0).toFixed(4)} over ${shifts.length}:`);
for (const s of shifts) {
  console.log(`  ${String(s.t).padStart(5)}ms  ${s.value}`);
  for (const src of s.sources.slice(0, 5)) console.log(`      ${src.sel} ${JSON.stringify(src.from)} -> ${JSON.stringify(src.to)}`);
}
await browser.close();
