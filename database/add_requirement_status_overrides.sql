-- Create table for storing manual requirement status overrides
CREATE TABLE IF NOT EXISTS requirement_status_overrides (
    requirement_id UUID PRIMARY KEY,
    manual_status_override VARCHAR(20) NOT NULL CHECK (manual_status_override IN ('passed', 'failed', 'needs_review', 'not_applicable')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_requirement_status_overrides_requirement_id ON requirement_status_overrides(requirement_id);

-- Add comment
COMMENT ON TABLE requirement_status_overrides IS 'Stores manual status overrides for requirements that override computed status';
COMMENT ON COLUMN requirement_status_overrides.manual_status_override IS 'Manual status override: passed, failed, needs_review, not_applicable';
