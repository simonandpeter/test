# The four probes

Four measurement scripts that used to live in `scratchpad/` and are now gates
in `scripts/`. Each was written to answer one question on one afternoon, each
answered it, and each then sat in a folder nobody reads while the number it
established was copied into a source comment and left to rot. Promoting them
is the difference between a comment that says 525 kB and a run that says so.

They are not a suite. **Reach for one when this file says to**, and not
otherwise — three of the four take a minute or more and one of them wants a
dev server.

| probe | question | runs in CI | command |
| --- | --- | --- | --- |
| `screenful-bytes.mjs` | what does a phone download to see the top of All Saints? | **yes** | `npm run test:screenful` |
| `throttle-probe.mjs` | does this still work when the machine is slow? | no | `npm run probe:throttle <which> [rates]` |
| `nav-swipe.mjs` | what does a hard swipe do to the phone's nav strip? | no | `npm run probe:nav-swipe <base> [runs]` |
| `fling-write.mjs` | does writing `scrollLeft` during a fling cancel it? | no | `npm run probe:fling-write` |

**Every one of them prints its measurement whether it passes or fails.** That
is `scripts/lighthouse-floor.mjs`'s rule and its header has the reason: a gate
that only speaks when it is angry teaches nobody where the margin went. If you
are reading a green run and learning nothing from it, something has been
broken.

**Only the first blocks CI, and the reason is the same for all three that do
not**: they measure milliseconds and gestures on a machine, and the machine is
the variable. Bytes on the wire are the same on the runner and on the desk.
The three CPU-and-gesture probes have thresholds and exit codes all the same,
because a number without a threshold is a number nobody checks — they are just
run by hand, at the moments named below.

---

## `screenful-bytes.mjs` — the byte budget

**The question.** At 360 px and DPR 1, what does the browser actually fetch to
draw the first screenful of All Saints, and how big is each picture's file
against the box it is drawn in?

```bash
npm run test:screenful                              # build, serve, both faces, gate
npm run preview                                     # or against a server you started
node scripts/screenful-bytes.mjs                    # both faces
node scripts/screenful-bytes.mjs carousel 360       # one face, one width
DPR=3 node scripts/screenful-bytes.mjs              # what a dense screen is handed
```

**The thresholds.**

- `PICTURE_BUDGET` = 320 kB of saint pictures per face.
- `OVERSIZE` = 2.5, the largest a picture's file may be against its box in
  linear pixels, density-corrected.

**Where those numbers came from.** Both of 2026-09-12's picture defects were
stated in the first: **525 kB** in the carousel to draw two cards (a 560x373
file inside a 150x100 box) and **1,005 kB** in the search face to draw two
rows (a 1200x1500, 765 kB original inside a 48x48 thumbnail). After the fix,
eleven runs on the author's desk put the carousel at 123-208 kB and the search
face at 24-42. 320 kB is 1.5x the worst of those and 0.6x the smaller defect —
it has to be both, or it goes red on an unlucky shuffle or fails to catch the
thing it exists for. The oversize factor is the same argument in shape rather
than in bytes: 1.87 is the worst a legitimate card can be (a 150 px column
taking the 280 px-capped `-card-sm.jpg`), the two defects were 3.7 and 25.

**The spread is the shuffle.** Which saints the opening screenful deals is not
fixed — trap 5 — and their files are not one size. That is why the budget
clears the unlucky deal rather than the median, and why a single run that
comes in at 208 kB is not a regression.

**The total is printed and not gated.** Most of the 1.6 MB is the manifest and
the entry bundle, which grow a saint at a time; a budget on that would go red
on the corpus. The JavaScript half already has a gate of its own in
`e2e/download-limiter.spec.js`.

**Reach for it** before and after anything that changes which image file the
markup names: `scripts/build-manifest.mjs`'s derivatives, `make_thumbs.py`'s
caps, `views/index/modes.js`'s `picture` choice, `views/index/grid.js`'s
`srcset` and `sizes`, or the packer's card widths. Also when adding a saint
whose icon is unusually large, if you want to know what it costs a phone.

**Do not reach for it** to measure JavaScript or CSS weight — that is
`download-limiter.spec.js` and `lighthouse-floor.mjs`'s `ENTRY_CSS_CEILING` —
and do not read its total as a page-weight budget.

---

## `throttle-probe.mjs` — does it survive a slow machine

**The question.** CLAUDE.md's tenth trap: CPU throttling reproduces what
parallel load cannot. Four subcommands, each a flake that once cost a day.

```bash
npm run preview                                  # it reads a build, not the dev server
npm run probe:throttle hover                     # the drifting carousel under a pointer
npm run probe:throttle resize                    # a repacked cell's width, and the 0 it passes through
npm run probe:throttle ceiling                   # the map's zoom climb
npm run probe:throttle pack 10                   # the longest blocking task on All Saints
npm run probe:throttle resize 1,6,20,50          # when you are hunting, not gating
PACK_MODE=search npm run probe:throttle pack 10  # the other face, controlled
```

**The thresholds**, one per subcommand:

| subcommand | threshold | where the number came from |
| --- | --- | --- |
| `hover` | the row still drifts >= 1 px in 1.2 s, at every rate | not a rate — the rate is what the throttle changes. The gate is that the carousel is *moving*, which is what `the row drifts under the pointer` in `index-carousel.spec.js` polls for. Measured 29 px at 1x, 33 at 6x, 9 at 20x. |
| `resize` | the cell settles >= 150 px, within 10 s | both are `index-carousel.spec.js`'s own numbers, so the probe goes red at the point that test is about to flake. 150 is its "never below the phone's own 150"; 10 s is the budget its comment names. |
| `ceiling` | the zoom climb reaches the ceiling | not a quantity. 15 presses at every rate; the count is printed and not gated. |
| `pack` | the longest task stays under 6,000 ms | a cliff detector, **not** a budget. Four runs on one afternoon gave 608, 1,258, 2,300 and 2,935 ms on an unchanged tree, so nothing under a second is resolvable here. |

**`hover() TIMED OUT` is not a failure.** It is this probe's oldest finding —
Playwright's `hover()` waits for a stable box and a drifting row never has one
— and the gate is deliberately on `mouse.move`, which has no actionability
gate, rather than on `hover()`.

**The default rates stop at 6x.** 20x is where the three 2026-09-09 flakes
fell out and it is still the rate to hunt at, but it is not a rate a threshold
survives on a busy desk: `resize` at 20x settled in 4.3 s once, in 16.2 s with
a dev server alongside, and twice never inside the probe's own 20 s loop. At
6x the same measurement came back 2.8-3.3 s, four times running.

**Why it is not in CI.** Everything above. A 20x throttle on a two-core runner
is not a controlled measurement, and the things it protects — the carousel
tests and the map's zoom climb — are already in the suite that does block.

**Reach for it** when an e2e test is flaky and you suspect CPU rather than
logic; before changing anything in the carousel's boot path or repack; when a
test passes alone and fails under `--workers=10`, which is CLAUDE.md's "run it
with `--repeat-each=6` alone first" arriving at its next step. `pack` is the
one to reach for before and after anything on All Saints' first-paint path.

**Do not reach for it** to compare two builds' performance — the spread across
identical builds is wider than most changes, and CLAUDE.md's rule is to stop
when the instrument cannot resolve the change. Do not use `pack` as a budget.

---

## `nav-swipe.mjs` — a hard fling on the phone nav strip

**The question.** `ui/nav-scroll.js` writes `scrollLeft` inside a live
gesture and has always known that costs something. This is the cost, traced
per frame through a real touch fling at mobile-360.

```bash
npm run dev                                          # the **dev** server, not the preview
npm run probe:nav-swipe http://localhost:5175 3
NAV_LOG=1 npm run probe:nav-swipe http://localhost:5175 1        # every write, stamped
NAV_EVERY_SCROLL=1 npm run probe:nav-swipe http://localhost:5175 2  # the control
```

**It needs `npm run dev`, and it checks that it got it.** The probe serves a
patched copy of one module through `page.route`, and in a production build
that module is inside the entry bundle, where the pattern matches nothing and
fails open (trap 13). A run against `npm run preview` reports the route never
fired and exits non-zero rather than measuring an uninstrumented page.
**`npm run dev` does not always land on 5173** — a dev server left from an
earlier sitting pushes it to 5175 — so read the port off the log and pass it.

**The thresholds.**

- `COAST_FLOOR_PX` = 100: how far the row must still coast after the finger
  leaves the glass.
- `MAX_BACK_JUMPS` = 0: backward steps after the lift.
- `OFF_MID_CEILING_PX` = 40: how far off the midline the row may settle.

**Where those came from.** `ui/nav-scroll.js`'s header records both sides of
the 2026-09-12 fix. Before: a 320 px swipe travelled 45 px of a 450 px range,
jumped backwards nine times, and came back to the page it left, three times in
three. After: the full 450 px, 225 px of coast, no backward step, and the ring
turned so the landed page stands in the middle of five. The floors sit between
those two states — 100 px is well above a fling that died at the lift and well
below the 225 the platform gives, so the gate reads the difference between a
fling and no fling rather than pinning Chromium's momentum curve.

**Two arms, and they control for different things.** This was misread once, so
it is written down: `NAV_BACKOUT=1` serves a `keepEndless` that returns
immediately, and the fling is then *perfect* — 225 px of coast, no backward
step. It is the control for the **ring turn** and nothing else; you see it in
the printed link order, which comes back untuned. The defect was never
`keepEndless` existing, it was `keepEndless` running on every scroll event, so
**`NAV_EVERY_SCROLL=1` is the control for the floors** — it drops the
once-per-gesture guard, and the run then reproduces the recorded defect to the
digit (45 px of travel, 8 and 9 backward jumps, 0 px of coast, settling back
on the page the swipe began from) and **inverts the exit code**, so a green
control is reported as a gate that does not bite.

**Why it is not in CI.** It needs a dev server rather than the build every
other step uses, and a touch fling's momentum is a function of frame rate,
which on a shared runner is not a controlled quantity. The behaviour it holds
shut is already gated there by `an aggressive swipe carries the nav strip` in
`e2e/chrome.spec.js`.

**Reach for it** before touching `ui/nav-scroll.js` — anything in
`keepEndless`, `balance`, `settled`, or `SETTLE_MS` — and after, with the
control arm, to confirm the gate still bites. Also when a reader reports the
nav strip "sticking" or "jumping back" on a phone.

**Do not reach for it** for the carousel: `ui/loop-scroll.js` is a different
engine with its own tween and no native momentum to protect. And do not read a
single run — the defect it holds shut was three times in three, and every
fling is judged.

---

## `fling-write.mjs` — the platform fact underneath all of that

**The question.** Does writing `scrollLeft` during a fling cancel the fling in
Chromium? Three arms on a bare scroller with no site code in it: no write, one
write, a write per scroll event.

```bash
npm run probe:fling-write
```

**No server, no build** — the page is a string in the file. It is the cheapest
thing in this document to run and the first thing to run when the nav strip
misbehaves and you do not yet know whose fault it is.

**The thresholds.**

- `FLING_FLOOR_PX` = 250: the `none` and `once` arms must reach this, or there
  was no fling and the run says nothing.
- `KILLED_CEILING_PX` = 150: the `every` arm must stay under it, or the
  platform has changed.

**Where those came from.** The table in `ui/nav-scroll.js`, which this script
is the source of: none 350 px, one write 350 dragged back to 315, a write per
scroll event **45**. The value written was the value already there, so it is
the write and not the arithmetic. 250 and 150 sit either side of the gap
between 350 and 45, so the gate reads the *difference* between the arms rather
than either number.

**The premise is gated first and hardest**, because this script's failure mode
is silent: if `Input.dispatchTouchEvent` ever stops producing momentum, every
arm reads small, the differences vanish, and a run looks like "a write no
longer cancels a fling" when it means "there was no fling".

**A red here is not a bug in this repository.** It is a change in Chromium,
and what to do about it is re-read `keepEndless` in `ui/nav-scroll.js`, whose
whole design rests on the old behaviour.

**Reach for it** when `nav-swipe.mjs` goes red and you want to know whether the
strip broke or the platform did; before designing anything that writes a
scroll position from a scroll handler.

**Do not reach for it** to measure the real nav strip — it deliberately has
none of the site's code in it. That is `nav-swipe.mjs`.

---

## A note on the citations

Several source files still name these by their old `scratchpad/...` paths.
Those are stale and are being corrected separately; the files are in
`scripts/` and nowhere else.
