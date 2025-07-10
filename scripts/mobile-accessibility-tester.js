#!/usr/bin/env node

/**
 * Mobile Accessibility Testing CLI Tool
 * Tests touch target sizes, responsive behavior, and mobile viewport compatibility
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Main mobile accessibility testing function
 * Tests comprehensive mobile accessibility across different viewport sizes
 */
async function testMobileAccessibility(page, browserName, viewport, url = 'http://localhost:3000') {
  console.log(`📱 Testing mobile accessibility on ${browserName} at ${viewport.width}x${viewport.height} for ${url}`);
  
  const results = {
    url: url,
    browser: browserName,
    viewport: viewport,
    timestamp: new Date().toISOString(),
    touchTargets: [],
    responsiveElements: [],
    textScaling: [],
    orientationSupport: [],
    mobileFeatures: [],
    scrollingBehavior: [],
    violations: [],
    passed: true,
    summary: {
      totalTouchTargets: 0,
      validTouchTargets: 0,
      invalidTouchTargets: 0,
      totalElements: 0,
      responsiveElements: 0,
      textElementsAnalyzed: 0,
      readableTextElements: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Inject helper functions before navigation
    await injectMobileHelpers(page);
    
    // Set viewport and navigate
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: 'networkidle' });
    
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
        },
        spacing: {
          top: paddingTop,
          bottom: paddingBottom,
          left: paddingLeft,
          right: paddingRight
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
        maxWidth: computedStyle.maxWidth,
        width: computedStyle.width,
        isResponsive: !computedStyle.width || 
                     computedStyle.width.includes('%') || 
                     computedStyle.width === 'auto' || 
                     computedStyle.maxWidth === '100%' ||
                     computedStyle.maxWidth.includes('%'),
        hasHorizontalScroll: element.scrollWidth > element.clientWidth,
        hasVerticalScroll: element.scrollHeight > element.clientHeight,
        isFlexible: computedStyle.display?.includes('flex') || 
                   computedStyle.display?.includes('grid')
      };
    };

    // Text scaling checker
    window.checkTextScaling = function() {
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label, li'))
        .filter(el => el.textContent?.trim().length > 0);
      
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
          isReadable: fontSize >= 14, // Minimum for mobile (relaxed from 16px)
          hasGoodLineHeight: lineHeight >= fontSize * 1.2,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
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
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        userAgent: navigator.userAgent
      };
      
      const metaViewport = document.querySelector('meta[name="viewport"]');
      const viewportContent = metaViewport?.getAttribute('content') || '';
      
      return {
        viewport: viewport,
        hasViewportMeta: !!metaViewport,
        viewportContent: viewportContent,
        isResponsive: viewportContent.includes('width=device-width'),
        allowsZoom: !viewportContent.includes('user-scalable=no') &&
                   !viewportContent.includes('maximum-scale=1') &&
                   !viewportContent.includes('maximum-scale=1.0'),
        initialScale: viewportContent.match(/initial-scale=([0-9.]+)/)?.[1] || '1.0',
        maximumScale: viewportContent.match(/maximum-scale=([0-9.]+)/)?.[1] || 'none',
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth
      };
    };

    // Performance helper
    window.checkMobilePerformance = function() {
      return {
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domElements: document.querySelectorAll('*').length,
        images: document.querySelectorAll('img').length,
        scripts: document.querySelectorAll('script').length,
        stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
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
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex], [onclick], summary'
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
        tabIndex: el.tabIndex,
        isDisabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
      };
    });
  });
  
  results.touchTargets = touchTargets;
  results.summary.totalTouchTargets = touchTargets.length;
  results.summary.validTouchTargets = touchTargets.filter(t => t.touchTarget.meetsMinimum || !t.isVisible).length;
  results.summary.invalidTouchTargets = touchTargets.filter(t => !t.touchTarget.meetsMinimum && t.isVisible).length;
  
  // Validate touch target sizes
  touchTargets.forEach(target => {
    if (target.isVisible && !target.touchTarget.meetsMinimum && !target.isDisabled) {
      results.violations.push({
        type: 'touch-target-too-small',
        message: `Touch target smaller than 44x44px: ${Math.round(target.touchTarget.width)}x${Math.round(target.touchTarget.height)}px`,
        element: target,
        severity: target.touchTarget.width < 24 || target.touchTarget.height < 24 ? 'serious' : 'moderate'
      });
    }
    
    // Check for overlapping touch targets
    if (target.isVisible && target.touchTarget.area > 0) {
      const nearbyTargets = touchTargets.filter(t => 
        t !== target &&
        t.isVisible && 
        Math.abs(t.touchTarget.position.x - target.touchTarget.position.x) < 44 &&
        Math.abs(t.touchTarget.position.y - target.touchTarget.position.y) < 44
      );
      
      if (nearbyTargets.length > 0 && target.touchTarget.area < 44 * 44) {
        results.violations.push({
          type: 'touch-targets-too-close',
          message: `Touch targets too close together (${nearbyTargets.length + 1} targets within 44px)`,
          element: target,
          severity: 'moderate'
        });
      }
    }
  });
}

/**
 * Test responsive behavior
 */
async function testResponsiveBehavior(page, results) {
  const responsiveElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && rect.width > 0 && rect.height > 0;
    });
    
    return elements.slice(0, 100).map(el => { // Limit to first 100 visible elements
      const responsive = window.checkResponsiveElement(el);
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        responsive: responsive,
        isContainer: ['DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'NAV'].includes(el.tagName),
        hasContent: el.children.length > 0 || el.textContent?.trim().length > 0
      };
    });
  });
  
  results.responsiveElements = responsiveElements;
  results.summary.responsiveElements = responsiveElements.filter(e => e.responsive.isResponsive).length;
  
  // Check for horizontal overflow
  const mobileInfo = await page.evaluate(() => {
    return window.checkMobileViewport();
  });
  
  if (mobileInfo.hasHorizontalOverflow) {
    results.violations.push({
      type: 'horizontal-overflow',
      message: `Page has horizontal overflow (${mobileInfo.bodyScrollWidth}px > ${mobileInfo.viewport.width}px)`,
      severity: 'serious'
    });
  }
  
  // Check for large fixed-width containers
  responsiveElements.forEach(element => {
    if (!element.responsive.isResponsive && 
        element.responsive.width > mobileInfo.viewport.width * 0.9 && 
        element.isContainer && 
        element.hasContent) {
      results.violations.push({
        type: 'large-fixed-width-container',
        message: `Large container with fixed width (${Math.round(element.responsive.width)}px) may not be mobile-friendly`,
        element: element,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Test text scaling
 */
async function testTextScaling(page, results) {
  const textElements = await page.evaluate(() => {
    return window.checkTextScaling();
  });
  
  results.textScaling = textElements;
  results.summary.textElementsAnalyzed = textElements.length;
  results.summary.readableTextElements = textElements.filter(t => t.isReadable).length;
  
  // Check for text that's too small on mobile
  textElements.forEach(element => {
    if (!element.isReadable && element.text.length > 5) { // Only flag substantial text
      results.violations.push({
        type: 'text-too-small-mobile',
        message: `Text too small for mobile (${element.fontSize}px, recommended minimum 14px)`,
        element: element,
        severity: element.fontSize < 12 ? 'serious' : 'moderate'
      });
    }
    
    if (!element.hasGoodLineHeight && element.text.length > 5) {
      results.violations.push({
        type: 'insufficient-line-height-mobile',
        message: `Insufficient line height for mobile readability (${Math.round(element.lineHeight)}px for ${element.fontSize}px text)`,
        element: element,
        severity: 'minor'
      });
    }
  });
}

/**
 * Test mobile-specific features
 */
async function testMobileFeatures(page, results) {
  const mobileInfo = await page.evaluate(() => {
    return window.checkMobileViewport();
  });
  
  const performanceInfo = await page.evaluate(() => {
    return window.checkMobilePerformance();
  });
  
  results.mobileFeatures.push({
    ...mobileInfo,
    performance: performanceInfo
  });
  
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
  
  // Check for reasonable initial scale
  const initialScale = parseFloat(mobileInfo.initialScale);
  if (initialScale && (initialScale < 0.5 || initialScale > 2.0)) {
    results.violations.push({
      type: 'inappropriate-initial-scale',
      message: `Initial scale ${initialScale} may cause usability issues`,
      severity: 'minor'
    });
  }
  
  // Check mobile performance
  if (performanceInfo.loadComplete > 5000) { // 5 seconds
    results.violations.push({
      type: 'slow-mobile-load',
      message: `Slow page load on mobile (${Math.round(performanceInfo.loadComplete)}ms)`,
      severity: 'moderate'
    });
  }
}

/**
 * Test orientation support
 */
async function testOrientationSupport(page, results) {
  const currentViewport = page.viewportSize();
  
  // Test portrait orientation
  await page.setViewportSize({ width: currentViewport.height, height: currentViewport.width });
  await page.waitForTimeout(1000); // Allow time for reflow
  
  const portraitInfo = await page.evaluate(() => {
    const mobileInfo = window.checkMobileViewport();
    return {
      orientation: 'portrait',
      hasHorizontalOverflow: mobileInfo.hasHorizontalOverflow,
      viewportWidth: mobileInfo.viewport.width,
      bodyScrollWidth: mobileInfo.bodyScrollWidth,
      ratio: mobileInfo.bodyScrollWidth / mobileInfo.viewport.width
    };
  });
  
  // Restore original orientation
  await page.setViewportSize(currentViewport);
  await page.waitForTimeout(1000);
  
  const landscapeInfo = await page.evaluate(() => {
    const mobileInfo = window.checkMobileViewport();
    return {
      orientation: 'landscape',
      hasHorizontalOverflow: mobileInfo.hasHorizontalOverflow,
      viewportWidth: mobileInfo.viewport.width,
      bodyScrollWidth: mobileInfo.bodyScrollWidth,
      ratio: mobileInfo.bodyScrollWidth / mobileInfo.viewport.width
    };
  });
  
  results.orientationSupport = [portraitInfo, landscapeInfo];
  
  // Check for orientation-specific issues
  if (portraitInfo.hasHorizontalOverflow && portraitInfo.ratio > 1.1) {
    results.violations.push({
      type: 'portrait-overflow',
      message: `Significant content overflow in portrait orientation (${Math.round(portraitInfo.ratio * 100)}% wider than viewport)`,
      severity: 'moderate'
    });
  }
  
  if (landscapeInfo.hasHorizontalOverflow && landscapeInfo.ratio > 1.1) {
    results.violations.push({
      type: 'landscape-overflow',
      message: `Significant content overflow in landscape orientation (${Math.round(landscapeInfo.ratio * 100)}% wider than viewport)`,
      severity: 'moderate'
    });
  }
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
      canScroll: !body.style.overflow?.includes('hidden') && !html.style.overflow?.includes('hidden'),
      bodyOverflow: window.getComputedStyle(body).overflow,
      htmlOverflow: window.getComputedStyle(html).overflow
    };
  });
  
  results.scrollingBehavior.push(scrollInfo);
  
  // Test actual scrolling capability
  if (scrollInfo.hasVerticalScroll) {
    try {
      const initialScroll = await page.evaluate(() => window.pageYOffset);
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(100);
      const newScroll = await page.evaluate(() => window.pageYOffset);
      
      if (newScroll === initialScroll && initialScroll === 0) {
        results.violations.push({
          type: 'scroll-disabled',
          message: 'Vertical scrolling appears to be disabled despite scrollable content',
          severity: 'serious'
        });
      }
      
      // Reset scroll position
      await page.evaluate(() => window.scrollTo(0, 0));
    } catch (error) {
      // Scroll test failed, but don't treat as critical
    }
  }
  
  // Check for problematic overflow settings
  if (scrollInfo.hasHorizontalScroll && scrollInfo.bodyOverflow === 'hidden') {
    results.violations.push({
      type: 'hidden-overflow-with-scroll',
      message: 'Content has horizontal scroll but overflow is hidden',
      severity: 'moderate'
    });
  }
}

/**
 * Run mobile accessibility testing across viewports and browsers
 */
async function runMobileAccessibilityTests(url = 'http://localhost:3000') {
  console.log('🚀 Starting Mobile Accessibility Testing...\n');
  
  const browsers = ['chromium', 'firefox', 'webkit'];
  const viewports = [
    { name: 'small-mobile', width: 320, height: 568 },      // iPhone SE
    { name: 'mobile', width: 375, height: 667 },           // iPhone 8
    { name: 'large-mobile', width: 414, height: 896 },     // iPhone 11 Pro Max
    { name: 'tablet', width: 768, height: 1024 },          // iPad
    { name: 'desktop-small', width: 1024, height: 768 },   // Small desktop
    { name: 'desktop-large', width: 1920, height: 1080 }   // Large desktop
  ];
  
  const allResults = [];
  
  for (const browserName of browsers) {
    console.log(`📱 Testing ${browserName}...`);
    
    let browser, page;
    try {
      // Launch browser
      switch (browserName) {
        case 'chromium':
          browser = await chromium.launch({ headless: true });
          break;
        case 'firefox':
          browser = await firefox.launch({ headless: true });
          break;
        case 'webkit':
          browser = await webkit.launch({ headless: true });
          break;
      }
      
      page = await browser.newPage();
      
      for (const viewport of viewports) {
        console.log(`  📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})...`);
        
        // Run tests
        const results = await testMobileAccessibility(page, browserName, viewport, url);
        allResults.push(results);
        
        // Save individual results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsPath = path.join('reports', `mobile-${viewport.name}-${browserName}-${timestamp}.json`);
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        
        console.log(`    ✅ ${viewport.name} complete - ${results.summary.violationCount} violations found`);
        console.log(`    💾 Results saved to: ${resultsPath}`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${browserName}:`, error.message);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }
  
  // Generate consolidated report
  const consolidatedResults = {
    testType: 'mobile-accessibility',
    timestamp: new Date().toISOString(),
    url: url,
    browsers: browsers,
    viewports: viewports,
    summary: {
      totalBrowsers: browsers.length,
      totalViewports: viewports.length,
      totalTests: allResults.length,
      totalViolations: allResults.reduce((sum, r) => sum + r.summary.violationCount, 0),
      totalTouchTargets: allResults.reduce((sum, r) => sum + r.summary.totalTouchTargets, 0),
      validTouchTargets: allResults.reduce((sum, r) => sum + r.summary.validTouchTargets, 0),
      invalidTouchTargets: allResults.reduce((sum, r) => sum + r.summary.invalidTouchTargets, 0),
      overallPassed: allResults.every(r => r.passed)
    },
    results: allResults
  };
  
  const consolidatedPath = path.join('reports', `mobile-accessibility-consolidated-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedResults, null, 2));
  
  console.log('\n📊 Mobile Accessibility Testing Summary:');
  console.log(`  🌐 Browsers tested: ${consolidatedResults.summary.totalBrowsers}`);
  console.log(`  📐 Viewports tested: ${consolidatedResults.summary.totalViewports}`);
  console.log(`  🎯 Total touch targets: ${consolidatedResults.summary.totalTouchTargets}`);
  console.log(`  ✅ Valid touch targets: ${consolidatedResults.summary.validTouchTargets}`);
  console.log(`  ❌ Invalid touch targets: ${consolidatedResults.summary.invalidTouchTargets}`);
  console.log(`  📝 Total violations: ${consolidatedResults.summary.totalViolations}`);
  console.log(`  ✅ Overall passed: ${consolidatedResults.summary.overallPassed ? 'Yes' : 'No'}`);
  console.log(`  💾 Consolidated report: ${consolidatedPath}`);
  
  return consolidatedResults;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  
  runMobileAccessibilityTests(url)
    .then(() => {
      console.log('\n🎉 Mobile accessibility testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Mobile accessibility testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testMobileAccessibility, runMobileAccessibilityTests }; 