/* Stage L analysis: day-record feast hymns vs the corpus's own hymns. */
import fs from 'node:fs';
import path from 'node:path';

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').replace(/[\/·]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

const m = await import('../src/data/liturgical-days.js');
const day = [];
for (const iso of Object.keys(m.LITURGICAL_DAYS)) {
  for (const ch of Object.keys(m.LITURGICAL_DAYS[iso])) {
    for (const h of m.LITURGICAL_DAYS[iso][ch].hymns ?? []) day.push({ iso, ch, h });
  }
}

const corpus = [];
for (const d of fs.readdirSync('saints')) {
  const p = path.join('saints', d, 'saint.json');
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of j.hymns ?? []) corpus.push({ slug: d, h });
}
const byText = new Map();
for (const c of corpus) {
  const k = norm(c.h.text);
  if (!byText.has(k)) byText.set(k, c);
}

console.log('corpus hymns', corpus.length, 'without english', corpus.filter((c) => !c.h.english).length);
console.log('day-record hymns', day.length, 'without english', day.filter((d) => !d.h.english).length);

const missing = day.filter((d) => !d.h.english);
const distinct = new Map();
for (const d of missing) {
  const k = norm(d.h.text);
  if (!distinct.has(k)) distinct.set(k, []);
  distinct.get(k).push(d);
}
console.log('distinct missing texts', distinct.size);

let matched = 0;
const unmatched = [];
for (const [k, rows] of distinct) {
  const c = byText.get(k);
  if (c && c.h.english) { matched++; continue; }
  unmatched.push({ k, rows, corpusNoEnglish: !!c });
}
console.log('distinct texts already in corpus WITH english:', matched);
console.log('distinct texts with no corpus match:', unmatched.length);
const byLang = {};
for (const u of unmatched) { const l = u.rows[0].h.lang; byLang[l] = (byLang[l] ?? 0) + 1; }
console.log('unmatched by lang', byLang);
fs.writeFileSync('scratchpad/l-unmatched.json', JSON.stringify(unmatched.map((u) => ({
  lang: u.rows[0].h.lang, kind: u.rows[0].h.kind, tone: u.rows[0].h.tone, model: u.rows[0].h.model,
  text: u.rows[0].h.text, where: u.rows.map((r) => `${r.iso}/${r.ch}`), source: u.rows[0].h.source,
})), null, 1));
