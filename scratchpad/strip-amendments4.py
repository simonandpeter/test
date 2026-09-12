"""The last eight, against the pristine indentation the restore brought back."""
import io, os, sys

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)
bad = []


def sub(path, old, new, n=1):
    s = io.open(path, encoding="utf-8").read()
    g = s.count(old)
    if g != n:
        bad.append("%s: wanted %d, found %d - %r" % (path, n, g, old[:64]))
        return
    io.open(path, "w", encoding="utf-8", newline="").write(s.replace(old, new))


sub("e2e/chrome.spec.js",
    "  // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here from\n  // Amendment 34 until then.",
    "  // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here\n  // until then.")

sub("src/styles/index.css",
    '   and condense the filters vertically a bit more"). Amendment 13 spent a\n   whole pass on this same measure',
    '   and condense the filters vertically a bit more"). An earlier pass spent\n   a whole sitting on this same measure')

sub("src/styles/index.css",
    "     545 \u2014 9.5 px of margin, which is thin, and Amendment 24 is the standing\n     warning that",
    "     545 \u2014 9.5 px of margin, which is thin, and the standing warning is\n     that")

for pack in ("el", "ro", "ru", "sr"):
    sub("src/ui/locales/%s.js" % pack,
        "         English button makes was invisible outside English - Amendment 49\n         raised exactly this and left it to the author",
        "         English button makes was invisible outside English - this was\n         raised and left to the author")

sub("src/ui/strings.js",
    """     * name \u2014 "The Orthodox Saint" \u2014 a split four comments in this repo
     * attributed to "Amendment 31", which is a corpus batch of 559 saint
     * folders and says nothing about titles. The split is gone and so is the
     * citation.""",
    """     * name \u2014 "The Orthodox Saint". Four comments justified that split by
     * citing a numbered amendment; chased on 2026-09-12, the number turned out
     * to name a corpus batch of 559 saint folders and to say nothing about
     * titles. The split is gone and so is the citation.""")

if bad:
    print("PROBLEMS (%d):" % len(bad))
    for b in bad:
        print("  " + b)
    sys.exit(1)
print("ok")
