/**
 * What `waitUntil: 'networkidle'` costs on the map route.
 *
 * `map.spec.js` uses it 80 times and is 160 of the suite's 880 tests but 54%
 * of its wall time — 16.8 s a test against 2.9 s everywhere else, under a 30 s
 * timeout, which is the arithmetic behind "40 of the 61 failures this desk has
 * ever seen". The suspicion is `warmTerrainTiles`: it walks the whole tile grid
 * (158 files, 6 MB) one fetch at a time through `requestIdleCallback`, so a
 * page that is *visually* ready in a second has no idle network for another
 * fifteen.
 *
 * Run against a live preview on :4173. Prints both waits, three times each,
 * plus how many tile requests each one sat through.
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const RUNS = 3;

const time = async (browser, waitUntil) => {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  const page = await ctx.newPage();
  let tiles = 0;
  page.on('request', (r) => {
    if (/terrain-tiles|t-\d+-\d+-(green|relief)/.test(r.url())) tiles += 1;
  });
  const t0 = Date.now();
  await page.goto(`${BASE}/map`, { waitUntil });
  // What every one of those tests asserts immediately afterwards anyway.
  await page.locator('[data-map][data-land="ok"]').waitFor({ timeout: 30_000 });
  const ms = Date.now() - t0;
  await ctx.close();
  return { ms, tiles };
};

const browser = await chromium.launch();
for (const waitUntil of ['networkidle', 'domcontentloaded']) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) runs.push(await time(browser, waitUntil));
  const ms = runs.map((r) => r.ms);
  console.log(
    `${waitUntil.padEnd(18)} ${ms.map((m) => `${m}ms`).join('  ')}   ` +
      `mean ${Math.round(ms.reduce((a, b) => a + b, 0) / RUNS)}ms   ` +
      `tile requests ${runs.map((r) => r.tiles).join('/')}`,
  );
}
await browser.close();
