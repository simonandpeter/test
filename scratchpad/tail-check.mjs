/* How long the barren tail is, over many deals: the run is a shuffle, so any
 * bound measured off one of them is a fact about that deal. */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const PORT = 4186;
const W = Number(process.argv[2] ?? 360);
const N = Number(process.argv[3] ?? 12);
const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), shell: true, stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch {} await sleep(250); }
const browser = await chromium.launch();
const runs = [];
for (let i = 0; i < N; i++) {
  const ctx = await browser.newContext({ viewport: { width: W, height: W < 700 ? 780 : 720 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/saints`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cx-cell');
  await page.waitForTimeout(700);
  runs.push(await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[data-carousel-track] > .cx-cell')];
    const has = cells.map((c) => c.querySelector('.cx-media') !== null);
    let longest = 0, run = 0;
    for (const h of has) { run = h ? 0 : run + 1; longest = Math.max(longest, run); }
    // The same, but only up to the last column that has a picture: the tail
    // after it is the corpus running out of icons, not the packing.
    const last = has.lastIndexOf(true);
    let inside = 0; run = 0;
    for (let i = 0; i < last; i++) { run = has[i] ? 0 : run + 1; inside = Math.max(inside, run); }
    return { cells: cells.length, withPicture: has.filter(Boolean).length, longest, inside, tail: has.length - 1 - last };
  }));
  await ctx.close();
}
await browser.close(); p.kill();
const col = (k) => runs.map(r => r[k]).sort((a,b)=>a-b);
console.log(`${W}px, ${N} deals`);
for (const k of ['longest','inside','tail','withPicture','cells']) {
  const v = col(k); console.log(`  ${k.padEnd(12)} min ${v[0]}  median ${v[Math.floor(v.length/2)]}  max ${v[v.length-1]}`);
}
process.exit(0);
