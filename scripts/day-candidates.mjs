#!/usr/bin/env node
/**
 * What a calendar prints for a day, and which of it the corpus already holds.
 *
 * `node scripts/day-candidates.mjs 2026-10-01`            all four calendars
 * `node scripts/day-candidates.mjs 2026-10-01 --church russian`
 * `node scripts/day-candidates.mjs 2026-10-01 --json .tmp/cand.json`
 * `node scripts/day-candidates.mjs 2026-10-01 --no-cache`
 *
 * **The date on the command line is always the civil (Gregorian) day.** The
 * script converts it into each church's own reckoning and builds the source
 * URL from that, which is the single most error-prone step in this whole job
 * and the reason it is done here once rather than in an agent's head twelve
 * times a sitting.
 *
 * **Proposes; the reading is the work** — the standing of
 * `place-candidates.mjs`, `track-candidates.mjs` and `related-from-links.mjs`.
 * It writes no folder and decides nothing. What it does is the part a person
 * cannot do reliably at four in the morning: fetch the day's page in the right
 * encoding, list what it prints, and say for each entry whether the corpus
 * already keeps somebody on that menologion day.
 *
 * **The match is on the feast date, never on the name**. Name
 * matching found none of the eight saints the corpus already held for
 * 20 September and invented pairs instead; a feast-date scan found all eight,
 * five of which would otherwise have become silent duplicates. So the column
 * this prints is "the corpus already keeps N on this day, and here they are" —
 * a list to read the source against, not a verdict on any one entry.
 *
 * **Not every printed line is a folder**. A feast, a forefeast,
 * an afterfeast, a leave-taking, an icon of the Theotokos, a synaxis heading
 * and a translation of relics are not people. The `kind` column guesses at
 * these from the source's own words and is a hint for the reader, never a
 * filter — a synaxis that *enumerates* its members is sixteen folders, and the
 * Glinsk sixteen are exactly that case.
 *
 * ## Encoding
 *
 * days.pravoslavie.ru serves some pages as UTF-8 and some as windows-1251,
 * declaring the second nowhere. Decoding with `errors: 'replace'` does not
 * fail — it returns a page of replacement characters, and a saint's life is
 * the last thing that should be read out of one. So: the charset the header
 * states, then UTF-8 **strictly**, then cp1251. Strictly is the whole fix.
 *
 * ## Manners
 *
 * One request at a time, a real user agent, and a delay between requests to
 * the same host — 10 s for oca.org, which asks for that in its robots.txt, and
 * 2 s elsewhere. Pages are cached under `.tmp/day-cache/` (gitignored) so that
 * re-running the script costs the source nothing. `--no-cache` refetches.
 */
import fs from 'node:fs';
import path from 'node:path';

import { readCorpus, feastIndex, onCivilDay, onMenologionDay, churchDate, calendarOf, ROOT } from './corpus-index.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(name);

const DATE = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
if (!DATE) {
  console.error('Usage: node scripts/day-candidates.mjs <YYYY-MM-DD civil> [--church X] [--json FILE] [--no-cache]');
  process.exit(1);
}
const ONLY = opt('--church', null);
const JSON_OUT = opt('--json', null);
const CACHE_DIR = path.join(ROOT, '.tmp', 'day-cache');

/* ---- fetching ------------------------------------------------------------ */

const lastHit = new Map();
const DELAY = { 'www.oca.org': 10000 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(url) {
  const key = url.replace(/[^A-Za-z0-9]+/g, '_').slice(0, 120) + '.html';
  const cached = path.join(CACHE_DIR, key);
  if (!has('--no-cache') && fs.existsSync(cached)) return fs.readFileSync(cached, 'utf8');

  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + (DELAY[host] ?? 2000) - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());

  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (agios-corpus; one page at a time)' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());

  const declared = /charset=([\w-]+)/i.exec(res.headers.get('content-type') ?? '')?.[1];
  let text = null;
  for (const enc of [declared, 'utf-8', 'windows-1251'].filter(Boolean)) {
    try {
      text = new TextDecoder(enc, { fatal: true }).decode(bytes);
      break;
    } catch {
      /* the next one, and never `replace` — that turns an error into data */
    }
  }
  if (text === null) throw new Error(`${url}: no encoding decoded it cleanly`);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cached, text, 'utf8');
  return text;
}

/* ---- what is not a person ------------------------------------------------ */

/**
 * The words a calendar uses for something that is not a folder. Each language
 * names the same six things: a feast, its fore- and after-feast and its
 * leave-taking, an icon of the Theotokos, a synaxis, and the translation or
 * finding of relics.
 *
 * A hint and never a filter. A synaxis heading that enumerates its members is
 * a folder each (the Glinsk sixteen, 22 September); a relic translation is
 * usually a feast and was once given a folder with a note saying so
 * (Theodosius of Chernigov). The reader decides.
 */
const NOT_A_PERSON = [
  [/попразднство|предпразднство|отдание|собор\b|иконы|икона|перенесение мощей|обретение мощей|прославление/i, 'ru'],
  [/σύναξ|προεόρτια|μεθέορτα|απόδοση|παναγία|θεοτόκου|ανακομιδή|εύρεση/i, 'el'],
  [/soborul|înainte-?prăznuire|odovania|icoan|aducerea moaștelor|aflarea moaștelor|acoperământul/i, 'ro'],
  [/сабор\b|икон|пренос моштију|празник/i, 'sr'],
];
/** The word a sentence ends on, which is the only one an abbreviation test may look at. */
const lastWord = (token) => (/(\S+)\s*$/.exec(String(token).replace(/⟦[^⟧]*⟧/g, '').trim())?.[1] ?? '');

const kindOf = (label) => (NOT_A_PERSON.some(([re]) => re.test(label)) ? 'not-a-person?' : 'person');

/* ---- one adapter per calendar -------------------------------------------- */

const strip = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Sentence-splitting Russian calendar prose, which is nine-tenths
 * abbreviations. A full stop after one of these is not the end of an entry.
 */
const ABBREV =
  /^(?:еп|архиеп|митр|прот|прп|прпп|прмч|прмчч|прмц|прмцц|сщмч|сщмчч|мч|мчч|мц|мцц|свт|свтт|св|свв|блгв|блгвв|блж|прав|исп|игум|архим|иером|иеродиак|диак|пресвит|ап|апп|царев|кн|вмч|вмчч|вмц|вмцц|новомч|обрет|перенес|прмцц|ок|гг|в|вв|г|т|др|им)\.$/i;

async function russian() {
  const { year, month, day } = churchDate('julian', DATE);
  const url = `https://days.pravoslavie.ru/Days/${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}.html`;
  const html = await getPage(url);

  const body = /<DIV CLASS="DD_TEXT">([\s\S]*?)<\/DIV>/i.exec(html)?.[1] ?? '';
  const entries = [];
  for (const para of body.split(/<\/P>/i)) {
    // Life links are the one thing worth keeping out of the markup: an entry
    // with one has a written life behind it, an entry without has only the
    // calendar's own line and its folder must say so.
    const marked = para.replace(/<a[^>]*href="([^"]*\/Life\/[^"]*)"[^>]*>/gi, ' ⟦L:$1⟧ ');
    const text = strip(marked);
    let buf = '';
    const flush = () => {
      const label = buf.replace(/⟦L:[^⟧]*⟧/g, '').replace(/\s+/g, ' ').trim();
      const lives = [...buf.matchAll(/⟦L:([^⟧]*)⟧/g)].map((m) => m[1]);
      if (label.length > 3) entries.push({ label, lives, kind: kindOf(label) });
      buf = '';
    };
    for (const token of text.split(/(?<=\.)\s+/)) {
      buf += (buf ? ' ' : '') + token;
      if (!ABBREV.test(lastWord(token))) flush();
    }
    flush();
  }
  return { church: 'russian', url, own: `${day}/${month} ст. ст.`, entries };
}

async function greek() {
  const [, m, d] = DATE.split('-');
  const url = `https://www.saint.gr/${m}/${d}/index.aspx`;
  const html = await getPage(url);
  const seen = new Set();
  const entries = [];
  for (const a of html.matchAll(/<a[^>]*href="\/(\d+)\/saint\.aspx"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = strip(/title=\s*"([^"]+)"/i.exec(a[2])?.[1] ?? a[2]);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    entries.push({ label, lives: [`https://www.saint.gr/${a[1]}/saint.aspx`], kind: kindOf(label) });
  }
  return { church: 'greek', url, own: `${Number(d)}/${Number(m)}`, entries };
}

const RO_MONTHS = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie',
];

async function romanian() {
  const [, m, d] = DATE.split('-');
  const url = `https://doxologia.ro/${Number(d)}-${RO_MONTHS[Number(m) - 1]}`;
  const html = await getPage(url);
  /*
   * The day's saints are the masonry block, and nothing after it. Bounding on
   * heading *words* was tried first and let thirty-three entries through: the
   * page's standing sections — the day's recommended reading, the parish
   * notices, the homilies — are h2s with links exactly like a saint's, and no
   * vocabulary tells them apart. The container does.
   */
  const start = html.indexOf('masonryboxsfant');
  const ends = ['zi-parinti', 'zi-tematica', 'ev-tit'].map((c) => html.indexOf(c, start)).filter((i) => i > 0);
  const block = start === -1 ? html : html.slice(start, ends.length ? Math.min(...ends) : undefined);

  const entries = [];
  for (const h of block.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)) {
    const href = /href="([^"]+)"/i.exec(h[1])?.[1] ?? null;
    const label = strip(h[1]).replace(/^\(?✝\)?\s*/, '').trim();
    if (!label || /^(main navigation|calendarul zilei)$/i.test(label)) continue;
    entries.push({
      label,
      lives: href ? [href.startsWith('http') ? href : `https://doxologia.ro${href}`] : [],
      kind: kindOf(label),
    });
  }
  return { church: 'romanian', url, own: `${Number(d)}/${Number(m)}`, entries };
}

async function serbian() {
  const { day, month } = churchDate('julian', DATE);
  const url = `https://www.pravoslavno.rs/index.php?q=citanja&datum=${DATE}&prolog=1`;
  const html = await getPage(url);
  const text = strip(html.replace(/<script[\s\S]*?<\/script>/gi, ''));
  // The Ohrid Prologue's own numbered entries are the day's saints; the rest of
  // the page is the day's readings and a homily.
  const after = text.split(/Охридски пролог/)[1] ?? '';
  const entries = [];
  /*
   * The Prologue's entries are numbered, each opening «Св.» or «Свети…». The
   * heading runs to the first full stop that is not an abbreviation's own —
   * which is why the stop cannot be `[^.]`: «Св. Евменије еп. Гортински» has
   * two before the heading ends. Same shape as the Russian split above, with
   * the Serbian abbreviations.
   */
  const RS_ABBREV = /^(?:св|свети|свет|еп|архиеп|митр|прот|муч|свешт|прп|преп|игум|архим|јером|ђак|кн|цар|нпр|итд)\.$/i;
  const segments = after.split(/\s(?=\d{1,2}\.\s+Св)/);
  for (const segment of segments) {
    const m = /^(\d{1,2})\.\s+([\s\S]+)$/.exec(segment.trim());
    if (!m) continue;
    let buf = '';
    for (const token of m[2].split(/(?<=\.)\s+/)) {
      buf += (buf ? ' ' : '') + token;
      if (!RS_ABBREV.test(lastWord(token))) break;
    }
    const label = buf.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
    if (label.length > 6) entries.push({ label: label.slice(0, 160), lives: [], kind: kindOf(label) });
  }
  return {
    church: 'serbian',
    url,
    own: `${day}/${month} ст. ст.`,
    entries,
    note: entries.length ? null : 'pravoslavno.rs publishes about 30 days ahead and renders much of the page in script; read it by hand.',
  };
}

const ADAPTERS = { russian, greek, romanian, serbian };

/* ---- the report ---------------------------------------------------------- */

const corpus = readCorpus();
const index = feastIndex(corpus);
const bySlug = new Map(corpus.map((c) => [c.slug, c.saint]));

const wanted = ONLY ? [ONLY] : Object.keys(ADAPTERS);
const out = [];

for (const church of wanted) {
  let day;
  try {
    day = await ADAPTERS[church]();
  } catch (e) {
    console.log(`\n=== ${church} — could not read the page: ${e.message}\n`);
    continue;
  }
  const held = onCivilDay(index, church, DATE);
  const own = churchDate(calendarOf(church), DATE);
  /*
   * Two scans, and the second is the one that stops a duplicate. `held` is
   * what this church already shows on this civil date; `sameNumber` is which
   * folders *any* church keeps on this menologion day on *any* calendar — and
   * a Greek 18 September folder sits a fortnight from the Russian 18 September
   * where a civil scan cannot see it.
   */
  const sameNumber = onMenologionDay(index, own.month, own.day).filter((s) => !held.includes(s));
  out.push({ ...day, civil: DATE, held, sameNumber });

  console.log(`\n=== ${church} — civil ${DATE}, the calendar's ${day.own}`);
  console.log(`    ${day.url}`);
  console.log(`    the corpus already keeps ${held.length} folder(s) on this civil day:`);
  for (const slug of held) console.log(`      ${slug}  —  ${bySlug.get(slug)?.display_name ?? '?'}`);
  if (sameNumber.length) {
    console.log(`    and ${sameNumber.length} more on the menologion's ${own.day}/${own.month} in another calendar —`);
    console.log('    an entry matching one of these is an UPGRADE, a row on the folder that exists, never a new folder:');
    for (const slug of sameNumber) console.log(`      ${slug}  —  ${bySlug.get(slug)?.display_name ?? '?'}`);
  }
  if (day.note) console.log(`    note: ${day.note}`);
  console.log(`    the page prints ${day.entries.length} entrie(s):\n`);
  for (const e of day.entries) {
    console.log(`      [${e.kind === 'person' ? ' ' : '~'}] ${e.label}`);
    for (const l of e.lives) console.log(`            life: ${l}`);
  }
}

if (JSON_OUT) {
  fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nwritten: ${JSON_OUT}`);
}

console.log(`
Read every line against the page itself before anything becomes a folder.
[~] marks a line whose words look like a feast, an icon, a synaxis or a
translation of relics rather than a person — a hint, not a decision.
Nothing here is a source citation: the citation is what you read, quoted.
`);
