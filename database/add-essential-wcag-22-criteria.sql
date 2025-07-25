-- =============================================================================
-- ESSENTIAL WCAG 2.2 CRITERIA - COMPLETION SCRIPT
-- =============================================================================
-- Purpose: Add the most critical remaining WCAG 2.2 criteria
-- Focus: Core Level A and AA requirements for comprehensive compliance
-- =============================================================================

-- Essential Level A Criteria

-- 2.2.1 Timing Adjustable (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.1', 'Timing Adjustable',
    'For each time limit that is set by the content, the user can turn off, adjust, or extend the time limit.',
    'a', 'both',
    '1. Identify all content with time limits (sessions, forms, etc)
2. Test ability to turn off time limits before encountering them
3. Verify users can adjust time limits to at least 10x default
4. Check for 20-second warning before timeout with extend option
5. Document essential exceptions (real-time events, security)',
    'Users can control time limits through turn off, adjust, or extend mechanisms.',
    'Session timeouts without warning, forms that expire without extension options, time limits that cannot be disabled',
    1, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html'
);

-- 2.2.2 Pause, Stop, Hide (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.2.2', 'Pause, Stop, Hide',
    'For moving, blinking, scrolling, or auto-updating information, users can pause, stop, or hide it.',
    'a', 'both',
    '1. Identify all moving, blinking, or auto-updating content
2. Test that content can be paused, stopped, or hidden
3. Verify controls are easily accessible and clearly labeled
4. Check that pausing does not affect other functionality
5. Test auto-updating content like news feeds or stock tickers',
    'Users can control moving, blinking, scrolling, or auto-updating content.',
    'Carousels without pause controls, auto-scrolling content that cannot be stopped, blinking text without controls',
    1, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html'
);

-- 2.3.1 Three Flashes or Below Threshold (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.3.1', 'Three Flashes or Below Threshold',
    'Web pages do not contain anything that flashes more than three times in any one second period.',
    'a', 'both',
    '1. Identify all flashing or blinking content
2. Count flashes per second (must be 3 or fewer)
3. Test with seizure analysis tools if available
4. Check for large bright flashing areas
5. Verify flash thresholds are below general and red flash limits',
    'No content flashes more than three times per second or is below seizure thresholds.',
    'Rapidly flashing animations, strobe effects, bright flashing advertisements',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html'
);

-- 2.4.1 Bypass Blocks (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.1', 'Bypass Blocks',
    'A mechanism is available to bypass blocks of content that are repeated on multiple web pages.',
    'a', 'both',
    '1. Test for skip links or bypass mechanisms
2. Verify skip links work and are accessible via keyboard
3. Check that skip links bypass navigation and repeated content
4. Test with screen reader for proper functionality
5. Verify skip links are visible when focused',
    'Users can skip repeated navigation and content blocks.',
    'Missing skip links, non-functional skip links, skip links that do not bypass content properly',
    1, 15,
    'https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html'
);

-- 2.4.2 Page Titled (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.2', 'Page Titled',
    'Web pages have titles that describe topic or purpose.',
    'a', 'manual',
    '1. Check all pages have unique, descriptive titles
2. Verify titles accurately describe page content or purpose
3. Test that titles are meaningful and specific
4. Check title appears in browser tab and bookmarks
5. Verify titles help users understand their location',
    'All pages have unique, descriptive titles that identify the page topic or purpose.',
    'Missing page titles, generic titles like "Page 1", identical titles across different pages',
    1, 10,
    'https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html'
);

-- 2.4.3 Focus Order (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.3', 'Focus Order',
    'If a web page can be navigated sequentially, focusable components receive focus in an order that preserves meaning and operability.',
    'a', 'both',
    '1. Navigate through page using Tab key only
2. Verify focus order follows logical reading sequence
3. Check that focus order makes sense contextually
4. Test complex interfaces like modals and dynamic content
5. Verify focus order preserves meaning and operability',
    'Focus order follows a logical sequence that preserves meaning and operability.',
    'Focus jumping around illogically, focus order that confuses context, focus bypassing important content',
    1, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html'
);

-- 2.4.4 Link Purpose (In Context) (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.4', 'Link Purpose (In Context)',
    'The purpose of each link can be determined from the link text alone or from the link text together with its context.',
    'a', 'manual',
    '1. Review all links on the page
2. Check that link purpose is clear from link text
3. Verify context provides clarity for ambiguous links
4. Test with screen reader link lists
5. Check that "click here" and "read more" links have context',
    'Link purpose can be determined from link text alone or with programmatically determined context.',
    'Links with only "click here" or "read more" text, ambiguous links without context, generic link text',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html'
);

-- Essential Level AA Criteria

-- 1.4.4 Resize Text (Level AA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '1.4.4', 'Resize Text',
    'Except for captions and images of text, text can be resized without assistive technology up to 200 percent without loss of content or functionality.',
    'aa', 'both',
    '1. Test zooming to 200% in browser
2. Verify all text remains readable and functional
3. Check that content does not get cut off or disappear
4. Test horizontal scrolling requirements
5. Verify functionality remains intact at 200% zoom',
    'Text can be resized to 200% without loss of content or functionality.',
    'Text that becomes unreadable when zoomed, content that disappears at high zoom levels, broken functionality at 200% zoom',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html'
);

-- 2.4.5 Multiple Ways (Level AA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.5', 'Multiple Ways',
    'More than one way is available to locate a web page within a set of web pages.',
    'aa', 'manual',
    '1. Identify all ways to find pages (navigation, search, sitemap)
2. Test search functionality if present
3. Check for sitemap or site index
4. Verify navigation menus provide access to pages
5. Test that multiple methods actually work',
    'At least two methods are available to locate pages (navigation, search, sitemap, etc).',
    'Only one way to find pages, broken search functionality, missing navigation alternatives',
    2, 15,
    'https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html'
);

-- 2.4.6 Headings and Labels (Level AA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.6', 'Headings and Labels',
    'Headings and labels describe topic or purpose.',
    'aa', 'manual',
    '1. Review all headings for descriptiveness
2. Check that headings accurately describe following content
3. Verify form labels clearly describe their purpose
4. Test that headings and labels are meaningful out of context
5. Check for consistent and logical heading structure',
    'All headings and labels are descriptive and clearly indicate their topic or purpose.',
    'Generic headings like "Section 1", vague labels like "Field", headings that do not describe content',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html'
);

-- 2.4.7 Focus Visible (Level AA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '2.4.7', 'Focus Visible',
    'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
    'aa', 'both',
    '1. Navigate through all interactive elements using keyboard
2. Verify focus indicator is visible on all focusable elements
3. Check focus indicator has sufficient contrast
4. Test custom interactive components for focus visibility
5. Verify focus is not hidden by other content',
    'Keyboard focus indicators are visible on all focusable elements.',
    'Invisible focus indicators, focus indicators that blend into background, missing focus styling on custom controls',
    1, 25,
    'https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html'
);

-- 3.1.1 Language of Page (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.1', 'Language of Page',
    'The default human language of each web page can be programmatically determined.',
    'a', 'both',
    '1. Check HTML lang attribute is present on html element
2. Verify lang attribute uses valid language code
3. Test with screen reader to confirm correct language
4. Check that language matches actual page content
5. Verify language is appropriate for the content',
    'Page language is programmatically identified using valid language codes.',
    'Missing lang attribute, incorrect language codes, lang attribute that does not match content language',
    1, 10,
    'https://www.w3.org/WAI/WCAG22/Understanding/language-of-page.html'
);

-- 3.1.2 Language of Parts (Level AA)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.1.2', 'Language of Parts',
    'The human language of each passage or phrase in the content can be programmatically determined.',
    'aa', 'both',
    '1. Identify content in different languages than the page default
2. Check that lang attributes are applied to foreign language content
3. Verify language codes are correct for the specific content
4. Test with screen reader for proper pronunciation
5. Check that proper names and technical terms are handled appropriately',
    'Content in languages different from the page default has appropriate lang attributes.',
    'Foreign language content without lang attributes, incorrect language identification, mixed language content not marked',
    2, 15,
    'https://www.w3.org/WAI/WCAG22/Understanding/language-of-parts.html'
);

-- Essential remaining criteria for forms and interaction

-- 3.2.1 On Focus (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.2.1', 'On Focus',
    'When any user interface component receives focus, it does not initiate a change of context.',
    'a', 'both',
    '1. Navigate through all focusable elements
2. Verify no unexpected context changes occur on focus
3. Check that forms do not auto-submit when fields receive focus
4. Test that new windows do not open on focus
5. Verify focus does not trigger page navigation',
    'Receiving focus does not initiate changes of context like page navigation or form submission.',
    'Forms that auto-submit on focus, links that navigate on focus, popups that open when elements receive focus',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/on-focus.html'
);

-- 3.2.2 On Input (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '3.2.2', 'On Input',
    'Changing the setting of any user interface component does not automatically cause a change of context.',
    'a', 'both',
    '1. Test all form controls and input methods
2. Verify no automatic context changes occur when values change
3. Check that radio buttons and checkboxes do not auto-submit
4. Test dropdown menus do not auto-navigate
5. Verify users can complete input before any automatic action',
    'Changing input values does not automatically cause context changes without user warning.',
    'Dropdown menus that auto-navigate, radio buttons that auto-submit forms, checkboxes that trigger immediate actions',
    1, 20,
    'https://www.w3.org/WAI/WCAG22/Understanding/on-input.html'
);

-- 4.1.2 Name, Role, Value (Level A)
INSERT INTO test_requirements (
    requirement_type, criterion_number, title, description, level, test_method,
    testing_instructions, acceptance_criteria, failure_examples,
    priority, estimated_time_minutes, wcag_url
) VALUES (
    'wcag', '4.1.2', 'Name, Role, Value',
    'For all user interface components, the name and role can be programmatically determined.',
    'a', 'both',
    '1. Test all interactive elements with screen reader
2. Verify accessible names are provided for all controls
3. Check that roles are properly defined for custom components
4. Test that states and values are programmatically available
5. Verify form labels are properly associated',
    'All UI components have programmatically determinable names, roles, and values.',
    'Unlabeled form controls, custom components without proper roles, buttons without accessible names',
    1, 30,
    'https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html'
);

-- Check final count
SELECT 
    'WCAG 2.2 Requirements Summary' as summary,
    requirement_type,
    level,
    COUNT(*) as count
FROM test_requirements 
WHERE requirement_type = 'wcag'
GROUP BY requirement_type, level 
ORDER BY level; 