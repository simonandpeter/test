#!/usr/bin/env node
/**
 * Discovers every folder under /saints, validates it, and regenerates
 * data/manifest.json and data/manifest.meta.json.
 *
 * The contract this enforces: adding a saint means adding one folder, and
 * nothing else is ever edited by hand. The corollary is that this script must
 * never skip a folder quietly. A saint that vanishes from the manifest because
 * of a typo is the worst failure this project has, so every problem is an
 * error, every error names its folder, and all of them are reported at once
 * rather than one run at a time.
 *
 * Warnings are different: they are for gaps in what we know (an image whose
 * licence has not been recorded), not for malformed data. Those are counted
 * into manifest.meta.json so the About page can publish them, because a
 * coverage gap that only the build sees is a coverage gap that never gets
 * filled.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { pickNameForms } from '../src/lib/saint-name.js';
import { existsSync, readFileSync } from 'node:fs';
import { imageSize } from 'image-size';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
// The 2020-12 build, not ajv's default draft-07 one: the schema uses
// dependentRequired, and draft-07 would ignore it rather than fail.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { CHURCHES_BY_ID } from '../src/data/churches.js';
import { isValidDate } from '../src/lib/jdn.js';
import { makeInterval, primaryCentury } from '../src/lib/dates.js';
import { regionOf } from '../src/lib/regions.js';
import { isPlaceholderSource, licenceIsSettled, requiresAttribution } from '../src/lib/licence.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS_DIR = path.join(ROOT, 'saints');
const DATA_DIR = path.join(ROOT, 'data');

export const SCHEMA_VERSION = 1;

/** Card thumbnails are the blurred placeholders make_thumbs.py writes. */
const thumbFor = (file) => file.replace(/\.(jpe?g|png)$/i, '') + '-thumb.jpg';

/**
 * JSON.parse rejects a byte-order mark, and Windows editors add one freely —
 * PowerShell's Set-Content does it by default. A BOM carries no information
 * here, so failing a folder over one would be pedantry rather than validation.
 */
async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, ''));
}

/** Which location a card and the map's default view should use. */
const LOCATION_PREFERENCE = ['death', 'relics', 'see', 'ministry', 'birth'];

/** Feast (month, day) pairs carry no year, so "possible at all" is the test. */
function feastDayIsPossible({ calendar, month, day }) {
  for (let y = 2024; y < 2032; y++) {
    if (isValidDate(calendar, y, month, day)) return true;
  }
  return false;
}

function formatAjvError(err) {
  const at = err.instancePath || '(root)';
  if (err.keyword === 'additionalProperties') {
    return `${at}: unknown field "${err.params.additionalProperty}"`;
  }
  if (err.keyword === 'enum') {
    return `${at}: ${err.message} (${err.params.allowedValues.join(', ')})`;
  }
  if (err.keyword === 'required') {
    return `${at}: missing required field "${err.params.missingProperty}"`;
  }
  return `${at}: ${err.message}`;
}

/**
 * Runs every check and returns what it found rather than printing or exiting,
 * so the failure modes can be asserted in tests. Reporting and the exit code
 * are the CLI's job, at the bottom of this file.
 */
export async function build({ saintsDir = SAINTS_DIR, dataDir = DATA_DIR, write = true } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (folder, msg) => errors.push({ folder, msg });
  const warn = (folder, msg) => warnings.push({ folder, msg });

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = await readJson(path.join(ROOT, 'schema/saint.schema.json'));
  const validate = ajv.compile(schema);

  if (!existsSync(saintsDir)) {
    throw new Error(`No saints directory at ${saintsDir}`);
  }

  const folders = (await readdir(saintsDir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const loaded = [];
  const seenSlugs = new Map();

  for (const folder of folders) {
    const dir = path.join(saintsDir, folder);
    const jsonPath = path.join(dir, 'saint.json');

    if (!existsSync(jsonPath)) {
      fail(folder, 'no saint.json — every saint folder must contain one');
      continue;
    }

    let saint;
    try {
      saint = await readJson(jsonPath);
    } catch (e) {
      fail(folder, `saint.json is not valid JSON: ${e.message}`);
      continue;
    }

    if (!validate(saint)) {
      for (const err of validate.errors) fail(folder, formatAjvError(err));
      continue;
    }

    if (saint.slug !== folder) {
      fail(folder, `slug "${saint.slug}" does not match the folder name — the folder name is the permanent id`);
    }

    // Case-insensitive filesystems make two folders differing only in case
    // collapse into one slug, which would silently drop a saint.
    const key = saint.slug.toLowerCase();
    if (seenSlugs.has(key)) {
      fail(folder, `duplicate slug "${saint.slug}", already used by folder "${seenSlugs.get(key)}"`);
    } else {
      seenSlugs.set(key, folder);
    }

    for (const [which, raw] of Object.entries(saint.dates ?? {})) {
      const iv = makeInterval(raw);
      if (iv.earliest !== null && iv.latest !== null && iv.latest < iv.earliest) {
        fail(folder, `dates.${which}: latest (${iv.latest}) is earlier than earliest (${iv.earliest})`);
      }
    }

    for (const att of saint.attestations) {
      const church = CHURCHES_BY_ID[att.church];
      if (!church) {
        fail(folder, `attestation names an unregistered church "${att.church}" — add it to src/data/churches.js or correct the id`);
        continue;
      }
      if (!att.feast) continue;

      if (att.feast.calendar === 'paschal') {
        if (!att.feast.computus && !church.paschal_computus) {
          fail(folder, `paschal feast for ${att.church} has no computus, and that church has no default`);
        }
      } else if (!feastDayIsPossible(att.feast)) {
        fail(folder, `feast ${att.feast.day}/${att.feast.month} does not exist in the ${att.feast.calendar} calendar`);
      }
    }

    for (const loc of saint.locations ?? []) {
      if (loc.lat === undefined) {
        warn(folder, `location "${loc.historical_name ?? loc.kind}" has no coordinates — it will not plot, and counts toward the unlocated tray`);
      }
    }

    for (const rel of [saint.text?.life, ...(saint.text?.sources ?? [])].filter(Boolean)) {
      if (!existsSync(path.join(dir, rel))) fail(folder, `text file "${rel}" is referenced but does not exist`);
    }

    for (const img of saint.images ?? []) {
      if (!existsSync(path.join(dir, img.file))) {
        fail(folder, `image "${img.file}" is referenced but does not exist`);
        continue;
      }
      if (!existsSync(path.join(dir, thumbFor(img.file)))) {
        fail(folder, `image "${img.file}" has no placeholder "${thumbFor(img.file)}" — run: npm run thumbs`);
      }
      if (!img.meta) {
        warn(folder, `image "${img.file}" has no meta file, so its credit and licence are unrecorded`);
        continue;
      }
      const metaPath = path.join(dir, img.meta);
      if (!existsSync(metaPath)) {
        fail(folder, `image meta "${img.meta}" is referenced but does not exist`);
        continue;
      }
      try {
        const meta = await readJson(metaPath);
        for (const field of ['credit', 'licence', 'source_url']) {
          if (!(field in meta)) fail(folder, `image meta "${img.meta}" is missing "${field}"`);
        }
        // "Resolved" means publishable: a specific licence, plus whatever that
        // licence obliges. What each one obliges is decided in lib/licence.js,
        // which the detail page reads too — the site must not print a claim the
        // build has not checked.
        const missing = [];
        if (!licenceIsSettled(meta.licence)) missing.push('licence variant');
        if (requiresAttribution(meta.licence) && !meta.credit) missing.push('credit');
        // The source link is provenance rather than attribution: it is how a
        // reader checks a licence claim instead of taking it on trust, so it is
        // wanted whatever the licence says. A placeholder is not an answer, and
        // saying so is the only thing keeping it from becoming one.
        if (!meta.source_url) missing.push('source_url');
        else if (isPlaceholderSource(meta.source_url)) missing.push('a real source_url in place of the placeholder');
        if (missing.length) {
          warn(folder, `image "${img.file}" needs ${missing.join(' and ')} — must be resolved before publication`);
        }
      } catch (e) {
        fail(folder, `image meta "${img.meta}" is not valid JSON: ${e.message}`);
      }
    }

    loaded.push({ folder, saint });
  }

  for (const { folder, saint } of loaded) {
    for (const rel of saint.related ?? []) {
      if (!seenSlugs.has(rel.toLowerCase())) {
        fail(folder, `related saint "${rel}" does not exist — add the folder or remove the reference`);
      }
    }
  }

  if (errors.length) return { errors, warnings, manifest: null, meta: null };

  const manifest = loaded.map(({ folder, saint }) => toCard(saint, path.join(saintsDir, folder)));
  const meta = buildMeta(manifest, warnings);
  const manifestJson = JSON.stringify(manifest);

  if (write) {
    await mkdir(dataDir, { recursive: true });
    await writeFile(path.join(dataDir, 'manifest.json'), manifestJson);
    await writeFile(path.join(dataDir, 'manifest.meta.json'), JSON.stringify(meta, null, 2));
  }

  return { errors, warnings, manifest, meta, bytes: manifestJson.length, gzipped: gzipSync(manifestJson).length };
}

/** Prints a build result and returns the process exit code. */
export function report({ errors, warnings, manifest, gzipped, bytes }, { write = true } = {}) {
  if (errors.length) {
    const byFolder = new Map();
    for (const { folder, msg } of errors) {
      if (!byFolder.has(folder)) byFolder.set(folder, []);
      byFolder.get(folder).push(msg);
    }
    console.error(`\nBuild failed: ${errors.length} problem(s) in ${byFolder.size} folder(s).\n`);
    for (const [folder, msgs] of byFolder) {
      console.error(`  saints/${folder}/`);
      for (const m of msgs) console.error(`    - ${m}`);
      console.error('');
    }
    return 1;
  }

  if (warnings.length) {
    console.warn(`\n${warnings.length} warning(s) — data gaps, not errors:\n`);
    for (const { folder, msg } of warnings) console.warn(`  saints/${folder}/ — ${msg}`);
    console.warn('');
  }

  const gz = gzipped;
  const budget = 400 * 1024;
  const perSaint = gz / Math.max(manifest.length, 1);
  console.log(`${write ? 'Built' : 'Validated'} ${manifest.length} saints.`);
  console.log(`manifest.json  ${(bytes / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzipped`);
  // The brief's ceiling is ~400 KB gzipped at 5,000 saints, and sharding is
  // explicitly not to be built before it is needed. Projecting the current
  // per-saint cost is how we find out when that stops being true.
  const projected = (perSaint * 5000) / 1024;
  console.log(`projected at 5,000 saints: ${projected.toFixed(0)} KB gzipped (budget ${budget / 1024} KB)`);
  if (manifest.length < 200) {
    // gzip's window barely fills at this size, so the per-saint cost is far
    // higher than it will be once field names and church ids repeat thousands
    // of times. Treat the projection as an upper bound until the corpus grows.
    console.log('  (projection is pessimistic below ~200 saints — gzip has little to work with yet)');
  } else if (projected > budget / 1024) {
    console.log('  over budget: consider sharding by century, per the brief.');
  }
  return 0;
}

/**
 * Card-level fields only. The detail payload — life text, sources, place
 * names, alternative name forms — stays in the saint's folder and is fetched
 * on open.
 *
 * Locations are the one deliberate widening of the brief's "primary location":
 * the map lets the reader choose which kind of place to plot, and it plots from
 * the manifest alone, so all of them have to be here. Place names are not —
 * map labels use the saint's name, and the names are detail-level.
 *
 * Titles travel with venerated attestations because the calendar page shows
 * each tradition's own style for a saint on its feast day, and the calendar
 * must render from the manifest alone. They are short; watch the size
 * projection if that stops being true.
 */
function toCard(saint, dir) {
  const locations = (saint.locations ?? [])
    .filter((l) => typeof l.lat === 'number')
    .map((l) => ({
      kind: l.kind,
      lat: l.lat,
      lon: l.lon,
      uncertainty_km: l.uncertainty_km,
      region: regionOf(l.lat, l.lon),
    }));

  let primary = null;
  for (const kind of LOCATION_PREFERENCE) {
    const i = locations.findIndex((l) => l.kind === kind);
    if (i !== -1) {
      primary = i;
      break;
    }
  }

  const base = `saints/${saint.slug}/`;
  // Pixel dimensions ride in the manifest so cards can reserve the box with
  // aspect-ratio before a byte of image arrives (Addendum C1) — the
  // no-layout-shift rule satisfied at the source. image-size reads headers
  // only; it is the sanctioned exception to the parser-plus-ajv dependency
  // rule, and a full image pipeline remains out of bounds.
  let image = null;
  const file = saint.images?.[0]?.file;
  if (file) {
    const { width, height } = imageSize(readFileSync(path.join(dir, file)));
    image = {
      src: base + file,
      lqip: base + thumbFor(file),
      w: width,
      h: height,
      aspect: Math.round((width / height) * 10000) / 10000,
    };
  }

  return {
    slug: saint.slug,
    display_name: saint.display_name,
    /*
     * One display form per language, chosen from the folder's recorded
     * `names` (author, 2026-08-26: the saints' names in the chosen language).
     * The array itself stays detail-level — it holds every recorded form,
     * with its notes and its scripts — and this is the card-level pick, made
     * here so the runtime is a lookup and the choosing has a unit test.
     * Languages with no usable form are absent rather than English, so a
     * caller can tell "not recorded" from "the same in both".
     */
    names: pickNameForms(saint.names, saint.display_name),
    // What they held, printed on the subtext line beside the dates. Absent
    // rather than empty where there is none, so a card can tell "no office
    // recorded" from a blank one; 340 of 742 carry one.
    ...(saint.office ? { office: saint.office } : {}),
    // A folder is a saint unless it says otherwise, and only a feast does.
    // Carried so `lib/honorific.js` can keep a rank off it without fetching
    // the detail payload; nothing in the corpus sets it yet.
    ...(saint.kind && saint.kind !== 'saint' ? { kind: saint.kind } : {}),
    sex: saint.sex ?? 'unknown',
    types: saint.types ?? [],
    historicity: saint.historicity ?? null,
    dates: {
      birth: makeInterval(saint.dates?.birth),
      death: makeInterval(saint.dates?.death),
      floruit: makeInterval(saint.dates?.floruit),
    },
    // Which churches have hymns recorded for the figure (author, 2026-08-22):
    // the texts stay in the folder and arrive with the detail payload; the
    // calendar needs only to know they exist, to prefer as the day's hero the
    // saint the chosen church sings for that day.
    hymned: [...new Set((saint.hymns ?? []).map((h) => h.church))],
    // Only positive findings travel in the manifest. A church absent from this
    // list is undocumented, which is exactly what an explicit "undocumented"
    // entry means, so dropping them loses nothing a reader could see — the
    // badge renders both as the same small centred mark. The distinction
    // between "recorded as undocumented" and "never mentioned" is a
    // data-quality signal, and it survives in manifest.meta.json where the
    // About page can publish it.
    attestations: saint.attestations
      .filter((a) => a.status !== 'undocumented')
      .map((a) => ({
        church: a.church,
        status: a.status,
        ...(a.feast ? { feast: a.feast } : {}),
        ...(a.titles?.length ? { titles: a.titles } : {}),
      })),
    locations,
    primary_location: primary,
    image,
  };
}

/**
 * Coverage statistics, rendered by the About page. Counting refusals and
 * undocumented cells separately is the point: a church with 400 attestations
 * and one with 12 attestations and 388 unchecked traditions look identical in
 * a plain total, and that difference is exactly what this project claims to
 * show.
 */
function buildMeta(manifest, warnings) {
  const byChurch = {};
  for (const id of Object.keys(CHURCHES_BY_ID)) {
    byChurch[id] = { venerated: 0, 'not-venerated': 0, undocumented: 0, unattested: 0 };
  }
  const byCentury = {};
  const byHistoricity = {};
  const byRegion = {};
  let unlocated = 0;

  for (const card of manifest) {
    const named = new Set();
    for (const a of card.attestations) {
      if (byChurch[a.church]) byChurch[a.church][a.status]++;
      named.add(a.church);
    }
    // A church a saint's file never mentions is not the same as one it records
    // as undocumented: the first is a gap in our sourcing, the second is a
    // finding that we looked. Both are counted, separately.
    for (const id of Object.keys(byChurch)) {
      if (!named.has(id)) byChurch[id].unattested++;
    }

    const century = primaryCentury(card.dates);
    const centuryKey = century === null ? 'undated' : String(century);
    byCentury[centuryKey] = (byCentury[centuryKey] ?? 0) + 1;

    const h = card.historicity ?? 'unrecorded';
    byHistoricity[h] = (byHistoricity[h] ?? 0) + 1;

    if (card.locations.length === 0) {
      unlocated++;
    } else {
      for (const r of new Set(card.locations.map((l) => l.region))) {
        const key = r ?? 'unclassified';
        byRegion[key] = (byRegion[key] ?? 0) + 1;
      }
    }
  }

  return {
    schema_version: SCHEMA_VERSION,
    built_at: new Date().toISOString(),
    total: manifest.length,
    unlocated,
    by_church: byChurch,
    by_century: byCentury,
    by_historicity: byHistoricity,
    by_region: byRegion,
    warnings: warnings.map(({ folder, msg }) => ({ slug: folder, message: msg })),
  };
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  build()
    .then((result) => process.exit(report(result)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
