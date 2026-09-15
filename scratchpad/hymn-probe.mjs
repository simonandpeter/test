import { chromium } from '@playwright/test';

const CASES = [
  { route: '/calendar/2026-08-23', church: 'serbian', language: 'en' },
  { route: '/calendar/2026-09-11', church: 'russian', language: 'en' },
  { route: '/calendar/2026-09-14', church: 'greek', language: 'en' },
];

const browser = await chromium.launch();
for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((v) => {
    localStorage.setItem('gos-settings', JSON.stringify({ church: v.church, language: v.language, reckoning: 'gregorian' }));
  }, c);
  await page.goto('http://localhost:4173' + c.route, { waitUntil: 'networkidle' });
  const hymns = await page.locator('[data-hymns] .hymn').evaluateAll((nodes) =>
    nodes.map((n) => ({
      kind: n.querySelector('.hymn-kind')?.textContent?.trim(),
      lang: n.querySelector('.hymn-text')?.getAttribute('lang'),
      text: n.querySelector('.hymn-text')?.textContent?.trim().slice(0, 90),
      source: n.querySelector('.hymn-source')?.textContent?.trim().slice(0, 60),
    })),
  );
  console.log(`\n=== ${c.route}  church=${c.church} lang=${c.language} ===`);
  for (const h of hymns) console.log(` [${h.lang}] ${h.kind}: ${h.text}\n      ${h.source}`);
  await page.close();
}
await browser.close();
