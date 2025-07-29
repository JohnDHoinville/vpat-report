-- Create compliance session test results views
-- These views provide unified access to test results across automated and manual testing

-- 1. Create view for unified test results per compliance session
CREATE OR REPLACE VIEW compliance_session_test_results AS
SELECT 
    ts.id AS session_id,
    ts.name AS session_name,
    ts.project_id,
    ts.status AS session_status,
    ts.testing_approach,
    
    -- Automated test summary
    COUNT(atr.id) AS total_automated_tests,
    COUNT(CASE WHEN atr.tool_name LIKE 'playwright%' THEN 1 END) AS frontend_automated_tests,
    COUNT(CASE WHEN atr.tool_name IN ('axe', 'pa11y', 'lighthouse') THEN 1 END) AS backend_automated_tests,
    SUM(atr.violations_count) AS total_automated_violations,
    
    -- Manual test summary  
    COUNT(mtr.id) AS total_manual_tests,
    COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END) AS manual_tests_passed,
    COUNT(CASE WHEN mtr.result = 'fail' THEN 1 END) AS manual_tests_failed,
    
    -- Overall compliance metrics
    ROUND(
        (COUNT(CASE WHEN mtr.result = 'pass' THEN 1 END)::decimal + 
         COUNT(CASE WHEN atr.violations_count = 0 THEN 1 END)::decimal) /
        NULLIF(COUNT(atr.id) + COUNT(mtr.id), 0) * 100, 2
    ) AS compliance_percentage,
    
    -- Test coverage by source
    ARRAY_AGG(DISTINCT atr.tool_name) FILTER (WHERE atr.tool_name IS NOT NULL) AS automated_tools_used,
    ARRAY_AGG(DISTINCT atr.browser_name) FILTER (WHERE atr.browser_name IS NOT NULL) AS browsers_tested,
    
    -- Timestamps
    MIN(COALESCE(atr.executed_at, mtr.tested_at)) AS first_test_executed,
    MAX(COALESCE(atr.executed_at, mtr.tested_at)) AS last_test_executed,
    
    ts.created_at AS session_created_at,
    ts.updated_at AS session_updated_at

FROM test_sessions ts
LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
LEFT JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
GROUP BY ts.id, ts.name, ts.project_id, ts.status, ts.testing_approach, ts.created_at, ts.updated_at;

-- 2. Create view for detailed test results with page context
CREATE OR REPLACE VIEW detailed_compliance_test_results AS
SELECT 
    -- Session info
    ts.id AS session_id,
    ts.name AS session_name,
    ts.project_id,
    
    -- Page info
    dp.id AS page_id,
    dp.url AS page_url,
    dp.title AS page_title,
    dp.page_type,
    
    -- Test result info
    COALESCE(atr.id, mtr.id) AS test_result_id,
    CASE 
        WHEN atr.id IS NOT NULL THEN 'automated'
        WHEN mtr.id IS NOT NULL THEN 'manual'
    END AS test_type,
    
    CASE 
        WHEN atr.id IS NOT NULL THEN atr.tool_name
        WHEN mtr.id IS NOT NULL THEN 'manual'
    END AS test_tool,
    
    -- Results
    CASE 
        WHEN atr.id IS NOT NULL THEN 
            CASE 
                WHEN atr.violations_count = 0 THEN 'pass'
                WHEN atr.violations_count > 0 THEN 'fail'
                ELSE 'incomplete'
            END
        WHEN mtr.id IS NOT NULL THEN mtr.result
    END AS test_result,
    
    COALESCE(atr.violations_count, CASE WHEN mtr.result = 'fail' THEN 1 ELSE 0 END) AS violations_count,
    
    -- Additional context
    atr.browser_name,
    atr.viewport_width,
    atr.viewport_height,
    mtr.confidence_level,
    mtr.tester_name,
    
    -- Timestamps
    COALESCE(atr.executed_at, mtr.tested_at) AS test_executed_at,
    
    -- Raw data for detailed analysis
    atr.raw_results AS automated_raw_results,
    mtr.notes AS manual_notes,
    mtr.evidence AS manual_evidence

FROM test_sessions ts
LEFT JOIN automated_test_results atr ON ts.id = atr.test_session_id
LEFT JOIN manual_test_results mtr ON ts.id = mtr.test_session_id
LEFT JOIN discovered_pages dp ON dp.id = COALESCE(atr.page_id, mtr.page_id)
WHERE atr.id IS NOT NULL OR mtr.id IS NOT NULL
ORDER BY ts.name, dp.url, test_executed_at;

-- Add comments for documentation
COMMENT ON VIEW compliance_session_test_results IS 'Summary view of all testing activity per compliance session with unified metrics';
COMMENT ON VIEW detailed_compliance_test_results IS 'Detailed view of individual test results with page context for compliance analysis'; 