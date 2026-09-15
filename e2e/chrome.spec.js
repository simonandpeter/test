import { devices } from '@playwright/test';
import { coldFace, test, expect } from './fixtures.js';
import {
  DETAIL,
  EMPTY,
  INDEX,
  POPULATED,
  aDayThatIsNotToday,
  answered,
  desk,
  facet,
  openChooser,
  panelSettled,
  ready,
  searchMode,
  swipe,
} from './helpers.js';

/**
 * The chrome: the header, its two choosers, the coachmarks, the shelf and the
 * theme.
 */

// **Every spec file needs this**: dropping it hands these tests the carousel
// instead of the search face they were written about (`searchMode`, helpers.js).
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

/**
 * **Where the shelf is read.** `mountShelves` has exactly one caller —
 * `views/saint.js`, below 1024 px, where a phone reaching the end of a life
 * would otherwise meet a page that stops. So these tests state the surface
 * rather than assume it: a narrow window and a saint's page. The width is the
 * one thing that had to be said out loud, because a desk keeps its search column
 * and is deliberately given no shelf.
 *
 * `except` drops the page's own slug from the shelf, so the saint this stands on
 * is never one of the saints the test has just read.
 *
 */
const SHELF_HOST = '/saints/christopher';

const onShelfPage = async (page) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(SHELF_HOST, { waitUntil: 'networkidle' });
};

/**
 * Where a shelf row is, once it has stopped moving. Three things have to be
 * true before a pointer can be aimed at one, and none is true the moment the
 * navigation settles:
 *
 *  - the shelf is built from two IndexedDB reads *after* the page has painted;
 *  - opening the saint records the visit, which repaints the shelf a beat
 *    later — so a row measured straight away is about to be replaced, and a rect
 *    read across that repaint comes back `null`;
 *  - it is the last thing on the page, so its coordinate is below the fold and
 *    the mouse would clamp away from it.
 *
 * So: wait for the row, bring it into the glass, and take the rect only once two
 * consecutive readings agree.
 */
const settledBox = async (locator) => {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const read = () =>
    locator.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    });
  let last = await read();
  for (let i = 0; i < 20; i += 1) {
    const now = await read();
    if (now.width > 0 && Math.abs(now.y - last.y) < 1 && Math.abs(now.x - last.x) < 1) return now;
    last = now;
  }
  return last;
};

test('Continue reading reappears after a saint has been opened', async ({ page }) => {
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await onShelfPage(page);

  const shelf = page.locator('[data-shelves]');
  await expect(shelf).toContainText('Continue reading');
  await expect(shelf.locator('a[data-prefetch="moses-the-hungarian"]')).toHaveCount(1);

  // The shelf wears the Index's own row dress: the same card classes, so the two
  // read as one register. The × below is the only control on the row.
  const shelfRow = shelf.locator('.index-card.is-row.shelf-row').first();
  await expect(shelfRow).toBeVisible();
  await expect(shelfRow.locator('.index-name')).toContainText('Moses the Hungarian');
  await expect(shelfRow.locator('.bookmark')).toHaveCount(0);
  /*
   * The × is the desktop's own affordance — a mouse has the swipe too, but a
   * visible control is the faster hand where there is a cursor. It is the same
   * button either way: always in the markup, carrying the whole sentence as its
   * accessible name, let out of its clip by `(hover: hover) and (pointer: fine)`.
   *
   * **Both of this suite's projects are Desktop Chrome** — mobile-360 is a narrow
   * viewport, not a touch device — so both take the hovering branch, and the
   * query is read at runtime rather than assumed from the project's name. The
   * touch half has a test of its own below, on a real touch device, because a
   * branch asserted only where it cannot run is not asserted at all.
   */
  const placed = await shelfRow.evaluate((row) => {
    const card = row.getBoundingClientRect();
    const quiet = row.querySelector('.shelf-remove');
    const q = quiet.getBoundingClientRect();
    return {
      card,
      quietWidth: q.width,
      quietRight: q.right,
      quietMid: q.top + q.height / 2,
      quietText: quiet.textContent.trim(),
      glyph: getComputedStyle(quiet, '::after').content,
      hovers: matchMedia('(hover: hover) and (pointer: fine)').matches,
    };
  });
  // The accessible name is the whole action in both worlds: out of the row's
  // context an "×" says nothing.
  expect(placed.quietText).toBe('Remove Moses the Hungarian from Continue reading');
  const cardMid = placed.card.top + placed.card.height / 2;
  // Every claim the × makes on its own account: an ×, visible where there is a
  // cursor to aim it, centred on the row, at the trailing edge, carrying the
  // whole sentence as its name.
  if (placed.hovers) {
    expect(placed.quietWidth).toBeGreaterThan(8);
    expect(placed.glyph).toContain('×');
    expect(Math.abs(placed.quietMid - cardMid)).toBeLessThan(2);
    expect(placed.card.right - placed.quietRight).toBeLessThan(20);
  } else {
    // Not reached by either project today; kept so this test still says the
    // truth if one ever runs on a touch device. The touch case is asserted
    // properly below.
    expect(placed.quietWidth).toBeLessThan(3);
  }

  // And it can still be dismissed without a gesture: a shelf the reader
  // cannot clear is a nag, and a shelf only a swipe can clear strands
  // everyone who cannot swipe (STRUCTURE.md). Focus reveals the control.
  await shelf.locator('.shelf-remove').first().focus();
  await expect(shelf.locator('.shelf-remove').first()).toBeVisible();
  await shelf.locator('.shelf-remove').first().click();
  await expect(shelf).not.toContainText('Continue reading');
});

test('a Continue reading row is swiped away, and a short push springs back', async ({ page }) => {
  /*
   * Pointer events, so the mouse does it too. **The spring-back half is the one
   * worth pinning hardest**: a row that vanished on any push at all would make
   * the shelf unscrollable by touch, and a row that never moved would read as a
   * dead press.
   */
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await onShelfPage(page);

  const rows = page.locator('.shelf-row');
  await expect(rows).toHaveCount(2);
  // The push starts on the saint's *name*, which is where a reader's finger
  // or cursor lands and — as the first rendering of this gesture showed — the
  // The push starts on the saint's *name*, which is where a reader's finger or
  // cursor lands and the one place it can be stolen: a row is a link with a
  // picture in it, and dragging a link starts a native drag that cancels the
  // pointer stream. Pushing from the thumbnail would pass with that defect
  // present. `pause` is what separates a haul from a flick — the shelf measures
  // the last 80 ms of travel at the release.
  const push = async (distance, pause = 0) => {
    const name = rows.first().locator('.index-name');
    const box = await settledBox(name);
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i += 1) {
      await page.mouse.move(x + (distance * i) / 8, y);
      if (pause) await page.waitForTimeout(pause);
    }
    await page.mouse.up();
  };

  /*
   * A short push is two different gestures and the shelf reads them differently:
   * a short *slow* one is a reader nudging a row and it springs back; a short
   * *fast* one is a flick and the row goes. So this pushes slowly, with the moves
   * spaced in time, and the flick has a test of its own below.
   *
   */
  await push(70, 30);
  // A real wait, and it has to be: a removal is a flight and only then a
  // repaint, so asserting the count straight after the push passes while the row
  // is still on screen on its way out. (Caught by backing the threshold out to
  // zero and watching this test pass regardless.)
  await page.waitForTimeout(500);
  await expect(rows).toHaveCount(2);
  // Home again, not left hanging where the hand let go.
  expect(await rows.first().evaluate((r) => r.style.transform || 'none')).toBe('none');
  // The swipe did not open the saint whose row it was pushed across: this is
  // still Christopher's page, which is the page the shelf is standing on.
  await expect(page).toHaveURL(/\/saints\/christopher/);

  await push(420, 30);
  await expect(rows).toHaveCount(1);
  await expect(page.locator('[data-shelves]')).toContainText('Continue reading');
});

test('on a touch device the shelf row carries no ×, and the swipe still clears it', async ({ browser }) => {
  /*
  /*
   * A phone keeps the swipe alone, because a control sized for a fingertip on a
   * 48 px row is how a reader clears a shelf they meant to scroll past.
   *
   * **This needs a real touch device** — both of the suite's projects are Desktop
   * Chrome, one merely narrow, and both report a fine hovering pointer, so the
   * media query that hides the × never fires there.
   */
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  // A Pixel is narrow enough to be given the shelf without being told to be.
  await page.goto(SHELF_HOST, { waitUntil: 'networkidle' });

  const row = page.locator('.shelf-row').first();
  await expect(row).toBeVisible();
  const seen = await row.evaluate((r) => {
    const quiet = r.querySelector('.shelf-remove');
    return {
      hovers: matchMedia('(hover: hover) and (pointer: fine)').matches,
      width: quiet.getBoundingClientRect().width,
      name: quiet.textContent.trim(),
    };
  });
  expect(seen.hovers).toBe(false);
  expect(seen.width).toBeLessThan(3);
  // Still named in full for the screen reader that meets it.
  expect(seen.name).toBe('Remove Moses the Hungarian from Continue reading');

  // And the gesture that replaced it works with a finger.
  const name = row.locator('.index-name');
  const box = await settledBox(name);
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (300 * i) / 8, y);
  await page.mouse.up();
  await expect(page.locator('.shelf-row')).toHaveCount(0);
  await ctx.close();
});

test('under reduced motion a swiped row goes without flying', async ({ browser }) => {
  // Removed, not shortened: the travel is an animation and goes; the row is
  // still cleared, and nothing is left mid-flight.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await onShelfPage(page);
  const row = page.locator('.shelf-row').first();
  // The shelf is built from two IndexedDB reads after the page has painted, so
  // the row is not there the moment the navigation settles — on the Daily page
  // it was part of the first paint and nothing had to wait for it.
  await expect(row).toBeVisible();
  const name = row.locator('.index-name');
  const box = await settledBox(name);
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (420 * i) / 8, y);
  await page.mouse.up();
  await expect(page.locator('.shelf-row')).toHaveCount(0);
  await expect(page.locator('[data-shelves]')).not.toContainText('Continue reading');
  await ctx.close();
});

test('toggling the theme does not move the header, and the toggle is two-way', async ({ page }) => {
  // Two states, one geometry (author, 2026-08-22): the icon is the same box
  // either way, so pressing it moves nothing else on the page, and there is no
  // third, System, state to cycle through.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const header = page.locator('header.chrome');
  const toggle = page.locator('#theme-toggle');

  const measured = [];
  for (let i = 0; i < 3; i++) {
    measured.push({
      header: Math.round((await header.boundingBox()).height),
      button: Math.round((await toggle.boundingBox()).width),
      label: await toggle.getAttribute('aria-label'),
      dark: await page.evaluate(() => document.documentElement.classList.contains('dark')),
    });
    await toggle.click();
    await page.waitForTimeout(50);
  }
  expect(new Set(measured.map((m) => m.label)).size).toBe(2);
  expect(measured[0].dark).toBe(measured[2].dark);
  expect(measured[1].dark).toBe(!measured[0].dark);
  expect(new Set(measured.map((m) => m.header)).size, JSON.stringify(measured)).toBe(1);
  expect(new Set(measured.map((m) => m.button)).size, JSON.stringify(measured)).toBe(1);
});

test('the header carries no date, and the controls keep their places at both widths', async ({ page }) => {
  /*
   * Wide, the row is one line: the calendar control, then the language control
   * and the icon toggle. Narrow, it is **one line of chrome** — calendar, name,
   * language, theme — with the four pages centred on a row beneath, down to a
   * 320 px phone. So the "one line" assertion is the wide branch's alone.
   *
   * **The wide branch is measured in a wide utility face** (trap 2).
   * `--font-utility` is the reader's own system stack, so the same row is a
   * different width on every machine, and this row held one line on the desk
   * that built it while wrapping in CI, unseen, from the start. The face is
   * forced here and the native one printed to the log, so the assertion is one
   * width everywhere and the runner still says what its own face costs.
   *
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const nativeHeight = await page.locator('header.chrome').evaluate((h) => {
    // The nav, not the header: the header is set in the display serif and the
    // face that decides this row's width is the utility one the nav wears.
    const face = getComputedStyle(h.querySelector('.site-nav')).fontFamily.split(',')[0];
    return `${h.getBoundingClientRect().height.toFixed(2)} px, utility face ${face}`;
  });
  console.log(`[header, native utility face] ${nativeHeight}`);
  // DejaVu Sans is what a bare ubuntu runner has and is among the widest faces a
  // reader will meet; Verdana is its Windows/macOS equivalent in width, and
  // fontconfig aliases Verdana to DejaVu on Linux. Either way the header is
  // measured against the widest realistic chrome, not the local one.
  await page.addStyleTag({
    content: ':root { --font-utility: "DejaVu Sans", Verdana, sans-serif !important; }',
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator('.chrome-today')).toHaveCount(0);
  await expect(page.locator('#church-open')).toHaveText('Russian');
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', /Switch to the (dark|light) theme/);
  const m = await page.evaluate(() => {
    const box = (sel) => document.querySelector(sel).getBoundingClientRect();
    const header = box('header.chrome');
    const open = box('#church-open');
    const theme = box('#theme-toggle');
    const lang = box('#lang-open');
    const name = box('.site-name');
    const nav = box('.site-nav');
    const mid = (r) => r.top + r.height / 2;
    return {
      header: header.height,
      sameLine: Math.abs(mid(open) - mid(theme)) < 4,
      themeAfter: theme.left >= open.right,
      wide: innerWidth >= 760,
      // Narrow: one chrome line — calendar, name, language, theme, all on
      // the same centre — with the nav centred on its own row beneath.
      chromeOneLine:
        Math.abs(mid(open) - mid(name)) < 6 &&
        Math.abs(mid(open) - mid(lang)) < 6 &&
        Math.abs(mid(open) - mid(theme)) < 6,
      chromeInOrder: open.right <= name.left + 1 && name.right <= lang.left + 1 && lang.right <= theme.left + 1,
      nameCentred: Math.abs((name.left + name.right) / 2 - (header.left + header.right) / 2) < 12,
      navBelowChrome: nav.top >= open.bottom - 1,
      navCentred: Math.abs((nav.left + nav.right) / 2 - (header.left + header.right) / 2) < 12,
    };
  });
  if (m.wide) {
    expect(m.sameLine).toBe(true);
    expect(m.themeAfter).toBe(true);
    expect(m.header, `the header wrapped in a wide utility face: ${m.header.toFixed(2)} px`).toBeLessThan(64);
  } else {
    expect(m.chromeOneLine).toBe(true);
    expect(m.chromeInOrder).toBe(true);
    expect(m.nameCentred).toBe(true);
    expect(m.navBelowChrome).toBe(true);
    expect(m.navCentred).toBe(true);
  }
});

test('the chrome line holds down to a 320 px phone, in every language', async ({ browser }) => {
  /*
   * 320 px is the narrowest phone the site meets, and the name is the elastic
   * part: it gives up size and then tail rather than pushing a control off the
   * line, because a calendar control that says nothing is worse than a smaller
   * masthead.
   *
   * **The landmine**: a bare `1fr` track has an automatic minimum of min-content,
   * so a long name widens the track instead of ellipsising and prints straight
   * across the controls. `minmax(0, 1fr)` is the fix, and the same trap caught
   * the month's own span.
   */
  for (const [width, language] of [[320, 'en'], [360, 'ru'], [360, 'el'], [412, 'ro']]) {
    const ctx = await browser.newContext({ viewport: { width, height: 780 } });
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (l) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: l })),
      language,
    );
    await page.goto('/calendar/2026-09-01', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The widest realistic chrome, as the header's own test measures it.
    await page.addStyleTag({
      content: ':root { --font-utility: "DejaVu Sans", Verdana, sans-serif !important; }',
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const m = await page.evaluate(() => {
      const b = (sel) => document.querySelector(sel).getBoundingClientRect();
      const mid = (r) => r.top + r.height / 2;
      const cal = b('#church-open');
      const name = b('.site-name');
      const lang = b('#lang-open');
      const theme = b('#theme-toggle');
      return {
        level: Math.abs(mid(cal) - mid(theme)) < 6 && Math.abs(mid(cal) - mid(lang)) < 6 && Math.abs(mid(cal) - mid(name)) < 6,
        inOrder: cal.right <= name.left + 1 && name.right <= lang.left + 1 && lang.right <= theme.left + 1,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        nameVisible: name.width > 20,
      };
    });
    expect(m.level, `${language} at ${width}: the chrome line broke`).toBe(true);
    expect(m.inOrder, `${language} at ${width}: the name overran a control`).toBe(true);
    expect(m.overflow, `${language} at ${width}: the page overflowed`).toBe(0);
    expect(m.nameVisible, `${language} at ${width}: the name was squeezed away`).toBe(true);
    await ctx.close();
  }
});

test('the calendar is remembered, and the header changes it', async ({ page }) => {
  // One choice, written once and read everywhere (author, 2026-08-22). The
  // header's button names it, opens the three, and a press closes the panel
  // and hands the focus back.
  await answered(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  const open = page.locator('#church-open');
  await expect(open).toHaveText('Russian');
  await open.click();
  await expect(open).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#church-panel [data-church]')).toHaveCount(4);
  await expect(page.locator('#church-panel [data-church="russian"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.activeElement?.dataset?.church)).toBe('russian');

  await page.locator('#church-panel [data-church="greek"]').click();
  await expect(page.locator('#church-panel')).toBeHidden();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('church-open');
  await expect(open).toHaveText('Greek');
  await expect(page.locator('.empty-day')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('greek');
  await expect(page.locator('#church-open')).toHaveText('Greek');
  await expect(page.locator('[data-ask]')).toHaveCount(0);
});

test('an answered panel shrinks into the control that changes it', async ({ page }) => {
  /*
   * A teaching gesture, not decoration: the site hides both answers behind two
   * small controls in the header, and a reader who answers and never sees where
   * the answer went has to hunt for it next time. So the assertion is about
   * *direction* — the panel is travelling towards the control, and has not
   * simply faded where it stood.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  const button = page.locator('#church-open');
  const before = await button.boundingBox();
  await button.click();
  // The panel arrives with a flight of its own, so let it land before asking
  // where it is: a box halfway through arriving is at neither end of its
  // journey, and the direction below is measured from this rect.
  await panelSettled(page);
  const panel = page.locator('#church-panel .church-panel-inner');
  const from = await panel.boundingBox();
  await page.locator('#church-panel [data-church="greek"]').click();

  // One frame in: the flight is started in a requestAnimationFrame, so the
  // transform is not on the box the instant the press returns.
  await page.waitForTimeout(60);
  const mid = await page.evaluate(() => {
    const el = document.querySelector('#church-panel .church-panel-inner');
    if (!el) return null;
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return { dx: m.m41, dy: m.m42, scale: m.a, opacity: +getComputedStyle(el).opacity };
  });
  // Smaller, fainter, and moving up and to the right — where the control is
  // on a desktop header.
  expect(mid.scale, 'shrinking').toBeLessThan(1);
  expect(mid.opacity, 'fading').toBeLessThan(1);
  expect(mid.dy, 'towards the header').toBeLessThan(0);
  expect(Math.sign(mid.dx), 'towards the control').toBe(Math.sign(before.x - (from.x + from.width / 2)));

  // And it lands: the panel is closed, emptied, and the choice took.
  await expect(page.locator('#church-panel')).toBeHidden();
  await expect(button).toHaveText('Greek');
});

test('under reduced motion the panel does not fly, it is simply gone', async ({ browser }) => {
  // Removed, not shortened (STRUCTURE.md). The lesson the flight carried is
  // not lost with it: the control's accessible name says the whole sentence.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  await page.locator('#church-panel [data-church="greek"]').click();
  // No frame of flight at all: the panel is hidden by the time the click
  // returns, where an animated close would still be mid-transform.
  expect(await page.evaluate(() => document.querySelector('#church-panel').hidden)).toBe(true);
  await expect(page.locator('#church-open')).toHaveText('Greek');
  await expect(page.locator('#church-open')).toHaveAttribute(
    'aria-label',
    'Greek calendar - change which church’s calendar the site shows',
  );
  await ctx.close();
});

test('a first visit is shown where the two controls are, and the day is not held back', async ({ page }) => {
  /*
   * **This reverses the first-visit gate**, at the author's instruction of
   * 2026-08-26: "Replace the language and calendar pop-ups on first opening
   * with a fade-in glowing tool tip with an arrow pointing to each of the two
   * buttons, explaining you can select your church from here, and language from
   * here."
   *
   * What the gate was for is worth restating, because it was not decoration.
   * From 2026-08-21 the calendar asked which church the reader kept and showed
   * *nothing* until it was answered — no strip, no date, no day — on the
   * argument that a calendar with no church chosen is the site picking one and
   * not saying so. A second block joined it on 2026-08-25 evening for the
   * language, and that one was an offer rather than a gate, because English is
   * a default the reader is already reading.
   *
   * The argument is answered rather than dropped, and this is where that is
   * pinned. The guess is `defaultChurch()` — the reader's own browser language,
   * never written to settings — the header has named the church on every page
   * since 2026-08-24, and a mark under that control says which control changes
   * it. `hasChosen()` is untouched: the marks come back next visit, and the
   * three pages that can do without a calendar still do (`chosenChurch`).
   */
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  // The gate itself, gone: no panel, no blocks, and nothing hidden behind them.
  await expect(page.locator('[data-ask]')).toHaveCount(0);
  await expect(page.locator('.cal-gate')).toHaveCount(0);
  /*
     * The picker, whichever grain this width shows: the rail on a phone, the
     * month grid on a desktop since 2026-09-02 ("just display monthly only on
     * desktop, no weekly display"). What this line is really saying is that
     * the day is not held back behind a gate, which is true of either.
     */
    await expect(page.locator('.week-strip:visible, .cal-month:visible').first()).toBeVisible();
  await expect(page.locator('.hero-name')).toContainText('Augustine');

  // Two marks, each under the control it names, each with a way out.
  const marks = page.locator('.coachmark');
  await expect(marks).toHaveCount(2);
  await expect(marks.first()).toContainText('Pick your church calendar.');
  await expect(marks.last()).toContainText('Pick your language.');
  await expect(page.locator('.coachmark-close')).toHaveCount(2);

  // Each points at its own control: the arrow's x is set on the box after the
  // box has been clamped into the viewport, so this is the only honest way to
  // ask where a mark is pointing.
  const pointing = await page.evaluate(() =>
    [...document.querySelectorAll('.coachmark')].map((el) => {
      const box = el.getBoundingClientRect();
      const arrow = parseFloat(getComputedStyle(el).getPropertyValue('--arrow-x'));
      return box.left + arrow;
    }),
  );
  for (const [i, id] of ['church-open', 'lang-open'].entries()) {
    const target = await page.locator(`#${id}`).boundingBox();
    expect(Math.abs(pointing[i] - (target.x + target.width / 2))).toBeLessThan(2);
  }

  // A mark is still not an answer: nothing about the *church* is stored by
  // being shown one, which is what keeps the guess a guess.
  // Not `toBeUndefined`: since 2026-08-27 being *shown* a mark writes the
  // seen list, and `writeSetting` persists the whole settings object, so
  // `church` is stored as an explicit null. Every reader of it — `hasChosen`
  // above all — asks whether it is null, so nothing about the guess changes.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}').church ?? null)).toBeNull();
  await page.locator('.coachmark-close').first().click();
  await expect(marks).toHaveCount(1);

  // Opening either control takes both marks, because they are one message in
  // two halves.
  await openChooser(page);
  await expect(page.locator('.coachmark')).toHaveCount(0);
  await page.locator('#church-panel [data-church="romanian"]').click();
  await expect(page.locator('#church-open')).toHaveText('Romanian');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).church)).toBe('romanian');
});

test('a coachmark goes on the second scroll, and not on the first', async ({ page }) => {
  /*
   * Author, 2026-08-26: "It also disappears after the second scroll input, down
   * or up." Two, not one, and the reason is that the first scroll is a reader
   * looking at the page they arrived on — dismissing on it would mean most
   * readers never read the mark at all.
   *
   * What counts as *one* input is the part worth pinning: a wheel notch fires
   * scroll events every frame for a few hundred milliseconds, so counting raw
   * events would spend both on one gesture. ui/coachmark.js separates them by a
   * pause, which is what the waits below are.
   */
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto('/calendar/2026-09-20', { waitUntil: 'networkidle' });
  await expect(page.locator('.coachmark')).toHaveCount(2);

  /*
   * The pointer has to be over something that scrolls. Since 2026-09-01 the
   * Daily page's own columns carry the scrolling and the page does not, so a
   * wheel spun over the header — where the mouse sits by default — reaches
   * nothing at all. `ui/coachmark.js` takes the event from whichever element
   * scrolled; this puts the mouse over one.
   */
  const column = await page.locator('.cal-main').boundingBox();
  await page.mouse.move(column.x + column.width / 2, column.y + column.height / 2);

  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(600);
  await expect(page.locator('.coachmark')).toHaveCount(2);

  // Up counts as readily as down: it is an input, not a direction.
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(600);
  await expect(page.locator('.coachmark')).toHaveCount(0);
});

test('on a first visit the two marks clear the fold, and so does the day', async ({ page }) => {
  /*
   * The exception this test was written for is gone with the gate (2026-08-26).
   * From 2026-08-21 to 2026-08-26 a first visit saw the question and nothing
   * else, and what had to clear the fold was the question and every one of its
   * answers — which is why the rule above about the saint's name clearing the
   * fold had to make an exception for the first visit.
   *
   * There is no exception now, and that is the stronger claim: a first visit
   * gets the day *and* is told where the two controls are. Both marks stand
   * clear of the fold on a 360x780 phone, and so does the saint's own name
   * under them, which no first visit could see at all before.
   *
   * The marks must also not overlap each other. They sit under controls at
   * opposite ends of the header, and a 30ch box under each overlapped in the
   * middle of a 390 px screen — the one drawn second covering the ×  of the one
   * drawn first. Found by rendering it and looking; kept honest here.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const boxes = [];
  for (let i = 0; i < 2; i += 1) boxes.push(await page.locator('.coachmark').nth(i).boundingBox());
  for (const box of boxes) expect(box.y + box.height).toBeLessThan(780);

  const [a, b] = boxes.sort((x, y) => x.x - y.x);
  expect(a.x + a.width, 'the two marks overlap').toBeLessThanOrEqual(b.x);

  const name = await page.locator('.hero-name').boundingBox();
  expect(name.y).toBeLessThan(780);
});

/* ---- the 2026-08-22 round, Phase 2: the header, the selection, one calendar -- */

test('a first visit opens on a calendar it did not choose, and is told which', async ({ page }) => {
  /*
   * Addendum H7–H8 said the strip, the date and the day stay hidden until the
   * reader has said which calendar they keep (author, 2026-08-22). **Superseded
   * 2026-08-26**, with the coachmarks: the day opens on a guessed calendar and
   * the guess is named in the header, which is the whole of what makes it
   * honest. The test is kept and turned around, because the property it guards
   * is the same one — the reader must never be shown a calendar without being
   * told which it is.
   *
   * The guess is the browser's own language and nothing else about the reader.
   * This context is en-US, which none of the four churches claims, so it falls
   * through to Russian — the calendar with the most to show: 426 of the 742
   * folders and day records running to January where the Greek and Serbian stop
   * in September.
   */
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  /*
     * The picker, whichever grain this width shows: the rail on a phone, the
     * month grid on a desktop since 2026-09-02 ("just display monthly only on
     * desktop, no weekly display"). What this line is really saying is that
     * the day is not held back behind a gate, which is true of either.
     */
    await expect(page.locator('.week-strip:visible, .cal-month:visible').first()).toBeVisible();
  await expect(page.locator('.hero-name')).toContainText('Augustine');
  await expect(page.locator('#church-open')).toHaveText('Russian');
  // And it is a guess, not an answer: nothing is written until the reader says.
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}'));
  expect(before.church ?? null).toBeNull();
  await expect(page.locator('.coachmark')).toHaveCount(2);

  await openChooser(page);
  await page.locator('#church-panel [data-church="russian"]').click();
  // Choosing the same calendar the guess had picked still changes something:
  // it is stored, and the marks stop.
  /*
     * The picker, whichever grain this width shows: the rail on a phone, the
     * month grid on a desktop since 2026-09-02 ("just display monthly only on
     * desktop, no weekly display"). What this line is really saying is that
     * the day is not held back behind a gate, which is true of either.
     */
    await expect(page.locator('.week-strip:visible, .cal-month:visible').first()).toBeVisible();
  await expect(page.locator('[data-which]')).toHaveCount(0);
  await expect(page.locator('#church-open')).toHaveText('Russian');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')));
  expect(stored.church).toBe('russian');
  expect(stored.traditions).toBeUndefined();
  await page.reload({ waitUntil: 'networkidle' });
  // Both marks were shown on the first load, so neither is owed again — see
  // "a coachmark is shown once, and a guess is still not an answer" below.
  await expect(page.locator('.coachmark')).toHaveCount(0);
});

test('the theme follows the system until it is touched, and holds once it is', async ({ browser }) => {
  // Addendum H5, answer 4. A stored 'system' from the three-way days reads as
  // untouched; the first press fixes a choice the system no longer moves.
  const ctx = await browser.newContext({ colorScheme: 'dark' });
  const page = await ctx.newPage();
  await searchMode(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to the light theme');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}').theme ?? null)).toBe(null);

  // Untouched: the system changes, the site follows, live.
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-label', 'Switch to the dark theme');

  // Touched: the choice holds against the system.
  await page.locator('#theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings')).theme)).toBe('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
  await ctx.close();
});

test('the site is named in the reader\u2019s own language, and the habit page is Daily', async ({ page }) => {
  // The name in the head and the page's nav label. The head and the corner
  // carried two deliberately different names until the author ended the split;
  // both are AGIOS now, in every language. The route stays /calendar so no link
  // breaks.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/AGIOS/);
  // The corner is outlines rather than text since 2026-08-28, so its name is
  // the mark's label. What this test is about — that the corner carries the
  // site's name and the nav's word for the habit page moves — is unchanged.
  await expect(page.locator('.site-name .brand-mark')).toHaveAttribute('aria-label', 'AGIOS');
  // On a day that is not today the button reads **Today**. The claim here is
  // about the *base* word, so it is read where the base word shows: on today
  // itself, and on any page that is not the Daily one.
  /*
   * `[aria-current="page"]` rather than `.first()` of every `href$="/"` link:
   * the phone's endless nav (`ui/nav-scroll.js`) renders the calendar link twice
   * more as plain, non-fading buffered clones, and `.first()` in DOM order meets
   * one of those before the one real link that ever wears `Today`. Exactly one
   * link answers `aria-current` at any width.
   */
  await page.goto(await aDayThatIsNotToday(page), { waitUntil: 'networkidle' });
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Today');
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Daily');
  await expect(page.locator('.site-nav')).not.toContainText('Calendar');
});

/* ---- the round of 2026-08-24 ----------------------------- */

test('the veil names the site the way the header does', async ({ page }) => {
  /*
   * The loading veil and the corner are the same words. The veil is removed 300
   * ms after the manifest lands, so it is read out of the served HTML rather
   * than raced for in a live page.
   */
  const html = await (await page.request.get('/')).text();
  /*
  /*
   * **The veil carries the mark, not the words**, and it is read out of the
   * served HTML rather than the live page: the veil is what a reader sees before
   * the modules parse, so the name has to be in the markup.
   */
  expect(html).toContain('class="veil-name" data-site-name><svg');
  expect(html).not.toContain('AGIOS</div>');
  // And the head carries the same name. This asserted the other half of a
  // two-name split until 2026-09-12; it now asserts that there is one name.
  expect(html).toContain('<title>AGIOS</title>');

  /*
   * **And neither printed name follows the language.** The name comes from
   * exactly one place — the outlined mark `scripts/make_wordmark.py` draws — and
   * that place is not the pack. STRUCTURE.md §3 "The name" lists every surface it
   * reaches; the markup's own English is simply right rather than a placeholder
   * the pack paints over, which is why the assertion above can read it out of
   * the served HTML at all.
   */
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: 'ro' })),
  );
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  // The corner is outlines rather than text since 2026-08-28, so its name is
  // the mark's label. What this test is about — that the corner carries the
  // site's name and the nav's word for the habit page moves — is unchanged.
  await expect(page.locator('.site-name .brand-mark')).toHaveAttribute('aria-label', 'AGIOS');
  // And the tab carries the same name. It used to carry a second, translated
  // one, so this line asserts that there is only one name rather than two.
  await expect(page).toHaveTitle(/AGIOS/);
});

test('the site mark is the Orthodox cross, in gold by instruction', async ({ page }) => {
  /*
   * The eight-pointed cross: upright, titulus, crossbar, and the slanted
   * footrest, whose slant is the whole of what makes it Orthodox rather than
   * Latin.
   *
   * **Gold is spent here and nowhere else on the site** — STRUCTURE.md §2 records the
   * exception in place. So this pins the two gold tokens exactly, a mark
   * drifting to some other yellow being the failure now; the "spent nowhere
   * else" half has its own test over the rendered pages.
   *
   */
  const html = await (await page.request.get('/')).text();
  const href = html.match(/<link rel="icon" href="([^"]+)"/)?.[1];
  expect(href).toBeTruthy();
  const svg = decodeURIComponent(href.replace('data:image/svg+xml,', ''));
  // Three bars and a slanted footrest: the eight points.
  expect(svg.match(/<rect/g)).toHaveLength(3);
  expect(svg).toContain('<polygon');
  // The footrest's left end sits higher than its right — the good thief was at
  // Christ's right hand, which is the viewer's left. A level bar here would be
  // a Latin cross with an extra rung.
  const points = svg
    .match(/points='([^']+)'/)[1]
    .split(' ')
    .map((pair) => pair.split(',').map(Number));
  const xs = points.map((q) => q[0]);
  const leftTop = points.find(([x]) => x === Math.min(...xs));
  const rightTop = points.find(([x]) => x === Math.max(...xs));
  expect(leftTop[1]).toBeLessThan(rightTop[1]);
  // Gold, by instruction (author, 2026-08-25), and exactly the two tokens:
  // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here
  // until then.
  expect(svg.toLowerCase()).toContain('a98237');
  expect(svg.toLowerCase()).toContain('c79a4b');
  expect(svg).not.toContain('#221d19');
  // It flips rather than vanishing into a dark tab strip.
  expect(svg).toContain('prefers-color-scheme:dark');
});

test('the calendar chooser asks its question and offers the four, with nothing between', async ({ page }) => {
  /*
   * The paragraph under the heading is removed outright: it named the four
   * churches and their two calendars in prose directly above four buttons each
   * printing exactly that, so it said the choices twice and put four lines
   * between the question and the answer.
   *
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await openChooser(page);
  const panel = page.locator('#church-panel');
  await expect(panel.locator('.ask-heading')).toHaveText('Which calendar do you keep?');
  await expect(panel.locator('p')).toHaveCount(0);
  await expect(panel).not.toContainText('change it whenever you like');
});

test('the header names the church with a mark, not with the word calendar', async ({ page }) => {
  /*
   * The accessible name is the part that must not thin out with the visible
   * text: an icon says nothing to a screen reader, and the aria-label used to
   * swallow the church's name while the visible text carried it. It now says
   * which church as well as what a press does.
   *
   */
  await ready(page, { church: 'romanian' });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const open = page.locator('#church-open');
  await expect(open).toHaveText('Romanian');
  await expect(open.locator('svg')).toHaveCount(1);
  await expect(open).toHaveAttribute('aria-label', /Romanian calendar/);
  await expect(open).toHaveAttribute('aria-label', /change which church/i);
  /*
   * Shorter than the sentence it replaced, which was the point of the change.
   * **Scaled by the control's own size**: the bound was measured at 13.5 px type,
   * and a bound that ignores the type size stops being a claim about the *label*
   * and becomes one about the breakpoint.
   */
  const box = await open.boundingBox();
  const size = await open.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(box.width).toBeLessThan(130 * (size / 13.5));
});

test('About states the privacy policy, and states it as the code behaves', async ({ page }) => {
  /*
   * Written against lib/settings.js and lib/store.js rather than as boilerplate.
   * A privacy policy that has drifted from the code is worse than none, because
   * a reader has no way to tell.
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  const privacy = page.locator('section.privacy');
  await expect(privacy.locator('h2')).toHaveText('Privacy');
  await expect(privacy).toContainText('Nothing about you is collected');
  await expect(privacy).toContainText('no account to make');
  // The four kept things, each named.
  await expect(privacy).toContainText('Where you were reading');
  await expect(privacy).toContainText('saints you have saved');
  await expect(privacy).toContainText('church whose calendar you chose');
  await expect(privacy).toContainText('cards or rows');
  // And what is not done.
  await expect(privacy).toContainText('No analytics');
  await expect(privacy).toContainText('no cookies');
  await expect(privacy).toContainText('clearing the site');
  // The two honest footnotes: this site does not host itself, and the
  // readings link out.
  await expect(privacy).toContainText('GitHub Pages');
  await expect(privacy).toContainText('Bible Gateway');
});

/* ---- the site's language --------------------------------- */

test('the language control offers five, each naming itself in its own tongue', async ({ page }) => {
  /*
   * The panel offers each language in its own name — «Русский», not "Russian" —
   * because the reader who needs the control is precisely the one who may not
   * read the language the site is currently in. Each choice carries its own
   * `lang` so a screen reader pronounces it in that language.
   */
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const open = page.locator('#lang-open');
  await expect(open).toHaveText('EN');
  await expect(open.locator('svg')).toHaveCount(1);
  await expect(open).toHaveAttribute('aria-label', /English/);

  await open.click();
  const choices = page.locator('#lang-panel [data-language]');
  await expect(choices).toHaveCount(5);
  await expect(choices.locator('.choice-name')).toHaveText([
    'English', 'Русский', 'Română', 'Ελληνικά', 'Српски',
  ]);
  await expect(choices.nth(1)).toHaveAttribute('lang', 'ru');
  // The author's codes — GR and RS, not the BCP tags.
  await expect(choices.locator('.choice-calendar')).toHaveText(['EN', 'RU', 'RO', 'GR', 'RS']);
});

test('choosing Russian redraws the page in Russian, dates included, and it holds across a reload', async ({ page }) => {
  // Julian, not `ready()`'s own explicit-Gregorian default: the Dormition
  // fast this test reads (26 August civil) is dated by the Russian church's
  // own Julian reckoning, and a forced Gregorian reckoning here would price
  // the fast off the wrong 14 days entirely (see daily-panel.spec.js's own note
  // on this, and lib/church.js's `calendarFor`).
  // And above 1024 px, because below it the reckoning is Gregorian whatever
  // the church (author, 2026-09-12) and 26 August is then an ordinary day
  // with no fast, no Julian numerals and none of what this test reads.
  await ready(page, { reckoning: null });
  await desk(page);
  await page.goto('/calendar/2026-08-26', { waitUntil: 'networkidle' });
  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ru"]').click();

  // The whole chrome, live, with no reload: the document's language, the
  // nav, the header's church control (through the same STRINGS the packs
  // merge over), the date through Intl — which is why the formatters are a
  // per-language cache and not module constants — and the title.
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru');
  /*
   * **All Saints and not Daily.** The first nav link is the one word in the
   * chrome that changes with the *date*, and this page is a hardcoded one:
   * on 26 August the button reads «Ежедневно» and on every other day
   * «Сегодня». It read the same either way until 2026-08-27, when the packs
   * were given a distinct base word, and CI went red the same evening because
   * the runner's clock was on the 26th. What this test is claiming — that the
   * whole chrome redraws in Russian — is made by a word that stands still;
   * the Daily button's two words have two tests of their own.
   */
  await expect(page.locator('.site-nav a').nth(1)).toHaveText('Все святые');
  await expect(page.locator('#church-open')).toHaveText('Русская');
  // Capitalised, and the month's own abbreviation dot dropped (author,
  // 2026-08-25). Said plainly because it is a departure: lower case is
  // correct Russian orthography for a weekday and a month, and «авг.» wants
  // its dot; the author asked for capitals and no dot, and only the weekday
  // and month parts are touched — the literal «2026 г.» keeps the dot that
  // belongs to a different word.
  // The month in full since 2026-09-01, in every pack: `headingFmt` asks Intl
  // for `month: 'long'` where it asked for `short`.
  /*
   * The month is abbreviated at this width since 2026-09-02 - and it is the
   * *pack's* own abbreviation, which is the half of that change worth pinning
   * here: «Авг» rather than a English "Aug" leaking into a Russian heading.
   *
   * **13, not 26** (2026-09-05, following the "Follow my church" fix):
   * unset reckoning now truly follows the Russian church's own default,
   * Julian, and the numerals are the reckoned ones — 26 August civil is 13
   * August Julian. The weekday alone stays civil («Среда» is still right for
   * the 26th), which is CLAUDE.md's own rule for `reckonedHeading`.
   */
  await expect(page.locator('h1')).toHaveText(/^Среда, 13 Авг(уста)? 2026 г\.$/);
  // The tab keeps the reader's own word for the route and the untranslated
  // mark beside it: AGIOS is one name in every pack (PLAN §3, "The name").
  await expect(page).toHaveTitle(/^Сегодня - AGIOS$/);
  // The fast line: label and recurring reason translated, the cycle line
  // deliberately not — it is composed in English by lib/liturgy.js, the
  // recorded seam of Amendment 36.
  // 26 August: days.pravoslavie.ru printed «Успенский пост; сухоядение», so
  // the grade leads the line, in Russian, from the pack's own vocabulary —
  // naming the *type* of fast since 2026-08-26 rather than the technical
  // term, which is why this reads Строгий пост and not Сухоядение.
  await expect(page.locator('[data-liturgy] .fast')).toHaveText(/^Строгий пост/);
  await expect(page.locator('[data-liturgy] .occasion-chip')).toHaveText('Успенский пост');
  await expect(page.locator('[data-liturgy]')).toContainText('Глас 3');

  // And it is a setting, not a session: the reload comes back Russian.
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('ru');
  await expect(page.locator('.site-nav a').nth(1)).toHaveText('Все святые');
  await expect(page.locator('#lang-open')).toHaveText('RU');
});

test('About offers a way to write, and it goes to the repository', async ({ page }) => {
  /*
   * Issues are the affordance: no address is printed, no form is posted
   * anywhere, and a static site needs no server to receive one. The trade — that
   * an issue is public — is told to the reader before they open one.
   *
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  const contact = page.locator('section.contact');
  await expect(contact.locator('h2')).toHaveText('Contact');
  const link = contact.locator('a');
  await expect(link).toHaveAttribute('href', /github\.com\/.+\/issues\/new/);
  await expect(contact).toContainText('can be read by anyone');
  // No address of the author's anywhere on the page, which is the whole point.
  expect(await page.content()).not.toContain('mailto:');
  expect(await page.locator('body').textContent()).not.toMatch(/@[\w.-]+\.(com|org|ro)/);
});

test('the four pages hold one line in every pack, at every width', async ({ browser }) => {
  /*
   * The header's wide grid used to hand the nav the *leftovers* of a `1fr`
   * track, and in Russian, Greek and Serbian what was left was narrower than the
   * four labels. Which of the two gives way is the whole decision, and **the nav
   * wins**: the four pages are how the site is used, the masthead is a constant
   * learnt once. So the nav has its own `auto` track and the name pays in lines.
   * There is no third option — the arithmetic is in
   *
   */
  // One context per pack, resized across the widths, rather than thirty cold
  // loads: the header is laid out from the same stylesheet either way, and
  // thirty of them do not fit a test's budget.
  for (const [language, church] of [
    ['en', 'russian'],
    ['ru', 'russian'],
    ['ro', 'romanian'],
    ['el', 'greek'],
    ['sr', 'serbian'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: a.c, language: a.l })),
      { c: church, l: language },
    );
    await page.goto('/calendar/2026-08-25', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 360, 480, 560, 700, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      /*
       * Crossing the nav's own 759.98px breakpoint rebuilds the row off a
       * `resize` listener, which fires a tick after `setViewportSize` resolves
       * rather than inside it — a test that measured in the same tick read the
       * *outgoing* shape at the new width. A double frame is the same wait this
       * file gives a style or font change elsewhere.
       */
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const seen = await page.evaluate(() => {
        const nav = document.querySelector('.site-nav');
        const links = [...nav.querySelectorAll('a')];
        const box = nav.getBoundingClientRect();
        return {
          rows: new Set(links.map((a) => Math.round(a.getBoundingClientRect().top))).size,
          // Each label on one line of its own, too: `nowrap` on the row is
          // honoured by shrinking the anchors unless the anchors refuse.
          tallest: Math.max(...links.map((a) => a.getBoundingClientRect().height)),
          /*
           * One line, measured against the line the pack is actually set in
           * rather than against a constant: the chrome doubles past 1024 px, so a
           * fixed bound would read a single line at 1280 as a wrap. A second line
           * is twice this however large the type.
           */
          line: parseFloat(getComputedStyle(links[0]).lineHeight),
          overhang: Math.max(...links.map((a) => a.getBoundingClientRect().right)) - box.right,
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const where = `${language} at ${width}`;
      expect(seen.rows, where).toBe(1);
      expect(seen.tallest, where).toBeLessThan(seen.line * 1.6);
      /*
       * Below the nav's own breakpoint (759.98px, base.css) the row is
       * `ui/nav-scroll.js`'s endless strip, and its links legitimately run past
       * the track's right edge — that overflow is contained rather than absent,
       * which `seen.doc` below still catches if it ever leaked onto the page.
       */
      if (width >= 760) expect(seen.overhang, where).toBeLessThan(1);
      /*
       * Not `toBe(0)`: past 1024 px the root holds the scrollbar's room open on
       * every route (`scrollbar-gutter: stable`), which leaves the content
       * legitimately a gutter's width *narrower* than the client box. Anything
       * above zero is the page running off the side, caught exactly as before.
       */
      expect(seen.doc, where).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  }
});

test('the chrome prints no em dashes, in any language', async ({ browser }) => {
  /*
   * Swept across every string the site prints by a scanner that knows a string
   * literal from a comment, so the house's own prose keeps its em dashes and the
   * reader gets none.
   *
   * **What is deliberately not swept is the corpus.** Those em dashes are inside
   * quoted source text and citation lines transcribed from four synaxaria, and
   * editing a quotation for typography is the one thing the corpus's
   * no-invention rule forbids. So this reads the chrome element by element
   * rather than the whole page.
   */
  for (const [language, church] of [
    ['en', 'russian'],
    ['ru', 'russian'],
    ['ro', 'romanian'],
    ['el', 'greek'],
    ['sr', 'serbian'],
  ]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
  await searchMode(page);
    await page.addInitScript(
      (a) => localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: a.c, language: a.l })),
      { c: church, l: language },
    );
    for (const url of ['/calendar/2026-08-25', '/saints', '/about']) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const dashed = await page.evaluate(() => {
        const chrome = [
          'header.chrome',
          '.site-nav',
          '[data-liturgy]',
          '.index-controls',
          '.tray',
          '.hero-dates',
          '.index-dates',
          '.reg-title',
          'h1',
          'h2',
          // The About page's own body: it is the site's own prose rather than
          // the corpus's, so "replace all emm dashes" applies to it in full. The
          // separator between a church and its calendar was an em dash for one
          // build because this list read the chrome around the page, not the page.
          'section[aria-labelledby="policy"]',
          'section[aria-labelledby="calendars"]',
          'section[aria-labelledby="sourcing"]',
          'section[aria-labelledby="coverage"]',
        ];
        const found = [];
        for (const sel of chrome) {
          for (const el of document.querySelectorAll(sel)) {
            if (el.textContent.includes('—')) found.push(`${sel}: ${el.textContent.slice(0, 60)}`);
          }
        }
        return found;
      });
      expect(dashed, `${language} ${url}`).toEqual([]);
      expect(await page.title(), `${language} ${url}`).not.toContain('—');
    }
    await ctx.close();
  }
});

test('the panel flies home in half the time, and the page closes behind it', async ({ page }) => {
  /*
   * These panels sit in the flow, so hiding one at the end of its flight dropped
   * everything below it by the panel's whole height in a single frame — the
   * flight was smooth and its consequence was not. The space closes over the
   * same duration now, and the flier is pinned out of flow first so the closing
   * box cannot clip it.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  const panel = page.locator('#church-panel');
  await expect(panel).toBeVisible();
  await panelSettled(page);

  const timing = await page.evaluate(() => {
    const inner = document.querySelector('#church-panel .church-panel-inner');
    return {
      // Read before the press, so this is the stylesheet's own idea of the
      // flight rather than something measured off a running animation.
      panelHeight: document.querySelector('#church-panel').getBoundingClientRect().height,
      innerTop: inner.getBoundingClientRect().top,
    };
  });
  expect(timing.panelHeight).toBeGreaterThan(40);

  await page.locator('#church-panel [data-church="greek"]').click();
  /*
   * The **last** frame on which the flier is still pinned, found by watching
   * rather than by sleeping a fraction of the duration: a fixed sample point is
   * comfortable in one flight and marginal in the next, and at mobile-360 the
   * flier was sometimes already gone. Watching the state survives the next
   * change to the number.
   */
  const midFlight = await page.evaluate(async () => {
    const box = document.querySelector('#church-panel');
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    let last = null;
    for (let i = 0; i < 60; i += 1) {
      const inner = document.querySelector('#church-panel .church-panel-inner');
      if (!inner) break;
      const cs = getComputedStyle(inner);
      if (cs.position === 'fixed') {
        last = {
          duration: cs.transitionDuration,
          // Out of the flow, so the band can close under it without clipping.
          position: cs.position,
          panelHeight: box.getBoundingClientRect().height,
          panelDuration: getComputedStyle(box).transitionDuration,
        };
      } else if (last) {
        break;
      }
      await frame();
    }
    return last;
  });
  expect(midFlight, 'the flier was never caught in the air').not.toBeNull();
  /*
   * `--dur-answer`. **The number is not the point of the test**; that the panel
   * and its closing band move for the *same* duration is.
   */
  expect(midFlight.duration).toMatch(/^0\.14s/);
  expect(midFlight.panelDuration).toMatch(/^0\.14s/);
  expect(midFlight.position).toBe('fixed');
  // The band is already closing rather than waiting to vanish at the end.
  expect(midFlight.panelHeight).toBeLessThan(timing.panelHeight);

  await expect(panel).toBeHidden();
  await expect(page.locator('#church-open')).toHaveText('Greek');
});

test('a panel reopened mid-flight is not emptied by the flight it interrupted', async ({ page }) => {
  /*
   * The regression the flight introduced. Closing pins the panel out of flow and
   * collapses the band, and the callback that hides and empties it runs at the
   * end — so a reopen inside that window landed the old callback on the *new*
   * panel, leaving it open, empty and unclickable. A token cancels a flight the
   * reader has overtaken.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await page.locator('#church-open').click();
  await page.locator('#church-panel [data-church="greek"]').click();
  // Straight back in, well inside the flight.
  await page.waitForTimeout(40);
  await page.locator('#church-open').click();
  await page.waitForTimeout(300);
  const seen = await page.evaluate(() => {
    const panel = document.querySelector('#church-panel');
    return {
      hidden: panel.hidden,
      height: Math.round(panel.getBoundingClientRect().height),
      choices: panel.querySelectorAll('[data-church]').length,
    };
  });
  expect(seen.hidden).toBe(false);
  expect(seen.choices).toBe(4);
  expect(seen.height).toBeGreaterThan(40);
  // And it is still a working control, which is what the timeout was about.
  await page.locator('#church-panel [data-church="russian"]').click();
  await expect(page.locator('#church-open')).toHaveText('Russian');
});

test('a flick clears a Continue reading row that a slow push of the same length does not', async ({ page }) => {
  /*
   * Distance alone was the test of intent, and a real swipe fails it: the
   * natural gesture is a quick push across a third of the row. So the release is
   * measured too — the last 80 ms of travel — and a flick dismisses whatever the
   * distance. **Same distance in both halves**, so the only variable is speed.
   *
   */
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await onShelfPage(page);

  const rows = page.locator('.shelf-row');
  await expect(rows).toHaveCount(2);

  /*
   * `steps` matters as much as `pause`, and the reason is the harness rather
   * than the shelf: every mouse.move is a round trip, and under a fully
   * parallel suite eight of them turn a flick into a haul. Three moves is still
   * a gesture with a direction and a speed, and leaves the reading well clear of
   * the threshold on a loaded machine.
   */
  const push = async (distance, { pause = 0, steps = 8 } = {}) => {
    const name = rows.first().locator('.index-name');
    const box = await settledBox(name);
    const y = box.y + box.height / 2;
    const x = box.x + box.width / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= steps; i += 1) {
      await page.mouse.move(x + (distance * i) / steps, y);
      if (pause) await page.waitForTimeout(pause);
    }
    await page.mouse.up();
  };

  // 60 px is well under the quarter-width the distance test asks for, at any
  // screen this suite runs at.
  await push(60, { pause: 30 });
  await page.waitForTimeout(500);
  await expect(rows, 'a slow short push should spring back').toHaveCount(2);

  await push(60, { steps: 3 });
  await page.waitForTimeout(500);
  await expect(rows, 'a flick of the same length should clear the row').toHaveCount(1);
});

test('a chooser panel arrives the way it leaves, and the page comes with it', async ({ page }) => {
  /*
   * The two directions share `journey()` in ui/fly.js, so they cannot drift
   * apart the first time either is tuned.
   *
   * Sampled frame by frame rather than asserted at one instant: what is under
   * test is that the panel *travels*, and a single reading cannot tell a
   * journey from a jump.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });

  const sample = (sel, panelSel) =>
    page.evaluate(
      ({ sel, panelSel }) =>
        new Promise((resolve) => {
          const panel = document.querySelector(panelSel);
          const out = [];
          document.querySelector(sel).click();
          const t0 = performance.now();
          const tick = () => {
            const inner = panel.querySelector('.church-panel-inner');
            const t = performance.now() - t0;
            if (inner) {
              const cs = getComputedStyle(inner);
              out.push({
                scale: Number(cs.transform.match(/matrix\(([-\d.]+)/)?.[1] ?? 1),
                opacity: Number(cs.opacity),
                band: panel.getBoundingClientRect().height,
                position: cs.position,
              });
            }
            if (t < 300) requestAnimationFrame(tick);
            else resolve(out);
          };
          requestAnimationFrame(tick);
        }),
      { sel, panelSel },
    );

  for (const [button, panelSel] of [
    ['#church-open', '#church-panel'],
    ['#lang-open', '#lang-panel'],
  ]) {
    const opening = await sample(button, panelSel);
    const first = opening[0];
    const last = opening[opening.length - 1];

    // Out of the flow while it travels, exactly as the close pins it, so the
    // band can open under it without clipping.
    expect(first.position, panelSel).toBe('fixed');
    // It grows out of the control: small and invisible, then whole.
    expect(first.scale, panelSel).toBeLessThan(0.7);
    expect(first.opacity, panelSel).toBeLessThan(0.3);
    expect(last.scale, panelSel).toBe(1);
    expect(last.opacity, panelSel).toBe(1);
    // **And the page comes with it**: the band opens from nothing rather than
    // being at full height on the first frame, which is the half of the
    // instruction about "the other items on the page that move out of the
    // way". Backed out, `first.band` is already `last.band`.
    expect(first.band, panelSel).toBeLessThan(last.band / 2);
    expect(last.band, panelSel).toBeGreaterThan(40);
    // A journey, not a jump: the scale climbs across the middle of the run.
    const mid = opening[Math.floor(opening.length / 4)];
    expect(mid.scale, panelSel).toBeGreaterThan(first.scale);
    expect(mid.scale, panelSel).toBeLessThan(1);

    // The reverse of the reverse: closing runs the same journey the other way.
    const closing = await sample(button, panelSel);
    expect(closing[0].scale, panelSel).toBe(1);
    expect(closing[closing.length - 1].scale, panelSel).toBeLessThan(0.7);
    expect(closing[closing.length - 1].band, panelSel).toBeLessThan(closing[0].band / 2);
  }
});

test('under reduced motion a chooser panel is simply there, arriving as well as leaving', async ({ browser }) => {
  /*
   * STRUCTURE.md: reduced motion **removes**, never shortens. The close has had its
   * own test since the flight was written; the arrival needed one the moment it
   * gained an animation — no flight, no band opening, the panel simply at full
   * size on the first frame after the press.
   */
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  const state = await page.evaluate(() => {
    document.querySelector('#church-open').click();
    const panel = document.querySelector('#church-panel');
    const inner = panel.querySelector('.church-panel-inner');
    const cs = getComputedStyle(inner);
    return {
      transform: cs.transform,
      opacity: Number(cs.opacity),
      position: cs.position,
      band: panel.getBoundingClientRect().height,
    };
  });
  expect(state.transform).toBe('none');
  expect(state.opacity).toBe(1);
  expect(state.position).not.toBe('fixed');
  expect(state.band).toBeGreaterThan(40);
  await ctx.close();
});

test('pressing a chooser twice inside its flight does not send it the wrong way', async ({ page }) => {
  /*
   * The defect the two directions introduced between them, and the reason
   * ui/fly.js returns its `finish`. `flyInto` decides where to fly *from* by
   * reading the box's rect; a panel halfway through arriving is at neither end
   * of its journey, so a close that began mid-arrival set off the wrong way and
   * by the wrong distance. Land what is still moving before the next move
   * starts.
   *
   * The header's control sits at the top right on a desktop, so a panel flying
   * home travels *up*. That is the assertion, made after a press that lands 40
   * ms into the opening flight.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });

  /*
   * The symptom is not the direction — a shrunken box still sits roughly where
   * the whole one did — it is the *place the flight starts from*. `flyInto`
   * pins the flier out of flow at the rect it read, so a rect read mid-arrival
   * makes the panel jump to a half-size box near the control and fly from
   * there. That jump is what this asserts away.
   */
  const flight = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const button = document.querySelector('#church-open');
        const panel = document.querySelector('#church-panel');
        const inner = () => panel.querySelector('.church-panel-inner');
        button.click();
        setTimeout(() => {
          const rest = inner().getBoundingClientRect();
          button.click(); // close it again, and let that flight finish too
          setTimeout(() => {
            button.click(); // open
            setTimeout(() => {
              button.click(); // and close, 40 ms into the arrival
              setTimeout(() => {
                const el = inner();
                if (!el) return resolve(null);
                const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
                resolve({
                  rest: { left: rest.left, top: rest.top, width: rest.width },
                  pinned: {
                    left: parseFloat(el.style.left),
                    top: parseFloat(el.style.top),
                    width: parseFloat(el.style.width),
                  },
                  dy: m.m42,
                  scale: m.a,
                });
                // 60 ms, not 30: `flyInto` starts its transform in a
                // requestAnimationFrame, so one frame after the press the box
                // is still at identity and `dy` reads a flat zero.
              }, 60);
            }, 40);
          }, 320);
        }, 320);
      }),
  );
  expect(flight).not.toBeNull();
  // The flight home sets off from where the panel actually rests, at the size
  // it actually is. Backed out, every one of these is out by hundreds of px.
  expect(Math.abs(flight.pinned.left - flight.rest.left), 'starts where it rests').toBeLessThan(2);
  expect(Math.abs(flight.pinned.top - flight.rest.top), 'starts where it rests').toBeLessThan(2);
  expect(Math.abs(flight.pinned.width - flight.rest.width), 'starts at full size').toBeLessThan(2);
  // And it still goes the right way: the control is above, on a desktop.
  expect(flight.dy, 'towards the header').toBeLessThan(0);
  expect(flight.scale, 'shrinking').toBeLessThan(1);
  await expect(page.locator('#church-panel')).toBeHidden();
});

test('the Daily button offers Today when the reader has left it, and only there', async ({ page }) => {
  /*
   * Author, 2026-08-26 evening: "when today's date is scrolled away from on
   * the Daily page, the text 'Daily' on the Daily button fades and is
   * replaced by 'Today', so when you press it, it takes you to today's date.
   * But it only says 'Today' while on the Daily page."
   *
   * The word only ever offers what the page it is on can give: on the Index
   * the button is how you reach the Daily page at all, so it says Daily
   * whatever day that page was last showing.
   */
  await ready(page);
  const label = page.locator('[data-nav-label]');

  // Today itself: nothing to go back to.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(label).toHaveText('Daily');

  // A day that is not today, arrived at by deep link — and read off the
  // machine's own clock, because a literal here is a test that fails on one
  // day of the year.
  await page.goto(await aDayThatIsNotToday(page), { waitUntil: 'networkidle' });
  await expect(label).toHaveText('Today');

  // Off the Daily page it is Daily again.
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(label).toHaveText('Daily');

  // And stepping the rail is what changes it, not only a fresh load.
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(label).toHaveText('Daily');
  await page.keyboard.press('d');
  await expect(label).toHaveText('Today');
  // Pressing it goes back to today, and the word goes with it.
  await page.locator('.site-nav a[data-nav-daily]').click();
  await expect(label).toHaveText('Daily');
  await expect(page.locator('.week-strip button.is-today')).toHaveAttribute('aria-current', 'date');
});

test('the header is sticky, shorter, and the phone gets an endless centred nav', async ({ page }) => {
  /*
   * Three instructions, which are one bar: sticky, shorter, and — on a phone —
   * an endless centred strip. Desktop keeps the plain row.
   *
   */
  /*
   * 900 rather than 1280: past 1024 the chrome is deliberately twice the size,
   * so the instruction this pins — a bar made *shorter* by cropping its top
   * margin — is about the sizes below that breakpoint. The taller bar has its
   * own pin, `the header reserves the height it settles at`.
   */
  await page.setViewportSize({ width: 900, height: 800 });
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const header = page.locator('header.chrome');
  // The *bar* is what sticks — header plus both chooser panels, so the panels
  // travel with it (2026-08-27). The header itself carried `position: sticky`
  // as well for a day, which was one nested sticky too many; what a reader can
  // point at is asserted just below, by scrolling.
  await expect(page.locator('.chrome-bar')).toHaveCSS('position', 'sticky');
  const tall = (await header.boundingBox()).height;
  // It was 61 px at 1280 for four amendments; the top margin came down by 8.
  expect(tall, `the header is ${tall} px`).toBeLessThan(58);

  // Sticky is a claim about scrolling, so it is asserted by scrolling: the
  // bar is still at the top of the viewport after the page has moved under it.
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  const after = await header.boundingBox();
  expect(Math.round(after.y), 'the header scrolled away').toBe(0);
  // And it is opaque, or the page reads straight through it.
  await expect(header).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  // The phone's nav: a strip, edge to edge, with the current page centred on
  // it — exactly five links, the same five the wide row has, never cloned. That
  // the clones are never `/saints` is held by `the suite's positional nav
  // selectors match exactly one link, at every width` below.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const nav = await page.evaluate(() => {
    const track = document.querySelector('.site-nav');
    const box = track.getBoundingClientRect();
    const currents = [...track.querySelectorAll('a[aria-current="page"]')];
    const c = currents[0]?.getBoundingClientRect();
    return {
      left: Math.round(box.left),
      right: Math.round(box.right),
      viewport: document.documentElement.clientWidth,
      currentCount: currents.length,
      currentMid: c ? Math.round(c.left + c.width / 2) : null,
      trackMid: Math.round(box.left + box.width / 2),
      height: c ? Math.round(c.height) : null,
      weight: currents[0] ? getComputedStyle(currents[0]).fontWeight : null,
      field: currents[0] ? getComputedStyle(currents[0]).backgroundColor : null,
      linkCount: track.querySelectorAll('a').length,
      // The generous `padding-inline` (base.css) is what makes even five
      // items wider than the box, so the strip has somewhere to swipe to.
      canScroll: track.scrollWidth > track.clientWidth,
    };
  });
  expect(nav.left, 'the strip starts at the screen edge').toBe(0);
  expect(nav.right, 'and ends at it').toBe(nav.viewport);
  expect(nav.currentCount, 'more than one link claimed to be current').toBe(1);
  expect(Math.abs(nav.currentMid - nav.trackMid), 'the current page is not centred').toBeLessThan(6);
  expect(nav.linkCount, 'a phone should not see more or fewer than the five pages').toBe(5);
  expect(nav.canScroll, 'the strip does not scroll').toBe(true);
  // Shorter than the comfortable row a desktop's own padding gives, and
  // shorter than the 28 px the four-pages test allowed at 320.
  expect(nav.height, `the current page reads ${nav.height} px tall`).toBeLessThan(28);
  // The current page carries weight and a field — never colour alone — and
  // `aria-current` says it besides.
  expect(Number(nav.weight)).toBeGreaterThanOrEqual(700);
  expect(nav.field).not.toBe('rgba(0, 0, 0, 0)');

  // A tap on a neighbour — not the centred page — still opens it, same as
  // any other link on the site. Exactly one match, or this throws.
  const map = page.locator('.site-nav a[href$="/map"]');
  await map.scrollIntoViewIfNeeded();
  await map.click();
  await expect(page).toHaveURL(/\/map$/);

  // And the loop is real: swiping the strip one page brings a fifth page across
  // the ring to sit beside it rather than leaving a blank run-off.
  await page.goto('/map', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const before = await page.evaluate(() => document.querySelector('.site-nav').outerHTML);
  await page.evaluate(() => {
    /*
     * `ui/nav-scroll.js` moves this row itself now — `overflow-x` is `hidden`,
     * so a `scrollLeft` write alone reaches nothing and there is no native
     * scroll to provoke. The gesture is the whole instrument. Dispatched
     * pointer events are enough here because the file takes its moves off
     * `window` and never asks for pointer capture, which a synthetic pointer
     * would refuse (trap 11); the fling test below uses a real touch.
     */
    const track = document.querySelector('.site-nav');
    const y = track.getBoundingClientRect().top + 4;
    const at = (type, x, target) =>
      target.dispatchEvent(
        new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'touch' }),
      );
    at('pointerdown', 300, track);
    for (let x = 280; x >= 120; x -= 20) at('pointermove', x, window);
    at('pointerup', 120, window);
  });
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.site-nav').outerHTML))
    .not.toBe(before);
  const after2 = await page.evaluate(() => {
    const track = document.querySelector('.site-nav');
    return {
      count: track.querySelectorAll('a').length,
      keys: new Set([...track.querySelectorAll('a')].map((a) => new URL(a.href).pathname)).size,
      inBounds: track.scrollLeft >= 0 && track.scrollLeft <= track.scrollWidth - track.clientWidth,
    };
  });
  expect(after2.count, 'the rotation dropped or duplicated a link').toBe(5);
  expect(after2.keys, 'the rotation lost one of the five distinct pages').toBe(5);
  expect(after2.inBounds, 'the compensated scrollLeft left the scrollable range').toBe(true);
});

test('the suite’s positional nav selectors match exactly one link, at every width', async ({ page }) => {
  /*
   * The invariant a dozen other places in this suite spend without asserting:
   * `.site-nav a[href$="/saints"]` — and its four siblings — is **one element**.
   * A `locator.click()` on a selector that matched two would throw in strict
   * mode, but `toHaveText`, `boundingBox` and `evaluate` on a two-match locator
   * fail in ways that read as a defect in the thing under test rather than in
   * the selector.
   *
   * It is not free: `ui/nav-scroll.js` builds the phone's endless strip, and a
   * buffered clone of any of these pages would break every one of those callers
   * at once. Both widths, and a route where the strip has rotated, because that
   * is the state a clone would appear in.
   */
  const ONE = ['/saints', '/map', '/about', '/texts'];
  await ready(page);
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 780 });
    for (const route of [INDEX, '/map', '/']) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const at = `${route} at ${width}`;
      for (const href of ONE) {
        await expect(
          page.locator(`.site-nav a[href$="${href}"]`),
          `${at}: .site-nav a[href$="${href}"] is not one element`,
        ).toHaveCount(1);
      }
      // The two the suite addresses by role rather than by href, for the same
      // reason: the Daily link is the one `ui/nav-scroll.js` was said to clone.
      await expect(page.locator('.site-nav a[data-nav-daily]'), `${at}: the Daily link`).toHaveCount(1);
      await expect(
        page.locator('.site-nav a[aria-current="page"]'),
        `${at}: more than one link claims to be the current page`,
      ).toHaveCount(1);
    }
  }
});

test('a swipe carries the nav strip one page, however hard it is thrown', async ({ browser }) => {
  /*
   * Author, 2026-09-15: "Either you swipe left or right and it takes you one
   * spot left or right, to the next one, or you click and it takes you there.
   * Currently you can swipe multiple and this isn't working."
   *
   * A 320 px fling is the hardest thing this row is ever asked for, and it has
   * to mean the same as a 40 px one: the next page, and only the next page.
   * The strip's own `overflow-x` is `hidden` for it (base.css) — momentum
   * belongs to whoever owns the scroller, and this row cannot let the
   * compositor spend it.
   *
   * **A real touch fling, through CDP** (trap 11): a dispatched `PointerEvent`
   * is not an active pointer, so a synthetic gesture cannot tell a row that
   * refuses momentum from one that never had any to refuse.
   *
   * The assertions are on travel and on arrival, which are independent (trap
   * 14): the row has to *go*, past a threshold no snap-back can reach, and it
   * has to *arrive* somewhere else with the ring turned.
   *
   */
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 780 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const start = await page.evaluate(() => {
    const t = document.querySelector('.site-nav');
    const b = t.getBoundingClientRect();
    // Traced in the page: a before/after pair cannot tell a fling that was cut
    // short from one that never started.
    window.__trace = [];
    const tick = () => {
      window.__trace.push(Math.round(t.scrollLeft));
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
    return {
      y: Math.round(b.top + b.height / 2),
      at: Math.round(t.scrollLeft),
      range: Math.round(t.scrollWidth - t.clientWidth),
      centred: [...t.querySelectorAll('a')]
        .map((a) => {
          const r = a.getBoundingClientRect();
          return { k: a.dataset.navKey, d: Math.abs(r.left + r.width / 2 - (b.left + t.clientWidth / 2)) };
        })
        .sort((p, q) => p.d - q.d)[0].k,
      // The ring as it reads left to right, so "one spot" can be named rather
      // than assumed: the next page is the one standing to the right of the
      // centred one before the finger went down.
      order: [...t.querySelectorAll('a')]
        .map((a) => ({ k: a.dataset.navKey, x: a.getBoundingClientRect().left }))
        .sort((p, q) => p.x - q.x)
        .map((p) => p.k),
    };
  });
  expect(start.range, 'the strip has nowhere to be flung').toBeGreaterThan(300);

  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: start.y, id: 1 }],
    });
  let x = 330;
  await touch('touchStart', x);
  for (let i = 0; i < 8; i += 1) {
    x -= 40;
    await touch('touchMove', x);
    await page.waitForTimeout(8);
  }
  await touch('touchEnd', x);
  await page.waitForTimeout(1400);

  const after = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    const t = document.querySelector('.site-nav');
    const b = t.getBoundingClientRect();
    const seen = [...t.querySelectorAll('a')]
      .map((a) => ({ k: a.dataset.navKey, x: a.getBoundingClientRect().left }))
      .sort((p, q) => p.x - q.x);
    const mid = b.left + t.clientWidth / 2;
    const centred = [...t.querySelectorAll('a')]
      .map((a) => {
        const r = a.getBoundingClientRect();
        return { k: a.dataset.navKey, d: Math.abs(r.left + r.width / 2 - mid) };
      })
      .sort((p, q) => p.d - q.d)[0];
    return {
      reached: Math.max(...window.__trace),
      centred: centred.k,
      offMid: Math.round(centred.d),
      order: seen.map((s) => s.k),
      links: t.querySelectorAll('a').length,
      keys: new Set([...t.querySelectorAll('a')].map((a) => new URL(a.href).pathname)).size,
      inBounds: t.scrollLeft >= -1 && t.scrollLeft <= t.scrollWidth - t.clientWidth + 1,
    };
  });

  // It answered the finger: the row moved rather than sitting still under it.
  expect(
    after.reached - start.at,
    `the fling moved the strip ${after.reached - start.at} px of a ${start.range} px range`,
  ).toBeGreaterThan(20);
  /*
   * And it arrived one page along, not three. The 320 px thrown at it is more
   * than three labels wide, so this is the assertion the old free-scrolling row
   * fails: it is not "a different page" but "the next one".
   */
  const next = start.order[start.order.indexOf(start.centred) + 1];
  expect(next, 'premise: the page the gesture started on was not in the middle of five').toBeTruthy();
  expect(after.centred, `the strip travelled to ${after.centred} rather than one spot, to ${next}`).toBe(next);
  expect(after.offMid, 'the strip settled off its own midline').toBeLessThan(6);
  expect(after.inBounds, 'the compensated scrollLeft left the scrollable range').toBe(true);
  // The ring turned with it, so the page it landed on still has neighbours on
  // both sides — the whole of what "endless" means here.
  expect(after.links, 'the turn dropped or duplicated a link').toBe(5);
  expect(after.keys, 'the turn lost one of the five distinct pages').toBe(5);
  const landed = after.order.indexOf(after.centred);
  expect(landed, `the strip landed at position ${landed} of five, not the middle`).toBe(2);
  await ctx.close();
});

/**
 * The strip as read left to right on the screen, which is *not* the DOM order:
 * `ui/nav-scroll.js` turns the ring with a flex `order` per link, so the
 * document keeps the site's own order — and with it the tab ring and every
 * positional selector in this suite — while the picture rotates.
 */
const stripOrder = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.site-nav a')]
      .map((a) => ({ key: a.dataset.navKey, x: a.getBoundingClientRect().left }))
      .sort((a, b) => a.x - b.x)
      .map((s) => s.key),
  );

/**
 * Presses a page on the strip and counts the *distinct positions the track
 * passed through*, per frame. Read in the page rather than over the wire
 * because that is the only place the frames are: a before/after pair cannot
 * tell a travel from an assignment.
 *
 * The press is `el.click()` rather than `locator.click()` because the latter
 * scrolls its target into view first (trap 3) — on this strip that is the very
 * scroll under test.
 */
const watchPress = async (href) => {
  const track = document.querySelector('.site-nav');
  /*
   * Whether the press ran a view transition — the half `movedAt` cannot see
   * (trap 14): a transition covers the document with a snapshot for its
   * duration, so the strip's `scrollLeft` moves on time and the reader watches
   * a still picture.
   */
  let transitions = 0;
  if (document.startViewTransition) {
    const orig = document.startViewTransition.bind(document);
    document.startViewTransition = (cb) => {
      transitions += 1;
      return orig(cb);
    };
  }
  const seen = [Math.round(track.scrollLeft)];
  /*
   * And the widest blank strip beyond whichever links are on screen, per frame
   * — the author's second report on this row is exactly that number ("they
   * should be visible as the animation is happening").
   */
  let gap = 0;
  let movedAt = null;
  const began = performance.now();
  const from = track.scrollLeft;
  let running = true;
  const tick = () => {
    seen.push(Math.round(track.scrollLeft));
    if (movedAt === null && Math.abs(track.scrollLeft - from) > 2) movedAt = performance.now() - began;
    const box = track.getBoundingClientRect();
    const on = [...track.children]
      .map((a) => a.getBoundingClientRect())
      .filter((r) => r.right > box.left && r.left < box.right)
      .sort((a, b) => a.left - b.left);
    if (on.length) gap = Math.max(gap, on[0].left - box.left, box.right - on[on.length - 1].right);
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.querySelector(`.site-nav a[href$="${href}"]`).click();
  await new Promise((r) => setTimeout(r, 900));
  running = false;
  const cur = track.querySelector('a[aria-current="page"]').getBoundingClientRect();
  const box = track.getBoundingClientRect();
  return {
    steps: [...new Set(seen)].length,
    gap: Math.round(gap),
    movedAt: Math.round(movedAt ?? 9999),
    transitions,
    offCentre: Math.abs(cur.left + cur.width / 2 - (box.left + box.width / 2)),
  };
};

test('the phone strip is balanced at rest, and a press glides into the centre', async ({ page }) => {
  /*
  /*
   * The row only rotated once a swipe had *already* settled with an edge page
   * centred, so at rest the current page stood at one end of the five with blank
   * strip beside it. Balancing every settle so the centred page sits in the
   * middle of the five is what makes the ring's own neighbours the ones a reader
   * meets.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await ready(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  // The ring read from two pages before Daily. Its own order is NAV_KEYS, so
  // this is also the claim that the ring wraps rather than running out.
  await expect
    .poll(() => stripOrder(page))
    .toEqual(['map', 'about', 'calendar', 'saints', 'texts']);
  // And the DOM is untouched by that rotation, which is what lets the rest of
  // this file address `.site-nav a` by position at all.
  expect(
    await page.evaluate(() => [...document.querySelectorAll('.site-nav a')].map((a) => a.dataset.navKey)),
    'the ring turned the DOM rather than the picture',
  ).toEqual(['calendar', 'saints', 'texts', 'map', 'about']);

  const glided = await page.evaluate(watchPress, '/about');
  // Five or more distinct positions is a journey; a jump is two — where it
  // started and where it landed. The measured run is nineteen.
  expect(glided.steps, `the strip moved through ${glided.steps} positions`).toBeGreaterThan(4);
  /*
   * **And the row is never seen to run out.** Two things together give this and
   * either alone fails it: the ring turns on every frame of the journey rather
   * than at the end of it, and the five links are `min-width: 28vw` so the ring
   * is longer than the window.
   */
  expect(glided.gap, `${glided.gap} px of empty strip showed during the press`).toBeLessThan(2);
  expect(glided.offCentre, 'the pressed page did not land on the midline').toBeLessThan(6);
  /*
   * **And the strip answers the press itself, not the navigation behind it.**
   * It used to be armed in `renderNav` and let go from `show()` once the view
   * transition's `finished` settled, so a press bought a quarter-second of
   * nothing. Both numbers are read from the same clock as the press, and the
   * assertion is that *neither waits for the other*.
   *
   */
  expect(glided.movedAt, `the strip did not move until ${glided.movedAt} ms`).toBeLessThan(120);
  expect(glided.transitions, 'the press ran a view transition, which freezes the strip under a snapshot').toBe(0);
  // And the ring is balanced again around the page that was pressed, which is
  // the rebalance being silent: the glide's own landing and this are the same
  // pixel for About, and only the four pages around it have moved.
  await expect
    .poll(() => stripOrder(page))
    .toEqual(['texts', 'map', 'about', 'calendar', 'saints']);

  /*
   * **All five pages are on screen, and the outer two by about half.** Half the
   * *box* and half the *word* are the same thing only at `min-width: 25vw`,
   * which is why the number is what it is: a label is centred in its box, so at
   * 26vw what shows is the box's outer edge and the last few letters of the
   * word. base.css carries the arithmetic.
   */
  const seen = await page.evaluate(() => {
    const track = document.querySelector('.site-nav');
    const box = track.getBoundingClientRect();
    const parts = [...track.children]
      .map((a) => ({ key: a.dataset.navKey, r: a.getBoundingClientRect() }))
      .sort((a, b) => a.r.left - b.r.left)
      .map((k) => Math.round(((Math.min(k.r.right, box.right) - Math.max(k.r.left, box.left)) / k.r.width) * 100));
    const style = getComputedStyle(track);
    return { parts, masked: (style.maskImage || style.webkitMaskImage || 'none') !== 'none' };
  });
  expect(seen.parts.length, 'a page went missing from the strip').toBe(5);
  expect(seen.parts.slice(1, 4), 'the three middle pages are not whole').toEqual([100, 100, 100]);
  for (const shown of [seen.parts[0], seen.parts[4]]) {
    expect(shown, `an outer page shows ${shown}% of itself`).toBeGreaterThan(35);
  }
  // And they run off the edge rather than stopping at it.
  expect(seen.masked, 'the strip has no edge fade').toBe(true);
});

test('under reduced motion the strip is simply centred, with no journey', async ({ browser }) => {
  // Removed, not shortened (STRUCTURE.md). The press still puts the page on
  // the midline; there is nothing to watch it get there.
  const ctx = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 360, height: 780 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  // A context opened by hand is one the fixture never saw, so the rehearsal
  // has to be applied here or `COLD_FACE=1` exempts this test silently
  // (`fixtures.js` argues it at length).
  await coldFace(page);
  await searchMode(page);
  await ready(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const still = await page.evaluate(watchPress, '/about');
  // Two: where it stood before the press, and where the press put it. The
  // strip is centred on a different page than it was, and passed through
  // nothing to get there.
  expect(still.steps, `the strip moved through ${still.steps} positions under reduced motion`).toBeLessThan(3);
  expect(still.offCentre, 'the pressed page did not land on the midline').toBeLessThan(6);
  await ctx.close();
});

test('a coachmark is shown once, and a guess is still not an answer', async ({ page }) => {
  /*
   * The gate is *has been shown*, written when the mark is mounted — not *has
   * answered*, which a reader content with the guess never becomes. What must
   * not go with it is the honesty the guess rests on: being shown a mark stores
   * nothing about the church, so `hasChosen()` keeps its meaning, the header
   * still names a guess as a guess, and the Index still calls that church's
   * saints a selection rather than the corpus.
   *
   */
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('.coachmark')).toHaveCount(2);

  // Shown is recorded; answered is not.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}'));
  expect(stored.coachSeen).toEqual(['church-open', 'lang-open']);
  // Null, not absent: `writeSetting` persists the whole settings object, so
  // storing the seen list stores the defaults with it. Null is what every
  // reader of these two tests for, and it is what "nobody has said" means.
  expect(stored.church).toBeNull();
  expect(stored.language).toBeNull();

  // Reloaded, and again on another page, they stay gone without anything
  // having been chosen.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.coachmark')).toHaveCount(0);
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect(page.locator('.coachmark')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}').church)).toBeNull();
  // And the guess is still visibly a guess, which is what the marks were for.
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  await expect(page.locator('#church-open')).toHaveText('Russian');
});

test('the Daily button says Daily on today, and wears gold when it says Today', async ({ page }) => {
  /*
   * Two instructions on one control, and the first was a race between two
   * paints in one tick — the nav rebuilt for the new route while the view had
   * not yet said which day it was showing, with the fade's own timer landing
   * last. main.js has the whole account.
   *
   */
  await ready(page);
  const away = await aDayThatIsNotToday(page);
  await page.goto(away, { waitUntil: 'networkidle' });
  const label = page.locator('[data-nav-label]');
  await expect(label).toHaveText('Today');

  // Gold, and `--gold-ink` rather than `--gold`: a word needs 4.5:1 and the
  // hue the die wears is 2.78:1 on gesso.
  const goldInk = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--gold-ink').trim();
    const out = getComputedStyle(probe).color;
    probe.remove();
    return out;
  });
  await expect(label).toHaveCSS('color', goldInk);

  // One press, and the word is back — this is the whole of the first
  // instruction, and it failed before the fix.
  await page.locator('a[data-nav-daily]').click();
  await expect(label).toHaveText('Daily');
  await expect(label).not.toHaveCSS('color', goldInk);
  expect(new URL(page.url()).pathname.endsWith('/')).toBe(true);

  // And the four packs say a different word for the page than for the day,
  // which they did not until this sitting: «Ежедневно» against «Сегодня».
  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, language: 'ru' }));
  });
  await page.goto(away, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-nav-label]')).toHaveText('Сегодня');
  await page.locator('a[data-nav-daily]').click();
  await expect(page.locator('[data-nav-label]')).toHaveText('Ежедневно');
});

test('a section is remembered where the reader left it, and a second press goes to the top', async ({ page }) => {
  /*
   * Kept by section rather than by path — the Daily page is one place to a
   * reader whichever day it is showing — and in memory rather than in the
   * store, because it is where this visit left off and not a preference.
   *
   * **The presses are dispatched rather than clicked** (trap 3). The header is
   * sticky, so an ordinary `click()` can move the page to the top *before* the
   * navigation reads where the reader was, which is the one thing this test is
   * about.
   */
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);

  await ready(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1200);

  await press('nav.site-nav a[href$="/about"]');
  await expect(page.locator('h1')).toBeVisible();
  // A section arrived at fresh still opens at the top.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // About fetches its statistics, so it is briefly shorter than it ends up and
  // a scroll made before that lands would clamp to whatever fits.
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(1200);
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);

  await press('nav.site-nav a[href$="/saints"]');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(1200);

  // The same button again, and it is the top of the page.
  await press('nav.site-nav a[aria-current="page"]');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  // Each section keeps its own place, not one between them.
  await press('nav.site-nav a[href$="/about"]');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(400);
});

test('a second press of the current page eases to the top over a fixed span, not a jump', async ({ page }) => {
  /*
   * Two things pinned together. First, motion: `window.scrollY` is sampled on
   * every animation frame entirely **inside the page** — a click-then-sample
   * round-tripped through Node measures this suite's own IPC latency as often
   * as the animation. Second, *fixed* span: a scroll five times deeper must
   * still settle inside the same deadline, which is the difference between this
   * hand-rolled tween and `scrollTo({ behavior: 'smooth' })` — Chrome scales
   * that one's duration with distance, which is "takes ages" for a long page.
   *
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });

  async function pressAndTrace(startY) {
    await page.evaluate((y) => window.scrollTo(0, y), startY);
    return page.evaluate(
      ({ windowMs }) =>
        new Promise((resolve) => {
          const samples = [];
          const start = performance.now();
          document.querySelector('nav.site-nav a[aria-current="page"]').click();
          const tick = () => {
            samples.push({ t: performance.now() - start, y: window.scrollY });
            if (performance.now() - start < windowMs) requestAnimationFrame(tick);
            else resolve(samples);
          };
          requestAnimationFrame(tick);
        }),
      { windowMs: 1200 },
    );
  }

  const short = await pressAndTrace(600);
  const midpoints = short.filter((s) => s.y > 0 && s.y < 600);
  expect(midpoints.length, `a jump goes straight to 0: ${JSON.stringify(short)}`).toBeGreaterThan(0);
  expect(short.at(-1).y, JSON.stringify(short)).toBe(0);

  const long = await pressAndTrace(3000);
  const longMidpoints = long.filter((s) => s.y > 0 && s.y < 3000);
  expect(longMidpoints.length, JSON.stringify(long)).toBeGreaterThan(0);
  // Five times the depth, and still settled well inside the sampling window —
  // not scaled, and nowhere near "ages".
  const longSettledAt = long.find((s) => s.y === 0)?.t;
  expect(longSettledAt, JSON.stringify(long)).toBeLessThan(900);
});

test('under reduced motion the same press still lands at the top, with no ease', async ({ browser }) => {
  // Removed, not shortened, like every other motion in this file: a press
  // under reduced motion has nothing to be mid-flight in, so a sample taken
  // immediately after must already read 0.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await searchMode(page);
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);

  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 600));
  await press('nav.site-nav a[aria-current="page"]');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await ctx.close();
});

test('the remembered spot is where the fade lands, not where it starts', async ({ page }) => {
  /*
   * Measured through the transition's own `ready` promise rather than a fixed
   * wait: `ready` resolves once the new-state snapshot has been captured and
   * before the animation runs, so whatever `window.scrollY` reads at that
   * instant is what the reader's fade actually shows. A `waitForTimeout` would
   * be measuring a clock rather than the moment the transition keys off.
   *
   */
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);

  await ready(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 1200));
  await press('nav.site-nav a[href$="/about"]');
  await expect(page.locator('h1')).toBeVisible();

  await page.evaluate(() => {
    const orig = document.startViewTransition.bind(document);
    document.startViewTransition = (cb) => {
      const t = orig(cb);
      window.__readyScrollY = undefined;
      t.ready.then(() => {
        window.__readyScrollY = window.scrollY;
      });
      return t;
    };
  });
  await press('nav.site-nav a[href$="/saints"]');
  await expect.poll(() => page.evaluate(() => window.__readyScrollY)).toBe(1200);
});

test('the die is square, and the header rule sits on the buttons', async ({ page }) => {
  /*
   * The die took its height from `--facet-h` and its width did not follow,
   * which left it an upright pill; both read the same token now, so a chip's
   * padding change moves the two together. The row's budget paid for it —
   * `the filter row still holds one line with the die in it` is where that
   * arithmetic lives.
   */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const die = await page.locator('.random-die').evaluate((el) => {
    const box = el.getBoundingClientRect();
    return { w: box.width, h: box.height, radius: getComputedStyle(el).borderTopLeftRadius };
  });
  expect(Math.abs(die.w - die.h), `die ${die.w} x ${die.h}`).toBeLessThan(0.5);
  // The fillet is untouched: on a square that resolves to a circle, which is
  // the same fully rounded corner it had.
  expect(parseFloat(die.radius)).toBeGreaterThan(die.w / 2 - 1);

  /*
   * Nothing between the bar's contents and its rule. On a phone the page
   * buttons are the header's own last row, so the two coincide to the pixel; on
   * a desk the nav shares a line with the taller calendar control and what
   * touches the rule is whichever is tallest. So the padding is asserted at
   * both widths and the coincidence only where the buttons are in question.
   */
  await expect(page.locator('header.chrome')).toHaveCSS('padding-bottom', '0px');
  await page.setViewportSize({ width: 360, height: 780 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const edge = await page.evaluate(() => {
    const header = document.querySelector('header.chrome');
    const nav = document.querySelector('nav.site-nav');
    const box = header.getBoundingClientRect();
    return {
      // The rule is the header's own bottom border, so its top edge is the
      // header's bottom less the border's width.
      rule: box.bottom - parseFloat(getComputedStyle(header).borderBottomWidth),
      buttons: nav.getBoundingClientRect().bottom,
    };
  });
  expect(Math.abs(edge.rule - edge.buttons), `rule at ${edge.rule}, buttons end at ${edge.buttons}`).toBeLessThan(1);
});

test('the calendar panel follows a language change while it is open', async ({ page }) => {
  /*
   * The panel is a disclosure in the page's flow rather than a dialogue, so
   * being open while something else changes is its normal state, not an edge
   * case.
   */
  await ready(page, { church: 'russian', language: 'en' });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await openChooser(page);
  await expect(page.locator('#church-panel')).toContainText('Which calendar do you keep?');

  await page.evaluate(() => {
    const key = 'gos-settings';
    const now = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...now, language: 'ru' }));
  });
  // Through the language control itself, which is the reader's own path.
  await page.reload({ waitUntil: 'networkidle' });
  await openChooser(page);
  await expect(page.locator('#church-panel')).toContainText('По какому календарю вы живёте?');

  /*
   * And live, with the calendar panel open the whole time. The two panels are
   * independent disclosures and both can stand open at once, so the language
   * one is opened *over* the calendar one and the calendar one is never
   * pressed again.
   */
  await page.locator('#lang-open').click();
  await expect(page.locator('#lang-panel')).toBeVisible();
  await page.locator('#lang-panel [data-language="en"]').click();
  await expect(page.locator('#church-panel')).toContainText('Which calendar do you keep?');
  await page.locator('#lang-open').click();
  await page.locator('#lang-panel [data-language="ro"]').click();
  await expect(page.locator('#church-panel')).toContainText('Ce calendar ții?');
});

test('the chooser panels travel with the sticky header', async ({ page }) => {
  /*
   * Asserted where it matters - far down a long page - because in the flow at
   * the top of the document a panel under the header looks identical whether it
   * sticks or not.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

  /*
   * **Dispatched, not clicked** (trap 3): pressing a control in a sticky bar
   * the ordinary way scrolls the page back to the top, which is the one
   * condition this test exists to get away from. Backed out against a
   * non-sticky bar, the `click()` version passed — it had scrolled itself
   * somewhere the claim was trivially true.
   */
  await page.evaluate(() => document.querySelector('#church-open').click());
  const geo = await page.evaluate(() => {
    const b = (s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
    };
    return {
      scrollY: window.scrollY,
      header: b('header.chrome'),
      panel: b('#church-panel'),
      vh: window.innerHeight,
    };
  });
  expect(geo.scrollY, 'the press took the page back to the top').toBeGreaterThan(1000);
  expect(geo.header.top, 'the header left the top of the screen').toBe(0);
  // The panel is under the header, and wholly on screen - which is the whole
  // of the instruction: reachable without scrolling back up.
  expect(geo.panel.top).toBe(geo.header.bottom);
  expect(geo.panel.bottom).toBeLessThan(geo.vh);
  await expect(page.locator('#church-panel')).toBeVisible();
});

test('a restored section never touches zero on the way', async ({ page }) => {
  /*
   * The header element does not move; what moved was the *page*, and on a phone
   * the header rides it. The restore used to reset to 0 and scroll to the
   * remembered position a moment later, and arriving at 0 tells the browser the
   * reader is at the top, so it begins showing its URL bar and then has to put
   * it away again. One scroll, one direction, no bounce.
   */
  const press = (sel) => page.evaluate((q) => document.querySelector(q).click(), sel);
  await ready(page);
  await page.setViewportSize({ width: 390, height: 780 });
  await page.addInitScript(() => {
    window.__scrolls = [];
    const orig = window.scrollTo.bind(window);
    window.scrollTo = (...a) => {
      window.__scrolls.push(a[1]);
      return orig(...a);
    };
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  /*
   * **The depth is taken from the page.** A literal is a measurement of one
   * day's content, and the corpus's saints run out before its liturgical
   * records do — a day with readings and no saints has no 1200 px to scroll.
   * What this is about is the *route* the restore takes, the same at any depth
   * that is not the top.
   */
  const deep = await page.evaluate(() => {
    window.scrollTo(0, 1200);
    return Math.round(window.scrollY);
  });
  expect(deep, 'the Daily page had nothing to scroll').toBeGreaterThan(200);
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(deep);

  await press('nav.site-nav a[href$="/saints"]');
  await expect(page.locator('.index-controls')).toBeVisible();

  await page.evaluate(() => {
    window.__scrolls = [];
  });
  await press('nav.site-nav a[data-nav-daily]');
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(deep);

  const scrolls = await page.evaluate(() => window.__scrolls);
  expect(scrolls, `the restore went by way of the top: ${JSON.stringify(scrolls)}`).not.toContain(0);
  expect(scrolls.at(-1)).toBe(deep);
});

test('the name is a stamp: the same mark in every language, in the stamp face', async ({ page }) => {
  /*
   * **Its accessible name is deliberately still the site's**: the mark is a
   * mark, and AGIOS is what the PWA manifest, the README and the `<title>` all
   * say. A pack that translated *either* fails here.
   *
   */
  for (const language of ['en', 'ru', 'el']) {
    await ready(page, { language });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    /*
     * **The stamp is outlines**, so the face and the tracking are baked into the
     * paths rather than resolved at render. What this asserts is the part that
     * is about the packs — every language gets the same mark, and none of them
     * translates it.
     */
    const stamp = await page.evaluate(() => {
      const mark = document.querySelector('.site-name .brand-mark');
      return {
        label: mark?.getAttribute('aria-label') ?? null,
        paths: mark?.querySelectorAll('path').length ?? 0,
        width: mark?.getBoundingClientRect().width ?? 0,
        text: document.querySelector('.site-name').textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    expect(stamp.label, `the ${language} pack translated the name`).toBe('AGIOS');
    expect(stamp.text, `the ${language} pack printed the name as live text`).toBe('');
    // Five glyphs, one path each — A G I O S: the mark is the same drawing in
    // every pack, where the face used to be scoped to English because the
    // others printed accented names GFS Nicefore cannot set.
    expect(stamp.paths, `the ${language} pack drew a different mark`).toBe(5);
    expect(stamp.width).toBeGreaterThan(0);
  }
});

test('the brand face is allowed to arrive late rather than never', async ({ page }) => {
  /*
   * `font-display: optional` keeping its promise is the defect here: a phone on
   * a slow connection got Literata in the masthead permanently and a warm
   * reload got the stamp — two mastheads for one reader. It is `swap` now,
   * **alone among this project's faces**: the body text keeps `optional`,
   * because that policy protects a page of prose from reflowing and the
   * masthead is two words in a fixed box.
   */
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/', { waitUntil: 'networkidle' });
  const face = await page.evaluate(async () => {
    await document.fonts.ready;
    const rules = [...document.styleSheets]
      .flatMap((sheet) => {
        try {
          return [...sheet.cssRules];
        } catch {
          return [];
        }
      })
      .filter((r) => r.constructor.name === 'CSSFontFaceRule')
      .map((r) => ({ family: r.style.fontFamily.replace(/["']/g, ''), display: r.style.fontDisplay }));
    return rules.find((r) => r.family === 'GFS Nicefore');
  });
  expect(face, 'the stamp face has no @font-face rule').toBeTruthy();
  expect(face.display, 'the masthead can still be left in the fallback for good').toBe('swap');
});

test('a Continue reading row carries no mark, and the shelf still clears', async ({ page }) => {
  /*
   * **The shelf has no Save control at all** — the Saved shelf's own rows never
   * had one — so this also pins that the *other* ways off a reading row still
   * work: the swipe, and the × a pointer gets.
   *
   */
  await ready(page);
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await onShelfPage(page);
  const row = page.locator('.shelf-row').first();
  await expect(row).toBeVisible();
  await expect(page.locator('.shelf-row .bookmark')).toHaveCount(0);
  // The row is still the whole of a card: a picture or its slot, a name, dates.
  await expect(row.locator('.index-name')).toHaveCount(1);
  // And it can still be cleared, which is what the mark was standing next to.
  await expect(row.locator('[data-forget]')).toHaveCount(1);
  await row.locator('[data-forget]').evaluate((el) => el.click());
  await expect(page.locator('.shelf-row')).toHaveCount(0);
});

test('the masthead is outlines in the served HTML, not text waiting for a face', async ({ page }) => {
  /*
   * GFS Nicefore is the only face here at `font-display: swap` and the only one
   * not preloaded, so a cold load printed the name in Literata and swapped it
   * when the file landed. **This reverses Addendum G6's rejection of an SVG
   * wordmark**, which was rejected in favour of preloading the *body* subsets.
   *
   * Asserted against the **raw HTML** rather than the rendered page: the veil is
   * what a reader looks at while the modules are still parsing, so a mark
   * injected by JavaScript would be exactly as late as the font was.
   *
   */
  const html = await (await page.request.get('/')).text();
  const marks = [...html.matchAll(/<svg[^>]*class="brand-mark"/g)];
  expect(marks.length, 'the veil and the masthead should both carry the mark').toBe(2);
  /*
   * **The body, not the document.** `<title>AGIOS</title>` matches this probe;
   * the claim has always been about the *masthead*, and the tab's title is text
   * on purpose — not a thing a face can arrive late for.
   */
  const body = html.slice(html.indexOf('<body'));
  expect(body, 'the wordmark should not still be live text').not.toContain('>AGIOS<');

  await page.goto('/calendar/2026-08-28', { waitUntil: 'networkidle' });
  const mark = page.locator('.site-name .brand-mark');
  await expect(mark).toBeVisible();

  // It is sized in em, so the narrow rule's font-size clamp still shrinks it.
  const box = await mark.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, font: parseFloat(getComputedStyle(el.parentElement).fontSize) };
  });
  expect(box.h, 'the mark is 0.9em tall, so 1000 font units are 1em').toBeCloseTo(box.font * 0.9, 0);
  expect(box.w).toBeGreaterThan(box.h);

  // And it still names itself, since it replaced text that did.
  await expect(mark).toHaveAttribute('aria-label', 'AGIOS');
});

test('the two Latin subsets are preloaded, and only those', async ({ page }) => {
  /*
   * Addendum G6. `font-display: optional` stands and is *why* this matters:
   * optional gives the file about a hundred milliseconds and then keeps the
   * fallback for the life of the page, so a preload is what puts the face
   * inside that window without the layout shift `swap` would cost.
   *
   * Read out of the served HTML rather than off a live page: this is a claim
   * about what the document says before anything runs.
   *
   */
  const html = await (await page.request.get('/')).text();
  const links = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)].map((m) => m[0]);
  expect(links.length, html.slice(0, 400)).toBe(2);

  const latin = links.find((tag) => /literata-normal-latin-[^"]*\.woff2/.test(tag) && !/latin-ext/.test(tag));
  const ext = links.find((tag) => /literata-normal-latin-ext-[^"]*\.woff2/.test(tag));
  /*
   * **Two different files.** Vite's hash can itself begin with a hyphen, so a
   * pattern loose enough to match a hash after `literata-normal-latin-` also
   * matches `ext-`, and the first build shipped the same subset twice.
   */
  expect(latin, 'the plain Latin subset is not preloaded').toBeTruthy();
  expect(ext, 'the Latin-ext subset is not preloaded').toBeTruthy();
  expect(latin).not.toBe(ext);

  for (const tag of [latin, ext]) {
    // Without `crossorigin` the browser fetches the file a second time for the
    // CSS and the preload is a cost rather than a saving.
    expect(tag, 'a font preload without crossorigin is fetched twice').toContain('crossorigin');
    expect(tag).toContain('as="font"');
  }

  // And not the italics, nor the Greek and Cyrillic subsets: italic appears
  // inside lives rather than at first paint, and a reader in one script should
  // not be made to fetch three others.
  expect(links.join(' ')).not.toContain('italic');
  expect(links.join(' ')).not.toContain('cyrillic');
  expect(links.join(' ')).not.toContain('greek');
});

/*
 * `--chrome-h-reserve` in base.css exists to stop the bar growing into place at
 * boot, which was the site's whole layout shift (brief §13). Reserving the
 * wrong number restores the shift when it is short and leaves a permanent strip
 * of dead air when it is long, and neither says anything on the page.
 *
 * All three breakpoints, because the narrow header is two rows and the wide one
 * is one — and it is the *narrow* value that no desktop-only run would check.
 */
for (const [label, width, expected] of [
  ['narrow, two rows', 360, 75.5625],
  ['wide, one row', 900, 41],
  ['very wide, the doubled mark', 1440, 52.5],
]) {
  test(`the header reserves the height it settles at: ${label}`, async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width, height: 780 } });
    const page = await ctx.newPage();
    // The fixture only decorates the injected `page`, and this test opens its
    // own context — so the rehearsal has to be applied by hand, and asserted.
    await coldFace(page);
    await ready(page);
    await page.goto(INDEX, { waitUntil: 'networkidle' });

    const [reserved, settled] = await page.evaluate(() => {
      const header = document.querySelector('header.chrome');
      /*
       * The declared value, not a probe element's rect: a box is snapped to
       * device pixels while the header, sized by its own content, keeps the
       * fraction. Trap 9's cousin — the property resolves fine, holding a plain
       * length rather than a `clamp()`, and it is the *rendering* that rounds.
       */
      const declared = getComputedStyle(document.documentElement).getPropertyValue('--chrome-h-reserve');
      return [parseFloat(declared), header.getBoundingClientRect().height];
    });

    expect(reserved, `--chrome-h-reserve is ${reserved} at ${width} px, not the ${expected} this pins`).toBeCloseTo(expected, 2);
    /*
     * Exactly, not "at least": a settled header taller than the reservation is
     * the shift coming back, shorter is dead air. The height is face-
     * independent — it comes from the controls' line-heights and the nav is
     * forbidden to wrap — which is what makes a pixel constant safe here.
     */
    expect(settled, `the header settles at ${settled} but reserves ${reserved}`).toBeCloseTo(reserved, 1);
    await ctx.close();
  });
}

/* ---- About: the editorial policy (Session 9, 2026-08-29) ---------------- */

test('About states the coverage from the corpus, not from memory', async ({ page }) => {
  /*
   * Brief §8.4 wants the coverage statistics here, and the point of putting
   * them on the page is that they are *read* — so the assertion is against
   * `manifest.meta.json` itself. A number typed into a sentence would fail the
   * next time a folder was added.
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });

  const meta = await page.evaluate(() => fetch('/data/manifest.meta.json').then((r) => r.json()));
  const coverage = page.locator('[data-coverage]');

  await expect(coverage).toContainText(String(meta.total));
  await expect(coverage).toContainText(String(meta.by_century.undated));
  await expect(coverage).toContainText(String(meta.total - meta.unlocated));

  // Commemorations are summed across the four churches rather than stored.
  const commemorations = Object.values(meta.by_church).reduce((n, c) => n + c.venerated, 0);
  await expect(coverage).toContainText(String(commemorations));
});

test('About names the publications the corpus actually cites', async ({ page }) => {
  /*
   * Not the registry's prose: `src/data/churches.js` names the source each
   * church's *daily calendar* comes from, which is not always the publication
   * the attestations were read from. `by_source` in the build counts what is
   * actually cited, and this is what stops the page drifting back to the prose.
   */
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });

  const meta = await page.evaluate(() => fetch('/data/manifest.meta.json').then((r) => r.json()));
  const sources = page.locator('[data-sources]');

  for (const [church, cited] of Object.entries(meta.by_source)) {
    for (const { host, count } of cited) {
      await expect(sources, `${church} should cite ${host}`).toContainText(host);
      await expect(sources).toContainText(String(count));
    }
  }
  // And each one is a link a reader can follow.
  await expect(sources.locator('a[href^="https://"]').first()).toBeVisible();
});

test('About says which reckoning each church keeps, and says it from the registry', async ({ page }) => {
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });

  /*
   * Read off `default_calendar` in the registry rather than restated in prose,
   * so a church whose reckoning changed changes this section with it. The
   * assertion is that the page and the registry agree.
   */
  const said = await page.locator('section[aria-labelledby="calendars"] li').allTextContents();
  const line = (name) => said.find((t) => t.startsWith(name)) ?? '';
  expect(line('Russian')).toContain('Old Calendar');
  expect(line('Serbian')).toContain('Old Calendar');
  expect(line('Romanian')).toContain('New Calendar');
  expect(line('Greek')).toContain('New Calendar');
});

test('About no longer promises the page it now is', async ({ page }) => {
  // The placeholder said the policy "is written as substance in Session 9".
  // It is, so the sentence has to be gone — a page that still promises itself
  // is the tell that the section was added beside the placeholder rather than
  // in place of it.
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  await expect(page.locator('#view')).not.toContainText('Session 9');
  await expect(page.locator('#view')).not.toContainText('boilerplate');
});

/* ---- export / import (Session 8's surviving third, 2026-08-29) ---------- */

test('the reader can take their data with them, and bring it back', async ({ page }) => {
  // Brief §11: "Export / Import as JSON ... real cross-device portability for
  // zero backend." The store's merge rules have unit tests; this is the round
  // trip through the real controls, as a reader meets it.
  await ready(page);
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await page.locator('[data-save]').first().click();
  await expect(page.locator('[data-save]').first()).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/about', { waitUntil: 'networkidle' });
  const download = page.waitForEvent('download');
  await page.locator('[data-export]').click();
  const exported = await (await download).path();

  // A different reader's device: storage cleared, nothing saved.
  await page.evaluate(() => indexedDB.deleteDatabase('gallery-of-saints'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-save]').first()).toHaveAttribute('aria-pressed', 'false');

  await page.goto('/about', { waitUntil: 'networkidle' });
  await page.locator('[data-import-file]').setInputFiles(exported);
  await expect(page.locator('[data-import-note]')).toContainText(/Imported/);

  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-save]').first()).toHaveAttribute('aria-pressed', 'true');
});

test('a file that is not an export changes nothing and says so', async ({ page }) => {
  await ready(page);
  await page.goto('/about', { waitUntil: 'networkidle' });
  await page.locator('[data-import-file]').setInputFiles({
    name: 'not-an-export.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schema":99}'),
  });
  await expect(page.locator('[data-import-note]')).toContainText('nothing was changed');
});

test('the header takes one measure on every route, and stops at Daily’s column', async ({ page }) => {
  /*
   * Author, 2026-09-01: "The header on Daily and Map page are different widths
   * from the All Saints and About page, make sure they are the same."
   *
   * Nothing in the stylesheet made them different — the header takes one
   * measure on every route (`--page-max`, base.css) and this suite has pinned
   * that since the masthead doubled. What made them different was the window.
   * Daily and Map hold the page still (`html { overflow: hidden }`, one so the
   * columns can scroll themselves and one so the canvas can fill the glass), so
   * neither draws a classic scrollbar while All Saints and About do — 15 px of
   * window on Windows and Linux, and the masthead sitting 7 px further left on
   * half the site than on the other half.
   *
   * **The geometry half of this test cannot see that**, and saying so is the
   * point of this paragraph: the browser these tests run in has overlay
   * scrollbars, where the four routes measure the same either way. So the fix
   * is pinned where it can be seen — the declaration that reserves the room —
   * and the geometry is pinned beside it because it is the thing that would
   * break if a route ever took its own measure again.
   */
  const routes = ['/calendar/2026-08-25', '/saints', '/about', '/map'];
  const seen = [];
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    seen.push(
      await page.evaluate(() => {
        const r = (s) => {
          const b = document.querySelector(s).getBoundingClientRect();
          return [Math.round(b.left), Math.round(b.right)];
        };
        const css = getComputedStyle(document.documentElement);
        return {
          gutter: css.scrollbarGutter,
          header: r('header.chrome'),
          mark: r('header.chrome .site-name'),
          corner: r('header.chrome .chrome-corner'),
          // Daily alone: the left column the bar is now the head of, and the
          // sidebar whose width and gutter are what came out of the measure.
          // Measured off the boxes rather than read off `--side-w`, which is
          // `19rem` and does not compute to pixels through a custom property.
          bar: r('.chrome-bar'),
          column: document.querySelector('.cal-main') ? r('.cal-main') : null,
          side: document.querySelector('.cal-bubble') ? r('.cal-bubble') : null,
        };
      }),
    );
  }

  /*
   * **The mark's whole rect again, since 2026-09-10.** It was narrowed to the
   * left edge alone earlier the same day, when the rebuild
   * §2.2 scoped `--text-mast-wide: 22px` to the Daily route and Daily's
   * masthead was therefore a different size from the other three. The author
   * reversed that within the day — one size everywhere — so the whole rect is
   * the claim once more, and it is the stronger one: a left edge alone would
   * pass a masthead that started in the right place at any size at all, which
   * is exactly the state this line was relaxed into.
   *
   * **And the corner's *right* edge, not its whole box, since 2026-09-10.**
   * Past 1024 px the Daily page's three controls are in the sidebar's head
   * (§2.2 route (c), step 6 of §10.12), so `.chrome-corner` is an empty box
   * there and collapses to a point. Its right edge is where it always was —
   * `justify-self: end` in the header's grid, so it is the header's own
   * content edge — which is the number this line has always been standing for.
   * Where those controls went is asserted on Daily itself, in
   * `daily-panel.spec.js`, rather than inferred from a width here.
   *
   * **And Daily's row now *ends* somewhere else on purpose, since 2026-09-10**
   * (§2.2's last open piece): past 1024 px the bar is that page's left column's
   * own head, so its box stops where the column does and the sidebar stands
   * beside it rather than under it. That is the one difference between the
   * four routes this test is allowed to have, and it is asserted as a
   * *derivation* rather than excused — the row ends at the column's own right
   * edge, and the distance back to where the other three end is exactly the
   * sidebar and the gutter between them. A bar that simply lost 336 px would
   * pass a constant and fail this.
   *
   * The three site routes keep the whole of what this test was written for:
   * one box, one measure, whether or not the page under them scrolls.
   */
  const [daily, ...site] = routes;
  for (const [i, route] of routes.entries()) {
    expect(seen[i].gutter, `${route} does not hold the scrollbar's room`).toBe('stable');
    expect(seen[i].mark, `${route} draws the mark in its own box`).toEqual(seen[0].mark);
  }
  for (const [i, route] of site.entries()) {
    const s = seen[i + 1];
    expect(s.header, `${route} lays the header out in its own box`).toEqual(seen[1].header);
    expect(s.corner[1], `${route} ends the header row somewhere else`).toEqual(seen[1].corner[1]);
  }

  const d = seen[0];
  expect(d.column, `premise: ${daily} draws no left column at 1280`).not.toBeNull();
  expect(d.bar[1], `${daily} does not stop the bar at the left column`).toBe(d.column[1]);
  expect(d.corner[1], `${daily} ends the header row past its own column`).toBe(d.column[1]);
  expect(
    seen[1].corner[1] - d.corner[1],
    `${daily} gives up ${seen[1].corner[1] - d.corner[1]} px where the sidebar and its gutter are ${d.side[1] - d.column[1]}`,
  ).toBe(d.side[1] - d.column[1]);

  /*
   * And not on a phone, which the author scoped out ("make sure 5 6 7 are on
   * desktop only") and which has nothing to hold room for: a 7 px gutter out of
   * 360 is a real cost against a scrollbar that is drawn over the page rather
   * than beside it.
   */
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/saints', { waitUntil: 'networkidle' });
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter))
    .toBe('auto');
});

test('the masthead is one box on all six routes, at both widths and in both themes', async ({ page }) => {
  /*
   * **Twice Playwright's budget**, for the same reason `map.spec.js` has one:
   * twenty-four `networkidle` navigations, two of them the map and four of
   * them the Daily page. A geometry test that times out reports a defect in
   * the masthead it never looked at.
   */
  test.setTimeout(60_000);
  /*
   * **Measured, not read off the token, and that is the instruction.** A
   * `--text-mast-wide` assertion passes on a route whose masthead a second
   * rule then sets in pixels, and says nothing about *where* the mark lands.
   *
   * **Both themes, because the mark is a picture of a word**: `fill:
   * currentColor` over paths whose advances are baked in, so a theme cannot
   * move it — which a route-scoped colour rule with its own font-size would
   * break silently.
   */
  const routes = ['/calendar/2026-09-05', '/saints', '/saints/anthony-the-great', '/map', '/texts', '/about'];
  await ready(page);
  await coldFace(page);

  const readings = [];
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      for (const route of routes) {
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        if (dark !== (await page.evaluate(() => document.documentElement.classList.contains('dark')))) {
          await page.locator('#theme-toggle').click();
          // The cross-fade is 300 ms of colour and moves no box, but the press
          // is a real click and the next read should not race it.
          await page.waitForTimeout(400);
        }
        readings.push({
          where: `${route} @ ${width} ${dark ? 'vigil' : 'day'}`,
          width,
          ...(await page.evaluate(() => {
            const mark = document.querySelector('header.chrome .site-name .brand-mark');
            const r = mark.getBoundingClientRect();
            return {
              rect: [r.left, r.top, r.width, r.height].map((n) => Math.round(n * 100) / 100),
              size: getComputedStyle(mark.closest('.site-name')).fontSize,
              paths: mark.querySelectorAll('path').length,
              label: mark.getAttribute('aria-label'),
              ink: getComputedStyle(mark.closest('.site-name')).color,
            };
          })),
        });
      }
    }
  }

  for (const width of [1280, 1440]) {
    const here = readings.filter((r) => r.width === width);
    const first = here[0];
    for (const r of here) {
      expect(r.rect, `${r.where} draws the masthead in its own box, not ${first.where}'s`).toEqual(first.rect);
      expect(r.size, `${r.where} sets the masthead at its own size`).toEqual(first.size);
      expect(r.paths, `${r.where} draws a different mark`).toEqual(first.paths);
      expect(r.label, `${r.where} names the mark something else`).toEqual(first.label);
    }
    // The premise: a mark of zero width would satisfy every equality above.
    expect(first.rect[2], `the masthead has no width at ${width}`).toBeGreaterThan(40);
  }

  // §2.2's surviving half: Daily's ink alone is a step back from the rest.
  const inkOn = (route) => readings.find((r) => r.where.startsWith(`${route} @ 1280 day`)).ink;
  expect(inkOn('/calendar/2026-09-05'), 'Daily’s masthead is at full ink like every other route’s')
    .not.toBe(inkOn('/saints'));
  expect(inkOn('/map'), 'a route other than Daily quietened its masthead').toBe(inkOn('/saints'));
});


test('a press outside a chooser closes it', async ({ page }) => {
  /*
   * `pointerdown` is what closes them, so this presses rather than clicks — a
   * click would fire too, but pressing is the moment the reader has said they
   * are done with the panel.
   */
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  for (const [open, panel] of [
    ['#church-open', '#church-panel'],
    ['#lang-open', '#lang-panel'],
  ]) {
    await page.locator(open).click();
    await expect(page.locator(panel), `${panel} did not open`).toBeVisible();
    // Somewhere squarely on the page and outside both the panel and its button.
    await page.mouse.click(700, 700);
    await expect(page.locator(panel), `${panel} stayed open`).toBeHidden();
    await expect(page.locator(open)).toHaveAttribute('aria-expanded', 'false');
  }

  /*
   * **And the other chooser is not "outside"**: the two are independent
   * disclosures, both may stand open at once, and reaching for the second is
   * not dismissing the first. It was taken away for one build, and `the
   * calendar panel follows a language change while it is open` caught it.
   */
  await page.locator('#church-open').click();
  await expect(page.locator('#church-panel')).toBeVisible();
  await page.locator('#lang-open').click();
  await expect(page.locator('#lang-panel')).toBeVisible();
  await expect(page.locator('#church-panel'), 'the calendar panel closed when the language one opened').toBeVisible();
});

test('the masthead stands the same distance off the nav as the nav’s own words do', async ({ page }) => {
  // The header's five tracks are `space-3` apart, a number measured for the
  // narrow row where four gaps decide whether Romanian fits on one line; the
  // nav's own labels are at `space-8` on a desktop, so one gap in a row of
  // four would otherwise be a third the size of the others.
  //
  await ready(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/calendar/2026-09-05', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const gaps = await page.evaluate(() => {
    const name = document.querySelector('.site-name').getBoundingClientRect();
    const links = [...document.querySelectorAll('nav.site-nav a')].map((a) => a.getBoundingClientRect());
    return {
      mastheadToFirst: Math.round(links[0].left - name.right),
      betweenLinks: Math.round(links[1].left - links[0].right),
    };
  });
  expect(gaps.betweenLinks, 'premise: the labels are not spaced apart here').toBeGreaterThan(20);
  expect(
    Math.abs(gaps.mastheadToFirst - gaps.betweenLinks),
    `masthead gap ${gaps.mastheadToFirst} against ${gaps.betweenLinks} between labels`,
  ).toBeLessThan(3);
});

test('the theme crosses in one movement: nothing snaps and nothing lags, on every route', async ({ page }) => {
  /*
   * **This is the instrument**; the three unit tests beside it in
   * `tests/design-tokens.test.mjs` are the cheap guards on the way here.
   * Nothing in a stylesheet can say which elements the reader watches — that
   * is a fact about the rendered page, and the old arrangement read as a
   * deliberate, complete-looking rule for three weeks.
   *
   * **It synchronises on the ground rather than on the clock.** A sample at a
   * fixed number of milliseconds measures this machine; the frame is chosen by
   * `body`'s own progress instead, and every element read inside it.
   *
   * Two failures are possible and both are checked, because a colour crossing
   * at the *wrong* rate and one not crossing at all are different defects: at
   * the synchronising frame nothing may have arrived (the snap), and after the
   * fade nothing may still be travelling (the lag).
   *
   */
  const routes = ['/calendar/2026-01-30', '/saints', '/saints/anthony-the-great', '/map', '/texts', '/about'];
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const seen = await page.evaluate(async () => {
      /*
       * Only what a reader can watch change on *this* element. `color` on a
       * box with no text, and four border colours on a box with no border, are
       * one inherited number reported five times — counting those made the
       * original defect look like a tie.
       */
      const PROPS = ['backgroundColor', 'color', 'borderTopColor', 'borderBottomColor',
        'borderLeftColor', 'borderRightColor', 'fill', 'stroke'];
      const nodes = [];
      for (const el of document.querySelectorAll('*')) {
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo);
          if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const on = new Set();
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') on.add('backgroundColor');
          for (const side of ['Top', 'Bottom', 'Left', 'Right']) {
            if (parseFloat(cs[`border${side}Width`]) > 0) on.add(`border${side}Color`);
          }
          if (el instanceof SVGElement) { on.add('fill'); on.add('stroke'); }
          if (pseudo || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) on.add('color');
          if (on.size) nodes.push({ el, pseudo, on, name: label(el) + (pseudo || '') });
        }
      }
      function label(el) {
        const cls = typeof el.className === 'string' && el.className.trim()
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
        return el.tagName.toLowerCase() + cls + (el.id ? '#' + el.id : '');
      }

      const read = () => nodes.map(({ el, pseudo }) => {
        const cs = getComputedStyle(el, pseudo);
        return PROPS.map((k) => cs[k]);
      });
      const channels = (v) => (String(v).match(/[\d.]+/g) || []).map(Number);
      // How far this reading has travelled from `a` towards `b`, 0 to 1, on
      // the widest-moving channel — the one whose reading rounding cannot eat.
      const progress = (now, a, b) => {
        const [A, B, N] = [channels(a), channels(b), channels(now)];
        if (A.length !== B.length || N.length !== A.length) return null;
        let widest = -1;
        let i = -1;
        A.forEach((x, j) => { if (Math.abs(x - B[j]) > widest) { widest = Math.abs(x - B[j]); i = j; } });
        if (widest < 24) return null;   // too close to resolve; not evidence either way
        return (N[i] - A[i]) / (B[i] - A[i]);
      };

      const press = document.getElementById('theme-toggle');
      const settle = () => new Promise((r) => setTimeout(r, 800));

      /*
       * **Both ends are learned before the journey that is measured.** Read
       * the "end" value a second after the press and it is the transition's
       * own first frame, so every progress figure comes out near zero and the
       * test passes by measuring nothing. The first press finds where the page
       * lands; the press after it is the one watched.
       */
      const ground = () => getComputedStyle(document.body).backgroundColor;
      const start = read();
      const groundTo = ground();
      press.click();
      await settle();
      const before = read();          // vigil, and the leg below leaves it
      const after = start;            // day, where that leg lands
      const groundFrom = ground();
      press.click();

      // The frame the ground is between a quarter and three quarters across.
      let mid = null;
      for (let i = 0; i < 200 && !mid; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const p = progress(ground(), groundFrom, groundTo);
        if (p !== null && p > 0.25 && p < 0.75) mid = { p, v: read() };
      }
      await settle();

      const early = [];
      const late = [];
      const moving = [];
      nodes.forEach((n, i) => {
        PROPS.forEach((prop, j) => {
          if (!n.on.has(prop) || before[i][j] === after[i][j]) return;
          const p = mid && progress(mid.v[i][j], before[i][j], after[i][j]);
          if (p === null || p === undefined) return;
          moving.push(`${n.name}{${prop}}`);
          if (p >= 0.999) early.push(`${n.name}{${prop}} had already arrived`);
          if (p <= 0.001) early.push(`${n.name}{${prop}} had not started`);
          const settled = progress(after[i][j], before[i][j], after[i][j]);
          if (settled !== null && Math.abs(settled - 1) > 0.001) late.push(`${n.name}{${prop}} never arrived`);
        });
      });
      return { groundProgress: mid && mid.p, moving: moving.length, early, late };
    });

    expect(seen.groundProgress, `${route}: the ground never crossed, so nothing was measured`).not.toBeNull();
    // The premise: a route where nothing resolvable changes colour would pass
    // every assertion below by having nothing to check.
    expect(seen.moving, `${route} draws nothing that changes colour with the theme`).toBeGreaterThan(4);
    expect(seen.early, `${route} does not cross as one movement`).toEqual([]);
    expect(seen.late, `${route} leaves a colour behind`).toEqual([]);
  }
});
