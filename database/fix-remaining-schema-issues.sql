-- Fix Remaining Schema Issues Migration
-- Date: 2025-01-12
-- Description: Fix the remaining database schema issues causing API errors

-- 1. Add missing columns to test_sessions table
ALTER TABLE test_sessions 
ADD COLUMN IF NOT EXISTS test_type VARCHAR(50) DEFAULT 'full' CHECK (test_type IN ('full', 'automated_only', 'manual_only', 'followup')),
ADD COLUMN IF NOT EXISTS scope JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- 2. Add missing columns to test_instances table
ALTER TABLE test_instances 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 3. Fix the updated_at trigger function to handle missing column gracefully
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if updated_at column exists before trying to update it
    IF TG_TABLE_NAME = 'site_discovery' THEN
        -- For site_discovery table, just return NEW without updating updated_at
        RETURN NEW;
    ELSE
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Create test_instances table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS test_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES test_requirements(id),
    page_id UUID REFERENCES discovered_pages(id),
    project_id UUID REFERENCES projects(id),
    
    -- Test execution details
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'untestable', 'not_applicable', 'needs_review')),
    assigned_tester UUID REFERENCES users(id),
    reviewer UUID REFERENCES users(id),
    confidence_level VARCHAR(10) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    
    -- Test results and documentation
    notes TEXT,
    remediation_notes TEXT,
    evidence JSONB DEFAULT '[]'::jsonb,
    
    -- Test execution metadata
    test_method_used VARCHAR(20) CHECK (test_method_used IN ('automated', 'manual')),
    tool_used VARCHAR(100),
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Assignment tracking
    assigned_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Add the unique constraint for test_instances if it doesn't exist
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

-- 6. Create users table if it doesn't exist (needed for foreign key references)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'tester' CHECK (role IN ('admin', 'manager', 'tester', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insert a default admin user if users table is empty
INSERT INTO users (id, username, email, full_name, role)
SELECT '46088230-6133-45e3-8a04-06feea298094'::uuid, 'admin', 'admin@localhost', 'System Administrator', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users);

-- 8. Update foreign key constraints for projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- Update existing projects to reference the admin user
UPDATE projects 
SET created_by = '46088230-6133-45e3-8a04-06feea298094'::uuid 
WHERE created_by IS NULL;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_instances_session_id ON test_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_test_instances_requirement_id ON test_instances(requirement_id);
CREATE INDEX IF NOT EXISTS idx_test_instances_page_id ON test_instances(page_id);
CREATE INDEX IF NOT EXISTS idx_test_instances_project_id ON test_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_test_instances_status ON test_instances(status);
CREATE INDEX IF NOT EXISTS idx_test_instances_assigned_tester ON test_instances(assigned_tester);

-- 10. Add trigger for test_instances updated_at
DROP TRIGGER IF EXISTS update_test_instances_updated_at ON test_instances;
CREATE TRIGGER update_test_instances_updated_at 
    BEFORE UPDATE ON test_instances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Populate test_instances with project_id from session
UPDATE test_instances 
SET project_id = ts.project_id 
FROM test_sessions ts 
WHERE test_instances.session_id = ts.id 
AND test_instances.project_id IS NULL;

SELECT 'Remaining schema issues fixed successfully' as status; 