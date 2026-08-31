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
(more real coastline/water detail, not finer coordinate rounding — that is
still `PRECISION`, ~11 km); the pair loads in parallel, dynamically, off the
boot path, at ~211 kB gzipped combined — a deliberate weight-for-precision
trade the size jump from 110m's ~19 kB earns by backing a real deeper zoom.
**The page is the map and its timeline, nothing else** (author, 2026-08-30
for the reading — lede, facets, Places, tray — and 2026-08-31 for the footer
that survived it). Natural Earth requires no attribution, so the coastline
credit was never owed; it is on the About page's sourcing section as a
courtesy (`about.sourcing.map`). What is left of that strip is
`.map-note` — a box floating on the picture, `hidden` until the coastline
*fails* to load, so it costs the map no height at all on an ordinary visit.

**One dot per saint**, the *kind* of place chosen by where the timeline's upper handle
stands (`pointAt`, 2026-08-31), replacing the four kind buttons: past the
death year it is the relics or death place, during the life a see or
birthplace, before the birth the birthplace. `pointAt` also returns the
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

**The dot glides toward its year rather than snapping to it** (`railAt`,
`glideTo`). The rail is far coarser than the road it scrubs: 1872 years over
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

Zoom and pan live in `lib/map-view.js` — pure, unit-tested; `MAX_SCALE` is 120 (2026-08-31, doubled from 60, itself
raised from the coastline's honest ceiling of 24). Past 24 this is knowingly
not a claim about the land — the coastline is a visibly coarse polygon at
120 and §6b's objection is real and accepted — because the reason to zoom
that far is prising apart two saints who died in the same town, and
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
larger target — flies the map to centre that saint (`choose`/`flyTo`, cubic
ease-out over 450 ms, an instant arrival under reduced motion), and only when
the flight lands do they become `selected`. Selection does three things: the
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

The canvas publishes `data-labels`, `data-dots` (with each dot's `state`),
`data-selected`, `data-rails`, `data-land` and `data-water` for the suite,
written by the draw pass so doing-nothing reads 0 or empty. A label is kept as long as any part of its rect is on
screen, dropped only once the whole of it has left the box (2026-08-31,
`map-labels.js`) — its far edge crossing the boundary used to hide the whole
name outright; the canvas already clips whatever is drawn past its own
bounds, so there was nothing this needed to do but stop refusing to try.
Two or more saints who round to the same on-screen spot — John the
Long-Suffering and Moses the Hungarian both die at the Kyiv Caves, at an
identical coordinate — are fanned into a small ring by `declutter`
(`lib/map-view.js`, pure, unit-tested) before anything is drawn, so a halo, a
dot and a label each land where the point is actually placed; no zoom level
would ever separate two identical coordinates on its own. It groups by each
point's own source coordinate (`declutter`'s `keyOf` parameter, map.js
passing `where.lon`/`where.lat`) rather than by this frame's on-screen
proximity, its own default — the default is what map.js used until
2026-08-31, when the deeper `MAX_SCALE` finally made a real bug in it
reachable: two points close enough to bucket together at rest can drift past
`radiusPx` apart as the reader zooms in, and the moment they do, the
jittered one snaps to its true position — a discontinuity that, wheel-zoomed
at exactly that jittered pixel, read as the dot pulling away from the
pointer and vanishing a few notches later. A key drawn from source
coordinates never changes underneath the reader, because two saints at the
same place are the same place at every zoom. **This does not make every dot
followable to the full 120×** — a wheel spun without the pointer ever
re-centring can still out-run a dot on a window that has shrunk to a sliver
of a degree, which is a limit of anchor-preserving zoom at a high ceiling
more than of any one bug, and ordinary interactive use (a hand naturally
adjusting the pointer as the target grows) is the case this fixes, not
"scroll blind and expect it to hold."

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
to judge them against — so they always show at full strength.
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
both, and **both are now checked**: `tests/contrast.test.mjs` recomputes every
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

- Unit: `tests/*.test.mjs`, `npm test` (~15s, 263).
- Browser: `e2e/`, one file per surface, 714 across two projects —
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
