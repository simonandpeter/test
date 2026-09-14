/**
 * **Does writing `scrollLeft` during a fling cancel the fling in Chrome?**
 *
 * The whole of `ui/nav-scroll.js`'s known cost rests on the answer, and the
 * file says plainly that it was written down rather than measured. Three
 * arms, one fling each, on a plain scroller with no site code in it:
 *
 *   none   — fling and let it run
 *   once   — one write of the value already there, 100 ms after the lift
 *   every  — that write on every scroll event, which is what `keepEndless` does
 *
 * It needs no server and no build — the page is in this file — so it is the
 * cheapest thing here to run and the first thing to run when the nav strip
 * misbehaves and you do not yet know whose fault it is.
 *
 *   node scripts/fling-write.mjs
 *
 * Every arm's distance is printed whether it passes or fails, for
 * `lighthouse-floor.mjs`'s reason: a gate that only speaks when it is angry
 * teaches nobody where the margin went.
 */
import { chromium } from '@playwright/test';

/**
 * **The premise: a fling has to happen at all before the arms mean anything.**
 *
 * This script's failure mode is a silent one. If `Input.dispatchTouchEvent`
 * stops producing momentum — a Chromium change, a headless default, a machine
 * too slow to see eight touch moves as a gesture — then every arm reads small,
 * the differences vanish, and the run looks like "a write no longer cancels a
 * fling" when it is really "there was no fling". So the control arm is gated
 * first and hardest.
 *
 * Measured 2026-09-12, Chromium, mobile-360, a 320 px fling: **350 px** of a
 * 450 px range with no write at all, and 350 again with one write. 250 px is
 * well clear of the 45 the defect arm gives and well under the 350 the
 * platform gives, so it separates "a fling" from "no fling" without pinning
 * Chromium's momentum curve, which is not ours to pin.
 */
const FLING_FLOOR_PX = 250;

/**
 * **And the finding: a write on every scroll event kills it.**
 *
 * `ui/nav-scroll.js`'s table, which this script is the source of:
 *
 * | writes of `scrollLeft` during the fling | how far it travelled |
 * | --- | --- |
 * | none | 350 px |
 * | one, 100 ms after the lift | 350 px, dragged back to 315 |
 * | one per scroll event | **45 px** |
 *
 * The value written was the value already there, so it is the write itself and
 * not the arithmetic. That is the whole premise of `keepEndless` turning at
 * most once per gesture, and if Chromium ever stops behaving this way the
 * comment explaining that design becomes false — which is what this ceiling
 * exists to notice. 150 px is between the 45 measured and the 250 floor above,
 * so the gate goes red when the two arms stop being different rather than when
 * either one moves.
 *
 * **A red here is not a bug in this repository.** It is a change in the
 * platform, and the thing to do about it is re-read `ui/nav-scroll.js`'s
 * `keepEndless` rather than fix anything here.
 */
const KILLED_CEILING_PX = 150;

const PAGE = `<!doctype html><meta name=viewport content="width=device-width">
<style>html,body{margin:0}#t{overflow-x:auto;white-space:nowrap;padding-inline:180px;
scroll-snap-type:x mandatory;height:40px}#t a{display:inline-block;width:90px;scroll-snap-align:center}</style>
<div id=t><a>one</a><a>two</a><a>three</a><a>four</a><a>five</a></div>`;

const browser = await chromium.launch();
const seen = {};
for (const arm of ['none', 'once', 'every']) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.setContent(PAGE);
  await page.evaluate((mode) => {
    const t = document.getElementById('t');
    t.scrollLeft = 0;
    window.__trace = [];
    const tick = () => {
      window.__trace.push(Math.round(t.scrollLeft));
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
    if (mode === 'every') t.addEventListener('scroll', () => { t.scrollLeft = t.scrollLeft; }, { passive: true });
  }, arm);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: 20, id: 1 }] });
  let x = 330;
  await touch('touchStart', x);
  for (let i = 0; i < 8; i += 1) {
    x -= 40;
    await touch('touchMove', x);
    await page.waitForTimeout(8);
  }
  await touch('touchEnd', x);
  if (arm === 'once') {
    await page.waitForTimeout(100);
    await page.evaluate(() => {
      const t = document.getElementById('t');
      t.scrollLeft = t.scrollLeft;
    });
  }
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const t = window.__trace;
    return { end: t.at(-1), max: Math.max(...t), range: document.getElementById('t').scrollWidth - document.getElementById('t').clientWidth };
  });
  seen[arm] = r;
  console.log(`${arm.padEnd(6)} travelled to ${String(r.max).padStart(4)} px, settled at ${String(r.end).padStart(4)} of a ${r.range} px range`);
  await ctx.close();
}
await browser.close();

console.log(
  `\npremise: "none" and "once" reach >= ${FLING_FLOOR_PX} px; finding: "every" stays under ${KILLED_CEILING_PX} px`,
);

const bad = [];
/*
 * The premise first, and named as a premise in the message: a session reading
 * "the fling was not cancelled" off a run where no fling happened would draw
 * exactly the wrong conclusion about `keepEndless`.
 */
for (const arm of ['none', 'once']) {
  if (seen[arm].max < FLING_FLOOR_PX) {
    bad.push(
      `premise failed — "${arm}" reached only ${seen[arm].max} px of ${seen[arm].range}, under the ${FLING_FLOOR_PX} px floor. ` +
        `There was no fling to cancel, so this run says nothing about the write.`,
    );
  }
}
if (seen.every.max > KILLED_CEILING_PX) {
  bad.push(
    `a write on every scroll event no longer cancels the fling: "every" reached ${seen.every.max} px against ` +
      `"none" at ${seen.none.max}, over the ${KILLED_CEILING_PX} px ceiling. This is a platform change, not a bug here — ` +
      `\`keepEndless\` in ui/nav-scroll.js is designed around the old behaviour and its comment now needs re-reading.`,
  );
}

if (bad.length) {
  for (const b of bad) console.error(b);
  process.exit(1);
}
console.log(`3 arms, the write still cancels the fling (${seen.none.max} / ${seen.once.max} / ${seen.every.max} px)`);
