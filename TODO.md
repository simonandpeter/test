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

**Re-measured on main, 13 October 2026**, after `npm run build:manifest` at
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

## 9. The Russians, for the full year, with their images

The Russian calendar covers **63 of 366 days** today, against 364 for the Greek
and 357 for the Romanian. Read `days.pravoslavie.ru` (Julian date in the path)
for the whole year, folder by folder, to the same standard as the Greek and
Romanian waves: the name in the calendar's own words, a life, the attestation
with its citation, hymns where the page prints them.

Then their icons, by `scratchpad/geticon.py`'s rules — the licence comes from
Commons' own `imageinfo` and a file Commons does not state as public domain or
a CC licence is refused, never warned about. One fetcher at a time: parallel
sourcers draw 429s through the whole backoff ladder.

## 10. Then the Serbians

**44 of 366 days.** The Ohrid Prologue at pravoslavno.rs, Julian, same standard,
then their icons. Only after item 9 is finished.

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

**185 done, 14 October 2026, and the yield rate is measured** — which was the
thing nobody had. `dates` is now absent on **1,230 of 6,799 folders — 18.1%**,
from 1,415 / 20.8%, and nothing was fetched: every one of the 185 came out of a
calendar line the folder already quotes or a sentence in its own life.

`.tmp/item16-datescan.py` tiers the 1,415 by the evidence their own files hold:

| tier | evidence | n | yield |
| --- | --- | --- | --- |
| A | a year or century in an attestation's `source.text` | 150 | **100%** — exhausted |
| B | a year or century in `life.md` prose | 211 (really 114) | **70%** |
| C | a year or century only in an attestation `note` | 64 | untried |
| D | a marker (reign, council, persecution, Soviet) and no number | 270 | untried |
| E | nothing at all | 720 | — |

**The in-folder scan reaches 695 of 1,415, 49%.** Tier A was a scripted
conversion with a hand review and cost almost nothing per folder; tier B costs
a real reading each and one in three ends in nothing.

**Tier B is half the size it looks, and this is the trap to carry forward: a
year in a life is as often a manuscript as a date.** 97 of its 211 folders —
46% — have their only year as a shelf-mark or a page reference: «the Paris
Codex 1578», «the Sinai codex 631», «at page 640, line 6». saint.gr's shortest
notices say which manuscript keeps the saint and nothing else, so a numeric scan
reports a date exactly where the page is confessing it has none.
`.tmp/item16-lifefilter.py` filters them; tier B's real reach is 114.

**A Roman century lands on N01..N00 on purpose.** `lifeBounds` reads a
death-only interval as born = earliest, died = latest, so 301..400 spans
exactly the hundred years `map-span.test.mjs` allows and 300..400 would fail it.

**And "revert to null" is not "remove the key".** Writing `"dates": null` into a
folder is REFUSED by the manifest build — the schema gives `dates` no null
branch — and the refusal surfaces five folders away, as `related saint
"<slug>" does not exist`. The corpus's undated folders have no `dates` key at
all.

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

## 17. The 1,294 superseded fold keys

**Scheduled by the author, 13 October 2026** ("schedule a pass over dead fold
keys"), after the count came out of a session that kept tripping over them.

`READ_FOLDS` in `scripts/corpus-gate.mjs` keys a reading by form plus the
sorted slug list, on one line, and `foldKey` joins them with a space:

```js
const foldKey = (key, slugs) => [key, ...[...slugs].sort()].join(' ');
```

Lookup is exact. So when a collision widens — a third saint arrives under a
name two already shared — the old two-slug key stops matching anything and the
row goes **unread**, printing `?`. That is the safe direction: a stale narrower
key cannot pass a wider row. Nothing is broken, and that is why this is a
tidying item and not a defect.

**The size of it: 1,294 of 2,311 keys match no live collision.** They are not
junk — each one is a reading somebody made and wrote down — so the pass is not
`grep -v` over the file. Two things have to come out of it:

- Which superseded keys are *subsets* of a live key. Those readings belong to
  the live row and should be carried forward into it, by hand, the way a
  widened key's narrower entry has been handled all along.
- Which match nothing at all any more, because a folder was renamed or merged
  away. Those can go, and the count of them is worth printing: a surprising
  number would mean slugs are moving more than anyone thinks.

**Measure before editing.** The gate prints `GATE GREEN` while still showing
unread folds, so the only honest before/after number is the `?` count by
codepoint — `grep -E "[·?]"` is a byte class and misses the multibyte `·`:

```
python -c "import io;s=io.open('g.txt',encoding='utf-8').read();print(s.count(u'?'),s.count(u'\u00b7'))"
```

It stood at **360 unread on 13 October 2026** with the corpus at 6,799 folders.

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

**The second half is untouched: 22 names over 52 folders**, the bare ancient
ones — `Peter` ×5, `Philip` ×3, `John` ×3, `Alexander` ×3, `Basil` ×3,
`Faustus` ×3. Nothing is duplicated there; the names are underdetermined, and
the fix is the opposite one — give each the epithet that distinguishes it, as
`BRIEF.md` §4 already requires of every new folder, with the see in `office`
and the rank in `types`. Measure with:

```
node -e "const m=require('./data/manifest.json');const c={};for(const s of m)(c[s.display_name]??=[]).push(s.slug);for(const[k,v]of Object.entries(c))if(v.length>1)console.log(v.length,k,v.join(','))"
```

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
