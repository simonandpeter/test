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
 *   node scripts/screenful-bytes.mjs --serve            # build, serve, measure, gate
 *   npm run preview                                     # or against a server you started
 *   node scripts/screenful-bytes.mjs [carousel|search] [width] [base]
 *
 * It prints every response class and every on-screen picture, passing or
 * failing, for `lighthouse-floor.mjs`'s reason: a gate that only speaks when
 * it is angry teaches nobody where the margin went.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

/*
 * **Both faces, because the two recorded defects were one in each.** The
 * carousel stopped fetching `icon.jpg` on 2026-09-06 and the grid did not, so
 * a run over the row alone reported the search face's 1,005 kB as fixed. They
 * are one page and one budget; measure them together or measure half of it.
 */
const FACES = ['carousel', 'search'];

/**
 * **Bytes of saint pictures in the opening screenful, per face.**
 *
 * This is the number both of 2026-09-12's picture defects were stated in:
 * **525 kB** in the carousel to draw two cards (a 560x373 file inside a
 * 150x100 box) and **1,005 kB** in the search face to draw two rows (a
 * 1200x1500, 765 kB original inside a 48x48 thumbnail). `make_thumbs.py`'s
 * second card size and the `srcset` that names it closed both.
 *
 * Measured after that fix, production build, 360 px, DPR 1, eleven runs:
 * carousel **123 128 129 133 138 141 147 147 158 177 208 kB** over 9-12
 * pictures, search **24-42 kB** over 4.
 *
 * **The spread is the shuffle and it is the whole difficulty of this number.**
 * Which saints the opening screenful deals is not fixed (trap 5) and their
 * files are not one size, so the median says nothing useful: a budget set near
 * 150 kB would be green four runs in five and red on the fifth, which is a
 * flake generator and not a gate. The budget has to clear the unlucky deal.
 *
 * 320 kB — 327,680 bytes, so it prints round — is **1.5x the worst of eleven
 * runs** and **0.6x the smaller of the two defects**. Both of those have to
 * hold: the first is what stops an unlucky shuffle going red, the second is
 * what keeps the gate able to fail honestly. If a future corpus pushes the
 * unlucky deal past 250 kB, re-measure rather than nudging this up — the room
 * between 208 and 525 is all the room there is.
 */
const PICTURE_BUDGET = 327_680;

/**
 * **How much bigger than its box a picture's file may be**, in linear pixels,
 * density-corrected — so 2.0 means four times the pixels the screen can show.
 *
 * The mismatch rather than the total is what this probe exists to print, and
 * it is the half a byte budget cannot catch: a screenful that happens to deal
 * small saints passes a budget while still handing every one of them a file
 * cut for a different screen.
 *
 * Measured at 360 px, DPR 1: the worst legitimate case is **1.87** — a 150 px
 * column taking `-card-sm.jpg`, which `build-manifest.mjs` caps at 280 px on
 * the long edge, so the row cannot do better without a third derivative. Rows
 * sit at 1.0. The two defects were **3.7** (560 into 150) and **25** (1200
 * into 48). 2.5 is above what the cap makes unavoidable and below the nearer
 * of the two failures.
 */
const OVERSIZE = 2.5;

const ORIGIN = 'http://localhost:4173';
const serve = process.argv.includes('--serve');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [modeArg, width = '360', base = ORIGIN] = args;
const dpr = Number(process.env.DPR ?? 1);

async function waitForServer(url, ms = 120_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`no server at ${url} after ${ms} ms`);
}

/*
 * `npm run preview` is a shell wrapper around vite, and killing the wrapper on
 * Windows leaves vite holding :4173 — the same case `lighthouse-floor.mjs`
 * handles the same way. `taskkill /T` takes the tree.
 */
function stopServer(proc) {
  if (process.platform !== 'win32') return void proc.kill();
  return new Promise((res) => spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', res));
}

async function measure(browser, mode) {
  const ctx = await browser.newContext({
    viewport: { width: Number(width), height: 780 },
    deviceScaleFactor: dpr,
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
          naturalW: i.naturalWidth,
          onScreen: r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh && r.width > 0,
        };
      })
      .filter((i) => i.src);
  });
  await ctx.close();
  return { rows: [...seen.entries()].map(([url, v]) => ({ url, ...v })), drawn };
}

const kb = (n) => `${Math.round(n / 1024)} kB`;

function report(mode, { rows, drawn }) {
  const total = rows.reduce((t, r) => t + r.bytes, 0);
  const byType = {};
  for (const r of rows) byType[r.type] = (byType[r.type] ?? 0) + r.bytes;

  /*
   * The total is printed and deliberately **not** gated. Most of it is the
   * manifest and the entry bundle, which grow a saint at a time — a budget on
   * it would go red on the corpus rather than on a regression — and the
   * JavaScript half already has a gate of its own in
   * `e2e/download-limiter.spec.js`. What is unowned, and what this script is
   * for, is the pictures.
   */
  console.log(`/saints (${mode}) at ${width} px, DPR ${dpr} — ${rows.length} responses, ${kb(total)}`);
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${t.padEnd(10)} ${kb(n)}`);

  const images = rows.filter((r) => r.type === 'image' && /saints\//.test(r.url)).sort((a, b) => b.bytes - a.bytes);
  const pictureBytes = images.reduce((t, r) => t + r.bytes, 0);
  const budgetOk = pictureBytes <= PICTURE_BUDGET;
  console.log(
    `\n  saint pictures: ${images.length}, ${kb(pictureBytes)}  (budget ${kb(PICTURE_BUDGET)})` +
      (budgetOk ? `  — ${kb(PICTURE_BUDGET - pictureBytes)} to spare` : '  **OVER**'),
  );

  const onScreen = drawn.filter((d) => d.onScreen);
  console.log(`  pictures on screen: ${onScreen.length}`);
  const oversize = [];
  for (const d of onScreen.slice(0, 10)) {
    const hit = rows.find((r) => r.url === d.src);
    // The ratio the box can actually use: a dense screen legitimately wants a
    // file `dpr` times its CSS width, which is the whole point of the `srcset`.
    const factor = d.w > 0 && d.naturalW ? d.naturalW / (d.w * dpr) : 0;
    if (factor > OVERSIZE) oversize.push({ ...d, factor });
    console.log(
      `    drawn ${String(d.w).padStart(3)}x${String(d.h).padStart(3)} css   file ${d.natural.padEnd(9)} ${kb(hit?.bytes ?? 0).padStart(7)}` +
        `   x${factor.toFixed(2)}${factor > OVERSIZE ? ' **OVERSIZE**' : ''}   ${d.src.split('/').slice(-1)[0]}`,
    );
  }

  return { mode, pictureBytes, count: images.length, budgetOk, oversize };
}

let server;
const results = [];
try {
  if (serve) {
    const build = spawn('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });
    await new Promise((res, rej) => {
      build.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build failed (${code})`))));
    });
    server = spawn('npm', ['run', 'preview'], { shell: true, stdio: 'ignore' });
    await waitForServer(ORIGIN + '/');
  }

  const browser = await chromium.launch();
  try {
    for (const mode of modeArg ? [modeArg] : FACES) {
      results.push(report(mode, await measure(browser, mode)));
      console.log('');
    }
  } finally {
    await browser.close();
  }
} finally {
  /*
   * A `vite preview` outliving its script serves a stale dist to the next
   * suite, which has produced a false green here twice (playwright.config.js).
   */
  if (server) await stopServer(server);
}

console.log(
  `budget: saint pictures <= ${kb(PICTURE_BUDGET)} per face, no picture over x${OVERSIZE} its box, at ${width} px DPR ${dpr}`,
);

let bad = 0;
for (const r of results) {
  if (!r.budgetOk) {
    bad += 1;
    console.error(
      `${r.mode}: ${kb(r.pictureBytes)} of saint pictures over the ${kb(PICTURE_BUDGET)} budget, in ${r.count} files. ` +
        `PICTURE_BUDGET's comment has what the two 2026-09-12 defects looked like and what closed them.`,
    );
  }
  for (const d of r.oversize) {
    bad += 1;
    console.error(
      `${r.mode}: ${d.src.split('/').slice(-1)[0]} is ${d.natural} in a ${d.w}x${d.h} css box at DPR ${dpr} — ` +
        `x${d.factor.toFixed(2)}, over x${OVERSIZE}. Either the wrong derivative is being named or \`sizes\` is lying about the box.`,
    );
  }
}
if (bad) process.exit(1);
console.log(`${results.length} face${results.length === 1 ? '' : 's'}, all inside it`);
