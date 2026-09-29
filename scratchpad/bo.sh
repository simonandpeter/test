#!/usr/bin/env bash
# usage: bash scratchpad/bo.sh <civil date, 2027-MM-DD> <slug> [church]
# The §7 step-7 back-out, measured where it can actually be watched.
# Two reasons this is a script and not three commands:
#   - an `undocumented` row may not carry a `feast`, so the status flip must
#     take the feast and source with it or `build:manifest` fails on schema;
#   - `git checkout` cannot restore a folder the batch has only just created,
#     so the file is copied aside and copied back rather than checked out.
set -eu
date="$1"
slug="$2"
church="${3:-romanian}"
cd "$(dirname "$0")/.."
p="saints/$slug/saint.json"
keep="$(mktemp)"
cp "$p" "$keep"

echo "=== before"
node .tmp/daycount.mjs "$date" "$slug"

PYTHONIOENCODING=utf-8 python -c "
import json,sys
p=sys.argv[1]
j=json.load(open(p,encoding='utf-8'))
for a in j['attestations']:
    if a['church']==sys.argv[2]:
        assert a['status']=='venerated', a['status']
        a['status']='undocumented'; a.pop('feast',None); a.pop('source',None)
open(p,'w',encoding='utf-8').write(json.dumps(j,ensure_ascii=False,indent=2)+chr(10))
" "$p" "$church"

npm run build:manifest 2>&1 | grep -E 'Built|failed'
echo "=== after"
node .tmp/daycount.mjs "$date" "$slug"

cp "$keep" "$p"; rm -f "$keep"
npm run build:manifest 2>&1 | grep -E 'Built|failed'
echo "=== restored, and byte-identical to the batch record:"
PYTHONIOENCODING=utf-8 python -c "
import json,hashlib,os,sys,glob
slug=sys.argv[1]
h=hashlib.sha256(open(os.path.join('saints',slug,'saint.json'),'rb').read()).hexdigest()
hits=[]
for f in glob.glob('.tmp/corpus-batches/*.json'):
    for e in json.load(open(f,encoding='utf-8'))['folders']:
        if e['slug']==slug: hits.append((os.path.basename(f), e['hash']==h))
print(hits or 'no batch record holds this slug — it is an upgrade, so check git diff instead')
" "$slug"
git diff --stat -- "$p"
