# Handoff

**`CLAUDE.md`** is how to work and where things live. **`PLAN.md`** is what the
site should be. This file is **state and what is in flight, and nothing else**.
Finished work is in `git log`; `git log --grep` searches it.

**Verify anything here before you build on it.** This file was 573 lines on
2026-09-12, nine tenths of it narratives of finished sittings. The trim kept
"Known and unfixed" on the strength of its heading and checked none of its four
items — one had been fixed three days earlier. If you are about to append your
sitting's record here, put it in the commit message instead.

---

## State, end of 2026-09-12

**Nothing is committed and nothing is pushed.** Local `HEAD` is `b0b48f4`,
remote is `46dbbaf`, so **3 commits predate this sitting and are still
unpushed**; everything below is on top of them as an uncommitted working tree.
`bash scripts/state.sh` is the truth about this — `git status` lies here,
because a PAT push never updates `origin/main`.

- **392 unit tests pass**, gate green, every file parses, `locale-coverage` 0.
- **862 saints**, 1,221 attestations, 126 undated, 130 icons. 144 day records,
  23 Aug 2026 – 13 Jan 2027; the corpus reaches 28 September 2026.
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

**Numbers that go stale in prose are not written here.** The entry stylesheet's
size and its headroom under `ENTRY_CSS_CEILING` come from
`npm run test:lighthouse`. The manifest's gzipped projection against its 400 kB
budget comes from `scripts/build-manifest.mjs`. Read them from the run.

---

## The one thing that must happen next

**A full run against a real build, then `bash scripts/push.sh`.**

Three things have never executed once, because this sitting only ever had a dev
server on port 5199 (the shared Playwright config owns 4173 and refuses to
reuse a server, and a subagent held it):

| never run | why it needs `dist/` |
| --- | --- |
| `e2e/download-limiter.spec.js`, both tests | they match `/assets/index-*.js`, which only a build produces |
| `chrome.spec.js` "the masthead is outlines in the served HTML" | dev serves live text; `vite.config.js` inlines the SVG at build time |
| `chrome.spec.js` "the two Latin subsets are preloaded" | dev injects `/@vite/client` and skips the preloads |

Everything else was run and passes: unit 392/392, `daily-panel` 8/8,
`daily-sidebar`, `daily-tiles`, `chrome` 65 of 67 with those two dev-only
failures.

---

## In flight: the defects agent's work, on disk and unverified

A subagent's three performance fixes are **in the working tree and have not
been reviewed by anybody**. It reports all three done, tested, and each backed
out and watched to fail. That is its own account; nothing here has checked it.

Ten files plus **130 new `saints/*/images/*-card-sm.jpg`**:
`src/views/index/{modes,grid}.js`, `src/ui/nav-scroll.js`,
`scripts/build-manifest.mjs`, `make_thumbs.py`, `tests/build.test.mjs`,
`e2e/{chrome,index-carousel,index-grid}.spec.js`.
`src/ui/loop-scroll.js` shows as modified and is byte-identical to `HEAD`.

**Its finding is worth more than its fix.** `PLAN.md` §7 item 2 says All Saints
blocks ~1,200 ms packing 862 captions before first paint. **That was already
fixed on 2026-09-09** and both PLAN and this file still said otherwise. The
real remaining cost was next door: `update()` runs before `applyMode()`, so the
**grid** lays out all 862 names and mounts a screenful of cards before the
carousel hides it — a face nobody asked for, built twice per boot. Measured
`gridLayout` **367–403 ms → 0**, blocking before the first card
**2,072–2,221 → 1,537–1,590 ms**. It did not touch the row's DOM size, which
PLAN says not to virtualise.

**`PLAN.md` §7 item 2 needs rewriting to match.** It currently describes a
defect that no longer exists and names a cause that was wrong.

The other two: the phone nav strip's swipe (`keepEndless` writing `scrollLeft`
inside a live gesture) and the 560 px file drawn as a 150 px card, which it
reports was worse than the brief said.

---

## Two things git cannot tell you

**`shots/baseline-before-daily-rebuild` exists and must never be re-shot.**
16 tiles of `/saints` from before the Daily rebuild, and `shots/` is gitignored,
so nothing else records that it is there. The instinct — re-shoot, then
compare — destroys the only evidence there was.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/saints \
  --widths=360,768,1280,1440 --themes=day,vigil --langs=en,ru
node scripts/tile-diff.mjs compare before-daily-rebuild
```

`MSYS_NO_PATHCONV=1` is not optional: without it every shot fails and
`tile-diff` archives stale tiles as the baseline. That happened twice and both
times the output read as success.

**`4983e72` is titled as a docs fix and also carries 3,400 lines of spec
deletions**, swept in by a bare `git commit` after `git add`. The tree is right,
the history is not. It is unpushed, so a rebase would still tidy it.

---

## What this sitting changed

**The site is AGIOS.** One name, untranslated, on every surface — the packs, the
tab, the PWA, the native apps. The bundle id is `com.agios.app`, which also
meant moving the Java package directory from `com/dailydox/app`; `npm run
app:sync` would never have fixed that one. **`PLAN.md` §3 "The name" lists all
fourteen places the brand is written down** — change it there and in all
fourteen, in one commit. Two of them turned out to be dead code and are gone:
`BRAND` was imported into `main.js` and never called, and `site.name` sets
nothing.

**`npm run app:sync` has not been run.** The copies under
`android/app/src/main/assets/public/` and `ios/App/App/public/` are stale build
output still carrying the old name.

**Every `Amendment N` citation is gone** — 178 of them, naming 40 amendments.
They were defined in `SESSIONS.md`, deleted 2026-09-08, so not one resolved.
Worse, they were not even reliable: four comments justified the old two-name
title split by citing "Amendment 31", which is a corpus batch of 559 saint
folders and says nothing about titles. Where a citation named a rule, the rule
is now written out; where it only pointed, the pointer went.

**The keys step the day again** — `wireKeys` in `views/calendar.js`, on the
document so it works with focus down among the saints, guarded against
modifiers, editable targets, an open dialog and `defaultPrevented`. Test in
`daily-sidebar.spec.js`, backed out and watched to fail.

**`e2e/download-limiter.spec.js` is new**, holding the two boot-download budget
tests that were buried in `daily-panel.spec.js` (now 8 tests, all about the
Daily page). `CLAUDE.md`'s test table has the row.

**The hymn job is finished.** Every source text carries an English;
`--emit-texts` returns 0 and `scripts/hymn-wrong-saint.json` is empty. Five
misfiled hymns were resolved: four deleted after corroborating them under the
saint they belong to, and the Archangel Michael troparion deleted from
`alexander-nevsky` by the author's ruling — it was the only copy in the corpus,
and `pravoslavno.rs` publishes it under Nevsky's heading, so **that misfiling
is upstream and will come back with any re-scrape of that page**. All twenty
source-corruption flags were checked against their own source pages and every
one is printed that way at the source; `scratchpad/hymn-flags.md` is the result
table. Orloff and Hapgood took citations from 37 to 39, and that the other 389
have no published English in either book is now checked rather than assumed.

**`corpus-gate.mjs` and `docs/CORPUS.md` both named `daily-panel.spec.js:2479`**
for the corpus runway. No spec has asserted it since the rebuild deleted that
test; the gate was checking its own literal and labelling it as a spec's.

**`CLAUDE.md` gained trap 18**, and it is the sitting's own scar: a bulk text
pass anchors every pattern on the thing it is changing and runs nothing
file-wide. A cleanup regex in an otherwise-correct sweep deleted 2,587 empty
parameter lists across 68 files and flattened every indent; 35 files stopped
parsing. `npm test` immediately after the pass would have caught it in two
seconds. The repair only worked because every intended edit was a script under
`scratchpad/`, so the files could be restored from `HEAD` and the edits
replayed.
