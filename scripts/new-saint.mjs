#!/usr/bin/env node
/**
 * Scaffolds a saint folder: node scripts/new-saint.mjs "Agnes of Rome"
 *
 * The template validates as written, so the build passes immediately and the
 * new folder appears in the manifest straight away. Every attestation starts as
 * "undocumented", which is the honest starting state — we have not yet sourced
 * any tradition either way — and is also the state that costs nothing to leave
 * in place if a tradition is never checked.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enabledChurches } from '../src/data/churches.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const displayName = process.argv.slice(2).join(' ').trim();
  if (!displayName) {
    console.error('Usage: node scripts/new-saint.mjs "Display Name"');
    process.exit(1);
  }

  const slug = slugify(displayName);
  if (!slug) {
    console.error(`"${displayName}" does not reduce to a usable slug.`);
    process.exit(1);
  }

  const dir = path.join(ROOT, 'saints', slug);
  if (existsSync(dir)) {
    console.error(`saints/${slug}/ already exists.`);
    process.exit(1);
  }

  const saint = {
    slug,
    display_name: displayName,
    sex: 'unknown',
    types: [],
    dates: {
      birth: { earliest: null, latest: null, display: null, basis: 'unknown' },
      death: { earliest: null, latest: null, display: null, basis: 'unknown' },
    },
    attestations: enabledChurches().map((c) => ({ church: c.id, status: 'undocumented' })),
    locations: [],
    historicity: 'traditional',
    text: { life: 'life.md' },
  };

  await mkdir(path.join(dir, 'sources'), { recursive: true });
  await mkdir(path.join(dir, 'images'), { recursive: true });
  await writeFile(path.join(dir, 'saint.json'), JSON.stringify(saint, null, 2) + '\n');
  await writeFile(path.join(dir, 'life.md'), `# ${displayName}\n\n`);

  console.log(`Created saints/${slug}/\n`);
  console.log('Next:');
  console.log('  1. Write life.md.');
  console.log('  2. For each tradition you can source, change "undocumented" to');
  console.log('     "venerated" or "not-venerated" and add the feast and source.');
  console.log('     Leave the rest undocumented — that is a finding, not a gap to fill in.');
  console.log('  3. Add images/icon.jpg with an icon.meta.json, then: npm run thumbs');
  console.log('  4. npm run validate');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
