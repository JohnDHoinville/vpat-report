-- Add SAML/SSO Selector Configuration to auth_configs table
-- Adds advanced configuration fields for SAML authentication
-- Created: December 2024

-- Add advanced SAML/SSO configuration columns
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS idp_domain VARCHAR(255);
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS username_selector VARCHAR(500) DEFAULT 'input[name="username"]';
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS password_selector VARCHAR(500) DEFAULT 'input[type="password"]';
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS submit_selector VARCHAR(500) DEFAULT 'button[type="submit"]';

-- Add success URL if not exists
ALTER TABLE auth_configs ADD COLUMN IF NOT EXISTS success_url VARCHAR(2048);

-- Create indexes for selector fields
CREATE INDEX IF NOT EXISTS idx_auth_configs_idp_domain ON auth_configs(idp_domain);
CREATE INDEX IF NOT EXISTS idx_auth_configs_type ON auth_configs(type);

-- Add comments to explain the new fields
COMMENT ON COLUMN auth_configs.idp_domain IS 'Identity Provider domain for SAML/SSO authentication';
COMMENT ON COLUMN auth_configs.username_selector IS 'CSS selector to locate username/email input field';
COMMENT ON COLUMN auth_configs.password_selector IS 'CSS selector to locate password input field';
COMMENT ON COLUMN auth_configs.submit_selector IS 'CSS selector to locate login submit button';
COMMENT ON COLUMN auth_configs.success_url IS 'URL to expect after successful login (for validation)';

-- Update existing records to have default selectors if they're null
UPDATE auth_configs SET 
    username_selector = 'input[name="username"]' 
WHERE username_selector IS NULL;

UPDATE auth_configs SET 
    password_selector = 'input[type="password"]' 
WHERE password_selector IS NULL;

UPDATE auth_configs SET 
    submit_selector = 'button[type="submit"]' 
WHERE submit_selector IS NULL;

-- Create view for enhanced auth configs with selector information
CREATE OR REPLACE VIEW auth_configs_enhanced AS
SELECT 
    ac.*,
    CASE 
        WHEN ac.type = 'sso' THEN 'SSO/SAML Authentication'
        WHEN ac.type = 'form' THEN 'Form-based Authentication'
        WHEN ac.type = 'basic' THEN 'Basic Authentication'
        WHEN ac.type = 'oauth' THEN 'OAuth Authentication'
        WHEN ac.type = 'api_key' THEN 'API Key Authentication'
        ELSE 'Unknown Authentication Type'
    END as type_description,
    CASE 
        WHEN ac.idp_domain IS NOT NULL AND ac.idp_domain != '' THEN true
        ELSE false
    END as has_idp_config,
    CASE 
        WHEN ac.username_selector != 'input[name="username"]' OR 
             ac.password_selector != 'input[type="password"]' OR 
             ac.submit_selector != 'button[type="submit"]' THEN true
        ELSE false
    END as has_custom_selectors
FROM auth_configs ac;

-- Grant permissions on the new view
-- GRANT SELECT ON auth_configs_enhanced TO your_app_user;

-- Create function to validate CSS selectors (basic validation)
CREATE OR REPLACE FUNCTION validate_css_selector(selector_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic validation: check for common CSS selector patterns
    IF selector_text IS NULL OR selector_text = '' THEN
        RETURN false;
    END IF;
    
    -- Check for basic patterns (this is a simple validation)
    IF selector_text ~ '^[a-zA-Z0-9\[\]="''.:_#-]+$' THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Add check constraints for selector validation (optional, can be disabled if too restrictive)
-- ALTER TABLE auth_configs ADD CONSTRAINT check_username_selector_valid 
--     CHECK (validate_css_selector(username_selector));
-- ALTER TABLE auth_configs ADD CONSTRAINT check_password_selector_valid 
--     CHECK (validate_css_selector(password_selector));
-- ALTER TABLE auth_configs ADD CONSTRAINT check_submit_selector_valid 
--     CHECK (validate_css_selector(submit_selector));

-- Create function to get auth config with defaults for missing selectors
CREATE OR REPLACE FUNCTION get_auth_config_with_selectors(config_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    type VARCHAR,
    domain VARCHAR,
    url VARCHAR,
    username VARCHAR,
    login_page VARCHAR,
    success_url VARCHAR,
    idp_domain VARCHAR,
    username_selector VARCHAR,
    password_selector VARCHAR,
    submit_selector VARCHAR,
    auth_role VARCHAR,
    auth_description TEXT,
    priority INTEGER,
    is_default BOOLEAN,
    status VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
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
        ac.login_page,
        COALESCE(ac.success_url, ac.url) as success_url,
        ac.idp_domain,
        COALESCE(ac.username_selector, 'input[name="username"]') as username_selector,
        COALESCE(ac.password_selector, 'input[type="password"]') as password_selector,
        COALESCE(ac.submit_selector, 'button[type="submit"]') as submit_selector,
        ac.auth_role,
        ac.auth_description,
        ac.priority,
        ac.is_default,
        ac.status,
        ac.created_at,
        ac.updated_at
    FROM auth_configs ac
    WHERE ac.id = config_id;
END;
$$ LANGUAGE plpgsql;

-- Update the auth_configs_with_project view to include new fields
DROP VIEW IF EXISTS auth_configs_with_project;
CREATE OR REPLACE VIEW auth_configs_with_project AS
SELECT 
    ac.*,
    p.name as project_name,
    p.primary_url as project_url,
    COALESCE(ac.username_selector, 'input[name="username"]') as effective_username_selector,
    COALESCE(ac.password_selector, 'input[type="password"]') as effective_password_selector,
    COALESCE(ac.submit_selector, 'button[type="submit"]') as effective_submit_selector
FROM auth_configs ac
LEFT JOIN projects p ON ac.project_id = p.id;

COMMENT ON VIEW auth_configs_with_project IS 'Enhanced view of auth configs with project information and effective selector values';

-- Example data for common SAML/SSO configurations
-- INSERT INTO auth_configs (name, type, domain, url, login_page, idp_domain, username_selector, password_selector, submit_selector, auth_description) VALUES
-- ('University SSO', 'sso', 'university.edu', 'https://sso.university.edu/login', 'https://sso.university.edu/login', 'sso.university.edu', 'input[name="j_username"]', 'input[name="j_password"]', 'input[type="submit"]', 'Shibboleth SSO for University'),
-- ('Microsoft Azure AD', 'sso', 'login.microsoftonline.com', 'https://login.microsoftonline.com', 'https://login.microsoftonline.com', 'login.microsoftonline.com', 'input[name="loginfmt"]', 'input[name="passwd"]', 'input[type="submit"]', 'Microsoft Azure Active Directory SSO'),
-- ('Okta SSO', 'sso', 'company.okta.com', 'https://company.okta.com/login', 'https://company.okta.com/login', 'company.okta.com', 'input[name="username"]', 'input[name="password"]', 'input[type="submit"]', 'Okta Single Sign-On')
-- ON CONFLICT DO NOTHING;

COMMIT; 