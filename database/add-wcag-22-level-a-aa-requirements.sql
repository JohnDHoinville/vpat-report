-- =============================================================================
-- ADD MISSING WCAG 2.2 LEVEL A AND AA REQUIREMENTS TO wcag_requirements TABLE
-- =============================================================================
-- Purpose: Add missing WCAG 2.2 Level A and AA requirements to wcag_requirements table
-- Issue: Database currently has WCAG 2.1 A/AA/AAA and WCAG 2.2 AAA only
-- Missing: WCAG 2.2 Level A (29 requirements) and Level AA (27 requirements) = 56 total
-- Date: August 30, 2025
-- Reference: https://www.w3.org/TR/WCAG22/
-- =============================================================================

-- First, let's add the new WCAG 2.2 Level A requirements
-- These are all the WCAG 2.1 Level A requirements plus the new 2.2 additions

-- NEW WCAG 2.2 Level A Requirements (added in WCAG 2.2)

-- 3.2.6 Consistent Help (Level A) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'A', '3.2.6', 'Consistent Help',
    'If help mechanisms are available, they occur in the same order relative to other page content across pages.',
    '{
        "overview": "Verify help mechanisms appear consistently in the same relative location across pages.",
        "steps": [
            "Identify all help mechanisms (contact info, chat, FAQs, help links)",
            "Check consistency of location across multiple pages",
            "Verify help options appear in same relative order",
            "Test that help remains findable and predictable",
            "Document any user-initiated changes to help placement"
        ],
        "tools_needed": ["browser_dev_tools"],
        "expected_results": "Help mechanisms appear consistently in the same relative location across pages.",
        "common_failures": ["Help links moving between header and footer", "inconsistent help placement", "unpredictable help locations"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html',
    '{all}',
    'manual', 'medium', 'manual',
    'Predictable', ''
);

-- 3.3.7 Redundant Entry (Level A) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'A', '3.3.7', 'Redundant Entry',
    'Information previously entered by or provided to the user that is required to be entered again in the same process is either auto-populated or available for selection.',
    '{
        "overview": "Verify users do not need to re-enter information previously provided in the same session.",
        "steps": [
            "Test multi-step forms and processes",
            "Verify previously entered information is auto-populated",
            "Check that information can be selected rather than re-typed",
            "Test with billing/shipping address scenarios",
            "Document valid exceptions (security, changed information)"
        ],
        "tools_needed": ["browser_dev_tools"],
        "expected_results": "Users do not need to re-enter information previously provided in the same session.",
        "common_failures": ["Multi-step forms requiring re-entry", "checkout processes without auto-fill", "repeated data entry requirements"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html',
    '{all}',
    'both', 'medium', 'manual',
    'Input Assistance', ''
);

-- Copy existing WCAG 2.1 Level A requirements as WCAG 2.2 Level A requirements
-- (These criteria are the same between 2.1 and 2.2)
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
)
SELECT 
    '2.2' as wcag_version,
    level,
    criterion_number,
    title,
    description,
    manual_test_procedure,
    tool_mappings,
    REPLACE(understanding_url, 'WCAG21', 'WCAG22') as understanding_url,
    applies_to_page_types,
    testable_method,
    automation_coverage,
    test_method,
    guideline_title,
    section_508_mapping
FROM wcag_requirements 
WHERE wcag_version = '2.1' 
  AND level = 'A'
  AND criterion_number NOT IN ('3.2.6', '3.3.7'); -- Exclude the new ones we already added

-- NEW WCAG 2.2 Level AA Requirements (added in WCAG 2.2)

-- 2.4.11 Focus Not Obscured (Minimum) (Level AA) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'AA', '2.4.11', 'Focus Not Obscured (Minimum)',
    'When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content.',
    '{
        "overview": "Verify focused elements are never completely obscured by other content like sticky headers or modals.",
        "steps": [
            "Navigate through all focusable elements using keyboard",
            "Check that focused elements are never completely hidden",
            "Test with sticky headers, footers, and overlays",
            "Verify focused elements remain partially or fully visible",
            "Test in different viewport sizes and zoom levels"
        ],
        "tools_needed": ["browser_dev_tools", "keyboard_navigation"],
        "expected_results": "Focused elements are never completely obscured by other content like sticky headers or modals.",
        "common_failures": ["Focus hidden behind sticky navigation", "modal dialogs obscuring focused elements", "overlays completely hiding focus"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html',
    '{all}',
    'both', 'medium', 'manual',
    'Navigable', ''
);

-- 2.5.7 Dragging Movements (Level AA) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'AA', '2.5.7', 'Dragging Movements',
    'All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging.',
    '{
        "overview": "Verify all dragging operations have single-point alternatives unless dragging is essential.",
        "steps": [
            "Identify all drag-and-drop functionality",
            "Test alternative single-point methods (click, tap)",
            "Verify sliders can be operated with clicks/taps",
            "Check sortable lists have alternative interaction methods",
            "Test file uploads support click-to-select alternatives"
        ],
        "tools_needed": ["browser_dev_tools", "touch_simulation"],
        "expected_results": "All dragging operations have single-point alternatives unless dragging is essential.",
        "common_failures": ["Drag-only sliders", "sortable lists without keyboard alternatives", "file uploads requiring drag-and-drop only"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html',
    '{all}',
    'both', 'medium', 'manual',
    'Input Modalities', ''
);

-- 2.5.8 Target Size (Minimum) (Level AA) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'AA', '2.5.8', 'Target Size (Minimum)',
    'The size of the target for pointer inputs is at least 24 by 24 CSS pixels, with specified exceptions.',
    '{
        "overview": "Verify interactive targets are at least 24x24 CSS pixels or have adequate spacing.",
        "steps": [
            "Measure all clickable targets (buttons, links, controls)",
            "Verify targets are at least 24x24 CSS pixels",
            "Check spacing between undersized targets",
            "Test equivalent alternatives for small targets",
            "Document valid exceptions (inline links, user agent controls)"
        ],
        "tools_needed": ["browser_dev_tools", "measurement_tools"],
        "expected_results": "Interactive targets are at least 24x24 CSS pixels or have adequate spacing.",
        "common_failures": ["Small buttons without spacing", "tiny icons", "cramped mobile navigation"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
    '{all}',
    'both', 'high', 'manual',
    'Input Modalities', ''
);

-- 3.3.8 Accessible Authentication (Minimum) (Level AA) - NEW in 2.2
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
) VALUES (
    '2.2', 'AA', '3.3.8', 'Accessible Authentication (Minimum)',
    'A cognitive function test is not required for any step in an authentication process unless alternatives or assistance are provided.',
    '{
        "overview": "Verify authentication does not rely solely on cognitive function tests, or provides alternatives.",
        "steps": [
            "Test all authentication methods",
            "Verify alternatives to password memorization exist",
            "Check for authentication via email/SMS links",
            "Test password manager compatibility",
            "Verify copy-paste functionality for passwords works",
            "Check object recognition alternatives"
        ],
        "tools_needed": ["browser_dev_tools", "password_manager"],
        "expected_results": "Authentication does not rely solely on cognitive function tests, or provides alternatives.",
        "common_failures": ["Password-only authentication without alternatives", "complex puzzles without help", "memory-dependent authentication"]
    }',
    '{}',
    'https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html',
    '{all}',
    'both', 'high', 'manual',
    'Input Assistance', ''
);

-- Copy existing WCAG 2.1 Level AA requirements as WCAG 2.2 Level AA requirements
-- (These criteria are the same between 2.1 and 2.2)
INSERT INTO wcag_requirements (
    wcag_version, level, criterion_number, title, description,
    manual_test_procedure, tool_mappings, understanding_url,
    applies_to_page_types, testable_method, automation_coverage, test_method,
    guideline_title, section_508_mapping
)
SELECT 
    '2.2' as wcag_version,
    level,
    criterion_number,
    title,
    description,
    manual_test_procedure,
    tool_mappings,
    REPLACE(understanding_url, 'WCAG21', 'WCAG22') as understanding_url,
    applies_to_page_types,
    testable_method,
    automation_coverage,
    test_method,
    guideline_title,
    section_508_mapping
FROM wcag_requirements 
WHERE wcag_version = '2.1' 
  AND level = 'AA'
  AND criterion_number NOT IN ('2.4.11', '2.5.7', '2.5.8', '3.3.8'); -- Exclude the new ones we already added

-- Verify the results
SELECT 
    wcag_version,
    level,
    COUNT(*) as requirement_count
FROM wcag_requirements 
WHERE wcag_version = '2.2' AND level IN ('A', 'AA')
GROUP BY wcag_version, level
ORDER BY level;

-- Show total counts for verification
SELECT 
    wcag_version,
    level,
    COUNT(*) as count
FROM wcag_requirements 
GROUP BY wcag_version, level
ORDER BY wcag_version, level;

-- Success message
DO $$
DECLARE
    total_22_a_aa INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_22_a_aa 
    FROM wcag_requirements 
    WHERE wcag_version = '2.2' AND level IN ('A', 'AA');
    
    RAISE NOTICE '✅ WCAG 2.2 Level A and AA requirements successfully added!';
    RAISE NOTICE '📊 Total WCAG 2.2 Level A + AA requirements: %', total_22_a_aa;
    RAISE NOTICE '🎯 Expected: 56 requirements (29 Level A + 27 Level AA)';
    
    IF total_22_a_aa = 56 THEN
        RAISE NOTICE '🎉 SUCCESS: All 56 WCAG 2.2 Level A and AA requirements are now in the database!';
    ELSE
        RAISE NOTICE '⚠️  Expected 56 but found %. Please verify the migration.', total_22_a_aa;
    END IF;
END $$;
