/**
 * **Time to a usable advanced-search result on a phone**, the number the
 * author's complaint is about ("on mobile it still takes a while to load the
 * advanced search page with how many saints there are").
 *
 * Two arrivals, because "load the advanced search page" is two things:
 *
 * - **press** — the page as a reader meets it. It opens on the carousel; the
 *   clock starts at `goto` and stops when the first grid card is mounted after
 *   *Advanced search* is pressed. This is the whole journey, download
 *   included.
 * - **direct** — `indexMode: 'search'` in storage, so the grid is the opening
 *   face. Separates the boot from the press: whatever this costs, the press
 *   cannot be blamed for.
 *
 * It also prints the phase the time went to, from the engine's own numbers
 * rather than from a guess: the manifest's own resource timing, the long tasks
 * over 50 ms, and the press's own interval.
 *
 *   npm run preview          # a build, not the dev server
 *   node scratchpad/adv-mobile.mjs [cpuRate] [runs] [base]
 *
 * 360x800 and 4x CPU, which is `mobile-360` on a phone rather than on this
 * desk. The wall clock here drifts by a factor of several across identical
 * builds (CLAUDE.md), so it prints every run and the median, and a change
 * worth believing moves the median of five.
 */
import { chromium } from '@playwright/test';

const [, , rate = '4', runs = '5', base = 'http://localhost:4317'] = process.argv;

const SETTINGS = {
  church: 'russian',
  language: 'en',
  reckoning: 'gregorian',
  coachSeen: ['church-open', 'lang-open'],
};

/* The floor's own line (scripts/lighthouse-floor.mjs): a phone on 4G, not this
   desk's loopback — the manifest is 597 KB gzipped and a localhost fetch of it
   is free, which is exactly the cost the author is paying. */
const NET = { offline: false, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 };

const browser = await chromium.launch();

async function once(mode) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(
    (v) => {
      localStorage.setItem('gos-settings', JSON.stringify(v));
      window.__tasks = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          window.__tasks.push({ d: Math.round(e.duration), s: Math.round(e.startTime) });
      }).observe({ entryTypes: ['longtask'] });
      /* When the card entered the DOM, against when the test could see it:
         a long task in flight hides a mounted card from the poll *and* from
         the reader, and the two readings together say which happened. */
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window[`__${e.name.replace(/-/g, '')}`] ??= Math.round(e.startTime);
      }).observe({ type: 'paint', buffered: true });
      const poll = () => {
        if (document.querySelector('.index-card')) window.__cardAt = Math.round(performance.now());
        else setTimeout(poll, 16);
      };
      setTimeout(poll, 16);
    },
    { ...SETTINGS, indexMode: mode === 'direct' ? 'search' : 'carousel' },
  );
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NET);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });

  const t0 = Date.now();
  await page.goto(base + '/saints', { waitUntil: 'commit' });
  let pressed = null;
  if (mode === 'press') {
    /* The carousel's first card is the page being usable at all; the press
       cannot happen before the toggle exists. */
    await page.locator('.cx-card').first().waitFor({ timeout: 120000 });
    pressed = Date.now();
    await page.locator('[data-mode-toggle]').click();
  }
  await page.locator('.index-card').first().waitFor({ timeout: 120000 });
  const firstCard = Date.now() - t0;
  const press = pressed ? Date.now() - pressed : null;

  /* **The three seconds after the cards appear**, which is when a reader
     starts scrolling. A long task in that window is the page ignoring them,
     and it is the half of the complaint that is not the download. */
  await page.waitForTimeout(3000);

  /* What the reader can actually reach, against the count the page claims. */
  const after = await page.evaluate(() => ({
    mounted: document.querySelectorAll('.index-card').length,
    cardAt: window.__cardAt ?? null,
    fcp: window.__firstcontentfulpaint ?? null,
    count: document.querySelector('[data-count]')?.textContent?.trim() ?? '',
    blocked: (window.__tasks ?? [])
      .filter((t) => t.s >= (window.__cardAt ?? 0))
      .reduce((n, t) => n + t.d, 0),
    worstAfter: Math.max(
      0,
      ...(window.__tasks ?? []).filter((t) => t.s >= (window.__cardAt ?? 0)).map((t) => t.d),
    ),
    tasks: (window.__tasks ?? []).slice(-14).map((t) => `${t.d}@${t.s}`),
    manifest: performance
      .getEntriesByType('resource')
      .filter((r) => r.name.includes('manifest.json'))
      .map((r) => Math.round(r.responseEnd - r.startTime))[0] ?? null,
    wire: performance
      .getEntriesByType('resource')
      .filter((r) => r.transferSize > 20000 || /\.json|\.js$/.test(r.name))
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 14)
      .map(
        (r) =>
          `${String(r.name).split('/').pop().slice(0, 26)} ${Math.round(r.startTime)}->${Math.round(r.responseEnd)} ${Math.round(r.transferSize / 1024)}k`,
      ),
  }));
  await ctx.close();
  return { firstCard, press, ...after };
}

const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const mode of ['press', 'direct']) {
  const rows = [];
  for (let i = 0; i < Number(runs); i += 1) rows.push(await once(mode));
  for (const r of rows) {
    console.log(
      `${mode.padEnd(6)} first card ${String(r.firstCard).padStart(6)} ms` +
        (r.press == null ? '' : `  (press -> card ${String(r.press).padStart(5)} ms)`) +
        `  [in DOM ${String(r.cardAt).padStart(5)}, fcp ${String(r.fcp).padStart(5)}]` +
        `  blocked after ${String(r.blocked).padStart(5)} ms (worst ${String(r.worstAfter).padStart(4)})` +
        `  manifest ${String(r.manifest).padStart(5)} ms  mounted ${String(r.mounted).padStart(3)}` +
        `  count "${r.count}"  longest tasks ${r.tasks.join(', ')}`,
    );
  }
  for (const w of rows[0].wire) console.log(`  ${w}`);
  console.log(
    `${mode.padEnd(6)} MEDIAN first card ${median(rows.map((r) => r.firstCard))} ms` +
      (rows[0].press == null ? '' : `, press -> card ${median(rows.map((r) => r.press))} ms`) +
      `, blocked after the card ${median(rows.map((r) => r.blocked))} ms` +
      `, worst single task after it ${median(rows.map((r) => r.worstAfter))} ms`,
  );
}

await browser.close();
