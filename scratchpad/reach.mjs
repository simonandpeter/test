import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

const root = process.cwd();
const seen = new Set();
const walk = (file) => {
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
    walk(resolve(dirname(file), m[1]));
  }
};
walk(resolve('src/main.js'));
const reached = new Set([...seen].map((f) => relative(root, f).split('\\').join('/')));

console.log('UNREACHABLE from main.js, under views/daily:');
for (const f of readdirSync('src/views/daily').map((n) => `src/views/daily/${n}`)) {
  if (!reached.has(f)) console.log(' ', f);
}
for (const f of ['src/styles/daily-sidebar.css', 'src/styles/daily-tiles.css', 'src/styles/calendar.css']) {
  console.log(reached.has(f) ? 'reached   ' : 'UNREACHED ', f);
}
