import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const log = readFileSync(process.argv[2], 'utf8');

const failing = new Map(); // spec -> Set(title)
for (const m of log.matchAll(/^\s+\[[a-z0-9-]+\] › e2e.([a-z-]+\.spec\.js):\d+:\d+ › (.+?)\s*$/gm)) {
  const title = m[2].replace(/\s*─+\s*$/, '').trim();
  if (!failing.has(m[1])) failing.set(m[1], new Set());
  failing.get(m[1]).add(title);
}

for (const [spec, titles] of failing) {
  let old = '';
  try {
    old = execSync(`git show f31520a:e2e/${spec}`, { encoding: 'utf8', maxBuffer: 1e8 });
  } catch {
    console.log(`\n### ${spec} — did not exist at f31520a`);
    continue;
  }
  const inBoth = [], onlyNow = [];
  for (const t of [...titles].sort()) (old.includes(`test('${t}'`) ? inBoth : onlyNow).push(t);
  console.log(`\n### ${spec} — ${titles.size} failing`);
  console.log(`  restorable from f31520a (${inBoth.length}):`);
  for (const t of inBoth) console.log(`    ${t}`);
  console.log(`  written for the rebuilt page (${onlyNow.length}):`);
  for (const t of onlyNow) console.log(`    ${t}`);
}
