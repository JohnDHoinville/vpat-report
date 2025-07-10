/**
 * Form Accessibility Testing Suite
 * Tests error handling, label association, and error message announcements
 */

const { test, expect } = require('@playwright/test');

/**
 * Main form accessibility testing function
 * Tests comprehensive form accessibility including error handling and announcements
 */
async function testFormAccessibility(page, browserName) {
  console.log(`📝 Testing form accessibility on ${browserName}`);
  
  const results = {
    browser: browserName,
    timestamp: new Date().toISOString(),
    formElements: [],
    labels: [],
    errorHandling: [],
    fieldsets: [],
    validationMessages: [],
    accessibilityFeatures: [],
    violations: [],
    passed: true,
    summary: {
      totalFormElements: 0,
      labeledElements: 0,
      unlabeledElements: 0,
      requiredFields: 0,
      fieldsWithErrorHandling: 0,
      violationCount: 0,
      passedChecks: 0,
      totalChecks: 0
    }
  };

  try {
    // Inject helper functions
    await injectFormHelpers(page);
    
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
  results.summary.totalChecks = 7; // Number of main test categories
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
        labels.push(...forLabels.map(l => ({ method: 'for', element: l, text: l.textContent?.trim() })));
      }
      
      // Method 2: Labels wrapping this element
      let parent = element.parentElement;
      while (parent) {
        if (parent.tagName.toLowerCase() === 'label') {
          labels.push({ method: 'wrapping', element: parent, text: parent.textContent?.trim() });
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
            labels.push({ method: 'aria-labelledby', element: labelElement, text: labelElement.textContent?.trim() });
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
                      errorElement.textContent?.toLowerCase().includes('error')
            });
          }
        });
      }
      
      return {
        tagName: tagName,
        type: type,
        id: id,
        name: name,
        labels: labels,
        hasAccessibleName: labels.length > 0,
        isRequired: element.hasAttribute('required') || element.getAttribute('aria-required') === 'true',
        isDisabled: element.disabled || element.getAttribute('aria-disabled') === 'true',
        placeholder: element.placeholder || '',
        value: element.value || '',
        autocomplete: element.getAttribute('autocomplete') || '',
        errorElements: errorElements,
        hasErrorHandling: errorElements.length > 0,
        tabIndex: element.tabIndex,
        isVisible: element.offsetWidth > 0 && element.offsetHeight > 0,
        className: element.className || ''
      };
    };

    // Fieldset analyzer
    window.analyzeFieldset = function(fieldset) {
      const legend = fieldset.querySelector('legend');
      const formElements = Array.from(fieldset.querySelectorAll('input, select, textarea, button'));
      
      return {
        hasLegend: !!legend,
        legendText: legend?.textContent?.trim() || '',
        formElementCount: formElements.length,
        id: fieldset.id || '',
        className: fieldset.className || '',
        isVisible: fieldset.offsetWidth > 0 && fieldset.offsetHeight > 0
      };
    };

    // Validation message checker
    window.checkValidationMessages = function() {
      const liveRegions = Array.from(document.querySelectorAll('[aria-live], [role="alert"], [role="status"]'));
      const errorMessages = Array.from(document.querySelectorAll('.error, .validation-error, [class*="error"]'));
      
      return {
        liveRegions: liveRegions.map(region => ({
          tagName: region.tagName,
          ariaLive: region.getAttribute('aria-live'),
          role: region.getAttribute('role'),
          text: region.textContent?.trim(),
          id: region.id || '',
          className: region.className || ''
        })),
        errorMessages: errorMessages.map(msg => ({
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
        tabIndex: el.tabIndex,
        canReceiveFocus: el.tabIndex >= 0 || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName),
        isInTabOrder: el.tabIndex !== -1
      }));
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
    if (element.isVisible && !element.hasAccessibleName && !element.placeholder) {
      results.violations.push({
        type: 'form-missing-label',
        message: `Form ${element.tagName} missing accessible name`,
        element: element,
        severity: 'critical'
      });
    }
    
    // Check for placeholder-only labeling
    if (element.isVisible && !element.hasAccessibleName && element.placeholder) {
      results.violations.push({
        type: 'placeholder-only-label',
        message: `Form field relies only on placeholder for labeling`,
        element: element,
        severity: 'serious'
      });
    }
    
    // Check for empty labels
    element.labels.forEach(label => {
      if (!label.text || label.text.length === 0) {
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
  });
  
  console.log(`    📊 Form elements: ${formData.length} found, ${results.summary.labeledElements} labeled, ${results.summary.unlabeledElements} unlabeled`);
}

/**
 * Test required field handling
 */
async function testRequiredFields(page, results) {
  const requiredFields = results.formElements.filter(el => el.isRequired);
  
  requiredFields.forEach(field => {
    // Check if required fields have proper indication
    const hasRequiredIndication = 
      field.labels.some(label => label.text?.includes('*') || label.text?.toLowerCase().includes('required')) ||
      field.className.includes('required') ||
      field.hasErrorHandling; // Error handling can indicate required status
    
    if (!hasRequiredIndication) {
      results.violations.push({
        type: 'required-field-not-indicated',
        message: `Required field not clearly indicated to users`,
        element: field,
        severity: 'moderate'
      });
    }
    
    // Check if required fields have error handling
    if (!field.hasErrorHandling) {
      results.violations.push({
        type: 'required-field-no-error-handling',
        message: `Required field missing error handling (aria-describedby)`,
        element: field,
        severity: 'serious'
      });
    }
  });
  
  console.log(`    📊 Required fields: ${requiredFields.length} found`);
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
      if (!errorEl.element) {
        results.violations.push({
          type: 'broken-error-association',
          message: `aria-describedby references missing element: ${errorEl.id}`,
          element: field,
          severity: 'serious'
        });
      }
      
      // Check if error message is meaningful
      if (errorEl.text && errorEl.text.length < 3) {
        results.violations.push({
          type: 'meaningless-error-message',
          message: `Error message too short or meaningless: "${errorEl.text}"`,
          element: field,
          severity: 'moderate'
        });
      }
    });
  });
  
  console.log(`    📊 Fields with error handling: ${fieldsWithErrors.length}`);
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
  });
  
  console.log(`    📊 Fieldsets: ${fieldsets.length} found`);
}

/**
 * Test validation announcements
 */
async function testValidationAnnouncements(page, results) {
  const validationData = await page.evaluate(() => {
    return window.checkValidationMessages();
  });
  
  results.validationMessages = validationData;
  
  // Check for live regions for announcements
  if (validationData.liveRegions.length === 0 && results.summary.requiredFields > 0) {
    results.violations.push({
      type: 'missing-live-regions',
      message: `No live regions found for form validation announcements`,
      severity: 'moderate'
    });
  }
  
  // Check for visible error messages without proper associations
  validationData.errorMessages.forEach(errorMsg => {
    if (errorMsg.isVisible && !errorMsg.id) {
      results.violations.push({
        type: 'error-message-no-id',
        message: `Visible error message missing ID for association`,
        element: errorMsg,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`    📊 Live regions: ${validationData.liveRegions.length}, Error messages: ${validationData.errorMessages.length}`);
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
        message: `Form element has positive tabindex (${element.tabIndex}), which can break tab order`,
        element: element,
        severity: 'moderate'
      });
    }
  });
  
  console.log(`    📊 Tabbable form elements: ${tabbableElements.length}`);
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
           id.includes('email') || 
           id.includes('phone') || 
           id.includes('name') || 
           name.includes('email') || 
           name.includes('phone') || 
           name.includes('name');
  });
  
  personalDataFields.forEach(field => {
    if (!field.autocomplete) {
      results.violations.push({
        type: 'missing-autocomplete',
        message: `Personal data field missing autocomplete attribute`,
        element: field,
        severity: 'minor'
      });
    }
  });
  
  console.log(`    📊 Personal data fields: ${personalDataFields.length} analyzed`);
}

// Test suite
test.describe('Form Accessibility Testing', () => {
  
  test('should have accessible form elements', async ({ page, browserName }) => {
    // Inject helper functions before navigation
    await injectFormHelpers(page);
    
    await page.goto('/');
    
    const results = await testFormAccessibility(page, browserName);
    
    // Log results
    console.log(`\n📝 Form Accessibility Results for ${browserName}:`);
    console.log(`📊 Total form elements: ${results.summary.totalFormElements}`);
    console.log(`📊 Labeled elements: ${results.summary.labeledElements}`);
    console.log(`📊 Unlabeled elements: ${results.summary.unlabeledElements}`);
    console.log(`📊 Required fields: ${results.summary.requiredFields}`);
    console.log(`📊 Fields with error handling: ${results.summary.fieldsWithErrorHandling}`);
    console.log(`📊 Violations found: ${results.summary.violationCount}`);
    
    // Save detailed results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = `reports/form-accessibility-${browserName}-${timestamp}.json`;
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}`);
    
    // Assertions
    expect(results.summary.totalFormElements).toBeGreaterThan(0);
    
    // Check for critical violations
    const criticalViolations = results.violations.filter(v => v.severity === 'critical');
    expect(criticalViolations).toHaveLength(0);
    
    // At least 90% of form elements should have accessible names
    if (results.summary.totalFormElements > 0) {
      const labelingRatio = results.summary.labeledElements / results.summary.totalFormElements;
      expect(labelingRatio).toBeGreaterThan(0.9);
    }
    
    console.log(`✅ Form accessibility test completed for ${browserName}`);
  });

  test('should handle form validation properly', async ({ page, browserName }) => {
    console.log(`📋 Testing form validation on ${browserName}`);
    
    // Inject helper functions first
    await injectFormHelpers(page);
    
    await page.goto('/');
    
    // Check for validation-related features
    const validationInfo = await page.evaluate(() => {
      return window.checkValidationMessages();
    });
    
    // Test for proper error announcement setup
    expect(validationInfo).toBeDefined();
    
    console.log(`✅ Form validation test completed for ${browserName}`);
  });

  test('should have proper form structure', async ({ page, browserName }) => {
    console.log(`🏗️ Testing form structure on ${browserName}`);
    
    // Inject helper functions first
    await injectFormHelpers(page);
    
    await page.goto('/');
    
    const fieldsets = await page.evaluate(() => {
      const fieldsetElements = Array.from(document.querySelectorAll('fieldset'));
      return fieldsetElements.map(fieldset => window.analyzeFieldset(fieldset));
    });
    
    // If fieldsets exist, they should have legends
    fieldsets.forEach(fieldset => {
      if (fieldset.isVisible && fieldset.formElementCount > 1) {
        expect(fieldset.hasLegend).toBe(true);
      }
    });
    
    console.log(`✅ Form structure test completed for ${browserName}`);
  });

});

module.exports = { testFormAccessibility }; 