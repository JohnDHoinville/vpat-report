-- Add result column to test_instances table to store page-specific test results
-- This is critical for per-instance automation results

ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS result JSONB DEFAULT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN test_instances.result IS 'Stores automation test results specific to this page × WCAG criterion combination';

-- Create an index for faster queries on result data
CREATE INDEX IF NOT EXISTS idx_test_instances_result_gin 
ON test_instances USING gin(result);

-- Update any existing records with empty result
UPDATE test_instances 
SET result = NULL 
WHERE result IS NULL;

COMMIT; 