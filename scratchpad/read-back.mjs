import { execSync } from 'node:child_process';
import fs from 'node:fs';

const files = execSync('git show --name-only --pretty=format: 8a6e080')
  .toString().trim().split(/\r?\n/).filter((f) => f.startsWith('saints/'));
const step = Number(process.argv[2] ?? 6);
const off = Number(process.argv[3] ?? 2);
const pick = files.filter((_, i) => i % step === off);
for (const f of pick) {
  const now = JSON.parse(fs.readFileSync(f, 'utf8'));
  const before = JSON.parse(execSync(`git show "8a6e080^:${f}"`).toString());
  now.hymns.forEach((h, i) => {
    if (h.english?.text && !before.hymns?.[i]?.english?.text) {
      console.log(`--- ${f.split('/')[1]}  ${h.kind} ${h.lang} ${h.tone ?? ''}`);
      console.log(`SRC: ${h.text.replace(/\s+/g, ' ')}`);
      console.log(`EN : ${h.english.text.replace(/\s+/g, ' ')}\n`);
    }
  });
}
