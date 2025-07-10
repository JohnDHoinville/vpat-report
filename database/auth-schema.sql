-- Authentication Schema Extension
-- User management and session handling for Accessibility Testing Platform
-- Created: July 10, 2025

-- USERS TABLE
-- User accounts with secure password storage
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USER_SESSIONS TABLE
-- JWT session management and tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- USER_PERMISSIONS TABLE  
-- Granular permissions for different platform features
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user_id, permission_type, resource_type, resource_id)
);

-- Add user ownership to existing tables
ALTER TABLE projects ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE test_sessions ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE vpat_reports ADD COLUMN created_by UUID REFERENCES users(id);

-- INDEXES for authentication performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_type ON user_permissions(permission_type);
CREATE INDEX idx_user_permissions_resource ON user_permissions(resource_type, resource_id);

-- Add updated_at trigger to users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with bcrypt rounds=12
INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@localhost', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBVh1NovaLqhUq', 'System Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Grant admin full permissions
INSERT INTO user_permissions (user_id, permission_type, resource_type)
SELECT u.id, permission, 'global'
FROM users u, (VALUES 
    ('create_projects'),
    ('edit_projects'), 
    ('delete_projects'),
    ('create_sessions'),
    ('edit_sessions'),
    ('delete_sessions'),
    ('view_all_data'),
    ('manage_users'),
    ('export_reports'),
    ('system_admin')
) AS permissions(permission)
WHERE u.username = 'admin'
ON CONFLICT DO NOTHING; 