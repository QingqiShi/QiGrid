import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:5299",
    headless: true,
  },
  webServer: {
    command: "pnpm --filter @qigrid/benchmark dev",
    port: 5299,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
