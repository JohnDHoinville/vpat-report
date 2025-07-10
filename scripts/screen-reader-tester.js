#!/usr/bin/env node

/**
 * Screen Reader Compatibility Testing CLI Tool
 * Tests ARIA labels, roles, semantic markup, heading structure, and landmarks
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Main screen reader markup testing function
 * Tests comprehensive screen reader accessibility
 */
async function testScreenReaderMarkup(page, browserName, url = 'http://localhost:3000') {
  console.log(`🔊 Testing screen reader compatibility on ${browserName} for ${url}`);
  
  const results = {
    url: url,
    browser: browserName,
    timestamp: new Date().toISOString(),
    ariaLabels: [],
    ariaRoles: [],
    semanticMarkup: [],
    headingStructure: [],
    landmarks: [],
    formElements: [],
    liveRegions: [],
    violations: [],
    passed: true,
    summary: {
      totalElements: 0,
      elementsWithAria: 0,
      landmarkCount: 0,
      headingCount: 0,
      formElementCount: 0,
      liveRegionCount: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Inject helper functions before navigation
    await injectScreenReaderHelpers(page);
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Test ARIA labels and descriptions
    console.log('  🔍 Testing ARIA labels...');
    await testAriaLabels(page, results);
    
    // Test ARIA roles
    console.log('  🔍 Testing ARIA roles...');
    await testAriaRoles(page, results);
    
    // Test semantic markup
    console.log('  🔍 Testing semantic markup...');
    await testSemanticMarkup(page, results);
    
    // Test heading structure
    console.log('  🔍 Testing heading structure...');
    await testHeadingStructure(page, results);
    
    // Test landmark structure
    console.log('  🔍 Testing landmarks...');
    await testLandmarks(page, results);
    
    // Test form accessibility
    console.log('  🔍 Testing form accessibility...');
    await testFormAccessibility(page, results);
    
    // Test live regions
    console.log('  🔍 Testing live regions...');
    await testLiveRegions(page, results);
    
    // Test image accessibility
    console.log('  🔍 Testing image accessibility...');
    await testImageAccessibility(page, results);
    
    // Test link accessibility
    console.log('  🔍 Testing link accessibility...');
    await testLinkAccessibility(page, results);

  } catch (error) {
    results.violations.push({
      type: 'screen-reader-test-error',
      message: `Screen reader testing failed: ${error.message}`,
      severity: 'critical',
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.totalElements = results.ariaLabels.length + results.semanticMarkup.length + results.formElements.length;
  results.summary.totalChecks = 12; // Number of main test categories
  results.summary.passedChecks = results.summary.totalChecks - (results.violations.length > 0 ? 1 : 0);
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

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
        case 'aria-expanded':
          return {
            valid: ['true', 'false'].includes(value.toLowerCase()),
            reason: ['true', 'false'].includes(value.toLowerCase()) ? 'valid' : 'invalid-value',
            value: value
          };
        case 'aria-hidden':
          return {
            valid: ['true', 'false'].includes(value.toLowerCase()),
            reason: ['true', 'false'].includes(value.toLowerCase()) ? 'valid' : 'invalid-value',
            value: value
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
          skip: level > previousLevel + 1 ? level - previousLevel - 1 : 0,
          id: heading.id || '',
          className: heading.className || ''
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
          text: el.textContent?.trim().substring(0, 50) || '',
          id: el.id || '',
          className: el.className || ''
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
          text: el.textContent?.trim().substring(0, 50) || '',
          id: el.id || '',
          className: el.className || ''
        });
      });
      
      return landmarks;
    };

    // Color contrast checker
    window.getColorContrast = function(element) {
      const style = window.getComputedStyle(element);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      };
    };
  });
}

/**
 * Test ARIA labels and descriptions
 */
async function testAriaLabels(page, results) {
  const ariaElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-hidden]'));
    
    return elements.map(el => {
      const ariaLabel = window.validateAriaAttribute(el, 'aria-label');
      const ariaLabelledBy = window.validateAriaAttribute(el, 'aria-labelledby');
      const ariaDescribedBy = window.validateAriaAttribute(el, 'aria-describedby');
      const ariaExpanded = window.validateAriaAttribute(el, 'aria-expanded');
      const ariaHidden = window.validateAriaAttribute(el, 'aria-hidden');
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 50) || '',
        ariaLabel: ariaLabel,
        ariaLabelledBy: ariaLabelledBy,
        ariaDescribedBy: ariaDescribedBy,
        ariaExpanded: ariaExpanded,
        ariaHidden: ariaHidden,
        hasVisibleText: el.textContent?.trim().length > 0,
        isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) ||
                      el.hasAttribute('onclick') || el.hasAttribute('tabindex'),
        isFocusable: el.tabIndex >= 0 || ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
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

    // Check for invalid aria-expanded values
    if (element.ariaExpanded.valid === false && element.ariaExpanded.reason === 'invalid-value') {
      results.violations.push({
        type: 'invalid-aria-expanded',
        message: `Invalid aria-expanded value: "${element.ariaExpanded.value}"`,
        element: element,
        severity: 'moderate'
      });
    }

    // Check for invalid aria-hidden values
    if (element.ariaHidden.valid === false && element.ariaHidden.reason === 'invalid-value') {
      results.violations.push({
        type: 'invalid-aria-hidden',
        message: `Invalid aria-hidden value: "${element.ariaHidden.value}"`,
        element: element,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Test ARIA roles
 */
async function testAriaRoles(page, results) {
  const roleElements = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('[role]'));
    
    // Valid ARIA roles (comprehensive list)
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
      'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'grid',
      'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox',
      'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar',
      'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none',
      'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup',
      'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search',
      'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch',
      'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer',
      'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
    ];
    
    return elements.map(el => {
      const role = el.getAttribute('role');
      const implicitRole = el.tagName.toLowerCase();
      
      return {
        tagName: el.tagName,
        id: el.id || '',
        className: el.className || '',
        text: el.textContent?.trim().substring(0, 50) || '',
        role: role,
        implicitRole: implicitRole,
        isValidRole: validRoles.includes(role),
        hasRequiredProperties: true, // Simplified for this implementation
        isRedundant: (role === 'button' && implicitRole === 'button') ||
                     (role === 'link' && implicitRole === 'a') ||
                     (role === 'list' && implicitRole === 'ul') ||
                     (role === 'listitem' && implicitRole === 'li')
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

    if (element.isRedundant) {
      results.violations.push({
        type: 'redundant-aria-role',
        message: `Redundant ARIA role: "${element.role}" on <${element.tagName.toLowerCase()}>`,
        element: element,
        severity: 'minor'
      });
    }
  });
}

/**
 * Test semantic markup
 */
async function testSemanticMarkup(page, results) {
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
          hasContent: el.textContent?.trim().length > 0,
          childElementCount: el.children.length
        });
      });
    });
    
    return elements;
  });
  
  results.semanticMarkup = semanticElements;
  
  // Check for empty semantic elements
  semanticElements.forEach(element => {
    if (!element.hasContent && !element.ariaLabel && element.childElementCount === 0) {
      results.violations.push({
        type: 'empty-semantic-element',
        message: `Empty semantic element <${element.tagName}> without content or aria-label`,
        element: element,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Test heading structure
 */
async function testHeadingStructure(page, results) {
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
}

/**
 * Test landmark structure
 */
async function testLandmarks(page, results) {
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
}

/**
 * Test form accessibility
 */
async function testFormAccessibility(page, results) {
  const formElements = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    
    return inputs.map(input => {
      const labels = Array.from(document.querySelectorAll(`label[for="${input.id}"]`));
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      const ariaDescribedBy = input.getAttribute('aria-describedby');
      
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
        hasErrorDescription: !!ariaDescribedBy,
        hasPlaceholder: !!input.placeholder,
        placeholder: input.placeholder || ''
      };
    });
  });
  
  results.formElements = formElements;
  results.summary.formElementCount = formElements.length;
  
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

    // Check for placeholder-only labels
    if (!element.hasAccessibleName && element.hasPlaceholder) {
      results.violations.push({
        type: 'placeholder-only-label',
        message: `Form field relies only on placeholder text for labeling`,
        element: element,
        severity: 'serious'
      });
    }
  });
}

/**
 * Test live regions
 */
async function testLiveRegions(page, results) {
  const liveRegions = await page.evaluate(() => {
    const regions = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"], [role="marquee"]'));
    
    return regions.map(region => ({
      tagName: region.tagName,
      id: region.id || '',
      className: region.className || '',
      ariaLive: region.getAttribute('aria-live') || '',
      role: region.getAttribute('role') || '',
      ariaAtomic: region.getAttribute('aria-atomic') || '',
      ariaRelevant: region.getAttribute('aria-relevant') || '',
      text: region.textContent?.trim().substring(0, 50) || ''
    }));
  });
  
  results.liveRegions = liveRegions;
  results.summary.liveRegionCount = liveRegions.length;
}

/**
 * Test image accessibility
 */
async function testImageAccessibility(page, results) {
  const images = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    
    return imgs.map(img => ({
      src: img.src || '',
      alt: img.alt || '',
      hasAlt: img.hasAttribute('alt'),
      isEmpty: img.alt === '',
      isDecorative: img.alt === '' && img.hasAttribute('alt'),
      role: img.getAttribute('role') || '',
      ariaLabel: img.getAttribute('aria-label') || '',
      ariaLabelledBy: img.getAttribute('aria-labelledby') || '',
      ariaHidden: img.getAttribute('aria-hidden') || ''
    }));
  });
  
  // Validate images
  images.forEach(image => {
    if (!image.hasAlt && !image.ariaLabel && !image.ariaLabelledBy && image.ariaHidden !== 'true') {
      results.violations.push({
        type: 'image-missing-alt',
        message: `Image missing alt attribute`,
        element: image,
        severity: 'serious'
      });
    }
  });
}

/**
 * Test link accessibility
 */
async function testLinkAccessibility(page, results) {
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a'));
    
    return anchors.map(link => ({
      href: link.href || '',
      text: link.textContent?.trim() || '',
      ariaLabel: link.getAttribute('aria-label') || '',
      ariaLabelledBy: link.getAttribute('aria-labelledby') || '',
      title: link.title || '',
      hasAccessibleName: !!(link.textContent?.trim() || link.getAttribute('aria-label') || link.getAttribute('aria-labelledby')),
      isGeneric: ['click here', 'read more', 'more', 'link'].includes(link.textContent?.trim().toLowerCase())
    }));
  });
  
  // Validate links
  links.forEach(link => {
    if (!link.hasAccessibleName) {
      results.violations.push({
        type: 'link-missing-accessible-name',
        message: `Link missing accessible name`,
        element: link,
        severity: 'critical'
      });
    }

    if (link.isGeneric) {
      results.violations.push({
        type: 'generic-link-text',
        message: `Link has generic text: "${link.text}"`,
        element: link,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Run screen reader testing across browsers
 */
async function runScreenReaderTests(url = 'http://localhost:3000') {
  console.log('🚀 Starting Screen Reader Compatibility Testing...\n');
  
  const browsers = ['chromium', 'firefox', 'webkit'];
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
      
      // Run tests
      const results = await testScreenReaderMarkup(page, browserName, url);
      allResults.push(results);
      
      // Save individual results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = path.join('reports', `screen-reader-${browserName}-${timestamp}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      
      console.log(`  ✅ ${browserName} complete - ${results.summary.violationCount} violations found`);
      console.log(`  💾 Results saved to: ${resultsPath}`);
      
    } catch (error) {
      console.error(`  ❌ Error testing ${browserName}:`, error.message);
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  }
  
  // Generate consolidated report
  const consolidatedResults = {
    testType: 'screen-reader-compatibility',
    timestamp: new Date().toISOString(),
    url: url,
    browsers: allResults.map(r => r.browser),
    summary: {
      totalBrowsers: allResults.length,
      totalViolations: allResults.reduce((sum, r) => sum + r.summary.violationCount, 0),
      totalElements: allResults.reduce((sum, r) => sum + r.summary.totalElements, 0),
      totalLandmarks: allResults.reduce((sum, r) => sum + r.summary.landmarkCount, 0),
      totalHeadings: allResults.reduce((sum, r) => sum + r.summary.headingCount, 0),
      overallPassed: allResults.every(r => r.passed)
    },
    results: allResults
  };
  
  const consolidatedPath = path.join('reports', `screen-reader-consolidated-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedResults, null, 2));
  
  console.log('\n📊 Screen Reader Testing Summary:');
  console.log(`  🌐 Browsers tested: ${consolidatedResults.summary.totalBrowsers}`);
  console.log(`  📝 Total violations: ${consolidatedResults.summary.totalViolations}`);
  console.log(`  🏛️ Total landmarks: ${consolidatedResults.summary.totalLandmarks}`);
  console.log(`  📋 Total headings: ${consolidatedResults.summary.totalHeadings}`);
  console.log(`  ✅ Overall passed: ${consolidatedResults.summary.overallPassed ? 'Yes' : 'No'}`);
  console.log(`  💾 Consolidated report: ${consolidatedPath}`);
  
  return consolidatedResults;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  
  runScreenReaderTests(url)
    .then(() => {
      console.log('\n🎉 Screen reader compatibility testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Screen reader testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testScreenReaderMarkup, runScreenReaderTests }; 