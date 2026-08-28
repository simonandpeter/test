"""Render the BRAND wordmark to an SVG path, from the stamp face's own outlines.

The masthead used to be live text in GFS Nicefore at `font-display: swap`, and
that face is the only one in the project that is not preloaded — so a cold load
showed Literata until the file landed and then swapped. A path has no such
window.

Run it again if BRAND, the face, or the letter-spacing changes:

    python scripts/make_wordmark.py

It writes src/ui/wordmark.js. The geometry mirrors base.css exactly:
letter-spacing 0.04em between adjacent glyphs, and the gap between the two words
is a space set at 0.5em, whose advance is therefore half the space's own.
"""

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONT = 'src/fonts/gfs-nicefore.woff2'
WORDS = ['Daily', 'Dox']
TRACKING = 0.04   # base.css: .site-name letter-spacing
GAP_EM = 0.5      # base.css: .brand-gap font-size

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

body = ''.join(parts)
# y is flipped: font outlines run upwards from the baseline, SVG runs down.
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {-ascent} {width:.2f} {ascent - descent}" '
    f'style="height:{(ascent - descent) / upem}em" '
    f'role="img" aria-label="{" ".join(WORDS)}" focusable="false" class="brand-mark">'
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
 * and swapped it a moment later (author, 2026-08-28: "Daily Dox still sometimes
 * opens with literata on loading screen and title before updating to the new
 * font"). A path has no loading window at all.
 *
 * The geometry is base.css's: {TRACKING}em between adjacent glyphs, and the gap
 * between the words is a space set at {GAP_EM}em. `fill: currentColor` keeps it
 * following the ink it sits in, and the viewBox scales it to whatever font-size
 * its box is given.
 */
export const WORDMARK = `{svg}`;

/** The wordmark's aspect, so a caller can size it by height alone. */
export const WORDMARK_RATIO = {width / (ascent - descent):.4f};
'''
open('src/ui/wordmark.js', 'w', encoding='utf-8', newline='').write(out)
print(f'width {width:.1f}/{upem} em, ascent {ascent}, descent {descent}, ratio {width / (ascent - descent):.4f}')
