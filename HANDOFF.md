# Handoff

**`CLAUDE.md`** is how to work and where things live. **`PLAN.md`** is what the
site should be, what is settled, and what is next. This file is state and what
is in flight — the last sitting or two, nothing older. `git log` has the rest.

---

## State

- **862 saints**, every one with a life; 1,221 attestations; 126 undated; 130
  icons; 430 hymns. 97 saints located, ten with a dated track. Corpus reaches
  28 September 2026.
- **144 day records**, 23 Aug 2026 – 13 Jan 2027.
- Locale packs complete. Offices, attestation titles and lifespan displays all
  read in the reader's language.
- App shells exist (`android/`, `ios/`, Capacitor 8); **no binary built** —
  `docs/APP.md`.
- 342 unit tests in ~2 s; 902 browser tests in ~17 min; accessibility 100, FCP
  1356–1376 ms against the 1500 floor.

## The last sitting

Two sittings, and the second reviewed the first.

**The documentation was cut from 15,776 lines to about 700.** `DESIGN.md`
(1,786) and `SESSIONS.md` (11,619) are deleted; `CLAUDE.md` is an index;
`PLAN.md` is new and binding. The argument for deleting `SESSIONS.md` holds:
`git log` already held 8,621 lines of reasoning across 430 commits and the file
was a hand-maintained second copy of it.

**Design tokens, and a test that enforces them.** 17 durations → 5 named steps,
7 easings → 5, every `font-size` through a `--text-*` token.
`src/styles/tokens.css` and `src/lib/motion.js`'s `DUR`/`EASE` are two halves of
one scale and `tests/design-tokens.test.mjs` holds them together. Type was a
faithful rename — verified against git, against computed `font-size` on both
trees, and by 24 pixel-identical contact-sheet tiles. **Motion was not**: eight
durations moved by up to 70 ms when they were folded onto the scale, which is a
real change to how the site feels and was worth saying out loud.

**`scripts/contact-sheet.mjs`.** Every route × width × theme × language as one
labelled grid, against `npm run dev`, no build. `--still` makes it a pixel-diff
tool: reduced motion, fixed shuffle seed, webfont refused.

**A dev-server fix in `vite.config.js`.** `/saints/<slug>` was 404ing in dev; a
navigation falls through to the app now, a missing asset still 404s.

### What the review of it found

- **A live regression, shipping green.** The consolidation deleted `--dur-slot`
  and `--dur-theme` from `tokens.css` and left **thirteen** call sites reading
  them, across `base.css`, `calendar.css`, `index.css`, `picker.js` and
  `saint.js`. An undefined custom property inside a `transition` shorthand
  invalidates the whole declaration, so the theme cross-fade and every slot
  movement had silently stopped happening — and 902 browser tests passed over
  it. Both now read `--dur-settle`, and a new test fails on any `var()` reading
  a property nothing defines. Backed out and confirmed to fail first.
- **`--space-5` has never existed.** `.carousel { margin-top: var(--space-5) }`
  has computed to 0 since the carousel came back. Written out as `0` rather
  than guessed at; it is item 10 in `PLAN.md`.
- **Two raw curves and a raw duration lived in JS**, where the CSS-only test
  could not see them. `lib/motion.js` now exports `EASE` as well as `DUR`, the
  die's symmetric curve is `--ease-turn`, and the test fails on a
  `cubic-bezier` or a numeric `duration:` anywhere in `src/*.js`.
- **The repointing was mechanical and cost meaning.** `DESIGN.md §5c` became
  `PLAN.md`, and in a dozen places the section *was* the reference — leaving
  citations that are now merely vague ("since PLAN.md") and about five that are
  false, naming content `PLAN.md` does not contain. Repaired. Refs to deleted
  documents also survived in `index.html`, `base.css` and
  `schema/saint.schema.json`, which the "152 references repointed" count missed.
- **Binding content was lost with the history.** DESIGN.md §1 (the icon panel
  and the martyrology register — the material argument the whole visual language
  rests on) and §6b (the softness curve, its three constants and the open-bound
  rule) had no home in `PLAN.md`; a distilled layout section did not exist at
  all, three days before a visual overhaul. All three are now `PLAN.md` sections
  2 and 4. Two traps also went missing from `CLAUDE.md`'s list of sixteen
  (`loopScroll` measurability, the zoom-press loop) and are back.
- **The 68% figure does not survive its own instrument.** `comment-kind.py`
  counts a whole block as history when any one line in it carries a cue. At line
  level the same regex reads **9%**, and only **59 comment lines of 16,622** sit
  in blocks that are *mostly* history. `src` really is 34,533 lines at 48%
  comment — that part is solid — but there is almost no narrative to lift out
  wholesale. `PLAN.md` item 6 is rewritten accordingly, and moved after the
  overhaul.

### And then the map's tests, which were the third thing on the list

`map.spec.js` held 40 of the 61 failures this desk has ever seen, and
`PLAN.md`'s explanation — that it re-asserts arithmetic `lib/map-*` already
exposes purely — was wrong. Those modules already carry 1,438 lines of unit
tests against 1,561 of source.

It was a wait. The file was 18% of the suite's tests and **54% of its wall
time**: 16.8 s a test against 2.9 s everywhere else, under a 30 s timeout. Its
tests were not intermittently wrong, they were intermittently too slow.
`waitUntil: 'networkidle'` was sitting through `warmTerrainTiles` pulling the
whole 158-file, 6 MB tile grid — **2,648 ms against 192 ms** for the
`data-land="ok"` wait that 51 of the 76 already made on the next line.

Measured against the unmodified tree, same desk, same command: **15 failures in
4.7 min → 2 in 3.5 min**, and the 3.5 covers both projects where the 4.7 covered
one. Three named openers now say which readiness a test means, `saveData` stops
six workers pulling the grid through one preview server, the zoom climb bursts
rather than settling twenty-five separate flights, and the file gets 60 s a test
because that is what its subject honestly costs.

**Two still fail, and fail identically at `HEAD`** — `the map opens on the
coarse coastline…` and `the land keeps its own ink when a terrain tile never
arrives`. Both concern the terrain loaders, both pass run alone, and the second
now fails on its own assertion rather than the clock, which makes it the better
one to start from.

## 2026-09-09: the type scale, and two figures that were wrong

**The type scale is nine steps, from fourteen.** 12.5 and 13.5 into 13, 14 and
16 into 15. Verified with the sheet rather than by eye: all 48 tiles differ,
and both documented risks were checked directly — the nav row moved *down* half
a pixel and fits at 760 and 860 px in Romanian, Serbian and Greek; All Saints'
`nowrap` chips took the +1 px and still sit inside 560 px in the widest pack.

**The visual loop is measured for the first time: 48 tiles in 80 s** — 2 widths
× 2 themes × 2 languages × 6 routes — against ~40 s for a *single* surface
through a rebuilt preview before. `scripts/tile-diff.mjs` is new and is the
other half of `--still`: per-tile differing-pixel counts against a kept
baseline, plus a mask showing where. The sheet also stopped using
`waitUntil: 'networkidle'` and now turns the terrain warm-up off, for the same
reason the map's tests did.

**There is no spacing sweep to do.** `PLAN.md` said "412 raw px values still
live outside `tokens.css` — the next sweep after type". Measured: **310
declarations already go through `var(--space-*)`**, the component sheets hold
254 raw px values rather than 412 (the larger number counted comments and
`tokens.css`), and only **53** of those sit on a spacing property, 4 of them on
the scale. The rest is `border` (45), `height` (30), `width` (18) — and the two
commonest values in the whole set are 1px (74) and 2px (43), which are
hairlines. Spacing is ~97% governed already. Colour is the one thing left
untested, and it is three hex values.

**A test that never measured its claim.** `the way in sits on the last faded
line` asserted `Math.abs(belowTailBottom) < line / 2`. Correct, the pill sits
half a line *below* the tail's bottom (+14.03); a line too high it sits half a
line *above* (−14.02). Under an absolute value both are 14, so the test was
decided by which side of 14.025 a sub-pixel reflow fell on — it passed by a
hair for weeks and failed by six thousandths of a pixel here, with the picture
visibly correct. It is signed now, and moving the pill up a line fails it,
which the old version passed.

### And the last of the flake

With the map's tests fixed, `index-carousel.spec.js` was the whole of what
remained. `275f850` went green on CI with **1 flaky** and `5ddb59c` went red,
and both were the same file: `a carousel card is sized by the window height`
flaked on each, and `the carousel drifts on its own` failed outright on the
second.

Neither is flaky alone — **24 of 24** with `--repeat-each=6`. Both were spending
their budget on something other than what they measure. The drift test polls
`scrollLeft` for 4 s, and All Saints packs all 862 captions in one blocking
task before it can paint (PLAN item 7), which under six workers is most of
those 4 s; it now waits for the row to be wider than its viewport *before*
timing the drift, so the 4 s measures the drift. The sizing test waited two
`requestAnimationFrame`s after a viewport change; it polls now, which tolerates
a slower repack and still fails if the card never narrows.

**That second one is not fixed, and I claimed it was.** It flaked again on
`b9d6ba7` at `mobile-360` — three consecutive CI runs now, twice at desktop and
once at mobile — while passing 16 of 16 here with `--repeat-each=8`. Two
explanations were written into the code and both are false: the cell's width
does *not* move after first paint, so nothing is being read mid-pack
(`scratchpad/settle-probe.mjs` reads 300 twelve times running in both project
viewports), and it passes under `COLD_FACE=1`, so the runner's DejaVu is not it.
The invented reasoning has been taken back out and the comment now says the
cause is unknown. **CI is the only place it reproduces**, which is the next
thing to work with — the `flaky` line, not a local run.

**The drift test's new wait is an instrument reading on item 7.** When the pack
goes lazy it should return instantly; if it ever starts timing out, the pack
has regressed.

## The pattern worth acting on, and what it implies

Fourteen problems were found on 2026-09-09. Two were code defects and one was a
broken test; **eleven were prose asserting a quantity or a mechanism nobody had
measured** — 68% that is 9%, 412 that is ~4, three raw colours that are zero,
"nothing touches behaviour" while eight durations moved, "the one shadow on the
site" which is five and names one that has never existed. Two of the eleven
were written by the session that then found them, so care is not the remedy.

**One fact explains it: no test in this repo reads a document.** Five name one
in a comment; none opens one. Exactly one used to — `DESIGN.md quotes the
ratios the tokens actually produce`, which held the document's printed contrast
figures against the computed values — and it was deleted in `4141faa`, the doc
reorganisation. The one mechanism holding prose to reality was removed, and the
prose drifted immediately. `PLAN.md` says it is binding and that the code is
wrong where they disagree, and nothing can tell when they disagree.

**The rule that falls out.** A comment may state a **constraint**, because a
constraint is checkable against the code in front of you. A **quantity** or a
**mechanism** needs a test pinning it, or it says plainly that it is
unverified. Every one of the eleven was a quantity or a mechanism written as
fact.

## Both tests exist now, and the second one worked immediately

`tests/citations.test.mjs` (5 checks) and `tests/plan.test.mjs` (6). Each was
backed out against a planted violation of every kind it claims to catch, and
each hole that back-out found was closed: the shadow inventory let a rule
written on one line straight through, the same escape the token test's
declaration reader once had.

**The PLAN test disagreed with PLAN.md on its first run, and PLAN.md was
wrong.** The shadow inventory written into it a day earlier named `.chrome`,
`.month-grid button`, `.hero-more`, `.index-name:hover` and `.index-desc`. The
count and the values were right and **every selector was wrong** — the grep
behind them required a selector at column 0, so an indented rule inside a media
query fell through to whatever unindented one came before. The five are
`.church-panel`, `.reckoning-pop`, `.fast-bubble`, and the stuck index bar and
its filter drop.

Which turns the finding into something better than a list of exceptions: **every
cast shadow on the site is on something over the page** — a panel that flies, a
popover, a bubble, a bar that has left the flow — and none is on anything
sitting in it. The panel rule holds exactly as written, and the principle is
sharper than "no drop shadows": a shadow says *this is above the page*; a card
is in it and takes its depth from the field.

Re-derived rather than trusted: **353 unit tests in 2 s**, **902 browser in
4.5 min** with one failure — `random deals an order, and holds it still under
the reader`, which the old handoff already recorded at 3 in ~39.

## Next

1. **The overhaul, desktop first** — section 4 of `PLAN.md` is the brief, and
   the loop is `contact-sheet --still` → `tile-diff snapshot` → change →
   `--still` → `compare`, 80 s a pass over 48 tiles.

   **The comment rewrite rides inside it, per file.** The overhaul has to open
   `calendar.css`, `index.css` and `base.css` and edit them anyway; clearing
   each file's narrative in the same pass costs one visit instead of two, which
   is item 6's own objection to doing it first. Pixel-identical tiles prove no
   declaration moved.

## The carousel flakes, found

Both, with causes, after a day of guessing badly at them. The thing that worked
was **`Emulation.setCPUThrottlingRate`** — a two-core runner is something this
desk can *be*, and neither flake needs CI to reproduce once it is.

- **`hover()` cannot act on the row this test proves is moving.** Playwright
  waits for a stable bounding box; a drift never has one. At 1x the step is
  ~0.4 px a frame and rounds to equal often enough to pass, which is why this
  desk never saw it; at 20x it times out exactly as `024897a` did on CI.
  `mouse.move` to the track's own box has no actionability gate.
- **A resized cell reports 0 before it reports its width.** CLAUDE.md's seventh
  trap, and the poll I added for "narrower than before" was satisfied by that 0,
  exited, and then failed the floor of 150. At 1x the real width lands in 97 ms
  and the zero is never seen; at 6x, 20x and 50x it is the first reading every
  time, with the real 164 arriving at 1.1 s, 3.5 s and 4.5 s.

`scratchpad/hover-probe.mjs`, `drift-throttled.mjs` and `resize-probe.mjs` are
the three probes; each takes a rate so the difference can be seen rather than
argued.

### And a regression the same day's optimisation had introduced

Two map tests were still flaking on CI (`the map can zoom to its ceiling`,
`panning past the desktop ceiling`), and the cause was the burst climb put into
`zoomedToCeiling` that morning: ten presses to a settle instead of a settle per
press, on the argument that arriving is only setup.

**It arrives on a slow machine and not on a fast one.** A press sent mid-flight
re-targets from wherever the view has reached, so quick frames mean each press
re-aims from a view that has barely moved. Measured: at 1x, 120 bursted presses
reached 294x of an 853x ceiling; at 6x and 20x, twenty presses reached it. It
survived every full suite because six parallel workers make this desk slow
enough — run alone it failed **3 of 8**, which is the inverse of every other
flake here.

Reverted to a settle per press. That now reaches the ceiling in 15 presses at
1x, 6x and 20x alike, taking 7.3 s, 13 s and 21.7 s — all inside the file's own
60 s budget, which had already answered the timeout the burst was invented for.
**The seconds it saved were not worth a helper that only works under load.**

**Also: `024897a` failed on CI and nobody read the run.** It was pushed and the
next task started immediately, which is the one thing the protocol says not to
do — so `main` sat red and undeployed until the next green push. The failure was
the drift test above.
