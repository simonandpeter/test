/**
 * The Daily hero's geometry at a list of widths: the left column, the
 * picture's column, the text column beside it, and the drawn crop. Scratch.
 *
 * node scratchpad/measure-hero.mjs [url] [widths...]
 */
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/calendar/2026-01-30';
const sizes = (process.argv[3] ?? '1280x900,1440x900,1920x1080,1024x900,2560x1440')
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { width: w, height: h };
  });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: sizes[0] });

const rows = [];
for (const size of sizes) {
  await page.setViewportSize(size);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const m = await page.evaluate(() => {
    const main = document.querySelector('.cal-main');
    const hero = document.querySelector('.hero');
    const fig = document.querySelector('.hero-figure');
    const media = document.querySelector('.hero-media');
    const img = media?.querySelector('img');
    const body = document.querySelector('.hero-body');
    const b = (el) => (el ? el.getBoundingClientRect() : null);
    const mainCs = main ? getComputedStyle(main) : null;
    return {
      mainW: b(main)?.width,
      mainInner: main ? main.clientWidth - parseFloat(mainCs.paddingLeft) - parseFloat(mainCs.paddingRight) : null,
      heroW: b(hero)?.width,
      tracks: hero ? getComputedStyle(hero).gridTemplateColumns : null,
      gap: hero ? getComputedStyle(hero).columnGap : null,
      figW: b(fig)?.width,
      figH: b(fig)?.height,
      mediaW: b(media)?.width,
      mediaH: b(media)?.height,
      bodyW: b(body)?.width,
      focus: media ? getComputedStyle(media).backgroundPosition : null,
      imgFocus: img ? getComputedStyle(img).objectPosition : null,
      ratio: b(media) ? b(media).height / b(media).width : null,
      innerH: window.innerHeight,
    };
  });
  rows.push({ size, ...m });
}

const f = (n, d = 2) => (n == null ? '—' : n.toFixed(d));
console.log(
  ['window', 'left col', 'hero col', 'text col', 'pic w', 'pic h', 'col/left', 'col/text', 'pic/text', 'h/window', 'h/w', 'focus'].join('\t'),
);
for (const r of rows) {
  console.log(
    [
      `${r.size.width}x${r.size.height}`,
      f(r.heroW),
      f(r.figW),
      f(r.bodyW),
      f(r.mediaW),
      f(r.mediaH),
      f(r.figW / r.heroW, 5),
      f(r.figW / r.bodyW, 5),
      f(r.mediaW / r.bodyW, 5),
      f(r.mediaH / r.innerH, 4),
      f(r.mediaH / r.mediaW ? r.mediaW / r.mediaH : 0, 4),
      r.imgFocus,
    ].join('\t'),
  );
}
console.log('\ntracks at each width:');
for (const r of rows) console.log(`  ${r.size.width}: ${r.tracks}  gap ${r.gap}`);

await browser.close();
