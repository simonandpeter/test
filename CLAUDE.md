# CLAUDE.md — how to work here

## Read these first, in this order

Read all three before touching anything. They are ~600 lines together and they
are the whole briefing; the author's prompt does not repeat what is in them.

1. **This file** — where things live, how to work, the test table, the traps.
2. **`HANDOFF.md`** — current state and anything in flight. Read before you
   assume the working tree is clean.
3. **`PLAN.md`** — what the site should be, what is settled and must not be
   re-proposed, the design system, and the numbered next steps. **Binding**: if
   the code disagrees with it, the code is wrong. Read it before any visual or
   design decision.

Then, only if the task reaches them: `docs/saintsbuildplan.md` and
`docs/saintsplanaddendum.md` (the original brief, cited by the source 64 times
as "brief §N" and "Addendum X" — a contract, not history), and `docs/APP.md`
for the Capacitor shells.

History is in `git log` (430 commits of reasoning; `git log --grep` searches it)
and in the `*.notes.md` beside a module. Read history only when asked how
something used to work.

---

## How to talk

Succinct. Lead with the answer; no preamble, no restating the request.
Short paragraphs, tables for numbers. Say what you measured and what you
inferred, and keep them apart. Say plainly when something is not done, is
wrong, or is unverified — and correct yourself in one sentence, without a
post-mortem. Don't narrate what you are about to do; do it and report.

---

## Protocol

**`bash scripts/push.sh`** — push to `main` and read the run, in one step
because they are one step. It refuses a dirty tree, embeds the PAT and scrubs it
from the output, resets the remote, confirms the ref landed with `ls-remote`,
then waits and prints the conclusion *and* the `flaky` line. It exits non-zero
if any of that fails. `--no-wait` skips the waiting.

Reading the run used to be a separate step and was therefore skippable: on
2026-09-09 a commit was pushed, the next task begun at once, and `main` sat red
and undeployed for an hour with the cause sitting in a log nobody opened.

**Push straight to `main`.** Deploy is gated on the build passing, so a red push
skips the deploy and leaves the live site alone — a check branch buys nothing and
costs a second 17-minute run. PAT is in
`C:\Users\matei\Documents\Agios Website Ex\update git.txt`.

**`git status` lies about pushing here.** Pushing through a URL with the PAT in
it never updates `origin/main`, so the branch reports itself ahead of everything
already sent. `git ls-remote origin main` is the answer to "did it land";
`git fetch origin` puts the ref straight.

**`bash scripts/state.sh`** asks the remote itself and remembers what it last
showed you — local `HEAD`, the true remote tip, whether the tree is clean, and
**what has landed since you last looked**. Run it before answering any question
about the state of this repo. Two such answers were wrong on 2026-09-09 for the
same reason: one compared against `origin/main`, which a PAT push never updates,
and one against `HEAD`, which another session had moved.

**Read the CI run — its conclusion *and* its `flaky` line.** No `gh` here.
`scratchpad/ci.py <sha>` gives the conclusion and the failed steps;
**`scratchpad/ci-flaky.py <sha>` gives the `flaky` line and the test names
under it**, which the conclusion hides — a green run with `N flaky` contains a
test that failed and passed on retry, and that exists only in the job log. The
job-log endpoint 302s to pre-signed blob storage and 401s if `Authorization`
follows the redirect, so the redirect is taken by hand without it.

**Run the surface you touched, not the suite** (table below). The full suite is
for: before a push, after touching shared chrome or `src/lib`, at a milestone.

**If a full run fails outside what the change can reach, do not re-run it.**
Compare against the unmodified tree once (`git stash`, run, unstash) and let CI
arbitrate. A spread of failures across unrelated surfaces is a fact about the
machine before it is a fact about the diff.

**But measure before you accept it as noise.** Twice now the "machine noise"
has been a number worth changing (2026-09-09):

- `map.spec.js` held 40 of the 61 failures this desk had ever seen, and the
  reason was one wait. `networkidle` sat through a 6 MB tile warm-up 76 times,
  so the file ran at 16.8 s a test against 2.9 s for every other spec, under a
  30 s timeout. Fixing the wait took it from 15 failures to 2 and halved its
  time.
- Then `index-carousel.spec.js` was the whole of what remained, flaking on two
  consecutive CI runs while passing 24 of 24 run alone. Both tests were
  spending their budget on something other than what they measured: All Saints
  packs 862 captions in one blocking task before first paint, and a two-frame
  wait after a viewport change is not a repack.

**A test that fails only under parallel load is telling you what it costs.**
Run it with `--repeat-each=6` alone first — if it passes, the flake is a
budget, not a bug. `--workers=1` against the full run is the other half of that
comparison.

**And if it still will not reproduce, throttle the CPU rather than theorise.**
`Emulation.setCPUThrottlingRate` after the `goto` turns a two-core runner into
something this desk can be. **`node scratchpad/throttle-probe.mjs
hover|resize|ceiling [rates]`** against a running `npm run preview` is the tool.
Three flakes survived a day of guessing — including two explanations written
into the code and later disproved — and all three fell out in minutes at 20x:

- `hover()` waits for its target to be **stable**, which a row drifting by
  design never is. At 1x the drift is ~0.4 px a frame and rounds to equal often
  enough to pass; at 20x it never does. `mouse.move` to a coordinate has no
  actionability gate.
- A resized cell reports **0** before it reports its new width (trap 7 again),
  and a poll for "narrower than before" accepts the 0, exits, and then fails a
  floor of 150. At 1x the real width lands in ~150 ms and the zero is never
  seen; at 20x it is the first reading every time. The width also *oscillates*
  back through 0, so the assertion has to be made on the reading that settled —
  two consecutive equal non-zero ones — not on a fresh read afterwards.
- A zoom climb that bursts ten presses to a settle arrives only on a **slow**
  machine, since a press sent mid-flight re-aims from wherever the view has
  reached. It passed every full suite and failed 3 of 8 run alone.

**Measure before fixing, and stop when the instrument cannot resolve the
change.** This desk's spread across identical builds is wider than most
micro-optimisations. Say what you measured and what you inferred, and keep them
apart.

**Every fix gets a test, backed out and confirmed to fail before it is
believed — and verified both alone and under load.** A burst climb added to
`map.spec.js` on 2026-09-09 passed every full suite and failed 3 of 8 run
alone, because six parallel workers made the desk slow enough to hide it. The
suite is not automatically the stronger signal.

**An audit script prints its hits, never only a count.** Both instrument bugs
that day were caught the moment rows were looked at instead of totals — a
`white-space: nowrap` counted as a named colour, and a shadow inventory whose
every selector was wrong because the grep behind it required column 0. Both tests written on 2026-09-09 had a hole the back-out found: the
shadow inventory missed a rule written on one line, exactly as the token test's
declaration reader once did.

**A comment may state a constraint. A quantity or a mechanism needs a test
pinning it, or it says plainly that it is unverified.** Eleven of the fourteen
problems found on 2026-09-09 were prose asserting a number or a cause nobody
had measured, and two of those were written by the session that then found
them — so this is a rule about mechanism, not about care.

---

## Where things live

### Pages

| page | view | styles |
| --- | --- | --- |
| Daily | `views/calendar.js` + `views/daily/*` | `calendar.css` |
| All Saints | `views/saints.js` + `views/index/*` | `index.css` |
| Saint | `views/saint.js` | `saint.css` |
| Map | `views/map.js` + `views/map/*` | `map.css` |
| Texts | `views/texts.js` | — |
| About | `views/about.js` | `about.css` |

**`views/daily/`** — `state.js` (sole writer), `entries.js` (feast index, reach),
`format.js`, `record.js` (readings, hymns), `panel.js` (hero, register),
`picker.js` (week rail *and* month — one control), `fullcal.js`.
`calendar.js` owns *which day*; nothing in `daily/` calls back into it.
Two columns past 1024 px, `display: contents` below it.

**`views/index/`** — `state.js`, `modes.js` (carousel, column packing, the mode
toggle), `grid.js` (virtualised and absolutely positioned), `controls.js`,
`search.js`, `filter.js` (no DOM), `count.js`, `sticky.js`, `place.js`.
One page, two faces; nothing is rebuilt to swap between them.

**`views/map/`** — `state.js` is the one object every module reads and writes;
no module keeps a copy, and that rule is what makes the split safe. `paint.js`
(draw pass, terrain tiles), `motion.js` (flight, glide, playback),
`timeline.js`, `chrome.js` (zoom, filters), `search.js`, `press.js`.
`views/map.js` keeps the markup, the render and the choosing of a saint or blob.

### Shared

**`src/ui/`** — `strings.js` (English base), `locales/{ru,ro,el,sr}.js`,
`nav-scroll.js` (the phone's nav strip), `loop-scroll.js` (the carousel's endless
engine and its image queue), `panel-control.js` (both chooser disclosures),
`fly.js`, `shelf.js`, `save.js`, `coachmark.js`, `hymns.js`, `datefacts.js`,
`grain.js` / `grain-drag.js` (gesture primitives), `wordmark.js` (generated).

**`src/lib/`** — pure logic, unit-tested. `calendar-page.js` (date stepping, hero
pick, interval display), `i18n.js` (language, `PACK_ONLY`), `date-display.js` (a
recorded date in the reader's language), `honorific.js` / `saint-name.js` (which
name to print), `map-view.js` / `map-labels.js` / `map-track.js` / `mercator.js`
(the map's whole arithmetic), `index-filters.js`, `virtual-grid.js`,
`name-lines.js`, `liturgy.js`, `feasts.js`, `computus.js`, `router.js`,
`store.js`, `settings.js`, `motion.js` (`reducedMotion`, and `DUR`/`EASE` — the
JS half of the motion scale, held to `tokens.css` by a test).

**`src/data/`** — `churches.js`, `calendars.js`, `places.js` (a hand-written
gazetteer, on purpose), `periods.js`, `historical-labels.js`, `days.js`,
`liturgical-days.js`; and the map's `land*.js`, `water*.js`, `terrain-tiles*`,
all script-generated, committed, never hand-edited.

**`src/main.js`** — routes, the nav, section scroll, view transitions, the
service worker and the Capacitor shell hook (dynamic, native only).

### Strings

`ui/strings.js` is the English base; the four packs merge over it **in place**,
so a module that captured a branch at import keeps working. Touch all five, then
`node scripts/locale-coverage.mjs` (0 fallbacks before done).

**Three branches exist in the packs and not in the base** — `reasons`, `offices`,
`eras` — because their *keys* are English phrases the data wrote down.
`lib/i18n.js`'s `PACK_ONLY` is the list, and `pruneTo`, `tests/i18n.test.mjs` and
`locale-coverage.mjs` all read it. A fourth goes there and nowhere else.

### Corpus

`saints/<slug>/{saint.json, life.md, images/}` → `scripts/build-manifest.mjs` →
`data/manifest.json`. Icons need `icon.jpg` plus two generated derivatives
(`npm run thumbs`). **`/data/` is gitignored**, so anything running before
`build:manifest` — which includes `npm test` on CI — must read the saints' own
folders, not the manifest.

---

## Tests

- **Unit** `tests/*.mjs` — `npm test`, ~2 s, 353 tests. Put logic here.
- **`tests/plan.test.mjs` executes `PLAN.md`.** Its tables of colours, type,
  durations, easings and shadows are read and checked against the code, in both
  directions — a token added and not written down fails too. **If you change a
  value, change the table in the same commit.** `tests/citations.test.mjs` does
  the same for references: every `*.md` named in the source exists, every
  `brief §N` and `Addendum X` resolves, and a deleted document may only be
  mentioned in the past tense.
- **Browser** `e2e/*.spec.js` — 902 across `desktop` and `mobile-360`, ~12 min.
  `map.spec.js` gets a 60 s per-test budget; the rest run on Playwright's 30.
- **`npm run test:lighthouse`** — accessibility and FCP on throttled 4G; gates CI.

| touched | run |
| --- | --- |
| `views/index/*`, `index.css`, `lib/index-filters.js`, `lib/virtual-grid.js` | `index-carousel`, `index-grid`, `index-controls` |
| `views/daily/*`, `calendar.js`, `calendar.css`, `lib/liturgy.js`, `feasts.js`, `computus.js` | `daily-panel`, `daily-picker`, `daily-register` |
| `views/saint.js`, `saint.css`, `lib/detail.js`, `cross-link.js`, `ui/hymns.js` | `saint.spec.js` |
| `ui/*`, `main.js`, `base.css`, `tokens.css` | `chrome.spec.js` + the surface |
| `views/map*`, `map.css`, `lib/map-*`, `lib/mercator.js`, `data/places.js` | `map.spec.js` |
| `ui/strings.js`, `ui/locales/*` | `locale-coverage.mjs`, then the full run |
| `lib/*`, `data/`, `build-manifest.mjs` | `npm test`, then the surface |

~25 s of every invocation is fixed cost, so a whole spec beats three single
tests. Iterate at **mobile-360** — that is the width that breaks.

**`COLD_FACE=1`** refuses the webfont and forces Verdana + Times, harder than the
runner's own DejaVu. Run it on anything that measures text. It only decorates the
injected `page`; a test opening its own context must call `coldFace(page)`.

---

## Traps

1. **Mounted ≠ corpus, DOM order ≠ screen order** on All Saints. Assert by
   geometry, never `.first()`.
2. **A width measured in the native face is a fact about one machine.**
3. **`locator.click()` scrolls its target into view**, so pressing something in
   the sticky bar carries the page to the top. Dispatch the press instead.
4. **Anything depending on today's date** fails on exactly one day a year. Use
   `aDayThatIsNotToday`.
5. **A card read off the opening screenful is one shuffle.** Pin the saint by
   name and assert the pin's premise.
6. **A green build says nothing about a code move** — `node scripts/extraction-check.mjs`.
7. **A hidden element reports 0 and ignores writes.** Guard on `clientWidth > 0`.
8. **`loopScroll` is not measurable until it says so.** Wait for the track to be
   past 0 before writing a position into it.
9. **A custom property does not compute**: `getPropertyValue('--x')` returns the
   literal `clamp(...)`.
10. **CPU throttling reproduces what parallel load cannot.**
    `Emulation.setCPUThrottlingRate`, *after* the `goto`, and prove it bit.
11. **A dispatched `PointerEvent` ignores `touch-action`** and is not an active
    pointer, so `setPointerCapture` throws. Use CDP `Input.dispatchTouchEvent`.
12. **A loop of zoom presses without `settledZoom` between them measures the
    machine, not the map.** Presses ease, and a press mid-flight re-targets from
    wherever the view has reached, so a tight loop travels a timing-dependent
    distance. The zoom-*out* loop was missed when the helper went into the
    zoom-*in* loop beside it and sat at 2 failures in 5 at mobile-360 — blamed
    on CI load, then on a terrain change, before the diff was found.
13. **`page.route` does not see a service worker's requests.** Use
    `serviceWorkers: 'block'`, and count the interceptions — a pattern that
    matches nothing fails *open*.
14. **An instrument that reads what the code publishes about itself cannot see
    what the reader sees.** A published anchor is not a drawn glyph; a
    `scrollLeft` that moved is not a frame anyone saw, because a view transition
    covers the document with a snapshot for its duration. Assert two independent
    things, and find the gap by backing the change out and watching the test pass.
15. **A truncated pass is not a pass.** A backgrounded run reported "880 passed"
    and exit 0 while the full log said 17 failed. Redirect to a file and grep the
    whole of it. A `cmd; echo $?` chain reports the `echo`'s status, not the
    run's — a suite that never started because port 4173 was still held read as
    exit 0 on 2026-09-08.
16. **A click aimed at a blob can land on one of its own members.** A dot only
    wins over its blob when that blob is already open.

**When you add an instrument, ask what it would look like if it were doing
nothing.**

---

## Commands

- `npm run build` — manifest + texts + vite build.
- `npm run dev` — :5173, HMR. **Use this for visual work**, not a rebuilt preview.
- `npm run preview` — serves `dist/` on :4173. Kill it when done.
- `npm test`, `npm run test:e2e`, `npm run test:lighthouse`.
- **`node scripts/contact-sheet.mjs`** — every route × width × theme × language
  as one labelled grid in `shots/contact.png`. **The default for visual work**:
  look at everything once rather than a surface at a time. `--widths=1280
  --tile=900` when working on one width; `--still` for a pixel diff.
  **It starts and stops its own dev server** — do not start one for it, and
  pass `--base=` only to aim it somewhere deliberately. A dev server left from
  an earlier sitting keeps 5173 while a new `npm run dev` quietly takes 5175,
  and the sheet drew the wrong tree and reported success (2026-09-09). It also
  found a dev-only 404 on the saint route on its first run.
  **48 tiles in 43 s** (2 widths × 2 themes × 2 languages × 6 routes).
  `export MSYS_NO_PATHCONV=1` before `--routes=/`, or the shell turns it into
  `C:/Program Files/Git/` and you get six tiles of nothing.
- **`--css=mockups/a.css,mockups/b.css`** shoots each as its own labelled row,
  with the baseline first. **This is how visual options are compared**: no file
  is edited, no tree is left dirty, and three variants of two routes take 11 s
  in one image. `mockups/` holds them; two are there already (`panel-card.css`,
  `panel-icon.css`, the two readings of PLAN's kovcheg).
- **`node scripts/tile-diff.mjs snapshot <name>` / `compare <name>`** — the
  other half of `--still`. Per-tile differing-pixel counts against a kept
  baseline, and a mask beside each changed tile showing *where* it moved.
  Without it "the tiles are identical" is a claim someone made by looking, and
  looking is what a half-pixel change defeats.
- `node scripts/shot.mjs <name> <url> [width] [steps…]` — one screenshot, for a
  state the sheet cannot reach (mid-flight, after a press). Steps: `click:`,
  `wait:`, `key:`, `scroll:`, `lang:`, `church:`.
- `node scripts/locale-coverage.mjs` — pack gaps, and offices/eras against the
  corpus.
- `node scripts/language-audit.mjs`, `date-audit.mjs`, `place-candidates.mjs`,
  `track-candidates.mjs`, `related-from-links.mjs` — all **propose, never
  write**; every row needs a reading.
- `npm run thumbs`, `python scripts/make_wordmark.py`, `node scripts/make-land.mjs`,
  `python scripts/make-terrain.py` — regenerate committed assets, by hand only.
- `npm run app:sync` / `app:android` / `app:ios` — the Capacitor shells;
  `docs/APP.md` is the guide.
- **`bash "/c/Users/matei/Desktop/ClaudeWake/wake.sh" <when> "note"`** — arm a
  wake-up so a session stranded by a usage limit resumes itself instead of
  idling until somebody notices. **Launch it with `run_in_background: true`**:
  the whole mechanism is that a *finished* background task re-invokes the
  session, so in the foreground it is only a slow `sleep` blocking the thing it
  was meant to protect. `<when>` takes `90m`, `2h`, a bare number of minutes,
  or a clock time (`06:30`, read as tomorrow if it has gone). Fire it *after*
  the quota returns — the limit message names the hour — because a wake cannot
  spend tokens that are not back yet and an early one spends the single
  resumption you had. Arm one before anything long and unattended, and at the
  point in a sitting where the ceiling looks close. Written 2026-09-09 after a
  limit pause idled a session for hours while its own stray CI poll, finishing,
  proved the mechanism works; `README.md` beside it has the rest.

**Windows.** Prefer Write/Edit or short Python over PowerShell heredocs. A Python
heredoc through the Bash tool loses one level of backslashes — put regexes in a
file written with the Write tool. Heredocs over ~9 kB fail to parse.
`export MSYS_NO_PATHCONV=1` before any leading-slash argument. `azbyka.ru`
answers 403 to Python and curl; the in-app browser reads it.
