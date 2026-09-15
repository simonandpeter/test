import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const old = execSync('git show f31520a:e2e/helpers.js', { encoding: 'utf8', maxBuffer: 1e8 }).split('\n');
const start = old.findIndex((l) => l.startsWith('export /**') && old[old.indexOf(l) + 5]?.includes('const duringMove'));
const from = old.findIndex((l) => l.includes('const duringMove'));
const openComment = old.slice(0, from).map((l, i) => [l, i]).reverse().find(([l]) => l.startsWith('export /**'))[1];
let end = from;
while (!old[end].startsWith('  );')) end++;

const block = old.slice(openComment, end + 1).join('\n');
const target = 'e2e/helpers.js';
const src = readFileSync(target, 'utf8');
writeFileSync(target, src.replace(/\n*$/, '\n\n') + block + '\n', 'utf8');
console.log(`restored ${end + 1 - openComment} lines of duringMove into ${target}`);
