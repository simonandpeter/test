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
 */
import { chromium } from '@playwright/test';

const PAGE = `<!doctype html><meta name=viewport content="width=device-width">
<style>html,body{margin:0}#t{overflow-x:auto;white-space:nowrap;padding-inline:180px;
scroll-snap-type:x mandatory;height:40px}#t a{display:inline-block;width:90px;scroll-snap-align:center}</style>
<div id=t><a>one</a><a>two</a><a>three</a><a>four</a><a>five</a></div>`;

const browser = await chromium.launch();
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
  console.log(`${arm.padEnd(6)} travelled to ${String(r.max).padStart(4)} px, settled at ${String(r.end).padStart(4)} of a ${r.range} px range`);
  await ctx.close();
}
await browser.close();
