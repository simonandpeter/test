/**
 * Does `hover()` on the drifting carousel actually stall on stability?
 *
 * The CI failure said "element is not stable" and gave up at 30 s. If that is
 * the mechanism, a short timeout should reproduce it here, where a 30 s one
 * never has.
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', reckoning: 'gregorian', indexMode: 'carousel', coachSeen: ['church-open', 'lang-open'] })));
await page.goto(`${BASE}/saints`, { waitUntil: 'networkidle' });
/*
 * **After the goto**, per CLAUDE.md's trap: a slower machine means longer
 * frames, which means a bigger per-frame step for the drift, which is the
 * difference between "stable" and never stable.
 */
const rate = Number(process.argv[3] ?? 1);
if (rate > 1) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  console.log(`CPU throttled ${rate}x`);
}
await page.locator('.cx-card').first().waitFor();

const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
const a = await at();
await page.waitForTimeout(600);
console.log(`drifting: scrollLeft ${a} -> ${await at()}`);

try {
  await page.locator('.cx-card').first().hover({ timeout: 3000 });
  console.log('hover(): succeeded');
} catch (e) {
  console.log('hover(): FAILED -', String(e).split('\n').find((l) => /not stable|Timeout|exceeded/.test(l))?.trim() ?? String(e).split('\n')[0]);
}

const box = await page.locator('[data-carousel-track]').boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
console.log('mouse.move(): succeeded');
const held = await at();
await page.waitForTimeout(600);
console.log(`still drifting under the pointer: ${held} -> ${await at()}`);
await browser.close();
