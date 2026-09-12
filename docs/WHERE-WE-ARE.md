# Where this is, 2026-09-11

Written to survive a move between clients. Everything durable is already in
the repo; this is the index to it.

## State

`main` green at `1c810a2`, tree clean, deployed. Corpus 862 folders.
Nothing running: no background agents, no scheduled jobs.

Two commits sit on top of it locally as of 2026-09-11: this document, and the
name-strip fix below.

## What just landed

**The desktop Daily rebuild** — 16 commits, `31259c4`…`b1b2a6d`. The page is
a left reading column and a right notched bubble: chrome controls in its head,
the month grid, readings, hymns, name days in two columns. Left column carries
the nav, the date between two half-cross marks, the hero in a mount, and the
register. The record is `docs/daily-desktop-visuals.md` — **§10 is the binding
part**, and §§10.1–10.25 carry every decision, its reasoning, and the four that
were later reversed by the author.

**Seven follow-ups** — 13 commits, `7784d8e`…`b1b2a6d`. Theme fade fixed (91
painted things snapped while 16 eased; fifteen colour tokens now ease on
`<html>`). Hero takes the reference's crop, 3:2 at `50% 34%`. Picture is 5/12
of what it shares with the words, so it grows with the window. List face gone.
"Also today". Name days in two columns. AGIOS wordmark, outlined from GFS
Nicefore, identical rect on all six routes.

**The corpus protocol** — `1c810a2`. `docs/CORPUS.md` plus `day-coverage.mjs`,
`day-candidates.mjs`, `draft-saint.mjs` (the only writer, dry-run by default,
`--undo <batch>`), `corpus-gate.mjs`, `corpus-index.mjs`. Expansion was started
and stopped before it wrote anything.

## The name strip, 2026-09-11

**Eighteen printed name forms began with a rank**, not the fourteen the gate
counted — the four it missed were holes in its own vocabulary, including a
Romanian word spelled with the other Romanian t. All eighteen are names now and
nothing else in the 1,166 printed forms moved. Four rows remain by design and
print their reason: three companies whose rank is their name, and Hosius of
Córdoba, whose Greek name is the word for *Venerable*. `HANDOFF.md` has the
whole of it, `docs/CORPUS.md` §3 the protocol side.

Found on the way: **`corpus-gate.mjs`'s `npm test` step had never run** on any
tree, clean or dirty, since it was written.

## Open, for the author

- **The site is named "Daily Dox"** (`strings.js:45`, the wordmark's accessible
  name, the export format) over a mark that now reads AGIOS. Brand call.
- **"Also today" is desktop-only**; mobile still says "Also Commemorated" in all
  five packs. Overtaken by the rebuild — the Daily page now prints no heading at
  all and both keys are orphaned. Going to the mockup, below.
- ~~**The register's expanded face** and its mount~~ — closed 2026-09-12: the
  register is deleted.
- **Above a 1983px window** the hero's 40rem ceiling binds and the 5:7
  proportion falls to 0.690 — the top 2% of the range. Recorded, not tuned.
- **The sidebar's foot**: 235px of empty field on a light day, 661px on an
  empty one. Never decided.
- `index.css`/`saint.css` off the first-paint path measures ~72.3 → 54.3 kB
  and is unspent; it needs the router to await the view's sheet. Less urgent
  since 2026-09-12: deleting `calendar.css` took the entry stylesheet from 438
  bytes under the ceiling to 20,559.

### To do, from the Daily rebuild (2026-09-12)

Found by checking the 58 deleted test names against the page that replaced them
— `scratchpad/daily-feature-audit.md` has the evidence for each.

**Decided by the author, not yet done:**

- [ ] **The full-screen calendar comes off phones.** It is a desktop control and
      was gated by width until the rebuild; it is now visible at 360px. Restore
      the gate.
- [ ] **A phone is Gregorian only.** Stronger than what the old page did — that
      one showed a phone the reckoning in force without offering the choice.
      The instruction is that a phone should never have been anything but
      Gregorian, so the control comes off *and* the reckoning is fixed there,
      rather than following the church.

**Going to the mockup, next session:**

- [ ] The day's saints lost the ordering rule that ran tallest-picture-first and
      the imageless last. About 130 of 862 saints have an icon, so this is what
      kept a day from reading as a wall of glyph mats.
- [ ] The "Also today" / "Also commemorated" heading, gone with its strings left
      orphaned in all five packs.

**Raised, not yet decided:**

- [ ] **The keys no longer step the day.** `daily-picker.spec.js` had "a day is
      one click, and the keys step it from anywhere"; no arrow-key handling
      survives anywhere in the Daily page.
- [ ] **52 tab stops in the sidebar**, 31 of them the month's cells, at every
      width — and on a phone the sidebar is first in the flow, so all 52 come
      before the first saint. The old rail was one stop with arrows inside it.
      A roving tabindex would fix this and the item above it together.

## Known-not-ours

`index-grid.spec.js:1539` under `COLD_FACE`; `map.spec.js:3580` and
`index-controls.spec.js:634` (All Saints load flakes, pass alone); local
Lighthouse FCP, which CI's own run passes.
