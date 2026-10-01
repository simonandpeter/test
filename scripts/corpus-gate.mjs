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
  'μιχαηλ boris-michael-of-bulgaria macarius-notaras methodius-of-moravia michael-companion-of-platon-of-reval michael-maleinos michael-mavroeidis michael-nephew-of-theodore-of-edessa michael-of-cyprus-of-samothrace michael-of-georgia michael-of-klops michael-of-murom michael-of-synada michael-of-ulumbo michael-of-vourla michael-parekheli michael-the-russian-1-april michael-the-wonderworker':
    'Seventeen now. The new one is Michael, the nephew of Theodore of Edessa, on 19 July, whom the dupscan raised against the folder of Theodore himself — an uncle and a nephew the same page names, not one man drafted twice. The others are read in the el-05-27 entry for this name form.',
  'παισιοσ paisius-8-january paisius-fool-for-christ-of-kyiv paisius-moskot paisius-of-galich paisius-of-the-caves-lavra paisius-the-great':
    'Six now. The new one is Paisius of the Caves Lavra on 19 July; the others are read in the el-05-22 entry for this name form, with Paisius the Great on 19 June.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-cyrene theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-rostov-and-suzdal theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-the-twelve-tribunes theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-sabbaite-of-edessa theodore-the-silent theodore-trichinas theodore-yaroslavich':
    'Thirty-one now. The new one is Theodore the Sabbaite of Edessa on 19 July; the others are read in the el-07-04 entry for this name form.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-derkoi gregory-of-moesia gregory-of-nicomedia gregory-of-novgorod gregory-of-nyssa gregory-of-panidos gregory-of-rostov gregory-of-sinai gregory-the-dialogist gregory-the-elder gregory-the-hesychast-of-athos gregory-the-recluse-of-the-caves gregory-the-teacher gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius gregory-v-of-constantinople':
    'Nineteen now. The new one is Gregory of Panidos on 19 July; the others are read in the el-06-02 entry for this name form.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-ii-of-constantinople stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-makhrishche stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-rhegium stephen-of-tomsk stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-the-great stephen-the-presbyter-7-june stephen-the-sabbaite stephen-xylinites':
    'Twenty-three now. The new one is Stephen II of Amasea, archbishop of Constantinople, dead 928 — not Stephen of Constantinople, the patriarch of 867 to 893 whom the Greek keeps on 18 May, which the near-slug scan raised. The others are read in the el-07-14 entry for this name form.',
  'παμβω pambo-the-recluse pamvo-of-nitria':
    'Two men on one day, and the page says so itself: it keeps «δύο Παμβώ» on 18 July — Pamvo of Nitria, the Egyptian the corpus already kept and this batch upgraded, and «Όσιος Παμβώ ο Έγκλειστος», the recluse taken captive by the Tatars who died in 1241. A thousand years and two countries apart on one line.',
  'μαρων maron-companion-of-dasius maron-the-hermit':
    'Two men: Maron the Hermit, whom the Greek and Romanian keep on 14 February, and Maron the companion of Dasius on 18 July.',
  'μαρκελλοσ marcellus-18-july marcellus-of-sicily marcellus-of-the-twelve-tribunes marcellus-the-martyr-1-march':
    'Four now. The new one is the Marcellus of 18 July; the others are read in the el-05-24 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-basilides john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-companion-of-tarasius john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-chalcedon john-of-chaldia john-of-edessa john-of-gothia john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-moscow john-of-nea-moni john-of-peking john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-tobolsk john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-anna-of-larissa john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-new-of-suceava john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-soldier-12-june john-the-wallachian john-timonov john-with-minas-and-david':
    'Sixty-seven now. The new one is John metropolitan of Chalcedon on 18 July, whom the page names with Stephen II; the others are read in the el-07-03 entry for this name form.',
  'companion dasius maron dasius-companion-of-maron maron-companion-of-dasius':
    'Not one man drafted twice: Dasius and Maron are the two the 18 July page names together, and each folder is surnamed for the other, which is what folds their display names.',
  'βαρλααμ barlaam-30-may barlaam-of-sikisk barlaam-of-vazsky barlaam-the-anchorite':
    'Four now. The new one is Barlaam the Anchorite on 18 July; the others are read in the el-06-18 entry for this name form.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-christianoupolis athanasius-of-corinth athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-paros athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-athonite athanasius-the-confessor athanasius-the-pentaschoinites athanasius-the-reader athanasius-the-roman-senator athanasius-the-wonderworker':
    'Eighteen now. The new one is Athanasius the Roman senator on 18 July; the others are read in the el-07-10 entry for this name form.',
  'φωτιοσ photius-companion-of-cyril photius-of-akapniou photius-of-constantinople photius-of-kyiv photius-of-the-alamanoi photius-of-yuriev':
    'Six now. The new one is Photius, one of the nine Alamanoi of 18 July; the others are read in the el-07-09 entry for this name form.',
  'παφνουτιοσ paphnutius-of-borovsk paphnutius-of-the-alamanoi paphnutius-the-recluse-of-the-kyiv-caves':
    'Three men: Paphnutius of Borovsk on 1 May, Paphnutius the recluse of the Kyiv Caves on 15 February, and Paphnutius one of the nine Alamanoi on 18 July.',
  'ονησιφοροσ onesiphorus-of-anarita onesiphorus-of-colophon onesiphorus-of-the-alamanoi':
    'Three now. The new one is Onesiphorus, one of the nine Alamanoi of 18 July; the others are read in the el-07-13 entry for this name form.',
  'κυριακοσ cyriacus-attendant-of-faustus cyriacus-brother-of-orentius cyriacus-of-eurychou cyriacus-son-of-hesperus cyriacus-the-executioner cyriacus-the-infant cyril-of-thessalonica':
    'Seven now. The new one is Cyriacus the Executioner on 16 July; the others are read in the el-07-06 entry for this name form, where the fold gained a member who is not a Cyriacus at all.',
  'αναστασιοσ anastasius-8-january anastasius-of-antioch anastasius-of-brescia anastasius-of-nauplion anastasius-of-thessalonica anastasius-patriarch-of-jerusalem anastasius-the-furrier anastasius-the-sinaite':
    'Eight now. The new one is Anastasius of Thessalonica on 16 July; the others are read in the el-07-08 entry for this name form.',
  'θεοφραστοσ theophrastus-companion-of-terentius theophrastus-disciple-of-athenogenes':
    'Two men: Theophrastus the companion of Terentius on 10 April and Theophrastus, one of the ten disciples of Athenogenes, on 16 July.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-athenogenes peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-martyr-2-june peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-gortyna peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-murom peter-of-sebaste peter-of-sinope peter-of-tobolsk peter-ordynsky-of-rostov peter-son-of-john-of-syracuse peter-the-apostle peter-the-athonite peter-the-egyptian peter-the-gaoler peter-the-patrician peter-the-peloponnesian peter-the-sign-bearer':
    'The new one is Peter, one of the ten disciples of Athenogenes on 16 July; the rest of the fold is read in the el-07-14 entry for this name form.',
  'μαξιμινοσ maximinus-disciple-of-athenogenes maximinus-of-trier':
    'Two men: Maximinus of Trier on 29 May and Maximinus, one of the ten disciples of Athenogenes, on 16 July.',
  'ησυχιοσ hesychius-companion-of-asklepiodote hesychius-companion-of-peregrinus hesychius-confessor-10-may hesychius-disciple-of-athenogenes hesychius-of-jerusalem hesychius-of-the-forty-martyrs hesychius-the-senator hesychius-the-sinaite':
    'Eight now. The new one is Hesychius, one of the ten disciples of Athenogenes on 16 July; the others are read in the el-07-07 entry for this name form.',
  'κλεονικοσ cleonicus-disciple-of-athenogenes cleonicus-of-cappadocia':
    'Two men: Cleonicus of Cappadocia on 3 March and Cleonicus, one of the ten disciples of Athenogenes, on 16 July.',
  'αθηνογενησ athenogenes-disciple-of-athenogenes athenogenes-of-pedachthoe':
    'Two men of one name on one day, which the page itself makes plain: Athenogenes of Pedachthoe, upgraded here, and the Athenogenes among the ten disciples it names after him.',
  'αντιοχοσ antiochus-disciple-of-athenogenes antiochus-of-ramas antiochus-the-physician antiochus-the-tribune':
    'Four now, and two stand on 16 July: Antiochus the physician, whom this batch upgraded, and Antiochus one of the ten disciples Athenogenes leads. Two entries on one day, so two men. The others are read in the el-07-08 entry for this name form.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-makhrishche stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-rhegium stephen-of-tomsk stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-the-great stephen-the-presbyter-7-june stephen-the-sabbaite stephen-xylinites':
    'Twenty-two now. The new one is Stephen of Makhrishche on 14 July; the others are read in the el-07-05 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-martyr-2-june peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-gortyna peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-murom peter-of-sebaste peter-of-sinope peter-of-tobolsk peter-ordynsky-of-rostov peter-son-of-john-of-syracuse peter-the-apostle peter-the-athonite peter-the-egyptian peter-the-gaoler peter-the-patrician peter-the-peloponnesian peter-the-sign-bearer':
    'The new one is Peter of Gortyna on 14 July; the rest of the fold is read in the el-07-01 entry for this name form.',
  'ονησιμοσ onesimus-10-may onesimus-6-july onesimus-of-soissons onesimus-the-apostle onesimus-the-wonderworker':
    'Five now. The new one is Onesimus the Wonderworker on 14 July, eight days after the Onesimus of 6 July; the others are read in the el-07-06 entry for this name form.',
  'ιλαριοσ hilarion-4-may hilarius-companion-of-aquila hilary-companion-of-proclus hilary-of-carcassonne hilary-of-poitiers':
    'Five now. The new one is Hilarius, the companion of Aquila on 14 July; the others are read in the el-06-02 entry for this name form.',
  'ηρακλειοσ heraclius-14-july heraclius-of-athens heraclius-of-the-forty-martyrs':
    'Three now. The new one is the Heraclius of 14 July; the others are read in the el-05-17 entry for this name form.',
  'αρσενιοσ arsenios-of-paros arsenios-the-hagiopharangite arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-georgia arsenius-of-ikalto arsenius-of-konevits arsenius-of-novgorod arsenius-of-rostov arsenius-of-the-kyiv-caves arsenius-of-varnakova arsenius-of-veroia arsenius-the-great':
    'Fifteen now. The new one is Arsenios the Hagiopharangite on 14 July; the others are read in the el-06-12 entry for this name form.',
  'ακυλασ aquila aquila-14-july aquila-of-trebizond aquila-the-eparch':
    'Four now. The new one is the Aquila of 14 July, who stands with Hilarius; the others are read in the el-03-20 entry for this name form.',
  'ονησιφοροσ onesiphorus-of-anarita onesiphorus-of-colophon':
    'Two men: Onesiphorus of Colophon, the Apostle every calendar keeps, and Onesiphorus of Anarita in Cyprus on 13 July.',
  'σεραπιων serapion-disciple-of-cronides serapion-martyr-24-may serapion-of-alexandria serapion-of-pentapolis serapion-the-new serapion-venerable-21-march':
    'Six now. The new one is Serapion the New on 12 July; the others are read in the el-03-26 entry for this name form, with the martyr of 24 May.',
  'νικοδημοσ nicodemus-of-elbasan nicodemus-of-lake-kozha nicodemus-of-serbia nicodemus-of-the-cave nicodemus-of-vatopedi':
    'Five now, and two are new on 11 July: Nicodemus of Vatopedi and Nicodemus of Elbasan. The others are read in the el-07-03 entry for this name form.',
  'μαρκιανοσ marcian-11-july marcian-companion-of-peter marcian-of-constantinople marcian-of-cyrrhus marcian-of-durostorum marcian-of-egypt marcian-the-emperor':
    'Seven now. The new one is the Marcian of 11 July; the others are read in the el-03-26 entry for this name form.',
  'κινδεοσ kindeos-of-pamphylia kindeos-of-pisidia':
    'Two men, and the pair is close enough to be worth the sentence: Kindeos of Pisidia, a bishop the Greek keeps on 20 February, and Kindeos of Pamphylia, a presbyter on 11 July. Two days, two ranks, two entries.',
  'κυριλλοσ cyril-alfanov cyril-bishop-in-africa cyril-companion-of-photius cyril-ii-of-rostov cyril-of-alexandria cyril-of-astrakhan cyril-of-gortyna cyril-of-heliopolis cyril-of-jerusalem cyril-of-kantara cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-thessalonica cyril-of-turov cyril-of-zographou cyril-the-new-of-paros cyril-the-philosopher cyril-vi-of-constantinople':
    'Nineteen now. The new one is Cyril the New of Paros on 11 July; the others are read in the el-07-06 entry for this name form.',
  'παρθενιοσ parthenius-martyr-1-april parthenius-of-kiev parthenius-of-koudoumas parthenius-of-lampsacus parthenius-of-zographou parthenius-the-third':
    'Six now. The new one is Parthenius of Koudoumas on 10 July, who stands with Eumenius of Koudoumas; the others are read in the el-04-01 entry for this name form.',
  'ευμενιοσ eumenios-saridakis eumenius-of-koudoumas eumenius-of-murmansk':
    'Three now. The new one is Eumenius of Koudoumas on 10 July, who is **not** Eumenius of Gortyna though the Greek line calls both «εν Γορτύνη» — the reader read the two pages and said so. The others are read in the el-06-04 entry for this name form.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-christianoupolis athanasius-of-corinth athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-paros athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-athonite athanasius-the-confessor athanasius-the-pentaschoinites athanasius-the-reader athanasius-the-wonderworker':
    'Seventeen now. The new one is Athanasius the Pentaschoinites on 10 July; the others are read in the el-06-23 entry for this name form.',
  'φωτιοσ photius-companion-of-cyril photius-of-akapniou photius-of-constantinople photius-of-kyiv photius-of-yuriev':
    'Five now. The new one is Photius of Akapniou on 9 July; the others are read in the el-03-05 entry for this name form, with Photius of Kyiv, whom the Russian keeps on 16 September and the Greek on 2 July.',
  'σαββασ sabbas-companion-of-jonah sabbas-martyr-8-july sabbas-of-daphnousia sabbas-of-sicily sabbas-of-sourozh sabbas-of-stagira sabbas-of-the-kyiv-caves sabbas-of-tver sabbas-of-zographou sabbas-stratelates sabbas-the-spiritual sabbas-the-vatopedine sava-brancovici-of-transylvania sava-of-serbia sava-the-second':
    'Fifteen now. The new one is the Sabbas of 8 July; the others are read in the el-06-14 entry for this name form.',
  'προκοπιοσ procopius-of-decapolis procopius-of-jerusalem procopius-of-ustyug procopius-of-usya procopius-the-martyr-25-june':
    'Five now, and three of them stand on 8 July: Procopius of Jerusalem, whose day this is and whom this batch upgraded, and Procopius of Ustyug and Procopius of Usya, two Russian fools for Christ the Greek page names on the same day. Three entries, three men. Decapolis on 27 February and the martyr of 25 June are the others.',
  'αντιοχοσ antiochus-of-ramas antiochus-the-tribune':
    'Two men: Antiochus of Ramas on 23 February and Antiochus the Tribune on 8 July.',
  'αναστασιοσ anastasius-8-january anastasius-of-antioch anastasius-of-brescia anastasius-of-nauplion anastasius-patriarch-of-jerusalem anastasius-the-furrier anastasius-the-sinaite':
    'Seven now. The new one is Anastasius the Furrier on 8 July; the others are read in the el-05-20 entry for this name form.',
  'σατορνινοσ satorninus-7-may satorninus-companion-of-peregrinus saturninus-companion-of-plotinus saturninus-of-corfu saturninus-son-of-juliana':
    'Five now. The new one is Satorninus, one of the seven of Peregrinus on 7 July; the others are read in the el-06-21 entry for this name form.',
  'πομπηιοσ pompeius-companion-of-peregrinus pompeius-companion-of-terentius':
    'Two men: Pompeius the companion of Terentius on 10 April and Pompeius, one of the seven of Peregrinus on 7 July.',
  'πολυκαρποσ polycarp-of-alexandria polycarp-of-bryansk polycarp-of-smyrna polycarp-the-new polycarp-venerable-8-february':
    'Five now. The new one is Polycarp the New on 7 July; the others are read in the el-04-02 entry for this name form.',
  'περεγρινοσ peregrinus-of-apollonia peregrinus-of-dyrrachium':
    'Two men: Peregrinus of Apollonia on 17 June and Peregrinus of Dyrrachium, who heads the company of seven on 7 July.',
  'παππιασ papias pappias-companion-of-peregrinus':
    'Two men: Papias, whom the Greek and Romanian keep on 28 June, and Pappias, one of the seven of Peregrinus on 7 July.',
  'λουκιανοσ lucian-fedotov lucian-of-tomis lucianus-companion-of-peregrinus':
    'Three men. The new one is Lucianus, one of the seven of Peregrinus on 7 July; the others are read in the el-05-19 entry for this name form.',
  'ησυχιοσ hesychius-companion-of-asklepiodote hesychius-companion-of-peregrinus hesychius-confessor-10-may hesychius-of-jerusalem hesychius-of-the-forty-martyrs hesychius-the-senator hesychius-the-sinaite':
    'Seven now. The new one is Hesychius, one of the seven of Peregrinus on 7 July; the others are read in the el-03-28 entry for this name form.',
  'γερμανοσ germanos-of-stolobnoe germanus-companion-of-peregrinus germanus-of-constantinople germanus-of-dobrogea germanus-of-kantara germanus-of-novgorod germanus-of-sagmata germanus-of-valaam':
    'Eight now. The new one is Germanus, one of the seven Peregrinus leads on 7 July; the others are read in the el-06-28 entry for this name form.',
  'ευσταθιοσ eustathius-hieromartyr-7-july eustathius-i-archbishop-of-serbia eustathius-of-antioch eustathius-of-kios eustathius-of-vilnius eustathius-the-roman':
    'Six now. The new one is the hieromartyr Eustathius of 7 July; the others are read in the el-01-04 entry for this name form.',
  'βλασιοσ blaise-of-amorion blaise-of-sebaste blaise-the-cowherd blasios-of-akarnania blasius-22-february':
    'Five now. The new one is Blasios of Akarnania on 7 July; the others are read in the el-02-22 entry for this name form.',
  'απολλωνιοσ apollonius-companion-of-proclus apollonius-martyr-6-july apollonius-of-brescia apollonius-of-the-twenty-four-martyrs apollonius-the-anchorite':
    'Five now. The new one is Apollonius of Brescia on 7 July; the others are read in the el-07-06 entry for this name form.',
  'βικτωρ victor-20-april victor-26-february victor-of-glazov victor-of-the-twenty-four-martyrs victor-of-thessalonica victor-yavorsky':
    'Six now. The new one is Victor of the Twenty-four Martyrs on 6 July; the others are read in the el-05-19 entry for this name form.',
  'σισωησ sisoes-the-great sisoes-the-russian':
    'Two men on one day, which is why they are two: Sisoes the Great, whom the corpus already kept and this batch upgraded on 6 July, and Sisoes the Russian, new on the same page and the same line.',
  'σατυροσ satyrus-companion-of-perpetua satyrus-of-the-twenty-four-martyrs':
    'Two men: Satyrus the companion of Perpetua on 1 February and Satyrus of the Twenty-four Martyrs on 6 July.',
  'ονησιμοσ onesimus-10-may onesimus-6-july onesimus-of-soissons onesimus-the-apostle':
    'Four now. The new one is the Onesimus of 6 July; the others are read in the el-05-13 entry for this name form.',
  'επιμαχοσ epimachus-9-may epimachus-martyr-6-july':
    'Two men: the Epimachus of 9 May and the Epimachus of 6 July.',
  'κυριλλοσ cyril-alfanov cyril-bishop-in-africa cyril-companion-of-photius cyril-ii-of-rostov cyril-of-alexandria cyril-of-astrakhan cyril-of-gortyna cyril-of-heliopolis cyril-of-jerusalem cyril-of-kantara cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-thessalonica cyril-of-turov cyril-of-zographou cyril-the-philosopher cyril-vi-of-constantinople':
    'Eighteen now. The new one is Cyril of Thessalonica on 6 July; the others are read in the el-05-20 entry for this name form.',
  'κυριακοσ cyriacus-attendant-of-faustus cyriacus-brother-of-orentius cyriacus-of-eurychou cyriacus-son-of-hesperus cyriacus-the-infant cyril-of-thessalonica':
    'Six now, and the new member is not a Cyriacus at all: Cyril of Thessalonica folds here because the folded form of his name meets theirs. The five Cyriaci are read in the el-06-25 entry for this name form.',
  'βασιλειοσ basil-companion-of-euphrasius basil-companion-of-isaurus basil-kadomsky basil-martyr-6-february basil-martyr-6-july basil-of-ancyra basil-of-bathys-ryax basil-of-braga basil-of-chernigov basil-of-georgia basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-ryazan basil-of-thessalonica basil-of-yaroslavl basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Twenty-four now. The new one is the Basil of 6 July; the others are read in the el-07-03 entry for this name form.',
  'διων dion dion-of-the-twenty-four-martyrs':
    'Two men: the Dion of 8 March and Dion of the Twenty-four Martyrs on 6 July.',
  'διοδωροσ diodorus-martyr-3-may diodorus-of-corinth diodorus-of-emesa diodorus-of-the-twenty-four-martyrs diodorus-the-presbyter':
    'Five now. The new one is Diodorus of the Twenty-four Martyrs on 6 July; the others are read in the el-06-12 entry for this name form.',
  'απολλωνιοσ apollonius-companion-of-proclus apollonius-martyr-6-july apollonius-of-the-twenty-four-martyrs apollonius-the-anchorite':
    'Four now, and two are new on 6 July: the Apollonius the day page names on his own line and Apollonius of the Twenty-four Martyrs, who is in the enumerated company — two entries on one day, so two men. The others are read in the el-02-14 entry for this name form.',
  'αντωνινοσ antoninus-20-april antoninus-of-ramas antoninus-of-scythopolis antoninus-of-the-twenty-four-martyrs':
    'Four now. The new one is Antoninus, one of the Twenty-four Martyrs the 6 July page enumerates; the others are read in the el-05-03 entry for this name form.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-rhegium stephen-of-tomsk stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-the-great stephen-the-presbyter-7-june stephen-xylinites':
    'Twenty now. The new one is Stephen of Rhegium on 5 July; the others are read in the el-06-30 entry for this name form.',
  'θεοφιλοσ theophilus-hieromartyr-4-july theophilus-martyr-6-february theophilus-of-brescia theophilus-of-caesarea theophilus-of-crete theophilus-of-rome theophilus-of-the-forty-martyrs theophilus-the-deacon-of-libya theophilus-the-new':
    'Nine now. The new one is the hieromartyr Theophilus of 4 July; the others are read in the el-04-27 entry for this name form.',
  'θεοδοτοσ theodotus-1-january theodotus-3-july theodotus-companion-of-asklepiodote theodotus-martyr-4-july theodotus-of-ancyra theodotus-of-cyzicus theodotus-of-kyrenia theodotus-of-marcianopolis theodotus-of-the-monastery-of-publius':
    'Nine now. The new one is the Theodotus of 4 July, a day after the Theodotus of 3 July — two days, two entries, two men; the others are read in the el-07-03 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-cyrene theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-rostov-and-suzdal theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-the-twelve-tribunes theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas theodore-yaroslavich':
    'Thirty now. The new one is Theodore of Cyrene on 4 July; the others are read in the el-06-08 entry for this name form.',
  'λουκια loukia-companion-of-kyprilla lucia-the-widow-of-rome':
    'Two women: Lucia the widow of Rome on 17 September and Loukia, the companion of Kyprilla, on 4 July.',
  'ιωνασ jonah-bishop-6-june jonah-martyr-29-march jonah-of-kyiv jonah-of-moscow jonah-of-odessa jonah-of-pesonsa jonah-of-the-lavra-of-pskov jonah-the-athonite jonas-of-great-perm jonas-the-lerian':
    'Ten now. The new one is Jonah the Athonite on 4 July; the others are read in the el-06-14 entry for this name form.',
  'ιλαριων hilarion-6-may hilarion-companion-of-donatus hilarion-of-pokrovskoe hilarion-of-zographou hilarion-the-new-of-cyprus hilarion-the-new-of-dalmatou hilarion-the-new-of-georgia hilarion-the-new-of-pelecete hilarion-zhukov':
    'The new one is Hilarion, the companion of Donatus on 4 July; the rest of the fold is read in the el-05-19 entry for this name form.',
  'δονατοσ donatus-23-april donatus-6-may donatus-bishop-4-july donatus-martyr-at-venice donatus-of-euroea':
    'Five now. The new one is the Donatus of 4 July, the bishop whose company Hilarion stands in; the others are read in the el-05-05 entry for this name form.',
  'νικοδημοσ nicodemus-of-lake-kozha nicodemus-of-serbia nicodemus-of-the-cave':
    'Three now. The new one is Nicodemus of Lake Kozha on 3 July; the others are read in the el-05-11 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-basilides john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-companion-of-tarasius john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-chaldia john-of-edessa john-of-gothia john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-moscow john-of-nea-moni john-of-peking john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-tobolsk john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-anna-of-larissa john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-new-of-suceava john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-soldier-12-june john-the-wallachian john-timonov john-with-minas-and-david':
    'Sixty-six now. The new one is John of Moscow on 3 July, whose `types` are empty because the page prints no rank for him; the others are read in the el-06-12 entry for this name form.',
  'ηλιοδωροσ heliodorus-companion-of-mark-the-shepherd heliodorus-of-africa heliodorus-of-altinum':
    'Three now. The new one is Heliodorus of Altinum on 3 July; the others are read in the el-05-05 entry for this name form.',
  'βασιλειοσ basil-companion-of-euphrasius basil-companion-of-isaurus basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-bathys-ryax basil-of-braga basil-of-chernigov basil-of-georgia basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-ryazan basil-of-thessalonica basil-of-yaroslavl basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Twenty-three now, and two are new on 3 July: Basil of Ryazan and Basil of Yaroslavl. The others are read in the el-07-01 entry for this name form.',
  'ανατολιοσ anatolius-in-the-cave anatolius-of-odessa anatolius-of-optina-25-january anatolius-of-raithu anatolius-patriarch-of-constantinople anatolius-the-general':
    'Six now, and two of them stand on 3 July: Anatolius in the Cave, new here, and Anatolius patriarch of Constantinople, whom this batch upgraded on the day the Romanian already kept him. The others are read in the el-04-23 entry for this name form.',
  'θεοδοτοσ theodotus-1-january theodotus-3-july theodotus-companion-of-asklepiodote theodotus-of-ancyra theodotus-of-cyzicus theodotus-of-kyrenia theodotus-of-marcianopolis theodotus-of-the-monastery-of-publius':
    'Eight now. The new one is the Theodotus of 3 July; the others, including the Marcianopolis pair still open, are read in the el-02-19 entry for this name form.',
  'θεοδοτη theodote-companion-of-theodotus theodote-daughter-of-athanasia theodote-martyr-712 theodote-mother-of-the-unmercenaries theodote-of-ancyra':
    'Five now, and two of them are new on 3 July: Theodote the companion of Theodotus, and the Theodote martyred in 712, who are two entries on one day and so two women. The others are read in the el-05-17 entry for this name form.',
  'μαρκοσ mark-companion-of-mokianos mark-martyr-8-june mark-of-apollonias mark-of-arethusa mark-of-byblos mark-of-chios mark-of-kantara mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-hermit-20-may mark-the-shepherd':
    'Fourteen now. The new one is Mark, the companion of Mokianos on 3 July; the others are read in the el-06-08 entry for this name form.',
  'ιωακειμ joachim-of-chersonesos joachim-of-novgorod joachim-of-petra joachim-of-tarnovo joachim-papoulakis joachim-the-new-of-notena joachim-the-righteous':
    'Seven now. The new one is Joachim the New of Notena on 3 July; the others are read in the el-06-23 entry for this name form.',
  'γερασιμοσ gerasimos-of-karpenisi gerasimus-1-june gerasimus-of-astrakhan gerasimus-of-boltinsk gerasimus-of-crete gerasimus-of-great-perm gerasimus-of-kantara gerasimus-of-rethymno gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Eleven now. The new one is Gerasimos of Karpenisi on 3 July; the others are read in the el-06-24 entry for this name form.',
  'γεωργιοσ george-bozic george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-krene george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-pisidian-antioch george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-shenkursk george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-cypriot george-the-hungarian george-the-iberian george-the-iberian-2-january george-the-new-martyr-of-sofia george-the-persian george-the-sinaite george-the-trophy-bearer gerasimos-of-karpenisi':
    'The new member is Gerasimos of Karpenisi, whose own names carry a Γεώργιος and so fold him here as well as under Γεράσιμος; he is one man in two folds, not two men. The rest is read in the el-06-25 entry for this name form.',
  'ευλαμπιοσ eulampius-martyr-3-july eulampius-martyr-5-march':
    'Two men: the Eulampius of 5 March and the Eulampius of 3 July.',
  'διομηδησ diomedes-martyr-3-july diomedes-martyr-9-june':
    'Two men: the Diomedes of 9 June and the Diomedes of 3 July.',
  'παυλοσ paul-28-june paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-anthimus paul-companion-of-lucillian paul-companion-of-quadratus paul-companion-of-reverianus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-ioannina paul-of-jamnia paul-of-kaiouma paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-apostle paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'The new one is Paul, one of the company Anthimus the Elder heads on 2 July; the rest of the fold is read in the el-06-28 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-martyr-2-june peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-murom peter-of-sebaste peter-of-sinope peter-of-tobolsk peter-ordynsky-of-rostov peter-son-of-john-of-syracuse peter-the-apostle peter-the-athonite peter-the-egyptian peter-the-gaoler peter-the-patrician peter-the-peloponnesian peter-the-sign-bearer':
    'The new one is Peter the Patrician on 1 July; the rest of the fold is read in the el-06-30 entry for this name form.',
  'λεων leo-companion-of-gervasius leo-companion-of-manuel leo-of-catania leo-of-methone leo-of-nicaea leo-of-patara leo-of-samos leo-the-great leo-the-hermit':
    'Nine now. The new one is Leo the Hermit on 1 July; the others are read in the el-05-11 entry for this name form.',
  'βασιλειοσ basil-companion-of-euphrasius basil-companion-of-isaurus basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-bathys-ryax basil-of-braga basil-of-chernigov basil-of-georgia basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Twenty-one now. The new one is Basil of Bathys Ryax on 1 July; the others are read in the el-06-17 entry for this name form.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-tomsk stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-the-presbyter-7-june stephen-xylinites':
    'Eighteen now. The new one is Stephen of Tomsk on 30 June, whose `types` are empty because the page prints no rank for him; the others are read in the el-06-06 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-martyr-2-june peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-murom peter-of-sebaste peter-of-sinope peter-of-tobolsk peter-ordynsky-of-rostov peter-son-of-john-of-syracuse peter-the-apostle peter-the-athonite peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Two new on 30 June: Peter of Sinope and Peter Ordynsky of Rostov. The rest of the fold is read in the el-06-02 entry for this name form.',
  'μελιτων meliton-martyr-30-june meliton-of-beirut meliton-of-the-forty-martyrs mellitus-of-canterbury':
    'Four now. The new one is the Meliton of 30 June; the others are Mellitus of Canterbury, whose Greek form folds with theirs, and the two read in the el-03-09 entry for this name form.',
  'σεργιοσ sergius-martyr-2-january sergius-of-russia sergius-of-sukhtoma sergius-of-the-twelve-tribunes sergius-of-valaam sergius-of-zographou sergius-the-confessor sergius-the-magistros sergius-zipulin':
    'Two new on 28 June: Sergius the Magistros and Sergius of Valaam, whose life Germanus of Valaam shares. The rest of the fold is read in the el-05-24 entry for this name form.',
  'παυλοσ paul-28-june paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-lucillian paul-companion-of-quadratus paul-companion-of-reverianus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-ioannina paul-of-jamnia paul-of-kaiouma paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'The new one is the Paul of 28 June; the others are read in the el-06-12 entry for this name form.',
  'μωυσησ moses-28-june moses-disciple-of-polychronius moses-of-novgorod moses-of-ramas moses-of-the-white-lake':
    'Five now. The new one is the Moses of 28 June; the others, three of them sharing 23 February, are read in the el-02-23 entry for this name form.',
  'μαγνοσ magnus-28-june magnus-of-cyzicus':
    'Two men: Magnus of Cyzicus, whom the Greek keeps on 28 April and the Romanian on the 29th, and the Magnus of 28 June. One day apart on two calendars is one man; a month apart on the same calendar is two.',
  'μακεδονιοσ macedonius-28-june macedonius-ii-of-constantinople macedonius-of-myropolis macedonius-the-barley-eater':
    'Four now. The new one is the Macedonius of 28 June; the others are the patriarch on 25 April and the two read in the el-01-24 entry for this name form.',
  'γερμανοσ germanos-of-stolobnoe germanus-of-constantinople germanus-of-dobrogea germanus-of-kantara germanus-of-novgorod germanus-of-sagmata germanus-of-valaam':
    'Seven now. The new one is Germanus of Valaam on 28 June, who stands with Sergius of Valaam and shares his life; the others are read in the el-05-19 entry for this name form.',
  'μαρκια marcia-companion-of-marcius marcia-of-caesarea':
    'Two women: Marcia of Caesarea on 6 June and Marcia, the companion of Marcius, on 27 June.',
  'λουκασ luke-27-june luke-companion-of-terentius luke-of-corleone luke-of-crimea luke-of-emesa luke-of-hellas luke-of-novgorod':
    'Seven now. The new one is the Luke of 27 June; Luke of Crimea joined the fold without a reading of its own, and the other five are read in the el-04-10 entry for this name form.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-lucillian dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-kagovets dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-athos dionysius-of-glushitsa dionysius-of-lampsacus dionysius-of-milan dionysius-of-pereyaslavl dionysius-of-radonezh dionysius-of-suzdal dionysius-reader-of-alexandria dionysius-the-merciful':
    'Nineteen now. The new one is Dionysius of Suzdal on 26 June, whose page also prints him on 15 Οκτωβρίου — that day is unread and the second feast is a note on his row, not a row of its own. The others are read in the el-06-01 entry for this name form.',
  'δαβιδ david-brother-of-tarichan david-of-gareji david-of-kydonies david-of-mytilene david-of-thessalonica david-of-wales david-son-of-prince-theodore david-with-minas-and-john':
    'Eight now, and two of them stand on 26 June: David of Kydonies, new here, and David of Thessalonica, whom this batch upgraded to a venerated Greek row on the day the Romanian already kept him. The others are read in the el-05-18 entry for this name form.',
  'μεθοδιοσ methodius-hieromartyr-1-march methodius-of-constantinople methodius-of-moravia methodius-of-nivritos methodius-of-patara methodius-of-peshnosha':
    'Six now. The new one is Methodius of Nivritos on 25 June; the others are read in the el-06-04 entry for this name form.',
  'θεοδοσιοσ theodosius-25-june theodosius-companion-of-paisius theodosius-of-antioch theodosius-of-chernigov theodosius-of-the-east theodosius-of-the-kyiv-caves theodosius-of-totma theodosius-of-trebizond theodosius-of-triglia theodosius-the-cenobiarch':
    'Ten now. The new one is on 25 June; the others are read in the el-03-26 entry for this name form.',
  'σιμων simon-25-june simon-of-moscow simon-of-suzdal simon-of-vladimir simon-of-zographou simon-the-martyr-3-february simon-the-zealot':
    'Seven now. The new one is on 25 June; the others are read in the el-05-23 entry for this name form.',
  'μαρτυριοσ martyrius-25-june martyrius-companion-of-sisinnius martyrius-of-novgorod martyrius-of-zelenets':
    'Four now. The new one is on 25 June; the others are read in the el-05-29 entry for this name form.',
  'λογγινοσ longinus-24-april longinus-brother-of-orentius longinus-of-koryazhemka':
    'Three men. The new one is Longinus, one of the seven brothers of Satala whose company stands on 25 June, each on his own line and each with the shared life; the others are read in the el-10-16 entry for this name form.',
  'γεωργιοσ george-bozic george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-krene george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-pisidian-antioch george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-shenkursk george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-cypriot george-the-hungarian george-the-iberian george-the-iberian-2-january george-the-new-martyr-of-sofia george-the-persian george-the-sinaite george-the-trophy-bearer':
    'Thirty now. The new one is George of Krene on 25 June; the others are read in the el-06-04 entry for this name form.',
  'φιρμοσ firmus-1-june firmus-brother-of-orentius':
    'Two men: the Firmus of 1 June and Firmus, one of the seven brothers of Satala whose company stands on 25 June, each on his own line and each with the shared life. His brother Φιρμίνος is a folder of his own and does not fold here, the two Greek forms being distinct.',
  'κυριακοσ cyriacus-attendant-of-faustus cyriacus-brother-of-orentius cyriacus-of-eurychou cyriacus-son-of-hesperus cyriacus-the-infant':
    'Five now. The new one is Cyriacus, one of the seven brothers of Satala whose company stands on 25 June, each on his own line and each with the shared life; the others are read in the el-05-24 entry for this name form.',
  'παναγιωτησ panagiotis-of-caesarea panagiotis-of-jerusalem':
    'Two men: the Panagiotis martyred at Jerusalem on 5 April and Panagiotis of Caesarea on 24 June.',
  'γερασιμοσ gerasimus-1-june gerasimus-of-astrakhan gerasimus-of-boltinsk gerasimus-of-crete gerasimus-of-great-perm gerasimus-of-kantara gerasimus-of-rethymno gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Ten now. The new one is Gerasimus bishop of Astrakhan on 24 June; the others are read in the el-06-23 entry for this name form.',
  'τιμοθεοσ timothy-1-february timothy-companion-of-diogenes timothy-companion-of-terentius timothy-disciple-of-babylas timothy-husband-of-maura timothy-martyred-in-africa timothy-of-caesarea timothy-of-ephesus timothy-of-konstamonitou timothy-of-prusa timothy-of-pskov timothy-of-symbola timothy-the-stylite':
    'Twelve now. The new one is Timothy the Stylite on 4 January; the others are read in the el-06-12 entry for this name form.',
  'εξι μαρτυρεσ six-martyrs-4-january six-martyrs-of-egypt':
    'Two companies the corpus counts rather than names: the Six Martyrs of One Family on 9 March and the Six Martyrs of 4 January. Two days, two entries, two folders.',
  'συμεων simeon-of-persia simeon-of-tver simeon-the-elder simeon-the-myrrh-streaming symeon-4-january symeon-kinsman-of-the-lord symeon-of-novgorod symeon-of-the-wonderful-mountain symeon-the-barefoot symeon-the-god-receiver symeon-the-new-of-mytilene symeon-the-pentaglot symeon-the-pious symeon-with-theonas-and-pherbinus':
    'Fourteen now. The new one is on 4 January; the others are read in the el-05-01 entry for this name form.',
  'ονουφριοσ onuphrius-of-koronisia onuphrius-of-kursk onuphrius-the-great onuphrius-the-new':
    'Four men. The new one is Onuphrius the New on 4 January; the others are read in the el-06-12 entry for this name form.',
  'ευαγριοσ evagrius-companion-of-theodoula evagrius-of-georgia evagrius-of-iberia evagrius-of-shio-mgvime':
    'Four men. The new one is Evagrius of Shio-Mgvime on 4 January; the others are read in the entries recorded for this name form before it.',
  'ευθυμιοσ euthymius-4-january euthymius-kereselidze euthymius-of-dimitsana euthymius-of-jerusalem euthymius-of-karelia euthymius-of-madytos euthymius-of-novgorod euthymius-of-suzdal euthymius-of-syanzhema euthymius-of-tarnovo euthymius-of-zographou euthymius-the-iberian euthymius-the-man-of-god euthymius-the-wonderworker':
    'Fourteen now. The new one is on 4 January; the others are read in the el-06-12 entry for this name form.',
  'ευσταθιοσ eustathius-i-archbishop-of-serbia eustathius-of-antioch eustathius-of-kios eustathius-of-vilnius eustathius-the-roman':
    'Five men. The new one is Eustathius I archbishop of Serbia on 4 January; the others are read in the el-05-18 entry for this name form.',
  'ευφημια euphemia-4-january euphemia-of-amisos':
    'Two women. The new one is on 4 January; the other is read in the entry recorded for this name form before it.',
  'χρυσανθοσ chrysanthus chrysanthus-4-january':
    'Two men: Chrysanthus whom the Greek keeps with Daria on 19 March and the Chrysanthus of 4 January.',
  'ουρβανοσ urbanus-8-march urbanus-son-of-gaius':
    'Three men: the Urbanus of 20 February, Urbanus of the Forty of Sebaste on 9 March, and the Urbanus of 23 June.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-chalcedon nicetas-of-epirus nicetas-of-medikion nicetas-of-nisyros nicetas-of-novgorod nicetas-of-pythia nicetas-of-thebes nicetas-the-sinaite nicetas-the-stylite-of-pereslavl nikitas-of-nea-moni':
    'Eleven now. The new one is on 23 June; the others are read in the el-06-21 entry for this name form.',
  'δημητριανοσ demetrianus-of-tamassos demetrianus-son-of-demetrius demetrianus-the-deacon':
    'Two men: the Demetrian of 23 June and the Demetrian of the el-11-10 entry.',
  'δανιηλ daniel-of-achinsk daniel-of-moscow daniel-of-pereslavl daniel-of-the-castle-of-patras daniel-the-egyptian':
    'Five men. The new one is on 23 June; the others are read in the el-05-04 entry for this name form.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-christianoupolis athanasius-of-corinth athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-confessor athanasius-the-reader athanasius-the-wonderworker':
    'Fourteen now. The new one is on 23 June; the others are read in the el-06-03 entry for this name form.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta zacharias-of-corinth zacharias-of-jerusalem zacharias-of-prusa zacharias-of-siteia zacharias-of-vienne zacharias-son-of-barachias zacharias-son-of-carion zacharias-the-faster':
    'Ten now. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-05-26 entry for this name form.',
  'νεοφυτοσ neophytus-5-may neophytus-of-knossos neophytus-of-nicaea':
    'Three men. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-05-05 entry for this name form.',
  'ιωακειμ joachim-of-chersonesos joachim-of-novgorod joachim-of-petra joachim-of-tarnovo joachim-papoulakis joachim-the-righteous':
    'Three men. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-05-28 entry for this name form.',
  'ιεροθεοσ hierotheus-of-athens hierotheus-of-lampe hierotheus-of-nikolsk':
    'Three men. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-05-31 entry for this name form.',
  'γερασιμοσ gerasimus-1-june gerasimus-of-boltinsk gerasimus-of-crete gerasimus-of-great-perm gerasimus-of-kantara gerasimus-of-rethymno gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Eight now. The new one is Gerasimus of Crete, the head of that company, whose plural apolytikion the other nine carry; the others are read in the el-06-01 entry for this name form.',
  'γαιοσ gaius-5-may gaius-disciple-of-dionysius-of-alexandria gaius-nephew-of-eustochius gaius-of-alexandria gaius-of-the-forty-martyrs gaius-pope-of-rome':
    'Four men. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-04-29 entry for this name form.',
  'καλλινικοσ calinic-of-cernica callinicus-companion-of-eustathius callinicus-of-diopolis callinicus-of-kydonia callinicus-the-magus':
    'Six now. The new one is one of the ten Cretan hierarchs of 1821 the 23 June page names; the others are read in the el-05-24 entry for this name form.',
  'σατορνινοσ satorninus-7-may saturninus-companion-of-plotinus saturninus-of-corfu saturninus-son-of-juliana':
    'Four men of this Greek form. The new one is on 22 June; the others are read in the el-04-29 entry for this name form.',
  'ιουλιανη juliana-mother-of-saturninus juliana-of-amisos juliana-of-lazarevo juliana-of-ptolemais':
    'Four women. The new one is on 22 June; the others are read in the el-03-20 entry for this name form.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-chalcedon nicetas-of-epirus nicetas-of-medikion nicetas-of-nisyros nicetas-of-novgorod nicetas-of-pythia nicetas-the-sinaite nicetas-the-stylite-of-pereslavl nikitas-of-nea-moni':
    'Ten now. The new one is on 21 June; the others are read in the el-05-24 entry for this name form.',
  'αναστασια anastasia-andreyevna anastasia-of-rome-15-april anastasia-of-serbia anastasia-of-uglich anastasia-the-patrician':
    'Four women. The new one is on 21 June; the others are read in the el-04-10 entry for this name form.',
  'ζωσιμοσ zosimas-brother-of-alexander zosimus-of-syracuse zosimus-the-soldier':
    'Two men whose Greek forms differ by a letter from the Ζωσιμᾶς fold: the Zosimus of 19 June and the Zosimus read beside him there.',
  'ζηνων zeno-20-april zeno-companion-of-terentius zeno-companion-of-zoilus zeno-disciple-of-silvanus zeno-of-corfu zeno-of-diospolis zeno-of-ikalto zeno-the-courier zeno-the-faster-of-kiev zenon-12-june':
    'Nine now. The new one is on 19 June; the others are read in the el-06-12 entry for this name form.',
  'βαρλααμ barlaam-30-may barlaam-of-sikisk barlaam-of-vazsky':
    'Three men: the Barlaam of 30 May, the Barlaam of 19 June and the Barlaam the corpus keeps besides.',
  'ασυγκριτοσ asyncritus-martyr-19-june asyncritus-the-apostle':
    'Two men: Asyncritus the Apostle, upgraded on 8 April, and the Asyncritus of 19 June.',
  'λεοντιοσ leontios-dionysiatis leontius-24-april leontius-of-scythopolis leontius-of-the-forty-martyrs leontius-of-tripoli leontius-patriarch-of-jerusalem leontius-the-canonarch leontius-the-shepherd':
    'Five now. The new one is on 18 June; the others are read in the el-05-04 entry for this name form, and the canonarch of this month is read in the el-04-01 entry for Γερόντιος.',
  'αιθεριοσ aetherius-martyr-18-june aetherius-of-cherson':
    'Two men: Aetherius of Cherson, upgraded on 7 March, and the Aetherius of 18 June.',
  'ιωσηφ joseph-of-alaverdi joseph-of-aleppo joseph-of-astrakhan joseph-of-bisericani joseph-of-kantara joseph-of-lythrodontas joseph-of-nea-moni joseph-of-optina joseph-of-thessalonica-1821 joseph-the-anchorite joseph-the-hymnographer':
    'Eleven now. The new one is on 17 June; the others are read in the el-06-03 entry for this name form.',
  'ερμειασ hermias-companion-of-isaurus hermias-of-comana':
    'Two men: Hermias of Comana, upgraded on 31 May, and the Hermeias of 17 June.',
  'βασιλειοσ basil-companion-of-euphrasius basil-companion-of-isaurus basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-braga basil-of-chernigov basil-of-georgia basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Nineteen now. The new one is on 17 June; the others are read in the el-05-27 entry for this name form.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-daphnousia sabbas-of-sicily sabbas-of-sourozh sabbas-of-stagira sabbas-of-the-kyiv-caves sabbas-of-tver sabbas-of-zographou sabbas-stratelates sabbas-the-spiritual sabbas-the-vatopedine sava-brancovici-of-transylvania sava-of-serbia sava-the-second':
    'Fourteen now. The new one is on 15 June; the others are read in the el-06-10 entry for this name form.',
  'ιωνασ jonah-bishop-6-june jonah-martyr-29-march jonah-of-kyiv jonah-of-moscow jonah-of-odessa jonah-of-pesonsa jonah-of-the-lavra-of-pskov jonas-of-great-perm jonas-the-lerian':
    'Nine now. The new one is on 15 June; the others are read in the el-06-06 entry for this name form.',
  'φουρτουνατοσ fortunatus-of-africa fortunatus-the-apostle':
    'Three men of the two Greek forms the corpus now holds: Fortunatus of Africa on 21 February, the Fortunatus of 1 June, and the Fourtounatos of 14 June.',
  'νηφων niphon-of-novgorod niphon-the-athonite':
    'Two men: Niphon of Novgorod on 8 April and the Niphon of 14 June.',
  'μαρτυρεσ μυριοι ten-thousand-martyrs ten-thousand-martyrs-13-june':
    'Two companies the corpus counts rather than names, which is what folds their display names together: the Ten Thousand Martyrs of 18 March and the Ten Thousand of 13 June. Two days, two entries, two folders.',
  'φιλοθεοσ philotheus-of-antioch philotheus-of-meteora philotheus-of-samosata philotheus-of-sklataina philotheus-of-tobolsk philotheus-the-presbyter':
    'Six now. The new one is on 13 June; the others are read in the el-05-31 entry for this name form.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-13-june james-companion-of-emilian james-matynenko james-of-borovichi james-of-bryleyevo james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-stromyn james-of-zheleznyi-borok james-of-zographou-the-first james-of-zographou-the-second james-redozubov james-son-of-zebedee james-the-confessor':
    'Nineteen now. The new one is on 13 June; the others are read in the el-05-22 entry for this name form.',
  'διοδωροσ diodorus-martyr-3-may diodorus-of-corinth diodorus-of-emesa diodorus-the-presbyter':
    'Three men: the Diodorus of 3 May, the Diodorus of 13 June and the Diodorus of the el-09-11 entry.',
  'αντιπατροσ antipater-of-bostra antipater-of-cyzicus':
    'Two men: Antipater of Cyzicus, upgraded on 28 April, and the Antipater of 13 June.',
  'αννα anna-martyr-20-january anna-of-larissa anna-of-novgorod anna-the-princess':
    'Three women. The new one is on 13 June; the others are read in the el-02-03 entry for this name form.',
  'ζηνων zeno-20-april zeno-companion-of-terentius zeno-companion-of-zoilus zeno-of-corfu zeno-of-diospolis zeno-of-ikalto zeno-the-courier zeno-the-faster-of-kiev zenon-12-june':
    'Eight now. The new one is the Zenon of 12 June, whose page doubts its own identification and whom the reader drafted bare for that reason; the others are read in the el-04-29 entry for this name form.',
  'τιμοθεοσ timothy-1-february timothy-companion-of-diogenes timothy-companion-of-terentius timothy-disciple-of-babylas timothy-husband-of-maura timothy-martyred-in-africa timothy-of-caesarea timothy-of-ephesus timothy-of-konstamonitou timothy-of-prusa timothy-of-pskov timothy-of-symbola':
    'Eleven now. The new one is on 12 June; the others are read in the el-05-21 entry for this name form.',
  'συνεσιοσ synesius-of-carpasia synesius-of-irkutsk synesius-of-lysi synesius-of-triglia':
    'Four men: Lysi on 1 March, the Synesius of 10 May, the Synesius of 26 May and the Synesius of 12 June.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-lucillian paul-companion-of-quadratus paul-companion-of-reverianus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-ioannina paul-of-jamnia paul-of-kaiouma paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-seven now. The new one is on 12 June; the others are read in the el-06-08 entry for this name form.',
  'ονουφριοσ onuphrius-of-koronisia onuphrius-of-kursk onuphrius-the-great':
    'Three men: Onuphrius Maksimovich of Kursk on 19 May, Onuphrius the Great on 12 June, and the Onuphrius the corpus keeps besides. The 12 June page carries Peter’s kontakion under Onuphrius’s name, which the reader read as a mis-hang: the hymn was taken for Peter and refused for Onuphrius, per the mis-hang rule of ro-run/BRIEF.md.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-basilides john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-companion-of-tarasius john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-chaldia john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-nea-moni john-of-peking john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-tobolsk john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-anna-of-larissa john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-new-of-suceava john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-soldier-12-june john-the-wallachian john-timonov john-with-minas-and-david':
    'Sixty-one now. The new ones are on 12 and 13 June; the others are read in the el-06-10 entry for this name form.',
  'ιουλιανοσ helianus-of-the-forty-martyrs julian-companion-of-euboulos julian-companion-of-modestus julian-companion-of-pamphilus julian-of-africa julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-of-the-dogazou julian-the-deacon-of-aegina julian-the-martyr-18-may':
    'Twelve now. The new one is on 12 June; the others are read in the el-05-23 entry for this name form.',
  'βενεδικτοσ benedict-biscop benedict-of-konstamonitou benedict-of-nursia':
    'Two men: Benedict of Nursia, whom this wave upgraded on 14 March, and the Benedict of 12 June.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-georgia arsenius-of-ikalto arsenius-of-konevits arsenius-of-novgorod arsenius-of-rostov arsenius-of-the-kyiv-caves arsenius-of-varnakova arsenius-of-veroia arsenius-the-great':
    'Fourteen now. The new one is on 12 June; the others are read in the el-05-28 entry for this name form.',
  'θεοπεμπτοσ theopemptus-11-june theopemptus-2-january theopemptus-7-february theopemptus-of-nicomedia':
    'Two men: the Theopemptus of 11 June and the Theopemptus of the el-01-05 entry.',
  'τατιανη tatiana-5-january tatiana-of-peking tatiana-of-rome':
    'Two women: the Tatiana of 11 June and the Tatiana of the el-01-12 entry.',
  'μαρια maria-6-january maria-methymopoula maria-of-caesarea maria-of-olonets maria-of-peking maria-of-vladimir mary-called-marinos mary-of-aza mary-of-cleopas mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'Ten now. The new one is on 11 June; the others are read in the el-06-06 entry for this name form.',
  'ησαιασ isaiah-companion-of-terentius isaiah-of-peking isaiah-of-rostov isaiah-of-the-kyiv-caves isaiah-of-valaam isaiah-the-egyptian isaiah-the-prophet':
    'Seven now. The new one is on 11 June; the others are read in the el-05-15 entry for this name form.',
  'βαρναβασ barnabas-of-gethsemane barnabas-of-kantara barnabas-of-the-vetluga barnabas-the-apostle':
    'Three men: Barnabas of Kantara on 19 May, the Apostle on 11 June, and the Barnabas the corpus keeps besides.',
  'σιλουανοσ silouan-of-the-kyiv-caves silvanus-martyr-6-february silvanus-of-emesa':
    'Two men: the Silouanos of 10 June and Silvanus of Tabennisi on 15 May, whose Greek forms fold together.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-daphnousia sabbas-of-sicily sabbas-of-sourozh sabbas-of-stagira sabbas-of-the-kyiv-caves sabbas-of-tver sabbas-of-zographou sabbas-stratelates sabbas-the-spiritual sava-brancovici-of-transylvania sava-of-serbia sava-the-second':
    'Thirteen now. The new one is on 10 June; the others are read in the el-05-02 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-basilides john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-companion-of-tarasius john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-nea-moni john-of-peking john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-tobolsk john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'Fifty-nine now. The new ones are on 10 and 11 June; the others are read in the el-06-07 entry for this name form.',
  'απολλωσ apollos-bishop-10-june apollos-companion-of-alexandra apollos-under-julian':
    'Three men: the companion of Alexandra on 21 April, Apollo of the ten Egyptians on 5 June, and the Apollos of 10 June.',
  'αλεξιοσ alexios-the-recluse-of-kyiv alexis-of-goloseevo alexis-of-moscow alexis-of-voronezh alexis-tatarinov alexis-the-man-of-god alexis-toth alexius-of-bithynia':
    'Six now. The new one is on 10 June; the others are read in the el-04-24 entry for this name form.',
  'κυροσ cyrus-of-alexandria cyrus-of-constantinople kyros-the-venerable':
    'Two men: the Cyrus of 9 June and the Cyrus of the el-01-31 entry.',
  'ανανιασ ananias-26-january ananias-martyr-9-june ananias-of-crete ananias-of-lacedaemonia':
    'Three men: Ananias of Lacedaemonia on 15 April, the Ananias of 9 June and the Ananias of the el-01-26 entry.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-sisinnius alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-lyons alexander-of-oshevensk alexander-of-prusa alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-thessalonica alexander-of-voskiy alexander-the-dervish alexander-the-sleepless alexander-with-thirty-martyrs':
    'Twenty-two now. The new one is on 9 June; the others are read in the el-06-02 entry for this name form.',
  'θεοφανησ theophan-the-recluse theophanes-of-peritheorion theophanes-of-sigriane theophanes-the-merciful-of-gaza theophanes-the-myrrh-streamer-of-cyprus theophanes-the-neomartyr theophanes-venerable-17-may':
    'Seven now. The new one is on 8 June; the others are read in the el-05-17 entry for this name form, where the Cypriot myrrh-streamer and the Meteora brother are parted.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-lucillian paul-companion-of-quadratus paul-companion-of-reverianus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-kaiouma paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-six now. The new one is on 8 June; the others are read in the el-06-01 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-rostov-and-suzdal theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-the-twelve-tribunes theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas theodore-yaroslavich':
    'Twenty-nine now. The new one is on 8 June; the others are read in the el-06-05 entry for this name form.',
  'μαρκοσ mark-martyr-8-june mark-of-arethusa mark-of-byblos mark-of-chios mark-of-kantara mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-hermit-20-may mark-the-shepherd':
    'Twelve now. The new one is on 8 June; the others are read in the el-06-04 entry for this name form.',
  'ταρασιοσ tarasius-martyr-7-june tarasius-of-constantinople tarasius-of-lycaonia':
    'Three men: Tarasius of Constantinople on 25 February, Tarasius of Lycaonia on 7 May, and the Tarasius of 7 June.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-the-presbyter-7-june stephen-xylinites':
    'Seventeen now. The new one is on 7 June; the others are read in the el-05-24 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-basilides john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-companion-of-tarasius john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-nea-moni john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'Fifty-seven now. The new one is on 7 June; the others are read in the el-06-04 entry for this name form.',
  'βασιλειδησ basilides-companion-of-gerontius basilides-the-soldier':
    'Two men: Basilides the companion of Gerontius the canonarch on 1 April and the Basilides of 7 June.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-martkopi anthony-of-novgorod anthony-of-radonezh anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-gorban antony-of-korel antony-of-novgorod antony-of-valaam antony-of-vilnius antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Twenty-one now. The new one is on 7 June; the others are read in the el-05-12 entry for this name form.',
  'μαρθα maria-of-vladimir martha-of-aza martha-of-caesarea martha-of-monemvasia martha-sister-of-lazarus martha-sister-of-lykarion':
    'Five women. The new one is on 6 June; the others are read in the el-05-05 entry for this name form.',
  'μαρια maria-6-january maria-methymopoula maria-of-caesarea maria-of-olonets maria-of-vladimir mary-called-marinos mary-of-aza mary-of-cleopas mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'Nine now. The new one is on 6 June; the others are read in the el-05-01 entry for this name form.',
  'κυρια kyria-companion-of-doule kyria-of-caesarea':
    'Two women: Kyria the companion of Doule on 5 April and the Kyria of 6 June.',
  'ιωνασ jonah-bishop-6-june jonah-martyr-29-march jonah-of-kyiv jonah-of-moscow jonah-of-odessa jonah-of-the-lavra-of-pskov jonas-of-great-perm jonas-the-lerian':
    'Eight now. The new one is on 6 June; the others are read in the el-05-17 entry for this name form.',
  'ατταλοσ attalus-of-lyons attalus-of-niculitel attalus-the-wonderworker':
    'Two men: Attalus of Niculițel, upgraded on 4 June, and the Attalus of 6 June.',
  'ανδρονικοσ andronicus-of-perm andronicus-the-apostle':
    'Three men. The new one is Andronicus of Perm on 6 June, whose folder relates John of Kronstadt and Nicholas of Japan because his own life names both — `tests/life-links.test.mjs` asked for the rows. The others are read in the el-05-17 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-the-twelve-tribunes theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas theodore-yaroslavich':
    'Twenty-eight now. The new one is Theodore Yaroslavich on 5 June, whose folder relates Alexander Nevsky because his own life names him as his younger brother — `tests/life-links.test.mjs` asked for the row. The others are read in the el-05-24 entry for this name form.',
  'μαρκοσ mark-of-arethusa mark-of-byblos mark-of-chios mark-of-kantara mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-hermit-20-may mark-the-shepherd':
    'Eleven now. The new one is on 4 June; the others are read in the el-05-20 entry for this name form.',
  'κονων conon-martyr-5-june conon-of-cyprus conon-of-isauria conon-of-kantara conon-of-penthucla conon-the-gardener':
    'Five now. The new one is on 5 June; the others are read in the el-03-05 entry for this name form, where three stand on 5 March.',
  'χριστοφοροσ christopher christopher-20-april christopher-24-april christopher-martyr-5-june christopher-of-adrianople christopher-of-antioch christopher-of-georgia christopher-of-saint-sabbas':
    'Eight now. The new one is on 5 June; the others are read in the el-05-21 entry for this name form.',
  'μεθοδιοσ methodius-hieromartyr-1-march methodius-of-moravia methodius-of-peshnosha':
    'Three men. The new one is on 4 June; the others are read in the el-03-01 entry for this name form, where the hieromartyr of 1920 is parted from Methodius Ivanov.',
  'γεωργιοσ george-bozic george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-pisidian-antioch george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-shenkursk george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-cypriot george-the-hungarian george-the-iberian george-the-iberian-2-january george-the-new-martyr-of-sofia george-the-persian george-the-sinaite george-the-trophy-bearer':
    'Twenty-nine now. The new one is on 4 June; the others are read in the el-05-26 entry for this name form.',
  'ευμενιοσ eumenios-saridakis eumenius-of-murmansk':
    'Two men: Eumenios Saridakis, upgraded on 23 May, and the Eumenios of 4 June.',
  'ελεαζαροσ eleazar-of-anzersky eleazar-of-murmansk eleazar-of-vazhen':
    'Three men: Eleazar of Vazhen on 17 May, the Eleazar of 4 June and the Eleazar of the el-08-01 entry.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-monagria john-of-nea-moni john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'Fifty-six now. The new one is on 4 June; the others are read in the el-05-29 entry for this name form.',
  'ισαακ isaac-alfanov isaac-of-cordoba isaac-the-martyr-22-september':
    'Three men: Isaac Alfanov on 4 May, Isaac of Cordoba on 3 June and the Isaac of the el-04-21 entry.',
  'ιλαριοσ hilarion-4-may hilary-of-carcassonne hilary-of-poitiers':
    'Three men whose Greek forms fold together: Hilary of Carcassonne on 3 June, the Ἱλάριος the Greek keeps on 4 Μαΐου, and the Ἱλαρίων of 6 Μαΐου — the last pair settled in the el-05-06 entry as two men.',
  'ιωσηφ joseph-of-alaverdi joseph-of-aleppo joseph-of-astrakhan joseph-of-bisericani joseph-of-kantara joseph-of-lythrodontas joseph-of-nea-moni joseph-of-optina joseph-of-thessalonica-1821 joseph-the-hymnographer':
    'Ten now. The new one is Joseph of Thessalonica, martyred in 1821, on 3 June; the others are read in the el-05-11 entry for this name form.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-derkoi gregory-of-moesia gregory-of-nicomedia gregory-of-novgorod gregory-of-nyssa gregory-of-rostov gregory-of-sinai gregory-the-dialogist gregory-the-elder gregory-the-hesychast-of-athos gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius gregory-v-of-constantinople':
    'Seventeen now. The new one is Gregory of Derkoi on 3 June; the others are read in the el-05-03 entry for this name form.',
  'δωροθεοσ dorotheos-of-adrianople dorotheus-companion-of-agapitus dorotheus-of-chiliokomion':
    'Three men: the companion of Agapitus on 18 February, Chiliokomion on 5 January and Dorotheos of Adrianople on 3 June.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-christianoupolis athanasius-of-corinth athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-confessor athanasius-the-wonderworker':
    'Thirteen now. The new one is Athanasius the Wonderworker on 3 June; the others are read in the el-05-17 entry for this name form.',
  'αχιλλασ achillas achillas-of-alexandria':
    'Two men: Achillas of Alexandria on 3 June and the Achillas of the el-01-07 entry.',
  'φωτεινοσ photinos-of-lyons photinos-son-of-photini photinus-of-the-twelve-tribunes':
    'Three men: Photinus of Lyons among the twelve tribunes of 24 May, Photinos of Lyons on 2 June, and the Photinus the corpus keeps besides. **The two of Lyons are not obviously two**: the 24 May name is a tribune of Meletius’s company and this one is of the Gallic see, and neither page names the other — two entries on two days, so two folders, and the coincidence of place is worth an author’s eye.',
  'ευγενιοσ eugene-of-cherson eugene-of-trebizond eugene-son-of-paul-and-tatta eugenius-father-of-mary-called-marinos eugenius-of-rome eugenius-the-confessor':
    'Six now. The new one is Eugenius of Rome on 2 June; the others are read in the el-03-07 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-sisinnius alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-lyons alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-thessalonica alexander-of-voskiy alexander-the-dervish alexander-the-sleepless alexander-with-thirty-martyrs':
    'Twenty-one now. The new one is Alexander of Lyons on 2 June; the others are read in the el-05-29 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-martyr-2-june peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Twenty-one now. The new one is on 3 June; the others are read in the el-05-03 entry for this name form.',
  'μαρινοσ marinos-vaanes marinus-martyr-17-march':
    'Two men: Marinos Vaanes on 2 June and Marinus of 17 March.',
  'λεανδροσ leander-of-seville leandros-of-epirus':
    'Two men: Leandros of Epirus on 2 June and Leander of Seville, whom this wave upgraded on 27 February.',
  'δημητριοσ demetrius-24-april demetrius-donskoi demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-moscow demetrius-of-philadelphia demetrius-of-prilutsk demetrius-the-peloponnesian demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'Thirteen now. The new one is Demetrius of Philadelphia on 2 June; the others are read in the el-05-15 entry for this name form.',
  'κωνσταντινοσ constantine-brancoveanu constantine-of-cornwall constantine-of-murom constantine-of-novotorzhanin constantine-of-strathclyde constantine-of-the-scots constantine-the-great constantine-the-hagarene cyril-the-philosopher':
    'Nine now. The new one is Constantine the Hagarene on 2 June; the others are read in the el-05-21 entry for this name form, where four stand on 21 May.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-argentis andrew-companion-of-paul andrew-mishenko andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo andrew-prince-of-suzdal andrew-the-fool-for-christ':
    'Ten now. The new one is Andrew prince of Suzdal on 2 June; the others are read in the el-05-29 entry for this name form.',
  'σιοσ shio-of-mgvime sios-of-gareji':
    'Two men: Sios of Gareji on 1 June and `shio-of-mgvime`, whose `greek` row is already venerated on 4 Φεβρουαρίου and whom saint.gr lists again on 7 Μαΐου — a second Greek day a reader reported and did not draft, and §5 leaves that row alone.',
  'σεκουνδοσ secundus-brother-of-romylus secundus-companion-of-perpetua secundus-of-amelia':
    'Three men: the brother of Romylus on 24 March, the companion of Perpetua on 1 February and Secundus of Amelia on 1 June.',
  'προκλοσ proclus-companion-of-apollonius proclus-of-bologna':
    'Two men: Proclus of Bologna on 1 June and the Proclus of the el-11-20 entry.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-quadratus paul-companion-of-reverianus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-five now. The new one is the companion of Reverianus on 1 June; the others are read in the el-05-28 entry for this name form.',
  'φορτουνατοσ fortunatus-1-june fortunatus-the-martyr':
    'Two men: Fortunatus of Africa on 21 February and the Fortunatus of 1 June.',
  'πυρροσ pyrrhus-1-june pyrrhus-of-breti':
    'Two men: the Pyrrhus of 1 June and the Pyrrhus of the el-08-01 reading.',
  'νεων neon-1-june neon-24-april neon-companion-of-mark-the-shepherd neon-of-corfu':
    'Four men: the Neon of 24 April, Neon of Corfu on 29 April, the Neon of 1 June and the Neon of the el-01-16 entry.',
  'γερασιμοσ gerasimus-1-june gerasimus-of-boltinsk gerasimus-of-great-perm gerasimus-of-kantara gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Seven now. The new one is the Gerasimus of 1 June; the others are read in the el-05-01 entry for this name form.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-kagovets dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-glushitsa dionysius-of-lampsacus dionysius-of-milan dionysius-of-pereyaslavl dionysius-of-radonezh dionysius-reader-of-alexandria dionysius-the-merciful':
    'Sixteen now. The new one is Dionysius of Glushitsa on 1 June; the others are read in the el-05-25 entry for this name form.',
  'φιλοθεοσ philotheus-of-antioch philotheus-of-meteora philotheus-of-samosata philotheus-of-tobolsk philotheus-the-presbyter':
    'Five now. The new one is Philotheus of Tobolsk on 31 May; the others are read in the el-02-14 entry for this name form.',
  'φιλοσοφοσ philosophos-of-alexandria philosophos-ornatsky':
    'Two men of the name, which is a name here and not a rank: Philosophos Ornatsky, the Petrograd archpriest of 31 May, and Philosophos of Alexandria on 1 May.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-efimov nicholas-katopinos nicholas-kedrov nicholas-migulin nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-metsovo nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-of-vounena nicholas-patriarch-of-georgia nicholas-son-of-philosophos nicholas-the-bulgarian-17-may nicholas-the-mystikos nicholas-the-studite nicholas-velimirovich nicholas-zagorovsky':
    'Twenty-two now. The new one is Nicholas the son of Philosophos on 31 May, of the Petrograd family the day keeps together; the others are read in the el-05-17 entry for this name form.',
  'ιεροθεοσ hierotheus-of-athens hierotheus-of-nikolsk':
    'Two men: Hierotheus of Nikolsk on 31 May and the Hierotheus of the el-10-04 entry.',
  'κρησκησ crescens-companion-of-quadratus crescens-martyr-28-may crescens-of-myra crescens-of-sardinia':
    'Four men: the companion of Quadratus on 10 March, the Crescens of 28 May, Crescens of Sardinia on 31 May, and the Crescens the el-04-10 company holds.',
  'ρωμανοσ romanus-30-may romanus-martyr-16-march romanus-of-karpenisi romanus-of-lacedaemon romanus-of-samosata romanus-of-tarnovo romanus-of-uglich romanus-the-cilician':
    'Eight now. The new one is the Romanus of 30 May; the others are read in the el-02-17 entry for this name form.',
  'κυπριανοσ cyprian-30-may cyprian-companion-of-quadratus cyprian-of-antioch cyprian-of-zographou cyprian-yankovsky':
    'Five now. The new one is the Cyprian of 30 May; the others are read in the el-05-19 entry for this name form.',
  'θεοδοσια theodora-of-amisos theodosia-of-caesarea-in-palestine theodosia-of-constantinople':
    'Three women. The new one is on 29 May; the others are read in the el-03-25 entry for this name form.',
  'μαρτυριοσ martyrius-companion-of-sisinnius martyrius-of-novgorod martyrius-of-zelenets':
    'Three men. The new one is on 29 May; the others are read in the el-10-25 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-nannos-of-thessalonica john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-nea-moni john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-ustyug john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'Fifty-five now, and **two of the new ones share 29 May** as two entries: John Nannos of Thessalonica and John of Ustyug. The others are read in the el-05-24 entry for this name form.',
  'ιερεμιασ jeremiah-of-kantara jeremiah-the-damascene jeremiah-the-egyptian jeremiah-the-prophet jeremias-i-of-constantinople':
    'Five men. The new one is Jeremiah the Damascene on 29 May; the others are read in the el-03-29 entry for this name form.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-argentis andrew-companion-of-paul andrew-mishenko andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo andrew-the-fool-for-christ':
    'Eight now. The new one is Andrew Argentis on 29 May; the others are read in the el-05-28 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-sisinnius alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-thessalonica alexander-of-voskiy alexander-the-dervish alexander-the-sleepless alexander-with-thirty-martyrs':
    'Twenty now. The new one is the companion of Sisinnius on 29 May; the others are read in the el-05-28 entry for this name form.',
  'σωφρονιοσ sophronius-bishop-19-february sophronius-companion-of-sylvester sophronius-of-bulgaria sophronius-of-irkutsk sophronius-of-jerusalem sophronius-of-vratsa sophronius-the-recluse':
    'Seven now. The new one is Sophronius of Bulgaria on 28 May, whose folder relates Joachim of Tarnovo because his life names the patriarch as his monastery’s founder; the others are read in the el-03-30 entry for this name form.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-martyr-28-may paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-four now. The new one is on 28 May; the others are read in the el-05-22 entry for this name form.',
  'ιγνατιοσ ignatius-brianchaninov ignatius-of-mariupol ignatius-of-rostov ignatius-the-sinaite ignatius-venerable-19-may':
    'Five now. The new one is on 28 May; the others are read in the el-05-19 entry for this name form.',
  'γεροντιοσ gerontius-of-milan gerontius-of-moscow gerontius-the-canonarch gerontius-the-martyr':
    'Four men. The new one is on 28 May; the others are read in the el-05-05 entry for this name form.',
  'διοσκοριδησ dioscorides dioscorus-of-11-may':
    'Two men: the Dioscorides of 28 May and Dioscorus of 19 April, whose Greek forms fold together.',
  'κρησκησ crescens-companion-of-quadratus crescens-martyr-28-may crescens-of-myra':
    'Two men: Crescens the companion of Quadratus on 10 March and the Crescens of 28 May.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-georgia arsenius-of-ikalto arsenius-of-novgorod arsenius-of-rostov arsenius-of-the-kyiv-caves arsenius-of-varnakova arsenius-of-veroia arsenius-the-great':
    'Thirteen now. The new one is on 28 May; the others are read in the el-05-08 entry for this name form, where four stand on 8 May.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-companion-of-paul andrew-mishenko andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo andrew-the-fool-for-christ':
    'Seven now. The new one is on 28 May; the others are read in the el-05-19 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-thessalonica alexander-of-voskiy alexander-the-dervish alexander-the-sleepless alexander-with-thirty-martyrs':
    'Nineteen now. The new one is Alexander of Thessalonica on 28 May, whose folder relates Matrona of Thessalonica because his life reads her synaxarion; the others are read in the el-05-26 entry for this name form.',
  'θεραπων therapon-of-cyprus therapon-of-the-white-lake':
    'Three men. Therapon of the White Lake is the new one, and his folder relates Cyril of the White Lake and Photius of Kyiv because his own life names both; `tests/life-links.test.mjs` asked for those rows. The others are Therapon of Cyprus on 14 May and the Therapon of the el-05-27 second entry, whom saint.gr sends to 12 Δεκεμβρίου and whom this wave has not drafted.',
  'φιλιπποσ philip-of-moscow philip-of-sicily philip-of-worms philip-ordinets philip-the-first-of-moscow':
    'Four men: Worms on 3 May, Sicily on 12 May, Philip Ordinets of the Slobodskaya twenty-seven on 19 May, and the Philip of 27 May.',
  'ματθαιοσ matei-brancoveanu matthew-helper-of-athanasia matthew-of-yaransk':
    'Three men. The new one is on 27 May; the others are read in the el-04-18 entry for this name form.',
  'λαζαροσ lazarus-companion-of-jonah lazarus-of-murom lazarus-of-pskov lazarus-of-tripoli-in-the-peloponnese lazarus-the-shepherd':
    'Five now. The new one is on 27 May; the others are read in the el-04-23 entry for this name form.',
  'μιχαηλ boris-michael-of-bulgaria macarius-notaras methodius-of-moravia michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-georgia michael-of-klops michael-of-murom michael-of-synada michael-of-ulumbo michael-of-vourla michael-parekheli michael-the-russian-1-april michael-the-wonderworker':
    'Fourteen now. The new one is on 27 May; the others are read in the el-05-21 entry for this name form.',
  'βασιλειοσ basil-companion-of-euphrasius basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-braga basil-of-georgia basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Eighteen now. The new one is on 27 May; the others are read in the el-05-23 entry for this name form.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta zacharias-of-corinth zacharias-of-jerusalem zacharias-of-prusa zacharias-of-vienne zacharias-son-of-barachias zacharias-son-of-carion zacharias-the-faster':
    'Nine now. The new one is on 26 May; the others are read in the el-05-22 entry for this name form.',
  'συνεσιοσ synesius-of-carpasia synesius-of-irkutsk synesius-of-lysi':
    'Three men: Synesius of Lysi on 1 March, the Synesius of 10 May and the Synesius of 26 May.',
  'πρισκοσ priscus-martyr-at-besancon priscus-of-the-forty-martyrs':
    'Three men, and the third is a reader’s deliberate second folder: Priscus of the Forty of Sebaste on 9 March, `priscus-the-martyr` whom the Greek keeps on 21 Σεπτεμβρίου, and Priscus martyred at Besançon on 26 May. The reader argued the third in its row and named it as the one to merge if the author disagrees.',
  'παυλινοσ paulinus-of-athens paulinus-of-todi':
    'Two men: Paulinus of Athens on 18 May and the Paulinus of 26 May.',
  'ηρακλησ heracles-companion-of-terentius heracles-of-carthage heracles-of-todi':
    'Three men: the companion of Terentius on 10 April, Heracles of Carthage on 11 March and the Heracles of 26 May.',
  'george sofia george-of-sofia george-the-new-martyr-of-sofia':
    'Two men of Sofia: George of Sofia on 26 March and George the New Martyr of Sofia on 26 May, two of saint.gr’s own days and two entries.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-pisidian-antioch george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-shenkursk george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-cypriot george-the-hungarian george-the-iberian george-the-iberian-2-january george-the-new-martyr-of-sofia george-the-persian george-the-sinaite george-the-trophy-bearer':
    'Twenty-eight now. The new one is George the New Martyr of Sofia on 26 May; the others are read in the el-04-23 entry for this name form, where three stand on 23 April.',
  'δαμιανοσ damian-disciple-of-polychronius damian-of-agrafa damian-of-esphigmenou damian-of-georgia damian-of-pavia damian-sent-to-britain':
    'Six now. The new one is the Damian sent to Britain with Augustine on 26 May; the others are read in the el-05-23 entry for this name form.',
  'αυγουστινοσ augustine-of-canterbury augustine-of-hippo augustinus-brother-of-augustus':
    'Three men: Augustinus the brother of Augustus on 7 May, Augustine of Canterbury on 26 May, and the Augustine of Hippo the corpus keeps from the Romanian year.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-dervish alexander-the-sleepless alexander-with-thirty-martyrs':
    'Eighteen now. The new one is Alexander the Dervish on 26 May; the others are read in the el-05-20 entry for this name form.',
  'βικτωρινοσ victorinus-companion-of-agapitus victorinus-martyred-at-evreux':
    'Two men: Victorinus the companion of Agapitus on 18 February and the Victorinus martyred at Évreux on 25 May.',
  'θεκλα thecla-of-alexandria thecla-of-aza thecla-of-pereyaslavl thekla-companion-of-peter':
    'Four women: Alexandria on 6 September, Aza on 26 September, the companion of Peter on 26 March and Thecla of Pereyaslavl on 25 May.',
  'παγχαριοσ pancharius pancharius-25-may':
    'Two men: Pancharius of 19 March and the Pancharius of 25 May, whose page gives him no `types` at all.',
  'μαξιμοσ maximus-30-april maximus-7-may maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-martyred-at-evreux maximus-of-jerusalem maximus-of-kantara maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Seventeen now. The new one is the Maximus martyred at Évreux on 25 May; the others are read in the el-05-09 entry for this name form.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-kagovets dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-lampsacus dionysius-of-milan dionysius-of-pereyaslavl dionysius-of-radonezh dionysius-reader-of-alexandria dionysius-the-merciful':
    'Fifteen now. The new one is Dionysius of Milan on 25 May; the others are read in the el-05-12 entry for this name form.',
  'σεργιοσ sergius-martyr-2-january sergius-of-russia sergius-of-sukhtoma sergius-of-the-twelve-tribunes sergius-of-zographou sergius-the-confessor sergius-zipulin':
    'Nine now. The new one is one of the twelve tribunes the 24 May page names with Meletius the Stratelates; the others are read in the el-05-19 entry for this name form.',
  'φωτεινοσ photinos-son-of-photini photinus-of-the-twelve-tribunes':
    'Two men: Photinus of Lyons and a Photinus who is one of the twelve tribunes the 24 May page names with Meletius the Stratelates.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-the-twelve-tribunes theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas':
    'Twenty-seven now. The new one is one of the twelve tribunes the 24 May page names with Meletius the Stratelates; the others are read in the el-05-21 entry for this name form.',
  'μαρκελλοσ marcellus-of-sicily marcellus-of-the-twelve-tribunes marcellus-the-martyr-1-march':
    'Three men: the Marcellus of 1 March, the Marcellus of 22 May, and a Marcellus who is one of the twelve tribunes the 24 May page names with Meletius the Stratelates.',
  'φηλιξ felix-of-the-twelve-tribunes felix-the-bishop':
    'Two men: Felix of Korel on 18 April and a Felix who is one of the twelve tribunes the 24 May page names with Meletius the Stratelates.',
  'φαυστοσ faustus-companion-of-januarius faustus-disciple-of-dionysius-of-alexandria faustus-martyr-6-february faustus-of-the-twelve-tribunes':
    'Four men. The new one is one of the twelve tribunes the 24 May page names with Meletius the Stratelates; the others are read in the el-04-21 entry for this name form.',
  'διδυμοσ didymus-companion-of-theodora didymus-of-cyprus didymus-of-the-twelve-tribunes':
    'Three men: the companion of Theodora on 5 April, Didymus of Cyprus on 20 February and a Didymus who is one of the twelve tribunes the 24 May page names with Meletius the Stratelates.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-companion-of-meletius stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-xylinites':
    'Sixteen now. The new one is the companion of Meletius on 24 May; the others are read in the el-05-20 entry for this name form.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-epirus nicetas-of-medikion nicetas-of-novgorod nicetas-of-pythia nicetas-the-sinaite nicetas-the-stylite-of-pereslavl nikitas-of-nea-moni':
    'Nine now. The new one is Nicetas the Stylite of Pereslavl on 24 May; the others are read in the el-05-14 entry for this name form.',
  'μελετιοσ meletius-of-antioch meletius-of-kharkov meletius-of-lardos meletius-of-ryazan meletius-of-the-twelve-tribunes meletius-the-stratelates':
    'Six now, and **two of them stand on 24 May** as the page prints them: Meletius the Stratelates, whose company the day is, and a Meletius among his twelve tribunes. The others are read in the el-02-12 entry for this name form.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-meletius john-companion-of-peter john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-nea-moni john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'Fifty-three now. The new one is the companion of Meletius on 24 May; the others are read in the el-05-19 entry for this name form.',
  'κυριακοσ cyriacus-attendant-of-faustus cyriacus-of-eurychou cyriacus-son-of-hesperus cyriacus-the-infant':
    'Four now, and **two of the new ones share 24 May**: Cyriacus of Eurychou and Cyriacus the Infant, one of the children the page names in that company. The others are the son of Hesperus on 2 May and the Cyriacus of the el-09-29 entry.',
  'καλλινικοσ calinic-of-cernica callinicus-companion-of-eustathius callinicus-the-magus':
    'Three men. The new one is Callinicus the Magus, whom the 24 May company converted; the others are read in the el-01-29 entry for this name form.',
  'σιμων simon-of-moscow simon-of-suzdal simon-of-vladimir simon-of-zographou simon-the-martyr-3-february simon-the-zealot':
    'Six now. The new one is on 23 May; the others are read in the el-05-10 entry for this name form.',
  'πατρικιοσ patricius-of-bayeux patrick-of-ireland patrick-of-prusa':
    'Three men: Patrick of Prusa on 19 May, Patricius of Bayeux on 23 May and Patrick of Ireland on 17 March.',
  'παισιοσ paisius-8-january paisius-fool-for-christ-of-kyiv paisius-moskot paisius-of-galich':
    'Four men: the fool for Christ of Kyiv on 17 April, Paisius Moskot of the Slobodskaya twenty-seven on 19 May, Paisius of Galich on 23 May, and the Paisius of the el-01-19 entry.',
  'ιουλιανοσ helianus-of-the-forty-martyrs julian-companion-of-euboulos julian-companion-of-modestus julian-companion-of-pamphilus julian-of-africa julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-the-deacon-of-aegina julian-the-martyr-18-may':
    'Eleven now. The new one is Julian of Africa on 23 May; the others are read in the el-05-18 entry for this name form.',
  'δαμιανοσ damian-disciple-of-polychronius damian-of-agrafa damian-of-esphigmenou damian-of-georgia damian-of-pavia':
    'Five now. The new one is Damian of Georgia on 23 May; the others are read in the el-04-12 entry for this name form.',
  'σελευκοσ seleucus-23-may seleucus-of-cappadocia seleucus-of-tomis':
    'Three men: the Seleucus of 23 May, Seleucus of Cappadocia of the Pamphilus company on 16 February, and the Seleucus of the el-09-13 entry.',
  'ευφροσυνη euphrosyne-of-lesvos euphrosyne-of-polotsk':
    'Two women: Euphrosyne of Lesvos on 11 May and Euphrosyne of Polotsk on 23 May.',
  'δεσιδεριοσ desiderius-of-langres desiderius-of-vienne':
    'Two men on one day, printed as two entries of the 23 May page: Desiderius of Langres and Desiderius of Vienne, two Gallic bishops whom saint.gr keeps together and parts by their sees.',
  'βασιλειοσ basil-companion-of-euphrasius basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-braga basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Seventeen now. The new one is Basil of Braga on 23 May; the others are read in the el-05-02 entry for this name form.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta zacharias-of-corinth zacharias-of-jerusalem zacharias-of-prusa zacharias-son-of-barachias zacharias-son-of-carion zacharias-the-faster':
    'Eight now. The new one is Zacharias of Prusa on 22 May; the others are read in the el-03-30 entry for this name form.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-peloponnesian paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-three now. The new one is Paul the Peloponnesian on 22 May; the others are read in the el-05-18 entry for this name form.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-matynenko james-of-borovichi james-of-bryleyevo james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-stromyn james-of-zheleznyi-borok james-of-zographou-the-first james-of-zographou-the-second james-redozubov james-son-of-zebedee james-the-confessor':
    'Eighteen now. The new one is James of Borovichi on 22 May; the others are read in the el-05-19 entry for this name form.',
  'ελενη helen-of-auxerre helen-of-decani helen-the-empress':
    'Three women: Helen the Empress on 21 May, Helen of Dečani on 21 May as a second entry, and Helen of Auxerre on 22 May.',
  'ευτυχιοσ eutychius-27-march eutychius-companion-of-bassus eutychius-companion-of-januarius eutychius-martyred-in-africa eutychius-of-constantinople eutychius-of-mesopotamia eutychius-of-the-forty-martyrs eutychius-the-subdeacon':
    'Eight now. The new one is the Eutychius martyred in Africa on 21 May; the others are read in the el-05-08 entry for this name form.',
  'παχωμιοσ pachomius-6-may pachomius-companion-of-papyrinus pachomius-kedrov pachomius-of-keno pachomius-of-nerekhta pachomius-the-great pachomius-the-new-of-usaki':
    'Seven now. The new one is on 21 May; the others are read in the el-05-15 entry for this name form, where three stand on 15 May.',
  'ελενη helen-of-decani helen-the-empress':
    'Two women: Helen the Empress, whom both calendars keep with Constantine on 21 May, and the Helen of the el-05-26 reading.',
  'κυριλλοσ cyril-alfanov cyril-bishop-in-africa cyril-companion-of-photius cyril-ii-of-rostov cyril-of-alexandria cyril-of-astrakhan cyril-of-heliopolis cyril-of-jerusalem cyril-of-kantara cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-turov cyril-of-zographou cyril-the-philosopher cyril-vi-of-constantinople':
    'Sixteen now. The new one is Cyril II of Rostov on 21 May; the others are read in the el-05-04 entry for this name form.',
  'κωνσταντινοσ constantine-brancoveanu constantine-of-cornwall constantine-of-murom constantine-of-novotorzhanin constantine-of-strathclyde constantine-of-the-scots constantine-the-great cyril-the-philosopher':
    'Eight now, and **four of them stand on the Greek 21 May**: Constantine the Great, whom the Romanian keeps there too; Constantine Brâncoveanu, whom the Russian and Romanian keep on 16 august and the Greek here — one row per church and two days, not two men; and Constantine of Murom and Constantine of Novotorzhanin. Four entries of the page, four commemorations.',
  'χριστοφοροσ christopher christopher-20-april christopher-24-april christopher-of-adrianople christopher-of-antioch christopher-of-georgia christopher-of-saint-sabbas':
    'Seven now. The new one is Christopher of Antioch on 21 May; the others are read in the el-05-11 entry for this name form.',
  'μιχαηλ boris-michael-of-bulgaria macarius-notaras methodius-of-moravia michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-georgia michael-of-klops michael-of-murom michael-of-ulumbo michael-of-vourla michael-the-russian-1-april michael-the-wonderworker':
    'Thirteen now. The new one is Michael of Murom on 21 May; the others are read in the el-05-11 entry for this name form.',
  'αγαπητοσ agapitus-of-auxerre agapitus-of-markushevo agapitus-of-rome agapitus-of-synnada agapitus-the-blind':
    'Five now. The new one is Agapitus of Markushevo on 21 May; the others are read in the el-05-01 entry for this name form.',
  'τιμοθεοσ timothy-1-february timothy-companion-of-diogenes timothy-companion-of-terentius timothy-disciple-of-babylas timothy-husband-of-maura timothy-martyred-in-africa timothy-of-caesarea timothy-of-ephesus timothy-of-pskov timothy-of-symbola':
    'Ten now. The new ones are Timothy of Pskov on 20 May and the Timothy martyred in Africa on 21 May; the others are read in the el-05-07 entry for this name form.',
  'θαλασσιοσ thalassius thalassius-of-libya':
    'Two men, and the second folder is a reader’s deliberate call rather than an upgrade: Thalassius, whom the Greek keeps on 22 Φεβρουαρίου, and Thalassius of Libya on 20 Μαΐου. Two of saint.gr’s own days; the reader argued it in the row and named it as the one to merge if the author disagrees.',
  'στεφανοσ stefan-brancoveanu stephen-27-february stephen-andronov stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-montenegro stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-xylinites':
    'Fifteen now. The new one is Stephen of Montenegro on 20 May; the others are read in the el-05-18 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-murom theodore-of-novgorod theodore-of-pavia theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas':
    'Twenty-six now. The new ones are Theodore of Pavia on 20 May and the Theodore of 21 May; the others are read in the el-05-16 entry for this name form.',
  'μαρκοσ mark-of-arethusa mark-of-byblos mark-of-kantara mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-hermit-20-may mark-the-shepherd':
    'Ten now. The new one is Mark the Hermit on 20 May; the others are read in the el-05-14 entry for this name form.',
  'αναστασιοσ anastasius-8-january anastasius-of-antioch anastasius-of-brescia anastasius-of-nauplion anastasius-patriarch-of-jerusalem anastasius-the-sinaite':
    'Six now. The new one is Anastasius of Brescia on 20 May; the others are read in the el-01-22 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-terentius alexander-companion-of-thalaleus alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Seventeen now. The new one is the companion of Thalaleus on 20 May; the others are read in the el-05-14 entry for this name form.',
  'σπυριδων spyridon-evtushenko spyridon-of-the-cave':
    'New on 19 May: spyridon-evtushenko, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'φιλιπποσ philip-of-moscow philip-of-sicily philip-of-worms philip-ordinets':
    'New on 19 May: philip-ordinets, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 3 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-bialystok gabriel-of-georgia gabriel-of-lesnovo gabriel-of-novgorod-and-saint-petersburg gabriel-of-saint-stephens-jerusalem gabriel-protopopov gabriel-the-iberian gabriel-the-martyr-2-february gabriel-the-small gabriel-vsevolod-of-novgorod':
    'New on 19 May: gabriel-protopopov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 10 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-companion-of-paul andrew-mishenko andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo':
    'New on 19 May: andrew-mishenko, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 6 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'βλαδιμηροσ vladimir-metropolitan-of-kiev vladimir-vasilevsky':
    'New on 19 May: vladimir-vasilevsky, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'βικτωρ victor-20-april victor-26-february victor-of-glazov victor-of-thessalonica victor-yavorsky':
    'New on 19 May: victor-yavorsky, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 4 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'στεφανοσ stephen-27-february stephen-andronov stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-xylinites':
    'New on 19 May: stephen-andronov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 12 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-krasnokutsky paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'New on 19 May: paul-krasnokutsky, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 21 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'παισιοσ paisius-8-january paisius-fool-for-christ-of-kyiv paisius-moskot':
    'New on 19 May: paisius-moskot, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 2 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'λουκιανοσ lucian-fedotov lucian-of-tomis':
    'New on 19 May: lucian-fedotov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-kagovets dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-lampsacus dionysius-of-pereyaslavl dionysius-of-radonezh dionysius-reader-of-alexandria dionysius-the-merciful':
    'New on 19 May: dionysius-kagovets, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 13 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'αλεξιοσ alexios-the-recluse-of-kyiv alexis-of-goloseevo alexis-of-moscow alexis-of-voronezh alexis-tatarinov alexis-the-man-of-god alexis-toth':
    'New on 19 May: alexis-tatarinov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 6 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-doroshenko peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-lampsacus peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'New on 19 May: peter-doroshenko, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 21 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-efimov nicholas-katopinos nicholas-kedrov nicholas-migulin nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-metsovo nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-of-vounena nicholas-patriarch-of-georgia nicholas-the-bulgarian-17-may nicholas-the-mystikos nicholas-the-studite nicholas-velimirovich nicholas-zagorovsky':
    'New on 19 May: nicholas-efimov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; nicholas-migulin, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; nicholas-zagorovsky, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 18 of this name form stand on other Greek days and are read in the entries recorded for it before this one. Two of one name on one day is two entries of the page and so two commemorations, and the companies part them.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-matynenko james-of-bryleyevo james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-stromyn james-of-zheleznyi-borok james-of-zographou-the-first james-of-zographou-the-second james-redozubov james-son-of-zebedee james-the-confessor':
    'New on 19 May: james-matynenko, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; james-redozubov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 15 of this name form stand on other Greek days and are read in the entries recorded for it before this one. Two of one name on one day is two entries of the page and so two commemorations, and the companies part them.',
  'ιλαριων hilarion-6-may hilarion-of-pokrovskoe hilarion-of-zographou hilarion-the-new-of-cyprus hilarion-the-new-of-georgia hilarion-the-new-of-pelecete hilarion-zhukov':
    'New on 19 May: hilarion-zhukov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 6 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'γερμανοσ germanos-of-stolobnoe germanus-of-constantinople germanus-of-dobrogea germanus-of-kantara germanus-of-novgorod germanus-of-sagmata':
    'New on 19 May: germanus-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 5 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'γερασιμοσ gerasimus-of-boltinsk gerasimus-of-great-perm gerasimus-of-kantara gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'New on 19 May: gerasimus-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 5 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'γενναδιοσ gennadius-of-corfu gennadius-of-kantara gennadius-of-kostroma gennadius-of-novgorod gennadius-of-the-svir-desert gennadius-the-dionysiate':
    'New on 19 May: gennadius-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 5 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'κυπριανοσ cyprian-companion-of-quadratus cyprian-of-antioch cyprian-of-zographou cyprian-yankovsky':
    'New on 19 May: cyprian-yankovsky, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 3 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'βαρσανουφιοσ barsanuphius-of-optina barsanuphius-of-tver barsanuphius-of-tver-and-kazan barsanuphius-of-zographou barsanuphius-the-great varsanuphius-mamchich':
    'New on 19 May: varsanuphius-mamchich, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 5 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-martkopi anthony-of-novgorod anthony-of-radonezh anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-gorban antony-of-korel antony-of-novgorod antony-of-vilnius antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'New on 19 May: antony-gorban, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 20 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'θεογνωστοσ theognostus-of-kantara theognostus-of-kyiv':
    'New on 19 May: theognostus-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'θεοκτιστοσ theoctistus-of-kantara theoctistus-of-st-sabbas theoctistus-the-martyr':
    'New on 19 May: theoctistus-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 2 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'σεργιοσ sergius-martyr-2-january sergius-of-russia sergius-of-sukhtoma sergius-of-zographou sergius-the-confessor sergius-zipulin':
    'New on 19 May: sergius-of-sukhtoma, on his own line; sergius-zipulin, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 4 of this name form stand on other Greek days and are read in the entries recorded for it before this one. Two of one name on one day is two entries of the page and so two commemorations, and the companies part them.',
  'μαξιμοσ maximus-30-april maximus-7-may maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-of-jerusalem maximus-of-kantara maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'New on 19 May: maximus-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 15 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'μαρκοσ mark-of-arethusa mark-of-byblos mark-of-kantara mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-shepherd':
    'New on 19 May: mark-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 8 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'ιωσηφ joseph-of-alaverdi joseph-of-aleppo joseph-of-astrakhan joseph-of-bisericani joseph-of-kantara joseph-of-lythrodontas joseph-of-optina joseph-the-hymnographer':
    'New on 19 May: joseph-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 7 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'ιερεμιασ jeremiah-of-kantara jeremiah-the-egyptian jeremiah-the-prophet jeremias-i-of-constantinople':
    'New on 19 May: jeremiah-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 3 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'κυριλλοσ cyril-alfanov cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-astrakhan cyril-of-heliopolis cyril-of-jerusalem cyril-of-kantara cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-turov cyril-of-zographou cyril-the-philosopher cyril-vi-of-constantinople':
    'New on 19 May: cyril-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 14 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'κονων conon-of-cyprus conon-of-isauria conon-of-kantara conon-of-penthucla conon-the-gardener':
    'New on 19 May: conon-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 4 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'βαρναβασ barnabas-of-gethsemane barnabas-of-kantara':
    'New on 19 May: barnabas-of-kantara, one of the thirteen monks of Kantara in Cyprus. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'μενανδροσ menander-companion-of-patrick menander-the-soldier':
    'New on 19 May: menander-companion-of-patrick, one of the martyrs the page names with Patrick of Prusa. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'ιωαννησ john-arnaoutogiannis john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-fedorov-of-krasnokutsk john-feodorov-of-tambov john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-kononenko john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kantara john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-santa-cruz john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-timonov john-with-minas-and-david':
    'New on 19 May: john-arnaoutogiannis, on his own line; john-fedorov-of-krasnokutsk, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; john-feodorov-of-tambov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; john-kononenko, one of the twenty-seven new martyrs of Slobodskaya near Kharkov; john-of-kantara, one of the thirteen monks of Kantara in Cyprus; john-of-santa-cruz, on his own line; john-timonov, one of the twenty-seven new martyrs of Slobodskaya near Kharkov. The other 44 of this name form stand on other Greek days and are read in the entries recorded for it before this one. Two of one name on one day is two entries of the page and so two commemorations, and the companies part them.',
  'ιγνατιοσ ignatius-brianchaninov ignatius-of-mariupol ignatius-the-sinaite ignatius-venerable-19-may':
    'New on 19 May: ignatius-venerable-19-may, on his own line. The other 3 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'δημητριοσ demetrius-24-april demetrius-donskoi demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-moscow demetrius-of-prilutsk demetrius-the-peloponnesian demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'New on 19 May: demetrius-donskoi, on his own line. The other 11 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'κορνηλιοσ cornelius-of-komel cornelius-of-paleostrov cornelius-of-pskov':
    'New on 19 May: cornelius-of-komel, on his own line; cornelius-of-paleostrov, on his own line. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one. Two of one name on one day is two entries of the page and so two commemorations, and the companies part them.',
  'ακολουθοσ acolouthus-of-the-thebaid acoluthus-the-martyr':
    'New on 19 May: acolouthus-of-the-thebaid, on his own line. The other 1 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'ακακιοσ acacius-companion-of-patrick acacius-of-amida acacius-of-gaul acacius-of-latros acacius-of-melitene acacius-of-the-forty-martyrs acacius-of-tver acacius-the-centurion acacius-the-executioner acacius-the-kausokalyvite acacius-the-new-of-neochorion':
    'New on 19 May: acacius-companion-of-patrick, one of the martyrs the page names with Patrick of Prusa. The other 10 of this name form stand on other Greek days and are read in the entries recorded for it before this one.',
  'θεοδοτη theodote-daughter-of-athanasia theodote-mother-of-the-unmercenaries theodote-of-ancyra':
    'Two women: the Theodote of 18 May and the eighth woman of the 18 May company, whom the page names and the corpus does not fold — the reader who read that day left her without a folder and said so.',
  'στεφανοσ stephen-27-february stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-khirsa stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-patriarch-of-constantinople stephen-xylinites':
    'Eleven now. The new one is on 18 May; the others are read in the el-04-27 entry for this name form.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-andrew paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty-one now. The new one is the companion of Andrew on 18 May; the others are read in the el-05-03 entry for this name form.',
  'μαρτινιανοσ martinian-of-caesarea martinian-of-white-lake martinian-of-zographou martinianus-of-areobindus':
    'Four men. The new one is Martinianus of Areobindus on 18 May; the others are read in the el-02-13 entry for this name form.',
  'ηρακλειοσ heraclius-of-athens heraclius-of-the-forty-martyrs':
    'Two men: Heraclius of Athens on 18 May and Heracles of Carthage on 11 March, whose Greek forms fold together.',
  'ιουλιανοσ helianus-of-the-forty-martyrs julian-companion-of-euboulos julian-companion-of-modestus julian-companion-of-pamphilus julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-the-deacon-of-aegina julian-the-martyr-18-may':
    'Ten now. The new one is the Julian of 18 May; the others are read in the el-03-06 entry for this name form.',
  'δαβιδ david-brother-of-tarichan david-of-gareji david-of-mytilene david-of-wales david-son-of-prince-theodore david-with-minas-and-john':
    'Six now. The new one is David the brother of Tarichan on 18 May; the others are read in the el-04-12 entry for this name form.',
  'brother david tarichan david-brother-of-tarichan tarichan':
    'The two brothers the 18 May page names together, each named after the other, which is what folds them.',
  'andrew companion mesopotamia paul andrew-companion-of-paul paul-companion-of-andrew':
    'The pair the 18 May page names together, each named after the other, which is what folds them.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-companion-of-paul andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo':
    'Six now. The new one is the companion of Paul in Mesopotamia on 18 May; the others are read in the el-05-15 entry for this name form.',
  'θεοφανησ theophan-the-recluse theophanes-of-peritheorion theophanes-of-sigriane theophanes-the-merciful-of-gaza theophanes-the-myrrh-streamer-of-cyprus theophanes-venerable-17-may':
    'Six now, and **two of them stand on 17 May** as two entries — and this is the pair a reader referred up. The Romanian keeps a bare «Teofan» on 17 mai, which went to the Meteora brother on the ground that doxologia keeps Nectarie and Teofan as a pair; saint.gr’s own 17 Μαΐου prints the Cypriot myrrh-streamer of `/506/` as well, who is this wave’s new folder. Two entries, two commemorations, and the Romanian row’s owner is the reader’s call recorded in ro-run/FINDINGS.md.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-kedrov nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-metsovo nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-of-vounena nicholas-patriarch-of-georgia nicholas-the-bulgarian-17-may nicholas-the-mystikos nicholas-the-studite nicholas-velimirovich':
    'Eighteen now, and **two of the new ones share 17 May** as two entries: Nicholas of Metsovo, whom the Romanian keeps there too and whose own page notes that some synaxaria — Nikodemos the Hagiorite among them — keep him on 16 Μαΐου instead, and Nicholas the Bulgarian. The others are read in the el-05-16 entry for this name form.',
  'ιωνασ jonah-martyr-29-march jonah-of-kyiv jonah-of-moscow jonah-of-odessa jonah-of-the-lavra-of-pskov jonas-of-great-perm jonas-the-lerian':
    'Seven now. The new one is Jonah of Odessa on 17 May; the others are read in the el-03-29 entry for this name form.',
  'ελεαζαροσ eleazar-of-anzersky eleazar-of-vazhen':
    'Two men: Eleazar of Vazhen on 17 May and the Eleazar of the el-08-01 entry.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-christianoupolis athanasius-of-corinth athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-confessor':
    'Twelve now. The new one is Athanasius of Christianoupolis on 17 May; the others are read in the el-04-23 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-tomsk theodore-of-vrsac theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas':
    'Twenty-four now. The new one is Theodore of Vršac on 16 May; the others are read in the el-05-12 entry for this name form.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-terentius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-new-hieromartyr-1944 macarius-notaras macarius-of-ierissos macarius-of-kalyazin macarius-of-kios macarius-of-kyiv macarius-of-paphos macarius-of-pelecete macarius-of-pisma macarius-of-rome macarius-of-the-altai macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Twenty now, and the new one is **the pair a reader referred up**: Macarius of the Altai on 16 May, whose page gives «Δεν έχουμε λεπτομέρειες» and a head line of 1847, against saint.gr’s Μακάριος ο Ιεραπόστολος of 18 Μαΐου, headed 1792 and described in full as *ο Ιεραπόστολος των Αλταΐων*. Very probably one man on two of its days; 18 May is the next batch but one and the reading is banked in that reader’s report. The others are read in the el-05-01 entry for this name form.',
  'λαυρεντιοσ laurence-martyr-9-january laurence-of-canterbury laurence-of-cyprus laurence-of-komel laurence-of-salamina laurence-of-turov laurence-venerable-10-may':
    'Seven now. The new one is Laurence of Komel on 16 May; the others are read in the el-04-30 entry for this name form.',
  'ονωρατοσ honoratus-of-amiens honoratus-of-arles':
    'Two men: Honoratus of Amiens on 16 May and the Honoratus of the el-01-16 entry.',
  'κασσιανοσ cassian-companion-of-peter cassian-of-axylou cassian-of-bosoi cassian-of-komel cassian-the-recluse-of-the-kyiv-caves john-cassian':
    'Six now. The new one is Cassian of Komel on 16 May; the others are read in the el-05-08 entry for this name form.',
  'παχωμιοσ pachomius-6-may pachomius-companion-of-papyrinus pachomius-kedrov pachomius-of-keno pachomius-of-nerekhta pachomius-the-great':
    'Six now, and **three of them stand on 15 May** as three entries of the page: Pachomius the Great, whom the Romanian keeps there too, with Pachomius of Keno and Pachomius Kedrov. The others are the companion of Papyrinus on 13 January and Nerekhta on 23 March.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-kedrov nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-of-vounena nicholas-patriarch-of-georgia nicholas-the-mystikos nicholas-the-studite nicholas-velimirovich':
    'Sixteen now, and the two new ones are a day apart: Nicholas Kedrov on 15 May and Nicholas the Mystikos on 16 May. The others are read in the el-05-09 entry for this name form.',
  'αρεθασ aretas-of-the-altai arethas-the-recluse':
    'Two men: Arethas the Recluse of Tver on 2 March and Aretas of the Altai on 15 May — a folder whose page gives him only «Άγιος» and so carries no `types` at all.',
  'σιλβανοσ silvanus-8-march silvanus-of-palestine silvanus-of-tabennisi':
    'Three men: the Silvanus of 8 March, Palestine on 18 January and Silvanus of Tabennisi on 15 May.',
  'ησαιασ isaiah-companion-of-terentius isaiah-of-rostov isaiah-of-the-kyiv-caves isaiah-of-valaam isaiah-the-egyptian isaiah-the-prophet':
    'Six now, and **two of the new ones share 15 May** as two entries: Isaiah of Rostov and Isaiah of the Kyiv Caves. The others are read in the el-04-10 entry for this name form.',
  'ευφροσυνοσ euphrosynus-of-pskov euphrosynus-of-sinozero euphrosynus-of-tver euphrosynus-the-martyr-6-march':
    'Four men: Sinozero on 20 March, Tver on 2 March, the martyr of 6 March and Euphrosynus of Pskov on 15 May.',
  'δημητριοσ demetrius-24-april demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-moscow demetrius-of-prilutsk demetrius-the-peloponnesian demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'Twelve now. The new one is Demetrius of Moscow on 15 May; the others are read in the el-04-23 entry for this name form.',
  'βαρβαροσ barbarus-6-may barbarus-companion-of-alexander barbarus-the-myrrh-streamer':
    'Three men, and the pair a reader referred up is here: Barbarus the Myrrh-streamer of 15 May against `barbarus-6-may`, whom this wave upgraded, and against the Pentapolite of 23 Ιουνίου, where saint.gr contradicts its own dating — 1562 in its heading against the 820 to 829 this draft reads. Three of saint.gr’s own days for what may be one man; the folders stand and the reconciliation is the author’s, in ro-run/FINDINGS.md.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-of-monodendri andrew-of-mytilene andrew-of-raphailovo':
    'Five men. The new one is Andrew of Monodendri on 15 May; the others are read in the el-05-14 entry for this name form.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-epirus nicetas-of-medikion nicetas-of-novgorod nicetas-of-pythia nicetas-the-sinaite':
    'Seven now. The new one is on 14 May; the others are read in the el-05-12 entry for this name form.',
  'μαρκοσ mark-of-arethusa mark-of-byblos mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-cretan-of-smyrna mark-the-deaf mark-the-evangelist mark-the-shepherd':
    'Seven now. The new one is on 14 May; the others are read in the el-03-29 entry for this name form.',
  'λεοντιοσ leontius-24-april leontius-of-scythopolis leontius-of-the-forty-martyrs leontius-patriarch-of-jerusalem':
    'Four men: the Leontius of 24 April, Scythopolis on 4 May, the Leontius of 14 May, and `leontius-the-canonarch` of 17 Ιουνίου.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-goldsmith-of-shumen john-the-hut-dweller john-the-iberian john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-with-minas-and-david':
    'Forty-four now. The new one is John the Goldsmith of Shumen on 14 May; the others are read in the el-05-12 entry for this name form.',
  'ισιδωροσ isidore-10-may isidore-8-january isidore-of-antioch isidore-of-chios isidore-of-cordoba isidore-of-pelusium isidore-of-rostov isidore-of-samtavisi isidore-of-seville':
    'Nine now, and **two of them stand on 14 May** as two entries: Isidore of Chios, whom the Romanian keeps there too, and Isidore of Rostov. The others are read in the el-05-10 entry for this name form.',
  'βαρβαροσ barbarus-6-may barbarus-companion-of-alexander':
    'Two men: the companion of Alexander on 14 May and `barbarus-6-may`, whom this wave upgraded on 6 May — and whom a reader reads as the same man as the Pentapolite of 23 June, where saint.gr contradicts its own dating. That pair is in ro-run/FINDINGS.md.',
  'ανδρεασ andrew-6-january andrew-abbot-of-tobolsk andrew-of-mytilene andrew-of-raphailovo':
    'Four men: the Andrew of 6 January, Mytilene on 21 February, Raphailovo on 14 March and the abbot of Tobolsk on 14 May.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-barbarus alexander-companion-of-terentius alexander-martyr-1-april alexander-of-cartagena alexander-of-kentoukellai alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Sixteen now, and **two of the new ones share 14 May**: the companion of Barbarus, one of the three that page names, and Alexander of Kentoukellai. The others are read in the el-05-11 entry for this name form.',
  'acoluthus alexander barbarus companion acoluthus-the-martyr alexander-companion-of-barbarus barbarus-companion-of-alexander':
    'The three the 14 May page names together, each named after the others, which is what folds them.',
  'ουαλεριανοσ valerian-4-may valerian-of-auxerre valerian-of-trebizond':
    'Three men: Valerian of Auxerre on 13 May and the two read in the el-05-04 entry for this name form.',
  'ονησιμοσ onesimus-10-may onesimus-of-soissons onesimus-the-apostle':
    'Three men: the Onesimus of 10 May, the Apostle on 15 February and Onesimus of Soissons on 13 May.',
  'νικηφοροσ nicephorus-13-may nicephorus-alfanov nicephorus-martyr-1-march nicephorus-martyr-8-february nicephorus-of-antioch nicephorus-of-corinth nicephorus-of-crete nicephorus-of-the-svir-desert nikephoros-of-chios':
    'Nine now, and the new one is the open pair a reader left: `nicephorus-13-may`, drafted from a bare Romanian line, against `nicephorus-4-may`, whom this wave upgraded nine days earlier. Neither page names the other and the reader drafted them as two men; it is in ro-run/FINDINGS.md for the author. The rest are read in the el-05-04 entry for this name form.',
  'γλυκερια glyceria-of-novgorod glyceria-of-traianopolis':
    'Two women on one day, printed as two entries of the 13 May calendar: Glyceria of Traianopolis, the second-century martyr whom the Romanian keeps there too, and Glyceria of Novgorod. The Novgorod folder says so in its own words and now relates the martyr, which `tests/life-links.test.mjs` asked for.',
  'φιλιπποσ philip-of-moscow philip-of-sicily philip-of-worms':
    'Three men: Worms on 3 May, Philip of Sicily on 12 May and the Philip of the el-10-11 entry.',
  'παγκρατιοσ pancratius-of-tauromenium pancratius-the-martyr-12-may pancratius-the-recluse-of-the-caves':
    'Three men: the martyr of 12 May, Pancharius of 19 March, and the Pancratius of the el-07-09 entry.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-epirus nicetas-of-medikion nicetas-of-pythia nicetas-the-sinaite':
    'Six now. The new one is Nicetas the Sinaite on 12 May; the others are read in the el-05-04 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-kythera theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas':
    'Twenty-three now. The new one is Theodore of Kythera on 12 May; the others are read in the el-04-21 entry for this name form.',
  'λεων leo-companion-of-gervasius leo-companion-of-manuel leo-of-catania leo-of-methone leo-of-nicaea leo-of-patara leo-of-samos leo-the-great':
    'Eight now. The new one is Leo of Methone on 12 May; the others are read in the el-04-26 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-serres john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-the-wallachian john-with-minas-and-david':
    'Forty-two now, and **two of the new ones share 12 May** as two entries: John the Wallachian, whom the Romanian keeps there too, and John of Serres. The rest are read in the el-05-07 entry for this name form.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-dimitsana euthymius-of-jerusalem euthymius-of-karelia euthymius-of-madytos euthymius-of-novgorod euthymius-of-suzdal euthymius-of-syanzhema euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god euthymius-the-wonderworker':
    'Twelve now. The new one is Euthymius of Jerusalem on 12 May; the others are read in the el-04-18 entry for this name form.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-pereyaslavl dionysius-of-radonezh dionysius-reader-of-alexandria dionysius-the-merciful':
    'Twelve now. The new one is Dionysius of Radonezh on 12 May; the others are read in the el-05-08 entry for this name form.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-martkopi anthony-of-novgorod anthony-of-radonezh anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-korel antony-of-novgorod antony-of-vilnius antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Twenty now. The new one is Anthony of Radonezh on 12 May; the others are read in the el-04-18 entry for this name form.',
  'θεοφυλακτοσ theophylact-of-nicomedia theophylact-of-stavropol':
    'Two men: Theophylact of Nicomedia on 8 March and Theophylact of Stavropol on 11 May.',
  'νικοδημοσ nicodemus-of-serbia nicodemus-of-the-cave':
    'Two men: Nicodemus of Serbia on 11 May and the Nicodemus of the Cave the corpus keeps from the Russian year — the pair whose identical line on 28 September and 15 February is an open question in ro-run/FINDINGS.md.',
  'ιωσηφ joseph-of-alaverdi joseph-of-aleppo joseph-of-astrakhan joseph-of-bisericani joseph-of-lythrodontas joseph-of-optina joseph-the-hymnographer':
    'Seven now. The new one is Joseph of Astrakhan on 11 May; the others are read in the el-01-26 entry for this name form.',
  'χριστοφοροσ christopher christopher-20-april christopher-24-april christopher-of-adrianople christopher-of-georgia christopher-of-saint-sabbas':
    'Six now. The new one is Christopher of Georgia on 11 May; the others are read in the el-04-23 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-terentius alexander-martyr-1-april alexander-of-cartagena alexander-of-kharkov alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Fourteen now. The new one is Alexander of Kharkov on 11 May; the others are read in the el-04-20 entry for this name form.',
  'συνεσιοσ synesius-of-irkutsk synesius-of-lysi':
    'Two men: the Synesius of 10 May and Synesius of Lysi on 1 March.',
  'σιμων simon-of-moscow simon-of-vladimir simon-of-zographou simon-the-martyr-3-february simon-the-zealot':
    'Five now. The new one is Simon of Vladimir on 10 May; the others are read in the el-04-30 entry for this name form.',
  'φιλημων philemon-companion-of-domninus philemon-companion-of-fortunianus philemon-disciple-of-passarion philemon-of-cyzicus philemon-of-gaza philemon-of-karpathos':
    'Six now. The new one is the disciple of Passarion on 10 May; the others are read in the el-03-21 entry for this name form.',
  'ονησιμοσ onesimus-10-may onesimus-the-apostle':
    'Two men: the Onesimus of 10 May and Onesimus the Apostle, whom the Greek keeps on 15 February.',
  'ισιδωροσ isidore-10-may isidore-8-january isidore-of-antioch isidore-of-cordoba isidore-of-pelusium isidore-of-samtavisi isidore-of-seville':
    'Seven now. The new one is the Isidore of 10 May; the others are read in the el-04-30 entry for this name form.',
  'αγαπιοσ agapius-disciple-of-babylas agapius-disciple-of-passarion agapius-martyr-1-march agapius-of-apamea agapius-of-colciu agapius-of-numidia':
    'Six now. The new one is the disciple of Passarion on 10 May; the others are read in the el-04-29 entry for this name form.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-of-vounena nicholas-patriarch-of-georgia nicholas-the-studite nicholas-velimirovich':
    'Twelve now. The new one is on 9 May; the others are read in the el-04-24 entry for this name form.',
  'μαξιμοσ maximus-30-april maximus-7-may maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-of-jerusalem maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Fifteen now. The new one is Maximus of Jerusalem on 9 May; the others are read in the el-05-07 entry for this name form.',
  'γορδιανοσ gordian-9-may gordian-of-tomis':
    'Two men: the Gordian of 9 May and the Gordian of the el-09-13 entry.',
  'κωνσταντινοσ constantine-of-cornwall constantine-of-strathclyde constantine-of-the-scots':
    'Three men: Cornwall on 9 March, Strathclyde on 11 March and Constantine of the Scots on 9 May.',
  'καλλινικη callinice-of-galatia callinike-9-may':
    'Two women: the Callinike of 9 May and Callinice of Galatia on 22 March.',
  'ακυλινα aquilina-9-may aquilina-the-martyr-7-april':
    'Two women: the Aquilina of 9 May and Aquilina the martyr of 7 April.',
  'ζωσιμασ zosimas-24-january zosimas-of-carthage zosimas-of-kumurdo zosimas-of-palestine zosimas-of-solovki zosimas-of-volokolamsk zosimas-of-vorbozom':
    'Seven now. The new one is on 8 May; the others are read in the el-05-01 entry for this name form.',
  'ελλαδιοσ helladius-of-auxerre helladius-the-layman':
    'Two men: Helladius of Auxerre on 8 May and the Helladius of the el-05-28 reading, which is another day.',
  'διονυσιοσ dionysius-8-may dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-pereyaslavl dionysius-reader-of-alexandria dionysius-the-merciful':
    'Eleven now. The new one is the Dionysius of 8 May; the others are read in the el-04-19 entry for this name form.',
  'κασσιανοσ cassian-companion-of-peter cassian-of-axylou cassian-of-bosoi cassian-the-recluse-of-the-kyiv-caves john-cassian':
    'Five now. The new one is Cassian the Recluse of the Kyiv Caves on 8 May; the others are read in the el-03-26 entry for this name form.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-georgia arsenius-of-ikalto arsenius-of-novgorod arsenius-of-rostov arsenius-of-the-kyiv-caves arsenius-of-varnakova arsenius-the-great':
    'Twelve now, and **four of them stand on the Greek 8 May** as four entries of the page: Arsenius the Great, whom the Romanian keeps there too, with Novgorod, the Kyiv Caves and Varnakova. The others are read in the el-05-03 entry for this name form.',
  'ταρασιοσ tarasius-of-constantinople tarasius-of-lycaonia':
    'Two men: Tarasius of Constantinople, the patriarch, whom both calendars keep on 25 February, and Tarasius of Lycaonia, whom saint.gr keeps on 7 May and whose folder this batch makes. A later reader checked 8 Μαΐου for him, where Delehaye puts a Tarasius, and found none on that page.',
  'σατορνινοσ satorninus-7-may saturninus-companion-of-plotinus saturninus-of-corfu':
    'Three men of this Greek form: Corfu on 29 April, the Saturninus of 7 May, and the one read beside them there.',
  'ρουφινοσ rufinus-7-may rufinus-of-rome rufinus-the-deacon':
    'Three men: Rome on 28 February, the deacon on 7 April and the Rufinus of 7 May.',
  'μαξιμοσ maximus-30-april maximus-7-may maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Fourteen now. The new one is on 7 May; the others are read in the el-04-30 entry for this name form.',
  'ιουβεναλιοσ juvenal-of-narni juvenalius-7-may':
    'Two men: the Juvenal of 7 May and the Juvenal of the el-07-02 entry.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-of-zedazeni john-philosopher-of-georgia john-psychaites john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Forty now, and **two of the new ones share 7 May** as two entries: John of Zedazeni, whom the Romanian keeps there too and whose thirteen Syrian disciples the corpus already holds, and John Psychaites. Three of those disciples — Anthony of Martkopi, David of Gareji, Joseph of Alaverdi — now relate their teacher, which `tests/life-links.test.mjs` asked for. The rest are read in the el-04-29 entry for this name form.',
  'φλαβιοσ flavius-of-nicomedia flavius-of-the-forty-martyrs':
    'Two men: Flavius of Nicomedia on 7 May and Flavius of the Forty of Sebaste on 9 March.',
  'κοδρατοσ codratus-companion-of-alexandra codratus-of-nicomedia codratus-the-executioner quadratus-of-corinth quadratus-of-the-east':
    'Five now. The new one is Codratus of Nicomedia on 7 May; the others are read in the el-04-21 entry for this name form.',
  'augustinus augustus brother augustinus-brother-of-augustus augustus-brother-of-augustinus':
    'The two brothers the 7 May page names together, each named after the other, which is what folds them.',
  'αυγουστινοσ augustine-of-hippo augustinus-brother-of-augustus':
    'Two men: Augustinus the brother of Augustus, one of the Nicomedian company of 7 May, and the Augustine the corpus keeps from the Romanian year.',
  'θερινοσ therinos therinus':
    'Two men, and the reading a reader proposed holds: Therinus of 23 April is beheaded with Donatus, and Therinos — or Therianos, both forms in one sentence of the page — is martyred on 6 May with Danax and Mesiros. Two days, two companies, two men.',
  'σεραφειμ seraphim-of-dombou seraphim-of-sarov seraphim-of-vyritsa':
    'Three men: Seraphim of Dombou on 6 May and the two read in the el-03-21 entry for this name form.',
  'ιλαριων hilarion-6-may hilarion-of-pokrovskoe hilarion-of-zographou hilarion-the-new-of-cyprus hilarion-the-new-of-georgia hilarion-the-new-of-pelecete':
    'Six now, and **the pair a reader referred up is settled here**: saint.gr prints Ιλάριος on 4 Μαΐου, whom this wave upgraded on the folder the Romanian keeps there, and Ιλαρίων on 6 Μαΐου in the trio with Mamas and Pachomius, whom the corpus keeps on 6 mai. Two of its own days, and the 6 May man belongs to a company the other does not, so two folders stand. The rest are read in the el-03-28 entry for this name form.',
  'ηλιοδωροσ heliodorus-companion-of-mark-the-shepherd heliodorus-of-africa':
    'Two men: Heliodorus of Africa on 6 May and the Heliodorus of the el-07-06 entry.',
  'δονατοσ donatus-23-april donatus-6-may donatus-martyr-at-venice donatus-of-euroea':
    'Four men, and the close pair is read: the Donatus of 23 April is beheaded with Therinus, and the Donatus of 6 May is named with Heliodorus of Africa — two of saint.gr’s own days, two companies, and so two men, which is the reading a reader proposed and this writer confirms. The others are Donatus of Euroea on 30 April and the Donatus read in the el-02-17 entry.',
  'μαρθα maria-of-vladimir martha-of-aza martha-of-monemvasia martha-sister-of-lykarion':
    'Four women: Maria of Vladimir under her second name on 19 March, Aza on 26 September, the sister of Lykarion on 8 February, and Martha of Monemvasia on 5 May.',
  'γεροντιοσ gerontius-of-milan gerontius-the-canonarch gerontius-the-martyr':
    'Three men: the martyr of 1 April and the canonarch of the Kyiv Caves on the same day, two entries there, and Gerontius of Milan on 5 May.',
  'αδριανοσ adrian-of-caesarea adrian-of-canterbury adrian-of-megara adrian-of-monza adrian-of-poshekhonye adrian-the-martyr-17-april adrianus-of-cyprus':
    'Seven now. The new one is Adrian of Monza on 5 May; the others are read in the el-04-17 entry for this name form.',
  'νικητασ nicetas-alfanov nicetas-of-apollonias nicetas-of-epirus nicetas-of-medikion nicetas-of-pythia':
    'Five now. The new one is Nicetas Alfanov on 4 May; the others are read in the el-02-19 entry for this name form.',
  'νικηφοροσ nicephorus-alfanov nicephorus-martyr-1-march nicephorus-martyr-8-february nicephorus-of-antioch nicephorus-of-corinth nicephorus-of-crete nicephorus-of-the-svir-desert nikephoros-of-chios':
    'Eight now. The new one is Nicephorus Alfanov on 4 May; the others are read in the el-05-01 entry for this name form. **A reader has left `nicephorus-4-may` open** against a `nicephorus-13-may` drafted from a bare Romanian line nine days off; that pair is in ro-run/FINDINGS.md and neither day settles it.',
  'ισαακ isaac-alfanov isaac-the-martyr-22-september':
    'Two men: Isaac Alfanov on 4 May and the Isaac of the el-04-21 entry.',
  'κυριλλοσ cyril-alfanov cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-astrakhan cyril-of-heliopolis cyril-of-jerusalem cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-turov cyril-of-zographou cyril-vi-of-constantinople':
    'Thirteen now. The new one is Cyril Alfanov on 4 May; the others are read in the el-04-28 entry for this name form.',
  'κλημησ clement-alfanov clement-martyr-23-february clement-of-ancyra clement-of-mount-sagmation clement-the-hymnographer':
    'Five now. The new one is Clement Alfanov, one of the five brothers the 4 May page names; the others are read in the el-04-30 entry for this name form.',
  'μακροβιοσ macrobius-of-scythopolis macrobius-of-tomis':
    'Two men: Macrobius of Scythopolis on 4 May and the Macrobius of the el-09-13 entry.',
  'λεοντιοσ leontius-24-april leontius-of-scythopolis leontius-of-the-forty-martyrs':
    'Three men: the Leontius of 24 April, Leontius of Scythopolis on 4 May, and `leontius-the-canonarch` of 17 Ιουνίου, whom a reader answered against `gerontius-the-canonarch` as another man.',
  'αφροδισιοσ aphrodisius-companion-of-peter aphrodisius-of-alexandria aphrodisius-of-scythopolis':
    'Three men: the companion of Peter on 14 March, Alexandria on 30 April and Aphrodisius of Scythopolis on 4 May.',
  'αντωνινοσ antoninus-20-april antoninus-of-ramas antoninus-of-scythopolis':
    'Three men: the Antoninus of 20 April, Antoninus of Scythopolis on 4 May, and the Antoninus of the el-01-23 entry.',
  'φιλιπποσ philip-of-moscow philip-of-worms':
    'Two men: Philip of Worms on 3 May and the Philip of the el-10-11 entry.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-vilnius paul-of-zographou paul-the-martyr-3-february paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Twenty now. The new one is Paul of Vilnius on 3 May; the others are read in the el-04-30 entry for this name form.',
  'μαμασ mamas-companion-of-hermogenes mamas-of-georgia':
    'Two men: Mamas of Georgia on 3 May and the Mamas of the el-09-02 entry. **A reader has read a third** in the trio the Greek keeps on 6 Μαΐου with Hilarion and Pachomius; that day is not written yet.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-moesia gregory-of-nicomedia gregory-of-novgorod gregory-of-nyssa gregory-of-rostov gregory-of-sinai gregory-the-dialogist gregory-the-elder gregory-the-hesychast-of-athos gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius gregory-v-of-constantinople':
    'Sixteen now. The new one is Gregory of Rostov on 3 May; the others are read in the el-04-06 entry for this name form.',
  'θεοφανησ theophan-the-recluse theophanes-of-peritheorion theophanes-of-sigriane theophanes-the-merciful-of-gaza':
    'Four men: Theophanes of Peritheorion on 3 May and the three read in the el-03-12 entry for this name form. **A reader has flagged a fifth**, the Cypriot myrrh-streamer of 17 Μαΐου against the Meteora brother the Romanian keeps as «Teofan»; that pair is a question for the author and is in ro-run/FINDINGS.md.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-of-argos peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Twenty now. The new one is Peter of Argos on 3 May; the others are read in the el-04-10 entry for this name form.',
  'μιχαηλ boris-michael-of-bulgaria macarius-notaras michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-georgia michael-of-klops michael-of-vourla michael-the-russian-1-april michael-the-wonderworker':
    'Ten now. The new one is Michael of Georgia on 3 May; the others are read in the el-05-01 entry for this name form.',
  'arsenius companion michael arsenius-of-georgia michael-of-georgia':
    'The pair the 3 May page names together, each named after the other, which is what folds them.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-georgia arsenius-of-ikalto arsenius-of-rostov':
    'Eight now. The new one is Arsenius of Georgia on 3 May; the others are read in the el-04-13 entry for this name form.',
  'θεοδουλοσ theodulus-companion-of-agapitus theodulus-companion-of-agathopodes theodulus-companion-of-eventius theodulus-companion-of-pamphilus theodulus-of-caesarea-17-february theodulus-of-myropolis theodulus-of-the-forty-martyrs theodulus-son-of-hesperus theodulus-son-of-nilus theodulus-the-executioner theodulus-the-sinaite':
    'Ten now. The new one is on 2 May; the others are read in the el-03-17 entry for this name form.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-daphnousia sabbas-of-sicily sabbas-of-sourozh sabbas-of-the-kyiv-caves sabbas-of-tver sabbas-of-zographou sabbas-stratelates sabbas-the-spiritual sava-brancovici-of-transylvania sava-of-serbia sava-the-second':
    'Twelve now. The new one is Sabbas of Daphnousia on 2 May; the others are read in the el-04-24 entry for this name form.',
  'ιορδανησ jordan-the-martyr-2-february jordan-the-wonderworker':
    'Two men: Jordan the Wonderworker on 2 May and the Jordan of the el-02-02 entry.',
  'κυριακοσ cyriacus-attendant-of-faustus cyriacus-son-of-hesperus':
    'Two men: Cyriacus the son of Hesperus on 2 May and the Cyriacus of the el-09-29 entry.',
  'βασιλειοσ basil-companion-of-euphrasius basil-kadomsky basil-martyr-6-february basil-of-ancyra basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-ostrog basil-of-poiana-marului basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Sixteen now. The new one is Basil Kadomsky on 2 May; the others are read in the el-04-18 entry for this name form.',
  'ζωσιμασ zosimas-24-january zosimas-of-carthage zosimas-of-kumurdo zosimas-of-palestine zosimas-of-solovki zosimas-of-vorbozom':
    'Six now. The new one is Zosimas of Kumurdo on 1 May; the others are read in the el-04-17 entry for this name form.',
  'συμεων simeon-of-persia simeon-of-tver simeon-the-elder simeon-the-myrrh-streaming symeon-kinsman-of-the-lord symeon-of-novgorod symeon-the-barefoot symeon-the-god-receiver symeon-the-new-of-mytilene symeon-the-pentaglot symeon-the-pious symeon-with-theonas-and-pherbinus':
    'Twelve now. The new one is Symeon the Pentaglot on 1 May; the others are read in the el-04-19 entry for this name form.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-terentius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-new-hieromartyr-1944 macarius-notaras macarius-of-ierissos macarius-of-kalyazin macarius-of-kios macarius-of-kyiv macarius-of-paphos macarius-of-pelecete macarius-of-pisma macarius-of-rome macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Nineteen now. The new one is Macarius of Kyiv on 1 May; the others are read in the el-04-17 entry for this name form.',
  'γερασιμοσ gerasimus-of-boltinsk gerasimus-of-great-perm gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Five men: Great Perm on 29 January, the Jordan and Vologda on 4 March, the Byzantine on 7 April and Gerasimus of Boltinsk on 1 May.',
  'αγαπητοσ agapitus-of-auxerre agapitus-of-rome agapitus-of-synnada agapitus-the-blind':
    'Four men: Synnada on 18 February, the Blind of the Kyiv Caves on 7 April, Rome on 17 April and Agapitus of Auxerre on 1 May — the Agapitus a reader found missing from the corpus when Helen’s page sent him here.',
  'νικηφοροσ nicephorus-martyr-1-march nicephorus-martyr-8-february nicephorus-of-antioch nicephorus-of-corinth nicephorus-of-crete nicephorus-of-the-svir-desert nikephoros-of-chios':
    'Seven now. The new one is on 1 May; the others are read in the el-03-01 entry for this name form.',
  'μαρια maria-6-january maria-methymopoula maria-of-olonets maria-of-vladimir mary-called-marinos mary-of-aza mary-sister-of-lykarion mary-wife-of-xenophon':
    'Eight now. The new one is Maria Methymopoula on 1 May; the others are read in the el-03-19 entry for this name form.',
  'μιχαηλ boris-michael-of-bulgaria macarius-notaras michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-klops michael-of-vourla michael-the-russian-1-april michael-the-wonderworker':
    'Nine now. The new ones are Michael the Wonderworker on 1 May and Boris-Michael of Bulgaria on 2 May, whose baptismal name this is; the others are read in the el-04-16 entry for this name form.',
  'αφρικανοσ africanus-companion-of-publius africanus-companion-of-terentius africanus-of-lyons':
    'Three men: Africanus of Lyons on 1 May, the companion of Publius and Terentius on 13 March, and the Africanus of Terentius’s company on 10 April.',
  'ακακιοσ acacius-of-amida acacius-of-gaul acacius-of-latros acacius-of-melitene acacius-of-the-forty-martyrs acacius-of-tver acacius-the-executioner acacius-the-kausokalyvite acacius-the-new-of-neochorion':
    'Nine now, and **two of the new ones share 1 May** as two entries: Acacius the New of Neochorion, whom the Romanian keeps there too, and Acacius of Gaul. The others are read in the el-04-12 entry for this name form.',
  'σιμων simon-of-moscow simon-of-zographou simon-the-martyr-3-february':
    'Two men: the Simon of 30 April and the Simon of the el-01-04 reading, which is the day still to be written.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-cordoba paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Nineteen now. The new one is Paul of Cordoba on 30 April; the others are read in the el-04-19 entry for this name form.',
  'μαξιμοσ maximus-30-april maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Thirteen now. The new one is the Maximus of 30 April; the others are read in the el-04-15 entry for this name form.',
  'ισιδωροσ isidore-8-january isidore-of-antioch isidore-of-cordoba isidore-of-pelusium isidore-of-seville':
    'Five now. The new one is Isidore of Cordoba on 30 April; the others are read in the el-04-04 entry for this name form.',
  'ηλιασ elias-companion-of-jonah elias-companion-of-terentius elias-martyr-with-patermuthius elias-nikolayevich-hieromartyr elias-of-cordoba elias-of-heliopolis elias-of-trebizond elias-the-cave-dweller-of-calabria elias-the-egyptian iorest-of-transylvania':
    'Ten now. The new one is Elias of Cordoba on 30 April; the others are read in the el-04-10 entry for this name form.',
  'κλημησ clement-martyr-23-february clement-of-ancyra clement-of-mount-sagmation clement-the-hymnographer':
    'Four men: the martyr of 23 February, Ancyra on 23 January, Mount Sagmation on 26 January and Clement the Hymnographer on 30 April.',
  'αφροδισιοσ aphrodisius-companion-of-peter aphrodisius-of-alexandria':
    'Two men: the companion of Peter on 14 March and Aphrodisius of Alexandria on 30 April.',
  'σατορνινοσ saturninus-companion-of-plotinus saturninus-of-corfu':
    'Two men whose Greek forms differ by a letter from the Σατουρνῖνος fold: Saturninus of Corfu on 29 April and the Saturninus read there.',
  'ιανουαριοσ januarius-of-benevento januarius-of-corfu januarius-the-presbyter januarius-with-maxime-and-macaria':
    'Four men: the presbyter on 30 August, the Januarius of 8 April, Januarius of Benevento on 21 April and Januarius of Corfu on 29 April.',
  'ευφρασιοσ euphrasius-companion-of-basil euphrasius-of-corfu':
    'Two men: Euphrasius of Corfu on 29 April and Euphrasius the companion of Basil on 14 March.',
  'ζηνων zeno-20-april zeno-companion-of-terentius zeno-companion-of-zoilus zeno-of-corfu zeno-of-diospolis zeno-the-courier zeno-the-faster-of-kiev':
    'Seven now. The new one is on 29 April; the others are read in the el-04-20 entry for this name form.',
  'βιταλιοσ vitalis vitalis-of-sicily vitalius-of-corfu':
    'Three now. The new one is on 29 April; the others are read in the el-03-09 entry for this name form.',
  'σεκουνδινοσ secundinus-of-africa secundinus-of-numidia':
    'Two men: Secundinus of Numidia on 29 April and Secundinus of Africa on 21 February.',
  'νεων neon-24-april neon-companion-of-mark-the-shepherd neon-of-corfu':
    'Three men: the Neon of 24 April, Neon of Corfu on 29 April and the Neon of the el-01-16 entry.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-kaloktenes john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Thirty-eight now. The new one is John Kaloktenes on 29 April; the others are read in the el-04-27 entry for this name form.',
  'ευσεβιοσ eusebius-24-april eusebius-companion-of-bassus eusebius-disciple-of-dionysius-of-alexandria eusebius-of-corfu eusebius-of-syria':
    'Five now. The new one is Eusebius of Corfu on 29 April, one of the five that day; the others are read in the el-04-24 entry for this name form.',
  'αττικοσ atticus-29-april atticus-of-constantinople':
    'Two men: the Atticus of 29 April and the Atticus of the el-01-08 entry.',
  'αγαπιοσ agapius-disciple-of-babylas agapius-martyr-1-march agapius-of-apamea agapius-of-colciu agapius-of-numidia':
    'Five now. The new one is Agapius of Numidia on 29 April; the others are read in the el-03-15 entry for this name form, where 1 March keeps two.',
  'κυριλλοσ cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-astrakhan cyril-of-heliopolis cyril-of-jerusalem cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-turov cyril-of-zographou cyril-vi-of-constantinople':
    'Twelve now. The new one is Cyril of Turov on 28 April; the others are read in the el-04-18 entry for this name form.',
  'αυξιβιοσ auxibius-28-april auxibius-of-soloi':
    'Two men, and the pair is settled and written up in ro-run/FINDINGS.md. The 17 February Auxibius is the **first** bishop of Soloi, a Roman whom Mark the Evangelist catechised, baptised and ordained on Cyprus in the apostolic age and who held the high priesthood fifty years; this one is a Cypriot of the **fourth century** whose whole record is that he signed the acts of Sardica in 343, first among twelve Cypriot bishops, and had been at Nicaea in 325. Two centuries apart in one see, and the 17 February life names a third besides — the villager of Solopotamion he baptised and left his throne to.',
  'θεοφιλοσ theophilus-martyr-6-february theophilus-of-brescia theophilus-of-caesarea theophilus-of-crete theophilus-of-rome theophilus-of-the-forty-martyrs theophilus-the-deacon-of-libya theophilus-the-new':
    'Eight now. The new one is Theophilus of Brescia on 27 April; the others are read in the el-03-31 entry for this name form.',
  'στεφανοσ stephen-27-february stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-of-vladimir stephen-xylinites':
    'Ten now. The new one is Stephen of Vladimir on 27 April; the others are read in the el-04-26 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-old-lavra john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-confessor-of-kathara john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Thirty-seven now. The new one is John the Confessor of the Kathara on 27 April; the others are read in the el-04-16 entry for this name form.',
  'ευλογιοσ eulogius-of-alexandria eulogius-of-cordoba eulogius-of-georgia eulogius-of-palestine eulogius-the-hospitaller':
    'Five men on five Greek days: Alexandria on 13 February, Cordoba on 11 March, Georgia on 1 April, Palestine on 5 March and Eulogius the Hospitaller on 27 April.',
  'στεφανοσ stephen-27-february stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-perm stephen-of-placidianae stephen-of-triglia stephen-xylinites':
    'Nine now. The new one is Stephen of Perm on 26 April; the others are read in the el-04-13 entry for this name form.',
  'νεστωρ nestor-26-april nestor-father-of-conon nestor-of-maghid nestor-the-martyr-2-march':
    'Four men: the father of Conon on 5 March, Maghid on 28 February, the martyr of 2 March and the Nestor of 26 April.',
  'λεων leo-companion-of-gervasius leo-companion-of-manuel leo-of-catania leo-of-nicaea leo-of-patara leo-of-samos leo-the-great':
    'Seven now. The new one is Leo of Samos on 26 April; the others are read in the el-03-01 entry for this name form, where 18 February keeps two.',
  'σιλβεστροσ silvester-of-obnora sylvester-companion-of-sophronius sylvester-of-rome sylvester-of-the-kyiv-caves sylvester-the-patriarch':
    'Five now. The new one is Silvester of Obnora on 25 April; the others are read in the el-03-01 entry for this name form, where two stand on 1 March.',
  'νικη nike nike-companion-of-leonides':
    'Two women: the Nike saint.gr keeps on 25 April and Nike the companion of Leonides of Epidaurus on 16 April.',
  'μακεδονιοσ macedonius-ii-of-constantinople macedonius-of-myropolis macedonius-the-barley-eater':
    'Three men: Macedonius II of Constantinople, the patriarch, on 25 April and the two read in the el-01-24 entry for this name form.',
  'θωμασ thomas-companion-of-terentius thomas-of-constantinople thomas-of-zographou thomas-the-apostle thomas-the-fool-for-christ':
    'Five now. The new one is Thomas the fool for Christ on 24 April; the others are read in the el-04-10 entry for this name form.',
  'μελιτων meliton-of-beirut meliton-of-the-forty-martyrs mellitus-of-canterbury':
    'Three men: Mellitus of Canterbury on 24 April, whose Greek form folds with theirs, and the two read in the el-03-09 entry for this name form.',
  'αλεξιοσ alexios-the-recluse-of-kyiv alexis-of-goloseevo alexis-of-moscow alexis-of-voronezh alexis-the-man-of-god':
    'Five now. The new one is Alexios the Recluse of Kyiv on 24 April; the others are read in the el-03-17 entry for this name form.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-sicily sabbas-of-sourozh sabbas-of-the-kyiv-caves sabbas-of-tver sabbas-of-zographou sabbas-stratelates sabbas-the-spiritual sava-brancovici-of-transylvania sava-of-serbia sava-the-second':
    'Nine now. The new one is Sabbas the Stratelates on 24 April; the others are read in the el-04-02 entry for this name form.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-of-corinth nicholas-of-japan nicholas-of-magnesia nicholas-of-pskov nicholas-of-spetses nicholas-of-the-forty-martyrs nicholas-of-trebizond nicholas-of-valaam nicholas-patriarch-of-georgia nicholas-the-studite nicholas-velimirovich':
    'Eleven now. The new one is on 24 April; the others are read in the el-02-28 entry for this name form.',
  'νεων neon-24-april neon-companion-of-mark-the-shepherd':
    'Two men: the Neon of 24 April and the Neon of the el-01-16 entry.',
  'λογγινοσ longinus-24-april longinus-of-koryazhemka':
    'Two men: the Longinus of 24 April and the Longinus of the el-10-16 reading.',
  'λεοντιοσ leontius-24-april leontius-of-the-forty-martyrs':
    'Two men: the Leontius of 24 April and `leontius-the-canonarch`, whom a reader drafted for 17 Ιουνίου and answered against `gerontius-the-canonarch` as another man.',
  'ευσεβιοσ eusebius-24-april eusebius-companion-of-bassus eusebius-disciple-of-dionysius-of-alexandria eusebius-of-syria':
    'Four men: the Eusebius of 24 April and the three read in the el-01-20 entry for this name form.',
  'δημητριοσ demetrius-24-april demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-prilutsk demetrius-the-peloponnesian demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'Ten now. The new one is the Demetrius of 24 April; the others are read in the el-04-14 entry for this name form.',
  'χριστοφοροσ christopher christopher-20-april christopher-24-april christopher-of-adrianople christopher-of-saint-sabbas':
    'Five now. The new one is the Christopher of 24 April; the others are read in the el-04-20 entry for this name form.',
  'λαζαροσ lazarus-companion-of-jonah lazarus-of-murom lazarus-of-tripoli-in-the-peloponnese lazarus-the-shepherd':
    'Four men: the companion of Jonah on 29 March, Murom on 8 March, Tripoli in the Peloponnese on 23 February and Lazarus the shepherd of 23 April.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-pisidian-antioch george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-shenkursk george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-cypriot george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite george-the-trophy-bearer':
    'Twenty-six now, and **three of them stand on the Greek 23 April** as three entries: George the Trophy-bearer, the great martyr whom the Romanian keeps there too; George the Cypriot; and George of Shenkursk, the Russian whose folder relates the Trophy-bearer because his own life names him as his patron. The others are read in the el-04-05 entry for this name form.',
  'δονατοσ donatus-23-april donatus-martyr-at-venice':
    'Two men: the Donatus of 23 April and the Donatus a reader drafted for 6 Μαΐου, whom that reader answered as another man — the pair is named in ro-run/FINDINGS.md.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-kargopol athanasius-of-meteora athanasius-of-murom athanasius-of-the-forty-martyrs athanasius-of-vologda athanasius-once-a-magician athanasius-the-confessor':
    'Ten now. The new one is Athanasius once a magician, converted at George the Trophy-bearer’s trial on 23 April; the others are read in the el-03-08 entry for this name form.',
  'ανατολιοσ anatolius-of-odessa anatolius-of-optina-25-january anatolius-of-raithu anatolius-the-general':
    'Four men: Odessa on 23 January, Optina on 25 January, Raithu on 21 February and Anatolius the general, one of those the 23 April page names with George the Trophy-bearer.',
  'πλατων plato-of-megara plato-the-venerable platon-kulbusch platon-of-banja-luka':
    'Four men: Platon of Banja Luka on 22 April and the three read in the el-01-01 entry for this name form.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kama-the-philosopher theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-perga theodore-of-samothrace theodore-of-sykeon theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent theodore-trichinas':
    'Nineteen now. The new one is on 21 April; the others are read in the el-04-15 entry for this name form.',
  'μαξιμιανοσ maximian-of-constantinople maximian-of-ravenna':
    'Two men: Maximian of Constantinople, the patriarch, on 21 April and the Maximian of the el-02-21 entry, the archbishop of Ravenna.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-of-bryleyevo james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-stromyn james-of-zheleznyi-borok james-of-zographou-the-first james-of-zographou-the-second james-the-confessor':
    'Fourteen now. The new one is James of Stromyn on 21 April; the others are read in the el-04-11 entry for this name form, where two stand on 11 April.',
  'ισαακιοσ isaac-the-recluse-of-the-kyiv-caves isaacius-companion-of-alexandra':
    'Two men: the companion of Alexandra on 21 April and the Isaacius of the el-02-14 entry.',
  'φαυστοσ faustus-companion-of-januarius faustus-disciple-of-dionysius-of-alexandria faustus-martyr-6-february':
    'Three men: the companion of Januarius on 21 April and the two read in the el-05-24 draft reading, which is another day and another company.',
  'ευτυχιοσ eutychius-27-march eutychius-companion-of-bassus eutychius-companion-of-januarius eutychius-of-constantinople eutychius-of-mesopotamia eutychius-of-the-forty-martyrs eutychius-the-subdeacon':
    'Seven now. The new one is the companion of Januarius on 21 April; the others are read in the el-04-09 entry for this name form.',
  'κοδρατοσ codratus-companion-of-alexandra codratus-the-executioner quadratus-of-corinth quadratus-of-the-east':
    'Four men: the companion of Alexandra on 21 April, the executioner of 4 March, Quadratus of Corinth on 10 March and Quadratus of the East on 26 March.',
  'απολλωσ apollos-companion-of-alexandra apollos-under-julian':
    'Two men: the companion of Alexandra on 21 April and the Apollos of the el-03-31 reading.',
  'ζωτικοσ zoticus-20-april zoticus-companion-of-rogatus zoticus-of-tomis':
    'Three men: the Zoticus of 20 April, the companion of Rogatus on 12 January and Zoticus of Tomis on 13 September.',
  'ζηνων zeno-20-april zeno-companion-of-terentius zeno-companion-of-zoilus zeno-of-diospolis zeno-the-courier zeno-the-faster-of-kiev':
    'Six now. The new one is the Zeno of 20 April; the others are read in the el-04-10 entry for this name form.',
  'θεωνασ theonas-20-april theonas-called-synesius theonas-of-thessalonica theonas-with-symeon-and-pherbinus':
    'Four men: the Theonas of 20 April, Theonas called Synesius on 5 January, and the two of 4 April read in the el-04-04 entry for this name form.',
  'τρυφων tryphon-companion-of-trophimus tryphon-of-campsada tryphon-of-constantinople':
    'Three men: the companion of Trophimus on 29 September, Tryphon of Campsada, whom the Greek keeps on 1 Φεβρουαρίου and the Romanian on 29 septembrie, and Tryphon of Constantinople on 19 April.',
  'σεβηριανοσ severian-20-april severian-of-the-forty-martyrs':
    'Two men: the Severian of 20 April and Severian of the Forty of Sebaste on 9 March.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-bialystok gabriel-of-georgia gabriel-of-lesnovo gabriel-of-novgorod-and-saint-petersburg gabriel-of-saint-stephens-jerusalem gabriel-the-martyr-2-february gabriel-the-small gabriel-vsevolod-of-novgorod':
    'Nine now. The new one is Gabriel of Białystok on 20 April; the others are read in the el-03-17 entry for this name form.',
  'χριστοφοροσ christopher christopher-20-april christopher-of-adrianople christopher-of-saint-sabbas':
    'Four men: the Christopher all four calendars keep on 9 May, of the monastery of Saint Sabbas on 13 April, of Adrianople on 16 April, and the Christopher of 20 April.',
  'καισαριοσ caesarius-20-april caesarius-brother-of-gregory-the-theologian':
    'Two men: the Caesarius of 20 April and Caesarius the brother of Gregory the Theologian on 9 March.',
  'αντωνινοσ antoninus-20-april antoninus-of-ramas':
    'Two men: the Antoninus saint.gr keeps on 20 April and the Antoninus of the el-01-23 entry.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-terentius alexander-martyr-1-april alexander-of-cartagena alexander-of-oshevensk alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Thirteen now. The new one is Alexander of Oshevensk on 20 April; the others are read in the el-04-10 entry for this name form.',
  'βικτωρ victor-20-april victor-26-february victor-of-glazov victor-of-thessalonica':
    'Four men on four Greek days: the Victor of 26 February, Thessalonica on 30 March, Glazov on 19 April, and the Victor read in the el-04-20 entry.',
  'σεβαστιανοσ sebastian-of-cartagena sebastian-of-karaganda sebastian-of-posesone':
    'Three men: the duke of Cartagena and Sebastian of Posesone, two entries of 26 February, and Sebastian of Karaganda on 19 April.',
  'ρουφοσ rufus-19-april rufus-apostle-of-thebes rufus-of-the-kyiv-caves rufus-son-of-paul-and-tatta rufus-the-martyr-8-september':
    'Five now. The new one is the Rufus of 19 April; the others are read in the el-04-08 entry for this name form, where two stand on 8 April.',
  'ερμογενησ hermogenes-19-april hermogenes-companion-of-mamas hermogenes-of-moscow hermogenes-of-nicomedia hermogenes-of-samos':
    'Five now. The new one is the Hermogenes saint.gr keeps on 19 April; the others are read in the el-02-19 entry for this name form.',
  'σωκρατησ socrates-companion-of-dionysius socrates-companion-of-terentius':
    'Two men: the companion of Dionysius on 19 April and the Socrates of the el-04-21 reading, which is another day and another company.',
  'συμεων simeon-of-persia simeon-of-tver simeon-the-elder simeon-the-myrrh-streaming symeon-of-novgorod symeon-the-barefoot symeon-the-god-receiver symeon-the-new-of-mytilene symeon-the-pious symeon-with-theonas-and-pherbinus':
    'Ten now. The new one is Symeon the Barefoot on 19 April; the others are read in the el-04-04 entry for this name form.',
  'φιλιππα philippa-confessor-of-thessalonica philippa-mother-of-theodore':
    'Two women: Philippa the mother of Theodore on 19 April and the Philippa of the el-01-21 entry.',
  'companion dionysius socrates dionysius-companion-of-socrates socrates-companion-of-dionysius':
    'The pair the 19 April page names together, each named after the other, which is what folds them.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-socrates dionysius-companion-of-terentius dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-pereyaslavl dionysius-reader-of-alexandria dionysius-the-merciful':
    'Ten now. The new one is the companion of Socrates on 19 April; the others are read in the el-04-15 entry for this name form.',
  'αγαθαγγελοσ agathangelus agathangelus-of-esphigmenou agathangelus-of-florina':
    'Three men: the martyr with Clement of Ancyra on 23 January, the neomartyr of Florina on 17 February and Agathangelus of Esphigmenou on 19 April.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-dimitsana euthymius-of-karelia euthymius-of-novgorod euthymius-of-suzdal euthymius-of-syanzhema euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god euthymius-the-wonderworker':
    'Ten now, and **two of the new ones share 18 April** as two entries: Euthymius of Karelia and Euthymius the Wonderworker. The others are read in the el-04-11 entry for this name form.',
  'κυριλλοσ cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-astrakhan cyril-of-heliopolis cyril-of-jerusalem cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-zographou cyril-vi-of-constantinople':
    'Eleven now. The new one is Cyril VI of Constantinople on 18 April; the others are read in the el-03-18 entry for this name form, where two stand on 18 March.',
  'βασιλειοσ basil-companion-of-euphrasius basil-martyr-6-february basil-of-ancyra basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-ratishvili basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Thirteen now. The new one is Basil Ratishvili on 18 April; the others are read in the el-04-15 entry for this name form.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-korel antony-of-novgorod antony-of-vilnius antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Eighteen now. The new one is Antony of Korel on 18 April; the others are read in the el-04-13 entry for this name form.',
  'ζωσιμασ zosimas-24-january zosimas-of-carthage zosimas-of-palestine zosimas-of-solovki zosimas-of-vorbozom':
    'Five men on five Greek days: 24 January, Carthage on 11 March, Palestine and Vorbozom both on 4 April as two entries, and Zosimas of Solovki on 17 April.',
  'παισιοσ paisius-8-january paisius-fool-for-christ-of-kyiv':
    'Two men: Paisius the fool for Christ of Kyiv on 17 April and the Paisius of the el-01-19 entry.',
  'εφραιμ ephraim-of-antioch ephraim-of-atskuri ephraim-of-katounakia ephraim-of-rostov ephraim-of-the-kyiv-caves ephraim-of-tomis ephrem-of-kiev ephrem-of-novotorzhsk ephrem-the-syrian':
    'Nine now. The new one is Ephraim of Atskuri on 17 April; the others are read in the el-04-01 entry for this name form.',
  'αγαπητοσ agapitus-of-rome agapitus-of-synnada agapitus-the-blind':
    'Three men: Agapitus of Synnada on 18 February, Agapitus the Blind of the Kyiv Caves on 7 April and Agapitus of Rome, the pope, on 17 April.',
  'μιχαηλ michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-klops michael-of-vourla michael-the-russian-1-april':
    'Six now. The new one is Michael of Vourla on 16 April; the others are read in the el-04-06 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-verkhoturye john-of-vilnius john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Thirty-five now. The new one is John of Verkhoturye on 16 April; the others are read in the el-04-14 entry for this name form.',
  'ειρηνη irene-martyr-16-april irene-of-aquileia':
    'Two women on one day, printed as two entries of the 16 April page: Irene of Aquileia, whom the Romanian keeps there too and whose company that day is, and the martyr Irene the page names alone.',
  'χριστοφοροσ christopher christopher-of-adrianople christopher-of-saint-sabbas':
    'Three men: the Christopher all four calendars keep on 9 May, Christopher of the monastery of Saint Sabbas on 13 April, and Christopher of Adrianople on 16 April, who is also in the Χριστόδουλος fold for his second recorded name.',
  'χριστοδουλοσ christodoulos-26-february christodoulos-of-patmos christopher-of-adrianople':
    'Three men, and Christopher of Adrianople stands in this fold as well as under Χριστόφορος because the corpus records both forms of his name. The others are read in the el-02-26 entry for this name form.',
  'αγαθων agathon-confessor-of-thessalonica agathon-of-aleppo agathon-of-alexandria agathon-of-rome agathon-of-the-desert agathon-of-the-kiev-caves':
    'Six now. The new one is Agathon the Confessor of Thessalonica on 16 April; the others are read in the el-03-10 entry for this name form.',
  'θεοδωρα theodora-companion-of-didymus theodora-companion-of-leonides theodora-of-amisos theodora-of-arta theodora-of-nizhny-novgorod theodora-sister-of-hermes theodora-the-empress':
    'Seven now, and **two of the new ones share 16 April** as two entries: Theodora the companion of Leonides, one of the women of Epidaurus, and Theodora of Nizhny Novgorod. The others are read in the el-04-05 entry for this name form.',
  'βασιλισσα basilissa-companion-of-leonides basilissa-of-antinoopolis basilissa-of-galatia basilissa-of-rome':
    'Four now. The new one is the companion of Leonides on 16 April; the others are read in the el-03-22 entry for this name form.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-terentius dionysius-martyr-1-april dionysius-of-alexandria dionysius-of-pereyaslavl dionysius-reader-of-alexandria dionysius-the-merciful':
    'Nine now. The new one is Dionysius of Pereyaslavl on 15 April; the others are read in the el-04-10 entry for this name form.',
  'δανιηλ daniel-of-achinsk daniel-of-moscow daniel-of-pereslavl daniel-the-egyptian':
    'Four men: Moscow on 4 March, Pereslavl on 7 April, the Egyptian of the Pamphilus company on 16 February, and Daniel of Achinsk on 15 April.',
  'βασιλειοσ basil-companion-of-euphrasius basil-martyr-6-february basil-of-ancyra basil-of-mangazeya basil-of-mirozh basil-of-moldovita basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Twelve now. The new one is Basil of Moldovița on 15 April; the others are read in the el-04-04 entry for this name form.',
  'companion pausolypius theodore pausolypius-companion-of-theodore theodore-companion-of-pausolypius':
    'The pair the 15 April page names together, each named after the other, which is what folds them.',
  'παυσολυπιοσ pausilypus-of-heraclea pausolypius-companion-of-theodore':
    'Two men of the name the corpus now keeps: the companion of Theodore on 15 April, and the Pausolypius of the el-04-08 entry.',
  'θεοδωροσ mstislav-of-kiev theodore-companion-of-pausolypius theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-samothrace theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent':
    'Eighteen now. The new ones are the companion of Pausolypius on 15 April and Mstislav of Kiev, whose baptismal name is Theodore; the others are read in the el-04-10 entry for this name form.',
  'companion maximus olympias maximus-companion-of-olympias olympias-companion-of-maximus':
    'The pair the 15 April page names together, each named after the other, which is what folds them.',
  'μαξιμοσ maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-companion-of-olympias maximus-companion-of-terentius maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-ozovia maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Twelve now. The new one is the companion of Olympias on 15 April; the others are read in the el-03-06 entry for this name form.',
  'λεωνιδησ leonides-of-athens leonides-of-epidaurus':
    'Two men on two Greek days, and they are next to each other: Leonides of Athens on 15 April and Leonides of Epidaurus on 16 April, whom the page keeps with the women of that day. Two entries, two commemorations.',
  'ανανιασ ananias-26-january ananias-of-lacedaemonia':
    'Two men: Ananias of Lacedaemonia on 15 April and the Ananias read in the el-01-26 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-vilnius john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Thirty-four now. The new one is John of Vilnius on 14 April; the others are read in the el-04-12 entry for this name form.',
  'ευσταθιοσ eustathius-of-antioch eustathius-of-kios eustathius-of-vilnius eustathius-the-roman':
    'Four men: Antioch on 21 February, Kios on 29 March, Vilnius on 14 April and the Roman on 28 September.',
  'δημητριοσ demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-prilutsk demetrius-the-peloponnesian demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'Nine now. The new one is Demetrius the Peloponnesian on 14 April; the others are read in the el-04-10 entry for this name form.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-novgorod antony-of-vilnius antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Seventeen now. The new one is Antony of Vilnius on 14 April, one of the three the day keeps; the others are read in the el-04-01 entry for this name form.',
  'ζωιλοσ zoilus-companion-of-zeno zoilus-the-roman':
    'Two men: the companion of Zeno on 3 March and Zoilus the Roman on 13 April.',
  'στεφανοσ stephen-27-february stephen-bekh stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-placidianae stephen-of-triglia stephen-xylinites':
    'Eight now. The new one is Stephen Bekh on 13 April; the others are read in the el-03-24 entry for this name form.',
  'χριστοφοροσ christopher christopher-of-saint-sabbas':
    'Two men: the Christopher all four calendars keep on 9 May, and Christopher of the monastery of Saint Sabbas on 13 April.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-elassona arsenius-of-ikalto arsenius-of-rostov':
    'Seven now. The new one is Arsenius of Elassona on 13 April; the others are read in the el-03-02 entry for this name form, where the 2 March pair is the Tver reading.',
  'μηνασ menas-of-zographou menas-the-martyr-31-august minas-with-david-and-john':
    'Three men: Zographou on 22 September, the martyr of 31 August and the Minas the 12 April page names with David and John.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr john-with-minas-and-david':
    'Thirty-three now. The new one is the John the 12 April page names with Minas and David; the others are read in the el-04-08 entry for this name form.',
  'companion demes protion demes-companion-of-protion protion-companion-of-demes':
    'The pair the 12 April page names together, each named after the other, which is what folds them.',
  'david john minas david-with-minas-and-john john-with-minas-and-david minas-with-david-and-john':
    'The three the 12 April page names together, each named after the others, which is what folds them.',
  'δαβιδ david-of-mytilene david-of-wales david-son-of-prince-theodore david-with-minas-and-john':
    'Four men: Mytilene on 1 February, Wales on 1 March, the son of Prince Theodore on 19 September and the David the 12 April page names with Minas and John.',
  'δαμιανοσ damian-disciple-of-polychronius damian-of-agrafa damian-of-esphigmenou damian-of-pavia':
    'Four men: the disciple of Polychronius and Esphigmenou both on 23 February as two entries, Agrafa on 14 February and Damian of Pavia on 12 April.',
  'ακακιοσ acacius-of-amida acacius-of-latros acacius-of-melitene acacius-of-the-forty-martyrs acacius-of-tver acacius-the-executioner acacius-the-kausokalyvite':
    'Seven now. The new one is Acacius the Kausokalyvite on 12 April; the others are read in the el-04-09 entry for this name form.',
  'ματρωνα matrona-of-amisos matrona-of-cyzicus matrona-of-thessalonica':
    'Three women: Amisos on 20 March, Cyzicus on 11 April and Thessalonica on 27 March.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-of-bryleyevo james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-zheleznyi-borok james-of-zographou-the-first james-of-zographou-the-second james-the-confessor':
    'Thirteen now, and **two of the new ones share 11 April** as two entries: James of Bryleyevo and James of Zheleznyi Borok, the two Russians the day keeps. The others are read in the el-04-10 entry for this name form.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-dimitsana euthymius-of-novgorod euthymius-of-suzdal euthymius-of-syanzhema euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god':
    'Eight now. The new one is Euthymius of Syanzhema on 11 April; the others are read in the el-04-01 entry for this name form.',
  'βαρσανουφιοσ barsanuphius-of-optina barsanuphius-of-tver barsanuphius-of-tver-and-kazan barsanuphius-of-zographou barsanuphius-the-great':
    'Five men on five Greek days: Optina on 1 April, Tver on 2 March, Tver and Kazan on 11 April, Zographou on 22 September and the Great on 6 February. The two of Tver are two men: the bishop of Tver and Kazan reposed in 1576, and the 2 March Barsanuphius is of the Tver company the Greek keeps that day.',
  'μιλτιαδησ miltiades-companion-of-terentius miltiades-of-rome':
    'Two men on one day, and the page itself divides them: Miltiades is one of the names in the company of Terentius, and Miltiades of Rome, the pope, stands on the same 10 April as an entry of his own.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-of-cyrrhus james-of-nisibis james-of-pharatha james-of-samosata james-of-serbia james-of-zographou-the-first james-of-zographou-the-second james-the-confessor':
    'Eleven now. The new one is James of Pharatha on 10 April; the others are read in the el-03-07 entry for this name form.',
  'δημητριοσ demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-prilutsk demetrius-the-skeuophylax demetrius-tornaras demos-the-fisherman':
    'Eight now, and the new one folds by a Greek form rather than by the English: Demos the fisherman of 10 April. The others are read in the el-03-22 entry for this name form.',
  'azas companion james pharatha azas-the-deacon james-of-pharatha':
    'Two the 10 April page names together, each named after the other, which is what folds them.',
  'αναστασια anastasia-andreyevna anastasia-of-uglich anastasia-the-patrician':
    'Three women: Anastasia Andreyevna on 1 March, Anastasia of Uglich on 10 April and Anastasia the Patrician on 10 March.',
  'τιτοσ titus-27-january titus-companion-of-terentius titus-of-the-kiev-caves titus-the-soldier titus-the-wonderworker':
    'Five men, and the el-02-27 entry reads the two the Kiev Caves keep on 27 February; the new one is the companion of Terentius on 10 April, and the wonderworker is 2 April.',
  'ξενοφων xenophon-companion-of-terentius xenophon-of-constantinople':
    'Two men: the companion of Terentius on 10 April and Xenophon of Constantinople on 26 January.',
  'τιμοθεοσ timothy-1-february timothy-companion-of-diogenes timothy-companion-of-terentius timothy-disciple-of-babylas timothy-of-caesarea timothy-of-ephesus timothy-of-symbola':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-04-06 entry for this name form.',
  'θωμασ thomas-companion-of-terentius thomas-of-constantinople thomas-of-zographou thomas-the-apostle':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-01-12 entry for this name form.',
  'λουκασ luke-companion-of-terentius luke-of-corleone luke-of-emesa luke-of-hellas luke-of-novgorod':
    'Five men on five Greek days: the companion of Terentius on 10 April, Corleone on 1 March, Emesa on 29 January, Hellas on 7 February and Novgorod on 10 February.',
  'ησαιασ isaiah-companion-of-terentius isaiah-of-valaam isaiah-the-egyptian':
    'Three men: the companion of Terentius on 10 April, Valaam on 8 January and the Egyptian of the Pamphilus company on 16 February.',
  'ηρακλησ heracles-companion-of-terentius heracles-of-carthage':
    'Two men: the companion of Terentius on 10 April and Heracles of Carthage on 11 March.',
  'ηλιασ elias-companion-of-jonah elias-companion-of-terentius elias-martyr-with-patermuthius elias-nikolayevich-hieromartyr elias-of-heliopolis elias-of-trebizond elias-the-cave-dweller-of-calabria elias-the-egyptian':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-03-29 entry for this name form.',
  'ζηνων zeno-companion-of-terentius zeno-companion-of-zoilus zeno-of-diospolis zeno-the-courier zeno-the-faster-of-kiev':
    'Five men on five Greek days: the companion of Terentius on 10 April, the companion of Zoilus on 3 March, Diospolis on 27 September, the courier on 10 February and the faster of Kiev on 30 January.',
  'θεοδωροσ theodore-companion-of-stephen theodore-companion-of-terentius theodore-founder-of-chora theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-samothrace theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-04-06 entry for this name form.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-companion-of-terentius dionysius-martyr-1-april dionysius-of-alexandria dionysius-reader-of-alexandria dionysius-the-merciful':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-04-01 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-companion-of-terentius alexander-martyr-1-april alexander-of-cartagena alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'The company of Terentius, whom the 10 April page names one by one, adds one of this name on 10 April; the rest of the fold is read in the el-04-01 entry for this name form.',
  'ρουφοσ rufus-apostle-of-thebes rufus-of-the-kyiv-caves rufus-son-of-paul-and-tatta rufus-the-martyr-8-september':
    'Four men, and two of them are on the Greek 8 April as two entries: Rufus the Apostle of Thebes, whom the Romanian keeps there too, and Rufus of the Kyiv Caves. The others are the son of Paul and Tatta on 25 September and the martyr of 8 September.',
  'μαξιμη maxima-wife-of-montanus maxime-with-januarius-and-macaria':
    'Two women: Maxima the wife of Montanus on 26 March and the Maxime the 8 April page names with Januarius and Macaria.',
  'ακακιοσ acacius-of-amida acacius-of-latros acacius-of-melitene acacius-of-the-forty-martyrs acacius-of-tver acacius-the-executioner':
    'Six now. The new one is Acacius of Amida on 9 April; the others are read in the el-03-06 entry for this name form, where two stand on 6 March.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-shipmaster-of-kos john-the-sinaite-venerable-martyr':
    'Thirty-two now. The new one is John the Shipmaster of Kos on 8 April; the others are read in the el-04-01 entry for this name form.',
  'januarius macaria maxime januarius-with-maxime-and-macaria macaria-with-januarius-and-maxime maxime-with-januarius-and-macaria':
    'The three the 8 April page names together, each named after the others, which is what folds them.',
  'ιανουαριοσ januarius-the-presbyter januarius-with-maxime-and-macaria':
    'Two men: the presbyter on 30 August and the Januarius the 8 April page names with Maxime and Macaria.',
  'αμανδοσ amandus-of-como amandus-of-maastricht':
    'Two men: Como on 8 April and Maastricht on 6 February.',
  'ρουφινοσ rufinus-of-rome rufinus-the-deacon':
    'Two men: Rufinus of Rome on 28 February and Rufinus the Deacon on 7 April.',
  'λευκιοσ leucius-companion-of-peter leucius-of-volokolamsk':
    'Two men: the companion of Peter on 11 January and Leucius of Volokolamsk on 7 April.',
  'θεοδωροσ theodore-companion-of-stephen theodore-founder-of-chora theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-samothrace theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent':
    'Fifteen now. The new one is Theodore of Samothrace on 6 April, one of the five that day; the others are read in the el-03-26 entry for this name form.',
  'μιχαηλ michael-companion-of-platon-of-reval michael-mavroeidis michael-of-cyprus-of-samothrace michael-of-klops michael-the-russian-1-april':
    'Five men on five Greek days. The new one is Michael of Cyprus, one of the five of Samothrace, on 6 April; the others are read in the el-04-01 entry for this name form.',
  'γερασιμοσ gerasimus-of-great-perm gerasimus-of-the-jordan gerasimus-of-vologda gerasimus-the-byzantine':
    'Four men: Great Perm on 29 January, the Jordan and Vologda both on 4 March as two entries, and Gerasimus the Byzantine on 7 April.',
  'δανιηλ daniel-of-moscow daniel-of-pereslavl daniel-the-egyptian':
    'Three men: Daniel of Moscow, whom the Greek keeps on 4 Μαρτίου and the Russian on 30 August; Daniel of Pereslavl on 7 April; and Daniel the Egyptian of the Pamphilus company on 16 February.',
  'αγαπητοσ agapitus-of-synnada agapitus-the-blind':
    'Two men: Agapitus of Synnada on 18 February, whom the Romanian keeps there too, and Agapitus the Blind of the Kyiv Caves on 7 April.',
  'τιμοθεοσ timothy-1-february timothy-companion-of-diogenes timothy-disciple-of-babylas timothy-of-caesarea timothy-of-ephesus timothy-of-symbola':
    'Six now. The new one is the companion of Diogenes on 6 April; the others are read in the el-02-27 entry for this name form.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-moesia gregory-of-nicomedia gregory-of-novgorod gregory-of-nyssa gregory-of-sinai gregory-the-dialogist gregory-the-elder gregory-the-hesychast-of-athos gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius':
    'Fourteen now. The new one is Gregory the Hesychast of Athos on 6 April; Gregory of Sinai, whom the Romanian keeps on 6 aprilie, has his Greek row on 11 Φεβρουαρίου — one row per church and two days, not two men. The others are read in the el-04-02 entry for this name form.',
  'companion diogenes timothy diogenes-companion-of-timothy timothy-companion-of-diogenes':
    'The pair the 6 April page names together, each named after the other, which is what folds them.',
  'μανουηλ manuel-of-adrianople manuel-of-samothrace manuel-of-sphakia manuel-of-the-east':
    'Four men: Adrianople on 22 January, Sphakia on 15 March, Manuel of the East on 26 March and Manuel of Samothrace on 6 April, one of the five that day.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-maleon george-of-megara george-of-mytilene george-of-nea-ephesus george-of-rapsani george-of-samothrace-a george-of-samothrace-b george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite':
    'Twenty-two now, and **two of the new ones share 6 April within one company**: the five of Samothrace include two Georges, which the page names as two, so their slugs carry `-a` and `-b`. The others are read in the el-04-05 entry for this name form.',
  'γενναδιοσ gennadius-of-corfu gennadius-of-kostroma gennadius-of-novgorod gennadius-of-the-svir-desert gennadius-the-dionysiate':
    'Five men on five Greek days: Corfu on 2 January, Kostroma on 23 January, Novgorod on 10 February, the Svir desert on 9 February and the Dionysiate on 6 April.',
  'ζωσιμασ zosimas-24-january zosimas-of-carthage zosimas-of-palestine zosimas-of-vorbozom':
    'Four men, and two of them are on the Greek 4 April as two entries: Zosimas of Palestine, who buried Mary of Egypt and whom the Romanian keeps there too, and Zosimas of Vorbozom, the Russian. The others are the Zosimas of 24 January and Carthage on 11 March.',
  'θεοδωρα theodora-companion-of-didymus theodora-of-amisos theodora-of-arta theodora-sister-of-hermes theodora-the-empress':
    'Five women on five Greek days: the companion of Didymus on 5 April, Amisos on 20 March, Arta on 11 March, the sister of Hermes on 1 April and the Empress on 11 February.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-maleon george-of-megara george-of-nea-ephesus george-of-rapsani george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite':
    'Nineteen now. The new one is George of Nea Ephesus on 5 April; the others are read in the el-04-02 entry for this name form.',
  'companion doule kyria doule-companion-of-kyria kyria-companion-of-doule':
    'The pair the 5 April page names together, each named after the other, which is what folds them.',
  'διδυμοσ didymus-companion-of-theodora didymus-of-cyprus':
    'Two men: the companion of Theodora on 5 April and Didymus of Cyprus on 20 February.',
  'companion didymus theodora didymus-companion-of-theodora theodora-companion-of-didymus':
    'The pair the 5 April page names together, each named after the other, which is what folds them.',
  'θεωνασ theonas-called-synesius theonas-of-thessalonica theonas-with-symeon-and-pherbinus':
    'Three men, and two of them are on the Greek 4 April as two entries: Theonas of Thessalonica, whom the Romanian keeps there too, and the Theonas the day names with Symeon and Pherbinus. The third is Theonas called Synesius on 5 January.',
  'συμεων simeon-of-tver simeon-the-elder simeon-the-myrrh-streaming symeon-of-novgorod symeon-the-god-receiver symeon-the-new-of-mytilene symeon-the-pious symeon-with-theonas-and-pherbinus':
    'Eight now. The new one is the companion of Theonas and Pherbinus on 4 April; the others are read in the el-03-12 entry for this name form.',
  'pherbinus symeon theonas pherbinus-with-theonas-and-symeon symeon-with-theonas-and-pherbinus theonas-with-symeon-and-pherbinus':
    'The three the 4 April page names together, each named after the others, which is what folds them.',
  'ισιδωροσ isidore-8-january isidore-of-antioch isidore-of-pelusium isidore-of-seville':
    'Four men on four Greek days: the Isidore of 8 January, Antioch on 2 January, Pelusium on 4 February and Seville on 4 April.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-russian paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Eighteen now. The new one is Paul the Russian on 3 April; the others are read in the el-04-01 entry for this name form.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-sicily sabbas-of-sourozh sabbas-of-tver sabbas-of-zographou sabbas-the-spiritual sava-of-serbia sava-the-second':
    'Eight now. The new one is Sabbas of Sourozh on 2 April; the others are read in the el-03-29 entry for this name form.',
  'πολυκαρποσ polycarp-of-alexandria polycarp-of-bryansk polycarp-of-smyrna polycarp-venerable-8-february':
    'Four men: Alexandria on 2 April, and the three read in the el-02-23 entry for this name form, where Smyrna and Bryansk share 23 February.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-moesia gregory-of-nicomedia gregory-of-novgorod gregory-of-nyssa gregory-of-sinai gregory-the-dialogist gregory-the-elder gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius':
    'Thirteen now. The new one is Gregory of Nicomedia on 2 April; the others are read in the el-03-04 entry for this name form, where two stand on 4 March.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-azkuri george-of-develtos george-of-diipion george-of-kratovo george-of-megara george-of-rapsani george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite':
    'Seventeen now. The new one is George of Azkuri on 2 April; the others are read in the el-03-26 entry for this name form.',
  'σατουρνινοσ saturninus-martyr-1-april saturninus-martyr-6-february saturninus-of-africa':
    'Three men: the martyr of 1 April, the martyr of 6 February and the African of 21 February.',
  'παρθενιοσ parthenius-martyr-1-april parthenius-of-kiev parthenius-of-lampsacus parthenius-of-zographou parthenius-the-third':
    'Five men on five Greek days: the martyr of 1 April, Kiev on 25 March, Lampsacus on 7 February, Zographou on 22 September and Parthenius III on 24 March.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-martyr-1-april dionysius-of-alexandria dionysius-reader-of-alexandria dionysius-the-merciful':
    'Seven now. The new one is the martyr of 1 April; the others are read in the el-03-28 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-martyr-1-april alexander-of-cartagena alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Eleven now. The new one is the martyr of 1 April, fifth in the company that day names; the others are read in the el-03-27 entry for this name form.',
  'θεοδωρα theodora-of-amisos theodora-of-arta theodora-sister-of-hermes theodora-the-empress':
    'Four women on four Greek days: Amisos on 20 March, Arta on 11 March, the sister of Hermes on 1 April and the Empress on 11 February.',
  'μιχαηλ michael-companion-of-platon-of-reval michael-mavroeidis michael-of-klops michael-the-russian-1-april':
    'Four men on four Greek days: the companion of Platon of Reval on 1 January, Mavroeidis on 17 February, Klops on 11 January and Michael the Russian on 1 April.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-new-hieromartyr-1944 macarius-of-ierissos macarius-of-kalyazin macarius-of-kios macarius-of-paphos macarius-of-pelecete macarius-of-pisma macarius-of-rome macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Sixteen now, and two of them are on the Greek 1 April: Macarius of Pelecete, whom the Romanian keeps there too, and the new hieromartyr of 1944. The others are read in the el-03-17 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-yuryevets john-philosopher-of-georgia john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Thirty-one now. The new one is John the Philosopher of Georgia on 1 April; the others are read in the el-03-31 entry for this name form.',
  'ερμησ hermes-apostle-of-dalmatia hermes-brother-of-theodora':
    'Two men: the Apostle of Dalmatia, whom the Greek keeps on 8 Μαρτίου and the Romanian on 8 aprilie, and Hermes the brother of Theodora on 1 April.',
  'γεροντιοσ gerontius-the-canonarch gerontius-the-martyr':
    'Two men on one day, printed as two lines of the 1 April calendar: Gerontius the martyr, whom the Romanian keeps there too, and Gerontius the canonarch of the Kyiv Caves. **A reader has flagged a near-slug** — `leontius-the-canonarch` on 17 Ιουνίου, a fourteenth-century canonarch of the same Lavra read by another reader — and answered it as another man with another name; the pair is named in ro-run/FINDINGS.md for an author.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-dimitsana euthymius-of-novgorod euthymius-of-suzdal euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god':
    'Seven now. The new one is Euthymius of Suzdal on 1 April; the others are read in the el-03-11 entry for this name form.',
  'ευλογιοσ eulogius-of-alexandria eulogius-of-cordoba eulogius-of-georgia eulogius-of-palestine':
    'Four men on four Greek days: Alexandria on 13 February, Cordoba on 11 March, Georgia on 1 April and Palestine on 5 March.',
  'θεοφιλοσ theophilus-martyr-6-february theophilus-of-caesarea theophilus-of-crete theophilus-of-rome theophilus-of-the-forty-martyrs theophilus-the-deacon-of-libya theophilus-the-new':
    'Seven now. The new one is Theophilus of Crete on 31 March; the others are read in the el-03-05 entry for this name form.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-kalita john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-yuryevets john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Thirty now. The new one is John Kalita on 31 March; the others are read in the el-03-30 entry for this name form, where three stand on 30 March.',
  'υπατιοσ hypatius-of-gangra hypatius-the-healer':
    'Two men on one day, printed as two lines of the 31 March calendar: Hypatius of Gangra, the bishop whom the Romanian keeps there too, and Hypatius the Healer of the Kyiv Caves.',
  'σαββασ sabbas-companion-of-jonah sabbas-of-sicily sabbas-of-tver sabbas-of-zographou sabbas-the-spiritual sava-of-serbia sava-the-second':
    'Seven now. The new one is the companion of Jonah on 29 March; the others are read in the el-03-02 entry for this name form.',
  'μαρουθασ marouthas-companion-of-jonah marouthas-of-martyropolis':
    'Two men: the companion of Jonah on 29 March and Marouthas of Martyropolis on 16 February.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta zacharias-of-corinth zacharias-of-jerusalem zacharias-son-of-barachias zacharias-son-of-carion zacharias-the-faster':
    'Seven now. The new one is Zacharias of Corinth on 30 March; the others are read in the el-02-21 entry for this name form.',
  'βικτωρ victor-26-february victor-of-thessalonica':
    'Two men: the Victor of 26 February and Victor of Thessalonica on 30 March.',
  'σωφρονιοσ sophronius-bishop-19-february sophronius-companion-of-sylvester sophronius-of-irkutsk sophronius-of-jerusalem sophronius-of-vratsa sophronius-the-recluse':
    'Six now. The new one is Sophronius of Irkutsk on 30 March; the others are read in the el-03-11 entry for this name form, where three stand on 11 March.',
  'μαρκοσ mark-of-arethusa mark-of-byblos mark-of-the-lavra-of-pskov mark-the-ascetic mark-the-deaf mark-the-shepherd':
    'Six now. The new one is on 29 March; the others are read in the el-01-27 entry for this name form.',
  'ιωνασ jonah-martyr-29-march jonah-of-kyiv jonah-of-the-lavra-of-pskov jonas-of-great-perm jonas-the-lerian':
    'Five men, and two of them are on the Greek 29 March as two entries: the martyr of Persia, whom the Romanian keeps there too and whose company this day is, and Jonah of the Lavra of Pskov. The others are Kyiv on 9 January, Great Perm on 29 January and the Lerian on 28 February.',
  'βασσοσ bassos-of-the-lavra-of-pskov bassus-companion-of-eusebius':
    'Two men: the monk of the Lavra of Pskov on 29 March and the companion of Eusebius on 20 January.',
  'μαρησ mares-companion-of-jonah maris-of-cyrus':
    'Two men: the companion of Jonah on 29 March and Maris of Cyrus on 25 January.',
  'λαζαροσ lazarus-companion-of-jonah lazarus-of-murom lazarus-of-tripoli-in-the-peloponnese':
    'Three men: the companion of Jonah on 29 March, Murom on 8 March and Tripoli in the Peloponnese on 23 February.',
  'ευσταθιοσ eustathius-of-antioch eustathius-of-kios eustathius-the-roman':
    'Three men: Antioch on 21 February, Kios on 29 March and the Roman on 28 September.',
  'ηλιασ elias-companion-of-jonah elias-martyr-with-patermuthius elias-nikolayevich-hieromartyr elias-of-heliopolis elias-of-trebizond elias-the-cave-dweller-of-calabria elias-the-egyptian':
    'Seven now. The new one is the companion of Jonah on 29 March; the others are read in the el-02-27 entry for this name form.',
  'αβιβοσ abibus-companion-of-jonah abibus-of-hermoupolis abibus-of-samosata':
    'Three men: the companion of Jonah on 29 March, Hermoupolis on 13 March and Samosata on 29 January.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-jerusalem john-of-kazan john-of-lycopolis john-of-manglisi john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-the-ladder john-of-the-well john-of-yuryevets john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Twenty-nine now. The new one is John of Manglisi on 28 March; the others are read in the el-03-26 entry for this name form.',
  'ιλαριων hilarion-of-pokrovskoe hilarion-of-zographou hilarion-the-new-of-cyprus hilarion-the-new-of-georgia hilarion-the-new-of-pelecete':
    'Five men, and two of them are on the Greek 28 March as two entries: Hilarion the New of Pelecete, whom the Romanian keeps there too, and Hilarion of Pokrovskoe. The others are Zographou on 22 September, the New of Cyprus on 6 October and the New of Georgia on 14 February. **A reader has flagged a sixth**, an Ιλαρίων on 6 Μαΐου whom the corpus may or may not already keep as `hilarion-4-may`; that pair is not this fold and is open in ro-run/FINDINGS.md.',
  'ησυχιοσ hesychius-companion-of-asklepiodote hesychius-of-jerusalem hesychius-of-the-forty-martyrs hesychius-the-senator hesychius-the-sinaite':
    'Five men on five Greek days: the companion of Asklepiodote on 19 February, Jerusalem on 28 March, one of the Forty on 9 March, the senator on 2 March and the Sinaite on 29 March.',
  'ευστρατιοσ eustratius-of-mount-olympus eustratius-the-faster':
    'Two men: Mount Olympus on 9 January and Eustratius the Faster on 28 March.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-of-alexandria dionysius-reader-of-alexandria dionysius-the-merciful':
    'Six now. The new one is Dionysius the Merciful on 28 March; the others are read in the el-03-15 entry for this name form, where the company of Agapius holds two of the name.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-corinth paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Seventeen now. The new one is Paul of Corinth on 27 March; the others are read in the el-03-17 entry for this name form.',
  'εφραιμ ephraim-of-antioch ephraim-of-katounakia ephraim-of-rostov ephraim-of-the-kyiv-caves ephraim-of-tomis ephrem-of-kiev ephrem-of-novotorzhsk ephrem-the-syrian':
    'Eight now. The new one is Ephraim of Rostov on 27 March; the others are read in the el-03-23 entry for this name form.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-tobolsk anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-novgorod antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Sixteen now. The new one is Anthony of Tobolsk on 27 March; the others are read in the el-03-16 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-of-cartagena alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-of-voskiy alexander-the-sleepless alexander-with-thirty-martyrs':
    'Ten now. The new one is Alexander of Voskiy on 27 March; the others are read in the el-03-16 entry for this name form.',
  'κρονιδησ cronides-deacon-of-alexandria cronides-the-commentarisius':
    'Two men: the deacon of Alexandria on 13 September and Cronides the commentarisius on 27 March.',
  'barouchius companion john barouchius-companion-of-john john-companion-of-barouchius':
    'The pair the 27 March page names together, each named after the other, which is what folds them.',
  'θεκλα thecla-of-alexandria thecla-of-aza thekla-companion-of-peter':
    'Three women: Alexandria on 6 September, Aza on 26 September and the companion of Peter on 26 March.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-companion-of-marcian peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Nineteen now. The new one is the companion of Marcian on 26 March; the others are read in the el-03-24 entry for this name form.',
  'μαρκιανοσ marcian-companion-of-peter marcian-of-constantinople marcian-of-cyrrhus marcian-the-emperor':
    'Four men: the companion of Peter on 26 March, Constantinople on 10 January, Cyrrhus on 18 January and the emperor on 17 February.',
  'companion marcian peter marcian-companion-of-peter peter-companion-of-marcian':
    'Two of the company the 26 March page names together, each named after the other, which is what folds them.',
  'ιωαννησ john-companion-of-barouchius john-companion-of-hilarion-the-new john-companion-of-manuel john-companion-of-peter john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-yuryevets john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Twenty-five now. The new one is the companion of Peter on 26 March; the others are read in the el-03-16 entry for this name form.',
  'κασσιανοσ cassian-companion-of-peter cassian-of-axylou cassian-of-bosoi john-cassian':
    'Four men: the companion of Peter on 26 March, Axylou on 6 October, Bosoi on 11 February, and John Cassian, whom the Romanian keeps on 29 februarie and the Greek on 28 Φεβρουαρίου.',
  'θεοδοσιοσ theodosius-companion-of-paisius theodosius-of-antioch theodosius-of-chernigov theodosius-of-the-east theodosius-of-the-kyiv-caves theodosius-of-totma theodosius-of-trebizond theodosius-of-triglia theodosius-the-cenobiarch':
    'Nine now. The new one is Theodosius of the East on 26 March; the others are read in the el-01-11 entry for this name form.',
  'θεοδωροσ theodore-companion-of-stephen theodore-founder-of-chora theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-pentapolis theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-stratelates theodore-the-byzantine theodore-the-envoy-of-nicomedia theodore-the-recruit theodore-the-silent':
    'Fourteen now. The new one is Theodore of Pentapolis on 26 March; the others are read in the el-02-17 entry for this name form.',
  'σεραπιων serapion-disciple-of-cronides serapion-of-alexandria serapion-of-pentapolis serapion-venerable-21-march':
    'Four men on four Greek days: the disciple of Cronides on 13 September, Alexandria on 28 February, Pentapolis on 26 March and the venerable of 21 March.',
  'μανουηλ manuel-of-adrianople manuel-of-sphakia manuel-of-the-east':
    'Three men: Adrianople on 22 January, Sphakia on 15 March and Manuel of the East on 26 March.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-develtos george-of-diipion george-of-kratovo george-of-megara george-of-rapsani george-of-sofia george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite':
    'Sixteen now. The new one is George of Sofia on 26 March; the others are read in the el-03-11 entry for this name form.',
  'ευτυχιοσ eutychius-27-march eutychius-companion-of-bassus eutychius-of-mesopotamia eutychius-of-the-forty-martyrs eutychius-the-subdeacon':
    'Five men on five Greek days: 27 March, the companion of Bassus on 20 January, Mesopotamia on 14 March, one of the Forty on 9 March and the subdeacon on 26 March.',
  'κοδρατοσ codratus-the-executioner quadratus-of-corinth quadratus-of-the-east':
    'Three men: the executioner of 4 March, Quadratus of Corinth on 10 March and Quadratus of the East on 26 March.',
  'βασιλειοσ basil-companion-of-euphrasius basil-martyr-6-february basil-of-ancyra basil-of-mangazeya basil-of-mirozh basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-the-confessor basil-the-new-of-latros basil-uncle-of-eustratius':
    'Eleven now. The new one is Basil the New of Latros on 26 March; the others are read in the el-03-22 entry for this name form, where 22 March keeps Ancyra and Mangazeya as two lines.',
  'αμμωνιοσ ammonius-10-january ammonius-of-pentapolis':
    'Two men: the Ammonius of 10 January and Ammonius of Pentapolis on 26 March.',
  'τιμων timon-of-nadeyev timon-the-hermit':
    'Two men: Nadeyev on 21 January and the hermit on 25 March.',
  'θεοδοσια theodora-of-amisos theodosia-of-caesarea-in-palestine':
    'Two women, and they fold together because one of them is recorded with both names: Theodora of Amisos on 20 March and Theodosia of Caesarea in Palestine on 25 March.',
  'πελαγια pelagia-of-caesarea-in-palestine pelagia-of-diveyevo':
    'Two women: Caesarea in Palestine on 25 March and Diveyevo on 30 January.',
  'παρθενιοσ parthenius-of-kiev parthenius-of-lampsacus parthenius-of-zographou parthenius-the-third':
    'Four men on four Greek days: Kiev on 25 March, Lampsacus on 7 February, Zographou on 22 September and the patriarch Parthenius III on 24 March.',
  'στεφανοσ stephen-27-february stephen-martyr-8-february stephen-of-chenolakkos stephen-of-kazan stephen-of-placidianae stephen-xylinites':
    'Six now, and the two new ones share 24 March as two entries of the page, Stephen of Kazan and Stephen Xylinites; the others are read in the el-02-27 entry for this name form.',
  'σεκουνδοσ secundus-brother-of-romylus secundus-companion-of-perpetua':
    'Two men: the brother of Romylus on 24 March and the companion of Perpetua on 1 February.',
  'brother romylus secundus romylus-brother-of-secundus secundus-brother-of-romylus':
    'The two brothers the 24 March page names together, each named after the other, which is what folds them.',
  'ρωμυλοσ romylos-martyr-at-venice romylus-brother-of-secundus romylus-companion-of-agapius':
    'Three men: the martyr at Venice on 17 February, the brother of Secundus on 24 March and the companion of Agapius on 15 March.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-kazan peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Eighteen now. The new one is Peter of Kazan on 24 March; the others are read in the el-03-14 entry for this name form.',
  'παρθενιοσ parthenius-of-lampsacus parthenius-of-zographou parthenius-the-third':
    'Three men: Lampsacus on 7 February, Zographou on 22 September and Parthenius the Third, the patriarch, on 24 March.',
  'μαρτινοσ martin-of-the-thebaid martin-the-martyr-22-september':
    'Two men: the Thebaid on 24 March and the martyr of 22 September.',
  'αβρααμ abraham-of-latros abraham-of-pechenga':
    'Two men: Latros on 24 March and Pechenga on 4 February.',
  'παχωμιοσ pachomius-companion-of-papyrinus pachomius-of-nerekhta':
    'Two men: the companion of Papyrinus on 13 January and Pachomius of Nerekhta on 23 March.',
  'νικων nikon-companion-of-mark-the-shepherd nikon-of-the-kyiv-caves':
    'Two men: the companion of Mark the Shepherd on 28 September and Nikon of the Kyiv Caves on 23 March.',
  'εφραιμ ephraim-of-antioch ephraim-of-katounakia ephraim-of-the-kyiv-caves ephraim-of-tomis ephrem-of-kiev ephrem-of-novotorzhsk ephrem-the-syrian':
    'Seven now. The new one is Ephraim of the Kyiv Caves on 23 March; the others are read in the el-03-07 entry for this name form, where 7 March keeps the patriarch of Antioch and Ephraim of Tomis as two lines.',
  'δομετιοσ dometius-8-march dometius-brother-of-maximus dometius-of-phrygia dometius-of-zographou':
    'Four men on four Greek days: the Dometius of 8 March, the brother of Maximus on 19 January, Phrygia on 23 March and Zographou on 22 September.',
  'σοφια sophia-martyr-18-september sophia-of-kyiv':
    'Two women: the martyr of 18 September and Sophia of Kyiv on 22 March.',
  'δημητριοσ demetrius-ivanov demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-prilutsk demetrius-the-skeuophylax demetrius-tornaras':
    'Seven now. The new one is Demetrius Ivanov on 22 March; the others are read in the el-03-19 entry for this name form.',
  'βασιλισσα basilissa-of-antinoopolis basilissa-of-galatia':
    'Two women: Antinoopolis on 8 January and Galatia on 22 March.',
  'βασιλειοσ basil-companion-of-euphrasius basil-martyr-6-february basil-of-ancyra basil-of-mangazeya basil-of-mirozh basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-the-confessor basil-uncle-of-eustratius':
    'Ten now, and two of them are on the Greek 22 March as two entries: Basil of Ancyra the presbyter, whom the Romanian keeps there too, and Basil of Mangazeya, the Siberian. The others are read in the el-03-14 entry for this name form.',
  'φιλημων philemon-companion-of-domninus philemon-companion-of-fortunianus philemon-of-gaza philemon-of-karpathos':
    'Four men on four Greek days: the companion of Domninus on 21 March, the companion of Fortunianus on 27 September, Gaza on 14 February and Karpathos on 24 January.',
  'companion domninus philemon domninus-companion-of-philemon philemon-companion-of-domninus':
    'The pair the 21 March page names together, each named after the other, which is what folds them.',
  'θεοδωρα theodora-of-amisos theodora-of-arta theodora-the-empress':
    'Three women: Amisos on 20 March, Arta on 11 March and the Empress on 11 February.',
  'μυρων myron-of-heraklion myron-of-tamasos':
    'Two men: Heraklion on 20 March and Tamasos on 17 September.',
  'ιουλιανη juliana-of-amisos juliana-of-lazarevo juliana-of-ptolemais':
    'Three women: Amisos on 20 March, Lazarevo on 2 January and Ptolemais on 4 March.',
  'ευφροσυνοσ euphrosynus-of-sinozero euphrosynus-of-tver euphrosynus-the-martyr-6-march':
    'Three men: Sinozero on 20 March, Tver on 2 March and the martyr of 6 March.',
  'ευφρασια euphrasia-of-amisos euphrasia-of-nicomedia euphrasia-of-the-thebaid':
    'Three women: Amisos on 20 March, Nicomedia on 19 January and the Thebaid on 13 March.',
  'ακυλασ aquila aquila-of-trebizond aquila-the-eparch':
    'Three men: the Aquila of 13 February, Trebizond on 21 January and the eparch on 20 March.',
  'μαρθα maria-of-vladimir martha-of-aza martha-sister-of-lykarion':
    'Three women: Maria of Vladimir, whose second recorded name this is, on 19 March; Martha of Aza on 26 September; and the sister of Lykarion on 8 February.',
  'μαρια maria-6-january maria-of-olonets maria-of-vladimir mary-called-marinos mary-of-aza mary-sister-of-lykarion mary-wife-of-xenophon':
    'Seven now. The new one is Maria of Vladimir on 19 March, who also stands in the fold for Μάρθα because the corpus records both of her names; the others are read in the el-02-19 entry for this name form.',
  'ιννοκεντιοσ innocent-of-moscow innocent-of-nurma':
    'Two men: Innocent of Moscow, whom three calendars keep on three days of his own, and Innocent of Nurma on 19 March.',
  'δημητριοσ demetrius-of-chios demetrius-of-constantinople demetrius-of-georgia demetrius-of-prilutsk demetrius-the-skeuophylax demetrius-tornaras':
    'Six now. The new one is Demetrius Tornaras on 19 March; the others are read in the el-02-11 entry for this name form, and Demetrius of Georgia is the man the Romanian keeps on 16 martie and the Greek on 12 Μαρτίου, one row per church.',
  'κυριλλοσ cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-astrakhan cyril-of-jerusalem cyril-of-kazan cyril-of-the-forty-martyrs cyril-of-the-white-lake cyril-of-zographou':
    'Nine now, and two of them are on the Greek 18 March as two entries: Cyril of Jerusalem, the patriarch, whom the Romanian calendar keeps there too, and Cyril of Astrakhan. The others are read in the el-03-08 entry for this name form.',
  'θεοδουλοσ theodulus-companion-of-agapitus theodulus-companion-of-eventius theodulus-companion-of-pamphilus theodulus-of-caesarea-17-february theodulus-of-myropolis theodulus-of-the-forty-martyrs theodulus-son-of-nilus theodulus-the-executioner theodulus-the-sinaite':
    'Nine now. The new one is Theodulus the Sinaite on 17 March; the others are read in the el-03-16 entry for this name form.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-crete paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Sixteen now. The new one is Paul of Crete on 17 March; the others are read in the el-03-11 entry for this name form.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-of-ierissos macarius-of-kalyazin macarius-of-kios macarius-of-paphos macarius-of-pisma macarius-of-rome macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Fourteen now. The new one is Macarius of Kalyazin on 17 March; the others are read in the el-02-28 entry for this name form.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-georgia gabriel-of-lesnovo gabriel-of-novgorod-and-saint-petersburg gabriel-of-saint-stephens-jerusalem gabriel-the-martyr-2-february gabriel-the-small gabriel-vsevolod-of-novgorod':
    'Eight now. The new one is Gabriel the Small on 17 March; the others are read in the el-01-21 entry for this name form.',
  'θεοδουλοσ theodulus-companion-of-agapitus theodulus-companion-of-eventius theodulus-companion-of-pamphilus theodulus-of-caesarea-17-february theodulus-of-myropolis theodulus-of-the-forty-martyrs theodulus-son-of-nilus theodulus-the-executioner':
    'Eight now. The new one is the companion of Eventius on 16 March; the others are read in the el-02-18 entry for this name form, where the 16 and 17 February pair is the open Caesarea question in ro-run/FINDINGS.md.',
  'ποιμην poimen-of-georgia poimen-of-novgorod':
    'Two men: Georgia on 16 March and Novgorod on 10 February.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-rouphinianai john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-yuryevets john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Twenty-three now. The new one is John of Rouphinianai on 16 March; the others are read in the el-03-14 entry for this name form.',
  'companion eventius theodulus eventius-companion-of-theodulus theodulus-companion-of-eventius':
    'The pair the 16 March page names together, each named after the other, which is what folds them.',
  'αντωνιοσ anthony-meskhi anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-novgorod antony-son-of-john-of-syracuse antony-the-athenian antony-the-martyr-1-march':
    'Fifteen now. The new one is Anthony Meskhi on 16 March; the others are read in the el-02-14 entry for this name form.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-of-cartagena alexander-of-pydna alexander-of-rome-pope alexander-of-the-forty-martyrs alexander-the-sleepless alexander-with-thirty-martyrs':
    'Nine now. The new one is Alexander of Rome, the pope, on 16 March; the others are read in the el-03-15 entry for this name form, where the company of Agapius holds two of the name.',
  'ρωμυλοσ romylos-martyr-at-venice romylus-companion-of-agapius':
    'Two men: the martyr at Venice on 17 February and the companion of Agapius on 15 March.',
  'μανουηλ manuel-of-adrianople manuel-of-sphakia':
    'Two men: Adrianople on 22 January and Sphakia on 15 March.',
  'διονυσιοσ dionysius-companion-of-agapius dionysius-companion-of-agapius-second dionysius-companion-of-quadratus dionysius-of-alexandria dionysius-reader-of-alexandria':
    'Five men, and the 15 March company of Agapius holds **two** Dionysii, as the page names them, so one folder carries `-second`. The others are the companion of Quadratus on 10 March, Dionysius of Alexandria on 3 October and the reader of Alexandria on 6 September.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-companion-of-agapius alexander-companion-of-agapius-second alexander-of-cartagena alexander-of-pydna alexander-of-the-forty-martyrs alexander-the-sleepless alexander-with-thirty-martyrs':
    'Eight now, and two of the new ones are in one company: the 15 March page names **two** Alexanders among the martyrs with Agapius, which is why one folder carries `-second`. The others are read in the el-03-14 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-aphrodisius peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Seventeen now. The new one is the companion of Aphrodisius on 14 March; the others are read in the el-03-04 entry for this name form.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-of-the-forty-martyrs john-of-yuryevets john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Twenty-two now. The new one is John of Yuryevets on 14 March; the others are read in the el-03-07 entry for this name form.',
  'ευτυχιοσ eutychius-companion-of-bassus eutychius-of-mesopotamia eutychius-of-the-forty-martyrs':
    'Three men: the companion of Bassus on 20 January, Mesopotamia on 14 March and one of the Forty of Sebaste on 9 March.',
  'βασιλειοσ basil-companion-of-euphrasius basil-martyr-6-february basil-of-mirozh basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-the-confessor basil-uncle-of-eustratius':
    'Eight now. The new one is the companion of Euphrasius on 14 March; the other seven are read in the el-03-04 entry for this name form.',
  'basil companion euphrasius basil-companion-of-euphrasius euphrasius-companion-of-basil':
    'The pair the 14 March page names together, each named after the other, which is what folds them.',
  'aphrodisius companion peter aphrodisius-companion-of-peter peter-companion-of-aphrodisius':
    'The pair the 14 March page names together, each named after the other, which is what folds them.',
  'ανδρεασ andrew-6-january andrew-of-mytilene andrew-of-raphailovo':
    'Three men: the Andrew of 6 January, Mytilene on 21 February and Raphailovo on 14 March.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-of-cartagena alexander-of-pydna alexander-of-the-forty-martyrs alexander-the-sleepless alexander-with-thirty-martyrs':
    'Six now. The new one is Alexander of Pydna on 14 March; the other five are read in the el-02-13 entry for this name form.',
  'θεοκτιστοσ theoctistus-of-st-sabbas theoctistus-the-martyr':
    'Two men: the monk of Saint Sabbas on 13 March and the martyr of 3 October.',
  'πουπλιοσ publius-companion-of-africanus publius-of-athens publius-of-zeugma':
    'Three men, and two of them are on the Greek 13 March as two entries: Publius the companion of Africanus and Terentius, and Publius of Athens, the bishop. Zeugma is 25 January.',
  'ευφρασια euphrasia-of-nicomedia euphrasia-of-the-thebaid':
    'Two women: Nicomedia on 19 January and the Thebaid on 13 March.',
  'africanus companion publius terentius africanus-companion-of-publius publius-companion-of-africanus terentius-companion-of-publius':
    'The three the 13 March page names together, each named after the others, which is what folds them.',
  'αβιβοσ abibus-of-hermoupolis abibus-of-samosata':
    'Two men: Hermoupolis on 13 March and Samosata on 29 January.',
  'συμεων simeon-of-tver simeon-the-elder simeon-the-myrrh-streaming symeon-of-novgorod symeon-the-god-receiver symeon-the-new-of-mytilene symeon-the-pious':
    'Seven now. The new one is Symeon the Pious on 12 March; the other six are read in the el-02-03 entry for this name form.',
  'λαυρεντιοσ laurence-martyr-9-january laurence-of-canterbury laurence-of-cyprus laurence-of-salamina laurence-of-turov':
    'Five men on five Greek days. The new one is Laurence of Cyprus on 12 March; the other four are read in the el-03-07 entry for this name form.',
  'ζωσιμασ zosimas-24-january zosimas-of-carthage':
    'Two men: the Zosimas of 24 January and Zosimas of Carthage on 11 March.',
  'θεοδωρα theodora-of-arta theodora-the-empress':
    'Two women: Theodora of Arta on 11 March and Theodora the Empress on 11 February.',
  'σωφρονιοσ sophronius-bishop-19-february sophronius-companion-of-sylvester sophronius-of-jerusalem sophronius-of-vratsa sophronius-the-recluse':
    'Five men, and **three of them stand on the Greek 11 March**: Sophronius of Jerusalem, whom the Romanian calendar keeps there too; Sophronius of Vratsa, whom the Romanian keeps on 22 September and the Greek here, which is one row per church and two different days, not two men; and Sophronius the Recluse. The other two are the bishop of 19 February and the companion of Sylvester on 1 March.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-russia paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Fifteen now. The new one is Paul of Russia on 11 March; the other fourteen are read in the el-03-10 entry for this name form.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-develtos george-of-diipion george-of-kratovo george-of-megara george-of-rapsani george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian george-the-sinaite':
    'Fifteen now. The two new ones share 11 March as two lines of the page, George of Diipion and George the Sinaite; the other thirteen are read in the el-03-05 entry for this name form.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-novgorod euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god':
    'Five men on five Greek days: Kereselidze on 2 February, Novgorod on 11 March, Tarnovo on 20 January, Zographou on 22 September and the man of God on 3 January.',
  'ευλογιοσ eulogius-of-alexandria eulogius-of-cordoba eulogius-of-palestine':
    'Three men: Alexandria on 13 February, Cordoba on 11 March and Palestine on 5 March.',
  'κωνσταντινοσ constantine-of-cornwall constantine-of-strathclyde':
    'Two men: Cornwall on 9 March and Strathclyde on 11 March.',
  'παυλοσ paul-brother-of-pausirius paul-companion-of-quadratus paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-plousias paul-of-ptolemais paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-the-simple paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Fourteen now. The new one is the companion of Quadratus on 10 March; the other thirteen are read in the el-03-01 entry for this name form.',
  'αναστασια anastasia-andreyevna anastasia-the-patrician':
    'Two women: Anastasia Andreyevna on 1 March and Anastasia the Patrician on 10 March.',
  'αγαθων agathon-of-aleppo agathon-of-alexandria agathon-of-rome agathon-of-the-desert agathon-of-the-kiev-caves':
    'Five men. The new one is Agathon of Aleppo on 10 March; the other four are read in the el-02-20 entry for this name form, where 20 February keeps the pope and the Kiev Caves ascetic as two lines.',
  'βιταλιοσ vitalis vitalis-of-sicily':
    'Two men: the Vitalis of 11 January, whom the Romanian calendar keeps too, and Vitalis of Sicily on 9 March.',
  'σιλβανοσ silvanus-8-march silvanus-of-palestine':
    'Two men: the Silvanus of 8 March and Silvanus of Palestine on 18 January.',
  'λαζαροσ lazarus-of-murom lazarus-of-tripoli-in-the-peloponnese':
    'Two men: Murom on 8 March, and Tripoli in the Peloponnese on 23 February.',
  'δομετιοσ dometius-8-march dometius-brother-of-maximus dometius-of-zographou':
    'Three men: the Dometius saint.gr keeps alone on 8 March, the brother of Maximus on 19 January and Zographou on 22 September.',
  'κυριλλοσ cyril-bishop-in-africa cyril-companion-of-photius cyril-of-alexandria cyril-of-kazan cyril-of-the-white-lake cyril-of-zographou':
    'Six men on six Greek days. The new one is the bishop in Africa on 8 March; the other five are read in the el-03-05 entry for this name form.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-kargopol athanasius-of-murom athanasius-of-vologda athanasius-the-confessor':
    'Seven now. The new one is Athanasius of Murom on 8 March; the other six are read in the el-01-18 entry for this name form.',
  'λαυρεντιοσ laurence-martyr-9-january laurence-of-canterbury laurence-of-salamina laurence-of-turov':
    'Four men on four Greek days: the martyr of 9 January, Canterbury on 3 February, Salamina on 7 March and Turov on 29 January.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-beverley john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-bulgarian john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Twenty now. The new one is John of Beverley on 7 March; the other nineteen are read in the el-02-26 entry for this name form.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-companion-of-emilian james-of-cyrrhus james-of-nisibis james-of-samosata james-of-serbia james-of-zographou-the-first james-of-zographou-the-second':
    'Nine now. The new one is the companion of Emilian on 7 March; the other eight are read in the el-02-27 entry for this name form.',
  'εφραιμ ephraim-of-antioch ephraim-of-katounakia ephraim-of-tomis ephrem-of-kiev ephrem-of-novotorzhsk ephrem-the-syrian':
    'Six men, and two of them are on the Greek 7 March as two entries: Ephraim of Antioch, the patriarch, and Ephraim of Tomis, whom the Romanian calendar keeps there too. The other four are read in the el-01-28 entry for this name form.',
  'αρκαδιοσ arcadius-archbishop-of-cyprus arcadius-martyr-12-january arcadius-of-novgorod arcadius-of-tremithus arcadius-of-vyazniki arcadius-son-of-xenophon arcadius-teacher-of-julian':
    'Seven now. The new one is Arcadius of Tremithus on 7 March; the other six are read in the el-03-06 entry for this name form, where the two 6 March men are the archbishop of Cyprus and the teacher of Julian.',
  'μαξιμοσ maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta maximus-venerable-martyr-6-march':
    'Nine now. The new one is the venerable martyr of 6 March; the other eight are read in the el-02-19 entry for this name form, where the 19 February and 17 September pair is the Marcianopolis question in ro-run/FINDINGS.md.',
  'ιουλιανοσ julian-companion-of-euboulos julian-companion-of-modestus julian-companion-of-pamphilus julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-the-deacon-of-aegina':
    'Eight men. The new one is the companion of Euboulos on 6 March; the other seven are read in the el-02-16 entry for this name form.',
  'companion euboulos julian euboulos-the-physician julian-companion-of-euboulos':
    'The pair the 6 March page names together, each named after the other, which is what folds them.',
  'ευβουλοσ euboulos euboulos-the-physician eubulus-of-caesarea':
    'Three men: the Euboulos of 28 February, the physician of 6 March and Eubulus of Caesarea on 3 February.',
  'αρκαδιοσ arcadius-archbishop-of-cyprus arcadius-martyr-12-january arcadius-of-novgorod arcadius-of-vyazniki arcadius-son-of-xenophon arcadius-teacher-of-julian':
    'Six men, and two of them are on the Greek 6 March as two entries: the archbishop of Cyprus, on a page of its own, and the teacher of Julian, one of the martyrs whom the day names with him. Both folders carry related rows to each other and to Arcadius of Arsinoe, the wonderworker whom the corpus already keeps and whom neither page names. The other four are 12 January, 10 February, 26 January and 26 January with Xenophon.',
  'θεοφιλοσ theophilus-martyr-6-february theophilus-of-caesarea theophilus-of-rome theophilus-the-deacon-of-libya theophilus-the-new':
    'Five men on five Greek days: 6 February, Caesarea on 5 March, Rome on 28 February, the deacon of Libya on 8 January and the New on 30 January.',
  'φωτιοσ photius-companion-of-cyril photius-of-constantinople photius-of-yuriev':
    'Three men: the companion of Cyril on 5 March, the patriarch on 6 February and Yuriev on 27 February.',
  'νεστωρ nestor-father-of-conon nestor-of-maghid nestor-the-martyr-2-march':
    'Three men: the father of Conon of Isauria on 5 March, Maghid on 28 February and the martyr of 2 March.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-develtos george-of-kratovo george-of-megara george-of-rapsani george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'Thirteen now. The new one is George of Rapsani on 5 March; the other twelve are read in the el-02-21 entry for this name form.',
  'κυριλλοσ cyril-companion-of-photius cyril-of-alexandria cyril-of-kazan cyril-of-the-white-lake cyril-of-zographou':
    'Five men on five Greek days: the companion of Photius on 5 March, Alexandria on 18 January, Kazan on 26 January, the White Lake on 4 February and Zographou on 22 September.',
  'companion cyril photius cyril-companion-of-photius photius-companion-of-cyril':
    'The pair the 5 March page names together, each named after the other, which is what folds them.',
  'κονων conon-of-cyprus conon-of-isauria conon-of-penthucla conon-the-gardener':
    'Four men, and **three of them share 5 March**, which both calendars already divide: Conon of Isauria and Conon the Gardener the Romanian keeps there too, and saint.gr prints Conon of Cyprus beside them as a third line. Three entries, three commemorations. Penthucla is 19 February.',
  'αδριανοσ adrian-of-caesarea adrian-of-canterbury adrian-of-megara adrian-of-poshekhonye adrianus-of-cyprus':
    'Five men. The new one is Poshekhonye on 5 March; the other four are read in the el-03-04 entry for this name form.',
  'στρατονικοσ stratonicus-companion-of-hermylus stratonicus-the-executioner':
    'Two men: the companion of Hermylus on 13 January, which the Romanian calendar keeps too, and the executioner of 4 March.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-damascus peter-of-galatia peter-of-monevata peter-of-sebaste peter-of-tobolsk peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'Sixteen now. The new one is Peter of Tobolsk on 4 March; the other fifteen are read in the el-01-12 and el-02-07 entries for this name form.',
  'ιωασαφ joasaph-of-alaska joasaph-of-snetogorsk joasaph-of-zographou':
    'Three men: Alaska on 22 January, Snetogorsk on 4 March and Zographou on 22 September.',
  'γρηγοριοσ gregory-of-akritas gregory-of-assos gregory-of-constantia gregory-of-moesia gregory-of-novgorod gregory-of-nyssa gregory-of-sinai gregory-the-elder gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius':
    'Eleven men. The two new ones share 4 March as two lines of the page, Gregory of Assos and Gregory of Constantia; the other nine are read in the el-01-10 entry for this name form.',
  'γερασιμοσ gerasimus-of-great-perm gerasimus-of-the-jordan gerasimus-of-vologda':
    'Three men, and two of them share 4 March as two lines of the page: Gerasimus of the Jordan, the fifth-century ascetic of Palestine whom the Romanian calendar keeps there too, and Gerasimus of Vologda. The Vologda folder parts them in its own words and carries the related row for the pair. Great Perm is 29 January.',
  'βασιλειοσ basil-martyr-6-february basil-of-mirozh basil-of-novgorod basil-of-rostov basil-of-thessalonica basil-the-confessor basil-uncle-of-eustratius':
    'Seven men. The new one is Basil of Mirozh on 4 March; the other six are read in the el-01-01 and el-02-28 entries for this name form.',
  'αδριανοσ adrian-of-caesarea adrian-of-canterbury adrian-of-megara adrianus-of-cyprus':
    'Four men on four Greek days: Caesarea on 3 February, Canterbury on 9 January, Megara on 1 February and Cyprus on 4 March.',
  'ακακιοσ acacius-of-latros acacius-of-tver acacius-the-executioner':
    'Three men on three Greek days: Latros on 3 January, Tver on 14 January and the executioner on 4 March.',
  'ζηνων zeno-companion-of-zoilus zeno-of-diospolis zeno-the-courier zeno-the-faster-of-kiev':
    'Four men on four Greek days: the companion of Zoilus on 3 March, Diospolis on 27 September, the courier on 10 February and the faster of Kiev on 30 January.',
  'companion zeno zoilus zeno-companion-of-zoilus zoilus-companion-of-zeno':
    'The pair the 3 March page names together, each named after the other, which is what folds them.',
  'σαββατιοσ sabbatius-of-antioch sabbatius-of-tver':
    'Two men: Antioch on 19 September, which all four calendars keep, and Tver on 2 March.',
  'σαββασ sabbas-of-sicily sabbas-of-tver sabbas-of-zographou sabbas-the-spiritual sava-of-serbia sava-the-second':
    'Six men on six Greek days: Sicily on 5 February, Tver on 2 March, Zographou on 22 September, the Spiritual on 3 February, Serbia on 14 January and Sava the Second on 8 February.',
  'βαρσανουφιοσ barsanuphius-of-tver barsanuphius-of-zographou barsanuphius-the-great':
    'Three men: Tver on 2 March, Zographou on 22 September and the Great on 6 February.',
  'αρσενιοσ arsenios-of-paros arsenius-bishop-of-tver arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-ikalto arsenius-of-rostov':
    'Six men. The new one is the bishop of Tver on 2 March, and his folder reads the close pair itself: the same Greek day keeps Arethas the Recluse, also of Tver and of the Lavra of Kyiv, also elected bishop and withdrawn into reclusion, whose repose the site also puts in 1409 — another name and another man, and now a related row on this folder. The day also carries a bare «Όσιος Αρσένιος εκ Ρωσίας» of the same name, which was refused because nothing on either page tells them apart. The other five are read in the el-02-28 entry for this name form.',
  'αβραμιοσ abramius-of-arbela abramius-of-spassk':
    'Two men: Arbela on 4 February, which the Romanian calendar keeps too, and Spassk on 2 March.',
  'παυλοσ paul-brother-of-pausirius paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-jamnia paul-of-obnora paul-of-simonov paul-of-zographou paul-the-martyr-3-february paul-venerable-martyr-1-march paul-with-valentina-and-ennatha':
    'Ten men. The new one is the venerable martyr of 1 March; the other nine are read in the el-02-16 and el-01-10 entries for this name form.',
  'λουκασ luke-of-corleone luke-of-emesa luke-of-hellas luke-of-novgorod':
    'Four men on four Greek days: Corleone on 1 March, Emesa on 29 January, Hellas on 7 February and Novgorod on 10 February.',
  'λεων leo-companion-of-gervasius leo-companion-of-manuel leo-of-catania leo-of-nicaea leo-of-patara leo-the-great':
    'Six men. The new one is the companion of Gervasius on 1 March; the others are read in the el-02-20 and el-02-18 entries for this name form, where 18 February keeps Leo the Great and Leo of Patara as two lines and 22 January the companion of Manuel and the man of Nicaea.',
  'companion gervasius leo gervasius-companion-of-leo leo-companion-of-gervasius':
    'The pair the 1 March page names together, each named after the other, which is what folds them.',
  'αντωνινα antonina-of-nicaea antonina-of-nicomedia antonina-venerable-martyr-1-march':
    'Three women, and two of them are on the Greek 1 March as two entries: Antonina of Nicaea, whom the Romanian calendar keeps there too, and the venerable martyr of whom the page says only that she was martyred in 1924. Sixteen centuries apart. Nicomedia is 9 January.',
  'σιλβεστροσ sylvester-companion-of-sophronius sylvester-of-rome sylvester-of-the-kyiv-caves sylvester-the-patriarch':
    'Four men, and two of them are on the Greek 1 March as two entries: the companion of Sophronius, and the patriarch whose whole record is a citation of the Jerusalem Kanonarion at page 36. The other two share 2 January, the pope and the Kiev Caves ascetic, read in the el-01-02 entry for this name form.',
  'companion sophronius sylvester sophronius-companion-of-sylvester sylvester-companion-of-sophronius':
    'The pair the 1 March page names together, each named after the other, which is what folds them.',
  'σωφρονιοσ sophronius-bishop-19-february sophronius-companion-of-sylvester':
    'Two men: the bishop of 19 February, and the companion of Sylvester on 1 March.',
  'νικηφοροσ nicephorus-martyr-1-march nicephorus-martyr-8-february nicephorus-of-antioch nicephorus-of-corinth nicephorus-of-crete nicephorus-of-the-svir-desert':
    'Six men on six Greek days: 1 March (with Charisius and Agapius), 8 February, 9 February, 31 January, 11 January and the Svir desert on 9 February. The two 9 February men are Antioch, whom the Romanian calendar keeps there too, and the Russian of the Svir, two lines on one day page.',
  'agapius charisius nicephorus agapius-martyr-1-march charisius-martyr-1-march nicephorus-martyr-1-march':
    'The three the 1 March page names together and knows nothing else about, each named after the others in the display name, which is what folds them.',
  'αγαπιοσ agapius-disciple-of-babylas agapius-martyr-1-march agapius-of-apamea agapius-of-colciu':
    'Four men, and two of them are on the Greek 1 March as two entries: the martyr of whom the page says «Δεν έχουμε λεπτομέρειες», named with Charisius and Nicephorus, and Agapius of Colciu, the Romanian elder of Athos whom both calendars keep there. Twenty centuries apart and two lines. The others are 24 January and 11 January.',
  'θεοφιλοσ theophilus-martyr-6-february theophilus-of-rome theophilus-the-deacon-of-libya theophilus-the-new':
    'Four men on four Greek days: 6 February, 28 February (Rome), 8 January and 30 January.',
  'σεραπιων serapion-disciple-of-cronides serapion-of-alexandria':
    'Two men: the disciple of Cronides on 13 September, and Serapion of Alexandria on 28 February.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-of-ierissos macarius-of-kios macarius-of-paphos macarius-of-pisma macarius-of-rome macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Thirteen now. The new one is Macarius of Rome on 28 February; the other twelve are read in the el-02-20 entry for this name form.',
  'γαιοσ gaius-disciple-of-dionysius-of-alexandria gaius-of-alexandria':
    'Two men: the disciple of Dionysius on 3 October, and Gaius of Alexandria on 28 February.',
  'αρσενιοσ arsenios-of-paros arsenius-companion-of-elias-speleotes arsenius-of-corfu arsenius-of-ikalto arsenius-of-rostov':
    'Five men on five Greek days: 31 January, 11 September, 19 January, 6 February and 28 February (Rostov).',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-of-corinth nicholas-of-japan nicholas-of-pskov nicholas-of-spetses nicholas-of-trebizond nicholas-of-valaam nicholas-patriarch-of-georgia nicholas-the-studite':
    'Ten now. The new one is Nicholas of Pskov on 28 February; the other nine are read in the el-02-26 entry for this name form.',
  'ιωνασ jonah-of-kyiv jonas-of-great-perm jonas-the-lerian':
    'Three men on three Greek days: Kyiv on 9 January, Great Perm on 29 January and the Lerian on 28 February.',
  'ευβουλοσ euboulos eubulus-of-caesarea':
    'Two men: the Euboulos saint.gr keeps on 28 February, and Eubulus of Caesarea on 3 February.',
  'τιτοσ titus-27-january titus-of-the-kiev-caves titus-the-soldier':
    'Three men, and two of them share 27 February as two lines of that day: Titus of the Kiev Caves, the hieromonk, and Titus the soldier, whom the Caves keep beside him. The third is the Titus of 27 January.',
  'τιμοθεοσ timothy-1-february timothy-disciple-of-babylas timothy-of-caesarea timothy-of-ephesus timothy-of-symbola':
    'Five men on five Greek days: 1 February, 24 January, 27 February (Caesarea), 22 January and 21 February.',
  'στεφανοσ stephen-27-february stephen-martyr-8-february stephen-of-chenolakkos stephen-of-placidianae':
    'Four men on four Greek days: 27 February, 8 February, 14 January and 11 January.',
  'φωτιοσ photius-of-constantinople photius-of-yuriev':
    'Two men: the patriarch on 6 February, whom the Romanian calendar keeps there too, and Yuriev on 27 February.',
  'ιακωβοσ jacob-of-nimouzan jacob-the-hermit james-of-cyrrhus james-of-nisibis james-of-samosata james-of-serbia james-of-zographou-the-first james-of-zographou-the-second':
    'Eight men on seven Greek days: 27 February (Nimouzan), 28 January, 6 February, 13 January, 29 January, 3 February, and the two of Zographou, whom their own company page names as two and the Greek keeps together on 22 September.',
  'ηλιασ elias-martyr-with-patermuthius elias-nikolayevich-hieromartyr elias-of-heliopolis elias-of-trebizond elias-the-cave-dweller-of-calabria elias-the-egyptian':
    'Six now. The new one is Elias of Trebizond on 27 February; the other five are read in the el-02-16 entry for this name form, where the two 16 February men are the Egyptian of the Pamphilus company and the Moscow hieromartyr.',
  'σεβαστιανοσ sebastian-of-cartagena sebastian-of-posesone':
    'Two men on one day, printed as two lines of the 26 February calendar and answered by two different pages: «Άγιος Σεβαστιανός ο δούκας», the ruler of Cartagena whom Photini the Samaritan brought to the faith, and «Όσιος Σεβαστιανός του Ποσεσόνε», whose page holds no life at all but a referral. Two entries on one calendar are two commemorations.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-katopinos nicholas-of-corinth nicholas-of-japan nicholas-of-spetses nicholas-of-trebizond nicholas-of-valaam nicholas-patriarch-of-georgia nicholas-the-studite':
    'Nine now. The new one is Nicholas Katopinos on 26 February; the other eight are read in the el-02-18 entry for this name form.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-disciple-of-limnaeus john-iii-scholasticus john-kalfas john-koulakiotis john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Eighteen now. The new one is John Kalfas on 26 February; the other seventeen are read in the el-02-23 entry for this name form.',
  'πολυκαρποσ polycarp-of-bryansk polycarp-of-smyrna polycarp-venerable-8-february':
    'Three men, and two share 23 February as two lines: Polycarp of Smyrna, whom the Romanian calendar keeps there too, and Polycarp of Bryansk, of whom the page says it has no details. The third is the venerable of 8 February.',
  'κλημησ clement-martyr-23-february clement-of-ancyra clement-of-mount-sagmation':
    'Three men on three Greek days: the martyr saint.gr keeps alone on 23 February, Ancyra on 23 January, which the Romanian calendar keeps too, and Mount Sagmation on 26 January.',
  'μωυσησ moses-disciple-of-polychronius moses-of-novgorod moses-of-ramas moses-of-the-white-lake':
    'Four men, and three of them share 23 February, which the page itself divides. saint.gr prints two companies of four ascetics on that day: one from Theodoret of Cyrrhus Philotheos Historia, where Moses stands with Zebinas, Polychronius and Damian, and one where Moses of Ramas stands with John the disciple of Limnaeus; and beside both it keeps Moses of the White Lake, the Russian of the Holy Trinity monastery about 1500. Three entries, three commemorations. Novgorod is 25 January.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-disciple-of-limnaeus john-iii-scholasticus john-koulakiotis john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Seventeen now. The new one is the disciple of Limnaeus on 23 February; the other sixteen are read in the el-02-21 entry for this name form.',
  'δαμιανοσ damian-disciple-of-polychronius damian-of-agrafa damian-of-esphigmenou':
    'Three men, and two of them share 23 February as two entries of that day: the disciple of Polychronius, one of the four ascetics whose lives the page takes from Theodoret of Cyrrhus, and Damian of Esphigmenou, whom the Romanian calendar keeps there too. Agrafa is 14 February.',
  'θεοκτιστη theoctiste-daughter-of-athanasia theoktiste-of-voronezh':
    'Two women: the daughter of Athanasia on 31 January, and Voronezh on 22 February.',
  'γερμανοσ germanos-of-stolobnoe germanus-of-novgorod germanus-of-sagmata':
    'Three men on three Greek days: Stolobnoe on 22 February, Novgorod on 10 February and Sagmata on 26 January.',
  'βλασιοσ blaise-of-sebaste blaise-the-cowherd blasius-22-february':
    'Three men on three Greek days: the bishop of Sebaste on 11 February, which the Romanian calendar keeps too, the cowherd on 3 February, and the Blasius saint.gr keeps alone on 22 February.',
  'σατουρνινοσ saturninus-martyr-6-february saturninus-of-africa':
    'Two men: the martyr saint.gr keeps on 6 February, and the African on 21 February.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta zacharias-of-jerusalem zacharias-son-of-barachias':
    'Four men on four Greek days: 5 September, 20 January, 21 February (the patriarch of Jerusalem) and 8 February.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-iii-scholasticus john-koulakiotis john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Sixteen now. The new one is John III Scholasticus, patriarch of Constantinople, on 21 February; the other fifteen are read in the el-02-15 entry for this name form, where the two 6 February men are Lycopolis and the prophet of Gaza.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-amastris george-of-develtos george-of-kratovo george-of-megara george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'Twelve now. The new one is the bishop of Amastris on 21 February; the other eleven are read in the el-02-14 entry for this name form.',
  'ανδρεασ andrew-6-january andrew-of-mytilene':
    'Two men: the one saint.gr keeps on 6 January, and the neomartyr of Mytilene on 21 February.',
  'ανατολιοσ anatolius-of-odessa anatolius-of-optina-25-january anatolius-of-raithu':
    'Three men on three Greek days: Odessa on 23 January, Optina on 25 January and Raithu on 21 February.',
  'πλωτινοσ plotinus-20-february plotinus-companion-of-saturninus':
    'Two men: the one saint.gr keeps alone on 20 February, and the companion of Saturninus on 12 February.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-of-ierissos macarius-of-kios macarius-of-paphos macarius-of-pisma macarius-of-valaam macarius-of-zhabyn macarius-the-confessor':
    'Twelve now. The two new ones are Valaam on 20 February and the Confessor on 19 February, whom the Romanian calendar keeps there too; the other ten are read in the el-02-16 entry for this name form, where the two 6 September men are the companion of Eudoxius and the magistrate of Alexandria.',
  'αγαθων agathon-of-alexandria agathon-of-rome agathon-of-the-desert agathon-of-the-kiev-caves':
    'Four men, and two share 20 February as two lines on the page: Agathon of Rome, the pope, whom the Romanian calendar keeps there too, and Agathon of the Kiev Caves. The others are 14 February at Alexandria and 8 January in the desert.',
  'θεοδοτοσ theodotus-1-january theodotus-companion-of-asklepiodote theodotus-of-marcianopolis theodotus-of-the-monastery-of-publius':
    'Four men on four Greek days: 1 January, 19 February, 17 September and 25 January. The 19 February and 17 September pair is the Marcianopolis question read in the entry for the name form ασκληπιοδοτη.',
  'νικητασ nicetas-of-epirus nicetas-of-pythia':
    'Two men: Epirus on 19 February, and Pythia on 4 February.',
  'μαξιμοσ maximus-brother-of-dometius maximus-companion-of-asklepiodote maximus-companion-of-fausta maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta':
    'Eight men on eight Greek days: 19 January, 19 February, 6 February, 13 January, 17 September, 16 January, 18 January and 25 September. The 19 February and 17 September pair is the Marcianopolis question read in the entry for the name form ασκληπιοδοτη.',
  'μαρια maria-6-january maria-of-olonets mary-called-marinos mary-of-aza mary-sister-of-lykarion mary-wife-of-xenophon':
    'Six women on six Greek days: 6 January, 19 February (Olonets), 12 February, 26 September, 8 February and 26 January.',
  'asklepiodote companion maximus asklepiodote-companion-of-maximus maximus-companion-of-asklepiodote':
    'Two of the four on the 19 February line, each named after the other in the display name, which is what folds them. A man and a woman, martyred together on one page.',
  'ασκληπιοδοτη asclepiodote-of-marcianopolis asklepiodote-companion-of-maximus':
    'The 19 February four and the Marcianopolis trio share three names and nothing else. saint.gr keeps Maximus, Theodotus and Asclepiodote of Marcianopolis on 17 September, where the corpus has them from the Russian calendar as leading citizens tried under Tiris, governor of Thrace, in the persecution of Maximian Galerius; its 19 February page prints «Άγιοι Μάξιμος, Θεόδοτος, Ησύχιος και Ασκληπιοδότη» and gives one account for all four with no homeland, no city, no emperor and no century, the three men cast into a furnace and the woman beheaded. Two entries on one Greek calendar are two commemorations by the settled rule, and the September row is already venerated and not a readers to move, so both companies stand — but the coincidence of three names in one company is strong and the pair is an open question in ro-run/FINDINGS.md.',
  'θεοδουλοσ theodulus-companion-of-agapitus theodulus-companion-of-pamphilus theodulus-of-caesarea-17-february theodulus-of-myropolis theodulus-son-of-nilus theodulus-the-executioner':
    'Six men on six Greek days: 18 February in the company of Agapitus, 16 February in the company of Pamphilus, 17 February at Caesarea under Maximinus, 12 September, 14 January and 4 September. The 16 and 17 February pair is read in the el-02-17 entry for this name form and is an open question in ro-run/FINDINGS.md for the city they share.',
  'παρηγοριοσ paregorius-of-patara paregorius-of-samosata':
    'Two men: Patara on 18 February, and Samosata on 29 January, which the Romanian calendar keeps too.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-of-corinth nicholas-of-japan nicholas-of-spetses nicholas-of-trebizond nicholas-of-valaam nicholas-patriarch-of-georgia nicholas-the-studite':
    'Eight men. The new one is the patriarch of Georgia on 18 February; the other seven are read in the el-02-14 entry for this name form, where the two 14 February men are Corinth and Trebizond and the two 3 February men are Japan and Spetses, each pair two lines on one day page.',
  'λεων leo-companion-of-manuel leo-of-nicaea leo-of-patara leo-the-great':
    'Four men, and two pairs share a day, each printed as its own line. On 18 February saint.gr keeps Leo the Great, bishop of Rome, whom the Romanian calendar keeps there too, and Leo of Patara, one of the martyrs of that city. On 22 January it keeps the companion of Manuel and the man of Nicaea. Two entries on one calendar are two commemorations.',
  'δωροθεοσ dorotheus-companion-of-agapitus dorotheus-of-chiliokomion':
    'Two men: the companion in the 18 February company of Agapitus, and Chiliokomion on 5 January.',
  'κοσμασ cosmas-companion-of-thomas-of-zographou cosmas-i-of-constantinople cosmas-of-yakhroma':
    'Three men: the Zographou companion on 22 September, the patriarch on 2 January, and Yakhroma on 18 February.',
  'θεοδουλοσ theodulus-companion-of-pamphilus theodulus-of-caesarea-17-february theodulus-of-myropolis theodulus-son-of-nilus theodulus-the-executioner':
    'Five men, and the close pair is read in the 17 February folder itself: the company of Pamphilus is crucified at Caesarea in Palestine under Diocletian on 16 February, while the 17 February Theodulus is martyred in the same city under Maximinus in 308. saint.gr keeps them on two of its own days and gives the reign as the ground of the distinction, so two folders stand and the shared city is recorded as an open question in ro-run/FINDINGS.md. The others are 12 September, 14 January and 4 September.',
  'ρωμανοσ romanus-of-karpenisi romanus-of-lacedaemon romanus-of-samosata romanus-of-tarnovo romanus-of-uglich romanus-the-cilician':
    'Six men on six Greek days: 5 January, 6 January, 29 January, 17 February, 3 February and 9 February.',
  'μιχαηλ michael-companion-of-platon-of-reval michael-mavroeidis michael-of-klops':
    'Three men on three Greek days: 1 January with Platon of Reval, 17 February (Mavroeidis) and 11 January at Klops.',
  'αγαθαγγελοσ agathangelus agathangelus-of-florina':
    'Two men: the martyr with Clement of Ancyra on 23 January, and the neomartyr of Florina on 17 February.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-metropolitan-of-moscow macarius-of-ierissos macarius-of-kios macarius-of-paphos macarius-of-pisma macarius-of-zhabyn':
    'Ten men. Two share 6 September and the page prints them as two lines, the companion of Eudoxius and the magistrate of Alexandria, so they are two commemorations. The rest are 18 January, 8 January, 16 February, 19 January, 6 October, 8 February, 10 January and 22 January. The 16 February man is the metropolitan of Moscow whose page says only that it has no details of his life; the corpus keeps several Macarii of Russian sees from Russian sources and none of them on this day, so nothing here identifies him with one of those and he stands as his own folder.',
  'θεοδουλοσ theodulus-companion-of-pamphilus theodulus-of-myropolis theodulus-son-of-nilus theodulus-the-executioner':
    'Four men on four Greek days: 16 February in the Pamphilus company, 12 September at Myropolis, 14 January as the son of Nilus, and 4 September the executioner.',
  'πορφυριοσ porphyrius-companion-of-baptos porphyrius-servant-of-pamphilus':
    'Two men: 10 February with Baptos, and 16 February, where the page calls him the servant of Pamphilus.',
  'ιουλιανοσ julian-companion-of-modestus julian-companion-of-pamphilus julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-the-deacon-of-aegina':
    'Seven men on seven Greek days: 12 February, 16 February (the Pamphilus company), 8 January, 6 February, 4 September, 29 January and 7 January.',
  'ιερεμιασ jeremiah-the-egyptian jeremias-i-of-constantinople':
    'Two men: the Egyptian of the Pamphilus company on 16 February, and the Ecumenical Patriarch on 13 January.',
  'ησαιασ isaiah-of-valaam isaiah-the-egyptian':
    'Two men: Valaam on 8 January, and the Egyptian named in Pamphilus of Caesarea company on 16 February.',
  'φλαβιανοσ flavian-of-constantinople flavian-the-recluse':
    'Two men on one day, and saint.gr prints them as two lines on 16 February: the archbishop of Constantinople, whom the Romanian calendar keeps there too, and «Όσιος Φλαβιανός» the recluse, whose page gives no see and only the sixty years he passed shut in a cell on a mountain summit. Two entries on one calendar are two commemorations.',
  'ηλιασ elias-martyr-with-patermuthius elias-nikolayevich-hieromartyr elias-of-heliopolis elias-the-cave-dweller-of-calabria elias-the-egyptian':
    'Five men. Two share 16 February and the day page separates them itself: Elias the Egyptian is named in the company of Pamphilus of Caesarea, martyred under Diocletian at Caesarea in Palestine, and Elias Nikolayevich is the Moscow hieromartyr of the Soviet years, born in the nineteenth century and shot after his 1932 arrest. The other three are 17 September with Patermuthius, 1 February at Heliopolis and 11 September in Calabria.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-koulakiotis john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'Fifteen men on fifteen Greek days: 6 October, 22 January, 15 February (Koulakiotis, the neomartyr saint.gr keeps there), 5 October, 31 January, 4 February, 24 January, 6 February, 3 February, 23 September, 26 January, 15 January, 10 February, 6 February and 12 February. The two 6 February entries are Lycopolis and the prophet of Gaza, two lines on one day page, so two commemorations and two men by the settled rule.',
  'ουαλεντινοσ valentine-of-interamna valentine-of-rome':
    'two men, and the second is a reader identity call the author should look at. saint.gr keeps Valentine of Rome on 14 Φεβρουαρίου, dated only «under the emperor Claudius» — which its own page gives as 41 to 54, recorded as the source printed it and not corrected. The other row went onto valentine-of-interamna, whose Romanian day is 30 iulie, on the reading that Terni is Interamna and the office matches; that identification is the readers and is flagged in ro-run/FINDINGS.md.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-of-corinth nicholas-of-japan nicholas-of-spetses nicholas-of-trebizond nicholas-of-valaam nicholas-the-studite':
    'seven now, and two arrive on this 14 Φεβρουαρίου: Nicholas of Corinth, dead 1554, whom the Romanian calendar keeps on the day too, and Nicholas of Trebizond, dead 1920. The other five are read in the el-02-04 entry for this name form.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-develtos george-of-kratovo george-of-megara george-of-vladimir george-paizanos-of-mytilene george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'eleven now. The new one is George Paizanos of Mytilene, a new-martyr dead 1693, kept on 14 Φεβρουαρίου; the other ten are read in the el-02-13 entry for this name form. He is not george-the-iberian-2-january, the other new-martyr at Mytilene, whose death the page reads as 1770 or 1777 — a century apart on two days.',
  'αυξεντιοσ auxentius-of-bithynia auxentius-of-kartilio auxentius-of-vella':
    'three men, and two of them are on this 14 Φεβρουαρίου: Auxentius of Bithynia, dead between 470 and 472, whom the Romanian calendar keeps on the day too, and Auxentius of Kartilio, whose page gives no year. The third is Auxentius of Vella, written in this wave on 25 Ιανουαρίου.',
  'απολλωνιοσ apollonius-companion-of-proclus apollonius-the-anchorite':
    'two men. The new one is the Apollonius of the 14 Φεβρουαρίου line with Proclus; the corpus keeps Apollonius the Anchorite, written in this wave on 21 Ιανουαρίου. Neither page gives a year and neither names the other.',
  'apollonius companion proclus apollonius-companion-of-proclus proclus-companion-of-apollonius':
    'one line folded onto itself. saint.gr names Proclus and Apollonius together on 14 Φεβρουαρίου and the synaxis ruling makes that two folders, each display name carrying the other.',
  'antony bassus companion antony-companion-of-bassus bassus-companion-of-antony':
    'one line folded onto itself, the ninth of its kind in this wave. saint.gr names Bassus and Antony together on 14 Φεβρουαρίου and the synaxis ruling makes that two folders, each display name carrying the other.',
  'αντωνιοσ anthony-of-constantinople anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-companion-of-bassus antony-of-novgorod antony-son-of-john-of-syracuse antony-the-athenian':
    'thirteen now. The new one is the Antony whom the 14 Φεβρουαρίου line names with Bassus; the other twelve are read in the el-02-10 entry for this name form, with anthony-of-constantinople, dead 901, upgraded in this wave on 12 Φεβρουαρίου — the one of the thirteen whose own page argues with itself about which Anthony the day belongs to, which is in ro-run/FINDINGS.md.',
  'αγαθων agathon-of-alexandria agathon-of-the-desert':
    'two men, neither with a year. saint.gr keeps Agathon of Alexandria on 14 Φεβρουαρίου and Agathon of the Desert on 8 Ιανουαρίου, both written in this wave; the cities are all either page gives to tell them by. A third Agathon, on 28 Φεβρουαρίου, carries the page own doubt-asterisk and was refused.',
  'γεωργιοσ george-konissky george-of-alikianos george-of-develtos george-of-kratovo george-of-megara george-of-vladimir george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'ten now. The new one is George Konissky, archbishop of Belorussia, kept on 13 Φεβρουαρίου; the other nine are read in the el-02-11 entry for this name form. Ten men on ten Greek days.',
  'βασιανοσ bassian-of-rostov vassian-of-uglich':
    'two men, and the spellings are the corpus own: Vassian of Uglich, dead 1509, on 12 Φεβρουαρίου, against Bassian of Rostov, dead 1516, written in this wave on 25 Ιανουαρίου. Seven years and two towns apart, and a third of the name, bassian-of-rostov-23-march, is drafted for the Greek 23 Μαρτίου with a death in 1481 — that one is the author question, because two Bassians of one town is what a doubled commemoration looks like.',
  'προχοροσ prochorus-of-georgia prochorus-of-vranski prochorus-the-lebednik':
    'three men. The new one is Prochorus of Georgia, dead 1066, kept on 12 Φεβρουαρίου; the other two are read in the el-02-10 entry for this name form.',
  'companion plotinus saturninus plotinus-companion-of-saturninus saturninus-companion-of-plotinus':
    'one line folded onto itself. saint.gr names Saturninus and Plotinus together on 12 Φεβρουαρίου and the synaxis ruling makes that two folders, each display name carrying the other.',
  'μοδεστοσ modestus-companion-of-julian modestus-companion-of-zoticus':
    'two men, and each is named on his page by the man he suffered with: the Modestus of 12 Φεβρουαρίου with Julian, and the Modestus of 12 Ιανουαρίου with Zoticus, Rogatus and Castulus, written in this wave. Two entries, one month apart, two companies.',
  'μελετιοσ meletius-of-antioch meletius-of-kharkov meletius-of-lardos meletius-of-ryazan':
    'four men. The new one is Meletius of Lardos, whom the Romanian calendar keeps on 12 februarie too; the corpus keeps Meletius of Antioch, whose day this also is, Meletius of Kharkov, and Meletius of Ryazan, written in this wave on 14 Ιανουαρίου.',
  'μαρια maria-6-january mary-called-marinos mary-of-aza mary-sister-of-lykarion mary-wife-of-xenophon':
    'five now. The new one is the Mary who lived as the monk Marinos, of the fifth or seventh century, kept on 12 Φεβρουαρίου with her father Eugenius; the others are read in the el-01-06 entry for this name form, with Mary the sister of Lykarion and Mary the wife of Xenophon, both upgraded in this wave.',
  'ιουλιανοσ julian-companion-of-modestus julian-of-antinoopolis julian-of-emesa julian-of-kandavla julian-of-samosata julian-the-deacon-of-aegina':
    'six now. The new one is the Julian of the 12 Φεβρουαρίου line with Modestus; the others are read in the el-01-08 entry for this name form, with Julian of Emesa and Julian of Samosata, both upgraded in this wave.',
  'companion julian modestus julian-companion-of-modestus modestus-companion-of-julian':
    'one line folded onto itself, the eighth of its kind in this wave. saint.gr names Julian and Modestus together on 12 Φεβρουαρίου and the synaxis ruling makes that two folders, each display name carrying the other.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza john-the-sinaite-venerable-martyr':
    'fourteen now. The new one is John the Sinaite, a venerable-martyr dead 1091, kept on 12 Φεβρουαρίου; the other thirteen are read in the el-02-10 entry for this name form.',
  'ευγενιοσ eugene-of-trebizond eugene-son-of-paul-and-tatta eugenius-father-of-mary-called-marinos':
    'three men. The new one is Eugenius, the father whose daughter lived as the monk Marinos, kept on 12 Φεβρουαρίου; the corpus keeps Eugene of Trebizond, upgraded in this wave on 21 Ιανουαρίου, and the son of Paul and Tatta.',
  'αλεξιοσ alexis-of-moscow alexis-of-voronezh':
    'two men. saint.gr keeps Alexis of Voronezh, dead 1930, on 12 Φεβρουαρίου — the day of Alexis of Moscow, whose own row the corpus already held. A metropolitan shot under the Soviets and the fourteenth-century metropolitan of Moscow, on one day and two entries.',
  'γεωργιοσ george-of-alikianos george-of-develtos george-of-kratovo george-of-megara george-of-vladimir george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'nine now. The new one is George of Kratovo, kept on 11 Φεβρουαρίου; the other eight are read in the el-02-07 entry for this name form.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-georgia gabriel-of-lesnovo gabriel-of-novgorod-and-saint-petersburg gabriel-of-saint-stephens-jerusalem gabriel-the-martyr-2-february gabriel-vsevolod-of-novgorod':
    'seven now. The new one is Gabriel Vsevolod of Novgorod, the prince, kept on 11 Φεβρουαρίου; the others are read in the el-01-26 entry for this name form, with the martyr Gabriel whom this wave upgraded on 2 Φεβρουαρίου.',
  'δημητριοσ demetrius-of-chios demetrius-of-constantinople demetrius-of-prilutsk demetrius-the-skeuophylax':
    'four now. The new one is Demetrius of Prilutsk, kept on 11 Φεβρουαρίου; the other three are read in the el-01-29 entry for this name form.',
  'κασσιανοσ cassian-of-axylou cassian-of-bosoi':
    'two men. saint.gr keeps Cassian of Bosoi, dead 1532, on 11 Φεβρουαρίου; the corpus keeps Cassian of Axylou, with no year on his page, on the Greek 6 October. A sixteenth-century Russian and an undated Byzantine, on two days four months apart.',
  'ζηνων zeno-of-diospolis zeno-the-courier zeno-the-faster-of-kiev':
    'three men. The new one is Zeno the Courier, whose page gives no year, kept on 10 Φεβρουαρίου; the other two are read in the el-01-30 entry for this name form, one of them an apostle of the seventy.',
  'προχοροσ prochorus-of-vranski prochorus-the-lebednik':
    'two men. saint.gr keeps Prochorus the Lebednik, dead 1107, on 10 Φεβρουαρίου; the corpus keeps Prochorus of Vranski, written in this wave on 15 Ιανουαρίου.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-philosopher-of-georgia john-the-prophet-of-gaza':
    'thirteen now. The new one is John the Philosopher of Georgia, whose page gives no year, kept on 10 Φεβρουαρίου; the other twelve are read in the el-02-06 entry for this name form.',
  'baptos companion porphyrius baptos-companion-of-porphyrius porphyrius-companion-of-baptos':
    'one line folded onto itself, the seventh of its kind in this wave. saint.gr names Porphyrius and Baptos together on 10 Φεβρουαρίου and the synaxis ruling makes that two folders, each display name carrying the other, so the folded key holds both forenames whichever of the two it is read from.',
  'αναστασιοσ anastasius-8-january anastasius-of-nauplion anastasius-patriarch-of-jerusalem':
    'three men. The new one is Anastasius, patriarch of Jerusalem, whose page gives no year, kept on 10 Φεβρουαρίου; the other two are read in the el-02-01 entry for this name form.',
  'συμεων simeon-of-tver simeon-the-elder symeon-of-novgorod symeon-the-god-receiver symeon-the-new-of-mytilene':
    'five now. The new one is Symeon of Novgorod, dead 1421, from the enumerated synaxis of that see; the other four are read in the el-02-03 entry for this name form.',
  'λουκασ luke-of-emesa luke-of-hellas luke-of-novgorod':
    'three men. The new one is Luke of Novgorod, dead 1060, from the enumerated synaxis of that see; the corpus keeps Luke of Emesa among the three the Greek 29 Ιανουαρίου names and Luke of Hellas, upgraded in this wave on 7 Φεβρουαρίου.',
  'ιωακειμ joachim-of-novgorod joachim-of-tarnovo joachim-the-righteous':
    'three men. The new one is Joachim of Novgorod, dead 1030, from the enumerated synaxis of that see; the other two are read in the el-01-18 entry for this name form.',
  'γρηγοριοσ gregory-of-akritas gregory-of-moesia gregory-of-novgorod gregory-of-nyssa gregory-the-elder gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius':
    'eight now. The new one is Gregory of Novgorod, dead 1193, from the enumerated synaxis of that see; the other seven are read in the el-01-08 entry for this name form.',
  'γερμανοσ germanus-of-novgorod germanus-of-sagmata':
    'two men. Germanus of Novgorod, dead 1096, comes from the enumerated synaxis of that see on 10 Φεβρουαρίου; Germanus of Sagmata was written in this wave on 26 Ιανουαρίου beside Clement of the same mountain.',
  'γενναδιοσ gennadius-of-corfu gennadius-of-kostroma gennadius-of-novgorod gennadius-of-the-svir-desert':
    'four now. The new one is Gennadius of Novgorod, dead 1505, from the enumerated synaxis of that see; the other three are read in the el-02-09 entry for this name form.',
  'βασιλειοσ basil-martyr-6-february basil-of-novgorod basil-of-thessalonica basil-uncle-of-eustratius':
    'four now. The new one is Basil, archbishop of Novgorod, dead 1352, from the enumerated synaxis of that see; the other three are read in the el-02-06 entry for this name form.',
  'αρκαδιοσ arcadius-martyr-12-january arcadius-of-novgorod arcadius-of-vyazniki arcadius-son-of-xenophon':
    'four now. The new one is Arcadius of Novgorod, dead 1162, from the enumerated synaxis of that see on 10 Φεβρουαρίου; the other three are read in the el-01-26 entry for this name form.',
  'αντωνιοσ anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-of-novgorod antony-son-of-john-of-syracuse antony-the-athenian':
    'eleven now. The new one is Antony of Novgorod, dead 1231, one of the hierarchs of that see whom saint.gr enumerates on 10 Φεβρουαρίου; the other ten are read in the el-02-05 entry for this name form. The Novgorod synaxis is why this day raised nine folds at once: it names its bishops, so each is a folder, and nine of their forenames were already in the corpus.',
  'ρωμανοσ romanus-of-karpenisi romanus-of-lacedaemon romanus-of-samosata romanus-of-uglich romanus-the-cilician':
    'five now. The new one is Romanus the Cilician, whose page gives no year, kept on 9 Φεβρουαρίου; the other four are read in the el-02-03 entry for this name form.',
  'παγκρατιοσ pancratius-of-tauromenium pancratius-the-recluse-of-the-caves':
    'two men on one day, thirteen centuries apart, and the Greek calendar keeps them as two entries: Pancratius of Tauromenium, the first-century bishop whom the Romanian calendar also keeps on 9 Φεβρουαρίου, and Pancratius the Recluse of the Kyiv Caves, whose page gives no year.',
  'νικηφοροσ nicephorus-martyr-8-february nicephorus-of-antioch nicephorus-of-corinth nicephorus-of-crete nicephorus-of-the-svir-desert':
    'five now, and two are on this 9 Φεβρουαρίου: Nicephorus of Antioch, martyred 257, whom the Romanian calendar keeps on the day too, and Nicephorus of the Svir desert of the sixteenth century. The other three are read in the el-02-08 entry for this name form.',
  'γενναδιοσ gennadius-of-corfu gennadius-of-kostroma gennadius-of-the-svir-desert':
    'three men. The new one is Gennadius of the Svir desert, of the sixteenth century, kept on 9 Φεβρουαρίου beside Nicephorus of the same desert; the other two are read in the el-01-23 entry for this name form.',
  'στεφανοσ stephen-martyr-8-february stephen-of-chenolakkos stephen-of-placidianae':
    'three men. The new one is the Stephen of 8 Φεβρουαρίου; the other two are read in the el-01-14 entry for this name form, the abbot of Chenolakkos and Stephen of Placidianae, whose houses are the only thing their pages give to tell them by.',
  'σαββασ sabbas-of-sicily sabbas-of-zographou sabbas-the-spiritual sava-of-serbia sava-the-second':
    'five now, and this is the one the wave was warned about: **Sava II of Serbia, dead 1271, is a new folder and not `sava-of-serbia`**, whose own greek row is venerated on 14 Ιανουαρίου. The reader who met the 8 Φεβρουαρίου line read it as the second Sava and said so; the other three are read in the el-02-05 entry for this name form.',
  'νικηφοροσ nicephorus-martyr-8-february nicephorus-of-corinth nicephorus-of-crete':
    'three men. The new one is the Nicephorus of 8 Φεβρουαρίου; the corpus keeps Nicephorus one of the seven martyrs of Corinth, upgraded in this wave on 31 Ιανουαρίου, and Nicephorus of Crete, written on 11 Ιανουαρίου. Three entries, three days.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-of-ierissos macarius-of-kios macarius-of-paphos macarius-of-pisma macarius-of-zhabyn':
    'nine now. The new one is Macarius of Paphos, kept on 8 Φεβρουαρίου; the other eight are read in the el-01-08 entry for this name form.',
  'θεοπεμπτοσ theopemptus-2-january theopemptus-7-february theopemptus-of-nicomedia':
    'three men. The new one is the Theopemptus of 7 Φεβρουαρίου; the corpus keeps the Theopemptus of 2 Ιανουαρίου, whose page has him dying in peace, and Theopemptus of Nicomedia, the martyr bishop upgraded in this wave on 5 Ιανουαρίου. Three entries on three days of one calendar.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-galatia peter-of-monevata peter-of-sebaste peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'fourteen now. The new one is Peter of Monevata, kept on 7 Φεβρουαρίου, beside Peter of Galatia whom this wave upgraded on the Greek 1 Φεβρουαρίου; the other twelve are read in the earlier entries for this name form, from el-01-01 to el-01-30. Fourteen men on fourteen Greek days, and the reading has never once changed.',
  'γεωργιοσ george-of-alikianos george-of-develtos george-of-megara george-of-vladimir george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'eight now. The new one is George of Alikianos, kept on 7 Φεβρουαρίου; the other seven are read in the el-02-04 entry for this name form. Eight men and eight Greek days.',
  'θεοφιλοσ theophilus-martyr-6-february theophilus-the-deacon-of-libya theophilus-the-new':
    'three men. The new one is the Theophilus of 6 Φεβρουαρίου, martyred between 249 and 251; the other two are read in the el-01-30 entry for this name form, the deacon of Libya and Theophilus the New of about 800.',
  'σιλουανοσ silvanus-martyr-6-february silvanus-of-emesa':
    'two men. The new one is the Silvanus of the 6 Φεβρουαρίου line with Faustus and Basil; the corpus keeps Silvanus of Emesa, dead 284, upgraded in this wave on 29 Ιανουαρίου. The same doubt the page raises over his companions is recorded in his life.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-lycopolis john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller john-the-prophet-of-gaza':
    'twelve now, and two arrive on this 6 Φεβρουαρίου: John of Lycopolis of the fourth century, and John the Prophet of Gaza of the sixth, whom the Romanian calendar keeps on the day too. The other ten are read in the el-02-04 entry for this name form.',
  'ιακωβοσ jacob-the-hermit james-of-cyrrhus james-of-nisibis james-of-samosata james-of-serbia james-of-zographou-the-first james-of-zographou-the-second':
    'seven now. The new one is James of Cyrrhus, whose page gives no year, kept on 6 Φεβρουαρίου; the other six are read in the el-02-03 entry for this name form.',
  'φαυστοσ faustus-disciple-of-dionysius-of-alexandria faustus-martyr-6-february':
    'two men. The new one is the Faustus of the 6 Φεβρουαρίου line with Basil and Silvanus; the corpus keeps Faustus the disciple of Dionysius of Alexandria, dead 254 to 264, on the Greek 3 October. The 6 February page carries a doubt of its own — that the three may be the Faustus, Basil and Lucian of 25 Οκτωβρίου, because the couplet over them is the same — and that doubt is recorded in all three lives. The third name differs, the corpus holds no folder for the October company, and that page was not read, so nothing was merged.',
  'δαμασκηνοσ damascene-of-gabrovo damascene-the-sinaite':
    'two men, a century and a half apart, both new-martyrs under the Turks: Damascene the Sinaite, dead 1623, on 6 Φεβρουαρίου, and Damascene of Gabrovo, dead 1771, on 16 Ιανουαρίου, both written in this wave.',
  'βασιλειοσ basil-martyr-6-february basil-of-thessalonica basil-uncle-of-eustratius':
    'three men. The new one is the Basil whom saint.gr names on 6 Φεβρουαρίου with Faustus and Silvanus, three friends martyred by the sword and nothing else on the page — no homeland, no century, no persecutor. The corpus keeps Basil of Thessalonica, upgraded in this wave on 1 Φεβρουαρίου, and the ninth-century uncle of Eustratius on 9 Ιανουαρίου.',
  'θεοδοσιοσ theodosius-companion-of-paisius theodosius-of-antioch theodosius-of-chernigov theodosius-of-the-kyiv-caves theodosius-of-totma theodosius-of-trebizond theodosius-of-triglia theodosius-the-cenobiarch':
    'eight now, and two arrive on this 5 Φεβρουαρίου: Theodosius of Antioch, whose page gives no year, and Theodosius of Chernigov, dead 1696, whose Russian row is 9 September and whose Greek day is this one. The other six are read in the el-01-11 and el-01-12 entries for this name form.',
  'σαββασ sabbas-of-sicily sabbas-of-zographou sabbas-the-spiritual sava-of-serbia':
    'four now. The new one is Sabbas of Sicily, dead 995, kept on 5 Φεβρουαρίου; the other three are read in the el-02-03 entry for this name form, where the fourth and fifth of the name are also named — Sava II of Serbia is drafted for 8 Φεβρουαρίου and is not any of these.',
  'πολυευκτοσ polyeuctus-of-constantinople polyeuctus-of-megara polyeuctus-of-melitene':
    'three men. The new one is Polyeuctus, patriarch of Constantinople, dead 970, kept on 5 Φεβρουαρίου; the other two are read in the el-02-01 entry for this name form, the martyr of Megara and the soldier of Melitene.',
  'αντωνιοσ anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-son-of-john-of-syracuse antony-the-athenian':
    'ten now. The new one is Antony the Athenian, a new-martyr of 1774, kept on 5 Φεβρουαρίου; the other nine are read in the el-02-01 entry for this name form.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-of-japan nicholas-of-spetses nicholas-of-valaam nicholas-the-studite':
    'five now. The new one is Nicholas the Studite, dead 868, kept on 4 Φεβρουαρίου; the other four are read in the el-02-03 entry for this name form.',
  'ιωσηφ joseph-of-aleppo joseph-of-lythrodontas':
    'two men. saint.gr keeps Joseph of Aleppo, dead 1686, on 4 Φεβρουαρίου; the corpus keeps Joseph of Lythrodontas, with no year, on the Greek 6 October. A Syrian of the seventeenth century and a Cypriot, on two days.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-edessa john-of-irenopolis john-of-kazan john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller':
    'ten now. The new one is John of Irenopolis, dead 325, kept on 4 Φεβρουαρίου; the other nine are read in the el-02-03 entry for this name form. Ten men, ten Greek days, and no page naming another.',
  'γεωργιοσ george-of-develtos george-of-megara george-of-vladimir george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'seven now. The new one is George of Vladimir, the prince killed in 1238, kept on 4 Φεβρουαρίου; the other six are read in the el-02-01 entry for this name form.',
  'ευαγριοσ evagrius-companion-of-theodoula evagrius-of-georgia evagrius-of-iberia':
    'three men, and two of the three are Georgians. saint.gr keeps Evagrius of Georgia, whose page gives no year, on 4 Φεβρουαρίου, and Evagrius of Iberia, a monk and deacon of about 415, on 6 Ιανουαρίου; the third is the Evagrius martyred with Theodoula in 298, read in the el-01-06 entry for this name form. Two Georgians on two days is the calendar keeping two men, not one twice.',
  'κυριλλοσ cyril-of-alexandria cyril-of-kazan cyril-of-the-white-lake cyril-of-zographou':
    'four now. The new one is Cyril of the White Lake, dead 1532, kept on 4 Φεβρουαρίου; the other three are read in the el-01-26 entry for this name form.',
  'συμεων simeon-of-tver simeon-the-elder symeon-the-god-receiver symeon-the-new-of-mytilene':
    'four now. The new one is Simeon of Tver, dead 1289, kept on 3 Φεβρουαρίου — the day of Symeon the God-Receiver, whose own row the wave left alone. The other two are read in the el-02-01 entry for this name form, the Elder of 26 Ιανουαρίου and the New of Mytilene.',
  'σαββασ sabbas-of-zographou sabbas-the-spiritual sava-of-serbia':
    'three men. The new one is Sabbas the Spiritual, dead 1505, kept on 3 Φεβρουαρίου; the corpus keeps Sava of Serbia, upgraded in this wave on the Greek 14 January, and Sabbas of Zographou among the Athonite martyrs of the 1270s. A second Serbian Sava — Sava II, dead 1271 — is drafted for the Greek 8 Φεβρουαρίου and is not this man either.',
  'ρωμανοσ romanus-of-karpenisi romanus-of-lacedaemon romanus-of-samosata romanus-of-uglich':
    'four men. The new one is Romanus of Uglich, dead 1285, kept on 3 Φεβρουαρίου; the other three are the new-martyr of Karpenisi and the hieromonk of Lacedaemon, read in the el-01-06 entry for this name form, and Romanus of Samosata among the seven of 29 Ιανουαρίου.',
  'ιακωβοσ jacob-the-hermit james-of-nisibis james-of-samosata james-of-serbia james-of-zographou-the-first james-of-zographou-the-second':
    'six men. The new one is James of Serbia, of the thirteenth century, kept on 3 Φεβρουαρίου; the corpus keeps Jacob the hermit and James of Nisibis, both upgraded in this wave, James of Samosata among the seven the Greek 29 Ιανουαρίου keeps, and the two Jameses of Zographou, whom the corpus already numbers the first and the second because the Athonite company held two of the name.',
  'σιμων simon-of-zographou simon-the-martyr-3-february':
    'two men. saint.gr keeps a bare martyr Simon with no year on 3 Φεβρουαρίου; the corpus keeps Simon of Zographou among the Athonite martyrs of 1275 to 1282, on the Romanian 10 October and the Greek 22 September.',
  'παυλοσ paul-brother-of-pausirius paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-obnora paul-of-simonov paul-of-zographou paul-the-martyr-3-february':
    'seven now, and two arrive on this 3 Φεβρουαρίου: Paul of Simonov, dead 1825, and a bare martyr Paul with no year. The other five are read in the el-01-10 and el-01-24 entries for this name form.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-of-japan nicholas-of-spetses nicholas-of-valaam':
    'four now, and two of them are on this 3 Φεβρουαρίου: Nicholas of Japan, dead 1912, whom the Romanian calendar keeps on the day too, and Nicholas of Spetses, dead 1822. The other two are read in the el-01-06 entry for this name form.',
  'λαυρεντιοσ laurence-martyr-9-january laurence-of-canterbury laurence-of-turov':
    'three men. The new one is Laurence of Canterbury, dead 619, kept on 3 Φεβρουαρίου; the other two are read in the el-01-29 entry for this name form, the bishop of Turov dead 1194 and the bare martyr of 9 Ιανουαρίου.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-edessa john-of-kazan john-of-spetses john-of-syracuse john-son-of-xenophon john-the-hut-dweller':
    'nine now. The new one is John of Spetses, dead 1822, one of the two the island keeps with Nicholas; the other eight are read in the el-01-22, el-01-24, el-01-26 and el-01-31 entries for this name form.',
  'κλαυδιοσ claudius-of-corinth claudius-venerable-3-february':
    'two men, and the states of life differ. saint.gr keeps a venerable Claudius with no year on 3 Φεβρουαρίου; the corpus keeps Claudius one of the seven martyrs of Corinth, upgraded in this wave on 31 Ιανουαρίου. A monastic and a martyr of a named company.',
  'αδριανοσ adrian-of-caesarea adrian-of-canterbury adrian-of-megara':
    'three men. The new one is Adrian of Caesarea, whose page gives no year, kept on 3 Φεβρουαρίου; the other two are read in the el-02-01 entry for this name form, the martyr of Megara and the English abbot of the Greek 9 January.',
  'ευθυμιοσ euthymius-kereselidze euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god':
    'four now. The new one is Euthymius Kereselidze, the Georgian hymnographer, kept on 2 Φεβρουαρίου; the other three are read in the el-01-20 entry for this name form — the patriarch of Tarnovo dead 1402, the Athonite martyr of the 1270s, and the Georgian professor of 1863 to 1953. Two Georgians among the four and two different centuries, and saint.gr keeps them on two days.',
  'τιμοθεοσ timothy-1-february timothy-disciple-of-babylas timothy-of-ephesus':
    'three men, none of them with a year on his page, on three days of one calendar: the bare Timothy of 1 Φεβρουαρίου, the disciple of Babylas of Sicily on the 24th, and Timothy of Ephesus the apostle on the 22nd, the last two upgraded earlier in this wave. Three entries, three commemorations.',
  'πολυευκτοσ polyeuctus-of-megara polyeuctus-of-melitene':
    'two men. saint.gr keeps Polyeuctus of Megara, whose page gives no year, on 1 Φεβρουαρίου — one of the company the town keeps with Adrian, George and Plato — and the corpus keeps Polyeuctus of Melitene, martyred 249 to 259, on the Romanian and Greek 9 January. A martyr of Megara is not the soldier of Melitene.',
  'συμεων simeon-the-elder symeon-the-new-of-mytilene':
    'two men. saint.gr keeps Symeon the New of Mytilene on 1 Φεβρουαρίου with David, and Simeon the Elder on 26 Ιανουαρίου, written earlier in this wave. The calendar own epithets, the Elder and the New, are what keep them apart and neither page gives a year.',
  'δαβιδ david-of-mytilene david-son-of-prince-theodore':
    'two men. saint.gr keeps David of Mytilene, whose page gives no year, on 1 Φεβρουαρίου with Symeon the New; the corpus keeps David the son of prince Theodore, dead 1321, on the Russian and Greek 19 September.',
  'πλατων plato-of-megara platon-kulbusch':
    'two men. saint.gr keeps Plato of Megara, whose page gives no year, on 1 Φεβρουαρίου; the corpus keeps Platon Kulbusch of Reval, shot in 1919, on the Greek 1 January and the Romanian 14 January. A martyr of Megara and a bishop of the Soviet years, twenty centuries apart at the outside.',
  'γεωργιοσ george-of-develtos george-of-megara george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'six now. The new one is George of Megara, whose page gives no year, kept on 1 Φεβρουαρίου with Adrian and Plato of the same town; the other five are read in the el-01-28 entry for this name form.',
  'ηλιασ elias-martyr-with-patermuthius elias-of-heliopolis elias-the-cave-dweller-of-calabria':
    'three men. The new one is Elias of Heliopolis, dead 799, kept on 1 Φεβρουαρίου; the corpus keeps the Elias martyred with Patermuthius, 305 to 311, on three calendars on 17 September, and the cave-dweller of Calabria of the ninth century on the Greek 11 September. Three days, three centuries.',
  'αντωνιοσ anthony-of-georgia anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-son-of-john-of-syracuse':
    'nine now. The new one is Anthony of Georgia, of the sixth century, kept on 1 Φεβρουαρίου; the other eight are read in the el-01-17 and el-01-08 entries for this name form, four of them standing together on the great Anthony own day.',
  'αναστασιοσ anastasius-8-january anastasius-of-nauplion':
    'two men. saint.gr keeps Anastasius of Nauplion, a new-martyr dead 1654 or 1655, on 1 Φεβρουαρίου, and a bare Anastasius with no year on 8 Ιανουαρίου; both were written in this wave. An early-modern new-martyr under the Turks is not a bare January line.',
  'αδριανοσ adrian-of-canterbury adrian-of-megara':
    'two men. saint.gr keeps Adrian of Megara, whose page gives no year, on 1 Φεβρουαρίου; the corpus keeps Adrian of Canterbury, the abbot written in this wave on the Greek 9 January. A martyr of Megara is not an English abbot.',
  'θεοδοτη theodote-daughter-of-athanasia theodote-mother-of-the-unmercenaries':
    'two women, and each is named on her page by her kin: the Theodote whom saint.gr names with her mother Athanasia on 31 Ιανουαρίου, and Theodote the mother of the Unmercenaries, written in this wave on the Greek 2 Ιανουαρίου, whose page sends the reader to 1 November for her sons. A daughter and a mother, two days and two households apart.',
  'ζηνων zeno-of-diospolis zeno-the-faster-of-kiev':
    'two men, and one is an apostle. saint.gr keeps Zeno the Faster of the Kyiv Caves, of the fourteenth century, on 30 Ιανουαρίου; the corpus keeps Zeno of Diospolis, one of the seventy, on the Romanian 27 April and the Greek 27 September. A late-medieval Russian monk is not an apostle of the seventy.',
  'θεοφιλοσ theophilus-the-deacon-of-libya theophilus-the-new':
    'two men. saint.gr keeps Theophilus the New, a soldier martyred about 800, on 30 Ιανουαρίου, and Theophilus the deacon of Libya, whose page gives no year, on the 8th; both were written in this wave. The epithet «the New» is the calendar own way of keeping them apart.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-bulgaria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'twelve now. The new one is Peter, king of Bulgaria, dead 967, kept on 30 Ιανουαρίου; the other eleven are read in the earlier entries for this name form in this wave, from el-01-01 to el-01-27. Twelve men on twelve Greek days, and no page names another.',
  'λαυρεντιοσ laurence-martyr-9-january laurence-of-turov':
    'two men, twenty days apart on one calendar. saint.gr keeps Laurence, bishop of Turov, dead 1194, on 29 Ιανουαρίου, and a bare martyr Laurence with no year on the 9th, both written in this wave. A twelfth-century Russian bishop is not a martyr of the persecutions.',
  'ιωνασ jonah-of-kyiv jonas-of-great-perm':
    'two men, four centuries apart. saint.gr keeps Jonas, bishop of Great Perm, dead 1471, on 29 Ιανουαρίου; the corpus keeps Jonah of Kyiv, dead 1902, on the Greek 9 January, written earlier in this wave.',
  'δημητριοσ demetrius-of-chios demetrius-of-constantinople demetrius-the-skeuophylax':
    'three men. The new one is Demetrius of Chios, a new-martyr of 1802, kept on 29 Ιανουαρίου; the other two are read in the el-01-27 entry for this name form — the Skeuophylax of the 25th and the new-martyr of Constantinople of 1784 on the 27th. Two new-martyrs eighteen years apart and two separate days, which is what the calendar says and all it says.',
  'γεωργιοσ george-of-develtos george-the-chozebite george-the-hungarian george-the-iberian-2-january george-the-persian':
    'five now. The new one is George the Hungarian, a martyr of 1015, kept on 28 Ιανουαρίου; the other four are the bishop of Develtos on the 22nd, the Chozebite whom the Romanian and Greek calendars keep on the 8th, the Iberian new-martyr at Mytilene on the 2nd and the Persian of 615 on the 6th, read in the el-01-06 and el-01-22 entries for this name form.',
  'εφραιμ ephrem-of-kiev ephrem-of-novotorzhsk ephrem-the-syrian':
    'three men on one day, and saint.gr keeps them as three entries: Ephrem the Syrian, dead 373, whom the Romanian calendar keeps on 28 ianuarie too, and two eleventh-century Russians who bear his name — the bishop of Kiev dead 1098 and the monk of Novotorzhsk dead 1053. The corpus already reads three Efrems apart on three Romanian days for the same reason; this is the Greek calendar doing it on one.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-egyptian peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'eleven now. The new one is Peter the Egyptian, a hermit whose page gives no year, kept on 27 Ιανουαρίου; the other ten are read in the el-01-01 through el-01-26 entries for this name form. Eleven men on eleven Greek days.',
  'δημητριοσ demetrius-of-constantinople demetrius-the-skeuophylax':
    'two men, two days apart on one calendar. saint.gr keeps Demetrius the Skeuophylax on 25 Ιανουαρίου, written earlier in this wave, and Demetrius of Constantinople, a new-martyr of 1784, on the 27th. A keeper of the vessels and a new-martyr under the Turks.',
  'δημητριανοσ demetrianus-of-tamassos demetrianus-son-of-demetrius':
    'two men. saint.gr keeps Demetrianus, bishop of Tamassos in Cyprus and wonderworker, on 27 Ιανουαρίου; the corpus keeps Demetrianus the son of Demetrius, a first-century martyr, on the Russian and Greek 11 September. A Cypriot bishop is not an apostolic-age martyr.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-gaoler peter-the-peloponnesian peter-the-sign-bearer':
    'ten now. The new one is Peter the Gaoler, martyred 295, kept on 26 Ιανουαρίου; the other nine are read in the el-01-01, el-01-03, el-01-11, el-01-12 and el-01-22 entries for this name form. Ten men on ten Greek days, and the reading has been the same every time.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-georgia gabriel-of-lesnovo gabriel-of-novgorod-and-saint-petersburg gabriel-of-saint-stephens-jerusalem':
    'five now, and two of them arrive on this 26 Ιανουαρίου: the metropolitan of Novgorod and Saint Petersburg, dead 1801, and the abbot of Saint Stephen in Jerusalem, whose page gives no year. The other three are read in the el-01-25 entry for this name form.',
  'κυριλλοσ cyril-of-alexandria cyril-of-kazan cyril-of-zographou':
    'three men. The new one is Cyril of Kazan, a metropolitan and hieromartyr shot in 1937, kept on 26 Ιανουαρίου; the corpus keeps Cyril of Alexandria, upgraded in this wave on 18 Ιανουαρίου, and Cyril of Zographou among the Athonite martyrs of 1275 to 1282.',
  'κλημησ clement-of-ancyra clement-of-mount-sagmation':
    'two men. saint.gr keeps Clement of Mount Sagmation, a wonderworker dead 1111, on 26 Ιανουαρίου; the corpus keeps Clement of Ancyra, upgraded in this wave on 23 Ιανουαρίου. A Byzantine wonderworker of the eleventh century is not the bishop of Ancyra.',
  'αρκαδιοσ arcadius-martyr-12-january arcadius-of-vyazniki arcadius-son-of-xenophon':
    'three men, and two of them are on this same 26 Ιανουαρίου: Arcadius the son of Xenophon, whom the Romanian calendar keeps on the day too, and Arcadius of Vyazniki, a monk dead 1592. The third is the bare martyr of 12 Ιανουαρίου, written earlier in this wave. One calendar, two entries on one day and a third elsewhere.',
  'θεοδοτοσ theodotus-1-january theodotus-of-marcianopolis theodotus-of-the-monastery-of-publius':
    'three men. The new one is Theodotus, abbot of the monastery of Publius, whose page gives no year, kept on 25 Ιανουαρίου; the other two are read in the el-01-13 entry for this name form — the bare 1 Ιανουαρίου martyr and Marcianopolis, dead 305 to 311.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-georgia gabriel-of-lesnovo':
    'three men. The new one is Gabriel of Georgia, a bishop dead 1896, kept on 25 Ιανουαρίου; the other two are read in the el-01-21 entry for this name form, the twelfth-century monk of Lesnovo on the 15th and the companion of Sionios on the 21st.',
  'ανατολιοσ anatolius-of-odessa anatolius-of-optina-25-january':
    'two men, two days apart on one calendar and both of the last two centuries: Anatolius of Optina, dead 1894, on 25 Ιανουαρίου, and Anatolius of Odessa, a bishop and hieromartyr dead 1938, on the 23rd, written earlier in this wave. An Optina elder is not a bishop shot under the Soviets, and the slug carries the day because Optina had more than one Anatolius.',
  'φιλημων philemon-companion-of-fortunianus philemon-of-karpathos':
    'two bishops, neither with a year, and two days four months apart: saint.gr keeps Philemon of Karpathos on 24 Ιανουαρίου and the corpus keeps the Philemon who is named with Fortunianus on the Greek 27 September. Two entries on one calendar are two commemorations, and a see is the only thing either page gives to tell them by.',
  'παυλοσ paul-brother-of-pausirius paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-obnora paul-of-zographou':
    'five now. The new one is the Paul of the three brothers on 24 Ιανουαρίου; the other four are read in the el-01-10 entry for this name form.',
  'brother paul pausirius theodotion paul-brother-of-pausirius pausirius-brother-of-paul theodotion-brother-of-paul':
    'one line folded onto itself. saint.gr names Paul, Pausirius and Theodotion as brothers on 24 Ιανουαρίου and the synaxis ruling makes that three folders, each display name carrying the kinship, so the folded key holds all three forenames whichever of the three it is read from.',
  'μακεδονιοσ macedonius-of-myropolis macedonius-the-barley-eater':
    'two men. saint.gr keeps Macedonius the Barley-Eater, a hermit and wonderworker of the fourth century, on 24 Ιανουαρίου; the corpus keeps Macedonius of Myropolis, martyred between 360 and 363, on three calendars on 12 September. A hermit who lived on barley and a martyr under Julian, and only the name is shared.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-kazan john-of-syracuse john-the-hut-dweller':
    'six now. The new one is John of Kazan, a martyr and wonderworker dead 1529, kept on 24 Ιανουαρίου; the other five are read in the el-01-22 entry for this name form. The commonest forename in the calendar and six separate days hold these six.',
  'ερμογενησ hermogenes-companion-of-mamas hermogenes-of-nicomedia hermogenes-of-samos':
    'three men. The new one is the Hermogenes of the 24 Ιανουαρίου line with Mamas, whose page gives no year; the corpus keeps the martyr of Nicomedia dead 309 on the Russian and Greek 1 September and the bishop of Samos on the Greek 5 October. Three entries, three days, three men.',
  'companion hermogenes mamas hermogenes-companion-of-mamas mamas-companion-of-hermogenes':
    'one line folded onto itself, the sixth of its kind in this wave. saint.gr names Hermogenes and Mamas together on 24 Ιανουαρίου and the synaxis ruling makes that two folders, each display name carrying the other, so the folded key holds both forenames whichever of the two it is read from.',
  'γενναδιοσ gennadius-of-corfu gennadius-of-kostroma':
    'two men, three centuries apart. saint.gr keeps Gennadius of Kostroma, a monk and wonderworker dead 1565, on 23 Ιανουαρίου; the corpus keeps Gennadius of Corfu, a hieromonk and wonderworker dead 1859, on the Romanian and Greek 2 January, upgraded earlier in this wave. Both are called wonderworkers and that is the whole of the resemblance.',
  'θεοδωροσ theodore-companion-of-stephen theodore-founder-of-chora theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-the-envoy-of-nicomedia':
    'nine now. The new one is Theodore the founder of the Chora monastery, an abbot with no year on his page, kept on 8 Ιανουαρίου; the other eight are read in the el-01-11, el-01-19, el-01-20 and el-01-07 entries for this name form.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-makres macarius-of-ierissos macarius-of-kios macarius-of-pisma macarius-of-zhabyn':
    'eight now. The new one is Macarius Makres, abbot and hieromonk dead 1431, kept on 8 Ιανουαρίου; the other seven are read in the el-01-10, el-01-18 and el-01-19 entries for this name form. The commonest monastic name in the Greek calendar and eight separate days hold these eight.',
  'ισιδωροσ isidore-8-january isidore-of-antioch':
    'two men, and eleven centuries. saint.gr keeps a hieromartyr Isidore, presbyter, dead 1472 on 8 Ιανουαρίου, and the corpus keeps Isidore, bishop of Antioch, killed by Arians in the fourth century, written in this wave on the Greek 2 Ιανουαρίου.',
  'γρηγοριοσ gregory-of-akritas gregory-of-moesia gregory-of-nyssa gregory-the-elder gregory-the-recluse-of-the-caves gregory-the-wonderworker-of-the-caves gregory-uncle-of-eustratius':
    'seven now, and three of them arrive on this one 8 Ιανουαρίου: a bishop of Moesia dead 1012, the recluse of the Kyiv Caves of the fourteenth century, and the wonderworker of the Caves dead 1094. saint.gr prints them as three entries with three centuries and three states of life, and the other four are read in the el-01-05 entry for this name form.',
  'ιουλιανοσ julian-of-antinoopolis julian-of-kandavla julian-the-deacon-of-aegina':
    'three men. The new one is Julian of Antinoopolis, martyred in the early fourth century, kept on 8 Ιανουαρίου; the other two are read in the el-01-07 entry for this name form, the deacon of Aegina dead 391 and the martyr of Kandavla on the Greek 4 September.',
  'αντωνιοσ anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antonius-the-presbyter antony-son-of-john-of-syracuse':
    'eight now. The new one is Antonius the presbyter, a hieromartyr of the early fourth century, kept on 8 Ιανουαρίου; the other seven are read in the el-01-17 entry for this name form, four of which stand together on the great Anthony own day.',
  'θεοδωροσ theodore-companion-of-stephen theodore-of-kandavla theodore-of-moscow theodore-of-novgorod theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-the-envoy-of-nicomedia':
    'eight now. The new one is Theodore of Moscow, the tsar dead 1598, kept on 7 Ιανουαρίου; the other seven are read in the el-01-11, el-01-19 and el-01-20 entries for this name form. Eight men on eight Greek days, and a Muscovite tsar is the furthest of them from the four martyrs.',
  'ιουλιανοσ julian-of-kandavla julian-the-deacon-of-aegina':
    'two men. saint.gr keeps Julian, deacon of Aegina, preacher and ascetic, dead 391, on 7 Ιανουαρίου; the corpus keeps Julian of Kandavla, martyred 288 to 311, on the Russian and Greek 4 September. A deacon who died in peace at the end of the fourth century is not a martyr of the persecutions.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-attaleia athanasius-of-kargopol athanasius-of-vologda':
    'five now. The new one is Athanasius of Attaleia, a new-martyr of 1700, kept on 7 Ιανουαρίου; the other four are read in the el-01-18 entry for this name form — the patriarch of Alexandria on the 18th, the fool for Christ of Kargopol and the monk of Vologda on the same day, and the bare martyr of the 13th.',
  'σεργιοσ sergius-martyr-2-january sergius-of-russia sergius-of-zographou':
    'three men. The new one is Sergius of Russia, a monk dead 1876, kept on 6 Ιανουαρίου; the corpus keeps the bare martyr Sergius of the Romanian and Greek 2 January, upgraded in this wave, and Sergius of Zographou among the Athonite martyrs of 1275 to 1282.',
  'ρωμανοσ romanus-of-karpenisi romanus-of-lacedaemon':
    'two new-martyrs, one day apart on one calendar and both of the Turkish centuries: Romanus of Karpenisi, written in this wave on 5 Ιανουαρίου, and Romanus of Lacedaemon, a hieromonk dead 1695, on the 6th. saint.gr keeps them as two entries and each page gives its man his own place and his own year.',
  'νικολαοσ nicholas-companion-of-platon-of-reval nicholas-of-valaam':
    'two men. saint.gr keeps Nicholas of Valaam, an ascetic dead 1824, on 6 Ιανουαρίου; the Greek 1 Ιανουαρίου keeps a presbyter Nicholas martyred with Platon of Reval in 1919, of whom the page holds nothing but the name and the year. Neither page names the other and a monk of Valaam is not a martyr of the Soviet years.',
  'μαρια maria-6-january mary-of-aza':
    'two women, sixteen centuries apart. saint.gr keeps a new-martyr Maria of 1919 on 6 Ιανουαρίου; the corpus keeps Mary of Aza, the virgin martyr of about 330, on the Romanian 9 June and the Greek 26 September.',
  'γεωργιοσ george-of-develtos george-the-iberian-2-january george-the-persian':
    'three men. The new one is George the Persian, a venerable-martyr dead 615, kept on 6 Ιανουαρίου; the other two are read in the el-01-22 entry for this name form, the bishop of Develtos on 22 Ιανουαρίου and the new-martyr at Mytilene of 1770 or 1777 on the 2nd.',
  'ευαγριοσ evagrius-companion-of-theodoula evagrius-of-iberia':
    'two men. saint.gr keeps Evagrius of Iberia, a monk and deacon of about 415, on 6 Ιανουαρίου, and an Evagrius martyred with Theodoula on the 18th, whose page holds only the company and the year 298. Two entries on one calendar twelve days apart, one a Georgian monk and one a martyr of the persecutions.',
  'τατιανη tatiana-5-january tatiana-of-rome':
    'two women, and the states of life differ as much as the centuries. saint.gr keeps an ascetic Tatiana on 5 Ιανουαρίου with no year on her page; the corpus keeps Tatiana of Rome, the deaconess and virgin martyred between 222 and 235, on the Romanian and Greek 12 January, where this wave upgraded her. A monastic with no year is not the Roman deaconess.',
  'γρηγοριοσ gregory-of-akritas gregory-of-nyssa gregory-the-elder gregory-uncle-of-eustratius':
    'four men on four Greek days. The new one is Gregory of Akritas, a monk dead 820, kept on 5 Ιανουαρίου; the other three are the bishop of Nyssa on the Romanian and Greek 10 January, the bishop of Nazianzus and father of the Theologian on 1 Ιανουαρίου, and the ninth-century uncle of Eustratius of Mount Olympus on the 9th, both read in the el-01-09 entry for this name form.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-companion-of-manuel peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-peloponnesian peter-the-sign-bearer':
    'nine now. The new one is the Peter of Manuel of Adrianople company on 22 Ιανουαρίου; the other eight are read in the el-01-01, el-01-03, el-01-11 and el-01-12 entries for this name form. The reading has not changed and will not: separate entries on one calendar are separate men unless a page says otherwise.',
  'λεων leo-companion-of-manuel leo-of-nicaea':
    'two men on one day and saint.gr does not confuse them: 22 Ιανουαρίου carries Leo, bishop of Nicaea and hieromartyr, and a Leo who is one of the soldiers martyred with Manuel of Adrianople. Neither page gives a year and each gives its man his own company or his own see. One calendar, two entries, two men.',
  'ιωαννησ john-companion-of-hilarion-the-new john-companion-of-manuel john-mauropous john-of-syracuse john-the-hut-dweller':
    'five men, and the new one is the John whom the 22 Ιανουαρίου line names with Manuel among his company, with no year on the page. The corpus keeps the companion of Hilarion the New on the Greek 6 October, John Mauropous on the Romanian and Greek 5 October, John of Syracuse dead 867 on 23 September, and John the Hut-Dweller, upgraded on the Greek 15 January earlier in this wave. The commonest forename in the calendar, and five separate days hold these five.',
  'ιωασαφ joasaph-of-alaska joasaph-of-zographou':
    'two men. saint.gr keeps Joasaph of Alaska, bishop and preacher, on 22 Ιανουαρίου; the corpus keeps Joasaph of Zographou among the Athonite martyrs of 1275 to 1282, on the Romanian 10 October and the Greek 22 September. Alaska and Athos, five centuries apart.',
  'γεωργιοσ george-of-develtos george-the-iberian-2-january':
    'two men. saint.gr keeps George, bishop of Develtos and hieromartyr, on 22 Ιανουαρίου with no year; the Greek 2 Ιανουαρίου keeps George the Iberian, the new-martyr at Mytilene whose death the page reads as 1770 or 1777. A bishop martyred in Thrace is not an eighteenth-century new-martyr, and the corpus keeps a third George of this name family on the Romanian 13 May, the Athonite abbot, whom neither page names.',
  'ζωσιμοσ zosimas-brother-of-alexander zosimus-of-syracuse':
    'two men. saint.gr keeps Zosimus, bishop and abbot of Syracuse, on 21 Ιανουαρίου with no year; the corpus keeps Zosimas the brother of Alexander, dead about 290, on the Greek 28 September. A Sicilian bishop is not a martyr of the persecutions.',
  'γαβριηλ gabriel-companion-of-sionios gabriel-of-lesnovo':
    'two men, six days apart on one calendar. The 21 Ιανουαρίου Gabriel is one of two named in one line and has no year; the corpus keeps Gabriel of Lesnovo, a monk of the early twelfth century, on the Greek 15 January, written in this same wave. Two entries, two commemorations.',
  'companion gabriel sionios gabriel-companion-of-sionios sionios-companion-of-gabriel':
    'one line folded onto itself, the fifth of its kind in this wave. saint.gr names Gabriel and Sionios together on 21 Ιανουαρίου and the synaxis ruling makes that two folders, each display name carrying the other, so the folded key holds both forenames whichever of the two it is read from. Both lives relate Manuel of Adrianople, whom the 22 Ιανουαρίου page keeps with his company, and that link is why 22 Ιανουαρίου had to be written beside this day rather than after it.',
  'ζαχαριασ zacharias-father-of-the-forerunner zacharias-of-arta':
    'two men. saint.gr keeps Zacharias of Arta, a new-martyr of 1782, on 20 Ιανουαρίου; the corpus keeps the prophet Zacharias, father of the Forerunner, on all four calendars on 5 September. An eighteenth-century new-martyr under the Turks and the priest of the temple share a name and eighteen centuries divide them.',
  'θεοδωροσ theodore-companion-of-stephen theodore-of-kandavla theodore-of-novgorod theodore-of-tamasos theodore-of-tomsk theodore-prince-of-yaroslavl theodore-the-envoy-of-nicomedia':
    'seven now. The new one is Theodore of Tomsk, kept on 20 Ιανουαρίου, and he carries no types at all because his page attests none — the reader would not assign him a rank the source does not give. The other six are read in the el-01-11 and el-01-19 entries for this name form.',
  'ευθυμιοσ euthymius-of-tarnovo euthymius-of-zographou euthymius-the-man-of-god':
    'three men. The new one is Euthymius, patriarch of Tarnovo and hymnographer, dead 1402, kept on 20 Ιανουαρίου; the other two are read in the el-01-03 entry for this name form, the Athonite martyr of the 1270s and the Georgian professor of 1863 to 1953. Three days, three centuries, and the only thing shared is the name.',
  'αννα anna-martyr-20-january anna-the-princess':
    'two women. saint.gr keeps a martyr Anna on 20 Ιανουαρίου with no year on her page; the corpus keeps Anna the princess, dead 1056, on the Greek 4 October. A bare martyr line and an eleventh-century princess, and neither page names the other.',
  'θεοδωροσ theodore-companion-of-stephen theodore-of-kandavla theodore-of-novgorod theodore-of-tamasos theodore-prince-of-yaroslavl theodore-the-envoy-of-nicomedia':
    'six now. The new one is Theodore of Novgorod, the fool for Christ dead 1392, kept on 19 Ιανουαρίου; the other five are read in the el-01-11 entry for this name form. A fourteenth-century Russian fool for Christ is none of the four martyrs nor the prince of Yaroslavl.',
  'μαξιμοσ maximus-brother-of-dometius maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta':
    'six now. The new one is the brother of Dometius on 19 Ιανουαρίου, whose page gives no year; the other five are read in the el-01-16 and el-01-18 entries for this name form. Six men on six Greek days.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-of-ierissos macarius-of-kios macarius-of-pisma':
    'six now, and the new one is a bishop: Macarius of Ierissos, whose page puts him between 395 and 408, kept on 19 Ιανουαρίου. The other five are read in the el-01-10 and el-01-18 entries for this name form. Six men, six days.',
  'δομετιοσ dometius-brother-of-maximus dometius-of-zographou':
    'two men. The 19 Ιανουαρίου Dometius is one of two brothers, with no year on his page; the corpus keeps Dometius of Zographou among the Athonite martyrs of 1275 to 1282, on the Romanian 10 October and the Greek 22 September. Neither page names the other and the days are four months apart.',
  'brother dometius maximus dometius-brother-of-maximus maximus-brother-of-dometius':
    'one line folded onto itself, the fourth of its kind in this wave. saint.gr names Dometius and Maximus as brothers on 19 Ιανουαρίου and the synaxis ruling makes that two folders, each display name carrying the other, so the folded key holds both forenames whichever of the two it is read from.',
  'μαξιμοσ maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-totma maximus-of-ungrovlachia maximus-son-of-paul-and-tatta':
    'five now. The new one is Maximus of Ungrovlachia, bishop and monk, dead 1546, whom saint.gr keeps on 18 Ιανουαρίου; the other four are read in the el-01-16 entry for this name form. Five men, five days.',
  'ιωακειμ joachim-of-tarnovo joachim-the-righteous':
    'two men. saint.gr keeps Joachim, patriarch of Tarnovo, dead 1248, on 18 Ιανουαρίου; the corpus keeps the righteous Joachim, father of the Mother of God, on all four calendars on 9 September. A thirteenth-century Bulgarian patriarch and the Theotokos father share a name and nothing else.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria athanasius-of-kargopol athanasius-of-vologda':
    'four men, and the two new ones are on the great Athanasius own day: saint.gr keeps the patriarch of Alexandria on 18 Ιανουαρίου, where his row was already venerated and was left alone, and on the same day a fool for Christ of Kargopol of the sixteenth to seventeenth century and a monk of Vologda dead 1550. The martyr of 13 Ιανουαρίου, whose page holds nothing but a death by rods, is read in the el-01-13 entry.',
  'μαρκιανοσ marcian-of-constantinople marcian-of-cyrrhus':
    'two men, neither with a year, eight days apart on one calendar: the presbyter of Constantinople who built the church of Saint Irene by the sea, whom the Romanian and Greek calendars keep on 10 January, and the hermit of Cyrrhus whom saint.gr keeps on the 18th. A hermit in the Syrian desert is not a church-builder of the capital, and each page gives the place as the only thing to tell them by.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-companion-of-theodoula macarius-magistrate-of-alexandria macarius-of-kios macarius-of-pisma':
    'five now. The new one is the Macarius martyred with Theodoula in 298, whom saint.gr names on 18 Ιανουαρίου; the other four are read in the el-01-10 entry for this name form. Five separate days on the Greek calendar and no page naming another.',
  'φιλοθεοσ philotheus-of-antioch philotheus-of-meteora philotheus-the-presbyter':
    'three men. The new one is Philotheus of Meteora, of the first half of the sixteenth century, whom saint.gr keeps on 17 Ιανουαρίου; the other two are read in the el-01-12 entry for this name form, the fourth-century martyr of Antioch on 12 Ιανουαρίου and the tenth-century presbyter on 15 September. Twelve centuries across three days.',
  'αντωνιοσ anthony-of-krasnokholmsk anthony-of-novgorod anthony-of-vologda anthony-of-zadonsk anthony-of-zographou anthony-the-great antony-son-of-john-of-syracuse':
    'seven men, and four of them share the Greek 17 Ιανουαρίου — which is the day of Anthony the Great, and the reason the others are there: saint.gr prints the great Anthony of 356 and then three Russian Anthonys who bear his name, Krasnokholmsk of the fifteenth century, Novgorod of 1231 or 1232, and Vologda of 1588, each with his own house and his own century in his own notice. One calendar, four entries on one day, four men. The other three are Zadonsk on the Greek 29 September, Zographou among the Athonite martyrs of the 1270s, and the son of John of Syracuse of 867.',
  'μαξιμοσ maximus-of-kapsokalyvia maximus-of-marcianopolis maximus-of-totma maximus-son-of-paul-and-tatta':
    'four men. The new one is Maximus of Totma, a fool for Christ dead 1650, whom saint.gr keeps on 16 Ιανουαρίου; the corpus keeps Maximus of Kapsokalyvia, dead 1320, on the Romanian and Greek 13 January, the martyr of Marcianopolis of 305 to 311 on three calendars in September, and the son of Paul and Tatta on the Greek 25 September. Two fools for Christ among the four, three centuries and two countries apart, and four separate days on the Greek calendar.',
  'αλεξανδροσ alexander-brother-of-alphaeus alexander-the-sleepless alexander-with-thirty-martyrs':
    'three men, and the two the corpus already held are both on the Greek 28 September, kept apart there by their companies: the brother of Alphaeus, dead about 290, and the Alexander of the thirty martyrs. The new one is Alexander the Sleepless, the abbot who founded the unsleeping choirs, dead 430, whom saint.gr keeps on 15 Ιανουαρίου. An abbot of the fifth century is neither martyr.',
  'θεοδουλοσ theodulus-of-myropolis theodulus-son-of-nilus theodulus-the-executioner':
    'three men. The new one is the son of Nilus, a monk of before the middle of the fifth century whom saint.gr keeps on 14 Ιανουαρίου; the corpus keeps the martyr of Myropolis, dead 360 to 363, on three calendars on 12 September, and Theodulus the Executioner, the gaoler turned confessor, on the Greek 4 September. A fifth-century monk of Sinai is neither.',
  'στεφανοσ stephen-of-chenolakkos stephen-of-placidianae':
    'two men, three days apart on one calendar and neither with a year. saint.gr keeps the abbot of Chenolakkos on 14 Ιανουαρίου and Stephen of Placidianae on the 11th, each with his own house named in his own notice. Two entries on one calendar are two commemorations, and the houses are the only thing either page gives to tell them by, so the slugs keep them.',
  'ιωαννικιοσ joannicius-of-tarnovo joannicius-of-zographou':
    'two men. The 14 Ιανουαρίου Joannicius is a thirteenth-century metropolitan of Tarnovo; the corpus keeps Joannicius of Zographou, one of the martyred monks of Athos of 1275 to 1282, on the Romanian 10 October and the Greek 22 September. A Bulgarian metropolitan is not an Athonite martyr, even in the same century.',
  'ακακιοσ acacius-of-latros acacius-of-tver':
    'two men. saint.gr keeps Acacius, bishop and monk of Tver, dead 1567, on 14 Ιανουαρίου, and Acacius the Wonderworker, founder of the Great Lavra of the Theotokos of Myrsinon on Latros, on 3 Ιανουαρίου, whose authority the page gives as Paris Coislin 361 f. 88. A sixteenth-century Russian bishop is not a Byzantine founder on Latros, and the two days are eleven apart on one calendar.',
  'companion pachomius papyrinus pachomius-companion-of-papyrinus papyrinus-companion-of-pachomius':
    'one line folded onto itself, the third of its kind in this wave after Peter and Severus and Leucius on the 11th and Zoticus and Rogatus on the 12th. saint.gr names Pachomius and Papyrinus together on 13 Ιανουαρίου; each display name carries the other, so the folded key holds both forenames whichever folder it is read from.',
  'αθανασιοσ athanasius-martyr-13-january athanasius-of-alexandria':
    'two men, and the 13 Ιανουαρίου page says so itself by holding nothing: its whole notice is that Athanasius was martyred, tormented with rods, and that we have no further details of his life. The corpus keeps Athanasius the Great, patriarch of Alexandria, venerated on the Russian, Romanian and Greek 18 January, which is the day saint.gr also lists him on and where this wave left his row alone. A nameless martyr with no place and no year is not the patriarch.',
  'θεοδοσιοσ theodosius-companion-of-paisius theodosius-of-the-kyiv-caves theodosius-of-trebizond theodosius-of-triglia theodosius-the-cenobiarch':
    'five now. The new one is an ascetic of 1802 whom saint.gr names with Paisius on 12 Ιανουαρίου; the other four are read in the el-01-11 entry for this name form — the Cenobiarch and the Trebizond bishop, both on the Greek 11 January, the Bithynian hegumen of Triglia on the 1st, and the founder of the Kyiv Caves. Nineteenth-century asceticism against four earlier men on three earlier days.',
  'μαρτινιανοσ martinian-of-white-lake martinian-of-zographou':
    'two men. saint.gr keeps Martinian of White Lake, abbot and deacon, dead 1483, on 12 Ιανουαρίου; the corpus keeps Martinian of Zographou, one of the martyred monks of Athos of 1275 to 1282, on the Romanian 10 October and the Greek 22 September. A Russian abbot of the fifteenth century is not an Athonite martyr of the thirteenth.',
  'ζωτικοσ zoticus-companion-of-rogatus zoticus-of-tomis':
    'two men. The 12 Ιανουαρίου Zoticus is a soldier martyred with Rogatus and his page gives no year; the corpus keeps Zoticus of Tomis, dead about 323 to 324, on the Russian, Romanian and Greek 13 September. Two entries on one calendar are two commemorations, and neither page names the other.',
  'companion rogatus zoticus rogatus-companion-of-zoticus zoticus-companion-of-rogatus':
    'one line folded onto itself, as with Peter and Severus and Leucius on 11 Ιανουαρίου. saint.gr names two soldier-martyrs together on 12 Ιανουαρίου and the synaxis ruling makes that two folders, each display name carrying the other name, so the folded key holds both forenames whichever folder it is read from.',
  'φιλοθεοσ philotheus-of-antioch philotheus-the-presbyter':
    'two men, six centuries apart. saint.gr keeps a fourth-century martyr Philotheus of Antioch on 12 Ιανουαρίου; the corpus keeps a tenth-century presbyter on the Russian, Greek and Serbian 15 September. A martyr under the persecutions is not a presbyter of the tenth century.',
  'πετροσ peter-abesalamites peter-companion-of-leucius peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-peloponnesian peter-the-sign-bearer':
    'eight now. The new one is Peter Abesalamites, whom saint.gr keeps on 12 Ιανουαρίου and gives no year; the other seven are read in the el-01-01, el-01-03 and el-01-11 entries for this name form, and the days and the centuries keep them apart. A forename this common folds once per wave and the reading is the same each time: separate entries on the calendar are separate men unless a page says otherwise.',
  'θεοδοσιοσ theodosius-of-the-kyiv-caves theodosius-of-trebizond theodosius-of-triglia theodosius-the-cenobiarch':
    'four men, and two of them are on this same 11 Ιανουαρίου without being confusable: saint.gr prints Theodosius the Cenobiarch, the founder of the Palestinian coenobium whom the Romanian calendar keeps on the same day, and «Όσιος Θεοδόσιος ο εν Τραπεζούντι», a bishop and abbot of about 1392. The other two are the Bithynian hegumen of Triglia on the Greek 1 January and the founder of the Kyiv Caves, dead 1074. One calendar, two entries on one day and two more on other days, so four men.',
  'θεοδωροσ theodore-companion-of-stephen theodore-of-kandavla theodore-of-tamasos theodore-prince-of-yaroslavl theodore-the-envoy-of-nicomedia':
    'five men. The new one is the Theodore of the 11 Ιανουαρίου line with Stephen, a monk with no year on his page; the corpus keeps the martyr of Kandavla of 288 to 311 on the Russian and Greek 4 September, Theodore of Tamasos of the first century on the Greek 4 October, the prince of Yaroslavl dead 1298 to 1299 on three calendars on 19 September, and the envoy of Nicomedia of 370 on three calendars on 5 September. Four days, four centuries, and a bare monastic Theodore on a fifth day.',
  'πετροσ peter-companion-of-leucius peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-of-sebaste peter-son-of-john-of-syracuse peter-the-peloponnesian peter-the-sign-bearer':
    'seven men now, and the new one is the martyr of the 11 Ιανουαρίου line with Severus and Leucius, whose page gives no year and no place. The other six are read in the el-01-01 and el-01-03 entries for this same name form: the Peloponnesian new-martyr of 1776, the disciple of Dionysius of Alexandria of about 254, the hieromartyr of Capitolias, the son of John of Syracuse of 867, the Sign-Bearer whom his own source cannot place, and Peter of Sebaste, the brother of Basil the Great, on the Romanian and Greek 9 January. A forename this common folds every wave; each entry is the reading, and the days and the centuries keep them apart.',
  'μιχαηλ michael-companion-of-platon-of-reval michael-of-klops':
    'two men. saint.gr keeps «Όσιος Μιχαήλ ο του Κλωπς» on 11 Ιανουαρίου, the fool for Christ of Klops dead 1456; the Greek 1 Ιανουαρίου keeps a presbyter Michael martyred with Platon of Reval in 1919, of whom the page holds nothing but the name and the year. Five centuries apart and neither page names the other.',
  'companion leucius peter severus leucius-companion-of-peter peter-companion-of-leucius severus-companion-of-leucius':
    'not three men folded onto each other but one line folded onto itself. saint.gr 11 Ιανουαρίου names «Άγιοι Πέτρος, Σεβήρος και Λεύκιος οι Μάρτυρες» and the synaxis ruling makes that three folders sharing one life, each relating the other two; every one of the three display names carries the other names, so the fold key holds all three forenames whichever folder it is read from. Three commemorations on one day in one line, and the fold is the corpus doing what it was told.',
  'παυλοσ paul-disciple-of-dionysius-of-alexandria paul-of-damascus paul-of-obnora paul-of-zographou':
    'four men. saint.gr keeps «Όσιος Παύλος της Όμπνορα» on 10 Ιανουαρίου, dead 1429, the founder of the Obnora house; the corpus keeps the disciple of Dionysius of Alexandria, dead 254, on the Greek 3 October, Paul of Damascus on the Greek 25 September, and Paul of Zographou, one of the martyred monks of Athos of 1275 to 1282, on the Romanian 10 October and the Greek 22 September. Three martyrs of three centuries and a fifteenth-century Russian founder.',
  'μακαριοσ macarius-companion-of-eudoxius macarius-magistrate-of-alexandria macarius-of-kios macarius-of-pisma':
    'four men, and the new one is a Russian hermit. saint.gr keeps «Όσιος Μακάριος της Πίσμας» on 10 Ιανουαρίου, a hermit of the fourteenth to fifteenth century; the corpus keeps the companion of Eudoxius, martyred between 303 and 312, on all four calendars on 6 September; the magistrate of Alexandria, dead about 250, on the Greek 6 September; and the new-martyr of Kios, 1590, on the Greek 6 October. A late-medieval Russian hermit is none of the three martyrs.',
  'γρηγοριοσ gregory-the-elder gregory-uncle-of-eustratius':
    'two men, and the fold is only the bare forename. The Greek 1 Ιανουαρίου keeps Gregory the Elder, bishop of Nazianzus and father of the Theologian, baptised in 325 and consecrated in 328; the Greek 9 Ιανουαρίου keeps a ninth-century wonderworker, one of the two uncles of Eustratius of Mount Olympus, whose whole notice is that he and his brother Basil were the saint mothers brothers and lived in the ninth century. Five centuries and no other point of contact.',
  'πετροσ peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-son-of-john-of-syracuse peter-the-peloponnesian peter-the-sign-bearer':
    'five men sharing a forename and nothing else, and the fifth is the one the sources cannot place. saint.gr keeps «Όσιος Πέτρος ο Σημειοφόρος ο εν Αγίω Ζαχαρία Ατρώας» on 3 Ιανουαρίου and says there is no notice for him in the Menaia at all; it reports Nicodemus conjecturing that he is Peter bishop of Argos, kept on 3 Μαΐου, and calls that unlikely. He is not peter-of-atroa either, whose Greek day is 13 September. The other four are the Peloponnesian new-martyr of 1776, the disciple of Dionysius of Alexandria dead about 254, the hieromartyr of Capitolias, and the son of John of Syracuse dead 867.',
  'παντελεημων panteleimon-3-january panteleimon-the-healer':
    'two men, and the great martyr is not the one saint.gr prints here. Its 3 Ιανουαρίου line is «Όσιος Παντελεήμων», founder of the monastery the page calls Kostytsev in Russia, dead 1884; the corpus keeps Panteleimon the Healer, the unmercenary martyred in 305, on the Russian and Romanian 27 July. Nineteenth-century Russia against Diocletian Nicomedia.',
  'ευθυμιοσ euthymius-of-zographou euthymius-the-man-of-god':
    'two men, six centuries apart. saint.gr keeps «Άγιος Ευθύμιος ο άνθρωπος του Θεού» on 3 Ιανουαρίου, a Georgian professor of 1863 to 1953 exiled to France in 1921 and canonised by the Church of Georgia on 17 October 2002; the corpus keeps Euthymius of Zographou, one of the martyred monks of Athos, dead between 1275 and 1282, on the Romanian 10 October and the Greek 22 September.',
  'θεαγενησ theagenes-of-parion theagenes-the-martyr':
    'two men, and the deaths are different. saint.gr prints «Άγιος Θεαγένης ιερομάρτυρας» on 2 Ιανουαρίου, bishop of Parion, beaten and then drowned; the corpus keeps a Theagenes on the Greek 3 October whose life has him martyred by fire. Two entries on one calendar are two commemorations, and a bishop drowned at Parion is not a man burned.',
  'σιλβεστροσ sylvester-of-rome sylvester-of-the-kyiv-caves':
    'two men, and saint.gr prints them on the same day without confusing them: 2 Ιανουαρίου carries «Άγιος Σίλβεστρος Πάπας Ρώμης», the pope of the first Council, and «Όσιος Σίλβεστρος Ρώσος της Λαύρας του Κιέβου», a twelfth-century hegumen of Vydubychi who continued Nestor the Chronicler. One calendar, one day, two entries, two men.',
  'νειλοσ nilus-bishop-and-hieromartyr nilus-the-sanctified':
    'two men. saint.gr keeps «Όσιος Νείλος ο Ηγιασμένος» on 2 Ιανουαρίου, of the Laskarid house, 1228 to 1334, founder of Geromeri in Thesprotia; the corpus keeps a bishop and hieromartyr Nilus of 305 to 311 on the Russian, Greek and Serbian 17 September. A Despotate-era founder is not a martyr of the Diocletian persecution.',
  'μαρκοσ mark-of-byblos mark-the-deaf mark-the-shepherd':
    'three men. saint.gr gives «Όσιος Μάρκος ο κωφός» one sentence on 2 Ιανουαρίου and nothing else, and the corpus keeps Mark of Byblos, one of the seventy apostles, on the Romanian 27 April and the Greek 27 September, and Mark the Shepherd, martyred about 290, on the Greek 28 September. A deaf ascetic with no year is neither an apostle of the seventy nor a shepherd of Diocletian time, and the Greek calendar prints all three on days of their own.',
  'κοσμασ cosmas-companion-of-thomas-of-zographou cosmas-i-of-constantinople':
    'two men, four centuries and two states of life apart. saint.gr prints «Άγιος Κοσμάς ο Α Αρχιεπίσκοπος Κωνσταντινούπολης» on 2 Ιανουαρίου: an Antiochene who became patriarch in 1075, resigned on 8 May 1081 and died at the monastery of Kallias. The corpus keeps Cosmas the companion of Thomas of Zographou, one of the martyred monks of Athos, dead between 1275 and 1282, on the Romanian 10 October and the Greek 22 September. A patriarch who resigned and died in a monastery is not a monk burned in a tower.',
  'θεοδοτοσ theodotus-1-january theodotus-of-marcianopolis':
    'two men. saint.gr gives the 1 Ιανουαρίου Theodotus one sentence, that he was martyred by the sword, with no year and no place; the corpus keeps Theodotus of Marcianopolis, martyred 305 to 311, on the Russian and Serbian 15 September and the Greek 17 September. Two entries on one calendar are two commemorations, and the Greek calendar prints both.',
  'θεοδοσιοσ theodosius-of-the-kyiv-caves theodosius-of-triglia':
    'two men. saint.gr prints «Όσιος Θεοδόσιος ηγούμενος Τριγλίας» on 1 Ιανουαρίου and says plainly that little is known of him beyond his abbacy of one of the four houses at Triglia in Bithynia; the corpus keeps Theodosius of the Kyiv Caves, dead 1074, on the Russian 14 August, the Romanian 3 May and the Greek 2 September. A Bithynian hegumen of the iconoclast centuries is not the founder of the Caves.',
  'πετροσ peter-disciple-of-dionysius-of-alexandria peter-of-capitolias peter-son-of-john-of-syracuse peter-the-peloponnesian':
    'four men, and no two of them share a day or a century: saint.gr keeps «Άγιος Πέτρος ο Πελοποννήσιος» on 1 Ιανουαρίου, a new-martyr hanged at Odemis in 1776, and the corpus keeps the disciple of Dionysius of Alexandria on the Greek 3 October, dead about 254; the hieromartyr of Capitolias on the Greek 4 October; and the son of John of Syracuse on 23 September, dead 867. The fold is the bare forename and nothing else.',
  'zotic zoticus-of-nicomedia zoticus-of-niculitel zoticus-of-the-ten-of-crete zoticus-the-feeder-of-lepers':
    'four folders whose ro form is Zotic, on four Romanian days. The new one is Zoticus the feeder of lepers, 30 December. The other three were read on 30 September and are unchanged (read 30 September 2026)',
  'teodora theodora-of-caesarea theodora-the-empress':
    'two women: Theodora of Caesarea in Bithynia, Romanian 30 December; and Theodora the Empress, 11 February. The corpus other Theodoras — of Alexandria, 11 September, and of Thessalonica, 5 April — carry different ro forms and do not fold here (read 30 September 2026)',
  'leon leo-of-catania leo-the-archimandrite leo-the-great leo-the-martyr-18-august':
    'four folders whose ro form is Leon, on four Romanian days. The new one is Leo the archimandrite, 30 December. The other three were read on 29 September: Leo of Catania, 20 February; Leo the Great, 18 February; and the bare-line martyr of 18 August (read 30 September 2026)',
  'tadeu thaddeus-29-december thaddeus-apostle-of-the-seventy':
    'two men, and the rank is what the calendar gives to tell them apart: «Sfantul Cuvios Tadeu» on 29 decembrie, a bare line with no life and no troparion, venerable; and the apostle of the Seventy sent to Abgar, whose row sits on 26 mai (read 30 September 2026)',
  'marcel marcellus-of-sicily marcellus-of-the-akoimetoi marcellus-the-martyr-1-march marcellus-the-martyr-22-may':
    'four folders whose ro form is Marcel, on four Romanian days. The new one is Marcellus, abbot of the monastery of the Akoimetoi, 29 December. The others are Marcellus of Sicily, 9 February, and the two bare-line martyrs of 1 March and 22 May (read 30 September 2026)',
  'simon simon-of-simonopetra simon-of-zographou':
    'two men: Simon the founder of Simonopetra, Romanian 28 December; and Simon of Zographou, 10 October. Simon the Zealot carries a different ro form and does not fold here (read 30 September 2026)',
  'iosif joseph-archbishop-of-thessalonica joseph-of-nea-moni joseph-presbyter-of-persia joseph-the-betrothed joseph-the-hymnographer joseph-the-merciful':
    'six folders whose ro form is Iosif, on six Romanian days. The new one is Joseph the Betrothed, 28 December. The other five were read on 30 September and are unchanged (read 30 September 2026)',
  'teodor theodore-brother-of-theophanes theodore-of-alexandria-hieromartyr theodore-of-rostov theodore-the-studite':
    'four folders whose ro form is Teodor, on four Romanian days. The new one is Theodore the Branded, brother of Theophanes of Nicaea, 27 December. The others are Theodore of Alexandria, hieromartyr, 3 December; Theodore of Rostov, 28 November; and Theodore the Studite, 11 November (read 30 September 2026)',
  'stefan stefan-brancoveanu stephen-of-decani stephen-of-triglia stephen-the-first-martyr':
    'four folders whose ro form is Stefan, on four Romanian days. The new one is the protomartyr and archdeacon, 27 December. The other three were read on 29 and 30 September and are unchanged (read 30 September 2026)',
  'gherasim gerasimus-of-the-jordan gerasimus-of-tismana':
    'two men: Gerasimus of Tismana, the companion of Nicodemus, Romanian 26 December; and Gerasimus of the Jordan, 4 March. The corpus other Gerasimoi — the New of Kefalonia, 16 August, and of Little St Anne, 7 December — carry different ro forms and do not fold here (read 30 September 2026)',
  'eftimie euthymius-of-dimitsana euthymius-of-madytos euthymius-of-sardis euthymius-of-vatopedi euthymius-of-zographou euthymius-the-cellarer jacob-of-putna':
    'seven folders whose ro form is Eftimie, on seven Romanian days. The new one is Euthymius bishop of Sardis, 26 December. The other six were read on 30 September and are unchanged (read 30 September 2026)',
  'pavel paul-of-jamnia paul-of-latros paul-of-neocaesarea paul-of-plousias paul-of-ptolemais paul-of-zographou paul-the-apostle paul-the-confessor paul-with-valentina-and-ennatha platon-kulbusch':
    'ten folders whose ro form is Pavel, on ten Romanian days. The new one is Paul archbishop of Neocaesarea, 23 December. The other nine were read on 30 September and are unchanged (read 30 September 2026)',
  'nifon niphon-of-constantia niphon-patriarch-of-constantinople':
    'two men: Niphon bishop of Constantia in Cyprus, Romanian 23 December; and Niphon patriarch of Constantinople and archbishop of Wallachia, 11 August (read 30 September 2026)',
  'naum nahum naum-of-ohrid':
    'two: the prophet Nahum, Romanian 1 December, and Naum of Ohrid, 23 December (read 30 September 2026)',
  'antonina antonina-of-crodamna antonina-of-nicaea antonina-of-tismana':
    'three women called Antonina, on three Romanian days. The new one is Antonina of Tismana, 23 December. The others are Antonina of Crodamna, 10 June, and Antonina of Nicaea, 1 March (read 30 September 2026)',
  'zotic zoticus-of-nicomedia zoticus-of-niculitel zoticus-of-the-ten-of-crete':
    'three men called Zotic, on three Romanian days. The new one is one of the ten of Crete, 23 December. The others are Zoticus of Nicomedia, 22 August, and Zoticus of Niculitel, 4 June (read 30 September 2026)',
  'teodul theodulus-companion-of-agathopodes theodulus-of-the-forty-martyrs theodulus-of-the-ten-of-crete theodulus-of-tripoli theodulus-son-of-terence':
    'five folders whose ro form is Teodul, on five Romanian days. The new one is one of the ten of Crete, 23 December. The other four were read on 30 September and are unchanged (read 30 September 2026)',
  'pompie pompeius-companion-of-terentius pompeius-of-the-ten-of-crete':
    'two men: one of the ten of Crete, Romanian 23 December; and Pompeius the companion of Terentius, 10 April (read 30 September 2026)',
  'ghelasie gelasius-martyr-6-june gelasius-of-the-ten-of-crete':
    'two men: one of the ten martyred in Crete under Decius, Romanian 23 December; and the bare-line Gelasius of 6 June (read 30 September 2026)',
  'anastasia anastasia-daughter-of-nicholas-ii anastasia-of-rome-15-april anastasia-pupil-of-chrysogonus anastasia-saguna':
    'four women called Anastasia, on four Romanian days. The new one is Anastasia the Deliverer from Bonds, taught by Chrysogonus, 22 December. The other three were read on 30 September and are unchanged (read 30 September 2026)',
  'bonifatie boniface-apostle-of-germany boniface-of-tarsus':
    'two men: Boniface of Tarsus, the servant of Aglaia sent to bring back relics and martyred instead, Romanian 19 December; and Boniface the apostle of Germany, 5 June (read 30 September 2026)',
  'nicolae nicholas-founder-of-vatopedi nicholas-ii nicholas-of-lesvos nicholas-of-myra nicholas-of-the-forty-martyrs':
    'five folders whose ro form is Nicolae, on five Romanian days. The new one is Nicholas, one of the three founders of Vatopedi, 17 December. The other four were read on 30 September and are unchanged (read 30 September 2026)',
  'misail misael-of-the-three-youths misael-of-turnu':
    'two men: Misael, one of the three youths in the furnace, Romanian 17 December; and Misael of Turnu, 5 October (read 30 September 2026)',
  'atanasie athanasius-founder-of-vatopedi athanasius-of-alexandria athanasius-of-corinth athanasius-of-meteora athanasius-of-the-forty-martyrs athanasius-the-commentarisius athanasius-the-confessor':
    'seven folders whose ro form is Atanasie, on seven Romanian days. The new one is Athanasius, one of the three founders of Vatopedi, 17 December. The others are unchanged: Athanasius of Alexandria, 18 January; of Corinth, 4 May; of Meteora, 20 April; one of the Forty of Sebaste, 9 March; the Commentarisius, 4 January; and the Confessor, 22 February (read 30 September 2026)',
  'antonie anthony-of-constantinople anthony-of-zographou antony-founder-of-vatopedi antony-the-martyr-1-march':
    'four folders whose ro form is Antonie, on four Romanian days. The new one is Antony, one of the three founders of Vatopedi, 17 December. The others are Anthony of Constantinople, 12 February; Anthony of Zographou, 10 October; and the bare-line martyr of 1 March (read 30 September 2026)',
  'anania ananias-of-the-three-youths hanani':
    'two men: Ananias, one of the three youths in the furnace with Daniel, Romanian 17 December; and Hanani, whom the corpus keeps on 27 March (read 30 September 2026)',
  'avacum abachum-son-of-marius avacum-the-deacon habakkuk':
    'three folders whose ro form is Avacum, on three Romanian days, and doxologia keeps three commemorations. The new one is a bare line — «Sfantul Mucenic Avacum, diaconul», 17 decembrie, no life — and the calendar gives it the office of deacon, which neither of the others has. The others are the prophet Habakkuk, 2 December, and Abachum the son of Marius and Martha, martyred at Rome, 6 July (read 30 September 2026)',
  'suzana susanna-mother-of-nina susanna-the-deaconess':
    'two women: Susanna the deaconess, Romanian 15 December, and Susanna the mother of Nina of Georgia, 20 May (read 30 September 2026)',
  'pavel paul-of-jamnia paul-of-latros paul-of-plousias paul-of-ptolemais paul-of-zographou paul-the-apostle paul-the-confessor paul-with-valentina-and-ennatha platon-kulbusch':
    'nine folders whose ro form is Pavel, on nine Romanian days. The new one is Paul of Latros, 15 December. The other eight were read on 30 September and are unchanged (read 30 September 2026)',
  'elefterie eleutherius-disciple-of-dionysius eleutherius-of-illyricum':
    'two men: Eleutherius bishop of Illyricum, martyred with his mother Anthia, Romanian 15 December; and Eleutherius the disciple of Dionysius the Areopagite, who has no Romanian row (read 30 September 2026)',
  'filimon philemon-6-july philemon-of-cyzicus philemon-of-gaza philemon-the-apostle philemon-the-flute-player':
    'five folders whose ro form is Filimon, on five Romanian days. The new one is Philemon the flute-player of the Thebaid, of the company doxologia keeps on 14 decembrie. The other four were read on 30 September: the bare line of 6 July, Philemon of Cyzicus, 29 April, Philemon of Gaza, 14 February, and the apostle, 22 November (read 30 September 2026)',
  'calinic callinicus-of-caesarea callinicus-of-cilicia':
    'two men: Callinicus, the third named of the company at Caesarea in Bithynia under Decius, whom doxologia keeps on 14 decembrie; and Callinicus of Cilicia, Romanian 29 July. The corpus other Callinici — of Constantinople, 23 August, and of Edessa, 8 August — carry different ro forms and do not fold here (read 30 September 2026)',
  'apolonie apollonius-of-sardis apollonius-the-reader':
    'two men: Apollonius the reader, one of the company doxologia 14 decembrie keeps with Thyrsus; and Apollonius of Sardis, Romanian 10 July (read 30 September 2026)',
  'orest orestes-companion-of-eustratius orestes-of-tyana':
    'two men: the last of the five with Eustratius, Romanian 13 December; and Orestes of Tyana, a physician and martyr, 10 November (read 30 September 2026)',
  'eustratie eustratius-of-arabraca eustratius-of-mount-olympus':
    'two men: Eustratius of Arabraca, the first of the five martyred at Sebaste, Romanian 13 December; and Eustratius of Mount Olympus, abbot, 9 January (read 30 September 2026)',
  'evghenie eugene-of-cherson eugene-of-satala eugene-of-trebizond eugenius-the-confessor':
    'four folders whose ro form is Evghenie, on four Romanian days. The new one is Eugene of Satala, one of the five with Eustratius, 13 December. The others are Eugene of Cherson, bishop, 7 March; Eugene of Trebizond, 21 January; and Eugenius the Confessor, 19 February (read 30 September 2026)',
  'auxentie auxentius-companion-of-eustratius auxentius-of-bithynia':
    'two men: one of the five martyred at Sebaste with Eustratius, Romanian 13 December; and Auxentius of Bithynia, hermit and wonderworker, 14 February (read 30 September 2026)',
  'alexandru alexander-companion-of-antonina alexander-of-alexandria alexander-of-cartagena alexander-of-jerusalem alexander-of-side alexander-of-the-forty-martyrs':
    'six folders whose ro form is Alexandru, on six Romanian days. The new one is Alexander archbishop of Jerusalem, 12 December. The others are unchanged: the companion of Antonina, 10 June; Alexander of Alexandria, 29 May; Alexander of Cartagena, 25 February; Alexander of Side, 14 March; and one of the Forty of Sebaste, 9 March (read 30 September 2026)',
  'mina menas-of-egypt menas-of-zographou menas-the-athenian':
    'three men called Mina, on three Romanian days. The new one is Menas the Athenian, sent to Alexandria by the emperor and martyred there with Hermogenes and Eugraphus, 10 December. The others are Menas the Egyptian, 11 November, and Menas of Zographou, 10 October (read 30 September 2026)',
  'ermoghen hermogenes-of-alexandria hermogenes-of-moscow hermogenes-the-martyr-24-july':
    'three folders whose ro form is Ermoghen, on three Romanian days. The new one is Hermogenes bishop of Alexandria, martyred with Menas and Eugraphus, 10 December. The others were read on 28 September: the patriarch of Moscow and the bare-line martyr of 24 July (read 30 September 2026)',
  'sofronie sophronius-of-cioara sophronius-of-cyprus sophronius-of-jerusalem sophronius-of-soumela':
    'four folders whose ro form is Sofronie, on four Romanian days. The new one is Sophronius bishop of Cyprus, 8 December. The other three were read on 29 and 30 September: the monk of Cioara, 21 October; the patriarch of Jerusalem, 11 March; and the founder of Panagia Soumela, 18 August (read 30 September 2026)',
  'nicolae nicholas-ii nicholas-of-lesvos nicholas-of-myra nicholas-of-the-forty-martyrs':
    'four folders whose ro form is Nicolae, on four Romanian days. The new one is Nicholas archbishop of Myra in Lycia, 6 December. The others are the tsar Nicholas II, 17 July; Nicholas of Lesvos, 9 April; and one of the Forty of Sebaste, 9 March (read 30 September 2026)',
  'nectarie nectarios-of-bitola nectarius-venerable-17-may':
    'two men: Nectarios of Bitola, one of the Athonite fathers the Romanian 5 December keeps, and the bare-line venerable of 17 May. Two entries on one calendar, and the May page gives nothing that could be him (read 30 September 2026)',
  'avacum abachum-son-of-marius habakkuk':
    'two men, and one of them is a prophet: Habakkuk, whom the Romanian keeps on 2 December; and Abachum, son of Marius and Martha, martyred at Rome with his father, mother and brother, Romanian 6 July. The ro form Avacum serves both (read 30 September 2026)',
  'anastasia anastasia-daughter-of-nicholas-ii anastasia-of-rome-15-april anastasia-saguna':
    'three women called Anastasia, on three Romanian days. The new one is Anastasia Saguna, the mother of Andrei Saguna, born in 1785, whom the calendar keeps the day after her son, 1 December. The others are Anastasia of Rome, 15 April, and the grand duchess Anastasia, daughter of Nicholas II, 17 July (read 30 September 2026)',
  'teodor theodore-of-rostov theodore-the-studite':
    'two men: Theodore archbishop of Rostov, Romanian 28 November; and Theodore the Studite, whom the corpus gained on 11 November. The other Theodores the corpus keeps carry different ro forms (read 30 September 2026)',
  'petru peter-of-alexandria peter-of-lampsacus peter-of-murom peter-of-sebaste peter-of-the-brazen-gate peter-the-apostle':
    'six folders whose ro form is Petru, on six Romanian days. The new one is Peter archbishop of Alexandria, 24 November. The other five were read on 29 September and are unchanged (read 30 September 2026)',
  'clement clement-apostle-of-sardis clement-of-ancyra clement-of-ohrid clement-of-rome':
    'four men called Clement. The new one is Clement bishop of Rome, the disciple of Peter drowned with an anchor about his neck, 24 November. The others are one of the Seventy, apostle of Sardis, who has no Romanian row; Clement of Ancyra, 23 January; and Clement of Ohrid, 27 July (read 30 September 2026)',
  'grigorie gregory-of-akragas gregory-of-alexandria gregory-of-nyssa':
    'three folders whose ro form is Grigorie, on three Romanian days. The new one is Gregory bishop of Akragas in Sicily, 23 November. The others were read on 30 September: Gregory of Alexandria, 5 November, and Gregory of Nyssa, 10 January. The other Gregories the corpus keeps carry different ro forms (read 30 September 2026)',
  'filimon philemon-6-july philemon-of-cyzicus philemon-of-gaza philemon-the-apostle':
    'four men called Filimon, on four Romanian days. The new one is the apostle of the Seventy to whom Paul wrote, husband of Apphia, 22 November. The others are the bare-line martyr of 6 July, Philemon of Cyzicus, 29 April, and Philemon bishop of Gaza, 14 February (read 30 September 2026)',
  'proclu proclus-of-callippi proclus-of-constantinople':
    'two men: the patriarch of Constantinople, disciple of John Chrysostom, Romanian 20 November; and Proclus of Callippi, a martyr, Romanian 12 July (read 30 September 2026)',
  'varlaam barlaam-30-may barlaam-hutinski barlaam-of-antioch varlaam-of-moldavia':
    'four folders whose ro form is Varlaam, on four Romanian days. The new one is Barlaam of Antioch, the old man whose hand was held over the altar fire, 19 November. The other three were read on 30 September: the bare 30 mai line, Barlaam Hutinski on 6 noiembrie, and Varlaam metropolitan of Moldavia, 30 August (read 30 September 2026)',
  'zaheu zacchaeus-the-deacon-martyr zacchaeus-the-publican':
    'two men: the deacon martyred with Alphaeus, whose life doxologia gives in two short paragraphs, Romanian 18 November; and Zacchaeus the publican of the Gospel, kept as an apostle on 20 April (read 30 September 2026)',
  'roman roman-the-venerable romanus-martyr-16-march romanus-the-deacon-of-caesarea':
    'three folders whose ro form is Roman. The new one is the deacon of Caesarea in Palestine, martyred at Antioch, 18 November. The others are the bare-line martyr of 16 March and Roman the monastic, who has no Romanian row (read 30 September 2026)',
  'platon plato-of-ancyra plato-the-venerable':
    'two men: the martyr of Ancyra, brother of Antiochus the physician, Romanian 18 November; and the venerable Plato the corpus keeps on 4 April (read 30 September 2026)',
  'zaharia zacharias-son-of-barachias zacharias-son-of-carion zacharias-the-cobbler':
    'three men called Zaharia, on three Romanian days. The new one is the cobbler whose calendar line is bare and whose page tells the story of a monk named John, keeping vigil at Hagia Sophia in Constantinople, and names the cobbler only at the end, 17 November. The others are the prophet, son of Barachias, 8 February, and Zacharias son of Carion, a monk, 24 March (read 30 September 2026)',
  'aviv abibus-of-samosata abibus-the-deacon-of-edessa':
    'two men: the deacon of Edessa burned under Licinius, kept with Gurias and Samonas, Romanian 15 November; and one of the seven of Samosata, 29 January (read 30 September 2026)',
  'teodota theodota-of-adrianople theodota-sister-of-gregory-palamas theodota-with-her-three-sons':
    'three women called Teodota, on three Romanian days. The new one is the sister of Gregory Palamas, 14 November. The other two were read on 29 September: one of the four of Adrianople, 22 October, and Theodota who suffered with her three sons, 29 July (read 30 September 2026)',
  'teodosie theodosius-brother-of-gregory-palamas theodosius-of-the-kyiv-caves':
    'two men: the brother of Gregory Palamas, 14 November, and Theodosius of the Kyiv Caves, 3 May (read 30 September 2026)',
  'macarie macarius-brother-of-gregory-palamas macarius-companion-of-terentius macarius-the-confessor':
    'three men called Macarie, on three Romanian days. The new one is the brother of Gregory Palamas, 14 November. The others are the companion of Terentius, 10 April, and Macarius the Confessor, 19 February (read 30 September 2026)',
  'epiharia epicharis-sister-of-gregory-palamas epiharia-of-rome':
    'two women: the sister of Gregory Palamas, one of the six of his household the Romanian 14 November keeps with him; and Epiharia of Rome, a martyr, 27 September (read 30 September 2026)',
  'antuza anthousa-12-april anthousa-mother-of-john-chrysostom anthousa-of-seleucia anthousa-the-venerable-27-july':
    'four women called Antuza, on four Romanian days, and doxologia keeps four commemorations. The new one is named by her son: the mother of John Chrysostom, widowed at twenty, 13 November. Of the other three, two are bare lines the corpus settled earlier — 12 aprilie and 27 iulie — and the third is Anthousa of Seleucia, 22 August (read 30 September 2026)',
  'victor victor-of-corinth victor-of-damascus victor-presbyter-martyr-1918':
    'three men called Victor. The new one is Victor of Damascus, martyred with Stephanida, Romanian 11 November. The other two were read on 19 September: one of the seven of Corinth, 31 January, and the Russian presbyter killed in 1918, who has no Romanian row (read 30 September 2026)',
  'stefan stefan-brancoveanu stephen-of-decani stephen-of-triglia':
    'three men called Stefan, on three Romanian days. The new one is Stephen of Decani, king of Serbia, 11 November. The others were read on 29 September: the second son of Constantin Brancoveanu, 16 August, and the abbot of Triglia, 28 March (read 30 September 2026)',
  'mina menas-of-egypt menas-of-zographou':
    'two men: Menas the Egyptian, the soldier martyred at Cotyaeum under Diocletian, Romanian 11 November; and Menas of Zographou, one of the venerable-martyrs of that house, 10 October (read 30 September 2026)',
  'visarion bessarion-of-egypt bessarion-of-lainici bessarion-the-confessor':
    'three folders whose ro form is Visarion, on three Romanian days. The new one is Bessarion of Lainici, the Romanian hieromonk of the Jiu valley, 10 November. The others were read on 29 September: the Serb who resisted the union in Transylvania, 21 October, and Bessarion of Egypt, hermit, 20 February (read 30 September 2026)',
  'arsenie arsenios-of-cappadocia arsenios-of-paros arsenius-of-corfu':
    'three men called Arsenie, on three Romanian days. The new one is Arsenios of Cappadocia, the priest of Farasa who baptised Paisios the Athonite, 10 November. The others are Arsenios of Paros, hieromonk and abbot, 31 January, and Arsenius of Corfu, archbishop, 19 January (read 30 September 2026)',
  'simeon simeon-martyr-16-may simeon-metaphrastes simeon-of-persia simeon-the-fool-for-christ symeon-kinsman-of-the-lord symeon-the-god-receiver':
    'six folders whose ro form is Simeon, on six Romanian days. The new one is Simeon Metaphrastes, born at Constantinople in 886 under Leo the Wise, who gathered the lives of the saints, 9 November. The others are unchanged: the bare-line martyr of 16 May, Simeon of Persia, 17 April, Simeon the Fool for Christ, 21 July, Symeon the kinsman of the Lord, 27 April, and Symeon the God-receiver, 3 February (read 30 September 2026)',
  'neofit neophytos-of-docheiariou neophytus-5-may neophytus-of-nicaea neophytus-of-urbnisi':
    'four folders whose ro form is Neofit, on four Romanian days. The new one is Neophytos of Docheiariou, nephew of Euthymius the Cellarer, 9 November. The others were read on 30 September: the bare-line martyr of 5 May, Neophytus of Nicaea, 21 January, and the bishop of Urbnisi, 28 October (read 30 September 2026)',
  'ioan john-archbishop-of-constantinople john-colobos john-companion-of-simeon john-disciple-of-gregory-the-decapolite john-of-antioch john-of-edessa john-of-ephesus john-of-gothia john-of-nea-moni john-of-the-brazen-gate john-of-the-forty-martyrs john-of-the-old-lavra john-of-valaam john-son-of-xenophon john-the-theologian':
    'fifteen folders whose ro form is Ioan, on fifteen Romanian days. Two are new since the fold was last read: John Colobos, the Egyptian ascetic whose epithet means the dwarf, 9 November, and John the archbishop of Constantinople, who gained his Romanian row on 30 august. The other thirteen were read on 25 and 28 September and on 29 September and are unchanged (read 30 September 2026)',
  'eftimie euthymius-of-dimitsana euthymius-of-madytos euthymius-of-vatopedi euthymius-of-zographou euthymius-the-cellarer jacob-of-putna':
    'six folders whose ro form is Eftimie, on six Romanian days. The new one is Euthymius the Cellarer, the founder of Docheiariou and uncle of Neophytos, 9 November. The others are unchanged: Euthymius of Dimitsana, 22 March; Euthymius of Madytos, 5 May; Euthymius of Vatopedi with the twelve, 4 January; Euthymius of Zographou, 10 October; and Jacob of Putna, whose monastic name folds him in, 15 May (read 30 September 2026)',
  'matrona matrona-of-ancyra matrona-of-constantinople matrona-of-hurezi':
    'three women called Matrona, on three Romanian days. The new one is Matrona of Constantinople, born at Perge in Pamphylia and married to Dometian, who left husband and house for the ascetic life, 9 November. The others are Matrona of Ancyra, virgin and martyr, 18 May, and Matrona of Hurezi, abbess, 5 May (read 30 September 2026)',
  'porfirie porphyrius-martyr-9-november porphyrius-of-gaza':
    'two men: the martyr the Romanian 9 noiembrie keeps with Onesiphorus, and Porphyrius of Gaza, bishop, 26 February (read 30 September 2026)',
  'claudiu claudius-husband-of-hilaria claudius-martyr-9-november claudius-of-corinth':
    'three men called Claudiu, on three Romanian days. The new one is a calendar line of 9 noiembrie, kept with Castor, Sempronian and Nicostratus, and his own life says he is not the Claudius of Corinth, not the husband of Hilaria and not one of the Forty. The others are unchanged: the husband of Hilaria, 19 March, and Claudius of Corinth, 31 January (read 30 September 2026)',
  'castor castor-martyr-9-november castor-the-martyr':
    'two men, both thin, and doxologia keeps only the November one. The new folder is a calendar line — «Sfantul Mucenic Castor», 9 noiembrie, no Viata tab, and a Tropar that is the common of the martyrs — and the page names him with Claudius, Sempronian and Nicostratus, the four the day keeps together. The corpus other Castor is the Greek synaxarion 18 September, which says it has no details of his life (read 30 September 2026)',
  'lazar lazar-of-serbia lazarus-of-mount-galesion':
    'two men: the stylite of Mount Galesion near Ephesus, venerable, Romanian 7 November; and Lazar, prince of Serbia, killed at Kosovo, Romanian 15 June (read 30 September 2026)',
  'luca luke-of-crimea luke-of-emesa luke-of-sicily luke-the-evangelist':
    'four men called Luca, on four Romanian days. The new one is Luke of Sicily, a hermit, 6 November. The other three were read on 29 September: Luke the deacon of Emesa, 29 January; Luke of Crimea, 11 June; and the evangelist, 18 October (read 30 September 2026)',
  'pavel paul-of-jamnia paul-of-plousias paul-of-ptolemais paul-of-zographou paul-the-apostle paul-the-confessor paul-with-valentina-and-ennatha platon-kulbusch':
    'eight folders whose ro form is Pavel, on eight Romanian days. The new one is Paul of Constantinople, the patriarch exiled and strangled by the Arians, 6 November, whose slug keeps the epithet the calendar gives him. The others are unchanged: Paul of Jamnia, 16 February; Paul of Plousias, 8 March; Paul of Ptolemais, 4 March; Paul of Zographou, 10 October; the apostle; Paul kept with Valentina and Ennatha, 10 February; and Platon Kulbusch, whose baptismal name folds him in, 14 January (read 30 September 2026)',
  'varlaam barlaam-30-may barlaam-hutinski varlaam-of-moldavia':
    'three folders whose ro form is Varlaam, on three Romanian days. The new one carries an epithet the calendar gives it — «Sfantul Varlaam Hutinski», 6 noiembrie — though the page behind that line has no life. The 30 mai folder is bare and carries no epithet at all, and Varlaam the metropolitan of Moldavia is kept on 30 august. Three entries on one calendar (read 30 September 2026)',
  'silvan silvanus-of-cibalae silvanus-of-emesa silvanus-of-gaza silvanus-the-apostle silvanus-the-martyr-5-november':
    'five folders whose ro form is Silvan, on five Romanian days. The new one is a bare line: 5 noiembrie prints «Sfantul Mucenic Silvan» and the page carries the name, the day and the readings. The other four were read on 29 and 30 September and carry lives and companies of their own — the deacon of Cibalae, 21 August; the bishop of Emesa, 29 January; the presbyter of Gaza, 14 October; and Silvanus of the Seventy, 30 July — and the November line names none of them (read 30 September 2026)',
  'grigorie gregory-of-alexandria gregory-of-nyssa':
    'two men: Gregory of Alexandria, Romanian 5 November, and Gregory of Nyssa, 10 January. The other Gregories the corpus keeps carry different ro forms and do not fold here (read 30 September 2026)',
  'galaction galaction-of-emesa galaction-the-martyr-22-june':
    'two entries on one calendar, so two men. The corpus 22 iunie folder is a bare line — the name, the day and the readings — and the new one is the Galaction of Emesa whose life doxologia prints for 5 noiembrie, the son of Cleitophon and Leucippe who with his wife Episteme left the world for Publion mountain. Nothing on the June page ties it to him (read 30 September 2026)',
  'nicandru nicander-of-durostorum nicander-of-egypt nicander-of-myra':
    'three men called Nicandru, on three Romanian days. The new one is the bishop of Myra, martyred with the deacon Hermaeus, 4 November. The others are the soldier of Durostorum, 8 June, and Nicander of Egypt, 5 June (read 30 September 2026)',
  'ioanichie joannicius-of-zographou joannicius-the-great':
    'two men: Joannicius the Great, the soldier who became a monk in Bithynia, venerable, 4 November; and Joannicius of Zographou, a venerable-martyr, 10 October (read 30 September 2026)',
  'gheorghe george-of-drama george-of-egypt george-of-pisidian-antioch george-of-thessalonica':
    'four men called Gheorghe, on four Romanian days. The new one is the new-martyr of Drama, 4 November. The others are George of Egypt, 5 June; George of Pisidian Antioch, bishop and confessor, 19 April; and George of Thessalonica, bishop, 10 July (read 30 September 2026)',
  'iosif joseph-archbishop-of-thessalonica joseph-of-nea-moni joseph-presbyter-of-persia joseph-the-hymnographer joseph-the-merciful':
    'five men called Iosif, on five Romanian days. The new one is the presbyter martyred in Persia with bishop Acepsimas and the deacon Aithalas, 3 November. The others are unchanged: the archbishop of Thessalonica, 15 July; Joseph of Nea Moni, 20 May; Joseph the Hymnographer, 4 April; and Joseph the Merciful, metropolitan, 26 January (read 30 September 2026)',
  'agapie agapius-2-november agapius-disciple-of-babylas agapius-of-caesarea-in-palestine agapius-of-colciu agapius-of-gaza agapius-son-of-bassa agapius-son-of-eustathius':
    'seven folders whose ro form is Agapie, on seven Romanian days, and doxologia keeps seven commemorations. The new one is a bare line: 2 noiembrie prints «Sfantul Mucenic Agapie» and the page behind it carries no life. The other six carry lives and companies of their own — the disciple of Babylas, 24 January; Agapius of Caesarea in Palestine, 15 March; Agapius of Colciu, 1 March; Agapius of Gaza, 19 August; the son of Bassa, 21 August; and the son of Eustathius, 20 September — and the November line names none of them (read 30 September 2026)',
  'achindin acindynus-of-nicomedia acindynus-the-persian':
    'two men: the martyr of Nicomedia, Romanian 22 August, and the first named of the five martyred in Persia under Sapor, 2 November. Two entries on one calendar (read 30 September 2026)',
  'elpidifor elpidephorus-the-martyr elpidephorus-the-persian':
    'two men. The corpus 3 aprilie folder is a bare line, and saint.gr 3 Apriliou is the same bare «Agios Elpidiforos», standing beside Dios, Vythonios and Galykos and not beside any Persian. The new folder is one of the five martyred in Persia under Sapor with Acindynus, Pegasius, Aphthonius and Anempodistus, 2 November, whose life both calendars print. Two entries on each calendar, so two men (read 30 September 2026)',
  'narcis narcissus-of-athens narcissus-of-jerusalem':
    'two men: Narcissus one of the Seventy, whom Paul greets and who was bishop in Athens, Romanian 31 October; and Narcissus of Jerusalem, patriarch and hieromartyr, Romanian 7 August (read 30 September 2026)',
  'epimah epimachus-9-may epimachus-of-pelusium':
    'two men, and the Greek names the company the Romanian leaves bare. The corpus 9 mai folder is a calendar line and nothing else — «Sfantul Mucenic Epimah», no Viata tab — and saint.gr keeps 9 Maiou as «Agioi Epimachos kai Gordianos», a pair. The new folder is the Egyptian of Pelusium who went out to the desert and was killed at Alexandria, 31 October, whose life doxologia prints in full. Two (read 30 September 2026)',
  'maria golinduhia-of-persia maria-daughter-of-nicholas-ii maria-of-gatchina maria-the-patrician mary-niece-of-abraham mary-of-aza mary-sister-of-lazarus mary-sister-of-lykarion mary-wife-of-xenophon':
    'nine women whose ro form is Maria, on nine separate Romanian days. The new one is the niece of Abraham the Recluse, who fell and was brought back by him from the inn where she lived, 29 October. The other eight were read on 29 September and are unchanged (read 30 September 2026)',
  'avramie abraham-the-recluse abramius-of-arbela athanasius-the-athonite':
    'three folders whose ro form is Avramie. The new one is Abraham the Recluse, who shut himself up for fifty years and went out once to bring back his niece Mary, 29 October. Abramius of Arbela is a bishop and hieromartyr, 4 February. The third is Athanasius the Athonite, who carries Avramie as a second ro form because that was his baptismal name; his day is 5 July (read 30 September 2026)',
  'savaitul stefan stephen-the-sabaite stephen-the-sabbaite':
    'two men of the same house and the same epithet, and the two slugs differ by one letter, which is a trap for whoever reads this next. Doxologia keeps both with two lives: the nephew of John Damascene, born in 725 and tonsured at Mar Saba as a boy, Romanian 13 July, held as stephen-the-sabbaite; and the hymnographer of the same Lavra, who with Andrew the Blind was among the first to compose the canons, Romanian 28 October, written here as stephen-the-sabaite. Two commemorations on one calendar, so two men; the near-identical slugs are left as the readers wrote them and are worth a ruling (read 30 September 2026)',
  'teodul theodulus-companion-of-agathopodes theodulus-of-the-forty-martyrs theodulus-of-tripoli theodulus-son-of-terence':
    'four men called Teodul, on four Romanian days. The new one is one of the seven sons of Terence and Neonilla, killed with their parents, 28 October. The others are the companion of Agathopodes, 5 April; one of the Forty of Sebaste, 9 March; and the soldier of Tripoli, 18 June (read 30 September 2026)',
  'teofil theophilus-companion-of-trophimus theophilus-of-the-forty-martyrs theophilus-the-fool-for-christ-of-kyiv':
    'three men called Teofil, on three Romanian days. The new one is the fool for Christ of Kyiv, 28 October. The others are the companion of Trophimus, 23 July, and one of the Forty of Sebaste, 9 March (read 30 September 2026)',
  'terentie terence-husband-of-neonilla terentius-of-africa terentius-the-martyr-16-october':
    'three men called Terentie, on three Romanian days. The new one is the husband of Neonilla, martyred with her and their seven sons, 28 October. The other two were read on 29 September: Terentius of Africa, 10 April, and one of the four who died by fire, 16 October (read 30 September 2026)',
  'neofit neophytus-5-may neophytus-of-nicaea neophytus-of-urbnisi':
    'three men called Neofit, on three Romanian days. The new one is the bishop of Urbnisi in Georgia, 28 October. The others are the bare-line martyr of 5 May and Neophytus of Nicaea, 21 January (read 30 September 2026)',
  'iachint hyacinth-of-vicina hyacinth-son-of-theoclitus hyacinth-the-chamberlain':
    'three men called Iachint, on three Romanian days. The new one is Hyacinth of Vicina, metropolitan of Ungro-Wallachia, 28 October. The others are the son of Theoclitus, a martyr, 18 July, and Hyacinth the chamberlain, 3 July (read 30 September 2026)',
  'neonila neonilla neonilla-wife-of-terence':
    'two women, on two Romanian days and in two countries. The new one is the wife of Terence, martyred with her husband and their seven sons, the place not named on the page, 28 October. The other is the Neonilla of Lingonia in Gaul, sister of the senator Faustus and grandmother of triplets, 16 January (read 30 September 2026)',
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
  ro: /^(sf[âa]nt|cuvios|cuvioas|mucenic|muceni[țţt]|martir(?!ie)|mare|ierarh|m[ăa]rturisitor|m[ăa]rturisitoare|prooroc|proroc|apostol|drept|fericit|[îi]mp[ăa]rat|[îi]mp[ăa]r[ăa]teas|voievod|domnitor|episcop|arhiepiscop|mitropolit|patriarh|preot|diacon|monah|ieromonah|arhimandrit|stare[țţt]|principe|prin[țţt]|regin|rege)/i,
  el: /^(άγι|αγί|όσι|οσί|ιερομάρτυ|οσιομάρτυ|μεγαλομάρτυ|νεομάρτυ|μάρτυ|προφήτ|απόστολ|δίκαι|ομολογητ|επίσκοπ|αρχιεπίσκοπ|μητροπολίτ|πατριάρχ|ηγούμεν|αρχιμανδρίτ|ιερομόναχ|μοναχ|βασιλε[ύυ]|αυτοκράτ)/i,
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

/*
 * **Nothing here any more, and that is the point.** The one literal this
 * watched -- the January feast count -- was replaced on 2026-09-30 by
 * `countInMonth` in `e2e/helpers.js`, which asks the page's own filter. This
 * arithmetic disagreed with the page by one in any case: it counts a venerated
 * feast whose *recorded* month is January, and the facet counts a feast that
 * falls in the *civil* January, which for a Julian calendar is a different
 * question. The list stays because the next number hard-coded in a spec
 * belongs in it.
 */
const EXPECTED = [];
for (const [where, now, literal] of EXPECTED) {
  const moved = String(now) !== literal;
  console.log(`  ${moved ? '!' : '·'} ${where.padEnd(52)} now ${String(now).padEnd(12)} spec says ${literal}`);
  if (moved) fail('e2e literals', `${where} — the spec still says ${literal}, the corpus now says ${now}`);
}
console.log(`  · feast in the recorded January (no spec holds it)    now ${januaryOwn}`);
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
