-- Fix schema inconsistencies between existing tables and code expectations
-- This migration aligns the database schema with the API code requirements

-- 1. Fix violations table - add missing columns for automated/manual result references
ALTER TABLE violations 
ADD COLUMN IF NOT EXISTS automated_result_id UUID REFERENCES automated_test_results(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS manual_result_id UUID REFERENCES manual_test_results(id) ON DELETE CASCADE;

-- Add constraint to ensure either automated_result_id or manual_result_id is set
ALTER TABLE violations 
ADD CONSTRAINT IF NOT EXISTS violations_result_check 
CHECK (
    (automated_result_id IS NOT NULL AND manual_result_id IS NULL) OR
    (automated_result_id IS NULL AND manual_result_id IS NOT NULL)
);

-- 2. Fix pages table - add missing discovered_at column
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 3. Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_violations_automated_result_id ON violations(automated_result_id);
CREATE INDEX IF NOT EXISTS idx_violations_manual_result_id ON violations(manual_result_id);
CREATE INDEX IF NOT EXISTS idx_pages_discovered_at ON pages(discovered_at);

-- 4. Add comments for documentation
COMMENT ON COLUMN violations.automated_result_id IS 'Reference to automated test result that generated this violation';
COMMENT ON COLUMN violations.manual_result_id IS 'Reference to manual test result that generated this violation';
COMMENT ON COLUMN pages.discovered_at IS 'Timestamp when this page was discovered by crawler';

-- 5. Update existing violations to link to automated_test_results if possible
-- This is a best-effort migration - existing violations will need manual review
UPDATE violations v 
SET automated_result_id = atr.id
FROM automated_test_results atr
WHERE v.test_id = atr.id 
AND v.test_type = 'automated'
AND v.automated_result_id IS NULL;

-- 6. Update existing violations to link to manual_test_results if possible
UPDATE violations v 
SET manual_result_id = mtr.id
FROM manual_test_results mtr
WHERE v.test_id = mtr.id 
AND v.test_type = 'manual'
AND v.manual_result_id IS NULL; 