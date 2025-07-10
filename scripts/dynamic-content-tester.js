/**
 * Dynamic Content Testing Script
 * Tests ARIA live regions, state changes, and dynamic content announcements
 * Usage: node scripts/dynamic-content-tester.js [url]
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const ReportStorage = require('./report-storage');

/**
 * Main dynamic content testing function
 */
async function testDynamicContent(page, browserName, url) {
  console.log(`🔄 Testing dynamic content on ${browserName} for ${url}`);
  
  const results = {
    url: url,
    browser: browserName,
    timestamp: new Date().toISOString(),
    testType: 'dynamic-content',
    liveRegions: [],
    dynamicElements: [],
    stateChanges: [],
    contentUpdates: [],
    ariaProperties: [],
    interactiveElements: [],
    violations: [],
    passed: true,
    summary: {
      totalLiveRegions: 0,
      validLiveRegions: 0,
      totalDynamicElements: 0,
      elementsWithStateTracking: 0,
      interactiveElements: 0,
      brokenAriaReferences: 0,
      contentChangesDetected: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 6
    }
  };

  try {
    // Navigate to the page first
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    // Test ARIA live regions
    console.log('  📢 Testing ARIA live regions...');
    await testAriaLiveRegions(page, results);
    
    // Test dynamic state changes
    console.log('  🔄 Testing state changes...');
    await testStateChanges(page, results);
    
    // Test content updates and announcements
    console.log('  📝 Testing content updates...');
    await testContentUpdates(page, results);
    
    // Test interactive element states
    console.log('  🎯 Testing interactive states...');
    await testInteractiveStates(page, results);
    
    // Test ARIA properties for dynamic content
    console.log('  🏷️ Testing ARIA properties...');
    await testAriaProperties(page, results);
    
    // Test focus management
    console.log('  👁️ Testing focus management...');
    await testFocusManagement(page, results);

  } catch (error) {
    results.violations.push({
      type: 'dynamic-content-test-error',
      message: `Dynamic content testing failed: ${error.message}`,
      severity: 'critical',
      element: null,
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.passedChecks = results.summary.totalChecks - (results.violations.filter(v => v.severity === 'critical').length > 0 ? 1 : 0);
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

  return results;
}

/**
 * Test ARIA live regions
 */
async function testAriaLiveRegions(page, results) {
  const liveRegions = await page.evaluate(() => {
    const liveElements = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]'));
    
    return liveElements.map(element => {
      const ariaLive = element.getAttribute('aria-live');
      const role = element.getAttribute('role');
      const ariaAtomic = element.getAttribute('aria-atomic');
      const ariaRelevant = element.getAttribute('aria-relevant');
      const ariaBusy = element.getAttribute('aria-busy');
      
      return {
        tagName: element.tagName,
        id: element.id || '',
        className: element.className || '',
        ariaLive: ariaLive,
        role: role,
        ariaAtomic: ariaAtomic,
        ariaRelevant: ariaRelevant,
        ariaBusy: ariaBusy,
        text: element.textContent?.trim() || '',
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
        hasContent: !!element.textContent?.trim(),
        isLiveRegion: !!(ariaLive || ['alert', 'status', 'log', 'marquee', 'timer'].includes(role)),
        liveType: ariaLive || (role && ['alert', 'status', 'log', 'marquee', 'timer'].includes(role) ? role : null)
      };
    });
  });
  
  results.liveRegions = liveRegions;
  results.summary.totalLiveRegions = liveRegions.length;
  results.summary.validLiveRegions = liveRegions.filter(lr => lr.isLiveRegion && lr.isVisible).length;
  
  // Validate live regions
  liveRegions.forEach(region => {
    // Check for invalid aria-live values
    if (region.ariaLive && !['off', 'polite', 'assertive'].includes(region.ariaLive)) {
      results.violations.push({
        type: 'invalid-aria-live-value',
        message: `Invalid aria-live value: "${region.ariaLive}"`,
        element: region,
        severity: 'moderate'
      });
    }
    
    // Check for empty live regions that are visible
    if (region.isVisible && region.isLiveRegion && !region.hasContent) {
      results.violations.push({
        type: 'empty-live-region',
        message: `Empty live region may not provide useful announcements`,
        element: region,
        severity: 'minor'
      });
    }
    
    // Check for conflicting live region settings
    if (region.ariaLive === 'off' && ['alert', 'status'].includes(region.role)) {
      results.violations.push({
        type: 'conflicting-live-region-settings',
        message: `Live region role "${region.role}" conflicts with aria-live="off"`,
        element: region,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`    📊 Live regions: ${liveRegions.length} found, ${results.summary.validLiveRegions} valid`);
}

/**
 * Test dynamic state changes
 */
async function testStateChanges(page, results) {
  const stateElements = await page.evaluate(() => {
    const interactiveElements = Array.from(document.querySelectorAll(
      'button, [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [aria-expanded], [aria-pressed], [aria-checked]'
    ));
    
    return interactiveElements.map(element => {
      const ariaExpanded = element.getAttribute('aria-expanded');
      const ariaChecked = element.getAttribute('aria-checked');
      const ariaSelected = element.getAttribute('aria-selected');
      const ariaPressed = element.getAttribute('aria-pressed');
      const ariaHidden = element.getAttribute('aria-hidden');
      const ariaDisabled = element.getAttribute('aria-disabled');
      const disabled = element.disabled;
      
      return {
        tagName: element.tagName,
        id: element.id || '',
        className: element.className || '',
        ariaExpanded: ariaExpanded,
        ariaChecked: ariaChecked,
        ariaSelected: ariaSelected,
        ariaPressed: ariaPressed,
        ariaHidden: ariaHidden,
        ariaDisabled: ariaDisabled,
        disabled: disabled,
        text: element.textContent?.trim().substring(0, 50) || '',
        hasStateAttributes: !!(ariaExpanded || ariaChecked || ariaSelected || ariaPressed),
        isInteractive: element.tagName === 'BUTTON' || 
                      element.tagName === 'A' ||
                      element.tagName === 'INPUT' ||
                      element.getAttribute('role') === 'button' ||
                      element.hasAttribute('onclick') ||
                      element.tabIndex >= 0,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
      };
    });
  });
  
  results.stateChanges = stateElements;
  results.summary.elementsWithStateTracking = stateElements.filter(el => el.hasStateAttributes).length;
  results.summary.interactiveElements = stateElements.filter(el => el.isInteractive).length;
  
  // Validate state attributes
  stateElements.forEach(element => {
    // Check for invalid state values
    if (element.ariaExpanded && !['true', 'false'].includes(element.ariaExpanded)) {
      results.violations.push({
        type: 'invalid-aria-expanded-value',
        message: `Invalid aria-expanded value: "${element.ariaExpanded}"`,
        element: element,
        severity: 'moderate'
      });
    }
    
    if (element.ariaPressed && !['true', 'false', 'mixed'].includes(element.ariaPressed)) {
      results.violations.push({
        type: 'invalid-aria-pressed-value',
        message: `Invalid aria-pressed value: "${element.ariaPressed}"`,
        element: element,
        severity: 'moderate'
      });
    }
    
    if (element.ariaChecked && !['true', 'false', 'mixed'].includes(element.ariaChecked)) {
      results.violations.push({
        type: 'invalid-aria-checked-value',
        message: `Invalid aria-checked value: "${element.ariaChecked}"`,
        element: element,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`    📊 Interactive elements: ${stateElements.length} found, ${results.summary.elementsWithStateTracking} with state tracking`);
}

/**
 * Test content updates and announcements
 */
async function testContentUpdates(page, results) {
  // Set up content change monitoring
  await page.evaluate(() => {
    window.contentChanges = [];
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              window.contentChanges.push({
                type: 'added',
                element: node.tagName,
                id: node.id || '',
                className: node.className || '',
                text: node.textContent?.trim().substring(0, 50) || '',
                timestamp: Date.now()
              });
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              window.contentChanges.push({
                type: 'removed',
                element: node.tagName,
                id: node.id || '',
                className: node.className || '',
                timestamp: Date.now()
              });
            }
          });
        } else if (mutation.type === 'attributes') {
          window.contentChanges.push({
            type: 'attribute',
            element: mutation.target.tagName,
            id: mutation.target.id || '',
            attribute: mutation.attributeName,
            oldValue: mutation.oldValue,
            newValue: mutation.target.getAttribute(mutation.attributeName),
            timestamp: Date.now()
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true
    });

    window.changeObserver = observer;
  });
  
  // Wait for initial page activity to settle
  await page.waitForTimeout(1000);
  
  // Clear initial changes
  await page.evaluate(() => {
    window.contentChanges = [];
  });
  
  // Simulate some interactions to trigger potential dynamic content
  try {
    const clickableElements = await page.locator('button, [role="button"], [aria-expanded], .nav-tab').all();
    
    for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
      const element = clickableElements[i];
      
      try {
        await element.click();
        await page.waitForTimeout(500);
      } catch (error) {
        // Element might not be clickable, continue
      }
    }
  } catch (error) {
    // If no clickable elements, continue
  }
  
  // Get content changes
  const contentChanges = await page.evaluate(() => {
    const changes = window.contentChanges || [];
    if (window.changeObserver) {
      window.changeObserver.disconnect();
    }
    return changes;
  });
  
  results.contentUpdates = contentChanges;
  results.summary.contentChangesDetected = contentChanges.length;
  
  // Analyze content changes for accessibility implications
  contentChanges.forEach(change => {
    // Check for content additions without announcements
    if (change.type === 'added' && change.element && !change.className.includes('sr-only')) {
      const hasNearbyLiveRegion = results.liveRegions.some(lr => lr.isVisible && lr.isLiveRegion);
      
      if (!hasNearbyLiveRegion) {
        results.violations.push({
          type: 'dynamic-content-no-announcement',
          message: `Dynamic content added without live region for announcements`,
          element: change,
          severity: 'moderate'
        });
      }
    }
  });
  
  console.log(`    📊 Content changes: ${contentChanges.length} detected`);
}

/**
 * Test interactive element states
 */
async function testInteractiveStates(page, results) {
  const focusableElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"]'))
      .filter(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0);
    
    return elements.slice(0, 5).map(el => ({
      tagName: el.tagName,
      id: el.id || '',
      className: el.className || '',
      tabIndex: el.tabIndex,
      role: el.getAttribute('role') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      text: el.textContent?.trim().substring(0, 30) || ''
    }));
  });
  
  results.interactiveElements = focusableElements;
  
  console.log(`    📊 Interactive elements: ${focusableElements.length} found`);
}

/**
 * Test ARIA properties for dynamic content
 */
async function testAriaProperties(page, results) {
  const ariaProperties = await page.evaluate(() => {
    const elementsWithAria = Array.from(document.querySelectorAll('[aria-describedby], [aria-labelledby], [aria-controls], [aria-owns]'));
    
    return elementsWithAria.map(element => {
      const describedBy = element.getAttribute('aria-describedby');
      const labelledBy = element.getAttribute('aria-labelledby');
      const controls = element.getAttribute('aria-controls');
      const owns = element.getAttribute('aria-owns');
      
      const checkIds = (attrValue, attrName) => {
        if (!attrValue) return { valid: true, missingIds: [] };
        
        const ids = attrValue.split(/\s+/);
        const missingIds = ids.filter(id => !document.getElementById(id));
        
        return {
          valid: missingIds.length === 0,
          missingIds: missingIds,
          attribute: attrName
        };
      };
      
      return {
        tagName: element.tagName,
        id: element.id || '',
        className: element.className || '',
        describedBy: checkIds(describedBy, 'aria-describedby'),
        labelledBy: checkIds(labelledBy, 'aria-labelledby'),
        controls: checkIds(controls, 'aria-controls'),
        owns: checkIds(owns, 'aria-owns'),
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
      };
    });
  });
  
  results.ariaProperties = ariaProperties;
  
  // Validate ARIA property references
  let brokenReferences = 0;
  ariaProperties.forEach(element => {
    ['describedBy', 'labelledBy', 'controls', 'owns'].forEach(prop => {
      const propData = element[prop];
      if (propData && !propData.valid) {
        results.violations.push({
          type: 'broken-aria-reference',
          message: `${propData.attribute} references missing elements: ${propData.missingIds.join(', ')}`,
          element: element,
          severity: 'serious'
        });
        brokenReferences++;
      }
    });
  });
  
  results.summary.brokenAriaReferences = brokenReferences;
  console.log(`    📊 ARIA properties: ${ariaProperties.length} elements analyzed, ${brokenReferences} broken references`);
}

/**
 * Test focus management
 */
async function testFocusManagement(page, results) {
  // Test focus states on interactive elements
  const focusableElements = results.interactiveElements || [];
  
  for (const elementInfo of focusableElements.slice(0, 3)) {
    try {
      const selector = elementInfo.id ? `#${elementInfo.id}` : 
                      elementInfo.className ? `.${elementInfo.className.split(' ')[0]}` :
                      elementInfo.tagName.toLowerCase();
      
      const element = page.locator(selector).first();
      
      await element.focus();
      await page.waitForTimeout(100);
      
      const hasFocus = await element.evaluate(el => el === document.activeElement);
      
      if (!hasFocus) {
        results.violations.push({
          type: 'element-not-focusable',
          message: `Interactive element cannot receive focus`,
          element: elementInfo,
          severity: 'serious'
        });
      }
      
    } catch (error) {
      results.violations.push({
        type: 'element-interaction-error',
        message: `Cannot interact with element: ${error.message}`,
        element: elementInfo,
        severity: 'moderate'
      });
    }
  }
  
  console.log(`    📊 Focus management: tested ${Math.min(focusableElements.length, 3)} elements`);
}

/**
 * Run dynamic content tests across multiple browsers
 */
async function runDynamicContentTests(url = 'http://localhost:3000') {
  console.log('🚀 Starting Dynamic Content Testing Suite');
  console.log(`🌐 Testing URL: ${url}`);
  
  const browsers = [
    { name: 'chromium', launcher: chromium },
    { name: 'firefox', launcher: firefox },
    { name: 'webkit', launcher: webkit }
  ];
  
  const allResults = [];
  
  for (const browser of browsers) {
    console.log(`\n🔍 Testing with ${browser.name}...`);
    
    let browserInstance = null;
    try {
      browserInstance = await browser.launcher.launch({ headless: true });
      const page = await browserInstance.newPage();
      
      const results = await testDynamicContent(page, browser.name, url);
      allResults.push(results);
      
      // Save individual browser results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `dynamic-content-${browser.name}-${timestamp}.json`;
      
      // Save using ReportStorage
      const storage = new ReportStorage();
      fs.writeFileSync(`reports/${filename}`, JSON.stringify(results, null, 2));
      
      console.log(`✅ ${browser.name} testing completed`);
      console.log(`📊 Summary: ${results.summary.totalLiveRegions} live regions, ${results.summary.interactiveElements} interactive elements, ${results.summary.violationCount} violations`);
      
    } catch (error) {
      console.error(`❌ Error testing with ${browser.name}:`, error.message);
    } finally {
      if (browserInstance) {
        await browserInstance.close();
      }
    }
  }
  
  // Generate consolidated report
  const consolidatedResults = {
    testType: 'dynamic-content-consolidated',
    url: url,
    timestamp: new Date().toISOString(),
    browsers: allResults,
    summary: {
      totalBrowsers: allResults.length,
      passedBrowsers: allResults.filter(r => r.passed).length,
      totalViolations: allResults.reduce((sum, r) => sum + r.summary.violationCount, 0),
      avgLiveRegions: Math.round(allResults.reduce((sum, r) => sum + r.summary.totalLiveRegions, 0) / allResults.length),
      avgInteractiveElements: Math.round(allResults.reduce((sum, r) => sum + r.summary.interactiveElements, 0) / allResults.length)
    }
  };
  
  const consolidatedTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const consolidatedFilename = `dynamic-content-consolidated-${consolidatedTimestamp}.json`;
  fs.writeFileSync(`reports/${consolidatedFilename}`, JSON.stringify(consolidatedResults, null, 2));
  
  console.log('\n🏁 Dynamic Content Testing Complete!');
  console.log(`📋 Consolidated Report: reports/${consolidatedFilename}`);
  console.log(`📊 Overall Summary: ${consolidatedResults.summary.passedBrowsers}/${consolidatedResults.summary.totalBrowsers} browsers passed, ${consolidatedResults.summary.totalViolations} total violations`);
  
  return consolidatedResults;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  runDynamicContentTests(url).catch(console.error);
}

module.exports = { testDynamicContent, runDynamicContentTests }; 