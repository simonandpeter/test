# The to-do list, 2026-09-12

**This file is the open work and nothing else.** State and what is in flight
are `HANDOFF.md`; how to work here is `CLAUDE.md`; what the site should be is
`PLAN.md`. It duplicated `HANDOFF.md` for a day and the duplicate was cut.

An item leaves this file when it is done, not when it is discussed.

---

## The job that was never started

**The Daily page's desktop layout is to be redesigned.** The author was going to
describe the new design; the sitting went into cleanup instead and the design
was never given. Four fixes were to ride along with it and all four have since
been made on their own, so what is left here is the design and nothing else.

**A rebuild was made without it on 2026-09-12 and reverted on 2026-09-15**
(`eae39cd`). It replaced the week rail with a standing month calendar and the
register with tiles, at both widths; the author was unhappy with both faces of
it. The page is back to `f31520a` and this item is still the next thing to do,
now from a known baseline rather than from an unbriefed one.

The method, from the author: build it on the live site with `npm run dev`, no
standalone mockup; show options as override CSS in `mockups/` through
`contact-sheet.mjs --css=a.css,b.css`; open the page and press things before
calling it done.

---

## Decided, not yet done

**`docs/STRUCTURE.md`, the map of a page** (author, 2026-09-15: "there's a lot
of context that has to be rederived when working on a particular page layout").
`CLAUDE.md`'s "Where things live" already points at it, marked as not written.

What it is: **one file, one section per route, about thirty lines each** — the
files, the attributes and custom properties that drive the layout, the box
chain (root → `main.chrome` → `#view` → whatever the route puts inside it), the
breakpoints, and the specs that cover it, with links out to
`docs/SRC-DECISIONS.md` for the why. A map, not an explanation: the reasoning
is already written per file and does not want a second copy.

Why one file and not six: this repo's documents rot by being long and believed.
`docs/daily-desktop-visuals.md` is the per-page document, for one page, at
2,000 lines — and its line numbers have not been re-checked and its palette
section is a third stale copy of `tokens.css` (below). `CLAUDE.md` pointed at
`*.notes.md` files that have never existed in this repo for six days. Six files
is six things to keep true; one file is one, and a session reads its own
section.

**Gate it like everything else here**: a unit test asserting it names every
route in `main.js`'s own table, and that every path it cites exists —
`tests/citations.test.mjs` is that instrument already and does not search
`*.md`.

**Not before the Daily redesign lands**, or the Daily section is written twice.
The cost it is meant to buy back, measured on 2026-09-15: about twenty minutes
assembling `data-route` → `data-fills-window` → `main.chrome` → `#view` →
`.face-stage` → `.cal`, and `--side-w`/`--day-cols`, out of four files'
comments before one rule could be changed.

**The rest of this section was emptied 2026-09-12.** All six items were done in
one sitting and are in `git log`. One of them changed what the site does rather than only where a
number is written, so it is named here once and then this section is a
heading again:

**A phone is Gregorian throughout, fasts included.** Below 1024 px
`lib/church.js`'s `calendarFor` answers `gregorian` whatever church is
chosen, so an Old Calendar reader on a phone is shown the Dormition Fast on
1–14 August where the desk shows them 14–27. That is the ruling as given and
re-confirmed when the consequence was put to the author on 2026-09-12; it is
one branch to reverse if it ever reads wrong on the page.

## Raised, nobody has ruled

- [ ] **The month grid is 35 of the 82 tab stops on a desk.** Measured on the
      restored page, 2026-09-15: at 1280 px 35 of 82 focusable elements are the
      month's day cells; **at 360 px it contributes 0**, because the phone gets
      the week rail instead and the rail's cells already carry `tabindex="-1"`
      (`picker.js:193`). So the revert closed the phone half of this on its
      own — it used to be 52 stops before the first saint — and the desk half
      stands. Invisible to touch; it bites a keyboard and, more sharply, a
      screen reader, where "next element" walks the same list. A roving
      tabindex is the fix, and `picker.js:968` is the line that omits it.
- [ ] **The shelf-swipe test still flakes about 1 run in 8**, and the product
      question behind it is now answered: the author ruled on 2026-09-12 that
      the swipe behaves correctly as it stands. So the page is right and **the
      test is wrong** — it asserts a gesture it cannot reliably perform, and
      should drive the drag at a fixed velocity instead of eight `mouse.move`
      steps. Until then CI retries hide it, which is how a flake here once
      masked a 16/16 regression.
- [ ] **`PLAN.md`'s colour table is checked in one direction only.** Type,
      durations and easings are checked both ways by `tests/plan.test.mjs`, so a
      token added to the code and not written down fails. Colour is not: a new
      colour token in `tokens.css` that never reaches the table passes today.
      A hole in the single-source-of-truth the table exists to be.
- [ ] **`docs/daily-desktop-visuals.md` describes the live page again.** It was
      listed here as 2,000 lines about a page that no longer existed;
      `calendar.css`, `picker.js` and `panel.js` are all back, so that is no
      longer true and the document is load-bearing rather than dead. Its line
      numbers have not been re-checked. Its palette section is still a third
      copy of values that live in `tokens.css` and `PLAN.md`, and still stale —
      that part of the complaint survives.

- [ ] **The Daily page's layout hangs off a root attribute, 82 rules of it.**
      `html[data-route~='calendar'] .hero-media img` is the page deciding what
      one view's own box looks like, and on 2026-09-15 that was a bug the
      author could see: a navigation flipped the attribute before the slide,
      `--side-w` went with it, `--day-cols` lost its second column, and the
      collapsed grid is what slid out. The repair held the attribute for the
      length of the swap (`data-route` is a set now, `[data-route~=]`), which
      is a convention holding up a coupling rather than the coupling going
      away — the next thing to put two faces on screen at once meets it again.
      Scoping the *inner* rules to `.cal`, the view's own root, and leaving
      only `main.chrome`, `.chrome-bar` and `header.chrome` on the root would
      make the faces independent by construction. It also shortens 82
      selectors by ~20 bytes each: **~1.6 kB off the entry sheet**, which is
      the item below paid for. The risk is specificity — `.cal .hero-figure`
      is (0,2,0) against (0,2,1) — so it is a read of each block, not a sweep
      (trap 18).
- [ ] **The entry stylesheet has 57 bytes of headroom** (measured 2026-09-15,
      73,343 of a 73,400 ceiling). The next CSS anyone writes trips
      `npm run test:lighthouse`, and it presents as four routes failing FCP
      rather than as a file being too big. Two ways out and they are the same
      list: the item above, or the ~18 kB in *Recorded* below.
- [ ] **Reading the byte line costs eight minutes and four red lines that mean
      nothing here.** `test:lighthouse` fails FCP on all four routes on this
      desk — ~1,780 ms against a 1,500 floor, and *identically on an
      unmodified tree*, which is how it was told apart from a regression on
      2026-09-15. The number a session actually needs from it is the entry
      sheet's size, which is a build and a `stat`. A flag that checks the sheet
      and skips the four Lighthouse passes would make the gate usable locally
      instead of something to be compared against a stash every time.
- [ ] **A stray server is a detour every session pays once.** 4173 and 5173
      were held by processes from an earlier sitting on 2026-09-15: Playwright
      refuses to start (`reuseExistingServer: false`) with no hint as to who
      holds the port, and `contact-sheet.mjs` quietly shoots the wrong tree,
      which CLAUDE.md records as having already happened. `scripts/state.sh`
      is where "what is true here" is answered; three lines reporting who is
      listening on 4173/5173/5174 would fit it.
- [ ] **Nothing ties a test's name to the prose about it.** Renaming one e2e
      test on 2026-09-15 meant hand-editing a heading in `E2E-DECISIONS.md`
      and references in `PROBES.md` and `SRC-DECISIONS.md`;
      `tests/citations.test.mjs` checks that a named *file* exists and not that
      a named *test* does, so a stale heading is found by grep or not at all.
      Asserting that every `### …` heading in `E2E-DECISIONS.md` resolves to a
      `test('…')` in `e2e/` is the instrument `plan.test.mjs` already is, in
      two seconds, at the source.

## Recorded, deliberately not done

- **Above a 1983 px window** the hero's 40rem ceiling binds and the 5:7
  proportion falls to 0.690 — the top 2% of the range. Recorded, not tuned.
- **`index.css`/`saint.css` off the first-paint path** measures ~72.3 → 54.3 kB
  and is unspent; it needs the router to await the view's sheet rather than a
  bare dynamic import, and that is the boot path. **It is urgent again**: the
  headroom this paragraph called ~20 kB was the Daily rebuild's, and the
  2026-09-15 revert put `calendar.css` back. 57 bytes, and the item above.
- **41 hymns cite Orloff (1899) or Hapgood (1906).** The other 389 renderings
  have no published English in either book — checked on 2026-09-12, not assumed.
  Someone with the physical books could still improve on much of this.

## Known-not-ours

`index-grid.spec.js:1539` under `COLD_FACE`; `map.spec.js:3580` and
`index-controls.spec.js:634` (All Saints load flakes, pass alone); local
Lighthouse FCP, which CI's own run passes.

**Before adding to that list, read `docs/PROBES.md`.** Three of the four names
above are "passes alone, fails under load", which is the shape
`throttle-probe.mjs` exists to settle — it turned three such flakes from a day
of guessing into minutes on 2026-09-09, and two of the explanations it
disproved had already been written into the test files as fact. The shelf-swipe
flake above is the gesture half of the same question, and `nav-swipe.mjs` and
`fling-write.mjs` are where a swipe that will not reproduce goes.
