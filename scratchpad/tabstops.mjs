import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const w of [360, 1280]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })),
  );
  await page.goto('http://localhost:4173/calendar/2026-08-26', { waitUntil: 'networkidle' });
  const n = await page.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, [tabindex]';
    const all = [...document.querySelectorAll(sel)].filter((e) => {
      if (e.tabIndex < 0 || e.disabled) return false;
      if (getComputedStyle(e).visibility === 'hidden') return false;
      return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
    });
    const inMonth = all.filter((e) => e.closest('.month-grid, .cal-month, .month-days'));
    return { total: all.length, month: inMonth.length };
  });
  console.log(`${w}px  focusable total ${n.total}, of which in the month grid ${n.month}`);
  await page.close();
}
await browser.close();
