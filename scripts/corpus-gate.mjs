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
