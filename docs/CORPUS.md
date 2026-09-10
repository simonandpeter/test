# CORPUS — how a saint gets into this corpus

**Binding for anyone adding to `saints/`.** `CLAUDE.md` is how to work here and
`PLAN.md` is what the site is; this file is the one job neither of them
describes end to end. Read those two first — this assumes them.

It is written to be followed by someone who has read no conversation. Where it
states a rule it says what the rule cost when it was learned, because a rule
whose reason is lost gets relaxed by the next person in a hurry.

---

## 0. The one paragraph

The corpus is 862 folders, each `saints/<slug>/{saint.json, life.md, images/}`,
built by four calendars being read a day at a time and typed out by hand. Every
fact carries a citation to the page it was read from. **Nothing is generated.**
The unit of work is **one civil day, finished for every calendar that names
it**; the unit of commit is one batch; the gate is `node
scripts/corpus-gate.mjs`, and every batch ends with one back-out watched to
fail. If you are about to write a folder from something you did not read on a
page you can link to, stop.

---

## 1. How it was actually done, 20 August – 8 September 2026

Recovered from `git log` and from the amendment record the deleted
`SESSIONS.md` held (`git show 4141faa~1:SESSIONS.md`). The numbered amendments
below are that record's; they are cited because they are the reasoning, not
because the file still exists.

| when | what | how many |
| --- | --- | --- |
| 2026-08-20 | the prototype's ten saints | 10 |
| 2026-08-23 | the week of 23 August, four churches | 62 → 149 |
| 2026-08-23 | **Amendment 31** — three weeks × four churches | 149 → 708 |
| 2026-08-25/26 | the Greek harvest, then day-by-day past the runway | 708 → 742 |
| 2026-08-29 – 08-30 | **Amendments 74–83**, one civil day per sitting | 742 → 851 |
| 2026-08-31 | **Amendment 88** — eleven great names the runway had missed | 851 → 862 |

Two things in that table matter more than the numbers.

**The bulk tranche happened once and was never repeated.** Amendment 31 added
559 folders in one sitting with a per-church harvester and a `writer.py` under
`.tmp/`, none of it committed, and it did not run the browser suite. Everything
after it is **one day at a time**, because that is the rate at which a person
can read what they are writing down. Amendment 45 is where the method was
settled and it says so in its own words: *"one day, finished, rather than a
week of thin ones."*

**The temptation was priced, twice.** Amendment 2 (2026-08-20) is the oldest
rule in the repository: *"The temptation is to have an agent draft several
hundred saints overnight. **Do not.** … the model cannot tell its own confident
guesses from its sourced facts."* Amendment 43 then measured it: against the
331 saints whose Greek and English forms the corpus already held, a careful
transliterator reproduced **17**. When the author later asked for "lots more
saints", the fork was put back to them with the cost of each route stated, and
they chose eleven properly-sourced scattered saints over a longer runway.

**What is kept, and what changes.** The method above is kept whole. What
changes is that the tooling stops being throwaway: the harvesters and folder
writers of Amendments 31–45 lived in `.tmp/`, were never committed, and are
gone. Section 5 is their durable replacement. The other change is section 9 —
the e2e literals that go red are now computed and printed by the gate instead
of being found by CI seventeen minutes after a push.

---

## 2. Sources: which, why, and what each URL means

### The four calendars

These four are the corpus's spine. **One church, one calendar, one source** —
an attestation for the Russian church cites the Russian calendar, never a
Greek page's opinion about a Russian feast.

| church | calendar it keeps | source | the date in the URL |
| --- | --- | --- | --- |
| Russian | Julian | `days.pravoslavie.ru/Days/YYYYMMDD.html` | **old style** — the Julian date, thirteen days behind the civil one |
| Greek | Revised Julian | `saint.gr/MM/DD/index.aspx` | civil (= Revised Julian for a fixed feast) |
| Romanian | Revised Julian | `doxologia.ro/<D>-<luna>` | civil |
| Serbian | Julian | `pravoslavno.rs/index.php?q=citanja&datum=YYYY-MM-DD&prolog=1` | **civil**, listing that day's Julian commemorations |

Read the fourth column twice. The Russian URL takes the *old-style* number and
the Serbian URL takes the *civil* one, and both churches keep the Julian
calendar. `scripts/day-candidates.mjs` builds all four URLs from one civil date
so this is decided once rather than twelve times a sitting.

Verified 2026-09-10: `Days/20260911.html` prints Silouan the Athonite and
"Седмица 17-я по Пятидесятнице", and the 17th week after Pentecost begins on
civil 21 September 2026 — so that page is the Julian 11 September, civil
24 September. `Days/20260924.html` prints Thekla and the 19th week, which is
civil 7 October.

### Sources for a life where the calendar prints only a line

- **azbyka.ru** — the Russian church calendar's own long lives, and the only
  workable source for the twentieth-century new martyrs. `CLAUDE.md` says it
  answers 403 to Python and curl; **measured 2026-09-10, it answers 200 to
  `node`'s `fetch` with a browser user-agent**, and `day-candidates.mjs`'s
  fetcher uses one. Its `robots.txt` disallows media and archive formats, not
  the calendar.
- **oca.org** — English prose lives, already cited here. Its `robots.txt` asks
  for `Crawl-delay: 10` and the fetcher honours that. English prose keeps a
  paraphrase honest in a way a page skimmed in Greek does not, which is why
  Amendment 88 used it for all eleven of the great names.
- **Butler's *Lives of the Saints*** (bartleby.com) — public domain, and the
  corpus's source for nine Western saints the four calendars keep but do not
  describe.
- **Wikimedia Commons** — icons only, with the file page, the artist as Commons
  records them and the licence in `icon.meta.json`. 84 of the corpus's images
  came this way.

### Refused, and why the refusal stands

- **Nassar's *Book of Divine Prayers and Services* (1938).** A full English
  menaion, openly served, and refused: a 1938 American publication is public
  domain only if its copyright was not renewed, no renewal record was found
  either way, and archive.org's own record carries "This material may be
  protected by copyright law". **A licence that cannot be established is not a
  licence.**
- **Any modern translation.** A living author's work needs their permission.
  The two published renderings that may be copied are named and are both long
  out of copyright: Orloff's *General Menaion* (1899) and Hapgood's *Service
  Book* (1906).
- **Quoting a calendar's prose into a life.** The four calendar sites are
  copyrighted. A life here is a paraphrase in the house voice and closes with
  the source it was read from. The one place a source's own words are copied
  verbatim is the *attestation's* `source.text` — a short quoted calendar line,
  which is what makes the claim checkable.

### Manners

`robots.txt` is read before a new host is used at all. One request at a time,
a delay between requests to the same host (10 s for oca.org, 2 s elsewhere), a
real user-agent, and every page cached under `.tmp/day-cache/` so a re-run
costs the source nothing. Do not parallelise fetches. Nothing here needs to be
fast; the reading is the slow part regardless.

---

## 3. What "correct" means, field by field

The schema (`schema/saint.schema.json`) and the corpus tests are the real
definition. This is what the schema cannot say.

**`display_name`** — the bare name and only the name. Never a rank, never an
office, never a year; `tests/` sweeps for all three and
`scripts/draft-saint.mjs` refuses a draft that carries one. **Kinship and
companionship clauses stay** — "son of Bassa", "mother of the Theotokos", "with
28 martyrs", "disciple of Babylas". About sixty of these exist and they are how
the source names the person, not decoration. *Verified by:* the draft writer's
`RANK_WORDS` check, plus `npm test`.

**`names`** — the saint's own recorded script forms, `{form, lang}`, copied
from a source that prints them. **Never transliterated, never completed,
never guessed.** Amendment 43 is the measurement: 17 of 331. A language with no
recorded form is left out entirely rather than filled with the English, so that
"no name recorded" and "the name happens to be the same" stay different facts.
*Verified by:* `node scripts/language-audit.mjs` (0 mismatches is the standing
state), and the gate's rank-head check.

**`office`** — "Archbishop of Caesarea in Cappadocia". Its own field. Recorded
data in the corpus's English, not translated per reader.

**`types`** — the closed slug list the Index filters and `lib/honorific.js`
reads. Use a slug already in the corpus unless the source states a rank the
corpus has never held; adding one means the Index, the locale packs'
`offices`/`reasons` branches and `honorific.js`'s precedence all have to learn
it, so it is a code change in its own commit, not a corpus change.

**`attestations`** — **one row per church in the registry, always four.** A
church you did not read is `undocumented` **with a note naming the source you
did not read and the date** — that is the honest starting state and the thing
that makes a later reader able to finish the job. `venerated` and
`not-venerated` are both positive findings and both need a `source`; only
`undocumented` may stand without one. The `source.text` quotes the calendar's
own printed line, in its own language, in guillemets. *Verified by:* the schema's
`allOf`, and the gate's citations section.

**`feast`** — `{day, month, calendar}` **in that church's own calendar**:
`julian` for the Russian and Serbian, `revised-julian` for the Greek and
Romanian. This is the live trap. A Greek page's 18 September written into a
Russian row moves the saint a fortnight and nothing downstream complains.
*Verified by:* the gate's calendars section, which fails on a feast whose
calendar is not that church's default unless the feast carries a `note` saying
why.

**`rank`** (on an attestation) — the typikon rank of the service, where the
source states it. The Russian calendar prints it as an icon whose `alt` names
it; the Romanian marks its top rank with a cross. Sourced or absent.

**`dates`** — every date is an interval, and **every interval needs a `note`
quoting where the year came from**. The gate fails a stated year with no note.
A precise date has equal bounds; a null bound is a real finding ("no later than
550") and is not the same as an absent date. `basis` is `attested`,
`traditional`, `inferred` or `unknown` and an `attested` interval spanning more
than a century is a contradiction the gate refuses. Where two sources disagree,
record the disagreement as an interval and say so in the note — Vladimir
Tsedrinsky is 1918–1920, "1918 or 1920", because pravoslavie prints one and
azbyka the other. Where the calendar prints a reign rather than a year
("305–313"), that is the interval. *Verified by:* the gate; and
`node scripts/date-audit.mjs` for whether a finding is weaker than its sources
allow.

**`locations`** — coordinates only where the source names the place, always
with `uncertainty_km` (pinpoint 1, city 15, region 150, province 500).
**Amendment 86: no point beats a wrong one.** `node
scripts/place-candidates.mjs` proposes places a life already names; every row
is read before it lands, because "he was sent to Rome" is not "he died at
Rome". Adding a *located* saint also brings `tests/map-span.test.mjs` into
play: a located saint who reads as alive for more than a century fails it, and
a located saint with no dates has to go on that test's `UNDATED` list with the
reason.

**`life.md`** — the house paraphrase, one to three paragraphs, first paragraph
fit to be the Index's lede. Opens `# <display_name>` exactly. Closes with a
single italic paragraph naming and **linking** the source and saying when it
was read: `*After …[the day](https://…); read 10 September 2026.*` Where the
source has nothing, **the life says so and says what the one line says** —
padding is the failure this project exists to avoid. *Verified by:*
`tests/lives.test.mjs`, three assertions, and the draft writer checks all three
before it writes.

**`related` and links in a life** — a saint named in a life gets a hyperlink
`[Name](/saints/slug)` and a `related` row on the page whose life names them;
the reverse is derived in `build-manifest.mjs` and never stored. **A dedication
is not a relation**: a church, lavra, chapel, feast or ship named for a saint
is not an association with them. *Verified by:* `tests/life-links.test.mjs`,
which fails on a written link with no `related` row, and
`node scripts/related-from-links.mjs` (proposes; `--write` applies the read
rows).

**`hymns`** — copied whole from the cited source with the tone it prints, in
that church's own language. A hymn belongs to a church as an attestation does;
the Greek apolytikion and the Romanian tropar are different texts, not
translations of one. `english` is either a citation to Orloff or Hapgood or
`rendered: "site"`, exactly one of the two.

**`images`** — `icon.jpg` plus `icon.meta.json` with `credit`, `licence`,
`source_url`, then `npm run thumbs` for the two derivatives. The build *fails*
on a missing derivative and *warns* on an unresolved licence.

---

## 4. The failure modes, and what catches each

These are the ones that have actually happened here, or that this protocol was
written to prevent.

**1. A duplicate under a variant transliteration.** The decisive lesson.
Matching candidates by name found none of the eight saints the corpus already
held for 20 September and invented pairs instead — «Святитель Иоанн,
архиепископ Новгородский» matched a new martyr of 1937 because both begin with
Иоанн. Three of the eight would have been caught by a slug collision; **five
would have entered as silent duplicates**.

> **Dedupe on the feast date, never on the name.** And on *two* feast keys:
> the **civil day** (what this church shows on this date) and the **menologion
> number across every calendar** (does this person already have a folder).

The second key is not optional and a civil-day scan alone is not enough. On
2026-10-01 the Russian calendar's 18 September prints Eumenius of Gortyna,
Hilarion of Optina, Ariadne, Sophia, Irene and Castor. A civil-day scan reports
**zero** folders for that day. The menologion scan reports **eight** — because
the corpus holds them all on the *Greek and Romanian* 18 September, which is
civil 18 September, a fortnight away. Six of the twelve entries on that page
are upgrades, not new folders. `day-candidates.mjs` prints both scans and
labels the second **UPGRADE**.

**2. The wrong calendar.** See `feast` above. Caught by the gate; not caught by
anything else, including a rendered page, because a saint on the wrong day
still renders.

**3. A rank absorbed into a name.** Live today. The Romanian name days print
*Mărturisitor* for `sofian-of-antim` and *Împărăteasă* for
`pulcheria-the-empress`, because `stripPrefixes` in `lib/saint-name.js` walks a
list of known rank words and stops at the first word it does not know —
«Sfântul Cuvios **Mărturisitor** Sofian» loses two and keeps the third. English
is right on both. **Fourteen name forms across the corpus begin with a rank**
(`node scripts/corpus-gate.mjs`, the names section, lists them). The fix is the
strip list in `lib/saint-name.js` and belongs in **its own commit with a unit
test**, not inside a corpus batch; but a batch must not add to the count.

**4. Conflated saints who share a name and a day.** Sozon of Cyprus, the
shepherd boy of Paphos, and Sozon of Pompeiopolis, the Lycaonian shepherd
martyr, are two men the Greek keeps on 7 September, and the corpus is right to
hold both. So a shared day is **printed and never failed**: the reading is the
work. Amendment 45's near-miss in the other direction is
`luke-abbot-of-deep-streams` against `luke-of-bathys-ryax` — Bathys Ryax *is*
Deep Streams.

**5. Invented detail where the source was silent.** The one failure with no
instrument. A synaxarion that prints a line gets a folder whose life says it
prints a line; it does not get three plausible paragraphs. Where a life states
no year the saint stands Undated, even if the saint is Sergius of Radonezh —
that happened on 2026-08-30 and was left as it stood. The only defence is that
every fact has a citation you can open, which is why the `--online` gate
checks that they open.

**6. A synaxis, an icon or a feast turned into a person.** Amendment 31: a
feast, its fore- and after-feast and its leave-taking, an icon of the
Theotokos, a synaxis heading, a relic translation — none of these is a folder.
But **an enumerated synaxis is a folder for each printed name** (the Glinsk
sixteen), and a relic translation can be a folder with a feast note naming the
event (Theodosius of Chernigov). `day-candidates.mjs` marks a suspect line
`[~]`; it is a hint, never a filter.

**7. An encoding read as data.** days.pravoslavie.ru serves some pages as
windows-1251 and declares it nowhere. Decoding UTF-8 with `errors='replace'`
does not fail — it returns a page of replacement characters, and a life must
never be paraphrased from one. The fetcher tries the header's charset, then
UTF-8 **strictly**, then cp1251, and throws if none is clean. Related, from the
same family: a Latin `c` inside «cухоядение» on the same site, saint.gr's
accented iota failing `in` against an identical-looking literal, and an
ASCII-only `\b` matching nothing in Greek. **Never decode, compare or match
text in these languages without saying which encoding and which normalisation
you mean.**

**8. A batch that turns the browser suite red for a number.** Eleven saints
turned 24 browser tests red in 2026-08-31 and not one had found a defect.
Section 9.

**9. An index page mistaken for a life.** `days.pravoslavie.ru/Life/idNNNN.htm`
is an index that links on to `Life/lifeNNNN.htm`. Read as prose it yields a
column of site navigation. One more hop.

---

## 5. The tools

All of these live in `scripts/` and follow the family's rule: **propose, never
write** — with exactly one exception, which writes only what a person typed.

| script | what it does | writes? |
| --- | --- | --- |
| `day-coverage.mjs` | which civil days the corpus can fill, per church, and the reach | no |
| `day-candidates.mjs` | fetches a day from a calendar; lists its entries; says what the corpus already holds, by civil day **and** by menologion number | no |
| `draft-saint.mjs` | writes folders from a draft file a person typed; dry run by default; `--undo` | **yes, on `--write`** |
| `corpus-gate.mjs` | schema + `npm test` + duplicates + names + citations + calendars + the e2e literals | no |
| `corpus-index.mjs` | the shared reader and the two feast indexes | no |

And the ones that already existed and are part of this job:
`validate.mjs`, `build-manifest.mjs`, `date-audit.mjs`, `language-audit.mjs`,
`link-coverage.mjs`, `related-from-links.mjs`, `life-links.mjs`,
`place-candidates.mjs`, `track-candidates.mjs`, `cross-link-audit.mjs`,
`locale-coverage.mjs`, `new-saint.mjs` (scaffolds one empty folder).

---

## 6. The loop

One civil day, finished for every calendar that names it. About four hours of
it is a batch; see section 10 before planning a longer one.

**1 — choose the day.**

```
node scripts/day-coverage.mjs --from 2026-09-29 --days 30
```

Take the first day that is empty or thin. Work forward; the Daily page's reach
is what the runway buys.

**2 — read the day.**

```
node scripts/day-candidates.mjs 2026-10-01 --json .tmp/cand-2026-10-01.json
```

Then **open every URL it printed and read the page yourself.** The script's
extraction is best-effort and its `[~]` marks are hints. Two lists come out of
this reading:

- **new folders** — a person the corpus has no folder for;
- **upgrades** — a person the corpus holds under another calendar's day, who
  needs a row, a name form and possibly a date on the folder that exists. The
  UPGRADE block is where these come from, and on a mature day they are the
  majority. On 2026-09-23 twelve of thirty-two were upgrades.

**3 — read each person's life.** Follow the `Life/lifeNNNN.htm`, the
`/NNNN/saint.aspx`, the doxologia page. If there is no life, the folder's life
says so. Do not fill.

**4 — write the draft file**, one JSON object per saint, by hand.
`scripts/draft-saint.mjs`'s header has the shape. Every year, every place,
every name form comes off a page you have open.

**5 — dry run, read the output, then write.**

```
node scripts/draft-saint.mjs .tmp/batch-2026-10-01.json
node scripts/draft-saint.mjs .tmp/batch-2026-10-01.json --write
```

Warnings (`?`) are for reading; problems (`!`) refuse to write.

**6 — apply the upgrades by hand** to the existing folders: the new
attestation row with its quoted source, the name form the calendar prints, a
date the other calendar printed and this one did not, and a paragraph appended
to the life with the new source folded into the source line.

**7 — the gate.**

```
node scripts/corpus-gate.mjs --batch 2026-10-01 --online
```

Green is necessary, not sufficient. Read its last section (§9).

**8 — render and look.** `npm run dev`, then the day in each affected church
and language. Amendment 79's second half was found this way: six upgrades
printed "Undated" over a Russian line that dated them.

**9 — the back-out.** See §8.

**10 — commit and push.** One batch, one commit. The message says the day, the
counts before and after, what was an upgrade rather than an arrival, what was
deliberately *not* made a folder and why, and what the back-out was.

```
git add saints
git commit
bash scripts/push.sh
```

Then read the run's **conclusion and its `flaky` line**, per `CLAUDE.md`.

---

## 7. Batch size and rhythm

**A batch is one civil day, or twelve folders, whichever is smaller.** Both
halves matter: a day is the unit that can be checked against a single source
page, and twelve is about as many as can be read in one sitting without the
last four being worse than the first four.

**One batch, one commit, and never two batches in one commit.** The whole
revert story rests on it: `git revert <sha>` takes out exactly one day's work,
and `node scripts/draft-saint.mjs --undo <batch> --write` takes it out before
the commit. `--undo` refuses any folder whose `saint.json` has changed since it
was written, because a folder somebody has since edited is no longer that
batch's to remove.

**Push every batch.** A day of unpushed batches is a day of unknown CI state,
and `main` going red on batch six with five unreviewed batches under it is the
expensive shape.

---

## 8. The back-out

**Every batch ends with one deliberate back-out, run and watched to fail.**
This is the corpus's own version of the house rule that a fix gets a test
backed out and confirmed to fail. It is what proves the batch changed what it
claims to have changed.

Take one thing the batch added and remove it — the usual choice is a single
attestation row set back to `undocumented`. Then rebuild and check that the
saint vanishes from that church's day and *only* from it:

```
# Amendment 45's own back-out
# john-of-novgorod's Russian row -> "undocumented"
npm run build:manifest && npm test
# he vanishes from the Russian 20 September; the Greek and Romanian stand
git checkout saints/john-of-novgorod/saint.json
```

Record in the commit message what was backed out and what failed. A back-out
that does not fail means the batch is not doing what its message says.

---

## 9. What goes red when the corpus grows

`PLAN.md` section 5: *tests must not name instances*, and 85 hard-coded slugs
and dates still live in the e2e specs. Until they are derived, **a batch that
moves one of these numbers has to move the literal in the same commit.** The
gate computes all eight from the folders and prints them beside the literal
each spec currently holds, so this is caught in two seconds rather than by CI
in seventeen minutes.

| where | what it counts | literal on 2026-09-10 |
| --- | --- | --- |
| `e2e/index-controls.spec.js:69,261` | Romanian venerated | `160` |
| `e2e/index-controls.spec.js:130` | dated lives overlapping 240–460 | `219` |
| `e2e/index-controls.spec.js:132` | …entirely within it | `205` |
| `e2e/index-controls.spec.js:160` | 1396–1400 must match **nobody** | `0` |
| `e2e/index-controls.spec.js:215` | the undated tray | `126 undated` |
| `e2e/index-controls.spec.js:229` | a search for "hermit" | `10` |
| `e2e/index-controls.spec.js:317` | feasts in the church's own January | `6` |
| `e2e/daily-panel.spec.js:2479` | "the corpus reaches 28 September 2026" | the date |

The last one moves the moment a folder lands past 28 September, which is
exactly where the runway continues — **expect to edit it in almost every
batch.** The empty range at 1396–1400 is five years wide and is the fourth
window that test has used; a dated life running through it moves the test, and
the comment there says so.

What is already derived and needs nothing: `CORPUS`, `VENERATED`,
`venerateUnion()`, `TRACKED` and `NO_RU_NAME` in `e2e/helpers.js`, and the
coverage figures on the About page.

Also watch: `tests/map-span.test.mjs` (a located saint alive over a century, or
located and undated), and `tests/lives.test.mjs` (all three life rules).

---

## 10. What must never be automated

Not "should not". These are the steps where a machine cannot tell a guess from
a fact, and where the whole value of the corpus is the difference.

1. **Choosing that an entry is a person.** A feast, an icon, a synaxis heading,
   a relic translation, an enumerated synaxis — the calendar's own words do not
   settle it and a regex never will.
2. **Deciding that two entries are one person, or two.** Sozon and Sozon.
3. **The English display name.** It is a chosen form and usually carries an
   epithet the source language never prints. 17 of 331.
4. **Any name form in any language.** Copied from a source that prints it, or
   absent.
5. **The life.** A paraphrase of something read, in the house voice, or the
   admission that the source says one line.
6. **Any year.** Off the page, with the page's words in the note.
7. **Any coordinate.** No point beats a wrong one.
8. **A `related` row.** A dedication is not a relation, and the tool that
   proposes them proposes; the reading is the work.
9. **Deciding a licence.** If it cannot be established it is not one.

What *is* safe to automate, and is: fetching and decoding a page, building the
URL from a civil date, the two duplicate scans, the schema, the folder and file
layout, the slug, every check in the gate, and the arithmetic in §9.

---

## 11. The rate, and what limits it

Measured off the record of the nine day-batches of 2026-08-29 to 08-31, which
are the only sittings run at this standard with the counts written down:

| day | new folders | upgrades |
| --- | --- | --- |
| 21 September | 4 | 0 |
| 22 September | 36 | 7 |
| 23 September | 20 | 12 |
| 24 September | 10 | 8 |
| 25 September | 9 | 4 |
| 26 September | 8 | 14 |
| 27 September | 4 | 0 |
| 28 September | 19 | 8 |
| **median** | **~10** | **~8** |

A sitting was one civil day. The 36-folder day was an afterfeast of thin
new-martyr lines, most of which carry only the calendar's own sentence; the
four-folder days were Great Feasts, where the calendar is mostly feast.

**At this protocol's standards, eight hours is two to four civil days: roughly
20–45 new folders, plus a comparable number of upgrades.** The honest centre is
**about 30**, and a day whose entries all have long written lives will come in
under 15.

**The limiting factor is reading, and it is not close.** The fetch is seconds
and the gate is two minutes. What costs is: opening each entry's life page and
reading it; deciding whether an entry is a person; deciding whether it is a
person the corpus already has under another calendar's day; choosing an English
form; writing a paraphrase that says only what the source said; and finding the
year in the page's own words. None of that gets faster with more tooling,
because the tooling's job is to make sure the reading happened, not to replace
it.

**Do not treat 30 as a target.** The rate that matters is the one at which
every folder in the batch would survive somebody opening its citations. If a
day is going slowly it is because it is a day with long lives on it, and the
right response is to finish fewer days, not to write thinner folders.
