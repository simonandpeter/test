/**
 * **Which boot step the seconds are in**, timed one at a time in the page
 * rather than inferred from a long-task total.
 *
 * `adv-mobile.mjs` says the phone waits ~7 s for a card and that two tasks of
 * 1-2 s are in there; this says what those tasks are. It imports the real
 * modules off the dev server and calls them over the real manifest, so each
 * number is the function the boot path calls and not a re-implementation of
 * it.
 *
 *   npm run dev -- --port 5181
 *   node scratchpad/adv-phases.mjs [cpuRate] [base]
 */
import { chromium } from '@playwright/test';

const [, , rate = '4', base = 'http://localhost:5181'] = process.argv;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(base + '/about');
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });

const out = await page.evaluate(async () => {
  const ms = {};
  const time = async (name, fn) => {
    const t = performance.now();
    const v = await fn();
    ms[name] = Math.round(performance.now() - t);
    return v;
  };

  const text = await time('fetch manifest (localhost, not the wire)', () =>
    fetch('/data/manifest.json').then((r) => r.text()),
  );
  ms['manifest bytes'] = text.length;
  const arr = await time('JSON.parse', () => JSON.parse(text));
  ms['saints'] = arr.length;

  const { indexManifest } = await import('/src/lib/manifest.js');
  const data = await time('indexManifest', () => indexManifest(arr));

  const { facetsOf, applyFilters } = await import('/src/lib/index-filters.js');
  await time('facetsOf', () => facetsOf(arr));

  const { monthsBySlugFor, searchDoc, loadSearch } = await import('/src/views/index/search.js');
  await time('monthsBySlugFor (feast index)', () => monthsBySlugFor(arr));

  const { ensureAllPacks } = await import('/src/lib/i18n.js');
  await time('ensureAllPacks (4 locale packs)', () => ensureAllPacks());
  await time('searchDoc x corpus', () => arr.map(searchDoc));
  /* `loadSearch` bails on `state` only after the index is built, so this is
     the import plus `addAll` and nothing of the page. */
  await time('loadSearch (minisearch import + addAll)', () => loadSearch(arr, { onChange() {} }));

  const { nameLines } = await import('/src/lib/name-lines.js');
  const { saintName } = await import('/src/lib/honorific.js');
  const ctx2 = document.createElement('canvas').getContext('2d');
  ctx2.font = '400 17px Georgia, serif';
  await time('nameLines x corpus (one layout pass)', () => {
    let n = 0;
    for (const s of arr) n += nameLines(saintName(s), 172, ctx2, 6);
    return n;
  });

  const { layout } = await import('/src/lib/virtual-grid.js');
  await time('layout() whole corpus, heights precomputed', () =>
    layout(arr, { width: 360, aspectOf: () => 1.4, textHeight: 120 }),
  );
  void data;
  void applyFilters;
  return ms;
});

for (const [k, v] of Object.entries(out)) console.log(`${String(v).padStart(8)}  ${k}`);
await browser.close();
