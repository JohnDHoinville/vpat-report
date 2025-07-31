-- Fix audit log constraint to include 'evidence_created' and 'automated_test_result' action types
-- Date: 2025-07-31
-- Issue: Constraint violation when creating evidence files from automated test results

DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'test_audit_log_action_type_check' 
               AND table_name = 'test_audit_log') THEN
        
        ALTER TABLE test_audit_log DROP CONSTRAINT test_audit_log_action_type_check;
    END IF;
    
    -- Add comprehensive action_type constraint including all current and new action types
    ALTER TABLE test_audit_log 
    ADD CONSTRAINT test_audit_log_action_type_check 
    CHECK (action_type IN (
        'created', 'updated', 'status_change', 'assigned', 'completed', 
        'evidence_added', 'evidence_created', 'evidence_updated', 'evidence_removed',
        'note_added', 'note_updated', 'automation_started', 'automation_completed',
        'automation_failed', 'automation_cancelled', 'test_started', 'test_completed',
        'test_failed', 'manual_test_started', 'manual_test_completed', 'automated_update',
        'review_requested', 'reviewed', 'approved', 'rejected', 'remediation_added',
        'automated_test_result'
    ));
    
    RAISE NOTICE 'Successfully updated test_audit_log action_type constraint to include evidence_created and automated_test_result';
END $$; 