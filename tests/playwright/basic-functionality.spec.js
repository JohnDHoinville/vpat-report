/**
 * Basic Playwright Functionality Tests
 * Verifies Playwright setup across multiple browsers
 */

const { test, expect } = require('@playwright/test');

test.describe('Basic Playwright Setup Verification', () => {
  
  test('should load the application homepage', async ({ page, browserName }) => {
    console.log(`🔍 Testing on ${browserName}`);
    
    // Navigate to the application
    await page.goto('/');
    
    // Verify the page loads
    await expect(page).toHaveTitle(/VPAT|Accessibility/i);
    
    // Verify the page is interactive
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: `reports/playwright-${browserName}-homepage.png`,
      fullPage: true 
    });
    
    console.log(`✅ ${browserName} test completed successfully`);
  });

  test('should handle viewport changes correctly', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop-medium' },
      { width: 1024, height: 768, name: 'desktop-small' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for any responsive changes
      await page.waitForTimeout(500);
      
      // Verify the page is still functional
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Take screenshot at this viewport
      await page.screenshot({ 
        path: `reports/playwright-${browserName}-${viewport.name}.png`,
        fullPage: false 
      });
    }
    
    console.log(`✅ ${browserName} viewport tests completed`);
  });

  test('should verify basic accessibility structure', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Check for basic accessibility landmarks
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count();
    
    // Verify basic structure exists
    expect(headings).toBeGreaterThan(0);
    
    // Verify page has a title
    const title = await page.title();
    expect(title).not.toBe('');
    
    console.log(`✅ ${browserName} accessibility structure verified`);
  });

  test('should handle JavaScript interactions', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Look for interactive elements
    const buttons = await page.locator('button, input[type="button"], input[type="submit"]');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Test first button interaction
      const firstButton = buttons.first();
      const isVisible = await firstButton.isVisible();
      
      if (isVisible) {
        // Get button text for logging
        const buttonText = await firstButton.textContent() || 'unnamed button';
        console.log(`${browserName} - Testing button: "${buttonText}"`);
        
        // Click the button
        await firstButton.click();
        
        // Wait for any potential changes
        await page.waitForTimeout(1000);
        
        // Verify page is still responsive
        const title = await page.title();
        expect(title).toBeTruthy();
      }
    }
    
    console.log(`✅ ${browserName} JavaScript interaction tests completed`);
  });

  test('should measure basic performance metrics', async ({ page, browserName }) => {
    // Start timing
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate load time
    const loadTime = Date.now() - startTime;
    
    // Log performance info
    console.log(`${browserName} - Page load time: ${loadTime}ms`);
    
    // Verify reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Check for console errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });
    
    // Reload to capture any console errors
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Log any console errors found
    if (logs.length > 0) {
      console.log(`${browserName} - Console errors found:`, logs);
    }
  });

});

test.describe('Cross-browser Compatibility', () => {
  
  test('should work consistently across all browsers', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Test common functionality that should work across browsers
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(100);
    
    // Test CSS rendering
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily
      };
    });
    
    expect(bodyStyles.fontSize).toBeTruthy();
    console.log(`${browserName} - Body styles:`, bodyStyles);
    
    // Test basic DOM manipulation
    const elementCount = await page.evaluate(() => {
      return {
        divs: document.querySelectorAll('div').length,
        paragraphs: document.querySelectorAll('p').length,
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length
      };
    });
    
    console.log(`${browserName} - Element counts:`, elementCount);
  });

}); 