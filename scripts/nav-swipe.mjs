/**
 * **What an aggressive swipe does to the phone's nav strip.**
 *
 * One gesture is one page (author, 2026-09-15), and this is the instrument
 * that says whether a hard one still is: per frame, through a real touch
 * fling, at mobile-360.
 *
 * The fling is `Input.dispatchTouchEvent` and not a dispatched `PointerEvent`
 * (trap 11): a synthesised pointer is not an active pointer, ignores
 * `touch-action`, and produces no fling at all, so it would have reported the
 * row as perfectly well behaved.
 *
 * Every `scrollLeft` write the file makes is stamped on the way past, because
 * "how many writes landed inside the gesture" is the question a trace of
 * positions alone cannot answer.
 *
 * **The floors this used to carry are gone with the mechanism they measured.**
 * Until 2026-09-15 the row was a native scroller, `keepEndless` wrote
 * `scrollLeft` into a live fling, and the gates here were about momentum: how
 * far the row coasted after the lift, and how many times it jumped backwards.
 * `overflow-x` is `hidden` now and this file's own tween is the only thing that
 * moves the row, so there is no coast to measure and nothing to fight — what is
 * left to get wrong is the distance. `docs/SRC-DECISIONS.md § src/ui/nav-scroll.js`
 * keeps the measurements; they are why the scroller went.
 *
 * **One arm.** `NAV_BACKOUT=1` serves a `keepEndless` that returns
 * immediately: the control for the **ring turn** and nothing else, seen in the
 * printed link order, which comes back untuned.
 *
 *   npm run dev          # the **dev** server: it patches the source of one module
 *   node scripts/nav-swipe.mjs [base] [runs]
 *   node scripts/nav-swipe.mjs http://localhost:5174 3
 *   NAV_LOG=1 ...        # every write, with its timestamp
 *   NAV_BACKOUT=1 ...    # the ring turn off; the distance gate is unaffected
 *
 * It prints the whole trace summary for every fling, passing or failing —
 * `lighthouse-floor.mjs`'s rule, for its reason.
 */
import { chromium } from '@playwright/test';

/**
 * **How many pages one gesture may carry the row, which is one.**
 *
 * The whole of the 2026-09-15 instruction, and the only thing a fling can now
 * get wrong: 320 px thrown at this row is more than three labels wide, and it
 * has to mean what a 40 px push means. Counted in ring steps rather than in
 * pixels, because the labels are not all the same width.
 */
const PAGES = 1;

/**
 * **How far off the midline the row may settle**, in pixels.
 *
 * The ring has to have turned, or the page it landed on is standing at an end
 * of the five with blank strip beside it. A nav link is about 90 px wide, so
 * 40 px is inside its own half-width: the row settled on a link rather than
 * halfway between two. Measured 0 px, 3 of 3, on 2026-09-12.
 */
const OFF_MID_CEILING_PX = 40;

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
      ...(BACKOUT ? [['  function keepEndless() {', '  function keepEndless() {\n    return;']] : []),
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
    const mid = b.left + t.clientWidth / 2;
    // The ring as it reads left to right, and the page on the midline, so that
    // "one page" can be counted in steps rather than guessed at in pixels.
    const seen = [...t.querySelectorAll('a')]
      .map((a) => ({ k: a.dataset.navKey, x: a.getBoundingClientRect().left, d: Math.abs(a.getBoundingClientRect().left + a.getBoundingClientRect().width / 2 - mid) }))
      .sort((p, q) => p.x - q.x);
    return {
      y: Math.round(b.top + b.height / 2),
      order: seen.map((p) => p.k),
      centred: [...seen].sort((p, q) => p.d - q.d)[0].k,
    };
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
  /*
   * How many pages the row actually travelled, as a ring distance: the order
   * rotates under the gesture, so the two keys are compared by their place in
   * the ring the fling started in.
   */
  const ring = nav.order;
  const steps = (ring.indexOf(r.centred) - ring.indexOf(nav.centred) + ring.length) % ring.length;
  out.push({ ...r, from: nav.centred, steps: steps > ring.length / 2 ? steps - ring.length : steps, patched, missed: [...new Set(missed)] });
  await ctx.close();
}
await browser.close();

/*
 * Why every fling is judged rather than the best of them: the defect this
 * gate holds shut was "three times in three", and a fling that dies one run
 * in three is a nav strip that dies one swipe in three.
 */
const verdict = (r) => {
  /*
   * **The patch first, because a route that matched nothing fails open**
   * (trap 13). Run against `npm run preview` the module is inside the entry
   * bundle, the route pattern above matches no request, and everything below
   * would be measured on an uninstrumented page that happens to behave.
   */
  if (!r.patched) return 'the nav-scroll route never fired — this needs `npm run dev`, not the preview build';
  if (r.missed.length) return `the patch missed: ${r.missed.join(' | ')} — nav-scroll.js has been edited under it`;
  if (Math.abs(r.steps) !== PAGES)
    return `the fling carried the row ${r.steps} pages, from ${r.from} to ${r.centred}, and one gesture is ${PAGES}`;
  if (!r.inBounds) return `the row came to rest outside 0..${r.max}`;
  if (r.offMid > OFF_MID_CEILING_PX) return `settled ${r.offMid} px off the midline, over the ${OFF_MID_CEILING_PX} px ceiling — the ring did not turn`;
  return null;
};

console.log(
  `${BACKOUT ? 'BACKED OUT (keepEndless off)' : 'as written'} — ${RUNS} flings at 360 px`,
);
console.log(
  `  gates: ${PAGES} page a gesture, settles <= ${OFF_MID_CEILING_PX} px off the midline, in bounds`,
);
const bad = [];
for (const r of out) {
  if (r.missed.length) console.log(`  !! patch missed: ${r.missed.join(' | ')}`);
  const why = verdict(r);
  if (why) bad.push(why);
  console.log(
    `  ${why ? 'FAIL' : 'ok  '} travel ${r.lo}..${r.hi} of 0..${r.max}   ${r.steps} page(s) ${r.from}->${r.centred}   coast after lift ${String(-r.coastPx).padStart(4)} px   writes in gesture ${r.inGesture} (${r.afterLift} after lift)   settles ${r.offMid} px off   order ${r.order}   inBounds ${r.inBounds}   links ${r.links}`,
  );
  if (why) console.log(`       ${why}`);
  if (process.env.NAV_LOG) console.log(`    writes: ${r.log}`);
}

/*
 * `NAV_BACKOUT=1` is not a control that inverts anything: it takes the ring
 * turn away and leaves the distance alone, which shows in `order` and in
 * nothing the gates measure. Reading it as the control is the mistake this
 * paragraph exists to stop, and the one the exit code below will not make.
 *
 * The control for the distance gate is the code itself: take the clamp out of
 * `place()` in `ui/nav-scroll.js` and every fling here goes two pages or three.
 */
if (bad.length) {
  console.error(`\n${bad.length} of ${RUNS} flings missed the gates. PAGES's comment has what one gesture is meant to mean.`);
  process.exit(1);
}
console.log(`\n${RUNS} flings, every one of them one page`);
