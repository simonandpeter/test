/* Where the All Saints row's main-thread time goes, by function. Dev server, so
   the names are real. RATE=10 for a mid-range phone. */
import { chromium } from '@playwright/test';

const RATE = Number(process.env.RATE ?? 4);
const URL = process.env.URL ?? 'http://localhost:5173/saints';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await page.goto(URL, { waitUntil: 'commit' });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
await cdp.send('Profiler.start');
await page.waitForTimeout(8000);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
for (let i = 0; i < profile.samples.length; i += 1) {
  const dt = profile.timeDeltas[i] ?? 0;
  const n = byId.get(profile.samples[i]);
  if (!n) continue;
  const f = n.callFrame;
  const where = `${f.functionName || '(anonymous)'}  ${(f.url || '').split('/').pop()}:${f.lineNumber + 1}`;
  self.set(where, (self.get(where) ?? 0) + dt / 1000);
}
const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`sampled ${Math.round(total)} ms of main thread at x${RATE}`);
for (const [where, ms] of rows) console.log(`${String(Math.round(ms)).padStart(6)} ms  ${where}`);
await browser.close();
