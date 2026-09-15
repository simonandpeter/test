import { chromium } from '@playwright/test';

const base = 'http://localhost:4399';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() =>
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })),
);
await page.goto(`${base}/saints/theodosius-of-totma`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('html lang attr      :', await page.evaluate(() => document.documentElement.lang));
console.log('stored settings     :', await page.evaluate(() => localStorage.getItem('gos-settings')));
console.log('language control    :', (await page.locator('#lang-open').textContent().catch(() => '?'))?.trim());

const hymns = await page.locator('[data-saint-hymns] .hymn').evaluateAll((ns) =>
  ns.map((n) => ({
    head: n.querySelector('.hymn-kind')?.textContent?.trim(),
    lang: n.querySelector('.hymn-text')?.getAttribute('lang'),
    text: n.querySelector('.hymn-text')?.textContent?.trim().slice(0, 50),
  })),
);
console.log('rendered hymns      :', JSON.stringify(hymns, null, 1));

const raw = await page.evaluate(async () => {
  const r = await fetch('/saints/theodosius-of-totma/saint.json');
  const d = await r.json();
  return (d.hymns ?? []).map((h) => ({ kind: h.kind, hasEnglish: !!h.english, enText: h.english?.text?.slice(0, 40) }));
});
console.log('what the page fetched:', JSON.stringify(raw, null, 1));

await browser.close();
