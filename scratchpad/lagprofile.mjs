import { chromium } from 'playwright';

const URL = process.env.BASE ?? 'http://localhost:4173';
const RATE = Number(process.env.RATE ?? 6);
const PHASE = process.env.PHASE ?? 'load';

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 360, height: 780 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian' })));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Profiler.enable');

if (PHASE === 'load') {
  await page.goto(`${URL}/saints`, { waitUntil: 'commit' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await cdp.send('Profiler.start');
  await page.waitForTimeout(6000);
} else {
  await page.goto(`${URL}/saints`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
  await cdp.send('Profiler.start');
  await page.evaluate(() => document.querySelector('button[data-mode-toggle]').click());
  await page.waitForTimeout(3000);
}

const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const total = profile.samples?.length ?? 0;
for (const id of profile.samples ?? []) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame;
  const where = `${f.functionName || '(anonymous)'}  ${String(f.url).split('/').pop()}:${f.lineNumber + 1}`;
  self.set(where, (self.get(where) ?? 0) + 1);
}
const rows = [...self].sort((a, c) => c[1] - a[1]).slice(0, 14);
console.log(`PHASE=${PHASE} RATE=${RATE}  ${total} samples`);
for (const [where, n] of rows) console.log(`${String(Math.round((n / total) * 100)).padStart(3)}%  ${where}`);
await b.close();
