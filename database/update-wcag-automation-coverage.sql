-- WCAG 2.2 & Section 508 Automation Coverage Update
-- Based on industry analysis: 57% of accessibility issues can be automated
-- This script updates our test_requirements to align with industry standards

-- ===== LEVEL A REQUIREMENTS (30 total) =====

-- FULLY AUTOMATED (High confidence tools)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["image-alt", "color-contrast", "page-has-heading-one", "html-lang-valid"], "impact": "critical"},
        "pa11y": {"standard": "WCAG2A", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "accessibility", "scoring": "binary"},
        "WAVE": {"indicators": ["alt", "contrast", "title"], "alerts": ["alt", "contrast"]}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('1.1.1', '1.4.1', '1.4.2', '2.4.1', '2.4.2', '3.1.1', '4.1.2') 
AND requirement_type = 'wcag';

-- MIXED AUTO/MANUAL (Medium confidence, requires review)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["heading-order", "list", "table-fake-caption"], "impact": "moderate"},
        "pa11y": {"standard": "WCAG2A", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["heading", "list", "table"], "alerts": ["structure"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('1.3.1', '2.1.2', '2.4.4', '3.3.1', '3.3.2') 
AND requirement_type = 'wcag';

-- ===== LEVEL AA REQUIREMENTS (22 total) =====

-- FULLY AUTOMATED (High confidence tools)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE", "color-contrast-analyzer"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["color-contrast", "image-alt", "label"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2AA", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "color-contrast", "scoring": "binary"},
        "WAVE": {"indicators": ["contrast", "alt"], "alerts": ["contrast"]},
        "color-contrast-analyzer": {"audit": "contrast", "threshold": "4.5:1"}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('1.3.5', '1.4.3', '1.4.11', '2.5.3') 
AND requirement_type = 'wcag';

-- MIXED AUTO/MANUAL (Medium confidence, requires review)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["orientation", "resize-text", "text-spacing", "focus-visible"], "impact": "moderate"},
        "pa11y": {"standard": "WCAG2AA", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["structure", "focus"], "alerts": ["layout"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('1.3.4', '1.4.4', '1.4.10', '1.4.12', '2.4.6', '2.4.7', '2.4.11', '2.4.13', '3.1.2', '4.1.3') 
AND requirement_type = 'wcag';

-- ===== LEVEL AAA REQUIREMENTS (34 total) =====

-- FULLY AUTOMATED (High confidence tools)
UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "lighthouse", "WAVE", "color-contrast-analyzer", "luma"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["color-contrast", "three-flashes", "target-size"], "impact": "serious"},
        "pa11y": {"standard": "WCAG2AAA", "runners": ["htmlcs"]},
        "lighthouse": {"audit": "color-contrast", "scoring": "binary"},
        "WAVE": {"indicators": ["contrast", "flash"], "alerts": ["contrast"]},
        "color-contrast-analyzer": {"audit": "contrast", "threshold": "7:1"},
        "luma": {"audit": "flash", "threshold": "3-per-second"}
    }'::jsonb,
    automation_confidence = 'high'
WHERE criterion_number IN ('1.4.6', '2.3.2', '2.5.5') 
AND requirement_type = 'wcag';

-- MIXED AUTO/MANUAL (Medium confidence, requires review)
UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "WAVE"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["link-name", "heading-order"], "impact": "moderate"},
        "pa11y": {"standard": "WCAG2AAA", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["link", "heading"], "alerts": ["structure"]}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE criterion_number IN ('2.4.9', '2.4.10') 
AND requirement_type = 'wcag';

-- ===== MANUAL ONLY REQUIREMENTS =====
-- These cannot be reliably automated and require human evaluation

UPDATE test_requirements 
SET 
    test_method = 'manual',
    automated_tools = '[]'::jsonb,
    tool_mapping = '{}'::jsonb,
    automation_confidence = 'none'
WHERE criterion_number IN (
    -- Level A Manual Only
    '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.6', '1.2.7', '1.2.8', '1.2.9',
    '1.3.2', '1.3.3', '1.3.6', '1.4.4', '1.4.7', '1.4.8', '1.4.9',
    '2.1.3', '2.1.4', '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6',
    '2.3.1', '2.3.3', '2.4.5', '2.4.8', '2.5.6', '2.5.7', '2.5.8',
    '3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.2.1', '3.2.2', '3.2.5', '3.2.6',
    '3.3.5', '3.3.6', '3.3.7', '3.3.8', '3.3.9',
    -- Level AA Manual Only
    '1.2.4', '1.2.5', '1.4.5', '1.4.10', '1.4.12', '1.4.13',
    '2.1.1', '2.1.4', '2.4.3', '2.4.5', '2.4.12', '2.5.1', '2.5.2', '2.5.4',
    '3.2.3', '3.2.4', '3.3.3', '3.3.4', '3.3.7', '3.3.8',
    -- Level AAA Manual Only
    '1.4.7', '1.4.8', '2.1.3', '2.2.3', '2.2.4', '2.2.5', '2.2.6',
    '2.3.3', '2.4.8', '2.5.6', '3.2.6', '3.3.9'
) AND requirement_type = 'wcag';

-- ===== SECTION 508 REQUIREMENTS =====
-- Update Section 508 requirements to align with WCAG automation

UPDATE test_requirements 
SET 
    test_method = 'automated',
    automated_tools = '["axe-core", "pa11y", "WAVE", "ANDI"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["section508"], "impact": "serious"},
        "pa11y": {"standard": "Section508", "runners": ["htmlcs"]},
        "WAVE": {"indicators": ["section508"], "alerts": ["section508"]},
        "ANDI": {"audit": "section508", "focus": "screen-reader"}
    }'::jsonb,
    automation_confidence = 'high'
WHERE requirement_type = 'section508' 
AND title ILIKE '%electronic content%';

UPDATE test_requirements 
SET 
    test_method = 'both',
    automated_tools = '["axe-core", "pa11y", "ANDI"]'::jsonb,
    tool_mapping = '{
        "axe-core": {"rules": ["section508"], "impact": "moderate"},
        "pa11y": {"standard": "Section508", "runners": ["htmlcs"]},
        "ANDI": {"audit": "section508", "focus": "software-apps"}
    }'::jsonb,
    automation_confidence = 'medium'
WHERE requirement_type = 'section508' 
AND title ILIKE '%software application%';

UPDATE test_requirements 
SET 
    test_method = 'manual',
    automated_tools = '[]'::jsonb,
    tool_mapping = '{}'::jsonb,
    automation_confidence = 'none'
WHERE requirement_type = 'section508' 
AND (title ILIKE '%authoring tool%' OR title ILIKE '%telecommunication%' OR title ILIKE '%video%' OR title ILIKE '%multimedia%');

-- ===== VERIFICATION QUERY =====
-- Check the updated automation coverage

SELECT 
    test_method,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM test_requirements 
WHERE requirement_type = 'wcag'
GROUP BY test_method 
ORDER BY test_method;

-- Show detailed breakdown by level
SELECT 
    CASE 
        WHEN criterion_number LIKE '1.%' THEN 'Level A'
        WHEN criterion_number LIKE '2.%' THEN 'Level AA' 
        WHEN criterion_number LIKE '3.%' THEN 'Level AAA'
        WHEN criterion_number LIKE '4.%' THEN 'Level AAA'
        ELSE 'Other'
    END as level,
    test_method,
    COUNT(*) as count
FROM test_requirements 
WHERE requirement_type = 'wcag'
GROUP BY level, test_method 
ORDER BY level, test_method; 