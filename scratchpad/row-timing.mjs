/**
 * Two numbers: when the reader first has a row, and when the row stops being
 * replaced under them.
 *
 *   node scratchpad/row-timing.mjs [rate] [width] [runs]
 */
import { chromium } from '@playwright/test';
import { serveDist } from './serve.mjs';

const site = await serveDist();

const rate = Number(process.argv[2] ?? 1);
const width = Number(process.argv[3] ?? 360);
const runs = Number(process.argv[4] ?? 5);

const browser = await chromium.launch();
const first = [];
const last = [];
const builds = [];

for (let i = 0; i < runs; i++) {
  const page = await browser.newPage({ viewport: { width, height: 780 } });
  const cdp = await page.context().newCDPSession(page);
  await page.addInitScript(() => {
    window.__b = [];
    const watch = () => {
      const track = document.querySelector('[data-carousel-track]');
      if (!track) return setTimeout(watch, 5);
      const note = () => {
        const n = track.querySelectorAll('.cx-card').length;
        if (n) window.__b.push({ t: Math.round(performance.now()), n });
      };
      note();
      new MutationObserver(note).observe(track, { childList: true });
    };
    watch();
  });
  await page.goto(site.base + '/saints', { waitUntil: 'commit' });
  if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.waitForTimeout(rate > 1 ? 12000 : 6000);
  const b = await page.evaluate(() => window.__b);
  first.push(b[0]?.t ?? -1);
  last.push(b[b.length - 1]?.t ?? -1);
  builds.push(b.length);
  await page.close();
}

const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(`rate=${rate}x width=${width} runs=${runs}`);
console.log(`  first row    median ${med(first)} ms   ${first.join(' ')}`);
console.log(`  settled row  median ${med(last)} ms   ${last.join(' ')}`);
console.log(`  builds       ${builds.join(' ')}`);
await browser.close();
await site.close();
