/** What a collapsed picture in the carousel actually looks like. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open','lang-open'] })));
await page.goto(`${base}/saints`, { waitUntil: 'networkidle' });
await page.locator('.cx-card').first().waitFor();
await page.waitForFunction(() => document.querySelectorAll('[data-carousel-track] > .cx-cell').length > 100, null, { timeout: 20000 });
await page.waitForTimeout(700);
console.log(await page.evaluate(() => {
  const track = document.querySelector('[data-carousel-track]');
  const imgs = [...track.querySelectorAll('img')];
  const bad = imgs.filter((i) => Math.round(i.getBoundingClientRect().height) === 0);
  return {
    total: imgs.length,
    collapsed: bad.length,
    rows: bad.slice(0, 5).map((i) => ({
      hasSrc: i.hasAttribute('src'),
      hasSrcset: i.hasAttribute('srcset'),
      sizes: i.getAttribute('sizes'),
      w: i.getAttribute('width'),
      h: i.getAttribute('height'),
      cvSkipped: !!i.closest('.cx-cell') && getComputedStyle(i.closest('.cx-cell')).contentVisibility,
      cellBox: Math.round(i.closest('.cx-cell').getBoundingClientRect().height),
      mediaBox: Math.round(i.closest('.cx-media').getBoundingClientRect().height),
      cssH: getComputedStyle(i).height,
      complete: i.complete,
      natural: `${i.naturalWidth}x${i.naturalHeight}`,
    })),
  };
}));
await browser.close();
