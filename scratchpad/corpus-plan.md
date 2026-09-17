# Corpus plan — the six months 2026-09-17 .. 2027-03-16

Written 2026-09-16 against `f590b24` (tree clean when read). A plan, not a batch: nothing here was fetched or written to `saints/`.
Marks: **[M]** measured (file opened or command run), **[I]** inferred, **[U]** unverified.

**The author's ask:** "farm for more saints from calendars, try to get the next 6 months if possible. And that's with English hymn translations as well, and Related to hyperlinks and connections."

## 0. The answer

- Six months is **not one night's work. It is roughly 45–85 eight-hour sittings, centre ~60** [I, §4]. At one sitting a night that is about two months.
- `docs/CORPUS.md` is binding, and it disagrees with the word "farm" in three places. In each case this plan follows CORPUS.md:
  1. **Nothing is generated.** Every person, name form, year, place, life and `related` row is read off a page and typed (§0, §10) [M].
  2. **A batch is one civil day or twelve folders, whichever is smaller.** Each batch is one commit and is pushed (§7) [M].
  3. **The bulk tranche was done once and never repeated** (§1) [M]. Last time the author asked for "lots more saints", the choice between routes was put back to them. That precedent applies here (§4 below).

## 1. Coverage now

**The instrument already exists, so no new script was written.** It reads only the folders, writes nothing and fetches nothing [M, header]:

```
node scripts/day-coverage.mjs --from 2026-09-17 --days 181            # every day, four church columns
node scripts/day-coverage.mjs --from 2026-09-17 --days 181 --thin 3   # only the empty and thin days
node scripts/day-coverage.mjs --from 2026-09-17 --days 181 --church greek
```

Quote its numbers, not this file's. What its output shows in shape at `f590b24` [M, run]:

- **17–20 Sept:** all four churches hold folders, except the Serbian 20 Sept.
- **21–28 Sept (the runway's end):**
  - Russian and Romanian are filled. The Russian 27th is empty: the Exaltation, a feast.
  - **Greek and Serbian are empty.** The 08-29/30 day-batches read only Russian and Romanian. `673fd3b`'s message counts only those two [M].
- **29 Sept – 16 Mar:** almost every day is empty in all four columns.
  - The exceptions are a handful of thin days in Nov–Feb, mostly January.
  - These are the "eleven great names" of `8dbd9c2`, which carry Russian rows only [M, commit body]. For the other three churches they are upgrades waiting to happen.
- **The reach** printed by the script and by `corpus-gate.mjs` is 28 Sept 2026 [M].

**The Julian offset comes from code, not memory.** `scripts/corpus-index.mjs` `churchDate()` converts through JDN using the church's `default_calendar` from `src/data/churches.js` [M]:

| church | calendar |
| --- | --- |
| russian, serbian | `julian` |
| greek, romanian | `revised-julian` |

The script prints each church's own date beside the civil one. Civil 2026-09-29 is `r16/09 s16/09` [M, output].

Two consequences:
- Across this window the Julian columns cover menologion 4 Sept .. 3 Mar, and the Revised-Julian columns cover 17 Sept .. 16 Mar [M, output first/last rows].
- **Every fixed-feast person in the window turns up twice, thirteen civil days apart.** The first meeting makes a folder; the second is an UPGRADE (CORPUS §4.1) [I].

**What the script does not see: moveable feasts.** `onCivilDay` indexes fixed feasts only, and no folder uses a `paschal` feast [M, grep = 0 files].
- Julian Pascha 2027 is 2 May, from `src/lib/computus.js` `pascha('julian', 2027)` [M]. Pascha−70 (the Triodion opens) is therefore 21 Feb 2027, and Cheesefare Saturday is 13 Mar [I, arithmetic].
- Those are feasts, not folders (§4.6).

## 2. Sources

### Calendars — one church, one calendar, one source (CORPUS §2) [M]

| church | source | date in URL |
| --- | --- | --- |
| Russian | `days.pravoslavie.ru/Days/YYYYMMDD.html` | **Julian** (old style) |
| Greek | `saint.gr/MM/DD/index.aspx` | civil |
| Romanian | `doxologia.ro/<D>-<luna>` | civil |
| Serbian | `pravoslavno.rs/index.php?q=citanja&datum=YYYY-MM-DD&prolog=1` | **civil**, listing the Julian commemorations |

`node scripts/day-candidates.mjs <civil date> [--json .tmp/cand-<date>.json]` builds all four URLs, fetches them one at a time, caches under `.tmp/day-cache/`, and prints both duplicate scans [M, header + CORPUS §5].

### Lives where the calendar prints only a line [M, CORPUS §2]

- **azbyka.ru** — `node fetch` with a browser user-agent.
- **oca.org** — `Crawl-delay: 10`.
- **Butler** on bartleby.com — public domain; for Western saints.
- **Wikimedia Commons** — icons only.

### English hymns — the ask's second clause

- **Allowed citations:** Orloff's *General Menaion* (1899) and Hapgood's *Service Book* (1906), both public domain [M, CORPUS §2 and the schema `$comment`].
  - **Orloff is exhausted for troparia, not for kontakia** (§3). His kontakia have never been matched, so a new saint's kontakion should be checked against him first [M].
  - Hapgood holds only the fixed services and great feasts [M].
- **Refused:**
  - Nassar (1938): the licence cannot be established [M].
  - **Any modern translation** [M]. [I] That includes the English troparia printed on oca.org, which is the obvious place a hurried batch would copy from. oca.org's lives may be *paraphrased*; its hymn English may not be *copied*.
- **`english.source` vs `english.rendered: "site"`** — exactly one of the two, never both and never neither (schema `oneOf`) [M]:

  | field | what it means | when |
  | --- | --- | --- |
  | `source` | somebody else's published rendering, copied with its citation | Orloff/Hapgood only |
  | `rendered: "site"` | this site's own translation of the text beside it | the default for everything else |

  - `rendered: "site"` is allowed because the author reversed the no-invention rule **for hymns alone** on 2026-09-07 [M, schema `$comment`]. The saint page prints the difference [M].
  - It is typed by a person or agent into a work file. **No machine translation is invoked** [M, `hymn-english.mjs` header].
- **`english` is optional in the schema** [M: `required` is church/kind/lang/text/source]. The author's standing order is "ALL HYMNS TRANSLATED. No double ups" [M, `hymn-english.mjs` header]. So a batch that lands a hymn lands its English in the same commit.
  - [M, one-off count] Every hymn in the corpus carries `english` today.
  - `node scripts/hymn-english.mjs --emit` is the check that a batch left none without it.
- **Hymn originals** are copied whole, with their tone, in the church's own language. A text that does not construe is the source's reading: check the page before touching it (§3, the twenty "source confirms") [M].
  - `scripts/hymn-wrong-saint.json` is the hold list for misfiled hymns [M, exists].

## 3. What one saint costs

| field | sourced / derived | needs a human-grade reading | never automated (§10) |
| --- | --- | --- | --- |
| `slug` | derived (`slugify`) | no | — |
| `display_name` | chosen English form, bare name (kinship clauses stay) | **yes** | **yes** (§10.3) |
| `names[]` | copied script forms, never transliterated | **yes** | **yes** (§10.4) |
| `office`, `types` | sourced; `types` from the existing slug list only | yes | a new type is a code commit |
| `attestations[4]` | four rows always; `venerated` rows carry `source.text` quoted in guillemets; `undocumented` rows carry a note naming the unread source and date | **yes** | deciding the entry is a person (§10.1), and one person or two (§10.2) |
| `feast` | that church's own calendar | yes | the gate checks it |
| `rank` | sourced or absent | light | — |
| `dates` | interval + `note` quoting the page + `basis` | **yes** | **yes** (§10.6) |
| `locations` | only where named, with `uncertainty_km` | **yes** | **yes** (§10.7) |
| `life.md` | paraphrase, 1–3 paragraphs, closes with a linked, dated source line; or says the source has one line | **yes** — the whole cost | **yes** (§10.5) |
| `related` | the life names them, and not as a dedication | **yes** | **yes** (§10.8) |
| `hymns[]` + `english` | copied original; Orloff/Hapgood or the site's own rendering | yes (translation) | licence decision (§10.9) |
| `images` | Commons + `icon.meta.json` + `npm run thumbs` | licence | **yes** (§10.9); keep out of day batches |

[M, CORPUS §3/§10; schema.] Safe to automate [M, §10]: fetch and decode, URL building, both duplicate scans, schema, layout, slug, the gate, and the §9 arithmetic.

**`draft-saint.mjs` is the only writer** [M, header]:
- dry run by default; `--write` records the batch in `.tmp/corpus-batches/`
- `--undo <batch> --write` refuses folders edited since
- It composes nothing.

### The rate — what the record shows

- **CORPUS §11** [M]:
  - one sitting = one civil day
  - ~10 new folders (median) and ~8 upgrades a day
  - an 8-hour sitting at standard = 2–4 civil days, ~30 new folders, "a day with long lives under 15"
  - "Do not treat 30 as a target."
- **Git** [M, `git log --since 2026-08-28`]:
  - The day-batches `01324b1` … `bbb3dd4` were committed 08-29 23:07 → 08-30 05:06: nine civil days, ~110 folders.
  - `673fd3b` → `0fa06af` took 2 h 40; the next five came ~15 minutes apart.
  - **That git rate overstates the correct rate.** [M] Those batches read two churches, not four. [M] The September commits then re-read dozens of their thin lives from azbyka: `c889e20` "last twenty-eight thin Sretensky lives", `8914cc3` "eighty-nine short Sretensky lives tried", `fe94a3a`, `2eb7fd6`. [I] The later, fast batches were thin lives that §5's standard later sent back.
- **Planning rate:** **~3 civil days per 8-hour sitting, all four churches**. That is about **25–30 new folders plus a comparable number of upgrades** [I, §11 adjusted for four churches]. A day of long lives runs slower; do not shorten the reading to hold the rate.
- If "one sitting" means CLAUDE.md's "one item a session" (one civil day), multiply the sitting counts below by three [I].

## 4. Six months, honestly

- **Days:** the window is 181 civil days. The runway's first twelve are Russian/Romanian-complete and need Greek/Serbian only. **~169 days need all four churches** [I, arithmetic plus the §1 output].
- **Saints:** the corpus cannot count this; only the calendars can. At §11's median of ~10 new folders a day, the gap is **~1,700 new folders**, plausibly 1,000–3,000, **plus a similar number of upgrade rows** on existing and newly made folders [I].
  - Upgrades rise as the window fills, because the Julian half re-meets the Revised-Julian half 13 days later [I].
- **Sittings:** 169 days ÷ 2–4 days per sitting = **~42–85, centre ~57** [I].
- **Batches and CI:** at least one batch per day, more wherever a day exceeds 12 folders (the 22 Sept precedent held 36). That is **≥170–250 commits**, each pushed and read at ~17 min of CI (CLAUDE.md) — **50–70 hours of CI wall time** [I].
  - `push.sh --no-wait` lets reading continue while CI runs, but each run must still be read before the next push lands on red [M, CLAUDE.md].
- **The fork to put back to the author before starting** (the 2026-08-31 precedent, CORPUS §1) [I]:
  - **(a) The runway:** go forward day by day from 29 Sept. This is CORPUS §6's default. Six months takes ~two months of nights; each sitting extends the reach by ~3 days.
  - **(b) The great names first:** the scattered fixed feasts of Oct–Mar the calendars rank highest, each four-church, then the runway.
    - This is the route the author chose last time, and it gives every month something sooner.
    - Its cost: the Daily page stays empty on most days for longer.
  - Either way, **do not pad** by making folders thinner than §3 requires.

## 5. Batches — nearest first

Each **batch** = one civil day (or ≤12 folders), one commit, one push. Each **sitting** ≈ 3 batches. Expected counts are [I], from §11's range (4–36 new, median ~10) until `day-candidates.mjs` prints the day.

### Phase A — finish the runway's end (Greek + Serbian only)

| sitting | civil days | churches | expected | note |
| --- | --- | --- | --- | --- |
| A1 | 20–22 Sept | Serbian 20–22, Greek 21–22 | Greek mostly new; Serbian mostly UPGRADE (the Russian folders already hold Julian 7–9 Sept) | Russian/Romanian untouched |
| A2 | 23–25 Sept | Greek, Serbian | as A1 | |
| A3 | 26–28 Sept | Greek, Serbian | as A1; the Russian 27th is the Exaltation | |

### Phase B — past the reach (all four; heavy UPGRADE share on the Julian columns)

| sitting | civil days | expected |
| --- | --- | --- |
| B1 | 29 Sept – 1 Oct | ~30 new, many upgrades |
| B2 | 2–4 Oct | ~30 new |
| B3 | 5–7 Oct | ~30 new |
| B4 | 8–10 Oct | ~30 new |
| B5 | 11–13 Oct | ~30 new |

- **B1's first batch moves the reach**, which no spec and no gate literal holds any more (§5.2).
- Julian Sept 16–30 = civil 29 Sept – 13 Oct. The Revised-Julian 16–30 Sept is already in the corpus, so the Russian/Serbian rows here are largely upgrades [I, CORPUS §4.1's 1 Oct example].

### Phases C–E

| phase | civil days | sittings | notes |
| --- | --- | --- | --- |
| C | 14 Oct – 30 Nov | ~16 | Russian 14 Oct = Julian 1 Oct (Protection) [U, feast date from memory] |
| D | 1 Dec – 13 Jan | ~15 | Nativity and Theophany cycles, heavy feast days [U]. Russian day records (readings) stop 13 Jan 2027 and the Romanian stop at the end of 2026 [M, `daily-panel.spec.js:1935–1944, 2516`]; saints still land [I] |
| E | 14 Jan – 16 Mar | ~21 | Triodion from 21 Feb (moveable feasts are not folders) |

**Sources for every batch:** the four calendar pages for the day; then the life pages they link (pravoslavie `Life/lifeNNNN.htm` — not the `idNNNN` index, §4.9 — `saint.gr/NNNN/saint.aspx`, doxologia); azbyka/oca/Butler for thin lines; Orloff for kontakia.

### 5.1 Verification per batch — run in this order

1. `node scripts/draft-saint.mjs .tmp/batch-<day>.json` (dry) → read `?` and `!` → `--write`
2. Apply the upgrades by hand, plus the `related` edits to existing folders (§6).
3. `node scripts/hymn-english.mjs --emit` → fill the work file → `node scripts/hymn-check.mjs <work.json>` → `--write <work.json>`; `--emit` then prints nothing for this batch.
4. `npm run build:manifest` — fails on schema, slug/folder mismatch, duplicate slug, unregistered church, a feast absent from its calendar, a missing text/image/derivative/meta, or **a `related` slug with no folder**. Warns on unlocated places and unresolved licences [M, `build-manifest.mjs:122–262`].
5. `npm test`, including:
   - `tests/corpus-break.test.mjs` — **a new slug containing a hyphen and ≥8 characters that also appears in `src/` outside a comment fails it** [M]; name slugs away from code identifiers [I]
   - `lives.test`, `life-links.test` (a written link with no `related` row), `map-span.test`, `saint-name.test`
6. `node scripts/language-audit.mjs` (0 mismatches), `node scripts/date-audit.mjs`, `node scripts/cross-link-audit.mjs` and `node scripts/related-from-links.mjs` (§6).
7. `node scripts/corpus-gate.mjs --batch <id> --online` — schema, `npm test`, duplicates, names, citations, calendars and its e2e literal table.
8. `npm run dev` and look at the day in each affected church and language (DOM and screenshots only; CLAUDE.md trap 17).
9. The back-out (§8): one row set to `undocumented`, rebuild, watch the saint vanish from that church's day only, restore. Record it in the commit.
10. One commit, `bash scripts/push.sh`, then read the conclusion **and** the `flaky` line.

Where a literal moved, also run `npm run build && npm run test:e2e` for those specs.

### 5.2 E2E specs that read the corpus — literals new saints will break

**Printed by `corpus-gate.mjs` (`EXPECTED`, lines ~306–318)** [M]:
- `e2e/index-controls.spec.js:69,261` — Romanian venerated
- `:130` and `:132` — 240–460 overlaps / within
- `:215` — undated tray
- `:229` — "hermit"
- `:317` — the church's own January. **Phase D/E adds January feasts, so expect this one to move** [I]

**Derived since the commit after this plan's own** [M]: the reach sentence and the two bare-day notes in `daily-panel.spec.js` (the day's folders are withheld from the manifest the page is served, and the reach is worked out from the manifest), the Nicomedia, Constantinople and Kyiv Caves crowds in `map.spec.js`, and the legendary facet in `index-grid.spec.js`. Constantinople's under-the-cap test still pins the city and fails by name if a batch takes it past 8. Still literal: `e2e/saint.spec.js:345,366,1497` — hymn counts on `adrian-of-nicomedia` and `anthony-of-the-caves`, which move only if an upgrade adds hymns to those two [I]. Also still literal, and moved only by a saint who takes a day's hero or a name-day row: the heroes named on fixed days in `daily-panel.spec.js` (Sozon on 20 Sept Russian, Zacharias on 18 Sept Serbian, and older days outside the window), the nine name days on 25 Sept Russian in `daily-register.spec.js`, the one Serapion link on 20 Sept there, and the one hymn each on `eustathius-the-great-martyr` in `saint.spec.js` [M lines, I for when].

**Already derived, nothing to do:**
- `e2e/helpers.js` `CORPUS`, `VENERATED`, `venerateUnion`, `TRACKED`, `NO_RU_NAME`, `keptOn`, `ICONED` [M, exports]
- `EMPTY` (2026-08-20) and `POPULATED` (2026-01-30) fall outside the window [M]


## 6. Related-to connections

- **Data** [M: schema, `build-manifest.mjs:260–320`, `views/saint.js:1205–1230`, CORPUS §3]:
  - `saint.json` `related`: an array of slugs, **one direction only**, stored on the saint **whose life names** the other.
  - The reverse is `mentionedIn`, computed in `build-manifest.mjs` by `reverseRelated()` and **never stored**. Never write the reciprocal by hand.
  - The saint page shows one "Related to" list: `related ∪ mentionedIn`, deduplicated.
- **Sourced vs guessed** [M, CORPUS §3 and §10.8; `related-from-links.mjs` header]:
  - A relation is **sourced** when the life, itself a paraphrase of a cited page, names the person *as a person*: family, fellow martyr, teacher or disciple, cellmate, the same synaxis.
  - **A dedication is not a relation**: a church, lavra, chapel, feast or ship named for a saint. 23 of the first 86 prose links were dedications.
  - A written `[Name](/saints/slug)` link is tier 1. The prose tiers are proposals, and `--write-loose` is never run unread.
- **How links fire** [M, `src/lib/cross-link.js`]:
  - **Display-name index** over the whole manifest: the name cut at the first comma or bracket, at least two words, no Roman numerals. **A form two saints share links to neither** (rule 4).
  - **Surname index**, only among the page's related cards (both directions): a display name shaped `Given (Surname)` matches "Given (Surname)" and "Given Surname". A bare given name never links.
  - For a new twentieth-century martyr's surname to link in a companion's life, **the pair must be related in at least one direction** [M, `saint.js:1215` feeds `linkSaintNames`].
- **What a batch agent does for new saint X and existing saint Y** [I from the above; each step is a reading]:
  1. **X's life names Y** → write `[Y](/saints/y)` in X's life and `y` in X's `related`. Y's page gains X through `mentionedIn`. No edit to Y.
  2. **Y's existing life names X** (unlinkable until X existed) → edit Y: add the link in `life.md` and `x` to Y's `related`.
     - It is part of this batch's commit, listed as an upgrade. `life-links.test` enforces link ↔ row.
     - Such a folder is then outside `--undo`'s reach, which is correct.
  3. After `npm run build:manifest`, run **`node scripts/cross-link-audit.mjs`** and **`node scripts/related-from-links.mjs`**. Read every row that names a new slug: X's display name may now auto-link inside 862 existing lives, and a wrong person there is a claim that two people are one.
  4. **Rule-4 collision:** if X's matchable name equals an existing saint's, both links go silent. Diff `cross-link-audit.mjs` output before and after the batch, and choose X's display name from the source's own disambiguation, never an invented one.
  5. `node scripts/link-coverage.mjs --isolated` lists new folders that have no link in either direction. That is a work list, not a quota.

## 7. Risks

1. **Duplicates under variant names** (§4.1) — dedupe on civil day **and** menologion number; `day-candidates.mjs` labels UPGRADE. Worst in phases B–E, where every Revised-Julian person reappears 13 days later on the Julian side [I].
2. **Wrong calendar in `feast`** (§4.2) — caught only by the gate.
3. **Rank absorbed into a name** (§4.3) — the gate's names count must stay at its held-out rows. A strip-list fix gets its own commit.
4. **Conflation** (§4.4) — a shared name and day is printed, never failed.
5. **Invented detail** (§4.5) — no instrument. `--online` checks the citations open.
6. **Feast, synaxis or icon made a person** (§4.6) — `[~]` is a hint.
7. **Encoding** (§4.7) — pravoslavie serves undeclared cp1251. The fetcher throws rather than replaces.
8. **Suite red for a number** (§4.8) — see §5.2. The gate's table is incomplete [M].
9. **Index page read as a life** (§4.9).
10. **Rate pressure** — the ask invites the 08-30 pace, which the September re-reads show was too thin [I, §3].
11. **Hymn copyright** — only Orloff/Hapgood may be cited. The OCA's English troparia are modern and may not be copied. Site renderings are marked `rendered: "site"`. Originals are copied whole from the calendar page per §3 [M rule; U whether the calendar sites' hymn texts carry their own claims].
12. **Image licensing** — the build only *warns* on an unresolved licence [M]. Keep icons out of day batches, in a separate pass with `icon.meta.json` and `npm run thumbs`.
13. **Manifest weight** — `data/manifest.json` grows linearly with folders and is fetched on boot [M, `download-limiter.spec.js:60–76`].
    - `screenful-bytes.mjs` gates only saint pictures (`PICTURE_BUDGET`) and **deliberately does not gate the manifest total** [M, `:59`, `:179–185`]. So nothing fails as the corpus doubles or triples; Lighthouse FCP on throttled 4G is the gate that would notice [I].
    - Measure raw and gzip bytes before and after each phase: `node -e "const z=require('zlib'),b=require('fs').readFileSync('data/manifest.json');console.log(b.length,z.gzipSync(b).length)"`.
    - `npm run test:lighthouse` once per phase.
14. **All Saints first paint** — CLAUDE.md records All Saints packing every caption in one blocking task, the cause of the carousel flake [M]. That cost scales with the corpus. Expect `index-carousel.spec.js` flakes to rise; measure with `--repeat-each=6` before blaming the known flake [I].
15. **CI volume** — ≥170 pushes at ~17 min. A red run under several unread batches is the §7 shape to avoid.
16. **`corpus-break.test.mjs` slug collision** with an identifier in `src/` [M mechanism; I likelihood low].
17. **Day records end mid-window** — Russian 13 Jan 2027, Romanian end-2026. Saints landing past those dates show without readings. Not a corpus defect, but the reader will see it [M, spec text; I display].
