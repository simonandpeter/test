import { chromium } from 'playwright';
const b = await chromium.launch();
for (const width of [360, 900, 1280]) {
  const page = await (await b.newContext({ viewport: { width, height: 760 } })).newPage();
  await page.goto('http://localhost:4173/map', { waitUntil: 'networkidle' });
  console.log(width, JSON.stringify(await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height * 100) / 100 : null; };
    return {
      reserve: cs.getPropertyValue('--chrome-h-reserve').trim(),
      navVar: cs.getPropertyValue('--nav-bar-h').trim(),
      chromeBar: h('.chrome-bar'), header: h('header.chrome'), nav: h('nav.site-nav'),
      navPos: getComputedStyle(document.querySelector('nav.site-nav')).position,
    };
  })));
  await page.close();
}
await b.close();
