import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 360, height: 780 } });
const p = await c.newPage();
await p.goto('http://localhost:5173/texts', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const pick = (s) => { const e = document.querySelector(s); return e ? getComputedStyle(e).fontSize : '—'; };
  return { html: getComputedStyle(document.documentElement).fontSize, body: getComputedStyle(document.body).fontSize,
           h1: pick('h1'), p: pick('main p'), nav: pick('.site-nav a') };
}));
await b.close();
