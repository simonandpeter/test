#!/usr/bin/env node
/* Counts every hymn the corpus holds and which renderings each carries. */
import fs from 'node:fs';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';

const rows = [];
for (const dir of fs.readdirSync('saints')) {
  const p = `saints/${dir}/saint.json`;
  if (!fs.existsSync(p)) continue;
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of s.hymns ?? []) rows.push({ where: `saint:${dir}`, h });
}
for (const [iso, rec] of Object.entries(LITURGICAL_DAYS)) {
  for (const byChurch of Object.values(rec)) for (const h of byChurch?.hymns ?? []) rows.push({ where: `day:${iso}`, h });
}

const has = (h, k) => !!h[k];
const hasText = (h, k) => typeof h[k]?.text === 'string' && h[k].text.trim().length > 0;
const count = (k) => rows.filter((r) => has(r.h, k)).length;
const countText = (k) => rows.filter((r) => hasText(r.h, k)).length;

console.log(`hymns in corpus: ${rows.length}`);
console.log(`  from saints/:            ${rows.filter((r) => r.where.startsWith('saint:')).length}`);
console.log(`  from liturgical-days.js: ${rows.filter((r) => r.where.startsWith('day:')).length}`);
for (const k of ['english', 'ru', 'ro', 'el', 'sr']) {
  console.log(`  carry ${k.padEnd(8)} block: ${String(count(k)).padStart(4)}   with non-empty text: ${String(countText(k)).padStart(4)}`);
}

const broken = rows.filter((r) => has(r.h, 'english') && !hasText(r.h, 'english'));
console.log(`\nenglish block present but text empty/missing: ${broken.length}`);
for (const r of broken.slice(0, 20)) console.log(`  ${r.where} ${r.h.kind} ${JSON.stringify(r.h.english).slice(0, 120)}`);

const noEnglish = rows.filter((r) => !has(r.h, 'english'));
console.log(`\nno english at all: ${noEnglish.length}`);
for (const r of noEnglish.slice(0, 20)) console.log(`  ${r.where} ${r.h.kind} lang=${r.h.lang} church=${r.h.church}`);

const langs = new Set(rows.map((r) => r.h.lang));
console.log(`\noriginal langs present: ${[...langs].join(', ')}`);
const keys = new Set(rows.flatMap((r) => Object.keys(r.h)));
console.log(`fields ever seen on a hymn: ${[...keys].sort().join(', ')}`);
