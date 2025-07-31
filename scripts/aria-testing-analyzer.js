/**
 * ARIA Testing Analyzer
 * Comprehensive ARIA attribute validation and widget state analysis
 * 
 * Features:
 * - ARIA attribute validation and consistency checking
 * - Complex widget state analysis (expandable, selectable, pressed, etc.)
 * - Live region and dynamic content validation
 * - ARIA relationship validation (describedby, labelledby, owns, controls)
 * - Widget role pattern validation
 * - Accessible name computation validation
 * - Dynamic state change detection
 */

const puppeteer = require('puppeteer');

class AriaTestingAnalyzer {
    constructor() {
        this.wcagCriteria = [
            '1.3.1', // Info and Relationships
            '2.1.1', // Keyboard
            '2.1.2', // No Keyboard Trap
            '2.4.3', // Focus Order
            '2.4.6', // Headings and Labels
            '2.4.7', // Focus Visible
            '3.2.2', // On Input
            '4.1.2', // Name, Role, Value
            '4.1.3'  // Status Messages
        ];

        this.ariaAttributes = {
            global: [
                'aria-atomic', 'aria-busy', 'aria-controls', 'aria-current',
                'aria-describedby', 'aria-details', 'aria-disabled',
                'aria-dropeffect', 'aria-errormessage', 'aria-flowto',
                'aria-grabbed', 'aria-haspopup', 'aria-hidden',
                'aria-invalid', 'aria-keyshortcuts', 'aria-label',
                'aria-labelledby', 'aria-live', 'aria-owns',
                'aria-relevant', 'aria-roledescription'
            ],
            widget: [
                'aria-autocomplete', 'aria-checked', 'aria-disabled',
                'aria-expanded', 'aria-haspopup', 'aria-hidden',
                'aria-invalid', 'aria-label', 'aria-level',
                'aria-multiline', 'aria-multiselectable', 'aria-orientation',
                'aria-placeholder', 'aria-pressed', 'aria-readonly',
                'aria-required', 'aria-selected', 'aria-sort',
                'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
                'aria-valuetext'
            ],
            live: [
                'aria-atomic', 'aria-busy', 'aria-live', 'aria-relevant'
            ],
            relationship: [
                'aria-activedescendant', 'aria-controls', 'aria-describedby',
                'aria-details', 'aria-errormessage', 'aria-flowto',
                'aria-labelledby', 'aria-owns'
            ]
        };

        this.validRoles = [
            // Document structure roles
            'article', 'columnheader', 'definition', 'directory', 'document',
            'group', 'heading', 'img', 'list', 'listitem', 'math', 'none',
            'note', 'presentation', 'region', 'rowheader', 'separator',
            'toolbar',
            
            // Landmark roles
            'banner', 'complementary', 'contentinfo', 'form', 'main',
            'navigation', 'region', 'search',
            
            // Widget roles
            'alert', 'alertdialog', 'button', 'checkbox', 'dialog',
            'gridcell', 'link', 'log', 'marquee', 'menuitem',
            'menuitemcheckbox', 'menuitemradio', 'option', 'progressbar',
            'radio', 'scrollbar', 'searchbox', 'slider', 'spinbutton',
            'status', 'switch', 'tab', 'tabpanel', 'textbox', 'timer',
            'tooltip', 'treeitem',
            
            // Composite widget roles
            'combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup',
            'tablist', 'tree', 'treegrid'
        ];

        this.widgetPatterns = {
            'button': {
                requiredStates: [],
                optionalStates: ['aria-pressed', 'aria-expanded', 'aria-haspopup'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby']
            },
            'checkbox': {
                requiredStates: ['aria-checked'],
                optionalStates: ['aria-disabled', 'aria-readonly'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-errormessage']
            },
            'combobox': {
                requiredStates: ['aria-expanded'],
                optionalStates: ['aria-disabled', 'aria-readonly', 'aria-required', 'aria-invalid'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant', 'aria-autocomplete']
            },
            'listbox': {
                requiredStates: [],
                optionalStates: ['aria-disabled', 'aria-readonly', 'aria-required', 'aria-multiselectable'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-orientation']
            },
            'option': {
                requiredStates: ['aria-selected'],
                optionalStates: ['aria-disabled'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby']
            },
            'tab': {
                requiredStates: ['aria-selected'],
                optionalStates: ['aria-disabled'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-controls']
            },
            'tabpanel': {
                requiredStates: [],
                optionalStates: [],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby']
            },
            'tree': {
                requiredStates: [],
                optionalStates: ['aria-disabled', 'aria-readonly', 'aria-multiselectable'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-orientation']
            },
            'treeitem': {
                requiredStates: ['aria-selected'],
                optionalStates: ['aria-disabled', 'aria-expanded'],
                requiredProperties: [],
                optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-level']
            }
        };
    }

    /**
     * Analyze URL for ARIA accessibility issues
     */
    async analyzeUrl(url, options = {}) {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        try {
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
            
            // Wait for dynamic content to load
            await page.waitForTimeout(2000);
            
            const analysis = await this.performAriaAnalysis(page);
            
            return this.processAriaResults(analysis, url, options);
            
        } catch (error) {
            console.error('ARIA analysis error:', error);
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Perform comprehensive ARIA analysis on page
     */
    async performAriaAnalysis(page) {
        return await page.evaluate(() => {
            const issues = [];
            const ariaElements = [];
            const widgetStates = [];
            const liveRegions = [];
            const relationships = [];

            // Inject helper functions into page context
            window.analyzeAriaAttributes = function(issues) {
                const elementsWithAria = document.querySelectorAll('[role], [aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-checked], [aria-selected], [aria-hidden], [aria-live], [aria-atomic], [aria-relevant], [aria-busy], [aria-controls], [aria-owns], [aria-activedescendant], [aria-errormessage], [aria-invalid], [aria-required], [aria-disabled], [aria-readonly], [aria-pressed], [aria-haspopup], [aria-current], [aria-valuemin], [aria-valuemax], [aria-valuenow], [aria-valuetext], [aria-orientation], [aria-sort], [aria-level], [aria-multiselectable], [aria-multiline], [aria-autocomplete], [aria-placeholder]');
                
                elementsWithAria.forEach(element => {
                    const elementInfo = {
                        element: element,
                        tagName: element.tagName.toLowerCase(),
                        role: element.getAttribute('role'),
                        ariaAttributes: {},
                        selector: this.generateSelector(element)
                    };

                    // Collect all ARIA attributes
                    Array.from(element.attributes).forEach(attr => {
                        if (attr.name.startsWith('aria-')) {
                            elementInfo.ariaAttributes[attr.name] = attr.value;
                        }
                    });

                    ariaElements.push(elementInfo);

                    // Validate role
                    this.validateRole(element, issues);

                    // Validate ARIA attributes
                    this.validateAriaAttributes(element, issues);

                    // Check for required ARIA properties
                    this.checkRequiredAriaProperties(element, issues);

                    // Validate ARIA relationships
                    this.validateAriaRelationships(element, issues);
                });
            };

            window.analyzeWidgetStates = function(issues) {
                // Analyze interactive widgets
                const widgets = document.querySelectorAll('[role="button"], [role="checkbox"], [role="radio"], [role="combobox"], [role="listbox"], [role="option"], [role="tab"], [role="tabpanel"], [role="tree"], [role="treeitem"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], button, input[type="checkbox"], input[type="radio"], select, [role="switch"]');
                
                widgets.forEach(widget => {
                    const widgetInfo = {
                        element: widget,
                        role: widget.getAttribute('role') || this.getImplicitRole(widget),
                        states: {},
                        selector: this.generateSelector(widget)
                    };

                    // Collect state information
                    ['aria-checked', 'aria-selected', 'aria-expanded', 'aria-pressed', 'aria-disabled', 'aria-readonly', 'aria-required', 'aria-invalid', 'aria-busy'].forEach(state => {
                        if (widget.hasAttribute(state)) {
                            widgetInfo.states[state] = widget.getAttribute(state);
                        }
                    });

                    widgetStates.push(widgetInfo);

                    // Validate widget patterns
                    this.validateWidgetPattern(widget, issues);

                    // Check state consistency
                    this.validateStateConsistency(widget, issues);

                    // Validate accessible name
                    this.validateAccessibleName(widget, issues);
                });
            };

            window.analyzeLiveRegions = function(issues) {
                // Find live regions
                const liveElements = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]');
                
                liveElements.forEach(element => {
                    const liveInfo = {
                        element: element,
                        role: element.getAttribute('role'),
                        live: element.getAttribute('aria-live'),
                        atomic: element.getAttribute('aria-atomic'),
                        relevant: element.getAttribute('aria-relevant'),
                        busy: element.getAttribute('aria-busy'),
                        selector: this.generateSelector(element)
                    };

                    liveRegions.push(liveInfo);

                    // Validate live region setup
                    this.validateLiveRegion(element, issues);

                    // Check for proper polite/assertive usage
                    this.validateLiveRegionPoliteness(element, issues);
                });
            };

            window.analyzeAriaRelationships = function(issues) {
                // Analyze ARIA relationship attributes
                const elementsWithRelationships = document.querySelectorAll('[aria-labelledby], [aria-describedby], [aria-controls], [aria-owns], [aria-activedescendant], [aria-errormessage], [aria-details], [aria-flowto]');
                
                elementsWithRelationships.forEach(element => {
                    const relationshipInfo = {
                        element: element,
                        selector: this.generateSelector(element),
                        relationships: {}
                    };

                    ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-errormessage', 'aria-details', 'aria-flowto'].forEach(attr => {
                        if (element.hasAttribute(attr)) {
                            relationshipInfo.relationships[attr] = element.getAttribute(attr);
                        }
                    });

                    relationships.push(relationshipInfo);

                    // Validate relationship targets exist
                    this.validateRelationshipTargets(element, issues);

                    // Check for circular references
                    this.checkCircularReferences(element, issues);
                });
            };

            // Role validation
            window.validateRole = function(element, issues) {
                const role = element.getAttribute('role');
                if (!role) return;

                const validRoles = ['alert', 'alertdialog', 'article', 'banner', 'button', 'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'dialog', 'directory', 'document', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'tablist', 'tabpanel', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'];

                if (!validRoles.includes(role)) {
                    issues.push({
                        type: 'invalid-aria-role',
                        severity: 'high',
                        message: `Invalid ARIA role: "${role}"`,
                        wcag: ['4.1.2'],
                        element: this.generateSelector(element),
                        context: {
                            role: role,
                            validRoles: validRoles.slice(0, 10).join(', ') + '...',
                            recommendation: 'Use a valid ARIA role from the ARIA specification'
                        }
                    });
                }

                // Check for conflicting implicit roles
                const implicitRole = this.getImplicitRole(element);
                if (implicitRole && implicitRole !== role && !['none', 'presentation'].includes(role)) {
                    // Only flag significant conflicts
                    const conflictingPairs = {
                        'button': ['link', 'checkbox', 'radio'],
                        'link': ['button', 'checkbox', 'radio'],
                        'checkbox': ['button', 'radio', 'switch'],
                        'radio': ['button', 'checkbox']
                    };

                    if (conflictingPairs[implicitRole] && conflictingPairs[implicitRole].includes(role)) {
                        issues.push({
                            type: 'conflicting-role',
                            severity: 'medium',
                            message: `Role "${role}" conflicts with implicit role "${implicitRole}"`,
                            wcag: ['4.1.2'],
                            element: this.generateSelector(element),
                            context: {
                                explicitRole: role,
                                implicitRole: implicitRole,
                                recommendation: 'Ensure the ARIA role matches the expected behavior of the element'
                            }
                        });
                    }
                }
            };

            // ARIA attribute validation
            window.validateAriaAttributes = function(element, issues) {
                Array.from(element.attributes).forEach(attr => {
                    if (!attr.name.startsWith('aria-')) return;

                    const attrName = attr.name;
                    const attrValue = attr.value;

                    // Check for empty values (except where allowed)
                    const allowedEmptyAttributes = ['aria-label', 'aria-valuetext', 'aria-placeholder'];
                    if (!attrValue.trim() && !allowedEmptyAttributes.includes(attrName)) {
                        issues.push({
                            type: 'empty-aria-attribute',
                            severity: 'medium',
                            message: `Empty ARIA attribute: ${attrName}`,
                            wcag: ['4.1.2'],
                            element: this.generateSelector(element),
                            context: {
                                attribute: attrName,
                                recommendation: 'Provide a meaningful value for ARIA attributes or remove them if not needed'
                            }
                        });
                    }

                    // Validate boolean attributes
                    const booleanAttributes = ['aria-checked', 'aria-disabled', 'aria-expanded', 'aria-hidden', 'aria-invalid', 'aria-multiline', 'aria-multiselectable', 'aria-pressed', 'aria-readonly', 'aria-required', 'aria-selected', 'aria-atomic', 'aria-busy'];
                    if (booleanAttributes.includes(attrName)) {
                        const validValues = ['true', 'false'];
                        if (attrName === 'aria-checked' || attrName === 'aria-pressed') {
                            validValues.push('mixed');
                        }
                        if (!validValues.includes(attrValue)) {
                            issues.push({
                                type: 'invalid-aria-boolean-value',
                                severity: 'high',
                                message: `Invalid boolean value for ${attrName}: "${attrValue}"`,
                                wcag: ['4.1.2'],
                                element: this.generateSelector(element),
                                context: {
                                    attribute: attrName,
                                    value: attrValue,
                                    validValues: validValues.join(', '),
                                    recommendation: 'Use valid boolean values for ARIA state attributes'
                                }
                            });
                        }
                    }

                    // Validate enumerated attributes
                    const enumeratedAttributes = {
                        'aria-autocomplete': ['none', 'inline', 'list', 'both'],
                        'aria-current': ['page', 'step', 'location', 'date', 'time', 'true', 'false'],
                        'aria-dropeffect': ['none', 'copy', 'execute', 'link', 'move', 'popup'],
                        'aria-haspopup': ['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog'],
                        'aria-live': ['off', 'polite', 'assertive'],
                        'aria-orientation': ['horizontal', 'vertical', 'undefined'],
                        'aria-relevant': ['additions', 'removals', 'text', 'all'],
                        'aria-sort': ['none', 'ascending', 'descending', 'other']
                    };

                    if (enumeratedAttributes[attrName]) {
                        const validValues = enumeratedAttributes[attrName];
                        if (!validValues.includes(attrValue)) {
                            issues.push({
                                type: 'invalid-aria-enumerated-value',
                                severity: 'high',
                                message: `Invalid value for ${attrName}: "${attrValue}"`,
                                wcag: ['4.1.2'],
                                element: this.generateSelector(element),
                                context: {
                                    attribute: attrName,
                                    value: attrValue,
                                    validValues: validValues.join(', '),
                                    recommendation: 'Use valid enumerated values for ARIA attributes'
                                }
                            });
                        }
                    }

                    // Validate numeric attributes
                    const numericAttributes = ['aria-level', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'];
                    if (numericAttributes.includes(attrName)) {
                        const numValue = parseFloat(attrValue);
                        if (isNaN(numValue)) {
                            issues.push({
                                type: 'invalid-aria-numeric-value',
                                severity: 'high',
                                message: `Non-numeric value for ${attrName}: "${attrValue}"`,
                                wcag: ['4.1.2'],
                                element: this.generateSelector(element),
                                context: {
                                    attribute: attrName,
                                    value: attrValue,
                                    recommendation: 'Provide numeric values for ARIA attributes that expect numbers'
                                }
                            });
                        }
                    }
                });
            };

            // Widget pattern validation
            window.validateWidgetPattern = function(element, issues) {
                const role = element.getAttribute('role') || this.getImplicitRole(element);
                if (!role) return;

                const patterns = {
                    'button': {
                        requiredStates: [],
                        optionalStates: ['aria-pressed', 'aria-expanded', 'aria-haspopup'],
                        requiredProperties: [],
                        optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby']
                    },
                    'checkbox': {
                        requiredStates: ['aria-checked'],
                        optionalStates: ['aria-disabled', 'aria-readonly'],
                        requiredProperties: [],
                        optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby']
                    },
                    'combobox': {
                        requiredStates: ['aria-expanded'],
                        optionalStates: ['aria-disabled', 'aria-readonly', 'aria-required', 'aria-invalid'],
                        requiredProperties: [],
                        optionalProperties: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant']
                    }
                };

                const pattern = patterns[role];
                if (!pattern) return;

                // Check required states
                pattern.requiredStates.forEach(requiredState => {
                    if (!element.hasAttribute(requiredState)) {
                        issues.push({
                            type: 'missing-required-aria-state',
                            severity: 'high',
                            message: `Missing required ARIA state ${requiredState} for role ${role}`,
                            wcag: ['4.1.2'],
                            element: this.generateSelector(element),
                            context: {
                                role: role,
                                missingState: requiredState,
                                recommendation: `Add ${requiredState} attribute to properly indicate the widget's state`
                            }
                        });
                    }
                });
            };

            // Accessible name validation
            window.validateAccessibleName = function(element, issues) {
                const role = element.getAttribute('role') || this.getImplicitRole(element);
                
                // Elements that require accessible names
                const requiresName = ['button', 'link', 'checkbox', 'radio', 'combobox', 'listbox', 'option', 'tab', 'treeitem', 'menuitem'];
                
                if (requiresName.includes(role)) {
                    const hasAccessibleName = this.hasAccessibleName(element);
                    
                    if (!hasAccessibleName) {
                        issues.push({
                            type: 'missing-accessible-name',
                            severity: 'high',
                            message: `Element with role ${role} lacks an accessible name`,
                            wcag: ['4.1.2', '2.4.6'],
                            element: this.generateSelector(element),
                            context: {
                                role: role,
                                recommendation: 'Provide an accessible name using aria-label, aria-labelledby, or visible text content'
                            }
                        });
                    }
                }
            };

            // Live region validation
            window.validateLiveRegion = function(element, issues) {
                const liveValue = element.getAttribute('aria-live');
                const role = element.getAttribute('role');
                
                // Check for appropriate aria-live usage
                if (liveValue && !['polite', 'assertive', 'off'].includes(liveValue)) {
                    issues.push({
                        type: 'invalid-aria-live-value',
                        severity: 'high',
                        message: `Invalid aria-live value: "${liveValue}"`,
                        wcag: ['4.1.3'],
                        element: this.generateSelector(element),
                        context: {
                            value: liveValue,
                            validValues: 'polite, assertive, off',
                            recommendation: 'Use valid aria-live values to properly announce dynamic content changes'
                        }
                    });
                }

                // Check for conflicting live region roles
                const liveRoles = ['alert', 'status', 'log', 'marquee', 'timer'];
                if (role && liveRoles.includes(role) && liveValue && liveValue !== 'off') {
                    const implicitLiveValues = {
                        'alert': 'assertive',
                        'status': 'polite',
                        'log': 'polite',
                        'marquee': 'off',
                        'timer': 'off'
                    };
                    
                    if (liveValue !== implicitLiveValues[role]) {
                        issues.push({
                            type: 'conflicting-live-region-values',
                            severity: 'medium',
                            message: `aria-live="${liveValue}" conflicts with role="${role}" implicit value`,
                            wcag: ['4.1.3'],
                            element: this.generateSelector(element),
                            context: {
                                role: role,
                                explicitValue: liveValue,
                                implicitValue: implicitLiveValues[role],
                                recommendation: 'Remove redundant aria-live attribute or ensure it matches the role\'s implicit behavior'
                            }
                        });
                    }
                }
            };

            // Relationship validation
            window.validateRelationshipTargets = function(element, issues) {
                const relationshipAttrs = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-errormessage', 'aria-details'];
                
                relationshipAttrs.forEach(attr => {
                    const value = element.getAttribute(attr);
                    if (!value) return;

                    const ids = value.split(/\s+/);
                    ids.forEach(id => {
                        if (!id.trim()) return;
                        
                        const target = document.getElementById(id);
                        if (!target) {
                            issues.push({
                                type: 'broken-aria-reference',
                                severity: 'high',
                                message: `${attr} references non-existent element with id "${id}"`,
                                wcag: ['4.1.2'],
                                element: this.generateSelector(element),
                                context: {
                                    attribute: attr,
                                    targetId: id,
                                    recommendation: 'Ensure all ARIA relationship targets exist in the DOM'
                                }
                            });
                        }
                    });
                });
            };

            // Helper functions
            window.generateSelector = function(element) {
                if (element.id) {
                    return '#' + element.id;
                }
                if (element.className) {
                    return element.tagName.toLowerCase() + '.' + element.className.split(' ')[0];
                }
                return element.tagName.toLowerCase();
            };

            window.getImplicitRole = function(element) {
                const implicitRoles = {
                    'button': 'button',
                    'a[href]': 'link',
                    'input[type="checkbox"]': 'checkbox',
                    'input[type="radio"]': 'radio',
                    'input[type="text"]': 'textbox',
                    'input[type="email"]': 'textbox',
                    'input[type="password"]': 'textbox',
                    'input[type="search"]': 'searchbox',
                    'input[type="tel"]': 'textbox',
                    'input[type="url"]': 'textbox',
                    'select': 'combobox',
                    'textarea': 'textbox',
                    'h1': 'heading',
                    'h2': 'heading',
                    'h3': 'heading',
                    'h4': 'heading',
                    'h5': 'heading',
                    'h6': 'heading',
                    'img[alt]': 'img',
                    'ul': 'list',
                    'ol': 'list',
                    'li': 'listitem',
                    'nav': 'navigation',
                    'main': 'main',
                    'aside': 'complementary',
                    'section': 'region',
                    'header': 'banner',
                    'footer': 'contentinfo'
                };

                const tagName = element.tagName.toLowerCase();
                
                // Check for attribute-specific roles
                if (tagName === 'a' && element.hasAttribute('href')) return 'link';
                if (tagName === 'img' && element.hasAttribute('alt')) return 'img';
                if (tagName === 'input') {
                    const type = element.getAttribute('type') || 'text';
                    return implicitRoles[`input[type="${type}"]`] || 'textbox';
                }
                
                return implicitRoles[tagName] || null;
            };

            window.hasAccessibleName = function(element) {
                // Check for aria-label
                if (element.getAttribute('aria-label')) return true;
                
                // Check for aria-labelledby
                const labelledby = element.getAttribute('aria-labelledby');
                if (labelledby) {
                    const ids = labelledby.split(/\s+/);
                    for (const id of ids) {
                        const labelElement = document.getElementById(id);
                        if (labelElement && labelElement.textContent.trim()) {
                            return true;
                        }
                    }
                }
                
                // Check for text content
                if (element.textContent && element.textContent.trim()) return true;
                
                // Check for alt attribute on images
                if (element.tagName.toLowerCase() === 'img' && element.getAttribute('alt')) return true;
                
                // Check for associated label
                if (element.tagName.toLowerCase() === 'input') {
                    const id = element.id;
                    if (id) {
                        const label = document.querySelector(`label[for="${id}"]`);
                        if (label && label.textContent.trim()) return true;
                    }
                    
                    // Check for wrapping label
                    const parentLabel = element.closest('label');
                    if (parentLabel && parentLabel.textContent.trim()) return true;
                }
                
                return false;
            };

            // Perform all analyses
            this.analyzeAriaAttributes(issues);
            this.analyzeWidgetStates(issues);
            this.analyzeLiveRegions(issues);
            this.analyzeAriaRelationships(issues);

            return {
                issues: issues,
                ariaElements: ariaElements,
                widgetStates: widgetStates,
                liveRegions: liveRegions,
                relationships: relationships,
                statistics: {
                    totalAriaElements: ariaElements.length,
                    totalWidgets: widgetStates.length,
                    totalLiveRegions: liveRegions.length,
                    totalRelationships: relationships.length,
                    totalIssues: issues.length,
                    criticalIssues: issues.filter(i => i.severity === 'critical').length,
                    highIssues: issues.filter(i => i.severity === 'high').length,
                    mediumIssues: issues.filter(i => i.severity === 'medium').length,
                    lowIssues: issues.filter(i => i.severity === 'low').length
                }
            };
        });
    }

    /**
     * Process and format ARIA analysis results
     */
    processAriaResults(analysis, url, options = {}) {
        const processedResults = {
            url: url,
            tool: 'aria-testing-analyzer',
            timestamp: new Date().toISOString(),
            summary: {
                totalAriaElements: analysis.statistics.totalAriaElements,
                totalWidgets: analysis.statistics.totalWidgets,
                totalLiveRegions: analysis.statistics.totalLiveRegions,
                totalRelationships: analysis.statistics.totalRelationships,
                totalIssues: analysis.statistics.totalIssues,
                criticalIssues: analysis.statistics.criticalIssues,
                highIssues: analysis.statistics.highIssues,
                mediumIssues: analysis.statistics.mediumIssues,
                lowIssues: analysis.statistics.lowIssues,
                widgetPatternViolations: 0,
                liveRegionIssues: 0,
                relationshipIssues: 0,
                accessibleNameIssues: 0
            },
            ariaElements: analysis.ariaElements,
            widgetStates: analysis.widgetStates,
            liveRegions: analysis.liveRegions,
            relationships: analysis.relationships,
            violations: [],
            passes: [],
            coverage: {
                wcagCriteria: this.wcagCriteria,
                automatedTests: 0,
                manualReviewRequired: 0
            }
        };

        // Process each issue
        analysis.issues.forEach(issue => {
            // Categorize issues for enhanced statistics
            if (issue.type.includes('widget') || issue.type.includes('state') || issue.type.includes('pattern')) {
                processedResults.summary.widgetPatternViolations++;
            }
            
            if (issue.type.includes('live') || issue.type.includes('status')) {
                processedResults.summary.liveRegionIssues++;
            }
            
            if (issue.type.includes('reference') || issue.type.includes('relationship') || issue.type.includes('controls') || issue.type.includes('labelledby') || issue.type.includes('describedby')) {
                processedResults.summary.relationshipIssues++;
            }
            
            if (issue.type.includes('accessible-name') || issue.type.includes('label')) {
                processedResults.summary.accessibleNameIssues++;
            }

            // Convert to violation format
            const violation = {
                id: issue.type,
                impact: this.mapSeverityToImpact(issue.severity),
                tags: issue.wcag,
                description: issue.message,
                help: this.getRemediationAdvice(issue.type),
                helpUrl: this.getHelpUrl(issue.wcag),
                nodes: issue.element ? [{
                    target: [issue.element],
                    html: issue.element,
                    failureSummary: issue.message
                }] : [],
                context: issue.context || {},
                category: this.categorizeAriaIssue(issue.type)
            };

            processedResults.violations.push(violation);
        });

        // Calculate coverage metrics
        processedResults.coverage.automatedTests = processedResults.violations.length;
        processedResults.coverage.manualReviewRequired = this.calculateManualReview(analysis);

        return processedResults;
    }

    /**
     * Categorize ARIA issues by type
     */
    categorizeAriaIssue(issueType) {
        if (issueType.includes('role')) {
            return 'aria-roles';
        }
        if (issueType.includes('attribute') || issueType.includes('state') || issueType.includes('property')) {
            return 'aria-attributes';
        }
        if (issueType.includes('widget') || issueType.includes('pattern')) {
            return 'widget-patterns';
        }
        if (issueType.includes('live') || issueType.includes('status')) {
            return 'live-regions';
        }
        if (issueType.includes('reference') || issueType.includes('relationship')) {
            return 'aria-relationships';
        }
        if (issueType.includes('name') || issueType.includes('label')) {
            return 'accessible-names';
        }
        return 'aria-compliance';
    }

    /**
     * Map severity levels to impact
     */
    mapSeverityToImpact(severity) {
        const severityMap = {
            'critical': 'critical',
            'high': 'serious',
            'medium': 'moderate',
            'low': 'minor'
        };
        return severityMap[severity] || 'moderate';
    }

    /**
     * Get remediation advice for ARIA issues
     */
    getRemediationAdvice(issueType) {
        const remediationMap = {
            // Role issues
            'invalid-aria-role': 'Use a valid ARIA role from the ARIA specification. Check the latest ARIA 1.1 or 1.2 specification for supported roles.',
            'conflicting-role': 'Ensure the ARIA role matches the expected behavior and semantics of the HTML element.',
            
            // Attribute issues
            'empty-aria-attribute': 'Provide meaningful values for ARIA attributes or remove them if not needed.',
            'invalid-aria-boolean-value': 'Use valid boolean values (true, false, or mixed where applicable) for ARIA state attributes.',
            'invalid-aria-enumerated-value': 'Use valid enumerated values as specified in the ARIA specification.',
            'invalid-aria-numeric-value': 'Provide numeric values for ARIA attributes that expect numbers.',
            
            // Widget pattern issues
            'missing-required-aria-state': 'Add required ARIA state attributes to properly indicate the widget\'s current state.',
            'invalid-widget-pattern': 'Follow established ARIA authoring practices for widget implementation.',
            
            // Accessible name issues
            'missing-accessible-name': 'Provide an accessible name using aria-label, aria-labelledby, or visible text content.',
            
            // Live region issues
            'invalid-aria-live-value': 'Use valid aria-live values (polite, assertive, or off) to properly announce dynamic content changes.',
            'conflicting-live-region-values': 'Remove redundant aria-live attributes or ensure they match the role\'s implicit behavior.',
            
            // Relationship issues
            'broken-aria-reference': 'Ensure all ARIA relationship targets exist in the DOM with valid IDs.',
            'circular-aria-reference': 'Avoid circular references in ARIA relationships that could confuse assistive technologies.',
            
            // State consistency
            'inconsistent-widget-state': 'Ensure widget states are consistent with visual appearance and expected behavior.'
        };

        return remediationMap[issueType] || 'Review ARIA implementation against WCAG guidelines and ARIA authoring practices.';
    }

    /**
     * Get help URL for WCAG criteria
     */
    getHelpUrl(wcagCriteria) {
        if (wcagCriteria && wcagCriteria.length > 0) {
            const criterion = wcagCriteria[0].replace('.', '-');
            return `https://www.w3.org/WAI/WCAG21/Understanding/${criterion}.html`;
        }
        return 'https://www.w3.org/WAI/ARIA/apg/';
    }

    /**
     * Calculate manual review requirements
     */
    calculateManualReview(analysis) {
        let manualReview = 0;
        
        // Complex widgets need manual review for behavior
        manualReview += analysis.widgetStates.length;
        
        // Live regions need manual testing for announcements
        manualReview += analysis.liveRegions.length;
        
        // Relationships need context validation
        manualReview += analysis.relationships.length;
        
        return manualReview;
    }
}

module.exports = AriaTestingAnalyzer; 