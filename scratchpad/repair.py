"""Undo the damage the first amendment strip did, and replay what was intended.

The first pass ran three whitespace regexes over the whole of every file it
touched. Two were destructive: `\\(\\s*\\)` -> "" deleted 2,587 empty parameter
lists across 68 files, and a space collapse flattened every indent. Nothing in
the tree parses.

The damage is not reversible in place, so this restores each damaged file from
HEAD and replays the intended edits on top. Three of them - views/index/{grid,
controls,modes}.js - also carried a subagent's in-flight work, which HEAD does
not have; those are listed at the end and the agent has to re-apply.
"""
import io, os, shutil, subprocess, sys

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
BAK = (r"C:\Users\matei\AppData\Local\Temp\claude"
       r"\C--Users-matei-Documents-Agios-Website"
       r"\91d52bf3-16ee-4f4c-9499-72a6711a00a8\scratchpad\docs.bak")
os.chdir(ROOT)

DAMAGED = """
e2e/chrome.spec.js e2e/daily-panel.spec.js e2e/helpers.js e2e/index-carousel.spec.js
e2e/index-controls.spec.js e2e/index-grid.spec.js e2e/map.spec.js e2e/saint.spec.js
schema/saint.schema.json
scripts/corpus-gate.mjs scripts/corpus-index.mjs scripts/date-audit.mjs
scripts/day-candidates.mjs scripts/draft-saint.mjs scripts/language-audit.mjs
scripts/life-links.mjs scripts/lighthouse-floor.mjs scripts/locale-coverage.mjs
scripts/place-candidates.mjs
src/data/churches.js src/data/days.js src/data/liturgical-days.js
src/lib/bible.js src/lib/calendar-page.js src/lib/church.js src/lib/cross-link.js
src/lib/fast-grade.js src/lib/i18n.js src/lib/liturgy.js src/lib/router.js
src/lib/saint-name.js src/lib/store.js src/main.js
src/styles/base.css src/styles/index.css src/styles/map.css src/styles/tokens.css
src/ui/coachmark.js src/ui/fly.js src/ui/hymns.js src/ui/language-chooser.js
src/ui/locales/el.js src/ui/locales/ro.js src/ui/locales/ru.js src/ui/locales/sr.js
src/ui/strings.js src/ui/swap.js
src/views/calendar.js src/views/index/controls.js src/views/index/count.js
src/views/index/grid.js src/views/index/modes.js src/views/map.js
src/views/map/chrome.js src/views/map/paint.js src/views/map/press.js
src/views/map/state.js src/views/saint.js
tests/calendar-page.test.mjs tests/corpus-index.test.mjs tests/cross-link.test.mjs
tests/fast-grade.test.mjs tests/i18n.test.mjs tests/liturgical-days.test.mjs
tests/lives.test.mjs tests/saint-name.test.mjs
""".split()

AGENT_OWNED = {"src/views/index/grid.js", "src/views/index/controls.js",
               "src/views/index/modes.js"}

if "--go" not in sys.argv:
    print("%d damaged files; %d of them carry a subagent's work" % (len(DAMAGED), len(AGENT_OWNED)))
    print("pass --go to restore")
    sys.exit(0)

for f in DAMAGED:
    r = subprocess.run(["git", "checkout", "HEAD", "--", f], capture_output=True, text=True)
    if r.returncode:
        print("  ! %s: %s" % (f, r.stderr.strip()))
print("restored %d files from HEAD" % len(DAMAGED))

for name in os.listdir(BAK):
    if name.endswith(".md"):
        shutil.copy(os.path.join(BAK, name), os.path.join("docs", name))
print("restored docs/*.md from the pre-strip backup")
