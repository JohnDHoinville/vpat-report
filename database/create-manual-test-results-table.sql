-- Create manual_test_results table
-- This table is expected by the compliance views but missing from the database

-- Manual testing results with evidence capture
CREATE TABLE IF NOT EXISTS manual_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES discovered_pages(id) ON DELETE CASCADE,
    requirement_id UUID,
    requirement_type VARCHAR(20) NOT NULL CHECK (requirement_type IN ('wcag', 'section_508')),
    result VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail', 'not_applicable', 'not_tested')),
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    notes TEXT,
    evidence JSONB DEFAULT '{}',
    tester_name VARCHAR(255),
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retested_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_manual_results_session_id ON manual_test_results(test_session_id);
CREATE INDEX IF NOT EXISTS idx_manual_results_page_id ON manual_test_results(page_id);
CREATE INDEX IF NOT EXISTS idx_manual_results_requirement ON manual_test_results(requirement_type, requirement_id);
CREATE INDEX IF NOT EXISTS idx_manual_results_tested_at ON manual_test_results(tested_at);

-- Add comments for documentation
COMMENT ON TABLE manual_test_results IS 'Manual testing results with evidence capture';
COMMENT ON COLUMN manual_test_results.requirement_type IS 'Type of requirement being tested (wcag or section_508)';
COMMENT ON COLUMN manual_test_results.result IS 'Test result (pass, fail, not_applicable, not_tested)';
COMMENT ON COLUMN manual_test_results.confidence_level IS 'Confidence level in the test result';
COMMENT ON COLUMN manual_test_results.evidence IS 'Evidence files and screenshots';
COMMENT ON COLUMN manual_test_results.tester_name IS 'Name of the person who performed the test'; 