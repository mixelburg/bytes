import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './e2e' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Start the API (Hono + seeded SQLite) and the web dev server before tests. */
  webServer: [
    {
      command: 'bunx nx serve api',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      cwd: workspaceRoot,
      timeout: 60_000,
    },
    {
      command: 'bunx nx run web:dev',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  // Desktop + mobile, both on the Chromium engine (single browser download).
  // This app is mobile-first, so Mobile Chrome carries real weight.
  // Add firefox/webkit projects here when cross-engine coverage is needed.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
