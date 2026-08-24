import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { withHonorific } from '../src/lib/honorific.js';

/**
 * The honorific in front of a name (author, 2026-08-24). It is applied when a
 * name is drawn and never written into the data, so these assertions are about
 * the function alone — and about the one case the corpus makes real, the
 * companies of martyrs that announce themselves with an article.
 */

test('a saint is read with St before the name', () => {
  assert.equal(withHonorific('John Chrysostom'), 'St John Chrysostom');
  assert.equal(withHonorific('Anthony the Great'), 'St Anthony the Great');
});

test('a collective keeps its article and takes no honorific', () => {
  // "St The Fifty Martyrs of Palestine" is not English. There are 26 of these.
  assert.equal(withHonorific('The Fifty Martyrs of Palestine'), 'The Fifty Martyrs of Palestine');
  assert.equal(withHonorific('The 3,628 Martyrs of Nicomedia'), 'The 3,628 Martyrs of Nicomedia');
});

test('the honorific is never doubled', () => {
  assert.equal(withHonorific('St Nektarios of Aegina'), 'St Nektarios of Aegina');
  assert.equal(withHonorific('Saint Sozon'), 'Saint Sozon');
});

test('an empty name stays empty rather than becoming a bare honorific', () => {
  assert.equal(withHonorific(''), '');
  assert.equal(withHonorific(undefined), '');
});

test('every name in the corpus takes the honorific or is a company', () => {
  // The rank — martyr, hieromartyr, presbyter — is a category in `types` and
  // is printed on the saint page's facts line, so nothing here reads it.
  const slugs = readdirSync('saints');
  let honoured = 0;
  let collective = 0;
  for (const slug of slugs) {
    const { display_name: name } = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
    const out = withHonorific(name);
    if (out === name) {
      assert.match(name, /^The\s/, `${slug}: a name left unhonoured must be a company`);
      collective++;
    } else {
      assert.equal(out, `St ${name}`);
      honoured++;
    }
  }
  assert.equal(honoured + collective, slugs.length);
  assert.ok(collective > 0 && collective < 40, 'the companies are a small minority of the corpus');
});
