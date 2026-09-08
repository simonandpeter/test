/**
 * One image of the whole site: every route × width × theme × language, laid out
 * as a labelled grid.
 *
 * `node scripts/contact-sheet.mjs` — against `npm run dev` on :5173 by default,
 * so a visual change costs a reload rather than a build.
 *
 * The point is *one look*. Shooting a surface at a time and reading them one at
 * a time is how a header ships at 42% of a label when it was meant to be half:
 * the number looked right and nothing put the widths side by side.
 *
 *   --base=http://localhost:4173   shoot the built preview instead
 *   --widths=360,1280             default 360,768,1280
 *   --themes=day,vigil            default both
 *   --langs=en,ru                 default en
 *   --routes=/,/saints,/map       default all six
 *   --height=780                  viewport height, and the tile crop
 *   --tile=420                    tile width in the sheet
 *   --out=shots/contact.png
 *   --settle=1200                 ms to wait after networkidle
 *   --still                       deterministic: reduced motion, fixed shuffle
 *
 * Working on one width, raise the tile and drop the rest — a desktop page at
 * 420 px of sheet is a third of its real size and reads as a thumbnail:
 *
 *   node scripts/contact-sheet.mjs --widths=1280 --tile=900 --themes=day
 *
 * `shots/` is gitignored. Individual tiles are written beside the sheet so a
 * detail can be opened at full size without shooting again.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

/**
 * A saint route needs *a* saint, and naming one here is the same defect the
 * e2e suite already carries 85 times: the slug that was written down gets
 * renamed or removed and a tool that has nothing to do with that saint goes
 * red. Read the corpus instead. First alphabetically, so the sheet is
 * comparable between runs — `--routes=` overrides it when a particular saint
 * is the thing being looked at.
 */
const anySaint = () => {
  const dirs = readdirSync(new URL('../saints', import.meta.url), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  if (!dirs.length) throw new Error('no saints/ folders to draw a saint route from');
  return dirs[0];
};

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const list = (name, fallback) => String(arg(name, fallback)).split(',').filter(Boolean);

const BASE = arg('base', 'http://localhost:5173').replace(/\/$/, '');
const WIDTHS = list('widths', '360,768,1280').map(Number);
const THEMES = list('themes', 'day,vigil');
const LANGS = list('langs', 'en');
const ROUTES = list('routes', `/,/saints,/saints/${anySaint()},/map,/texts,/about`);
const HEIGHT = Number(arg('height', 780));
const TILE = Number(arg('tile', 420));
const SETTLE = Number(arg('settle', 1200));
const OUT = arg('out', 'shots/contact.png');
/**
 * **Deterministic mode, for diffing one tree against another.**
 *
 * The plain sheet is for *looking*; comparing two of them pixel by pixel says
 * almost nothing, because two of the six routes are not the same picture twice.
 * All Saints deals a shuffle on every load and the map's crowds settle over a
 * few hundred milliseconds. A first attempt at diffing a pure rename reported
 * half the tiles as changed, all of it that.
 *
 * `--still` removes three things: `reducedMotion` disables every transition and
 * every drift on the site by design (PLAN.md — removed, never shortened),
 * `?seed=` fixes the shuffle (`views/saints.js` already reads it off the URL so
 * a dealt row can be shared), and the webfont is **refused**.
 *
 * That last one was the subtlest and it survived the first two. `font-display:
 * optional` gives Literata about a hundred milliseconds and then keeps the
 * fallback for the life of the page, so two runs of the same tree render in
 * two different faces depending on how the cache felt — same `font-size`,
 * different wrapping, thousands of pixels of difference. Refusing it is also
 * what the CI runner does in practice, so a cold sheet is the runner's own
 * picture rather than a contrivance.
 */
const STILL = process.argv.includes('--still');
const SEED = arg('seed', 'contact-sheet');

const label = (route) => (route === '/' ? 'daily' : route.replace(/^\//, '').replace(/\//g, '-'));

/* The two settings the whole site reads are seeded before boot, because both
   are read once and a page already painted does not repaint for them. The
   coachmarks are marked seen, or every first tile is two tooltips. */
const seed = (theme, language) => ({
  theme: theme === 'day' ? null : 'vigil',
  language: language === 'en' ? null : language,
  church: 'russian',
  coachSeen: ['church-open', 'lang-open'],
});

const browser = await chromium.launch();
await mkdir('shots', { recursive: true });

try {
  const probe = await browser.newPage();
  const ok = await probe.goto(BASE, { waitUntil: 'domcontentloaded' }).then((r) => r?.ok()).catch(() => false);
  await probe.close();
  if (!ok) {
    console.error(`nothing serving at ${BASE} — start \`npm run dev\` (or pass --base)`);
    process.exit(1);
  }
} catch {
  console.error(`nothing serving at ${BASE} — start \`npm run dev\` (or pass --base)`);
  process.exit(1);
}

const rows = [];
for (const width of WIDTHS) {
  for (const theme of THEMES) {
    for (const language of LANGS) {
      const ctx = await browser.newContext({
        viewport: { width, height: HEIGHT },
        deviceScaleFactor: 1,
        ...(STILL ? { reducedMotion: 'reduce' } : {}),
      });
      await ctx.addInitScript((v) => localStorage.setItem('gos-settings', JSON.stringify(v)), seed(theme, language));
      const page = await ctx.newPage();
      if (STILL) await page.route('**/*.woff2', (r) => r.abort());
      const tiles = [];
      for (const route of ROUTES) {
        try {
          const url = BASE + route + (STILL && route.startsWith('/saints') ? `?seed=${encodeURIComponent(SEED)}` : '');
          await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(SETTLE);
          const shot = await page.screenshot({ clip: { x: 0, y: 0, width, height: HEIGHT } });
          const name = `shots/tile-${label(route)}-${width}-${theme}-${language}.png`;
          await writeFile(name, shot);
          tiles.push({ route, data: `data:image/png;base64,${shot.toString('base64')}` });
        } catch (e) {
          console.error(`  ${route} @ ${width} ${theme} ${language}: ${String(e).split('\n')[0]}`);
          tiles.push({ route, data: null });
        }
      }
      rows.push({ caption: `${width}px · ${theme}${LANGS.length > 1 ? ` · ${language}` : ''}`, width, tiles });
      await ctx.close();
      console.log(`shot ${width}px ${theme} ${language}`);
    }
  }
}

/*
 * Composited in the browser rather than with an image library, so this script
 * needs nothing the repo does not already have. Each tile keeps its own aspect
 * ratio — a 360 px page and a 1280 px page are different shapes and squaring
 * them would hide exactly the differences this exists to show.
 */
const sheet = await browser.newPage();
const png = await sheet.evaluate(
  async ({ rows, routes, tile, height, gap, pad }) => {
    const scaleOf = (w) => tile / w;
    const rowH = (r) => Math.round(height * scaleOf(r.width)) + 20;
    const width = pad * 2 + routes.length * tile + (routes.length - 1) * gap;
    const total = pad * 2 + 26 + rows.reduce((h, r) => h + rowH(r) + gap, 0);
    const c = document.createElement('canvas');
    c.width = width;
    c.height = total;
    const x = c.getContext('2d');
    x.fillStyle = '#1b1b1b';
    x.fillRect(0, 0, width, total);
    x.fillStyle = '#e9e9e9';
    x.font = '13px system-ui, sans-serif';
    routes.forEach((r, i) => x.fillText(r, pad + i * (tile + gap), pad + 14));
    let y = pad + 26;
    for (const row of rows) {
      const h = Math.round(height * scaleOf(row.width));
      x.fillStyle = '#9a9a9a';
      x.font = '12px system-ui, sans-serif';
      x.fillText(row.caption, pad, y + 13);
      for (let i = 0; i < row.tiles.length; i += 1) {
        const t = row.tiles[i];
        const tx = pad + i * (tile + gap);
        if (!t.data) {
          x.fillStyle = '#402020';
          x.fillRect(tx, y + 18, tile, h);
          continue;
        }
        const img = new Image();
        img.src = t.data;
        await img.decode();
        x.drawImage(img, tx, y + 18, tile, h);
      }
      y += h + 20 + gap;
    }
    return c.toDataURL('image/png');
  },
  { rows, routes: ROUTES.map(label), tile: TILE, height: HEIGHT, gap: 10, pad: 12 },
);

await writeFile(OUT, Buffer.from(png.split(',')[1], 'base64'));
await browser.close();
console.log(`\n${OUT}  —  ${ROUTES.length} routes × ${rows.length} settings`);
