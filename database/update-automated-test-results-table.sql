-- Update automated_test_results table to include missing columns
-- These columns are expected by the compliance_session_test_results view

-- Add missing columns for frontend testing context
ALTER TABLE automated_test_results 
ADD COLUMN IF NOT EXISTS browser_name VARCHAR(50),
ADD COLUMN IF NOT EXISTS viewport_width INTEGER,
ADD COLUMN IF NOT EXISTS viewport_height INTEGER,
ADD COLUMN IF NOT EXISTS test_environment VARCHAR(50),
ADD COLUMN IF NOT EXISTS test_suite VARCHAR(100),
ADD COLUMN IF NOT EXISTS test_file_path TEXT,
ADD COLUMN IF NOT EXISTS frontend_test_metadata JSONB DEFAULT '{}';

-- Update the tool_name check constraint to include frontend testing tools
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'automated_test_results_tool_name_check' 
               AND table_name = 'automated_test_results') THEN
        
        ALTER TABLE automated_test_results DROP CONSTRAINT automated_test_results_tool_name_check;
    END IF;
    
    -- Add new constraint that includes frontend testing tools
    ALTER TABLE automated_test_results 
    ADD CONSTRAINT automated_test_results_tool_name_check 
    CHECK (tool_name IN ('axe', 'pa11y', 'lighthouse', 'migrated_data', 'playwright', 'playwright-axe', 'playwright-lighthouse', 'cypress', 'selenium', 'webdriver'));
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_automated_test_results_browser_name ON automated_test_results(browser_name);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_test_environment ON automated_test_results(test_environment);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_test_suite ON automated_test_results(test_suite);

-- Add comments for documentation
COMMENT ON COLUMN automated_test_results.browser_name IS 'Browser used for testing (chromium, firefox, webkit, etc.)';
COMMENT ON COLUMN automated_test_results.viewport_width IS 'Test viewport width in pixels';
COMMENT ON COLUMN automated_test_results.viewport_height IS 'Test viewport height in pixels';
COMMENT ON COLUMN automated_test_results.test_environment IS 'Test environment (frontend, backend, headless, ci)';
COMMENT ON COLUMN automated_test_results.test_suite IS 'Test suite name from Playwright';
COMMENT ON COLUMN automated_test_results.test_file_path IS 'Path to test file that generated this result';
COMMENT ON COLUMN automated_test_results.frontend_test_metadata IS 'Additional frontend-specific data'; 