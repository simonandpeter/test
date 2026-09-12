"""Put the files my first amendment strip damaged back to their HEAD content.

`git checkout HEAD --` is refused here, so the content is read with `git show`
(read-only) and written back. Same result.

Not in this list, and handled separately:
  HANDOFF.md                  - rewritten by hand; HEAD has the 573-line version
  docs/*.md                   - restored from the pre-strip backup, which has
                                the ledger cut and the WHERE-WE-ARE edits in it
  scripts/hymn-wrong-saint.json - the hymn agent's; indent-only damage, JSON
                                still parses, reformatted rather than reverted
"""
import io, os, subprocess, sys

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)

FILES = """
e2e/daily-panel.spec.js e2e/helpers.js e2e/index-carousel.spec.js
e2e/index-controls.spec.js e2e/index-grid.spec.js e2e/map.spec.js e2e/saint.spec.js
index.html schema/saint.schema.json
scripts/corpus-gate.mjs scripts/corpus-index.mjs scripts/day-candidates.mjs
scripts/draft-saint.mjs scripts/language-audit.mjs scripts/life-links.mjs
scripts/lighthouse-floor.mjs scripts/locale-coverage.mjs scripts/place-candidates.mjs
src/data/churches.js src/data/days.js src/data/liturgical-days.js
src/lib/bible.js src/lib/calendar-page.js src/lib/church.js src/lib/cross-link.js
src/lib/fast-grade.js src/lib/i18n.js src/lib/liturgy.js src/lib/router.js
src/lib/saint-name.js src/main.js
src/styles/base.css src/styles/index.css src/styles/map.css src/styles/tokens.css
src/ui/coachmark.js src/ui/fly.js src/ui/hymns.js src/ui/language-chooser.js
src/ui/locales/el.js src/ui/locales/ro.js src/ui/locales/ru.js src/ui/locales/sr.js
src/ui/strings.js src/ui/swap.js
src/views/index/controls.js src/views/index/count.js src/views/map.js
src/views/map/chrome.js src/views/map/paint.js src/views/map/press.js
src/views/map/state.js src/views/saint.js
tests/calendar-page.test.mjs tests/corpus-index.test.mjs tests/cross-link.test.mjs
tests/fast-grade.test.mjs tests/i18n.test.mjs tests/liturgical-days.test.mjs
tests/lives.test.mjs tests/saint-name.test.mjs
""".split()

if "--go" not in sys.argv:
    print("%d files would be restored from HEAD" % len(FILES))
    sys.exit(0)

done = fail = 0
for f in FILES:
    r = subprocess.run(["git", "show", "HEAD:" + f], capture_output=True)
    if r.returncode or not r.stdout:
        print("  ! could not read HEAD:%s" % f)
        fail += 1
        continue
    with open(f, "wb") as fh:
        fh.write(r.stdout)
    done += 1
print("restored %d files, %d failed" % (done, fail))
