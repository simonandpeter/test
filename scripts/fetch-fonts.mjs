#!/usr/bin/env node
/**
 * Regenerates the self-hosted Literata files and src/styles/fonts.css.
 *
 * Run only when changing the font's weights, optical sizes or subsets — the
 * downloaded files are committed, so this is a maintenance tool, not a build
 * step, and the site has no runtime or build-time dependency on Google Fonts
 * (no vendor to outlive the project, per the brief).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..600;1,7..72,400..600&display=optional';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const WANT = new Set(['latin', 'latin-ext', 'greek', 'greek-ext', 'cyrillic', 'cyrillic-ext']);

const css = execFileSync('curl', ['-s', '--max-time', '30', '-A', UA, CSS_URL], {
  encoding: 'utf8',
});

mkdirSync('src/fonts', { recursive: true });

let out = `/* Literata variable (wght 400-600, opsz 7-72, roman + italic), self-hosted.
   Subsets downloaded ${new Date().toISOString().slice(0, 10)}; regenerate with scripts/fetch-fonts.mjs.
   Licence: SIL Open Font License 1.1. font-display is 'optional' per
   DESIGN.md section 4 - zero layout shift outranks brand on a cold first
   visit; the font arrives from cache on every visit after. */\n`;

let n = 0;
for (const [, subset, block] of css.matchAll(/\/\* ([a-z-]+) \*\/\s*(@font-face\s*\{[^}]+\})/g)) {
  if (!WANT.has(subset)) continue;
  const url = block.match(/url\((https:[^)]+\.woff2)\)/)[1];
  const style = block.match(/font-style:\s*(\w+)/)[1];
  const file = `literata-${style}-${subset}.woff2`;
  execFileSync('curl', ['-s', '--max-time', '30', url, '-o', `src/fonts/${file}`]);
  out +=
    `\n/* ${subset} */\n` +
    block
      .replace(/src:[^;]+;/, `src: url('../fonts/${file}') format('woff2');`)
      .replace(/font-display:\s*\w+;/, 'font-display: optional;') +
    '\n';
  n++;
}

writeFileSync('src/styles/fonts.css', out);
console.log(`${n} subsets written to src/fonts/`);
