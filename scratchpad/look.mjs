import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', coachmarks: { church: true, language: true } }));
  localStorage.setItem('gos-coachmarks', JSON.stringify({ church: true, language: true }));
});

// 1. Carousel: does it move from the start, and do pictures/words fade?
await page.goto('http://localhost:4173/saints', { waitUntil: 'commit' });
const t0 = Date.now();
const samples = [];
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(120);
  samples.push(
    await page.evaluate(() => {
      const track = document.querySelector('[data-carousel-track]');
      if (!track) return null;
      const imgs = [...track.querySelectorAll('.cx-media img')];
      const loaded = imgs.filter((i) => i.classList.contains('is-loaded')).length;
      const ops = imgs.slice(0, 6).map((i) => getComputedStyle(i).opacity);
      // The caption fade is a mask since the axe pass caught the opacity one;
      // read the mask's first stop rather than an opacity that no longer moves.
      const caps = [...track.querySelectorAll('.cx-name')]
        .slice(0, 6)
        .map((n) => (getComputedStyle(n).webkitMaskImage || getComputedStyle(n).maskImage).match(/rgba?\([^)]*\)|#[0-9a-f]+/)?.[0] ?? '?');
      return { scrollLeft: Math.round(track.scrollLeft), loaded, imgs: imgs.length, ops, caps };
    }),
  );
  if (i === 2) await page.screenshot({ path: 'shots/look-carousel-early.png', clip: { x: 0, y: 0, width: 1280, height: 520 } });
}
console.log('carousel samples (every 120ms):');
for (const s of samples) console.log(JSON.stringify(s));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/look-carousel-late.png', clip: { x: 0, y: 0, width: 1280, height: 520 } });

// 2. Map: Chrysostom's rail, and the atlas labels.
await page.goto('http://localhost:4173/map', { waitUntil: 'networkidle' });
const canvas = page.locator('[data-map]');
await page.waitForFunction(() => document.querySelector('[data-map]')?.dataset.land === 'ok');
await page.screenshot({ path: 'shots/look-map-rest.png' });
const slug = process.argv[2] ?? 'john-chrysostom';
const dots = JSON.parse(await canvas.getAttribute('data-dots'));
const dot = dots.find((d) => d.slug === slug);
console.log(slug, 'dot', dot);
const box = await canvas.boundingBox();
await page.mouse.click(box.x + dot.x, box.y + dot.y);
await page.waitForFunction((s) => document.querySelector('[data-map]')?.dataset.selected === s, slug);
await page.waitForTimeout(6500); // flight + walk
await page.screenshot({ path: `shots/look-map-${slug}.png` });
console.log('historical', await canvas.getAttribute('data-historical'));
console.log('rails', await canvas.getAttribute('data-rails'), 'view', await page.evaluate(() => document.querySelector('[data-map]').dataset.zoom));
await browser.close();
