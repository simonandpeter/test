#!/usr/bin/env python
"""Apply a hand-written upgrade file to folders that already exist.

`python scratchpad/ru-upgrade.py <data.json>`            dry run
`python scratchpad/ru-upgrade.py <data.json> --write`

`draft-saint.mjs` writes new folders and refuses to touch an existing one, so
the upgrades of CORPUS §6 step 6 are applied here instead. It is a script
rather than a hand edit for trap 18's reason: the intended edits survive a
restore-and-replay, and nothing is applied file-wide.

Every value comes out of the data file, which a person typed off the page.
This composes nothing. It loads and re-dumps the JSON rather than patching
text, which is what keeps a merge from leaving the same key written twice.

Keys the data file may carry per slug:
  russian          the whole Russian attestation row, replacing what is there
  names_add        name objects to append (skipped if the form is already held)
  dates            a whole replacement `dates` object
  hymns_add        hymn objects to append
  related_add      slugs to union into `related`
  set              top-level fields to replace outright (`office`, `types`, …)
  life_paragraphs  paragraphs inserted before the life's closing source line
  source_line      the life's new closing source line
"""
import io
import json
import os
import sys

args = [a for a in sys.argv[1:] if not a.startswith('--')]
WRITE = '--write' in sys.argv
data = json.load(io.open(args[0], encoding='utf-8'))

for slug, up in data.items():
    jpath = os.path.join('saints', slug, 'saint.json')
    lpath = os.path.join('saints', slug, 'life.md')
    if not os.path.exists(jpath):
        print('! %s: no folder' % slug)
        sys.exit(1)
    d = json.load(io.open(jpath, encoding='utf-8'))
    changed = []

    if 'russian' in up:
        rows = d['attestations']
        at = [i for i, r in enumerate(rows) if r['church'] == 'russian']
        if len(at) != 1:
            print('! %s: %d Russian rows' % (slug, len(at)))
            sys.exit(1)
        was = rows[at[0]].get('status')
        rows[at[0]] = up['russian']
        changed.append('russian row %s -> %s' % (was, up['russian']['status']))

    for n in up.get('names_add', []):
        if any(x['form'] == n['form'] and x['lang'] == n['lang'] for x in d.get('names', [])):
            continue
        d.setdefault('names', []).append(n)
        changed.append('name %s/%s' % (n['lang'], n['form']))

    for key, value in up.get('set', {}).items():
        changed.append('%s %s -> %s' % (key, json.dumps(d.get(key), ensure_ascii=False), json.dumps(value, ensure_ascii=False)))
        d[key] = value

    if 'dates' in up:
        changed.append('dates %s -> %s' % (json.dumps(d.get('dates'), ensure_ascii=False)[:40], json.dumps(up['dates'], ensure_ascii=False)[:40]))
        d['dates'] = up['dates']

    for h in up.get('hymns_add', []):
        if any(x.get('church') == h['church'] and x.get('kind') == h['kind'] for x in d.get('hymns', [])):
            print('? %s: a %s %s is already held; the new one is appended anyway' % (slug, h['church'], h['kind']))
        d.setdefault('hymns', []).append(h)
        changed.append('hymn %s %s' % (h['church'], h['kind']))

    if up.get('related_add'):
        rel = sorted(set(d.get('related', []) or []) | set(up['related_add']))
        if rel != (d.get('related') or []):
            d['related'] = rel
            changed.append('related %s' % ','.join(up['related_add']))

    md = io.open(lpath, encoding='utf-8', newline='').read().rstrip('\n')
    paras = md.split('\n\n')
    if not paras[-1].startswith('*After '):
        print('! %s: the life does not close with a source line' % slug)
        sys.exit(1)
    if up.get('life_paragraphs') or up.get('source_line'):
        tail = up.get('source_line', paras[-1])
        paras = paras[:-1] + list(up.get('life_paragraphs', [])) + [tail]
        changed.append('life +%d para' % len(up.get('life_paragraphs', [])))
    over = [len(p) for p in paras if len(p) > 900]
    if over:
        print('? %s: %d paragraph(s) over 900 characters: %s' % (slug, len(over), over))

    print('%s %s: %s' % ('wrote' if WRITE else 'would write', slug, '; '.join(changed)))
    if WRITE:
        with io.open(jpath, 'w', encoding='utf-8', newline='') as f:
            f.write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
        with io.open(lpath, 'w', encoding='utf-8', newline='') as f:
            f.write('\n\n'.join(paras) + '\n')

if not WRITE:
    print('\nDry run. Add --write.')
