"""The 62 mid-sentence `Amendment N` references the mechanical pass could not take.

Each is rewritten to name the rule rather than a number. Where the sentence
only pointed, the pointer goes; where it stated something, the statement stays.
Every substitution asserts it matched exactly once.
"""
import io, os, re, sys

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


NOINV = "the corpus's no-invention rule"

# ---- Amendment 2: the no-invented-content rule -----------------------------
sub("src/lib/i18n.js", "the invented content Amendment 2 forbids", "the invented content %s forbids" % NOINV)
sub("src/ui/hymns.js", "Amendment 2 forbade that from", "%s forbade that from" % NOINV)
sub("src/ui/strings.js", "Amendment 2 forbade rendering anything here", "%s forbade rendering anything here" % NOINV)
sub("src/ui/strings.js", "Amendment 2 forbids the machine translation", "%s forbids the machine translation" % NOINV)
sub("src/views/saint.js", "Amendment 2 forbids exactly that", "%s forbids exactly that" % NOINV)
sub("e2e/chrome.spec.js", "the * one thing Amendment 2 forbids", "the * one thing %s forbids" % NOINV)
sub("e2e/saint.spec.js", "reversing Amendment 2 for hymns alone", "reversing %s for hymns alone" % NOINV)
sub("tests/i18n.test.mjs", "typography is what Amendment 2 forbids", "typography is what %s forbids" % NOINV)
sub("schema/saint.schema.json", "which Amendment 2 forbade from", "which %s forbade from" % NOINV)

# ---- rules whose sentence names them anyway --------------------------------
sub("src/lib/cross-link.js", "Amendment 41 is the same finding in Greek", "The same finding was made in Greek")
sub("src/lib/liturgy.js", "the arrangement Amendment 36 settled", "the arrangement the packs settled")
sub("src/lib/liturgy.js", "Amendment 36 recorded that as an accepted seam and HANDOFF has",
    "That is an accepted seam rather than an oversight, and HANDOFF has")
sub("src/lib/saint-name.js", "(`lib/honorific.js`, Amendment 50: \"the", "(`lib/honorific.js`: \"the")
sub("src/lib/saint-name.js", "the exact case Amendment 50 flagged and left", "the exact case flagged and left at the time")
sub("src/lib/saint-name.js", "narrower * than Amendment 50 asked for", "narrower * than was asked for")
sub("src/ui/swap.js", "Amendment 9: anything still in flight", "The rule: anything still in flight")
sub("src/ui/coachmark.js", "PLAN.md and * Amendment 23 both rest on it", "PLAN.md * rests on it")
sub("src/ui/strings.js", "// Amendment 44: the day's calendar is recorded", "// The day's calendar is recorded")
sub("src/ui/strings.js", "read by nothing after Amendment 77", "read by nothing since the map's chrome was cut back")
sub("src/views/map.js", "recorded in Amendment 77 rather than absorbed", "recorded rather than absorbed")
sub("src/views/map.js", "which * Amendment 46 already said the map counts by", "which * the map was already said to count by")
sub("src/views/index/count.js", "and Amendment 49 answered that by hiding", "and an earlier answer hid")
sub("src/views/index/grid.js", "the rows got at * Amendment 56, a day later", "the rows got, a day later")
sub("src/styles/index.css", "Amendment 13 spent a whole pass on this same measure", "An earlier pass spent a whole sitting on this same measure")
sub("src/styles/index.css", "and * Amendment 24 is the standing warning that", "and * the standing warning is that")

for pack in ("el", "ro", "ru", "sr"):
    sub("src/ui/locales/%s.js" % pack, "Amendment 49 raised exactly this and left it to the author",
        "This was raised and left to the author")

# ---- the width budget (was Amendment 24) -----------------------------------
sub("e2e/index-controls.spec.js", "wider than Arial * (Amendment 24, again)", "wider than Arial * (the width budget, again)")
sub("e2e/index-controls.spec.js", "(Amendment 24; it was 400", "(the width budget; it was 400")
sub("e2e/index-controls.spec.js", "metrics. Amendment 24.", "metrics.")
sub("e2e/index-controls.spec.js", "Amendment 24 records the same failure", "The width budget records the same failure")
sub("e2e/index-controls.spec.js", "a row Amendment 24 already records as tight", "a row already recorded as tight")
sub("e2e/index-controls.spec.js", "Measured the way Amendment 24 measures the foot", "Measured the way the foot is measured")
sub("e2e/index-controls.spec.js", "The boundary of Amendment 36", "The boundary of the language rule")

# ---- the rest --------------------------------------------------------------
sub("e2e/chrome.spec.js", "which is why * Amendment 34 took the gold out", "which is why * the gold was taken out")
sub("e2e/chrome.spec.js", "Ink here from // Amendment 34 until then.", "Ink here until then.")
sub("e2e/chrome.spec.js", "the // recorded seam of Amendment 36.", "the // recorded seam.")
sub("e2e/index-grid.spec.js", "// Amendment 30. The corpus went from eight lives", "// The corpus went from eight lives")
sub("e2e/saint.spec.js", "so Amendment 41 could only reach", "so it could only reach")
sub("tests/corpus-index.test.mjs", "Amendment 45 settled that candidates are deduped", "It was settled that candidates are deduped")
sub("tests/fast-grade.test.mjs", "Before Amendment 44 the phrase matched nothing", "Before the fix the phrase matched nothing")
sub("tests/liturgical-days.test.mjs", "Amendment 44 (author: \"Do the Romanian", "Author: \"Do the Romanian")
sub("tests/saint-name.test.mjs", "(Amendment 50 flagged it and left it", "(flagged and left at the time")
sub("tests/saint-name.test.mjs", "Narrower than * Amendment 50 asked for", "Narrower than * was asked for")
sub("scripts/corpus-index.mjs", "Amendment 45 found this the * expensive way", "This was found the * expensive way")
sub("scripts/corpus-index.mjs", "the key * Amendment 45 actually used", "the key * actually used")
sub("scripts/draft-saint.mjs", "Amendment 43 then * measured the temptation and priced it",
    "The temptation was then * measured and priced")
sub("scripts/draft-saint.mjs", "// Amendment 86: no point beats a wrong one.", "// No point beats a wrong one.")
sub("scripts/draft-saint.mjs", "in the order Amendment 45 earned", "in the order they were earned")
sub("scripts/lighthouse-floor.mjs", "(Amendment 66: a millisecond budget", "(a millisecond budget")

# ---- my own note in strings.js, which cited the number to disprove it ------
sub("src/ui/strings.js", """     * name \u2014 "The Orthodox Saint" \u2014 a split four comments in this repo
     * attributed to "Amendment 31", which is a corpus batch of 559 saint
     * folders and says nothing about titles. The split is gone and so is the
     * citation.""",
    """     * name \u2014 "The Orthodox Saint". Four comments justified that split by
     * citing a numbered amendment; chased on 2026-09-12, the number turned out
     * to name a corpus batch of 559 saint folders and to say nothing about
     * titles. The split is gone and so is the citation.""")

# ---- docs/CORPUS.md --------------------------------------------------------
C = "docs/CORPUS.md"
sub(C, "| **Amendment 31** \u2014 three weeks \u00d7 four churches |", "| **the bulk tranche** \u2014 three weeks \u00d7 four churches |")
sub(C, "| **Amendments 74\u201383**, one civil day per sitting |", "| **nine sittings**, one civil day each |")
sub(C, "| **Amendment 88** \u2014 eleven great names the runway had missed |", "| **eleven great names** the runway had missed |")
sub(C, "Amendment 31 added\n559 folders in one sitting", "That tranche added\n559 folders in one sitting")
sub(C, "Amendment 45 is where the method was settled", "The method was settled a week later")
sub(C, "Amendment 43 then measured it", "It was then measured")
sub(C, "which is why Amendment 88 used it for all eleven", "which is why it was used for all eleven")
sub(C, "Amendment 43 is the measurement: 17 of 331.", "The measurement: 17 of 331.")
sub(C, "**Amendment 86: no point beats a wrong one.**", "**No point beats a wrong one.**")
sub(C, "Amendment 31: a\nfeast, its fore- and after-feast", "A\nfeast, its fore- and after-feast")
sub(C, "Amendment 79's second half was found this way", "The second half of one batch was found this way")

if bad:
    print("PROBLEMS (%d):" % len(bad))
    for b in bad:
        print("  " + b)
    sys.exit(1)
print("ok")
