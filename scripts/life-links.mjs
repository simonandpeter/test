/**
 * What a life links to, and whether the link reads as a dedication.
 *
 * Split out of `related-from-links.mjs` so a test can hold the rule without a
 * second copy of these regexes: `tests/life-links.test.mjs` asserts that every
 * `/saints/<slug>` a hand wrote into a life is a `related` row, which is
 * `PLAN.md`'s oldest corpus rule and the one that had gone unenforced —
 * 532 such links were in the corpus and nine of them were in `related`.
 *
 * The script keeps the two prose tiers, which need the manifest's name index;
 * this needs nothing but the folders, so it runs under `npm test` on CI where
 * `/data/` does not exist yet.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * The words that turn a saint's name into a building's — or into a date.
 *
 * **Adjacency, not proximity**, and the difference was a real false positive.
 * The first version looked for the word anywhere in the forty characters
 * before the name, and set aside "of the Trinity-Sergius monastery, sent with
 * Andrew Oslyabya to the battle by Sergius of Radonezh" — the one relationship
 * in the corpus nobody would want to lose, two monks sent to Kulikovo
 * together. A dedication runs straight into the name: the word, then at most
 * "of", "of the", or "of St".
 *
 * `Lavra`, `Skete` and `Podvorye` are looked for *after* the name as well,
 * since Russian usage puts them there — "the Alexander Nevsky Lavra" rather
 * than "the Lavra of Alexander Nevsky".
 *
 * `feast` is in the list for the same reason as the buildings: "he died on the
 * feast of Alexander Nevsky" dates a death and relates nobody.
 *
 * **A feast's own name reads the same way**, and the loose tier found the gap:
 * "the church of the Nativity of John the Forerunner" and "the Beheading of
 * John the Forerunner" both name a building or a commemoration, not a meeting,
 * and neither is a monastery or a lavra for the first NAMED_FOR list to catch
 * — the word standing in front of the name is the feast's own title. The
 * Slavic calendar's own commonest ones are listed rather than guessed at.
 *
 * **`protection` and `intercession` are left out on purpose**, having gone in
 * and straight back out: both name the Pokrov feast in a church's title, but
 * both are also ordinary English for a saint's patronage — "she put herself
 * under the protection of", "with the intercession of" — and the run that
 * added them promptly hid a real relation (Nicholas of Alma-Ata "served
 * afterwards under the protection of Theodosius of Chernigov, whom he
 * honoured greatly") behind a feast that sentence was never naming.
 */
export const NAMED_FOR =
  'church|chapel|cathedral|monastery|convent|lavra|skete|parish|abbey|hermitage|seminary|academy|brotherhood|society|feast|temple|altar|shrine|icon|hospital|almshouse|school|' +
  'nativity|dormition|beheading|annunciation|transfiguration|presentation|entrance|ascension|assumption|exaltation|elevation|resurrection|epiphany|theophany';
export const BEFORE = new RegExp(`\\b(?:${NAMED_FOR})\\b(?:\\s+of)?(?:\\s+the)?(?:\\s+(?:St|Saint|Ss)\\.?)?\\s*$`, 'i');
/*
 * Plural, and `chapel`, because both were read off the first run: "sent
 * travelling, to the Trinity and Alexander Nevsky lavras" and "buried in a
 * vault made in the John Chrysostom chapel" were proposed as relationships.
 * A dedication is a dedication in the plural too.
 */
export const AFTER =
  /^\s*(lavra|monastery|convent|cathedral|church|chapel|skete|podvorye|seminary|academy|hermitage)s?\b/i;

/**
 * The ones a reading refused, which no rule was going to catch.
 *
 * the lesson about the hymn matching, in a second place: **the
 * matching is a table rather than a rule.** `BEFORE` and `AFTER` above catch
 * the shape "the church of X"; nothing catches a battleship named for a saint,
 * and nothing should try. Each row says why it is here, and a row removed from
 * this table is a claim proposed again on the next run.
 */
export const REFUSED = new Set([
  // A warship of the Black Sea Fleet, the *Sviatoi Ioann Zlatoust*, whose
  // mutiny of 1912 Roman Medved calmed. A dedication like any church's.
  'roman-medved -> john-chrysostom',
  // Not a meeting but a quotation — "God is not in strength but in truth",
  // said seven centuries before Nicholas of Alma-Ata repeated it to his flock.
  'nicholas-of-alma-ata -> alexander-nevsky',
]);

/**
 * The mirror of `REFUSED`: rows a reading kept, against the rule.
 *
 * `BEFORE` is deliberately generous toward setting aside, and generosity has a
 * price paid in exactly one direction — a genitive that ends in a building.
 * "shot with the deacon of his church Alexander Ipatov" puts `church` directly
 * in front of a name, which is the shape of a dedication and the sense of a
 * colleague, and no rule reading sixty characters is going to tell them apart.
 *
 * A row belongs here only once someone has read it. It is the same bargain as
 * `REFUSED` — a row removed is a row proposed again on the next run, a row
 * added is a claim about two people — turned the other way up.
 */
export const KEPT = new Set([
  // The deacon of Gregory Garyaev's own church at Perm, shot the same day as
  // him in 1918. `church` stands in front of the name because it belongs to
  // `deacon of his`, not to Alexander.
  'gregory-presbyter-martyr-1918 -> alexander-deacon-martyr-1918',
]);


/**
 * Every distinct `/saints/<slug>` a life links to, once per target, with the
 * words around it and whether the rule reads it as a dedication.
 *
 * A hand pointing at a page is the strongest claim in the corpus — stronger
 * than the exact-match tier, which reports the words a life used and infers
 * the person, and far stronger than the loose tier, which drops a word to get
 * there. The dedication test still runs on it: it holds nothing back today,
 * and every one of the 228 distinct anchor texts is a person, but nothing
 * stops a later life writing `the church of [St John the Forerunner](…)`, and
 * a tier that cannot be wrong is a tier nobody will check.
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
        dedication: BEFORE.test(before) || AFTER.test(after),
        quote: (before.slice(-45) + `«${m[1]}»` + after).replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return rows;
}

/** Whether a row is one a reading has already settled, in either direction. */
export const setAside = (r) =>
  (r.dedication && !KEPT.has(`${r.dir} -> ${r.slug}`)) || REFUSED.has(`${r.dir} -> ${r.slug}`);
