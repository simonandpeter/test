import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// The rebuild renamed these as it rewrote them; take the predecessor back whole.
const PAIRS = [
  ['index-grid.spec.js',
    'the day is a column of saint cards, not a list of links',
    'Also commemorated is a column of saint cards, not a list of links'],
  ['index-grid.spec.js',
    'every row starts its name at the same edge, picture or no picture',
    'every row starts its name at the card margin, picture or no picture'],
];

const block = (src, title) => {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) return null;
  const end = src.indexOf('\n});\n', head);
  return end < 0 ? null : { start: head, end: end + 5, text: src.slice(head, end + 5) };
};

for (const [spec, newTitle, oldTitle] of PAIRS) {
  const old = execSync(`git show f31520a:e2e/${spec}`, { encoding: 'utf8', maxBuffer: 1e8 });
  let now = readFileSync(`e2e/${spec}`, 'utf8');
  const to = block(now, newTitle);
  const from = block(old, oldTitle);
  if (!to || !from) { console.log(`  SKIP ${spec}: ${newTitle.slice(0, 45)} (to=${!!to} from=${!!from})`); continue; }
  now = now.slice(0, to.start) + from.text + now.slice(to.end);
  writeFileSync(`e2e/${spec}`, now, 'utf8');
  console.log(`  ${spec}: restored under "${oldTitle.slice(0, 50)}"`);
}
