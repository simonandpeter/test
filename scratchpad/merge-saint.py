#!/usr/bin/env python3
"""The mechanical half of a TODO item 13 merge: `merge-saint.py <survivor> <dead>`.

**The reading is not here.** What a merge has to decide — which folder survives,
what the dead one's life was keeping that the survivor's does not say, whether
the sources leave a doubt that must stay visible, what `dates` now rests on —
is written by hand into the survivor afterwards. This moves only what cannot be
read wrong: the alias so the folded-away URL does not 404, the union of `names`,
`types`, `related` and `hymns`, the dead folder's attestation rows, and every
reference to the dead slug anywhere else in `saints/`.

It prints what it moved and what it refused to move, and `--dry` is the default:
nothing is written and no folder is deleted without `--write`.

`aliases` may not be a live folder's slug — `build:manifest` and `indexManifest`
both fail the build on that — so the dead folder goes in the same run that
records the alias, never in a later one.
"""
import io, json, os, shutil, sys

SAINTS = 'saints'


def load(slug):
    p = os.path.join(SAINTS, slug, 'saint.json')
    return json.load(io.open(p, encoding='utf-8'))


def dump(slug, d):
    p = os.path.join(SAINTS, slug, 'saint.json')
    open(p, 'wb').write((json.dumps(d, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    write = '--write' in sys.argv
    survivor, dead = args
    s, d = load(survivor), load(dead)

    moved, left = [], []

    aliases = sorted(set(s.get('aliases', [])) | {dead} | set(d.get('aliases', [])))
    s['aliases'] = aliases
    moved.append(f'aliases: {aliases}')

    forms = {(n['form'], n.get('lang')) for n in s.get('names', [])}
    added = [n for n in d.get('names', []) if (n['form'], n.get('lang')) not in forms]
    if added:
        s['names'] = s.get('names', []) + added
        moved.append(f'names: +{len(added)} ' + ', '.join(n['form'] for n in added))

    types = [t for t in d.get('types', []) if t not in s.get('types', [])]
    if types:
        s['types'] = s.get('types', []) + types
        moved.append(f'types: +{types}')

    rows = d.get('attestations', [])
    s['attestations'] = s.get('attestations', []) + rows
    moved.append(
        'attestations: +%d (%s) — a church may now appear twice, and an `undocumented`'
        ' row the survivor already has for that church is yours to drop by hand'
        % (len(rows), ', '.join(f"{r['church']}/{r['status']}" for r in rows))
    )

    hymns = d.get('hymns', [])
    if hymns:
        s['hymns'] = s.get('hymns', []) + hymns
        moved.append('hymns: +%d (%s)' % (len(hymns), ', '.join(h['kind'] for h in hymns)))

    # Always rewritten, never only when non-empty: a survivor whose single
    # `related` row was the folder being folded away would otherwise keep a
    # row pointing at nothing, which `related-floor.test.mjs` catches and
    # `build:manifest` fails on.
    rel = (set(s.get('related', [])) | set(d.get('related', []))) - {survivor, dead}
    if rel:
        s['related'] = sorted(rel)
    else:
        s.pop('related', None)
    moved.append(f'related: {len(rel)}')

    # `images` entries are paths relative to the folder, so taking the key
    # without the files leaves the manifest declaring a picture that was
    # deleted with the folder. The directory moves or the key does not.
    s_img = os.path.join(SAINTS, survivor, 'images')
    d_img = os.path.join(SAINTS, dead, 'images')
    if d.get('images') and not s.get('images') and os.path.isdir(d_img):
        if write:
            shutil.copytree(d_img, s_img, dirs_exist_ok=True)
        s['images'] = d['images']
        moved.append('images/: the folded folder\'s files copied across, the survivor having none')
    elif d.get('images') and s.get('images'):
        left.append('images: both folders have one. The survivor keeps its own; TODO item 15 ranks them')

    for key in ('track', 'locations', 'office', 'kind', 'historicity'):
        if key in d and key not in s:
            s[key] = d[key]
            moved.append(f'{key}: taken from the folded folder, which alone had it')
        elif key in d and key in s and json.dumps(d[key], sort_keys=True) != json.dumps(s[key], sort_keys=True):
            left.append(f'{key}: both folders have one and they differ — read both')

    if 'dates' in d:
        left.append('dates: not folded. The survivor keeps its own; fold the other reading into `basis`/`note` by hand')
    left.append('life.md: not folded. Whatever the dead life was the only record of goes into the survivor\'s by hand')

    # Every other folder that points at the dead slug.
    repointed_rel, repointed_life = [], []
    for slug in sorted(os.listdir(SAINTS)):
        if slug in (survivor, dead):
            continue
        p = os.path.join(SAINTS, slug, 'saint.json')
        if os.path.exists(p):
            o = json.load(io.open(p, encoding='utf-8'))
            if dead in o.get('related', []):
                o['related'] = sorted({survivor if r == dead else r for r in o['related']} - {slug})
                repointed_rel.append(slug)
                if write:
                    dump(slug, o)
        lp = os.path.join(SAINTS, slug, 'life.md')
        if os.path.exists(lp):
            t = io.open(lp, encoding='utf-8', newline='').read()
            if f'/saints/{dead}' in t:
                repointed_life.append(slug)
                if write:
                    open(lp, 'wb').write(t.replace(f'/saints/{dead}', f'/saints/{survivor}').encode('utf-8'))

    print(f'== {dead}  ->  {survivor}')
    for m in moved:
        print('  moved  ', m)
    for l in left:
        print('  BY HAND', l)
    print(f'  repointed related in {len(repointed_rel)} folder(s): {" ".join(repointed_rel)}')
    print(f'  repointed life links in {len(repointed_life)} folder(s): {" ".join(repointed_life)}')
    print(f'  survivor life.md: {os.path.getsize(os.path.join(SAINTS, survivor, "life.md"))} bytes'
          f'   folded life.md: {os.path.getsize(os.path.join(SAINTS, dead, "life.md"))} bytes')

    if not write:
        print('\n  --dry. Nothing written, nothing deleted. --write to apply.')
        return
    dump(survivor, s)
    shutil.rmtree(os.path.join(SAINTS, dead))
    print(f'\n  wrote {survivor}/saint.json and deleted saints/{dead}/')


main()
