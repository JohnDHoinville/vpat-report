-- Migration: Add pause/resume functionality to test_sessions table
-- Date: 2025-01-11
-- Description: Add columns to support pausing and resuming test sessions

-- Add new columns for pause/resume functionality
ALTER TABLE test_sessions 
ADD COLUMN paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN resumed_at TIMESTAMP WITH TIME ZONE;

-- Update the status check constraint to include 'paused' status
ALTER TABLE test_sessions 
DROP CONSTRAINT IF EXISTS test_sessions_status_check;

ALTER TABLE test_sessions 
ADD CONSTRAINT test_sessions_status_check 
CHECK (status IN ('planning', 'in_progress', 'paused', 'completed', 'cancelled', 'failed'));

-- Add index for pause/resume queries
CREATE INDEX idx_test_sessions_paused_at ON test_sessions(paused_at) WHERE paused_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN test_sessions.paused_at IS 'Timestamp when the session was paused';
COMMENT ON COLUMN test_sessions.resumed_at IS 'Timestamp when the session was resumed from pause';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'test_sessions' 
    AND column_name IN ('paused_at', 'resumed_at')
ORDER BY column_name;

SELECT 'Pause/resume columns added successfully' as status; 