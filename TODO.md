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

**What is left is the corpus pass, and it is `STRUCTURE.md` §6 item 13 now**:
Andrew the First-Called (Romanian 30 November) and Philip (14 November) are
still recorded only on the 30 June synaxis, and a reader who opens the Romanian
30 November will not find Andrew. The note on each first row already names the
day; the day's own page is the citation and is read before it is written.

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

## 3. The 44 lonely date-tags

358 display names carry a parenthesised day. For 115 of them a namesake in the
corpus carries one too, which is what the convention is for. **44 carry a day
with no namesake anywhere in the corpus by any spelling** — Abdas (8 July),
Aristonicus (19 April), Basilla (24 December), Felicity (8 March) and 40 more.
(The count already allows for namesakes distinguished another way, so "Adrian
(17 April)" is not counted while "Adrian of Nicomedia" exists.)

They are not necessarily wrong: a sourcer reading a calendar that listed three
Theodores may have tagged defensively, and the twin may be a saint not yet
added.

**Do:** check each of the 44 against its source calendar. Drop the day where the
name is genuinely unique in that calendar; keep it, with a note saying why,
where a namesake is real but unrecorded.

## 4. The ten icons Commons refused

**Done, 3 October 2026** — `git log --grep=Icons`.

## 5. The image programme, then the Russians

Romanian and Greek still lead with an imageless hero on most days; the Russian
reading wave (`days.pravoslavie.ru`, julian) has not started. Counts are in
HANDOFF.md and go stale — re-measure, do not quote them.

**Measured 3 October 2026** (`node scripts/heroless.mjs romanian greek`):
Romanian 141 of 357 days and 140 distinct saints, Greek 168 of 364 and 168, nine
saints in both — **299 distinct saints** want an icon. `scratchpad/geticon.py`
is the instrument; it reads the licence off Commons' own `imageinfo` and refuses
anything Commons does not state as PD or CC, so a sourcer cannot get a licence
wrong. **A historical painting may fill a hero slot where no icon exists**
(author, same day), said so in the draft's `why`.

**The manifest is the reason the corpus's size is not free.** The first paint
waits for the whole of it, so every saint added costs FCP on the Lighthouse
floor: the growth to 419 KB gzipped put FCP at 1,507 ms against a 1,500 ms line
on every route, which is what sent `mentionedIn` into its own file
(`aafc2470`, 419 -> 347 KB). An icon costs the manifest almost nothing — 14 KB
gzipped for all 5,393 rows' `image` fields — but a reading wave's attestations
and dates do, and the next thing to come off that path when it binds again is
`attestations` at 62 KB.

## 6. One search bar, with Advanced as an option, on both pages

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
early corpus, lines"`, five commits). `node scripts/link-coverage.mjs` now reads
8,931 edges and 2,113 isolated, 40.4%, against 8,464 and 2,235 when the item was
measured. **93 of the 383 gained a link and 290 name nobody this corpus holds**,
which is the honest rate for the early corpus: the slice-by-slice yield was 33
of 110, then 17, 16, 6, 16 and 5 of 60, 60, 60, 60 and 33. The 6 is the modern
martyrs, whose companions are mostly not glorified.

**What is left of this item is not another slice of that list.** Two things came
out of the pass and neither is in it:

- **1,497 links point one way only, corpus-wide**, out of 8,931 ends. Every
  reader on this pass made its own writes symmetric and left the rest, because a
  one-way link already in the corpus is somebody else's claim. A sweep that
  completes them is a day's work and wants a rule first: a reverse is only owed
  where the *forward* link came out of a life's sentence.
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

`dates` is `null` outright for **2,021 of 5,231 folders — 38.6%**. Not vague,
not approximate: absent. Apostle Ananias, Mirian and Nana of Georgia and Joseph
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
