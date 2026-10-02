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

**The Charitina half is gone rather than done**: the author ruled the two are
one woman and item 13 merged them, so there is no pair left to link — one record
carries both Greek days and the September entry's evidence. What the item asked
for in general is the sweep in item 13's second half: same-name pairs whose
lives already name each other in prose. A pair that the sources say are *two*
people wants the link; a pair they say are one wants the merge, and the author
rules which.

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
translator of relics, two commemorations that may be one person (item 13). It
comes out of the saint's own life or the calendar's own line, never out of a
shared name or a shared day. A wrong link is worse than a missing one — the
corpus's known failure mode is the wrong-saint match (`b6dc41ab`).

Every link is two-way, or the reader meets a one-sided relation.

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

`e2e/index-grid.spec.js` and `e2e/prayer.spec.js` were both rewritten on 2 October
and **neither has been run in a browser**: port 4173 was held by the preview the
author was reading, and `reuseExistingServer` is false. `npx vite build` is clean,
so imports and syntax are sound; nothing about the rendered page is verified.

`index-grid` is the check that All Saints did not move when `wireControls` was
lifted off its state singleton. `prayer.spec.js` is the one that changed most.

**Do this before any push**: stop the preview, run both, repair what they catch.
Say which failed and which could not be *run* — never blur the two.

Also waiting, and small: five dead `STRINGS.prayer` keys (`searchLabel`,
`searchPlaceholder`, `views`, `viewPlate`, `viewRows`) are still in `strings.js`
and the four packs, left because another agent was editing all five files.
`locale-coverage.mjs` must read 0 fallbacks after they go.

## 13. Charitina is one woman: merged. The others are below, for the author

**The merge is done, 3 October 2026** (`git log --grep="one woman"`). One
record, `charitina-the-martyr-5-october`, with the Greek 4 September and the
Greek 5 October each carrying its own citation and the Romanian 5 October as it
stood; the display name has dropped its parenthesised day; the September
entry's evidence — the company her memory is kept in, the shared verse, the
Trajan supposition that stands two centuries off the October entry's 304 — is in
the life, because it is *why* they are one.

The old slug does not 404. An unknown slug renders a refusal with a link to All
Saints, so `aliases` is new in the schema, written only by a merge: the manifest
carries it and the saint page replaces the URL with the live slug's.

### The candidates, for the author to rule

**Nothing below has been merged and nothing below should be merged by anyone
but the author.** Every row is the sources' own doubt, quoted. A pair that only
shares a name is not here: 115 name-pairs in this corpus carry a disambiguating
day precisely because they are different people, and a wrong merge is invisible
to every test (`b6dc41ab`).

The funnel, so the list can be judged: 226 folders of 5,231 carry any of the
cross-reference prose shapes, 40 carry a tight *identity question*, and of those
40 only these ten have **both halves standing as folders here** — the rest point
at a day or a person the corpus does not hold, so no merge is even possible. A
mechanical pass for signal 2, the shared synaxarion verse, found 34 shared Greek
couplets and **every one of them is companions inside one entry on one day**; it
produced no candidate at all.

| # | the two folders | the doubt, in the corpus's own words |
| --- | --- | --- |
| 1 | `nectarios-of-aegina` + `nektarios-of-aegina` | The corpus already says it: "the same saint as nektarios-of-aegina (the Greek and Romanian entry for the translation of his relics)". Against: a translation of relics is a commemoration some would keep separate. |
| 2 | `ia-of-persia` + `ias-of-persia` | Both lives say it, each about the other — "she may be the same as the Ias kept on 11 September and 4 August"; "the Greek synaxarion thinks the Ia of 10 September may be the same woman". One story in both: captive with nine thousand, before the magi under Shapur. The source notes the verses differ. |
| 3 | `titus-the-soldier` + `titus-27-january` | One calendar, two days, each page pointing at the other: "for Titus the soldier, see 27 February"; "his memory is kept again on 27 January". The January folder is a cross-reference stub with no life. |
| 4 | `mnason-of-cyprus` + `mnason-the-disciple` | "it is possible, it says, that he is the same saint who is kept on 19 October as Mnason the ancient disciple, although that one fell asleep in peace" — and this one is martyred by the sword. |
| 5 | `zosimas-the-hermit` + `zosimas-of-cilicia` | "whether the two are one man is left open" — and both lives tell one story: the monk of Cilicia among the beasts, the governor Dom(e)tian, the lion that speaks. Note that `HANDOFF.md` records the opposite call being made deliberately on the days: two days, two lives, kept as two. |
| 6 | `abibus-of-hermoupolis` + `sabinus-of-hermopolis` | «Ίσως είναι το ίδιο πρόσωπο με τον Άγιο Σαβίνο τον Αιγύπτιο, βλ. 16 Μαρτίου» — different names, identical death (a stone bound to the body, thrown in the river). Sabinus's own page says nothing back. |
| 7 | `coronatus-of-caesarea` + `cornutus-of-iconium` | "Coronatus may be the same man as Cornutus, whose memory is kept on 12 September". **Two questions, not one**: the corpus holds two 12 September Cornuti, so even a yes leaves which one open. |
| 8 | `john-the-soldier-29-july` + `john-the-soldier-12-june` | The folder itself raises it and refuses to answer: "says nothing about whether the two are one man". The June notice is «Δεν έχουμε λεπτομέρειες» — no life at all. |
| 9 | `goudelia` + `gobdelaas-son-of-sapor` | Here for completeness, and the source **leans against** it: copyists may have made Gobdelaas into Goudelia, "but other sources say that there really was a martyr Goudelia", which the page calls "the more likely and the more accepted". A man and a woman on one day. |
| 10 | `sosthenes-the-apostle` + `crispus` | Chrysostom's identification of two *different* names, reported and not settled. Weakest row: this is not the one-calendar-doubling shape the others are. |

**Two more came out of item 8's first link batch** (3 October), found by a
reader working the early corpus rather than by the grep above, so the scan's ten
are not the whole of it:

| # | the two folders | the doubt |
| --- | --- | --- |
| 11 | `aristocles-of-moscow` + `aristokles-the-athonite` | **Not a doubt — one man, twice.** Alexis Amvrosiev of Orenburg, b. 1846, Athos 1876, tonsured Aristocles 1880, the Moscow metochion, died 24 August 1918, moved to Danilov 1923, glorified 2001. Both folders carry that life. |
| 12 | `alexander-the-confessor-1961` + `alexander-the-confessor-relics-2001` | George Urodov of Nevezhkino, b. 1882, Sanaksar, died 14 August 1961 — one folder stands on his repose and the other on the finding of his relics, which is the `nectarios`/`nektarios` shape of row 1. |

**Nine more were dropped because the other half is not a folder here** — Aeros,
Michael Mavroeidis, Moses the Confessor, Mark the Ascetic, the three 6 February
martyrs (whose note carries the purest shared-verse evidence in the corpus and
points at a 25 October company nobody has written), the Thirty-eight Martyrs of
Thrace, Herodion, Maurice of Apamea. **Those are a sourcing list, not a merge
list.** Five more were dropped as explicit negatives — the page or a reader
already ruled them two people: Eleazar, Antonina, Acacius of Melitene, Peter the
Sign-bearer, Hermes of Dalmatia.

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
