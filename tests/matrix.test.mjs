import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import {
  riteColumns,
  matrixRows,
  matrixCells,
  decomposesToBadge,
  renderMatrix,
} from '../src/ui/matrix.js';
import { rollup, badgeLabel } from '../src/ui/badge.js';
import { CHURCHES, CHURCHES_BY_ID, enabledChurches } from '../src/data/churches.js';

/**
 * The matrix's acceptance criteria. The load-bearing one is decomposition: the
 * badge and the matrix appear on different pages for the same saint, and if
 * they ever disagreed a reader would have no way to tell which was lying.
 */

const anthony = [
  { church: 'roman-catholic', status: 'venerated' },
  { church: 'eastern-orthodox', status: 'venerated' },
  { church: 'coptic', status: 'venerated' },
];

const nestorius = [
  { church: 'assyrian-church-of-the-east', status: 'venerated' },
  { church: 'roman-catholic', status: 'not-venerated' },
  { church: 'eastern-catholic', status: 'not-venerated' },
  { church: 'eastern-orthodox', status: 'not-venerated' },
  { church: 'coptic', status: 'not-venerated' },
  { church: 'armenian', status: 'not-venerated' },
  { church: 'ethiopian-eritrean', status: 'not-venerated' },
  { church: 'syriac-malankara', status: 'not-venerated' },
];

test('the axes come from the registry: seven rite columns, thirteen occupied cells', () => {
  assert.equal(riteColumns().length, 7);
  assert.equal(matrixRows([]).length, 4);
  // 13 is the spec's count and it is not a constant anywhere — it falls out of
  // Catholic holding all seven rites (one Latin, six Eastern Catholic), Eastern
  // Orthodox one, Oriental Orthodox four and the Church of the East one.
  assert.equal(matrixCells([]).length, 13);
  const catholic = matrixRows([]).find((r) => r.communion.id === 'catholic');
  assert.equal(catholic.cells.length, 7);
});

test('a position with no church in it is not drawn at all', () => {
  const eo = matrixRows([]).find((r) => r.communion.id === 'eastern-orthodox');
  // One cell, not seven with six blanks: there is no Ge'ez-rite Eastern
  // Orthodox church, and a mark there would invent one.
  assert.deepEqual(eo.cells.map((c) => c.rite.id), ['byzantine']);
  assert.equal((renderMatrix([]).match(/<circle/g) ?? []).length, 13);
});

test('disabling a communion drops its row but keeps a column another church holds', () => {
  const assyrian = CHURCHES_BY_ID['assyrian-church-of-the-east'];
  try {
    assyrian.enabled = false;
    assert.equal(matrixRows([]).length, 3);
    // East Syriac survives as a column because Eastern Catholic still holds it
    // — the axes are derived per render, not fixed at seven.
    assert.ok(riteColumns().some((r) => r.id === 'east-syriac'));
    assert.equal(matrixCells([]).length, 12);
  } finally {
    assyrian.enabled = true;
  }
});

test('the matrix is a decomposition of the badge, for every single finding', () => {
  // Exhaustive over the registry rather than over invented saints: each church
  // in turn, in each state it can hold. If any one of them could put a row and
  // its badge cell out of step, this catches it.
  for (const church of enabledChurches()) {
    for (const status of ['venerated', 'not-venerated', 'undocumented']) {
      const one = [{ church: church.id, status }];
      assert.ok(decomposesToBadge(one), `${church.id} ${status}`);
    }
  }
  assert.ok(decomposesToBadge([]));
  assert.ok(decomposesToBadge(CHURCHES.map((c) => ({ church: c.id, status: 'venerated' }))));
  assert.ok(decomposesToBadge(CHURCHES.map((c) => ({ church: c.id, status: 'not-venerated' }))));
});

test('the matrix is a decomposition of the badge for every saint in the corpus', () => {
  const slugs = readdirSync('saints');
  assert.ok(slugs.length >= 10);
  for (const slug of slugs) {
    const saint = JSON.parse(readFileSync(`saints/${slug}/saint.json`, 'utf8'));
    // Only findings reach the manifest; undocumented entries are omitted.
    const attestations = saint.attestations.filter((a) => a.status !== 'undocumented');
    assert.ok(decomposesToBadge(attestations), slug);
  }
});

test('one Eastern Catholic entry fills six cells, and each of them says so', () => {
  const catholic = matrixRows(nestorius).find((r) => r.communion.id === 'catholic');
  const coarse = catholic.cells.filter((c) => c.coarse);
  assert.equal(coarse.length, 6);
  assert.ok(catholic.cells.every((c) => c.state === 'refused'));
  // Latin is the one Catholic cell that is not coarse: roman-catholic is its
  // own registry entry.
  assert.equal(catholic.cells.find((c) => c.rite.id === 'latin').coarse, false);

  const svg = renderMatrix(nestorius);
  assert.match(svg, /Eastern Catholic, East Syriac rite: positively not venerated \(one registry entry/);
});

test('the Chaldean and Assyrian cells sit in one column and disagree — the point of the view', () => {
  // Brief §9.2's worked example, on real corpus data: the East Syriac rite is
  // held by Eastern Catholic, which refuses Nestorius, and by the Assyrian
  // Church of the East, which venerates him. Leaving the Eastern Catholic
  // cells blank would erase exactly this.
  const rows = matrixRows(nestorius);
  const col = (id) => rows.find((r) => r.communion.id === id).cells.find((c) => c.rite.id === 'east-syriac');
  assert.equal(col('catholic').state, 'refused');
  assert.equal(col('church-of-the-east').state, 'attested');
  assert.equal(col('catholic').col, col('church-of-the-east').col);
});

test('badge and matrix share one text equivalent, counted over their own cells', () => {
  assert.match(badgeLabel(rollup(anthony)), /^Venerated in 3 of 4 communions: /);
  assert.match(renderMatrix(anthony), /aria-label="Venerated in 3 of 13: Roman Catholic, Eastern Orthodox, Coptic Orthodox\. 10 undocumented\."/);
  // A church holding six cells is named once, not six times.
  const label = renderMatrix(nestorius).match(/aria-label="([^"]+)"/)[1];
  assert.equal(label.match(/Eastern Catholic/g).length, 1);
});

test('the matrix holds no colour literal either', () => {
  const svg = renderMatrix(nestorius, { pitch: 100 });
  assert.ok(!/#[0-9a-f]{3,8}|rgba?\(|(gold|black|white|grey|gray)/i.test(svg.replace(/<title>.*?<\/title>/g, '')));
  assert.match(svg, /fill="var\(--glyph-attested\)"/);
  assert.match(svg, /--glyph-refused-opacity/);
});

test('cells sit on the same lattice as the badge, at the same size', () => {
  const svg = renderMatrix(nestorius, { pitch: 16 });
  // Seven columns and four rows of the same pitch the badge's lattice test
  // pins, and the field is the whole lattice — spec §4's detail width.
  const [, w, h] = svg.match(/width="([\d.]+)" height="([\d.]+)"/);
  assert.equal(parseFloat(w), 112);
  assert.equal(parseFloat(h), 64);
  // The Church of the East's one circle is centred in the East Syriac column,
  // row 3 — on the lattice, not floated to the centre of an otherwise empty
  // row — and carries the same radius a badge cell would at this pitch.
  assert.match(svg, /cx="104" cy="56" r="4.96"/);
});
