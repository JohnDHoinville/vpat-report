/**
 * Playwright Configuration for Visual Regression Testing
 * 
 * Specialized configuration for testing the manual testing UI components
 * and ensuring visual consistency between React and Alpine.js systems.
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/visual-regression',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Disable for visual tests to ensure consistency
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'tests/visual-regression/results' }],
    ['json', { outputFile: 'tests/visual-regression/results/results.json' }]
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Visual comparisons settings */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* Timeout for each action */
    actionTimeout: 10000,
    
    /* Global test timeout */
    testTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1366, height: 768 }
      },
    },
    
    {
      name: 'chromium-mobile',
      use: { 
        ...devices['Pixel 5'],
        viewport: { width: 393, height: 851 }
      },
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1366, height: 768 }
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1366, height: 768 }
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'tablet-landscape',
      use: {
        ...devices['iPad Pro landscape'],
        viewport: { width: 1024, height: 768 }
      },
    },
    
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 768, height: 1024 }
      },
    },
  ],

  /* Visual regression specific settings */
  expect: {
    /* Threshold for pixel difference in visual comparisons */
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 1000,
      animations: 'disabled', // Disable animations for consistent screenshots
    },
    
    /* Visual comparison settings */
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 1000,
    }
  },

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run start:frontend',
      port: 8080,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: 'node api/server.js',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/visual-regression/global-setup.js'),
  globalTeardown: require.resolve('./tests/visual-regression/global-teardown.js'),
}); 