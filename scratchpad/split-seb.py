#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Split the three over-long paragraphs of Sebastian of Karaganda's upgrade,
and drop the `new-martyr` type: the Russian calls him «преподобноисповедник»
and he died in peace in 1966, so the martyr slug would be a claim the source
does not make. Each split is made at a sentence end, which is CORPUS §3's rule
for a life's paragraphs.
"""
import io
import json

PATH = '.tmp/ru-drafts/up-2026-10-22.json'
d = json.load(io.open(PATH, encoding='utf-8'))
entry = d['sebastian-of-karaganda']
entry['set']['types'] = ['venerable', 'confessor', 'hieromonk']

paras = entry['life_paragraphs']
SPLITS = [
    (2, 'He was arrested in February 1933'),
    (3, 'After his release he stayed'),
    (5, 'He had a fine humour'),
]
for index, marker in reversed(SPLITS):
    text = paras[index]
    at = text.index(marker)
    paras[index:index + 1] = [text[:at].rstrip(), text[at:]]

over = [len(p) for p in paras if len(p) > 900]
assert not over, over
io.open(PATH, 'w', encoding='utf-8', newline='').write(json.dumps(d, ensure_ascii=False, indent=2) + '\n')
print('%d paragraphs, longest %d' % (len(paras), max(len(p) for p in paras)))
