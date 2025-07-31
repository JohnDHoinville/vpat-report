-- Test a simpler approach to get test instances working for the demo
-- This bypasses the broken foreign key relationships temporarily

SELECT 
    ti.id as test_instance_id,
    ti.page_id,
    ti.requirement_id,
    ti.test_method_used,
    ti.status,
    dp.url,
    dp.title as page_title,
    'demo_criterion' as criterion_number,
    'Demo Requirement' as requirement_title,
    'Demo accessibility requirement for testing' as description,
    '{"axe-core": true, "pa11y": true}' as tool_mappings,
    'automated' as automation_coverage
FROM test_instances ti
JOIN discovered_pages dp ON ti.page_id = dp.id
WHERE ti.session_id = '3f55d9be-9850-4220-a71f-b5efef56909d'
AND dp.url IS NOT NULL
LIMIT 10; 