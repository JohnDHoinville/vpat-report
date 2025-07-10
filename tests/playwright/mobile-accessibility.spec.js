/**
 * Mobile Accessibility Testing Suite
 * Tests touch target sizes, responsive behavior, and mobile viewport compatibility
 */

const { test, expect } = require('@playwright/test');

/**
 * Main mobile accessibility testing function
 * Tests comprehensive mobile accessibility across different viewport sizes
 */
async function testMobileAccessibility(page, browserName, viewport) {
  console.log(`📱 Testing mobile accessibility on ${browserName} at ${viewport.width}x${viewport.height}`);
  
  const results = {
    viewport: viewport,
    browser: browserName,
    timestamp: new Date().toISOString(),
    touchTargets: [],
    responsiveElements: [],
    textScaling: [],
    orientationSupport: [],
    mobileFeatures: [],
    violations: [],
    passed: true,
    summary: {
      totalTouchTargets: 0,
      validTouchTargets: 0,
      invalidTouchTargets: 0,
      totalElements: 0,
      responsiveElements: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Set viewport
    await page.setViewportSize(viewport);
    
    // Inject helper functions
    await injectMobileHelpers(page);
    
    // Test touch target sizes
    console.log('  🎯 Testing touch target sizes...');
    await testTouchTargetSizes(page, results);
    
    // Test responsive behavior
    console.log('  📐 Testing responsive behavior...');
    await testResponsiveBehavior(page, results);
    
    // Test text scaling and zoom
    console.log('  🔍 Testing text scaling...');
    await testTextScaling(page, results);
    
    // Test mobile-specific features
    console.log('  📲 Testing mobile features...');
    await testMobileFeatures(page, results);
    
    // Test orientation support
    console.log('  🔄 Testing orientation support...');
    await testOrientationSupport(page, results);
    
    // Test scrolling and overflow
    console.log('  📜 Testing scrolling behavior...');
    await testScrollingBehavior(page, results);

  } catch (error) {
    results.violations.push({
      type: 'mobile-test-error',
      message: `Mobile accessibility testing failed: ${error.message}`,
      severity: 'critical',
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.totalElements = results.touchTargets.length + results.responsiveElements.length;
  results.summary.totalChecks = 6; // Number of main test categories
  results.summary.passedChecks = results.summary.totalChecks - (results.violations.length > 0 ? 1 : 0);
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

  return results;
}

/**
 * Inject helper functions for mobile accessibility testing
 */
async function injectMobileHelpers(page) {
  await page.addInitScript(() => {
    // Touch target size checker
    window.checkTouchTargetSize = function(element) {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      // Get padding to include in touch target calculation
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
      
      const touchWidth = rect.width + paddingLeft + paddingRight;
      const touchHeight = rect.height + paddingTop + paddingBottom;
      
      return {
        width: touchWidth,
        height: touchHeight,
        area: touchWidth * touchHeight,
        meetsMinimum: touchWidth >= 44 && touchHeight >= 44,
        isVisible: rect.width > 0 && rect.height > 0,
        position: {
          x: rect.left,
          y: rect.top
        }
      };
    };

    // Responsive element checker
    window.checkResponsiveElement = function(element) {
      const rect = element.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(element);
      
      return {
        width: rect.width,
        height: rect.height,
        overflowX: computedStyle.overflowX,
        overflowY: computedStyle.overflowY,
        position: computedStyle.position,
        display: computedStyle.display,
        flexWrap: computedStyle.flexWrap,
        isResponsive: !computedStyle.width || computedStyle.width.includes('%') || 
                     computedStyle.width === 'auto' || computedStyle.maxWidth === '100%',
        hasHorizontalScroll: element.scrollWidth > element.clientWidth,
        hasVerticalScroll: element.scrollHeight > element.clientHeight
      };
    };

    // Text scaling checker
    window.checkTextScaling = function() {
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label'));
      
      return textElements.map(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
        
        return {
          tagName: el.tagName,
          fontSize: fontSize,
          lineHeight: lineHeight,
          fontSizeInRem: fontSize / 16, // Assuming 16px base font size
          text: el.textContent?.trim().substring(0, 50) || '',
          isReadable: fontSize >= 16, // Minimum recommended for mobile
          hasGoodLineHeight: lineHeight >= fontSize * 1.2,
          id: el.id || '',
          className: el.className || ''
        };
      });
    };

    // Mobile viewport checker
    window.checkMobileViewport = function() {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio || 1,
        orientation: window.screen?.orientation?.type || 'unknown',
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      };
      
      const metaViewport = document.querySelector('meta[name="viewport"]');
      
      return {
        viewport: viewport,
        hasViewportMeta: !!metaViewport,
        viewportContent: metaViewport?.getAttribute('content') || '',
        isResponsive: metaViewport?.getAttribute('content')?.includes('width=device-width') || false,
        allowsZoom: !metaViewport?.getAttribute('content')?.includes('user-scalable=no') &&
                   !metaViewport?.getAttribute('content')?.includes('maximum-scale=1'),
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth
      };
    };
  });
}

/**
 * Test touch target sizes
 */
async function testTouchTargetSizes(page, results) {
  const touchTargets = await page.evaluate(() => {
    // Find all interactive elements
    const interactiveElements = Array.from(document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex], [onclick]'
    ));
    
    return interactiveElements.map(el => {
      const targetInfo = window.checkTouchTargetSize(el);
      
      return {
        tagName: el.tagName,
        type: el.type || '',
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 30) || '',
        href: el.href || '',
        role: el.getAttribute('role') || '',
        touchTarget: targetInfo,
        isVisible: targetInfo.isVisible,
        tabIndex: el.tabIndex
      };
    });
  });
  
  results.touchTargets = touchTargets;
  results.summary.totalTouchTargets = touchTargets.length;
  results.summary.validTouchTargets = touchTargets.filter(t => t.touchTarget.meetsMinimum).length;
  results.summary.invalidTouchTargets = touchTargets.filter(t => !t.touchTarget.meetsMinimum && t.isVisible).length;
  
  // Validate touch target sizes
  touchTargets.forEach(target => {
    if (target.isVisible && !target.touchTarget.meetsMinimum) {
      results.violations.push({
        type: 'touch-target-too-small',
        message: `Touch target smaller than 44x44px: ${Math.round(target.touchTarget.width)}x${Math.round(target.touchTarget.height)}px`,
        element: target,
        severity: 'serious'
      });
    }
    
    // Check for overlapping touch targets
    const area = target.touchTarget.area;
    if (area > 0 && area < 44 * 44) {
      const density = touchTargets.filter(t => 
        t.isVisible && 
        Math.abs(t.touchTarget.position.x - target.touchTarget.position.x) < 88 &&
        Math.abs(t.touchTarget.position.y - target.touchTarget.position.y) < 88
      ).length;
      
      if (density > 3) { // More than 3 small targets in close proximity
        results.violations.push({
          type: 'touch-target-density-high',
          message: `High density of small touch targets in area`,
          element: target,
          severity: 'moderate'
        });
      }
    }
  });
  
  console.log(`    📊 Touch targets: ${touchTargets.length} found, ${results.summary.validTouchTargets} valid, ${results.summary.invalidTouchTargets} invalid`);
}

/**
 * Test responsive behavior
 */
async function testResponsiveBehavior(page, results) {
  const responsiveElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && el.getBoundingClientRect().width > 0;
    });
    
    return elements.slice(0, 50).map(el => { // Limit to first 50 visible elements
      const responsive = window.checkResponsiveElement(el);
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        responsive: responsive,
        isContainer: ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER'].includes(el.tagName)
      };
    });
  });
  
  results.responsiveElements = responsiveElements;
  results.summary.responsiveElements = responsiveElements.filter(e => e.responsive.isResponsive).length;
  
  // Check for horizontal overflow
  const hasHorizontalOverflow = await page.evaluate(() => {
    const viewport = window.checkMobileViewport();
    return viewport.hasHorizontalOverflow;
  });
  
  if (hasHorizontalOverflow) {
    results.violations.push({
      type: 'horizontal-overflow',
      message: 'Page has horizontal overflow causing horizontal scrolling',
      severity: 'serious'
    });
  }
  
  // Check for fixed width elements that might not be responsive
  responsiveElements.forEach(element => {
    if (!element.responsive.isResponsive && element.responsive.width > 320 && element.isContainer) {
      results.violations.push({
        type: 'non-responsive-container',
        message: `Container element may not be responsive (fixed width: ${Math.round(element.responsive.width)}px)`,
        element: element,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`    📊 Elements: ${responsiveElements.length} analyzed, ${results.summary.responsiveElements} responsive`);
}

/**
 * Test text scaling
 */
async function testTextScaling(page, results) {
  const textElements = await page.evaluate(() => {
    return window.checkTextScaling();
  });
  
  results.textScaling = textElements;
  
  // Check for text that's too small on mobile
  textElements.forEach(element => {
    if (!element.isReadable && element.text.length > 0) {
      results.violations.push({
        type: 'text-too-small',
        message: `Text too small for mobile (${element.fontSize}px, recommended minimum 16px)`,
        element: element,
        severity: 'moderate'
      });
    }
    
    if (!element.hasGoodLineHeight && element.text.length > 0) {
      results.violations.push({
        type: 'insufficient-line-height',
        message: `Insufficient line height for readability (${element.lineHeight}px for ${element.fontSize}px text)`,
        element: element,
        severity: 'minor'
      });
    }
  });
  
  console.log(`    📊 Text elements: ${textElements.length} analyzed`);
}

/**
 * Test mobile-specific features
 */
async function testMobileFeatures(page, results) {
  const mobileInfo = await page.evaluate(() => {
    return window.checkMobileViewport();
  });
  
  results.mobileFeatures.push(mobileInfo);
  
  // Check for viewport meta tag
  if (!mobileInfo.hasViewportMeta) {
    results.violations.push({
      type: 'missing-viewport-meta',
      message: 'Missing viewport meta tag for mobile optimization',
      severity: 'serious'
    });
  } else if (!mobileInfo.isResponsive) {
    results.violations.push({
      type: 'non-responsive-viewport',
      message: 'Viewport meta tag does not include width=device-width',
      severity: 'moderate'
    });
  }
  
  // Check if zoom is disabled
  if (!mobileInfo.allowsZoom) {
    results.violations.push({
      type: 'zoom-disabled',
      message: 'User scaling/zoom is disabled, violating WCAG 2.2 AA requirements',
      severity: 'serious'
    });
  }
  
  console.log(`    📊 Mobile features: viewport meta ${mobileInfo.hasViewportMeta ? 'present' : 'missing'}, zoom ${mobileInfo.allowsZoom ? 'allowed' : 'disabled'}`);
}

/**
 * Test orientation support
 */
async function testOrientationSupport(page, results) {
  const currentViewport = page.viewportSize();
  
  // Test portrait orientation
  await page.setViewportSize({ width: currentViewport.height, height: currentViewport.width });
  await page.waitForTimeout(500); // Allow time for reflow
  
  const portraitInfo = await page.evaluate(() => {
    return {
      orientation: 'portrait',
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth
    };
  });
  
  // Restore original orientation
  await page.setViewportSize(currentViewport);
  await page.waitForTimeout(500);
  
  const landscapeInfo = await page.evaluate(() => {
    return {
      orientation: 'landscape',
      hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
      viewportWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth
    };
  });
  
  results.orientationSupport = [portraitInfo, landscapeInfo];
  
  // Check for orientation-specific issues
  if (portraitInfo.hasHorizontalOverflow) {
    results.violations.push({
      type: 'portrait-overflow',
      message: 'Content overflows in portrait orientation',
      severity: 'moderate'
    });
  }
  
  if (landscapeInfo.hasHorizontalOverflow) {
    results.violations.push({
      type: 'landscape-overflow',
      message: 'Content overflows in landscape orientation',
      severity: 'moderate'
    });
  }
  
  console.log(`    📊 Orientation support: portrait ${portraitInfo.hasHorizontalOverflow ? 'overflow' : 'ok'}, landscape ${landscapeInfo.hasHorizontalOverflow ? 'overflow' : 'ok'}`);
}

/**
 * Test scrolling behavior
 */
async function testScrollingBehavior(page, results) {
  const scrollInfo = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    
    return {
      hasVerticalScroll: body.scrollHeight > window.innerHeight,
      hasHorizontalScroll: body.scrollWidth > window.innerWidth,
      scrollHeight: body.scrollHeight,
      scrollWidth: body.scrollWidth,
      windowHeight: window.innerHeight,
      windowWidth: window.innerWidth,
      canScroll: !body.style.overflow?.includes('hidden') && !html.style.overflow?.includes('hidden')
    };
  });
  
  // Test actual scrolling
  try {
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(100);
    const scrollPosition = await page.evaluate(() => window.pageYOffset);
    
    if (scrollInfo.hasVerticalScroll && scrollPosition === 0) {
      results.violations.push({
        type: 'scroll-disabled',
        message: 'Vertical scrolling appears to be disabled',
        severity: 'serious'
      });
    }
  } catch (error) {
    // Scroll test failed, but don't treat as critical
  }
  
  console.log(`    📊 Scrolling: vertical ${scrollInfo.hasVerticalScroll ? 'available' : 'not needed'}, horizontal ${scrollInfo.hasHorizontalScroll ? 'present' : 'none'}`);
}

// Test suite
test.describe('Mobile Accessibility Testing', () => {
  
  const mobileViewports = [
    { name: 'small-mobile', width: 320, height: 568 },      // iPhone SE
    { name: 'mobile', width: 375, height: 667 },           // iPhone 8
    { name: 'large-mobile', width: 414, height: 896 },     // iPhone 11 Pro Max
    { name: 'tablet', width: 768, height: 1024 },          // iPad
    { name: 'desktop-small', width: 1024, height: 768 },   // Small desktop
    { name: 'desktop-large', width: 1920, height: 1080 }   // Large desktop
  ];
  
  mobileViewports.forEach(viewport => {
    test(`should be accessible on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page, browserName }) => {
      // Inject helper functions before navigation
      await injectMobileHelpers(page);
      
      await page.goto('/');
      
      const results = await testMobileAccessibility(page, browserName, viewport);
      
      // Log results
      console.log(`\n📱 Mobile Accessibility Results for ${browserName} at ${viewport.width}x${viewport.height}:`);
      console.log(`📊 Touch targets: ${results.summary.totalTouchTargets} total, ${results.summary.validTouchTargets} valid`);
      console.log(`📊 Responsive elements: ${results.summary.responsiveElements}`);
      console.log(`📊 Violations: ${results.summary.violationCount}`);
      
      // Save detailed results
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = `reports/mobile-${viewport.name}-${browserName}-${timestamp}.json`;
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      console.log(`💾 Results saved to: ${resultsPath}`);
      
      // Assertions
      expect(results.summary.totalTouchTargets).toBeGreaterThan(0);
      
      // Check for critical violations
      const criticalViolations = results.violations.filter(v => v.severity === 'critical');
      expect(criticalViolations).toHaveLength(0);
      
      // Check touch target compliance (at least 80% should meet minimum size)
      const touchTargetCompliance = results.summary.validTouchTargets / results.summary.totalTouchTargets;
      expect(touchTargetCompliance).toBeGreaterThan(0.8);
      
      console.log(`✅ Mobile accessibility test completed for ${browserName} at ${viewport.width}x${viewport.height}`);
    });
  });

  test('should handle text scaling appropriately', async ({ page, browserName }) => {
    console.log(`📝 Testing text scaling on ${browserName}`);
    
    // Inject helper functions before navigation
    await injectMobileHelpers(page);
    
    await page.goto('/');
    
    // Test at different zoom levels
    const zoomLevels = [1.0, 1.5, 2.0];
    const textScalingResults = [];
    
    for (const zoom of zoomLevels) {
      await page.evaluate((zoomLevel) => {
        document.body.style.zoom = zoomLevel;
      }, zoom);
      
      await page.waitForTimeout(500);
      
      const textInfo = await page.evaluate(() => {
        return window.checkTextScaling();
      });
      
      textScalingResults.push({
        zoom: zoom,
        textElements: textInfo.length,
        readableElements: textInfo.filter(t => t.isReadable).length
      });
    }
    
    // Reset zoom
    await page.evaluate(() => {
      document.body.style.zoom = 1;
    });
    
    // At least 90% of text should remain readable at 200% zoom
    const zoomTest = textScalingResults.find(r => r.zoom === 2.0);
    const readabilityRatio = zoomTest.readableElements / zoomTest.textElements;
    expect(readabilityRatio).toBeGreaterThan(0.9);
    
    console.log(`✅ Text scaling test completed for ${browserName}`);
  });

});

module.exports = { testMobileAccessibility }; 