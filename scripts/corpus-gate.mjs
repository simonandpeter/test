#!/usr/bin/env node
/**
 * Everything that has to pass before a batch of saints is committed, in one
 * command, ending in a verdict.
 *
 * `node scripts/corpus-gate.mjs`                     the whole corpus
 * `node scripts/corpus-gate.mjs --batch 2026-10-01-ru`   and the batch's own folders
 * `node scripts/corpus-gate.mjs --online`            also check every new citation resolves
 * `node scripts/corpus-gate.mjs --quick`             skip `npm test`
 *
 * **Why a gate and not a test.** Most of what is below *is* a test and is run
 * as one; this exists because the expensive failures of the last month were
 * not test failures. They were a batch that turned twenty-four browser tests
 * red for a number nobody had updated, a duplicate saint under a variant
 * spelling, and a run where the suite was green and the batch had moved a
 * literal in `e2e/` that only CI would find seventeen minutes later. So the
 * last section of this report is not a check at all: it is the arithmetic the
 * e2e specs hard-code, printed beside the literal each currently holds, so a
 * batch that moves one is caught here rather than on CI.
 *
 * It writes nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { ROOT, readCorpus, feastIndex, nameKeys, calendarOf, churchDate, onCivilDay, CHURCH_IDS } from './corpus-index.mjs';
import { build, report } from './build-manifest.mjs';
import { makeInterval, overlaps, within, primaryCentury } from '../src/lib/dates.js';
import { pickNameForms, englishNamesMany } from '../src/lib/saint-name.js';

const args = process.argv.slice(2);
const has = (name) => args.includes(name);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};

const BATCH = opt('--batch', null);
const failures = [];
const notes = [];
const fail = (section, msg) => failures.push(`${section}: ${msg}`);

const corpus = readCorpus();
const index = feastIndex(corpus);

/** The folders this batch wrote, when a batch is named; otherwise all of them. */
let batchSlugs = null;
if (BATCH) {
  const file = path.join(ROOT, '.tmp', 'corpus-batches', `${BATCH}.json`);
  if (!fs.existsSync(file)) {
    console.error(`No batch record at ${path.relative(ROOT, file)}.`);
    process.exit(1);
  }
  batchSlugs = new Set(JSON.parse(fs.readFileSync(file, 'utf8')).folders.map((f) => f.slug));
}
const inBatch = ({ slug }) => !batchSlugs || batchSlugs.has(slug);

console.log(`corpus ${corpus.length} folders${BATCH ? `, batch "${BATCH}" of ${batchSlugs.size}` : ''}\n`);

/* ---- 1. the build's own validation --------------------------------------- */

console.log('— schema and build ————————————————————————————————');
const built = await build({ write: false });
if (report(built, { write: false }) !== 0) fail('build', `${built.errors.length} folder problem(s) above`);

/* ---- 2. the unit suite --------------------------------------------------- */

if (!has('--quick')) {
  console.log('\n— npm test ————————————————————————————————————————');
  /*
   * **The files, named.** `node --test tests/` reads the directory as a module
   * specifier on Node 22 and later and dies with MODULE_NOT_FOUND before it
   * runs anything — so this step failed on every tree, clean or dirty, from
   * the day it was written (2026-09-10) until it was noticed on 2026-09-11,
   * and the gate it belongs to went red for a reason that had nothing to do
   * with the corpus. `package.json` passes a glob instead, which works there
   * because npm hands it to a shell; from `spawnSync` there is no shell to
   * expand it. Reading the directory needs neither.
   */
  const specs = fs
    .readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.mjs'))
    .map((f) => path.join('tests', f));
  const run = spawnSync('node', ['--test', ...specs], { cwd: ROOT, encoding: 'utf8' });
  const tail = (run.stdout ?? '').trim().split('\n').slice(-14).join('\n');
  console.log(tail);
  if (run.status !== 0) fail('npm test', 'the unit suite is red — read the whole log, not this tail');
}

/* ---- 3. duplicates ------------------------------------------------------- */

console.log('\n— duplicates ——————————————————————————————————————');
/*
 * **On the feast date, never on the name**. Two folders one
 * church keeps on one menologion day are not automatically a duplicate — the
 * Greek keeps Sozon of Cyprus and Sozon of Pompeiopolis on 7 September and is
 * right to — so a crowded day is printed, not failed. The name fold under it
 * is the weaker signal and is the one that catches a variant transliteration.
 */
const folded = new Map();
for (const { slug, saint } of corpus) {
  for (const key of nameKeys(saint)) {
    if (!folded.has(key)) folded.set(key, []);
    folded.get(key).push(slug);
  }
}
/**
 * **The folds that have been read, and what the reading was.** A fold is a
 * suspicion and the gate is right to stop on it; but a calendar year of one
 * church hands the same forename to men centuries apart — the Romanian
 * «Teoctist» is three different saints in this corpus — and a suspicion that
 * has been settled by reading both pages is not a finding any more. The key is
 * the folded form and both slugs, sorted, so that a *third* folder joining the
 * fold is an unread pair again and stops the gate as it should.
 */
const READ_FOLDS = {
  'olga olga-daughter-of-nicholas-ii olga-of-alaska olga-of-kyiv':
    'three women called Olga, on three Romanian days. The new one is Olga Michael of Kwethluk in Alaska, the Yup ik midwife born in 1916, 27 October. The others are Olga of Kyiv, equal-to-the-apostles, 11 July, and the grand duchess Olga, daughter of Nicholas II, 17 July (read 29 September 2026)',
  'nestor nestor-of-maghid nestor-of-thessalonica nestor-the-martyr-2-march':
    'three men called Nestor, on three Romanian days. The new one is the young man of Thessalonica who threw down Lyaios and was killed the day after Demetrius, 27 October. The others are Nestor of Maghid, hieromartyr and bishop, 28 February, and the bare-line martyr of 2 March (read 29 September 2026)',
  'dimitrie demetrius-of-georgia demetrius-of-the-brazen-gate demetrius-the-myrrhstreamer ignatius-brianchaninov':
    'four folders whose ro form is Dimitrie. The new one is the great-martyr of Thessalonica, the Myrrh-streamer, 26 October. The other three were read on 29 September: the king of Georgia, 16 March; the martyr of the Brazen Gate, 9 August; and Ignatius Brianchaninov, whose baptismal name was Dimitrie, 30 April (read 29 September 2026)',
  'valerian valerian-25-october valerian-4-may valerian-companion-of-justin valerian-of-tomis valerian-of-trebizond':
    'five men called Valerian, on five Romanian days, and doxologia keeps five commemorations. The new one is a bare line — 25 octombrie prints the name and the readings and nothing else, no Viata tab and no Tropar tab — and so is the 4 mai folder. The other three carry lives: the companion of Justin, 1 June; Valerian of Tomis, 13 September; and Valerian of Trebizond, 21 January. Five entries on one calendar are five commemorations, and nothing on the October page ties it to any of the other four (read 29 September 2026)',
  'martirie martyrius-companion-of-marcian martyrius-of-zelenets':
    'two men: the subdeacon of Constantinople killed with the notary Marcian, 25 October, and Martyrius of Zelenets, abbot and venerable, Romanian 1 March (read 29 September 2026)',
  'marcian marcian-companion-of-martyrius marcian-of-durostorum marcian-the-emperor':
    'three men called Marcian, on three Romanian days. The new one is the notary of Constantinople killed with the subdeacon Martyrius, 25 October. The others are the soldier of Durostorum, 8 June, and the emperor Marcian, 17 February (read 29 September 2026)',
  'companion marcian martyrius marcian-companion-of-martyrius martyrius-companion-of-marcian':
    'the word-set artefact: the notary Marcian and the subdeacon Martyrius of Constantinople, put to death together under the Arians, doxologia 25 octombrie, each named as the other companion (read 29 September 2026)',
  'valentin valentine-companion-of-mark valentine-of-interamna':
    'two men: the martyr dragged along the ground with Mark and Soterichus, doxologia 24 octombrie, whose whole record is that one sentence; and Valentine, bishop of Interamna, a hieromartyr, Romanian 30 July (read 29 September 2026)',
  'marcu mark-companion-of-soterichus mark-of-apollonias mark-of-arethusa mark-of-byblos mark-of-ephesus mark-the-ascetic mark-the-evangelist':
    'seven men called Marcu, on seven Romanian days. The new one is the martyr of 24 October, one of the three whose whole record is one sentence. The other six are unchanged: Mark of Apollonias, 16 June; Mark of Arethusa, 29 March; Mark of Byblos, 27 April; Mark of Ephesus, 19 January; Mark the Ascetic, 5 March; and the evangelist, 25 April (read 29 September 2026)',
  'companion mark soterichus mark-companion-of-soterichus soterichus-companion-of-mark':
    'the word-set artefact once more: Mark and Soterichus, dragged along the ground until they died with Valentine, doxologia 24 octombrie, each named as the other companion (read 29 September 2026)',
  'ignatie ignatius-of-constantinople ignatius-of-methymna ignatius-of-stara-zagora':
    'three men called Ignatie, on three Romanian days. The new one is the patriarch of Constantinople, son of the emperor Michael I, 23 October. The others were read on 29 September: the metropolitan of Methymna, 14 October, and the new-martyr of Stara Zagora, 8 October (read 29 September 2026)',
  'iacob jacob-the-hermit james-of-nisibis james-of-samosata james-son-of-zebedee james-the-brother-of-the-lord':
    'five men called Iacob, on five Romanian days. The new one is the Brother of the Lord, first bishop of Jerusalem, 23 October. The others are unchanged: Jacob the hermit, 28 January; James of Nisibis, bishop and wonderworker, 13 January; one of the seven of Samosata, 29 January; and the apostle son of Zebedee, 30 April (read 29 September 2026)',
  'teodota theodota-of-adrianople theodota-with-her-three-sons':
    'two women, on two Romanian days: one of the four of Adrianople, 22 October, and Theodota who suffered with her three sons, 29 July (read 29 September 2026)',
  'anna anna-nun-martyr-1937 anna-of-adrianople':
    'two women: one of the four whom bishop Alexander converted at Adrianople and who were killed with him, Romanian 22 October; and the nun killed in 1937, who has no Romanian row at all (read 29 September 2026)',
  'averchie abercius-martyr-26-may abercius-of-hierapolis':
    'two men, and both calendars keep two. The corpus 26 mai folder is a bare line: doxologia prints «Sfantul Mucenic Averchie» with no epithet, no city and no century, and saint.gr 26 Maiou is the same bare «Agios Averkios», standing between the apostle Alphaeus and Agia Eleni, which is the company that day gives him. The new folder is Abercius of Hierapolis, equal-to-the-apostles, whose life both calendars print on 22 October (read 29 September 2026)',
  'sofronie sophronius-of-cioara sophronius-of-jerusalem sophronius-of-soumela':
    'three men called Sofronie, on three Romanian days. The new one is the monk of Cioara-Sebes in Alba who led the Transylvanian resistance to the union, 21 October. The others were read on 29 September: the patriarch of Jerusalem, 11 March, and the founder of Panagia Soumela, 18 August (read 29 September 2026)',
  'visarion bessarion-of-egypt bessarion-the-confessor':
    'two men, thirteen centuries apart: the Serb born in Bosnia in 1714 who defended the Orthodox of the Banat and Transylvania against the forced union with Rome, a confessor, Romanian 21 October; and Bessarion of Egypt, hermit and wonderworker, Romanian 20 February (read 29 September 2026)',
  'felix felix-companion-of-eusebius felix-of-apollonia':
    'two men: the priest put to the sword with the deacon Eusebius, doxologia 19 octombrie, and Felix of Apollonia, a martyr, Romanian 17 June. Two entries on one calendar (read 29 September 2026)',
  'eusebiu eusebius-31-may eusebius-companion-of-bassus eusebius-companion-of-felix eusebius-of-samosata':
    'four men called Eusebiu, on four Romanian days. The new one is the deacon put to the sword with the priest Felix, 19 October. The others are unchanged: the bare-line martyr of 31 May, the companion of Bassus, 20 January, and the bishop of Samosata, 22 June (read 29 September 2026)',
  'companion eusebius felix eusebius-companion-of-felix felix-companion-of-eusebius':
    'the word-set artefact again: the priest Felix and the deacon Eusebius, put to the sword together, doxologia 19 octombrie, each named as the other companion, so their display names hold the same three words. Two men on one line (read 29 September 2026)',
  'iulian julian-companion-of-caesarius julian-of-emesa julian-of-samosata julian-of-the-brazen-gate julian-of-the-euphrates':
    'five men called Iulian, on five Romanian days. The new one is the hermit who left the world for a cave by the Euphrates, venerable, 18 October. The other four are unchanged and were read on 19 and 29 September: the physician of Emesa, 6 February; one of the seven of Samosata, 29 January; the martyr of the Brazen Gate, 9 August; and the presbyter martyred at Terracina with Caesarius, 7 October (read 29 September 2026)',
  'luca luke-of-crimea luke-of-emesa luke-the-evangelist':
    'three men called Luca, on three Romanian days. The new one is the evangelist, 18 October. The others are unchanged: Luke the deacon of Emesa, a martyr, 29 January, and Luke of Crimea, archbishop, confessor and physician, 11 June (read 29 September 2026)',
  'leontie leontius-of-the-brazen-gate leontius-of-the-forty-martyrs leontius-of-tripoli leontius-the-martyr-16-october':
    'four men called Leontie, on four Romanian days. The new one is the first named of the four who died by fire, doxologia 16 octombrie. The other three are unchanged and were read on 29 September: the martyr of the Brazen Gate, 9 August; one of the Forty of Sebaste, 9 March; and the soldier of Tripoli, 18 June (read 29 September 2026)',
  'terentie terentius-of-africa terentius-the-martyr-16-october':
    'two men, both martyrs, on two Romanian days and in two companies. The new one is one of the four who died by fire, doxologia 16 octombrie; the other is Terentius of Africa, 10 April. Two entries on one calendar are two commemorations, and the October sentence names no Africa and no company but its own three (read 29 September 2026)',
  'dometie dometius-disciple-of-dionysius dometius-the-martyr-16-october':
    'two men: one of the four whom doxologia 16 octombrie keeps together in a single sentence — «Sfintii Mucenici Leontie, Dometie, Terentie si Domnin prin foc s-au savarsit» — and Dometius the disciple of Dionysius, a hieromonk and venerable, Romanian 25 June (read 29 September 2026)',
  'silvan silvanus-of-cibalae silvanus-of-emesa silvanus-of-gaza silvanus-the-apostle':
    'four men called Silvan, on four Romanian days. The new one is the aged presbyter of Gaza, beaten before the people of Caesarea and beheaded with his company, a bishop and martyr, 14 October. The other three are unchanged and were read on 29 September: the deacon of Cibalae, 21 August; the bishop of Emesa, 29 January; and Silvanus of the Seventy, 30 July (read 29 September 2026)',
  'ignatie ignatius-of-methymna ignatius-of-stara-zagora':
    'two men, and four centuries apart: the metropolitan of Methymna, born on Lesbos in 1492 to the priest Emmanuel Agallianos, Romanian 14 October; and the new-martyr of Stara Zagora, a monk, Romanian 8 October (read 29 September 2026)',
  'ghervasie gervasios-of-patras gervasius-of-milan':
    'two men: the martyr of Milan, twin brother of Protasius, whose relics Ambrose found, Romanian 14 October; and Gervasios of Patras, a hieromonk, venerable, Romanian 30 June. Two (read 29 September 2026)',
  'agatodor agathodorus-of-cherson agathodorus-servant-of-carpus-and-papylas agathodorus-the-martyr-2-february':
    'three men called Agatodor. The new one is the servant of Carpus and Papylas, killed with them at Pergamum, Romanian 13 October. The bishop of Cherson, a hieromartyr, keeps 7 March. The third is a bare line — doxologia 2 februarie prints «Sfantul Mucenic Agatodor» with the readings for a martyr and no life — and the Greek does the same: saint.gr keeps 2 Februariou «Agios Agathodoros» with no photograph and no entry. Two calendars each print a name-only Agathodorus in February and a servant of Carpus with a life in October, so they are two (read 29 September 2026)',
  'carp carpus-of-thyatira carpus-the-apostle':
    'two men on two Romanian days, and the calendar that prints them gives each a different see. Doxologia 13 octombrie life makes Carpus born at Pergamum and chosen bishop of Thyatira, martyred there with the deacon Papylas; its 26 mai Carpus is one of the Seventy. Some sources outside doxologia identify the two, and doxologia does not: it keeps two commemorations with two lives, so the corpus keeps two folders and asserts no identification (read 29 September 2026)',
  'prov probus-9-july probus-of-tarsus':
    'two men, and the Greek calendar settles it. The corpus already holds a bare «Sfantul Mucenic Prov» off doxologia 9 iulie, a page that carries the name and nothing more; saint.gr keeps 9 Iouliou «Agioi Andreas kai Provos», a Probus paired with an Andrew and not with a Tarachus. The new folder is the Probus martyred at Tarsus and Anazarbus with Tarachus and Andronicus, 12 October, whose life both calendars print. Two men (read 29 September 2026)',
  'cosma cosmas-companion-of-thomas-of-zographou cosmas-of-chalcedon cosmas-of-maiuma cosmas-of-rome':
    'four men called Cosma, on four Romanian days. The new one is Cosmas of Maiuma, the orphan of Jerusalem taken into the house of John Damascene parents and raised with him, the hymnographer, 12 October. The others are unchanged: the companion of Thomas of Zographou, a venerable-martyr, 10 October; the bishop of Chalcedon, 18 April; and Cosmas of Rome, the unmercenary physician, 1 July (read 29 September 2026)',
  'andronic andronicus-of-antioch andronicus-of-tarsus andronicus-the-apostle':
    'three men called Andronic, on three Romanian days. The new one is the youngest of the three martyred at Tarsus and Anazarbus with Tarachus and Probus, 12 October. The others were read on 29 September: the goldsmith of Antioch under Theodosius, 9 October, and the apostle of the Seventy, 17 May (read 29 September 2026)',
  'zenaida zenaida-martyr-7-june zenaida-of-tarsus':
    'two women, and two calendars keep both of them apart. Doxologia prints a lone «Sfanta Mucenita Zenaida» on 7 iunie, with no life and no hymn, grouped with Theodotus of Ancyra and Sebastiana; saint.gr prints the same trio on 7 Iouniou and heads hers «Agia Zenais i Thaumatourgi», whose own page (saint.gr/503) says «Den echoume leptomereies gia ton vio tis Agias» — no life there either. Both calendars also keep Zenais of Tarsus with her sister Philonilla on 11 October, kinswomen of Paul, with a life. Two entries on one calendar are two commemorations, so two women, and nothing identifies the 7 June one with Tarsus (read 29 September 2026)',
  'teofan theophanes-of-antioch theophanes-of-nicaea theophanes-of-sigriane theophanes-venerable-17-may':
    'four men called Teofan, on four Romanian days. The new one is Theophanes the Branded, brother of Theodore and bishop of Nicaea, Romanian 11 October. The others are the hermit of Antioch, 10 June; Theophanes of Sigriane the chronicler, 12 March; and the bare-line venerable of 17 May (read 29 September 2026)',
  'filip philip-of-moscow philip-the-apostle philip-the-deacon philippus-of-niculitel':
    'four men called Filip, on four Romanian days. The new one is Philip the deacon, one of the Seven, of Caesarea in Palestine, who had four daughters that prophesied, Romanian 11 October. The others are the metropolitan of Moscow, 9 January; the apostle, kept in the Synaxis of the Twelve on 30 June; and Philippus the soldier of Niculitel, 4 June (read 29 September 2026)',
  'andronic andronicus-of-antioch andronicus-the-apostle':
    'two men, four centuries apart: the goldsmith of Antioch under Theodosius the Great who with his wife Athanasia gave away their goods and went into the desert, Romanian 9 October; and the apostle, one of the Seventy, the companion of Junia, Romanian 17 May (read 29 September 2026)',
  'pelaghia pelagia-of-antioch pelagia-of-tarsus':
    'two women, on two Romanian days: the penitent of Antioch, whom bishop Nonnus baptised and who ended her life as a recluse on the Mount of Olives, whose life doxologia prints in the words of the deacon James, 8 October; and the virgin martyr of Tarsus, 4 May (read 29 September 2026)',
  'iulian julian-companion-of-caesarius julian-of-emesa julian-of-samosata julian-of-the-brazen-gate':
    'four men called Iulian, on four Romanian days. The new one is the presbyter martyred at Terracina with the deacon Caesarius under Claudius, 7 October. The other three are unchanged and were read on 19 and 29 September: the physician of Emesa, 6 February; one of the seven of Samosata, 29 January; and the martyr of the Brazen Gate, 9 August (read 29 September 2026)',
  'serghie sergius-companion-of-bacchus sergius-martyr-2-january sergius-the-confessor':
    'three men called Serghie, on three Romanian days. The new one is the Roman of senatorial rank martyred with Bacchus under Maximian, 7 October; the others are the bare-line martyr of 2 January and Sergius the Confessor, venerable, 13 May (read 29 September 2026)',
  'caesarius companion julian caesarius-companion-of-julian julian-companion-of-caesarius':
    'the same word-set artefact: the deacon Caesarius and the presbyter Julian, martyred together at Terracina under Claudius, Romanian 7 October, each named as the other companion, so their display names hold the same three words (read 29 September 2026)',
  'bacchus companion sergius bacchus-companion-of-sergius sergius-companion-of-bacchus':
    'not a collision of two names but of one word-set: the fold is the bag of words in a display name, so two men who are each named as the other companion always fold together. These are the two Romans of senatorial rank at Maximian court, martyred together, Romanian 7 October, and each display name carries the other name (read 29 September 2026)',
  'irineu irenaeus-of-egypt irenaeus-of-sirmium irenaeus-the-martyr-22-august':
    'the new folder is a calendar line and nothing else: «Sfantul Mucenic Irineu» on 22 august, no Viata tab and no Tropar tab, so it asserts a martyr, a name and a day. He is not identified with any Irenaeus the corpus already keeps, and all of them keep other days out of other sources: Irenaeus of Egypt, a martyr, Romanian 5 June; Irenaeus of Sirmium, hieromartyr and bishop, 6 April; Irenaeus of Lyon, 23 August; and Irenaeus of Rome, who has no Romanian row (read 29 September 2026)',
  'zinon zeno-of-diospolis zeno-the-martyr-22-august':
    'the new folder is a calendar line and nothing else: «Sfantul Mucenic Zinon» on 22 august, and the page behind it opens neither a Viata nor a Tropar tab. The other Zinon the Romanian keeps is Zeno of Diospolis, one of the Seventy, an apostle and not a martyr, 27 April. He is also not zeno-of-nicomedia, whose own life puts him in Anthimus company on the Russian 3 September, and doxologia own life of Agathonicus — the life it prints under five of the 22 august names — names no Zeno, so no connection is asserted (read 29 September 2026)',
  'silvan silvanus-of-cibalae silvanus-of-emesa silvanus-the-apostle':
    'the deacon of Cibalae, a martyr under Diocletian with Donatus the deacon, Romulus the presbyter and Venustus, Romanian 21 August, is new. The other two are unchanged and keep their own days: Silvanus the bishop of Emesa, a martyr, Romanian 29 January, and Silvanus one of the Seventy, Romanian 30 July (read 29 September 2026)',
  'donat donatus-of-cibalae donatus-of-euroea':
    'the deacon of Cibalae, a martyr under Diocletian with Romulus the presbyter, Silvanus the deacon and Venustus, Romanian 21 August, against the bishop of Euroea, a hierarch and wonderworker, Romanian 30 April. Two (read 29 September 2026)',
  'leon leo-of-catania leo-the-great leo-the-martyr-18-august':
    'the new folder is a calendar line and nothing else: doxologia prints «Sfantul Mucenic Leon» on 18 august and the page behind it opens neither a Viata nor a Tropar tab, so the folder asserts a martyr, a name and a day. Neither namesake can be him: the corpus keeps Leo of Catania, a bishop and wonderworker, on the Romanian 20 February, and Leo the Great, bishop of Rome, on 18 February, and neither is a martyr. No other martyr Leo is held on 18 August (read 29 September 2026)',
  'sofronie sophronius-of-jerusalem sophronius-of-soumela':
    'the nephew of Barnabas of Soumela, baptised Sotirihos, who founded Panagia Soumela with him, Romanian 18 August, against the patriarch of Jerusalem, Romanian 11 March. Two (read 29 September 2026)',
  'barnaba barnabas-of-soumela barnabas-the-apostle':
    'the Athenian monk of the tenth century who with his nephew Sophronius founded Panagia Soumela in Pontus, Romanian 18 August — baptised Vasile, and Barnabas only from his tonsure — against the apostle, Romanian 11 June. Two (read 29 September 2026)',
  'stefan stefan-brancoveanu stephen-of-triglia':
    'the second son of Constantin Brancoveanu, beheaded with his father and brothers in 1714, Romanian 16 August, against the abbot of Triglia, venerable and a confessor under the iconoclasts, Romanian 28 March. Two (read 29 September 2026)',
  'matei matei-brancoveanu matthew-the-apostle':
    'the youngest son of Constantin Brancoveanu, beheaded with his father and brothers in 1714 and about twelve years old, Romanian 16 August, against the apostle and evangelist, whom the Romanian keeps in the Synaxis of the Twelve on 30 June. Two (read 29 September 2026)',
  'constantin constantin-son-of-brancoveanu constantine-of-georgia constantine-the-great cyril-the-philosopher':
    'four men called Constantin, on four Romanian days. The new one is the eldest son of Constantin Brancoveanu, beheaded with his father and three brothers at Constantinople in 1714, Romanian 16 August. The others are Constantine of Georgia, prince and martyr, 2 October; Constantine the Great, 21 May; and Cyril the Philosopher, whose baptismal name was Constantin, 11 May. His father, who has his own folder and his own row on the same day, is constantine-brancoveanu and folds under the English form (read 29 September 2026)',
  'dorotei dorotheus-of-gaza dorotheus-of-tyre':
    'two men whose ro form is Dorotei, on two Romanian days: the abbot of Gaza, venerable, who lived under Abba Seridos and wrote the Discourses, Romanian 13 August; and the bishop of Tyre under Diocletian, a hieromartyr, Romanian 5 June. The namesweep proposed the abbot against dorotheus-of-nicomedia and dorotheus-the-hermit-of-egypt and the reader rejected both; this is the Romanian spelling folding in a third (read 29 September 2026)',
  'alexie alexis-of-moscow alexius-of-the-brazen-gate':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the other is the metropolitan of Moscow, a monk and wonderworker, Romanian 12 February (read 29 September 2026)',
  'antonin antoninus-martyr-9-august antoninus-of-ephesus':
    'two men, and the calendar that prints them settles it by itself: doxologia keeps «Sfintii 7 tineri din Efes» on 4 august and again on 22 octombrie, of whom Antoninus is one, and prints a lone «Sfantul Mucenic Antonin» on 9 august with no life, no year and no company. One calendar, two commemorations, so two men. The 9 August folder is a name-only line and its life says so (read 29 September 2026)',
  'dimitrie demetrius-of-georgia demetrius-of-the-brazen-gate ignatius-brianchaninov':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the others are the king of Georgia, a martyr, Romanian 16 March, and Ignatius Brianchaninov, bishop, Romanian 30 April, whose baptismal name Dimitrie is what folds him in (read 29 September 2026)',
  'ioan john-companion-of-simeon john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-ephesus john-of-gothia john-of-nea-moni john-of-the-brazen-gate john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'thirteen men whose `ro` form is Ioan, on thirteen separate Romanian days. The twelve read on 25 and 28 September are unchanged; the thirteenth, which reopened this fold as it should, is the martyr of the Brazen Gate on 9 August. The namesweep proposed him against `john-the-theologian` and the reader rejected it (read 29 September 2026)',
  'iulian julian-of-emesa julian-of-samosata julian-of-the-brazen-gate':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the wider fold of the physician of Emesa, Romanian 6 February, against one of the seven of Samosata, Romanian 29 January, was read on 19 September and is unchanged (read 29 September 2026)',
  'leontie leontius-of-the-brazen-gate leontius-of-the-forty-martyrs leontius-of-tripoli':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the others are one of the Forty of Sebaste, Romanian 9 March, and the soldier of Tripoli, Romanian 18 June (read 29 September 2026)',
  'marchian marcian-of-constantinople marcian-of-egypt marcian-of-the-brazen-gate':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the others are the venerable presbyter of Constantinople, Romanian 10 January, and Marcian of Egypt, a martyr, Romanian 5 June (read 29 September 2026)',
  'maria golinduhia-of-persia maria-daughter-of-nicholas-ii maria-of-gatchina maria-the-patrician mary-of-aza mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'eight women whose `ro` form is Maria, on eight separate Romanian days. The new one is Maria the patrician, beheaded with the nine men at the Brazen Gate, Romanian 9 August; the namesweep proposed her against `mary-wife-of-xenophon` and the reader rejected it. Golinduhia is folded in by her baptismal name Maria (read 29 September 2026)',
  'petru peter-of-lampsacus peter-of-murom peter-of-sebaste peter-of-the-brazen-gate peter-the-apostle':
    'the Romanian 9 August is «Sfintii 10 Mucenici Marturisitori pentru icoana lui Hristos», ten folders off one enumerating line: the nine men and Maria the patrician beheaded at the Brazen Gate under Leo the Isaurian, about 730. Nine of the ten names collide with men the corpus already keeps, and every collision is the forename and nothing else. Here the new one is the martyr of 9 August; the others are Peter of Lampsacus, Romanian 18 May, Peter of Murom, prince, 31 August, Peter of Sebaste, bishop, 9 January, and the apostle. The namesweep proposed him against `peter-of-sebaste` and the reader rejected it (read 29 September 2026)',
  'nicanor nicanor-of-zavorda nicanor-the-deacon':
    'two men, a millennium and a half apart and on two days: the deacon of the Seventy, one of the four the Romanian 28 July names together, a martyr; and the hieromonk of Zavorda, venerable, 7 August (read 28 September 2026)',
  'dionisie dionysius-companion-of-lucillian dionysius-companion-of-quadratus dionysius-of-athos dionysius-of-ephesus dionysius-of-lampsacus':
    'the Romanian 4 August is the Seven Sleepers of Ephesus, seven folders off one enumerating line, and three of their names collide with men the corpus already keeps. The new one is the sleeper, 4 August. The other four keep their own days and are unchanged: the companion of Lucillian, 3 June; the companion of Quadratus, 10 March; Dionysius of Athos, 25 June; and Dionysius of Lampsacus, 18 May (read 28 September 2026)',
  'ioan john-companion-of-simeon john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-ephesus john-of-gothia john-of-nea-moni john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'twelve men whose `ro` form is Ioan, on twelve separate Romanian days. The eleven read on 25 September are unchanged; the twelfth, which reopened this fold as it should, is the sleeper of Ephesus on 4 August (read 28 September 2026)',
  'martinian martinian-of-caesarea martinian-of-ephesus':
    'the Romanian 4 August is the Seven Sleepers of Ephesus, seven folders off one enumerating line, and three of their names collide with men the corpus already keeps. The new one is the sleeper, 4 August; the other is Martinian of Caesarea, Romanian 13 February (read 28 September 2026)',
  'faust faustus-martyr-16-july faustus-son-of-dalmatus':
    'two men, on two days and in two shapes: the bare «Sfantul Mucenic Faust» of the Romanian 16 July, whom doxologia gives two sentences under Decius with no place and no company, and the son of Dalmatus of the Dalmatian monastery in Constantinople, Romanian 3 August, who is named on his day beside his father and beside Isaac the abbot. The wider «faustus» fold of three men was read on 25 September and is unchanged; this is the Romanian spelling meeting a new folder (read 28 September 2026)',
  'anatolie anatolius-patriarch-of-constantinople anatoly-the-younger-of-optina':
    'two men called Anatolie, on two days: the patriarch of Constantinople, Romanian 3 July, and the elder «cel Tanar» of Optina, 30 July, whose doxologia page carries no life at all but the akathist of the Optina elders (read 28 September 2026)',
  'crescent crescens-of-myra crescens-the-apostle':
    'two men called Crescent, on two days: Crescens of Myra, Romanian 15 April, and the apostle and bishop of Galatia, 30 July (read 28 September 2026)',
  'iulita julitta-mother-of-cyricus julitta-of-caesarea':
    'two women called Iulita, on two days, and the July one has a life of her own: the mother of Cyricus, Romanian 15 July, against the woman of Caesarea in Cappadocia who went to law over her property under Diocletian and lost the case because a Christian was outside the law, 30 July (read 28 September 2026)',
  'sila silas-of-sihastria-putnei silas-the-apostle':
    'two men called Sila, on two days and a millennium apart: the Romanian hermit of Sihastria Putnei, 16 May, and the apostle and bishop of Corinth, 30 July (read 28 September 2026)',
  'silvan silvanus-of-emesa silvanus-the-apostle':
    'two men called Silvan, on two days and two sees the corpus records as offices: the bishop of Emesa, Romanian 29 January, and the apostle and bishop of Thessalonica, 30 July. A third and bare «Sfantul Mucenic Silvan» stands open on 5 noiembrie and has no folder (read 28 September 2026)',
  'veniamin benjamin-the-deacon benjamin-the-martyr-29-july':
    'two men, and the whole of the separation is one word the calendar prints. The Romanian 31 March line reads «Sfantul Mucenic Veniamin, diaconul» and the 29 July line «Sfantul Mucenic Veniamin», and neither page carries a life, a troparion, a country or a century. So they are held apart on the deacon and on the day, exactly as the two Vitalises of 11 January and 23 July are held apart on venerable against martyr, and the July life says so rather than implying more. Two further Benjamins are in the corpus and are not in question, both Russian new-martyrs of the 1930s: Blagonadezhdin and Voskresensky (read 25 September 2026)',
  'antuza anthousa-12-april anthousa-the-venerable-27-july':
    'two women, and both Romanian lines are bare -- «Sfanta Cuvioasa Antuza», the same rank on 12 aprilie and on 27 iulie, no life and no century on either page -- so the July folder was written, undone, and written again only once days.pravoslavie.ru had been read for both days. Its 12 April line is «Prp. Anfusy devy (801)», a virgin with no companions, dated. Its 27 July line is «Prp. Anfisy isp., igumenii i 90 sester ee (VIII)» -- a confessor and abbess of the Mantineon monastery with ninety sisters, whom Constantine Copronymus had seized and icons burnt on her head, hands and feet. A dated virgin alone against an eighth-century abbess of ninety, and saint.gr separates them the same way. Four women of this name are now held: these two, Anthousa of Seleucia on 22 August and Anthousa the New on 27 August (read 25 September 2026)',
  'clement clement-apostle-of-sardis clement-of-ancyra clement-of-ohrid':
    'three men called Clement, on three days and three ranks: the archbishop of Ohrid, Romanian 27 July, a hierarch; Clement of Ancyra, «Sfantul Sfintit Mucenic Clement, Episcopul Ancirei», a hieromartyr bishop on the Romanian 23 January; and the apostle and bishop of Sardis, who has no Romanian row at all -- the Russian, Greek and Serbian calendars keep him on 10 September and doxologia has not been read for him (read 25 September 2026)',
  'hristina christina-martyr-18-may christina-of-tyre':
    'two women called Hristina, and the calendar distinguishes them in its own words: the 18 mai line is «Sfanta Hristina si cele 7 sfinte fecioare impreuna cu ea», a Christina kept with seven virgins, and the 24 iulie line is «Sfanta Mare Mucenita Hristina», a great-martyr who is alone on her day and whose long life names Tyre and her father the governor Urban (read 25 September 2026)',
  'ermoghen hermogenes-of-moscow hermogenes-the-martyr-24-july':
    'two men called Ermoghen, on two days and two ranks: the patriarch of Moscow, Romanian 17 februarie, whose line gives him his see, and the bare «Sfantul Mucenic Ermoghen» of 24 iulie, a martyr with no city, no century and no life on the page. The July folder says so itself and holds itself apart from every Hermogenes the corpus already keeps (read 25 September 2026)',
  'valeria valeria-martyr-6-june valeria-the-martyr-23-july':
    'two women, and it took a page outside doxologia to say so. Both Romanian lines are bare -- «Sfanta Mucenita Valeria», a rank and a day and nothing else, on 6 iunie and on 23 iulie -- so the folder for the July line was written on 25 September, undone the same hour, and written again only once saint.gr/489 had been read: it keeps 6 Iouniou for the five virgins of Caesarea in Palestine, Martha, Maria, Kyria, Vareria (or Valeria) and Markia, tortured to death one after another under the citys archon. That is the June woman. No source read names a Valeria on 23 July at all, so the July line stands as a bare attestation and her own identity is unattested -- she is emphatically not made the wife of the Vitalis doxologia prints beside her, whom saint.gr/2036 puts at Ravenna in the first century (read 25 September 2026)',
  'companion theophilus trophimus theophilus-companion-of-trophimus trophimus-companion-of-theophilus':
    'the two men the Romanian 23 July names together, who suffered under Diocletian with thirteen others and share one life between two folders, as Simeon and John of Emesa do on 21 July (read 25 September 2026)',
  'teofil theophilus-companion-of-trophimus theophilus-of-the-forty-martyrs':
    'two men called Teofil, on two days: the companion of Trophimus under Diocletian, Romanian 23 July, and the Theophilus frozen at Sebaste with the Forty, 9 March (read 25 September 2026)',
  'trofim trophimus-companion-of-paul trophimus-companion-of-theophilus trophimus-of-laodicea trophimus-of-nicomedia':
    'four men called Trofim, on four days: the companion of Theophilus under Diocletian, Romanian 23 July; the companion of Paul, 15 April; Trophimus of Laodicea, 11 March; and Trophimus of Nicomedia, 18 March (read 25 September 2026)',
  'vitalie vitalis vitalis-the-martyr-23-july':
    'two men called Vitalie, and the calendar itself separates them: the Romanian 11 January line reads «Sfantul Cuvios Vitalie», a venerable, and the 23 July line «Sfantul Mucenic Vitalie», a martyr. Both lines are bare -- no life, no hymn, no place, no century on either page -- so the two are held apart on the rank and the day and on nothing else, which the 23 July life says in as many words (read 25 September 2026)',
  'ioan john-companion-of-simeon john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-gothia john-of-nea-moni john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'eleven men whose `ro` form is Ioan, on eleven separate Romanian days. The new one is the companion of Simeon the Fool for Christ, Romanian 21 July: a Syrian of good family, twenty-four years old and newly married, who turned aside from the pilgrimage to the Cross with Simeon under Justinian. The other ten are unchanged and each keeps its own day -- the disciple of Gregory the Decapolite and John of Antioch, both 18 April and two men; John of Edessa, 31 January; John of Gothia, 26 June; John of Nea Moni, 20 May; the John frozen at Sebaste, 9 March; John of the Old Lavra, 19 April; John of Valaam, 5 June; the son of Xenophon, 26 January; and the Theologian, 26 September (read 25 September 2026)',
  'simeon simeon-martyr-16-may simeon-of-persia simeon-the-fool-for-christ symeon-kinsman-of-the-lord symeon-the-god-receiver':
    'five men whose `ro` form is Simeon, on five separate Romanian days. The new one is Simeon the Fool for Christ of Emesa, Romanian 21 July, who set out from Syria under Justinian with the John of the same batch and shares his life; the two are one story told in one text and two folders. The other four are unchanged -- the bare martyr the calendar prints on 16 May; Simeon of Persia, 17 April; the kinsman of the Lord, 27 April; and the God-receiver who held the Child, 3 February (read 25 September 2026)',
  'avramie abramius-of-arbela athanasius-the-athonite':
    'Athanasius the Athonite, Romanian 5 July, whose second `ro` form is Avramie because his own life gives that as his baptismal name, against the hieromartyr bishop of Arbela under Shapur II, Romanian 4 February (read 25 September 2026)',
  'ciprian cyprian-companion-of-quadratus cyprian-martyr-10-may cyprian-the-new-martyr':
    'three men called Ciprian, on three days: the hieromonk new-martyr of Kletzos in Agrafa, Romanian 5 July; the companion of Quadratus of Corinth under Decius and Valerian, Romanian 10 March; and the bare «Sfantul Mucenic Ciprian» the calendar prints on 10 May with no life and no century (read 25 September 2026)',
  'elisabeta elizabeth-of-pasarea elizabeth-of-russia elizabeth-the-wonderworker':
    'three women called Elisabeta, on three days: the venerable-martyr the Romanian calendar names on 18 July with no life of its own; the hermit of Pasarea, Elizabeth Lazar, 5 June; and the abbess and wonderworker of Constantinople, 24 April (read 25 September 2026)',
  'iachint hyacinth-son-of-theoclitus hyacinth-the-chamberlain':
    'the son of Theoclitus and Theopila, whom doxologia gives a single sentence on 18 July, against the chamberlain of Trajan’s household, Romanian 3 July, committed a fortnight ago (read 25 September 2026)',
  'alexandra alexandra-of-ancyra alexandra-of-diveevo alexandra-the-empress alexandra-wife-of-nicholas-ii':
    'four women called Alexandra, on four days: the empress and last tsaritsa, shot at Ekaterinburg with her household, Romanian 17 July; one of the seven virgins of Ancyra, 18 May; the abbess and foundress of Diveevo, 13 June; and the empress, wife of Diocletian, 21 April (read 25 September 2026)',
  'anastasia anastasia-daughter-of-nicholas-ii anastasia-of-rome-15-april':
    'the youngest daughter of Nicholas II, killed with her family, Romanian 17 July, against the martyr of Rome, Romanian 15 April (read 25 September 2026)',
  'maria golinduhia-of-persia maria-daughter-of-nicholas-ii maria-of-gatchina mary-of-aza mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'seven women whose `ro` form is Maria. The new one is the third daughter of Nicholas II, killed with her family on the Romanian 17 July; the other six were read on 13 July and are unchanged -- Golinduhia of Persia, whose second form is her baptismal name; Maria of Gatchina and Mary the wife of Xenophon, both 26 January and two women; the virgin of Aza, 9 June; the sister of Lazarus, 4 June; and the sister of Lykarion, 8 February (read 25 September 2026)',
  'nicolae nicholas-ii nicholas-of-lesvos nicholas-of-the-forty-martyrs':
    'three men called Nicolae, on three days: the last emperor, shot at Ekaterinburg, Romanian 17 July; the deacon and monk of Lesvos, 9 April; and one of the Forty frozen at Sebaste, 9 March (read 25 September 2026)',
  'olga olga-daughter-of-nicholas-ii olga-of-kyiv':
    'the eldest daughter of Nicholas II, killed with her family, Romanian 17 July, against the princess of Kyiv, grandmother of Vladimir, Romanian 11 July (read 25 September 2026)',
  'tatiana tatiana-daughter-of-nicholas-ii tatiana-of-rome':
    'the second daughter of Nicholas II, killed with her family, Romanian 17 July, against the deaconess of the church of Rome, Romanian 12 January (read 25 September 2026)',
  'faustus faustus-martyr-16-july faustus-presbyter-of-alexandria faustus-the-martyr':
    'three men called Faustus: the martyr of the Romanian 16 July, whom doxologia gives two sentences -- under Decius, tortured five days, no place, no judge, no company; the presbyter of Alexandria, one of eleven with Abibus the deacon, Russian and Greek 6 September, also under Decius; and the martyr kept with Andrew the Stratelates, Romanian and Greek 31 August, under Maximian. The July page itself distinguishes him from the August one. It does not mention Alexandria, and the two Decian men are held apart here on the day and the company rather than on anything the July page says, which is little (read 25 September 2026)',
  'iulia julia-of-ancyra julia-the-virgin':
    'the virgin of Carthage carried captive into Syria, Romanian 16 July, against one of the seven virgins of Ancyra read out of the life of Theodotus, Romanian 18 May (read 25 September 2026)',
  'iosif joseph-archbishop-of-thessalonica joseph-of-nea-moni joseph-the-hymnographer joseph-the-merciful':
    'four men called Iosif, on four days: the archbishop of Thessalonica, Romanian 15 July, whose page carries the feast line and nothing else; one of the venerable fathers of Nea Moni on Chios, 20 May; the hymnographer, 4 April; and Joseph Naniescu, metropolitan of Moldavia, born in Bessarabia in 1818, 26 January (read 25 September 2026)',
  'vladimir vladimir-metropolitan-of-kiev vladimir-the-great':
    'the prince of Kyiv, equal-to-the-apostles, Romanian 15 July, against the metropolitan of Kiev, Romanian 25 January, whose page carries one line and no life (read 25 September 2026)',
  'achila aquila aquila-of-trebizond':
    'the apostle of the Seventy, the tent-maker of Pontus and husband of Priscilla, kept on the Romanian 13 February with a note for his second day of 14 July, against one of four men the calendar keeps together on 21 January under one passion (read 25 September 2026)',
  'iust justus-1-june justus-the-soldier':
    'the Roman soldier of the tribune Claudius, to whom doxologia gives five lines on 14 July, against the bare «Sfantul Mucenic Iust» of 1 June, whose page carries the name and no life (read 25 September 2026)',
  'maria golinduhia-of-persia maria-of-gatchina mary-of-aza mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'six women whose `ro` form is Maria, on five days: Golinduhia of Persia, Romanian 13 July, whose second form is Maria because doxologia’s own last line says «Sfanta Mucenita Maria, care mai inainte s-a numit Golinduhia»; Maria of Gatchina and Mary the wife of Xenophon, both 26 January and plainly two women; one of the five canonical virgins of Aza, 9 June; the sister of Lazarus, 4 June; and the sister of Lykarion, 8 February (read 25 September 2026)',
  'ilarie hilary-companion-of-proclus hilary-of-poitiers':
    'the martyr of Callippi near Ancyra, tortured with his kinsman Proclus under the governor Maximus, Romanian 12 July, against the bishop of Poitiers, Romanian 13 January, whose page on doxologia.ro carries his icon and his translated texts but no life (read 25 September 2026)',
  'gheorghe george-of-egypt george-of-pisidian-antioch george-of-thessalonica':
    'three men called Gheorghe, on three days: the bishop of Thessalonica remembered in that metropolis’s Synodikon after Niketas, Romanian 10 July; the bishop and confessor of Pisidian Antioch under the iconoclasts, 19 April; and one of ten martyrs of Egypt the calendar gives in a single sentence, 5 June (read 25 September 2026)',
  'andrei andrew-9-july andrew-the-first-called':
    'the bare «Sfantul Mucenic Andrei» the Romanian calendar prints on 9 July, whose own page on doxologia.ro carries the name and nothing else, against the Apostle, the first called, whom the corpus keeps on the Romanian 30 June with the Synaxis of the Twelve. The source holds them apart itself -- a different rank and a different page -- and there is no life on the July one to read further (read 25 September 2026)',
  'procopie procopius-of-decapolis procopius-of-jerusalem procopius-the-martyr-25-june':
    'three men called Procopie, on three days: the great-martyr and soldier of Aelia, son of Theodosia, Romanian 8 July; the venerable confessor of the Decapolis, 27 February; and the bare «Sfantul Mucenic Procopie» of 25 June, whose page carries the day and no life (read 25 September 2026)',
  'teodosia theodosia-mother-of-procopius theodosia-of-tyre':
    'the wife of the senator Christopher of Aelia, martyred with her son the great-martyr Procopius, Romanian 8 July, against the virgin of Tyre whose life doxologia gives as a quotation from Eusebius, Romanian 29 May (read 25 September 2026)',
  'acachie acacius-of-melitene acacius-of-the-forty-martyrs acacius-the-centurion acacius-the-new-of-neochorion acacius-the-obedient':
    'five men called Acachie, on five days: the obedient monk of John of the Ladder’s fourth step, Romanian 7 July; the bishop of Melitene, 17 April; one of the Forty frozen at Sebaste, 9 March; the centurion under Maximian, 7 May; and the new-martyr of Neochorion in Macedonia, 1 May. Whether the 31 March and 17 April Melitene pages are one man or two is still open, and is recorded in the run’s own notes outside this repo; it does not touch the other four (read 25 September 2026)',
  'chiriachi kyriake-daughter-of-dorotheus kyriake-martyr-19-may':
    'the great-martyr and virgin born to Dorotheus and Eusebia under Diocletian, Romanian 7 July, against the bare «Sfanta Mucenita Chiriachi» of 19 May, whose page prints one sentence naming her companions and nothing else (read 25 September 2026)',
  'arhip archippus-6-july archippus-the-apostle':
    'the bare «Sfantul Mucenic Arhip» the Romanian calendar prints on 6 July, whose own page on doxologia.ro carries the name and nothing else, against the apostle of the Seventy and bishop of Colossae, Romanian 19 February. The source holds them apart itself -- a different rank, Mucenic against Apostol, and a different page -- and there is no life on the July one to read further (read 25 September 2026)',
  'filimon philemon-6-july philemon-of-cyzicus philemon-of-gaza':
    'three men called Filimon, on three days: the bare «Sfantul Mucenic Filimon» of 6 July, whose page carries the name only; the martyr of Cyzicus, Romanian 29 April; and the bishop of Gaza, Romanian 14 February, also a bare line (read 25 September 2026)',
  'marta martha-of-antioch martha-of-aza martha-sister-of-lazarus martha-sister-of-lykarion martha-wife-of-marius':
    'five women called Marta, on five days: the Persian wife of Marius, martyred with her sons Audifax and Abachum at Rome, Romanian 6 July; the mother of Symeon of the Wonderful Mountain, 4 July; one of the five canonical virgins of Aza, 9 June; the sister of Lazarus, 4 June; and the sister of Lykarion, 8 February (read 25 September 2026)',
  'marta martha-of-antioch martha-of-aza martha-sister-of-lazarus martha-sister-of-lykarion':
    'four women called Marta, on four days: the mother of Symeon of the Wonderful Mountain, of Antioch, Romanian 4 July; one of the five canonical virgins of Aza under Shapur, Romanian 9 June and Greek 26 September; the sister of Lazarus, Romanian 4 June, whose page gives three sentences and no life; and the sister of Lykarion, martyred with her sister Mary, Romanian 8 February (read 25 September 2026)',
  'meliton meliton-of-caesarea meliton-of-the-forty-martyrs':
    'the martyr under Trajan at Caesarea in Cappadocia, with Theodotus, Theodota, Diomedes, Eulampius, Peter, Asclepiodotus and Golinduch, Romanian 3 July, against one of the Forty frozen at Sebaste, Romanian 9 March (read 25 September 2026)',
  'iuvenalie juvenal-of-alaska juvenal-of-jerusalem':
    'two men the Romanian calendar keeps on the same 2 July: the patriarch of Jerusalem between 420 and 458, of the Council of Ephesus, and the hieromonk of Valaam martyred in Alaska, born at Ekaterinburg in 1761 (read 25 September 2026)',
  'mihail john-maximovitch michael-of-synada':
    'the archbishop and wonderworker, Romanian 2 July, whose second `ro` form is Mihail because his own life gives that as his baptismal name in honour of the archangel, against the bishop of Synada, Romanian 23 May (read 25 September 2026)',
  'cosma cosmas-of-chalcedon cosmas-of-rome':
    'the unmercenary physician martyred at Rome with his brother Damian, Romanian 1 July, against the hierarch and confessor of Chalcedon, a monk of Constantinople, Romanian 18 April (read 25 September 2026)',
  'damian damian-of-agrafa damian-of-rome damian-the-healer':
    'three men called Damian, on three days: the unmercenary physician martyred at Rome with his brother Cosmas, Romanian 1 July; the new-martyr of Agrafa, of Philotheou on Athos, Romanian 14 February; and the presbyter-healer of the Kyiv Caves under Theodosius, Romanian 5 October (read 25 September 2026)',
  'lavrentie laurence-venerable-10-may leontius-of-radauti':
    'the bishop of Rădăuți in Moldavia, Romanian 1 July, whose own life gives Lavrentie as his monastic name before the schema, against the bare «Sfântul Cuvios Lavrentie» the Romanian calendar prints on 10 May with no life, no country and no century (read 25 September 2026)',
  'teodul theodulus-companion-of-agathopodes theodulus-of-the-forty-martyrs theodulus-of-tripoli':
    'three men called Teodul, on three days: the young reader of Thessalonica who drowned with the deacon Agathopodes under Diocletian, Romanian 5 April; one of the Forty frozen at Sebaste, Romanian 9 March; and the tribune’s friend converted at Tripoli in Phoenicia beside Leontius, Romanian 18 June (read 25 September 2026)',
  'inochentie innocent-of-apollonia innocent-of-moscow':
    'one of the three martyrs of Apollonia, Romanian 17 June, against the metropolitan of Moscow and Kolomna, Russian 23 September, Romanian 31 March, Greek 6 October (read 25 September 2026)',
  'manuil manuel-of-persia maximus-of-kapsokalyvia':
    'one of the three Persian brothers of one mother, Romanian 17 June, against Maximus of Kapsokalyvia, whose second `ro` name form is Manuil because that is the name his own life gives him at baptism; he is kept on 13 January under Maxim (read 25 September 2026)',
  'marcu mark-of-apollonias mark-of-arethusa mark-of-byblos mark-of-ephesus mark-the-ascetic mark-the-evangelist':
    'six men called Marcu, on six days: the hieromartyr bishop of Apollonias, Romanian 16 June; the hieromartyr bishop of Arethusa, Romanian 29 March; the apostle of Byblos, Romanian 27 April and Greek 27 September; the metropolitan of Ephesus, Romanian 19 January; the hermit, Romanian 5 March; and the Evangelist, Romanian 25 April (read 25 September 2026)',
  'tihon tikhon-of-amathus tikhon-of-moscow':
    'the bishop and wonderworker of Amathus in Cyprus, Romanian 16 June, against the patriarch of Moscow, Romanian 7 April (read 25 September 2026)',
  'isihie hesychius-of-durostorum hesychius-of-the-forty-martyrs hesychius-the-senator':
    'three men called Isihie, on three days: the soldier martyred at Durostorum in Moesia Inferior, Romanian 15 June; one of the Forty frozen at Sebaste, Romanian 9 March; and the senator, Romanian 2 March (read 25 September 2026)',
  'metodie methodius-of-constantinople methodius-of-moravia methodius-of-patara':
    'three men called Metodie, on three days: the Sicilian who suffered under Leo the Armenian and afterwards held the throne of Constantinople, Romanian 14 June; the elder brother of Cyril, of Thessalonica, Romanian 11 May; and the bishop of Patara in Lycia, Romanian 20 June (read 25 September 2026)',
  'metodie methodius-of-constantinople methodius-of-moravia':
    'the Sicilian who suffered under Leo the Armenian while Nikephoros held the throne and afterwards held it himself, Romanian 14 June, against the elder brother of Cyril, son of Leo and Maria of Thessalonica, Romanian 11 May (read 25 September 2026)',
  'gavriil gabriel-of-kapsala gabriel-the-martyr-2-february':
    'the hermit of Karyes who lived in the cell of the Dormition at Kapsala, Romanian 11 June, against the bare martyr of 2 February (read 25 September 2026)',
  'luca luke-of-crimea luke-of-emesa':
    'the archbishop, surgeon and confessor of the Crimea, Romanian 11 June, against the deacon of Emesa seized with the bishop Silvanus and the reader Mocius under Numerian in 284, Romanian 29 January (read 25 September 2026)',
  'marcian marcian-of-durostorum marcian-the-emperor':
    'one of the two soldiers of the Danube legions at Durostorum in Moesia Inferior, taken under Diocletian and Galerius after the Persian war of 298, Romanian 8 June, against the emperor the calendar calls righteous, Romanian 17 February (read 25 September 2026)',
  'nicandru nicander-of-durostorum nicander-of-egypt':
    'the soldier taken at Durostorum with Marcian, Romanian 8 June, against one of the ten martyrs of Egypt whom the Romanian 5 June keeps in a single sentence. Two companies and two provinces (read 25 September 2026)',
  'cel ilarion nou hilarion-the-new-of-dalmatou hilarion-the-new-of-pelecete':
    'two abbots both called Ilarion cel Nou, on two days: the son of Peter the Cappadocian who set the bread on the imperial table and of Theodosia, of the monastery of Dalmatou, Romanian 6 June; and the confessor of Pelecete who shut himself in a dark cell for many years, Romanian 28 March. Doxologia keeps them on two days with two lives (read 25 September 2026)',
  'gheorghe george-of-egypt george-of-pisidian-antioch':
    'one of the ten martyrs the Romanian 5 June keeps in a single sentence, tormented by the ruler of Egypt with hunger, thirst and cold, against the bishop and confessor of Pisidian Antioch, Romanian 19 April (read 25 September 2026)',
  'irineu irenaeus-of-egypt irenaeus-of-sirmium':
    'one of the ten of the Romanian 5 June, of whom the page says only that they died of hunger, thirst and cold under the ruler of Egypt, against the hieromartyr bishop of Sirmium, Romanian 6 April and Greek 23 August (read 25 September 2026)',
  'leonid leonidas-of-egypt leonides-father-of-origen':
    'one of the ten of the Romanian 5 June against the father of Origen, Romanian 22 April. The 5 June page gives its man no country beyond Egypt and no century (read 25 September 2026)',
  'marchian marcian-of-constantinople marcian-of-egypt':
    'one of the ten of the Romanian 5 June, a martyr, against the venerable of Constantinople, Romanian 10 January (read 25 September 2026)',
  'maria maria-of-gatchina mary-of-aza mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'five women called Maria, on five days: the venerable new-martyr of Gatchina, Romanian 26 January; one of the five virgins of Aza, Romanian 9 June; the sister of Lazarus, Romanian 4 June; the sister of Lykarion, Romanian 8 February; and the wife of Xenophon, Romanian 26 January. Two martyrs, two venerables and one of the household at Bethany (read 25 September 2026)',
  'marta martha-of-aza martha-sister-of-lazarus martha-sister-of-lykarion':
    'three women called Marta, on three days: one of the five virgins of Aza, Romanian 9 June; the sister of Lazarus, Romanian 4 June; and the sister of Lykarion, Romanian 8 February (read 25 September 2026)',
  'filip philip-of-moscow philippus-of-niculitel':
    'the metropolitan of Moscow, a hierarch and confessor, Romanian 9 January, against one of the four martyrs of Niculițel — Zoticus, Attalus, Camasis and Philippus, named in the Syriac martyrology and that of Jerome and suffering under Diocletian and Maximian — Romanian 4 June (read 25 September 2026)',
  'sofia sophia-of-aenus sophia-of-kleisoura sophia-the-physician':
    'three women called Sofia, on three days: the mother of six children born at Aenus in Rhodope who became a monastic after they died, Romanian 4 June; the ascetic of Kleisoura, Romanian 6 May; and «Sfânta Muceniță Sofia Doctorița» of 22 May, whose page opens no life (read 25 September 2026)',
  'claudie claudius-companion-of-lucillian claudius-of-the-forty-martyrs':
    'one of the four young men imprisoned at Nicomedia whom Lucillian found there and suffered with, under Aurelian, Romanian 3 June, against one of the Forty frozen at Sebaste under Licinius, Romanian 9 March (read 25 September 2026)',
  'dionisie dionysius-companion-of-lucillian dionysius-companion-of-quadratus dionysius-of-athos dionysius-of-lampsacus':
    'four men called Dionisie, on four days: one of the four young men of the prison at Nicomedia whom Lucillian suffered with, Romanian 3 June; the martyr of Corinth taken with Quadratus, Romanian 10 March; the abbot on Athos, Romanian 25 June; and the man killed at Lampsacus beside Peter, Romanian 18 May. Three martyrs and a venerable (read 25 September 2026)',
  'fevronia fevronia-of-murom fevronia-of-sivapol':
    'the princess of Murom, Russian 31 August and Romanian 25 June, against the great-martyr and virgin of Sivapol, Romanian 25 June. Doxologia keeps both on 25 iunie and prints a separate life for each; one is a married princess of Rus and the other a nun under persecution (read 25 September 2026)',
  'procopie procopius-of-decapolis procopius-the-martyr-25-june':
    'the venerable confessor of the Decapolis, Romanian 27 February, against the bare martyr of 25 June (read 25 September 2026)',
  'dionisie dionysius-companion-of-lucillian dionysius-companion-of-quadratus dionysius-of-lampsacus':
    'three men called Dionisie, on three days: one of the four young men of the prison at Nicomedia whom Lucillian suffered with, under Aurelian, Romanian 3 June; the martyr of Corinth taken with Quadratus, Romanian 10 March; and the man killed at Lampsacus beside Peter, Romanian 18 May. Three companies, three cities (read 25 September 2026)',
  'ipatie hypatius-companion-of-lucillian hypatius-of-chalcedon hypatius-of-gangra hypatius-the-tribune':
    'four men called Ipatie, on four days: one of the four young men of the prison at Nicomedia whom Lucillian suffered with, Romanian 3 June; the abbot of Chalcedon, Romanian 25 February; the hieromartyr bishop of Gangra, Romanian 31 March; and the tribune, Romanian 18 June (read 25 September 2026)',
  'leontie leontius-of-the-forty-martyrs leontius-of-tripoli':
    'one of the Forty frozen at Sebaste, Romanian 9 March, against the martyr of Tripoli taken under the senator Hadrian in the days of Vespasian, Romanian 18 June (read 25 September 2026)',
  'teodul theodulus-of-the-forty-martyrs theodulus-of-tripoli':
    'one of the Forty frozen at Sebaste, Romanian 9 March, against one of the company taken with Leontius at Tripoli, Romanian 18 June (read 25 September 2026)',
  'ipatie hypatius-companion-of-lucillian hypatius-of-chalcedon hypatius-of-gangra':
    'three men called Ipatie, on three days: one of the four young men of the prison at Nicomedia whom Lucillian suffered with, under Aurelian, Romanian 3 June; the abbot of Chalcedon, Romanian 25 February; and the hieromartyr bishop of Gangra, Romanian 31 March. A martyr boy, a venerable abbot and a bishop (read 25 September 2026)',
  'matthew matthew-monk-martyr-1918 matthew-the-apostle':
    'the Russian venerable-martyr of 1918, Russian 14 August, against the Evangelist called from the tax booth, Romanian 30 June (read 25 September 2026)',
  'philip philip-martyr-1918 philip-of-heraclea philip-the-apostle':
    'three folders whose English form is the bare Philip: the Russian martyr of 1918, Russian 2 September; the hieromartyr bishop of Heraclea, Serbian 20 August; and the Apostle, Romanian 30 June (read 25 September 2026)',
  'filip philip-of-moscow philip-the-apostle philippus-of-niculitel':
    'three men called Filip, on three days: the metropolitan of Moscow, Romanian 9 January; the Apostle, Romanian 30 June; and one of the four martyrs of Niculițel, Romanian 4 June (read 25 September 2026)',
  'paul paul-bishop-of-nicaea paul-companion-of-lucillian paul-the-apostle':
    'three men called Paul in the English forms: the bishop of Nicaea, Russian and Greek 10 September; one of the four young men of the prison at Nicomedia whom Lucillian suffered with, Romanian 3 June; and the Apostle, Romanian 29 June (read 25 September 2026)',
  'pavel paul-of-jamnia paul-of-plousias paul-of-ptolemais paul-the-apostle paul-with-valentina-and-ennatha platon-kulbusch':
    'six folders whose Romanian form folds to Pavel, on six days: the martyr of Jamnia, Romanian 16 February; the bishop and confessor of Plousias, Romanian 8 March; the martyr of Ptolemais, Russian 17 August and Romanian 4 March; the Apostle, Romanian 29 June; the man kept with Valentina and Ennatha, Romanian 10 February; and platon-kulbusch, the hieromartyr bishop, Romanian 14 January, whose second ro form is Pavel because that is the name his own life gives him at baptism (read 25 September 2026)',
  'peter peter-bishop-of-nicaea peter-of-bathys-ryax peter-of-dabar-bosnia peter-of-moscow peter-the-apostle':
    'five men whose English form is the bare Peter: the bishop of Nicaea, Russian and Greek 10 September; the abbot of Bathys Ryax, Greek 7 September; the hieromartyr of Dabar-Bosnia, Russian and Serbian 4 September; the hierarch of Moscow, Russian and Greek 24 August; and the Apostle, Romanian 29 June (read 25 September 2026)',
  'petru peter-of-lampsacus peter-of-murom peter-of-sebaste peter-the-apostle':
    'four men called Petru, on four days: the young martyr of Lampsacus, Romanian 18 May; the prince of Murom, Romanian 25 June; the bishop of Sebaste, Romanian 9 January; and the Apostle, Romanian 29 June (read 25 September 2026)',
  'paul paul-bishop-of-nicaea paul-companion-of-lucillian':
    'the hierarch and bishop of Nicaea, kept on 10 September by the Russian and the Greek, against one of the four young men imprisoned at Nicomedia whom Lucillian found there and suffered with, under Aurelian, Romanian 3 June (read 25 September 2026)',
  'nichifor nicephorus-4-may nicephorus-of-antioch nicephorus-of-corinth nikephoros-patriarch-of-constantinople':
    'four men called Nichifor, on four days: the bare line of 4 May, a venerable with no life; the martyr of Antioch, Romanian 9 February; one of the seven of Corinth, Romanian 31 January; and the patriarch of Constantinople, son of Theodore and Eudocia, Romanian 2 June. Three martyrs and a hierarch (read 25 September 2026)',
  'agapit agapitus-of-synnada agapitus-of-the-kyiv-caves':
    'the hierarch and bishop of Synnada, Romanian 18 February, against the unmercenary physician of the Lavra of the Caves whom Anthony tonsured, Romanian 1 June (read 25 September 2026)',
  'chariton companion justin chariton-companion-of-justin justin-companion-of-chariton':
    'two of the company seized at Rome before the prefect Rusticus, each named in this corpus as the other’s companion, so the fold is the key sorting their two names into one — the same shape as bassus/eusebius on 20 January (read 25 September 2026)',
  'iustin justin-companion-of-chariton justin-the-philosopher':
    'doxologia prints two lives on 1 iunie and keeps the two men apart itself: Justin the Philosopher, born at Flavia Neapolis in Syria Palestina of a Greek father, and the Justin seized with Chariton, Charito, Euelpistus, Hierax, Paeon and Valerian and tried at Rome before the prefect Rusticus. Two pages, two lives, one day (read 25 September 2026)',
  'valerian valerian-4-may valerian-companion-of-justin valerian-of-tomis valerian-of-trebizond':
    'four men called Valerian: the bare line of the Romanian 4 May, a venerable; one of the company tried at Rome with Justin before Rusticus, Romanian 1 June; the martyr under Licinius kept on 13 September by the Russian, Romanian and Greek; and one of the three of Trebizond, Romanian 21 January. The 4 May line calls its man a venerable and the other three are martyrs (read 25 September 2026)',
  'haralambie charalampus-31-may charalampus-of-magnesia':
    'the bare line of the Romanian 31 May, a martyr whose page opens neither a Viață nor a Tropar tab and gives no country and no century, against the hieromartyr bishop of Magnesia, Romanian 10 February (read 25 September 2026)',
  'eusebiu eusebius-31-may eusebius-companion-of-bassus eusebius-of-samosata':
    'three men called Eusebiu, on three days: the bare line of 31 May, a martyr with no life at all; the martyr the calendar names as the companion of Bassus, dead under Diocletian, Romanian 20 January; and the bishop of Samosata, Romanian 22 June (read 25 September 2026)',
  'eusebiu eusebius-31-may eusebius-companion-of-bassus':
    'the bare line of the Romanian 31 May, a martyr with no life at all, against the martyr the calendar names as the companion of Bassus, dead under Diocletian, Romanian 20 January. Nothing on the 31 May page joins its man to that company (read 25 September 2026)',
  'ermie hermas-31-may hermias-of-comana':
    'doxologia prints two lines of this name on one day, 31 mai, and distinguishes them itself: «Sfântul Apostol Ermie», whose page carries no life, and «Sfântul Mucenic Ermie», the old white-haired soldier found at Comana by the governor Sebastian under Antoninus, whose page carries a life and a hymn. An apostle and a soldier, kept together by the source as two (read 25 September 2026)',
  'varlaam barlaam-30-may varlaam-of-moldavia':
    'the bare line of the Romanian 30 May, a venerable whose page opens neither a Viață nor a Tropar tab and gives no country and no century, against the hierarch of Moldavia who died in 1657, Russian and Romanian 30 August. Three months apart, and nothing on the 30 May page puts its man in Moldavia (read 25 September 2026)',
  'alexandru alexander-companion-of-antonina alexander-of-alexandria alexander-of-cartagena alexander-of-side alexander-of-the-forty-martyrs':
    'five men called Alexandru, on five days: the soldier who changed clothes with Antonina to free her and suffered with her, Romanian 10 June; the archbishop of Alexandria, Romanian 29 May; the martyr of Cartagena, Romanian 25 February; the presbyter of Side under Aurelian, Romanian 14 March; and one of the Forty frozen at Sebaste, Romanian 9 March (read 25 September 2026)',
  'antonina antonina-of-crodamna antonina-of-nicaea':
    'the virgin martyr of Crodamna, Romanian 10 June, against the martyr of Nicaea, Romanian 1 March. Two cities, three months apart (read 25 September 2026)',
  'teofan theophanes-of-antioch theophanes-of-sigriane theophanes-venerable-17-may':
    'three men called Teofan, on three days: the hermit of Antioch, Romanian 10 June; the confessor of Sigriane, Romanian 12 March; and the bare line of 17 May, a venerable with no epithet, no monastery, no country and no century (read 25 September 2026)',
  'timotei timothy-disciple-of-babylas timothy-husband-of-maura timothy-of-ephesus timothy-of-prusa timothy-of-symbola':
    'five men called Timotei, on five days: the disciple of Babylas, Romanian 24 January; the husband of Maura, Romanian 3 May; the apostle of Ephesus, Romanian 22 January; the bishop of Prusa, Romanian 10 June; and the wonderworker of Symbola, Romanian 21 February (read 25 September 2026)',
  'alexandru alexander-of-alexandria alexander-of-cartagena alexander-of-side alexander-of-the-forty-martyrs':
    'four men called Alexandru, on four days: the archbishop of Alexandria, Romanian 29 May, a line the calendar names and whose page carries no life; the martyr of Cartagena, Romanian 25 February; the presbyter of Side who suffered under Aurelian, Romanian 14 March; and one of the Forty frozen at Sebaste under Licinius, Romanian 9 March. One hierarch and three martyrs (read 25 September 2026)',
  'eutihie eutychius-of-constantinople eutychius-of-melitene eutychius-of-the-forty-martyrs':
    'three men called Eutihie, on three days: the patriarch of Constantinople, Romanian 6 April; the hieromartyr bishop of Melitene of 28 May, a line the calendar names and whose page carries no life; and one of the Forty frozen at Sebaste under Licinius, Romanian 9 March (read 25 September 2026)',
  'nichita nicetas-of-chalcedon nikitas-of-nea-moni':
    'the confessor raised to the throne of Chalcedon, Romanian 28 May, against the eleventh-century father of Nea Moni on Chios who struggled in a cave on Mount Provateon, Romanian 20 May. A hierarch and a hermit (read 25 September 2026)',
  'terapont therapon-of-cyprus therapon-of-sardis':
    'the bishop in Cyprus of the Romanian 14 May, whose own life opens by saying almost nothing about him can be told — not his country, not his family, not his age — against the hierarch of Sardis who turned many pagans from idols and was seized by a ruler, Romanian 27 May. Doxologia keeps them on two days with two pages and two hymns; the 14 May page makes no claim that would join them (read 25 September 2026)',
  'alfeu alphaeus-martyr-10-may alphaeus-the-apostle':
    'two bare lines of the Romanian calendar, neither with a life: «Sfântul Mucenic Alfeu» of 10 May, a martyr, and «Sfântul Apostol Alfeu» of 26 May, an apostle. Sixteen days apart, two different ranks, and neither page gives a country or a century (read 25 September 2026)',
  'elena helen-martyr-26-may helen-the-empress':
    'the bare line of the Romanian 26 May, a martyr with no epithet, no city, no country and no century, whose page opens no life, against the mother of Constantine the Great, empress and equal-to-the-apostles, Romanian 21 May (read 25 September 2026)',
  'celestin celestine-martyr-25-may celestine-of-rome':
    'the bare line of the Romanian 25 May, a martyr with no epithet, no city, no country and no century, whose page opens no life, against the hierarch and bishop of Rome, Romanian 8 April. A martyr and a hierarch, six weeks apart (read 25 September 2026)',
  'marciana marciana-martyr-24-may marciana-the-empress':
    'the bare line of the Romanian 24 May, a martyr with no epithet, no city, no country and no century, whose page opens no life, against the empress the calendar calls equal-to-the-apostles, Romanian 27 January (read 25 September 2026)',
  'serapion serapion-martyr-24-may serapion-of-corinth serapion-venerable-21-march':
    'three men called Serapion, on three days: the bare martyr of 24 May, whose page opens no life; one of the seven of Corinth who died in 250, Romanian 31 January; and the bare venerable of 21 March. The 24 May line calls its man a martyr and gives him no city, so nothing puts him at Corinth (read 25 September 2026)',
  'marcel marcellus-of-sicily marcellus-the-martyr-1-march marcellus-the-martyr-22-may':
    'three men called Marcel: the bishop of Sicily, a hieromartyr, Romanian 9 February; the bare line of 1 March, whose page holds one sentence saying he was martyred with Antony; and the bare line of 22 May, whose page opens neither a Viață nor a Tropar tab at all. Two of the three have no life and nothing on either page joins them (read 25 September 2026)',
  'sofia sophia-of-kleisoura sophia-the-physician':
    'the ascetic of Kleisoura, Romanian 6 May, against «Sfânta Muceniță Sofia Doctorița» of 22 May, whose page opens no Viață tab and prints three sentences about her icons. A venerable and a martyr physician, sixteen days apart (read 25 September 2026)',
  'ioan john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-gothia john-of-nea-moni john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'ten men called Ioan, on nine days: the disciple of Gregory the Decapolite and the archbishop of Antioch, both Romanian 18 April; the unmercenary soldier of Edessa, Romanian 31 January; the bishop of Gothia, of the country of the Scythians, Romanian 26 June; the father of Nea Moni on Chios, Romanian 20 May; one of the Forty of Sebaste, Romanian 9 March; the hieromonk of the Old Lavra, Romanian 19 April; the monk of Valaam, Romanian 5 June; the son of Xenophon, Romanian 26 January; and the Theologian, Romanian and Greek 26 September (read 25 September 2026)',
  'ioan john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-nea-moni john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'nine men called Ioan, on eight days: the disciple of Gregory the Decapolite and the archbishop of Antioch, both Romanian 18 April; the unmercenary soldier of Edessa under Diocletian, Romanian 31 January; the eleventh-century father of Nea Moni on Chios, Romanian 20 May; one of the Forty frozen at Sebaste under Licinius, Romanian 9 March; the hieromonk of the Old Lavra, Romanian 19 April; the monk of Valaam born 14 February 1873 at Gubka, Romanian 5 June; the son of Xenophon, Romanian 26 January; and the Theologian and Evangelist, Romanian and Greek 26 September (read 25 September 2026)',
  'elisabeta elizabeth-of-pasarea elizabeth-the-wonderworker':
    'the hermit of Păsărea who died in 2014, Romanian 5 June, against the abbess and wonderworker, Romanian 24 April (read 25 September 2026)',
  'ioan john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-nea-moni john-of-the-forty-martyrs john-of-the-old-lavra john-son-of-xenophon john-the-theologian':
    'eight men called Ioan, on seven days: the disciple of Gregory the Decapolite and the archbishop of Antioch, both Romanian 18 April; the unmercenary soldier of Edessa under Diocletian, Romanian 31 January; the eleventh-century father of Nea Moni on Chios, Romanian 20 May; one of the Forty frozen at Sebaste under Licinius, Romanian 9 March; the hieromonk of the Old Lavra, Romanian 19 April; the son of Xenophon, Romanian 26 January; and the Theologian and Evangelist, Romanian and Greek 26 September (read 25 September 2026)',
  'iosif joseph-of-nea-moni joseph-the-hymnographer joseph-the-merciful':
    'the eleventh-century father of Nea Moni on Chios, Romanian 20 May; the hymnographer dead 883, Romanian 4 April; and the metropolitan called the Merciful, dead 1902, Romanian 26 January. A thousand years across three days (read 25 September 2026)',
  'lidia lydia-of-philippi lydia-wife-of-philetus':
    'the seller of purple at Philippi whom the calendar calls equal-to-the-apostles, Romanian 20 May, against the wife of Philetus martyred with him, Romanian 27 March. Two months apart and two different kinds of saint (read 25 September 2026)',
  'talaleu thalaleus-the-physician thalelaeus-of-gabala':
    'the physician of Phoenicia, son of the hierarch Verouchios, martyred, Romanian 20 May, against the Cilician who went first to the monastery of Saint Sabbas and then to Gabala under the metropolis of Laodicea, a hermit and presbyter, Romanian 27 February. A martyr and a confessor, three months apart (read 25 September 2026)',
  'memnon memnon-the-venerable-19-may memnon-the-wonderworker':
    'the bare line of the Romanian 19 May, a venerable whose page opens neither a Viață nor a Tropar tab and gives no country and no century, against the abbot and wonderworker, Romanian 29 April. Three weeks apart, and nothing on the 19 May page joins them (read 25 September 2026)',
  'alexandra alexandra-of-ancyra alexandra-of-diveevo alexandra-the-empress':
    'three women called Alexandra, on three days: one of the seven virgins of Ancyra, Romanian 18 May; the foundress of the convent at Diveevo, dead 1789, Romanian 13 June; and the empress, wife of Diocletian, Romanian 21 April (read 25 September 2026)',
  'achilina aquilina-of-byblos aquilina-the-martyr-7-april':
    'the girl of Byblos in Palestine, daughter of Eutolmius, Romanian 13 June, against the bare martyr of 7 April, whose page gives no city and no century (read 25 September 2026)',
  'alexandra alexandra-of-ancyra alexandra-the-empress':
    'one of the seven virgins drowned in the lake at Ancyra, read out of the life of Theodotus, Romanian 18 May, against the empress, wife of Diocletian, Romanian 21 April (read 25 September 2026)',
  'eufrasia euphrasia-of-ancyra euphrasia-of-nicomedia':
    'one of the seven virgins of Ancyra, Romanian 18 May, against the virgin martyr of Nicomedia who died under Diocletian, Romanian 19 January. Two cities, four months apart (read 25 September 2026)',
  'matrona matrona-of-ancyra matrona-of-hurezi':
    'one of the seven virgins of Ancyra, Romanian 18 May, against the abbess of Hurezi in Wallachia who died in 1935, Romanian 5 May. Sixteen centuries apart (read 25 September 2026)',
  'dionisie dionysius-companion-of-quadratus dionysius-of-lampsacus':
    'the martyr of Corinth taken with Quadratus, Romanian 10 March, against the man killed at Lampsacus beside Peter, Romanian 18 May. Two cities and two months (read 25 September 2026)',
  'petru peter-of-lampsacus peter-of-sebaste':
    'the young martyr tortured and beheaded at Lampsacus, Romanian 18 May, against the bishop of Sebaste, Romanian 9 January. A martyr and a hierarch (read 25 September 2026)',
  'andronicus companion junia andronicus-the-apostle junia-the-apostle':
    'two apostles of the Seventy whom doxologia keeps together on 17 May, each named in this corpus as the other’s companion, so the fold is the key sorting their two names into one — the same shape as bassus/eusebius on 20 January (read 25 September 2026)',
  'teofan theophanes-of-sigriane theophanes-venerable-17-may':
    'the bare line of the Romanian 17 May, a venerable with no epithet, no monastery, no country and no century, whose page opens no life, against the confessor of Sigriane, Romanian 12 March. Two months apart, and nothing on the 17 May page puts that man at Sigriane (read 25 September 2026)',
  'simeon simeon-martyr-16-may simeon-of-persia symeon-kinsman-of-the-lord symeon-the-god-receiver':
    'four men called Simeon, on four days: the bare line of the Romanian 16 May, a martyr with no epithet, no see, no country and no century, whose page opens no life; the bishop of Persia, Romanian 17 April; the kinsman of the Lord and bishop of Jerusalem, Romanian 27 April; and the elder who received the Lord in the temple, Romanian 3 February. Nothing on the 16 May page joins its man to any of the other three (read 25 September 2026)',
  'eftimie euthymius-of-dimitsana euthymius-of-madytos euthymius-of-vatopedi jacob-of-putna':
    'three men called Eftimie and a fourth name that is not his usual one: the new-martyr of Dimitsana hanged in 1814, Romanian 22 March; the bishop of Madytos, Romanian 5 May; the abbot of Vatopedi taken with twelve monks, Romanian 4 January; and Jacob of Putna, metropolitan of Moldavia, who received the name Eftimie in the great schema five days before his death and is kept on 15 May under his own name (read 25 September 2026)',
  'serghie sergius-martyr-2-january sergius-the-confessor':
    'the bare line of the Romanian 2 January, whose page carries one sentence saying only that the martyr Sergius was cut down with the sword, against the bare line of the Romanian 13 May, whose page opens neither a Viață nor a Tropar tab. One is called a martyr and the other a venerable confessor, and neither page gives a country or a century (read 25 September 2026)',
  'chiril cyril-of-alexandria cyril-of-axiopolis cyril-of-heliopolis cyril-of-jerusalem cyril-of-the-forty-martyrs cyril-the-philosopher':
    'six men called Chiril, on six days: the patriarch of Alexandria dead 446, Romanian 18 January; the martyr of Axiopolis, Romanian 26 April; the deacon of Heliopolis killed under Julian, Romanian 29 March; the archbishop of Jerusalem, Romanian 18 March; one of the Forty frozen at Sebaste under Licinius, Romanian 9 March; and Constantine of Thessalonica, brother of Methodius and teacher of the Slavs, who took the name Cyril with the schema at the end of his life, Romanian 11 May (read 25 September 2026)',
  'constantin constantine-of-georgia constantine-the-great cyril-the-philosopher':
    'three men called Constantin: the prince of Georgia martyred with his brother David in 740, Romanian 2 October; the emperor, son of Constas and Helen, Romanian 21 May; and the Constantine born at Thessalonica to Leo and Maria who is called Cyril the Philosopher, Romanian 11 May, and who bore the name Constantine until he took the schema (read 25 September 2026)',
  'constantin constantine-of-georgia cyril-the-philosopher':
    'the prince of Georgia martyred with his brother David in 740, Romanian 2 October, against the Constantine born at Thessalonica to Leo and Maria who is called Cyril the Philosopher, Romanian 11 May, and who bore the name Constantine until he took the schema. A Georgian prince and a Greek missionary to the Slavs (read 25 September 2026)',
  'mochie mocius-of-amphipolis mocius-of-emesa':
    'the reader of Emesa seized with the bishop Silvanus and the deacon Luke under Numerian in 284, Romanian 29 January, against the presbyter of Amphipolis in Macedonia who broke up the feast of Dionysus under Diocletian, Romanian 11 May. Two cities, two ranks, two days (read 25 September 2026)',
  'ciprian cyprian-companion-of-quadratus cyprian-martyr-10-may':
    'the bare line «Sfântul Mucenic Ciprian» of the Romanian 10 May, whose page opens neither a Viață nor a Tropar tab and gives no country and no century, against the martyr of Corinth taken with Quadratus under Decius and Valerian, Romanian 10 March. Two months apart, and nothing on the 10 May page puts that man at Corinth (read 25 September 2026)',
  'david david-of-gareji david-of-georgia david-of-wales david-the-builder':
    'four men called David: the Syrian father who settled the wilderness of Gareji in Kakheti, a venerable of the late 6th century, Romanian 9 June; the prince of Georgia martyred with Constantine in 740, Romanian 2 October; the bishop of Menevia in Wales, dead about 601, Romanian 1 March; and the king of Georgia called the Builder, dead 1125, Romanian 26 January. A hermit, a prince, a bishop and a king, on four days (read 25 September 2026)',
  'efrem ephraim-of-nea-makri ephraim-of-tomis ephrem-the-syrian':
    'three men called Efrem: the martyr of Nea Makri, born in Greece on 14 September 1384, Romanian 5 May; the second known bishop of Tomis in Pontic Dacia, Romanian 7 March; and the Syrian, Romanian 28 January. Ten centuries across three days (read 25 September 2026)',
  'gaie gaius-5-may gaius-of-the-forty-martyrs':
    'the bare line «Sfântul Mucenic Gaie» of the Romanian 5 May, whose page opens no Viață tab, against one of the Forty frozen on the lake at Sebaste, Romanian 9 March. Nothing on the 5 May page puts him at Sebaste (read 25 September 2026)',
  'neofit neophytus-5-may neophytus-of-nicaea':
    'the bare line «Sfântul Mucenic Neofit» of the Romanian 5 May, with no country and no century, against the martyr born at Nicaea in Bithynia to Theodore and Florentia, Romanian 21 January. Two martyrs, and only one of them has a life (read 25 September 2026)',
  'mavra maura-of-ceahlau maura-wife-of-timothy':
    'the hermit of the mountain of Ceahlău in the Carpathians, which older writers call the Mountain of Pion, against the wife of Timothy brought before Arian the governor of the Thebaid. Doxologia keeps both on 4 May and 3 May respectively and they are a Romanian mountain and an Egyptian persecution apart (read 25 September 2026)',
  'valerian valerian-4-may valerian-of-tomis valerian-of-trebizond':
    'three men called Valerian: the bare line «Sfântul Cuvios Valerian» of the Romanian 4 May, whose page carries only the day and its readings; the martyr under Licinius, friend of Gordian, Seleucus and Macrobius, Romanian 13 September; and the first of the three taken together at Trebizond, Romanian 21 January. The 4 May line calls him a venerable and the other two are martyrs (read 25 September 2026)',
  'diodor diodorus-martyr-3-may diodorus-of-corinth diodorus-the-presbyter':
    'the bare line of the Romanian 3 May, whose page gives no country, no century, no death and no hymn, and whom the calendar sets beside the deacon Rhodopianus without saying they suffered together; against one of the seven of Corinth, Romanian 31 January, whose page is the page of all seven; against the priest who suffered with Chrysanthus and Daria at Rome, Romanian 19 March. Three days; nothing on the 3 May page puts that man at Corinth (read 25 September 2026)',
  'irodion herodion-of-lainici herodion-the-apostle':
    'the Romanian hesychast born Ioan at Bucharest in 1821 and tonsured at Cernica under the elder Calinic, Romanian 3 May, against the apostle of the Seventy, Romanian 8 April. Eighteen centuries apart (read 25 September 2026)',
  'timotei timothy-disciple-of-babylas timothy-husband-of-maura timothy-of-ephesus timothy-of-symbola':
    'four men called Timotei: the disciple of Babylas of Antioch, Romanian 24 January; the husband of Maura, brought before Arian the governor of the Thebaid, Romanian 3 May; the apostle of Ephesus out of Lycaonia, Romanian 22 January; and the monk of Symbola near Mount Olympus, Romanian 21 February. Four days and four lives (read 25 September 2026)',
  'dimitrie demetrius-of-georgia ignatius-brianchaninov':
    'not two saints sharing a forename but one form standing for two people: Ignatius Brianchaninov, Romanian 30 April, was christened Dimitri and the corpus stores that baptismal form beside his monastic one, so it folds onto Demetrius of Georgia, Romanian 16 March. The same shape as Platon Kulbusch and the Pauls below (read 25 September 2026)',
  'filimon philemon-of-cyzicus philemon-of-gaza':
    'one of the nine martyrs of Cyzicus in Lesser Mysia, Romanian 29 April, against the martyr of the Romanian 14 February, whose page carries his name, his day and the day’s readings and no life. Nothing on the February page puts him at Cyzicus (read 25 September 2026)',
  'teodot theodotus-of-cyzicus theodotus-of-kyrenia':
    'another of the nine of Cyzicus, Romanian 29 April, against the bishop of the Cypriot city doxologia’s life page spells Cirene and its calendar line Chirinia, Romanian 2 March. An island see against a company on the Hellespont (read 25 September 2026)',
  'vasilevs basileus-of-amasea basileus-of-cherson':
    'the bishop of Amasea, the metropolis of Pontus, under Licinius, Romanian 26 April, against one of the bishops the patriarch of Jerusalem sent out in the sixteenth year of Diocletian, who was killed at Cherson, Romanian 7 March. Two bishops of one name in two persecutions (read 25 September 2026)',
  'valerie valerius valerius-of-the-forty-martyrs':
    'the martyr of the Romanian 23 April, whose page carries neither a Viață tab nor a Tropar tab and whose line is all the calendar gives, against one of the Forty frozen on the lake at Sebaste under Licinius, Romanian 9 March. A bare line against a named member of a named company, six weeks apart; nothing on the 23 April page puts him at Sebaste (read 25 September 2026)',
  'anastasie sinaitul anastasius-of-antioch anastasius-the-sinaite':
    'both are kept on the Romanian 20 April and both fold onto the same key, and they are two men: the patriarch of Antioch who succeeded Domninus the younger in the thirty-fifth year of Justinian, and the monk of Sinai born at Alexandria in the seventh century. The calendar prints them as two lines on the one day (read 25 September 2026)',
  'atanasie athanasius-of-alexandria athanasius-of-corinth athanasius-of-meteora athanasius-of-the-forty-martyrs athanasius-the-commentarisius athanasius-the-confessor':
    'five men called Atanasie: the archbishop of Alexandria of Nicaea, Romanian 18 January; the founder of Meteora, born 1310, Romanian 20 April; one of the Forty of Sebaste, Romanian 9 March; the prison registrar converted at the torment of Zosimas of Cilicia, Romanian 4 January; and the confessor born at Constantinople, Romanian 22 February. A sixth joins them, the bishop of Corinth of the Romanian 4 May, whose page gives no life. Ten centuries across six days (read 25 September 2026)',
  'ioan john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-the-forty-martyrs john-of-the-old-lavra john-son-of-xenophon john-the-theologian':
    'six men called Ioan, and the fold is bare because the corpus stores the bare forename for each: the disciple of Gregory the Decapolite, Romanian 18 April; the archbishop of Antioch, Romanian 18 April, whose page gives no life; the soldier of Edessa, Romanian 31 January; one of the Forty of Sebaste, Romanian 9 March; the elder son of Xenophon and Mary of Constantinople, Romanian 26 January; and the son of Zebedee, Romanian 26 September. The two on 18 April are the day’s own pair and the calendar prints them as two lines, a monk and a hierarch; a third John of the same day, of Ioannina, does not fold in because his Romanian form carries his city. A seventh joins them, the monk of the Old Lavra of Chariton near Jerusalem, Romanian 19 April (read 25 September 2026)',
  'acachie acacius-of-melitene acacius-of-the-forty-martyrs acacius-the-centurion acacius-the-new-of-neochorion':
    'the bishop of Melitene in Armenia, asked of God by childless parents, Romanian 17 April, against one of the Forty frozen on the lake at Sebaste under Licinius, Romanian 9 March. Armenia and Sebaste are near neighbours and the two men are not. A third joins them, the new martyr born at Neochorion in Macedonia in the eighteenth century and baptised Athanasius, Romanian 1 May. A fourth joins them, the centurion who suffered under Maximian in the third persecution, Romanian 7 May (read 25 September 2026)',
  'simeon simeon-of-persia symeon-kinsman-of-the-lord symeon-the-god-receiver':
    'the bishop of the Persian church under the magi’s persecution, Romanian 17 April, against the elder of the Gospel who awaited the consolation of Israel and received the Lord in the temple, Romanian 3 February. Four centuries and a Testament apart. A third joins them, the kinsman of the Lord and bishop of Jerusalem, Romanian 27 April (read 25 September 2026)',
  'irina irene-of-aquileia irene-of-lesvos irene-of-magedon':
    'the youngest of the three sisters of Aquileia, taken to Macedonia with the Christians of the priest Zoilus, Romanian 16 April, against the twelve-year-old daughter of Basil the headman of Thermi, killed when the Turks put down the rising of 1463 on Lesvos, Romanian 9 April. Eleven centuries and two seas apart. A third joins them, born Penelope to a king Licinius of the city of Magedon, Romanian 5 May (read 25 September 2026)',
  'anastasia basilissa rome anastasia-of-rome-15-april basilissa-of-rome':
    'two women of Rome, disciples of the Apostles, whom doxologia keeps together on 15 April and whose display names each carry the other, so the fold is the key sorting their two names into one. Not one person under two spellings (read 25 September 2026)',
  'trofim trophimus-companion-of-paul trophimus-of-laodicea trophimus-of-nicomedia':
    'three men called Trofim: the companion of the Apostle Paul, whom Paul left sick at Miletus, Romanian 15 April; the martyr taken with Thalus at Laodicea under Diocletian and Maximian and the governor Asclepius, Romanian 11 March; and the soldier of Nicomedia who suffered with Eucarpion under Maximian, Romanian 18 March. One apostolic companion and two martyrs of the same persecution in two different cities (read 25 September 2026)',
  'artemon artemon-of-laodicea artemon-of-seleucia':
    'the presbyter of Laodicea of Diocletian’s persecution, Romanian 13 April, against the bishop of Seleucia in Pisidia, born there in the days of the Apostles and set over the city by the Apostle Paul, Romanian 24 March. Two and a half centuries and two cities apart (read 25 September 2026)',
  'macarie macarius-companion-of-terentius macarius-the-confessor':
    'one of the six the Romanian 10 April names together, «Terentie, Pompie, African, Maxim, Macarie şi Dima», against the confessor of the Romanian 19 February, whose page carries a line, a date and the day’s readings and no life at all. Two days and nothing shared but the forename (read 25 September 2026)',
  'maxim maximus-companion-of-fausta maximus-companion-of-terentius maximus-of-ozovia':
    'the eparch of Maximian who tried Fausta and Evilasius, Romanian 6 February, against one of the forty who refused to sacrifice in Africa under Decius and the governor Fortunatianus, Romanian 10 April. A persecutor turned martyr and a martyr of another persecution, on two days. A third joins them, one of the three of Ozovia who suffered under Diocletian and Maximian when Tarquinius and Gabinius were proconsuls, Romanian 28 April (read 25 September 2026)',
  'nicolae nicholas-of-lesvos nicholas-of-the-forty-martyrs':
    'the young Greek studying in France whom Raphael’s preaching turned, and who died with him and Irene on Lesvos, Romanian 9 April, against one of the Forty frozen on the lake at Sebaste under Licinius, Romanian 9 March. Twelve centuries apart and nothing shared but the forename (read 25 September 2026)',
  'eutihie eutychius-of-constantinople eutychius-of-the-forty-martyrs':
    'the patriarch of Constantinople, from the Phrygian village of Divine, where he later built a church of the Forty Martyrs, Romanian 6 April, against one of those Forty themselves, frozen on the lake at Sebaste under Licinius, Romanian 9 March. The first built a church to the second’s company, which is the whole of the connection (read 25 September 2026)',
  'iosif joseph-the-hymnographer joseph-the-merciful':
    'the hymnographer, born in Sicily of Plotinus and Agatha, Romanian 4 April, against Joseph Naniescu, metropolitan of Moldavia, born at Răzălăi in Soroca in 1818 and christened Ioan, Romanian 26 January. A Byzantine hymn-writer against a nineteenth-century Romanian hierarch (read 25 September 2026)',
  'zosima zosimas-of-cilicia zosimas-of-palestine':
    'the monk of Cilicia whom the governor Domitian tortured and to whose torment a lion came out of the desert, Romanian 4 January, against the monk of the monastery by the Jordan under Theodosius the Younger who found Mary of Egypt and carried her the Communion, Romanian 4 April. Two deserts, two days (read 25 September 2026)',
  'marturisitorul nichita nicetas-of-apollonias nicetas-of-medikion':
    'two confessors of the war on the icons, and doxologia prints both under the same words, «Nichita Mărturisitorul», which is why the fold is exact. The first is the bishop of Apollonias whose life on the page is two sentences long, Romanian 20 March; the second is of Medikion, born at Caesarea of Bithynia, whose father Philaret was tonsured a monk when the mother died on the eighth day after the birth, Romanian 3 April. One generation, one persecution, two men and two days (read 25 September 2026)',
  'aedesius amphianus brother aedesius-brother-of-amphianus amphianus-brother-of-aedesius':
    'two brothers of Lycia, each named in doxologia’s 2 aprilie as the other’s brother, so the fold is the key sorting their two names into one. both were drowned in the sea after torture, Amphianus with a stone tied to him and Aedesius after striking a judge in the face, and the calendar keeps them on the one day (read 25 September 2026)',
  'vlasie blaise-of-amorion blaise-of-sebaste':
    'the monk of Amorion, born Basil at Aplatiani and gone to Constantinople at the beginning of the ninth century, Romanian 31 March, against the bishop of Sebaste of the persecutions, Romanian 11 February. Five centuries and two lives with nothing in common but the name (read 25 September 2026)',
  'ipatie hypatius-of-chalcedon hypatius-of-gangra':
    'the martyr of the Romanian 25 February, whose day page prints «Sfântul Mucenic Ipatie» and whose linked life names him otherwise, against the bishop of Gangra in Paphlagonia who sat among the three hundred and eighteen fathers at Nicaea, Romanian 31 March. A martyr against a council father, on two days (read 25 September 2026)',
  'iona jonah-martyr-29-march jonah-of-moscow':
    'the martyr of the Romanian 29 March, whose page carries no life at all and only the service texts, against the metropolitan of Moscow and All Russia, Romanian 31 March, whose page likewise gives no life. Two bare lines two days apart, a martyr and a Russian hierarch, and the corpus keeps them apart on the calendar’s own words (read 25 September 2026)',
  'chiril cyril-of-alexandria cyril-of-axiopolis cyril-of-heliopolis cyril-of-jerusalem cyril-of-the-forty-martyrs':
    'four men called Chiril: the archbishop of Alexandria born at Mahalla in 378, Romanian 18 January; the archbishop of Jerusalem of Constantius’s reign, Romanian 18 March; one of the Forty of Sebaste under Licinius, Romanian 9 March; and the deacon of Heliopolis whom the pagans of Julian’s reign killed, told by Theodoret in the same notice as Mark of Arethusa, Romanian 29 March. A fifth joins them, one of the three of Axiopolis at Cernavodă on the Danube, Romanian 26 April, whose line the calendar prints bare. Five days, five places, and no two of them one man (read 25 September 2026)',
  'marcu mark-of-arethusa mark-of-ephesus mark-the-ascetic mark-the-evangelist':
    'the bishop of Arethusa of Gregory of Nazianzus’s first oration against Julian, Romanian 29 March; Mark Eugenikos, born Manuel at Constantinople in 1392 and metropolitan of Ephesus, Romanian 19 January; and the ascetic and writer, Romanian 5 March. Eleven centuries between the first and the second. A fourth joins them, the Evangelist, Romanian 25 April (read 25 September 2026)',
  'zaharia zacharias-son-of-barachias zacharias-son-of-carion':
    'the prophet of Israel, of the tribe of Levi, son of Barachias, Romanian 8 February, against the monk of the Egyptian skete whose father Carion left wife and children for the desert and brought the boy with him, Romanian 24 March. A prophet against a desert father, and the forename is all they share (read 25 September 2026)',
  'vasile basil-of-ancyra basil-of-parium basil-of-thessalonica basil-the-confessor':
    'three men called Vasile and nothing else shared: the presbyter of Ancyra in Galatia, tormented under Julian the Apostate, Romanian 22 March; the bishop of Thessalonica, Romanian 1 February; and the monk who stood against Leo the Isaurian in the war on the icons and died a confessor, Romanian 28 February. A fourth joins them: the bishop of Parium in Lesser Mysia, a see under the metropolitan of Cyzicus, Romanian 12 April. Four cities, four days, and the forename is all (read 25 September 2026)',
  'eftimie euthymius-of-dimitsana euthymius-of-madytos euthymius-of-vatopedi':
    'the new martyr born Eleutherius at Dimitsana in the Peloponnese, schooled there and at the Patriarchal Academy and at Iași, Romanian 22 March, against the venerable-martyr of Vatopedi killed with twelve of his brethren, Romanian 4 January, whose page carries no life and no year. A new martyr of the Turkish centuries against a company on Athos. A third joins them, the bishop of Madytos whom the Romanian calendar names by his sister, «fratele Cuvioasei Parascheva de la Iași», Romanian 5 May (read 25 September 2026)',
  'bassus companion eusebius bassus-companion-of-eusebius eusebius-companion-of-bassus':
    'two men, each named in the calendar as the other’s companion, so the fold is the key sorting their two names into one — doxologia’s 20 January prints both and its life has them die together (read 19 September 2026)',
  'valerian valerian-of-tomis valerian-of-trebizond':
    'the martyr of Tomis kept on 13 September with Gordian, Macrobius, Helias and Lucian, against the soldier taken in the mountains above Trebizond with Candidus and Aquila on the Romanian 21 January: another day, another passion, another province (read 19 September 2026)',
  'agapie agapius-disciple-of-babylas agapius-of-caesarea-in-palestine agapius-of-colciu agapius-son-of-eustathius':
    'the boy martyred at Sicily with his teacher Babylas and with Timothy, Romanian 24 January, against the son of Eustathius Placidas roasted with his parents and brother at Rome under Hadrian, kept on 20 September by all four. Two boys, two passions (read 19 September 2026). A third is no martyr at all: the Romanian monk of the Colciu cell on Athos, who lived beside his elder in the second half of the eighteenth century, Romanian 1 March — sixteen centuries from the other two. A fourth is the young man of Caesarea in Palestine thrown to the beasts in the amphitheatre there under Diocletian with Timolaus and Plesius, Romanian 15 March (read 25 September 2026)',
  'timotei timothy-disciple-of-babylas timothy-of-ephesus timothy-of-symbola':
    'the second of Babylas of Sicily’s two disciples, Romanian 24 January, against the apostle and first bishop of Ephesus clubbed to death at the Catagogion, Romanian 22 January. A third joins them on the Romanian 21 February: the venerable of Symbola, the desert place by Mount Olympus whose archimandrite was the venerable Theoctistus. A fourth, of Gaza, is kept on 19 August and folds with none of these (read 24 September 2026)',
  'david david-of-georgia david-of-wales david-the-builder':
    'the prince of Argveti drowned in the Rioni with his brother Constantine in 740, Romanian 2 October, against the king of Georgia who rebuilt the country after the Seljuks and died in 1125, Romanian 26 January. Four centuries apart (read 19 September 2026). The third is neither Georgian nor a layman: the bishop of Menevia in Wales, dead about 601, Romanian 1 March (read 25 September 2026)',
  'alexandru alexander-of-cartagena alexander-of-side alexander-of-the-forty-martyrs':
    'one of the forty soldiers doxologia names for 9 March, drowned in the lake at Sebaste under Licinius, against the martyr of Cartagena of the Romanian 25 February (read 25 September 2026). A third is the presbyter of Side in Pamphylia, seized there by the governor Antoninus under Aurelian, Romanian 14 March: a priest, a province and a day of his own (read 25 September 2026)',
  'atanasie athanasius-of-alexandria athanasius-of-the-forty-martyrs athanasius-the-commentarisius athanasius-the-confessor':
    'three men and nothing shared but the forename: the deacon at Nicaea in 325 who became archbishop of Alexandria; the commentarisius, the officer who kept the prison register when Zosimas of Cilicia was brought in; and the confessor born at Constantinople of devout and very rich parents, Romanian 22 February (read 24 September 2026). A fourth is one of the forty of Sebaste, Romanian 9 March (read 25 September 2026)',
  'chiril cyril-of-alexandria cyril-of-jerusalem cyril-of-the-forty-martyrs':
    'the patriarch of Alexandria, 378 to 446, Romanian 18 January, against one of the forty soldiers of Sebaste, Romanian 9 March. A third is the archbishop of Jerusalem of the Romanian 18 March, the catechist of the Holy City, who is neither of them (read 25 September 2026)',
  'dometian dometian-of-melitene dometian-of-the-forty-martyrs':
    'the venerable bishop of Melitene, Romanian 10 January, against one of the forty soldiers of Sebaste, Romanian 9 March (read 25 September 2026)',
  'candid candidus-of-the-forty-martyrs candidus-of-trebizond':
    'one of the forty soldiers doxologia names by name for 9 March, drowned in the frozen lake at Sebaste under Licinius, against the martyr of Trebizond of the Romanian 21 January, one of the four whose single life doxologia prints for all four. Two companies, two days (read 25 September 2026)',
  'isihie hesychius-of-the-forty-martyrs hesychius-the-senator':
    'one of the forty of Sebaste, 9 March, against the senator thrown into the Orontes with a stone at his neck, Romanian 2 March. A week apart on the same calendar, which is why this one is written down (read 25 September 2026)',
  'valent valens-of-the-forty-martyrs valens-the-deacon':
    'one of the forty of Sebaste, 9 March, against the deacon of the Romanian 16 February (read 25 September 2026)',
  'pavel paul-of-jamnia paul-of-plousias paul-of-ptolemais paul-with-valentina-and-ennatha platon-kulbusch':
    'five men and the largest fold the Romanian year has thrown up, four of them read apart by their day and their company and the fifth not called Pavel at all. The bishop of Plousias in Bithynia, the city that was Kieros, banished in the iconoclast persecution at the turn of the ninth century, Romanian 8 March. The martyr of Jamnia, Romanian 16 February. The brother of Juliana, of Ptolemais in Phoenicia under Aurelian, Russian 17 August and Romanian 4 March. The martyr the Romanian 10 February keeps with Valentina and Ennatha. And Platon Kulbusch, first bishop of Estonia, shot in 1919, who folds in only because his life records «primind la botez numele Pavel» and the corpus stored that baptismal name as a form (read 25 September 2026)',
  'roman roman-the-venerable romanus-martyr-16-march':
    'the Serbian monastic of 16 August, whom the corpus holds on that calendar alone, against the martyr of the Romanian 16 March, one of the thin lines of that day. Different calendar, different month, different rank (read 25 September 2026)',
  'trofim trophimus-of-laodicea trophimus-of-nicomedia':
    'the martyr of Laodicea whom doxologia keeps on 11 March with Thalus, against the martyr of Nicomedia kept on 18 March with Eucarpion. Seven days apart on one calendar, two cities and two companions (read 25 September 2026)',
  'claudiu claudius-husband-of-hilaria claudius-of-corinth':
    'the martyr of Corinth whom the Romanian 31 January keeps with Diodorus and the rest, against the tribune of the Romanian 19 March, to whom the prefect handed Chrysanthus over to be forced to sacrifice, and who believed with his wife Hilaria and his household. A Corinthian passion against a Roman one, and the same fold repeats one name lower with Diodorus (read 25 September 2026)',
  'diodor diodorus-of-corinth diodorus-the-presbyter':
    'the martyr of Corinth of the Romanian 31 January against the presbyter of the Romanian 19 March, the priest who suffered with Chrysanthus and Daria at Rome, at the cave by the pit on the Salarian way where the Christians kept their day. The two folds are the same two days and the same two companies (read 25 September 2026)',
  'serapion serapion-of-corinth serapion-venerable-21-march':
    'the martyr whom the Romanian 31 January keeps at Corinth against the venerable of the Romanian 21 March, of whom doxologia prints «Sfantul Cuvios Serapion», the day and nothing else — no Viata tab, no Tropar tab. A martyr against a cuvios, and two months apart (read 25 September 2026)',
  'toma thomas-of-constantinople thomas-the-apostle':
    'the apostle against the patriarch of Constantinople of the Romanian 21 March, who was made deacon of the Great Church by John the Faster and came to the throne after Cyriacus. Nothing shared but the name (read 25 September 2026)',
  'conon conon-of-isauria conon-the-gardener':
    'two martyrs of one name on one day, which is the fold hardest to part and the one doxologia parts itself: «Sfantul Mucenic Conon din Isauria», son of Nestor and Nada of the village Vidania, baptised by the Archangel Michael in the generation the apostle Paul preached to Isauria, against «Sfantul Mucenic Conon Gradinarul», of Nazareth by descent, who kept a garden at Carmila outside Mandon in Pamphylia and was taken under Decius by the governor Publius. Two lines on the 5 March page, two epithets, two lives, two centuries (read 25 September 2026)',
  'evloghie eulogius-of-alexandria eulogius-of-palestine':
    'the patriarch of Alexandria, Romanian 13 February, against the martyr of the Romanian 5 March who was born of unbelieving parents, gave his whole inheritance to the poor and went through Palestine as a beggar. A throne against a beggar. A third, the bishop of Edessa kept on 25 August, folds with neither (read 25 September 2026)',
  'marcu mark-of-ephesus mark-the-ascetic':
    'the metropolitan of Ephesus who refused Florence, born 1392 and dead 23 June 1444, Romanian 19 January, against the hermit and writer of the Romanian 5 March whom doxologia dates not at all and describes only by his labour and his books. A see and a fifteenth century against a desert and no year (read 25 September 2026)',
  'nestor nestor-of-maghid nestor-the-martyr-2-march':
    'two thin entries and the temptation to fold them is exactly why this fold is written down. doxologia keeps «Sfantul Sfintit Mucenic Nestor, Episcop de Maghid» on 28 February and «Sfantul Mucenic Nestor», with no see and no rank above martyr, on 2 March; the two lines point at two different pages on the site, and neither page carries a Viata or a Tropar tab, so a bishop and a martyr on two days is the whole of what the source says and all that either folder claims. A third Nestor, the one the Greek calendar names with the brothers of Gaza on 21 September, folds with neither (read 25 September 2026)',
  'antonie anthony-of-constantinople antony-the-martyr-1-march':
    'the patriarch of Constantinople who had been an abbot, Romanian 12 February, against the martyr of the Romanian 1 March, of whom doxologia says one thing only — that he was thrown into the fire — and gives neither year nor country, which is why his slug carries his day and his display name stays bare (read 25 September 2026)',
  'domnina domnina-of-antioch domnina-the-ascetic':
    'the martyr of Antioch who went into the river with her daughters Berenice and Prosdoce rather than be taken, Romanian and Greek 4 October, against the venerable woman of the Romanian 1 March who lived out her life in a hut of straw by her mother’s garden. A passion against an asceticism, and the epithet on the second is there to keep them apart (read 25 September 2026)',
  'marcellus marcellus-of-apamea marcellus-the-martyr-1-march':
    'the bishop of Apamea who pulled down the temples of his diocese and was burnt for it about 389, kept on 14 August, against the martyr of the Romanian 1 March, one of a pair doxologia dismisses in a sentence: thrown into the fire, no see, no year (read 25 September 2026)',
  'marcel marcellus-of-sicily marcellus-the-martyr-1-march':
    'the same 1 March martyr against the bishop of Sicily of the Romanian 9 February. The Romanian calendar writes both names «Marcel», so this fold and the «marcellus» one above are the same man met twice through two spellings (read 25 September 2026)',
  'ioan john-of-edessa john-of-the-forty-martyrs john-son-of-xenophon john-the-theologian':
    'three men called Ioan and nothing else shared: the soldier of Edessa who left the army under Diocletian and suffered at Alexandria with Cyrus, Romanian 31 January; the elder of Xenophon’s two sons, Romanian 26 January; and the apostle and evangelist (read 19 September 2026). A fourth is one of the forty soldiers doxologia names for 9 March, drowned in the lake at Sebaste under Licinius (read 25 September 2026)',
  'maria maria-of-gatchina mary-sister-of-lykarion mary-wife-of-xenophon':
    'a third Maria joins the two of the Romanian 26 January: the virgin of Asia who with her sister Martha called out to a pagan governor from their door that they were Christians and was hung on a cross beside her and run through with a sword, sister of the child martyr Lykarion, Romanian 8 February. Her passion, her province and her day are all her own (read 24 September 2026). And, as before, the nun of Gatchina, paralysed, taken from her bed by the Cheka and dead in prison about 1930, against the wife of the nobleman Xenophon of Constantinople, who took the habit at Jerusalem with her husband and whose years doxologia gives not at all. Both fall on the Romanian 26 January, so the date scan cannot part them and the reading has to (read 19 September 2026)',
  'eustatie eustathius-of-antioch eustathius-the-great-martyr':
    'the archbishop who took the throne of Antioch after Philogonius, Romanian 21 February, against Placidas, the distinguished officer at Rome who was called Eustathius after his baptism, kept on 20 September. A see against a soldier (read 24 September 2026)',
  'vasile basil-of-thessalonica basil-the-confessor':
    'the monk of Athens tonsured in 875 by Euthymius the New, whose disciple he was, against the confessor who lived under Leo the Isaurian, the fighter against the icons, and suffered for them with Procopius of the Decapolis, Romanian 28 February. A century and a half, and opposite sides of the iconoclast quarrel (read 24 September 2026)',
  'leon leo-of-catania leo-the-great':
    'the pope of Rome, of Italy by race and son of Quintian, Romanian 18 February, against the bishop of Catania born in the metropolis of Ravenna, Romanian 20 February. Two days apart on the same calendar, which is what makes the fold worth stopping on, and two lives that share nothing but the name (read 24 September 2026)',
  'evghenie eugene-of-cherson eugene-of-trebizond eugenius-the-confessor':
    'the last of four men taken at Trebizond under Diocletian and Maximian, whose one life doxologia prints for all four on 21 ianuarie, against the confessor of the Romanian 19 February, for whom doxologia prints no life at all — only «Sfântul Cuvios Mărturisitor Evghenie», the date and the day’s readings. A martyr against a confessor, and two days (read 24 September 2026). A third is one of the seven bishops sent to Cherson, killed in the city with Elpidius and Agathodorus, Romanian 7 March: a see, a company and a day none of the other two share (read 25 September 2026)',
  'agatodor agathodorus-of-cherson agathodorus-the-martyr-2-february':
    'one of the seven bishops of Cherson, stoned in the city with Basileus, Eugene and Elpidius, Romanian 7 March, against the martyr the Romanian 2 February keeps with Gavriil and Iordan, of whom doxologia prints a line, the date and the day’s readings and nothing else — no see, no company, no country. Thin is not the same as unidentified: the ranks and the days are both the source’s (read 25 September 2026)',
  'efrem ephraim-of-tomis ephrem-the-syrian':
    'the bishop of Tomis killed in 304 on the Scythian shore, Romanian 7 March, against the deacon and hymnographer of Edessa, venerable and not a martyr, Romanian 28 January (read 25 September 2026)',
  'hermogenes hermogenes-of-moscow hermogenes-of-tobolsk':
    'the patriarch of Moscow born at Kazan about 1530, archimandrite of the Transfiguration there from 1582, consecrated bishop on 13 May 1589 and dead on 17 February 1612, against the bishop of Tobolsk born 25 April 1858 and killed in 1918. Three centuries, two sees, and each folder takes its years from its own page (read 24 September 2026)',
  'damian damian-of-agrafa damian-the-healer':
    'the monk of the Kyiv Caves Lavra whose guide was Theodosius of the Caves, Romanian 5 October, against the man born at Mirihovo in the district of Agrafa who entered Philotheou on Athos and went on to a hermitage, Romanian 14 February. Two monasteries, two countries, two days (read 24 September 2026)',
  'silvestru silvester-of-omsk sylvester-of-rome':
    'the bishop of old Rome brought up under the presbyter Quirinus and known for taking in strangers, Romanian 2 January, against the archbishop of Omsk whose whole entry on doxologia is one sentence: two months of torments, a red-hot dagger driven into his heart in 1920, and a glorification in 1998. Sixteen centuries (read 24 September 2026)',
  'meletie meletius-of-antioch meletius-the-confessor':
    'the archbishop of Antioch the Great, exiled by the Arians to Armenia and dead while a council at Constantinople was still sitting, Romanian 12 February, against the monk of the Black Sea country born about 1209, who was tonsured on Sinai and died in 1286, Romanian 19 January. Nine centuries, and the corpus already holds six other men of the name that this fold does not reach (read 24 September 2026)',
  'pavel paul-of-jamnia paul-with-valentina-and-ennatha platon-kulbusch':
    'Platon Kulbusch, the first bishop of Estonia, was christened Paul at Pootsi in 1869, and the corpus stores that baptismal form beside his monastic one. A third Pavel joins them: the third of the twelve who suffered at Caesarea in Palestine under Diocletian, of the town of Jamnia, Romanian 16 February. The second is the third of the three the governor Firmilian sentenced at Caesarea, beheaded after Ennatha and Valentina went to the fire, Romanian 10 February. A baptismal name against a martyr’s, and sixteen centuries between them (read 24 September 2026)',
  'nichifor nicephorus-4-may nicephorus-of-antioch nicephorus-of-corinth':
    'the townsman of Antioch the Great who begged the priest Sapricius on his way to the sword not to deny Christ and, when he denied him anyway, asked the executioners to cut him down in his place and was beheaded on the ninth day of February, against one of the seven men of Corinth seized under Decius in 250 whose page doxologia prints under each of their names, Romanian 31 January. Two cities, two persecutions, two days. A third joins them, «Sfântul Cuvios Nichifor» of the Romanian 4 May, a bare line whose page opens no Viață tab — a venerable, where the other two are martyrs (read 25 September 2026)',
  'iacob jacob-the-hermit james-of-nisibis james-of-samosata james-son-of-zebedee':
    'three men called Iacob and nothing else shared: the hermit of the Romanian 28 January, fifteen years in a cave and then a murder and the rest of his life in a tomb; the bishop of Nisibis who fasted on the mountains, 13 January; and one of the seven of Samosata hung up with iron nails driven through their heads, Romanian 29 January, whose page gives no year and no emperor. A fourth joins them, the son of Zebedee, Romanian 30 April (read 25 September 2026)',
  'arsenie arsenios-of-paros arsenius-of-corfu':
    'the schoolmaster of Paros, born at Ioannina in 1800 and reposed on Paros in 1877, Romanian 31 January, against the archbishop of Corfu who died in 953 and is kept on the Romanian 19 January. Nine centuries (read 19 September 2026)',
  'victor victor-of-corinth victor-presbyter-martyr-1918':
    'one of the seven of Corinth whose page doxologia prints under each of their names, Romanian 31 January, against the Russian priest killed in 1918. The forename is all (read 19 September 2026)',
  'iulian julian-of-emesa julian-of-samosata':
    'the physician of Emesa who encouraged Silvanus, Luke and Mocius on their way to the beasts and was himself nailed through the head, hands and feet in 312, Romanian 6 February, against one of the seven of Samosata, Romanian 29 January. A third Iulian, the presbyter of Ancyra, is kept on 12 September (read 19 September 2026)',
  'clement clement-apostle-of-sardis clement-of-ancyra':
    'one of the Seventy, kept on 10 September by the Russian, Greek and Serbian, against the bishop of Ancyra the Romanian keeps on 23 January — twenty-eight years of torments and a death at the altar. Two men (read 19 September 2026)',
  'teoctist theoctistus-of-kucumia theoctistus-the-martyr':
    'the abbot of Kucumia in Sicily, Romanian 4 January, against the martyr by the sword the Greek and Romanian keep on 3 October; doxologia’s own page for 4 January is a note saying which Theoctistus the day is not (read 19 September 2026)',
};
const foldKey = (key, slugs) => [key, ...[...slugs].sort()].join(' ');

const collisions = [...folded].filter(([, slugs]) => slugs.length > 1);
const fresh = collisions.filter(([, slugs]) => slugs.some((s) => !batchSlugs || batchSlugs.has(s)));
const unread = fresh.filter(([key, slugs]) => !READ_FOLDS[foldKey(key, slugs)]);
console.log(`name forms two or more folders share : ${collisions.length}`);
for (const [key, slugs] of fresh) {
  const read = READ_FOLDS[foldKey(key, slugs)];
  console.log(`  ${read ? '·' : '?'} "${key}" — ${slugs.join(', ')}${read ? `\n      read: ${read}` : ''}`);
}
if (BATCH && unread.length) fail('duplicates', `${unread.length} folded name form(s) shared with the batch — read each pair`);

/* ---- 4. the naming contract ---------------------------------------------- */

console.log('\n— names ————————————————————————————————————————————');
/*
 * The bug this section was written for, and which it found: the Romanian name
 * days printed «Sfântul Cuvios Mărturisitor Sofian de la Antim» as
 * *Mărturisitor* and «Sfânta Împărăteasă Pulheria» as *Împărăteasă*, because
 * `stripPrefixes` in `lib/saint-name.js` runs a list of known ranks and stops
 * at the first word it does not know. English was right on both. A rank that
 * reaches the reader as a name is invisible to every other check in this repo,
 * so it is checked here on the corpus's own data by asking the build's own
 * function what it would print and looking at the first word. Eighteen forms
 * were fixed on 2026-09-11; the list below is what is left, and each is left
 * knowingly.
 *
 * **This check under-reported by four and the vocabulary is why.** It named
 * fourteen forms while the corpus held eighteen, and the four it walked past
 * were not subtle: three Romanian ranks missing from the list below (*Martir*,
 * *Mare Muceniță*) or spelled with the other Romanian t — «Muceniţă» has the
 * cedilla ţ and the class here had only the comma-below ț — and the Serbian
 * abbreviation «Свешт. муч.», which four forms carried past the whole strip
 * list and past this regex too. A checker written from the rows that prompted
 * it sees the rows that prompted it.
 */
const RANK_HEAD = {
  ru: /^(преподобн|священномученик|мученик|мучениц|святител|благоверн|праведн|блаженн|исповедник|пророк|апостол|великомученик|новомученик|архиеп|епископ|митрополит|патриарх|игумен|архимандрит|иеромонах|монах|князь|царь|царица|император)/i,
  ro: /^(sf[âa]nt|cuvios|cuvioas|mucenic|muceni[țţt]|martir|mare|ierarh|m[ăa]rturisitor|m[ăa]rturisitoare|prooroc|proroc|apostol|drept|fericit|[îi]mp[ăa]rat|[îi]mp[ăa]r[ăa]teas|voievod|domnitor|episcop|arhiepiscop|mitropolit|patriarh|preot|diacon|monah|ieromonah|arhimandrit|stare[țţt]|principe|prin[țţt]|regin|rege)/i,
  el: /^(άγι|αγί|όσι|οσί|ιερομάρτυ|οσιομάρτυ|μεγαλομάρτυ|νεομάρτυ|μάρτυ|προφήτ|απόστολ|δίκαι|ομολογητ|επίσκοπ|αρχιεπίσκοπ|μητροπολίτ|πατριάρχ|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|βασιλ|αυτοκράτ)/i,
  sr: /^(свет|свешт|преподобн|свештеномученик|мученик|мученица|праведн|блажен|исповедник|пророк|апостол|великомученик|епископ|архиепископ|митрополит|патријарх|игуман|архимандрит|јеромонах|монах|кнез|цар|царица|краљ)/i,
};
/*
 * **Two shapes where a rank at the head is the right answer**, and both are
 * held out here rather than papered over in the strip list.
 *
 * A saint whose *English* name is a company is named by the rank: the Russian
 * for "The Monk-martyrs of Belogorsk" is «Преподобномученики Белогорские» and
 * there is no other name to print. `saint-name.js` already reads the display
 * name the same way for its two company rules, and this reads the same
 * function so the two cannot drift apart.
 *
 * And a rank word can *be* a name. «Άγιος Όσιος επίσκοπος Κορδούης» is
 * Hosius of Córdoba, whose name is the Greek for *Venerable*; Βασίλισσα and
 * Πάπας are two more. What tells them apart is the office behind them,
 * the same discriminator `saint-name.js` uses to leave the word standing, so
 * the exemption is stated in the same terms rather than as a list of slugs.
 */
const OFFICE_AFTER = {
  ru: /^(митрополит|архиепископ|епископ|патриарх|архимандрит|игумен|княз|цар|император)/i,
  el: /^(αρχιεπίσκοπ|επίσκοπ|μητροπολίτ|πατριάρχ|πρεσβύτερ|ηγούμεν|αρχιμανδρίτ|βασιλ|αυτοκράτ|πάπ)/i,
  ro: /^(arhiepiscop|mitropolit|episcop|patriarh|arhimandrit|egumen|rege|regin|[îi]mp[ăa]rat|voievod|pap)/i,
  sr: /^(архиепископ|митрополит|епископ|патријарх|архимандрит|игуман|краљ|кнез|цар|пап)/i,
};
let rankInName = 0;
let rankIsTheName = 0;
for (const { slug, saint } of corpus) {
  const forms = pickNameForms(saint.names, saint.display_name);
  const company = englishNamesMany(saint.display_name);
  for (const [lang, form] of Object.entries(forms)) {
    const words = String(form).split(/[\s ]+/);
    const head = words[0] ?? '';
    if (!RANK_HEAD[lang]?.test(head)) continue;
    const inNameSlot = words.length > 1 && OFFICE_AFTER[lang]?.test(words[1]);
    if (company || inNameSlot) {
      rankIsTheName += 1;
      if (inBatch({ slug }) || !BATCH) {
        const why = company ? 'the saint is a company, so the rank is the name' : 'an office follows, so the head is the name';
        console.log(`  · ${slug} ${lang}: «${form}» — ${why}`);
      }
      continue;
    }
    rankInName += 1;
    if (inBatch({ slug }) || !BATCH) console.log(`  ! ${slug} ${lang}: the printed name begins "${head}" — a rank, not a name`);
  }
}
console.log(`name forms where the rank is the name  : ${rankIsTheName}`);
console.log(`name forms whose first word is a rank : ${rankInName}`);
if (BATCH && rankInName) notes.push('a rank reaching the reader as a name is a defect in lib/saint-name.js\'s strip list, not in the folder — fix the list, in its own commit');

/* ---- 5. citations -------------------------------------------------------- */

console.log('\n— citations ————————————————————————————————————————');
let missingSource = 0;
let missingLifeLine = 0;
const urls = new Set();
for (const entry of corpus) {
  const { slug, saint, life } = entry;
  for (const att of saint.attestations ?? []) {
    if (att.status === 'undocumented') continue;
    if (!att.source?.url) {
      missingSource += 1;
      if (inBatch(entry)) console.log(`  ! ${slug} ${att.church}: ${att.status} with no source url`);
    } else if (inBatch(entry)) urls.add(att.source.url);
  }
  const last = String(life ?? '').trim().split(/\n\s*\n/).pop() ?? '';
  if (!/^\*After .+\*$/s.test(last.trim())) {
    missingLifeLine += 1;
    if (inBatch(entry) && batchSlugs) console.log(`  ! ${slug}: the life does not close with a source line`);
  }
  for (const m of last.matchAll(/\((https?:\/\/[^)\s]+)\)/g)) if (inBatch(entry)) urls.add(m[1]);
}
console.log(`attestations claiming a status with no source url : ${missingSource}`);
console.log(`lives with no closing source line                 : ${missingLifeLine} (6 predate the rule)`);
if (missingSource) fail('citations', `${missingSource} sourceless claim(s)`);

if (has('--online')) {
  console.log(`\nchecking ${urls.size} citation url(s) resolve…`);
  let dead = 0;
  for (const url of urls) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(url, { method: 'GET', headers: { 'user-agent': 'Mozilla/5.0 (agios-corpus link check)' } });
      if (!res.ok) {
        dead += 1;
        console.log(`  ! ${res.status}  ${url}`);
      }
    } catch (e) {
      dead += 1;
      console.log(`  ! ${e.message}  ${url}`);
    }
  }
  console.log(`dead citation links : ${dead}`);
  if (dead) fail('citations', `${dead} citation url(s) do not resolve`);
}

/* ---- 6. the calendars ---------------------------------------------------- */

console.log('\n— calendars ————————————————————————————————————————');
let wrongCalendar = 0;
for (const entry of corpus) {
  for (const att of entry.saint.attestations ?? []) {
    if (!att.feast || att.feast.calendar === 'paschal') continue;
    if (att.feast.calendar !== calendarOf(att.church) && !att.feast.note) {
      wrongCalendar += 1;
      if (inBatch(entry)) console.log(`  ! ${entry.slug} ${att.church}: ${att.feast.calendar} where the church keeps ${calendarOf(att.church)}`);
    }
  }
}
console.log(`feasts on a calendar the church does not keep, unexplained : ${wrongCalendar}`);
if (wrongCalendar) fail('calendars', `${wrongCalendar} feast(s) on the wrong calendar`);

/* ---- 7. what goes red when the corpus grows ------------------------------ */

/*
 * Not a check. These are the numbers `e2e/` writes as literals, computed from
 * the folders. `STRUCTURE.md` section 5 says tests must not name instances and 85
 * hard-coded slugs and dates are still in the specs; until they are derived,
 * **a batch that moves one of these has to move the literal in the same
 * commit** or `main` goes red seventeen minutes after the push.
 */
console.log('\n— what the e2e specs hard-code ————————————————————');

const cards = corpus.map(({ saint }) => saint);
const venerated = Object.fromEntries(
  CHURCH_IDS.map((c) => [c, cards.filter((s) => (s.attestations ?? []).some((a) => a.church === c && a.status === 'venerated')).length]),
);
const iv = (s) => ({
  birth: makeInterval(s.dates?.birth),
  death: makeInterval(s.dates?.death),
  floruit: makeInterval(s.dates?.floruit),
});
const spanOf = (s) => {
  const d = iv(s);
  const lo = d.birth.earliest ?? d.floruit.earliest ?? d.death.earliest;
  const hi = d.death.latest ?? d.floruit.latest ?? d.birth.latest;
  return lo === null || lo === undefined || hi === null || hi === undefined ? null : { earliest: lo, latest: hi };
};
const dated = cards.map((s) => ({ slug: s.slug, span: spanOf(s), types: s.types ?? [] }));
const overlapsRange = (from, to) => dated.filter((d) => d.span && overlaps(d.span, from, to)).length;
const withinRange = (from, to) => dated.filter((d) => d.span && within(d.span, from, to)).length;
const undated = cards.filter((s) => primaryCentury(s.dates ?? {}) === null).length;
const januaryOwn = cards.filter((s) =>
  (s.attestations ?? []).some((a) => a.status === 'venerated' && a.feast && a.feast.calendar !== 'paschal' && a.feast.month === 1),
).length;
/*
 * The search index is `name` *and* `types`, not `types` alone — Dorotheus the
 * Hermit of Egypt is typed `venerable` and is the tenth hit. Counting the type
 * on its own gave 9 against the spec's 10 and would have read as the spec
 * being stale when it was this arithmetic that was.
 */
const hermits = cards.filter((s) => [s.display_name ?? '', ...(s.names ?? []).map((n) => n.form), ...(s.types ?? [])].some((t) => /hermit/i.test(t))).length;

let reach = null;
let gap = 0;
for (let i = 0; i < 460; i += 1) {
  const d = new Date(Date.UTC(2026, 7, 1) + i * 86400000).toISOString().slice(0, 10);
  const total = CHURCH_IDS.reduce((n, c) => n + onCivilDay(index, c, d).length, 0);
  if (total > 0) {
    reach = d;
    gap = 0;
  } else if (++gap > 14 && reach) break;
}

const EXPECTED = [
  ['e2e/index-controls.spec.js:317     a feast in the church\'s own January', januaryOwn, '138'],
];
for (const [where, now, literal] of EXPECTED) {
  const moved = String(now) !== literal;
  console.log(`  ${moved ? '!' : '·'} ${where.padEnd(52)} now ${String(now).padEnd(12)} spec says ${literal}`);
  if (moved) fail('e2e literals', `${where} — the spec still says ${literal}, the corpus now says ${now}`);
}
console.log(`  · corpus total (e2e reads META.total)                 now ${corpus.length}`);
console.log(`  · 240–460 overlaps (e2e reads countInRange)          now ${overlapsRange(240, 460)}`);
console.log(`  · 240–460 within   (e2e reads countInRange)          now ${withinRange(240, 460)}`);
console.log(`  · undated tray     (e2e reads undatedCount)          now ${undated}`);
/*
 * The empty-range test reads `emptyRange()` from the manifest: the widest run of
 * years no dated life touches with dated lives on both sides. Printed, and red
 * only when no such run is left, which is the test losing its premise.
 */
{
  let best = null;
  let start = null;
  let seen = false;
  for (let y = -3000; y <= new Date().getFullYear(); y++) {
    if (overlapsRange(y, y) === 0) { if (seen && start === null) start = y; continue; }
    if (start !== null && (!best || y - 1 - start > best[1] - best[0])) best = [start, y - 1];
    start = null;
    seen = true;
  }
  console.log(`  · empty range    (e2e reads emptyRange)            now ${best ? best.join('–') : 'none'}`);
  if (!best) fail('e2e literals', 'no year range inside the corpus is untouched; the empty-range test has no premise');
}
console.log(`  · type "hermit"    (e2e reads carryingWord)          now ${hermits}`);
/*
 * Read, not held: daily-panel's reach sentence works the reach out from the
 * manifest itself (2026-09-16), so this is a figure to look at, not a literal
 * a batch has to move. It is every church summed from 1 August, where the
 * page walks one church from today, so the two need not agree.
 */
console.log(`  · corpus runway, all churches (no spec holds it)     now ${reach}`);
for (const [c, n] of Object.entries(venerated)) console.log(`  · venerated ${c.padEnd(9)} (e2e reads META.by_church)     now ${n}`);

/* ---- verdict ------------------------------------------------------------- */

console.log('\n———————————————————————————————————————————————————');
for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  console.log(`\nGATE RED — ${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  console.log('\nDo not commit. Fix, or `node scripts/draft-saint.mjs --undo <batch> --write`.');
  process.exit(1);
}
console.log('\nGATE GREEN. Still to do by hand before the push:');
console.log('  - read every new folder against the source page it cites');
console.log('  - `npm run build && npm run test:e2e` if any literal above moved');
console.log('  - one back-out, watched to fail (docs/CORPUS.md, "The back-out")');
