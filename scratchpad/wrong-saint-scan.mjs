/* The defect that actually happened: one source text sits under several
   saints, the text names one of them, and the others are simply not in it.
   A genuine common names nobody; a scrape that spilled from the neighbouring
   day names the neighbour. Read on the ORIGINAL, so English proper nouns and
   place names cannot make noise. */
import fs from 'node:fs';
import path from 'node:path';

const R = 'saints';
const slugs = fs.readdirSync(R).filter((d) => fs.existsSync(path.join(R, d, 'saint.json')));
const norm = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();

const byText = new Map();
const names = new Map();
for (const slug of slugs) {
  const j = JSON.parse(fs.readFileSync(path.join(R, slug, 'saint.json'), 'utf8'));
  const forms = [j.display_name, ...(j.names ?? []).map((n) => n.value ?? n.name ?? n)]
    .filter((x) => typeof x === 'string');
  names.set(slug, forms);
  for (const h of j.hymns ?? []) {
    const k = norm(h.text);
    if (!k) continue;
    if (!byText.has(k)) byText.set(k, []);
    byText.get(k).push({ slug, h });
  }
}

/* Does the text name this saint? Matched on a stem, because the originals
   decline: Александре / Алексaндра, Ἀλέξανδρε, Alexandru. */
const stems = (forms) => {
  const out = new Set();
  for (const f of forms) for (const w of f.split(/[^\p{L}]+/u)) if (w.length > 4) out.add(w.slice(0, 5).toLowerCase());
  return out;
};
const hit = (text, forms) => {
  const t = text.toLowerCase();
  for (const s of stems(forms)) if (t.includes(s)) return true;
  return false;
};

for (const [text, rows] of byText) {
  if (rows.length < 2) continue;
  const named = rows.filter((r) => hit(text, names.get(r.slug)));
  if (!named.length || named.length === rows.length) continue;
  const missing = rows.filter((r) => !named.includes(r));
  console.log(`named: ${named.map((r) => r.slug).join(', ')}`);
  console.log(`  but also filed under: ${missing.map((r) => `${r.slug} (${r.h.kind}/${r.h.lang}${r.h.english?.text ? ', HAS ENGLISH' : ''})`).join(', ')}`);
  console.log(`  ${text.slice(0, 90)}…\n`);
}
