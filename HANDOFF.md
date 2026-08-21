# Handoff — start here

You are picking up the Gallery of Saints build. Nothing of the previous
conversations survives except the files in this repo, so this document is the
briefing.

## Read first, in this order

1. `../saintsbuildplan.md` — the brief.
2. `../saintsplanaddendum.md` — **supersedes the brief where they disagree.**
3. `../veneration-glyph-spec.md`, `../veneration-glyph.js`,
   `../veneration-glyph-proof.html` — the author's component spec and
   reference. **Treat its behaviour as binding.** It has been revised once
   mid-build; if it disagrees with anything below, it wins and the docs get
   rewritten. Check the file rather than trusting a summary of it, including
   this one.
4. `DESIGN.md` — binding. §7 is the glyph, §5b the calendar page.
5. `SESSIONS.md` — the delivery plan. **Its Amendments section at the top is
   the most important page in the repo**; fourteen entries now, each recording
   something that cost real time to learn.

Do not re-litigate settled decisions. If something looks odd, assume there is a
recorded reason and search these documents before changing it.

## State as of 2026-08-21

Live at https://simonandpeter.github.io/test/ — deployed by GitHub Actions from
`dist/`, **not** from the branch.

Complete: Phase 0 data foundations, the design pass, the app shell, the
veneration glyph in both its views, the calendar page, the saint detail page
with the local store, All Saints in Index mode, and an About page that explains
the mark.

- 123 unit tests (`npm test`) — pure logic, no DOM.
- 136 browser tests (`npm run test:e2e`) — across desktop and 360 px.
- `npm run test:all` runs both. CI runs both on every push.

**Check `git log origin/main..HEAD` before anything else.** Agent sessions have
no git credentials — `git push` fails with "could not read Username" from both
shells — so commits accumulate locally and the author pushes them by hand. If
any are outstanding, they have never been through GitHub Actions. Ask the
author to push and confirm the run is green before building on top.

## The glyph, because it has moved twice

Read DESIGN.md §7 in full before touching it. In short:

- **Circles, not squares.** Attested and refused share radius 0.31 × pitch;
  undocumented is 0.11 × pitch — a visibly smaller circle, not the same one
  faded. Marks are centred on their cell. The repo shipped squares for half a
  day from an earlier revision of the spec; do not reintroduce them.
- **Two views over one dataset.** `renderBadge` (four communions, one row) in
  lists and on cards; `renderMatrix` (rite × communion, 13 occupied cells of a
  7 × 4 lattice) beside a saint's own name and the calendar hero. Both call one
  `cellMark()` and one `rollupStates()` in `badge.js`.
- **The matrix is a decomposition of the badge.** `decomposesToBadge()` states
  it; two unit tests assert it exhaustively and across the corpus. If you touch
  either renderer, that invariant is the thing to protect.
- **Eastern Catholic is one registry entry holding six rites**, so it fills six
  matrix cells and each says so in its legend. DESIGN.md §7b explains why that
  beats leaving them blank, and names the cost.
- **Sizes:** badge pitch 10.2, matrix pitch 7.65. The matrix's undocumented dot
  is 1.68 px, under the 2 px legibility floor §7c records. It reads at 2× and
  above. It is the first thing that gives if the glyph shrinks again.
- The glyph is **pinned to the right margin** of its line, not trailing the
  name. Register rows pin it after the feast date; below 480 px they don't.

## Your work, in order

### First: refinements

The author has been reviewing screen by screen and will keep going. Expect
short, specific requests. What that has looked like so far, so you can match
the standard:

- **Render it and look at it.** Several of these were things no test would
  catch and no amount of reading the code would reveal. Screenshot the change.
- **Every fix gets a browser test, and the test gets checked.** Back the fix
  out, confirm the test fails, put it back. Two of the last four fixes were
  one-line CSS changes whose tests would have passed without them.
- **The quality floor is a real gate and it has caught real regressions** —
  a 360 px overflow, a 5 px row shift. When it fails, fix the cause. It has not
  yet been wrong.

### Then: Session 4b, the ship gate — still outstanding

Skipped by instruction, not by accident. What the executable quality floor
already covers — axe at WCAG 2.1 AA, keyboard focus, reduced motion, 360 px, no
layout shift — is green on every route. What 4b still owes: **Lighthouse
accessibility ≥ 95** and **first contentful paint under 1.5 s on a throttled 4G
profile**. Neither has tooling in the project yet.

Note before claiming the gate: 4b's own criterion is "a genuinely usable daily
site on its own", and the corpus is ten saints, so the calendar is empty on
~355 days a year. That is a data question, not an engineering one, and whether
to ship against it is the author's call rather than yours.

### Then: Session 6 — River mode

The horizontal, unsorted, shuffled stream (brief §8.2). The mode toggle belongs
above the Index's controls; `views/saints.js` needs no restructuring for it.
Addendum C2's one exception: **the River normalises to a single card box** —
equal size is doing that mode's equality-of-standing work — where the Index
varies card heights from the manifest's aspect ratios. Deep-link the shuffle
seed; `settings.riverSeed` already exists in the store.

The Index's View control (cards / rows) is a different axis from the mode
toggle and stays beside Sort. The River takes neither: no sort control by
design, and its single card box is the point of the mode.

### After that

Session 7 — Phase 3a, the globe. Session 8 — timeline, export/import. Session 9
— PWA, offline, About page statistics (the About page now has a "Reading the
mark" section; the editorial policy prose is still a placeholder awaiting that
session). SESSIONS.md has each in full.

## House rules learned the hard way

- **CI is the source of truth, not your local run.** A `.gitignore` bug once
  left `src/data/` untracked while every local test passed. Confirm CI is green
  before calling a session done. If CI is red, stop and fix it.
- **A count in the DOM is not a count in the corpus.** The Index is
  virtualised: at 360 px it renders one card of ten. Assert what the page
  claims, not what happens to be mounted.
- **Do not bulk-generate saint data.** Amendment 2 explains why at length. The
  corpus is 10 saints and the calendar is empty most days; that is a known,
  accepted state. Where a date is unverified the honest entry is
  `undocumented` with a note — see `saints/paul-of-thebes/saint.json`. The same
  discipline applies to tests: if no saint exercises a feature, say so rather
  than inventing one that does. Two features have no browser coverage for
  exactly this reason.
- **Gold appears only in the veneration glyph. Red marks only liturgical time
  and the reader's place.** These two sentences are the design (DESIGN.md §2).
  Errors are prose in ink, never a red banner.
- **Reduced motion removes animation, never shortens it.** There is a global
  CSS rule and a test. Where JS waits for a transition, it must skip the wait
  under reduced motion too — a 420 ms pause with no animation behind it is the
  same bug wearing a different hat.
- **Anything that holds two copies of a thing in the DOM for the length of an
  animation must say which copy is current.** A bare `querySelector` cannot.
  That was Amendment 9, and it was invisible until someone clicked faster than
  the designer did.
- Adding a saint means adding one folder. Never hand-edit `data/`.

## Environment notes (Windows)

- `node --test` with no arguments discovers all unit tests. Prefer the bare
  form.
- **PowerShell 5.1 writes a BOM** with `Set-Content -Encoding utf8`, which
  breaks `JSON.parse`. Prefer the Write tool, or patch files with short Python
  scripts — that is what recent sessions have used and it has been reliable.
- Git Bash mangles leading-slash paths in arguments. Verify against live URLs.
- `npm run dev` must be backgrounded; it does not exit.
- **Never leave a `vite preview` running.** Playwright's config does not reuse
  a server it did not start, so a stray one on :4173 fails the run loudly. Note
  that killing the npx wrapper does not always kill the vite child — check
  `netstat` for a LISTENING port and kill by PID.
- **`font-display: optional` makes absolute layout assertions flaky.** A cold
  load keeps the fallback face, whose wider metrics wrap rows differently — 31
  px of difference on the index. Assert things that measure the same in either
  face.
- Large heredocs through the Bash tool truncate unpredictably; write source
  files with the Write tool and patch them with short scripts.
- CRLF warnings from git are noise on this repo.
- **The author's PAT lacks the `workflow` scope.** If a commit touches
  `.github/workflows/`, their push will be rejected — tell them rather than
  working around it.

## Outstanding, needs the author — not you

- **Unpushed commits, if `git log origin/main..HEAD` shows any.** First thing
  to resolve.
- **Seven image source links.** Licence is settled — Public Domain Mark 1.0,
  which obliges no attribution — but each `icon.meta.json` still wants a real
  `source_url` in place of the `example.invalid` placeholder, because
  provenance is how a reader checks that claim. 7 live build warnings. Blocks
  publication, not your work.
- **Breadth of veneration counts communions, not the thirteen expanded cells.**
  Six of the thirteen come from one registry entry, so counting them separately
  would inflate breadth for anything Eastern Catholic venerates. If the count
  should be out of thirteen, that is a data decision.
- **Assyrian Church of the East `paschal_computus`** is unverified and flagged
  `needs_sourcing`. Nothing renders a movable feast yet.
- **Manifest budget:** projects to 864 KB gzipped at 5,000 saints against a
  400 KB ceiling. Meaningless below ~200 saints. Re-check past that mark; do
  not build sharding before then.
- **Search reaches display names only.** The MiniSearch index is built from the
  manifest, which carries `display_name` but not the `names` array, so Ἀντώνιος
  and Ⲁⲛⲧⲱⲛⲓⲟⲥ find nothing. Fixing it costs manifest bytes — author's call.
- **The Index sits in the standard 72ch content column** (DESIGN.md §5), which
  is two cards wide on a desktop. Widening it for that one page is a design
  decision.
- **Data acquisition has not started.** Amendment 2 says the overnight work is
  the pipeline and the review workflow, not the corpus. It is the critical path
  to anything shipping.
