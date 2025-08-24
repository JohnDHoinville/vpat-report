-- Add Results and Recommendations fields to test_instances table
-- These fields will store rich HTML content from WYSIWYG editors
-- Created: August 23, 2025

-- Add the new columns
ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS results TEXT,
ADD COLUMN IF NOT EXISTS recommendations TEXT;

-- Add comments for documentation
COMMENT ON COLUMN test_instances.results IS 'Rich HTML content describing test results for this specific URL/page test instance';
COMMENT ON COLUMN test_instances.recommendations IS 'Rich HTML content with recommendations for fixing issues found in this specific URL/page test instance';

-- Create index for better performance when searching/filtering by content
CREATE INDEX IF NOT EXISTS idx_test_instances_results_search ON test_instances USING gin(to_tsvector('english', results));
CREATE INDEX IF NOT EXISTS idx_test_instances_recommendations_search ON test_instances USING gin(to_tsvector('english', recommendations));

-- Update the updated_at timestamp for tracking
UPDATE test_instances SET updated_at = NOW() WHERE results IS NULL AND recommendations IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'test_instances' 
AND column_name IN ('results', 'recommendations')
ORDER BY column_name;
