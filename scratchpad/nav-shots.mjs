import { chromium } from '@playwright/test';
const browser = await chromium.launch();
// 'dark', not the design's word 'vigil': storage holds 'light' or 'dark' and
// nothing else (lib/settings.js, THEMES). This said 'vigil' until 2026-09-10
// and the strip labelled dark was shot in the light theme.
const base = { theme: null, church: 'russian', coachSeen: ['church-open', 'lang-open'] };
for (const [name, lang, url, theme] of [['en', null, '/', null], ['ru', 'ru', '/', null], ['el', 'el', '/texts', null], ['dark', null, '/map', 'dark']]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addInitScript((v) => localStorage.setItem('gos-settings', JSON.stringify(v)), { ...base, language: lang, theme });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:4173${url}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shots/strip3-${name}.png`, clip: { x: 0, y: 24, width: 360, height: 54 } });
  await ctx.close();
}
await browser.close();
