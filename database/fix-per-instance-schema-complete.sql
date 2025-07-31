-- Comprehensive schema fix for per-instance testing
-- This script identifies and documents the correct column mappings

-- 1. Check test_instances table columns
SELECT 'test_instances columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'test_instances' 
AND column_name LIKE '%test_method%'
ORDER BY column_name;

-- 2. Check unified_requirements view columns  
SELECT 'unified_requirements columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'unified_requirements' 
AND (column_name LIKE '%criterion%' OR column_name LIKE '%requirement%' OR column_name LIKE '%tool%')
ORDER BY column_name;

-- The correct mappings should be:
-- ti.test_method -> ti.test_method_used ✓
-- ur.criterion_number -> ur.requirement_id ✓  
-- ur.automated_tool -> ur.tool_mappings ✓ 