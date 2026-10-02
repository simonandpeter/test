/**
 * What pressing *Advanced search* costs, A against B, interleaved.
 *
 * The press hands the whole matched set to `layout()`, and a card's box costs
 * a `measureText` on its name — so with the Greek year written this is 5,232
 * of them inside one task, between the press and the first card. B is that
 * behaviour, rewritten back in on the way to the browser (`page.route`, as
 * `phase-cost.mjs` does it) so both sides run against the same dev server and
 * the same minute of this desk's load; the wall clock here drifts by a factor
 * of four across identical runs, so interleaving is the only way the numbers
 * mean anything.
 *
 *   npm run dev
 *   node scratchpad/adv-press.mjs [cpuRate] [base] [pairs]
 */
import { chromium } from '@playwright/test';

const [, , rate = '4', base = 'http://localhost:5173', pairs = '5'] = process.argv;

/** The three arms, as rewrites of `grid.js` on its way to the browser. */
const LAID = [
  'function commitGrid(result) {',
  'function commitGrid(result) { window.__laid = result.laid;',
];
const CLOCK = [
  'export function layout(',
  `export function layout(...__a){const __t=performance.now();try{return __layout(...__a)}finally{const w=window;w.__lay=(w.__lay||0)+(performance.now()-__t);w.__layN=(w.__layN||0)+1}}
function __layout(`,
];
const ARMS = {
  fix: [],
  nopack: [['if (!state.grid.result.complete) packGrid();', 'if (false) packGrid();']],
  full: [['const until = top + window.innerHeight * (1 + LAYOUT_AHEAD);', 'const until = Infinity;']],
};

async function press(browser, arm) {
  const edits = ARMS[arm];
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
  });
  let hits = 0;
  await page.route('**/views/index/grid.js*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes(LAID[0])) throw new Error('commitGrid not found');
    await route.fulfill({ response: res, body: body.replace(LAID[0], LAID[1]) });
  });
  await page.route('**/lib/virtual-grid.js*', async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes(CLOCK[0])) throw new Error('layout not found');
    await route.fulfill({ response: res, body: body.replace(CLOCK[0], CLOCK[1]) });
  });
  if (edits.length) {
    await page.route('**/views/index/grid.js*', async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      for (const [find, swap] of edits) {
        if (!body.includes(find)) throw new Error(`the ${arm} rewrite matched nothing: ${find}`);
        body = body.replace(find, swap);
      }
      hits++;
      await route.fulfill({ response: res, body });
    });
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  // The dev server transforms the whole module graph per page on a cold cache
  // and this desk is throttled four ways down; the default 30 s is not enough.
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-carousel-track] .cx-cell, [data-carousel-track] .cx-card').first().waitFor({ timeout: 120000 });
  await page.evaluate(() => {
    window.__lt = [];
    new PerformanceObserver((l) => window.__lt.push(...l.getEntries().map((e) => e.duration)))
      .observe({ entryTypes: ['longtask'] });
  });
  const t0 = await page.evaluate(() => performance.now());
  await page.locator('[data-mode-toggle]').click();
  await page.locator('.grid .index-card').first().waitFor();
  const got = await page.evaluate((start) => ({
    toCard: performance.now() - start,
    longest: Math.max(0, ...window.__lt),
    tasks: window.__lt.length,
    blocked: window.__lt.reduce((n, d) => n + d, 0),
    cards: document.querySelectorAll('.grid .index-card').length,
    height: document.querySelector('[data-grid-inner]').style.height,
    laid: window.__laid,
    inLayout: window.__lay,
    calls: window.__layN,
  }), t0);
  if (edits.length && !hits) throw new Error('grid.js was never intercepted');
  await page.close();
  return got;
}

const browser = await chromium.launch();
const runs = { fix: [], nopack: [], full: [] };
for (let i = 0; i < Number(pairs); i++) {
  for (const key of Object.keys(ARMS)) {
    const got = await press(browser, key);
    runs[key].push(got);
    console.log(`${key.padEnd(6)} press→card ${got.toCard.toFixed(0).padStart(5)} ms  longest ${got.longest.toFixed(0).padStart(5)} ms  ${String(got.laid).padStart(4)} of 5232 placed, ${(got.inLayout ?? 0).toFixed(0).padStart(5)} ms inside layout() over ${got.calls} calls`);
  }
}
await browser.close();

const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
for (const key of ['fix', 'full']) {
  const r = runs[key];
  console.log(`\n${key}: median press→card ${med(r.map((x) => x.toCard)).toFixed(0)} ms, median longest task ${med(r.map((x) => x.longest)).toFixed(0)} ms`);
}
