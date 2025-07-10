/**
 * WCAG 2.2 Criteria Mapping System for VPAT Generation
 * Maps test results from multiple accessibility tools to WCAG 2.2 success criteria
 * Implements conformance level assessment logic and coverage tracking
 */

class WCAGCriteriaMapper {
    constructor() {
        this.wcag22Criteria = this.loadWCAG22Criteria();
        this.toolRuleMappings = this.loadToolRuleMappings();
        this.conformanceLevels = ['A', 'AA', 'AAA'];
    }

    /**
     * Complete WCAG 2.2 success criteria with detailed information
     */
    loadWCAG22Criteria() {
        return {
            // Principle 1: Perceivable
            '1.1.1': {
                title: 'Non-text Content',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.1 Text Alternatives',
                description: 'All non-text content has text alternative that serves equivalent purpose',
                section508: ['1194.22(a)'],
                testable: 'automated',
                coverage: 'high'
            },
            '1.2.1': {
                title: 'Audio-only and Video-only (Prerecorded)',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.2 Time-based Media',
                description: 'Alternative for prerecorded audio-only and video-only media',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.2.2': {
                title: 'Captions (Prerecorded)',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.2 Time-based Media',
                description: 'Captions provided for prerecorded audio in synchronized media',
                section508: ['1194.22(b)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.2.3': {
                title: 'Audio Description or Media Alternative (Prerecorded)',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.2 Time-based Media',
                description: 'Audio description or full text alternative for prerecorded video',
                section508: ['1194.22(b)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.3.1': {
                title: 'Info and Relationships',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.3 Adaptable',
                description: 'Information, structure, and relationships can be programmatically determined',
                section508: ['1194.22(g)', '1194.22(h)'],
                testable: 'automated',
                coverage: 'high'
            },
            '1.3.2': {
                title: 'Meaningful Sequence',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.3 Adaptable',
                description: 'Correct reading sequence can be programmatically determined',
                section508: ['1194.22(g)'],
                testable: 'partial',
                coverage: 'medium'
            },
            '1.3.3': {
                title: 'Sensory Characteristics',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.3 Adaptable',
                description: 'Instructions do not rely solely on sensory characteristics',
                section508: ['1194.22(c)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.3.4': {
                title: 'Orientation',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.3 Adaptable',
                description: 'Content not restricted to single display orientation',
                section508: ['1194.22(i)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.3.5': {
                title: 'Identify Input Purpose',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.3 Adaptable',
                description: 'Purpose of input fields can be programmatically determined',
                section508: ['1194.22(n)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '1.4.1': {
                title: 'Use of Color',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Color is not used as only means of conveying information',
                section508: ['1194.22(c)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.4.2': {
                title: 'Audio Control',
                level: 'A',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Mechanism to stop, pause, or adjust audio that plays automatically',
                section508: ['1194.22(b)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.4.3': {
                title: 'Contrast (Minimum)',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Text has contrast ratio of at least 4.5:1 (3:1 for large text)',
                section508: ['1194.22(c)'],
                testable: 'automated',
                coverage: 'high'
            },
            '1.4.4': {
                title: 'Resize Text',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Text can be resized up to 200% without loss of content or functionality',
                section508: ['1194.22(d)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.4.5': {
                title: 'Images of Text',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Use text rather than images of text',
                section508: ['1194.22(a)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '1.4.10': {
                title: 'Reflow',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Content can be presented without horizontal scrolling at 320 CSS pixels width',
                section508: ['1194.22(i)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.4.11': {
                title: 'Non-text Contrast',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'UI components and graphical objects have 3:1 contrast ratio',
                section508: ['1194.22(c)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '1.4.12': {
                title: 'Text Spacing',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'No loss of content when text spacing is increased',
                section508: ['1194.22(d)'],
                testable: 'manual',
                coverage: 'low'
            },
            '1.4.13': {
                title: 'Content on Hover or Focus',
                level: 'AA',
                principle: 'Perceivable',
                guideline: '1.4 Distinguishable',
                description: 'Additional content triggered by hover or focus can be dismissed, hoverable, and persistent',
                section508: ['1194.22(l)'],
                testable: 'manual',
                coverage: 'low'
            },

            // Principle 2: Operable
            '2.1.1': {
                title: 'Keyboard',
                level: 'A',
                principle: 'Operable',
                guideline: '2.1 Keyboard Accessible',
                description: 'All functionality available from keyboard',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.1.2': {
                title: 'No Keyboard Trap',
                level: 'A',
                principle: 'Operable',
                guideline: '2.1 Keyboard Accessible',
                description: 'Keyboard focus not trapped in any part of content',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.1.4': {
                title: 'Character Key Shortcuts',
                level: 'A',
                principle: 'Operable',
                guideline: '2.1 Keyboard Accessible',
                description: 'Single character key shortcuts can be turned off or remapped',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.2.1': {
                title: 'Timing Adjustable',
                level: 'A',
                principle: 'Operable',
                guideline: '2.2 Enough Time',
                description: 'Time limits can be turned off, adjusted, or extended',
                section508: ['1194.22(p)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.2.2': {
                title: 'Pause, Stop, Hide',
                level: 'A',
                principle: 'Operable',
                guideline: '2.2 Enough Time',
                description: 'Moving, blinking, scrolling, or auto-updating content can be controlled',
                section508: ['1194.22(j)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.3.1': {
                title: 'Three Flashes or Below Threshold',
                level: 'A',
                principle: 'Operable',
                guideline: '2.3 Seizures and Physical Reactions',
                description: 'Content does not contain anything that flashes more than three times per second',
                section508: ['1194.22(j)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.4.1': {
                title: 'Bypass Blocks',
                level: 'A',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Mechanism available to bypass blocks of content',
                section508: ['1194.22(o)'],
                testable: 'automated',
                coverage: 'high'
            },
            '2.4.2': {
                title: 'Page Titled',
                level: 'A',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Web pages have titles that describe topic or purpose',
                section508: ['1194.22(i)'],
                testable: 'automated',
                coverage: 'high'
            },
            '2.4.3': {
                title: 'Focus Order',
                level: 'A',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Focusable components receive focus in logical order',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.4.4': {
                title: 'Link Purpose (In Context)',
                level: 'A',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Purpose of each link can be determined from link text or context',
                section508: ['1194.22(i)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '2.4.5': {
                title: 'Multiple Ways',
                level: 'AA',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'More than one way available to locate a web page',
                section508: ['1194.22(i)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.4.6': {
                title: 'Headings and Labels',
                level: 'AA',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Headings and labels describe topic or purpose',
                section508: ['1194.22(g)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '2.4.7': {
                title: 'Focus Visible',
                level: 'AA',
                principle: 'Operable',
                guideline: '2.4 Navigable',
                description: 'Keyboard focus indicator is visible',
                section508: ['1194.22(c)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.5.1': {
                title: 'Pointer Gestures',
                level: 'A',
                principle: 'Operable',
                guideline: '2.5 Input Modalities',
                description: 'All functionality that uses multipoint or path-based gestures has single-pointer alternative',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.5.2': {
                title: 'Pointer Cancellation',
                level: 'A',
                principle: 'Operable',
                guideline: '2.5 Input Modalities',
                description: 'Single-pointer functionality can be cancelled',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },
            '2.5.3': {
                title: 'Label in Name',
                level: 'A',
                principle: 'Operable',
                guideline: '2.5 Input Modalities',
                description: 'Accessible name contains the text presented visually',
                section508: ['1194.22(a)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '2.5.4': {
                title: 'Motion Actuation',
                level: 'A',
                principle: 'Operable',
                guideline: '2.5 Input Modalities',
                description: 'Functionality triggered by device motion can be operated by UI components',
                section508: ['1194.22(a)'],
                testable: 'manual',
                coverage: 'low'
            },

            // Principle 3: Understandable
            '3.1.1': {
                title: 'Language of Page',
                level: 'A',
                principle: 'Understandable',
                guideline: '3.1 Readable',
                description: 'Default human language of web page can be programmatically determined',
                section508: ['1194.22(q)'],
                testable: 'automated',
                coverage: 'high'
            },
            '3.1.2': {
                title: 'Language of Parts',
                level: 'AA',
                principle: 'Understandable',
                guideline: '3.1 Readable',
                description: 'Human language of each passage can be programmatically determined',
                section508: ['1194.22(q)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '3.2.1': {
                title: 'On Focus',
                level: 'A',
                principle: 'Understandable',
                guideline: '3.2 Predictable',
                description: 'Receiving focus does not initiate change of context',
                section508: ['1194.22(l)'],
                testable: 'manual',
                coverage: 'low'
            },
            '3.2.2': {
                title: 'On Input',
                level: 'A',
                principle: 'Understandable',
                guideline: '3.2 Predictable',
                description: 'Changing setting of UI component does not automatically cause change of context',
                section508: ['1194.22(l)'],
                testable: 'manual',
                coverage: 'low'
            },
            '3.2.3': {
                title: 'Consistent Navigation',
                level: 'AA',
                principle: 'Understandable',
                guideline: '3.2 Predictable',
                description: 'Navigational mechanisms repeated on multiple pages occur in same relative order',
                section508: ['1194.22(i)'],
                testable: 'manual',
                coverage: 'low'
            },
            '3.2.4': {
                title: 'Consistent Identification',
                level: 'AA',
                principle: 'Understandable',
                guideline: '3.2 Predictable',
                description: 'Components with same functionality are identified consistently',
                section508: ['1194.22(i)'],
                testable: 'manual',
                coverage: 'low'
            },
            '3.3.1': {
                title: 'Error Identification',
                level: 'A',
                principle: 'Understandable',
                guideline: '3.3 Input Assistance',
                description: 'Input errors are automatically detected and described to user',
                section508: ['1194.22(l)'],
                testable: 'automated',
                coverage: 'medium'
            },
            '3.3.2': {
                title: 'Labels or Instructions',
                level: 'A',
                principle: 'Understandable',
                guideline: '3.3 Input Assistance',
                description: 'Labels or instructions provided when content requires user input',
                section508: ['1194.22(n)'],
                testable: 'automated',
                coverage: 'high'
            },
            '3.3.3': {
                title: 'Error Suggestion',
                level: 'AA',
                principle: 'Understandable',
                guideline: '3.3 Input Assistance',
                description: 'Error suggestions provided when error detected and suggestions known',
                section508: ['1194.22(l)'],
                testable: 'manual',
                coverage: 'low'
            },
            '3.3.4': {
                title: 'Error Prevention (Legal, Financial, Data)',
                level: 'AA',
                principle: 'Understandable',
                guideline: '3.3 Input Assistance',
                description: 'Submissions can be reversed, checked, or confirmed for important data',
                section508: ['1194.22(l)'],
                testable: 'manual',
                coverage: 'low'
            },

            // Principle 4: Robust
            '4.1.1': {
                title: 'Parsing',
                level: 'A',
                principle: 'Robust',
                guideline: '4.1 Compatible',
                description: 'Content can be parsed unambiguously',
                section508: ['1194.22(l)'],
                testable: 'automated',
                coverage: 'high'
            },
            '4.1.2': {
                title: 'Name, Role, Value',
                level: 'A',
                principle: 'Robust',
                guideline: '4.1 Compatible',
                description: 'Name, role, value can be programmatically determined for UI components',
                section508: ['1194.22(a)'],
                testable: 'automated',
                coverage: 'high'
            },
            '4.1.3': {
                title: 'Status Messages',
                level: 'AA',
                principle: 'Robust',
                guideline: '4.1 Compatible',
                description: 'Status messages can be programmatically determined through role or properties',
                section508: ['1194.22(l)'],
                testable: 'automated',
                coverage: 'medium'
            }
        };
    }

    /**
     * Tool-specific rule mappings to WCAG criteria
     */
    loadToolRuleMappings() {
        return {
            'axe-core': {
                'area-alt': ['1.1.1'],
                'aria-allowed-attr': ['4.1.2'],
                'aria-command-name': ['4.1.2'],
                'aria-hidden-body': ['4.1.2'],
                'aria-hidden-focus': ['4.1.2'],
                'aria-input-field-name': ['4.1.2'],
                'aria-label': ['4.1.2'],
                'aria-labelledby': ['4.1.2'],
                'aria-required-attr': ['4.1.2'],
                'aria-required-children': ['1.3.1'],
                'aria-required-parent': ['1.3.1'],
                'aria-roles': ['4.1.2'],
                'aria-toggle-field-name': ['4.1.2'],
                'aria-valid-attr-value': ['4.1.2'],
                'aria-valid-attr': ['4.1.2'],
                'button-name': ['4.1.2'],
                'bypass': ['2.4.1'],
                'color-contrast': ['1.4.3'],
                'definition-list': ['1.3.1'],
                'dlitem': ['1.3.1'],
                'document-title': ['2.4.2'],
                'duplicate-id': ['4.1.1'],
                'form-field-multiple-labels': ['3.3.2'],
                'frame-title': ['2.4.2'],
                'html-has-lang': ['3.1.1'],
                'html-lang-valid': ['3.1.1'],
                'html-xml-lang-mismatch': ['3.1.1'],
                'image-alt': ['1.1.1'],
                'input-button-name': ['4.1.2'],
                'input-image-alt': ['1.1.1'],
                'label': ['3.3.2'],
                'landmark-banner-is-top-level': ['1.3.1'],
                'landmark-complementary-is-top-level': ['1.3.1'],
                'landmark-contentinfo-is-top-level': ['1.3.1'],
                'landmark-main-is-top-level': ['1.3.1'],
                'landmark-no-duplicate-banner': ['1.3.1'],
                'landmark-no-duplicate-contentinfo': ['1.3.1'],
                'landmark-no-duplicate-main': ['1.3.1'],
                'landmark-one-main': ['1.3.1'],
                'landmark-unique': ['1.3.1'],
                'link-name': ['2.4.4'],
                'list': ['1.3.1'],
                'listitem': ['1.3.1'],
                'meta-refresh': ['2.2.1'],
                'meta-viewport': ['1.4.4'],
                'object-alt': ['1.1.1'],
                'role-img-alt': ['1.1.1'],
                'select-name': ['4.1.2'],
                'server-side-image-map': ['2.1.1'],
                'svg-img-alt': ['1.1.1'],
                'td-headers-attr': ['1.3.1'],
                'th-has-data-cells': ['1.3.1'],
                'valid-lang': ['3.1.2']
            },
            'pa11y': {
                'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37': ['1.1.1'],
                'WCAG2AA.Principle1.Guideline1_3.1_3_1.H42.2': ['1.3.1'],
                'WCAG2AA.Principle1.Guideline1_3.1_3_1.H43.ScopeCol': ['1.3.1'],
                'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail': ['1.4.3'],
                'WCAG2AA.Principle2.Guideline2_4.2_4_1.H64.1': ['2.4.1'],
                'WCAG2AA.Principle2.Guideline2_4.2_4_2.H25.1.NoTitleEl': ['2.4.2'],
                'WCAG2AA.Principle3.Guideline3_1.3_1_1.H57.2': ['3.1.1'],
                'WCAG2AA.Principle4.Guideline4_1.4_1_1.F77': ['4.1.1'],
                'WCAG2AA.Principle4.Guideline4_1.4_1_2.H91.A.EmptyNoId': ['4.1.2']
            },
            'lighthouse': {
                'accesskeys': ['2.1.1'],
                'aria-allowed-attr': ['4.1.2'],
                'aria-hidden-body': ['4.1.2'],
                'aria-hidden-focus': ['4.1.2'],
                'aria-input-field-name': ['4.1.2'],
                'aria-required-attr': ['4.1.2'],
                'aria-required-children': ['1.3.1'],
                'aria-required-parent': ['1.3.1'],
                'aria-roles': ['4.1.2'],
                'aria-valid-attr-value': ['4.1.2'],
                'aria-valid-attr': ['4.1.2'],
                'button-name': ['4.1.2'],
                'bypass': ['2.4.1'],
                'color-contrast': ['1.4.3'],
                'definition-list': ['1.3.1'],
                'dlitem': ['1.3.1'],
                'document-title': ['2.4.2'],
                'duplicate-id-aria': ['4.1.1'],
                'duplicate-id-active': ['4.1.1'],
                'form-field-multiple-labels': ['3.3.2'],
                'frame-title': ['2.4.2'],
                'html-has-lang': ['3.1.1'],
                'html-lang-valid': ['3.1.1'],
                'image-alt': ['1.1.1'],
                'input-image-alt': ['1.1.1'],
                'label': ['3.3.2'],
                'link-name': ['2.4.4'],
                'list': ['1.3.1'],
                'listitem': ['1.3.1'],
                'meta-refresh': ['2.2.1'],
                'meta-viewport': ['1.4.4'],
                'object-alt': ['1.1.1'],
                'select-name': ['4.1.2'],
                'skip-link': ['2.4.1'],
                'tabindex': ['2.1.1'],
                'td-headers-attr': ['1.3.1'],
                'th-has-data-cells': ['1.3.1'],
                'valid-lang': ['3.1.2']
            },
            'ibm': {
                'IBMA_Color_Contrast_WCAG2AA': ['1.4.3'],
                'IBMA_Color_Contrast_WCAG2AAA': ['1.4.6'],
                'RPT_Elem_UniqueId': ['4.1.1'],
                'RPT_Header_HasContent': ['1.3.1'],
                'RPT_Img_UsemapValid': ['1.1.1'],
                'RPT_Label_RefValid': ['3.3.2'],
                'RPT_List_Misuse': ['1.3.1'],
                'RPT_Markup_ValidLang': ['3.1.1'],
                'RPT_Style_BackgroundImage': ['1.1.1'],
                'RPT_Table_DataHeadingsAria': ['1.3.1'],
                'RPT_Text_SensoryReference': ['1.3.3'],
                'WCAG20_A_HasText': ['1.1.1'],
                'WCAG20_Applet_HasAlt': ['1.1.1'],
                'WCAG20_Area_HasAlt': ['1.1.1'],
                'WCAG20_Doc_HasTitle': ['2.4.2'],
                'WCAG20_Form_HasSubmit': ['3.2.2'],
                'WCAG20_Frame_HasTitle': ['2.4.2'],
                'WCAG20_Html_HasLang': ['3.1.1'],
                'WCAG20_Img_HasAlt': ['1.1.1'],
                'WCAG20_Input_ExplicitLabel': ['3.3.2'],
                'WCAG20_Input_HasOnchange': ['3.2.2'],
                'WCAG20_Input_InFieldset': ['1.3.1'],
                'WCAG20_Input_LabelAfter': ['3.3.2'],
                'WCAG20_Input_LabelBefore': ['3.3.2'],
                'WCAG20_Label_RefValid': ['3.3.2'],
                'WCAG20_Meta_RedirectZero': ['2.2.1'],
                'WCAG20_Object_HasText': ['1.1.1'],
                'WCAG20_Script_FocusBlurs': ['2.1.1'],
                'WCAG20_Select_HasOptGroup': ['1.3.1'],
                'WCAG20_Table_Structure': ['1.3.1'],
                'WCAG20_Text_Emoticons': ['1.1.1']
            }
        };
    }

    /**
     * Map test results to WCAG criteria
     */
    mapResultsToWCAG(testResults) {
        const mapping = {
            coverageAnalysis: this.calculateCoverageAnalysis(testResults),
            criteriaMapping: {},
            conformanceAssessment: {},
            toolCoverage: {},
            summary: {
                totalCriteria: Object.keys(this.wcag22Criteria).length,
                coveredCriteria: 0,
                uncoveredCriteria: 0,
                levelA: { total: 0, covered: 0, violations: 0 },
                levelAA: { total: 0, covered: 0, violations: 0 },
                levelAAA: { total: 0, covered: 0, violations: 0 }
            }
        };

        // Initialize criteria mapping
        Object.keys(this.wcag22Criteria).forEach(criteriaId => {
            mapping.criteriaMapping[criteriaId] = {
                criteria: this.wcag22Criteria[criteriaId],
                violations: [],
                status: 'not-tested',
                conformanceLevel: 'Not Determined',
                toolsUsed: [],
                evidence: []
            };
        });

        // Process results from each tool
        if (testResults.tools) {
            Object.keys(testResults.tools).forEach(toolName => {
                const toolResults = testResults.tools[toolName];
                this.processToolResults(toolName, toolResults, mapping);
            });
        }

        // Calculate conformance levels
        this.assessConformance(mapping);

        return mapping;
    }

    /**
     * Process results from individual tools
     */
    processToolResults(toolName, toolResults, mapping) {
        const normalizedToolName = this.normalizeToolName(toolName);
        const ruleMappings = this.toolRuleMappings[normalizedToolName] || {};

        if (toolResults.violations) {
            toolResults.violations.forEach(violation => {
                const ruleId = violation.id || violation.code;
                const wcagCriteria = ruleMappings[ruleId] || this.inferWCAGFromTags(violation);

                if (wcagCriteria && wcagCriteria.length > 0) {
                    wcagCriteria.forEach(criteriaId => {
                        if (mapping.criteriaMapping[criteriaId]) {
                            mapping.criteriaMapping[criteriaId].violations.push({
                                tool: toolName,
                                ruleId: ruleId,
                                severity: violation.impact || violation.severity || 'unknown',
                                description: violation.description || violation.message,
                                xpath: violation.xpath || violation.selector,
                                helpUrl: violation.helpUrl,
                                occurrences: violation.nodes ? violation.nodes.length : 1
                            });
                            mapping.criteriaMapping[criteriaId].status = 'violation';
                            if (!mapping.criteriaMapping[criteriaId].toolsUsed.includes(toolName)) {
                                mapping.criteriaMapping[criteriaId].toolsUsed.push(toolName);
                            }
                        }
                    });
                }
            });
        }

        // Mark criteria as tested if no violations found
        Object.keys(ruleMappings).forEach(ruleId => {
            const wcagCriteria = ruleMappings[ruleId];
            wcagCriteria.forEach(criteriaId => {
                if (mapping.criteriaMapping[criteriaId] && mapping.criteriaMapping[criteriaId].status === 'not-tested') {
                    mapping.criteriaMapping[criteriaId].status = 'pass';
                    if (!mapping.criteriaMapping[criteriaId].toolsUsed.includes(toolName)) {
                        mapping.criteriaMapping[criteriaId].toolsUsed.push(toolName);
                    }
                }
            });
        });
    }

    /**
     * Assess conformance levels for VPAT generation
     */
    assessConformance(mapping) {
        Object.keys(mapping.criteriaMapping).forEach(criteriaId => {
            const criteriaData = mapping.criteriaMapping[criteriaId];
            const criteria = this.wcag22Criteria[criteriaId];
            
            if (criteriaData.violations.length > 0) {
                criteriaData.conformanceLevel = 'Does Not Support';
            } else if (criteriaData.status === 'pass') {
                criteriaData.conformanceLevel = 'Supports';
            } else if (criteria.testable === 'manual' || criteria.testable === 'partial') {
                criteriaData.conformanceLevel = 'Not Evaluated';
            } else {
                criteriaData.conformanceLevel = 'Not Determined';
            }

            // Update summary statistics
            const level = criteria.level;
            mapping.summary[`level${level}`].total++;
            
            if (criteriaData.status !== 'not-tested') {
                mapping.summary[`level${level}`].covered++;
                mapping.summary.coveredCriteria++;
            }
            
            if (criteriaData.violations.length > 0) {
                mapping.summary[`level${level}`].violations++;
            }
        });

        mapping.summary.uncoveredCriteria = mapping.summary.totalCriteria - mapping.summary.coveredCriteria;
    }

    /**
     * Calculate coverage analysis
     */
    calculateCoverageAnalysis(testResults) {
        const toolsUsed = Object.keys(testResults.tools || {});
        const estimatedCoverage = this.estimateToolCoverage(toolsUsed);
        
        return {
            toolsUsed: toolsUsed,
            estimatedCoverage: estimatedCoverage,
            automatedCriteria: this.getAutomatedCriteria(),
            manualCriteria: this.getManualCriteria(),
            partialCriteria: this.getPartialCriteria()
        };
    }

    /**
     * Estimate coverage percentage based on tools used
     */
    estimateToolCoverage(toolsUsed) {
        const coverageMap = {
            'axe-core': 25,
            'pa11y': 15,
            'lighthouse': 20,
            'ibm': 15,
            'wave': 10
        };

        let totalCoverage = 0;
        toolsUsed.forEach(tool => {
            const normalizedTool = this.normalizeToolName(tool);
            totalCoverage += coverageMap[normalizedTool] || 0;
        });

        // Cap at reasonable maximum
        return Math.min(totalCoverage, 55);
    }

    /**
     * Get criteria that can be automatically tested
     */
    getAutomatedCriteria() {
        return Object.keys(this.wcag22Criteria).filter(id => 
            this.wcag22Criteria[id].testable === 'automated'
        );
    }

    /**
     * Get criteria requiring manual testing
     */
    getManualCriteria() {
        return Object.keys(this.wcag22Criteria).filter(id => 
            this.wcag22Criteria[id].testable === 'manual'
        );
    }

    /**
     * Get criteria with partial automation
     */
    getPartialCriteria() {
        return Object.keys(this.wcag22Criteria).filter(id => 
            this.wcag22Criteria[id].testable === 'partial'
        );
    }

    /**
     * Normalize tool names for consistent mapping
     */
    normalizeToolName(toolName) {
        const normalized = toolName.toLowerCase().replace(/[-_\s]/g, '');
        if (normalized.includes('axe')) return 'axe-core';
        if (normalized.includes('pa11y')) return 'pa11y';
        if (normalized.includes('lighthouse')) return 'lighthouse';
        if (normalized.includes('ibm') || normalized.includes('equal')) return 'ibm';
        if (normalized.includes('wave')) return 'wave';
        return toolName;
    }

    /**
     * Infer WCAG criteria from violation tags
     */
    inferWCAGFromTags(violation) {
        const tags = violation.tags || [];
        const wcagCriteria = [];

        tags.forEach(tag => {
            if (tag.match(/wcag\d+a{1,3}/i)) {
                // Extract WCAG criteria from tags like 'wcag111', 'wcag21aa'
                const matches = tag.match(/wcag(\d)(\d)(\d)/i);
                if (matches) {
                    const criteriaId = `${matches[1]}.${matches[2]}.${matches[3]}`;
                    if (this.wcag22Criteria[criteriaId]) {
                        wcagCriteria.push(criteriaId);
                    }
                }
            }
        });

        return wcagCriteria;
    }

    /**
     * Generate WCAG compliance summary
     */
    generateComplianceSummary(mapping) {
        const summary = {
            overallCompliance: this.calculateOverallCompliance(mapping),
            levelCompliance: {
                A: this.calculateLevelCompliance(mapping, 'A'),
                AA: this.calculateLevelCompliance(mapping, 'AA'),
                AAA: this.calculateLevelCompliance(mapping, 'AAA')
            },
            criticalIssues: this.getCriticalIssues(mapping),
            recommendations: this.generateRecommendations(mapping),
            coverageGaps: this.identifyCoverageGaps(mapping)
        };

        return summary;
    }

    /**
     * Calculate overall compliance percentage
     */
    calculateOverallCompliance(mapping) {
        const totalTested = mapping.summary.coveredCriteria;
        const totalViolations = Object.values(mapping.criteriaMapping)
            .filter(criteria => criteria.violations.length > 0).length;
        
        if (totalTested === 0) return 0;
        return Math.round(((totalTested - totalViolations) / totalTested) * 100);
    }

    /**
     * Calculate compliance for specific WCAG level
     */
    calculateLevelCompliance(mapping, level) {
        const levelData = mapping.summary[`level${level}`];
        if (levelData.covered === 0) return 0;
        return Math.round(((levelData.covered - levelData.violations) / levelData.covered) * 100);
    }

    /**
     * Get critical accessibility issues
     */
    getCriticalIssues(mapping) {
        const critical = [];
        Object.keys(mapping.criteriaMapping).forEach(criteriaId => {
            const criteria = mapping.criteriaMapping[criteriaId];
            if (criteria.violations.length > 0) {
                const criticalViolations = criteria.violations.filter(v => 
                    v.severity === 'critical' || v.severity === 'serious'
                );
                if (criticalViolations.length > 0) {
                    critical.push({
                        criteriaId,
                        title: criteria.criteria.title,
                        level: criteria.criteria.level,
                        violations: criticalViolations
                    });
                }
            }
        });
        return critical;
    }

    /**
     * Generate improvement recommendations
     */
    generateRecommendations(mapping) {
        const recommendations = [];

        // Priority 1: Fix critical violations
        const criticalIssues = this.getCriticalIssues(mapping);
        if (criticalIssues.length > 0) {
            recommendations.push({
                priority: 'High',
                category: 'Critical Violations',
                description: `Fix ${criticalIssues.length} critical accessibility violations`,
                criteria: criticalIssues.map(issue => issue.criteriaId)
            });
        }

        // Priority 2: Manual testing gaps
        const manualCriteria = this.getManualCriteria();
        const untestedManual = manualCriteria.filter(id => 
            mapping.criteriaMapping[id].status === 'not-tested'
        );
        
        if (untestedManual.length > 0) {
            recommendations.push({
                priority: 'Medium',
                category: 'Manual Testing Required',
                description: `Conduct manual testing for ${untestedManual.length} criteria`,
                criteria: untestedManual
            });
        }

        return recommendations;
    }

    /**
     * Identify coverage gaps
     */
    identifyCoverageGaps(mapping) {
        const gaps = {
            untested: [],
            needsManualVerification: [],
            toolSpecific: {}
        };

        Object.keys(mapping.criteriaMapping).forEach(criteriaId => {
            const criteria = mapping.criteriaMapping[criteriaId];
            
            if (criteria.status === 'not-tested') {
                gaps.untested.push(criteriaId);
            } else if (criteria.criteria.testable === 'manual' && criteria.status !== 'violation') {
                gaps.needsManualVerification.push(criteriaId);
            }
        });

        return gaps;
    }
}

module.exports = WCAGCriteriaMapper; 