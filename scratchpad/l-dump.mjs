/* The day-record hymns still lacking an English, numbered, with any corpus
   hymn close enough to lend its wording. */
import fs from 'node:fs';

const strip = (s) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const grams = (s) => new Set(strip(s).split(' ').filter(Boolean).map((x) => x.slice(0, 6)));
const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

const corpus = [];
for (const d of fs.readdirSync('saints')) {
  const p = `saints/${d}/saint.json`;
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of j.hymns ?? []) if (h.english) corpus.push({ slug: d, h, g: grams(h.text) });
}

const un = JSON.parse(fs.readFileSync('scratchpad/l-unmatched.json', 'utf8'));
const order = ['el', 'sr', 'cu', 'ro'];
const rows = un.map((u, i) => ({ ...u, i })).sort((a, b) => order.indexOf(a.lang) - order.indexOf(b.lang) || a.i - b.i);
const out = [];
for (const u of rows) {
  const g = grams(u.text);
  let best = null;
  for (const c of corpus) { const s = jac(g, c.g); if (!best || s > best.s) best = { s, c }; }
  out.push(`#${u.i} [${u.lang}] ${u.kind} ${u.tone ?? ''} ${u.model ? '· ' + u.model : ''} — ${u.where.join(', ')}`);
  out.push(u.text);
  if (best && best.s >= 0.6) {
    out.push(`  ~${best.s.toFixed(2)} ${best.c.slug} EN: ${best.c.h.english.text}`);
  }
  out.push('');
}
fs.writeFileSync('scratchpad/l-dump.txt', out.join('\n'));
console.log('wrote', rows.length, 'entries');
