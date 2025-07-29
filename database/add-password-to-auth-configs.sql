-- Add password column to auth_configs table
-- The frontend and API code expect a 'password' column, but the table only has 'password_hash'

-- Add the password column
ALTER TABLE auth_configs 
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN auth_configs.password IS 'Plain text password for authentication (should be hashed in production)';
COMMENT ON COLUMN auth_configs.password_hash IS 'Hashed password for secure storage';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auth_configs_password ON auth_configs(password);

-- Update existing records to have a default password if needed
-- This is for development/testing purposes only
UPDATE auth_configs 
SET password = 'default-password'
WHERE password IS NULL AND password_hash IS NOT NULL; 