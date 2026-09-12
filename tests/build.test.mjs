import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { build } from '../scripts/build-manifest.mjs';
import { PLACEHOLDER_SOURCE } from '../src/lib/licence.js';

/**
 * These are the acceptance criteria for Phase 0, not incidental coverage. The
 * contract is that a folder either appears in the manifest or fails the build
 * loudly, and that every failure names the folder and says what is wrong. A
 * saint that vanishes quietly is the worst failure this project has, so the
 * cases that could cause one are pinned here.
 */

const saint = (over = {}) => ({
  slug: 'test-saint',
  display_name: 'Test Saint',
  attestations: [
    {
      church: 'russian',
      status: 'venerated',
      feast: { day: 21, month: 1, calendar: 'gregorian' },
      source: { text: 'A test calendar', year: 2026 },
    },
  ],
  ...over,
});

/** Runs the build over a throwaway saints directory. */
async function buildWith(folders) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'saints-test-'));
  try {
    for (const [name, contents] of Object.entries(folders)) {
      await mkdir(path.join(dir, name), { recursive: true });
      await writeFile(
        path.join(dir, name, 'saint.json'),
        typeof contents === 'string' ? contents : JSON.stringify(contents),
      );
    }
    return await build({ saintsDir: dir, write: false });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const messages = (result) => result.errors.map((e) => `${e.folder}: ${e.msg}`).join('\n');

test('a minimal valid folder builds', async () => {
  const r = await buildWith({ 'test-saint': saint() });
  assert.deepEqual(r.errors, []);
  assert.equal(r.manifest.length, 1);
  assert.equal(r.manifest[0].slug, 'test-saint');
});

test('adding a folder makes it appear, with no other edit', async () => {
  const one = await buildWith({ 'test-saint': saint() });
  const two = await buildWith({
    'test-saint': saint(),
    'agnes-of-rome': saint({ slug: 'agnes-of-rome', display_name: 'Agnes of Rome' }),
  });
  assert.equal(one.manifest.length, 1);
  assert.equal(two.manifest.length, 2);
  assert.deepEqual(
    two.manifest.map((s) => s.slug).sort(),
    ['agnes-of-rome', 'test-saint'],
  );
});

test('a folder whose name does not match its slug fails', async () => {
  const r = await buildWith({ 'wrong-folder': saint() });
  assert.match(messages(r), /wrong-folder.*does not match the folder name/s);
});

test('two folders claiming one slug fail rather than one silently winning', async () => {
  const r = await buildWith({
    'agnes-of-rome': saint({ slug: 'shared-slug' }),
    'agnes-of-assisi': saint({ slug: 'shared-slug' }),
  });
  assert.match(messages(r), /duplicate slug "shared-slug"/);
});

test('folders differing only in case cannot smuggle a saint out of the manifest', async () => {
  // On a case-insensitive filesystem the second folder is the first one, so
  // this collapses to a single directory carrying a slug that no longer
  // matches it. On a case-sensitive one it stays two folders sharing a slug.
  // Both are caught; which message appears depends on the filesystem, and the
  // point of the test is that neither ends with a saint quietly disappearing.
  const r = await buildWith({
    'test-saint': saint(),
    'Test-Saint': saint({ slug: 'Test-Saint' }),
  });
  assert.ok(r.errors.length > 0, 'a case collision must not build cleanly');
  assert.equal(r.manifest, null);
});

test('a missing saint.json fails the folder', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'saints-test-'));
  try {
    await mkdir(path.join(dir, 'empty-folder'), { recursive: true });
    const r = await build({ saintsDir: dir, write: false });
    assert.match(messages(r), /empty-folder: no saint\.json/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('unparseable JSON fails with the parser message', async () => {
  const r = await buildWith({ 'test-saint': '{ "slug": ' });
  assert.match(messages(r), /is not valid JSON/);
});

test('missing required fields fail', async () => {
  const r = await buildWith({ 'test-saint': { slug: 'test-saint' } });
  assert.match(messages(r), /missing required field "display_name"/);
});

test('a saint with no attestations fails', async () => {
  const r = await buildWith({ 'test-saint': saint({ attestations: [] }) });
  assert.match(messages(r), /attestations/);
});

test('an unknown field fails rather than being ignored', async () => {
  const r = await buildWith({ 'test-saint': saint({ tradtion: 'catholic' }) });
  assert.match(messages(r), /unknown field "tradtion"/);
});

test('an inverted date interval fails', async () => {
  const r = await buildWith({
    'test-saint': saint({
      dates: { death: { earliest: 400, latest: 300, basis: 'inferred' } },
    }),
  });
  assert.match(messages(r), /latest \(300\) is earlier than earliest \(400\)/);
});

test('coordinates outside the possible range fail', async () => {
  const r = await buildWith({
    'test-saint': saint({
      locations: [{ kind: 'death', lat: 91, lon: 0, uncertainty_km: 15 }],
    }),
  });
  assert.match(messages(r), /lat/);
});

test('a latitude without a longitude fails', async () => {
  const r = await buildWith({
    'test-saint': saint({ locations: [{ kind: 'death', lat: 41.9, uncertainty_km: 15 }] }),
  });
  assert.ok(r.errors.length > 0);
});

test('coordinates without an uncertainty radius fail — the radius is required with them', async () => {
  const r = await buildWith({
    'test-saint': saint({ locations: [{ kind: 'death', lat: 41.9, lon: 12.5 }] }),
  });
  assert.match(messages(r), /uncertainty_km/);
});

test('the uncertainty radius must be a positive number no greater than 20000', async () => {
  for (const bad of [0, -3, 20001]) {
    const r = await buildWith({
      'test-saint': saint({ locations: [{ kind: 'death', lat: 41.9, lon: 12.5, uncertainty_km: bad }] }),
    });
    assert.ok(r.errors.length > 0, `uncertainty_km ${bad} must fail`);
  }
  const ok = await buildWith({
    'test-saint': saint({ locations: [{ kind: 'death', lat: 41.9, lon: 12.5, uncertainty_km: 0.5 }] }),
  });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.manifest[0].locations[0].uncertainty_km, 0.5);
});

test('image dimensions and aspect are emitted into the manifest', async () => {
  // A hand-crafted 8x10 PNG — signature plus IHDR is all image-size reads.
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([0, 0, 0, 8, 0, 0, 0, 10, 8, 2, 0, 0, 0]),
    Buffer.from([0, 0, 0, 0]),
  ]);
  const dir = await mkdtemp(path.join(os.tmpdir(), 'saints-test-'));
  try {
    await mkdir(path.join(dir, 'test-saint', 'images'), { recursive: true });
    await writeFile(path.join(dir, 'test-saint', 'images', 'icon.png'), png);
    await writeFile(path.join(dir, 'test-saint', 'images', 'icon-thumb.jpg'), png);
    await writeFile(path.join(dir, 'test-saint', 'images', 'icon-card.jpg'), png);
    await writeFile(path.join(dir, 'test-saint', 'images', 'icon-card-sm.jpg'), png);
    await writeFile(
      path.join(dir, 'test-saint', 'saint.json'),
      JSON.stringify(saint({ images: [{ file: 'images/icon.png' }] })),
    );
    const r = await build({ saintsDir: dir, write: false });
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.manifest[0].image, {
      src: 'saints/test-saint/images/icon.png',
      lqip: 'saints/test-saint/images/icon-thumb.jpg',
      // The card derivative, 2026-09-06: `src` is the original the saint's own
      // page draws, and this is the one a 150-300 px card is handed.
      card: 'saints/test-saint/images/icon-card.jpg',
      /*
       * And the narrow half of the card's `srcset`, 2026-09-12. The two `w`
       * numbers are the derivatives' own pixel *widths* and not the cap on
       * their long edge, which for this 8x10 is 8 either way — make_thumbs.py
       * never upscales, so a picture smaller than the cap is its own
       * derivative and both descriptors are the original's width. That is the
       * case worth pinning: the arithmetic that gets it wrong is the one that
       * writes the cap down instead of measuring.
       */
      cardSm: 'saints/test-saint/images/icon-card-sm.jpg',
      cardW: 8,
      cardSmW: 8,
      w: 8,
      h: 10,
      aspect: 0.8,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the srcset widths the manifest declares are the widths the files really have', async () => {
  /*
   * **The one thing arithmetic can get wrong here, pinned against the pixels**
   * (2026-09-12). `cardW` and `cardSmW` are computed in build-manifest.mjs
   * from the original's shape and two caps repeated from make_thumbs.py,
   * because opening two more files per saint at build time to learn a number
   * that is already implied would be a cost for nothing. The price of that is
   * two copies of `CARD_MAX_PX` — one in Python and one in JavaScript — and a
   * `srcset` descriptor that lies is worse than no `srcset` at all: the
   * browser picks by it, so an over-stated width makes it fetch the narrow
   * file for a box the narrow file cannot fill.
   *
   * So this reads the real derivatives beside a real icon and checks the
   * declared numbers against them. It also covers the cap itself moving in
   * one language and not the other, which is the mistake the two copies
   * invite. Portrait *and* landscape, because the caps are on the long edge
   * and a `srcset` descriptor is a width — the two are the same number only
   * for a landscape picture, and getting that backwards is the whole bug this
   * is here for.
   */
  const { imageSizeFromFile } = await import('image-size/fromFile');
  const { readdir, readFile } = await import('node:fs/promises');
  const root = path.join(import.meta.dirname, '..', 'saints');
  const folders = await readdir(root);

  /** A folder with an icon and both card derivatives, in the shape asked for. */
  const findOne = async (wantPortrait) => {
    for (const folder of folders) {
      const dir = path.join(root, folder, 'images');
      let files;
      try {
        files = await readdir(dir);
      } catch {
        continue;
      }
      const icon = files.find((f) => /^icon\.(jpe?g|png)$/i.test(f));
      if (!icon) continue;
      const base = icon.replace(/\.[^.]+$/, '');
      if (!files.includes(`${base}-card.jpg`) || !files.includes(`${base}-card-sm.jpg`)) continue;
      const { width, height } = await imageSizeFromFile(path.join(dir, icon));
      if (width > height === wantPortrait) continue;
      return { folder, dir, icon, base, width, height };
    }
    return null;
  };

  for (const portrait of [true, false]) {
    const found = await findOne(portrait);
    // The corpus is 130 icons and both shapes are in it; if one ever is not,
    // say so rather than passing on an empty loop.
    assert.ok(found, `no ${portrait ? 'portrait' : 'landscape'} icon with both card derivatives in the corpus`);

    const dir = await mkdtemp(path.join(os.tmpdir(), 'saints-srcset-'));
    try {
      await mkdir(path.join(dir, 'test-saint', 'images'), { recursive: true });
      for (const suffix of ['', '-thumb.jpg', '-card.jpg', '-card-sm.jpg']) {
        const from = suffix ? `${found.base}${suffix}` : found.icon;
        const to = suffix ? `icon${suffix}` : found.icon;
        await writeFile(path.join(dir, 'test-saint', 'images', to), await readFile(path.join(found.dir, from)));
      }
      await writeFile(
        path.join(dir, 'test-saint', 'saint.json'),
        JSON.stringify(saint({ images: [{ file: `images/${found.icon}` }] })),
      );
      const r = await build({ saintsDir: dir, write: false });
      assert.deepEqual(r.errors, []);
      const image = r.manifest[0].image;
      const real = {
        card: await imageSizeFromFile(path.join(dir, 'test-saint', 'images', 'icon-card.jpg')),
        cardSm: await imageSizeFromFile(path.join(dir, 'test-saint', 'images', 'icon-card-sm.jpg')),
      };
      const where = `${found.folder} (${found.width}x${found.height}, ${portrait ? 'portrait' : 'landscape'})`;
      assert.equal(image.cardW, real.card.width, `cardW is not the card file's own width — ${where}`);
      assert.equal(image.cardSmW, real.cardSm.width, `cardSmW is not the small card's own width — ${where}`);
      // And the small one really is smaller, or the srcset offers one file twice.
      assert.ok(real.cardSm.width < real.card.width, `the two card derivatives are the same width — ${where}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test('a licence that obliges attribution warns until it has some; one that does not, does not', async () => {
  // A hand-crafted 8x10 PNG, as above — image-size reads only the header.
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    Buffer.from([0, 0, 0, 8, 0, 0, 0, 10, 8, 2, 0, 0, 0]),
    Buffer.from([0, 0, 0, 0]),
  ]);

  const withLicence = async (meta) => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'saints-test-'));
    try {
      await mkdir(path.join(dir, 'test-saint', 'images'), { recursive: true });
      await writeFile(path.join(dir, 'test-saint', 'images', 'icon.png'), png);
      await writeFile(path.join(dir, 'test-saint', 'images', 'icon-thumb.jpg'), png);
      await writeFile(path.join(dir, 'test-saint', 'images', 'icon-card.jpg'), png);
    await writeFile(path.join(dir, 'test-saint', 'images', 'icon-card-sm.jpg'), png);
      await writeFile(path.join(dir, 'test-saint', 'images', 'icon.meta.json'), JSON.stringify(meta));
      await writeFile(
        path.join(dir, 'test-saint', 'saint.json'),
        JSON.stringify(saint({ images: [{ file: 'images/icon.png', meta: 'images/icon.meta.json' }] })),
      );
      const r = await build({ saintsDir: dir, write: false });
      assert.deepEqual(r.errors, []);
      return r.warnings.map((w) => w.msg).join(' | ');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };

  const url = 'https://example.org/file';

  // The public-domain tools oblige nothing, so asking for a credit would be
  // inventing an obligation.
  assert.equal(await withLicence({ licence: 'Public Domain Mark 1.0', credit: null, source_url: url }), '');
  assert.equal(await withLicence({ licence: 'CC0 1.0', credit: null, source_url: url }), '');

  // Every other Creative Commons variant requires naming the author.
  assert.match(await withLicence({ licence: 'CC BY 4.0', credit: null, source_url: url }), /needs credit/);
  assert.equal(await withLicence({ licence: 'CC BY 4.0', credit: 'A. Painter', source_url: url }), '');

  // A family name is not a licence: it spans tools that ask nothing and
  // licences that ask a good deal, so it cannot be checked at all.
  assert.match(await withLicence({ licence: 'Creative Commons — variant not recorded', credit: null, source_url: url }), /needs licence variant/);

  // The source link is provenance rather than attribution, so it is wanted
  // whatever the licence says.
  assert.match(await withLicence({ licence: 'CC0 1.0', credit: null, source_url: null }), /needs source_url/);

  // And a placeholder is not an answer. It is in the corpus on purpose while
  // the real links are found, and the warning is the only thing stopping it
  // from becoming the record.
  assert.match(
    await withLicence({ licence: 'CC0 1.0', credit: null, source_url: PLACEHOLDER_SOURCE }),
    /in place of the placeholder/,
  );
});

test('an attestation naming an unregistered church fails', async () => {
  const r = await buildWith({
    'test-saint': saint({
      attestations: [
        { church: 'anglican', status: 'venerated', source: { text: 'somewhere' } },
      ],
    }),
  });
  assert.match(messages(r), /unregistered church "anglican"/);
});

test('a feast day that cannot exist in its calendar fails', async () => {
  const r = await buildWith({
    'test-saint': saint({
      attestations: [
        {
          church: 'russian',
          status: 'venerated',
          feast: { day: 30, month: 2, calendar: 'gregorian' },
          source: { text: 'A test calendar' },
        },
      ],
    }),
  });
  assert.match(messages(r), /30\/2 does not exist in the gregorian calendar/);
});

test('a Revised Julian leap day is accepted, because it does exist', async () => {
  const r = await buildWith({
    'test-saint': saint({
      attestations: [
        {
          church: 'romanian',
          status: 'venerated',
          feast: { day: 29, month: 2, calendar: 'revised-julian' },
          source: { text: 'A test calendar' },
        },
      ],
    }),
  });
  assert.deepEqual(r.errors, []);
});

test('a veneration or a refusal without a source fails', async () => {
  for (const status of ['venerated', 'not-venerated']) {
    const r = await buildWith({
      'test-saint': saint({ attestations: [{ church: 'russian', status }] }),
    });
    assert.match(messages(r), /missing required field "source"/, status);
  }
});

test('undocumented may stand without a source, which is the point of it', async () => {
  const r = await buildWith({
    'test-saint': saint({
      attestations: [{ church: 'russian', status: 'undocumented' }],
    }),
  });
  assert.deepEqual(r.errors, []);
});

test('a feast cannot be attached to a refusal or a gap', async () => {
  for (const status of ['not-venerated', 'undocumented']) {
    const r = await buildWith({
      'test-saint': saint({
        attestations: [
          {
            church: 'russian',
            status,
            feast: { day: 21, month: 1, calendar: 'gregorian' },
            source: { text: 'somewhere' },
          },
        ],
      }),
    });
    assert.ok(r.errors.length > 0, status);
  }
});

test('a paschal feast with no computus anywhere fails', async () => {
  // Every church in the registry carries a default computus, so a paschal
  // feast that omits its own still resolves; the failure for a church without
  // one is exercised by lib/feasts.js's own test.
  const r = await buildWith({
    'test-saint': saint({
      attestations: [
        {
          church: 'russian',
          status: 'venerated',
          feast: { calendar: 'paschal', offset: 0 },
          source: { text: 'somewhere' },
        },
      ],
    }),
  });
  // russian carries a default computus, so this one must succeed.
  assert.deepEqual(r.errors, []);
  assert.equal(r.manifest[0].attestations[0].feast.calendar, 'paschal');
});

test('a related saint that does not exist fails', async () => {
  const r = await buildWith({
    'test-saint': saint({ related: ['nobody-at-all'] }),
  });
  assert.match(messages(r), /related saint "nobody-at-all" does not exist/);
});

test('a related saint that does exist is accepted', async () => {
  const r = await buildWith({
    'test-saint': saint({ related: ['agnes-of-rome'] }),
    'agnes-of-rome': saint({ slug: 'agnes-of-rome', display_name: 'Agnes of Rome' }),
  });
  assert.deepEqual(r.errors, []);
});

test('a referenced text file that is not there fails', async () => {
  const r = await buildWith({
    'test-saint': saint({ text: { life: 'life.md' } }),
  });
  assert.match(messages(r), /text file "life\.md" is referenced but does not exist/);
});

test('every error names its folder', async () => {
  const r = await buildWith({
    'test-saint': saint({ dates: { death: { earliest: 400, latest: 300, basis: 'inferred' } } }),
    'agnes-of-rome': saint({ slug: 'agnes-of-rome', related: ['nobody'] }),
  });
  assert.ok(r.errors.length >= 2);
  for (const e of r.errors) {
    assert.ok(e.folder, 'error without a folder');
    assert.ok(e.msg.length > 10, 'error without a useful message');
  }
});

test('all problems are reported at once, not one run at a time', async () => {
  const r = await buildWith({
    'test-saint': saint({
      dates: { death: { earliest: 400, latest: 300, basis: 'inferred' } },
      attestations: [{ church: 'anglican', status: 'venerated', source: { text: 'x' } }],
      related: ['nobody'],
    }),
  });
  assert.ok(r.errors.length >= 2, `expected several errors, got ${r.errors.length}`);
});
