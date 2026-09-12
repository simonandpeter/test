/* Daily -> All Saints in a real, visible browser: the pane suspends rAF, and
   the face flip lives inside one, so nothing measured there means anything. */
import { chromium } from '@playwright/test';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', seenCoach: true }));
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));

await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const raf = await p.evaluate(async () => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n += 1; if (performance.now() - t0 < 500) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  await new Promise((r) => setTimeout(r, 600));
  return n;
});
console.log('rAF callbacks in 500ms (0 means a dead instrument):', raf);

await p.click('.site-nav a[href$="/saints"]');
await p.waitForTimeout(2500);

const out = await p.evaluate(() => {
  const st = document.querySelector('.face-stage');
  const ly = document.querySelector('.face-layer[data-layer="saints"]');
  const cs = (e) => (e ? getComputedStyle(e) : null);
  return {
    path: location.pathname,
    face: st && st.dataset.face,
    stageH: st && cs(st).height,
    stageOverflow: st && cs(st).overflow,
    saintsLayerPos: ly && cs(ly).position,
    saintsLayerH: ly && Math.round(ly.getBoundingClientRect().height),
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
    cards: document.querySelectorAll('.index-card').length,
  };
});
console.log(JSON.stringify(out, null, 2));

// Scroll to the bottom and see whether more cards mount, which is the symptom.
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(1200);
console.log('after scrolling to the foot:', await p.evaluate(() => ({
  docH: document.documentElement.scrollHeight,
  scrollY: Math.round(window.scrollY),
  cards: document.querySelectorAll('.index-card').length,
})));
if (errs.length) console.log('page errors:', errs);
await b.close();
