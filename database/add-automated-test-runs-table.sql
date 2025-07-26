-- Automated Test Runs Table
-- Stores results from automated accessibility testing tools (Axe, Pa11y, Lighthouse)
-- Date: 2025-07-25
-- Task: 3.2 - Automated Test Orchestration Service

-- Create automated test runs table
CREATE TABLE IF NOT EXISTS automated_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Test execution details
    tools_used JSONB NOT NULL DEFAULT '[]', -- Array of tool names used
    pages_tested INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results summary
    total_issues INTEGER NOT NULL DEFAULT 0,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    test_instances_updated INTEGER NOT NULL DEFAULT 0,
    evidence_files_created INTEGER NOT NULL DEFAULT 0,
    
    -- Raw results storage
    raw_results JSONB DEFAULT '{}', -- Complete tool output
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create test evidence table if it doesn't exist (for automated evidence)
CREATE TABLE IF NOT EXISTS test_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    audit_log_id UUID REFERENCES test_audit_log(id),
    
    -- Evidence details
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- 'automated_result', 'screenshot', 'manual', etc.
    description TEXT,
    file_path TEXT, -- Path to evidence file (screenshots, reports, etc.)
    
    -- Metadata
    metadata JSONB DEFAULT '{}', -- Tool-specific data, violation details, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create indexes for automated_test_runs
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_session 
ON automated_test_runs(session_id, started_at);

CREATE INDEX IF NOT EXISTS idx_automated_test_runs_tools 
ON automated_test_runs USING GIN(tools_used);

CREATE INDEX IF NOT EXISTS idx_automated_test_runs_status 
ON automated_test_runs(completed_at, total_issues);

-- Create indexes for test_evidence
CREATE INDEX IF NOT EXISTS idx_test_evidence_instance 
ON test_evidence(test_instance_id, created_at);

CREATE INDEX IF NOT EXISTS idx_test_evidence_type 
ON test_evidence(evidence_type);

CREATE INDEX IF NOT EXISTS idx_test_evidence_audit 
ON test_evidence(audit_log_id);

CREATE INDEX IF NOT EXISTS idx_test_evidence_metadata 
ON test_evidence USING GIN(metadata);

-- Add comments for documentation
COMMENT ON TABLE automated_test_runs IS 'Stores results from automated accessibility testing runs';
COMMENT ON COLUMN automated_test_runs.tools_used IS 'JSONB array of tools used: ["axe-core", "pa11y", "lighthouse"]';
COMMENT ON COLUMN automated_test_runs.raw_results IS 'Complete tool output and detailed results';

COMMENT ON TABLE test_evidence IS 'Stores evidence files and automated test results for test instances';
COMMENT ON COLUMN test_evidence.evidence_type IS 'Type of evidence: automated_result, screenshot, manual, etc.';
COMMENT ON COLUMN test_evidence.metadata IS 'Tool-specific data, violation details, file info, etc.';

-- Function to get automation summary for a session
CREATE OR REPLACE FUNCTION get_automation_summary(p_session_id UUID)
RETURNS TABLE (
    total_runs INTEGER,
    last_run_date TIMESTAMP WITH TIME ZONE,
    total_issues_found INTEGER,
    critical_issues_found INTEGER,
    tools_used JSONB,
    test_instances_updated INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_runs,
        MAX(atr.completed_at) as last_run_date,
        COALESCE(SUM(atr.total_issues), 0)::INTEGER as total_issues_found,
        COALESCE(SUM(atr.critical_issues), 0)::INTEGER as critical_issues_found,
        jsonb_agg(DISTINCT atr.tools_used) as tools_used,
        COALESCE(SUM(atr.test_instances_updated), 0)::INTEGER as test_instances_updated
    FROM automated_test_runs atr
    WHERE atr.session_id = p_session_id
    AND atr.completed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get latest automation results for a session
CREATE OR REPLACE FUNCTION get_latest_automation_results(p_session_id UUID)
RETURNS TABLE (
    run_id UUID,
    tools_used JSONB,
    pages_tested INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_issues INTEGER,
    critical_issues INTEGER,
    test_instances_updated INTEGER,
    evidence_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        atr.id as run_id,
        atr.tools_used,
        atr.pages_tested,
        atr.completed_at,
        atr.total_issues,
        atr.critical_issues,
        atr.test_instances_updated,
        atr.evidence_files_created as evidence_count
    FROM automated_test_runs atr
    WHERE atr.session_id = p_session_id
    AND atr.completed_at IS NOT NULL
    ORDER BY atr.completed_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql; 