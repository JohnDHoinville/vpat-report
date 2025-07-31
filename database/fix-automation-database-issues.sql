-- ================================
-- FIX AUTOMATION DATABASE ISSUES
-- ================================
-- This script fixes all database schema issues preventing automated testing from working
-- Date: 2025-07-31
-- Issues addressed:
-- 1. Missing 'started_at' column in automated_test_results
-- 2. Missing 'error' column in automated_test_results  
-- 3. Missing 'tested_by' column should be 'assigned_tester' in test_instances
-- 4. NULL constraint issues in test_audit_log
-- 5. Missing status and execution_time_ms columns

-- ===========================
-- 1. FIX AUTOMATED_TEST_RESULTS TABLE
-- ===========================

-- Add missing columns to automated_test_results
ALTER TABLE automated_test_results 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS test_instance_id UUID;

-- Update existing records to have valid started_at if NULL
UPDATE automated_test_results 
SET started_at = executed_at 
WHERE started_at IS NULL AND executed_at IS NOT NULL;

-- Update status for existing completed records
UPDATE automated_test_results 
SET status = 'completed' 
WHERE status = 'pending' AND executed_at IS NOT NULL;

-- Add proper check constraint for status
DO $$ 
BEGIN
    -- Drop existing status constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'automated_test_results_status_check' 
               AND table_name = 'automated_test_results') THEN
        
        ALTER TABLE automated_test_results DROP CONSTRAINT automated_test_results_status_check;
    END IF;
    
    -- Add new status constraint
    ALTER TABLE automated_test_results 
    ADD CONSTRAINT automated_test_results_status_check 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
END $$;

-- Update tool_name constraint to include all current tools
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'automated_test_results_tool_name_check' 
               AND table_name = 'automated_test_results') THEN
        
        ALTER TABLE automated_test_results DROP CONSTRAINT automated_test_results_tool_name_check;
    END IF;
    
    -- Add comprehensive tool name constraint
    ALTER TABLE automated_test_results 
    ADD CONSTRAINT automated_test_results_tool_name_check 
    CHECK (tool_name IN (
        'axe', 'pa11y', 'lighthouse', 'wave', 'contrast-analyzer', 'mobile-accessibility',
        'form-accessibility', 'heading-structure', 'aria-testing',
        'migrated_data', 'playwright', 'playwright-axe', 'playwright-lighthouse', 
        'cypress', 'selenium', 'webdriver'
    ));
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_automated_test_results_started_at ON automated_test_results(started_at);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_status ON automated_test_results(status);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_test_instance_id ON automated_test_results(test_instance_id);

-- ===========================
-- 2. FIX TEST_INSTANCES TABLE
-- ===========================

-- The code references 'tested_by' but the column should be 'assigned_tester'
-- Add tested_by as an alias/additional column or fix the code references

-- Check if tested_by column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'test_instances' 
                   AND column_name = 'tested_by') THEN
        
        ALTER TABLE test_instances ADD COLUMN tested_by UUID REFERENCES users(id);
        
        -- Copy data from assigned_tester to tested_by for existing records
        UPDATE test_instances 
        SET tested_by = assigned_tester 
        WHERE assigned_tester IS NOT NULL;
    END IF;
END $$;

-- ===========================
-- 3. FIX TEST_AUDIT_LOG TABLE
-- ===========================

-- Make test_instance_id nullable in test_audit_log since session-level audit entries don't have a specific test instance
ALTER TABLE test_audit_log 
ALTER COLUMN test_instance_id DROP NOT NULL;

-- Add proper check constraint for action_type to include automation actions
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'test_audit_log_action_type_check' 
               AND table_name = 'test_audit_log') THEN
        
        ALTER TABLE test_audit_log DROP CONSTRAINT test_audit_log_action_type_check;
    END IF;
    
    -- Add comprehensive action_type constraint
    ALTER TABLE test_audit_log 
    ADD CONSTRAINT test_audit_log_action_type_check 
    CHECK (action_type IN (
        'created', 'updated', 'status_change', 'assigned', 'completed', 
        'evidence_added', 'note_added', 'automation_started', 'automation_completed',
        'automation_failed', 'automation_cancelled', 'test_started', 'test_completed',
        'test_failed', 'manual_test_started', 'manual_test_completed'
    ));
END $$;

-- ===========================
-- 4. CREATE AUTOMATED_TEST_RUNS TABLE (if missing)
-- ===========================

-- This table is referenced by the automation service but may not exist
CREATE TABLE IF NOT EXISTS automated_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Execution details
    run_id VARCHAR(100) UNIQUE NOT NULL, -- External run identifier
    tools_used JSONB NOT NULL DEFAULT '[]',
    pages_tested INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and results
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_violations INTEGER DEFAULT 0,
    critical_violations INTEGER DEFAULT 0,
    test_instances_updated INTEGER DEFAULT 0,
    
    -- Error handling
    error TEXT,
    
    -- Metadata
    client_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create indexes for automated_test_runs
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_session_id ON automated_test_runs(test_session_id);
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_run_id ON automated_test_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_status ON automated_test_runs(status);
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_started_at ON automated_test_runs(started_at);

-- ===========================
-- 5. CREATE COVERAGE_METRICS TABLE (for metrics collection)
-- ===========================

CREATE TABLE IF NOT EXISTS coverage_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL,
    overall_coverage JSONB,
    tool_performance JSONB,
    session_statistics JSONB,
    wcag_compliance JSONB,
    violation_trends JSONB,
    coverage_goals JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coverage_metrics_timestamp ON coverage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_coverage_metrics_created_at ON coverage_metrics(created_at);

-- ===========================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ===========================

COMMENT ON COLUMN automated_test_results.started_at IS 'When the test execution started';
COMMENT ON COLUMN automated_test_results.error IS 'Error message if test failed';
COMMENT ON COLUMN automated_test_results.status IS 'Current status of the test execution';
COMMENT ON COLUMN automated_test_results.execution_time_ms IS 'Total execution time in milliseconds';
COMMENT ON COLUMN automated_test_results.test_instance_id IS 'Reference to test_instances if applicable';

COMMENT ON COLUMN test_instances.tested_by IS 'User who performed the test (for automation compatibility)';

COMMENT ON TABLE automated_test_runs IS 'Tracks automated test run executions across multiple pages and tools';
COMMENT ON TABLE coverage_metrics IS 'Stores automated coverage metrics and performance data';

-- ===========================
-- 7. VERIFY SCHEMA CONSISTENCY
-- ===========================

-- Check for any remaining constraint issues
DO $$
DECLARE
    table_missing BOOLEAN := FALSE;
    column_missing BOOLEAN := FALSE;
BEGIN
    -- Verify key tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automated_test_results') THEN
        RAISE NOTICE 'ERROR: automated_test_results table is missing!';
        table_missing := TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automated_test_runs') THEN
        RAISE NOTICE 'ERROR: automated_test_runs table is missing!';
        table_missing := TRUE;
    END IF;
    
    -- Verify key columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'automated_test_results' AND column_name = 'started_at') THEN
        RAISE NOTICE 'ERROR: automated_test_results.started_at column is missing!';
        column_missing := TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'automated_test_results' AND column_name = 'error') THEN
        RAISE NOTICE 'ERROR: automated_test_results.error column is missing!';
        column_missing := TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'test_instances' AND column_name = 'tested_by') THEN
        RAISE NOTICE 'ERROR: test_instances.tested_by column is missing!';
        column_missing := TRUE;
    END IF;
    
    -- Report success if all checks pass
    IF NOT table_missing AND NOT column_missing THEN
        RAISE NOTICE 'SUCCESS: All required tables and columns are present!';
    END IF;
END $$;

-- ===========================
-- 8. CLEAN UP DUPLICATE RECORDS (if any)
-- ===========================

-- Remove any duplicate automated_test_results that might cause unique constraint violations
WITH duplicates AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY test_session_id, page_id, tool_name 
        ORDER BY executed_at DESC
    ) as rn
    FROM automated_test_results
)
DELETE FROM automated_test_results 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

RAISE NOTICE 'Database automation fixes completed successfully!'; 