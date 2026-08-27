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
 * **Why this exists.** Splitting views/calendar.js on 2026-08-27 left `BASE`
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
 * **When this has been wrong, it has been wrong by excluding candidates, and
 * the symptom is silence.** Three times now: module scope only, which missed a
 * name that was imported; declared-but-not-imported, which missed the imports
 * themselves; and module-scope-only again, which missed a local split across a
 * function body. Each exclusion had a plausible argument behind it and each
 * produced a clean report over a broken tree. Whoever extends this will be
 * tempted to exclude something too; the failure will not look like a failure.
 * (Observed by agios-website-03, who has checked every version of it.)
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

/**
 * The same, with the import statements taken out.
 *
 * For the *usage* test only. A module specifier is not a use of a name:
 * `import { seeded } from './controls.js'` was reporting `controls` as
 * stranded in the very file that imports it, which is the opposite of the
 * truth. The bindings those lines create are read separately, by `imported`.
 */
const withoutImports = (code) => code.replace(/^\s*import\s[^;]*;?/gm, ' ');

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
  /*
   * Parameter lists, of named functions and of arrows, and every identifier in
   * them — destructured, defaulted or plain. Being generous *inside a
   * parameter list* is safe; being generous about what counts as one is not.
   * The version that matched `(...)` before `=>` **or `{`** swallowed every
   * `if`, `for` and `while` in the file, and with them most of the English in
   * the markup. Only `=>` is a parameter list without question.
   *
   * `(slug) => hits.has(slug)` and `paintSummary({ matched, undated }, …)`
   * were both reported as stranded until this took both shapes.
   */
  const params = (list) => {
    for (const part of list.split(/[^A-Za-z0-9_$]+/)) {
      if (part && !/^\d/.test(part)) names.add(part);
    }
  };
  for (const m of code.matchAll(/\bfunction\s*[\w$]*\s*\(([^)]*)\)/g)) params(m[1]);
  for (const m of code.matchAll(/\(([^()]*)\)\s*=>/g)) params(m[1]);
  for (const m of code.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim().split(':').pop().replace(/=.*$/, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(t)) names.add(t);
    }
  }
  return names;
}

/*
 * `--locals`, for when the thing being split is a *function body* rather than
 * a file.
 *
 * The default mode compares module-scope names, and is blind to a local
 * declared in one half of a function and used in the other. Splitting
 * `update()` in views/saints.js stranded `asideNote` — one line, a
 * `querySelector` in the half that computed, read by the half that reported.
 * The check said nothing, the build said nothing, and 116 browser tests went
 * red. Here the candidates are everything the fragment *binds*, so a stranded
 * local is reported like a stranded const.
 *
 * Save the original function to a file of its own and pass it as `before`.
 *
 * **Aim it at the halves, not at the tree.** The candidates are everything the
 * fragment binds, which means common locals — `grid`, `query`, `result`,
 * `rows` — are all candidates, and any file with its own is flagged. Pointed
 * at views/saints.js after the split it reports ten names of nothing. The
 * default mode invites a whole directory; this one does not.
 */
const argv = process.argv.slice(2);
const locals = argv[0] === '--locals';
const [before, ...after] = locals ? argv.slice(1) : argv;
if (!before || !after.length) {
  console.error('usage: extraction-check.mjs [--locals] <before.js> <after.js> [after.js ...]');
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
const candidates = locals
  ? new Set([...boundIn(originalCode)].filter((n) => !imported(originalCode).has(n)))
  : new Set([...moduleScope(originalCode), ...imported(originalCode)]);
console.log(
  `${candidates.size} ${locals ? 'names bound in' : 'names available at module scope in'} ${path.basename(before)}\n`,
);

let findings = 0;
for (const file of after) {
  const code = stripped(await readFile(file, 'utf8'));
  const bound = boundIn(code);
  const missing = [...candidates]
    .filter((n) => !bound.has(n))
    // a bare reference, not a property access and not a key
    .filter((n) =>
      new RegExp(String.raw`(?<![.\w$])` + n + String.raw`\s*[\(\.\[,;)\]}=+\-*/?:&|<>\s]`).test(
        withoutImports(code),
      ),
    )
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
