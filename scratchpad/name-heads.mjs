/* What the head word of every printed name form is, corpus-wide, so a change
   to the strip list is read against every form it can reach and not only the
   fourteen the gate names. Prints rows, never a count alone. */
import { readdirSync, readFileSync } from 'node:fs';
import { pickNameForms } from '../src/lib/saint-name.js';

const OFFICE_HEAD = {
  ru: /^(митрополит|архиепископ|епископ|патриарх|архимандрит|игумен|иеромонах|схимонах|монах|монахин|протоиере|протодиакон|иеродиакон|архидиакон|диакон|пресвитер|священник|иере|папа|княз|княгин|цар|короле|император|воевод)/i,
  el: /^(αρχιεπίσκοπ|επίσκοπ|μητροπολίτ|πατριάρχ|πρεσβύτερ|ιερέ|διάκον|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|πρίγκιπ|βασιλ|βασίλισσ|αυτοκράτ|πάπ)/i,
  ro: /^(arhiepiscop|mitropolit|episcop|patriarh|arhimandrit|egumen|stare[țţ]|ieromonah|monah|protoiere|protopop|arhidiacon|diacon|preot|prin[țţ]|regin|rege|[îi]mp[ăa]r[ăa]t|voievod|domnitor|pap)/i,
  sr: /^(архиепископ|митрополит|епископ|патријарх|архимандрит|игуман|јеромонах|монах|презвитер|свештеник|ђакон|дијакон|краљиц|краљ|кнегињ|кнез|цариц|цар|војвод|пап)/i,
};

const rows = [];
for (const slug of readdirSync('saints')) {
  let saint;
  try {
    saint = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
  } catch {
    continue;
  }
  const forms = pickNameForms(saint.names, saint.display_name);
  for (const [lang, form] of Object.entries(forms)) {
    const head = String(form).split(/\s+/)[0] ?? '';
    if (OFFICE_HEAD[lang]?.test(head)) rows.push([slug, lang, form, 'office head']);
  }
}
for (const [slug, lang, form, why] of rows) console.log(`${why}  ${slug} ${lang}: «${form}»`);
console.log(`\n${rows.length} form(s) whose printed head is an office word`);
