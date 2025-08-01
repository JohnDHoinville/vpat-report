/**
 * Visual Regression Tests for Manual Testing UI Components
 * 
 * This test suite validates the visual consistency, responsive design,
 * and accessibility compliance of the React manual testing components
 * integrated with the Alpine.js dashboard system.
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const VIEWPORT_SIZES = [
  { width: 1920, height: 1080, name: 'desktop-large' },
  { width: 1366, height: 768, name: 'desktop-standard' },
  { width: 1024, height: 768, name: 'tablet-landscape' },
  { width: 768, height: 1024, name: 'tablet-portrait' },
  { width: 375, height: 667, name: 'mobile' }
];

const BASE_URL = 'http://localhost:8080';
const DASHBOARD_URL = `${BASE_URL}/dashboard.html`;

test.describe('Manual Testing UI Visual Regression', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL);
    
    // Wait for React components to load
    await page.waitForFunction(() => {
      return window.ReactComponents && window.manualTestingTest;
    }, { timeout: 10000 });
    
    // Wait for Alpine.js to initialize
    await page.waitForFunction(() => {
      return window.dashboardInstance && window.alpineReactBridge;
    }, { timeout: 5000 });
  });

  test.describe('Component Rendering Tests', () => {
    
    test('should render ManualTestingInterface without session', async ({ page }) => {
      // Set up state for no session scenario
      await page.evaluate(() => {
        window.alpineReactBridge.setState('selectedProject', {
          id: 'test-project',
          name: 'Visual Test Project',
          primary_url: 'https://example.com'
        });
        window.alpineReactBridge.setState('manualTestingSession', null);
      });

      // Render the interface
      await page.evaluate(() => {
        return window.manualTestingTest.renderInterface();
      });

      // Wait for component to render
      await page.waitForSelector('#manual-testing-interface', { timeout: 5000 });

      // Take screenshot for visual comparison
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-no-session.png');
    });

    test('should render ManualTestingInterface with active session', async ({ page }) => {
      // Run demo to set up full state
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      // Wait for demo to complete
      await page.waitForTimeout(4000);

      // Take screenshot of assignments view
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-assignments-view.png');

      // Switch to status manager view
      await page.evaluate(() => {
        // Simulate clicking status tab (would normally be handled by component)
        const statusButton = document.querySelector('[data-view="status"]');
        if (statusButton) statusButton.click();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-status-view.png');
    });

    test('should render TestReview modal correctly', async ({ page }) => {
      // Set up demo data
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Open test review modal
      await page.evaluate(() => {
        return window.manualTestingTest.openTestReview();
      });

      // Wait for modal to appear
      await page.waitForSelector('[data-testid="test-review-modal"]', { timeout: 5000 });

      // Take full page screenshot to capture modal overlay
      await expect(page).toHaveScreenshot('test-review-modal.png', { fullPage: true });
    });

    test('should render TestStatusManager with progress overview', async ({ page }) => {
      // Set up demo data with varied statuses
      await page.evaluate(() => {
        window.manualTestingTest.runDemo();
        // Add more test data for better visual coverage
        const additionalTests = [
          {
            id: 'test-5',
            criterion_number: '4.1.1',
            title: 'Parsing',
            status: 'completed',
            wcag_level: 'A',
            page_title: 'About Page'
          },
          {
            id: 'test-6',
            criterion_number: '4.1.2',
            title: 'Name, Role, Value',
            status: 'needs_review',
            wcag_level: 'A',
            page_title: 'Contact Page'
          }
        ];
        
        const existingTests = window.alpineReactBridge.getState('manualTestingAssignments', []);
        window.alpineReactBridge.setState('manualTestingAssignments', [...existingTests, ...additionalTests]);
      });

      await page.waitForTimeout(2000);

      // Focus on status manager section
      const statusManager = page.locator('[data-testid="test-status-manager"]');
      if (await statusManager.count() > 0) {
        await expect(statusManager).toHaveScreenshot('test-status-manager.png');
      }
    });
  });

  test.describe('Responsive Design Tests', () => {
    
    for (const viewport of VIEWPORT_SIZES) {
      test(`should display correctly on ${viewport.name}`, async ({ page }) => {
        // Set viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        // Set up demo data
        await page.evaluate(() => {
          return window.manualTestingTest.runDemo();
        });

        await page.waitForTimeout(3000);

        // Take screenshot of the interface
        await expect(page.locator('#manual-testing-interface')).toHaveScreenshot(`manual-testing-${viewport.name}.png`);

        // Test modal on mobile devices
        if (viewport.width <= 768) {
          await page.evaluate(() => {
            return window.manualTestingTest.openTestReview();
          });

          await page.waitForSelector('[data-testid="test-review-modal"]', { timeout: 5000 });
          await expect(page).toHaveScreenshot(`test-review-modal-${viewport.name}.png`, { fullPage: true });
        }
      });
    }
  });

  test.describe('Component State Tests', () => {
    
    test('should display loading states correctly', async ({ page }) => {
      // Set loading state
      await page.evaluate(() => {
        window.alpineReactBridge.setState('loading', true);
        return window.manualTestingTest.renderInterface();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-loading.png');
    });

    test('should display error states correctly', async ({ page }) => {
      // Set error state
      await page.evaluate(() => {
        window.alpineReactBridge.setState('selectedProject', null);
        window.alpineReactBridge.setState('error', 'Failed to load project data');
        return window.manualTestingTest.renderInterface();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-error.png');
    });

    test('should display empty states correctly', async ({ page }) => {
      // Set empty state
      await page.evaluate(() => {
        window.alpineReactBridge.setState('selectedProject', {
          id: 'empty-project',
          name: 'Empty Project'
        });
        window.alpineReactBridge.setState('manualTestingSession', {
          id: 'empty-session',
          name: 'Empty Session'
        });
        window.alpineReactBridge.setState('manualTestingAssignments', []);
        return window.manualTestingTest.renderInterface();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-empty.png');
    });

    test('should display populated states with various test statuses', async ({ page }) => {
      // Create comprehensive test data
      await page.evaluate(() => {
        const comprehensiveTests = [
          { id: '1', criterion_number: '1.1.1', title: 'Non-text Content', status: 'pending', wcag_level: 'A' },
          { id: '2', criterion_number: '1.4.3', title: 'Contrast (Minimum)', status: 'in_progress', wcag_level: 'AA' },
          { id: '3', criterion_number: '2.1.1', title: 'Keyboard', status: 'completed', wcag_level: 'A' },
          { id: '4', criterion_number: '3.3.2', title: 'Labels or Instructions', status: 'needs_review', wcag_level: 'A' },
          { id: '5', criterion_number: '4.1.1', title: 'Parsing', status: 'completed', wcag_level: 'A' },
        ];

        window.alpineReactBridge.setState('selectedProject', { id: 'test', name: 'Test Project' });
        window.alpineReactBridge.setState('manualTestingSession', { id: 'test', name: 'Test Session' });
        window.alpineReactBridge.setState('manualTestingAssignments', comprehensiveTests);
        return window.manualTestingTest.renderInterface();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-populated.png');
    });
  });

  test.describe('Interactive Elements Tests', () => {
    
    test('should display hover states correctly', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Hover over interactive elements
      const firstTestCard = page.locator('[data-testid="test-assignment-card"]').first();
      if (await firstTestCard.count() > 0) {
        await firstTestCard.hover();
        await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-hover-state.png');
      }
    });

    test('should display selection states correctly', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Select multiple tests (simulate checkbox selection)
      await page.evaluate(() => {
        // Simulate bulk selection state
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox, index) => {
          if (index < 2) checkbox.checked = true;
        });
      });

      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-selection-state.png');
    });

    test('should display filter states correctly', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Apply filters
      const statusFilter = page.locator('select[data-filter="status"]');
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('completed');
        await page.waitForTimeout(500);
        await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('manual-testing-filtered.png');
      }
    });
  });

  test.describe('Theme and Color Consistency Tests', () => {
    
    test('should maintain consistent styling with Alpine.js components', async ({ page }) => {
      // Navigate to dashboard and take baseline screenshot
      await page.goto(DASHBOARD_URL);
      await page.waitForLoadState('networkidle');
      
      // Capture Alpine.js dashboard baseline
      await expect(page.locator('#dashboard-container')).toHaveScreenshot('alpine-dashboard-baseline.png');

      // Now render React components
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Capture React components integrated with Alpine.js
      await expect(page).toHaveScreenshot('react-alpine-integration.png', { fullPage: true });
    });

    test('should display consistent color schemes', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Test color consistency for different status badges
      const statusElements = page.locator('[data-testid="status-badge"]');
      if (await statusElements.count() > 0) {
        await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('status-color-consistency.png');
      }
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    
    test('should display focus indicators correctly', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Tab through focusable elements
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('focus-indicators.png');
    });

    test('should support high contrast mode', async ({ page }) => {
      // Enable forced colors (high contrast mode simulation)
      await page.emulateMedia({ forcedColors: 'active' });

      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('high-contrast-mode.png');
    });

    test('should scale properly with increased text size', async ({ page }) => {
      // Simulate 200% text scaling
      await page.addStyleTag({
        content: `
          * {
            font-size: 200% !important;
            line-height: 1.5 !important;
          }
        `
      });

      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot('large-text-scaling.png');
    });
  });

  test.describe('Animation and Transition Tests', () => {
    
    test('should display modal animations correctly', async ({ page }) => {
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);

      // Start modal opening animation
      const modalPromise = page.evaluate(() => {
        return window.manualTestingTest.openTestReview();
      });

      // Capture during animation (mid-transition)
      await page.waitForTimeout(150);
      await expect(page).toHaveScreenshot('modal-animation-mid.png', { fullPage: true });

      // Wait for animation to complete
      await modalPromise;
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('modal-animation-complete.png', { fullPage: true });
    });
  });
});

test.describe('Cross-browser Compatibility', () => {
  
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should display correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test`);
      
      await page.evaluate(() => {
        return window.manualTestingTest.runDemo();
      });

      await page.waitForTimeout(3000);
      await expect(page.locator('#manual-testing-interface')).toHaveScreenshot(`manual-testing-${browserName}.png`);
    });
  });
});

// Test utilities
test.describe('Visual Regression Utilities', () => {
  
  test('should clean up test state', async ({ page }) => {
    // Clean up any test data
    await page.evaluate(() => {
      if (window.manualTestingTest) {
        window.manualTestingTest.cleanup();
      }
    });

    // Verify clean state
    const cleanState = await page.evaluate(() => {
      return window.alpineReactBridge?.getState('manualTestingSession');
    });

    expect(cleanState).toBeNull();
  });
}); 