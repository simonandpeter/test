#!/usr/bin/env node
/* Is what the `english` block holds actually English? Prints the rows. */
import fs from 'node:fs';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';

const rows = [];
for (const dir of fs.readdirSync('saints')) {
  const p = `saints/${dir}/saint.json`;
  if (!fs.existsSync(p)) continue;
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of s.hymns ?? []) rows.push({ where: dir, h });
}
for (const [iso, day] of Object.entries(LITURGICAL_DAYS)) {
  for (const [church, rec] of Object.entries(day)) {
    for (const h of rec.hymns ?? []) rows.push({ where: `${iso} ${church}`, h });
  }
}

const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
const cyr = /[Ѐ-ӿԀ-ԯ]/;
const grk = /[Ͱ-Ͽἀ-῿]/;
// Romanian/Serbian-latin diacritics that English never uses.
const roDia = /[ăâîșşțţĂÂÎȘŞȚŢ]/;
const srDia = /[čćđžšČĆĐŽŠ]/;

const flag = [];
for (const r of rows) {
  const e = r.h.english?.text ?? '';
  const reasons = [];
  if (norm(e) === norm(r.h.text)) reasons.push('IDENTICAL to the original');
  if (cyr.test(e)) reasons.push('Cyrillic');
  if (grk.test(e)) reasons.push('Greek');
  if (roDia.test(e)) reasons.push('Romanian diacritics');
  if (srDia.test(e)) reasons.push('Serbian diacritics');
  if (reasons.length) flag.push({ ...r, reasons, e });
}

console.log(`hymns: ${rows.length}   english blocks that are not English: ${flag.length}`);
for (const f of flag) {
  console.log(`\n  ${f.where} ${f.h.kind} lang=${f.h.lang} [${f.reasons.join(', ')}]`);
  console.log(`    orig: ${f.h.text.slice(0, 90)}`);
  console.log(`    eng : ${f.e.slice(0, 90)}`);
}
