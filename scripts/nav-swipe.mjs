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
 * positions alone cannot answer it.
 *
 * **Two arms, and they control for different things** — measured 2026-09-12,
 * because the first reading of this was wrong. `NAV_BACKOUT=1` serves a
 * `keepEndless` that returns immediately, and the fling is then *perfect*:
 * 225 px of coast, no backward step, 2 of 2. It is the control for the **ring
 * turn** and nothing else — the link order comes back
 * `saints,texts,map,about,calendar` where the turned row reads
 * `texts,map,about,calendar,saints`. The defect was never `keepEndless`
 * existing; it was `keepEndless` running on every scroll event, so
 * `NAV_EVERY_SCROLL=1`, which drops the once-per-gesture guard, is the
 * control for the floors below.
 *
 *   npm run dev          # the **dev** server: it patches the source of one module
 *   node scripts/nav-swipe.mjs [base] [runs]
 *   node scripts/nav-swipe.mjs http://localhost:5174 3
 *   NAV_LOG=1 …          # every write, with its timestamp
 *   NAV_BACKOUT=1 …      # the ring turn off; the floors are unaffected
 *   NAV_EVERY_SCROLL=1 … # the defect back; the gate is expected to go red
 *
 * It prints the whole trace summary for every fling, passing or failing —
 * `lighthouse-floor.mjs`'s rule, for its reason.
 */
import { chromium } from '@playwright/test';

/**
 * **How far the row must still coast after the finger leaves the glass.**
 *
 * This is the quantity the 2026-09-12 fix was stated in, and the one a
 * `scrollLeft` write inside a live gesture takes away. `ui/nav-scroll.js`'s
 * header records both sides of it: before, "a 320 px swipe travelled 45 px of
 * a 450 px range and came back to the page it left, three times in three";
 * after, "the full 450 px, **225 px of coast after the lift**, no backward
 * step". Measured again 2026-09-12 on the promoted script: 225 px, 3 of 3 —
 * and the `NAV_EVERY_SCROLL=1` control reproduces the defect side of it to
 * the digit, 45 px of travel, 8 and 9 backward jumps, **0 px** of coast, and
 * a settle back on the page the swipe began from, 2 of 2.
 *
 * 100 px is comfortably above a fling that died at the lift and comfortably
 * below the 225 the platform actually gives, so the gate reads the difference
 * between a fling and no fling rather than a frame of momentum either way.
 */
const COAST_FLOOR_PX = 100;

/**
 * **Backward steps after the lift, of which there may be none.**
 *
 * The signature of the defect, and the reason it is a count rather than a
 * distance: the oscillation feeds itself. A write computed from a `scrollLeft`
 * the compositor has already moved past lands behind the fling, which puts a
 * different link nearest the midline, which asks for another turn. On the real
 * strip that was **nine** backward jumps in one swipe; after the fix, none.
 */
const MAX_BACK_JUMPS = 0;

/**
 * **How far off the midline the row may settle**, in pixels.
 *
 * The other half of the same fix: "the ring turned so the page it lands on
 * stands in the middle of five". A nav link is about 90 px wide, so 40 px is
 * inside its own half-width — the row settled on a link rather than halfway
 * between two. Measured **0 px**, 3 of 3, on 2026-09-12.
 */
const OFF_MID_CEILING_PX = 40;

const base = process.argv[2] ?? 'http://localhost:5174';
const RUNS = Number(process.argv[3] ?? 3);
const BACKOUT = !!process.env.NAV_BACKOUT;
const EVERY_SCROLL = !!process.env.NAV_EVERY_SCROLL;

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
      // The defect itself, put back: the turn ran on every scroll event, and
      // the write that follows it landed behind a fling the compositor had
      // already moved past.
      ...(EVERY_SCROLL ? [['    if (!force && turnedInGesture) return;', '    if (false && turnedInGesture) return;']] : []),
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
  const coast = Math.abs(r.coastPx);
  if (coast < COAST_FLOOR_PX) return `coasted ${coast} px after the lift, under the ${COAST_FLOOR_PX} px floor — the fling was cut short`;
  if (r.reversals > MAX_BACK_JUMPS) return `${r.reversals} backward jumps after the lift (worst ${r.biggestBack} px), and there may be ${MAX_BACK_JUMPS}`;
  if (!r.inBounds) return `the row came to rest outside 0..${r.max}`;
  if (r.offMid > OFF_MID_CEILING_PX) return `settled ${r.offMid} px off the midline, over the ${OFF_MID_CEILING_PX} px ceiling — the ring did not turn`;
  return null;
};

console.log(
  `${BACKOUT ? 'BACKED OUT (keepEndless off)' : EVERY_SCROLL ? 'CONTROL (a turn on every scroll)' : 'as written'} — ${RUNS} flings at 360 px`,
);
console.log(
  `  floors: coast >= ${COAST_FLOOR_PX} px, back-jumps <= ${MAX_BACK_JUMPS}, settles <= ${OFF_MID_CEILING_PX} px off the midline`,
);
const bad = [];
for (const r of out) {
  if (r.missed.length) console.log(`  !! patch missed: ${r.missed.join(' | ')}`);
  const why = verdict(r);
  if (why) bad.push(why);
  console.log(
    `  ${why ? 'FAIL' : 'ok  '} travel ${r.lo}..${r.hi} of 0..${r.max}   coast after lift ${String(-r.coastPx).padStart(4)} px   back-jumps ${r.reversals} (worst ${r.biggestBack})   writes in gesture ${r.inGesture} (${r.afterLift} after lift)   settles on ${r.centred} ${r.offMid} px off   order ${r.order}   inBounds ${r.inBounds}   links ${r.links}`,
  );
  if (why) console.log(`       ${why}`);
  if (process.env.NAV_LOG) console.log(`    writes: ${r.log}`);
}

/*
 * **The control inverts the exit code, because that is what a control is
 * for.** CLAUDE.md: every fix gets a test, backed out and confirmed to fail
 * before it is believed. `NAV_EVERY_SCROLL=1` puts the defect back, so a run
 * that stays green through it is a gate that does not bite — the failure
 * worth shouting about.
 *
 * `NAV_BACKOUT=1` is *not* that control and does not invert anything. It
 * takes the ring turn away and leaves the fling healthy, which shows in
 * `order` and in nothing the floors measure; reading it as the control is the
 * mistake this paragraph exists to stop.
 */
if (EVERY_SCROLL) {
  if (bad.length) {
    console.log(`\ncontrol: ${bad.length} of ${RUNS} flings failed with the per-gesture guard dropped, as they must`);
    process.exit(0);
  }
  console.error(`\ncontrol: every fling passed with the per-gesture guard dropped — this gate does not bite`);
  process.exit(1);
}
if (bad.length) {
  console.error(`\n${bad.length} of ${RUNS} flings below the floor. COAST_FLOOR_PX's comment has what the defect looked like.`);
  process.exit(1);
}
console.log(`\n${RUNS} flings, all above it`);
