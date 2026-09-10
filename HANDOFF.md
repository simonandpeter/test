# Handoff

**`CLAUDE.md`** is how to work and where things live. **`PLAN.md`** is what the
site should be, what is settled, and what is next. This file is state and what
is in flight — the last sitting or two, nothing older. `git log` has the rest,
and for 2026-09-09 it has an unusual amount of it: fourteen commits, most of
them findings rather than features.

---

## State

- **`main` is green and deployed.** Every push on 2026-09-09 and 2026-09-10
  went green, and none of the last five carried a `flaky` line at all.
- **382 unit tests** in ~2 s. **944 browser tests** in ~4.8 min here, ~15 min on
  CI. Accessibility 100, FCP 1356–1376 ms against the 1500 floor. **The entry
  stylesheet is 72,562 bytes against `ENTRY_CSS_CEILING` 73,000** — the gate
  that fires before the four routes do and names the file
  (`docs/daily-desktop-visuals.md` §10.22).
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

## The desktop Daily rebuild, 2026-09-10 — built, then revised four times

**`docs/daily-desktop-visuals.md` is done and the author has been over it.**
Every numbered step is on `main` across five sittings, and four rounds of
author instructions have landed on top of the finished page. **§10.25 is the
closing record** — §10.20 is *sitting E's* record and is where the plan ended,
which is not where the page is: §§10.21–10.25 reverse four of its decisions.
Read §10 back to front. The page past 1024 px is a reading column with the
site's bar as its own head, and a filled sidebar bubble level with it carrying
the chrome controls, the month, the readings, the hymns and the name days.

**The author's four rounds, in order.** One masthead size everywhere, the
AGIOS wordmark and the sidebar's inset (§10.21); the hero's 3:2 crop at 34%
(§10.23); the picture's column as five twelfths of what it shares with the
words (§10.24); and then the three of §10.25 — **the register keeps only the
two marks the reference draws**, the heading reads **Also today** past
1024 px, and the **name days stand in two columns with no separator dot**.

**Two of those reversed decisions this document made itself**, and both for
the same reason: a render was read as evidence about a rule. §10.1 read the
reference's 3:2 as one saint's derived box; §10.4 read its two register marks
as two frames of a three-mark control. Neither is a mistake arithmetic could
have caught — only the author could say, and both sections chose the reading
that let them avoid asking.

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

**The entry stylesheet is 72,562 bytes** against the 73,000 the gate now
holds (§10.22, which measured the cliff to 57 bytes and put
`ENTRY_CSS_CEILING` ~600 below it). 2026-09-10's last three commits went
−183 for the register's lost face, ±0 for the rename and +251 for the two
columns; §10.25 has the ledger. Splitting `index.css` and `saint.css` out the
way `map.css` went takes it to **54.31 kB** — measured, and still deliberately
not taken: unlike the map, those two routes are text and pictures from the
first frame, so the saving wants the router to await the view's sheet rather
than a bare dynamic import, and that is the boot path. §10.20 has the whole of
it.

**The comment rewrite rides inside the next such overhaul, per file.** A pass
that has to open `index.css` or `base.css` anyway can clear that file's
narrative in the same visit rather than in a second one. Pixel-identical tiles
prove no declaration moved.

## The corpus protocol, 2026-09-10

**`docs/CORPUS.md` is how a saint gets in**, recovered from `git log` and from
the amendment record the deleted `SESSIONS.md` held, and binding for anyone
adding to `saints/`. Four scripts under it, following the family's rule —
`day-coverage.mjs`, `day-candidates.mjs` and `corpus-gate.mjs` propose and
never write; `draft-saint.mjs` writes only what a person typed, dry-runs by
default and can take a batch back out.

**The finding worth carrying: a civil-day dedupe is not enough.** Amendment 45
settled that candidates are matched on the feast date and never on the name;
what it used and never wrote down is that the key is the *menologion* day
across every calendar. On civil 1 October the Russian calendar's 18 September
prints twelve entries; a civil-day scan reports the corpus holding **zero** of
them and a menologion scan reports **eight**, because they sit on the Greek and
Romanian 18 September a fortnight away. Six of the twelve are upgrades, not
arrivals. `tests/corpus-index.test.mjs` holds both scans.

**Also new: the gate computes the eight e2e literals a batch moves** and prints
each beside what the spec still says. All eight reproduce the current specs
exactly on the unchanged tree. `daily-panel.spec.js`'s "the corpus reaches
28 September 2026" moves on the first folder past that date, which is where the
runway continues — expect to edit it in almost every batch.

**Rate, honestly:** eight hours at this standard is two to four civil days,
about 30 new folders and a comparable number of upgrades. The limiting factor
is reading, not tooling.

## Known and unfixed

- **All Saints packs all 862 captions in one blocking task** before it can paint
  a column, ~1,200 ms at 10× CPU. The reader-facing defect with the most in it,
  and `PLAN.md` item 7. The drift test's wait for a packed row is an instrument
  on it: when the pack goes lazy, that wait should return instantly.
- **The phone nav strip breaks under an aggressive swipe** — `keepEndless`
  writes `scrollLeft` inside a live gesture.
- **A phone draws a 150 px card from a 560 px file.** The first screenful of All
  Saints is 579 kB and could be ~189.
- **The Romanian name days print ranks where they should print names.** Found
  while measuring the widest name in each pack on 2026-09-10 and left alone,
  being nothing to do with the columns that sitting drew: `Sfântul Cuvios
  Mărturisitor Sofian de la Antim` gives *Mărturisitor* and `Sfânta
  Împărăteasă Pulheria` gives *Împărăteasă*, because the build's honorific
  stripping reaches *Sfântul* and *Cuvios* and stops at the rank behind them.
  English is right on both days. §10.25's last bullet has the evidence.
