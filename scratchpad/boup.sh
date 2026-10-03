#!/usr/bin/env bash
# usage: bash scratchpad/boup.sh <civil date, YYYY-MM-DD> <slug> <church>
# The §7 step-7 back-out for an UPGRADE batch, where bo.sh cannot help.
#
# bo.sh exists because `git checkout` cannot restore a folder a batch has only
# just created. The opposite case needs its own tool for the opposite reason:
# on an upgrade the folder *is* tracked, so `git checkout` succeeds — and
# restores it to HEAD, which throws away the upgrade itself along with the
# back-out. That happened on ru-02-11 to `blaise-of-sebaste`: the row came back
# `undocumented` and the upgrade had to be re-applied from a one-entry copy of
# the upgrade file. So this script copies the file aside and copies it back,
# exactly as bo.sh does, and proves the restored bytes against the copy.
#
# An `undocumented` row may not carry a `feast`, so the status flip takes the
# feast and the source with it or `build:manifest` fails on schema before the
# disappearance can be watched. daycount.mjs reads the corpus directly and is
# the measurement.
set -eu
date="$1"
slug="$2"
church="${3:?the church is not optional here — an upgrade batch is per church}"
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
open(p,'w',encoding='utf-8',newline='').write(json.dumps(j,ensure_ascii=False,indent=2)+chr(10))
" "$p" "$church"

echo "=== after"
node .tmp/daycount.mjs "$date" "$slug"

cp "$keep" "$p"
echo "=== restored, byte-identical to the upgraded file:"
PYTHONIOENCODING=utf-8 python -c "
import hashlib,sys
a=hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest()
b=hashlib.sha256(open(sys.argv[2],'rb').read()).hexdigest()
print(a==b)
" "$p" "$keep"
rm -f "$keep"
node .tmp/daycount.mjs "$date" "$slug"
