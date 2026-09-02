# Agent notes

Map, not a briefing. `HANDOFF.md` has state and rules; `SESSIONS.md` has the
reasoning. Line numbers drift — fix a wrong pointer rather than trusting it.

## Where things live

**Daily page** — `src/views/calendar.js` + `src/styles/calendar.css`
- `src/views/daily/` is "what is today": `state.js` (sole writer), `format.js`,
  `entries.js` (feast index, reach), `record.js` (readings/hymns markup),
  `panel.js` (hero, register, silences), `picker.js` (rail *and* month — one
  control), `motion.js`.
- calendar.js keeps "which day": `render`, `select`, the roll, liturgy line,
  fast bubble. Nothing in `daily/` calls back into it.
- **Two columns past 1024 px** (author, 2026-09-01), and since the second pass
  that day they are **two real boxes rather than one panel split in half**:
  `.cal-main` holds the date, the liturgy line, the left day panel and the
  shelves; `.cal-side` holds the right day panel; `.cal-controls` sits between
  them in the document. `calendar.js` paints a day into a *pair* of panels and
  `slotSwap` rolls both. Three instructions forced that shape and none of them
  is possible with one panel: only the right column moves when the month opens
  (the left spans both grid rows, so growing row 1 cannot move it), the two
  scroll independently (each column is its own scroller and the route gives up
  the page's), and Continue reading belongs to the left. The name days went to
  the right, under the hymns. On a phone `.cal-main`/`.cal-side` are
  `display: contents` and `order` puts the six children back in reading order.
  **Known gap**: the desktop page no longer scrolls, so main.js's section
  scroll restoration has nothing to remember there — a return lands at the top
  of both columns. Anything that watched `window` scroll had to learn to watch
  whatever scrolled instead (`ui/coachmark.js`, the fast bubble in
  `calendar.js`), which is the shape of bug this change produces.
- The measure: `main` takes the window on every route (`--page-max`, base.css)
  rather than 72ch, which is what lets the header line up with the columns;
  the **right** column is what is held (`clamp(25rem, 28%, 30rem)`) and the
  left takes all the slack. The picker's floor is what sets
  the right column's: seven days, two shoulders and the month toggle need
  ~400 px, and at 330 the rail showed six days and the month would not unfurl.
  It also takes the phone's own 24 px `--cal-peek` **and its gaps** — copying
  the peek without the gaps put the month's columns 3 px off the week's.
  Two consequences worth knowing: the month now unfurls *beside* the day
  rather than pushing it down (so the tests measure `.slot-viewport`, not the
  h1), and the h1's gold rule spans the left column rather than the page.
  Three more things about it:
  (1) below the breakpoint both boxes are `display: contents`, so the phone is
  document order and unchanged — except that the name days now follow the
  register rather than the hymns, which is the price of the left column being
  a *single* grid item (a spanning item hands its height to the rows it
  crosses, and a long day of hymns drove the name days to the foot of the
  page); (2) `Continue reading` is outside the day panel — the panel is
  replaced wholesale on every day change — so `.cal` and `.day-panel` are two
  grids sharing one `--day-cols`, which only line up because nothing between
  them adds horizontal padding; (3) **the widening is set in index.html before
  first paint**, not only by main.js, or the page paints at 72ch and jumps —
  0.08 and 0.11 of CLS, blamed on `main.chrome`, reproducible only under load.
  That is the map's own 0.21 lesson, learnt twice.
- **The hero icon is shown whole up to 1:1.6** (same day), cropped from the
  bottom past it. The shape is computed per saint in `panel.js` from the
  manifest's own dimensions and passed as `--hero-shape`, because only the
  data knows one icon from another and the box must still be reserved before
  the image decodes. The author also asked for a cap at twice the square's
  height; it is never the binding one — the square's height is its own width,
  so that is 2w against the ratio's 1.6w — and `panel.js` says so rather than
  writing a `min()` term that can never be reached. Below 620 px the 3:2 band
  stands: there the image is full width and *is* the card's height.
- **The card is at least 18 lines of its own preview tall, and the picture's
  column is derived from that** (author, same day). `--lede-lines` is the one
  number the `min-height` and the lede's clamp both read. The column is
  `min(42%, 30rem, --card-h / --hero-r)` — the third term is what stops a
  wider column making *portrait* icons enormous while it makes landscape ones
  right (662 px of Lupus over a 505 px card was the version that asked for
  it), and `--hero-r` is the icon's own drawn ratio, written per saint.
  Because it is a *minimum*, the browser test pins the resolved `min-height`
  rather than the rendered height: the card is usually taller, so an
  at-least assertion would pass with the rule deleted.
- **`.hero-more` is the way into the life** — "…continue reading ›", bottom
  right of the text column at both widths, `margin-top: auto` in a flex
  column being what puts it at the bottom rather than merely after the text.
  Unlike the hero image beside it, it is *not* hidden from a screen reader:
  the image is a wordless second link to a page the name already opens, this
  has words and a different promise, and it carries an aria-label naming the
  saint.
- **The chrome doubles and spans the window past 1024 px** (same day, in
  base.css): 34px masthead, 27px nav and controls, `max-width: none`. The
  theme toggle is deliberately not doubled — it is a box around a glyph, and
  64 px of it beside 27 px type reads as an escaped button. `--chrome-h-reserve`
  gains a third value (58.1406px) and `chrome.spec.js` pins all three; note
  that test **cannot** catch the doubling being backed out, because the
  reservation is a `min-height` and holds the bar open regardless — `the
  chrome doubles and spans the window on a wide screen` is the one that does.
- The rail and month are one seam. The *day* half is separable.
- A day steps three ways: click a rail/month day, the arrow/A-D keys anywhere
  on the page (`wireDayKeys`), or a touch swipe on the day panel itself
  (`wireDaySwipe`, `picker.js`, 2026-08-31), reusing the week/month's own
  `onGrainDrag` gesture primitive rather than a bespoke listener. Unlike the
  week or month there is no neighbour parked beside the panel to drag into
  view — a day is a whole hero and register, not a cheap cell, and
  pre-rendering both neighbours on the chance of a swipe would be real work
  paid on every visit for a gesture most visits never make. So `move` follows
  the finger with a plain `transform` on the live panel alone (direct
  manipulation, the same standing `grain.js` gives its own drag — it runs
  under reduced motion too), and only past `SETTLE` does a real day change
  happen. **The roll itself is vertical by default and sideways for a swipe**
  (`slotSwap`'s `swipeDx` parameter, calendar.js): a click or a keypress still
  gets the original fade (`slot-out`/`slot-in`, translateY); a swipe gets a
  sideways pair (`.slot-viewport.swipe`, `slot-out-x`/`slot-in-x`) instead,
  continuing smoothly from wherever the live drag let go via an inline
  `--drag-x` rather than snapping back to centre first — a swipe already told
  the reader which way the day moved, so the picture answers on the same axis.
- Also-commemorated is `.reg-card`, the register's own row, not the Index's.
- Hero carries no bookmark. Liturgy line: `paintLiturgy`; Great Feast from
  `lib/liturgy.js`. Both header panels fly: `src/ui/fly.js`.

**All Saints** — `src/views/saints.js` (composition only) + `src/styles/index.css`
- `src/views/index/`: `state.js`, `modes.js` (carousel + toggle), `sticky.js`,
  `count.js`, `filter.js` (no DOM), `grid.js` (layout, reconcile, mounted
  window, `wireGrid`), `controls.js`, `search.js`, `place.js` (snapshot).
- Two faces: carousel (default on every load) and search. `state.mode`;
  `applyMode` toggles classes on the view root. Nothing is rebuilt to swap face.
- Carousel: `paintCarousel` fills `[data-carousel-track]`; `ui/loop-scroll.js`
  is the endless-scroll engine. Cells are columns of 1–4 saints packed by
  height (`carouselCells`). Size is `--cx-w`/`--cx-max-h`, driven by
  `--cx-space` published from `modes.js` on resize. A run that fits does not
  loop (`is-static`). Imageless saints render no media box.
- Cards and rows size to their name's line count (`cardHeights`, `rowHeights`,
  `nameLines`). `ROW_NAME_LINES_MAX` and the CSS `-webkit-line-clamp` are one
  decision in two files.
- Grid is virtualised *and* absolutely positioned: mounted set ≠ corpus, DOM
  order ≠ screen order. Use `leaders()`; never `.first()`.
- Bookmark is on the saint page and shelves only.

**Saint page** — `src/views/saint.js` + `src/styles/saint.css`. The `.name-line`
pattern (name shrinks, sibling control holds width) is defined once in base.css.
Everything below the life sits in `[data-late]`, hidden until the payload lands:
it appends rather than reserving, because a life's height is unknowable.

**Map** — `src/views/map.js` + `src/styles/map.css`.

> **The 2026-08-31 reshaping is the biggest single change this view has had.**
> Gone: the `Map` h1 drawn on the picture (now `.sr-only` — the heading still
> exists for screen readers and for `the heading takes focus on navigation`),
> the four Died/Born/See/Relics kind buttons, the `Whole world` button, and
> the `Whole span` button. Arrived: a saint-and-place **search**
> (`wireSearch`, `data/places.js`), **typed year boxes with BC/AD** on the
> timeline's two ends, a **preset period list** (`data/periods.js`) where
> `Whole span` stood, **leader-lined label clusters** (`lib/map-labels.js`),
> and **one dot per saint chosen by date** (`pointAt`) in place of the kind
> selector. Later the same day the **footer went too** (the Natural Earth
> credit and the scroll hint; the credit is on About now), the timeline's
> **`x/y shown` readout** went with it, and the dot learned to **move along a
> dated track** (`lib/map-track.js`). Sections below are current; anything
> elsewhere describing kind buttons, a map footer or a timeline readout is
> stale.

A flat Mercator on canvas,
not §8.3's globe (author, 2026-08-29). No runtime dependency: `lib/mercator.js`
is the whole projection and `tests/mercator.test.mjs` pins it against named
places. `src/data/land.js` is generated by `scripts/make-land.mjs` from
`world-atlas`; `src/data/water.js` (lakes and rivers, 2026-08-31) by
`scripts/make-water.mjs`, which fetches Natural Earth's own GitHub mirror
directly since no npm package carries rivers/lakes the way `world-atlas`
carries land — **neither is hand-edited**, and `world-atlas`/`topojson-client`
are dev-only. Both moved from Natural Earth's 110m tier to 50m on 2026-08-31
(more real coastline/water detail, not finer coordinate rounding, which was
still `PRECISION` at a tenth of a degree, ~11 km); the pair loads in
parallel, dynamically, off the boot path. `PRECISION` itself was raised to a
hundredth of a degree (~1.1 km) on 2026-09-01, alongside doubling `MAX_SCALE`
(`lib/map-view.js`) — the reader wanting to prise apart the crowd of saints
at Constantinople was, this time, also asking to see the ground there
properly, so the two moved together rather than the zoom outrunning the data
again. Combined the pair is now ~433 kB gzipped, up from 211 kB — a second
deliberate weight-for-precision trade, on top of the one 110m→50m already
made.
**The page is the map and its timeline, nothing else** (author, 2026-08-30
for the reading — lede, facets, Places, tray — and 2026-08-31 for the footer
that survived it). Natural Earth requires no attribution, so the coastline
credit was never owed; it is on the About page's sourcing section as a
courtesy (`about.sourcing.map`). What is left of that strip is
`.map-note` — a box floating on the picture, `hidden` until the coastline
*fails* to load, so it costs the map no height at all on an ordinary visit.

**One dot per saint, and by default it does not move.** The kind of place is
chosen by where the timeline's upper handle stands (`pointAt`, 2026-08-31) —
past the death year the relics or death place, during the life a see or
birthplace, before the birth the birthplace — **but only when the reader ticks
`Movement`** (author, 2026-09-01). Unticked, which is how the map opens, every
saint sits at their resting place and the timeline only dims. That is the
simplification: a reader dragging the years is asking which saints belong to a
period, and walking sixty-nine dots around the picture answered a question they
had not asked. The box is opt-in for a second reason — the line a dot takes
between two recorded places is nobody's finding, and behind a named box that is
a mode rather than a claim the map makes on its own.

**Above them both is `Filters`** (`wireFilters`, `.map-filter`, 2026-09-01),
a button opening a panel with two boxes: saints already dead, and saints not
yet born. Both start unticked, and **neither ever removes anything** — "even
with these boxes unticked, you still see a dot" (author). Unticked, a saint
outside the reader's span keeps their dot and loses the two things that are a
*claim* about them, their name and their halo; ticked, they read as any saint
the range reaches. The panel says so in a line of its own, because a reader
who ticked a box expecting new dots would otherwise have to work it out from
an unchanged picture. This generalises the hard-coded rule the unborn had
carried since 2026-08-31 rather than inventing a second one.

**Beside it is a play button** (`wireMotion`, `.map-corner`, bottom left) which
walks the *upper handle* from the low end of the reader's own span to the high
end at a year a second (`PLAY_MS_PER_YEAR`, read as a rate off
`performance.now()`, so a dropped frame costs frames and not years). It is
disabled until `Movement` is ticked, and any touch on the timeline stops it
(`wireTimeline`'s returned `onTouch`). Playback moves one handle and invents no
second notion of "now", so the year buttons, the dimming and the dots keep
reading the one pair of numbers they always have — and the map lights up
through the centuries as it goes. Pausing leaves the handle where it stopped,
which really is the range now: the next press plays the span as it then stands.
 `pointAt` also returns the
`state` the draw pass dims by — `live` inside the range, `past` after a
life (greyed), `future` before one (greyed twice as far, and no halo, since
a halo is a claim about a place someone *was*). **The timeline therefore
dims rather than removes**, which reverses how it shipped: every located
saint is drawn on every paint. **The `{from}-{to}: {shown}/{total} shown`
readout is gone** (author, 2026-08-31) and nothing replaced it — the range is
what the two year buttons print, and the count stopped meaning "dots on the
picture" the day dimming replaced removing. `map.spec.js`'s own
`timelineReadout` helper reads those two channels instead.

**Which side of the range a life falls on is `lifeBounds`, not `overlaps`**
(`lib/map-track.js`, 2026-08-31). The difference is one case and it was a
reported bug: `lifeInterval` keeps an open bound open, and `overlaps` reads an
open *start* as reaching back forever — so Moses the Hungarian, whose birth
the corpus records only as "before 1000", was lit at full strength in the
fourth century. `lifeBounds` falls back to the bound that *is* stated. For a
saint with no birth at all this reads their death year as the first year they
can be placed, which is stricter than the truth and still the honest bound
this corpus holds. **And a saint not yet born gets a dot and no name** (same
day): `future` dots are kept out of `layoutLabels` entirely rather than drawn
faintly, so the room goes to the saints the reader's range actually reaches.

**A saint may carry a `track`, and then the dot moves along it.** This is the
second half of the author's "tracker", and it needed data before it needed
code: a `track` is an *ordered, dated* list of stays in the saint's own
`saint.json` (`schema/saint.schema.json`'s `waypoint`), which `locations` —
unordered kinds with no dates at all — could never be. `lib/map-track.js` (pure, unit-tested) is the whole reading: `progressAt`
turns a year into a place on the track — `i` is "at stay `i`", `i + f` is
"`f` of the way along the leg out of it" — and `pointOn` turns that into a
position. **The legs wander rather than running straight** (`pointOnLeg`,
`WANDER` a sixteenth of the leg, 2026-08-31): nobody recorded the road, and a
straight line says so no better than a curve while also reading as a claim to
have flown. The wobble is two harmonics under a `sin(pi t)` envelope, seeded
from the leg's own endpoints so it is the same road every frame, and it is
computed in lon/lat so it bends the same way at every zoom. `trackPath` is
what `paintCanvas` strokes, and `pointOn` is where the dot rides — the same
curve, not two that meet at the ends.

**A moving dot glides toward its year rather than snapping to it** (`railAt`,
`glideTo` along a track, `glidePoint` between two plain places — and
`glideStep` returns 1 outright when `Movement` is off, so the resting map has
no easing in it at all). The rail is far coarser than the road it scrubs: 1872 years over
a few hundred pixels is six years a pixel, more than Moses's whole flight
from Poland, so one pixel of drag was a dot teleporting across Europe. Easing
runs in *progress* space, not position, or it would cut the corners instead
of taking them; `dt` is capped at two frames because the map paints only when
something happens and an uncapped step closes the whole gap at once. Only a
saint with a track eases — a saint without one does not travel between their
own places, they are simply recorded at each. Reduced motion arrives instead.

**The legs are drawn, not sourced**, and each waypoint's own `note` says so.
Moses the Hungarian is the one saint who carries a track today: Hungary until
1000 (his birth interval's own latest, the only bound the corpus states about
him before 1015 — the year he left is unrecorded and the crossing to Rus' is
drawn over the years that follow), Kyiv 1015–1018 (the three years of hiding
with Predslava after Boris was killed on the Alta), Poland 1018–1025, the
Caves from about 1033. He was freed in 1025 and at the Caves for the ten
years before a death in about 1043, and the eight years between are what the
dot is seen crossing. `build-manifest.mjs` carries
coordinates and years into the card and leaves the place names and notes in
the folder, the same rule `locations` keeps.

Zoom and pan live in `lib/map-view.js` — pure, unit-tested; `MAX_SCALE` is 240
(2026-09-01, doubled from 120, prompted by the crowd of saints at
Constantinople) matched this time to a coastline precision doubled the same
day rather than left behind by it: `PRECISION` (`make-land.mjs`) went from a
tenth of a degree to a hundredth, so 240 — ten times the old honest ceiling
of 24 — is itself the new one, not a knowing overshoot of it. Past 240 the
same objection from §6b would apply again: the coastline is a visibly coarse
polygon past its own honest ceiling, because the reason to zoom this far is
prising apart two saints who died in the same town, and
`declutter`'s spread is a fixed number of screen pixels. **A bare wheel
zooms** (same author instruction, reversing the old only-Ctrl rule: with
nothing below the stage there is no page to scroll past), touch is the map's
always (`touch-action: none`), and the route cannot scroll (`overflow:
hidden`; the flex column through `#view` fits the window exactly). Labels
arrive past 2.5×, laid out by **`lib/map-labels.js`** (pure, unit-tested):
it single-linkage-clusters the dots, gives a lone dot the space beside it,
and stacks a *whole* cluster into a column with a leader line each — deciding
per cluster rather than per dot, because trying side placements first let one
label take the space the column needed and dropped two of five (a test caught
that, not a screenshot). **A column is placed as one block** (2026-08-31):
held inside the picture, and slid up or down a row at a time (`SHIFTS`, up to
eight) until every name in it fits, before any row is dropped. Both halves
were one report — on a phone at full zoom two of the five saints at
Constantinople could not be read, one because its row met the neighbouring
Nicomedia column and one because the widest name ran off the right edge.
A dot that is itself off the picture is still never named, or the clamp would
draw a leader line out of the frame to a name pointing at nothing. **A lone
dot prefers the side that fits the whole name** to the side that merely
touches the picture (2026-08-31): right-then-left with no such preference put
a long name off the edge whenever the right was so much as grazed, and the
chosen saint's `Profile ›` button hangs off the end of their name.

**The columns only run past `LEADERS_AT` (29×)**;
below it `layoutLabels` is called with `leaders: false` and behaves as the
pass that shipped before them — beside the dot or not at all. The author
asked for that on seeing the columns everywhere ("the name display worked
better before"), and density is why: at 3× nearly every dot is within
`CLUSTER_PX` of another, so the corpus collapses into one or two clusters
and the column becomes thirty names with thirty lines fanning across the
Mediterranean. Past 29× a cluster is a few saints in one town, which is the
case the column was built for. They fade in and out over 300ms rather than popping
(`stepLabelOpacity`, `labelState`, `labelLastAt`) — which label wins can flip
frame to frame during a pan, and popping read as flicker where easing reads
as the map settling.

**A press chooses a saint; it stopped being a door on 2026-08-31.** It was
one from 2026-08-30 (Amendment 77) and the reversal is the author's: a press
under 5 px of travel — on the dot *or on the name*, which is by far the
larger target — flies the map to that saint (`choose`/`flyTo`, cubic
ease-out over 450 ms, an instant arrival under reduced motion), and only when
the flight lands do they become `selected`.

**The flight frames their whole rail, and then the dot walks it** (author,
2026-09-01: "it centres you gently over its whole rail instead of one
position", and "the dot goes over the rail smoothly over 5s"). `fitBounds`
(`lib/map-view.js`) takes the track's extent and hands back the view that
holds all of it with a margin, capped at `RAIL_FIT_MAX` (30) so a short rail
does not slam the picture to 240×; **`flyTo` therefore eases the scale as
well as the centre**, geometrically, clamping every frame — which a
constant-scale flight never needed, two views having valid views between them
only while the scale holds still. A saint with no rail keeps the reader's own
scale and the pressed pixel as the anchor, exactly as before. The walk
(`railPlay`, `RAIL_PLAY_MS` 5000, smoothstepped) is **not the `Movement`
mechanic and reads neither it nor the timeline**: one saint, their whole
track end to end, once, on the press that chose them. It ends by handing the
glide the rail's far end, so ticking `Movement` afterwards eases from where
the walk finished. Reduced motion skips it — the rail is drawn whole either
way, so it removes an animation and no information.

**And everyone else falls back while one saint is chosen** (`SELECT_DIM`,
0.35 — author, 2026-09-01: "when selected, the other saints become less
prominent"). It multiplies the dimming a dot already carries rather than
replacing it, so the timeline's three states still read against each other
underneath; halos take it on their own layer, so the single `GLOW_MAX`
composite still bounds the whole of it. Selection does three things: the
saint's `track` is drawn as a dashed rail, and **only theirs** — every rail
at once would be a second kind of mark nobody asked a question to get; their
name is laid out whatever the zoom, and *first*, so the layout seats it with
the picture still free; and a real `<button>` `Profile ›` is placed beside
that name, which is now the way from the map to a saint page (whose × still
returns to `/map`, saint.js wireBack). A press that finds nobody, or Escape,
lets go. The button is in the document rather than drawn, because the canvas
is one opaque image a screen reader cannot be tabbed into a word of; it sits
beside the name on the far side from the dot, or **under** the name when
neither side has room, which on a phone is the ordinary case rather than the
edge one. The flight centres the world point under the *pressed pixel*, not
the saint's own coordinate, so `declutter`'s fan does not leave the dot a
ring's radius off centre.

The canvas publishes `data-labels`, `data-named` (which slugs, in paint
order, so the last is the name drawn over the others), `data-dots` (each
mark's `state`, `n` and the `alpha` the paint used), `data-selected`,
`data-rails`, `data-rail` (the stroked rail's px box), `data-walking`,
`data-land` and `data-water` for the suite, written by the draw pass so
doing-nothing reads 0 or empty. `data-rail` exists because the rail is dashed
rubric and so is every dot: a test that read the framing off the ink measured
the dots too, and passed with the framing backed out. A label is kept as long as any part of its rect is on
screen, dropped only once the whole of it has left the box (2026-08-31,
`map-labels.js`) — its far edge crossing the boundary used to hide the whole
name outright; the canvas already clips whatever is drawn past its own
bounds, so there was nothing this needed to do but stop refusing to try.
**Saints at one identical coordinate are spread into a tight ring, in
degrees** (`spreadShared`, `SPREAD_DEG` 0.0167° ≈ 1.8 km — author,
2026-09-01: "spread the dots around as coordinates on the map if they're
stacked ... still pretty tightly spaced when zoomed in fully to communicate
proximity"). **The unit is the whole difference from the fan below**: a
ground offset is sub-pixel with the world on screen, so `mergeDots` still
collapses the group into one honest mark, and it opens into a constellation
only as the reader goes in — ~10 px between neighbours at 240× on a 900 px
picture. The ring's latitude is multiplied by `cos(lat)` so it draws round
under Mercator rather than as an ellipse. This reverses, deliberately, the
"identical coordinates never separate" rule written hours earlier the same
day; the map tests that pinned it were rewritten rather than deleted.

**Dots the reader cannot tell apart are one mark, at a real coordinate**
(`mergeDots`, `lib/map-view.js`, pure, unit-tested; 2026-09-01). This
replaced `declutter`, which fanned them into concentric rings a fixed number
of *screen* pixels wide, and the author's report is what retired it: "the
clustering at full zoom doesn't work: the saint dots in constantinople
stretch out into the black sea. Make it so more dots are revealed as you zoom
in and are actual coordinates on the map not scaling clusters." Every
position in that fan was invented, it covered more country the further out
the reader went — across the Bosphorus and into the Black Sea — and it never
resolved, the ring being the same size at 1× as at 240×. Now every mark sits
on a coordinate a saint is actually recorded at (the representative's own),
a mark standing for more than one carries `n` and prints `{name} +{count}`,
and members separate into marks of their own as zoom pushes them past
`MERGE_PX` (10) — so **more dots really are revealed going in**. Saints at an
*identical* coordinate (twenty-four martyrs at Nicomedia, John the
Long-Suffering and Moses the Hungarian at the Kyiv Caves) never separate at
any zoom, so they stay one mark that says how many; **a second press on a
mark steps to the next saint under it**, which is the only way those are
reachable and is why the press cycles rather than refusing.

**Which name a crowd prints is `rankOf` (map.js) over `dailyRank`
(`lib/map-labels.js`)** — author, 2026-09-01: "favour the saints that are
main saints on the daily page and the also commemorated in order when
deciding which name to print over the others when zoomed out". `dailyRank`
borrows `pickHero`'s own precedence, a saint some church sings for above one
with an icon above the rest; the two tiers above it are the chosen saint and
**a saint whose dot is moving** ("if a saint moves along its rail, make their
name print over others while its moving"). A rail breaks a tie inside a tier
and is never a tier of its own — it is what makes Moses rather than John the
mark at the Caves, the two being equal on everything else. The same order
seats the labels (best-ranked laid out first, against a free picture) and
paints them (best-ranked last, so it lands on top).

The old `keyOf` note is gone with the fan it described. **This does not make
every dot followable to the full 240×** — a wheel spun without the pointer
ever re-centring can still out-run a dot on a window that has shrunk to a
sliver of a degree, which is a limit of anchor-preserving zoom at a high
ceiling more than of any one bug.

**Halos are composited on their own layer and laid down once at `GLOW_MAX`
(0.5)** — author, 2026-08-31: the glow "never exceeds 50% opacity". Capping
each halo separately cannot hold that line: alpha compositing is
`1-(1-a)^n`, so three halos at 0.45 already reach 0.83 and a cluster is
effectively opaque. One layer, merged however the halos like, then a single
`drawImage` at 0.5, means the darkest pixel the coastline can ever see is
exactly 0.5 whether one saint is under the pointer or forty. The halo
*radius* cap came down at the same time (`min(w,h)/8`, was `w/2`): `w/2` was
chosen when `MAX_SCALE` was 12 and never bound; at 120 every halo became a
640 px disc and capping alpha could not help, because 50% of a saturated
wash is still a saturated wash.

**A timeline bar sits under the picture** (author, 2026-08-30 evening),
drawn on the stage per Amendment 77's promise rather than printed below it:
two overlaid native `<input type="range">` over one rail, reading each
card's `lifeInterval` (from `lib/index-filters.js`, same semantics as the
Index's own date facet). Undated cards are never dimmed — there is nothing
to judge them against — so they always show at full strength. **That is also
a claim, and on 2026-09-02 it read as a false one**: `pointAt` returns
`state: 'live'` for an undated life, so Sergius of Radonezh was lit, haloed
and named at 66 AD (author: "any saint who is on the map for longer than 100
years as alive may need a check"). Eleven located saints were in that state
and not one of them had a *wrong* date — the corpus takes its years from
days.pravoslavie.ru, and these were saints the Russian calendar does not
keep. Five were datable and now are; the six that remain are named in
`tests/map-span.test.mjs`, which holds that list and the author's
hundred-year threshold so a twelfth cannot arrive unnoticed. Shortening it
means finding a source: saint.gr prints no year for any of them, and a
martyrdom placed only by naming a persecution is not a date.
`dateFrom`/`dateTo` are held at module scope, for the visit and not
persisted. The highlighted span between the two handles is a third grab
target (`wireTimeline`, on `.map-timeline-fill`): dragging it slides both
handles together and holds their width, clamped as one unit against either
bound. **Each end is a fixed-width button that opens a panel** carrying the
number and a BC/AD select (2026-08-31; it was a bare box and select for one
build, and the author asked for the button). Fixed width is the point:
sized to content, the rail between the two ends jumped every time a year
gained a digit. The button prints the year as read — `431 BC`, `1917 AD` —
the typed number is always positive and the era carries the sign, and
`change` rather than `input` means the ends do not swap mid-keystroke.
Typing an earlier year on the right **swaps the two ends** rather than
refusing — the same sorted-pair rule `commit` has always applied to the
handles. Both are clamped to the corpus's own span, since the rail cannot
represent a year outside it (so a BC year currently clamps to 66, the
earliest located saint — the control is right, the corpus has no ground
below it yet). The outside-press listener that closes the panels is on
`document` and so is registered in `cleanups`, which `destroy` drains. **`Whole span` became a preset list** (`data/periods.js`,
`.map-timeline-preset`) and survives as that list's own first entry: a
`period` is used as written, an `event` is read as its year ±
`EVENT_MARGIN` (50, the author's number, applied in one place).

**A saint-and-place search sits where the legend did** (`wireSearch`,
`.map-search`, 2026-08-31), replacing the kind buttons. One box over two
corpora — the located saints and `data/places.js`'s hand-written gazetteer —
because "where is Anthony" and "where is Alexandria" are the same question
asked of a map. The gazetteer is hand-written on purpose: a modern
populated-places set would miss Constantinople, Nicomedia, Carrhae and
Thebes, which are the places this corpus is *about*. It is a real combobox
(`role`, `aria-expanded`, `aria-activedescendant`) because the accessible
behaviour of a listbox is not light to rebuild, and it **moves the map
rather than navigating** — a dot is already the door to a saint. It flies
through `wireZoom`'s own returned `set`, so the zoom readout moves with the
picture; assigning `view` directly left the chrome saying 1.0×. The flight
is announced into an `aria-live` box, since the canvas is one opaque image
to a screen reader.

**The zoom controls are a scale readout plus, on a pointer device, `+`/`−`**
(author, 2026-08-31). `Whole world` is gone at every width — Home and `0`
still do it from the keyboard, which is what `map.spec.js` now uses. The
buttons hide under `@media (any-pointer: coarse)`, which asks whether a
finger is available rather than guessing from width, so a small desktop
window keeps them and a large tablet does not.

The density-paced *brush* §8.3 describes stays deferred — 69 of 851 located
saints still cannot demonstrate a pacing algorithm, which is a different bar
from the label layout and the dot declutter above, both of which the corpus
can already exercise.

**The dot's own rail is only drawn for the chosen saint**, so the tracker
and the selection are one feature rather than two: `paintCanvas` collects
`rails` from `pointAt`'s returned `track` and keeps only `selected`'s.

**The rest view is `defaultView`, not `lib/map-view.js`'s own `HOME`**
(map.js, 2026-08-31, fixing a real bug rather than a preference). `HOME`'s
`cx`/`cy` of 0.5 is the equator and the prime meridian — mid-ocean, nowhere
this corpus has a saint — and every zoom the + button and the keyboard do is
anchored on the screen's own centre (`zoomAbout(view, …, 0.5, 0.5, …)`,
deliberately predictable). A reader who opened the map and pressed + a few
times without first panning was therefore zooming toward empty sea and away
from every dot: reproduced with Martha of Diveyevo, gone off the top of the
screen by the second press. `defaultView` centres the rest view on the mean
of every located point's own projected position instead (the mean, not the
bounding box's midpoint, so one outlying saint cannot drag the centre toward
ground the rest of the corpus is nowhere near) — computed once from
`withPlace`, not `visible()`, so the timeline narrowing what is drawn does
not also swing the frame around. It is what "Reset" and the keyboard's `Home`
return to as well, held in module-scope `homeView` beside `view` itself. This
does not, and cannot, guarantee every dot survives arbitrarily deep zoom from
a fixed anchor — only that the ordinary case, a few presses with no panning,
still shows a map with saints on it. `map.spec.js` pins the ordinary case.

**And it waits for a box** (`settleHome`, 2026-08-31). `render` can run
before this canvas has been laid out — the router calls it inside a view
transition's update callback, where the document's rendering is suppressed
and a freshly written element measures 0 by 0 — and `coverFractions(0, 0)` is
0/0 on both axes. A NaN frame makes a NaN centre and `toScreen` then puts
*every* dot at NaN for the rest of the visit: an empty picture, and
`createRadialGradient` refusing a non-finite radius sixty-nine times a paint.
So the rest view is computed on the first frame there is a real box for,
through `applyView` (which becomes `wireZoom`'s own `set` once that has run),
and only if the reader has not already moved the map themselves. Until then
the map looks at plain `HOME`.

**Painting is throttled, and the split matters.** `land.js`/`water.js`'s
50m tier roughly tripled the picture's own point count, and painting
synchronously on every raw pointer event a drag or a wheel spin produces —
several a frame — was most of what made the map feel laggy once that data
landed. `render`'s own `schedulePaint` coalesces those into one
`requestAnimationFrame`-scheduled repaint; `view` and the chrome (zoom level,
disabled buttons) still update the instant an event arrives, only the canvas
redraw itself waits a frame. **Only continuous gesture handlers use it** —
the map's own wheel/pinch/pan, and the timeline fill's pointermove
(`refresh(true)`, 2026-08-31). A button, a key, or a kind press paints
synchronously through the same code path they always did: each happens once,
so coalescing buys nothing, and `map.spec.js`'s "Reset comes home" test —
click, then immediately read the canvas — is a real caller a frame of added
latency would have made flaky (caught on `mobile-360`; the fix was to split
`set`/`setThrottled` rather than throttle everything alike). Per-frame cost
itself is cut two more ways: `paintCanvas` skips a land/lake/river shape
entirely once its own lon/lat box cannot overlap the visible frame — cheap at
rest (the whole world is on screen, nothing culled) and large once zoomed
into the corpus's own corner of it, which is where a reader actually spends
their time — and every dataset draws as one path (one `fill`/`stroke` call)
rather than one per shape, which a bug of the same age had made 878 separate
`ctx.stroke()` calls for the rivers alone, and — worse — a fresh
`ctx.beginPath()` per lake ring meant only the *last* of 457 lakes was ever
actually cut from the land.

**The stage is the window, not a card** (author, 2026-08-29), which costs two
things worth knowing. `main` gives up its column on `html[data-route='map']`,
and that attribute is set by **index.html before first paint** as well as by
main.js on navigation — set only in JS it is a 0.21 layout shift. And the world
*covers* a box of any shape (`coverFractions`), so one axis is cropped rather
than the picture being stretched; the painter must size its backing store from
the box, never from `ASPECT`.

Cluster-aware labelling (`lib/map-labels.js`) and the dot-level `declutter`
both shipped once the corpus gave them something to demonstrate (69 of 851
saints located, 2026-08-31; see Map above). Only the density-paced brush —
§8.3's fuller fading-by-crowding vision — is still deferred, and for the
corpus-size reason, not the effort.

**Tokens** — `src/styles/tokens.css`. Two theme blocks; a colour change needs
both, and **both are now checked**. The light ground is `--gesso: #ECE5D6`
since 2026-09-01 (author: "replace the background colour on light theme with
gesso #ece5d6"), warmer *and* lighter than the `#E5E4DD` it replaced, so
every text token gained contrast rather than needing re-tuning; `--field` and
`--veil` were re-derived with it — the veil *is* gesso at 0.8, and a field
left behind would be a grey panel let into a cream page. Three places print
those figures and all three are held to the palette:
`tests/contrast.test.mjs` (DESIGN.md's paragraph), and
`index.spec.js`'s `the day ground is gesso` (the shipped `rgb()` and the
recessed-field relationship). `tests/contrast.test.mjs` recomputes every
text token against both grounds in both themes and holds DESIGN.md's printed
figures to the palette, and `quality-floor.spec.js` runs axe over every route in
vigil mode as well as light. That gap let a WCAG AA failure stand from
2026-08-22 to 2026-08-28 with DESIGN.md recording it the whole time.

**Chrome** — `src/main.js` renders the nav. Sticking is on `.chrome-bar`. The
masthead is an SVG wordmark: `scripts/make_wordmark.py` generates
`src/ui/wordmark.js`, a Vite plugin injects it into both slots in index.html.

**Strings** — `src/ui/strings.js` (source of truth) + `src/ui/locales/{ru,ro,el,sr}.js`.
Touch all five, then `node scripts/locale-coverage.mjs` (0 fallbacks before
done). `BRAND` is the site name and is never translated.

**App mode** — `public/sw.js` (hand-written, four caches, one per §12
strategy) + `lib/offline.js` (registration, and Save's eager precache). Every
cache match ignores `Vary`, the shell's own assets are precached at install by
parsing index.html, and nothing non-ok is ever cached. The worker runs under
the whole e2e suite via `vite preview`; `e2e/pwa.spec.js` is the offline
claims. Icons: `scripts/make-app-icons.py` (committed output in `public/`).
**A carousel rebuild hands its live gesture to its successor**
(`handoff`/`inherit` in loop-scroll) — the worker shifts when fonts settle, and
a wheel spun on a dying loop used to die with it.

**Boot** — `boot()` awaits manifest + `readyDays()` + one locale pack.
`data/liturgical-days.js` is imported only by `days.js`. `manifest.meta.json` is
off the boot path and **the About page is its one reader** (`loadManifestMeta`).

**About** — `src/views/about.js`. The editorial policy, written as substance
(brief §8.4). **It states no number and no source name of its own**: coverage is
read from `manifest.meta.json` at render time, the calendars come from
`data/churches.js`, and the cited publications from that file's `by_source`,
which the build counts from the saints' own files. Anything typed in here goes
stale the next time a folder is added.

**Names** — `lib/honorific.js` (rank precedence), `lib/saint-name.js` (which
recorded form to print). `office` is a field, drawn on the subtext line.

**Saint data** — `saints/<slug>/saint.json` + `life.md`. Never hand-edit
`data/manifest.json`. Icons: `images/icon.jpg` + `icon.meta.json` + generated
thumb. A wrong crop is a data fix, not a CSS one.

## Tests

- Unit: `tests/*.test.mjs`, `npm test` (~15s, 264).
- Browser: `e2e/`, one file per surface, 724 across two projects —
  `daily`, `index`, `saint`, `chrome`, `map`, `pwa`, `quality-floor`, plus `helpers.js`.
  Every spec repeats the `searchMode` `beforeEach`.
- `npm run test:lighthouse` is the §13 pair Playwright cannot reach —
  accessibility and FCP on throttled 4G. It builds and serves its own preview,
  takes a median of three, and gates CI.

**Full suite at four moments only**: before a commit that will be pushed, after
touching shared chrome or `src/lib`, after a merge, at a milestone. Otherwise
run the surface you touched.

| touched | run |
| --- | --- |
| `views/index/*`, `index.css`, `lib/index-filters.js`, `lib/virtual-grid.js` | `index.spec.js` |
| `views/daily/*`, `calendar.js`, `calendar.css`, `lib/liturgy.js`, `feasts.js`, `computus.js`, `fast-grade.js` | `daily.spec.js` |
| `views/saint.js`, `saint.css`, `lib/detail.js`, `licence.js`, `cross-link.js`, `ui/hymns.js` | `saint.spec.js` |
| `ui/*`, `main.js`, `base.css`, `tokens.css` | `chrome.spec.js` + the surface |
| `views/map.js`, `map.css`, `lib/mercator.js`, `lib/map-view.js`, `lib/map-labels.js`, `lib/map-track.js`, `data/places.js`, `data/periods.js` | `map.spec.js` |
| `ui/strings.js`, `ui/locales/*` | `locale-coverage.mjs`, then the full run |
| `lib/*`, `data/`, `build-manifest.mjs` | `npm test`, then the surface |

~25s of every invocation is fixed cost, so a whole spec beats three single
tests. Iterate at **mobile-360** for layout — that is the width that breaks.
Scoped runs take `playwright test` args after `--`.

### `COLD_FACE=1` — rehearse the runner

The runner draws different text: `font-display: optional` means it never gets
Literata, and `system-ui` is DejaVu Sans. `COLD_FACE=1` refuses the webfont and
forces Verdana + Times, harder than the runner does. Run it on anything that
measures text before pushing.

    COLD_FACE=1 npm run test:e2e:desktop -- e2e/index.spec.js

It prints what it measured every run — a rehearsal that silently failed to apply
would also be green. Two tests opt out and say why in their comments.

**The fixture only decorates the injected `page`.** 42 tests open their own
context; `coldFace(page)` and `COLD` are exported for those, and a test using
one should assert the treatment took.

### Traps

1. **Mounted ≠ corpus, DOM order ≠ screen order.** Assert by geometry.
2. **A width measured in the native face is a fact about one machine.** Assert
   by order, force the face, or force the wrap with the column.
3. **`locator.click()` scrolls its target into view**, so pressing something in
   the sticky bar carries the page to the top. Dispatch the press instead.
4. **Anything depending on today's date** fails on exactly one day a year. Use
   `aDayThatIsNotToday`.
5. **A card read off the opening screenful is one shuffle.** Pin the saint by
   name; assert the pin's premise.
6. **A green build says nothing about a code move.** Cut →
   `node scripts/extraction-check.mjs` → fix → build → suite. `--locals` when
   splitting a function body.
7. **A hidden element reports 0 and ignores writes** — `scrollLeft`,
   `clientWidth`. Read before hiding; guard measurements on `clientWidth > 0`.
8. **`loopScroll` is not measurable until it says so.** Wait for the track to be
   past 0 before writing a position into it.
9. **A custom property does not compute.** `getPropertyValue('--x')` returns the
   literal `clamp(...)`; resolve it with a probe element.
10. **CPU throttling reproduces what parallel load cannot.**
    `Emulation.setCPUThrottlingRate` via `newCDPSession`. Set it **after** the
    `goto` — it does not survive a navigation — and prove it bit with a timed
    loop; the achieved ratio is neither what you asked for nor stable.
11. **A dispatched `PointerEvent` ignores `touch-action`.** It arrives at the
    listener whatever the CSS says, so a swipe test built from `dispatchEvent`
    passes on ground where the browser claims the drag as a scroll and a real
    thumb finds nothing. Two bugs in two days — the saint page's columns and
    the Daily page's date, both signed off by a green probe. Assert the
    *effective* `touch-action` as well: it does not inherit, so reading it off
    the target answers `auto` however the page is written — walk to the
    nearest declared ancestor value, which is the intersection the browser
    performs. Or drive the gesture through CDP `Input.dispatchTouchEvent`,
    which goes through hit-testing and does respect it.

**Every fix gets a browser test, backed out and confirmed to fail before being
restored** — against a *rate* where the subject is load-sensitive. That applies
to a tool as much as a fix.

**When you add an instrument, ask what it would look like if it were doing
nothing.** Four things in one day read as evidence and were not.

## Commands

- `npm run build` — manifest + vite build.
- `npm run preview` — serves `dist/` on :4173. Kill it when done.
- `node scripts/shot.mjs <name> <url> [width] [steps...]` — screenshot into
  `shots/`. Steps: `click:`, `wait:`, `key:`, `scroll:`, `lang:`, `church:`.
- `node scripts/locale-coverage.mjs`, `cross-link-audit.mjs`,
  `extraction-check.mjs`, `sessions-index.mjs`, `python scripts/make_wordmark.py`.
- `node scripts/date-audit.mjs [--list <finding>]` — which saints the corpus
  dates badly, worst first: `open` (an interval null at one end, which reaches
  to infinity and which `lifeBounds` has to paper over), `wide`, `loose-basis`
  (`attested` and a century wide — one of the two is wrong), `undated`,
  `no-death`, `no-birth`. **Reports rather than gates**, on purpose: a missing
  birth year is the ordinary condition of a fourth-century martyr, and a build
  that refused one would push authors into inventing years.
- `node scripts/place-candidates.mjs [--place X] [--limit N]` — unlocated
  saints whose *own life* names a place the repository can already put a
  coordinate on, with the sentence it was found in. **Proposes; never
  writes.** Reading is the work: it offered Edessa in Mesopotamia for a saint
  of Edessa in Macedonia, and Nicomedia for five martyrs the Prologue says
  died on the road out of it.
- `node scripts/make-land.mjs` — regenerates the map's coastline. By hand only;
  the output is committed so the build never needs `world-atlas`.

## Workflow

- **CI is the source of truth and you have to look.** A local run is evidence
  about this desk. Read the run's `flaky` line as well as its conclusion.
- **Push your own commits** — PAT location in HANDOFF.md.
- Render every visual change and look at it.
- `git status` before anything destructive; never `git add -A`.
- On Windows prefer Write/Edit or short Python over PowerShell heredocs (BOM
  breaks `JSON.parse`); `export MSYS_NO_PATHCONV=1` before any leading-slash
  argument or env var in Git Bash.
