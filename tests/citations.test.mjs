import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * **The source cites four documents as a contract, and nothing checked that
 * the citations resolve.**
 *
 * On 2026-09-08 a documentation cut repointed 152 references across 57 files
 * by hand. It missed live ones in `index.html`, `base.css` and
 * `saint.schema.json`, and it turned about a dozen precise citations into
 * false ones: a citation naming a section became a bare filename pointing at
 * four hundred lines, and in five cases at content that file did not contain
 * at all. Every one was found by hand, one at a time, over an afternoon.
 *
 * `brief §N` and `Addendum X` are cited sixty-four times between them and are
 * a contract rather than a history, so a citation that does not resolve is a
 * reader sent to a section that is not there.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The files a citation can live in. Not `saints/` — a life cites its
 * synaxarion, which is a book and not a file in this repo.
 */
const SEARCHED = ['src', 'e2e', 'tests', 'schema', 'scripts'];
const LOOSE = ['vite.config.js', 'index.html', 'playwright.config.js'];

const sources = () => {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'terrain-tiles' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.(js|mjs|css|json|html)$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  for (const dir of SEARCHED) walk(path.join(ROOT, dir));
  for (const f of LOOSE) out.push(path.join(ROOT, f));
  return (
    out
      .map((f) => [path.relative(ROOT, f).replace(/\\/g, '/'), readFileSync(f, 'utf8')])
      // Itself: a test that describes citation formats has to spell them out,
      // and `Addendum X` in this file's own prose is a placeholder, not a claim.
      .filter(([rel]) => rel !== 'tests/citations.test.mjs')
  );
};

const FILES = sources();
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/**
 * A reference to a document that no longer exists, in the past tense, is not a
 * dangling citation — it is a record of what a decision replaced. Both of
 * these say "carried" and "said" of `DESIGN.md`, which is exactly the case the
 * check above would otherwise forbid anyone from writing.
 *
 * The list is deliberately short and each entry has to be worth defending: a
 * new name appearing here should feel like a cost.
 */
const GONE = new Map([
  ['DESIGN.md', 'distilled into the design document on 2026-09-08; mentioned in the past tense only'],
  ['SESSIONS.md', 'deleted on 2026-09-08, its reasoning already in git log'],
]);

/** `life.md` is a corpus filename, not a document anyone cites. */
const CORPUS = /^(life|saint)\.md$/;

test('every document the source names exists', () => {
  const missing = [];
  for (const [file, text] of FILES) {
    for (const m of text.matchAll(/(?<![\w/.-])((?:docs\/)?[A-Za-z][A-Za-z0-9._-]*\.md)/g)) {
      const named = m[1];
      if (CORPUS.test(path.basename(named))) continue;
      if (GONE.has(named)) continue;
      const candidates = [named, path.join('docs', named)];
      if (candidates.some((c) => existsSync(path.join(ROOT, c)))) continue;
      missing.push(`${file}:${lineOf(text, m.index)} names ${named}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `a citation points at a document that is not there:\n  ${missing.join('\n  ')}`,
  );
});

test('a document declared gone is only ever mentioned in the past tense', () => {
  /*
   * The escape hatch above cannot be a licence to cite a deleted file as
   * though it still ruled. If a sentence says `DESIGN.md` *says* or *is*
   * something, it is pointing a reader at a file they cannot open.
   */
  const live = [];
  for (const [file, text] of FILES) {
    for (const name of GONE.keys()) {
      for (const m of text.matchAll(new RegExp(`${name.replace('.', '\\.')}\\s+(\\w+)`, 'g'))) {
        if (/^(said|carried|held|recorded|had|was|listed|described|kept)$/.test(m[1])) continue;
        live.push(`${file}:${lineOf(text, m.index)} — "${name} ${m[1]}"`);
      }
    }
  }
  assert.deepEqual(
    live,
    [],
    `a deleted document is cited as though it still ruled:\n  ${live.join('\n  ')}`,
  );
});

test('every "brief §N" is a section the brief has', () => {
  const brief = readFileSync(path.join(ROOT, 'docs/saintsbuildplan.md'), 'utf8');
  const headings = new Set();
  for (const m of brief.matchAll(/^#{1,4}\s+§?(\d+)/gm)) headings.add(m[1]);

  const bad = [];
  for (const [file, text] of FILES) {
    for (const m of text.matchAll(/brief\s+§(\d+)/g)) {
      if (!headings.has(m[1])) bad.push(`${file}:${lineOf(text, m.index)} cites brief §${m[1]}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    `the brief has §${[...headings].join(', §')} and nothing else:\n  ${bad.join('\n  ')}`,
  );
});

test('every "Addendum X" is an item the addendum has', () => {
  const add = readFileSync(path.join(ROOT, 'docs/saintsplanaddendum.md'), 'utf8');
  const items = new Set();
  // Lettered sections (`## G. Efficiency`) and the numbered items under them
  // (`**G2. Per-card derived keys…**`), which is how the source cites them.
  for (const m of add.matchAll(/^#{1,4}\s+([A-Z])\./gm)) items.add(m[1]);
  for (const m of add.matchAll(/\*\*([A-Z]\d+)\./g)) items.add(m[1]);

  const bad = [];
  for (const [file, text] of FILES) {
    for (const m of text.matchAll(/Addendum\s+([A-Z]\d*)\b/g)) {
      if (!items.has(m[1])) bad.push(`${file}:${lineOf(text, m.index)} cites Addendum ${m[1]}`);
    }
  }
  assert.deepEqual(bad, [], `no such item in the addendum:\n  ${bad.join('\n  ')}`);
});

/**
 * The documents themselves, which the checks above never read — they search
 * `src/` and friends for names *of* documents. A path written inside a
 * document is the other half, and it is the half that rots: two documents
 * both sent a reader to `scratchpad/throttle-probe.mjs` for the
 * three days after it moved to `scripts/`, and nothing could see it.
 *
 * Not `docs/archive/`, whose whole subject is files that are gone.
 */
const DOCS = (() => {
  const out = [];
  const add = (dir) => {
    for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) out.push(path.join(dir, entry.name));
    }
  };
  add('.');
  add('docs');
  return out.map((f) => [
    f.replace(/^\.[\\/]/, '').replace(/\\/g, '/'),
    readFileSync(path.join(ROOT, f), 'utf8'),
  ]);
})();

const DIRS = 'src|scripts|scratchpad|e2e|tests|schema|public|mockups|docs';

test('every path a document names exists', () => {
  const missing = [];
  for (const [file, text] of DOCS) {
    for (const m of text.matchAll(
      new RegExp(String.raw`(?<![\w/.-])((?:${DIRS})/[A-Za-z0-9._/-]+\.[a-z]{2,4})\b`, 'g'),
    )) {
      const named = m[1];
      // `data/` is generated and gitignored; a glob or a placeholder names a
      // shape rather than a file.
      if (/[*{}<>]/.test(named)) continue;
      if (existsSync(path.join(ROOT, named))) continue;
      missing.push(`${file}:${lineOf(text, m.index)} names ${named}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `a document sends a reader to a file that is not there:\n  ${missing.join('\n  ')}`,
  );
});

test('every npm script a document names is in package.json', () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const scripts = new Set(Object.keys(pkg.scripts ?? {}));

  const bad = [];
  for (const [file, text] of DOCS) {
    for (const m of text.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) {
      if (!scripts.has(m[1])) bad.push(`${file}:${lineOf(text, m.index)} names \`npm run ${m[1]}\``);
    }
  }
  assert.deepEqual(
    bad,
    [],
    `no such npm script:\n  ${bad.join('\n  ')}\n  package.json has: ${[...scripts].join(', ')}`,
  );
});

test('every "STRUCTURE.md\'s X section" is a heading STRUCTURE.md has', () => {
  /*
   * The repointing's own damage: a citation that names a section has to name
   * one that exists, or it is worse than the bare filename it replaced —
   * `fast-grade.js` quoted a phrase as STRUCTURE.md's that STRUCTURE.md has never
   * contained.
   */
  const plan = readFileSync(path.join(ROOT, 'STRUCTURE.md'), 'utf8');
  const headings = [...plan.matchAll(/^#{2,4}\s+(?:\d+\.\s*)?(.+)$/gm)].map((m) =>
    m[1].trim().toLowerCase(),
  );
  const has = (name) => headings.some((h) => h === name || h.startsWith(name));

  const bad = [];
  for (const [file, text] of FILES) {
    for (const m of text.matchAll(/PLAN\.md's\s+([A-Za-z][A-Za-z ]{2,24}?)\s+section/g)) {
      const named = m[1].trim().toLowerCase();
      if (!has(named)) bad.push(`${file}:${lineOf(text, m.index)} names "${m[1]}"`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    `STRUCTURE.md has no such section:\n  ${bad.join('\n  ')}\n  it has: ${headings.join(' / ')}`,
  );
});
