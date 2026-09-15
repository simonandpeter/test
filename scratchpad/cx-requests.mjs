import { chromium } from '@playwright/test';
const browser = await chromium.launch();
for (const w of [360, 1280]) {
  const page = await browser.newPage({ viewport: { width: w, height: 780 }, reducedMotion: 'reduce' });
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel' })),
  );
  await page.goto('http://localhost:4173/saints', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const all = performance.getEntriesByType('resource').filter((e) => e.name.includes('/images/'));
    const tally = {};
    for (const e of all) {
      const m = e.name.match(/(icon[a-z-]*)\.(jpg|webp)$/);
      const k = m ? `${m[1]}.${m[2]}` : 'other';
      tally[k] = (tally[k] ?? 0) + 1;
    }
    return { tally, endsCardJpg: all.filter((e) => e.name.endsWith('-card.jpg')).length };
  });
  console.log(`${w}px`, JSON.stringify(r.tally), ' matching endsWith("-card.jpg"):', r.endsCardJpg);
  await page.close();
}
await browser.close();
