import { readFileSync, writeFileSync } from 'node:fs';

const TITLES = [
  'the Daily page prints the civil date alone, the paschal cycle, the tone and the fast in its colour',
  'the fast bubble says what this day allows, and nothing about the others',
  'a day whose calendar named no allowance is strict, and quotes nothing back',
  'the fast and its bubble are in the reader own language',
  'a note that says more than the label is still quoted',
  'the fast chip names the type of fast, and the bubble still quotes the calendar',
  'a Great Feast is named beside the fast, in gold that never carries the words',
  'the fast chip is the type alone, and the occasion stands in a chip of its own',
  'a Great Feast is what the day is, and the page stops saying there is nothing',
  'the day records and the locale packs are fetched, not carried in the entry chunk',
];

const path = 'e2e/daily-panel.spec.js';
let src = readFileSync(path, 'utf8');

for (const title of TITLES) {
  const head = src.indexOf(`test('${title}'`);
  if (head < 0) { console.log('NOT FOUND:', title); continue; }
  const nextTest = src.indexOf('\ntest(', head + 1);
  const body = src.slice(head, nextTest < 0 ? src.length : nextTest);

  if (/await desk\(/.test(body)) { console.log('already pinned:', title.slice(0, 40)); continue; }

  const m = body.match(/^(\s*)(?:await\s+)?[a-zA-Z]+\.goto\(/m);
  if (!m) { console.log('NO GOTO:', title.slice(0, 40)); continue; }

  const at = head + m.index;
  const indent = m[1].replace(/\n/g, '');
  const target = body.slice(m.index).match(/([a-zA-Z]+)\.goto\(/)[1];
  src = src.slice(0, at) + `\n${indent}await desk(${target});` + src.slice(at);
  console.log('pinned:', title.slice(0, 50));
}

writeFileSync(path, src, 'utf8');
