-- Add Hover/Focus Automated Test Capabilities
-- Date: July 14, 2025  
-- Description: Add automated testing for detectable aspects of WCAG 1.4.13

-- =============================================================================
-- UPDATE REQUIREMENT TEST MAPPING SERVICE WITH HOVER/FOCUS RULES
-- =============================================================================

-- Since we can't directly modify the JavaScript service from SQL, 
-- we'll add database-driven test configurations that the service can reference

-- Create a table for enhanced automated test rules if it doesn't exist
CREATE TABLE IF NOT EXISTS automated_test_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    criterion_number VARCHAR(20) NOT NULL,
    tool_name VARCHAR(50) NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    confidence_level VARCHAR(20) NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    coverage_aspect TEXT NOT NULL,
    test_description TEXT NOT NULL,
    automation_approach TEXT NOT NULL,
    limitations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(criterion_number, tool_name, rule_id)
);

-- Add automated test rules for 1.4.13 (Content on Hover or Focus)
-- These can detect SOME aspects automatically, but manual testing is still required

INSERT INTO automated_test_rules (
    criterion_number, tool_name, rule_id, confidence_level, 
    coverage_aspect, test_description, automation_approach, limitations
) VALUES

-- Playwright-based hover content detection
('1.4.13', 'playwright', 'hover-content-detection', 'medium',
'Detection of hover-triggered content',
'Detect elements that show/hide content on hover using CSS :hover selectors or JavaScript event listeners',
'Scan DOM for elements with hover event listeners, CSS :hover rules, and title attributes that trigger content',
'Cannot test interaction behavior, persistence, or dismissibility - requires manual verification'),

-- Playwright-based focus content detection  
('1.4.13', 'playwright', 'focus-content-detection', 'medium',
'Detection of focus-triggered content', 
'Detect elements that show/hide content on focus using CSS :focus selectors or JavaScript event listeners',
'Scan DOM for elements with focus event listeners, CSS :focus rules, and aria-describedby patterns',
'Cannot test if content stays visible, is hoverable, or can be dismissed - requires manual verification'),

-- Axe-core integration for ARIA patterns
('1.4.13', 'axe-core', 'aria-describedby-hover', 'medium',
'ARIA patterns for hover/focus content',
'Check for proper ARIA attributes on elements that trigger additional content',
'Validate aria-describedby, aria-expanded, and role attributes on trigger elements',
'Cannot verify actual behavior, timing, or user interaction patterns'),

-- Generic tooltip detection
('1.4.13', 'playwright', 'tooltip-detection', 'low',
'Basic tooltip element detection',
'Find elements with tooltip-like attributes and classes',
'Search for title attributes, tooltip classes, and data-tooltip attributes',
'Cannot test tooltip behavior, only presence of tooltip-indicating markup'),

-- CSS hover state analysis
('1.4.13', 'playwright', 'css-hover-analysis', 'low', 
'CSS hover state detection',
'Analyze CSS for hover states that might trigger content visibility',
'Parse stylesheets for :hover pseudo-classes that modify visibility, display, or opacity',
'Cannot test actual behavior or user interaction, only CSS rule presence')

ON CONFLICT (criterion_number, tool_name, rule_id) DO UPDATE SET
    confidence_level = EXCLUDED.confidence_level,
    coverage_aspect = EXCLUDED.coverage_aspect,
    test_description = EXCLUDED.test_description,
    automation_approach = EXCLUDED.automation_approach,
    limitations = EXCLUDED.limitations;

-- =============================================================================
-- UPDATE 1.4.13 TO HYBRID APPROACH WITH AUTOMATED DETECTION
-- =============================================================================

-- Update 1.4.13 to use 'both' method since we now have some automated detection
UPDATE test_requirements 
SET 
    test_method = 'both',
    testing_instructions = 'AUTOMATED: Run scripts to detect hover/focus triggered content, check ARIA patterns, and identify tooltip elements. MANUAL: Test that detected hover/focus content can be dismissed with Escape key, stays visible when mouse moves to it, and persists appropriately.',
    acceptance_criteria = 'Automated detection identifies hover/focus content patterns. Manual testing confirms content can be dismissed, is hoverable, and persists until dismissed.',
    failure_examples = 'Hover content detected but cannot be dismissed. Focus content that disappears on slight movement. Missing ARIA attributes on trigger elements.',
    estimated_time_minutes = 30,
    priority = 2  -- Hybrid priority
WHERE requirement_type = 'wcag' AND criterion_number = '1.4.13';

-- =============================================================================
-- CREATE VIEW FOR ENHANCED TEST METHOD REPORTING
-- =============================================================================

CREATE OR REPLACE VIEW test_method_coverage AS
SELECT 
    tr.criterion_number,
    tr.title,
    tr.test_method,
    tr.priority,
    tr.estimated_time_minutes,
    COALESCE(atr.automated_aspects, 0) as automated_test_rules,
    CASE 
        WHEN tr.test_method = 'automated' THEN 'Fully Automated'
        WHEN tr.test_method = 'manual' THEN 'Manual Only'
        WHEN tr.test_method = 'both' AND COALESCE(atr.automated_aspects, 0) > 0 THEN 'Hybrid (Automated + Manual)'
        WHEN tr.test_method = 'both' THEN 'Hybrid (No Automated Rules)'
        ELSE 'Unknown'
    END as test_approach,
    CASE 
        WHEN tr.test_method = 'automated' THEN 95
        WHEN tr.test_method = 'both' AND COALESCE(atr.automated_aspects, 0) >= 3 THEN 70
        WHEN tr.test_method = 'both' AND COALESCE(atr.automated_aspects, 0) >= 1 THEN 50  
        WHEN tr.test_method = 'both' THEN 30
        WHEN tr.test_method = 'manual' THEN 10
        ELSE 0
    END as automation_confidence_percent
FROM test_requirements tr
LEFT JOIN (
    SELECT 
        criterion_number, 
        COUNT(*) as automated_aspects,
        STRING_AGG(coverage_aspect, ', ' ORDER BY confidence_level DESC) as covered_aspects
    FROM automated_test_rules 
    GROUP BY criterion_number
) atr ON tr.criterion_number = atr.criterion_number
WHERE tr.requirement_type = 'wcag'
ORDER BY tr.criterion_number;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Show updated 1.4.13 with automated test rules
SELECT 
    tmv.criterion_number,
    tmv.title, 
    tmv.test_method,
    tmv.test_approach,
    tmv.automation_confidence_percent,
    tmv.automated_test_rules,
    tr.testing_instructions
FROM test_method_coverage tmv
JOIN test_requirements tr ON tmv.criterion_number = tr.criterion_number 
WHERE tmv.criterion_number = '1.4.13';

-- Show all automated test rules for 1.4.13
SELECT 
    tool_name,
    rule_id,
    confidence_level,
    coverage_aspect,
    limitations
FROM automated_test_rules 
WHERE criterion_number = '1.4.13'
ORDER BY confidence_level DESC, tool_name;

-- Summary of test method distribution
SELECT 
    test_approach,
    COUNT(*) as criteria_count,
    ROUND(AVG(automation_confidence_percent), 1) as avg_automation_confidence,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM test_method_coverage), 1) as percentage
FROM test_method_coverage
GROUP BY test_approach
ORDER BY criteria_count DESC; 