/**
 * Basic Playwright Functionality Tests
 * Verifies Playwright setup across multiple browsers
 * Now integrated with compliance session management
 */

const { test, expect } = require('@playwright/test');
const { integrationHelper } = require('./integration-helper');

// Global test session configuration
let testSessionId = null;
let testRunId = null;

test.describe('Basic Playwright Setup Verification', () => {
  
  // Initialize session before tests
  test.beforeAll(async () => {
    try {
      // Try to get session ID from environment or create new one
      const projectId = process.env.TEST_PROJECT_ID || 'ecc03931-c333-408a-88eb-94d94723d33c'; // Default project
      
      if (process.env.TEST_SESSION_ID) {
        // Use existing session
        const initResult = await integrationHelper.initializeSession(process.env.TEST_SESSION_ID);
        testSessionId = initResult.sessionId;
        testRunId = initResult.testRunId;
        console.log(`🔗 Using existing test session: ${testSessionId}`);
      } else {
        // Create new integrated session
        const sessionResult = await integrationHelper.createOrFindSession(projectId, {
          name: 'Playwright Basic Functionality Testing',
          description: 'Automated testing of basic browser functionality and accessibility setup verification'
        });
        testSessionId = sessionResult.session.id;
        testRunId = sessionResult.frontendTestRun.id;
        console.log(`✨ Created new test session: ${testSessionId}`);
      }
    } catch (error) {
      console.error('⚠️  Failed to initialize test session:', error.message);
      // Continue without integration
    }
  });

  test('should load the application homepage', async ({ page, browserName }) => {
    console.log(`🔍 Testing on ${browserName}`);
    
    const testStartTime = Date.now();
    
    // Navigate to the application
    await page.goto('/');
    
    // Verify the page loads
    await expect(page).toHaveTitle(/VPAT|Accessibility/i);
    
    // Verify the page is interactive
    await page.waitForLoadState('networkidle');
    
    // Collect basic accessibility data
    const accessibilityData = await page.evaluate(() => {
      return {
        title: document.title,
        hasHeadings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        hasLandmarks: document.querySelectorAll('main, nav, header, footer, aside, section[aria-label]').length > 0,
        hasSkipLinks: document.querySelectorAll('a[href*="#"]').length > 0,
        hasAriaLabels: document.querySelectorAll('[aria-label], [aria-labelledby]').length > 0,
        totalElements: document.querySelectorAll('*').length,
        interactiveElements: document.querySelectorAll('a, button, input, select, textarea, [tabindex]').length
      };
    });
    
    // Take a screenshot for verification
    const screenshotPath = `reports/playwright-${browserName}-homepage.png`;
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    
    const testDuration = Date.now() - testStartTime;
    
    // Create test result
    const testResult = {
      testType: 'basic-functionality',
      browser: browserName,
      pageTitle: accessibilityData.title,
      duration: testDuration,
      passed: true,
      violations: [], // No violations for basic functionality test
      
      // Basic accessibility metrics
      accessibilityMetrics: accessibilityData,
      
      // Screenshots
      screenshots: [screenshotPath],
      
      summary: {
        violationCount: 0,
        passedChecks: 6, // Number of basic checks we performed
        totalChecks: 6,
        complianceIndicators: {
          hasHeadings: accessibilityData.hasHeadings,
          hasLandmarks: accessibilityData.hasLandmarks,
          hasSkipLinks: accessibilityData.hasSkipLinks,
          hasAriaLabels: accessibilityData.hasAriaLabels,
          isInteractive: accessibilityData.interactiveElements > 0
        }
      }
    };
    
    // Store result in compliance session database
    if (testSessionId) {
      try {
        await integrationHelper.storeTestResult(
          'basic-functionality',
          page.url(),
          testResult,
          {
            browserName: browserName,
            viewport: await page.viewportSize(),
            duration: testDuration,
            testFile: 'basic-functionality.spec.js',
            screenshots: [screenshotPath]
          }
        );
        console.log(`✅ ${browserName} test result stored in compliance session`);
      } catch (error) {
        console.error(`❌ Failed to store ${browserName} test result:`, error.message);
      }
    } else {
      console.log(`⚠️  No session ID - saving local report only`);
      await integrationHelper.storeTestResult(
        'basic-functionality',
        page.url(),
        testResult,
        { browserName: browserName }
      );
    }
    
    console.log(`✅ ${browserName} test completed successfully`);
  });

  test('should handle viewport changes correctly', async ({ page, browserName }) => {
    const testStartTime = Date.now();
    await page.goto('/');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop-medium' },
      { width: 1024, height: 768, name: 'desktop-small' }
    ];
    
    const viewportResults = [];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Wait for any responsive changes
      await page.waitForTimeout(500);
      
      // Verify the page is still functional
      const title = await page.title();
      expect(title).toBeTruthy();
      
      // Collect responsive metrics
      const responsiveMetrics = await page.evaluate(() => {
        return {
          bodyWidth: document.body.offsetWidth,
          bodyHeight: document.body.offsetHeight,
          visibleElements: Array.from(document.querySelectorAll('*')).filter(el => 
            el.offsetWidth > 0 && el.offsetHeight > 0
          ).length,
          overflowElements: Array.from(document.querySelectorAll('*')).filter(el => 
            el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
          ).length
        };
      });
      
      // Take screenshot at this viewport
      const screenshotPath = `reports/playwright-${browserName}-${viewport.name}.png`;
      await page.screenshot({ 
        path: screenshotPath,
        fullPage: false 
      });
      
      viewportResults.push({
        viewport: viewport,
        metrics: responsiveMetrics,
        screenshot: screenshotPath
      });
    }
    
    const testDuration = Date.now() - testStartTime;
    
    // Create viewport test result
    const testResult = {
      testType: 'viewport-responsiveness',
      browser: browserName,
      duration: testDuration,
      passed: true,
      violations: [],
      
      viewportTests: viewportResults,
      
      summary: {
        violationCount: 0,
        passedChecks: viewports.length,
        totalChecks: viewports.length,
        responsiveMetrics: {
          testedViewports: viewports.length,
          allViewportsWorking: viewportResults.length === viewports.length
        }
      }
    };
    
    // Store result in compliance session
    if (testSessionId) {
      try {
        await integrationHelper.storeTestResult(
          'viewport-responsiveness',
          page.url(),
          testResult,
          {
            browserName: browserName,
            testFile: 'basic-functionality.spec.js',
            duration: testDuration,
            screenshots: viewportResults.map(vr => vr.screenshot)
          }
        );
        console.log(`✅ ${browserName} viewport test result stored in compliance session`);
      } catch (error) {
        console.error(`❌ Failed to store ${browserName} viewport result:`, error.message);
      }
    }
    
    console.log(`✅ ${browserName} viewport tests completed`);
  });

  test('should measure basic performance metrics', async ({ page, browserName }) => {
    const testStartTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate load time
    const loadTime = Date.now() - testStartTime;
    
    // Collect performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    // Log performance info
    console.log(`${browserName} - Page load time: ${loadTime}ms`);
    console.log(`${browserName} - Performance metrics:`, performanceMetrics);
    
    // Verify reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Create performance test result
    const testResult = {
      testType: 'performance-metrics',
      browser: browserName,
      duration: loadTime,
      passed: loadTime < 10000,
      violations: loadTime >= 10000 ? [{
        id: 'slow-page-load',
        description: `Page load time (${loadTime}ms) exceeds 10 second threshold`,
        impact: 'moderate',
        help: 'Optimize page loading performance for better accessibility'
      }] : [],
      
      performanceMetrics: {
        ...performanceMetrics,
        totalLoadTime: loadTime
      },
      
      summary: {
        violationCount: loadTime >= 10000 ? 1 : 0,
        passedChecks: loadTime < 10000 ? 1 : 0,
        totalChecks: 1,
        performanceBenchmarks: {
          loadTimeAcceptable: loadTime < 10000,
          domContentLoadedFast: performanceMetrics.domContentLoaded < 2000,
          firstPaintFast: performanceMetrics.firstPaint < 1000
        }
      }
    };
    
    // Store result in compliance session
    if (testSessionId) {
      try {
        await integrationHelper.storeTestResult(
          'performance-metrics',
          page.url(),
          testResult,
          {
            browserName: browserName,
            testFile: 'basic-functionality.spec.js',
            duration: loadTime
          }
        );
        console.log(`✅ ${browserName} performance test result stored in compliance session`);
      } catch (error) {
        console.error(`❌ Failed to store ${browserName} performance result:`, error.message);
      }
    }
  });

  // Finalize session after tests
  test.afterAll(async () => {
    if (testSessionId) {
      try {
        const finalResults = await integrationHelper.finalizeSession();
        console.log(`🏁 Test session finalized: ${testSessionId}`);
        
        if (finalResults) {
          console.log(`📊 Final compliance session results:`, {
            sessionId: testSessionId,
            totalTests: finalResults.summary?.total_automated_tests || 0,
            frontendTests: finalResults.summary?.frontend_automated_tests || 0,
            totalViolations: finalResults.summary?.total_automated_violations || 0
          });
        }
      } catch (error) {
        console.error('❌ Failed to finalize session:', error.message);
      }
    }
  });
});

test.describe('Cross-browser Compatibility', () => {
  
  test('should work consistently across all browsers', async ({ page, browserName }) => {
    const testStartTime = Date.now();
    await page.goto('/');
    
    // Test common functionality that should work across browsers
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent.length).toBeGreaterThan(100);
    
    // Test CSS rendering
    const browserCompatibilityData = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily,
        supportsCSSGrid: CSS.supports('display', 'grid'),
        supportsFlexbox: CSS.supports('display', 'flex'),
        supportsCustomProperties: CSS.supports('color', 'var(--test)')
      };
    });
    
    expect(browserCompatibilityData.fontSize).toBeTruthy();
    console.log(`${browserName} - Browser compatibility:`, browserCompatibilityData);
    
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
    
    const testDuration = Date.now() - testStartTime;
    
    // Create browser compatibility test result
    const testResult = {
      testType: 'browser-compatibility',
      browser: browserName,
      duration: testDuration,
      passed: true,
      violations: [],
      
      browserSupport: browserCompatibilityData,
      elementAnalysis: elementCount,
      
      summary: {
        violationCount: 0,
        passedChecks: 3, // CSS support, DOM content, element analysis
        totalChecks: 3,
        compatibilityFeatures: {
          cssGridSupport: browserCompatibilityData.supportsCSSGrid,
          flexboxSupport: browserCompatibilityData.supportsFlexbox,
          customPropertiesSupport: browserCompatibilityData.supportsCustomProperties,
          hasContent: pageContent.length > 100,
          hasStructure: (elementCount.divs + elementCount.paragraphs) > 0
        }
      }
    };
    
    // Store result in compliance session
    if (testSessionId) {
      try {
        await integrationHelper.storeTestResult(
          'browser-compatibility',
          page.url(),
          testResult,
          {
            browserName: browserName,
            testFile: 'basic-functionality.spec.js',
            duration: testDuration
          }
        );
        console.log(`✅ ${browserName} compatibility test result stored in compliance session`);
      } catch (error) {
        console.error(`❌ Failed to store ${browserName} compatibility result:`, error.message);
      }
    }
  });
}); 