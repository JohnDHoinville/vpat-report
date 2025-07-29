-- Fix the constraint syntax error
-- PostgreSQL doesn't support IF NOT EXISTS for ADD CONSTRAINT

-- Drop the constraint if it exists first
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'violations_result_check' 
               AND table_name = 'violations') THEN
        
        ALTER TABLE violations DROP CONSTRAINT violations_result_check;
    END IF;
END $$;

-- Add the constraint
ALTER TABLE violations 
ADD CONSTRAINT violations_result_check 
CHECK (
    (automated_result_id IS NOT NULL AND manual_result_id IS NULL) OR
    (automated_result_id IS NULL AND manual_result_id IS NOT NULL)
); 