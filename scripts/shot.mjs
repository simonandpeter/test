/**
 * Ad-hoc screenshotter for looking at a change (house rule: render it and look
 * at it). Not part of the test suite; `node scripts/shot.mjs <name> <url>
 * [width] [steps...]` against a running preview on :4173.
 *
 * Steps are literal strings: `click:<selector>`, `wait:<ms>`, `key:<key>`,
 * `scroll:<px>`, `full:1` (whole page rather than the viewport), and the two
 * settings the whole site reads — `lang:<id>`, `church:<id>` — which are
 * written into localStorage *before* the first load, because both are read
 * once on boot and a page already painted in English does not repaint.
 */
import { chromium } from '@playwright/test';

const [name, url, width = '1280', ...steps] = process.argv.slice(2);
const parse = (step) => [step.slice(0, step.indexOf(':')), step.slice(step.indexOf(':') + 1)];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });

// The settings steps are taken first and taken out: they have to be in storage
// before the app boots, not replayed in the order they were typed.
const settings = {};
const rest = [];
for (const step of steps) {
  const [kind, arg] = parse(step);
  if (kind === 'lang') settings.language = arg;
  else if (kind === 'church') settings.church = arg;
  else rest.push(step);
}
if (Object.keys(settings).length) {
  await page.addInitScript((values) => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, ...values }));
  }, settings);
}

await page.goto(`http://localhost:4173${url}`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

let full = false;
for (const step of rest) {
  const [kind, arg] = parse(step);
  if (kind === 'click') await page.click(arg);
  if (kind === 'wait') await page.waitForTimeout(Number(arg));
  if (kind === 'key') await page.keyboard.press(arg);
  if (kind === 'scroll') await page.evaluate((y) => window.scrollTo(0, y), Number(arg));
  if (kind === 'full') full = true;
}

await page.screenshot({ path: `shots/${name}.png`, fullPage: full });
await browser.close();
