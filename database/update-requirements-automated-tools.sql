-- Update Requirements with Automated Tool Information
-- Date: 2025-01-25
-- Description: Add automated tool information and update test methods for requirements

-- First, add columns for automated tool information if they don't exist
ALTER TABLE test_requirements 
ADD COLUMN IF NOT EXISTS automated_tools JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tool_mapping JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS automation_confidence VARCHAR(20) DEFAULT 'medium' CHECK (automation_confidence IN ('low', 'medium', 'high'));

-- Update WCAG requirements that can be automated or are hybrid
-- Color Contrast requirements (axe-core, pa11y, lighthouse)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["color-contrast"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.AA", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "color-contrast", "scoring": "binary"},
        "WAVE": {"indicators": ["contrast"], "alerts": ["contrast"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('1.4.3', '1.4.6') AND requirement_type = 'wcag';

-- Non-text Content / Alt Text (highly automatable)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["image-alt", "object-alt", "area-alt"], "impact": "critical"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "image-alt", "scoring": "binary"},
        "WAVE": {"indicators": ["alt"], "alerts": ["alt_missing", "alt_suspicious"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('1.1.1') AND requirement_type = 'wcag';

-- Page Titles (automatable)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["document-title"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "document-title", "scoring": "binary"},
        "WAVE": {"indicators": ["title"], "alerts": ["title_invalid"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('2.4.2') AND requirement_type = 'wcag';

-- Headings and Labels (hybrid - structure can be automated, appropriateness needs manual)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["heading-order", "empty-heading"], "impact": "moderate"},
        "pa11y": {"standard": "WCAG2.1.AA", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["heading"], "alerts": ["heading_skipped", "heading_empty"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('2.4.6', '1.3.1') AND requirement_type = 'wcag';

-- Language of Page/Parts (automatable)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["html-has-lang", "html-lang-valid"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "html-has-lang", "scoring": "binary"},
        "WAVE": {"indicators": ["lang"], "alerts": ["lang_missing"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('3.1.1', '3.1.2') AND requirement_type = 'wcag';

-- Form Labels (hybrid - presence can be automated, appropriateness needs manual)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["label", "label-title-only"], "impact": "critical"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["label"], "alerts": ["label_missing", "label_orphaned"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('3.3.2', '1.3.1') AND requirement_type = 'wcag';

-- Keyboard Navigation (mostly manual, some automated detection)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["focusable-content", "tabindex"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]}
    }'::jsonb,
    automation_confidence = 'low'
WHERE criterion_number IN ('2.1.1', '2.1.2', '2.4.3') AND requirement_type = 'wcag';

-- Focus Visible (hybrid)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["focus-order-semantics"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.AA", "runners": ["htmlcs"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('2.4.7') AND requirement_type = 'wcag';

-- Link Purpose (hybrid - link text can be automated, context needs manual)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["link-name"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["link"], "alerts": ["link_empty", "link_suspicious"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('2.4.4', '2.4.9') AND requirement_type = 'wcag';

-- Tables (hybrid - headers can be automated, complexity needs manual)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["table-fake-caption", "td-headers-attr", "th-has-data-cells"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.A", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["table"], "alerts": ["table_missing_headers"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('1.3.1') AND requirement_type = 'wcag' AND title ILIKE '%table%';

-- ARIA (hybrid - syntax can be automated, semantics need manual)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["aria-*"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2.1.AA", "runners": ["htmlcs"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE (title ILIKE '%aria%' OR description ILIKE '%aria%') AND requirement_type = 'wcag';

-- Update Section 508 requirements that can have some automation
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "note": "Section 508 compliance often maps to WCAG criteria",
        "primary_tool": "axe-core",
        "secondary_tools": ["pa11y", "WAVE"]
    }'::jsonb,
    automation_confidence = 'medium'
WHERE requirement_type = 'section_508' AND test_method = 'manual'
AND (title ILIKE '%text%' OR title ILIKE '%color%' OR title ILIKE '%label%');

-- Add some purely automated requirements for common issues
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    automation_confidence = 'high'
WHERE requirement_type = 'wcag' 
AND test_method = 'manual'
AND (
    title ILIKE '%contrast%' OR 
    title ILIKE '%duplicate%' OR
    title ILIKE '%valid%' OR
    criterion_number IN ('1.4.3', '1.4.6', '2.4.2', '3.1.1', '4.1.1', '4.1.2')
);

-- Update testing instructions to include automated tool information for hybrid/automated tests
UPDATE test_requirements 
SET testing_instructions = CASE 
    WHEN test_method = 'automated' THEN 
        COALESCE(testing_instructions, '') || E'\n\nAUTOMATED TESTING:\n' ||
        '• Run axe-core accessibility scanner\n' ||
        '• Use pa11y command-line tool\n' ||
        '• Check with WAVE browser extension\n' ||
        '• Verify with Lighthouse accessibility audit\n' ||
        '• Review automated tool reports for violations'
    WHEN test_method = 'both' THEN 
        COALESCE(testing_instructions, '') || E'\n\nHYBRID TESTING APPROACH:\n' ||
        '1. AUTOMATED PHASE:\n' ||
        '   • Run axe-core, pa11y, and WAVE tools\n' ||
        '   • Review automated findings\n' ||
        '   • Document tool-detected issues\n' ||
        '2. MANUAL PHASE:\n' ||
        '   • Verify automated findings\n' ||
        '   • Test scenarios tools cannot detect\n' ||
        '   • Evaluate user experience and context\n' ||
        '   • Confirm real-world usability'
    ELSE testing_instructions
END
WHERE test_method IN ('automated', 'both') AND automated_tools IS NOT NULL;

-- Log the updates
SELECT 
    requirement_type,
    test_method,
    COUNT(*) as count,
    COUNT(CASE WHEN automated_tools IS NOT NULL THEN 1 END) as with_tools
FROM test_requirements 
GROUP BY requirement_type, test_method
ORDER BY requirement_type, test_method; 