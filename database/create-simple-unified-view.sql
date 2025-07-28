-- Create Simple Unified Requirements View
-- Based on existing test_requirements table
-- Created: January 14, 2025

-- Drop existing view if it exists
DROP VIEW IF EXISTS unified_requirements;

-- Create simple unified requirements view
CREATE OR REPLACE VIEW unified_requirements AS
SELECT 
    id,
    requirement_type as standard_type,
    criterion_number as requirement_id,
    title,
    description,
    level,
    test_method,
    testing_instructions,
    acceptance_criteria,
    failure_examples,
    wcag_url,
    section_508_url,
    is_active,
    priority,
    estimated_time_minutes,
    created_at,
    updated_at
FROM test_requirements
WHERE is_active = true;

-- Grant permissions
GRANT SELECT ON unified_requirements TO PUBLIC;

-- Test the view
SELECT 
    'Unified Requirements View Created' as status,
    COUNT(*) as total_requirements,
    COUNT(CASE WHEN standard_type = 'wcag' THEN 1 END) as wcag_requirements,
    COUNT(CASE WHEN standard_type = 'section_508' THEN 1 END) as section508_requirements,
    COUNT(CASE WHEN test_method = 'automated' THEN 1 END) as automated_count,
    COUNT(CASE WHEN test_method = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN test_method = 'both' THEN 1 END) as both_count
FROM unified_requirements;

-- Verify specific criteria exist
SELECT 
    'Sample Requirements Check' as check_type,
    requirement_id,
    title,
    test_method,
    standard_type
FROM unified_requirements 
WHERE requirement_id IN ('1.1.1', '1.4.3', '1.4.13', '2.1.1', '4.1.2')
ORDER BY requirement_id; 