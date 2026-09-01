import { devices } from '@playwright/test';
import { coldFace, test, expect } from './fixtures.js';
import {
  DETAIL,
  EMPTY,
  INDEX,
  POPULATED,
  aDayThatIsNotToday,
  answered,
  facet,
  openChooser,
  panelSettled,
  ready,
  searchMode,
  swipe,
} from './helpers.js';

/**
 * The chrome: the header, its two choosers, the coachmarks, the shelf and the theme.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
 */

/*
 * All Saints opens on the carousel, and almost every test that visits it was
 * written about the other mode. The suite states which face it is testing
 * rather than each of forty-odd tests growing a line to press the toggle —
 * `searchMode` in helpers.js argues it. **Every spec file needs this**: it was
 * one `beforeEach` over one file, and dropping it from any of them would hand
 * those tests the carousel instead.
 */
test.beforeEach(async ({ page }) => {
  await searchMode(page);
});

test('Continue reading reappears after a saint has been opened', async ({ page }) => {
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const shelf = page.locator('.shelves');
  await expect(shelf).toContainText('Continue reading');
  await expect(shelf.locator('a[data-prefetch="moses-the-hungarian"]')).toHaveCount(1);

  // The shelf wears the Index's own row dress (author, 2026-08-24): the same
  // card classes, so the two read as one register. **The mark that stood at
  // its trailing edge went on 2026-08-28** ("Remove bookmark on continue
  // reading row cards"), which is the last row on the site to lose one — the
  // Index's rows lost theirs the day before and this one was still copying a
  // dress that had moved on. The × below is now the only control on the row.
  const shelfRow = shelf.locator('.index-card.is-row.shelf-row').first();
  await expect(shelfRow).toBeVisible();
  await expect(shelfRow.locator('.index-name')).toContainText('Moses the Hungarian');
  await expect(shelfRow.locator('.bookmark')).toHaveCount(0);
  /*
   * The × came back on 2026-08-25, *on the desktop only* and to the right of
   * the bookmark: a mouse has the swipe too, but a visible control is the
   * faster hand where there is a cursor to aim it. It is the same button
   * either way — always in the markup, carrying the whole sentence as its
   * accessible name, let out of its clip by `(hover: hover) and (pointer:
   * fine)`.
   *
   * Both of this suite's projects are Desktop Chrome — mobile-360 is a narrow
   * viewport, not a touch device (playwright.config.js) — so both take the
   * hovering branch here, and the query is read at runtime rather than
   * assumed from the project's name. The touch half has a test of its own
   * below, on a real touch device, because a branch asserted only where it
   * cannot run is not asserted at all.
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
  /*
   * **The × is placed against the row itself now** (2026-08-28). It used to be
   * measured from the bookmark it stood beside — "after the mark, and the mark
   * centred on the row" — and the author took that mark off these rows. Every
   * claim the × makes on its own account survives: an ×, visible where there
   * is a cursor to aim it, centred on the row, at the trailing edge, carrying
   * the whole sentence as its name.
   */
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
  // everyone who cannot swipe (DESIGN.md §5b). Focus reveals the control.
  await shelf.locator('.shelf-remove').first().focus();
  await expect(shelf.locator('.shelf-remove').first()).toBeVisible();
  await shelf.locator('.shelf-remove').first().click();
  await expect(shelf).not.toContainText('Continue reading');
});

test('a Continue reading row is swiped away, and a short push springs back', async ({ page }) => {
  /*
   * Author, 2026-08-24: the × goes and "if you swipe across on them they get
   * removed". Pointer events, so the mouse does it too — the same reversal
   * the week rail made when it took the desktop drag.
   *
   * The spring-back half is the one worth pinning hardest: a row that
   * vanished on any push at all would make the shelf unscrollable by touch,
   * and a row that never moved would read as a dead press. So: a short push
   * leaves the row exactly where it was and still on the shelf, and a long
   * one takes it off.
   */
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const rows = page.locator('.shelf-row');
  await expect(rows).toHaveCount(2);
  // The push starts on the saint's *name*, which is where a reader's finger
  // or cursor lands and — as the first rendering of this gesture showed — the
  // one place it can be stolen: a row is a link with a picture in it, and
  // dragging a link starts a native drag that cancels the pointer stream.
  // Pushing from the thumbnail instead would pass with that defect present.
  // `pause` is what separates a haul from a flick: 30 ms a step is a hand
  // moving deliberately, 0 is a hand snapping. The shelf measures the last
  // 80 ms of travel at the release, so the two produce velocities an order of
  // magnitude apart from the same distance.
  const push = async (distance, pause = 0) => {
    const name = rows.first().locator('.index-name');
    const box = await name.boundingBox();
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
   * **The two halves parted on 2026-08-26** (author: "Make the swipe on the
   * Continue Reading row cards easier, it snaps back too easily making it too
   * hard to remove"). Until then "short" was the whole test of intent, and 70 px
   * pushed at any speed sprang back.
   *
   * A short push is now two different gestures and the shelf reads them
   * differently: a short *slow* one is a reader nudging a row and it springs
   * back; a short *fast* one is a flick and the row goes. That second reading is
   * the fix — a real swipe across a row is over in about a tenth of a second and
   * covers a third of the width, which the old distance-only test called a miss.
   *
   * So this pushes slowly, with the moves spaced in time, and the flick has a
   * test of its own below.
   */
  await push(70, 30);
  // A real wait, and it has to be: a removal is a 200 ms flight and only then
  // a repaint, so asserting the count straight after the push passes while
  // the row is still on screen on its way out. (Caught by backing the
  // threshold out to zero and watching this test pass regardless.) Past the
  // flight, a row that was going is gone and a row that sprang back is home.
  await page.waitForTimeout(500);
  await expect(rows).toHaveCount(2);
  // Home again, not left hanging where the hand let go.
  expect(await rows.first().evaluate((r) => r.style.transform || 'none')).toBe('none');
  await expect(page).toHaveURL(/\/calendar\//); // the swipe did not open the saint

  await push(420, 30);
  await expect(rows).toHaveCount(1);
  await expect(page.locator('.shelves')).toContainText('Continue reading');
});

test('on a touch device the shelf row carries no ×, and the swipe still clears it', async ({ browser }) => {
  /*
   * The other half of 2026-08-25's instruction: the × came back "on desktop
   * only". A phone keeps the swipe alone, because a control sized for a
   * fingertip beside a bookmark on a 48 px row is how a reader clears a shelf
   * they meant to scroll past.
   *
   * This needs a real touch device — both of the suite's own projects are
   * Desktop Chrome, one of them merely narrow, and both report a fine
   * hovering pointer — so the media query that hides the × never fires there.
   */
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });
  const page = await ctx.newPage();
  await searchMode(page);
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

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
  const box = await name.boundingBox();
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
  await page.goto(EMPTY, { waitUntil: 'networkidle' });
  const row = page.locator('.shelf-row').first();
  const name = row.locator('.index-name');
  const box = await name.boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(x + (420 * i) / 8, y);
  await page.mouse.up();
  await expect(page.locator('.shelf-row')).toHaveCount(0);
  await expect(page.locator('.shelves')).not.toContainText('Continue reading');
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
   * Today's date stood under the theme control from 2026-08-21 to 2026-08-22
   * and is withdrawn. Wide, the row is unchanged: the calendar control — which
   * names the church the site reads — then the language control and the icon
   * toggle, all on one line, the bar no taller than it was with the date
   * (61 px). Narrow, the author rearranged it twice: on 2026-08-24 the name
   * spanned the top with the calendar control down on the nav's line, and on
   * 2026-08-25 that became **one line of chrome** — calendar control, name,
   * language and theme — with the four pages centred on a row beneath it,
   * "in one line across all screen sizes". So the "one line" assertion is
   * the wide branch's alone, and the narrow branch pins the arrangement that
   * replaced both: the three controls level with the name and in order across
   * it, the nav centred underneath, down to a 320 px phone.
   *
   * **The wide branch is measured in a wide utility face**, Amendment 24's
   * lesson applied to the header: `--font-utility` is the reader's own system
   * stack, so the same row is a different width on every machine — Segoe UI on
   * Windows, DejaVu Sans on a bare Linux runner. This row had 6 px of slack in
   * Segoe and was 20 px over in DejaVu, so it held one line on the desk that
   * built it and wrapped to 76 px in CI, unseen, from Amendment 36 (which put
   * the language control in the corner) until CI said so at Amendment 38. The
   * face is forced here, and the native one is printed to the run's log, so
   * the assertion is one width on every machine and the runner still says in
   * numbers what its own face costs.
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
  // DejaVu Sans is what a bare ubuntu runner has and is among the widest
  // faces a reader will meet; Verdana is its Windows/macOS equivalent in
  // width, and fontconfig aliases Verdana to DejaVu on Linux. Either way the
  // header is measured against the widest realistic chrome, not the local one.
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
      wide: innerWidth >= 560,
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
   * Author, 2026-08-25: the calendar control, the name and the two toggles
   * "remain in one line across all screen sizes". 320 px is the narrowest
   * phone the site meets, and the name is the elastic part — it gives up size
   * and then tail rather than pushing a control off the line, because a
   * calendar control that says nothing is worse than a smaller masthead.
   *
   * The first cut of this layout failed here in a way worth keeping a note
   * of: the name's track was a bare `1fr`, whose automatic minimum is
   * min-content, so a long name widened the track instead of ellipsising and
   * printed straight across the controls — at 320 px in English and at 360 in
   * Russian. `minmax(0, 1fr)` is the fix, and the same trap caught the
   * month's own span at Amendment 35.
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
   * Author, 2026-08-25 evening: "have an animation showing the pop-up shrink
   * and fade into the button it comes from so people remember where to click
   * to make changes."
   *
   * It is a teaching gesture, not decoration: the site hides both answers
   * behind two small controls in the header, and a reader who answers and
   * never sees where the answer went has to hunt for it next time. So the
   * assertion is about *direction* — the panel is travelling towards the
   * control, and has not simply faded where it stood.
   */
  await ready(page);
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });
  const button = page.locator('#church-open');
  const before = await button.boundingBox();
  await button.click();
  // The panel arrives with a flight of its own since 2026-08-26 evening, so
  // let it land before asking where it is: a box halfway through arriving is
  // at neither end of its journey, and the direction below is measured from
  // this rect.
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
  // Removed, not shortened (DESIGN.md §6). The lesson the flight carried is
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
  await expect(page.locator('.week-strip')).toBeVisible();
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
  await expect(page.locator('.week-strip')).toBeVisible();
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
  await expect(page.locator('.week-strip')).toBeVisible();
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
  // Author, 2026-08-23. The name in the head and the page's nav label. The
  // header's own corner reads a second, deliberately different name from the
  // head's — "Orthodoxy Daily" until 2026-08-27, when it was renamed "Daily
  // Dox" alongside the Byzantine-majuscule display face. The veil carried the
  // head's name until 2026-08-24 and now carries the header's; that has a
  // test of its own below. The route stays /calendar so no link breaks. Since
  // 2026-08-25 the header's name comes from the pack rather than from the
  // markup, so it follows the chosen language — the English pack says the
  // same words the markup used to.
  await ready(page);
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle(/The Orthodox Saint/);
  // The corner is outlines rather than text since 2026-08-28, so its name is
  // the mark's label. What this test is about — that the corner carries the
  // site's name and the nav's word for the habit page moves — is unchanged.
  await expect(page.locator('.site-name .brand-mark')).toHaveAttribute('aria-label', 'Daily Dox');
  /*
   * On a day that is not today the button reads **Today** since 2026-08-26
   * evening — press it and it goes back. The claim this test makes is about
   * the *base* word, so it is read where the base word is what shows: on
   * today itself, and on any page that is not the Daily one.
   */
  await page.goto(await aDayThatIsNotToday(page), { waitUntil: 'networkidle' });
  await expect(page.locator('.site-nav a[href$="/"]').first()).toHaveText('Today');
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.site-nav a[href$="/"]').first()).toHaveText('Daily');
  await expect(page.locator('.site-nav')).not.toContainText('Calendar');
});

/* ---- the round of 2026-08-24 (Amendment 34) ----------------------------- */

test('the veil names the site the way the header does', async ({ page }) => {
  /*
   * Author, 2026-08-24. The loading veil read "The Orthodox Saint" — the
   * head's name — and now reads the header's, "Orthodoxy Daily" until
   * 2026-08-27's rename to "Daily Dox". This narrows Amendment 31's
   * deliberate two-name split to the <title> alone: the first thing a reader
   * sees painted and the name in the corner it fades into are now the same
   * words, and the split survives only where a reader meets it in a tab or a
   * bookmark.
   *
   * The veil is removed 300 ms after the manifest lands, so it is read out of
   * the served HTML rather than raced for in a live page.
   */
  const html = await (await page.request.get('/')).text();
  /*
   * **The veil carries the mark, not the words** (2026-08-28). The claim is
   * unchanged and so is the reason for reading the served HTML rather than the
   * live page: the veil is what a reader sees before the modules parse, so the
   * name has to be in the markup. It is now an SVG of the stamp face's own
   * outlines, which is what stopped it being painted in Literata first.
   */
  expect(html).toContain('class="veil-name" data-site-name><svg');
  expect(html).not.toContain('The Orthodox Saint</div>');
  // The head keeps its own name, which is the half of the split that stands.
  expect(html).toContain('<title>The Orthodox Saint</title>');

  /*
   * **And neither printed name follows the language any more** (author,
   * 2026-08-28: "make sure this new website title is applied to all languages,
   * it no longer gets translated, it stays constant as a stamp of branding").
   *
   * This supersedes 2026-08-25's "change the title on header and loading screen
   * to the picked language" rather than reversing it: what that instruction was
   * fixing was a name hard-coded in index.html and stale by a rename, and the
   * name still comes from exactly one place — `BRAND` in ui/strings.js. What
   * has changed is that the place is not the pack.
   *
   * The markup's own English is now simply right rather than a placeholder the
   * pack paints over, which is why the assertion above can read it out of the
   * served HTML at all.
   */
  await page.addInitScript(() =>
    localStorage.setItem('gos-settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('gos-settings') ?? '{}'), church: 'russian', language: 'ro' })),
  );
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  // The corner is outlines rather than text since 2026-08-28, so its name is
  // the mark's label. What this test is about — that the corner carries the
  // site's name and the nav's word for the habit page moves — is unchanged.
  await expect(page.locator('.site-name .brand-mark')).toHaveAttribute('aria-label', 'Daily Dox');
  // The tab keeps the *other* name and keeps translating it: Amendment 31's
  // split survives where a reader meets it in a tab or a bookmark, which is
  // the half the stamp instruction does not touch.
  await expect(page).toHaveTitle(/Sfântul Ortodox/);
});

test('the site mark is the Orthodox cross, in gold by instruction', async ({ page }) => {
  /*
   * Author, 2026-08-24. The favicon was one gold cell — the attested mark of
   * the veneration badge, which was removed whole at Amendment 25, so it had
   * been standing for a thing that no longer exists. It is now the
   * eight-pointed cross: upright, titulus, crossbar, and the slanted
   * footrest, whose slant is the whole of what makes it Orthodox rather than
   * Latin.
   *
   * It was drawn in ink for exactly one day. DESIGN.md §2 reserves gold for a
   * finding about veneration and nothing else, and a site mark is not one —
   * which is why Amendment 34 took the gold out. *The author put it back on
   * 2026-08-25* ("make the site icon gold colour orthodox cross"), and §2
   * records the exception in place: gold is spent here and nowhere else on
   * the site. So this pins the two gold tokens exactly — a mark drifting to
   * some other yellow would be the failure now — and the "spent nowhere else"
   * half is still guarded by its own test over the rendered pages.
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
  // #A98237 on a light tab strip, #C79A4B on a dark one. Ink here from
  // Amendment 34 until then.
  expect(svg.toLowerCase()).toContain('a98237');
  expect(svg.toLowerCase()).toContain('c79a4b');
  expect(svg).not.toContain('#221d19');
  // It flips rather than vanishing into a dark tab strip.
  expect(svg).toContain('prefers-color-scheme:dark');
});

test('the calendar chooser asks its question and offers the four, with nothing between', async ({ page }) => {
  /*
   * Author, 2026-08-24: the paragraph under the heading is removed outright.
   * It named the four churches and their two calendars in prose directly
   * above four buttons each printing exactly that, so it said the choices
   * twice and put four lines between the question and the answer.
   *
   * **One host since 2026-08-26**, where there were two. The component drew the
   * calendar page's first-visit gate as well as the header's panel; the gate is
   * gone with the coachmarks that replaced it, so the header's panel is the
   * whole of where this question is now asked — which is also where the marks
   * point.
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
   * Author, 2026-08-24: the control read "{church} calendar" and now wears a
   * calendar mark and the church's name alone, to give the header its width
   * back. The mark is the same drawing as the month toggle on the calendar
   * page, one size down.
   *
   * The accessible name is the part that must not thin out with the visible
   * text: an icon says nothing to a screen reader, and the aria-label used to
   * swallow the church's name while the visible text carried it. It now says
   * which church as well as what a press does.
   */
  await ready(page, { church: 'romanian' });
  await page.goto(POPULATED, { waitUntil: 'networkidle' });
  const open = page.locator('#church-open');
  await expect(open).toHaveText('Romanian');
  await expect(open.locator('svg')).toHaveCount(1);
  await expect(open).toHaveAttribute('aria-label', /Romanian calendar/);
  await expect(open).toHaveAttribute('aria-label', /change which church/i);
  /*
   * Shorter than the sentence it replaced, which was the point of the change:
   * "Romanian calendar" at this face is comfortably past 130 px.
   *
   * Scaled by the control's own size since 2026-09-01, when the chrome
   * doubled past 1024 px: 130 was a measurement of 13.5 px type, and a bound
   * that ignores the type size stops being a claim about the *label* and
   * becomes one about the breakpoint.
   */
  const box = await open.boundingBox();
  const size = await open.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(box.width).toBeLessThan(130 * (size / 13.5));
});

test('About states the privacy policy, and states it as the code behaves', async ({ page }) => {
  /*
   * Author, 2026-08-24. Written against lib/settings.js and lib/store.js
   * rather than as boilerplate: the four things kept are the reading
   * position, the saved and recently-opened saints, the church and the theme,
   * and how the Index was left. A privacy policy that has drifted from the
   * code is worse than none, because a reader has no way to tell.
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

/* ---- the site's language (Amendment 36) --------------------------------- */

test('the language control offers five, each naming itself in its own tongue', async ({ page }) => {
  /*
   * Author, 2026-08-24. A globe mark and the current code between the
   * calendar control and the theme toggle; the panel offers each language in
   * its own name — «Русский», not "Russian" — because the reader who needs
   * the control is precisely the one who may not read the language the site
   * is currently in. Each choice carries its own lang attribute so a screen
   * reader pronounces it in that language.
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
  await ready(page);
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
  await expect(page.locator('h1')).toHaveText('Среда, 26 Августа 2026 г.');
  await expect(page).toHaveTitle(/Православный святой/);
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
   * Author, 2026-08-25: a contact option, "or even better if they can be
   * stored in the github repo by some built-in affordance so my name doesn't
   * get too involved". Issues are that affordance: no address is printed, no
   * form is posted anywhere, and a static site needs no server to receive
   * one. The trade - that an issue is public - is told to the reader before
   * they open one rather than after.
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
   * Author, 2026-08-25 evening: switching to Russian "the buttons for Daily,
   * All Saints, Map and About pages go into two rows because the content
   * column on the screen is too narrow. Make sure this never displays like
   * that."
   *
   * The header's wide grid used to hand the nav the *leftovers* of a `1fr`
   * track, and in Russian, Greek and Serbian what was left was narrower than
   * the four labels. Which of the two gives way is the whole decision, and
   * the nav wins: the four pages are how the site is used, the masthead is a
   * constant learnt once. So the nav has its own `auto` track and the name
   * pays in lines — «Ορθοδοξία / Καθημερινά», every word intact.
   *
   * The arithmetic is why there is no third option: at the 72ch column the
   * one-line row needs 678 px in Russian, 695 in Greek and 672 in Serbian
   * where 580 exist. Those three cannot hold one line at any gap.
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
           * rather than against 28 px. The chrome doubles past 1024 px
           * (2026-09-01), so a single line at 1280 is 39 px and a constant
           * bound would read that as a wrap; a second line is twice this
           * however large the type, which is what the assertion wants.
           */
          line: parseFloat(getComputedStyle(links[0]).lineHeight),
          overhang: Math.max(...links.map((a) => a.getBoundingClientRect().right)) - box.right,
          doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const where = `${language} at ${width}`;
      expect(seen.rows, where).toBe(1);
      expect(seen.tallest, where).toBeLessThan(seen.line * 1.6);
      expect(seen.overhang, where).toBeLessThan(1);
      expect(seen.doc, where).toBe(0);
    }
    await ctx.close();
  }
});

test('the chrome prints no em dashes, in any language', async ({ browser }) => {
  /*
   * Author, 2026-08-25 evening: "replace all emm dashes with normal dashes."
   * Swept across every string the site prints — ui/strings.js, the four
   * packs, the phrases lib/liturgy.js composes, the document title — by a
   * scanner that knows a string literal from a comment, so the house's own
   * prose keeps its em dashes and the reader gets none.
   *
   * What is deliberately *not* swept is the corpus. Those em dashes are
   * inside quoted source text and citation lines transcribed from four
   * synaxaria — 3,638 of them — and editing a quotation for typography is the
   * one thing Amendment 2 forbids. So this reads the chrome, element by
   * element, rather than the whole page: the exception is real and is named
   * here rather than left to be discovered.
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
          /*
           * The About page's own body, added 2026-08-29 with the editorial
           * policy. It is the site's own prose rather than the corpus's, so the
           * author's "replace all emm dashes" applies to it in full — and the
           * separator between a church and its calendar was an em dash for one
           * build, printed on every language, because this list read the chrome
           * around the page and not the page.
           */
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
   * Author, 2026-08-26: "make the animation of the calendar and language tabs
   * shrinking back to their buttons twice as fast, and make the rest of the
   * page go back up smoothly not just clicking into place higher on the page."
   *
   * The second half is the interesting one. These panels sit in the flow, so
   * hiding one at the end of its flight dropped everything below it by the
   * panel's whole height in a single frame — the flight was smooth and its
   * consequence was not. The space closes over the same duration now, and the
   * flier is pinned out of flow first so the closing box cannot clip it.
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
  await page.waitForTimeout(60);
  const midFlight = await page.evaluate(() => {
    const inner = document.querySelector('#church-panel .church-panel-inner');
    const box = document.querySelector('#church-panel');
    if (!inner) return null;
    const cs = getComputedStyle(inner);
    return {
      duration: cs.transitionDuration,
      // Out of the flow, so the band can close under it without clipping.
      position: cs.position,
      panelHeight: box.getBoundingClientRect().height,
      panelDuration: getComputedStyle(box).transitionDuration,
    };
  });
  // 160 ms, halved from the 320 it flew at for one day.
  expect(midFlight.duration).toMatch(/^0\.16s/);
  expect(midFlight.panelDuration).toMatch(/^0\.16s/);
  expect(midFlight.position).toBe('fixed');
  // The band is already closing rather than waiting to vanish at the end.
  expect(midFlight.panelHeight).toBeLessThan(timing.panelHeight);

  await expect(panel).toBeHidden();
  await expect(page.locator('#church-open')).toHaveText('Greek');
});

test('a panel reopened mid-flight is not emptied by the flight it interrupted', async ({ page }) => {
  /*
   * The regression the flight introduced, and the reason it has a test of its
   * own: closing pins the panel out of flow and collapses the band over 160
   * ms, and the callback that hides and empties it runs at the end. Reopen
   * inside that window and the old callback landed on the *new* panel —
   * leaving it open, empty and nought pixels tall, with its buttons
   * unclickable. A token cancels a flight the reader has overtaken.
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
   * The other half of 2026-08-26's "Make the swipe on the Continue Reading row
   * cards easier, it snaps back too easily making it too hard to remove", and
   * the half that actually fixes it.
   *
   * Distance alone was the test of intent, and a real swipe fails it: the
   * natural gesture is a quick push across a third of the row, over in about a
   * tenth of a second. So the release is measured as well — the last 80 ms of
   * travel, the same window the week rail reads its throw from — and a flick
   * dismisses whatever the distance.
   *
   * Same distance in both halves, so the only variable is the speed.
   */
  await ready(page);
  await page.goto('/saints/moses-the-hungarian', { waitUntil: 'networkidle' });
  await page.goto('/saints/anthony-the-great', { waitUntil: 'networkidle' });
  await page.goto(EMPTY, { waitUntil: 'networkidle' });

  const rows = page.locator('.shelf-row');
  await expect(rows).toHaveCount(2);

  /*
   * `steps` matters as much as `pause`, and the reason is the harness rather
   * than the shelf. Every mouse.move is a round trip to the browser, and under
   * a fully parallel suite those round trips are slow enough that eight of them
   * turn a flick into a haul — this test failed once that way and passed alone.
   * Three moves is still a gesture with a direction and a speed, and it leaves
   * the reading well clear of the threshold on a loaded machine.
   */
  const push = async (distance, { pause = 0, steps = 8 } = {}) => {
    const name = rows.first().locator('.index-name');
    const box = await name.boundingBox();
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
   * Author, 2026-08-26 evening: "when you click on the language or church
   * selector, please add the same animations to the popups (and the other
   * items on the page that move out of the way to accommodate the popups) as
   * the animations when you close them. the exact reverse."
   *
   * Closing had had a flight and a collapse since 2026-08-25; opening had
   * neither, so the panel appeared from nowhere and everything under the
   * header jumped down by its whole height in one frame. The two directions
   * share `journey()` in ui/fly.js now, so they cannot drift apart the first
   * time either is tuned.
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
   * DESIGN.md §6: reduced motion **removes**, never shortens. The close has
   * had its own test since the flight was written; the arrival needed one the
   * moment it gained an animation of its own, and it is the same rule — no
   * flight, no band opening, the panel simply at its full size on the first
   * frame after the press.
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
   * reading the box's rect; a panel halfway through arriving is at neither
   * end of its journey, so a close that began mid-arrival set off in the
   * wrong direction and by the wrong distance. Amendment 9's rule — land what
   * is still moving before the next move starts — met for the fifth time.
   *
   * The header's control sits at the top right on a desktop, so a panel
   * flying home travels *up*. That is the assertion, made after a press that
   * lands 40 ms into the opening flight.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/calendar/2026-06-28', { waitUntil: 'networkidle' });

  /*
   * The symptom is not the direction — a shrunken box still sits roughly
   * where the whole one did, so the flight still travels broadly upward. It
   * is the *place the flight starts from*. `flyInto` pins the flier out of
   * flow at the rect it read, so a rect read mid-arrival makes the panel jump
   * to a half-size box near the control and fly from there. Measured with the
   * landing removed: pinned at 583 x 38 and 295 px wide, against a resting
   * 334 x 61 and 612 px. That jump is what this asserts away.
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

test('the header is sticky, shorter, and the phone gets four equal pages', async ({ page }) => {
  /*
   * Three of the evening's instructions, which are one bar: "Make the site
   * header a sticky header", "make the header slightly shorter in height by
   * cropping more from the top margin", and — on a phone — "make the 'Daily',
   * 'All Saints', 'Map' and 'About' buttons equal width and stretch across
   * the whole width of the screen … slightly shorter in height … and make the
   * whole button go bold when selected".
   */
  /*
   * 900 rather than 1280 since 2026-09-01: past 1024 the chrome is deliberately
   * twice the size ("make header items 2x bigger and span across the whole
   * width of the window"), so the 2026-08-26 instruction this pins — a bar
   * made *shorter* by cropping its top margin — is about the sizes below that
   * breakpoint. The taller bar has its own pin: `the header reserves the
   * height it settles at`, which measures all three widths.
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

  // The phone's nav: four equal buttons, edge to edge.
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const nav = await page.evaluate(() => {
    const links = [...document.querySelectorAll('.site-nav a')];
    const boxes = links.map((a) => a.getBoundingClientRect());
    const current = links.find((a) => a.getAttribute('aria-current') === 'page');
    return {
      widths: boxes.map((b) => Math.round(b.width)),
      left: Math.round(Math.min(...boxes.map((b) => b.left))),
      right: Math.round(Math.max(...boxes.map((b) => b.right))),
      viewport: document.documentElement.clientWidth,
      height: Math.round(boxes[0].height),
      weight: current ? getComputedStyle(current).fontWeight : null,
      field: current ? getComputedStyle(current).backgroundColor : null,
    };
  });
  expect(new Set(nav.widths).size, `widths ${nav.widths.join(', ')}`).toBe(1);
  expect(nav.left, 'the row starts at the screen edge').toBe(0);
  expect(nav.right, 'and ends at it').toBe(nav.viewport);
  // Shorter than the buttons a comfortable padding would give, and shorter
  // than the 28 px the four-pages test allows at 320.
  expect(nav.height, `the buttons are ${nav.height} px`).toBeLessThan(28);
  // The whole button carries the current page, in weight and in a field —
  // never in colour alone, and `aria-current` says it besides.
  expect(Number(nav.weight)).toBeGreaterThanOrEqual(700);
  expect(nav.field).not.toBe('rgba(0, 0, 0, 0)');
});

test('a coachmark is shown once, and a guess is still not an answer', async ({ page }) => {
  /*
   * Found in review, 2026-08-27: both marks came back on every load, for ever.
   * They were gated on `hasChosen()` and `hasChosenLanguage()` — *has
   * answered* — and a reader content with the guessed calendar and with
   * English never answers either question. The reviewer met them on the fifth
   * visit and the fiftieth.
   *
   * The gate is *has been shown* now, written when the mark is mounted. What
   * must not go with it is the honesty the guess rests on: being shown a mark
   * still stores nothing about the church, so `hasChosen()` keeps its own
   * meaning, the header still names a guess as a guess, and the Index still
   * calls that church's saints a selection rather than the corpus.
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
   * Author, 2026-08-27, two instructions on one control. First: "if you press
   * 'Today' and you go back to the current date, the text 'Today' does not
   * change back to 'Daily', you need to press it again ... The rule should be,
   * if you are on the current date, it should say Daily, not Today." Second:
   * "to make it more obvious the 'Today' fade in has a specific
   * functionality, print 'Today' in gold whenever it is showing."
   *
   * The first was a race between two paints in one tick — the nav rebuilt for
   * the new route while the view had not yet said which day it was showing —
   * and the fade's own timer landing last. main.js has the whole account.
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
   * Author, 2026-08-27: "when you switch between them ... you come back to the
   * same spot. However, if you click on the page header button a second time,
   * it will scroll you back to the top of that page."
   *
   * Kept by section rather than by path — the Daily page is one place to a
   * reader whichever day it is showing — and in memory rather than in the
   * store, because it is where this visit left off and not a preference.
   *
   * **The presses are dispatched rather than clicked.** Playwright scrolls a
   * target into view before pressing it and the header is sticky, so an
   * ordinary `click()` can move the page to the top *before* the navigation
   * reads where the reader was — which is the one thing this test is about. A
   * reader pressing a bar already under their thumb does no such thing.
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
   * 2026-08-27, a reader, right after the test above shipped: "when you press
   * the current page header button, make sure it scrolld back to the top
   * instead of just jumping back with no animation. make sure its a set time
   * animation so if you scroll really far down it doesn't take ages to
   * animate back to the top."
   *
   * Two things pinned together. First, motion: `window.scrollY` is sampled on
   * every animation frame for a second after the press, entirely inside the
   * page — a click-then-sample round-tripped through Node instead, one
   * `page.evaluate` at a time, turned out to be measuring this suite's own
   * IPC latency as often as the animation: a real ease calls `scrollTo`
   * several times, at least one of them strictly between the start and 0; a
   * jump goes straight to 0 and every sample after the first frame reads it.
   * Second, *fixed* span: a scroll five times deeper must still settle inside
   * the same rough deadline, which is the difference between this
   * hand-rolled tween and the platform's own `scrollTo({ behavior: 'smooth'
   * })` — Chrome scales that one's duration with distance, which is exactly
   * "takes ages" for a long page.
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
   * Author, 2026-08-27, a follow-up to the test above: the section restore
   * used to run only after the cross-fade finished (`.finished.finally(...)`),
   * so the fade itself always ran from the top of the page and then jumped to
   * the remembered spot once the animation was over — the restore was real,
   * the fade lying about it was the bug. The fix moved the restore into
   * `swap`, after the view has rendered, so it lands before
   * `startViewTransition`'s new-state snapshot is taken and the fade crosses
   * into the right spot instead of past it.
   *
   * Measured through the transition's own `ready` promise rather than a fixed
   * wait: `ready` resolves once that snapshot has been captured and before
   * the animation runs, so whatever `window.scrollY` reads at that instant is
   * what the reader's fade actually shows. A `waitForTimeout` would be
   * measuring a clock rather than the moment the transition itself keys off.
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
   * Two of the author's smaller instructions, 2026-08-27: "make the dice
   * button square proportions. Keep the same corner fillet, just make it as
   * wide as it is tall", and "there is a horizontal line under the header
   * buttons ... There should be no margin. The bottom of the buttons should
   * coincide with that line."
   *
   * The die took its height from `--facet-h` on 2026-08-26 and its width did
   * not follow, which is what left it an upright pill; both read the same
   * token now, so a chip's padding change moves the two together. The row's
   * budget paid 3.3 px for it and another 14 for Church becoming Calendar —
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
   * Nothing between the bar's contents and its rule. On a phone the four page
   * buttons are the header's own last row, so the two coincide to the pixel;
   * on a desk the nav shares a line with the taller calendar control, and what
   * touches the rule there is whichever of them is tallest. So the padding is
   * asserted at both widths and the coincidence at the one where the buttons
   * are the thing in question.
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
   * Author, 2026-08-27: "when switching languages, make sure the choose church
   * calendar pop-up, which may still be open when changing languages, also
   * shows the updated language without having to close it first to see it
   * update."
   *
   * The button repainted on a language change and the panel did not, so a
   * reader who changed language with the calendar chooser open was left
   * reading the old one until they closed and reopened it. The panel is a
   * disclosure in the page's flow rather than a dialogue, so being open while
   * something else changes is its normal state, not an edge case.
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
   * And live, with the calendar panel open the whole time — which is the
   * author's own case. The two panels are independent disclosures and both can
   * stand open at once, so the language one is opened *over* the calendar one
   * and the calendar one is never pressed again.
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
   * Author, 2026-08-27: "Have the calendar and language popups stick to the
   * sticky header so you can access them at the bottom of a scrolled page."
   *
   * Asserted where it matters - far down a long page - because in the flow at
   * the top of the document a panel under the header looks identical whether
   * it sticks or not.
   */
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

  /*
   * **Dispatched, not clicked.** Playwright scrolls a target into view before
   * pressing it, and pressing a control in a sticky bar that way scrolls the
   * page back to the top — which is the one condition this test exists to get
   * away from. Backed out against a non-sticky bar, the `click()` version
   * passed: it had scrolled itself somewhere the claim was trivially true.
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
   * Author, 2026-08-27: "the website header still sometimes jumps up and down
   * when changing pages."
   *
   * The header element does not move — measured across six navigations at two
   * widths, it is pinned at 0 throughout. What moved was the *page*, and on a
   * phone the header rides it: the restore used to reset to 0 and scroll to
   * the remembered position a moment later, and arriving at 0 tells the
   * browser the reader is at the top, so it begins showing its URL bar and
   * then has to put it away again. One scroll, one direction, no bounce.
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
   * **The depth is taken from the page** (2026-08-28). A literal 1200 is a
   * measurement of one day's content: this is `/`, which is today, and the
   * corpus's saints run out before its liturgical records do — on 28 August
   * the page had readings, hymns and a fast but no saints, and 1200 px of
   * scroll simply was not there to be had. What the test is about is the
   * *route* the restore takes, which is the same at any depth that is not the
   * top.
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

test('the name is a stamp: the same two words in every language, in the stamp face', async ({ page }) => {
  /*
   * Author, 2026-08-28: "Make the space between 'DAILY' and 'DOX' half as wide.
   * And make sure this new website title is applied to all languages, it no
   * longer gets translated, it stays constant as a stamp of branding."
   *
   * It superseded 2026-08-25's "change the title on header and loading screen
   * to the picked language" rather than reversing it: what that instruction was
   * fixing was a name hard-coded in index.html and stale by a rename, and the
   * name still comes from one place — `BRAND` in ui/strings.js, which the packs
   * no longer feed.
   *
   * The gap is a space set at half the font size, which is half a space wide,
   * because a glyph's advance scales with the size. That is why this can assert
   * a ratio at all: it holds in whichever face the machine resolved.
   */
  for (const language of ['en', 'ru', 'el']) {
    await ready(page, { language });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    /*
     * **The stamp is outlines now** (author, 2026-08-28), so the face and the
     * half-space gap are baked into the path rather than resolved at render:
     * `scripts/make_wordmark.py` reads base.css's two numbers and draws the
     * glyphs from src/fonts/gfs-nicefore.woff2. What this test still asserts is
     * the part that is about the packs — that every language gets the same
     * mark, and that none of them translates it.
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
    expect(stamp.label, `the ${language} pack translated the name`).toBe('Daily Dox');
    expect(stamp.text, `the ${language} pack printed the name as live text`).toBe('');
    // Eight glyphs, one path each: the mark is the same drawing in every pack,
    // where the face used to be scoped to English because the others printed
    // accented names GFS Nicefore cannot set.
    expect(stamp.paths, `the ${language} pack drew a different mark`).toBe(8);
    expect(stamp.width).toBeGreaterThan(0);
  }
});

test('the brand face is allowed to arrive late rather than never', async ({ page }) => {
  /*
   * Author, 2026-08-28: "Sometimes on mobile, the title does not render in the
   * new font, but in the old font."
   *
   * That is `font-display: optional` keeping its promise: a few frames for the
   * file, and if the network has not answered, the fallback for the *life of
   * the page*. A phone on a slow connection got Literata in the masthead
   * permanently and a warm reload got the stamp — two mastheads for one reader,
   * which is the one thing a brand cannot be. It is `swap` now, alone among
   * this project's faces: the body text keeps `optional`, because that policy
   * is there to protect a page of prose from reflowing, and the masthead is two
   * words in a fixed box.
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
   * Author, 2026-08-28: "Remove bookmark on continue reading row cards. And why
   * was it even on the left side to begin with?"
   *
   * It was there because the row copied the Index's, which had one until
   * 2026-08-27; the Index's rows lost theirs that day and this was the last row
   * still wearing it. The left was the same borrowing half-undone: the row
   * builds image, body, tools, and the Index's rows had been re-ordered to
   * name-first with the picture trailing while this one was not.
   *
   * **The shelf now has no Save control at all** — the Saved shelf's own rows
   * never had one — so this also pins that the *other* way off a reading row
   * still works: the swipe, and the × a pointer gets.
   */
  await ready(page);
  await page.goto(DETAIL, { waitUntil: 'networkidle' });
  await page.goto('/', { waitUntil: 'networkidle' });
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
   * Author, 2026-08-28: "Daily Dox still sometimes opens with literata on
   * loading screen and title before updating to the new font. Is this because
   * the browser has to download? If it is, can you create an .svg yourself
   * based on the title and replace it with that so it always has the intended
   * font".
   *
   * It was. GFS Nicefore is the only face here at `font-display: swap` and the
   * only one not preloaded, so a cold load printed the name in Literata and
   * swapped it when the file landed. **This reverses Addendum G6's rejection of
   * an SVG wordmark** — that was rejected in favour of preloading the *body*
   * subsets, which never addressed the masthead.
   *
   * Asserted against the **raw HTML** rather than the rendered page, because
   * the whole claim is about the first paint: the veil is what a reader looks
   * at while the modules are still parsing, so a mark injected by JavaScript
   * would be exactly as late as the font was.
   */
  const html = await (await page.request.get('/')).text();
  const marks = [...html.matchAll(/<svg[^>]*class="brand-mark"/g)];
  expect(marks.length, 'the veil and the masthead should both carry the mark').toBe(2);
  expect(html, 'the wordmark should not still be live text').not.toContain('>Daily Dox<');

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
  await expect(mark).toHaveAttribute('aria-label', 'Daily Dox');
});

test('the two Latin subsets are preloaded, and only those', async ({ page }) => {
  /*
   * Addendum G6, decided by the author on 2026-08-28: "ignore svg, just preload
   * texts as recommended". An SVG wordmark was the alternative considered and
   * rejected, so GFS Nicefore stays a face and this is the whole of the fix.
   *
   * `font-display: optional` stands and is *why* this matters: optional gives
   * the file about a hundred milliseconds and then keeps the fallback for the
   * life of the page. A preload starts the request with the HTML rather than
   * after the stylesheet is parsed and matched, which puts the face inside that
   * window on most loads without the layout shift `swap` would cost.
   *
   * Read out of the served HTML rather than off a live page: this is a claim
   * about what the document says before anything runs.
   */
  const html = await (await page.request.get('/')).text();
  const links = [...html.matchAll(/<link[^>]*rel="preload"[^>]*>/g)].map((m) => m[0]);
  expect(links.length, html.slice(0, 400)).toBe(2);

  const latin = links.find((tag) => /literata-normal-latin-[^"]*\.woff2/.test(tag) && !/latin-ext/.test(tag));
  const ext = links.find((tag) => /literata-normal-latin-ext-[^"]*\.woff2/.test(tag));
  /*
   * **Two different files.** The first build of this shipped the same subset
   * twice: Vite's hash can itself begin with a hyphen, so a pattern loose
   * enough to match a hash after `literata-normal-latin-` also matches `ext-`.
   * The plugin asks the bundle which source each asset came from now, and this
   * is the assertion that would have caught it.
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

  /*
   * And not the italics, nor the Greek and Cyrillic subsets. The budget is the
   * point: italic appears inside lives and quotations rather than at first
   * paint, and a reader in one script should not be made to fetch three others.
   */
  expect(links.join(' ')).not.toContain('italic');
  expect(links.join(' ')).not.toContain('cyrillic');
  expect(links.join(' ')).not.toContain('greek');
});

/*
 * The reserved header height, pinned against the height the header actually
 * settles at. `--chrome-h-reserve` in base.css exists to stop the bar growing into
 * place at boot, which was the site's whole layout shift (brief §13); reserving
 * the wrong number restores the shift when it is short and leaves a permanent
 * strip of dead air when it is long, and neither says anything on the page.
 *
 * All three breakpoints, because the narrow header is two rows and the wide one
 * is one, and it is the *narrow* value that no desktop-only run would ever
 * check. The third arrived on 2026-09-01 with the doubled chrome — "make header
 * items 2x bigger and span across the whole width of the window" — which is a
 * change to a row height and so is exactly what this table exists to catch.
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
       * The declared value, not a probe element's rect. A probe was the first
       * version and it reported 76 for a 75.5625 px reservation, because a box
       * is snapped to device pixels while the header — sized by its own
       * content — keeps the fraction. That is trap 9's cousin: the property
       * resolves fine here, since it holds a plain length rather than a
       * `clamp()`, and it is the *rendering* that rounds.
       */
      const declared = getComputedStyle(document.documentElement).getPropertyValue('--chrome-h-reserve');
      return [parseFloat(declared), header.getBoundingClientRect().height];
    });

    expect(reserved, `--chrome-h-reserve is ${reserved} at ${width} px, not the ${expected} this pins`).toBeCloseTo(expected, 2);
    /*
     * Exactly, not "at least". A settled header taller than the reservation is
     * the shift coming back; shorter is dead air. The height is face-
     * independent — it comes from the controls' line-heights and the nav is
     * forbidden to wrap — so this holds under COLD_FACE as well, which is the
     * claim that makes a pixel constant safe to write down here at all.
     */
    expect(settled, `the header settles at ${settled} but reserves ${reserved}`).toBeCloseTo(reserved, 1);
    await ctx.close();
  });
}

/* ---- About: the editorial policy (Session 9, 2026-08-29) ---------------- */

test('About states the coverage from the corpus, not from memory', async ({ page }) => {
  /*
   * Brief §8.4 wants the coverage statistics on this page, and the whole point
   * of putting them here is that they are *read* — `loadManifestMeta()` finally
   * has a caller. So the assertion is against the file itself: whatever
   * `manifest.meta.json` says today is what the page has to print, and a number
   * typed into a sentence would fail this the next time a folder is added.
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
   * Not the registry's prose. `src/data/churches.js` names the source each
   * church's *daily calendar* comes from, and that is not always the
   * publication the attestations were read from — 121 of the 127 Romanian
   * attestations cite doxologia.ro while the registry note names Basilica.
   * `by_source` in the build counts what is actually cited, and this is what
   * stops the page drifting back to the prose.
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
   * The two Old Calendar churches and the two New. Read off `default_calendar`
   * in the registry rather than restated in prose, so a church whose reckoning
   * changed changes this section with it — the assertion here is that the page
   * and the registry agree, which is the only way that promise is worth
   * anything.
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
  /*
   * Brief §11: "Export / Import as JSON ... real cross-device portability for
   * zero backend." The claim worth a browser test is the round trip through
   * the real controls: a save made, a file downloaded, the device wiped, the
   * file imported, the save standing again. The store's merge rules have unit
   * tests; this is the promise as a reader meets it.
   */
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
