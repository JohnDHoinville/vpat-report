const { db } = require('./config');

/**
 * WCAG 2.1 & Section 508 Requirements Seeding Script
 * Populates the database with comprehensive accessibility requirements and testing procedures
 */

console.log('🌱 Starting WCAG 2.1 & Section 508 Requirements Seeding...');

/**
 * WCAG 2.1 Level AA & AAA Requirements
 * Each requirement includes step-by-step manual testing procedures
 */
const wcagRequirements = [
    // LEVEL A REQUIREMENTS
    {
        wcag_version: '2.1',
        level: 'A',
        criterion_number: '1.1.1',
        title: 'Non-text Content',
        description: 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose.',
        manual_test_procedure: {
            overview: 'Check that all images, buttons, form controls, and other non-text content have appropriate text alternatives.',
            steps: [
                'Locate all images on the page using browser developer tools',
                'Check each image has an alt attribute or is marked as decorative (alt="")',
                'Verify alt text describes the purpose/content, not appearance ("chart showing sales data" not "red chart")',
                'Check form inputs have accessible names (labels, aria-label, aria-labelledby)',
                'Test with screen reader (NVDA/JAWS) to confirm alternatives are announced correctly',
                'Verify complex images (charts, diagrams) have longer descriptions via aria-describedby or nearby text'
            ],
            tools_needed: ['screen_reader', 'browser_dev_tools', 'accessibility_tree'],
            what_to_look_for: 'Missing alt attributes, empty alt text on meaningful images, uninformative alt text, unlabeled form controls',
            common_failures: [
                'Images without alt attributes',
                'Alt text that says "image", "picture", or filename',
                'Decorative images with descriptive alt text',
                'Form controls without labels or accessible names',
                'Complex images without adequate descriptions'
            ]
        },
        tool_mappings: {
            axe: ['image-alt', 'input-image-alt', 'aria-hidden-body'],
            pa11y: ['WCAG2AA.Principle1.Guideline1_1.1_1_1'],
            lighthouse: ['image-alt']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
        applies_to_page_types: ['all']
    },
    {
        wcag_version: '2.1',
        level: 'A',
        criterion_number: '1.3.1',
        title: 'Info and Relationships',
        description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.',
        manual_test_procedure: {
            overview: 'Verify that visual structure and relationships are properly coded using semantic HTML and ARIA.',
            steps: [
                'Check heading structure using browser dev tools (H1, H2, H3 in logical order)',
                'Verify lists are marked up with <ul>, <ol>, or <dl> elements',
                'Test that tables use <th> elements for headers with scope attributes',
                'Check forms use <fieldset> and <legend> for grouping related fields',
                'Verify important text formatting (emphasis, strong) uses semantic markup',
                'Test with screen reader to ensure structure is announced correctly'
            ],
            tools_needed: ['screen_reader', 'browser_dev_tools', 'accessibility_tree'],
            what_to_look_for: 'Missing semantic markup, incorrect heading hierarchy, unlabeled form groups, data tables without headers',
            common_failures: [
                'Using <div> instead of <h1>-<h6> for headings',
                'Skipping heading levels (H1 to H3)',
                'Data tables without <th> elements',
                'Related form fields not grouped with <fieldset>'
            ]
        },
        tool_mappings: {
            axe: ['heading-order', 'list', 'listitem', 'th-has-data-cells'],
            pa11y: ['WCAG2AA.Principle1.Guideline1_3.1_3_1'],
            lighthouse: ['heading-order', 'list']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        applies_to_page_types: ['all']
    },
    {
        wcag_version: '2.1',
        level: 'A',
        criterion_number: '2.1.1',
        title: 'Keyboard',
        description: 'All functionality of the content is operable through a keyboard interface.',
        manual_test_procedure: {
            overview: 'Test that all interactive elements can be accessed and operated using only the keyboard.',
            steps: [
                'Use only Tab, Shift+Tab, Enter, Space, and arrow keys (no mouse)',
                'Navigate to all interactive elements (links, buttons, form controls, widgets)',
                'Verify all functionality can be triggered with keyboard',
                'Check that focus is visible on all focusable elements',
                'Ensure logical tab order through the page',
                'Test custom widgets (dropdowns, sliders) work with keyboard',
                'Verify no keyboard traps (can always navigate away)'
            ],
            tools_needed: ['keyboard_only'],
            what_to_look_for: 'Elements that cannot be reached or operated with keyboard, invisible focus, illogical tab order',
            common_failures: [
                'Custom controls without keyboard support',
                'Mouse-only click handlers',
                'Missing tabindex on custom interactive elements',
                'Keyboard traps in modal dialogs',
                'Invisible or unclear focus indicators'
            ]
        },
        tool_mappings: {
            axe: ['focusable-controls', 'tabindex'],
            pa11y: ['WCAG2AA.Principle2.Guideline2_1.2_1_1'],
            lighthouse: ['focusable-controls']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
        applies_to_page_types: ['all']
    },

    // LEVEL AA REQUIREMENTS
    {
        wcag_version: '2.1',
        level: 'AA',
        criterion_number: '1.4.3',
        title: 'Contrast (Minimum)',
        description: 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1, except for large text which should have a contrast ratio of at least 3:1.',
        manual_test_procedure: {
            overview: 'Measure color contrast between text and background colors to ensure sufficient contrast ratios.',
            steps: [
                'Identify all text elements on the page',
                'Use color contrast analyzer tool to measure ratios',
                'Verify normal text (under 18pt) has 4.5:1 contrast ratio',
                'Verify large text (18pt+ or 14pt+ bold) has 3:1 contrast ratio',
                'Check UI components and graphical objects have 3:1 contrast against adjacent colors',
                'Test different states (hover, focus, disabled) if contrast changes',
                'Verify link text has sufficient contrast both normally and on hover/focus'
            ],
            tools_needed: ['contrast_analyzer', 'browser_dev_tools', 'color_picker'],
            what_to_look_for: 'Low contrast text, especially on colored backgrounds, light gray text, insufficient button contrast',
            common_failures: [
                'Gray text (#777777) on white background (3.4:1 ratio)',
                'Light colored links that are hard to distinguish',
                'Placeholder text with insufficient contrast',
                'Disabled form elements that are too light',
                'Text over background images without sufficient contrast'
            ]
        },
        tool_mappings: {
            axe: ['color-contrast'],
            pa11y: ['WCAG2AA.Principle1.Guideline1_4.1_4_3'],
            lighthouse: ['color-contrast']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
        applies_to_page_types: ['all']
    },
    {
        wcag_version: '2.1',
        level: 'AA',
        criterion_number: '1.4.10',
        title: 'Reflow',
        description: 'Content can be presented without loss of information or functionality, and without requiring scrolling in two dimensions at 320 CSS pixels width.',
        manual_test_procedure: {
            overview: 'Test that content reflows properly at mobile widths without horizontal scrolling.',
            steps: [
                'Resize browser window to 320px width (or use mobile device)',
                'Check that all content is visible without horizontal scrolling',
                'Verify all functionality remains available',
                'Test that content reflows properly (not cut off)',
                'Check responsive design works correctly',
                'Ensure form fields and buttons remain usable',
                'Verify navigation menus adapt appropriately (hamburger menu, etc.)'
            ],
            tools_needed: ['browser_dev_tools', 'mobile_device', 'responsive_design_mode'],
            what_to_look_for: 'Horizontal scrolling, cut-off content, overlapping elements, unusable interface elements',
            common_failures: [
                'Fixed-width layouts that don\'t resize',
                'Content that overflows container at narrow widths',
                'Navigation that becomes unusable on mobile',
                'Form elements that are too small to use',
                'Text that gets cut off or overlaps'
            ]
        },
        tool_mappings: {
            axe: ['meta-viewport'],
            pa11y: ['WCAG2AA.Principle1.Guideline1_4.1_4_10'],
            lighthouse: ['viewport']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html',
        applies_to_page_types: ['all']
    },
    {
        wcag_version: '2.1',
        level: 'AA',
        criterion_number: '2.4.6',
        title: 'Headings and Labels',
        description: 'Headings and labels describe topic or purpose.',
        manual_test_procedure: {
            overview: 'Check that headings and form labels are descriptive and help users understand content organization.',
            steps: [
                'Review all headings (H1-H6) to ensure they describe the section content',
                'Verify headings create a logical outline of the page',
                'Check that form labels clearly describe what input is expected',
                'Ensure button text describes the action that will occur',
                'Verify link text describes the destination or purpose',
                'Test with screen reader to confirm labels and headings make sense out of context'
            ],
            tools_needed: ['screen_reader', 'browser_dev_tools'],
            what_to_look_for: 'Vague or generic headings/labels, missing context, uninformative button/link text',
            common_failures: [
                'Headings like "Welcome" or "Introduction" without context',
                'Form labels like "Name" without specifying what type',
                'Buttons labeled "Submit" without indicating what will be submitted',
                'Links with text like "Click here" or "Read more"',
                'Labels that don\'t match the actual form field purpose'
            ]
        },
        tool_mappings: {
            axe: ['heading-order', 'label'],
            pa11y: ['WCAG2AA.Principle2.Guideline2_4.2_4_6'],
            lighthouse: ['heading-order']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
        applies_to_page_types: ['all']
    },

    // LEVEL AAA REQUIREMENTS
    {
        wcag_version: '2.1',
        level: 'AAA',
        criterion_number: '1.4.6',
        title: 'Contrast (Enhanced)',
        description: 'The visual presentation of text and images of text has a contrast ratio of at least 7:1, except for large text which should have a contrast ratio of at least 4.5:1.',
        manual_test_procedure: {
            overview: 'Measure enhanced color contrast ratios for improved accessibility.',
            steps: [
                'Use contrast analyzer to measure all text/background combinations',
                'Verify normal text has 7:1 contrast ratio (higher than AA)',
                'Verify large text has 4.5:1 contrast ratio',
                'Check that UI components meet enhanced contrast requirements',
                'Test across different page states and themes',
                'Document any text that cannot meet AAA contrast due to design constraints'
            ],
            tools_needed: ['contrast_analyzer', 'color_picker'],
            what_to_look_for: 'Any text not meeting the higher AAA contrast thresholds',
            common_failures: [
                'Text meeting AA (4.5:1) but not AAA (7:1) requirements',
                'Brand colors that cannot achieve AAA contrast',
                'Light gray text that passes AA but fails AAA'
            ]
        },
        tool_mappings: {
            axe: ['color-contrast-enhanced'],
            pa11y: ['WCAG2AAA.Principle1.Guideline1_4.1_4_6'],
            lighthouse: ['color-contrast']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html',
        applies_to_page_types: ['all']
    },
    {
        wcag_version: '2.1',
        level: 'AAA',
        criterion_number: '2.4.9',
        title: 'Link Purpose (Link Only)',
        description: 'A mechanism is available to allow the purpose of each link to be identified from link text alone.',
        manual_test_procedure: {
            overview: 'Ensure link text alone (without context) clearly describes the link destination or purpose.',
            steps: [
                'Read each link text in isolation, without surrounding context',
                'Verify the link purpose is clear from the text alone',
                'Check that duplicate link texts go to the same destination',
                'Ensure different destinations have distinguishable link text',
                'Test with screen reader using link list navigation',
                'Verify no ambiguous links like "click here", "more", "read more"'
            ],
            tools_needed: ['screen_reader', 'browser_dev_tools'],
            what_to_look_for: 'Ambiguous link text, duplicate text for different destinations, context-dependent links',
            common_failures: [
                'Multiple "Read more" links that go to different articles',
                'Links with only "Click here" text',
                'Product links with only the price as link text',
                'Navigation links that require visual context to understand'
            ]
        },
        tool_mappings: {
            axe: ['link-name'],
            pa11y: ['WCAG2AAA.Principle2.Guideline2_4.2_4_9'],
            lighthouse: ['link-name']
        },
        understanding_url: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-link-only.html',
        applies_to_page_types: ['all']
    }
];

/**
 * Section 508 Requirements
 * Updated standards with testing procedures
 */
const section508Requirements = [
    {
        section_number: '1194.22(a)',
        title: 'Text Alternatives',
        description: 'A text equivalent for every non-text element shall be provided (e.g., via "alt", "longdesc", or in element content).',
        manual_test_procedure: {
            overview: 'Equivalent to WCAG 1.1.1 - verify all non-text content has text alternatives.',
            steps: [
                'Same as WCAG 1.1.1 testing procedure',
                'Focus on compliance with Section 508 specific requirements',
                'Document findings in Section 508 format for government reporting'
            ],
            tools_needed: ['screen_reader', 'browser_dev_tools'],
            what_to_look_for: 'Same as WCAG 1.1.1 requirements',
            common_failures: ['Same as WCAG 1.1.1 failures']
        },
        tool_mappings: {
            axe: ['image-alt'],
            pa11y: ['Section508.22.A'],
            lighthouse: ['image-alt']
        },
        reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
        applies_to_page_types: ['all']
    },
    {
        section_number: '1194.22(b)',
        title: 'Multimedia Alternatives',
        description: 'Equivalent alternatives for any multimedia presentation shall be synchronized with the presentation.',
        manual_test_procedure: {
            overview: 'Check that videos have captions and audio content has transcripts.',
            steps: [
                'Identify all video and audio content on the page',
                'Verify videos have closed captions or subtitles',
                'Check that captions are synchronized with audio',
                'Ensure audio-only content has full transcripts',
                'Test captions for accuracy and completeness',
                'Verify captions include important sound effects and speaker identification'
            ],
            tools_needed: ['media_player', 'caption_viewer'],
            what_to_look_for: 'Missing captions, poor synchronization, incomplete transcripts',
            common_failures: [
                'Videos without any captions',
                'Auto-generated captions with poor accuracy',
                'Captions that are out of sync with audio',
                'Missing speaker identification in captions'
            ]
        },
        tool_mappings: {
            axe: ['video-caption'],
            pa11y: ['Section508.22.B'],
            lighthouse: ['video-caption']
        },
        reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
        applies_to_page_types: ['media', 'content']
    },
    {
        section_number: '1194.22(d)',
        title: 'Readable Content',
        description: 'Documents shall be organized so they are readable without requiring an associated style sheet.',
        manual_test_procedure: {
            overview: 'Test that content remains readable and usable when CSS is disabled.',
            steps: [
                'Disable CSS in browser or use text-only browser',
                'Verify content is still readable in logical order',
                'Check that heading structure provides organization',
                'Ensure navigation and functionality still work',
                'Verify form elements have proper labels',
                'Test that important information is not conveyed through CSS alone'
            ],
            tools_needed: ['text_browser', 'css_disabling_tool'],
            what_to_look_for: 'Content that becomes unreadable, lost functionality, missing information',
            common_failures: [
                'Content that depends entirely on CSS positioning',
                'Information conveyed only through color or visual styling',
                'Navigation that becomes unusable without CSS',
                'Forms that lose their labels or structure'
            ]
        },
        tool_mappings: {
            axe: ['page-has-heading-one'],
            pa11y: ['Section508.22.D'],
            lighthouse: ['structured-data']
        },
        reference_url: 'https://www.section508.gov/manage/laws-and-policies/',
        applies_to_page_types: ['all']
    }
];

/**
 * Seed the requirements tables
 */
async function seedRequirements() {
    try {
        console.log('📋 Seeding WCAG 2.1 requirements...');
        
        let wcagInserted = 0;
        let wcagSkipped = 0;
        
        for (const requirement of wcagRequirements) {
            try {
                const result = await db.insert('wcag_requirements', requirement);
                if (result) {
                    console.log(`✅ Added WCAG ${requirement.level}: ${requirement.criterion_number} - ${requirement.title}`);
                    wcagInserted++;
                } else {
                    console.log(`⚠️ Skipped WCAG ${requirement.criterion_number}: Already exists`);
                    wcagSkipped++;
                }
            } catch (error) {
                console.error(`❌ Error inserting WCAG ${requirement.criterion_number}:`, error.message);
            }
        }
        
        console.log('📋 Seeding Section 508 requirements...');
        
        let section508Inserted = 0;
        let section508Skipped = 0;
        
        for (const requirement of section508Requirements) {
            try {
                const result = await db.insert('section_508_requirements', requirement);
                if (result) {
                    console.log(`✅ Added Section 508: ${requirement.section_number} - ${requirement.title}`);
                    section508Inserted++;
                } else {
                    console.log(`⚠️ Skipped Section 508 ${requirement.section_number}: Already exists`);
                    section508Skipped++;
                }
            } catch (error) {
                console.error(`❌ Error inserting Section 508 ${requirement.section_number}:`, error.message);
            }
        }
        
        // Summary
        console.log('\n🌱 Requirements Seeding Complete!');
        console.log('=====================================');
        console.log(`📊 WCAG Requirements: ${wcagInserted} inserted, ${wcagSkipped} skipped`);
        console.log(`📊 Section 508 Requirements: ${section508Inserted} inserted, ${section508Skipped} skipped`);
        console.log(`📊 Total: ${wcagInserted + section508Inserted} new requirements added`);
        
        // Verify seeding
        const wcagCount = await db.query('SELECT COUNT(*) FROM wcag_requirements');
        const section508Count = await db.query('SELECT COUNT(*) FROM section_508_requirements');
        
        console.log(`\n📋 Database now contains:`);
        console.log(`   • ${wcagCount.rows[0].count} WCAG requirements`);
        console.log(`   • ${section508Count.rows[0].count} Section 508 requirements`);
        
        console.log('\n✅ Ready for manual testing workflow!');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        throw error;
    } finally {
        await db.end();
    }
}

// Run the seeding
seedRequirements().catch(console.error); 