import { PERIODS, spanOf } from '../../data/periods.js';
import { escapeHtml as esc } from '../../lib/markdown.js';
import { STRINGS } from '../../ui/strings.js';
import { map } from './state.js';

/**
 * The timeline under the picture: its markup, the two handles, the fill
 * drag, the typed years, the presets, and the triangle that says which
 * year is being watched.
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5); the range
 * and the triangle themselves live in `map/state.js` (`map.dateFrom`,
 * `map.dateTo`, `map.playhead`) and this is the one writer of them.
 */

/**
 * The timeline's markup: two overlaid native range inputs over one rail, and
 * a status row underneath. Real `<input type="range">` rather than a
 * hand-built control, because a native one is keyboard-operable and has an
 * accessible name for free — the "very light" instruction the map itself was
 * built under applies to this too, and the accessibility work a custom
 * slider would need is not light.
 *
 * The two inputs overlap the same track; CSS gives the invisible body
 * `pointer-events: none` and restores it on the thumb alone, the standard way
 * to make two overlaid range inputs each grabbable without one's body
 * blocking the other's thumb. Crossing the handles is not prevented — `wireTimeline`
 * always takes the sorted pair as the effective range, so a thumb dragged
 * past its twin still means something rather than needing to be stopped.
 *
 * The fill itself is a third grab target (`wireTimeline`, 2026-08-31): its
 * hit box is the rail-wrap's full height, not the 4 px painted bar, so a
 * pointer sliding the highlighted span does not need to land on a hairline —
 * `.map-timeline-fill-bar` is the visible bar, `.map-timeline-fill` around it
 * is what pointer events actually land on. It sits under both inputs in
 * paint order, so it only ever answers a press that already passed through
 * their `pointer-events: none` bodies.
 */
export function timelineMarkup(M, bounds) {
  /*
   * Each end is a **fixed-width button that opens a small panel** (author,
   * 2026-08-31: "make the start and end date a button of fixed width and
   * make the AD BC selector part of the pop up from the button if you want
   * to type it in instead of drag the slider"), where a printed bound used
   * to stand and where a bare number box and select stood for one build.
   *
   * The button is the resting state and shows the year as a reader reads it
   * — "431 BC", "1917 AD". Typing is the *other* way in, behind a press,
   * because the two handles are the primary control and a pair of always-open
   * number boxes gave a control the reader mostly does not want the same
   * weight as the rail they mostly do. Fixed width so the rail between the
   * two ends does not jump every time a year gains or loses a digit — which
   * it did, visibly, while the boxes sized to their own content.
   *
   * The number the reader types is always positive and the era carries the
   * sign, because "431 BC" is a year a reader can read and "-431" is one
   * they have to decode — `yearBox` and `yearLabel` are the one place that
   * conversion happens in either direction.
   */
  const yearBox = (side, label, value) => {
    const bc = value < 0;
    return `
      <div class="map-year" data-year-box="${side}">
        <button type="button" class="map-year-btn utility" data-year-btn="${side}"
          aria-expanded="false" aria-label="${esc(label)}">${esc(yearLabel(value, M))}</button>
        <div class="map-year-pop" data-year-pop="${side}" hidden>
          <input type="number" class="map-year-num utility" data-year-num="${side}"
            value="${Math.abs(value)}" min="1" step="1" inputmode="numeric"
            aria-label="${esc(label)}" />
          <select class="map-year-era utility" data-year-era="${side}" aria-label="${esc(M.era)}">
            <option value="ad"${bc ? '' : ' selected'}>${esc(M.eraAD)}</option>
            <option value="bc"${bc ? ' selected' : ''}>${esc(M.eraBC)}</option>
          </select>
        </div>
      </div>`;
  };

  /*
   * The preset list stands where "Whole span" did, and keeps it as its own
   * first entry (author, 2026-08-31: make that button "a preset filter that
   * shows periods of history ... both periods of time and events +- 50
   * years"). A `<select>` rather than a menu built by hand, for the same
   * reason the handles are native ranges: it is keyboard- and
   * screen-reader-operable for nothing, and it is a list of one-line
   * choices, which is exactly what a select is for.
   */
  const P = STRINGS.map.presets;
  const options = PERIODS.map((p) => {
    const { from, to } = spanOf(p);
    return `<option value="${esc(p.id)}">${esc(P[p.id] ?? p.id)} (${yearLabel(from, M)}–${yearLabel(to, M)})</option>`;
  }).join('');

  return `
    <div class="map-timeline">
      <div class="map-timeline-track">
        ${yearBox('from', M.yearFrom, map.dateFrom)}
        <div class="map-timeline-rail-wrap">
          <div class="map-timeline-rail"></div>
          <div class="map-timeline-fill" data-timeline-fill><span class="map-timeline-fill-bar"></span></div>
          <input type="range" class="map-timeline-input" data-timeline-from
            min="${bounds.min}" max="${bounds.max}" step="1" value="${map.dateFrom}"
            aria-label="${esc(STRINGS.saints.filters.from)}" />
          <input type="range" class="map-timeline-input" data-timeline-to
            min="${bounds.min}" max="${bounds.max}" step="1" value="${map.dateTo}"
            aria-label="${esc(STRINGS.saints.filters.to)}" />
          <!--
            The year being watched (author, 2026-09-01), over the top of the
            selection and sliding only inside it.

            A slider role rather than a third native range input, and the two
            above are the reason: a native range spans the whole rail and its
            track would lie across both of theirs, taking the presses that
            belong to the handles. This one is a button the width of its own
            triangle, so it can be dragged where it is and nowhere else — and it
            carries the range role's four attributes and answers the arrow keys,
            so what the native input was giving for free is given back by hand
            rather than given up.
          -->
          <button type="button" class="map-timeline-head" data-playhead hidden
            role="slider" tabindex="0" aria-orientation="horizontal"
            aria-label="${esc(M.watching)}"
            aria-valuemin="${bounds.min}" aria-valuemax="${bounds.max}"
            aria-valuenow="${map.playhead ?? bounds.max}"></button>
        </div>
        ${yearBox('to', M.yearTo, map.dateTo)}
      </div>
      <!--
        The "from-to: shown/total shown" line stood here until 2026-08-31,
        when the author asked for it gone. Its two halves had both been said
        twice over by then: the range is what the two year buttons print,
        and the count stopped meaning "dots on the picture" the day the
        timeline began dimming rather than removing.
      -->
      <div class="map-timeline-status">
        <select class="map-timeline-preset utility" data-timeline-preset aria-label="${esc(M.presetLabel)}">
          <option value="">${esc(M.presetWhole)}</option>
          ${options}
        </select>
      </div>
    </div>`;
}

/** A signed year as a reader reads it: `431 BC`, `1917 AD`. */
const yearLabel = (year, M) => `${Math.abs(year)} ${year < 0 ? M.eraBC : M.eraAD}`;

/**
 * Wires the two range inputs — and the highlighted span between them — to
 * one effective span, held in the module-level `dateFrom`/`dateTo` so it
 * survives the visit the way the view does.
 */
export function wireTimeline(el, bounds, refresh) {
  const fromInput = el.querySelector('[data-timeline-from]');
  const toInput = el.querySelector('[data-timeline-to]');
  const fillEl = el.querySelector('[data-timeline-fill]');
  const headEl = el.querySelector('[data-playhead]');
  const presetSel = el.querySelector('[data-timeline-preset]');
  const numOf = (side) => el.querySelector(`[data-year-num="${side}"]`);
  const eraOf = (side) => el.querySelector(`[data-year-era="${side}"]`);

  const btnOf = (side) => el.querySelector(`[data-year-btn="${side}"]`);
  const popOf = (side) => el.querySelector(`[data-year-pop="${side}"]`);

  /*
   * One panel open at a time, and a press anywhere else closes it — the
   * same bargain the Daily page's fast bubble keeps. Closing on `Escape`
   * returns focus to the button that opened it, so the keyboard is not
   * stranded in a panel that has just gone.
   */
  const closePops = (except) => {
    for (const side of ['from', 'to']) {
      if (side === except) continue;
      popOf(side).hidden = true;
      btnOf(side).setAttribute('aria-expanded', 'false');
    }
  };

  for (const side of ['from', 'to']) {
    btnOf(side).addEventListener('click', () => {
      const pop = popOf(side);
      const opening = pop.hidden;
      closePops(opening ? side : null);
      pop.hidden = !opening;
      btnOf(side).setAttribute('aria-expanded', String(opening));
      if (opening) {
        numOf(side).focus();
        numOf(side).select();
      }
    });
    popOf(side).addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        popOf(side).hidden = true;
        btnOf(side).setAttribute('aria-expanded', 'false');
        btnOf(side).focus();
      } else if (e.key === 'Enter') {
        // Enter is "I have finished typing", which `change` alone would not
        // hear until blur — so it commits and puts the panel away.
        e.preventDefault();
        numOf(side).blur();
        popOf(side).hidden = true;
        btnOf(side).setAttribute('aria-expanded', 'false');
        btnOf(side).focus();
      }
    });
  }

  /*
   * A press anywhere but inside a year control closes both panels. On
   * `document` rather than on the view root, because the header above the
   * stage is outside it and a reader who reaches for the language button
   * with a panel open should not have to press twice — and registered for
   * teardown, since a listener on `document` outlives the view that added
   * it and would otherwise be a leak per navigation.
   */
  const onDocDown = (e) => {
    if (!e.target.closest?.('.map-year')) closePops(null);
  };
  document.addEventListener('pointerdown', onDocDown);
  map.cleanups.push(() => document.removeEventListener('pointerdown', onDocDown));

  /**
   * The whole control drawn from `dateFrom`/`dateTo`: the highlighted span,
   * and both ends — the button's printed year as well as the number and era
   * behind it, so opening a panel after a drag shows the year the rail
   * actually holds.
   *
   * **The two used to be separate, and dragging the span forgot to call the
   * second** (author, 2026-08-31: "the date does not update anymore when
   * sliding the whole bar along"). They are one question — what does the
   * timeline now say — so they are one function; there is no longer a way to
   * move the range and repaint only half of what shows it.
   */
  const paint = () => {
    const span = bounds.max - bounds.min || 1;
    const lo = ((map.dateFrom - bounds.min) / span) * 100;
    const hi = ((map.dateTo - bounds.min) / span) * 100;
    fillEl.style.left = `${lo}%`;
    fillEl.style.right = `${100 - hi}%`;
    for (const [side, year] of [['from', map.dateFrom], ['to', map.dateTo]]) {
      numOf(side).value = String(Math.abs(year));
      eraOf(side).value = year < 0 ? 'bc' : 'ad';
      btnOf(side).textContent = yearLabel(year, STRINGS.map);
    }
    /*
     * **The triangle is pushed, never pushing** (author: "It gets pushed around
     * if the high or low dates make contact with it"). Clamping it here rather
     * than in the handles' own listeners is what makes that true of every way
     * the range can move — the two handles, the fill drag, a typed year, a
     * preset — because all five end in this function. A rule enforced at the
     * one place the state is drawn from cannot be forgotten by a sixth.
     */
    map.playhead = Math.min(map.dateTo, Math.max(map.dateFrom, map.playhead ?? map.dateTo));
    headEl.style.left = `${((map.playhead - bounds.min) / span) * 100}%`;
    headEl.setAttribute('aria-valuenow', String(map.playhead));
    headEl.setAttribute('aria-valuetext', yearLabel(map.playhead, STRINGS.map));
  };

  const commit = () => {
    // Whichever handle moved, the *sorted* pair is the effective range — a
    // thumb dragged past its twin still filters correctly rather than
    // needing to be physically stopped from crossing (see `timelineMarkup`).
    map.dateFrom = Math.min(Number(fromInput.value), Number(toInput.value));
    map.dateTo = Math.max(Number(fromInput.value), Number(toInput.value));
    paint();
    refresh();
  };

  fromInput.addEventListener('input', commit);
  toInput.addEventListener('input', commit);

  /*
   * A typed year, with its era. **The two ends swap themselves rather than
   * being refused** (author, 2026-08-31: "If an earlier date is typed in the
   * right side than the left side, the timeline adjusts so that right side
   * entry goes to the left and vice versa"), which is the same rule the
   * handles already followed — `commit` has always taken the sorted pair —
   * so this is that rule reaching the boxes rather than a new one.
   *
   * Clamped to the corpus's own span, because the two range handles cannot
   * represent a year outside it: a reader who types 200 BC into a corpus
   * that starts at AD 66 is asking for something the rail has no room to
   * show, and silently keeping the number while the handle sat at the end
   * would be the control lying about its own state.
   */
  const readTyped = (side) => {
    const magnitude = Math.abs(Math.trunc(Number(numOf(side).value)));
    if (!Number.isFinite(magnitude) || magnitude === 0) return null;
    const signed = eraOf(side).value === 'bc' ? -magnitude : magnitude;
    return Math.min(bounds.max, Math.max(bounds.min, signed));
  };

  const commitTyped = () => {
    const a = readTyped('from');
    const b = readTyped('to');
    // A half-typed box ("1" on the way to "1917") is left alone rather than
    // yanking the whole range to year 1 between keystrokes.
    if (a === null || b === null) return;
    fromInput.value = String(Math.min(a, b));
    toInput.value = String(Math.max(a, b));
    commit();
  };

  for (const side of ['from', 'to']) {
    // `change`, not `input`: a number box fires `input` on every keystroke,
    // and swapping the ends out from under someone mid-type — "19" being
    // read as year 19 and flung to the left — is exactly the jitter the
    // sort rule would otherwise cause. `change` waits for blur or Enter.
    numOf(side).addEventListener('change', commitTyped);
    eraOf(side).addEventListener('change', commitTyped);
  }

  /*
   * A preset span. The empty value is "Whole span", which is where the old
   * reset button's behaviour lives now; every other value is a row of
   * `data/periods.js`, an event already widened to its ±50 window by
   * `spanOf`. Each is clamped to the corpus's own bounds for the same
   * reason a typed year is: the rail cannot show what it has no room for.
   */
  presetSel.addEventListener('change', () => {
    const chosen = PERIODS.find((p) => p.id === presetSel.value);
    const span = chosen ? spanOf(chosen) : { from: bounds.min, to: bounds.max };
    fromInput.value = String(Math.min(bounds.max, Math.max(bounds.min, span.from)));
    toInput.value = String(Math.min(bounds.max, Math.max(bounds.min, span.to)));
    commit();
  });

  /*
   * The fill drag: a pointer down on the highlighted span shifts both
   * handles by the same number of years, holding their width fixed — a pan
   * across the timeline rather than a resize of it. `Math.round` keeps
   * `dateFrom`/`dateTo` the same integer-year values a keyboard press would
   * leave them at, so the readout never shows a fraction.
   */
  let drag = null;
  fillEl.addEventListener('pointerdown', (e) => {
    fillEl.setPointerCapture(e.pointerId);
    drag = { pointerId: e.pointerId, startX: e.clientX, from: map.dateFrom, to: map.dateTo };
    fillEl.classList.add('is-dragging');
  });
  fillEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const rect = fillEl.parentElement.getBoundingClientRect();
    const span = bounds.max - bounds.min || 1;
    const deltaYears = ((e.clientX - drag.startX) / rect.width) * span;
    const width = drag.to - drag.from;
    let from = drag.from + deltaYears;
    let to = drag.to + deltaYears;
    // Clamped as one unit: the span slides until *either* edge meets the
    // bound, and that edge's clamp carries the other edge with it so the
    // width never changes mid-drag — the difference between panning the
    // window and having it squashed against the wall.
    if (from < bounds.min) {
      from = bounds.min;
      to = from + width;
    } else if (to > bounds.max) {
      to = bounds.max;
      from = to - width;
    }
    map.dateFrom = Math.round(from);
    map.dateTo = Math.round(to);
    fromInput.value = String(map.dateFrom);
    toInput.value = String(map.dateTo);
    paint();
    refresh(true);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag = null;
    fillEl.classList.remove('is-dragging');
  };
  fillEl.addEventListener('pointerup', endDrag);
  fillEl.addEventListener('pointercancel', endDrag);

  /*
   * The triangle's own drag. Years from pixels against the rail's box, clamped
   * to the selection — which is the whole of "only slides along lowest date to
   * highest date selected".
   *
   * `refresh(true)` rather than `refresh()`: the flag is what tells the paint
   * this is a hand still moving, so the dots take the direct path to where the
   * year now puts them instead of easing toward it from where the last frame
   * left them, half a year behind the reader's thumb.
   */
  let headDrag = null;
  const yearAtX = (clientX) => {
    const rect = fillEl.parentElement.getBoundingClientRect();
    const span = bounds.max - bounds.min || 1;
    const raw = bounds.min + ((clientX - rect.left) / (rect.width || 1)) * span;
    return Math.min(map.dateTo, Math.max(map.dateFrom, Math.round(raw)));
  };
  const moveHead = (year, live) => {
    if (year === map.playhead) return;
    map.playhead = year;
    paint();
    refresh(live);
  };
  headEl.addEventListener('pointerdown', (e) => {
    headEl.setPointerCapture(e.pointerId);
    headDrag = e.pointerId;
    headEl.classList.add('is-dragging');
  });
  headEl.addEventListener('pointermove', (e) => {
    if (headDrag !== e.pointerId) return;
    moveHead(yearAtX(e.clientX), true);
  });
  const endHead = (e) => {
    if (headDrag !== e.pointerId) return;
    headDrag = null;
    headEl.classList.remove('is-dragging');
    // One last paint that is *not* live, so the dots settle by easing into
    // place rather than stopping dead where the thumb left them.
    refresh();
  };
  headEl.addEventListener('pointerup', endHead);
  headEl.addEventListener('pointercancel', endHead);

  /*
   * And the keys a range input would have answered: a year at a time, ten at a
   * page, and the ends of the *selection* rather than of the corpus — Home and
   * End mean the ends of what this control can reach.
   */
  headEl.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
    let next = null;
    if (step !== undefined) next = map.playhead + step;
    else if (e.key === 'Home') next = map.dateFrom;
    else if (e.key === 'End') next = map.dateTo;
    if (next === null) return;
    e.preventDefault();
    moveHead(Math.min(map.dateTo, Math.max(map.dateFrom, next)), false);
  });

  paint();

  /*
   * The upper handle, for the play button — which lives on the picture and
   * not in this strip, but must move the range through the same `commit`
   * every other control does, or the year buttons and the picture would
   * disagree with the rail. `onTouch` is how playback learns to stop when
   * the reader takes the timeline back off it.
   */
  return {
    setUpper(year) {
      toInput.value = String(Math.min(bounds.max, Math.max(bounds.min, Math.round(year))));
      commit();
    },
    /**
     * Where playback puts the year now.
     *
     * **Playback moves the triangle, not the upper handle, since 2026-09-01.**
     * It used to walk `dateTo` from one end of the span to the other, which was
     * the only year-mover there was — and which meant pressing Play *narrowed
     * the reader's window to nothing* and then widened it back out, dimming
     * three quarters of the map on the way. With a mark of its own to move, the
     * selection stays where the reader put it and the year walks across it,
     * which is what watching a span play was always meant to look like.
     */
    setHead(year) {
      moveHead(Math.min(map.dateTo, Math.max(map.dateFrom, Math.round(year))), true);
    },
    /** Where playback should start and stop: the reader's own selection. */
    span: () => ({ from: map.dateFrom, to: map.dateTo }),
    /** Where the triangle stands now, which is where a press of Play resumes. */
    head: () => map.playhead,
    /** Shown while Movement is on and hidden with it (`wireMotion`). */
    showHead(on) {
      headEl.hidden = !on;
    },
    onTouch(stop) {
      // The triangle is in this list because dragging it during playback is the
      // reader taking the year back by hand, which is the same interruption as
      // touching the handles.
      for (const control of [fromInput, toInput, fillEl, presetSel, headEl]) {
        control.addEventListener('pointerdown', stop);
        control.addEventListener('keydown', stop);
        control.addEventListener('change', stop);
      }
    },
  };
}
