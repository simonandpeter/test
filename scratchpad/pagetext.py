#!/usr/bin/env python
"""Strip a cached or fetched page to readable text. Reads a local file path."""
import io
import re
import sys

p = sys.argv[1]
raw = io.open(p, 'rb').read()
for enc in ('utf-8', 'cp1251'):
    try:
        t = raw.decode(enc)
        break
    except UnicodeDecodeError:
        continue
t = re.sub(r'(?is)<(script|style|head)[^>]*>.*?</\1>', ' ', t)
t = re.sub(r'(?i)<br\s*/?>', '\n', t)
t = re.sub(r'(?i)</(p|div|tr|li|h\d)>', '\n', t)
t = re.sub(r'(?s)<[^>]+>', ' ', t)
import html as H
t = H.unescape(t)
t = re.sub(r'[ \t\xa0]+', ' ', t)
t = re.sub(r'\n\s*\n+', '\n', t)
sys.stdout.write(t.strip())
