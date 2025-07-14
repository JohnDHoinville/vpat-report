-- Fix Test Method Alignment Issues
-- Date: July 14, 2025
-- Description: Fix criterion 1.4.13 and other test method inconsistencies

-- =============================================================================
-- CRITERION 1.4.13 (Content on Hover or Focus) FIX
-- =============================================================================

-- Update 1.4.13 from 'automated' to 'manual' since hover/focus behavior 
-- requires manual testing or sophisticated user interaction simulation
UPDATE test_requirements 
SET 
    test_method = 'manual',
    testing_instructions = 'Test that hover/focus triggered content can be dismissed with Escape key, content stays visible when mouse moves to it, and content doesn''t disappear unexpectedly. Test tooltips, dropdown menus, and custom hover content.',
    acceptance_criteria = 'Hover content can be dismissed with Escape key. Content stays visible when mouse moves to it. Content persists until user dismisses it or removes trigger.',
    failure_examples = 'Tooltips that disappear when mouse moves slightly. Hover content without Escape key dismiss. Content that disappears on slight mouse movement.',
    estimated_time_minutes = 25
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.13';

-- =============================================================================
-- AUDIT AND FIX OTHER POTENTIAL MISALIGNMENTS  
-- =============================================================================

-- Update 1.4.12 (Text Spacing) - This CAN be automated with CSS injection testing
UPDATE test_requirements 
SET 
    test_method = 'automated',
    testing_instructions = 'Inject CSS to increase line-height to 1.5x, paragraph spacing to 2x, letter spacing to 0.12x, and word spacing to 0.16x font size. Verify no content is clipped or overlaps.',
    acceptance_criteria = 'Content remains functional and readable with increased text spacing. No text is clipped, overlapped, or becomes unreadable.',
    failure_examples = 'Text overlapping with increased spacing. Content clipped by containers. Layouts breaking with text spacing changes.'
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.12';

-- Update 2.4.7 (Focus Visible) - This CAN be automated by checking focus styles
UPDATE test_requirements 
SET 
    test_method = 'automated',
    testing_instructions = 'Programmatically focus each interactive element and verify focus indicator has sufficient contrast and is visible.',
    acceptance_criteria = 'All focusable elements have visible focus indicators with at least 3:1 contrast ratio against background.',
    failure_examples = 'Focus indicators with insufficient contrast. Elements where focus is not visible. Focus styles removed by CSS.'
WHERE requirement_type = 'wcag' AND criterion_number = '2.4.7';

-- Update 1.4.10 (Reflow) - This CAN be automated by testing responsive behavior
UPDATE test_requirements 
SET 
    test_method = 'automated', 
    testing_instructions = 'Test page at 320px width (horizontal reflow) and 256px height (vertical reflow) to ensure no two-dimensional scrolling is required.',
    acceptance_criteria = 'Content reflows without requiring horizontal scrolling at 320px width. No two-dimensional scrolling needed.',
    failure_examples = 'Fixed-width layouts requiring horizontal scrolling. Content extending beyond viewport requiring both horizontal and vertical scrolling.'
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.10';

-- Update criteria that should be 'both' (hybrid) instead of purely automated
UPDATE test_requirements 
SET 
    test_method = 'both',
    testing_instructions = 'Run automated contrast checking tools, then manually verify contrast in different states (hover, focus, active) and against background images.',
    acceptance_criteria = 'Normal text has 4.5:1 contrast ratio, large text (18pt+) has 3:1 ratio. Contrast maintained in all interactive states.'
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.3';

UPDATE test_requirements 
SET 
    test_method = 'both',
    testing_instructions = 'Use automated tools to detect missing alt attributes, then manually verify alt text accuracy and appropriateness for context.',
    acceptance_criteria = 'All images have alt attributes. Alt text accurately describes image content and purpose. Decorative images have empty alt text.'
WHERE requirement_type = 'wcag' AND criterion_number = '1.1.1';

-- Update criteria that should be purely manual
UPDATE test_requirements 
SET 
    test_method = 'manual',
    testing_instructions = 'Navigate entire page using only keyboard. Verify all functionality is accessible and no keyboard traps exist.',
    acceptance_criteria = 'All interactive elements reachable by keyboard. All functionality available without mouse. No keyboard focus traps.',
    failure_examples = 'Interactive elements not reachable by Tab key. Functionality requiring mouse interaction. Focus trapped in modal or widget.'
WHERE requirement_type = 'wcag' AND criterion_number = '2.1.1';

-- =============================================================================
-- ADD PRIORITY SCORING BASED ON TEST METHOD ACCURACY
-- =============================================================================

-- High priority for manual-only criteria (need human testing)
UPDATE test_requirements 
SET priority = 1 
WHERE test_method = 'manual' AND requirement_type = 'wcag';

-- Medium priority for hybrid criteria (need both automated and manual)
UPDATE test_requirements 
SET priority = 2 
WHERE test_method = 'both' AND requirement_type = 'wcag';

-- Lower priority for purely automated (can be tested without human intervention)
UPDATE test_requirements 
SET priority = 3 
WHERE test_method = 'automated' AND requirement_type = 'wcag';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show the updated 1.4.13 record
SELECT 
    criterion_number, 
    title, 
    test_method, 
    testing_instructions,
    estimated_time_minutes
FROM test_requirements 
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.13';

-- Show count by test method
SELECT 
    test_method, 
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM test_requirements WHERE requirement_type = 'wcag'), 1) as percentage
FROM test_requirements 
WHERE requirement_type = 'wcag'
GROUP BY test_method
ORDER BY count DESC; 