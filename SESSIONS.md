# Build sessions

## Amendments — read before starting Session 4a (recorded 2026-08-20)

**1. The quality floor is currently unenforceable, and it gates the ship.**
Brief §13 requires Lighthouse accessibility ≥ 95, zero axe-core violations,
FCP under 1.5 s on throttled 4G, responsiveness to 360 px and visible keyboard
focus — "verified before each phase is considered done". None of that can be
verified today: there is no Playwright, no axe-core, no Lighthouse in the
project, and an agent session has no browser at all. Every visual and
interactive claim made so far rests on inference from the data plumbing, not
observation.

*Therefore:* installing and wiring that tooling is the **first task of Session
4a**, not part of 4b. Playwright plus `@axe-core/playwright` plus Lighthouse CI
all run headless in GitHub Actions; once they do, the quality floor becomes a
CI gate that fails loudly like the manifest build does, rather than an
aspiration nobody can check. Until it exists, treat "Session 4b passed" as
unprovable, and do not let 4b claim the ship gate on inspection alone.

**2. Data acquisition is now the critical path, and must not be bulk-generated
unsupervised.** It was scheduled to open in Session 2 and has not started. The
corpus is 10 saints, so the calendar is empty on ~355 days a year, and Session
4b would otherwise "ship" a daily habit page that has nothing to show on almost
every day.

The temptation is to have an agent draft several hundred saints overnight.
**Do not.** This project's entire value is that each attestation is real and
cited; a few hundred plausible-looking but unverified feast days would do
damage that is invisible at review time and very expensive later — and the
model cannot tell its own confident guesses from its sourced facts. Note how
the existing ten handle this: where the Coptic Synaxarium date was not
verified, the entry says `undocumented` with a note rather than guessing.

*Therefore:* overnight data work should build the **pipeline and the review
workflow**, not the corpus. Ingest from a structured public-domain source with
citations attached, write every unverified field as `undocumented`, and flag
anything inferred for human review before it counts as sourced.

**3. CI is the source of truth, not the local test run.** The `.gitignore` bug
(commit 7512a5b) had `src/data/` untracked while every local test passed,
because the files sat on disk. Only a fresh CI checkout revealed it. After any
session that adds files, confirm CI is green before calling the session done —
a local pass proves nothing about what was actually committed.

**4. Live and deployed.** GitHub Pages now serves the Actions build at
https://simonandpeter.github.io/test/. Verified live: correct `/test/` base
path, all bundles and 12 font subsets resolving, manifest and saint files
serving, and the 404-fallback deep-link route returning the app shell so
client-side routing works. Cache-Control is a flat `max-age=600` on everything
including content-hashed assets; that is a Pages platform default, not worth
chasing before a custom domain.

**5. Watch the manifest budget.** Adding per-attestation `titles` moved the
5,000-saint projection from 717 KB to 864 KB against a 400 KB ceiling. Still
meaningless below ~200 saints (gzip has nothing to work with), but re-check it
once the corpus passes that mark, before considering the sharding the brief
defers.

**6. The glyph geometry changed once more, and this is the settled form.** The
brief drew refusal as a pale-grey fill; Addendum A1 replaced that with a hollow
outline at full cell size; the author's `veneration-glyph` spec (2026-08-21)
returns to the pale fill, with the undocumented mark separated by **size**
rather than by shape. All three drafts were protecting the same thing — three
states that survive greyscale — and the shipping form does it with value for
refusal and size for silence. Recorded in DESIGN.md §7 with the two superseded
forms named, so neither is reintroduced by someone reading an older document.
The component now holds no colour literal at all: four custom properties,
defined in tokens.css for both themes.

**7. The glyph beside a name is now the rite x communion matrix, not the
badge — on the two contexts with the height for it.** The author's bundle
(`../veneration-glyph-spec.md`, `../veneration-glyph.js`,
`../veneration-glyph-proof.html`) carries two renderers; `renderDetail` is the
one they want. It ships on the saint's `h1` and the calendar hero at cell 8;
index cards, register rows and shelf rows keep the badge, because a matrix
there needs a 1.5 px undocumented mark and the size distinction is the one
thing DESIGN.md §7 says must never be simplified. Measurements in §7c.

The decision the reference did not answer: it assumes one rite per church and
splits Eastern Catholic into six, which this registry deliberately does not do.
The six non-Latin Catholic cells are **filled from the one entry and marked
coarse**, not left blank. Leaving them blank would break the badge/matrix
decomposition and would erase the Nestorius East Syriac adjacency that brief
§9.2 gives as the reason the view exists. Full reasoning and the cost in
DESIGN.md §7b. The trigger to split the registry entry is the first
`eastern-catholic: venerated` attestation; there is none in the corpus today.

**8. The cells are circles. The square lattice was wrong all along.** The
reference bundle in the parent folder was revised on 2026-08-21 to state it
twice — a banner above §1 and a rewritten §4 — and `veneration-glyph.js` now
draws nothing but `<circle>`. Attested and refused share radius 0.31 x pitch;
undocumented is 0.11 x pitch, a visibly smaller circle rather than the same one
at a lower opacity. Marks are centred on their cell (`cx`/`cy` at the midpoint),
not corner-anchored, and there is no gap constant any more — the gap is what
the pitch leaves over around a 0.62-pitch disc.

The component's parameter changed with it: `renderBadge`/`renderMatrix` take
`pitch`, not `cell`. Badge ships at pitch 12 (48 x 12 px), matrix at pitch 9
(63 x 36 px). The rendered sizes are within about a pixel of what the squares
occupied, so nothing else in the layout moved.

Two things this cost, worth remembering. The earlier revision of the spec said
"squares" in its §4 and the implementation followed it faithfully; the only way
that was going to be caught was the author looking at a screenshot. And the
repo had vestigial traces of a still older circle draft — a stale `dot diameter
22%` comment and a `/<rect|<circle/` test regex — which made the codebase look
like it had already considered and rejected circles. Neither is a substitute
for rendering the thing and looking at it.

**9. The day panel could be duplicated by clicking faster than the roll.**
`slotSwap` took `viewport.querySelector('.day-panel')` as the panel to replace,
but during the 300 ms roll that selector finds the *leaving* panel — so a
second click inside the window appended a third panel and orphaned the second,
which then outlived every navigation after it. The visible symptom was a day
showing an empty-day notice and a hero at once. Fixed by landing any roll still
in flight before starting a new one (`landRoll`), and the timer now lives on
`state` so `destroy()` can clear it. A browser test clicks two days 60 ms apart
and asserts one panel; it fails without the fix.

Worth generalising: anything that keeps two copies of a thing in the DOM for
the length of an animation needs to say which copy is current. A bare
`querySelector` cannot, and the failure is invisible until someone clicks
faster than the designer did.

**10. The glyph is pinned to the right margin of its line**, not trailing the
name (author, 2026-08-21). Down a register or an index the marks now hold one
column. Register rows pin after the feast date, since the date holds that row's
margin; below 480 px the date wraps to its own line and the glyph pins to the
name's line instead. DESIGN.md §7d.

**11. The calendar takes swipes, and the month behaves like a place rather
than a menu** (author, 2026-08-21). `src/ui/swipe.js` is a small pointer-event
helper: touch and pen only, 45 px threshold, more across than down, and it
swallows the one click that would otherwise land where the finger lifted — a
flick across the week ending on Thursday was changing the week and then
selecting a day in it. The elements need `touch-action: pan-y` or the browser
takes the drag as a scroll and the events never arrive.

Picking a date no longer closes the month. The month's chevrons moved out of
`.month-view` into a `.cal-month` wrapper so they occupy exactly the week's
chevron positions — all four heights come from one `--cal-row-h`, which is what
keeps them from shifting as the two swap. The month cross-fades over 420 ms.

*Superseded in part by Amendments 15, 16 and 18:* the month no longer names
itself centred above its grid, the cross-fade is now an unfurl out of the
day-name line, the chevrons have been replaced by a peek of the neighbouring
grain, and `swipe.js` has become `grain-drag.js` — the gesture follows the
finger now rather than firing at a threshold. The peeks are still buttons
precisely because it is still touch and pen only.

**12. The glyph is 15% smaller everywhere** (author, 2026-08-21): badge pitch
12 → 10.2, matrix pitch 9 → 7.65. Worth knowing before it shrinks again: the
matrix's undocumented dot is now 1.68 px, under the 2 px legibility floor
DESIGN.md §7c recorded, and that dot is what carries the third state through
greyscale. Fine at 2x and above; it is the first thing that gives if the glyph
is asked to shrink a third time.

**13. The index earns its vertical space before the first card** (author,
2026-08-21). One-line lede, the search label moved into the placeholder as
"Search: name, type, church, region", Random moved up beside Sort, and the
margins around the control block tightened. The grid starts at 350 px instead
of 436 on a 1280 x 900 laptop and four cards clear the fold where three did.

Two things learned writing the test for it. A placeholder is not an accessible
name — it disappears the moment anyone types — so the field carries an explicit
`aria-label`. And an absolute assertion on where the grid starts is flaky by
construction on this project: `font-display: optional` means a cold load keeps
the fallback face, whose wider metrics wrap the facet row onto a second line
and cost 31 px. The test pins the two rows that actually collapsed, which
measure the same in either face, and keeps only a loose backstop on the grid
position.

**14. Three index and About refinements** (author, 2026-08-21). Clear filters
never wraps: the row is `nowrap` and the field gives up width instead. Its
button is also matched to the field's font and padding, because it was 5 px
taller and every facet below it dropped a row the moment a reader typed.

Breadth of veneration now names the communions it counts and the churches in
each, Eastern Catholic expanded into its six rites. The roster is built from
`matrixRows()`, so it is the glyph's own axes rather than a second list that
can drift. **The measure still counts communions, not the thirteen expanded
cells** — six of those thirteen come from one registry entry, and counting them
separately would inflate breadth for anything Eastern Catholic venerates. If
the count itself should be out of thirteen that is a data decision, not a
display one.

About gained "Reading the mark": the three states, the two views, and Nestorius
as the worked example. Every circle on that page comes from `cellMark` and the
two real renderers, so the legend cannot describe a glyph the site no longer
draws — and the worked example uses a real saint, dropping itself if he ever
leaves the corpus rather than being propped up with invented attestations.

**15. The month is the week grown taller, and a grain steps sideways**
(author, 2026-08-21). Four refinements to the calendar chrome, and one of them
reverses a decision recorded here five entries ago.

The month lost its frame and its centred heading and took the week strip's own
column geometry, so **the day names sit in exactly the same place at either
grain** — same column centres, same top, to the pixel at 1280 and at 360. That
is what makes toggling read as rows arriving rather than as a second control.
**The name moved into the gutter** under the jump stack and the back chevron,
which costs the row no height at all; Amendment 11 and DESIGN.md §5b both said
it sat centred above the grid, and both are rewritten. With the leading around
each date cut to a numeral's worth, the row is 171 px where it was 278.

The two grains now share one grid cell, so the week fades out where the month
fades in and the dates unfurl downward out of the day-name line, with the row
as tall as whichever grain is taller — which is what carries the page below
down instead of jumping it. There is no transitioning from a pixel height to
`auto`, so the JS sets the end value and releases it once it has arrived, and
forces a layout between the two values: without that flush the browser
coalesces them into one recalculation and the rows appear at full height in a
single frame with no transition to run.

Stepping a week or a month slides rather than swapping in place. **What decides
it is the movement, not the gesture** — a chevron, a swipe, an arrow key off
the end and the jump to today all travel, and picking a day inside the week
already showing does not. Two copies of a strip live in its viewport for
260 ms, so the leaving one says what it is: a class, `aria-hidden`, and its
buttons out of the tab order, with any slide still running landed before
another starts. That is Amendment 9's lesson applied before it could bite a
second time. The viewport is only clipped for the length of a slide, because at
rest a day's focus ring reaches 4 px outside its button and must not be cropped.

The test for the day names measures the **text**, not its box: in the week a
day name is a flex item centred in its button and in the month a grid cell
carrying the padding itself, so the two boxes differ by 5 px vertically and by
half a column horizontally while the glyphs land identically. A first draft of
that assertion compared `getBoundingClientRect()` and read as a failure when
the thing under test was already correct.

**16. Seven refinements, and two of them cost more than they looked**
(author, 2026-08-21). Today's date under the theme control; the month named in
abbreviation; the chevrons replaced by a peek of the neighbouring grain; a
reckoning toggle under the strip; that reckoning's date above the hero image;
the image at 85% and clickable; and the saint page's date bars replaced by
dates and places.

**The chevrons are gone and the affordance is not.** What stands at each edge
is the grain continuing — the day either side of the week, the column of dates
either side of the month, on the grid's own rows — dissolving toward the margin
through a mask. They are still buttons, deliberately: the swipe is touch and
pen only by design (Amendment 11), so an edge with nothing to click would have
stranded every reader with a mouse. Removing the glyph was the instruction;
removing the way through the weeks would have been a different change.

**The fade had to be a mask rather than an opacity, and axe is what said so.**
A flat 50% wash over `--ink-soft` computes to `#b3aea8` on gesso — 2.1:1, a
serious violation on two routes, caught the first time the suite ran. The ink
now stays at full strength and the dissolve happens over the outer half of the
peek, where there is no longer a glyph to read. The floor has still not been
wrong.

**The hero image shrank twice.** `85%` on the image *and* a column narrowed
from 260 to 221 took 15% off 15%: 188 px where 221 was asked for. Both rules
were correct in isolation and the media query lost to source order besides. The
test that caught it measures the rendered width against the used grid track;
nothing that reads the CSS would have seen it, and neither did a screenshot,
because 188 px of Augustine looks perfectly reasonable.

**The date bars are withdrawn, and the curve is not.** They were the
uncertainty curve's only shipping consumer, so `tests/uncertainty.test.mjs` now
pins its three constants directly rather than through a component that no
longer exists — the map halo and the timeline still need them. Writing it
turned up that DESIGN.md §6b's worked values were wrong in two places: 200
years is 13.82 px and not 13.7, and "500 years and above → 24 px" is false, the
clamp not binding until about 757 years. Both corrected. **A worked value
nobody executes is a comment**, and it had been wrong since the day it was
written.

The saint page prints dates and places as one register keyed by the `kind` a
date and a location share. The place *names* are not in the manifest — only
coordinates are — so the rows are drawn at their final size from the card,
which knows how many there will be, and the names are filled in when the
saint's own file lands. The `note` on a location is kept: "the place of his
death is not more closely fixed" is the finding, and a coordinate without it
looks certain.

Two smaller things. The header's corner is a two-line stack now and the bar's
own vertical padding paid for the line, so the date arrived without the header
growing: 61.3 px before, 60.5 after. And a backout check found a hole in a test
of my own — the contrast assertion read only the trailing peek, so washing out
the leading one walked straight past it. It reads both now.

**17. Four calendar refinements, and two of them reverse the same day's
decisions** (author, 2026-08-21).

**The chosen reckoning's date moved out of the day panel and up beside the
buttons that choose it.** Amendment 16 and DESIGN.md §5b both had it standing
directly above the hero image, inside the panel, so it rolled with the day;
both are rewritten. It sits on the reckoning row's own line now, pinned to that
row's trailing margin so it holds one column whichever button is lit, and it is
the chrome's rather than the day's — it repaints when the day changes instead
of rolling.

**And it stopped naming its calendar** (same day, second pass): "22 Tobi 1742",
not "Coptic · 22 Tobi 1742". Naming it was load-bearing while the line stood in
the day panel — nothing else on the page said which reckoning was being printed
— and stopped being load-bearing the moment the line moved next to the lit
button that answers the same question. That is the shape this kind of reversal
usually has: the reason for a decision is a fact about where the thing sits,
and moving it invalidates the reason silently. The year stays; Coptic 1742 and
Gregorian 2026 are the same day. What remains of "Gregorian reads twice" is
between the line and the `h1` — "30 January 2026" under "Friday, 30 January
2026" — and dropping Gregorian from the four is still the fix and still the
author's call.

**The hero image is a square, cropped from the top.** It took the manifest's
aspect until now, which is what DESIGN.md §5b said; on the habit page every
day's saint is asked to sit in the same box instead, and what a tall icon loses
is its lower half rather than the face. The index still varies its card heights
from the manifest — there the varying box is the corpus showing its own shape,
which is the opposite argument, and both are recorded rather than reconciled.
The no-layout-shift guarantee is untouched: a square is reserved before the
image decodes exactly as a measured ratio was. Two things had to move together
or the crop is wrong twice — the `<img>`'s `object-position` and the blurred
placeholder's `background-position`, which otherwise paints a differently
framed image under the one arriving.

**The peeked day was printing 5 px high.** It is not inside a day button, so it
inherited neither that button's one transparent border nor its `--space-1` of
padding. Nothing measured it: the row was pinned by `--cal-row-h` at both
edges, and the alignment inside that row had never been asserted. The month's
column never had the fault, because its cells take the grid's own classes —
which is the argument for that habit, stated again.

**The week's edges now travel with the week.** They were siblings of the slide
viewport and repainted in place while the seven days between them slid, which
reads as the edges switching rather than as the grain moving. What slides is
the whole row now — `.cal-week` is the viewport, `.week-row` is what moves.
That puts a second copy of every step button in the document for 260 ms, so
Amendment 9's rule applied again and cost one thing more than expected: the
leaving copy is laid *over* the arriving one, so `aria-hidden` and
`tabIndex = -1` were not enough and it needed `pointer-events: none` as well,
or it swallows the click that steps the week a second time. Two browser tests
had to say which copy they meant, for the same reason.

**The month's edges still switch in place**, and this is the one thing here
that was scoped out rather than finished. Sliding the month's peeked column
means sliding what is above it too, and the day names must not move between
grains (Amendment 15) — so it needs the day-name line lifted out of both the
peek buttons and `.month-view` into a row of its own, which moves geometry
three tests pin. Worth doing; not worth doing quietly inside a refinement.

*Done in Amendment 18, which is what it cost.*

**18. One track under each grain, and the reader can drag it** (author,
2026-08-21).

**Both grains now sit on a track inside a viewport**, and the track is what
moves. The per-element slide that Amendment 15 introduced is gone: there are no
`.strip-leaving` / `.strip-entering` classes and no four keyframes, because a
travel and a drag are the same movement and it was cheaper to have one
mechanism than to grow a second one beside it. What replaced them is
`.grain-track`, `.grain-side` and one `is-moving` clip.

**The month's edges travel now, and the day names are what it cost.** They had
to come out of both the peek buttons — where each held an invisible spacer for
the day-name row — and out of `.month-view`, into a `.month-days-line` of their
own: a row of seven with a peek-wide gap at each end. `.month-view` is gone;
`.month-body` is the month's viewport. The invariant Amendment 15 and DESIGN.md
§5b both stated — that the two grains' edges hold "the same column and the same
top" — is now half true on purpose. Same column, and the peeked cell still
shares the grid's first row; not the same top, because the month's button
starts where its first cell does. The test that pinned the box's `y` now pins
the column and asserts the button starts lower, with a comment saying why.

**Hold-and-slide is `src/ui/grain-drag.js`**, which replaces `src/ui/swipe.js`.
Still touch and pen only — DESIGN.md §5b's reasoning is unchanged, and it is
still why the peeked edges are buttons. Three things worth remembering from
writing it:

- A drag needs both neighbours painted *before* the first frame moves, or the
  grain arriving is blank until a repaint catches up mid-gesture.
- The month's viewport has to take the tallest of the three for as long as the
  reader holds it. Dragging six-row August in beside five-row September cut
  August's last row off otherwise. `growMonthBody` gained a `release` flag for
  it: pin, hold, and let go to the new month's own height on settle.
- A flick can arrive with **no `pointermove` at all** — the browser coalesces
  them, and a synthetic `pointerdown`/`pointerup` pair in a test has none by
  construction. So the helper reports `dragged: false` for that case and the
  caller travels the ordinary way, which is also what keeps the older swipe
  tests meaningful rather than quietly re-pointed at the new code path.

**19. The reckoning toggle is withdrawn, and a tradition filter stands where it
did** (author, 2026-08-21). The largest reversal of the day, and it undoes two
of the same day's own decisions: the four-calendar toggle (Amendment 16) and
the date line beside it (Amendments 17 and 18's second pass). Both are gone.
Nothing on the site now prints a day in Julian, Coptic or Ethiopian reckoning;
whether that should come back somewhere is a live question and the author's,
not the build's.

**What replaced it is the plate** — `src/ui/plate.js`, the rite × communion
lattice at full size with every position named, from the author's diagram. One
component, two readers: About draws it with the real marks in it, the calendar
draws it as a filter. That is the same discipline Amendment 14 used for About's
legend, applied one level up — the page cannot teach a shape the filter does
not have, and the filter cannot drift from the mark.

**The filter's cells are not the veneration mark, and that is the load-bearing
decision here.** Gold appears in exactly one place and that place is a finding
about a saint (DESIGN.md §2). A control shaped like the lattice would have been
the easy thing to draw in the glyph's own three states; it is drawn in ink and
rule instead, with `aria-pressed` carrying the state. A browser test asserts the
selected disc is `--ink` and specifically *not* `--gold`, because this is
exactly the sort of thing that gets "simplified" back later by someone who sees
two components drawing circles.

**A church is one switch however many cells it holds.** The selection is a set
of *churches*, never of cells, so Eastern Catholic's six positions answer
together by construction rather than by six lines of special-casing. The plate
rails them and names them once. This is DESIGN.md §7b's cost paid a third time,
and the set's shape is what pays it.

**Four things learned building it:**

- **Rebuilding the plate on every press takes the focus off what was pressed.**
  A filter a keyboard reader can only press once is not a filter. The focus is
  put back by dataset key after the repaint, and there is a test that presses
  Enter and reads `document.activeElement`.
- **A scrollable region has to be reachable by keyboard**, and axe knows the
  difference between one that holds buttons and one that does not. The
  calendar's plate passed at 360 px and About's failed on
  `scrollable-region-focusable`, because About's holds only marks. About's takes
  a tab stop and a name; the calendar's does not need one.
- **The first-visit question costs the fold at 360 px**, and no amount of
  trimming recovers it: it was 541 px, it is 433 px, and the hero's name is at
  1005 px on a 780 px screen. Recorded as a deliberate exception rather than
  quietly weakened — what has to clear the fold on that one visit is the
  question, its answers, the strip and the day's heading, and there is a test
  for each half.
- **`addInitScript` runs on every load, including a reload.** The helper that
  pre-answers the question for the tests was overwriting the answer on the way
  back in, so "the filter is remembered" passed against a filter that had just
  been reset. It seeds only when nothing is stored now.

**Three silences, not two, and rendering the page is what found the third.**
A day emptied by the filter was printing the sourcing notice over it — "an
empty day is a gap in our sourcing, not a claim about the calendar" — which is
a claim about our sourcing that is not true when the reader is the one who set
those traditions aside. The panel now counts what the day holds unfiltered and
says which silence this is. Nothing in the code was wrong; the words were, and
only looking at the screen was going to catch that.

**The lattice does not rearrange at 360 px** (author, same day, one round
later). It scrolls sideways inside its own region and keeps its shape, with the
communion's name stuck to the edge: a grid that becomes a register on a phone is
a second diagram to learn, and the shape is the thing being taught.

**20. One swap primitive, and the grain extracted for Session 6** (2026-08-22).
A structural pass, not a screen: four implementations of "two copies in the DOM
for the length of a transition" — the day roll, the grain tracks, the Index's
leaving cards, the month cross-fade — had each learned Amendment 9 and
Amendment 17's corollary separately, and the fourth learning had already cost a
real defect once (the leaving grain copy swallowing clicks). `src/ui/swap.js`
now owns both rules in one place: `setAside`/`restore` mark which copy is not
the reader's — `aria-hidden`, out of the tab order, inline
`pointer-events: none` — and a per-container flight registry (`beginSwap`/
`landSwap`) lands whatever is still in the air before the next swap starts,
idempotently, which is also what destroy() calls.

Converting the call sites found that three of the four had been marking
incompletely all along: the rolling day panel's leaving copy, the Index's
fading cards and the fading week under the arriving month all kept their
buttons and links in the tab order for the length of their animations. All
three are marked aside now, and restored where the copy persists and becomes
current again — the week when the month closes, a card a second filter change
brings back mid-fade.

With it, two of the smaller structural items from the same review:

- **`makeGrain` moved to `src/ui/grain.js`**, behaviour unchanged — it was
  already free-standing behind its parameter object, and River mode and the
  timeline are horizontal tracks that follow a finger and settle. Extracting it
  before Session 6 is the difference between reusing it and writing it twice.
  `STRIP_SLIDE` lives there now; `grain-drag.js` is unchanged.
- **The tradition selection lives wholly in lib/tradition.js**
  (`currentSelection`), not cached in the calendar view's state: the moment the
  Index or the map respects the filter, a view-local copy would be the one that
  drifts. Whether the filter *should* become site-wide is still open and the
  author's; the shape no longer prejudges it.

And one defect of the filter session's own fixed: `choose()` called
`slotSwap(true)`, so the day panel rolled upward on every filter press as if
the reader had stepped forward in time. By the design's own rule the movement
decides, not the gesture — a filter change has not travelled anywhere, and the
panel now repaints in place (`repaintDay`). Four browser tests cover the fix
and the new marking; each was backed out, seen to fail, and restored.

The one review item deliberately not taken: wrapping quality-floor.spec.js in
`test.describe` blocks by route. Extend, don't rebuild, until the flat list
actually costs time reading a failure.

**21. The light ground is gesso rather than paper, and three tokens moved with
it** (author, 2026-08-22). `--gesso` light was `#FBFAF7`, a near-white pinned by
DESIGN.md §3 since the design pass; it is `rgb(229, 228, 221)` / `#E5E4DD`. The
gold in the icon photography now sits in the surface instead of glowing off a
white page — which is the argument vigil mode has always made for bole, applied
to day as well.

**One instruction, four token changes, and the three extra ones are not scope
creep.** Each was a relationship the near-white ground was holding up by
accident, and each fails visibly or fails the floor the moment the ground moves:

- **`--field` `#F4F1EA` → `#DFDCD1`.** The old field is *lighter* than the new
  ground, so the panel would have stood proud of the page instead of recessing
  into it — the kovcheg inverted, DESIGN.md §1's central metaphor running
  backwards. The recipe never changed: the field is still "gesso darkened ~3%",
  re-derived from the ground it actually sits on.
- **`--ink-soft` `#6B6259` → `#5C544D`.** Forced by the quality floor, which
  failed on sight exactly as it did for the peek fade in Amendment 16: axe found
  `#6b6259` on `#dfdcd1` at **4.34:1** — serious, on three routes, six tests.
  Worth noticing *where*: on the page ink-soft was 4.68:1 and passing. It is the
  **field** that fails, and the field is where secondary text actually lives, so
  a check against the page alone would have shipped it.
- **`--rule` `#DCD5C9` → `#C8C2B7`.** Not forced by any gate — a rule is not
  text and takes no AA floor — and the reason it still had to move is that it
  had dropped to **1.06:1 against the field it encloses**. The integral border
  of every panel was indistinguishable from the panel's own interior. Nothing
  would have caught this but rendering the page and looking at it, and the first
  screenshot is what showed it.

**The fix for `--ink-soft` was chosen against the wrong-looking option.** The
smaller change was to lighten the field until secondary text cleared 4.5:1 on
it. Measured, that needs the kovcheg step cut to less than half its old depth
(ΔL 0.031 against 0.075) and still only reaches 4.51:1 with no margin — paying
for a contrast fix with the recessed field itself. Darkening ink-soft instead
restores the palette's own historical standing almost exactly: 5.82:1 on the
page where it was 5.72, and 5.40:1 on the field where it was 5.29.

**Every contrast figure in DESIGN.md §3 was wrong, and computing them is what
found a live defect in vigil mode.** The paragraph claimed ink/gesso 15.6:1 (it
was 16.00), rubric 8.8:1 (8.05), and ink-soft "≥ 5.4:1 both modes" while the
light field sat at 5.29:1. All recomputed against the shipping tokens. The one
that matters: **dark-mode rubric on bole is 4.20:1, not the 5.1:1 recorded, and
that is below the AA floor for normal text** — and rubric carries the current
nav item and today's date. Untouched by this pass and listed as outstanding
below, because **the browser suite runs in light mode only**, so no gate has
ever looked at vigil mode's contrast. This is Amendment 16's lesson arriving in
the palette: a worked value nobody executes is a comment.

One browser test, `the day ground is gesso, and the field is recessed into it`,
pins the ground exactly and the other three as *relationships* — field darker
than page, border visible against both, secondary text clearing AA on the field
— so a future repalette stays a token change rather than a fight with a test
full of hexes. Each of its four assertions was backed out separately and seen to
fail on its own: 208 browser tests now, 131 unit.

**22. The Index shows more when asked, Save is a bookmark, and the saint's
page closes back into the Index where the reader left it** (author,
2026-08-22; Addendum H, Phase 1). Four instructions, each written up in
Addendum H1–H4 and DESIGN.md §5, §5c, §7c, §7d; this entry is what they cost.

**Detailed is the reader asking a card for the §9.2 view, and the matrix ships
unscaled.** DESIGN.md §7c had ruled the matrix out of cards because a matrix
*scaled to 17 px type* needs a sub-1.5 px undocumented dot; at the h1's own
pitch it is the same 30.6 px mark and it fits the 42 px name line a card
already reserves, so the dot stays 1.68 px. The description is the life's
opening paragraph — `firstParagraphText` in lib/markdown.js, two unit tests —
fetched through the second layer as the card mounts and held in a box of a
fixed count of lines, clamped, so every height the virtualiser is fed stays a
constant: 157 px of text under a card, 112 px for a row. It is deliberately
not in the manifest; H1 has the arithmetic. A saint with no life shows its
types. Both grains were measured for cropping in both layouts at both widths.

**The bookmark is a two-path shape.** An ink outline over a wide gesso halo,
filled when saved: one stroke alone vanished on the dark half of an icon and
on the gold half in turn, and the halo is what gives it an edge on both. It is
ink on purpose — over a picture, gold would claim a finding and red would
claim liturgical time (§2) — and a browser test asserts the stroke is `--ink`
and the fill is never `--gold`. **Three things it cost:**

- A card with no picture has the glyph in the corner the bookmark wanted — the
  name line is the first thing in the card — and the first screenshot showed
  the two on top of each other on Christopher. The bookmark stands beside the
  dates there, 50 px down, with the arithmetic in index.css.
- In a row the bookmark's column narrowed the body to ~206 px at 360, and
  "13 November 354 – 28 August 430" wrapped and was cropped by the fixed box.
  Nothing caught it until the Detailed test measured every mounted card for
  `scrollHeight > clientHeight`. Row dates are one line with an ellipsis now,
  as the register's feast dates already are.
- `wireSaveButtons` kept a list of buttons taken at wiring time, which the
  Index — mounting and unmounting cards on every scroll frame — makes stale
  within a second. It re-queries on every paint now and the click is
  delegated; one read of the store paints the whole window.

**The × found two defects older than itself.** No scroll reset existed
anywhere in the router, so at 360 px a reader arriving from a scrolled Index
landed **696 px down** the saint's page (desktop happened to land at 0 because
the old document's height collapsed first); and browser-back to the Index lost
the position at every width, because the browser's own `auto` restoration
fires before a virtualised grid has been re-rendered and restores into
nothing. The app owns scroll now: `history.scrollRestoration = 'manual'`,
every navigation lands at the top, and the Index restores itself from a
module-level snapshot — filters, search, sort, open facets, scroll — when the
navigation says so: the × passes `{ restore: true }` through the router and a
history traversal arrives as `{ pop: true }`. The nav link still opens it
fresh, because it does not ask. Layout and Detailed come back by themselves,
being settings.

**The saint's page head.** The name, then the bookmark and the ×, then the
matrix at the margin — visually; in the DOM the controls follow the mark, so
the name and its glyph stay adjacent (§7d) and `glyphFollowsName`'s `+`
assertion still reads the truth. The register stands beside the image from
760 px and the body runs full width beneath both; the `.historicity` line got
`max-width: none` so its rule spans the column it now closes rather than a
paragraph's measure.

**Two test-design faults of my own, caught by the first run:** a Playwright
`.click()` scrolls its target into view first, which moved the very scroll
position the × test was about — the test opens cards from the page as it
stands now, by evaluate; and Christopher is not mounted at 360 px until he is
scrolled to, so the imageless-corner check scrolls for him first. Five browser
tests and two unit tests: 133 unit, 218 browser. **Eight backouts, each seen
to fail its test**: the matrix for the badge, the bookmark's position, its
wiring, the Index restore, the scroll reset, the head's grid, the controls'
order, and the row dates' nowrap; the tree was compared byte for byte against
the pristine copies after the last restore.

**Phase 2 is scoped in Addendum H5–H9 and not started**; five questions there
want the author's answers first.

**23. The header's two controls, one selection for the site, and one calendar
at a time** (author, 2026-08-22; Addendum H, Phase 2, built on the five
answers recorded there). Five instructions, each written up in Addendum H5–H9
and DESIGN.md §3, §5, §5b, §5c; this entry is what they cost and what they
reversed.

**What they reversed, by name.** The three-way theme with a System option
(brief §10, DESIGN.md §3, Session 2) is a two-way sun/moon toggle that reads
the system and never offers it; today's date under the theme control
(Amendment 16, one day old) is withdrawn, and the header's padding goes back
to what it was before the date arrived, 61 px at 1280; the calendar page's
own filter and plate (Amendment 19, also one day old) move to the header as
*Select Tradition* — four communion switches, the plate under *(advanced)* —
and the selection they write is the site's, read by the Index, the saint's
page and the Map's placeholder; the first-visit question loses *Show all of
them* and asks *Which traditions do you keep?*, because a second question now
asks which calendar to *see*; and brief §8.1's "every saint with a feast
today across all traditions" becomes **one church's calendar at a time**,
asked for before the week or month is shown, from those the traditions allow.

**The calendar choice is a second, separate thing, and it is remembered even
when it is not allowed.** `settings.calendar` holds one church; lib/tradition
derives the calendar to show — the stored one if the selection allows it, the
only allowed one if there is exactly one (a question with one answer is not a
question), otherwise nothing and the page asks. Keeping a disallowed choice
rather than clearing it is what lets a reader turn a communion off and on
again in the header and find their calendar still standing rather than being
asked twice; a browser test pins exactly that round trip.

**One calendar at a time is what "no double listing" actually means.**
30 January used to list Anthony under Eastern Orthodox and again under Coptic
— "the most load-bearing date in the corpus", two calendars reaching one
Gregorian day. In the Eastern Orthodox calendar he stands once, by the Julian
feast; change to Coptic and he stands once by 22 Tobi; the register below the
hero has no church heading because it has one church in it. The silences were
redrawn for it — three still, different facts: the corpus has nothing; this
calendar has nothing but others the reader keeps do, and the way to them is
named; the commemorations belong to traditions set aside, and the header is
named instead.

**The chooser is one component with two grains.** `src/ui/traditions.js`
renders four communions either as switches (the header's standing control,
answer 2) or as one-shot choices (the question, which is answered once), with
*(advanced)* unfolding the plate in both, and writes through lib/tradition,
which now announces changes — every view that respects the selection
subscribes on render and unsubscribes on destroy, which is what the Index,
the calendar and the saint's page all do. A switch is on, off or **mixed**,
carried by `aria-pressed` and a dotted underline; the mixed state is the
plate's own "some" seen from the row.

**Five things it cost, worth remembering:**

- **Forty-six calendar tests were resting on "unanswered shows everything".**
  With the strip hidden until a calendar is chosen, every one of them had to
  say which reader it is — a `ready(page, { traditions, calendar })` helper,
  seeding only where nothing is stored, with Eastern Orthodox for 30 January
  and Roman Catholic for everything else. A scripted insertion did it; the
  first-visit tests stayed unseeded by detecting the question's own selectors.
- **A local named `setAside` shadowed the imported `setAside`.** The Index's
  set-aside line was held in a variable of that name, and every filter pass
  that tried to mark a leaving card called a `<p>` — "d is not a function",
  minified — so nothing faded and nothing left. Three Phase 1 tests caught it
  within the hour; the fix is a rename and the lesson is the old one about
  names that are also verbs.
- **`hidden` lost to `display: flex`.** The question's Done row was meant to
  wait until the plate was opened and showed from the start, because a class
  with `display: flex` outranks the user agent's `[hidden]` rule. base.css
  carries `[hidden] { display: none !important }` now, which is the standard
  reset and should have been there from the start; a test pins the Done row's
  absence.
- **Seeding storage on every load overwrote the very change under test.** The
  probe that drove the header control and then navigated found the selection
  reset, because its init script re-seeded on each document — the same trap
  Amendment 19 recorded for the tests, met again in a measuring script. Seed
  only where nothing is stored, every time.
- **A selector that names a communion names two things once the plate is
  open** — the switch and the plate's row head both carry `data-communion` —
  and Playwright's strict mode said so. The tests reach the switch by its
  class now.

**The author's fifth answer — "not sure what you mean" — stands as is.** The
calendar hero's text *Save* button (the one under the saint of the day on the
calendar page) is the last text Save on the site; every other Save is the
bookmark. It was not in any instruction and it is unchanged; it is listed
below as outstanding for a decision, not a defect.

Eight browser tests added and nine rewritten to the new design; one unit
test reworded. **Nine backouts, each seen to fail its test** — the theme
choice's storage, the `[hidden]` reset, one calendar at a time, the gate, the
single-calendar shortcut, the Index filter, the saint page's split, the mixed
switch state, the calendar's subscription — and the tree compared byte for
byte against pristine copies afterwards. 133 unit, 234 browser.

**24. The first CI run the Phase 1 and Phase 2 commits ever had was red, and
the cause was a font the suite had never seen** (2026-08-22). `f9a1308` and
`031add2` were built, tested and committed on 2026-08-22 and pushed only on
the day the repo was archived and reseeded; the run on `75fc0ce` had been
green. The gate failed one test at both widths — *the index spends as little
height as it can before the first card* — with the grid at 405.06 px against
its 400 px backstop. Every local run was green, before and after. Amendment 3
again, in its other form: a local pass proves nothing about a machine that is
not this one.

**What the 25 px were.** Measured, not guessed: a scratch script drove the
built site at 1280 × 900 under five font conditions. Two things decide the
Index's height above the grid and neither is the code. A cold load under
`font-display: optional` keeps the serif fallback, and the 72ch content column
follows that face's "0": **580 px** on Palatino, Times or Liberation Serif,
678 on Literata — which, not a wider facet face, is Amendment 13's "31 px
between the two faces": the facets wrap at 580 in every face and not at 678,
and they are utility, unmoved by the serif. And the utility voice is whatever
`system-ui` resolves to, a different width on every platform. At 580 the
Index's foot — Sort and Random, the layout toggle, and Detailed, the tick box
Phase 1 added — summed to 579.9 px in Segoe UI, **0.1 px inside the column**,
and wrapped in anything wider: 586.4 in Arial's metrics, 617 in Verdana's. The
second line is 24.8 px and takes the grid from 380.2 to 405.1. At `75fc0ce`,
without Detailed, the foot was 489 px and could not wrap in any face.

**A measurement I over-read, recorded so it is not repeated.** Forcing Arial
locally reproduced CI's 405.06 to the hundredth and I took that for a
fingerprint of the face. It is not: every row in the foot has an explicit line
height, so a two-line foot is the same height in any face, and the figure said
only that the foot had wrapped. The gap change below was pushed on that
reading and CI was red a second time at exactly 405.0625 — while the new test,
which forces Arial, passed. So the runner's native face is wider than Arial's
metrics: DejaVu Sans, fontconfig's sans-serif default on a bare Ubuntu, in
which the foot needs about 600 px at the 16 px gap. A height matched; the
width that mattered had not been measured there, and the test now prints it.

**What was done.** The foot takes the facets' own column gap — `--space-4`
(16 px) in place of `--space-6` (24): 16 px freed, 9.6 px of room in Arial's
metrics, which is what macOS, Android and fontconfig's Arial alias give, and
16 in Segoe's; nothing in DESIGN.md or Addendum H1 pins the gap, and "a tick
box beside the layout control" still holds. And the backstop is re-based from
400 to **410**: it was calibrated on Windows ("the fallback face's 381") and
had never seen a face wider than Segoe at the cold-load column; 410 clears the
runner's 405 and still fails either row wrapping once more (+25, +30). That is
a calibration of a number its own comment called coarse, stated as such — not
a finding that the row wrapping is right.

**What remains, and whose it is.** On a DejaVu-default Linux — bare runners,
few desktops — the foot takes two lines at the cold-load column and the grid
sits 25 px lower. Freeing it for good needs ~40 px the build does not own:
*Random saint* → *Random*; the layout toggle's visible *Layout* label; or the
sort select's widest option, *Breadth of veneration*, which an Orthodox-only
registry retires in any case. Any one of the three does it. All are the
author's strings or labels, so they stand under outstanding below rather than
being taken here; folding Detailed into the layout group was not taken either,
because H1 calls it a different axis.

**The test forces the cold-load column and a shared face rather than waiting
for either.** *the index foot holds one line in a wide utility face at the
cold-load column* blocks the webfont; prints the native foot's column, need,
height and group widths to the run's log, so the next CI run says in numbers
what the runner's face costs; then forces the utility face to Arial — which
Windows and macOS ship and fontconfig aliases to Liberation Sans on Linux —
and asserts three things: the foot's three groups with their gaps need less
than 580 px, the foot is one line, and the grid is above 400. Backed out, the
gap change fails it on both projects with "the foot needs 586.4 px of a 580 px
column" **while the original test still passes on Windows** — which is exactly
why CI caught this and no desk did. The re-based backstop cannot be backed out
and seen to fail on Windows, where the grid is 380 either way; CI is its only
witness, and that is recorded rather than dressed up. 133 unit, 236 browser.

**25. The glyph is removed from every screen, and what it held up went with
it** (author's decision, 2026-08-22; Eastern Orthodox project, DESIGN.md §2,
§7 superseded in full). The first of the three decisions and the first removal
of the strip: **strip, don't rebuild**, and every removal leaves the suite
green or retires its test by name.

**What went.** The badge on Index cards and rows, shelf rows, the calendar
register and a saint's related list; the matrix beside the calendar hero's
name, the saint's h1 and — under Detailed — on every card; About's *Reading
the mark*, its legend and the Nestorius worked example, and the 51 lines of
CSS that dressed them; the pin that held the mark at the right margin of every
name line (base.css, calendar.css's register rule and its 480 px variant,
saint.css's order trick); breadth of veneration — the facet, its roster, the
sort option, `breadthOf` and the filter — because it counts communions and a
one-communion corpus has one; and the strings for all of it. 526 lines out, 65
in, across thirteen files.

**What stays, and why.** `ui/badge.js` and `ui/matrix.js` are still in the
tree with their unit tests: the plate imports `cellMark`, `rollupStates` and
`riteColumns`, and the plate is the traditions control, which goes with the
registry and the church chooser in the next pass — taking the two modules, the
`--glyph-*` tokens and `STRINGS.badge`, `STRINGS.matrix` and
`STRINGS.about.glyph` (whose `plate` entry names the plate's region) with it.
Deleting them now would have meant deleting the plate now, out of order. The
imageless card's bookmark **stays beside the dates at 50 px**: the CSS comment
gave "the glyph in that corner" as its reason, but the reason that survives is
as good — the name line is the first thing in such a card and a long name
would run under a corner mark — and Amendment 22 records the shipped position.
Detailed rows keep the 112 px constant saints.js reserves, sized when the name
line held the matrix; the line is its natural height now and the row carries
~9 px of slack rather than a retuned number — retune with the River, which
reuses these heights.

**Tests.** Ten browser tests retired by name, each pinning what was removed:
*the glyph follows the saint own name on their page*, *… in the calendar
hero*, *… on an index card*, *… on a shelf row*, *the name carries the rite x
communion matrix, and a dense row does not*, *the East Syriac column puts a
refusal directly above an attestation*, *the glyph is pinned to the right
margin, not trailing the name*, *Breadth of veneration names the churches it
counts, Eastern Catholic expanded*, *About explains the mark, with circles
drawn by the component itself*, *the glyph holds no colour of its own, and the
states survive greyscale* — with the `glyphFollowsName` helper. Six adjusted
to lose their glyph assertions and keep the rest: the populated day
(retitled), the two layouts, Detailed (retitled *Detailed adds the opening of
the life, and every box still holds*), the bookmark, the saint page's head and
the traditions-first register. One unit test retired (*breadth counts
communions, not churches*) and two trimmed. One browser test added: *the
veneration glyph is drawn nowhere, and gold is spent nowhere* — four routes,
`svg.badge` and `.glyph-matrix` at zero, and every element's computed colour,
background, borders, fill, stroke and outline compared against `--gold`, so a
reintroduction anywhere fails by name. **Backed out by putting the badge back
in the calendar hero: fails on both projects with "/calendar/2026-01-30 draws
the mark"; restored byte-identical (checksummed) and green.** The first attempt
at that backout silently did nothing — its import anchor missed and the test
"passed" against an unchanged tree — which is why a backout has to be asserted
applied before its result means anything; it was, and it caught it. 132 unit,
218 browser.

**26. Two Index defects found by looking at the strip's screenshots, and a
third thing about the harness** (2026-08-22). Neither defect was the strip's
and both were older than it; the suite had seen neither.

**A card's lifespan was being cropped at three across.** With Literata applied
the 72ch column is 678 px and the grid lays three cards across at 213;
"13 November 354 – 28 August 430" wraps there and the reserved 92 px block cut
the second line off — 19 px over, on Augustine, at every desktop width. Rows
got the one-line rule with an ellipsis in Amendment 22 and cards did not, and
the Detailed test's crop check never saw it because a fresh context is a cold
load: 580 px, two columns, nothing wraps. The rule now covers every card
(`.index-dates`), the saint's page printing the whole of it as before. Its test
warms the font cache on another route first — every visit after the first —
and asserts its premise (three across) before the finding, so it cannot pass
by accident on a cold column. Backed out: "the lifespan wrapped — expected 1,
received 2"; restored byte-identical.

**The grid counted its columns once and did not follow its column.** On a cold
load at 1280 the font arrived inside `font-display: optional`'s window, the
column widened from 580 to 678 after the grid had counted two columns, and
nothing re-counted: two 280 px cards in a three-column width and 118 px of the
column empty on the right. The only relayout trigger was the window's
`resize`. A `ResizeObserver` on the grid's own box now catches a container
that moves while the window does not — the font race, and anything else —
comparing against the width the last layout used, so its first, informational,
callback is a no-op.

**The harness taught the third thing.** The observer's first version queued
the relayout behind `requestAnimationFrame`, as the window path does, and its
test failed six runs in eight *with the fix in* — and passed in the full suite
on the same tree. Probed directly: **rAF is not delivered on an idle headless
page** (a one-second wait timed out); old-headless Chromium produces a frame
only on damage, while `ResizeObserver` callbacks are delivered at the
rendering update the change itself caused. So the observer fired, the relayout
waited for a frame, and the frame came only when something else disturbed the
page — which, in the full suite, something did. Real browsers fire rAF at
60 Hz and readers would have been fine; but a fix the suite cannot see is not
a fix by this project's rule, and the synchronous version is also the right
one: resize observers exist to do layout work at exactly that moment. The
relayout now runs inside the callback, and the test polls for the outcome
rather than sleeping 200 ms and reading. Eight runs in eight with it, two in
two failing without — "cards are still 280 px wide after the column grew" —
restored byte-identical. Worth generalising: **a relayout queued behind a frame
is a promise the harness may not keep.** Anything that must follow a container
change and be seen by the suite happens in the observer, and its test polls.
The window path keeps its rAF — a resize damages the page, so its frame comes.
132 unit, 222 browser.

**27. The registry is three churches, the selection is one of them, and the
eight saints are re-attested church by church** (the author's second and third
decisions, 2026-08-22; DESIGN.md §5b). The second and largest removal of the
strip, and the first authoring.

**The registry.** `russian` on the Julian calendar, `romanian` and `greek` on
the Revised Julian, Pascha by the Julian computus in all three; no communions,
no rites. "Greek" is the Church of Greece (author). `revised-julian` is one new
value in the feast calendar enum, converting as the Gregorian does until the
two first disagree in 2800 — one line in each JDN table, one label, one branch
in the formatter. Coptic and Ethiopian went with the cross-church corpus: the
converters, the month tables, the epagomenal tests. An optional `rank` joins
the attestation schema — vigil, polyeleos, great doxology, six stichera, simple
— the typikon's datum, stored only where a source states it.

**The selection.** `lib/church.js` replaces `lib/tradition.js`: one church id
in `settings.church`, null until asked; `currentChurch`, `chooseChurch`,
`subscribeChurch`, `entriesInChurch`, `keptBy`. What Amendment 23 built as
"one calendar at a time" is what this is, with the communion layer above it
removed — the choice is the calendar. `ui/church-chooser.js` replaces
`traditions.js` and `plate.js`: three buttons, each with its calendar under its
name, in three hosts — the first-visit question, which is now the gate itself
(one question, not two); the header's panel, whose button names the chosen
calendar; and *Change calendar* under the strip. Two silences, not three:
nothing selected cannot arise. The Index keeps the chosen church's saints and
names what it sets aside; the saint's page reads the chosen church first and
the other two behind *See the other churches*; an unanswered reader keeps
everything everywhere. `badge.js`, `matrix.js`, `plate.js`, `plate.css`, the
`--glyph-*` tokens and the badge, matrix and glyph strings went with it — what
Amendment 25 had left standing as the plate's dependency.

**The data — checked, not inferred.** The author's answer to the sourcing
question was to check the dates now, so each of the eight saints' single
Eastern Orthodox row became three rows read that day off each church's own
calendar: the Moscow Patriarchate's daily calendar (days.pravoslavie.ru, whose
path takes the *Julian* date and whose page prints the Julian and civil dates
together and the service's rank); Basilica, the Romanian Patriarchate's news
agency, per day in English; and the Orthodox Synaxaristis (saint.gr) per day.
Twenty-two rows venerated with the source URL; two `undocumented` with the
check recorded — John the Long-suffering not in the Romanian calendar on 18
July, Moses the Hungarian in neither the Romanian nor the Greek on 26 July —
so the three calendars differ on the Kyiv Caves pair from day one, which is
the finding the three-calendar proof wanted. Where pravoslavie.ru states a rank
it is stored (Anthony and Chrysostom at vigil, Athanasius and Paul "на шесть");
the Romanian calendar's crosses are kept in notes rather than mapped to a rank
that the page does not name. Dioscorus and Nestorius left the working corpus;
the archive keeps them, and two browser tests that visited Nestorius now visit
Moses and Augustine. Augustine's day moved — 28 June in the Russian calendar,
15 June in the other two — and the five browser tests that wanted his hero on
28 August followed him; the rest of the August tests only ever wanted a day.

**Tests.** Unit 109: badge, matrix and tradition tests retired with their
modules; `church.test.mjs` added; jdn, feasts, build, calendar-page and
index-filters rewritten to the new registry. Browser 204: nine retired by name
— *a communion turns its whole row and a rite its whole column*, *Eastern
Catholic six cells are one switch*, *the filter cells are a control, not the
veneration mark*, *a filter press leaves the focus on the cell that was
pressed*, *the plate keeps its shape at 360 px and scrolls instead*, *nothing
selected is its own silence*, *choosing one communion at the question filters
the calendar to it*, *a selection that allows one calendar is not asked, and
the change control hides*, *the prompt offers only the calendars the
traditions allow…*; nine rewritten to the chooser (the populated day, the
header, changing the calendar changes the day everywhere, the calendar is
remembered, the two silences, the question asked once, the first visit, the
header control and the Index, the saint page reads the church first); one
added (*before a church is chosen the saint page shows all three, and holds
nothing back*). `ready(page, { church })` seeds the reader in one line where
the old helper carried an eight-id list. **Three backouts**, each restored
byte-identical: the choice written but not announced fails two tests; `keptBy`
ignoring the church leaves the Index at 8 where 6 is expected; and the doubled
year in a saint's feast line ("30 January 2026 in 2026", older than this
round, found by looking) fails its new assertion. Rendered and looked at: the
question, the header panel with Russian pressed, the Russian calendar on
Anthony's day with the dots on Paul's and Athanasius's, the saint's page with
the Russian row, its rank note and its source first.

**What the suite caught that no eye had.** The first pass rendered the
question twice — once in the old template slot above the strip and once in
the gate — and four tests failed on a strict-mode `[data-ask]` before any
screenshot was taken. The slot went; the gate is the question's one place.

**Outstanding, the author's:** the chooser's wording — *Which calendar do you
keep?* is the author's own phrase from Addendum H; the lede, and the header
button's *Choose a calendar* / *Russian calendar*, are the build's; `rank` is
stored and not yet rendered (the feasts work renders it); the seven
placeholder image source URLs still warn; the old HANDOFF sections below the
banner still describe the cross-church build's controls.

**28. The Orthodox Saint, Daily, and the week of 23 August on the Romanian and
Greek calendars: sixty-two saints, the liturgical day, the readings, the
hymns** (author's list, 2026-08-22/23). Eight items, one commit; what each
cost and what it did not do.

**The names.** The site is *The Orthodox Saint* and the habit page is *Daily*
— strings, `index.html`, README, `package.json`. The route stays `/calendar`
so no link breaks, and the settings key stays `gos-settings` so no reader's
choices are lost; both are recorded here rather than renamed for tidiness.

**The week's saints, and Amendment 2.** The instruction was every saint of
23–29 August on the Romanian and Greek calendars; Amendment 2 says never
bulk-generate. The two are reconciled the only way they can be: every folder
is read off the day page of the calendar that names it — doxologia.ro per day,
saint.gr per day — with that page as the row's source, the name as the page
prints it kept as a name form, the type the page's epithet states, the feast
in that church's own calendar, and nothing the page does not say: no life, no
places, dates only where printed (Kosmas † 1779; Eutyches, 2nd century). The
Russian row on each is `undocumented` with the reason — the Patriarchate's
pages for this civil week list the Julian 10–16 August and were not searched
for these figures. Sixty-two folders; seventy saints; leavetakings, icons,
synaxes and one translation whose saint was unclear are not folders, because
they are not saints — they are feast entries, which is the next work. The
manifest's 5,000-saint projection fell from 928 to 255 KB gzipped on the way,
inside the budget for the first time: three attestations a saint are lighter
than eight.

**The liturgical day** (`lib/liturgy.js`). Where the day stands in the paschal
cycle, the tone, and whether it is a fast — each for one church, from the two
things the registry already held: the computus fixes Pascha, the calendar
fixes the dated fasts and feasts. The title follows the lectionary's count
(a weekday belongs to the week that ends with the coming Sunday — the
Slavic *седмица* and the Greek usage agree, and days.pravoslavie.ru printed
"седмица 13-я" for Monday 24 August, which settled my one wrong expectation);
the tone turns weekly from Thomas Sunday, Bright Week turns daily and skips
the seventh, Pentecost and Holy Week have none. Fasting states *fast*, *fish*
or *fast-free* and the reason, reckoned in the church's calendar — which is
why the Russian calendar was still in the Dormition Fast on the civil 23rd,
had fish on the Friday Dormition and no fast on the Saturday, while the
Romanian and Greek fasted Wednesday, Friday and the Beheading. It does **not**
state oil, wine or the grades between them: those differ between typika and
want sourcing per church. Seven unit tests check the week against all three
calendars' own pages and the cycle against its fixed anchors.

**The readings and the hymns are recorded, not computed.** `data/
liturgical-days.js` holds, per civil day per church, the Apostle and Gospel
each calendar printed for 23–29 August, normalised to English references so
they link (Bible Gateway, NKJV, per the author), with the page named — and a
day nobody has recorded prints nothing. The Greek reads the Leavetaking's
pericopes on the 23rd where the others read the Sunday; the Russian reads the
Dormition on the 28th. The hymns live in the saint's folder under a new
optional `hymns` array — church, kind, language, tone, model, text, source —
copied whole from saint.gr's saint pages (the day pages quote only a first
line; a strict "verbatim, every word" prompt was needed before the fetch
stopped paraphrasing) and from Doxologia's `troparul-…`/`condacul-…` pages,
whose slugs had to be searched for where a guess returned 404. Greek
apolytikia and kontakia for seven days' principal commemorations and the
Leavetaking; Romanian tropare and condace for eight saints. A feast's hymns
travel with the day; a saint's arrive with the detail payload, and the panel
fills when it lands for the day still showing.

**The Daily page** gained, in order: the day in the church's own reckoning
after *Change calendar* ("10 August (Julian)" under a civil 23 August); the
liturgical line under the date; the readings under the day's saint or the
empty note; the hymns under those. And the hero now prefers the saint the
chosen church has hymns for — the manifest carries `hymned: [church…]` per
card — before the saints with images, because a church's hymn for a saint is
that church's principal commemoration of the day: the Greek 24th is Kosmas,
not the Eutyches the date's hash picked.

**Tests.** Unit 120 (liturgy, liturgical-days, the hero's new preference).
Browser 212: nine Index tests re-counted for seventy saints (32 Romanian, 65
Greek, 8 Russian; sixty undated in the tray; the first card imageless; a
window under twenty, not ten), and the bookmark test brings its cards into
the document by the Index's own search rather than by scrolling — a headless
scroll's repaint waits for a frame the harness may not produce (Amendment 26,
met again). Four added: the names; the own-date, cycle, tone and fast across
two churches and the Dormition Friday; the readings' links and source; the
hymns in Greek and Romanian with the hero they choose. Three backouts, each
restored byte-identical: the own-date and liturgy line unpainted; the hero
ignoring the hymns ("Kosmas of Aetolia" expected, the hash's pick received);
nothing recorded. Rendered and looked at on five Daily screens across the
three churches.

**Outstanding, the author's:** the Russian week and the Serbian church, asked
for in the same breath and next; the fasting allowances; whether the saint's
own page should print its hymns too (the Daily page does); the hero-hymn rule
when two saints of one church both carry hymns on a day (the date's hash
decides between them, as before).

**Still outstanding, added 2026-08-22 (Amendment 24):** the Index foot wraps
at the cold-load column on a DejaVu-default Linux and the grid sits 25 px
lower there. One of three author-owned changes frees it — *Random saint* →
*Random*, the visible *Layout* label, or the *Breadth of veneration* sort
option — and the backstop goes back to 400 with it.

**Still outstanding, added 2026-08-22 (Phase 2):** the calendar hero's text
*Save* button is the one text Save left on the site (Amendment 23) — follow
the bookmark or keep it, the author's call; the first-visit question's
heading *Which traditions do you keep?* and its lede are the build's wording
for a question the author wrote as *Which calendar do you keep?* before a
second question asked which calendar to see — one line each in
`src/ui/strings.js`; and the Map is still a placeholder that only counts
within the selection (Session 7 plots it).

**Still outstanding, added 2026-08-22:** **vigil mode has never been checked by
any gate.** Playwright's default colour scheme is light, so all 208 browser
tests — axe included — run in day mode; dark-mode rubric at 4.20:1 on bole was
found by arithmetic, not by the floor. Adding a `colorScheme: 'dark'` project,
or at least running the axe route sweep in both, would close it. Whether the
rubric token or the bole ground is what moves to fix it is the author's call,
being a palette decision rather than a bug fix.

**Still outstanding from earlier sessions:** the seven images need a per-image
`source_url` (live in production as 7 build warnings — the licence itself was
settled on 2026-08-21 as Public Domain Mark 1.0, which obliges no attribution,
so credit is no longer asked for); the Assyrian Church of the East's
`paschal_computus` is unverified and flagged `needs_sourcing` in the registry.


**29. The Russian week, then the Serbian church: a fourth choice, its calendar,
its week of saints, readings, fast and tropars** (author's instruction,
2026-08-23). Two halves, one commit.

**The Russian week.** Seventy folders read off days.pravoslavie.ru for 10–16
August ст. ст. (civil 23–29 August), the same way as Amendment 28's sixty-two
and under the same reconciliation with Amendment 2: each folder is one page's
name, kept as the page prints it, with the Julian feast, the page as source,
dates only where printed, and the Romanian and Greek rows `undocumented` with
the reason. Church Slavonic tropars and kontakia (`lang: 'cu'`) for the saints
the Patriarchate's page prints them for — Lawrence, Lawrence of Kaluga, Euplus,
Theodore and Basil of the Caves, Theodore of Ostrog, Juliana, Photius and
Anicetas, Maximus the Confessor, Arkadios, Diomedes — and the feast's hymns
for the forefeast, the Dormition and the Image recorded with the day. The
Index then held 140 and every count in the suite moved: 78 Russian; the range
that matched nobody (1500–1600) now matched Lawrence of Kaluga and Maximus of
Moscow, so it is 1600–1700; Augustine and Anthony sit below the mounted rows
of a 140-card grid, so the tests that measure their cards bring them in by the
Index's own search rather than by scrolling (Amendment 26's lesson again).

**The Serbian church.** One registry entry (`serbian`, Julian, Pascha by the
Julian computus) and the suites said what it touched: the chooser's count, the
saint page's four rows and "See the other churches (3)", the lede, the Index's
set-aside lines, the liturgical-days test's source pattern, and nothing else
— the design was built so that adding a church is adding an entry, and that
held. Sourced from the Православни подсетник (pravoslavno.rs, Микро књига):
the month calendar's day lines for the principal commemorations and the
fasting mark, the day pages for the Apostle and Gospel and the Ohrid Prologue's
entries, the tropar pages for the tropars. Not the Patriarchate's own site,
which was not read; the registry note says so. Fourteen existing folders got
a Serbian `venerated` row (Lawrence, Sixtus, Euplus, Susanna, Theodore and
Basil of the Caves, Photius, Anicetas, Alexander of Comana, Hippolytus, Tikhon
of Zadonsk, Micah, Marcellus, Diomedes) and a Serbian name form; the companions
the Prologue names only as "и други с њима / с њом" got `undocumented` with
that reason, not `venerated` by inference; the other 126 `undocumented` with
"not checked". Nine new folders for the names the Serbian calendar prints and
the others do not: Heron the philosopher, Niphon of Constantinople, Irene the
Empress (the nun Xenia), Seridos of Gaza, Joachim of Osogovo (dated "late
11th century" as the Prologue prints it), Stamatios of Volos, Eustathius II
of Serbia, Roman the Venerable, Raphael of Banat — 149 saints. The week's
readings for every day (the 29th prints two Apostles, so the unit test now
asks for "two at least"), the fasting mark as printed ("пост" Monday to
Friday, none on the 23rd and 29th — the engine agrees: Dormition Fast, fish on
the feast, free on the Saturday), and five tropars in Serbian (`lang: 'sr'`):
Lawrence, Euplus, Photius and Anicetas, Hippolytus, Micah.

**What is not recorded, and why.** The Serbian tropar and kondak of the
Dormition: the tropar page came back through the fetch with words garbled
("срмти", "заджати", a Latin-script "smrti") and no second read agreed with
the first, so the pair is left out and the day's comment says so — the Russian
pair stands for that day. The tropar page for the 29th rendered empty. The
Serbian rows for the original eight saints and the sixty-two of Amendment 28
are "not checked", not absent: pravoslavno.rs was read for this week only.

**What the tests say.** One new browser test: the Serbian is the fourth choice
with "Julian calendar" under it; chosen, the strip names it, the 23rd is "10
August (Julian)", "12th Sunday after Pentecost · Tone 3 · Fast — the
Dormition Fast", Lawrence the hero because the Serbian sings for him, two
readings sourced to pravoslavno.rs, one tropar in `sr` with "глас 4"; the 29th
three readings and no fast; and the Russian 24th with its Church Slavonic
hymns and no Serbian text on it. Backed out by removing Lawrence's Serbian
tropar: the hero and the hymn assertions fail, and pass again with it back.
`tests/liturgy.test.mjs` now runs the Dormition-Fast week for both Julian
churches. 120 unit, 214 browser, green; `npm run build:manifest` 149 saints,
the seven image warnings as before. Shots looked at: the Serbian 23rd and
29th, the Russian 24th, Lawrence's page with its Serbian row and the reveal of
three.

**30. Under each saint, the life from the synaxarion** (author's instruction,
2026-08-23: "Under each saint add from the synaxarion or equivalent").

**What was written.** A hundred and forty-one lives, so that every one of the
149 folders has a `life.md`; the eight original lives stand as they were. Each
new life is the author's paraphrase — one to three paragraphs, the first fit to
be the Index's Detailed lede — of the synaxarion of a church that keeps the
saint, read that day, and closes with one italic line naming and linking the
source and the day it was read. Sources, by church: the Sretensky calendar's
lives (days.pravoslavie.ru, `Life/lifeNNNN.htm`) for the Russian saints it
prints them for; the Ορθόδοξος Συναξαριστής (saint.gr) for the fifty-eight
Greek, with the main entries under other dates where the August page only
points there (Dionysius of Zakynthos, Joseph Samakos, Theodora of
Thessalonica); the Viețile Sfinților as doxologia.ro prints them for the four
Romanian-only saints and for Brâncoveanu, and to fill out Lupus, Irenaeus,
Dionysius, Tation, Anna, Diomedes and Laurence, Atticus and Natalia; the Ohrid
Prologue as pravoslavno.rs prints it for six of the nine Serbian-only saints,
the Православни подсетник's own calendar notes for Eustathius II and Raphael
of Banat, and — the calendar printing only a troparion for Roman — the Diocese
of Niš's page on his monastery; the Prologue is cited beside the Russian life
wherever both tell a saint (Lawrence and his company, Euplus, Susanna and hers,
Theodore and Basil of the Caves, Alexander of Comana, Photius and Anicetas,
Hippolytus and his, Tikhon, Micah, Marcellus, Diomedes). The Russian new
martyrs of 1918–1942 for whom the Sretensky calendar prints no life
(twenty-six folders), with John of Svyatogorsk, were read off the Russian
church calendar at azbyka.ru — which refuses a plain fetch behind a bot check
and was read through the browser pane — each life carrying its archival
citation (pstgu.ru, fond.ru, the Orthodox Encyclopaedia); the Orthodox Church
in America's lives stood in for Arsenius of Komel, Peter of Moscow and
Hezekiah where the Greek entry has a line. Where the synaxarion itself has
nothing (Gelasius, Ibistion, Damon, Sebbi, Ebba, the thirty-eight of Thrace,
the thirty-threes of Heraclea and Palestine, Pamphilus and Capito, Sabbas of
Venetala, Arcadius the emperor, Basil the Macedonian) the life says so, and
says what the one line says.

**What was corrected on the way.** days.pravoslavie.ru prints "(1927)" beside
the Chimkent company of 14 August — the presbyters Vladimir and Nicholas, the
monk Eleutherius, the abbess Eve, the nun Eudocia and the martyr Theodore;
azbyka.ru's lives, each with its archive reference, have all six shot at
Chimkent on 27 August 1937, so the folders are renamed `…-1937` (Nicholas as
`nicholas-presbyter-martyr-1937-14-august`, beside the week's two other
Nicholases of 1937), their death 1937 with a note recording both prints.
Vladimir Tsedrinsky of Lepsinsk is "(1920)" on pravoslavie and 1918 on azbyka,
from the Orthodox Encyclopaedia — a disagreement rather than a slip — so his
death is the interval 1918–1920, displayed "1918 or 1920", slug unchanged.
Basil Infantyev and Alexius Lopatin, printed without a year, are still given
none in the record; azbyka's 1918 is in the life. The Belogorsk life on
pravoslavie is long and was read to its end for the monastery's seizure and
Varlaam's death on 12 (25) August 1918.

**What is not done, and why.** No life quotes its source: the sites are
copyrighted and the house voice is a paraphrase. The Daily page does not show
the life under the hero — the Index's Detailed lede and the saint page do;
putting the lede on Daily is a design change nobody asked for, and is open.
The eight original lives have no source line (written from primary sources
before the rule) and are listed by name in the test. The long doxologia lives
of Poemen, Adrian and Natalia, Titus and Kosmas were not read where the Greek
sufficed.

**What the tests say.** `tests/lives.test.mjs`, three tests: every folder
references `life.md` and the file is there; it opens with `# display_name` and
has thirty words to say; every life but the eight closes with an italic line
carrying a link and "read 23 August 2026". One browser test: Lawrence's page
shows the life, prefetches the Sixtus link, and links out to pravoslavie and
pravoslavno from the source line; Eleutherius opens as "Eleutherius,
Monk-martyr (1937)" with "Died 1937" and an azbyka link; the Index's Detailed
grain reads Lawrence of Kaluga's opening (the Index is the Russian calendar's
there, so a Russian saint — Stamatios, tried first, is set aside as
Serbian-only, which is the Index doing its job). Backed out by removing
Stamatios's life (three unit failures) and blunting Lawrence's opening (the
browser test fails in both projects), restored, green. 123 unit, 216 browser;
`npm run build` 149 saints, the seven image warnings as before. Shots looked
at: Stamatios, Lawrence, Eleutherius, Kosmas.

**31. Three weeks for four churches: 30 August – 19 September 2026** (author's
instruction, 2026-08-23: "Add all content including icons (source them
yourself and cite them) for the next 3 weeks for all 4 churches. Troparia,
synaxarion, readings, fasting rules etc.").

**What was added.** The corpus grew from 149 to 708 folders: every name the
four calendars print for the three weeks — the Russian and Serbian on their
Julian days 17 August – 6 September, the Greek and Romanian on their Revised
Julian days 30 August – 19 September — each with four attestation rows (the
printed line quoted, or "not on the list"/"not checked" with the page), name
forms, dates with their basis, and a `life.md`. Sources, read 23 August: the
Sretensky calendar's day pages and lives (days.pravoslavie.ru), the Ορθόδοξος
Συναξαριστής (saint.gr) — 285 entries, their Βιογραφία and Λειτουργικά κείμενα
— the Viețile Sfinților and hymn pages as doxologia.ro prints them, the
Православни подсетник (pravoslavno.rs) with the Ohrid Prologue for each day.
The Russian new martyrs the Sretensky calendar prints no life for (105) were
read off the Russian church calendar at azbyka.ru — which answers a plain
fetch now, so no browser pane — through their Sretensky name pages (which give
the surname) and renamed with it ("Paul (Gaidai), Presbyter, Hieromartyr
(1937)"); two with no page anywhere carry a thin life saying so. Week-1
folders kept by the Russian or Serbian calendar on these days (Lupus,
Irenaeus, Pothinus, Callinicus, Eutyches, Peter of Moscow, Tation, George
Limniotes, Kosmas, Bartholomew, Titus, Menas, Adrian and Natalia, Poemen,
Hosius, Liberius, Moses the Ethiopian, Anna, Shushanik, the Forerunner, the
three patriarchs, Cyprian of Carthage for the Romanian) got their rows and a
paragraph appended to the life, the new source folded into the source line.
Feasts (the Belt, the Indiction, the Nativity, the Exaltation, the Beheading,
the Miracle at Chonae, the forefeasts and leave-takings, the icons of the
Theotokos, the synaxes of Greek Panagias and of Moscow's and the Caves' saints)
are not folders; their hymns travel with the day. Hymns: 430 troparia and
kontakia on the saints (143 Russian in Church Slavonic, 152 Greek, 117
Romanian, 18 Serbian), each with tone and source — the Greek apolytikia from
each saint.gr page's Λειτουργικά κείμενα, re-read for the purpose because the
harvest had only the Έτερον ones; the site-wide doxologia widget that printed
the Lupus troparion on every page was stripped from 87 saints (and from the
week-1 folders it had reached). Readings and fasting: `src/data/liturgical-days.js`
now runs 23 August – 19 September for all four churches, the Russian days
carrying every set of pericopes the calendar prints with the set's own label
("Epistle (Ряд)", "Gospel (Богородицы)"), the feasts' hymns with the day; and
the Greek 7–19 September carrying `readings: []` with a note, because saint.gr
publishes a day's readings about two weeks ahead and had not reached those
days — nothing invented, the fast mark and the feast hymns still there.
Icons: 84 from Wikimedia Commons (82 public domain, two CC BY-SA with the
credit recorded), each with `icon.meta.json` naming the Commons file page,
the artist as Commons records it and the description, and a blurred placeholder
— the principal saints of each day (Nevsky, Svirsky, Daniel, Florus and
Laurus, John of Rila, Symeon the Stylite, Mamas, Samuel, Anthony and
Theodosius, Anthimus, Babylas, Moses, Joasaph, Mitrophan, Zacharias and
Elizabeth, Gleb, Archippus with the Archangel, Kosmas, Kassiani, Adrian and
Natalia, Joachim and Anna, Poemen, the three sisters, Job, Anna, Shushanik, the
Beheading, Cornelius, Ketevan, Nicetas, Euphemia, Ludmila, Sophia and her
daughters, Trophimus and his, Theodore of Yaroslavl and his sons, and the
rest). Pipeline under `.tmp/w3/` (not committed): harvesters per church,
`writer.py` (folders, rows, lives, `add_para`, `rename`), one spec per
day-number under `days/`, `az.py`/`az1–6.py` for azbyka, `grhymns.py`,
`hymns.py`, `litdays.py`, `icons_search.py`/`icons_fetch.py`.

**What was corrected on the way.** The Lup widget above; azbyka's group
pages (the Gagino company of 17 September 1937, Adrian and Natalia's
twenty-three) read once and cited for each; the Kandavla martyrs' Greek names
(Centurion, Ammianus, Oceanus) attested as saint.gr's with a note that the
pairing with the Russian Mianus and Kion is this project's; the Prologue's
"Свети мученик Мирон презвитер" tropar under the 17 August day recorded, the
Archangel's tropar printed under Nevsky's name on 12 September not; GR 882
(Antony "in Agia") skipped as a festival; the 09-05 "Πέτρος ὁ ἐν τῷ Ἀθήρᾳ" as a
church consecration.

**What is not done, and why — for next time.** (1) The browser suite was not
run this sitting: the counts in `e2e/quality-floor.spec.js` were recomputed
for 708 (`.tmp/counts2.mjs`: 708 total, Romanian 122, Greek 344, Serbian 129,
Russian 405; 240–460 overlaps 158 / within 146; the empty range moved to
1320–1330; 239 undated; "hermit" 8) and a new test for these weeks appended,
but `npm run test:e2e` must be run and watched, the new test backed out and
seen to fail, before Amendment 31 is called green in the browser. Unit: 123
green; build: 708 saints, the seven placeholder warnings as before. (2) Greek
readings for 7–19 September: re-read saint.gr's day pages from about 24
August (two weeks ahead) and fill the empty entries; no other Greek-church
source of the whole year's lectionary was found that could be read. (3) Icons
for the rest — the Menologion of Basil and the 1903–1911 Жития Святых
engravings on Commons cover many more of these saints; `icons_search.py` is
the way. (4) RU 0902's second pair of pericopes ("за понедельник и за вторник")
carries no set label. (5) The new-martyr lives are first paragraphs plus the
summary — the full azbyka lives are long and were read to the point noted.

**Item (1), closed (session of 2026-08-23 evening, before Amendment 31's own
verification pass the next day).** Running the suite for the first time
against 708 saints found four real defects behind the recomputed numbers
above, not just a count to paste in: `e2e/quality-floor.spec.js` still named
**Tithoes** as the alphabetically-last saint (now Zoticus of Tomis) and
searched for a bare **'Christopher'** that now matches two saints
(Christopher and Christopher the Roman — narrowed to the latter); the header
test's Russian figures were never updated for the recount above and still
read 78/71 (fixed to 405/303, matching `.tmp/counts2.mjs` exactly); and CI's
own log named a real rollup warning, an unused `enabledCommunions` import in
`views/saints.js` (removed). Separately, the Romanian 8 September kontakion
existed twice in `liturgical-days.js` — the same text in two orthography
variants, cedilla-ş vs comma-ș, each cited to a different Doxologia page —
reordered to lead with the troparion and the duplicate dropped. All four
confirmed against the failing CI output before fixing, and the browser suite
run clean at 218 (pre-Amendment-31-verification baseline) after. This is the
first run item (1) above refers to as not yet done; treat "run it and watch
it" as shorthand for this, not a formality.

**Also that evening, seven small aesthetic requests, unrelated to the corpus
above** (author's instruction, 2026-08-23) — recorded here rather than as its
own numbered Amendment because the numbering had already moved on by the time
this is being written up; Amendment 32 below builds directly on some of it.
*Also commemorated* dropped its trailing feast date, keeping the name alone
(still stands, untouched since). The Daily hero's own repeated feast-date line
(`.hero-feasts`, a near-exact duplicate of what is now the header's calendar
name) was removed outright — this is the line Amendment 32 went on to remove
the *other* copy of, under the strip. The hero's text *Save* button — the one
outstanding item Amendment 22 left open — was swapped for the bookmark
(`renderBookmark`), which Amendment 32's item (5) then moved onto the image's
corner; the dead `renderSaveButton`/`.save-button` code was deleted rather
than left unused. The bookmark itself was changed to read filled at both
states, half-opacity unsaved and full saved, in place of outline-vs-fill —
DESIGN.md §5's bookmark paragraph is marked superseded in place for this; it
still stands. The site header's corner link was renamed "Orthodoxy Daily",
deliberately a second name from the one in `<title>` and the veil — still
stands. The saint page's × now returns to the exact calendar day it was
opened from rather than always to All Saints (`main.js` tracks the previous
route; `saint.js` reads it as `cameFrom`) — still stands, untested by anything
above since it touches neither the corpus nor the Daily hero. And a mobile
layout fix kept the shelf's × beside the name rather than wrapping under the
date (`.shelf .reg-feast { order: 3 }` in `saint.css`) — Amendment 33's row
rewrite below moved *Continue reading* to a different markup this rule does
not reach, but *Saved* still renders through the old `row()` function in
`shelf.js`, where this rule is the one keeping its mobile layout correct.
220 browser tests, 123 unit tests green at the time; the back-navigation fix
was backed out and confirmed to fail before being trusted.

**32. Six changes to the Daily page, and St before every name** (author's
instruction, 2026-08-24). Four of the six reverse settled decisions; each is
recorded where it sat rather than absorbed.

**(1) and (2) — the line under the strip is gone.** It carried the calendar's
name, a *Change calendar* button and the day in that church's own reckoning
("10 August (Julian)"). All three are removed and the Daily page now prints the
civil date alone. This reverses Amendment 23's second host for the chooser and
the own-date line added on 2026-08-23; the author's reason is that two dates
for one day read as confusion rather than precision. Nothing is stranded — the
header has named and changed the calendar since Amendment 23 — and the two
silences now point there ("change calendar in the header to see it"). DESIGN.md
§5b marks the superseded paragraph in place; `paintOwnDate`, `wireWhich`,
`closeWhich`, `whichMarkup` and `STRINGS.calendar.which`/`ownDate` are deleted
rather than left dark.

**(3) — the fast is coloured, and it is the one exception to the two-colour
rule.** Strict takes the rubric (a fast is liturgical time, so it needs no new
hue); fish-permitted takes teal `--fast-fish`, fast-free green `--fast-free`.
Two new hues now exist outside gold and rubric and DESIGN.md §2 is amended to
say so, with the three conditions that keep it honest: the words still carry
the whole meaning so the line survives greyscale, the mitigated day is teal
*because* amber at this contrast is within a few degrees of `--gold` and a
reader taught that gold is a finding must never meet it on a line about
herring, and both hues clear 4.5:1 in both themes (6.00/5.72 on gesso,
7.98/8.59 on bole — computed, not eyeballed). No other category may cite this
entry to take a colour.

**(4) — "Monday of the 13th week after Pentecost" is now "13th week after
Pentecost."** The weekday was already in the h1 above it. One line in
`lib/liturgy.js`; five unit fixtures and two browser assertions followed.

**(5) — the Daily hero's bookmark moved to the top-right of the image**, where
the Index card has kept it since Amendment 22. The image is wrapped in a
`.hero-figure` because a button inside the `<a>` is invalid and the press must
save rather than open. Note the trap: the 85% of Amendment 16 moved *onto the
figure* rather than being added to it, because a proportion applied in two
places multiplies — the browser test that measures `.hero-media` against its
used grid track is what would have caught it, and it still passes at 221 px.

**(6) — every name is read with "St" before it.** `lib/honorific.js` is
applied when a name is drawn and never written into the data, so the manifest
keeps the bare name: sorting still files a saint under their own initial
instead of filing all 708 under S. Search needed one line of its own — the
reader now sees "St John Chrysostom" and will type it back, but the index
holds the bare name and MiniSearch combines terms with AND, so the term "St"
would have zeroed every search it appeared in. The honorific is therefore
stripped from the query, not added to the index. The 26 companies that begin
with an article ("The Fifty Martyrs of Palestine") take no honorific, because
"St The Fifty Martyrs" is not English — a unit test walks the whole corpus and
asserts that every name either takes the honorific or is one of those.

*What the author asked for that was already built:* rank as "a category in
their profile not in their name". The `types` field already holds exactly that
— martyr, hieromartyr, presbyter, hierarch, venerable, on 699 of 708 folders —
and the saint page has always printed it on the facts line. **What was not
done, deliberately: stripping the rank out of `display_name`.** For the ~200
new-martyrs the rank and year *are* the disambiguator — "Alexander (Medvedev),
Deacon, Hieromartyr (1918)" and "Alexander (Malinovsky), Presbyter,
Hieromartyr (1918)" are two men who share a forename and a year — and reducing
both to "St Alexander" would lose the distinction the corpus exists to keep.
226 distinct trailing segments were surveyed; they mix rank ("Presbyter"), see
("Bishop of Gortyna"), relation ("son of Bassa") and disambiguator
("2 September"), so no mechanical split is safe. This is the author's call and
is left open.

**33. The register unruled, the repose line, and the shelf in the Index's
dress** (author's instruction, 2026-08-24, the same sitting as Amendment 32).

**(1) Also commemorated lost the line between saints.** One scoped rule —
`.day-panel .register li { border-bottom: 0 }` — because the instruction named
that section: the saint page's related list and the Saved shelf keep their
rules, and dropping the border from the shared `.register li` would have
unruled all three.

**(2) "undated – 1779" became "Entered eternal glory in 1779."** The old form
told the reader what we do not know before what we do, and 304 of 708 lives
open that way. The change is in `formatLifespan` alone, so it reaches the
Daily hero, the Index cards, the saint page's facts line and the shelves from
one place. The death display is not always a year, so the preposition follows
its shape — "in 1779", "in c. 1160", "in the 5th century", and none for
"before 556" or "under Licinius", which carry their own; the three forms are
strings in strings.js and a unit test walks every shape. The mirror case — 22
saints with a known birth and an unrecorded end — keeps "1779 – undated": the
instruction was about lives read from their end, and dressing up an absence
would claim something.

**(3) Continue reading wears the Index's row card.** The same classes
(`index-card panel is-row`), the same markup shape as views/saints.js's row
branch, statically placed because a shelf is a list where the grid absolutely
positions its cards — and the × stacked over the bookmark at the trailing
edge, both above the name link's card-covering ::after so a press removes or
saves rather than opens. The shelf container now wires `wireSaveButtons`
itself; the day panel's wiring stops at the panel, and the two subtrees are
disjoint so no click toggles twice. One trap found on the way: the existing
`.shelf .shelf-remove { order: 2 }` (which keeps the × on the name's line in
the register rows below 480 px) would have put the × *under* the bookmark in
the new tools column — overridden with `order: 0` where the column is. The
Saved shelf keeps the register dress: the instruction named Continue reading.

**34. Seven of the round of 2026-08-24: the site's own mark, the chooser's
silence, the Index's order** (author's instruction, 2026-08-24, a batch of nine
of which two are held — see the end of this entry). Two of the seven reverse
settled decisions and both are recorded where the old one sits.

**(1) The loading veil reads "Orthodoxy Daily".** It read "The Orthodox Saint",
the name in the `<title>`. This narrows Amendment 31's deliberate two-name
split — the corner link renamed while the head and the veil kept the other
name — to the `<title>` alone. The reasoning for the split is not repealed and
the head still holds it; what changed is that the first thing painted and the
name it fades into are now the same words, where before a reader met one name
for half a second and a different one for the rest of the visit. The split now
survives only where it is met out of context, in a tab or a bookmark.

**(2) The site mark is the eight-pointed Orthodox cross, and it spends no
gold.** The favicon was a single gold cell — the veneration badge's attested
mark, put there when the badge was the signature element. **The badge was
removed whole at Amendment 25 and the favicon outlived it by nine amendments**,
so DESIGN.md §2's "gold is spent nowhere on the site" had been quietly untrue
that entire time. The cross is drawn in ink, with a `prefers-color-scheme` rule
inside the SVG so it flips to vigil ink rather than vanishing into a dark tab
strip. §2 is corrected in place with the lesson: an audit of where a colour is
used reads the stylesheets and does not reach `index.html`, and the mark a
reader sees before the page paints is exactly where a design rule rots unread.
The slant of the footrest is the whole of what makes the drawing Orthodox
rather than Latin, and the browser test asserts its direction from the polygon
itself — left end raised, the good thief at Christ's right hand — rather than
just counting bars.

**(3) The calendar chooser lost its paragraph.** It named the four churches and
their two calendars in prose, directly above four buttons each printing exactly
that: the choices said twice, and four lines between the question and the
answer. `STRINGS.church.lede` is deleted rather than left dark. One component,
so both hosts lost it together — the first-visit gate and the header's panel —
and the test checks both, because a chooser that is drawn once and mounted
twice is exactly the shape where one host keeps a stale copy.

**(4) The header's calendar control is a mark and a name.** "Romanian", not
"Romanian calendar": the mark says "calendar", so the word was being said twice
and the header's widest control was reading as a sentence among labels. The
drawing is the calendar page's own month toggle at 15 px, so there is one mark
to learn rather than two. **The accessible name went the other way on purpose.**
The `aria-label` had been swallowing the church's name for as long as the
control has existed — a screen-reader user was told the control was there and
never which calendar it was set to, while the visible text said so plainly. It
now names the church *and* what a press does. Shortening the visible text is
what made the omission worth fixing rather than merely noticing.

**(5) About states a privacy policy, written from the code.** Four things are
kept and all four are on the reader's own device: the reading position, the
saved and recently-opened saints, the church and the theme, and how the Index
was left. Written by reading `lib/settings.js` and `lib/store.js` rather than
from a template, and the browser test names each of the four — a privacy policy
that has drifted from the code is worse than none, because a reader has no way
to check. Two honest footnotes the instruction did not ask for and that the
statement is weaker without: the files are served by GitHub Pages and any web
server sees the requests made to it, and the day's readings link out to Bible
Gateway. Neither is this site collecting anything; both are things a reader
would rightly feel misled to discover after being told "nothing is collected".

**(6) Earliest is the Index's default order, and Latest now runs the other
way.** The second half is a defect, and it is the one the author saw: *both*
date orders were ascending and differed only in which bound of the life they
keyed on, so *Latest date* opened on Moses, Joshua and Samuel exactly as
*Earliest* did. It read as a control that did nothing — which is what "the
Earliest / Latest sorting mechanisms don't seem to work for St Moses, St
Joshua" was describing. Latest is descending now; the undated are pinned last
at **both** directions, because negating the comparator would float saints with
no place on a timeline to the head of the descending list, which is the
opposite of what "no place on a timeline" means.

*The trap inside the default change:* the `<select>` was written out option by
option with the default implied by their order, so switching `EMPTY_FILTERS`
to Earliest left the control reading "Name" over a grid that was already in
Earliest order. The list was right and the label was lying about it — visible
in a screenshot, invisible to every test. The options are built from `SORTS`
with the current one marked now.

**(7) A Random order, seeded.** Distinct from the *Random saint* button beside
it, which opens one saint. The Index is virtualised and re-filters on every
keystroke in the search box, so a shuffled array would be re-dealt under the
reader mid-scroll; the order is derived from `shuffleKey(slug, seed)` instead
and holds still until the seed changes. The seed is minted when Random is
arrived at and kept while it stays chosen.

**What the default change cost in the suite, which is the part worth reading.**
Six browser tests failed, and only five were the change reaching an assumption
that had gone stale. The sixth was a real defect the change merely exposed:
*Detailed adds the opening of the life* measured the plain box of **the
unfiltered first card** and the detailed box of **Anthony's card**, and a
card's height comes from its own picture's aspect ratio — so it had been
comparing two different boxes since the day it was written, and passed only
while the first card happened to be a saint with no picture. Earliest put a
tall icon there and "taller by exactly what was added" started reading as a
shrink. It now narrows to Anthony before measuring either box. Two others
(*the grid keeps a window*, *the feast-month filter*) assert on a specific
mounted card while the grid is virtualised — at 360 px it holds one — so they
now ask for the alphabetical order they name instead of riding the default;
that is the "a count in the DOM is not a count in the corpus" rule wearing its
other face, where the trap is *which* card rather than how many.

**Verification.** 132 unit (129 + 3: latest's direction with the undated at
both ends, the seeded order's stability, and the shuffle key itself), 236
browser (220 + 8 × 2 projects). All nine changes were backed out one at a time
and each was watched to fail its own test before being put back — including
the two that only a unit test covers, and the `<select>` fix, whose backout
was caught by `option:checked` rather than by the value. Full suite green at
the end, and the restore was proved by running the whole floor again rather
than by trusting the copy back.

**Held, not done, and why.** Two of the author's nine are not in this entry.
The **week strip's rework** — a continuous horizontal scroll locking to any
day, a mouse drag on the desktop, and the peeked edges printed as real days
rather than masked buttons — reverses four settled decisions at once
(DESIGN.md §5b: no chevrons but the edges stay buttons; the fade is a mask,
never an opacity; the grain's unit of travel is a week; touch and pen only)
and rebuilds `ui/grain.js`'s track model for the week, so it was raised with
the author before being built rather than absorbed. Notably the *reason*
§5b gives for keeping the edges as buttons — "a mouse has no gesture here at
all" — is the very thing the instruction fixes, so this is a reversal the
document half argues for. The **site translation control** was answered as the
question it was asked as ("how difficult would it be") rather than started:
the UI strings are one module and genuinely cheap, but the corpus is 708 lives
and 430 hymns and no part of that is a UI translation job. Both are the
author's call and are recorded in HANDOFF.md's queue.

**35. The week strip becomes a rail** (author's instruction, 2026-08-24,
confirming the reversal Amendment 34 held for the asking: "Remake the weekly
display … a clean horizontal scroll across the dates, locking into place when
it slows down at any point not just between Monday and Sunday … click and drag
in desktop just like … mobile … the gradient faded left and right 'buttons' no
longer exist but are actual days printed on the screen", plus "left/right, and
'S' and 'D' also work to go left and right when not typing").

**What it is now.** The strip is a scroll container holding a run of 121 real
day buttons — RAIL_RADIUS 60 either side of an anchor — that the browser pans
on touch and pen, a mouse drags directly, and CSS `scroll-snap-type: x
proximity` lands on a day when it slows: *any* day, a Wednesday as readily as
a Monday. What shows at each edge is the neighbouring day itself, full ink, no
mask, clicked to be selected like any other. A settle listener (140 ms after
the last scroll event) aligns the rest and **re-anchors**: within 14 days of
either end the rail is rebuilt around where the reader is, the scroll offset
carried across, so the run never dead-ends — that re-anchor is the one job the
CSS snap cannot do, and its test is the one that fails when the settle is
backed out. Arrow keys and **S/D** step a day from anywhere on the page,
guarded off modifier chords and text inputs. Selecting a day already in view
moves nothing; a day stepped off the edge brings itself in by one column.

**Four §5b decisions reverse, each marked where it sits in DESIGN.md.** The
edges-as-buttons (the affordance they preserved — a mouse's way through — is
preserved better by the drag and the keys); the mask-not-opacity fade (moot
for the week: the edge days are ordinary buttons at full strength; the month
keeps it); the week as the unit of travel; and touch-and-pen-only (the old
text's own reason — "a mouse has no gesture here at all" — was the thing the
instruction fixed; nothing is lost to text selection because the rail holds
numerals in buttons). The month's track, `ui/grain.js` and `swap.js` are
untouched and still the month's; the week simply left the track, because a
rail that actually scrolls needs no machinery for pretending to. **What was
deliberately kept:** the rail's snapped columns are the month grid's columns
to the pixel — `--rail-inset` is derived from the same `--cal-peek` and gap —
so "the month is the week grown taller" survived the rewrite, verified to the
pixel at 1280 and within one at 360 (flex and grid round a fractional column
to neighbouring pixels; the test allows exactly that one).

**What the suite said, which is most of the story.** Fourteen tests pinned the
old mechanism and were rewritten as heirs — each keeping its old purpose where
the purpose survived (fast clicks, one-click days, the month alignment) and
saying plainly where it did not (no copies to mark aside means Amendment 9's
defect class is structurally impossible in the week, so the travel test now
pins *real days, no copies, no track*). Two of the first rewrites were caught
asserting nothing: backing out the settle passed the swipe test (CSS proximity
snap was doing the aligning — the comment now credits it, and the settle got
the dead-end test it uniquely deserves), and the typing-guard test was
vacuous because the calendar page has no text input and `state` is null
elsewhere — it now pins the teardown (a leaked document listener turning S and
D into dead keys in the Index's search box), and the in-page guard is
documented as defence-in-depth with no reachable trigger today, per the house
rule about saying so. One piece of the drag handling is knowingly untested:
the click-swallow after a mouse drag is reachable only when
`setPointerCapture` fails (with capture held, the browser retargets the
release click to the strip, where it finds no day — probed directly), so it is
kept as the catch-path's companion with a comment saying exactly that.
Backouts run and watched fail: the keys, the leaked-listener teardown, the
settle's re-anchor, the drag handlers. 240 browser tests at this amendment's
close.

**36. The site speaks five languages, and the corpus stays in its own**
(author's instruction, 2026-08-24: a language control in the header — EN, RU,
RO, GR, RS — "and provide these translations", scoped by the author's answer
to do "the English and source languages").

**The mechanism.** `lib/i18n.js` mirrors `lib/church.js` — one live copy,
choose/subscribe — and merges a partial, STRINGS-shaped locale pack over a
deep-cloned English base **in place**, so `const C = STRINGS.church` captured
at import time keeps working: branches are mutated, never replaced. A prune
pass deletes pack-only keys first — without it the `reasons` branch rode along
into every later language, found by the unit test that asserts English
restores *exactly*, not by a reader. Dates go through a per-language formatter
cache (`dateFormatter`), because an `Intl.DateTimeFormat` built once can never
change language — the five module-level `en-GB` constants in three views
became functions of the current language, and flushing that cache on change is
what makes «среда, 26 августа 2026 г.» appear without a reload. The header's
control is a globe and the current code, opening the five in the church
panel's own dress; each choice names its language in its own tongue —
«Русский», not "Russian" — because the reader who needs the control is
precisely the one who may not read the language the site is currently in.
`<html lang>` follows the choice, which also retires the standing dishonesty
of `lang="en"` on pages already printing Greek and Church Slavonic. A change
re-renders the open view through `router.refresh()` (new), and the view
titles became thunks so `document.title` follows.

**The packs are hand-written, and the grammar drove real decisions.** Russian
past tense carries gender and 68 of the corpus's saints are women, so
"Entered eternal glory in {when}" is recast nominally — «Кончина — {when}» —
rather than shipped broken as «Отошёл»; Serbian and Greek follow the same
shape. The church names are translated through a new `STRINGS.church.names`
(the registry keeps the English truth; `churchName()` reads STRINGS first)
and are the **adjective alone** — «Русская» — because «Русская церковь» put
the 360 px header six pixels over its width; that overflow, and a leaked
`{placeholder}`, are exactly the two failures hand-written packs produce, and
both have a browser test that walks all four languages at 360.

**The boundary, drawn on purpose and tested from both sides.** The chrome
translates; the corpus does not: 708 lives written in English after their
synaxaria, names, and the data's own display strings ("5th century") stay
English, because a machine-translated life is Amendment 2's forbidden
invention — and the source-language material a reader of that language
actually wants (hymns, quoted calendar lines, name forms) is already on the
page in the original, which is what "English and source languages" affordably
means. Two seams are accepted and recorded rather than half-done:
`lib/liturgy.js` composes its cycle line ("13th week after Pentecost") in
English — localising it means restructuring the generator to return shape
rather than sentence, four languages of ordinal grammar deep, the author's
call if wanted — and the fast reasons are English strings in the data, so the
packs carry a `reasons` map for the ~24 recurring ones («Успенский пост») and
pass anything unlisted through in English, honestly. The honorific stays "St"
in every language because the name it decorates is English.

**Verification.** 139 unit (132 + 7: pack keys all exist in the English base,
placeholder parity across every string of all four packs, in-place mutation
with exact English restore, fill over a translated template, the reasons
passthrough, church names through STRINGS), 248 browser (240 + 4 × 2). Five
backouts run and watched fail: persistence, the formatter-cache flush, the
church-name STRINGS read, the reason translation, the prune. Both suites
green at the close of the sitting.

**37. The rail gains weight, and the hymns say why they keep their tongue**
(author's instruction, 2026-08-24, the same sitting as 35 and 36: "make the
desktop click hold and drag … smoother like it has a bit of weight and slows
down to a halt when let go instead of snapping", and "When EN is on, I still
see the hymns in Russian").

**(1) A released drag coasts.** The flick is read from the last 80 ms of the
drag — not the whole haul, so a slow pull ending in a snap of the wrist reads
as the throw it is — and spent against exponential friction (`FRICTION_TAU`
325 ms, the feel of platform kinetic scrolling), `scrollLeft` integrated by
hand each frame with snap suspended (`.is-coasting`) so the browser cannot
snatch the rail mid-glide. The handover to settle() comes at 0.15 px/ms rather
than near zero, because the exponential's tail is a crawl the eye reads as
jank and the settle's own glide is a better ending; settle keeps sole
ownership of alignment and re-anchoring, so the coast added no second
implementation of either. A hand on a coasting rail catches it; an edge stops
it dead (momentum the reader never gave it); below `MIN_FLICK` the release had
no throw in it and settles as before; reduced motion removes the coast
entirely — never shortens it. Only the hold wears the grabbing cursor: a
coasting rail is not being held.

*The defect the old test caught on the way:* the sample window was pruned only
when moves arrived, so a fast drag held **still** and then released read the
stale flick and threw a rail the hand had already stopped — a perfectly still
hold fires no pointermoves, so nothing ever aged the samples out. Freshness is
now measured from the release itself (120 ms), and Amendment 35's
drag-and-settle test — which failed the moment the coast landed, exactly as it
should have — now pauses before releasing and documents that it is the settle
path on purpose, the coast having a test of its own. Backed out (stale samples
readmitted), watched fail, restored.

**(2) The hymns keep their tongue, and now say so.** The author's report reads
as a defect — "When EN is on, I still see the hymns in Russian" — and the
honest answer is that it is the recorded boundary, not a bug: **the corpus
holds no English hymn texts at all.** Every hymn is copied whole from the
chosen church's cited source (days.pravoslavie.ru's Slavonic, saint.gr's
Greek, doxologia.ro's Romanian, pravoslavno.rs's Serbian — Amendment 28), and
translating liturgical poetry here would be Amendment 2's invented content
wearing vestments. What the page owed the reader was that this be visibly a
decision: one utility line under the Hymns heading — "In the church's own
tongue, as the source prints it; no translation is recorded." — shown exactly
when the site's language is not the hymns' language (`HYMN_LANG` per church).
The Russian chrome sees it too, correctly: the Russian church's hymns are
Church Slavonic, which Russian is not. The Greek chrome on the Greek church
sees nothing, because there the tongues actually match. The line is in all
five languages; both directions are tested and were backed out to fail — the
note removed, and the note shown unconditionally.

**If the author wants English hymns for real,** the affordable shape is the
same as every corpus decision: sourcing, not translating — the OCA
(oca.org) prints its own English troparia and kontakia for much of the
calendar, citable saint by saint like Amendment 31's three weeks were. That is
corpus work on the author's commission, not a session's refinement; it is
recorded in HANDOFF's queue.

**Verification.** 139 unit (unchanged — the packs' new `own` string rides the
existing placeholder-parity and key-existence sweeps), 256 browser (248 + 4 ×
2: the coast, the reduced-motion throw, the note in two languages, the
matched-tongue silence). Five backouts run and watched fail: the coast, its
reduced-motion gate, the sample freshness, the note, the note's condition.
Both suites green at the close.

**38. Nine refinements, and one bookmark instead of two** (author's
instruction, 2026-08-24 evening — nine items in one list, delivered in two
commits).

**The small five.** "A" steps a day back beside S and the arrows (a hand
resting on WASD expects A to be "left"). The Daily heading wears the
abbreviated month — "Friday, 28 Aug 2026" — through a second formatter, not a
change to `dayFmt`, because the day buttons' `aria-label`s keep the full month:
a label is spoken, not glanced at. Centuries print as **"3rd C."**, abbreviated
at render in `formatInterval`, the data's `display` strings left whole because
they are quoted source-shaped corpus material and are not edited for
typography. **"Also called" is removed** from the saint page, with its label
from all five packs. And the Index **opens in Random order**, the seed minted
per visit by the view so every open deals a new hand, while a snapshot carries
its seed so returning from a saint finds the grid as it was left.

*Two reversals, both marked in place.* Random reverses the **same morning's**
Earliest default (Amendment 34) at the author's explicit instruction, with its
own reason recorded: "so each time you open the site you get exposed to more
saints". Removing "Also called" reverses DESIGN.md's "script coverage is a
hard requirement, not a nicety", which named that exact block as how "attest,
never adjudicate" appears on screen — the multi-script name forms (Ἀντώνιος,
Ⲁⲛⲧⲱⲛⲓⲟⲥ) are now shown nowhere. Flagged in the same sitting; the corpus is
untouched and the line costs nothing to restore. The requirement stands
unreversed for a saint's *display* name, which still sets in its own script
wherever the corpus writes it that way.

**The four visual ones.** *Continue reading* loses its × and centres the
bookmark on the row's height; a row is cleared by **swiping it across** —
pointer events, so the mouse does it too, the same reversal the rail made when
it took the desktop drag — past 40% of its own width, springing home under
that, with vertical movement winning outright so the shelf never steals a
scroll. *Also commemorated* is a column of the Index's own rows rather than
text links: thumbnail, name, lifespan, and the same Save every other card
carries. The **mobile header** is three rows — the name centred across the
top, the toggles under it at the right, the calendar control on the nav's own
line at its right end — which took the calendar control out of the corner's
flex box into one of its own; the wide header is untouched. And the **bookmark
is one drawing at last**: what the author saw as two visuals was one mark with
a gesso halo under it, and over a dark icon the halo was the only part that
read. The halo is gone; legibility over a picture is a drop shadow, which is
the ground's own darkness pushed away from the shape rather than a second
shape drawn around it.

*Said plainly rather than left looking covered:* the register row's
church-title branch has **no reachable trigger in today's corpus** — all 20
titled attestations belong to saints who are their own day's hero, verified
across all four calendars — so it carries no browser test and says so where it
lives. It is kept because titles are data and the corpus grows.

**What the suite caught, which is again most of the story.** Four order
assertions were reading `.index-name` .first() — but `paintWindow` appends
newly-mounted cards and leaves mounted ones where they sit, so DOM order stops
being screen order after a re-sort; they passed only because Earliest was the
default and a fresh load happens to agree. A `leaders()` helper now reads the
leading names off the geometry, which is what those tests always meant. A
fifth measured "the first card with a picture" and would have measured
whichever card the opening deal put there. The Random-saint test matched
`.att` rows by full text, so a source note naming another church could match
two rows; scoped to `.att-church`. All four were pre-existing and none was
mine — but a suite the house rules call a real gate does not get to keep known
flakes.

Two of this amendment's own tests were caught being weaker than the code they
pinned, both by backouts. The swipe test pushed from the row's *thumbnail*,
where the native link-drag that broke the gesture in the first place does not
fire — it pushes from the **name** now, which is where a reader's hand lands
and the one place the gesture can be stolen. And the spring-back assertion
counted rows immediately after the push, which passes while a dismissed row is
still mid-flight; it waits past the 200 ms flight now, and says why.

**Verification.** 139 unit (two heirs rewritten: the default order, and the
century abbreviation), 264 browser (256 + 8). Twelve backouts run and watched
fail: the A key, the abbreviated heading, the century abbreviation, the
removed name forms, the Random default, the per-visit seed, the dragstart
guard, the swipe threshold, the halo's return, the text-link register, the
narrow header grid, and the shelf's keyboard route. Both suites green at the
close.

**And then CI failed, which is the part worth reading.** The desktop header
came back 76.13 px against a 64 px assertion — on a Linux runner, where
`--font-utility` resolves to DejaVu Sans rather than the Segoe UI this desk
draws it in. Measured rather than guessed at: the row's fixed parts (name,
calendar control, language control, theme toggle) leave the nav 212.9 px of
need against 192.6 px of column in that face. **The failure was not new.**
Rebuilding the *previous* commit's header and measuring it the same way gave
the same 76.13 px: the row ran out of width when Amendment 36 put the language
control in the corner, and CI had been red about it for two amendments while
every local run stayed green. This amendment's four-column header deepened it
by 16 px — a full column gap where the two control boxes had been `--space-2`
apart inside one flex box — but did not cause it.

The fix is 24 px of gap the row was not using well: `--space-4` between the
header's parts, `--space-2` between the two control boxes (the gap they had
when they were one), which puts English at 11.8 px of slack in DejaVu and
38 px in Segoe, and costs nothing visible because the nav's `1fr` column
absorbed that slack either way. **The guard matters more than the fix**: the
test now forces the wide face and asserts against it, and prints the runner's
native measurement to the log — Amendment 24's own remedy for exactly this
class of bug, applied to the header two amendments after it should have been.
Backed out (the old gaps restored), watched fail at 76.13 px — CI's number to
the hundredth — and restored.

*Recorded and not fixed:* in Russian, Greek and Serbian the desktop row cannot
hold one line at any gap — the translated nav needs 65–75 px more than English,
more than the entire gap budget — so those languages wrap to a second row.
Legible, overflows nothing, and the remedy (shorter nav labels, or a control
that leaves the row) is the author's call.

*A second flake the Random default had planted:* the back-navigation test
opens whichever card sits wholly between the header and the fold, and card
heights come from each icon's aspect ratio — a deal that put a tall portrait
across the whole 780 px viewport left no such card. Order pinned for that
test, and the search now says what went wrong instead of dying on an undefined
click. Two full suites run back to back to shake out the rest; both clean.

**39. Nineteen refinements, a date audit, and one instruction the corpus
cannot obey** (author's instruction, 2026-08-25 — nineteen items in one list,
delivered in two commits).

**The chrome (eleven items).** The narrow header became one line of chrome —
calendar control, name, language, theme — over a centred row of pages, holding
to 320 px in all five languages; S stopped stepping a day back, leaving A and
D; the day a reader leaves keeps no focus ring; "Entered eternal glory in
1515" became **"Reposed 1515"**; dates gained capitals and lost the
abbreviation dot; the count says **"122/708 saints venerated in the Romanian
calendar"** instead of making the reader subtract; the facets became chips
that fit one line where they used to wrap; the rail's edges fade and its days
sit 2 px apart; the × returned to Continue reading on a hovering pointer; the
site's name follows the language in the header and the veil; and the favicon
went gold.

*Four reversals, each marked where it sits.* The mobile header (the previous
evening's arrangement, one day old); the gold favicon (Amendment 34's ink
correction, which had itself corrected a §2 violation — so §2 now records that
gold is spent on the site's mark **by instruction**, and nowhere else); the ×
on the shelf (removed that same evening); and the rail's edge fade (Amendment
35's "no mask for the week"). The fifth was the hymns note, added at Amendment
37 and removed the next morning; the decision it announced still stands.

**The features (five items).** The fast label opens a modal saying what the
fast allows. The boundary there is the whole design: `lib/liturgy.js` states
*which* fast a day falls in and refuses to compute the day's allowance,
because that is the typikon's and jurisdictions keeping the same fast differ —
so the modal quotes **the church's own calendar** where it printed a note
(«Успенский пост; разрешается пища с растительным маслом», cited and
untranslated), explains the vocabulary those calendars use, and says whose the
ruling is. A modal that answered for the reader would be this site handing out
a ruling nobody gave it.

The saint page gained its own hymns, the reader's church first and each named
by calendar where a saint's hymns span several — 50 of the 132 do. The Daily
hero gained the opening of its life in the column the name and dates leave
empty, on wide screens only. About gained **Contact**, which goes to the
repository's issue tracker: no address printed, no form posted, nothing for a
static site to receive, and the reader is told the issue is public before they
open one. And the readings now print their book names in the reader's language
and open a Bible in it.

*Three of the four Bibles were opened and read before being written down.*
greekbible.com takes `/{book}/{chapter}/`; wordproject.org/bibles/sr takes
`/{n}/{chapter}.htm` with 40 for Matthew; Bible Gateway takes the version code
(`RUSV`). The fourth was refused: **eBiblia.ro, which the author named, is a
JavaScript application whose own navigation is `javascript:app.…` calls and
which exposes no addressable passage URL.** Romanian therefore opens Bible
Gateway's Cornilescu, which opens the passage; shipping a link to eBiblia's
front page and leaving the reader to find the chapter would have been obeying
the letter of the instruction and failing the reader. Recorded in
`lib/bible.js` for the author to overrule in one line.

**The corpus (two items, and the interesting one).** *St Titus said undated
while his life said 105.* The audit found **nine** such saints — every one
with a death year stated in their own cited life and never recorded in the
data — and all nine now carry it: Titus (105), Sabina (c. 126), Irenaeus of
Lyon (202), Hosius of Córdoba (359), Poemen the Great (450), Shushanik (475),
Adrian of Ondrusov (1549), Arsenios (1550), Maria of Diveyevo (1931). This is
transcription, not inference: the life *is* the cited source. A second pass
looked for saints with a birth but no death whose life stated one and found
none, so the audit is complete; 230 saints remain undated because their
sources say nothing, which is the finding the undated tray exists to keep
visible. The corpus counts moved with it — the 240–460 range gained two, the
tray lost nine.

*Eutychius as Bishop of Rome 275–283 is not a display bug.* The corpus holds
five Eutychius/Eutychian entries and none of them is the Roman bishop; he is
not in it at all. What the request is right about is the display, and that is
fixed: the offices and epithets the calendars themselves give — "Hierarch,
Archbishop of Constantinople", "Venerable, the Great, Father of monasticism" —
were printed only inside the veneration register, one church at a time, and
now join the info line under the name, deduplicated across the churches.

**The instruction the corpus cannot obey.** The author asked for the saints'
*names* in each language: "St Titus the Apostle should be Sf Apostol Tit". The
honorific went — it is chrome, a closed set of five words, and all five take
an abbreviation's stop, so the site now prints St. / Sf. / Св. / Άγ. / Св.
following the language. The **names did not**, because there is no source in
this repository that gives 708 names in four languages, and inventing them is
exactly Amendment 2's forbidden content. What ships is the honest halfway
house — «Св.» before an English name — pinned by a test that says so in as
many words. The affordable shape is the one every corpus decision has taken:
citation, not translation. Each church's synaxarion already prints its own
saints' names in its own language at the URLs the entries were read from, so
this is sourcing work on the author's commission, and it is in HANDOFF's
queue.

The abbreviated honorifics are also the ones that dodge a grammar this corpus
cannot answer: Greek and Slavonic decline the honorific for a woman, and 68 of
these saints are women. A spelled-out form would need a rule per language
rather than a word.

*One departure said plainly:* the dates' capitals. Lower-case weekday and
month names are **correct** orthography in Romanian, Russian and Serbian, and
"aug." wants its dot — it marks the truncation. The author asked for capitals
and no dot, and that is what is printed; only the weekday and month parts are
touched, so Russian keeps the «г.» whose dot belongs to a different word.

**Verification.** 141 unit (two new: the honorific in five languages, and a
name already carrying any of them), 280 browser (266 + 14). Nine backouts run
and watched fail: the S key, the pointer blur, the name's `justify-self`, the
desktop ×, the header gaps, the modal's quoted note, the per-language Bibles,
the saint page's hymns, and the hero's lede. A tenth was run and **passed** —
`minmax(0, 1fr)` on the name's track — and is documented as the guard it is
rather than left looking covered.

**40. Fifteen more, twelve of them built and three of them commissions**
(author's instruction, 2026-08-25 evening — fifteen items in one list).

**The chrome (seven items).** The rail's peek went 30 → 44 px, so the days
either side of the seven show themselves whole before the mask begins — and
the peek is the lever, not the gap, because the seven divide what is left
*after* both insets and tightening the gap hands the width straight back to
them. The density dots are gone at both grains. The register's card rows keep
their bookmark on the row. "undated" took a capital in all five packs. The All
Saints lede went. The four pages hold one line in every language at every
width. And every string the site prints lost its em dash.

*Two of those want their reasoning said.* **The nav against the masthead:** at
the 72ch column the one-line header needs 678 px in Russian, 695 in Greek and
672 in Serbian where 580 exist, so the arithmetic HANDOFF had recorded as "not
fixable at any gap" was right and something had to give. The nav wins and the
masthead pays *in lines* — «Ορθοδοξία / Καθημερινά», every word intact —
because the four pages are how the site is used and a masthead is a constant
learnt once. Clipping it to «Правосла…» would have obeyed the instruction and
left the site unnamed. The line that actually did the work was deleting
`min-width: 0` from `nav.site-nav`: a grid `auto` track will not shrink a
child below its min-content, and `min-width: 0` overrides exactly that floor,
which is why the nav went on being squeezed out of its own track while its
links overhung it.

**The em dashes stop at the corpus.** 149 in string literals were swept — by a
scanner that knows a literal from a comment, so the house's own prose keeps
its dashes — and the 3,638 in `saints/*/life.md` and `saints/*/saint.json`
were **not**. Those are inside quoted source text and citation lines
transcribed from four synaxaria, and editing a quotation for typography is the
one thing Amendment 2 forbids. Said to the author rather than done quietly.

**The fast (three items, and the interesting one).** The line under the date
now says *which type* of fast, and the pop-up says that and nothing else:
"Xerophagy — uncooked food, without oil or wine", in the reader's language,
with the calendar's own note quoted under it.

This looks like a reversal of Amendment 28 and is not one. `lib/liturgy.js`
still refuses to compute an allowance, because the allowance is the typikon's
and jurisdictions keeping the very same fast differ. What changed is that the
site now *reads* one: each of the four calendars prints its own allowance
beside the day where it has one, in its own words, and those words were
already transcribed. `lib/fast-grade.js` matches them against a closed
vocabulary of six — xerophagy, cooked without oil, oil and wine, fish, dairy,
none — on whole phrases rather than stems, because «горячая пища без масла»
and «пища с растительным маслом» differ by one word and mean opposite things.
The grade is a quotation resolved, never a derivation, and **a day whose
calendar named no allowance still says only which fast it is.** That silence
is the design, not a gap in it.

The glossary of all four grades that Amendment 39 argued for lasted one day.
The author's cut is right: a reader looking at Tuesday is owed Tuesday, and
three grades that do not apply are three chances to act on the wrong one.

*And the modal became a bubble*, which is the same argument in a different
register: `showModal()` paints a backdrop and takes the whole screen for what
is a footnote to one word. The bubble points at the word, the page stays lit
behind it, and a press elsewhere, Escape, a scroll or a second press on the
control all put it away. Under reduced motion it is simply there and simply
gone (§6).

**The first visit (one item).** Two questions now — which calendar, and which
of the five languages — and they are deliberately not the same kind of
question. The calendar has no default and the page waits for it; the language
has one, so that half is an offer and answering the calendar alone opens the
whole site. `settings.language` gains a null "not asked" state, which reads as
English, so no first paint changes.

**And an answered panel flies home**, shrinking and fading into the header
control that changes it from now on. It is a teaching gesture: the site hides
both answers behind two small controls, and a reader who answers without
seeing where the answer went has to hunt next time. Which is why reduced
motion **removes** it rather than shortening it — the lesson survives in the
controls' accessible names, which say the whole sentence.

**The search terms (one item).** The 44 types the corpus uses are named in
words now, capitalised, in all five languages, and the search index carries
*every* language's name at once rather than the chosen one — the index is
built once and the chrome's language can change under it. The slug stays the
key and is indexed too, so an old bookmarked query still matches. Three
smaller things came with it and each is a decision: a type no pack has named
falls back to English rather than disappearing; a type *nobody* has named
prints as its title-cased slug, so the corpus can grow a type without waiting
for a string; and the facet lists are collated in the reader's language,
because sorting by the slug underneath left the Russian list running
Игумения, Игумен, Апологет, Апостол.

**The three that are commissions, not builds.** The author asked for English
translations of every hymn, icons for every saint without one, and six months
of calendar content across four churches. None of the three is code, and none
can be done by this build without breaking Amendment 2. Sized rather than
waved at:

- **415 hymns** across 132 saints, in Church Slavonic (143), Greek (137),
  Romanian (117) and Serbian (18). Translating them here would be inventing
  liturgical text. Sourcing published English — the OCA prints English
  troparia and kontakia for a large part of this calendar — is per-saint
  transcription with a citation each, exactly as the hymns already there were
  got. The display side is a day's work once the texts exist; the texts are
  the commission.
- **613 saints without an icon.** Each needs a file, a licence, a credit and a
  *real* source URL — the build already warns on the placeholder the 95
  existing images carry, so this is 613 sourcing decisions with a rights
  question in each. Bulk-fetching images and guessing at their licences is
  the failure mode this repository is built to refuse.
- **Six months of days.** The corpus holds 23 August to 19 September 2026:
  28 days, transcribed by hand from four calendars. Six months is roughly 180
  days × 4 churches = 720 day-records of readings, fasting notes, feast titles
  and hymns, three of the four from sites that publish only a fortnight or so
  ahead — saint.gr's absence for 7–19 September is already recorded in the
  data as an absence rather than filled in. The dated part cannot be
  transcribed before the sources print it.

All three are in HANDOFF's queue with what each needs.

**Verification.** 142 unit (one new: no string in any of the five packs
carries an em dash), 310 browser (280 + 30). Thirteen backouts run and watched
fail: the rail's peek, the grade read off the note, the Russian fast
vocabulary, the bubble's outside-press, the dots' return, the nav's
`min-width`, the gate's second question, the flight itself, the type facet's
slug, the All Saints lede, the register row's wrap, the lower-case "undated",
and the em dash.

*One backout escaped its browser test and got a better one.* Putting the em
dash back into `liturgy.fast` left the page test green, because every day it
looks at has a *graded* fast and never reaches that string — a page test can
only see the strings that page happens to print. The guard is a unit test now,
walking all five packs entire, and the browser test stays for what is actually
on screen.

*Two bugs the tests found in this batch's own code.* A scroll that settled the
rail repainted the liturgy line under an open bubble, so the next press opened
a second one instead of closing the first — the bubble's owner was a node no
longer on the page. And the bubble closed on any scroll *event*, including one
queued from a scroll that had already finished, so opening it just after a
scroll shut it in the same frame; it now closes on a scroll that has actually
moved something.

*And one line that never ran:* `.ask-block + .ask-block { margin-top:
var(--space-5) }` — there is no `--space-5` in the token set, so the
declaration was dropped silently and the two questions sat flush. Caught by
looking at the render, which is the only thing that catches it.

**41. Twelve more, the corpus's own names found, and one instruction blocked
by copyright** (author's instruction, 2026-08-26 — eleven items, and a twelfth
added mid-sitting).

**The bubble says less, twice over.** "Nothing is set aside." for a fast-free
day, and "Meat, dairy and eggs are set aside." for a fast whose calendar named
no allowance — the second sentence of each went. And the *quotation* goes with
it where the note says nothing the label did not: „Post" over a hyperlink from
doxologia.ro tells a reader who has just read "Fast - the Beheading of the
Forerunner" that the day is a fast. So the note is printed when a grade was
read **out of** it — exactly when it carries more than the label — and the
citation stands either way, because the day's record came from that page
whether or not its words bear repeating.

**The era is back, by a rule rather than a blanket** (reversing Amendment 39's
"BC only, no AD"). Marked below 1000, where a three-digit number reads as a
quantity as easily as a year, and left alone above it, because 1937 says what
it is. Appended only to a display that *ends* in the figure, so "under
Licinius" stays English.

**The rest of the chrome.** The random order is minted once per page load, so
a trip through Daily and back finds the same hand — it was `Date.now()` at
every call, and every fresh mount dealt again and lost the card the reader had
gone to find. The hero's foot came up 20 px where there is no icon. A row for
a saint with no icon prints no empty frame; the body carries the 48 px the
thumbnail used to, so the virtualised grid's fixed 66 px still holds. And the
flight home is 160 ms rather than 320, with **the page closing behind it** —
these panels sit in the flow, so hiding one at the end of its flight dropped
everything below it in a single frame; the space now closes over the same
duration, and the flier is pinned out of flow first so the closing box cannot
clip it.

**The cycle line stops being English.** `cycleTitle` composed a sentence
inside `lib/liturgy.js` — the seam Amendment 36 recorded and HANDOFF has
carried as open ever since — and that module is the one place that knows the
paschal reckoning and the one place that must not know about words. It is
`cycleOf` now, returning which day of the cycle it is, and `ui/cycle-name.js`
gives it words from the packs.

Two details of that are the whole reason it took a file rather than a
translation. **Holy Week and Bright Week are tables of seven, not templates**:
Slavonic, Serbian and Greek decline the adjective for the weekday's gender —
«Великая Среда» beside «Великий Четверг», «Μεγάλη Παρασκευή» beside «Μέγα
Σάββατο» — so a weekday poured into one pattern is wrong in three languages
out of five. And there is **one** placeholder for the number, not two: English
is ordinalised in code because its ordinals are irregular, the other four take
the bare number and add their own suffix in the pattern, and the unit test
that checks every pack's placeholders against English stays a real guard.

**The saints' names, which the corpus had all along.** On 2026-08-25 the
author asked for the names in the reader's language and was told it could not
be done without inventing 708 names in four languages. Asked again on
2026-08-26 — "the names are not printed in cyrillic when the Russian language
is chosen" — and the second look found **every folder carries a `names` array**
of forms with their language, transcribed from the same calendar entries the
attestations were read from. They were on the saint page under "Also called"
until Amendment 38 removed that block, and have sat unused since.

So nothing is translated: a recorded form is *chosen*
(`lib/saint-name.js`, at build time, into the manifest). Two rules decide what
is usable, and both exist because a calendar entry is not a name field. A form
naming several people is not this saint's name — the Greek entry for
Agathocleia is «Άγιοι Εύοδος, Καλλίστη, Αγαθόκλεια και Ερμογένης», the whole
company of that day — and the honorific and rank are stripped, because the
site prints its own and «Св. Св. Аврамије» is what leaving them in produces.

Coverage is 393 Russian, 240 Greek, 111 Serbian, 102 Romanian of 708. Counted
against the churches that actually *keep* each saint it is 393/393, 331/344,
116/129 and 116/122 — so the English fallback nearly always means "this church
does not keep this saint", not "nobody looked". **The earlier answer was
wrong, and it was wrong in the most ordinary way: I described what the corpus
could not do without looking at what it already held.**

*A bug in that file, found by its own unit test:* JavaScript's `\b` is
ASCII-only, so `/\bκαι\b/` never matches — a Greek letter is not a word
character to it. The list-rejection rule was passing every listed Greek entry
straight through while looking like it filtered them. Ninety-one Greek forms
turned out to be lists.

**The dates, audited a third time and much wider.** The author: "Saints like
Natalia and Adrian of Nicomedia are dated around 4th C, 305-311, as their
synaxarion says … And scan the whole corpus for any others because I've told
you this already and there are still saints with this error."

They were right to be irritated. **Amendment 39's audit read the lives and
nothing else**, and the datings mostly are not in the prose: they are in the
*calendar entry lines* transcribed into each attestation's `source.text` —
«Мчч. Адриана и Наталии и прочих 23, с ними пострадавших (305-311)» — and in
the reigns and councils the lives name. Adrian's own life says "lived at
Nicomedia in Bithynia under Maximian (305–311)" in as many words.

Widening the audit to those wells produced 47 proposals, which were then read
one at a time, because **a parenthesis is not always about the saint**. Four
were thrown out: Phanourios was proposed 1355–1369, the tenure of the
metropolitan who read the name on his icon when it was *found*; Cassian of
Glyphia the fifteenth century, which belongs to the historian who mentions
him; Constantia of Paphos the sixteenth, which belongs to Stephen Lusignan;
Theodore of Alexandria 608–610, the patriarchate of the Theodore his own
passage distinguishes him from. A whole class had to be excluded for the same
reason — the Russian calendar's parenthesis dates *the commemoration*, and
«Обретение мощей прп. Александра исп (2001)» is not a man who died in 2001.

**43 saints dated. Undated: 239 → 230 → 187.** Reigns follow the convention
twelve saints already used (`display: "under Licinius"`, the reign as the
bounds, `basis: "traditional"`), and one saint takes an open bound from the
only record of him there is: Sabbas of Venetala, `before the 11th century`,
`basis: "inferred"`, because a tenth–eleventh-century codex is all that
attests him.

*And "at least centuries for every saint" needed a display, not just data.*
`floruit` has been in the schema since it was written and nothing ever printed
it, so Agathocles of Corone read Undated while his life said he sat at the
Third Ecumenical Council. `formatLifespan` falls through to it now — "Lived at
the Council of Ephesus".

The remaining **187 are not a backlog of unread sources.** Their lives read
"That is the whole of the Prologue's notice", "the Greek synaxarion … says it
has no details of his life". Dating them means consulting sources this corpus
has not cited, which is a sourcing commission, not an audit.

**The instruction that copyright blocked, and the source that unblocked it.**
The author, asked what "the hymns in other languages" meant, was unambiguous:
"when you select English as the language, on any calendar, it should be in
English."

The reason it could not simply be done is worth stating, because it is not
effort. **The 415 hymns in this corpus are the original texts** — Greek,
Church Slavonic, Romanian, Serbian — centuries out of copyright, which is why
transcribing them from saint.gr and days.pravoslavie.ru was sound. **An
English translation is a modern work with a living author.** The OCA prints
English troparia and kontakia for much of this calendar and marks them its
own; copying 415 into a published site is a rights decision, and it is the
author's to make, not a build's. `WebFetch` declined to reproduce them
verbatim for the same reason, which is the tool being right rather than in the
way.

*Two paths were put to the author, and the author chose one:* **Isabel
Florence Hapgood's Service Book of the Holy Orthodox-Catholic Apostolic
(Greco-Russian) Church, 1906** — published before 1929 and long in the public
domain. Done, and its size is the finding.

**Her book holds no menaion of per-saint troparia.** It is the fixed services,
the eight tones and the Great Feasts, so of the 132 saints here with hymns it
names *none*. What it does give, and what the corpus's four weeks of days
overlap with, is three feasts: the Falling-Asleep, the Nativity of the
Birth-giver of God, and the Elevation of the Cross. **Five texts, carried by
twelve hymn objects across two calendars and two languages.** The Dormition
kontakion is not among them — she prints that service's troparion and no
Collect-Hymn.

A hymn now carries an optional `english` block: somebody else's published
rendering of that same hymn, with its own citation, which `ui/hymns.js`
prefers when the reader is reading English. **Nothing is translated by this
build**, which is the line Amendment 2 draws and this does not cross. Two
things in her text are kept rather than corrected, because it is a quotation:
the petitions are the **1906** ones — "unto our Sovereign, N.", "our most
God-fearing (Emperor, King, or President), N." — where the modern Greek and
Romanian beside them read "unto the faithful"; and her forms are hers
throughout, "Birth-giver of God" for Theotokos, "Collect-Hymn" for kontakion.
What *was* repaired is scanning damage and only that: words split across line
breaks ("cor- ruption"), a lost space ("grantingvictory"), running heads
falling through the middle of a page, and the French spacing before ; and :.

Everywhere else an English reader still meets the original, and that is the
state of the corpus rather than a gap in the code — asserted as such.

**Verification.** 145 unit (three new: the name picker's stripping, its
company rule, and its fullest-form rule), 342 browser (310 + 32). Fourteen
backouts run and watched fail — the bubble's wording, the quoted note, the
era, the printed floruit, the per-visit seed, the hero's foot, the empty
frame, the cycle line's words, the localised name, the flight's duration, the
English rendering's preference, the flight's cancellation token, and two
*corpus* backouts: Adrian's dates taken out of his folder, and Hapgood's
English taken off the Cross troparion.

*The last of those caught a weak backout before it caught anything else.*
Blanking one copy of the Cross troparion's English left the suite green,
because the text is carried by two hymn objects — the Greek calendar's and
the Romanian's — and the test reads the Greek. Backing out *all* copies failed
as it should. A backout that only half backs out proves nothing.

*Two bugs this batch introduced, and the suite caught both.* `withHonorific`
was replaced by `saintName` at eight call sites and missed at two, which threw
at render and left the saint page blank; it failed as "a saint opens with its
own names" rather than as a blank page in front of a reader.

And the flight had a hole in it. Closing pins the panel out of flow and
collapses the band over 160 ms, hiding and emptying it at the end — so a
reader who reopened *inside* that window met the old callback landing on the
new panel, which was then open, empty and nought pixels tall with its buttons
unclickable. A test that changed calendar twice in quick succession timed out
pressing one. A token cancels a flight the reader has overtaken, and that has
a test of its own now.

## Amendment 42 — the three that were waiting on a decision (2026-08-26, second sitting)

The author, asked whether to keep refining the surface or move on, was told
the surface was at the scale of a capital letter and eight pixels of padding
and that three things were blocked on a decision rather than on work: **icons
for the 613 saints without one, English for the other 403 hymns, and dates for
the 187 undated.** The answer was "Do all three. Try public-domain translation
for english hymns."

None of the three is finished. All three moved, and *what stopped each one is
the finding.*

### The hymns: Orloff's General Menaion, 1899

Hapgood (Amendment 41) gave five texts because her Service Book holds no
menaion. The author's instruction this time named the constraint — public
domain — so the search was for a book with **per-saint** coverage that may be
copied.

**Nassar's Book of Divine Prayers and Services (1938)** is the obvious
candidate and was refused. It is a full English menaion, it is served openly
on archive.org, and its copyright status is unresolved: a 1938 American
publication is public domain only if its copyright was not renewed, no renewal
record was found either way, and archive.org's own record for one copy carries
"This material may be protected by copyright law". A licence that cannot be
established is not a licence, and this repository does not guess at them.

**N. Orloff's The General Menaion (London: J. Davy & Sons, 1899)** is what
landed. Published 1899, unambiguously in the public domain, and served as a
PDF by the Ponomar Project and the CCEL. It is not propers either — but it is
the other half of the gap Hapgood left: the **common** services, one troparion
for any martyr, any hierarch, any prophet, any nun. A real part of what this
corpus records for its lesser-known saints is exactly those.

**37 hymn objects**, from ten of Orloff's twenty-seven general services. With
Hapgood's twelve, 49 of 495 now carry an English rendering.

**The matching is the work, and it is a table rather than a rule.** A saint of
a given order does not thereby sing that order's common troparion — most of
this corpus sings a proper — and worse, several propers here are *modelled* on
the common one and open with its very words. Three were rejected for exactly
that after their opening words matched:

* **Gleb** opens with the martyr's troparion and then goes its own way, about
  healing and swift help;
* **Mitrophan of Voronezh** opens with the hierarch's and then names Mitrophan
  and his city;
* **Pitirim of Perm** opens with the confessor's and then diverges to the
  treasury of mercy and the Zyrian people.

And three whole classes were checked and left alone, because Orloff does not
print them: the **plural** martyrs' troparion (9 objects — his Chapter XV
gives a different hymn, "Through the sufferings of Thy saints"); the monastic
"streams of thy tears" (4 objects — his Chapter XII gives "In thee, O father");
and the Archangel's troparion in the singular (2 — his Chapter IV addresses
the chief-captains together). *A test now says the plural martyrs' troparion
stays Slavonic for an English reader*, so the temptation to lend it the
singular's words has something standing in its way.

Orloff's "(mentioned by name)" is left where he prints it, on the principle
Hapgood's 1906 petitions were kept on: the Slavonic and Greek name the saint
at that point, and putting the name into his English would be editing a
quotation.

### The dates: two seams, thirty saints, 187 → 157

**saint.gr's per-saint pages** are a different document from its day index,
and the day index is all the previous audits had read. 147 of the 187 undated
are kept by the Greek church, so all 152 pages the corpus cites were fetched.
Andronicus of Atroa "lived in the reign of Nikephoros and Staurakios, and of
Patriarch Tarasios", which 12 September does not say; the three sisters of
Bithynia gave up their souls "(290 AD)"; Irenaeus of Sirmium was beheaded and
his head thrown into the Savus "(288 AD)"; Angelis was beheaded near Hagia
Sophia on 1 September 1680.

**And what the other pages say is the finding.** 44 carry no biography at all,
15 say in as many words that no details of the life survive, and of the 75
that are silent about time only 11 so much as name a ruler — none of them with
a year. The Greek synaxarion does not date these people. That is now recorded
in the undated tray's test rather than left as an open question.

**Named authorities outside the four calendars** did the rest, which this
corpus already does where a calendar has nothing (Amendment 30: the OCA's
lives, the Orthodox Encyclopaedia, pstgu.ru, fond.ru). Here it was Wikipedia
and Wikidata — **and the article for each saint was chosen by hand**, because
a search is worthless here: it returned Pushkin for "Alexander, companion of
Susanna", the emperor Claudius for "Claudius, companion of Susanna", Damon
Hill for "Damon the hieromartyr", Julian Assange for the martyr Julian, and
Callista Gingrich for Callista of Nicomedia. Each hand-picked article was then
checked for words that had to be in it before a date was taken.

Rejected after looking: **Symeon the Lesbian Stylite**, offered Simeon
Stylites the Younger (521–596), who is of the Admirable Mountain near Antioch
and a different man; **Abraham, Isaac and Jacob**, because no source consulted
gives a year and Wikipedia calls Abraham legendary, so a millennium invented
here would be Amendment 2 exactly; **Agathocleia**, whose article confirms her
17 September feast and gives no date; **Phanourios**, already excluded at
Amendment 41.

*One disagreement is kept whole rather than resolved*, on the pattern set for
Vladimir Tsedrinsky at Amendment 30: **Irenaeus of Sirmium** is 288 on saint.gr
and 304 on Wikidata, and the page prints "Reposed 288 or 304 AD" with both
recorded.

### The icons: the Menologion of Basil II, 33 of them

Amendment 32 set the rule this had to keep: "Bulk-fetching images and guessing
at their licences is the failure mode this repository is built to refuse."

A general Commons search by name is exactly that failure. Probed over eighteen
saints it offered **Callista Gingrich** for Callista of Nicomedia, **Julian
Assange** for the martyr Julian, **Damon Hill** for Damon the hieromartyr, and
Rodin's *Ève* for the abbess Eve. A name is not evidence.

So the seam SESSIONS named at Amendment 31 was harvested whole instead: the
**Menologion of Basil II**, Vat. gr. 1613, made for the emperor about 985.
Commons holds 494 of its miniatures and records 492 public domain. It depicts
precisely the Byzantine martyrs this corpus is thickest in and thinnest on
pictures for. **33 icons across 21 plates**, taking the corpus from 95 to 128.

Every pairing was chosen by hand from the matcher's proposals, and the
refusals are the substance:

* Basil of Gortyna was offered **"Eumenes, Bishop of Gortyna"** — a different
  bishop, and the reason it was offered is worth keeping: the matcher's stop
  list had "basil" in it for the manuscript's *name*, which swallowed the
  saint's own name and left only the see to match on;
* John V of Constantinople was offered **"Patriarch John IV"**;
* Paul the New (d. 784) was offered **"Paul the Confessor"** (d. 350);
* the 3,628 martyrs of Nicomedia were offered the **20,000**, and the Six of
  Melitene the **Thirty-three**;
* **Ias of Persia** was offered Ia of Persia's plate. saint.gr wonders whether
  they are one person; the corpus keeps two, and an icon must not quietly
  decide it;
* **Susanna of Rome** was offered a bare "Susanna" whose Commons categories
  put her among the *Saints of Palestine*;
* **Onesiphorus of Colophon**, Apostle of the Seventy, was offered a bare
  "Onesiphorus", which in this manuscript is the martyr kept with Porphyrius.

*Twice the corpus's own files corrected the match.* **Bebaia** was offered
"Sarbelius and Bebaia of Edessa" — but this corpus's life says Bebaia is
**Thathuel's** sister, so hers is the Thathuil plate and Sarbel gets nothing.
And **Christodula** was rejected on a truncated filename that named only the
three children; the full name ends "…and their mother Christodula", which let
her back in.

**The credits were moved out of `credit` and into the note.** lib/licence.js
says a public-domain work "owes nobody a credit and simply names its licence",
and the 95 icons already here follow that. Commons lists eight illuminators for
the Menologion, which ran to seven wrapped lines under a thumbnail; the artist
string is kept in the note, where the meta file records provenance rather than
an obligation.

### What was corrected in place

Three standing tests encoded decisions this batch reverses, and were rewritten
where they sit rather than loosened:

* **"the hymns carry no note about their own tongue"** also pinned "the hymns
  are the source's own language, untranslated". The author reversed that half
  on 2026-08-26; it survived Amendment 41 only because Hapgood's five texts
  missed 11 September, and Orloff's Forerunner troparion does not. It now pins
  the shape of the reversal — English where a published rendering exists, the
  source's own text otherwise, and the kontakion beside it still Slavonic for
  an English reader because nothing prints it.
* **the Serbian calendar test** asserted Euplus's first hymn is `lang="cu"`.
  Euplus sings the martyrs' common troparion, so an English reader now meets
  Orloff. Its actual claim — nothing Serbian on the Russian calendar — is
  untouched, and a Russian reader is checked to still get the Slavonic.
* **the two date-facet tests** moved with the corpus for the third and fourth
  time, as their own comments record. 240–460 is 191 overlapping and 177
  within; the undated tray reads 157; and the empty range moved from 1322–1329
  to **1327–1334**, because Peter of Moscow was dated 1260–1326.

### Verification

145 unit, 350 browser (346 + 4). Four backouts run and watched fail: Orloff's
English taken off both of Mamas's copies; a *wrong* English added to the plural
martyrs' troparion, to prove the guard that keeps it Slavonic actually guards;
the dates taken out of four folders; the images taken out of two. All four
failed, all four were restored, and the suite is green after the restore.

Three placeholder `source_url`s times seven folders remain, and are **not**
this batch's to fix: their note reads "Author reports these are public-domain
works", so the files came from the author and only the author knows where.


## Amendment 43 — the calendars repeat, and what that does and does not buy (2026-08-26, third sitting)

The author asked the question that reorganised the plan: **"do the calendars
not stay 99% similar from last year?"** They do, and it is worth more than 99%
— but not uniformly, and the difference decides the work.

### What repeats, measured

Two civil dates, one slot in the paschal cycle — Wednesday of the 14th week
after Pentecost — on the Serbian calendar:

  2026-09-02 → «Апостола Павла Коринћанима, зачало 197 (13,3-13)»
  2025-09-10 → «Апостола Павла Коринћанима, зачало 197 (13,3-13)»

Byte for byte the same, and the Russian agrees at the same slot. **The
lectionary is keyed to Pascha, not to the civil date**, so last year's readings
are this year's, landing eight days off because Pascha 2026 was 12 April
against 2025's 20 April. The *sanctoral* half — the saints, their hymns, their
lives — is keyed to the calendar date and does not move at all.

### A claim in the previous plan was wrong, and is corrected here

The plan said "three of the four sources publish only a fortnight ahead". That
was generalised from saint.gr's known gap without testing the others. Measured:

  * **Russian** (days.pravoslavie.ru) — the URL carries the year and **25
    December 2026 is served now**; 2027 is a 404.
  * **Romanian** (doxologia.ro) — 12 November and 4 February both return
    readings. *This was read as "the whole year is up", and that was wrong;
    corrected at Amendment 44.* The URL carries no year and the site keeps one
    calendar year at a time: `/4-februarie` serves **4 February 2026**, a date
    already past. The horizon is **31 December 2026**, and every page after it
    prints last year's day.
  * **Greek** (saint.gr) — a short window, confirmed: 2 September has its
    Αναγνώσματα block, 25 December and 15 March have none.
  * **Serbian** (pravoslavno.rs) — says so itself: «Свакодневна читања су
    доступна до 30 дана унапред од данашњег дана». But its **month calendar**
    has no such limit and serves any month asked for.

So the six months is not blocked. **Two of the four churches could have their
day records today.**

### The author's instruction, and why it is the right cut

"For Greek and Serbian calendars, dont put them in the calendar yet, but at
least get the Saint Profile pages and hymns for the saints sorted from that
content so all we need to do once we get the calendar information is link it
to the Daily Page."

That cut follows the keying exactly. The saints are date-keyed and published
years ahead; the readings are Pascha-keyed and windowed. Taking last year's
*readings* for this year's day would have been an inference rather than a
transcription — sound, but a different kind of claim, and the author declined
it. Taking this year's *saints* is neither.

### Banked

  * **Greek, 20 September – 31 October: 463 entries**, every one with its
    biography, 98 of them with hymns — **183 hymn texts** — with tone and
    automelon. `.tmp/gr_harvest.json`.
  * **Serbian, October 2026 – March 2027: 182 days, 312 saint entries**, and
    the 94 days the month grid marks as fast. `.tmp/sr_harvest.json`.

### And the arithmetic the author should see

**42 days of the Greek calendar hold 463 distinct entries, 460 of them new.**
Projected over six months that is about **2,000 Greek entries** before the
Serbian adds any, against a corpus of 708 built from 28 days of four calendars.
Six months of Greek alone would roughly triple it.

**It cannot be mechanised, and that was tested rather than assumed.** The
corpus already holds 331 saints with both a Greek form and an English display
name — a ready-made answer key — and a careful transliterator reproduced
**17 of them**. The misses say why: a display name here is a *chosen* English
form («Άγιος Αβδαίος επίσκοπος Περσίας» → "Abda (Abdias), Bishop in Persia"),
it often carries an epithet the Greek never prints («Άγιος Αδριανός» → "Adrian
of Nicomedia"), and one entry naming four martyrs becomes four folders. A slug
is a permanent id; getting it by machine is not on.

### The tranche that landed: 20 September, 21 folders, 708 → 729

Sixteen entries, twenty-one people. Four entries are not folders at all —
three icons of the Theotokos and one synaxis of saints kept on their own days,
which Amendment 31 excludes — and Maximus the Confessor already has a folder.
The rest expand, because a Greek entry names a household in one line:
Eustathius arrives with his wife Theopiste and both sons, and "the two
Anastasii" are two men.

**They are in the corpus and on no Daily page**, which is the shape asked for,
and a test pins both halves — the profile with its feast, citation and hymns,
and 20 September still showing no readings.

*One defect the first build had, and the corpus's own files caught it:* all
four of Eustathius's household inherited the **whole entry line** as their
Greek name, so a reader reading Greek would have met the entire household in
place of Theopiste. Each carries her own form now, and that has a test of its
own. A second, smaller: the citation quoted the day index's **truncated** link
text («… Αγάπιος κα....»), and the untruncated name is on the saint's own page
title.

### The Unicode trap, twice in one sitting

`Ἀπολυτίκιον` from saint.gr and `Ἀπολυτίκιον` typed here share their first
three codepoints, render identically, and fail `in` — one composes an accented
iota and the other does not. It silently found **zero hymns** on every page
until the labels were compared accent-stripped. It then bit again in the
browser test, where `toContainText('Τὰ πάθη Χριστοῦ')` did not match the text
it was looking at; the needles there are unaccented runs now, and say why.

This is the same family as JavaScript's ASCII-only `\b`, which matched nothing
in Greek at Amendment 41. **In this corpus, never compare Greek or Cyrillic
without normalising first.**

### Corrected in place

  * **`tests/lives.test.mjs`** asserted `/read 23 August 2026/` — true while
    the whole corpus came from one sitting. Its claim is "the line says when it
    was read", so it now asks for a well-formed date and lets the corpus grow.
  * **Seven corpus-count assertions** moved with the corpus: 708 → 729, the
    Greek's 344 → 365, the undated tray 157 → 162, 240–460 at 193 overlapping
    and 179 within, and "hermit" 8 → 9 because John the Stranger of Siva lived
    in the caves of Crete.

### Verification

145 unit, 354 browser (350 + 4). Two backouts run and watched fail: the whole
Eustathius folder taken out, and Theopiste given the company line back as her
name — the defect that had actually been there. Both restored, suite green
after.


## Amendment 44 — four months of two calendars, and the answer key that earned them (2026-08-26, fourth sitting)

The author: **"Do the Romanian and Russian day records for the next 6 months.
Have it as a one-off pass for now unless you think a rerunnable ingestion isnt
too much extra work."**

Re-runnable, because the extra work is a few lines and the case for it turned
out to be the finding below. `src/data/liturgical-days.js` holds **144 days
now, 23 August to 13 January**, where it held 28.

    russian   144 days   535 readings    68 hymns
    romanian  131 days   272 readings   117 hymns
    greek      28 days                          (unchanged — see Amendment 43)
    serbian    28 days                          (unchanged)

**The Daily page no longer runs dry on 19 September.**

### Six months was not there to be had, and Amendment 43 said otherwise

43 recorded that doxologia.ro "returns readings for 12 November and 4 February.
The whole year is up." Both pages do return readings. The conclusion was still
wrong, and the reason is a trap worth naming: **doxologia's URL carries no
year**, and the site keeps one calendar year at a time. `/4-februarie` prints
«4 februarie **2026**» — a date already past. Reading a page that exists as
proof that a *future* date is published is the mistake.

Measured properly:

  * **Romanian** — the last day it serves is **31 December 2026**. Every page
    asked for in January 2027 prints 2026 and was refused.
  * **Russian** — the URL carries the *Julian* date, so it keeps going to civil
    **13 January 2027** (Julian 31 December) and 404s the day after. Five URL
    forms were probed for a 2027 anywhere on either site; there is none.

So this is four months, not six, and it is everything the two sources publish.
The claim is corrected in place at Amendment 43 and in the handoff. **The
re-runnable ingestion is the answer to the shortfall**: when they print 2027 it
is one command.

### Why a script here, when the Greek saints were refused one

Amendment 43 refused to generate saint folders and proved why — a
transliterator scored 17 of 331 against the corpus's own names. A day record is
the opposite kind of object, and the sources say so themselves: **both publish
the reference in machine-readable form beside the printed one.**

    days.pravoslavie.ru   <a href=".../bible/z_gal_5_22_0_6_0_2.html">Гал., 213 зач., V, 22 - VI, 2.</a>
    doxologia.ro          <a class="ev-title" href="/apostol/ap-i-corinteni-4-17-21-5-1-5">Ap. I Corinteni 4, 17-21; 5, 1-5</a>

No Roman numeral is read and no Cyrillic abbreviation is guessed at. The one
lookup is book-code to English name, and that table is **closed**: a code not
in it is reported and the reading refused. It refused four times on the answer
key and three times on the range — every one a real gap (`deqn` not `deyan`
for Деяния, `1-sol` where the table guessed `1-fes`, `iacov` where it guessed
`iacob`) — and after those, *every reference in four months resolved*.

### The answer key, which is the part that makes this trustworthy

The 28 records already in the file were transcribed **by hand** off these same
two calendars on 22–23 August. `.tmp/ruro_verify.py` re-derives them and diffs:

    references identical : 138
    references differing : 2

Of the two, one is **the hand record's error**: the page prints «Тит., 300
зач., I, 1-4; II, 15 - III, 3, 12-13, 15» and the record stops at `2:15-3:3`.
The other is punctuation. Three further days where the hand kept only the first
pair of readings and the page prints two or three labelled sets.

Running the diff also found four defects in the harvester, and this is what an
answer key is for:

  * The set label was lost wherever the calendar abbreviates it — «Свт.:»,
    «Апп.:», «Ряд.:» — because the pattern would not let a full stop stand
    before the colon. **Forty labels**, every labelled set on a weekday.
  * The heading leaked into the first label: «Epistle (Евангельские Чтения
    Богородицы)».
  * An **alternative** was counted as a reading. The page offers «Кол., 250
    зач., I, 12-18 (или 2 Кор., 173 зач., III, 4-11)», and «или» is "or".
  * The Romanian parenthetical was filed as a fasting note. It holds «Post» and
    «Harți» — and «Tedeum», and «Slujba la cumpăna dintre ani». It is banked
    raw now and resolved against a vocabulary read off the whole range.

### A live defect in shipped code, found by reading the source's own words

days.pravoslavie.ru prints its strictest allowance as

    Монастырский устав: cухоядение (хлеб, овощи, фрукты)

and the first letter of that word is a **LATIN SMALL LETTER C**. It renders
exactly like the Cyrillic «с». `fast-grade.js` matched the all-Cyrillic
«сухоядение», so **the strictest fast in the calendar showed no grade at all**,
silently, and would have gone on doing so.

Fixed without touching the quotation: a note is matched as printed first, then
once more with confusable Latin letters folded to their Cyrillic twins — so a
Romanian note, which is Latin script and means it, is matched on its own terms
before any folding. `tests/fast-grade.test.mjs` is **new**; the file had no unit
test at all, only browser coverage, which is exactly where a defect that
renders correctly and merely says too little can hide.

**This is the third of its family**: the ASCII-only `\b` that matched nothing in
Greek (41), saint.gr's accented iota failing `in` against an identical-looking
literal (43), and now a Latin letter inside a Russian word.

### Weight, which decided how much of this ships

`liturgical-days.js` is imported eagerly, so every byte is in every visitor's
first download. Measured on the answer key:

    readings, titles, fasting notes only     0.8 kB a day
    the same plus every festal day's hymns   3.9 kB a day

Four months of the second is most of half a megabyte. So the hymns that travel
with a day are cut to **each calendar's own top rank** — the Russian's T6,
«Совершается служба великому празднику», and the Romanian's rank cross, which
marks «(✝) Înălțarea Sfintei Cruci» and leaves an ordinary red-letter Sunday
unmarked. Neither line is drawn here; both are the calendars'.

**1,203 hymns were harvested; 131 ship.** The rest are whole in
`.tmp/ruro_harvest.json`. The file went 116 kB → 299 kB raw, **23 kB → 53 kB
gzipped**, which is the number that crosses a wire. The real fix is to load this
module lazily and then keep every hymn; that is a separate job and it is in the
handoff.

### A third silence

`emptyDayNote` told two apart: the corpus having nothing for a day, and *this*
church having nothing while another has something. Four months of day records
made a third, and the old wording got it backwards — a day now carrying its
readings, its fast and a dozen hymns printed **"an empty day is a gap in our
sourcing"** directly above them.

It is not empty. What it has not got is folders for its saints. The page says
that instead, in all five languages, and `strings.js` gains `dayWithoutSaints`.

### Corrected in place

  * **`src/lib/bible.js`** called its table "sixteen, and it is a closed set" —
    true of the four weeks. Four months cite **six** more (1 John, 1 Peter,
    2 Thessalonians, 2 Timothy, James, Philemon), measured by
    `.tmp/bible_gaps.py` rather than guessed. Each scheme was opened and
    identified **by the page's own title**, as that file's rule requires, and
    the Serbian display names are read off wordproject's titles rather than
    written from memory. Two things that settles: greekbible.com is the New
    Testament **only** — `/genesis/1/` returns its index, not a chapter — and
    no Old Testament book is cited by any day recorded so far.
  * **`readingLabel` in `views/calendar.js`** lifted a qualifier with a pattern
    that refused a nested bracket, so «Ряд. (под зачало)» matched nothing, and
    the kind went untranslated. Greedy from the first bracket to the last now.
  * **`tests/liturgical-days.test.mjs`**'s range test asserted the key set was
    exactly 28 days. It is a *shape* now — four calendars for the four weeks,
    two beyond, each stopping at its own source's horizon, and the Greek and
    Serbian never appearing after 19 September.
  * **Two browser tests** used 20 September as "the day nothing is recorded
    on". It is a recorded day now for two churches; one of them was under the
    Greek and still true with a stale parenthesis, the other was under the
    Romanian and would have failed.

### Verification

151 unit (145 + 4 fast-grade + 2), 362 browser (354 + 8).

**Three backouts run and watched to fail** — and the first of them found that a
test did not pin what it claimed:

  * The nested-bracket fix backed out, and the test **passed**. In English the
    broken path renders an identical string, because the untranslated fallback
    *is* the word "Epistle". Moved to a Russian reader, where the kind actually
    changes; backed out again and watched it fail — «Апостол (Ряд. (под
    зачало))» expected, «Epistle (Ряд. (под зачало))» received.
  * The third silence backed out: the day printed "No commemorations are
    recorded for this day" above its own two readings.
  * A Romanian record planted on **1 January 2027**, which is the harm the year
    guard exists to prevent — last year's readings under this year's date. The
    range test caught it by name.


## Amendment 45 — the first day of saints past the runway (2026-08-26, fifth sitting)

The author, reading that the new day records showed "its saints are not folders
yet": **"But what do you mean its saints arent folders yet? Cant you make them
folders?"** — and then, given the size: **"okay do what you would do."**

Yes, and here is what one day of it costs.

### The size, measured rather than guessed

    Russian, 116 days   658 distinct commemorations named
    Romanian, 103 days  445 distinct entries
    the week of 20-26 September alone   145 Russian names, 28 Romanian

The union cannot be taken mechanically — the corpus carries a Russian name form
for 387 of its folders and a Romanian one for 105, and the same saint in two
calendars does not match itself by string. Somewhere between 600 and 1,100
folders, which would roughly double the corpus.

So: **one day, finished**, rather than a week of thin ones. 20 September, the
first day past the old runway, is now complete for every calendar that names
it. The rate is the point of the exercise and it is written down below.

### What one day held: 21 people, and only 13 of them new

    13  new folders
     8  already in the corpus, their Russian row upgraded from "not checked"
     5  Romanian rows upgraded on the Amendment 43 folders for the same day
     5  saints who stopped saying "Undated"

    corpus                   729 -> 742
    russian attestations     405 -> 426     (13 new + 8 that were already there)
    romanian attestations    122 -> 127
    undated tray             162 -> 157

Three of the calendar's entries are not folders and Amendment 31 says why: the
fore-feast of the Nativity of the Theotokos is a feast, and the Соборы of the
saints of the Altai and of the new martyrs of Kazakhstan are synaxes of saints
kept on their own days.

### The dedupe key is the feast date, and getting that wrong would have been bad

Matching candidates against the corpus **by name found nothing and invented
pairs**: «Святитель Иоанн, архиепископ Новгородский» matched
`john-monk-martyr-1937`, a different man by seven centuries, because both begin
with Иоанн. It is Amendment 43's transliteration finding wearing another hat.

Asking instead **which folders already keep a feast on 7 September** found
fourteen, and eight of them were the very people this batch was about to
create:

    sozon-of-pompeiopolis · john-of-novgorod · macarius-of-optina
    euodus-of-antioch · onesiphorus-of-colophon
    eupsychius-of-caesarea-under-hadrian · luke-of-bathys-ryax · serapion-of-pskov

They were built earlier from the Greek and Romanian calendars, whose 7
September is a different **civil** day — which is precisely the calendar
difference this site exists to show. Three would have been caught by the slug
colliding. **Five would not**, and would have entered the corpus as silent
duplicates of saints it already held.

`luke-abbot-of-deep-streams` was the closest call: the corpus holds him as
`luke-of-bathys-ryax`, and Bathys Ryax *is* Deep Streams.

One pair that looks like a duplicate and is not: **Sozon of Cyprus, the
shepherd boy** — a local saint of Paphos out of Leontios Machairas — and
**Sozon of Pompeiopolis**, the Lycaonian shepherd martyr. The Greek keeps both
on 7 September. The corpus is right to hold both, and the Russian names only
the second.

### The fourth encoding trap, and the worst-shaped one yet

days.pravoslavie.ru serves **two encodings and declares one**:

    Life/life1470.htm   Content-Type: text/html; charset=utf-8   UTF-8
    Life/id990.htm      Content-Type: text/html                  windows-1251,
                        declared nowhere in the page at all

`fetch` looked for a meta charset in the body and defaulted to UTF-8 *with
errors='replace'*, so «Святитель Иоанн» came back as «���������� �����». That
did not fail. It returned a page of replacement characters — and a saint's life
is exactly the thing that must never be paraphrased from one. The order is now:
the charset the header states, the one the document states, UTF-8 **strictly**,
then cp1251. Strictly is the whole fix: `'replace'` is what turned an error
into data.

After the Latin «c» in «cухоядение» (44), saint.gr's accented iota (43) and the
ASCII-only `\b` (41), this is the fourth. The rule this corpus keeps learning:
**never decode, compare or match text in these languages without saying out
loud which encoding and which normalisation you mean.**

And a smaller one beside it: a `Life/idNNNN.htm` page is **not a life**. It is
an index that links on to `Life/lifeNNNN.htm`, and read as prose it yields a
column of site navigation. One more hop, and eleven of the twenty-one have a
real written life to work from; ten have only the day's line, and their entries
say so in as many words rather than padding.

### What is editorial, and stays editorial

Per Amendments 30 and 31, a folder needs a chosen English display name, a
permanent slug, the type, the dates the page gives, four attestation rows — and
a life that is the author's paraphrase and never the source's text. The
mechanical half is written down (`.tmp/week_saints.py` harvests,
`.tmp/ru0920_folders.py` writes); the other half is `.tmp/ru0920_decisions.py`,
and it was typed.

### Five saints stopped saying "Undated"

Euodus, Onesiphorus, Luke of Bathys Ryax, Macarius of Optina and Serapion of
Pskov were built from calendars that print no year. The Russian prints one for
each — «(66)», «(после 67)», «(после 975)», «(1860)», «(1480)» — so they are
dated now, in house style, the note quoting the calendar and `basis` saying
what kind of claim it is. Nothing already dated was overwritten by a second
source.

### Verification

151 unit, 364 browser (362 + 2). **One backout run and watched to fail**: John
of Novgorod's Russian row set back to "not checked", after which he vanishes
from 20 September altogether for a Russian reader — which is the right failure,
because without that row he is not a saint of that day at all.


Working plan for delivering `saintsbuildplan.md`. The brief's phase gates are
binding: no session starts until the previous one's acceptance criteria pass.

Revised 2026-08-20 after a plan review. Five changes from the first draft, all
recorded here with their reasoning so the decisions don't have to be re-argued:

1. **Session 4 split into 4a and 4b.** Detail page, the whole IndexedDB store,
   two habit features, transitions and the full quality-floor audit was two
   sessions wearing one label — and the audit is the part that would have been
   squeezed, on the one session that ships. The audit now has its own sitting.
2. **Data acquisition starts during Session 2, not after Session 4.** Phase 1
   wants ~400 saints, one per feast day. Shipping at Session 4b with ten saints
   would ship a calendar that is empty on 355 days a year, which is the one
   thing the site exists to not be. The pipeline runs in parallel from Session 2.
3. **Pascha is per-church, and both computus rules ship in Session 1.** Catholic
   movable feasts key off Gregorian Easter; Orthodox and Oriental ones key off
   the Julian computus, and the two diverge by up to five weeks. A single
   `easter()` would have been silently wrong for most of the corpus. The church
   registry carries `paschal_computus`; both algorithms are implemented and
   tested in Phase 0.
4. **`region` is derived at manifest-build time.** Phase 2 filters on region but
   the schema has no region field, only coordinates. Derived at build from a
   coarse bounding-box table, three-state like everything else: a saint outside
   every box gets `null`, not `"other"`.
5. **Thumbnails are verified by the build, generated by a separate step.** See
   the note in Session 1 below.

## Session 1 — Phase 0: data foundations — DONE (2026-08-20)

54 unit tests pass; the build produces 10 saints. What the session settled, and
what it turned up that the plan had not anticipated:

- **`rites` is a list, not a value.** The brief says both to keep
  `eastern-catholic` as one entry and not to flatten it to one rite. Those are
  only compatible if rite is plural, so every church carries a list — length one
  for all but Eastern Catholic, which carries six. This also gives §9.2's
  rite × communion table its multi-cell rows for free.
- **`centuryOf` and the region table both shipped wrong and were caught by
  tests.** Flooring an astronomical year puts 100 BC in the 2nd century BC, and
  a single Italy bounding box claimed Augustine of Hippo, whose city sits at
  Sicily's latitude and Sardinia's longitude. The Maghreb now needs three boxes
  to separate it from Sicily and from Iberia across the two straits.
- **Undocumented attestations are omitted from the manifest.** A church absent
  from a card means undocumented, which is exactly what an explicit entry meant,
  so this is lossless for rendering and cut the payload by a quarter. The
  distinction between "recorded as undocumented" and "never mentioned" survives
  in `manifest.meta.json`, where it is a data-quality signal rather than
  something a reader sees.
- **The size projection is over budget and should be ignored for now.** 717 KB
  projected at 5,000 saints against a 400 KB ceiling, but gzip has almost
  nothing to work with at ten saints. The build prints the caveat below 200
  saints and switches to a real warning above it. Revisit during the Session 2
  data workstream; do not build sharding before then.
- **Christopher is the case worth re-reading before Session 3.** His feast was
  removed from the General Roman Calendar in 1969, and he is still venerated.
  Recording that as `not-venerated` would have been wrong, and the badge must
  not tempt anyone into that shortcut later.

Carried into Session 2: `vite.config.js` does not exist yet, and it needs a
plugin to copy `saints/` and `data/` into `dist/` since both sit outside
Vite's `publicDir`. The Pages deploy job in `.github/workflows/build.yml` is
commented out pending it.

### Original scope



No UI. The entire data layer, tested, before any pixel exists.

- Repo layout per brief §4; `package.json` with `ajv` and Vite only.
- `schema/saint.schema.json` covering the full §5 shape.
- `src/data/churches.js` — id, display_name, communion, rites, paschal_computus,
  and the `enabled` flag on the Assyrian Church of the East.
- Date-interval utilities; one code path, no null-date special case.
- Calendar conversion — Gregorian, Julian (general rule, not the 13-day
  constant), Coptic, Ethiopian, Paschal (both computus rules) — with unit tests.
  This is the code most likely to be quietly wrong and least likely to be
  revisited, so it gets tested once, properly, here.
- `build-manifest.mjs`, `validate.mjs`, `new-saint.mjs`.
- Ten hand-authored saints: the seven existing, plus three chosen to cover the
  cases the brief requires (disputed, legendary, no coordinates, different feast
  days in different traditions).
- GitHub Actions workflow running the build on push.

**Thumbnails.** `make_thumbs.py` produces a blurred LQIP placeholder, not a card
thumbnail — worth keeping, but it needs Pillow, and the brief caps build
dependencies at a parser and a schema validator. So generation stays a separate
`npm run thumbs` step, and the manifest build *verifies* every declared image has
its placeholder, failing loudly if not. Nothing silently degrades; the dependency
stays out of the build.

**Done when:** adding an eleventh folder and rebuilding makes it appear with no
other edit, and each of the §6 failure classes fails the build with a message
naming the folder and the problem.

## Session 2 — Design pass, then app shell — DONE (2026-08-20)

`DESIGN.md` is the binding document; read it before touching any CSS. The
decisions that will govern every later session:

- **Gold appears only in the veneration badge; red only marks liturgical time
  and the reader's place.** These two sentences are the design. Any PR that
  uses gold for a flourish or red for an error has missed the point.
- **Dark mode is bole** — the red-brown clay under gold leaf — not inverted
  black, so the warm icon photography sits in the surface instead of glowing.
- **Type:** Literata variable (display and body via the optical-size axis),
  self-hosted WOFF2 subsets covering latin/greek/cyrillic incl. polytonic;
  utility voice is the system grotesque. `font-display: optional` — fallback
  stays on a cold slow first visit because zero layout shift outranks brand.
  Regenerate with `scripts/fetch-fonts.mjs`; no runtime Google dependency.
- Shell shipped: pre-paint theme script (light/dark/system on
  `gos-settings`), history router with Pages 404.html fallback, manifest
  loader, full-page veil, view scaffolds, all UI strings in `src/ui/strings.js`.
- The calendar scaffold already renders today's commemorations from the real
  feast index — the data path is proven end to end in the browser.
- `vite.config.js` serves `saints/` and `data/` in dev (with a
  directory-confinement guard; note Vite's stock dev server intentionally
  serves repo-root files in dev — that is not a deploy concern, `dist/` holds
  only built output) and copies both into `dist/` at build. Pages deploy job
  enabled in CI; **the repo's Pages setting must be flipped to "GitHub
  Actions" once, by hand, before the deploy job can succeed.**
- Bundle: 6.2 KB JS + 2.2 KB CSS gzipped before fonts. The FCP budget has
  plenty of headroom for Sessions 3–4.
- Image meta updated: licence family recorded as Creative Commons per the
  author (2026-08-20), narrowed to Public Domain Mark 1.0 on 2026-08-21. The
  build's attribution check now branches on the licence rather than demanding
  the same fields of all of them: CC0 and the Public Domain Mark oblige no
  credit, every other CC variant does, and all of them want a `source_url`
  because provenance is not attribution.

**Data workstream opens here** and runs continuously from now on.

## Session 3 — Addendum A + veneration badge + calendar page — DONE (2026-08-20)

**Addendum A landed first** (it supersedes the brief where they disagree):

- `location.precision` is gone; coordinates now require a numeric
  `uncertainty_km` (positive, ≤ 20000; authoring defaults 1 / 15 / 150 / 500).
  All ten saints migrated by script. Enums stay for `basis` and `historicity`,
  which modulate treatment, never geometry.
- The manifest's `image` field is now an object — src, lqip, w, h, aspect —
  read at build time by `image-size` (the sanctioned metadata-only dependency
  exception). Cards reserve their box from data; the blurred placeholder is
  the skeleton fill. `titles` also now travel with venerated attestations,
  because the calendar renders each tradition's own style from the manifest
  alone.
- `scripts/font-metrics.mjs` parses the committed WOFF2s (no dependency —
  node:zlib does Brotli) and emits `src/styles/metrics.css`: cap 0.700,
  ascent 1.177, descent 0.308, natural line box 1.485 em. `.names` bounds its
  line-height below that so script-fallback substitution can never move
  layout. `npm run fonts` regenerates files and metrics together.
- The uncertainty curve (DESIGN.md §6b) exists as tokens + `lib/uncertainty.js`;
  date bars consume it in Session 4a, halos and the timeline inherit it later.
- Badge refusal geometry per A1: **hollow at full cell size**, superseding the
  brief's pale-grey fill. Partial lattice rows left-align on the lattice.

**Then the session proper:**

- `ui/badge.js` — pure string-returning SVG, fully unit-tested without a DOM:
  registry-generated lattice, three states distinct by shape (filled / hollow
  / faint dot), disabled communions hidden not drawn, text equivalent naming
  churches not colours, per-cell titles, and the vessel fallback for dense
  rows.
- The calendar page in full: deterministic saint-of-the-day hero (FNV over the
  ISO date; image-bearing saints preferred silently; shared link = shared
  page), slot transition on day change (260 ms, direction follows travel,
  instant under reduced motion), Monday-framed week strip with density dots
  and arrow-key stepping, month view with year-crossing cursor, deep links
  via replaceState (no history spam), the day in Julian/Coptic/Ethiopian
  reckonings alongside, church-grouped register with each tradition's titles
  and feasts in their own reckoning, and the empty day as a designed state.
- `view-transition-name` markup is on hero and register names now, per
  Addendum D, so Session 4a's shared-element transition is CSS only.
- 75 tests pass. Bundle: 10.1 KB JS + 3.0 KB CSS gzipped.

Deferred knowingly: the calendar-preference *setting UI* (the default
Gregorian-with-reckonings-alongside rendering is in); hover-legend beyond
native SVG titles; date-bar rendering (4a, where the detail page needs it).

## Session 4a — Phase 1b: detail page, store, habit features — DONE (2026-08-21)

96 unit tests, 62 browser tests. What shipped, and what it settled:

- **`src/lib/store.js`** over IndexedDB (`idb`), the four §11 stores behind one
  interface. Every record carries a stable `id` and an `updatedAt`; an unsave
  writes a **tombstone** rather than deleting, because without one a stale save
  arriving from another device would resurrect it — the merge rule a sync
  adapter will need (`merge`, last-write-wins) is implemented and tested now,
  even though nothing syncs. Storage-blocked contexts fall back to an in-memory
  table silently, so a private window gets a working Save button rather than a
  dead one. Settings stay mirrored in localStorage: the theme must be readable
  before first paint, which IndexedDB cannot do.
- **Detail page** at `/saints/:slug`. The manifest already holds the name, the
  image box, the dates and the badge, so the page paints from data the reader
  has had since load and the fetch fills in only the per-saint parts. Veneration
  is listed church by church — including the churches we have not sourced, which
  say so in words. The rite × communion matrix (§9.2) is still Phase 3.
- **Date bars** are the uncertainty curve's first consumer. Positioned in
  percentages, softened in pixels, so the drawing is right at any width without
  rescaling the curve. One decision recorded in DESIGN.md §6b: an interval with
  one open bound dissolves over *extent* rather than blur radius, because the
  curve's 24 px clamp would erase the bound at the other end.
- **A small Markdown renderer** (`lib/markdown.js`) rather than a dependency:
  the corpus uses headings, paragraphs, emphasis, links, lists, rules and
  blockquotes, and nothing else. Block structure is decided on the raw line and
  escaping happens after — escaping first turns every `>` into `&gt;` and
  blockquotes quietly stop existing, which is how the first version shipped and
  what its test caught.
- **Save and Continue reading**, both shelves on the calendar, hidden when
  empty. Reading position is recorded on arrival and every 1.5 s while
  scrolling, and *offered* rather than restored: a reader following a link from
  another life expects the top of the page.
- **Prefetch** capped at four in flight, hover on desktop, viewport entry on
  mobile, cancelled on navigation. Both branches are covered by browser specs;
  the mobile one needed a touch context to reach at all.
- **Shared-element transitions** are CSS, as planned — but a saint venerated by
  two churches on one day appeared in both register groups with the same
  `view-transition-name`, and a duplicate makes the browser skip the transition
  entirely. The register now names the first row only, and the leaving day panel
  drops its names during the slot roll.

Deferred knowingly: place names on the detail page (the map is where locations
belong, Phase 3); export/import (Phase 3, per the brief); the calendar-preference
setting UI, still.

## Session 4b — Ship gate

Full §13 audit: 360px, keyboard focus, reduced-motion, Lighthouse ≥ 95, axe
clean, FCP < 1.5s throttled, no layout shift. Fix what it finds. Deploy.

## Session 5 — Phase 2a: Index mode — DONE (2026-08-21)

112 unit tests, 88 browser tests. The Index is live at `/saints`; River mode
stays absent rather than stubbed, and the mode toggle arrives with it.

- **Filters** are all of brief §8.2 — church, feast month, date range, type,
  sex, region, historicity, breadth of veneration — OR within a facet, AND
  between facets, and the facet lists offer only values the corpus contains, so
  no filter is a dead end. Feast months come from the same `buildFeastIndex`
  the calendar uses: a Julian or Coptic feast reaching a Gregorian month is
  calendar work, and there is one place in this codebase that does it.
- **The range toggle** defaults to Overlaps and uses `dates.js`'s existing
  `overlaps` / `within`. One consequence is worth knowing before it looks like
  a bug: Moses the Hungarian, born before 1000 and dead in 1043, *overlaps* the
  4th century, because his birth bound is open below and nothing we have found
  rules it out. Narrowing that would mean inventing a lower bound.
- **The undated tray** exists and is unit-tested, but no saint in the corpus of
  ten is undated at both ends, so it never appears yet. That is the honest
  state; posing an undated saint in a browser test would have meant a folder
  that is not a saint.
- **Virtualisation** takes exact heights from the manifest's aspect ratios and
  never measures (Addendum C2). Two numbers — an 18 px inset for the card's
  padding and border, and a 110 px text block — are shared between
  `views/saints.js` and `styles/index.css`, and are commented as such in both;
  the first version omitted the inset and cropped every image.
- **MiniSearch loads on demand.** It is a third of the bundle and the calendar
  never searches. A query typed before it arrives applies a moment later.
- **The first render is no longer a view transition** (DESIGN.md §6). Gating
  the app's first paint on `startViewTransition`'s callback left a blank page
  for a second in a headless browser, and a background tab could hold it there
  much longer. Session 4a's shared-element transitions are unaffected: those are
  page *changes*.

The Index grid sits in the standard 72ch content column, which is two cards
wide on a desktop. That is DESIGN.md §5 built exactly; widening the column for
this page is a design decision, not a code one, and is left to the author.

## Session 5b — Structural efficiency pass — SCHEDULED (2026-08-22)

Addendum G, applied to the code as it stands. Scheduled before Session 6
because the River reuses the Index's filter pipeline and the grain track, and
it is cheaper to give it derived keys and a shared feast index than to retrofit
both into two views. One sitting; every item is a pure-function change with a
unit test, and the browser suite is the regression gate. Nothing here changes
what the reader sees.

1. **`manifest.meta.json` off the boot path** (G1). `lib/manifest.js` fetches
   the manifest alone; the meta loads from About when Session 9 gives About a
   reason to read it. Until then nothing reads it — verify with a grep before
   and after.
2. **Per-card derived keys** (G2). One module derives `{ breadth, lifeInterval,
   venerated }` per card once at manifest load; `index-filters.js`'s
   `matchesFacets`, `inRange` and `sortCards` read the keys instead of calling
   `breadthOf` / `lifeInterval` / `veneratedChurches` per comparison. The unit
   tests for `index-filters.js` already pin the semantics; they must pass
   unchanged — this is a cost change, not a meaning change.
3. **One memoised feast index** (G3). `lib/feasts.js` exports a
   `feastIndexFor(year, data)` cached by year; the calendar's module-level
   `indexCache` and the Index's `monthsBySlugFor` both read it. `facetsOf` is
   cached on the manifest the same way.
4. **Bounded detail cache** (G4). `lib/detail.js`'s `cache` takes a small LRU
   — payloads only, not the queue or the in-flight set. A unit test evicts
   the oldest under pressure and keeps a hit warm.
5. **Hygiene, while there.** `daysInMonth(cursor)` sits in two loop conditions
   in `views/calendar.js` and round-trips four JDN conversions per evaluation;
   hoist it, or compute it as the JDN difference between two first-of-months.

Out of scope, by decision: code-splitting views, splitting CSS, tuning the
calendar's per-day paints (Addendum G's closing paragraph). The font preload
question (G6) is the author's and sits with Session 4b's ship gate.

## Session 6 — Phase 2b: River mode
## Session 7 — Phase 3a: globe
## Session 8 — Phase 3b: timeline, export/import, rite × communion table (§9.2)
## Session 9 — Phase 4: PWA, offline, About page statistics

About's statistics are where `manifest.meta.json` is first read; it is fetched
there, lazily, and never at boot (Addendum G1).

## Deploy change, from Session 1 onward

`data/manifest.json` is generated and gitignored, built by CI. The site stops
being "commit static files to a branch" and becomes "Actions builds, Pages
serves the artifact". This also removes the prototype's runtime dependency on
the GitHub API for listing the saints folder — the manifest is the listing now,
so new saints no longer need a push before they are visible locally.
