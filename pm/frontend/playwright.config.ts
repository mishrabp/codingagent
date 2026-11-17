import { defineConfig, devices } from "@playwright/test";

// E2E runs its own servers on separate ports, with a fresh database each run,
// so it never touches the development database.
const backendPort = 8100;
const frontendPort = 3100;

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `rm -f data/e2e.db && DB_PATH=data/e2e.db uv run uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}`,
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}/api/board`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `npm run dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
      env: { BACKEND_URL: `http://127.0.0.1:${backendPort}`, NEXT_DIST_DIR: ".next-e2e" },
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
