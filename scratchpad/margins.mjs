import { chromium } from 'playwright';

const WIDTHS = [360, 768, 1280];
const b = await chromium.launch();
const out = [];
for (const width of WIDTHS) {
  const page = await (await b.newContext({ viewport: { width, height: 800 } })).newPage();
  for (const [name, url] of [['saints', '/saints'], ['prayer', '/prayer']]) {
    await page.goto(`http://localhost:4173${url}`, { waitUntil: 'networkidle' });
    const m = await page.evaluate(() => {
      const R = (s) => document.querySelector(s)?.getBoundingClientRect() ?? null;
      const head = R('.index-head');
      const field = R('.search-field');
      const h1 = R('h1');
      return {
        head: head && { left: head.left, right: innerWidth - head.right },
        field: field && { left: field.left, right: innerWidth - field.right },
        h1: h1 && { left: h1.left, right: innerWidth - h1.right },
      };
    });
    out.push({ width, name, ...m });
  }
  await page.close();
}
await b.close();
for (const r of out) console.log(JSON.stringify(r));
