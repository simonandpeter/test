/**
 * Real frames the compositor produced, over the first N ms of a route.
 * CDP Page.startScreencast only emits when a frame is actually presented, so
 * the timestamps are what the reader saw and the gaps are what they did not.
 *
 *   node scratchpad/cast.mjs [route] [rate] [width] [ms]
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const route = process.argv[2] ?? '/saints';
const rate = Number(process.argv[3] ?? 6);
const width = Number(process.argv[4] ?? 360);
const ms = Number(process.argv[5] ?? 2500);
const out = `scratchpad/cast-${route.replace(/\W+/g, '_')}-${rate}x-${width}`;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 780 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Page.enable');

const frames = [];
let t0 = 0;
cdp.on('Page.screencastFrame', async (f) => {
  const t = f.metadata.timestamp * 1000;
  if (!t0) t0 = t;
  const rel = Math.round(t - t0);
  frames.push(rel);
  writeFileSync(`${out}/${String(frames.length).padStart(3, '0')}-${rel}ms.jpg`, Buffer.from(f.data, 'base64'));
  await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});

await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
await page.goto('http://localhost:4173' + route, { waitUntil: 'commit' });
if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
await page.waitForTimeout(ms);
await cdp.send('Page.stopScreencast');

console.log(`${frames.length} presented frames in ${ms} ms at ${rate}x, ${width} px -> ${out}`);
let prev = 0;
const gaps = [];
for (const f of frames) {
  if (f - prev > 100) gaps.push(`${prev}->${f} (${f - prev} ms)`);
  prev = f;
}
console.log('gaps over 100 ms:', gaps.join('  ') || 'none');
console.log('frame times:', frames.join(' '));
await browser.close();
