# Handoff

**`CLAUDE.md`** is how to work and where things live. **`PLAN.md`** is what the
site should be, what is settled, and what is next. This file is state and what
is in flight — the last sitting or two, nothing older. `git log` has the rest,
and for 2026-09-09 it has an unusual amount of it: fourteen commits, most of
them findings rather than features.

---

## State

- **`main` is green and deployed.** Every push on 2026-09-09 and 2026-09-10
  went green, and the last three of 2026-09-10 carried **no `flaky` line at
  all**.
- **379 unit tests** in ~2 s. **932 browser tests** in ~4.5 min here, ~14 min on
  CI. Accessibility 100, FCP 1356–1376 ms against the 1500 floor.
- **862 saints** (2026-09-08), every one with a life; 1,221 attestations; 126
  undated; 130 icons; 430 hymns. 97 located, ten with a dated track. The corpus
  reaches 28 September 2026. **144 day records**, 23 Aug 2026 – 13 Jan 2027.
- Locale packs complete. App shells exist (`android/`, `ios/`, Capacitor 8);
  **no binary built** — `docs/APP.md`.

Nothing is in flight. The tree is clean.

## What 2026-09-09 left behind

**Cross-referencing is the corpus's live direction** (author). `related` is
reversed — a saint shows whose lives name them — and the sweep then found the
whole cross-reference layer sitting outside it. The vision and what is left are
`PLAN.md` sections 5 and 7 item 4.

**Three rules were recovered from the deleted `SESSIONS.md`** — related saints,
kinship clauses staying in a name, and the refusal of Nassar's 1938 menaion on
unresolved copyright. `scratchpad/stranded-rules.py` sieves that file for more;
it is a reading list, not an oracle, and most of what it finds is history.
**One rule was also invented and attributed to the author** before being taken
back out: provenance belongs with a rule, or recovering them launders inference
into law.


A day of tooling and correction rather than features. Four things outlive it,
and all four are in `CLAUDE.md` where they will actually be read:

- **`bash scripts/push.sh`** pushes *and* reads the run, because they are one
  step. **`bash scripts/state.sh`** answers "where is this repo, and what has
  landed since I last looked" against the remote rather than a stale ref.
- **`tests/plan.test.mjs`** executes `PLAN.md`'s tables against the code;
  **`tests/citations.test.mjs`** checks every document reference resolves.
  Before them no test in this repo read a document — and eleven of the day's
  fourteen findings were prose asserting a quantity or a mechanism nobody had
  measured.
- **`Emulation.setCPUThrottlingRate` reproduces CI here.** Two carousel flakes
  survived a day of guessing, including two explanations written into the code
  and later disproved; both fell out in minutes at 20×.
- The browser suite went from **31 failures in 15.5 min to 0 in 4.4**, and the
  type scale from fourteen steps to nine.

The visual loop is **48 tiles in 80 s** — `contact-sheet.mjs --still`,
`tile-diff.mjs snapshot`, change, `--still`, `compare` — against ~40 s for a
single surface through a rebuilt preview before.

## In flight

Nothing. The tree is clean.

## The cross-reference sweep, 2026-09-09

**`related-from-links.mjs` could not see the corpus's own links.** Its first
line strips every markdown link from a life, because its two tiers ask what
`cross-link.js` would find in bare prose. Run over the whole corpus it proposed
nothing at all: the 86 links those tiers can see were already read and settled.
The 532 links a hand had written into the lives — the real cross-reference
layer — were the thing the `replace` deleted, and nine of them were `related`
rows.

All 542 rows were read, the 501 proposed and the 41 the dedication rule holds.
No dedication among the written ones and no wrong person: they are family,
fellow martyrs, teachers and disciples, cellmates, and saints the calendars
keep on one day. One row the rule wrongly held — "the deacon of his church
Alexander Ipatov", where `church` belongs to `deacon of his` — is now the first
entry in `KEPT`, the mirror of `REFUSED`.

| | before | after |
| --- | --- | --- |
| `related` edges | 73 | **574** |
| saints with a link either way | 94 | **379 of 862** |
| isolated | 768 | **483** |

**`node scripts/link-coverage.mjs [--isolated]`** is the number and the work
list, so it trends instead of going stale in a document — `PLAN.md` had carried
"520 saints with no link in either direction" and the true figure was 768.

**The rule now has a test.** `tests/life-links.test.mjs` asserts that every
`/saints/<slug>` a hand writes into a life is a `related` row; the shared parts
moved to `scripts/life-links.mjs` so there is one copy of the dedication
regexes. PLAN's oldest corpus rule had gone unenforced for as long as it had
existed.

**What is left of item 4 is not mechanical.** Both prose tiers are exhausted.
The 483 isolated saints shorten only by writing links into lives, and every
hyperlink added is now two rows on two pages.

**Watch the manifest.** `mentionedIn` took the projection at 5,000 saints from
370 KB gzipped to **396 against a 400 KB budget**. It is on the card because
`related` is not in the manifest at all — the saint view fetches the folder's
own `saint.json` — so the client cannot derive it. If the budget bites, the
move is a separate reverse-index file fetched with the saint detail rather than
by every page.

## The desktop Daily rebuild, 2026-09-10 — built

**`docs/daily-desktop-visuals.md` is done.** Every numbered step is on `main`
across five sittings; **§10.20 is the closing record** and the only part of
that document a new reader has to start with. The page past 1024 px is now a
reading column with the site's bar as its own head, and a filled sidebar bubble
level with it carrying the chrome controls, the month, the readings, the hymns
and the name days.

**Two findings outlive the page they were found on.**

- **The contact sheet was never shooting dark mode.** Its seed wrote a theme
  value `localStorage` may not hold, so every vigil tile it ever drew, on every
  route, was the day theme under a dark label. `scripts/shoot-settings.mjs` now
  owns the seeding for both tools that shoot the site, and the sheet checks each
  page against the row's own label before the shutter.
- **A mark can be correct everywhere and invisible in one box.** The month's
  selected day kept a `--field` fill that had been right since August and came
  out at 1.00:1 the day the month moved inside a bubble whose fill *is*
  `--field`. Nothing failed, because nothing had asked what the mark was drawn
  against. Tests about colour should name the surround.

**Still the author's**, all of them editorial rather than defects, and all
measured in §10.20: the sidebar's empty foot (235 px on a light day, 661 on a
day with no record), the imageless expanded entry's 340×240 mount, the nav's
place in the bar against the mockup's, and the liturgy line's chip order.

**The entry stylesheet is 72.38 kB** against §10.18's known-green 73.89 and
known-red 75.14. Splitting `index.css` and `saint.css` out the way `map.css`
went takes it to **54.31 kB** — measured, and deliberately not taken: unlike
the map, those two routes are text and pictures from the first frame, so the
saving wants the router to await the view's sheet rather than a bare dynamic
import, and that is the boot path. §10.20 has the whole of it.

**The comment rewrite rides inside the next such overhaul, per file.** A pass
that has to open `index.css` or `base.css` anyway can clear that file's
narrative in the same visit rather than in a second one. Pixel-identical tiles
prove no declaration moved.

## Known and unfixed

- **All Saints packs all 862 captions in one blocking task** before it can paint
  a column, ~1,200 ms at 10× CPU. The reader-facing defect with the most in it,
  and `PLAN.md` item 7. The drift test's wait for a packed row is an instrument
  on it: when the pack goes lazy, that wait should return instantly.
- **The phone nav strip breaks under an aggressive swipe** — `keepEndless`
  writes `scrollLeft` inside a live gesture.
- **A phone draws a 150 px card from a 560 px file.** The first screenful of All
  Saints is 579 kB and could be ~189.
