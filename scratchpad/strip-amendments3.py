"""The last references, with the line breaks the second pass guessed wrong."""
import io, os, re, sys

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)
bad = []


def sub(path, old, new, n=1):
    s = io.open(path, encoding="utf-8").read()
    g = s.count(old)
    if g != n:
        bad.append("%s: wanted %d, found %d - %r" % (path, n, g, old[:70]))
        return
    io.open(path, "w", encoding="utf-8", newline="").write(s.replace(old, new))


NOINV = "the corpus's no-invention rule"

sub("e2e/chrome.spec.js", " * which is why Amendment 34 took the gold out.", " * which is why the gold was taken out.")
sub("e2e/chrome.spec.js", " // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here from\n // Amendment 34 until then.",
    " // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here\n // until then.")
sub("e2e/chrome.spec.js", " // recorded seam of Amendment 36.", " // recorded seam.")
sub("e2e/chrome.spec.js", " * one thing Amendment 2 forbids.", " * one thing %s forbids." % NOINV)

sub("src/lib/saint-name.js", " * than Amendment 50 asked for, on purpose", " * than was asked for, on purpose")
sub("src/ui/coachmark.js", " * plainly because PLAN.md and Amendment 23 both rest on it. From",
    " * plainly because PLAN.md rests on it. From")
sub("src/views/map.js", " * Amendment 46 already said the map counts by", " * the map was already said to count by")
sub("src/views/index/grid.js", " * A card's name box, by line count \u2014 the same collapse the rows got at\n * Amendment 56, a day later",
    " * A card's name box, by line count \u2014 the same collapse the rows got,\n * a day later")
sub("src/styles/index.css", ' and condense the filters vertically a bit more"). Amendment 13 spent a\n whole pass on this same measure',
    ' and condense the filters vertically a bit more"). An earlier pass spent a\n whole sitting on this same measure')
sub("src/styles/index.css", " 545 \u2014 9.5 px of margin, which is thin, and Amendment 24 is the standing\n warning that",
    " 545 \u2014 9.5 px of margin, which is thin, and the standing\n warning is that")

for pack in ("el", "ro", "ru", "sr"):
    sub("src/ui/locales/%s.js" % pack, "English button makes was invisible outside English - Amendment 49\n raised exactly this and left it to the author",
        "English button makes was invisible outside English - this was\n raised and left to the author")

sub("e2e/index-controls.spec.js", " * wider than Arial (Amendment 24, again) and the row wraps there.",
    " * wider than Arial (the width budget, again) and the row wraps there.")
sub("tests/saint-name.test.mjs", " * comma cases. Narrower than Amendment 50 asked for, and said so here",
    " * comma cases. Narrower than was asked for, and said so here")
sub("scripts/corpus-index.mjs", " * **The feast index is the one that matters.** Amendment 45 found this the",
    " * **The feast index is the one that matters.** This was found the")
sub("scripts/corpus-index.mjs", " * calendar it reckons in \u2014 the key Amendment 45 actually used",
    " * calendar it reckons in \u2014 the key actually used")
sub("scripts/draft-saint.mjs", " * pipeline and the review workflow, never the corpus. Amendment 43 then\n * measured the temptation and priced it",
    " * pipeline and the review workflow, never the corpus. The temptation was\n * then measured and priced")

sub("src/ui/strings.js", """     * name \u2014 "The Orthodox Saint" \u2014 a split four comments in this repo
     * attributed to "Amendment 31", which is a corpus batch of 559 saint
     * folders and says nothing about titles. The split is gone and so is the
     * citation.""",
    """     * name \u2014 "The Orthodox Saint". Four comments justified that split by
     * citing a numbered amendment; chased on 2026-09-12, the number turned out
     * to name a corpus batch of 559 saint folders and to say nothing about
     * titles. The split is gone and so is the citation.""")

sub("docs/CORPUS.md", "can read what they are writing down. Amendment 45 is where the method was\nsettled",
    "can read what they are writing down. The method was settled a week later,\nand it says")
sub("docs/CORPUS.md", "and it says so in its own words:", "in its own words:")
sub("docs/CORPUS.md", " Amendment 88 used it for all eleven of the great names.",
    " it was used for all eleven of the great names.")

if bad:
    print("PROBLEMS (%d):" % len(bad))
    for b in bad:
        print("  " + b)
    sys.exit(1)
print("ok")
