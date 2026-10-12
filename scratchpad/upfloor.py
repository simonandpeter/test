# -*- coding: utf-8 -*-
"""Floor-probe the life each upgrade in <up.json> WOULD produce, without writing."""
import io, json, os, subprocess, sys

ups = json.load(io.open(sys.argv[1], encoding='utf-8'))
tmp = os.path.join(os.environ.get('TEMP', '.'), '_upfp.txt')
for u in ups:
    slug = u['slug']
    life = io.open('saints/%s/life.md' % slug, encoding='utf-8').read().rstrip('\n')
    cut = life.rfind('\n\n*')
    head, src = life[:cut], life[cut + 2:]
    if u.get('life_para'):
        head = head + '\n\n' + u['life_para']
    disp = json.load(io.open('saints/%s/saint.json' % slug, encoding='utf-8'))['display_name']
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(head + '\n\n' + src + '\n')
    r = subprocess.run(['node', '.tmp/ru-floorprobe.mjs', '--slug', slug,
                        '--display', disp, '--file', tmp],
                       capture_output=True, text=True, encoding='utf-8')
    print('##', slug, '->', (r.stdout or '').strip() or ('ERR ' + (r.stderr or '').strip()))
