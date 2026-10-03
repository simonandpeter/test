import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { LITURGICAL_DAYS } from '../src/data/liturgical-days.js';

const byUrl = new Map();
for (const e of readdirSync('saints', { withFileTypes: true })) {
  if (!e.isDirectory()) continue;
  const f = `saints/${e.name}/saint.json`;
  if (!existsSync(f)) continue;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const h of j.hymns ?? []) {
    const k = `${h.church}|${h.source?.url ?? h.source?.text ?? ''}`;
    if (!byUrl.has(k)) byUrl.set(k, []);
    byUrl.get(k).push(e.name);
  }
}

let days = 0, hits = 0;
for (const [iso, rec] of Object.entries(LITURGICAL_DAYS)) {
  for (const [church, d] of Object.entries(rec)) {
    const hs = d?.hymns ?? [];
    if (!hs.length) continue;
    const dup = hs.filter((h) => byUrl.has(`${h.church}|${h.source?.url ?? h.source?.text ?? ''}`));
    if (!dup.length) continue;
    days += 1; hits += dup.length;
    console.log(`${iso} [${church}] ${dup.length}/${hs.length} also in folders: ${[...new Set(dup.flatMap((h)=>byUrl.get(`${h.church}|${h.source?.url ?? h.source?.text ?? ''}`)))].join(', ')}`);
  }
}
console.log(`\n${hits} day-record hymns over ${days} day/church rows duplicate a folder's.`);
