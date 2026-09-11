/* Every Greek recorded form that carries an office word with no comma in front
   of it, with the word that precedes the office — the discriminator
   `saint-name.js` names in its own comment and never had. Rows, not a count. */
import { readdirSync, readFileSync } from 'node:fs';

const OFFICE =
  /(αρχιεπίσκοπ|επίσκοπ|μητροπολίτ|πατριάρχ|πρωτοπρεσβύτερ|πρεσβύτερ|ιερέ|αρχιδιάκον|διάκον|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|πρίγκιπ|πριγκίπισσ|βασιλι|βασίλισσ|αυτοκράτορ|αυτοκράτειρ|αγιογράφ|στυλίτ|πάπ)\p{L}*/giu;

for (const slug of readdirSync('saints')) {
  let saint;
  try {
    saint = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
  } catch {
    continue;
  }
  for (const entry of saint.names ?? []) {
    if (entry?.lang !== 'el' || !entry?.form) continue;
    const words = String(entry.form).split(/\s+/);
    for (let i = 0; i < words.length; i += 1) {
      OFFICE.lastIndex = 0;
      if (!OFFICE.test(words[i])) continue;
      const before = words[i - 1] ?? '(head)';
      if (/,$/.test(before)) continue; // the comma case the file already strips
      console.log(`${slug}: «${entry.form}»\n    office "${words[i]}" after "${before}"`);
    }
  }
}
