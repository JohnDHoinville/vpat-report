-- Migration: Add automation_runs_v2 table and enhanced automated_test_results
-- Date: August 12, 2025
-- Purpose: Support unified automation system with targeting metadata

-- Create automation_runs_v2 table for tracking unified automation runs
CREATE TABLE IF NOT EXISTS automation_runs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    target_mode VARCHAR(50) NOT NULL CHECK (target_mode IN ('session', 'requirements', 'instances')),
    target_metadata JSONB NOT NULL DEFAULT '{}',
    tools_used TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- Create indexes for automation_runs_v2
CREATE INDEX IF NOT EXISTS idx_automation_runs_v2_session_id ON automation_runs_v2(session_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_v2_status ON automation_runs_v2(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_v2_created_at ON automation_runs_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_runs_v2_target_mode ON automation_runs_v2(target_mode);

-- Add new columns to automated_test_results if they don't exist
DO $$ 
BEGIN
    -- Add automation_run_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'automated_test_results' 
                   AND column_name = 'automation_run_id') THEN
        ALTER TABLE automated_test_results 
        ADD COLUMN automation_run_id UUID REFERENCES automation_runs_v2(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_automated_test_results_automation_run_id 
        ON automated_test_results(automation_run_id);
    END IF;
    
    -- Add target_requirement_id column (references the underlying requirement table, not the view)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'automated_test_results' 
                   AND column_name = 'target_requirement_id') THEN
        ALTER TABLE automated_test_results 
        ADD COLUMN target_requirement_id UUID;
        
        CREATE INDEX IF NOT EXISTS idx_automated_test_results_target_requirement_id 
        ON automated_test_results(target_requirement_id);
    END IF;
END $$;

-- Create view for automation run summary
CREATE OR REPLACE VIEW automation_run_summary AS
SELECT 
    ar.id as run_id,
    ar.session_id,
    ar.target_mode,
    ar.target_metadata,
    ar.tools_used,
    ar.status as run_status,
    ar.created_at,
    ar.updated_at,
    ar.completed_at,
    ar.progress_percentage,
    ts.name as session_name,
    ts.project_id,
    COUNT(atr.id) as total_tests,
    COUNT(CASE WHEN atr.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(CASE WHEN atr.status = 'running' THEN 1 END) as running_tests,
    COUNT(CASE WHEN atr.status = 'pending' THEN 1 END) as pending_tests,
    COUNT(CASE WHEN atr.status = 'failed' THEN 1 END) as failed_tests,
    COUNT(DISTINCT atr.page_id) as pages_tested,
    COUNT(DISTINCT atr.target_requirement_id) as requirements_targeted
FROM automation_runs_v2 ar
JOIN test_sessions ts ON ar.session_id = ts.id
LEFT JOIN automated_test_results atr ON atr.automation_run_id = ar.id
GROUP BY ar.id, ts.name, ts.project_id;

-- Create function to update automation run progress
CREATE OR REPLACE FUNCTION update_automation_run_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update progress percentage when test results change
    UPDATE automation_runs_v2 
    SET 
        progress_percentage = (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0
                ELSE ROUND((COUNT(CASE WHEN status IN ('completed', 'failed') THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100)
            END
            FROM automated_test_results 
            WHERE automation_run_id = NEW.automation_run_id
        ),
        updated_at = NOW(),
        completed_at = CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM automated_test_results 
                WHERE automation_run_id = NEW.automation_run_id 
                AND status IN ('pending', 'running')
            ) THEN NOW()
            ELSE completed_at
        END,
        status = CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM automated_test_results 
                WHERE automation_run_id = NEW.automation_run_id 
                AND status IN ('pending', 'running')
            ) THEN 'completed'
            WHEN EXISTS (
                SELECT 1 FROM automated_test_results 
                WHERE automation_run_id = NEW.automation_run_id 
                AND status = 'running'
            ) THEN 'running'
            ELSE status
        END
    WHERE id = NEW.automation_run_id
    AND NEW.automation_run_id IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update automation run progress
DROP TRIGGER IF EXISTS trigger_update_automation_run_progress ON automated_test_results;
CREATE TRIGGER trigger_update_automation_run_progress
    AFTER UPDATE OF status ON automated_test_results
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_run_progress();

-- Insert default data or update existing configurations
COMMENT ON TABLE automation_runs_v2 IS 'Tracks unified automation runs with targeting information and progress';
COMMENT ON COLUMN automation_runs_v2.target_mode IS 'Automation targeting mode: session, requirements, or instances';
COMMENT ON COLUMN automation_runs_v2.target_metadata IS 'JSON metadata about targets, tools, and configuration';
COMMENT ON COLUMN automation_runs_v2.tools_used IS 'Array of tool names used in this automation run';

COMMENT ON COLUMN automated_test_results.automation_run_id IS 'Links test result to specific automation run for tracking';
COMMENT ON COLUMN automated_test_results.target_requirement_id IS 'Primary requirement this test result was created to target';

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON automation_runs_v2 TO api_user;
-- GRANT SELECT ON automation_run_summary TO api_user;

-- Example query to test the new structure:
-- SELECT * FROM automation_run_summary WHERE session_id = 'your-session-id' ORDER BY created_at DESC;