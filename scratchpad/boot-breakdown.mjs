/**
 * Where boot time goes by *category*, from the engine's own counters.
 *
 * A profile names functions; it does not say how much of a page's cost is
 * script against style against layout. `Performance.getMetrics` does, and it
 * settles arguments that sampling cannot — the row's DOM size looked like the
 * prize on a node count and was worth ~100 ms when measured.
 */
import { chromium } from '@playwright/test';
const [, , route = '/saints', rate = '10', base = 'http://localhost:4173'] = process.argv;
const browser = await chromium.launch();
const rows = [];
for (let run = 0; run < 3; run += 1) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...(process.env.BOOT_REDUCED ? { reducedMotion: 'reduce' } : {}) });
  const page = await ctx.newPage();
  await page.addInitScript((mode) => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: mode, coachSeen: ['church-open','lang-open'] })), process.env.BOOT_MODE ?? 'carousel');
  if (process.env.BOOT_REDUCED) await ctx.addInitScript(() => {});
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
  if (process.env.BOOT_NOCV) {
    await page.addStyleTag({ content: '.cx-cell { content-visibility: visible !important; }' }).catch(() => {});
  }
  await page.goto(base + route, { waitUntil: 'domcontentloaded' });
  if (process.env.BOOT_NOCV) {
    await page.addStyleTag({ content: '.cx-cell { content-visibility: visible !important; }' }).catch(() => {});
  }
  await page.locator(route === '/saints' ? '.cx-card' : 'main').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(3500);
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
  rows.push(m);
  await ctx.close();
}
const med = (k) => {
  const v = rows.map((r) => r[k] ?? 0).sort((a, b) => a - b)[1];
  return typeof v === 'number' && v < 100 ? Math.round(v * 1000) : Math.round(v);
};
console.log(`${route} ${process.env.BOOT_MODE ?? 'carousel'}${process.env.BOOT_REDUCED ? ' reduced-motion' : ''}${process.env.BOOT_NOCV ? ' no-content-visibility' : ''} at ${rate}x, median of 3`);
for (const k of ['TaskDuration', 'ScriptDuration', 'RecalcStyleDuration', 'LayoutDuration', 'V8CompileDuration']) {
  console.log(`  ${k.replace('Duration','').padEnd(14)} ${String(med(k)).padStart(6)} ms`);
}
console.log(`  ${'Nodes'.padEnd(14)} ${String(med('Nodes')).padStart(6)}`);
console.log(`  ${'LayoutCount'.padEnd(14)} ${String(med('LayoutCount')).padStart(6)}`);
console.log(`  ${'RecalcStyleCount'.padEnd(14)} ${String(med('RecalcStyleCount')).padStart(6)}`);
await browser.close();
