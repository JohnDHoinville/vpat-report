-- Fix VARCHAR Constraints Migration
-- Date: 2025-01-14
-- Description: Fix VARCHAR(50) constraints that are too small for JSON data

-- Fix test_sessions.scope column - change from VARCHAR(50) to JSONB
ALTER TABLE test_sessions 
ALTER COLUMN scope TYPE JSONB USING scope::jsonb;

-- Set default for scope if it's not already set
ALTER TABLE test_sessions 
ALTER COLUMN scope SET DEFAULT '{}';

-- Add other missing columns that may be needed
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS test_type VARCHAR(50) DEFAULT 'full' 
CHECK (test_type IN ('full', 'automated_only', 'manual_only', 'followup')),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS progress_summary JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS testing_approach VARCHAR(50) DEFAULT 'hybrid' 
CHECK (testing_approach IN ('automated_only', 'manual_only', 'hybrid', 'rapid_automated', 'comprehensive_manual')),
ADD COLUMN IF NOT EXISTS approach_details JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN test_sessions.scope IS 'JSON configuration defining the scope of testing including tools, browsers, and test types';
COMMENT ON COLUMN test_sessions.testing_approach IS 'Testing methodology approach: automated_only, manual_only, hybrid, rapid_automated, comprehensive_manual';
COMMENT ON COLUMN test_sessions.approach_details IS 'Detailed configuration for the selected testing approach';

-- Update any existing scope values that are strings
UPDATE test_sessions 
SET scope = '{}'::jsonb 
WHERE scope::text = 'all' OR scope::text = '';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'test_sessions' 
    AND column_name IN ('scope', 'testing_approach', 'approach_details')
ORDER BY column_name;

SELECT 'VARCHAR constraints fixed successfully' as status; 