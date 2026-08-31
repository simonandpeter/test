/**
 * What the corpus does and does not know about when each saint lived.
 *
 * Author, 2026-09-01: "run an audit of all the dates (e.g. Moses the
 * Hungarian had birth 'before 1000'. That's not good enough. Needs to be
 * something more like late 10th C or 960-980. Can't give a span of 1000
 * years). Run this against all saints who are missing a death or birth date,
 * or have one that is low resolution."
 *
 * **It reports rather than gates**, and the difference is deliberate. A
 * missing birth year is the ordinary condition of a fourth-century martyr and
 * always will be; making the build refuse one would either stop the corpus
 * growing or push authors into inventing years, which is the failure this
 * project exists to avoid. What an audit can honestly do is say which
 * findings are *weaker than the sources allow* — an interval open at one end,
 * a span wider than the evidence it cites, a date called `attested` that is
 * really a guess — so the editorial work can be aimed rather than sprayed.
 *
 *   node scripts/date-audit.mjs            summary
 *   node scripts/date-audit.mjs --list open        the slugs in one finding
 *   node scripts/date-audit.mjs --list wide --limit 40
 *
 * Findings, worst first:
 *   `open`     one bound is null. The interval reaches to infinity, which
 *              `lifeBounds` has to paper over on the map and no reader can
 *              be shown. Always fixable: whatever bounds the *other* end
 *              bounds this one too, through a lifespan.
 *   `wide`     both bounds present, more than `WIDE` years apart. Some are
 *              honest — "3rd or 4th century" is a real state of knowledge —
 *              so this is a list to read, not a list to fix.
 *   `loose-basis`  an interval calling itself `attested` while spanning more
 *              than a century. One of the two is wrong.
 *   `undated`  no birth, death or floruit at all: nothing places them in
 *              time, and the Index and the map both have to set them aside.
 *   `no-death` a birth or floruit but no death. Rarer and stranger than the
 *              reverse, and usually means the death year was never copied
 *              across rather than that it is unknown.
 *   `no-birth` a death or floruit but no birth. The commonest state in the
 *              corpus by a long way and mostly irreducible.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Wider than this and the interval is not really a date. A century is the
 *  coarsest thing a source ever *states*; past that it is two guesses. */
const WIDE = 150;

const SAINTS = path.join(process.cwd(), 'saints');

const interval = (raw) => ({
  earliest: raw?.earliest ?? null,
  latest: raw?.latest ?? null,
  display: raw?.display ?? null,
  basis: raw?.basis ?? 'unknown',
});
const isUndated = (iv) => iv.earliest === null && iv.latest === null;
const isOpen = (iv) => !isUndated(iv) && (iv.earliest === null || iv.latest === null);
const width = (iv) => (iv.earliest === null || iv.latest === null ? null : iv.latest - iv.earliest);

function audit() {
  const findings = { open: [], wide: [], 'loose-basis': [], undated: [], 'no-death': [], 'no-birth': [] };
  let total = 0;

  for (const slug of readdirSync(SAINTS, { withFileTypes: true }).filter((e) => e.isDirectory())) {
    const file = path.join(SAINTS, slug.name, 'saint.json');
    let saint;
    try {
      saint = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    total += 1;
    const dates = saint.dates ?? {};
    const kinds = { birth: interval(dates.birth), death: interval(dates.death), floruit: interval(dates.floruit) };
    const has = (k) => !isUndated(kinds[k]);

    for (const [kind, iv] of Object.entries(kinds)) {
      if (isUndated(iv)) continue;
      const note = `${saint.slug} ${kind} ${iv.display ?? '(no display)'}`;
      if (isOpen(iv)) findings.open.push(note);
      else if (width(iv) > WIDE) findings.wide.push(`${note} [${width(iv)} years]`);
      if (iv.basis === 'attested' && (width(iv) === null || width(iv) > 100)) {
        findings['loose-basis'].push(`${note} [attested, ${width(iv) ?? 'open'}]`);
      }
    }

    if (!has('birth') && !has('death') && !has('floruit')) findings.undated.push(saint.slug);
    else {
      if (!has('death') && !has('floruit')) findings['no-death'].push(saint.slug);
      if (!has('birth') && !has('floruit')) findings['no-birth'].push(saint.slug);
    }
  }
  return { total, findings };
}

const args = process.argv.slice(2);
const only = args.includes('--list') ? args[args.indexOf('--list') + 1] : null;
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 25;

const { total, findings } = audit();

if (only) {
  const rows = findings[only];
  if (!rows) {
    console.error(`no finding called "${only}" — try ${Object.keys(findings).join(', ')}`);
    process.exit(1);
  }
  for (const row of rows.slice(0, limit)) console.log(row);
  if (rows.length > limit) console.log(`… and ${rows.length - limit} more`);
} else {
  console.log(`${total} saints\n`);
  const pct = (n) => `${((n / total) * 100).toFixed(1)}%`;
  for (const [name, rows] of Object.entries(findings)) {
    console.log(`${name.padEnd(12)} ${String(rows.length).padStart(4)}  ${pct(rows.length)}`);
  }
  console.log(`\nWIDE is ${WIDE} years. --list <finding> for the slugs.`);
}
