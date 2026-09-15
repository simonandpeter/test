import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
const block = (src, title) => {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) return null;
  const end = src.indexOf('\n});\n', head);
  return end < 0 ? null : { start: head, end: end + 5, text: src.slice(head, end + 5) };
};
const old = execSync('git show f31520a:e2e/quality-floor.spec.js', { encoding: 'utf8', maxBuffer: 1e8 });
let now = readFileSync('e2e/quality-floor.spec.js', 'utf8');
const to = block(now, 'a day in the month grid is told apart by shape and by words, not only by hue');
const from = block(old, 'a day mark is told apart by shape, not only by hue');
if (!to || !from) { console.log('FAILED', !!to, !!from); process.exit(1); }
writeFileSync('e2e/quality-floor.spec.js', now.slice(0, to.start) + from.text + now.slice(to.end), 'utf8');
console.log(`restored: ${to.text.split('\n').length} -> ${from.text.split('\n').length} lines`);
