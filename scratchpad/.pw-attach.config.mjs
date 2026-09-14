import { defineConfig, devices } from '@playwright/test';

// TEMPORARY, session-local, delete when done. Another agent already has
// `vite preview` serving dist/ on 4173, so this attaches to that server rather
// than fighting for the port or rebuilding dist/ out from under them. Same
// projects and baseURL as playwright.config.js otherwise.
export default defineConfig({
  testDir: '../e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } } },
  ],
});
