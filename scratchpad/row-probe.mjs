/**
 * What happens to the carousel's cards between the first row and the settled
 * one: how many times the track's children are replaced, where a named saint
 * sits each time, and what its caption's mask alpha is doing.
 *
 *   node scratchpad/row-probe.mjs [rate] [width]
 */
import { chromium } from '@playwright/test';
import { serveDist } from './serve.mjs';

const site = await serveDist();

const rate = Number(process.argv[2] ?? 6);
const width = Number(process.argv[3] ?? 360);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 780 } });
const cdp = await page.context().newCDPSession(page);

await page.addInitScript(() => {
  window.__rows = [];
  window.__frames = [];
  const watch = () => {
    const track = document.querySelector('[data-carousel-track]');
    if (!track) return setTimeout(watch, 10);
    // Every time the track's children are wholesale replaced, write a row down.
    new MutationObserver((muts) => {
      let added = 0;
      let removed = 0;
      for (const m of muts) {
        added += m.addedNodes.length;
        removed += m.removedNodes.length;
      }
      if (!added && !removed) return;
      window.__rows.push({
        t: Math.round(performance.now()),
        added,
        removed,
        cards: track.querySelectorAll('.cx-card').length,
        cells: track.children.length,
        scrollLeft: Math.round(track.scrollLeft),
        scrollWidth: track.scrollWidth,
      });
    }).observe(track, { childList: true });

    // Per frame: the pinned saint's box and its caption alpha.
    const PIN = null;
    const tick = () => {
      const t = Math.round(performance.now());
      const cards = track.querySelectorAll('.cx-card');
      const first = cards[0];
      const name = first?.querySelector('.cx-name');
      const img = track.querySelector('.cx-media img');
      window.__frames.push({
        t,
        n: cards.length,
        firstName: name?.textContent?.slice(0, 26) ?? null,
        firstBox: first ? [Math.round(first.getBoundingClientRect().x), Math.round(first.getBoundingClientRect().y)] : null,
        capA: name ? getComputedStyle(name).getPropertyValue('--cx-cap-a').trim() : null,
        imgOp: img ? getComputedStyle(img).opacity : null,
        imgLoaded: img ? img.classList.contains('is-loaded') : null,
        sl: Math.round(track.scrollLeft),
      });
      if (t < 12000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  watch();
});

await page.goto(site.base + '/saints', { waitUntil: 'commit' });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(12500);

const rows = await page.evaluate(() => window.__rows);
const frames = await page.evaluate(() => window.__frames);
console.log(`rate=${rate}x width=${width}`);
console.log('track mutations:');
for (const r of rows) console.log(`  ${String(r.t).padStart(6)}ms  +${r.added} -${r.removed}  cards=${r.cards} cells=${r.cells} scrollLeft=${r.scrollLeft} scrollWidth=${r.scrollWidth}`);
console.log('frames (printed when anything but t/sl changes):');
let prev = null;
for (const f of frames) {
  const k = JSON.stringify({ ...f, t: 0, sl: 0 });
  if (k === prev) continue;
  prev = k;
  console.log(`  ${String(f.t).padStart(6)}ms n=${f.n} first="${f.firstName}" at ${JSON.stringify(f.firstBox)} capA=${f.capA} imgOp=${f.imgOp} loaded=${f.imgLoaded} sl=${f.sl}`);
}
await browser.close();
await site.close();
