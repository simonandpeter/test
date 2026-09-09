import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { stripMarkupComments } from '../vite.config.js';

/*
 * **The reasoning in a markup template must not ship.**
 *
 * Every comment in this codebase is stripped by the minifier except one kind.
 * An HTML comment inside a template literal is *string content*, so the prose
 * explaining a piece of markup is served to every reader on every route — and
 * this codebase writes a great deal of prose. Measured on 2026-09-10: 33 such
 * comments, 23.5 kB raw and 9.8 kB gzipped inside a 100 kB bundle, a tenth of
 * the JavaScript the first paint waits for.
 *
 * It was found by `npm run test:lighthouse` going red, not by looking: three
 * routes moved from 1357 ms to 1507 ms of FCP on a 490-byte diff, which is one
 * 150 ms round trip exactly. The bundle had been sitting on a congestion-window
 * boundary for some time and the next commit was always going to cross it.
 *
 * `vite.config.js` strips them at transform time. This holds the plugin to
 * doing that and to doing nothing else, because a build-time transform that
 * silently edits source is exactly the kind of thing that should not be
 * believed without one.
 */

const root = fileURLToPath(new URL('../', import.meta.url));
const plugin = stripMarkupComments();
const call = (code, id) => plugin.transform.call({}, code, id);

test('a markup comment is taken out of a view, and nothing else is', () => {
  const before = 'const a = `<div>\n  <!-- why the div is here -->\n  <span></span>\n</div>`;';
  const after = call(before, `${root}src/views/calendar.js`);
  assert.ok(after, 'a view with a markup comment was left alone');
  assert.ok(!after.code.includes('<!--'), 'the comment survived');
  assert.ok(after.code.includes('<div>'), 'the markup did not survive');
  assert.ok(after.code.includes('<span></span>'), 'the markup did not survive');
  // A multi-line comment leaves its own newlines behind rather than joining
  // the two lines it sat between.
  assert.equal(after.code.split('\n').length, before.split('\n').length);
});

test('a Windows path reaches the same file a POSIX one does', () => {
  const code = 'const a = `<!-- x -->`;';
  assert.ok(call(code, 'C:\\Users\\x\\main\\src\\views\\map.js'), 'a backslash path was skipped');
  assert.ok(call(code, '/home/x/main/src/views/map.js'), 'a POSIX path was skipped');
});

test('nothing outside a view is touched', () => {
  const code = 'const a = `<!-- x -->`;';
  for (const id of [`${root}src/ui/strings.js`, `${root}src/lib/i18n.js`, `${root}src/main.js`]) {
    assert.equal(call(code, id), null, `${id} was transformed`);
  }
  // And a view with no markup comment in it is handed back untouched rather
  // than rewritten to an identical string, so the plugin costs nothing on the
  // files that do not need it.
  assert.equal(call('const a = 1;', `${root}src/views/saint.js`), null);
});

/*
 * And the other half: that every HTML comment in the source really is inside
 * `src/views/`, which is what makes the plugin's scope safe. A comment written
 * into a template in `src/ui/` would ship, and nothing else would notice.
 */
test('markup comments live only where the plugin looks for them', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.js')) files.push(full);
    }
  };
  walk(path.join(root, 'src'));

  const stray = files.filter(
    (file) =>
      readFileSync(file, 'utf8').includes('<!--') &&
      !file.replaceAll('\\', '/').includes('/src/views/'),
  );
  assert.deepEqual(
    stray.map((f) => path.relative(root, f)),
    [],
    'a markup comment outside src/views/ would be shipped to every reader',
  );
});
