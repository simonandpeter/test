import { chromium } from 'playwright';

const OUT = process.argv[2];
const base = 'http://localhost:4175';
const browser = await chromium.launch();
for (const [w, h, tag] of [[360, 780, 'phone'], [1280, 900, 'desk']]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, church: 'russian', language: 'en' }));
  });
  for (const [route, name] of [['/calendar/2026-08-28', 'feast'], ['/calendar/2026-08-30', 'saint']]) {
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}-${tag}.png`, fullPage: false });
  }
  await ctx.close();
}
await browser.close();
console.log('shot');
