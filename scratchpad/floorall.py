# -*- coding: utf-8 -*-
"""Run ru-floorprobe over every saint in a draft file. usage: floorall.py <draft.json>"""
import io, json, os, subprocess, sys

j = json.load(io.open(sys.argv[1], encoding='utf-8'))
tmp = os.path.join(os.environ.get('TEMP', '.'), '_fp.txt')
for e in j['saints']:
    s = e['saint']
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(e['life'])
    r = subprocess.run(['node', '.tmp/ru-floorprobe.mjs', '--slug', s['slug'],
                        '--display', s['display_name'], '--file', tmp],
                       capture_output=True, text=True, encoding='utf-8')
    out = (r.stdout or '').strip() + (('\nERR ' + r.stderr.strip()) if r.returncode else '')
    print('##', s['slug'], '->', out if out.strip() else '(none)')
