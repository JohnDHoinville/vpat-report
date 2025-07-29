-- Add error column to automated_test_runs table
-- This column will store error messages when automation runs fail

ALTER TABLE automated_test_runs 
ADD COLUMN IF NOT EXISTS error TEXT;

-- Add index for error queries
CREATE INDEX IF NOT EXISTS idx_automated_test_runs_error ON automated_test_runs(error) WHERE error IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN automated_test_runs.error IS 'Error message when automation run fails'; 