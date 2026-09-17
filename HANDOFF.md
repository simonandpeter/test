# Handoff

**State and what is in flight, and nothing else.** What the site is and what is
next are `STRUCTURE.md`; how to work here is `CLAUDE.md`. Finished work is in
the commit message — `git log --grep` searches it. `CLAUDE.md`'s "Which
document takes it" is the rule this file obeys.

**Verify anything here before you build on it**, and **read a number from the
run rather than from this file**. It was 573 lines once, nine tenths of it
narratives of finished sittings, and the trim that cut it kept a "known and
unfixed" list on the strength of its heading — one of whose four items had been
fixed three days earlier.

---

## State

`bash scripts/state.sh` is the truth about what has landed — `git status` lies
here, because a PAT push never updates `origin/main`.

- `npm test` for the unit count, `node scripts/locale-coverage.mjs` for pack
  gaps, `scripts/build-manifest.mjs` for the corpus size. None of them is
  written down here.
- **A full browser run fails about four of ~1,040 at six workers, and it is a
  different four each time.** Treat them as this desk until `--repeat-each=6`
  alone says otherwise — that comparison is what separated three real defects
  from the noise on 2026-09-15. The shelf-swipe flake is the known one and is
  the test's fault, not the page's (`STRUCTURE.md` §6).
- The PAT is at `C:\Users\matei\Documents\Agios Website Ex\update git.txt`.
  `bash scripts/push.sh` pushes and reads the CI run in one step.

---

## In flight

**Daily/Prayer design fixes against the mockup** (`../mockup-review/BRIEF.md`,
stages in `REVIEW.md` §3): stages A (Daily's full header), B (the four
columns' widths, the shelf a plain column; the saint page's two columns follow
Daily's), C (each column scrolls to its last line), D (the saint column's
picture in its own shape, the name pinned over the reading column) and E (Life /
Hymns / Writings under the picture, the whole life in column 3), F (the
day's column in the mockup's order, name days last at 13 px), G (the shelf
tile's anatomy and its press), H (one search field, `ui/search-field.js` +
`styles/search-field.css`, mounted by All Saints, Prayer and the saint page's
side column), I (Prayer's margins wear that tile, and every name opens
something past 1024 px) and J (Prayer full-bleed, the page gutter charged once
inside the columns) are done. **Every layout stage is done.**

**K — the lives' paragraphs** (`saints/*/life.md` and `docs/CORPUS.md` only):
`scratchpad/k-split.py` breaks any body paragraph over 900 characters at
sentence ends, `k-verify.py` proves every changed file identical to `HEAD`
under whitespace collapse, `k-literals.py` proves no `e2e/` prose literal is
cut. Slugs **a–e are done**; f–m and n–z remain, one batch each.

Stage I left the phone's half of its own ruling open — `STRUCTURE.md` §6 item 3.

Three `tile-diff` baselines exist. Do not re-shoot any of them.

- `shots/baseline-stage-h-before` — 8 tiles, `--still --routes=/saints,/prayer
  --widths=360,768 --themes=day,vigil --langs=en`, shot at `db73f995`.
- `shots/baseline-stageI-prayer-2026-09-18` — 4 tiles, `--still
  --routes=/prayer --widths=360,768 --themes=day,vigil --langs=en`, shot at
  `36ee2995`. **`tile-prayer-360-day-en` is a two-state tile**: shooting one
  build twice moves it by exactly 135,936 px (48.41%) and back, so a single
  changed reading of that tile is the camera. Shoot twice before calling it a
  finding.
- `shots/baseline-baseline-stageJ-gutters-before-2026-09-18` — 4 tiles,
  `--still --routes=/prayer --widths=360,768 --themes=day,vigil --langs=en`,
  shot at `0e5581d4`; after stage J all four compared identical.

**The corpus run (`scratchpad/corpus-plan.md` §5) is in Phase B.** Civil
20 September – 6 October is read for all four churches. **Civil 7 October is
read for the Russian and Serbian only; the Greek and Romanian 7 October are
next** (`day-candidates.mjs 2026-10-07` has been run; neither page has been
read beyond what it printed).
The Serbian list misses Prologue entries; read the page.

Open identities, each written into the folders: whether the Greek 30 September's
Two Women Martyrs are the two virgins the Romanian long life has die with
Gaiane; whether the Fifty Martyrs of Palestine are the Sretensky 151's burned;
Gregory of Pelshma, Michael of Kyiv (30 September), Sabbas of Vishera
(1 October), Cyprian of Soundal (2 October) and Dionysius the Recluse of the
Caves (3 October) are Greek one-liners the Russian 30 September – 3 October
(civil 13–16 October) must read before anyone calls them the Russian saints;
John Koukouzelis carries a 1118–1433 death because the Greek and Romanian pages
put him centuries apart; Zosimas the Hermit's Sretensky name page files a
second, unread life of a venerable martyr Zosimas of Cilicia beside his. The
Julian 19 September names no Tryphon, so whether the Greek 29 September's
Trophimus and Dorymedon are the 19 September martyrs stays open; the Romanian
Tryphon stands open too. Theoctistus (3 October) is one folder for the Greek
and Romanian one-liners on the day, name and rank alone; the Romanian life of
Dionysius the Areopagite calls his wife "Damar", and she is not linked to
Damaris of Athens.

From 4 October: Eusebius of Phoenicia and Priscus carry the Russian line
«Мчч. Евсевия и Приска (IV)» on day, name and rank alone (a thin call);
Ammon of the Caves and Pior the Recluse are Greek one-liners the Russian
4 October (civil 17 October) must read; Anna the Princess has no life on
saint.gr beyond a pointer to 10 February. Faustus, Gaius, Eusebius and
Chaeremon's Greek 4 October is a feast note, so that day does not render them.
Not made folders: Paul of Gortyna (saint.gr keeps him on the Sunday between
1 and 7 October, which no feast shape here holds) and Basil Nosov (on azbyka's
4 October line, not on the Sretensky day's).

From 5–7 October: Barlaam of Sikisk is a Greek one-liner (1846, "a Russian
saint") whose Russian identity is open; Charitina (5 October) and Charitina
(4 September) stay two folders, though saint.gr wonders whether they are one.
Cassian of Glyphia (Greek 16 September) is taken to be the Greek 6 October's
Alaman «Κασσιανός ο της Γλυφάς» on name and place alone, a thin call, and that
day is a feast note on his row. Feast notes also hold Macarius of Zhabyn's
Russian 22 January, Irais's Russian 23 September, Innocent of Moscow's Russian
31 March and Greek 31 March, and Stefan the First-Crowned's Russian 30 August;
those days do not render them. Vladislav of Serbia's death is 1239 with no
upper bound, labelled "after 1238", because the Sretensky life says 1239 and
its day line "after 1264". Thomas the apostle and Erotiis stand undated: no
page read gives a year. azbyka.ru prints a troparion and kontakion for Jonah
of Yashezero that were not taken.

**azbyka.ru hymns are taken for any saint a batch adds or upgrades** when
they are that saint's own (ruling widened for the 6 October sitting): the
Church Slavonic only, whole, with its tone, English rendered by the site from
the Slavonic; never the Russian gloss; a hymn to a group (the Moscow
hierarchs) is not one member's. Check azbyka for every Russian row a batch
adds, even when the Sretensky day prints hymns: Vladislav's two kontakia are
on azbyka only. The backfill of folders from before that ruling is queued
separately and is not in flight.

Latin letters inside Slavonic and Greek hymn words are written as the letters
they display as since the 3 October batches (the micro sign µ as μ since
6 October); five older Greek hymns (`mixed.py` in `.tmp/` lists them) still
carry them.

Helpers in `.tmp/`: `mk1007a.py` (Russian and Serbian, new folders and
upgrades, Sretensky hymns), `mk1007b.py` (Sretensky new-martyr lives, a group
related by the day's line), `mk1006b.py` (Greek and Romanian, hymns pulled off
the cached pages by label, an Orloff common reused, a Russian row with its
Sretensky hymns), `mk1006c.py` (a Greek group entry, with a second-day
upgrade), `up-vlad.py` (azbyka hymns into an existing folder), `azcmp.py
<azbyka-file> <slug>` (azbyka's troparia and kontakia against a folder's, NEW
or IN CORPUS), `dd.mjs <display>…` (whether a date label reads in Russian and
Greek), `azlife.py` (an azbyka life), `upgrade.py` (applies an upgrade file),
`backout.py` and `daycount.mjs <date> <slug>` (the back-out), `fetch.mjs`
(cached, polite), `txt.py` (a cached page as lines), `grbody.py` (a saint.gr
entry's body), `hfind.py` (corpus hymns by text, with their English), `att.py`
(a folder's rows), `lookday.mjs`, `grepday.mjs` and `saintpage.mjs` (the
rendered day or saint page), `qf.py <sha>` (a run's job log when
`ci-flaky.py` meets a 404). A back-out's render check greps the heading line:
a needle can also match a companion's life.

## Three things git cannot tell you

**`android/app/src/main/assets/public/` holds a built copy of the site from
2026-09-05** — before the rename and before the rebuild, so its masthead reads
"Daily Dox" and its Daily page is the week rail. It is **gitignored and
untracked**: the only copy of that state outside git, and `npm run app:sync`
would overwrite it.

**Visual baselines exist under `shots/`, which is gitignored, so nothing else
records that they are there. Never re-shoot one.**

- `baseline-before-daily-rebuild` — 16 tiles of `/saints` from before the
  rebuild.
- `baseline-new-daily-2026-09-15` — 4 tiles of `/` at 360 and 1280 in both
  themes, the rebuilt page as it stood the moment before the revert.
- `baseline-before-daily-desktop-2026-09-16` and
  `baseline-after-daily-desktop-2026-09-16` — 18 tiles either side of the
  four-column Daily desktop, plus `baseline-noise-2026-09-16`, which is the
  same build shot twice and came back identical on all 18.
- `baseline-stageA-header-before-2026-09-17` — 4 tiles of `/` at 360 and 768,
  day and vigil, `en`, before stage A; after it they compared identical.
- `baseline-stageB-cols-before-2026-09-18` — the same 4 tiles, same arguments,
  before stage B; after it they compared identical.
- `baseline-stageC-scroll-before-2026-09-18` — 4 tiles of `/` only, 360 and
  768, day and vigil, `en`, before stage C; after it they compared identical.
- `baseline-stageD-col2-before-2026-09-18` (archived as
  `shots/baseline-baseline-stageD-col2-before-2026-09-18`) — the same 4 tiles,
  same arguments, before stage D; after it they compared identical.

- `stageE-read-before-2026-09-18` — the same 4 tiles, same arguments, before
  stage E; after it they compared identical.
- `baseline-stageG-tiles-before-2026-09-18` (archived as
  `shots/baseline-baseline-stageG-tiles-before-2026-09-18`) — 4 tiles of `/`
  only, 360 and 768, day and vigil, `en`, before stage G; after it they
  compared identical.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still --routes=/,/saints,/texts   --widths=360,768,1280 --themes=day,vigil --langs=en
```

- `baseline-before-css-split` and `baseline-after-css-split` — 8 tiles either
  side of `index.css` and `saint.css` leaving the entry sheet. Two tiles differ
  between them, and the unmodified tree shot against the same baseline differs
  by the same 3,984 px on the same two, so nothing in that pair is a finding.

```bash
MSYS_NO_PATHCONV=1 node scripts/contact-sheet.mjs --still   --routes=/saints,/saints/anthony-the-great --widths=360,1280 --themes=day,vigil --langs=en
```

**`tile-saints-1280-day-en` moves by ~3,980 px between any two sittings and is
not a finding.** A 20 × 200 px strip at the carousel's left edge; the
unmodified tree shot against the same baseline moves it by exactly the same
number. Two shots in one sitting are identical, so the instrument's own floor
does not see it.

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
