#!/usr/bin/env node

/**
 * Form Accessibility Testing CLI Tool
 * Tests error handling, label association, and error message announcements
 */

const puppeteer = require('puppeteer');

class FormAccessibilityTester {
    constructor() {
        this.name = 'form-accessibility-tester';
        this.version = '1.0.0';
        this.description = 'Comprehensive form accessibility analysis tool';
        
        // Form accessibility patterns and rules
        this.formRules = {
            // Label association patterns
            labelAssociation: {
                explicitFor: /^[a-zA-Z][\w-]*$/,
                implicitNesting: true,
                ariaLabelling: ['aria-label', 'aria-labelledby', 'aria-describedby']
            },
            
            // Error message patterns
            errorMessages: {
                ariaInvalid: ['true', 'false'],
                ariaDescribedby: true,
                roleAlert: true,
                errorPatterns: [
                    /error/i, /invalid/i, /required/i, /must/i, 
                    /cannot/i, /failed/i, /wrong/i
                ]
            },
            
            // Fieldset and grouping rules
            fieldsetRules: {
                radioGroups: true,
                checkboxGroups: true,
                relatedFields: true,
                legendRequired: true
            }
        };
        
        // WCAG criteria mapping for form accessibility
        this.wcagMapping = {
            'missing-label': ['1.3.1', '3.3.2', '4.1.2'],
            'invalid-label-association': ['1.3.1', '3.3.2'],
            'missing-error-identification': ['3.3.1', '3.3.3'],
            'improper-error-association': ['3.3.1', '3.3.2'],
            'missing-fieldset': ['1.3.1', '3.3.2'],
            'missing-legend': ['1.3.1', '3.3.2'],
            'improper-grouping': ['1.3.1'],
            'missing-required-indication': ['3.3.2'],
            'inaccessible-form-validation': ['3.3.1', '3.3.3', '3.3.4'],
            'missing-input-purpose': ['1.3.5'],
            'improper-autocomplete': ['1.3.5'],
            'missing-form-instructions': ['3.3.2', '3.3.5']
        };
    }

    /**
     * Analyze a single URL for form accessibility issues
     */
    async analyzeUrl(url, options = {}) {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.setViewport({ width: 1280, height: 720 });
            
            console.log(`🔍 Analyzing form accessibility for: ${url}`);
            await page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });

            // Inject form analysis script
            await page.addScriptTag({ 
                content: this.getFormAnalysisScript() 
            });

            // Execute comprehensive form analysis
            const analysis = await page.evaluate(() => {
                return window.analyzeFormAccessibility();
            });

            // Test form submission workflows if forms are found
            let workflowResults = {};
            if (analysis.statistics.totalForms > 0) {
                console.log(`📝 Testing form submission workflows for ${analysis.statistics.totalForms} forms`);
                workflowResults = await this.testFormWorkflows(page, analysis.forms);
            }

            const processedResults = this.processFormResults(analysis, url, workflowResults);
            
            console.log(`✅ Form analysis completed for ${url}: ${processedResults.summary.totalIssues} issues found`);
            return processedResults;

        } catch (error) {
            console.error(`❌ Form analysis failed for ${url}:`, error.message);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Get the form analysis script to inject into the page
     */
    getFormAnalysisScript() {
        return `
            window.analyzeFormAccessibility = function() {
  const results = {
                    forms: [],
                    issues: [],
                    statistics: {
                        totalForms: 0,
                        formsWithIssues: 0,
                        totalInputs: 0,
                        inputsWithIssues: 0,
                        totalIssues: 0
                    }
                };

                // Find all forms on the page
                const forms = document.querySelectorAll('form, [role="form"]');
                results.statistics.totalForms = forms.length;

                forms.forEach((form, formIndex) => {
                    const formAnalysis = analyzeForm(form, formIndex);
                    results.forms.push(formAnalysis);
                    results.issues.push(...formAnalysis.issues);
                    
                    if (formAnalysis.issues.length > 0) {
                        results.statistics.formsWithIssues++;
                    }
                });

                // Analyze standalone form controls (not in forms)
                const standaloneInputs = document.querySelectorAll(
                    'input:not(form input), select:not(form select), textarea:not(form textarea)'
                );
                
                standaloneInputs.forEach((input, index) => {
                    const inputAnalysis = analyzeFormControl(input, \`standalone-\${index}\`);
                    results.issues.push(...inputAnalysis.issues);
                });

                results.statistics.totalIssues = results.issues.length;
                results.statistics.totalInputs = document.querySelectorAll('input, select, textarea').length;
                results.statistics.inputsWithIssues = results.issues.filter(issue => 
                    issue.type.includes('input') || issue.type.includes('control')
                ).length;

                return results;
            };

            function analyzeForm(form, formIndex) {
                const formData = {
                    index: formIndex,
                    id: form.id || \`form-\${formIndex}\`,
                    action: form.action || '',
                    method: form.method || 'GET',
                    controls: [],
                    issues: [],
                    fieldsets: [],
                    hasRequiredFields: false,
                    hasErrorHandling: false
                };

                // Analyze form controls
                const controls = form.querySelectorAll('input, select, textarea');
                controls.forEach((control, controlIndex) => {
                    const controlAnalysis = analyzeFormControl(control, \`\${formData.id}-control-\${controlIndex}\`);
                    formData.controls.push(controlAnalysis);
                    formData.issues.push(...controlAnalysis.issues);
                    
                    if (control.required || control.getAttribute('aria-required') === 'true') {
                        formData.hasRequiredFields = true;
                    }
                });

                // Analyze fieldsets and grouping
                const fieldsets = form.querySelectorAll('fieldset');
                fieldsets.forEach((fieldset, fieldsetIndex) => {
                    const fieldsetAnalysis = analyzeFieldset(fieldset, \`\${formData.id}-fieldset-\${fieldsetIndex}\`);
                    formData.fieldsets.push(fieldsetAnalysis);
                    formData.issues.push(...fieldsetAnalysis.issues);
                });

                // Check for radio button and checkbox grouping
                formData.issues.push(...checkRadioGrouping(form, formData.id));
                formData.issues.push(...checkCheckboxGrouping(form, formData.id));

                // Check for form-level error handling
                const errorElements = form.querySelectorAll('[role="alert"], .error, .invalid, [aria-invalid="true"]');
                formData.hasErrorHandling = errorElements.length > 0;

                // Check for form instructions
                formData.issues.push(...checkFormInstructions(form, formData.id));

                return formData;
            }

            function analyzeFormControl(control, controlId) {
                const controlData = {
                    id: controlId,
                    tagName: control.tagName.toLowerCase(),
                    type: control.type || '',
                    name: control.name || '',
                    required: control.required || control.getAttribute('aria-required') === 'true',
                    labels: [],
                    issues: []
                };

                // Check label association
                controlData.issues.push(...checkLabelAssociation(control, controlId));
                
                // Check error message association
                controlData.issues.push(...checkErrorAssociation(control, controlId));
                
                // Check required field indication
                if (controlData.required) {
                    controlData.issues.push(...checkRequiredIndication(control, controlId));
                }
                
                // Check autocomplete attributes
                controlData.issues.push(...checkAutocomplete(control, controlId));
                
                // Check input purpose and accessibility names
                controlData.issues.push(...checkInputPurpose(control, controlId));

                return controlData;
            }

            function checkLabelAssociation(control, controlId) {
                const issues = [];
      const labels = [];
      
                // Check for explicit label association (for attribute)
                const explicitLabels = document.querySelectorAll(\`label[for="\${control.id}"]\`);
                labels.push(...Array.from(explicitLabels));

                // Check for implicit label association (nested)
                const parentLabel = control.closest('label');
                if (parentLabel) {
                    labels.push(parentLabel);
                }

                // Check for ARIA labelling
                const ariaLabel = control.getAttribute('aria-label');
                const ariaLabelledby = control.getAttribute('aria-labelledby');
                const title = control.getAttribute('title');

                // Determine if control has proper labelling
                const hasProperLabel = labels.length > 0 || ariaLabel || ariaLabelledby;

                if (!hasProperLabel && control.type !== 'hidden' && control.type !== 'submit' && control.type !== 'button') {
                    issues.push({
                        type: 'missing-label',
                        severity: 'high',
                        wcag: ['1.3.1', '3.3.2', '4.1.2'],
                        message: \`Form control lacks proper label association\`,
                        element: getElementSelector(control),
                        controlId: controlId,
                        context: {
                            tagName: control.tagName,
                            type: control.type,
                            name: control.name,
                            id: control.id
                        }
                    });
                }

                // Check for label quality
                labels.forEach(label => {
                    const labelText = label.textContent.trim();
                    if (labelText.length === 0) {
                        issues.push({
                            type: 'empty-label',
                            severity: 'high',
                            wcag: ['1.3.1', '3.3.2'],
                            message: \`Label element is empty or contains no text\`,
                            element: getElementSelector(label),
                            controlId: controlId
                        });
                    } else if (labelText.length < 2) {
                        issues.push({
                            type: 'inadequate-label',
                            severity: 'medium',
                            wcag: ['3.3.2'],
                            message: \`Label text is too short to be meaningful\`,
                            element: getElementSelector(label),
                            controlId: controlId,
                            context: { labelText: labelText }
            });
          }
        });

                return issues;
            }

            function checkErrorAssociation(control, controlId) {
                const issues = [];
                const ariaInvalid = control.getAttribute('aria-invalid');
                const ariaDescribedby = control.getAttribute('aria-describedby');

                // Check if control is marked as invalid
                if (ariaInvalid === 'true') {
                    // Check for proper error message association
                    if (!ariaDescribedby) {
                        issues.push({
                            type: 'missing-error-association',
                            severity: 'high',
                            wcag: ['3.3.1', '3.3.2'],
                            message: \`Invalid control lacks aria-describedby reference to error message\`,
                            element: getElementSelector(control),
                            controlId: controlId
            });
          } else {
                        // Verify the referenced error message exists
                        const errorIds = ariaDescribedby.split(/\\s+/);
                        errorIds.forEach(errorId => {
                            const errorElement = document.getElementById(errorId);
                            if (!errorElement) {
                                issues.push({
                                    type: 'broken-error-reference',
                                    severity: 'high',
                                    wcag: ['3.3.1'],
                                    message: \`aria-describedby references non-existent error element\`,
                                    element: getElementSelector(control),
                                    controlId: controlId,
                                    context: { missingId: errorId }
            });
          }
        });
                    }
                }

                return issues;
            }

            function checkRequiredIndication(control, controlId) {
                const issues = [];
                const hasVisualIndicator = checkVisualRequiredIndicator(control);
                const hasAriaRequired = control.getAttribute('aria-required') === 'true';
                const hasRequiredAttribute = control.required;

                if (!hasVisualIndicator && (hasAriaRequired || hasRequiredAttribute)) {
                    issues.push({
                        type: 'missing-required-indication',
                        severity: 'medium',
                        wcag: ['3.3.2'],
                        message: \`Required field lacks visual indication for users\`,
                        element: getElementSelector(control),
                        controlId: controlId
                    });
                }

                return issues;
            }

            function checkVisualRequiredIndicator(control) {
                // Check for common visual required indicators
                const label = control.closest('label') || document.querySelector(\`label[for="\${control.id}"]\`);
                if (label) {
                    const labelText = label.textContent;
                    if (labelText.includes('*') || labelText.toLowerCase().includes('required')) {
                        return true;
                    }
                }

                // Check for required class or styling
                const hasRequiredClass = control.classList.contains('required') || 
                                       (label && label.classList.contains('required'));
                
                return hasRequiredClass;
            }

            function checkAutocomplete(control, controlId) {
                const issues = [];
                const autocomplete = control.getAttribute('autocomplete');
                const inputPurposeTypes = [
                    'name', 'email', 'username', 'tel', 'url', 'street-address',
                    'address-line1', 'address-line2', 'postal-code', 'country',
                    'cc-name', 'cc-number', 'cc-exp', 'cc-csc'
                ];

                // Check if input should have autocomplete
                const inputType = control.type || '';
                const inputName = control.name || '';
                const shouldHaveAutocomplete = inputPurposeTypes.some(purpose => 
                    inputType.includes(purpose) || inputName.toLowerCase().includes(purpose)
                );

                if (shouldHaveAutocomplete && !autocomplete) {
                    issues.push({
                        type: 'missing-autocomplete',
                        severity: 'low',
                        wcag: ['1.3.5'],
                        message: \`Input appears to collect personal data but lacks autocomplete attribute\`,
                        element: getElementSelector(control),
                        controlId: controlId,
                        context: {
                            suggestedAutocomplete: getSuggestedAutocomplete(inputType, inputName)
                        }
                    });
                }

                return issues;
            }

            function getSuggestedAutocomplete(inputType, inputName) {
                const name = inputName.toLowerCase();
                if (name.includes('email')) return 'email';
                if (name.includes('phone') || name.includes('tel')) return 'tel';
                if (name.includes('address')) return 'street-address';
                if (name.includes('postal') || name.includes('zip')) return 'postal-code';
                if (name.includes('country')) return 'country';
                if (name.includes('name')) return 'name';
                return inputType === 'email' ? 'email' : 'on';
            }

            function checkInputPurpose(control, controlId) {
                const issues = [];
                const accessibleName = getAccessibleName(control);

                if (!accessibleName && control.type !== 'hidden') {
                    issues.push({
                        type: 'missing-accessible-name',
                        severity: 'high',
                        wcag: ['4.1.2'],
                        message: \`Form control lacks accessible name\`,
                        element: getElementSelector(control),
                        controlId: controlId
                    });
                }

                return issues;
            }

            function getAccessibleName(element) {
                // Check aria-label
                const ariaLabel = element.getAttribute('aria-label');
                if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

                // Check aria-labelledby
                const ariaLabelledby = element.getAttribute('aria-labelledby');
                if (ariaLabelledby) {
                    const labelIds = ariaLabelledby.split(/\\s+/);
                    const labelTexts = labelIds.map(id => {
                        const el = document.getElementById(id);
                        return el ? el.textContent.trim() : '';
                    }).filter(text => text);
                    if (labelTexts.length > 0) return labelTexts.join(' ');
                }

                // Check explicit label
                const explicitLabel = document.querySelector(\`label[for="\${element.id}"]\`);
                if (explicitLabel && explicitLabel.textContent.trim()) {
                    return explicitLabel.textContent.trim();
                }

                // Check implicit label
                const implicitLabel = element.closest('label');
                if (implicitLabel && implicitLabel.textContent.trim()) {
                    return implicitLabel.textContent.trim();
                }

                // Check title attribute
                const title = element.getAttribute('title');
                if (title && title.trim()) return title.trim();

                return null;
            }

            function analyzeFieldset(fieldset, fieldsetId) {
                const fieldsetData = {
                    id: fieldsetId,
                    legend: null,
                    controls: [],
                    issues: []
                };

                // Check for legend
                const legend = fieldset.querySelector('legend');
                if (!legend) {
                    fieldsetData.issues.push({
                        type: 'missing-legend',
                        severity: 'high',
                        wcag: ['1.3.1', '3.3.2'],
                        message: \`Fieldset lacks required legend element\`,
                        element: getElementSelector(fieldset),
                        fieldsetId: fieldsetId
                    });
                } else {
                    fieldsetData.legend = legend.textContent.trim();
                    if (!fieldsetData.legend) {
                        fieldsetData.issues.push({
                            type: 'empty-legend',
                            severity: 'high',
                            wcag: ['1.3.1'],
                            message: \`Legend element is empty\`,
                            element: getElementSelector(legend),
                            fieldsetId: fieldsetId
                        });
                    }
                }

                return fieldsetData;
            }

            function checkRadioGrouping(form, formId) {
                const issues = [];
                const radioGroups = {};

                // Group radio buttons by name
                const radios = form.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    const name = radio.name;
                    if (name) {
                        if (!radioGroups[name]) {
                            radioGroups[name] = [];
                        }
                        radioGroups[name].push(radio);
                    }
                });

                // Check each radio group
                Object.keys(radioGroups).forEach(groupName => {
                    const group = radioGroups[groupName];
                    if (group.length > 1) {
                        // Check if radio group is properly contained in fieldset
                        const fieldsets = group.map(radio => radio.closest('fieldset')).filter(Boolean);
                        const uniqueFieldsets = [...new Set(fieldsets)];
                        
                        if (uniqueFieldsets.length === 0) {
                            issues.push({
                                type: 'ungrouped-radio-buttons',
                                severity: 'medium',
                                wcag: ['1.3.1', '3.3.2'],
                                message: \`Radio button group lacks fieldset grouping\`,
                                element: getElementSelector(group[0]),
                                formId: formId,
                                context: {
                                    groupName: groupName,
                                    radioCount: group.length
    }
  });
}
                    }
                });

                return issues;
            }

            function checkCheckboxGrouping(form, formId) {
                const issues = [];
                // Similar logic for checkbox groups when they represent related options
                return issues;
            }

            function checkFormInstructions(form, formId) {
                const issues = [];
                const hasRequiredFields = form.querySelectorAll('[required], [aria-required="true"]').length > 0;
                
                if (hasRequiredFields) {
                    // Check for form-level instructions about required fields
                    const instructionElements = form.querySelectorAll(
                        '.instructions, .form-instructions, [role="region"][aria-label*="instruction"]'
                    );
                    
                    if (instructionElements.length === 0) {
                        // Check if there's any mention of required field indicators
                        const formText = form.textContent.toLowerCase();
                        const hasRequiredMention = formText.includes('required') || 
                                                 formText.includes('mandatory') ||
                                                 formText.includes('asterisk') ||
                                                 formText.includes('*');
                        
                        if (!hasRequiredMention) {
                            issues.push({
                                type: 'missing-form-instructions',
                                severity: 'medium',
                                wcag: ['3.3.2'],
                                message: \`Form with required fields lacks instructions about required field indicators\`,
                                element: getElementSelector(form),
                                formId: formId
                            });
                        }
                    }
                }

                return issues;
            }

            function getElementSelector(element) {
                if (element.id) return \`#\${element.id}\`;
                if (element.className) return \`\${element.tagName.toLowerCase()}.\${element.className.split(' ')[0]}\`;
                return element.tagName.toLowerCase();
            }
        `;
    }

    /**
     * Test form submission workflows for accessibility
     */
    async testFormWorkflows(page, forms) {
        const workflowResults = {
            workflows_tested: 0,
            validation_tests: [],
            submission_tests: [],
            error_handling_tests: [],
            workflow_issues: []
        };

        for (let formIndex = 0; formIndex < forms.length; formIndex++) {
            const form = forms[formIndex];
            try {
                console.log(`🔄 Testing workflow for form ${form.id}`);
                
                // Test form validation workflow
                const validationResults = await this.testFormValidation(page, form, formIndex);
                workflowResults.validation_tests.push(validationResults);
                workflowResults.workflow_issues.push(...validationResults.issues);

                // Test form submission workflow
                const submissionResults = await this.testFormSubmission(page, form, formIndex);
                workflowResults.submission_tests.push(submissionResults);
                workflowResults.workflow_issues.push(...submissionResults.issues);

                // Test error handling workflow
                const errorResults = await this.testErrorHandling(page, form, formIndex);
                workflowResults.error_handling_tests.push(errorResults);
                workflowResults.workflow_issues.push(...errorResults.issues);

                workflowResults.workflows_tested++;

            } catch (error) {
                console.error(`❌ Workflow testing failed for form ${form.id}:`, error.message);
                workflowResults.workflow_issues.push({
                    type: 'workflow-test-error',
                    severity: 'medium',
                    wcag: ['3.3.1'],
                    message: `Failed to test form workflow: ${error.message}`,
                    formId: form.id,
                    context: { error: error.message }
          });
        }
      }

        return workflowResults;
    }

    /**
     * Test form validation accessibility
     */
    async testFormValidation(page, form, formIndex) {
        const results = {
            formId: form.id,
            formIndex: formIndex,
            validation_type: 'client_side',
            issues: [],
            tests_performed: []
        };

        try {
            // Test required field validation
            const requiredFields = await page.evaluate((formId) => {
                const form = document.getElementById(formId) || document.querySelectorAll('form')[parseInt(formId.split('-')[1]) || 0];
                if (!form) return [];
                
                return Array.from(form.querySelectorAll('[required], [aria-required="true"]')).map(field => ({
                    id: field.id || field.name || field.tagName.toLowerCase(),
                    tagName: field.tagName.toLowerCase(),
                    type: field.type || '',
                    name: field.name || '',
                    selector: field.id ? `#${field.id}` : `${field.tagName.toLowerCase()}[name="${field.name}"]`
                }));
            }, form.id);

            if (requiredFields.length > 0) {
                results.tests_performed.push('required_field_validation');
                
                for (const field of requiredFields) {
                    // Try to submit form with empty required field
                    await page.evaluate((selector) => {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.value = '';
                            element.focus();
                            element.blur();
                        }
                    }, field.selector);

                    // Wait a moment for validation to trigger
                    await page.waitForTimeout(500);

                    // Check for validation messages
                    const validationCheck = await page.evaluate((selector, fieldData) => {
                        const element = document.querySelector(selector);
                        if (!element) return { hasValidation: false };

                        const form = element.closest('form');
                        const issues = [];

                        // Check for HTML5 validation
                        const isInvalid = !element.checkValidity();
                        const validationMessage = element.validationMessage;

                        // Check for ARIA validation
                        const ariaInvalid = element.getAttribute('aria-invalid');
                        const ariaDescribedby = element.getAttribute('aria-describedby');

                        // Check for associated error messages
                        let errorElements = [];
                        if (ariaDescribedby) {
                            const ids = ariaDescribedby.split(/\s+/);
                            errorElements = ids.map(id => document.getElementById(id)).filter(Boolean);
                        }

                        // Look for nearby error messages
                        const nearbyErrors = form.querySelectorAll('.error, .invalid, [role="alert"]');

                        return {
                            hasValidation: isInvalid || ariaInvalid === 'true' || errorElements.length > 0,
                            validationMessage: validationMessage,
                            ariaInvalid: ariaInvalid,
                            errorElements: errorElements.length,
                            nearbyErrors: nearbyErrors.length,
                            fieldData: fieldData
                        };
                    }, field.selector, field);

                    if (!validationCheck.hasValidation) {
                        results.issues.push({
                            type: 'missing-validation-feedback',
                            severity: 'medium',
                            wcag: ['3.3.1', '3.3.3'],
                            message: `Required field lacks accessible validation feedback`,
                            element: field.selector,
                            formId: form.id,
                            context: {
                                fieldName: field.name,
                                fieldType: field.type
    }
  });
}

                    // Check if validation message is accessible
                    if (validationCheck.hasValidation && validationCheck.errorElements === 0 && validationCheck.ariaInvalid !== 'true') {
                        results.issues.push({
                            type: 'inaccessible-validation-message',
                            severity: 'high',
                            wcag: ['3.3.1', '4.1.3'],
                            message: `Validation message exists but is not programmatically associated with the field`,
                            element: field.selector,
                            formId: form.id,
                            context: {
                                validationMessage: validationCheck.validationMessage,
                                hasAriaInvalid: validationCheck.ariaInvalid === 'true'
                            }
                        });
                    }
                }
            }

            // Test custom validation patterns
            results.tests_performed.push('custom_validation_patterns');
            const customValidationCheck = await page.evaluate((formId) => {
                const form = document.getElementById(formId) || document.querySelectorAll('form')[parseInt(formId.split('-')[1]) || 0];
                if (!form) return { issues: [] };

                const issues = [];
                const inputs = form.querySelectorAll('input[pattern], input[type="email"], input[type="url"], input[type="tel"]');

                inputs.forEach(input => {
                    // Check if pattern validation has accessible description
                    if (input.hasAttribute('pattern')) {
                        const title = input.getAttribute('title');
                        const ariaDescribedby = input.getAttribute('aria-describedby');
                        
                        if (!title && !ariaDescribedby) {
                            issues.push({
                                type: 'missing-pattern-description',
                                element: input.id || input.name || input.tagName.toLowerCase(),
                                pattern: input.getAttribute('pattern')
                            });
                        }
                    }

                    // Check for input format guidance
                    if (['email', 'url', 'tel'].includes(input.type)) {
                        const hasGuidance = input.getAttribute('placeholder') || 
                                          input.getAttribute('aria-describedby') ||
                                          input.getAttribute('title');
                        
                        if (!hasGuidance) {
                            issues.push({
                                type: 'missing-format-guidance',
                                element: input.id || input.name || input.tagName.toLowerCase(),
                                inputType: input.type
                            });
                        }
                    }
                });

                return { issues };
            }, form.id);

            customValidationCheck.issues.forEach(issue => {
                results.issues.push({
                    type: issue.type,
                    severity: 'medium',
                    wcag: ['3.3.2', '3.3.5'],
                    message: issue.type === 'missing-pattern-description' 
                        ? 'Input with pattern validation lacks accessible description of expected format'
                        : 'Input field lacks guidance about expected format',
                    element: issue.element,
                    formId: form.id,
                    context: issue
                });
            });

        } catch (error) {
            console.error(`Error testing form validation for ${form.id}:`, error.message);
        }

        return results;
    }

    /**
     * Test form submission accessibility
     */
    async testFormSubmission(page, form, formIndex) {
        const results = {
            formId: form.id,
            formIndex: formIndex,
            submission_method: 'unknown',
            issues: [],
            tests_performed: []
        };

        try {
            // Analyze submission method and accessibility
            const submissionAnalysis = await page.evaluate((formId) => {
                const form = document.getElementById(formId) || document.querySelectorAll('form')[parseInt(formId.split('-')[1]) || 0];
                if (!form) return { issues: [] };

                const issues = [];
                const submitButtons = form.querySelectorAll('input[type="submit"], button[type="submit"], button:not([type])');
                
                // Check submit button accessibility
                submitButtons.forEach(button => {
                    const accessibleName = button.getAttribute('aria-label') ||
                                         button.getAttribute('aria-labelledby') ||
                                         button.textContent.trim() ||
                                         button.value ||
                                         button.getAttribute('title');

                    if (!accessibleName) {
                        issues.push({
                            type: 'submit-button-no-accessible-name',
                            element: button.id || button.className || button.tagName.toLowerCase()
                        });
                    }

                    // Check if button is disabled without proper indication
                    if (button.disabled && !button.getAttribute('aria-describedby')) {
                        issues.push({
                            type: 'disabled-submit-no-reason',
                            element: button.id || button.className || button.tagName.toLowerCase()
      });
    }
  });

                // Check for form submission feedback mechanisms
                const hasLoadingIndicator = form.querySelector('[role="status"], [aria-live], .loading, .spinner');
                const hasSuccessMessage = document.querySelector('[role="alert"], .success, .confirmation');

                return {
                    issues,
                    submitButtons: submitButtons.length,
                    hasLoadingIndicator: !!hasLoadingIndicator,
                    hasSuccessMessage: !!hasSuccessMessage,
                    formAction: form.action,
                    formMethod: form.method || 'GET'
                };
            }, form.id);

            results.submission_method = submissionAnalysis.formMethod;
            results.tests_performed.push('submit_button_analysis');

            submissionAnalysis.issues.forEach(issue => {
                results.issues.push({
                    type: issue.type,
                    severity: issue.type.includes('no-accessible-name') ? 'high' : 'medium',
                    wcag: issue.type.includes('no-accessible-name') ? ['4.1.2'] : ['3.3.4'],
                    message: issue.type === 'submit-button-no-accessible-name' 
                        ? 'Submit button lacks accessible name'
                        : 'Disabled submit button lacks explanation',
                    element: issue.element,
                    formId: form.id
                });
            });

            // Check for submission feedback
            if (!submissionAnalysis.hasLoadingIndicator) {
                results.issues.push({
                    type: 'missing-submission-feedback',
                    severity: 'low',
                    wcag: ['4.1.3'],
                    message: 'Form lacks loading indicator or status feedback during submission',
                    formId: form.id,
                    context: { 
                        recommendation: 'Add aria-live region or role="status" element for submission feedback' 
                    }
                });
            }

            results.tests_performed.push('submission_feedback_analysis');

        } catch (error) {
            console.error(`Error testing form submission for ${form.id}:`, error.message);
        }

        return results;
    }

    /**
     * Test error handling accessibility
     */
    async testErrorHandling(page, form, formIndex) {
        const results = {
            formId: form.id,
            formIndex: formIndex,
            error_scenarios_tested: 0,
            issues: [],
            tests_performed: []
        };

        try {
            // Test error message accessibility
            const errorAnalysis = await page.evaluate((formId) => {
                const form = document.getElementById(formId) || document.querySelectorAll('form')[parseInt(formId.split('-')[1]) || 0];
                if (!form) return { issues: [] };

                const issues = [];
                
                // Check for existing error messages and their accessibility
                const errorElements = form.querySelectorAll('.error, .invalid, [role="alert"], [aria-invalid="true"]');
                
                errorElements.forEach(errorEl => {
                    // Check if error is properly associated with a form control
                    const associatedControl = errorEl.id ? 
                        form.querySelector(`[aria-describedby*="${errorEl.id}"]`) : null;
                    
                    if (!associatedControl && errorEl.textContent.trim()) {
                        issues.push({
                            type: 'unassociated-error-message',
                            element: errorEl.id || errorEl.className || errorEl.tagName.toLowerCase(),
                            errorText: errorEl.textContent.trim().substring(0, 100)
                        });
                    }

                    // Check if error message is announced to screen readers
                    const hasProperRole = errorEl.getAttribute('role') === 'alert' ||
                                         errorEl.getAttribute('aria-live') ||
                                         errorEl.closest('[aria-live]');
                    
                    if (!hasProperRole) {
                        issues.push({
                            type: 'error-not-announced',
                            element: errorEl.id || errorEl.className || errorEl.tagName.toLowerCase(),
                            errorText: errorEl.textContent.trim().substring(0, 100)
                        });
                    }
                });

                // Check for form-level error summary
                const errorSummary = form.querySelector('.error-summary, [role="alert"][class*="summary"]') ||
                                   document.querySelector('.error-summary, [role="alert"][class*="summary"]');
                
                return {
                    issues,
                    hasErrorSummary: !!errorSummary,
                    errorCount: errorElements.length
                };
            }, form.id);

            results.tests_performed.push('error_message_analysis');

            errorAnalysis.issues.forEach(issue => {
                results.issues.push({
                    type: issue.type,
                    severity: 'high',
                    wcag: issue.type === 'unassociated-error-message' ? ['3.3.1', '3.3.2'] : ['4.1.3'],
                    message: issue.type === 'unassociated-error-message' 
                        ? 'Error message is not programmatically associated with form control'
                        : 'Error message may not be announced to assistive technologies',
                    element: issue.element,
                    formId: form.id,
                    context: {
                        errorText: issue.errorText
                    }
                });
            });

            // Check for error summary when multiple errors exist
            if (errorAnalysis.errorCount > 1 && !errorAnalysis.hasErrorSummary) {
                results.issues.push({
                    type: 'missing-error-summary',
                    severity: 'medium',
                    wcag: ['3.3.1', '3.3.4'],
                    message: 'Form with multiple errors lacks error summary',
                    formId: form.id,
                    context: {
                        errorCount: errorAnalysis.errorCount,
                        recommendation: 'Add error summary at top of form listing all validation issues'
                    }
                });
            }

            results.tests_performed.push('error_summary_analysis');
            results.error_scenarios_tested = 1;

        } catch (error) {
            console.error(`Error testing error handling for ${form.id}:`, error.message);
        }

        return results;
    }

    /**
     * Process and normalize form analysis results
     */
    processFormResults(analysis, url, workflowResults = {}) {
        const processedResults = {
            url: url,
            tool: 'form-accessibility-tester',
            timestamp: new Date().toISOString(),
            summary: {
                totalForms: analysis.statistics.totalForms,
                formsWithIssues: analysis.statistics.formsWithIssues,
                totalInputs: analysis.statistics.totalInputs,
                inputsWithIssues: analysis.statistics.inputsWithIssues,
                totalIssues: analysis.statistics.totalIssues,
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0,
                workflowsTested: workflowResults.workflows_tested || 0,
                workflowIssues: workflowResults.workflow_issues?.length || 0
            },
            forms: analysis.forms,
            violations: [],
            passes: [],
            workflows: workflowResults,
            coverage: {
                wcagCriteria: [],
                automatedTests: 0,
                manualReviewRequired: 0
            }
        };

        // Combine form analysis issues with workflow issues
        const allIssues = [...analysis.issues, ...(workflowResults.workflow_issues || [])];

        // Process each issue
        allIssues.forEach(issue => {
            // Categorize by severity
            switch (issue.severity) {
                case 'critical':
                    processedResults.summary.criticalIssues++;
          break;
                case 'high':
                    processedResults.summary.highIssues++;
          break;
                case 'medium':
                    processedResults.summary.mediumIssues++;
                    break;
                case 'low':
                    processedResults.summary.lowIssues++;
          break;
      }
      
            // Create violation entry
            const violation = {
                id: issue.type,
                description: issue.message,
                impact: issue.severity,
                tags: issue.wcag.map(criterion => `wcag${criterion.replace('.', '')}`),
                wcag: issue.wcag,
                nodes: [{
                    target: [issue.element],
                    html: issue.element,
                    impact: issue.severity
                }],
                help: this.getRemediationAdvice(issue.type),
                helpUrl: this.getHelpUrl(issue.type),
                metadata: {
                    formTester: true,
                    controlId: issue.controlId,
                    formId: issue.formId,
                    context: issue.context || {}
                }
            };

            processedResults.violations.push(violation);

            // Track WCAG criteria coverage
            issue.wcag.forEach(criterion => {
                if (!processedResults.coverage.wcagCriteria.includes(criterion)) {
                    processedResults.coverage.wcagCriteria.push(criterion);
                }
            });
        });

        processedResults.coverage.automatedTests = processedResults.violations.length;

        return processedResults;
    }

    /**
     * Get remediation advice for specific form accessibility issues
     */
    getRemediationAdvice(issueType) {
        const remediationMap = {
            'missing-label': 'Add a proper label element associated with the form control using the "for" attribute or nest the control within a label element. Alternatively, use aria-label or aria-labelledby.',
            'empty-label': 'Provide meaningful text content within the label element that clearly describes the purpose of the form control.',
            'inadequate-label': 'Expand the label text to provide a clear, descriptive name for the form control that users can understand.',
            'missing-error-association': 'When a form control has aria-invalid="true", use aria-describedby to reference the error message element.',
            'broken-error-reference': 'Ensure all IDs referenced in aria-describedby attributes exist in the DOM and point to error message elements.',
            'missing-required-indication': 'Provide a visual indication (such as asterisk or "required" text) for required form fields that is available to all users.',
            'missing-autocomplete': 'Add appropriate autocomplete attributes to help users fill forms more efficiently and accurately.',
            'missing-accessible-name': 'Ensure the form control has an accessible name through label, aria-label, aria-labelledby, or title attribute.',
            'missing-legend': 'Add a legend element as the first child of the fieldset to provide a descriptive heading for the group of related form controls.',
            'empty-legend': 'Provide meaningful text content within the legend element that describes the group of form controls.',
            'ungrouped-radio-buttons': 'Wrap related radio buttons in a fieldset element with an appropriate legend to indicate they are part of the same group.',
            'missing-form-instructions': 'Provide clear instructions at the beginning of the form explaining how required fields are indicated and any other important information.',
            
            // Workflow-specific remediation advice
            'missing-validation-feedback': 'Implement accessible validation feedback that appears when required fields are left empty. Use aria-invalid="true" and aria-describedby to associate error messages with form controls.',
            'inaccessible-validation-message': 'Ensure validation messages are programmatically associated with form controls using aria-describedby and aria-invalid attributes.',
            'missing-pattern-description': 'Provide accessible descriptions for input pattern requirements using title attribute or aria-describedby pointing to help text.',
            'missing-format-guidance': 'Add format guidance for specialized input types (email, phone, URL) using placeholder text, help text, or examples.',
            'submit-button-no-accessible-name': 'Provide an accessible name for submit buttons using button text content, value attribute, aria-label, or aria-labelledby.',
            'disabled-submit-no-reason': 'When submit buttons are disabled, provide an explanation using aria-describedby pointing to text explaining why submission is disabled.',
            'missing-submission-feedback': 'Add loading indicators or status messages during form submission using aria-live regions or role="status" elements.',
            'unassociated-error-message': 'Associate error messages with form controls using aria-describedby and ensure form controls have aria-invalid="true" when errors are present.',
            'error-not-announced': 'Ensure error messages are announced to screen readers by using role="alert" or aria-live="assertive" on error containers.',
            'missing-error-summary': 'For forms with multiple validation errors, provide an error summary at the top of the form listing all issues and linking to the problematic fields.',
            'workflow-test-error': 'Form workflow testing encountered an error. Ensure the form is functional and accessible for comprehensive analysis.'
        };

        return remediationMap[issueType] || 'Review the form accessibility requirements and ensure compliance with WCAG guidelines.';
    }

    /**
     * Get help URL for specific issue types
     */
    getHelpUrl(issueType) {
        const baseUrl = 'https://www.w3.org/WAI/WCAG21/Understanding/';
        const urlMap = {
            'missing-label': `${baseUrl}labels-or-instructions.html`,
            'missing-error-association': `${baseUrl}error-identification.html`,
            'missing-required-indication': `${baseUrl}labels-or-instructions.html`,
            'missing-fieldset': `${baseUrl}info-and-relationships.html`,
            'missing-form-instructions': `${baseUrl}help.html`
        };

        return urlMap[issueType] || `${baseUrl}conformance.html`;
    }

    /**
     * Get confidence level for form accessibility analysis
     */
    getConfidenceLevel() {
        return 'high'; // Form analysis is highly reliable for automated detection
    }

    /**
     * Get tool icon identifier
     */
    getToolIcon() {
        return 'form';
    }
}

module.exports = FormAccessibilityTester; 