import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// [spec, ...titles] per line, tab-separated, on stdin-free argv: spec then titles.
const PLAN = {
  'index-grid.spec.js': [
    'a lifespan with nothing at either end says Undated, capitalised',
    'a saint is named by rank, and what they held is on the line below',
  ],
  'quality-floor.spec.js': [
    'the heading takes focus on navigation but not on arrival',
  ],
  'saint.spec.js': [
    'a saint is named in the reader own language where the corpus has the name',
    'a saint page is the Daily page’s two columns, with the reader’s own search beside the life',
  ],
};

const block = (src, title) => {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) return null;
  const end = src.indexOf('\n});\n', head);
  return end < 0 ? null : { start: head, end: end + 5, text: src.slice(head, end + 5) };
};

for (const [spec, titles] of Object.entries(PLAN)) {
  const old = execSync(`git show f31520a:e2e/${spec}`, { encoding: 'utf8', maxBuffer: 1e8 });
  let now = readFileSync(`e2e/${spec}`, 'utf8');
  for (const title of titles) {
    const from = block(old, title);
    const to = block(now, title);
    if (!from || !to) { console.log(`  SKIP ${spec}: ${title.slice(0, 45)}`); continue; }
    now = now.slice(0, to.start) + from.text + now.slice(to.end);
    console.log(`  ${spec}: ${to.text.split('\n').length} -> ${from.text.split('\n').length} lines | ${title.slice(0, 45)}`);
  }
  writeFileSync(`e2e/${spec}`, now, 'utf8');
}
