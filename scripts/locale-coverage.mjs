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
import { STRINGS } from '../src/ui/strings.js';
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
  const extra = paths(pack).filter((p) => !base.includes(p) && !p.startsWith('reasons.'));
  if (extra.length) console.log(`\n!! ${name} has ${extra.length} key(s) the base does not: ${extra.join(', ')}`);
}
