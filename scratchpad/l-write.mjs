/* Puts a typed English back into src/data/liturgical-days.js.
 *
 *   node scratchpad/l-write.mjs scratchpad/l-en-01.json [--dry]
 *
 * The work file is { "<index into l-unmatched.json>": { "text": "...",
 * "source": {…} | null } }. Everything with no source is written
 * `rendered: 'site'`. Every hymn object in the records carrying that same
 * source text takes the same English.
 */
import fs from 'node:fs';

const FILE = 'src/data/liturgical-days.js';
const dry = process.argv.includes('--dry');
const work = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const un = JSON.parse(fs.readFileSync('scratchpad/l-unmatched.json', 'utf8'));

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').replace(/[/·]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

let lines = fs.readFileSync(FILE, 'utf8').split('\n');

/* The record's hymn texts are single-quoted JS on one line; read them back the
 * way the module will. */
const valueOf = (line) => {
  const body = line.trim().replace(/^text: /, '').replace(/,$/, '');
  // eslint-disable-next-line no-eval
  return eval(`(${body})`);
};

/* Two input shapes: keyed by index into l-unmatched.json, or a list carrying
 * the source text outright (what the corpus's own English is reused with). */
const jobs = Array.isArray(work)
  ? work.map((w, i) => [`row ${i}`, w.source_text, w.english])
  : Object.entries(work).map(([k, e]) => [`#${k}`, un[Number(k)]?.text, e]);

/* The records are single-quoted JS; what is written into them reads the same. */
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const obj = (o) => `{ ${Object.entries(o).map(([k, v]) => `${k}: ${typeof v === 'number' ? v : q(v)}`).join(', ')} }`;

let written = 0;
const missed = [];
for (const [key, sourceText, english] of jobs) {
  if (!sourceText) throw new Error(`no source text for ${key}`);
  if (!english?.text) { missed.push(`${key} empty`); continue; }
  const want = norm(sourceText);
  let hits = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)text: /);
    if (!m) continue;
    let v;
    try { v = valueOf(lines[i]); } catch { continue; }
    if (norm(v) !== want) continue;
    const ind = m[1].length;
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s*english: /.test(lines[j])) { close = -2; break; }
      const t = lines[j];
      if (t.length && t.search(/\S/) < ind && /^\s*},?\s*$/.test(t)) { close = j; break; }
    }
    if (close === -2) continue;
    if (close < 0) throw new Error(`no closing brace for ${key}`);
    const pad = ' '.repeat(ind);
    const body = english.source
      ? `text: ${q(english.text)},\n${pad}  source: ${obj(english.source)},`
      : `text: ${q(english.text)},\n${pad}  rendered: 'site',`;
    lines.splice(close, 0, `${pad}english: {`, `${pad}  ${body}`, `${pad}},`);
    hits++;
  }
  if (!hits) missed.push(`${key} no hymn object matched`);
  written += hits;
}

console.log('objects filled', written, 'entries', jobs.length);
if (missed.length) console.log('MISSED:\n' + missed.join('\n'));
if (!dry) fs.writeFileSync(FILE, lines.join('\n'));
