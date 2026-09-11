/* Every printed name form, one per line, so a change to the strip list is
   diffed against the whole corpus rather than against the rows that prompted
   it. `node scratchpad/name-snapshot.mjs > a.txt`, change, `> b.txt`, diff. */
import { readdirSync, readFileSync } from 'node:fs';
import { pickNameForms } from '../src/lib/saint-name.js';

for (const slug of readdirSync('saints').sort()) {
  let saint;
  try {
    saint = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
  } catch {
    continue;
  }
  const forms = pickNameForms(saint.names, saint.display_name);
  for (const lang of ['ru', 'el', 'ro', 'sr']) {
    if (forms[lang]) console.log(`${slug}\t${lang}\t${forms[lang]}`);
  }
}
