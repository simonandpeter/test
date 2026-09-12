"""Render the masthead to SVG paths, from the stamp face's own outlines.

The masthead used to be live text in GFS Nicefore at `font-display: swap`, and
that face is the only one in the project that is not preloaded — so a cold load
showed Literata until the file landed and then swapped. A path has no such
window, which is the whole reason this script exists.

Run it again if WORDS, LABEL, the face, or the letter-spacing changes:

    python scripts/make_wordmark.py

It writes src/ui/wordmark.js. The geometry mirrors base.css exactly:
letter-spacing 0.04em between adjacent glyphs, and — when WORDS holds more than
one — a gap that is a space set at 0.5em, whose advance is therefore half the
space's own.
"""

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONT = 'src/fonts/gfs-nicefore.woff2'
# What is drawn, since 2026-09-10 (author: replace the wordmark with "AGIOS"
# set in the mockup's display face). The mockup writes it `Agios`, which is the
# same five outlines: GFS Nicefore is a titling face and its lowercase
# codepoints map to the capital glyphs — `a` and `A` are one glyph with one
# advance — so the case of this string changes nothing about the drawing.
WORDS = ['AGIOS']
# The accessible name a screen reader is given for the mark. It matched the
# drawn word from 2026-09-12, when the site became AGIOS everywhere; before
# that the site and the mark were deliberately different names. Keep it equal
# to `WORDS` unless that is chosen again — PLAN.md §3 "The name" lists every
# other place the brand is written down, and they all move together.
LABEL = 'AGIOS'
TRACKING = 0.04   # base.css: .site-name letter-spacing
GAP_EM = 0.5      # base.css: .brand-gap font-size, if WORDS is ever two again

font = TTFont(FONT)
upem = font['head'].unitsPerEm
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font['hmtx']

track = TRACKING * upem
space = hmtx[cmap[ord(' ')]][0] * GAP_EM

parts, x = [], 0.0
for i, word in enumerate(WORDS):
    if i:
        x += space + track
    for j, ch in enumerate(word):
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(f'<path transform="translate({x:.2f} 0)" d="{d}"/>')
        x += hmtx[name][0]
        if j < len(word) - 1:
            x += track

# The viewBox is the typographic ascent-to-descent box, and the inline height
# maps it back onto the em: 900 units tall at 0.9em means 1000 units is 1em, so
# the mark is exactly the size the text was at the same font-size.
ascent = font['OS/2'].sTypoAscender
descent = font['OS/2'].sTypoDescender
width = x

DRAWN = ' '.join(WORDS)
body = ''.join(parts)
# y is flipped: font outlines run upwards from the baseline, SVG runs down.
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-ascent} {width:.2f} {ascent - descent}" '
    f'style="height:{(ascent - descent) / upem}em" '
    f'role="img" aria-label="{LABEL}" focusable="false" class="brand-mark">'
    f'<g transform="scale(1 -1)" fill="currentColor">{body}</g></svg>'
)

out = f'''/**
 * The masthead, as outlines rather than as text.
 *
 * **Generated — do not edit.** `python scripts/make_wordmark.py` rebuilds it
 * from src/fonts/gfs-nicefore.woff2, and the script is the place to change the
 * words, the face or the tracking.
 *
 * The stamp face is the only one here that is not preloaded, and it is the only
 * one at `font-display: swap` — so a cold load printed the masthead in Literata
 * and swapped it a moment later (author, 2026-08-28: "AGIOS still sometimes
 * opens with literata on loading screen and title before updating to the new
 * font"). A path has no loading window at all.
 *
 * **It draws {DRAWN} and it is named {LABEL}, on purpose** (author, 2026-09-10).
 * The mark is the mockup's, in the mockup's own display face; the accessible
 * name is the site's, which the PWA manifest, the README and the `<title>`
 * split all still carry. `scripts/make_wordmark.py` argues both.
 *
 * The geometry is base.css's: {TRACKING}em between adjacent glyphs, and the gap
 * between two words, if there are ever two again, is a space set at {GAP_EM}em.
 * `fill: currentColor` keeps it following the ink it sits in, and the viewBox
 * scales it to whatever font-size its box is given.
 */
export const WORDMARK = `{svg}`;

/** The wordmark's aspect, so a caller can size it by height alone. */
export const WORDMARK_RATIO = {width / (ascent - descent):.4f};
'''
open('src/ui/wordmark.js', 'w', encoding='utf-8', newline='').write(out)
print(f'width {width:.1f}/{upem} em, ascent {ascent}, descent {descent}, ratio {width / (ascent - descent):.4f}')
