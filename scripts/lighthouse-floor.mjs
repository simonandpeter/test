/**
 * The two criteria of the brief's §13 that no test could reach: Lighthouse
 * accessibility >= 95, and first contentful paint under 1.5 s on a throttled 4G
 * profile. Both need Lighthouse's own instrumentation — axe through Playwright
 * checks the DOM but scores nothing, and a Playwright timing on an unthrottled
 * localhost measures this desk's loopback rather than a reader's phone.
 *
 *     node scripts/lighthouse-floor.mjs            # build, serve, measure, gate
 *     node scripts/lighthouse-floor.mjs --url=...  # measure something already served
 *
 * It prints every number it measured, passing or failing, because a gate that
 * only speaks when it is angry teaches nobody where the margin went.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';

const ORIGIN = 'http://localhost:4173';

/*
 * The same surfaces the axe gate walks, minus the ones that differ from another
 * only in their data. Lighthouse costs about 20 s a run against Playwright's
 * ~1 s, so this list is the distinct *shapes* — a day with a hero saint, a day
 * without, a saint page, the Index in each of its two faces — and not every
 * route in the app.
 */
const ROUTES = [
  ['calendar, populated', '/calendar/2026-01-30'],
  ['calendar, empty day', '/calendar/2026-08-20'],
  ['saint detail', '/saints/anthony-the-great'],
  ['all saints', '/saints'],
];

const FLOOR = {
  // Brief §13: "Lighthouse accessibility >= 95".
  accessibility: 95,
  // Brief §13: "First contentful paint under 1.5 s on a throttled 4G profile."
  fcpMs: 1500,
};

/*
 * **The entry stylesheet's ceiling, which is the FCP floor said early.**
 *
 * `main.js` concatenates its imports into one render-blocking sheet that every
 * route waits for, and first contentful paint does not slope with its size —
 * it *steps*, by a whole 150 ms round trip, at a threshold that on 2026-09-10
 * sat between **73,629 bytes (green) and 73,688 (red)**. Fifty-nine bytes.
 *
 * That was measured rather than deduced, and the method is the point: the tree
 * that had just gone green was rebuilt with 57 bytes of CSS added that matched
 * no element on any page, and Daily's FCP moved 1610 ms to 1757. The three
 * declarations that actually differed between the red and the green build were
 * all inside `@media (min-width: 1024px)`, and this script measures at 360 —
 * so none of them could reach the paint it timed, which is how the size rather
 * than the CSS was identified as the cause.
 *
 * So the sheet gets a line of its own, ~600 bytes below the cliff, and it
 * fails *before* the FCP gate does. A run that goes red on FCP alone says
 * "somewhere, something"; this one names the file and the number.
 *
 * **The ceiling is a measurement and will move when the transfer around it
 * does.** The step is a fact about the whole first-paint download, not about
 * this file alone, which is why docs/daily-desktop-visuals.md §10.18's
 * "between 73.9 and 75.1 kB" — true when it was written — is not where the
 * step is now. Re-measure with the 57-byte method rather than nudging this
 * number to fit a run.
 *
 * **The measured way down, when it is needed**: taking `index.css` and
 * `saint.css` off the entry the way `map.css` and `theme-fade.css` went is
 * 72.28 → 54.31 kB (§10.20). Unlike those two it needs the router to await the
 * view's sheet, because those routes paint text on the first frame.
 */
const ENTRY_CSS_CEILING = 73_000;

/*
 * Lighthouse's stock mobile profile *is* the brief's throttled 4G: 150 ms RTT,
 * 1.6 Mbit/s down, 4x CPU slowdown, applied by simulation rather than by
 * shaping the socket. Naming it here rather than inheriting it silently means a
 * future Lighthouse changing its defaults shows up as a diff instead of as a
 * mysteriously easier gate.
 */
const THROTTLING_4G = {
  rttMs: 150,
  throughputKbps: 1.6 * 1024,
  requestLatencyMs: 150 * 3.75,
  downloadThroughputKbps: 1.6 * 1024 * 0.9,
  uploadThroughputKbps: 750 * 0.9,
  cpuSlowdownMultiplier: 4,
};

const settings = {
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 360, height: 780, deviceScaleFactor: 2.625, disabled: false },
  throttlingMethod: 'simulate',
  throttling: THROTTLING_4G,
  onlyCategories: ['accessibility', 'performance'],
};

/**
 * The render-blocking stylesheet's size, printed whether or not it passes —
 * for the same reason every FCP number here is printed: a gate that only
 * speaks when it is angry teaches nobody where the margin went.
 */
let entryCss = null;
async function reportEntryStylesheet() {
  const dir = path.join(process.cwd(), 'dist', 'assets');
  const names = (await readdir(dir)).filter((f) => /^index-.*[.]css$/.test(f));
  if (names.length !== 1) {
    console.log(`entry stylesheet: ${names.length} candidates in dist/assets, not measuring`);
    return;
  }
  const bytes = (await stat(path.join(dir, names[0]))).size;
  entryCss = { name: names[0], bytes, ok: bytes <= ENTRY_CSS_CEILING };
  console.log(
    `entry stylesheet: ${names[0]}  ${bytes} bytes  (ceiling ${ENTRY_CSS_CEILING})` +
      (entryCss.ok ? `  — ${ENTRY_CSS_CEILING - bytes} to spare` : '  **OVER**'),
  );
}

async function waitForServer(url, ms = 120_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`no server at ${url} after ${ms} ms`);
}

/*
 * `npm run preview` is a shell wrapper around vite, and killing the wrapper on
 * Windows leaves vite holding :4173 — the case HANDOFF.md means by "kill by PID
 * if the wrapper survives". `taskkill /T` takes the tree.
 */
function stopServer(proc) {
  if (process.platform !== 'win32') return void proc.kill();
  return new Promise((res) => spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }).on('exit', res));
}

/*
 * Median of N, not one shot. The first version took a single sample and two
 * consecutive runs put All Saints at 1433 ms and 1727 ms — a spread wider than
 * the distance to the 1500 ms line, so *which* routes failed changed run to
 * run. A gate that decides on one draw from that distribution is a flake
 * generator, and this project has spent whole sittings on exactly that mistake
 * (a millisecond budget standing in for a state).
 *
 * The median rather than the mean: Lighthouse's own guidance, because the noise
 * is one-sided — a run can be arbitrarily slow and cannot be arbitrarily fast.
 */
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const RUNS = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 3);

async function measure(port, path) {
  const samples = [];
  for (let i = 0; i < RUNS; i++) samples.push(await measureOnce(port, path));
  const pick = (key) => median(samples.map((s) => s[key]));
  return {
    ...samples[0],
    accessibility: pick('accessibility'),
    fcpMs: pick('fcpMs'),
    lcpMs: pick('lcpMs'),
    tbtMs: pick('tbtMs'),
    cls: pick('cls'),
    // The whole spread, so a number sitting near the line says so out loud
    // rather than looking like a fact.
    fcpSamples: samples.map((s) => s.fcpMs),
  };
}

async function measureOnce(port, path) {
  const { lhr } = await lighthouse(ORIGIN + path, { port, output: 'json', logLevel: 'error' }, { extends: 'lighthouse:default', settings });
  const failed = Object.values(lhr.audits).filter(
    (a) => a.score !== null && a.score < 1 && lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id),
  );
  return {
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    fcpMs: Math.round(lhr.audits['first-contentful-paint'].numericValue),
    lcpMs: Math.round(lhr.audits['largest-contentful-paint'].numericValue),
    tbtMs: Math.round(lhr.audits['total-blocking-time'].numericValue),
    cls: Number(lhr.audits['cumulative-layout-shift'].numericValue.toFixed(4)),
    /*
     * The offending nodes, not just the audit id. Lighthouse's accessibility
     * score is a weighted average, so an audit can fail while the total stays
     * over 95 — which is exactly what happened the first time this ran, and an
     * id alone gave nobody anywhere to look.
     */
    failedAudits: failed.map((a) => ({
      id: a.id,
      nodes: (a.details?.items ?? []).map((i) => i.node?.snippet ?? i.node?.selector).filter(Boolean),
    })),
    lhr,
  };
}

/*
 * Neither this desk nor the CI runner has a system Chrome, and Lighthouse needs
 * a real one. Playwright's chromium is already a dependency and already
 * installed in both places, so borrow it rather than adding a second browser
 * download to the gate.
 */
if (!process.env.CHROME_PATH) {
  // `@playwright/test`, not `playwright-core`: core is present only as a
  // transitive dependency, and reaching past the declared one works until the
  // day it does not.
  const { chromium } = await import('@playwright/test');
  process.env.CHROME_PATH = chromium.executablePath();
}

const urlArg = process.argv.find((a) => a.startsWith('--url='));
const rows = [];
let bad = 0;
let server;
let chrome;

try {
  if (!urlArg) {
    const build = spawn('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });
    await new Promise((res, rej) => {
      build.on('exit', (code) => (code === 0 ? res() : rej(new Error(`build failed (${code})`))));
    });
    server = spawn('npm', ['run', 'preview'], { shell: true, stdio: 'ignore' });
    await waitForServer(ORIGIN + '/');
  }

  await reportEntryStylesheet();

  chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

  for (const [label, path] of ROUTES) {
    const r = await measure(chrome.port, path);
    const a11yOk = r.accessibility >= FLOOR.accessibility;
    const fcpOk = r.fcpMs < FLOOR.fcpMs;
    if (!a11yOk || !fcpOk) bad++;
    rows.push({ label, path, ...r, a11yOk, fcpOk });
    console.log(
      `${a11yOk && fcpOk ? 'ok  ' : 'FAIL'} ${label.padEnd(22)} a11y ${String(r.accessibility).padStart(3)}  ` +
        `FCP ${String(r.fcpMs).padStart(5)} ms  LCP ${String(r.lcpMs).padStart(5)} ms  ` +
        `TBT ${String(r.tbtMs).padStart(4)} ms  CLS ${r.cls}` +
        `  (FCP ${r.fcpSamples.join('/')})` +
        r.failedAudits.map((a) => `\n     ${a.id}: ${a.nodes.join(' | ').slice(0, 300) || '(no node detail)'}`).join(''),
    );
  }
} finally {
  /*
   * chrome-launcher deletes its own temp profile on kill, and on Windows the
   * browser has not always let go of it yet — an EPERM that took down the whole
   * run *after* every measurement had been taken, losing the report and the
   * exit code to a failed rmdir. The browser is dead either way.
   */
  try {
    if (chrome) await chrome.kill();
  } catch {
    /* the profile directory outlives us; the process does not */
  }
  /*
   * A `vite preview` outliving its script serves a stale dist to the next suite,
   * which has produced a false green here twice (playwright.config.js). The
   * whole run is inside the try for this line's sake: the first version put the
   * browser launch above it, and a Chrome that would not start left the server
   * behind.
   */
  if (server) await stopServer(server);
}

await mkdir('.tmp', { recursive: true });
await writeFile(
  '.tmp/lighthouse-floor.json',
  JSON.stringify({ when: new Date().toISOString(), floor: FLOOR, throttling: THROTTLING_4G, rows: rows.map(({ lhr, ...r }) => r) }, null, 2),
);

/*
 * Into the run summary as well as the log, because a number nobody can find is
 * a number nobody reads — the same reasoning that put the Playwright HTML
 * reporter in playwright.config.js after five reds went unnoticed.
 */
if (process.env.GITHUB_STEP_SUMMARY) {
  const table = [
    `### Quality floor: Lighthouse (§13)`,
    '',
    `Median of ${RUNS}, mobile, ${THROTTLING_4G.throughputKbps / 1024} Mbit/s, ${THROTTLING_4G.cpuSlowdownMultiplier}x CPU. Floor: accessibility >= ${FLOOR.accessibility}, FCP < ${FLOOR.fcpMs} ms.`,
    '',
    '| route | a11y | FCP | FCP samples | LCP | TBT | CLS |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.label} | ${r.accessibility}${r.a11yOk ? '' : ' **FAIL**'} | ${r.fcpMs} ms${r.fcpOk ? '' : ' **FAIL**'} | ${r.fcpSamples.join(' / ')} | ${r.lcpMs} ms | ${r.tbtMs} ms | ${r.cls} |`,
    ),
    '',
  ].join('\n');
  await (await import('node:fs/promises')).appendFile(process.env.GITHUB_STEP_SUMMARY, table);
}

console.log(`\nfloor: accessibility >= ${FLOOR.accessibility}, FCP < ${FLOOR.fcpMs} ms on ${THROTTLING_4G.throughputKbps / 1024} Mbit/s / ${THROTTLING_4G.cpuSlowdownMultiplier}x CPU`);
if (entryCss && !entryCss.ok) {
  console.error(
    `entry stylesheet is ${entryCss.bytes} bytes, over the ${ENTRY_CSS_CEILING} ceiling by ` +
      `${entryCss.bytes - ENTRY_CSS_CEILING}. FCP steps by a round trip near here, so this is the ` +
      `FCP floor arriving early; ENTRY_CSS_CEILING's comment has the measurement and the way down.`,
  );
}
if (bad) {
  console.error(`${bad} of ${rows.length} routes below the floor`);
}
if (bad || (entryCss && !entryCss.ok)) process.exit(1);
console.log(`${rows.length} routes, all above it`);
