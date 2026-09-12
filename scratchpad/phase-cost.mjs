/**
 * How long each phase of All Saints' boot actually takes, by the clock rather
 * than by sampling.
 *
 * `cpu-profile.mjs` and `attribute.mjs` sample, and on this desk the same
 * phase came back as 287 ms in one run and 16 ms in the next — a spread wide
 * enough to argue either side of a fix. This wraps the four candidates in
 * `performance.now()` instead, and it does it by **rewriting the dev server's
 * modules in flight** (`page.route`) so the working tree is never touched.
 *
 * `serviceWorkers: 'block'` because `page.route` cannot see a service worker's
 * requests (trap 13), and the interception count is printed — a pattern that
 * matches nothing fails open and would report every phase as zero.
 *
 *   npm run dev                      # unbundled modules, real names
 *   node scratchpad/phase-cost.mjs 10 http://localhost:5174 [runs]
 */
import { chromium } from '@playwright/test';

const [, , rate = '10', base = 'http://localhost:5174', runs = '5'] = process.argv;
const MODE = process.env.PHASE_MODE ?? 'carousel';
const VIEWPORT = process.env.PHASE_WIDTH
  ? { width: Number(process.env.PHASE_WIDTH), height: 640 }
  : { width: 1280, height: 900 };

/** name → [find, replace]; each wraps one function in a timer on `window.__ph`. */
const wrap = (name, head, tail) => [head, `${head.split('(')[0]}(...__a){const __t=performance.now();try{return ${tail}(...__a)}finally{const w=(window.__ph??={});w[${JSON.stringify(name)}]=(w[${JSON.stringify(name)}]||0)+(performance.now()-__t);w[${JSON.stringify(name + 'N')}]=(w[${JSON.stringify(name + 'N')}]||0)+1}}\nfunction ${tail}(`];

/*
 * **The back-out, served instead of the fix.** `PHASE_BACKOUT=1` rewrites the
 * three 2026-09-12 changes out of the modules on their way to the browser, so
 * both sides of the comparison run against the same dev server, the same
 * corpus and the same minute of this desk's load. Interleaving A and B is the
 * only way the numbers mean anything here — the wall clock drifted by a factor
 * of four across seven consecutive identical runs.
 */
const BACKOUT = process.env.PHASE_BACKOUT
  ? [
      ['**/views/index/grid.js*', [["  if (state.mode === 'carousel') {", '  if (false) {']]],
      [
        '**/views/index/modes.js*',
        [
          ['let cache = captionPen.caches.get(sig);', 'let cache = undefined;'],
          [
            'packKey === state.carouselPackKey && state.carouselRun',
            'false && state.carouselPackKey && state.carouselRun',
          ],
        ],
      ],
    ]
  : [];

const PATCHES = [
  ['**/lib/virtual-grid.js*', [wrap('gridLayout', 'export function layout(', '__layout')]],
  [
    '**/views/index/grid.js*',
    [wrap('paintWindow', 'export function paintWindow(', '__paintWindow')],
  ],
  [
    '**/views/index/modes.js*',
    [
      wrap('captionPack', 'export function carouselCells(', '__carouselCells'),
      [
        '  const paint = (buffer) => {',
        '  const paint = (...__a) => { const __t = performance.now(); try { return __paint(...__a); } finally { const w = (window.__ph ??= {}); w.rowHTML = (w.rowHTML || 0) + (performance.now() - __t); w.rowHTMLN = (w.rowHTMLN || 0) + 1; } };\n  const __paint = (buffer) => {',
      ],
    ],
  ],
].map(([glob, edits]) => [glob, [...edits, ...(BACKOUT.find(([g]) => g === glob)?.[1] ?? [])]]);

const browser = await chromium.launch();
const all = [];
for (let i = 0; i < Number(runs); i += 1) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  let hits = 0;
  let missed = [];
  for (const [glob, edits] of PATCHES) {
    await page.route(glob, async (route) => {
      const res = await route.fetch();
      let body = await res.text();
      for (const [find, replace] of edits) {
        if (!body.includes(find)) missed.push(find);
        else body = body.replace(find, replace);
      }
      hits += 1;
      await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
    });
  }
  await page.addInitScript((m) => {
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({
        church: 'russian',
        language: 'en',
        reckoning: 'gregorian',
        indexMode: m,
        coachSeen: ['church-open', 'lang-open'],
      }),
    );
    /*
     * **Blocking time before the first card, not the wall clock.** `ready`
     * includes the network and the module graph and drifts by a factor of two
     * between identical runs on this desk; the sum of the long tasks that
     * finish before the first card is on screen is the thing a reader feels
     * and is far quieter. `__cardAt` is stamped by an observer in the page,
     * so it is the same clock as the tasks.
     */
    window.__tasks = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__tasks.push([Math.round(e.startTime), Math.round(e.duration)]);
    }).observe({ entryTypes: ['longtask'] });
    window.__cardAt = null;
    const look = new MutationObserver(() => {
      if (window.__cardAt === null && document.querySelector('.cx-card')) {
        window.__cardAt = Math.round(performance.now());
        look.disconnect();
      }
    });
    addEventListener('DOMContentLoaded', () => look.observe(document.body, { childList: true, subtree: true }));
  }, MODE);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  const t0 = Date.now();
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
  await page.locator(MODE === 'carousel' ? '.cx-card' : 'main').first().waitFor({ timeout: 60000 });
  const ready = Date.now() - t0;
  const atPaint = await page.evaluate(() => ({ ...(window.__ph ?? {}) }));
  await page.waitForTimeout(3000);
  const settled = await page.evaluate(() => ({ ...(window.__ph ?? {}) }));
  const blocking = await page.evaluate(() => {
    const at = window.__cardAt ?? Infinity;
    const before = window.__tasks.filter(([s]) => s < at);
    return {
      cardAt: window.__cardAt,
      blockingMs: before.reduce((t, [, d]) => t + d, 0),
      longest: Math.max(0, ...before.map(([, d]) => d)),
      count: before.length,
    };
  });
  await ctx.close();
  if (missed.length) console.error(`!! patch missed: ${[...new Set(missed)].join(' | ')}`);
  all.push({ ready, hits, atPaint, settled, ...blocking });
}
await browser.close();

const keys = ['gridLayout', 'captionPack', 'rowHTML', 'paintWindow'];
const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`${MODE} at ${rate}x, ${VIEWPORT.width}px, ${all.length} runs — modules patched per run: ${all[0].hits}`);
console.log(`ready (ms):        ${all.map((r) => r.ready).join(', ')}   median ${med(all.map((r) => r.ready))}`);
console.log(`cardAt (ms):       ${all.map((r) => r.cardAt).join(', ')}   median ${med(all.map((r) => r.cardAt))}`);
console.log(`blocking pre-card: ${all.map((r) => r.blockingMs).join(', ')}   median ${med(all.map((r) => r.blockingMs))}   longest ${all.map((r) => r.longest).join(', ')}`);
for (const k of keys) {
  const at = all.map((r) => Math.round(r.atPaint[k] ?? 0));
  const set = all.map((r) => Math.round(r.settled[k] ?? 0));
  console.log(
    `${k.padEnd(12)} at paint ${String(med(at)).padStart(5)} ms (${med(all.map((r) => r.atPaint[`${k}N`] ?? 0))}x)   by settle ${String(med(set)).padStart(5)} ms (${med(all.map((r) => r.settled[`${k}N`] ?? 0))}x)   [${at.join(',')}]`,
  );
}
