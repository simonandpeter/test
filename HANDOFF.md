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
- **391 unit tests** in ~2 s. **944 browser tests** in ~4.8 min here, ~15 min on
  CI. Accessibility 100, FCP 1356–1376 ms against the 1500 floor. **The entry
  stylesheet is 52,441 bytes against `ENTRY_CSS_CEILING` 73,000** — the gate
  that fires before the four routes do and names the file
  (`docs/daily-desktop-visuals.md` §10.22). It was 72,562 with 438 bytes of
  headroom until 2026-09-12, when the Daily rebuild deleted `calendar.css`.
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

## Done, 2026-09-12: the Daily page rebuilt to the mockup

**The job.** `carousel-mockup-c/` was the target, handed over by the mockup
session: the Daily page rebuilt, plus the Daily/All Saints transition. The plan
and its review are `scratchpad/daily-rebuild-plan.md` — **§11 is the review and
overrides §0-§10.** Seven questions the plan left for the author were decided
there rather than left waiting; all seven are named in §11 and all are
reversible.

**What landed.** `views/calendar.js` from 1,387 lines to 160, mounting
`daily/{sidebar,tiles,open,lives}.js`. `picker.js`, `panel.js` and 4,679 lines
of `calendar.css` deleted. The two faces are layers in one clipped stage
(`ui/face-stage.js`), sliding over `--dur-swap`. Unit 391/0; `chrome`,
`index-grid`, `saint`, `daily-stage` 288/288 across both widths;
`daily-panel`/`daily-sidebar`/`daily-tiles` green.

**All Saints did not change, and here is the proof rather than the claim.** No
commit touched `views/saints.js`, `views/index/*`, `ui/loop-scroll.js`,
`index.css`, `index-filters.js` or `virtual-grid.js` — `git log --since -- <those>`
is empty. On pixels, 11 of 16 tiles are identical to
`shots/baseline-before-daily-rebuild`; two Russian tiles differ by 14 and 3
pixels, which is exactly what the same build differs by when shot twice, so it
is capture noise; three desktop English tiles differ by ~0.4% in a 20px strip at
the far left, inside `#view`'s gutter, where the full-bleed carousel's leftmost
card overhangs the column. That one is deterministic and unexplained: not the
stage's containing block (tested, `position: static` changed nothing) and not
any file of that view. It is the resting offset of a row that drifts
continuously in use, so it is not a designed position — but it is not nothing,
and nobody has yet said why it moved.

**What the pixel chase actually found.** Deleting `calendar.css` took six rules
with it that were never the Daily page's: the church chooser's and language
chooser's layout, and the shared grain gesture's. From `bd60c49` until
`f81ccd9` the chooser every first-time reader meets was laid out by the
browser's defaults, and the whole suite stayed green — it asserts what the
chooser does, never that it is dressed. Salvaged into `base.css`. If anything
else lived in those 4,679 lines that no page's own stylesheet claims, this is
how it will be found: not by a test.

**Lighthouse.** 1684-1709 ms FCP against the 1500 floor on all four routes,
accessibility 100. `docs/daily-desktop-visuals.md` records 1519-1853 ms on this
desk where CI's own run passes, with an explicit "do not chase" — the local
instrument is CPU-bound. CI arbitrates.

**The All Saints baseline must not be retaken.** `shots/baseline-before-daily-rebuild`
is 16 tiles of `/saints` shot before any of this, and `shots/` is gitignored, so
nothing in the history says it exists. A session that re-shoots it after the
rebuild destroys the only evidence it had. To read it:

    MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/saints       --widths=360,768,1280,1440 --themes=day,vigil --langs=en,ru
    node scripts/tile-diff.mjs compare before-daily-rebuild

`MSYS_NO_PATHCONV=1` is not optional under Git Bash: without it `--routes=/saints`
becomes `C:/Program Files/Git/saints`, every shot fails, and `tile-diff` archives
whatever stale tiles were already in `shots/` as though they were the baseline.
That happened twice, and both times the output read as success.

**Left for the author.** The five wrong-saint hymn objects
(`scripts/hymn-wrong-saint.json`). The source-corruption readings in
`scratchpad/hymn-flags.md`. The fast/fish shape marks in the month grid (a
solid rule above the numeral against a dashed one) if that reading is not
wanted. And `4983e72` is titled as a docs fix but also carries 3,400 lines of
spec deletions, swept in by a bare `git commit` after `git add` — the tree is
right, the history is not, and nothing is pushed, so a rebase would still tidy
it.

## In flight, 2026-09-12: the hymns into English

**Done, after four rounds.** **428 of 433 hymn objects carry an English, and
`--emit-texts` now returns nothing**: there is no source text left in the
corpus without a rendering. The five objects that have none are the five held
out on purpose (below), because they are not the saint's hymns. It was 163 of
433 when the loop started. A round was four subagents on four slices, filling
the `english` field and nothing else; if a session lost them the slices
re-emitted from scratch and nothing was wasted, because the corpus is only ever
written by the step after them.

**The loop is kept below because new saints arrive with new hymns** — every
folder added from here brings texts the emit will surface, and this is how they
are rendered.

Everything landed is on `main` — except that **`05f83ad` onward are committed
but unpushed**: this machine has no PAT any more (no credential helper, nothing
in `~/.git-credentials`), so the push needs one pasted in.

**The loop, start to finish:**

1. `node scripts/hymn-english.mjs --emit-texts --skip N --limit 25 --out
   scratchpad/hymn-slice-N.json` — the distinct texts still lacking an English,
   each naming every hymn it belongs to.
2. Fill each entry's `english`. The register and the standing wordings for the
   recurring formulas are in that script's own header and must be handed to
   whoever fills the file, or two sittings render one formula two ways and
   `mergeForReading` reads them as two hymns.
3. `node scripts/hymn-check.mjs scratchpad/hymn-slice-*.json` — empties, stubs,
   source script left in the English, chant slashes, and a length ratio against
   a band **measured** from the corpus's own renderings (0.85–1.59). It
   says which rows to read; it cannot say whether a translation is right.
4. Read a sample against the originals by hand. This is the step that matters
   and the one nothing can do for you.
5. `node scripts/hymn-english.mjs --write-texts scratchpad/hymn-slice-N.json
   [--dry]` — applies one English to every hymn object whose text matches.
6. `node scripts/corpus-gate.mjs --quick`, then `npm test`, then commit.

**Two rules already paid for.** A rendering made here is written
`rendered: 'site'` and the page prints a line saying so — never a bare
`english` with no provenance. And where two traditions sing one hymn it gets
**one** English and each keeps its own citation; where they are different hymns
in one mode — which is common — the work file splits the group with `only`.

**Five hymn objects are filed under the wrong saint**, found 2026-09-12 by
translating them, and **held out of the write rather than rendered into
place** — a correct English translation of the wrong hymn is still a false
claim about what a saint's calendar sings, and deleting cited corpus data is
the author's call, not a sitting's. The hold now lives in
`scripts/hymn-wrong-saint.json`, which names each object and why, and both
`--emit-texts` and `--write-texts` pass over them, so they no longer come back
round on every emit.

| folder | what the text actually is |
| --- | --- |
| `alexander-nevsky` | the troparion of the **Archangel Michael** ("O supreme commander of the heavenly hosts"), and Church Slavonic in Serbian spelling rather than Serbian |
| `alexander-patriarch-of-constantinople` | the Romanian kontakion **and** the Romanian troparion of the **Beheading of the Forerunner** — the kontakion names Herodias |
| `paul-the-new-patriarch-of-constantinople` | the same two hymns, the same way |

Both texts are already in the corpus where they belong, under
`john-the-baptist`, which is how they were recognised. The whole Romanian block
for those two patriarchs came off the 29 August page; they are kept on the
30th. Their Romanian kontakion in tone 8 is their own and was left alone.

**The misfiling propagated once, and that is worth knowing about the tool.**
`--write-texts` applies a rendering to every object carrying the text, which is
the whole point of rendering by text — one troparion of a martyr should be
written once. But the Forerunner's troparion is *correctly* filed under him as
well, so rendering it for him wrote it into the two patriarchs' folders too, in
`8a6e080`, with nobody choosing that. Stripped back out in `cecd146`. The hold
list is keyed on the saint as well as the text for exactly this reason.

Whether anything else had gone the same way was then checked rather than
assumed: every source text shared by more than one saint, asking whether the
text names one of them and not the others — the signature of a scrape that ran
over a day boundary. Six hits, all genuine companions kept on one day (Adrian
and Natalia, Simeon and Amphilochius, Sophia and her daughters, Meletius and
Neophytos). The scan is `scratchpad/wrong-saint-scan.mjs`.

**What the renderers doubted is written down, not lost**:
`scratchpad/hymn-flags.md` holds every corrupt-source reading they had to
choose — «lumânarea» for *luminarea* under Kosmas of Aetolia, «ενδιαφέροντα»
standing where a Greek particle should be in both of Phoebe's hymns, «инее»
under Lawrence of Kaluga, and half a dozen more. Each is a question about the
**source text**, answerable only at the page it was scraped from.

**Not a defect, though it reads like one**: `elizabeth-mother-of-the-forerunner`
carries Zacharias's troparion. They are commemorated together and the calendars
print it for both.

**The pattern across three sittings**: translating is the first thing that ever
made anybody read these fields, and it has now turned up scraped navigation in
six texts, a whole second hymn glued inside a seventh, and these three. None of
them was reachable by any test the repo had, because every one is a true string
in a well-formed field.

**Not done and worth doing by someone with the books**: 41 hymns cite Orloff's
*General Menaion* (1899) or Hapgood (1906), both public domain, and a citation
beats a rendering made here. Matching the rest against Orloff's commons was not
possible offline and would improve on much of this.

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

## The name-strip fix, 2026-09-11

**Eighteen printed name forms began with a rank, not fourteen**, and the four
the gate walked past are the finding. `corpus-gate.mjs` reported fourteen; a
reading of all 1,166 printed forms — every language of every folder, not only
the rows the gate named — found four more, and every one of them was a hole in
the checker's own vocabulary rather than a subtle case. Three Romanian ranks it
did not list (*Martir*, *Mare Muceniță*) or could not spell — «Muceniţă» is
written with the cedilla ţ and the gate's character class held only the
comma-below ț — and the Serbian «Свешт. муч.», which four forms carried past
the strip list and past the gate's regex alike. **A checker written from the
rows that prompted it sees the rows that prompted it**, and the only thing that
found the rest was printing all 1,166 and reading them.

All eighteen are now names. Nothing else in the corpus moved: the whole set of
printed forms was snapshotted before and after and the diff is exactly those
eighteen lines (`scratchpad/name-snapshot.mjs`).

**Two are mechanisms rather than list entries**, and each has a test that fails
when it alone is backed out:

- **Romanian is written with two different t.** ș/ț are the letters Romanian
  uses and ş/ţ are the legacy Turkish code points a lot of Romanian text still
  carries; the corpus holds both, sometimes for the same word. The list is
  folded for **matching only**, so the reader still gets the character the
  source wrote.
- **A rank word standing in front of an office is a name.** «Άγιος Όσιος
  επίσκοπος Κορδούης της Ισπανίας» is Hosius of Córdoba, whose Greek name is
  the word for *Venerable*; stripping it left an office, a place and nobody
  named. Greek writes the office *behind* the name with no comma at all in 64
  of its 441 recorded forms, so what follows tells them apart. **Greek only** — Serbian and Romanian put
  the title in front («Епископ Атанасије», «Împărăteasă Pulheria»), where the
  same guard would keep the very ranks the file exists to remove.

**Four rows remain and each prints why.** Three are companies whose rank *is*
their name — «Преподобномученики Белогорские» is the Monk-martyrs of Belogorsk
and there is nothing else to print — and the fourth is Hosius. The gate reads
`saint-name.js`'s own company test rather than a list of slugs, so the two
cannot drift apart.

**The gate's `npm test` step had never run.** `node --test tests/` reads the
directory as a module specifier on Node 22 and later and dies before running
anything, so that step failed on every tree from the day it was written
(2026-09-10) — `package.json`'s glob works only because npm hands it to a
shell. It reads the directory now, and runs the 391 tests it always claimed to.

## Three carousel tests that had been passing on luck, 2026-09-11

Found by the name fix's own full runs, and **nothing to do with it** — the
manifest that fix changes differs in one field for eighteen saints, and these
tests read English captions.

**The row's membership is not the row's membership until the idle repack.**
The first paint packs `CX_PREFIX` and the rest arrives on
`requestIdleCallback` (PLAN item 2, the half that landed). Measured directly
at the three quantities the tests read, at the instant `.cx-card` becomes
visible against after the repack (`scratchpad/row-reads-probe.mjs`, four CPU
rates, three passes each):

| | at first card | after |
| --- | ---: | ---: |
| cells in the track | 60 | 198 |
| `img` in the track | 40 | 147 |
| first ten slugs | — | **different, 12 of 12** |

**Identical at 1×, 6×, 10× and 20×, and that is the finding.** This is not a
slow-machine race that parallel load makes likelier — the prefix is what is
there when the first card paints, at every speed. The three tests were racing
the gap between their read and the repack, and the gap is always open.

Caught inside two full runs: *the row is not the full rendered run* at 38
against a floor of 40 — and the bare read is **exactly 40**, which that floor
wants strictly more than — *the whole run is not in the track* at 76 against
100, and *the same seed dealt a different hand*, which was one hand read before
the repack and one after.

**Three waits that look right and measure as useless**, all tried before the
one that works, because this suite's history is explanations written into the
code and later disproved:

- The sibling's wait, the row wider than its own viewport — already true at 60
  cells, so it returns instantly.
- Two consecutive equal readings, which trap 7's resize case teaches — it
  **settles on the prefix**: at 6× and above the repack has not begun, the
  count sits still, and the poll exits inside 250 ms. It read as fixed at 1×
  and fixed nothing.
- A fixed 700 ms sleep, which is what stood in one of the three.

`packedRow` in `index-carousel.spec.js` is the wait, on the quantity itself,
used by four tests. `scratchpad/cells-probe.mjs`, `settle-probe.mjs` and
`row-reads-probe.mjs` are the instruments.

**Still open, and not ours**: `chrome.spec.js`'s *the masthead is one box on
all six routes* timed out at 30 s on mobile-360 in the same run, having passed
at 24.8 s on desktop. It walks six routes in two themes and waits on
`document.fonts.ready` at each; it is against its own budget, not racing
anything.

## The reference read against the page, 2026-09-11

The author opened the desktop Daily page beside the reference and named four
things. All four were real; **three are fixed and one is held.**
`docs/daily-desktop-visuals.md` §10.26 is the record.

- **The expanded register stopped matching the day's card**, and §10.24 is why:
  it made the hero five twelfths of its column, so the picture ran 244 → 568 px
  across the window while the register stayed at the reference's fixed 340. The
  two agreed at one width and nowhere else. `--card-pic`/`--card-gap` are
  declared once on the route and read by both now.
- **The name sat 4 px high** — the reference's 8 px lift is computed from 27/40.5
  type and §10.8 moved the name to 26/1.25 without moving the lift.
- **The month carried the phone's ring as well as its own mark**, nested on the
  cell that is both today and selected. Gone past 1024 px; the week strip keeps
  it. The cell under it is square now too — `base.css` gives every button 4 px
  and nobody chose that for a month grid.
- **The way into the life and the fade above it** — held on the 11th, released
  on the 12th. `Continue reading` is flush left under the lede and nothing fades
  under it, which is the reference. It superseded four instructions of
  2026-09-01, 09-02 and 09-04, and they are listed in §10.27 rather than quietly
  dropped.

**The rule that came out of it, and it is the standing one**: *"Fuck the plan
when im talking i override"* (author, 2026-09-12). A live instruction beats
anything written down, including an earlier instruction from the same author.
§10.26 held that item and asked for a word, which was right; it also offered the
record as an argument, which was not.

**Two of the three I raised as further defects were not defects**, and both
lessons are the same one. The sidebar column *is* the reference's 304 — 272 is
the month grid inside it, and the probe read the grid. The name-days-first order
*is* the author's own instruction of 2026-09-02, which `calendar.css` applies
with `order` precisely so the phone keeps the markup's reading order. **Check
provenance before calling something drift**: two of these would have been
"fixes" that undid the author's instructions.

**The method worth keeping.** Every number here comes from a probe that takes
the same reading off *both* documents — `scratchpad/align-probe.mjs`,
`mock-audit2.mjs`, `shape-check.mjs`. Reading one and describing the other is
what produced §10.1 and §10.4, the two decisions this document made from a
render and later had reversed.

## The hymns into English, from 2026-09-12

**The ask** (author): "I want all the hymns translated to English. When English
is the language, I only want English hymns showing. ALL HYMNS TRANSLATED. No
double ups. If there is a troparion in Russian and Greek, they should be the
same when translated to English. If they are completely different, just cite
this as a Greek source, and this as a Russian source."

**The corpus is 432 hymn objects but only 327 hymns.** The difference is the
whole of the "no double ups" clause: a saint's apolytikion is often one text
sung in three tongues, each tradition citing its own book. Keyed on
`slug · kind · tone` — the same hymn keeps its mode across traditions — the 432
objects are 327 distinct hymns, 42 of which more than one tradition sings.

**Two pieces of work, and they are independent.**

- `mergeForReading` in `ui/hymns.js` collapses them **at the reading and never
  in the data**: the folder keeps every tradition's own hymn with its own
  citation, because that is what a Greek or a Russian reader is shown, and an
  English reader gets one text carrying every book that published it. Keyed on
  the rendered English, so two hymns that translate differently are simply two
  hymns and need no rule. `tests/hymn-merge.test.mjs` holds it.
- `scripts/hymn-english.mjs` emits the hymns still lacking an English and writes
  typed English back into the folders. It translates nothing and proposes
  nothing, like `draft-saint.mjs`; dry run by default.

**Two things the first batch found in that tooling**, both worth the batch:

- **The tone key was a digit match**, so every Greek hymn read as toneless —
  `Ἦχος γ΄` is tone 3 in Greek numerals — and never grouped with the Slavonic
  twin it is one hymn with. `lib/tone.js` already had the reader the page uses.
  Using it collapsed 17 more pairs: 344 distinct hymns became 327.
- **The tone over-groups as well.** Adrian of Nicomedia's mode-4 kontakia are
  the hymn for him and Natalia in Romanian and Slavonic *and* a general
  kontakion of the martyrs — three objects, two hymns. An entry carries `only`
  to answer for part of a group, which is the author's "if they are completely
  different" case and it is common: Alexander Nevsky's and Alexander of
  Constantinople's Russian and Romanian hymns are different texts in one mode.

**Where it stands: 91 of 432 objects carry English, 59 of 327 hymns.** The
renderings made here are marked `rendered: 'site'` and the page prints a line
saying so under each, which is the 2026-09-07 convention and not a new one —
39 hymns cite Orloff's *General Menaion* (1899) and 2 cite Hapgood (1906),
both public domain, and a citation is the better thing wherever one can be
found.

## Known and unfixed

- **All Saints packs all 862 captions in one blocking task** before it can paint
  a column, ~1,200 ms at 10× CPU. The reader-facing defect with the most in it,
  and `PLAN.md` item 7. The drift test's wait for a packed row is an instrument
  on it: when the pack goes lazy, that wait should return instantly.
- **The phone nav strip breaks under an aggressive swipe** — `keepEndless`
  writes `scrollLeft` inside a live gesture.
- **A phone draws a 150 px card from a 560 px file.** The first screenful of All
  Saints is 579 kB and could be ~189.
- ~~The Romanian name days print ranks where they should print names.~~ —
  **fixed 2026-09-11**, and the section below has what it cost and what it
  found.
