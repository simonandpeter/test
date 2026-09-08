/* The strip: how much of each page shows, the edge fade, and when the glide starts. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();

for (const w of [320, 360, 412]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const track = document.querySelector('.site-nav');
    const box = track.getBoundingClientRect();
    const kids = [...track.children]
      .map((a) => ({ key: a.dataset.navKey, r: a.getBoundingClientRect() }))
      .sort((a, b) => a.r.left - b.r.left);
    const shown = kids.map((k) => {
      const vis = Math.max(0, Math.min(k.r.right, box.right) - Math.max(k.r.left, box.left));
      return `${k.key} ${Math.round((vis / k.r.width) * 100)}%`;
    });
    const on = kids.filter((k) => k.r.right > box.left && k.r.left < box.right);
    return {
      shown: shown.join('  '),
      gapL: Math.round(Math.max(0, on[0].r.left - box.left)),
      gapR: Math.round(Math.max(0, box.right - on[on.length - 1].r.right)),
      mask: getComputedStyle(track).maskImage !== 'none' || getComputedStyle(track).webkitMaskImage !== 'none',
      itemW: Math.round(kids[0].r.width),
    };
  });
  console.log(`${w}px  item ${r.itemW}px  mask ${r.mask}  gaps ${r.gapL}/${r.gapR}\n      ${r.shown}`);
  await ctx.close();
}

// When does the strip start moving after the press, and does the page wait for it?
const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const timing = await page.evaluate(async () => {
  const track = document.querySelector('.site-nav');
  const start = track.scrollLeft;
  const t0 = performance.now();
  let movedAt = null;
  let swappedAt = null;
  let running = true;
  const heading = document.querySelector('#view h1')?.textContent ?? '';
  const tick = () => {
    if (movedAt === null && Math.abs(track.scrollLeft - start) > 2) movedAt = performance.now() - t0;
    const h = document.querySelector('#view h1')?.textContent ?? '';
    if (swappedAt === null && h && h !== heading) swappedAt = performance.now() - t0;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.querySelector('.site-nav a[href$="/about"]').click();
  await new Promise((r) => setTimeout(r, 1200));
  running = false;
  return { movedAt: Math.round(movedAt ?? -1), swappedAt: Math.round(swappedAt ?? -1) };
});
console.log(`press: strip starts moving at ${timing.movedAt} ms, the page below changes at ${timing.swappedAt} ms`);
await browser.close();
