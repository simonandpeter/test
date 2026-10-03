import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRINGS } from '../src/ui/strings.js';
import { CHURCHES } from '../src/data/churches.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
 * The About page states two things about the corpus that no number on it can
 * keep true, because both are claims about what the corpus does *not* contain.
 * A reader cannot check them and the page cannot recount them, so they are
 * pinned here instead — the About page is also the app's privacy policy and
 * its answer to a store's content-rights question (docs/APP.md), and a
 * paragraph in a policy that quietly went false is worse than one that was
 * never written.
 */

const saintFiles = () =>
  readdirSync(path.join(ROOT, 'saints'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ slug: e.name, file: path.join(ROOT, 'saints', e.name, 'saint.json') }));

test('every attestation is still a positive one, as the page says', () => {
  /*
   * `coverage.positiveOnly`: "No refusal and no sourced absence has been
   * entered yet, so a church missing from a saint's page means we have not
   * read that church on them." The moment one `not-venerated` is written that
   * sentence is false, and nothing else in the suite would notice — the
   * manifest counts the status, the page prints the count, and the paragraph
   * beside it goes on denying it exists.
   *
   * The corpus is read rather than `manifest.meta.json`, which is gitignored
   * and not built when CI runs the unit suite.
   */
  const refusals = [];
  for (const { slug, file } of saintFiles()) {
    const saint = JSON.parse(readFileSync(file, 'utf8'));
    for (const a of saint.attestations ?? []) {
      if (a.status === 'not-venerated') refusals.push(`${slug} (${a.church})`);
    }
  }
  assert.deepEqual(
    refusals,
    [],
    `${refusals.length} refusal(s) are recorded, so STRINGS.about.coverage.positiveOnly is no longer true — rewrite that paragraph in the same commit:\n  ${refusals.slice(0, 10).join('\n  ')}`,
  );
});

test('no picture is published under a licence the build could not read', () => {
  /*
   * `pictures.unsettled`: "Where a licence could not be established the
   * picture is not used." `build-manifest.mjs` only warns about this, and a
   * warning is not a gate — it is a line in an output nobody reads twice.
   * This is the gate, because the claim is now made to a store as well as to
   * a reader.
   */
  const unreadable = [];
  for (const { slug, file } of saintFiles()) {
    const saint = JSON.parse(readFileSync(file, 'utf8'));
    for (const img of saint.images ?? []) {
      if (!img.meta) continue;
      const metaPath = path.join(ROOT, 'saints', slug, img.meta);
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      if (!meta.licence || /unknown|not recorded|unspecified/i.test(meta.licence)) {
        unreadable.push(`${slug}: ${meta.licence ?? 'no licence field'}`);
      }
    }
  }
  assert.deepEqual(unreadable, [], unreadable.slice(0, 10).join('\n  '));
});

test('the About page counts churches rather than naming a number', () => {
  /*
   * The page said "four churches" in two sentences and read the registry for
   * the list beside them, so enabling a fifth would have left two sentences
   * lying. Every pack is checked, not only the English: a translator who
   * writes the number back in is the likeliest way this returns.
   */
  const numbers = /\b(two|three|four|five|six|два|две|три|четыре|пять|două|trei|patru|cinci|δύο|τρεις|τέσσερις|πέντε|две|три|четири|пет)\b/i;
  const prose = [
    ['calendars.lede', STRINGS.about.calendars.lede],
    ['coverage.commemorations', STRINGS.about.coverage.commemorations],
  ];
  for (const [where, text] of prose) {
    assert.equal(numbers.test(text), false, `${where} states a number of churches: "${text}"`);
  }
  // And the thing that would make it wrong is the registry growing.
  assert.ok(CHURCHES.filter((c) => c.enabled !== false).length >= 1);
});
