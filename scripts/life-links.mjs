/**
 * What a life links to, and the one reading that refuses a link.
 *
 * Split out of `related-from-links.mjs` so a test can hold the rule without a
 * second copy of it: `tests/life-links.test.mjs` asserts that every
 * `/saints/<slug>` a hand wrote into a life is a `related` row, which is
 * `STRUCTURE.md`'s oldest corpus rule and the one that had gone unenforced —
 * 532 such links were in the corpus and nine of them were in `related`.
 *
 * The script keeps the two prose tiers, which need the manifest's name index;
 * this needs nothing but the folders, so it runs under `npm test` on CI where
 * `/data/` does not exist yet.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * **A dedication is a relation** (author, 2026-10-03: "the more connections
 * the better"). A church, lavra, monastery, chapel or feast named for a saint
 * puts that saint in the life, and the page already hyperlinks the name, so
 * nothing here holds a link back for standing next to a building.
 *
 * What a reading still refuses is a name the sentence does not use for a
 * person met at all. **The refusal is a table rather than a rule**, the lesson
 * the hymn matching taught in another place: no rule reading sixty characters
 * around a name tells a quotation from a conversation, and nothing should try.
 * Each row says why it is here, and a row removed is a claim proposed again on
 * the next run.
 */
export const REFUSED = new Set([
  // Not a meeting but a quotation — "God is not in strength but in truth",
  // said seven centuries before Nicholas of Alma-Ata repeated it to his flock.
  'nicholas-of-alma-ata -> alexander-nevsky',
]);

/**
 * Every distinct `/saints/<slug>` a life links to, once per target, with the
 * words around it.
 *
 * A hand pointing at a page is the strongest claim in the corpus — stronger
 * than the exact-match tier, which reports the words a life used and infers
 * the person, and far stronger than the loose tier, which drops a word to get
 * there. `quote` is carried for a reader, not for a rule.
 */
export function writtenLinks(saintsDir = 'saints') {
  const slugs = new Set(fs.readdirSync(saintsDir));
  const rows = [];
  for (const dir of slugs) {
    const file = path.join(saintsDir, dir, 'life.md');
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    const seen = new Set();
    for (const m of raw.matchAll(/\[([^\]]*)\]\((\/saints\/([^)#?\s]+))\)/g)) {
      const slug = m[3];
      if (!slugs.has(slug) || slug === dir || seen.has(slug)) continue;
      seen.add(slug);
      const before = raw.slice(Math.max(0, m.index - 60), m.index);
      const after = raw.slice(m.index + m[0].length, m.index + m[0].length + 30);
      rows.push({
        dir,
        form: m[1],
        slug,
        kind: 'written',
        quote: (before.slice(-45) + `«${m[1]}»` + after).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return rows;
}

/** Whether a row is one a reading has already refused. */
export const setAside = (r) => REFUSED.has(`${r.dir} -> ${r.slug}`);
