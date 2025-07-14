/**
 * Requirement Test Mapping Service
 * Maps WCAG requirements to automated tools and manual test procedures
 * Provides unified interface for compliance sessions
 */

const { pool } = require('../config');

class RequirementTestMappingService {
    constructor() {
        this.automatedToolMappings = this.initializeAutomatedToolMappings();
        this.manualTestProcedures = this.initializeManualTestProcedures();
        this.wcagRequirements = this.initializeWCAGRequirements();
    }

    /**
     * Initialize comprehensive automated tool mappings
     */
    initializeAutomatedToolMappings() {
        return {
            'axe-core': {
                coverage: 'high',
                reliability: 'excellent',
                rules: {
                    'area-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'aria-allowed-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-command-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-hidden-body': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-hidden-focus': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-input-field-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-label': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-labelledby': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-required-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-required-children': { wcag: ['1.3.1'], confidence: 'high' },
                    'aria-required-parent': { wcag: ['1.3.1'], confidence: 'high' },
                    'aria-roles': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-toggle-field-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-valid-attr-value': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-valid-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'button-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'bypass': { wcag: ['2.4.1'], confidence: 'high' },
                    'color-contrast': { wcag: ['1.4.3', '1.4.6'], confidence: 'high' },
                    'definition-list': { wcag: ['1.3.1'], confidence: 'high' },
                    'dlitem': { wcag: ['1.3.1'], confidence: 'high' },
                    'document-title': { wcag: ['2.4.2'], confidence: 'high' },
                    'duplicate-id': { wcag: ['4.1.1'], confidence: 'high' },
                    'form-field-multiple-labels': { wcag: ['3.3.2'], confidence: 'high' },
                    'frame-title': { wcag: ['2.4.1'], confidence: 'high' },
                    'html-has-lang': { wcag: ['3.1.1'], confidence: 'high' },
                    'html-lang-valid': { wcag: ['3.1.1'], confidence: 'high' },
                    'image-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'input-image-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'label': { wcag: ['1.1.1', '1.3.1', '4.1.2'], confidence: 'high' },
                    'link-name': { wcag: ['2.4.4', '4.1.2'], confidence: 'high' },
                    'list': { wcag: ['1.3.1'], confidence: 'high' },
                    'listitem': { wcag: ['1.3.1'], confidence: 'high' },
                    'meta-refresh': { wcag: ['2.2.1', '2.2.4'], confidence: 'high' },
                    'meta-viewport': { wcag: ['1.4.4'], confidence: 'medium' },
                    'object-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'role-img-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'select-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'server-side-image-map': { wcag: ['2.1.1'], confidence: 'high' },
                    'svg-img-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'td-headers-attr': { wcag: ['1.3.1'], confidence: 'high' },
                    'th-has-data-cells': { wcag: ['1.3.1'], confidence: 'high' },
                    'valid-lang': { wcag: ['3.1.2'], confidence: 'high' },
                    // Add hover/focus automated detection rules
                    'aria-describedby-hover': { wcag: ['1.4.13'], confidence: 'medium' }
                }
            },
            'pa11y': {
                coverage: 'medium',
                reliability: 'good',
                rules: {
                    'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': { wcag: ['1.1.1'], confidence: 'high' },
                    'WCAG2AA.Principle1.Guideline1_3.1_3_1.H42.2': { wcag: ['1.3.1'], confidence: 'high' },
                    'WCAG2AA.Principle1.Guideline1_3.1_3_1.H43.ScopeCol': { wcag: ['1.3.1'], confidence: 'high' },
                    'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': { wcag: ['1.4.3'], confidence: 'high' },
                    'WCAG2AA.Principle2.Guideline2_4.2_4_1.H64.1': { wcag: ['2.4.1'], confidence: 'high' },
                    'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.NoTitleEl': { wcag: ['2.4.2'], confidence: 'high' },
                    'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2': { wcag: ['3.1.1'], confidence: 'high' },
                    'WCAG2AA.Principle4.Guideline4_1.4_1_1.F77': { wcag: ['4.1.1'], confidence: 'high' },
                    'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId': { wcag: ['4.1.2'], confidence: 'high' }
                }
            },
            'lighthouse': {
                coverage: 'medium',
                reliability: 'good',
                rules: {
                    'accesskeys': { wcag: ['2.4.1'], confidence: 'medium' },
                    'aria-allowed-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-command-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-hidden-body': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-hidden-focus': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-input-field-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-meter-name': { wcag: ['1.1.1'], confidence: 'high' },
                    'aria-progressbar-name': { wcag: ['1.1.1'], confidence: 'high' },
                    'aria-required-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-required-children': { wcag: ['1.3.1'], confidence: 'high' },
                    'aria-required-parent': { wcag: ['1.3.1'], confidence: 'high' },
                    'aria-roles': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-toggle-field-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-tooltip-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-treeitem-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-valid-attr-value': { wcag: ['4.1.2'], confidence: 'high' },
                    'aria-valid-attr': { wcag: ['4.1.2'], confidence: 'high' },
                    'button-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'bypass': { wcag: ['2.4.1'], confidence: 'high' },
                    'color-contrast': { wcag: ['1.4.3'], confidence: 'high' },
                    'definition-list': { wcag: ['1.3.1'], confidence: 'high' },
                    'dlitem': { wcag: ['1.3.1'], confidence: 'high' },
                    'document-title': { wcag: ['2.4.2'], confidence: 'high' },
                    'duplicate-id-active': { wcag: ['4.1.1'], confidence: 'high' },
                    'duplicate-id-aria': { wcag: ['4.1.1'], confidence: 'high' },
                    'form-field-multiple-labels': { wcag: ['3.3.2'], confidence: 'high' },
                    'frame-title': { wcag: ['2.4.1'], confidence: 'high' },
                    'heading-order': { wcag: ['1.3.1'], confidence: 'medium' },
                    'html-has-lang': { wcag: ['3.1.1'], confidence: 'high' },
                    'html-lang-valid': { wcag: ['3.1.1'], confidence: 'high' },
                    'image-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'input-image-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'label': { wcag: ['3.3.2'], confidence: 'high' },
                    'link-name': { wcag: ['2.4.4'], confidence: 'high' },
                    'list': { wcag: ['1.3.1'], confidence: 'high' },
                    'listitem': { wcag: ['1.3.1'], confidence: 'high' },
                    'meta-refresh': { wcag: ['2.2.1'], confidence: 'high' },
                    'meta-viewport': { wcag: ['1.4.4'], confidence: 'high' },
                    'object-alt': { wcag: ['1.1.1'], confidence: 'high' },
                    'select-name': { wcag: ['4.1.2'], confidence: 'high' },
                    'skip-link': { wcag: ['2.4.1'], confidence: 'high' },
                    'tabindex': { wcag: ['2.1.1'], confidence: 'medium' },
                    'td-headers-attr': { wcag: ['1.3.1'], confidence: 'high' },
                    'th-has-data-cells': { wcag: ['1.3.1'], confidence: 'high' },
                    'valid-lang': { wcag: ['3.1.2'], confidence: 'high' }
                }
            },
            'playwright': {
                coverage: 'high',
                reliability: 'excellent',
                rules: {
                    // Standard accessibility testing
                    'axe-integration': { wcag: ['1.1.1', '1.3.1', '1.4.3', '2.1.1', '2.4.1', '2.4.2', '3.1.1', '4.1.1', '4.1.2'], confidence: 'high' },
                    'keyboard-navigation': { wcag: ['2.1.1', '2.1.2', '2.4.3'], confidence: 'high' },
                    'focus-management': { wcag: ['2.4.3', '2.4.7'], confidence: 'high' },
                    'aria-live-regions': { wcag: ['4.1.3'], confidence: 'medium' },
                    
                    // Enhanced hover/focus content detection for 1.4.13
                    'hover-content-detection': { wcag: ['1.4.13'], confidence: 'medium' },
                    'focus-content-detection': { wcag: ['1.4.13'], confidence: 'medium' },
                    'tooltip-detection': { wcag: ['1.4.13'], confidence: 'low' },
                    'css-hover-analysis': { wcag: ['1.4.13'], confidence: 'low' },
                    
                    // Responsive and visual testing
                    'reflow-testing': { wcag: ['1.4.10'], confidence: 'high' },
                    'text-spacing-testing': { wcag: ['1.4.12'], confidence: 'high' },
                    'focus-visible-testing': { wcag: ['2.4.7'], confidence: 'high' },
                    'zoom-testing': { wcag: ['1.4.4'], confidence: 'high' }
                }
            },
            'contrast-analyzer': {
                coverage: 'focused',
                reliability: 'excellent',
                rules: {
                    'color-contrast-minimum': { wcag: ['1.4.3'], confidence: 'high' },
                    'color-contrast-enhanced': { wcag: ['1.4.6'], confidence: 'high' },
                    'non-text-contrast': { wcag: ['1.4.11'], confidence: 'high' }
                }
            }
        };
    }

    /**
     * Initialize manual test procedures for WCAG requirements
     */
    initializeManualTestProcedures() {
        return {
            '1.1.1': {
                title: 'Non-text Content',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Verify alt text accurately describes image content and purpose',
                    'Check decorative images have empty alt text (alt="")',
                    'Ensure complex images have adequate long descriptions',
                    'Test with screen reader to confirm alt text quality'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools'],
                estimatedTime: 15
            },
            '1.2.1': {
                title: 'Audio-only and Video-only (Prerecorded)',
                testMethod: 'manual',
                automatedCoverage: 'none',
                manualSteps: [
                    'Locate all audio-only content (podcasts, music, sound effects)',
                    'Verify text transcript is provided for audio-only content',
                    'Locate all video-only content (silent videos, animations)',
                    'Verify audio description or text alternative describes video content',
                    'Check that alternatives convey same information as original media'
                ],
                toolsNeeded: ['media_player', 'transcript_validator'],
                estimatedTime: 30
            },
            '1.2.2': {
                title: 'Captions (Prerecorded)',
                testMethod: 'manual',
                automatedCoverage: 'none',
                manualSteps: [
                    'Locate all prerecorded video content with audio',
                    'Verify captions are provided for all speech and important sounds',
                    'Check caption accuracy and synchronization',
                    'Ensure captions include speaker identification when needed',
                    'Test caption controls are keyboard accessible'
                ],
                toolsNeeded: ['media_player', 'caption_validator'],
                estimatedTime: 45
            },
            '1.3.1': {
                title: 'Info and Relationships',
                testMethod: 'hybrid',
                automatedCoverage: 'medium',
                manualSteps: [
                    'Check heading structure is logical and hierarchical',
                    'Verify form labels are properly associated with inputs',
                    'Test table headers are correctly associated with data cells',
                    'Ensure lists use proper markup (ul, ol, dl)',
                    'Verify semantic markup conveys relationships accurately'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools', 'accessibility_tree'],
                estimatedTime: 20
            },
            '1.4.1': {
                title: 'Use of Color',
                testMethod: 'manual',
                automatedCoverage: 'low',
                manualSteps: [
                    'Identify all instances where color conveys information',
                    'Check if alternative indicators exist (text, icons, patterns)',
                    'Test form validation errors have text descriptions',
                    'Verify required fields indicated by more than just color',
                    'Check charts/graphs have non-color identifiers'
                ],
                toolsNeeded: ['color_blindness_simulator'],
                estimatedTime: 25
            },
            '1.4.3': {
                title: 'Contrast (Minimum)',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Verify automated contrast results with manual testing',
                    'Check contrast for text over background images',
                    'Test contrast in different states (hover, focus, active)',
                    'Ensure large text (18pt+) meets 3:1 ratio',
                    'Verify normal text meets 4.5:1 ratio'
                ],
                toolsNeeded: ['contrast_analyzer', 'color_picker'],
                estimatedTime: 15
            },
            '1.4.13': {
                title: 'Content on Hover or Focus',
                testMethod: 'hybrid',
                automatedCoverage: 'medium',
                manualSteps: [
                    'Identify all hover-triggered content (tooltips, dropdowns, custom content)',
                    'Test that hover content can be dismissed using Escape key',
                    'Verify hover content stays visible when mouse moves to the triggered content',
                    'Check that focus-triggered content persists until user dismisses or removes trigger',
                    'Test that additional content doesn\'t interfere with page content',
                    'Ensure hover/focus content doesn\'t disappear on slight mouse movement',
                    'Verify ARIA attributes properly describe the relationship (aria-describedby, aria-expanded)',
                    'Test keyboard accessibility of dismiss mechanisms'
                ],
                toolsNeeded: ['keyboard_only', 'mouse', 'screen_reader'],
                estimatedTime: 30
            },
            '2.1.1': {
                title: 'Keyboard',
                testMethod: 'manual',
                automatedCoverage: 'low',
                manualSteps: [
                    'Navigate entire page using only keyboard',
                    'Verify all interactive elements are reachable',
                    'Check all functionality available via keyboard',
                    'Test custom controls have keyboard support',
                    'Ensure no keyboard traps exist'
                ],
                toolsNeeded: ['keyboard_only'],
                estimatedTime: 30
            },
            '2.1.2': {
                title: 'No Keyboard Trap',
                testMethod: 'manual',
                automatedCoverage: 'low',
                manualSteps: [
                    'Tab through all interactive elements',
                    'Check focus can move away from all components',
                    'Test modal dialogs allow focus to escape',
                    'Verify embedded content doesn\'t trap focus',
                    'Ensure standard navigation methods work'
                ],
                toolsNeeded: ['keyboard_only'],
                estimatedTime: 20
            },
            '2.4.1': {
                title: 'Bypass Blocks',
                testMethod: 'hybrid',
                automatedCoverage: 'medium',
                manualSteps: [
                    'Test skip links functionality with keyboard',
                    'Verify skip links are visible when focused',
                    'Check skip links navigate to correct targets',
                    'Test heading structure allows navigation',
                    'Ensure landmarks provide navigation options'
                ],
                toolsNeeded: ['keyboard_only', 'screen_reader'],
                estimatedTime: 15
            },
            '2.4.2': {
                title: 'Page Titled',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Verify page titles are descriptive and unique',
                    'Check titles describe page topic or purpose',
                    'Test titles help users orient within site',
                    'Ensure titles are updated for dynamic content'
                ],
                toolsNeeded: ['browser_dev_tools'],
                estimatedTime: 10
            },
            '2.4.3': {
                title: 'Focus Order',
                testMethod: 'manual',
                automatedCoverage: 'low',
                manualSteps: [
                    'Tab through page in logical reading order',
                    'Verify focus order matches visual layout',
                    'Check focus moves logically through related content',
                    'Test focus order preserved when content changes',
                    'Ensure focus order is meaningful and intuitive'
                ],
                toolsNeeded: ['keyboard_only'],
                estimatedTime: 25
            },
            '2.4.4': {
                title: 'Link Purpose (In Context)',
                testMethod: 'hybrid',
                automatedCoverage: 'medium',
                manualSteps: [
                    'Check link text describes destination or purpose',
                    'Verify context makes ambiguous links clear',
                    'Test screen reader announces meaningful link names',
                    'Ensure "click here" links have descriptive context',
                    'Check image links have appropriate alt text'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools'],
                estimatedTime: 20
            },
            '3.1.1': {
                title: 'Language of Page',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Verify lang attribute matches page content language',
                    'Check language declaration is accurate',
                    'Test screen reader pronounces content correctly',
                    'Ensure language changes are properly marked'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools'],
                estimatedTime: 10
            },
            '3.2.1': {
                title: 'On Focus',
                testMethod: 'manual',
                automatedCoverage: 'none',
                manualSteps: [
                    'Tab to each interactive element',
                    'Verify no unexpected context changes occur',
                    'Check focus doesn\'t trigger form submission',
                    'Ensure focus doesn\'t open new windows/tabs',
                    'Test focus doesn\'t change page content unexpectedly'
                ],
                toolsNeeded: ['keyboard_only'],
                estimatedTime: 20
            },
            '3.2.2': {
                title: 'On Input',
                testMethod: 'manual',
                automatedCoverage: 'none',
                manualSteps: [
                    'Test all form inputs and controls',
                    'Verify input doesn\'t trigger unexpected changes',
                    'Check form doesn\'t submit on input change',
                    'Ensure context changes are user-initiated',
                    'Test select menus don\'t auto-navigate'
                ],
                toolsNeeded: ['keyboard_only', 'mouse'],
                estimatedTime: 25
            },
            '3.3.1': {
                title: 'Error Identification',
                testMethod: 'manual',
                automatedCoverage: 'low',
                manualSteps: [
                    'Submit forms with invalid data',
                    'Verify errors are clearly identified',
                    'Check error messages describe the problem',
                    'Ensure errors are announced to screen readers',
                    'Test error location is clearly indicated'
                ],
                toolsNeeded: ['screen_reader', 'form_validator'],
                estimatedTime: 30
            },
            '3.3.2': {
                title: 'Labels or Instructions',
                testMethod: 'hybrid',
                automatedCoverage: 'medium',
                manualSteps: [
                    'Check all form inputs have labels or instructions',
                    'Verify labels clearly describe input purpose',
                    'Test required field indicators are clear',
                    'Ensure format requirements are explained',
                    'Check labels are properly associated with inputs'
                ],
                toolsNeeded: ['screen_reader', 'browser_dev_tools'],
                estimatedTime: 20
            },
            '4.1.1': {
                title: 'Parsing',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Validate HTML markup with W3C validator',
                    'Check for duplicate IDs in manual review',
                    'Verify proper nesting of HTML elements',
                    'Ensure all tags are properly closed',
                    'Test with assistive technologies for parsing issues'
                ],
                toolsNeeded: ['html_validator', 'screen_reader'],
                estimatedTime: 15
            },
            '4.1.2': {
                title: 'Name, Role, Value',
                testMethod: 'hybrid',
                automatedCoverage: 'high',
                manualSteps: [
                    'Test custom controls with screen reader',
                    'Verify ARIA roles are appropriate and announced',
                    'Check programmatic names are meaningful',
                    'Ensure state changes are announced',
                    'Test values are communicated to assistive technology'
                ],
                toolsNeeded: ['screen_reader', 'accessibility_tree'],
                estimatedTime: 25
            }
        };
    }

    /**
     * Initialize WCAG requirements metadata
     */
    initializeWCAGRequirements() {
        return {
            '1.1.1': { level: 'A', principle: 'Perceivable', guideline: '1.1' },
            '1.2.1': { level: 'A', principle: 'Perceivable', guideline: '1.2' },
            '1.2.2': { level: 'A', principle: 'Perceivable', guideline: '1.2' },
            '1.3.1': { level: 'A', principle: 'Perceivable', guideline: '1.3' },
            '1.4.1': { level: 'A', principle: 'Perceivable', guideline: '1.4' },
            '1.4.3': { level: 'AA', principle: 'Perceivable', guideline: '1.4' },
            '1.4.13': { level: 'AA', principle: 'Perceivable', guideline: '1.4' },
            '2.1.1': { level: 'A', principle: 'Operable', guideline: '2.1' },
            '2.1.2': { level: 'A', principle: 'Operable', guideline: '2.1' },
            '2.4.1': { level: 'A', principle: 'Operable', guideline: '2.4' },
            '2.4.2': { level: 'A', principle: 'Operable', guideline: '2.4' },
            '2.4.3': { level: 'A', principle: 'Operable', guideline: '2.4' },
            '2.4.4': { level: 'A', principle: 'Operable', guideline: '2.4' },
            '3.1.1': { level: 'A', principle: 'Understandable', guideline: '3.1' },
            '3.2.1': { level: 'A', principle: 'Understandable', guideline: '3.2' },
            '3.2.2': { level: 'A', principle: 'Understandable', guideline: '3.2' },
            '3.3.1': { level: 'A', principle: 'Understandable', guideline: '3.3' },
            '3.3.2': { level: 'A', principle: 'Understandable', guideline: '3.3' },
            '4.1.1': { level: 'A', principle: 'Robust', guideline: '4.1' },
            '4.1.2': { level: 'A', principle: 'Robust', guideline: '4.1' }
        };
    }

    /**
     * Get comprehensive mapping for a specific WCAG requirement
     */
    async getRequirementMapping(criterionNumber) {
        try {
            const requirement = this.wcagRequirements[criterionNumber];
            const manualProcedure = this.manualTestProcedures[criterionNumber];
            
            if (!requirement) {
                throw new Error(`WCAG requirement ${criterionNumber} not found`);
            }

            // Find automated tools that can test this requirement
            const automatedTools = [];
            Object.keys(this.automatedToolMappings).forEach(toolName => {
                const tool = this.automatedToolMappings[toolName];
                Object.keys(tool.rules).forEach(ruleId => {
                    const rule = tool.rules[ruleId];
                    if (rule.wcag.includes(criterionNumber)) {
                        automatedTools.push({
                            tool: toolName,
                            rule: ruleId,
                            confidence: rule.confidence,
                            coverage: tool.coverage,
                            reliability: tool.reliability
                        });
                    }
                });
            });

            return {
                criterionNumber,
                requirement,
                manualProcedure: manualProcedure || null,
                automatedTools,
                testStrategy: this.determineTestStrategy(criterionNumber, automatedTools, manualProcedure),
                estimatedEffort: this.calculateEstimatedEffort(automatedTools, manualProcedure)
            };

        } catch (error) {
            console.error('Error getting requirement mapping:', error);
            throw error;
        }
    }

    /**
     * Get all automated tools that can test a specific requirement
     */
    getAutomatedToolsForRequirement(criterionNumber) {
        const tools = [];
        
        Object.keys(this.automatedToolMappings).forEach(toolName => {
            const tool = this.automatedToolMappings[toolName];
            Object.keys(tool.rules).forEach(ruleId => {
                const rule = tool.rules[ruleId];
                if (rule.wcag.includes(criterionNumber)) {
                    tools.push({
                        tool: toolName,
                        rule: ruleId,
                        confidence: rule.confidence,
                        coverage: tool.coverage
                    });
                }
            });
        });

        return tools;
    }

    /**
     * Get manual test procedure for a specific requirement
     */
    getManualTestProcedure(criterionNumber) {
        return this.manualTestProcedures[criterionNumber] || null;
    }

    /**
     * Determine optimal test strategy for a requirement
     */
    determineTestStrategy(criterionNumber, automatedTools, manualProcedure) {
        const hasHighConfidenceAutomation = automatedTools.some(tool => tool.confidence === 'high');
        const hasAnyAutomation = automatedTools.length > 0;
        const hasManualProcedure = manualProcedure !== null;

        if (hasHighConfidenceAutomation && hasManualProcedure) {
            return {
                primary: 'hybrid',
                approach: 'automated_first',
                description: 'Run automated tests first, then manual verification for edge cases',
                automatedCoverage: manualProcedure.automatedCoverage || 'medium'
            };
        } else if (hasHighConfidenceAutomation) {
            return {
                primary: 'automated',
                approach: 'automated_sufficient',
                description: 'Automated testing provides reliable coverage',
                automatedCoverage: 'high'
            };
        } else if (hasAnyAutomation && hasManualProcedure) {
            return {
                primary: 'hybrid',
                approach: 'manual_primary',
                description: 'Manual testing required, automated tools provide supplementary checking',
                automatedCoverage: 'low'
            };
        } else if (hasManualProcedure) {
            return {
                primary: 'manual',
                approach: 'manual_only',
                description: 'Manual testing required, no reliable automated tools available',
                automatedCoverage: 'none'
            };
        } else {
            return {
                primary: 'unknown',
                approach: 'needs_research',
                description: 'No testing procedures defined for this requirement',
                automatedCoverage: 'unknown'
            };
        }
    }

    /**
     * Calculate estimated effort for testing a requirement
     */
    calculateEstimatedEffort(automatedTools, manualProcedure) {
        let automatedMinutes = 0;
        let manualMinutes = 0;

        // Automated tools typically add 1-3 minutes per tool
        if (automatedTools.length > 0) {
            automatedMinutes = Math.min(automatedTools.length * 2, 5); // Cap at 5 minutes
        }

        // Manual procedures have estimated time
        if (manualProcedure) {
            manualMinutes = manualProcedure.estimatedTime || 20;
        }

        return {
            automated: automatedMinutes,
            manual: manualMinutes,
            total: automatedMinutes + manualMinutes,
            breakdown: {
                automatedTools: automatedTools.length,
                manualSteps: manualProcedure ? manualProcedure.manualSteps.length : 0
            }
        };
    }

    /**
     * Get complete mapping for all WCAG requirements
     */
    async getAllRequirementMappings() {
        const mappings = {};
        
        for (const criterionNumber of Object.keys(this.wcagRequirements)) {
            try {
                mappings[criterionNumber] = await this.getRequirementMapping(criterionNumber);
            } catch (error) {
                console.error(`Error mapping requirement ${criterionNumber}:`, error);
                mappings[criterionNumber] = {
                    error: error.message,
                    criterionNumber
                };
            }
        }

        return mappings;
    }

    /**
     * Get requirements by test method
     */
    getRequirementsByTestMethod(testMethod) {
        const requirements = [];
        
        Object.keys(this.wcagRequirements).forEach(criterionNumber => {
            const manualProcedure = this.manualTestProcedures[criterionNumber];
            const automatedTools = this.getAutomatedToolsForRequirement(criterionNumber);
            const strategy = this.determineTestStrategy(criterionNumber, automatedTools, manualProcedure);
            
            if (strategy.primary === testMethod || 
                (testMethod === 'hybrid' && strategy.primary === 'hybrid')) {
                requirements.push({
                    criterionNumber,
                    requirement: this.wcagRequirements[criterionNumber],
                    strategy,
                    automatedTools: automatedTools.length,
                    hasManualProcedure: manualProcedure !== null
                });
            }
        });

        return requirements;
    }

    /**
     * Analyze automated test results and map to requirements
     */
    async analyzeAutomatedResults(testResults) {
        const requirementResults = {};
        
        // Initialize all requirements as not tested
        Object.keys(this.wcagRequirements).forEach(criterionNumber => {
            requirementResults[criterionNumber] = {
                status: 'not_tested',
                violations: [],
                toolsUsed: [],
                confidence: 'unknown'
            };
        });

        // Process results from each tool
        if (testResults.tools) {
            Object.keys(testResults.tools).forEach(toolName => {
                const toolResults = testResults.tools[toolName];
                this.processToolResults(toolName, toolResults, requirementResults);
            });
        }

        return requirementResults;
    }

    /**
     * Process results from a specific automated tool
     */
    processToolResults(toolName, toolResults, requirementResults) {
        const toolMapping = this.automatedToolMappings[toolName];
        if (!toolMapping) return;

        if (toolResults.violations) {
            toolResults.violations.forEach(violation => {
                const ruleId = violation.id || violation.code;
                const ruleMapping = toolMapping.rules[ruleId];
                
                if (ruleMapping) {
                    ruleMapping.wcag.forEach(criterionNumber => {
                        if (requirementResults[criterionNumber]) {
                            requirementResults[criterionNumber].violations.push({
                                tool: toolName,
                                rule: ruleId,
                                severity: violation.impact || violation.severity,
                                description: violation.description || violation.message,
                                confidence: ruleMapping.confidence
                            });
                            requirementResults[criterionNumber].status = 'violation';
                            if (!requirementResults[criterionNumber].toolsUsed.includes(toolName)) {
                                requirementResults[criterionNumber].toolsUsed.push(toolName);
                            }
                        }
                    });
                }
            });
        }

        // Mark requirements as passed if tool tested them but found no violations
        Object.keys(toolMapping.rules).forEach(ruleId => {
            const ruleMapping = toolMapping.rules[ruleId];
            ruleMapping.wcag.forEach(criterionNumber => {
                if (requirementResults[criterionNumber] && 
                    requirementResults[criterionNumber].status === 'not_tested') {
                    // Only mark as passed if we have evidence the tool ran
                    if (toolResults.passes || toolResults.violations || toolResults.incomplete) {
                        requirementResults[criterionNumber].status = 'passed';
                        requirementResults[criterionNumber].confidence = ruleMapping.confidence;
                        if (!requirementResults[criterionNumber].toolsUsed.includes(toolName)) {
                            requirementResults[criterionNumber].toolsUsed.push(toolName);
                        }
                    }
                }
            });
        });
    }
}

module.exports = RequirementTestMappingService; 