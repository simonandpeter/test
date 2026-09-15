# Handoff

**`CLAUDE.md`** is how to work and where things live. **`PLAN.md`** is what the
site should be. This file is **state and what is in flight, and nothing else**.
Finished work is in `git log`; `git log --grep` searches it.

**Verify anything here before you build on it.** This file was 573 lines on
2026-09-12, nine tenths of it narratives of finished sittings. The trim kept
"Known and unfixed" on the strength of its heading and checked none of its four
items — one had been fixed three days earlier. If you are about to append your
sitting's record here, put it in the commit message instead.

---

## State, end of 2026-09-15

`bash scripts/state.sh` is the truth about what has landed — `git status` lies
here, because a PAT push never updates `origin/main`.

- **407 unit tests pass.** `locale-coverage` 0 fallbacks in all four packs.
- **Full browser suite: 982 passed, 4 failed at six workers** — and the four
  are a *different* four on each run. Run alone, all three map tests passed
  and the fourth is the shelf-swipe flake `docs/WHERE-WE-ARE.md` already
  records as the test's fault, not the page's (12 of 12 alone on 2026-09-15).
  Treat a full run's failures here as the desk until `--repeat-each=6` alone
  says otherwise; that test is what separated three real defects from the
  noise on 2026-09-15.
- **The first CI run of the revert went red** on one of them that was *not*
  noise. See "Three tests that named an instance" below.
- **862 saints**, 130 icons. The corpus reaches 28 September 2026.
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

**Numbers that go stale in prose are not written here.** The entry stylesheet's
size and its headroom under `ENTRY_CSS_CEILING` come from
`npm run test:lighthouse`. The manifest's gzipped projection against its 400 kB
budget comes from `scripts/build-manifest.mjs`. Read them from the run.

---

## The one thing that must happen next

**Nothing is blocking.** `docs/WHERE-WE-ARE.md` is the open work, and its first
item — the Daily desktop redesign — is the live question. The author has not
yet given the design.

**The entry stylesheet has ~57 bytes of headroom, not ~600.** The revert put
`calendar.css` back beside the `face-stage` rules `base.css` gained after
`f31520a`, and the ceiling went 73,000 → 73,400 against a cliff measured at
73,629 green / 73,688 red. The next few hundred bytes of CSS anywhere trips
`npm run test:lighthouse`, and the answer then is taking `index.css` and
`saint.css` off the entry (72.28 → 54.31 kB), not another 400 on the ceiling.
`scripts/lighthouse-floor.mjs`'s comment has the whole of it.

---

## Three tests that named an instance where they meant a rule

All three went red *after* the revert and **none of them was the revert's**.
They are worth reading together, because they are one failure mode and it is
the one this repo keeps meeting: a value written in a test and also in the code
it measures, with nothing tying the two.

- **`index-carousel.spec.js:1568`** filtered resource timings with
  `endsWith('-card.jpg')`. Since `502aed1` taught `build-manifest.mjs` to emit
  `cardSm`, a 360 px card asks for `icon-card-sm.jpg` — **0 of 10 requests
  matched at 360 px, 8 of 8 at 1280** — so the test measured an empty set and
  its own premise guard caught it. This is what reddened CI.
- **`index-carousel.spec.js`'s DPR-1 branch** required `-card-sm.jpg` and a
  decoded width under 280. `make_thumbs.py` cannot cut a card wider than its
  source, so 8 of 130 icons yield a `cardSm` under the 150 px box and three of
  those fall back to a card of 283-298 px. It asserts the ratio now.
- **`daily-stage.spec.js:238`** asserted `#view h1` before the stage came down,
  when both parked faces' headings are still in `#view`. A strict mode
  violation raises at once rather than retrying, so it failed on a state it
  should have waited through.

**A fourth of the same kind is already fixed and worth not re-learning:**
`lib/settings.js`'s `REGISTER_LAYOUTS` was swept out as dead code by
`1b1d811` and is load-bearing again after the revert.

---

## The Daily page was reverted on 2026-09-15

`eae39cd` takes the page back to `f31520a`, the last commit before the
2026-09-12 rebuild. The rebuild had replaced the week rail with a standing
month calendar and the register with tiles, at both widths, without the brief
`docs/WHERE-WE-ARE.md` still lists as unfinished; the author was unhappy with
both faces of it.

**It is a path-scoped checkout, not a `git revert`,** because the rebuild's
commits are interleaved with work that stays: the AGIOS rename, 178 dead
citations, the performance subagent's fixes, 130 card derivatives.

**Kept and untouched:** the rebrand, the corpus, every hymn's English,
`ui/face-stage.js` and `main.js`'s stage wiring, the 1024 px Gregorian ruling,
`lib/viewport.js`.

**What a checkout could not carry** is in `eae39cd`'s message in full. The
shape of it, because the next revert of anything will meet the same five
classes: a constant swept out as dead code that is load-bearing again
(`REGISTER_LAYOUTS`); string keys deleted from all five packs; a test helper
that went with its spec (`duringMove`); `PLAN.md` §4's tables, which
`tests/plan.test.mjs` reads in both directions and which went red at once; and
**twelve tests asserting a church's own calendar on a phone**, which the
Gregorian ruling contradicts — they now stand above 1024 px through a new
`desk()` helper in `e2e/helpers.js` rather than being quietly re-dated.

**`chrome.spec.js` was reconciled test by test, not restored whole.** `AGIOS`
appears in it 14 times now against 2 at `f31520a`; a blanket checkout would
have undone the rename's own tests. Anyone reverting further must do the same.

**Two findings from the reconciliation, neither about the Daily page:**

- **The rebuilt page had no `<h1>` at all.** That is why `quality-floor`'s
  heading test passed against it. The restored page has one, and it collided
  with All Saints' — not because the parked face is exposed (it is
  `visibility: hidden` and out of the accessibility tree) but because
  `base.css` deliberately makes **both layers paintable for the length of a
  swap**. The test was racing it and now waits for `data-swapping` to clear.
- **201 of 211 feast hymns in `src/data/liturgical-days.js` have no English.**
  The 2026-09-12 pass covered the *saints'* hymns — 428 of 428 — and that is
  the whole of what "the hymns are translated" means today.

---

## Two commits of another session's work, committed cold

`502aed1` and `1b1d811` are 47 tracked files and 520 image derivatives that had
sat uncommitted in the tree since 2026-09-12, found three days cold. They are
committed **unchanged and unreviewed** beyond `npm test`, so that the revert
could not lose them:

- `502aed1` — webp and row image derivatives, a CI byte-budget step, and the
  four probe scripts moved from `scratchpad/` into `scripts/`.
- `1b1d811` — the comment extraction into `docs/SRC-DECISIONS.md` and
  `docs/E2E-DECISIONS.md`. **Its Daily-page files were replaced wholesale by
  the revert**, so whatever of that pass still applies there has to be replayed
  from this commit rather than kept. It is also what deleted `REGISTER_LAYOUTS`.

---

## Two things git cannot tell you

**`android/app/src/main/assets/public/` holds a built copy of the site from
2026-09-05** — before the rename and before the rebuild, so its masthead reads
"Daily Dox" and its Daily page is the week rail. It is **gitignored and
untracked**: the only copy of that state outside git, and `npm run app:sync`
would overwrite it. It was the reference for what the page used to look like.

**`shots/baseline-before-daily-rebuild` exists and must never be re-shot.**
16 tiles of `/saints` from before the Daily rebuild, and `shots/` is gitignored,
so nothing else records that it is there. `shots/baseline-new-daily-2026-09-15`
is beside it now: 4 tiles of `/` at 360 and 1280 in both themes, the rebuilt
page as it stood the moment before the revert. Same rule — do not re-shoot it.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/saints \
  --widths=360,768,1280,1440 --themes=day,vigil --langs=en,ru
node scripts/tile-diff.mjs compare before-daily-rebuild
```

`MSYS_NO_PATHCONV=1` is not optional: without it every shot fails and
`tile-diff` archives stale tiles as the baseline. That happened twice and both
times the output read as success.

**`4983e72` is titled as a docs fix and also carries 3,400 lines of spec
deletions**, swept in by a bare `git commit` after `git add`. The tree is right,
the history is not. It is unpushed, so a rebase would still tidy it.

---

## Standing facts about this tree

**`npm run app:sync` has not been run**, and see the warning above before
running it. The copies under `android/app/src/main/assets/public/` and
`ios/App/App/public/` are stale build output still carrying the old name.

**`PLAN.md` §3 "The name" lists all fourteen places the brand is written
down** — change it there and in all fourteen, in one commit.

**`data-route` on the root is a *set*, not a value**, and every rule that
reads it is written `[data-route~='calendar']`. `ui/face-stage.js` writes both
faces into it for the length of a swap, so the day keeps its own stylesheet
while it slides out of a page the router has already answered `saints` for.
A new rule written `[data-route='calendar']` works everywhere except during
the one second a reader is watching the two faces move.

**Three branches exist in the locale packs and not in the English base** —
`reasons`, `offices`, `eras`. `lib/i18n.js`'s `PACK_ONLY` is the list; a
fourth goes there and nowhere else.
