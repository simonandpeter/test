/**
 * The repo's own config on a port this desk is not already using: 4173 is held
 * by another session's preview, and a suite that cannot bind it fails every
 * test with "already used" rather than with anything about the page.
 */
import { fileURLToPath } from 'node:url';
import base from '../playwright.config.js';

const PORT = 4321;

export default {
  ...base,
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    ...base.webServer,
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // The config lives under `scratchpad/`, and a `webServer` command runs from
    // the config's own directory unless it is told otherwise.
    cwd: fileURLToPath(new URL('..', import.meta.url)),
  },
  testDir: fileURLToPath(new URL('../e2e', import.meta.url)),
};
