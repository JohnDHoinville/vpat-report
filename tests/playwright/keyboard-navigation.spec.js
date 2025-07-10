/**
 * Keyboard Navigation Testing Suite
 * Tests tab order, focus management, skip links, and focus indicators
 */

const { test, expect } = require('@playwright/test');

/**
 * Main keyboard navigation testing function
 * Tests comprehensive keyboard accessibility
 */
async function testKeyboardNavigation(page, browserName) {
  console.log(`🎹 Testing keyboard navigation on ${browserName}`);
  
  const results = {
    tabOrder: [],
    focusableElements: 0,
    skipLinks: [],
    focusIndicators: [],
    violations: [],
    passed: true
  };

  try {
    // Inject XPath helper
    await page.addInitScript(() => {
      window.getElementXPath = function(element) {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }
        
        let path = '';
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let selector = element.nodeName.toLowerCase();
          if (element.className) {
            selector += '.' + element.className.split(' ').join('.');
          }
          path = '/' + selector + path;
          element = element.parentNode;
        }
        return path;
      };
    });

    // Get all focusable elements
    const focusableElements = await page.locator(
      'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    ).all();
    
    results.focusableElements = focusableElements.length;
    console.log(`Found ${results.focusableElements} focusable elements`);

    // Test tab order
    await testTabOrder(page, results);
    
    // Test skip links
    await testSkipLinks(page, results);
    
    // Test focus indicators
    await testFocusIndicators(page, results);
    
    // Test keyboard traps (if any)
    await testKeyboardTraps(page, results);
    
    // Test arrow key navigation (if applicable)
    await testArrowKeyNavigation(page, results);

  } catch (error) {
    results.violations.push({
      type: 'navigation-error',
      message: `Keyboard navigation test failed: ${error.message}`,
      severity: 'critical'
    });
    results.passed = false;
  }

  return results;
}

/**
 * Test tab order and focus sequence
 */
async function testTabOrder(page, results) {
  console.log('🔍 Testing tab order...');
  
  // Start by focusing the first focusable element
  const firstFocusable = await page.locator('a[href], button, input, textarea, select').first();
  if (await firstFocusable.count() > 0) {
    await firstFocusable.focus();
    await page.waitForTimeout(100);
  }
  
  // Track tab sequence
  const tabSequence = [];
  let previousElement = null;
  let tabCount = 0;
  const maxTabs = 15; // Prevent infinite loops
  
  while (tabCount < maxTabs) {
    // Press Tab
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Get currently focused element
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 50) || '',
        tabIndex: el.tabIndex,
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        href: el.href || '',
        type: el.type || '',

      };
    });
    
    if (!focusedElement) {
      break; // No more focusable elements
    }
    
    // Check if we've cycled back to the beginning
    const elementKey = `${focusedElement.tagName}-${focusedElement.id}-${focusedElement.text}`;
    if (tabSequence.some(el => `${el.tagName}-${el.id}-${el.text}` === elementKey)) {
      console.log('✅ Tab order cycles correctly');
      break;
    }
    
    tabSequence.push(focusedElement);
    tabCount++;
  }
  
  results.tabOrder = tabSequence;
  console.log(`📊 Tab order: ${tabSequence.length} elements in sequence`);
  
  // Validate tab order makes logical sense
  await validateLogicalTabOrder(tabSequence, results);
}

/**
 * Test skip link functionality
 */
async function testSkipLinks(page, results) {
  console.log('🔍 Testing skip links...');
  
  // Look for skip links
  const skipLinks = await page.locator('a[href^="#"], a[class*="skip"], a[class*="sr-only"]').all();
  
  for (let i = 0; i < skipLinks.length; i++) {
    const skipLink = skipLinks[i];
    
    try {
      const linkInfo = await skipLink.evaluate(el => ({
        text: el.textContent?.trim(),
        href: el.href,
        visible: window.getComputedStyle(el).display !== 'none' &&
                window.getComputedStyle(el).visibility !== 'hidden',
        className: el.className,
        id: el.id
      }));
      
      // Test if skip link is focusable
      await skipLink.focus();
      const isFocused = await page.evaluate(() => 
        document.activeElement.textContent?.includes('skip') ||
        document.activeElement.textContent?.includes('Skip')
      );
      
      if (isFocused) {
        // Test if skip link actually works
        await skipLink.press('Enter');
        await page.waitForTimeout(200);
        
        const targetReached = await page.evaluate((href) => {
          const targetId = href.split('#')[1];
          if (targetId) {
            const target = document.getElementById(targetId);
            return target && (document.activeElement === target || 
                            target.contains(document.activeElement));
          }
          return false;
        }, linkInfo.href);
        
        results.skipLinks.push({
          text: linkInfo.text,
          href: linkInfo.href,
          visible: linkInfo.visible,
          functional: targetReached,
          className: linkInfo.className
        });
        
        if (!targetReached) {
          results.violations.push({
            type: 'skip-link-broken',
            message: `Skip link "${linkInfo.text}" does not navigate to target`,
            element: linkInfo,
            severity: 'serious'
          });
        }
      }
    } catch (error) {
      results.violations.push({
        type: 'skip-link-error',
        message: `Error testing skip link: ${error.message}`,
        severity: 'moderate'
      });
    }
  }
  
  console.log(`📊 Skip links: ${results.skipLinks.length} found`);
}

/**
 * Test focus indicators visibility
 */
async function testFocusIndicators(page, results) {
  console.log('🔍 Testing focus indicators...');
  
  // Get interactive elements to test
  const interactiveElements = await page.locator(
    'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
  ).all();
  
  for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
    const element = interactiveElements[i];
    
    try {
      // Focus the element
      await element.focus();
      await page.waitForTimeout(100);
      
      // Check if focus indicator is visible
      const focusInfo = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        const focusStyles = window.getComputedStyle(el, ':focus');
        
        return {
          tagName: el.tagName,
          text: el.textContent?.trim().substring(0, 30),
          outline: focusStyles.outline,
          outlineColor: focusStyles.outlineColor,
          outlineWidth: focusStyles.outlineWidth,
          outlineStyle: focusStyles.outlineStyle,
          boxShadow: focusStyles.boxShadow,
          border: focusStyles.border,
          backgroundColor: focusStyles.backgroundColor,
          hasFocusIndicator: (
            focusStyles.outline !== 'none' ||
            focusStyles.outlineWidth !== '0px' ||
            focusStyles.boxShadow !== 'none' ||
            focusStyles.border !== styles.border ||
            focusStyles.backgroundColor !== styles.backgroundColor
          )
        };
      });
      
      results.focusIndicators.push(focusInfo);
      
      if (!focusInfo.hasFocusIndicator) {
        results.violations.push({
          type: 'missing-focus-indicator',
          message: `Element "${focusInfo.text}" lacks visible focus indicator`,
          element: focusInfo,
          severity: 'serious'
        });
      }
    } catch (error) {
      results.violations.push({
        type: 'focus-indicator-error',
        message: `Error testing focus indicator: ${error.message}`,
        severity: 'moderate'
      });
    }
  }
  
  const withIndicators = results.focusIndicators.filter(f => f.hasFocusIndicator).length;
  console.log(`📊 Focus indicators: ${withIndicators}/${results.focusIndicators.length} elements have visible indicators`);
}

/**
 * Test for keyboard traps
 */
async function testKeyboardTraps(page, results) {
  console.log('🔍 Testing for keyboard traps...');
  
  // Look for modal dialogs or other potential traps
  const potentialTraps = await page.locator('[role="dialog"], [role="alertdialog"], .modal, .popup').all();
  
  if (potentialTraps.length > 0) {
    console.log(`Found ${potentialTraps.length} potential keyboard traps`);
    
    for (const trap of potentialTraps) {
      const isVisible = await trap.isVisible();
      if (isVisible) {
        // Test if focus is trapped within the modal
        await trap.focus();
        
        // Try to tab out of the modal
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(50);
          
          const focusedElement = await page.evaluate(() => {
            const el = document.activeElement;
            return el ? el.tagName : null;
          });
          
          if (!focusedElement) break;
        }
        
        // Check if focus is still within the modal
        const focusTrapped = await page.evaluate((selector) => {
          const modal = document.querySelector(selector);
          const focused = document.activeElement;
          return modal && modal.contains(focused);
        }, await trap.getAttribute('class') ? `.${await trap.getAttribute('class')}` : '[role="dialog"]');
        
        if (focusTrapped) {
          console.log('⚠️ Potential keyboard trap detected');
          results.violations.push({
            type: 'keyboard-trap',
            message: 'Potential keyboard trap detected in modal/dialog',
            severity: 'serious'
          });
        }
      }
    }
  }
}

/**
 * Test arrow key navigation
 */
async function testArrowKeyNavigation(page, results) {
  console.log('🔍 Testing arrow key navigation...');
  
  // Look for elements that might support arrow key navigation
  const arrowNavElements = await page.locator(
    '[role="tablist"], [role="menu"], [role="menubar"], [role="listbox"], [role="grid"]'
  ).all();
  
  for (const element of arrowNavElements) {
    const isVisible = await element.isVisible();
    if (isVisible) {
      const role = await element.getAttribute('role');
      console.log(`Testing arrow navigation for ${role}`);
      
      await element.focus();
      await page.waitForTimeout(100);
      
      // Test arrow key navigation
      const initialFocus = await page.evaluate(() => document.activeElement.textContent);
      
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
      
      const afterArrowFocus = await page.evaluate(() => document.activeElement.textContent);
      
      if (initialFocus !== afterArrowFocus) {
        console.log(`✅ Arrow key navigation works for ${role}`);
      }
    }
  }
}

/**
 * Validate logical tab order
 */
async function validateLogicalTabOrder(tabSequence, results) {
  // Check for common tab order issues
  const headings = tabSequence.filter(el => el.tagName.match(/^H[1-6]$/));
  const links = tabSequence.filter(el => el.tagName === 'A');
  const buttons = tabSequence.filter(el => el.tagName === 'BUTTON');
  const inputs = tabSequence.filter(el => el.tagName === 'INPUT');
  
  // Validate that interactive elements come in logical order
  if (tabSequence.length > 0) {
    console.log(`📊 Tab sequence analysis: ${links.length} links, ${buttons.length} buttons, ${inputs.length} inputs`);
    
    // Check for elements with positive tabindex (anti-pattern)
    const positiveTabIndex = tabSequence.filter(el => el.tabIndex > 0);
    if (positiveTabIndex.length > 0) {
      results.violations.push({
        type: 'positive-tabindex',
        message: `${positiveTabIndex.length} elements use positive tabindex (anti-pattern)`,
        elements: positiveTabIndex,
        severity: 'moderate'
      });
    }
  }
}

// Test suite
test.describe('Keyboard Navigation Testing', () => {
  
  test('should have proper keyboard navigation flow', async ({ page, browserName }) => {
    await page.goto('/');
    
    const results = await testKeyboardNavigation(page, browserName);
    
    // Log results
    console.log(`\n🎹 Keyboard Navigation Results for ${browserName}:`);
    console.log(`📊 Focusable elements: ${results.focusableElements}`);
    console.log(`📊 Tab order length: ${results.tabOrder.length}`);
    console.log(`📊 Skip links: ${results.skipLinks.length}`);
    console.log(`📊 Focus indicators tested: ${results.focusIndicators.length}`);
    console.log(`📊 Violations found: ${results.violations.length}`);
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `reports/keyboard-navigation-${browserName}-${timestamp}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
    
    // Assertions
    expect(results.focusableElements).toBeGreaterThan(0);
    expect(results.tabOrder.length).toBeGreaterThan(0);
    
    // Check for critical violations
    const criticalViolations = results.violations.filter(v => v.severity === 'critical');
    expect(criticalViolations).toHaveLength(0);
    
    console.log(`✅ Keyboard navigation test completed for ${browserName}`);
  });

  test('should support keyboard-only interaction', async ({ page, browserName }) => {
    await page.goto('/');
    
    console.log(`⌨️ Testing keyboard-only interaction on ${browserName}`);
    
    // Disable mouse to force keyboard-only interaction
    await page.evaluate(() => {
      document.body.style.pointerEvents = 'none';
    });
    
    // Navigate using only keyboard
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Try to activate the first focusable element
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Verify page is still responsive
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Re-enable mouse
    await page.evaluate(() => {
      document.body.style.pointerEvents = 'auto';
    });
    
    console.log(`✅ Keyboard-only interaction test completed for ${browserName}`);
  });

});

module.exports = { testKeyboardNavigation }; 