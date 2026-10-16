# Overnight queue

Work the author has queued but not watched. Each item says what it is, what it
costs, and what has already been checked — so whoever picks it up does not
re-measure what is written here.

Standing rule for everything below: **nothing is pushed** until the author says
we are finalising. Commit locally.

## 1. One church, more than one day

**Done, 3 October 2026.** `lib/church.js` holds the three readings every caller
uses now and the saint page's veneration table puts a church's second day on
that church's one row. Matthew's Romanian 16 noiembrie is recorded and the day
is no longer blank. `git log --grep="more than one day"` is the work.

**The two apostles this item named are done** (checked 13 October 2026).
`andrew-the-first-called` and `philip-the-apostle` each carry **two romanian
rows** — the 30 June synaxis and their own day, 30 noiembrie and 14 noiembrie,
both confirmed against doxologia's own lines («✝) Sfântul Apostol Andrei, cel
Întâi Chemat, Ocrotitorul României» and «✝ Sfântul Apostol Filip, unul dintre
cei 12 Apostoli»). A reader who opens the Romanian 30 November finds Andrew.

**What is left is the same pass on the other calendars.** Both apostles hold a
single `greek` row, on 30 June, and saint.gr keeps its own 30 November and
14 November days. That is the Greek wave's work and not a reader's: a second row
is appended by the writer with `.tmp/upgrade.py`'s `row_add`, off the day page
it quotes. Whether saint.gr in fact lists them there was NOT checked here.

## 2. Lives that cross-reference in prose with no link

**This item is gone rather than done, and item 13 is why.** Every pair whose
life cross-referenced another in prose turned out to be an identity question,
and all fifteen of them are merged now — one record each, carrying both days.
There is no pair left to link that a merge has not already made one folder.

What survives of the general ask is the rule the merges proved: a pair the
sources say are *two* people wants the link, a pair they say are one wants the
merge, and the author rules which. Item 13's closing section is the sourcing
list that remains, and none of it can be linked because the other half of each
pair is not a folder here.

## 3. The lonely date-tags — done, and the count was wrong

**Done, 13 October 2026.** The item asked for 44 candidates to be checked
against their own source calendars. What came back: **21 tags dropped, 30 that
were never lonely, 7 collectives that were never candidates, and 2 already
settled.**

Each of the 21 was read off the day page its own `venerated` row cites — the
Russian URLs being the Julian date, as the rows store them — and that day's
listing printed **exactly one** saint of the name, so the parenthesis was
telling the reader nothing. `display_name` and the life's `#` heading only; no
slug moved, no attestation row was touched, and all 21 new names are unique in
the manifest (checked after the rebuild).

**The measuring list over-counted by 30, and 14 of those are a defect in the
instrument that built it.** Fourteen candidates have a namesake whose folded
display name *begins with* the candidate's stripped name — "Anthia (12 October)"
beside "Anthia, mother of Eleutherius", "Lot (22 October)" beside "Lot, nephew
of Abraham", twelve more — so the folded-stem prefix test the report describes
should have returned every one of them. The instrument was not kept and the
report names no file, so **why** it missed them is unexplained.
`.tmp/item3-collide.py` is the prefix test as it should be, and it is the one
output worth re-running.

The other 16 are one name under two latinisations, which is the half a prefix
test cannot do: «Ιουβενάλιος» is "Juvenalius" in one folder and "Juvenal" in three,
«Αστέριος» is "Asterios" and "Asterius", «Βλάσιος» is "Blasius" and
"Blasios", «Θαλλελαίος» is "Thallelaeus" and "Thalelaeus". Those tags are
load-bearing *because* of the split and were left alone.

**Two things it turned up, neither acted on:**

- **Normalising the latinisations is a corpus-wide decision**, not a reader's.
  Until it is made, a day-tag is the only thing keeping two spellings of one
  Greek name apart.
- **`asterios-7-august` may hold two men.** saint.gr's 7 August prints
  «Άγιος Αστέριος ο οσιομάρτυρας και θαυματουργός»; days.pravoslavie.ru's same
  Julian day prints «Мчч. Марина и Астерия (260)», the senator of Caesarea in
  Palestine, and the folder's own Russian name form is the senator's. Two
  dossiers in one folder, on one day. Wants an author's eye.

**What was not verified** (the reader's own account): no e2e run and no
`npm run build`, so no page was watched rendering a new name — a grep of `e2e/`,
`tests/`, `src/`, `scripts/` and `docs/` for all 21 tagged names found nothing
but prose inside `corpus-gate.mjs`'s own notes. No back-out, because these
batches add no attestation row to back out. And for each candidate only the one
day its row cites was fetched, so "the name is unique in that calendar" was
never tested — what was tested is "unique on that day, with no namesake in the
corpus by prefix or near-spelling".

Instruments in `.tmp`: `item3-rename.py` (the only writer; it asserts the new
name is the old minus exactly one trailing parenthesis, so it cannot rename a
saint), `item3-collide.py`, `item3-spelling.py`, `item3-probe.py`,
`item3-day.py`, `item3-list.py`, `item3-urls.py`, and the two batch files as
applied.

## 4. The ten icons Commons refused

**Done, 3 October 2026** — `git log --grep=Icons`.

## 5. The image programme, then the Russians

Romanian and Greek still lead with an imageless hero on most days; the Russian
reading wave (`days.pravoslavie.ru`, julian) has not started. Counts are in
HANDOFF.md and go stale — re-measure, do not quote them.

**Measured 3 October 2026, before the wave** (`node scripts/heroless.mjs
romanian greek`): Romanian 141 of 357 days and 140 distinct saints, Greek 168 of
364 and 168, nine saints in both — 299 distinct saints wanted an icon.
`scratchpad/geticon.py` is the instrument; it reads the licence off Commons' own
`imageinfo` and refuses anything Commons does not state as PD or CC, so a
sourcer cannot get a licence wrong. **A historical painting may fill a hero slot
where no icon exists** (author, same day), said so in the draft's `why`.

**Both passes are in — 145 icons** (Greek `6a095e3f`, Romanian the merge after
it) — and the four calendars now read:

**THE COMMONS SEAM IS FINISHED. 54 icons, imageless hero-saints 254 → 110, and
the 50 that are left want a different source — not a fifth wave.**

Four waves, and the rate per wave tells the story on its own: **11 of 23 (48%),
16 of 49 (33%), 7 of 36 (19%)** — and within the last wave, per batch, **4/12,
3/12, 0/12.** It fell to zero.

**The structural reason, which is why this ends rather than pauses.** Of the 85
unsearched at wave four's start, **only 31 stored a Russian name.** Routes 1 and
3 need one; for the other 54 route 2 is the only road and it answered for
exactly one of them, an Englishman. Those 54 are the Cypriot, Athonite, Cretan
and Romanian local saints and the modern ones. All but five of the reachable 31
are searched now, and that was the richer half.

Batch three is the clean signal rather than bad luck: **ten of its twelve have
no Wikidata entity at all**, so route 2 cannot answer and route 3 returns the
name's famous holder — Aristotle and the Lyceum for Peter of Lampsacus, the
Apostle Paul and both Corinthian epistles for «Павел Коринфянин», Nicholas I
and the town of Sim for «Николай (Симо)». The namesake trap at its loudest:
`euthalia-the-martyr` is a genus of nymphalid butterfly, `thalassius` a genus of
fishing spider, `taurion` a river in the Creuse and a bolete.

**So the next move on the remaining 50 is a source, not a method**: a diocesan
or monastic photo archive, a printed menaion's plates, or the author's own
judgement that a day may lead without a picture. Another Commons pass will not
move them.

| calendar | 13 Oct | now |
| --- | --- | --- |
| Romanian | 35 of 357 | **25** |
| Greek | 65 of 364 | **47** |
| Russian | 76 of 357 | **25** |
| Serbian | 56 of 358 | **24** |
| distinct hero-saints | 254 | **110** |

**An icon closes more than one day, and that is `pickHero` working** — 18 icons
cleared 27 saints, 29 cleared 42, 16 cleared 19, 7 cleared 9: the tie is broken
inside the sung pool, so giving one saint a picture can promote him over a
different imageless hero and close that day too (the 2026-08-28 rule).

**A FIFTH ROUTE, cheap and written down late: a junk category can carry the
right subcategory.** `wbsearchentities` on "Erastus" returns a given name and
four American politicians, but `Category:Erastus (given name)` lists
`Category:Erastus of Corinth` among its subcats, which is the apostle's own.

**A duplicate folder, found by the sourcing and not by any audit.**
`erasmus-of-the-caves` and `erasmus-of-the-kyiv-caves` are the same Caves monk
on the same Julian 24 February — one carries the serbian row and the Prologue's
«Еразмо», the other the russian row and «Еразм Печерский». Both now carry the
corpus's smallest icon, the same 450×624 file. By the author's standing rule —
merge if they are the same — this is a merge, and it is item 13's shape: one
folder, two rows. **Not done**, because a folder merge unions attestations,
carries name forms, repoints `related` and deletes a slug, and that is a pass of
its own rather than a line in an icon wave.

**47 icons had landed by the middle of 14 October 2026 and the imageless heroes were 138, from 207.**

| calendar | 13 Oct | after the plates | after method 1 |
| --- | --- | --- | --- |
| Romanian | 35 of 357 | 31 | **27** |
| Greek | 65 of 364 | 58 | **54** |
| Russian | 76 of 357 | 66 | **38** |
| Serbian | 56 of 358 | 44 | **32** |
| distinct saints | 207 | 180 | **138** |

**An icon closes more than one day, and that is `pickHero` working.** 18 icons
cleared 27 distinct saints and 29 more cleared 42: the tie is broken inside the
sung pool, so giving one saint a picture can promote him over a different
imageless hero and close that day too (the 2026-08-28 rule).

**The plate route: the identity rule needs both halves.** The Menaion Reader
plate's file name carries a church-year code (month counted from September, then
the day) *and* the saint's Russian name, and a match requires the code to
resolve to the folder's own Julian feast **and** the title to name the folder's
own stored Russian form. A date alone is never enough.

**Method 1 is the per-saint category listing, and guessing the title only finds
saints Commons happens to have titled in English.** Three routes, cheapest
first — `scratchpad/m1cat.py`, `m1wd.py`, `m1ru.py`:

1. **Titles built from the folder's own names.**
2. **P373 off Wikidata**, because Commons calls Nilus of Sora `Saint Nil
   Sorsky`, Nilus of Stolobnoe `Nil Stolobensky` and Germanus of Kazan `German
   of Kazan`, and no guess reaches any of them.
3. **Full-text search on ru.wikipedia, then the article's `wikibase_item`, then
   P373** — because `wbsearchentities` matches a label by **PREFIX**, so
   «Иоанн Суздальский» misses an entity labelled «Иоанн (епископ
   Суздальский)» and route 2 reports "no Wikidata hit" for saints who have
   both an article and a category.

**A free-text namespace-14 search is worse than useless for a forename**:
`Peter` returns ten modern namesakes, `Stephen the New` twenty-seven aerial
photographs of St. Stephen, New Brunswick. Last resort only, and a hit is kept
only if it is sainty and carries a distinguishing word.

**The refusals are the other half of the work.** 26 so far, each with its
reason: namesakes («Маркеллин» is not «Маркелл»; 29 March's Mark is Mark of
Arethusa, not the Pskov-Caves monk; 24 June's plate is the Nativity of the
Forerunner); below the 560 px thumbnail floor; a category holding the **event**
rather than the saint, which is why Lazarus of the Four Days and Photini the
Samaritan are still open — the Raising paintings have Christ as their subject
and the Samaritan woman is unnamed in hers; nothing on Commons naming the saint
at all, Philaret of Moscow having four categories of which all four are his
books; and one plate refused for **ambiguity**, two folders sharing 15 March and
the name Alexander with nothing to choose between them.

**§5's claim that ~94 of the tail have nothing free on Commons may be too
pessimistic.** A sample of 23 method-1 names came out 11 found / 12 not, which
is a better rate than that implies. Nobody has re-measured the tail.

**THE QUEUE IS DERIVED, NOT WRITTEN DOWN**, and that is deliberate: a static
list of names was put in this item and then deleted by a later rewrite of it,
and the next wave had to rebuild the queue from scratch. It is
`node scripts/heroless.mjs romanian greek russian serbian`, the distinct
hero-saints, **minus the slugs in `scratchpad/icon-refusals.json`** — which is
the durable half nobody had been keeping. Today that is **119 imageless
hero-saints, 34 already refused, 85 unsearched**.

A refusal is not permanent and the file says so: Commons gains files, so `floor`
and `nothing` are worth retrying after a long gap, while `namesake` and
`ambiguous` want a reading rather than another search

**Nobody has looked at any of these 47 pictures.** They were chosen on file
title, category membership and pixel size. `germanus-of-kazan` is a Lives
*scene* (a consecration) rather than a portrait, `john-vladimir` a vita icon
with marginal scenes, `basil-of-mangazeya` two figures shared with Basil of
Caesarea, and `seraphim-of-vyritsa` a 1927 **photograph** — each said plainly in
its note. `erasmus-of-the-kyiv-caves` at 450×624 is ON the floor, not over it,
and is the first thing item 15 should replace.

**Throttling, twice recorded now.** A single saint can exhaust the whole backoff
ladder for eight minutes — Commons serving the unscaled original and 429ing it
through every retry — and then come down first try on a single re-run. So
`geticon.py`'s "ask again at native-1" retry does not always produce a thumb;
set that saint aside and come back rather than waiting it out.

**Measured on main, 13 October 2026****Measured on main, 13 October 2026**, after `npm run build:manifest` at
6,799 folders — these are the honest numbers, because each pass had measured in
its own worktree without the other's icons:

| calendar | imageless hero-days, before | now |
| --- | --- | --- |
| Romanian | 141 of 357 | **35 of 357** |
| Greek | 168 of 364 | **65 of 364** |
| Russian | 4 of 103 | **78 of 356** |
| Serbian | 6 of 75 | **56 of 358** |

**210 distinct saints**, not 254: a saint who leads a day in two calendars is
fixed for both at once. The Russian and Serbian figures went UP because the
reading wave filled their years — 103 days of Russian calendar became 356, and
the new days brought their own imageless leads. That is the wave working, not a
regression.

Re-measure rather than quote this: `node scripts/heroless.mjs romanian greek
russian serbian` after a fresh manifest, since `heroless.mjs` reads the manifest
and on a stale one reports the numbers the last wave started from.

**The method is the part to keep, and it is the Romanian pass's.** Free-text
Commons search returns scanned 19th-century books for these saints; listing the
saint's own Commons category is what works — search namespace 14 for the
category, then `list=categorymembers` on it. And the richest single source is
the Russian Menaion Reader plate series, 351 PD files whose names carry the
church-year date (`икона NNNNN`: month counted from September, then the day), so
pulling that category once and date-matching it against each saint's feast finds
saints no search will, each with a date a reader can check. Two throttling
facts: Commons serves the unscaled original for anything under ~1250 px wide and
those 429 hard, so prefer files ≥1400 px and drive the fetcher one entry per
invocation; and two API clients at once provoke the 429s on their own.

**What is left is mostly not a searching problem.** Of the 110 skipped across
both passes, roughly 94 have nothing free on Commons at all — the local Cypriot,
Athonite, Thessalian and Romanian local saints, the Ottoman-era neomartyrs, and
the modern saints whose only images are in-copyright photographs — 18 were
refused for namesake risk or for being named only inside a group image that does
not name them, and 8 were identified but are too small for a hero.
`make_thumbs.py` never upscales, so ~450 px is the floor below which a candidate
was rejected. Another Commons pass will not move these: it wants a different
source, or the page accepts a day that leads without a picture.

**The corpus's size is not free, but the manifest is not where it costs.** The
reverse links came off the boot path on 2026-10-03 (`aafc2470`, 419 -> 347 KB
gzipped) on the reasoning that the manifest's growth was the 150 ms of FCP CI
had just gone red on. **It was not**: FCP measured 1,506 ms after the split
against 1,507 before it. What the step actually is, and the gate that now holds
it, are in `scripts/lighthouse-floor.mjs`'s `BOOT_CEILING` — the entry script
plus the entry stylesheet, measured. An icon costs the first paint nothing at
all.

## 6. One search bar, with Advanced as an option, on both pages

**Done, 4 October 2026** (`git log --grep="Advanced search OFF"`). Prayer was
the half that was open: the shell was already mounted whole, so what was left
was that it opened folded. It folds with All Saints' own `.is-carousel` rule and
its own word — one new string, `saints.modeToNormal`, because "Carousel mode"
names something Prayer does not have. The page's name is drawn in All Saints'
`.index-head` beside that word. `STRUCTURE.md` §4 Prayer is the record.

**The ask (2 October 2026):** rebuild the search bar on All Saints and Prayer so
both carry an **Advanced** option, and the advanced panel is the same thing on
both pages. In-flight work already covers part of this (the Prayer page gaining
the facet chips and the shell); this item is the finish.

- Advanced is an *option*, not the default: the field alone is what a reader
  meets, and Advanced opens the facets. Same control, same wording, same place
  on both pages.
- The advanced panel itself must be one implementation. `facetGroups` is already
  shared; `wireControls` is being lifted off the All Saints state singleton.
- **Prayer keeps no Sort chip and no Detailed box** — its order is the book, and
  it has no grid to detail.

## 7. Prayer on a phone: no display-type selector

**Done, 3 October 2026** (`git log --grep="no display-type selector"`). The
item's named obstacle was already gone — `door()` is handed to `card()` as its
`door`, with the three cases and the `is-dim` mark intact — so what was left was
the chip itself. It is removed below 1024 px rather than hidden, and `syncFace`
runs on every crossing of the breakpoint, because a reader who chose Pictures at
a desk and then narrowed the window kept a face the page would no longer draw
and had nothing left to change it with.

Remove the square/burger display-type selector from the Prayer page **on
mobile**. The saints beside a hymn draw the **All Saints row card** —
`card(item, router, { rows: true })` — at every width, so there is nothing for
the selector to switch between.

The obstacle is named in `views/prayer/asides.js`: an aside row is a *door* with
three cases (a button that opens the saint in place where the hymnal holds them,
a link to their own page past 1024 px where it does not, a disabled button below
that width). The shared row card has to take its door from the caller. Keep the
three cases and the `is-dim` mark: they are the ruling from
`../mockup-review/BRIEF.md` stage I and the author's instruction of
2026-09-17, after 84 of 116 names in those columns did nothing when pressed.

## 8. Related: the links between saints

**The ask:** the Related section under a profile — which the Prayer page also
draws — has to exist for the saints who have none.

**The item said "the recent waves, not only the early ones", and the
measurement reverses it** (2 October, `node scripts/link-coverage.mjs` plus a
pass over the folders' add commits — do not re-measure). 2,767 of 5,232 folders
carry a `related` array, 52.9%, and by wave:

| wave | with `related` | share |
| --- | --- | --- |
| early corpus | 378 of 856 | 44.2% |
| Romanian | 1,245 of 2,151 | 57.9% |
| Greek | 1,138 of 2,219 | 51.3% |

So **the recent waves are the better-linked ones and the work list is the early
corpus.** 8,464 edges, and 2,235 saints (42.7%) have no link in either
direction.

A link is a claim: companions martyred together, a teacher and a disciple, a
translator of relics. It comes out of the saint's own life or the calendar's own
line, never out of a shared name or a shared day. A wrong link is worse than a
missing one — the corpus's known failure mode is the wrong-saint match
(`b6dc41ab`). **Two commemorations that may be one person are no longer a link
but a merge**: item 13 is finished and all fifteen are one folder each.

**A dedication is a relation** (author, 3 October 2026: "the more connections
the better"), and the 89 exclusions that said otherwise are flipped in —
`dfd9a198`. That ruling also removed the `NAMED_FOR` table from
`scripts/life-links.mjs` and every encoding of the assumption in
`related-floor.mjs`, `related-from-links.mjs`, `tests/life-links.test.mjs`,
`docs/CORPUS.md` and `scratchpad/corpus-plan.md`. 52 exclusions remain and 50
of them are **denials** — a life saying outright "He is not the «Laurence of
Chernigov» whom the Romanian calendar keeps", where a row asserts the opposite
of the text and no test can see it. The other two are a saying quoted seven
centuries later and an emperor named only to date a life.

Every link is two-way, or the reader meets a one-sided relation.

**The 383-folder work list is finished, 3 October 2026** (`git log --grep="the
early corpus, lines"`, five commits). `node scripts/link-coverage.mjs` read
8,931 edges and 2,113 isolated, 40.4% then; **13,053 edges and 2,739 isolated,
40.3%, on 14 October 2026** at 6,799 folders, and `scripts/related-floor.mjs`
reports **0 folders gaining**, so the prose floor is met and the isolated share
has held steady while the corpus grew by a third, against 8,464 and 2,235 when the item was
measured. **93 of the 383 gained a link and 290 name nobody this corpus holds**,
which is the honest rate for the early corpus: the slice-by-slice yield was 33
of 110, then 17, 16, 6, 16 and 5 of 60, 60, 60, 60 and 33. The 6 is the modern
martyrs, whose companions are mostly not glorified.

**What is left of this item is not another slice of that list.** Two things came
out of the pass and neither is in it:

- ~~**1,497 links point one way only, corpus-wide**~~ — **answered, 14 October
  2026, and there is no sweep to do.** A one-way *stored* edge is not a
  one-sided relation to the reader: `mentionedIn` is `related` read backwards,
  computed in `scripts/build-manifest.mjs` and not stored, and the saint page
  draws the union of the two. The comment there has the reason and it is the
  rule: "a fact held in two folders is a fact that can disagree with itself."
  Writing the reverses in was tried (`08e2ea45`, 1,381 rows on 494 folders) and
  reverted: the reader saw no difference, and `own ⊆ incoming` everywhere cost
  `e2e/saint.spec.js:1849` and `e2e/prayer.spec.js:823` the premises their union
  is tested on. **The place to widen the reverse index is `related` itself, in
  one folder, which is what the prose floor already does.**
- **A company's clique does not close itself.** The seven martyrs of Tomis were
  reached from three slices and ended with three members holding all six
  partners and one holding three; the Kazan ten and the Gagino eight were the
  same. Closing a clique is one pass over the life that names the members, not a
  slug at a time, and the group entries (`martyrs-of-…`) are the handle.

## 9. The Russians, for the full year — done

**Done, 14 October 2026.** The reading wave is finished: `days.pravoslavie.ru`
read for the whole year, **363 of 366 days carry somebody**, up from the 63 this
item was written against. `node scripts/ship-gate-days.mjs` is the only
instrument worth quoting for it.

The three days that carry nobody are each explained rather than outstanding:
**7 January and 2 February enumerate nobody** — the calendar prints the
Synaxis of the Theotokos and the Meeting with no names of their own — and
**29 February has no source page on any host**, the Julian 29 February falling
in no year the sites publish.

Their icons are item 5, which is live: 180 distinct saints still lead a day
without one, down from 254.

## 10. The Serbians — done

**Done, 14 October 2026.** **365 of 366 days**, up from the 44 this item was
written against; only 29 February carries nobody, for the same reason as the
Russian. The Ohrid Prologue at pravoslavno.rs, Julian, read to the same
standard.

Their icons are item 5.

## 11. Cadence: push and read CI about every 8 hours

**The ask (2 October 2026):** aim to push and check CI roughly every 8 hours
rather than holding everything to the end.

This **replaces** the earlier "nothing is pushed until the author says we are
finalising" for overnight work: a run of eight hours is the unit, and the end of
one is a push. Within a run, commit locally as before.

- `bash scripts/push.sh` is the one step: it refuses a dirty tree, pushes,
  confirms the ref landed and prints the conclusion **and** the `flaky` line.
  Then `scratchpad/ci-flaky.py <sha>` for the test names under that line — a
  green run with `N flaky` holds a test that failed and passed on retry.
- A red CI is the run's next job, ahead of whatever was queued. Before calling
  anything a flake, measure its rate: the carousel flake was real at 1-in-6 and
  then masked a 16-of-16 regression.
- Never push a tree whose unit tests are failing. e2e that could not be *run*
  is a different thing from e2e that failed — say which in the commit or the
  handoff, never blur them.

## 12. Two suites nobody has run

**Done, 3 October 2026** (`e3a3ed12`). Both were run in a browser, each caught
one real defect, and neither failed to *run* — the distinction this item asked
for.

`index-grid` was 28 of 29. "Every row starts its name at the card margin" is
superseded a third time and again in its mechanism: the bullet added that day
stands at the margin and the name begins past it (measured at 360 px — 4 px to
the bullet, 30 px to the name, the bullet 18 px). What the test asserts now is
the claim that outlived all three arrangements: a saint with no icon does not
pull the column about, because the bullet is the same width whether it draws a
thumbnail or a type glyph. 29 pass.

`prayer` was 30 of 31, and that one was a live regression: the Daily page's
hymns had been given `--text-base` on the bare `.hymn-text`, which reached the
Prayer page, where the same class is the reading voice at `--text-lg`. The rule
is scoped to `.day-hymns` now. 31 pass.

The five dead `STRINGS.prayer` keys were already gone — from `strings.js` and
from all four packs. `locale-coverage.mjs` reads 0 fallbacks.

## 13. The merges are done

**All of item 13 is merged, 3 October 2026**, the author's ruling that every
candidate on the list is to be merged — `git log --grep="one man"` plus the
seven commits named below. Fourteen pairs, one commit each, each naming both
slugs and the source sentence that settles it:

| the pair | what settled it |
| --- | --- |
| `nectarios-of-aegina` → `nektarios-of-aegina` | the corpus's own `dates.birth.note`, "the same saint as nektarios-of-aegina" |
| `ia-of-persia` → `ias-of-persia` | both entries, each about the other, "may be the same" |
| `titus-27-january` → `titus-the-soldier` | the stub prints «βλέπε στις 27 Φεβρουαρίου» in place of a life |
| `mnason-of-cyprus` → `mnason-the-disciple` | «Είναι πιθανόν να είναι ο ίδιος Άγιος» |
| `zosimas-of-cilicia` → `zosimas-the-hermit` | the Sretensky name page files the two lives together |
| `abibus-of-hermoupolis` → `sabinus-of-hermopolis` | «Ίσως είναι το ίδιο πρόσωπο με τον Άγιο Σαβίνο» |
| `coronatus-of-caesarea` → `cornutus-of-iconium` | "Coronatus may be the same man as Cornutus" |
| `john-the-soldier-12-june` → `john-the-soldier-29-july` | the July folder's own refusal to answer |
| `goudelia` → `gobdelaas-son-of-sapor` | the synaxarion's copyists' error — **which it then argues against** |
| `crispus` → `sosthenes-the-apostle` | Chrysostom, «Oίμαι δε τούτον και Σωσθένη λέγεσθαι» |
| `aristokles-the-athonite` → `aristocles-of-moscow` | one life in both folders, not a doubt |
| `alexander-the-confessor-relics-2001` → `alexander-the-confessor-1961` | a repose and a finding of relics |
| `straton-the-martyr-9-september` → `straton-of-bithynia` | the corpus's own "keeps him on 9 and 13 September" |
| `theodote-21-october` → `theodote-of-nicaea` | "probably the same saint as the one kept with Socrates" |

**What a merge is, now that fourteen have been done.** `scratchpad/merge-saint.py`
moves the half that cannot be read wrong — the `aliases` row so the folded URL
redirects rather than 404ing, the union of `names`, `types`, `related` and
`hymns`, the folded attestation rows, the folded folder's `images/` files where
the survivor had none, and every reference to the dead slug elsewhere in
`saints/`. It prints what it refuses to move, which is `dates` and the life,
because those are the reading. Three things bit and are worth knowing:

- **An `undocumented` row the survivor already has for a church that the folded
  folder answers for has to go by hand.** Every merge left three or four of them.
- **A display name that disappears takes its hyperlinks with it.** `cross-link.js`
  indexes `display_name` alone, so the prose that named the folded folder stops
  matching — and a `related-floor` exclusion keyed on that match goes stale and
  turns `tests/related-floor.test.mjs` red. `nectarius-venerable-17-may`'s
  denial of "Nectarios of Aegina" is the case: the life now writes the surviving
  spelling and the exclusion key follows it.
- **Two entries of one calendar on one day are one attestation row**, not two.
  Goudelia and Gobdelaas stand on the same Greek 29 September, so that row's note
  carries both entries; the schema's two-rows-per-church is for two *days*.

**Where a merge found a contradiction it left it standing**, which was the
author's instruction for `theodote-of-nicaea` and for Goudelia and Sosthenes and
turned out to be needed for seven of the fourteen. Mnason dies by the sword on
one day and in peace on the other; Zosimas has three endings in three calendars;
Straton is dated 315 by one calendar and the third century by the other, so
`dates.death` spans 201–315 and displays "3rd century, or 315". None of that is
smoothed and each life says plainly which source says what.

### The two carve-outs, and both are recorded rather than merged

**Kandavla is done as a name-form fix** (`af16db05`), the author's carve-out: the
corpus holds one folder from each pair, so `mianus-of-kandavla` and
`kion-of-kandavla` gained their own Greek forms «Αμμιανός» and «Ωκεανός», each
with a note saying the identification is this corpus's reading and that neither
page voices it. `centurion-the-martyr` gained «Κεντυρίων» on the same footing as
Theodore's and Julian's, having no Russian counterpart at all.

**`philonides-of-kourion` stays linked and unmerged**, the author's other
carve-out. He names "three of his spiritual children, the priest Aristocles, the
deacon Demetrianus and the reader Athanasius", killed in his cell at Kourion
about 306; the corpus holds that trio as `aristocleus-of-tamassos`,
`demetrianus-the-deacon` and `athanasius-the-reader`, already a linked triangle,
but their own lives have them beheaded at **Salamis in 302** and name no
Philonides, and are kept on 23 June against his 30 August. Same three names,
same three ranks, same island, same persecution; two irreconcilable passions and
no source voicing the doubt. A ruling either joins the four or records the two
companies as distinct, and until one comes nothing is linked and nothing merged.

### What is left of the item is a sourcing list, not a merge list

**Nine pairs were dropped because the other half is not a folder here** — Aeros,
Michael Mavroeidis, Moses the Confessor, Mark the Ascetic, the three 6 February
martyrs (whose note carries the purest shared-verse evidence in the corpus and
points at a 25 October company nobody has written), the Thirty-eight Martyrs of
Thrace, Herodion, Maurice of Apamea. **Five more are explicit negatives** — the
page or a reader already ruled them two people: Eleazar, Antonina, Acacius of
Melitene, Peter the Sign-bearer, Hermes of Dalmatia. And
**`euxiphius-the-martyr` is nothing but its own doubt**: one line in the 1956
Hagiasmatarion "and nowhere else; perhaps he is confused with Auxibius, kept on
17 February", and the corpus's `auxibius-of-soloi` and `auxibius-28-april` are
**neither of them kept on 17 February**, so the source's own cross-reference
lands on neither folder.

**The funnel, kept because it says what a rescan would cost**: 226 folders of
5,231 carried any of the cross-reference prose shapes, 40 carried a tight
identity question, and of those 40 only the ten of the original table had both
halves standing as folders. A mechanical pass for the shared synaxarion verse
found 34 shared Greek couplets and **every one of them is companions inside one
entry on one day**; it produced no candidate at all. Four more pairs were found
by readers working the early corpus rather than by that grep, so the scan was
never the whole of it.

## 14. The feasts, drawn as a day's main card

**Done, 3 October 2026.** The drawing landed with `e4e8de6a`; what this sitting
added is the half nothing had read. The feast is the day's main card at both
widths — the phone paints one hero, the desk takes it apart at the hero's own
seam — and the picture is measured against a saint's at the same viewport, so
"same shape, same weight" is a test rather than a claim. It offers nothing to
press on either width: no anchor, no press state, no *continue reading*, and
the picture is a `div` with `cursor: default`. What a reader sees in place of a
way in is the line under the name, where a saint's prints the office and the
years.

**The fourth silence stays.** `emptyDayNote`'s feast sentence looked unreachable
from the eight feasts that have records; the Meeting and the Exaltation have
none, and a day whose church keeps one of those and whose corpus holds no folder
lands there. `e2e/daily-panel.spec.js` holds both days, each found rather than
typed. `STRUCTURE.md` §4 carries both rules now.

The test the item listed as failing by design was repaired in `a647a875`; the
full `daily-panel.spec.js` is green.

## 15. A second pass for picture quality, not picture presence

The first programme asked one question — does this saint have a picture — and
`heroless.mjs` counts the answer. Nothing has ever asked whether the picture is
a *good* one, so the corpus holds engravings thresholded to pure black and white
beside full-colour miniatures, and the first is what a reader meets on the Daily
page.

Dionysius the Areopagite is the case the author raised (2026-10-03). The icon
`geticon.py` had taken was a 1-bit engraving; the Menologion of Basil II
miniature that Commons also holds — `File:Menologion of Basil 025.jpg`, public
domain, the Vatican manuscript — is gold-ground colour at 1084x747. Both were
available the whole time. The sourcing script took the first identifiable file
and stopped, because that is all it was asked for.

**The worklist now exists, and the item's premise has changed under it**
(measured 14 October 2026, `scratchpad/icon-quality.py`, 503 icons). The item
was written about engravings "thresholded to pure black and white". **There are
none left: zero icons have three tones or fewer.** Dionysius the Areopagite was
the case and Dionysius is done.

What the corpus actually holds now:

| | icons |
| --- | --- |
| bichrome, 3 tones or fewer | **0** |
| near-greyscale (mean saturation < 0.06) | **151** |
| narrower than 700 px against a 1000 px hero slot | **229** |
| a strip, under 1:2 | 141 |

**Width is the live axis and tone is not.** `make_thumbs.py` never upscales, so
229 icons paint at their native width inside the hero's own slot. The 18 worst
by every measure are the Menaion Reader plate series — roughly 550×1700,
honestly greyscale, presence rather than quality.

**And the aspect figure is not the defect it looks like.** `lib/hero-crop.js`
exists for exactly this: `MIN_HERO_RATIO` is 1:1.6 and a taller image is cropped
favouring the TOP edge, by the author's own instruction of 2026-09-01. On a
full-length standing figure that is the face, so a 1:3 plate is what the crop
rule was written for rather than a defect it reveals. **Reasoned from the rule,
not measured on a page** — somebody should look at one.

**Two questions for the author before a re-sourcing wave, because the answers
change what the wave is:** is a greyscale plate worth replacing with a colour
miniature where one exists (18 more plates were accepted on 14 October, so the
answer may be no), and is a 560 px icon in a 1000 px slot worth replacing at all
given that nothing upscales and the alternative may not exist?

So this pass is a re-sourcing, not a filling:

- **Rank what is already held.** Colour against bichrome, pixel dimensions
  against the 1000px hero width, a manuscript or panel photograph against a line
  engraving. The output is a worklist ordered by how much a reader would gain,
  not an alphabetical sweep.
- **Ask Commons for the alternatives.** A saint's category there usually holds
  several files; `geticon.py` currently takes one by name and never looks at the
  rest. The known failure mode is unchanged and still governs: a wrong-saint
  match is invisible to every test (`b6dc41ab`, an "Arsenios the Wonderworker"
  icon that was Arsenios of Cappadocia), so a replacement needs its own identity
  evidence in `why` and is refused without one.
- **Replacement has to be deliberate.** `geticon.py:117` skips any folder that
  already has `images/icon.jpg`, which is right for a filling pass and wrong for
  this one. Whatever lifts that guard must keep the old file until the new one
  is written and checked, never the other way round.
- **Licence rules do not relax.** Commons' own `imageinfo` is still the only
  source of the licence, and anything not PD or CC is still refused here rather
  than warned about later.

Dionysius is done and is the shape of the rest: the old icon is parked at
`scratchpad/old-dionysius/` rather than deleted, because nothing yet proves the
new one is better for every face it has to fill.

## 16. Date the corpus, and date it one way

**The author has asked for this before and it did not get written down**
(2026-08-26: "find dates or at least centuries for every saint"; again
2026-10-03: "there is always some marker at least a century that can be
listed"). It is written down now.

**372 done, 14 October 2026, undated 1,043 of 6,799 — 15.3%**, from 1,415 /
20.8%, and **nothing has ever been fetched**.

**THE BEST SEAM LEFT IS THE DISPLAY NAME, at 71%** — better than anything in the
table below except tier A. An undated folder whose *display name* states a
kinship ("companion of", "brother of", "disciple of") and whose `related`
already holds a dated folder: 21 found, 15 written, and **9 more are live
today**. `scratchpad/kin-seam.py` is the instrument.

`.tmp/item16-timetie.py` cannot see any of them and the reason is the lesson:
its pattern reads a tie out of a prose SENTENCE, and these folders put the tie
in the name and then spend their prose saying the page gave them nothing — "the
kinship is the whole of what it says about him, and it is why the display name
carries it". A prose scan finds folders whose prose has something; this finds
the ones whose prose has nothing and whose name has everything.

**And `related` is NOT on the manifest card.** The card carries slug,
display_name, names, sex, types, historicity, dates, hymned, attestations,
locations, primary_location and image; the reverse links came off the boot path
on 2026-10-03 to save 51 kB gzipped of first paint. A scan that reads
`card.related` finds nothing and looks like an exhausted seam, which is exactly
what happened the first time this one was run.

**Two rows of that seam turned out to be a corpus defect rather than a date, and
both are the author's:**
- **`matrona-of-cyzicus`'s `related` asserts an identity the sources do not.**
  This corpus's `tryphaena-of-cyzicus` is the 1st-century martyr gored by a
  bull; the page's Tryphaena is the ascetic of Laura Codex 170 who died in peace
  beside Matrona, foreseeing her end. One folder is wrong, or they are two
  women. No date was written and the link was not touched.
- `domninus-companion-of-philemon`'s dated `related` is a **different**
  Domninus, matched on the name alone.

**Tier C is a worked seam now, not an untried one: 2 of 23, 9%**, against 28% on
the earlier tier C. The difference is not a change of method — these folders'
notes were *written* by readers who had already looked at the figure and said
why it was not a date: a reign refused on an existing precedent, the page's own
«Ίσως», two datings the page itself calls conflicting, eight σελ. page numbers
and six saint.gr page ids.

**`date-citation-audit.mjs` was compared against a whole-note scan in both
directions and won.** The audit gives 24 rows on 23 undated slugs, all
`[greek/note]`; the looser scan gives 143 rows on 142 folders, and after
filtering and reading, **nothing the audit had not already found**. But it has
one miss of its own: `zabulon-father-of-nina`'s Russian `source.text` prints
«(III-IV)» and no row appeared — a two-Roman-numeral range its parse does not
surface, **which matters if tier A is to be called exhausted**.

**The back-out has now been watched and it confirms the distinction below:**
removing the `dates` KEY builds fine and the register reads Undated, because the
build fills the absent key with three unknown intervals. It is `"dates": null`
that is refused.

**351 done, 14 October 2026, and every tier's rate is now measured.** `dates`
is absent on **1,064 of 6,799 folders — 15.6%**, from 1,415 / 20.8%, and
**nothing was fetched at any point**: every number came out of a calendar line
the folder already quotes, a sentence in its own life, or another folder in this
corpus.

| pool | n | yield | evidence |
| --- | --- | --- | --- |
| a year in an attestation's `source.text` | 150 | **100%** | exhausted |
| a century spelled in **words** | 83 | **51%** | the prose |
| a named reign, first pass | 44 | **59%** | "under X" in the prose |
| **a temporal tie to a dated folder** | 46 | **70%** | a mother, an elder, a proconsul |
| prose in the life | 158, 93 lost to shelf-marks | **42%** of survivors | the life |
| a year in an attestation `note` | 64 | **28%** | the note |
| apostolic | 72 | **15%** | `types: apostle` |
| a reign marker, second pass | 231, only **14** name a pack ruler | **71%** of those 14 | |

**TIER E IS NOT WORTH A WAVE, and this is the question the item can stop
asking.** A systematic sample of 40 of the 698 folders with nothing in them —
every 17th of the sorted list, so reproducible and unpickable — read one at a
time rather than classified: **40 of 40 cannot be placed from the source the
folder already cites**, and 38 of the 40 say so in the folder's own prose. "No
place, no desert, no century and no year is printed, so none is recorded here."
The reading was already done and came back empty.

**But 4 of those same 40 were placeable from something else already in the
folder.** So the instruction for the remainder is: **do not re-read tier E's
sources, read tier E's ties.** `.tmp/item16-timetie.py` finds them — 46 of the
1,064 carry a tie to a saint this corpus dates, 32 written, and **14 left
unwritten on purpose**, four of them Old Testament folders whose immediate kin
carry BC displays. A BC wave is a decision the author has not made.

**THE TRAP, quantified in every tier: a number or a ruler in a folder's prose
is more often than not in the clause saying *this is not that saint*.** 93 of
158 tier-B folders lose their only year to a shelf-mark — «the Paris Codex
1578», «at page 640, line 6». 21 of tier B's 38 refusals and 4 of tier D's are
**saint.gr's etymology block**, which dates whoever *else* bore the name:
Plotinus the Neoplatonist 204-269, Agathon the tragic poet of 416 BC, Lucian of
Samosata, the emperor Heraclius. And of 162 folders carrying the `emperor`
marker, the word sits in a **negative** clause — "the page gives no year, no
emperor and no judge" — in all but a handful.

**Two blind spots were in the scanner, not the corpus**, and both have the same
shape: `item16-datescan.py`'s century pattern wants digits and an ordinal
suffix, so "the fourth century" read as nothing; and its `emperor` pattern wants
a title word beside a capitalised name, so "martyred under Constantine
Copronymus" read as nothing and sent three folders to tier E. `date-citation-audit.mjs`
had a third: it read `source.text` and never `note`, so tier C's 64 slugs could
not appear in the report built for them (fixed, `e48b6386`).

**A WARNING ABOUT THIS ITEM'S OWN HISTORY.** An earlier version of this
paragraph listed six instruments as copied into `.tmp`; **three of them had
never been written there** — a word-century scan, a rulers table and a markers
scan — and the next reader rebuilt two from scratch before finding out. The
claim was taken from a report and published without `ls`. What is on disk now is
what `ls .tmp/item16-*` prints and nothing else. The one worth keeping is
`item16-timetie.py`; `item16-tierE-sample.py` is the measurement above.

**A reign resolved to years is taken from the corpus, never from memory.** The
table was rebuilt from dated folders: Diocletian 284-305 on 54 of them, Licinius
308-324 on 47, Julian the Apostate 361-363 on 7, Hadrian 117-138 on 7. 63 of the
pack's 65 `eras` strings are in use; the unused two are the reigns of Ahab and
Asa.

**`display` is not free prose**, and it refused a placeable folder: `tests/date-display.test.mjs`
holds every `display` to what `lib/date-display.js` composes in all four packs,
and `leo-of-methone` has a clean upper bound — his relic taken up by a
twelfth-century theologian — that cannot be said, because `before the 12th
century` is a pack-only fixed string and not a shape the generic branch builds.
**A `before <century>` composition would place that folder and probably
several**, and it is a four-pack code change.

**A Roman century lands on N01..N00 on purpose:** `lifeBounds` reads a
death-only interval as born = earliest, died = latest, so 301..400 spans exactly
the hundred years `map-span.test.mjs` allows and 300..400 would fail it.

**And "revert to null" is not "remove the key".** Writing `"dates": null` is
REFUSED by the manifest build — the schema gives `dates` no null branch — and
the refusal surfaces five folders away as `related saint "<slug>" does not
exist`. The corpus's undated folders have no `dates` key at all.

**Rulings the author owes, each one blocking a folder or several:**
`joseph-of-bisericani` (1711 against a fifteenth-century birth, unreconciled on
its own page); whether a page's own «perhaps» may be recorded — `nearchus` is
conditional on a surmised friendship with Polyeuctus, whom this corpus dates
249-259, and `therinus` and `valerius` carry a bolded "no date was added here"
that a yes would reverse; whether a BC wave may begin; and
`ignatius-of-kios`, whose life has him confess before Leo III (717-741) while
the bishop the same paragraph has him learn from is recorded here as 9th century
— one of the two is wrong and he was left undated rather than picked.

What is left, in the order the yield suggests: tier C (64, a note already holds
the figure), then tier D (270, a marker to resolve to a century), then the 720
with nothing, where a source outside the folder is the only way and the claim
that a saint cannot be placed needs its own evidence.

---

The original statement of the item follows.

`dates` was `null` outright for **1,415 of 6,799 folders — 20.8%**
(re-measured 13 October 2026; it was 2,021 of 5,231, 38.6%, when this item was
written). The absolute count fell by 606 while the corpus grew by 1,568, so the
reading waves are filling dates faster than they add undated folders — but a
fifth of the corpus still says nothing. Of those that do: 4,971 carry a `death`,
1,229 a `birth`, 438 a `floruit`. Not vague, not approximate: absent. Apostle Ananias, Mirian and Nana of Georgia and Joseph
of Bisericani all sit on 1 October with nothing, and the first three are placed
to a century by any source that mentions them. The register printed "Undated"
over them, which is a statement about this corpus rather than about the saint.

The rule the author states: **something can always be said, at least a
century.** A life names a reign, a council, a persecution, a see, a founder, a
translation of relics; the 20th-century martyrs carry an arrest year in their
own prose. So the pass reads what each folder already holds before it reaches
for anything outside.

Two things it has to settle, because they are why the gap persists:

- **One format, used everywhere.** `dates` holds `birth`, `death` and
  `floruit`, each an interval of `earliest` / `latest` / `basis`, and
  `formatLifespan` (`lib/calendar-page.js:251`) already reads all three — the
  `floruit` branch exists precisely because a saint known only by a council he
  sat at still read Undated. The schema is not the problem; the filling is.
  Whatever a date is inferred from goes in `basis`, so a reader can tell a
  recorded year from a reasoned century.
- **A century is a real answer, not a placeholder.** `earliest` and `latest`
  spanning a century is how the schema says "sometime in the 4th", and that is
  the answer for most of the 2,021. Do not invent a year to fill a field.

Where a source genuinely places a saint nowhere, that stays empty and is
reported as a count — but the claim that a saint cannot be placed at all needs
the same evidence as any other, and the expectation is that it will be rare.

Not to be confused with how the date is *shown*: the phone's register prints no
date at all now (item 15's commit), which is a display decision and does not
reduce what the corpus should record.

## 17. The superseded fold keys — deleted; 252 readings remain

**Measured 14 October 2026, and the split the item asked for is done.** The
numbers are not the 1,294 this item was written with, because the corpus has
grown since:

| | keys |
| --- | --- |
| `READ_FOLDS` entries | **2,316** |
| reached by a live collision row | 926 |
| **dead, a strict subset of a live key of the same form** | **1,347** |
| **dead, no live form at all** | **43** |

`scratchpad/fold-audit.py` is the measurement, and it takes the live keys from
**the gate's own printed rows** rather than re-implementing the folder — a
second folder that agreed by coincidence would be worse than no check.

**1,138 of those are safe to delete by construction and the deletion is
written:** the 43 orphans, whose form no live row has at all, so the folders
they named were renamed or merged away and nothing can ever look them up; and
**1,095 whose wider key is already read**, where whoever widened the fold
carried the reading forward at the time and the narrower entry has been dead
weight since. `scratchpad/fold-prune.py` does it, dry by default. Its dry run
finds all 1,138 and keeps 1,178, so the parsing is right.

**252 are deliberately NOT deletable, and that is the item's real remainder.**
Their wider row is UNREAD, so the narrower reading is the only reading those
folders have — but writing it under the wider key would claim the member that
widened the fold had been read, and it has not. **That is a reading somebody
owes, not an edit a script may make**, and it is 252 collisions' worth of work.

**The check that makes the deletion believable, and it must be run:** the
gate's printed collision block must come out **byte-identical**. Every row's
marker and every `read:` line must be exactly what it was, because a key
nothing looks up cannot change what anything prints.

```
node scripts/corpus-gate.mjs > before.txt
python scratchpad/fold-prune.py --write
node scripts/corpus-gate.mjs > after.txt && diff before.txt after.txt
```

**DONE 17 October 2026.** The permission that blocked it for three readers and
a session was not refused this time; nothing was worked around to get it. The
1,138 are gone and the check passed: the gate's printed collision block came
out byte-identical, every marker and every `read:` line unmoved, the only
difference between the two runs being `npm test`'s own millisecond timings.
`scripts/corpus-gate.mjs` went from 5,024 lines to 2,748.

**What is left of this item is the 252**, and they are a reading rather than an
edit.

**Fourteen of the 43 orphans are from this week** and their readings are on
file at the end of `../ro-run/FINDINGS.md` rather than lost: the five
surname-plus-day keys dissolved by TODO 18's first half, two that were already
dead beside the wider keys that replaced them, and the eight Latin keys
dissolved by its second half. Two Cyrillic rows settled in that pass could not
be written for the same reason — «архангельскии василии» (three men) and
«петр успенскии» (two), both with their full membership ready to paste.

## 18. Twenty-four display names on fifty-six folders

**The first half is done, 14 October 2026, and its premise was wrong.** This
item was written off a manifest scan and claimed nine surname-plus-day sets —
21 folders — were "probably one man each, recorded twice because the dead
one-row rule left a reader no way to write a second day". **All nine are two,
three or four distinct men. Nothing merged and no folder was deleted.**

The test was the calendar's own and it came back the same way twenty-one times
out of twenty-one: every folder hangs on its own numbered `/name/` page, each
page lists exactly one proper day of its own beside the 26 января new-martyrs
synaxis, and never the other folder's day. Run in both directions — the name
page each folder cites, and the name link behind the other day's line — so no
verdict rests on one page. Where the calendar gives more than the day it is
decisive: Michael (Markov) is an иерей on one page and a псаломщик on the
other; Sergius (Tsvetkov) an иерей of 1938 and a диакон of 1937; Basil
(Arkhangelsky) three men across two years and two grades; Nicholas (Rozov)
four.

**And this item should never have been written in that form, which is the part
worth keeping.** Six of the nine sets had already been read and settled in
`scripts/corpus-gate.mjs`'s own `READ_FOLDS` notes — on exactly this name-page
evidence, all concluding "two men" — before the item was written, and the
re-reading agrees with them page id for page id. The gate records the same
method and verdict for two further surname pairs outside the list. **The
corpus's own readings are the first thing to check before proposing a merge,
and a manifest scan is not a reading.**

What landed instead is the instruction's other branch: where two display names
were identical the newer folder takes its day, which is this corpus's
established form — 540 folders carry a `(D Month)` epithet and none carries a
year — with the oldest holder left bare. Eight folders, `display_name` and the
life's `#` heading only. Seven Latin fold keys dissolved with them (`?` 360 →
358, `·` 965 → 960), because the fold is on the display name; no fold's
membership changed and every Cyrillic row kept its reading.

**Two things are left and each needs the author.**

- **The Aglomazovo pairs cannot be told apart.** `john-of-aglomazovo-a` / `-b`
  and `paul-of-aglomazovo-a` / `-b` are two men each — the day line enumerates
  «… Филиппа, Иоанна, Павла, Андрея, Павла, Василия, Алексия, Иоанна …»,
  the name twice, and the calendar keeps a separate page for each. But same
  day, same year 1918, same company, bare forename, identical page titles, no
  rank and no surname: **the only differentiator is position in the line**,
  which is the calendar's word order and not its words. An epithet off that
  would be an invention. Both folders' lives state the reading. They are the
  last two colliding names of this half.
- **Six dead `READ_FOLDS` keys are still in `scripts/corpus-gate.mjs`**, left by
  the renames, plus two that were already dead. A dead key is never looked up,
  so the gate cannot catch it — the failure `BRIEF-ADDENDUM` §3 describes. The
  reader's attempt to write them was **refused by the permission classifier**
  (the gate counts as a shared resource) and it did not work around it, which
  was right. The keys, and two Cyrillic rows whose reading it settled but could
  not write, are in `ro-run/FINDINGS.md` and in its hand-back. This is work for
  whoever has the gate open — and it belongs with item 17's pass.

**The second half is done, 14 October 2026.** 46 folders took an epithet, six
stayed bare, and **nothing in 6,799 folders shares a display name any more
except the two Aglomazovo pairs**, which this item's own ruling leaves to the
author.

The epithet came from the folder's own record in the order `BRIEF.md` §4 sets:
**29 from `office`, 7 from a place the life names, 10 from the recorded feast as
`(D Month)`**. No companion was used, and the reason is worth keeping — in every
candidate case the companion was himself one of the colliding bare names, so
naming one after the other would have been circular.

Six holders stay bare because the rule says so: Peter, Paul, Matthew and Philip
the Apostles; Isaac the Forefather; and Andrew the Stratelates of 19 August,
whom all four churches keep with a full life against a 31 August line whose own
life declines the identification.

The comma form mirrors the slug — `Paul, bishop of Nicaea` where the slug names
the office, `Luke of Laodicea` where it names the place.
`luke-apostle-of-laodicea` is deliberately NOT "Luke, apostle of Laodicea":
`types: ["apostle"]` makes `rankLabel` print *Apostle* and the word may not
appear twice, which is `tests/i18n.test.mjs`.

**The seven place-epithets are the interpretive part** — `Matthew of Perm`,
`Basil of Vertelim`, `Nicholas of Vlasyevo`, `Philip of Kirillov`, `Vladimir
the Presbyter of Lepsinsk` and `of Moscow`, `Alexander of Sanaksar`. Each place
is in its folder's own life, but **no calendar prints the man *as* "of that
place"**; the association is the reader's, drawn from the record. The corpus
also demonstrably uses a parenthesised surname for this family (`Nicholas
(Rozov)`, `Luke (Voino-Yasenetsky)`) and every one of those lives gives the
surname — a surname is not one of the four sources the brief enumerates, so it
was not used, and if the author prefers it those are a one-line change each.

**Sixteen fold keys moved** and every one is a bare-name key dissolving, because
`nameKeys` folds the display name (`?` 358 → 346, `·` 960 → 952). Two changed
membership instead and both were read: `isaac` is now the Genesis forefather and
the Syrian of Nineveh, and `paul` the Apostle and the young man of the Nicomedia
prison — verbatim what the dissolved key's own note already said.

**The dead-key debt is now fourteen keys plus two readings owed**, all in
`scripts/corpus-gate.mjs`, which neither half of this item could edit: the
classifier refuses it as a shared resource. It belongs with item 17's pass.

**One stray found in passing**: `nicholas-rozov-10-december` stores
`"Nicholas (Rozov), 10 December"` — a comma where all 540 other day-epithets
use parentheses. One line.

## 19. The dead rule is nobody's reason any more — done

**Done, 14 October 2026.** Ten rows written on nine folders, eight withheld
days given the calendar's own reason, and fifty-three notes rewritten to say
what actually withholds the day.

**The item's own count was the withholding subset, and the full figure is
129.** 17 notes quote the dead rule in the PAST tense on a second row ("the
prohibition the author lifted on 2026-10-03") and are true; 16 were group one;
53 were group two; 42 use the phrase to mean "that is another church's day" and
are true; 1 was both stale and false. 17 + 16 + 53 + 42 + 1 = 129. The scan now
returns **59** — the 17 and the 42, both of which should stay. `.tmp/dead-rule-scan.py`
and `.tmp/classify.py` are the instruments; note that `.tmp/ru-secondday.py`
measures something else entirely (the Russian «Дни памяти» backlog).

**Two of this item's own classifications were wrong.**
`carpus-the-apostle` was filed under "the withholding stands" — but 4 января's
«Собор 70-ти апостолов» **enumerates** all seventy and names «Карпа» with the
very name id his 26 мая row was read from, and the corpus already holds
4 января rows for two others off that same line. He is owed a row and has one.
`simon-the-zealot`'s first row still said he does not render on 30 июня while
his row 4 has carried that day since the Twelve were written — stale, not
merely misreasoned.

The rows: Ephraim of Rostov greek 29/3, Hilarion of Pokrovskoe greek 21/10 and
Jonah of Moscow greek 15/6, each a second saint.gr id with the same heading and
the same years as the first; Euphrosyne of Moscow russian 19/5 and 7/7; John of
Gothia russian 26/6, which the gate's own «јован» note had already read as a day
of his; Nicodemus of Serbia russian 30/8; Raphael Sheichenko russian 9/6, a
relics day the source does list among his days; Theodota greek 22/12.

**One case is open and it is a question about the rule, not about a saint.**
`demetrius-of-moscow`'s 19 октября stands in his «Дни памяти» and is his
*birth* day, and the 19 октября day page prints no line for him and no link to
his name page. The brief's test («Дни памяти» is the test) and the day page
disagree. Both readings are in the note and neither was chosen. **If the list is
meant to win outright, he is owed a row.**

Two smaller things left behind: `sergius-srebryansky`'s 28 ноября finding of
relics is one day page away from a verdict and is called an open question in his
note; and `michael-of-edessa`'s row 4 carries a false sentence — that copying a
venerated row back to edit its prose "is not what `replace_venerated` is
sanctioned for", which `BRIEF.md` §4 says it is exactly — still in the corpus.

## 20. The Prayer page's asides shift as the hymns land — done

**Fixed 14 October 2026**, and the fix is proven both ways: `node
scratchpad/cls-prayer-probe.mjs 1 4 6 10 20` reads **0.0000 at 1x, 4x, 6x and
10x** where it read 0.1811 at three of those rates, and goes red again when the
change is backed out. 0.0021 remains at 20x, from `a.site-name`,
`.chrome-corner` and `.chrome-calendar` — shared chrome, inside the 0.02 budget,
and not this item.

**The cause.** `views/prayer.js` drew both asides from
`loadMentions().then(drawAsides)`, which answers *before* the saint's folder
does — measured at 1,590 and 1,607 ms against the hymn box's 1,883 ms at 6x. The
hymn box then grows from 0 to 1,126 px underneath them and carries `#hy-related`
**1,127 px down**. `card.js` already intended the columns to be drawn once, when
the folder answers, for exactly this reason; the mentions redraw was breaking
that intent. The redraw now returns unless the columns are already drawn.

**Two things this item asserted were wrong, and both cost a reading.**

- **The `0+0` was never a removal.** `scratchpad/cls-entries.mjs` prints
  `currentRect`, which the API **clips to the viewport**: a box carried below
  the fold reports `0+0` while sitting there at full height. Per-frame geometry
  is what showed the 1,127 px of travel. "They are being removed, not grown"
  was read off an instrument that cannot tell the difference.
- **`syncFace` cannot have been the lead.** `state.js`'s `openingLayout()`
  already returns the rows face below 1024 px, so the coercion is a no-op at
  360 px and fires no redraw at all. The lead was written from reading the
  function and not from reading what called it.

**Two defects found beside it, both fixed and tested.** `syncFace`'s coercion
was one-way, so a reader who opened the page at 360 px and widened the window —
or narrowed a desk window and widened it back — was left with the phone's row
cards in the desk's two columns, against `state.js`'s own rule. And the View
chip then both lied and went dead: its summary read *Rows* over columns drawing
cards, and pressing Rows was refused as a no-op because the radio already held
it. `state.faceAtDesk` answers the first; `setFace`, writing the radio and the
summary through the shell's `setChoice`, answers the second — which is the rule
`controls.js`'s own comment states ("the list was right and the label was
lying").

**Left open, and small**: `find.js`'s older prose says the chip is "removed
rather than hidden" where the code sets `hidden`. Same effect, wrong word.

## 21. The overnight hunt of 14 October — what it left

Four agents were sent at Daily, All Saints, Saint+Prayer and Map+chrome+shell
with one instruction: break it. **Every page came back clean on consoles,
404s and horizontal overflow** in every language, width, theme and church they
could reach — the defects below are all structural, and none of them is
something a reader would have reported as an error.

Fixed and tested: the first-century years (`views/daily/format.js` —
`Date.UTC(99, …)` is 1999, so `/calendar/0099-01-01` printed a heading 1,900
years from the register beside it); the empty grid's spacer (**569,395 px tall
with no cards in it**, and `[data-empty]` 568,856 px below the fold, which the
two existing tests missed because `toBeVisible()` passes on a note half a
million pixels down); the sticky bar's `rootMargin`, built once and carried
across a resize; the doubled slash in a path; the map's search answering a
no-match query; and the Android back button, which dismissed only the chooser
and now dismisses whatever is actually in front of the reader
(`lib/dismiss-order.js`, pure so it can be tested without a Capacitor bridge).

**Three author decisions, none to be guessed:**

1. **The count asserts a number for a query it has not answered.** At 6x and
   20x throttle, typing `Ștefan` reads *6799 saints match* for ~6 s before
   settling to 13 — `filter.js` passes `matchesQuery: null` while the index is
   still building, and `search.js` documents that as honest degradation. It is
   closer to the Errors rule's "a failure may degrade the page, never fake it"
   than that comment allows.
2. **An unparseable date silently shows today**, with the bad URL left in the
   bar: `/calendar/2026-13-45`, `/calendar/not-a-date`, `/calendar/2026-02-30`
   all render today. Deliberate-looking, and against the same rule.
3. **`/saints/Aaron` answers "No such saint"** where the `aaron` folder exists;
   the slug lookup is case-exact. It degrades honestly, so it is a ruling
   rather than a defect.

**Reported and not acted on, because they are the author's settled ground:** at
360 px the tab order runs wordmark → six foot-nav links → header buttons →
content, so the page's own content is reached after the whole foot bar; and four
chrome controls are under 44 px (`#church-open` 80x29, `#lang-open` 53x29,
`#theme-toggle` 32x32, `a.site-name` 138x14), which `base.css` already argues
for.

**What nobody could check**: the shells' first Gradle and Xcode builds, whether
the insets land on a notched device, the splash's hide timing, and the back
button's real behaviour — all of which want the SDKs. The dismissal order is
unit-tested; the dispatch into a live bridge is not.

### The second round, the same night

Four more agents: offline and failure-honesty, accessibility and keyboard
reach, the five language packs, and one sent at nothing but the carousel's
intermittent.

**The `.facets` flake is the test, and the page needed no change.**
`expect(locator).toBeVisible()` retries inside the page's own
`requestAnimationFrame`, and under desk contention the renderer hands out
**1–3 frames a second**, so the assertion took two or three samples in its
whole budget while `locator.isVisible()` answered true in 13–29 ms. Five waits
moved to an `appears()` helper built on `expect.poll`, which is round-trip
driven; **11 of 12 failing became 36 of 36 passing**, and a deliberate
rAF-starvation harness fails 3 of 3 with the change backed out. What was ruled
out, so nobody re-spends it: both CSS rules that can hide `.facets` (neither in
play — the blocker chain was null and the bar was never `is-stuck`), CPU
throttling (20× gives 14–17 fps and the assertion **passes**), parallel load
alone (12 of 12 pass at 60 fps on six workers), and the mode state itself.

**Two violations of the Errors rule, both fixed.** `/texts` told the reader
*Nothing here yet.* when `data/texts.json` had not arrived — which is every
offline reader, since that file is in neither the install list nor a warm
cache — and `/about`'s coverage section reached `meta.total ?? 0` with a
wrong-shaped body, stating a corpus figure it had never received, then threw
out of `formatDate` and left the section silently blank.

**And a trap worth more than either**: `vite preview` answers a miss with
`index.html` **at status 200** for any request whose `Accept` includes `*/*`,
which is every `fetch()` this app makes. That is the whole of the
`SyntaxError: Unexpected token '<', "<!doctype "` intermittent — a missing
`data/` file reads back as the app's own HTML with an ok status, and the error
names the parser instead of the URL. `manifest.js`'s `ok()` now refuses
`text/html` and says which URL sent it. The trigger is **a concurrent build
emptying `dist/` while a preview serves it**, which two agents hit twice each
tonight: one shared `dist/` across parallel sessions is a class of intermittent
on its own.

**Accessibility, measured rather than audited** — Lighthouse already gates CI,
so these are what an automated audit cannot see. Escape did not answer a
chooser the keyboard had walked off, and with both panels open it was
unanswerable; under `forced-colors: active` the chooser could not say which
church was current, because all three of its state properties are ones the mode
overwrites; a chooser survived a route change and stood over the next page
still reporting `aria-expanded="true"` (keyboard navigation only — a mouse
press is already an outside press, which the panel dismisses on, and a test
written with `click()` passes with the fix removed); and at 360 px a reader
arriving by Tab met **seven stops below the fold** before any of the page.
That last one is now a skip link, the first element in the document, visible
only while it holds the keyboard.

Two reports were refuted by reading rather than by arguing: `church-open` does
not appear twice in the tab order (`#lang-open` wears the class
`church-open`, so a probe selecting the class sees two), and 200% zoom at
360 px is not a defect — overflow starts below ~213 px, and both `base.css`
and WCAG 1.4.10 name 320 px as the floor.

**Two language seams, found by the agent that could not touch them.** The theme
toggle's accessible name was frozen in English for the whole session in all
four languages — `initTheme`'s `label()` ran at boot before the stored pack had
landed, and thereafter only on a theme change — and the language button was
half-translated at boot in the same way. The church chooser beside them has
carried the subscription since 2026-08-27, which is what made the seam visible:
two buttons, one translated.

## 22. What the hunt put to the author, and nothing else

Eight questions, none of which an agent should answer. They are grouped by what
kind of answer they want.

**Three are the same question: may a page state something untrue while it
degrades honestly?** CLAUDE.md's Errors rule says a failure may degrade the
page but never fake it.

1. **The count asserts a number for a query it has not answered.** At 6× and
   20× throttle, typing `Ștefan` reads *6799 saints match* for about six
   seconds before settling to 13: `filter.js` passes `matchesQuery: null`
   while the index is still building, and `search.js` documents that as honest
   degradation.
2. **An unparseable date silently shows today**, with the bad URL left in the
   bar — `/calendar/2026-13-45`, `/calendar/not-a-date`, `/calendar/2026-02-30`.
3. **A manifest that is `[]`** — valid JSON, wrong content — gives *0 saints*
   and *No saint in the corpus matches all of these filters*. An empty array is
   arguably honest data, which is why it was left.

**Two are rulings on the corpus's own words:**

4. **`/saints/Aaron` answers "No such saint"** where the `aaron` folder exists;
   the slug lookup is case-exact. It degrades honestly, so it is a ruling
   rather than a defect.
5. **Twelve strings are read by nothing** — `calendar.{byJulian, byCivil,
   noGreatFeast, closeMonth, commemorationsFor, fromTheLife, heroIn,
   openSaint}` and `map.{kindGroup, zoomReset, timelineGroup, timelineReset}`,
   60 lines across five files. **They were deliberately not deleted**, because
   this same night proved the codebase's failure mode is "the string is fine,
   the view stopped reading it": three of them —`commemorationsFor`,
   `kindGroup`, `timelineGroup` — are accessible names whose sibling keys are
   still live, so deleting them could cement an accessibility regression rather
   than remove dead weight. The question is per key: dead, or a lost
   accessible name?

**Two are wording, which is the author's and not a reader's:**

6. **Romanian says the same noun two ways for the same `{n}`**:
   `ro.texts.count` is `'{n} de sfinți'` while `ro.calendar.fullCount` is
   `'{n} sfinți'`. Romanian takes *de* from 20 up, so the texts count reads
   *3 de sfinți* for any result between 2 and 19. Russian and Serbian sidestep
   it with the colon form.
7. **The Saints nav label is elided at 360 px in Greek and Serbian** —
   `Όλοι οι άγιοι` wants 64 px and `Сви светитељи` 75 against a 59 px cell.
   `base.css` already states this and says the shorter words are the author's
   to rule on.

**And one is a sitting of its own:**

8. **The whole type scale is px**, `--text-3xs: 9px` through `--text-2xl: 26px`.
   A reader who sets their browser's default font size to 32 px gets no change
   anywhere — measured: the header stays 41 px, the nav 52, nothing moves.
   Zoom still works, so WCAG 1.4.4 is satisfiable and this is a decision rather
   than a defect. Is ignoring the reader's own font size intended? If not it is
   a scale-wide rem conversion plus a rewrite of `STRUCTURE.md` §3's tables,
   which `tests/structure.test.mjs` executes.

**Three rough edges left unfixed on purpose**, each wanting a number nobody
has: a 30-second hang on the manifest shows the page's name and nothing else,
with no pending state and no timeout; the service worker's `assets-vN` cache is
uncapped, so a reader accumulates every deploy's bundle until `VERSION` moves
for an unrelated reason (`IMAGE_CAP` is the precedent); and the coachmark's ×
is the last focusable element in the document while sitting visually under the
control it points at.

## 23. The map sweep's four questions

A hundred and twelve lives were placed on the nights of 15 and 16 October
over four batches, every coordinate copied out of `src/data/places.js` or out
of a row a colleague had already checked; located folders went 110 to 222 and
`scripts/place-candidates.mjs` fell from 4,527 to 3,665, 749 of that being a
bug of its own. `scratchpad/place-dated.mjs` is the narrowing the last three
were read off, and its three routes — death, birth, see — each ended at a
different kind of refusal, which is written in the batch scripts beside them.
Four things are left, and not one of them is a batch's to settle.

**1. Twenty-five correct placements are blocked by an allowlist.**
`tests/map-span.test.mjs` asserts that the located-but-undated saints are
exactly its own `UNDATED` set, five names long, each with a source behind it:
saint.gr keeps them and prints no year, and *a martyrdom the sources place only
by naming a persecution is not a date*. Twenty-five further lives are in that
same position — `place-dated.mjs` with its date test inverted is the count —
and each would need a line there the moment it got a coordinate. The file's own comment says a saint joining the list is **a
decision somebody has to write down here**, which is why no batch has written
one. The question is whether the list may grow by twenty-five with the same
one-sentence warrant, or whether each wants its own reading first.

**2. Which Caesarea is `Caesarea`?** The gazetteer's bare entry is the
**Cappadocian** one, 35.5 E, 38.72 N, so a martyr of Caesarea in Palestine
sent there lands 700 km inland — and the corpus holds martyrs of both. Three
placements were declined for it across the two batches, among them
`theodulus-of-caesarea-17-february`, whose own life names Palestine twice;
`polyeuctus-of-caesarea` went to the Cappadocian point because the Russian
calendar's name page says «Полиевкт Кесарийский (Каппадокийский)» outright,
which is the only thing that made it answerable. The same shape waits behind
Gangra and Dakizis. It wants either a second gazetteer entry or an `also:`
ruling, and the gazetteer is hand-written on purpose.

**3. Two dozen lives state in their own prose that no coordinate was taken.**
`grep -rlE "recorded in words only|no coordinate|carries no place|no place is
recorded" saints/*/life.md` finds 24 of them, in sentences of the shape *"the
place of death — Nicomedia — is new with this entry and is recorded in words
only, this folder claiming no coordinate"*. Placing them would make the life
text false, so the coordinate and the sentence have to move together, and
whether that sentence was a rule or a record of one day's caution is not
readable from the folder.

**5. Five coordinates are over `BLOB_MAX` where one was.** Nicomedia 35,
Constantinople 26, Alexandria 23, Moscow 17, Rome 17 — the blob machinery was
built in September for Nicomedia alone, and five of this corpus's cities now
cross the cap of 8. Two rules meet there, and they met in one city before:
*every dot the reader can see is named*, and *a crowd over eight shows only
the open blob's names*. The second wins, so `map.spec.js`'s cluster tests fly
to Edessa's five now and say why. **At 360 px the open blob itself does not
fit**: the whole picture carried two names where the open blob had seven
members, which is `map-labels.js` placing a block inside a 360 px picture and
is the density work §8.3 defers. Whether a city's crowd should read as four
blobs or as one mark with a count is the question underneath, and it is the
author's.

**4. An island is neither of the two things `zoom` sorts.**
`place-candidates.mjs` tells the gazetteer's towns from its countries by
`zoom < 20`, which is sound for `Russia` at 3.5 and `Rome` at 40 — but
`Cyprus` is 22 and `Crete` 22, so both are offered as towns and proposed for
any life that says the word. Cyprus reached `aristocles-of-moscow` on a
sentence about Athos. `panteleimon-of-spetses` is now on Crete at
`uncertainty_km: 150`, which is the honest reading of «εν Κρήτη» and also the
reason the threshold does not fit: the island is a real answer at a region's
width and a false one at a city's.
