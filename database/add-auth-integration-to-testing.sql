-- Add Authentication Integration to Testing System
-- Enables authentication role selection for automated and manual testing
-- Created: January 2025

-- 1. Add authentication configuration reference to test_sessions
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS auth_config_id UUID REFERENCES auth_configs(id);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS auth_role VARCHAR(100);
ALTER TABLE test_sessions ADD COLUMN IF NOT EXISTS auth_description TEXT;

-- 2. Add authentication role tracking to manual test results
ALTER TABLE manual_test_results ADD COLUMN IF NOT EXISTS auth_config_id UUID REFERENCES auth_configs(id);
ALTER TABLE manual_test_results ADD COLUMN IF NOT EXISTS auth_role VARCHAR(100);
ALTER TABLE manual_test_results ADD COLUMN IF NOT EXISTS tested_as_role VARCHAR(100);

-- 3. Add authentication tracking to automated test results
ALTER TABLE automated_test_results ADD COLUMN IF NOT EXISTS auth_config_id UUID REFERENCES auth_configs(id);
ALTER TABLE automated_test_results ADD COLUMN IF NOT EXISTS auth_role VARCHAR(100);

-- 4. Create project roles management table
CREATE TABLE IF NOT EXISTS project_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    role_type VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'guest', 'editor', 'viewer', 'custom'
    priority INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT false,
    testing_scope JSONB DEFAULT '{"automated": true, "manual": true}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(project_id, role_name)
);

-- 5. Create project authentication configurations view
CREATE OR REPLACE VIEW project_auth_configs AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    ac.id as auth_config_id,
    ac.name as auth_config_name,
    ac.type as auth_type,
    ac.domain,
    ac.auth_role,
    ac.auth_description,
    ac.priority,
    ac.is_default,
    ac.username,
    ac.url as auth_url,
    pr.role_name as project_role_name,
    pr.role_description as project_role_description,
    pr.role_type,
    pr.testing_scope
FROM projects p
LEFT JOIN auth_configs ac ON (ac.project_id = p.id OR ac.project_id IS NULL)
LEFT JOIN project_roles pr ON (p.id = pr.project_id AND ac.auth_role = pr.role_name)
WHERE ac.status = 'active'
ORDER BY p.name, ac.priority, ac.auth_role;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_sessions_auth_config ON test_sessions(auth_config_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_auth_role ON test_sessions(auth_role);
CREATE INDEX IF NOT EXISTS idx_manual_test_results_auth_config ON manual_test_results(auth_config_id);
CREATE INDEX IF NOT EXISTS idx_manual_test_results_auth_role ON manual_test_results(auth_role);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_auth_config ON automated_test_results(auth_config_id);
CREATE INDEX IF NOT EXISTS idx_automated_test_results_auth_role ON automated_test_results(auth_role);
CREATE INDEX IF NOT EXISTS idx_project_roles_project_id ON project_roles(project_id);
CREATE INDEX IF NOT EXISTS idx_project_roles_role_name ON project_roles(role_name);

-- 7. Create function to get available auth configs for a project
CREATE OR REPLACE FUNCTION get_project_auth_configs(p_project_id UUID)
RETURNS TABLE (
    auth_config_id UUID,
    auth_config_name VARCHAR(255),
    auth_type VARCHAR(50),
    domain VARCHAR(255),
    auth_role VARCHAR(100),
    auth_description TEXT,
    priority INTEGER,
    is_default BOOLEAN,
    username VARCHAR(255),
    auth_url VARCHAR(500),
    project_role_name VARCHAR(100),
    project_role_description TEXT,
    role_type VARCHAR(50),
    testing_scope JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id as auth_config_id,
        ac.name as auth_config_name,
        ac.type as auth_type,
        ac.domain,
        ac.auth_role,
        ac.auth_description,
        ac.priority,
        ac.is_default,
        ac.username,
        ac.url as auth_url,
        pr.role_name as project_role_name,
        pr.role_description as project_role_description,
        pr.role_type,
        pr.testing_scope
    FROM auth_configs ac
    LEFT JOIN project_roles pr ON (ac.project_id = p_project_id AND ac.auth_role = pr.role_name)
    WHERE (ac.project_id = p_project_id OR ac.project_id IS NULL)
    AND ac.status = 'active'
    ORDER BY ac.priority ASC, ac.is_default DESC, ac.auth_role ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. Insert default project roles for existing projects
INSERT INTO project_roles (project_id, role_name, role_description, role_type, priority, is_default, testing_scope)
SELECT 
    p.id,
    'default',
    'Default user role for accessibility testing',
    'user',
    1,
    true,
    '{"automated": true, "manual": true}'::jsonb
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM project_roles pr WHERE pr.project_id = p.id AND pr.role_name = 'default'
);

-- 9. Add common project roles for projects that have auth configs
INSERT INTO project_roles (project_id, role_name, role_description, role_type, priority, is_default, testing_scope)
SELECT DISTINCT
    ac.project_id,
    ac.auth_role,
    COALESCE(ac.auth_description, 'Authentication role: ' || ac.auth_role),
    CASE 
        WHEN ac.auth_role ILIKE '%admin%' THEN 'admin'
        WHEN ac.auth_role ILIKE '%guest%' THEN 'guest'
        WHEN ac.auth_role ILIKE '%editor%' THEN 'editor'
        WHEN ac.auth_role ILIKE '%viewer%' THEN 'viewer'
        ELSE 'user'
    END,
    ac.priority,
    ac.is_default,
    '{"automated": true, "manual": true}'::jsonb
FROM auth_configs ac
WHERE ac.project_id IS NOT NULL
AND ac.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM project_roles pr 
    WHERE pr.project_id = ac.project_id AND pr.role_name = ac.auth_role
)
ON CONFLICT (project_id, role_name) DO NOTHING;

-- 10. Add comments for documentation
COMMENT ON COLUMN test_sessions.auth_config_id IS 'Authentication configuration used for this testing session';
COMMENT ON COLUMN test_sessions.auth_role IS 'Authentication role used for testing (e.g., admin, user, guest)';
COMMENT ON COLUMN test_sessions.auth_description IS 'Description of the authentication context for this session';

COMMENT ON COLUMN manual_test_results.auth_config_id IS 'Authentication configuration used for this manual test';
COMMENT ON COLUMN manual_test_results.auth_role IS 'Authentication role used during manual testing';
COMMENT ON COLUMN manual_test_results.tested_as_role IS 'Specific role context for this test (may differ from session default)';

COMMENT ON COLUMN automated_test_results.auth_config_id IS 'Authentication configuration used for automated testing';
COMMENT ON COLUMN automated_test_results.auth_role IS 'Authentication role used during automated testing';

COMMENT ON TABLE project_roles IS 'Defines available authentication roles for each project';
COMMENT ON COLUMN project_roles.testing_scope IS 'JSON defining which testing types this role applies to';

-- 11. Create trigger to update project_roles when auth_configs change
CREATE OR REPLACE FUNCTION sync_project_roles_from_auth_configs()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new auth config is created, ensure corresponding project role exists
    IF TG_OP = 'INSERT' AND NEW.project_id IS NOT NULL THEN
        INSERT INTO project_roles (project_id, role_name, role_description, role_type, priority, is_default, testing_scope)
        VALUES (
            NEW.project_id,
            NEW.auth_role,
            COALESCE(NEW.auth_description, 'Authentication role: ' || NEW.auth_role),
            CASE 
                WHEN NEW.auth_role ILIKE '%admin%' THEN 'admin'
                WHEN NEW.auth_role ILIKE '%guest%' THEN 'guest'
                WHEN NEW.auth_role ILIKE '%editor%' THEN 'editor'
                WHEN NEW.auth_role ILIKE '%viewer%' THEN 'viewer'
                ELSE 'user'
            END,
            NEW.priority,
            NEW.is_default,
            '{"automated": true, "manual": true}'::jsonb
        )
        ON CONFLICT (project_id, role_name) DO UPDATE SET
            role_description = EXCLUDED.role_description,
            priority = EXCLUDED.priority,
            is_default = EXCLUDED.is_default,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_project_roles 
    AFTER INSERT OR UPDATE ON auth_configs
    FOR EACH ROW 
    EXECUTE FUNCTION sync_project_roles_from_auth_configs(); 