/** Every layout-shift entry on /prayer at 360 px: value, node, and the move. */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 360, height: 780 } });
const cdp = await p.context().newCDPSession(p);
await p.addInitScript(() => {
  window.__e = [];
  new PerformanceObserver((l) => {
    for (const en of l.getEntries()) {
      if (en.hadRecentInput) continue;
      for (const s of en.sources ?? []) {
        const n = s.node;
        window.__e.push({
          v: +en.value.toFixed(4), t: Math.round(en.startTime),
          who: n ? (n.id ? '#' + n.id : n.tagName.toLowerCase() + '.' + String(n.className).split(' ')[0]) : '?',
          from: s.previousRect ? `${Math.round(s.previousRect.y)}+${Math.round(s.previousRect.height)}` : '-',
          to: s.currentRect ? `${Math.round(s.currentRect.y)}+${Math.round(s.currentRect.height)}` : '-',
        });
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await p.goto('http://localhost:4173/prayer', { waitUntil: 'networkidle' });
await p.waitForTimeout(1600);
for (const e of await p.evaluate(() => window.__e)) console.log(JSON.stringify(e));
await b.close();
