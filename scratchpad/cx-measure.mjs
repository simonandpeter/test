/*
 * The carousel's loading, measured. Not a test — a bench.
 *
 * Serves `dist/` on 4180, opens the All Saints carousel at one viewport under
 * throttled 4G, and answers three questions the reader actually has:
 *
 *   settled    — ms from `goto` until every icon *on screen* has painted
 *   blankFrac  — over a scroll across ten windows of the row, the share of
 *                samples in which some on-screen icon was still empty
 *   bytes/reqs — what the row spent to get there
 *   visible    — how many icons stand in one screenful (the sparseness)
 *
 * "On screen" is by geometry, not by DOM order — mounted ≠ on screen in this
 * view, and the track holds twelve clone columns either side of the run.
 *
 *   node scratchpad/cx-measure.mjs [--width 360] [--net 4g|none] [--runs 3]
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const WIDTH = Number(arg('width', 360));
const HEIGHT = Number(arg('height', WIDTH < 700 ? 800 : 900));
const NET = arg('net', '4g');
const RUNS = Number(arg('runs', 3));
const PORT = 4180;
const URL = `http://localhost:${PORT}/saints`;

/* Lighthouse's own throttled-4G numbers, which is the shape §13 gates on. */
const NETS = {
  '4g': { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 },
  none: null,
};

/** What is on screen, and how much of it has a picture in it yet. */
const PROBE = () => {
  const track = document.querySelector('[data-carousel-track]');
  if (!track) return { total: 0, done: 0 };
  const box = track.getBoundingClientRect();
  let total = 0;
  let done = 0;
  for (const img of track.querySelectorAll('.cx-media img')) {
    const b = img.getBoundingClientRect();
    if (b.right < box.left || b.left > box.right) continue;
    total += 1;
    if (img.complete && img.naturalWidth > 0) done += 1;
  }
  return { total, done };
};

async function serve() {
  const p = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(),
    shell: true,
    stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) return p;
    } catch {}
    await sleep(250);
  }
  throw new Error('preview never came up');
}

async function once(browser) {
  const ctx = await browser.newContext({
    /*
     * **The worker has to be out of the way or the throttle is a fiction.**
     * `Network.emulateNetworkConditions` is set on the *page's* CDP session,
     * and a service worker fetches from a target of its own — so once
     * `sw.js` activated and took the page, every icon arrived at LAN speed
     * with the throttle still nominally in force. It read as the old
     * arrangement loading 11.9 MB in 11 s and never showing a blank card,
     * which is not a thing a 1.6 Mbps link can do. This is also the honest
     * case to measure: a first visit has no worker in charge yet.
     */
    serviceWorkers: 'block',
    viewport: { width: WIDTH, height: HEIGHT },
    isMobile: WIDTH < 700,
    hasTouch: WIDTH < 700,
    deviceScaleFactor: WIDTH < 700 ? 3 : 1,
  });
  const page = await ctx.newPage();
  const imgs = [];
  page.on('response', async (res) => {
    if (!/\.(jpe?g|png|webp)$/i.test(res.url())) return;
    let size = 0;
    try {
      size = Number((await res.allHeaders())['content-length'] || 0);
    } catch {}
    imgs.push({ url: res.url(), size });
  });

  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  if (NETS[NET]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
  // Bytes actually delivered, as against `content-length` promised: a
  // `response` event fires on headers, so summing those measures what the row
  // asked for, not what the pipe managed. Both are worth knowing and they are
  // very different numbers under a throttle.
  let delivered = 0;
  cdp.on('Network.dataReceived', (e) => {
    delivered += e.encodedDataLength || e.dataLength || 0;
  });

  const t0 = Date.now();
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForSelector('[data-carousel-track] .cx-cell', { timeout: 30000 });
  // The row's own arrival, which is the boot's cost and no picture's: the
  // manifest, the entry bundle and the packing. Nothing below this line can
  // move it, so it is the floor `settledAt` is measured against.
  const cellAt = Date.now() - t0;

  // First screenful.
  let settledAt = null;
  let visible = 0;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const r = await page.evaluate(PROBE);
    visible = Math.max(visible, r.total);
    if (r.total > 0 && r.done === r.total) {
      settledAt = Date.now() - t0;
      break;
    }
    await sleep(50);
  }

  const firstBytes = imgs.reduce((s, i) => s + i.size, 0);
  const firstReqs = imgs.length;

  /**
   * A reader travelling, at a given speed, for a given time: the share of
   * samples in which some icon *on screen* was still empty.
   *
   * Two speeds are worth knowing and they are different questions. The drift
   * is 26 px/s and is what the row does when nobody touches it — a blank
   * there is a real defect. 900 px/s is `loopScroll`'s own wheel cap, the
   * fastest a reader can travel at all; on a 1.6 Mbps link that is more
   * pictures per second than the pipe can carry however they are ordered, so
   * what it measures is how gracefully the row falls behind, not whether it
   * can keep up.
   *
   * An earlier version stepped a whole window at a time, which flattered the
   * arrangement it was meant to judge: teleporting past 360 px of row gives a
   * picture no warning at all, so the only strategy that can win is fetching
   * the whole band at once — the thing being replaced.
   */
  const travel = async (pxPerSec, ms) => {
    let samples = 0;
    let blank = 0;
    let seen = 0;
    let done = 0;
    const step = Math.round(pxPerSec / 20);
    const until = Date.now() + ms;
    while (Date.now() < until) {
      if (step) await page.evaluate((d) => {
        const t = document.querySelector('[data-carousel-track]');
        if (t) t.scrollLeft += d;
      }, step);
      await sleep(50);
      const r = await page.evaluate(PROBE);
      if (r.total === 0) continue;
      samples += 1;
      seen += r.total;
      done += r.done;
      if (r.done < r.total) blank += 1;
    }
    return {
      blank: samples ? Math.round((blank / samples) * 100) : null,
      painted: seen ? Math.round((done / seen) * 100) : null,
    };
  };

  const drift = await travel(0, 6000);
  const fling = await travel(900, 6000);

  const bytes = imgs.reduce((s, i) => s + i.size, 0);
  await ctx.close();
  return {
    cellAt,
    settledAt,
    visible,
    firstReqs,
    firstKB: Math.round(firstBytes / 1024),
    endReqs: imgs.length,
    endKB: Math.round(bytes / 1024),
    deliveredKB: Math.round(delivered / 1024),
    driftBlank: drift.blank,
    driftPainted: drift.painted,
    flingBlank: fling.blank,
    flingPainted: fling.painted,
  };
}

const server = await serve();
try {
  const browser = await chromium.launch();
  const rows = [];
  for (let i = 0; i < RUNS; i++) rows.push(await once(browser));
  await browser.close();
  const med = (k) => {
    const v = rows
      .map((r) => r[k])
      .filter((x) => x != null)
      .sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : null;
  };
  console.log(`\n${WIDTH}x${HEIGHT}  net=${NET}  runs=${RUNS}`);
  for (const r of rows) console.log('  ', JSON.stringify(r));
  console.log(
    `  MEDIAN cell=${med('cellAt')}ms settled=${med('settledAt')}ms visibleIcons=${med('visible')}
` +
      `         firstScreen=${med('firstReqs')}req/${med('firstKB')}kB  ` +
      `whole run ${med('endReqs')}req/${med('endKB')}kB asked, ${med('deliveredKB')}kB delivered
` +
      `         drift: ${med('driftBlank')}% frames with a blank, ${med('driftPainted')}% of icons painted
` +
      `         fling: ${med('flingBlank')}% frames with a blank, ${med('flingPainted')}% of icons painted`,
  );
} finally {
  server.kill();
  process.exit(0);
}
