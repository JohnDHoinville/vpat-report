-- Simplified Audit Trail Schema
-- Compatible with existing database structure
-- Date: 2025-01-17

-- =======================================================================
-- 1. TEST INSTANCE AUDIT LOG TABLE (Simplified)
-- =======================================================================
CREATE TABLE IF NOT EXISTS test_instance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    
    -- Status change tracking
    status_from VARCHAR(20),
    status_to VARCHAR(20) NOT NULL,
    confidence_level_from VARCHAR(10),
    confidence_level_to VARCHAR(10),
    
    -- Who/what made the change
    changed_by_type VARCHAR(20) NOT NULL CHECK (changed_by_type IN ('automated_tool', 'manual_tester', 'reviewer', 'system')),
    changed_by_user UUID REFERENCES users(id), -- Reference existing users table
    tool_name VARCHAR(100), -- For automated changes
    
    -- Change context and reasoning
    change_reason VARCHAR(50) NOT NULL DEFAULT 'status_change',
    change_description TEXT,
    reviewer_notes TEXT,
    
    -- Evidence and supporting data
    evidence JSONB DEFAULT '{}',
    raw_tool_output JSONB DEFAULT '{}',
    screenshots JSONB DEFAULT '[]',
    supporting_files JSONB DEFAULT '[]',
    
    -- Automated tool details
    automated_result_id UUID REFERENCES automated_test_results(id),
    tool_confidence_score DECIMAL(3,2),
    tool_execution_time_ms INTEGER,
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit metadata
    change_source VARCHAR(50) DEFAULT 'api',
    ip_address INET,
    user_agent TEXT
);

-- =======================================================================
-- 2. AUTOMATED RESULT REVIEW QUEUE TABLE (Simplified)
-- =======================================================================
CREATE TABLE IF NOT EXISTS automated_result_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    automated_result_id UUID NOT NULL REFERENCES automated_test_results(id) ON DELETE CASCADE,
    
    -- Review status and assignment
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN 
        ('pending', 'assigned', 'in_review', 'approved', 'rejected', 'needs_clarification', 'escalated')),
    assigned_reviewer UUID REFERENCES users(id),
    
    -- Priority and categorization
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    review_category VARCHAR(30) DEFAULT 'standard',
    
    -- Automated result summary
    tool_name VARCHAR(100) NOT NULL,
    tool_result VARCHAR(20) NOT NULL CHECK (tool_result IN ('pass', 'fail', 'warning', 'incomplete')),
    tool_confidence DECIMAL(3,2),
    false_positive_risk DECIMAL(3,2),
    
    -- WCAG context
    wcag_criterion VARCHAR(20) NOT NULL,
    requirement_title TEXT,
    
    -- Evidence
    automated_evidence JSONB DEFAULT '{}',
    
    -- Review workflow
    review_decision VARCHAR(20) CHECK (review_decision IN ('accept', 'reject', 'modify', 'escalate', 'defer')),
    reviewer_notes TEXT,
    review_evidence JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    review_completed_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(test_instance_id, automated_result_id)
);

-- =======================================================================
-- 3. EVIDENCE REPOSITORY TABLE (Simplified)
-- =======================================================================
CREATE TABLE IF NOT EXISTS evidence_repository (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Evidence linking
    test_instance_id UUID REFERENCES test_instances(id) ON DELETE CASCADE,
    audit_log_id UUID REFERENCES test_instance_audit_log(id) ON DELETE CASCADE,
    review_queue_id UUID REFERENCES automated_result_review_queue(id) ON DELETE CASCADE,
    
    -- Evidence classification
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN 
        ('screenshot', 'video_recording', 'code_sample', 'tool_output', 'manual_notes', 'api_response')),
    
    -- File details
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Evidence metadata
    title VARCHAR(255),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Capture context
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    captured_by UUID REFERENCES users(id),
    capture_method VARCHAR(30) DEFAULT 'manual_upload',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================================
-- 4. INDEXES FOR PERFORMANCE
-- =======================================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_test_instance ON test_instance_audit_log(test_instance_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON test_instance_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_change_type ON test_instance_audit_log(changed_by_type);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON automated_result_review_queue(review_status);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned_reviewer ON automated_result_review_queue(assigned_reviewer);
CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON automated_result_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_review_queue_due_date ON automated_result_review_queue(due_date);

CREATE INDEX IF NOT EXISTS idx_evidence_test_instance ON evidence_repository(test_instance_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence_repository(evidence_type);

-- =======================================================================
-- 5. FUNCTIONS FOR COMMON OPERATIONS
-- =======================================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log_entry(
    p_test_instance_id UUID,
    p_status_from VARCHAR DEFAULT NULL,
    p_status_to VARCHAR DEFAULT NULL,
    p_changed_by_type VARCHAR DEFAULT 'system',
    p_changed_by_user UUID DEFAULT NULL,
    p_tool_name VARCHAR DEFAULT NULL,
    p_change_reason VARCHAR DEFAULT 'status_change',
    p_change_description TEXT DEFAULT NULL,
    p_evidence JSONB DEFAULT '{}',
    p_automated_result_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO test_instance_audit_log (
        test_instance_id,
        status_from,
        status_to,
        changed_by_type,
        changed_by_user,
        tool_name,
        change_reason,
        change_description,
        evidence,
        automated_result_id
    ) VALUES (
        p_test_instance_id,
        p_status_from,
        p_status_to,
        p_changed_by_type,
        p_changed_by_user,
        p_tool_name,
        p_change_reason,
        p_change_description,
        p_evidence,
        p_automated_result_id
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add item to review queue
CREATE OR REPLACE FUNCTION add_to_review_queue(
    p_test_instance_id UUID,
    p_automated_result_id UUID,
    p_tool_name VARCHAR,
    p_tool_result VARCHAR,
    p_wcag_criterion VARCHAR,
    p_automated_evidence JSONB DEFAULT '{}',
    p_priority VARCHAR DEFAULT 'medium'
) RETURNS UUID AS $$
DECLARE
    v_queue_id UUID;
    v_due_date TIMESTAMP WITH TIME ZONE;
    v_sla_hours INTEGER;
BEGIN
    -- Determine SLA based on priority
    SELECT 
        CASE 
            WHEN p_priority = 'critical' THEN 4
            WHEN p_priority = 'high' THEN 12
            WHEN p_priority = 'medium' THEN 24
            ELSE 48
        END INTO v_sla_hours;
    
    v_due_date := CURRENT_TIMESTAMP + (v_sla_hours || ' hours')::INTERVAL;
    
    INSERT INTO automated_result_review_queue (
        test_instance_id,
        automated_result_id,
        tool_name,
        tool_result,
        wcag_criterion,
        automated_evidence,
        priority,
        due_date
    ) VALUES (
        p_test_instance_id,
        p_automated_result_id,
        p_tool_name,
        p_tool_result,
        p_wcag_criterion,
        p_automated_evidence,
        p_priority,
        v_due_date
    ) RETURNING id INTO v_queue_id;
    
    RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- =======================================================================
-- 6. TRIGGER FOR AUTOMATIC AUDIT TRAIL
-- =======================================================================

-- Trigger function to automatically create audit log entries
CREATE OR REPLACE FUNCTION trigger_test_instance_audit() RETURNS TRIGGER AS $$
BEGIN
    -- Only create audit entry if status or confidence level changed
    IF (TG_OP = 'UPDATE' AND (
        OLD.status IS DISTINCT FROM NEW.status OR 
        OLD.confidence_level IS DISTINCT FROM NEW.confidence_level
    )) THEN
        PERFORM create_audit_log_entry(
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(current_setting('app.audit.changed_by_type', true), 'system'),
            CASE WHEN current_setting('app.audit.changed_by_user', true) != '' 
                 THEN current_setting('app.audit.changed_by_user', true)::UUID 
                 ELSE NULL END,
            current_setting('app.audit.tool_name', true),
            COALESCE(current_setting('app.audit.change_reason', true), 'status_update'),
            current_setting('app.audit.change_description', true)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger (drop first if exists)
DROP TRIGGER IF EXISTS test_instance_audit_trigger ON test_instances;
CREATE TRIGGER test_instance_audit_trigger
    AFTER UPDATE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION trigger_test_instance_audit();

-- =======================================================================
-- 7. BASIC VIEWS
-- =======================================================================

-- View for review queue dashboard
CREATE OR REPLACE VIEW review_queue_dashboard AS
SELECT 
    rq.id,
    rq.test_instance_id,
    rq.review_status,
    rq.priority,
    rq.wcag_criterion,
    rq.tool_name,
    rq.tool_result,
    rq.tool_confidence,
    rq.assigned_reviewer,
    rq.due_date,
    rq.created_at,
    
    -- SLA status
    CASE 
        WHEN rq.due_date < CURRENT_TIMESTAMP THEN 'overdue'
        WHEN rq.due_date < CURRENT_TIMESTAMP + INTERVAL '4 hours' THEN 'due_soon'
        ELSE 'on_time'
    END as sla_status,
    
    -- Time elapsed
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rq.created_at))/3600 as hours_since_created,
    
    -- Test instance context
    ti.session_id,
    ts.name as session_name,
    dp.url as page_url
    
FROM automated_result_review_queue rq
JOIN test_instances ti ON rq.test_instance_id = ti.id
JOIN test_sessions ts ON ti.session_id = ts.id
LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
WHERE rq.review_status IN ('pending', 'assigned', 'in_review', 'needs_clarification');

-- =======================================================================
-- 8. COMMENTS
-- =======================================================================
COMMENT ON TABLE test_instance_audit_log IS 'Audit trail of all changes to test instances with evidence';
COMMENT ON TABLE automated_result_review_queue IS 'Queue for automated test results requiring human review';
COMMENT ON TABLE evidence_repository IS 'Centralized storage for evidence files';
COMMENT ON FUNCTION create_audit_log_entry IS 'Creates audit log entry for test instance changes';
COMMENT ON FUNCTION add_to_review_queue IS 'Adds automated result to review queue with SLA';

-- Success message
SELECT 'Audit trail and review workflow schema created successfully!' as status; 