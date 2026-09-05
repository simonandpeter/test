import { coverFractions, HOME, maxScaleFor, toScreen } from '../../lib/map-view.js';
import { ASPECT, project } from '../../lib/mercator.js';

/**
 * The map's own state, in a module of its own (2026-09-05, cleanup plan
 * item 5, on the author's word: "Items 5 and 6").
 *
 * `views/map.js` was 4,603 lines, with everything the picture and its
 * controls share held in module-scoped `let`s — so nothing could be lifted
 * out of it, because a module cannot write to a binding it imported. The
 * Daily page and All Saints made the same move (`views/daily/state.js`,
 * `views/index/state.js`) and this is their shape with one difference: the
 * map has no per-render object to open and close, because most of what it
 * holds is deliberately *kept* across visits — the range, the triangle,
 * Movement, the speed, the two filter boxes — and only some of it is reset
 * by `render` and `destroy`. So it is one object, `map`, whose fields' own
 * comments say which of the two they are, and every module reads and writes
 * `map.<field>` and never a copy. **No module keeps a shadow of any field**:
 * that is the rule that makes the split safe, the plan's own warning and
 * `views/index/place.js`'s.
 *
 * It is `map` rather than `state` because `state` is what forty places in
 * the paint pass call a dot's own `live`/`past`/`future`, and a shared
 * object of that name would have been shadowed in every one of them.
 *
 * Also here, because every other module of the map imports this one and it
 * must import none of them: the one-line readers of the canvas and the view
 * (`frameOf`, `ceilingOf`, `place`, `shownYear`), and `announce`, the live
 * region the map speaks through.
 */

export const map = {
  /** The live resize listener, so `destroy` can take it off again. */
  onResize: null,

  /**
   * Everything else this view attached outside its own root — anything on
   * `document` or `window` outlives the element the router throws away, so it
   * has to be taken off by hand or it is a leak per navigation rather than
   * per page. `destroy` drains this.
   */
  cleanups: [],

  /*
   * The Index's filter set lived here for one day (Amendment 76, 2026-08-30)
   * and went with the reading it stood in when the author asked for the map
   * alone. The timeline is the first of it to return, and it returns exactly
   * as promised — drawn on the stage, because there is nowhere else left.
   */

  /*
   * The timeline's own range, held for the visit like `movement`. `null` means "not
   * set for this session yet"; `render()` fills both from the corpus's own span
   * the first time the reader opens the map, and leaves them alone after that,
   * so a reader who narrows the range, leaves for a saint page, and comes back
   * finds the map exactly as they left it.
   */
  dateFrom: null,

  dateTo: null,

  /**
   * The year the map is showing people *in*, as against the years it is showing
   * people *from* (author, 2026-09-01: "Add a triangle you can drag over the top
   * of the timeline bar selection ... It appears once Movement is ticked on. It
   * gets pushed around if the high or low dates make contact with it, otherwise
   * it starts by default on the highest year").
   *
   * **This separates two questions the upper handle had been answering at once.**
   * `pointAt` has always taken position from `dateTo` and dimming from the whole
   * range, and said so — but that made "which saints does my window reach" and
   * "what year am I watching" one control, so a reader who wanted to see the
   * eleventh century move had to shrink their window to a single year to do it.
   * The triangle is the second question given its own handle: the range still
   * decides who is lit, and this decides where they stand.
   *
   * It lives inside the range and is pushed by it rather than pushing back, which
   * is the author's own rule and the only one that keeps the control honest — a
   * "now" outside the window you are looking at is a claim about a year the map
   * has greyed out.
   *
   * `null` until the corpus's span is known, then the top of the range.
   */
  playhead: null,

  /** What the last paint drew, in CSS px - the press's hit-map and the labels'. */
  drawnDots: [],

  /**
   * What the last paint drew for blobs — `{id, marks, cx, cy, hull}` per ready
   * blob, open or closed — the same "the draw pass writes the hit-map"
   * contract `drawnDots` already keeps, so `blobAt` (press.js) and the hover
   * handler read this rather than recomputing hulls of their own.
   */
  drawnBlobs: [],

  /**
   * Which blob the pointer is currently over, on a device that *has* hover
   * (author, 2026-09-04: "on desktop only, when you hover your mouse over a
   * blob, its the same function as moving the centre of the screen over the
   * blob"). `null` off a blob, on a touch device, or once the pointer has left
   * the canvas — `paintCanvas` reads it before falling back to the screen
   * centre, never instead of that fallback, since a mouse that has moved off
   * every blob still has a screen centre to answer to.
   */
  hoveredBlobId: null,

  /**
   * Which blob the last paint actually drew open — `openBlob`'s own id,
   * mirroring `drawnDots`/`drawnBlobs`. `wirePress` reads this to tell a dot
   * that merely sits inside a *closed* blob (no name on screen to have aimed
   * at) from one the reader can actually see and mean to select.
   */
  openBlobId: null,

  /**
   * The saint the reader has chosen, by slug, or `null`.
   *
   * **A press on a dot selects rather than navigates** (author, 2026-08-31),
   * which reverses "a dot is a door" (2026-08-30, Amendment 77) — the door is
   * now the `Profile ›` button that selection puts beside the name, and the
   * press itself buys the reader the thing a map is for: the saint centred,
   * named whatever the zoom, and their journey drawn. Reset by `render`, like
   * the view and unlike the timeline's range: arriving at the map with someone
   * still picked out from three pages ago is the same disorientation
   * `defaultView` exists to avoid.
   */
  selected: null,

  /**
   * The rail walk in progress: `{ slug, start }`, or `null`. Module state for
   * the same reason `selected` is — the paint pass is a pure function of it,
   * and `destroy` has to be able to end it.
   */
  railPlay: null,

  /**
   * The saint the map is *attending to*, which is not the same as `selected`
   * and is why this exists. `selected` deliberately arrives only when the
   * flight lands — the author's own order, "first centres you smoothly on them
   * and then shows their path" — but the dimming has to begin at the press or
   * it is not happening "as the screen centres". So the press sets this, the
   * fade in paint.js reads it, and `selected` still waits for the landing.
   */
  focus: null,

  /**
   * Which blob is open — the one place on the picture, across every coordinate
   * with more than `BLOB_MAX` saints, whose own members are currently named
   * (author, 2026-09-04, and see `paintCanvas`'s own comment on `blobActiveAt`
   * for the hysteresis this exists to hold). Persists across paints for exactly
   * the reason `selected` and `focus` do: which blob is open is a fact about
   * the visit, not about one frame, and recomputing it from nothing every paint
   * would have nothing to be sticky *against*.
   */
  activeBlobId: null,

  /**
   * The chosen rate, held for the visit beside `movement` and the range — a
   * speed is a way of watching rather than a fact about a saint, so it survives
   * a trip to a profile and back and is not persisted past a reload.
   */
  // `SPEEDS[0]` (motion.js), written out so this module imports nothing of the map's own.
  speed: 1,

  /** The self-scheduled frame that keeps fades moving after the gesture or
   *  event that started them has long since finished. `null` whenever every
   *  label has reached its target — nothing runs while the map is at rest. */
  fadeFrame: null,

  /**
   * **Whether the dots move with the years at all** (author, 2026-09-01: "Only
   * display death location, unless you tick a box in the bottom left called
   * 'Movement'"). Off is the default and the resting state of the map: the
   * timeline dims, and nothing walks. Held for the visit like the range, and
   * unlike the selection — it is a way of reading the map rather than a thing
   * the reader is looking at.
   *
   * **It is opt-in because it draws more than the corpus states.** Between two
   * places a saint is recorded at, the line the dot takes is nobody's finding;
   * a track's legs say so in each waypoint's own `note`, and for a saint
   * without a track there is no note to say it in. Behind a box the reader
   * ticks, that is a mode with a name on it rather than a claim the map makes
   * on its own.
   */
  movement: false,

  /**
   * **Whether a saint the reader's own span has passed, or not yet reached, is
   * shown as well as marked** (author, 2026-09-01: "add a filter button which
   * opens more options, like a tickbox for showing unborn saints and one for
   * showing dead saints. by default they are not shown. however even with these
   * boxes unticked, you still see a dot").
   *
   * That last sentence is the whole design of it, and it is why these are not
   * filters in the ordinary sense: **nothing is ever removed from the picture**.
   * Unticked, a saint outside the range keeps their dot — the timeline has dimmed
   * rather than removed since 2026-08-31 and still does — and loses the two
   * things that are a *claim* about them: their name, and the halo that says how
   * sure the corpus is of the place. Ticked, they get both back and read as any
   * other saint the range does reach.
   *
   * So the reader's default map answers "who belongs to these years", and the
   * boxes turn it into "and who else is on this ground". Both are held for the
   * visit like `movement` and the range, and unlike the selection: they are a
   * way of reading the map rather than a thing the reader is looking at.
   */
  showPast: false,

  showFuture: false,

  /*
   * Where the map is looking. Reset on every render rather than held across
   * visits: the range and Movement hold for the visit because they are questions
   * the reader asked, but arriving at the map zoomed into a corner you left three
   * pages ago is disorienting rather than helpful. `lib/map-view.js` owns the
   * arithmetic and `tests/map-view.test.mjs` pins it.
   */
  view: HOME,

  /**
   * What "Reset" and the first paint return to — `HOME` on an axis the box
   * cannot move on at scale 1, but nudged toward the located corpus's own
   * centre on whichever axis can (2026-08-31, fixing a real disappearing-dot
   * bug: `HOME`'s `cx`/`cy` of 0.5 is the equator and the prime meridian,
   * which is mid-ocean and nowhere near this corpus. Every zoom the + button
   * and the keyboard do is anchored on the screen's own centre, never on a
   * dot — that is what makes the anchor predictable rather than surprising —
   * so a reader who presses + from an equator-centred rest view zooms toward
   * empty sea, and a dot that started near the frame's edge, Martha of
   * Diveyevo among them (55°N, close to the top of a landscape window's
   * cropped vertical band at rest), is off the top of the screen within two
   * or three presses and gone at every scale after. Centring the rest view on
   * the data itself means the screen's centre already has something in it,
   * so the same anchor zooms toward the corpus instead of away from it).
   * Computed once per render from `withPlace`, not `visible()`: the timeline
   * narrows what is drawn, not where the reader was looking, so dragging it
   * must not also swing the frame around.
   */
  homeView: HOME,
};

/**
 * The year the movement mechanic reads: the triangle where there is one, the
 * upper handle otherwise.
 *
 * The fallback is not a fallback for long — `playhead` is set the moment bounds
 * exist — but it is what keeps a map with no timeline at all (a corpus with no
 * dated saint in it) drawing dots rather than throwing.
 */
export const shownYear = () => (map.playhead === null ? map.dateTo : map.playhead);

/**
 * Longitude and latitude to a fraction of the *box as it is currently framed* —
 * the projection, then the view on top of it. Two pure functions and this one
 * composition, so "where is Athens in the world" and "which part of the world
 * am I looking at" never get tangled together.
 */
export const place = (lon, lat, frame) => {
  const p = project(lon, lat);
  return toScreen(map.view, p.x, p.y, frame);
};

/**
 * The cover frame for the canvas as it currently stands — how much of the world
 * each axis shows at scale 1. The stage is the window, so this changes with the
 * window and cannot be computed once: every gesture and every repaint asks
 * again. Without it the clamps and the zoom anchor would both be doing their
 * arithmetic against a box shape the map does not have.
 */
export const frameOf = (canvas) => {
  const box = canvas.getBoundingClientRect();
  return coverFractions(box.width, box.height, ASPECT);
};

/**
 * How far this picture may zoom. Not a constant, because the ceiling is a
 * claim about what the reader can *resolve*: `MAX_SCALE` buys about fourteen
 * pixels between two saints who share a coordinate on a 1280 px desk and four
 * on a 360 px phone, which is why the crowd was still a smudge there (author,
 * 2026-09-01: "match zoom capabilities on mobile to what we now have on
 * desktop, because we cant see the individual dots on mobile"). See
 * `maxScaleFor` for what it does and does not equalise.
 */
export const ceilingOf = (canvas) => maxScaleFor(canvas.getBoundingClientRect().width);

/** A live-region announcement for something only the picture shows. */
export function announce(el, message) {
  let box = el.querySelector('[data-map-say]');
  if (!box) {
    box = document.createElement('p');
    box.className = 'sr-only';
    box.setAttribute('aria-live', 'polite');
    box.dataset.mapSay = '';
    el.appendChild(box);
  }
  box.textContent = message;
}

