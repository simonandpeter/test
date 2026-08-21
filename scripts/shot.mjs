/**
 * Ad-hoc screenshotter for looking at a change (house rule: render it and look
 * at it). Not part of the test suite; `node scripts/shot.mjs <name> <url>
 * [width] [steps...]` against a running preview on :4173.
 *
 * Steps are literal strings: `click:<selector>`, `wait:<ms>`.
 */
import { chromium } from '@playwright/test';

const [name, url, width = '1280', ...steps] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
await page.goto(`http://localhost:4173${url}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const step of steps) {
  const [kind, arg] = [step.slice(0, step.indexOf(':')), step.slice(step.indexOf(':') + 1)];
  if (kind === 'click') await page.click(arg);
  if (kind === 'wait') await page.waitForTimeout(Number(arg));
}

await page.screenshot({ path: `shots/${name}.png` });
await browser.close();
