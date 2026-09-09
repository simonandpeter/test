#!/usr/bin/env node
/**
 * How much of the corpus is reachable from the rest of it.
 *
 * `node scripts/link-coverage.mjs`            the numbers
 * `node scripts/link-coverage.mjs --isolated` and the work list under them
 *
 * PLAN's section 5 wants every thread the sources write down to be walkable,
 * and its item 4 asked for the one number that says how far off that is *to
 * trend*, the way `locale-coverage.mjs` trends the packs. A figure quoted once
 * in a document goes stale silently: `PLAN.md` carried "520 saints with no
 * link in either direction" until this was written, and the true figure that
 * day was 768.
 *
 * **Isolated means isolated on the page**, which is why the count is of saints
 * rather than of edges. A saint with an empty `related` whose name three other
 * lives use is not isolated — they have three doors, in the reverse index —
 * so both directions are counted, from the folders rather than the manifest
 * (`/data/` is gitignored, and this has to run before `build:manifest`).
 */
import fs from 'node:fs';
import path from 'node:path';

const SAINTS = 'saints';
const dirs = fs.readdirSync(SAINTS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const out = new Map();
for (const dir of dirs) {
  const file = path.join(SAINTS, dir, 'saint.json');
  if (!fs.existsSync(file)) continue;
  out.set(dir, JSON.parse(fs.readFileSync(file, 'utf8')).related ?? []);
}

const inbound = new Map();
let edges = 0;
for (const [dir, related] of out) {
  for (const target of related) {
    edges += 1;
    if (!inbound.has(target)) inbound.set(target, []);
    inbound.get(target).push(dir);
  }
}

const speaks = [...out].filter(([, r]) => r.length).map(([d]) => d);
const named = [...inbound.keys()];
const linked = new Set([...speaks, ...named]);
const isolated = dirs.filter((d) => !linked.has(d));

/*
 * The links a hand wrote into a life, which is where every edge above came
 * from and where the next ones will. Counted raw, so it is comparable with
 * the figure `related-from-links.mjs` reports.
 */
let written = 0;
for (const dir of dirs) {
  const file = path.join(SAINTS, dir, 'life.md');
  if (!fs.existsSync(file)) continue;
  written += [...fs.readFileSync(file, 'utf8').matchAll(/\]\(\/saints\/[^)#?\s]+\)/g)].length;
}

const pct = (n) => `${((n / dirs.length) * 100).toFixed(1)}%`;
console.log(`saints                      : ${dirs.length}`);
console.log(`related edges               : ${edges}`);
console.log(`lives that name someone     : ${speaks.length}  ${pct(speaks.length)}`);
console.log(`saints a life names         : ${named.length}  ${pct(named.length)}`);
console.log(`a link in either direction  : ${linked.size}  ${pct(linked.size)}`);
console.log(`**isolated**                : ${isolated.length}  ${pct(isolated.length)}`);
console.log(`hand-written links in lives : ${written}`);

if (process.argv.includes('--isolated')) {
  console.log('\n-- the work list ---------------------------------------------------');
  for (const slug of isolated) console.log(`  ${slug}`);
}
