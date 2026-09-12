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

**Nine commits unpushed**, local `HEAD` `2cddfaa`, remote `46dbbaf`.
`bash scripts/state.sh` is the truth about this — `git status` lies here,
because a PAT push never updates `origin/main`.

- **396 unit tests pass.** `locale-coverage` 0 fallbacks in all four packs.
- **The full browser suite has now run against a real build**: 720 tests,
  715 pass. The five that did not are `map.spec.js` under six workers plus one
  assertion since fixed; **map and `index-carousel` pass 230 of 230 run
  alone**, which is this desk's parallel load and not the diff.
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

**Nothing is blocking.** The three tests that had never executed — both of
`e2e/download-limiter.spec.js` and `chrome.spec.js`'s masthead and preload
pair — have now run against `dist/` and pass. The masthead one was red when it
first ran and is fixed: it read the whole served HTML for `>AGIOS<`, and the
rename of 2026-09-12 made `<title>AGIOS</title>` match it.

`docs/WHERE-WE-ARE.md` is the open work, and its "Decided, not yet done"
section is empty. What is left there is the Daily desktop redesign, which
needs the author to describe it, and four things nobody has ruled on.

---

## What a phone now does that a desk does not

**Below 1024 px the site is Gregorian throughout** — the date it prints, the
month it colours, *and the days it calls a fast*. `lib/church.js`'s
`calendarFor` answers `gregorian` regardless of church, so an Old Calendar
reader on a phone is shown the Dormition Fast on 1–14 August where the desk
shows them 14–27.

This is here rather than in a commit message because it is the one place the
site deliberately tells two readers two different things about the same day,
and the next person to meet it will read it as a bug. It is not: the
consequence was measured, put to the author on 2026-09-12 and the ruling
re-confirmed. It is one branch in one function to reverse.

`lib/viewport.js` holds the 1024 for JavaScript. Two modules read it — the
Daily page's full-screen opener and that reckoning — and `PLAN.md` §4 now
lists every breakpoint and named measure in the sheets, with
`tests/plan.test.mjs` reading both directions.

---

## In flight: the defects agent's work, still only half checked

`aa72f65` is three performance fixes by a subagent, committed on its own so it
can be dropped whole. Since then:

- **Its All Saints fix has been read in the diff and the mechanism holds**
  (`paintGrid` returns early while the mode is `carousel`; `applyMode` calls
  `state.layoutGrid()` after the `hidden` attribute comes off). `PLAN.md` §7
  item 2 is rewritten around it. **Its numbers are still only its own**, and
  it reported two different sets for the same quantity — 394–606 ms in the
  code's comment against 367–403 in the commit message. Direction established,
  magnitude not.
- **One of its tests was wrong and is fixed** (`2cddfaa`): the dense-screen
  card assertion required a decoded width of 280 px from a corpus that does
  not guarantee one.
- **The nav-strip swipe fix and the card derivatives have not been reviewed at
  all.** 130 new `saints/*/images/icon-card-sm.jpg` are committed.

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

## Standing facts about this tree

**`npm run app:sync` has not been run.** The copies under
`android/app/src/main/assets/public/` and `ios/App/App/public/` are stale build
output still carrying the old name.

**`PLAN.md` §3 "The name" lists all fourteen places the brand is written
down** — change it there and in all fourteen, in one commit.

**Three branches exist in the locale packs and not in the English base** —
`reasons`, `offices`, `eras`. `lib/i18n.js`'s `PACK_ONLY` is the list; a
fourth goes there and nowhere else.
