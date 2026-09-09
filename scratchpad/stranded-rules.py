# -*- coding: utf-8 -*-
"""Rules that live only in the deleted SESSIONS.md.

One did: "a saint named in a life gets a hyperlink and a `related` row", with a
tool, a refusal table and a test behind it, and nothing in the surviving three
documents mentioned `related` at all. The author hit it before anyone found it.

This looks for the rest. A rule in that file is usually a **bolded lead-in** --
the file's own convention for stating one -- so those are pulled out and each is
scored by whether the nouns it turns on appear anywhere in the live documents.
Low overlap means the rule may have gone with the file.

It is a sieve, not an oracle: the output is a reading list, and most of it will
be history, which is what the cut was for.

    python scratchpad/stranded-rules.py [n]
"""
import io
import re
import subprocess
import sys

LIVE = ' '.join(
    io.open(f, encoding='utf-8').read()
    for f in ('PLAN.md', 'CLAUDE.md', 'HANDOFF.md', 'README.md',
              'docs/saintsbuildplan.md', 'docs/saintsplanaddendum.md')
).lower()

raw = subprocess.run(['git', 'show', '86f3f4c:SESSIONS.md'],
                     capture_output=True, text=True, encoding='utf-8', errors='replace').stdout

# The file states a rule as a bolded sentence opening a paragraph.
leads = re.findall(r'\*\*([^*\n]{25,160}?)\*\*', raw)

STOP = set('''the a an and or of to in is are was were be been it its this that these those
for with on at by from as not no never always only just then than so but if when where
which who whom what how why all any each every both few more most other some such
than too very can will would should could may might must one two three first second
did does do done has have had having been being into over under again further once
here there why how amendment session author page site saint saints day days'''.split())

def nouns(text):
    return {w for w in re.findall(r"[a-z][a-z-]{3,}", text.lower()) if w not in STOP}

rows = []
seen = set()
for lead in leads:
    lead = ' '.join(lead.split())
    key = lead.lower()
    if key in seen:
        continue
    seen.add(key)
    ns = nouns(lead)
    if len(ns) < 3:
        continue
    missing = [n for n in ns if n not in LIVE]
    rows.append((len(missing) / len(ns), len(missing), lead))

rows.sort(reverse=True)
n = int(sys.argv[1]) if len(sys.argv) > 1 else 30
print('%d bolded statements in SESSIONS.md; the %d least represented in the live docs:\n'
      % (len(rows), n))
for share, miss, lead in rows[:n]:
    print('  %3d%% unseen  %s' % (round(share * 100), lead[:118]))
