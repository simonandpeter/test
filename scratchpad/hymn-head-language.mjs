#!/usr/bin/env node
/*
 * What the *heading* over a hymn prints to a reader who chose English.
 * `ui/hymns.js` builds it from `H[kind]`, the tone, `h.model` and the churches;
 * the kind and the churches come from the locale pack, but `h.model` and the
 * tone's fallback are the source's own string and are printed untouched.
 */
import fs from 'node:fs';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';
import { toneNumber } from '../src/lib/tone.js';

const rows = [];
for (const dir of fs.readdirSync('saints')) {
  const p = `saints/${dir}/saint.json`;
  if (!fs.existsSync(p)) continue;
  for (const h of (JSON.parse(fs.readFileSync(p, 'utf8')).hymns ?? [])) rows.push({ where: dir, h });
}
for (const [iso, day] of Object.entries(LITURGICAL_DAYS)) {
  for (const [church, rec] of Object.entries(day)) {
    for (const h of rec.hymns ?? []) rows.push({ where: `${iso} ${church}`, h });
  }
}

const foreign = /[Ѐ-ԯͰ-Ͽἀ-῿]|[ăâîșşțţĂÂÎȘŞȚŢčćđžšČĆĐŽŠ]/;

const models = rows.filter((r) => r.h.model && foreign.test(r.h.model));
const tones = rows.filter((r) => r.h.tone && !toneNumber(r.h.tone));

console.log(`hymns: ${rows.length}`);
console.log(`\nheadings printing a model in the source's own tongue: ${models.length}`);
for (const r of models) console.log(`  ${r.where.padEnd(34)} ${r.h.kind.padEnd(10)} model=${JSON.stringify(r.h.model)}`);
console.log(`\nheadings whose tone could not be read, so the source's own string prints: ${tones.length}`);
for (const r of tones) console.log(`  ${r.where.padEnd(34)} ${r.h.kind.padEnd(10)} tone=${JSON.stringify(r.h.tone)}`);
