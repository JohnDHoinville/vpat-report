-- Frontend Testing Integration Migration
-- Date: 2025-01-14
-- Description: Extend automated test results to support frontend testing tools and create unified compliance session testing

-- 1. Extend automated_test_results table to support frontend testing tools
DO $$ 
BEGIN
    -- Add playwright and other frontend tools to the tool_name check constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'automated_test_results_tool_name_check' 
               AND table_name = 'automated_test_results') THEN
        
        ALTER TABLE automated_test_results DROP CONSTRAINT automated_test_results_tool_name_check;
    END IF;
    
    -- Add new constraint that includes frontend testing tools
    ALTER TABLE automated_test_results 
    ADD CONSTRAINT automated_test_results_tool_name_check 
    CHECK (tool_name IN ('axe', 'pa11y', 'lighthouse', 'migrated_data', 'playwright', 'playwright-axe', 'playwright-lighthouse', 'cypress', 'selenium', 'webdriver'));
END $$;

-- 2. Add columns to automated_test_results for frontend testing context
ALTER TABLE automated_test_results 
ADD COLUMN IF NOT EXISTS browser_name VARCHAR(50),           -- chromium, firefox, webkit, etc.
ADD COLUMN IF NOT EXISTS viewport_width INTEGER,             -- Test viewport dimensions
ADD COLUMN IF NOT EXISTS viewport_height INTEGER,
ADD COLUMN IF NOT EXISTS test_environment VARCHAR(50),       -- 'frontend', 'backend', 'headless', 'ci'
ADD COLUMN IF NOT EXISTS test_suite VARCHAR(100),            -- Test suite name from Playwright
ADD COLUMN IF NOT EXISTS test_file_path TEXT,                -- Path to test file that generated this result
ADD COLUMN IF NOT EXISTS frontend_test_metadata JSONB DEFAULT '{}'; -- Additional frontend-specific data

-- 3. Create table for frontend test runs (equivalent to backend test batches)
CREATE TABLE IF NOT EXISTS frontend_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Test run identification
    run_name VARCHAR(255) NOT NULL,
    test_suite VARCHAR(100) NOT NULL,           -- 'playwright', 'cypress', etc.
    test_environment VARCHAR(50) DEFAULT 'headless',
    
    -- Execution details
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    execution_duration_ms INTEGER,
    
    -- Browser and environment configuration
    browsers_tested JSONB DEFAULT '[]',         -- ['chromium', 'firefox', 'webkit']
    viewports_tested JSONB DEFAULT '[]',        -- Viewport configurations tested
    test_configuration JSONB DEFAULT '{}',      -- Playwright config, project settings
    
    -- Results summary
    total_tests_executed INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    tests_skipped INTEGER DEFAULT 0,
    total_violations_found INTEGER DEFAULT 0,
    
    -- Error handling
    errors_encountered JSONB DEFAULT '[]',
    retry_count INTEGER DEFAULT 0,
    
    -- Audit fields
    initiated_by UUID,                          -- User who started the test run
    ci_build_id VARCHAR(255),                   -- CI/CD build identifier if applicable
    git_commit_hash VARCHAR(255),               -- Git commit being tested
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create test instances integration table
CREATE TABLE IF NOT EXISTS test_result_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Link to either automated or manual test results
    automated_result_id UUID REFERENCES automated_test_results(id) ON DELETE CASCADE,
    manual_result_id UUID REFERENCES manual_test_results(id) ON DELETE CASCADE,
    
    -- Test classification
    test_type VARCHAR(20) NOT NULL CHECK (test_type IN ('automated', 'manual')),
    test_source VARCHAR(50) NOT NULL, -- 'backend-axe', 'frontend-playwright', 'manual-tester', etc.
    
    -- WCAG/Section 508 mapping
    wcag_criteria_tested JSONB DEFAULT '[]',    -- Array of WCAG criteria this test covers
    section_508_criteria_tested JSONB DEFAULT '[]',
    
    -- Result aggregation
    result_summary VARCHAR(20) CHECK (result_summary IN ('pass', 'fail', 'warning', 'incomplete', 'not_applicable')),
    violations_count INTEGER DEFAULT 0,
    confidence_level VARCHAR(20) DEFAULT 'medium',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure each result is linked to exactly one result table
    CHECK (
        (automated_result_id IS NOT NULL AND manual_result_id IS NULL) OR
        (automated_result_id IS NULL AND manual_result_id IS NOT NULL)
    )
);

-- 5. Create view for unified test results per compliance session
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

-- 6. Create view for detailed test results with page context
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

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_test_results_browser_name ON automated_test_results(browser_name);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_test_environment ON automated_test_results(test_environment);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_test_suite ON automated_test_results(test_suite);

CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_session_id ON frontend_test_runs(test_session_id);
CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_status ON frontend_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_test_suite ON frontend_test_runs(test_suite);

CREATE INDEX IF NOT EXISTS idx_test_result_instances_session_id ON test_result_instances(test_session_id);
CREATE INDEX IF NOT EXISTS idx_test_result_instances_test_type ON test_result_instances(test_type);
CREATE INDEX IF NOT EXISTS idx_test_result_instances_automated_result_id ON test_result_instances(automated_result_id);
CREATE INDEX IF NOT EXISTS idx_test_result_instances_manual_result_id ON test_result_instances(manual_result_id);

-- 8. Create stored procedure to link Playwright results to compliance sessions
CREATE OR REPLACE FUNCTION link_playwright_result_to_session(
    p_session_id UUID,
    p_page_url TEXT,
    p_test_data JSONB,
    p_browser_name VARCHAR(50) DEFAULT 'chromium',
    p_viewport_width INTEGER DEFAULT 1280,
    p_viewport_height INTEGER DEFAULT 720
) RETURNS UUID AS $$
DECLARE
    v_page_id UUID;
    v_result_id UUID;
    v_violations_count INTEGER;
BEGIN
    -- Find or create page record
    SELECT id INTO v_page_id 
    FROM discovered_pages 
    WHERE url = p_page_url 
    LIMIT 1;
    
    IF v_page_id IS NULL THEN
        -- Create page record if it doesn't exist
        INSERT INTO discovered_pages (url, title, page_type, discovery_id)
        VALUES (
            p_page_url, 
            COALESCE(p_test_data->>'title', 'Untitled Page'),
            'tested',
            (SELECT id FROM site_discovery WHERE project_id = (
                SELECT project_id FROM test_sessions WHERE id = p_session_id
            ) LIMIT 1)
        )
        RETURNING id INTO v_page_id;
    END IF;
    
    -- Extract violations count from Playwright result structure
    v_violations_count := COALESCE(
        (p_test_data->>'violationCount')::INTEGER,
        (p_test_data->'summary'->>'violationCount')::INTEGER,
        COALESCE(array_length(ARRAY(SELECT jsonb_array_elements(p_test_data->'violations')), 1), 0)
    );
    
    -- Insert automated test result
    INSERT INTO automated_test_results (
        test_session_id,
        page_id,
        tool_name,
        tool_version,
        raw_results,
        violations_count,
        warnings_count,
        passes_count,
        browser_name,
        viewport_width,
        viewport_height,
        test_environment,
        test_suite,
        executed_at
    ) VALUES (
        p_session_id,
        v_page_id,
        CASE 
            WHEN p_test_data->>'tool' ~ 'axe' THEN 'playwright-axe'
            WHEN p_test_data->>'tool' ~ 'lighthouse' THEN 'playwright-lighthouse'
            ELSE 'playwright'
        END,
        COALESCE(p_test_data->>'toolVersion', '1.0'),
        p_test_data,
        v_violations_count,
        COALESCE((p_test_data->>'warningCount')::INTEGER, 0),
        COALESCE((p_test_data->>'passedCount')::INTEGER, 0),
        p_browser_name,
        p_viewport_width,
        p_viewport_height,
        'frontend',
        'playwright',
        COALESCE((p_test_data->>'timestamp')::TIMESTAMP WITH TIME ZONE, CURRENT_TIMESTAMP)
    )
    RETURNING id INTO v_result_id;
    
    -- Create test result instance for unified tracking
    INSERT INTO test_result_instances (
        test_session_id,
        automated_result_id,
        test_type,
        test_source,
        result_summary,
        violations_count
    ) VALUES (
        p_session_id,
        v_result_id,
        'automated',
        'frontend-playwright',
        CASE WHEN v_violations_count = 0 THEN 'pass' ELSE 'fail' END,
        v_violations_count
    );
    
    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Add comments for documentation
COMMENT ON TABLE frontend_test_runs IS 'Frontend test execution batches (Playwright, Cypress, etc.) linked to compliance sessions';
COMMENT ON TABLE test_result_instances IS 'Unified tracking of all test results (automated + manual) for compliance session management';
COMMENT ON VIEW compliance_session_test_results IS 'Summary view of all testing activity per compliance session with unified metrics';
COMMENT ON VIEW detailed_compliance_test_results IS 'Detailed view of individual test results with page context for compliance analysis';
COMMENT ON FUNCTION link_playwright_result_to_session IS 'Stores Playwright test results in compliance session database with proper linkage';

-- 10. Grant permissions
GRANT SELECT ON compliance_session_test_results TO PUBLIC;
GRANT SELECT ON detailed_compliance_test_results TO PUBLIC;
GRANT EXECUTE ON FUNCTION link_playwright_result_to_session TO PUBLIC; 