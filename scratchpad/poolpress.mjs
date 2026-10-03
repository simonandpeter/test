import { chromium } from 'playwright';
const b = await chromium.launch();
for (const q of ['', 'john', 'martyr']) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })));
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`http://localhost:4173/saints${q ? `?q=${q}` : ''}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const pool = await page.evaluate(() => document.querySelectorAll('.carousel-track > *').length);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  const ms = await page.evaluate(() => new Promise((done) => {
    const t = performance.now();
    document.querySelector('button[data-mode-toggle]').click();
    const tick = () => {
      const f = document.querySelector('.facets');
      if (f && f.getBoundingClientRect().height > 0) return done(Math.round(performance.now() - t));
      requestAnimationFrame(tick);
    };
    tick();
  }));
  console.log(JSON.stringify({ q: q || '(none)', trackCells: pool, pressMs: ms }));
  await ctx.close();
}
await b.close();
