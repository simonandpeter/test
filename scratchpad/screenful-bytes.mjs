/**
 * **What a phone downloads for the first screenful of All Saints**, by face,
 * and what the pictures in it are actually drawn at.
 *
 * HANDOFF: 579 kB where ~189 would do. This is that claim, per response, with
 * the drawn CSS size of every picture beside the file it came from — the
 * mismatch is the whole defect and a byte total alone cannot show it.
 *
 * `serviceWorkers: 'block'`, because a service worker's fetches never reach
 * the page's own network log (trap 13) and the second visit would report a
 * page that downloads nothing.
 *
 *   npm run preview
 *   node scratchpad/screenful-bytes.mjs [carousel|search] [width]
 */
import { chromium } from '@playwright/test';

const [, , mode = 'carousel', width = '360', base = 'http://localhost:4173'] = process.argv;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(width), height: 780 },
  deviceScaleFactor: Number(process.env.DPR ?? 1),
  serviceWorkers: 'block',
});
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

const seen = new Map();
page.on('response', async (res) => {
  const url = res.url();
  if (seen.has(url)) return;
  let bytes = Number(res.headers()['content-length'] ?? 0);
  if (!bytes) {
    try {
      bytes = (await res.body()).length;
    } catch {
      bytes = 0;
    }
  }
  seen.set(url, { bytes, type: res.request().resourceType() });
});

await page.goto(`${base}/saints`, { waitUntil: 'domcontentloaded' });
await page.locator(mode === 'carousel' ? '.cx-card' : '.index-card').first().waitFor({ timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3500);

const drawn = await page.evaluate(() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return [...document.querySelectorAll('img')]
    .map((i) => {
      const r = i.getBoundingClientRect();
      return {
        src: i.currentSrc || i.src,
        w: Math.round(r.width),
        h: Math.round(r.height),
        natural: `${i.naturalWidth}x${i.naturalHeight}`,
        onScreen: r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh && r.width > 0,
      };
    })
    .filter((i) => i.src);
});
await browser.close();

const rows = [...seen.entries()].map(([url, v]) => ({ url, ...v }));
const total = rows.reduce((t, r) => t + r.bytes, 0);
const byType = {};
for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + r.bytes;

const kb = (n) => `${Math.round(n / 1024)} kB`;
console.log(`/saints (${mode}) at ${width} px, DPR ${process.env.DPR ?? 1} — ${rows.length} responses, ${kb(total)}`);
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(10)} ${kb(n)}`);

const images = rows.filter((r) => r.type === 'image' && /saints\//.test(r.url)).sort((a, b) => b.bytes - a.bytes);
console.log(`\n  saint pictures: ${images.length}, ${kb(images.reduce((t, r) => t + r.bytes, 0))}`);
const onScreen = drawn.filter((d) => d.onScreen);
console.log(`  pictures on screen: ${onScreen.length}`);
for (const d of onScreen.slice(0, 10)) {
  const hit = rows.find((r) => r.url === d.src);
  console.log(
    `    drawn ${String(d.w).padStart(3)}x${String(d.h).padStart(3)} css   file ${d.natural.padEnd(9)} ${kb(hit?.bytes ?? 0).padStart(7)}   ${d.src.split('/').slice(-1)[0]}`,
  );
}
