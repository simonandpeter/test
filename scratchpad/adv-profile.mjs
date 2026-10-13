/**
 * **A CPU profile of the real boot**, so the seconds are attributed to named
 * functions instead of to a theory.
 *
 * `adv-phases.mjs` times candidate steps one at a time and can only price the
 * steps somebody thought of; this samples the whole of what actually runs
 * between `goto` and the first advanced-search card, and prints the heaviest
 * self time. It runs against the **build**, so the names are minified — the
 * `url:line` is what identifies them, and a source map is not needed to tell
 * one file's worth of work from another's.
 *
 *   npm run preview
 *   node scratchpad/adv-profile.mjs [press|direct] [cpuRate] [base]
 */
import { chromium } from '@playwright/test';

const [, , mode = 'direct', rate = '4', base = 'http://localhost:4317'] = process.argv;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
const page = await ctx.newPage();
await page.addInitScript(
  (v) => localStorage.setItem('gos-settings', JSON.stringify(v)),
  {
    church: 'russian',
    language: 'en',
    reckoning: 'gregorian',
    indexMode: mode === 'direct' ? 'search' : 'carousel',
    coachSeen: ['church-open', 'lang-open'],
  },
);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
});
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await page.goto(base + '/saints', { waitUntil: 'commit' });
if (mode === 'press') {
  await page.locator('.cx-card').first().waitFor({ timeout: 120000 });
  await page.locator('[data-mode-toggle]').click();
}
await page.locator('.index-card').first().waitFor({ timeout: 120000 });
const { profile } = await cdp.send('Profiler.stop');

const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const total = profile.samples.length;
for (const id of profile.samples) {
  const n = byId.get(id);
  if (!n) continue;
  const f = n.callFrame;
  const key = `${f.functionName || '(anonymous)'}  ${String(f.url).split('/').pop()}:${f.lineNumber}:${f.columnNumber}`;
  self.set(key, (self.get(key) ?? 0) + 1);
}
const dur = (profile.endTime - profile.startTime) / 1000;
console.log(`${mode} at ${rate}x: ${Math.round(dur)} ms wall, ${total} samples`);
for (const [k, n] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
  console.log(`${String(Math.round((n / total) * dur)).padStart(6)} ms  ${k}`);
}
await browser.close();
