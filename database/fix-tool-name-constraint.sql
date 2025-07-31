-- Fix tool name constraint to allow axe-core (in addition to axe)
-- The per-instance testing uses 'axe-core' and 'pa11y' as tool names

ALTER TABLE automated_test_results 
DROP CONSTRAINT IF EXISTS automated_test_results_tool_name_check;

ALTER TABLE automated_test_results 
ADD CONSTRAINT automated_test_results_tool_name_check 
CHECK (tool_name IN (
    'axe', 
    'axe-core',  -- Add axe-core variant
    'pa11y', 
    'lighthouse', 
    'wave', 
    'contrast-analyzer',
    'mobile-accessibility', 
    'form-accessibility', 
    'heading-structure', 
    'aria-testing', 
    'migrated_data', 
    'playwright', 
    'playwright-axe', 
    'playwright-lighthouse', 
    'cypress', 
    'selenium', 
    'webdriver'
)); 