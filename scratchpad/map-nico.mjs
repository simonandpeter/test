/* What the map actually names at Nicomedia. */
import { chromium } from '@playwright/test';
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 360, height: 780 } });
const p = await c.newPage();
await p.goto('http://localhost:4173/map', { waitUntil: 'networkidle' });
await p.waitForSelector('[data-map][data-land="ok"]');
await p.locator('[data-search-input]').fill('nicomedia');
await p.locator('.map-search-row').first().waitFor();
await p.locator('[data-search-input]').press('Enter');
await p.waitForTimeout(3000);
const r = await p.evaluate(() => {
  const cv = document.querySelector('[data-map]');
  const d = (k) => { try { return JSON.parse(cv.dataset[k]); } catch { return cv.dataset[k]; } };
  return {
    scale: cv.dataset.zoom ?? null,
    named: d('named'),
    labels: d('labels'),
    historical: d('historical'),
    blobs: d('blobs'),
    blobOpen: cv.dataset.blobOpen,
    blobCounts: d('blobCounts'),
    dots: (d('dots') || []).length,
  };
});
console.log(JSON.stringify(r, null, 1).slice(0, 1800));
await b.close();
