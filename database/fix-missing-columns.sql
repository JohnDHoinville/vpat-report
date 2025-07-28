-- Add missing columns to database tables
-- This script fixes various missing columns and tables

-- Add review workflow columns to test_instances
ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Update test_instances status enum to include review required
ALTER TYPE test_instance_status ADD VALUE IF NOT EXISTS 'passed_review_required';

-- Create frontend_test_runs table for Playwright integration
CREATE TABLE IF NOT EXISTS frontend_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    run_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    test_suite VARCHAR(100) NOT NULL DEFAULT 'playwright',
    test_environment VARCHAR(100) DEFAULT 'development',
    browsers JSONB DEFAULT '["chromium"]',
    viewports JSONB DEFAULT '["desktop"]',
    test_types JSONB DEFAULT '["basic"]',
    initiated_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    results_summary JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_session_id ON frontend_test_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_status ON frontend_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_frontend_test_runs_created_at ON frontend_test_runs(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_frontend_test_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_frontend_test_runs_updated_at
    BEFORE UPDATE ON frontend_test_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_frontend_test_runs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE frontend_test_runs IS 'Stores Playwright frontend test run information';
COMMENT ON COLUMN frontend_test_runs.browsers IS 'Array of browser names to test with';
COMMENT ON COLUMN frontend_test_runs.viewports IS 'Array of viewport sizes to test with';
COMMENT ON COLUMN frontend_test_runs.test_types IS 'Array of test types (basic, keyboard, screen-reader, form)';
COMMENT ON COLUMN frontend_test_runs.metadata IS 'Additional metadata for the test run';
COMMENT ON COLUMN frontend_test_runs.results_summary IS 'Summary of test results and statistics'; 