import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })));
await page.setViewportSize({ width: 446, height: 800 });
await page.goto('http://localhost:4173/prayer', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200)))));
const box = async () => page.evaluate(() => {
  const r = document.querySelector('.index-controls').getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
});
const at = async (y) => { await page.evaluate((t) => scrollTo(0, t), y); await settle(); const bx = await box(); return { bx, buf: await page.screenshot({ clip: bx }) }; };
const a = await at(260); const c = await at(320);
console.log('box', JSON.stringify(a.bx), JSON.stringify(c.bx));
writeFileSync('scratchpad/band-260.png', a.buf);
writeFileSync('scratchpad/band-320.png', c.buf);
console.log('same bytes:', a.buf.equals(c.buf));
console.log('state', JSON.stringify(await page.evaluate(() => {
  const el = document.querySelector('.index-controls');
  return { cls: el.className, view: el.parentElement.className, bg: getComputedStyle(el).backgroundColor,
           kids: [...el.children].map((k) => k.className + ':' + Math.round(k.getBoundingClientRect().height) + ':' + getComputedStyle(k).backgroundColor) };
})));
await b.close();
