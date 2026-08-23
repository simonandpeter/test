/**
 * Every saint has a life, and every life says where it comes from
 * (author, 2026-08-23, Amendment 30).
 *
 * The corpus grew from eight lives to a hundred and forty-nine in one sitting,
 * each written after the synaxarion of a church that keeps the saint — or the
 * nearest equivalent that could be read — and each closing with the source it
 * was read from. These checks are what "from the synaxarion" means here: the
 * file exists and is referenced, it opens with the saint's own name, it has
 * something to say, and its last line names and links the source. The eight
 * lives that predate the rule are listed by name; they were written from
 * primary sources before the source line existed and are not rewritten here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAINTS = path.join(ROOT, 'saints');

// Lives written before 2026-08-23, from primary sources, without a closing
// source line. Anything not on this list must carry one.
const BEFORE_THE_RULE = new Set([
  'anthony-the-great',
  'athanasius-of-alexandria',
  'augustine-of-hippo',
  'christopher',
  'john-chrysostom',
  'john-the-long-suffering',
  'moses-the-hungarian',
  'paul-of-thebes',
]);

async function corpus() {
  const out = [];
  for (const slug of await readdir(SAINTS)) {
    const dir = path.join(SAINTS, slug);
    if (!(await stat(dir)).isDirectory()) continue;
    const saint = JSON.parse(await readFile(path.join(dir, 'saint.json'), 'utf8'));
    out.push({ slug, dir, saint });
  }
  return out;
}

test('every saint references a life, and the file is there', async () => {
  const saints = await corpus();
  assert.ok(saints.length >= 149, `expected the full corpus, found ${saints.length}`);
  for (const { slug, dir, saint } of saints) {
    assert.equal(saint.text?.life, 'life.md', `${slug}: saint.json does not reference life.md`);
    await stat(path.join(dir, 'life.md'));
  }
});

test('a life opens with the saint’s own name and has something to say', async () => {
  for (const { slug, dir, saint } of await corpus()) {
    const md = await readFile(path.join(dir, 'life.md'), 'utf8');
    const [heading, ...rest] = md.trim().split('\n');
    assert.equal(heading, `# ${saint.display_name}`, `${slug}: heading does not match display_name`);
    const body = rest.join('\n').trim();
    const words = body.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 30, `${slug}: the life has only ${words} words`);
  }
});

test('a life written from a synaxarion closes by naming and linking its source', async () => {
  for (const { slug, dir } of await corpus()) {
    if (BEFORE_THE_RULE.has(slug)) continue;
    const md = (await readFile(path.join(dir, 'life.md'), 'utf8')).trim();
    const last = md.split(/\n\s*\n/).pop().trim();
    assert.match(last, /^\*After .+\*$/s, `${slug}: the last paragraph is not an italic source line`);
    assert.match(last, /\]\(https?:\/\/[^)\s]+\)/, `${slug}: the source line has no link`);
    assert.match(last, /read 23 August 2026/, `${slug}: the source line does not say when it was read`);
  }
});
