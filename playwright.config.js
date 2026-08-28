import { defineConfig, devices } from '@playwright/test';

/**
 * Browser-level verification, which is what makes the brief's quality floor
 * (§13) an actual gate rather than an aspiration: accessibility violations,
 * keyboard focus, reduced-motion behaviour and 360 px responsiveness cannot be
 * checked by unit tests or by reading the code.
 *
 * Runs against a real production build via `vite preview`, not the dev server,
 * so what is tested is what deploys.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /*
   * **The HTML reporter is what makes a red CI run readable**, and its absence
   * is why five consecutive reds went unnoticed (2026-08-28). The workflow has
   * always had an `upload-artifact` step for `playwright-report/` on failure —
   * but nothing ever wrote that directory, so every red run warned "No files
   * were found with the provided path" and uploaded nothing. The only way to
   * see what had failed was the raw job log through the API. A gate whose
   * failures cannot be read is a gate people stop reading.
   */
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // 360 px is the brief's floor; keeping it as its own project means every
    // spec runs at both widths rather than needing per-test viewport juggling.
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    // Never reuse a server this config did not start. Reuse looks like a
    // saving and is a trap: a `vite preview` left running from some earlier
    // task serves whatever dist happened to be on disk then, and the suite
    // passes against code that is no longer the code. That has now produced a
    // false green twice, including once in a clean-checkout verification.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
