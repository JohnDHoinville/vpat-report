-- Migration: Add metadata column to web_crawlers table
-- This fixes the "column metadata does not exist" error

ALTER TABLE web_crawlers 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Update any existing crawlers to have empty metadata
UPDATE web_crawlers 
SET metadata = '{}' 
WHERE metadata IS NULL; 