import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const block = (src, title) => {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) return null;
  const end = src.indexOf('\n});\n', head);
  return end < 0 ? null : { start: head, end: end + 5, text: src.slice(head, end + 5) };
};

const old = execSync('git show f31520a:e2e/chrome.spec.js', { encoding: 'utf8', maxBuffer: 1e8 });
let now = readFileSync('e2e/chrome.spec.js', 'utf8');

// The rebuild renamed and rewrote this one; take its predecessor back whole.
const NEW_MEASURE = 'the header takes one measure on every route, Daily included';
const OLD_MEASURE = 'the header takes one measure on every route, and stops at Daily’s column';
const to = block(now, NEW_MEASURE);
const from = block(old, OLD_MEASURE);
if (to && from) {
  now = now.slice(0, to.start) + from.text + now.slice(to.end);
  console.log('restored the header-measure test under its old title');
} else {
  console.log('MEASURE swap failed', { to: !!to, from: !!from });
}

// This one describes the rebuilt page's sidebar and tile boxes, which are gone.
const GONE = 'Daily’s two boxes start on one line, and stand clear of the bar';
const drop = block(now, GONE);
if (drop) {
  now = now.slice(0, drop.start) + now.slice(drop.end);
  console.log(`dropped ${drop.text.split('\n').length} lines: the rebuilt page's two boxes`);
} else {
  console.log('DROP failed: block not found');
}

writeFileSync('e2e/chrome.spec.js', now, 'utf8');
