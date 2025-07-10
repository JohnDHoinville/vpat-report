#!/usr/bin/env node

/**
 * Form Accessibility Testing CLI Tool
 * Tests error handling, label association, and error message announcements
 */

const { chromium, firefox, webkit } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Main form accessibility testing function
 * Tests comprehensive form accessibility including error handling and announcements
 */
async function testFormAccessibility(page, browserName, url = 'http://localhost:3000') {
  console.log(`📝 Testing form accessibility on ${browserName} for ${url}`);
  
  const results = {
    url: url,
    browser: browserName,
    timestamp: new Date().toISOString(),
    formElements: [],
    labels: [],
    errorHandling: [],
    fieldsets: [],
    validationMessages: [],
    accessibilityFeatures: [],
    formGroups: [],
    violations: [],
    passed: true,
    summary: {
      totalFormElements: 0,
      labeledElements: 0,
      unlabeledElements: 0,
      requiredFields: 0,
      fieldsWithErrorHandling: 0,
      fieldsetCount: 0,
      liveRegionCount: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Inject helper functions before navigation
    await injectFormHelpers(page);
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Test form element identification and labeling
    console.log('  🏷️ Testing form labels...');
    await testFormLabels(page, results);
    
    // Test required field handling
    console.log('  ⚠️ Testing required fields...');
    await testRequiredFields(page, results);
    
    // Test error message association
    console.log('  🔗 Testing error message association...');
    await testErrorMessageAssociation(page, results);
    
    // Test fieldset and legend usage
    console.log('  📦 Testing fieldsets and legends...');
    await testFieldsetsAndLegends(page, results);
    
    // Test form validation and announcements
    console.log('  📢 Testing validation announcements...');
    await testValidationAnnouncements(page, results);
    
    // Test keyboard navigation within forms
    console.log('  ⌨️ Testing form keyboard navigation...');
    await testFormKeyboardNavigation(page, results);
    
    // Test autocomplete attributes
    console.log('  🔄 Testing autocomplete attributes...');
    await testAutocompleteAttributes(page, results);
    
    // Test form grouping and organization
    console.log('  📋 Testing form organization...');
    await testFormOrganization(page, results);

  } catch (error) {
    results.violations.push({
      type: 'form-test-error',
      message: `Form accessibility testing failed: ${error.message}`,
      severity: 'critical',
      stack: error.stack
    });
    results.passed = false;
  }

  // Update summary
  results.summary.violationCount = results.violations.length;
  results.summary.totalFormElements = results.formElements.length;
  results.summary.totalChecks = 8; // Number of main test categories
  results.summary.passedChecks = results.summary.totalChecks - (results.violations.length > 0 ? 1 : 0);
  results.passed = results.violations.filter(v => v.severity === 'critical').length === 0;

  return results;
}

/**
 * Inject helper functions for form accessibility testing
 */
async function injectFormHelpers(page) {
  await page.addInitScript(() => {
    // Form element analyzer
    window.analyzeFormElement = function(element) {
      const tagName = element.tagName.toLowerCase();
      const type = element.type || '';
      const id = element.id || '';
      const name = element.name || '';
      
      // Find associated labels
      const labels = [];
      
      // Method 1: Labels with 'for' attribute pointing to this element's id
      if (id) {
        const forLabels = Array.from(document.querySelectorAll(`label[for="${id}"]`));
        labels.push(...forLabels.map(l => ({ 
          method: 'for', 
          element: l, 
          text: l.textContent?.trim(),
          id: l.id || ''
        })));
      }
      
      // Method 2: Labels wrapping this element
      let parent = element.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'label') {
          labels.push({ 
            method: 'wrapping', 
            element: parent, 
            text: parent.textContent?.trim(),
            id: parent.id || ''
          });
          break;
        }
        parent = parent.parentElement;
      }
      
      // Method 3: aria-labelledby
      const ariaLabelledBy = element.getAttribute('aria-labelledby');
      if (ariaLabelledBy) {
        const ids = ariaLabelledBy.split(/\s+/);
        ids.forEach(labelId => {
          const labelElement = document.getElementById(labelId);
          if (labelElement) {
            labels.push({ 
              method: 'aria-labelledby', 
              element: labelElement, 
              text: labelElement.textContent?.trim(),
              id: labelId
            });
          } else {
            labels.push({ 
              method: 'aria-labelledby', 
              element: null, 
              text: null,
              id: labelId,
              missing: true
            });
          }
        });
      }
      
      // Method 4: aria-label
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        labels.push({ method: 'aria-label', text: ariaLabel });
      }
      
      // Check for error associations
      const ariaDescribedBy = element.getAttribute('aria-describedby');
      const errorElements = [];
      if (ariaDescribedBy) {
        const ids = ariaDescribedBy.split(/\s+/);
        ids.forEach(errorId => {
          const errorElement = document.getElementById(errorId);
          if (errorElement) {
            errorElements.push({
              id: errorId,
              element: errorElement,
              text: errorElement.textContent?.trim(),
              isError: errorElement.className.includes('error') || 
                      errorElement.getAttribute('role') === 'alert' ||
                      errorElement.textContent?.toLowerCase().includes('error') ||
                      errorElement.textContent?.toLowerCase().includes('invalid'),
              role: errorElement.getAttribute('role') || '',
              className: errorElement.className || ''
            });
          } else {
            errorElements.push({
              id: errorId,
              element: null,
              text: null,
              missing: true
            });
          }
        });
      }
      
      // Get computed styles for additional analysis
      const computedStyle = window.getComputedStyle(element);
      
      return {
        tagName: tagName,
        type: type,
        id: id,
        name: name,
        labels: labels,
        hasAccessibleName: labels.some(l => !l.missing && l.text && l.text.length > 0),
        isRequired: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
        isDisabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
        isReadonly: element.readOnly || element.getAttribute('aria-readonly') === 'true',
        placeholder: element.placeholder || '',
        value: element.value || '',
        autocomplete: element.getAttribute('autocomplete') || '',
        pattern: element.pattern || '',
        minLength: element.minLength || null,
        maxLength: element.maxLength || null,
        min: element.min || '',
        max: element.max || '',
        step: element.step || '',
        errorElements: errorElements,
        hasErrorHandling: errorElements.length > 0,
        tabIndex: element.tabIndex,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
        className: element.className || '',
        ariaInvalid: element.getAttribute('aria-invalid') || '',
        role: element.getAttribute('role') || '',
        title: element.title || '',
        form: element.form?.id || '',
        position: {
          x: element.getBoundingClientRect().left,
          y: element.getBoundingClientRect().top
        }
      };
    };

    // Fieldset analyzer
    window.analyzeFieldset = function(fieldset) {
      const legend = fieldset.querySelector('legend');
      const formElements = Array.from(fieldset.querySelectorAll('input, select, textarea, button'));
      
      return {
        hasLegend: !!legend,
        legendText: legend?.textContent?.trim() || '',
        legendId: legend?.id || '',
        formElementCount: formElements.length,
        formElements: formElements.map(el => ({
          tagName: el.tagName,
          type: el.type || '',
          id: el.id || '',
          name: el.name || ''
        })),
        id: fieldset.id || '',
        className: fieldset.className || '',
        isVisible: fieldset.offsetWidth > 0 && fieldset.offsetHeight > 0,
        isDisabled: fieldset.disabled,
        ariaDescribedBy: fieldset.getAttribute('aria-describedby') || ''
      };
    };

    // Validation message checker
    window.checkValidationMessages = function() {
      const liveRegions = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"]'));
      const errorMessages = Array.from(document.querySelectorAll('.error, .validation-error, [class*="error"], [class*="invalid"]'));
      const successMessages = Array.from(document.querySelectorAll('.success, .valid, [class*="success"], [class*="valid"]'));
      
      return {
        liveRegions: liveRegions.map(region => ({
          tagName: region.tagName,
          ariaLive: region.getAttribute('aria-live'),
          ariaAtomic: region.getAttribute('aria-atomic'),
          ariaRelevant: region.getAttribute('aria-relevant'),
          role: region.getAttribute('role'),
          text: region.textContent?.trim(),
          id: region.id || '',
          className: region.className || '',
          isVisible: region.offsetWidth > 0 && region.offsetHeight > 0
        })),
        errorMessages: errorMessages.map(msg => ({
          tagName: msg.tagName,
          text: msg.textContent?.trim(),
          id: msg.id || '',
          className: msg.className || '',
          role: msg.getAttribute('role') || '',
          isVisible: msg.offsetWidth > 0 && msg.offsetHeight > 0,
          ariaLive: msg.getAttribute('aria-live') || ''
        })),
        successMessages: successMessages.map(msg => ({
          tagName: msg.tagName,
          text: msg.textContent?.trim(),
          id: msg.id || '',
          className: msg.className || '',
          isVisible: msg.offsetWidth > 0 && msg.offsetHeight > 0
        }))
      };
    };

    // Form navigation tester
    window.testFormNavigation = function() {
      const formElements = Array.from(document.querySelectorAll('input, select, textarea, button'))
        .filter(el => !el.disabled && el.offsetWidth > 0 && el.offsetHeight > 0);
      
      return formElements.map((el, index) => ({
        index: index,
        tagName: el.tagName,
        type: el.type || '',
        id: el.id || '',
        name: el.name || '',
        tabIndex: el.tabIndex,
        canReceiveFocus: el.tabIndex >= 0 || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName),
        isInTabOrder: el.tabIndex !== -1,
        form: el.form?.id || '',
        position: {
          x: el.getBoundingClientRect().left,
          y: el.getBoundingClientRect().top
        }
      }));
    };

    // Form organization analyzer
    window.analyzeFormOrganization = function() {
      const forms = Array.from(document.querySelectorAll('form'));
      
      return forms.map(form => {
        const formElements = Array.from(form.querySelectorAll('input, select, textarea, button'));
        const fieldsets = Array.from(form.querySelectorAll('fieldset'));
        const labels = Array.from(form.querySelectorAll('label'));
        
        return {
          id: form.id || '',
          name: form.name || '',
          action: form.action || '',
          method: form.method || '',
          autocomplete: form.autocomplete || '',
          novalidate: form.noValidate,
          elementCount: formElements.length,
          fieldsetCount: fieldsets.length,
          labelCount: labels.length,
          isVisible: form.offsetWidth > 0 && form.offsetHeight > 0,
          className: form.className || ''
        };
      });
    };
  });
}

/**
 * Test form labels and accessible names
 */
async function testFormLabels(page, results) {
  const formData = await page.evaluate(() => {
    const formElements = Array.from(document.querySelectorAll('input, select, textarea'));
    return formElements.map(element => window.analyzeFormElement(element));
  });
  
  results.formElements = formData;
  results.summary.labeledElements = formData.filter(el => el.hasAccessibleName).length;
  results.summary.unlabeledElements = formData.filter(el => !el.hasAccessibleName && el.isVisible).length;
  results.summary.requiredFields = formData.filter(el => el.isRequired).length;
  
  // Validate form labels
  formData.forEach(element => {
    if (element.isVisible && !element.hasAccessibleName && !element.placeholder && element.type !== 'hidden') {
      results.violations.push({
        type: 'form-missing-accessible-name',
        message: `Form ${element.tagName}${element.type ? `[type="${element.type}"]` : ''} missing accessible name`,
        element: element,
        severity: 'critical'
      });
    }
    
    // Check for placeholder-only labeling (WCAG violation)
    if (element.isVisible && !element.hasAccessibleName && element.placeholder) {
      results.violations.push({
        type: 'placeholder-only-label',
        message: `Form field relies only on placeholder for labeling (WCAG 2.2 violation)`,
        element: element,
        severity: 'serious'
      });
    }
    
    // Check for empty or missing label text
    element.labels.forEach(label => {
      if (label.missing) {
        results.violations.push({
          type: 'broken-label-reference',
          message: `aria-labelledby references missing element: ${label.id}`,
          element: element,
          severity: 'serious'
        });
      } else if (!label.text || label.text.length === 0) {
        results.violations.push({
          type: 'empty-form-label',
          message: `Form label is empty`,
          element: element,
          severity: 'serious'
        });
      }
    });
    
    // Check for duplicate IDs
    if (element.id) {
      const duplicates = formData.filter(el => el.id === element.id && el !== element);
      if (duplicates.length > 0) {
        results.violations.push({
          type: 'duplicate-form-id',
          message: `Duplicate form element ID: ${element.id}`,
          element: element,
          severity: 'serious'
        });
      }
    }

    // Check for appropriate input types
    if (element.type === 'text' && (element.name.toLowerCase().includes('email') || element.id.toLowerCase().includes('email'))) {
      results.violations.push({
        type: 'inappropriate-input-type',
        message: `Email field should use type="email" instead of type="text"`,
        element: element,
        severity: 'minor'
      });
    }

    if (element.type === 'text' && (element.name.toLowerCase().includes('phone') || element.id.toLowerCase().includes('phone'))) {
      results.violations.push({
        type: 'inappropriate-input-type',
        message: `Phone field should use type="tel" instead of type="text"`,
        element: element,
        severity: 'minor'
      });
    }
  });
}

/**
 * Test required field handling
 */
async function testRequiredFields(page, results) {
  const requiredFields = results.formElements.filter(el => el.isRequired);
  
  requiredFields.forEach(field => {
    // Check if required fields have proper indication
    const hasRequiredIndication = 
      field.labels.some(label => label.text?.includes('*') || 
                               label.text?.toLowerCase().includes('required') ||
                               label.text?.toLowerCase().includes('mandatory')) ||
      field.className.includes('required') ||
      field.title.toLowerCase().includes('required') ||
      field.hasErrorHandling;
    
    if (!hasRequiredIndication) {
      results.violations.push({
        type: 'required-field-not-indicated',
        message: `Required field not clearly indicated to users`,
        element: field,
        severity: 'moderate'
      });
    }
    
    // Check if required fields have error handling setup
    if (!field.hasErrorHandling && field.isVisible) {
      results.violations.push({
        type: 'required-field-no-error-handling',
        message: `Required field missing error handling (aria-describedby recommended)`,
        element: field,
        severity: 'moderate'
      });
    }

    // Check for aria-invalid attribute on required fields
    if (field.ariaInvalid && !['true', 'false', 'grammar', 'spelling'].includes(field.ariaInvalid)) {
      results.violations.push({
        type: 'invalid-aria-invalid-value',
        message: `Invalid aria-invalid value: "${field.ariaInvalid}"`,
        element: field,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Test error message association
 */
async function testErrorMessageAssociation(page, results) {
  const fieldsWithErrors = results.formElements.filter(el => el.hasErrorHandling);
  results.summary.fieldsWithErrorHandling = fieldsWithErrors.length;
  
  fieldsWithErrors.forEach(field => {
    field.errorElements.forEach(errorEl => {
      // Check if error element exists
      if (errorEl.missing) {
        results.violations.push({
          type: 'broken-error-association',
          message: `aria-describedby references missing element: ${errorEl.id}`,
          element: field,
          severity: 'serious'
        });
      } else {
        // Check if error message is meaningful
        if (!errorEl.text || errorEl.text.length < 3) {
          results.violations.push({
            type: 'meaningless-error-message',
            message: `Error message too short or empty: "${errorEl.text || ''}"`,
            element: field,
            severity: 'moderate'
          });
        }

        // Check if error message has appropriate role or live region
        if (errorEl.isError && !errorEl.role && !errorEl.className.includes('live')) {
          results.violations.push({
            type: 'error-message-no-announcement',
            message: `Error message may not be announced to screen readers (missing role="alert" or aria-live)`,
            element: field,
            severity: 'moderate'
          });
        }
      }
    });
  });
}

/**
 * Test fieldsets and legends
 */
async function testFieldsetsAndLegends(page, results) {
  const fieldsets = await page.evaluate(() => {
    const fieldsetElements = Array.from(document.querySelectorAll('fieldset'));
    return fieldsetElements.map(fieldset => window.analyzeFieldset(fieldset));
  });
  
  results.fieldsets = fieldsets;
  results.summary.fieldsetCount = fieldsets.length;
  
  fieldsets.forEach(fieldset => {
    if (fieldset.isVisible && !fieldset.hasLegend) {
      results.violations.push({
        type: 'fieldset-missing-legend',
        message: `Fieldset missing legend element`,
        element: fieldset,
        severity: 'moderate'
      });
    }
    
    if (fieldset.hasLegend && (!fieldset.legendText || fieldset.legendText.length === 0)) {
      results.violations.push({
        type: 'empty-fieldset-legend',
        message: `Fieldset legend is empty`,
        element: fieldset,
        severity: 'moderate'
      });
    }

    // Check for single-element fieldsets (usually unnecessary)
    if (fieldset.formElementCount === 1 && fieldset.isVisible) {
      results.violations.push({
        type: 'single-element-fieldset',
        message: `Fieldset contains only one form element (may be unnecessary grouping)`,
        element: fieldset,
        severity: 'minor'
      });
    }
  });
}

/**
 * Test validation announcements
 */
async function testValidationAnnouncements(page, results) {
  const validationData = await page.evaluate(() => {
    return window.checkValidationMessages();
  });
  
  results.validationMessages = validationData;
  results.summary.liveRegionCount = validationData.liveRegions.length;
  
  // Check for live regions for announcements
  if (validationData.liveRegions.length === 0 && results.summary.requiredFields > 0) {
    results.violations.push({
      type: 'missing-live-regions',
      message: `No live regions found for form validation announcements (consider adding aria-live regions)`,
      severity: 'moderate'
    });
  }
  
  // Check for visible error messages without proper IDs
  validationData.errorMessages.forEach(errorMsg => {
    if (errorMsg.isVisible && !errorMsg.id) {
      results.violations.push({
        type: 'error-message-no-id',
        message: `Visible error message missing ID for aria-describedby association`,
        element: errorMsg,
        severity: 'moderate'
      });
    }
  });

  // Check live region configurations
  validationData.liveRegions.forEach(region => {
    if (region.ariaLive === 'off') {
      results.violations.push({
        type: 'disabled-live-region',
        message: `Live region has aria-live="off" which disables announcements`,
        element: region,
        severity: 'moderate'
      });
    }
  });
}

/**
 * Test form keyboard navigation
 */
async function testFormKeyboardNavigation(page, results) {
  const navigationData = await page.evaluate(() => {
    return window.testFormNavigation();
  });
  
  // Check for logical tab order
  const tabbableElements = navigationData.filter(el => el.isInTabOrder);
  
  tabbableElements.forEach((element, index) => {
    // Check for positive tabindex (anti-pattern)
    if (element.tabIndex > 0) {
      results.violations.push({
        type: 'positive-tabindex',
        message: `Form element has positive tabindex (${element.tabIndex}), which can break natural tab order`,
        element: element,
        severity: 'moderate'
      });
    }

    // Check for elements that should be in tab order but aren't
    if (!element.canReceiveFocus && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(element.tagName)) {
      results.violations.push({
        type: 'form-element-not-focusable',
        message: `Form element cannot receive focus`,
        element: element,
        severity: 'serious'
      });
    }
  });

  // Check for logical spatial order (basic check)
  const sortedByPosition = [...tabbableElements].sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) > 50) {
      return a.position.y - b.position.y; // Sort by row first
    }
    return a.position.x - b.position.x; // Then by column
  });

  // Simple check: if order is very different from DOM order, flag it
  let orderMismatches = 0;
  sortedByPosition.forEach((element, spatialIndex) => {
    const domIndex = tabbableElements.findIndex(el => el.id === element.id && el.tagName === element.tagName);
    if (Math.abs(spatialIndex - domIndex) > 2) {
      orderMismatches++;
    }
  });

  if (orderMismatches > tabbableElements.length * 0.3) {
    results.violations.push({
      type: 'illogical-tab-order',
      message: `Tab order may not follow logical reading order (${orderMismatches} mismatches)`,
      severity: 'moderate'
    });
  }
}

/**
 * Test autocomplete attributes
 */
async function testAutocompleteAttributes(page, results) {
  const personalDataFields = results.formElements.filter(el => {
    const id = el.id.toLowerCase();
    const name = el.name.toLowerCase();
    const type = el.type.toLowerCase();
    
    return type === 'email' || 
           type === 'tel' || 
           type === 'password' ||
           id.includes('email') || 
           id.includes('phone') || 
           id.includes('name') || 
           id.includes('address') ||
           id.includes('password') ||
           name.includes('email') || 
           name.includes('phone') || 
           name.includes('name') ||
           name.includes('address') ||
           name.includes('password');
  });
  
  personalDataFields.forEach(field => {
    if (!field.autocomplete && field.isVisible) {
      results.violations.push({
        type: 'missing-autocomplete',
        message: `Personal data field missing autocomplete attribute (WCAG 2.2 AA requirement)`,
        element: field,
        severity: 'moderate'
      });
    }

    // Check for invalid autocomplete values
    if (field.autocomplete && field.autocomplete !== 'on' && field.autocomplete !== 'off') {
      const validTokens = [
        'name', 'given-name', 'family-name', 'email', 'username', 
        'new-password', 'current-password', 'tel', 'address-line1', 
        'address-line2', 'address-level1', 'address-level2', 'country',
        'postal-code', 'cc-name', 'cc-number', 'cc-exp', 'cc-csc'
      ];
      
      const tokens = field.autocomplete.split(' ');
      const invalidTokens = tokens.filter(token => 
        !validTokens.includes(token) && 
        !token.startsWith('section-') &&
        token !== 'billing' &&
        token !== 'shipping'
      );

      if (invalidTokens.length > 0) {
        results.violations.push({
          type: 'invalid-autocomplete-value',
          message: `Invalid autocomplete tokens: ${invalidTokens.join(', ')}`,
          element: field,
          severity: 'minor'
        });
      }
    }
  });
}

/**
 * Test form organization
 */
async function testFormOrganization(page, results) {
  const organizationData = await page.evaluate(() => {
    return window.analyzeFormOrganization();
  });
  
  results.formGroups = organizationData;
  
  organizationData.forEach(form => {
    // Check for forms without proper identification
    if (!form.id && !form.name && form.isVisible) {
      results.violations.push({
        type: 'form-missing-identification',
        message: `Form missing id or name attribute`,
        element: form,
        severity: 'minor'
      });
    }

    // Check for very large forms without fieldsets
    if (form.elementCount > 10 && form.fieldsetCount === 0) {
      results.violations.push({
        type: 'large-form-no-fieldsets',
        message: `Large form (${form.elementCount} elements) should use fieldsets for organization`,
        element: form,
        severity: 'moderate'
      });
    }

    // Check for forms with more labels than form elements (may indicate nested forms issue)
    if (form.labelCount > form.elementCount * 1.5) {
      results.violations.push({
        type: 'excess-labels',
        message: `Form has more labels (${form.labelCount}) than expected for form elements (${form.elementCount})`,
        element: form,
        severity: 'minor'
      });
    }
  });
}

/**
 * Run form accessibility testing across browsers
 */
async function runFormAccessibilityTests(url = 'http://localhost:3000') {
  console.log('🚀 Starting Form Accessibility Testing...\n');
  
  const browsers = ['chromium', 'firefox', 'webkit'];
  const allResults = [];
  
  for (const browserName of browsers) {
    console.log(`📝 Testing ${browserName}...`);
    
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
      const results = await testFormAccessibility(page, browserName, url);
      allResults.push(results);
      
      // Save individual results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = path.join('reports', `form-accessibility-${browserName}-${timestamp}.json`);
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
    testType: 'form-accessibility',
    timestamp: new Date().toISOString(),
    url: url,
    browsers: allResults.map(r => r.browser),
    summary: {
      totalBrowsers: allResults.length,
      totalViolations: allResults.reduce((sum, r) => sum + r.summary.violationCount, 0),
      totalFormElements: allResults.reduce((sum, r) => sum + r.summary.totalFormElements, 0),
      totalLabeledElements: allResults.reduce((sum, r) => sum + r.summary.labeledElements, 0),
      totalUnlabeledElements: allResults.reduce((sum, r) => sum + r.summary.unlabeledElements, 0),
      totalRequiredFields: allResults.reduce((sum, r) => sum + r.summary.requiredFields, 0),
      totalFieldsWithErrorHandling: allResults.reduce((sum, r) => sum + r.summary.fieldsWithErrorHandling, 0),
      overallPassed: allResults.every(r => r.passed)
    },
    results: allResults
  };
  
  const consolidatedPath = path.join('reports', `form-accessibility-consolidated-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(consolidatedPath, JSON.stringify(consolidatedResults, null, 2));
  
  console.log('\n📊 Form Accessibility Testing Summary:');
  console.log(`  🌐 Browsers tested: ${consolidatedResults.summary.totalBrowsers}`);
  console.log(`  📝 Total form elements: ${consolidatedResults.summary.totalFormElements}`);
  console.log(`  🏷️ Labeled elements: ${consolidatedResults.summary.totalLabeledElements}`);
  console.log(`  ❌ Unlabeled elements: ${consolidatedResults.summary.totalUnlabeledElements}`);
  console.log(`  ⚠️ Required fields: ${consolidatedResults.summary.totalRequiredFields}`);
  console.log(`  🔗 Fields with error handling: ${consolidatedResults.summary.totalFieldsWithErrorHandling}`);
  console.log(`  📝 Total violations: ${consolidatedResults.summary.totalViolations}`);
  console.log(`  ✅ Overall passed: ${consolidatedResults.summary.overallPassed ? 'Yes' : 'No'}`);
  console.log(`  💾 Consolidated report: ${consolidatedPath}`);
  
  return consolidatedResults;
}

// CLI execution
if (require.main === module) {
  const url = process.argv[2] || 'http://localhost:3000';
  
  runFormAccessibilityTests(url)
    .then(() => {
      console.log('\n🎉 Form accessibility testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Form accessibility testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testFormAccessibility, runFormAccessibilityTests }; 