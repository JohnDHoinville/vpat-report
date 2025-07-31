-- Fix references to test_method column in automation service
-- The correct column name is test_method_used

-- First, let's check what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'test_instances' 
AND column_name LIKE '%test_method%';

-- The automation service should use test_method_used, not test_method 