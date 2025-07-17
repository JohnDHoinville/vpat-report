-- Audit Trail and Review Workflow Schema
-- Date: 2025-01-17
-- Description: Complete audit trail for test instances and review workflow for automated results

-- =======================================================================
-- 1. TEST INSTANCE AUDIT LOG TABLE
-- =======================================================================
-- Tracks every change to test instances with detailed evidence

CREATE TABLE test_instance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    
    -- Status change tracking
    status_from VARCHAR(20),
    status_to VARCHAR(20) NOT NULL,
    confidence_level_from VARCHAR(10),
    confidence_level_to VARCHAR(10),
    
    -- Who/what made the change
    changed_by_type VARCHAR(20) NOT NULL CHECK (changed_by_type IN ('automated_tool', 'manual_tester', 'reviewer', 'system')),
    changed_by_user UUID REFERENCES auth_users(id), -- NULL for automated changes
    tool_name VARCHAR(100), -- For automated changes (e.g., 'axe-core', 'lighthouse')
    
    -- Change context and reasoning
    change_reason VARCHAR(50) NOT NULL, -- 'initial_automated_result', 'manual_review', 'evidence_update', etc.
    change_description TEXT, -- Human-readable description
    reviewer_notes TEXT, -- Additional notes from reviewer
    
    -- Evidence and supporting data
    evidence JSONB DEFAULT '{}', -- Structured evidence for this change
    raw_tool_output JSONB DEFAULT '{}', -- Complete tool output for automated changes
    screenshots JSONB DEFAULT '[]', -- Array of screenshot file paths
    supporting_files JSONB DEFAULT '[]', -- Additional evidence files
    
    -- Automated tool details (for automated changes)
    automated_result_id UUID REFERENCES automated_test_results(id),
    tool_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    tool_execution_time_ms INTEGER,
    
    -- Context and metadata
    session_context JSONB DEFAULT '{}', -- Test session context at time of change
    browser_context JSONB DEFAULT '{}', -- Browser/environment details
    page_context JSONB DEFAULT '{}', -- Page state information
    
    -- Timing information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- When this change became effective
    
    -- Audit metadata
    change_source VARCHAR(50), -- 'web_ui', 'api', 'batch_process', 'automated_scan'
    ip_address INET, -- Source IP for manual changes
    user_agent TEXT -- User agent for web-based changes
);

-- =======================================================================
-- 2. AUTOMATED RESULT REVIEW QUEUE TABLE
-- =======================================================================
-- Queue for automated results that require human review

CREATE TABLE automated_result_review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    automated_result_id UUID NOT NULL REFERENCES automated_test_results(id) ON DELETE CASCADE,
    
    -- Review status and assignment
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN 
        ('pending', 'assigned', 'in_review', 'approved', 'rejected', 'needs_clarification', 'escalated')),
    assigned_reviewer UUID REFERENCES auth_users(id),
    escalated_to UUID REFERENCES auth_users(id), -- For escalated reviews
    
    -- Priority and categorization
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    review_category VARCHAR(30) DEFAULT 'standard' CHECK (review_category IN 
        ('standard', 'financial_data', 'legal_compliance', 'accessibility_critical', 'user_safety')),
    complexity_score DECIMAL(3,2), -- 0.00 to 1.00 - algorithmic complexity assessment
    
    -- Automated result summary
    tool_name VARCHAR(100) NOT NULL,
    tool_result VARCHAR(20) NOT NULL CHECK (tool_result IN ('pass', 'fail', 'warning', 'incomplete')),
    tool_confidence DECIMAL(3,2), -- Tool's confidence in result (0.00 to 1.00)
    false_positive_risk DECIMAL(3,2), -- Estimated risk of false positive
    
    -- WCAG/Requirement context
    wcag_criterion VARCHAR(20) NOT NULL,
    requirement_title TEXT,
    requirement_description TEXT,
    test_method_expected VARCHAR(20), -- What the requirement normally expects ('manual', 'automated', 'hybrid')
    
    -- Automated evidence and findings
    automated_evidence JSONB DEFAULT '{}', -- Structured evidence from automated tool
    elements_tested JSONB DEFAULT '[]', -- DOM elements or areas tested
    test_scope JSONB DEFAULT '{}', -- What was included/excluded in the test
    
    -- Review workflow
    review_decision VARCHAR(20) CHECK (review_decision IN ('accept', 'reject', 'modify', 'escalate', 'defer')),
    reviewer_notes TEXT,
    review_evidence JSONB DEFAULT '{}', -- Additional evidence provided by reviewer
    modification_details JSONB DEFAULT '{}', -- Details of any modifications made
    
    -- Quality assurance
    qa_reviewed BOOLEAN DEFAULT FALSE,
    qa_reviewer UUID REFERENCES auth_users(id),
    qa_notes TEXT,
    qa_approved BOOLEAN,
    
    -- Timing and SLA tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP WITH TIME ZONE,
    review_started_at TIMESTAMP WITH TIME ZONE,
    review_completed_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    sla_breached BOOLEAN DEFAULT FALSE,
    
    -- Performance metrics
    time_to_assignment INTEGER, -- Minutes from creation to assignment
    time_to_completion INTEGER, -- Minutes from assignment to completion
    reviewer_efficiency_score DECIMAL(3,2), -- Calculated efficiency score
    
    UNIQUE(test_instance_id, automated_result_id)
);

-- =======================================================================
-- 3. EVIDENCE REPOSITORY TABLE
-- =======================================================================
-- Centralized storage for all evidence files and metadata

CREATE TABLE evidence_repository (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Evidence linking
    test_instance_id UUID REFERENCES test_instances(id) ON DELETE CASCADE,
    audit_log_id UUID REFERENCES test_instance_audit_log(id) ON DELETE CASCADE,
    review_queue_id UUID REFERENCES automated_result_review_queue(id) ON DELETE CASCADE,
    
    -- Evidence classification
    evidence_type VARCHAR(30) NOT NULL CHECK (evidence_type IN 
        ('screenshot', 'video_recording', 'code_sample', 'tool_output', 'manual_notes', 'api_response', 'network_trace')),
    evidence_subtype VARCHAR(50), -- More specific categorization
    
    -- File details
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 hash for integrity
    
    -- Evidence metadata
    title VARCHAR(255),
    description TEXT,
    tags JSONB DEFAULT '[]', -- Searchable tags
    metadata JSONB DEFAULT '{}', -- Tool-specific or context-specific metadata
    
    -- Capture context
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    captured_by UUID REFERENCES auth_users(id), -- NULL for automated capture
    capture_method VARCHAR(30), -- 'automated_tool', 'manual_upload', 'screenshot_api'
    
    -- Processing and analysis
    processed BOOLEAN DEFAULT FALSE,
    analysis_results JSONB DEFAULT '{}', -- Results of any automated analysis
    ocr_text TEXT, -- Extracted text from images
    
    -- Access control and retention
    access_level VARCHAR(20) DEFAULT 'team' CHECK (access_level IN ('public', 'team', 'restricted', 'confidential')),
    retention_period_days INTEGER DEFAULT 2555, -- ~7 years default
    archived_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================================
-- 4. REVIEW WORKFLOW CONFIGURATION TABLE
-- =======================================================================
-- Configurable rules for when automated results require review

CREATE TABLE review_workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule identification
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Trigger conditions (JSONB for flexible rule definition)
    trigger_conditions JSONB NOT NULL DEFAULT '{}', -- Complex rule conditions
    
    -- Examples of trigger_conditions:
    -- {"tool": "axe-core", "result": "pass", "wcag_criteria": ["3.3.4"], "confidence_below": 0.95}
    -- {"financial_data_context": true, "tool_result": "pass"}
    -- {"high_risk_elements": ["payment_forms", "legal_agreements"], "confidence_below": 0.9}
    
    -- Review requirements
    review_priority VARCHAR(10) DEFAULT 'medium',
    review_category VARCHAR(30) DEFAULT 'standard',
    requires_specialist BOOLEAN DEFAULT FALSE,
    specialist_roles JSONB DEFAULT '[]', -- Required reviewer roles/expertise
    
    -- SLA configuration
    sla_hours INTEGER DEFAULT 24, -- Hours to complete review
    escalation_hours INTEGER, -- Hours before escalation (optional)
    
    -- Automation settings
    auto_assign BOOLEAN DEFAULT TRUE,
    assignment_algorithm VARCHAR(30) DEFAULT 'round_robin', -- 'round_robin', 'expertise_based', 'workload_based'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth_users(id)
);

-- =======================================================================
-- 5. INDEXES FOR PERFORMANCE
-- =======================================================================

-- Audit log indexes
CREATE INDEX idx_audit_log_test_instance ON test_instance_audit_log(test_instance_id);
CREATE INDEX idx_audit_log_created_at ON test_instance_audit_log(created_at);
CREATE INDEX idx_audit_log_change_type ON test_instance_audit_log(changed_by_type);
CREATE INDEX idx_audit_log_tool_name ON test_instance_audit_log(tool_name);

-- Review queue indexes
CREATE INDEX idx_review_queue_status ON automated_result_review_queue(review_status);
CREATE INDEX idx_review_queue_assigned_reviewer ON automated_result_review_queue(assigned_reviewer);
CREATE INDEX idx_review_queue_priority ON automated_result_review_queue(priority);
CREATE INDEX idx_review_queue_due_date ON automated_result_review_queue(due_date);
CREATE INDEX idx_review_queue_wcag_criterion ON automated_result_review_queue(wcag_criterion);
CREATE INDEX idx_review_queue_tool_name ON automated_result_review_queue(tool_name);

-- Evidence repository indexes
CREATE INDEX idx_evidence_test_instance ON evidence_repository(test_instance_id);
CREATE INDEX idx_evidence_type ON evidence_repository(evidence_type);
CREATE INDEX idx_evidence_captured_at ON evidence_repository(captured_at);

-- Review workflow rules indexes
CREATE INDEX idx_workflow_rules_active ON review_workflow_rules(is_active);

-- =======================================================================
-- 6. VIEWS FOR COMMON QUERIES
-- =======================================================================

-- View for complete test instance history
CREATE OR REPLACE VIEW test_instance_complete_history AS
SELECT 
    ti.id as test_instance_id,
    ti.session_id,
    ti.requirement_id,
    ti.status as current_status,
    ti.confidence_level as current_confidence,
    
    -- Latest audit entry
    al.id as latest_audit_id,
    al.status_from,
    al.status_to,
    al.changed_by_type,
    al.changed_by_user,
    al.tool_name,
    al.change_reason,
    al.change_description,
    al.created_at as last_change_at,
    
    -- Count of total changes
    (SELECT COUNT(*) FROM test_instance_audit_log WHERE test_instance_id = ti.id) as total_changes,
    
    -- Review queue status (if applicable)
    rq.review_status,
    rq.assigned_reviewer,
    rq.priority as review_priority,
    rq.due_date as review_due_date
    
FROM test_instances ti
LEFT JOIN test_instance_audit_log al ON ti.id = al.test_instance_id 
    AND al.created_at = (SELECT MAX(created_at) FROM test_instance_audit_log WHERE test_instance_id = ti.id)
LEFT JOIN automated_result_review_queue rq ON ti.id = rq.test_instance_id 
    AND rq.review_status IN ('pending', 'assigned', 'in_review');

-- View for review queue dashboard
CREATE OR REPLACE VIEW review_queue_dashboard AS
SELECT 
    rq.id,
    rq.test_instance_id,
    rq.review_status,
    rq.priority,
    rq.wcag_criterion,
    rq.requirement_title,
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
    dp.url as page_url,
    tr.title as requirement_title_full,
    tr.description as requirement_description
    
FROM automated_result_review_queue rq
JOIN test_instances ti ON rq.test_instance_id = ti.id
JOIN test_sessions ts ON ti.session_id = ts.id
LEFT JOIN discovered_pages dp ON ti.page_id = dp.id
LEFT JOIN test_requirements tr ON ti.requirement_id = tr.id
WHERE rq.review_status IN ('pending', 'assigned', 'in_review', 'needs_clarification');

-- =======================================================================
-- 7. FUNCTIONS FOR COMMON OPERATIONS
-- =======================================================================

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log_entry(
    p_test_instance_id UUID,
    p_status_from VARCHAR,
    p_status_to VARCHAR,
    p_changed_by_type VARCHAR,
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
-- 8. TRIGGERS FOR AUTOMATIC AUDIT TRAIL
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

-- Apply the trigger
CREATE TRIGGER test_instance_audit_trigger
    AFTER UPDATE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION trigger_test_instance_audit();

-- =======================================================================
-- 9. INITIAL WORKFLOW RULES
-- =======================================================================

-- Insert default review workflow rules
INSERT INTO review_workflow_rules (rule_name, description, trigger_conditions, review_priority, sla_hours) VALUES

('financial_data_pass_review', 
 'Review all automated passes for financial data contexts',
 '{"tool_result": "pass", "wcag_criteria": ["3.3.4"], "context_keywords": ["payment", "financial", "credit", "billing"]}',
 'high', 12),

('legal_compliance_review',
 'Review legal compliance related automated results', 
 '{"tool_result": "pass", "wcag_criteria": ["3.3.4"], "context_keywords": ["legal", "terms", "agreement", "consent"]}',
 'high', 12),

('low_confidence_automated_pass',
 'Review automated passes with low confidence scores',
 '{"tool_result": "pass", "tool_confidence_below": 0.8}',
 'medium', 24),

('critical_wcag_failures',
 'Review all failures for critical WCAG criteria',
 '{"tool_result": "fail", "wcag_criteria": ["1.1.1", "1.3.1", "2.1.1", "4.1.1", "4.1.2"]}',
 'high', 8),

('manual_verification_required',
 'Review criteria that typically require manual verification',
 '{"manual_verification_preferred": true, "tool_result": "pass"}',
 'medium', 24);

-- =======================================================================
-- 10. COMMENTS AND DOCUMENTATION
-- =======================================================================

COMMENT ON TABLE test_instance_audit_log IS 'Complete audit trail of all changes to test instances with evidence and context';
COMMENT ON TABLE automated_result_review_queue IS 'Queue for automated test results requiring human review and validation';
COMMENT ON TABLE evidence_repository IS 'Centralized storage for all evidence files with metadata and access control';
COMMENT ON TABLE review_workflow_rules IS 'Configurable rules determining when automated results require human review';

COMMENT ON VIEW test_instance_complete_history IS 'Complete history view showing current status and audit trail for test instances';
COMMENT ON VIEW review_queue_dashboard IS 'Dashboard view for review queue with SLA status and context information';

COMMENT ON FUNCTION create_audit_log_entry IS 'Creates standardized audit log entry for test instance changes';
COMMENT ON FUNCTION add_to_review_queue IS 'Adds automated result to review queue with appropriate SLA and priority'; 