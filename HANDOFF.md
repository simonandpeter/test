# Handoff — start here

You are picking up the Gallery of Saints build at **Session 4b or 6**. Nothing
of the previous conversations survives except the files in this repo, so this
document is the briefing.

## Read first, in this order

1. `../saintsbuildplan.md` — the brief.
2. `../saintsplanaddendum.md` — **supersedes the brief where they disagree.**
3. `DESIGN.md` — binding. Written before any component CSS, per brief §14.
4. `SESSIONS.md` — the delivery plan. **Its Amendments section at the top is
   the most important page in the repo**; it records decisions that cost real
   time to learn.

Do not re-litigate settled decisions. If something looks odd, assume there is a
recorded reason and search these four documents before changing it.

## State as of 2026-08-21, after Sessions 4a and 5

Live at https://simonandpeter.github.io/test/ — deployed by GitHub Actions
from `dist/`, **not** from the branch.

Complete: Phase 0 data foundations, the design pass, the app shell, the
veneration glyph, the calendar page, the saint detail page with the local
store, and All Saints in Index mode.

- 113 unit tests (`npm test`) — pure logic, no DOM.
- 104 browser tests (`npm run test:e2e`) — 52 specs across desktop and 360 px.
- `npm run test:all` runs both. CI runs both on every push.

**Check `git log origin/main..HEAD` before anything else.** The agent sessions
that wrote this work had no git credentials — `git push` fails with "could not
read Username" from both shells — so commits accumulate locally and the author
pushes them by hand. If any are outstanding, they have never been through
GitHub Actions. They were verified instead by cloning the repo to a clean
directory and running the workflow's own steps there (`npm ci`, `npm test`,
`npm run build:manifest`, `CI=1 npx playwright test`, a production build with
`BASE_PATH`), which catches the class of bug Amendment 3 records but is not the
same as CI. Ask the author to push, and confirm the run is green, before
building on top.

### What changed after Session 5, at the author's direction

Read these before touching the glyph or the index, because each superseded
something a document still half-remembers:

- **The glyph's geometry is the author's `veneration-glyph` spec** (attested =
  full cell in gold; refused = full cell in ink at low opacity; undocumented =
  a centred square at 0.275 of the cell). It supersedes Addendum A1's hollow
  refusal cell. DESIGN.md §7 names all three drafts so a superseded one is not
  reintroduced from an older document. The component holds **no colour
  literal**: four custom properties in `tokens.css`, both themes.
- **The glyph follows the name, everywhere a name appears** — hero, detail
  page, index card, register and shelf rows. The name and its glyph are one
  line that does not wrap (DESIGN.md §7).
- **The Index has two layouts**, cards and rows, chosen by a View control
  beside Sort and remembered in `settings.indexLayout`.
- **Image licence is Public Domain Mark 1.0**, so no credit is owed; only the
  per-image `source_url` is outstanding, and it currently holds a deliberate
  placeholder. See `src/lib/licence.js`.

## Your sessions

### Session 4b — the ship gate, still outstanding

Skipped by instruction, not by accident: Sessions 4a and 5 were run back to
back. What the executable quality floor already covers — axe at WCAG 2.1 AA,
keyboard focus, reduced motion, 360 px, no layout shift from manifest-derived
boxes — is green on every route. What it does not cover, and 4b still owes:
**Lighthouse accessibility ≥ 95** and **first contentful paint under 1.5 s on a
throttled 4G profile**. Neither has any tooling in the project yet.

Note before claiming the gate: 4b's own criterion is "a genuinely usable daily
site on its own", and the corpus is ten saints, so the calendar is empty on
~355 days a year. That is a data question, not an engineering one, and whether
to ship against it is the author's call rather than yours.

### Session 6 — River mode

The horizontal, unsorted, shuffled stream (brief §8.2). Index mode is built and
the mode toggle belongs above its controls; `views/saints.js` needs no changes
to accommodate it. Note the one exception in Addendum C2: **the River
normalises to a single card box** — equal size is doing that mode's
equality-of-standing work — where the Index varies card heights from the
manifest's aspect ratios. Deep-link the shuffle seed; `settings.riverSeed`
already exists in the store.

The Index's own View control (cards / rows, `settings.indexLayout`) is a
different axis from the mode toggle and belongs beside Sort, where it is. The
River takes neither: it has no sort control by design, and its single card box
is the point of the mode.

## House rules learned the hard way

- **CI is the source of truth, not your local run.** A `.gitignore` bug once
  left `src/data/` untracked while every local test passed. **Confirm CI is
  green before calling a session done. If CI is red, stop and fix it — do not
  start the next session on a broken base.**
- **A count in the DOM is not a count in the corpus.** The Index is
  virtualised: at 360 px it renders one card of ten. Three browser tests were
  written against `.index-card` counts and had to be rewritten against
  `[data-count]`. Assert what the page claims, not what happens to be mounted.
- **Do not bulk-generate saint data.** Amendment 2 explains why at length. The
  corpus is 10 saints and the calendar is empty most days; that is a known,
  accepted state, not a bug for you to paper over with invented feast days.
  Where a date is unverified, the honest entry is `undocumented` with a note —
  see `saints/paul-of-thebes/saint.json` for the pattern. The same discipline
  applies to tests: two features (the undated tray, the calendar's "also
  commemorated" register) have no browser coverage because no saint in this
  corpus exercises them, and inventing one would have been inventing data.
- **Gold appears only in the veneration glyph. Red marks only liturgical time
  and the reader's place.** These two sentences are the design (DESIGN.md §2).
  Errors are prose in ink, never a red banner.
- **Reduced motion removes animation, never shortens it.** There is a test.
- Adding a saint means adding one folder. Never hand-edit `data/`.

## Environment notes (Windows)

- `node --test` with no arguments discovers all unit tests; a quoted glob also
  works. Prefer the bare form.
- **PowerShell 5.1 writes a BOM** with `Set-Content -Encoding utf8`, which
  breaks `JSON.parse`. The manifest build strips BOMs defensively, but prefer
  the Write tool or `[System.IO.File]::WriteAllText` with `UTF8Encoding($false)`.
- Git Bash mangles leading-slash paths in arguments (`/test/x` becomes
  `C:/Program Files/Git/test/x`). Verify against live URLs, not local echoes.
- `npm run dev` must be backgrounded; it does not exit.
- **Never leave a `vite preview` running.** Playwright's config no longer
  reuses a server it did not start, so a stray one on :4173 now fails the run
  loudly — which is the point. It previously served a stale `dist` and produced
  a false green twice, once inside a clean-checkout verification.
- Large heredocs through the Bash tool truncate unpredictably; write source
  files with the Write tool and patch them with short scripts.
- CRLF warnings from git are noise on this repo.
- **The author's PAT lacks the `workflow` scope.** If a commit touches
  `.github/workflows/`, their push will be rejected — tell them, and note that
  browser-based sign-in avoids it.

## Outstanding, needs the author — not you

- **Unpushed commits, if `git log origin/main..HEAD` shows any.** See the state
  note above. This is the first thing to resolve.
- **Seven image source links.** The licence is settled: Public Domain Mark 1.0,
  per the author (2026-08-21), which obliges no attribution — so the build no
  longer asks for a credit. It still asks for `source_url` in each
  `icon.meta.json`, because provenance is how a reader checks that claim. Those
  fields hold a deliberate placeholder on `example.invalid` (see
  `src/lib/licence.js`) so the field could be exercised before the real links
  were found — the build names it as a placeholder and the detail page prints
  the licence without linking it. Currently 7 live build warnings. Blocks
  publication; does not block your sessions.
- **Assyrian Church of the East `paschal_computus`** is unverified and flagged
  `needs_sourcing` in `src/data/churches.js`. Nothing renders a movable feast
  yet, so this is not urgent.
- **Manifest budget:** projects to 864 KB gzipped at 5,000 saints against a
  400 KB ceiling. Meaningless below ~200 saints — gzip has nothing to work
  with. Re-check past that mark; do not build sharding before then.
- **Search reaches display names only.** The Index's MiniSearch index is built
  from the manifest, which carries `display_name` but not the `names` array, so
  Ἀντώνιος and Ⲁⲛⲧⲱⲛⲓⲟⲥ find nothing. Putting the name forms in the manifest
  would fix it and would cost bytes against the budget above — an author's
  call, not a code one.
- **The Index sits in the standard 72ch content column** (DESIGN.md §5), which
  is two cards wide on a desktop. Widening the column for that one page is a
  design decision.
- **Data acquisition has not started.** Amendment 2 says the overnight work is
  the pipeline and the review workflow, not the corpus. It is the critical path
  to anything shipping.
