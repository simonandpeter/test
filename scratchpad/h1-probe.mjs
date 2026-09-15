import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() =>
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })),
);
await page.goto('http://localhost:4173/calendar/2026-08-26', { waitUntil: 'networkidle' });
await page.locator('.site-nav a[href$="/saints"]').click();
await page.waitForTimeout(1200);
console.log(await page.locator('h1').evaluateAll((ns) => ns.map((n) => ({
  text: n.textContent.trim().slice(0, 30),
  visibility: getComputedStyle(n).visibility,
  layer: n.closest('.face-layer')?.getAttribute('data-layer') ?? 'none',
}))));
console.log('h1 visible to playwright:', await page.locator('h1:visible').count());
console.log('h1 by role:', await page.getByRole('heading', { level: 1 }).count());
await browser.close();
