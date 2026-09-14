# SRC-DECISIONS

**Why the code in `src/` is the way it is.** Dated author decisions, the
alternatives that were tried and rejected, and the measurements that settled an
argument — moved here out of the source files on 2026-09-12, verbatim.

This is a **record of intent**, not a specification. `PLAN.md` is what the site
should be and is binding; `CLAUDE.md` is how to work. This file answers one
question and only one: *why is this line here and not the obvious other one?*

**The prose below is quoted, not summarised.** Author quotes are word for word.
Where a paragraph says "this file" it meant the source file it was lifted from,
which is the heading it now sits under.

**A number here is a reading someone took on one machine on one day.** Where a
probe can re-derive it the source file names the probe; the figures kept here
are the record of what was seen, not a budget anything is held to. The rule
`CLAUDE.md` states still applies: a quantity or a mechanism needs a test pinning
it, or it says plainly that it is unverified.

Organised by source file, in the order a reader meets them: `src/ui/`,
`src/lib/`, `src/views/`, `src/styles/`, `src/data/`, `src/main.js`.

---

## src/ui/nav-scroll.js

### The endless strip, three cuts

The mobile nav row as an endless, centred strip (author, 2026-09-07: on a
phone, make the header "a horizontal scroll header where the selected one
is in the centre, and you can swipe across to the next or click on it.
Infinite scroll header" — five pages no longer fit as equal fixed columns
once Texts joined Daily, All Saints, Map and About).

**Second cut, 2026-09-08**, on three findings from the author: the row was
not endless, About was not to the left of Daily, and pressing a page threw
it into the centre rather than gliding it there. The first two are the same
answer.

**Not `ui/loop-scroll.js`**, on purpose, though the idea of a whole-period
correction is kept in spirit. That file's whole shape is a row that moves
*by itself* — continuous drift, a wheel, hand-rolled drag with pointer
capture — earned keeping sixty-plus saints scrolling forever. A nav row of
five destinations never moves except under a reader's own finger: native
`overflow-x: auto` with `scroll-snap-type` already gives a phone its own
swipe, momentum and snap for free.

**Not buffered clones either**, which was the first version and was wrong.
`ui/loop-scroll.js`'s own trick — render extra copies either side, wrap the
scroll position by a whole period onto identical content — works for a
carousel of *cards*, where nothing else on the page ever queries "the
card". It does not work for a *nav*: the rest of the suite (chrome.spec.js
alone, before this) holds `.site-nav a[href$="/saints"]` to be exactly one
element in a dozen places, a genuine and load-bearing invariant — a click
handler, an assertion on the current page's own weight, a keyboard test —
and cloning the links to fake a loop breaks every one of them the moment a
phone-width test runs, which is exactly how this was caught.

So there are always exactly five `<a>`, one per page, and the loop is real
rotation instead.

**The rotation is `order`, not `insertBefore`** (2026-09-08, the second
cut). The first cut moved the nodes themselves and compensated `scrollLeft`
by the moved node's own width in the same breath. It worked, and it cost
two things worth more than it: `document.querySelectorAll('.site-nav a')`
came back in an order that depended on where the reader had last swiped,
which makes every positional selector in the suite — and every keyboard
user's tab order — a function of a gesture; and a compensating write is
arithmetic that has to be right in a frame where two layouts are in play.
A flex `order` per link says the same thing with neither: the DOM stays in
the site's own order (Daily, All Saints, Texts, Map, About) for the tab
ring and for `nth()`, and `offsetLeft` — which is all this file reads —
already answers in the *visual* order. The trade is that focus order is the
canonical order rather than the rotated one; for a ring of five equals with
no meaningful sequence between them that is the better of the two, and it
is the desktop row's order besides.

**Balanced at rest, which is what "endless" actually asks for.** The first
cut only rotated once a swipe had *already* settled with an edge page
centred, so on every load the current page stood at one end of the five
with blank strip beside it — on the Daily page, nothing at all to its left
(author, 2026-09-08: "next to Daily page on the left needs to be the About
section"). Now every settle puts whichever page is centred at the *middle*
of the five, so there are always two pages either side of it and the ring's
own neighbours are the ones a reader meets: About is left of Daily because
the ring says so, not because a rotation happened to land there.

That rebalance is **visually silent by construction**: rotating a ring does
not change anybody's neighbours, so re-centring the same page after the
rotation puts every one of the five back on the pixel it was already on.

**And it turns before the movement, not after it** (2026-09-08, the author's
second report on this row: "dont make the header text load after its settled
and centred after selection. they should be visible as the animation is
happening, true infinite scroll"). Balancing on the *settle* alone is right
about where the row ends up and wrong about every frame in between —
measured, frame by frame: a press on About from the Daily page opened **85 px
of blank strip** on the leading edge and Texts appeared there only once the
glide had landed. The row visibly ran out and refilled.

So `turnKeepingStill` does the rotation with the picture pinned — the page
under the midline stays on its pixel, and only the two pages off either end
change which end they are at — and it runs *before* a glide and *during* a
swipe (`keepEndless`), not after either. The settle-time `balance` remains as
the thing that squares the position exactly once everything has stopped.

**Third cut, 2026-09-12: once a gesture, and rest is not `scrollend`.** The
paragraph that stood here said the one cost was iOS momentum, that a snap
damps a fling anyway so the window was short, and that this was written down
rather than measured. Measured, all three were wrong. A `scrollLeft` write
ends a Chromium fling too, a snap does not save it, and the window was every
scroll event: a 320 px swipe travelled 45 px of a 450 px range and came back
to the page it left, three times in three (`scripts/nav-swipe.mjs`).
`scripts/fling-write.mjs` has the mechanism on a bare scroller — no
write, 350 px; one write of the value already there, 350 dragged back to
315; a write per scroll event, 45 — so it is the write and not the
arithmetic.

Two changes, and `keepEndless` and `settled` each carry their half:
the ring turns **at most once per gesture**, and the settle is **150 ms of
stillness with the finger off**, because a mandatory-snap scroller fires
`scrollend` every time it snaps — including the snap this file's own turn
provokes, which is how `balance` came to be re-centring in the middle of a
fling. Same fling afterwards: the full 450 px, 225 px of coast after the
lift, no backward step, and the ring turned so the page it lands on stands
in the middle of five. `an aggressive swipe carries the nav strip` in
`e2e/chrome.spec.js` fails if either half goes back.

### Whose scroll was that

**Whether a reader has actually touched this row**, which turned out to
be the only reliable answer to "whose scroll was that?" A `scrollLeft`
diff against what this file last wrote (`ui/loop-scroll.js`'s own
approach, tried first here) is not enough: a browser correcting a
position itself can take more than one settled step to get there, each
one indistinguishable from a swipe by its `scrollLeft` alone. Found live:
a fresh load routinely rotated the row once or twice before any reader
had touched it, on both a first load and a reload. A pointer, touch or
wheel event on the track is the one signal that can only come from a
reader, so a rebalance is gated on having seen one — or on this file
having started a glide itself — rather than on reading intent into a
number.

### The settle is rest, not `scrollend`

`scrollend` fires whenever a scroll sequence finishes, and a mandatory-snap
scroller finishes one every time it snaps — including the snap provoked by
this file's own `keepEndless` write. So the platform's own event was
arriving in the *middle* of a fling and `balance` was re-centring on it,
which moves the picture and pulls the row back to where the gesture began.
Traced write by write (`scripts/nav-swipe.mjs`): five turn-and-rebalance
pairs inside one 320 px swipe, at 145, 243, 346, 443 and 595 ms.

Rest is 150 ms with no scroll event at all, and a finger off the glass.
Every scroll — the reader's, the momentum's, the snap's, and this file's
own — re-arms it, so it can only fire when nothing is moving.

### Once per gesture

This file used to say the cost was iOS momentum, short, and written down
rather than measured. Measured, it was neither iOS-only nor short. On a
bare scroller with none of this file's code in it
(`scripts/fling-write.mjs`, Chromium, mobile-360, a 320 px fling):

| writes of `scrollLeft` during the fling | how far it travelled |
| --- | --- |
| none | 350 px |
| one, 100 ms after the lift | 350 px, dragged back to 315 |
| one per scroll event | **45 px** |

The value written was the value already there, so it is the write itself
and not the arithmetic. `keepEndless` ran on every scroll event, which is
the third row: on the real strip a hard swipe moved 45 px of a 450 px
range, jumped backwards nine times, and settled on the page it started on
(`scripts/nav-swipe.mjs`, 3 of 3). The oscillation feeds itself — a
write computed from a `scrollLeft` the compositor has already moved past
lands behind the fling, which puts a different link nearest the midline,
which asks for another turn.

One turn per gesture costs a frame of travel and buys two pages of runway
either side, which is as far as a fling can reach in a range this size.
`force` is for this file's own tween, which writes every frame regardless
and has no native momentum to protect.

### Turning while it travels

**The gentle press** (author, 2026-09-08: "when you select one it should
be animated to click into the centre gently instead of just jumping with
no smoothness"). The row is not rebuilt on a navigation any more —
`renderNav` moves `aria-current` in place and calls this — so the strip is
still standing where the reader's own swipe left it, and the page they
pressed has somewhere to travel *from*.

**Hand-rolled, where the first cut used `scrollTo({ behavior: 'smooth' })`,
and the reason is the turning** (author, same day: "they should be visible
as the animation is happening, true infinite scroll"). The row has to be
turned *while* it travels, or the far end runs out mid-journey — and any
`scrollLeft` write aborts a native smooth scroll, so the two cannot be had
together. Snap comes off for the length of the tween for the same reason: a
mandatory-snap scroller re-snaps every programmatic write, which is a
stutter a frame. `balance` puts it back and squares the position when the
tween lands.

**The ring is not turned up front**, and that was a wrong first answer worth
recording: turning to put the *destination* in the middle before the tween
starts fights `keepEndless` on the very next frame, which finds the page
still under the midline and turns it straight back. What keeps the row full
is the same rule during the journey as at rest — whatever is nearest the
midline sits in the middle of the five — applied every frame.

**The distance is read as a remainder, not as two endpoints**, which is
what makes a moving destination safe: turning the ring changes
`centreOf(target)` by a whole period, but it moves the picture not at all,
so `centreOf(target) - scrollLeft` — how far the target still is from the
midline, on screen — is invariant across a turn. Easing that to zero is
the same journey whichever way the ring has been turned underneath it.

The target itself never wraps. A press is at most two steps away in a ring
of five, and a one-step turn wraps the page at the far end — which is the
one the reader is travelling *away* from — so the page being travelled to
keeps a continuous screen position the whole way.

**A second ask for a journey already under way is not news** (2026-09-08).
The press starts the glide and the navigation behind it arms one too;
restarting the tween from wherever it had reached, on a fresh clock,
is the stutter that would put back exactly the unevenness starting it on
the press was meant to remove.
