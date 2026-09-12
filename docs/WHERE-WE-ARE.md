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

The method, from the author: build it on the live site with `npm run dev`, no
standalone mockup; show options as override CSS in `mockups/` through
`contact-sheet.mjs --css=a.css,b.css`; open the page and press things before
calling it done.

---

## Decided, not yet done

**Empty, 2026-09-12.** All six items were done in one sitting and are in
`git log`. One of them changed what the site does rather than only where a
number is written, so it is named here once and then this section is a
heading again:

**A phone is Gregorian throughout, fasts included.** Below 1024 px
`lib/church.js`'s `calendarFor` answers `gregorian` whatever church is
chosen, so an Old Calendar reader on a phone is shown the Dormition Fast on
1–14 August where the desk shows them 14–27. That is the ruling as given and
re-confirmed when the consequence was put to the author on 2026-09-12; it is
one branch to reverse if it ever reads wrong on the page.

## Raised, nobody has ruled

- [ ] **52 tab stops in the sidebar**, 31 of them the month's cells, at every
      width — and on a phone the sidebar is first in the flow, so all 52 come
      before the first saint. Invisible to touch; it bites a keyboard and, more
      sharply, a screen reader, where "next element" walks the same list. A
      roving tabindex is the fix. **`views/daily/sidebar.js` argues both sides
      of this in its own comments** — line 176 says "Spans, not buttons" and
      line 214 says "A button, not a span"; the code uses buttons, so the first
      comment is a leftover arguing against what the file does.
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
- [ ] **`docs/daily-desktop-visuals.md` is 2,000 lines describing a page that no
      longer exists** — `calendar.css`, `picker.js`, `panel.js` and the register
      are all deleted, and every line number in it is dead. Its palette section
      is a third copy of values that live in `tokens.css` and `PLAN.md`, and is
      already stale. The redesign should either replace it or reduce it.

## Recorded, deliberately not done

- **Above a 1983 px window** the hero's 40rem ceiling binds and the 5:7
  proportion falls to 0.690 — the top 2% of the range. Recorded, not tuned.
- **`index.css`/`saint.css` off the first-paint path** measures ~72.3 → 54.3 kB
  and is unspent; it needs the router to await the view's sheet rather than a
  bare dynamic import, and that is the boot path. Less urgent since the Daily
  rebuild deleted `calendar.css` and left ~20 kB of headroom under the ceiling.
- **41 hymns cite Orloff (1899) or Hapgood (1906).** The other 389 renderings
  have no published English in either book — checked on 2026-09-12, not assumed.
  Someone with the physical books could still improve on much of this.

## Known-not-ours

`index-grid.spec.js:1539` under `COLD_FACE`; `map.spec.js:3580` and
`index-controls.spec.js:634` (All Saints load flakes, pass alone); local
Lighthouse FCP, which CI's own run passes.
