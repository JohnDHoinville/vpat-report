/**
 * Screen Reader Compatibility Testing Suite
 * Tests ARIA labels, roles, semantic markup, and heading structure
 */

const { test, expect } = require('@playwright/test');

/**
 * Main screen reader markup testing function
 * Tests comprehensive screen reader accessibility
 */
async function testScreenReaderMarkup(page, browserName) {
  console.log(`🔊 Testing screen reader compatibility on ${browserName}`);
  
  const results = {
    ariaLabels: [],
    ariaRoles: [],
    semanticMarkup: [],
    headingStructure: [],
    landmarks: [],
    violations: [],
    passed: true,
    summary: {
      totalElements: 0,
      elementsWithAria: 0,
      landmarkCount: 0,
      headingCount: 0,
      violationCount: 0
    }
  };

  try {
    // Inject helper functions
    await injectScreenReaderHelpers(page);
    
    // Test ARIA labels and descriptions
    await testAriaLabels(page, results);
    
    // Test ARIA roles
    await testAriaRoles(page, results);
    
    // Test semantic markup
    await testSemanticMarkup(page, results);
    
    // Test heading structure
    await testHeadingStructure(page, results);
    
    // Test landmark structure
    await testLandmarks(page, results);
    
    // Test form accessibility
    await testFormAccessibility(page, results);
    
    // Test live regions
    await testLiveRegions(page, results);

  } catch (error) {
    results.violations.push({
      type: 'screen-reader-test-error',
      message: `Screen reader testing failed: ${error.message}`,
      severity: 'critical'
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.totalElements = results.ariaLabels.length + results.semanticMarkup.length;

  return results;
}

/**
 * Inject helper functions for screen reader testing
 */
async function injectScreenReaderHelpers(page) {
  await page.addInitScript(() => {
    // ARIA validator helper
    window.validateAriaAttribute = function(element, attribute) {
      const value = element.getAttribute(attribute);
      if (!value) return { valid: false, reason: 'missing' };
      
      // Validate common ARIA attributes
      switch (attribute) {
        case 'aria-label':
          return { 
            valid: value.trim().length > 0, 
            reason: value.trim().length === 0 ? 'empty' : 'valid',
            value: value 
          };
        case 'aria-describedby':
        case 'aria-labelledby':
          const ids = value.split(/\s+/);
          const missingIds = ids.filter(id => !document.getElementById(id));
          return { 
            valid: missingIds.length === 0, 
            reason: missingIds.length > 0 ? `missing-targets: ${missingIds.join(', ')}` : 'valid',
            value: value,
            missingIds 
          };
        default:
          return { valid: true, reason: 'not-validated', value: value };
      }
    };

    // Semantic hierarchy checker
    window.checkSemanticHierarchy = function() {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const hierarchy = [];
      let previousLevel = 0;
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        
        hierarchy.push({
          element: heading.tagName,
          level: level,
          text: text,
          index: index,
          isValid: level <= previousLevel + 1,
          skip: level > previousLevel + 1 ? level - previousLevel - 1 : 0
        });
        
        previousLevel = level;
      });
      
      return hierarchy;
    };

    // Landmark checker
    window.findLandmarks = function() {
      const landmarks = [];
      
      // HTML5 semantic elements
      const semanticElements = document.querySelectorAll('main, nav, aside, section, article, header, footer');
      semanticElements.forEach(el => {
        landmarks.push({
          type: 'semantic',
          element: el.tagName.toLowerCase(),
          role: el.getAttribute('role') || el.tagName.toLowerCase(),
          label: el.getAttribute('aria-label') || '',
          labelledBy: el.getAttribute('aria-labelledby') || '',
          text: el.textContent?.trim().substring(0, 50) || ''
        });
      });
      
      // ARIA landmarks
      const ariaLandmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="search"], [role="region"]');
      ariaLandmarks.forEach(el => {
        landmarks.push({
          type: 'aria',
          element: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          label: el.getAttribute('aria-label') || '',
          labelledBy: el.getAttribute('aria-labelledby') || '',
          text: el.textContent?.trim().substring(0, 50) || ''
        });
      });
      
      return landmarks;
    };
  });
}

/**
 * Test ARIA labels and descriptions
 */
async function testAriaLabels(page, results) {
  console.log('🔍 Testing ARIA labels and descriptions...');
  
  const ariaElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]'));
    
    return elements.map(el => {
      const ariaLabel = window.validateAriaAttribute(el, 'aria-label');
      const ariaLabelledBy = window.validateAriaAttribute(el, 'aria-labelledby');
      const ariaDescribedBy = window.validateAriaAttribute(el, 'aria-describedby');
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 50) || '',
        ariaLabel: ariaLabel,
        ariaLabelledBy: ariaLabelledBy,
        ariaDescribedBy: ariaDescribedBy,
        hasVisibleText: el.textContent?.trim().length > 0,
        isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) ||
                      el.hasAttribute('onclick') || el.hasAttribute('tabindex')
      };
    });
  });
  
  results.ariaLabels = ariaElements;
  results.summary.elementsWithAria = ariaElements.length;
  
  // Validate ARIA labels
  ariaElements.forEach(element => {
    // Check for empty aria-label
    if (element.ariaLabel.valid === false && element.ariaLabel.reason === 'empty') {
      results.violations.push({
        type: 'empty-aria-label',
        message: `Element has empty aria-label`,
        element: element,
        severity: 'serious'
      });
    }
    
    // Check for broken aria-labelledby references
    if (element.ariaLabelledBy.valid === false && element.ariaLabelledBy.reason.includes('missing-targets')) {
      results.violations.push({
        type: 'broken-aria-labelledby',
        message: `aria-labelledby references missing elements: ${element.ariaLabelledBy.missingIds?.join(', ')}`,
        element: element,
        severity: 'serious'
      });
    }
    
    // Check for broken aria-describedby references
    if (element.ariaDescribedBy.valid === false && element.ariaDescribedBy.reason.includes('missing-targets')) {
      results.violations.push({
        type: 'broken-aria-describedby',
        message: `aria-describedby references missing elements: ${element.ariaDescribedBy.missingIds?.join(', ')}`,
        element: element,
        severity: 'serious'
      });
    }
    
    // Check for interactive elements without accessible names
    if (element.isInteractive && !element.hasVisibleText && 
        !element.ariaLabel.valid && !element.ariaLabelledBy.valid) {
      results.violations.push({
        type: 'missing-accessible-name',
        message: `Interactive element lacks accessible name`,
        element: element,
        severity: 'critical'
      });
    }
  });
  
  console.log(`📊 ARIA elements: ${ariaElements.length} found`);
}

/**
 * Test ARIA roles
 */
async function testAriaRoles(page, results) {
  console.log('🔍 Testing ARIA roles...');
  
  const roleElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[role]'));
    
    // Valid ARIA roles (subset of most common ones)
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'checkbox', 'complementary', 'contentinfo', 'dialog', 'document',
      'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link',
      'list', 'listitem', 'main', 'menu', 'menubar', 'menuitem',
      'navigation', 'option', 'presentation', 'progressbar', 'radio',
      'radiogroup', 'region', 'row', 'rowgroup', 'search', 'separator',
      'slider', 'spinbutton', 'status', 'tab', 'tablist', 'tabpanel',
      'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treeitem'
    ];
    
    return elements.map(el => {
      const role = el.getAttribute('role');
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 50) || '',
        role: role,
        isValidRole: validRoles.includes(role),
        hasRequiredProperties: true // Simplified for this implementation
      };
    });
  });
  
  results.ariaRoles = roleElements;
  
  // Validate ARIA roles
  roleElements.forEach(element => {
    if (!element.isValidRole) {
      results.violations.push({
        type: 'invalid-aria-role',
        message: `Invalid ARIA role: "${element.role}"`,
        element: element,
        severity: 'serious'
      });
    }
  });
  
  console.log(`📊 ARIA roles: ${roleElements.length} found`);
}

/**
 * Test semantic markup
 */
async function testSemanticMarkup(page, results) {
  console.log('🔍 Testing semantic markup...');
  
  const semanticElements = await page.evaluate(() => {
    const semanticTags = ['main', 'nav', 'aside', 'section', 'article', 'header', 'footer', 'figure', 'figcaption'];
    const elements = [];
    
    semanticTags.forEach(tag => {
      const tagElements = Array.from(document.querySelectorAll(tag));
      tagElements.forEach(el => {
        elements.push({
          tagName: el.tagName.toLowerCase(),
          id: el.id || '',
          className: el.className || '',
          text: el.textContent?.trim().substring(0, 50) || '',
          role: el.getAttribute('role') || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          hasContent: el.textContent?.trim().length > 0
        });
      });
    });
    
    return elements;
  });
  
  results.semanticMarkup = semanticElements;
  
  // Check for empty semantic elements
  semanticElements.forEach(element => {
    if (!element.hasContent && !element.ariaLabel) {
      results.violations.push({
        type: 'empty-semantic-element',
        message: `Empty semantic element <${element.tagName}> without aria-label`,
        element: element,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`📊 Semantic elements: ${semanticElements.length} found`);
}

/**
 * Test heading structure
 */
async function testHeadingStructure(page, results) {
  console.log('🔍 Testing heading structure...');
  
  const headingHierarchy = await page.evaluate(() => {
    return window.checkSemanticHierarchy();
  });
  
  results.headingStructure = headingHierarchy;
  results.summary.headingCount = headingHierarchy.length;
  
  // Validate heading hierarchy
  headingHierarchy.forEach((heading, index) => {
    if (!heading.isValid) {
      results.violations.push({
        type: 'heading-hierarchy-skip',
        message: `Heading level skips from ${index > 0 ? headingHierarchy[index-1].level : 0} to ${heading.level}`,
        element: heading,
        severity: 'moderate'
      });
    }
    
    if (!heading.text) {
      results.violations.push({
        type: 'empty-heading',
        message: `Empty heading: <${heading.element}>`,
        element: heading,
        severity: 'serious'
      });
    }
  });
  
  // Check for missing h1
  const hasH1 = headingHierarchy.some(h => h.level === 1);
  if (headingHierarchy.length > 0 && !hasH1) {
    results.violations.push({
      type: 'missing-h1',
      message: 'Page has headings but no h1 element',
      severity: 'moderate'
    });
  }
  
  console.log(`📊 Headings: ${headingHierarchy.length} found`);
}

/**
 * Test landmark structure
 */
async function testLandmarks(page, results) {
  console.log('🔍 Testing landmark structure...');
  
  const landmarks = await page.evaluate(() => {
    return window.findLandmarks();
  });
  
  results.landmarks = landmarks;
  results.summary.landmarkCount = landmarks.length;
  
  // Check for required landmarks
  const landmarkTypes = landmarks.map(l => l.role);
  
  if (!landmarkTypes.includes('main')) {
    results.violations.push({
      type: 'missing-main-landmark',
      message: 'Page missing main landmark',
      severity: 'serious'
    });
  }
  
  // Check for multiple main landmarks without labels
  const mainLandmarks = landmarks.filter(l => l.role === 'main');
  if (mainLandmarks.length > 1) {
    const unlabeledMains = mainLandmarks.filter(l => !l.label && !l.labelledBy);
    if (unlabeledMains.length > 0) {
      results.violations.push({
        type: 'multiple-main-landmarks-unlabeled',
        message: 'Multiple main landmarks without distinguishing labels',
        severity: 'serious'
      });
    }
  }
  
  console.log(`📊 Landmarks: ${landmarks.length} found`);
}

/**
 * Test form accessibility
 */
async function testFormAccessibility(page, results) {
  console.log('🔍 Testing form accessibility...');
  
  const formElements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    
    return inputs.map(input => {
      const labels = Array.from(document.querySelectorAll(`label[for="${input.id}"]`));
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      return {
        tagName: input.tagName,
        type: input.type || '',
        id: input.id || '',
        name: input.name || '',
        hasExplicitLabel: labels.length > 0,
        hasAriaLabel: !!ariaLabel,
        hasAriaLabelledBy: !!ariaLabelledBy,
        hasAccessibleName: labels.length > 0 || !!ariaLabel || !!ariaLabelledBy,
        required: input.hasAttribute('required'),
        hasErrorDescription: !!input.getAttribute('aria-describedby')
      };
    });
  });
  
  // Validate form elements
  formElements.forEach(element => {
    if (!element.hasAccessibleName) {
      results.violations.push({
        type: 'form-missing-label',
        message: `Form ${element.tagName.toLowerCase()} missing accessible name`,
        element: element,
        severity: 'critical'
      });
    }
    
    if (element.required && !element.hasErrorDescription) {
      results.violations.push({
        type: 'required-field-missing-description',
        message: `Required field missing aria-describedby for error handling`,
        element: element,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`📊 Form elements: ${formElements.length} found`);
}

/**
 * Test live regions
 */
async function testLiveRegions(page, results) {
  console.log('🔍 Testing live regions...');
  
  const liveRegions = await page.evaluate(() => {
    const regions = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'));
    
    return regions.map(region => ({
      tagName: region.tagName,
      id: region.id || '',
      className: region.className || '',
      ariaLive: region.getAttribute('aria-live') || '',
      role: region.getAttribute('role') || '',
      text: region.textContent?.trim().substring(0, 50) || ''
    }));
  });
  
  console.log(`📊 Live regions: ${liveRegions.length} found`);
}

// Test suite
test.describe('Screen Reader Compatibility Testing', () => {
  
  test('should have proper screen reader markup', async ({ page, browserName }) => {
    await page.goto('/');
    
    const results = await testScreenReaderMarkup(page, browserName);
    
    // Log results
    console.log(`\n🔊 Screen Reader Compatibility Results for ${browserName}:`);
    console.log(`📊 Total elements with ARIA: ${results.summary.elementsWithAria}`);
    console.log(`📊 Landmarks found: ${results.summary.landmarkCount}`);
    console.log(`📊 Headings found: ${results.summary.headingCount}`);
    console.log(`📊 Violations found: ${results.summary.violationCount}`);
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `reports/screen-reader-${browserName}-${timestamp}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
    
    // Assertions
    expect(results.summary.headingCount).toBeGreaterThan(0);
    expect(results.summary.landmarkCount).toBeGreaterThan(0);
    
    // Check for critical violations
    const criticalViolations = results.violations.filter(v => v.severity === 'critical');
    expect(criticalViolations).toHaveLength(0);
    
    console.log(`✅ Screen reader compatibility test completed for ${browserName}`);
  });

  test('should have accessible heading hierarchy', async ({ page, browserName }) => {
    // Inject helper functions first
    await injectScreenReaderHelpers(page);
    
    await page.goto('/');
    
    console.log(`📋 Testing heading hierarchy on ${browserName}`);
    
    const headings = await page.evaluate(() => {
      return window.checkSemanticHierarchy();
    });
    
    // Check for h1
    const hasH1 = headings.some(h => h.level === 1);
    expect(hasH1).toBe(true);
    
    // Check for logical progression
    const invalidHeadings = headings.filter(h => !h.isValid);
    expect(invalidHeadings).toHaveLength(0);
    
    console.log(`✅ Heading hierarchy test completed for ${browserName}`);
  });

});

module.exports = { testScreenReaderMarkup }; 