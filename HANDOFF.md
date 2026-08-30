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

## State (2026-08-30)

- **851 saints**, every one with a life; **1210 attestations**, every one
  `venerated` — no refusal and no sourced absence is recorded yet, and the
  About page says so. **154 undated**; **130 icons**; 430 hymns, 49 with a
  published English rendering. The corpus reaches **28 September 2026** in
  both calendars - the reach walks each reader's own calendar (entries.js),
  and its fortnight gap-tolerance carries the Russian run over the
  folderless Exaltation (Russian 556, Romanian 160, Greek 365, Serbian
  129). **60 saints carry a location, 84 points between them** (7/16 at
  the start of 2026-08-30 evening; Amendments 84-86), spanning 66-1938,
  which the map's timeline now filters.
- **144 day records**, 23 Aug 2026 – 13 Jan 2027. Russian and Romanian
  throughout; Greek and Serbian for the first four weeks. Saints stop at
  20 September — days past it print readings above a line saying so.
- **228 unit, 654 browser** across two projects. `npm run test:all`.
  `npm run test:lighthouse` is the §13 pair Playwright cannot reach and runs
  separately — it builds, serves and kills its own preview.
- Locale packs 356/356, no English fallbacks.
- First download is ~133 kB JS: day records, locale packs and the map's
  coastline are their own chunks.

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

### Open flakes — three known, one rumour, none acted on

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

**`a press on a carousel card opens the saint` is a fact now**: one local
sighting on 2026-08-29 ("no card was fully in view to press"), one on CI
the same day (`01324b1`, mobile-360, green through the retry), and a third
locally on 2026-08-30 (mobile-360, full parallel suite; 3/3 green rerun in
isolation immediately after), and a fourth the same day in the next full
run, same shape. Four sightings, two machines, always mobile-360 under
load. Not yet diagnosed; the card-in-view premise poll is
where it fails, which smells like the same late-rebuild family the gesture
handoff fixed - but that is an inference, not a measurement.

**The wheel-cap test was fixed 2026-08-29**: it measures an average over
fifteen frames with the clamp held pinned, rather than two frames of luck. Four
consecutive greens where it failed one run in three; backed out by raising the
cap to 2000, it reads ~1900 — it measures the cap it guards now.

**And `the row comes back on its own after a press` is NOT closed** by the
gesture handoff after all. The handoff exposed and fixed one mechanism - a
wheel spun on a dying loop died with it - and bought seven consecutive clean
CI flaky lines; but on 2026-08-30 the test failed once locally mid-batch
(passed on rerun) and then flaked on CI twice in a row the same day
(`5e9841e` desktop, `bd1392f` mobile-360 - both green through the retry).
Whatever remains is not project-specific and its rate is climbing back
toward the old 2-in-5; the watch continues, and a diagnosis needs a
CPU-throttled reproduction (trap 10), not another inference - it is the
next non-corpus work item.

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

### Session 7 — the map — shipped in part 2026-08-29 (Amendment 69)

**It is a flat Mercator, not §8.3's globe** (author, 2026-08-29: "just do a
simple mercator projection 2d map for now, something very light"). It carries no
runtime dependency at all: `lib/mercator.js` is the whole projection, pinned by
`tests/mercator.test.mjs`. The coastline is Natural Earth 110m, generated by
`scripts/make-land.mjs` and committed, dynamically imported so it is a **19 kB
gzipped chunk off the boot path**; `world-atlas` and `topojson-client` are
dev-only and the bundle never sees them.

Shipped: the picture, the four-kind selector (death default) and uncertainty
halos — **the curve's first shipping consumer at last**. Since 2026-08-30 the
page is **the map and a small footer, nothing else** (author: "remove
everything on the map page outside of the map itself except for leaving a
small footer with the coastline map credit and scroll to zoom hint") — the
lede, the Places list, the Unlocated tray and the Index's facets all went, one
day after the facets arrived (Amendment 77 records the reversal). The kind
counts in the legend are now the page's one statement of what it shows, and
`map.spec.js` holds them to `data-dots`, the draw pass's own hit-map. The
canvas is one opaque image to a screen reader; with the list gone, the Index
is where every located saint remains reachable as text — a trade that is the
author's, recorded rather than absorbed.

**Clustering below a density threshold and collide-detected labels stay
deferred, and the reason is the corpus rather than the effort: 19 of 851 saints
carry a location, 84 points between them (7/16 at the start of 2026-08-30
evening).** A threshold that never fires and labels that never collide would
be machinery verified against nothing. They come back when the data does,
and that is data work, not this.

**Zoom and pan landed 2026-08-29** (author: the page zoomed, the map did not).
`lib/map-view.js` is the arithmetic — scale plus a centre, clamped so the world
never comes off its box and a zoom keeps the point it was aimed at — and
`tests/map-view.test.mjs` pins both. Buttons, Ctrl+wheel, drag, pinch, and the
keyboard (arrows pan, +/- zoom, Home resets).

**A bare wheel zooms, smoothly, no Ctrl, and touch is the map's always**
(author, 2026-08-30 — reversing the never-get-stuck arrangement of 2026-08-29).
The old rule existed so a reader scrolling *past* the map could not be trapped
by it; with nothing below the stage there is no page to scroll past, the trap
cannot be built, and the wheel has one honest meaning left. The map route
cannot scroll at all (`overflow: hidden` on the route, and the column fits the
window exactly); the header above the stage is the way out.

**The stage is the whole window 2026-08-29** (author: "make sure on mobile and
desktop the map is the whole window, under the header, not just a predefined
window"). `main` gives up its column on `html[data-route='map']`, and that
attribute is written by **index.html before first paint** as well as by main.js
— in JS alone it measured 0.21 of layout shift, which the §13 gate caught.

The world now **covers** its box rather than fitting in it (`coverFractions`):
a window is whatever shape the reader made it, fitting would letterbox, and the
first attempt simply stretched the picture — Egypt was visibly taller than
Egypt, with every other test still green. One axis is cropped instead, and that
axis can be panned even at 1.0x, including sideways by thumb, or the Americas
would be unreachable on a phone.

**The Index's filter set arrived and left on 2026-08-30** — it lived in the
below-map reading the author removed the same day. What survives of Amendment
76: §8.3's zoom labels (overlap-drop past 2.5x), pressable dots (a press under
5 px of travel opens the saint; a haul does not — and since the same day the
saint's x returns to the map, mirroring the calendar's courtesy of
2026-08-23), and the whole-corpus model. If filters return to this page they
return as something drawn on the stage; the Index keeps the facets meanwhile.

**The map names the region, not the village.** `modern_name` and
`historical_name` are in each saint's own file and dropped from the manifest on
purpose — two strings per location across 5,000 saints is real weight on the one
request the site boots from. The saint's own page names the village.

**The timeline landed 2026-08-30 evening** (author: "add a timeline bar at the
bottom ... where you can filter saints by date on the map"), overriding the
corpus-blocked deferral above for a plain range filter while leaving the
brief's *density-paced brush* exactly where it was — seven (now nineteen)
located lives still cannot demonstrate a pacing algorithm's correctness. Two
overlaid native `<input type="range">` over one rail, filtering `withPlace` by
each card's `lifeInterval` (`lib/index-filters.js`'s own reading, reused
rather than reinvented) before the kind counts or the picture see it; undated
lives are never excluded, since there is nothing to judge them against and no
tray left to set them aside in. Drawn on the stage as Amendment 77 promised a
returning filter would be, not printed below the picture — `.map-stage`
became a flex column, `.map-picture` taking whatever `.map-timeline` below it
does not need, the same "no number here has to agree with any number there"
arrangement `.map-foot` already used. Native range inputs rather than a
hand-built control, so the keyboard and a screen reader answer to it for free.
Amendment 84 has the rest.

### Sessions 8 and 9 — finished 2026-08-29 (Amendment 73)

**Session 9's second half, App mode (§12), is built**: a hand-written worker
(`public/sw.js`) with the brief's four strategies, a web manifest with maskable
icons, honest offline degradation (an uncached saint says the network is needed
once — read off the failure, because `navigator.onLine` lies under
request-level offline), and Save as an eager precache that waits for the worker
to take the page. The worker runs under the entire e2e suite; `pwa.spec.js`
holds the offline claims, including the round trip through a wiped device.

**Session 8 re-scoped against reality, and one third survived:**

- **Export / Import (§11) — built.** One JSON file of the whole log,
  tombstones included; import is the store's own `merge`, so a stale backup
  cannot roll a device backwards. Controls live on About beside the privacy
  statement; round-tripped through a wiped IndexedDB in `chrome.spec.js`.
- **The rite × communion table (§9.2) — inapplicable to this build**, not
  deferred: it was written for the cross-church corpus (four communions, seven
  rites), which is archived at `archive/cross-church-2026-08`. This build's
  four churches share one rite and one communion, so the table is one cell.
  It revives if the cross-church registry does.
- **The timeline brush — still blocked on the corpus**, with the map's density
  work (Amendment 69): 7 of 742 saints carry a location, and the fades the
  brief describes need lifespans the corpus mostly lacks. Data, then code.

### Session 9 — the About page — done 2026-08-29 (Amendment 72)

Brief §8.4's editorial policy, written as substance: what the site claims and
refuses to claim, the three attestation states and why collapsing two of them
would flatter the better-digitised church, dates as intervals, the calendars per
church, the sourcing, and the coverage.

**Nothing on it states a number.** `loadManifestMeta()` finally has its caller,
and `by_source` was added to the meta so the page can name the publications the
corpus *actually cites* rather than the registry's prose about daily calendars —
121 of the 127 Romanian attestations cite doxologia.ro while the registry note
names Basilica, and both statements are true about different things.

**No LICENSE file exists**, so the page does not claim one — see Outstanding.

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

- **Saints for the days past 28 September.** 600–1,100 folders. Dedupe on the
  *feast date*, never the name. Pipeline under `.tmp/` (`week_saints.py`
  harvests; each day gets a typed `dNNNN_decisions.py`); a day is roughly a
  sitting — though 21 September was light, being the Nativity of the
  Theotokos: a Great Feast day is mostly feast and icons, and held only four
  people across both calendars.
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
- CRLF warnings were **not** noise: this desk's global `core.autocrlf=true`
  rewrote 76 batch files during a stash/pop and a unit test caught the `
`
  inside a heading. Repo-local `core.autocrlf=false` plus `.gitattributes`
  (`* text=auto eol=lf`) now pin every clone; the blobs were always LF.

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
- **The uncertainty curve now has a shipping consumer** — the map's halos
  (2026-08-29). Date bars and timeline dissolves are still the unspent two.
- **There is no LICENSE file.** Brief §8.4 lists the licence among the things
  the About page must state, and the page states everything else on that list.
  It does not invent one: the *images* carry their own licences per file
  (`lib/licence.js`), and that is said on each saint's page, but the site's own
  terms — the code, and the lives, which are the author's paraphrase — are
  unstated anywhere in the repository. **A rights question, so the author's.**
- **The manifest budget line above says 864 KB**, which predates the shipping
  manifest: `npm run build:manifest` reports **328 KB gzipped projected at
  5,000** today. Left as the author wrote it pending a re-check of which
  projection is meant.

## Provenance

`f0ddb12`, `1b1d8a1` and `2ebe682` carry one set of eyes rather than two —
pushed unverified at the author's instruction. CI is green on all three.
"Verified by both sessions", where it appears in commits of 2026-08-27/28, meant
two sets of eyes on the claim and one set of hands on the gate; it never meant
anything was run twice, and nothing from 2026-08-29 onward carries it.
