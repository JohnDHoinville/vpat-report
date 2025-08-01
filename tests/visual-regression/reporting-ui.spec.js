/**
 * Visual Regression Tests for Reporting Interface
 * 
 * Tests the visual appearance and responsiveness of reporting components
 * to ensure UI consistency during development.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const VIEWPORTS = [
  { width: 1920, height: 1080, name: 'desktop' },
  { width: 1024, height: 768, name: 'tablet' },
  { width: 375, height: 667, name: 'mobile' }
];

const BASE_URL = 'http://localhost:8080';

test.describe('Reporting Interface Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard.html`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for React components to initialize
    await page.waitForFunction(() => {
      return window.ReactComponents && window.reportingTest;
    }, { timeout: 10000 });
  });

  // Test each viewport
  for (const viewport of VIEWPORTS) {
    test(`Reporting Interface - ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Initialize reporting interface test
      await page.evaluate(() => {
        return window.reportingTest.renderReportingInterface();
      });
      
      // Wait for component to render
      await page.waitForTimeout(2000);
      
      // Take screenshot of main interface
      await expect(page.locator('#reporting-test-container')).toHaveScreenshot(
        `reporting-interface-${viewport.name}.png`
      );
    });

    test(`VPAT Generator - ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Initialize VPAT generator test
      await page.evaluate(() => {
        return window.reportingTest.testVPATGenerator();
      });
      
      // Wait for component to render
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await expect(page.locator('#vpat-test-container')).toHaveScreenshot(
        `vpat-generator-${viewport.name}.png`
      );
    });

    test(`Export Manager - ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Initialize export manager test
      await page.evaluate(() => {
        return window.reportingTest.testExportManager();
      });
      
      // Wait for component to render
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await expect(page.locator('#export-test-container')).toHaveScreenshot(
        `export-manager-${viewport.name}.png`
      );
    });

    test(`Progress Charts - ${viewport.name}`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Initialize progress charts test
      await page.evaluate(() => {
        return window.reportingTest.testProgressCharts();
      });
      
      // Wait for component to render
      await page.waitForTimeout(2000);
      
      // Take screenshot
      await expect(page.locator('#analytics-test-container')).toHaveScreenshot(
        `progress-charts-${viewport.name}.png`
      );
    });
  }

  test('Reporting Interface Component Interactions', async ({ page }) => {
    // Desktop viewport for interaction testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Initialize full reporting interface
    await page.evaluate(() => {
      return window.reportingTest.renderReportingInterface();
    });
    
    // Wait for component to render
    await page.waitForTimeout(2000);
    
    // Test tab navigation
    const tabs = ['reports', 'vpat', 'exports', 'analytics'];
    
    for (const tab of tabs) {
      // Click on tab (simulate tab change via direct method since we're testing components)
      await page.evaluate((tabName) => {
        // Simulate tab click by triggering the handler
        const reportingContainer = document.querySelector('#reporting-test-container');
        if (reportingContainer) {
          // Find and click the tab button
          const tabButton = reportingContainer.querySelector(`[data-tab="${tabName}"]`);
          if (tabButton) {
            tabButton.click();
          }
        }
      }, tab);
      
      // Wait for tab change animation
      await page.waitForTimeout(500);
      
      // Take screenshot of each tab
      await expect(page.locator('#reporting-test-container')).toHaveScreenshot(
        `reporting-interface-${tab}-tab.png`
      );
    }
  });

  test('Reporting Components Error States', async ({ page }) => {
    // Desktop viewport for error state testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Test VPAT generator with missing session
    await page.evaluate(() => {
      return window.reportingTest.testVPATGenerator();
    });
    
    await page.waitForTimeout(1000);
    
    // Take screenshot of error state
    await expect(page.locator('#vpat-test-container')).toHaveScreenshot(
      'vpat-generator-no-session.png'
    );
    
    // Test export manager with no data
    await page.evaluate(() => {
      window.reportingTest.cleanup();
      return window.reportingTest.testExportManager();
    });
    
    await page.waitForTimeout(1000);
    
    // Take screenshot of empty state
    await expect(page.locator('#export-test-container')).toHaveScreenshot(
      'export-manager-empty-state.png'
    );
  });

  test('Reporting Components Loading States', async ({ page }) => {
    // Desktop viewport for loading state testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Intercept API calls to simulate loading
    await page.route('**/api/**', async (route) => {
      // Delay the response to capture loading state
      await page.waitForTimeout(2000);
      await route.continue();
    });
    
    // Initialize component that will show loading state
    await page.evaluate(() => {
      return window.reportingTest.testProgressCharts();
    });
    
    // Capture loading state quickly
    await page.waitForTimeout(500);
    
    await expect(page.locator('#analytics-test-container')).toHaveScreenshot(
      'progress-charts-loading.png'
    );
  });

  test.afterEach(async ({ page }) => {
    // Clean up test containers
    await page.evaluate(() => {
      if (window.reportingTest) {
        window.reportingTest.cleanup();
      }
    });
  });
});

// Responsive design specific tests
test.describe('Reporting Interface Responsive Design', () => {
  test('Mobile layout adjustments', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.waitForFunction(() => {
      return window.ReactComponents && window.reportingTest;
    }, { timeout: 10000 });
    
    // Test mobile-specific layouts
    await page.evaluate(() => {
      return window.reportingTest.renderReportingInterface();
    });
    
    await page.waitForTimeout(2000);
    
    // Verify mobile-specific elements
    await expect(page.locator('#reporting-test-container')).toHaveScreenshot(
      'reporting-interface-mobile-responsive.png'
    );
  });

  test('Tablet layout adjustments', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Tablet viewport
    await page.setViewportSize({ width: 1024, height: 768 });
    
    await page.waitForFunction(() => {
      return window.ReactComponents && window.reportingTest;
    }, { timeout: 10000 });
    
    // Test tablet-specific layouts
    await page.evaluate(() => {
      return window.reportingTest.renderReportingInterface();
    });
    
    await page.waitForTimeout(2000);
    
    // Verify tablet-specific elements
    await expect(page.locator('#reporting-test-container')).toHaveScreenshot(
      'reporting-interface-tablet-responsive.png'
    );
  });
});

// Accessibility testing
test.describe('Reporting Interface Accessibility', () => {
  test('Focus management and keyboard navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.waitForFunction(() => {
      return window.ReactComponents && window.reportingTest;
    }, { timeout: 10000 });
    
    // Initialize reporting interface
    await page.evaluate(() => {
      return window.reportingTest.renderReportingInterface();
    });
    
    await page.waitForTimeout(2000);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    // Take screenshot with focus indicators
    await expect(page.locator('#reporting-test-container')).toHaveScreenshot(
      'reporting-interface-focus-management.png'
    );
  });

  test('High contrast mode compatibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard.html`);
    await page.waitForLoadState('networkidle');
    
    // Simulate high contrast mode with CSS
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background-color: black !important;
            color: white !important;
            border-color: white !important;
          }
        }
      `
    });
    
    await page.waitForFunction(() => {
      return window.ReactComponents && window.reportingTest;
    }, { timeout: 10000 });
    
    await page.evaluate(() => {
      return window.reportingTest.testVPATGenerator();
    });
    
    await page.waitForTimeout(2000);
    
    await expect(page.locator('#vpat-test-container')).toHaveScreenshot(
      'vpat-generator-high-contrast.png'
    );
  });
}); 