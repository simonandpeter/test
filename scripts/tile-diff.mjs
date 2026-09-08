/**
 * What changed between two contact sheets, tile by tile.
 *
 * `--still` makes the sheet deterministic; this is the other half. Without it,
 * "24 of 24 tiles pixel-identical" is a claim somebody made by looking, and
 * looking is exactly what a half-pixel type change defeats.
 *
 *   node scripts/contact-sheet.mjs --still         # writes shots/tile-*.png
 *   node scripts/tile-diff.mjs snapshot before     # keep them as a baseline
 *   …make the change…
 *   node scripts/contact-sheet.mjs --still
 *   node scripts/tile-diff.mjs compare before      # differing pixels per tile
 *
 * Reports the count and share of differing pixels per tile, and writes a mask
 * beside each changed one so *where* it moved is visible rather than inferred.
 */
import { readdirSync, readFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SHOTS = 'shots';
const mode = process.argv[2];
const name = process.argv[3] ?? 'before';
const dir = path.join(SHOTS, `baseline-${name}`);

const tiles = () => readdirSync(SHOTS).filter((f) => f.startsWith('tile-') && f.endsWith('.png')).sort();

if (mode === 'snapshot') {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const files = tiles();
  for (const f of files) copyFileSync(path.join(SHOTS, f), path.join(dir, f));
  console.log(`${files.length} tiles kept as ${dir}`);
  process.exit(0);
}

if (mode !== 'compare') {
  console.error('usage: tile-diff.mjs snapshot|compare [name]');
  process.exit(1);
}
if (!existsSync(dir)) {
  console.error(`no baseline at ${dir} — run \`tile-diff.mjs snapshot ${name}\` first`);
  process.exit(1);
}

const raw = async (file) => {
  const img = sharp(readFileSync(file));
  const { width, height } = await img.metadata();
  // Alpha dropped: a screenshot is opaque, and comparing it adds a channel
  // that can only ever agree.
  const data = await img.removeAlpha().raw().toBuffer();
  return { width, height, data };
};

let changed = 0;
let added = 0;
const rows = [];

for (const f of tiles()) {
  const oldPath = path.join(dir, f);
  if (!existsSync(oldPath)) {
    added += 1;
    rows.push([f, null, null]);
    continue;
  }
  const a = await raw(oldPath);
  const b = await raw(path.join(SHOTS, f));
  if (a.width !== b.width || a.height !== b.height) {
    rows.push([f, Infinity, 100]);
    changed += 1;
    continue;
  }
  const mask = Buffer.alloc(a.width * a.height * 3);
  let n = 0;
  for (let px = 0, i = 0; i < a.data.length; i += 3, px += 3) {
    const same =
      a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] && a.data[i + 2] === b.data[i + 2];
    // Rubric where it moved, gesso where it did not, so the shape reads.
    mask[px] = same ? 236 : 220;
    mask[px + 1] = same ? 229 : 46;
    mask[px + 2] = same ? 214 : 38;
    if (!same) n += 1;
  }
  rows.push([f, n, (100 * n) / (a.width * a.height)]);
  if (n) {
    changed += 1;
    await sharp(mask, { raw: { width: a.width, height: a.height, channels: 3 } })
      .png()
      .toFile(path.join(SHOTS, `diff-${f}`));
  }
}

rows.sort((x, y) => (y[1] ?? -1) - (x[1] ?? -1));
for (const [f, n, pct] of rows) {
  if (n === null) console.log(`${'(new)'.padStart(12)}  ${f}`);
  else if (n === 0) console.log(`${'identical'.padStart(12)}  ${f}`);
  else console.log(`${String(n).padStart(12)}  ${pct.toFixed(2)}%  ${f}  → shots/diff-${f}`);
}
console.log(`\n${rows.length - changed - added} identical, ${changed} changed, ${added} new`);
