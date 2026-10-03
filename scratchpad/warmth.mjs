/**
 * At the instant the row is rebuilt, how much of what the reader can see is
 * actually up? Captions and pictures counted separately, on the frame before
 * the rebuild and on the frame after.
 *
 *   node scratchpad/warmth.mjs [rate] [width]
 */
import { chromium } from '@playwright/test';
import { serveDist } from './serve.mjs';

const site = await serveDist();

const rate = Number(process.argv[2] ?? 1);
const width = Number(process.argv[3] ?? 360);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 780 } });
const cdp = await page.context().newCDPSession(page);

await page.addInitScript(
  ([W, UNTIL]) => {
    window.__w = [];
    const read = (track) => {
      let caps = 0;
      let capSum = 0;
      let imgs = 0;
      let imgSum = 0;
      let loaded = 0;
      for (const c of track.querySelectorAll('.cx-card')) {
        const r = c.getBoundingClientRect();
        if (r.right < 0 || r.left > W || r.width === 0) continue;
        const n = c.querySelector('.cx-name');
        if (n) {
          caps++;
          capSum += Number(getComputedStyle(n).getPropertyValue('--cx-cap-a')) || 0;
        }
        const i = c.querySelector('.cx-media img');
        if (i) {
          imgs++;
          imgSum += Number(getComputedStyle(i).opacity) || 0;
          if (i.classList.contains('is-loaded')) loaded++;
        }
        if (caps > 30) break;
      }
      return { caps, capA: caps ? +(capSum / caps).toFixed(3) : null, imgs, imgOp: imgs ? +(imgSum / imgs).toFixed(3) : null, loaded };
    };
    const watch = () => {
      const track = document.querySelector('[data-carousel-track]');
      if (!track) return setTimeout(watch, 5);
      let before = null;
      const tick = () => {
        const t = Math.round(performance.now());
        if (track.querySelector('.cx-card')) before = { t, ...read(track) };
        if (t < UNTIL) requestAnimationFrame(tick);
      };
      new MutationObserver(() => {
        const row = { when: Math.round(performance.now()), before, after: read(track), later: [] };
        window.__w.push(row);
        for (const d of [0, 100, 300, 600, 1200]) {
          setTimeout(() => row.later.push({ d, ...read(track) }), d);
        }
      }).observe(track, { childList: true });
      requestAnimationFrame(tick);
    };
    watch();
  },
  [width, rate > 1 ? 12000 : 6000],
);

await page.goto(site.base + '/saints', { waitUntil: 'commit' });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(rate > 1 ? 12500 : 6500);

for (const w of await page.evaluate(() => window.__w)) {
  console.log(`rebuild at ${w.when} ms`);
  console.log(`  frame before (${w.before?.t}ms): captions ${w.before?.caps} mean alpha ${w.before?.capA}; pictures ${w.before?.imgs} mean opacity ${w.before?.imgOp}, ${w.before?.loaded} loaded`);
  console.log(`  frame after:  captions ${w.after.caps} mean alpha ${w.after.capA}; pictures ${w.after.imgs} mean opacity ${w.after.imgOp}, ${w.after.loaded} loaded`);
  for (const l of w.later || []) {
    console.log(`  +${String(l.d).padStart(4)}ms:     captions ${l.caps} mean alpha ${l.capA}; pictures ${l.imgs} mean opacity ${l.imgOp}, ${l.loaded} loaded`);
  }
}
await browser.close();
await site.close();
