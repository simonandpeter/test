# The to-do list, 2026-09-12

**This file is the open work and nothing else.** State and what is in flight
are `HANDOFF.md`; how to work here is `CLAUDE.md`; what the site should be is
`PLAN.md`. It duplicated `HANDOFF.md` for a day and the duplicate was cut.

An item leaves this file when it is done, not when it is discussed.

---

## The job that was never started

**The Daily page's desktop layout is to be redesigned.** The author was going to
describe the new design; the sitting went into cleanup instead and the design
was never given. Four fixes were to ride along with it, and two of them are
still here (the ordering rule and the missing heading, below).

The method, from the author: build it on the live site with `npm run dev`, no
standalone mockup; show options as override CSS in `mockups/` through
`contact-sheet.mjs --css=a.css,b.css`; open the page and press things before
calling it done.

---

## Decided, not yet done

- [ ] **The full-screen calendar comes off phones.** A desktop control, gated by
      width until the rebuild, now visible at 360 px. Restore the gate.
- [ ] **A phone is Gregorian only.** Stronger than the old page, which showed a
      phone the reckoning in force without offering the choice: the control
      comes off *and* the reckoning is fixed there, rather than following the
      church.
- [ ] **The day's saints order pictures first, imageless last.** The rule was
      lost in the rebuild. About 130 of 862 saints have an icon, so this is what
      kept a day from reading as a wall of glyph mats.
- [ ] **Something replaces the missing "Also today" heading.** The Daily page
      now prints no heading at all and both string keys are orphaned in all five
      packs. Decide what stands there, or delete the keys.
- [ ] **One-off layout widths move into `PLAN.md`** (author, 2026-09-12).
      `PLAN.md` §3 currently exempts `width` from the token rule. The argument
      for reversing it: 340 px buried in 12,000 lines of CSS is invisible, and
      the same number as a table row is something you can question. Values live
      in PLAN; mechanisms stay in a comment beside the code they constrain,
      which is settled and not to be re-proposed.
- [ ] **`PLAN.md` §7 item 2 is wrong and needs rewriting.** It describes All
      Saints blocking ~1,200 ms on a caption pack that was fixed on 2026-09-09,
      and names a cause that measurement disproved. `HANDOFF.md` has what
      actually costs the boot.

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
