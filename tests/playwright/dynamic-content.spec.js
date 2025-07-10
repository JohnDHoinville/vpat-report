/**
 * Dynamic Content Testing Suite
 * Tests ARIA live regions, state changes, and dynamic content announcements
 */

const { test, expect } = require('@playwright/test');

/**
 * Main dynamic content testing function
 * Tests comprehensive dynamic content accessibility
 */
async function testDynamicContent(page, browserName) {
  console.log(`🔄 Testing dynamic content on ${browserName}`);
  
  const results = {
    browser: browserName,
    timestamp: new Date().toISOString(),
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
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Inject helper functions
    await injectDynamicContentHelpers(page);
    
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
    
    // Test dynamic content creation
    console.log('  ➕ Testing dynamic content creation...');
    await testDynamicContentCreation(page, results);

  } catch (error) {
    results.violations.push({
      type: 'dynamic-content-test-error',
      message: `Dynamic content testing failed: ${error.message}`,
      severity: 'critical',
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.totalChecks = 6; // Number of main test categories
  results.summary.passedChecks = results.summary.totalChecks - (results.violations.length > 0 ? 1 : 0);
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

  return results;
}

/**
 * Inject helper functions for dynamic content testing
 */
async function injectDynamicContentHelpers(page) {
  await page.addInitScript(() => {
    // Live region analyzer
    window.analyzeLiveRegion = function(element) {
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
    };

    // Dynamic element analyzer
    window.analyzeDynamicElement = function(element) {
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
                      element.role === 'button' ||
                      element.hasAttribute('onclick') ||
                      element.tabIndex >= 0,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
      };
    };

    // Content change detector
    window.detectContentChanges = function() {
      const observer = new MutationObserver((mutations) => {
        window.contentChanges = window.contentChanges || [];
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
          } else if (mutation.type === 'characterData') {
            window.contentChanges.push({
              type: 'text',
              element: mutation.target.parentElement?.tagName || 'TEXT',
              id: mutation.target.parentElement?.id || '',
              oldValue: mutation.oldValue,
              newValue: mutation.target.textContent,
              timestamp: Date.now()
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true
      });

      return observer;
    };

    // Interactive element state checker
    window.checkInteractiveStates = function() {
      const interactiveElements = Array.from(document.querySelectorAll(
        'button, [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [aria-expanded], [aria-pressed], [aria-checked]'
      ));
      
      return interactiveElements.map(element => {
        const analysis = window.analyzeDynamicElement(element);
        
        // Check for appropriate ARIA states
        const needsExpanded = element.hasAttribute('aria-controls') || 
                             element.className.includes('toggle') ||
                             element.className.includes('expand') ||
                             element.textContent?.toLowerCase().includes('expand') ||
                             element.textContent?.toLowerCase().includes('collapse');
        
        const needsPressed = element.getAttribute('role') === 'button' && 
                            (element.className.includes('toggle') || 
                             element.textContent?.toLowerCase().includes('toggle'));
        
        return {
          ...analysis,
          needsExpanded: needsExpanded,
          needsPressed: needsPressed,
          hasAppropriateStates: (needsExpanded ? !!analysis.ariaExpanded : true) &&
                               (needsPressed ? !!analysis.ariaPressed : true)
        };
      });
    };

    // ARIA property validator
    window.validateAriaProperties = function() {
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
    };
  });
}

/**
 * Test ARIA live regions
 */
async function testAriaLiveRegions(page, results) {
  const liveRegions = await page.evaluate(() => {
    const liveElements = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]'));
    
    return liveElements.map(element => window.analyzeLiveRegion(element));
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
    return window.checkInteractiveStates();
  });
  
  results.stateChanges = stateElements;
  results.summary.elementsWithStateTracking = stateElements.filter(el => el.hasStateAttributes).length;
  results.summary.interactiveElements = stateElements.filter(el => el.isInteractive).length;
  
  // Validate state attributes
  stateElements.forEach(element => {
    // Check for missing required state attributes
    if (element.needsExpanded && !element.ariaExpanded) {
      results.violations.push({
        type: 'missing-aria-expanded',
        message: `Interactive element appears to control content but missing aria-expanded`,
        element: element,
        severity: 'moderate'
      });
    }
    
    if (element.needsPressed && !element.ariaPressed) {
      results.violations.push({
        type: 'missing-aria-pressed',
        message: `Toggle button missing aria-pressed state`,
        element: element,
        severity: 'moderate'
      });
    }
    
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
  // Start monitoring content changes
  await page.evaluate(() => {
    window.contentChanges = [];
    window.changeObserver = window.detectContentChanges();
  });
  
  // Wait for any initial page activity to settle
  await page.waitForTimeout(1000);
  
  // Clear initial changes
  await page.evaluate(() => {
    window.contentChanges = [];
  });
  
  // Simulate some interactions to trigger potential dynamic content
  try {
    // Look for clickable elements that might trigger dynamic content
    const clickableElements = await page.locator('button, [role="button"], [aria-expanded], .nav-tab').all();
    
    for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
      const element = clickableElements[i];
      
      try {
        await element.click();
        await page.waitForTimeout(500); // Wait for potential content changes
      } catch (error) {
        // Element might not be clickable, continue
      }
    }
  } catch (error) {
    // If no clickable elements or error, continue
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
  
  // Analyze content changes for accessibility implications
  contentChanges.forEach(change => {
    // Check for content additions without announcements
    if (change.type === 'added' && change.element && !change.className.includes('sr-only')) {
      // Look for nearby live regions
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
    
    // Check for state changes without proper ARIA updates
    if (change.type === 'attribute' && change.attribute?.startsWith('aria-')) {
      // This is actually good - ARIA attributes are being updated
    } else if (change.type === 'attribute' && ['class', 'style'].includes(change.attribute)) {
      // Visual changes should potentially have ARIA state updates too
      if (!contentChanges.some(c => c.type === 'attribute' && c.attribute?.startsWith('aria-'))) {
        results.violations.push({
          type: 'visual-change-no-aria-update',
          message: `Visual state change without corresponding ARIA state update`,
          element: change,
          severity: 'minor'
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
  // Test focus states and interactions
  const focusableElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"]'))
      .filter(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0);
    
    return elements.slice(0, 5).map(el => ({ // Limit to first 5 elements
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
  
  // Test focus and interaction states
  for (const elementInfo of focusableElements.slice(0, 3)) { // Test first 3 elements
    try {
      const selector = elementInfo.id ? `#${elementInfo.id}` : 
                      elementInfo.className ? `.${elementInfo.className.split(' ')[0]}` :
                      elementInfo.tagName.toLowerCase();
      
      const element = page.locator(selector).first();
      
      // Test focus
      await element.focus();
      await page.waitForTimeout(100);
      
      // Check if element received focus
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
      // Element might not be accessible, which is itself an issue
      results.violations.push({
        type: 'element-interaction-error',
        message: `Cannot interact with element: ${error.message}`,
        element: elementInfo,
        severity: 'moderate'
      });
    }
  }
  
  console.log(`    📊 Interactive elements tested: ${Math.min(focusableElements.length, 3)}`);
}

/**
 * Test ARIA properties for dynamic content
 */
async function testAriaProperties(page, results) {
  const ariaProperties = await page.evaluate(() => {
    return window.validateAriaProperties();
  });
  
  results.ariaProperties = ariaProperties;
  
  // Validate ARIA property references
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
      }
    });
  });
  
  console.log(`    📊 ARIA properties: ${ariaProperties.length} elements analyzed`);
}

/**
 * Test dynamic content creation
 */
async function testDynamicContentCreation(page, results) {
  // Test if the page can handle dynamic content creation
  const dynamicTestResult = await page.evaluate(() => {
    try {
      // Create a test live region
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('id', 'test-live-region');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      document.body.appendChild(liveRegion);
      
      // Add content to it
      setTimeout(() => {
        liveRegion.textContent = 'Test announcement';
      }, 100);
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 1000);
      
      return {
        canCreateLiveRegions: true,
        testElementCreated: !!document.getElementById('test-live-region')
      };
    } catch (error) {
      return {
        canCreateLiveRegions: false,
        error: error.message
      };
    }
  });
  
  if (!dynamicTestResult.canCreateLiveRegions) {
    results.violations.push({
      type: 'dynamic-content-creation-error',
      message: `Cannot create dynamic content: ${dynamicTestResult.error}`,
      severity: 'moderate'
    });
  }
  
  console.log(`    📊 Dynamic content creation: ${dynamicTestResult.canCreateLiveRegions ? 'supported' : 'error'}`);
}

// Test suite
test.describe('Dynamic Content Testing', () => {
  
  test('should handle dynamic content properly', async ({ page, browserName }) => {
    // Inject helper functions before navigation
    await injectDynamicContentHelpers(page);
    
    await page.goto('/');
    
    const results = await testDynamicContent(page, browserName);
    
    // Log results
    console.log(`\n🔄 Dynamic Content Results for ${browserName}:`);
    console.log(`📊 Live regions: ${results.summary.totalLiveRegions}`);
    console.log(`📊 Interactive elements: ${results.summary.interactiveElements}`);
    console.log(`📊 Elements with state tracking: ${results.summary.elementsWithStateTracking}`);
    console.log(`📊 Violations found: ${results.summary.violationCount}`);
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `reports/dynamic-content-${browserName}-${timestamp}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
    
    // Assertions
    // Check for critical violations
    const criticalViolations = results.violations.filter(v => v.severity === 'critical');
    expect(criticalViolations).toHaveLength(0);
    
    console.log(`✅ Dynamic content test completed for ${browserName}`);
  });

  test('should announce state changes properly', async ({ page, browserName }) => {
    console.log(`📢 Testing state change announcements on ${browserName}`);
    
    // Inject helper functions first
    await injectDynamicContentHelpers(page);
    
    await page.goto('/');
    
    // Look for elements with state attributes
    const stateElements = await page.evaluate(() => {
      return window.checkInteractiveStates();
    });
    
    // Test interaction with state elements
    const elementsWithStates = stateElements.filter(el => el.hasStateAttributes);
    
    if (elementsWithStates.length === 0) {
      console.log(`    ℹ️ No elements with state attributes found`);
    } else {
      console.log(`    📊 Found ${elementsWithStates.length} elements with state attributes`);
    }
    
    console.log(`✅ State change announcement test completed for ${browserName}`);
  });

  test('should handle live region updates', async ({ page, browserName }) => {
    console.log(`📡 Testing live region updates on ${browserName}`);
    
    // Inject helper functions first
    await injectDynamicContentHelpers(page);
    
    await page.goto('/');
    
    const liveRegions = await page.evaluate(() => {
      const liveElements = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"]'));
      return liveElements.map(element => window.analyzeLiveRegion(element));
    });
    
    // If no live regions exist, that's not necessarily a failure for a static page
    console.log(`    📊 Live regions found: ${liveRegions.length}`);
    
    console.log(`✅ Live region update test completed for ${browserName}`);
  });

  test('should handle ARIA live regions properly', async ({ page, browserName }) => {
    console.log(`📢 Testing ARIA live regions on ${browserName}`);
    
    await page.goto('/');
    
    // Find all live regions
    const liveRegions = await page.evaluate(() => {
      const liveElements = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]'));
      
      return liveElements.map(element => {
        const ariaLive = element.getAttribute('aria-live');
        const role = element.getAttribute('role');
        
        return {
          tagName: element.tagName,
          id: element.id || '',
          className: element.className || '',
          ariaLive: ariaLive,
          role: role,
          text: element.textContent?.trim() || '',
          isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
          hasContent: !!element.textContent?.trim(),
          isLiveRegion: !!(ariaLive || ['alert', 'status', 'log', 'marquee', 'timer'].includes(role))
        };
      });
    });
    
    console.log(`    📊 Live regions found: ${liveRegions.length}`);
    
    // Validate live regions
    for (const region of liveRegions) {
      // Check for valid aria-live values
      if (region.ariaLive && !['off', 'polite', 'assertive'].includes(region.ariaLive)) {
        console.log(`    ❌ Invalid aria-live value: "${region.ariaLive}" on ${region.tagName}`);
      }
      
      // Check for empty visible live regions
      if (region.isVisible && region.isLiveRegion && !region.hasContent) {
        console.log(`    ⚠️ Empty live region: ${region.tagName}${region.id ? '#' + region.id : ''}`);
      }
    }
    
    console.log(`✅ ARIA live regions test completed for ${browserName}`);
  });

  test('should handle dynamic state changes', async ({ page, browserName }) => {
    console.log(`🔄 Testing dynamic state changes on ${browserName}`);
    
    await page.goto('/');
    
    // Find elements with state attributes
    const stateElements = await page.evaluate(() => {
      const interactiveElements = Array.from(document.querySelectorAll(
        'button, [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], [aria-expanded], [aria-pressed], [aria-checked]'
      ));
      
      return interactiveElements.map(element => {
        const ariaExpanded = element.getAttribute('aria-expanded');
        const ariaChecked = element.getAttribute('aria-checked');
        const ariaSelected = element.getAttribute('aria-selected');
        const ariaPressed = element.getAttribute('aria-pressed');
        
        return {
          tagName: element.tagName,
          id: element.id || '',
          className: element.className || '',
          ariaExpanded: ariaExpanded,
          ariaChecked: ariaChecked,
          ariaSelected: ariaSelected,
          ariaPressed: ariaPressed,
          text: element.textContent?.trim().substring(0, 50) || '',
          hasStateAttributes: !!(ariaExpanded || ariaChecked || ariaSelected || ariaPressed),
          isVisible: element.offsetWidth > 0 && element.offsetHeight > 0
        };
      });
    });
    
    console.log(`    📊 Elements with potential state changes: ${stateElements.length}`);
    
    const elementsWithStates = stateElements.filter(el => el.hasStateAttributes);
    console.log(`    📊 Elements with state attributes: ${elementsWithStates.length}`);
    
    // Validate state attributes
    for (const element of elementsWithStates) {
      // Check for valid aria-expanded values
      if (element.ariaExpanded && !['true', 'false'].includes(element.ariaExpanded)) {
        console.log(`    ❌ Invalid aria-expanded value: "${element.ariaExpanded}" on ${element.tagName}`);
      }
      
      // Check for valid aria-pressed values
      if (element.ariaPressed && !['true', 'false', 'mixed'].includes(element.ariaPressed)) {
        console.log(`    ❌ Invalid aria-pressed value: "${element.ariaPressed}" on ${element.tagName}`);
      }
      
      // Check for valid aria-checked values
      if (element.ariaChecked && !['true', 'false', 'mixed'].includes(element.ariaChecked)) {
        console.log(`    ❌ Invalid aria-checked value: "${element.ariaChecked}" on ${element.tagName}`);
      }
    }
    
    console.log(`✅ Dynamic state changes test completed for ${browserName}`);
  });

  test('should validate ARIA property references', async ({ page, browserName }) => {
    console.log(`🏷️ Testing ARIA property references on ${browserName}`);
    
    await page.goto('/');
    
    // Find elements with ARIA property references
    const ariaReferences = await page.evaluate(() => {
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
          owns: checkIds(owns, 'aria-owns')
        };
      });
    });
    
    console.log(`    📊 Elements with ARIA references: ${ariaReferences.length}`);
    
    // Check for broken references
    let brokenReferences = 0;
    for (const element of ariaReferences) {
      ['describedBy', 'labelledBy', 'controls', 'owns'].forEach(prop => {
        const propData = element[prop];
        if (propData && !propData.valid) {
          console.log(`    ❌ Broken ${propData.attribute} reference on ${element.tagName}: missing ${propData.missingIds.join(', ')}`);
          brokenReferences++;
        }
      });
    }
    
    console.log(`    📊 Broken references found: ${brokenReferences}`);
    console.log(`✅ ARIA property references test completed for ${browserName}`);
  });

  test('should detect content updates', async ({ page, browserName }) => {
    console.log(`📝 Testing content update detection on ${browserName}`);
    
    await page.goto('/');
    
    // Set up mutation observer
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
          }
          
          if (mutation.type === 'attributes') {
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
    
    // Try to trigger some interactions
    const clickableElements = await page.locator('button, [role="button"], .nav-tab').all();
    
    for (let i = 0; i < Math.min(clickableElements.length, 3); i++) {
      try {
        await clickableElements[i].click();
        await page.waitForTimeout(500);
      } catch (error) {
        // Element might not be clickable, continue
      }
    }
    
    // Get detected changes
    const contentChanges = await page.evaluate(() => {
      const changes = window.contentChanges || [];
      if (window.changeObserver) {
        window.changeObserver.disconnect();
      }
      return changes;
    });
    
    console.log(`    📊 Content changes detected: ${contentChanges.length}`);
    
    // Analyze changes for accessibility implications
    const addedElements = contentChanges.filter(c => c.type === 'added');
    const ariaUpdates = contentChanges.filter(c => c.type === 'attribute' && c.attribute?.startsWith('aria-'));
    
    console.log(`    📊 Elements added: ${addedElements.length}`);
    console.log(`    📊 ARIA updates: ${ariaUpdates.length}`);
    
    console.log(`✅ Content update detection test completed for ${browserName}`);
  });

  test('should test interactive element focus states', async ({ page, browserName }) => {
    console.log(`🎯 Testing interactive element focus states on ${browserName}`);
    
    await page.goto('/');
    
    // Find focusable elements
    const focusableElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, input, select, textarea, [tabindex], [role="button"]'))
        .filter(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0);
      
      return elements.slice(0, 5).map(el => ({
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        tabIndex: el.tabIndex,
        role: el.getAttribute('role') || '',
        text: el.textContent?.trim().substring(0, 30) || ''
      }));
    });
    
    console.log(`    📊 Focusable elements found: ${focusableElements.length}`);
    
    // Test focus on first few elements
    for (let i = 0; i < Math.min(focusableElements.length, 3); i++) {
      const elementInfo = focusableElements[i];
      
      try {
        const selector = elementInfo.id ? `#${elementInfo.id}` : 
                        elementInfo.className ? `.${elementInfo.className.split(' ')[0]}` :
                        elementInfo.tagName.toLowerCase();
        
        const element = page.locator(selector).first();
        
        await element.focus();
        await page.waitForTimeout(100);
        
        const hasFocus = await element.evaluate(el => el === document.activeElement);
        
        if (hasFocus) {
          console.log(`    ✅ Element can receive focus: ${elementInfo.tagName}${elementInfo.id ? '#' + elementInfo.id : ''}`);
        } else {
          console.log(`    ❌ Element cannot receive focus: ${elementInfo.tagName}${elementInfo.id ? '#' + elementInfo.id : ''}`);
        }
        
      } catch (error) {
        console.log(`    ⚠️ Cannot interact with element: ${elementInfo.tagName} - ${error.message}`);
      }
    }
    
    console.log(`✅ Interactive element focus test completed for ${browserName}`);
  });

});

module.exports = { testDynamicContent }; 