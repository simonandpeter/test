import { readFileSync } from 'node:fs';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';
const key = (h) => `${h.church}|${h.source?.url ?? h.source?.text ?? ''}`;
for (const [iso, slugs, church] of [
  ['2026-10-04', ['hierotheus-of-athens','dumitru-staniloae'], 'romanian'],
  ['2026-10-01', ['ananias-the-apostle','romanos-the-melodist','cyriacus-of-bisericani','joseph-of-bisericani'], 'romanian'],
  ['2026-11-15', ['herman-of-alaska','paisius-of-neamt'], 'romanian'],
]) {
  const keys = new Set((LITURGICAL_DAYS[iso][church].hymns ?? []).filter((h)=>h.church===church).map(key));
  console.log(`${iso} feast keys ${keys.size}`);
  for (const s of slugs) {
    const j = JSON.parse(readFileSync(`saints/${s}/saint.json`, 'utf8'));
    const own = (j.hymns ?? []).filter((h)=>h.church===church);
    console.log(`  ${s}: ${own.length} romanian, dup ${own.filter((h)=>keys.has(key(h))).length}, extra ${own.filter((h)=>!keys.has(key(h))).length}`);
  }
}
