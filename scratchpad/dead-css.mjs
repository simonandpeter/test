import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every class the JS, the HTML and the CSS's own `content` could produce.
const sources = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(name)) sources.push(p);
  }
};
walk('src');
sources.push('index.html');
const blob = sources.map((p) => readFileSync(p, 'utf8')).join('\n');

const SHEETS = ['base.css', 'calendar.css', 'index.css', 'saint.css', 'about.css'];

for (const sheet of SHEETS) {
  const css = readFileSync(`src/styles/${sheet}`, 'utf8');
  // Strip comments so a class named only in prose does not count as used.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set([...rules.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  const dead = [];
  for (const c of classes) {
    // A class is live if any source names it whole, or builds it by template.
    if (new RegExp(`['"\`\\s.>,:(\\[]${c}['"\`\\s.>,:)\\]{]`).test(blob)) continue;
    if (blob.includes(c)) continue;
    // `fast-${tone}` style construction: match the stem before the last dash.
    const stem = c.replace(/-[^-]+$/, '-');
    if (stem !== c && blob.includes('${') && blob.includes(stem)) continue;
    dead.push(c);
  }
  if (!dead.length) { console.log(`${sheet}: nothing dead`); continue; }
  console.log(`\n${sheet}: ${dead.length} classes no source names`);
  for (const c of dead.sort()) {
    const n = (rules.match(new RegExp(`\\.${c}\\b`, 'g')) ?? []).length;
    console.log(`   .${c}  (${n} mentions in the sheet)`);
  }
}
