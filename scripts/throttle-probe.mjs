/**
 * One question, asked at several CPU rates: **does this still work when the
 * machine is slow?**
 *
 * `Emulation.setCPUThrottlingRate` is how a two-core CI runner becomes
 * something this desk can be, and on 2026-09-09 it settled in minutes three
 * flakes that had survived a day of guessing — including two explanations
 * written into the test file and later disproved. It replaces five separate
 * one-off probes from that day; each was the same shape.
 *
 *   npm run preview            # it reads a build, not the dev server
 *   node scripts/throttle-probe.mjs hover|resize|ceiling|pack [rates] [base]
 *   node scripts/throttle-probe.mjs resize 1,6,20,50
 *
 * **hover**   — can the pointer be put on the drifting carousel? `hover()`
 *               waits for a stable box and a drifting row never has one;
 *               `mouse.move` has no such gate. Fails at 20x, passes at 1x.
 * **resize**  — how long does a carousel cell take to report its new width
 *               after the window shortens, and does it pass through 0 first?
 *               It does, at every rate above 1x.
 * **ceiling** — does the map's zoom climb reach its ceiling, and in how many
 *               presses? A settle per press arrives at every rate; bursting
 *               ten presses to a settle arrives only when the machine is slow.
 * **pack**    — the longest single task on All Saints, which is what a reader
 *               feels as the page refusing to respond.
 *
 * Each subcommand has a threshold of its own below and exits non-zero when any
 * rate misses it, and each prints its measurement whether it passes or fails —
 * `lighthouse-floor.mjs`'s rule, for its reason: a gate that only speaks when
 * it is angry teaches nobody where the margin went. **A `hover() TIMED OUT`
 * line is not a failure**; it is this probe's oldest finding, and the gate is
 * on what replaced `hover()` rather than on `hover()` itself.
 */
import { chromium } from '@playwright/test';

/**
 * **hover: how far the row must still travel in 1.2 s, at every rate.**
 *
 * The finding this subcommand exists for is that `hover()` times out on a
 * drifting row above 1x and `mouse.move` does not — so the gate cannot be on
 * `hover()` succeeding. What must not regress is the premise underneath both:
 * that the row is *moving*, which is what `the row drifts under the pointer`
 * in `e2e/index-carousel.spec.js` polls for and what a stalled carousel under
 * CPU pressure would take away silently.
 *
 * Measured 2026-09-12 over 1.2 s: **29 px at 1x, 33 at 6x, 9 at 20x**. A
 * floor of 1 px is deliberately "still moving at all" rather than a rate: the
 * rate is precisely what the throttle is changing, and a budget on it would
 * be a gate on the desk.
 */
const DRIFT_FLOOR_PX = 1;

/**
 * **resize: the width a repacked cell must settle on, and how long it may
 * take.** Both numbers are `e2e/index-carousel.spec.js`'s own, on purpose —
 * the probe should go red at the point that test is about to start flaking,
 * not at some number of this file's invention.
 *
 * 150 is its `expect(short).toBeGreaterThanOrEqual(150)`, "never below the
 * phone's own 150, however short the window". 10 s is the budget its comment
 * names for the settle to land inside.
 *
 * The flake behind both: mid-repack the cell reports **0** (trap 7), and a
 * poll for "narrower than before" accepts the zero, exits happy and then fails
 * the floor on 0 < 150. Measured 2026-09-09 the width reached 164 at 1.1 s,
 * 3.5 s and 4.5 s for 6x, 20x and 50x, against 97 ms at 1x where the zero is
 * never seen at all; 2026-09-12, 151 ms / 2.9 s / 4.3 s at 1x, 6x, 20x.
 */
const CELL_FLOOR_PX = 150;
const SETTLE_CEILING_MS = 10_000;

/**
 * **pack: the longest single blocking task on All Saints, at whatever rate is
 * asked for.**
 *
 * This one is a cliff detector and **not** a budget, and the spread is why.
 * PLAN item 2's controlled table has the carousel's longest task at 1,517 ms
 * at 10x and says in the same breath that the figure moves a lot between runs
 * on this desk — 975, 992, 1,128, 1,517. Four runs on 2026-09-12 gave **608,
 * 1,258, 2,300 and 2,935 ms**. That is a factor of five across identical
 * builds, so any threshold tight enough to be a budget is a flake generator,
 * and CLAUDE.md's rule applies: stop when the instrument cannot resolve the
 * change.
 *
 * 6,000 ms is about twice the worst run seen. **Say plainly what that buys:**
 * nothing under a second, because nothing on this desk can see a second. What
 * it does see is a step change of the size that put PLAN item 2 there — the
 * whole caption pack arriving back in the boot path — and that is the only
 * claim this number makes.
 */
const PACK_TASK_CEILING_MS = 6_000;

/*
 * **ceiling has no constant**, because its threshold is not a quantity: the
 * zoom climb either reaches the ceiling or it does not, and the 2026-09-09
 * finding was that a burst of presses without a settle between them arrives
 * only on a slow machine. 15 presses at 1x, 6x and 20x on 2026-09-12. The
 * press count is printed and not gated — it is a fact about the zoom scale,
 * and `tests/plan.test.mjs` is where a scale belongs.
 */

/*
 * **The default stops at 6x, and 20x is one argument away.**
 *
 * 20x is where the three 2026-09-09 flakes fell out and it is still the rate
 * to reach for when hunting one — but it is not a rate a threshold survives
 * on a desk that is doing anything else. Same tree, same afternoon,
 * 2026-09-12: `resize` at 20x settled in 4,258 ms once, in 16,203 ms with a
 * dev server alongside, and twice never inside the probe's own 20 s loop at
 * all. At 6x the same measurement came back 2,833 / 2,890 / 2,928 / 3,273 ms.
 *
 * So the default is the range where a red means the tree and not the desk,
 * and `node scripts/throttle-probe.mjs resize 1,6,20,50` is still there for
 * the afternoon when a red means neither and you want to know why.
 */
const [, , which = 'hover', rates = '1,6', base = 'http://localhost:4173'] = process.argv;
const RATES = rates.split(',').map(Number);

const SETTINGS = {
  church: 'russian',
  language: 'en',
  reckoning: 'gregorian',
  indexMode: 'carousel',
  coachSeen: ['church-open', 'lang-open'],
};

const open = async (browser, route, viewport, rate) => {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript((v) => {
    localStorage.setItem('gos-settings', JSON.stringify(v));
    // The map's background tile warm-up, off — as the suite runs it.
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      get: () => ({ saveData: true }),
    });
  }, SETTINGS);
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  if (route === '/map') await page.locator('[data-map][data-land="ok"]').waitFor();
  else await page.locator('.cx-card').first().waitFor();
  // **After the load**, or the throttle is paid by the page arriving rather
  // than by the thing under test.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return { ctx, page };
};

/*
 * Every probe returns `{ line, fail }`: the line is printed either way, and
 * `fail` is the sentence a reader needs to know what broke — never a bare
 * boolean, for the same reason `lighthouse-floor.mjs` prints the offending
 * nodes rather than the audit id.
 */
const probes = {
  async hover(browser, rate) {
    const { ctx, page } = await open(browser, '/saints', { width: 1280, height: 900 }, rate);
    const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
    let line = '';
    try {
      await page.locator('.cx-card').first().hover({ timeout: 8000 });
      line = 'hover() OK';
    } catch {
      line = 'hover() TIMED OUT';
    }
    const box = await page.locator('[data-carousel-track]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    const held = await at();
    await page.waitForTimeout(1200);
    const now = await at();
    // The ring wraps, so a drift that crosses the turn reads as a large
    // negative step. Distance travelled is the question, not direction.
    const drift = Math.abs(now - held);
    line += `   mouse.move OK, drift ${held} → ${now}  (${drift} px, floor ${DRIFT_FLOOR_PX})`;
    await ctx.close();
    return { line, fail: drift >= DRIFT_FLOOR_PX ? null : `the row stopped under the pointer: ${drift} px in 1.2 s` };
  },

  async resize(browser, rate) {
    const { ctx, page } = await open(browser, '/saints', { width: 1280, height: 900 }, rate);
    const cell = page.locator('.cx-cell:not(.is-names)').first();
    const width = () => cell.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    const tall = await width();
    await page.setViewportSize({ width: 1280, height: 560 });

    const t0 = Date.now();
    const seen = [];
    let last = null;
    let settled = null;
    while (Date.now() - t0 < 20000) {
      const now = await width();
      if (seen.length < 6) seen.push(now);
      if (now > 0 && now === last) {
        settled = now;
        break;
      }
      last = now;
      await page.waitForTimeout(50);
    }
    const took = Date.now() - t0;
    await ctx.close();
    const line = `${tall} → ${settled} in ${took} ms   first readings: ${seen.join(' ')}   (floor ${CELL_FLOOR_PX} px in ${SETTLE_CEILING_MS} ms)`;
    if (!(settled >= CELL_FLOOR_PX)) return { line, fail: `the cell settled at ${settled}, under the ${CELL_FLOOR_PX} px floor` };
    if (took > SETTLE_CEILING_MS) return { line, fail: `the repack took ${took} ms, over the ${SETTLE_CEILING_MS} ms the e2e poll allows` };
    return { line, fail: null };
  },

  async ceiling(browser, rate) {
    const { ctx, page } = await open(browser, '/map', { width: 360, height: 780 }, rate);
    const canvas = page.locator('[data-map]');
    const zoomIn = page.locator('[data-zoom="in"]');
    const level = page.locator('[data-zoom-level]');
    await canvas.focus();
    const t0 = Date.now();
    let presses = 0;
    for (; presses < 25 && !(await zoomIn.isDisabled()); presses += 1) {
      await canvas.press('+');
      let last = null;
      for (let i = 0; i < 40; i += 1) {
        const now = await level.textContent();
        if (now === last) break;
        last = now;
        await page.waitForTimeout(50);
      }
      if (Date.now() - t0 > 55000) break;
    }
    const done = await zoomIn.isDisabled();
    const line = `${presses} presses, ${Date.now() - t0} ms, ceiling ${done ? 'reached' : 'NOT REACHED'} (${await level.textContent()})`;
    await ctx.close();
    return { line, fail: done ? null : `${presses} presses with a settle each and the climb never reached the ceiling` };
  },

  async pack(browser, rate) {
    /*
     * The longest single task on All Saints, which is what a reader feels as
     * the page refusing to respond. PLAN item 2 says the caption pack is
     * ~1,200 ms at 10x; this is the claim, measured, without touching source.
     */
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript((v) => {
      localStorage.setItem('gos-settings', JSON.stringify(v));
      window.__tasks = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__tasks.push(Math.round(e.duration));
      }).observe({ entryTypes: ['longtask'] });
    }, { ...SETTINGS, indexMode: process.env.PACK_MODE ?? 'carousel' });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const t0 = Date.now();
    const route = process.env.PACK_ROUTE ?? '/saints';
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page
      .locator(route === '/saints' && (process.env.PACK_MODE ?? 'carousel') === 'carousel' ? '.cx-card' : 'main')
      .first()
      .waitFor({ timeout: 60000 });
    const firstCard = Date.now() - t0;
    await page.waitForTimeout(3000);
    const tasks = await page.evaluate(() => window.__tasks.sort((a, b) => b - a));
    await ctx.close();
    const line =
      `${process.env.PACK_ROUTE ?? '/saints'} (${process.env.PACK_MODE ?? 'carousel'}) ready at ${firstCard} ms; ` +
      `longest tasks ${tasks.slice(0, 4).join(', ')} ms; ${tasks.length} over 50 ms  (ceiling ${PACK_TASK_CEILING_MS} ms)`;
    const longest = tasks[0] ?? 0;
    return {
      line,
      fail:
        longest > PACK_TASK_CEILING_MS
          ? `the longest task is ${longest} ms, over the ${PACK_TASK_CEILING_MS} ms cliff — PACK_TASK_CEILING_MS's comment has why this is a cliff and not a budget`
          : null,
    };
  },
};

const probe = probes[which];
if (!probe) {
  console.error(`no probe "${which}" — one of: ${Object.keys(probes).join(', ')}`);
  process.exit(1);
}

const browser = await chromium.launch();
const failures = [];
for (const rate of RATES) {
  const { line, fail } = await probe(browser, rate);
  console.log(`${fail ? 'FAIL' : 'ok  '} ${String(rate).padStart(3)}x  ${line}`);
  if (fail) failures.push(`${rate}x: ${fail}`);
}
await browser.close();

if (failures.length) {
  for (const f of failures) console.error(f);
  console.error(`${which}: ${failures.length} of ${RATES.length} rates below the threshold`);
  process.exit(1);
}
console.log(`${which}: ${RATES.length} rate${RATES.length === 1 ? '' : 's'}, all above the threshold`);
