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

**Six commits unpushed**, local `HEAD` `eae39cd` plus the doc commit after it,
remote `4bf4cdf`. `bash scripts/state.sh` is the truth about this — `git status`
lies here, because a PAT push never updates `origin/main`.

- **407 unit tests pass.** `locale-coverage` 0 fallbacks in all four packs.
- **Full browser suite: 976 passed, 6 failed**, and all six pass alone —
  266 of 266 at two workers across `map`, `pwa`, `index-carousel` and
  `daily-stage`. That is this desk's parallel load, not the diff.
- **862 saints**, 130 icons. The corpus reaches 28 September 2026.
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

**Numbers that go stale in prose are not written here.** The entry stylesheet's
size and its headroom under `ENTRY_CSS_CEILING` come from
`npm run test:lighthouse`. The manifest's gzipped projection against its 400 kB
budget comes from `scripts/build-manifest.mjs`. Read them from the run.

---

## The one thing that must happen next

**Nothing is blocking, and nothing has been pushed.** Six commits sit on top of
the remote, the largest of them the Daily revert. `npm run test:lighthouse` has
**not** been run against the reverted tree — `calendar.css` is back in the
render-blocking bundle and `daily.css` is gone, so the entry stylesheet's size
has moved and only that run knows which way. **Run it before pushing.**

`docs/WHERE-WE-ARE.md` is the open work. Its first item — the Daily desktop
redesign — is now the live question, and the author has not yet given the
design.

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

**Three branches exist in the locale packs and not in the English base** —
`reasons`, `offices`, `eras`. `lib/i18n.js`'s `PACK_ONLY` is the list; a
fourth goes there and nowhere else.
