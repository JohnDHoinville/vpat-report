-- Fix Missing Columns Migration
-- Date: 2025-01-12
-- Description: Add missing columns that the API routes expect

-- Fix test_sessions table missing columns
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;

-- Fix projects table missing columns (url vs primary_url)
-- The API expects 'url' but the table has 'primary_url'
-- Add an alias or view if needed, but for now we'll update the API to use primary_url

-- Add missing columns to test_instances if they don't exist
ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS remediation_notes TEXT,
ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS test_method_used VARCHAR(20) CHECK (test_method_used IN ('automated', 'manual')),
ADD COLUMN IF NOT EXISTS tool_used VARCHAR(100),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create test_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS test_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN ('wcag', 'section_508', 'custom')),
    criterion_number VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(10) NOT NULL CHECK (level IN ('A', 'AA', 'AAA', 'Section508')),
    test_method VARCHAR(20) DEFAULT 'manual' CHECK (test_method IN ('automated', 'manual', 'both')),
    testing_instructions TEXT,
    acceptance_criteria TEXT,
    failure_examples TEXT,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(requirement_type, criterion_number)
);

-- Create discovered_pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS discovered_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_id UUID REFERENCES site_discovery(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title VARCHAR(500),
    page_type VARCHAR(100) DEFAULT 'content',
    http_status INTEGER,
    content_length INTEGER,
    last_modified TIMESTAMP WITH TIME ZONE,
    meta_description TEXT,
    page_metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create site_discovery table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_discovery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    primary_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    total_pages_found INTEGER DEFAULT 0,
    crawl_depth INTEGER DEFAULT 3,
    discovery_settings JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint to test_instances if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'test_instances_session_requirement_page_unique'
    ) THEN
        ALTER TABLE test_instances 
        ADD CONSTRAINT test_instances_session_requirement_page_unique 
        UNIQUE(session_id, requirement_id, page_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_requirements_type_level ON test_requirements(requirement_type, level);
CREATE INDEX IF NOT EXISTS idx_test_requirements_active ON test_requirements(is_active);
CREATE INDEX IF NOT EXISTS idx_discovered_pages_discovery_id ON discovered_pages(discovery_id);
CREATE INDEX IF NOT EXISTS idx_discovered_pages_url ON discovered_pages(url);
CREATE INDEX IF NOT EXISTS idx_site_discovery_project_id ON site_discovery(project_id);

-- Add sample WCAG requirements if table is empty
INSERT INTO test_requirements (requirement_type, criterion_number, title, description, level, test_method, priority)
SELECT 'wcag', '1.1.1', 'Non-text Content', 'All non-text content that is presented to the user has a text alternative that serves the equivalent purpose', 'A', 'both', 1
WHERE NOT EXISTS (SELECT 1 FROM test_requirements WHERE requirement_type = 'wcag' AND criterion_number = '1.1.1');

INSERT INTO test_requirements (requirement_type, criterion_number, title, description, level, test_method, priority)
SELECT 'wcag', '1.3.1', 'Info and Relationships', 'Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text', 'A', 'both', 1
WHERE NOT EXISTS (SELECT 1 FROM test_requirements WHERE requirement_type = 'wcag' AND criterion_number = '1.3.1');

INSERT INTO test_requirements (requirement_type, criterion_number, title, description, level, test_method, priority)
SELECT 'wcag', '1.4.3', 'Contrast (Minimum)', 'The visual presentation of text and images of text has a contrast ratio of at least 4.5:1', 'AA', 'automated', 2
WHERE NOT EXISTS (SELECT 1 FROM test_requirements WHERE requirement_type = 'wcag' AND criterion_number = '1.4.3');

INSERT INTO test_requirements (requirement_type, criterion_number, title, description, level, test_method, priority)
SELECT 'wcag', '2.1.1', 'Keyboard', 'All functionality of the content is operable through a keyboard interface', 'A', 'manual', 1
WHERE NOT EXISTS (SELECT 1 FROM test_requirements WHERE requirement_type = 'wcag' AND criterion_number = '2.1.1');

INSERT INTO test_requirements (requirement_type, criterion_number, title, description, level, test_method, priority)
SELECT 'wcag', '2.4.6', 'Headings and Labels', 'Headings and labels describe topic or purpose', 'AA', 'both', 2
WHERE NOT EXISTS (SELECT 1 FROM test_requirements WHERE requirement_type = 'wcag' AND criterion_number = '2.4.6');

-- Update triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_test_requirements_updated_at ON test_requirements;
CREATE TRIGGER update_test_requirements_updated_at 
    BEFORE UPDATE ON test_requirements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_discovered_pages_updated_at ON discovered_pages;
CREATE TRIGGER update_discovered_pages_updated_at 
    BEFORE UPDATE ON discovered_pages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_discovery_updated_at ON site_discovery;
CREATE TRIGGER update_site_discovery_updated_at 
    BEFORE UPDATE ON site_discovery 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the changes
SELECT 'Missing columns migration completed successfully' as status; 