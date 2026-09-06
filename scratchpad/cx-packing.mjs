/*
 * What the packer actually deals, over the whole run rather than the opening
 * screenful. Reads the built track: how many columns hold a picture, the
 * longest run that holds none, how many saints a column of names carries, and
 * how many icons stand in one screenful.
 *
 *   node scratchpad/cx-packing.mjs [--width 360]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i === -1 ? d : process.argv[i + 1];
};
const WIDTH = Number(arg('width', 360));
const HEIGHT = Number(arg('height', WIDTH < 700 ? 800 : 900));
const PORT = 4183;

const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  shell: true,
  stdio: 'ignore',
});
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {}
  await sleep(250);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, isMobile: WIDTH < 700 });
const page = await ctx.newPage();
await page.goto(`http://localhost:${PORT}/saints`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-carousel-track] .cx-cell');
await page.waitForTimeout(1500);

const out = await page.evaluate(() => {
  const track = document.querySelector('[data-carousel-track]');
  const cells = [...track.children];
  const has = cells.map((c) => c.querySelector('.cx-media') !== null);
  let longest = 0;
  let run = 0;
  for (const h of has) {
    run = h ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  const nameCols = cells.filter((c) => c.classList.contains('is-names'));
  const picCols = cells.filter((c) => !c.classList.contains('is-names'));
  const depth = (list) => {
    const d = list.map((c) => c.querySelectorAll('.cx-card').length).sort((a, b) => a - b);
    return d.length ? { min: d[0], median: d[Math.floor(d.length / 2)], max: d[d.length - 1] } : null;
  };
  /*
   * Icons in a screenful, averaged over the whole run rather than read once.
   * Where the row happens to be standing is one sample of a shuffle, and a
   * single reading of it says as much about the deal as about the packing —
   * CLAUDE.md's fifth trap, in a bench rather than a test.
   *
   * Measured off the cells' own offsets, not by scrolling: a window is slid
   * along the track's content and the pictures inside it counted, which asks
   * the same question without waiting for a loop to settle at each stop.
   */
  const box = track.getBoundingClientRect();
  const width = track.clientWidth;
  const spots = cells.map((c) => ({
    left: c.offsetLeft,
    right: c.offsetLeft + c.getBoundingClientRect().width,
    icons: c.querySelectorAll('.cx-media').length,
  }));
  const end = spots.length ? spots[spots.length - 1].right : 0;
  const screens = [];
  for (let x = 0; x + width <= end; x += Math.max(40, Math.round(width / 6))) {
    let n = 0;
    for (const s of spots) if (s.right > x && s.left < x + width) n += s.icons;
    screens.push(n);
  }
  screens.sort((a, b) => a - b);
  const onScreen = screens.length
    ? {
        min: screens[0],
        median: screens[Math.floor(screens.length / 2)],
        mean: Math.round((screens.reduce((a, b) => a + b, 0) / screens.length) * 10) / 10,
        max: screens[screens.length - 1],
        screenfuls: screens.length,
      }
    : null;
  const fill = parseFloat(getComputedStyle(track.querySelector('.cx-cell')).minHeight) || 0;
  const tallest = Math.max(...cells.map((c) => c.getBoundingClientRect().height));
  return {
    cells: cells.length,
    withPicture: has.filter(Boolean).length,
    longestTextRun: longest,
    nameColumns: nameCols.length,
    nameDepth: depth(nameCols),
    pictureDepth: depth(picCols),
    nameWidth: nameCols.length ? Math.round(nameCols[0].getBoundingClientRect().width) : null,
    pictureWidth: picCols.length ? Math.round(picCols[0].getBoundingClientRect().width) : null,
    onScreenIcons: onScreen,
    packedFor: Math.round(fill),
    tallestColumn: Math.round(tallest),
    pageScrolls: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  };
});
console.log(`${WIDTH}x${HEIGHT}`);
console.log(JSON.stringify(out, null, 2));
await browser.close();
p.kill();
process.exit(0);
