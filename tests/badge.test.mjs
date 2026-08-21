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
    cell: 100,
  });
  const cells = [...svg.matchAll(/<rect data-state="(\w+)"[^>]*width="([\d.]+)"[^>]*?(?:fill-opacity="([^"]+)")?>/g)]
    .map((m) => ({ state: m[1], size: parseFloat(m[2]), opacity: m[3] }));
  const byState = Object.fromEntries(cells.map((c) => [c.state, c]));

  // Attested and refused share a footprint: a refusal is a finding, not an
  // absence, and it is told apart by value alone.
  assert.equal(byState.attested.size, 100);
  assert.equal(byState.refused.size, 100);
  assert.match(svg, /fill="var\(--glyph-attested\)"/);
  assert.match(byState.refused.opacity, /--glyph-refused-opacity/);

  // Undocumented is told apart by size as well, which is what carries the
  // three-state distinction through a greyscale render.
  assert.ok(byState.undocumented.size < 40);
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
  const svg = renderBadge(allFour, { cell: 16, cols: 3 });
  const cells = [...svg.matchAll(/x="([\d.]+)" y="([\d.]+)"/g)].map((m) => [
    parseFloat(m[1]),
    parseFloat(m[2]),
  ]);
  assert.equal(cells.length, 4);
  // Pitch = cell + gap = 16 + 1.8; three columns, then the lone fourth cell on
  // the next lattice row at x=0 — on the lattice, never centred.
  assert.deepEqual(cells, [
    [0, 0],
    [17.8, 0],
    [35.6, 0],
    [0, 17.8],
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
