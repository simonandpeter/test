/**
 * Layout shift on the Prayer page at 360 px, with the CPU slowed.
 *
 * `e2e/quality-floor.spec.js` at *nothing shifts as the data arrives: prayer*
 * reported **CLS 0.1799 against a 0.02 budget, blamed on `aside.hy-side`
 * twice**, on two consecutive CI attempts of the same tree — so it is real and
 * not the runner's one-casualty-per-run. It passes 6 of 6 on this desk, which
 * means the desk is too quick for it: the asides arrive before anything has
 * been painted, so nothing is counted as having moved.
 *
 * CLAUDE.md's rule for exactly this gap is to throttle rather than theorise.
 *
 * Needs `npm run preview` on :4173.
 * `node scratchpad/cls-prayer-probe.mjs [rate…]`
 */
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4173';
const rates = process.argv.slice(2).map(Number).filter(Boolean);
const RATES = rates.length ? rates : [1, 4, 6, 10];

const browser = await chromium.launch();

for (const rate of RATES) {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
  const cdp = await page.context().newCDPSession(page);

  /*
   * The observer is installed before any navigation and the throttle is set
   * before it too, because what is being measured is the shift caused by data
   * landing after the first paint — set the rate after the `goto` and the boot
   * has already happened at full speed.
   */
  await page.addInitScript(() => {
    window.__cls = { total: 0, blame: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__cls.total += entry.value;
        for (const s of entry.sources ?? []) {
          const el = s.node;
          if (!el || !el.tagName) continue;
          const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
          window.__cls.blame.push(el.tagName.toLowerCase() + (cls ? '.' + cls : ''));
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  await page.goto(`${BASE}/prayer`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);

  const { total, blame } = await page.evaluate(() => window.__cls);
  const who = [...new Set(blame)].join(', ') || '—';
  console.log(
    `${String(rate).padStart(3)}x  CLS ${total.toFixed(4)}  ${total <= 0.02 ? 'within' : 'OVER'} budget 0.02  [${who}]`,
  );
  await page.close();
}

await browser.close();
