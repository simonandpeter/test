import { clampView, MAX_SCALE } from '../../lib/map-view.js';
import { reducedMotion } from '../../lib/motion.js';
import { STRINGS } from '../../ui/strings.js';
import { announce, map } from './state.js';

/**
 * The map's motion: the centring flight (`flyTo`), the glide every moving
 * dot takes toward where the timeline puts it (`railAt`, `glideTo`,
 * `glidePoint`), and the `Movement` box with its play button and speed
 * selector (`wireMotion`).
 *
 * Cut from `views/map.js` on 2026-09-05 (cleanup plan item 5). The
 * comments came with the code and still argue it; what they call "module
 * state" now lives in `map/state.js`.
 */

/**
 * The centring flight, and it deliberately finishes before the selection
 * exists ("it first centres you smoothly on them and then shows their path
 * of travel"). Held so `destroy` and any second press can cancel it — two
 * flights running at once would fight over `view` frame by frame.
 */
let flyFrame = null;

export const FLY_MS = 450;

export function cancelFlight() {
  if (flyFrame === null) return;
  cancelAnimationFrame(flyFrame);
  flyFrame = null;
}

/**
 * Eases the view to `target`, then calls `done`.
 *
 * **Under reduced motion the map arrives rather than travelling**, and `done`
 * still runs — the house rule is that reduced motion removes the animation
 * and never shortens it, and a selection that never completed would be the
 * control failing rather than the motion being spared.
 *
 * **The scale travels too, since 2026-09-01.** It did not until then, and the
 * comment here said why: the scale was the reader's and a saint chosen at 40×
 * stayed at 40×. What changed is what the flight is *for* — "it centres you
 * gently over its whole rail instead of one position" is a question about an
 * extent, and there is no honest way to frame an extent without choosing how
 * far out to stand. Geometrically rather than linearly, because zoom is
 * multiplicative everywhere else on this map (`ZOOM_STEP`, the wheel's own
 * `exp`): interpolating the number itself would rush the near end of a long
 * flight and crawl through the far one.
 *
 * Every frame is clamped, which a constant-scale flight did not need: two
 * valid views have valid views between them only while the scale holds still.
 * Zooming out mid-flight can pull a centre past the edge the world may not
 * leave, and an unclamped frame there is the Atlantic sliding off the side.
 */
export function flyTo(target, frame, apply, done, max = MAX_SCALE) {
  cancelFlight();
  if (reducedMotion()) {
    apply(target);
    done();
    return;
  }
  const from = map.view;
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / FLY_MS);
    const eased = 1 - (1 - t) ** 3;
    apply(
      clampView(
        {
          scale: from.scale * (target.scale / from.scale) ** eased,
          cx: from.cx + (target.cx - from.cx) * eased,
          cy: from.cy + (target.cy - from.cy) * eased,
        },
        frame,
        max,
      ),
    );
    if (t < 1) {
      flyFrame = requestAnimationFrame(step);
      return;
    }
    flyFrame = null;
    done();
  };
  flyFrame = requestAnimationFrame(step);
}

/*
 * The play button's two faces. Drawn as glyphs rather than as an icon from
 * `ui/icons.js` because they are two triangles and two bars — the one place
 * on this page where the character *is* the picture, the way the zoom's
 * plus and minus already are.
 */
export const PLAY_GLYPH = '&#9654;';

const PAUSE_GLYPH = '&#9208;';

/**
 * A year a second (author, 2026-09-01: "plays in the selected timeline span
 * at a rate of 1 year per second"). Read as a rate rather than counted in
 * frames, so a slow machine runs the same years in the same seconds and
 * drops the frames in between instead of the years.
 */
const PLAY_MS_PER_YEAR = 1000;

/**
 * How many years a second of playback covers (author, 2026-09-02: "Add a speed
 * selector (1y,5y,10y,25y per second) when Movement is ticked").
 *
 * The author's four numbers. A year a second is the rate playback shipped
 * with and stays the default; at the other end, 25 crosses the corpus's whole
 * 1,872-year span in about seventy-five seconds, which is the difference
 * between watching a life and watching the centuries.
 */
export const SPEEDS = [1, 5, 10, 25];

/**
 * Where each moving saint's dot currently *is*, by slug, easing toward where
 * the timeline says they should be.
 *
 * **The rail is far finer than the control that scrubs it.** The corpus spans
 * 1872 years and the rail is a few hundred pixels, so one pixel of drag is
 * six years — more than Moses the Hungarian's whole flight from Poland. Read
 * literally that is a dot that teleports across half of Europe between two
 * adjacent pixels, which is what the author saw ("make sure he goes a bit
 * more smoothly across the trail"). Easing decouples the two: the timeline
 * says where he belongs, and the dot takes a moment to get there, along the
 * path rather than across it.
 *
 * **Two spaces, because a track is a road and a pair of places is not.** A
 * saint with a track eases along their own `progress` — one number, so the
 * dot takes the bends rather than cutting across them. A saint without one
 * eases in plain lon/lat between the places they are recorded at, which is
 * the only thing there is to ease between. Both are drawn rather than
 * sourced, which is why both live behind the `Movement` box.
 */
export const railAt = new Map();

/**
 * How fast the dot closes on where the timeline puts it: the fraction of the
 * remaining distance it covers in a millisecond is `1/RAIL_GLIDE_MS`, so it
 * is quick where the gap is large and settles without overshooting.
 *
 * 120 ms, down from 260 (author, 2026-09-01: "Make them move smoothly but
 * quickly if the timeline bar is shifted quick"). Playback is a year a
 * second, so anything slower than about a sixth of that reads as the dots
 * lagging the year rather than keeping up with it.
 */
const RAIL_GLIDE_MS = 120;

/** Close enough to be there. Without it the exponential ease never quite
 *  arrives, and the map would schedule frames forever. */
const RAIL_SETTLED = 0.002;

/**
 * How much of the remaining distance to close this step, or `1` for "be
 * there now" — no easing state yet, reduced motion, or the reader is not
 * watching movement at all.
 *
 * Under reduced motion the dot is simply where the year puts it: the house
 * rule is that reduced motion removes the animation, and a dot that never
 * arrived would be the control failing rather than the motion being spared.
 */
function glideStep(state, now) {
  if (!state || reducedMotion() || !map.movement) return 1;
  /*
   * **Capped, because the clock between two paints is not the clock between
   * two frames.** The map paints only when something happens, so the gap
   * since this saint was last stepped can be the whole time the reader spent
   * reading — and an uncapped `dt` then closes the entire distance in one
   * step, which is the jump this exists to remove. Two frames' worth is the
   * most any single step may take.
   */
  const dt = Math.min(now - state.lastT, 32);
  state.lastT = now;
  return Math.min(1, dt / RAIL_GLIDE_MS);
}

/** Eases one saint's progress along their own track toward `wanted`. */
export function glideTo(slug, wanted, now) {
  const state = railAt.get(slug);
  const step = glideStep(state, now);
  if (step === 1 || typeof state.value !== 'number') {
    // First sight of this saint is not a journey from wherever the last one
    // stood: they start where the timeline already puts them.
    railAt.set(slug, { value: wanted, lastT: now });
    return wanted;
  }
  const gap = wanted - state.value;
  state.value = Math.abs(gap) < RAIL_SETTLED ? wanted : state.value + gap * step;
  return state.value;
}

/**
 * Eases one saint's drawn position toward `wanted`, for the saints who have
 * no track to walk along and only a set of places they are recorded at.
 * `RAIL_SETTLED` is in track-progress units, so the arrival test here is a
 * distance on the ground — a hundredth of a degree, well under a pixel at
 * any zoom this map offers.
 */
export function glidePoint(slug, wanted, now) {
  const state = railAt.get(slug);
  const step = glideStep(state, now);
  if (step === 1 || !state.point) {
    railAt.set(slug, { point: wanted, lastT: now });
    return wanted;
  }
  const from = state.point;
  if (Math.hypot(wanted.lon - from.lon, wanted.lat - from.lat) < 0.01) {
    state.point = wanted;
    return wanted;
  }
  state.point = {
    lon: from.lon + (wanted.lon - from.lon) * step,
    lat: from.lat + (wanted.lat - from.lat) * step,
    uncertainty_km: from.uncertainty_km + (wanted.uncertainty_km - from.uncertainty_km) * step,
  };
  return state.point;
}

/* ---- movement and playback (2026-09-01) --------------------------------- */

/**
 * The `Movement` box and the play button beside it.
 *
 * `timeline` is `wireTimeline`'s own small API, or `null` where the corpus
 * has nothing dated to build a rail from — in which case there is no span to
 * play and the button stays disabled whatever the box says.
 *
 * **Playback walks the upper handle**, which is the control the reader can
 * already see and work: it starts at the low end of their own span and
 * travels to the high end at a year a second, and pressing pause leaves it
 * wherever it stopped. Nothing about "now" is invented alongside the range —
 * the year buttons, the dimming and the dots all keep reading the one pair
 * of numbers they always have, and the picture lights up through the
 * centuries as it goes.
 */
export function wireMotion(el, timeline, refresh) {
  const box = el.querySelector('[data-movement]');
  const play = el.querySelector('[data-play]');
  const speedSel = el.querySelector('[data-speed]');
  const run = el.querySelector('[data-motion-only]');
  let frame = null;
  let end = null;

  const stop = () => {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
    play.innerHTML = PLAY_GLYPH;
    play.setAttribute('aria-label', STRINGS.map.play);
  };

  const chrome = () => {
    // Playing with nothing to move is the timeline dimming on a clock, which
    // a drag already does and a play button does not promise.
    play.disabled = !map.movement || !timeline;
    if (play.disabled) stop();
    /*
     * **Shown with Movement, faded rather than swapped** (author, 2026-09-02).
     * `inert` as well as the class, because a control faded to nothing is
     * still a control a keyboard can reach: the fade is what a sighted reader
     * sees and this is the same statement made to everyone else.
     */
    run.classList.toggle('is-on', map.movement);
    run.inert = !map.movement;
    /*
     * "It appears once Movement is ticked on" (author, 2026-09-01). Off, the
     * map shows every saint at their resting place and there is no year being
     * watched — a mark pointing at one would be a control for a question the
     * page is not asking.
     */
    timeline?.showHead(map.movement);
  };

  box.addEventListener('change', () => {
    map.movement = box.checked;
    chrome();
    /*
     * Every dot goes back to standing where the year puts it rather than
     * gliding there from wherever the other mode had left it — the switch
     * is a change of question, not a journey.
     */
    railAt.clear();
    refresh();
    announce(el, map.movement ? STRINGS.map.movementOn : STRINGS.map.movementOff);
  });

  play.addEventListener('click', () => {
    if (frame !== null) {
      stop();
      return;
    }
    const span = timeline.span();
    if (span.to <= span.from) return;
    end = span.to;
    /*
     * **From where the triangle stands, not from the start of the span**
     * (author, 2026-09-02: "with the triangle button, make sure it doesnt go
     * back to the start of the timeline selection but starts from where it is
     * placed by hand. i.e. if its halfway and you click play, it should go
     * from there not jump back to the earliest selected date").
     *
     * The reader has a control for the year now, and moving it is them saying
     * where they want to be — sending them back to the low end on every press
     * threw that away. A press at the wall still starts the run again from the
     * beginning, because a play button that does nothing is worse than one
     * that rewinds; and a mark left outside the selection (the handles can be
     * dragged past it) is clamped into it rather than played from outside.
     */
    const standing = timeline.head();
    const resume =
      standing === null || standing >= end - 0.5
        ? span.from
        : Math.min(end, Math.max(span.from, standing));
    /*
     * **The triangle walks, and the selection stays where the reader put it**
     * (2026-09-01). This ran the *upper handle* from one end of the span to the
     * other, because until the triangle there was nothing else that could carry
     * a year — which meant pressing Play collapsed the reader's window to a
     * single year and then reopened it, dimming most of the map for the length
     * of the performance. The range is untouched now; what moves is the mark.
     */
    timeline.setHead(resume);
    play.innerHTML = PAUSE_GLYPH;
    play.setAttribute('aria-label', STRINGS.map.pause);

    let last = performance.now();
    let year = resume;
    const step = (now) => {
      /*
       * The reader's own rate, read every frame rather than captured at the
       * press: changing the speed mid-run should change *this* run, which is
       * the only run there is to change.
       */
      year += ((now - last) / PLAY_MS_PER_YEAR) * map.speed;
      last = now;
      if (year >= end) {
        timeline.setHead(end);
        stop();
        return;
      }
      timeline.setHead(year);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  });

  speedSel?.addEventListener('change', () => {
    const chosen = Number(speedSel.value);
    if (SPEEDS.includes(chosen)) map.speed = chosen;
  });

  // The reader taking the timeline back is the end of the performance, and
  // so is leaving the view: `destroy` drains `cleanups`.
  timeline?.onTouch(stop);
  map.cleanups.push(stop);
  // Both hold for the visit, so a return to the map finds them as they were.
  box.checked = map.movement;
  if (speedSel) speedSel.value = String(map.speed);
  chrome();
}
