import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const w of [1100, 1280, 1440, 1877]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1200 } });
  await ctx.addInitScript(() => { const k='gos-settings';
    const n=JSON.parse(localStorage.getItem(k) ?? '{}');
    localStorage.setItem(k, JSON.stringify({...n, church:'greek', language:'en', reckoning:'gregorian', seenCoach:true})); });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('button,[role=button],a')]
      .find(b => /regmark-expanded/.test(b.className || ''));
    if (t) t.click();
  });
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const vis = e => { const b=e.getBoundingClientRect(); return b.width>0&&b.height>0; };
    const R = e => { const b=e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; };
    const hero = document.querySelector('.hero-figure');
    const thumbs = [...document.querySelectorAll('.register-cards.is-expanded .reg-thumb')].filter(vis);
    return { hero: hero ? R(hero) : null, regs: thumbs.slice(0,2).map(R) };
  });
  const match = r.regs.length && r.regs.every(x => x[0] === r.hero[0]);
  console.log(`${String(w).padStart(5)} px  hero mount ${JSON.stringify(r.hero)}  register ${JSON.stringify(r.regs)}  ${match ? 'MATCH' : 'differ'}`);
  await ctx.close();
}
await b.close();
