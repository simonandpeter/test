import io, os, re, sys

ROOT = r"C:\Users\matei\Documents\Agios Website\main"
os.chdir(ROOT)

SRC = "e2e/daily-panel.spec.js"
s = io.open(SRC, encoding="utf-8").read()

# The two download tests, from their section banner to the start of the next test.
BANNER = "/* ---- what the boot fetches, and where a return lands -------------------- */"
start = s.index(BANNER)
tail_anchor = "test('a returning Daily page lands where it was left"
end = s.index(tail_anchor)
moved = s[start:end]
assert moved.count("\ntest(") == 2, "expected exactly 2 tests, got %d" % moved.count("\ntest(")

# Drop the banner (the new file has its own header) and the section comment.
moved = moved[len(BANNER):].lstrip("\n")

rest = s[:start] + s[end:]

HEADER = """import { test, expect } from './fixtures.js';
import { ready } from './helpers.js';

/**
 * **What the boot is allowed to download.**
 *
 * Split out of `daily-panel.spec.js` on 2026-09-12 (author: name a file for
 * what it does). These two tests are not about the Daily page - it is only the
 * route they happen to open, because it is the heaviest one. What they hold is
 * a budget on the first load, and both were written after a review found the
 * site paying it.
 *
 * 2026-08-27: the first download was 470 kB of JavaScript. 293 kB of it was
 * `data/liturgical-days.js`, six months of hand-transcribed pericopes, and
 * 106 kB was all four locale packs - so a reader opening the Map downloaded
 * both to look at neither. Addendum G1, the same week: `manifest.meta.json`
 * was fetched beside the manifest on the path that blocks first paint, and no
 * reader for it existed anywhere in `src/`.
 *
 * **Both assert the shape, not a byte count**, which would go stale the first
 * time a saint was added. And both are network assertions rather than unit
 * tests on purpose: what is claimed is *which requests the boot makes*, and
 * `lib/manifest.js` builds its URLs from `import.meta.env.BASE_URL`, which
 * does not exist under `node --test`. A unit test would have had to fake the
 * thing under test.
 *
 * **These need a real build.** They match `/assets/index-*.js`, which exists
 * in `dist/` and not under the dev server, so they pass only through the
 * project's own Playwright config.
 */

"""

io.open("e2e/download-limiter.spec.js", "w", encoding="utf-8", newline="").write(HEADER + moved)

# Tidy the hole the move left: no more than two blank lines in a row.
rest = re.sub(r"\n{4,}", "\n\n\n", rest)
io.open(SRC, "w", encoding="utf-8", newline="").write(rest)

print("moved 2 tests; daily-panel now has %d" % rest.count("\ntest("))
