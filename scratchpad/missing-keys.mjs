import { readFileSync, readdirSync } from 'node:fs';
import { STRINGS } from '../src/ui/strings.js';

const files = ['src/views/calendar.js', ...readdirSync('src/views/daily').map((f) => `src/views/daily/${f}`)];
const paths = new Set();
for (const p of files) {
  const src = readFileSync(p, 'utf8');
  for (const m of src.matchAll(/\bSTRINGS((?:\.[a-zA-Z_][a-zA-Z0-9_]*)+)/g)) paths.add(m[1].slice(1));
}
const resolve = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), STRINGS);
const missing = [...paths].filter((p) => resolve(p) === undefined).sort();
console.log(`${paths.size} STRINGS paths in the restored Daily code, ${missing.length} unresolved:`);
console.log(missing.join('\n'));
