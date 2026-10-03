/**
 * What the reader has on screen, frame by frame: the names inside the viewport
 * and the strength each is drawn at. The expensive half (finding the visible
 * cards) runs only when the track's children change; the per-frame half reads
 * four pinned nodes, so the instrument does not become the measurement.
 *
 *   node scratchpad/seen-probe.mjs [rate] [width] [ms]
 */
import { chromium } from '@playwright/test';
import { serveDist } from './serve.mjs';

const site = await serveDist();

const rate = Number(process.argv[2] ?? 6);
const width = Number(process.argv[3] ?? 360);
const ms = Number(process.argv[4] ?? 12000);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 780 } });
const cdp = await page.context().newCDPSession(page);

await page.addInitScript(
  ([W, UNTIL]) => {
    window.__log = [];
    window.__rows = [];
    let pins = [];
    const repin = (track) => {
      pins = [];
      for (const c of track.querySelectorAll('.cx-card')) {
        const r = c.getBoundingClientRect();
        if (r.right < 0 || r.left > W || r.width === 0) continue;
        pins.push(c);
        if (pins.length >= 4) break;
      }
      window.__rows.push({
        t: Math.round(performance.now()),
        cards: track.querySelectorAll('.cx-card').length,
        scrollLeft: Math.round(track.scrollLeft),
        onScreen: pins.map((c) => ({
          name: (c.querySelector('.cx-name')?.textContent || '').slice(0, 22),
          x: Math.round(c.getBoundingClientRect().left),
          y: Math.round(c.getBoundingClientRect().top),
        })),
      });
    };
    const watch = () => {
      const track = document.querySelector('[data-carousel-track]');
      if (!track) return setTimeout(watch, 10);
      new MutationObserver(() => requestAnimationFrame(() => requestAnimationFrame(() => repin(track)))).observe(track, { childList: true });
      const tick = () => {
        const t = Math.round(performance.now());
        if (!pins.length && track.querySelector('.cx-card')) repin(track);
        if (pins.length) {
          const read = pins.map((c) => {
            const n = c.querySelector('.cx-name');
            const img = c.querySelector('.cx-media img');
            return {
              a: n ? Number(getComputedStyle(n).getPropertyValue('--cx-cap-a')) : null,
              io: img ? Number(getComputedStyle(img).opacity) : null,
            };
          });
          window.__log.push({ t, a: read.map((r) => r.a), io: read.map((r) => r.io) });
        }
        if (t < UNTIL) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    watch();
  },
  [width, ms],
);

await page.goto(site.base + '/saints', { waitUntil: 'commit' });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(ms + 800);

const rows = await page.evaluate(() => window.__rows);
const log = await page.evaluate(() => window.__log);
console.log(`rate=${rate}x width=${width}  ${log.length} frames sampled`);
console.log('track rebuilds:');
for (const r of rows) {
  console.log(`  ${String(r.t).padStart(6)}ms cards=${r.cards} scrollLeft=${r.scrollLeft}`);
  console.log(`          on screen: ${r.onScreen.map((o) => `${o.name}@${o.x},${o.y}`).join(' / ')}`);
}
console.log('caption alpha / image opacity of the four pinned on-screen cards:');
let prev = null;
for (const f of log) {
  const k = f.a.map((v) => (v == null ? '-' : v.toFixed(2))).join(',') + ' ' + f.io.map((v) => (v == null ? '-' : v.toFixed(2))).join(',');
  if (k === prev) continue;
  prev = k;
  console.log(`  ${String(f.t).padStart(6)}ms  a=[${f.a.map((v) => (v == null ? '-' : v.toFixed(2))).join(' ')}]  img=[${f.io.map((v) => (v == null ? '-' : v.toFixed(2))).join(' ')}]`);
}
await browser.close();
await site.close();
