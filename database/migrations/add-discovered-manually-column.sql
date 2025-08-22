-- Migration: Add discovered_manually column to crawler_discovered_pages table
-- Date: 2025-08-22
-- Issue: Manual URL addition was failing due to missing column

-- Add the discovered_manually column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'crawler_discovered_pages' 
        AND column_name = 'discovered_manually'
    ) THEN 
        ALTER TABLE crawler_discovered_pages 
        ADD COLUMN discovered_manually BOOLEAN DEFAULT false;
        
        RAISE NOTICE 'Added discovered_manually column to crawler_discovered_pages table';
    ELSE 
        RAISE NOTICE 'Column discovered_manually already exists in crawler_discovered_pages table';
    END IF; 
END $$;

-- Update any existing manually added pages (if we can identify them)
-- This is optional and depends on how we want to handle existing data
-- UPDATE crawler_discovered_pages 
-- SET discovered_manually = true 
-- WHERE some_condition_to_identify_manual_pages;
