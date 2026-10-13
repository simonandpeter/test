# -*- coding: utf-8 -*-
"""Drive geticon.py one entry per invocation, serially.

usage: python scratchpad/drive.py <draft.json> [--write]

Commons serves the unscaled original for anything under ~1250px and rate-limits
those hard, so the fetcher is given one entry at a time with a pause between.
"""
import io, json, os, subprocess, sys, time

draft = json.load(io.open(sys.argv[1], encoding='utf-8'))
write = '--write' in sys.argv
tmp = os.path.join('scratchpad', '_one.json')
for i, d in enumerate(draft):
    io.open(tmp, 'w', encoding='utf-8', newline='\n').write(
        json.dumps([d], ensure_ascii=False, indent=2))
    cmd = [sys.executable, 'scratchpad/geticon.py', tmp] + (['--write'] if write else [])
    env = dict(os.environ, PYTHONIOENCODING='utf-8')
    r = subprocess.run(cmd, env=env, capture_output=True)
    out = r.stdout.decode('utf-8', 'replace') + r.stderr.decode('utf-8', 'replace')
    print('--- %d/%d %s' % (i + 1, len(draft), d['slug']))
    print(out.strip())
    if i + 1 < len(draft):
        time.sleep(5)
