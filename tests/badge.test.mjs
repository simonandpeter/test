import test from 'node:test';
import assert from 'node:assert/strict';
import { rollup, badgeLabel, renderBadge, renderVessels } from '../src/ui/badge.js';
import { CHURCHES_BY_ID } from '../src/data/churches.js';

/** Manifest-shaped attestations: only findings, undocumented omitted. */
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

test('rollup: any attested church fills its communion', () => {
  const states = Object.fromEntries(rollup(anthony).map((c) => [c.communion.id, c.state]));
  assert.deepEqual(states, {
    catholic: 'attested',
    'eastern-orthodox': 'attested',
    'oriental-orthodox': 'attested',
    'church-of-the-east': 'undocumented',
  });
});

test('rollup: refusal shows only where nothing in the communion is attested', () => {
  const states = Object.fromEntries(rollup(nestorius).map((c) => [c.communion.id, c.state]));
  assert.deepEqual(states, {
    catholic: 'refused',
    'eastern-orthodox': 'refused',
    'oriental-orthodox': 'refused',
    'church-of-the-east': 'attested',
  });
});

test('rollup: an attested church outweighs a refused one in the same communion', () => {
  const mixed = [
    { church: 'roman-catholic', status: 'not-venerated' },
    { church: 'eastern-catholic', status: 'venerated' },
  ];
  const catholic = rollup(mixed).find((c) => c.communion.id === 'catholic');
  assert.equal(catholic.state, 'attested');
  assert.equal(catholic.attested, 1);
  assert.equal(catholic.refused, 1);
});

test('a disabled communion vanishes from the lattice entirely', () => {
  const assyrian = CHURCHES_BY_ID['assyrian-church-of-the-east'];
  try {
    assyrian.enabled = false;
    const cells = rollup(anthony);
    assert.equal(cells.length, 3);
    assert.ok(!cells.some((c) => c.communion.id === 'church-of-the-east'));
    // Hidden, not drawn empty: the svg carries exactly three shapes.
    const svg = renderBadge(anthony);
    assert.equal((svg.match(/<rect|<circle/g) ?? []).length, 3);
  } finally {
    assyrian.enabled = true;
  }
});

test('the three states differ by value and by size, and hold no colour literal', () => {
  const svg = renderBadge(nestorius.slice(0, 2).concat([{ church: 'eastern-orthodox', status: 'not-venerated' }]), {
    pitch: 100,
  });
  const cells = [...svg.matchAll(/<circle data-state="(\w+)"[^>]*r="([\d.]+)"[^>]*?(?:fill-opacity="([^"]+)")?>/g)]
    .map((m) => ({ state: m[1], r: parseFloat(m[2]), opacity: m[3] }));
  const byState = Object.fromEntries(cells.map((c) => [c.state, c]));

  // Attested and refused share a radius: a refusal is a finding, not an
  // absence, and it is told apart by value alone. 0.31 of the pitch, spec §4.
  assert.equal(byState.attested.r, 31);
  assert.equal(byState.refused.r, 31);
  assert.match(svg, /fill="var\(--glyph-attested\)"/);
  assert.match(byState.refused.opacity, /--glyph-refused-opacity/);

  // Undocumented is told apart by size as well, which is what carries the
  // three-state distinction through a greyscale render. 0.11 of the pitch —
  // visibly smaller, not the same circle at a lower opacity.
  assert.equal(byState.undocumented.r, 11);
  assert.match(byState.undocumented.opacity, /--glyph-undoc-opacity/);

  // Every fill is a custom property; a hex or a named colour here would make
  // repaletting a code change.
  assert.ok(!/#[0-9a-f]{3,8}|rgba?\(|(gold|black|white|grey|gray)/i.test(svg.replace(/<title>.*?<\/title>/g, '')));
});

test('cells sit on the lattice: fixed pitch, partial rows left-aligned', () => {
  // All four attested, so every shape is a plain rect whose x is its lattice
  // origin (hollow and dot shapes are inset within their cells).
  const allFour = [
    { church: 'roman-catholic', status: 'venerated' },
    { church: 'eastern-orthodox', status: 'venerated' },
    { church: 'coptic', status: 'venerated' },
    { church: 'assyrian-church-of-the-east', status: 'venerated' },
  ];
  const svg = renderBadge(allFour, { pitch: 16, cols: 3 });
  const cells = [...svg.matchAll(/cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [
    parseFloat(m[1]),
    parseFloat(m[2]),
  ]);
  assert.equal(cells.length, 4);
  // Every circle is centred in its own pitch square; three columns, then the
  // lone fourth on the next lattice row in column 0 — on the lattice, never
  // floated to the visual centre of a short row.
  assert.deepEqual(cells, [
    [8, 8],
    [24, 8],
    [40, 8],
    [8, 24],
  ]);
});

test('the text equivalent names names, not colours', () => {
  const label = badgeLabel(rollup(nestorius));
  assert.match(label, /Venerated in 1 of 4 communions: Church of the East\./);
  assert.match(label, /Positively not venerated by: Catholic, Eastern Orthodox, Oriental Orthodox\./);
  assert.ok(!/gold|grey|gray|colour|color/i.test(label));
});

test('vessels fill by proportion of churches attested', () => {
  const oneOfTwo = [{ church: 'roman-catholic', status: 'venerated' }];
  const svg = renderVessels(oneOfTwo, { height: 12 });
  // Catholic holds two churches; one attested → fill height 6 of 12.
  assert.match(svg, /height="6" fill="var\(--glyph-attested\)"/);
});

test('every badge and vessel row carries an aria-label', () => {
  for (const svg of [renderBadge(anthony), renderVessels(anthony)]) {
    assert.match(svg, /role="img" aria-label="Venerated in 3 of 4/);
  }
});
