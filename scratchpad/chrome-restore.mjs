import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TITLES = [
  'a coachmark goes on the second scroll, and not on the first',
  'a first visit is shown where the two controls are, and the day is not held back',
  'a first visit opens on a calendar it did not choose, and is told which',
  'choosing Russian redraws the page in Russian, dates included, and it holds across a reload',
  'on a first visit the two marks clear the fold, and so does the day',
  'the Daily button offers Today when the reader has left it, and only there',
  'the calendar is remembered, and the header changes it',
];

// A test block runs from `test('<title>'` to the first `});` sitting at column 0.
const block = (src, title) => {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) return null;
  const end = src.indexOf('\n});\n', head);
  if (end < 0) return null;
  return { start: head, end: end + 5, text: src.slice(head, end + 5) };
};

const old = execSync('git show f31520a:e2e/chrome.spec.js', { encoding: 'utf8', maxBuffer: 1e8 });
let now = readFileSync('e2e/chrome.spec.js', 'utf8');

for (const title of TITLES) {
  const from = block(old, title);
  const to = block(now, title);
  if (!from || !to) { console.log('SKIP (not found):', title.slice(0, 50)); continue; }
  now = now.slice(0, to.start) + from.text + now.slice(to.end);
  console.log(`swapped ${to.text.split('\n').length} lines -> ${from.text.split('\n').length}:`, title.slice(0, 50));
}

writeFileSync('e2e/chrome.spec.js', now, 'utf8');
