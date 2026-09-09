/** What the row actually puts in the DOM, and how much of it is on screen. */
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open','lang-open'] })));
await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
await page.locator('.cx-card').first().waitFor();
await page.waitForTimeout(4000);
const m = await page.evaluate(() => {
  const track = document.querySelector('[data-carousel-track]');
  const cells = [...track.children];
  const vw = window.innerWidth;
  const onScreen = cells.filter((c) => { const r = c.getBoundingClientRect(); return r.right > 0 && r.left < vw; });
  return {
    cells: cells.length,
    cards: track.querySelectorAll('a.cx-card').length,
    imgs: track.querySelectorAll('img').length,
    imgsLoaded: [...track.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth).length,
    nodes: track.querySelectorAll('*').length,
    onScreenCells: onScreen.length,
    trackWidth: Math.round(track.scrollWidth),
    viewport: vw,
    docNodes: document.querySelectorAll('*').length,
  };
});
console.log(m);
await browser.close();
