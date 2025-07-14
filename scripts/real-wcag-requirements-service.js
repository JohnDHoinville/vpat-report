/**
 * Real WCAG Requirements Service
 * Provides accurate WCAG 2.2 criteria with realistic automated testing capabilities
 * Maps to actual capabilities of axe-core, pa11y, lighthouse, playwright, and other tools
 */

class RealWCAGRequirementsService {
    constructor() {
        this.wcag22Requirements = this.loadRealWCAG22Requirements();
        this.toolCapabilities = this.loadToolCapabilities();
    }

    /**
     * Get real WCAG 2.2 requirements with accurate automated testing mappings
     */
    getRealWCAGRequirements() {
        return this.wcag22Requirements;
    }

    /**
     * Get requirements filtered by test method
     */
    getRequirementsByTestMethod(testMethod) {
        return this.wcag22Requirements.filter(req => req.test_method === testMethod);
    }

    /**
     * Get requirements that can be automated by specific tool
     */
    getRequirementsByTool(toolName) {
        return this.wcag22Requirements.filter(req => 
            req.automated_tools && req.automated_tools.includes(toolName)
        );
    }

    /**
     * Get automation statistics
     */
    getAutomationStatistics() {
        const total = this.wcag22Requirements.length;
        const automated = this.wcag22Requirements.filter(req => req.test_method === 'automated').length;
        const both = this.wcag22Requirements.filter(req => req.test_method === 'both').length;
        const manual = this.wcag22Requirements.filter(req => req.test_method === 'manual').length;

        return {
            total,
            automated,
            both,
            manual,
            automatedPercentage: Math.round((automated / total) * 100),
            hybridPercentage: Math.round((both / total) * 100),
            manualPercentage: Math.round((manual / total) * 100)
        };
    }

    /**
     * Load real WCAG 2.2 requirements with accurate testing capabilities
     */
    loadRealWCAG22Requirements() {
        return [
            // Level A Requirements
            {
                criterion_number: '1.1.1',
                title: 'Non-text Content',
                description: 'All non-text content has a text alternative that serves the equivalent purpose',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['image-alt', 'area-alt', 'input-image-alt', 'object-alt', 'svg-img-alt'],
                automation_confidence: 'high',
                manual_verification_needed: 'Alt text appropriateness and context relevance',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.3.1',
                title: 'Info and Relationships',
                description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['list', 'listitem', 'definition-list', 'dlitem', 'aria-required-children', 'aria-required-parent', 'landmark-unique'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Visual relationship accuracy and complex data structures',
                principle: 'Perceivable'
            },
            {
                criterion_number: '2.1.1',
                title: 'Keyboard',
                description: 'All functionality of the content is operable through a keyboard interface',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['keyboard-navigation', 'tabindex', 'focus-management'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Complex interactions, custom controls, and keyboard accessibility',
                principle: 'Operable'
            },
            {
                criterion_number: '2.1.2',
                title: 'No Keyboard Trap',
                description: 'Keyboard focus can be moved away from any component',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['no-keyboard-trap', 'focus-management'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Complex modal dialogs and custom focus management',
                principle: 'Operable'
            },
            {
                criterion_number: '2.4.1',
                title: 'Bypass Blocks',
                description: 'A mechanism is available to bypass blocks of content',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['bypass', 'skip-link'],
                automation_confidence: 'high',
                manual_verification_needed: 'Skip link functionality and target verification',
                principle: 'Operable'
            },
            {
                criterion_number: '2.4.2',
                title: 'Page Titled',
                description: 'Web pages have titles that describe topic or purpose',
                level: 'A',
                test_method: 'automated',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['document-title'],
                automation_confidence: 'high',
                manual_verification_needed: null,
                principle: 'Operable'
            },
            {
                criterion_number: '2.4.3',
                title: 'Focus Order',
                description: 'If a page can be navigated sequentially, components receive focus in an order that preserves meaning',
                level: 'A',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Complete focus order evaluation and meaning preservation',
                principle: 'Operable'
            },
            {
                criterion_number: '2.4.4',
                title: 'Link Purpose (In Context)',
                description: 'The purpose of each link can be determined from the link text alone or together with its context',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'lighthouse'],
                automated_rules: ['link-name'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Link purpose clarity and context appropriateness',
                principle: 'Operable'
            },
            {
                criterion_number: '3.1.1',
                title: 'Language of Page',
                description: 'The default human language of each Web page can be programmatically determined',
                level: 'A',
                test_method: 'automated',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['html-has-lang', 'html-lang-valid'],
                automation_confidence: 'high',
                manual_verification_needed: null,
                principle: 'Understandable'
            },
            {
                criterion_number: '3.2.1',
                title: 'On Focus',
                description: 'When any component receives focus, it does not initiate a change of context',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['no-onchange', 'focus-management'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Context change evaluation and unexpected behavior',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.2.2',
                title: 'On Input',
                description: 'Changing the setting of any user interface component does not automatically cause a change of context',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['no-auto-refresh'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Input-triggered context changes and user expectation',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.3.1',
                title: 'Error Identification',
                description: 'If an input error is automatically detected, the item that is in error is identified',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core'],
                automated_rules: ['aria-describedby-id-refs'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Error message clarity and identification effectiveness',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.3.2',
                title: 'Labels or Instructions',
                description: 'Labels or instructions are provided when content requires user input',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['label', 'form-field-multiple-labels'],
                automation_confidence: 'high',
                manual_verification_needed: 'Label and instruction clarity and adequacy',
                principle: 'Understandable'
            },
            {
                criterion_number: '4.1.1',
                title: 'Parsing',
                description: 'In content implemented using markup languages, elements have complete start and end tags',
                level: 'A',
                test_method: 'automated',
                automated_tools: ['axe-core', 'pa11y'],
                automated_rules: ['duplicate-id'],
                automation_confidence: 'high',
                manual_verification_needed: null,
                principle: 'Robust'
            },
            {
                criterion_number: '4.1.2',
                title: 'Name, Role, Value',
                description: 'For all user interface components, the name and role can be programmatically determined',
                level: 'A',
                test_method: 'both',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse'],
                automated_rules: ['aria-roles', 'aria-valid-attr', 'button-name', 'select-name', 'aria-required-attr'],
                automation_confidence: 'high',
                manual_verification_needed: 'Semantic appropriateness and complex component behavior',
                principle: 'Robust'
            },

            // Level AA Requirements
            {
                criterion_number: '1.4.3',
                title: 'Contrast (Minimum)',
                description: 'Text and images of text have a contrast ratio of at least 4.5:1',
                level: 'AA',
                test_method: 'automated',
                automated_tools: ['axe-core', 'pa11y', 'lighthouse', 'contrast-analyzer'],
                automated_rules: ['color-contrast'],
                automation_confidence: 'high',
                manual_verification_needed: null,
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.4',
                title: 'Resize Text',
                description: 'Text can be resized without assistive technology up to 200% without loss of content or functionality',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['zoom-testing'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Content usability and functionality at 200% zoom',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.5',
                title: 'Images of Text',
                description: 'If technologies can achieve the same visual presentation, text is used to convey information rather than images of text',
                level: 'AA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Complete evaluation of images containing text and customization requirements',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.10',
                title: 'Reflow',
                description: 'Content can be presented without loss of information or functionality at 320 CSS pixels width',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['reflow-testing'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Content usability and information loss assessment at 320px width',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.11',
                title: 'Non-text Contrast',
                description: 'Visual presentation of UI components and graphical objects have a contrast ratio of at least 3:1',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['contrast-analyzer'],
                automated_rules: ['non-text-contrast'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Complex graphics, logos, and interactive element states',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.12',
                title: 'Text Spacing',
                description: 'No loss of content or functionality occurs when text spacing is increased',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['text-spacing-testing'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Readability and content overlap assessment with increased spacing',
                principle: 'Perceivable'
            },
            {
                criterion_number: '1.4.13',
                title: 'Content on Hover or Focus',
                description: 'Additional content that appears on hover or focus is dismissible, hoverable, and persistent',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['playwright'],
                automated_rules: ['hover-content-detection', 'focus-content-detection'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Complex interaction patterns and dismissibility verification',
                principle: 'Perceivable'
            },
            {
                criterion_number: '2.4.6',
                title: 'Headings and Labels',
                description: 'Headings and labels describe topic or purpose',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['axe-core', 'lighthouse'],
                automated_rules: ['heading-order', 'page-has-heading-one'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Heading and label descriptiveness evaluation',
                principle: 'Operable'
            },
            {
                criterion_number: '2.4.7',
                title: 'Focus Visible',
                description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['focus-visible', 'focus-visible-testing'],
                automation_confidence: 'high',
                manual_verification_needed: 'Focus indicator visibility in all contexts and custom styling',
                principle: 'Operable'
            },
            {
                criterion_number: '3.1.2',
                title: 'Language of Parts',
                description: 'The human language of each passage or phrase in the content can be programmatically determined',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['axe-core'],
                automated_rules: ['valid-lang'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Language change identification and appropriateness in context',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.2.3',
                title: 'Consistent Navigation',
                description: 'Navigational mechanisms that are repeated on multiple pages occur in the same relative order',
                level: 'AA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Cross-page navigation consistency evaluation',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.2.4',
                title: 'Consistent Identification',
                description: 'Components with the same functionality are identified consistently',
                level: 'AA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Cross-page component identification consistency',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.3.3',
                title: 'Error Suggestion',
                description: 'If an input error is automatically detected and suggestions for correction are known, suggestions are provided',
                level: 'AA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Error correction suggestion quality and helpfulness',
                principle: 'Understandable'
            },
            {
                criterion_number: '3.3.4',
                title: 'Error Prevention (Legal, Financial, Data)',
                description: 'For pages that cause legal commitments or financial transactions, submissions are reversible, checked, or confirmed',
                level: 'AA',
                test_method: 'manual',
                automated_tools: [],
                automated_rules: [],
                automation_confidence: null,
                manual_verification_needed: 'Transaction confirmation and reversal mechanism evaluation',
                principle: 'Understandable'
            },
            {
                criterion_number: '4.1.3',
                title: 'Status Messages',
                description: 'Status messages can be programmatically determined through role or properties',
                level: 'AA',
                test_method: 'both',
                automated_tools: ['axe-core', 'playwright'],
                automated_rules: ['aria-live-regions'],
                automation_confidence: 'medium',
                manual_verification_needed: 'Status message timing, appropriateness, and user experience',
                principle: 'Robust'
            }
        ];
    }

    /**
     * Load tool capabilities mapping
     */
    loadToolCapabilities() {
        return {
            'axe-core': {
                name: 'axe-core',
                description: 'Industry-standard automated accessibility testing',
                coverage: 'High coverage for structural and semantic issues',
                strengths: ['ARIA validation', 'Color contrast', 'Semantic HTML', 'Form labels'],
                limitations: ['Context-dependent content', 'Visual design assessment', 'User interaction flows'],
                reliability: 'excellent'
            },
            'pa11y': {
                name: 'Pa11y',
                description: 'Command-line accessibility testing with HTML validation',
                coverage: 'Complementary rules to axe-core, strong HTML validation',
                strengths: ['HTML validation', 'WCAG standard compliance', 'Cross-browser consistency'],
                limitations: ['Limited interaction testing', 'Context understanding', 'Visual assessment'],
                reliability: 'good'
            },
            'lighthouse': {
                name: 'Lighthouse',
                description: 'Google Lighthouse accessibility audit with performance correlation',
                coverage: 'Basic accessibility with performance impact analysis',
                strengths: ['Performance correlation', 'Best practices', 'SEO intersection'],
                limitations: ['Limited WCAG coverage', 'Surface-level analysis', 'Context awareness'],
                reliability: 'good'
            },
            'playwright': {
                name: 'Playwright',
                description: 'Advanced interaction testing and behavior verification',
                coverage: 'Complex interactions, keyboard navigation, dynamic content',
                strengths: ['Interaction testing', 'Keyboard navigation', 'Dynamic content', 'Focus management'],
                limitations: ['Requires custom test creation', 'Context interpretation', 'Content quality assessment'],
                reliability: 'excellent'
            },
            'contrast-analyzer': {
                name: 'Contrast Analyzer',
                description: 'Specialized color contrast analysis tool',
                coverage: 'Comprehensive contrast ratio analysis',
                strengths: ['Color contrast accuracy', 'Non-text element support', 'Advanced color analysis'],
                limitations: ['Limited to contrast only', 'No other accessibility aspects'],
                reliability: 'excellent'
            }
        };
    }

    /**
     * Get tool-specific rule mappings for a WCAG criterion
     */
    getToolRulesForCriterion(criterionNumber) {
        const requirement = this.wcag22Requirements.find(req => req.criterion_number === criterionNumber);
        if (!requirement) return null;

        return {
            criterion: requirement,
            tools: requirement.automated_tools || [],
            rules: requirement.automated_rules || [],
            confidence: requirement.automation_confidence,
            manualNeeded: requirement.manual_verification_needed
        };
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealWCAGRequirementsService;
} else if (typeof window !== 'undefined') {
    window.RealWCAGRequirementsService = RealWCAGRequirementsService;
} 