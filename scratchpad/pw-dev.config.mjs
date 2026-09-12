import { defineConfig, devices } from '@playwright/test';
/* Scratch config: the shared one owns 4173 and refuses to reuse a server.
   This aims at a dev server started by hand on 5199 and starts none of its
   own. Functional checks only — anything about what deploys goes through the
   real config. */
export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:5199' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
});
