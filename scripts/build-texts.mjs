#!/usr/bin/env node
/**
 * Discovers every saint folder's own `text.sources` and writes `data/texts.json` —
 * a small, standalone index, never folded into `manifest.json` (`build-manifest.mjs`).
 * A source text's own words are detail-level content, fetched by the reader only
 * when they open one (`saint.js`'s own `sources()`/`wireSources()` already does this
 * per saint); the Texts page needs to know *which* saints have one at all, which the
 * manifest deliberately does not carry, so this is the one further fact worth its
 * own file rather than growing the manifest for every saint that has no source.
 *
 * Run after `build-manifest.mjs` (which is what validates that every referenced
 * source file actually exists on disk) — this script trusts that check rather
 * than repeating it, and reads only what `build-manifest.mjs` already reads:
 * one `saint.json` per folder, nothing from the corpus twice.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS_DIR = path.join(ROOT, 'saints');
const DATA_DIR = path.join(ROOT, 'data');

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, ''));
}

/** The same title a reader sees under `Sources` on the saint's own page
 *  (`humanise`, `views/saint.js`) — one place would be better, but that
 *  function lives in a browser module this script does not otherwise need. */
const titleOf = (file) => {
  const base = file.replace(/^.*\//, '').replace(/\.md$/i, '').replace(/-/g, ' ');
  return base.charAt(0).toUpperCase() + base.slice(1);
};

async function build() {
  if (!existsSync(SAINTS_DIR)) throw new Error(`No saints directory at ${SAINTS_DIR}`);

  const folders = (await readdir(SAINTS_DIR, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const texts = [];
  for (const folder of folders) {
    const jsonPath = path.join(SAINTS_DIR, folder, 'saint.json');
    if (!existsSync(jsonPath)) continue;
    const saint = await readJson(jsonPath);
    for (const file of saint.text?.sources ?? []) {
      texts.push({ slug: folder, display_name: saint.display_name, title: titleOf(file), file });
    }
  }
  texts.sort((a, b) => a.title.localeCompare(b.title));

  await mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(texts);
  await writeFile(path.join(DATA_DIR, 'texts.json'), json);
  console.log(`Built texts.json: ${texts.length} source text(s), ${(json.length / 1024).toFixed(1)} KB.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { build };
