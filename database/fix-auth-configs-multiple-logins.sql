-- Fix auth_configs table to support multiple authentication configurations
-- per domain/project combination for comprehensive accessibility testing
-- Created: January 2025

-- 1. Remove the existing unique constraint that prevents multiple auth configs
ALTER TABLE auth_configs DROP CONSTRAINT IF EXISTS auth_configs_domain_project_id_key;

-- 2. Add new fields to distinguish between different auth configurations
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS auth_role VARCHAR(100) DEFAULT 'default';
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS auth_description TEXT;
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- 3. Add new unique constraint that allows multiple configs per domain/project
-- but prevents duplicate role names within the same domain/project
ALTER TABLE auth_configs 
ADD CONSTRAINT auth_configs_domain_project_role_key 
UNIQUE (domain, project_id, auth_role);

-- 4. Update existing auth configs to have proper role names
UPDATE auth_configs 
SET auth_role = 'default', 
    auth_description = 'Default authentication configuration',
    is_default = true
WHERE auth_role IS NULL OR auth_role = '';

-- 5. Add index for performance on the new fields
CREATE INDEX IF NOT EXISTS idx_auth_configs_domain_project ON auth_configs(domain, project_id);
CREATE INDEX IF NOT EXISTS idx_auth_configs_role ON auth_configs(auth_role);
CREATE INDEX IF NOT EXISTS idx_auth_configs_priority ON auth_configs(priority);
CREATE INDEX IF NOT EXISTS idx_auth_configs_is_default ON auth_configs(is_default);

-- 6. Add a check constraint to ensure at least one default config per domain/project
-- This will be enforced at the application level for now

-- 7. Create a view for easier querying of auth configs with project info
CREATE OR REPLACE VIEW auth_configs_with_project AS
SELECT 
    ac.*,
    p.name as project_name,
    p.primary_url as project_primary_url
FROM auth_configs ac
LEFT JOIN projects p ON ac.project_id = p.id
WHERE ac.status = 'active'
ORDER BY ac.domain, ac.project_id, ac.priority;

-- 8. Add comments for documentation
COMMENT ON COLUMN auth_configs.auth_role IS 'Role or purpose of this auth config (e.g., admin, user, guest, editor)';
COMMENT ON COLUMN auth_configs.auth_description IS 'Human-readable description of this authentication configuration';
COMMENT ON COLUMN auth_configs.priority IS 'Priority order for this auth config (lower numbers = higher priority)';
COMMENT ON COLUMN auth_configs.is_default IS 'Whether this is the default auth config for this domain/project';

-- 9. Create a function to get auth configs for a domain/project
CREATE OR REPLACE FUNCTION get_auth_configs_for_domain_project(
    p_domain VARCHAR(255),
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    type VARCHAR(50),
    domain VARCHAR(255),
    url VARCHAR(500),
    username VARCHAR(255),
    auth_role VARCHAR(100),
    auth_description TEXT,
    priority INTEGER,
    is_default BOOLEAN,
    project_id UUID,
    project_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.id,
        ac.name,
        ac.type,
        ac.domain,
        ac.url,
        ac.username,
        ac.auth_role,
        ac.auth_description,
        ac.priority,
        ac.is_default,
        ac.project_id,
        p.name as project_name
    FROM auth_configs ac
    LEFT JOIN projects p ON ac.project_id = p.id
    WHERE ac.domain = p_domain
    AND (p_project_id IS NULL OR ac.project_id = p_project_id OR ac.project_id IS NULL)
    AND ac.status = 'active'
    ORDER BY ac.priority ASC, ac.is_default DESC, ac.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant necessary permissions
-- GRANT EXECUTE ON FUNCTION get_auth_configs_for_domain_project TO your_app_user; 