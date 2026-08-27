#!/usr/bin/env node
/**
 * Did everything a moved block needs move with it?
 *
 * `node scripts/extraction-check.mjs <before.js> <after.js> [after.js ...]`
 *
 * Example, from the cut that produced views/daily/:
 *
 *     git show a452975:src/views/calendar.js > /tmp/before.js
 *     node scripts/extraction-check.mjs /tmp/before.js src/views/daily/*.js
 *
 * **Why this exists.** Splitting views/calendar.js on 2026-08-28 left `BASE`
 * behind: a module-scope `const`, not an import, so the tool carrying the
 * imports had no reason to look at it. `npm run build` was perfectly happy and
 * 88 browser tests went red. **A green build says nothing about whether an
 * extraction is complete** — a bare reference to a name that never travelled is
 * valid JavaScript until the line runs. Nor does reading the diff; that had
 * been done.
 *
 * The question this asks is narrow on purpose, and that is what makes it
 * reliable: *which names did the original file declare, rather than import,
 * that a new file now uses without declaring or importing them?* Nothing else.
 * It is not a linter and will not find an undefined name that was already
 * undefined before the move.
 *
 * **Expect a false positive per cut, roughly.** A candidate is judged "used"
 * by looking for the bare name, and markup is full of words: `class="index-card"`
 * reads as a use of `card`, because the character before it is a hyphen rather
 * than a dot. Check what it names before moving it; the direction of the error
 * is the safe one.
 *
 * Names bound **anywhere** in the new file count as declared — parameters,
 * locals, destructuring, not just column zero. The narrow version cried wolf on
 * `title`, which is a parameter in one function of panel.js and a const in
 * another; agios-website-03 found that by writing the check again rather than
 * taking my result, which is the reason it reads this way.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Comments out. Strings stay.
 *
 * Stripping quoted strings looks tidier and is wrong here: this codebase
 * writes its markup in template literals, and a name is very often used inside
 * one — `url('${BASE + card.image.lqip}')` is the only place panel.js mentions
 * `BASE` at all. A regex cannot tell that those apostrophes are text inside a
 * template rather than a string of their own, so it deletes the interpolation
 * and the use with it, and the check then reports nothing at all. Comments are
 * what actually produce false hits, because they are prose; they go.
 */
const stripped = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1 ');

/** Names declared at module scope, which is what can fail to travel. */
function moduleScope(code) {
  const names = new Set();
  for (const line of code.split('\n')) {
    const m = line.match(/^(?:export\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/);
    if (m) names.add(m[1]);
  }
  return names;
}

/** Names imported anywhere in a file. */
function imported(code) {
  const names = new Set();
  for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from/g)) {
    for (const n of m[1].split(',')) {
      const t = n.trim();
      if (t) names.add(t.split(/\s+as\s+/).pop().trim());
    }
  }
  for (const m of code.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) names.add(m[1]);
  for (const m of code.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  return names;
}

/**
 * Names bound in a file: every `const`/`let`/`var`/`function`/`class` at any
 * indentation, the parameters of named functions, and simple destructuring.
 *
 * **Precise, not generous, and the first version was the other way round.** It
 * counted anything between parentheses followed by `=>` or `{` as a parameter
 * list, which in a file whose markup lives in template literals swallows most
 * of the English language — so every candidate looked declared and the check
 * reported "clean" with `BASE` deleted. A check that cannot fail is worse than
 * no check, and only backing the bug out again showed it.
 *
 * The cost of precision is that a name shadowed by a local this misses will be
 * reported. That is the right way round: `title` costs a moment to dismiss,
 * `BASE` cost 88 red tests.
 */
function boundIn(code) {
  const names = new Set(imported(code));
  for (const m of code.matchAll(/\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]);
  }
  for (const m of code.matchAll(/\bfunction\s*[\w$]*\s*\(([^)]*)\)/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().replace(/[={].*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) names.add(t);
    }
  }
  for (const m of code.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().split(':').pop().replace(/=.*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) names.add(t);
    }
  }
  return names;
}

const [before, ...after] = process.argv.slice(2);
if (!before || !after.length) {
  console.error('usage: extraction-check.mjs <before.js> <after.js> [after.js ...]');
  process.exit(2);
}

const originalCode = stripped(await readFile(before, 'utf8'));
/*
 * Everything the original had at module scope: what it declared *and* what it
 * imported. Imports were left out at first, on the reasoning that a missing
 * import fails the build — which is wrong twice over. Vite resolves import
 * *specifiers*; a name that was simply never imported into the new file is a
 * bare reference, which builds clean and throws at runtime, exactly like
 * `BASE` did. Found by cutting the picker out and noticing the check could not
 * have caught it.
 */
const candidates = new Set([...moduleScope(originalCode), ...imported(originalCode)]);
console.log(`${candidates.size} names available at module scope in ${path.basename(before)}\n`);

let findings = 0;
for (const file of after) {
  const code = stripped(await readFile(file, 'utf8'));
  const bound = boundIn(code);
  const missing = [...candidates]
    .filter((n) => !bound.has(n))
    // a bare reference, not a property access and not a key
    .filter((n) => new RegExp(String.raw`(?<![.\w$])` + n + String.raw`\s*[\(\.\[,;)\]}=+\-*/?:&|<>\s]`).test(code))
    .sort();
  findings += missing.length;
  console.log(`${file}\n   ${missing.length ? missing.join(', ') : '(nothing left behind)'}`);
}

console.log(
  findings
    ? `\n${findings} name(s) used but never moved. The build will not tell you about these.`
    : '\nNothing left behind.',
);
process.exitCode = findings ? 1 : 0;
