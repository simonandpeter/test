/**
 * Does the map actually draw the saints a batch placed? Reads the canvas's own
 * `data-dots`, which the draw pass publishes, at desktop width, against a
 * preview served on 4186.
 */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const WANT = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4186/map', { waitUntil: 'load' });
const canvas = page.locator('canvas[data-dots]').first();
await canvas.waitFor({ timeout: 30000 });

let dots = [];
for (let i = 0; i < 40; i++) {
  dots = JSON.parse((await canvas.getAttribute('data-dots')) ?? '[]');
  if (dots.length) break;
  await page.waitForTimeout(250);
}
const slugs = new Set(dots.map((d) => d.slug));
console.log(`dots drawn at 1280x900: ${dots.length}`);
const found = WANT.filter((s) => slugs.has(s));
const missing = WANT.filter((s) => !slugs.has(s));
console.log(`of the batch, drawn: ${found.length}/${WANT.length}`);
if (missing.length) console.log(`not in data-dots: ${missing.join(' ')}`);
for (const s of found.slice(0, 4)) console.log(`  ${JSON.stringify(dots.find((x) => x.slug === s))}`);
await browser.close();
assert.ok(found.length > 0, 'no batch saint reached data-dots');
