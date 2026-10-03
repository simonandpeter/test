/**
 * How often the day's hero is a saint the hymnal holds, and how often the day
 * holds any hymned saint at all. Population: calendar year 2026 × the enabled
 * churches, every day that has at least one entry in that church.
 */
import { readFileSync } from 'node:fs';
import { CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import { feastIndexFor } from '../src/lib/feasts.js';
import { entriesInChurch } from '../src/lib/church.js';
import { pickHero } from '../src/lib/calendar-page.js';

const M = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const cards = Array.isArray(M.saints) ? M.saints : Object.values(M.saints ?? M);
const bySlug = new Map(cards.map((c) => [c.slug, c]));
const hymned = new Set(cards.filter((c) => c.hymned?.length).map((c) => c.slug));

const year = 2026;
const index = feastIndexFor(cards, year, CHURCHES_BY_ID);

let days = 0;
let heroHymned = 0;
let dayHasHymned = 0;
let none = 0;
for (const church of enabledChurches().map((c) => c.id)) {
  for (const [iso, all] of index) {
    if (!iso.startsWith(String(year))) continue;
    const entries = entriesInChurch(all, church);
    if (!entries.length) continue;
    days += 1;
    const hero = pickHero(iso, entries, bySlug, church);
    if (hymned.has(hero)) heroHymned += 1;
    else if (entries.some((e) => hymned.has(e.slug))) dayHasHymned += 1;
    else none += 1;
  }
}
console.log({ churches: enabledChurches().length, days, heroHymned, heroNotButDayDoes: dayHasHymned, noneOnTheDay: none });
