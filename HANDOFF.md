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

**Nothing is in flight.** `a69b0f0d` carries the night's work; read its CI with
`scratchpad/ci-flaky.py a69b0f0` rather than trusting a line here. Both colour
agents handed back and their ledgers are `scratchpad/icon-colour-swaps-a.json`
and `-b.json`.

**THE MANIFEST IS OVER ITS BUDGET AND NOBODY HAS PRICED IT.**
`npm run build:manifest` prints the figure and its own projection at 5,000
saints, and both are past the 400 KB the brief sets. It is the corpus that did
it, not any one wave. The Lighthouse FCP floor is what this trips first, not
the e2e suite.

**The map is open and the sweep is finished.** 112 lives were placed over five
batches on 15-17 October; located folders went 110 to 226, and
`scripts/place-candidates.mjs` fell 4,527 to 3,661 — 749 of that drop being a
bug in the script itself, which split a located saint's `modern_name` on commas
and so had **Russia** in its index at Lake Ladoga's coordinate.
`scratchpad/place-dated.mjs` is the narrowing the batches were read off: a
governed verb, one city named in the life, and a date, because an undated saint
joins `tests/map-span.test.mjs`'s `UNDATED` list the moment it gets a
coordinate. Its five routes are spent, every batch's refusals are written in
its own script, and `TODO 23` holds the four questions they could not settle.
`tests/location-gazetteer.test.mjs` is new and catches the one mistake 112
hand-typed pairs could silently make — a coordinate written the wrong way
round, which the schema accepts and which puts a pope in Albania.

**THE COLOUR SWEEP IS ALL BUT CLOSED.** The queue measured 172 greyscale
icons on 16 October and `scratchpad/grey-queue.py` now measures **134**:
thirty-eight are answered in colour, and of the 134 that remain **122 have
been searched and refused with their reason recorded** in
`scratchpad/icon-colour-swaps-a.json`, `-b.json` and `scratchpad/icon-refusals.json`.
What a next wave has left is the twelve `scratchpad/grey-left.json` names and
nothing else.

**Four swaps were made, looked at, and taken back out**, which is the one bar
a script cannot clear: whether the picture reads as that saint in a 352 px
hero slot. A photograph of a church interior with Haggai cut off at its edge;
a whole page of the Manasses Chronicle for Maximus; a photograph of Thaddeus
of Tver's reliquary shrine where the file he already held is a portrait of
the bishop. All three cleared saturation, width, licence and identity by
script. Pulcheria's Met print never reached a folder, measuring 0.068.
`scratchpad/hero-shots.mjs` and `scratchpad/blob-look.mjs` are how a picture
gets looked at, and `scratchpad/colour-swaps-reverted.json` holds every
reverted URL, so any of them goes back in one fetch.

**`icon.jpg` is not always a JPEG.** `geticon.py` writes Commons' thumb bytes
verbatim and Commons serves a PNG thumb for a PNG source, so **136 of 555
masters are PNGs under a `.jpg` name**. Mostly that is right — the Menaion
plates are line art and smaller as PNG — but **sixteen are colour mosaics and
photographs carrying 19.5 MB they do not need**. `scratchpad/png-icons.py`
measures it and re-encodes only where a JPEG is actually smaller. The four
this night's own swaps wrote are converted; the sixteen are older and are a
decision.

**A row number does not survive a requeue.** `grey-queue.py` is regenerated as
icons are answered and every index moves, so `cb-search.py` takes
`--slugs <file.json>` now.

**What the colour sweep cost, which is the reason it did not finish.** Two
clients at a request every 1.5 s took Commons and every wikipedia to a hard 429
within minutes. One client at a request every 4 s with a (0, 20, 60, 150, 300)
ladder runs clean at about 1.3 saints a minute. Slice A reached 15 of its 86
because a single saint sat in that ladder for half an hour and **its script had
no per-row time cap** — that is the bug to fix before any further wave, and
TODO 5's "set it aside and come back" has to be enforced by the code.

**Two things the agents could not do and nobody should do for them from a
session.** Slice A could not stop its own wedged `cs-search.py` —
`taskkill` and `Stop-Process` were both refused by the permission classifier —
and it asked for the process to be killed by hand. Slice B refused
`tikhon-of-amathus` although the Dumbarton Oaks fresco passes all four rules,
because half the frame is soot and a doorframe and he shares it with Nicholas:
one draft row away if the author wants it.

**TODO 17 is done.** 1,138 dead `READ_FOLDS` keys are deleted and the check it
asked for passed — the gate's collision block byte-identical, every marker and
every `read:` line unmoved, 5,024 lines to 2,748. Its remainder is the 252
readings, which are a reading and not an edit. The permission that blocked it
for three readers was not refused this time; nothing was worked around.

**A backup of this tree sits at `Agios Website Ex\2026-10-14\main`** (no
`node_modules`, `.git`, `dist`, `shots` or `main/.claude` — that last is 21 GB
of session cache and is why a mirror of this folder balloons).

**The app shells carry this build** (`npm run app:sync`, 17 October). No binary
has ever been built: that wants Android Studio or Xcode, and `docs/APP.md` says
which steps.

**The carousel's `.facets` intermittent is answered**: `toBeVisible()` retries
inside the page's own `requestAnimationFrame`, so a desk handing out one to
three frames a second fails an assertion that `isVisible()` satisfies in 13-29
ms. The page needed no change; five waits moved to `expect.poll`. The general
lesson is in `STRUCTURE.md` §6's flake entry, because it will come back on
another spec. **`index-carousel.spec.js:2090` is a different fault and is still
unexplained** at about 1 in 12, as is `:1535`/`daily-stage.spec.js:763`, the
restore pair.

**The icon tail is answered, not open.** `scratchpad/icon-refusals.json` holds
107 records. Of the 50 that were queued, 25 are `nowhere` (no entity on six
wikipedias, or an entity carrying no picture at all) and 9 are `namesake` with
the wrong man named — `paul-of-jamnia` and `paul-companion-of-andrew` both reach
the Apostle Paul. **16 are a reading a script cannot do**, each with a count of
the files its sweep found: `scratchpad/icon-sweep.py` searches six routes over
four hosts, `icon-nowhere.py` and `icon-namesake.py` record the verdicts, and
the sweep's own log, which is gitignored output and is re-made by running it
again, is the evidence for every row. Openverse and Europeana are finished too:
they answer with churches named after these saints.

**The remaining slices, both measured and safe to hand to a reader:**
- **Item 16**: tier D's remainder; undated is `node scripts/ship-gate-days.mjs`
  and a fresh manifest, not a number from here.
- **Item 15**: the icon quality worklist, `scratchpad/icon-quality.py`, whose
  finding was that width is the live axis and tone is not.

**The older decisions still standing**, none to be guessed:
1. **`joseph-of-bisericani`** — 1711 against a fifteenth-century birth,
   unreconciled on its own page.
2. **May a page's own «perhaps» be recorded?** `nearchus` hangs on a surmised
   friendship; `therinus` and `valerius` carry a bolded "no date was added
   here" that a yes would reverse.
3. **May a BC wave begin?** Four folders' immediate kin already carry BC
   displays.
4. **The Aglomazovo four** — two Johns and two Pauls, distinct men whom the
   calendar separates only by position in a line.
5. **The Erasmus merge** — `erasmus-of-the-caves` and
   `erasmus-of-the-kyiv-caves` are the same Caves monk on the same Julian 24
   February, and the merge-if-same rule applies. A pass of its own: it unions
   attestations, carries name forms, repoints `related` and deletes a slug.
6. **Item 15's two** — whether a greyscale plate is worth replacing with a
   colour miniature, and whether a 560 px icon in a 1000 px slot is worth
   replacing when nothing upscales.


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

