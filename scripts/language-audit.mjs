#!/usr/bin/env node
/**
 * Where the site speaks one language and says it is speaking another, and
 * where a reader in one of the four packs is handed English instead.
 *
 * `node scripts/language-audit.mjs [--list <finding>] [--limit N]`
 *
 * **Two different things, and the report keeps them apart.** A *mismatch* is
 * a defect: the data declares a language and the characters are another one's,
 * or a Greek hymn prints a Romanian tone. Nothing has to be translated to fix
 * one — the claim is simply wrong, and a machine can be sure of it. A *gap* is
 * a saint with no name form in a language the site can be read in, which is
 * translation work, and 862 saints times four packs is a project rather than a
 * pass. The house rule holds for both (CLAUDE.md: do not bulk-generate saint
 * data): this reports and never writes.
 *
 * **Why a name gap matters even where the church does not keep the saint.**
 * A calendar and a language are different questions — `currentChurch()` and
 * the reader's pack — and All Saints shows the whole corpus whatever calendar
 * is kept. So a reader in Russian meets Neagoe Basarab, whom only the
 * Romanian church commemorates, and `lib/saint-name.js` has nothing Russian to
 * print for him. That is the gap this counts, and it is why it is counted
 * against all four packs rather than against each saint's own attestations.
 */
import fs from 'node:fs';
import path from 'node:path';

import { toneNumber } from '../src/lib/tone.js';
import { pickNameForms } from '../src/lib/saint-name.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i === -1 ? d : args[i + 1]; };
const LIST = opt('--list', null);
const LIMIT = Number(opt('--limit', 40));
/*
 * `--json dropped` prints the same rows the report does, as data, so a
 * one-off writer can consume exactly what a reader has just reviewed rather
 * than a second implementation of the matching drifting away from this one.
 * It stays a *proposal*: the writer is separate, and somebody has to read the
 * rows before running it.
 */
const JSON_OUT = opt('--json', null);

/** The four packs the site can be read in. English is the fallback, not a pack. */
const PACKS = ['ru', 'ro', 'el', 'sr'];

/*
 * Which script a language is written in. `cu` is Church Slavonic, which the
 * corpus records in civil Cyrillic; `grc` is polytonic Greek, which lives in
 * the Greek Extended block as much as in the Greek one.
 */
const SCRIPT_OF = {
  ru: 'cyrillic', uk: 'cyrillic', sr: 'cyrillic', bg: 'cyrillic', cu: 'cyrillic', mk: 'cyrillic',
  el: 'greek', grc: 'greek',
  ro: 'latin', la: 'latin', en: 'latin', de: 'latin', fr: 'latin', it: 'latin', es: 'latin',
  pl: 'latin', cs: 'latin', sk: 'latin', hu: 'latin', sq: 'latin', fi: 'latin', tr: 'latin',
  ka: 'georgian', hy: 'armenian', he: 'hebrew', ar: 'arabic', syr: 'syriac', cop: 'coptic',
  gez: 'ethiopic', ja: 'japanese', zh: 'han', ko: 'hangul',
};

const RANGES = {
  cyrillic: /[Ѐ-ӿԀ-ԯ]/g,
  greek: /[Ͱ-Ͽἀ-῿]/g,
  latin: /[A-Za-zÀ-ɏ]/g,
  georgian: /[Ⴀ-ჿᲐ-Ჿ]/g,
  armenian: /[԰-֏]/g,
  hebrew: /[֐-׿]/g,
  arabic: /[؀-ۿ]/g,
  syriac: /[܀-ݏ]/g,
  coptic: /[Ⲁ-⳿Ϣ-ϯ]/g,
  ethiopic: /[ሀ-፿]/g,
  japanese: /[぀-ヿ一-鿿]/g,
  han: /[一-鿿]/g,
  hangul: /[가-힯]/g,
};

/** The script most of a string is written in, or null where it has no letters. */
function scriptOf(text) {
  const s = String(text ?? '');
  let best = null;
  let bestN = 0;
  for (const [name, re] of Object.entries(RANGES)) {
    // Coptic borrows from the Greek block, so Greek would always win a tie.
    const n = (s.match(re) ?? []).length;
    if (n > bestN) { best = name; bestN = n; }
  }
  return bestN ? best : null;
}

/** Whether a string carries *any* letter of a script. */
const hasScript = (text, script) => RANGES[script] ? RANGES[script].test(String(text ?? '')) : false;

/**
 * The word a tone is named by, per script. A hymn quotes its own source, so
 * the tone is in the hymn's language — «глас 4» on a Slavonic troparion is
 * right, and is a different question from what the *page* prints around it.
 */
const TONE_WORD = {
  cyrillic: /глас|глaс/i,
  greek: /ἦχος|ήχος|ηχος/i,
  latin: /glas|tone|ton\b/i,
};

const findings = { mismatch: [], gap: [], thin: [], dropped: [] };
const add = (kind, row) => findings[kind].push(row);

/**
 * The rows a reading has judged and kept, with the reason beside each.
 *
 * Amendment 44's lesson in a third place, after `related-from-links.mjs`'s own
 * `REFUSED`: **the matching is a table rather than a rule.** A row removed
 * from here is reported again on the next run, which is the point — the
 * exception has to be re-argued rather than forgotten.
 */
const ACCEPTED = new Map([
  [
    'shushanik-of-georgia hy',
    'Вардандухт is an Armenian name written in the Cyrillic the Russian source renders it in; no Armenian spelling has been read for this corpus, and `hy` is not a pack language so nothing is printed from it.',
  ],
]);

/** Which church's citation is written in which pack's language. */
const CHURCH_LANG = { russian: 'ru', romanian: 'ro', greek: 'el', serbian: 'sr' };

/*
 * A rough romanisation, for matching a name against an English one and for
 * nothing else — it is never printed. Digraphs first, so `θ` is `th` before
 * `η` can be `i`, and Greek's own `ου`/`αι` before their letters are taken
 * singly. Accents are stripped by `NFD` before any of it runs.
 */
const ROMAN_PAIRS = [
  ['ου', 'u'], ['αι', 'e'], ['ει', 'i'], ['οι', 'i'], ['ευ', 'ev'], ['αυ', 'av'], ['γγ', 'ng'], ['μπ', 'b'], ['ντ', 'd'],
  ['θ', 'th'], ['χ', 'ch'], ['ψ', 'ps'], ['ξ', 'x'], ['φ', 'f'], ['ω', 'o'], ['η', 'i'], ['υ', 'y'], ['σ', 's'], ['ς', 's'],
  ['α', 'a'], ['β', 'v'], ['γ', 'g'], ['δ', 'd'], ['ε', 'e'], ['ζ', 'z'], ['ι', 'i'], ['κ', 'k'], ['λ', 'l'], ['μ', 'm'],
  ['ν', 'n'], ['ο', 'o'], ['π', 'p'], ['ρ', 'r'], ['τ', 't'],
  ['щ', 'sh'], ['ш', 'sh'], ['ч', 'ch'], ['ж', 'zh'], ['ю', 'yu'], ['я', 'ya'], ['х', 'h'], ['ц', 'ts'], ['ѣ', 'e'],
  ['а', 'a'], ['б', 'b'], ['в', 'v'], ['г', 'g'], ['д', 'd'], ['е', 'e'], ['ё', 'e'], ['з', 'z'], ['и', 'i'], ['й', 'i'],
  ['к', 'k'], ['л', 'l'], ['м', 'm'], ['н', 'n'], ['о', 'o'], ['п', 'p'], ['р', 'r'], ['с', 's'], ['т', 't'], ['у', 'u'],
  ['ф', 'f'], ['ы', 'y'], ['э', 'e'], ['ъ', ''], ['ь', ''], ['ј', 'j'], ['љ', 'lj'], ['њ', 'nj'], ['ђ', 'dj'], ['ћ', 'c'],
  ['ș', 's'], ['ț', 't'], ['ă', 'a'], ['â', 'a'], ['î', 'i'],
];

function romanise(text) {
  let s = String(text ?? '').normalize('NFD').replace(/[̀-ͯ҃-҉]/g, '').toLowerCase();
  for (const [from, to] of ROMAN_PAIRS) s = s.split(from).join(to);
  return s.replace(/[^a-z]/g, '');
}

/*
 * The spellings that are one name in two alphabets. Every one of these was a
 * miss on the first run: `Αγαθόκλεια`/Agathocleia is `k` against `c`,
 * `Ана`/Anna is a doubled letter English keeps and Cyrillic does not,
 * `Адријан`/Adrian is Serbian's `ј`, and `Ασκληπιοδότη`/Asclepiodote is both
 * `k`/`c` and the vowel a transliterator chose differently. Folding them away
 * took the matcher from 39 of 125 to most of them.
 */
const fold = (s) =>
  s
    .replace(/c/g, 'k')
    .replace(/[jy]/g, 'i')
    .replace(/ph/g, 'f')
    .replace(/(.)\1+/g, '$1');

/** Levenshtein, small strings only. */
function distance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const t = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = t;
    }
  }
  return prev[b.length];
}

/**
 * How alike two romanised names are, 0 to 1 — an edit distance rather than a
 * shared prefix, because the letters that differ between two alphabets'
 * transliterations are as often in the middle («Ασκληπιοδότη») as at the end.
 */
function affinity(a, b) {
  const x = fold(a);
  const y = fold(b);
  if (!x || !y) return 0;
  return 1 - distance(x, y) / Math.max(x.length, y.length);
}

/**
 * The one name in a company line that belongs to *this* saint.
 *
 * The 125 forms `pickNameForms` refuses are company lines — the day's whole
 * entry copied into a `names` slot — and the saint's own name is nearly always
 * inside one, beside three others. Matching it is a romanisation away:
 * «Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης» against "Agathocleia of
 * Nicomedia" picks Αγαθόκλεια on `agathokleia` ~ `agathocleia`.
 *
 * **Proposes, and less confidently than `citedName` does.** A Greek line lists
 * in the nominative and a Slavonic one may not; an entry like «Св. исповедници
 * Едески» ("the confessors of Edessa") names nobody at all and this returns
 * nothing for it; and a saint whose English name is a description rather than
 * a transliteration — "Andrew, soldier of Alexandria" — matches on its first
 * word only, which is why the threshold is high and the row is still printed
 * beside the line it came from.
 */
function nameInCompany(form, displayName) {
  const head = romanise(String(displayName ?? '').split(/[,(]/)[0].split(/\s+/)[0]);
  if (head.length < 3) return null;
  const tokens = String(form ?? '')
    .split(/[\s,]+|\bκαι\b|\bκαί\b|\bи\b|\bși\b|\bşi\b/i)
    .map((t) => t.replace(/[«»„“”"().]/g, '').trim())
    .filter((t) => t.length > 2);
  let best = null;
  for (const t of tokens) {
    const score = affinity(romanise(t), head);
    if (score >= 0.72 && (!best || score > best.score)) best = { token: t, score };
  }
  return best?.token ?? null;
}

/**
 * The saint's name as their *own folder* already quotes it, in `pack`.
 *
 * **Nothing here is translated, and that is the whole point.** Every
 * `venerated` attestation carries the line its calendar printed — «Свт.
 * Иоанна Златоустого, архиепископа Константинопольского» for the Russian,
 * «Άγιος Ιωάννης ο Χρυσόστομος…» for the Greek — so for most of the saints
 * missing a pack name the name in that language is already sitting in the
 * folder, inside quotation marks, unread. This lifts it out and proposes it;
 * it is not a form to write down as it stands.
 *
 * **Two reasons a human has to read every row.** A Slavonic calendar lists
 * its saints in the *genitive* — «Иоанна Златоустого» is "of John
 * Chrysostom", and the nominative «Иоанн Златоуст» is Russian grammar, not a
 * substring. And the corpus's own rule is that `display_name` carries the
 * bare name while rank and office are their own fields, so the honorific and
 * the see the citation prints have to come off.
 */
function citedName(saint, pack) {
  for (const a of saint.attestations ?? []) {
    if (a.status !== 'venerated' || CHURCH_LANG[a.church] !== pack) continue;
    const text = a.source?.text ?? '';
    /*
     * The quotation marks the four calendars use between them — and the
     * Serbian pair is why this is not just `«»`: pravoslavno.rs writes
     * „…“, closing with the mark English opens with, so a closing class of
     * `[»”"]` matched none of its thirteen and the pack looked as though its
     * citations carried no names at all.
     */
    const quotes = [...text.matchAll(/[«„“"]([^«„“”»"]{3,120})[»”“"]/g)].map((m) => m[1].trim());
    const want = SCRIPT_OF[pack];
    // Basilica prints the Romanian church's calendar in English, so a quote
    // has to be in the pack's own script before it is any use here.
    /*
     * **A Latin script is not a Romanian one.** Basilica publishes the
     * Romanian Patriarchate's calendar in English — "†) St. Anthony the
     * Great" — and a script test cannot tell that from Romanian, so the
     * first run proposed six English lines as Romanian name forms. A
     * Romanian line says so in its own words: the rank the calendar always
     * leads with, or a letter English does not have.
     */
    const good = quotes.filter((q) => {
      if (!hasScript(q, want)) return false;
      if (want !== 'latin') return true;
      if (/[ăâîșşțţ]/i.test(q)) return true;
      if (/\b(sf[âa]nt|sfin[țt]|cuvios|mucenic|muceni[țt]|ierarh|voievod|preacuvios)/i.test(q)) return true;
      return false;
    });
    if (good.length) return good.sort((x, y) => y.length - x.length)[0];
  }
  return null;
}

const folders = fs.readdirSync('saints').filter((d) => fs.existsSync(path.join('saints', d, 'saint.json')));
const packHas = Object.fromEntries(PACKS.map((p) => [p, 0]));
const packShips = Object.fromEntries(PACKS.map((p) => [p, 0]));
const kept = Object.fromEntries(PACKS.map((p) => [p, { named: 0, total: 0 }]));
let hymnTotal = 0;
let hymnEnglish = 0;

for (const dir of folders) {
  const s = JSON.parse(fs.readFileSync(path.join('saints', dir, 'saint.json'), 'utf8'));
  const at = (kind, note, extra = {}) => add(kind, { dir, name: s.display_name, note, ...extra });

  /* ---- names ---------------------------------------------------------- */
  const byLang = new Map();
  for (const n of s.names ?? []) {
    const lang = n.lang;
    const want = SCRIPT_OF[lang];
    const got = scriptOf(n.form);
    /*
     * **Not one letter of the script it claims**, rather than "mostly some
     * other script". A Greek synaxarion writes a Western saint as «Άγιος
     * Albeus» — a Greek honorific around a Latin name — and by majority that
     * form is Latin, which the first run reported four times and was wrong
     * about every time. What is really a defect is a form with *none* of its
     * language's own letters, like Shushanik's Armenian given in Cyrillic.
     */
    if (want && got && !hasScript(n.form, want) && !ACCEPTED.has(`${dir} ${lang}`)) {
      at('mismatch', `name declared ${lang} (${want}) has no ${want} letters in it`, { text: n.form });
    }
    /*
     * A Latin-script language may legitimately spell a name exactly as the
     * English display name does — `la` "Dionysius Exiguus", `cs` "Gorazd" —
     * so only a non-Latin pack copying the English is worth a word.
     */
    if (n.form && n.form.trim() === s.display_name.trim() && want && want !== 'latin') {
      at('mismatch', `name form for ${lang} is the English display name verbatim`, { text: n.form });
    }
    if (!byLang.has(lang)) byLang.set(lang, n.form);
  }
  /*
   * A pack is served by its own language, and by nothing else — `grc` is not
   * `el` to a reader (polytonic, and often a different form of the name), and
   * `cu` is not `ru`. Counting them as cover is how a corpus comes to look
   * finished while a Russian reader still meets English.
   */
  /*
   * **Recorded is not shipped, and the difference is a whole finding.**
   * `pickNameForms` is what the manifest carries and the page prints, and it
   * refuses a form that names a company where the saint is one person —
   * «Άγιοι Αειθαλάς και Αμών» is two saints, and printing it for either would
   * be a claim the citation does not make. So a folder can hold a Greek form
   * for a saint who is still shown English. Counted at the top of this file
   * only, it looked like coverage; counted here it is a gap wearing coverage's
   * clothes, and there are about a hundred of them in Greek alone.
   */
  const shipped = pickNameForms(s.names, s.display_name);
  for (const p of PACKS) {
    if (byLang.has(p) && !shipped[p]) {
      const inside = nameInCompany(byLang.get(p), s.display_name);
      at('dropped', `${p}: «${byLang.get(p)}»${inside ? `\n        → ${inside}` : '   (no name in it for this saint)'}`, {
        pack: p,
        candidate: inside,
        form: byLang.get(p),
      });
    }
    if (shipped[p]) packShips[p] += 1;
  }

  const missing = PACKS.filter((p) => !byLang.has(p));
  for (const p of PACKS) if (byLang.has(p)) packHas[p] += 1;
  /*
   * The same coverage counted the other way — against the churches that
   * actually keep each saint, which is the standard `lib/saint-name.js` was
   * written to and whose numbers its header still quotes from a corpus of
   * 708. The two readings are the whole argument: by this one the corpus is
   * very nearly finished, and by the reader's one above it is a third done.
   */
  for (const a of s.attestations ?? []) {
    const p = CHURCH_LANG[a.church];
    if (a.status !== 'venerated' || !p) continue;
    kept[p].total += 1;
    if (byLang.has(p)) kept[p].named += 1;
  }
  if (missing.length) {
    at('gap', `no name form in ${missing.join(', ')}`, {
      has: [...byLang.keys()].join(',') || 'none',
      churches: (s.attestations ?? []).filter((a) => a.status === 'venerated').map((a) => a.church).join(','),
      missing,
      proposals: missing.map((p) => [p, citedName(s, p)]).filter(([, c]) => c),
    });
  }

  /* ---- hymns ---------------------------------------------------------- */
  for (const h of s.hymns ?? []) {
    hymnTotal += 1;
    if (h.english?.text) hymnEnglish += 1;
    const want = SCRIPT_OF[h.lang];
    const got = scriptOf(h.text);
    if (want && got && want !== got) {
      at('mismatch', `${h.church} ${h.kind} declared ${h.lang} (${want}) is written in ${got}`, { text: h.text.slice(0, 60) });
    }
    if (h.tone) {
      const toneScript = scriptOf(h.tone);
      if (want && toneScript && toneScript !== want) {
        at('mismatch', `${h.church} ${h.kind} in ${h.lang} carries a ${toneScript} tone`, { text: h.tone });
      } else if (want && TONE_WORD[want] && !TONE_WORD[want].test(h.tone)) {
        at('mismatch', `${h.church} ${h.kind} tone is not a ${want} tone word`, { text: h.tone });
      }
      /*
       * Since 2026-09-07 the page prints the tone in the reader's own words
       * (`lib/tone.js`), so a tone it cannot read is a tone that silently
       * keeps its source's spelling. Three do: `Ἦχος πλ.`, a plagal whose
       * numeral the source itself never printed.
       */
      if (toneNumber(h.tone) === null) {
        at('thin', `${h.church} ${h.kind} tone cannot be read as one of the eight`, { text: h.tone });
      }
    } else {
      at('thin', `${h.church} ${h.kind} has no tone`, {});
    }
    if (h.english?.text && scriptOf(h.english.text) !== 'latin') {
      at('mismatch', `${h.church} ${h.kind} English rendering is not in Latin script`, { text: h.english.text.slice(0, 60) });
    }
  }
}

/* ---- the packs themselves ------------------------------------------------ */
/*
 * `locale-coverage.mjs` already asks whether a key *exists* in a pack. This
 * asks the question after it: whether the value is the English one copied
 * across, which reads as translated and is not. `BRAND` is the one string
 * that is deliberately the same everywhere (author, 2026-08-28).
 */
const EN = (await import('../src/ui/strings.js')).STRINGS;
const packEcho = {};
for (const p of PACKS) {
  const pack = (await import(`../src/ui/locales/${p}.js`)).default ?? (await import(`../src/ui/locales/${p}.js`))[p];
  const echoes = [];
  const walk = (a, b, trail) => {
    for (const k of Object.keys(b ?? {})) {
      const va = a?.[k];
      const vb = b[k];
      if (typeof vb === 'string' && typeof va === 'string') {
        /*
         * A one-word label that is a real cognate ("Email") is not an echo
         * worth reporting; anything of three words or more that matches the
         * English exactly almost certainly is. And a string with no words of
         * its own — `{label} - {name}`, `{credit} · {licence}` — is the same
         * in every pack because there is nothing in it to translate, which
         * is the first thing this check reported and the first thing it had
         * to stop reporting.
         */
        const words = vb.replace(/\{\w+\}/g, ' ').replace(/[^\p{L}]+/gu, ' ').trim();
        if (va === vb && words && vb.trim().split(/\s+/).length >= 3) echoes.push(`${trail}${k}: ${vb.slice(0, 60)}`);
      } else if (vb && typeof vb === 'object' && !Array.isArray(vb)) walk(va, vb, `${trail}${k}.`);
    }
  };
  walk(EN, pack, '');
  packEcho[p] = echoes;
}

if (JSON_OUT) {
  const rows =
    JSON_OUT === 'dropped'
      ? findings.dropped.filter((r) => r.candidate).map((r) => ({ dir: r.dir, pack: r.pack, form: r.form, candidate: r.candidate }))
      : findings.gap.flatMap((r) => r.proposals.map(([pack, cited]) => ({ dir: r.dir, pack, cited })));
  console.log(JSON.stringify(rows, null, 1));
  process.exit(0);
}

/* ---- the report ---------------------------------------------------------- */
const gapsBy = Object.fromEntries(PACKS.map((p) => [p, findings.gap.filter((g) => g.missing.includes(p)).length]));
console.log(`saints                     : ${folders.length}`);
console.log('\n-- coverage, by the two standards ---------------------------------');
console.log('  a: the saint is named in the language of a church that keeps them');
console.log('     (what the corpus was built to, `lib/saint-name.js`)');
console.log('  b: the saint is named in every language the site can be read in');
console.log('     (author, 2026-08-26: "every saint name needs to have the');
console.log('      equivalent in the displayed language")\n');
for (const p of PACKS) {
  const k = kept[p];
  const pct = k.total ? Math.round((k.named / k.total) * 100) : 100;
  console.log(
    `  ${p}   a: ${String(k.named).padStart(3)}/${String(k.total).padEnd(3)} (${String(pct).padStart(3)}%)` +
      `   b: ${String(packHas[p]).padStart(3)}/${folders.length}   missing ${String(gapsBy[p]).padEnd(3)}` +
      `   shown to a reader: ${packShips[p]}`,
  );
}
console.log(`\nsaints with all four       : ${folders.length - findings.gap.length}`);
console.log(`hymns                      : ${hymnTotal} (${hymnEnglish} with an English rendering)`);
console.log(`mismatches (defects)       : ${findings.mismatch.length}`);
console.log(`hymns with a thin tone     : ${findings.thin.length}`);
console.log(`forms recorded but not shown: ${findings.dropped.length}  (${PACKS.map((p) => `${p} ${findings.dropped.filter((d) => d.pack === p).length}`).join(', ')})`);
for (const p of PACKS) console.log(`pack ${p} strings echoing English : ${packEcho[p].length}`);

/*
 * The reachable half of the gap: how much of it the corpus can answer out of
 * citations it already holds, against how much needs a source nobody in this
 * repository has read yet.
 */
const reach = Object.fromEntries(PACKS.map((p) => [p, 0]));
for (const g of findings.gap) for (const [p] of g.proposals) reach[p] += 1;
console.log(`\ncited in the saint's own folder, unread:`);
for (const p of PACKS) {
  console.log(`  ${p}: ${String(reach[p]).padStart(3)} of ${gapsBy[p]} missing — ${gapsBy[p] - reach[p]} need a source this corpus has not read`);
}

console.log('\n-- mismatches: the data says one language and writes another ------');
for (const r of findings.mismatch.slice(0, LIMIT)) console.log(`  ${r.dir}\n      ${r.note}${r.text ? `   «${r.text}»` : ''}`);
if (findings.mismatch.length > LIMIT) console.log(`  … ${findings.mismatch.length - LIMIT} more`);

if (LIST === 'gap') {
  console.log('\n-- name gaps -----------------------------------------------------');
  for (const r of findings.gap.slice(0, LIMIT)) console.log(`  ${r.dir}  has [${r.has}]  venerated by [${r.churches}]  ${r.note}`);
  if (findings.gap.length > LIMIT) console.log(`  … ${findings.gap.length - LIMIT} more`);
}
if (LIST === 'propose') {
  /*
   * Read every row. The quote is the calendar's own line, so it carries the
   * rank, the office and — in Slavonic — the genitive case; what goes in a
   * `names` entry is the bare nominative, which is a reading and not a
   * substring. Proposes; never writes.
   */
  console.log('\n-- names already quoted in the saint’s own folder ----------------');
  let shown = 0;
  for (const r of findings.gap) {
    for (const [p, cand] of r.proposals) {
      if (shown++ >= LIMIT) break;
      console.log(`  ${r.dir}  ${p}: «${cand}»`);
    }
    if (shown >= LIMIT) break;
  }
}
if (LIST === 'thin') {
  console.log('\n-- hymns with no tone --------------------------------------------');
  for (const r of findings.thin.slice(0, LIMIT)) console.log(`  ${r.dir}  ${r.note}`);
}
if (LIST === 'dropped') {
  /*
   * A name the folder holds and the reader never sees. The recorded form
   * names a company — the day's whole entry, copied in — and `pickNameForms`
   * refuses it rather than print another saint's name on this page. What each
   * of these needs is the individual's own form read out of the line, the
   * same reading `--list propose` asks for and the same one that produced
   * `Иоаким` and `Анна` from one citation.
   */
  console.log('\n-- recorded, and never shown to a reader --------------------------');
  for (const r of findings.dropped.slice(0, LIMIT)) console.log(`  ${r.dir}  ${r.note}`);
  if (findings.dropped.length > LIMIT) console.log(`  … ${findings.dropped.length - LIMIT} more`);
}
if (LIST === 'echo') {
  console.log('\n-- pack strings identical to the English ------------------------');
  for (const p of PACKS) for (const e of packEcho[p].slice(0, LIMIT)) console.log(`  ${p}  ${e}`);
}
