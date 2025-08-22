-- Add 'in_process' to the allowed status values for requirement_status_overrides
ALTER TABLE requirement_status_overrides 
DROP CONSTRAINT IF EXISTS requirement_status_overrides_manual_status_override_check;

ALTER TABLE requirement_status_overrides 
ADD CONSTRAINT requirement_status_overrides_manual_status_override_check 
CHECK (manual_status_override IN ('passed', 'failed', 'needs_review', 'not_applicable', 'in_process'));

-- Add comment to document the update
COMMENT ON CONSTRAINT requirement_status_overrides_manual_status_override_check ON requirement_status_overrides 
IS 'Updated to include in_process status option';
