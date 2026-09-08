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

## Next

`PLAN.md`'s numbered list. **Collapse the type scale** while the contact sheet
makes it cheap, then **the overhaul, desktop first**. The comment rewrite
follows, three stylesheets first.
