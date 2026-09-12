"""The five whose number sat on the line after the word."""
import io, os, sys

os.chdir(r"C:\Users\matei\Documents\Agios Website\main")
bad = []


def sub(path, old, new, n=1):
    s = io.open(path, encoding="utf-8").read()
    g = s.count(old)
    if g != n:
        bad.append("%s: wanted %d, found %d - %r" % (path, n, g, old[:64]))
        return
    io.open(path, "w", encoding="utf-8", newline="").write(s.replace(old, new))


sub("src/data/churches.js",
    ' * Romanian and Greek, "for now", and the Serbian from 2026-08-23 (Amendment\n * 29). One entry per church the site offers; the',
    ' * Romanian and Greek, "for now", and the Serbian from 2026-08-23. One entry\n * per church the site offers; the')

sub("e2e/index-controls.spec.js",
    "  // Serbian, and the *lives* are not \u2014 a machine-translated life is Amendment\n  // 2's forbidden invention.",
    "  // Serbian, and the *lives* are not \u2014 a machine-translated life is the\n  // invention the corpus rule forbids.")

sub("e2e/index-grid.spec.js",
    "  // cold load at 1280 laid two columns into a three-column width (Amendment\n  // 26). That race cannot be staged on demand",
    "  // cold load at 1280 laid two columns into a three-column width. That race\n  // cannot be staged on demand")

sub("tests/liturgical-days.test.mjs",
    " *     (Amendments 29 and 31). The one allowed gap is the Greek from 7 to 19",
    " *     The one allowed gap is the Greek from 7 to 19")

sub("docs/CORPUS.md",
    "writers of Amendments 31\u201345 lived in `.tmp/`",
    "writers of the bulk tranches lived in `.tmp/`")

if bad:
    print("PROBLEMS (%d):" % len(bad))
    for b in bad:
        print("  " + b)
    sys.exit(1)
print("ok")
