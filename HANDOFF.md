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

**Two commits are sitting unpushed on `main`** (`8c84545` Session 4a, `5fb36e5`
Session 5, plus `99754d4` a follow-up fix). The agent session that wrote them
had no git credentials — `git push` fails with "could not read Username" — so
GitHub Actions has never run on them. They were verified instead by cloning the
repo to a clean directory and running the workflow's own steps there (`npm ci`,
`npm test`, `npm run build:manifest`, `npx playwright test`, a production
build), which is what catches the class of bug Amendment 3 records. **Push them
and confirm the run is green before building on top.**

Complete: Phase 0 data foundations, the design pass, the app shell, the
veneration badge, the calendar page, the saint detail page with the local
store, and All Saints in Index mode.

- 112 unit tests (`npm test`) — pure logic, no DOM.
- 88 browser tests (`npm run test:e2e`) — 44 specs across desktop and 360 px.
- `npm run test:all` runs both. CI runs both on every push.

## Your sessions

### Session 4b — the ship gate, still outstanding

Skipped by instruction, not by accident: Sessions 4a and 5 were run back to
back. What the executable quality floor already covers — axe at WCAG 2.1 AA,
keyboard focus, reduced motion, 360 px, no layout shift from manifest-derived
boxes — is green on every route. What it does not cover, and 4b still owes:
**Lighthouse accessibility ≥ 95** and **first contentful paint under 1.5 s on a
throttled 4G profile**. Neither has any tooling in the project yet.

### Session 6 — River mode

The horizontal, unsorted, shuffled stream (brief §8.2). Index mode is built and
the mode toggle belongs above its controls; `views/saints.js` needs no changes
to accommodate it. Note the one exception in Addendum C2: **the River
normalises to a single card box** — equal size is doing that mode's
equality-of-standing work — where the Index varies card heights from the
manifest's aspect ratios. Deep-link the shuffle seed; `settings.riverSeed`
already exists in the store.

## House rules learned the hard way

- **CI is the source of truth, not your local run.** A `.gitignore` bug once
  left `src/data/` untracked while every local test passed. **Push and confirm
  CI is green before calling a session done. If CI is red, stop and fix it —
  do not start the next session on a broken base.**
- **Do not bulk-generate saint data.** Amendment 2 explains why at length. The
  corpus is 10 saints and the calendar is empty most days; that is a known,
  accepted state, not a bug for you to paper over with invented feast days.
  Where a date is unverified, the honest entry is `undocumented` with a note —
  see `saints/paul-of-thebes/saint.json` for the pattern.
- **Gold appears only in the veneration badge. Red marks only liturgical time
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
- CRLF warnings from git are noise on this repo.
- **The user's PAT lacks the `workflow` scope.** If a commit touches
  `.github/workflows/`, their push will be rejected — tell them, and note that
  browser-based sign-in avoids it. *(This handoff's own commit touches the
  workflow file, so that push will need the wider scope.)*

## Outstanding, needs the user — not you

- **Three unpushed commits, and no CI run behind them.** See the state note
  above. This is the first thing to resolve.
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
- **The Index grid is two cards wide on a desktop**, because it sits in the
  standard 72ch content column (DESIGN.md §5). Widening the column for that one
  page is a design decision.
