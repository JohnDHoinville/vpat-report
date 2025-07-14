-- Create Unified Requirements View
-- Single source of truth for all requirement data
-- Ensures consistency between compliance table and detail views
-- Created: January 14, 2025

-- Drop existing view if it exists
DROP VIEW IF EXISTS unified_requirements;

-- Create comprehensive unified requirements view
CREATE OR REPLACE VIEW unified_requirements AS
WITH wcag_enhanced AS (
    SELECT 
        wr.id,
        'wcag' as requirement_type,
        wr.criterion_number,
        wr.title,
        wr.description,
        wr.level,
        wr.test_method,
        wr.understanding_url as wcag_url,
        NULL as section_508_url,
        true as is_active,
        1 as priority,
        30 as estimated_time_minutes,
        COALESCE(wr.manual_test_procedure->>'overview', wr.description) as testing_instructions,
        'Requirement passes all validation checks' as acceptance_criteria,
        'Common failures include missing or incorrect implementation' as failure_examples,
        wr.wcag_version,
        wr.guideline_title,
        wr.applies_to_page_types,
        wr.manual_test_procedure,
        wr.tool_mappings,
        wr.created_at,
        wr.created_at as updated_at
    FROM wcag_requirements wr
),
test_requirements_wcag AS (
    SELECT 
        tr.id,
        tr.requirement_type,
        tr.criterion_number,
        tr.title,
        tr.description,
        tr.level,
        tr.test_method,
        tr.wcag_url,
        tr.section_508_url,
        tr.is_active,
        tr.priority,
        tr.estimated_time_minutes,
        tr.testing_instructions,
        tr.acceptance_criteria,
        tr.failure_examples,
        '2.1' as wcag_version,
        NULL as guideline_title,
        ARRAY['all'] as applies_to_page_types,
        '{}'::jsonb as manual_test_procedure,
        '{}'::jsonb as tool_mappings,
        tr.created_at,
        tr.updated_at
    FROM test_requirements tr
    WHERE tr.requirement_type = 'wcag'
)

-- Primary data from wcag_requirements (complete and detailed)
SELECT * FROM wcag_enhanced

UNION ALL

-- Add any missing WCAG requirements from test_requirements that aren't in wcag_requirements
SELECT 
    trw.id,
    trw.requirement_type,
    trw.criterion_number,
    trw.title,
    trw.description,
    trw.level,
    trw.test_method,
    trw.wcag_url,
    trw.section_508_url,
    trw.is_active,
    trw.priority,
    trw.estimated_time_minutes,
    trw.testing_instructions,
    trw.acceptance_criteria,
    trw.failure_examples,
    trw.wcag_version,
    trw.guideline_title,
    trw.applies_to_page_types,
    trw.manual_test_procedure,
    trw.tool_mappings,
    trw.created_at,
    trw.updated_at
FROM test_requirements_wcag trw
WHERE NOT EXISTS (
    SELECT 1 FROM wcag_enhanced we 
    WHERE we.criterion_number = trw.criterion_number
)

UNION ALL

-- Add Section 508 requirements
SELECT 
    gen_random_uuid() as id,
    'section_508' as requirement_type,
    sr.section_number as criterion_number,
    sr.title,
    sr.description,
    'base' as level,
    'manual' as test_method,
    NULL as wcag_url,
    sr.reference_url as section_508_url,
    true as is_active,
    1 as priority,
    30 as estimated_time_minutes,
    sr.description as testing_instructions,
    'Meets Section 508 compliance requirements' as acceptance_criteria,
    'Non-compliance with federal accessibility standards' as failure_examples,
    NULL as wcag_version,
    NULL as guideline_title,
    sr.applies_to_page_types,
    sr.manual_test_procedure,
    sr.tool_mappings,
    sr.created_at,
    sr.created_at as updated_at
FROM section_508_requirements sr;

-- Create materialized view for better performance (optional)
-- DROP MATERIALIZED VIEW IF EXISTS unified_requirements_mv;
-- CREATE MATERIALIZED VIEW unified_requirements_mv AS SELECT * FROM unified_requirements;
-- CREATE UNIQUE INDEX unified_requirements_mv_pkey ON unified_requirements_mv(id);
-- CREATE INDEX unified_requirements_mv_criterion ON unified_requirements_mv(criterion_number);
-- CREATE INDEX unified_requirements_mv_type_level ON unified_requirements_mv(requirement_type, level);

-- Create helper function to get requirement by criterion
CREATE OR REPLACE FUNCTION get_requirement_by_criterion(criterion_text VARCHAR)
RETURNS TABLE (
    id UUID,
    requirement_type VARCHAR,
    criterion_number VARCHAR,
    title VARCHAR,
    description TEXT,
    level VARCHAR,
    test_method VARCHAR,
    wcag_url VARCHAR,
    section_508_url VARCHAR,
    is_active BOOLEAN,
    priority INTEGER,
    estimated_time_minutes INTEGER,
    testing_instructions TEXT,
    acceptance_criteria TEXT,
    failure_examples TEXT,
    wcag_version VARCHAR,
    guideline_title VARCHAR,
    applies_to_page_types TEXT[],
    manual_test_procedure JSONB,
    tool_mappings JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM unified_requirements ur
    WHERE ur.criterion_number = criterion_text
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create helper function to get requirements by level
CREATE OR REPLACE FUNCTION get_requirements_by_conformance_level(conformance_level VARCHAR)
RETURNS TABLE (
    id UUID,
    requirement_type VARCHAR,
    criterion_number VARCHAR,
    title VARCHAR,
    description TEXT,
    level VARCHAR,
    test_method VARCHAR,
    wcag_url VARCHAR,
    section_508_url VARCHAR,
    is_active BOOLEAN,
    priority INTEGER,
    estimated_time_minutes INTEGER,
    testing_instructions TEXT,
    acceptance_criteria TEXT,
    failure_examples TEXT,
    wcag_version VARCHAR,
    guideline_title VARCHAR,
    applies_to_page_types TEXT[],
    manual_test_procedure JSONB,
    tool_mappings JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM unified_requirements ur
    WHERE 
        CASE 
            WHEN conformance_level = 'wcag_a' THEN ur.requirement_type = 'wcag' AND ur.level = 'A'
            WHEN conformance_level = 'wcag_aa' THEN ur.requirement_type = 'wcag' AND ur.level IN ('A', 'AA')
            WHEN conformance_level = 'wcag_aaa' THEN ur.requirement_type = 'wcag' AND ur.level IN ('A', 'AA', 'AAA')
            WHEN conformance_level = 'section_508' THEN ur.requirement_type = 'section_508'
            ELSE ur.is_active = true
        END
    ORDER BY ur.requirement_type, ur.criterion_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON unified_requirements TO PUBLIC;

-- Test the view
SELECT 
    'Unified Requirements View Created' as status,
    COUNT(*) as total_requirements,
    COUNT(CASE WHEN requirement_type = 'wcag' THEN 1 END) as wcag_requirements,
    COUNT(CASE WHEN requirement_type = 'section_508' THEN 1 END) as section508_requirements,
    COUNT(CASE WHEN test_method = 'automated' THEN 1 END) as automated_count,
    COUNT(CASE WHEN test_method = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN test_method = 'both' THEN 1 END) as both_count
FROM unified_requirements;

-- Verify specific criteria exist
SELECT 
    'Sample Requirements Check' as check_type,
    criterion_number,
    title,
    test_method,
    requirement_type
FROM unified_requirements 
WHERE criterion_number IN ('1.1.1', '1.4.3', '1.4.13', '2.1.1', '4.1.2')
ORDER BY criterion_number; 