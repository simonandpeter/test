/* Near-matches between the day records' hymns and the corpus's, so an English
   already rendered is reused rather than worded a second way. */
import fs from 'node:fs';

const strip = (s) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const grams = (s) => {
  const w = strip(s).split(' ').filter(Boolean);
  return new Set(w.map((x) => x.slice(0, 6)));
};
const jac = (a, b) => {
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  return i / (a.size + b.size - i);
};

const corpus = [];
for (const d of fs.readdirSync('saints')) {
  const p = `saints/${d}/saint.json`;
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const h of j.hymns ?? []) if (h.english) corpus.push({ slug: d, h, g: grams(h.text) });
}

const un = JSON.parse(fs.readFileSync('scratchpad/l-unmatched.json', 'utf8'));
const out = [];
for (const u of un) {
  const g = grams(u.text);
  let best = null;
  for (const c of corpus) {
    const s = jac(g, c.g);
    if (!best || s > best.s) best = { s, c };
  }
  if (best && best.s >= 0.6) out.push({ score: +best.s.toFixed(2), lang: u.lang, day: u.text.slice(0, 60), slug: best.c.slug, corpus: best.c.h.text.slice(0, 60) });
}
out.sort((a, b) => b.score - a.score);
for (const o of out) console.log(o.score, o.lang, o.slug, '|', o.day, '||', o.corpus);
console.log('near matches >=0.6:', out.length, 'of', un.length);
