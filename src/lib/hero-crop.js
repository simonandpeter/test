/**
 * How tall the Daily page's main saint card draws an icon, and where it crops
 * from when it has to.
 *
 * Its own module because it is arithmetic with two author-set constants in it
 * and one genuinely unreachable branch — both of which want a unit test, and
 * neither of which can have one while they live inside a view that imports the
 * DOM. `views/daily/panel.js` is the only caller.
 */

/**
 * The tallest shape the card will draw (author, 2026-09-01: "don't crop the
 * main saint image on Daily page unless it exceeds an aspect ratio of 1:1.6,
 * that's the maximum height", and later "Tallest aspect ratio allowed for this
 * main saint card would be 1:1.6").
 *
 * Height over width, so 1:1.6 across-and-down is 1.6 here.
 */
export const MAX_HERO_RATIO = 1.6;

/**
 * And the widest (author, same instruction: "widest would be 2:1"). A panorama
 * in the hero's column is a letterbox with a saint somewhere in it; held to 2:1
 * it is still a wide picture and still a picture of someone.
 *
 * **Nothing in the corpus reaches this today** — the widest of the 130 icons is
 * 0.62, comfortably inside it, and the eleven that are cropped are all cropped
 * by the ceiling above. Said plainly rather than left looking covered: the rule
 * is here because a corpus grows, and the unit test is what exercises it.
 */
export const MIN_HERO_RATIO = 0.5;

/**
 * The drawn height and the crop anchor for one icon.
 *
 * The anchor is not a preference each way — it is the same rule about where the
 * subject is (author: "For really tall images, crop them favouring the top
 * edge, and for really wide images crop them favouring the centre"). A tall
 * icon is a standing figure whose face is at the top, so what it can afford to
 * lose is its feet. A wide one is a scene, and its subject is in the middle;
 * taking the crop off one end would be picking a side of a composition the
 * painter balanced.
 *
 * An icon inside both limits is drawn at its own shape and not cropped at all,
 * so the anchor it is given never comes into play — it is the top, because that
 * is what an uncropped `cover` box has always been given here.
 */
export function heroCrop(image) {
  if (!image?.w || !image?.h) return { height: 0, focus: '50% 0' };
  const tall = image.w * MAX_HERO_RATIO;
  const wide = image.w * MIN_HERO_RATIO;
  return {
    height: Math.min(Math.max(image.h, wide), tall),
    focus: image.h < wide ? '50% 50%' : '50% 0',
  };
}

/**
 * The same two limits, for **every other card that draws a saint** (author,
 * 2026-09-02: "apply the same aspect ratio limitations to crop any saint card
 * display (on daily page and on all saints page) in the same way it applies to
 * the main saint card on Daily page desktop").
 *
 * The Index's cards, the carousel's columns and the Daily register's cards
 * each drew an icon at whatever shape it happened to be, which is how a 1:3
 * scan became a card three screens tall in a grid of ordinary ones. The rule
 * the hero has had since 2026-09-01 is the rule now: nothing taller than
 * 1:1.6, nothing wider than 2:1, cropped from the top when tall and from the
 * centre when wide.
 *
 * **Returned as an aspect rather than a height**, because that is what the
 * three callers all want: a box's `aspect-ratio`, and the packers' own
 * arithmetic, are both width-over-height. `heroCrop`'s height is the same
 * number seen from the other side — the hero needs a height because its column
 * is derived from one.
 *
 * The Daily page's *own* main card on a phone is deliberately not a caller:
 * below 620 px it keeps the 3:2 band it was given (calendar.css), which is a
 * separate instruction about a different surface.
 */
export function cardCrop(image) {
  const { height, focus } = heroCrop(image);
  if (!height) return { aspect: null, focus };
  /*
   * **A picture inside both limits keeps the manifest's own number**, and it
   * has to be that number rather than an equal one computed here: the build
   * rounds `aspect`, the grid reserves a card's height from it, and the
   * stylesheet draws the box from whatever this returns. Recomputing `w / h`
   * gives a value a few decimals from the stored one, the two round different
   * ways, and the card overflows its own reserved block by a pixel — which is
   * exactly what `a card lifespan is one line` reported the moment this
   * shipped. Only the eleven icons past the limits get a new shape.
   */
  if (height === image.h && image.aspect) return { aspect: image.aspect, focus };
  return { aspect: image.w / height, focus };
}
