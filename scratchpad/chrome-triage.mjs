import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const log = readFileSync('scratchpad/chrome-alone.log', 'utf8');
const titles = new Set();
for (const m of log.matchAll(/^\s+\[[a-z0-9-]+\] › e2e.chrome\.spec\.js:\d+:\d+ › (.+?)\s*$/gm)) {
  titles.add(m[1].replace(/\s*─+\s*$/, '').trim());
}

const old = execSync('git show f31520a:e2e/chrome.spec.js', { encoding: 'utf8', maxBuffer: 1e8 });
const now = readFileSync('e2e/chrome.spec.js', 'utf8');

const has = (src, t) => src.includes(`test('${t}'`) || src.includes(`test("${t}"`) || src.includes(`'${t}'`);

console.log(`${titles.size} distinct failing titles\n`);
const inBoth = [], onlyNow = [];
for (const t of [...titles].sort()) (has(old, t) ? inBoth : onlyNow).push(t);

console.log(`-- present at f31520a (restorable body) : ${inBoth.length}`);
for (const t of inBoth) console.log('   ', t);
console.log(`\n-- NOT at f31520a (written for the rebuilt page) : ${onlyNow.length}`);
for (const t of onlyNow) console.log('   ', t);
