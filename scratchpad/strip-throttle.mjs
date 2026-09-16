/**
 * The nav strip's gap budget, under CPU throttling.
 *
 * `base.css`'s `min-width: 25vw` note claims the trailing edge meets its
 * no-gap inequality "exactly and nothing to spare" — arithmetic, not a
 * measurement, and a sixth link was added to the row on 2026-09-16. What a
 * slow machine changes is how many frames the glide is drawn in and where the
 * ring's turn lands relative to them, which is exactly the class of flake
 * CLAUDE.md says only reproduces under `Emulation.setCPUThrottlingRate`.
 *
 * Prints the widest blank strip seen at either edge during a press, per rate,
 * per page pressed. Run against `npm run preview`.
 *
 *   node scratchpad/strip-throttle.mjs [rates] [base]
 */
import { chromium } from '@playwright/test';

const [, , rates = '1,6,20', base = 'http://localhost:4173'] = process.argv;

const watchPress = async (href) => {
  const track = document.querySelector('.site-nav');
  let gap = 0;
  let running = true;
  const tick = () => {
    const box = track.getBoundingClientRect();
    const on = [...track.children]
      .map((a) => a.getBoundingClientRect())
      .filter((r) => r.right > box.left && r.left < box.right)
      .sort((a, b) => a.left - b.left);
    if (on.length) gap = Math.max(gap, on[0].left - box.left, box.right - on[on.length - 1].right);
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.querySelector(`.site-nav a[href$="${href}"]`).click();
  await new Promise((r) => setTimeout(r, 1400));
  running = false;
  const box = track.getBoundingClientRect();
  const parts = [...track.children]
    .map((a) => ({ key: a.dataset.navKey, r: a.getBoundingClientRect() }))
    .sort((a, b) => a.r.left - b.r.left)
    .map((k) => ({
      key: k.key,
      shown: Math.round(((Math.min(k.r.right, box.right) - Math.max(k.r.left, box.left)) / k.r.width) * 100),
    }));
  return { gap: Math.round(gap), parts };
};

const browser = await chromium.launch();
for (const rate of rates.split(',').map(Number)) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addInitScript(() =>
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' }),
    ),
  );
  const page = await ctx.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  // Prove the throttle bit, per CLAUDE.md trap 10.
  const spin = await page.evaluate(() => {
    const t = performance.now();
    let n = 0;
    while (performance.now() - t < 100) n += 1;
    return n;
  });
  for (const href of ['/prayer', '/about', '/saints']) {
    const out = await page.evaluate(watchPress, href);
    console.log(
      `${String(rate).padStart(2)}x  press ${href.padEnd(8)} gap ${String(out.gap).padStart(4)} px   ` +
        out.parts.map((p) => `${p.key}:${p.shown}%`).join(' '),
    );
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  }
  console.log(`${String(rate).padStart(2)}x  (loop count in 100 ms: ${spin})`);
  await ctx.close();
}
await browser.close();
