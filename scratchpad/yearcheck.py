"""Every year a batch's new lives claim, against the saint.gr page each cites.

The Romanian wave's recurring defect was a detail the page does not hold — a
place, an epithet, a year — so this checks the one kind that can be checked
mechanically. A year printed only in the closing source line (the read date) is
excluded by cutting the life at that line.

usage: PYTHONIOENCODING=utf-8 python scratchpad/yearcheck.py el-MM-DD
"""
import io, json, re, sys

def page(i):
    try:
        t = io.open('.tmp/day-cache/https_www_saint_gr_%s_saint_aspx.html' % i,
                    encoding='utf-8', errors='replace').read()
    except FileNotFoundError:
        return ''
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t))

bad = 0
for e in json.load(io.open('.tmp/corpus-batches/%s.json' % sys.argv[1], encoding='utf-8'))['folders']:
    life = io.open('saints/%s/life.md' % e['slug'], encoding='utf-8').read()
    ids = re.findall(r'saint\.gr/(\d+)/saint\.aspx', life)
    txt = ' '.join(page(i) for i in ids)
    body = life[:life.rfind('\n\n*')] if '\n\n*' in life else life
    miss = [y for y in sorted(set(re.findall(r'\b\d{3,4}\b', body))) if y not in txt]
    if miss or not ids:
        bad += 1
        print(e['slug'], ids or 'NO CITED PAGE', miss)
print('%s: %d folder(s) to read by hand' % (sys.argv[1], bad))
