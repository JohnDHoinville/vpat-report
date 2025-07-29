-- Create automated_test_results table
-- This table is expected by the API code but missing from the database

-- Results from axe, pa11y, lighthouse automated testing
CREATE TABLE IF NOT EXISTS automated_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    tool_name VARCHAR(50) NOT NULL CHECK (tool_name IN ('axe', 'pa11y', 'lighthouse', 'migrated_data', 'playwright', 'playwright-axe', 'playwright-lighthouse')),
    tool_version VARCHAR(50),
    raw_results JSONB NOT NULL DEFAULT '{}',
    violations_count INTEGER DEFAULT 0,
    warnings_count INTEGER DEFAULT 0,
    passes_count INTEGER DEFAULT 0,
    test_duration_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(test_session_id, page_id, tool_name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_results_session_id ON automated_test_results(test_session_id);
CREATE INDEX IF NOT EXISTS idx_automated_results_page_id ON automated_test_results(page_id);
CREATE INDEX IF NOT EXISTS idx_automated_results_tool ON automated_test_results(tool_name);
CREATE INDEX IF NOT EXISTS idx_automated_results_executed_at ON automated_test_results(executed_at);

-- Add comments for documentation
COMMENT ON TABLE automated_test_results IS 'Results from automated accessibility testing tools (axe, pa11y, lighthouse, playwright)';
COMMENT ON COLUMN automated_test_results.tool_name IS 'Name of the testing tool used';
COMMENT ON COLUMN automated_test_results.raw_results IS 'Complete raw output from the testing tool';
COMMENT ON COLUMN automated_test_results.violations_count IS 'Number of accessibility violations found';
COMMENT ON COLUMN automated_test_results.warnings_count IS 'Number of warnings found';
COMMENT ON COLUMN automated_test_results.passes_count IS 'Number of passing tests'; 