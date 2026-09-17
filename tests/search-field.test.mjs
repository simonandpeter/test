import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * **The search field is one component, and this is what stops it becoming two
 * again.**
 *
 * It was two: All Saints drew `input.search-field` at 35 px on `--gesso` with
 * 4/8 padding, Prayer drew its own `input.hy-q` at 46 px on `--field` with
 * 12/16, and nothing connected them (author, 2026-09-17: "the search bar should
 * be the exact same as the All Saints page, not any different. SSOT, repeating
 * designed elements"). `styles/search-field.css` holds the drawing now and both
 * per-route sheets import it.
 *
 * Three claims, and each of them fails if the fix is backed out:
 *
 * 1. Both sheets import the component. Drop the import from either and that
 *    route's field is undressed.
 * 2. Neither sheet declares anything the component declares. Re-add a padding
 *    or a background to either page's own copy of the selector and the two can
 *    drift again — which is the failure this whole stage is about, so it is
 *    asserted rather than trusted to review.
 * 3. No selector in either sheet matches the field by `[type='search']`. That
 *    is the shape that outweighs a bare class whichever sheet loads second, and
 *    it is how `saint.css`'s override came to be dead code and why the map's
 *    field had to name its own element.
 *
 * The component's own sheet is checked in the other direction too: it must
 * actually declare the dress, or claim 2 would pass on an empty file.
 */

const read = (file) =>
  readFileSync(new URL(`../src/styles/${file}`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Innermost blocks only — `([^{}]*)\{([^{}]*)\}` cannot match a rule that
 * contains another, so a `@media` prelude is never read as a selector and its
 * children are read one by one. Keyframe steps are filtered the way
 * `sheet-order.test.mjs` filters them.
 */
const rules = (css) =>
  [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
    .map(([, head, body]) => ({
      selector: head.trim().replace(/\s+/g, ' ').replace(/^.*[{};]\s*/s, ''),
      props: [...body.matchAll(/(^|;)\s*([a-z-]+)\s*:/g)].map((m) => m[2]),
    }))
    .filter((r) => r.selector && !/^(from|to|[\d.]+%)$/.test(r.selector));

/** Everything the component is required to own. */
const DRESS = [
  'min-width',
  'font',
  'font-family',
  'font-size',
  'color',
  'background',
  'border',
  'border-radius',
  'padding',
];

const SHEETS = ['index.css', 'prayer.css'];

test('both per-route sheets import the one search-field component', () => {
  for (const sheet of SHEETS) {
    assert.match(
      read(sheet),
      /@import\s+'\.\/search-field\.css';/,
      `${sheet} no longer imports the shared field, so one of the two pages is drawing its own`,
    );
  }
});

test('the component sheet declares the whole of the field', () => {
  const own = rules(read('search-field.css'));
  const base = own.find((r) => r.selector === '.search-field');
  assert.ok(base, 'search-field.css has no bare .search-field rule');
  for (const prop of DRESS) {
    assert.ok(base.props.includes(prop), `search-field.css does not set ${prop} on the field`);
  }
  assert.ok(
    own.some((r) => r.selector === '.search-field:hover' && r.props.includes('border-color')),
    'the hover border is not in the component',
  );
  /*
   * The one place the component draws two ways, and it is deliberate: Prayer's
   * field below 1024 px is the field it shipped with, because the author's
   * ruling is about the desk and mobile does not move in this pass. Asserted
   * here so that it stays *inside* the component — moved back into
   * `prayer.css` it would be drift again, and claim 2 below would not see it.
   */
  const phone = own.find(
    (r) => r.selector === "html[data-route~='prayer'] .search-field" && r.props.includes('padding'),
  );
  assert.ok(phone, "the phone's exception for Prayer is not in the component sheet");
});

test('neither page declares the field itself, so the two cannot drift', () => {
  for (const sheet of SHEETS) {
    for (const rule of rules(read(sheet))) {
      if (!/\.search-field|\.hy-q/.test(rule.selector)) continue;
      const own = rule.props.filter((p) => DRESS.includes(p) || p === 'border-color');
      assert.deepEqual(
        own,
        [],
        `${sheet} dresses the shared field itself (${rule.selector}: ${own.join(', ')}) — that is how it came apart`,
      );
    }
  }
});

test('no sheet reaches the field through [type=search], which outranks its class', () => {
  for (const sheet of [...SHEETS, 'saint.css', 'search-field.css']) {
    for (const rule of rules(read(sheet))) {
      assert.ok(
        !/\[type=['"]?search/.test(rule.selector),
        `${sheet} has ${rule.selector}, which wins over .search-field on specificity whichever sheet loads second`,
      );
    }
  }
});
