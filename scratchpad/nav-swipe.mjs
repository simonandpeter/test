/**
 * **What an aggressive swipe does to the phone's nav strip.**
 *
 * `ui/nav-scroll.js`'s own header records the cost it took knowingly:
 * `keepEndless` writes `scrollLeft` inside a live gesture. This is that cost,
 * measured — per frame, through a real touch fling, at mobile-360.
 *
 * The fling is `Input.dispatchTouchEvent` and not a dispatched `PointerEvent`
 * (trap 11): a synthesised pointer is not an active pointer, ignores
 * `touch-action`, and produces no fling at all, so it would have reported the
 * row as perfectly well behaved.
 *
 * Every `scrollLeft` write the file makes is stamped on the way past, because
 * "how many writes landed inside the gesture" is the question and a trace of
 * positions alone cannot answer it. `NAV_BACKOUT=1` additionally serves a
 * `keepEndless` that returns immediately — the control.
 *
 *   npm run dev
 *   node scratchpad/nav-swipe.mjs http://localhost:5174 3
 */
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:5174';
const RUNS = Number(process.argv[3] ?? 3);
const BACKOUT = !!process.env.NAV_BACKOUT;

const browser = await chromium.launch();
const out = [];
for (let run = 0; run < RUNS; run += 1) {
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 780 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  let patched = 0;
  let missed = [];
  await page.route('**/ui/nav-scroll.js*', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    const edits = [
      [
        '  const write = (left) => {',
        '  const write = (left) => {\n    (window.__writes ??= []).push([Math.round(performance.now()), Math.round(left), Math.round(track.scrollLeft)]);',
      ],
      ...(BACKOUT ? [['  function keepEndless(force = false) {', '  function keepEndless(force = false) {\n    if (!force) return;']] : []),
    ];
    for (const [find, replace] of edits) {
      if (!body.includes(find)) missed.push(find);
      else body = body.replace(find, replace);
    }
    patched += 1;
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({
        church: 'russian',
        language: 'en',
        reckoning: 'gregorian',
        coachSeen: ['church-open', 'lang-open'],
      }),
    ),
  );
  await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
  await page.locator('.site-nav a').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const nav = await page.evaluate(() => {
    const t = document.querySelector('.site-nav');
    const b = t.getBoundingClientRect();
    return { y: Math.round(b.top + b.height / 2) };
  });

  // A frame-by-frame trace, taken in the page: a before/after pair cannot tell
  // a fling that was cut short from one that never started.
  await page.evaluate(() => {
    const t = document.querySelector('.site-nav');
    window.__trace = [];
    window.__writes = window.__writes ?? [];
    const tick = () => {
      window.__trace.push([Math.round(performance.now()), Math.round(t.scrollLeft)]);
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });

  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: nav.y, id: 1 }],
    });
  // A hard fling: 320 px of travel in eight steps, one frame apart, then the
  // finger off — fast enough that the compositor has momentum to carry.
  let x = 330;
  const startedAt = await page.evaluate(() => performance.now());
  await touch('touchStart', x);
  for (let i = 0; i < 8; i += 1) {
    x -= 40;
    await touch('touchMove', x);
    await page.waitForTimeout(8);
  }
  const liftedAt = await page.evaluate(() => performance.now());
  await touch('touchEnd', x);
  await page.waitForTimeout(1400);

  const r = await page.evaluate(
    ([began, lifted]) => {
      cancelAnimationFrame(window.__raf);
      const t = document.querySelector('.site-nav');
      const trace = window.__trace;
      const at = (ms) => (trace.find(([p]) => p >= ms) ?? trace.at(-1))[1];
      const afterLift = trace.filter(([p]) => p >= lifted).map(([, v]) => v);
      let reversals = 0;
      let biggestBack = 0;
      for (let i = 1; i < afterLift.length; i += 1) {
        const d = afterLift[i] - afterLift[i - 1];
        if (d > 1) {
          reversals += 1;
          biggestBack = Math.max(biggestBack, d);
        }
      }
      const order = [...t.querySelectorAll('a')]
        .map((a) => ({ k: a.dataset.navKey, x: a.getBoundingClientRect().left }))
        .sort((a, b) => a.x - b.x)
        .map((s) => s.k);
      const mid = t.getBoundingClientRect().left + t.clientWidth / 2;
      const centred = [...t.querySelectorAll('a')]
        .map((a) => {
          const b = a.getBoundingClientRect();
          return { k: a.dataset.navKey, d: Math.abs(b.left + b.width / 2 - mid) };
        })
        .sort((a, b) => a.d - b.d)[0];
      const writes = window.__writes ?? [];
      return {
        coastPx: at(lifted) - trace.at(-1)[1],
        reversals,
        biggestBack,
        order: order.join(','),
        centred: centred.k,
        offMid: Math.round(centred.d),
        inBounds: t.scrollLeft >= -1 && t.scrollLeft <= t.scrollWidth - t.clientWidth + 1,
        links: t.querySelectorAll('a').length,
        lo: Math.min(...trace.map(([, v]) => v)),
        hi: Math.max(...trace.map(([, v]) => v)),
        max: t.scrollWidth - t.clientWidth,
        inGesture: writes.filter(([p]) => p >= began).length,
        afterLift: writes.filter(([p]) => p >= lifted).length,
        log: writes.map(([p, v, was]) => `${Math.round(p - began)}ms ${was}->${v}`).join('  '),
      };
    },
    [startedAt, liftedAt],
  );
  out.push({ ...r, patched, missed: [...new Set(missed)] });
  await ctx.close();
}
await browser.close();

console.log(`${BACKOUT ? 'BACKED OUT (keepEndless off)' : 'as written'} — ${RUNS} flings at 360 px`);
for (const r of out) {
  if (r.missed.length) console.log(`  !! patch missed: ${r.missed.join(' | ')}`);
  console.log(
    `  travel ${r.lo}..${r.hi} of 0..${r.max}   coast after lift ${String(-r.coastPx).padStart(4)} px   back-jumps ${r.reversals} (worst ${r.biggestBack})   writes in gesture ${r.inGesture} (${r.afterLift} after lift)   settles on ${r.centred} ${r.offMid} px off   order ${r.order}   inBounds ${r.inBounds}   links ${r.links}`,
  );
  if (process.env.NAV_LOG) console.log(`    writes: ${r.log}`);
}
