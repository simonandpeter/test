import { readFileSync, existsSync } from 'node:fs';
import { CHURCHES_BY_ID } from '../src/data/churches.js';
import { feastIndexFor } from '../src/lib/feasts.js';

const M = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const cards = Array.isArray(M.saints) ? M.saints : Object.values(M.saints ?? M);
const mentions = JSON.parse(readFileSync(new URL('../data/mentions.json', import.meta.url), 'utf8'));
const HYMNED = cards.filter((c) => c.hymned?.length).sort((a, b) => a.display_name.localeCompare(b.display_name));
const CHURCH = 'russian';
const INDEX = feastIndexFor(cards, 2026, CHURCHES_BY_ID);
const dayOf = (slug, church) => {
  for (const [iso, entries] of INDEX) {
    if (entries.some((e) => e.slug === slug && e.church === church)) return iso;
  }
  return null;
};
const WITH_SAME_DAY = HYMNED.findIndex((card) => {
  const iso = dayOf(card.slug, CHURCH);
  return iso !== null && (INDEX.get(iso) ?? []).filter((e) => e.church === CHURCH).length > 1;
});
console.log('WITH_SAME_DAY', WITH_SAME_DAY);
for (let i = WITH_SAME_DAY; i < WITH_SAME_DAY + 6; i += 1) {
  const c = HYMNED[i];
  const iso = dayOf(c.slug, CHURCH);
  const sameday = iso ? (INDEX.get(iso) ?? []).filter((e) => e.church === CHURCH && e.slug !== c.slug).length : 0;
  const p = new URL(`../saints/${c.slug}/saint.json`, import.meta.url);
  const own = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  console.log(i, c.slug, 'sameday', sameday, 'mentionedIn', (mentions[c.slug] ?? []).length, 'related', (own.related ?? []).length);
}
