/**
 * Which strings each locale pack has no translation for.
 *
 * `node scripts/locale-coverage.mjs`
 *
 * Written on 2026-08-26 to answer "the saint profile pages do not have russian,
 * greek, serbian or romanian translations", and kept because of what it said:
 * the packs were **already complete** — two or three missing keys of 273, all
 * of them saint *types* — which is what turned the search from "the packs are
 * missing strings" into "three places are not reading them". All three were
 * defects in the reading and not in the packs (Amendment 46), and the next
 * report of the same shape should start here for the same reason.
 *
 * A missing key is not necessarily a fault: `lib/i18n.js` merges a partial pack
 * over the English base, so an absent key falls back to English on purpose. The
 * report is a map of where that fallback is happening, not a list of errors.
 */
import { readdir, readFile } from 'node:fs/promises';

import { STRINGS } from '../src/ui/strings.js';
import { PACK_ONLY } from '../src/lib/i18n.js';
import { ru } from '../src/ui/locales/ru.js';
import { ro } from '../src/ui/locales/ro.js';
import { el } from '../src/ui/locales/el.js';
import { sr } from '../src/ui/locales/sr.js';

/** Every leaf, as a dotted path. Arrays are leaves: a pack replaces one whole. */
const paths = (obj, prefix = '') => {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...paths(v, p));
    else out.push(p);
  }
  return out;
};

const base = paths(STRINGS);
const packs = [['ru', ru], ['ro', ro], ['el', el], ['sr', sr]];

for (const [name, pack] of packs) {
  const have = new Set(paths(pack));
  const missing = base.filter((p) => !have.has(p));
  console.log(`\n=== ${name}: ${missing.length} of ${base.length} fall back to English`);
  for (const p of missing) console.log(`   ${p}`);
}

// And the other direction, which lib/i18n.js's `pruneTo` exists to survive: a
// pack-only branch would otherwise ride along into every later language.
for (const [name, pack] of packs) {
  const extra = paths(pack).filter((p) => !base.includes(p) && !PACK_ONLY.some((b) => p.startsWith(`${b}.`)));
  if (extra.length) console.log(`\n!! ${name} has ${extra.length} key(s) the base does not: ${extra.join(', ')}`);
}

/*
 * And the branch whose keys the *corpus* writes rather than this repository:
 * every office and every attestation title in the *saints' own folders* wants
 * an entry in all four packs, or a reader in one of them meets English on the line under a
 * saint's name (2026-09-08). A new saint with a see nobody has translated is
 * the ordinary way this goes stale, so it is a report and not a gate — the
 * same bargain `date-audit.mjs` makes about a missing birth year.
 */
const saints = new URL('../saints/', import.meta.url);
const phrases = new Set();
for (const slug of await readdir(saints)) {
  let card;
  try {
    card = JSON.parse(await readFile(new URL(`${slug}/saint.json`, saints), 'utf8'));
  } catch {
    continue; // not a saint folder, or not built yet
  }
  if (card.office) phrases.add(card.office);
  for (const att of card.attestations ?? []) for (const t of att.titles ?? []) phrases.add(t);
}
for (const [name, pack] of packs) {
  const gap = [...phrases].filter((p) => !pack.offices?.[p]).sort();
  console.log(`\n=== ${name}: ${gap.length} of ${phrases.size} offices and titles read English`);
  for (const p of gap) console.log(`   ${p}`);
}
