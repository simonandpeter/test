/**
 * Self time with the caller chain, so a function reached from three places is
 * three rows and not one. `cpu-profile.mjs` prints a flat list; this answers
 * "who asked for it", which is the question when the same leaf (greedyLines)
 * is paid for by the grid, by the carousel's prefix and by the idle repack.
 *
 *   npm run dev            # names survive there
 *   node scratchpad/attribute.mjs carousel 10 http://localhost:5174
 */
import { chromium } from '@playwright/test';

const [, , mode = 'carousel', rate = '10', base = 'http://localhost:5174'] = process.argv;
const UNTIL = process.env.ATTR_UNTIL ?? 'card'; // card | settle

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(
  (m) =>
    localStorage.setItem(
      'gos-settings',
      JSON.stringify({
        church: 'russian',
        language: 'en',
        reckoning: 'gregorian',
        indexMode: m,
        coachSeen: ['church-open', 'lang-open'],
      }),
    ),
  mode,
);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rate) });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
await cdp.send('Profiler.start');
await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
await page.locator(mode === 'carousel' ? '.cx-card' : 'main').first().waitFor({ timeout: 60000 });
if (UNTIL === 'settle') await page.waitForTimeout(2500);
const { profile } = await cdp.send('Profiler.stop');

const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const total = profile.nodes.reduce((s, n) => s + (n.hitCount ?? 0), 0);
const perHit = (profile.endTime - profile.startTime) / 1000 / Math.max(total, 1);
const label = (n) => {
  const f = n.callFrame;
  const where = f.url ? f.url.replace(/^.*\/(assets\/)?/, '').replace(/\?.*$/, '') : '(native)';
  return `${f.functionName || '(anon)'}@${where}:${f.lineNumber + 1}`;
};
const chain = (id, depth) => {
  const out = [];
  let cur = id;
  for (let i = 0; i < depth && cur !== undefined; i += 1) {
    out.push(label(byId.get(cur)));
    cur = parent.get(cur);
  }
  return out;
};
const rows = profile.nodes
  .filter((n) => (n.hitCount ?? 0) > 0)
  .map((n) => ({ ms: Math.round(n.hitCount * perHit), path: chain(n.id, 6) }))
  .sort((a, b) => b.ms - a.ms);

console.log(
  `${mode} ${rate}x until ${UNTIL} — ${Math.round((profile.endTime - profile.startTime) / 1000)} ms profiled\n`,
);
const grep = process.env.ATTR_GREP;
const shown = grep ? rows.filter((r) => r.path.join(' ').includes(grep)) : rows.slice(0, 14);
for (const r of shown) console.log(`${String(r.ms).padStart(6)} ms  ${r.path.join('  <  ')}`);
await browser.close();
