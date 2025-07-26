-- Create automated testing tables for Task 3.2 implementation
-- These tables support the TestAutomationService functionality

-- Table for automated test runs
CREATE TABLE IF NOT EXISTS automated_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    tools_used TEXT[] NOT NULL,
    pages_tested INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_issues INTEGER DEFAULT 0,
    critical_issues INTEGER DEFAULT 0,
    test_instances_updated INTEGER DEFAULT 0,
    evidence_files_created INTEGER DEFAULT 0,
    raw_results JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_session ON automated_test_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_status ON automated_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_started ON automated_test_runs(started_at);

-- Table for test evidence (if not exists)
CREATE TABLE IF NOT EXISTS test_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID REFERENCES test_instances(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_data BYTEA,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_test_evidence_instance ON test_evidence(test_instance_id);
CREATE INDEX IF NOT EXISTS idx_test_evidence_type ON test_evidence(evidence_type);

-- Function to get automation summary for a session
CREATE OR REPLACE FUNCTION get_automation_summary(session_uuid UUID)
RETURNS TABLE (
    total_runs INTEGER,
    last_run_date TIMESTAMP WITH TIME ZONE,
    total_issues_found INTEGER,
    tools_used TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_runs,
        MAX(atr.started_at) as last_run_date,
        COALESCE(SUM(atr.total_issues), 0)::INTEGER as total_issues_found,
        ARRAY_AGG(DISTINCT tool) as tools_used
    FROM automated_test_runs atr
    CROSS JOIN LATERAL unnest(atr.tools_used) as tool
    WHERE atr.session_id = session_uuid;
END;
$$ LANGUAGE plpgsql; 