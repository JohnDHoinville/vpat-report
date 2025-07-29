-- Add created_by column to auth_configs table
-- This column is expected by the API code but missing from the database

-- Add the created_by column
ALTER TABLE auth_configs
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN auth_configs.created_by IS 'User who created this authentication configuration';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auth_configs_created_by ON auth_configs(created_by);

-- Update existing records to have a default created_by if needed
-- This is for development/testing purposes only
UPDATE auth_configs
SET created_by = (
    SELECT id FROM users WHERE username = 'admin' LIMIT 1
)
WHERE created_by IS NULL; 