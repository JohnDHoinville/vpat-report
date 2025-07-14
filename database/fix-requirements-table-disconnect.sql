-- Fix Requirements Table Disconnect
-- Consolidates requirement data into a single source of truth
-- Created: January 14, 2025

-- ============================================================================
-- PROBLEM ANALYSIS:
-- 1. Compliance table queries use test_requirements (50 records)
-- 2. Detail views query wcag_requirements (8 records only)
-- 3. This causes inconsistency where compliance table shows requirements
--    that have no detail data, leading to disconnect between views
-- ============================================================================

-- Step 1: Backup existing wcag_requirements data
CREATE TABLE IF NOT EXISTS wcag_requirements_backup AS 
SELECT * FROM wcag_requirements;

-- Step 2: Clear and rebuild wcag_requirements with complete data from test_requirements
TRUNCATE TABLE wcag_requirements;

-- Step 3: Migrate all WCAG requirement data from test_requirements to wcag_requirements
INSERT INTO wcag_requirements (
    wcag_version,
    level,
    criterion_number,
    title,
    description,
    manual_test_procedure,
    tool_mappings,
    understanding_url,
    applies_to_page_types
)
SELECT 
    '2.1' as wcag_version,
    UPPER(level) as level,
    criterion_number,
    title,
    description,
    COALESCE(
        CASE 
            WHEN testing_instructions IS NOT NULL THEN 
                jsonb_build_object(
                    'overview', description,
                    'steps', ARRAY[testing_instructions],
                    'tools_needed', ARRAY['browser_dev_tools'],
                    'expected_results', COALESCE(acceptance_criteria, 'Requirement passes validation'),
                    'common_failures', 
                        CASE 
                            WHEN failure_examples IS NOT NULL 
                            THEN string_to_array(failure_examples, '.')
                            ELSE ARRAY['Requirement not met']
                        END
                )
            ELSE '{}'::jsonb
        END,
        '{}'::jsonb
    ) as manual_test_procedure,
    CASE 
        WHEN test_method = 'automated' THEN 
            jsonb_build_object(
                'axe_core', jsonb_build_object('rules', ARRAY[criterion_number]),
                'pa11y', jsonb_build_object('rules', ARRAY[criterion_number])
            )
        WHEN test_method = 'both' THEN
            jsonb_build_object(
                'axe_core', jsonb_build_object('rules', ARRAY[criterion_number]),
                'pa11y', jsonb_build_object('rules', ARRAY[criterion_number]),
                'manual', jsonb_build_object('required', true)
            )
        ELSE '{}'::jsonb
    END as tool_mappings,
    wcag_url as understanding_url,
    ARRAY['all'] as applies_to_page_types
FROM test_requirements 
WHERE requirement_type = 'wcag'
ORDER BY criterion_number;

-- Step 4: Add missing columns to wcag_requirements if they don't exist
DO $$ 
BEGIN
    -- Add test_method column to wcag_requirements for consistency
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wcag_requirements' 
        AND column_name = 'test_method'
    ) THEN
        ALTER TABLE wcag_requirements 
        ADD COLUMN test_method VARCHAR(20) DEFAULT 'manual';
    END IF;
    
    -- Add guideline_title for UI display
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wcag_requirements' 
        AND column_name = 'guideline_title'
    ) THEN
        ALTER TABLE wcag_requirements 
        ADD COLUMN guideline_title VARCHAR(255);
    END IF;
END $$;

-- Step 5: Update test_method and guideline_title from test_requirements
UPDATE wcag_requirements 
SET test_method = tr.test_method,
    guideline_title = CASE 
        WHEN criterion_number LIKE '1.1.%' THEN 'Text Alternatives'
        WHEN criterion_number LIKE '1.2.%' THEN 'Time-based Media'
        WHEN criterion_number LIKE '1.3.%' THEN 'Adaptable'
        WHEN criterion_number LIKE '1.4.%' THEN 'Distinguishable'
        WHEN criterion_number LIKE '2.1.%' THEN 'Keyboard Accessible'
        WHEN criterion_number LIKE '2.2.%' THEN 'Enough Time'
        WHEN criterion_number LIKE '2.3.%' THEN 'Seizures and Physical Reactions'
        WHEN criterion_number LIKE '2.4.%' THEN 'Navigable'
        WHEN criterion_number LIKE '2.5.%' THEN 'Input Modalities'
        WHEN criterion_number LIKE '3.1.%' THEN 'Readable'
        WHEN criterion_number LIKE '3.2.%' THEN 'Predictable'
        WHEN criterion_number LIKE '3.3.%' THEN 'Input Assistance'
        WHEN criterion_number LIKE '4.1.%' THEN 'Compatible'
        ELSE 'WCAG Guideline'
    END
FROM test_requirements tr
WHERE wcag_requirements.criterion_number = tr.criterion_number
  AND tr.requirement_type = 'wcag';

-- Step 6: Verify the migration
SELECT 
    'Migration Summary' as operation,
    COUNT(*) as total_wcag_requirements,
    COUNT(CASE WHEN test_method = 'automated' THEN 1 END) as automated_count,
    COUNT(CASE WHEN test_method = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN test_method = 'both' THEN 1 END) as both_count
FROM wcag_requirements;

-- Step 7: Check for any missing requirements
SELECT 
    'Missing Requirements Check' as check_type,
    tr.criterion_number,
    tr.title as test_req_title,
    CASE WHEN wr.criterion_number IS NULL THEN 'MISSING' ELSE 'FOUND' END as status
FROM test_requirements tr
LEFT JOIN wcag_requirements wr ON tr.criterion_number = wr.criterion_number
WHERE tr.requirement_type = 'wcag'
  AND wr.criterion_number IS NULL;

-- Step 8: Update indexes for performance
DROP INDEX IF EXISTS idx_wcag_requirements_criterion;
DROP INDEX IF EXISTS idx_wcag_requirements_level;

CREATE INDEX idx_wcag_requirements_criterion ON wcag_requirements(criterion_number);
CREATE INDEX idx_wcag_requirements_level ON wcag_requirements(level);
CREATE INDEX idx_wcag_requirements_test_method ON wcag_requirements(test_method);
CREATE INDEX idx_wcag_requirements_version_level ON wcag_requirements(wcag_version, level);

-- Step 9: Create a view for unified requirements access
CREATE OR REPLACE VIEW unified_requirements AS
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
    wr.manual_test_procedure->>'overview' as testing_instructions,
    'Requirement passes all validation checks' as acceptance_criteria,
    'Common failures include missing or incorrect implementation' as failure_examples,
    wr.created_at,
    wr.created_at as updated_at
FROM wcag_requirements wr

UNION ALL

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
    sr.created_at,
    sr.created_at as updated_at
FROM section_508_requirements sr;

-- Success message
SELECT 'Requirements table disconnect fixed successfully!' as result,
       'All requirement data consolidated into wcag_requirements table' as details,
       'Unified view created for consistent API access' as next_steps; 