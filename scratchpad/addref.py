# -*- coding: utf-8 -*-
"""Append refusals to scratchpad/icon-refusals.json, preserving its shape.

usage: python scratchpad/addref.py <new-refusals.json>

The file keeps one refusal per line so that appending shows as appended lines
rather than a reformat of the whole document, so the records are written by
hand here rather than by `json.dumps(indent=...)` over the whole object.
"""
import io, json, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, 'scratchpad', 'icon-refusals.json')
d = json.load(io.open(path, encoding='utf-8'))
new = json.load(io.open(sys.argv[1], encoding='utf-8'))
have = set(r['slug'] for r in d['refused'])

rows = list(d['refused'])
added = 0
for r in new:
    assert r['kind'] in d['_kinds'], r['kind']
    if r['slug'] in have:
        print('already there:', r['slug'])
        continue
    rows.append({'slug': r['slug'], 'kind': r['kind'], 'why': r['why']})
    added += 1

out = ['{']
for k, v in d.items():
    if k == 'refused':
        continue
    body = json.dumps(v, ensure_ascii=False, indent=2)
    out.append('  %s: %s,' % (json.dumps(k), body.replace('\n', '\n  ')))
out.append('  "refused": [')
for i, r in enumerate(rows):
    line = '    { "slug": %s, "kind": %s, "why": %s }' % (
        json.dumps(r['slug'], ensure_ascii=False),
        json.dumps(r['kind'], ensure_ascii=False),
        json.dumps(r['why'], ensure_ascii=False))
    out.append(line + (',' if i < len(rows) - 1 else ''))
out.append('  ]')
out.append('}')
io.open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out) + '\n')
print('appended %d, now %d refusals' % (added, len(rows)))
json.load(io.open(path, encoding='utf-8'))
print('re-parsed OK')
