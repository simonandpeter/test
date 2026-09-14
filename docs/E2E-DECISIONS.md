# E2E decisions

The reasoning that used to live as prose inside `e2e/*.spec.js`. It was moved
here on 2026-09-12, verbatim: these are dated author decisions and rejected
alternatives, and they are a record of intent rather than something to
paraphrase. Each spec file has a section; the source carries a one-line pointer
to the anchor.

What did *not* move: a why the code cannot express, a landmine that looks safe
to change, a deliberate omission that would otherwise read as a bug, and a
test's own description of what it covers. Those stay inline. Measured numbers
did not move here either — a number belongs in the probe that re-derives it,
and the source now points at the probe.

---

## quality-floor.spec.js

Part of the browser suite, which was one file of 9,308 lines until
2026-08-27 and is now one file per surface. **The tests themselves are
unchanged** — each carries the instruction that caused it and the date it
was written, which is where this suite's provenance has always lived; what
moved is only which file it sits in. `helpers.js` holds the shared fixtures.

### no axe violations in vigil mode

The same sweep in vigil mode, which until 2026-08-28 nothing ran at all —
CLAUDE.md said so plainly ("dark mode is not covered by the axe/contrast
tests") and it cost a real WCAG AA failure four days of standing: dark
`--rubric` at 3.93:1 on the field, on the token carrying the current nav
item and today's date. PLAN.md had it recorded as a live defect the whole
time. What finally said it out loud was Lighthouse, whose headless Chrome
happens to ask for dark — an accident, and not a thing to leave a gate
resting on.

### nothing shifts as the data arrives — CLS_BUDGET

Brief §13: "No layout shift when data arrives — skeletons must match final
dimensions." HANDOFF.md called this criterion green for weeks and **nothing
measured it** — there was no CLS assertion anywhere in `e2e/` until now.

The measurement is the browser's own `layout-shift` entries rather than a
before/after `getBoundingClientRect`: a rect pair catches the shift a test
thought to look for, and the layout-shift buffer catches the one it did not.
`hadRecentInput` drops shifts a reader caused by pressing something, which is
the whole point — growing when asked is not a defect, growing on its own is.

The budget is 0.02, not the 0.1 of Core Web Vitals "good". The brief says
*no* shift; 0.1 is the threshold below which Google stops complaining, and
adopting it here would license eight times the movement the brief allows. The
value is what the site actually scores with room for the runner's rounding,
and it should be argued down rather than up.

The Daily page's hymns are the late arrival this criterion is about:
`fillSaintHymns` waits on the hero saint's detail payload, lands after
`networkidle` has already been declared, and grows the panel by ~500 px.
Whether that *shifts* anything is the question — growth below the fold is
not a shift — so the wait has to outlast it either way.

### a day in the month grid is told apart by shape and by words, not only by hue

Brief §13: "All colour information duplicated in text or shape." PLAN.md
calls this the §7 greyscale test — remove every colour and the reader loses
nothing — and §2 makes it the first of the three conditions that keep the
fast's colour-by-kind honest. It had never been audited, executably or by
hand, until 2026-08-28.

**Rewritten for the month grid on 2026-09-12**, in the same commit that
deleted the week rail rather than after it: the obligation is an
accessibility floor, and there must be no commit in which nothing is holding
it. What it used to watch was `.week-strip .day-marks` — up to three 5 px
discs under a date, one `border-radius: 50%` in three hues, differing in
`background` and in nothing else. The rail is gone; `views/daily/sidebar.js`
draws the month instead, and a day's marks are carried by the numeral itself
rather than by dots beside it.

So the floor is tested on both of the grid's channels, because the grid uses
a different one for each mark:

- **every mark has a shape** — the feast a rule under the numeral, the strict
  fast a solid rule above it, the fish day a dashed one — and the assertion is
  deliberately about shape and *not* hue: it compares the non-colour computed
  styles, with every colour in them masked out. Asserting the colours differ
  would pass on the defect.
- **every mark has its words**, in the cell's own accessible name, which is
  the cell a reader lands on rather than an `aria-hidden` dot beside it.

**The fast and the fish day were once the gap this comment described.** Until
2026-09-12 they were the same numeral in two hues — `--fast-strict` and
`--fast-fish` on `.cal-day`, and nothing else — so a sighted reader who could
not separate the two hues had only the accessible name to tell them apart,
which is exactly the reader the 2026-08-28 audit was written for. The gap is
closed in `daily-sidebar.css`: every cell carries a transparent `border-top`
so none shifts when a mark appears, the strict fast takes it solid and the
fish day dashed. Hence `borderTopStyle` in the probe and not only
`borderTopWidth`: solid and dashed are the same width, and a pair told apart
by width alone would be a thinner line rather than a different one — green
here and silent to the reader. Two weights would pass; they must not.

The probe's own premise: the rail's first version read the live dots and
asserted its own premise, which is how it reported that 30 January's
week stands only a strict fast: one kind, and a comparison of one thing
against itself is green for the wrong reason.

### no axe violations on the first visit, with the two marks standing

The panel fades in over 160 ms since 2026-08-26
evening and axe reads an opacity as a new colour — 303 contrast
violations at 2.71:1 on the frame this used to sample, every one of them
a colour that is at full strength a sixth of a second later.

That is *not* the mistake PLAN.md keeps catching. The peek fade
(2.1:1) and the cycle line's opacity (4.17:1) were permanent washes over
text a reader had to read; this is a transient that lands at full
strength and stays there. What the gate is for is the resting state, and
the resting state is what this now measures.

---

## helpers.js

These lived at the top of `quality-floor.spec.js` — and, as it grew, wherever
in it they were first needed — until the suite was refiled by surface on
2026-08-27. Nothing here is new; each one is the block that was there, with
the comment that explained it.

### CORPUS, VENERATED — the corpus's own size

**The corpus's own size, read from the build rather than typed** (2026-08-31).

`index.spec.js` pinned `851` in twenty-six places, and the counts per church
beside them. Every one of those went red the moment a saint was added —
which is the one thing this project is *for*, so the numbers were a tax on
doing the work rather than a check on it. Adding eleven saints turned 24
tests red without a single one of them having found a defect.

Reading `manifest.meta.json` keeps what the assertions were actually worth.
They were never claims about the number 851: they were claims that the Index
shows *the whole corpus* at rest, that a church facet narrows it to *that
church's own count*, and that the ratio's two halves agree. All three survive
a growing corpus; the literal did not.

It is the build's own meta file, so it is the same number the page renders
from — if the build and the page disagreed, `npm run build:manifest` would
have failed first, and a test that read the corpus a second, independent way
would be pinning the reader against a count nobody serves.

### TRACKED, NO_RU_NAME

The slugs whose card carries a `track` (2026-09-07). A press on one of these
flies the map out to frame the whole rail, so a test that needs a press to
*keep* the reader's zoom has to pick a saint who is not here — and the list
was one name, then two, then ten inside a week, which is exactly the shape
`CORPUS` exists to keep out of a literal.

**Read from the manifest, not named** (2026-09-07). Anthony the Great was
the pinned example until then gave him «Антоний Великий» out of
his own citation, and a test that breaks every time a name is filled in is
taxing exactly the work it should be encouraging — `CORPUS`'s own rule, in
a second place. A company is skipped because its heading is a list rather
than a name.

### searchMode

**All Saints opens on the carousel now** (author, 2026-08-27), and almost
every test in this file that visits it was written about the *other* mode —
the filters, the grid, the cards, the counts. Those tests are not wrong and
the behaviour they pin has not changed; what changed is which face the page
shows first.

So the suite states which face it is testing rather than each of forty-odd
tests growing a line to press the toggle. The key is only written when the
test has not set one itself, exactly as `ready` does for church and language
— so `carouselMode()` below, and any test that stamps `indexMode` directly,
still gets the mode it asked for.

The page's *own* default — a reader who has never chosen — is a real claim
and has a test of its own: "All Saints opens on the carousel".

### aDayThatIsNotToday

**The Daily button's word depends on the date the runner thinks it is**, and
that had been invisible: until 2026-08-27 the four packs used one word for
both *Daily* and *Today*, so an assertion about either passed whichever
state the button was in. Giving Russian its own base word turned a
hardcoded `/calendar/2026-08-26` into a test that failed on exactly one day
of the year — and CI ran on that day, hours after the change.

So any test that asserts the *Today* word navigates through this rather than
through a literal. Three days back is well outside a timezone's worth of
slop, and the calendar renders any date, so the day's own contents do not
matter to the assertions that use it.

### phone — the width the day picker exists at

The width the day picker exists at (2026-09-02).

The rail, its drag and its coast, the month toggle and the fade between the
two grains are **phone controls now**: the author's instruction of that day
— "on desktop daily page (ONLY ON DESKTOP) ... just display monthly only on
desktop, no weekly display" — leaves a desktop with a static month grid and
no toggle at all.

So a test *about the picker* has to say which width it means, and this is
that sentence. It is not a workaround for a hidden element: the surface
these tests describe is a phone's, and running them at 1280 was describing
a page that no longer exists. Both projects run them here, which is one more
pass over the picker than the mobile-360 project alone would give.

### ready

A reader who has answered the first-visit question — which is every visit
after the first (author, 2026-08-22: one church of three, and the calendar
follows it, so a calendar test has to say which). Written before the page
loads, because the calendar decides whether to ask while it is rendering,
and seeded only where nothing is stored: this runs on every load including a
reload, and a test that reloads to check something was remembered would
otherwise be overwriting it on the way back in. Russian by default — the Old
Calendar, so POPULATED (30 January) is Anthony's day.

A reader who has been here before. Since 2026-08-25 evening that means two
answers, not one: the first-visit gate asks which calendar *and* which of
the five languages, so a `ready` page that stamped only the church would
still meet a question — and every test that measures where something sits
would measure it under one.

**`reckoning` defaults to `'gregorian'`, explicitly, since 2026-09-05** —
not merely left unset. "Follow my church" started actually following the
church that day (`reckoningInForce`, `lib/church.js`), and this suite's
own default church is Russian, whose default reckoning is Julian: every
test that reads a heading or a grid numeral without asking about
reckoning at all was written against the civil date, and unset reckoning
would have shifted every one of them thirteen days for a reason unrelated
to what they test. A test that wants the true "nothing chosen" state —
`lib/church.js`'s own `null` — asks for it explicitly:
`ready(page, { reckoning: null })`.

### chooseSort, chooseView

Sort and View became `.facet` chips holding radio groups on 2026-08-26
evening, where they had been a `<select>` and a pair of `aria-pressed`
buttons (author: "have it like the other drop down filters but it displays
the selected setting"). These two are what every test that used to call
`selectOption('[data-sort]')` or click `[data-layout="rows"]` calls now —
one place, so the next change to that control is one edit and not thirty.

### onlyCalendar

**Narrowing is unticking since 2026-08-28** (author: "display all saints by
default, i.e. have all the calendars ... ticked by default, so that people
get exposed to the full range"). Every test that used to tick one calendar to
make a filtered state was ticking a box that is already ticked, and got the
whole corpus back. Clearing them all first is the same end state by the route
a reader now takes.

### throwRail

The rail reads its release velocity from the samples of the last 120 ms
(`up` in views/daily/picker.js) and coasts only past `MIN_FLICK`. Driven
through the harness's mouse, each move is a separate round trip, and under
parallel load the moves stretch past that window — the fresh samples collapse
to one, `dt` is 0, the velocity is 0, and the rail settles instead of
coasting. Nothing is wrong with the rail when that happens: the gesture never
became a flick. That was this suite's oldest flake, and it was still 1 in 32
after the assertions around it stopped being fixed samples.

The moves are spaced by a spin on `performance.now()` rather than by
`setTimeout`, because a spin blocks: the spacing is real elapsed time
whatever else the machine is doing. Four moves, 8 ms apart, 25 px each — a
24 ms window well inside the rail's 120, and the same velocity on every
machine. The product path is untouched: pointerdown, four pointermoves,
pointerup, and the rail's own sampling decides what to make of them.

**It matters as much to the test that asserts a flick does *not* coast.**
A gesture that fails to be a flick passes that one trivially, which is a
test whose sample cannot reach the case it is pinning.

**A spin bounds the gap from below, not from above**, and that is the
suite's oldest flake (2026-08-28). `spin(8)` says "at least 8 ms"; on a
preempted machine one of these gaps can be tens of milliseconds, and
the rail prunes its samples at 80 ms per move and 120 ms at the
release. Stretch the gesture past those and the fresh samples collapse,
the velocity is computed over nothing, and the rail settles instead of
coasting — so the test reports a rail that did not coast when what
happened is that nobody ever threw it.

Reproduced at last on 2026-08-28 with CDP CPU throttling rather than
with parallel load: at 150x the *first* gesture spans 140 ms and does
not coast, while every one after it spans 26 ms and does. That is the
shape of it on CI too, where this test runs once, cold, per job — 2 of
the last 9 runs touched it and one went red through the retry.

So the gesture is *measured and re-thrown* until it is genuinely a
flick. The product path is untouched — pointerdown, four pointermoves,
pointerup, and the rail's own sampling decides — and a fresh
`pointerdown` cancels any coast a slow attempt may have started. What
changes is that the helper now knows whether it delivered what it
promised, and says so, so a caller can assert its own premise instead
of inferring it from the rail's behaviour.

### tokenColours

**Not `getPropertyValue`**, which is trap 9 in both directions. An ordinary
custom property hands back the literal it was typed as — `#a98237`, or a
whole `clamp()` — while the fifteen the theme cross-fade animates are
registered `<color>` in `tokens.css` and hand back the *computed* colour
instead. Four tests read a hex out of `--gold`, `--rule` or `--feast` and
parsed it by hand; registration on 2026-09-10 turned that into
`parseInt('gb(169, 130, 55)', 16)`, which is NaN, and one of them then
matched `rgb(0, 0, 0)` — every SVG's inherited default fill — and reported
the header, the nav and the masthead as spending gold.

A probe asks the question the reader's eye asks and does not care which of
the two kinds a token is, so it keeps working through the next such change.

---

## fixtures.js

Three tests went green here and red on CI on 2026-08-27 for one reason, and
it was not the code — the runner draws different text. Two things differ from
a Windows desk, and both make text wider or narrower rather than wrong:

1. **The webfont never applies.** `font-display: optional` gives Literata a
   few frames and then keeps the fallback *for the life of the page*. A cold
   runner misses that window almost every time, so the serif is whatever
   fontconfig picked, and the 72ch column is 580 px rather than 678.
2. **`system-ui` is DejaVu Sans**, not Segoe UI, and DejaVu is wider — wide
   enough to take the ~9.5 px of slack the facet row has and wrap it.

`COLD_FACE=1` reproduces both, and harder than the runner does: the webfont
is refused, `--font-utility` is forced to Verdana — wider than DejaVu — and
`--font-serif` to Times New Roman, which is *narrower* than Literata, as the
runner's fallback serif turned out to be. Both directions are needed and the
first version had only one: forcing the utility face alone reproduced the
facet row's red and neither of the other two, because a name wrapping and a
page's height are the serif's business. With both forced, all three CI
failures come back on this desk with the runner's own numbers — a scroll
clamped at 1399 rather than 1500, chips on two lines rather than one, and
Macarius the New in two lines rather than three.

A layout that holds under this holds on the runner. It is a rehearsal, not a
gate — 60 seconds against one spec before pushing beats finding it in a
six-minute CI run:

    COLD_FACE=1 npm run test:e2e:desktop -- e2e/index-grid.spec.js

A test that pins its own face (`the index foot holds one line in a wide
utility face`, `a facet chip prints its own word`) overrides this afterwards
and still asserts its own budget, which is the point of pinning it.

### coldFace — why it is exported

**Exported because the fixture below cannot reach every page in the suite.**
A test that opens its own `browser.newContext()` — **42 of them do**, for a
second viewport or for `reducedMotion` — gets a page the fixture never saw,
so under `COLD_FACE=1` half of such a test runs forced and half runs in
whatever face this desk resolved. That is worse than not rehearsing at all:
the run reports itself as a rehearsal and the block that most needs one is
exempt, silently, which is the failure mode the header above warns about. A
page opened by hand that measures text calls this, and then asserts it took
(`COLD` is what makes that assertion sayable).

One implementation, not two: a copy of these three declarations inside a spec
would drift from the fixture the first time either changed.

**Only the one context that needed it is routed through here so far, and the
obvious way to close the other 41 does not work.** Wrapping
`browser.newContext` from inside this `page` fixture was tried and measured:
it reaches nothing, because **36 of the suite's tests take `{ browser }` and
never ask for `page` at all**, so the patch never runs for exactly the tests
that open the most contexts. It came back green over both projects and had
closed almost none of them — the same shape of silent exemption, one level
up. Closing it properly wants a worker-scoped `browser` override and a pin
inside a `{ browser }` test to prove it bit.

---

## download-limiter.spec.js

**Why the file exists.** Split out of `daily-panel.spec.js` on 2026-09-12
(author: name a file for what it does). These two tests are not about the Daily
page - it is only the route they happen to open, because it is the heaviest
one. What they hold is a budget on the first load, and both were written after
a review found the site paying it.

2026-08-27: the first download was 470 kB of JavaScript. 293 kB of it was
`data/liturgical-days.js`, six months of hand-transcribed pericopes, and
106 kB was all four locale packs - so a reader opening the Map downloaded
both to look at neither. Addendum G1, the same week: `manifest.meta.json`
was fetched beside the manifest on the path that blocks first paint, and no
reader for it existed anywhere in `src/`.

**Both assert the shape, not a byte count**, which would go stale the first
time a saint was added. And both are network assertions rather than unit
tests on purpose: what is claimed is *which requests the boot makes*, and
`lib/manifest.js` builds its URLs from `import.meta.env.BASE_URL`, which
does not exist under `node --test`. A unit test would have had to fake the
thing under test.

### the day records and the locale packs are fetched, not carried in the entry chunk

The review's second finding, 2026-08-27: the first download was 470 kB of
JavaScript, of which 293 kB was `data/liturgical-days.js` — six months of
hand-transcribed pericopes — and 106 kB was all four locale packs. A
reader opening the Map downloaded both to look at neither.

Both are their own chunks now. The day records are started at boot and
awaited *beside* the manifest, which is the longer wait at 490 kB, so they
arrive inside a wait the reader was making anyway and nothing on the page
moves — the fast tag's grade is read out of a day's own note, so a column
painted before they landed would have shown an ungraded tag and then
changed it. The packs are fetched one language at a time.

This asserts the shape rather than a byte count, which would go stale the
first time a saint was added.

**Re-verified on 2026-09-12**, when `views/daily/picker.js` (1,060 lines)
and `views/daily/panel.js` (793) were deleted and `daily/{sidebar,tiles,
open,lives}.js` took their place: the entry chunk is rebuilt by that
change, and a split that survives only by accident is a split that will
not survive the next one.

### the boot path fetches the manifest and not the coverage statistics

Addendum G1, done 2026-08-28. `loadManifest` fetched `manifest.meta.json`
beside the manifest in one `Promise.all` and hung it on `data.meta`, and a
sweep of `src/` found **no reader** — the only other `.meta` in the
codebase is `image.meta` in lib/detail.js, a different field.

The file is 1,247 bytes, so the cost was never the payload: it was a second
round trip on the path that blocks first paint, taken on every visit for a
page that does not exist yet. About's statistics are Session 9's and call
`loadManifestMeta()` when they arrive.

Asserted at the network rather than in a unit test on purpose. What is
claimed is *which requests the boot makes*, and `lib/manifest.js` builds its
URLs from `import.meta.env.BASE_URL`, which does not exist under
`node --test`. A unit test would have had to fake the thing under test.

**Re-verified on 2026-09-12** for the same reason as the test above: the
Daily page's whole module tree was replaced, and `views/daily/lives.js`
now fetches one payload per saint of the day rather than one hero's — so
what the boot asks for before any of that is worth asking again.

---

## pwa.spec.js

The worker registers on every production page load, which is what `vite
preview` serves — so every test in the suite already runs *with* the worker,
and the console-error and quality-floor sweeps have been passing over it.
What this file adds are the claims the rest of the suite cannot make: that
the caches fill, and that the site still answers when the network is gone.

Offline is Playwright's own (`context.setOffline`), which severs the network
*under* the service worker — exactly a phone in a tunnel. Each offline test
loads once online first, because the offline promise is about what a visit
leaves behind, and asserts its premise (a controlling worker) before
cutting the cord: an offline test with no worker would fail for the boring
reason and report the interesting one.

### a saint never read says so offline, honestly

The page must say what is actually true: nothing stored, network needed once —
and not offer a retry-shaped apology about hiccups.

---

## chrome.spec.js

### the file itself

The chrome: the header, its two choosers, the coachmarks, the shelf and the theme.

Part of the browser suite, which was one file of 9,308 lines until
2026-08-27 and is now one file per surface. **The tests themselves are
unchanged** — each carries the instruction that caused it and the date it
was written, which is where this suite's provenance has always lived; what
moved is only which file it sits in. `helpers.js` holds the shared fixtures.

**Where the shelf is read, since the Daily rebuild of 2026-09-12.**

Every test below used to open a Daily page to find the reader's own shelves
under it. Daily does not carry them any more (plan §11.5, "shelves come off
Daily"): the page is a standing column of the day's facts and a grid of its
saints, and a third list of saints under that is the thing the rebuild took
out. `mountShelves` has exactly one caller now — `views/saint.js`, below
1024 px, where a phone reaching the end of a life would otherwise meet a
page that stops.

So these tests state the surface rather than assume it: a narrow window and
a saint's page. Nothing they claim is about the Daily page — the shelf's
rows, its ×, its swipe and its store are the subject, and all four are
unchanged. The width is the one thing that had to be said out loud, because
a desk keeps its search column and is deliberately given no shelf.

`except` drops the page's own slug from the shelf, so the saint this stands
on is never one of the saints the test has just read.

### Continue reading reappears after a saint has been opened

The shelf wears the Index's own row dress (author, 2026-08-24): the same
card classes, so the two read as one register. **The mark that stood at
its trailing edge went on 2026-08-28** ("Remove bookmark on continue
reading row cards"), which is the last row on the site to lose one — the
Index's rows lost theirs the day before and this one was still copying a
dress that had moved on. The × below is now the only control on the row.

**The × is placed against the row itself now** (2026-08-28). It used to be
measured from the bookmark it stood beside — "after the mark, and the mark
centred on the row" — and the author took that mark off these rows. Every
claim the × makes on its own account survives: an ×, visible where there
is a cursor to aim it, centred on the row, at the trailing edge, carrying
the whole sentence as its name.

### a Continue reading row is swiped away, and a short push springs back

Author, 2026-08-24: the × goes and "if you swipe across on them they get
removed". Pointer events, so the mouse does it too — the same reversal
the week rail made when it took the desktop drag.

The spring-back half is the one worth pinning hardest: a row that
vanished on any push at all would make the shelf unscrollable by touch,
and a row that never moved would read as a dead press. So: a short push
leaves the row exactly where it was and still on the shelf, and a long
one takes it off.

**The two halves parted on 2026-08-26** (author: "Make the swipe on the
Continue Reading row cards easier, it snaps back too easily making it too
hard to remove"). Until then "short" was the whole test of intent, and 70 px
pushed at any speed sprang back.

A short push is now two different gestures and the shelf reads them
differently: a short *slow* one is a reader nudging a row and it springs
back; a short *fast* one is a flick and the row goes. That second reading is
the fix — a real swipe across a row is over in about a tenth of a second and
covers a third of the width, which the old distance-only test called a miss.

So this pushes slowly, with the moves spaced in time, and the flick has a
test of its own below.

### on a touch device the shelf row carries no ×, and the swipe still clears it

The other half of 2026-08-25's instruction: the × came back "on desktop
only". A phone keeps the swipe alone, because a control sized for a
fingertip beside a bookmark on a 48 px row is how a reader clears a shelf
they meant to scroll past.

This needs a real touch device — both of the suite's own projects are
Desktop Chrome, one of them merely narrow, and both report a fine
hovering pointer — so the media query that hides the × never fires there.

### the header carries no date, and the controls keep their places at both widths

Today's date stood under the theme control from 2026-08-21 to 2026-08-22
and is withdrawn. Wide, the row is unchanged: the calendar control — which
names the church the site reads — then the language control and the icon
toggle, all on one line, the bar no taller than it was with the date
(61 px). Narrow, the author rearranged it twice: on 2026-08-24 the name
spanned the top with the calendar control down on the nav's line, and on
2026-08-25 that became **one line of chrome** — calendar control, name,
language and theme — with the four pages centred on a row beneath it,
"in one line across all screen sizes". So the "one line" assertion is
the wide branch's alone, and the narrow branch pins the arrangement that
replaced both: the three controls level with the name and in order across
it, the nav centred underneath, down to a 320 px phone.

**The wide branch is measured in a wide utility face**, the
lesson applied to the header: `--font-utility` is the reader's own system
stack, so the same row is a different width on every machine — Segoe UI on
Windows, DejaVu Sans on a bare Linux runner. This row had 6 px of slack in
Segoe and was 20 px over in DejaVu, so it held one line on the desk that
built it and wrapped to 76 px in CI, unseen, from the start (which put
the language control in the corner) until CI said so then. The
face is forced here, and the native one is printed to the run's log, so
the assertion is one width on every machine and the runner still says in
numbers what its own face costs.

### the chrome line holds down to a 320 px phone, in every language

Author, 2026-08-25: the calendar control, the name and the two toggles
"remain in one line across all screen sizes". 320 px is the narrowest
phone the site meets, and the name is the elastic part — it gives up size
and then tail rather than pushing a control off the line, because a
calendar control that says nothing is worse than a smaller masthead.

The first cut of this layout failed here in a way worth keeping a note
of: the name's track was a bare `1fr`, whose automatic minimum is
min-content, so a long name widened the track instead of ellipsising and
printed straight across the controls — at 320 px in English and at 360 in
Russian. `minmax(0, 1fr)` is the fix, and the same trap caught the
month's own span then.

### an answered panel shrinks into the control that changes it

Author, 2026-08-25 evening: "have an animation showing the pop-up shrink
and fade into the button it comes from so people remember where to click
to make changes."

It is a teaching gesture, not decoration: the site hides both answers
behind two small controls in the header, and a reader who answers and
never sees where the answer went has to hunt for it next time. So the
assertion is about *direction* — the panel is travelling towards the
control, and has not simply faded where it stood.

### a first visit is shown where the two controls are, and the day is not held back

**This reverses the first-visit gate**, at the author's instruction of
2026-08-26: "Replace the language and calendar pop-ups on first opening
with a fade-in glowing tool tip with an arrow pointing to each of the two
buttons, explaining you can select your church from here, and language from
here."

What the gate was for is worth restating, because it was not decoration.
From 2026-08-21 the calendar asked which church the reader kept and showed
*nothing* until it was answered — no strip, no date, no day — on the
argument that a calendar with no church chosen is the site picking one and
not saying so. A second block joined it on 2026-08-25 evening for the
language, and that one was an offer rather than a gate, because English is
a default the reader is already reading.

The argument is answered rather than dropped, and this is where that is
pinned. The guess is `defaultChurch()` — the reader's own browser language,
never written to settings — the header has named the church on every page
since 2026-08-24, and a mark under that control says which control changes
it. `hasChosen()` is untouched: the marks come back next visit, and the
three pages that can do without a calendar still do (`chosenChurch`).

### a coachmark goes on the second scroll, and not on the first

Author, 2026-08-26: "It also disappears after the second scroll input, down
or up." Two, not one, and the reason is that the first scroll is a reader
looking at the page they arrived on — dismissing on it would mean most
readers never read the mark at all.

What counts as *one* input is the part worth pinning: a wheel notch fires
scroll events every frame for a few hundred milliseconds, so counting raw
events would spend both on one gesture. ui/coachmark.js separates them by a
pause, which is what the waits below are.

### on a first visit the two marks clear the fold, and so does the day

The exception this test was written for is gone with the gate (2026-08-26).
From 2026-08-21 to 2026-08-26 a first visit saw the question and nothing
else, and what had to clear the fold was the question and every one of its
answers — which is why the rule above about the saint's name clearing the
fold had to make an exception for the first visit.

There is no exception now, and that is the stronger claim: a first visit
gets the day *and* is told where the two controls are. Both marks stand
clear of the fold on a 360x780 phone, and so does the day under them,
which no first visit could see at all before.

**What "the day" is has changed, and the assertion with it** (plan §5,
§7). It was the hero's name, the first thing under the marks on the old
page. A phone now reads the standing column first — the date, the
reckoning, the cycle and the fast — and the saints under it, and the
leading saint's card opens with its picture. So the name itself is past
the fold by design, and what has to clear it is the day's own date and the
first saint's tile: the reader is looking at the day and at a saint, which
is what this has always been about.

The marks must also not overlap each other. They sit under controls at
opposite ends of the header, and a 30ch box under each overlapped in the
middle of a 390 px screen — the one drawn second covering the ×  of the one
drawn first. Found by rendering it and looking; kept honest here.

### a first visit opens on a calendar it did not choose, and is told which

Addendum H7–H8 said the strip, the date and the day stay hidden until the
reader has said which calendar they keep (author, 2026-08-22). **Superseded
2026-08-26**, with the coachmarks: the day opens on a guessed calendar and
the guess is named in the header, which is the whole of what makes it
honest. The test is kept and turned around, because the property it guards
is the same one — the reader must never be shown a calendar without being
told which it is.

The guess is the browser's own language and nothing else about the reader.
This context is en-US, which none of the four churches claims, so it falls
through to Russian — the calendar with the most to show: 426 of the 742
folders and day records running to January where the Greek and Serbian stop
in September.

### the site is named in the reader\u2019s own language, and the habit page is Daily

Author, 2026-08-23. The name in the head and the page's nav label. The
head and the corner carried two deliberately different names until
2026-09-12, when the author ended the split: both are AGIOS now, in every
language. The veil carried the head's name until 2026-08-24 and now
carries the corner's; that has a test of its own below. The route stays
/calendar so no link breaks.

### the veil names the site the way the header does

Author, 2026-08-24. The loading veil read one name and the corner another;
the first thing a reader sees painted and the name in the corner it fades
into are the same
words, and the split survives only where a reader meets it in a tab or a
bookmark.

The veil is removed 300 ms after the manifest lands, so it is read out of
the served HTML rather than raced for in a live page.

**And neither printed name follows the language any more** (author,
2026-08-28: "make sure this new website title is applied to all languages,
it no longer gets translated, it stays constant as a stamp of branding").

This supersedes 2026-08-25's "change the title on header and loading screen
to the picked language" rather than reversing it: what that instruction was
fixing was a name hard-coded in index.html and stale by a rename, and the
name still comes from exactly one place — the outlined mark that
`scripts/make_wordmark.py` draws. What has changed is that the place is
not the pack. PLAN.md §3 "The name" lists every surface it reaches.

The markup's own English is now simply right rather than a placeholder the
pack paints over, which is why the assertion above can read it out of the
served HTML at all.

### the site mark is the Orthodox cross, in gold by instruction

Author, 2026-08-24. The favicon was one gold cell — the attested mark of
the veneration badge, which was removed whole then, so it had
been standing for a thing that no longer exists. It is now the
eight-pointed cross: upright, titulus, crossbar, and the slanted
footrest, whose slant is the whole of what makes it Orthodox rather than
Latin.

It was drawn in ink for exactly one day. PLAN.md reserves gold for a
finding about veneration and nothing else, and a site mark is not one —
which is why the gold was taken out. *The author put it back on
2026-08-25* ("make the site icon gold colour orthodox cross"), and §2
records the exception in place: gold is spent here and nowhere else on
the site. So this pins the two gold tokens exactly — a mark drifting to
some other yellow would be the failure now — and the "spent nowhere else"
half is still guarded by its own test over the rendered pages.

### the calendar chooser asks its question and offers the four, with nothing between

Author, 2026-08-24: the paragraph under the heading is removed outright.
It named the four churches and their two calendars in prose directly
above four buttons each printing exactly that, so it said the choices
twice and put four lines between the question and the answer.

**One host since 2026-08-26**, where there were two. The component drew the
calendar page's first-visit gate as well as the header's panel; the gate is
gone with the coachmarks that replaced it, so the header's panel is the
whole of where this question is now asked — which is also where the marks
point.

### the header names the church with a mark, not with the word calendar

Author, 2026-08-24: the control read "{church} calendar" and now wears a
calendar mark and the church's name alone, to give the header its width
back. The mark is the same drawing as the month toggle on the calendar
page, one size down.

The accessible name is the part that must not thin out with the visible
text: an icon says nothing to a screen reader, and the aria-label used to
swallow the church's name while the visible text carried it. It now says
which church as well as what a press does.

### About states the privacy policy, and states it as the code behaves

Author, 2026-08-24. Written against lib/settings.js and lib/store.js
rather than as boilerplate: the four things kept are the reading
position, the saved and recently-opened saints, the church and the theme,
and how the Index was left. A privacy policy that has drifted from the
code is worse than none, because a reader has no way to tell.

### the language control offers five, each naming itself in its own tongue

Author, 2026-08-24. A globe mark and the current code between the
calendar control and the theme toggle; the panel offers each language in
its own name — «Русский», not "Russian" — because the reader who needs
the control is precisely the one who may not read the language the site
is currently in. Each choice carries its own lang attribute so a screen
reader pronounces it in that language.

### choosing Russian redraws the page in Russian, dates included, and it holds across a reload

Capitalised, and the month's own abbreviation dot dropped (author,
2026-08-25). Said plainly because it is a departure: lower case is
correct Russian orthography for a weekday and a month, and «авг.» wants
its dot; the author asked for capitals and no dot, and only the weekday
and month parts are touched — the literal «2026 г.» keeps the dot that
belongs to a different word.
The month in full since 2026-09-01, in every pack: `headingFmt` asks Intl
for `month: 'long'` where it asked for `short`.
The month is abbreviated at this width since 2026-09-02 - and it is the
*pack's* own abbreviation, which is the half of that change worth pinning
here: «Авг» rather than a English "Aug" leaking into a Russian heading.

**13, not 26** (2026-09-05, following the "Follow my church" fix):
unset reckoning now truly follows the Russian church's own default,
Julian, and the numerals are the reckoned ones — 26 August civil is 13
August Julian. The weekday alone stays civil («Среда» is still right for
the 26th), which is CLAUDE.md's own rule for `reckonedHeading`.
**Two lines rather than one, since the rebuild of 2026-09-12.** The day's
heading was one `h1` reading "Среда, 13 Авг 2026 г."; the standing column
prints the weekday as its own small label over the date (plan §5), and
the date is set in full where the old heading abbreviated the month to fit
a strip. Both halves are asserted, because the claim has always been that
the whole heading redraws in Russian and the weekday is the half that is
still read off the civil day.

### About offers a way to write, and it goes to the repository

Author, 2026-08-25: a contact option, "or even better if they can be
stored in the github repo by some built-in affordance so my name doesn't
get too involved". Issues are that affordance: no address is printed, no
form is posted anywhere, and a static site needs no server to receive
one. The trade - that an issue is public - is told to the reader before
they open one rather than after.

### the four pages hold one line in every pack, at every width

Author, 2026-08-25 evening: switching to Russian "the buttons for Daily,
All Saints, Map and About pages go into two rows because the content
column on the screen is too narrow. Make sure this never displays like
that."

The header's wide grid used to hand the nav the *leftovers* of a `1fr`
track, and in Russian, Greek and Serbian what was left was narrower than
the four labels. Which of the two gives way is the whole decision, and
the nav wins: the four pages are how the site is used, the masthead is a
constant learnt once. So the nav has its own `auto` track and the name
pays in lines — «Ορθοδοξία / Καθημερινά», every word intact.

The arithmetic is why there is no third option: at the 72ch column the
one-line row needs 678 px in Russian, 695 in Greek and 672 in Serbian
where 580 exist. Those three cannot hold one line at any gap.

### the chrome prints no em dashes, in any language

Author, 2026-08-25 evening: "replace all emm dashes with normal dashes."
Swept across every string the site prints — ui/strings.js, the four
packs, the phrases lib/liturgy.js composes, the document title — by a
scanner that knows a string literal from a comment, so the house's own
prose keeps its em dashes and the reader gets none.

What is deliberately *not* swept is the corpus. Those em dashes are
inside quoted source text and citation lines transcribed from four
synaxaria — 3,638 of them — and editing a quotation for typography is the
one thing the corpus's no-invention rule forbids. So this reads the chrome, element by
element, rather than the whole page: the exception is real and is named
here rather than left to be discovered.

### the panel flies home in half the time, and the page closes behind it

Author, 2026-08-26: "make the animation of the calendar and language tabs
shrinking back to their buttons twice as fast, and make the rest of the
page go back up smoothly not just clicking into place higher on the page."

The second half is the interesting one. These panels sit in the flow, so
hiding one at the end of its flight dropped everything below it by the
panel's whole height in a single frame — the flight was smooth and its
consequence was not. The space closes over the same duration now, and the
flier is pinned out of flow first so the closing box cannot clip it.

### a flick clears a Continue reading row that a slow push of the same length does not

The other half of 2026-08-26's "Make the swipe on the Continue Reading row
cards easier, it snaps back too easily making it too hard to remove", and
the half that actually fixes it.

Distance alone was the test of intent, and a real swipe fails it: the
natural gesture is a quick push across a third of the row, over in about a
tenth of a second. So the release is measured as well — the last 80 ms of
travel, the same window the week rail reads its throw from — and a flick
dismisses whatever the distance.

Same distance in both halves, so the only variable is the speed.

### a chooser panel arrives the way it leaves, and the page comes with it

Author, 2026-08-26 evening: "when you click on the language or church
selector, please add the same animations to the popups (and the other
items on the page that move out of the way to accommodate the popups) as
the animations when you close them. the exact reverse."

Closing had had a flight and a collapse since 2026-08-25; opening had
neither, so the panel appeared from nowhere and everything under the
header jumped down by its whole height in one frame. The two directions
share `journey()` in ui/fly.js now, so they cannot drift apart the first
time either is tuned.

Sampled frame by frame rather than asserted at one instant: what is under
test is that the panel *travels*, and a single reading cannot tell a
journey from a jump.

### pressing a chooser twice inside its flight does not send it the wrong way

The defect the two directions introduced between them, and the reason
ui/fly.js returns its `finish`. `flyInto` decides where to fly *from* by
reading the box's rect; a panel halfway through arriving is at neither
end of its journey, so a close that began mid-arrival set off in the
wrong direction and by the wrong distance. the rule — land what
is still moving before the next move starts — met for the fifth time.

The header's control sits at the top right on a desktop, so a panel
flying home travels *up*. That is the assertion, made after a press that
lands 40 ms into the opening flight.

### the Daily button offers Today when the reader has left it, and only there

Author, 2026-08-26 evening: "when today's date is scrolled away from on
the Daily page, the text 'Daily' on the Daily button fades and is
replaced by 'Today', so when you press it, it takes you to today's date.
But it only says 'Today' while on the Daily page."

The word only ever offers what the page it is on can give: on the Index
the button is how you reach the Daily page at all, so it says Daily
whatever day that page was last showing.

### the header is sticky, shorter, and the phone gets an endless centred nav

Three of the evening's instructions, which are one bar: "Make the site
header a sticky header", "make the header slightly shorter in height by
cropping more from the top margin", and — on a phone, 2026-09-07, once
Texts joined the other four — "make the header a horizontal scroll header
where the selected one is in the centre, and you can swipe across to the
next or click on it. Infinite scroll header." (Desktop keeps the plain
row the 2026-08-26 instruction first pinned; only the phone's own shape
changed, which is why that part of this test changed with it.)
900 rather than 1280 since 2026-09-01: past 1024 the chrome is deliberately
twice the size ("make header items 2x bigger and span across the whole
width of the window"), so the 2026-08-26 instruction this pins — a bar
made *shorter* by cropping its top margin — is about the sizes below that
breakpoint. The taller bar has its own pin: `the header reserves the
height it settles at`, which measures all three widths.

### an aggressive swipe carries the nav strip, and the ring turns under it

**The 2026-09-12 defect, and the only test that can see it.**

`ui/nav-scroll.js` turned the ring on every scroll event and wrote
`scrollLeft` to hold the picture still while it did. Measured, that write
does not "cut iOS momentum short": it ends the gesture. A 320 px fling
moved the strip 45 px of its 450 px range, jumped backwards nine times and
settled on the page it started from — three runs of three, identically.
`scratchpad/fling-write.mjs` isolates the mechanism on a bare scroller
with none of this site in it: no write, 350 px of travel; one write, 350
dragged back to 315; a write per scroll event, 45.

Two things had to change and this test fails if either is put back — the
turn is once a gesture, and the settle is 150 ms of stillness rather than
`scrollend`, which a mandatory-snap scroller fires every time it snaps.
Both were backed out one at a time and both failed it at 40 px.

**A real touch fling, through CDP** (trap 11, and `map.spec.js` takes the
same route for the same reason): a dispatched `PointerEvent` is not an
active pointer and produces no momentum at all, so it would report this
row as perfectly well behaved whichever way the code was written.

The assertions are on travel and on arrival, which are independent (trap
14): the row has to *go* — past a threshold no snap-back can reach — and
it has to *arrive* somewhere else, with the ring turned so the page it
arrived at still has neighbours either side.

### the phone strip is balanced at rest, and a press glides into the centre

Three findings on the 2026-09-07 strip, all one message (author,
2026-09-08): "first it needs to be an infinite horizontal scroll, next to
Daily page on the left needs to be the About section, and when you select
one it should be animated to click into the centre gently instead of just
jumping with no smoothness."

The first two are one repair. The row only rotated once a swipe had
*already* settled with an edge page centred, so at rest the current page
stood at one end of the five with blank strip beside it — on the Daily
page, nothing at all to its left. Balancing every settle so the centred
page sits in the middle of the five is what makes the ring's own
neighbours the ones a reader meets, and About is left of Daily because the
ring says so.

**And the row is never seen to run out** (author, 2026-09-08: "they should
be visible as the animation is happening, true infinite scroll"). Two
things together give this and either alone fails it: the ring turns on
every frame of the journey rather than at the end of it, and the five
links are `min-width: 28vw` so the ring is longer than the window — it
measured 339 px inside a 360 px window before, which no amount of turning
could have filled.

**And the strip answers the press itself, not the navigation behind it**
(author, 2026-09-08: "I want the animation to be separate from the loading
below ... It should be a smooth instant response, and the loading below
should happen independently").

It used to be armed in `renderNav` and let go from `show()` once the view
transition's `finished` settled, so a press bought a quarter-second of
nothing and then the row moved. Both numbers are read from the same clock
as the press, and what the assertion is really about is that *neither
waits for the other*.

**All five pages are on screen, and the outer two by about half** (author,
2026-09-08: "you should be able to see the other 2 header buttons even if
its just half of them, and then have a fade on the edges so it looks like
they're fading out into the edges of the screen").

Half the *box* and half the *word* are the same thing only at `min-width:
25vw`, which is why the number is what it is: a label is centred in its
box, so at 26vw the 42% that showed was the box's outer edge and the last
few letters of the word. base.css carries the arithmetic.

### a coachmark is shown once, and a guess is still not an answer

Found in review, 2026-08-27: both marks came back on every load, for ever.
They were gated on `hasChosen()` and `hasChosenLanguage()` — *has
answered* — and a reader content with the guessed calendar and with
English never answers either question. The reviewer met them on the fifth
visit and the fiftieth.

The gate is *has been shown* now, written when the mark is mounted. What
must not go with it is the honesty the guess rests on: being shown a mark
still stores nothing about the church, so `hasChosen()` keeps its own
meaning, the header still names a guess as a guess, and the Index still
calls that church's saints a selection rather than the corpus.

### the Daily button says Daily on today, and wears gold when it says Today

Author, 2026-08-27, two instructions on one control. First: "if you press
'Today' and you go back to the current date, the text 'Today' does not
change back to 'Daily', you need to press it again ... The rule should be,
if you are on the current date, it should say Daily, not Today." Second:
"to make it more obvious the 'Today' fade in has a specific
functionality, print 'Today' in gold whenever it is showing."

The first was a race between two paints in one tick — the nav rebuilt for
the new route while the view had not yet said which day it was showing —
and the fade's own timer landing last. main.js has the whole account.

### a section is remembered where the reader left it, and a second press goes to the top

Author, 2026-08-27: "when you switch between them ... you come back to the
same spot. However, if you click on the page header button a second time,
it will scroll you back to the top of that page."

Kept by section rather than by path — the Daily page is one place to a
reader whichever day it is showing — and in memory rather than in the
store, because it is where this visit left off and not a preference.

**The presses are dispatched rather than clicked.** Playwright scrolls a
target into view before pressing it and the header is sticky, so an
ordinary `click()` can move the page to the top *before* the navigation
reads where the reader was — which is the one thing this test is about. A
reader pressing a bar already under their thumb does no such thing.

### a second press of the current page eases to the top over a fixed span, not a jump

2026-08-27, a reader, right after the test above shipped: "when you press
the current page header button, make sure it scrolld back to the top
instead of just jumping back with no animation. make sure its a set time
animation so if you scroll really far down it doesn't take ages to
animate back to the top."

Two things pinned together. First, motion: `window.scrollY` is sampled on
every animation frame for a second after the press, entirely inside the
page — a click-then-sample round-tripped through Node instead, one
`page.evaluate` at a time, turned out to be measuring this suite's own
IPC latency as often as the animation: a real ease calls `scrollTo`
several times, at least one of them strictly between the start and 0; a
jump goes straight to 0 and every sample after the first frame reads it.
Second, *fixed* span: a scroll five times deeper must still settle inside
the same rough deadline, which is the difference between this
hand-rolled tween and the platform's own `scrollTo({ behavior: 'smooth'
})` — Chrome scales that one's duration with distance, which is exactly
"takes ages" for a long page.

### the remembered spot is where the fade lands, not where it starts

Author, 2026-08-27, a follow-up to the test above: the section restore
used to run only after the cross-fade finished (`.finished.finally(...)`),
so the fade itself always ran from the top of the page and then jumped to
the remembered spot once the animation was over — the restore was real,
the fade lying about it was the bug. The fix moved the restore into
`swap`, after the view has rendered, so it lands before
`startViewTransition`'s new-state snapshot is taken and the fade crosses
into the right spot instead of past it.

Measured through the transition's own `ready` promise rather than a fixed
wait: `ready` resolves once that snapshot has been captured and before
the animation runs, so whatever `window.scrollY` reads at that instant is
what the reader's fade actually shows. A `waitForTimeout` would be
measuring a clock rather than the moment the transition itself keys off.

### the die is square, and the header rule sits on the buttons

Two of the author's smaller instructions, 2026-08-27: "make the dice
button square proportions. Keep the same corner fillet, just make it as
wide as it is tall", and "there is a horizontal line under the header
buttons ... There should be no margin. The bottom of the buttons should
coincide with that line."

The die took its height from `--facet-h` on 2026-08-26 and its width did
not follow, which is what left it an upright pill; both read the same
token now, so a chip's padding change moves the two together. The row's
budget paid 3.3 px for it and another 14 for Church becoming Calendar —
`the filter row still holds one line with the die in it` is where that
arithmetic lives.

### the calendar panel follows a language change while it is open

Author, 2026-08-27: "when switching languages, make sure the choose church
calendar pop-up, which may still be open when changing languages, also
shows the updated language without having to close it first to see it
update."

The button repainted on a language change and the panel did not, so a
reader who changed language with the calendar chooser open was left
reading the old one until they closed and reopened it. The panel is a
disclosure in the page's flow rather than a dialogue, so being open while
something else changes is its normal state, not an edge case.

### the chooser panels travel with the sticky header

Author, 2026-08-27: "Have the calendar and language popups stick to the
sticky header so you can access them at the bottom of a scrolled page."

Asserted where it matters - far down a long page - because in the flow at
the top of the document a panel under the header looks identical whether
it sticks or not.

### a restored section never touches zero on the way

Author, 2026-08-27: "the website header still sometimes jumps up and down
when changing pages."

The header element does not move — measured across six navigations at two
widths, it is pinned at 0 throughout. What moved was the *page*, and on a
phone the header rides it: the restore used to reset to 0 and scroll to
the remembered position a moment later, and arriving at 0 tells the
browser the reader is at the top, so it begins showing its URL bar and
then has to put it away again. One scroll, one direction, no bounce.

### the name is a stamp: the same mark in every language, in the stamp face

Author, 2026-08-28: "make sure this new website title is applied to all
languages, it no longer gets translated, it stays constant as a stamp of
branding."

It superseded 2026-08-25's "change the title on header and loading screen
to the picked language" rather than reversing it: what that instruction was
fixing was a name hard-coded in index.html and stale by a rename, and the
name still comes from one place.

**The mark draws AGIOS since 2026-09-10** (author: "Replace the current
wordmark SVG with 'AGIOS' set in the mockup's display font, converted to
outlines"), and it is one word where it was two, so the half-space gap
this test was written around — "Make the space between 'DAILY' and 'DOX'
half as wide" — has nothing left to sit between. `scripts/make_wordmark.py`
keeps the arithmetic for the day a second word comes back.

**Its accessible name is deliberately still the site's**, which is the
other half of that instruction: the mark is a mark, and AGIOS is what
the PWA manifest, the README and the `<title>` split all still say. So a
pack that translated *either* fails here.

### the brand face is allowed to arrive late rather than never

Author, 2026-08-28: "Sometimes on mobile, the title does not render in the
new font, but in the old font."

That is `font-display: optional` keeping its promise: a few frames for the
file, and if the network has not answered, the fallback for the *life of
the page*. A phone on a slow connection got Literata in the masthead
permanently and a warm reload got the stamp — two mastheads for one reader,
which is the one thing a brand cannot be. It is `swap` now, alone among
this project's faces: the body text keeps `optional`, because that policy
is there to protect a page of prose from reflowing, and the masthead is two
words in a fixed box.

### a Continue reading row carries no mark, and the shelf still clears

Author, 2026-08-28: "Remove bookmark on continue reading row cards. And why
was it even on the left side to begin with?"

It was there because the row copied the Index's, which had one until
2026-08-27; the Index's rows lost theirs that day and this was the last row
still wearing it. The left was the same borrowing half-undone: the row
builds image, body, tools, and the Index's rows had been re-ordered to
name-first with the picture trailing while this one was not.

**The shelf now has no Save control at all** — the Saved shelf's own rows
never had one — so this also pins that the *other* way off a reading row
still works: the swipe, and the × a pointer gets.

### the masthead is outlines in the served HTML, not text waiting for a face

Author, 2026-08-28: "AGIOS still sometimes opens with literata on
loading screen and title before updating to the new font. Is this because
the browser has to download? If it is, can you create an .svg yourself
based on the title and replace it with that so it always has the intended
font".

It was. GFS Nicefore is the only face here at `font-display: swap` and the
only one not preloaded, so a cold load printed the name in Literata and
swapped it when the file landed. **This reverses Addendum G6's rejection of
an SVG wordmark** — that was rejected in favour of preloading the *body*
subsets, which never addressed the masthead.

Asserted against the **raw HTML** rather than the rendered page, because
the whole claim is about the first paint: the veil is what a reader looks
at while the modules are still parsing, so a mark injected by JavaScript
would be exactly as late as the font was.

### the two Latin subsets are preloaded, and only those

Addendum G6, decided by the author on 2026-08-28: "ignore svg, just preload
texts as recommended". An SVG wordmark was the alternative considered and
rejected, so GFS Nicefore stays a face and this is the whole of the fix.

`font-display: optional` stands and is *why* this matters: optional gives
the file about a hundred milliseconds and then keeps the fallback for the
life of the page. A preload starts the request with the HTML rather than
after the stylesheet is parsed and matched, which puts the face inside that
window on most loads without the layout shift `swap` would cost.

Read out of the served HTML rather than off a live page: this is a claim
about what the document says before anything runs.

The reserved header height, pinned against the height the header actually
settles at. `--chrome-h-reserve` in base.css exists to stop the bar growing into
place at boot, which was the site's whole layout shift (brief §13); reserving
the wrong number restores the shift when it is short and leaves a permanent
strip of dead air when it is long, and neither says anything on the page.

All three breakpoints, because the narrow header is two rows and the wide one
is one, and it is the *narrow* value that no desktop-only run would ever
check. The third arrived on 2026-09-01 with the doubled chrome — "make header
items 2x bigger and span across the whole width of the window" — which is a
change to a row height and so is exactly what this table exists to catch.

### the header takes one measure on every route, Daily included

Author, 2026-09-01: "The header on Daily and Map page are different widths
from the All Saints and About page, make sure they are the same."

Nothing in the stylesheet made them different — the header takes one
measure on every route (`--page-max`, base.css) and this suite has pinned
that since the masthead doubled. What made them different was the window.
Daily and Map hold the page still (`html { overflow: hidden }`, one so the
columns can scroll themselves and one so the canvas can fill the glass), so
neither draws a classic scrollbar while All Saints and About do — 15 px of
window on Windows and Linux, and the masthead sitting 7 px further left on
half the site than on the other half.

**The geometry half of this test cannot see that**, and saying so is the
point of this paragraph: the browser these tests run in has overlay
scrollbars, where the four routes measure the same either way. So the fix
is pinned where it can be seen — the declaration that reserves the room —
and the geometry is pinned beside it because it is the thing that would
break if a route ever took its own measure again.

**The mark's whole rect again, since 2026-09-10.** It was narrowed to the
left edge alone earlier the same day, when docs/daily-desktop-visuals.md
§2.2 scoped `--text-mast-wide: 22px` to the Daily route and Daily's
masthead was therefore a different size from the other three. The author
reversed that within the day — one size everywhere — so the whole rect is
the claim once more, and it is the stronger one: a left edge alone would
pass a masthead that started in the right place at any size at all, which
is exactly the state this line was relaxed into.

**And the corner's *right* edge, not its whole box, since 2026-09-10.**
Past 1024 px the Daily page's three controls are in the sidebar's head
(§2.2 route (c), step 6 of §10.12), so `.chrome-corner` is an empty box
there and collapses to a point. Its right edge is where it always was —
`justify-self: end` in the header's grid, so it is the header's own
content edge — which is the number this line has always been standing for.
Where those controls went is asserted on Daily itself, in
`daily-panel.spec.js`, rather than inferred from a width here.

**Daily has no exception left, since the rebuild of 2026-09-12.** From
2026-09-10 that page's bar was its left column's own head: it stopped
where the column stopped, with the sidebar standing beside it, and this
test carried a derivation for the one route allowed to differ. The
rebuilt page stands its column *inside* the view instead — the day is over
the strip of saints, not the first cell of it (plan §5) — so the bar runs
the full measure like every other route's. The four are asserted as four
rather than as three and a special case, which is both the stronger claim
and the one this test was written for: one box, one measure, whether or
not the page under them scrolls.

### the masthead is one box on all six routes, at both widths and in both themes

**Twice Playwright's budget, for the same reason `map.spec.js` has one**
(2026-09-12). This test makes twenty-four `networkidle` navigations — six
routes, two widths, two themes — and two of them are the map, whose tile
warm-up alone is ~2.7 s. It ran in 22 s of its 30 until the Daily rebuild,
and the rebuilt day fetches a payload per saint of the day on paint (plan
§11.7 f) where the old page fetched the hero's: four of those navigations
are Daily, and the total crossed the line. Nothing it measures has changed
and nothing is being waited for less carefully — the budget is the thing
that was wrong, and a geometry test that times out reports a defect in the
masthead it never looked at.
  test.setTimeout(60_000);
Author, 2026-09-10: "Match the Daily page's site title to its size on
every other route… one size everywhere", and "make sure it sits in the
same place on all six routes. Shoot every route at 1280 and 1440 in both
themes and prove the rect is identical, rather than asserting it from the
CSS."

It replaces "Daily wears a smaller, quieter masthead", written earlier the
same day for docs/daily-desktop-visuals.md §2.2's
`html[data-route='calendar'] { --text-mast-wide: 22px }`. That scoping is
gone; what survives of §2.2 is the *ink* — Daily's masthead is 74% of the
way from the ground to the ink where the rest of the site's is at full
strength — because only the size was reversed, and that half is asserted
below rather than dropped with the rule it used to sit beside.

**Measured, not read off the token, and that is the instruction.** A
`--text-mast-wide` assertion passes on a route whose masthead a second
rule then sets in pixels, and it says nothing at all about *where* the
mark lands. So this reads the drawn box on every route — six routes × two
widths × two themes, 24 readings — and requires the twelve at each width
to be one rect.

**Both themes, because the mark is a picture of a word.** It is
`fill: currentColor` over paths whose advances are baked in, so a theme
cannot move it — which is a claim worth failing on rather than assuming,
since it is the kind of thing a route-scoped colour rule with a different
font-size in it would break silently.

### Daily’s two boxes start on one line, and stand clear of the bar

**What this test was, and what the rebuild left of it.** It pinned
docs/daily-desktop-visuals.md §2.2's last piece: the nav's rule and the
rule under the sidebar bubble's control row were one line across the
gutter, because in the mockup the nav sat inside the grid's first column.
The rebuilt page has no bubble and no control row to rule off (plan §5,
§6) — the standing column is a plain opaque block over the strip of
saints — so the levelling it asserted has no boxes left to be about.

Three claims of the four survive the change, and they are the three that
were about the reader rather than about that particular ornament:

 - **The day's two boxes start on the same line.** The column and the
   strip it stands over are the whole page, and a column that began a head
   below the saints — or above them — is the defect the levelling was
   written against, in the arrangement that replaced it.
 - **They stand off the ceiling by a real margin**, rather than touching
   the bar (author, 2026-09-10: "The sidebar's top currently touches the
   ceiling of the page. Give it a margin"). `--space-6`, read off the drawn
   boxes rather than off the declaration.
 - **They are clear of the bar's own box.** The bar is `position: sticky`
   at `z-index: 20`, and a page raised into its band would have live
   controls lying under an invisible sheet. Geometry alone cannot see that,
   so two controls — the header's church button and the sidebar's own day
   step, one either side of the seam — are asked what is on top of them at
   their own centres.

At both widths, and in a wide utility face: every box here is sized from
text and `--chrome-h-reserve` is a measured constant.

### a press outside a chooser closes it

Author, 2026-09-02: "when you click off the pop-ups for language or
calendar that they close. E.g. if they are open and I click outside their
bubble they should close."

They never did. Both opened in the page's own flow, where a disclosure
that waits to be answered or dismissed by its own button is ordinary; the
same afternoon they began floating over the page on a desktop, and a panel
that ignores the page underneath is one the reader has to go back and find
the switch for.

`pointerdown` is what closes them, so this presses rather than clicks — a
click would also fire, but pressing is the moment the reader has said they
are done with the panel.

### the masthead stands the same distance off the nav as the nav’s own words do

Author, 2026-09-02: "the gap between the wordmark svg and Daily should match
the gap between Daily and All Saints."

The header's five tracks are `space-3` apart, a number measured for the
narrow row where four gaps decide whether Romanian fits on one line; the
nav's own labels went to `space-8` on a desktop the day before, so one gap
in a row of four was a third the size of the others.

### the theme crosses in one movement: nothing snaps and nothing lags, on every route

Author, 2026-09-10: "the screen's corners fading at a different rate from
the rest, and the header possibly differently again."

They were, and so was most of the page. The fade was
`background-color, color` on `body`, `header` and `main` and on nothing
else, so an element with a colour of its own — the chrome bar's fill, the
header's rule, the sidebar bubble and the four notch crosses that stand on
the page's own ground at its corners, every chip, mat and hairline — had
no transition at all and arrived on the first frame while its neighbours
eased for 300 ms. Measured on Daily at 1280 before the fix: **91 painted
things snapped against 16 that eased**, and the 16 were the ones with no
colour of their own, riding `body`'s inherited `color`.

**This is the instrument, and the three unit tests beside it in
`tests/design-tokens.test.mjs` are only the cheap guards on the way here.**
Nothing in the stylesheet could have said which elements the reader
watches — that is a fact about the rendered page, and the old arrangement
read as a deliberate, complete-looking rule for three weeks.

**It synchronises on the ground rather than on the clock.** A sample taken
at a fixed number of milliseconds measures this machine; instead the frame
is chosen by `body`'s own progress, and every element is read inside that
same frame. So the assertion is "at the moment the ground is halfway,
where is everything else" — which is the question, and which a slow runner
cannot change the answer to.

Two failures are then possible and both are checked, because a colour that
crosses at the *wrong* rate and one that does not cross at all are
different defects: at the synchronising frame nothing may have arrived
(the snap), and after the fade nothing may still be travelling (the lag).

