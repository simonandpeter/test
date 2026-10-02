/**
 * Does the grid still reach its end? The layout now stops a few screens ahead
 * of the reader, so this drives the page to the bottom the way a reader would
 * and checks that it keeps growing to the full corpus and keeps cards under
 * them the whole way.
 *
 *   npm run dev
 *   node scratchpad/adv-scroll.mjs [base]
 */
import { chromium } from '@playwright/test';

const [, , base = 'http://localhost:5173'] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.locator('[data-mode-toggle]').click();
await page.locator('.grid .index-card').first().waitFor({ timeout: 120000 });

const read = () => page.evaluate(() => ({
  height: parseFloat(document.querySelector('[data-grid-inner]').style.height),
  cards: document.querySelectorAll('.grid .index-card').length,
  y: window.scrollY,
  max: document.documentElement.scrollHeight - window.innerHeight,
}));

let last = -1, step = 0;
let state = await read();
console.log(`start  page ${state.height.toFixed(0)}px  ${state.cards} cards`);
while (state.height !== last && step < 400) {
  last = state.height;
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(60);
  state = await read();
  step++;
  if (step % 25 === 0 || state.height === last) {
    console.log(`step ${String(step).padStart(3)}  page ${state.height.toFixed(0)}px  y ${state.y.toFixed(0)}  ${state.cards} cards`);
  }
}
console.log(`\nsettled after ${step} jumps to the bottom: page ${state.height.toFixed(0)}px, ${state.cards} cards mounted at the end`);
await browser.close();
