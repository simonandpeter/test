/**
 * The repo's own Playwright config on a different port.
 *
 * 4173 was held by another session's `vite preview` while this worktree needed
 * to run `prayer.spec.js`, and `reuseExistingServer: false` is there for a good
 * reason — a server started earlier serves whatever `dist/` was on disk then.
 * So this starts its own build and its own preview, on a port nobody else has.
 */
import { fileURLToPath } from 'node:url';
import base from '../playwright.config.js';

const PORT = 4178;

export default {
  ...base,
  testDir: fileURLToPath(new URL('../e2e', import.meta.url)),
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: {
    ...base.webServer,
    /* `npm run` and not `npx vite`: with no `node_modules` of its own a
       worktree resolves the binary upward into the main checkout, and vite then
       looks for *its* `dist/`. */
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
  },
};
