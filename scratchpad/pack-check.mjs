/*
 * `carouselCells` over many shuffles, in node.
 *
 * The run is a shuffle, so any bound read off one deal is a fact about that
 * deal — and a browser deal costs a page load, which is minutes for the fifty
 * deals a bound like this needs. The packer is pure with no pen, so it can be
 * asked directly.
 *
 *   node scratchpad/pack-check.mjs [space] [cardWidth] [deals]
 */
import fs from 'node:fs';

/*
 * From a bundle rather than the source: modes.js reaches `import.meta.env`
 * through lib/detail.js, which is Vite's and does not exist in node, and
 * `import.meta` is per-module so it cannot be shimmed from here. Rebuild with
 *   npx esbuild src/views/index/modes.js --bundle --format=esm  *     --platform=neutral --define:import.meta.env='{"BASE_URL":"/"}'  *     --outfile=scratchpad/modes.bundle.mjs
 */
const { carouselCells, isNameCell } = await import('./modes.bundle.mjs');

const SPACE = Number(process.argv[2] ?? 520);
const WIDTH = Number(process.argv[3] ?? 150);
const TEXTW = Number(process.argv[5] ?? WIDTH);
const DEALS = Number(process.argv[4] ?? 40);

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));
const saints = manifest.saints ?? manifest;

/* mulberry32, so a bad deal can be replayed by its seed. */
const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffle = (list, seed) => {
  const out = list.slice();
  const r = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const rows = [];
for (let d = 0; d < DEALS; d++) {
  const pool = shuffle(saints, d + 1);
  const cells = carouselCells(pool, { space: SPACE, cardWidth: WIDTH, textWidth: TEXTW });
  const has = cells.map((c) => c.some((i) => i.image));
  let longest = 0;
  let run = 0;
  let at = -1;
  for (let i = 0; i < has.length; i++) {
    run = has[i] ? 0 : run + 1;
    if (run > longest) {
      longest = run;
      at = i;
    }
  }
  const last = has.lastIndexOf(true);
  rows.push({
    seed: d + 1,
    cells: cells.length,
    withPicture: has.filter(Boolean).length,
    longest,
    // Where the worst stretch is, as a fraction of the run: near 1 means the
    // corpus ran out of icons, anywhere else means the packer let it happen.
    at: Math.round((at / has.length) * 100) / 100,
    tail: has.length - 1 - last,
    saints: cells.reduce((n, c) => n + c.length, 0),
    names: cells.filter(isNameCell).length,
  });
}

const col = (k) => rows.map((r) => r[k]).sort((a, b) => a - b);
const stat = (k) => {
  const v = col(k);
  return `min ${v[0]}  median ${v[Math.floor(v.length / 2)]}  max ${v[v.length - 1]}`;
};
console.log(`space ${SPACE}, width ${WIDTH}, ${DEALS} deals`);
for (const k of ['longest', 'at', 'tail', 'withPicture', 'cells', 'names', 'saints']) {
  console.log(`  ${k.padEnd(12)} ${stat(k)}`);
}
const worst = rows.slice().sort((a, b) => b.longest - a.longest).slice(0, 5);
console.log('  worst deals:');
for (const r of worst) console.log(`    seed ${r.seed}: run ${r.longest} at ${r.at}, ${r.withPicture} icons used, tail ${r.tail}`);
