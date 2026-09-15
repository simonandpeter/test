import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const specs = readdirSync('e2e').filter((f) => f.endsWith('.spec.js')).map((f) => `e2e/${f}`);

const wantedBy = new Map();
for (const p of specs) {
  const src = readFileSync(p, 'utf8');
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/helpers\.js'/g)) {
    for (const name of m[1].split(',')) {
      const n = name.trim().split(/\s+as\s+/)[0].trim();
      if (!n) continue;
      if (!wantedBy.has(n)) wantedBy.set(n, []);
      wantedBy.get(n).push(p.replace('e2e/', ''));
    }
  }
}

const exported = (src) =>
  new Set([...src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1])
    .concat([...src.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()))));

const now = exported(readFileSync('e2e/helpers.js', 'utf8'));
const old = exported(execSync('git show f31520a:e2e/helpers.js', { encoding: 'utf8', maxBuffer: 1e8 }));

const missingNow = [...wantedBy.keys()].filter((n) => !now.has(n)).sort();
const missingOld = [...wantedBy.keys()].filter((n) => !old.has(n)).sort();

console.log(`${wantedBy.size} helper names imported across ${specs.length} specs.`);
console.log(`\nmissing from the CURRENT helpers.js (${missingNow.length}):`);
for (const n of missingNow) console.log(`  ${n} <- ${wantedBy.get(n).join(', ')}`);
console.log(`\nmissing from f31520a's helpers.js (${missingOld.length}) - these break if it is restored wholesale:`);
for (const n of missingOld) console.log(`  ${n} <- ${wantedBy.get(n).join(', ')}`);
