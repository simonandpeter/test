# Handoff — start here

Eastern Orthodox build: four churches (Russian, Romanian, Greek, Serbian), the
reader chooses one. Live at https://simonandpeter.github.io/test/, deployed by
GitHub Actions from `dist/`, not from the branch.

Read `CLAUDE.md` for where things are. `SESSIONS.md`'s amendment index is the
reasoning — read the index, then only what it points you to. `DESIGN.md` is
binding. Do not re-litigate settled decisions; search first.

## How this session works

**One session. You build, commit and push.** PAT is in
`C:\Users\matei\Documents\Agios Website Ex\update git.txt` — embed it in the
push URL, push, then reset the remote to
`https://github.com/simonandpeter/test.git`.

**Then read the Actions run before starting the next thing** — its conclusion
*and* its `flaky` line. A green run with `N flaky` contains a test that failed
and passed on retry, and that is the only place a flake rate shows. A local pass
is evidence about this desk: the site once went five pushes without deploying
because nobody looked.

**Back out your own fix and distrust your own framing.** A session backing out
its own change confirms its own account of it. Say what you measured and what
you inferred, and keep them apart.

## State (2026-08-28)

- **742 saints**, every one with a life and four attestation rows; **162
  undated**; **130 icons**; 430 hymns, 49 with a published English rendering.
- **144 day records**, 23 Aug 2026 – 13 Jan 2027. Russian and Romanian
  throughout; Greek and Serbian for the first four weeks. Saints stop at
  20 September — days past it print readings above a line saying so.
- **206 unit, 584 browser** across two projects. `npm run test:all`.
  `npm run test:lighthouse` is the §13 pair Playwright cannot reach and runs
  separately — it builds, serves and kills its own preview.
- Locale packs 339/339, no English fallbacks.
- First download is ~133 kB JS: day records and locale packs are their own chunks.

### Things that will surprise you

- **All Saints opens on the carousel on every load.** The toggle holds for the
  visit and is not persisted. The carousel carries the **whole corpus**, in
  columns of 1–4 saints packed by height.
- **`currentChurch()` and `chosenChurch()` are different questions.** The first
  always answers (including a guess from browser language); the second is null
  until the reader chooses. Reach for `chosenChurch` unless the thing cannot
  exist without a calendar.
- **All Saints shows everyone whatever calendar the header keeps.** Narrowing is
  *unticking* the Calendar facet.
- **Save is on the saint's own page and nowhere else.**
- **A saint is named by rank, not "St."** `display_name` is the bare name;
  `office` is its own field. Never put rank, office or death year into
  `display_name` — a unit test sweeps for all three.
- **Two different things are called `names`**: a saint's own script forms, and
  the search index. Neither is `display_name`.
- **Gold marks a finding about veneration, never chrome** — one sanctioned
  exception, the fast's colour by kind (DESIGN.md §2), plus the Random die.
- **The site's name is `BRAND`, never translated**, and the masthead is an SVG
  of the stamp face's outlines rather than live text.
- **Readings print in the reader's language**, from a book table in
  `lib/bible.js`. The *calendar* and the *language* are separate controls.
- **The lives stay English by decision** (Amendment 2: no invented content).

### Open flakes — three, all low, none acted on

| test | sightings | project |
| --- | --- | --- |
| `random deals an order, and holds it still under the reader` | 2 in ~38 | desktop |
| `the index offers two layouts, and remembers which one the reader chose` | 2 in ~38 | mobile-360 |
| `the row comes back on its own after a press` | 2 in ~5 | **both** |

Two were filed as "seen once, not recurring" before they recurred. **A second
sighting is the first fact about a flake; the first is a rumour.**

The third recurred on 2026-08-28 and is now a fact: `fa7abcb` on desktop,
`7cf9f11` on mobile-360. **It is not project-specific**, which the other two
are, and 2 in ~5 runs is a much higher rate than their 2 in ~38 — the two
sightings are consecutive green runs. Nothing this session touched goes near it.

The rail's coast is **closed** — never a flake but a negative first `dt` in
`beginCoast` (`coastDelta`, `tests/coast.test.mjs`); eleven clean runs since.

## Your work, in order

**Refinements first.** The author reviews screen by screen and sends short,
specific requests several at a time. Render every change and look at it. Say
when a request contradicts DESIGN.md or SESSIONS.md and record the reversal
rather than absorbing it quietly.

### Session 4b — the ship gate — done 2026-08-28 (Amendment 68)

**All seven of §13 are measured and all seven pass on CI**, which is the only
machine whose answer counts. Every number below is the runner's, from `dc6fc22`.

| § 13 criterion | measured | where |
| --- | --- | --- |
| Responsive to 360 px | no overflow, 8 routes × 2 projects | `quality-floor.spec.js` |
| Visible keyboard focus | 12 tabbed elements, all outlined | `quality-floor.spec.js` |
| `prefers-reduced-motion` | nothing animates | `quality-floor.spec.js` |
| No axe violations | 0, light **and** dark, 8 routes | `quality-floor.spec.js` |
| Lighthouse accessibility ≥ 95 | **100** on all 4 routes | `npm run test:lighthouse` |
| Colour duplicated in text or shape | 3 marks, 3 silhouettes | `quality-floor.spec.js` |
| No layout shift when data arrives | **0.0042**, budget 0.02 | `quality-floor.spec.js` |
| FCP < 1.5 s throttled 4G | **1206–1221 ms** | `npm run test:lighthouse` |

Fixed here: the header reserves its height (`--chrome-h-reserve`) instead of
growing 26 px into place, which was 0.0307 of CLS on almost every route; the
saint page appends below the life instead of skeletonning above it, which was
779 px on Christopher; dark `--rubric` went `#C05B4B` → `#CB7769` (3.93:1 →
5.18:1 on the field), which took Lighthouse accessibility from 96 to 100; and
the rail's three marks are a disc, a ring and a diamond rather than one disc in
three hues.

**FCP is worth knowing two numbers for.** On the author's desk it straddles the
line — medians-of-three of 1451/1453/1458/**1703** ms one run and
1459/1484/1470/**1490** ms the next. On the runner it is **1206–1221 ms with the
three samples behind each median spread by 3 ms.** The desk's variance was a
fact about the desk, which is why the gate blocks: ~280 ms of margin, and a gate
that cannot fail is a report. If it ever goes red on timing, the measured lever
is the two preloaded Latin subsets (~190 ms) — but they earn it, winning the
`font-display: optional` race under the same throttle 4 of 4, so **spending the
serif to buy the margin is the author's call.**

Two findings left for the author, both recorded in Amendment 68: the rail and
month buttons fail WCAG 2.5.3 Label in Name (visible "Fri 30", accessible name
"Friday, 30 January 2026 — a fast"), and the month's numerals still carry the
fast in colour alone, which is where an explicit instruction put it.

### Session 7 — the globe (next)

`d3-geo` orthographic canvas globe, bundled Natural Earth TopoJSON, a
location-kind selector (birth / death / relics / ministry — one dot cannot
honestly stand for all four), clustering with collide-detected labels,
uncertainty halos proportional to `precision`, the Index's filter set, a
timeline brush with play, an Unlocated tray. `src/views/map.js` is a
placeholder. First shipping consumer of the uncertainty curve, and it adds a
dependency and bundled geodata against a manifest budget the brief caps.

### Done or cancelled

- **Session 5b** (efficiency pass) — done 2026-08-28, all five items.
- **Session 6, River mode** — **cancelled**. The carousel is the River: default
  face, horizontal, shuffled, no sort control, whole corpus. Addendum C2's
  single card box — which it calls the mode's whole point — is now deliberately
  broken by the instructions to pair wide icons and pack by height. Three items
  survive it, to take on their merits rather than as a phase: arrow-key
  navigation, a shuffle control, a shareable seed.
- **Session 8** — timeline, export/import, rite × communion table (§9.2 refers
  to the veneration glyph, removed at Amendment 25; needs re-scoping).
- **Session 9** — PWA, offline, About statistics (where `loadManifestMeta()`
  finally gets a caller).

## Data work — larger than the engineering

- **Saints for the days past 20 September.** 600–1,100 folders. Dedupe on the
  *feast date*, never the name. Pipeline under `.tmp/`; a day is roughly a
  sitting.
- **Greek and Serbian saints banked** under `.tmp/` (463 Greek entries for
  20 Sep – 31 Oct; 182 Serbian days). Editorial work — do not generate these.
- **Icons for the 612 without one.** Harvest a *known* corpus and match by hand;
  a general Commons search by name returns the wrong people. Next wells: the
  1903–1911 Жития Святых engravings, and per-saint "Category:Icons of …" trees.
- **English hymn texts: 49 of 495**, and the public-domain well is dry. Nassar's
  1938 menaion would finish it if its copyright status can be settled — a rights
  question, and the author's.
- **21 saints lead a day with no icon** (calendar year 2026, the 133
  day-and-church combinations carrying an entry). Adding an icon can only ever
  lower that number.

## House rules

- **Do not bulk-generate saint data.** Where a date is unverified the honest
  entry is `undocumented` with a note.
- **Adding a saint means adding one folder.** Never hand-edit `data/`.
- **Reduced motion removes animation, never shortens it** — including any JS
  that waits for a transition.
- **Anything holding two copies of a thing in the DOM must say which is
  current** — `src/ui/swap.js`. Do not grow a fifth implementation.
- **A decorative fade is still text.** `opacity` on a colour is a new colour and
  axe reads it. Fade with a `mask-image`.
- **A proportion applied in two places multiplies.**
- **A worked value nobody executes is a comment.** If a document pins a number,
  pin it in a test.
- **A count in the DOM is not a count in the corpus.**

## Environment (Windows)

- PowerShell 5.1 writes a BOM, which breaks `JSON.parse`. Prefer Write/Edit or
  short Python.
- Git Bash rewrites a leading-slash argument **or environment variable** into a
  Windows path. `MSYS_NO_PATHCONV=1`.
- Never leave `vite preview` running; `playwright.config.js` refuses to reuse a
  server it did not start. Kill by PID if the wrapper survives.
- CRLF warnings are noise here.

## Outstanding — the author's, not yours

- **Seven saints carry `confessor` beside a hierarchical type** and read as
  *Confessor*: Barses and Eulogius of Edessa, Liberius of Rome, Martin the Pope,
  Nicholas of Alma-Ata, Paul the New of Constantinople, Protogenes of Carrhae.
  For several the epithet is right, so it is a reading per saint. Data, not code.
- **Whether a non-civil reckoning belongs anywhere.** The saint page prints each
  attestation's own feast; the Daily page prints the civil date alone, twice
  decided.
- **Manifest budget** projects to 864 KB gzipped at 5,000 saints against a
  400 KB ceiling. Meaningless below ~200 saints; the shard shape is settled
  (calendar-first) when it fires.
- **Search does not reach the historical script forms.** Carrying them costs
  ~20 kB gzipped on the boot path. Recorded, not acted on.
- **The Index's 72ch column** — widening it is deferred, not declined, pending a
  possible desktop layout design.
- **The uncertainty curve has no shipping consumer** until Session 7.

## Provenance

`f0ddb12`, `1b1d8a1` and `2ebe682` carry one set of eyes rather than two —
pushed unverified at the author's instruction. CI is green on all three.
"Verified by both sessions", where it appears in commits of 2026-08-27/28, meant
two sets of eyes on the claim and one set of hands on the gate; it never meant
anything was run twice, and nothing from 2026-08-29 onward carries it.
