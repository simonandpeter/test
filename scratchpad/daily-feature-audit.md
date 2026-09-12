# What the old Daily page could do, and what the new one can

Written 2026-09-12, after the author found two capabilities missing by opening
the site — the month grid picked no day, and All Saints came back a third of its
height. Neither was visible to 900 browser tests, the corpus gate, the contact
sheet or a review.

**The method.** The deleted specs are the only written inventory of the old page:
`daily-picker.spec.js` held 46 tests and `daily-register.spec.js` 12, and every
name describes a behaviour that existed and was verified. This checks each
against the page that replaced it. It is not a judgement about whether the new
design is better — only about what it no longer does.

---

## Gone on purpose, with the control that carried it (34)

The week rail and the month-inside-the-rail are deleted, and with them: keyboard
travel along the strip, the drag and the throw and the coast, the unfurl and its
held height, the sideways month step, the peeked neighbouring column, the fade
between week and month, the edge rebuild, the reduced-motion variants of each,
and the register's two faces with the toggle that remembered which. The mockup
replaces all of it with a painted month and a strip of tiles. No action needed.

## Survived, and still tested (13)

Name days: linked only where one saint bears the name, the *today* wording only
on the day that is today, the two-column-at-a-desk rule (now a run-on). A row
with no icon showing its type as a mark and saying it in words. The card crop
following the hero's own limits. The month marking a feast with its own rule and
the word beside it — now in `--feast` rather than `--gold`, which is a fix, not
a drift. Today told apart from the selected day. The full-screen calendar
printing the month's fasts and feasts. The reckoning named, and changeable.

## Changed deliberately, worth your eye (2)

- **The mat is 120 px, not 60.** The mockup's tile. Intended.
- **The register's compact/card faces are one tile.** Intended.

---

## Lost silently — nobody chose these (5)

These are the answer to "how do we know the new page is better or worse". Each
was a behaviour the old page was verified to have, and none of them was a
decision.

### 1. The keys no longer step the day

`daily-picker.spec.js`: *"a day is one click, and the keys step it from
anywhere"*. There is no arrow-key handling left anywhere in the Daily page —
`sidebar.js`'s `onKey` handles `Escape` and nothing else, and no file under
`src/views/daily/` or `calendar.js` mentions `ArrowLeft`/`ArrowRight`. A reader
who moved through days by keyboard now has to tab to a control.

### 2. The full-screen calendar is on phones

*"the full-screen calendar is a desktop control and is not on a phone"*.
Measured live at 360 px: the button is visible. Nothing in `sidebar.js`,
`calendar.js` or `daily-sidebar.css` gates it by width.

### 3. A phone is now offered the reckoning, not told it

*"a phone is told the reckoning without being offered the choice"*. Measured
live at 360 px: the reckoning button and its popover are both there. The old
page showed the caption without the control.

### 4. The day's saints lost their ordering rule

*"the also-commemorated cards run tallest picture first, imageless last"* and
*"a phone keeps the calendar's own order"*. `tiles.js` renders "the day's own
order" at every width. The old rule put pictures first and the imageless last,
which is exactly the rule that stops a day reading as a wall of glyph mats — and
about 130 of 862 saints have icons, so most days are mostly mats. This one is
probably the largest visual consequence of the rebuild and it was never decided.

### 5. The "Also today" heading is gone

*"the register heading is Also today at a desk and Also commemorated on a
phone"*. `STRINGS.calendar.alsoToday` and `.alsoCommemorated` still exist and
nothing on the Daily page reads them. The day's saints now begin with no heading
at all.

---

## New, and not measured by any of the above

**52 tab stops in the sidebar, at every width.** Making the month's cells
buttons — which it had to be, so the grid could pick a day and so its accessible
names reach anyone — put 31 controls in front of the day's saints for a reader
using the keyboard. At 360 px the sidebar is the first block in the flow, so a
phone reader tabs through all 52 before reaching a saint. The old rail was one
tab stop with arrow keys inside it. **A roving tabindex is the usual answer**:
one stop for the grid, arrows to move within it — which would restore finding 1
at the same time.

---

## What this says about the verification

Five capabilities went without anyone choosing, and the suite stayed green
throughout, because a test asserts what a control *does* and never that the
control is still there. The corpus gate, the contact sheet and the pixel diff
are all equally blind to it: a deleted control draws nothing, and nothing is
what they compare against.

The cheap instrument is this document's own method — a list of the behaviours a
surface had, checked by hand after it is replaced. It cost about twenty minutes
and found five things that nine hundred tests did not.
