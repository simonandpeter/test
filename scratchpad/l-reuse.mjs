/* The day-record hymns whose text the corpus already holds with an English:
   that English, verbatim, so one hymn is not worded two ways. */
import fs from 'node:fs';

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').replace(/[/·]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

const byText = new Map();
for (const d of fs.readdirSync('saints')) {
  const p = `saints/${d}/saint.json`;
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of j.hymns ?? []) if (h.english && !byText.has(norm(h.text))) byText.set(norm(h.text), { slug: d, h });
}

const m = await import('../src/data/liturgical-days.js');
const seen = new Set();
const rows = [];
for (const iso of Object.keys(m.LITURGICAL_DAYS)) {
  for (const ch of Object.keys(m.LITURGICAL_DAYS[iso])) {
    for (const h of m.LITURGICAL_DAYS[iso][ch].hymns ?? []) {
      if (h.english) continue;
      const k = norm(h.text);
      if (seen.has(k)) continue;
      const c = byText.get(k);
      if (!c) continue;
      seen.add(k);
      rows.push({ source_text: h.text, english: c.h.english, _from: c.slug, _at: `${iso}/${ch}` });
    }
  }
}
fs.writeFileSync('scratchpad/l-en-reuse.json', JSON.stringify(rows, null, 1));
for (const r of rows) console.log(r._at, '<-', r._from, '|', r.source_text.slice(0, 50));
console.log('reused', rows.length);
