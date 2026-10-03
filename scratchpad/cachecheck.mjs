import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' }));
  const proto = CanvasRenderingContext2D.prototype;
  const real = proto.measureText;
  window.__m = { calls: 0, texts: new Set(), fonts: new Set(), keys: new Set() };
  proto.measureText = function (t) {
    window.__m.calls += 1;
    window.__m.texts.add(t);
    window.__m.fonts.add(this.font);
    window.__m.keys.add(this.font + '|' + t);
    return real.call(this, t);
  };
});
await page.goto('http://localhost:4173/saints', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate(() => ({
  calls: window.__m.calls,
  distinctTexts: window.__m.texts.size,
  distinctFonts: [...window.__m.fonts],
  distinctFontText: window.__m.keys.size,
}))));
await b.close();
