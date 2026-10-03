import { readFileSync } from 'node:fs';
import { CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';
import { todayIso } from '../src/lib/calendar-page.js';
import { openingAt, stepOrder } from '../src/lib/prayer-order.js';

const M = JSON.parse(readFileSync(new URL('../data/manifest.json', import.meta.url), 'utf8'));
const cards = Array.isArray(M.saints) ? M.saints : Object.values(M.saints ?? M);
const order = stepOrder(cards);
const bySlug = new Map(cards.map((c) => [c.slug, c]));
console.log('today', todayIso(), 'book', order.length);
for (const { id } of enabledChurches()) {
  const at = openingAt(order, { saints: cards, bySlug, churchId: id, churchesById: CHURCHES_BY_ID, iso: todayIso() });
  console.log(id, at, order[at]?.slug, order[at]?.display_name);
}
