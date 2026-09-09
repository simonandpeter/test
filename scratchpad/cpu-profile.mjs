/**
 * Where All Saints' first second actually goes, by self time.
 *
 * `throttle-probe.mjs pack` says the carousel costs ~1,500 ms of blocking time
 * at 10x against the search face's 520. It does not say *what* is spending it,
 * and PLAN item 2 names the caption pack without ever having profiled. A
 * refactor of the endless engine is too expensive to start on an assumption.
 *
 *   npm run preview
 *   node scratchpad/cpu-profile.mjs           # carousel, 10x
 *   node scratchpad/cpu-profile.mjs search 4
 */
import { chromium } from '@playwright/test';

const [, , mode = 'carousel', rate = '10', base = 'http://localhost:4173'] = process.argv;

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
await page
  .locator(mode === 'carousel' ? '.cx-card' : 'main')
  .first()
  .waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);

const { profile } = await cdp.send('Profiler.stop');

/*
 * Self time per function, from the sample counts the profiler returns. `hitCount`
 * is samples landing in that frame itself, which is what "who is spending the
 * time" means -- total time would attribute everything to the router.
 */
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const total = profile.nodes.reduce((s, n) => s + (n.hitCount ?? 0), 0);
const span = (profile.endTime - profile.startTime) / 1000;
const perHit = span / Math.max(total, 1);

const rows = profile.nodes
  .filter((n) => (n.hitCount ?? 0) > 0)
  .map((n) => {
    const f = n.callFrame;
    const where = f.url ? f.url.replace(/^.*\/(assets\/)?/, '') : '(native)';
    return {
      name: `${f.functionName || '(anonymous)'}  ${where}:${f.lineNumber + 1}`,
      ms: Math.round(n.hitCount * perHit),
    };
  })
  .sort((a, b) => b.ms - a.ms);

console.log(`${mode} at ${rate}x — ${Math.round(span)} ms profiled, ${total} samples\n`);
for (const r of rows.slice(0, 18)) {
  console.log(`${String(r.ms).padStart(6)} ms  ${r.name}`);
}
await browser.close();
