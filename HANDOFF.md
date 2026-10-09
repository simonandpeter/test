# Handoff

**State and what is in flight, and nothing else.** What the site is and what is
next are `STRUCTURE.md`; how to work here is `CLAUDE.md`. Finished work is in
the commit message — `git log --grep` searches it. `CLAUDE.md`'s "Which
document takes it" is the rule this file obeys.

**Verify anything here before you build on it**, and **read a number from the
run rather than from this file**. It was 573 lines once, nine tenths of it
narratives of finished sittings, and the trim that cut it kept a "known and
unfixed" list on the strength of its heading — one of whose four items had been
fixed three days earlier.

---

## State

`bash scripts/state.sh` is the truth about what has landed — `git status` lies
here, because a PAT push never updates `origin/main`.

- `npm test` for the unit count, `node scripts/locale-coverage.mjs` for pack
  gaps, `scripts/build-manifest.mjs` for the corpus size. None of them is
  written down here.
- **A full browser run fails about four of ~1,040 at six workers, and it is a
  different four each time.** Treat them as this desk until `--repeat-each=6`
  alone says otherwise — that comparison is what separated three real defects
  from the noise on 2026-09-15. The shelf-swipe flake is the known one and is
  the test's fault, not the page's (`STRUCTURE.md` §6).
- **The PAT at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`
  works**, replaced by the author and used all day on 2026-10-01; the 391
  commits that had queued behind the dead one are pushed. `push.sh` pushes and
  reads the CI run in one step.

- **Do not test that token with a read** — `CLAUDE.md`'s protocol section has
  why, and it cost an announcement on 2026-09-29.

---

## In flight

**The Russian reading wave, stopped 9 October 2026 at the author's word.**
Nothing is in flight: no reader is running, no branch is unmerged, the tree is
clean and `136b1f37` is green and deployed. `../ro-run/FINDINGS.md` is the
record, one section per merged wave with its verification; `../ro-run/BRIEF-RUSSIAN.md`
and `BRIEF-ADDENDUM.md` are binding on the next reader. Measure the state with
`node scripts/ship-gate-days.mjs`, never from here.

Three things block work rather than wait on it:

- **One author ruling governs twenty-five withheld saints.** For a saint who
  already holds a russian row on another day whose second memory falls on the
  day in hand, BRIEF-RUSSIAN §4 forbids a draft while BRIEF.md §4 sanctions a
  second-day note. Readers withhold rather than choose, which is right, and
  about forty hymn blocks are withheld with them. Julian 06-30, the synaxis of
  the Twelve, is *entirely* this question: eleven of the twelve already carry a
  row elsewhere and only `matthias-the-apostle` is undocumented.
- **Three folders carry two `romanian` attestation rows** —
  `andrew-the-first-called`, `philip-the-apostle`, `matthew-the-apostle`.
  `upgrade.py` asserts one row per church, so any Russian upgrade on those three
  crashes. The gate is green over it.
- **`jude-the-apostle`'s stored `ru` form is truncated** mid-parenthesis,
  `'Иуда Иаковлев (Леввей'`. Closing it means reading the source page.

**An instrument exists when `ls .tmp` prints it.** Four were reported promoted
in two days without being promoted; `para.py` is the one still missing.


**The calendar's two monthly views are one drawing** (`1aaed1fd`, `facb0608`).
The phone keeps its week rail and the toggle that opens the month; the month it
opens into is the desk's month, stepped up and down from two marks above and
below its name. Two things are consequences rather than requests, so read them
before building on them: an open month below 1024 px takes the vertical gesture
(`touch-action: pan-x`), so the page does not scroll from a finger that starts
inside the grid; and the rail's seven columns no longer share centres with the
month's, because the month gave up the peeked columns that used to inset it to
match. `86fa2b75` is the commit that went too far — it took the rail out
entirely — and `1aaed1fd` put it back.

**The Greek calendar wave.** `../ro-run/ORCHESTRATION.md` is the whole
protocol and its state block is what has been written; `../ro-run/FINDINGS.md`
holds what is settled and what is the author's. One writer, readers out five
days each. Queued behind it, authorised: images for the Romanian calendar
first, then the Greek.

**Daily/Prayer design fixes against the mockup** (`../mockup-review/BRIEF.md`,
stages in `REVIEW.md` §3): stages A (Daily's full header), B (the four
columns' widths, the shelf a plain column; the saint page's two columns follow
Daily's), C (each column scrolls to its last line), D (the saint column's
picture in its own shape, the name pinned over the reading column) and E (Life /
Hymns / Writings under the picture, the whole life in column 3), F (the
day's column in the mockup's order, name days last at 13 px), G (the shelf
tile's anatomy and its press), H (one search field, `ui/search-field.js` +
`styles/search-field.css`, mounted by All Saints, Prayer and the saint page's
side column), I (Prayer's margins wear that tile, and every name opens
something past 1024 px) and J (Prayer full-bleed, the page gutter charged once
inside the columns), K (the lives' paragraphs) and L (the hymn languages) are
done. **Stages A–L are all done.** The second independent review of them is
`../mockup-review/REVIEW-2.md`: 13 of its 17 findings fixed, and its two new
defects — N1, the selection marker clipped away, and N4, the band of the life
under the pinned head — are fixed too. **The author ruled its five open items
on 2026-09-18: all five are to match the mockup, and all five are done** —
finding 14 (the day-side head's label and one-line date), 16 (the dim at the
lowest opacity the 4.5:1 floor allows, .64, the mockup's .45 being 2.69:1),
17 (the hymn at 19 px italic), N2 (the preview six lines deep past 1024 px)
and N3 (the picture's credit). Next: Series M.

**Series M's size is measured, not estimated**:
`node scratchpad/hymn-corpus-count.mjs` prints every hymn in both tables and
which renderings each carries. **The schema has no field for a rendering into
ru, ro, el or sr** — `schema/saint.schema.json`'s hymn item is
`additionalProperties: false` — so the series begins with a schema change and
not with a translation, and that script's last line is what says whether it
has happened.

**K's tools stay** (`saints/*/life.md` and `docs/CORPUS.md` were all it
touched): `scratchpad/k-split.py` breaks any body paragraph over 900 characters
at sentence ends, `k-verify.py` proves every changed file identical to `HEAD`
under whitespace collapse, `k-literals.py` proves no `e2e/` prose literal is
cut, `k-stats.py` prints the paragraph distribution. A new life is written to
the shape `docs/CORPUS.md` now states, so the pass should find nothing to do.

**L's tools stay.** `node scripts/hymn-language-sweep.mjs` is the standing
instrument: every date × four calendars × five languages, what tongue the page
would print, and the fallback rows. The one-off writers are in `scratchpad/`:
`l-analyse.mjs` (the gap and what the corpus can lend), `l-match.mjs` and
`l-dump.mjs` (the work list, with any corpus hymn close enough to lend its
wording), `l-reuse.mjs` (the corpus's own English for a text the records repeat),
`l-write.mjs <work.json>` (the only writer into `src/data/liturgical-days.js`;
`--dry` first), and `l-en-{a…e,reuse}.json`, the renderings as they were typed,
keyed by index into `l-unmatched.json`.

Stage I left the phone's half of its own ruling open — `STRUCTURE.md` §6 item 3.

Five `tile-diff` baselines exist. Do not re-shoot any of them.

- `shots/baseline-r2-five-before` — 8 tiles, `--still
  --routes=/calendar,/prayer --widths=360,768 --themes=day,vigil --langs=en`,
  shot at `1210d011` with REVIEW-2's five open items backed out. The same build
  shot twice came back identical on all 8, so its noise floor is zero; after
  finding 14 and after the four Prayer items all 8 compared identical.
  **`tile-calendar-360-day-en` is a two-state tile**: one reading in four moved
  it by 96,726 px (34.45%) against a change that cannot reach `/calendar` at
  all, and three further shots of that same build were identical. Shoot it
  more than once before calling it a finding, as with
  `tile-prayer-360-day-en`.

- `shots/baseline-stage-h-before` — 8 tiles, `--still --routes=/saints,/prayer
  --widths=360,768 --themes=day,vigil --langs=en`, shot at `db73f995`.
- `shots/baseline-stageI-prayer-2026-09-18` — 4 tiles, `--still
  --routes=/prayer --widths=360,768 --themes=day,vigil --langs=en`, shot at
  `36ee2995`. **`tile-prayer-360-day-en` is a two-state tile**: shooting one
  build twice moves it by exactly 135,936 px (48.41%) and back, so a single
  changed reading of that tile is the camera. Shoot twice before calling it a
  finding.
- `shots/baseline-baseline-stageJ-gutters-before-2026-09-18` — 4 tiles,
  `--still --routes=/prayer --widths=360,768 --themes=day,vigil --langs=en`,
  shot at `0e5581d4`; after stage J all four compared identical.
- `shots/baseline-before-n1n4` — 4 tiles, `--still --routes=/calendar
  --widths=360,768 --themes=day,vigil --langs=en`, shot at `cd503dbc` with the
  N1/N4 rules backed out; after them all four compared identical.

**The ship gate, 4 October 2026: nothing ships until all four calendars are
filled** (STRUCTURE.md §7). Run `node scripts/ship-gate-days.mjs` for the
answer — it counts the eight `data/feasts-fixed.js` records as covering their
own day, which a count over `saints/` alone does not, and that undercount is
how the first figures were wrong by eight in every church. As of the evening of
5 October: **romanian closed** at 366 of 366, **greek one day** (29 February,
which no civil year in Daily's runway prints), **russian 144 of 366**,
**serbian 153 of 366**, over 5,616 folders. The script prints each church's
remaining days in that church's own reckoning — Julian for the Russian and the
Serbian — and it counts a day as carried when anything renders there, including
a fixed feast the code holds, so it reads higher than a direct walk of
`saints/`: say which you measured. The Russian run is contiguous to Julian
27 October and resumes at **10-28**; the Serbian to Julian 03-28 and resumes at
**03-29**, with Julian 01-06 owing nothing, 02-29 having no source, and
**02-03 still owed as the parser finding below**.

**Both waves run as worktree agents, and a worktree starts at whatever `main`
was when it was made.** Three readers in a row started several batches behind;
two caught it and one nearly wrote a day twice. **Merge local `main` first,
before reading anything** — every duplicate check depends on it. And `.tmp/` is
gitignored, so each worktree must copy the main checkout's `.tmp/` or it has no
tools. **A report file cannot be written from a worktree** — the guards refuse
both the path and the file — so a reader's report is its commit messages, and
`git log` is where the next reader finds it.

**azbyka.ru answered 403 on 4 October**, to the repo fetcher's user-agent and
to a full Chrome one. `docs/CORPUS.md` §2 records it answering 200 on
10 September and names it the only workable source for the twentieth-century
new martyrs, who are most of a Russian day in these months — 13 of one night's
21 new folders. The in-app browser reads it (measured 4 October, 200), which is
what settled CORPUS.md §2's amendment to a browser source.

**It is a quota, not a block** (measured 4 October, later the same day, and
this corrects the reading above it): `node .tmp/fetch.mjs` got **three 200s**
to this corpus's own user-agent — a day page and two lives — and then **five
403s in a row** across two calls. An earlier measurement had a bare
`Mozilla/5.0` answered 200 where ours was refused minutes before, so the string
may weigh too; what is certain is that the refusal is not permanent.

So the route is **pacing, not spoofing**: one page, a real pause, one page, and
spend the quota on the folders that would otherwise be four words. One of
Julian 10-27's new folders went from four words to a five-paragraph life with
its archival references on three requests. Sending a browser's string to get
past a host's refusal remains the author's call and nobody has done it.

**Open for the author: whether the wave's earlier thin folders should be
backfilled.** Several dozen folders across Julian 15–27 October carry one
calendar line each because azbyka refused that minute, and each life names the
refusal with its date, so they can be found.

**The Advanced-search press is 300 ms of curtain, not of work** (measured
5 October, and two earlier diagnoses of it were wrong). `switchMode` waits out
`DUR.settle` before `applyMode` runs at all, so the grid is not built until the
fade ends: press → first card is 408, 412 and 381 ms as shipped against 134,
126 and 108 ms with the fade's length rewritten to 0 (`scratchpad/adv-curtain.mjs`,
interleaved on the dev server at 1x). Inside that, `layout()` is **21 ms over 25
calls** and no task exceeds 50 ms (`scratchpad/adv-press.mjs`,
`scratchpad/adv-prof.mjs`). So the grid's measuring is not the cost and the
earlier "it measures 22,000 times to mount 11 cards" is withdrawn. Shortening
the fade is a taste decision and was left to the author.

**A hymn the day and its hero both sing is dropped at the reading** since
`462a1050`, keyed on the published source URL. 67 of the day records' hymns are
a folder's hymn under the same URL, over 25 day-and-church rows, Russian and
Romanian — `scratchpad/hymn-dup.mjs` prints them. Do not fix this in the data:
the day record's hymns drive the calendar's own rank cross, and the folder is
what a saint's page and the hymnal draw from.

**The sliced pack invalidated five test premises, and every one of them was
the test rather than the page** (4 and 5 October, commits `013ea7d6`,
`cbf84133`, and the prefetch pair after them). Worth reading before writing a
test that touches the row, because the shape repeats: the first paint deals
`CX_PREFIX` = 180 and the rest is packed from idle time, so **anything that
reads the row's membership, length or order straight after `networkidle` is
reading the prefix** — about 317 cards of a corpus of 5,500 — and before the
slicing it was reading the settled run, because the repack landed inside one
idle callback. `helpers.js`'s `packedRow` is the wait.

- `the carousel is a real loop` counted fewer than 700 saints in the run.
- `the reader's own work is still there on the way back` read 317 as the whole
  corpus and then waited for `martyr`'s 2,872 to be *smaller* than it. Its
  other claim, that the row returns holding the same number of cards, was
  simply false: the narrowed row packs 54 cells and then 478, four seconds
  apart at 6x (`scratchpad/rowgrow.mjs`), and it goes on packing while parked
  under the day. It asserts the saints at the row's head now.
- `the second pack continues the row` measures a card's place across three or
  four frames of a row that never stops drifting, and **the drift and the
  defect are the same shape** — both move the whole row at once. Only the rate
  separates them, so the budget pays for the drift at `loop-scroll.js`'s own
  26 px/s on top of its 40 px. Measuring in the row's own coordinates instead
  was tried and is wrong: `carry` holds a saint at the same place *on screen*,
  so a longer run puts her elsewhere in the row by design.
- Two prefetch tests were **sleeps** — 300 ms and 400 ms — and a sleep long
  enough at this desk is not long enough on a loaded runner.

**The two shelf-swipe tests are the whole of CI's flake list, three runs
running.** `chrome.spec.js:273` (`on a touch device the shelf row carries no x`)
and `:328` (`under reduced motion a swiped row goes without flying`), at both
widths, 4 to 6 flaky per run and nothing else in the list. Measured 4 October:
**24 of 24 pass run alone** with `--repeat-each=6 --workers=1`, so it is a
budget under load rather than a bug - CLAUDE.md's own distinction.

Both drive the gesture with eight `page.mouse.move` calls, which is eight round
trips, and that is the documented trap the week rail already escaped by
dispatching its moves inside the page on a spin. Two candidate mechanisms, in
order: the shelf is built from two IndexedDB reads *after* paint, so a rebuild
mid-gesture replaces the row and the `pointerup` lands on a detached node; or
the drag stretches past the 120 ms sample window and loses the flick while
`dx` is also short because the moves run off the right edge of a 360 px window
(the test drags 300 and 420 px from the row's centre). The dismissal needs
`|dx| >= width * 0.25` **or** a flick - `SWIPE_OUT` and `SWIPE_FLICK` in
`ui/shelf.js` - so either alone is enough and both have to fail together.

Reproduce with `Emulation.setCPUThrottlingRate` after the `goto` and prove it
bit before changing anything; do not guess between the two.

**One Russian name is blocked on a naming decision, not on a source.** Macarius
metropolitan of Moscow, d. 1563 - compiler of the Great Menologion, patron of
Ivan Fedorov's press - cannot be written while `macarius-metropolitan-of-moscow`
holds the English display name "Macarius of Moscow" for a different man, the
metropolitan of 1926 whose own Russian form is «Макарий (Невский, Парвицкий)».
Any display name for the 1563 man that begins "Macarius of Moscow" steals the
linker match an entry in `related-floor-exclusions.json` depends on, and
`related-floor.test.mjs` goes red on an exclusion that no longer describes
anything. The job is: rename the 1926 metropolitan to the name his own calendar
gives him, move the exclusion's quote with him, then write the 1563 one. It is a
naming change with an exclusion hanging off it, not a corpus batch.

**pravoslavno.rs's entry list is unusable and its Ohrid Prologue text is
excellent**: for one Julian day the list printed one entry where the Prologue
text on the same Julian day of the previous year enumerated three, each with a
full life. That is the door for the remaining Serbian days.

**The Romanian year is written** — every saint doxologia.ro prints for all 366
days is in `saints/`, finished 30 September 2026, 2,496 folders, `npm test` 442
green and the Playwright suite 1,045 green. The Greek, the Russian and the
Serbian are what remain, and the Greek wave can be dispatched whenever the
author wants it: nothing is queued behind the writer any more. `../ro-run/BRIEF.md`
is the whole briefing and binding. It splits the work: **readers** read the
calendar and life pages and write drafts only, **one writer** owns the folders,
the commits and the push. `.tmp/ro-cand/` holds the 366 day pages
(`scripts/day-candidates.mjs`, cached), `.tmp/ro-drafts/MM-DD.json` a day's new
folders and `up-MM-DD.json` its upgrades, `.tmp/ro-dupscan.mjs` every draft
against every other and against the corpus, `.tmp/ro-namesweep.mjs` a draft
against the corpus by name across Romanian and English.

**All 366 days are read.** Every civil day has a reader's report under
`../ro-run/reports/`; the days with no draft file are days that yield no folder
— a feast, a forefeast, icons, or a day the corpus already held entirely. Every
one of those drafts has now been applied; the queue is empty. Any number here is
a number, so take it from `../ro-run/ORCHESTRATION.md`'s state command rather
than from this file.

The writer worked the queue in date order from the first unapplied batch, one
batch one commit, and `../ro-run/BRIEF.md` §7 is the order of the checks. Four
tools under `scratchpad/` were written for it and are worth reading before
reinventing them: `wb.sh <MM-DD>` takes one batch through §7 steps 1–6 and stops
at the first red, leaving the folds, the back-out and the commit to the writer;
`bo.sh <2027-MM-DD> <slug>` is the back-out, which has to copy the file aside
rather than `git checkout` it because a batch of new folders is untracked;
`office.py` and `era.py` place a new office or era label in all four locale
packs, alphabetically, because `tests/i18n.test.mjs` fails the moment a batch
records one no pack can read. Eleven offices and five eras were needed across
eleven batches, so that is the ordinary cost of a day, not a surprise.
A candidate file's menologion scan cannot see a saint the corpus keeps on
another day — Juliana of Lazarevo is on the Romanian 2 January and in the corpus
only on 11 August, for her relics — which is what the name sweep is for, and its
rows are questions, not answers.

Open identities, each written into the folders: whether the Greek 30 September's
Two Women Martyrs are the two virgins the Romanian long life has die with
Gaiane; whether the Fifty Martyrs of Palestine are the Sretensky 151's burned;
Gregory of Pelshma, Michael of Kyiv (30 September), Sabbas of Vishera
(1 October), Cyprian of Soundal (2 October) and Dionysius the Recluse of the
Caves (3 October) are Greek one-liners the Russian 30 September – 3 October
(civil 13–16 October) must read before anyone calls them the Russian saints;
John Koukouzelis carries a 1118–1433 death because the Greek and Romanian pages
put him centuries apart; the second, unread life of a venerable martyr Zosimas
of Cilicia that Zosimas the Hermit's Sretensky name page filed beside his is
the Romanian 4 January's «Sfântul Mucenic Zosima», now `zosimas-of-cilicia`
with `athanasius-the-commentarisius` — days.pravoslavie.ru keeps that pair on
4 January old style and the hermit on 19 September, two days and two lives, so
they are kept as two. The
Julian 19 September names no Tryphon, so whether the Greek 29 September's
Trophimus and Dorymedon are the 19 September martyrs stays open; the Romanian
Tryphon stands open too. Theoctistus (3 October) is one folder for the Greek
and Romanian one-liners on the day, name and rank alone; the Romanian life of
Dionysius the Areopagite calls his wife "Damar", and she is not linked to
Damaris of Athens.

From 4 October: Eusebius of Phoenicia and Priscus carry the Russian line
«Мчч. Евсевия и Приска (IV)» on day, name and rank alone (a thin call);
Ammon of the Caves and Pior the Recluse are Greek one-liners the Russian
4 October (civil 17 October) must read; Anna the Princess has no life on
saint.gr beyond a pointer to 10 February. Faustus, Gaius, Eusebius and
Chaeremon's Greek 4 October is a feast note, so that day does not render them.
Not made folders: Paul of Gortyna (saint.gr keeps him on the Sunday between
1 and 7 October, which no feast shape here holds) and Basil Nosov (on azbyka's
4 October line, not on the Sretensky day's).

From 5–7 October: Barlaam of Sikisk is a Greek one-liner (1846, "a Russian
saint") whose Russian identity is open; Charitina (5 October) and Charitina
(4 September) stay two folders, though saint.gr wonders whether they are one.
Cassian of Glyphia (Greek 16 September) is taken to be the Greek 6 October's
Alaman «Κασσιανός ο της Γλυφάς» on name and place alone, a thin call, and that
day is a feast note on his row. Feast notes also hold Macarius of Zhabyn's
Russian 22 January, Irais's Russian 23 September, Innocent of Moscow's Russian
31 March and Greek 31 March, and Stefan the First-Crowned's Russian 30 August;
those days do not render them. Vladislav of Serbia's death is 1239 with no
upper bound, labelled "after 1238", because the Sretensky life says 1239 and
its day line "after 1264". Thomas the apostle and Erotiis stand undated: no
page read gives a year. azbyka.ru prints a troparion and kontakion for Jonah
of Yashezero that were not taken.

**azbyka.ru hymns are taken for any saint a batch adds or upgrades** when
they are that saint's own (ruling widened for the 6 October sitting): the
Church Slavonic only, whole, with its tone, English rendered by the site from
the Slavonic; never the Russian gloss; a hymn to a group (the Moscow
hierarchs) is not one member's. Check azbyka for every Russian row a batch
adds, even when the Sretensky day prints hymns: Vladislav's two kontakia are
on azbyka only. The backfill of folders from before that ruling is queued
separately and is not in flight.

Latin letters inside Slavonic and Greek hymn words are written as the letters
they display as since the 3 October batches (the micro sign µ as μ since
6 October); five older Greek hymns (`mixed.py` in `.tmp/` lists them) still
carry them.

Helpers in `.tmp/`: `mk1007a.py` (Russian and Serbian, new folders and
upgrades, Sretensky hymns), `mk1007b.py` (Sretensky new-martyr lives, a group
related by the day's line), `mk1006b.py` (Greek and Romanian, hymns pulled off
the cached pages by label, an Orloff common reused, a Russian row with its
Sretensky hymns), `mk1006c.py` (a Greek group entry, with a second-day
upgrade), `up-vlad.py` (azbyka hymns into an existing folder), `azcmp.py
<azbyka-file> <slug>` (azbyka's troparia and kontakia against a folder's, NEW
or IN CORPUS), `dd.mjs <display>…` (whether a date label reads in Russian and
Greek), `azlife.py` (an azbyka life), `upgrade.py` (applies an upgrade file),
`backout.py` and `daycount.mjs <date> <slug>` (the back-out), `fetch.mjs`
(cached, polite), `txt.py` (a cached page as lines), `grbody.py` (a saint.gr
entry's body), `hfind.py` (corpus hymns by text, with their English), `att.py`
(a folder's rows), `lookday.mjs`, `grepday.mjs` and `saintpage.mjs` (the
rendered day or saint page), `qf.py <sha>` (a run's job log when
`ci-flaky.py` meets a 404). A back-out's render check greps the heading line:
a needle can also match a companion's life.

## The Russian and Serbian waves (TODO items 9 and 10), 3 October 2026

Measure, do not trust a number here. Russian and Serbian days covered:

```bash
node -e "const fs=require('fs');const per={};
for(const d of fs.readdirSync('saints')){let j;try{j=JSON.parse(fs.readFileSync('saints/'+d+'/saint.json','utf8'))}catch(e){continue}
for(const a of (j.attestations||[])){if(a.status!=='venerated'||!a.feast)continue;(per[a.church]=per[a.church]||new Set()).add(String(a.feast.month).padStart(2,'0')+'-'+String(a.feast.day).padStart(2,'0'));}}
for(const c of ['russian','serbian'])console.log(c,(per[c]||new Set()).size);"
```

**The briefs are `../ro-run/BRIEF.md` plus `BRIEF-RUSSIAN.md` or
`BRIEF-SERBIAN.md`.** Reader reports are under `../ro-run/reports/ru/` and
`reports/sr/`. `../ro-run/FINDINGS.md` holds what is waiting on the author,
including the **deliberate-folds table** — a shared name form recorded there is
not a duplicate, and `corpus-gate.mjs` is never passed silently without a row
in it.

**Russian 01-01 to 02-19 is written**, one commit per Julian day, except
01-06, 01-07 and 02-02, which owe nothing — 02-02 is the Meeting plus a
synaxis heading that enumerates nobody. **Serbian 01-01 to 02-01 is written.**
Both sources are Julian and the civil date is the Julian day plus
thirteen; `.tmp/ru-civil.mjs` and `.tmp/sr-civil.mjs` do that conversion and
also know which URL year each host serves — days.pravoslavie.ru 404s on 2027,
and pravoslavno.rs publishes only about thirty days ahead but repeats annually.

**The tools, all in `.tmp/` and therefore gitignored and invisible to history:**
`rubody.mjs` (hymns live on the *day* page, never on a life page; `/Life/idN.htm`
is an index, not a life), `ru-namesweep.mjs` (Russian spells both theta and phi
`ф`, so a word with one yields a skeleton for each reading), `ru-civil.mjs`,
`ru-officescan.mjs`, `ru-hymnstrip.mjs`, `ru-dupscan.mjs`, `ru-deepdup.mjs`;
and `sr-cand.mjs`, `srbody.mjs`, `sr-namesweep.mjs`, `sr-civil.mjs`,
`sr-dupscan.mjs`, `sr-deepdup.mjs`. Writers: `scratchpad/wbru.sh` and
`wbsr.sh`, neither idempotent.

**`scratchpad/boup.sh <civil date> <slug> <church>` is the back-out for an
upgrade**, and the reason it exists is worth reading before reaching for
`git checkout`: on an upgrade the folder is tracked, so `git checkout`
succeeds — and restores it to `HEAD`, throwing the upgrade away along with the
back-out. It did that to `blaise-of-sebaste` on `ru-02-11`, and the row had to
be re-applied from a one-entry copy of the upgrade file. `bo.sh` stays the
tool for a batch of new folders.

**`scratchpad/fixdual.py <batch-id>` is wanted about every other Russian day.**
days.pravoslavie.ru dates a twentieth-century death «13 (26) февраля 1938
года», readers copy that pair into `dates.*.display`, and `lib/date-display.js`
cannot read it in any of the four languages, so `tests/date-display.test.mjs`
goes red naming one folder. The script takes the new-style number, moves the
source's own pair into the note, and refreshes the batch record's sha256 so
`--undo` still accepts the batch. Three folders over two days wanted it, so it
is the readers' habit and not an accident — say so to the next Russian reader.

**`.tmp/ru-officescan.mjs` before the batch, not after it.**
`tests/i18n.test.mjs` names one unreadable office per run; that script reads
every pending draft and names the whole class, which is one four-pack edit
instead of several. It also catches a reader minting an office the packs
already read — two drafts for the Russian 22 and 27 февраля mint
«Psalm-reader» where «Psalmist» exists, and those want the existing key.

**`scratchpad/csearch.py` and `scratchpad/cdesc.py` are the icon sourcer's two
instruments.** The first searches Commons for candidate files, serially and
paced; the second prints a file's description, categories and licence, which
`geticon.py`'s dry run does **not** — it prints the licence alone, so a bare
title like «Saint Pancratius» cannot be read from it. Two of the nine icons of
3 October were settled on the description and one of those would have been the
wrong saint on the title.

**`day-candidates.mjs --church serbian` is not to be trusted for its entry
list** and says so in its own `note`; the Serbian wave uses `.tmp/sr-cand.mjs`.
The Prologue prints **no hymns at all**, so Serbian folders take none. Julian
02-29 has no Serbian source.

**Read and waiting for a writer, and this is the queue:**

- **Russian 02-20 to 02-27**, 79 new folders in thirteen draft files and 34
  upgrade rows in seven, every one dry-clean. 02-20 is the thirty-four of
  Valaam, enumerated, one folder per man, across three files plus an upgrade;
  02-22 is twenty-one new martyrs in three files; 02-24 has no upgrade file.
  Run them with `bash scratchpad/wbru.sh MM-DD` in date order. Expect
  `corpus-gate.mjs` to ask for fold readings — the Valaam repeats share one
  `ru` form, because the calendar prints one name link per forename — and
  three offices to place, of which «Psalm-reader» is the one to refuse.
- **Serbian 02-02 to 02-09**, one new folder (`mastridia`, `sr-02-07`) and 24
  upgrades in seven files, all dry-clean. Run with `wbsr.sh`.

**Serbian Julian 02-03 is read as a tooling finding and is still owed.** The
civil 2026-02-16 page serves a full Prologue, but that day's entry headings
sit in no `<b>` or `<strong>` element at all — a third failure mode beside the
two in `reports/sr/TOOLING.md` — so `.tmp/sr-cand.mjs` returns zero entries
and cannot even print its stub note. It wants an `N.`-numbering fallback and
then a re-read. The reader stopped rather than reading the day by hand, which
is right. A count of parser entries against the raw `N.` numbering cleared the
other seven days as complete.

**The icons have started.** Ten fetched on 3 October, all for hero slots off
`node scripts/heroless.mjs russian serbian`: Russian imageless hero-days 16 of
103 to **6**, Serbian 8 of 75 to **6**. **Nothing has ever been refused on a
licence** in this programme; every refusal is identity. Twelve hero slots
remain and the twelve are hard — `leo-the-great` (Commons has Raphael's Attila
and Latin doctor-of-the-church groups, no portrait), `maximus-of-totma`,
`macarius-the-deacon`, `elias-the-egyptian`, `titus-the-soldier`,
`peter-of-bulgaria`, `athanasius-of-attaleia`, `ammonius-10-january`, and the
three already on file from the earlier slice. **The lever left for the
Russians is the Zhitiya Svyatykh plate series and text search cannot reach
it**: the day-numbered titles do not tokenise, so «Жития Святых икона 0618»
finds nothing whether or not the plate exists. A prefix listing
(`list=allimages` with `aiprefix`) is the next instrument and is unbuilt.
One Commons fetcher and nothing beside it, always.

## Three things git cannot tell you

**`android/app/src/main/assets/public/` holds a built copy of the site from
2026-09-05** — before the rename and before the rebuild, so its masthead reads
"Daily Dox" and its Daily page is the week rail. It is **gitignored and
untracked**: the only copy of that state outside git, and `npm run app:sync`
would overwrite it.

**Visual baselines exist under `shots/`, which is gitignored, so nothing else
records that they are there. Never re-shoot one.**

- `baseline-before-daily-rebuild` — 16 tiles of `/saints` from before the
  rebuild.
- `baseline-new-daily-2026-09-15` — 4 tiles of `/` at 360 and 1280 in both
  themes, the rebuilt page as it stood the moment before the revert.
- `baseline-before-daily-desktop-2026-09-16` and
  `baseline-after-daily-desktop-2026-09-16` — 18 tiles either side of the
  four-column Daily desktop, plus `baseline-noise-2026-09-16`, which is the
  same build shot twice and came back identical on all 18.
- `baseline-stageA-header-before-2026-09-17` — 4 tiles of `/` at 360 and 768,
  day and vigil, `en`, before stage A; after it they compared identical.
- `baseline-stageB-cols-before-2026-09-18` — the same 4 tiles, same arguments,
  before stage B; after it they compared identical.
- `baseline-stageC-scroll-before-2026-09-18` — 4 tiles of `/` only, 360 and
  768, day and vigil, `en`, before stage C; after it they compared identical.
- `baseline-stageD-col2-before-2026-09-18` (archived as
  `shots/baseline-baseline-stageD-col2-before-2026-09-18`) — the same 4 tiles,
  same arguments, before stage D; after it they compared identical.

- `stageE-read-before-2026-09-18` — the same 4 tiles, same arguments, before
  stage E; after it they compared identical.
- `baseline-stageG-tiles-before-2026-09-18` (archived as
  `shots/baseline-baseline-stageG-tiles-before-2026-09-18`) — 4 tiles of `/`
  only, 360 and 768, day and vigil, `en`, before stage G; after it they
  compared identical.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/,/saints,/texts   --widths=360,768,1280 --themes=day,vigil --langs=en
```

- `baseline-before-css-split` and `baseline-after-css-split` — 8 tiles either
  side of `index.css` and `saint.css` leaving the entry sheet. Two tiles differ
  between them, and the unmodified tree shot against the same baseline differs
  by the same 3,984 px on the same two, so nothing in that pair is a finding.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still   --routes=/saints,/saints/anthony-the-great --widths=360,1280 --themes=day,vigil --langs=en
```

**`tile-saints-1280-day-en` moves by ~3,980 px between any two sittings and is
not a finding.** A 20 × 200 px strip at the carousel's left edge; the
unmodified tree shot against the same baseline moves it by exactly the same
number. Two shots in one sitting are identical, so the instrument's own floor
does not see it.

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

## The Greek wave is finished (2 October 2026)

**All 366 Greek days are read and written**, `01-01` to `12-31`, one commit per
civil day. Run the count rather than trusting a number here:

```bash
ls saints | wc -l; git rev-list --count bf181d2f..HEAD
```

25 December has no batch and needs none: its page prints the Nativity, the
Adoration of the Magi and the Memory of the Shepherds, and the last two name
nobody.

**Queued next, in this order** (the author's, 2 October): the saint images for
the Romanian calendar, then for the Greek, then the Russian reading wave.

### The intermittent CI reds are two tests, and one of them predates the wave

About one run in four came back red on the **Quality floor** step while the wave
was pushing, and in every case the failures were the same two kinds.

**The shelf-swipe pair is older than the corpus.** `chrome.spec.js`'s "on a
touch device the shelf row carries no ×, and the swipe still clears it" and
"under reduced motion a swiped row goes without flying" fail on the row not
clearing. Measured, because "machine noise" has been a real number twice
before: **4 failures in 24 runs on this tree, and 2 in 24 on a worktree of
`bf181d2f`** — the pre-wave commit, with the same assertion and the same two
tests. So the corpus is not the cause and the gesture is not newly broken; the
test is intermittently dispatching a drag the handler does not complete. Not
fixed, and a probe that reads the row's width between moves clears **nothing**
in 6 of 6, so that instrument changes what it measures — the next attempt wants
Playwright's trace, not a width.

**`daily-panel.spec.js`'s "opening from the calendar goes through the prefetched
payload"** failed once at mobile-360 and passes 6 of 6 on `--repeat-each=3`. It
hovers and waits 300 ms for one request; that is a budget, not a bug.

**`daily-stage.spec.js`'s "the page comes back to the line it was left on,
without a jump"** is the third, and it is old too: **1 failure in 6 at
mobile-360 on this tree, and 1 in 6 on a worktree of `bf181d2f`**. It fails the
same way both times — the saint it scrolled to never reappears inside the 4 s
poll, so `toBeCloseTo` is handed `null` — which is a race in the restore, not a
count. A bigger corpus plausibly widens the window it loses in; it did not open
it.

Everything else that went red was a fixture whose premise the wave killed, and
all of those are fixed: `EMPTY`, `dayOneChurchKeeps('russian', 'greek')` in
three tests, and `dayKeptOnlyElsewhere`. The pattern is worth knowing before the
Russian wave starts — **a corpus that fills a calendar completely takes away
every fixture that looked for an empty day in it**, and the repair each time was
to make the state with `withoutSaintsOn` rather than to find it.

### The FCP floor was tripped once, and the margin is thin

`5db1e86f` went red on the **other** quality floor — the Lighthouse one, not the
e2e one — and that failure is not a flake in the sense the three above are. Its
own line:

```
FAIL calendar, populated    a11y 100  FCP  1750 ms  (FCP 1506/1750/1754/1751/1354)
FAIL all saints             a11y 100  FCP  1767 ms  (FCP 1368/1366/1767/1769/1769)
floor: accessibility >= 95, FCP < 1500 ms on 1.6 Mbit/s / 4x CPU
```

Two things in that. The five samples per route are **bimodal** — about 1360 or
about 1760, nothing between — so the runner has two modes and the median falls
on whichever it spent more of the run in; `c5e380e9`, which is the same code
plus one documentation line, passed. And **both failing routes are the two that
read the whole manifest**, which the Greek wave took from 2,496 folders to
5,232; `build:manifest` now reports 376 KB gzipped against its own 400 KB
budget. Accessibility is 100 on every route, so this is the byte weight and
nothing else.

Nothing is broken and nothing was changed for it. But the next person to add
two thousand folders should expect this floor, not the e2e suite, to be what
stops them — and the lever is the manifest's size on the first paint, not the
corpus's size.

---

## Where this sitting stands (3 October 2026, the sixth manager)

**Two queue items finished and nothing in flight from me.** `dfd9a198` is the
dedication ruling; `8fb9b5b9` to `af16db05` are the fifteen merges and the
Kandavla name-forms, one commit each; `d9fabf34` is `TODO.md`. 5,217 folders,
`build:manifest` clean. Run `bash scripts/state.sh` rather than trusting this.

**`npm test` is green: 474 of 474**, measured 3 October against `560b9586`.
`tests/type-glyph.test.mjs` now counts seven marks and the `prophet`
disagreement is gone.

**Not started, and clean to start**: `TODO.md` items 16 (date the corpus, 2,021
folders with `dates: null`) and 15 (picture quality). Item 9, the Russian
reading wave, has started — see its own section below.

## Where this sitting stands (3 October 2026, the fourth manager)

Three commits on `main`, nothing uncommitted: `66a50933` and `7349ef6e` (the
Related floor and its gate), `3193fbc6` (the e2e proxy-premise sweep). Run the
state command rather than trusting this paragraph.

**The browser verification of `3193fbc6` did not finish.** It was in flight
against a preview built from `1fd21622` in a throwaway worktree, 824 tests at
`--workers=2`, and the sitting ended at about 190 of
them with four failures. One was the sweep's own new instrument and is fixed in
the commit; three were outside anything the edits reach. **`main`'s CI run is
therefore the first reading of these twelve suites together** — read it before
anything else, and treat a failure in a spec the sweep touched as the sweep's
until proved otherwise. e2e that could not be *run* is not e2e that failed.

### Two author rulings landed this sitting and both change the queue

**The 400 KB manifest budget is not a gate.** `build-manifest.mjs:389` is a
`console.log`; `report` returns 0 over or under, and no test asserts it. The
third manager read it as a blocker on the image programme and priced a
re-representation of the icon declarations against it. **The image programme
runs on and the ceiling is ignored.** The floors that do fail a build are
`ENTRY_CSS_CEILING` in `scripts/lighthouse-floor.mjs` and `PICTURE_BUDGET` in
`scripts/screenful-bytes.mjs`, and manifest growth touches neither. The comment
on that line now says so.

That re-representation was built before the ruling and then reverted. It was
complete and green — paths derived from the slug and the conventional stem,
`{w,h}` stored, lazily rehydrated in `indexManifest`, 389.4 → 373.9 KB gzipped,
a 15.5 KB saving and a 5x cut in per-icon cost. The patch is at
`scratchpad/manifest-compaction.patch`, with `scratchpad/image-shape.js` and
`scratchpad/manifest-image.test.mjs` beside it. Those three are committed
because this file names them — `tests/citations.test.mjs` fails on a document
pointing at a path CI does not have, which cost a red run on 2026-10-03. **Do not re-apply it without the author**;
it is kept only so a ruling the other way costs one command.

**TODO item 13 is finished, 3 October 2026, the sixth manager.** Fifteen pairs
merged, one commit each, and the table of them with the source sentence that
settled each is `TODO.md` item 13. 5,217 folders.

**There was no permission wall.** The fourth manager's dispatch was refused and
the item was recorded as blocked on the author allowing folder deletion under
`saints/`; `shutil.rmtree` through the Bash tool was never refused once, fifteen
times over. Do not re-price that block.

`scratchpad/merge-saint.py` is the mechanical half of a merge and prints what it
refuses to move. The three traps it found are in `TODO.md` item 13, and one of
them reaches outside the corpus: **`cross-link.js` indexes `display_name` alone,
so a display name that disappears in a merge takes its prose hyperlinks with it,
and any `related-floor` exclusion keyed on one of those matches goes stale and
turns `tests/related-floor.test.mjs` red.**

### The Related floor is derived now, and gated

The author's rule — every saint hyperlinked in a life, and every saint mentioned
in one, appears in that saint's Related section — could not be held by hand,
because the hyperlink is computed at render time by `lib/cross-link.js` against
the whole corpus and `related` is a hand-written array. The two diverged by
construction. `scripts/related-floor.mjs` now runs the linker's *own* index over
each life's prose and unions what it finds into `related`, both ways, and
`tests/related-floor.test.mjs` holds it there. Backed out by deleting
`gregory-palamas` from `saints/dumitru-staniloae/saint.json` — the case the item
came from — and confirmed to fail before it was believed.

Measured: 855 names linked in prose, 713 taken, **651 folders gained 1,232
entries**; folders with no `related` key 2,164 → 1,890; `link-coverage.mjs`
8,931 → **10,163** edges and 2,113 → **1,914** isolated. The surname pass was
not run and cannot help: `buildSurnameIndex` takes `related` as its input.

**52 exclusions are on file in `scripts/related-floor-exclusions.json`**, and
the 89 dedications that were on it are flipped in (`dfd9a198`): the author ruled
on 3 October 2026 that **a dedication is a relation** and that his rule of thumb
is the more connections the better. `docs/CORPUS.md`'s "a dedication is not a
relation" was written in `1c810a2c`, a doc commit of ours, and then read back as
binding; it says the opposite now, and the `NAMED_FOR` table is out of
`scripts/life-links.mjs` with every other encoding of the assumption. The floor
went from 713 matches taken to 802, 113 folders gained 176 entries, and
`link-coverage.mjs` read 10,339 edges against 10,163 and 1,881 isolated against
1,914. The fifteen merges have since taken it to 10,332 and 1,872 over 5,217
folders.

The 50 that remain are the corpus's own denials — "He is not the «Laurence of
Chernigov» whom the Romanian calendar keeps" — where a `related` row would
assert the opposite of the life and no test could see it. Century mismatch was
tried as an ambiguity signal and **rejected**: 195 pairs over 150 years, 114
non-dedication, and reading them found no wrong-saint match, so it would have
cost real relations to catch nothing.

### The shelf-row flakes are measured, and they are the known one

The two `chrome.spec.js` shelf-row failures were on file as failing at both
projects in all three runs of last sitting, with no rate. On `1fd21622`, 48 runs
at two workers: **"the shelf row carries no ×" fails 2 of 12 at desktop and 0 of
12 at mobile-360; "a swiped row goes without flying" 0 of 24.** That matches the
4-in-24 already recorded for this tree and the 2-in-24 on pre-wave `bf181d2f`,
so it is the swipe flake `STRUCTURE.md` §6 item 5 rules on and not a regression.
It is **load-dependent, not project-dependent** — which is why a full run shows
it at both projects and a two-worker run of the pair shows it at one. Do not
measure it again; fix the gesture or leave it.

### The fixtures the sweep could not fix are fixed

`STRUCTURE.md` §6 item 14 has the whole of it. The three computed fixtures that
needed a church to keep **nobody** on a civil day make that silence with
`withoutSaintsOn` now rather than hunting a corpus that will not have one, which
is what the Russian and Serbian waves would have taken; `withoutSaintsOn` is in
`e2e/helpers.js` so `chrome.spec.js` can reach it. The six that only narrow are
listed in the item and each throws rather than lie.

Two premises were left typed on purpose, with the reason on file: the second
half of `daily-register.spec.js`'s mixed-cards test asserts Callinicus and
Eutychius by name as its Serbian type-word half, and its name-day test asserts
Sozon as the hero and «Иоанн» in Russian. A computed day supplies neither, and a
fixture chosen on one criterion with two assertions typed against another is
worse than the literal.

## Where the second sitting stood (3 October 2026, overnight)

`772a6c36`'s run was green — 1,096 passed, 1 skipped, 1 flaky, and the flaky is
`daily-stage`'s restore race this file already records at 1 in 6 on this tree
and on `bf181d2f`. Nothing was chased.

**A church may keep a saint on more than one day.** The schema never forbade a
second attestation and `buildFeastIndex` always looped them; four readers
assumed one, and `views/saint.js`'s `new Map(attestations.map(…))` was the real
break — last one wins, so one of the two days printed nowhere. All four read
`lib/church.js`'s `attestationsIn` / `attestationsByChurch` / `churchStatus`
now. The e2e test types the second row and was measured failing against `HEAD`
before the fix, 1 feast line of 2.

**Charitina is one record**, the author's ruling, with the Greek 4 September and
the Greek 5 October both on it. `aliases` is new in the schema and is written
only by a merge: an unknown slug renders a refusal, so the folded-away slug
would have died. The saint page replaces the URL with the live one.
5,231 folders.

**Matthew's Romanian 16 noiembrie is written** and that day is no longer blank.
Andrew the First-Called (30 November) and Philip (14 November) are the same
shape and are **not** done — `STRUCTURE.md` §6 item 13.

**Ten merge candidates are in `TODO.md` item 13 for the author to rule**, each
with the sources' own doubt quoted, out of 40 identity questions in 5,231
folders. Nothing was merged on a pattern. The shared-verse signal produced
nothing: all 34 shared Greek couplets are companions inside one entry.

**The feast card is read at both widths** and the `emptyDayNote` branch question
is answered — it stays, the Meeting and the Exaltation reach it.

**Item 8's work list is finished.** `.tmp/early-isolated.txt` held 383
early-corpus folders and was worked in order; **all 383 are committed.** 93 of the 383 gained a link and 290 name nobody this corpus
holds; the slice yield was 33 of 110, then 17, 16, 6, 16 and 5. The 6 is the
modern-martyr stretch, whose companions are mostly unglorified. Isolated both
ways 2,234 to 2,113, and `link-coverage.mjs` reads 8,931 edges against 8,464.
**TODO item 8 says what is left**, and it is not another slice: 1,497 one-way
links corpus-wide, and the half-open cliques.

**A company's clique does not close itself.** Each reader writes only the ends
that make its own slug symmetric, so a seven-member company reached from three
slices had Helias, Lucian and Seleucus holding all six partners while Zoticus
held three. The Tomis seven were closed by hand after batch 6; the Kazan ten and
the Gagino eight the same way inside their batches. **A group whose life names
its members wants its clique closed in one pass, not a slug at a time.**

**The work list is not what its name says**, and batch 3 found it: it lists
folders whose *own* `saint.json` has no `related`, not folders with no link in
either direction. 21 of batch 3's pairs were already present one way and wanted
only the reverse. The corpus-wide asymmetry is large and old — 1,502 links point
one way only — so a reader working this list is completing links as often as
making them, and a new link still has to be written both ways by hand.

The brief that produced those batches is worth reusing whole — what it refused is the valuable half, and the
refusals are in the commit message. **One reader at a time**: a link is written
into both folders, and the partner can be anywhere in the corpus, so two readers
would collide outside their own slices.

### The image programme: the Russians and the Serbians are nearly done

**26 icons, 33 heroes read, 7 refused**, the first slice of item 5 worked off
`scripts/heroless.mjs`. Russian fell from 22 imageless days of 63 to **1**, and
Serbian from 14 of 44 to **3**; Romanian fell 236 to 224 and Greek 268 to 255
without being worked at all, because these saints lead days in those calendars
too. **That is the shape of the rest of the programme**: a slice chosen for one
church pays into the others, and the two big churches are cheapest to attack
through the saints who are heroes in several.

The 7 refusals are all the same answer — Commons has no file this sourcer could
identify as the saint, and 4 of them are still their days' heroes:
`john-maisuradze`, `macarius-disciple-of-niphon`, `hypatius-bishop-of-lydia`,
`john-of-konitsa`. **Nothing was refused on licence**: all 26 came back PD, CC0
or CC BY(-SA), 26 ready and 0 problems on the dry run.

**`geticon.py` had a bug that fetched an icon and did not declare it.** A folder
whose `saint.json` already carried `"images": []` kept the empty array — the
key-copy loop copied it and `setdefault` then found the key present — so the
picture sat on disk and the manifest never saw it. `christopher` was fetched
twice that way. Fixed in the tool, and the lesson generalises: **the manifest
reads the folder's own `images` array, not the directory**, so the check after a
fetch is `heroless.mjs`, not `ls`.

**The 429 ladder is not enough for a batch this size.** The write run died three
times on a narrow file's original URL — at icon 14, then 8, then 5 — and the
cure each time was a 90 to 150 second pause and a re-run, which resumes cleanly
because the tool skips a folder that already has an icon. Four runs for 26 files.

**Batch 2 took the two-slot tier**, 46 heroes each leading two day-and-church
slots, and 39 of them got an icon: Romanian 224 to 185 and Greek 255 to 216, 79
slots for 39 pictures. 389 heroless heroes remain and the ranking that chose
that slice is `node scripts/heroless.mjs | awk '{print $1}' | sort | uniq -c |
sort -rn` — nothing now unblocks more than two slots, so the rest is one icon
per one or two days and the cheap half of the programme is spent.

The identity work is where the time goes, not the fetching. The Russian *Zhitiya
Svyatykh* plate series (1903-1911) is numbered `VVDDn` with volume 01 =
September, so every plate carries a calendar day, and that day is what separated
twelve near-misses: Nestor of Thessalonica from Nestor the Chronicler, Isaac of
Dalmatia from Isaac of the Caves, Quadratus of Athens from Quadratus of Corinth,
Philip the Deacon from Philip of the Twelve, Silouan the Athonite from Silvanus
of the Seventy, and so on. **Three Matronas were available for Matrona of
Thessalonica and all three were wrong** — Perge, Chios, Moscow — so that slug
was skipped rather than filled with a namesake, while Matrona of Moscow was
settled the same way in the affirmative.

**The manifest is at 387.1 KB gzipped against its 400 KB budget**, up from 376
before any of these icons; `build:manifest`'s own projection reads 370 KB at
5,000 saints. The Lighthouse FCP floor is the thing this trips first, not the
e2e suite — see the section above — and every icon costs a little of what is
left. **An image programme that finishes Greek and Romanian would add about 400
more declarations**; whoever plans that should price the manifest first.

### Two reds this sitting, both mine, both the same lesson

**A document that names a path CI does not have fails `citations.test.mjs`.**
HANDOFF.md named an uncommitted `scratchpad/` tool. Same shape as the manifest
trap, different file: the desk has the file and the runner does not.

**`buildMeta` counted attestation rows, not saints.** The moment one church kept
one saint on two days, `manifest.meta.json`'s `by_church` said 1,680 Romanian
for 1,679 saints, `e2e/helpers.js`'s `VENERATED` read it, the Index counted
cards, and four tests in `index-controls.spec.js` and one in `index-grid.spec.js`
compared the two. Fixed, and the invariant to hold on to is that the four
statuses are a partition of the corpus per church: they add to the total in all
four churches, and they did not while rows were being counted. **Anything else
that counts attestations now counts a thing that can repeat.**

### What the next person should not re-do

- **Do not re-measure item 8.** The numbers are in the item and the item's
  premise is corrected there: the early corpus is the work list, not the waves.
- **Python's `write_text` writes CRLF on this desk.** It broke
  `tokens-table.mjs --check` once by rewriting all 1,265 line endings of
  `STRUCTURE.md`. Write bytes, or normalise after.
- `scratchpad/shoot-feast.mjs` shoots the feast and a saint hero at 360 and
  1280 against `vite preview` on 4175. It is a one-off reading tool, not a
  baseline, and nothing under `shots/` was touched. **It is committed because
  this file names it**: `tests/citations.test.mjs` fails on a document that
  points at a path CI does not have, and naming an uncommitted scratchpad tool
  here cost a red run.

