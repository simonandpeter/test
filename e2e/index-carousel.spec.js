import { test, expect } from './fixtures.js';
import {
  INDEX,
  carouselMode,
  facet,
  ready,
  searchMode,
} from './helpers.js';

/**
 * All Saints, the carousel: the loop, its drift and its wheel, the cards it deals, the mode toggle, and the seed a shuffle writes.
 *
 * Part of the browser suite, which was one file of 9,308 lines until
 * 2026-08-27 and is now one file per surface. **The tests themselves are
 * unchanged** — each carries the instruction that caused it and the date it
 * was written, which is where this suite's provenance has always lived; what
 * moved is only which file it sits in. `helpers.js` holds the shared fixtures.
 *
 * **Split again on 2026-09-05** (cleanup plan item 6, on the author's word:
 * "Items 5 and 6"), by surface *within* the page rather than by the date a
 * test was written, once the one file had reached 4,895 lines. The rule
 * is the first split's: the tests are unchanged, each still carries
 * the instruction and the date that caused it, and only the file moved. The
 * `---- round ----` dividers are the rounds the tests were written in and
 * are repeated in whichever file holds a member of that round, so a test
 * still says which round it belongs to; the tests above the first divider
 * are the ones written before the file had any. The seam between the three
 * files is a judgement, not a measurement: a test that reads two surfaces
 * sits with the one its title names.
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

/* ---- the 2026-08-24 evening round: rows, one bookmark, the narrow header -- */


test('the Index opens on the carousel however the reader left it', async ({ browser }) => {
  /*
   * Author, 2026-08-28: "have it default to Carousel mode on first open, and if
   * the site is refreshed or opened again in a different tab, have it still
   * default to Carousel mode. It only doesnt default while you are still on the
   * site without refreshing."
   *
   * `switchMode` wrote `settings.indexMode`, so the choice outlived the visit.
   * It no longer writes it. The setting is still *read* on open, deliberately:
   * that is how the rest of this suite asks for the other face without pressing
   * anything, and a future "remember my choice" wants the write back rather
   * than a new mechanism.
   *
   * Its own context, with no `searchMode` stamp — this test is about what a
   * reader with nothing stored gets, and the suite's `beforeEach` would answer
   * the question before it was asked.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-carousel]')).toBeVisible();

  await page.locator('[data-mode-toggle]').click();
  await expect(page.locator('.facets')).toBeVisible();

  // Within the visit the choice holds: leaving the page and coming back is not
  // a reload, and the reader has not asked to be sent back to the row.
  await page.locator('nav.site-nav a').first().click();
  await page.goBack();
  await expect(page.locator('.facets')).toBeVisible();

  // A reload is where it resets.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('[data-carousel]')).toBeVisible();
  await expect(page.locator('.facets')).toBeHidden();

  // And nothing was written, which is the mechanism rather than the symptom.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gos-settings') ?? '{}'));
  expect(stored.indexMode, 'the mode should not be persisted').toBeUndefined();
  await ctx.close();
});


test('a search too short to fill the row stops it, left-justified, each saint once', async ({ page }) => {
  /*
   * Author, 2026-08-28: "When you search for a saint in the carousel, only
   * display 1 instance of each saint, not multiple as it currently happens to
   * complete the carousel. If there are not enough saints to complete the auto
   * scroll carousel, have the scroll gently stop and display left justified.
   * The auto scroll resumes when there are enough cards to reach both ends of
   * the window size."
   *
   * `loopSafe` repeated a short run to a floor of ten so the period was long
   * enough not to judder — honest about the data and not about the reading: a
   * search matching two saints showed each of them five times. A run that does
   * not fill the track no longer loops at all.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  // A name narrow enough that only a couple of saints answer to it.
  await page.locator('[data-query]').fill('Placilla');
  const track = page.locator('[data-carousel-track]');
  await expect(track).toHaveClass(/is-static/);

  const row = await track.evaluate((el) => {
    const cards = [...el.querySelectorAll('.cx-card')];
    const slugs = cards.map((a) => a.getAttribute('data-prefetch'));
    return {
      slugs,
      unique: new Set(slugs).size,
      left: Math.round(cards[0].getBoundingClientRect().left - el.getBoundingClientRect().left),
      scroll: el.scrollLeft,
      overflow: el.scrollWidth - el.clientWidth,
    };
  });
  expect(row.slugs.length, 'the premise: the search matched a short row').toBeLessThan(10);
  expect(row.unique, `each saint once, got ${row.slugs.join(', ')}`).toBe(row.slugs.length);
  // Left-justified and standing still: no clone buffer to open inside, so the
  // first card is at the track's own leading edge rather than a period in.
  expect(row.scroll, 'a row that fits should not be scrolled into a buffer').toBe(0);
  expect(row.overflow, 'a row that fits has nothing to scroll').toBeLessThanOrEqual(1);

  /*
   * And the drift comes back when the set is big enough to reach both ends —
   * the other half of the instruction, and the reason this is one test.
   */
  await page.locator('[data-query]').fill('');
  await expect(track).not.toHaveClass(/is-static/);
  await expect
    .poll(async () => track.evaluate((el) => el.scrollLeft), { timeout: 4000 })
    .toBeGreaterThan(0);
});


test('the carousel fades out and back in when the search changes it', async ({ page }) => {
  /*
   * Author, 2026-08-28: "When searching for saints in the carousel, fade out
   * and fade in when loading the new displays." Without it the whole track was
   * replaced between two frames, which reads as a flicker.
   *
   * Watched through the class rather than sampled at a moment: the rebuild is
   * deferred behind the fade, so what is claimed is that the row goes *before*
   * its content changes, which a snapshot of opacity cannot tell from a row
   * that was already dark.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const seen = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const track = document.querySelector('[data-carousel-track]');
        let faded = false;
        const obs = new MutationObserver(() => {
          if (track.classList.contains('is-swapping')) faded = true;
        });
        obs.observe(track, { attributes: true, attributeFilter: ['class'] });
        const input = document.querySelector('[data-query]');
        input.value = 'Placilla';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        setTimeout(() => {
          obs.disconnect();
          resolve({ faded, swapping: track.classList.contains('is-swapping') });
        }, 900);
      }),
  );
  expect(seen.faded, 'the row never faded out before the new one was built').toBe(true);
  expect(seen.swapping, 'the row was left faded out').toBe(false);
  await expect(page.locator('[data-carousel-track]')).toHaveCSS('opacity', '1');
});


test('a press on a carousel card opens the saint', async ({ page }) => {
  /*
   * Author, 2026-08-28: "On desktop you can no longer click on any card in the
   * carousel to take you to the profile page for some reason."
   *
   * `loop-scroll.js` took `setPointerCapture` on `pointerdown` so a haul would
   * keep following the mouse past the track's edge. Capture also makes the
   * track the target the `click` is dispatched at, rather than the `<a>` under
   * the finger — so the router's delegated handler found no anchor and the
   * press did nothing at all. Capture is taken when a press *becomes* a haul
   * now, past the same 4 px that already told a haul from a click.
   *
   * Its own test rather than a line in `the row can be hauled with the mouse`,
   * which asserted only that a haul moves the row and stayed green throughout.
   * A press and a haul are two claims and they broke independently.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  // A card well inside the viewport, so the press cannot land on the edge of
  // one the row has half carried off.
  const find = () =>
    page.evaluate(() => {
      for (const el of document.querySelectorAll('.carousel-track a.cx-card')) {
        const r = el.getBoundingClientRect();
        const inset = Math.min(120, window.innerWidth / 6);
        if (r.left > inset && r.right < window.innerWidth - inset && r.height > 40) {
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }
      }
      return null;
    });
  // Polled: the row is laid out a frame or two after the first card is
  // visible, and a single read can land before any card is wholly inside.
  await expect.poll(find, { timeout: 5000, message: 'no card was fully in view to press' }).not.toBeNull();
  const target = await find();

  await page.mouse.click(target.x, target.y);
  await expect(page.locator('h1.saint-name')).toBeVisible();
});

/* ---- the round of 2026-08-27 evening ------------------------------------- */


test('All Saints opens on the carousel, and the toggle names where it goes', async ({ browser }) => {
  /*
   * Author, 2026-08-27: "The All Saints page should default to horizontal
   * carousel mode, which only has the search bar and the carousel underneath
   * it. The button toggle to the right of 'All Saints' should say 'Advanced
   * search', and when you click it the horizontal carousel mode changes to the
   * advanced search mode which shows all the filters. When the mode has
   * changed, the button toggle then says 'Carousel mode'."
   *
   * A fresh context, and deliberately without the suite's `searchMode`
   * default: this is the one test about the face a reader who has never chosen
   * is shown, so it must not be handed an answer.
   */
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });

  const toggle = page.locator('[data-mode-toggle]');
  await expect(toggle).toHaveText('Advanced search');
  // The search field and the row, and nothing else: no filter chips, no foot,
  // no grid.
  await expect(page.locator('[data-query]')).toBeVisible();
  await expect(page.locator('[data-carousel]')).toBeVisible();
  await expect(page.locator('.facets')).toBeHidden();
  await expect(page.locator('.index-foot')).toBeHidden();
  await expect(page.locator('[data-grid]')).toBeHidden();

  // And it sits to the right of the heading, on its line.
  const geo = await page.evaluate(() => {
    const h = document.querySelector('.index-head h1').getBoundingClientRect();
    const b = document.querySelector('[data-mode-toggle]').getBoundingClientRect();
    return { headRight: Math.round(h.right), toggleLeft: Math.round(b.left) };
  });
  expect(geo.toggleLeft).toBeGreaterThan(geo.headRight);

  // One press, and the page is the other mode, with the word swapped.
  await toggle.click();
  await expect(toggle).toHaveText('Carousel mode');
  await expect(page.locator('.facets')).toBeVisible();
  await expect(page.locator('[data-grid]')).toBeVisible();
  await expect(page.locator('[data-carousel]')).toBeHidden();

  // And back.
  await toggle.click();
  await expect(toggle).toHaveText('Advanced search');
  await expect(page.locator('[data-carousel]')).toBeVisible();
  await expect(page.locator('.facets')).toBeHidden();
  await ctx.close();
});


test('the carousel is a real loop: periodic content, and no dead end at either edge', async ({ page }) => {
  /*
   * The infinite scroll, which is the part of the old build's carousel the
   * author asked to bring forward. It rests on one invariant: the rendered row
   * is *periodic*, so a correction of exactly one period lands on identical
   * content and cannot be seen. Everything else - the clone buffer, measuring
   * real offsets rather than a stride - exists to keep that true.
   *
   * Asserted on the DOM rather than by watching it drift, because a drift
   * assertion is a measurement of one machine's frame rate.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const shape = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    const kids = [...track.children];
    const buffer = 12;
    const count = kids.length - 2 * buffer;
    const slug = (e) => e.getAttribute('data-prefetch');
    let periodic = true;
    for (let i = 0; i < kids.length - count; i++) {
      if (slug(kids[i]) !== slug(kids[i + count])) periodic = false;
    }
    return {
      total: kids.length,
      count,
      periodic,
      saints: new Set(
        [...track.querySelectorAll('.cx-card')].map((a) => a.getAttribute('data-prefetch')),
      ).size,
      bodySpan: kids[buffer + count].offsetLeft - kids[buffer].offsetLeft,
      at: track.scrollLeft,
      max: track.scrollWidth - track.clientWidth,
    };
  });
  /*
   * **The run is the whole matched set** (author, 2026-08-28: "the carousel
   * does not cycle through all saints just a limited number and then it cycles
   * back to the start of that pool? It should be able to show all of them").
   * It was capped at a 48-saint sample, which is the decision this reverses;
   * what makes the corpus affordable is `windowImages`, which holds only the
   * bitmaps near the viewport.
   */
  /* Cells, not saints: a column holds up to four since the row started packing
     by height, so the run is shorter than the corpus while still carrying all
     of it. The count that matters is the saints, asserted below. */
  expect(shape.count, 'the run should be most of the corpus in columns').toBeGreaterThan(150);
  expect(shape.saints, 'every matched saint should be in the run').toBeGreaterThan(700);
  expect(shape.total).toBe(shape.count + 24);
  expect(shape.periodic, 'a shift of one period must land on the same saints').toBe(true);
  expect(shape.bodySpan).toBeGreaterThan(0);
  // Never sitting at the DOM's true edge, which is what a dead end *is*. The
  // exact opening offset is asserted under reduced motion, where the drift is
  // off and the position holds still long enough to be a fact.
  expect(shape.at, 'the row sat at its true leading edge').toBeGreaterThan(0);
  expect(shape.at).toBeLessThan(shape.max);

  /*
   * **Waited for the loop to have measured, not sampled straight after paint**
   * (2026-08-28). `loopScroll` re-measures from its own frame until the
   * geometry is real, and only then knows a period to correct against. With a
   * 48-saint sample that landed on the first frame and this block could follow
   * the paint; carrying the whole corpus it takes a few more, and both edges
   * then read as dead ends because there is no period yet — the row is fine and
   * the test was early. CLAUDE.md has warned since 2026-08-27 that this loop is
   * not measurable until it says so.
   *
   * A started loop is one sitting at its own head rather than at the DOM's
   * edge, which is the assertion just above turned into a wait.
   */
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft), {
      timeout: 5000,
    })
    .toBeGreaterThan(0);

  /*
   * Neither edge is a dead end: pushed hard against each, the track comes back
   * into the middle rather than stopping.
   *
   * **Polled, not settled for 400 ms** (2026-08-28). The correction runs on the
   * track's own scroll event and the drift's next frame, and a fixed wait is a
   * measurement of how quickly this machine gets round to both — which with a
   * 48-saint sample was always inside 400 ms and with the whole corpus is
   * sometimes not. A wait that ends when the thing has happened says the same
   * thing and cannot be outrun; a correction that never comes still fails it.
   */
  const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);

  const highBefore = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    track.scrollLeft = track.scrollWidth - track.clientWidth - 20;
    return track.scrollLeft;
  });
  await expect
    .poll(at, { timeout: 5000, message: 'the far edge wrapped back' })
    .toBeLessThan(highBefore);

  const lowBefore = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    track.scrollLeft = 4;
    return track.scrollLeft;
  });
  await expect
    .poll(at, { timeout: 5000, message: 'the near edge wrapped forward' })
    .toBeGreaterThan(lowBefore);
});


test('the carousel drifts on its own, and keeps drifting under the pointer', async ({ page }) => {
  /*
   * The heir of 'stands still while a reader is on it', inverted at the
   * author's instruction (2026-08-27: "on desktop, when hovering over a saint,
   * the carousel stops, but it should keep going"). A mouse over a full-bleed
   * row is where a desktop cursor simply *is* — it has to rest somewhere, and
   * the row runs the width of the window — so pausing on hover meant the row
   * was stopped for most of the time anyone was looking at it.
   *
   * What still stops it is a reader who has actually taken hold: a touch, or
   * the keyboard tabbing into the track. Those have their own tests.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
  const started = await at();
  await expect.poll(at, { timeout: 4000 }).toBeGreaterThan(started);

  await page.locator('.cx-card').first().hover();
  const held = await at();
  await expect
    .poll(at, { timeout: 4000, message: 'the row stopped under the pointer' })
    .toBeGreaterThan(held);
});


test('under reduced motion the carousel does not drift, and the modes swap without falling', async ({ browser }) => {
  // Removed, not shortened (DESIGN.md 6) - for both of this round's motions.
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const at = () => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft);
  const started = await at();
  await page.waitForTimeout(900);
  expect(await at(), 'the row drifted under reduced motion').toBe(started);

  // With nothing moving, where it opened is a fact: on the first *real* item,
  // twelve copies in from the DOM's leading edge.
  const opening = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    return {
      at: Math.round(track.scrollLeft),
      firstReal: Math.round(track.children[12].offsetLeft),
    };
  });
  expect(opening.at, 'the row opened inside the head clones').toBe(opening.firstReal);

  // The swap is immediate: the face is not left mid-fade a frame after the
  // press. `.is-leaving` is the class the fade would be wearing (index.css),
  // and the facets being visible already is the same claim from the other end
  // — a class that no longer existed anywhere would satisfy the first of these
  // on its own, so both are asserted.
  await page.locator('[data-mode-toggle]').click();
  expect(await page.locator('.is-leaving').count()).toBe(0);
  await expect(page.locator('.facets')).toBeVisible();
  await ctx.close();
});


test('a second press inside the fade lands the first one rather than racing it', async ({ page }) => {
  /*
   * Amendment 9's rule, in the shape the mode swap needs: while two flights are
   * in the air, exactly one is current. `land` reads the mode off `state`, so
   * two overlapping fades would leave the *stale* timer with the last word —
   * pressing twice quickly could settle on the mode you had just left.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('[data-carousel]')).toBeVisible();

  // Two presses well inside the 260 ms fade.
  await page.evaluate(() => {
    const b = document.querySelector('[data-mode-toggle]');
    b.click();
    b.click();
  });

  // Back where it started, and settled: the second press cancelled the first's
  // landing rather than queueing behind it.
  await expect(page.locator('[data-mode-toggle]')).toHaveText('Advanced search');
  await expect(page.locator('[data-carousel]')).toBeVisible();
  await expect(page.locator('.facets')).toBeHidden();
  // Nothing left mid-fade, and no face stranded pointer-inert at opacity 0.
  await expect.poll(() => page.locator('.is-leaving').count()).toBe(0);
  await expect.poll(() =>
    page.evaluate(() => Number(getComputedStyle(document.querySelector('.carousel')).opacity)),
  ).toBeGreaterThan(0.9);
});

/* ---- the round of 2026-08-27, late ---------------------------------------- */


test('a carousel card prints the whole name, the office and the dates, and shows the icon entire', async ({ page }) => {
  /*
   * Author, 2026-08-27: "make sure the full name is printed and is not
   * shortened with '...'. Also dont crop the images, but fix their width to
   * what they currently are. Also include their office and dating under their
   * names in carousel mode."
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const cards = await page.evaluate(() => {
    const out = [];
    for (const card of document.querySelectorAll('.cx-card')) {
      const name = card.querySelector('.cx-name');
      const media = card.querySelector('.cx-media img');
      out.push({
        clamp: getComputedStyle(name).webkitLineClamp,
        nameOverflows: name.scrollHeight > name.clientHeight + 1,
        width: Math.round(card.getBoundingClientRect().width),
        hasSub: !!card.querySelector('.cx-sub'),
        fit: media ? getComputedStyle(media).objectFit : null,
      });
    }
    return out;
  });
  expect(cards.length).toBeGreaterThan(10);
  // Nothing clamped, and no name cut off by its own box.
  for (const c of cards) {
    expect(c.clamp, 'a name is still line-clamped').toBe('none');
    expect(c.nameOverflows, 'a name is cut off by its box').toBe(false);
  }
  // One column width for every card, whatever its picture.
  expect(new Set(cards.map((c) => c.width)).size, 'the cards are not one width').toBe(1);
  // Never `cover`, which is the crop the author asked to remove.
  /*
   * **`cover`, not `contain`, since 2026-09-02** (author: "apply the same
   * aspect ratio limitations to crop any saint card display ... in the same
   * way it applies to the main saint card on Daily page desktop").
   *
   * This line pinned the instruction of 2026-08-27 — "dont crop the images" —
   * which held while a card's box was the picture's own shape and nothing
   * bounded it. The box is a decision now, clamped to 1:1.6 at the tallest,
   * and `contain` inside a box that is not the picture's shape letterboxes the
   * very icons the clamp exists to crop. The uncropped promise survives for
   * every icon inside the limits, which is 119 of the 130: their box is still
   * their own shape, so `cover` takes nothing off them.
   */
  for (const c of cards.filter((c) => c.fit)) expect(c.fit).toBe('cover');
  // And the subtext is there for the saints who have one to show.
  expect(cards.some((c) => c.hasSub), 'no card carries an office or a date').toBe(true);
});


test('the carousel holds only the pictures near it, and the empty boxes keep their size', async ({ page }) => {
  /*
   * Author, 2026-08-27: "It is also quite slow and laggy, maybe only render
   * whats on screen and 2-3 cards just off screen as well."
   *
   * The nodes stay — `ui/loop-scroll.js` measures real offsets and taking
   * cards out would move every offset after them — so what is asserted is the
   * *sources*: far fewer than the 72 cards in the row, and the boxes of the
   * ones without a source exactly as tall as the boxes of the ones with, which
   * is the property that makes releasing a src free of reflow.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  await page.waitForTimeout(700);

  const held = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    const imgs = [...track.querySelectorAll('img')];
    const boxOf = (i) => Math.round(i.getBoundingClientRect().height);
    const withSrc = imgs.filter((i) => i.hasAttribute('src'));
    const without = imgs.filter((i) => !i.hasAttribute('src'));
    return {
      total: imgs.length,
      loaded: withSrc.length,
      // Every picture keeps a box, source or none. A zero here is the reflow
      // this design exists to avoid.
      collapsed: imgs.filter((i) => boxOf(i) === 0).length,
      trackWidth: track.clientWidth,
      // Nothing far from the row should be holding a bitmap.
      farLoaded: withSrc.filter((i) => {
        const r = i.getBoundingClientRect();
        return r.right < -1500 || r.left > track.clientWidth + 1500;
      }).length,
      sample: without.length,
    };
  });

  expect(held.total, 'the row is not the full rendered run').toBeGreaterThan(40);
  expect(held.loaded, 'every picture in the row is still loaded at once').toBeLessThan(held.total / 2);
  expect(held.loaded, 'nothing loaded at all').toBeGreaterThan(0);
  expect(held.sample, 'no picture was released').toBeGreaterThan(0);
  expect(held.collapsed, 'a released picture collapsed its box').toBe(0);
  expect(held.farLoaded, 'a picture far off the row is holding a bitmap').toBe(0);
});


test('a carousel card is half again as wide on a desktop', async ({ page }) => {
  /*
   * Author, 2026-08-27: "Make the carousel images larger on desktop they are
   * tiny at the moment. The width should be at least 1.5x on desktop."
   *
   * Both widths are taken in one test rather than left to the two projects,
   * because the claim is a *ratio* between them and neither project can see
   * the other. It is a CSS pixel measure either way, so no face reads into it
   * (CLAUDE.md's second standing trap).
   */
  await carouselMode(page);
  await ready(page);

  const widthAt = async (w) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(INDEX, { waitUntil: 'networkidle' });
    await expect(page.locator('.cx-card').first()).toBeVisible();
    return page.evaluate(() => document.querySelector('.cx-card').getBoundingClientRect().width);
  };

  const phone = await widthAt(360);
  const desk = await widthAt(1280);
  expect(desk / phone, 'a desktop card is not half again as wide').toBeGreaterThanOrEqual(1.5);
});


test('the wheel carries the carousel back, and no faster than its cap', async ({ page }) => {
  /*
   * Author, 2026-08-27: "allow a bit of horizontal scrolling on desktop with
   * the mouse wheel ... This is so if something goes off screen that caught
   * your interest your can go back. But limit the scroll speed so the images
   * load well."
   *
   * Two claims, and the second is the one that needs a test at all: *back* is
   * easy to see, but a cap is invisible until something is spun hard enough to
   * exceed it. So the wheel is spun far harder than any reader would, and the
   * row is asked how fast it actually went. The cap is what gives
   * `windowImages`' fixed distance a guaranteed decode time; without it the
   * two halves of the answer do not hold together.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const run = await page.evaluate(async () => {
    const track = document.querySelector('[data-carousel-track]');
    const start = track.scrollLeft;
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    /*
     * **Fifteen frames, not two** (2026-08-29). This assertion failed about one
     * local run in three at 1116-1161 px/s against a 900 px/s clamp, on a clean
     * checkout — Amendment 66's mistake in its third costume. The old version
     * read the position across two rAF callbacks, but the loop integrates in
     * *its own* rAF, and the two are not the same clock: a dropped frame put up
     * to a frame and a half of integrated distance inside the test's measured
     * window, which overstates the speed by half a frame's worth. One uneven
     * frame decided the verdict.
     *
     * So the speed is now an average over ~250 ms, which measures the clamp
     * rather than one frame's luck. A notch is dispatched *every* frame to hold
     * the velocity pinned at the cap for the whole window — the loop's own
     * comment says a reader who keeps spinning holds the clamp for as long as
     * they spin, and that is the state in which the cap is the only thing
     * deciding the speed. The boundary frames can still leak: the window opens
     * and closes on the test's clock, not the loop's, so up to one integration
     * frame of distance lands just inside or outside either edge. Over fifteen
     * frames that is a ~7% error bar, which the 1100 ceiling absorbs; over two
     * it was 50%, which nothing could.
     */
    const spin = () =>
      track.dispatchEvent(new WheelEvent('wheel', { deltaY: -240, bubbles: true, cancelable: true }));
    for (let i = 0; i < 20; i++) spin();
    // Let the first frame integrate before the window opens, so the opening
    // read is of a row already at the clamp rather than one still accelerating.
    await frame();
    await frame();
    const t0 = performance.now();
    const p0 = track.scrollLeft;
    for (let i = 0; i < 15; i++) {
      spin();
      await frame();
    }
    const t1 = performance.now();
    const p1 = track.scrollLeft;
    await new Promise((r) => setTimeout(r, 1200));
    return { start, p0, p1, pxPerSec: Math.abs((p1 - p0) / ((t1 - t0) / 1000)), settled: track.scrollLeft };
  });

  expect(run.settled, 'the wheel did not carry the row backwards').toBeLessThan(run.start);
  // The clamp is 900 px/s. The averaging window's edge can leak one frame of
  // integrated distance (~7% over fifteen frames), and the drift's own
  // 26 px/s pushes the other way; 1100 absorbs both with room.
  expect(run.pxPerSec, 'the wheel outran its own speed cap').toBeLessThan(1100);
  expect(run.pxPerSec, 'the wheel barely moved the row').toBeGreaterThan(100);
});


test('the carousel fades in rather than appearing, and comes back where it was left', async ({ page }) => {
  /*
   * Author, 2026-08-27: "The carousel mode doesnt fade back in, it just
   * appears. Also make sure when you switch back to carousel mode, the site
   * saves the location the carousel was in so you go back there."
   *
   * The fade failed for a reason worth pinning: the arriving state is held for
   * two frames, and with a transition on it the opacity only *began*
   * travelling toward 0 before being released, so there was nothing to fade
   * up from. The snap is what makes the second beat visible.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  /*
   * Compared as an offset within a card's width, not as the name at the head
   * of the row. The row is *drifting* the whole time — that is the mode — so
   * between the reading before the switch and the reading after it the answer
   * moves by however long the two mode changes took, and a leading-card test
   * flips the moment that crosses a card boundary. What is being claimed is
   * "it comes back where it was", and a card's width is the resolution at
   * which that claim means anything.
   */
  const cardWidth = await page.evaluate(
    () => document.querySelector('.cx-card').getBoundingClientRect().width,
  );

  /*
   * **Wait for the loop to have started before writing a position into it**
   * (2026-08-28). This was the flake: 7 of 24 under `COLD_FACE=1` at ten
   * workers, measured on an unmodified tree so it could not be blamed on the
   * change it was found beside.
   *
   * `loopScroll` re-measures from its own frame until the geometry is real, and
   * only then applies the clone buffer's offset. Until that happens the track
   * sits at **0**, and a `scrollLeft` written into it is discarded when the loop
   * finally measures — the row then opens wherever the buffer puts it. The
   * failures said so exactly: every one of them had read `before` as a bare
   * 2400, meaning the `+= 2400` had landed on a track still at zero, and the
   * row came back at 2752 or 1965. Every run that had started first read `before`
   * as 4374 or 5165 — the buffer's offset plus the seed — and passed.
   *
   * So the row is waited for rather than the page: a started loop is one whose
   * track is past 0, which is the buffer's own offset and never zero.
   */
  await expect
    .poll(() => page.evaluate(() => document.querySelector('[data-carousel-track]').scrollLeft))
    .toBeGreaterThan(0);

  /*
   * **Both readings are taken in the turn they belong to.** The row drifts every
   * frame — that is the mode — so a position read on one round trip and compared
   * with one read on another is a measurement of how long the round trips took,
   * and the tolerance of one card is then a budget for wall time. The seed and
   * the reading are one evaluate, and the reading back happens on the first
   * frame the carousel is unhidden, before the drift has anywhere to go.
   */
  const before = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    track.scrollLeft += 2400;
    const at = track.scrollLeft;
    // Waited on the *label* below, which only changes once `applyMode` has run:
    // the fall takes about half a second first, and pressing again inside it is
    // the double-press the guard cancels — a race, not a test.
    document.querySelector('[data-mode-toggle]').click();
    return at;
  });
  expect(before).toBeGreaterThan(0);
  await expect(page.locator('[data-mode-label]')).toHaveText('Carousel mode');

  // Back, watching the carousel's own opacity through the change — polled to
  // the state rather than for a fixed 1500 ms, so a loaded machine takes longer
  // instead of reporting an absence.
  const fade = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const out = [];
        let reopenedAt = null;
        const t0 = performance.now();
        document.querySelector('[data-mode-toggle]').click();
        const tick = () => {
          const el = document.querySelector('[data-carousel]');
          if (!el.hidden) {
            if (reopenedAt === null) {
              reopenedAt = document.querySelector('[data-carousel-track]').scrollLeft;
            }
            out.push(Number(getComputedStyle(el).opacity));
          }
          const arrived = out.length > 4 && out.at(-1) > 0.9;
          if (!arrived && performance.now() - t0 < 8000) requestAnimationFrame(tick);
          else resolve({ out, reopenedAt });
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(fade.out.length, 'the carousel never came back').toBeGreaterThan(4);
  expect(fade.out[0], 'it appeared at full strength instead of fading in').toBeLessThan(0.1);
  expect(fade.out.at(-1)).toBeGreaterThan(0.9);
  // And within a card of where it was left, rather than back at the start.
  expect(
    Math.abs(fade.reopenedAt - before),
    `the row reopened at ${fade.reopenedAt}, having been left at ${before}`,
  ).toBeLessThan(cardWidth);
});


test('the mode toggle wears no frame, and its word crosses over', async ({ page }) => {
  // Author, 2026-08-27: "Remove the bubble frame around the carousel button,
  // and make it fade between modes instead of just snapping to its other
  // state."
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });

  const toggle = page.locator('[data-mode-toggle]');
  await expect(toggle).toHaveCSS('border-style', 'none');
  await expect(page.locator('[data-mode-label]')).toHaveText('Advanced search');

  // The word goes to nothing before it comes back as the other one.
  const faded = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const label = document.querySelector('[data-mode-label]');
        let sawFade = false;
        const t0 = performance.now();
        document.querySelector('[data-mode-toggle]').click();
        const tick = () => {
          if (Number(getComputedStyle(label).opacity) < 0.5) sawFade = true;
          // Past the fall (about 560 ms) and the 140 ms cross-over after it.
          if (performance.now() - t0 < 1100) requestAnimationFrame(tick);
          else resolve(sawFade);
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(faded, 'the word snapped instead of crossing over').toBe(true);
  await expect(page.locator('[data-mode-label]')).toHaveText('Carousel mode');
});

/* ---- the evening of 2026-08-27, seven instructions ------------------------ */


test('leaving a saint puts the carousel back where it was', async ({ page }) => {
  /*
   * Author, 2026-08-27: "When exiting a saint card from the carousel, make
   * sure you return to where you came from, just like you do when you leave
   * advanced search and come back to the carousel, you return to the last
   * position you were at."
   *
   * The offset already survived a *mode* switch — `switchMode` reads the
   * track's `scrollLeft` before hiding it, because a hidden element reports 0
   * — but not a navigation, because the snapshot the saint page's × comes back
   * to kept the filters and the vertical scroll and not this. It does now.
   *
   * **Reduced motion, so the row is standing still.** The drift writes
   * `scrollLeft` every frame; under `prefers-reduced-motion` it does not run at
   * all, which turns "roughly where it was" into an exact number and makes the
   * test worth having. The restore itself is not animated, so nothing being
   * measured is switched off by this.
   */
  const ctx = await page.context().browser().newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
  });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    localStorage.setItem('gos-settings', JSON.stringify({ church: 'russian', language: 'en', indexMode: 'carousel' }));
  });
  await p.goto(INDEX, { waitUntil: 'networkidle' });
  const track = p.locator('[data-carousel-track]');
  await expect(track.locator('a.cx-card').first()).toBeVisible();

  await p.evaluate(() => {
    document.querySelector('[data-carousel-track]').scrollLeft = 1400;
  });
  const before = await track.evaluate((el) => el.scrollLeft);
  expect(before).toBeGreaterThan(1000);

  // In through a card, and back out the way the browser's own back does.
  await p.evaluate(() => document.querySelector('.carousel-track a.cx-card').click());
  await expect(p.locator('h1.saint-name')).toBeVisible();
  await p.goBack();
  await expect(p.locator('[data-carousel-track] a.cx-card').first()).toBeVisible();

  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft), { timeout: 5000 })
    .toBeGreaterThan(before - 40);
  const after = await track.evaluate((el) => el.scrollLeft);
  // Where it was, not where it opens: 1400 against a row that starts near 0 is
  // the whole difference this test is about.
  expect(Math.abs(after - before)).toBeLessThan(40);
  await ctx.close();
});


test('a carousel card is sized by the window height as well as its width', async ({ page }) => {
  /*
   * Author, 2026-08-28: "On desktop, the saint images in the carousel stay the
   * same width which is good in full screen BUT not good when window is
   * resized. Make the icon width adjust with the window height to keep the
   * display of the images in a differently sized window on desktop."
   *
   * The row is sized off the picture, whose height is its own, so a fixed width
   * in a short window pushes the captions off the fold. `--cx-w` is a clamp on
   * `vh` now: a full-screen desk is exactly what it was, and a short window
   * gets a smaller card rather than a cropped one.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const cell = page.locator('.cx-cell').first();
  await expect(cell).toBeVisible();
  const tall = await cell.evaluate((el) => Math.round(el.getBoundingClientRect().width));

  await page.setViewportSize({ width: 1280, height: 560 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const short = await cell.evaluate((el) => Math.round(el.getBoundingClientRect().width));

  // Narrower in a short window, and never below the phone's own 150.
  expect(short, `${short} px in a 560 px window against ${tall} in a 900`).toBeLessThan(tall);
  expect(short).toBeGreaterThanOrEqual(150);
  /* 300 since 2026-08-28 ("Make the carousel images slightly bigger on
     desktop"), and it is a clamp on `--cx-space` — the room between the top of
     the track and the bottom of the window — rather than on `vh`, because the
     row's top depends on the header and the controls above it. */
  expect(tall).toBe(300);
});


test('the row comes back on its own after a press, and takes the wheel while it waits', async ({ page }) => {
  /*
   * Author, 2026-08-28: "if you click and then instantly try to scroll, it cant
   * scroll. You have to wait" — and "If you click a second time, the auto
   * scroll stops completely? ... It seems like the auto scroll can get reset by
   * pressing the Advanced search button and then back to the Carousel mode."
   *
   * Both were the same latch. A press focuses the track (it is `tabindex="0"`)
   * and `focused` held the row until focus went elsewhere, which a second press
   * on the same row never does — so it stopped for the rest of the visit, and
   * the only thing that cleared it was the mode toggle, because leaving the
   * carousel destroys the loop and coming back builds a fresh one. A pointer
   * press now holds the drift for a moment and lets go; the keyboard still
   * holds it, because a reader tabbing through cards cannot be chasing them.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const track = page.locator('[data-carousel-track]');
  await expect(page.locator('.cx-card').first()).toBeVisible();
  const at = () => track.evaluate((el) => el.scrollLeft);

  /*
   * The track itself, not a card, which would navigate away — and **the only
   * place left where those are different is the track's own padding**
   * (2026-09-01). This pressed eight pixels below the track's top edge, which
   * was empty ground while the columns were dealt low, high and mid inside the
   * row; the author asked for a filled stack that evening, the columns became
   * flush, and that point became a saint's picture. The press opened her page,
   * the track went with the view, and the wheel had nothing left to move.
   *
   * The foot rather than the head, because there is twice as much of it: the
   * track's padding is 8 px above the cells and 16 px below them, so this has
   * eight pixels of margin either side rather than four. Asserted rather than
   * assumed below, so the day some future layout closes that gap this says so
   * instead of navigating away again.
   */
  const box = await track.boundingBox();
  const press = { x: box.x + 40, y: box.y + box.height - 8 };
  const onTrack = await page.evaluate(
    (at) => document.elementFromPoint(at.x, at.y)?.closest('[data-carousel-track]') !== null,
    press,
  );
  expect(onTrack, 'the press point is no longer bare track — it would navigate').toBe(true);
  await page.mouse.move(press.x, press.y);
  await page.mouse.down();
  await page.mouse.up();

  // The wheel answers straight away rather than after the hold has expired.
  const held = await at();
  await page.mouse.wheel(0, -300);
  await expect.poll(at, { timeout: 3000 }).not.toBe(held);

  // And the drift returns by itself — twice, because pressing again must not
  // be what ends it.
  const resting = await at();
  await expect.poll(at, { timeout: 9000 }).not.toBe(resting);
  await page.mouse.down();
  await page.mouse.up();
  const second = await at();
  await expect.poll(at, { timeout: 9000 }).not.toBe(second);
});


test('the row can be hauled with the mouse, and a haul is not a click', async ({ page }) => {
  // Author, 2026-08-28: "Also add a hold and drag scroll function with the
  // mouse." A touch has had this from the platform all along; a mouse had only
  // the wheel. A drag past 4 px swallows the click in the capture phase, or
  // every haul across the row would open whichever saint it started on.
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const track = page.locator('[data-carousel-track]');
  await expect(page.locator('.cx-card').first()).toBeVisible();
  await expect(track).toHaveCSS('cursor', 'grab');

  /*
   * Pressed at the track's own centre, not on `.cx-card` first — the first card
   * in the DOM is a buffer clone sitting off the leading edge at a negative x,
   * and a press dispatched there lands outside the window. The virtualisation
   * trap in CLAUDE.md in its other form: the first child is not the first
   * thing on screen.
   */
  const box = await track.boundingBox();
  /*
   * The foot of the track, not its centre, and for the reason the test above
   * gives at length: the columns are flush since 2026-09-01, so the middle of
   * the row is a saint's picture. A *drag* would be swallowed by the 4 px rule
   * whatever it started on — which is the half this test is about — but the
   * pointer has to go down somewhere that is not a link, or the browser starts
   * a native image drag instead of giving us the pointermoves.
   */
  const from = { x: box.x + box.width / 2, y: box.y + box.height - 8 };
  const before = await track.evaluate((el) => el.scrollLeft);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(from.x - step * 30, from.y);
  }
  await page.mouse.up();

  const after = await track.evaluate((el) => el.scrollLeft);
  expect(Math.abs(after - before), 'the row did not follow the drag').toBeGreaterThan(60);

  await expect(page.locator('h1.saint-name')).toHaveCount(0);
  await expect(page.locator('.cx-card').first()).toBeVisible();
});


test('a phone pairs the wide icons and stands the row at varied heights', async ({ page }) => {
  /*
   * Author, 2026-08-28: "On mobile, make the carousel a bit more organic and
   * double stack any saint images and texts that are wide aspect ratio, and
   * arrange them a bit more spread out vertically, not all lined up at the
   * bottom, but make sure they render on all mobile screen sizes at appropriate
   * spreads and not out of the page."
   *
   * A track child is a *cell* now — one tall saint, or two wide ones sharing a
   * column. The loop works out its period from the offset between children, so
   * two saints in one child leaves its arithmetic untouched; a two-row grid
   * over the track itself would have packed each period from wherever the last
   * one ended, which is a drift the wrap cannot correct.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const row = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    const cells = [...track.querySelectorAll('.cx-cell')];
    const inside = track.getBoundingClientRect();
    return {
      cells: cells.length,
      stacked: cells.filter((c) => c.classList.contains('is-stack')).length,
      pairs: cells.filter((c) => c.querySelectorAll('.cx-card').length === 2).length,
      tops: new Set(cells.slice(0, 15).map((c) => Math.round(c.getBoundingClientRect().top))).size,
      escapes: cells.filter((c) => {
        const r = c.getBoundingClientRect();
        return r.top < inside.top - 1 || r.bottom > inside.bottom + 1;
      }).length,
      // A vertical gesture belongs to the page, wherever on the track it lands.
      touch: getComputedStyle(track).touchAction,
    };
  });
  /* **Columns of one to four, not pairs** (2026-08-28). The row packed wide
     icons two at a time; it packs any column by height now, so a stack is
     "more than one" rather than "exactly two" and text-only saints — which
     carry no picture and so no media box — go deepest. */
  expect(row.stacked, 'nothing was stacked on a phone').toBeGreaterThan(2);
  expect(row.pairs, 'pairs are a subset of stacks now, not the whole of them').toBeLessThanOrEqual(row.stacked);
  /* **And they stand on one line** (author, 2026-09-01: "just make it a fully
     filled horizontally scrolling stack"). This asserted the opposite until
     then — three dealt resting places, from "not all lined up at the bottom"
     (2026-08-28) — and the assertion is inverted rather than deleted because
     the scatter is exactly what the author is now asking to have closed up. */
  expect(row.tops, 'the columns are still scattered vertically').toBe(1);
  expect(row.escapes, 'a cell hangs out of the row').toBe(0);
  expect(row.touch).toContain('pan-y');

  /*
   * **A desk stacks too now, when the window is tall enough** (author,
   * 2026-08-28: "There is no double stacking on desktop carousel that I can
   * see ... depending on resize bring them closer together / remove double
   * stacks"). The test used to assert the opposite, and it was right about the
   * build rather than about what was wanted: `stacking()` was a width query,
   * so a desk never paired at any height.
   *
   * It is a *height* query now, which is the thing a stack actually needs, so
   * the same desk answers both ways depending on the window — which is what
   * makes this pair of assertions worth having rather than one.
   */
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  await expect(
    page.locator('.cx-cell.is-stack').first(),
    'a tall desktop window should pair its wide icons',
  ).toBeVisible();

  /*
   * And a short window packs *shallower* rather than cramming the same columns
   * in — "depending on resize bring them closer together / remove double
   * stacks". Not to zero: a saint with no picture is a caption 64 px tall, and
   * two of those fit a window that no longer has room for two icons. What has
   * to fall is the depth.
   */
  const deepest = () =>
    page.evaluate(() =>
      Math.max(
        0,
        ...[...document.querySelectorAll('.cx-cell')].map((c) => c.querySelectorAll('.cx-card').length),
      ),
    );
  await expect.poll(deepest, { timeout: 5000 }).toBeGreaterThan(2);
  const tallWindow = await deepest();

  await page.setViewportSize({ width: 1280, height: 420 });
  await expect
    .poll(deepest, { timeout: 5000, message: 'a short window packed as deep as a tall one' })
    .toBeLessThan(tallWindow);
});

/* ---- Session 6's three survivors (2026-08-29) --------------------------- */


/** The row's order, read as the first several slugs in DOM order. */
const dealtOrder = (page, n = 10) =>
  page.evaluate(
    (count) =>
      // `data-prefetch` is the card's slug - the identity attribute the
      // carousel actually carries.
      [...document.querySelectorAll('[data-carousel-track] .cx-card')]
        .slice(0, count)
        .map((el) => el.dataset.prefetch),
    n,
  );


test('a shared seed deals the same hand, and the address bar carries it', async ({ page }) => {
  /*
   * The third survivor of cancelled Session 6. The random order is a pure
   * function of the seed (`shuffleKey`), so the seed *is* the shuffle, and a
   * URL carrying it is a dealt row one reader can hand to another. Two visits
   * with the same seed must agree exactly; the assertion is the first ten
   * slugs, which 742! orderings do not survive by luck.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto('/saints?seed=e2e-shared-hand', { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  const first = await dealtOrder(page);

  await page.goto('/saints?seed=e2e-shared-hand', { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  expect(await dealtOrder(page), 'the same seed dealt a different hand').toEqual(first);

  // And the bar keeps the seed, so what is copied is what was seen.
  expect(new URL(page.url()).search).toBe('?seed=e2e-shared-hand');

  // A different seed is a different hand - over ten slugs, indistinguishable
  // from certainty, and the guard that the parameter is actually being read.
  await page.goto('/saints?seed=e2e-other-hand', { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  expect(await dealtOrder(page)).not.toEqual(first);
});


test('Shuffle deals a new hand and writes the new seed', async ({ page }) => {
  await carouselMode(page);
  await ready(page);
  await page.goto('/saints?seed=e2e-before-shuffle', { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  const before = await dealtOrder(page);

  const shuffle = page.locator('[data-shuffle]');
  await expect(shuffle).toBeVisible();
  /*
   * Dispatched rather than clicked: the row under it is drifting sideways, and
   * `locator.click()` re-resolves positions in a way a moving layout can turn
   * into a miss (CLAUDE.md trap 3's cousin). The press itself is what is under
   * test, not the hit-testing.
   */
  await shuffle.dispatchEvent('click');

  await expect
    .poll(() => dealtOrder(page), { message: 'the shuffle did not re-deal the row' })
    .not.toEqual(before);
  // The bar follows: a new seed, and not the one the reader arrived with.
  expect(new URL(page.url()).search).toMatch(/^\?seed=/);
  expect(new URL(page.url()).search).not.toBe('?seed=e2e-before-shuffle');
});


test('the shuffle stands on both faces, and deals the filtered set again without changing it', async ({ page }) => {
  /*
   * Author, 2026-09-01: "add also in Advanced search mode, keep the shuffle
   * button from Carousel mode and make it so it shuffles the current filtered
   * search, changing only the order type but keeping the other filters
   * unchanged."
   *
   * **This reverses the test it replaces**, which pinned the button as hidden
   * on the search face on the reasoning that the sort control there already
   * owns chance and a second control writing the same state would be two
   * controls disagreeing. The second worry is answered rather than ignored —
   * the press writes Random into the sort control, so they agree — and the
   * first missed that Random is usually already selected, where re-selecting it
   * deals no new hand at all.
   *
   * What has to hold is the "unchanged" half: same filters, same matched set,
   * a different order. So the query is narrowed first and the *set* is compared
   * before and after, not just the order.
   */
  await searchMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const shuffle = page.locator('[data-shuffle]');
  await expect(shuffle).toBeVisible();

  // Narrowed, so that "keeping the other filters unchanged" has something to be
  // true of. Two facets, because one could survive by accident.
  await page.locator('[data-query]').fill('Nicomedia');
  await facet(page, 'sexes', 'male');
  await expect.poll(() => page.locator('.index-card').count()).toBeGreaterThan(4);

  /*
   * **How many matched is read off the page's own summary, not off the DOM.**
   * The grid is virtualised, so `.index-card` is the window of cards near the
   * viewport and its size moves with the cards' heights — a reshuffle changes
   * which saints are at the top and therefore how many of them are mounted.
   * Counting nodes would have this test reporting that the shuffle changed the
   * matched set when all it changed was the order, which is precisely the claim
   * under examination. `[data-set-aside]` is the page saying "29 of 862".
   */
  const state = async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    return page.evaluate(() => ({
      // In screen order, not DOM order: the grid is virtualised and absolutely
      // positioned, so DOM order says nothing (CLAUDE.md's first trap).
      order: [...document.querySelectorAll('.index-card')]
        .map((c) => ({ y: c.getBoundingClientRect().top, x: c.getBoundingClientRect().left, slug: c.querySelector('[data-prefetch]')?.dataset.prefetch }))
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((c) => c.slug)
        .slice(0, 8),
      query: document.querySelector('[data-query]').value,
      male: document.querySelector('input[name="sexes"][value="male"]').checked,
      summary: document.querySelector('[data-set-aside]')?.textContent?.trim() ?? '',
    }));
  };

  const before = await state();
  await shuffle.click();
  await expect.poll(async () => (await state()).order.join(','), { timeout: 5000 }).not.toBe(before.order.join(','));
  const after = await state();

  // Only the order moved.
  expect(after.query, 'the shuffle cleared the search').toBe(before.query);
  expect(after.male, 'the shuffle cleared a facet').toBe(before.male);
  expect(after.summary, 'the shuffle changed how many matched').toBe(before.summary);

  // And the sort control says so, rather than being changed behind its back.
  await expect(page.locator('input[name="sort"][value="random"]')).toBeChecked();

  // Still on the carousel face too, which is where it came from.
  await page.locator('[data-mode-toggle]').click();
  await expect(page.locator('[data-shuffle]')).toBeVisible();
});


test('arrow keys step the focused row', async ({ page }) => {
  /*
   * The first survivor. The track is tabindex="0" and keyboard focus holds the
   * drift still (loop-scroll's focus rule), so the keys act on a stationary
   * row. The assertion is the scroll position, before and after, in both
   * directions - and the premise that focus really did stop the drift is
   * asserted first, because a drifting row would move on its own and pass the
   * "it moved" half without the keys doing anything.
   */
  await carouselMode(page);
  await ready(page);
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  const track = page.locator('[data-carousel-track]');
  await expect(page.locator('.cx-card').first()).toBeVisible();

  await track.focus();
  /*
   * Focus holds the drift, but the page may still owe the row one rebuild — a
   * late repaint whose packing changed as fonts and pictures settled, which
   * repositions the track once. So the premise is polled to *stillness* rather
   * than read twice at a fixed delay: still means two reads a beat apart agree,
   * which outlives any rebuild rather than racing it. (The rebuild used to
   * drop the focus hold entirely; loop-scroll adopts an existing focus at
   * construction now, and this test is what found that.)
   */
  let still = await track.evaluate((el) => el.scrollLeft);
  await expect
    .poll(
      async () => {
        const a = await track.evaluate((el) => el.scrollLeft);
        await page.waitForTimeout(300);
        const b = await track.evaluate((el) => el.scrollLeft);
        still = b;
        return Math.abs(b - a);
      },
      { message: 'focus never held the row still', timeout: 10000 },
    )
    .toBeLessThan(1);

  /*
   * **Baseline and press in one evaluate**, because the page still owes the row
   * a late rebuild on a cold load, and a rebuild repositions the track: a
   * baseline read in one round-trip and a key pressed in the next left a
   * window for the rebuild to move the goalposts, which read as "ArrowRight
   * did not step the row" about one run in three on mobile-360. Dispatching
   * the key is the same listener the real key reaches — the handler is on the
   * track and calls preventDefault, so there is no default action being
   * skipped — and it is the suite's own idiom for a press whose target moves
   * (trap 3). The step is an instant write, so the read that follows it is the
   * answer — no animation to outwait, which is also why the step survives the
   * loop's wrap teleports (the write and the wrap land in the same breath).
   */
  const step = (key) =>
    track.evaluate((el, k) => {
      const before = el.scrollLeft;
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
      return el.scrollLeft - before;
    }, key);

  expect(await step('ArrowRight'), 'ArrowRight did not step the row').toBeGreaterThan(50);
  expect(await step('ArrowLeft'), 'ArrowLeft did not step back').toBeLessThan(-50);
});


test('the row is a filled stack: every column reaches the foot, and no saint twice', async ({ page }) => {
  /*
   * Author, 2026-09-01: "You've pretty much arranged them in a horizontal grid
   * of columns with randomised occupation. Just fill in the gaps in the same mix
   * of randomised imageless and imaged saint cards and just make it a fully
   * filled horizontally scrolling stack."
   *
   * Three things had to change together and all three are measured here,
   * because each of them alone leaves a hole the other two cannot close:
   *
   *   - the packer reaches forward for a saint who fits, instead of closing a
   *     column the moment the next one is too tall (`LOOKAHEAD`);
   *   - the columns stand on one line instead of being dealt low, high or mid;
   *   - a column is at least as deep as the room it was packed against, so the
   *     row reaches the foot of the window.
   *
   * The instrument for the first is the *gap*, not the slack. Slack is zero
   * whatever the packer does, because `align-content: space-between` hands
   * whatever is left to the gaps — so the way a short column shows itself is
   * the size of those gaps, and taking the reach out inflates them at once.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const row = await page.evaluate(() => {
    const track = document.querySelector('[data-carousel-track]');
    const cells = [...track.querySelectorAll('.cx-cell')];
    // Past the leading clone buffer, so the sample is the run itself.
    const sample = cells.slice(14, 90);
    const slack = [];
    const loneSlack = [];
    const gaps = [];
    const depths = [];
    for (const cell of sample) {
      const cards = [...cell.querySelectorAll('.cx-card')];
      depths.push(cards.length);
      const short = cell.getBoundingClientRect().bottom - cards[cards.length - 1].getBoundingClientRect().bottom;
      (cards.length > 1 ? slack : loneSlack).push(short);
      for (let i = 1; i < cards.length; i += 1) {
        gaps.push(cards[i].getBoundingClientRect().top - cards[i - 1].getBoundingClientRect().bottom);
      }
    }
    const mid = (xs) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
    /*
     * One period of the loop: `loopSlice` puts twelve clone cells either side,
     * so what is between them is the run, and every saint in the run should be
     * a saint the reader has not already met in it.
     */
    const period = cells.slice(12, cells.length - 12);
    const slugs = period.flatMap((c) => [...c.querySelectorAll('[data-prefetch]')].map((a) => a.dataset.prefetch));
    return {
      worstSlack: Math.max(...slack),
      worstLoneSlack: loneSlack.length ? Math.max(...loneSlack) : 0,
      medianGap: mid(gaps),
      worstGap: Math.max(...gaps),
      medianDepth: mid(depths),
      tops: new Set(sample.map((c) => Math.round(c.getBoundingClientRect().top))).size,
      trackBottom: track.getBoundingClientRect().bottom,
      windowBottom: window.innerHeight,
      slugs: slugs.length,
      unique: new Set(slugs).size,
    };
  });

  // Every column that holds more than one saint ends on the foot of the row.
  expect(row.worstSlack, 'a stacked column stops short of the foot of the row').toBeLessThan(2);
  /*
   * A column holding *one* saint has no gap to hand its remainder to, so it can
   * end short — but never by more than the card that would have gone under it.
   * That is the caption the packer budgets (64) and the gap above it (12), plus
   * the difference between that budget and a caption's real height: the budget
   * is deliberately generous, because a name that wraps to three lines really is
   * 64 tall and under-budgeting puts the last card past the fold. A one-line
   * caption renders at 46, so a lone column can be 96 short and every pixel of
   * it accounted for. Beyond that is a saint the packer could have fitted.
   */
  expect(row.worstLoneSlack, 'a column had room for another saint and left it empty').toBeLessThan(97);
  // And they all start on it, which is the scatter having gone.
  expect(row.tops, 'the columns are still dealt different heights').toBe(1);
  /*
   * The row fills the room it was measured against, which is the window less
   * the page's own bottom padding — 64 px that used to be counted as the row's
   * and put a scrollbar on the page (2026-09-01 evening; the carousel's own fit
   * test covers that half). Plus the 40 px the packer rounds its room down to,
   * which is not slop that could be tidied away: it is what keeps the run — and
   * so the reader's remembered place in it — from changing between two paints
   * taken a frame apart (see `space` in views/index/modes.js).
   */
  expect(row.windowBottom - row.trackBottom, 'the row does not reach the foot of its room').toBeLessThan(110);
  expect(row.trackBottom - row.windowBottom, 'the row runs past the foot of the window').toBeLessThan(3);
  /*
   * Densely, not by spreading three cards over a window's height. Both of these
   * fail on the packer as it stood before the reach was added: it closed
   * columns two and three deep, and `space-between` then opened 200 px between
   * their cards.
   */
  expect(row.medianDepth, 'the columns are packed too shallow to be filled').toBeGreaterThanOrEqual(3);
  expect(row.medianGap, 'the cards are spread rather than stacked').toBeLessThan(90);
  // Each saint met once in a turn of the row, which the reach must not break:
  // it takes a saint from further down the pool, it does not copy one.
  expect(row.unique, 'a saint appears twice in one turn of the row').toBe(row.slugs);
});


test('the carousel fits the window at every size, so the page never scrolls behind it', async ({ page }) => {
  /*
   * Author, 2026-09-01: "The carousel mode in All Saints should not have a
   * scroll bar at all on the highest window size possible on any screen. The
   * images should instead scale/stack appropriately."
   *
   * The row already sized itself to the room between its own top and the foot
   * of the window — but "the room" was the track's own padding and nothing
   * else, so the page's bottom padding was 64 px the row believed it had. It
   * ended 33 px above the fold, the padding hung below it, and the page scrolled
   * by the difference. At every window size, on a page whose whole content is
   * one row that fits.
   *
   * Seven windows, because the defect was invisible at any one of them and the
   * author found it on a monitor this suite does not run at. The short one is
   * here for the other half of the fix: the row's room is quantised to 40 px so
   * the packing is stable across paints, and rounding to the *nearest* 40 could
   * round up — eleven pixels of room that was not there, which at 1440x620 was
   * enough to put the bar back on its own.
   */
  await carouselMode(page);
  await ready(page);
  /*
   * **Loaded at each size, not resized into it** (2026-09-01 evening, after CI).
   *
   * The first cut opened the page once and resized, which was faster and read
   * as the truer gesture. It is not the gesture the instruction is about — "the
   * highest window size possible on any screen" is a window you *open* — and it
   * asserted something extra that turns out not to hold: dragged from 1280 down
   * to 360, the page keeps about twelve pixels of scroll that a fresh 360 does
   * not, with the row itself ending fifty pixels clear of the fold. So whatever
   * that is, it is above the row and is not the carousel. Written down here
   * rather than chased, because nothing was asked about it and the row is not
   * the thing at fault.
   *
   * `domcontentloaded` and then waiting on the row itself, rather than
   * `networkidle` seven times over: that is twenty seconds on an idle machine
   * and past this test's own timeout on a loaded one, which is how it first
   * went red.
   */
  /*
   * **Desktop windows only, which is the instruction.** "The highest window
   * size possible on any screen" is what was asked about and where the fault
   * was; a phone is in the list below by omission rather than by oversight.
   * Measured there, the page keeps between one and thirteen pixels of scroll
   * under load while the row itself ends fifty to sixty clear of the fold — so
   * whatever those pixels are, they are above the row and are not this. A
   * phone's Index also has a heading, a toggle and a search field over the row
   * and no claim was made that they must fit; asserting it here would be this
   * test failing for someone else's reasons.
   */
  for (const size of [
    { width: 1024, height: 560 },
    { width: 1280, height: 800 },
    { width: 1440, height: 620 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
    { width: 3440, height: 1440 },
  ]) {
    await page.setViewportSize(size);
    await page.goto(INDEX, { waitUntil: 'domcontentloaded' });
    /*
     * Fifteen seconds, not the default five: `domcontentloaded` returns before
     * the manifest has been fetched and the row built, and on a machine running
     * eight of these at once that gap is longer than a wait sized for an idle
     * one. The load is deliberately the cheap kind — seven `networkidle` loads
     * is past this test's own timeout — so the waiting moves here.
     */
    await expect(page.locator('.cx-card').first()).toBeVisible({ timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    const where = `${size.width}x${size.height}`;

    const measure = () =>
      page.evaluate(() => {
        const track = document.querySelector('[data-carousel-track]');
        return {
          page: document.documentElement.scrollHeight - document.documentElement.clientHeight,
          under: Math.round(window.innerHeight - track.getBoundingClientRect().bottom),
          cards: document.querySelectorAll('.cx-card').length,
        };
      });

    /*
     * All three polled together, because they settle together and no one of
     * them can say the row is packed: the page stops scrolling as soon as the
     * row is *shorter* than the window, which is true long before the row has
     * been packed to fill it. The gap under the row catches that, and the card
     * count catches an empty one. What the poll prints when it runs out is the
     * three numbers that came nearest.
     *
     * It fits by *filling*: no page scroll, and the row ending within the
     * page's own bottom padding of the fold rather than half a window up.
     */
    await expect
      .poll(
        async () => {
          const m = await measure();
          return m.page <= 0 && m.under < 110 && m.cards > 20 ? 'fits' : JSON.stringify(m);
        },
        { timeout: 15000, message: `the row does not fit ${where}` },
      )
      .toBe('fits');
  }
});

/* ---- the round of 2026-09-02, late -------------------------------------- */


test('a phone gives the row more of the screen than the chrome above it', async ({ page }) => {
  /*
   * Author, 2026-09-02: "move the 'All Saints' text and search bar and filters
   * further up the page on All Saints page on mobile, increasing the screen
   * space available for the carousel and search results."
   *
   * Measured as *where the saints start*, which is the thing the instruction is
   * about, rather than as a set of margins: a margin is how it was done and
   * would go stale the first time it was done differently.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.cx-card').first()).toBeVisible();

  const top = await page.evaluate(() => {
    const row = document.querySelector('[data-carousel-track]').getBoundingClientRect();
    const head = document.querySelector('.index-head').getBoundingClientRect();
    return { row: Math.round(row.top), head: Math.round(head.top), win: window.innerHeight };
  });
  /*
   * Under a quarter of the screen spent before the first saint. 195 px of 780
   * is the budget; it was over that before this round and the row began below
   * it. A ratio rather than a pixel count, so a taller phone is held to the
   * same bargain rather than to a number measured on this one.
   */
  expect(top.row, 'the chrome above the row takes more than a quarter of the screen').toBeLessThan(top.win / 4);
  expect(top.head, 'the heading is not near the top of the page').toBeLessThan(90);
});


test('the row comes back where it was after a trip to another page', async ({ page }) => {
  /*
   * Author, 2026-09-02: "when you click away from the All Saints page while on
   * Carousel to any other page, lets say About page, then back to All Saints,
   * the Carousel starts at the beginning location again. Make sure it
   * remembers the location as it does when switching back from Advanced
   * search, so that if you spot a saint as you switch pages you can switch
   * back and see it where it was."
   *
   * The nav is the road, not the saint page's x: those two already restored
   * the whole snapshot, and this is the plain return that did not.
   */
  await carouselMode(page);
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(INDEX, { waitUntil: 'networkidle' });
  await expect(page.locator('.cx-card').first()).toBeVisible();
  const track = page.locator('[data-carousel-track]');
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

  await track.evaluate((el) => {
    el.scrollLeft += 2600;
  });
  const before = await track.evaluate((el) => el.scrollLeft);

  await page.locator('nav.site-nav a[href$="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await page.locator('nav.site-nav a[href$="/saints"]').click();
  await expect(page).toHaveURL(/\/saints$/);
  await expect(page.locator('.cx-card').first()).toBeVisible();

  /*
   * Within a card of where it was, not to the pixel: the loop corrects its own
   * period on the way in, so the honest claim is that the reader is looking at
   * the saint they left rather than at the head of the row. A card is 150-300
   * px wide; the failure this replaces was thousands of pixels away.
   */
  await expect
    .poll(async () => Math.abs((await track.evaluate((el) => el.scrollLeft)) - before), { timeout: 6000 })
    .toBeLessThan(140);
});
