/**
 * Why are three saints of Constantinople inside Nicomedia's blob?
 *
 * `map.spec.js:3375` asserts the blobbed set at Nicomedia's ceiling zoom is
 * exactly Nicomedia's own company, which held while Constantinople was five
 * dots ninety kilometres away. It is twenty-six now. This prints, for the same
 * view the test flies to, every dot's picture position and which blob it was
 * put in, so the question — does a bigger crowd scatter further, or does the
 * grouping simply reach across the strait — is answered off the draw pass
 * rather than guessed.
 *
 *   node scratchpad/blob-reach.mjs [base]
 */
import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${BASE}/map`, { waitUntil: 'load' });
const canvas = page.locator('[data-map]');
await canvas.waitFor({ timeout: 30000 });
await page.waitForFunction(() => document.querySelector('[data-map]')?.dataset.land === 'ok', null, { timeout: 30000 });

await page.locator('[data-search-input]').fill('nicomedia');
await page.locator('[data-search-list] [role="option"], .map-search-row').first().waitFor({ timeout: 10000 });
await page.locator('[data-search-input]').press('Enter');
await page.waitForTimeout(4000);

const dots = JSON.parse((await canvas.getAttribute('data-dots')) ?? '[]');
const counts = JSON.parse((await canvas.getAttribute('data-blob-counts')) ?? '[]');
const open = await canvas.getAttribute('data-blob-open');
const zoom = await canvas.getAttribute('data-zoom');

console.log(`zoom ${zoom}  blobs ${JSON.stringify(counts)}  open ${open}`);
const blobbed = dots.filter((d) => d.blobId);
const byBlob = new Map();
for (const d of blobbed) {
  if (!byBlob.has(d.blobId)) byBlob.set(d.blobId, []);
  byBlob.get(d.blobId).push(d);
}
for (const [id, members] of byBlob) {
  const xs = members.map((m) => Math.round(m.x));
  const ys = members.map((m) => Math.round(m.y));
  console.log(`\nblob ${id}${id === open ? ' (open)' : ''}  ${members.length} members  x ${Math.min(...xs)}..${Math.max(...xs)}  y ${Math.min(...ys)}..${Math.max(...ys)}`);
  for (const m of members) console.log(`   ${String(Math.round(m.x)).padStart(5)},${String(Math.round(m.y)).padEnd(5)} ${m.slug}`);
}
const loose = dots.filter((d) => !d.blobId && d.x > -200 && d.x < 1480);
console.log(`\nunblobbed and near the frame: ${loose.length}`);
for (const d of loose.slice(0, 12)) console.log(`   ${String(Math.round(d.x)).padStart(5)},${String(Math.round(d.y)).padEnd(5)} n=${d.n} ${d.slug}`);
await browser.close();
