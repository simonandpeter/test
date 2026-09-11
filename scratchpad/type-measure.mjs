import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const w of [1280, 1440, 1877]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 950 } });
  await ctx.addInitScript(() => {
    const k='gos-settings';
    const n=JSON.parse(localStorage.getItem(k) ?? '{}');
    localStorage.setItem(k, JSON.stringify({...n, church:'romanian', language:'en', reckoning:'gregorian', seenCoach:true, theme:'vigil'}));
  });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(() => {
    // the longest paragraph on the page is the life prose
    const ps = [...document.querySelectorAll('p')]
      .map(e => ({ e, n: e.textContent.trim().length }))
      .sort((a, b) => b.n - a.n);
    const out = [];
    const probe = (label, e) => {
      if (!e) return;
      const cs = getComputedStyle(e);
      const c = document.createElement('span');
      c.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font}`;
      c.textContent = 'abcdefghijklmnopqrstuvwxyz';
      document.body.appendChild(c);
      const avg = c.getBoundingClientRect().width / 26;
      c.remove();
      const box = Math.round(e.getBoundingClientRect().width);
      out.push({ label, px: parseFloat(cs.fontSize).toFixed(1),
        lh: (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)).toFixed(2),
        box, cpl: Math.round(box / avg) });
    };
    probe('life prose', ps[0]?.e);
    probe('saint name', document.querySelector('main h2'));
    probe('date h1', document.querySelector('h1'));
    probe('sidebar hymn', document.querySelector('[class*=hymn] p, [class*=hymn]'));
    return out;
  });
  console.log(`\n=== ${w} px ===`);
  for (const x of r) console.log(`  ${x.label.padEnd(13)} ${String(x.px).padStart(5)} px   lh ${x.lh}   column ${String(x.box).padStart(4)} px   ~${x.cpl} chars/line`);
  await ctx.close();
}
await b.close();
