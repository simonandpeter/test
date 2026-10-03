import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 360, height: 760 } })).newPage();
await page.goto('http://localhost:4173/prayer', { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, 260));
await page.waitForTimeout(500);
console.log(JSON.stringify(await page.evaluate(() => {
  const c = document.querySelector('.index-controls');
  const r = c.getBoundingClientRect();
  const cs = getComputedStyle(c);
  const kids = [...c.children].map((k) => ({
    cls: k.className, h: Math.round(k.getBoundingClientRect().height),
    bg: getComputedStyle(k).backgroundColor, disp: getComputedStyle(k).display,
  }));
  return {
    classes: c.className, box: { top: Math.round(r.top), h: Math.round(r.height) },
    bg: cs.backgroundColor, pos: cs.position,
    viewCls: c.parentElement.className, kids,
  };
})));
await b.close();
