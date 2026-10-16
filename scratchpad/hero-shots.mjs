/**
 * Does a swapped icon read in the hero slot? `shot.mjs` is hardcoded to the
 * preview on 4173, and a build empties `dist/` under anything already serving
 * it, so this one takes a base and goes at the dev server instead.
 *
 *   node scratchpad/hero-shots.mjs <base> <slug> [slug…]
 */
import { chromium } from '@playwright/test';

const [base, ...slugs] = process.argv.slice(2);
const browser = await chromium.launch();
for (const slug of slugs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${base}/saints/${slug}`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const box = await page.locator('img').first().boundingBox().catch(() => null);
  const natural = await page
    .locator('img')
    .first()
    .evaluate((el) => [el.naturalWidth, el.naturalHeight, getComputedStyle(el).objectFit])
    .catch(() => null);
  console.log(`${slug.padEnd(34)} box ${box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'none'}`.padEnd(54) + `natural ${natural ? natural.join(' ') : 'none'}`);
  await page.screenshot({ path: `shots/hero-${slug}.png` });
  await page.close();
}
await browser.close();
