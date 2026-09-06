# The hymns, the cross-links, and Continue reading — a plan

Written 2026-09-07 against the author's instruction: troparion and kontakion in
English for John the Long-Suffering, Moses the Hungarian, Anthony of the Kyiv
Caves and Theodosius, then across the corpus; every saint named in a life
hyperlinked and carried into that saint's `related`; and Continue reading at the
foot of every saint page on a phone. And: "write up a plan or a formula or
something so that this process can be made as efficient as possible on token
usage."

This is that. **Read the two counted facts before the plan**, because one of
them makes part of the instruction unreachable as written and the author has to
decide what to do about it.

## The state, counted

- **862 saints, 140 with any hymn, 427 hymn objects.** A hymn belongs to a
  church, so one saint routinely carries four: Russian 143 (Church Slavonic),
  Greek 149, Romanian 117, Serbian 18.
- **256 troparia, 171 kontakia.**
- **39 carry an English rendering. All 39 are troparia. No kontakion has one.**
- Every one of the 39 comes from **Orloff, *The General Menaion*, 1899** or
  **Hapgood, *Service Book*, 1906** — the two books settled on in Amendment 44
  because they are unambiguously public domain.

## The rule that binds, and where the instruction meets it

`schema/saint.schema.json` states the contract in its own words: `english` is
"a published English rendering of this same hymn, where one exists in a source
this site may copy … **Not a translation made here — Amendment 2 forbids
that** — and not a different church's hymn: the same text, rendered, with its
own citation."

Two consequences, and they are the whole difficulty:

1. **Nothing here may translate a hymn.** Not the Slavonic, not the Greek.
   Amendment 2 is the corpus's oldest rule and it is why this site can say what
   it says.
2. **A rendering must be of *that church's own text*.** The Greek apolytikion
   and the Romanian tropar are different hymns, not translations of one, so an
   English text found for the Slavonic cannot be lent to either. Orloff and
   Hapgood are both of the Slavonic tradition. **That leaves the 149 Greek and
   117 Romanian hymns — 62% of the corpus's hymns — with no public-domain
   source at all that this plan has found.**

So "ensure they have kontakions and troparions in English" cannot be finished.
It can be advanced a long way, and the honest shape of that is below.

**The author's decision is needed on one point only** (everything else proceeds
without it):

- **(a) Stay inside the rule.** Do the reachable work below; the Greek and
  Romanian hymns stay in their own languages, and the saint pages say so.
  Recommended, and it is what the site already promises on the About page.
- **(b) Widen the sources.** Name a modern translation the site may use — the
  OCA's, Jordanville's, Fr Ephrem Lash's — which needs the rights-holder's
  permission. That is the author's to obtain, not a build's to assume.
- **(c) Reverse Amendment 2 for hymns.** Translate here, marked as this site's
  own rendering rather than a citation. This changes what the corpus claims and
  should be recorded as a reversal, not absorbed.

## The reachable work, in order of value per token

### 1. The kontakia have never been matched at all — start here

Orloff prints **a kontakion in every one of his twenty-seven general
services**, and no kontakion in this corpus carries an English rendering. The
troparion pass of Amendment 44 simply never had a second half. This is the
largest licit gain available and needs no new decision, no new source and no
web fetching.

**The formula** (one script, one reading, no per-saint lookups):

1. The 39 existing matches are the training set. Each one pairs a Church
   Slavonic text already in the corpus with the Orloff service it came from —
   so **the corpus already knows the canonical Slavonic of each general hymn**.
   Extract it: `slavonic → (orloff chapter, kind)`.
2. For every Russian hymn with no `english`, normalise (case, punctuation, the
   Slavonic titlo and accents, whitespace) and compare against those canonical
   texts.
3. **Whole-text equality only. Never an opening match.** Amendment 44 rejected
   Gleb, Mitrophan of Voronezh and Pitirim of Perm for exactly that: their
   propers are *modelled* on the common hymn and open with its very words
   before going their own way. An opening-words rule would have lent all three
   an English text that says something their Slavonic does not.
4. The kontakia have no training set, since none has been matched. So the
   canonical Slavonic for each general *kontakion* has to be established once,
   by hand, from a Slavonic general menaion — the same twenty-seven services,
   read once — and then step 2 runs unchanged.
5. `scripts/hymn-common-audit.mjs` **proposes and never writes**, the way
   `place-candidates.mjs` does. Reading its rows is the work; a wrong match is a
   claim that this saint sings that hymn.

Three classes Amendment 44 checked and left alone stay left alone, and a test
already guards the first: the **plural** martyrs' troparion (Orloff's Chapter XV
is a different hymn), the monastic "streams of thy tears" (his Chapter XII gives
"In thee, O father"), and the Archangel's troparion in the singular.

### 2. The four named saints

- **John the Long-Suffering** and **Moses the Hungarian** carry **no hymns at
  all** — not in any language. The first work on them is not English: it is
  recording the Slavonic (and Greek, if the Greek church keeps them) propers
  from azbyka's own page, which is ordinary corpus work and licit. Only then is
  there a text for an English rendering to be *of*.
- **Anthony of the Kyiv Caves** and **Theodosius of the Kyiv Caves** each carry
  four Russian hymn objects — two troparia and two kontakia, none with English.
  These are major saints with **propers**, so Orloff's commons will almost
  certainly not match and must not be forced to. Their English needs a
  public-domain source that prints the Caves service; that is a search, and if
  it comes up empty the honest answer is that it comes up empty.

### 3. The cross-links and `related` — mechanical, safe, cheap

Two different things, and only one of them is a judgement.

- **The hyperlinks already exist.** `lib/cross-link.js` links a saint named in
  another's life automatically; `scripts/cross-link-audit.mjs` lists all 86 of
  them, and its own header records that the rules were *narrowed* until every
  proposed link was right. Widening them is how this corpus makes its worst
  error — a claim that two people are one — so the rules are not the place to
  push.
- **`related` is a hand list and can be derived from that audit.** For every
  life, the set of slugs the linker actually matches is a set of saints the
  author has already accepted as correctly identified. A script that unions
  those into each saint's own `related` (and, where it reads right, the
  reverse) is a patch to read once and apply, not a per-saint investigation.
  Cost: one audit run, one diff. `scripts/related-from-links.mjs`, proposing.

The gap this will not close: a saint named in a life whom the *linker* declines
to match — a shared name form, a saint whose only name form is ambiguous. The
audit prints those separately (`forms two saints share`), and they are read by
hand or left.

### 4. Continue reading at the foot of a saint page, on a phone

`mountShelves` (`ui/shelf.js`) is mounted only by the Daily page today. A phone
reading a saint page has nothing under the life — the desktop's right column,
which carries the reader's own search, is hidden below 1024 px. Mounting the
shelf below `[data-late]` on the saint route, phone only, is a small change with
a test of its own. Watch two things: the swipe-to-clear on a shelf row against
the saint page's own column gestures (`daily/picker.js` already documents that
collision), and `[data-late]` being hidden until the payload lands, so the shelf
must sit *outside* it or it disappears with a failed fetch.

## What makes this cheap in tokens

- **No per-saint web fetching for the English.** Every English text comes from
  two books already cited in the corpus. The matching is string comparison over
  data already on disk.
- **Scripts propose; a person reads.** One run prints every candidate with the
  saint, the kind and both texts. That is one long read instead of hundreds of
  small ones, and it is also the only way the Gleb/Mitrophan/Pitirim class of
  error is caught.
- **The training set is free.** The 39 existing matches define the canonical
  Slavonic for ten of Orloff's services without anyone re-reading Orloff.
- **Batch the corpus edits.** One script writing all accepted matches in a
  single pass, then one `npm run build:manifest`, one unit run, one browser run
  for the surface, one commit.
- **Say no early.** The Greek and Romanian hymns are 266 of the 427. Deciding
  that question first is worth more than any amount of careful work done on the
  wrong side of it.
