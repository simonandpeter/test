import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/*
 * `fileURLToPath`, not `url.pathname`: this repo lives under a path with a
 * space in it, so the URL carries `Agios%20Website` and every `existsSync`
 * against it is false. Written as `pathname` first, this test passed over
 * ZERO folders while ten of them held a duplicate key.
 */
const SAINTS = fileURLToPath(new URL('../saints/', import.meta.url));

/**
 * A duplicate key is the one corpus defect nothing else can see.
 *
 * `JSON.parse` keeps the LAST of two keys of the same name and says nothing, so
 * a folder carrying two `dates` blocks builds, validates, renders and passes
 * every other test in this suite while one reader's whole dated reading is
 * invisible. Ten folders held exactly that until 14 October 2026, and three of
 * them were dropping a field of a different kind — a death century behind a
 * floruit — which `formatLifespan` would have printed had both been in one
 * object.
 *
 * So this reads the bytes rather than the parse. A `JSON.parse` here would be
 * the bug testing itself.
 */
const duplicateKeys = (text) => {
  const dup = [];
  const seen = [new Set()];
  let i = 0;
  let inString = false;
  let escaped = false;
  let pendingKey = null;
  let buf = '';
  for (; i < text.length; i += 1) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') {
        inString = false;
        pendingKey = buf;
      } else buf += c;
      continue;
    }
    if (c === '"') {
      inString = true;
      buf = '';
      pendingKey = null;
    } else if (c === ':' && pendingKey !== null) {
      const scope = seen[seen.length - 1];
      if (scope.has(pendingKey)) dup.push(pendingKey);
      scope.add(pendingKey);
      pendingKey = null;
    } else if (c === '{' || c === '[') {
      seen.push(new Set());
      pendingKey = null;
    } else if (c === '}' || c === ']') {
      seen.pop();
      pendingKey = null;
    } else if (c === ',') {
      pendingKey = null;
    }
  }
  return dup;
};

test('the key counter sees a duplicate and is not fooled by strings', () => {
  assert.deepEqual(duplicateKeys('{"a": 1, "a": 2}'), ['a']);
  assert.deepEqual(duplicateKeys('{"a": 1, "b": {"a": 2}}'), []);
  assert.deepEqual(duplicateKeys('{"a": "b\\": 1, \\"b"}'), []);
  assert.deepEqual(duplicateKeys('{"x": [{"a": 1}, {"a": 2}]}'), []);
  assert.deepEqual(duplicateKeys('{"n": {"d": 1, "d": 2}}'), ['d']);
});

test('no saint.json carries the same key twice, at any depth', () => {
  const bad = [];
  for (const dir of readdirSync(SAINTS)) {
    const file = path.join(SAINTS, dir, 'saint.json');
    if (!existsSync(file)) continue;
    const dup = duplicateKeys(readFileSync(file, 'utf8'));
    if (dup.length) bad.push(`${dir}: ${[...new Set(dup)].join(', ')}`);
  }
  assert.deepEqual(
    bad,
    [],
    'a duplicate key is dropped by JSON.parse without a word, so the reading in it ' +
      `is lost and nothing else in this suite can tell:\n  ${bad.join('\n  ')}`,
  );
});
