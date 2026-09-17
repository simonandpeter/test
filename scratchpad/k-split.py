"""Stage K — break over-long life.md body paragraphs at sentence boundaries.

Changes whitespace only: a sentence-ending whitespace run becomes a blank line.
Every file is proved by collapsing all whitespace before and after.
"""
import os
import re
import sys
import textwrap

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'saints')

SPLIT_OVER = 900      # only paragraphs longer than this are touched
TARGET = 600          # aim for chunks near this
MIN_CHUNK = 280       # never leave a chunk shorter than this
MIN_FIRST = 300       # the first body chunk feeds the tiles' 3-line lede

ABBREV = set("""st sts ss fr frs mr mrs ms dr drs prof rev vol vols ch chs cf ca c d b r no nos
vs etc jr sr bp abp met archim archm hierom hieromon gk lat cent ad bc ap pp viz al ff
jan feb mar apr jun jul aug sept sep oct nov dec approx fl lit trans ed eds p pt
i ii iii iv v vi vii viii ix x xi xii xiii xiv xv xvi xvii xviii xix xx""".split())

SENT = re.compile(r'[.!?][»”’"\'\)\]]*(\s+)(?=\S)')
WORD_BEFORE = re.compile(r'([\wЀ-ӿͰ-Ͽ]+)[.!?][»”’"\'\)\]]*$')
CONTEXTS = []
OPENERS = '«“‘"\'*(['


def candidates(block):
    """Offsets (start, end) of whitespace runs that end a sentence."""
    out = []
    for m in SENT.finditer(block):
        ws_start, ws_end = m.span(1)
        head = block[:m.start()]
        # the word carrying the stop must not be an abbreviation or an initial
        wm = WORD_BEFORE.search(block[:ws_start])
        if wm:
            w = wm.group(1)
            if w.lower() in ABBREV:
                continue
            if len(w) == 1 and w.isupper():
                continue
        # never break inside emphasis or a markdown link
        if head.count('*') % 2:
            continue
        if head.count('[') != head.count(']'):
            continue
        if head.count('(') != head.count(')'):
            continue
        # the next sentence must open like one
        tail = block[ws_end:]
        j = 0
        while j < len(tail) and tail[j] in OPENERS:
            j += 1
        if j >= len(tail):
            continue
        ch = tail[j]
        if not (ch.isupper() or ch.isdigit()):
            continue
        out.append((ws_start, ws_end))
    return out


def choose(block, cands, first_para):
    """Greedy balanced pick of break offsets."""
    total = len(block)
    k = max(2, round(total / TARGET))
    target = total / k
    picks = []
    last = 0
    for i, (s, e) in enumerate(cands):
        remaining_breaks = k - 1 - len(picks)
        if remaining_breaks <= 0:
            break
        chunk = s - last
        floor = MIN_FIRST if (first_para and not picks) else MIN_CHUNK
        if chunk < floor:
            continue
        nxt = cands[i + 1][0] - last if i + 1 < len(cands) else total - last
        # break here if this chunk is closer to target than the next one would be
        if chunk >= target or abs(chunk - target) <= abs(nxt - target):
            if total - s < MIN_CHUNK:      # would leave a stub tail
                break
            picks.append((s, e))
            last = e
    return picks


def rewrite(block, first_para):
    if len(block) <= SPLIT_OVER:
        return block
    stripped = block.lstrip()
    if not stripped or stripped[0] in '#>|-*' or re.match(r'^\d+[.)]\s', stripped):
        return block
    cands = candidates(block)
    if not cands:
        return block
    picks = choose(block, cands, first_para)
    if not picks:
        return block
    chunks = []
    last = 0
    for s, e in picks:
        CONTEXTS.append((' '.join(block[max(0, s - 45):s].split()),
                         ' '.join(block[e:e + 45].split())))
        chunks.append(block[last:s])
        last = e
    chunks.append(block[last:])
    lines = block.split('\n')
    if len(lines) > 1:
        width = max(len(l) for l in lines)
        if width <= 100:                   # hard-wrapped: re-flow each chunk
            chunks = [textwrap.fill(c, width=width, break_long_words=False,
                                    break_on_hyphens=False) for c in chunks]
    return '\n\n'.join(chunks)


def process(text):
    parts = re.split(r'(\n[ \t]*\n\s*)', text)
    blocks = list(range(0, len(parts), 2))
    # part 0 is the heading, the last non-empty block is the citation
    body = [i for i in blocks[1:] if parts[i].strip()]
    if body and parts[body[-1]].lstrip().startswith('*'):
        body = body[:-1]
    changed = 0
    for n, i in enumerate(body):
        new = rewrite(parts[i], n == 0)
        if new != parts[i]:
            parts[i] = new
            changed += 1
    return ''.join(parts), changed


def collapse(s):
    return ' '.join(s.split())


def main():
    write = '--write' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    lo, hi = (args + ['', '￿'])[:2]
    touched, paras, bad = [], 0, []
    for slug in sorted(os.listdir(ROOT)):
        if not (lo <= slug <= hi):
            continue
        p = os.path.join(ROOT, slug, 'life.md')
        if not os.path.isfile(p):
            continue
        with open(p, encoding='utf-8') as f:
            old = f.read()
        new, n = process(old)
        if not n:
            continue
        if collapse(old) != collapse(new):
            bad.append(slug)
            continue
        touched.append(slug)
        paras += n
        if write:
            with open(p, 'w', encoding='utf-8', newline='') as f:
                f.write(new)
    if '--contexts' not in sys.argv:
        for s in touched:
            print(s)
    print(f'--- {len(touched)} files, {paras} paragraphs split, {len(bad)} refused')
    for s in bad:
        print('REFUSED', s)
    if '--contexts' in sys.argv:
        for a, b in CONTEXTS:
            print(f'{a}  ||  {b}')


if __name__ == '__main__':
    main()
