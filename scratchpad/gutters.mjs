import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 360, height: 800 } })).newPage();
for (const [name, url] of [['saints', '/saints'], ['prayer', '/prayer']]) {
  await page.goto(`http://localhost:4173${url}`, { waitUntil: 'networkidle' });
  const chain = await page.evaluate(() => {
    const field = document.querySelector('.search-field');
    const out = [];
    for (let el = field; el && el !== document.documentElement; el = el.parentElement) {
      const s = getComputedStyle(el);
      out.push({
        tag: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(/\s+/).join('.') : ''),
        left: Math.round(el.getBoundingClientRect().left * 100) / 100,
        pl: s.paddingLeft, ml: s.marginLeft,
      });
    }
    return out;
  });
  console.log('=== ' + name);
  for (const c of chain) console.log(`${String(c.left).padStart(7)}  pl=${c.pl.padStart(8)} ml=${c.ml.padStart(8)}  ${c.tag.slice(0, 70)}`);
}
await b.close();
