import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 3,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: 'e2e',
      testMatch: /tests\/(auth|entries|milestones|growth|uploads|export|settings|shower)\/.+\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chaos',
      testMatch: /tests\/chaos\/.+\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
      timeout: 120000, // Chaos tests need more time to stress-test everything
      retries: 0,
    },
    {
      name: 'accessibility',
      testMatch: /tests\/accessibility\/.+\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000,
    },
    {
      name: 'responsive',
      testMatch: /tests\/responsive\/.+\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000,
    },
    {
      name: 'performance',
      testMatch: /tests\/performance\/.+\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
      timeout: 60000,
      retries: 0,
    },
  ],
});
