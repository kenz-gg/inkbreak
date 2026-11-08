import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 120_000, workers: 1,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:5173', viewport: { width: 1366, height: 900 },
    screenshot: 'only-on-failure', trace: 'retain-on-failure', launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader'] } },
  webServer: { command: 'npm run dev:web', url: 'http://127.0.0.1:5173', reuseExistingServer: true, timeout: 60_000 },
});
