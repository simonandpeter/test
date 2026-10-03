#!/usr/bin/env node
/**
 * The `related` floor: every saint the live cross-linker finds in a life's
 * prose is a `related` row on that folder, and on theirs.
 *
 * `node scripts/related-floor.mjs`          measure and propose
 * `node scripts/related-floor.mjs --held`   and print every exclusion with its quote
 * `node scripts/related-floor.mjs --write`  apply the floor
 * `node scripts/related-floor.mjs --propose-exclusions`  rebuild the candidate list
 *
 * **Why hand-editing could never close this.** The hyperlink in a life is
 * computed at render time by `src/lib/cross-link.js` against the whole corpus
 * (`views/saint.js` calls `linkSaintNames`); `related` is a hand-written array
 * in `saint.json`. Nothing connects the two, so they diverge by construction
 * and grow further apart with every folder added — `dumitru-staniloae` had no
 * `related` key at all while Gregory Palamas rendered as a hyperlink on his
 * page. The one coupling that exists runs the wrong way: `related` is an
 * *input* to the linker's surname pass, so a missing row also costs links.
 *
 * So this imports the page's own index — `buildNameIndex`, unchanged, never a
 * second matcher — and unions what it finds into `related`, **both ways**: if
 * A's life names B, B's `related` gains A, as the hand-written tier was done.
 *
 * **A floor, never a replacement.** An existing entry is never removed. A
 * relation recorded only in the attestations or the hymns is a reading, and
 * this script has read nothing.
 *
 * **The exclusions are the honest part of it.**
 * `scripts/related-floor-exclusions.json` lists every match deliberately left
 * out, each with its category, its reason and the words it was read in.
 * `tests/related-floor.test.mjs` reads that same file, so the gap is one a
 * reader can see rather than one buried in a rule, and it fails on an entry
 * that no longer describes anything.
 *
 * **A dedication is a relation** (author, 2026-10-03: "the more connections
 * the better"), so this proposes no exclusion for one. 89 were on file on that
 * reading's strength and all 89 are flipped in; the shape of them is "entered
 * the monastery of St «John the Theologian»" and "relics at the Lavra of St
 * «Alexander Nevsky»", every one of which the page already hyperlinks, so
 * excluding them left page and data disagreeing for exactly those edges.
 *
 * What is still excluded is a match that asserts the *opposite* of a relation
 * or no relation at all: `denial`, the corpus's own "He is not the «Laurence of
 * Chernigov» whom the Romanian calendar keeps", where a row would contradict
 * the life and no test could see it; and two singletons a reading settled, a
 * saying quoted seven centuries later and an emperor named to date a life.
 *
 * A wrong `denial` row is a claim no test can see. A missing row costs a line
 * somebody can add. `DENIAL` leans the second way on purpose.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readCorpus, SAINTS_DIR, ROOT } from './corpus-index.mjs';
import { buildNameIndex, matchableName } from '../src/lib/cross-link.js';

export const EXCLUSIONS = path.join(ROOT, 'scripts', 'related-floor-exclusions.json');

/**
 * **"He is not the X whom the calendar keeps on another day."** The corpus's
 * own idiom for a figure it has had to keep apart from a better-known
 * namesake, and the shape of a sentence that denies a relation while naming
 * one. The page hyperlinks the name either way — rightly, a reader told these
 * are two men should be able to go and see the other — but a `related` row
 * saying *these two have to do with each other* is the opposite of what the
 * life says, and it is invisible to every test once written.
 *
 * Read on both sides of the name, because the corpus writes the denial either
 * before it ("He is not the Laurence of Chernigov whom…") or after it ("The
 * same day page keeps Polycarp of Smyrna, and the two are not the same").
 */
export const DENIAL =
  /\b(?:is|are|was|were)\s+not\b|\bnot\s+the\s+same\b|\bneither\s+of\s+(?:them|the\s+two)\b|\bdifferent\s+(?:men|women|people|persons)\b|\bdistinguish(?:ing)?\s+(?:him|her|them)\s+from\b|\bconfuse[ds]?\s+(?:him|her|them)?\s*with\b|\bnot\s+to\s+be\s+(?:confused|taken)\b|\bmight\s+confuse\b|\bnot\s+be\s+taken\s+for\b|\bthe\s+two\s+are\s+not\b/i;

/**
 * The prose the renderer hands the linker: the leading `# Name` heading is
 * stripped before render, and text already inside a hand-written markdown link
 * is an `<a>` the DOM walker refuses to enter. Those written links are the
 * other half of the author's rule and are already gated, by
 * `tests/life-links.test.mjs`.
 */
export const prose = (life) =>
  String(life ?? '')
    .replace(/^#[^\n]*\n/, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '');

/**
 * Every match the page's own index makes in every life's prose, with the words
 * around it and the one flag a reading is proposed from.
 *
 * The three refusals `cross-link-audit.mjs` makes, in its words: the saint's
 * own form, a form two folders share (`buildNameIndex` poisons it to `null`),
 * and a slug already met in this life — one link per person per page, which is
 * also exactly one `related` row.
 */
export function proseMatches(corpus) {
  const { bySlug, pattern } = buildNameIndex(corpus.map((c) => c.saint));
  const rows = [];
  if (!pattern) return rows;
  for (const { slug, saint, life } of corpus) {
    if (!life) continue;
    const ownForm = matchableName(saint.display_name);
    const text = prose(life);
    const seen = new Set();
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      const target = bySlug.get(m[1]);
      if (!target || target === slug || m[1] === ownForm || seen.has(target)) continue;
      seen.add(target);
      const end = m.index + m[1].length;
      const before = text.slice(Math.max(0, m.index - 60), m.index);
      const after = text.slice(end, end + 30);
      rows.push({
        dir: slug,
        slug: target,
        form: m[1],
        denial:
          DENIAL.test(text.slice(Math.max(0, m.index - 90), m.index)) ||
          DENIAL.test(text.slice(end, end + 90)),
        quote: (before.slice(-45) + `«${m[1]}»` + after).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return rows;
}

export const key = (r) => `${r.dir} -> ${r.slug}`;

/** The committed exclusions, as `"a -> b"` → `{ category, reason, quote }`. */
export const readExclusions = (file = EXCLUSIONS) =>
  JSON.parse(fs.readFileSync(file, 'utf8')).exclusions ?? {};

/**
 * What the floor adds, two-way, given the matches and the exclusions:
 * `slug` → the set of `related` entries it does not have yet.
 */
export function floorGains(corpus, rows, excluded) {
  const related = new Map(corpus.map((c) => [c.slug, new Set(c.saint.related ?? [])]));
  const gains = new Map();
  const add = (a, b) => {
    if (a === b || !related.has(a) || related.get(a).has(b)) return;
    if (!gains.has(a)) gains.set(a, new Set());
    gains.get(a).add(b);
  };
  for (const r of rows) {
    if (excluded[key(r)]) continue;
    add(r.dir, r.slug);
    add(r.slug, r.dir);
  }
  return gains;
}

/* ---- run ----------------------------------------------------------------- */

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const corpus = readCorpus();
  const rows = proseMatches(corpus);

  if (process.argv.includes('--propose-exclusions')) {
    /*
     * Writes the candidates, each with the words it was read in, for a person
     * to read and cut. It never removes a line already on file: an exclusion
     * is a reading, and a reading is not re-derived by the thing it corrects.
     */
    const have = fs.existsSync(EXCLUSIONS) ? readExclusions() : {};
    const out = { ...have };
    for (const r of rows) {
      if (out[key(r)]) continue;
      if (r.denial) {
        out[key(r)] = { category: 'denial', reason: 'the life says the two are not the same person', quote: r.quote };
      }
    }
    const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
    fs.writeFileSync(EXCLUSIONS, JSON.stringify({ exclusions: sorted }, null, 2) + '\n');
    console.log(`${Object.keys(sorted).length} exclusions on file (${Object.keys(sorted).length - Object.keys(have).length} new).`);
    process.exit(0);
  }

  const excluded = fs.existsSync(EXCLUSIONS) ? readExclusions() : {};
  const held = rows.filter((r) => excluded[key(r)]);
  const gains = floorGains(corpus, rows, excluded);
  const entries = [...gains.values()].reduce((n, s) => n + s.size, 0);
  const dist = [0, 0, 0];
  for (const s of gains.values()) dist[Math.min(s.size, 3) - 1] += 1;
  const byCategory = {};
  for (const r of held) {
    const c = excluded[key(r)].category ?? 'unsaid';
    byCategory[c] = (byCategory[c] ?? 0) + 1;
  }

  console.log(`folders                        : ${corpus.length}`);
  console.log(`lives read                     : ${corpus.filter((c) => c.life).length}`);
  console.log(`prose matches the page links   : ${rows.length}`);
  console.log(`excluded, with a reason on file: ${held.length}  ${JSON.stringify(byCategory)}`);
  console.log(`matches taken as the floor     : ${rows.length - held.length}`);
  console.log(`folders with no related key    : ${corpus.filter((c) => c.saint.related === undefined).length}`);
  console.log(`folders gaining entries        : ${gains.size}`);
  console.log(`entries gained, two-way        : ${entries}`);
  console.log(`  gaining 1 / 2 / 3+           : ${dist[0]} / ${dist[1]} / ${dist[2]}`);

  if (process.argv.includes('--held')) {
    console.log('\n-- excluded, read these --------------------------------------------');
    for (const r of held.sort((a, b) => key(a).localeCompare(key(b)))) {
      console.log(`  ${key(r)}  [${excluded[key(r)].category}]\n      ${r.quote}`);
    }
  }

  if (!process.argv.includes('--write')) {
    console.log('\nNothing written. --write applies the floor.');
    process.exit(0);
  }

  let touched = 0;
  for (const [slug, slugs] of gains) {
    const file = path.join(SAINTS_DIR, slug, 'saint.json');
    /*
     * Written exactly as `related-from-links.mjs` writes it — two-space JSON,
     * trailing newline, key order left alone — so a folder this touches does
     * not read as a different shape from the one beside it.
     */
    const d = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    const next = [...new Set([...(d.related ?? []), ...slugs])].sort();
    if (JSON.stringify(next) === JSON.stringify(d.related ?? [])) continue;
    d.related = next;
    fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
    touched += 1;
  }
  console.log(`\nwrote ${touched} folders.`);
}
