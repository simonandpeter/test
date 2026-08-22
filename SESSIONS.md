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

**Still outstanding from earlier sessions:** the seven images need a per-image
`source_url` (live in production as 7 build warnings — the licence itself was
settled on 2026-08-21 as Public Domain Mark 1.0, which obliges no attribution,
so credit is no longer asked for); the Assyrian Church of the East's
`paschal_computus` is unverified and flagged `needs_sourcing` in the registry.


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
