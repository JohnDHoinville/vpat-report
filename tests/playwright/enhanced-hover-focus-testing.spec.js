/**
 * Enhanced Hover and Focus Content Testing Suite
 * Implements real automated testing for WCAG 1.4.13 and related criteria
 * Tests hover/focus triggered content for dismissibility, persistence, and appropriate behavior
 */

const { test, expect } = require('@playwright/test');

/**
 * Main hover/focus content testing function
 * Tests comprehensive WCAG 1.4.13 compliance with automated detection
 */
async function testHoverFocusContent(page, browserName) {
  console.log(`🎯 Testing hover/focus content compliance on ${browserName}`);
  
  const results = {
    browser: browserName,
    timestamp: new Date().toISOString(),
    hoverElements: [],
    focusElements: [],
    tooltips: [],
    dropdowns: [],
    expandedContent: [],
    violations: [],
    passed: true,
    summary: {
      totalHoverTriggers: 0,
      totalFocusTriggers: 0,
      compliantElements: 0,
      violatingElements: 0,
      dismissibleContent: 0,
      persistentContent: 0,
      violationCount: 0
    }
  };

  try {
    // Inject hover/focus content detection helpers
    await injectHoverFocusHelpers(page);
    
    // Test hover-triggered content
    console.log('  🖱️ Testing hover-triggered content...');
    await testHoverTriggeredContent(page, results);
    
    // Test focus-triggered content
    console.log('  🎯 Testing focus-triggered content...');
    await testFocusTriggeredContent(page, results);
    
    // Test dismissibility with Escape key
    console.log('  ⌨️ Testing Escape key dismissibility...');
    await testEscapeDismissibility(page, results);
    
    // Test content persistence when hovering over content
    console.log('  📌 Testing content persistence...');
    await testContentPersistence(page, results);
    
    // Test tooltip and dropdown behaviors
    console.log('  💬 Testing tooltip behaviors...');
    await testTooltipBehaviors(page, results);
    
    // Test dynamic content creation/removal
    console.log('  🔄 Testing dynamic content handling...');
    await testDynamicContentHandling(page, results);

  } catch (error) {
    results.violations.push({
      type: 'hover-focus-test-error',
      message: `Hover/focus testing failed: ${error.message}`,
      severity: 'critical',
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.compliantElements = results.hoverElements.filter(el => el.isCompliant).length + 
                                     results.focusElements.filter(el => el.isCompliant).length;
  results.summary.violatingElements = results.hoverElements.filter(el => !el.isCompliant).length + 
                                     results.focusElements.filter(el => !el.isCompliant).length;
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

  return results;
}

/**
 * Inject helper functions for hover/focus content testing
 */
async function injectHoverFocusHelpers(page) {
  await page.addInitScript(() => {
    // CSS hover content detector
    window.detectHoverContent = function() {
      const elements = Array.from(document.querySelectorAll('*'));
      const hoverElements = [];
      
      elements.forEach(el => {
        const computedStyle = window.getComputedStyle(el);
        const hasHoverPseudo = el.matches(':hover') || 
                              el.querySelector(':hover') ||
                              computedStyle.getPropertyValue('--hover-content') ||
                              el.hasAttribute('title');
        
        if (hasHoverPseudo || el.hasAttribute('title')) {
          hoverElements.push({
            element: el,
            tagName: el.tagName,
            id: el.id || '',
            className: el.className || '',
            hasTitle: el.hasAttribute('title'),
            titleText: el.getAttribute('title') || '',
            hasAriaDescribedBy: el.hasAttribute('aria-describedby'),
            ariaDescribedBy: el.getAttribute('aria-describedby') || '',
            hasDataTooltip: el.hasAttribute('data-tooltip') || el.hasAttribute('data-title'),
            rect: el.getBoundingClientRect()
          });
        }
      });
      
      return hoverElements;
    };
    
    // Focus content detector
    window.detectFocusContent = function() {
      const focusableElements = Array.from(document.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"]'
      ));
      
      return focusableElements.map(el => {
        return {
          element: el,
          tagName: el.tagName,
          id: el.id || '',
          className: el.className || '',
          type: el.type || '',
          role: el.getAttribute('role') || '',
          hasAriaExpanded: el.hasAttribute('aria-expanded'),
          ariaExpanded: el.getAttribute('aria-expanded') || '',
          hasAriaHaspopup: el.hasAttribute('aria-haspopup'),
          ariaHaspopup: el.getAttribute('aria-haspopup') || '',
          hasDescribedBy: el.hasAttribute('aria-describedby'),
          describedBy: el.getAttribute('aria-describedby') || '',
          rect: el.getBoundingClientRect(),
          isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
        };
      });
    };
    
    // Content change detector
    window.detectContentChanges = function(targetElement, callback) {
      const observer = new MutationObserver(callback);
      observer.observe(targetElement || document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-expanded', 'aria-hidden', 'class', 'style']
      });
      return observer;
    };
    
    // Test hover behavior
    window.testElementHover = async function(element) {
      const originalContent = document.body.innerHTML;
      
      // Create mouse events
      const mouseEnter = new MouseEvent('mouseenter', { bubbles: true });
      const mouseOver = new MouseEvent('mouseover', { bubbles: true });
      
      // Track changes
      let contentChanged = false;
      const observer = window.detectContentChanges(document.body, () => {
        contentChanged = true;
      });
      
      // Trigger hover
      element.dispatchEvent(mouseEnter);
      element.dispatchEvent(mouseOver);
      
      // Wait for potential changes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      observer.disconnect();
      
      return {
        element: element,
        contentChanged: contentChanged,
        hasNewContent: document.body.innerHTML !== originalContent
      };
    };
    
    // Test focus behavior
    window.testElementFocus = async function(element) {
      const originalContent = document.body.innerHTML;
      const originalAriaExpanded = element.getAttribute('aria-expanded');
      
      // Track changes
      let contentChanged = false;
      let ariaChanged = false;
      const observer = window.detectContentChanges(document.body, (mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            contentChanged = true;
          }
          if (mutation.type === 'attributes' && mutation.attributeName === 'aria-expanded') {
            ariaChanged = true;
          }
        });
      });
      
      // Trigger focus
      element.focus();
      
      // Wait for potential changes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      observer.disconnect();
      
      return {
        element: element,
        contentChanged: contentChanged,
        ariaChanged: ariaChanged,
        ariaExpanded: element.getAttribute('aria-expanded'),
        ariaExpandedChanged: element.getAttribute('aria-expanded') !== originalAriaExpanded,
        hasNewContent: document.body.innerHTML !== originalContent
      };
    };
  });
}

/**
 * Test hover-triggered content
 */
async function testHoverTriggeredContent(page, results) {
  // Detect potential hover elements
  const hoverElements = await page.evaluate(() => window.detectHoverContent());
  
  results.summary.totalHoverTriggers = hoverElements.length;
  console.log(`    Found ${hoverElements.length} potential hover trigger elements`);
  
  // Test each hover element (limit to prevent timeout)
  for (const elementInfo of hoverElements.slice(0, 10)) {
    try {
      const selector = elementInfo.id ? `#${elementInfo.id}` : 
                      elementInfo.className ? `.${elementInfo.className.split(' ')[0]}` :
                      elementInfo.tagName.toLowerCase();
      
      const element = page.locator(selector).first();
      
      // Test basic hover behavior
      await element.hover();
      await page.waitForTimeout(500);
      
      // Check for new content
      const contentDetection = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return window.testElementHover(el);
      }, selector);
      
      // Test dismissibility if content appeared
      if (contentDetection && contentDetection.hasNewContent) {
        // Test Escape key dismissibility
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        const afterEscape = await page.evaluate(() => {
          // Check if hover content is still visible
          const tooltips = Array.from(document.querySelectorAll('[role="tooltip"], .tooltip, .popover'));
          return tooltips.filter(t => t.offsetWidth > 0 && t.offsetHeight > 0);
        });
        
        const isDismissible = afterEscape.length === 0;
        
        const hoverResult = {
          ...elementInfo,
          hasHoverContent: contentDetection.hasNewContent,
          isDismissibleWithEscape: isDismissible,
          isCompliant: isDismissible,
          selector: selector
        };
        
        results.hoverElements.push(hoverResult);
        
        if (!isDismissible) {
          results.violations.push({
            type: 'hover-content-not-dismissible',
            message: 'Hover-triggered content cannot be dismissed with Escape key',
            element: elementInfo,
            severity: 'serious',
            wcagCriterion: '1.4.13'
          });
        }
      }
      
    } catch (error) {
      console.log(`    Warning: Could not test hover for element ${elementInfo.tagName}: ${error.message}`);
    }
  }
}

/**
 * Test focus-triggered content
 */
async function testFocusTriggeredContent(page, results) {
  // Detect focusable elements
  const focusElements = await page.evaluate(() => window.detectFocusContent());
  
  results.summary.totalFocusTriggers = focusElements.length;
  console.log(`    Found ${focusElements.length} focusable elements`);
  
  // Test focus-triggered content (limit to prevent timeout)
  for (const elementInfo of focusElements.slice(0, 10)) {
    if (!elementInfo.isVisible) continue;
    
    try {
      const selector = elementInfo.id ? `#${elementInfo.id}` : 
                      elementInfo.className ? `.${elementInfo.className.split(' ')[0]}` :
                      `${elementInfo.tagName.toLowerCase()}${elementInfo.type ? `[type="${elementInfo.type}"]` : ''}`;
      
      const element = page.locator(selector).first();
      
      // Test focus behavior
      await element.focus();
      await page.waitForTimeout(300);
      
      // Check for ARIA state changes or new content
      const focusDetection = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return window.testElementFocus(el);
      }, selector);
      
      if (focusDetection && (focusDetection.hasNewContent || focusDetection.ariaExpandedChanged)) {
        // Test dismissibility
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        const afterEscape = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          const expandedState = el ? el.getAttribute('aria-expanded') : null;
          const visibleContent = Array.from(document.querySelectorAll('[role="tooltip"], .dropdown-menu, .popover'))
                                     .filter(c => c.offsetWidth > 0 && c.offsetHeight > 0);
          return {
            ariaExpanded: expandedState,
            visibleContentCount: visibleContent.length
          };
        }, selector);
        
        const isDismissible = afterEscape.ariaExpanded === 'false' || afterEscape.visibleContentCount === 0;
        
        const focusResult = {
          ...elementInfo,
          hasFocusContent: focusDetection.hasNewContent || focusDetection.ariaExpandedChanged,
          isDismissibleWithEscape: isDismissible,
          isCompliant: isDismissible,
          selector: selector
        };
        
        results.focusElements.push(focusResult);
        
        if (!isDismissible) {
          results.violations.push({
            type: 'focus-content-not-dismissible',
            message: 'Focus-triggered content cannot be dismissed with Escape key',
            element: elementInfo,
            severity: 'serious',
            wcagCriterion: '1.4.13'
          });
        }
      }
      
    } catch (error) {
      console.log(`    Warning: Could not test focus for element ${elementInfo.tagName}: ${error.message}`);
    }
  }
}

/**
 * Test Escape key dismissibility
 */
async function testEscapeDismissibility(page, results) {
  console.log('    Testing global Escape key handling...');
  
  // Look for elements that might show on Escape
  const beforeEscape = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tooltip"], [role="dialog"], .tooltip, .popover, .dropdown-menu'))
      .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
      .map(el => ({
        tagName: el.tagName,
        role: el.getAttribute('role'),
        className: el.className,
        id: el.id
      }));
  });
  
  if (beforeEscape.length > 0) {
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const afterEscape = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="tooltip"], [role="dialog"], .tooltip, .popover, .dropdown-menu'))
        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
        .map(el => ({
          tagName: el.tagName,
          role: el.getAttribute('role'),
          className: el.className,
          id: el.id
        }));
    });
    
    const persistentElements = afterEscape.filter(after => 
      beforeEscape.some(before => 
        before.tagName === after.tagName && 
        before.className === after.className && 
        before.id === after.id
      )
    );
    
    results.summary.dismissibleContent = beforeEscape.length - persistentElements.length;
    results.summary.persistentContent = persistentElements.length;
    
    if (persistentElements.length > 0) {
      results.violations.push({
        type: 'content-not-dismissible-escape',
        message: `${persistentElements.length} elements remain visible after Escape key`,
        elements: persistentElements,
        severity: 'serious',
        wcagCriterion: '1.4.13'
      });
    }
  }
}

/**
 * Test content persistence when hovering over content
 */
async function testContentPersistence(page, results) {
  console.log('    Testing content persistence when hovering over content...');
  
  // Find tooltip or hover content
  const tooltipElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tooltip"], .tooltip, [title]'))
      .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
      .map(el => ({
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        hasTitle: el.hasAttribute('title'),
        role: el.getAttribute('role') || ''
      }));
  });
  
  // Test hovering over tooltip content itself
  for (const tooltipInfo of tooltipElements.slice(0, 3)) {
    try {
      const selector = tooltipInfo.id ? `#${tooltipInfo.id}` : 
                      tooltipInfo.className ? `.${tooltipInfo.className.split(' ')[0]}` :
                      tooltipInfo.tagName.toLowerCase();
      
      const element = page.locator(selector).first();
      
      // Hover over the tooltip/content
      await element.hover();
      await page.waitForTimeout(300);
      
      // Check if content remains visible
      const isStillVisible = await element.isVisible();
      
      if (isStillVisible) {
        results.summary.persistentContent++;
      } else {
        results.violations.push({
          type: 'content-disappears-on-hover',
          message: 'Content disappears when hovering over it',
          element: tooltipInfo,
          severity: 'serious',
          wcagCriterion: '1.4.13'
        });
      }
      
    } catch (error) {
      console.log(`    Warning: Could not test persistence for tooltip: ${error.message}`);
    }
  }
}

/**
 * Test tooltip behaviors
 */
async function testTooltipBehaviors(page, results) {
  // Find elements with title attributes (native tooltips)
  const titleElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[title]'))
      .map(el => ({
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        titleText: el.getAttribute('title'),
        hasAriaDescribedBy: el.hasAttribute('aria-describedby')
      }));
  });
  
  results.tooltips = titleElements;
  
  // Check for custom tooltip implementations
  const customTooltips = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="tooltip"], .tooltip, [data-tooltip]'))
      .map(el => ({
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        role: el.getAttribute('role') || '',
        isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
      }));
  });
  
  // Test tooltip accessibility
  titleElements.forEach(tooltip => {
    if (tooltip.titleText && tooltip.titleText.trim().length === 0) {
      results.violations.push({
        type: 'empty-tooltip',
        message: 'Element has empty title attribute',
        element: tooltip,
        severity: 'moderate',
        wcagCriterion: '1.4.13'
      });
    }
  });
}

/**
 * Test dynamic content handling
 */
async function testDynamicContentHandling(page, results) {
  console.log('    Testing dynamic content creation/removal...');
  
  // Look for buttons or triggers that might create dynamic content
  const dynamicTriggers = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, [role="button"], [aria-haspopup]'))
      .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
      .slice(0, 5) // Limit to prevent timeout
      .map(el => ({
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        hasAriaHaspopup: el.hasAttribute('aria-haspopup'),
        ariaHaspopup: el.getAttribute('aria-haspopup') || '',
        text: el.textContent?.trim().substring(0, 30) || ''
      }));
  });
  
  // Test dynamic content creation
  for (const triggerInfo of dynamicTriggers) {
    try {
      const selector = triggerInfo.id ? `#${triggerInfo.id}` : 
                      triggerInfo.className ? `.${triggerInfo.className.split(' ')[0]}` :
                      triggerInfo.tagName.toLowerCase();
      
      const element = page.locator(selector).first();
      
      // Click to potentially create content
      await element.click();
      await page.waitForTimeout(300);
      
      // Check for new content
      const newContent = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[role="dialog"], [role="menu"], .modal, .popup'))
          .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0)
          .map(el => ({
            tagName: el.tagName,
            role: el.getAttribute('role'),
            className: el.className
          }));
      });
      
      if (newContent.length > 0) {
        // Test if it can be dismissed
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
        
        const afterEscape = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('[role="dialog"], [role="menu"], .modal, .popup'))
            .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0).length;
        });
        
        if (afterEscape > 0) {
          results.violations.push({
            type: 'dynamic-content-not-dismissible',
            message: 'Dynamically created content cannot be dismissed with Escape',
            trigger: triggerInfo,
            severity: 'serious',
            wcagCriterion: '1.4.13'
          });
        }
      }
      
    } catch (error) {
      console.log(`    Warning: Could not test dynamic trigger: ${error.message}`);
    }
  }
}

// Test suite
test.describe('Enhanced Hover and Focus Content Testing (WCAG 1.4.13)', () => {
  
  test('should properly handle hover-triggered content', async ({ page, browserName }) => {
    console.log(`🎯 Testing hover content compliance on ${browserName}`);
    
    await page.goto('/');
    
    const results = await testHoverFocusContent(page, browserName);
    
    // Log results
    console.log(`\n🎯 Hover/Focus Content Results for ${browserName}:`);
    console.log(`📊 Hover triggers: ${results.summary.totalHoverTriggers}`);
    console.log(`📊 Focus triggers: ${results.summary.totalFocusTriggers}`);
    console.log(`📊 Compliant elements: ${results.summary.compliantElements}`);
    console.log(`📊 Violating elements: ${results.summary.violatingElements}`);
    console.log(`📊 Dismissible content: ${results.summary.dismissibleContent}`);
    console.log(`📊 Violations: ${results.summary.violationCount}`);
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `reports/hover-focus-content-${browserName}-${timestamp}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
    
    // Assertions
    expect(results.summary.violationCount).toBeLessThan(5); // Allow some tolerance
    
    // Check for critical violations
    const criticalViolations = results.violations.filter(v => v.severity === 'critical');
    expect(criticalViolations).toHaveLength(0);
    
    // Most content should be dismissible
    if (results.summary.totalHoverTriggers > 0 || results.summary.totalFocusTriggers > 0) {
      const complianceRatio = results.summary.compliantElements / 
                            (results.summary.compliantElements + results.summary.violatingElements);
      expect(complianceRatio).toBeGreaterThan(0.7); // 70% compliance
    }
    
    console.log(`✅ Hover/focus content testing completed for ${browserName}`);
  });

  test('should handle Escape key dismissibility', async ({ page, browserName }) => {
    console.log(`⌨️ Testing Escape key dismissibility on ${browserName}`);
    
    await page.goto('/');
    
    // Test global Escape key handling
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Check for persistent modal/popup content
    const persistentContent = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[role="dialog"], .modal, .popup'))
        .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0).length;
    });
    
    // Should not have persistent modal content after Escape
    expect(persistentContent).toBe(0);
    
    console.log(`✅ Escape key dismissibility test completed for ${browserName}`);
  });

}); 