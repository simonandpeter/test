# Veneration glyph — component spec for implementation

> **Cell shape: circles.** Every cell in both views is a `<circle>`.
> Not a square, not a rounded rect. This is stated again in §4 with
> the exact radii — if you're implementing this and the shape isn't
> obvious from context, it's a circle.

Extends **saints-build-plan.md §9** (churches: §5). Read that section
first; this document is the implementation-ready version of it, with
working reference code. Two files ship alongside this one:

- `veneration-glyph.js` — dependency-free reference implementation.
  Not necessarily the final file to import, but every line of logic
  in it (the roll-up rule, the two render functions, the morph
  interaction) should survive translation into the site's actual
  stack unchanged. Treat the *behaviour* as the spec, not the exact
  file.
- `parametric-proof.html` — the same module rendered under two
  unrelated colour palettes with no code change, proving the
  colour contract below actually holds.

---

## 1. Two views, one data model

| | §9.1 Badge | §9.2 Detail |
|---|---|---|
| Phase | 1 (required) | 3+ (deferred) |
| Axis | communion only | rite × communion |
| Cells | 3–4 | up to 13 |
| Purpose | cards, map, dense lists | one saint's own page |

Both read the same two inputs and must never diverge in the states
they show for the same saint — the detail view is a **decomposition**
of the badge, not a different dataset:

```js
churches      // the full registry, from §5 — see shape below
attestation   // { [churchId]: 'venerated' | 'not-venerated' | 'undocumented' }
```

`churches` entries need `id`, `communion`, `rite`, `display_name`,
and an optional `enabled` (defaults true — only the Assyrian Church
of the East is expected to use this today, per §5's configurable
fourth communion).

## 2. The roll-up rule (badge only)

A communion cell represents every enabled church in that communion.

1. If **any** church in the communion is attested → the cell is attested.
2. Else if **any** is refused → the cell is refused.
3. Else → undocumented.

This is the whole reason the detail view exists: the roll-up can
hide real variation. Josaphat Kuntsevych's Catholic cell reads
*attested* because Byzantine Catholic has him — but Coptic Catholic,
Ethiopian Catholic, Armenian Catholic, Syriac Catholic and Chaldean
Catholic are all simply unsourced. The badge cannot say that; the
detail view is where a reader finds out. Implement the rule once
(`rollup()` in the reference file) and never inline it elsewhere.

## 3. Colour contract — parametric, not hardcoded

**Nothing in the component may contain a colour literal.** Every
fill is read from a CSS custom property at render time:

```css
--glyph-attested          /* required — fill for a venerated cell */
--glyph-ink                /* required — base colour for refused
                               and undocumented cells */
--glyph-refused-opacity    /* optional, default 0.11 */
--glyph-undoc-opacity      /* optional, default 0.18 */
```

Define these once, wherever the site defines its theme tokens
(alongside things like `--lapis` / `--rubric` if those still exist
from the mockup phase — this component doesn't care what the site's
internal names are, only that these four are set in scope). Dark
mode, a future rebrand, or a per-section accent all fall out for
free once these are wired — see `parametric-proof.html` for the
same module under two unrelated palettes.

**Refusal and attestation must stay distinguishable by opacity
alone**, independent of whatever `--glyph-attested` ends up being —
don't let `--glyph-refused-opacity` drift up toward parity with a
full-opacity attested cell. **Undocumented cells must stay
distinguishable by size**, not opacity alone — this is what makes
the three-state distinction survive a greyscale render, and it's
the one thing in this component that must never be "simplified."

## 4. Geometry

**Cells are circles, not squares.** This was tried both ways during
design; circles are what shipped, and the reference file draws
nothing but `<circle>` elements. If an implementation renders any
other shape — square, rounded rect, anything else — for the cell
marks, that is a spec violation, not an interpretation choice.

- Cells sit on a fixed pitch (`PITCH`, reference: 16px). Each
  circle is centred in its cell (`cx`/`cy` at the cell's midpoint),
  not corner-anchored.
- Attested and refused circles share one radius (`RADIUS`,
  reference: 0.31 × pitch) — same size, distinguished by colour and
  opacity only (see §3).
- Undocumented marks are a **visibly smaller** circle
  (`UNDOC_RADIUS`, reference: 0.11 × pitch), not a shrunk-opacity
  version of the same size. Size is what keeps this state
  distinguishable in greyscale even if two opacities end up close.
- Badge width = number of visible communions × pitch (3 or 4,
  depending on whether the Church of the East is enabled — **never
  hardcode 4**, derive it from the registry, same as the reference
  `renderBadge()` does).
- Detail width = number of rite columns actually present × pitch;
  height = number of communion rows × pitch.

## 5. Accessibility

Every rendered mark carries `role="img"` and an `aria-label` built
from `altText()` — same function, same phrasing, for both views:

> "Venerated in 2 of 13: Roman Catholic, Byzantine Catholic. Not
> venerated in 1. 10 undocumented."

Do not write a second, differently-worded alt text generator for
the detail view.

## 6. Small-size fallback (badge only, §9.1)

Below roughly 20px the grid becomes illegible. Implement a
family-level fallback for map points and dense list rows: one small
vessel per communion, filled from the bottom to the proportion of
that communion's churches attested. Not included in the reference
file — flagged here so it isn't dropped; it's a small addition on
top of the same `rollup()`/`churches`/`attestation` inputs.

## 7. The morph interaction — optional, Phase 3+ only

`mountMorph()` in the reference file opens a badge in place into
its detail view. It is genuinely nice and it is **not required**.
Do not let its existence pull the detail view earlier than the plan
schedules it (§9.2, after the map work, once `rite` is populated
across the registry). If it's built:

- Churches sharing a communion collapse onto **one** point (their
  communion's rolled-up cell, at column 0 of that row) and fan out
  to their true rite columns on expand. A collapsed sibling that
  isn't the visible anchor sits at radius 0 (fully invisible, not
  just transparent) until it expands.
- A communion with only one enabled church (today: Eastern
  Orthodox, Church of the East) does not move at all — it is
  revealed in place as the frame widens, not animated.
- The visible "anchor" cell shows the **rolled-up** state while
  collapsed and its **own true** state once expanded — this is the
  whole point of the animation: a confident single dot resolving
  into what it was actually made of.
- The container is a fixed-aspect crop window that widens from a
  square (`communions.length` rows × `maxCommunionSize` cols) to
  the full detail field on click/Enter; the SVG itself is always
  drawn at full detail-view size underneath it. No `viewBox`
  animation is needed — CSS `width`/`height` transitions on the
  crop window plus attribute transitions on each rect are enough.

## 8. What NOT to do

- Don't hardcode "4 columns" for the badge — derive column count
  from the registry (§5's configurable Assyrian flag exists
  specifically so this isn't fixed).
- Don't merge Ethiopian/Eritrean and Syriac/Malankara into one
  Oriental cell, and don't merge Byzantine/Slavic — both were
  explicitly rejected during design (see build plan §5).
- Don't let a refused cell's opacity approach an attested cell's,
  regardless of what `--glyph-attested` resolves to on a given
  theme.
- Don't build `renderDetail()` / `mountMorph()` before `renderBadge()`
  is shipped and stable in Phase 1.
