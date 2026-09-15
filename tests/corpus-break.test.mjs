import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('no saint slug appears in src/ outside a comment', () => {
  /*
   * STRUCTURE.md's first claim about the corpus — "the break is clean" — and until
   * now nothing checked it. It is the one quantity-free invariant in that
   * section, which is what makes it worth pinning where the counts beside it
   * are only dated: adding a saint cannot break this, while a test holding
   * "862 saints" would go red on the next one.
   *
   * What it catches is a real and easy mistake: reaching for a slug in the app
   * to special-case one saint. The e2e specs already name 85 of them and that
   * is why adding saints goes red there; `src/` has stayed clean and should.
   */
  const slugs = readdirSync(path.join(ROOT, 'saints'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    // A slug with no hyphen is a single word that could plausibly be a
    // variable; requiring one keeps this from firing on ordinary code.
    .map((e) => e.name)
    .filter((n) => n.includes('-') && n.length >= 8);

  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'terrain-tiles') continue;
        walk(full);
      } else if (/\.(js|css)$/.test(entry.name)) {
        const src = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
          .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
        for (const slug of slugs) {
          const at = src.indexOf(slug);
          if (at !== -1) {
            found.push(
              `${path.relative(ROOT, full).replace(/\\/g, '/')}:` +
                `${src.slice(0, at).split('\n').length} ${slug}`,
            );
          }
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  assert.deepEqual(found, [], `a saint is named in the app:\n  ${found.join('\n  ')}`);
});
