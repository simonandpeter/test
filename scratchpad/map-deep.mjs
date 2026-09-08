import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2 });
const p = await c.newPage();
await p.goto('http://localhost:4173/map', { waitUntil: 'networkidle' });
await p.waitForSelector('[data-map][data-land="ok"]');
await p.locator('[data-search-input]').fill('nicomedia');
await p.locator('.map-search-row').first().waitFor();
await p.locator('[data-search-input]').press('Enter');
await p.waitForTimeout(3000);
const read = async (tag) => {
  const r = await p.evaluate(() => {
    const cv = document.querySelector('[data-map]');
    const d = (k) => { try { return JSON.parse(cv.dataset[k]); } catch { return null; } };
    return { named: (d('named') || []).length, labels: d('labels'), blobs: d('blobs'), open: cv.dataset.blobOpen, counts: d('blobCounts'), dots: (d('dots') || []).length };
  });
  console.log(tag, JSON.stringify(r));
};
await read('after flight ');
for (const n of [1, 2, 3]) {
  for (let i = 0; i < 4; i += 1) { await p.keyboard.press('='); await p.waitForTimeout(500); }
  await p.waitForTimeout(1200);
  await read(`+${n * 4} zooms`);
}
await p.screenshot({ path: 'shots/map-nico-deep.png' });
await b.close();
