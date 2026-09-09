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
 *   node scratchpad/throttle-probe.mjs hover
 *   node scratchpad/throttle-probe.mjs resize 1,6,20,50
 *   node scratchpad/throttle-probe.mjs ceiling
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
 */
import { chromium } from '@playwright/test';

const [, , which = 'hover', rates = '1,6,20', base = 'http://localhost:4173'] = process.argv;
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
    line += `   mouse.move OK, drift ${held} → ${await at()}`;
    await ctx.close();
    return line;
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
    await ctx.close();
    return `${tall} → ${settled} in ${Date.now() - t0} ms   first readings: ${seen.join(' ')}`;
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
    return line;
  },
};

const probe = probes[which];
if (!probe) {
  console.error(`no probe "${which}" — one of: ${Object.keys(probes).join(', ')}`);
  process.exit(1);
}

const browser = await chromium.launch();
for (const rate of RATES) {
  console.log(`${String(rate).padStart(3)}x  ${await probe(browser, rate)}`);
}
await browser.close();
