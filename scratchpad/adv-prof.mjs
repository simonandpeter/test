/**
 * Where the Advanced-search press spends its time, by self time.
 *
 * A CPU profile taken across the press alone, against the dev server so the
 * frames carry real function names. Reports the heaviest self-time frames and
 * the total of the sample window.
 *
 *   npm run dev
 *   node scratchpad/adv-prof.mjs [cpuRate] [base]
 */
import { chromium } from '@playwright/test';

const [, , rate = '1', base = 'http://localhost:5173'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('[data-carousel-track] .cx-cell, [data-carousel-track] .cx-card').first().waitFor({ timeout: 120000 });

await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
await cdp.send('Profiler.start');
const t0 = await page.evaluate(() => performance.now());
await page.locator('[data-mode-toggle]').click();
await page.locator('.grid .index-card').first().waitFor();
const toCard = await page.evaluate((s) => performance.now() - s, t0);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const counts = new Map();
for (const id of profile.samples) counts.set(id, (counts.get(id) ?? 0) + 1);
const dt = (profile.endTime - profile.startTime) / 1000 / profile.samples.length;
for (const [id, n] of counts) {
  const node = byId.get(id);
  const f = node.callFrame;
  const where = `${f.functionName || '(anonymous)'}  ${(f.url || '').split('/').slice(-1)[0]}:${f.lineNumber + 1}`;
  self.set(where, (self.get(where) ?? 0) + n * dt);
}
console.log(`press → first card: ${toCard.toFixed(0)} ms; profile window ${((profile.endTime - profile.startTime) / 1000).toFixed(0)} ms`);
for (const [where, ms] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`${ms.toFixed(1).padStart(7)} ms  ${where}`);
}
await browser.close();
