-- Change Approval Workflow Schema
-- Date: 2025-01-13
-- Purpose: Implement change approval workflow for critical test changes

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================
-- CHANGE APPROVAL WORKFLOW
-- ===========================

-- Define what constitutes a "critical change" that requires approval
CREATE TABLE change_approval_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Conditions that trigger approval requirement
    conditions JSONB NOT NULL DEFAULT '{}', -- e.g., {"status_changes": ["failed_to_passed"], "confidence_changes": ["low_to_high"]}
    
    -- Approval requirements
    required_approvers INTEGER DEFAULT 1,
    approver_roles JSONB DEFAULT '["manager", "senior_tester"]', -- Roles that can approve
    auto_approval_conditions JSONB DEFAULT '{}', -- Conditions for automatic approval
    
    -- Workflow settings
    approval_timeout_hours INTEGER DEFAULT 24,
    escalation_rules JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1, -- Higher priority rules are checked first
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Track change requests that require approval
CREATE TABLE change_approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_instance_id UUID NOT NULL REFERENCES test_instances(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
    
    -- Change details
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN (
        'status_change', 'assignment_change', 'evidence_modification', 
        'notes_modification', 'remediation_change', 'confidence_change',
        'bulk_change', 'critical_finding'
    )),
    
    -- What's being changed
    field_name VARCHAR(100) NOT NULL, -- e.g., 'status', 'assigned_tester', 'notes'
    old_value JSONB,
    new_value JSONB,
    change_reason TEXT NOT NULL,
    
    -- Request metadata
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Approval workflow
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'auto_approved', 'expired', 'cancelled'
    )),
    
    -- Approval requirements (copied from rule at creation time)
    required_approvers INTEGER NOT NULL DEFAULT 1,
    approver_roles JSONB NOT NULL DEFAULT '["manager"]',
    approval_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Additional context
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('low', 'normal', 'high', 'critical')),
    business_justification TEXT,
    impact_assessment TEXT,
    
    -- Audit trail
    approval_rule_id UUID REFERENCES change_approval_rules(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track individual approvals for each request
CREATE TABLE change_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES change_approval_requests(id) ON DELETE CASCADE,
    
    -- Approver details
    approver_id UUID NOT NULL REFERENCES users(id),
    approver_role VARCHAR(50) NOT NULL,
    
    -- Approval decision
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected', 'abstained')),
    decision_reason TEXT,
    conditions TEXT, -- Any conditions attached to the approval
    
    -- Timing
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional context
    review_notes TEXT,
    delegated_from UUID REFERENCES users(id), -- If approval was delegated
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Escalation tracking for overdue approvals
CREATE TABLE change_approval_escalations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES change_approval_requests(id) ON DELETE CASCADE,
    
    -- Escalation details
    escalation_level INTEGER NOT NULL DEFAULT 1,
    escalated_to UUID NOT NULL REFERENCES users(id),
    escalated_by UUID REFERENCES users(id), -- NULL for automatic escalations
    escalation_reason TEXT NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'superseded')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- INDEXES FOR PERFORMANCE
-- ===========================

-- Change approval rules indexes
CREATE INDEX idx_change_approval_rules_active ON change_approval_rules(is_active, priority);

-- Change approval requests indexes
CREATE INDEX idx_change_requests_test_instance ON change_approval_requests(test_instance_id);
CREATE INDEX idx_change_requests_session ON change_approval_requests(session_id);
CREATE INDEX idx_change_requests_status ON change_approval_requests(status);
CREATE INDEX idx_change_requests_requested_by ON change_approval_requests(requested_by);
CREATE INDEX idx_change_requests_pending_deadline ON change_approval_requests(status, approval_deadline) 
    WHERE status = 'pending';
CREATE INDEX idx_change_requests_urgency ON change_approval_requests(urgency_level, requested_at);

-- Change approvals indexes
CREATE INDEX idx_change_approvals_request ON change_approvals(request_id);
CREATE INDEX idx_change_approvals_approver ON change_approvals(approver_id);
CREATE INDEX idx_change_approvals_decision ON change_approvals(decision, decided_at);

-- Escalations indexes
CREATE INDEX idx_change_escalations_request ON change_approval_escalations(request_id);
CREATE INDEX idx_change_escalations_escalated_to ON change_approval_escalations(escalated_to);
CREATE INDEX idx_change_escalations_status ON change_approval_escalations(status);

-- ===========================
-- TRIGGERS AND FUNCTIONS
-- ===========================

-- Function to automatically check for approval requirements
CREATE OR REPLACE FUNCTION check_approval_requirements()
RETURNS TRIGGER AS $$
DECLARE
    rule_record RECORD;
    requires_approval BOOLEAN := FALSE;
    approval_request_id UUID;
BEGIN
    -- Only check for updates, not inserts or deletes
    IF TG_OP != 'UPDATE' THEN
        RETURN NEW;
    END IF;
    
    -- Check each active approval rule
    FOR rule_record IN 
        SELECT * FROM change_approval_rules 
        WHERE is_active = true 
        ORDER BY priority ASC
    LOOP
        -- Check if this change matches the rule conditions
        -- This is a simplified check - in production, you'd want more sophisticated condition matching
        IF (
            (rule_record.conditions->>'status_changes' IS NOT NULL AND OLD.status != NEW.status) OR
            (rule_record.conditions->>'confidence_changes' IS NOT NULL AND OLD.confidence_level != NEW.confidence_level) OR
            (rule_record.conditions->>'assignment_changes' IS NOT NULL AND OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester)
        ) THEN
            requires_approval := TRUE;
            
            -- Create approval request
            INSERT INTO change_approval_requests (
                test_instance_id,
                session_id,
                change_type,
                field_name,
                old_value,
                new_value,
                change_reason,
                requested_by,
                required_approvers,
                approver_roles,
                approval_deadline,
                approval_rule_id
            ) VALUES (
                NEW.id,
                NEW.session_id,
                CASE 
                    WHEN OLD.status != NEW.status THEN 'status_change'
                    WHEN OLD.confidence_level != NEW.confidence_level THEN 'confidence_change'
                    WHEN OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester THEN 'assignment_change'
                    ELSE 'other_change'
                END,
                CASE 
                    WHEN OLD.status != NEW.status THEN 'status'
                    WHEN OLD.confidence_level != NEW.confidence_level THEN 'confidence_level'
                    WHEN OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester THEN 'assigned_tester'
                    ELSE 'unknown'
                END,
                to_jsonb(
                    CASE 
                        WHEN OLD.status != NEW.status THEN OLD.status::TEXT
                        WHEN OLD.confidence_level != NEW.confidence_level THEN OLD.confidence_level::TEXT
                        WHEN OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester THEN OLD.assigned_tester::TEXT
                        ELSE NULL
                    END
                ),
                to_jsonb(
                    CASE 
                        WHEN OLD.status != NEW.status THEN NEW.status::TEXT
                        WHEN OLD.confidence_level != NEW.confidence_level THEN NEW.confidence_level::TEXT
                        WHEN OLD.assigned_tester IS DISTINCT FROM NEW.assigned_tester THEN NEW.assigned_tester::TEXT
                        ELSE NULL
                    END
                ),
                'Automatic approval request triggered by rule: ' || rule_record.rule_name,
                COALESCE(NEW.updated_by, NEW.assigned_tester), -- Use updated_by if available, fallback to assigned_tester
                rule_record.required_approvers,
                rule_record.approver_roles,
                CURRENT_TIMESTAMP + (rule_record.approval_timeout_hours || ' hours')::INTERVAL,
                rule_record.id
            ) RETURNING id INTO approval_request_id;
            
            -- Log the approval requirement in audit trail
            INSERT INTO test_audit_log (
                test_instance_id,
                user_id,
                action_type,
                change_description,
                details
            ) VALUES (
                NEW.id,
                COALESCE(NEW.updated_by, NEW.assigned_tester),
                'approval_required',
                'Change requires approval per rule: ' || rule_record.rule_name,
                jsonb_build_object(
                    'approval_request_id', approval_request_id,
                    'rule_id', rule_record.id,
                    'rule_name', rule_record.rule_name
                )
            );
            
            -- Exit after first matching rule
            EXIT;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check approval requirements on test instance changes
CREATE TRIGGER trigger_check_approval_requirements
    AFTER UPDATE ON test_instances
    FOR EACH ROW
    EXECUTE FUNCTION check_approval_requirements();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_change_approval_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for timestamp updates
CREATE TRIGGER trigger_change_approval_rules_updated_at
    BEFORE UPDATE ON change_approval_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_change_approval_updated_at();

CREATE TRIGGER trigger_change_approval_requests_updated_at
    BEFORE UPDATE ON change_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_change_approval_updated_at();

-- ===========================
-- VIEWS FOR COMMON QUERIES
-- ===========================

-- Pending approvals view
CREATE VIEW pending_approvals AS
SELECT 
    car.id AS request_id,
    car.test_instance_id,
    car.session_id,
    ts.name AS session_name,
    car.change_type,
    car.field_name,
    car.old_value,
    car.new_value,
    car.change_reason,
    car.requested_by,
    u_requester.username AS requester_username,
    car.requested_at,
    car.approval_deadline,
    car.urgency_level,
    car.required_approvers,
    car.approver_roles,
    COUNT(ca.id) FILTER (WHERE ca.decision = 'approved') AS approvals_received,
    COUNT(ca.id) FILTER (WHERE ca.decision = 'rejected') AS rejections_received,
    car.business_justification,
    car.impact_assessment,
    -- Time until deadline
    EXTRACT(EPOCH FROM (car.approval_deadline - CURRENT_TIMESTAMP))/3600 AS hours_until_deadline
FROM change_approval_requests car
JOIN test_sessions ts ON car.session_id = ts.id
JOIN users u_requester ON car.requested_by = u_requester.id
LEFT JOIN change_approvals ca ON car.id = ca.request_id
WHERE car.status = 'pending'
GROUP BY car.id, ts.name, u_requester.username
ORDER BY car.urgency_level DESC, car.requested_at ASC;

-- Approval statistics view
CREATE VIEW approval_statistics AS
SELECT 
    DATE_TRUNC('day', car.requested_at) AS request_date,
    car.change_type,
    car.urgency_level,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE car.status = 'approved') AS approved_count,
    COUNT(*) FILTER (WHERE car.status = 'rejected') AS rejected_count,
    COUNT(*) FILTER (WHERE car.status = 'auto_approved') AS auto_approved_count,
    COUNT(*) FILTER (WHERE car.status = 'expired') AS expired_count,
    COUNT(*) FILTER (WHERE car.status = 'pending') AS pending_count,
    AVG(EXTRACT(EPOCH FROM (car.approved_at - car.requested_at))/3600) 
        FILTER (WHERE car.approved_at IS NOT NULL) AS avg_approval_time_hours
FROM change_approval_requests car
GROUP BY DATE_TRUNC('day', car.requested_at), car.change_type, car.urgency_level
ORDER BY request_date DESC;

-- ===========================
-- INITIAL DATA
-- ===========================

-- Insert default approval rules
INSERT INTO change_approval_rules (rule_name, description, conditions, required_approvers, approver_roles, approval_timeout_hours) VALUES
('Critical Status Changes', 'Requires approval for status changes from failed to passed on critical tests', 
 '{"status_changes": ["failed_to_passed"], "applies_to": "critical_tests"}', 1, '["manager", "senior_tester"]', 24),

('High Confidence Changes', 'Requires approval when confidence level changes from low to high', 
 '{"confidence_changes": ["low_to_high", "low_to_medium"]}', 1, '["senior_tester", "manager"]', 12),

('Bulk Assignment Changes', 'Requires approval for bulk test reassignments', 
 '{"assignment_changes": "bulk", "threshold": 5}', 2, '["manager"]', 48),

('Evidence Removal', 'Requires approval when evidence is removed from failed tests', 
 '{"evidence_changes": "removal", "test_status": "failed"}', 1, '["manager", "senior_tester"]', 24);

-- ===========================
-- COMMENTS FOR DOCUMENTATION
-- ===========================

COMMENT ON TABLE change_approval_rules IS 'Rules that define when test changes require approval';
COMMENT ON TABLE change_approval_requests IS 'Individual requests for approval of test changes';
COMMENT ON TABLE change_approvals IS 'Individual approval decisions for change requests';
COMMENT ON TABLE change_approval_escalations IS 'Escalation tracking for overdue approvals';

COMMENT ON COLUMN change_approval_requests.change_type IS 'Type of change: status_change, assignment_change, evidence_modification, etc.';
COMMENT ON COLUMN change_approval_requests.urgency_level IS 'Business urgency: low, normal, high, critical';
COMMENT ON COLUMN change_approval_requests.business_justification IS 'Business reason for the change';
COMMENT ON COLUMN change_approval_requests.impact_assessment IS 'Assessment of change impact on compliance/testing'; 