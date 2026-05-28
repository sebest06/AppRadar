import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,           // sequential — single shared test DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'node ../backend/server.js',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      env: {
        PORT: '3000',
        JWT_SECRET: 'e2e_test_secret',
        RACE_COOLDOWN_MINUTES: '0',
        DATABASE_PATH: '/tmp/appradar_e2e.db',
        NODE_ENV: 'test',
        CORS_ORIGINS: 'http://localhost:5173',
      },
    },
  ],
});
